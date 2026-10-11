"""
Skirt skinning for the island soul, run inside Blender by prepare-island-soul.py.

The Meshy mesh is one welded body: bare feet and shins end in the dhoti's gathered hem, and the skirt was skinned
across both legs and both feet, so when the legs split the cloth between them stretched into flat fins. Here:

  * feet and the bare shin tubes below the hem keep only their own side's foot / shin weights (never the other leg's);
  * the skirt never uses the foot or toe bones: it is solved over the hips, thighs and shins, weighted by a smooth
    falloff (thigh share grows toward the hem, the left/right split blends across the middle), then relaxed
    numerically so that no edge of the skirt changes length by more than the target over the whole walk;
  * where one stretch is too much for the edge it sits on, that edge is split (adaptive subdivision, matched on both
    sides of a UV seam), so the same stretch is shared by more, shorter edges.

All numpy, one weight per welded vertex (UV-seam duplicates share it, so no crack can open).
"""
import numpy as np
import bmesh

import island_soul_walk as walk

FOOT_CUT = 0.14        # below this the two legs are separate shells: feet, anklets, the first of the shin
TUBE_CUT = 0.205       # the bare shin ends in the hem just above this
SKIRT_TOP = 1.02       # above this the old weights stand (waist, belt, torso)
HIP_TOP = 1.0          # the skirt's thigh share is 0 here
HEM_FOLLOW = 0.6       # ... and grows to this at the hem
HEM_Z = 0.25
SIDE_WIDTH = 0.24      # left/right blend across this width centred on the pelvis


def _weld(co, tolerance=1e-5):
    """Welded vertex id for every vertex (positions within `tolerance`), and the count."""
    keys = np.round(co / tolerance).astype(np.int64)
    _, inverse = np.unique(keys, axis=0, return_inverse=True)
    return inverse.reshape(-1), int(inverse.max()) + 1


def _components(node_count, node_edges):
    parent = np.arange(node_count)
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for a, b in node_edges:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
    return np.array([find(i) for i in range(node_count)])


def _shells(tris_w, node_z, node_x, node_count, cut):
    """Component labels of the mesh made only of triangles that lie wholly below `cut`, and the labels of the left
    and right foot shells (the components containing the lowest node of the left and of the right foot)."""
    keep = node_z[tris_w].max(1) < cut
    t = tris_w[keep]
    edges = np.concatenate([t[:, [0, 1]], t[:, [1, 2]], t[:, [2, 0]]])
    label = _components(node_count, edges)
    low = np.where(node_z < 0.02)[0]
    left = low[node_x[low] > 0.03]
    right = low[node_x[low] < -0.07]
    return label, label[left[0]], label[right[0]]


def _bone_matrices(rig, D, hips):
    P = rig.fk(D, hips)
    w, x, y, z = D[..., 0], D[..., 1], D[..., 2], D[..., 3]
    R = np.stack([1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
                  2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
                  2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)], -1).reshape(D.shape[:-1] + (3, 3))
    return R, P


def _skin_nodes(rig, R, P, pos, weights):
    """Posed positions (frames, nodes, 3) of rest positions `pos` blended by `weights` (nodes, bones)."""
    out = np.zeros((R.shape[0], len(pos), 3))
    for j in range(rig.nB):
        sel = weights[:, j] > 1e-6
        if not sel.any():
            continue
        off = pos[sel] - rig.heads[j]
        moved = np.einsum('fij,vj->fvi', R[:, j], off) + P[:, j][:, None, :]
        out[:, sel] += weights[sel, j][None, :, None] * moved
    return out


def _foot_rules(rig, old, node_pos, node_shell_side, fixed_mask):
    """Weights for the shells: foot and toe from the old skinning but only the shell's own side; blending into the
    shin above the ankle so the bare tube follows the shin."""
    W = old.copy()
    for side in ('Left', 'Right'):
        sign = 1 if side == 'Left' else -1
        sel = np.where(fixed_mask & (node_shell_side == sign))[0]
        keep = [rig.ix[side + n] for n in ('UpLeg', 'Leg', 'Foot', 'ToeBase')]
        base = np.zeros((len(sel), rig.nB))
        base[:, keep] = old[np.ix_(sel, keep)]
        total = base.sum(1)
        nowt = total < 1e-6
        base[nowt, rig.ix[side + 'Foot']] = 1.0
        base /= base.sum(1, keepdims=True)
        t = np.clip((node_pos[sel, 2] - 0.115) / 0.05, 0, 1)
        t = (t * t * (3 - 2 * t))[:, None]
        shin = np.zeros(rig.nB); shin[rig.ix[side + 'Leg']] = 1
        W[sel] = base * (1 - t) + shin[None] * t
    return W


def _prior(rig, pos, bones):
    """The smooth falloff the skirt is pulled toward: all hips at the waist, the thigh share growing toward the hem
    and split between the two thighs by a smooth function of x. columns follow `bones`."""
    z, x = pos[:, 2], pos[:, 0]
    t = np.clip((HIP_TOP - z) / (HIP_TOP - HEM_Z), 0, 1)
    lam = HEM_FOLLOW * t * t * (3 - 2 * t)
    s = np.clip(x / SIDE_WIDTH + 0.5, 0, 1)
    s = s * s * (3 - 2 * s)
    out = np.zeros((len(pos), len(bones)))
    out[:, bones.index(rig.ix['Hips'])] = 1 - lam
    out[:, bones.index(rig.ix['LeftUpLeg'])] = lam * s
    out[:, bones.index(rig.ix['RightUpLeg'])] = lam * (1 - s)
    return out


def _optimise(rig, R, P, pos, W, var, bones, edges, rest_len, init, prior, iterations, follow, tau, mask, lr=0.2, lr_end=0.02):
    """Adam on softmax logits: minimise squared hinge of edge-length change beyond `tau`, plus a pull to the prior."""
    F = R.shape[0]
    nv, nb = len(var), len(bones)
    X = np.zeros((F, nv, nb, 3))
    for k, b in enumerate(bones):
        X[:, :, k] = np.einsum('fij,vj->fvi', R[:, b], pos[var] - rig.heads[b]) + P[:, b][:, None, :]
    fixed_pos = _skin_nodes(rig, R, P, pos, W)
    is_var = np.zeros(len(pos), bool); is_var[var] = True
    vmap = -np.ones(len(pos), int); vmap[var] = np.arange(nv)
    use = is_var[edges[:, 0]] | is_var[edges[:, 1]]
    ee, L0 = edges[use], rest_len[use]
    a, b = vmap[ee[:, 0]], vmap[ee[:, 1]]
    ma, mb = a >= 0, b >= 0
    logits = np.where(mask, np.log(np.maximum(init, 1e-4)), -30.0)
    m1 = np.zeros_like(logits); v1 = np.zeros_like(logits)
    for it in range(iterations):
        ex = np.exp(logits - logits.max(1, keepdims=True)); Wv = ex / ex.sum(1, keepdims=True)
        vpos = np.einsum('fvbi,vb->fvi', X, Wv)
        pa = np.where(ma[None, :, None], vpos[:, np.maximum(a, 0)], fixed_pos[:, ee[:, 0]])
        pb = np.where(mb[None, :, None], vpos[:, np.maximum(b, 0)], fixed_pos[:, ee[:, 1]])
        d = pa - pb
        L = np.linalg.norm(d, axis=2) + 1e-9
        ch = L - L0[None]
        over = np.maximum(np.abs(ch) - tau, 0)
        g = (2 * over * np.sign(ch) / L)[:, :, None] * d
        gpos = np.zeros_like(vpos)
        np.add.at(gpos, (slice(None), a[ma]), g[:, ma])
        np.add.at(gpos, (slice(None), b[mb]), -g[:, mb])
        diff = Wv - prior
        gW = np.einsum('fvi,fvbi->vb', gpos, X) + 2 * follow * diff
        gl = Wv * (gW - (gW * Wv).sum(1, keepdims=True))
        m1 = 0.9 * m1 + 0.1 * gl; v1 = 0.999 * v1 + 0.001 * gl ** 2
        lr_t = lr_end + (lr - lr_end) * 0.5 * (1 + np.cos(np.pi * it / max(iterations - 1, 1)))
        logits -= lr_t * (m1 / (1 - 0.9 ** (it + 1))) / (np.sqrt(v1 / (1 - 0.999 ** (it + 1))) + 1e-8)
    ex = np.exp(logits - logits.max(1, keepdims=True))
    return ex / ex.sum(1, keepdims=True)


def _top(W, count):
    """Keeps each row's `count` largest weights (a glTF vertex carries four joints) and renormalises."""
    out = np.zeros_like(W)
    pick = np.argsort(-W, axis=1)[:, :count]
    rows = np.arange(len(W))[:, None]
    out[rows, pick] = W[rows, pick]
    return out / np.maximum(out.sum(1, keepdims=True), 1e-9)


class _Mesh:
    """The bmesh as arrays: positions and triangles per vertex, welded nodes, unique node edges."""
    def __init__(self, bm, deform, rig):
        bm.verts.ensure_lookup_table()
        self.co = np.array([v.co[:] for v in bm.verts])
        self.tris = np.array([[v.index for v in f.verts] for f in bm.faces])
        self.vweld, self.nodes = _weld(self.co)
        self.pos = np.zeros((self.nodes, 3)); self.pos[self.vweld] = self.co
        W = np.zeros((len(self.co), rig.nB))
        for v in bm.verts:
            for g, w in v[deform].items():
                W[v.index, g] = w
        self.W = np.zeros((self.nodes, rig.nB)); self.W[self.vweld] = W
        t = self.vweld[self.tris]
        e = np.concatenate([t[:, [0, 1]], t[:, [1, 2]], t[:, [2, 0]]])
        e = e[e[:, 0] != e[:, 1]]
        self.edges = np.unique(np.sort(e, 1), axis=0)
        self.rest = np.linalg.norm(self.pos[self.edges[:, 0]] - self.pos[self.edges[:, 1]], axis=1)
        self.tris_w = t


def reweight(rig, mesh_object, D, hips, idle_pose, params):
    """Reweights `mesh_object`'s skirt for the walk (D, hips) in place (and splits stretched edges). Returns
    (weights per vertex of the final mesh, report)."""
    p = dict(target=0.07, rounds=5, iterations=260, follow=0.01, tau=0.02, split_over=0.045, tube_fixed=1)
    p.update({k: v for k, v in params.items() if k in p})
    p['iterations'] = int(p['iterations']); p['rounds'] = int(p['rounds'])
    bm = bmesh.new(); bm.from_mesh(mesh_object.data)
    deform = bm.verts.layers.deform.verify()
    report = {'rounds': []}
    bones = [rig.ix[n] for n in ('Hips', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg')]
    R, P = _bone_matrices(rig, D, hips)
    init_W = None
    for rnd in range(int(p['rounds']) + 1):
        m = _Mesh(bm, deform, rig)
        if init_W is not None:
            m.W = init_W(m)
        shell, sl, sr = _shells(m.tris_w, m.pos[:, 2], m.pos[:, 0], m.nodes, FOOT_CUT)
        side = np.zeros(m.nodes); side[shell == sl] = 1; side[shell == sr] = -1
        tube, tl, tr = _shells(m.tris_w, m.pos[:, 2], m.pos[:, 0], m.nodes, TUBE_CUT)
        tube_side = np.zeros(m.nodes); tube_side[tube == tl] = 1; tube_side[tube == tr] = -1
        if p['tube_fixed']:
            side = tube_side
        fixed = side != 0
        lowbones = [rig.ix[n] for n in ('Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase')]
        low = m.W[:, lowbones].sum(1) >= 0.5
        var = np.where((m.pos[:, 2] < SKIRT_TOP) & low & ~fixed)[0]
        W = _foot_rules(rig, m.W, m.pos, side, fixed)
        prior = _prior(rig, m.pos[var], bones)
        # the bare shin above the ankle: pulled toward its own shin, fading into the skirt's falloff by the hem
        ts = tube_side[var]
        shin_pull = np.clip((0.24 - m.pos[var, 2]) / 0.07, 0, 1) * (ts != 0)
        for sgn, name in ((1, 'LeftLeg'), (-1, 'RightLeg')):
            sel = (ts == sgn)
            prior[sel] *= (1 - shin_pull[sel])[:, None]
            prior[sel, bones.index(rig.ix[name])] += shin_pull[sel]
        init = W[var][:, bones]
        init = np.where(init.sum(1, keepdims=True) > 0.5, init / np.maximum(init.sum(1, keepdims=True), 1e-6), prior)
        # four joints per vertex at most (what a glTF vertex carries): the left skirt may use the left shin and the
        # right the right; later rounds keep the four that carried the weight.
        if rnd == 0:
            mask = np.ones((len(var), len(bones)), bool)
            mask[m.pos[var, 0] >= 0, bones.index(rig.ix['RightLeg'])] = False
            mask[m.pos[var, 0] < 0, bones.index(rig.ix['LeftLeg'])] = False
            start = prior
        else:
            mask = _top(init, 4) > 0
            start = init
        Wv = _top(_optimise(rig, R, P, m.pos, W, var, bones, m.edges, m.rest, start, prior,
                            p['iterations'], p['follow'], p['tau'], mask), 4)
        W[var] = 0
        for k, b in enumerate(bones):
            W[var, b] = Wv[:, k]
        posed = _skin_nodes(rig, R, P, m.pos, W)
        change = np.abs(np.linalg.norm(posed[:, m.edges[:, 0]] - posed[:, m.edges[:, 1]], axis=2) - m.rest[None]).max(0)
        zmid = (m.pos[m.edges[:, 0], 2] + m.pos[m.edges[:, 1], 2]) / 2
        skirt_edge = (zmid < SKIRT_TOP) & (zmid > 0.12)
        foot_edge = zmid <= 0.12
        report['rounds'].append({'nodes': int(m.nodes), 'edges': int(len(m.edges)),
                                 'maxStretchCm': round(float(change[skirt_edge].max() * 100), 2),
                                 'over8cm': int((change[skirt_edge] > 0.08).sum()),
                                 'footMaxCm': round(float(change[foot_edge].max() * 100), 2)})
        print('SKIN round', rnd, json_line(report['rounds'][-1]))
        for i in np.argsort(change * skirt_edge)[::-1][:6]:
            a, b = m.edges[i]
            print('  worst edge rest %.3f change %.3f z %.2f/%.2f x %.2f/%.2f y %.2f/%.2f' % (
                m.rest[i], change[i], m.pos[a, 2], m.pos[b, 2], m.pos[a, 0], m.pos[b, 0], m.pos[a, 1], m.pos[b, 1]),
                [(rig.names[j], round(float(W[a, j]), 2)) for j in np.nonzero(W[a] > 0.03)[0]],
                [(rig.names[j], round(float(W[b, j]), 2)) for j in np.nonzero(W[b] > 0.03)[0]])
        # write the weights to every vertex (seam duplicates share them)
        for v in bm.verts:
            node = m.vweld[v.index]
            v[deform].clear()
            for j in np.nonzero(W[node] > 1e-5)[0]:
                v[deform][int(j)] = float(W[node, j])
        if change[skirt_edge].max() <= p['target'] or rnd == int(p['rounds']):
            break
        # split the edges that still stretch too much (both copies of a seam edge, so no crack opens)
        pairs = {tuple(e) for e in m.edges[change > p['split_over']]}
        bm.edges.ensure_lookup_table()
        chosen = [ed for ed in bm.edges if (lambda a, b: (min(a, b), max(a, b)) in pairs)(m.vweld[ed.verts[0].index], m.vweld[ed.verts[1].index])]
        bmesh.ops.subdivide_edges(bm, edges=chosen, cuts=1, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=list(bm.faces))
        report['rounds'][-1]['split'] = len(chosen)
        bm.verts.ensure_lookup_table()
        init_W = lambda mm, bm=bm, deform=deform: mm.W      # new vertices carry interpolated weights already
    bm.to_mesh(mesh_object.data); mesh_object.data.update()
    weights = np.zeros((len(bm.verts), rig.nB))
    for v in bm.verts:
        for g, w in v[deform].items():
            weights[v.index, g] = w
    bm.free()
    return weights, report


def json_line(d):
    import json
    return json.dumps(d)


def stretch_report(rig, mesh_object, D, hips):
    """How far any edge of the (current) mesh changes length over the loop D, in cm: skirt and legs (below the waist),
    the feet, and the whole body. Welded vertices, so a UV seam counts."""
    bm = bmesh.new(); bm.from_mesh(mesh_object.data)
    deform = bm.verts.layers.deform.verify()
    m = _Mesh(bm, deform, rig)
    bm.free()
    R, P = _bone_matrices(rig, D, hips)
    posed = _skin_nodes(rig, R, P, m.pos, m.W)
    change = np.abs(np.linalg.norm(posed[:, m.edges[:, 0]] - posed[:, m.edges[:, 1]], axis=2) - m.rest[None]).max(0)
    zmid = (m.pos[m.edges[:, 0], 2] + m.pos[m.edges[:, 1], 2]) / 2
    lower = zmid < SKIRT_TOP
    return {'skirtMaxCm': round(float(change[lower & (zmid > 0.12)].max() * 100), 2),
            'skirtOver8cm': int((change[lower & (zmid > 0.12)] > 0.08).sum()),
            'feetMaxCm': round(float(change[zmid <= 0.12].max() * 100), 2),
            'bodyMaxCm': round(float(change.max() * 100), 2), 'bodyOver8cm': int((change > 0.08).sum()),
            'nodes': int(m.nodes), 'edges': int(len(m.edges))}

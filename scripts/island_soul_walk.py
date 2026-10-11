"""
Procedural refinement of the island soul's walk, in plain numpy (no Blender needed), so it can be developed and
measured offline and then run inside Blender by prepare-island-soul.py.

Input is the Meshy walk after the rest-frame transfer onto the game skeleton: for every frame one absolute
armature-space rotation per bone, stored as the DELTA from the bone's rest orientation (D, w x y z), and the Hips
position. Joint positions follow by forward kinematics: child = parent + D_parent * (child_rest - parent_rest).

Refinement ("grace"), in order:
  1. retime the loop to a calmer cadence,
  2. relaxed arms: the idle's hanging pose with a small swing, soft elbows, no forward reach,
  3. a gentler pelvis and spine, a steadier head,
  4. shorter strides: leg IK re-targets the ankles (fore-aft travel relative to the pelvis scaled), so planted
     feet stay planted (a scaled linear stance is still linear),
  5. grounding: the planted sole is put on the floor (the Meshy clip floated about 5 cm).
Everything is baked into ordinary rotation keys; the browser runs no solver.
"""
import numpy as np

# ----------------------------------------------------------------------------------------------- quaternions
def qmul(a, b):
    w1, x1, y1, z1 = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    w2, x2, y2, z2 = b[..., 0], b[..., 1], b[..., 2], b[..., 3]
    return np.stack([w1*w2 - x1*x2 - y1*y2 - z1*z2, w1*x2 + x1*w2 + y1*z2 - z1*y2,
                     w1*y2 - x1*z2 + y1*w2 + z1*x2, w1*z2 + x1*y2 - y1*x2 + z1*w2], -1)

def qconj(a): return a * np.array([1.0, -1, -1, -1])

def qrot(q, v):
    qv = np.concatenate([np.zeros(v.shape[:-1] + (1,)), v], -1)
    return qmul(qmul(q, qv), qconj(q))[..., 1:]

def qnorm(q): return q / np.linalg.norm(q, axis=-1, keepdims=True)

def qslerp(a, b, t):
    d = np.sum(a * b, -1, keepdims=True)
    b = np.where(d < 0, -b, b)
    d = np.clip(np.abs(d), -1, 1)
    th = np.arccos(d); s = np.sin(th)
    small = s < 1e-6
    ss = np.where(small, 1.0, s)
    wa = np.where(small, 1 - t, np.sin((1 - t) * th) / ss)
    wb = np.where(small, t, np.sin(t * th) / ss)
    return qnorm(wa * a + wb * b)

def qpow(q, k):
    q = np.where(q[..., :1] < 0, -q, q)
    s = np.sqrt(np.maximum(1 - q[..., 0] ** 2, 1e-14))
    ang = 2 * np.arccos(np.clip(q[..., 0], -1, 1))
    ax = q[..., 1:] / s[..., None]
    h = ang * k / 2
    return np.concatenate([np.cos(h)[..., None], ax * np.sin(h)[..., None]], -1)

def qfromto(a, b):
    a = a / np.linalg.norm(a, axis=-1, keepdims=True)
    b = b / np.linalg.norm(b, axis=-1, keepdims=True)
    c = np.cross(a, b); d = np.sum(a * b, -1, keepdims=True)
    q = np.concatenate([1 + d, c], -1)
    bad = (1 + d[..., 0]) < 1e-9
    if np.any(bad):
        perp = np.cross(a, np.array([1.0, 0, 0]))
        weak = np.linalg.norm(perp, axis=-1, keepdims=True) < 1e-6
        perp = np.where(weak, np.cross(a, np.array([0.0, 1, 0])), perp)
        q = np.where(bad[..., None], np.concatenate([np.zeros_like(d), perp], -1), q)
    return qnorm(q)

def qmean(q):
    """Mean rotation of an (n, 4) array (sign-aligned average, normalised)."""
    ref = q[0]
    s = np.where(np.sum(q * ref, -1, keepdims=True) < 0, -q, q)
    return qnorm(s.mean(0))

# ------------------------------------------------------------------------------------------------- the rig
class Rig:
    """Bone names, hierarchy, rest head positions and the skin (for sole heights)."""
    def __init__(self, names, par, heads, weights=None, rest_points=None):
        self.names = list(names)
        self.ix = {n: i for i, n in enumerate(self.names)}
        self.par = np.asarray(par)
        self.heads = np.asarray(heads, dtype=float)
        self.W = weights
        self.co = rest_points
        self.nB = len(self.names)

    def fk(self, D, hips):
        """Joint (head) positions, (frames, bones, 3)."""
        P = np.zeros((D.shape[0], self.nB, 3))
        for j in range(self.nB):
            if self.par[j] < 0:
                P[:, j] = hips
            else:
                off = (self.heads[j] - self.heads[self.par[j]])[None, :]
                P[:, j] = P[:, self.par[j]] + qrot(D[:, self.par[j]], np.repeat(off, D.shape[0], 0))
        return P

    def skin(self, D, hips, idx, P=None):
        """Linear-blend-skinned positions of vertices idx, (frames, len(idx), 3)."""
        P = self.fk(D, hips) if P is None else P
        out = np.zeros((D.shape[0], len(idx), 3))
        Wv = self.W[idx]
        for j in range(self.nB):
            sel = Wv[:, j] > 0
            if not sel.any():
                continue
            off = self.co[idx][sel] - self.heads[j]
            out[:, sel] += Wv[sel, j][None, :, None] * (P[:, j][:, None, :] + qrot(D[:, j][:, None, :], off[None]))
        return out

    def foot_patch(self, side):
        b = [self.ix[side + 'Foot'], self.ix[side + 'ToeBase']]
        return np.where(self.W[:, b].sum(1) >= 0.5)[0]

# --------------------------------------------------------------------------------------------- the stages
DEFAULTS = dict(
    cycle_frames=33,        # 30 fps: 1.1 s per two steps = 109 steps per minute
    stride=0.82,            # fore-aft ankle travel relative to the pelvis, against the source
    arm_swing=0.36,         # upper-arm swing against the source
    shoulder_swing=0.4,
    elbow_swing=0.35,       # forearm's own swing
    arm_relax=1.0,          # 0: the walk's mean arm pose, 1: the idle's hanging arms
    elbow_bend=13.0,        # degrees of constant, soft elbow flexion on top of the (small) swing
    torso=0.8,              # pelvis and spine rotation against the source
    head=0.3,               # head and neck movement against the source
    hips_x=0.8, hips_z=0.85,
    foot_lift=0.75,         # how high the swinging foot clears the floor, against the source
    bob=0.7,                # share of the geometric pelvis bob kept (the peaks come down: a softer stance knee)
    reach=0.985,            # stance leg: ankle-to-hip as a share of the leg length (0: copy the clip's pelvis height)
)

def resample(D, hips, frames):
    """Retimes a closed loop (last frame == first) to `frames` frames per cycle (+ the closing key)."""
    n = D.shape[0] - 1
    t = np.arange(frames + 1) / frames * n
    i0 = np.minimum(np.floor(t).astype(int), n - 1); f = (t - i0)[:, None]
    Dn = qslerp(D[i0], D[i0 + 1], f[:, :, None])
    hn = hips[i0] * (1 - f) + hips[i0 + 1] * f
    Dn[-1] = Dn[0]; hn[-1] = hn[0]
    return Dn, hn

def deviation(D, j, k, center=None):
    """Scales bone j's swing about its cycle mean (or `center`) by k, in armature space."""
    mean = qmean(D[:-1, j]) if center is None else center
    dev = qmul(D[:, j], qconj(mean))
    return qmul(qpow(dev, k), mean), mean

def elbow_axis(rig, D, hips, side):
    """The elbow's hinge axis (armature space) as the source walk bends it: mean of u x f over the cycle."""
    P = rig.fk(D, hips)
    up, fo, ha = (rig.ix[side + n] for n in ('Arm', 'ForeArm', 'Hand'))
    u = P[:, fo] - P[:, up]; f = P[:, ha] - P[:, fo]
    u /= np.linalg.norm(u, axis=1, keepdims=True); f /= np.linalg.norm(f, axis=1, keepdims=True)
    a = np.cross(u, f)[:-1]
    a = a[np.linalg.norm(a, axis=1) > 0.15]
    m = a.mean(0)
    return m / np.linalg.norm(m)

def axis_quat(axis, deg):
    h = np.radians(deg) / 2
    return np.concatenate([[np.cos(h)], axis * np.sin(h)])

def relax_arms(rig, D, idle, p, axes):
    """Arms hang as in the idle with a small, soft swing. `idle`: (bones, 4) the idle's mean pose."""
    for side in ('Left', 'Right'):
        sh, up, fo = (rig.ix[side + n] for n in ('Shoulder', 'Arm', 'ForeArm'))
        D0 = D.copy()
        mean_sh = qmean(D0[:-1, sh]); mean_up = qmean(D0[:-1, up]); mean_fo = qmean(D0[:-1, fo])
        for j, k, mean in ((sh, p['shoulder_swing'], mean_sh), (up, p['arm_swing'], mean_up), (fo, p['elbow_swing'], mean_fo)):
            dev = qmul(D0[:, j], qconj(mean))
            base = qslerp(mean[None], idle[j][None], p['arm_relax'])[0]
            D[:, j] = qmul(qpow(dev, k), base)
        D[:, fo] = qmul(axis_quat(axes[side], p['elbow_bend'])[None], D[:, fo])
    return D

def gentle_body(rig, D, hips, p):
    for n in ('Hips', 'Spine02', 'Spine01', 'Spine'):
        j = rig.ix[n]
        D[:, j], _ = deviation(D, j, p['torso'])
    for n in ('neck', 'Head'):
        j = rig.ix[n]
        D[:, j], _ = deviation(D, j, p['head'])
    m = hips[:-1].mean(0)
    hips = hips.copy()
    hips[:, 0] = m[0] + (hips[:, 0] - m[0]) * p['hips_x']
    hips[:, 2] = m[2] + (hips[:, 2] - m[2]) * p['hips_z']
    return D, hips

def ankle_targets(rig, D, hips, p):
    """Where the ankles go: the source's own paths, with fore-aft travel relative to the pelvis scaled by the
    stride factor (a planted foot moves back linearly, so the scaled path stays linear: no new slide)."""
    P = rig.fk(D, hips)
    out = {}
    for side in ('Left', 'Right'):
        A = P[:, rig.ix[side + 'Foot']].copy()
        r = A[:, 1] - hips[:, 1]
        m = r[:-1].mean()
        A[:, 1] = hips[:, 1] + m + (r - m) * p['stride']
        out[side] = A
    return out

def solve_leg(rig, D, hips, side, T):
    """Two-bone IK for one leg to put the ankle at T (frames, 3), keeping the source's bend plane and twist.
    Foot and toe keep their own (absolute) orientation."""
    D = D.copy()
    up, kn, an = (rig.ix[side + n] for n in ('UpLeg', 'Leg', 'Foot'))
    P = rig.fk(D, hips)
    H, K = P[:, up], P[:, kn]
    l1 = np.linalg.norm(rig.heads[kn] - rig.heads[up]); l2 = np.linalg.norm(rig.heads[an] - rig.heads[kn])
    v = T - H
    dist = np.linalg.norm(v, axis=1)
    u = v / dist[:, None]
    dist_c = np.minimum(dist, (l1 + l2) * 0.998)
    T = H + u * dist_c[:, None]
    ka = K - H
    n = ka - np.sum(ka * u, 1, keepdims=True) * u
    weak = np.linalg.norm(n, axis=1) < 1e-4
    fwd = np.array([0.0, -1.0, 0.0]); nf = fwd - np.sum(fwd * u, 1, keepdims=True) * u
    n = np.where(weak[:, None], nf, n)
    n /= np.linalg.norm(n, axis=1, keepdims=True)
    cosA = np.clip((l1 ** 2 + dist_c ** 2 - l2 ** 2) / (2 * l1 * dist_c), -1, 1)
    sinA = np.sqrt(1 - cosA ** 2)
    K2 = H + u * (l1 * cosA)[:, None] + n * (l1 * sinA)[:, None]
    N = D.shape[0]
    src_up = qrot(D[:, up], np.repeat((rig.heads[kn] - rig.heads[up])[None], N, 0))
    src_kn = qrot(D[:, kn], np.repeat((rig.heads[an] - rig.heads[kn])[None], N, 0))
    D[:, up] = qmul(qfromto(src_up, K2 - H), D[:, up])
    D[:, kn] = qmul(qfromto(src_kn, T - K2), D[:, kn])
    return D

def sole_heights(rig, D, hips, patches):
    P = rig.fk(D, hips)
    return {s: rig.skin(D, hips, patches[s], P)[:, :, 2].min(1) for s in patches}

def smooth_loop(x, passes=1):
    """[1 2 1]/4 round a closed loop whose last sample repeats the first."""
    y = x[:-1].copy()
    for _ in range(passes):
        y = 0.25 * np.roll(y, 1) + 0.5 * y + 0.25 * np.roll(y, -1)
    return np.concatenate([y, y[:1]])

def pelvis_height(rig, D, hips, targets, planted, reach, bob=1.0):
    """The pelvis height that lets every planted foot stand with its leg bent only as much as `reach` allows
    (`reach` = ankle-to-hip distance as a share of the leg's length): a grounded body, with its bob falling out of
    where the feet are instead of being copied from a clip that floated."""
    P = rig.fk(D, hips)
    num = np.zeros(D.shape[0]); den = np.full(D.shape[0], 1e-6)
    for side, T in targets.items():
        up, kn, an = (rig.ix[side + n] for n in ('UpLeg', 'Leg', 'Foot'))
        L = np.linalg.norm(rig.heads[kn] - rig.heads[up]) + np.linalg.norm(rig.heads[an] - rig.heads[kn])
        H = P[:, up]
        dxy = np.linalg.norm((T - H)[:, :2], axis=1)
        zreq = T[:, 2] + np.sqrt(np.maximum((reach * L) ** 2 - dxy ** 2, 1e-4))
        num += planted[side] * (zreq - (H[:, 2] - hips[:, 2]))
        den += planted[side]
    z = smooth_loop(num / den, 1)
    # the bob: the low point is where the legs spread furthest (it cannot be higher); the peaks are pulled down a little
    # (a softer knee at mid-stance) so the body glides instead of bouncing
    return z.min() + (z - z.min()) * bob

def solve_all(rig, D, hips, targets, dz, lift, pelvis=None):
    hips = hips.copy()
    if pelvis is not None:
        hips[:, 2] = pelvis
    else:
        hips[:, 2] -= dz
    for side in targets:
        T = targets[side].copy(); T[:, 2] -= dz + lift[side]
        D = solve_leg(rig, D, hips, side, T)
    return D, hips

def refine(rig, D, hips, idle_pose, params=None):
    """Returns the refined (D, hips) loop: `cycle_frames` + 1 frames, the last equal to the first."""
    p = dict(DEFAULTS, **(params or {}))
    D, hips = resample(D, hips, p['cycle_frames'])
    targets = ankle_targets(rig, D, hips, p)
    # A swinging foot clears the floor by less (a long skirt, a gliding step): its target drops by a share of its clearance.
    patches = {s: rig.foot_patch(s) for s in targets}
    src_sole = sole_heights(rig, D, hips, patches)
    floor = smooth_loop(np.minimum(src_sole['Left'], src_sole['Right']), 1)
    for s in targets:
        targets[s][:, 2] -= (1 - p['foot_lift']) * np.maximum(src_sole[s] - floor, 0)
    axes = {s: elbow_axis(rig, D, hips, s) for s in ('Left', 'Right')}
    D = relax_arms(rig, D, idle_pose, p, axes)
    D, hips = gentle_body(rig, D, hips, p)
    base_D, base_hips = D, hips
    n = D.shape[0]
    dz = np.zeros(n); lift = {s: np.zeros(n) for s in targets}
    planted = {s: np.ones(n) for s in targets}
    pelvis = None
    for _ in range(4):
        Dn, hn = solve_all(rig, base_D, base_hips, targets, dz, lift, pelvis)
        h = sole_heights(rig, Dn, hn, patches)
        inc = smooth_loop(np.minimum(h['Left'], h['Right']), 1)
        dz = dz + inc
        for s in targets:
            # a foot that is down but still above the floor is lowered by its own ankle (both feet land, not one)
            planted[s] = np.clip((0.04 - h[s]) / 0.025, 0, 1)
            lift[s] = lift[s] + planted[s] * np.maximum(h[s] - inc, 0)
        if p['reach'] > 0:
            tz = {s: np.concatenate([targets[s][:, :2], (targets[s][:, 2] - dz - lift[s])[:, None]], 1) for s in targets}
            pelvis = pelvis_height(rig, base_D, base_hips, tz, planted, p['reach'], p['bob'])
    return solve_all(rig, base_D, base_hips, targets, dz, lift, pelvis)

def runs_where(mask, minimum=4):
    """Index runs of True in a closed loop whose last sample repeats the first."""
    n = len(mask) - 1
    down = np.asarray(mask[:n], dtype=bool)
    if down.all():
        return [np.arange(n)]
    if not down.any():
        return []
    start = int(np.where(~down)[0][0])
    runs, cur = [], []
    for k in (np.arange(n) + start) % n:
        if down[k]:
            cur.append(k)
        elif cur:
            runs.append(np.array(cur)); cur = []
    if cur:
        runs.append(np.array(cur))
    return [r for r in runs if len(r) >= minimum]

def flat_foot_runs(rig, D, hips, patches, height=0.03, minimum=4):
    """Runs of frames where a foot lies on the floor (both its heel and its toe end within `height` of it) per side:
    the stretch of the stance in which the whole foot is planted. These frames give the walking speed."""
    P = rig.fk(D, hips)
    out = {}
    for s in ('Left', 'Right'):
        idx = patches[s]
        rest_y = rig.co[idx][:, 1]
        heel = rest_y > rest_y.max() - 0.03
        toe = rest_y < rest_y.min() + 0.03
        z = rig.skin(D, hips, idx, P)[:, :, 2]
        out[s] = runs_where((z[:, heel].min(1) < height) & (z[:, toe].min(1) < height), minimum)
    return out

def walking_speed(rig, D, hips, fps=30.0, tails=None):
    """The ground speed this loop was authored at (m/s): how fast the planted foot goes back in the model while it
    lies flat, fitted per stance and averaged over both feet (weighted by length). Also returns the worst deviation
    in cm of the planted foot from that constant-speed path (foot slide)."""
    patches = {s: rig.foot_patch(s) for s in ('Left', 'Right')}
    P = rig.fk(D, hips)
    runs = flat_foot_runs(rig, D, hips, patches)
    speeds, weights = [], []
    for s in runs:
        ball = rig.ix[s + 'ToeBase']
        for run in runs[s]:
            t = np.arange(len(run)) / fps
            m = np.polyfit(t, P[run, ball, 1], 1)[0]
            speeds.append(m); weights.append(len(run))
    v = float(np.average(speeds, weights=weights))
    slip = 0.0
    for s in runs:
        ball = rig.ix[s + 'ToeBase']
        for run in runs[s]:
            t = np.arange(len(run)) / fps
            dev = P[run, ball, 1] - v * t
            slip = max(slip, float((dev.max() - dev.min()) * 100))
    return v, slip

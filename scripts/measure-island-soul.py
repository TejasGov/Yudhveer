"""
Measures a built island soul GLB in Blender, the way the Chapter III audit did (assets/REPORT.md, section 2 and 4a):
skinning stretch (edge length against the bind pose), sole height over the walk, planted-foot slide against the
manifest's speed, step length, cadence, arm swing and pelvis bob.

    blender -b --python scripts/measure-island-soul.py -- <island_soul.glb> [out.json]

Forward is -Y after the glTF import, up is +Z. The walk speed is read from the manifest next to the GLB.
"""
import bpy, sys, os, json, math
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:]
glb = argv[0]
out_json = argv[1] if len(argv) > 1 else None
manifest = json.load(open(os.path.splitext(glb)[0] + '.manifest.json'))
V = manifest['clips']['walk']['speed']

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=glb)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
body = next(o for o in bpy.data.objects if o.type == 'MESH')
ad = arm.animation_data
FWD = np.array([0.0, -1.0, 0.0])


def sample(frame):
    fi = math.floor(frame)
    scene.frame_set(int(fi), subframe=float(frame - fi))
    bpy.context.view_layer.update()


def play(name):
    action = bpy.data.actions[name]
    for track in ad.nla_tracks: track.mute = True
    ad.action = action; ad.action_slot = action.slots[0]
    sample(action.frame_range[0])
    return action.frame_range


def coords():
    ev = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = ev.to_mesh()
    co = np.empty(len(mesh.vertices) * 3); mesh.vertices.foreach_get('co', co)
    edges = np.empty(len(mesh.edges) * 2, dtype=np.int64); mesh.edges.foreach_get('vertices', edges)
    ev.to_mesh_clear()
    return co.reshape(-1, 3), edges.reshape(-1, 2)


def joint(bone, which='head'):
    pb = arm.pose.bones[bone]
    return np.array(pb.tail if which == 'tail' else pb.head, dtype=float)


for track in ad.nla_tracks: track.mute = True
ad.action = None
for pb in arm.pose.bones:
    pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.scale = (1, 1, 1)
bpy.context.view_layer.update()
bind, edges = coords()
bind_len = np.linalg.norm(bind[edges[:, 0]] - bind[edges[:, 1]], axis=1)
mid_z = (bind[edges[:, 0], 2] + bind[edges[:, 1], 2]) / 2
# welded edges too (a UV seam is a crack in the mesh data but must not open in the picture)
key = np.round(bind / 1e-5).astype(np.int64)
_, weld = np.unique(key, axis=0, return_inverse=True)
weld = weld.reshape(-1)
wedges = np.unique(np.sort(weld[edges], axis=1), axis=0)
wedges = wedges[wedges[:, 0] != wedges[:, 1]]
first = np.zeros(weld.max() + 1, dtype=np.int64); first[weld] = np.arange(len(weld))
wlen = np.linalg.norm(bind[first[wedges[:, 0]]] - bind[first[wedges[:, 1]]], axis=1)
wz = (bind[first[wedges[:, 0]], 2] + bind[first[wedges[:, 1]], 2]) / 2

groups = {g.index: g.name for g in body.vertex_groups}
patch = {}
for side in ('Left', 'Right'):
    idx = []
    for v in body.data.vertices:
        w = sum(g.weight for g in v.groups if groups.get(g.group) in (side + 'Foot', side + 'ToeBase'))
        if w >= 0.5: idx.append(v.index)
    patch[side] = np.array(idx)

result = {'file': glb, 'speed': V, 'vertices': len(bind), 'edges': len(edges), 'clips': {}}
for clip in ('idle', 'walk'):
    f0, f1 = play(clip)
    span = f1 - f0
    steps = 60
    worst, over8, over8w, floor_min, worst_edge = 0.0, 0, 0, [], None
    skirt = (mid_z > 0.12) & (mid_z < 1.02)
    wskirt = (wz > 0.12) & (wz < 1.02)
    max_skirt = np.zeros(len(edges)); max_weld = np.zeros(len(wedges))
    for k in range(steps):
        sample(f0 + span * k / steps)
        co, _ = coords()
        length = np.linalg.norm(co[edges[:, 0]] - co[edges[:, 1]], axis=1)
        max_skirt = np.maximum(max_skirt, np.abs(length - bind_len))
        lw = np.linalg.norm(co[first[wedges[:, 0]]] - co[first[wedges[:, 1]]], axis=1)
        max_weld = np.maximum(max_weld, np.abs(lw - wlen))
        floor_min.append(co[:, 2].min())
    result['clips'][clip] = {
        'duration_s': span / 30.0,
        'skin': {'max_edge_change_cm_all': float(max_skirt.max() * 100),
                 'max_edge_change_cm_skirt_and_legs': float(max_skirt[skirt].max() * 100),
                 'max_edge_change_cm_feet': float(max_skirt[mid_z <= 0.12].max() * 100),
                 'edges_over_8cm': int((max_skirt > 0.08).sum()),
                 'welded_max_edge_change_cm_skirt_and_legs': float(max_weld[wskirt].max() * 100),
                 'welded_edges_over_8cm': int((max_weld > 0.08).sum())},
        'lowest_point_cm': {'min': float(min(floor_min) * 100), 'max': float(max(floor_min) * 100)}}
    if clip != 'walk':
        continue
    # locomotion: 240 samples over the loop
    N = 240; T = span / 30.0; dt = T / N
    zmin = {s: np.zeros(N) for s in patch}; contact_y = {s: np.zeros(N) for s in patch}
    tip = {s: np.zeros((N, 3)) for s in patch}
    heel = {s: np.zeros(N) for s in patch}; toe = {s: np.zeros(N) for s in patch}
    hips = np.zeros((N, 3)); upper = {s: np.zeros((N, 3)) for s in ('Left', 'Right')}
    elbow = {s: np.zeros(N) for s in ('Left', 'Right')}
    for k in range(N):
        sample(f0 + span * k / N)
        co, _ = coords()
        for s, idx in patch.items():
            z = co[idx, 2]; zmin[s][k] = z.min()
            ys = co[idx, 1]
            heel[s][k] = z[ys > ys.max() - 0.03].min(); toe[s][k] = z[ys < ys.min() + 0.03].min()
            tip[s][k] = joint(s + 'ToeBase', 'tail')
            contact_y[s][k] = joint(s + 'ToeBase')[1]
        hips[k] = joint('Hips')
        for s in upper:
            sh, el, ha = joint(s + 'Arm'), joint(s + 'ForeArm'), joint(s + 'Hand')
            u, f = el - sh, ha - el
            upper[s][k] = u / np.linalg.norm(u)
            elbow[s][k] = math.degrees(math.acos(np.clip(u @ f / np.linalg.norm(u) / np.linalg.norm(f), -1, 1)))
    walk = {}
    # a foot is planted while its heel and toe ends are within 3 cm of where it lies flattest (the floor, when grounded)
    feet = {}
    speeds = []
    for s in patch:
        flat = np.maximum(heel[s], toe[s])
        down = flat < flat.min() + 0.03
        order = np.arange(N)
        if down.all():
            runs = [order]
        else:
            start = int(np.where(~down)[0][0]); order = (np.arange(N) + start) % N
            runs, cur = [], []
            for k in order:
                if down[k]: cur.append(k)
                elif cur: runs.append(np.array(cur)); cur = []
            if cur: runs.append(np.array(cur))
        runs = [r for r in runs if len(r) * dt >= 0.1]
        info = []
        for r in runs:
            t = np.arange(len(r)) * dt
            y = contact_y[s][r]
            slope = np.polyfit(t, y, 1)[0]
            dev = y - (y[0] + V * t)
            tipy = tip[s][r][:, 1]
            info.append({'stance_s': len(r) * dt, 'ball_speed_mps': float(slope),
                         'ball_slide_cm': float((dev.max() - dev.min()) * 100),
                         'tip_net_residual_cm': float(abs(tipy[-1] - tipy[0] - V * (len(r) - 1) * dt) * 100),
                         'planted_sole_cm': [float(zmin[s][r].min() * 100), float(zmin[s][r].max() * 100)]})
            speeds.append((slope, len(r)))
        feet[s] = {'planted_fraction': float(down.mean()), 'stances': info,
                   'sole_cm': [float(zmin[s].min() * 100), float(zmin[s].max() * 100)]}
    walk['feet'] = feet
    walk['fitted_speed_mps'] = float(np.average([a for a, _ in speeds], weights=[b for _, b in speeds]))
    walk['manifest_speed_mps'] = V
    walk['cadence_steps_per_min'] = 120.0 / T
    walk['step_length_cm'] = V * T / 2 * 100
    walk['hips_bob_cm'] = float((hips[:, 2].max() - hips[:, 2].min()) * 100)
    walk['hips_sway_cm'] = float((hips[:, 0].max() - hips[:, 0].min()) * 100)
    walk['arms'] = {}
    for s in upper:
        u = upper[s]
        sag = np.degrees(np.arctan2(-u[:, 1], -u[:, 2]))
        walk['arms'][s] = {'upper_arm_sagittal_deg': [float(sag.min()), float(sag.max())],
                           'sagittal_range_deg': float(sag.max() - sag.min()),
                           'elbow_flexion_deg': [float(elbow[s].min()), float(elbow[s].max())]}
    result['clips'][clip]['locomotion'] = walk

print('MEASURE', json.dumps(result, indent=1))
if out_json:
    with open(out_json, 'w') as f: json.dump(result, f, indent=1)

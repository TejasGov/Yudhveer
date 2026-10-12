"""
Combine the approved Meshy walk with the existing pipeline's retargeted relaxed idle on the same human mesh.
Run in Blender: -- <meshy-walking.glb> <prepared-idle.glb> <output.glb> [--param name=value ...]
Source files are never overwritten.

World-space bone rotations are transferred through the two rest frames, so import scale and bone-roll changes
do not turn the arms back into an A-pose. Horizontal root travel is removed and the scene staging supplies
translation. The transferred walk is then refined procedurally (scripts/island_soul_walk.py, plain numpy): a calmer
cadence, relaxed arms with soft elbows, a gentler pelvis, a steadier head, shorter strides through two-bone leg IK
and the soles put on the floor. The walking speed in the manifest is measured from the result (how fast a planted
foot goes back in the model), not guessed. The skirt is reweighted by scripts/island_soul_skin.py so its hem follows
the hips and thighs and never the ankles. The result is inspected separately before it is copied into the game.
"""
import bpy, sys, json, os, math, tempfile
import numpy as np
from mathutils import Matrix, Vector, Quaternion

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import island_soul_walk as walk
import island_soul_skin as skin

argv = sys.argv[sys.argv.index('--') + 1:]
params = {}
if '--param' in argv:
    for kv in argv[argv.index('--param') + 1:]:
        k, v = kv.split('=')
        params[k] = float(v)
    argv = argv[:argv.index('--param')]
source, idle, output = argv
tempfile.tempdir = os.path.join(os.path.dirname(os.path.abspath(output)), '.blender-temp')
os.makedirs(tempfile.tempdir, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=source)
src = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
for track in src.animation_data.nla_tracks: track.mute = True
action = next(a for a in bpy.data.actions if 'walking' in a.name.lower())
src.animation_data.action = action
src.animation_data.action_slot = action.slots[0]
sw = src.matrix_world.copy()
rest = {b.name: sw @ b.matrix_local for b in src.data.bones}
start, end = action.frame_range
frames = []
for f in range(round(start), round(end) + 1):
    bpy.context.scene.frame_set(f); bpy.context.view_layer.update()
    frames.append({b.name: sw @ b.matrix for b in src.pose.bones})
for o in list(bpy.context.scene.objects): bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=idle)
tgt = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
idle_action = next(a for a in bpy.data.actions if a.name.startswith('calm_idle'))
idle_action.name = 'idle'
tw = tgt.matrix_world.copy()
assert (tw.to_scale() - Vector((1, 1, 1))).length < 1e-6 and tw.translation.length < 1e-6, 'expected an identity armature'
inv = tw.inverted()
t_rest = {b.name: tw @ b.matrix_local for b in tgt.data.bones}
order = list(tgt.data.bones)
names = [b.name for b in order]
index = {n: i for i, n in enumerate(names)}
parents = [index[b.parent.name] if b.parent else -1 for b in order]
heads = np.array([t_rest[n].translation[:] for n in names])
rest_q = {n: t_rest[n].to_quaternion() for n in names}

# The idle's calm hanging pose (mean over the clip), as rotations from rest in armature space.
for track in tgt.animation_data.nla_tracks: track.mute = True
tgt.animation_data.action = idle_action
tgt.animation_data.action_slot = idle_action.slots[0]
samples = []
i0, i1 = idle_action.frame_range
for f in range(int(i0), int(i1) + 1, 5):
    bpy.context.scene.frame_set(f); bpy.context.view_layer.update()
    samples.append([[*(tw @ tgt.pose.bones[n].matrix).to_quaternion() @ rest_q[n].inverted()] for n in names])
idle_pose = np.array([walk.qmean(np.array(samples)[:, j]) for j in range(len(names))])
for track in list(tgt.animation_data.nla_tracks): tgt.animation_data.nla_tracks.remove(track)
tgt.animation_data.action = None

# 1. The Meshy walk, transferred to this skeleton: absolute armature-space rotation per bone as a delta from rest.
horizontal = frames[-1]['Hips'].translation - frames[0]['Hips'].translation
horizontal.z = 0
D = np.zeros((len(frames), len(names), 4))
hips = np.zeros((len(frames), 3))
for i, frame in enumerate(frames):
    for j, n in enumerate(names):
        q = inv.to_quaternion() @ frame[n].to_quaternion() @ rest[n].to_quaternion().inverted() @ t_rest[n].to_quaternion()
        d = q @ rest_q[n].inverted()
        D[i, j] = [d.w, d.x, d.y, d.z]
    delta = frame['Hips'].translation - rest['Hips'].translation - horizontal * (i / (len(frames) - 1))
    hips[i] = (inv @ (t_rest['Hips'].translation + delta))[:]

# 2. The walk, refined for grace (a first pass on the original skin, just to give the skirt its walk to be solved for).
weights = np.zeros((len(mesh.data.vertices), len(names)))
group_names = {g.index: g.name for g in mesh.vertex_groups}
for v in mesh.data.vertices:
    for g in v.groups: weights[v.index, index[group_names[g.group]]] = g.weight
rest_points = np.array([v.co[:] for v in mesh.data.vertices])
rig = walk.Rig(names, parents, heads, weights, rest_points)
D0, hips0 = D, hips
D, hips = walk.refine(rig, D0, hips0, idle_pose, params)
tails = np.array([[*b.tail_local] for b in order])

# 3. The skirt: weights the hem to the hips and thighs (never the feet); the bare feet and shins keep their own.
# Vertex groups are rebuilt in bone order first, so a group's index is its bone's index.
for g in list(mesh.vertex_groups): mesh.vertex_groups.remove(g)
groups = {n: mesh.vertex_groups.new(name=n) for n in names}
for v in range(len(rest_points)):
    for j in np.nonzero(weights[v] > 1e-5)[0]:
        groups[names[j]].add([v], float(weights[v, j]), 'REPLACE')
weights, skin_report = skin.reweight(rig, mesh, D, hips, idle_pose, params)
rest_points = np.array([v.co[:] for v in mesh.data.vertices])
rig = walk.Rig(names, parents, heads, weights, rest_points)

# 4. The same walk again on the new skin: the soles are put on the floor for the feet as they are now.
D, hips = walk.refine(rig, D0, hips0, idle_pose, params)
speed, slip = walk.walking_speed(rig, D, hips)
frame_count = D.shape[0]
duration = (frame_count - 1) / 30
patches = {s: rig.foot_patch(s) for s in ('Left', 'Right')}
sole = walk.sole_heights(rig, D, hips, patches)
down = [np.concatenate([sole[s][r] for r in walk.flat_foot_runs(rig, D, hips, patches)[s]]) for s in sole]
print('SKIN', json.dumps(skin.stretch_report(rig, mesh, D, hips)))
print('WALK', json.dumps({'frames': frame_count, 'duration': duration, 'stepsPerMinute': 120 / duration,
                          'speed': speed, 'slipCm': slip,
                          'soleMinCm': round(float(min(sole['Left'].min(), sole['Right'].min()) * 100), 2),
                          'plantedSoleCm': [round(float(np.concatenate(down).min() * 100), 2), round(float(np.concatenate(down).max() * 100), 2)]}))

walk_action = bpy.data.actions.new('walk'); tgt.animation_data.action = walk_action
for i in range(frame_count):
    poses = {}
    for j, b in enumerate(order):
        parent = b.parent.name if b.parent else None
        rel = b.parent.matrix_local.inverted() @ b.matrix_local if parent else b.matrix_local
        pos = (poses[parent] @ rel).translation if parent else Vector(tuple(hips[i]))
        rotation = Quaternion(tuple(D[i, j])) @ rest_q[b.name]
        m = Matrix.LocRotScale(pos, rotation, None)
        poses[b.name] = m
        basis = rel.inverted() @ poses[parent].inverted() @ m if parent else b.matrix_local.inverted() @ m
        pb = tgt.pose.bones[b.name]; pb.rotation_mode = 'QUATERNION'
        pb.location, pb.rotation_quaternion, pb.scale = basis.decompose()
        pb.keyframe_insert('rotation_quaternion', frame=i)
        pb.keyframe_insert('location', frame=i)
tgt.animation_data.action = None
for a in [idle_action, walk_action]:
    track = tgt.animation_data.nla_tracks.new(); track.name = a.name; track.strips.new(a.name, 0, a)
    track.mute = False
bpy.context.scene.render.fps = 30
bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', export_animations=True,
    export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_image_format='AUTO')
manifest = json.load(open(os.path.splitext(idle)[0]+'.manifest.json'))
manifest['model'] = os.path.basename(output)
mesh.data.calc_loop_triangles()
manifest['triangles'] = len(mesh.data.loop_triangles)
manifest['clips'] = {'idle': manifest['clips']['calm_idle'], 'walk': {
    'duration': duration, 'loop': True, 'speed': round(speed, 4)}}
manifest['clips']['walk']['source'] = ('Meshy bundled walking, task 01a12465-28fb-744f-9461-3f645036c8e5, refined by '
    'scripts/island_soul_walk.py (%.0f steps/min, speed measured from the planted feet)' % (120 / duration))
with open(os.path.splitext(output)[0]+'.manifest.json', 'w') as f: json.dump(manifest, f, indent=2)
print('SOUL_READY', json.dumps(manifest['clips']))

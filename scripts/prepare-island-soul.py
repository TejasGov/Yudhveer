"""
Combine the approved Meshy walk with the existing pipeline's retargeted relaxed idle on the same human mesh.
Run in Blender: -- <meshy-walking.glb> <prepared-idle.glb> <output.glb>. Source files are never overwritten.
World-space bone rotations are transferred through the two rest frames, so import scale and bone-roll changes
do not turn the arms back into an A-pose. Horizontal root travel is removed and recorded as walking speed;
the scene staging supplies translation. The result is inspected separately before it is copied into the game.
"""
import bpy, sys, json, os, math, statistics, tempfile
from mathutils import Matrix, Vector

source, idle, output = sys.argv[sys.argv.index('--') + 1:]
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
idle_action = next(a for a in bpy.data.actions if a.name.startswith('calm_idle'))
idle_action.name = 'idle'
for track in list(tgt.animation_data.nla_tracks): tgt.animation_data.nla_tracks.remove(track)
tgt.animation_data.action = None
tw = tgt.matrix_world.copy(); inv = tw.inverted()
t_rest = {b.name: tw @ b.matrix_local for b in tgt.data.bones}
order = list(tgt.data.bones)
walk = bpy.data.actions.new('walk'); tgt.animation_data.action = walk
travel = frames[-1]['Hips'].translation - frames[0]['Hips'].translation
horizontal = Vector((travel.x, travel.y, 0))
duration = (len(frames) - 1) / 30
stance_speeds = []
for foot in ['LeftToeBase', 'RightToeBase']:
    floor = min(f[foot].translation.z for f in frames)
    for a, b in zip(frames, frames[1:]):
        p, q = a[foot].translation, b[foot].translation
        if max(p.z, q.z) < floor + 0.04:
            stance_speeds.append(abs(q.y-p.y)*30)
speed = horizontal.length/duration
if speed < 0.1: speed = statistics.median(stance_speeds) if stance_speeds else 1.3
for i, frame in enumerate(frames):
    poses = {}
    for b in order:
        parent = b.parent.name if b.parent else None
        rel = b.parent.matrix_local.inverted() @ b.matrix_local if parent else b.matrix_local
        pos = (poses[parent] @ rel).translation if parent else b.head_local.copy()
        if b.name in frame:
            rotation = (inv.to_quaternion() @ frame[b.name].to_quaternion()
                        @ rest[b.name].to_quaternion().inverted() @ t_rest[b.name].to_quaternion())
            if b.name == 'Hips':
                delta = frame[b.name].translation - rest[b.name].translation - horizontal * (i / (len(frames) - 1))
                pos = inv @ (t_rest[b.name].translation + delta)
            m = Matrix.LocRotScale(pos, rotation, None)
        else: m = poses[parent] @ rel if parent else b.matrix_local.copy()
        poses[b.name] = m
        basis = rel.inverted() @ poses[parent].inverted() @ m if parent else b.matrix_local.inverted() @ m
        pb = tgt.pose.bones[b.name]; pb.rotation_mode = 'QUATERNION'
        pb.location, pb.rotation_quaternion, pb.scale = basis.decompose()
        pb.keyframe_insert('rotation_quaternion', frame=i)
        pb.keyframe_insert('location', frame=i)
tgt.animation_data.action = None
for a in [idle_action, walk]:
    track = tgt.animation_data.nla_tracks.new(); track.name = a.name; track.strips.new(a.name, 0, a)
    track.mute = False
bpy.context.scene.render.fps = 30
bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', export_animations=True,
    export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_image_format='AUTO')
manifest = json.load(open(os.path.splitext(idle)[0]+'.manifest.json'))
manifest['model'] = os.path.basename(output)
manifest['clips'] = {'idle': manifest['clips']['calm_idle'], 'walk': {
    'duration': duration, 'loop': True, 'speed': round(speed, 4)}}
manifest['clips']['walk']['source'] = 'Meshy bundled walking, task 01a12465-28fb-744f-9461-3f645036c8e5'
with open(os.path.splitext(output)[0]+'.manifest.json', 'w') as f: json.dump(manifest, f, indent=2)
print('SOUL_READY', json.dumps(manifest['clips']))

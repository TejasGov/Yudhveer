"""
Prototype rigs for the user-supplied island demoness, released soul and chained axe.
Run with Blender in background mode, passing --source and --output after --. Sources are never overwritten.
The spider's legs and upper body receive a small geometric rig with authored idle, scuttle and reaction poses;
the soul floats instead of pretending to have a finished walking cycle. These are first-pass animations, not
motion capture. Texture copies are reduced to 1024 pixels for the browser. The supplied axe remains one mesh;
its travelling blade and connecting chain are controlled by the boss at runtime, independently of the body.
"""
import bpy, sys, os, math, json, argparse, hashlib
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
os.makedirs(args.output, exist_ok=True)

def source_digest(path):
    with open(path, 'rb') as file: return hashlib.sha256(file.read()).hexdigest()

def import_mesh(file, height):
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for image in list(bpy.data.images):
        if image.name not in ['Render Result', 'Viewer Node']: bpy.data.images.remove(image)
    bpy.ops.import_scene.gltf(filepath=os.path.join(args.source, file))
    meshes = [o for o in bpy.context.selected_objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]; bpy.ops.object.join(); obj = bpy.context.object
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    low = Vector([min(v.co[i] for v in obj.data.vertices) for i in range(3)])
    high = Vector([max(v.co[i] for v in obj.data.vertices) for i in range(3)])
    center = Vector(((low.x+high.x)/2, (low.y+high.y)/2, low.z))
    factor = height / (high.z-low.z)
    for vertex in obj.data.vertices: vertex.co = (vertex.co-center)*factor
    for image in bpy.data.images:
        w,h = image.size
        if max(w,h)>1024: image.scale(round(w*1024/max(w,h)),round(h*1024/max(w,h)))
    return obj

def rig(file, name, height, spider):
    obj = import_mesh(file, height); obj.name = name
    data = bpy.data.armatures.new(name+'_Skeleton'); arm = bpy.data.objects.new(name+'_Rig', data)
    bpy.context.collection.objects.link(arm); bpy.context.view_layer.objects.active=arm
    bpy.ops.object.mode_set(mode='EDIT')
    segments={}
    def bone(name, head, tail, parent=None):
        b=data.edit_bones.new(name); b.head=head; b.tail=tail
        if parent: b.parent=data.edit_bones[parent]
        segments[name]=(Vector(head),Vector(tail)); return b
    pelvis=height*(.43 if spider else .5)
    bone('Root',(0,0,pelvis),(0,0,pelvis+.2))
    bone('Body',(0,0,pelvis),(0,0,height*.82),'Root')
    bone('Head',(0,0,height*.82),(0,0,height*.97),'Body')
    for sign,side in [(1,'R'),(-1,'L')]:
        bone('Arm_'+side,(sign*height*.1,0,height*.75),(sign*height*.28,-height*.05,height*.61),'Body')
        if spider:
            for i,y in enumerate([-.75,0,.75]):
                bone('Leg_'+side+str(i),(sign*.55,y*.55,pelvis),(sign*1.35,y, .35),'Root')
        else:
            bone('Leg_'+side,(sign*.14,0,pelvis),(sign*.14,0,.15),'Root')
    bpy.ops.object.mode_set(mode='OBJECT')
    # Blend the two nearest deform segments. Keep the central torso/skirt on the body rather than the outer legs.
    for key in segments: obj.vertex_groups.new(name=key)
    for v in obj.data.vertices:
        candidates=[]
        for key,(a,b) in segments.items():
            if key=='Root': continue
            if spider and key.startswith('Leg') and (abs(v.co.x)<.5 or v.co.z>pelvis+.2): continue
            if key.startswith('Arm') and v.co.z<height*.52: continue
            ab=b-a; k=max(0,min(1,(v.co-a).dot(ab)/ab.length_squared)); distance=(v.co-a-ab*k).length
            candidates.append((distance,key))
        nearest=sorted(candidates)[:2]; total=sum(1/(d+.05)**4 for d,_ in nearest)
        for d,key in nearest: obj.vertex_groups[key].add([v.index],(1/(d+.05)**4)/total,'REPLACE')
    modifier=obj.modifiers.new('PrototypeSkin','ARMATURE'); modifier.object=arm; obj.parent=arm
    # A stable attachment point is exported in the same skeleton as the body.
    socket=bpy.data.objects.new('Socket_Hand_R',None); bpy.context.collection.objects.link(socket)
    socket.parent=arm; socket.parent_type='BONE'; socket.parent_bone='Arm_R'
    socket.location=(0,0,0)
    clips={}
    specifications=[('idle',2,True),('move',1,True),('attack_1',1.8,False),('attack_2',2,False),('attack_3',2.2,False),('impact',.65,False),('death',2,False)]
    for clip,duration,loop in specifications:
        action=bpy.data.actions.new(clip); arm.animation_data_create(); arm.animation_data.action=action
        frames=round(duration*30)
        for frame in range(frames+1):
            p=frame/frames; t=p*duration
            for pb in arm.pose.bones:
                pb.rotation_mode='XYZ'; pb.rotation_euler=(0,0,0); pb.location=(0,0,0)
                if pb.name=='Body':
                    pb.rotation_euler.x=.025*math.sin(t*math.pi*2)
                    if clip.startswith('attack'): pb.rotation_euler.z=.25*math.sin(p*math.pi*2)
                    if clip=='impact': pb.rotation_euler.x=-.25*math.sin(p*math.pi)
                if pb.name.startswith('Leg') and clip=='move':
                    phase=(0 if 'R' in pb.name else math.pi)+(int(pb.name[-1])*math.pi if spider else 0)
                    pb.rotation_euler.z=.1*math.sin(t*math.pi*2+phase)
                    pb.rotation_euler.x=.06*math.cos(t*math.pi*2+phase)
                if pb.name.startswith('Arm') and clip.startswith('attack'):
                    pb.rotation_euler.x=.35*math.sin(p*math.pi); pb.rotation_euler.z=(1 if 'R' in pb.name else -1)*.2*math.sin(p*math.pi)
                if pb.name=='Root':
                    pb.location.y=.025*math.sin(t*math.pi*2)
                    if clip=='death': pb.location.y=-height*.35*min(1,p*1.5); pb.rotation_euler.x=.75*min(1,p*1.5)
                pb.keyframe_insert('rotation_euler',frame=frame+1); pb.keyframe_insert('location',frame=frame+1)
        track=arm.animation_data.nla_tracks.new(); track.name=clip; track.strips.new(clip,1,action)
        arm.animation_data.action=None; clips[clip]={'duration':frames/30,'loop':loop,'speed':2 if clip=='move' else 0}
    for pb in arm.pose.bones: pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
    bpy.context.scene.render.fps=30; bpy.context.scene.frame_set(1)
    bpy.ops.export_scene.gltf(filepath=os.path.join(args.output,name+'.glb'),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_image_format='AUTO')
    manifest={'model':name+'.glb','source':file,'sourceSHA256':source_digest(os.path.join(args.source,file)),'height':height,'triangles':sum(len(p.vertices)-2 for p in obj.data.polygons),'sockets':['Socket_Hand_R'],'clips':clips,'prototype':True}
    with open(os.path.join(args.output,name+'.manifest.json'),'w') as out: json.dump(manifest,out,indent=2)

rig('spider demon.glb','island_demoness',3.2,True)
rig('human form of spider.glb','island_soul',1.8,False)
axe=import_mesh('spider chain axe.glb',1.5); axe.name='IslandChainAxe'
bpy.ops.export_scene.gltf(filepath=os.path.join(args.output,'island_chain_axe.glb'),export_format='GLB',export_animations=False,export_image_format='AUTO')
with open(os.path.join(args.output,'sources.json'),'w') as out:
    json.dump({'sourceRoot':args.source,'sources':{f:source_digest(os.path.join(args.source,f)) for f in ['spider demon.glb','human form of spider.glb','spider chain axe.glb']},'status':'user supplied; no third-party license asserted','texturesMax':1024,'animation':'locally authored prototype'},out,indent=2)

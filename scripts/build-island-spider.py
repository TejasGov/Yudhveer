"""
Rebuild the supplied eight-legged demoness with anatomical joint chains and baked foot IK.
Blender usage: -- <original-spider.glb> <output.glb>. Outputs stay separate until visual review.
The old six single-bone legs were placed at guessed depths and dragged the abdomen and torso with them.
This rig follows front/side/top measurements, welds UV seams for bone-heat skinning, and keeps eight feet on
their authored marks during idle and attacks. A staggered four-foot gait lifts and plants each foot rather
than rotating a whole leg through the floor. All IK is baked into the GLB; the browser needs no IK solver.
"""
import bpy, bmesh, sys, os, json, math, hashlib, tempfile
from mathutils import Vector, kdtree

source, output = sys.argv[sys.argv.index('--')+1:]
tempfile.tempdir=os.path.join(os.path.dirname(os.path.abspath(output)),'.blender-temp')
os.makedirs(tempfile.tempdir,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=source)
body = next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.context.view_layer.objects.active=body; body.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
low=Vector([min(v.co[i] for v in body.data.vertices) for i in range(3)])
high=Vector([max(v.co[i] for v in body.data.vertices) for i in range(3)])
center=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z));scale=3.2/(high.z-low.z)
for v in body.data.vertices:v.co=(v.co-center)*scale
bm=bmesh.new();bm.from_mesh(body.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.0001);bm.to_mesh(body.data);bm.free()
body.data.validate();body.data.update()
for image in bpy.data.images:
    w,h=image.size
    if max(w,h)>2048:image.scale(round(w*2048/max(w,h)),round(h*2048/max(w,h)))
arm=bpy.data.objects.new('IslandDemonessRig',bpy.data.armatures.new('IslandDemonessSkeleton'))
bpy.context.collection.objects.link(arm);bpy.context.view_layer.objects.active=arm
bpy.ops.object.mode_set(mode='EDIT');bones=arm.data.edit_bones
def bone(name,a,b,parent=None):
    result=bones.new(name);result.head=a;result.tail=b
    if parent:result.parent=bones[parent]
    return result
bone('Root',(0,-.15,1.25),(0,-.15,1.45)).use_deform=False
bone('Pelvis',(0,-.65,1.32),(0,-.65,1.7),'Root')
bone('Abdomen',(0,.2,1.2),(0,1.5,1.15),'Root')
bone('Spine',(0,-.65,1.7),(.04,-.64,2.04),'Pelvis')
bone('Chest',(.04,-.64,2.04),(.08,-.63,2.4),'Spine')
bone('Neck',(.08,-.63,2.4),(.07,-.61,2.68),'Chest')
bone('Head',(.07,-.61,2.68),(.08,-.53,3.04),'Neck')
arms={
 'R':[(-.13,-.63,2.4),(-.31,-.66,2.4),(-.44,-.81,2.09),(-.68,-1.03,2.37),(-.77,-1.05,2.61)],
 'L':[(.20,-.63,2.4),(.39,-.57,2.35),(.62,-.51,2.1),(.98,-.67,1.96),(1.03,-.76,1.79)],
}
for side,points in arms.items():
    parent='Chest'
    for part,a,b in zip(['Shoulder','UpperArm','Forearm','Hand'],points,points[1:]):
        name=part+'_'+side;bone(name,a,b,parent);parent=name
# Three joints per leg: hip -> raised knee -> ankle -> pointed foot. The source is deliberately asymmetric.
legs={
 'R0':[(-.32,-.95,1.28),(-.45,-1.4,1.45),(-.52,-1.85,1.0),(-.58,-2.23,1.05)],
 'R1':[(-.45,-.7,1.2),(-.83,-.97,1.7),(-1.32,-1.25,.91),(-1.597,-1.274,.16)],
 'R2':[(-.48,-.15,1.15),(-1.08,.02,1.85),(-1.55,.23,.91),(-1.707,.292,.066)],
 'R3':[(-.52,.48,1.14),(-1.08,.93,1.69),(-1.09,1.75,.8),(-1.059,2.21,.451)],
 'L0':[(.45,-.78,1.25),(.67,-1.25,1.4),(.83,-1.57,.85),(.95,-1.815,.01)],
 'L1':[(.46,-.57,1.22),(.75,-.77,1.72),(1.2,-.65,.83),(1.376,-.361,.016)],
 'L2':[(.5,-.05,1.24),(1.04,.08,1.84),(1.45,.37,.87),(1.754,.652,.084)],
 'L3':[(.53,.45,1.2),(.88,.95,1.75),(.79,1.78,.8),(.670,2.126,.442)],
}
for leg,points in legs.items():
    parent='Root'
    for i in range(3):
        name='Leg_'+leg+'_'+str(i);bone(name,points[i],points[i+1],parent);parent=name
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);arm.select_set(True)
bpy.context.view_layer.objects.active=arm;bpy.ops.object.parent_set(type='ARMATURE_AUTO')
weighted=[v for v in body.data.vertices if any(g.weight>.001 for g in v.groups)]
if len(weighted)<len(body.data.vertices)*.95:raise RuntimeError('Bone heat did not bind enough of the mesh; stop for repair')
tree=kdtree.KDTree(len(weighted))
for i,v in enumerate(weighted):tree.insert(v.co,i)
tree.balance();filled=0
for v in body.data.vertices:
    if any(g.weight>.001 for g in v.groups):continue
    _,i,_=tree.find(v.co)
    for g in weighted[i].groups:body.vertex_groups[g.group].add([v.index],g.weight,'REPLACE')
    filled+=1
# Heat may overshoot one slightly around overlapping shells. Clamp, retain four influences and normalize here,
# before posing, so preview and browser use the same weights and the exporter need not repair the mesh silently.
for v in body.data.vertices:
    weights=sorted([(g.group,max(0,min(1,g.weight))) for g in v.groups if math.isfinite(g.weight) and g.weight>1e-5],key=lambda x:-x[1])[:4]
    total=sum(w for _,w in weights)
    if total<1e-8:raise RuntimeError('Unweighted vertex after skin normalization')
    for g in list(v.groups):body.vertex_groups[g.group].remove([v.index])
    for group,w in weights:body.vertex_groups[group].add([v.index],w/total,'REPLACE')
# IK targets are authoring controls only. The GLB contains baked deform transforms and no control objects.
targets={}
for leg,points in legs.items():
    target=bpy.data.objects.new('FootTarget_'+leg,None);bpy.context.collection.objects.link(target);target.location=points[-1]
    ik=arm.pose.bones['Leg_'+leg+'_2'].constraints.new('IK');ik.target=target;ik.chain_count=3;ik.use_stretch=False
    targets[leg]=target
hand_target=bpy.data.objects.new('RightWristTarget',None);bpy.context.collection.objects.link(hand_target)
hand_ik=arm.pose.bones['Forearm_R'].constraints.new('IK');hand_ik.target=hand_target;hand_ik.chain_count=2;hand_ik.use_stretch=False
socket=bpy.data.objects.new('Socket_Hand_R',None);bpy.context.collection.objects.link(socket)
socket.parent=arm;socket.parent_type='BONE';socket.parent_bone='Hand_R';socket.location=(0,-.12,0)
def smooth(t,a,b):
    k=max(0,min(1,(t-a)/(b-a)));return k*k*(3-2*k)
def pulse(t,a,b,c):return smooth(t,a,b)*(1-smooth(t,b,c))
def hand_mark(t,keys):
    for (a,pa),(b,pb) in zip(keys,keys[1:]):
        if t<=b:return Vector(pa).lerp(Vector(pb),smooth(t,a,b))
    return Vector(keys[-1][1])
hold=(-.60,-.95,2.18)
hand_keys={
 'attack_1':[(0,hold),(.6,(-.88,-.52,2.48)),(.825,(-.22,-1.3,2.1)),(1.05,(.04,-1.12,2.12)),(1.65,hold)],
 'attack_2':[(0,hold),(.65,(-.35,-.63,2.95)),(1.0,(-.35,-1.28,2.1)),(1.25,(-.35,-1.28,2.1)),(1.85,hold)],
 'attack_3':[(0,hold),(.6,(-.68,-.42,2.45)),(1.05,(-.30,-1.3,2.28)),(1.3,(-.3,-1.3,2.28)),(2.05,hold)],
}
specs=[('idle',2,True),('move',.8,True),('attack_1',1.8,False),('attack_2',2,False),('attack_3',2.2,False),('impact',.65,False),('death',2,False)]
clips={};actions=[]
for name,duration,loop in specs:
    count=round(duration*30);samples=[]
    for f in range(count+1):
        t=f/30;p=f/count
        for pb in arm.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
        root=arm.pose.bones['Root'];chest=arm.pose.bones['Chest'];spine=arm.pose.bones['Spine']
        chest.rotation_euler.x=.012*math.sin(p*math.pi*2 if loop else t*math.pi)
        root.location.y=-.13+(.018*math.sin(p*math.pi*2) if loop else 0)
        arm.pose.bones['Abdomen'].rotation_euler.y=.012*math.sin(p*math.pi*2)
        hand_target.location=hand_mark(t,hand_keys[name]) if name in hand_keys else hold
        for leg,target in targets.items():
            target.location=legs[leg][-1]
            target.location.z=.045
            if leg=='R0':target.location.y=-1.7
            if name=='move':
                phase=(p+(.5 if (int(leg[-1])+(leg[0]=='L'))%2 else 0))%1
                if phase<.65:dy=-.18+.36*phase/.65;lift=0
                else:
                    q=(phase-.65)/.35;dy=.18-.36*smooth(q,0,1);lift=.16*math.sin(q*math.pi)
                target.location.y+=dy;target.location.z+=lift
        if name.startswith('attack'):
            load=pulse(t,0,.55,1.2);follow=pulse(t,.6,1.05,duration-.1)
            if name=='attack_1':
                spine.rotation_euler.y=-.1*load;chest.rotation_euler.y=.45*(follow-load)
                arm.pose.bones['UpperArm_R'].rotation_euler.y=-.4*load+.5*follow
                arm.pose.bones['Forearm_R'].rotation_euler.x=-.45*follow
            elif name=='attack_2':
                chest.rotation_euler.x=-.17*load+.32*follow;root.location.y=-.13-.11*follow
                arm.pose.bones['UpperArm_R'].rotation_euler.x=-.45*load+.2*follow
                arm.pose.bones['Forearm_R'].rotation_euler.x=.2*load-.55*follow
            else:
                chest.rotation_euler.y=-.25*load+.2*follow
                arm.pose.bones['UpperArm_R'].rotation_euler.y=-.2*load+.6*follow
                arm.pose.bones['Forearm_R'].rotation_euler.x=-.6*follow
        elif name=='impact':
            chest.rotation_euler.x=-.16*math.sin(p*math.pi);spine.rotation_euler.y=.12*math.sin(p*math.pi)
        elif name=='death':
            k=smooth(p,0,.8);root.location.y=-.13-.65*k;chest.rotation_euler.x=.5*k;spine.rotation_euler.x=.25*k
            hand_target.location=Vector(hold)+Vector((0,-.1,-.6*k))
        bpy.context.view_layer.update()
        samples.append({b.name:b.matrix.copy() for b in arm.pose.bones})
    # Solve constraints first, then bake matrices without IK into local rotation/location keys.
    for pb in arm.pose.bones:
        for c in pb.constraints:c.mute=True
    action=bpy.data.actions.new(name);arm.animation_data_create();arm.animation_data.action=action
    for f,matrices in enumerate(samples):
        for pb in arm.pose.bones:
            rest=pb.bone.matrix_local
            if pb.parent:
                rel=pb.parent.bone.matrix_local.inverted() @ rest
                basis=rel.inverted() @ matrices[pb.parent.name].inverted() @ matrices[pb.name]
            else:basis=rest.inverted() @ matrices[pb.name]
            pb.rotation_mode='QUATERNION';pb.location,pb.rotation_quaternion,pb.scale=basis.decompose()
            pb.keyframe_insert('rotation_quaternion',frame=f);pb.keyframe_insert('location',frame=f)
    arm.animation_data.action=None;actions.append(action)
    for pb in arm.pose.bones:
        for c in pb.constraints:c.mute=False
    clips[name]={'duration':count/30,'loop':loop,'speed':.36/(.65*duration) if name=='move' else 0}
for pb in arm.pose.bones:
    for c in list(pb.constraints):pb.constraints.remove(c)
    pb.location=(0,0,0);pb.rotation_euler=(0,0,0)
for action in actions:
    track=arm.animation_data.nla_tracks.new();track.name=action.name;track.strips.new(action.name,0,action)
bpy.ops.object.select_all(action='DESELECT')
for o in [body,arm,socket]:o.select_set(True)
if body.data.validate():raise RuntimeError('Invalid mesh remains after skin normalization')
body.data.update()
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',use_selection=True,export_animations=True,
    export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_image_format='AUTO')
manifest={'model':os.path.basename(output),'source':os.path.basename(source),'sourceSHA256':hashlib.sha256(open(source,'rb').read()).hexdigest(),
    'height':3.2,'triangles':sum(len(p.vertices)-2 for p in body.data.polygons),'sockets':['Socket_Hand_R'],'clips':clips,
    'rig':{'legs':8,'legJoints':3,'skin':'bone heat with nearest-weighted fill','filledVertices':filled,'footIK':'baked'},'prototype':True}
with open(os.path.splitext(output)[0]+'.manifest.json','w') as f:json.dump(manifest,f,indent=2)
print('SPIDER_READY',json.dumps(manifest['rig']))

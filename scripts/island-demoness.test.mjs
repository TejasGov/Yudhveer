import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { loadDuelModule } from './duel-test-runtime.mjs';
import RAPIER from '@dimforge/rapier3d-compat';

/**
 * Executes the production expedition and axe paths with explicit platform doubles. The tests exercise gated
 * progression, concurrent-wave checkpoints and actual swept blade contacts, rather than duplicating those paths.
 * Asset checks inspect the exported skeleton/clip roster. Browser rendering, story timing and human balance
 * remain separate checks; these fixtures do not claim a complete campaign playthrough.
 */
const { ExpeditionRun } = await loadDuelModule('src/game/Expedition.ts', { three: THREE });
const enemy = id => ({ id, stateMachine: { currentState: 'IDLE' } });
const at = z => new THREE.Vector3(0, 0, z);
const spawn = id => ({ id });
const definition = {
  encounters: [
    { id: 'pack', start: { at: at(0), radius: 2 }, spawns: [spawn('a'), spawn('b'), spawn('c')] },
    { id: 'rear', start: { after: 'pack', alive: 2 }, spawns: [spawn('d')], checkpoint: { at: at(4), face: at(8) } },
    { id: 'boss', requires: ['pack', 'rear'], start: { at: at(10), radius: 2 }, spawns: [spawn('e')] },
  ], goal: { at: at(15), radius: 1, hint: 'Still guarded' },
};
test('boss cannot start before both waves clear; reaching the altar early cannot win', () => {
  const run = new ExpeditionRun(definition, 501, true), foes = ['a','b','c','d','e'].map(enemy);
  assert.equal(run.update(at(10), foes).start.length, 0);
  assert.equal(run.update(at(15), foes).hint, 'Still guarded'); assert.equal(run.complete, false);
  assert.equal(run.update(at(0), foes).start[0].id, 'pack');
  foes[0].stateMachine.currentState = 'DEAD'; assert.equal(run.update(at(0), foes).start[0].id, 'rear');
  for (const f of foes.slice(0,4)) f.stateMachine.currentState = 'DEAD';
  assert.equal(run.update(at(10), foes).start[0].id, 'boss');
  foes[4].stateMachine.currentState = 'DEAD'; run.update(at(15), foes); assert.equal(run.complete, true);
});
test('killing the rear wave first cannot checkpoint past surviving parent enemies', () => {
  const run = new ExpeditionRun(definition, 502, true), foes = ['a','b','c','d'].map(enemy);
  run.update(at(0), foes); foes[0].stateMachine.currentState = 'DEAD';run.update(at(0), foes);
  foes[3].stateMachine.currentState = 'DEAD'; run.update(at(0), foes);
  assert.equal(new ExpeditionRun(definition, 502, false).resumePoint(), null);
  for (const f of foes) f.stateMachine.currentState = 'DEAD';run.update(at(0), foes);
  assert.equal(new ExpeditionRun(definition, 502, false).resumePoint().at.z, 4);
});

class Boss {
  constructor() { this.group=new THREE.Group();this.stateMachine={currentState:'IDLE',stateTime:0};this.soundFX={playHitImpact(){}}; }
  update() {}
}
const axePhysics={world:null,RAPIER_INSTANCE:null};
const axeMotion=await loadDuelModule('src/combat/ChainAxeMotion.ts',{three:THREE});
const { BossIslandDemoness } = await loadDuelModule('src/entities/BossIslandDemoness.ts', {
  three: THREE, './Boss': { Boss }, './animation/CharacterRig': { CharacterRig: {} },
  '../core/Assets': { asset: x => x }, '../levels/GLBLevel': { disposeObject() {} },
  '../levels/environment/ToonRelight': { createToonRamp() {}, toonifyModel() {} },
  '../core/PhysicsWorld':{PhysicsWorld:{getInstance:()=>axePhysics}},
  '../combat/ChainAxeMotion':axeMotion,
});
const { sweepBlade } = await loadDuelModule('src/combat/HitboxManager.ts', { three: THREE, '../entities/Character': { Character: class {} } });
test('each authored attack sweeps a real capsule in range, never one far away', () => {
  const boss = new BossIslandDemoness();
  for (const state of ['ATTACK_1','ATTACK_2','ATTACK_3']) {
    const windows=boss.hitWindows(state), contacts=new Set(); let prev;
    for(let frame=0;frame<150;frame++) {
      boss.stateMachine.currentState=state;boss.stateMachine.stateTime=frame/60;boss.update(1/60);
      const curr=boss.getWeaponPoints();
      assert.ok([...curr.tip.toArray(),...curr.hilt.toArray()].every(Number.isFinite));
      if(prev) windows.forEach((w,i)=>{
        if(frame/60<w.t0||frame/60>w.t1)return;
        for(let z=1;z<=6;z+=.25) {
          const capsule={a:new THREE.Vector3(0,.4,z),b:new THREE.Vector3(0,1.4,z),radius:.35};
          if(sweepBlade(prev,curr,capsule).hit)contacts.add(i);
        }
        assert.equal(sweepBlade(prev,curr,{a:new THREE.Vector3(0,.4,20),b:new THREE.Vector3(0,1.4,20),radius:.35}).hit,false);
      });
      prev=curr;
    }
    assert.equal(contacts.size,windows.length,state+' reachable windows');
  }
  boss.stateMachine.currentState='DEAD';boss.update(1/60);assert.equal(boss.group.getObjectByName('TravellingChainAxe').visible,false);
});

test('attack selection reaches its chosen target; recall never opens another damage window',()=>{
  for(const distance of [1.65,2.5,3.1,4,4.8]) {
    const boss=new BossIslandDemoness();
    for(let attempt=0;attempt<2;attempt++) {
      const state=boss.chooseAttack(null,distance);
      if(distance>3.1)assert.equal(state,'ATTACK_3');
      let previous,hit=false;
      const body={a:new THREE.Vector3(0,.4,distance),b:new THREE.Vector3(0,1.4,distance),radius:.35};
      for(let f=0;f<140;f++) {
        boss.stateMachine.currentState=state;boss.stateMachine.stateTime=f/60;boss.update(1/60);
        const curr=boss.getWeaponPoints();
        if(previous&&boss.hitWindows().some(w=>f/60>=w.t0&&f/60<=w.t1)) hit ||= sweepBlade(previous,curr,body).hit;
        previous=curr;
      }
      assert.ok(hit,`${state} reaches ${distance}m`);
    }
  }
  assert.equal(axeMotion.AXE_WINDOWS.ATTACK_3.length,1);
  assert.ok(axeMotion.AXE_WINDOWS.ATTACK_3[0].t1<1.3);
});

test('axe leaves and returns to the hand continuously; deflection recalls instead of teleporting',()=>{
  const boss=new BossIslandDemoness(),axe=boss.group.getObjectByName('TravellingChainAxe');
  const hand=axe.position.clone(),held=axe.quaternion.clone();
  for(const state of ['ATTACK_1','ATTACK_2','ATTACK_3']) {
    let previous=hand.clone();
    for(let f=0;f<=132;f++) {
      boss.stateMachine.currentState=state;boss.stateMachine.stateTime=f/60;boss.update(1/60);
      assert.ok(axe.position.distanceTo(previous)<.4,`${state} frame ${f} has continuous travel`);
      previous.copy(axe.position);
    }
    assert.ok(axe.position.distanceTo(hand)<1e-6);assert.ok(axe.quaternion.angleTo(held)<1e-6);
  }
  boss.stateMachine.currentState='ATTACK_3';boss.stateMachine.stateTime=1;boss.update(1/60);
  const released=axe.position.clone();assert.ok(released.distanceTo(hand)>1);
  boss.stateMachine.currentState='DEFLECTED';boss.stateMachine.stateTime=0;boss.update(1/60);
  assert.ok(axe.position.distanceTo(released)<.05);assert.equal(boss.hitWindows().length,0);
  for(let f=1;f<30;f++){boss.stateMachine.stateTime=f/60;boss.update(1/60);}
  assert.ok(axe.position.distanceTo(hand)<1e-6);
  const chain=boss.group.children.find(o=>o.isInstancedMesh);assert.equal(chain.count,0);
});

test('real Rapier cave wall stops axe and cancels damage; fighter and sensor colliders do not',async()=>{
  await RAPIER.init();axePhysics.RAPIER_INSTANCE=RAPIER;
  for(const kind of ['wall','fighter','sensor']) {
    const world=axePhysics.world=new RAPIER.World({x:0,y:0,z:0});
    try {
      const desc=kind==='fighter'?RAPIER.RigidBodyDesc.kinematicPositionBased():RAPIER.RigidBodyDesc.fixed();
      const body=world.createRigidBody(desc.setTranslation(0,1.5,2.5));
      world.createCollider(RAPIER.ColliderDesc.cuboid(3,2,.1).setSensor(kind==='sensor'),body);world.step();
      const boss=new BossIslandDemoness();boss.chooseAttack(null,4.8);
      let blocked=false,furthest=0;
      for(let f=0;f<140;f++) {
        boss.stateMachine.currentState='ATTACK_3';boss.stateMachine.stateTime=f/60;boss.update(1/60);
        const {tip,hilt}=boss.getWeaponPoints();furthest=Math.max(furthest,tip.z,hilt.z);
        if(!boss.hitWindows().length)blocked=true;
        if(blocked)assert.equal(boss.hitWindows().length,0,'damage remains cancelled through recall');
      }
      if(kind==='wall'){assert.ok(blocked);assert.ok(furthest<2.4,`axe stops before wall: ${furthest}`);}
      else {assert.equal(blocked,false);assert.ok(furthest>4.5);}
      boss.stateMachine.stateTime=0;boss.update(1/60);assert.equal(boss.hitWindows().length,1,'new attack clears obstruction');
    } finally {world.free();axePhysics.world=null;}
  }
  axePhysics.RAPIER_INSTANCE=null;
});
test('both locally built rigs export all declared clips and a skin; manifest durations match animation time bounds', () => {
  for(const name of ['island_demoness','island_soul']) {
    const buffer=readFileSync(new URL('../public/assets/characters/'+name+'.glb',import.meta.url));
    const gltf=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)));
    const manifest=JSON.parse(readFileSync(new URL('../public/assets/characters/'+name+'.manifest.json',import.meta.url)));
    assert.equal(gltf.skins.length,1);assert.ok(gltf.nodes.some(n=>n.name==='Socket_Hand_R'));
    for(const [clip,info] of Object.entries(manifest.clips)) {
      const animation=gltf.animations.find(a=>a.name===clip);assert.ok(animation,clip);
      const times=animation.samplers.map(s=>gltf.accessors[s.input]);
      const duration=Math.max(...times.map(a=>a.max[0]))-Math.min(...times.map(a=>a.min[0]));
      assert.ok(Math.abs(duration-info.duration)<.002,clip+' duration');
    }
  }
});

const removed=[], physics={createStaticBox:()=>({body:{id:removed.length}}),removeBody:body=>removed.push(body)};
class GLBLevel {
  group=new THREE.Group();playerSpawn=new THREE.Vector3();physics=physics;ownedTextures=new Set();bloomObjects=[];
  update() {} dispose() {}
}
const shrineSeal=await loadDuelModule('src/levels/ShrineSeal.ts',{three:THREE});
const { Level5_Island, ISLAND, MACE_COLOR }=await loadDuelModule('src/levels/Level5_Island.ts',{
  three:THREE,'./GLBLevel':{GLBLevel},'./ShrineSeal':shrineSeal,
  '../combat/SoundFX':{SoundFX:{getInstance:()=>new Proxy({},{get:()=>()=>{}})}},
  './environment/ToonRelight':{createToonRamp:()=>null,toonifyModel(){}},
  './environment/FireField':{FireField:class{},findModelledFlames(){},spotForFlame(){}},
  '../core/PhysicsWorld':{PhysicsWorld:{getInstance:()=>physics}},
  '../entities/animation/CharacterRig':{CharacterRig:{}},
  '../entities/characters/YodhaWeapons':{WEAPON_SETS:{mace:{definition:{}}}},
  '../cinematics/CinematicDirector':{ease:{},joltCamera(){}},'../core/Assets':{asset:x=>x},
});
test('opening the seal removes exactly its own collider, is idempotent and retry starts sealed',async()=>{
  removed.length=0;const level=new Level5_Island();await level.loadEnvironment();
  assert.equal(level.group.getObjectByName('SealedMaceRoom').visible,true);
  level.cue('open-shrine');level.cue('open-shrine');assert.equal(removed.length,1);
  level.dispose();assert.equal(removed.length,1);
  const retry=new Level5_Island();await retry.loadEnvironment();assert.equal(retry.group.getObjectByName('SealedMaceRoom').visible,true);
  retry.dispose();assert.equal(removed.length,2);
});
class Extra {
  group=new THREE.Group();presence=0;position=new THREE.Vector3();
  appear(on){this.presence=on?1:0;this.group.visible=on;}
  setPosition(...p){this.position.set(...p);}
}
const {ISLAND_STORY}=await loadDuelModule('src/game/stories/Island.ts',{
  three:THREE,'../../cinematics/CinematicDirector':{ease:{}},'../../combat/SoundFX':{SoundFX:{}},
  '../Progression':{KITS:{dwarka:{}}},'../../levels/Level5_Island':{ISLAND},
  '../IslandExpedition':{ISLAND_FOES:{hall:[],pool:[],poolBehind:[],boss:'island_demoness'}},
  '../../cinematics/Entrance':{grade(){}},'../../entities/characters/Village':{GURU:{}},
  '../../entities/characters/IslandDemoness':{ISLAND_SOUL:{}},'../../entities/Extra':{Extra},
});
const {SceneRun}=await loadDuelModule('src/cinematics/Scene.ts',{
  three:THREE,'./Intros':{frame(){},offset(){}},'../entities/Enemy':{Enemy:class{}},
  '../entities/Extra':{Extra},'./Shade':{haunt(){}},'../combat/Voices':{Voices:{get:()=>null}},
  '../ui/Dialogue':{readingTime:()=>1,VOICE_TAIL:0},
});
test('skipping the release scene still opens the wall and puts a visible soul beside the original altar',()=>{
  const soul=new Extra(),cues=[],moves=[];
  const scene=ISLAND_STORY.beats.find(b=>b.on.fallen==='island_demoness').scene;
  const stage={actor:id=>id==='island_soul'?soul:null,level:{cue:name=>cues.push(name)},point:p=>p};
  const staging={moveTo:(actor,p)=>moves.push([actor,p]),place(){},face(){},settle(){for(const[a,p]of moves)a.setPosition(p.x,p.y,p.z);}};
  const run=new SceneRun(scene,stage,{},staging);run.settle();
  assert.deepEqual(cues,['open-shrine']);assert.equal(soul.presence,1);assert.equal(soul.group.visible,true);
  assert.equal(soul.position.z,ISLAND.inside.z);
});

const {ISLAND_EXPEDITION}=await loadDuelModule('src/game/IslandExpedition.ts',{
  three:THREE,'../entities/IslandMonsters':{MiniMonster:class{},ArcherMonster:class{}},
  '../entities/characters/IslandMonsters':{MINI_MONSTER:{},ARCHER_MONSTER:{}},
  '../levels/Level5_Island':{ISLAND},'../entities/BossIslandDemoness':{BossIslandDemoness},
  '../entities/characters/IslandDemoness':{ISLAND_DEMONESS:{}},
});
test('all actual encounter and checkpoint positions have nearby solid cave floor',async()=>{
  const b=readFileSync(new URL('../public/assets/levels/island_caves.glb',import.meta.url)),length=b.readUInt32LE(12);
  const data=JSON.parse(b.subarray(20,20+length));delete data.images;delete data.textures;delete data.materials;
  for(const m of data.meshes??[])for(const p of m.primitives)delete p.material;
  let json=Buffer.from(JSON.stringify(data));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const tail=b.subarray(20+length),header=Buffer.from(b.subarray(0,20));header.writeUInt32LE(20+json.length+tail.length,8);header.writeUInt32LE(json.length,12);
  const buffer=Buffer.concat([header,json,tail]);
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
  const colliders=[];gltf.scene.traverse(o=>{if(o.userData.collider)o.traverse(mesh=>{if(mesh.isMesh){mesh.material.side=THREE.DoubleSide;colliders.push(mesh);}});});
  assert.ok(colliders.length);gltf.scene.updateMatrixWorld(true);
  const samples=ISLAND_EXPEDITION.encounters.flatMap(e=>[...e.spawns.map(s=>({id:s.id,at:s.at})),...(e.checkpoint?[{id:e.id+' checkpoint',at:e.checkpoint.at}]:[])]);
  for(const s of samples){
    const ray=new THREE.Raycaster(s.at.clone().add(new THREE.Vector3(0,1,0)),new THREE.Vector3(0,-1,0),0,2);
    const hits=ray.intersectObjects(colliders,false);
    assert.ok(hits.some(h=>Math.abs(h.point.y-s.at.y)<.65),s.id+' has floor: '+JSON.stringify(hits.slice(0,3).map(h=>({mesh:h.object.name,point:h.point.toArray()}))));
  }
  // Reuse the shipped collision mesh in real Rapier: the boss must be able to finish each attack at her spawn,
  // rather than having every wind-up cancelled by our conservative head sphere touching the floor or ceiling.
  await RAPIER.init();axePhysics.RAPIER_INSTANCE=RAPIER;
  const world=axePhysics.world=new RAPIER.World({x:0,y:0,z:0});
  try {
    for(const mesh of colliders) {
      const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),positions=geometry.attributes.position;
      const vertices=new Float32Array(positions.count*3);
      for(let i=0;i<positions.count;i++){vertices[i*3]=positions.getX(i);vertices[i*3+1]=positions.getY(i);vertices[i*3+2]=positions.getZ(i);}
      const indices=geometry.index?Uint32Array.from(geometry.index.array):Uint32Array.from({length:positions.count},(_,i)=>i);
      world.createCollider(RAPIER.ColliderDesc.trimesh(vertices,indices),world.createRigidBody(RAPIER.RigidBodyDesc.fixed()));
      geometry.dispose();
    }
    world.step();
    const boss=new BossIslandDemoness();boss.group.position.copy(ISLAND_EXPEDITION.encounters.at(-1).spawns[0].at);
    for(const distance of [2.5,2.5,4.5]) {
      const state=boss.chooseAttack(null,distance);
      for(let f=0;f<135;f++) {
        boss.stateMachine.currentState=state;boss.stateMachine.stateTime=f/60;boss.update(1/60);
        assert.ok(boss.hitWindows().length,`${state} has room at cave spawn, frame ${f}`);
      }
    }
  } finally {world.free();axePhysics.world=null;axePhysics.RAPIER_INSTANCE=null;}
});

// ---- Island shrine seal: M1 (the seal re-armed on a restart) and the opening sequence ----------------------------------
// Added by the scene/unlock pass. These run the real Level5_Island and ShrineSeal code (only the platform is doubled), so they
// check what the game does: the collider that goes and comes back, the doors that go sideways and never down, the sequence's times.
const sealCamera = { position: new THREE.Vector3(0, -1, -66) };
const runLevel = (level, seconds, from = 0) => { for (let i = 0; i < Math.round(seconds * 60); i++) level.update(from + i / 60, 1 / 60, sealCamera); };
const withCreatedBoxes = async (body) => {
  const created = [], original = physics.createStaticBox;
  physics.createStaticBox = (...args) => { created.push(args); return original(...args); };
  try { await body(created); } finally { physics.createStaticBox = original; }
};

test('M1: a restart (chapter-start) re-arms an opened seal: shown and shut, the door collider back, the mace and its lamp restored', async () => {
  removed.length = 0;
  await withCreatedBoxes(async (created) => {
    const level = new Level5_Island(); await level.loadEnvironment();
    assert.equal(created.length, 1, 'the shut seal has its door collider');
    // The mace on the altar and its lamp, as the cave's export gives them.
    level.mace = new THREE.Group();
    const lamp = { color: MACE_COLOR, out: false, pos: new THREE.Vector3(0, -0.5, -76), light: new THREE.Vector3(0, -0.5, -76), power: 0.3, range: 5, group: null };
    level.lamps.push(lamp);
    // The story takes the mace, the soul opens the seal; the sequence runs its course.
    level.cue('take-mace'); level.cue('open-shrine');
    assert.equal(level.mace.visible, false); assert.equal(lamp.out, true); assert.equal(removed.length, 1);
    runLevel(level, 9);
    assert.equal(level.seal.phase, 'open'); assert.equal(level.sealOpen, true); assert.equal(level.sealFade, 0);
    // Retried or replayed in the same page session: the chapter starts again, and the level is reused.
    level.cue('chapter-start');
    assert.equal(level.sealOpen, false); assert.equal(level.sealFade, 0); assert.equal(level.seal.phase, 'closed');
    assert.equal(level.group.getObjectByName('SealedMaceRoom').visible, true);
    assert.equal(created.length, 2, 'the door collider is back');
    assert.deepEqual(level.seal.group.getObjectByName('Seal_DoorR').position.toArray(), [0, 0, 0]);
    assert.equal(level.seal.group.getObjectByName('Seal_DoorR').visible, true);
    assert.equal(level.mace.visible, true, 'the mace is on the altar again'); assert.equal(lamp.out, false, 'and its lamp lit');
    assert.ok(level.sealLight.intensity > 0 && level.sealLight.intensity < 3 && level.sealLight.color.b > level.sealLight.color.r, 'the gate light is back to its cold idle');
    assert.equal(level.seal.roomGain, 0, 'the altar room is dark behind the shut seal');
    // Idempotent: a second chapter-start (the first load sends one too) changes nothing and adds no second collider.
    level.cue('chapter-start'); assert.equal(created.length, 2);
    // And it opens again, once, with its collider removed again.
    level.cue('open-shrine'); level.cue('open-shrine'); assert.equal(removed.length, 2);
    runLevel(level, 9);
    assert.equal(level.seal.phase, 'open');
    level.dispose();
    // The body that was missing at disposal time is not removed twice.
    assert.equal(removed.length, 2);
  });
});

test('the opening: runes, rumble, cracks, a split that slides sideways, then the flood; nothing sinks through the floor', () => {
  const log = [];
  let now = 0;
  const seal = new shrineSeal.ShrineSeal({ jolt: a => log.push(['jolt', a, now]), sound: (cue, n) => log.push([cue, n, now]), dust: (at, n) => log.push(['dust', n, now]) });
  const T = shrineSeal.SEAL_TIMES, G = shrineSeal.GATE;
  const doors = [seal.group.getObjectByName('Seal_DoorL'), seal.group.getObjectByName('Seal_DoorR')];
  // Shut: nothing moves while idle, the runes breathe.
  for (let i = 0; i < 120; i++) seal.update(1 / 60, i / 60);
  assert.equal(seal.phase, 'closed'); assert.deepEqual(log, []);
  assert.ok(doors.every(d => d.position.x === 0 && d.position.y === 0));
  seal.open(); seal.open();
  const frames = [];
  for (now = 0; now < 9; now += 1 / 60) {
    seal.update(1 / 60, 2 + now);
    const u = seal.uniforms;
    frames.push({ t: seal.t, x: doors.map(d => d.position.x), y: doors.map(d => d.position.y), gain: seal.roomGain, phase: seal.phase, ignite: u.uIgnite.value, crack: u.uCrack.value, warm: u.uWarm.value });
  }
  // The sequence's own times: runes first, the rumble at 0.4 s, the split at about 1.4 s, the flood at 2.2 s; over by 3 s of doors.
  const first = (cue) => log.find(e => e[0] === cue)?.[2];
  assert.equal(log.filter(e => e[0] === 'chime').length, 5, 'a chime for each of five runes, once however many times it is opened');
  assert.ok(first('chime') < 0.05 && Math.abs(first('rumble') - 0.4) < 0.05, 'runes first, then the rumble');
  assert.ok(Math.abs(first('split') - (T.split - 0.02)) < 0.05 && first('bloom') >= 2.15 && first('bloom') <= 2.3);
  assert.ok(T.slideEnd - T.split >= 1 && T.slideEnd <= 3, 'the doors take about a second and a half, done inside three');
  assert.ok(log.some(e => e[0] === 'jolt' && e[2] < 1.4) && log.some(e => e[0] === 'jolt' && e[1] >= 0.1 && Math.abs(e[2] - (T.split - 0.02)) < 0.05), 'a tremor in the build-up and a shake at the split');
  // Doors: still until the split, then out sideways (left and right, mirrored), monotonic, never up or down; gone behind the wings.
  for (const f of frames) {
    if (f.t < T.split - 0.13) assert.ok(f.x.every(x => x === 0), 'still shut before the split');
    assert.ok(f.y.every(y => y === 0), 'the doors never drop or rise');
  }
  const at = (t) => frames.find(f => f.t >= t);
  assert.ok(at(2.0).x[1] > 0.5 && at(2.0).x[0] < -0.5, 'sliding sideways, each its own way');
  assert.ok(Math.abs(at(2.0).x[0] + at(2.0).x[1]) < 1e-6, 'mirrored');
  for (let i = 1; i < frames.length; i++) if (frames[i].t > T.split + 0.05) assert.ok(Math.abs(frames[i].x[1]) >= Math.abs(frames[i - 1].x[1]) - 0.03, 'only ever outward');
  const done = at(T.slideEnd + 0.1);
  assert.ok(done.x[1] >= G.slide - 0.05 && done.x[1] > G.half, 'the door ends deep in the rock beyond the jamb');
  assert.ok(doors.every(d => d.geometry.boundingBox.min.y >= G.floor - 0.1), 'and no door reaches below the floor');
  // The altar room's light floods as it opens; the runes ignite, the cracks spread, the flood warms the light.
  assert.equal(at(1.0).gain, 0); assert.ok(at(2.4).gain > 0.4 && at(4).gain === 1, 'the altar room floods');
  assert.ok(at(0.2).ignite < at(0.9).ignite && at(0.9).ignite > 0.7, 'runes ignite in order');
  assert.ok(at(1.0).crack < at(1.6).crack && at(1.6).crack > 0.5, 'cracks of light spread');
  assert.ok(at(3.6).warm > 0.95 && at(0.5).warm === 0, 'cyan warming to amber');
  // Over: the doors hidden, the effects off, the debris at rest on the floor (none below it, none left in the air).
  const end = frames.at(-1);
  assert.equal(end.phase, 'open'); assert.equal(seal.remaining, 0); assert.ok(doors.every(d => !d.visible));
  assert.ok(!seal.gap.visible && !seal.shafts.visible && !seal.spill.visible && seal.clouds.every(c => !c.visible));
  const m = new THREE.Matrix4(), p = new THREE.Vector3();
  assert.ok(seal.debris.count > 10);
  for (let i = 0; i < seal.debris.count; i++) { seal.debris.getMatrixAt(i, m); p.setFromMatrixPosition(m); assert.ok(p.y >= G.floor - 0.01 && p.y < G.floor + 0.5, `debris ${i} lies on the floor: ${p.y}`); }
  // Re-armed, it is the shut seal again with its debris gone.
  seal.rearm();
  assert.equal(seal.phase, 'closed'); assert.equal(seal.debris.count, 0); assert.equal(seal.roomGain, 0);
  assert.ok(doors.every(d => d.visible && d.position.x === 0));
  const before = log.length; seal.open(); assert.equal(seal.phase, 'opening'); assert.ok(log.length > before, 'and it can open again');
  seal.dispose();
});

test('the release scene: the seal opens through an essential cue, the voice in the shrine calls over the reveal, and the scene stays short', () => {
  const scene = ISLAND_STORY.beats.find(b => b.on.fallen === 'island_demoness').scene;
  let start = 0; const timeline = [];
  for (const shot of scene.shots) { for (const cue of shot.cues ?? []) timeline.push({ at: start + cue.at, cue }); for (const l of shot.lines ?? []) timeline.push({ at: start + (shot.linesAt ?? 0.4), line: l, carry: shot.carryLines }); start += shot.duration; }
  assert.ok(start <= 16.3 + 3, `the scene is ${start} s: at most three seconds longer than before (16.3 s)`);
  const open = timeline.find(e => e.cue?.run && e.cue.essential && String(e.cue.run).includes('open-shrine'));
  assert.ok(open, 'the opening is an essential cue (skipping the scene still opens the seal)');
  const voice = timeline.find(e => e.line?.voice === 'island_shrine_voice_2');
  assert.ok(voice, 'the shrine voice\'s second line is wired in'); assert.equal(voice.line.speaker, 'Voice in the shrine'); assert.ok(voice.carry, 'and runs on over the shots after it');
  const split = open.at + shrineSeal.SEAL_TIMES.split;
  assert.ok(voice.at >= split && voice.at <= split + 1.5, 'it calls as the doors part');
  assert.ok(start - voice.at >= 5.5, 'and the reveal is held for the whole of it');
  assert.ok(readFileSync(new URL('../public/assets/voice/island_shrine_voice_2.mp3', import.meta.url)).length > 1000, 'the recording ships');
});

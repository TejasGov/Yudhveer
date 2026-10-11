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
// The axe's FX run for real against recording doubles of the engine's singletons (sound, sparks, camera).
const fxLog=[];
const record=(kind)=>new Proxy({}, {get:(_,name)=>(...args)=>{fxLog.push(kind+'.'+String(name));return kind==='sound'?undefined:false;}});
const soundDouble=record('sound'), clashDouble=record('clash'), particleDouble=Object.assign(record('particles'),{scene:null});
const toonRelight=await loadDuelModule('src/levels/environment/ToonRelight.ts',{three:THREE});
const axeFX=await loadDuelModule('src/combat/AxeFX.ts',{
  three:THREE,'./ParticleFX':{ParticleFX:{getInstance:()=>({scene:null,spawnDustPuff:()=>fxLog.push('particles.dust'),spawnEmbers:()=>fxLog.push('particles.embers')})}},
  './ClashFX':{ClashFX:{getInstance:()=>clashDouble}},'./SoundFX':{SoundFX:{getInstance:()=>soundDouble}},
  '../core/SceneManager':{SceneManager:{getInstance:()=>({camera:new THREE.PerspectiveCamera(),impact:{impact:(kind)=>fxLog.push('camera.'+kind)},postFX:{keepBloom(){},addBloom(){}}})}},
  '../core/InputManager':{InputManager:{getInstance:()=>({rumble(){}})}},
  '../core/ImpactCamera':{IMPACTS:new Proxy({},{get:()=>({rumble:[0,0,0]})})},
  '../levels/environment/ToonRelight':toonRelight,
});
void particleDouble;
const { BossIslandDemoness } = await loadDuelModule('src/entities/BossIslandDemoness.ts', {
  three: THREE, './Boss': { Boss }, './animation/CharacterRig': { CharacterRig: {} },
  '../core/Assets': { asset: x => x }, '../levels/GLBLevel': { disposeObject() {} },
  '../levels/environment/ToonRelight': { createToonRamp() {}, toonifyModel() {} },
  '../core/PhysicsWorld':{PhysicsWorld:{getInstance:()=>axePhysics}},
  '../combat/ChainAxeMotion':axeMotion,
  '../combat/AxeChain':await loadDuelModule('src/combat/AxeChain.ts',{three:THREE,'../levels/environment/ToonRelight':toonRelight}),
  '../combat/AxeBody':await loadDuelModule('src/combat/AxeBody.ts',{three:THREE}),
  '../combat/AxeFX':axeFX,
  '../combat/SlashRibbon':await loadDuelModule('src/combat/SlashRibbon.ts',{three:THREE}),
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

test('each blow winds up, holds coiled at the top, whips out at 22-28 m/s and never slows mid-stroke',()=>{
  const hand=new THREE.Vector3(-0.65,2.3,1.0),p=new THREE.Vector3(),q=new THREE.Quaternion(),tip=new THREE.Vector3(),last=new THREE.Vector3();
  for(const [state,reach] of [['ATTACK_1',2.4],['ATTACK_2',2.4],['ATTACK_3',4.2]]) {
    const motion=new axeMotion.AxeMotion();motion.prepare(state,reach);const cue=motion.cue({});
    assert.ok(cue.whip>=0.35&&cue.whip<=0.45,`${state} anticipation ${cue.whip}`);
    assert.ok(cue.whip-cue.apex>=0.08-1e-9&&cue.whip-cue.apex<=0.12+1e-9,`${state} apex hold ${cue.whip-cue.apex}`);
    const speeds=[];let held=0;
    for(let f=0;f<=150;f++) {
      const t=f/60;motion.pose(state,t,hand,p,q);tip.copy(axeMotion.AXE_TIP).applyQuaternion(q).add(p);
      if(f>0) speeds.push({t,v:tip.distanceTo(last)*60});
      if(t>cue.apex&&t<=cue.whip) held=Math.max(held,p.distanceTo(motion.position(cue.apex,hand,new THREE.Vector3())));
      last.copy(tip);
    }
    assert.ok(held<0.15,`${state} hold creeps ${held}`);
    const strike=speeds.filter(s=>s.t>cue.whip&&s.t<=cue.stop);
    const peak=strike.reduce((a,b)=>b.v>a.v?b:a);
    assert.ok(peak.v>=22&&peak.v<=29,`${state} peak tip ${peak.v}`);
    // The whip-out: most of its speed within 0.16 s of leaving the coil (the slam then keeps gathering speed into the floor).
    const out=strike.filter(s=>s.t<=cue.whip+0.16).reduce((a,b)=>Math.max(a,b.v),0);
    assert.ok(out>=0.8*peak.v,`${state} whip-out reaches ${out} of ${peak.v} m/s in 0.16 s`);
    const after=strike.filter(s=>s.t>=peak.t);
    for(let i=1;i<after.length;i++) assert.ok(after[i].v<=after[i-1].v+2,`${state} speeds up again mid-stroke at ${after[i].t}`);
    assert.ok(Math.max(...speeds.filter(s=>s.t<cue.apex).map(s=>s.v))<18,`${state} draws back readably`);
  }
});

test('the recall snaps through the hand and settles; the chain hangs slack drawn back and goes taut at full stretch',()=>{
  const boss=new BossIslandDemoness(),axe=boss.group.getObjectByName('TravellingChainAxe'),hand=axe.position.clone();
  boss.chooseAttack(null,4.2);
  let passed=false,slackDrawn=1,taut=0;const cue={};
  for(let f=0;f<=132;f++) {
    boss.stateMachine.currentState='ATTACK_3';boss.stateMachine.stateTime=f/60;boss.update(1/60);
    if(f===0) boss.motion.cue(cue);
    const t=f/60,probe=boss.axeProbe();
    if(t>0.2&&t<cue.whip) slackDrawn=Math.min(slackDrawn,probe.stretch);
    if(t>=cue.stop&&t<cue.stop+0.05) taut=Math.max(taut,probe.stretch);
    if(t>cue.home&&t<cue.settled&&axe.position.distanceTo(hand)>0.02) passed=true;
  }
  assert.ok(slackDrawn<0.95,`drawn back the chain hangs slack (${slackDrawn})`);
  assert.ok(taut>0.97,`at full stretch it is taut (${taut})`);
  assert.ok(passed,'the axe overshoots the hand before settling');
  assert.ok(axe.position.distanceTo(hand)<1e-6);
});

test('the whoosh, crack and catch come at the whip-out, the stop and the return, once each',()=>{
  for(const [state,distance] of [['ATTACK_1',2.4],['ATTACK_3',4.2]]) {
    const boss=new BossIslandDemoness();boss.chooseAttack(null,distance);fxLog.length=0;
    const at={};
    for(let f=0;f<=132;f++) {
      boss.stateMachine.currentState=state;boss.stateMachine.stateTime=f/60;const before=fxLog.length;boss.update(1/60);
      for(const e of fxLog.slice(before)) at[e]??=f/60;
    }
    const cue=boss.motion.cue({});
    assert.ok(Math.abs(at['sound.playAxeWhoosh']-cue.whip)<0.02,`${state} whoosh at the whip-out, not the wind-up`);
    assert.ok(Math.abs(at['camera.axeWhip']-cue.whip)<0.02);
    assert.ok(Math.abs(at['sound.playChainCrack']-cue.stop)<0.02,`${state} crack at the stop`);
    assert.ok(Math.abs(at['sound.playAxeReturn']-cue.home)<0.02,`${state} snap at the catch`);
    assert.equal(fxLog.filter(e=>e==='sound.playAxeWhoosh').length,1);
    assert.ok(boss.axeProbe().shed>20,`${state} sheds embers along the blade`);
  }
});

test('the slam lands on a real floor without cancelling the blow; its impact fires once',async()=>{
  await RAPIER.init();axePhysics.RAPIER_INSTANCE=RAPIER;
  const world=axePhysics.world=new RAPIER.World({x:0,y:0,z:0});
  try {
    world.createCollider(RAPIER.ColliderDesc.cuboid(20,0.5,20),world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,-0.5,0)));world.step();
    const boss=new BossIslandDemoness();boss.closeAttack=true;assert.equal(boss.chooseAttack(null,2.4),'ATTACK_2');
    fxLog.length=0;let lowest=9;
    for(let f=0;f<=132;f++) {
      boss.stateMachine.currentState='ATTACK_2';boss.stateMachine.stateTime=f/60;boss.update(1/60);
      assert.ok(boss.hitWindows().length,`floor never cancels the slam (frame ${f})`);
      lowest=Math.min(lowest,boss.getWeaponPoints().tip.y,boss.getWeaponPoints().hilt.y);
    }
    assert.equal(fxLog.filter(e=>e==='camera.axeSlam').length,1);
    assert.ok(fxLog.includes('sound.playAxeImpact')&&fxLog.includes('clash.sparks')&&fxLog.includes('particles.dust'));
    assert.ok(lowest>-0.12,`the blade bites the floor, not through it (${lowest})`);
  } finally {world.free();axePhysics.world=null;axePhysics.RAPIER_INSTANCE=null;}
});

test('axe and chain are drawn between steps and restored for hit detection; a dead keeper brings it home first',async()=>{
  const boss=new BossIslandDemoness(),axe=boss.group.getObjectByName('TravellingChainAxe');boss.chooseAttack(null,2.4);
  let before;
  for(let f=0;f<=36;f++){boss.stateMachine.currentState='ATTACK_1';boss.stateMachine.stateTime=f/60;before=axe.position.clone();boss.update(1/60);}
  const now=axe.position.clone();assert.ok(now.distanceTo(before)>0.1);
  boss.renderUpdate(0.5);assert.ok(axe.position.distanceTo(before.clone().lerp(now,0.5))<1e-6,'drawn half way between the steps');
  assert.ok(boss.tether.count>0);
  boss.renderRestore();assert.ok(axe.position.distanceTo(now)<1e-9,'the step pose is back for the blade sweep');
  // L5: killed mid-swing, the axe stays out and is hauled home, then put away.
  boss.stateMachine.currentState='DEAD';boss.stateMachine.stateTime=0;boss.update(1/60);
  assert.equal(axe.visible,true);
  for(let f=1;f<40;f++){boss.stateMachine.stateTime=f/60;boss.update(1/60);}
  assert.equal(axe.visible,false);assert.equal(boss.tether.count,0);
  // L3: held beside rock, the axe is never swept (and never pops off the hand).
  await RAPIER.init();axePhysics.RAPIER_INSTANCE=RAPIER;
  const world=axePhysics.world=new RAPIER.World({x:0,y:0,z:0});
  try {
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.2,3,3),world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(1.0,2,0.3)));world.step();
    const idle=new BossIslandDemoness(),held=idle.group.getObjectByName('TravellingChainAxe').position.clone();
    for(let f=0;f<30;f++){idle.stateMachine.currentState='IDLE';idle.stateMachine.stateTime=f/60;idle.update(1/60);}
    assert.ok(idle.group.getObjectByName('TravellingChainAxe').position.distanceTo(held)<1e-9);
  } finally {world.free();axePhysics.world=null;axePhysics.RAPIER_INSTANCE=null;}
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
  group=new THREE.Group();playerSpawn=new THREE.Vector3();physics=physics;ownedTextures=new Set();
  update() {} dispose() {}
}
const { Level5_Island, ISLAND }=await loadDuelModule('src/levels/Level5_Island.ts',{
  three:THREE,'./GLBLevel':{GLBLevel},
  './environment/ToonRelight':{createToonRamp:()=>null,toonifyModel(){}},
  './environment/FireField':{FireField:class{},findModelledFlames(){},spotForFlame(){}},
  '../core/PhysicsWorld':{PhysicsWorld:{getInstance:()=>physics}},
  '../entities/animation/CharacterRig':{CharacterRig:{}},
  '../entities/characters/YodhaWeapons':{WEAPON_SETS:{mace:{definition:{}}}},
  '../cinematics/CinematicDirector':{ease:{}},'../core/Assets':{asset:x=>x},
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
  const staging={moveTo:(actor,p)=>moves.push([actor,p]),face(){},settle(){for(const[a,p]of moves)a.setPosition(p.x,p.y,p.z);}};
  const run=new SceneRun(scene,stage,{},staging);run.settle();
  assert.deepEqual(cues,['open-shrine']);assert.equal(soul.presence,1);assert.equal(soul.group.visible,true);
  assert.equal(soul.position.z,-74.6);
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

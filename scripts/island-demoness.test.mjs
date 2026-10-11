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
  retire() { this.retired=true; } // (Character.retire)
}
const axePhysics={world:null,RAPIER_INSTANCE:null};
const axeMotion=await loadDuelModule('src/combat/ChainAxeMotion.ts',{three:THREE});
// The axe's FX run for real against recording doubles of the engine's singletons (sound, sparks, camera).
const fxLog=[], bloomSelection=new Set(); // (the bloom selection the fight's postFX holds)
const record=(kind)=>new Proxy({}, {get:(_,name)=>(...args)=>{fxLog.push(kind+'.'+String(name));return kind==='sound'?undefined:false;}});
const soundDouble=record('sound'), clashDouble=record('clash'), particleDouble=Object.assign(record('particles'),{scene:null});
const toonRelight=await loadDuelModule('src/levels/environment/ToonRelight.ts',{three:THREE});
const axeFX=await loadDuelModule('src/combat/AxeFX.ts',{
  three:THREE,'./ParticleFX':{ParticleFX:{getInstance:()=>({scene:null,spawnDustPuff:()=>fxLog.push('particles.dust'),spawnEmbers:()=>fxLog.push('particles.embers')})}},
  './ClashFX':{ClashFX:{getInstance:()=>clashDouble}},'./SoundFX':{SoundFX:{getInstance:()=>soundDouble}},
  '../core/SceneManager':{SceneManager:{getInstance:()=>({camera:new THREE.PerspectiveCamera(),impact:{impact:(kind)=>fxLog.push('camera.'+kind)},postFX:{keepBloom(){},addBloom:o=>bloomSelection.add(o),removeBloom:o=>bloomSelection.delete(o)}})}},
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
  const shotStarts = []; let acc = 0; for (const shot of scene.shots) { shotStarts.push(acc); acc += shot.duration; }
  assert.ok(shotStarts.some(t => Math.abs(t - split) < 0.05), 'the camera cuts on to the next move at the instant the doors split');
  assert.ok(voice.at >= split && voice.at <= split + 1.5, 'it calls as the doors part');
  assert.ok(start - voice.at >= 5.5, 'and the reveal is held for the whole of it');
  assert.ok(readFileSync(new URL('../public/assets/voice/island_shrine_voice_2.mp3', import.meta.url)).length > 1000, 'the recording ships');
});

// ---- Review fixes L1, L2, L4, L5, L6 (code review of f17f7e4..121ed13) --------------------------------------------------------------
// Added by the review-fix pass. The first four run the real BossIslandDemoness, AxeFX, AxeBody and ShrineSeal; L6 gives the real
// ShrineSeal a recording document (canvas, fonts) and a manual timer queue, to check the text pass is spread, kept and repeated.

test('L1: a retired demoness takes her embers, her flash and her bloom selection with her', () => {
  const fx = axeFX.AxeFX.get();
  const boss = new BossIslandDemoness(); boss.chooseAttack(null, 4.2);
  for (let f = 0; f <= 40; f++) { boss.stateMachine.currentState = 'ATTACK_3'; boss.stateMachine.stateTime = f / 60; boss.update(1 / 60); }
  assert.ok(bloomSelection.has(boss.trail.mesh) && bloomSelection.has(boss.tether), 'her trail and chain glow while she fights');
  fx.burst(new THREE.Vector3(1, 1, -70), 40, null, 5);
  fx.flash(new THREE.Vector3(1, 1, -70), 1.2, 1.6, 0.13);
  fx.step(1 / 60);
  assert.ok(fx.live > 0 && fx.points.visible && fx.flashMesh.visible, 'embers and a flash are in the air');
  boss.retire();
  assert.equal(boss.retired, true, 'the base class is still told');
  assert.equal(fx.live, 0); assert.equal(fx.points.visible, false); assert.equal(fx.flashMesh.visible, false);
  assert.equal(fx.points.geometry.drawRange.count, 0);
  assert.ok(!bloomSelection.has(boss.trail.mesh) && !bloomSelection.has(boss.tether), 'and nothing of hers is left in the bloom');
  // The pool is for the next demoness as it was: it sheds again.
  fx.step(1 / 60); fx.burst(new THREE.Vector3(0, 1, -70), 10, null, 3); fx.step(1 / 60);
  assert.equal(fx.live, 10); assert.equal(fx.points.visible, true);
  fx.clear();
});

test('L2: a re-armed seal throws the same rocks again, the same way, as a fresh one', () => {
  const inFlight = seal => seal.chunks.filter(c => !c.rest).length;
  const play = (seal, seconds, from = 0) => { for (let f = 0; f < Math.round(seconds * 60); f++) seal.update(1 / 60, from + f / 60); };
  const state = seal => seal.chunks.map(c => [...c.p.toArray(), ...c.v.toArray(), ...c.q.toArray(), ...c.w.toArray(), c.rest, c.bounces]);
  const fresh = new shrineSeal.ShrineSeal({}, new THREE.Texture());
  const start = state(fresh);
  fresh.open(); play(fresh, 2.2);
  const reference = inFlight(fresh), referenceState = state(fresh);
  assert.equal(reference, 28, 'a fresh seal has 28 rocks in flight at 2.2 s');
  const seal = new shrineSeal.ShrineSeal({}, new THREE.Texture());
  seal.open(); play(seal, 10);
  assert.equal(seal.phase, 'open'); assert.equal(inFlight(seal), 0, 'after the first opening every rock lies on the floor');
  seal.rearm();
  assert.deepEqual(state(seal), start, 'rearm puts every rock back where it is thrown from: position, velocity, turn and spin');
  seal.open(); play(seal, 2.2);
  assert.equal(inFlight(seal), reference, 'the replay throws the same 28 at 2.2 s');
  assert.deepEqual(state(seal), referenceState, 'and every rock is where the first opening had it');
  // And a third time.
  play(seal, 8, 2.2); seal.rearm(); seal.open(); play(seal, 2.2);
  assert.equal(inFlight(seal), reference);
  fresh.dispose(); seal.dispose();
});

test('L4: a paused frame shows the chain on the haft: renderRestore draws it as the step left it', () => {
  const boss = new BossIslandDemoness(); boss.chooseAttack(null, 4.2);
  const chain = boss.tether;
  const drawn = () => Float32Array.from(chain.instanceMatrix.array.subarray(0, chain.count * 16));
  let compared = 0, moved = 0;
  for (let f = 0; f <= 80; f++) {
    boss.stateMachine.currentState = 'ATTACK_3'; boss.stateMachine.stateTime = f / 60; boss.update(1 / 60);
    const step = drawn(), count = chain.count;
    boss.renderUpdate(0.1);                       // a rendered frame between two steps...
    const between = drawn();
    boss.renderRestore();                         // ...and the pose put back after it (what a paused frame then draws)
    const restored = drawn();
    if (count > 0) {
      compared++;
      assert.equal(chain.count, count, `frame ${f}: the same links`);
      assert.deepEqual(restored, step, `frame ${f}: the chain is as the step drew it, on the haft`);
      if (between.some((value, i) => Math.abs(value - step[i]) > 1e-4)) moved++;
    }
  }
  assert.ok(compared > 40 && moved > 10, `the interpolated frames did differ from the step's (${moved} of ${compared}), so the restore does something`);
});

test('L5: a keeper killed mid-swing eases her body layers out over 0.3 s instead of dropping them in one frame', () => {
  // A skeleton with the island rig's bones (only the names matter), held still: no mixer rewrites them, as in the cave clips' constant tracks.
  const root = new THREE.Group();
  const bone = (name, parent, x, y, z) => { const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); parent.add(b); return b; };
  const base = bone('Root', root, 0, 0.8, 0), pelvis = bone('Pelvis', base, 0, 0.4, 0.2), spine = bone('Spine', pelvis, 0, 0.3, 0), chest = bone('Chest', spine, 0, 0.35, 0);
  const upper = bone('UpperArm_R', chest, -0.3, 0.15, 0), fore = bone('Forearm_R', upper, 0, -0.3, 0); bone('Hand_R', fore, 0, -0.3, 0);
  bone('Leg_L0_0', base, 0.3, 0, 0.3); bone('Leg_R0_0', base, -0.3, 0, 0.3);
  const boss = new BossIslandDemoness(); boss.group.add(root);
  const socket = new THREE.Object3D(); socket.position.set(0.8, 2.1, 0.3); boss.group.add(socket);
  boss.rig = { root, socket: () => socket };
  boss.group.updateMatrixWorld(true);
  boss.chooseAttack(null, 4.2);
  const rest = chest.quaternion.clone(), p = chest.quaternion;
  // Swing until the layers are well on her body (the wind-up), then she dies.
  for (let f = 0; f < 120; f++) {
    boss.stateMachine.currentState = 'ATTACK_3'; boss.stateMachine.stateTime = f / 60; boss.update(1 / 60);
    if (f > 8 && p.angleTo(rest) > 0.1) break;
  }
  const full = p.angleTo(rest);
  assert.ok(full > 0.1, `the wind-up lays a real layer on her chest (${full.toFixed(3)} rad)`);
  let previous = p.clone(), worstStep = 0, firstStep = 0, atEase = 0;
  for (let k = 1; k <= 30; k++) {
    boss.stateMachine.currentState = 'DEAD'; boss.stateMachine.stateTime = k / 60; boss.update(1 / 60);
    const step = p.angleTo(previous); if (k === 1) firstStep = step; worstStep = Math.max(worstStep, step);
    if (k === 18) atEase = p.angleTo(rest);                // 0.3 s in
    previous = p.clone();
  }
  assert.ok(firstStep < 0.25 * full, `the first frame of death moves her chest ${firstStep.toFixed(3)} of ${full.toFixed(3)} rad, not all of it`);
  assert.ok(worstStep < 0.25 * full, `no frame of the death throws more than a quarter of the layer: ${worstStep.toFixed(3)} of ${full.toFixed(3)}`);
  assert.ok(atEase < 0.06 * full, `by 0.3 s the layers are all but gone (${atEase.toFixed(4)} rad left)`);
  assert.ok(p.angleTo(rest) < 1e-6, 'and then the chest is the clip\'s own');
});

test('L6: the rune text is laid a few milliseconds at a time, once for the page, and again only if its face arrives late', async () => {
  const timers = []; let now = 0;
  const calls = { canvas: 0, text: 0 };
  // Every syllable lays the same square patch, so the finished map differs from the bare strokes.
  const pixels = new Uint8ClampedArray(160 * 160 * 4);
  for (let y = 60; y < 100; y++) for (let x = 60; x < 100; x++) pixels.fill(255, (y * 160 + x) * 4, (y * 160 + x) * 4 + 3), pixels[(y * 160 + x) * 4 + 3] = 200;
  const ctx = { setTransform() {}, clearRect() {}, translate() {}, rotate() {}, strokeText() {}, fillText() { calls.text++; }, getImageData: () => ({ data: pixels }) };
  const world = (faceReady) => {
    let arrive; const loaded = new Promise((resolve) => { arrive = resolve; });
    const document = { createElement: () => { calls.canvas++; return { width: 0, height: 0, getContext: () => ctx }; }, fonts: { check: () => faceReady, load: () => loaded } };
    const globals = { document, performance: { now: () => ++now }, setTimeout: (fn) => timers.push(fn), clearTimeout: (id) => { timers[id - 1] = null; } };
    return { arrive, load: () => loadDuelModule('src/levels/ShrineSeal.ts', { three: THREE }, globals) };
  };
  const drain = () => { let turns = 0; for (let i = 0; i < timers.length; i++) { const fn = timers[i]; timers[i] = null; if (fn) { fn(); turns++; } } timers.length = 0; return turns; };
  const hash = (a) => { let h = 2166136261 >>> 0; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619) >>> 0; } return h; };

  // The face is ready: the constructor lays no text (it is queued), the queue spreads it over turns, a rebuilt seal paints nothing.
  const ready = await world(true).load();
  const a = new ready.ShrineSeal({}, new THREE.Texture());
  assert.equal(calls.text, 0, 'the constructor sets no text'); assert.equal(timers.length, 1, 'it is queued for the next turn');
  const bare = hash(a.runeMap.image.data);
  const turns = drain();
  assert.equal(calls.text, 168, 'two cuts of each of the 84 syllables'); assert.ok(turns >= 10, `spread over ${turns} turns, not one`);
  const finished = hash(a.runeMap.image.data);
  assert.notEqual(finished, bare, 'the text is on the map');
  const canvases = calls.canvas;
  const b = new ready.ShrineSeal({}, new THREE.Texture());
  assert.equal(calls.canvas, canvases, 'a rebuilt seal opens no canvas'); assert.equal(timers.length, 0, 'queues nothing'); assert.equal(calls.text, 168, 'and sets no text');
  assert.equal(hash(b.runeMap.image.data), finished, 'yet has the same finished map');
  a.dispose(); b.dispose();

  // The face is late: the text is set in what there is, then laid again over the same strokes when it arrives, and that is kept.
  const late = world(false), lateModule = await late.load();
  calls.text = 0;
  const d = new lateModule.ShrineSeal({}, new THREE.Texture());
  drain(); assert.equal(calls.text, 168);
  const early = new lateModule.ShrineSeal({}, new THREE.Texture());   // built before the face arrives: sets text of its own
  drain(); assert.equal(calls.text, 336, 'a seal built before the face arrives still sets text of its own');
  late.arrive(); await new Promise((resolve) => setImmediate(resolve));
  assert.ok(timers.length >= 1, 'the face has come: the text is laid again');
  const before = calls.text; drain();
  assert.ok(calls.text - before >= 168, 'in full');
  assert.equal(hash(d.runeMap.image.data), finished, 'laid again over the strokes, it is exactly the map of a seal built with the face ready');
  const canvasesNow = calls.canvas;
  const e = new lateModule.ShrineSeal({}, new THREE.Texture());
  assert.equal(calls.canvas, canvasesNow, 'and kept for the page: the next seal paints nothing'); assert.equal(hash(e.runeMap.image.data), finished);
  d.dispose(); early.dispose(); e.dispose();

  // A seal gone before its turn comes lays nothing.
  const gone = await world(true).load();
  calls.text = 0; const f = new gone.ShrineSeal({}, new THREE.Texture()); f.dispose(); drain();
  assert.equal(calls.text, 0, 'a disposed seal sets no text');
});

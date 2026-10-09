import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { loadDuelModule } from './duel-test-runtime.mjs';

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
  constructor() { this.group=new THREE.Group();this.stateMachine={currentState:'IDLE',stateTime:0}; }
  update() {}
}
const { BossIslandDemoness } = await loadDuelModule('src/entities/BossIslandDemoness.ts', {
  three: THREE, './Boss': { Boss }, './animation/CharacterRig': { CharacterRig: {} },
  '../core/Assets': { asset: x => x }, '../levels/GLBLevel': { disposeObject() {} },
  '../levels/environment/ToonRelight': { createToonRamp() {}, toonifyModel() {} },
});
const { sweepBlade } = await loadDuelModule('src/combat/HitboxManager.ts', { three: THREE, '../entities/Character': { Character: class {} } });
test('each authored attack sweeps a real capsule in range, never one far away; returning throw is a second window', () => {
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
});

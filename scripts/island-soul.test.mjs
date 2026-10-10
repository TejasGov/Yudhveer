import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadDuelModule } from './duel-test-runtime.mjs';

// Run the production grounding, staged motion, state selection and animation mixer against the shipped assets.
// Rendering and materials remain a separate visual check; these tests require no browser or texture decoder.
const physics = {
  world: null, RAPIER_INSTANCE: null, gravityY: -9.81,
  createCharacterController(offset) { return this.world.createCharacterController(offset); },
  removeCharacterController(controller) { this.world.removeCharacterController(controller); },
  setCameraTransparent() {}, syncColliders() { this.world.step(); },
  createStaticTrimesh(vertices, indices) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    return { body, collider: this.world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices), body) };
  },
  createStaticBox(center, halfExtents) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...center.toArray()));
    return { body, collider: this.world.createCollider(RAPIER.ColliderDesc.cuboid(...halfExtents.toArray()), body) };
  },
  createStaticCylinder(center, halfHeight, radius) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...center.toArray()));
    return { body, collider: this.world.createCollider(RAPIER.ColliderDesc.cylinder(halfHeight, radius), body) };
  },
};
const { GLBLevel } = await loadDuelModule('src/levels/GLBLevel.ts', {
  three: THREE, 'three/examples/jsm/loaders/GLTFLoader.js': { GLTFLoader },
  'three/examples/jsm/libs/meshopt_decoder.module.js': { MeshoptDecoder },
  'three/examples/jsm/utils/BufferGeometryUtils.js': { mergeGeometries() {} },
  '../core/PhysicsWorld': { PhysicsWorld: { getInstance: () => physics } },
  '../core/SceneManager': { SceneManager: {} }, './ArenaBounds': { ArenaBounds: class {} },
});
const motors = await loadDuelModule('src/physics/CharacterMotor.ts', {
  three: THREE, '../core/PhysicsWorld': { PhysicsWorld: { getInstance: () => physics } },
});
const relight = {
  addRimLight() {}, createToonRamp: () => new THREE.Texture(),
  toToonMaterial: () => new THREE.MeshToonMaterial(),
};
const rigModule = await loadDuelModule('src/entities/animation/CharacterRig.ts', {
  three: THREE, 'three/examples/jsm/loaders/GLTFLoader.js': { GLTFLoader },
  'three/examples/jsm/libs/meshopt_decoder.module.js': { MeshoptDecoder },
  'three/examples/jsm/utils/SkeletonUtils.js': { clone },
  '../../levels/environment/ToonRelight': relight,
  '../../levels/GLBLevel': { disposeObject() {} }, '../../combat/HitReact': { installHitFlash() {} },
});
const entities = await loadDuelModule('src/entities/Entity.ts', {
  three: THREE, '@dimforge/rapier3d-compat': { default: RAPIER },
  'three/examples/jsm/loaders/GLTFLoader.js': { GLTFLoader },
});
const states = await loadDuelModule('src/entities/CharacterStateMachine.ts');
const characters = await loadDuelModule('src/entities/Character.ts', {
  three: THREE, './Entity': entities, './CharacterStateMachine': states,
  '../combat/SlashRibbon': { SlashRibbon: class { update() {} }, trailActive: () => false, trailLookOf() {} },
  '../combat/HitReact': { HitReact: { step() {} } }, '../combat/BodyFall': { BodyFall: { step() {} } },
  './animation/CharacterRig': rigModule, '../physics/CharacterMotor': motors,
  '../core/PhysicsWorld': { PhysicsWorld: { getInstance: () => physics } },
  './ActorRegistry': { ACTORS: new Map() }, '../levels/GLBLevel': { disposeObject() {} },
});
const { Extra } = await loadDuelModule('src/entities/Extra.ts', {
  three: THREE, './Character': characters, '../physics/CharacterMotor': motors,
  '../levels/environment/ToonRelight': relight,
});
const sceneDependencies = {
  three: THREE, './Intros': { frame() {}, offset() {} }, '../entities/Enemy': { Enemy: class {} },
  '../entities/Extra': { Extra }, './Shade': { haunt() {} }, '../combat/Voices': { Voices: {} },
  '../ui/Dialogue': { readingTime() {}, VOICE_TAIL: 0 },
};
// Staging reads Vite's import.meta.env while it moves; provide that platform value in its module context.
const sceneContext = vm.createContext({ console });
const sceneModule = new vm.SourceTextModule(stripTypeScriptTypes(
  readFileSync(new URL('../src/cinematics/Scene.ts', import.meta.url), 'utf8'), { mode: 'transform' }), {
  context: sceneContext, initializeImportMeta(meta) { meta.env = { DEV: false }; },
});
await sceneModule.link(id => {
  assert.ok(id in sceneDependencies, 'explicit scene dependency ' + id);
  const exports = sceneDependencies[id];
  return new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
  }, { context: sceneContext });
});
await sceneModule.evaluate();
const { Staging } = sceneModule.namespace;
const { ISLAND_SOUL } = await loadDuelModule('src/entities/characters/IslandDemoness.ts', {
  '../../core/Assets': { asset: x => x },
});
const { ISLAND_STORY } = await loadDuelModule('src/game/stories/Island.ts', {
  three: THREE, '../../cinematics/CinematicDirector': { ease: {} }, '../../combat/SoundFX': { SoundFX: {} },
  '../Progression': { KITS: { dwarka: {} } },
  '../../levels/Level5_Island': { ISLAND: { altar: new THREE.Vector3(0, -2.11, -75) } },
  '../IslandExpedition': { ISLAND_FOES: { hall: [], pool: [], poolBehind: [], boss: 'island_demoness' } },
  '../../cinematics/Entrance': { grade() {} }, '../../entities/characters/Village': { GURU: {} },
  '../../entities/characters/IslandDemoness': { ISLAND_SOUL }, '../../entities/Extra': { Extra },
});
const release = ISLAND_STORY.beats.find(beat => beat.on.fallen === 'island_demoness').scene;

test('the soul waits for the opening and has time to walk to both marks before settlement', () => {
  const soul = ISLAND_STORY.cast.find(actor => actor.id === 'island_soul');
  assert.equal(soul.shade.grounded, true);
  let from = soul.at;
  for (const shot of release.shots) {
    const move = shot.cues?.find(cue => 'moveTo' in cue);
    if (!move) continue;
    const settle = shot.cues.find(cue => 'run' in cue && cue.at > move.at);
    const available = (settle?.at ?? shot.duration) - move.at;
    assert.ok(available > Math.hypot(move.moveTo.x - from.x, move.moveTo.z - from.z) / ISLAND_SOUL.locomotion.walkSpeed);
    from = move.moveTo;
    const open = shot.cues.find(cue => 'run' in cue && cue.at < move.at);
    if (open) assert.ok(move.at >= open.at + 1.8, 'wall has fully faded before movement');
  }
});

async function geometry(path) {
  const original = readFileSync(new URL('../public/assets/' + path, import.meta.url));
  const length = original.readUInt32LE(12), data = JSON.parse(original.subarray(20, 20 + length));
  delete data.images; delete data.textures; delete data.materials;
  for (const mesh of data.meshes ?? []) for (const primitive of mesh.primitives) delete primitive.material;
  let json = Buffer.from(JSON.stringify(data));
  json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const tail = original.subarray(20 + length), header = Buffer.from(original.subarray(0, 20));
  header.writeUInt32LE(20 + json.length + tail.length, 8); header.writeUInt32LE(json.length, 12);
  const buffer = Buffer.concat([header, json, tail]);
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '');
}

test('grounded shades keep their feet on the floor; existing shades still hover', async () => {
  await RAPIER.init(); physics.RAPIER_INSTANCE = RAPIER;
  const world = physics.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  let fighter;
  try {
    const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -.1, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(5, .1, 5), floor);
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, .6, 0));
    const capsule = world.createCollider(RAPIER.ColliderDesc.capsule(.25, .25), body);
    fighter = new motors.CharacterMotor(body, capsule, .5);
    world.step();
    const soul = new Extra('soul'); soul.shade = { color: 'white', grounded: true };
    soul.setPosition(0, .1, 0); soul.appear(true, 0); soul.update(1 / 60);
    assert.ok(Math.abs(soul.group.position.y) < 1e-5, 'fighter under the probe cannot raise the soul');
    assert.ok(Math.abs(soul.modelGroup.position.y) < 1e-5, 'no hover or bob at full presence');
    const shade = new Extra('original'); shade.shade = { color: 'white' };
    shade.setPosition(1, .1, 0); shade.appear(true, 0); shade.update(1 / 60);
    assert.equal(shade.group.position.y, .1); assert.ok(shade.modelGroup.position.y > .12);
    // A low overhead ledge is within the probe, but above the allowed floor step.
    const ceiling = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(2, .55, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(.5, .02, .5), ceiling); world.step();
    soul.setPosition(2, 0, 0); soul.update(1 / 60); assert.equal(soul.group.position.y, 0);
    const wall = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(3, .3, 0).setRotation(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 3)));
    world.createCollider(RAPIER.ColliderDesc.cuboid(.5, .03, .5), wall); world.step();
    soul.setPosition(3, 0, 0); soul.update(1 / 60); assert.equal(soul.group.position.y, 0, 'steep surface is rejected');
  } finally { fighter?.dispose(); world.free(); physics.world = null; }
});

test('released soul walks the shipped cave route at normal speed, then rests beside the altar', async () => {
  await RAPIER.init(); physics.RAPIER_INSTANCE = RAPIER;
  const world = physics.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  try {
    const cave = await geometry('levels/island_caves.glb'); cave.scene.updateMatrixWorld(true);
    const level = Object.assign(Object.create(GLBLevel.prototype), { physics, bodies: [] });
    level.buildColliders(cave.scene);
    world.step();
    const model = await geometry('characters/island_soul.glb');
    const manifest = JSON.parse(readFileSync(new URL('../public/assets/characters/island_soul.manifest.json', import.meta.url)));
    const rig = new rigModule.CharacterRig(model, manifest, ISLAND_SOUL);
    const soul = new Extra('island_soul'); soul.shade = { color: 'white', grounded: true };
    soul.rig = rig; soul.modelGroup.add(rig.root); soul.walkSpeed = ISLAND_SOUL.locomotion.walkSpeed; soul.atEase = true;
    const spawn = ISLAND_STORY.cast.find(actor => actor.id === soul.id).at;
    soul.setPosition(...spawn.toArray()); soul.appear(true, 0);
    const staging = new Staging();
    const route = release.shots.flatMap(shot => (shot.cues ?? []).filter(cue => 'moveTo' in cue).map(cue => cue.moveTo));
    let walkingFrames = 0, minRate = Infinity, maxFloorError = 0;
    for (const mark of route) {
      staging.moveTo(soul, mark, 'walk', null);
      const frames = Math.ceil(Math.hypot(mark.x - soul.group.position.x, mark.z - soul.group.position.z) / soul.walkSpeed * 60) + 30;
      for (let frame = 0; frame < frames; frame++) {
        staging.update(1 / 60); soul.update(1 / 60);
        if (rig.clip === 'walk' && frame > 30 && soul.stateMachine.currentState === 'WALK') {
          walkingFrames++; minRate = Math.min(minRate, rig.timeScale);
        }
        const feet = soul.group.position;
        const ray = new RAPIER.Ray({ x: feet.x, y: feet.y + .3, z: feet.z }, { x: 0, y: -1, z: 0 });
        const floor = world.castRay(ray, .6, true);
        assert.ok(floor, 'route has walkable cave floor');
        maxFloorError = Math.max(maxFloorError, Math.abs(.3 - floor.timeOfImpact));
      }
    }
    assert.ok(walkingFrames > 100); assert.ok(minRate > .65, `walk rate remains natural: ${minRate}`);
    assert.ok(maxFloorError < .015, `feet follow cave floor: ${maxFloorError}`);
    assert.ok(soul.group.position.distanceTo(route.at(-1)) < .15);
    assert.equal(rig.clip, 'idle'); assert.ok(Math.abs(soul.modelGroup.position.y) < 1e-5);
    console.log('Soul route:', { walkingFrames, minRate, maxFloorError, feet: soul.group.position.toArray() });
  } finally { world.free(); physics.world = null; }
});

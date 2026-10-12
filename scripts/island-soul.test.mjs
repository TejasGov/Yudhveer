import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
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
const radiantShade = await loadDuelModule('src/entities/RadiantShade.ts', {
  three: THREE, '../levels/environment/ToonRelight': relight,
});
const { Extra } = await loadDuelModule('src/entities/Extra.ts', {
  three: THREE, './Character': characters, '../physics/CharacterMotor': motors,
  '../levels/environment/ToonRelight': relight, './RadiantShade': radiantShade,
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
let cameraRay = () => null;
const { ISLAND_STORY } = await loadDuelModule('src/game/stories/Island.ts', {
  three: THREE, '../../cinematics/CinematicDirector': { ease: {} }, '../../combat/SoundFX': { SoundFX: {} },
  '../Progression': { KITS: { dwarka: {} } },
  '../../levels/Level5_Island': { ISLAND: { altar: new THREE.Vector3(0, -2.11, -75), sealMark: new THREE.Vector3(2.6, -2.45, -71.2), inside: new THREE.Vector3(1.7, -2.11, -74.6) } },
  '../IslandExpedition': { ISLAND_FOES: { hall: [], pool: [], poolBehind: [], boss: 'island_demoness' } },
  '../../cinematics/Entrance': { grade() {} }, '../../entities/characters/Village': { GURU: {} },
  '../../entities/characters/IslandDemoness': { ISLAND_SOUL }, '../../entities/Extra': { Extra },
  '../../cinematics/DivineLight': { soulRelease: () => ({ alive: true, start() {}, end() {} }) },
  '../../cinematics/SceneFX': { SceneFX: { tween() {} } },
  // the cutscene cameras' rock test: no rock unless a test puts the shipped cave behind it (`cameraRay`)
  '../../core/PhysicsWorld': { PhysicsWorld: { getInstance: () => ({ castCameraRay: (...a) => cameraRay(...a) }) } },
});
/** What an essential cue does: opens the seal, or settles her on her mark inside (the others put the picture right). */
const opensSeal = cue => String(cue.run).includes('open-shrine');
const settlesHer = cue => String(cue.run).includes('setPosition');
const release = ISLAND_STORY.beats.find(beat => beat.on.fallen === 'island_demoness').scene;

test('the soul rises clear of the corpse and has time to walk to both marks before the seal and the settlement need her', () => {
  const soul = ISLAND_STORY.cast.find(actor => actor.id === 'island_soul');
  assert.equal(soul.shade.grounded, true);
  assert.equal(soul.shade.graceful, true);
  // The walks run across shots, so the scene is laid out on one clock.
  const stage = { pos: id => id === 'hero' ? new THREE.Vector3(0.3, -2.45, -66.6) : new THREE.Vector3(0, -2.45, -68.5) };
  let shotStart = 0, from = null, walking = null;
  const events = [];
  for (const shot of release.shots) {
    for (const cue of shot.cues ?? []) {
      const at = shotStart + cue.at;
      if ('place' in cue) from = typeof cue.place === 'function' ? cue.place(stage) : cue.place;
      if ('moveTo' in cue) { events.push({ kind: 'walk', at, from, to: cue.moveTo }); from = cue.moveTo; }
      if ('run' in cue) events.push({ kind: cue.essential ? 'essential' : 'run', at, cue });
    }
    shotStart += shot.duration;
  }
  const sceneLength = shotStart;
  // She rises beside the body (4 m across, at the boss's mark), not in it.
  const spawn = events.find(e => e.kind === 'walk').from;
  assert.ok(Math.hypot(spawn.x - 0, spawn.z + 68.5) > 2.4, 'her soul rises off the corpse, not on it');
  assert.ok(Math.hypot(spawn.x - 0, spawn.z + 68.5) < 3.4, 'but only a few metres from it');
  const walks = events.filter(e => e.kind === 'walk');
  assert.equal(walks.length, 2);
  const essentials = events.filter(e => e.kind === 'essential');
  const ignite = events.find(e => e.kind === 'essential' && opensSeal(e.cue)).at;
  const settle = events.find(e => e.kind === 'essential' && settlesHer(e.cue)).at;
  // 0.8 s of ease and turn in a walk, on top of its distance at her speed (the soul's staging eases in and out).
  const duration = w => Math.hypot(w.to.x - w.from.x, w.to.z - w.from.z) / ISLAND_SOUL.locomotion.walkSpeed + 0.8;
  // The seal's own cue (the first essential one) waits for her to arrive at the first mark, with a half second to spare.
  assert.ok(walks[0].at + duration(walks[0]) + 0.5 <= ignite, 'she is at the seal before its runes ignite');
  // She does not start for the room until the doors have begun to part, and is there a second before the settlement snaps her.
  assert.ok(walks[1].at >= ignite + 1.4, 'she waits for the doors to split');
  assert.ok(walks[1].at + duration(walks[1]) + 1 <= settle, 'a second of slack before the settlement');
  assert.equal(essentials.at(-1).at, settle, 'the settlement is the last thing the scene does to her');
  assert.ok(sceneLength <= 24.5 + 0.5, `the scene stays near its 24.5 s: ${sceneLength}`);
});

/** Stages `actor` to `to` and records, per step, its speed (m/s), its heading error (rad) and its state. */
function stagedRun(actor, to, seconds = 8) {
  const staging = new Staging();
  staging.moveTo(actor, to, 'walk', null);
  const steps = [];
  for (let frame = 0; frame < seconds * 60; frame++) {
    const was = actor.group.position.clone();
    staging.update(1 / 60); actor.update(1 / 60);
    const now = actor.group.position;
    const speed = Math.hypot(now.x - was.x, now.z - was.z) * 60;
    const travel = Math.atan2(now.x - was.x, now.z - was.z);
    const error = speed > 0.01 ? Math.abs(Math.atan2(Math.sin(travel - actor.group.rotation.y), Math.cos(travel - actor.group.rotation.y))) : 0;
    steps.push({ t: (frame + 1) / 60, speed, error, state: actor.stateMachine.currentState, commanded: actor.commandedSpeed });
  }
  return steps;
}

test('a graceful walker turns before it sets off, eases in, brakes onto its mark; others walk as before', () => {
  const pace = ISLAND_SOUL.locomotion.walkSpeed;
  const grace = new Extra('grace'); grace.shade = { color: 'white', graceful: true }; grace.graceful = true; grace.walkSpeed = pace;
  grace.setPosition(0, 0, 0); grace.faceYaw(0);
  // the mark is directly behind her: a half turn before any step
  const run = stagedRun(grace, new THREE.Vector3(0, 0, -4));
  const first = run.find(step => step.speed > 0.02);
  assert.ok(first.t > 0.5, `she turns first (half a turn takes a moment): ${first.t}`);
  assert.ok(first.speed < 0.25, `no full speed on the first step: ${first.speed}`);
  assert.ok(THREE.MathUtils.radToDeg(Math.max(...run.map(step => step.error))) < 30, 'heading within 30 degrees whenever she moves');
  const full = run.find(step => step.speed > pace * 0.97);
  assert.ok(full.t - first.t > 0.3, `speed builds over a third of a second at least: ${(full.t - first.t).toFixed(2)}`);
  const stop = run.findIndex((step, i) => i > 60 && step.state === 'IDLE' && run[i - 1].state === 'WALK');
  assert.ok(stop > 0, 'she arrives and stands');
  // (the last step onto the mark, a centimetre at under a third of a metre a second, is not an acceleration of the walk)
  const accel = run.slice(1, stop - 1).map((step, i) => Math.abs(step.speed - run[i].speed) * 60);
  assert.ok(Math.max(...accel) < pace / 0.35 * 1.1, `acceleration is bounded: ${Math.max(...accel)}`);
  const braking = run.slice(0, stop).filter(step => step.speed > 0.02 && step.speed < pace * 0.97 && step.t > full.t);
  assert.ok(braking.length / 60 > 0.3, `she brakes over about 0.4 s: ${(braking.length / 60).toFixed(2)}`);
  assert.ok(run[stop - 1].speed < 0.35, `no stop from full speed: ${run[stop - 1].speed}`);
  assert.ok(grace.group.position.distanceTo(new THREE.Vector3(0, 0, -4)) < 0.015, 'on her mark');
  assert.equal(grace.commandedSpeed, 0);
  // an ordinary actor still sets off at full speed on the first step, as before
  const plain = new Extra('plain'); plain.shade = { color: 'white' }; plain.walkSpeed = pace;
  plain.setPosition(0, 0, 0); plain.faceYaw(Math.PI);
  const old = stagedRun(plain, new THREE.Vector3(0, 0, -4), 3).find(step => step.speed > 0.02);
  assert.ok(Math.abs(old.speed - pace) < 0.02, `unchanged staging for everyone else: ${old.speed}`);
  console.log('Graceful start:', { arrivesAt: run[stop].t, setsOffAt: first.t, easeIn: full.t - first.t, brake: braking.length / 60, maxHeadingDeg: THREE.MathUtils.radToDeg(Math.max(...run.map(step => step.error))) });
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

test('the shipped walk: gentle gait, true speed, soles on the floor, no skirt edge stretched over 8 cm', async () => {
  const model = await geometry('characters/island_soul.glb');
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/characters/island_soul.manifest.json', import.meta.url)));
  const walk = manifest.clips.walk;
  // measured speed, set as her locomotion speed: steady playback 1.0 +- 0.05
  assert.ok(Math.abs(ISLAND_SOUL.locomotion.walkSpeed / walk.speed - 1) < 0.05, `staged at ${ISLAND_SOUL.locomotion.walkSpeed}, authored ${walk.speed}`);
  const stepsPerMinute = 120 / walk.duration;
  assert.ok(stepsPerMinute > 104 && stepsPerMinute < 116, `a calm cadence: ${stepsPerMinute}`);
  assert.ok(walk.speed * walk.duration / 2 < 0.72, `a short, graceful step: ${walk.speed * walk.duration / 2} m`);
  let mesh;
  model.scene.traverse(o => { if (o.isSkinnedMesh) mesh = o; });
  model.scene.updateMatrixWorld(true);
  const position = mesh.geometry.attributes.position, index = mesh.geometry.index;
  const rest = Array.from({ length: position.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(position, i));
  // (glTF is y-up) edges, and the same edges across UV seams (welded vertices), so that a seam cannot open
  const weld = new Map(), id = rest.map(p => {
    const key = `${Math.round(p.x * 1e5)},${Math.round(p.y * 1e5)},${Math.round(p.z * 1e5)}`;
    if (!weld.has(key)) weld.set(key, weld.size);
    return weld.get(key);
  });
  const edges = new Map();
  for (let t = 0; t < index.count; t += 3) for (let k = 0; k < 3; k++) {
    const a = id[index.getX(t + k)], b = id[index.getX(t + (k + 1) % 3)];
    if (a !== b) edges.set(a < b ? `${a}:${b}` : `${b}:${a}`, [index.getX(t + k), index.getX(t + (k + 1) % 3)]);
  }
  const pairs = [...edges.values()].filter(([a, b]) => { const y = (rest[a].y + rest[b].y) / 2; return y > 0.12 && y < 1.02; });
  const clip = model.animations.find(c => c.name === 'walk');
  assert.ok(clip, 'the walk clip is exported');
  const mixer = new THREE.AnimationMixer(model.scene);
  mixer.clipAction(clip).play();
  const posed = rest.map(() => new THREE.Vector3()), lowest = [];
  let worst = 0, over = 0;
  const change = new Float32Array(pairs.length);
  const samples = 40;
  for (let s = 0; s < samples; s++) {
    mixer.setTime(clip.duration * s / samples);
    model.scene.updateMatrixWorld(true); mesh.skeleton.update();
    let low = Infinity;
    for (let i = 0; i < position.count; i++) { mesh.getVertexPosition(i, posed[i]); low = Math.min(low, posed[i].y); }
    lowest.push(low);
    pairs.forEach(([a, b], e) => { change[e] = Math.max(change[e], Math.abs(posed[a].distanceTo(posed[b]) - rest[a].distanceTo(rest[b]))); });
  }
  for (const c of change) { worst = Math.max(worst, c); if (c > 0.08) over++; }
  assert.equal(over, 0, `no skirt or leg edge changes length by more than 8 cm over the walk (worst ${(worst * 100).toFixed(1)} cm)`);
  lowest.sort((p, q) => p - q);
  assert.ok(lowest[0] > -0.015, `no sole sinks into the floor: ${lowest[0]}`);
  assert.ok(lowest[Math.floor(samples / 3)] < 0.015, `a foot is down for most of the walk: ${lowest[Math.floor(samples / 3)]}`);
  console.log('Soul walk:', { stepsPerMinute, stepM: walk.speed * walk.duration / 2, worstEdgeCm: worst * 100, lowestCm: lowest[0] * 100, medianLowestCm: lowest[samples >> 1] * 100 });
});

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
    const soul = new Extra('island_soul'); soul.shade = { color: 'white', grounded: true, graceful: true };
    soul.rig = rig; soul.modelGroup.add(rig.root); soul.walkSpeed = ISLAND_SOUL.locomotion.walkSpeed; soul.atEase = true;
    soul.makeGraceful(rig);
    const spawn = ISLAND_STORY.cast.find(actor => actor.id === soul.id).at;
    soul.setPosition(...spawn.toArray()); soul.appear(true, 0);
    const staging = new Staging();
    const route = release.shots.flatMap(shot => (shot.cues ?? []).filter(cue => 'moveTo' in cue).map(cue => cue.moveTo));
    let walkingFrames = 0, maxFloorError = 0, sunk = 0, popped = 0, travelled = 0;
    const rates = [], headingErrors = [];
    let lastY = soul.group.position.y;
    for (const mark of route) {
      staging.moveTo(soul, mark, 'walk', null);
      const frames = Math.ceil(Math.hypot(mark.x - soul.group.position.x, mark.z - soul.group.position.z) / soul.walkSpeed * 60) + 150;
      for (let frame = 0; frame < frames; frame++) {
        const was = soul.group.position.clone();
        staging.update(1 / 60); soul.update(1 / 60);
        const feet = soul.group.position;
        const step = Math.hypot(feet.x - was.x, feet.z - was.z);
        if (step > 1e-4 && rig.clip === 'walk' && soul.stateMachine.currentState === 'WALK') {
          walkingFrames++; rates.push(rig.timeScale); travelled += step;
          // she never walks any way but the way she faces
          const travel = Math.atan2(feet.x - was.x, feet.z - was.z);
          headingErrors.push(Math.abs(Math.atan2(Math.sin(travel - soul.group.rotation.y), Math.cos(travel - soul.group.rotation.y))));
        }
        const ray = new RAPIER.Ray({ x: feet.x, y: feet.y + .3, z: feet.z }, { x: 0, y: -1, z: 0 });
        const floor = world.castRay(ray, 1.4, true);
        assert.ok(floor, 'route has walkable cave floor');
        const gap = feet.y - (feet.y + .3 - floor.timeOfImpact);
        sunk = Math.max(sunk, -gap);
        maxFloorError = Math.max(maxFloorError, Math.abs(gap));
        popped = Math.max(popped, Math.abs(feet.y - lastY)); lastY = feet.y;
        if (soul.stateMachine.currentState === 'IDLE' && frame > 90) assert.ok(Math.abs(gap) < .015, 'at rest her feet are on the floor');
      }
    }
    const steady = rates.slice(30).sort((p, q) => p - q);
    const median = steady[Math.floor(steady.length / 2)];
    assert.ok(walkingFrames > 100);
    assert.ok(Math.abs(median - 1) < .05, `steady playback is 1.0 +- 0.05: ${median}`);
    assert.ok(Math.min(...rates) > .29, `the rate never collapses: ${Math.min(...rates)}`);
    assert.ok(Math.max(...headingErrors) < THREE.MathUtils.degToRad(30), 'she only moves when facing within 30 degrees of where she goes');
    assert.ok(sunk < .015, `feet never sink into the floor: ${sunk}`);
    assert.ok(popped < .06, `no pop up to the dais: ${popped}`);
    assert.ok(soul.group.position.distanceTo(route.at(-1)) < .03, 'on the mark without a snap');
    assert.equal(rig.clip, 'idle'); assert.ok(Math.abs(soul.modelGroup.position.y) < 1e-5);
    console.log('Soul route:', { walkingFrames, median, minRate: Math.min(...rates), maxHeadingDeg: THREE.MathUtils.radToDeg(Math.max(...headingErrors)), sunk, popped, travelled, feet: soul.group.position.toArray() });
  } finally { world.free(); physics.world = null; }
});

// ---- L3 (code review of f17f7e4..121ed13): the soul rises in the chamber wherever the corpse lies, and reaches her marks -------
// The keeper has no leash, so her corpse can lie anywhere she chased the hero. This runs the real release scene's cue list on one
// clock through the real Staging and Extra (grounded on the shipped cave's floor in real Rapier), for corpses all over the chamber
// and down the corridor, and for heroes behind her (a 180 degree turn before she can set off), in her way, and beside the seal.
test('the soul rises clear of the body in the chamber and is on her marks in time, whatever the corpse position and the hero', async () => {
  await RAPIER.init(); physics.RAPIER_INSTANCE = RAPIER;
  const world = physics.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  try {
    const cave = await geometry('levels/island_caves.glb'); cave.scene.updateMatrixWorld(true);
    const level = Object.assign(Object.create(GLBLevel.prototype), { physics, bodies: [] });
    level.buildColliders(cave.scene);
    world.step();
    const [sealMark, inside] = release.shots.flatMap(shot => (shot.cues ?? []).filter(cue => 'moveTo' in cue).map(cue => cue.moveTo));
    const floorUnder = p => { const hit = world.castRay(new RAPIER.Ray({ x: p.x, y: p.y + .5, z: p.z }, { x: 0, y: -1, z: 0 }), 1.5, true); return hit ? p.y + .5 - hit.timeOfImpact : null; };
    const timeline = []; let start = 0;
    release.shots.forEach(shot => { for (const cue of shot.cues ?? []) timeline.push({ t: start + cue.at, cue }); start += shot.duration; });
    timeline.sort((p, q) => p.t - q.t);
    const sceneLength = start;
    const at = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

    function play(corpse, hero) {
      const soul = new Extra('island_soul'); soul.shade = { color: 'white', grounded: true, graceful: true }; soul.graceful = true;
      soul.walkSpeed = soul.moveSpeed = ISLAND_SOUL.locomotion.walkSpeed;
      soul.setPosition(0, -2.45, -68.5); soul.appear(true, 0);
      const stage = { pos: id => (id === 'hero' ? hero : corpse).clone(), actor: () => soul, level: { cue() {} } };
      const point = m => typeof m === 'function' ? m(stage) : m === 'hero' ? hero : m;
      const staging = new Staging();
      const out = { walks: [], essentials: [] };
      let next = 0;
      for (let frame = 0; frame < Math.ceil((sceneLength + .5) * 60); frame++) {
        const t = frame / 60;
        while (next < timeline.length && timeline[next].t <= t + 1e-9) {
          const { cue } = timeline[next++];
          if ('place' in cue) { staging.place(soul, point(cue.place), cue.face !== undefined ? point(cue.face) : null); soul.update(1 / 60); out.spawn = soul.group.position.clone(); out.yaw = soul.group.rotation.y; }
          else if ('moveTo' in cue) { staging.moveTo(soul, point(cue.moveTo), 'walk', cue.face !== undefined ? point(cue.face) : null); out.walks.push({ t, to: point(cue.moveTo) }); }
          else if ('run' in cue && cue.essential) {
            // one essential cue opens the seal (the runes ignite); one settles her on her mark inside
            if (opensSeal(cue)) out.ignites = t;
            else if (settlesHer(cue)) { out.pop = soul.group.position.distanceTo(inside); out.settleAt = t; cue.run(stage); }
          }
        }
        staging.update(1 / 60); soul.update(1 / 60);
        if (out.walks.length === 1 && out.leg1 === undefined && at(soul.group.position, sealMark) < .02) out.leg1 = t - out.walks[0].t;
        if (out.walks.length === 2 && out.leg2 === undefined && soul.group.position.distanceTo(inside) < .03) out.leg2 = t - out.walks[1].t;
      }
      return out;
    }

    const failures = [], summary = { runs: 0, worstLeg1: 0, worstLeg2: 0, worstPop: 0, farthestFromSeal: 0, closestCamera: Infinity };
    cameraRay = (o, d, max) => world.castRay(new RAPIER.Ray(o, d), max, true)?.timeOfImpact ?? null;
    /** Where everyone is for the cameras: her on her spawn, turned as she forms; heads 1.6 m up. */
    const cameraStage = (corpse, hero, spawn, yaw) => {
      const where = id => (id === 'island_soul' ? spawn : id === 'hero' ? hero : corpse).clone();
      return {
        pos: where,
        at: (id, f, side, up) => where(id).add(new THREE.Vector3(Math.sin(yaw) * f + Math.cos(yaw) * side, up, Math.cos(yaw) * f - Math.sin(yaw) * side)),
        head: id => where(id).add(new THREE.Vector3(0, 1.62, 0)), height: () => 1.8,
        actor: () => ({ group: { rotation: { y: yaw } } }),
      };
    };
    const chamber = [];
    for (const x of [-6, -4, -2, 0, 1.5, 3, 4.5, 6]) for (const z of [-71, -69.5, -68.5, -67, -65.5]) chamber.push([x, z]);
    const corridor = [[0, -64], [3, -62], [3, -58], [-3, -60]];
    for (const [cx, cz] of [...chamber, ...corridor]) {
      const corpse = new THREE.Vector3(cx, -2.45, cz);
      const heroes = {
        'behind her': null, 'in her way': null, 'beside the seal': new THREE.Vector3(1.2, -2.45, -70.0),
      };
      // The heroes that depend on where she rises are placed from her real spawn (found with the hero well out of the way).
      const probe = play(corpse, new THREE.Vector3(-30, -2.45, -50));
      heroes['behind her'] = new THREE.Vector3(probe.spawn.x, -2.45, probe.spawn.z + 3);
      heroes['in her way'] = new THREE.Vector3(probe.spawn.x + .3, -2.45, probe.spawn.z - .4);
      for (const [name, hero] of Object.entries({ 'far away': new THREE.Vector3(-30, -2.45, -50), ...heroes })) {
        const label = `corpse (${cx}, ${cz}), hero ${name}`;
        const r = play(corpse, hero);
        summary.runs++;
        const fail = why => failures.push(`${label}: ${why}`);
        // She rises in the chamber, on solid floor, never in the body or in the hero's arms.
        const s = r.spawn;
        if (!(s.x >= -5 && s.x <= 6 && s.z >= -71.5 && s.z <= -66.4)) fail(`rises outside the chamber at (${s.x.toFixed(2)}, ${s.z.toFixed(2)})`);
        const floor = floorUnder(s);
        if (floor === null || Math.abs(floor - s.y) > .65) fail(`no floor under her spawn (${floor})`);
        if (at(s, corpse) < 2.4) fail(`rises ${at(s, corpse).toFixed(2)} m from the corpse's middle, in the body`);
        if (at(s, hero) < 1.4) fail(`rises ${at(s, hero).toFixed(2)} m from the hero`);
        summary.farthestFromSeal = Math.max(summary.farthestFromSeal, at(s, sealMark));
        // On the seal's mark before the runes ignite, and on the mark inside well before the settlement.
        const ignite = r.ignites - r.walks[0].t;
        if (r.leg1 === undefined) fail('never reaches the seal mark'); else {
          summary.worstLeg1 = Math.max(summary.worstLeg1, r.leg1);
          if (r.leg1 > ignite) fail(`reaches the seal mark ${r.leg1.toFixed(2)} s after setting off, after the runes ignite (${ignite.toFixed(2)} s)`);
        }
        if (r.leg2 === undefined) fail('never reaches the mark inside'); else {
          summary.worstLeg2 = Math.max(summary.worstLeg2, r.leg2);
          if (r.walks[1].t + r.leg2 + .5 > r.settleAt) fail(`only on the mark inside ${(r.settleAt - r.walks[1].t - r.leg2).toFixed(2)} s before the settlement`);
        }
        // Her entry's cameras (the light gathering, her forming, over his shoulder) see their subject through no rock.
        const stage = cameraStage(corpse, hero, r.spawn, r.yaw);
        release.shots.slice(1, 5).forEach((shot, n) => {
          const from = n === 2 ? stage.head('hero') : r.spawn.clone().add(new THREE.Vector3(0, 1.1, 0));
          for (const key of shot.camera(stage)) {
            const to = key.pos.clone().sub(from), dist = to.length();
            const hit = world.castRay(new RAPIER.Ray(from, to.divideScalar(dist)), dist, true);
            if (hit) fail(`shot ${n + 1}'s camera at (${key.pos.toArray().map(x => x.toFixed(2))}) is behind rock`);
            summary.closestCamera = Math.min(summary.closestCamera, dist);
          }
        });
        // The essential settlement is no teleport.
        summary.worstPop = Math.max(summary.worstPop, r.pop);
        if (r.pop > .1) fail(`the settlement pops her ${r.pop.toFixed(2)} m`);
      }
    }
    cameraRay = () => null;
    console.log('Soul spawn sweep:', summary);
    assert.deepEqual(failures, [], failures.slice(0, 12).join('\n'));
    assert.ok(sceneLength <= 24.5 + 0.5, `the scene stays near its 24.5 s: ${sceneLength}`);
  } finally { world.free(); physics.world = null; }
});

test('her head bows forward the way she faces (chest a little, head most), and lifts back with nothing left over', async () => {
  const model = await geometry('characters/island_soul.glb');
  const manifest = JSON.parse(readFileSync(new URL('../public/assets/characters/island_soul.manifest.json', import.meta.url)));
  const rig = new rigModule.CharacterRig(model, manifest, ISLAND_SOUL);
  const soul = new Extra('island_soul');
  soul.rig = rig; soul.modelGroup.add(rig.root);
  const yaw = 2.1;
  soul.group.rotation.y = yaw;
  for (let i = 0; i < 5; i++) soul.update(1 / 60);
  // the crown (the head bone's own origin is at the top of the neck)
  const head = rig.root.getObjectByName('head_end');
  const at = () => { soul.group.updateMatrixWorld(true); return head.getWorldPosition(new THREE.Vector3()); };
  // the same instant of the clip each time (a zero step re-poses it)
  soul.update(0); const upright = at();
  soul.bow = 1; soul.update(0); const bowed = at();
  soul.update(0); const again = at();
  soul.bow = 0; soul.update(0); const lifted = at();
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const moved = bowed.clone().sub(upright);
  assert.ok(moved.dot(forward) > 0.05, `the head goes forward: ${moved.dot(forward).toFixed(3)} m`);
  assert.ok(moved.y < -0.01, `and down: ${moved.y.toFixed(3)} m`);
  assert.ok(Math.abs(moved.clone().sub(forward.clone().multiplyScalar(moved.dot(forward))).setY(0).length()) < 0.02, 'not to the side');
  assert.ok(again.distanceTo(bowed) < 1e-6, 'held, it does not build up step by step');
  assert.ok(lifted.distanceTo(upright) < 1e-6, 'lifted, the clip has her as it would');
});

// ---- The apsara (2026-10-12): her voiced lines, timed to their recordings, and her 8 s piece handing over to the island's music --
/** A recording's length (s), by ffprobe; null where ffprobe is not installed. */
function recordingSeconds(id) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
    fileURLToPath(new URL(`../public/assets/voice/${id}.mp3`, import.meta.url))], { encoding: 'utf8' });
  return r.status === 0 ? Number(r.stdout.trim()) : null;
}

test('her voiced lines each end inside their shot (or the shots they are carried over) and never run into the next', t => {
  if (recordingSeconds('island_soul_1') === null) return t.skip('no ffprobe');
  const TAIL = 0.45; // Dialogue.ts VOICE_TAIL: a voiced line stays this long after its recording
  const reveal = ISLAND_STORY.beats.find(b => b.scene?.id === 'island-demoness-reveal').scene;
  for (const scene of [reveal, release]) {
    let shotStart = 0, lastEnd = 0, carriedUntil = 0;
    const length = scene.shots.reduce((sum, shot) => sum + shot.duration, 0);
    scene.shots.forEach((shot, i) => {
      if (shot.lines?.length) {
        assert.ok(shotStart >= carriedUntil - 1e-6, `${scene.id} shot ${i}: its lines would cut off the ones carried into it`);
        let at = shotStart + (shot.linesAt ?? 0.4);
        for (const line of shot.lines) {
          assert.ok(line.voice && !line.hold, `${scene.id} shot ${i}: "${line.text}" is voiced and lasts as long as its recording`);
          assert.ok(at >= lastEnd - 1e-6, `${scene.id}: "${line.text}" starts before the line before it is done`);
          const end = at + recordingSeconds(line.voice) + TAIL;
          if (shot.carryLines) carriedUntil = end;
          else assert.ok(end <= shotStart + shot.duration + 0.02, `${scene.id} shot ${i}: "${line.text}" runs ${(end - shotStart - shot.duration).toFixed(2)} s past its shot`);
          assert.ok(end <= length + 1e-6, `${scene.id}: "${line.text}" is still being said when the scene ends`);
          lastEnd = at = end;
        }
      }
      shotStart += shot.duration;
    });
  }
  // Her six lines, in her voice: the old man's shrine voice is gone from the chapter.
  const voices = storyLines(ISLAND_STORY).filter(l => l.voice?.startsWith('island_soul_'));
  assert.deepEqual(voices.map(l => l.voice).sort(), [0, 1, 2, 3, 4, 5].map(n => `island_soul_${n}`));
  assert.deepEqual([...new Set(voices.filter(l => l.voice !== 'island_soul_0').map(l => l.speaker))], ['The apsara']);
  assert.ok(!storyLines(ISLAND_STORY).some(l => /island_(shrine|end)_voice/.test(l.voice ?? '') || /Voice in the shrine|Released soul/.test(l.speaker ?? '')));
});

/** Every line the story says (its scenes' and its beats'). */
function storyLines(story) {
  const scenes = [story.opening, story.ending, ...story.beats.map(b => b.scene)].filter(Boolean);
  return [...scenes.flatMap(s => s.shots.flatMap(shot => shot.lines ?? [])), ...story.beats.flatMap(b => b.lines ?? [])];
}

test('the apsara piece plays once over the boss music (let go quickly), then hands over to the island loop; a skip crossfades', async () => {
  const fetched = [];
  const { SoundFX } = await loadDuelModule('src/combat/SoundFX.ts', {
    '../core/Settings': { Settings: { onChange() {} } }, 'virtual:sfx-samples': { default: [] },
    'virtual:music-tracks': { default: ['boss', 'island', 'apsara'] }, '../core/Assets': { asset: x => x },
  }, {
    fetch: async url => { fetched.push(url); return { ok: true, arrayBuffer: async () => url }; },
  });
  const param = () => ({ value: 1, ramps: [], setValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {},
    linearRampToValueAtTime(v, at) { this.ramps.push([v, at]); } });
  const sources = [];
  const ctx = {
    currentTime: 10, state: 'running',
    createGain: () => ({ gain: param(), connect() {} }),
    createBufferSource: () => { const s = { connect() {}, start() {}, stop(at) { s.stopped = at; }, onended: null }; sources.push(s); return s; },
    decodeAudioData: async url => ({ url, sampleRate: 1000, length: 8000, numberOfChannels: 0, duration: 8 }),
  };
  const settle = () => new Promise(r => setTimeout(r, 0));
  const music = SoundFX.getInstance().music;
  music.connect(ctx, { connect() {} });
  music.play('boss'); await settle(); await settle();
  const boss = sources.at(-1);
  // Her death: the piece was fetched ahead (at the reveal); the boss music goes in 0.7 s, not the usual 1.5.
  music.prefetch('apsara'); await settle(); await settle();
  music.play('apsara', { fadeIn: 0.05, fadeOut: 0.7 });
  music.then('island');
  const piece = sources.at(-1);
  assert.equal(piece.buffer.url, 'music/apsara.mp3');
  assert.equal(piece.loop, false, 'it plays once');
  assert.ok(Math.abs(boss.stopped - (10 + 0.7 + 0.05)) < 1e-9, `the boss music is let go over 0.7 s: ${boss.stopped}`);
  assert.equal(music.track, 'apsara');
  // Played out: the island's loop comes in.
  piece.onended(); await settle(); await settle();
  assert.equal(music.track, 'island');
  assert.equal(sources.at(-1).buffer.url, 'music/island.mp3');
  assert.equal(sources.at(-1).loop, true);

  // Asked for before it has loaded (no reveal to fetch it ahead): `then` still waits for it, not cutting it off unheard.
  const late = (await loadDuelModule('src/combat/SoundFX.ts', {
    '../core/Settings': { Settings: { onChange() {} } }, 'virtual:sfx-samples': { default: [] },
    'virtual:music-tracks': { default: ['boss', 'island', 'apsara'] }, '../core/Assets': { asset: x => x },
  }, { fetch: async url => ({ ok: true, arrayBuffer: async () => url }) })).SoundFX.getInstance().music;
  late.connect(ctx, { connect() {} });
  late.play('boss'); await settle(); await settle();
  late.play('apsara'); late.then('island');
  assert.equal(late.track, 'apsara', 'still waiting for the piece');
  await settle(); await settle();
  assert.equal(sources.at(-1).buffer.url, 'music/apsara.mp3', 'and it plays once loaded');
  // The scene skipped while it plays: the fight's own music crossfades in at once.
  late.play('island');
  assert.equal(late.track, 'island');
});

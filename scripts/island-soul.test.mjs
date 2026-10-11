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
const { ISLAND_STORY } = await loadDuelModule('src/game/stories/Island.ts', {
  three: THREE, '../../cinematics/CinematicDirector': { ease: {} }, '../../combat/SoundFX': { SoundFX: {} },
  '../Progression': { KITS: { dwarka: {} } },
  '../../levels/Level5_Island': { ISLAND: { altar: new THREE.Vector3(0, -2.11, -75), sealMark: new THREE.Vector3(2.6, -2.45, -71.2), inside: new THREE.Vector3(1.7, -2.11, -74.6) } },
  '../IslandExpedition': { ISLAND_FOES: { hall: [], pool: [], poolBehind: [], boss: 'island_demoness' } },
  '../../cinematics/Entrance': { grade() {} }, '../../entities/characters/Village': { GURU: {} },
  '../../entities/characters/IslandDemoness': { ISLAND_SOUL }, '../../entities/Extra': { Extra },
});
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
      if ('run' in cue) events.push({ kind: cue.essential ? 'essential' : 'run', at });
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
  // 0.8 s of ease and turn in a walk, on top of its distance at her speed (the soul's staging eases in and out).
  const duration = w => Math.hypot(w.to.x - w.from.x, w.to.z - w.from.z) / ISLAND_SOUL.locomotion.walkSpeed + 0.8;
  // The seal's own cue (the first essential one) waits for her to arrive at the first mark, with a half second to spare.
  assert.ok(walks[0].at + duration(walks[0]) + 0.5 <= essentials[0].at, 'she is at the seal before its runes ignite');
  // She does not start for the room until the doors have begun to part, and is there a second before the settlement snaps her.
  assert.ok(walks[1].at >= essentials[0].at + 1.4, 'she waits for the doors to split');
  assert.ok(walks[1].at + duration(walks[1]) + 1 <= essentials.at(-1).at, 'a second of slack before the settlement');
  assert.ok(sceneLength <= 16.3 + 3, `the scene grew by under 3 s: ${sceneLength}`);
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

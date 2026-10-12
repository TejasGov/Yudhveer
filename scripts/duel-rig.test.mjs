import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadDuelModule } from './duel-test-runtime.mjs';
import { DUEL_ATTACKS, DUEL_ROUND_KITS, duelLoadoutId } from '../src/duel/Rules.ts';

/**
 * Measures the shipped duel skeletons with the production animation sampler, without a browser or renderer.
 * Materials/textures are omitted from an in-memory GLB copy; mesh transforms and animation data stay intact.
 * These two weapons use an unrotated hand socket, so a socket-local blade tip reproduces the runtime measurement.
 * This catches wire bounds drifting from clips/crops/rates; it does not test Rapier contacts or parry feel.
 */
const { CharacterRig } = await loadDuelModule('src/entities/animation/CharacterRig.ts', {
  three: THREE, 'three/examples/jsm/loaders/GLTFLoader.js': { GLTFLoader },
  'three/examples/jsm/libs/meshopt_decoder.module.js': { MeshoptDecoder },
  'three/examples/jsm/utils/SkeletonUtils.js': { clone },
  '../../levels/environment/ToonRelight': { addRimLight() {}, createToonRamp() {}, toToonMaterial() {} },
  '../../levels/GLBLevel': { disposeObject() {} }, '../../combat/HitReact': { installHitFlash() {} },
});
const yodha = await loadDuelModule('src/entities/characters/Yodha.ts', { '../../core/Assets': { asset: x => x } });
const { dressed, WEAPON_SETS } = await loadDuelModule('src/entities/characters/YodhaWeapons.ts', {
  three: THREE, './Yodha': yodha, '../../core/Assets': { asset: x => x },
  './Scabbard': { buildScabbard() {}, KHANDA_SCABBARD: {}, SWORD_SCABBARD: {} },
});

async function skeleton(path) {
  const original = readFileSync(new URL('../public/assets/' + path, import.meta.url));
  const length = original.readUInt32LE(12), data = JSON.parse(original.subarray(20, 20 + length).toString());
  delete data.images; delete data.textures; delete data.materials;
  for (const mesh of data.meshes ?? []) for (const primitive of mesh.primitives) delete primitive.material;
  let json = Buffer.from(JSON.stringify(data)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const tail = original.subarray(20 + length), header = Buffer.from(original.subarray(0, 20));
  header.writeUInt32LE(20 + json.length + tail.length, 8); header.writeUInt32LE(json.length, 12);
  const buffer = Buffer.concat([header, json, tail]);
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '');
}

for (const number of [1, 2]) test('wire windows match the shipped ' + duelLoadoutId(number) + ' rig', async () => {
  const kit = DUEL_ROUND_KITS[number - 1].loadout, definition = dressed(WEAPON_SETS[kit.weapon], kit.attire);
  const gltf = await skeleton(definition.model), hand = gltf.scene.getObjectByName(definition.weapon.socket);
  assert.ok(hand);
  const rig = Object.assign(Object.create(CharacterRig.prototype), {
    root: gltf.scene, mounts: [], actions: new Map(gltf.animations.map(c => [c.name, { getClip: () => c }])),
  });
  const bounds = DUEL_ATTACKS[duelLoadoutId(number)];
  assert.deepEqual(Object.keys(definition.states).filter(s => s.startsWith('ATTACK')).sort(), Object.keys(bounds).sort());
  for (const [state, rule] of Object.entries(bounds)) {
    const config = definition.states[state], start = config.startAt ?? 0, rate = config.timeScale ?? 1;
    const end = config.endAt ?? gltf.animations.find(c => c.name === config.clip).duration;
    assert.ok(Math.abs((end - start) / rate - rule.duration) < 0.002, state + ' duration');
    const measured = rig.measureStrikes(config.clip, () => hand.localToWorld(new THREE.Vector3(0, definition.weapon.blade[1], 0)))
      .filter(w => w.t1 > start && w.t0 < end)
      .map(w => [Math.max(0, w.t0 - start) / rate, (Math.min(w.t1, end) - start) / rate]);
    assert.equal(measured.length, rule.windows.length, state + ' window count');
    measured.forEach((w, i) => w.forEach((v, j) => assert.ok(Math.abs(v - rule.windows[i][j]) < 0.002, state + ' window ' + i)));
  }
});

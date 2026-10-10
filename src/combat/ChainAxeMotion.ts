import * as THREE from 'three';
import type { CharacterState } from '../entities/CharacterStateMachine';

/**
 * The island axe's choreography, in boss-local metres and state seconds. Every attack leaves the animated hand,
 * winds up, commits to a visible strike, then returns to that same hand before the clip ends. The old independent
 * formulas teleported on entry and exit and spun even at rest. Keeping pose keys and strike windows together lets
 * collision and the picture agree. The return is deliberately harmless: dodging a throw buys a punish window.
 * Reach is selected once on attack entry; moving away after commitment never stretches the chain to chase you.
 */
type Key = { t: number; p: [number, number, number] | null; roll: number };
const HOLD_ROLL = -0.3;
export const AXE_WINDOWS = {
  ATTACK_1: [{ t0: 0.6, t1: 1.05 }],
  ATTACK_2: [{ t0: 0.75, t1: 1.05 }],
  ATTACK_3: [{ t0: 0.6, t1: 1.05 }],
};
export const AXE_TIP = new THREE.Vector3(-0.35, 0.66, 0);
export const AXE_HEEL = new THREE.Vector3(-0.44, 0.14, 0);
const zAxis = new THREE.Vector3(0, 0, 1);

export function axePose(state: CharacterState, t: number, reach: number, hand: THREE.Vector3,
  position: THREE.Vector3, rotation: THREE.Quaternion): void {
  let keys: Key[];
  if (state === 'ATTACK_1') {
    keys = [
      { t: 0, p: null, roll: HOLD_ROLL },
      { t: 0.6, p: [-reach * 0.9, 1.05, reach * 0.45], roll: -Math.PI / 2 },
      { t: 0.825, p: [0, 1.05, reach], roll: -Math.PI / 2 },
      { t: 1.05, p: [reach * 0.9, 1.05, reach * 0.45], roll: -Math.PI / 2 },
      { t: 1.65, p: null, roll: HOLD_ROLL },
    ];
  } else if (state === 'ATTACK_2') {
    keys = [
      { t: 0, p: null, roll: HOLD_ROLL },
      { t: 0.65, p: [0.4, 3.1, 0.8], roll: 0 },
      { t: 1.0, p: [-0.4, 1.1, reach], roll: Math.PI },
      { t: 1.25, p: [-0.4, 1.1, reach], roll: Math.PI },
      { t: 1.85, p: null, roll: HOLD_ROLL },
    ];
  } else if (state === 'ATTACK_3') {
    keys = [
      { t: 0, p: null, roll: HOLD_ROLL },
      { t: 0.6, p: [0.35, 1.25, 0.65], roll: 0 },
      { t: 1.05, p: [0.35, 1.25, reach], roll: Math.PI * 2 },
      { t: 1.3, p: [0.35, 1.25, reach], roll: Math.PI * 2 },
      { t: 2.05, p: null, roll: Math.PI * 2 + HOLD_ROLL },
    ];
  } else {
    position.copy(hand); rotation.setFromAxisAngle(zAxis, HOLD_ROLL); return;
  }
  let i = 1;
  while (i < keys.length - 1 && t > keys[i].t) i++;
  const a = keys[i - 1], b = keys[i];
  const u = THREE.MathUtils.smoothstep(t, a.t, b.t);
  const ap = a.p, bp = b.p;
  position.set(
    THREE.MathUtils.lerp(ap?.[0] ?? hand.x, bp?.[0] ?? hand.x, u),
    THREE.MathUtils.lerp(ap?.[1] ?? hand.y, bp?.[1] ?? hand.y, u),
    THREE.MathUtils.lerp(ap?.[2] ?? hand.z, bp?.[2] ?? hand.z, u),
  );
  rotation.setFromAxisAngle(zAxis, THREE.MathUtils.lerp(a.roll, b.roll, u));
}

import * as THREE from 'three';
import type { CharacterState } from '../entities/CharacterStateMachine';

/**
 * The island axe's choreography, in boss-local metres (x her left, y up, z ahead) and state seconds, built like the
 * Blades of Chaos: her body carries a big readable wind-up with the axe in her fist, holds it cocked at the top for a
 * tenth of a second, her hips then chest then arm drive it out, the wrist snaps and lets it go, it whips out on the
 * chain along one long continuous curve, and the chain hauls it back into her hand.
 *
 * Each attack is four authored legs, all continuous in position and velocity:
 * - the draw and the coil: in her hand. The arm keys (`ArmKeys`) put the grip and turn the axe in it; AxeBody's IK
 *   reaches for them with the shoulder, arm and wrist, and the boss locks the axe to her hand socket every step;
 * - the strike: ONE centripetal Catmull-Rom curve from her fist at the whip-out through 4-6 points, timed by an eased
 *   speed profile (a smoothstep whip-out, then a single long braking curve: the tip never slows and speeds up again
 *   mid-stroke). It leaves her fist from rest as her arm drives on. Arc length is tabulated once per attack, so the
 *   timing is exact whatever the reach;
 * - the recall: from where the chain stopped it to the live hand, accelerating; it lands in her fist (her hand gives
 *   with the catch: the boss's recoil) and stays there.
 *
 * In flight the blade's orientation is not keyed: its haft points out along the chain (from the hand) and its edge
 * leads along its travel, eased onto an authored edge direction when it barely moves, and onto her grip near the hand.
 * Strike windows and cue times (`AxeMotion.cue`) come from the same tables, so collision, FX, sound and the body agree.
 * The return is deliberately harmless: dodging a throw buys a punish window. Reach is fixed at attack entry.
 */

export type AxeAttack = 'ATTACK_1' | 'ATTACK_2' | 'ATTACK_3';
/** A point: [x, x per metre of reach, y, z, z per metre of reach]. */
type Pt = readonly [number, number, number, number, number];
type V3 = readonly [number, number, number];
/** A keyed scalar: times and values (Catmull-Rom in time, flat outside). */
export interface Keys { readonly t: readonly number[]; readonly v: readonly number[] }
/**
 * The right hand: the grip (boss-local: where the haft sits in her fist), the wrist (degrees from the rig's relaxed
 * hand: [deviation, + toward the little finger; flexion, + toward the palm; roll, the forearm's pronation]) and how far
 * the arm leaves her rest hold for them (0..1). The axe lies in her fist as the wrist turns it: cocked back (radial
 * deviation and extension) on the draw, snapped through (ulnar deviation and flexion) as it goes, the dart-thrower's
 * path a hammer swing takes.
 */
export interface ArmKeys {
  readonly t: readonly number[]; readonly p: readonly V3[]; readonly wrist: readonly V3[]; readonly w: readonly number[];
}
/** The left hand: its wrist (boss-local) and how far it leaves the clip for it. */
export interface OffKeys { readonly t: readonly number[]; readonly p: readonly V3[]; readonly w: readonly number[] }
export interface AxeWindow { t0: number; t1: number }

interface AttackSpec {
  /** The top of the draw (embers smoulder from here) and the whip-out (the strike leaves her fist). */
  tApex: number; tWhip: number;
  path: readonly Pt[]; tStop: number;
  /** Seconds of the strike spent accelerating, and how late and hard it brakes (a power: higher is later). */
  whip: number; brake: number;
  /** After the stop: the chain's recoil (m back toward the hand, m down), settled by `tRecall`. */
  recoil: number; drop: number; tRecall: number;
  /** The recall: flight time base + per metre, and its arc (a boss-local direction, metres per metre flown). */
  recallBase: number; recallPerMetre: number; bulge: V3; bulgeSize: number;
  /** The strike's arc length (m) at the reach its timing is authored for: longer arcs take a little longer. */
  nominalLength: number;
  windows: AxeWindow[];
  /** The blade ends the strike planted in the floor (the slam), so the stop is an impact, not a taut chain. */
  plants: boolean;
  /** Body layers (degrees, metres): torso twist (+ turns her chest to her left), lean (+ forward), the torso's lunge
   * (+ ahead) and rise, the front legs' lift, and the blade's heat (0..1). Twist and lean are the chest's timing: her
   * hips run `HIP_LEAD` ahead of them. */
  twist: Keys; lean: Keys; lunge: Keys; rise: Keys; legs: Keys; heat: Keys;
  arm: ArmKeys;
  off: OffKeys;
}

/** The hand, as authored (her catch): recall timing is planned from it, so it is the same every time. */
const HAND_NOMINAL = new THREE.Vector3(-0.65, 2.3, 1.0);
/**
 * Seconds after the whip-out that her fist lets go. None: the strike starts in her fist (its first point is where the
 * arm keys have the grip then) from rest, so at the whip-out hand and axe are one, and the axe pulls away from her
 * driving hand as the chain whips it out.
 */
export const CARRY = 0;
/** Seconds the blade takes to turn from her grip into line with the chain once it has left her fist. */
const TURN = 0.2;
/** Seconds the axe takes from her opening fist onto its strike (only what the arm fell short of the line). */
const RELEASE = 0.05;
/** Seconds her hips run ahead of her chest (the kinetic chain: hips, then chest, then arm, then wrist). */
export const HIP_LEAD = 0.06;
/** Her left hand at rest (the clip's): where the off-hand keys start and end. */
const REST_OFF: V3 = [0.98, 1.83, 0.67];
/** Her rest hold (the grip, boss-local, as the idle clip has her), where the right-hand keys start and end. */
const REST_GRIP: V3 = [-0.62, 1.98, 1.0];
const REST_WRIST: V3 = [10, 0, 0];
/** The rest hold, for AxeBody: it carries it with her chest, measured from where the idle clip has the chest. */
export const REST_HOLD = { p: REST_GRIP, wrist: REST_WRIST } as const;
/** The chest bone (boss-local) at the idle clip's first frame (island_demoness.glb; a test checks it against the file). */
export const CHEST_IDLE = { p: [0.04, 1.91, 0.64], q: [-0.01682, -0.05445, -0.05445, 0.99689] } as const;

const SPECS: Record<AxeAttack, AttackSpec> = {
  // The sweep: drawn up behind her right shoulder with the head cocked down her back, flung out wide to her right, then
  // diagonally down across her front to knee height, through and round to her left, where the chain stops it.
  ATTACK_1: {
    tApex: 0.34, tWhip: 0.42,
    path: [
      [-1.85, 0, 2.65, 0.45, 0],
      [-0.6, -0.45, 1.45, 0.05, 0.6],
      [0, -0.25, 0.74, -0.12, 0.96],
      [0, 0.3, 0.72, -0.12, 0.94],
      [0.45, 0.45, 0.95, 0.3, 0.35],
      [0.6, 0.4, 1.3, 0.2, 0],
    ],
    tStop: 1.05, whip: 0.12, brake: 4,
    recoil: 0.22, drop: 0.12, tRecall: 1.1,
    recallBase: 0.2, recallPerMetre: 0.05, bulge: [0.1, 0.75, 0.0], bulgeSize: 0.12,
    nominalLength: 7.8,
    windows: [{ t0: 0.52, t1: 0.9 }],
    plants: false,
    twist: { t: [0, 0.32, 0.42, 0.5, 0.62, 0.8, 1, 1.2, 1.45, 1.7], v: [0, -30, -34, -12, 16, 27, 24, 10, -2, 0] },
    lean: { t: [0, 0.32, 0.42, 0.55, 0.8, 1.12, 1.55], v: [0, -10, -12, 5, 9, 3, 0] },
    lunge: { t: [0, 0.38, 0.56, 0.85, 1.25, 1.6], v: [0, -0.05, 0.07, 0.05, 0, 0] },
    rise: { t: [0, 0.38, 0.75, 1.25], v: [0, 0.03, -0.04, 0] },
    legs: { t: [0, 1], v: [0, 0] },
    heat: { t: [0, 0.24, 0.36, 0.9, 1.2, 1.7], v: [0.1, 0.55, 1, 1, 0.55, 0.12] },
    arm: {
      t: [0, 0.16, 0.28, 0.34, 0.44, 0.5, 0.56, 0.68, 0.84, 1, 1.14, 1.28, 1.42, 1.58, 1.76],
      p: [REST_GRIP, [-0.57, 2.27, 0.92], [-0.66, 2.6, 0.48], [-0.68, 2.78, 0.18], [-0.69, 2.79, 0.17],
        [-0.98, 2.62, 0.45], [-0.8, 2.38, 1.05], [-0.32, 2.22, 1.45], [0.08, 2.15, 1.4], [0.2, 2.14, 1.3],
        [0.1, 2.12, 1.22], [-0.12, 2.15, 1.18], [-0.3, 2.16, 1.13], [-0.46, 2.13, 1.08], REST_GRIP],
      wrist: [REST_WRIST, [18, -8, 20], [17.5, -7.5, 55], [-7.5, 5, 75], [-12, 2, 75],
        [-4, 10, 68], [20, 32, 40], [25, 33, 12], [15, 20, 0], [10, 10, 0],
        [5, 5, 0], [15, 15, 20], [15, 10, 15], [12, -5, 5], REST_WRIST],
      w: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0],
    },
    off: {
      t: [0, 0.15, 0.34, 0.48, 0.62, 0.85, 1.2, 1.5, 1.75],
      p: [REST_OFF, [0.62, 2.12, 1], [0.48, 2.3, 1.18], [0.58, 1.98, 0.8], [0.72, 1.9, 0.55],
        [0.88, 1.88, 0.5], [0.92, 1.84, 0.62], [0.96, 1.83, 0.66], REST_OFF],
      w: [0, 1, 1, 1, 1, 1, 1, 0.6, 0],
    },
  },
  // The slam: up over her head with the head of the axe dropped down her back, then a curved overhead arc down onto the
  // floor at his feet.
  ATTACK_2: {
    tApex: 0.36, tWhip: 0.45,
    path: [
      [-0.35, 0, 4.55, 0.55, 0],
      [-0.22, 0, 3.6, 0.35, 0.6],
      [-0.14, 0, 1.9, 0.3, 0.9],
      [-0.1, 0, 0.62, 0.05, 1.0],
    ],
    tStop: 0.96, whip: 0.12, brake: 12,
    recoil: 0.0, drop: 0.0, tRecall: 1.16,
    recallBase: 0.22, recallPerMetre: 0.06, bulge: [-0.55, 0.85, 0.0], bulgeSize: 0.14,
    nominalLength: 6.34,
    windows: [{ t0: 0.62, t1: 0.97 }],
    plants: true,
    twist: { t: [0, 0.34, 0.45, 0.62, 0.85, 1.2, 1.7], v: [0, -12, -14, 3, 6, 2, 0] },
    lean: { t: [0, 0.34, 0.45, 0.65, 0.85, 1.08, 1.4, 1.8], v: [0, -16, -19, 8, 15, 12, 3, 0] },
    lunge: { t: [0, 0.4, 0.85, 1.12, 1.6], v: [0, -0.04, 0.06, 0.04, 0] },
    rise: { t: [0, 0.4, 0.62, 0.86, 1.12, 1.6], v: [0, 0.07, 0.03, -0.1, -0.05, 0] },
    legs: { t: [0, 0.34, 0.47, 0.7, 0.86, 1.12, 1.6], v: [0, 24, 28, 8, -2, -1.5, 0] },
    heat: { t: [0, 0.24, 0.38, 0.9, 1.25, 1.8], v: [0.1, 0.55, 1, 1, 0.6, 0.12] },
    arm: {
      t: [0, 0.14, 0.26, 0.36, 0.46, 0.52, 0.58, 0.66, 0.8, 0.96, 1.16, 1.3, 1.44, 1.6, 1.8],
      p: [REST_GRIP, [-0.54, 2.32, 0.98], [-0.5, 2.68, 0.75], [-0.43, 2.96, 0.5], [-0.42, 3.01, 0.44],
        [-0.4, 3.1, 0.66], [-0.36, 2.9, 1.15], [-0.32, 2.25, 1.32], [-0.32, 2.02, 1.3], [-0.32, 1.98, 1.28],
        [-0.33, 2, 1.26], [-0.36, 2.12, 1.36], [-0.42, 2.16, 1.22], [-0.48, 2.13, 1.1], REST_GRIP],
      wrist: [REST_WRIST, [18, -20, 15], [25, -45, 35], [-15, -58, -8], [-20, -62, -10],
        [-15, -50, -8], [-5, -25, -5], [18, 18, 0], [30, 38, 0], [18, 25, 0],
        [12, 15, 0], [10, 8, 0], [12, 0, 0], [12, -6, 0], REST_WRIST],
      w: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0],
    },
    off: {
      t: [0, 0.16, 0.36, 0.5, 0.64, 0.9, 1.3, 1.6, 1.8],
      p: [REST_OFF, [0.6, 2.25, 1], [0.45, 2.5, 1.05], [0.55, 2.05, 0.85], [0.7, 1.85, 0.75],
        [0.85, 1.78, 0.8], [0.92, 1.8, 0.7], [0.96, 1.83, 0.68], REST_OFF],
      w: [0, 1, 1, 1, 1, 1, 1, 0.6, 0],
    },
  },
  // The throw: drawn back low past her right hip with the head trailing behind her, flung out on a curve that bends in
  // onto him, stopped hard by the chain at full stretch, and hauled back round her left on the other side of the loop.
  ATTACK_3: {
    tApex: 0.35, tWhip: 0.43,
    path: [
      [-1.85, 0, 2.0, 0.5, 0],
      [-0.3, -0.3, 1.55, 0.1, 0.5],
      [0, -0.1, 1.3, 0, 0.85],
      [0.15, 0, 1.2, 0.15, 1.0],
    ],
    tStop: 0.88, whip: 0.12, brake: 7,
    recoil: 0.35, drop: 0.15, tRecall: 1.0,
    recallBase: 0.2, recallPerMetre: 0.06, bulge: [1.0, 0.25, 0.0], bulgeSize: 0.16,
    nominalLength: 5.64,
    windows: [{ t0: 0.52, t1: 0.98 }],
    plants: false,
    twist: { t: [0, 0.33, 0.43, 0.53, 0.7, 0.98, 1.22, 1.38, 1.7], v: [0, -28, -32, 4, 14, 10, -2, -10, 0] },
    lean: { t: [0, 0.33, 0.43, 0.55, 0.72, 1.05, 1.45, 1.8], v: [0, -8, -9, 10, 12, 6, -3, 0] },
    lunge: { t: [0, 0.33, 0.43, 0.58, 0.89, 1.1, 1.6], v: [0, -0.08, -0.1, 0.2, 0.18, 0.08, 0] },
    rise: { t: [0, 0.42, 0.62, 1.2], v: [0, 0.02, -0.03, 0] },
    legs: { t: [0, 0.42, 0.58, 0.9, 1.3], v: [0, 6, -3, -2, 0] },
    heat: { t: [0, 0.24, 0.36, 1.0, 1.35, 1.9], v: [0.1, 0.55, 1, 1, 0.55, 0.12] },
    arm: {
      t: [0, 0.16, 0.28, 0.35, 0.45, 0.53, 0.62, 0.7, 0.84, 0.96, 1.1, 1.22, 1.34, 1.5, 1.66, 1.82],
      p: [REST_GRIP, [-0.62, 2.12, 0.85], [-0.76, 2.05, 0.48], [-0.8, 2, 0.27], [-0.81, 2, 0.25],
        [-0.92, 2.12, 1], [-0.6, 2.21, 1.62], [-0.42, 2.24, 1.72], [-0.3, 2.24, 1.68], [-0.26, 2.22, 1.64],
        [-0.26, 2.2, 1.6], [-0.33, 2.18, 1.45], [-0.4, 2.17, 1.3], [-0.46, 2.14, 1.13], [-0.5, 2.11, 1.07],
        REST_GRIP],
      wrist: [REST_WRIST, [15, 15, 25], [8, 40, 52], [10, 47, 64], [12, 47.5, 68],
        [12, 46, 64], [12, 48, 60], [32, 25, 5], [18, 16, 0], [10, 10, 0],
        [8, 8, 0], [12, 10, 12], [15, 10, 15], [12, -5, 5], [12, -8, 0],
        REST_WRIST],
      w: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0],
    },
    off: {
      t: [0, 0.14, 0.33, 0.48, 0.62, 0.9, 1.25, 1.6, 1.85],
      p: [REST_OFF, [0.62, 2.12, 1.1], [0.48, 2.25, 1.28], [0.58, 1.98, 0.78], [0.75, 1.88, 0.52],
        [0.9, 1.88, 0.5], [0.92, 1.84, 0.62], [0.96, 1.83, 0.66], REST_OFF],
      w: [0, 1, 1, 1, 1, 1, 1, 0.6, 0],
    },
  },
};

/** Damage windows, from the tables above (state seconds). */
export const AXE_WINDOWS: Record<AxeAttack, AxeWindow[]> = {
  ATTACK_1: SPECS.ATTACK_1.windows,
  ATTACK_2: SPECS.ATTACK_2.windows,
  ATTACK_3: SPECS.ATTACK_3.windows,
};
/** The blade's cutting edge, from the curved head's point to its heel (axe-local). */
export const AXE_TIP = new THREE.Vector3(-0.35, 0.66, 0);
export const AXE_HEEL = new THREE.Vector3(-0.44, 0.14, 0);
/** Where the chain is made fast to the haft (axe-local): the pommel once it is out, the grip while it is close. */
export const AXE_POMMEL = new THREE.Vector3(0, -0.62, 0);
/** The held axe's rotation (boss-local) when there is no hand to read it from (no rig yet). */
export const HOLD_ROTATION = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.3);
/**
 * The axe in her fist, in the hand socket's frame (Socket_Hand_R: x the palm's normal, y across the palm from the little
 * finger to the thumb, z back down the fingers): the haft (axe +y) runs across the palm and out past the thumb, the
 * edge (axe -x) faces where the knuckles point, as in a hammer grip.
 */
export const GRIP = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
  new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0)));

export function isAxeAttack(state: CharacterState): state is AxeAttack {
  return state === 'ATTACK_1' || state === 'ATTACK_2' || state === 'ATTACK_3';
}

/** The moments of an attack (state seconds) the FX, sound and body hang on. */
export interface AxeCues {
  apex: number;
  whip: number;
  /** The chain snaps taut (the sweep's and throw's stop) or the blade lands in the floor (the slam). */
  stop: number;
  recall: number;
  /** The blade back in her hand. */
  home: number;
  /** The recall over (settled). */
  settled: number;
  plants: boolean;
}

const RECALL_CROSS = 0.76;
const RECALL_POW = 1.5;
const STRIKE_SAMPLES = 40;
const MAX_POINTS = 10;
const LUT = (MAX_POINTS - 1) * STRIKE_SAMPLES + 1;
/** The travel the edge follows is the chord over this long (s): steady, not twitching with every step. */
const CHORD = 1 / 30;
/** Below this speed (m/s) the edge leans on its authored direction rather than its travel. */
const EDGE_BIAS = 3;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _p = new THREE.Vector3();
const _q = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _rq = new THREE.Quaternion();

function point(pt: Pt, reach: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(pt[0] + pt[1] * reach, pt[2], pt[3] + pt[4] * reach);
}

function smootherstep(x: number): number {
  const k = THREE.MathUtils.clamp(x, 0, 1);
  return k * k * k * (k * (k * 6 - 15) + 10);
}

/** Progress (0..1) through the strike at `u` (0..1): a smoothstep whip-out over `a`, then one braking curve of power `p`. */
export function strikeProgress(u: number, a: number, p: number): number {
  const k = THREE.MathUtils.clamp(u, 0, 1);
  const total = a / 2 + (1 - a) * (p / (p + 1));
  let done: number;
  if (k < a) {
    const x = k / a;
    done = a * (x * x * x - (x * x * x * x) / 2);
  } else {
    const y = (k - a) / (1 - a);
    done = a / 2 + (1 - a) * (y - Math.pow(y, p + 1) / (p + 1));
  }
  return done / total;
}

/** The recall's share of the way home at `u` (0..1): accelerating into her fist by RECALL_CROSS, then held there. */
export function recallProgress(u: number): number {
  return Math.min(1, Math.pow(THREE.MathUtils.clamp(u, 0, 1) / RECALL_CROSS, RECALL_POW));
}

/** Its flight time for `distance` metres (s). */
export function recallTime(distance: number, base = 0.2, perMetre = 0.045): number {
  return base + perMetre * distance;
}

/** Where `t` falls among the knots `ts`: the span `_i` and how far into it `_u` (for the samplers below). */
let _i = 0, _u = 0;
function span(ts: readonly number[], t: number): void {
  const n = ts.length;
  let i = 0;
  while (i < n - 2 && t > ts[i + 1]) i++;
  _i = i;
  _u = (t - ts[i]) / (ts[i + 1] - ts[i]);
}

/** Catmull-Rom through `keys` at `t` (flat beyond the ends; tangents scaled to each span's length, so uneven key
 * spacing does not overshoot). The blade's heat keeps this curve. */
export function sampleKeys(keys: Keys, t: number): number {
  const ts = keys.t, vs = keys.v, n = ts.length;
  if (t <= ts[0]) return vs[0];
  if (t >= ts[n - 1]) return vs[n - 1];
  span(ts, t);
  const i = _i, u = _u;
  const v0 = vs[Math.max(0, i - 1)], v1 = vs[i], v2 = vs[i + 1], v3 = vs[Math.min(n - 1, i + 2)];
  const t0 = ts[Math.max(0, i - 1)], t1 = ts[i], t2 = ts[i + 1], t3 = ts[Math.min(n - 1, i + 2)];
  const m1 = i > 0 ? ((v2 - v0) / (t2 - t0)) * (t2 - t1) : v2 - v1;
  const m2 = i + 2 < n ? ((v3 - v1) / (t3 - t1)) * (t2 - t1) : v2 - v1;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * v2 + (u3 - u2) * m2;
}

/**
 * The body's and the arms' curves: clamped cubic splines through the keys. They leave the first key and reach the last
 * at rest (a move eases out of the pose it starts from and into the one it ends on) and their acceleration is
 * continuous through every key between (a Catmull-Rom's jumps at each key: a jolt in the hand every few frames). Each
 * curve's second derivatives are solved once, the first time it is sampled, and kept.
 */
const moments = new Map<readonly unknown[], Float64Array>();
function momentsOf(ts: readonly number[], vs: readonly (number | V3)[], dims: number): Float64Array {
  let m = moments.get(vs);
  if (m) return m;
  const n = ts.length;
  m = new Float64Array(n * dims);
  const c = new Float64Array(n), d = new Float64Array(n);
  for (let k = 0; k < dims; k++) {
    const y = (i: number) => (dims === 1 ? (vs[i] as number) : (vs[i] as V3)[k]);
    // The tridiagonal system (zero slope at both ends), by the Thomas algorithm.
    for (let i = 0; i < n; i++) {
      const hl = i > 0 ? ts[i] - ts[i - 1] : 0, hr = i < n - 1 ? ts[i + 1] - ts[i] : 0;
      const sl = i > 0 ? (y(i) - y(i - 1)) / hl : 0, sr = i < n - 1 ? (y(i + 1) - y(i)) / hr : 0;
      const sub = hl, diag = 2 * (hl + hr), sup = hr, rhs = 6 * (sr - sl);
      const den = diag - (i > 0 ? sub * c[i - 1] : 0);
      c[i] = sup / den;
      d[i] = (rhs - (i > 0 ? sub * d[i - 1] : 0)) / den;
    }
    for (let i = n - 1; i >= 0; i--) m[i * dims + k] = d[i] - (i < n - 1 ? c[i] * m[(i + 1) * dims + k] : 0);
  }
  moments.set(vs, m);
  return m;
}

/** The spline's value on span `_i` at `t`, dimension `k` of `dims`, from values y1, y2 at its ends. */
function cubic(ts: readonly number[], m: Float64Array, dims: number, k: number, y1: number, y2: number, t: number): number {
  const i = _i, h = ts[i + 1] - ts[i];
  const a = (ts[i + 1] - t) / h, b = 1 - a;
  return a * y1 + b * y2 + ((a * a * a - a) * m[i * dims + k] + (b * b * b - b) * m[(i + 1) * dims + k]) * (h * h) / 6;
}

/** The body's spline through `keys` at `t` (flat beyond the ends). */
export function smoothKeys(keys: Keys, t: number): number {
  const ts = keys.t, vs = keys.v, n = ts.length;
  if (t <= ts[0]) return vs[0];
  if (t >= ts[n - 1]) return vs[n - 1];
  const m = momentsOf(ts, vs, 1);
  span(ts, t);
  return cubic(ts, m, 1, 0, vs[_i], vs[_i + 1], t);
}

/** The arms' spline through keyed points, into `out`; returns the keyed weight there (eased between its keys). */
export function samplePoints(ts: readonly number[], ps: readonly V3[], ws: readonly number[] | null, t: number, out: THREE.Vector3): number {
  const n = ts.length;
  if (t <= ts[0] || t >= ts[n - 1]) {
    const k = t <= ts[0] ? 0 : n - 1;
    out.set(ps[k][0], ps[k][1], ps[k][2]);
    return ws ? ws[k] : 1;
  }
  const m = momentsOf(ts, ps, 3);
  span(ts, t);
  const p1 = ps[_i], p2 = ps[_i + 1];
  out.set(cubic(ts, m, 3, 0, p1[0], p2[0], t), cubic(ts, m, 3, 1, p1[1], p2[1], t), cubic(ts, m, 3, 2, p1[2], p2[2], t));
  return ws ? ws[_i] + (ws[_i + 1] - ws[_i]) * smootherstep(_u) : 1;
}

/** Centripetal Catmull-Rom between `p1` and `p2` at `u`. */
function centripetal(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, u: number, out: THREE.Vector3): void {
  const t1 = Math.max(1e-4, Math.sqrt(p0.distanceTo(p1)));
  const t2 = t1 + Math.max(1e-4, Math.sqrt(p1.distanceTo(p2)));
  const t3 = t2 + Math.max(1e-4, Math.sqrt(p2.distanceTo(p3)));
  const t = t1 + (t2 - t1) * u;
  // Barry and Goldman's pyramid, component-wise.
  for (let k = 0; k < 3; k++) {
    const a0 = p0.getComponent(k), a1 = p1.getComponent(k), a2 = p2.getComponent(k), a3 = p3.getComponent(k);
    const A1 = ((t1 - t) / t1) * a0 + (t / t1) * a1;
    const A2 = ((t2 - t) / (t2 - t1)) * a1 + ((t - t1) / (t2 - t1)) * a2;
    const A3 = ((t3 - t) / (t3 - t2)) * a2 + ((t - t2) / (t3 - t2)) * a3;
    const B1 = ((t2 - t) / t2) * A1 + (t / t2) * A2;
    const B2 = ((t3 - t) / (t3 - t1)) * A2 + ((t - t1) / (t3 - t1)) * A3;
    out.setComponent(k, ((t2 - t) / (t2 - t1)) * B1 + ((t - t1) / (t2 - t1)) * B2);
  }
}

/**
 * One boss's axe motion: the attack it is in and its reach, with the strike curve tabulated by arc length (made once
 * per attack, into buffers made once: nothing is allocated per step).
 */
export class AxeMotion {
  public state: AxeAttack | null = null;
  public reach = 2.5;
  private spec: AttackSpec = SPECS.ATTACK_1;
  private readonly pts = Array.from({ length: MAX_POINTS }, () => new THREE.Vector3());
  private count = 0;
  private readonly lutPos = new Float32Array(LUT * 3);
  private readonly lutLen = new Float32Array(LUT);
  private lutCount = 0;
  private length = 0;
  /** Where the strike leaves the blade once the chain has recoiled (the recall starts here). */
  private readonly rest = new THREE.Vector3();
  private recallSpan = 0.35;
  /** The strike's own end: a longer reach swings a longer arc a little longer, so the tip keeps to the same speed. */
  private stop = 1;
  /** The recall's start: the authored moment, or later if the strike ran on (the recoil always gets its time). */
  private recallAt = 1.1;
  /** The edge's way before the strike (along its first span) and after it (along its last), boss-local. */
  private readonly edgeStart = new THREE.Vector3();
  private readonly edgeEnd = new THREE.Vector3();
  private readonly edgeNow = new THREE.Vector3();

  /** Lays out `state` at `reach` (call on attack entry). */
  public prepare(state: AxeAttack, reach: number): void {
    this.state = state;
    this.reach = reach;
    const spec = (this.spec = SPECS[state]);
    // The strike starts in her fist, where the arm keys have it at the whip-out.
    samplePoints(spec.arm.t, spec.arm.p, null, spec.tWhip, this.pts[0]);
    spec.path.forEach((pt, i) => point(pt, reach, this.pts[i + 1]));
    this.count = spec.path.length + 1;
    // The tables: STRIKE_SAMPLES points per span, with phantom ends mirrored so the curve starts and ends on its points.
    const n = this.count;
    let k = 0;
    let total = 0;
    const p = this.pts;
    for (let i = 0; i < n - 1; i++) {
      const p0 = i > 0 ? p[i - 1] : _a.copy(p[0]).multiplyScalar(2).sub(p[1]);
      const p3 = i + 2 < n ? p[i + 2] : _d.copy(p[n - 1]).multiplyScalar(2).sub(p[n - 2]);
      for (let s = i === 0 ? 0 : 1; s <= STRIKE_SAMPLES; s++) {
        centripetal(p0, p[i], p[i + 1], p3, s / STRIKE_SAMPLES, _p);
        if (k > 0) total += Math.hypot(_p.x - this.lutPos[k * 3 - 3], _p.y - this.lutPos[k * 3 - 2], _p.z - this.lutPos[k * 3 - 1]);
        _p.toArray(this.lutPos, k * 3);
        this.lutLen[k] = total;
        k++;
      }
    }
    this.lutCount = k;
    this.length = total;
    const nominal = spec.nominalLength;
    this.stop = spec.tWhip + (spec.tStop - spec.tWhip) * THREE.MathUtils.clamp(Math.sqrt(total / nominal), 0.85, 1.15);
    this.recallAt = Math.max(spec.tRecall, this.stop + 0.1);
    this.along(Math.min(total, 0.35), this.edgeStart).sub(p[0]).normalize();
    this.edgeEnd.fromArray(this.lutPos, (k - 1) * 3).sub(_a.fromArray(this.lutPos, Math.max(0, k - 1 - STRIKE_SAMPLES / 2) * 3)).normalize();
    // The recoil: the chain at full stretch bounces it back a little toward the hand and lets it drop.
    const end = p[n - 1];
    _b.subVectors(HAND_NOMINAL, end).setY(0);
    if (_b.lengthSq() > 1e-6) _b.normalize();
    this.rest.copy(end).addScaledVector(_b, spec.recoil);
    this.rest.y -= spec.drop;
    this.recallSpan = recallTime(this.rest.distanceTo(HAND_NOMINAL), spec.recallBase, spec.recallPerMetre);
  }

  /** The cue times of the prepared attack. */
  public cue(out: AxeCues): AxeCues {
    const s = this.spec;
    out.apex = s.tApex;
    out.whip = s.tWhip;
    out.stop = this.stop;
    out.recall = this.recallAt;
    out.home = this.recallAt + this.recallSpan * RECALL_CROSS;
    out.settled = this.recallAt + this.recallSpan;
    out.plants = s.plants;
    return out;
  }

  /** The arc length of the strike (m) and the time (s) it lasts: its mean speed is one over the other. */
  public strikeLength(): number {
    return this.length;
  }

  /** Body layers at `t`: twist and lean on the chest's timing, `hipTwist` and `hipLean` on the hips' (ahead of it). */
  public body(t: number, out: { twist: number; lean: number; hipTwist: number; hipLean: number; lunge: number; rise: number; legs: number; heat: number }): void {
    const s = this.spec;
    out.twist = smoothKeys(s.twist, t);
    out.lean = smoothKeys(s.lean, t);
    // The hips' lead grows in over the first moments (at entry both are the clip's: nothing jumps).
    const hip = t + HIP_LEAD * THREE.MathUtils.smoothstep(t, 0, 0.2);
    out.hipTwist = smoothKeys(s.twist, hip);
    out.hipLean = smoothKeys(s.lean, hip);
    out.lunge = smoothKeys(s.lunge, t);
    out.rise = smoothKeys(s.rise, t);
    out.legs = smoothKeys(s.legs, t);
    out.heat = THREE.MathUtils.clamp(sampleKeys(s.heat, t), 0, 1.2);
  }

  /**
   * Her right hand at `t`: the grip (boss-local) into `grip`, the wrist (degrees, see ArmKeys) into `wrist`, and how far
   * the arm leaves her rest hold for them. Through the whip-out the keys carry the axe out along its strike's first span.
   */
  public arm(t: number, grip: THREE.Vector3, wrist: THREE.Vector3): number {
    const k = this.spec.arm;
    samplePoints(k.t, k.wrist, null, t, wrist);
    return samplePoints(k.t, k.p, k.w, t, grip);
  }

  /** The axe origin on its strike at `t` (her fist at the whip-out until then). */
  private strike(t: number, out: THREE.Vector3): THREE.Vector3 {
    const s = this.spec;
    if (t <= s.tWhip) return out.copy(this.pts[0]);
    const span = this.stop - s.tWhip;
    return this.along(strikeProgress((t - s.tWhip) / span, s.whip / span, s.brake) * this.length, out);
  }

  /** Her left hand's wrist (boss-local) at `t` into `out`, and how far it leaves the clip for it. */
  public off(t: number, out: THREE.Vector3): number {
    const k = this.spec.off;
    return samplePoints(k.t, k.p, k.w, t, out);
  }

  /** The axe origin's position at state time `t`, the hand at `hand` (boss-local). */
  public position(t: number, hand: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    const s = this.spec;
    const let_ = s.tWhip + CARRY;
    // In her fist through the draw, the coil and the carry.
    if (t < let_) return out.copy(hand);
    if (t < this.stop) {
      this.strike(t, out);
      // Out of her opening fist onto its strike: only what the arm fell short of the line, taken up over RELEASE.
      const k = smootherstep((t - let_) / RELEASE);
      return k < 1 ? out.sub(hand).multiplyScalar(k).add(hand) : out;
    }
    if (t < this.recallAt) {
      // The chain's recoil at full stretch.
      const u = smootherstep((t - this.stop) / Math.min(0.12, this.recallAt - this.stop));
      this.along(this.length, _a);
      return out.lerpVectors(_a, this.rest, u);
    }
    return recallPath(this.rest, hand, (t - this.recallAt) / this.recallSpan, s.bulge, s.bulgeSize, out);
  }

  /**
   * The axe's whole pose at `t`: position (boss-local) and rotation. In her fist it is her grip (`grip`, the boss-local
   * rotation the hand socket gives it); out of it the haft points out along the chain and the edge leads, easing from
   * and back into the grip.
   */
  public pose(state: CharacterState, t: number, hand: THREE.Vector3, grip: THREE.Quaternion, position: THREE.Vector3, rotation: THREE.Quaternion): void {
    if (!isAxeAttack(state) || state !== this.state) {
      position.copy(hand);
      rotation.copy(grip);
      return;
    }
    const s = this.spec;
    const let_ = s.tWhip + CARRY;
    this.position(t, hand, position);
    if (t < let_ || t >= this.recallAt + this.recallSpan * RECALL_CROSS) {
      rotation.copy(grip);
      return;
    }
    this.position(Math.max(0, t - CHORD), hand, _q);
    // Held: eased out of the grip as the fist opens, and back into it over the end of the recall, by time (by distance,
    // a blade arriving at 20 m/s would whip round in a frame or two).
    const held = t < this.recallAt ? 1 - THREE.MathUtils.smoothstep(t, let_, let_ + TURN)
      : THREE.MathUtils.smoothstep((t - this.recallAt) / this.recallSpan, 0.22, RECALL_CROSS * 0.97);
    // The edge: set for the strike's first span from the start (the draw carries it cocked, so nothing flips at the
    // top), led by the travel through the strike, and left along its last span once the chain has stopped it.
    const k = THREE.MathUtils.smoothstep(t, s.tWhip, this.stop);
    this.edgeNow.lerpVectors(this.edgeStart, this.edgeEnd, k);
    const travel = THREE.MathUtils.smoothstep(t, let_, let_ + 0.06) * (1 - THREE.MathUtils.smoothstep(t, this.stop - 0.08, this.stop + 0.05));
    orient(position, _q, hand, this.edgeNow, CHORD, travel, held, grip, rotation);
  }

  /** Whether the strike's blade has reached its stop and is now slack, recoiling or coming home. */
  public spent(t: number): boolean {
    return t >= this.stop;
  }

  private along(s: number, out: THREE.Vector3): THREE.Vector3 {
    const n = this.lutCount;
    if (s <= 0) return out.fromArray(this.lutPos, 0);
    if (s >= this.length) return out.fromArray(this.lutPos, (n - 1) * 3);
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.lutLen[mid] <= s) lo = mid;
      else hi = mid;
    }
    const span = this.lutLen[hi] - this.lutLen[lo];
    const u = span > 1e-9 ? (s - this.lutLen[lo]) / span : 0;
    _c.fromArray(this.lutPos, lo * 3);
    return out.fromArray(this.lutPos, hi * 3).sub(_c).multiplyScalar(u).add(_c);
  }
}

/**
 * From `from` to the live `hand` at progress `u` (0..1 of the recall's time): accelerating home into her fist, and an
 * arc off the straight line (`bulge`, metres per metre) on the way.
 */
export function recallPath(from: THREE.Vector3, hand: THREE.Vector3, u: number, bulge: V3, size: number, out: THREE.Vector3): THREE.Vector3 {
  if (u >= RECALL_CROSS) return out.copy(hand);
  const distance = from.distanceTo(hand);
  out.lerpVectors(from, hand, recallProgress(u));
  const arc = Math.sin(Math.PI * Math.max(0, u) / RECALL_CROSS) * size * distance;
  return out.set(out.x + bulge[0] * arc, out.y + bulge[1] * arc, out.z + bulge[2] * arc);
}

/**
 * The blade's rotation from its travel: the haft along the chain (out from `hand`), the cutting edge (axe-local -x)
 * leading, `edge` steadying it when slow; her grip (`grip`) near the hand.
 */
export function orient(position: THREE.Vector3, before: THREE.Vector3, hand: THREE.Vector3, edge: THREE.Vector3, dt: number,
  travel: number, holding: number, grip: THREE.Quaternion, rotation: THREE.Quaternion): void {
  const out = _y.subVectors(position, hand);
  const reach = out.length();
  // In the hand the chain's direction means nothing: held there whatever the clock says.
  const held = Math.max(holding, 1 - THREE.MathUtils.smoothstep(reach, 0.06, 0.32));
  if (held >= 1 || reach < 1e-4) {
    rotation.copy(grip);
    return;
  }
  out.divideScalar(reach);
  // The travel (m/s), plus the authored edge, which wins only when the blade is slow.
  _x.subVectors(position, before).multiplyScalar(travel / dt).addScaledVector(edge, EDGE_BIAS);
  _x.addScaledVector(out, -_x.dot(out));
  if (_x.lengthSq() < 1e-6) _x.copy(edge).addScaledVector(out, -out.dot(edge));
  if (_x.lengthSq() < 1e-6) _x.set(0, 0, 1).addScaledVector(out, -out.z);
  _x.normalize().negate();
  _z.crossVectors(_x, out);
  _m.makeBasis(_x, out, _z);
  _rq.setFromRotationMatrix(_m);
  if (held > 0) rotation.slerpQuaternions(_rq, grip, held);
  else rotation.copy(_rq);
}

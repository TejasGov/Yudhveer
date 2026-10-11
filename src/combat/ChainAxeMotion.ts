import * as THREE from 'three';
import type { CharacterState } from '../entities/CharacterStateMachine';

/**
 * The island axe's choreography, in boss-local metres (x her left, y up, z ahead) and state seconds, built like the
 * Blades of Chaos: her body carries a big readable wind-up, the blade hangs coiled at the top for a tenth of a second,
 * then whips out on the chain and swings on one long continuous curve, and the chain hauls it back into her hand.
 *
 * Each attack is four authored legs, all continuous in position and velocity:
 * - the wind-up: a cubic Bezier from the live hand to the apex, eased in and out (the gather and the draw);
 * - the coil: a slow creep on past the apex, the visible 80-120 ms hold, ending still;
 * - the strike: ONE centripetal Catmull-Rom curve through 5-7 points, timed by an eased speed profile (a smoothstep
 *   whip-out, then a single long braking curve: the tip never slows and speeds up again mid-stroke). Arc length is
 *   tabulated once per attack, so the timing is exact whatever the reach;
 * - the recall: from where the chain stopped it to the live hand, accelerating, a snap past the hand and a settle.
 *
 * The blade's orientation is not keyed: its haft points out along the chain (from the hand) and its edge leads along
 * its travel, eased onto an authored edge direction when it barely moves, and onto the held pose near the hand.
 * Strike windows and cue times (`AxeMotion.cue`) come from the same tables, so collision, FX, sound and the body agree.
 * The return is deliberately harmless: dodging a throw buys a punish window. Reach is fixed at attack entry.
 */

export type AxeAttack = 'ATTACK_1' | 'ATTACK_2' | 'ATTACK_3';
/** A point: [x, x per metre of reach, y, z, z per metre of reach]. */
type Pt = readonly [number, number, number, number, number];
type V3 = readonly [number, number, number];
/** A keyed scalar: times and values (Catmull-Rom in time, flat outside). */
export interface Keys { readonly t: readonly number[]; readonly v: readonly number[] }
/** The right hand's IK target (boss-local) and how much of it the arm takes over from the clip. */
export interface ArmKeys { readonly t: readonly number[]; readonly p: readonly V3[]; readonly w: readonly number[] }
export interface AxeWindow { t0: number; t1: number }

interface AttackSpec {
  c1: Pt; c2: Pt; apex: Pt; tApex: number;
  coil: Pt; tWhip: number;
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
   * (+ ahead) and rise, the front legs' lift, and the blade's heat (0..1). */
  twist: Keys; lean: Keys; lunge: Keys; rise: Keys; legs: Keys; heat: Keys;
  arm: ArmKeys;
}

/** The hand, as authored (the attack clips' hold): recall timing is planned from it, so it is the same every time. */
const HAND_NOMINAL = new THREE.Vector3(-0.65, 2.3, 1.0);
const REST_ARM: V3 = [-0.62, 2.28, 0.98];

const SPECS: Record<AxeAttack, AttackSpec> = {
  // The sweep: from high behind her right shoulder, diagonally down across her front to knee height, through and
  // round to her left, where the chain stops it.
  ATTACK_1: {
    c1: [-1.1, 0, 2.5, 0.95, 0], c2: [-1.55, 0, 3.2, 0.35, 0], apex: [-1.3, 0, 3.4, -0.35, 0], tApex: 0.32,
    coil: [-1.35, 0, 3.46, -0.44, 0], tWhip: 0.42,
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
    nominalLength: 8.1,
    windows: [{ t0: 0.52, t1: 0.9 }],
    plants: false,
    twist: { t: [0, 0.32, 0.42, 0.52, 0.7, 0.92, 1.15, 1.4, 1.65], v: [0, -30, -34, -8, 22, 28, 12, -3, 0] },
    lean: { t: [0, 0.32, 0.42, 0.55, 0.8, 1.12, 1.55], v: [0, -10, -12, 5, 9, 3, 0] },
    lunge: { t: [0, 0.38, 0.56, 0.85, 1.25, 1.6], v: [0, -0.05, 0.07, 0.05, 0, 0] },
    rise: { t: [0, 0.38, 0.75, 1.25], v: [0, 0.03, -0.04, 0] },
    legs: { t: [0, 1], v: [0, 0] },
    heat: { t: [0, 0.24, 0.36, 0.9, 1.2, 1.7], v: [0.1, 0.55, 1, 1, 0.55, 0.12] },
    arm: {
      t: [0, 0.12, 0.32, 0.42, 0.54, 0.78, 1.02, 1.1, 1.36, 1.58, 1.72],
      p: [REST_ARM, [-0.85, 2.45, 0.75], [-1.0, 2.75, 0.3], [-1.02, 2.8, 0.24], [-0.5, 2.35, 1.25], [0.12, 2.05, 1.22],
        [0.2, 2.1, 1.02], [0.05, 2.15, 1.05], [-0.62, 2.32, 0.85], REST_ARM, REST_ARM],
      w: [0, 1, 1, 1, 1, 1, 1, 1, 1, 0.6, 0],
    },
  },
  // The slam: up over her head and behind it, then a curved overhead arc down onto the floor at his feet.
  ATTACK_2: {
    c1: [-0.95, 0, 2.95, 1.0, 0], c2: [-0.85, 0, 3.9, 0.4, 0], apex: [-0.5, 0, 4.1, -0.5, 0], tApex: 0.34,
    coil: [-0.47, 0, 4.16, -0.6, 0], tWhip: 0.45,
    path: [
      [-0.35, 0, 4.55, 0.55, 0],
      [-0.22, 0, 3.7, 0.05, 0.6],
      [-0.14, 0, 1.75, 0.1, 0.9],
      [-0.1, 0, 0.62, 0.05, 1.0],
    ],
    tStop: 0.96, whip: 0.12, brake: 12,
    recoil: 0.0, drop: 0.0, tRecall: 1.16,
    recallBase: 0.22, recallPerMetre: 0.06, bulge: [-0.55, 0.85, 0.0], bulgeSize: 0.14,
    nominalLength: 5.8,
    windows: [{ t0: 0.62, t1: 0.97 }],
    plants: true,
    twist: { t: [0, 0.34, 0.45, 0.62, 0.85, 1.2, 1.7], v: [0, -12, -14, 3, 6, 2, 0] },
    lean: { t: [0, 0.34, 0.45, 0.65, 0.85, 1.08, 1.4, 1.8], v: [0, -16, -19, 10, 22, 18, 4, 0] },
    lunge: { t: [0, 0.4, 0.85, 1.12, 1.6], v: [0, -0.04, 0.1, 0.06, 0] },
    rise: { t: [0, 0.4, 0.62, 0.86, 1.12, 1.6], v: [0, 0.07, 0.03, -0.1, -0.05, 0] },
    legs: { t: [0, 0.34, 0.47, 0.7, 0.86, 1.12, 1.6], v: [0, 24, 28, 8, -2, -1.5, 0] },
    heat: { t: [0, 0.24, 0.38, 0.9, 1.25, 1.8], v: [0.1, 0.55, 1, 1, 0.6, 0.12] },
    arm: {
      t: [0, 0.14, 0.34, 0.45, 0.6, 0.85, 1.12, 1.18, 1.38, 1.62, 1.78],
      p: [REST_ARM, [-0.85, 2.75, 0.85], [-0.55, 3.2, 0.45], [-0.5, 3.25, 0.35], [-0.35, 2.65, 1.3], [-0.25, 2.0, 1.45],
        [-0.25, 2.02, 1.4], [-0.3, 2.1, 1.3], [-0.62, 2.35, 0.82], REST_ARM, REST_ARM],
      w: [0, 1, 1, 1, 1, 1, 1, 1, 1, 0.6, 0],
    },
  },
  // The throw: drawn back low past her right hip, flung out on a curve that bends in onto him, stopped hard by the
  // chain at full stretch, and hauled back round her left on the other side of the loop.
  ATTACK_3: {
    c1: [-1.05, 0, 2.25, 0.85, 0], c2: [-1.6, 0, 2.1, 0.05, 0], apex: [-1.4, 0, 2.3, -0.7, 0], tApex: 0.33,
    coil: [-1.36, 0, 2.34, -0.8, 0], tWhip: 0.43,
    path: [
      [-1.85, 0, 2.0, 0.5, 0],
      [-0.3, -0.3, 1.55, 0.1, 0.5],
      [0, -0.1, 1.3, 0, 0.85],
      [0.15, 0, 1.2, 0.15, 1.0],
    ],
    tStop: 0.88, whip: 0.12, brake: 7,
    recoil: 0.35, drop: 0.15, tRecall: 1.0,
    recallBase: 0.2, recallPerMetre: 0.06, bulge: [1.0, 0.25, 0.0], bulgeSize: 0.16,
    nominalLength: 6.0,
    windows: [{ t0: 0.52, t1: 0.98 }],
    plants: false,
    twist: { t: [0, 0.33, 0.43, 0.53, 0.7, 0.98, 1.22, 1.38, 1.7], v: [0, -28, -32, 4, 14, 10, -2, -10, 0] },
    lean: { t: [0, 0.33, 0.43, 0.55, 0.72, 1.05, 1.45, 1.8], v: [0, -8, -9, 10, 12, 6, -3, 0] },
    lunge: { t: [0, 0.33, 0.43, 0.58, 0.89, 1.1, 1.6], v: [0, -0.08, -0.1, 0.2, 0.18, 0.08, 0] },
    rise: { t: [0, 0.42, 0.62, 1.2], v: [0, 0.02, -0.03, 0] },
    legs: { t: [0, 0.42, 0.58, 0.9, 1.3], v: [0, 6, -3, -2, 0] },
    heat: { t: [0, 0.24, 0.36, 1.0, 1.35, 1.9], v: [0.1, 0.55, 1, 1, 0.55, 0.12] },
    arm: {
      t: [0, 0.12, 0.33, 0.43, 0.56, 0.89, 1.0, 1.12, 1.4, 1.64, 1.8],
      p: [REST_ARM, [-0.85, 2.3, 0.8], [-0.98, 2.35, 0.2], [-1.0, 2.36, 0.12], [-0.35, 2.3, 1.5], [-0.2, 2.25, 1.55],
        [-0.28, 2.25, 1.45], [-0.4, 2.3, 1.25], [-0.65, 2.36, 0.8], REST_ARM, REST_ARM],
      w: [0, 1, 1, 1, 1, 1, 1, 1, 1, 0.6, 0],
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
export const HOLD_ROTATION = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.3);

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
const _ctrl = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

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

/** The recall's share of the way home at `u` (0..1): accelerating, past the hand by `over` (a share), and settling. */
export function recallProgress(u: number, over: number): number {
  const k = THREE.MathUtils.clamp(u, 0, 1);
  if (k <= RECALL_CROSS) return (1 + over) * Math.pow(k / RECALL_CROSS, RECALL_POW);
  const x = (k - RECALL_CROSS) / (1 - RECALL_CROSS);
  return 1 + over * (1 - x) * (1 - x) * (1 + 2 * x);
}

/** Its flight time for `distance` metres (s). */
export function recallTime(distance: number, base = 0.2, perMetre = 0.045): number {
  return base + perMetre * distance;
}

/** The overshoot past the hand, as a share of `distance`: a few centimetres, never a third of a throw. */
function overshoot(distance: number): number {
  return distance > 1e-3 ? Math.min(0.17, 0.06 * distance) / distance : 0;
}

/** Catmull-Rom through `keys` at `t` (flat beyond the ends). */
export function sampleKeys(keys: Keys, t: number): number {
  const ts = keys.t, vs = keys.v, n = ts.length;
  if (t <= ts[0]) return vs[0];
  if (t >= ts[n - 1]) return vs[n - 1];
  let i = 0;
  while (i < n - 2 && t > ts[i + 1]) i++;
  const t1 = ts[i], t2 = ts[i + 1];
  const u = (t - t1) / (t2 - t1);
  const v0 = vs[Math.max(0, i - 1)], v1 = vs[i], v2 = vs[i + 1], v3 = vs[Math.min(n - 1, i + 2)];
  const t0 = ts[Math.max(0, i - 1)], t3 = ts[Math.min(n - 1, i + 2)];
  // Tangents scaled to this span's length (non-uniform knots), so uneven key spacing does not overshoot.
  const m1 = i > 0 ? ((v2 - v0) / (t2 - t0)) * (t2 - t1) : v2 - v1;
  const m2 = i + 2 < n ? ((v3 - v1) / (t3 - t1)) * (t2 - t1) : v2 - v1;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * v2 + (u3 - u2) * m2;
}

/** The arm's IK target at `t` into `out`, and its weight (0: the clip's arm). */
export function sampleArm(arm: ArmKeys, t: number, out: THREE.Vector3): number {
  const ts = arm.t, n = ts.length;
  if (t <= ts[0]) { out.set(arm.p[0][0], arm.p[0][1], arm.p[0][2]); return arm.w[0]; }
  if (t >= ts[n - 1]) { out.set(arm.p[n - 1][0], arm.p[n - 1][1], arm.p[n - 1][2]); return arm.w[n - 1]; }
  let i = 0;
  while (i < n - 2 && t > ts[i + 1]) i++;
  const u = (t - ts[i]) / (ts[i + 1] - ts[i]);
  const p0 = arm.p[Math.max(0, i - 1)], p1 = arm.p[i], p2 = arm.p[i + 1], p3 = arm.p[Math.min(n - 1, i + 2)];
  for (let k = 0; k < 3; k++) {
    const m1 = (p2[k] - p0[k]) * 0.5, m2 = (p3[k] - p1[k]) * 0.5, u2 = u * u, u3 = u2 * u;
    out.setComponent(k, (2 * u3 - 3 * u2 + 1) * p1[k] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[k] + (u3 - u2) * m2);
  }
  const s = THREE.MathUtils.smoothstep(u, 0, 1);
  return arm.w[i] + (arm.w[i + 1] - arm.w[i]) * s;
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
    point(spec.coil, reach, this.pts[0]);
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
    out.home = this.recallAt + this.recallSpan * RECALL_CROSS * Math.pow(1 / (1 + overshoot(this.rest.distanceTo(HAND_NOMINAL))), 1 / RECALL_POW);
    out.settled = this.recallAt + this.recallSpan;
    out.plants = s.plants;
    return out;
  }

  /** The arc length of the strike (m) and the time (s) it lasts: its mean speed is one over the other. */
  public strikeLength(): number {
    return this.length;
  }

  /** Body layers at `t`. */
  public body(t: number, out: { twist: number; lean: number; lunge: number; rise: number; legs: number; heat: number }): void {
    const s = this.spec;
    out.twist = sampleKeys(s.twist, t);
    out.lean = sampleKeys(s.lean, t);
    out.lunge = sampleKeys(s.lunge, t);
    out.rise = sampleKeys(s.rise, t);
    out.legs = sampleKeys(s.legs, t);
    out.heat = THREE.MathUtils.clamp(sampleKeys(s.heat, t), 0, 1.2);
  }

  /** The arm's IK target (boss-local) and weight at `t`. */
  public arm(t: number, out: THREE.Vector3): number {
    return sampleArm(this.spec.arm, t, out);
  }

  /** The axe origin's position at state time `t`, the hand at `hand` (boss-local). */
  public position(t: number, hand: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    const s = this.spec;
    const r = this.reach;
    if (t <= 0) return out.copy(hand);
    if (t < s.tApex) {
      // The wind-up: a Bezier from the hand, eased in and out.
      const u = smootherstep(t / s.tApex);
      const p0 = _ctrl[0], p1 = _ctrl[1], p2 = _ctrl[2], p3 = _ctrl[3];
      p0.copy(hand);
      point(s.c1, r, p1);
      point(s.c2, r, p2);
      point(s.apex, r, p3);
      const v = 1 - u;
      return out.copy(p0).multiplyScalar(v * v * v).addScaledVector(p1, 3 * v * v * u).addScaledVector(p2, 3 * v * u * u).addScaledVector(p3, u * u * u);
    }
    if (t < s.tWhip) {
      // The coil: a slow creep on, ending still.
      const u = THREE.MathUtils.smoothstep((t - s.tApex) / (s.tWhip - s.tApex), 0, 1);
      point(s.apex, r, _a);
      point(s.coil, r, _b);
      return out.lerpVectors(_a, _b, u);
    }
    if (t < this.stop) {
      const span = this.stop - s.tWhip;
      return this.along(strikeProgress((t - s.tWhip) / span, s.whip / span, s.brake) * this.length, out);
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
   * The axe's whole pose at `t`: position (boss-local) and rotation. The haft points out along the chain, the edge
   * leads; near the hand it eases into the held pose.
   */
  public pose(state: CharacterState, t: number, hand: THREE.Vector3, position: THREE.Vector3, rotation: THREE.Quaternion): void {
    if (!isAxeAttack(state) || state !== this.state) {
      position.copy(hand);
      rotation.copy(HOLD_ROTATION);
      return;
    }
    const s = this.spec;
    this.position(t, hand, position);
    this.position(Math.max(0, t - CHORD), hand, _q);
    // Held: eased out of the hand over the first moments of the draw, and back into it over the end of the recall,
    // by time (by distance, a blade arriving at 20 m/s would whip round in a frame or two).
    const held = t < this.recallAt ? 1 - THREE.MathUtils.smoothstep(t, 0.04, 0.3)
      : THREE.MathUtils.smoothstep((t - this.recallAt) / this.recallSpan, 0.22, RECALL_CROSS * 0.97);
    // The edge: set for the strike's first span from the start (the draw carries it cocked, so nothing flips at the
    // top), led by the travel through the strike, and left along its last span once the chain has stopped it.
    const k = THREE.MathUtils.smoothstep(t, s.tWhip, this.stop);
    this.edgeNow.lerpVectors(this.edgeStart, this.edgeEnd, k);
    const travel = THREE.MathUtils.smoothstep(t, s.tWhip, s.tWhip + 0.06) * (1 - THREE.MathUtils.smoothstep(t, this.stop - 0.08, this.stop + 0.05));
    orient(position, _q, hand, this.edgeNow, CHORD, travel, held, rotation);
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
 * From `from` to the live `hand` at progress `u` (0..1 of the recall's time): accelerating home, a snap a few
 * centimetres past the hand, a settle, and an arc off the straight line (`bulge`, metres per metre) on the way.
 */
export function recallPath(from: THREE.Vector3, hand: THREE.Vector3, u: number, bulge: V3, size: number, out: THREE.Vector3): THREE.Vector3 {
  if (u >= 1) return out.copy(hand);
  const distance = from.distanceTo(hand);
  const k = recallProgress(u, overshoot(distance));
  out.lerpVectors(from, hand, k);
  const arc = Math.sin(Math.PI * Math.min(1, Math.max(0, u) / RECALL_CROSS)) * size * distance;
  return out.set(out.x + bulge[0] * arc, out.y + bulge[1] * arc, out.z + bulge[2] * arc);
}

/**
 * The blade's rotation from its travel: the haft along the chain (out from `hand`), the cutting edge (axe-local -x)
 * leading, `edge` steadying it when slow; the held pose near the hand.
 */
export function orient(position: THREE.Vector3, before: THREE.Vector3, hand: THREE.Vector3, edge: THREE.Vector3, dt: number,
  travel: number, holding: number, rotation: THREE.Quaternion): void {
  const out = _y.subVectors(position, hand);
  const reach = out.length();
  // In the hand the chain's direction means nothing: held there whatever the clock says.
  const held = Math.max(holding, 1 - THREE.MathUtils.smoothstep(reach, 0.06, 0.32));
  if (held >= 1 || reach < 1e-4) {
    rotation.copy(HOLD_ROTATION);
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
  if (held > 0) rotation.slerpQuaternions(_rq, HOLD_ROTATION, held);
  else rotation.copy(_rq);
}

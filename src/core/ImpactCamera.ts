import * as THREE from 'three';
import { Settings } from './Settings';

/*
 * The camera's share of a blow landing (docs/proposals/IMPACT_CAMERA.md): subtle, but felt. It replaces the old
 * screen shake, which moved the camera up to 20 cm at random every frame (white noise reads as glitching, and made
 * every model on screen look as if it shook).
 *
 * Three small layers, added as an offset after the follow camera (or a cutscene's shot) has been solved, so nothing
 * of it ever feeds back into where the camera aims, which way WASD runs, or the spring arm:
 *
 * - a kick: a directional nudge of a degree or less along the blow, returned by a slightly springy spring in about a
 *   quarter of a second (most of the "feel");
 * - trauma: smooth noise (layered sines, not Math.random), rotation only, as large as trauma squared, so light hits
 *   barely register and heavy ones stand out;
 * - an FOV punch: a degree or two of zoom on deflects, posture breaks and kills (widening when the hero is rocked).
 *
 * It runs on real time, so it plays out during a hit-stop while the simulation is frozen: that is what makes the
 * freeze read as impact rather than lag. The player's "Camera shake" setting (0..1) scales it: the shake by its
 * square, the kick and FOV punch linearly, so low settings are very calm; at 0 the camera is the pure solve.
 */

/** What happened (the per-event table below). */
export type ImpactKind =
  | 'hitLight' | 'hitHeavy' | 'hitSlam' | 'glance' // the hero's blows landing (slam: charged, leaping, a gada finisher)
  | 'hurt' | 'hurtHeavy' // the hero struck (heavy: a boss's finisher)
  | 'block' | 'deflect' | 'postureBreak' | 'guardBroken' // guard and parry; a posture broken (an enemy's, the hero's)
  | 'clash' // the hero's blow turned aside by a boss's guard: a short freeze and a kick back along the bounce
  | 'bossKill' | 'quake' | 'evade' // a boss's last blow; the ground shaking (a boss's roar); a slide under a blow
  | 'thud'; // a weapon brought down on stone (the mace's slam, a leaping strike): a dip, a low rumble, no side to it

/** One event's numbers. Angles in degrees, distances in metres, times in milliseconds, all at a setting of 100 %. */
export interface ImpactSpec {
  /** Hit-stop: simulated time frozen this long (CombatSystem.freeze). Not scaled by the camera setting. */
  freeze: number;
  /** Trauma added (0..1); the shake is trauma squared. */
  trauma: number;
  /** The kick's first peak along the blow. */
  kick: number;
  /** Extra kick straight down (a slam's weight). */
  dip: number;
  /** Lean into (or back from) the blow along the view, scaled by how much of the blow runs along it. */
  push: number;
  /** FOV punch (negative zooms in) held for `fovMs`, then let go. */
  fov: number;
  fovMs: number;
  /** Gamepad rumble: strong (low) motor, weak (high) motor, duration. */
  rumble: [number, number, number];
}

/** The per-event table (IMPACT_CAMERA.md, section 4). Live-editable from the console as `__debug.impactTune`. */
export const IMPACTS: Record<ImpactKind, ImpactSpec> = {
  // The hero's blows (hit feel, 2026-10-06): the hit-stop is longer than it was (it read as nothing: 40, 75, 110 ms), and
  // each weapon then bends these numbers to its own (combat/HitFeel.ts: the staff cracks, the blade slices, the mace crushes).
  hitLight: { freeze: 65, trauma: 0.1, kick: 0.25, dip: 0, push: 0, fov: 0, fovMs: 0, rumble: [0, 0.15, 50] },
  hitHeavy: { freeze: 95, trauma: 0.3, kick: 0.55, dip: 0.15, push: 0.02, fov: -0.8, fovMs: 150, rumble: [0.35, 0.3, 110] },
  hitSlam: { freeze: 130, trauma: 0.45, kick: 0.4, dip: 0.9, push: 0.04, fov: -1.5, fovMs: 200, rumble: [0.7, 0.4, 170] },
  glance: { freeze: 45, trauma: 0.06, kick: 0.2, dip: 0, push: 0, fov: 0, fovMs: 0, rumble: [0, 0.2, 40] },
  hurt: { freeze: 60, trauma: 0.25, kick: 0.6, dip: 0, push: 0.02, fov: 0, fovMs: 0, rumble: [0.4, 0.3, 120] },
  hurtHeavy: { freeze: 90, trauma: 0.45, kick: 1.0, dip: 0, push: 0.03, fov: 1, fovMs: 200, rumble: [0.75, 0.4, 200] },
  block: { freeze: 30, trauma: 0.08, kick: 0.35, dip: 0, push: 0.01, fov: 0, fovMs: 0, rumble: [0.1, 0.35, 60] },
  deflect: { freeze: 90, trauma: 0.12, kick: 0.5, dip: 0, push: 0.02, fov: -1.5, fovMs: 120, rumble: [0.15, 0.7, 60] },
  clash: { freeze: 75, trauma: 0.14, kick: 0.55, dip: 0, push: 0.01, fov: 0, fovMs: 0, rumble: [0.25, 0.5, 90] },
  postureBreak: { freeze: 140, trauma: 0.35, kick: 0.7, dip: 0, push: 0.03, fov: -2, fovMs: 260, rumble: [0.5, 0.5, 180] },
  guardBroken: { freeze: 100, trauma: 0.4, kick: 0.9, dip: 0, push: 0.03, fov: 1.5, fovMs: 250, rumble: [0.7, 0.3, 220] },
  bossKill: { freeze: 200, trauma: 0.65, kick: 1.2, dip: 0, push: 0.04, fov: -3, fovMs: 1400, rumble: [1, 0.6, 350] },
  quake: { freeze: 0, trauma: 0.45, kick: 0, dip: 0, push: 0, fov: 0, fovMs: 0, rumble: [0.4, 0, 250] },
  evade: { freeze: 0, trauma: 0, kick: 0, dip: 0, push: 0, fov: -1, fovMs: 200, rumble: [0, 0.1, 40] },
  thud: { freeze: 55, trauma: 0.2, kick: 0, dip: 0.55, push: 0.01, fov: 0, fovMs: 0, rumble: [0.5, 0.15, 90] },
};

export interface ImpactOptions {
  /** World direction the force travels (attacker to victim). Without one the event only shakes (and dips). */
  dir?: THREE.Vector3;
  /** Multiplies the event (damage-scaled, distance-scaled). */
  scale?: number;
  /** This event's numbers instead of the table's (a weapon's own: combat/HitFeel.ts). */
  spec?: ImpactSpec;
}

const DEG = Math.PI / 180;
/** Trauma lost per second (linear). */
const TRAUMA_DECAY = 1.6;
/** Shake at trauma 1 (degrees) and its frequency (Hz): 8 to 12 reads as weight, 20 and up as buzz. */
const MAX_YAW = 2.5;
const MAX_PITCH = 2.0;
const MAX_ROLL = 3.0;
const FREQ = 11;
/** The kick's spring (slightly underdamped: one small rebound) and the FOV punch's (no visible rebound). */
const KICK_OMEGA = 32;
const KICK_ZETA = 0.6;
const FOV_OMEGA = 22;
const FOV_ZETA = 0.8;
/** First peak of the kick spring per unit of impulse velocity (v0 / omega_d * e^(-zeta omega t) sin(omega_d t)). */
const KICK_PEAK = 0.0156;
/** However many kicks stack, the total stays within this (degrees). */
const MAX_KICK = 1.5;
/** Springs are integrated in substeps no longer than this, so the feel is the same at 30, 60 or 144 Hz. */
const SUBSTEP = 1 / 240;

interface Spring {
  x: number;
  v: number;
}

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _d = new THREE.Vector3();
const _inv = new THREE.Quaternion();

/** Smooth noise in about -1..1: three sines at incommensurate rates, a different phase set per axis. */
function noise(t: number, axis: number): number {
  const p = axis * 2.17;
  return (Math.sin(t * 0.62 * Math.PI * 2 + p) + 0.7 * Math.sin(t * 1.0 * Math.PI * 2 + p * 1.7 + 1.3)
    + 0.45 * Math.sin(t * 1.53 * Math.PI * 2 + p * 2.9 + 0.4)) / 2.15;
}

function springStep(s: Spring, target: number, dt: number, omega: number, zeta: number): void {
  s.v += (omega * omega * (target - s.x) - 2 * zeta * omega * s.v) * dt;
  s.x += s.v * dt;
}

export class ImpactCamera {
  private trauma = 0;
  private t = 0;
  private readonly yaw: Spring = { x: 0, v: 0 };
  private readonly pitch: Spring = { x: 0, v: 0 };
  private readonly roll: Spring = { x: 0, v: 0 };
  private readonly push: Spring = { x: 0, v: 0 };
  private readonly fov: Spring = { x: 0, v: 0 };
  private fovTarget = 0;
  private fovUntil = 0;
  /** What the last `apply` added (for the jitter probe and tests): degrees of rotation, metres of push, FOV degrees. */
  public readonly offset = { angle: 0, push: 0, fov: 0 };

  /** An event from the table, along `opts.dir` (world) as seen from `camera`. */
  public impact(kind: ImpactKind, camera: THREE.Camera, opts: ImpactOptions = {}): void {
    const spec = opts.spec ?? IMPACTS[kind];
    const scale = opts.scale ?? 1;
    this.addTrauma(spec.trauma * scale);
    let into = 1;
    if (opts.dir && opts.dir.lengthSq() > 1e-8 && spec.kick > 0) {
      // The force in the camera's frame: x right, y up, -z into the screen.
      const d = _d.copy(opts.dir).normalize().applyQuaternion(_inv.copy(camera.quaternion).invert());
      into = -d.z;
      // The view goes with the force: across the screen it turns that way; into the screen it nods down into it, and
      // a blow coming at the camera knocks it up and back.
      const yaw = -d.x;
      const pitch = d.y - into * 0.7;
      const len = Math.hypot(yaw, pitch) || 1;
      this.kick((yaw / len) * spec.kick * scale, (pitch / len) * spec.kick * scale, (-d.x * 0.5) * spec.kick * scale);
    }
    if (spec.dip > 0) this.kick(0, -spec.dip * scale, 0);
    if (spec.push > 0) this.push.v += (spec.push * scale * into) / KICK_PEAK;
    if (spec.fov !== 0) this.punchFov(spec.fov * Math.min(scale, 1.4), spec.fovMs);
  }

  /** A directional nudge whose first peak is `yaw`, `pitch`, `roll` degrees (positive yaw turns left, pitch up). */
  public kick(yaw: number, pitch: number, roll: number): void {
    this.yaw.v += (yaw * DEG) / KICK_PEAK;
    this.pitch.v += (pitch * DEG) / KICK_PEAK;
    this.roll.v += (roll * DEG) / KICK_PEAK;
  }

  /** Raw trauma (a boss's roar, a cutscene's footfall): it adds up, to at most 1. */
  public addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + Math.max(0, amount));
  }

  /** Narrows (negative) or widens the view by `degrees`, held `ms` and then let go. The stronger punch wins. */
  public punchFov(degrees: number, ms: number): void {
    if (this.t < this.fovUntil && Math.abs(degrees) < Math.abs(this.fovTarget)) return;
    this.fovTarget = degrees;
    this.fovUntil = this.t + ms / 1000;
  }

  /** Once per rendered frame, wall-clock seconds (it keeps playing through a hit-stop). */
  public update(dt: number): void {
    if (dt <= 0) return;
    this.t += dt;
    this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY * dt);
    if (this.t >= this.fovUntil) this.fovTarget = 0;
    const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      for (const s of [this.yaw, this.pitch, this.roll, this.push]) springStep(s, 0, h, KICK_OMEGA, KICK_ZETA);
      springStep(this.fov, this.fovTarget, h, FOV_OMEGA, FOV_ZETA);
    }
    for (const s of [this.yaw, this.pitch, this.roll]) {
      if (Math.abs(s.x) > MAX_KICK * DEG) {
        s.x = Math.sign(s.x) * MAX_KICK * DEG;
        if (Math.sign(s.v) === Math.sign(s.x)) s.v = 0;
      }
    }
  }

  /**
   * Adds the offset to a camera already placed for this frame. `arm`: how much room there is behind the camera's
   * focus (the follow camera's spring arm); the push shrinks with it, so a camera pulled in against a wall never
   * leans through it.
   */
  public apply(camera: THREE.PerspectiveCamera, arm = 3.4): void {
    const s = THREE.MathUtils.clamp(Settings.get().cameraShake, 0, 1);
    this.offset.angle = this.offset.push = this.offset.fov = 0;
    if (s <= 0) return;
    const shake = this.trauma * this.trauma * s;
    const ft = this.t * FREQ;
    const yaw = (MAX_YAW * DEG * shake * noise(ft, 0) + this.yaw.x) * s;
    const pitch = (MAX_PITCH * DEG * shake * noise(ft, 1) + this.pitch.x) * s;
    const roll = (MAX_ROLL * DEG * shake * noise(ft * 0.8, 2) + this.roll.x) * s;
    if (yaw !== 0 || pitch !== 0 || roll !== 0) {
      camera.quaternion.multiply(_q.setFromEuler(_e.set(pitch, yaw, roll, 'YXZ')));
    }
    const room = THREE.MathUtils.clamp((arm - 0.8) / 2.6, 0, 1);
    const push = this.push.x * room * s;
    if (push !== 0) camera.translateZ(-push);
    const fov = this.fov.x * s;
    if (Math.abs(fov) > 1e-3) {
      camera.fov += fov;
      camera.updateProjectionMatrix();
    }
    this.offset.angle = Math.hypot(yaw, pitch, roll) / DEG;
    this.offset.push = push;
    this.offset.fov = fov;
  }

  /** Nothing carried over (a chapter loading, a cut into or out of a cutscene, the title). */
  public reset(): void {
    this.trauma = 0;
    for (const s of [this.yaw, this.pitch, this.roll, this.push, this.fov]) s.x = s.v = 0;
    this.fovTarget = 0;
    this.fovUntil = 0;
  }
}

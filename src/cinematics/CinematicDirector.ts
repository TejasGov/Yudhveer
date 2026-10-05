import * as THREE from 'three';
import { ImpactCamera } from '../core/ImpactCamera';

/** A camera pose on a shot's path. */
export interface CameraKey {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov?: number;
  /** A Dutch angle, radians: positive tips the horizon down to the right (a dazed head on its side). */
  roll?: number;
}

/**
 * The cutscene camera's own impacts, apart from the gameplay camera's: a shot is only ever shaken by its own cues, never
 * by what the fight was doing as it cut in.
 */
const cutsceneImpact = new ImpactCamera();

/**
 * Jolts the cutscene camera (a footfall felt through the ground, a blow landing): `amount` is the old scale of the
 * shake in metres (0.16 for a blow to the head, 0.025 for a giant's step). It is now smooth, rotational trauma that
 * dies away by itself (`seconds` is kept for the cues that pass it), plus a downward nudge for a real blow; scaled, like
 * all camera shake, by the player's setting.
 */
export function joltCamera(amount: number, _seconds = 0.35): void {
  // Trauma is squared into shake: the root keeps a footfall's jolt as small, and a blow's as large, as they were.
  cutsceneImpact.addTrauma(Math.sqrt(Math.max(0, amount) / 0.16) * 0.66);
  if (amount >= 0.1) cutsceneImpact.kick(0, -0.8 * Math.min(1, amount / 0.16), 0.3);
}

/** One shot: the camera travels through its keys (a smooth curve) over `duration` seconds. */
export interface Shot {
  duration: number;
  /** The camera's path, or a function giving it when the shot starts (to frame characters where they stand then). */
  keys: CameraKey[] | (() => CameraKey[]);
  /** Easing over the whole path (default: ease in and out). */
  ease?: (t: number) => number;
  /** Handheld drift, metres (default 0.03). */
  sway?: number;
  /** Things that happen during the shot, at seconds from its start. */
  cues?: { at: number; run: () => void }[];
  /** Fade from black at the start / to black at the end (seconds; 0 is a hard cut). */
  fadeIn?: number;
  fadeOut?: number;
  /** Past `duration`, the camera holds its last pose while this is true (a line still being spoken). */
  holdWhile?: () => boolean;
  /** Ends the shot early once true (the player has read ahead). */
  endWhen?: () => boolean;
}

export const ease = {
  inOut: (t: number) => t * t * (3 - 2 * t),
  out: (t: number) => 1 - (1 - t) * (1 - t),
  in: (t: number) => t * t,
  linear: (t: number) => t,
  /** Slow drift that keeps moving to the very end (long establishing shots). */
  drift: (t: number) => 0.15 * t + 0.85 * (t * t * (3 - 2 * t)),
};

interface Prepared {
  shot: Shot;
  path: THREE.CatmullRomCurve3;
  look: THREE.CatmullRomCurve3;
  fov: number[];
  roll: number[];
  cuesFired: Set<number>;
}

/**
 * Plays a cutscene: a list of shots driving the camera, with cues (a roar, a title card) at set times. The caller
 * runs `update` every rendered frame while it is active; `fade` reports how black the screen should be.
 */
export class CinematicDirector {
  private shots: Shot[] = [];
  /** The current shot, its path built when it starts. */
  private current: Prepared | null = null;
  private index = 0;
  private time = 0;
  private onDone: (() => void) | null = null;
  private readonly sway = new THREE.Vector3();
  private elapsed = 0;
  public active = false;
  /** 0 (clear) .. 1 (black), for the overlay. */
  public fade = 0;

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  public play(shots: Shot[], onDone: () => void): void {
    this.shots = shots.filter((s) => typeof s.keys === 'function' || s.keys.length > 0);
    this.index = 0;
    this.time = 0;
    this.elapsed = 0;
    this.onDone = onDone;
    this.active = this.shots.length > 0;
    cutsceneImpact.reset();
    if (!this.active) {
      this.current = null;
      onDone();
    } else {
      this.enter(0);
      this.apply();
    }
  }

  /**
   * Starts shot `index`. Its cues at 0 s run first (someone put on a mark off camera), then its path is built from
   * where things stand.
   */
  private enter(index: number): void {
    this.index = index;
    const shot = this.shots[index];
    const cuesFired = new Set<number>();
    (shot.cues ?? []).forEach((cue, i) => {
      if (cue.at > 0) return;
      cuesFired.add(i);
      cue.run();
    });
    let keys = typeof shot.keys === 'function' ? shot.keys() : shot.keys;
    if (keys.length === 0) keys = [{ pos: this.camera.position.clone(), look: this.focusAhead() }];
    if (keys.length === 1) keys = [keys[0], keys[0]];
    this.current = {
      shot,
      path: new THREE.CatmullRomCurve3(keys.map((k) => k.pos), false, 'centripetal'),
      look: new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, 'centripetal'),
      fov: keys.map((k) => k.fov ?? 45),
      roll: keys.map((k) => k.roll ?? 0),
      cuesFired,
    };
  }

  /** A point straight ahead of the camera (a shot with no keys holds the frame it inherits). */
  private focusAhead(): THREE.Vector3 {
    return this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10).add(this.camera.position);
  }

  /** Ends the cutscene now (cues not yet fired are skipped; the caller settles the scene). */
  public skip(): void {
    if (!this.active) return;
    this.finish();
  }

  /** Jumps to shot `index` at `time` seconds, firing that shot's cues up to then (tuning shots by hand). */
  public seek(index: number, time: number): void {
    if (!this.active) return;
    this.enter(THREE.MathUtils.clamp(index, 0, this.shots.length - 1));
    this.time = time;
    const p = this.current!;
    (p.shot.cues ?? []).forEach((cue, i) => {
      if (!p.cuesFired.has(i) && cue.at <= time) {
        p.cuesFired.add(i);
        cue.run();
      }
    });
    this.apply();
  }

  /** Where the current shot is looking (the shadow light follows it). */
  public focus(): THREE.Vector3 {
    const p = this.current;
    if (!p) return new THREE.Vector3();
    return p.look.getPoint(this.progress(p));
  }

  public update(dt: number): void {
    if (!this.active) return;
    this.time += dt;
    this.elapsed += dt;
    cutsceneImpact.update(dt);
    const p = this.current!;
    for (const [i, cue] of (p.shot.cues ?? []).entries()) {
      if (!p.cuesFired.has(i) && this.time >= cue.at) {
        p.cuesFired.add(i);
        cue.run();
        if (!this.active || this.current !== p) return; // the cue ended the cutscene
      }
    }
    const held = this.time >= p.shot.duration && !!p.shot.holdWhile?.();
    if (held) this.time = p.shot.duration;
    const early = p.shot.endWhen?.() ?? false;
    if ((this.time >= p.shot.duration && !held) || early) {
      // A shot cut short starts the next one from its beginning; a finished one carries the overshoot.
      this.time = early ? 0 : this.time - p.shot.duration;
      if (this.index + 1 >= this.shots.length) {
        this.finish();
        return;
      }
      this.enter(this.index + 1);
    }
    this.apply();
  }

  private progress(p: Prepared): number {
    const t = THREE.MathUtils.clamp(this.time / p.shot.duration, 0, 1);
    return (p.shot.ease ?? ease.inOut)(t);
  }

  private apply(): void {
    const p = this.current!;
    const u = this.progress(p);
    const pos = p.path.getPoint(u);
    const look = p.look.getPoint(u);
    // Handheld: slow, layered sines so the frame breathes without wobbling.
    const amp = p.shot.sway ?? 0.03;
    const e = this.elapsed;
    this.sway.set(Math.sin(e * 0.71) + Math.sin(e * 1.33) * 0.4, Math.sin(e * 0.53 + 1.7) * 0.8, Math.sin(e * 0.61 + 0.6)).multiplyScalar(amp);
    this.camera.position.copy(pos).add(this.sway);
    this.camera.lookAt(look);
    const f = u * (p.fov.length - 1);
    const i = Math.min(Math.floor(f), p.fov.length - 2);
    const fov = THREE.MathUtils.lerp(p.fov[i], p.fov[i + 1], f - i);
    const roll = THREE.MathUtils.lerp(p.roll[i], p.roll[i + 1], f - i);
    if (roll !== 0) this.camera.rotateZ(roll);
    if (Math.abs(this.camera.fov - fov) > 1e-3) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    // The shot's own jolts, on top of its framing (no push: a cutscene camera has no arm to lean along).
    cutsceneImpact.apply(this.camera, 0);
    const fadeIn = p.shot.fadeIn ?? 0;
    const fadeOut = p.shot.fadeOut ?? 0;
    const inF = fadeIn > 0 ? 1 - THREE.MathUtils.clamp(this.time / fadeIn, 0, 1) : 0;
    const outF = fadeOut > 0 ? THREE.MathUtils.clamp((this.time - (p.shot.duration - fadeOut)) / fadeOut, 0, 1) : 0;
    this.fade = Math.max(inF, outF);
  }

  private finish(): void {
    cutsceneImpact.reset();
    this.active = false;
    this.current = null;
    this.fade = 0;
    const done = this.onDone;
    this.onDone = null;
    done?.();
  }
}

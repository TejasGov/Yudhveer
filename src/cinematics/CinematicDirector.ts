import * as THREE from 'three';

/** A camera pose on a shot's path. */
export interface CameraKey {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov?: number;
}

/** One shot: the camera travels through its keys (a smooth curve) over `duration` seconds. */
export interface Shot {
  duration: number;
  keys: CameraKey[];
  /** Easing over the whole path (default: ease in and out). */
  ease?: (t: number) => number;
  /** Handheld drift, metres (default 0.03). */
  sway?: number;
  /** Things that happen during the shot, at seconds from its start. */
  cues?: { at: number; run: () => void }[];
  /** Fade from black at the start / to black at the end (seconds; 0 is a hard cut). */
  fadeIn?: number;
  fadeOut?: number;
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
  cuesFired: Set<number>;
}

/**
 * Plays a cutscene: a list of shots driving the camera, with cues (a roar, a title card) at set times. The caller
 * runs `update` every rendered frame while it is active; `fade` reports how black the screen should be.
 */
export class CinematicDirector {
  private shots: Prepared[] = [];
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
    this.shots = shots.filter((s) => s.keys.length > 0).map((shot) => {
      const keys = shot.keys.length === 1 ? [shot.keys[0], shot.keys[0]] : shot.keys;
      return {
        shot,
        path: new THREE.CatmullRomCurve3(keys.map((k) => k.pos), false, 'centripetal'),
        look: new THREE.CatmullRomCurve3(keys.map((k) => k.look), false, 'centripetal'),
        fov: keys.map((k) => k.fov ?? 45),
        cuesFired: new Set(),
      };
    });
    this.index = 0;
    this.time = 0;
    this.elapsed = 0;
    this.onDone = onDone;
    this.active = this.shots.length > 0;
    if (!this.active) onDone();
    else this.apply();
  }

  /** Ends the cutscene now (cues not yet fired are skipped; the caller settles the scene). */
  public skip(): void {
    if (!this.active) return;
    this.finish();
  }

  /** Jumps to shot `index` at `time` seconds, firing that shot's cues up to then (tuning shots by hand). */
  public seek(index: number, time: number): void {
    if (!this.active) return;
    this.index = THREE.MathUtils.clamp(index, 0, this.shots.length - 1);
    this.time = time;
    const p = this.shots[this.index];
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
    const p = this.shots[this.index];
    if (!p) return new THREE.Vector3();
    return p.look.getPoint(this.progress(p));
  }

  public update(dt: number): void {
    if (!this.active) return;
    this.time += dt;
    this.elapsed += dt;
    let p = this.shots[this.index];
    for (const [i, cue] of (p.shot.cues ?? []).entries()) {
      if (!p.cuesFired.has(i) && this.time >= cue.at) {
        p.cuesFired.add(i);
        cue.run();
      }
    }
    if (this.time >= p.shot.duration) {
      this.index++;
      this.time -= p.shot.duration;
      if (this.index >= this.shots.length) {
        this.finish();
        return;
      }
      p = this.shots[this.index];
    }
    this.apply();
  }

  private progress(p: Prepared): number {
    const t = THREE.MathUtils.clamp(this.time / p.shot.duration, 0, 1);
    return (p.shot.ease ?? ease.inOut)(t);
  }

  private apply(): void {
    const p = this.shots[this.index];
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
    if (Math.abs(this.camera.fov - fov) > 1e-3) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    const fadeIn = p.shot.fadeIn ?? 0;
    const fadeOut = p.shot.fadeOut ?? 0;
    const inF = fadeIn > 0 ? 1 - THREE.MathUtils.clamp(this.time / fadeIn, 0, 1) : 0;
    const outF = fadeOut > 0 ? THREE.MathUtils.clamp((this.time - (p.shot.duration - fadeOut)) / fadeOut, 0, 1) : 0;
    this.fade = Math.max(inF, outF);
  }

  private finish(): void {
    this.active = false;
    this.fade = 0;
    const done = this.onDone;
    this.onDone = null;
    done?.();
  }
}

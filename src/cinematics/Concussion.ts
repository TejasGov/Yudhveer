import * as THREE from 'three';
import { SceneManager } from '../core/SceneManager';
import { SoundFX } from '../combat/SoundFX';
import { joltCamera } from './CinematicDirector';
import { SceneFX } from './SceneFX';

/*
 * A blow to the head, seen and heard from inside it (docs/STORY.md, "The prologue's ending"): the picture swims in and
 * out of focus, doubles, smears its colours toward the edges, darkens at the rim and drains of colour; the eyelids
 * blink and sink; the world goes dull and far off under a ringing in the ears. Scene cues drive it (`hit`, `daze`,
 * `focus`, `blink`, `lids`, `end`); it runs on the game's clock (SceneFX, so `__debug.advance` steps it) and is undone
 * when it ends, when the scene is skipped (its last shot's essential `end`) and when the chapter is left.
 *
 * The look is the post pass in core/postfx/ConcussionEffect.ts; this file only decides how much of it, when.
 */

interface State {
  /** How dazed, 0..1 (eased toward `levelTo`). */
  level: number;
  levelTo: number;
  levelRate: number;
  /** A blow's surge on top of the daze, dying away. */
  spike: number;
  flash: number;
  /** Fighting to focus: 0 the daze's own blur .. 1 sharp. */
  clear: number;
  clearTo: number;
  clearRate: number;
  /** The eyelids, 0 open .. 1 shut, toward `lidTo`; a blink overrides them for a moment. */
  lid: number;
  lidTo: number;
  lidRate: number;
  blink: { t: number; close: number; hold: number; open: number } | null;
  /** Seconds since it started (the swim of the focus). */
  t: number;
  /** The hearing last set (only changed when it moves). */
  heard: number;
}

const fresh = (): State => ({
  level: 0, levelTo: 0, levelRate: 1, spike: 0, flash: 0, clear: 0, clearTo: 0, clearRate: 4,
  lid: 0, lidTo: 0, lidRate: 1, blink: null, t: 0, heard: 0,
});

let s = fresh();
let running = false;
const ghost = new THREE.Vector2();

const toward = (x: number, to: number, rate: number, dt: number) => (x < to ? Math.min(to, x + rate * dt) : Math.max(to, x - rate * dt));

function effect() {
  return SceneManager.getInstance().postFX.concussion;
}

/** Back to clear eyes and ears at once, and stop. */
function reset(): void {
  s = fresh();
  running = false;
  effect().reset();
  SoundFX.getInstance().muffle(0, 0.3);
}

/** One step: ease everything toward its target, then set the picture and the hearing. False once it is all gone. */
function step(dt: number): boolean {
  if (!running) return false;
  s.t += dt;
  s.level = toward(s.level, s.levelTo, s.levelRate, dt);
  s.clear = toward(s.clear, s.clearTo, s.clearRate, dt);
  s.lid = toward(s.lid, s.lidTo, s.lidRate, dt);
  s.spike = Math.max(0, s.spike - dt * 0.55);
  s.flash = Math.max(0, s.flash - dt * 4.5);
  let lid = s.lid;
  if (s.blink) {
    const b = s.blink;
    b.t += dt;
    const k = b.t < b.close ? b.t / b.close : b.t < b.close + b.hold ? 1 : 1 - (b.t - b.close - b.hold) / b.open;
    if (b.t >= b.close + b.hold + b.open) s.blink = null;
    else lid = Math.max(lid, THREE.MathUtils.smoothstep(k, 0, 1));
  }
  apply(lid);
  const done = s.levelTo === 0 && s.level === 0 && s.spike === 0 && s.flash === 0 && s.lid === 0 && s.lidTo === 0 && !s.blink;
  if (done) reset();
  return !done;
}

function apply(lid: number): void {
  const { level, spike, t } = s;
  // The focus swims: slow, uneven, never quite still while dazed.
  const swim = 0.6 + 0.28 * Math.sin(t * 1.7) + 0.12 * Math.sin(t * 4.1 + 1.3);
  const blurry = 1 - s.clear;
  const blur = (level * 0.011 * swim + spike * 0.014) * blurry;
  // Two pictures that drift apart and back, mostly side to side.
  const split = (level * 0.016 * (0.45 + 0.55 * Math.sin(t * 0.83)) + spike * 0.01) * (1 - 0.85 * s.clear);
  ghost.set(Math.cos(t * 0.37), 0.35 * Math.sin(t * 0.51)).normalize().multiplyScalar(Math.max(0, split));
  effect().set({
    blur,
    ghost,
    chroma: level * 0.0035 + spike * 0.006,
    dark: Math.min(1, level * 0.62 + spike * 0.25),
    lid,
    desat: Math.min(0.6, level * 0.4 + spike * 0.2),
    flash: s.flash,
  });
  const heard = Math.min(1, level * 0.8 + spike * 0.35);
  if (Math.abs(heard - s.heard) > 0.02 || (heard === 0 && s.heard !== 0)) {
    s.heard = heard;
    SoundFX.getInstance().muffle(heard, 0.25);
  }
}

function ensure(): void {
  if (running) return;
  running = true;
  SceneFX.every(step);
  SceneFX.onClear(reset);
}

export const Concussion = {
  /**
   * A blow to the head: a hot flash, the picture jolting out of focus and splitting, colours smearing, the ears
   * ringing and the world going dull. The daze then settles at `level` (default: whatever it was, or 0.6).
   */
  hit(strength = 1, level?: number): void {
    ensure();
    s.spike = Math.min(1.4, s.spike + strength);
    s.flash = Math.max(s.flash, 0.55 * strength);
    s.clear = 0;
    s.clearTo = 0;
    s.levelTo = level ?? Math.max(s.levelTo, 0.6);
    s.level = Math.max(s.level, Math.min(1, s.levelTo + 0.2));
    s.levelRate = 0.4;
    joltCamera(0.16 * strength, 0.45);
    const sound = SoundFX.getInstance();
    sound.muffle(Math.min(1, 0.7 + 0.3 * strength), 0.04);
    s.heard = 1;
    sound.playEarRing(7 + 3 * strength, 0.04 * strength);
  },

  /** The daze settles to `level` (0 clear .. 1 barely there) over `seconds`. */
  daze(level: number, seconds = 1): void {
    ensure();
    s.levelTo = THREE.MathUtils.clamp(level, 0, 1);
    s.levelRate = Math.abs(s.levelTo - s.level) / Math.max(0.05, seconds) || 1;
  },

  /**
   * He fights to focus: `clear` 1 pulls the picture sharp (and the two pictures together), 0 lets it swim again,
   * over `seconds`. Held until the next call.
   */
  focus(clear: number, seconds = 0.3): void {
    ensure();
    s.clearTo = THREE.MathUtils.clamp(clear, 0, 1);
    s.clearRate = Math.abs(s.clearTo - s.clear) / Math.max(0.03, seconds) || 4;
  },

  /** A blink: the lids come down over `close` seconds, stay `hold`, and lift over `open`. */
  blink(close = 0.1, hold = 0.06, open = 0.22): void {
    ensure();
    s.blink = { t: 0, close: Math.max(0.02, close), hold, open: Math.max(0.02, open) };
  },

  /** The lids sink to `to` (1 shut: his eyes close, the world goes black) or lift, over `seconds`. */
  lids(to: number, seconds = 0.8): void {
    ensure();
    s.lidTo = THREE.MathUtils.clamp(to, 0, 1);
    s.lidRate = Math.abs(s.lidTo - s.lid) / Math.max(0.03, seconds) || 1;
  },

  /** Eyes clear and ears open over `seconds` (0: at once); it stops once it is all gone. */
  end(seconds = 0): void {
    if (!running) return;
    if (seconds <= 0) {
      reset();
      return;
    }
    s.levelTo = 0;
    s.levelRate = Math.max(s.level, 0.01) / seconds;
    s.clearTo = 0;
    s.lidTo = 0;
    s.lidRate = Math.max(s.lid, 0.01) / seconds;
  },

  /** How dazed he is now (for testing). */
  get state(): Readonly<State> {
    return s;
  },
};

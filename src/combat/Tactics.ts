import type { CharacterState } from '../entities/CharacterStateMachine';
import { Settings } from '../core/Settings';

/*
 * Pro mode (the user, 2026-10-07): enemies that read the hero and pick their blows to beat him, behind a setting, so
 * the default fight stays as it was and nobody is rage-baited into quitting. On:
 *
 * - every enemy reads him each step (`HeroRead`: his guard, slide, charge, swing, health, and his habits of the last
 *   few seconds);
 * - a blow is chosen for the moment (`pickAttack`) instead of the next in the string: the quick one to interrupt a
 *   swing or a charge, the heavy one against a raised guard or a man nearly down, the wide cut across a slide, the
 *   long one from far off, the short one in close; a kick when he hides behind the dhal in reach;
 * - his habits are punished: a slide-spammer's blow is held until his slide's untouchable moment is over
 *   (`holdForSlide`), a block-spammer meets heavier blows and kicks, and a swing-spammer finds the bosses' guards
 *   readier (`guardBonus`, combat/Guard.ts);
 * - in return the hero carries half again as much health (`heroHealth`, Engine.placeHero).
 *
 * Reaction is not instant: the wait for a slide is capped, the weights leave room for chance, and the choice is only
 * ever among the blows the enemy has anyway. The vanara who teaches is exempt (`Enemy.cunning`).
 */

export const PRO = {
  /**
   * The hero's health in pro mode (100 otherwise). At 150 the steady bot found pro mode easier than the plain game
   * (Dwarka won 60 % against 20 %); 130 leaves the enemies' better blows ahead of it.
   */
  heroHealth: 130,
  /** A boss's chance of guarding a swing, multiplied. */
  guardBonus: 1.3,
  /** The longest an enemy holds its blow for a slide to end (s). */
  slideWait: 0.6,
  /** Slides (or blocks) in the habit window from which he is a spammer of them. */
  spamSlides: 2,
  spamBlocks: 3,
  /** Chance the answer to a raised guard in reach is the kick, for an enemy that has one. */
  kickOnGuard: 0.5,
};

/** Seconds of his doings an enemy remembers (`Habits`). */
export const HABIT_WINDOW = 6;

/** How often he has done each thing in the last `HABIT_WINDOW` seconds. */
export interface Habits {
  slides: number;
  blocks: number;
  attacks: number;
  parries: number;
}

/** What an enemy sees of the hero this step (`Player.read`). */
export interface HeroRead {
  /** The dhal is up (a guard, or a parry pressed early). */
  guarding: boolean;
  /** In the slide, and low enough in it that nothing touches him. */
  evading: boolean;
  /** In the slide at all. */
  sliding: boolean;
  charging: boolean;
  swinging: boolean;
  /** Health left, 0..1. */
  health: number;
  habits: Habits;
}

/** Whether pro mode is on. */
export function proMode(): boolean {
  return Settings.get().proMode;
}

/** The moment to choose a blow in. */
export interface Moment {
  read: HeroRead;
  /** Ground distance to him (m), and how far the enemy's blows reach (its strike or engage range). */
  distance: number;
  reach: number;
  /** The blow is an answer to a run of blocked blows (its quickest), and he struck it from behind lately (the backhand). */
  counter: boolean;
  flanked: boolean;
  /** The blow it made last, so it varies. */
  last: CharacterState | null;
}

/**
 * Picks one of `options` (ATTACK_1 the quick blow, ATTACK_2 the wide cut, ATTACK_3 the heavy one) for the moment, at
 * random with weights: a reading of him tilts the odds, it never fixes them.
 */
export function pickAttack(options: readonly CharacterState[], m: Moment): CharacterState {
  if (options.length === 0) return 'ATTACK_1';
  if (options.length === 1) return options[0];
  const { read, distance, reach } = m;
  const w = new Map<CharacterState, number>(options.map((o) => [o, 1]));
  const tilt = (state: CharacterState, k: number) => { if (w.has(state)) w.set(state, w.get(state)! * k); };
  // An answer is quick; a blow from behind a moment ago is answered with the backhand.
  if (m.counter) {
    if (m.flanked && w.has('ATTACK_2')) return 'ATTACK_2';
    tilt('ATTACK_3', 0.2);
  }
  // He is swinging or gathering a charge: the quick blow lands inside it.
  if (read.swinging || read.charging) {
    tilt('ATTACK_1', 3);
    tilt('ATTACK_3', 0.4);
  }
  // The dhal is up: the heavy blow breaks it; the quick one only rings on it.
  if (read.guarding) {
    tilt('ATTACK_3', 3);
    tilt('ATTACK_2', 1.5);
    tilt('ATTACK_1', 0.4);
  }
  if (read.habits.blocks >= PRO.spamBlocks) tilt('ATTACK_3', 1.5);
  // Sliding: the wide cut catches him as he comes up.
  if (read.sliding) {
    tilt('ATTACK_2', 2.5);
    tilt('ATTACK_1', 0.6);
  }
  // Nearly down: the heavy blow finishes it.
  if (read.health < 0.3) tilt('ATTACK_3', 1.6);
  // In close the short blow, from far off the long one.
  if (distance < reach * 0.45) {
    tilt('ATTACK_1', 1.8);
    tilt('ATTACK_3', 0.6);
  } else if (distance > reach * 0.8) {
    tilt('ATTACK_3', 1.8);
    tilt('ATTACK_1', 0.6);
  }
  // Not the same blow twice running, as a rule.
  if (m.last) tilt(m.last, 0.5);
  let total = 0;
  for (const k of w.values()) total += k;
  let r = Math.random() * total;
  for (const [state, k] of w) {
    r -= k;
    if (r <= 0) return state;
  }
  return options[options.length - 1];
}

/**
 * Whether to hold a blow that is ready: he slides out of everything, and is untouchable this moment. The holder caps
 * the wait at `PRO.slideWait`.
 */
export function holdForSlide(read: HeroRead): boolean {
  return read.evading && read.habits.slides >= PRO.spamSlides;
}

/** Whether a kick is the answer to his raised guard, for an enemy that has one and is in range of it. */
export function kickTheGuard(read: HeroRead): boolean {
  return read.guarding && Math.random() < PRO.kickOnGuard;
}

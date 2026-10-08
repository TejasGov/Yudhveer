/**
 * A duel's round kits are data, separate from the campaign's earned lessons. The room imports this same table
 * with Node's TypeScript stripping (Node 22.18+); the Worker bundles it. No browser runtime is needed here.
 * Best of three is decided: round one is unarmed, round two the summit kit, round three its longer final.
 * The 90 second clock and the two second round card remain open tuning decisions for human playtesting.
 */
import type { HeroKit } from '../game/Progression';

export type GameMode = 'campaign' | 'duel';
export interface DuelRound {
  loadout: HeroKit;
  health: number;
  /** Duel pacing only: the resolver still takes every blow from the shared weapon data. Open tuning decision. */
  damageScale: number;
}
export const DUEL_ROUNDS_TO_WIN = 2;
export const DUEL_ROUND_SECONDS = 90; // Open decision: compare health shares, replay an exact tie.
export const DUEL_ROUND_CARD_SECONDS = 2; // Open decision: short, automatic, after both peers are ready.
/** A connected browser must still simulate defence. Covers normal hit-stop and the largest lobby delay preset. */
export const DUEL_STALL_MS = 2000;
/** Replaceable snapshots yield first; reliable combat/control cannot grow an unbounded socket backlog. */
export const DUEL_SNAPSHOT_QUEUE_BYTES = 4096;
export const DUEL_MAX_QUEUE_BYTES = 32768;
/**
 * Wire validation bounds measured from the shipped rigs (seconds). These do not drive animation or damage:
 * Character still measures its windows and CombatSystem still reads Blow. The defence check compares both.
 * Reliable attack starts bind later snapshots and verdicts to an actual swing, even when poses are dropped.
 */
export const DUEL_ATTACKS: Record<string, Record<string, { duration: number; windows: readonly (readonly [number, number])[] }>> = {
  'training:fists': {
    ATTACK_1: { duration: 0.5, windows: [[0.208333, 0.375]] },
    ATTACK_2: { duration: 0.75, windows: [[0.25, 0.55]] },
    ATTACK_3: { duration: 0.9, windows: [[0.216667, 0.5]] },
  },
  'kavach:khanda': {
    ATTACK_1: { duration: 0.834, windows: [[0.238095, 0.357143]] },
    ATTACK_2: { duration: 0.901, windows: [[0.259259, 0.382716]] },
    ATTACK_3: { duration: 1.371, windows: [[0.654321, 0.728395]] },
    ATTACK_JUMP: { duration: 1.668, windows: [[0.653333, 0.826667]] },
  },
};
export const DUEL_ROUND_KITS: readonly DuelRound[] = [
  { health: 100, damageScale: 1, loadout: { id: 'prologue', attire: 'training', weapon: 'fists', abilities: ['dodge', 'combo'], taught: [] } },
  { health: 100, damageScale: 0.07, loadout: { id: 'summit', attire: 'kavach', weapon: 'khanda', abilities: ['dodge', 'combo', 'block', 'parry', 'charge', 'leap'], taught: [] } },
  { health: 130, damageScale: 0.07, loadout: { id: 'summit', attire: 'kavach', weapon: 'khanda', abilities: ['dodge', 'combo', 'block', 'parry', 'charge', 'leap'], taught: [] } },
];
/** Wire identity includes attire and weapon; both peers reject a different round kit. */
export const duelLoadoutId = (round: number): string => {
  const kit = DUEL_ROUND_KITS[round - 1].loadout;
  return kit.attire + ':' + kit.weapon;
};
export const DUEL_SPAWNS = [[0, 0, 3], [0, 0, -3]] as const;

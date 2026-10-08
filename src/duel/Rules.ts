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

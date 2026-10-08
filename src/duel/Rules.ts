/**
 * Stage 1 duel rules. The summit kit is data rather than a branch of combat code, so another loadout can be
 * offered later. Round count and starting health are deliberately provisional (docs/PVP.md); campaign numbers
 * never read these constants. Each round is a fresh fight, with no campaign save, lesson or scene involved.
 */
import { KITS, type HeroKit } from '../game/Progression';
export type GameMode = 'campaign' | 'duel';
export const DUEL_ROUNDS_TO_WIN = 1; // OPEN: one round or best of three?
export const DUEL_STARTING_HEALTH = 100; // OPEN: khanda fights are short at campaign health.
export const DUEL_LOADOUT: HeroKit = KITS.summit;
export const DUEL_SPAWNS = [[0, 0, 3], [0, 0, -3]] as const;

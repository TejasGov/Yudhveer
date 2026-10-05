import type { CharacterDefinition } from '../animation/CharacterRig';
import { RAKSHASA } from './Rakshasa';
import { VETALA } from './Vetala';
import { ANDHAKA } from './Andhaka';

/*
 * The prologue's people (docs/STORY.md, "Prologue"). Every one of them is an existing model standing in until its own
 * is made: they are PLACEHOLDERS, kept here so the swap is one file.
 */

/**
 * The raiders: the summit's rakshasa brutes, dyed the dun of desert dust. PLACEHOLDER for the village goons (the user
 * will make them in Meshy).
 */
export const RAIDER: CharacterDefinition = { ...RAKSHASA, tint: 0xc9a07a };

/**
 * The guru. PLACEHOLDER: the Vetala's hooded body with his blades taken away, whitened toward an ascetic's ash and
 * saffron, until the user makes the guru in Meshy. Only the clips the scenes use matter: idle, walk, a turn of the
 * hand (slash_3 without a blade) and his fall.
 */
export const GURU: CharacterDefinition = {
  model: VETALA.model,
  manifest: VETALA.manifest,
  states: {
    IDLE: VETALA.states.IDLE,
    WALK: VETALA.states.WALK,
    MOVE: VETALA.states.MOVE,
    STAGGER: VETALA.states.STAGGER,
    DEAD: VETALA.states.DEAD,
  },
  locomotion: { walkSpeed: 1.2, moveSpeed: 3, sprintSpeed: 4 },
  tint: 0xffe2b8,
};

/**
 * Andhaka as the prologue shows him: the summit's model and his cleaver, but no crown (he crowns himself on Kailasha;
 * that is his reveal). The story draws him as a silhouette (`CastMember.silhouette`), so his face is never seen.
 */
export const ANDHAKA_SHADOW: CharacterDefinition = (({ offhand: _crown, ...rest }) => rest)(ANDHAKA);

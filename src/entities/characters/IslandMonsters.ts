import type { CharacterDefinition } from '../animation/CharacterRig';
import { RAKSHASA } from './Rakshasa';
import { MAYAVI } from './Mayavi';

/*
 * Chapter III's creatures (docs/STORY.md, "Chapter III"). Both are PLACEHOLDERS: existing models shrunk and dyed until
 * the user makes the real ones (Meshy). The swap is this file (and the capsules in game/IslandExpedition.ts).
 */

/**
 * The mini monsters: small, fast things that come out of the dark in a pack. PLACEHOLDER: the summit's rakshasa brute
 * at 0.6 scale (about 1.1 m), dyed a pale, sickly cave-grey so they show up in the lamplight. Quicker on their feet
 * than the brute, and their swings play faster.
 */
export const MINI_MONSTER: CharacterDefinition = {
  ...RAKSHASA,
  scale: 0.6,
  tint: 0xb8c0a0,
  states: {
    ...RAKSHASA.states,
    ATTACK_1: { clip: 'standing_melee_attack_downward', timeScale: 1.6, timesState: true, fade: 0.1 },
    ATTACK_2: { clip: 'standing_melee_attack_horizontal', timeScale: 1.6, timesState: true, fade: 0.1 },
    STAGGER: { clip: 'standing_react_large_gut', timeScale: 1.6, timesState: true, fade: 0.06 },
  },
  locomotion: { walkSpeed: 2.2, moveSpeed: 5.4, sprintSpeed: 6.2 },
};

/**
 * The archer monsters: they keep their distance on the far side of a chamber, strafe, and loose a shaft of fire at
 * him after a glowing draw. PLACEHOLDER: Mayavi's sorcerer at 0.85 scale, dyed moss-dark, his casting clip standing in
 * for the draw and loose (there is no bow).
 */
export const ARCHER_MONSTER: CharacterDefinition = {
  ...MAYAVI,
  scale: 0.85,
  tint: 0x7e8a64,
  locomotion: { walkSpeed: 1.3, moveSpeed: 3.4, sprintSpeed: 4.2 },
};

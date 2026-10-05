import type { CharacterDefinition } from '../animation/CharacterRig';
import { MAYAVI } from './Mayavi';

/**
 * Chapter V, the yatudhanas: the sorcerer rakshasas who cross the summit's bridges among the brutes and throw fire
 * from range. PLACEHOLDER (docs/STORY.md, "Placeholders"): Mayavi's model, cut down to a man's height and dyed the
 * ash-grey of the charnel ridge, until the user makes the second minion in Meshy. Swapping it is this file alone.
 */
export const YATUDHANA: CharacterDefinition = {
  ...MAYAVI,
  // 2.1 m Mayavi at 0.86: about 1.8 m, the rakshasas' height.
  scale: 0.86,
  // Ash and dried blood over his blue skin: grey-violet, a little warm.
  tint: 0xa89a98,
};

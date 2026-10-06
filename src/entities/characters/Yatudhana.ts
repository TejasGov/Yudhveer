import type { CharacterDefinition } from '../animation/CharacterRig';
import { MAYAVI } from './Mayavi';
import { asset } from '../../core/Assets';

/**
 * Chapter V, the yatudhanas: the sorcerer-demons of Vedic lore who cross the summit's bridges among the brutes and
 * throw fire from range. Gaunt and grey as cold ash, the skin cracked like dry clay, a skull's face with ember eyes,
 * rudraksha and bone at the throat and on the arm, tattered charcoal cloth; about 1.8 m, the rakshasas' height. Meshy
 * 7 from `game asset/concepts/yatudhana_A.png` (31k triangles, one 2k map), auto-rigged; its clawed hands are held as
 * modelled (no finger bones: it holds nothing). It casts and claws with Mayavi's clips, as the placeholder (Mayavi's
 * own model, cut down) did, so `Yatudhana`'s behaviour is unchanged. Built from `game asset/characters`:
 *
 *   blender -b --factory-startup --python autorig.py -- sources/yatudhana_meshy7.glb rigs/yatudhana.markers.json rigs/yatudhana.rigged.glb
 *   blender -b --factory-startup --python build_character.py -- rigs/yatudhana.rigged.glb animations <out>/yatudhana.glb
 *     --height 1.8 --prefixes "NPC" --clips "casting,casting_2,magic_attack_01,idle_2,impact_3,impact_2,strafe,strafe_2,walk_2,crouch_idle,calm_idle"
 */
export const YATUDHANA: CharacterDefinition = {
  model: asset('characters/yatudhana.glb'),
  manifest: asset('characters/yatudhana.manifest.json'),
  states: MAYAVI.states,
  locomotion: MAYAVI.locomotion,
  // No weapon: a claw's reach along the right hand (the rig rests in a T-pose, hand pointing out to his right).
  weapon: { socket: 'Socket_Hand_R', restWorldRotation: [0, 0, Math.PI / 2], grip: [0, 0, 0], blade: [0, 0.28] },
};

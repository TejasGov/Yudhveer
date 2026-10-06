import type { CharacterDefinition } from '../animation/CharacterRig';
import { RAKSHASA } from './Rakshasa';
import { MAYAVI } from './Mayavi';

/*
 * Chapter III's creatures (docs/STORY.md, "Chapter III"): Meshy 7 models made for the island, auto-rigged and built
 * with the clip sets their placeholders used, so their behaviour (entities/IslandMonsters.ts) is unchanged. Their
 * capsules are in game/IslandExpedition.ts. Built from `game asset/characters` (see game asset/README.md):
 *
 *   blender -b --factory-startup --python autorig.py -- sources/cave_runt_meshy7.glb rigs/cave_runt.markers.json rigs/cave_runt.rigged.glb
 *   blender -b --factory-startup --python build_character.py -- rigs/cave_runt.rigged.glb animations <out>/cave_runt.glb
 *     --height 1.1 --decimate 0.55 --texture 1024 --clips "<the rakshasa's nine, see Rakshasa.ts>"
 *   blender -b --factory-startup --python autorig.py -- sources/cave_hurler_meshy7.glb rigs/cave_hurler.markers.json rigs/cave_hurler.rigged.glb
 *   blender -b --factory-startup --python build_character.py -- rigs/cave_hurler.rigged.glb animations <out>/cave_hurler.glb
 *     --height 1.8 --prefixes "NPC" --clips "<Mayavi's, see Yatudhana.ts>" --extras ember_glow.py
 *
 * (`ember_glow.py` makes the colour map's warm, bright texels an emissive map: the hurlers' ember cracks and eyes glow.)
 */

/**
 * The mini monsters, cave runts: small, wiry bhoota-things that come out of the dark in a pack. Grey-green and clammy,
 * a goblin's head with milky eyes, bat ears and a mouth of needle teeth, a cord of small bones, a rag at the hips;
 * about 1.1 m (Meshy 7 from `game asset/concepts/cave_runt_A.png`, decimated to 17k triangles: they come six at a
 * time). They claw (no weapon) with the brute's clips, quicker than the brute: the placeholder's timings.
 */
export const MINI_MONSTER: CharacterDefinition = {
  model: '/assets/characters/cave_runt.glb',
  manifest: '/assets/characters/cave_runt.manifest.json',
  states: {
    ...RAKSHASA.states,
    ATTACK_1: { clip: 'standing_melee_attack_downward', timeScale: 1.6, timesState: true, fade: 0.1 },
    ATTACK_2: { clip: 'standing_melee_attack_horizontal', timeScale: 1.6, timesState: true, fade: 0.1 },
    STAGGER: { clip: 'standing_react_large_gut', timeScale: 1.6, timesState: true, fade: 0.06 },
  },
  locomotion: { walkSpeed: 2.2, moveSpeed: 5.4, sprintSpeed: 6.2 },
  // Claws: a short reach along the right hand (the rig rests in a T-pose, hand pointing out to its right).
  weapon: { socket: 'Socket_Hand_R', restWorldRotation: [0, 0, Math.PI / 2], grip: [0, 0, 0], blade: [0, 0.17] },
};

/**
 * The "archer monsters", cave hurlers: there is no bow among the clips, so they hurl instead. Lanky keepers of the
 * island's undying lamps, soot-black with ember cracks up the forearms and eyes like coals; they light a brand in the
 * hand (the draw's glow) and hurl it (the shaft of fire), keeping their distance on the far side of a chamber. About
 * 1.8 m (Meshy 7 from `game asset/concepts/cave_hurler_A.png`, 31k triangles). Mayavi's clips, as the placeholder used:
 * his cast is the throw.
 */
export const ARCHER_MONSTER: CharacterDefinition = {
  model: '/assets/characters/cave_hurler.glb',
  manifest: '/assets/characters/cave_hurler.manifest.json',
  states: MAYAVI.states,
  locomotion: { walkSpeed: 1.3, moveSpeed: 3.4, sprintSpeed: 4.2 },
  // Cornered, it claws: a short reach along the right hand.
  weapon: { socket: 'Socket_Hand_R', restWorldRotation: [0, 0, Math.PI / 2], grip: [0, 0, 0], blade: [0, 0.26] },
};

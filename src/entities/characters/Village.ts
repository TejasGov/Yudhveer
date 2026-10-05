import type { CharacterDefinition } from '../animation/CharacterRig';
import { RAKSHASA } from './Rakshasa';
import { ANDHAKA, ANDHAKA_CALM_IDLE } from './Andhaka';

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
 * The guru (secretly Shiva): an old ascetic with his staff, made in Meshy 7 from `game asset/concepts/guru.png`. The
 * staff is part of his mesh, bound to his right hand, and that arm is held at rest in every clip (`guru_post.py`):
 * he only ever carries it. His own clips (`Guru-`, Mixamo): Breathing Idle, and Iv Pole Walking (a steady walk
 * with one hand on a pole); run, impact and death are Yodha's. Built from `game asset/characters`:
 *
 *   blender -b --factory-startup --python autorig.py -- sources/guru_A_meshy7.glb rigs/guru.markers.json rigs/guru.rigged.glb
 *   blender -b --factory-startup --python build_character.py -- rigs/guru.rigged.glb animations <out>/guru.glb
 *     --prefixes "Guru-" --clips "run,impact,death" --height 1.75 --decimate 0.75 --post guru_post.py
 */
export const GURU: CharacterDefinition = {
  model: '/assets/characters/guru.glb',
  manifest: '/assets/characters/guru.manifest.json',
  states: {
    IDLE: { clip: 'breathing_idle', fade: 0.3 },
    WALK: { clip: 'iv_pole_walking', matchSpeed: true, fade: 0.25 },
    MOVE: { clip: 'run', matchSpeed: true, fade: 0.2 },
    STAGGER: { clip: 'impact', timesState: true, fade: 0.05 },
    DEAD: { clip: 'death', fade: 0.1 },
  },
  locomotion: { walkSpeed: 1.1, moveSpeed: 2.8, sprintSpeed: 3.5 },
};

/**
 * Andhaka as the prologue shows him: the summit's model and his cleaver, but no crown (he crowns himself on Kailasha;
 * that is his reveal). The story draws him as a silhouette (`CastMember.silhouette`), so his face is never seen. He
 * does not fight here: standing over the boy he takes his calm idle, not the fight's guard shuffle.
 */
export const ANDHAKA_SHADOW: CharacterDefinition = (({ offhand: _crown, ...rest }) => ({
  ...rest,
  // A cast member is always at ease, so REST is what he stands in; IDLE too, should anything ask for his guard.
  states: { ...rest.states, IDLE: { clip: ANDHAKA_CALM_IDLE, fade: 0.4 }, REST: { clip: ANDHAKA_CALM_IDLE, fade: 0.4 } },
}))(ANDHAKA);

/**
 * The villagers of the prologue's ending (docs/STORY.md, "The village and the reveal"): placeholders made from three of
 * Mixamo's free characters (period-plausible ones only), their clothes re-dyed to the village's cottons by
 * `villager_dye.py`. They are story cast, never in the fight: alive (cowering through the raid, mourning after it) or
 * dead in the dust, posed by scene cues from their own `Village-` clips (Mixamo, without skin) and the hero's kneel and
 * prayer. Built from `game asset/characters` (see game asset/README.md, "Villagers"):
 *
 *   blender -b --factory-startup --python build_character.py -- "sources/villagers/Peasant Man.fbx" animations <out>/villager_man.glb
 *     --clips "<VILLAGER_CLIPS>" --height 1.72 --texture 512 --texture-color 1024 --extras villager_dye.py
 *   (the same for "Abe.fbx" -> villager_elder.glb, --height 1.66 --decimate 0.6, and "Peasant Girl.fbx" ->
 *   villager_woman.glb, --height 1.58, no --extras)
 */
function villager(name: string, tint?: number): CharacterDefinition {
  return {
    model: `/assets/characters/${name}.glb`,
    manifest: `/assets/characters/${name}.manifest.json`,
    states: {
      IDLE: { clip: 'calm_idle', fade: 0.4 },
      REST: { clip: 'calm_idle', fade: 0.4 },
      WALK: { clip: 'look_behind_run', matchSpeed: true, fade: 0.25 },
      MOVE: { clip: 'look_behind_run', matchSpeed: true, fade: 0.2 },
      DEAD: { clip: 'falling_back_death', fade: 0.1 },
    },
    locomotion: { walkSpeed: 1.4, moveSpeed: 3.2, sprintSpeed: 3.6 },
    tint,
  };
}

/** A villager in a kurta and dhoti (Mixamo's Peasant Man, re-dyed). */
export const VILLAGER_MAN = villager('villager_man');
/** An old man in a white dhoti and saffron (Mixamo's Abe, re-dyed). */
export const VILLAGER_ELDER = villager('villager_elder');
/** A village woman in a ghagra and odhni (Mixamo's Peasant Girl). */
export const VILLAGER_WOMAN = villager('villager_woman');
/** The same woman's model, her clothes a shade darker and cooler (a second woman at a distance). */
export const VILLAGER_WOMAN_B = villager('villager_woman', 0xb8b2c8);

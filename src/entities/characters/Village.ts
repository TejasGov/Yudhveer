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

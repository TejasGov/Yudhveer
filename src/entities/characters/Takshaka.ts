import type { CharacterDefinition } from '../animation/CharacterRig';
import { asset } from '../../core/Assets';

/**
 * Chapter III final boss, Takshaka: a 2.6 m cobra-hooded naga with claws and a tail. Rigged from the bare mesh
 * `level 3 final boss.fbx` by `game asset/characters/autorig.py` (markers in `rigs/level3_final_boss.markers.json`;
 * the tail is its own bone chain and follows the hips), then built with the Boss1- clips:
 *
 *   blender -b --factory-startup --python build_character.py -- rigs/level3_final_boss.rigged.glb animations
 *           <out>/takshaka.glb --prefixes "Boss1-" --height 2.6 --clips "orc_idle"
 */
export const TAKSHAKA: CharacterDefinition = {
  model: asset('characters/takshaka.glb'),
  manifest: asset('characters/takshaka.manifest.json'),
  states: {
    IDLE: { clip: 'mutant_breathing_idle', fade: 0.3 },
    REST: { clip: 'orc_idle', fade: 0.4 }, // at ease: standing tall and heavy (Stance-Orc Idle)
    WALK: { clip: 'mutant_walking', matchSpeed: true },
    MOVE: { clip: 'mutant_walking', matchSpeed: true, fade: 0.3 },
    SPRINT: { clip: 'standing_run_forward', matchSpeed: true },
    ATTACK_1: { clip: 'standing_melee_attack_downward', timeScale: 1.1, timesState: true, fade: 0.18 },
    ATTACK_2: { clip: 'standing_melee_attack_horizontal', timeScale: 1.1, timesState: true, fade: 0.18 },
    ATTACK_3: { clip: 'standing_melee_combo_attack_ver_2', timesState: true, fade: 0.18 },
    ATTACK_JUMP: { clip: 'mutant_jump_attack', timesState: true, rootMotion: true, fade: 0.15 },
    // The roar: his arrival and his second phase (~3.6 s: a moment's opening, not a free one).
    CHARGE: { clip: 'mutant_roaring', timeScale: 1.5, timesState: true, fade: 0.25 },
    // Fire breathed along the ground (the flame wave): the roar, quicker.
    CAST: { clip: 'mutant_roaring', timeScale: 2.2, timesState: true, fade: 0.12 },
    STAGGER: { clip: 'standing_react_large_gut', timeScale: 1.7, timesState: true, fade: 0.08 }, // ~0.95 s: a beat, not a free combo
    DEFLECTED: { clip: 'standing_react_large_gut', timeScale: 0.8, fade: 0.08 },
    POSTURE_BROKEN: { clip: 'standing_react_large_gut', timeScale: 0.5, fade: 0.1 },
    DEAD: { clip: 'mutant_dying', fade: 0.15 },
  },
  locomotion: { walkSpeed: 1.8, moveSpeed: 2.2, sprintSpeed: 4 },
  // Claws, no weapon: the strike runs down the right hand past the fingertips (the rig rests with its arms hanging).
  weapon: { socket: 'Socket_Hand_R', restWorldRotation: [0, 0, Math.PI], grip: [0, 0, 0], blade: [0, 0.5] },
};

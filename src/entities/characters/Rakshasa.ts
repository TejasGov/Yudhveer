import type { CharacterDefinition } from '../animation/CharacterRig';

/**
 * Chapter IV minions, the rakshasas: grey brutes with a cleaver fused into the right hand. Rigged from the bare mesh
 * `level 4 minions.fbx` by `game asset/characters/autorig.py` (markers in `rigs/level4_minion.markers.json`):
 *
 *   blender -b --factory-startup --python build_character.py -- rigs/level4_minion.rigged.glb animations
 *     <out>/rakshasa.glb --height 1.85 --clips "mutant_breathing_idle,mutant_walking,standing_run_forward,
 *     standing_melee_attack_downward,standing_melee_attack_horizontal,standing_react_large_gut,mutant_dying,mutant_roaring"
 */
export const RAKSHASA: CharacterDefinition = {
  model: '/assets/characters/rakshasa.glb',
  manifest: '/assets/characters/rakshasa.manifest.json',
  states: {
    IDLE: { clip: 'mutant_breathing_idle', fade: 0.25 },
    WALK: { clip: 'mutant_walking', matchSpeed: true },
    MOVE: { clip: 'standing_run_forward', matchSpeed: true, fade: 0.2 },
    SPRINT: { clip: 'standing_run_forward', matchSpeed: true },
    ATTACK_1: { clip: 'standing_melee_attack_downward', timeScale: 1.25, timesState: true, fade: 0.15 },
    ATTACK_2: { clip: 'standing_melee_attack_horizontal', timeScale: 1.25, timesState: true, fade: 0.15 },
    CHARGE: { clip: 'mutant_roaring', timeScale: 1.4, timesState: true, fade: 0.2 },
    STAGGER: { clip: 'standing_react_large_gut', timeScale: 1.3, timesState: true, fade: 0.06 },
    DEFLECTED: { clip: 'standing_react_large_gut', fade: 0.06 },
    POSTURE_BROKEN: { clip: 'standing_react_large_gut', timeScale: 0.6, fade: 0.1 },
    DEAD: { clip: 'mutant_dying', fade: 0.12 },
  },
  locomotion: { walkSpeed: 1.6, moveSpeed: 4.2, sprintSpeed: 5 },
  // The cleaver is part of the mesh, hanging below the fist in the rest pose: its edge runs down from the hand.
  weapon: { socket: 'Socket_Hand_R', restWorldRotation: [0, 0, Math.PI], grip: [0, 0, 0], blade: [0.08, 0.6] },
};

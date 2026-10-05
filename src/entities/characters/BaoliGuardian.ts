import type { CharacterDefinition } from '../animation/CharacterRig';

/**
 * Chapter I boss, the Baoli Guardian: a 3.2 m horned demon in plate armour with a talwar. Rigged from the bare mesh
 * `level 1 boss.fbx` by `game asset/characters/autorig.py` (markers in `rigs/level1_boss.markers.json`), then built
 * with the Boss1- clips (run from `game asset/characters`):
 *
 *   blender -b --factory-startup --python build_character.py -- rigs/level1_boss.rigged.glb animations
 *           <out>/baoli_guardian.glb --prefixes "Boss1-" --height 3.2 --fists --clips "orc_idle"
 */
export const BAOLI_GUARDIAN: CharacterDefinition = {
  model: '/assets/characters/baoli_guardian.glb',
  manifest: '/assets/characters/baoli_guardian.manifest.json',
  states: {
    // Hunched and heaving.
    IDLE: { clip: 'mutant_breathing_idle', fade: 0.3 },
    // At ease: standing tall and heavy (Mixamo's Male Orc Standing Idle, Stance-Orc Idle).
    REST: { clip: 'orc_idle', fade: 0.4 },
    // A slow, rolling brute walk: he never hurries.
    WALK: { clip: 'mutant_walking', matchSpeed: true },
    MOVE: { clip: 'mutant_walking', matchSpeed: true, fade: 0.3 },
    SPRINT: { clip: 'standing_run_forward', matchSpeed: true },
    // Overhead chop, wide sweep, three-hit string.
    ATTACK_1: { clip: 'standing_melee_attack_downward', timesState: true, fade: 0.2 },
    ATTACK_2: { clip: 'standing_melee_attack_horizontal', timesState: true, fade: 0.2 },
    ATTACK_3: { clip: 'standing_melee_combo_attack_ver_2', timesState: true, fade: 0.2 },
    // Gap closer: a leap that comes down on you.
    ATTACK_JUMP: { clip: 'mutant_jump_attack', timesState: true, rootMotion: true, fade: 0.15 },
    // The roar when the fight begins (bosses use CHARGE for their taunt).
    CHARGE: { clip: 'mutant_roaring', timesState: true, fade: 0.25 },
    STAGGER: { clip: 'standing_react_large_gut', timeScale: 1.7, timesState: true, fade: 0.08 }, // ~0.95 s: a beat, not a free combo
    DEFLECTED: { clip: 'standing_react_large_gut', timeScale: 0.8, fade: 0.08 },
    POSTURE_BROKEN: { clip: 'standing_react_large_gut', timeScale: 0.5, fade: 0.1 },
    DEAD: { clip: 'mutant_dying', fade: 0.15 },
  },
  locomotion: { walkSpeed: 1.8, moveSpeed: 1.9, sprintSpeed: 3.5 },
  // The talwar, in the fist the build curled (socket +Y along the grip toward the thumb: a prepared weapon fits as is).
  weapon: {
    socket: 'Socket_Hand_R', socketFrame: true, restWorldRotation: [0, 0, 0], grip: [0, 0, 0],
    model: '/assets/weapons/level1_boss_talwar.glb', blade: [0.3, 1.35],
    stateRotations: { REST: [0, 0, -1.1] }, // at ease: lowered, pointing down and ahead
  },
};

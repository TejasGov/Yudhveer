import type { CharacterDefinition } from '../animation/CharacterRig';
import { asset } from '../../core/Assets';

/**
 * Chapter III boss, Shalva: a 2.6 m grey-skinned asura raider with a spiked gada. Rigged from the bare mesh
 * `level 3 boss mace character.fbx` by `game asset/characters/autorig.py` (markers in
 * `rigs/level3_boss_mace.markers.json`), then built with the brute and mace clips (run from `game asset/characters`):
 *
 *   blender -b --factory-startup --python build_character.py -- rigs/level3_boss_mace.rigged.glb animations
 *           <out>/shalva.glb --prefixes "Boss1-,All-" --height 2.6 --fists
 *           --finger-markers rigs/level3_boss_mace.fingers.json --clips "orc_idle"
 *
 * His hands have finger bones: the right closes on the gada's haft, the empty left hangs relaxed (CharacterRig).
 *
 * His gada is `level 3 boss mace weapon.fbx` through prepare_weapon.py --hafted.
 */
export const SHALVA: CharacterDefinition = {
  model: asset('characters/shalva.glb'),
  manifest: asset('characters/shalva.manifest.json'),
  states: {
    IDLE: { clip: 'great_sword_strafe_in_place', fade: 0.3 },
    // At ease (out of the fight his guard, a strafe on the spot, would read as jogging in place): the orc idle.
    REST: { clip: 'orc_idle', fade: 0.4 },
    WALK: { clip: 'mutant_walking', matchSpeed: true },
    MOVE: { clip: 'mutant_walking', matchSpeed: true, fade: 0.3 },
    SPRINT: { clip: 'standing_run_forward', matchSpeed: true },
    STRAFE_LEFT: { clip: 'great_sword_strafe_walk_left', matchSpeed: true, fade: 0.25 },
    STRAFE_RIGHT: { clip: 'great_sword_strafe_walk_right', matchSpeed: true, fade: 0.25 },
    // An overhead smash, a spinning double blow, and a three-blow string.
    ATTACK_1: { clip: 'standing_melee_attack_downward', timeScale: 1.1, timesState: true, fade: 0.18 },
    ATTACK_2: { clip: 'spin_mace_attack', timeScale: 1.05, timesState: true, fade: 0.15 },
    ATTACK_3: { clip: 'mace_attack_combo', timeScale: 1.15, timesState: true, fade: 0.15 },
    // Gap closer: a running leap that comes down gada first.
    ATTACK_JUMP: { clip: 'standing_melee_run_jump_attack', timesState: true, rootMotion: true, fade: 0.15 },
    CHARGE: { clip: 'mutant_roaring', timesState: true, fade: 0.25 },
    STAGGER: { clip: 'standing_react_large_gut', timeScale: 1.7, timesState: true, fade: 0.08 }, // ~0.95 s: a beat, not a free combo
    DEFLECTED: { clip: 'standing_react_large_gut', timeScale: 0.8, fade: 0.08 },
    POSTURE_BROKEN: { clip: 'standing_react_large_gut', timeScale: 0.5, fade: 0.1 },
    DEAD: { clip: 'mutant_dying', fade: 0.15 },
  },
  locomotion: { walkSpeed: 1.8, moveSpeed: 2.3, sprintSpeed: 4 },
  // The gada in the fist the build curled; its head (the striking part) runs 0.68-1.17 m up the haft.
  weapon: {
    socket: 'Socket_Hand_R', socketFrame: true, restWorldRotation: [0, 0, 0], grip: [0, 0, 0],
    model: asset('weapons/shalva_gada.glb'), blade: [0.5, 1.2],
    stateRotations: { REST: [0, 0, -1.3] }, // at ease: held upright at his side, the head above his shoulder
  },
};

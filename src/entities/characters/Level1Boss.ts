import type { CharacterDefinition } from '../animation/CharacterRig';

/**
 * Level 1 Boss: Built from "Level1_Boss.glb" with ALL & NPC Mixamo animations retargeted.
 *
 * Exclusively uses clips prefixed with 'All-' or 'NPC':
 * - great_sword_strafe_in_place (All-Great Sword Strafe-in place.fbx)
 * - great_sword_strafe_walk_left (All-Great Sword Strafe-walk left.fbx)
 * - great_sword_strafe_walk_right (All-Great Sword Strafe-walk right.fbx)
 * - one_hand_club_combo (All-One Hand Club Combo.fbx)
 * - standing_melee_run_jump_attack (All-Standing Melee Run Jump Attack.fbx)
 * - mace_attack_combo (All-mace attack combo.fbx)
 * - spin_mace_attack (All-spin mace attack.fbx)
 * - death (NPC Death.fbx)
 * - slash (NPC Slash.fbx)
 * - standing_taunt_battlecry (NPC Standing Taunt Battlecry.fbx)
 * - run (NPC run.fbx)
 * - sword_kick (NPC sword kick.fbx)
 * - walk (NPC walk.fbx)
 */
export const LEVEL1_BOSS: CharacterDefinition = {
  model: '/assets/characters/level1_boss.glb',
  manifest: '/assets/characters/level1_boss.manifest.json',
  states: {
    IDLE: { clip: 'great_sword_strafe_in_place' },
    WALK: { clip: 'walk', matchSpeed: true },
    MOVE: { clip: 'run', matchSpeed: true },
    SPRINT: { clip: 'run', matchSpeed: true },
    JUMP: { clip: 'standing_melee_run_jump_attack', fade: 0.1 },
    ATTACK_1: { clip: 'one_hand_club_combo', timeScale: 1.2, timesState: true, rootMotion: true },
    ATTACK_2: { clip: 'mace_attack_combo', timeScale: 1.2, timesState: true, rootMotion: true },
    ATTACK_3: { clip: 'spin_mace_attack', timeScale: 1.2, timesState: true, rootMotion: true },
    ATTACK_JUMP: { clip: 'standing_melee_run_jump_attack', timeScale: 1.15, timesState: true, rootMotion: true, fade: 0.1 },
    CHARGE: { clip: 'standing_taunt_battlecry', timeScale: 1.1, timesState: true },
    PARRY: { clip: 'great_sword_strafe_in_place', timeScale: 1.2, fade: 0.06 },
    BLOCK: { clip: 'great_sword_strafe_in_place', fade: 0.12 },
    BLOCK_HIT: { clip: 'great_sword_strafe_in_place', timeScale: 1.4, timesState: true, fade: 0.05 },
    SHEATHE: { clip: 'great_sword_strafe_in_place', timeScale: 1.5, timesState: true },
    DRAW: { clip: 'great_sword_strafe_in_place', timeScale: 1.5, timesState: true },
    STAGGER: { clip: 'great_sword_strafe_in_place', timeScale: 1.3, timesState: true, fade: 0.05 },
    DEFLECTED: { clip: 'great_sword_strafe_in_place', timeScale: 1.3, fade: 0.05 },
    POSTURE_BROKEN: { clip: 'great_sword_strafe_in_place', fade: 0.2 },
    DEAD: { clip: 'death', fade: 0.15 },
    DODGE_ROLL: { clip: 'run', timeScale: 2.0, fade: 0.08 },
  },
  locomotion: { walkSpeed: 1.5, moveSpeed: 4.0, sprintSpeed: 6.0 },
  weapon: { socket: 'Socket_Hand_R', restWorldRotation: [Math.PI / 2, 0, 0], grip: [0, -0.08, 0] },
  offhand: { socket: 'Socket_Hand_L', restWorldRotation: [0, 0, 0], grip: [0, 0, -0.04] },
};

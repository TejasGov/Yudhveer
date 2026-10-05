import type { CharacterDefinition } from '../animation/CharacterRig';

/**
 * Chapter V final boss, Andhaka: a 3.15 m asura king with a lion-hilted cleaver and a crown (both separate props). The
 * model is the user's 100k-triangle sculpt (`game asset/characters/sources/andhaka_100k.glb`, 2026-10-05), auto-rigged
 * with finger bones by `autorig.py` (rigs/andhaka100k.markers.json), kept whole (no decimation). Real motion capture
 * for everything he does in the fight, a Smile shape key (andhaka_face.py), his seated entrance `coronation` authored
 * from Mixamo's Sitting Laughing / Sitting Idle / Sit To Stand plus IK (andhaka_post.py / andhaka_intro.py), and a calm
 * standing idle for cutscenes:
 *
 *   blender -b --factory-startup --python build_character.py -- rigs/andhaka100k.rigged.glb animations <out>/andhaka.glb
 *           --fingers --height 3.15 --texture 2048 --texture-color 4096 --extras andhaka_face.py --post andhaka_post.py
 *           --clips "<see the README>"
 *
 * The crown rides the offhand slot (Socket_Crown on his head); the entrance moves it and the sword at its marks.
 */
export const ANDHAKA: CharacterDefinition = {
  model: '/assets/characters/andhaka.glb',
  manifest: '/assets/characters/andhaka.manifest.json',
  states: {
    // On guard, the cleaver held low and ready.
    IDLE: { clip: 'great_sword_strafe_in_place', fade: 0.3 },
    WALK: { clip: 'mutant_walking', matchSpeed: true },
    MOVE: { clip: 'mutant_walking', matchSpeed: true, fade: 0.3 },
    SPRINT: { clip: 'run_with_sword', matchSpeed: true },
    STRAFE_LEFT: { clip: 'great_sword_strafe_walk_left', matchSpeed: true, fade: 0.25 },
    STRAFE_RIGHT: { clip: 'great_sword_strafe_walk_right', matchSpeed: true, fade: 0.25 },
    // A wide cut, an overhead chop, and a three-blow string ending low (his spinning high blow is not used: at
    // 3.15 m it passes over the hero's head).
    ATTACK_1: { clip: 'standing_melee_attack_horizontal', timeScale: 1.1, timesState: true, fade: 0.18 },
    ATTACK_2: { clip: 'standing_melee_attack_downward', timeScale: 1.1, timesState: true, fade: 0.18 },
    ATTACK_3: { clip: 'standing_melee_combo_attack_ver_2', timeScale: 1.15, timesState: true, fade: 0.18 },
    // Gap closer: a running leap that comes down blade first.
    ATTACK_JUMP: { clip: 'standing_melee_run_jump_attack', timesState: true, rootMotion: true, fade: 0.15 },
    // His second phase begins with a roar.
    CHARGE: { clip: 'mutant_roaring', timeScale: 1.8, timesState: true, fade: 0.25 }, // ~3 s: not a free window
    STAGGER: { clip: 'standing_react_large_gut', timeScale: 1.7, timesState: true, fade: 0.08 }, // ~0.95 s: a beat, not a free combo
    DEFLECTED: { clip: 'standing_react_large_gut', timeScale: 0.8, fade: 0.08 },
    POSTURE_BROKEN: { clip: 'standing_react_large_gut', timeScale: 0.5, fade: 0.1 },
    DEAD: { clip: 'death', fade: 0.12 },
  },
  locomotion: { walkSpeed: 1.8, moveSpeed: 2.4, sprintSpeed: 4.2 },
  // The cleaver in the fist the build closed (Socket_Hand_R sits in its hole); the blade runs 0.23-1.47 m up.
  weapon: {
    socket: 'Socket_Hand_R', socketFrame: true, restWorldRotation: [0, 0, 0], grip: [0, 0, 0],
    model: '/assets/weapons/andhaka_cleaver.glb', blade: [0.25, 1.47],
  },
  // The crown on his head (its base on Socket_Crown).
  offhand: {
    socket: 'Socket_Crown', socketFrame: true, restWorldRotation: [0, 0, 0], grip: [0, 0, 0],
    model: '/assets/weapons/andhaka_crown.glb',
  },
};

/**
 * His calm standing idle for cutscenes (not the fight, whose IDLE is a guard shuffle): Mixamo's "Standing Idle With
 * Axe" (`Andhaka-Standing Idle With Axe.fbx`), a broad, still, menacing stance with the weapon hand low.
 */
export const ANDHAKA_CALM_IDLE = 'standing_idle_with_axe';

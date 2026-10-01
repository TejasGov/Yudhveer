import type { CharacterDefinition } from '../animation/CharacterRig';

/**
 * Yudhveer's protagonist, built by `characters/build_character.py` from `yodha.fbx` + `characters/animations`
 * with `--prefixes "All-,Yodha-"`: the shared clips plus his own Mixamo Sword And Shield pack. Clip ids are the
 * file names minus their prefix, in snake_case ("Yodha-attack (2).fbx" -> attack_2).
 *
 * Every clip of the pack is in the model, so a state can be pointed at a different variant without a rebuild:
 * idle_2..4, walk_2 / run_2 (backwards), strafe..strafe_4, turn, 180_turn, slash_2..5, attack_2, kick, casting,
 * crouch*, death_2. States without a fitting clip use the closest one (marked PLACEHOLDER).
 */
export const YODHA: CharacterDefinition = {
  model: '/assets/characters/yodha.glb',
  manifest: '/assets/characters/yodha.manifest.json',
  states: {
    IDLE: { clip: 'idle' },
    WALK: { clip: 'walk', matchSpeed: true },
    MOVE: { clip: 'run', matchSpeed: true },
    SPRINT: { clip: 'run', matchSpeed: true },
    // Standing jump; a running one on the move. Both have their height removed: physics does the leaving the ground.
    JUMP: { clip: 'jump_2', movingClip: 'jump', fade: 0.08 },
    ATTACK_1: { clip: 'slash', timeScale: 1.35, timesState: true },
    ATTACK_2: { clip: 'attack_4', timeScale: 1.1, timesState: true },
    ATTACK_3: { clip: 'attack_3', timeScale: 1.2, timesState: true, rootMotion: true },
    // Out of a sprint: a running leap that comes down blade first, carrying him ~3 m.
    ATTACK_JUMP: { clip: 'attack', timeScale: 1.15, timesState: true, rootMotion: true, fade: 0.1 },
    CHARGE: { clip: 'power_up', timeScale: 1.2, timesState: true },
    // The 0.57 s shield raise, played to fit the 0.42 s parry.
    PARRY: { clip: 'block', timeScale: 1.35, fade: 0.06 },
    BLOCK: { clip: 'block_idle', fade: 0.12 },
    BLOCK_HIT: { clip: 'impact', timeScale: 1.4, timesState: true, fade: 0.05 }, // the guard-stance impact
    // Two Mixamo clips joined by the build; the sword changes sockets at its "sheathed" mark. Drawing is the
    // same move backwards.
    SHEATHE: { clip: 'sheathe', timeScale: 1.6, timesState: true },
    DRAW: { clip: 'sheathe', timeScale: 1.6, timesState: true, reverse: true },
    STAGGER: { clip: 'impact_3', timeScale: 1.3, timesState: true, fade: 0.05 },
    DEFLECTED: { clip: 'impact_2', timeScale: 1.3, fade: 0.05 },
    POSTURE_BROKEN: { clip: 'crouch_idle', fade: 0.2 }, // PLACEHOLDER: no kneel / stagger-down clip
    DEAD: { clip: 'death', fade: 0.1 },
    DODGE_ROLL: { clip: 'run', timeScale: 2.2, fade: 0.08 }, // PLACEHOLDER: the pack has no roll
  },
  // Walk and run are authored at 1.26 and 3.47 m/s; these keep playback within a natural 1.2-1.8x.
  locomotion: { walkSpeed: 1.5, moveSpeed: 4.2, sprintSpeed: 6.2 },
  // In the rest T-pose (arms out, palms down) the blade points forward and the guard runs along the arm.
  weapon: { socket: 'Socket_Hand_R', restWorldRotation: [Math.PI / 2, 0, 0], grip: [0, -0.08, 0] },
  // The dhal faces forward off the left fist.
  offhand: { socket: 'Socket_Hand_L', restWorldRotation: [0, 0, 0], grip: [0, 0, -0.04] },
};

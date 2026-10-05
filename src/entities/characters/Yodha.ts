import type { CharacterDefinition } from '../animation/CharacterRig';
import type { Attire } from '../../game/Progression';

/**
 * Yudhveer's protagonist, built by `game asset/characters/build_character.py` from `game asset/characters/yodha.fbx` + `game asset/characters/animations`
 * with `--prefixes "All-,Yodha-"`: the shared clips plus his own Mixamo Sword And Shield pack, and Mixamo's
 * "Run With Sword" / "Standing Sprint Forward" for running, the mace's Great Sword Pack clips and `calm_idle` (Mixamo's
 * relaxed standing "Idle", Stance-Calm Idle) for standing at ease (`--clips`, see game asset/README.md). Clip ids are
 * the file names minus their prefix, in snake_case ("Yodha-attack (2).fbx" -> attack_2).
 *
 * His hands have finger bones (`--finger-markers rigs/yodha.fingers.json`, game asset/characters/hands.py): each closes
 * on what its socket holds, hangs relaxed when empty, and both lie flat in prayer (CharacterRig). `--post yodha_post.py`
 * adds `praying_anjali` (palms pressed together before his chest) and `posture_break` (struck, down on one knee, up).
 *
 * Every clip of the pack is in the model, so a state can be pointed at a different variant without a rebuild:
 * idle_2..4, run (the pack's own), walk_2 / run_2 (backwards), strafe..strafe_4, turn, 180_turn, slash_2..5,
 * attack_2, kick, casting, crouch*, death_2, slide_run (the slide). States without a fitting clip use the closest one (marked PLACEHOLDER).
 */
export const YODHA: CharacterDefinition = {
  model: '/assets/characters/yodha.glb',
  manifest: '/assets/characters/yodha.manifest.json',
  states: {
    IDLE: { clip: 'idle' },
    // At ease (cutscenes, before and after a fight): Mixamo's relaxed standing "Idle" (Stance-Calm Idle), every weapon.
    REST: { clip: 'calm_idle', fade: 0.4 },
    WALK: { clip: 'walk', matchSpeed: true },
    // Upright, blade cocked over the shoulder, dhal in front (the pack's own run is a hunched scurry).
    MOVE: { clip: 'run_with_sword', matchSpeed: true, fade: 0.22 },
    // Leaning in behind the dhal with the blade trailing low: a charge.
    SPRINT: { clip: 'standing_sprint_forward', matchSpeed: true, fade: 0.25 },
    // Standing jump; a running one on the move. Both have their height removed: physics does the leaving the ground.
    JUMP: { clip: 'jump_2', movingClip: 'jump', fade: 0.08 },
    // The combo: a wide standing cut, a low crouching cut, then a spinning leap that lands kneeling (the finisher).
    // Each starts past its settle from idle (`startAt`), so the blade comes round ~0.25 s after the click; a
    // follow-up, a slide or a deflect can cut a swing short once its blade has passed (Player).
    ATTACK_1: { clip: 'slash_3', startAt: 0.4, timeScale: 1.4, timesState: true, fade: 0.08 },
    ATTACK_2: { clip: 'slash_5', startAt: 0.15, timeScale: 1.35, timesState: true, fade: 0.08 },
    ATTACK_3: { clip: 'slash_4', startAt: 0.45, timeScale: 1.35, timesState: true, rootMotion: true, fade: 0.1 },
    // Out of a sprint: a running leap that comes down blade first, carrying him ~3 m (stretched to land on the target).
    ATTACK_JUMP: { clip: 'attack', startAt: 0.25, timeScale: 1.25, timesState: true, rootMotion: true, fade: 0.1 },
    // F / B: a running slide, low under blows for ~0.6 s, carrying him ~4.5 m.
    DODGE: { clip: 'slide_run', timeScale: 1.15, timesState: true, rootMotion: true, fade: 0.06 },
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
    // Struck and reeling, down on one knee and back up, in the state's 2.5 s (authored by game asset/characters/
    // yodha_post.py from Head Impact To Knees, Kneeling Down and Kneel To Stand).
    POSTURE_BROKEN: { clip: 'posture_break', fade: 0.12 },
    DEAD: { clip: 'death', fade: 0.1 },
  },
  // Walk, run and sprint are authored at 1.26, 3.13 and 4.73 m/s. Playback stays within ~1.1-1.2x: sped-up cycles
  // are what make a run look frantic and weightless.
  locomotion: { walkSpeed: 1.5, moveSpeed: 3.4, sprintSpeed: 5.4 },
  // His khanda and dhal (game asset/weapons/main character sword.glb / main character shield.glb through
  // game asset/characters/prepare_weapon.py / prepare_shield.py), held in the fists his finger bones close round them
  // (--fists --finger-markers; CharacterRig closes a hand on what its socket holds): each grip socket's +Y runs along
  // the fist's bar toward the thumb and +Z out of the back of the hand,
  // so the sword needs no rotation (blade up out of the thumb side). The dhal is turned half round so its face looks
  // off the front of the fist: measured in the game, that squares it to the enemy in guard (0.96), idle and hit
  // reactions, the hold the sword-and-shield clips were authored for. The walk, run and sprint were authored for a
  // shield carried facing out along the forearm, so there it turns to face that way (0.8-0.9 forward).
  weapon: {
    socket: 'Socket_Hand_R', socketFrame: true, restWorldRotation: [0, 0, 0], grip: [0, 0, 0],
    model: '/assets/weapons/yodha_khanda.glb', blade: [0.17, 0.87],
    // At ease the blade hangs lowered, pointing down and ahead, instead of straight out of the relaxed fist.
    stateRotations: { REST: [0, 0, 1.1] },
  },
  offhand: {
    socket: 'Socket_Hand_L', socketFrame: true, restWorldRotation: [0, Math.PI, 0], grip: [0, 0, 0],
    model: '/assets/weapons/yodha_dhal.glb',
    stateRotations: { WALK: [0, Math.PI / 2, 0], MOVE: [0, Math.PI / 2, 0], SPRINT: [0, Math.PI / 2, 0] },
  },
};

/**
 * His two looks (`Attire`, docs/STORY.md "The divya kavach"): the divya kavach is `YODHA`'s own model; the training
 * clothes (white dhoti, dark-orange sash, bamboo kavach) are `yodha_training.glb`, a Meshy 7 model of the same hero
 * auto-rigged and built with the same clips, flags and height (game asset/README.md), so every state, socket and
 * weapon hold above fits it unchanged.
 */
export const ATTIRE_MODELS: Record<Attire, Pick<CharacterDefinition, 'model' | 'manifest'>> = {
  kavach: { model: YODHA.model, manifest: YODHA.manifest },
  training: { model: '/assets/characters/yodha_training.glb', manifest: '/assets/characters/yodha_training.manifest.json' },
};

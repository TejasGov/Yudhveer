import type { CharacterDefinition } from '../animation/CharacterRig';

/*
 * Chapter II's people (docs/STORY.md, "Chapter II").
 */

/**
 * The old vanara mentor of the Hanuman akhada, sparring: the user's monkey-sage model (`monkey_sage.glb`, a bare
 * mesh rigged by `game asset/characters/autorig.py`, markers in `rigs/vanara.markers.json`; his tail is bound wholly
 * to the hips), 1.75 m to the top of his topknot, with his staff (`monkey_staff.glb`, a separate prop). He fights
 * with the Great Sword Pack's two-handed clips (Mace-*), the staff laid through both fists, plus clips authored for the
 * story (`vanara_post.py`): `staff_rest` and `staff_ponder` cut from its idles, and `staff_talk`, `staff_point`,
 * `staff_shake` (Mixamo talking clips, Vanara-*, laid over `staff_rest` so the staff stays planted while he talks).
 * Built from `game asset/characters`:
 *
 *   blender -b --factory-startup --python build_character.py -- rigs/vanara.rigged.glb animations <out>/vanara.glb
 *           --height 1.75 --fists --finger-markers rigs/vanara.fingers.json --post vanara_post.py --clips "<see the README>"
 *
 * His hands have finger bones: they close on the staff (the left too while the staff lies through both fists).
 *
 * Both the sparring partner (`entities/Vanara.ts`) and the story's cast member (`MENTOR_CAST`) use this model.
 */
export const MENTOR: CharacterDefinition = {
  model: '/assets/characters/vanara.glb',
  manifest: '/assets/characters/vanara.manifest.json',
  states: {
    // On guard, the staff held low across him and ready.
    IDLE: { clip: 'great_sword_idle', fade: 0.3 },
    // Out of the spar (cutscenes), leaning on the planted staff, a hand on his hip: his calm idle, as the cast's.
    REST: { clip: 'staff_rest', fade: 0.4 },
    WALK: { clip: 'great_sword_walk', matchSpeed: true },
    MOVE: { clip: 'great_sword_walk', matchSpeed: true, fade: 0.3 },
    SPRINT: { clip: 'great_sword_run', matchSpeed: true },
    // A wide sweep and a long lunging one: slow and plain to read, for a student. (The third, a turn of the whole body
    // into an overhead blow, is the opening's; it reaches barely a metre, too short to spar with.)
    ATTACK_1: { clip: 'great_sword_slash', timesState: true, fade: 0.2 },
    ATTACK_2: { clip: 'great_sword_slash_3', timesState: true, fade: 0.2 },
    ATTACK_3: { clip: 'great_sword_slash_4', timesState: true, fade: 0.2 },
    // A parried blow knocks the staff up across him; a heavy one rocks him back.
    DEFLECTED: { clip: 'great_sword_impact', fade: 0.08 },
    STAGGER: { clip: 'great_sword_impact_2', timeScale: 1.4, timesState: true, fade: 0.08 },
    POSTURE_BROKEN: { clip: 'great_sword_impact_2', timeScale: 0.7, fade: 0.1 },
    DEAD: { clip: 'two_handed_sword_death', fade: 0.12 },
  },
  locomotion: { walkSpeed: 1.4, moveSpeed: 1.6, sprintSpeed: 3.6 },
  // The staff in the right fist, its beaded end up (+Y); the game lays it through both fists when they are together.
  weapon: {
    socket: 'Socket_Hand_R', socketFrame: true, restWorldRotation: [0, 0, 0], grip: [0, 0, 0],
    model: '/assets/weapons/vanara_staff.glb', blade: [0.1, 0.96], twoHanded: 'Socket_Hand_L',
  },
};

/**
 * The same vanara as the story's cast member, once the lesson is over: he stands leaning on the planted staff, a hand
 * on his hip (`staff_rest`, his calm standing idle), and walks with it like a pilgrim's pole. `staff_ponder` (a hand
 * to his beard), `staff_talk` (looped), `staff_point` and `staff_shake` are played by cue on his lines.
 */
export const MENTOR_CAST: CharacterDefinition = {
  ...MENTOR,
  states: {
    ...MENTOR.states,
    IDLE: { clip: 'staff_rest', fade: 0.4 },
    WALK: { clip: 'iv_pole_walking', matchSpeed: true, fade: 0.3 },
    MOVE: { clip: 'great_sword_run', matchSpeed: true, fade: 0.25 },
  },
  locomotion: { walkSpeed: 1.1, moveSpeed: 2.8, sprintSpeed: 3.6 },
};

import type { CharacterDefinition } from '../animation/CharacterRig';
import { asset } from '../../core/Assets';

/**
 * The island keeper and the woman released from her binding. The spider scuttles; the human soul carries a proper
 * humanoid skeleton with a calm standing idle and a speed-matched walking loop.
 * The axe is deliberately absent from this rig's attachment table: it travels independently of the hand, and the
 * boss supplies its world-space blade segment and timed strike windows to the existing combat resolver.
 */
export const ISLAND_DEMONESS: CharacterDefinition = {
  model: asset('characters/island_demoness.glb'),
  manifest: asset('characters/island_demoness.manifest.json'),
  states: {
    IDLE: { clip: 'idle' }, REST: { clip: 'idle' }, WALK: { clip: 'move', matchSpeed: true },
    MOVE: { clip: 'move', matchSpeed: true }, SPRINT: { clip: 'move', matchSpeed: true },
    ATTACK_1: { clip: 'attack_1', timesState: true, fade: 0.1 },
    ATTACK_2: { clip: 'attack_2', timesState: true, fade: 0.1 },
    ATTACK_3: { clip: 'attack_3', timesState: true, fade: 0.1 },
    STAGGER: { clip: 'impact', timesState: true }, DEFLECTED: { clip: 'impact' },
    POSTURE_BROKEN: { clip: 'impact' }, DEAD: { clip: 'death', fade: 0.2 },
  },
  locomotion: { walkSpeed: 0.9, moveSpeed: 1.3, sprintSpeed: 1.6 },
};

/**
 * The soul's walking speed (m/s): what her loop was measured at (island_soul.manifest.json, `walk.speed`, a planted foot's
 * speed back through the model), so staged at this she plays at 1.0x with no slide. About 109 steps a minute.
 */
const SOUL_WALK_SPEED = 1.23;

export const ISLAND_SOUL: CharacterDefinition = {
  model: asset('characters/island_soul.glb'),
  manifest: asset('characters/island_soul.manifest.json'),
  states: {
    IDLE: { clip: 'idle' }, REST: { clip: 'idle' },
    WALK: { clip: 'walk', matchSpeed: true }, MOVE: { clip: 'walk', matchSpeed: true },
    SPRINT: { clip: 'walk', matchSpeed: true },
  },
  locomotion: { walkSpeed: SOUL_WALK_SPEED, moveSpeed: SOUL_WALK_SPEED, sprintSpeed: SOUL_WALK_SPEED },
};

import type { CharacterDefinition } from '../animation/CharacterRig';
import { asset } from '../../core/Assets';

/**
 * Chapter II, the Vetala: a hooded twin-blade fighter (`level 2 fighter.fbx`, already Mixamo-rigged; his hands are
 * modelled as fists). Built with Yodha's sword clips (run from `game asset/characters`):
 *
 *   blender -b --factory-startup --python build_character.py -- "sources/level 2 fighter.fbx" animations <out>/vetala.glb
 *     --clips "idle_4,walk,run_with_sword,standing_sprint_forward,strafe,strafe_2,walk_2,slash_3,slash_5,slash_4,attack_4,impact_3,impact_2,crouch_idle,death_2,power_up,calm_idle"
 */
export const VETALA: CharacterDefinition = {
  model: asset('characters/vetala.glb'),
  manifest: asset('characters/vetala.manifest.json'),
  states: {
    IDLE: { clip: 'idle_4', fade: 0.25 },
    REST: { clip: 'calm_idle', fade: 0.4 }, // at ease: a relaxed stand (Stance-Calm Idle)
    WALK: { clip: 'walk', matchSpeed: true },
    MOVE: { clip: 'run_with_sword', matchSpeed: true, fade: 0.2 },
    SPRINT: { clip: 'standing_sprint_forward', matchSpeed: true },
    STRAFE_LEFT: { clip: 'strafe', matchSpeed: true, fade: 0.25 },
    STRAFE_RIGHT: { clip: 'strafe_2', matchSpeed: true, fade: 0.25 },
    WALK_BACK: { clip: 'walk_2', matchSpeed: true, fade: 0.25 },
    ATTACK_1: { clip: 'slash_3', timeScale: 1.4, timesState: true, fade: 0.12 },
    ATTACK_2: { clip: 'slash_5', timeScale: 1.3, timesState: true, fade: 0.1 },
    ATTACK_3: { clip: 'slash_4', timeScale: 1.3, timesState: true, rootMotion: true, fade: 0.1 },
    CHARGE: { clip: 'power_up', timesState: true, fade: 0.2 },
    STAGGER: { clip: 'impact_3', timeScale: 1.3, timesState: true, fade: 0.05 },
    DEFLECTED: { clip: 'impact_2', timeScale: 1.2, fade: 0.05 },
    POSTURE_BROKEN: { clip: 'crouch_idle', fade: 0.2 },
    DEAD: { clip: 'death_2', fade: 0.1 },
  },
  locomotion: { walkSpeed: 1.3, moveSpeed: 3.6, sprintSpeed: 5 },
  // His two notched swords (made with the character, in characters/vampire_indian/weapons), one in each fist.
  weapon: {
    socket: 'Socket_Hand_R', restWorldRotation: [Math.PI / 2, 0, 0], grip: [0.0964, 0.0234, -0.0261],
    model: asset('weapons/vetala_sword_r.glb'), blade: [0.11, 0.97],
    stateRotations: { REST: [2.792, -0.426, 1.743] }, // at ease: both blades hang lowered (solved in the calm pose)
  },
  offhand: {
    socket: 'Socket_Hand_L', restWorldRotation: [Math.PI / 2, Math.PI, 0], grip: [0.0964, 0.0234, 0.0261],
    model: asset('weapons/vetala_sword_l.glb'),
    stateRotations: { REST: [0.959, -0.117, -1.118] },
  },
};

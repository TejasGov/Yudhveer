import type { CharacterDefinition } from '../animation/CharacterRig';

/**
 * Chapter II, Mayavi: a horned asura sorcerer (`level 2 magician.fbx`, already Mixamo-rigged) who throws spells
 * from range. Built with the NPC clips plus Yodha's casts and Mixamo's "Magic Attack 01":
 *
 *   blender -b --factory-startup --python build_character.py -- "sources/level 2 magician.fbx" animations <out>/mayavi.glb
 *     --prefixes "NPC" --clips "casting,casting_2,magic_attack_01,idle_2,impact_3,impact_2,strafe,strafe_2,walk_2,crouch_idle"
 */
export const MAYAVI: CharacterDefinition = {
  model: '/assets/characters/mayavi.glb',
  manifest: '/assets/characters/mayavi.manifest.json',
  states: {
    IDLE: { clip: 'idle_2', fade: 0.3 },
    WALK: { clip: 'walk', matchSpeed: true },
    MOVE: { clip: 'run', matchSpeed: true, fade: 0.2 },
    SPRINT: { clip: 'run', matchSpeed: true },
    STRAFE_LEFT: { clip: 'strafe', matchSpeed: true, fade: 0.25 },
    STRAFE_RIGHT: { clip: 'strafe_2', matchSpeed: true, fade: 0.25 },
    WALK_BACK: { clip: 'walk_2', matchSpeed: true, fade: 0.25 },
    // Cornered, he claws and kicks.
    ATTACK_1: { clip: 'slash', timeScale: 1.1, timesState: true, fade: 0.12 },
    ATTACK_2: { clip: 'sword_kick', timeScale: 1.2, timesState: true, fade: 0.12 },
    // A single bolt; the three-bolt volley is CHARGE.
    CAST: { clip: 'casting_2', timeScale: 1.05, timesState: true, fade: 0.12 },
    CHARGE: { clip: 'magic_attack_01', timeScale: 1.1, timesState: true, fade: 0.15 },
    STAGGER: { clip: 'impact_3', timeScale: 1.3, timesState: true, fade: 0.05 },
    DEFLECTED: { clip: 'impact_2', timeScale: 1.2, fade: 0.05 },
    POSTURE_BROKEN: { clip: 'crouch_idle', fade: 0.2 },
    DEAD: { clip: 'death', fade: 0.1 },
  },
  locomotion: { walkSpeed: 1.2, moveSpeed: 3.2, sprintSpeed: 4.6 },
  // No weapon: a short reach along the right hand (the rig rests in a T-pose, hand pointing out to his right).
  weapon: { socket: 'Socket_Hand_R', restWorldRotation: [0, 0, Math.PI / 2], grip: [0, 0, 0], blade: [0, 0.3] },
};

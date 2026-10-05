import * as THREE from 'three';
import type { CharacterDefinition, StateAnimation } from '../animation/CharacterRig';
import type { CharacterState } from '../CharacterStateMachine';
import type { Attire, WeaponId } from '../../game/Progression';
import { ATTIRE_MODELS, YODHA } from './Yodha';
import type { SwingKind, ImpactKind } from '../../combat/SoundFX';

/** What one blow of a weapon does to whoever it lands on. `heavy` blows break through a committed attack. */
export interface Blow {
  damage: number;
  posture: number;
  heavy?: boolean;
}

/** How a weapon sounds: which recorded whoosh and impact (combat/SoundFX.ts), and each swing's pitch. */
export interface WeaponSound {
  /** Whoosh pitch per swing (ATTACK_1, ATTACK_2, ATTACK_3); lower is heavier. */
  swing: [number, number, number];
  /** Which whoosh: swing_blade, swing_lathi or swing_heavy. */
  whoosh: SwingKind;
  /** Which blow: hit_blade, hit_wood or hit_crush. */
  impact: ImpactKind;
}

/**
 * Everything that makes one weapon a different way to fight: the hero's rig for it (move set, grip, hit windows are
 * measured from the clips it names), what each blow does, how it sounds, and whether it comes with the dhal.
 */
export interface WeaponSet {
  id: WeaponId;
  name: string;
  definition: CharacterDefinition;
  /** Per attack state; a state the weapon has no move for is simply absent. */
  blows: Partial<Record<CharacterState, Blow>>;
  /** Carried with the dhal on the left arm (block and parry need it). Derived from the definition. */
  shield: boolean;
  /** Can go in the scabbard (X). A staff or a mace is carried, not sheathed. */
  stowable: boolean;
  sound: WeaponSound;
}

/** A weapon set's rig on the model of what he wears (the same clips and sockets either way). */
export function dressed(set: WeaponSet, attire: Attire): CharacterDefinition {
  return { ...set.definition, ...ATTIRE_MODELS[attire] };
}

/** A hero rig on `YODHA`'s model, clips and locomotion with the pieces a weapon changes swapped in. */
function heroWith(parts: Pick<CharacterDefinition, 'weapon'> & { states?: Partial<Record<CharacterState, StateAnimation>>; offhand?: false }): CharacterDefinition {
  const { states, offhand, ...rest } = parts;
  const def: CharacterDefinition = { ...YODHA, ...rest, states: { ...YODHA.states, ...states } };
  if (offhand === false) delete def.offhand;
  // A state set to undefined is a move the weapon does not have.
  const table: Partial<Record<CharacterState, StateAnimation>> = def.states;
  for (const state of Object.keys(table) as CharacterState[]) if (!table[state]) delete table[state];
  return def;
}

/**
 * The lathi: a 1.55 m bamboo staff shod in iron at both ends, gripped a third of the way up. Built in code until the
 * user's model arrives (drop a GLB in and use `model` instead of `build`). Grip at the origin, striking end up +Y.
 */
function buildLathi(): THREE.Group {
  const lathi = new THREE.Group();
  const bamboo = new THREE.MeshStandardMaterial({ color: 0x9a7a3c, roughness: 0.7, metalness: 0 });
  const knot = new THREE.MeshStandardMaterial({ color: 0x5e4620, roughness: 0.8, metalness: 0 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a3a42, roughness: 0.45, metalness: 0.8 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.castShadow = true;
    lathi.add(m);
  };
  add(new THREE.CylinderGeometry(0.022, 0.027, 1.55, 12), bamboo, 0.225);
  for (const y of [-0.2, 0.28, 0.7]) add(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 12), knot, y);
  for (const y of [-0.52, 0.97]) add(new THREE.CylinderGeometry(0.032, 0.032, 0.1, 12), iron, y);
  add(new THREE.SphereGeometry(0.03, 10, 8), iron, 1.02);
  return lathi;
}

// The lathi's moves are three swings cut out of Mixamo's "One Hand Club Combo" (strikes at 0.5, 1.2 and 2.1 s).
const LATHI_STATES: Partial<Record<CharacterState, StateAnimation>> = {
  ATTACK_1: { clip: 'one_hand_club_combo', startAt: 0.2, endAt: 1.0, timeScale: 1.2, timesState: true, fade: 0.08 },
  ATTACK_2: { clip: 'one_hand_club_combo', startAt: 1.0, endAt: 1.85, timeScale: 1.2, timesState: true, fade: 0.1 },
  ATTACK_3: { clip: 'one_hand_club_combo', startAt: 1.85, endAt: 2.65, timeScale: 1.1, timesState: true, fade: 0.1 },
};

// The mace's are Mixamo's Great Sword Pack ("Mace-" in game asset/characters/animations), held two-handed: the haft
// is aimed through both fists every frame (`twoHanded`). A wide two-handed sweep, an overhead smash driven down from
// a crouch, the high spin attack (two blows, travelling ~2 m) as the finisher, and the jump attack for the slam out of
// a run. Its own idle, walk, run, hit reactions and death keep both hands on the haft between blows.
const MACE_STATES: Partial<Record<CharacterState, StateAnimation>> = {
  IDLE: { clip: 'great_sword_idle', fade: 0.3 },
  WALK: { clip: 'great_sword_walk', matchSpeed: true },
  MOVE: { clip: 'great_sword_run_2', matchSpeed: true, fade: 0.22 },
  SPRINT: { clip: 'great_sword_run_2', matchSpeed: true, fade: 0.25 },
  ATTACK_1: { clip: 'great_sword_slash', startAt: 0.34, endAt: 1.05, timeScale: 1.05, timesState: true, fade: 0.1 },
  ATTACK_2: { clip: 'great_sword_slash_3', startAt: 0.35, endAt: 1.3, timeScale: 1.15, timesState: true, fade: 0.1 },
  ATTACK_3: { clip: 'great_sword_high_spin_attack', startAt: 0.2, endAt: 1.6, timeScale: 1.1, timesState: true, rootMotion: true, fade: 0.12 },
  ATTACK_JUMP: { clip: 'great_sword_jump_attack', startAt: 0.25, endAt: 1.9, timeScale: 1.2, timesState: true, rootMotion: true, fade: 0.12 },
  STAGGER: { clip: 'great_sword_impact_2', timeScale: 1.3, timesState: true, fade: 0.05 },
  DEFLECTED: { clip: 'great_sword_impact', timeScale: 1.3, fade: 0.05 },
  DEAD: { clip: 'two_handed_sword_death_2', fade: 0.1 },
};

/**
 * The hero's arms, one set per weapon (`WeaponId`). A set with no ATTACK_JUMP has no leaping strike whatever the
 * kit allows. The dhal comes with the sword sets only: the lathi and the two-handed mace leave the left hand free.
 *
 * PLACEHOLDERS to replace with proper models and clips: the lathi (built in code), the basic sword (the Vetala's
 * notched blade), the mace (the hero's own gada) and the club-combo clips the lathi borrows.
 * The mace's clips are its own (two-handed, the Great Sword Pack); only its model is borrowed.
 */
export const WEAPON_SETS: Record<WeaponId, WeaponSet> = {
  lathi: {
    id: 'lathi',
    name: 'Lathi',
    definition: heroWith({
      offhand: false,
      states: { ...LATHI_STATES, ATTACK_JUMP: undefined },
      // At ease he holds it upright at his side, its foot by his heel.
      weapon: {
        socket: 'Socket_Hand_R', socketFrame: true, restWorldRotation: [0, 0, 0], grip: [0, 0, 0], build: buildLathi, blade: [0.05, 1.0],
        stateRotations: { REST: [0, 0, -1.45] },
      },
    }),
    // Light blows with the weight in the posture: a staff breaks a stance before it breaks a man.
    blows: {
      ATTACK_1: { damage: 17, posture: 26 },
      ATTACK_2: { damage: 22, posture: 32 },
      ATTACK_3: { damage: 36, posture: 52, heavy: true },
    },
    shield: false,
    stowable: false,
    sound: { swing: [1.25, 1.4, 1.1], whoosh: 'lathi', impact: 'wood' },
  },
  sword: {
    id: 'sword',
    name: 'Sword',
    definition: heroWith({
      weapon: {
        socket: 'Socket_Hand_R', socketFrame: true, restWorldRotation: [0, 0, 0], grip: [0.0964, 0.0234, -0.0261],
        model: '/assets/weapons/vetala_sword_r.glb', blade: [0.11, 0.97],
        stateRotations: { REST: [0, 0, 1.1] }, // lowered at ease, as the khanda
      },
    }),
    // The magical khanda's moves at four fifths of its strength.
    blows: {
      ATTACK_1: { damage: 18, posture: 20 },
      ATTACK_2: { damage: 24, posture: 26 },
      ATTACK_3: { damage: 38, posture: 40, heavy: true },
      ATTACK_JUMP: { damage: 44, posture: 48, heavy: true },
    },
    shield: true,
    stowable: true,
    sound: { swing: [1, 1.15, 0.85], whoosh: 'blade', impact: 'blade' },
  },
  mace: {
    id: 'mace',
    name: 'Blessed mace',
    definition: heroWith({
      offhand: false,
      states: MACE_STATES,
      // The hero's own gada (game asset/weapons/hero_mace.glb, 1.05 m, gripped 0.23 m up the haft), not Shalva's: the
      // right fist 6 cm further up the haft toward the head, so the left, ~0.2 m below it, closes on the haft with a
      // hand's breadth of it below (not on the butt), the haft laid through both.
      weapon: {
        socket: 'Socket_Hand_R', socketFrame: true, restWorldRotation: [0, 0, 0], grip: [0, 0.06, 0],
        model: '/assets/weapons/hero_mace.glb', blade: [0.42, 0.82], scale: 1, twoHanded: 'Socket_Hand_L',
        // At ease, one-handed by the haft, its head resting by his foot.
        stateRotations: { REST: [0, 0, 1.25] },
      },
    }),
    // Slow and heavy: every blow costs a beat, and the third and the slam break through anything. The spinning
    // finisher lands twice, so each of its two blows is half a finisher.
    blows: {
      ATTACK_1: { damage: 36, posture: 44 },
      ATTACK_2: { damage: 46, posture: 54 },
      ATTACK_3: { damage: 38, posture: 46, heavy: true },
      ATTACK_JUMP: { damage: 80, posture: 90, heavy: true },
    },
    shield: false,
    stowable: false,
    sound: { swing: [0.7, 0.62, 0.55], whoosh: 'heavy', impact: 'crush' },
  },
  khanda: {
    id: 'khanda',
    name: 'Magical khanda',
    definition: YODHA,
    // The strength the whole game was tuned against.
    blows: {
      ATTACK_1: { damage: 22, posture: 25 },
      ATTACK_2: { damage: 30, posture: 32 },
      ATTACK_3: { damage: 48, posture: 50, heavy: true },
      ATTACK_JUMP: { damage: 55, posture: 60, heavy: true },
    },
    shield: true,
    stowable: true,
    sound: { swing: [1, 1.15, 0.85], whoosh: 'blade', impact: 'blade' },
  },
};

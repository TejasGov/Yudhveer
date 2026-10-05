import * as THREE from 'three';
import type { CharacterDefinition, StateAnimation } from '../animation/CharacterRig';
import type { CharacterState } from '../CharacterStateMachine';
import type { Attire, WeaponId } from '../../game/Progression';
import { ATTIRE_MODELS, YODHA } from './Yodha';
import { buildScabbard, KHANDA_SCABBARD, SWORD_SCABBARD } from './Scabbard';
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
function heroWith(parts: Pick<CharacterDefinition, 'weapon' | 'sheath'> & { states?: Partial<Record<CharacterState, StateAnimation>>; offhand?: false }): CharacterDefinition {
  const { states, offhand, ...rest } = parts;
  const def: CharacterDefinition = { ...YODHA, ...rest, states: { ...YODHA.states, ...states } };
  if (offhand === false) delete def.offhand;
  // A state set to undefined is a move the weapon does not have.
  const table: Partial<Record<CharacterState, StateAnimation>> = def.states;
  for (const state of Object.keys(table) as CharacterState[]) if (!table[state]) delete table[state];
  return def;
}

/**
 * The lathi: a 1.55 m bamboo staff shod in iron at both ends, from -0.57 to +1.05 up its +Y (the striking end up).
 * Built in code until the user's model arrives (drop a GLB in and use `model` instead of `build`).
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

/**
 * A lathi is swung with both hands, held near its foot as a long staff is for a full swing: the right fist 0.27 m up
 * from the iron foot, the left below it (the two-handed clips keep the fists ~0.2 m apart) with a hand's breadth of
 * bamboo under it, and 1.3 m of staff out past the right fist. Held further up (0.45 m from the foot), the quarter
 * metre under the left fist ran into his left hip and thigh in the guard, the walk and the spin. (Mixamo's one-handed
 * club swings it had before put the 1.55 m staff through his left arm and past his head: a club's arcs, not a staff's.)
 */
const LATHI_GRIP: [number, number, number] = [0, -0.3, 0];

// The lathi's moves are the mace's two-handed Great Sword Pack clips, timed as the old lathi's (each swing ~0.7 s,
// the finisher ~1 s): a wide sweep (entered past its back-swing, as the mace's is, so the back-swing never counts as
// a blow), an overhead blow, and the high spin as the finisher (two blows, travelling ~2 m), the staff aimed through
// both fists every frame (`twoHanded`). The overhead blow is entered at the top of its swing (0.72 s), its cross-fade
// out of the sweep the wind-up: from its own wind-up, or from any earlier point, the fists rise past his face and the
// line through them (so the staff) runs through his head for a few frames, whenever in the sweep's recovery it is
// chained. It only ever follows the sweep. Its guard, run, hit reactions and death keep both hands on it too; the
// walk is the hero's own (the staff carried in one hand), because the cutscenes walk him: up to the Devi's shrine,
// into the stepwell, out of the burning village, where a guard walk read as stalking. The slide, jump, charge and
// posture break keep the hero's own clips as well (the fists part and the staff slides back into the right fist).
// Measured frame by frame over the chain (chained at every moment it can be) and those clips: no part of him comes
// within the staff's radius but the hands that hold it. (The charge, Mixamo's "Power Up", draws both fists in to his
// chest: any staff in his hand crosses his head for a few frames there, as the old lathi did.)
const LATHI_STATES: Partial<Record<CharacterState, StateAnimation>> = {
  IDLE: { clip: 'great_sword_idle', fade: 0.3 },
  MOVE: { clip: 'great_sword_run_2', matchSpeed: true, fade: 0.22 },
  SPRINT: { clip: 'great_sword_run_2', matchSpeed: true, fade: 0.25 },
  ATTACK_1: { clip: 'great_sword_slash', startAt: 0.34, endAt: 1.05, timeScale: 1, timesState: true, fade: 0.08 },
  ATTACK_2: { clip: 'great_sword_slash_3', startAt: 0.72, endAt: 1.3, timeScale: 0.8, timesState: true, fade: 0.22 },
  ATTACK_3: { clip: 'great_sword_high_spin_attack', startAt: 0.2, endAt: 1.6, timeScale: 1.35, timesState: true, rootMotion: true, fade: 0.12 },
  STAGGER: { clip: 'great_sword_impact_2', timeScale: 1.3, timesState: true, fade: 0.05 },
  DEFLECTED: { clip: 'great_sword_impact', timeScale: 1.3, fade: 0.05 },
  DEAD: { clip: 'two_handed_sword_death_2', fade: 0.1 },
};

/**
 * The basic sword's grip on its model (the Vetala's notched blade, `vetala_sword_r.glb`, not prepared to the
 * convention): the middle of its wrapped grip, on the grip's axis. The Vetala's own offset ([0.096, 0.023, -0.026])
 * suits his sockets, which are not at the fist's hole; on the hero's (--fists) socket it held the grip 9 cm off the
 * fist, beside the open fingers.
 */
const SWORD_GRIP: [number, number, number] = [0.028, 0.125, 0.006];

/**
 * How a sheathed blade hangs, in `Socket_Sheath`'s frame (its +Y ran straight back, level, from where the hand was at
 * the sheathe clip's "sheathed" mark): turned down about the socket's sideways axis and out, so the scabbard runs down
 * and back along the outside of the left thigh, 47 degrees below level and 17 out, its hilt up and forward at the hip
 * where the hand reaches it, the edge up. Measured in the calm stand. Over the walks, runs, guards, swings and hits
 * its lower half keeps 12 cm or more from the left hand and 10 cm from the left shin (bone to scabbard axis) but in
 * the finisher's kneeling landing; level with the hip it was the shin that ran through it, a few frames each stride.
 */
const SHEATHED: [number, number, number] = [-0.1006, -0.0487, 0.9019];

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
 * notched blade) and the mace (the hero's own gada). The mace's and the lathi's clips are two-handed ones (the Great
 * Sword Pack); the sword and the khanda hang in code-built scabbards (Scabbard.ts) when sheathed.
 */
export const WEAPON_SETS: Record<WeaponId, WeaponSet> = {
  lathi: {
    id: 'lathi',
    name: 'Lathi',
    definition: heroWith({
      offhand: false,
      states: { ...LATHI_STATES, ATTACK_JUMP: undefined },
      // In both fists, laid through them by the two-handed clips. At ease he holds it upright at his side in one, its
      // top leaning 12 degrees ahead of him (straight up, it ran up through his forearm), slid down through his hand
      // until its foot is by his heel, a few centimetres off the ground.
      weapon: {
        socket: 'Socket_Hand_R', socketFrame: true, restWorldRotation: [0, 0, 0], grip: LATHI_GRIP, build: buildLathi, blade: [0.05, 1.0],
        twoHanded: 'Socket_Hand_L',
        // In one hand (a slide, a fall, the prologue's beating and night) it is held a third of the way up, as before.
        oneHandGrip: [0, 0, 0],
        stateRotations: { REST: [-0.146, 0.117, -1.357] },
        stateGrips: { REST: [0, 0.16, 0] },
      },
    }),
    // Light blows with the weight in the posture: a staff breaks a stance before it breaks a man. The spinning
    // finisher lands twice, so each of its two blows is half of the one it had as a single swing.
    blows: {
      ATTACK_1: { damage: 17, posture: 26 },
      ATTACK_2: { damage: 22, posture: 32 },
      ATTACK_3: { damage: 18, posture: 26, heavy: true },
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
        socket: 'Socket_Hand_R', socketFrame: true, restWorldRotation: [0, 0, 0], grip: SWORD_GRIP,
        model: '/assets/weapons/vetala_sword_r.glb', blade: [0.11, 0.97],
        stateRotations: { REST: [0, 0, 1.1] }, // lowered at ease, as the khanda
      },
      sheath: { socket: 'Socket_Sheath', socketFrame: true, restWorldRotation: SHEATHED, grip: SWORD_GRIP, build: () => buildScabbard(SWORD_SCABBARD) },
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
    definition: {
      ...YODHA,
      sheath: { socket: 'Socket_Sheath', socketFrame: true, restWorldRotation: SHEATHED, grip: [0, 0, 0], build: () => buildScabbard(KHANDA_SCABBARD) },
    },
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

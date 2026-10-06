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
  // The same definition each time (his strike windows are measured once for it, `Character.fitProps`).
  const key = `${set.id}:${attire}`;
  let definition = DRESSED.get(key);
  if (!definition) DRESSED.set(key, (definition = { ...set.definition, ...ATTIRE_MODELS[attire] }));
  return definition;
}
const DRESSED = new Map<string, CharacterDefinition>();

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

/** Where the lathi's foot and head are up its +Y (m), and the bamboo's radius at each: it tapers toward the head. */
const LATHI = { foot: -0.57, head: 1.05, footRadius: 0.0255, headRadius: 0.0192 } as const;
/** The bamboo's radius at height `y` (m). */
const lathiRadius = (y: number) => THREE.MathUtils.lerp(LATHI.footRadius, LATHI.headRadius, (y - LATHI.foot) / (LATHI.head - LATHI.foot));
/**
 * The bamboo's nodes, up from the foot. A culm's joints crowd toward its thick end and spread toward the thin one, so
 * the internodes run from 29 cm to 34 cm. The cord hides the stretch below the first.
 */
const LATHI_NODES = [-0.16, 0.13, 0.44, 0.78];
/**
 * The cord wound round the grip, from just above the foot's iron to a hand's breadth above the right fist: both hands
 * lie on it. Its turns touch (a turn is a little under the cord's width), and it sinks into the bamboo by a fifth of
 * its thickness.
 */
const LATHI_CORD = { from: -0.512, to: -0.232, turns: 35, radius: 0.0042, sink: 0.0018 } as const;

/**
 * A surface of revolution about +Y from a profile of (radius, height, colour) points, the colour laid in as vertex
 * colours: a hard edge is two points at the same place with two colours (the lathe's own normals then split there too).
 */
function turned(profile: [radius: number, y: number, colour: number][], sides = 12): THREE.BufferGeometry {
  const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), sides);
  // LatheGeometry lays its vertices out one profile point after another round each of the `sides + 1` columns.
  const colour = new THREE.Color();
  const colours: number[] = [];
  for (let column = 0; column <= sides; column++) {
    for (const [, , hex] of profile) colours.push(...colour.setHex(hex).toArray());
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  return geometry;
}

/**
 * The lathi: a bamboo staff from -0.57 to +1.05 up its +Y (the striking end up), 1.62 m with its iron. It tapers from
 * the thick foot to the thin head; the bamboo is darker at its nodes, each a ridge standing proud of the shaft, with a
 * slight change of tone between one internode and the next; a red cord is wound round the grip, under both fists, and
 * both ends are shod in iron: the foot's a ferrule with a ridge, the head's a brass band under a longer cap with a
 * ridge and a dome. Plain colours and strong shapes, so the cel ramp and
 * the ink lines do the rest (as on the scabbards); one vertex-coloured material for the whole staff but the cord.
 * Built in code until the user's model arrives (drop a GLB in and use `model` instead of `build`).
 */
export function buildLathi(): THREE.Group {
  const lathi = new THREE.Group();
  lathi.name = 'Lathi';
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    lathi.add(mesh);
  };
  const turnedMaterial = new THREE.MeshStandardMaterial({ name: 'Lathi_Turned', vertexColors: true, roughness: 0.75, metalness: 0 });

  // The shaft: from inside the foot's iron to inside the head's. An internode is lighter mid-way and a shade darker where
  // it meets a node, and each is a touch different from its neighbours (cut from one culm, no two joints alike).
  const tones = [0xa07f45, 0xa8884c, 0x9a7a42, 0xa48449, 0x9d7d44, 0xa58549];
  const NODE = 0x4b3318;
  const shade = (hex: number, k: number) => new THREE.Color(hex).multiplyScalar(k).getHex();
  const shaft: [number, number, number][] = [];
  const bounds = [LATHI.foot + 0.04, ...LATHI_NODES, LATHI.head - 0.09];
  for (let i = 0; i < bounds.length - 1; i++) {
    const below = i === 0 ? bounds[0] : bounds[i] + 0.02;
    const above = i === bounds.length - 2 ? bounds[i + 1] : bounds[i + 1] - 0.02;
    // The internode: a few points up it, the tone eased from darker at each node to lighter between.
    for (const [k, light] of [[0, 0.86], [0.25, 0.97], [0.5, 1.0], [0.75, 0.97], [1, 0.86]] as const) {
      const y = THREE.MathUtils.lerp(below, above, k);
      shaft.push([lathiRadius(y), y, shade(tones[i % tones.length], light)]);
    }
    if (i < LATHI_NODES.length) {
      // The node itself: a ridge 3.5 mm proud with sloped shoulders, 22 mm across at its top.
      const y = LATHI_NODES[i];
      for (const dy of [-0.011, 0.011]) shaft.push([lathiRadius(y + dy) + 0.0035, y + dy, NODE]);
    }
  }
  add(turned(shaft), turnedMaterial);

  // The iron: the foot's ferrule (a flat heel, chamfered, a ridge near its top) and the head's (a brass band, then a cap
  // with a ridge that rises to a dome). Their ends lie over the shaft's.
  const IRON = 0x5d6068;
  const BRASS = 0xb48a3a;
  const foot = LATHI.foot;
  const head = LATHI.head;
  add(turned([
    [0, foot, IRON], [0.02, foot, IRON], [0.027, foot + 0.007, IRON], [0.029, foot + 0.014, IRON], [0.029, foot + 0.034, IRON],
    [0.0312, foot + 0.034, IRON], [0.0312, foot + 0.0425, IRON], [0.029, foot + 0.0425, IRON], [0.029, foot + 0.05, IRON],
    [0.0268, foot + 0.0505, IRON], [0.0245, foot + 0.0506, IRON],
  ]), turnedMaterial);
  add(turned([
    [0.018, head - 0.097, BRASS], [0.0226, head - 0.097, BRASS], [0.0226, head - 0.083, BRASS], [0.0212, head - 0.081, BRASS],
    [0.0245, head - 0.081, IRON], [0.0245, head - 0.056, IRON], [0.0266, head - 0.056, IRON], [0.0266, head - 0.046, IRON],
    [0.0245, head - 0.046, IRON], [0.0245, head - 0.027, IRON], [0.0225, head - 0.0155, IRON], [0.0152, head - 0.0045, IRON],
    [0.0072, head - 0.001, IRON], [0, head, IRON],
  ]), turnedMaterial);

  // The cord: one round of a tube about the grip, laid in turns that touch.
  const { from, to, turns, radius, sink } = LATHI_CORD;
  class Wound extends THREE.Curve<THREE.Vector3> {
    constructor() {
      super();
    }

    override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
      const y = THREE.MathUtils.lerp(from, to, t);
      const a = t * turns * Math.PI * 2;
      const r = lathiRadius(y) + radius - sink;
      return target.set(Math.cos(a) * r, y, Math.sin(a) * r);
    }
  }
  add(new THREE.TubeGeometry(new Wound(), turns * 10, radius, 8, false), new THREE.MeshStandardMaterial({ name: 'Lathi_Cord', color: 0x7c3027, roughness: 0.9, metalness: 0 }));
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

/**
 * The gathering of Shakti with a weapon held in both hands: the Great Sword Pack's "Power Up" (`great_sword_power_up`,
 * 3.03 s: he bows over the weapon held before him, draws a breath and lifts it, the fists ~0.2 m apart on its haft the
 * whole way), played at 1.536x so the charge lasts the 1.975 s the hero's own "Power Up" (2.37 s at 1.2x) gave it: how
 * long the button is held is balance, not look. Measured over the clip with the mace and with the lathi laid through
 * both fists (`CharacterRig.aimTwoHanded`'s rule), the weapon's line comes no nearer his head than 0.39 m (the hero's
 * own clip: 0.15 m, through the head).
 */
const CHARGE_TWO_HANDED: StateAnimation = { clip: 'great_sword_power_up', timeScale: 1.536, timesState: true };

// The lathi's moves are the mace's two-handed Great Sword Pack clips, timed as the old lathi's (each swing ~0.7 s,
// the finisher ~1 s): a wide sweep (entered past its back-swing, as the mace's is, so the back-swing never counts as
// a blow), an overhead blow, and the high spin as the finisher (two blows, travelling ~2 m), the staff aimed through
// both fists every frame (`twoHanded`). The overhead blow is entered at the top of its swing (0.72 s), its cross-fade
// out of the sweep the wind-up: from its own wind-up, or from any earlier point, the fists rise past his face and the
// line through them (so the staff) runs through his head for a few frames, whenever in the sweep's recovery it is
// chained. It only ever follows the sweep. Its guard, run, hit reactions and death keep both hands on it too; the
// walk is the hero's own (the staff carried in one hand), because the cutscenes walk him: up to the Devi's shrine,
// into the stepwell, out of the burning village, where a guard walk read as stalking. The slide, jump and posture break
// keep the hero's own clips as well (the fists part and the staff slides back into the right fist).
// Measured frame by frame over the chain (chained at every moment it can be) and those clips: no part of him comes
// within the staff's radius but the hands that hold it. The charge is the Great Sword Pack's own (`CHARGE_TWO_HANDED`),
// not the hero's Mixamo "Power Up", which draws both fists in to his chest and crossed any staff in his hand over his
// head for a few frames.
const LATHI_STATES: Partial<Record<CharacterState, StateAnimation>> = {
  IDLE: { clip: 'great_sword_idle', fade: 0.3 },
  MOVE: { clip: 'great_sword_run_2', matchSpeed: true, fade: 0.22 },
  SPRINT: { clip: 'great_sword_run_2', matchSpeed: true, fade: 0.25 },
  ATTACK_1: { clip: 'great_sword_slash', startAt: 0.34, endAt: 1.05, timeScale: 1, timesState: true, fade: 0.08 },
  ATTACK_2: { clip: 'great_sword_slash_3', startAt: 0.72, endAt: 1.3, timeScale: 0.8, timesState: true, fade: 0.22 },
  ATTACK_3: { clip: 'great_sword_high_spin_attack', startAt: 0.2, endAt: 1.6, timeScale: 1.35, timesState: true, rootMotion: true, fade: 0.12 },
  CHARGE: CHARGE_TWO_HANDED,
  STAGGER: { clip: 'great_sword_impact_2', timeScale: 1.3, timesState: true, fade: 0.05 },
  DEFLECTED: { clip: 'great_sword_impact', timeScale: 1.3, fade: 0.05 },
  DEAD: { clip: 'two_handed_sword_death_2', fade: 0.1 },
};

/**
 * The basic sword's grip on its model: none to speak of. `hero_sword.glb` is the hero's own talwar (Meshy 7.1, made for
 * the game and prepared with `prepare_weapon.py`), so its grip is at the origin and its blade runs up +Y like the
 * khanda's, and the fist closes on it with no offset. (It used to be the Vetala's notched blade, whose model was
 * never prepared and needed an offset onto its wrapped grip.)
 */
const SWORD_GRIP: [number, number, number] = [0, 0, 0];

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
  CHARGE: CHARGE_TWO_HANDED,
  STAGGER: { clip: 'great_sword_impact_2', timeScale: 1.3, timesState: true, fade: 0.05 },
  DEFLECTED: { clip: 'great_sword_impact', timeScale: 1.3, fade: 0.05 },
  DEAD: { clip: 'two_handed_sword_death_2', fade: 0.1 },
};

/**
 * The hero's arms, one set per weapon (`WeaponId`). A set with no ATTACK_JUMP has no leaping strike whatever the
 * kit allows. The dhal comes with the sword sets only: the lathi and the two-handed mace leave the left hand free.
 *
 * The lathi is built in code (a model of it is still to come) and the mace is the hero's own gada; the basic sword is a
 * talwar made for him with Meshy. The mace's and the lathi's clips are two-handed ones (the Great Sword Pack); the sword
 * and the khanda hang in code-built scabbards (Scabbard.ts) when sheathed.
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
      // His own talwar (game asset/weapons/hero_sword_meshy7.glb, 0.98 m): a gently curved blade, 5.7 cm across (a half
      // broader than the model made it: at 3.8 cm it was a thread beside the dhal and the khanda's 12 cm) over a disc
      // pommel, its guard at 0.10 m and its point at 0.88 m, which reaches as far as the khanda's.
      weapon: {
        socket: 'Socket_Hand_R', socketFrame: true, restWorldRotation: [0, 0, 0], grip: SWORD_GRIP,
        model: '/assets/weapons/hero_sword.glb', blade: [0.1, 0.87],
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

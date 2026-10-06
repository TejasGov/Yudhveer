import * as THREE from 'three';
import { HitReact, type BlowKind, type BlowTier } from './HitReact';
import { ClashFX, type Strike } from './ClashFX';
import { ParticleFX } from './ParticleFX';
import { SoundFX } from './SoundFX';
import { HitboxManager } from './HitboxManager';
import { IMPACTS, type ImpactKind as CameraKind, type ImpactSpec } from '../core/ImpactCamera';
import { CharacterMotor } from '../physics/CharacterMotor';
import type { Character } from '../entities/Character';

/*
 * What landing a blow does beyond the damage (docs/STORY.md, "Hit feel"), each weapon its own:
 *
 * - the staff cracks: a sharp snap of bamboo over the blow, a crisp, short kick of the camera, little shake;
 * - the blade slices: the camera is nudged along the swing, a thin hiss of steel under the blow, blood thrown along the cut;
 * - the mace crushes: a longer hit-stop, more shake, a dip of the camera, dust at the victim's feet, a boom under the blow.
 *
 * And, whoever is struck: HitReact flinches, pushes and flashes them. Where metal meets metal (a blow turned aside by
 * hide, a committed boss's armour, a parried, blocked or deflected swing) or a weapon meets stone (a slam, a leaping
 * strike on the floor), ClashFX throws chingaari along the blade's travel and flashes its light.
 *
 * CombatSystem decides what happened and calls in here once per event; the numbers are in the tables below.
 */

type Tune = Partial<Pick<ImpactSpec, 'freeze' | 'trauma' | 'kick' | 'dip' | 'push' | 'fov' | 'fovMs'>>;

/**
 * The camera's numbers for a blow landing, by weapon and tier, over the table's (ImpactCamera.IMPACTS): the hit-stop in
 * milliseconds (not scaled by the shake slider), the trauma, the directional kick (degrees) and the dip (a slam's weight).
 */
const CAMERA: Record<BlowKind, Record<BlowTier, Tune>> = {
  wood: {
    light: { freeze: 65, trauma: 0.09, kick: 0.42 },
    heavy: { freeze: 90, trauma: 0.26, kick: 0.8, dip: 0.15 },
    slam: { freeze: 115, trauma: 0.42, kick: 0.6, dip: 0.6 },
  },
  blade: {
    light: { freeze: 60, trauma: 0.08, kick: 0.38 },
    heavy: { freeze: 90, trauma: 0.24, kick: 0.75, dip: 0.12 },
    slam: { freeze: 120, trauma: 0.4, kick: 0.55, dip: 0.7 },
  },
  crush: {
    light: { freeze: 85, trauma: 0.18, kick: 0.35, dip: 0.3 },
    heavy: { freeze: 120, trauma: 0.45, kick: 0.6, dip: 0.55 },
    slam: { freeze: 150, trauma: 0.65, kick: 0.5, dip: 1.2 },
  },
};

/** How far a blow's camera nudge and blood follow the blade's own travel rather than straight from attacker to victim. */
const SWING_FOLLOW: Record<BlowKind, number> = { blade: 0.7, wood: 0.25, crush: 0 };
/** Below this the blade is not really travelling across (m/s on the ground): the nudge goes straight from attacker to victim. */
const MIN_SWING = 1.5;
/**
 * A weapon brought down on the floor: still falling at least this fast (m/s) within this height (m) of the stone. A mace's
 * head stops well short of the floor in every one of its downswings (the clips were made for a longer blade), 0.4 to 0.5 m
 * above it at the bottom, so this is where the swing is bottoming out, as the water's splash (Dwarka's WetGround) reads it.
 */
const STRIKE_SPEED = 4.5;
const STRIKE_REACH = 0.55;

const _swing = new THREE.Vector3();
const _swingH = new THREE.Vector3();
const _along = new THREE.Vector3();
const _mix = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _p = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** What a character's blows are made of: the hero's weapon, or the enemy's `impactSound`. */
export function weaponKindOf(c: Character): BlowKind {
  const o = c as unknown as { weapon?: { sound?: { impact?: BlowKind } }; impactSound?: BlowKind };
  return o.weapon?.sound?.impact ?? o.impactSound ?? 'blade';
}

/** The camera's numbers for `kind` as `weapon` throws it (undefined: the table's own, a boss's last blow keeping its). */
export function blowSpec(kind: CameraKind, weapon: BlowKind, tier: BlowTier): ImpactSpec | undefined {
  if (kind === 'bossKill' || kind === 'postureBreak') return undefined;
  const base = IMPACTS[kind];
  if (kind === 'glance') return weapon === 'crush' ? { ...base, freeze: 60, trauma: 0.1, dip: 0.25 } : undefined;
  return { ...base, ...CAMERA[weapon][tier] };
}

/**
 * The velocity (m/s, world) of the blade where `point` lies on it, from where it was last step to where it is now: the
 * way a swing was going when it struck. Read before `HitboxManager.commitBlades` moves "last step" on.
 */
export function bladeVelocityAt(c: Character, point: THREE.Vector3, dt: number, out: THREE.Vector3): THREE.Vector3 {
  const { prev, curr } = HitboxManager.getInstance().blade(c);
  const axis = _a.subVectors(curr.tip, curr.hilt);
  const len2 = axis.lengthSq();
  const u = len2 > 1e-6 ? THREE.MathUtils.clamp(_b.subVectors(point, curr.hilt).dot(axis) / len2, 0, 1) : 1;
  _a.lerpVectors(prev.hilt, prev.tip, u);
  _b.lerpVectors(curr.hilt, curr.tip, u);
  return out.subVectors(_b, _a).divideScalar(Math.max(dt, 1e-4));
}

/**
 * The way a spray of chingaari goes: along the blade's own travel (what a scrape throws), back out from the surface it met
 * toward whoever swung (sparks thrown into a body are hidden by it, and a blade turned aside throws them away from it), and a
 * little up. `toward`: from the clash to the one who swung, on the ground (unit).
 */
function sprayDir(out: THREE.Vector3, swingH: THREE.Vector3, follows: boolean, toward: THREE.Vector3): THREE.Vector3 {
  if (follows) out.copy(swingH).multiplyScalar(0.8).addScaledVector(toward, 0.28);
  else out.copy(toward);
  return out.addScaledVector(_up, 0.22).normalize();
}

export interface LandedBlow {
  attacker: Character;
  victim: Character;
  /** On the blade, where it met the body (world). */
  point: THREE.Vector3;
  /** Seconds of the step the blow landed in. */
  dt: number;
  weapon: BlowKind;
  tier: BlowTier;
  /** Turned aside by hide (`Enemy.armorDamage`). */
  glancing: boolean;
  /** The victim is committed to a swing: a light blow chips it and does not interrupt. */
  armored: boolean;
  boss: boolean;
  /** The blow also sends the victim into its own hit clip (a stagger, a broken posture). */
  reeling: boolean;
  /** Attacker to victim (any length; only its direction on the ground counts). */
  along: THREE.Vector3;
}

export interface BlowFeel {
  /** Which way the camera is nudged and the blood thrown (world, ground plane, unit). */
  dir: THREE.Vector3;
  spill: THREE.Vector3;
}

const _dir = new THREE.Vector3();
const _spill = new THREE.Vector3();
const _spray = new THREE.Vector3();
const _back = new THREE.Vector3();

export class HitFeel {
  /** A blow of the hero's lands (or glances): the victim's flinch, push and flash; sparks; the layers of sound; the dust. */
  public static blowLanded(b: LandedBlow): BlowFeel {
    const tier = b.tier === 'light' ? 0 : b.tier === 'heavy' ? 1 : 2;
    const along = _along.set(b.along.x, 0, b.along.z);
    if (along.lengthSq() < 1e-6) along.set(0, 0, 1);
    along.normalize();
    const swing = bladeVelocityAt(b.attacker, b.point, b.dt, _swing);
    const swingH = _swingH.set(swing.x, 0, swing.z);
    const across = swingH.length();
    const follows = across > MIN_SWING;
    if (follows) swingH.divideScalar(across);

    HitReact.trigger(b.victim, { along, swing, point: b.point, kind: b.weapon, tier: b.tier, reeling: b.reeling });

    const sound = SoundFX.getInstance();
    const feet = b.victim.group.position;
    if (b.glancing || (b.armored && b.boss)) {
      // Hide or armour: the steel (or iron) is turned aside in a spray of chingaari, and a clang.
      const power = b.glancing ? 1 : 0.5;
      if (b.weapon !== 'wood') {
        const iron = b.weapon === 'crush';
        // The contact is inside the body the capsule stands for: the sparks start out on its near side, where they can be seen.
        const toward = _back.copy(along).negate();
        const out = _p.copy(b.point).addScaledVector(toward, 0.18 + 0.25 * (b.victim.motor?.radius ?? 0.4));
        ClashFX.getInstance().sparks(out, sprayDir(_spray, swingH, follows, toward), iron ? 'iron' : 'steel', power * (1 + 0.15 * tier), feet.y);
        sound.playClang(iron ? 'iron' : 'steel', power);
      } else if (b.glancing) {
        ParticleFX.getInstance().spawnDustPuff(feet, 5);
      }
    }
    if (!b.glancing) {
      sound.playBlowWeight(b.weapon, tier as 0 | 1 | 2);
      // A mace's blow kicks the dust up at the victim's feet.
      if (b.weapon === 'crush') ParticleFX.getInstance().spawnDustPuff(feet, 6 + 6 * tier);
    }

    const follow = follows ? SWING_FOLLOW[b.weapon] : 0;
    const dir = _dir.copy(along).multiplyScalar(1 - follow).addScaledVector(swingH, follow);
    if (dir.lengthSq() < 1e-6) dir.copy(along);
    const spill = _spill.copy(along).multiplyScalar(1 - (b.weapon === 'blade' ? SWING_FOLLOW.blade : 0)).addScaledVector(swingH, b.weapon === 'blade' && follows ? SWING_FOLLOW.blade : 0);
    if (spill.lengthSq() < 1e-6) spill.copy(along);
    return { dir: dir.normalize(), spill: spill.normalize() };
  }

  /**
   * An enemy's blow met the hero's dhal (a parry, a block, a deflection): chingaari along the way its blade was going, a
   * round pop where it struck, a flash. `power`: 1 a perfect parry, ~0.5 a block. The sound is the caller's (the parry's
   * clash, the shield's bong).
   */
  public static clash(o: { point: THREE.Vector3; attacker?: Character; from?: THREE.Vector3; weapon: BlowKind; power: number; floor: number; dt: number }): void {
    if (o.weapon === 'wood') {
      // A staff on bronze throws no sparks: a knock, and a little dust shaken off.
      ParticleFX.getInstance().spawnDustPuff(_p.set(o.point.x, o.floor, o.point.z), 3);
      return;
    }
    const tangent = _mix;
    if (o.attacker) bladeVelocityAt(o.attacker, o.point, o.dt, tangent);
    else tangent.set(0, 0, 0);
    // Toward whoever swung (the shield turns the spray back out to them).
    const source = o.attacker ? o.attacker.group.position : o.from;
    const toward = _back.set(0, 0, 0);
    if (source) toward.set(source.x - o.point.x, 0, source.z - o.point.z);
    if (toward.lengthSq() < 1e-6) toward.set(0, 0, 1);
    toward.normalize();
    const flat = _swingH.set(tangent.x, 0, tangent.z);
    const across = flat.length();
    const follows = across > MIN_SWING;
    if (follows) flat.divideScalar(across);
    else flat.crossVectors(toward, _up).multiplyScalar(Math.random() < 0.5 ? 1 : -1);
    ClashFX.getInstance().sparks(_p.copy(o.point).addScaledVector(toward, 0.15), sprayDir(_spray, flat, true, toward), o.weapon === 'crush' ? 'iron' : 'steel', o.power, o.floor);
  }

  /**
   * Each simulation step, for a character swinging: a blade or mace brought down on the floor (the mace's slam, any weapon's
   * leaping strike) throws sparks and dust, shakes the camera a little and thuds. Once per swing, and not if the swing has
   * already landed on someone (`landed`: its force went into them). `impact` is CombatSystem's: the camera, the hit-stop and
   * the rumble.
   */
  public static floorStrike(c: Character, dt: number, landed: boolean, impact: (kind: CameraKind, dir?: THREE.Vector3, scale?: number) => void): void {
    const sm = c.stateMachine;
    const state = sm.currentState;
    let track = this.tracks.get(c);
    if (!track) {
      track = { state: '', time: 0, struck: false };
      this.tracks.set(c, track);
    }
    if (state !== track.state || sm.stateTime < track.time) track.struck = false;
    track.state = state;
    track.time = sm.stateTime;
    if (track.struck || landed || !state.startsWith('ATTACK')) return;
    const weapon = weaponKindOf(c);
    if (weapon !== 'crush' && state !== 'ATTACK_JUMP') return;
    const { prev, curr } = HitboxManager.getInstance().blade(c);
    const fall = (prev.tip.y - curr.tip.y) / Math.max(dt, 1e-4);
    if (fall < STRIKE_SPEED) return;
    const floor = CharacterMotor.groundBelow(_p.set(curr.tip.x, curr.tip.y + 0.7, curr.tip.z), 3);
    if (floor === null || curr.tip.y - floor > STRIKE_REACH) return;
    track.struck = true;

    const wet = ParticleFX.getInstance().onGroundImpact !== null;
    const power = THREE.MathUtils.clamp(fall / 8, 0.6, 1.4) * (weapon === 'crush' ? 1 : 0.75);
    const at = new THREE.Vector3(curr.tip.x, floor + 0.03, curr.tip.z);
    // Forward and up: the way a spray off a floor goes.
    const forward = _swingH.set(curr.tip.x - prev.tip.x, 0, curr.tip.z - prev.tip.z);
    if (forward.lengthSq() < 1e-6) forward.set(Math.sin(c.group.rotation.y), 0, Math.cos(c.group.rotation.y));
    forward.normalize().multiplyScalar(0.5).addScaledVector(_up, 0.85).normalize();
    ClashFX.getInstance().sparks(at, forward, 'stone', power * (wet ? 0.6 : 1), floor);
    ParticleFX.getInstance().spawnDustPuff(at, Math.round((weapon === 'crush' ? 14 : 9) * power));
    SoundFX.getInstance().playStoneStrike(power * (wet ? 0.7 : 1));
    impact('thud', undefined, power);
  }

  private static readonly tracks = new WeakMap<Character, { state: string; time: number; struck: boolean }>();
}

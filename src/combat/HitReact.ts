import * as THREE from 'three';
import { patchShader } from '../levels/environment/ToonRelight';
import type { Character } from '../entities/Character';
import type { CharacterRig } from '../entities/animation/CharacterRig';

/*
 * What a blow does to the one it lands on, whatever that one's animation is doing (docs/STORY.md, "Hit feel"). A boss, or
 * anything committed to a swing, never flinches into its STAGGER clip from a light blow (no stun-locking), which is why
 * landing a blow used to feel like nothing. This is a layer on top of the animation instead, and touches no state:
 *
 * - a flinch: the spine, neck and head are rotated away from the blow after the mixer has posed them (the animation
 *   writes its own pose again next step, so nothing is ever left behind), on damped springs: it jolts to its peak in ~50
 *   ms and is back within ~230 ms, the head a little late and further, as a head is. A few degrees for a lathi, ten and
 *   more for a gada. Several blows add up, from whichever way each came;
 * - a pushback of a few centimetres along the blow, left out while the victim is committed to a swing (or it would slide
 *   while it strikes), and resolved by the character's motor with the rest of its movement, so never through a wall;
 * - a flash: the victim's own cel materials take a warm-white wash, strongest at the silhouette, for ~75 ms.
 *
 * The state is per character (a WeakMap), made on its first blow; every other step costs one lookup.
 */

/** What a blow was made of: steel (a slice), a staff (a crack) or iron (a crush). The hero's `weapon.sound.impact`. */
export type BlowKind = 'blade' | 'wood' | 'crush';
/** How hard: a plain blow, a heavy one (a finisher, a charged blow), a slam (the leaping strike, a mace finisher). */
export type BlowTier = 'light' | 'heavy' | 'slam';

export interface Blow {
  /** The way the force travels, attacker to victim (any length; only its direction on the ground counts). */
  along: THREE.Vector3;
  /** The blade's own velocity where it struck (m/s, world): which way, and how far from its centre, it twists the body. */
  swing?: THREE.Vector3;
  /** Where it struck (world). */
  point?: THREE.Vector3;
  kind: BlowKind;
  tier: BlowTier;
  /** The blow also sends the victim into its own hit clip (a stagger, a broken posture): less is added on top of that. */
  reeling?: boolean;
}

/** Peak lean of the head away from a blow (degrees) by weapon and tier. */
export const FLINCH_DEG: Record<BlowKind, Record<BlowTier, number>> = {
  wood: { light: 5.5, heavy: 8, slam: 10 },
  blade: { light: 5.5, heavy: 8.5, slam: 11 },
  crush: { light: 9.5, heavy: 12.5, slam: 14.5 },
};
/** Pushback along the blow (cm) by weapon; a heavier tier pushes `PUSH_TIER` times as far. */
export const PUSH_CM: Record<BlowKind, number> = { wood: 3, blade: 3.5, crush: 7 };
const PUSH_TIER: Record<BlowTier, number> = { light: 1, heavy: 1.3, slam: 1.6 };
/** The hit flash: how bright it starts (1 is a full wash) and how long it lasts (s), by weapon. */
export const FLASH: Record<BlowKind, { gain: number; life: number }> = {
  wood: { gain: 0.8, life: 0.08 },
  blade: { gain: 0.85, life: 0.075 },
  crush: { gain: 1, life: 0.1 },
};
/** A boss feels a little less of each (a flinch, a push, a flash). */
const BOSS = { flinch: 0.85, push: 0.5, flash: 0.85 };
/** Already reeling (its own hit clip is playing): less is added on top. */
const REELING = 0.6;
const BROKEN = 0.5;

/** The torso's spring: peaks in ~52 ms, back inside 6 % in ~234 ms. `snap`: share of the peak jumped to at once. */
const TORSO = { omega: 18, zeta: 0.8, snap: 0.3, kick: 33.9 };
/** The head's: later (76 ms) and settling later (280 ms). */
const HEAD = { omega: 14, zeta: 0.7, snap: 0.1, kick: 28.8 };
/** The twist about the spine: a stiffer, quicker spring (peaks ~45 ms). */
const TWIST = { omega: 20, zeta: 0.85, snap: 0.25, kick: 34 };
/** Largest lean and twist however many blows add up (radians). */
const MAX_LEAN = THREE.MathUtils.degToRad(22);
const MAX_TWIST = THREE.MathUtils.degToRad(9);
/** Twist at a full off-centre blow, as a share of the lean. */
const TWIST_SHARE = 0.55;
/** Pushback decays at this rate (1/s): 90 % of it is done in ~160 ms. */
const PUSH_RATE = 14;
/** Below this the springs count as at rest (radians, rad/s). */
const REST_X = 4e-4;
const REST_V = 4e-3;

/** How the spine, neck and head share the lean (each bone adds its share on top of those below it). */
const SHARE = { spine: 0.78, neck: 0.14, headOnTorso: 0.05, headOnHead: 0.3 };
const SPINE_TWIST = 1;

const _up = new THREE.Vector3(0, 1, 0);
const _axis = new THREE.Vector3();
const _axisB = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const _qc = new THREE.Quaternion();
const _p = new THREE.Quaternion();
const _a = new THREE.Vector3();

/** A damped spring with exact stepping (any dt). */
interface Spring {
  x: number;
  v: number;
}

function advance(s: Spring, p: { omega: number; zeta: number }, dt: number): void {
  const { omega: w, zeta: z } = p;
  const wd = w * Math.sqrt(1 - z * z);
  const e = Math.exp(-z * w * dt);
  const c = Math.cos(wd * dt);
  const sn = Math.sin(wd * dt);
  const a = s.x;
  const b = (s.v + z * w * s.x) / wd;
  s.x = e * (a * c + b * sn);
  s.v = e * ((-z * w * a + wd * b) * c + (-z * w * b - wd * a) * sn);
}

/** A bone the flinch turns, and what it last wrote (so a bone nobody rewrote is put back, not turned twice). */
interface Slot {
  bone: THREE.Object3D;
  part: 'spine' | 'neck' | 'head';
  /** Its share of the lean (and of the twist for the spine's bones). */
  lean: number;
  twist: number;
  base: THREE.Quaternion;
  applied: THREE.Quaternion;
  has: boolean;
}

/** The uniforms a flash-ready material carries (`installHitFlash`). */
interface FlashUniforms {
  uHitFlash: { value: number };
  uHitFlashColor: { value: THREE.Color };
}

interface State {
  character: Character;
  rig: CharacterRig;
  slots: Slot[];
  mats: FlashUniforms[];
  /** The lean as a vector on the ground: its direction is where the head goes, its length how far (radians). */
  lean: { x: Spring; z: Spring };
  head: { x: Spring; z: Spring };
  twist: Spring;
  push: THREE.Vector3;
  active: boolean;
  /** The flash in progress: how bright it started, how long it lasts, how old it is (s). */
  flashGain: number;
  flashLife: number;
  flashAge: number;
}

export class HitReact {
  private static readonly states = new WeakMap<Character, State>();
  /** Everyone whose flash is still fading (stepped each rendered frame, not each simulation step: see `update`). */
  private static readonly flashing = new Set<State>();
  private static lastWall = 0;

  /** A blow lands on `victim`: it flinches, is pushed, flashes. Nothing for a character without a rig. */
  public static trigger(victim: Character, blow: Blow): void {
    const rig = victim.rig;
    if (!rig) return;
    const s = this.stateOf(victim, rig);
    const sm = victim.stateMachine.currentState;
    const boss = (victim as unknown as { isBoss?: boolean }).isBoss === true;

    // The flash comes to everyone, a killing blow included; the rest is for the living.
    const flash = FLASH[blow.kind];
    s.flashGain = Math.max(this.flashNow(s), flash.gain * (boss ? BOSS.flash : 1) * (blow.tier === 'light' ? 0.8 : 1));
    s.flashLife = flash.life * (blow.tier === 'slam' ? 1.25 : 1);
    s.flashAge = 0;
    this.lastWall = performance.now();
    this.flashing.add(s);
    this.setFlash(s, s.flashGain);
    if (sm === 'DEAD') return;

    // The blow's direction on the ground.
    _a.set(blow.along.x, 0, blow.along.z);
    if (_a.lengthSq() < 1e-6) return;
    _a.normalize();
    const k = (boss ? BOSS.flinch : 1) * (blow.reeling || sm === 'STAGGER' || sm === 'DEFLECTED' ? REELING : sm === 'POSTURE_BROKEN' ? BROKEN : 1);
    const amp = THREE.MathUtils.degToRad(FLINCH_DEG[blow.kind][blow.tier]) * k;
    s.lean.x.x += TORSO.snap * amp * _a.x;
    s.lean.x.v += TORSO.kick * amp * _a.x;
    s.lean.z.x += TORSO.snap * amp * _a.z;
    s.lean.z.v += TORSO.kick * amp * _a.z;
    s.head.x.x += HEAD.snap * amp * _a.x;
    s.head.x.v += HEAD.kick * amp * _a.x;
    s.head.z.x += HEAD.snap * amp * _a.z;
    s.head.z.v += HEAD.kick * amp * _a.z;
    this.clampLean(s);

    // The twist: a blow across the body's middle turns it, by which side of the victim's axis it struck and which
    // way the blade was going (a torque about the vertical).
    if (blow.swing && blow.point) {
      const p = victim.group.position;
      const rx = blow.point.x - p.x;
      const rz = blow.point.z - p.z;
      const r = Math.hypot(rx, rz);
      const f = Math.hypot(blow.swing.x, blow.swing.z);
      if (r > 0.05 && f > 0.5) {
        const lateral = (rz * blow.swing.x - rx * blow.swing.z) / (r * f);
        const t = THREE.MathUtils.clamp(lateral, -1, 1) * amp * TWIST_SHARE;
        s.twist.x += TWIST.snap * t;
        s.twist.v += TWIST.kick * t;
        s.twist.x = THREE.MathUtils.clamp(s.twist.x, -MAX_TWIST, MAX_TWIST);
      }
    }

    // The push: along the blow, not at all while it is committed to a swing.
    if (!this.committed(victim)) {
      const cm = PUSH_CM[blow.kind] * PUSH_TIER[blow.tier] * (boss ? BOSS.push : 1) * (sm === 'STAGGER' ? 0.7 : 1);
      s.push.addScaledVector(_a, (cm / 100) * PUSH_RATE);
    }

    s.active = true;
    // The first frame of it at once, in the pose this step leaves (the freeze that follows holds it).
    this.applyBones(s);
  }

  /**
   * Once per simulation step after the character's rig has been posed (Character.update): advances the springs and lays
   * the flinch over the pose, and moves the character by the push (before its motor resolves the step).
   */
  public static step(c: Character, dt: number): void {
    const s = this.states.get(c);
    if (!s || !s.active) return;
    if (c.rig !== s.rig || c.stateMachine.currentState === 'DEAD') {
      this.rest(s);
      return;
    }
    advance(s.lean.x, TORSO, dt);
    advance(s.lean.z, TORSO, dt);
    advance(s.head.x, HEAD, dt);
    advance(s.head.z, HEAD, dt);
    advance(s.twist, TWIST, dt);
    s.push.multiplyScalar(Math.exp(-PUSH_RATE * dt));
    if (s.push.lengthSq() > 1e-8) {
      if (this.committed(c)) s.push.set(0, 0, 0);
      else c.group.position.addScaledVector(s.push, dt);
    }
    if (this.atRest(s)) {
      this.rest(s);
      return;
    }
    this.applyBones(s);
  }

  /**
   * Once per rendered frame (ParticleFX.update's `dt`: simulated seconds, 0 in a hit-stop): fades the flashes. A flash
   * is made to last about 75 ms of real time, so it plays out inside the freeze it comes with rather than being held
   * (a held white-out reads as a glitch); in stepped tests, where no real time passes, it runs on simulated time.
   */
  public static update(dt: number): void {
    const now = performance.now();
    const wall = Math.min(0.05, Math.max(0, (now - this.lastWall) / 1000));
    this.lastWall = now;
    if (this.flashing.size === 0) return;
    const step = Math.max(dt, wall);
    for (const s of this.flashing) {
      s.flashAge += step;
      const k = 1 - s.flashAge / s.flashLife;
      if (k <= 0) {
        this.setFlash(s, 0);
        this.flashing.delete(s);
      } else {
        this.setFlash(s, s.flashGain * k * k);
      }
    }
  }

  /** Dev and tests: every flinch and flash put away at once. */
  public static clear(c?: Character): void {
    if (c) {
      const s = this.states.get(c);
      if (s) {
        this.rest(s);
        this.flashing.delete(s);
        this.setFlash(s, 0);
      }
      return;
    }
    for (const s of [...this.flashing]) {
      this.flashing.delete(s);
      this.setFlash(s, 0);
    }
  }

  /** The flinch now, in degrees, and the bones it turns (for tests). */
  public static read(c: Character): { lean: number; head: number; twist: number; push: number; flash: number; bones: string[] } | null {
    const s = this.states.get(c);
    if (!s) return null;
    const d = 180 / Math.PI;
    return {
      bones: s.slots.map((slot) => slot.bone.name),
      lean: Math.hypot(s.lean.x.x, s.lean.z.x) * d,
      head: Math.hypot(s.head.x.x, s.head.z.x) * d,
      twist: s.twist.x * d,
      push: s.push.length(),
      flash: s.mats[0]?.uHitFlash.value ?? 0,
    };
  }

  // ------------------------------------------------------------------------------------------------ Internals

  /** Committed to a swing, a cast or a wind-up: pushing it would slide it through the move. */
  private static committed(c: Character): boolean {
    const state = c.stateMachine.currentState;
    return state.startsWith('ATTACK') || state === 'CAST' || (c as unknown as { isArmored?: () => boolean }).isArmored?.() === true;
  }

  private static stateOf(c: Character, rig: CharacterRig): State {
    let s = this.states.get(c);
    if (s && s.rig === rig) return s;
    if (s) {
      this.flashing.delete(s);
      this.setFlash(s, 0);
    }
    s = {
      character: c,
      rig,
      slots: this.findSlots(rig),
      mats: this.findMaterials(rig),
      lean: { x: { x: 0, v: 0 }, z: { x: 0, v: 0 } },
      head: { x: { x: 0, v: 0 }, z: { x: 0, v: 0 } },
      twist: { x: 0, v: 0 },
      push: new THREE.Vector3(),
      active: false,
      flashGain: 0,
      flashLife: 0.08,
      flashAge: 1,
    };
    this.states.set(c, s);
    return s;
  }

  private static clampLean(s: State): void {
    for (const pair of [s.lean, s.head]) {
      const m = Math.hypot(pair.x.x, pair.z.x);
      if (m > MAX_LEAN) {
        const k = MAX_LEAN / m;
        pair.x.x *= k;
        pair.z.x *= k;
      }
    }
  }

  private static atRest(s: State): boolean {
    const springs = [s.lean.x, s.lean.z, s.head.x, s.head.z, s.twist];
    return springs.every((q) => Math.abs(q.x) < REST_X && Math.abs(q.v) < REST_V) && s.push.lengthSq() < 1e-6;
  }

  /** Everything at rest, and the bones it turned put back (a bone the animation rewrote is already right). */
  private static rest(s: State): void {
    for (const q of [s.lean.x, s.lean.z, s.head.x, s.head.z, s.twist]) q.x = q.v = 0;
    s.push.set(0, 0, 0);
    s.active = false;
    for (const slot of s.slots) {
      if (slot.has && angle(slot.bone.quaternion, slot.applied) < 1e-5) slot.bone.quaternion.copy(slot.base);
      slot.has = false;
    }
  }

  /**
   * Turns each slot's bone by its share. A rotation `R` about a world axis is applied to a bone as `P^-1 R P` before its
   * local rotation, `P` being its parent's world rotation, so the bone turns in the world and not in its own odd axes.
   */
  private static applyBones(s: State): void {
    const lx = s.lean.x.x;
    const lz = s.lean.z.x;
    const hx = s.head.x.x;
    const hz = s.head.z.x;
    const lm = Math.hypot(lx, lz);
    const hm = Math.hypot(hx, hz);
    const tw = s.twist.x;
    for (const slot of s.slots) {
      const bone = slot.bone;
      // What the animation posed: the bone as it is now, unless it still holds what this wrote last time.
      if (slot.has && angle(bone.quaternion, slot.applied) < 1e-5) bone.quaternion.copy(slot.base);
      else slot.base.copy(bone.quaternion);
      const onHead = slot.part === 'head';
      const lean = slot.lean * lm;
      const head = onHead ? SHARE.headOnHead * hm : 0;
      const twist = slot.twist * tw;
      if (Math.abs(lean) < 1e-6 && Math.abs(head) < 1e-6 && Math.abs(twist) < 1e-6) {
        slot.has = false;
        continue;
      }
      _q.identity();
      if (Math.abs(lean) >= 1e-6 && lm > 1e-9) {
        // About up x lean-direction: positive turns the top of the body toward the lean.
        _axis.set(lz / lm, 0, -lx / lm);
        _q.multiply(_qa.setFromAxisAngle(_axis, lean));
      }
      if (Math.abs(head) >= 1e-6 && hm > 1e-9) {
        _axisB.set(hz / hm, 0, -hx / hm);
        _q.multiply(_qb.setFromAxisAngle(_axisB, head));
      }
      if (Math.abs(twist) >= 1e-6) _q.multiply(_qc.setFromAxisAngle(_up, twist));
      bone.parent!.getWorldQuaternion(_p);
      _qa.copy(_p).invert().multiply(_q).multiply(_p);
      bone.quaternion.premultiply(_qa);
      slot.applied.copy(bone.quaternion);
      slot.has = true;
    }
  }

  /** The spine's bones from the hips up, the neck and the head, by ancestry (every rig names them differently). */
  private static findSlots(rig: CharacterRig): Slot[] {
    // (Assigned in the callback below: the casts keep TypeScript from narrowing them to null.)
    let root = null as THREE.Object3D | null;
    let head = null as THREE.Object3D | null;
    rig.root.traverse((o) => {
      if (!(o as THREE.Bone).isBone) return;
      if (!root && !((o.parent as THREE.Bone | null)?.isBone)) root = o;
      const name = o.name.toLowerCase().replace(/^mixamorig:?/, '');
      if (!head && name === 'head') head = o;
    });
    if (!root || !head) return [];
    // From the head down to (not including) the hips.
    const chain: THREE.Object3D[] = [];
    for (let o: THREE.Object3D | null = head; o && o !== root; o = o.parent) chain.push(o);
    chain.reverse(); // low to high: the spine's bones, the neck, the head
    if (chain.length < 2) return [];
    const neck = chain.length >= 3 && /neck/i.test(chain[chain.length - 2].name) ? chain[chain.length - 2] : null;
    const spine = chain.slice(0, chain.length - 1 - (neck ? 1 : 0));
    const slot = (bone: THREE.Object3D, part: Slot['part'], lean: number, twist: number): Slot => ({
      bone, part, lean, twist, base: new THREE.Quaternion(), applied: new THREE.Quaternion(), has: false,
    });
    const slots: Slot[] = spine.map((b) => slot(b, 'spine', SHARE.spine / Math.max(1, spine.length), SPINE_TWIST / Math.max(1, spine.length)));
    if (neck) slots.push(slot(neck, 'neck', SHARE.neck, 0));
    slots.push(slot(head, 'head', neck ? SHARE.headOnTorso : SHARE.headOnTorso + SHARE.neck, 0));
    return slots;
  }

  /** The flash uniforms of every material in the rig that has them (its body; props bring their own look). */
  private static findMaterials(rig: CharacterRig): FlashUniforms[] {
    const seen = new Set<THREE.Material>();
    const out: FlashUniforms[] = [];
    rig.root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!m) return;
      for (const mat of Array.isArray(m) ? m : [m]) {
        if (seen.has(mat)) continue;
        seen.add(mat);
        const u = mat.userData.hitFlash as FlashUniforms | undefined;
        if (u) out.push(u);
      }
    });
    return out;
  }

  private static flashNow(s: State): number {
    return s.flashAge < s.flashLife ? s.flashGain * (1 - s.flashAge / s.flashLife) ** 2 : 0;
  }

  private static setFlash(s: State, value: number): void {
    for (const u of s.mats) u.uHitFlash.value = value;
  }
}

/** The angle between two rotations (radians). */
function angle(a: THREE.Quaternion, b: THREE.Quaternion): number {
  return 2 * Math.acos(Math.min(1, Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w)));
}

const FLASH_COLOR = new THREE.Color(1, 0.84, 0.58);

/**
 * Gives a toon material a hit flash: a warm-white wash added to its lit colour, stronger toward the silhouette, driven by
 * `uHitFlash` (0 is off: the material is then exactly as it was). Call it when the material is made (every character's
 * cel materials, CharacterRig), so the shader is compiled once with the rest instead of the first time somebody is hit.
 */
export function installHitFlash(mat: THREE.MeshToonMaterial): void {
  if (mat.userData.hitFlash) return;
  const uniforms: FlashUniforms = { uHitFlash: { value: 0 }, uHitFlashColor: { value: FLASH_COLOR.clone() } };
  mat.userData.hitFlash = uniforms;
  patchShader(mat, 'hitflash', (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uHitFlash;\nuniform vec3 uHitFlashColor;')
      .replace('#include <opaque_fragment>', `if (uHitFlash > 0.0) {
  float hitEdge = 1.0 - saturate(abs(dot(normalize(vNormal), normalize(vViewPosition))));
  outgoingLight += uHitFlashColor * uHitFlash * (0.16 + 1.0 * smoothstep(0.3, 0.9, hitEdge));
}
#include <opaque_fragment>`);
  });
}

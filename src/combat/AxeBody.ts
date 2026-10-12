import * as THREE from 'three';
import { CHEST_IDLE, REST_HOLD } from './ChainAxeMotion';

/*
 * The island demoness's body carrying her axe: procedural layers laid over the clip each simulation step, after the
 * mixer has posed the skeleton and before it is skinned (so Engine's pose capture interpolates them like any other
 * pose, and the next step's mixer writes the clip afresh: nothing accumulates).
 *
 * - the torso twists about the spine and leans, shared out over the pelvis, spine and chest, the hips a few frames
 *   ahead of the chest (the kinetic chain: the hips lead, the chest follows, the arm and the wrist come last);
 * - the neck and head turn back against the twist and the lean, so her eyes stay on her quarry while the body coils;
 * - the human torso lunges and rises on the spider body (the pelvis bone moves, the eight feet stay planted);
 * - the front pair of legs lifts and braces (the slam);
 * - the right arm holds the axe: the clavicle shrugs toward a high or far reach, a soft two-bone IK puts the hand
 *   where the grip is wanted (the elbow never locks straight or folds shut, and bends the same way every time), and
 *   the hand turns so the haft lies in the fist the way the axe is wanted, its bend from the forearm held under
 *   WRIST_MAX and its roll shared with the forearm. At rest it holds the axe at her rest hold (carried with her chest);
 *   in an attack the keys take over;
 * - the left arm swings against the right on its own keys (reaching out on the draw, pulled in on the throw).
 *
 * The mixer only writes a bone when its keyed value changes (three's PropertyMixer), and some of these bones hold still
 * through a clip: `restore` puts back what each was before the layers (unless the mixer has since written it), at the
 * start of every step, before the mixer and HitReact run. Otherwise the layers would pile up step on step.
 *
 * Rotations are about boss-local axes (x her left, y up, z ahead) turned into each bone's parent frame (P^-1 R P), so
 * the odd rest axes of the exported bones never matter. Nothing is allocated per step.
 */

/** Degrees and metres; + twist turns her chest to her left, + lean bends her forward, + legs lifts the front pair.
 * `hipTwist` and `hipLean` are the same curves a moment ahead (her hips lead). */
export interface BodyLayer {
  twist: number;
  lean: number;
  hipTwist: number;
  hipLean: number;
  lunge: number;
  rise: number;
  legs: number;
}

/** What the arms reach for this step: the right hand's grip (boss-local) and wrist, how far that is the keys'
 * rather than her rest hold, and how far the arm is the IK's at all rather than the clip's; the left wrist likewise. */
export interface ArmPose {
  grip: THREE.Vector3;
  /** Degrees from the relaxed hand: deviation (+ ulnar), flexion (+ toward the palm), roll (the forearm's pronation). */
  wrist: THREE.Vector3;
  weight: number;
  hold: number;
  off: THREE.Vector3;
  offWeight: number;
}

const DEG = Math.PI / 180;
const TWIST = { pelvis: 0.2, spine: 0.35, chest: 0.45 };
const LEAN = { pelvis: 0.3, spine: 0.35, chest: 0.35 };
/** How much of the torso's twist and lean the neck and head take back (eyes on the quarry), and their limit. */
const GAZE_TWIST = { neck: 0.3, head: 0.4 };
const GAZE_LEAN = { neck: 0.2, head: 0.3 };
const GAZE_MAX = 40 * DEG;
/** The wrist (degrees from the relaxed hand): radial and ulnar deviation, extension and flexion, their combined bend,
 * and the forearm's roll (pronation and supination), shared half and half between the forearm and the wrist. */
export const WRIST = { radial: 20, ulnar: 35, extension: 65, flexion: 70, bend: 68, roll: 80 } as const;
/** The elbow: never straighter than this share of the arm's length (a locked arm reads as a stick), never folded tighter. */
const SOFT = 0.9;
const STRAIGHT = 0.985;
const FOLD = 0.33;
/** The clavicle: its share of a reach above the shoulder or beyond the arm, and its limit. */
const CLAV_LIFT = 0.28;
const CLAV_REACH = 0.3;
const CLAV_MAX = 24 * DEG;
/** The spring a broken-off swing's bones ride on (1/s): critically damped, about 30 ms behind. */
const SMOOTH_RATE = 35;
/** Which way each elbow bends (chest frame: out to her side, down, back). */
const POLE_R = new THREE.Vector3(-0.7, -0.6, -0.25).normalize();
const POLE_L = new THREE.Vector3(0.7, -0.6, -0.25).normalize();
const CHEST_IDLE_INV = new THREE.Matrix4().compose(
  new THREE.Vector3(...CHEST_IDLE.p), new THREE.Quaternion(...CHEST_IDLE.q), new THREE.Vector3(1, 1, 1)).invert();
const CHEST_IDLE_QINV = new THREE.Quaternion(...CHEST_IDLE.q).invert();
const REST_GRIP = new THREE.Vector3(...REST_HOLD.p);
const REST_WRIST = new THREE.Vector3(...REST_HOLD.wrist);
/** Passes of the arm's IK: each moves the wrist target by where the grip landed short (the socket sits off the wrist). */
const PASSES = 3;

/** A bone the layers move, what it was before them and what they left (HitReact's way). */
interface Slot {
  bone: THREE.Object3D;
  baseQ: THREE.Quaternion;
  baseP: THREE.Vector3;
  doneQ: THREE.Quaternion;
  doneP: THREE.Vector3;
  has: boolean;
  /** Its turning (rotation vector per second, in its parent's frame) over the last step, and whether that is known. */
  vel: THREE.Vector3;
  moving: boolean;
}

interface Bones {
  pelvis: THREE.Object3D;
  spine: THREE.Object3D;
  chest: THREE.Object3D;
  neck: THREE.Object3D | null;
  head: THREE.Object3D | null;
  clav: THREE.Object3D | null;
  upper: THREE.Object3D;
  fore: THREE.Object3D;
  hand: THREE.Object3D;
  socket: THREE.Object3D | null;
  upperL: THREE.Object3D | null;
  foreL: THREE.Object3D | null;
  handL: THREE.Object3D | null;
  legs: THREE.Object3D[];
}

const _gq = new THREE.Quaternion();
const _pp = new THREE.Vector3();
const _pq = new THREE.Quaternion();
const _ps = new THREE.Vector3();
const _r = new THREE.Quaternion();
const _d = new THREE.Quaternion();
const _up = new THREE.Vector3();
const _side = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _move = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _t = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _u = new THREE.Vector3();
const _w = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _qt = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _base = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
const _g = new THREE.Vector3();
const _wr = new THREE.Vector3();
const _wq = new THREE.Quaternion();
const _wq2 = new THREE.Quaternion();
const _wv = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);
// reachTwoBone's own (its inputs may be any of the above).
const _ra = new THREE.Vector3();
const _rb = new THREE.Vector3();
const _rc = new THREE.Vector3();
const _rdir = new THREE.Vector3();
const _rpole = new THREE.Vector3();
const _rt = new THREE.Vector3();
const _ru = new THREE.Vector3();
const _rw = new THREE.Vector3();
const _rq1 = new THREE.Quaternion();
const _rq2 = new THREE.Quaternion();

/** Turns `bone` by `angle` about a world `axis`. */
function turn(bone: THREE.Object3D, axis: THREE.Vector3, angle: number): void {
  if (Math.abs(angle) < 1e-6 || !bone.parent) return;
  _r.setFromAxisAngle(axis, angle);
  rotateWorld(bone, _r);
}

/** Turns `bone` by the world rotation `r` (about its own origin). */
function rotateWorld(bone: THREE.Object3D, r: THREE.Quaternion): void {
  bone.parent!.matrixWorld.decompose(_pp, _pq, _ps);
  _d.copy(_pq).invert().multiply(r).multiply(_pq);
  bone.quaternion.premultiply(_d);
}

function worldPos(o: THREE.Object3D, out: THREE.Vector3): THREE.Vector3 {
  const e = o.matrixWorld.elements;
  return out.set(e[12], e[13], e[14]);
}

function worldQuat(o: THREE.Object3D, out: THREE.Quaternion): THREE.Quaternion {
  o.matrixWorld.decompose(_pp, out, _ps);
  return out;
}

/**
 * Two-bone IK: `upper` and `fore` turned so that `hand`'s origin lands on `target` (world), the elbow toward `pole`
 * (world). Bend the elbow to the angle the distance needs (about its own hinge), swing the arm onto the target, then
 * turn it about the reach until the elbow faces the pole: every step well defined, so the elbow never flips (an
 * arc-to-arc rotation near half a turn would). Too far, it eases short of the straight arm; too near, it stops before the
 * forearm folds onto the upper arm. Returns false if the bones are degenerate.
 */
export function reachTwoBone(upper: THREE.Object3D, fore: THREE.Object3D, hand: THREE.Object3D, target: THREE.Vector3, pole: THREE.Vector3): boolean {
  worldPos(upper, _ra);
  worldPos(fore, _rb);
  worldPos(hand, _rc);
  const l1 = _ra.distanceTo(_rb), l2 = _rb.distanceTo(_rc);
  if (l1 < 1e-4 || l2 < 1e-4 || !upper.parent) return false;
  _rt.subVectors(target, _ra);
  const reach = _rt.length();
  if (reach < 1e-4) return false;
  _rt.divideScalar(reach);
  const d = softReach(reach, l1, l2);
  // 1. The elbow: about its hinge (the clip's own bend; across the pole if the clip holds the arm straight).
  _ru.subVectors(_rb, _ra);
  _rw.subVectors(_rc, _rb);
  _rdir.crossVectors(_ru, _rw);
  if (_rdir.lengthSq() < 1e-10) _rdir.crossVectors(_ru, pole);
  if (_rdir.lengthSq() < 1e-10) return false;
  _rdir.normalize();
  const now = Math.PI - _ru.angleTo(_rw);
  const want = Math.acos(THREE.MathUtils.clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
  _rq1.setFromAxisAngle(_rdir, now - want);
  rotateWorld(fore, _rq1);
  fore.updateWorldMatrix(false, true);
  // 2. The arm onto the target.
  worldPos(hand, _rc);
  _ru.subVectors(_rc, _ra).normalize();
  _rq1.setFromUnitVectors(_ru, _rt);
  rotateWorld(upper, _rq1);
  upper.updateWorldMatrix(false, true);
  // 3. About the reach, the elbow onto the pole's side.
  worldPos(fore, _rb).sub(_ra);
  _ru.copy(_rb).addScaledVector(_rt, -_rb.dot(_rt));
  _rw.copy(pole).addScaledVector(_rt, -pole.dot(_rt));
  if (_ru.lengthSq() > 1e-8 && _rw.lengthSq() > 1e-4) {
    const angle = Math.atan2(_rpole.crossVectors(_ru, _rw).dot(_rt), _ru.dot(_rw));
    rotateWorld(upper, _rq2.setFromAxisAngle(_rt, angle));
    upper.updateWorldMatrix(false, true);
  }
  return true;
}

/**
 * The hand's local rotation for `wrist` (degrees: deviation, flexion, roll; held to the joint's range) over the relaxed
 * hand `relaxed`, into `out`: half the roll (the other half is the forearm's, about its own length), then the bend.
 * Returns the roll (radians). The rig's hand: x the palm's normal, y down the fingers, z toward the little finger.
 */
export function wristRotation(wrist: THREE.Vector3, relaxed: THREE.Quaternion, out: THREE.Quaternion): number {
  let dev = THREE.MathUtils.clamp(wrist.x, -WRIST.radial, WRIST.ulnar);
  let flex = THREE.MathUtils.clamp(wrist.y, -WRIST.extension, WRIST.flexion);
  const bend = Math.hypot(dev, flex);
  if (bend > WRIST.bend) { dev *= WRIST.bend / bend; flex *= WRIST.bend / bend; }
  const roll = THREE.MathUtils.clamp(wrist.z, -WRIST.roll, WRIST.roll) * DEG;
  // Ulnar deviation turns the fingers toward the little finger (+z) about the palm's normal; flexion toward the palm (+x).
  // The relaxed hand is already bent off the forearm's line: the bend from that line is held under WRIST.bend too.
  if (bendOf(relaxed, dev, flex, 1, out) > WRIST.bend * DEG) {
    // Scaled back to the limit (bisected, so the result moves smoothly with the keys).
    let lo = 0, hi = 1;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (bendOf(relaxed, dev, flex, mid, out) > WRIST.bend * DEG) hi = mid;
      else lo = mid;
    }
    bendOf(relaxed, dev, flex, lo, out);
  }
  out.premultiply(_wq.setFromAxisAngle(Y, roll / 2));
  return roll;
}

/** The hand's local rotation for `k` of the bend (`dev`, `flex` degrees) over `relaxed`, into `out`; returns its angle off
 * the forearm's line (radians). */
function bendOf(relaxed: THREE.Quaternion, dev: number, flex: number, k: number, out: THREE.Quaternion): number {
  _wq.setFromAxisAngle(X, dev * k * DEG).multiply(_wq2.setFromAxisAngle(Z, -flex * k * DEG));
  out.copy(relaxed).multiply(_wq);
  return _wv.copy(Y).applyQuaternion(out).angleTo(Y);
}

/** The rotation vector (axis times angle, the short way) of `q` into `out`. */
function rotationVector(q: THREE.Quaternion, out: THREE.Vector3): THREE.Vector3 {
  const sign = q.w < 0 ? -1 : 1, s = Math.hypot(q.x, q.y, q.z);
  if (s < 1e-9) return out.set(0, 0, 0);
  const k = (2 * Math.atan2(s, Math.abs(q.w))) / s * sign;
  return out.set(q.x * k, q.y * k, q.z * k);
}

/** The shoulder-to-wrist distance the IK aims for: eased in short of the straight arm, never folded tighter than FOLD. */
export function softReach(d: number, l1: number, l2: number): number {
  const L = l1 + l2, soft = SOFT * L, max = STRAIGHT * L;
  if (d > soft) d = soft + (max - soft) * (1 - Math.exp(-(d - soft) / (max - soft)));
  return Math.max(d, Math.max(FOLD * L, Math.abs(l1 - l2) + 1e-3));
}

export class AxeBody {
  /** Where the right wrist was last sent (world): the grip less the socket's offset (probes read it). */
  public readonly wristTarget = new THREE.Vector3();
  private bones: Bones | null = null;
  private root: THREE.Object3D | null = null;
  private slots: Slot[] = [];

  /** Finds the rig's bones (once per rig); false if it is not the island rig. */
  public bind(root: THREE.Object3D): boolean {
    if (root === this.root) return this.bones !== null;
    this.root = root;
    const get = (name: string) => root.getObjectByName(name) ?? null;
    const pelvis = get('Pelvis'), spine = get('Spine'), chest = get('Chest');
    const upper = get('UpperArm_R'), fore = get('Forearm_R'), hand = get('Hand_R');
    const legs = [get('Leg_L0_0'), get('Leg_R0_0')].filter((b): b is THREE.Object3D => b !== null);
    this.bones = pelvis && spine && chest && upper && fore && hand ? {
      pelvis, spine, chest, upper, fore, hand, legs, neck: get('Neck'), head: get('Head'), clav: get('Shoulder_R'),
      socket: get('Socket_Hand_R'), upperL: get('UpperArm_L'), foreL: get('Forearm_L'), handL: get('Hand_L'),
    } : null;
    const b = this.bones;
    this.slots = b ? [b.pelvis, b.spine, b.chest, b.neck, b.head, b.clav, b.upper, b.fore, b.hand, b.upperL, b.foreL, ...b.legs]
      .filter((bone): bone is THREE.Object3D => bone !== null).map((bone) => ({
        bone, baseQ: new THREE.Quaternion(), baseP: new THREE.Vector3(), doneQ: new THREE.Quaternion(), doneP: new THREE.Vector3(), has: false,
        vel: new THREE.Vector3(), moving: false,
      })) : [];
    return b !== null;
  }

  /** Before the step's mixer: each bone the layers moved, as the clip left it (if nothing has written it since). */
  public restore(): void {
    for (const s of this.slots) {
      if (!s.has) continue;
      // Near enough, not equal: Engine keeps the step's pose in single precision between frames.
      if (Math.abs(s.bone.quaternion.dot(s.doneQ)) > 1 - 1e-6) s.bone.quaternion.copy(s.baseQ);
      if (s.bone.position.distanceToSquared(s.doneP) < 1e-10) s.bone.position.copy(s.baseP);
      s.has = false;
    }
  }

  /**
   * Lays the layers over the pose the mixer left: `layer` (zero is the clip as it is) and the arms' `pose`. `group` is
   * the boss's root. `smooth` (0..1): how far each bone the layers move follows its new pose on a critically damped
   * spring from the way it was turning, rather than straight (a swing broken off: the clip's cross-fade into the flinch
   * starts and stops its blend linearly, and those kinks would show in the arm; the spring rides over them).
   */
  public apply(group: THREE.Object3D, layer: BodyLayer, pose: ArmPose, dt = 1 / 60, smooth = 0): void {
    const b = this.bones;
    if (!b) return;
    for (const s of this.slots) {
      s.baseQ.copy(s.bone.quaternion);
      s.baseP.copy(s.bone.position);
    }
    group.updateWorldMatrix(true, true);
    group.matrixWorld.decompose(_pp, _gq, _ps);
    _up.set(0, 1, 0).applyQuaternion(_gq);
    _side.set(1, 0, 0).applyQuaternion(_gq);
    _fwd.set(0, 0, 1).applyQuaternion(_gq);
    const scale = _ps.x;
    const twist = layer.twist * DEG, lean = layer.lean * DEG;
    const hipTwist = layer.hipTwist * DEG, hipLean = layer.hipLean * DEG;
    // The torso: twist about the spine, lean about her side, both shared down the back, the hips leading.
    turn(b.pelvis, _up, hipTwist * TWIST.pelvis);
    turn(b.pelvis, _side, hipLean * LEAN.pelvis);
    if ((layer.lunge !== 0 || layer.rise !== 0) && b.pelvis.parent) {
      // The human torso shifts on the spider: a world move in the pelvis's parent frame.
      _move.copy(_fwd).multiplyScalar(layer.lunge).addScaledVector(_up, layer.rise).multiplyScalar(scale);
      b.pelvis.parent.matrixWorld.decompose(_a, _pq, _b);
      _move.applyQuaternion(_pq.invert()).divide(_b);
      b.pelvis.position.add(_move);
    }
    b.pelvis.updateWorldMatrix(false, true);
    turn(b.spine, _up, (hipTwist + twist) * 0.5 * TWIST.spine);
    turn(b.spine, _side, (hipLean + lean) * 0.5 * LEAN.spine);
    b.spine.updateWorldMatrix(false, true);
    turn(b.chest, _up, twist * TWIST.chest);
    turn(b.chest, _side, lean * LEAN.chest);
    b.chest.updateWorldMatrix(false, true);
    // Her eyes stay on him: the neck and head take back most of what the torso turned.
    const torsoTwist = hipTwist * TWIST.pelvis + (hipTwist + twist) * 0.5 * TWIST.spine + twist * TWIST.chest;
    const torsoLean = hipLean * LEAN.pelvis + (hipLean + lean) * 0.5 * LEAN.spine + lean * LEAN.chest;
    const gt = THREE.MathUtils.clamp(-torsoTwist, -GAZE_MAX, GAZE_MAX), gl = THREE.MathUtils.clamp(-torsoLean, -GAZE_MAX, GAZE_MAX);
    for (const [bone, kt, kl] of [[b.neck, GAZE_TWIST.neck, GAZE_LEAN.neck], [b.head, GAZE_TWIST.head, GAZE_LEAN.head]] as const) {
      if (!bone) continue;
      turn(bone, _up, gt * kt / (GAZE_TWIST.neck + GAZE_TWIST.head));
      turn(bone, _side, gl * kl / (GAZE_LEAN.neck + GAZE_LEAN.head));
      bone.updateWorldMatrix(false, true);
    }
    // The front pair of legs rears up (a lift) or braces (below zero) about her side.
    if (layer.legs !== 0) {
      for (const leg of b.legs) {
        turn(leg, _side, -layer.legs * DEG);
        leg.updateWorldMatrix(false, true);
      }
    }
    if (pose.hold > 1e-3) this.hold(group, pose);
    if (pose.offWeight > 1e-3 && b.upperL && b.foreL && b.handL) this.offHand(group, pose);
    for (const s of this.slots) {
      const q = s.bone.quaternion;
      if (s.moving && dt > 0) {
        if (smooth > 0) {
          // The spring (exact, critically damped): where it was (doneQ) off the new pose, turning as it was (vel).
          rotationVector(_qt.copy(s.doneQ).multiply(_q1.copy(q).invert()), _a);
          const e = Math.exp(-SMOOTH_RATE * dt);
          _b.copy(s.vel).addScaledVector(_a, SMOOTH_RATE);
          _a.addScaledVector(_b, dt).multiplyScalar(e);
          s.vel.addScaledVector(_b, -SMOOTH_RATE * dt).multiplyScalar(e);
          const angle = _a.length();
          _q2.copy(q);
          if (angle > 1e-9) _q2.premultiply(_q1.setFromAxisAngle(_a.divideScalar(angle), angle));
          q.slerp(_q2, Math.min(1, smooth));
        }
        if (smooth < 1) rotationVector(_qt.copy(q).multiply(_q1.copy(s.doneQ).invert()), s.vel).multiplyScalar(1 / dt);
      }
      s.moving = dt > 0;
      s.doneQ.copy(q);
      s.doneP.copy(s.bone.position);
      s.has = true;
    }
    if (smooth > 0) b.pelvis.parent?.updateWorldMatrix(false, true);
  }

  /**
   * The right arm holding the axe: the grip at her rest hold (carried with her chest) blended toward the keyed one, the
   * wrist likewise, and `pose.hold` of it over the clip.
   */
  private hold(group: THREE.Object3D, pose: ArmPose): void {
    const b = this.bones!;
    const { clav, upper, fore, hand, socket } = b;
    _base[0].copy(clav?.quaternion ?? _qt);
    _base[1].copy(upper.quaternion);
    _base[2].copy(fore.quaternion);
    _base[3].copy(hand.quaternion);
    // The rest grip, where her chest has it now: the idle pose's hold moved as the chest has moved from its idle pose.
    _m.multiplyMatrices(b.chest.matrixWorld, CHEST_IDLE_INV);
    _g.copy(REST_GRIP).applyMatrix4(_m);
    _c.copy(pose.grip).applyMatrix4(group.matrixWorld);
    _g.lerp(_c, pose.weight);
    // The wrist: half its roll in the forearm, the rest and its bend over the clip's relaxed hand.
    _wr.copy(REST_WRIST).lerp(pose.wrist, pose.weight);
    const roll = wristRotation(_wr, _base[3], hand.quaternion);
    fore.quaternion.multiply(_qt.setFromAxisAngle(Y, roll / 2));
    (clav ?? upper).updateWorldMatrix(false, true);
    // The wrist's target: the grip less the socket's offset, refined against where the socket lands.
    if (socket) _t.copy(_g).sub(worldPos(socket, _a)).add(worldPos(hand, _b));
    else _t.copy(_g);
    if (clav) this.shrug(clav, upper, fore, hand, _t);
    _pole.copy(POLE_R).applyQuaternion(worldQuat(b.chest, _pq));
    for (let i = 0; i < PASSES; i++) {
      if (i > 0) _t.add(_a.subVectors(_g, worldPos(socket!, _b)));
      if (!reachTwoBone(upper, fore, hand, _t, _pole) || !socket) break;
    }
    this.wristTarget.copy(_t);
    // Less than all of it (her death): back toward the clip, bone by bone.
    const k = Math.min(1, pose.hold);
    if (k < 1) {
      const bones = [clav, upper, fore, hand];
      for (let i = 0; i < 4; i++) {
        const bone = bones[i];
        if (!bone) continue;
        _qt.copy(bone.quaternion);
        bone.quaternion.copy(_base[i]).slerp(_qt, k);
      }
    }
    (clav ?? upper).updateWorldMatrix(false, true);
  }

  /** The clavicle turned a share of the way toward the wrist's target `target` (world). */
  private shrug(clav: THREE.Object3D, upper: THREE.Object3D, fore: THREE.Object3D, hand: THREE.Object3D, target: THREE.Vector3): void {
    worldPos(clav, _a);
    worldPos(upper, _b);
    const L = _b.distanceTo(worldPos(fore, _c)) + _c.distanceTo(worldPos(hand, _u));
    const lift = (target.y - _b.y) / L, far = target.distanceTo(_b) / L;
    const share = Math.max(CLAV_LIFT * THREE.MathUtils.smoothstep(lift, 0, 0.9), CLAV_REACH * THREE.MathUtils.smoothstep(far, 0.8, 1.15));
    if (share < 1e-4) return;
    _u.subVectors(_b, _a).normalize();
    _w.subVectors(target, _a).normalize();
    const angle = _u.angleTo(_w);
    if (angle < 1e-4) return;
    _q1.setFromUnitVectors(_u, _w);
    _q2.identity().slerp(_q1, Math.min(share, CLAV_MAX / angle));
    rotateWorld(clav, _q2);
    clav.updateWorldMatrix(false, true);
  }

  /** The left arm swung against the right: to its keyed wrist, `pose.offWeight` of the way from the clip. */
  private offHand(group: THREE.Object3D, pose: ArmPose): void {
    const b = this.bones!;
    const upper = b.upperL!, fore = b.foreL!, hand = b.handL!;
    _base[1].copy(upper.quaternion);
    _base[2].copy(fore.quaternion);
    _t.copy(pose.off).applyMatrix4(group.matrixWorld);
    _pole.copy(POLE_L).applyQuaternion(worldQuat(b.chest, _pq));
    if (!reachTwoBone(upper, fore, hand, _t, _pole)) return;
    const k = Math.min(1, pose.offWeight);
    if (k < 1) {
      _qt.copy(upper.quaternion);
      upper.quaternion.copy(_base[1]).slerp(_qt, k);
      _qt.copy(fore.quaternion);
      fore.quaternion.copy(_base[2]).slerp(_qt, k);
      upper.updateWorldMatrix(false, true);
    }
  }
}

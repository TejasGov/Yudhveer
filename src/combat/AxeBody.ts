import * as THREE from 'three';

/*
 * The island demoness's body carrying her axe: procedural layers laid over the attack clip each simulation step,
 * after the mixer has posed the skeleton and before it is skinned (so Engine's pose capture interpolates them like
 * any other pose, and the next step's mixer writes the clip afresh: nothing accumulates).
 *
 * - the torso twists about the spine and leans, shared out over the pelvis, spine and chest;
 * - the human torso lunges and rises on the spider body (the pelvis bone moves, the eight feet stay planted);
 * - the front pair of legs lifts and braces (the slam);
 * - the right arm reaches for a target on two-bone IK, blended over the clip's own arm by a weight, so it draws the
 *   axe back, throws it through and recoils as it comes home.
 *
 * The mixer only writes a bone when its keyed value changes (three's PropertyMixer), and most of these bones hold still
 * through an attack clip: `restore` puts back what each was before the layers (unless the mixer has since written it),
 * at the start of every step, before the mixer and HitReact run. Otherwise the layers would pile up step on step.
 *
 * Rotations are about boss-local axes (x her left, y up, z ahead) turned into each bone's parent frame (P^-1 R P), so
 * the odd rest axes of the exported bones never matter. Nothing is allocated per step.
 */

/** Degrees and metres; + twist turns her chest to her left, + lean bends her forward, + legs lifts the front pair. */
export interface BodyLayer {
  twist: number;
  lean: number;
  lunge: number;
  rise: number;
  legs: number;
}

const DEG = Math.PI / 180;
const TWIST = { pelvis: 0.2, spine: 0.35, chest: 0.45 };
const LEAN = { pelvis: 0.3, spine: 0.35, chest: 0.35 };

/** A bone the layers move, what it was before them and what they left (HitReact's way). */
interface Slot {
  bone: THREE.Object3D;
  baseQ: THREE.Quaternion;
  baseP: THREE.Vector3;
  doneQ: THREE.Quaternion;
  doneP: THREE.Vector3;
  has: boolean;
}

interface Bones {
  pelvis: THREE.Object3D;
  spine: THREE.Object3D;
  chest: THREE.Object3D;
  upper: THREE.Object3D;
  fore: THREE.Object3D;
  hand: THREE.Object3D;
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
const _dir = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _elbow = new THREE.Vector3();
const _u = new THREE.Vector3();
const _w = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _wu = new THREE.Quaternion();
/** Which way her right elbow bends when the clip gives no clear bend (boss-local: out to her right, down, back). */
const POLE = new THREE.Vector3(-0.7, -0.6, -0.25).normalize();

/** Turns `bone` by `angle` about a world `axis`. */
function turn(bone: THREE.Object3D, axis: THREE.Vector3, angle: number): void {
  if (Math.abs(angle) < 1e-6 || !bone.parent) return;
  bone.parent.matrixWorld.decompose(_pp, _pq, _ps);
  _r.setFromAxisAngle(axis, angle);
  _d.copy(_pq).invert().multiply(_r).multiply(_pq);
  bone.quaternion.premultiply(_d);
}

function worldPos(o: THREE.Object3D, out: THREE.Vector3): THREE.Vector3 {
  const e = o.matrixWorld.elements;
  return out.set(e[12], e[13], e[14]);
}

export class AxeBody {
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
    this.bones = pelvis && spine && chest && upper && fore && hand ? { pelvis, spine, chest, upper, fore, hand, legs } : null;
    this.slots = this.bones ? [pelvis!, spine!, chest!, upper!, fore!, ...legs].map((bone) => ({
      bone, baseQ: new THREE.Quaternion(), baseP: new THREE.Vector3(), doneQ: new THREE.Quaternion(), doneP: new THREE.Vector3(), has: false,
    })) : [];
    return this.bones !== null;
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
   * Lays the layers over the pose the mixer left: `layer` (zero is the clip as it is), and the right hand drawn
   * toward `arm` (boss-local) by `armWeight` (0..1). `group` is the boss's root.
   */
  public apply(group: THREE.Object3D, layer: BodyLayer, arm: THREE.Vector3, armWeight: number): void {
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
    // The torso: twist about the spine, lean about her side, both shared down the back.
    turn(b.pelvis, _up, twist * TWIST.pelvis);
    turn(b.pelvis, _side, lean * LEAN.pelvis);
    if ((layer.lunge !== 0 || layer.rise !== 0) && b.pelvis.parent) {
      // The human torso shifts on the spider: a world move in the pelvis's parent frame.
      _move.copy(_fwd).multiplyScalar(layer.lunge).addScaledVector(_up, layer.rise).multiplyScalar(scale);
      b.pelvis.parent.matrixWorld.decompose(_a, _pq, _b);
      _move.applyQuaternion(_pq.invert()).divide(_b);
      b.pelvis.position.add(_move);
    }
    b.pelvis.updateWorldMatrix(false, true);
    turn(b.spine, _up, twist * TWIST.spine);
    turn(b.spine, _side, lean * LEAN.spine);
    b.spine.updateWorldMatrix(false, true);
    turn(b.chest, _up, twist * TWIST.chest);
    turn(b.chest, _side, lean * LEAN.chest);
    b.chest.updateWorldMatrix(false, true);
    // The front pair of legs rears up (a lift) or braces (below zero) about her side.
    if (layer.legs !== 0) {
      for (const leg of b.legs) {
        turn(leg, _side, -layer.legs * DEG);
        leg.updateWorldMatrix(false, true);
      }
    }
    if (armWeight > 1e-3) this.reach(group, arm, Math.min(1, armWeight));
    for (const s of this.slots) {
      s.doneQ.copy(s.bone.quaternion);
      s.doneP.copy(s.bone.position);
      s.has = true;
    }
  }

  /** Two-bone IK of the right arm toward `target` (boss-local), `weight` of the way from where the clip has it. */
  private reach(group: THREE.Object3D, target: THREE.Vector3, weight: number): void {
    const { upper, fore, hand } = this.bones!;
    worldPos(upper, _a);
    worldPos(fore, _b);
    worldPos(hand, _c);
    _t.copy(target).applyMatrix4(group.matrixWorld);
    _t.lerpVectors(_c, _t, weight);
    const l1 = _a.distanceTo(_b), l2 = _b.distanceTo(_c);
    if (l1 < 1e-4 || l2 < 1e-4) return;
    _dir.subVectors(_t, _a);
    let d = _dir.length();
    if (d < 1e-4) return;
    _dir.divideScalar(d);
    d = THREE.MathUtils.clamp(d, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
    // Bend the elbow the way the clip bends it (no flips); a fixed hint if the clip holds the arm straight.
    _pole.subVectors(_b, _a).addScaledVector(_dir, -_u.subVectors(_b, _a).dot(_dir));
    if (_pole.lengthSq() < 1e-4) _pole.copy(POLE).applyQuaternion(_gq).addScaledVector(_dir, -_dir.dot(_w.copy(POLE).applyQuaternion(_gq)));
    if (_pole.lengthSq() < 1e-8) return;
    _pole.normalize();
    const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    _elbow.copy(_a).addScaledVector(_dir, x).addScaledVector(_pole, h);
    // The upper arm onto the elbow (a world rotation), then the forearm onto the target.
    _q1.setFromUnitVectors(_u.subVectors(_b, _a).normalize(), _w.subVectors(_elbow, _a).normalize());
    upper.matrixWorld.decompose(_pp, _wu, _ps);
    upper.parent!.matrixWorld.decompose(_pp, _pq, _ps);
    _d.copy(_pq).invert().multiply(_q1).multiply(_pq);
    upper.quaternion.premultiply(_d);
    // Where the wrist went with it.
    _c.sub(_a).applyQuaternion(_q1).add(_a);
    _q2.setFromUnitVectors(_u.subVectors(_c, _elbow).normalize(), _w.subVectors(_t, _elbow).normalize());
    // The forearm's parent (the upper arm) now has world rotation q1 * (its old one).
    _pq.copy(_q1).multiply(_wu);
    _d.copy(_pq).invert().multiply(_q2).multiply(_pq);
    fore.quaternion.premultiply(_d);
    upper.updateWorldMatrix(false, true);
  }
}

import * as THREE from 'three';
import { Enemy } from './Enemy';

/** Seconds into the death fall at which the talwar slips from the hand (the body has settled by then: mutant_dying). */
const DROP_AFTER = 3.0;
/** Seconds the dropped talwar takes to fall and lie flat on the ground. */
const DROP_FALL = 0.25;
/** Its height above the ground once it lies there (the hilt's half thickness), metres. */
const LIE_HEIGHT = 0.03;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * The prologue's raiders, Andhaka's men come for the guru: desert dacoits with talwars (characters/Village.ts). They
 * come in numbers through the gate, and the boy with the lathi is not meant to beat them all (the chapter's fight is a
 * scripted loss). Dead, a raider lets go of his talwar: it drops and lies flat beside him instead of standing up out
 * of his fist.
 */
export class Raider extends Enemy {
  /** The talwar's fall from the dead hand: from where it was let go to lying flat (group space). */
  private drop: { from: THREE.Vector3; to: THREE.Vector3; fromQ: THREE.Quaternion; toQ: THREE.Quaternion; t: number } | null = null;

  constructor(id: string) {
    super(id, 0x6a5040);
    this.displayName = 'Raider';
    this.maxHealth = 40;
    this.currentHealth = 40;
    this.maxMarma = 40;
    this.moveSpeed = 4;
    this.attackCooldown = 2.4;
    this.telegraphDuration = 0.55;
    this.engageRange = 2.4;
    this.turnRate = 6;
    this.damageScale = 0.85;
    this.attackStates = ['ATTACK_1', 'ATTACK_2'];
    // No greybox blade while the model loads: the talwar (a prop on the rig's hand socket) takes its place.
    const socket = this.getSocket('mixamorigRightHand');
    socket?.remove(this.swordMesh);
    this.swordMesh = new THREE.Group();
    socket?.add(this.swordMesh);
    this.shieldMesh.visible = false;
  }

  public override update(dt: number): void {
    super.update(dt);
    if (!this.rig || this.stateMachine.currentState !== 'DEAD') return;
    if (!this.drop) {
      if (this.stateMachine.stateTime >= DROP_AFTER) this.letGo();
      return;
    }
    const d = this.drop;
    if (d.t >= DROP_FALL) return;
    d.t = Math.min(DROP_FALL, d.t + dt);
    const u = d.t / DROP_FALL;
    const k = u * u; // falling: slow from the hand, fast at the ground
    this.swordMesh.position.lerpVectors(d.from, d.to, k);
    this.swordMesh.quaternion.slerpQuaternions(d.fromQ, d.toQ, Math.min(1, u * 1.4));
  }

  /**
   * The talwar leaves the fist where it is (the hand opens: its socket holds nothing) and falls to lie flat on the ground
   * beside the hand, its blade pointing away from the body, the flat of the blade up. It stays with the body (the
   * raider's own group).
   */
  private letGo(): void {
    const sword = this.swordMesh;
    if (!sword.parent || sword.parent === this.group) return;
    this.group.attach(sword);
    // Away from the body: from the hips out through the hand (or, failing that, the way the blade pointed).
    const hips = this.rig?.root.getObjectByName('Hips');
    const blade = hips ? sword.position.clone().sub(this.group.worldToLocal(hips.getWorldPosition(new THREE.Vector3()))) : new THREE.Vector3();
    blade.setY(0);
    if (blade.lengthSq() < 0.01) blade.set(0, 1, 0).applyQuaternion(sword.quaternion).setY(0);
    if (blade.lengthSq() < 1e-4) blade.set(0, 0, 1);
    blade.normalize();
    // Lying flat: the blade (+Y) along the ground, its flat (local Z) facing up, the edge (+X) to one side.
    const side = new THREE.Vector3().crossVectors(blade, UP);
    const toQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, blade, UP));
    // The group stands on the ground (its origin is at the feet).
    const to = sword.position.clone().setY(LIE_HEIGHT);
    this.drop = { from: sword.position.clone(), to, fromQ: sword.quaternion.clone(), toQ, t: 0 };
  }
}

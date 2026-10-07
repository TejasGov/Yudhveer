import * as THREE from 'three';
import { Enemy, type FightTarget } from './Enemy';
import type { CharacterState } from './CharacterStateMachine';
import { ProjectileManager } from '../combat/ProjectileManager';

/** Keeps to this band of distance from its target, casting from inside it. */
const KEEP_NEAR = 4.5;
const KEEP_FAR = 9;
/** Seconds between spells; every third is the three-bolt volley. */
const CAST_COOLDOWN = 3;
/** Share of the single cast at which the bolt leaves the hand. */
const RELEASE_AT = 0.45;
/** The volley's bolts, as shares of its clip. */
const VOLLEY_AT = [0.35, 0.5, 0.65];

/**
 * Chapter II, Mayavi: an asura sorcerer who keeps his distance and throws bolts of fire; deflected bolts fly back at
 * him. Cornered, he claws and kicks.
 */
export class Mayavi extends Enemy {
  private projectiles = ProjectileManager.getInstance();
  private castTimer = 1.5;
  private casts = 0;
  private released = 0;
  private aimAt = new THREE.Vector3();

  constructor(id: string) {
    super(id, 0x2b3f6b);
    this.displayName = 'Mayavi';
    this.nativeName = 'मायावी';
    this.epithet = 'Deflect his spells back at him';
    // Milestone 12: health 90 -> 110, blows and bolts at 80 % (his bolts did 18).
    this.maxHealth = 110;
    this.currentHealth = 110;
    this.damageScale = 0.8;
    this.maxMarma = 70;
    this.moveSpeed = 4.5;
    this.attackCooldown = 2.6;
    this.engageRange = 1.9;
    this.crowdRange = 0;
    this.attackStates = ['ATTACK_1', 'ATTACK_2'];
    // No weapon: his hands are the spell and the claw.
    const socket = this.getSocket('mixamorigRightHand');
    socket?.remove(this.swordMesh);
    this.swordMesh = new THREE.Group();
    socket?.add(this.swordMesh);
    this.shieldMesh.visible = false;
  }

  public override updateAI(dt: number, target: FightTarget): void {
    const state = this.stateMachine.currentState;
    if (state === 'DEAD') return;
    if (state === 'CAST' || state === 'CHARGE') {
      this.updateSpell(target);
      this.updateProceduralAnimations(dt, 0);
      return;
    }
    if (state !== 'IDLE' && state !== 'MOVE' && state !== 'WALK' && !state.startsWith('STRAFE') && state !== 'WALK_BACK') {
      super.updateAI(dt, target);
      return;
    }
    const toTarget = new THREE.Vector3().subVectors(target.getPosition(), this.getPosition()).setY(0);
    const distance = toTarget.length();
    this.castTimer += dt;

    // Cornered: fight hand to hand.
    if (distance < 2.2 || target.isDown()) {
      super.updateAI(dt, target);
      return;
    }
    if (distance > 0.1) this.turnToward(Math.atan2(toTarget.x, toTarget.z), this.turnRate, dt);
    const dir = toTarget.normalize();
    const mode = this.chooseMoveMode(distance, KEEP_FAR, KEEP_NEAR, dt);
    if (this.castTimer >= CAST_COOLDOWN && distance <= KEEP_FAR + 3) {
      this.castTimer = 0;
      this.released = 0;
      this.casts++;
      this.stateMachine.changeState(this.casts % 3 === 0 && this.hasClip('CHARGE') ? 'CHARGE' : 'CAST');
    } else if (mode === 'retreat') {
      this.backOff(dir, dt);
    } else if (mode === 'approach') {
      this.steer(dir, this.moveSpeed * 0.7, dt);
      this.settle('MOVE');
    } else {
      this.circle(dir, dt);
    }
    this.updateProceduralAnimations(dt, 0.5);
  }

  /** Lets each bolt go at its moment in the clip, aimed at where the target is then. */
  private updateSpell(target: FightTarget): void {
    const sm = this.stateMachine;
    const volley = sm.currentState === 'CHARGE';
    const times = volley ? VOLLEY_AT.map((f) => f * sm.CHARGE_DURATION) : [RELEASE_AT * sm.CAST_DURATION];
    while (this.released < times.length && sm.stateTime >= times[this.released]) {
      const origin = this.rig ? this.swordMesh.getWorldPosition(new THREE.Vector3()) : this.getPosition().clone().setY(this.getPosition().y + 1.4);
      this.aimAt.copy(target.getPosition()).setY(target.getPosition().y + 1.1);
      // The volley fans out a little either side.
      if (volley) this.aimAt.add(new THREE.Vector3((this.released - 1) * 1.2, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y));
      this.projectiles.spawnOrb(origin, this.aimAt, this.id, this.damageScale);
      this.released++;
    }
    if (volley && sm.stateTime >= sm.CHARGE_DURATION) sm.changeState('IDLE');
  }

  protected override onStateChange(state: CharacterState): void {
    if (state.startsWith('ATTACK')) this.soundFX.playSwordSwing(1.2);
  }
}

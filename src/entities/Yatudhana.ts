import * as THREE from 'three';
import { Enemy, type FightTarget } from './Enemy';
import type { CharacterState } from './CharacterStateMachine';
import { ProjectileManager } from '../combat/ProjectileManager';

/** Leaves its route across the bridge to cast once its target is this close (the brutes run on to 4 m). */
const CAST_RANGE = 11;
/** Keeps to this band of distance from its target, casting from inside it. */
const KEEP_NEAR = 5;
const KEEP_FAR = 9.5;
/** Cornered inside this distance: it claws instead. */
const CORNERED = 2.2;
/** Seconds between bolts (a little random, so two of them do not fire in step). */
const CAST_COOLDOWN = 3.8;
/** Share of the cast at which the bolt leaves the hand. */
const RELEASE_AT = 0.45;

/**
 * Chapter V, a yatudhana: a sorcerer-demon who comes over the bridges among the brutes, stops short of the fight
 * and throws single bolts of fire at the hero from range. Frail (a returned bolt nearly kills it, a few blows do);
 * cornered, it claws and kicks. Its model: characters/Yatudhana.ts.
 *
 * The brutes press in and the sorcerers hang back: the hero has to deflect fire while he is crowded, or break off to
 * run the casters down.
 */
export class Yatudhana extends Enemy {
  private projectiles = ProjectileManager.getInstance();
  private castTimer: number;
  private released = false;

  constructor(id: string) {
    super(id, 0x4a4050);
    this.displayName = 'Yatudhana';
    this.epithet = 'Turn its fire back on it';
    this.maxHealth = 38;
    this.currentHealth = 38;
    this.maxMarma = 30;
    this.moveSpeed = 4;
    this.attackCooldown = 2.6;
    this.telegraphDuration = 0.5;
    this.engageRange = 1.9;
    this.crowdRange = 0;
    this.turnRate = 7;
    this.damageScale = 0.75;
    this.attackStates = ['ATTACK_1', 'ATTACK_2'];
    // Its first bolt comes soon after it stops, not at once.
    this.castTimer = CAST_COOLDOWN - 1.2 - Math.random();
    // No weapon: its hands are the spell and the claw.
    const socket = this.getSocket('mixamorigRightHand');
    socket?.remove(this.swordMesh);
    this.swordMesh = new THREE.Group();
    socket?.add(this.swordMesh);
    this.shieldMesh.visible = false;
  }

  public override updateAI(dt: number, target: FightTarget): void {
    const state = this.stateMachine.currentState;
    if (state === 'DEAD') return;
    if (state === 'CAST') {
      this.updateCast(target);
      this.updateProceduralAnimations(dt, 0);
      return;
    }
    const toTarget = new THREE.Vector3().subVectors(target.getPosition(), this.getPosition()).setY(0);
    const distance = toTarget.length();
    // Still crossing: run on until the hero is in range (the base AI follows the route).
    if (this.route.length > 0 && distance > CAST_RANGE && !target.isDown()) {
      super.updateAI(dt, target);
      return;
    }
    this.route = [];
    // Hit, swinging, or cornered: the base AI (it flinches, claws and kicks).
    const free = state === 'IDLE' || state === 'MOVE' || state === 'WALK' || state === 'WALK_BACK' || state.startsWith('STRAFE');
    if (!free || this.isTelegraphing || distance < CORNERED || target.isDown()) {
      super.updateAI(dt, target);
      return;
    }
    this.castTimer += dt;
    if (distance > 0.1) this.turnToward(Math.atan2(toTarget.x, toTarget.z), this.turnRate, dt);
    const dir = toTarget.normalize();
    const mode = this.chooseMoveMode(distance, KEEP_FAR, KEEP_NEAR, dt);
    if (this.castTimer >= CAST_COOLDOWN && distance <= KEEP_FAR + 2 && this.hasClip('CAST')) {
      this.castTimer = Math.random() * 0.8;
      this.released = false;
      this.stateMachine.changeState('CAST');
    } else if (mode === 'retreat') {
      this.backOff(dir, dt);
    } else if (mode === 'approach') {
      this.steer(dir, this.moveSpeed * 0.6, dt);
      this.settle('MOVE');
    } else {
      this.circle(dir, dt);
    }
    this.updateProceduralAnimations(dt, 0.5);
  }

  /** Lets the bolt go at its moment in the cast, aimed at where the target is then. */
  private updateCast(target: FightTarget): void {
    const sm = this.stateMachine;
    if (this.released || sm.stateTime < RELEASE_AT * sm.CAST_DURATION) return;
    this.released = true;
    const origin = this.rig ? this.swordMesh.getWorldPosition(new THREE.Vector3()) : this.getPosition().clone().setY(this.getPosition().y + 1.3);
    const aim = target.getPosition().clone();
    aim.y += 1.1;
    this.projectiles.spawnOrb(origin, aim, this.id);
  }

  protected override onStateChange(state: CharacterState): void {
    if (state.startsWith('ATTACK')) this.soundFX.playSwordSwing(1.25);
  }
}

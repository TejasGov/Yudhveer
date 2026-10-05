import * as THREE from 'three';
import { Enemy, type FightTarget } from './Enemy';
import type { CharacterState } from './CharacterStateMachine';
import { ProjectileManager } from '../combat/ProjectileManager';
import { PhysicsWorld } from '../core/PhysicsWorld';

/*
 * Chapter III's creatures (docs/STORY.md, "Chapter III"): PLACEHOLDER behaviour on PLACEHOLDER models (their rigs are
 * in characters/IslandMonsters.ts). The mini monsters rush in a pack and come at him from all sides; the archers keep
 * their distance, strafe, and loose a shaft of fire after a draw he can see coming.
 */

const UP = new THREE.Vector3(0, 1, 0);

/**
 * A mini monster: about a metre tall, fast, weak alone. Each one picks a side of him to come in from, so a pack
 * spreads round him instead of queueing in a line; once close it fights like any brute, only quicker.
 */
export class MiniMonster extends Enemy {
  /** The bearing (round the hero) this one closes in on. */
  private readonly flank = Math.random() * Math.PI * 2;
  private readonly flankPoint = new THREE.Vector3();

  constructor(id: string) {
    super(id, 0x6a6e5a);
    this.displayName = 'Cave runt';
    this.blood = 'ichor';
    this.maxHealth = 24;
    this.currentHealth = 24;
    this.maxMarma = 22;
    this.attackCooldown = 1.5;
    this.telegraphDuration = 0.4;
    this.engageRange = 1.7;
    this.crowdRange = 0.9;
    this.turnRate = 9;
    this.damageScale = 0.45;
    this.attackStates = ['ATTACK_1', 'ATTACK_2'];
    this.lungeSpec = { a: 0, b: 0.25, maxDist: 1.4, stopDist: 1.0 };
    this.swingSound = 'blade';
    // The rakshasa's cleaver is part of the model: nothing drawn in the hand.
    const socket = this.getSocket('mixamorigRightHand');
    socket?.remove(this.swordMesh);
    this.swordMesh = new THREE.Group();
    socket?.add(this.swordMesh);
    this.shieldMesh.visible = false;
  }

  public override updateAI(dt: number, target: FightTarget): void {
    const state = this.stateMachine.currentState;
    const free = state === 'IDLE' || state === 'MOVE' || state === 'WALK';
    const to = target.getPosition();
    const distance = Math.hypot(to.x - this.getPosition().x, to.z - this.getPosition().z);
    // Still closing in, and not already in reach: run for its side of him (closer in, the plain brute takes over).
    if (free && !this.isTelegraphing && this.route.length === 0 && !target.isDown() && distance > this.engageRange + 1.6) {
      this.flankPoint.set(to.x + Math.sin(this.flank) * 1.5, to.y, to.z + Math.cos(this.flank) * 1.5);
      const dir = this.flankPoint.sub(this.getPosition()).setY(0);
      if (dir.lengthSq() > 0.01) {
        dir.normalize();
        this.turnToward(Math.atan2(dir.x, dir.z), this.turnRate, dt);
        this.steer(dir, this.moveSpeed, dt);
        this.settle('MOVE');
      }
      this.updateProceduralAnimations(dt, 1);
      return;
    }
    super.updateAI(dt, target);
  }
}

/** Keeps to this band of distance from him. */
const KEEP_NEAR = 6;
const KEEP_FAR = 12;
/** Closer than this, it fights hand to hand. */
const CORNERED = 2.4;
/** The draw (the telegraph: a glow gathers at the hand), then the loose partway through the cast clip. */
const DRAW_SECONDS = 0.85;
const RELEASE_AT = 0.4;

/**
 * An archer monster: keeps 6 to 12 m off, circles, and every few seconds draws (a fire-glow gathers in its hand and
 * the telegraph sounds) and looses a shaft of fire straight at him. The shaft can be slid under, blocked on the dhal
 * or parried back. It only shoots with a clear line to him; cornered, it claws.
 */
export class ArcherMonster extends Enemy {
  private projectiles = ProjectileManager.getInstance();
  private physics = PhysicsWorld.getInstance();
  private shotTimer = 1.2 + Math.random() * 1.5;
  private drawing = 0;
  private loosed = false;
  private readonly glow: THREE.Mesh;

  constructor(id: string) {
    super(id, 0x3f4a33);
    this.displayName = 'Cave archer';
    this.blood = 'ichor';
    this.maxHealth = 50;
    this.currentHealth = 50;
    this.maxMarma = 45;
    this.attackCooldown = 2.4;
    this.engageRange = 1.9;
    this.crowdRange = 0;
    this.damageScale = 0.7;
    this.attackStates = ['ATTACK_1', 'ATTACK_2'];
    const socket = this.getSocket('mixamorigRightHand');
    socket?.remove(this.swordMesh);
    this.swordMesh = new THREE.Group();
    socket?.add(this.swordMesh);
    this.shieldMesh.visible = false;
    // The draw's glow, carried at the hand.
    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.9, 0.25), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    );
    this.glow.visible = false;
    this.group.add(this.glow);
  }

  public override updateAI(dt: number, target: FightTarget): void {
    const state = this.stateMachine.currentState;
    if (state === 'DEAD') {
      this.endDraw();
      return;
    }
    if (state === 'CAST') {
      this.updateLoose(target);
      this.updateProceduralAnimations(dt, 0);
      return;
    }
    // Struck out of the draw.
    if (state !== 'IDLE' && state !== 'MOVE' && state !== 'WALK' && !state.startsWith('STRAFE') && state !== 'WALK_BACK') {
      this.endDraw();
      super.updateAI(dt, target);
      return;
    }
    const to = new THREE.Vector3().subVectors(target.getPosition(), this.getPosition()).setY(0);
    const distance = to.length();
    if (distance < CORNERED || target.isDown()) {
      this.endDraw();
      super.updateAI(dt, target);
      return;
    }
    if (distance > 0.1) this.turnToward(Math.atan2(to.x, to.z), this.turnRate, dt);
    const dir = to.normalize();

    if (this.drawing > 0) {
      this.drawing += dt;
      this.showGlow(this.drawing / DRAW_SECONDS);
      this.settle('IDLE');
      if (this.drawing >= DRAW_SECONDS) {
        this.endDraw();
        this.loosed = false;
        this.stateMachine.changeState('CAST');
      }
      this.updateProceduralAnimations(dt, 0);
      return;
    }

    this.shotTimer -= dt;
    const clear = this.clearShot(target);
    const mode = this.chooseMoveMode(distance, KEEP_FAR, KEEP_NEAR, dt);
    if (this.shotTimer <= 0 && distance <= KEEP_FAR + 4 && clear) {
      this.shotTimer = 3 + Math.random() * 1.6;
      this.drawing = 1e-3;
      this.soundFX.playTelegraphSound();
    } else if (mode === 'retreat') {
      this.backOff(dir, dt);
    } else if (mode === 'approach' || !clear) {
      // Out of range, or rock in the way: come round for a clear shot.
      this.steer(dir, this.moveSpeed * 0.7, dt);
      this.settle('MOVE');
    } else {
      this.circle(dir, dt);
    }
    this.updateProceduralAnimations(dt, 0.5);
  }

  /** Lets the shaft go at its moment in the cast clip, aimed at his chest where he stands then. */
  private updateLoose(target: FightTarget): void {
    const sm = this.stateMachine;
    if (this.loosed || sm.stateTime < RELEASE_AT * sm.CAST_DURATION) return;
    this.loosed = true;
    const origin = this.handPoint();
    const aim = target.getPosition().clone().add(new THREE.Vector3(0, 1.1, 0));
    this.projectiles.spawnArrow(origin, aim, this.id);
  }

  /** No rock between its hand and his chest. */
  private clearShot(target: FightTarget): boolean {
    const from = this.getPosition().clone().add(new THREE.Vector3(0, 1.3, 0));
    const to = target.getPosition().clone().add(new THREE.Vector3(0, 1.1, 0));
    const d = to.clone().sub(from);
    const length = d.length();
    if (length < 0.1) return true;
    const hit = this.physics.castCameraRay(from, d.divideScalar(length), length);
    return hit === null || hit > length - 0.6;
  }

  private handPoint(): THREE.Vector3 {
    return this.rig ? this.swordMesh.getWorldPosition(new THREE.Vector3()) : this.getPosition().clone().addScaledVector(UP, 1.3);
  }

  private showGlow(k: number): void {
    this.glow.visible = true;
    const local = this.group.worldToLocal(this.handPoint());
    this.glow.position.copy(local);
    this.glow.scale.setScalar(0.4 + k * 1.2);
    (this.glow.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.55 * k;
  }

  private endDraw(): void {
    this.drawing = 0;
    this.glow.visible = false;
  }

  protected override onStateChange(state: CharacterState, previous: CharacterState): void {
    if (state.startsWith('ATTACK')) this.soundFX.playSwordSwing(1.15);
    else super.onStateChange(state, previous);
  }
}

import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsWorld } from '../core/PhysicsWorld';

export interface MotorOptions {
  /** Highest ledge walked straight up (stairs, the 0.7 m lip of the baoli platform out of the water). */
  maxStepHeight: number;
  /** Narrowest ledge top that counts as a step. */
  minStepWidth: number;
  /** Stays glued to ground up to this far below while walking down (stairs); larger drops are real falls. */
  snapToGround: number;
  maxSlopeDegrees: number;
  /** Fastest fall speed, m/s. */
  terminalVelocity: number;
}

/** Movement (m) the controller may invent for a body standing still on the ground before it counts as real. */
const STILL_SLOP = 0.006;

export const DEFAULT_MOTOR: MotorOptions = {
  maxStepHeight: 0.75,
  minStepWidth: 0.25,
  snapToGround: 0.45,
  maxSlopeDegrees: 50,
  terminalVelocity: 40,
};

/**
 * Collision, gravity and stepping for one character, on top of a Rapier kinematic character controller.
 *
 * Gameplay code keeps moving the entity freely (input, jumps, lunges, root motion, AI); once per fixed step
 * `resolve` turns "where it wants to be" into "where it can be": walls, pillars and other fighters block,
 * stairs are climbed, ground is followed and gravity pulls it down. The entity position is the feet.
 */
export class CharacterMotor {
  /**
   * Fighter capsules are left out of each other's controller queries: overlapping controllers step onto each
   * other every frame and climb into the sky. Fighters are kept apart by `separateFighters` instead.
   */
  private static readonly fighterColliders = new Set<number>();
  private static readonly ignoreFighters = (c: RAPIER.Collider) => !CharacterMotor.fighterColliders.has(c.handle);

  /**
   * Whether there is level geometry under `feet` within `maxDrop` metres (fighters ignored): AI checks it before
   * stepping sideways or back, so nobody circles off a bridge.
   */
  public static hasGround(feet: THREE.Vector3, maxDrop = 1.2): boolean {
    const physics = PhysicsWorld.getInstance();
    const R = physics.RAPIER_INSTANCE;
    if (!R || !physics.world) return true;
    const ray = new R.Ray({ x: feet.x, y: feet.y + 0.6, z: feet.z }, { x: 0, y: -1, z: 0 });
    return physics.world.castRay(ray, maxDrop + 0.6, true, undefined, undefined, undefined, undefined,
      CharacterMotor.ignoreFighters) !== null;
  }

  /**
   * The height of the level's ground straight below `from` (within `maxDrop`), fighters and sensors ignored, and its
   * normal in `normal`; null over a drop, or when `from` is already inside something (a wall).
   */
  public static groundBelow(from: THREE.Vector3, maxDrop: number, normal?: THREE.Vector3): number | null {
    const physics = PhysicsWorld.getInstance();
    const R = physics.RAPIER_INSTANCE;
    if (!R || !physics.world) return null;
    const ray = new R.Ray({ x: from.x, y: from.y, z: from.z }, { x: 0, y: -1, z: 0 });
    const hit = physics.world.castRayAndGetNormal(ray, maxDrop, true, R.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, undefined,
      CharacterMotor.ignoreFighters);
    if (!hit || hit.timeOfImpact <= 1e-4) return null;
    normal?.set(hit.normal.x, hit.normal.y, hit.normal.z);
    return from.y - hit.timeOfImpact;
  }

  public grounded = false;
  public verticalVelocity = 0;
  /** Capsule radius, for fighter separation. */
  public readonly radius: number;
  private readonly controller: RAPIER.KinematicCharacterController;
  private readonly physics = PhysicsWorld.getInstance();
  private readonly gravity: number;

  /**
   * @param footOffset height of the capsule centre above the feet (capsule half-height + radius)
   */
  constructor(
    private readonly body: RAPIER.RigidBody,
    private readonly collider: RAPIER.Collider,
    private readonly footOffset: number,
    private readonly options: MotorOptions = DEFAULT_MOTOR,
  ) {
    this.controller = this.physics.createCharacterController(0.02);
    this.controller.setUp({ x: 0, y: 1, z: 0 });
    this.controller.enableAutostep(options.maxStepHeight, options.minStepWidth, false);
    this.controller.enableSnapToGround(options.snapToGround);
    this.controller.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(options.maxSlopeDegrees));
    this.controller.setMinSlopeSlideAngle(THREE.MathUtils.degToRad(options.maxSlopeDegrees + 5));
    this.controller.setSlideEnabled(true);
    this.gravity = Math.abs(this.physics.gravityY);
    this.radius = (collider.shape as RAPIER.Capsule).radius ?? 0.4;
    CharacterMotor.fighterColliders.add(collider.handle);
    this.physics.setCameraTransparent(collider, true);
  }

  /** Places the feet at `feet` immediately (spawns, respawns, level switches). */
  public teleport(feet: THREE.Vector3): void {
    const centre = { x: feet.x, y: feet.y + this.footOffset, z: feet.z };
    this.body.setTranslation(centre, true);
    this.body.setNextKinematicTranslation(centre);
    this.physics.syncColliders();
    this.verticalVelocity = 0;
    this.grounded = false;
  }

  /** Leaves the ground upwards at `speed` m/s (a jump); gravity brings the character back. */
  public launch(speed: number): void {
    this.verticalVelocity = speed;
    this.grounded = false;
  }

  /**
   * Resolves this step. `feet` holds where gameplay moved the character (horizontally); it is overwritten with
   * the collision-corrected position, gravity applied.
   */
  public resolve(feet: THREE.Vector3, dt: number): void {
    const at = this.collider.translation();
    this.verticalVelocity = this.grounded && this.verticalVelocity <= 0
      ? -1 // a small press keeps contact (and lets snap-to-ground follow stairs down)
      : Math.max(this.verticalVelocity - this.gravity * dt, -this.options.terminalVelocity);
    const desired = {
      x: feet.x - at.x,
      y: this.verticalVelocity * dt,
      z: feet.z - at.z,
    };
    this.controller.computeColliderMovement(this.collider, desired, undefined, undefined, CharacterMotor.ignoreFighters);
    const computed = this.controller.computedMovement();
    const moved = { x: computed.x, y: computed.y, z: computed.z };
    // Still touching the ground on the first rising step of a jump does not count as landed.
    this.grounded = this.controller.computedGrounded() && this.verticalVelocity <= 0;
    // Standing still on the ground, the controller's skin nudges the capsule a millimetre or two this way and that
    // every few steps (on a slope, against the ground's offset): visible as a tremor at close range (JITTER.md, S3).
    // A body that is not trying to go anywhere stays exactly where it is.
    if (this.grounded && Math.hypot(desired.x, desired.z) < 1e-5 && Math.hypot(moved.x, moved.z) < STILL_SLOP && Math.abs(moved.y) < STILL_SLOP) {
      moved.x = moved.y = moved.z = 0;
    }
    if (this.grounded && this.verticalVelocity < 0) this.verticalVelocity = 0;
    // Head hit a ceiling: stop rising.
    if (this.verticalVelocity > 0 && moved.y < desired.y * 0.5) this.verticalVelocity = 0;

    const next = { x: at.x + moved.x, y: at.y + moved.y, z: at.z + moved.z };
    this.body.setNextKinematicTranslation(next);
    feet.set(next.x, next.y - this.footOffset, next.z);
  }

  public dispose(): void {
    CharacterMotor.fighterColliders.delete(this.collider.handle);
    this.physics.setCameraTransparent(this.collider, false);
    this.physics.removeCharacterController(this.controller);
  }
}

/**
 * Anything separable: its feet position, capsule radius, whether it still takes up space, its weight in the push, and
 * where to add up the shove it was given (so its stride and AI can tell a shove from its own movement).
 */
export interface Separable {
  position: THREE.Vector3;
  radius: number;
  solid: boolean;
  mass: number;
  push: THREE.Vector3;
}

/**
 * Of an overlap up to this deep (m), only `SOFT_SHARE` is removed per step: two fighters pressed together settle apart
 * over a few steps instead of being kicked a full overlap apart and walking straight back in (the ping-pong that kept
 * pinned minions twitching, JITTER.md fix 3). Anything deeper is removed at once, so no one walks through anyone.
 */
const SOFT_DEPTH = 0.08;
const SOFT_SHARE = 0.35;

/**
 * Soft fighter-vs-fighter collision: overlapping capsules are pushed apart horizontally, the lighter one further (a
 * man barely moves the Baoli guardian), before the motors resolve the step (so a push into a wall is still stopped by
 * the wall). O(n^2), fine for a duel arena.
 */
export function separateFighters(fighters: Separable[]): void {
  const push = new THREE.Vector2();
  for (let i = 0; i < fighters.length; i++) {
    const a = fighters[i];
    if (!a.solid) continue;
    for (let j = i + 1; j < fighters.length; j++) {
      const b = fighters[j];
      if (!b.solid || Math.abs(a.position.y - b.position.y) > 1.6) continue; // stacked on different levels
      push.set(b.position.x - a.position.x, b.position.z - a.position.z);
      const dist = push.length();
      const overlap = a.radius + b.radius - dist;
      if (overlap <= 0) continue;
      if (dist < 1e-4) push.set(1, 0); // exactly coincident: pick any direction
      else push.divideScalar(dist);
      const correction = Math.max(0, overlap - SOFT_DEPTH) + Math.min(overlap, SOFT_DEPTH) * SOFT_SHARE;
      const wa = b.mass / (a.mass + b.mass);
      const wb = 1 - wa;
      a.position.x -= push.x * correction * wa;
      a.position.z -= push.y * correction * wa;
      b.position.x += push.x * correction * wb;
      b.position.z += push.y * correction * wb;
      a.push.x -= push.x * correction * wa;
      a.push.z -= push.y * correction * wa;
      b.push.x += push.x * correction * wb;
      b.push.z += push.y * correction * wb;
    }
  }
}

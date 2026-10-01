import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export class PhysicsWorld {
  private static instance: PhysicsWorld | null = null;
  public world: RAPIER.World | null = null;
  public RAPIER_INSTANCE: typeof RAPIER | null = null;
  public isReady: boolean = false;
  private gravity = { x: 0.0, y: -24.0, z: 0.0 };

  private constructor() {}

  public static getInstance(): PhysicsWorld {
    if (!PhysicsWorld.instance) {
      PhysicsWorld.instance = new PhysicsWorld();
    }
    return PhysicsWorld.instance;
  }

  public async init(): Promise<void> {
    if (this.isReady) return;
    await RAPIER.init();
    this.RAPIER_INSTANCE = RAPIER;
    this.world = new RAPIER.World(this.gravity);
    this.isReady = true;
  }

  public step(dt: number): void {
    if (!this.world || !this.isReady) return;
    // Set physics timestep
    this.world.timestep = Math.min(dt, 0.033);
    this.world.step();
  }

  /**
   * Create kinematic/dynamic character capsule collider
   */
  public createCharacterCapsule(
    position: THREE.Vector3,
    halfHeight = 0.55,
    radius = 0.4,
    isKinematic = true
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    if (!this.world || !this.RAPIER_INSTANCE) {
      throw new Error('PhysicsWorld not initialized');
    }

    const bodyDesc = isKinematic
      ? this.RAPIER_INSTANCE.RigidBodyDesc.kinematicPositionBased()
          .setTranslation(position.x, position.y, position.z)
      : this.RAPIER_INSTANCE.RigidBodyDesc.dynamic()
          .setTranslation(position.x, position.y, position.z)
          .lockRotations();

    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.RAPIER_INSTANCE.ColliderDesc.capsule(halfHeight, radius)
      .setFriction(0.1)
      .setRestitution(0.0);

    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  /**
   * Create static box obstacle (e.g. platform, step, pillar)
   */
  public createStaticBox(
    position: THREE.Vector3,
    halfExtents: THREE.Vector3,
    rotation?: THREE.Quaternion
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    if (!this.world || !this.RAPIER_INSTANCE) {
      throw new Error('PhysicsWorld not initialized');
    }

    const bodyDesc = this.RAPIER_INSTANCE.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z);

    if (rotation) {
      bodyDesc.setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
    }

    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.RAPIER_INSTANCE.ColliderDesc.cuboid(
      halfExtents.x,
      halfExtents.y,
      halfExtents.z
    ).setFriction(0.8);

    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  /**
   * Create static cylinder collider (for ancient round temple pillars)
   */
  public createStaticCylinder(
    position: THREE.Vector3,
    halfHeight: number,
    radius: number
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    if (!this.world || !this.RAPIER_INSTANCE) {
      throw new Error('PhysicsWorld not initialized');
    }

    const bodyDesc = this.RAPIER_INSTANCE.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z);

    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.RAPIER_INSTANCE.ColliderDesc.cylinder(halfHeight, radius);
    const collider = this.world.createCollider(colliderDesc, body);
    return { body, collider };
  }

  /**
   * Create a static triangle-mesh collider from world-space vertices
   */
  public createStaticTrimesh(vertices: Float32Array, indices: Uint32Array): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    if (!this.world || !this.RAPIER_INSTANCE) {
      throw new Error('PhysicsWorld not initialized');
    }
    const body = this.world.createRigidBody(this.RAPIER_INSTANCE.RigidBodyDesc.fixed());
    const collider = this.world.createCollider(
      this.RAPIER_INSTANCE.ColliderDesc.trimesh(vertices, indices).setFriction(0.8),
      body
    );
    return { body, collider };
  }

  public removeBody(body: RAPIER.RigidBody): void {
    if (this.world) this.world.removeRigidBody(body);
  }

  public get gravityY(): number {
    return this.gravity.y;
  }

  /** Rapier kinematic character controller; `skin` is the gap it keeps from obstacles (metres). */
  public createCharacterController(skin: number): RAPIER.KinematicCharacterController {
    if (!this.world) throw new Error('PhysicsWorld not initialized');
    return this.world.createCharacterController(skin);
  }

  public removeCharacterController(controller: RAPIER.KinematicCharacterController): void {
    this.world?.removeCharacterController(controller);
  }

  /** Moves colliders to their bodies' current positions now, instead of at the next step (after teleports). */
  public syncColliders(): void {
    this.world?.propagateModifiedBodyPositionsToColliders();
  }

  /** Colliders the camera passes through: fighters and invisible arena walls (only visible geometry blocks it). */
  private readonly cameraTransparent = new Set<number>();

  public setCameraTransparent(collider: RAPIER.Collider, transparent: boolean): void {
    if (transparent) this.cameraTransparent.add(collider.handle);
    else this.cameraTransparent.delete(collider.handle);
  }

  /**
   * Distance along `dir` (unit) from `origin` to the first camera-blocking surface within `maxDistance`,
   * or null if the way is clear.
   */
  public castCameraRay(origin: THREE.Vector3, dir: THREE.Vector3, maxDistance: number): number | null {
    if (!this.world || !this.RAPIER_INSTANCE) return null;
    const ray = new this.RAPIER_INSTANCE.Ray({ x: origin.x, y: origin.y, z: origin.z }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = this.world.castRay(ray, maxDistance, true, undefined, undefined, undefined, undefined,
      (c) => !this.cameraTransparent.has(c.handle));
    return hit ? hit.timeOfImpact : null;
  }

  /**
   * Cast a ray downward to detect ground height
   */
  public raycastGround(origin: THREE.Vector3, maxDistance = 4.0): number | null {
    if (!this.world || !this.RAPIER_INSTANCE) return null;

    const ray = new this.RAPIER_INSTANCE.Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: 0, y: -1, z: 0 }
    );

    const hit = this.world.castRay(ray, maxDistance, true);
    if (hit) {
      return origin.y - hit.timeOfImpact;
    }
    return null;
  }
}

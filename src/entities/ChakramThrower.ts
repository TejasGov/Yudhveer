import * as THREE from 'three';
import { Enemy } from './Enemy';
import { ProjectileManager } from '../combat/ProjectileManager';

export class ChakramThrower extends Enemy {
  private projectileManager: ProjectileManager;
  private throwCooldown = 3.2;
  private throwTimer = 0;

  constructor(id: string) {
    super(id, 0x9c4125);
    this.maxHealth = 70;
    this.currentHealth = 70;
    this.maxMarma = 65;
    this.moveSpeed = 4.5;
    this.projectileManager = ProjectileManager.getInstance();

    // Attach Chakram rings to hands
    const rSocket = this.getSocket('mixamorigRightHand');
    if (rSocket) {
      rSocket.remove(this.swordMesh);
      rSocket.add(this.createHandChakramMesh());
    }

    const lSocket = this.getSocket('mixamorigLeftHand');
    if (lSocket) {
      lSocket.remove(this.shieldMesh);
      lSocket.add(this.createHandChakramMesh());
    }
  }

  private createHandChakramMesh(): THREE.Group {
    const group = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(0.3, 0.04, 8, 20);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    group.add(ring);
    return group;
  }

  public override updateAI(dt: number, playerPos: THREE.Vector3): void {
    if (this.stateMachine.currentState === 'DEAD') {
      this.updateHUD();
      return;
    }

    const myPos = this.getPosition();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, myPos);
    toPlayer.y = 0;
    const distance = toPlayer.length();

    // Ranged AI loop: maintain 5-8 meters distance and throw Chakrams
    this.throwTimer += dt;

    if (distance > 0.1) {
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 8.0 * dt);
    }

    if (distance < 4.0) {
      // Retreat
      const step = toPlayer.clone().normalize().multiplyScalar(-3.5 * dt);
      this.group.position.add(step);
      if (this.rigidBody) {
        this.rigidBody.setTranslation({ x: this.group.position.x, y: this.group.position.y, z: this.group.position.z }, true);
      }
    } else if (distance > 8.0) {
      // Approach
      const step = toPlayer.clone().normalize().multiplyScalar(3.0 * dt);
      this.group.position.add(step);
      if (this.rigidBody) {
        this.rigidBody.setTranslation({ x: this.group.position.x, y: this.group.position.y, z: this.group.position.z }, true);
      }
    }

    // Throw Chakram
    if (this.throwTimer >= this.throwCooldown && this.stateMachine.currentState !== 'POSTURE_BROKEN' && this.stateMachine.currentState !== 'DEFLECTED') {
      this.throwTimer = 0;
      const throwOrigin = myPos.clone().add(new THREE.Vector3(0, 1.2, 0));
      this.projectileManager.spawnChakram(throwOrigin, playerPos, this.id);
    }

    this.updateProceduralAnimations(dt, 0.5);
    this.updateHUD();
  }
}

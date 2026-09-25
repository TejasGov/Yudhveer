import * as THREE from 'three';
import { Entity } from './Entity';
import { CharacterStateMachine, CharacterState } from './CharacterStateMachine';

export class Character extends Entity {
  public maxHealth = 100;
  public currentHealth = 100;

  // Marma (Vedic Posture / Stance meter)
  public maxMarma = 100;
  public currentMarma = 0;
  public marmaDecayRate = 12; // Decays per second when not taking posture damage
  public marmaDecayDelay = 1.8; // Delay before decay starts
  public timeSinceLastPostureHit = 0;

  public stateMachine: CharacterStateMachine;
  public moveSpeed = 5.5;
  public sprintSpeed = 9.0;
  public rotationSpeed = 12.0;

  // Visual Meshes for Greybox fallback
  public primitiveRoot: THREE.Group;
  public torsoMesh: THREE.Mesh;
  public headMesh: THREE.Mesh;
  public rightArm: THREE.Group;
  public leftArm: THREE.Group;
  public swordMesh: THREE.Group;
  public shieldMesh: THREE.Group;

  // Dodge direction vector
  public dodgeDirection = new THREE.Vector3(0, 0, 1);
  public dodgeSpeed = 11.5;

  constructor(id: string, color = 0xd4af37) {
    super(id);

    this.stateMachine = new CharacterStateMachine();
    this.primitiveRoot = new THREE.Group();
    this.modelGroup.add(this.primitiveRoot);

    // Build stylized greybox mesh hierarchy
    const capsuleMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.65
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      roughness: 0.5,
      metalness: 0.8
    });

    // Torso capsule
    const torsoGeo = new THREE.CapsuleGeometry(0.38, 0.75, 16, 32);
    this.torsoMesh = new THREE.Mesh(torsoGeo, capsuleMat);
    this.torsoMesh.position.y = 0.9;
    this.torsoMesh.castShadow = true;
    this.torsoMesh.receiveShadow = true;
    this.primitiveRoot.add(this.torsoMesh);

    // Head sphere with ancient warrior helmet crest
    const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
    this.headMesh = new THREE.Mesh(headGeo, darkMat);
    this.headMesh.position.y = 0.68;
    this.headMesh.castShadow = true;
    this.torsoMesh.add(this.headMesh);

    // Right Arm (Weapon Arm)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.45, 0.35, 0);
    this.torsoMesh.add(this.rightArm);

    // Left Arm (Dhal / Shield Arm)
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.45, 0.35, 0);
    this.torsoMesh.add(this.leftArm);

    // Sword (Khanda / Talwar inspired directional sword-box)
    this.swordMesh = this.createSwordMesh();
    this.swordMesh.position.set(0, -0.3, 0.2);
    this.swordMesh.rotation.set(-Math.PI * 0.4, 0, 0);

    // Dhal (Round Indian Buckler Shield)
    this.shieldMesh = this.createDhalShieldMesh();
    this.shieldMesh.position.set(0, -0.2, 0.25);
    this.shieldMesh.rotation.set(0, Math.PI * 0.5, 0);

    // Hook arms to sockets
    const rSocket = this.getSocket('mixamorigRightHand');
    if (rSocket) {
      this.rightArm.add(rSocket);
      rSocket.add(this.swordMesh);
    }

    const lSocket = this.getSocket('mixamorigLeftHand');
    if (lSocket) {
      this.leftArm.add(lSocket);
      lSocket.add(this.shieldMesh);
    }
  }

  private createSwordMesh(): THREE.Group {
    const swordGroup = new THREE.Group();

    // Steel Blade (Directional box)
    const bladeGeo = new THREE.BoxGeometry(0.08, 1.1, 0.02);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeff,
      metalness: 0.95,
      roughness: 0.15
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.6;
    blade.castShadow = true;
    swordGroup.add(blade);

    // Gold Guard & Crossbar
    const guardGeo = new THREE.BoxGeometry(0.24, 0.04, 0.06);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.25
    });
    const guard = new THREE.Mesh(guardGeo, goldMat);
    guard.position.y = 0.05;
    guard.castShadow = true;
    swordGroup.add(guard);

    // Grip Hilt
    const hiltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.22, 8);
    const hiltMat = new THREE.MeshStandardMaterial({ color: 0x4a180d, roughness: 0.8 });
    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
    hilt.position.y = -0.08;
    swordGroup.add(hilt);

    // Pommel
    const pommelGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const pommel = new THREE.Mesh(pommelGeo, goldMat);
    pommel.position.y = -0.2;
    swordGroup.add(pommel);

    return swordGroup;
  }

  private createDhalShieldMesh(): THREE.Group {
    const shieldGroup = new THREE.Group();

    // Outer Round Buckler Disk (Dhal)
    const shieldGeo = new THREE.CylinderGeometry(0.36, 0.38, 0.04, 24);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x1a2130,
      metalness: 0.7,
      roughness: 0.35
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.rotation.x = Math.PI / 2;
    shield.castShadow = true;
    shieldGroup.add(shield);

    // Ornate Golden Bosses (4 Vedic brass studs on Dhal)
    const bossGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const bossMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2
    });

    const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    angles.forEach((ang) => {
      const boss = new THREE.Mesh(bossGeo, bossMat);
      boss.position.set(Math.cos(ang) * 0.18, Math.sin(ang) * 0.18, 0.03);
      shieldGroup.add(boss);
    });

    return shieldGroup;
  }

  public takeDamage(amount: number): void {
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    if (this.currentHealth <= 0) {
      this.stateMachine.changeState('DEAD');
    }
  }

  public addMarmaDamage(amount: number): boolean {
    this.timeSinceLastPostureHit = 0;
    this.currentMarma = Math.min(this.maxMarma, this.currentMarma + amount);

    if (this.currentMarma >= this.maxMarma) {
      this.currentMarma = this.maxMarma;
      this.stateMachine.changeState('POSTURE_BROKEN');
      return true; // Posture broken!
    }
    return false;
  }

  /**
   * Procedural animation updates for greybox limbs based on state machine
   */
  public updateProceduralAnimations(dt: number, moveMagnitude: number): void {
    const state = this.stateMachine.currentState;
    const t = this.stateMachine.stateTime;

    // Reset base orientations
    let targetRightArmRot = new THREE.Euler(0, 0, 0);
    let targetLeftArmRot = new THREE.Euler(0, 0, 0);
    let targetTorsoRot = new THREE.Euler(0, 0, 0);
    let targetTorsoY = 0.9;

    const runCycle = Math.sin(performance.now() * 0.012);

    if (state === 'IDLE') {
      const breath = Math.sin(performance.now() * 0.003) * 0.04;
      targetTorsoY = 0.9 + breath;
      targetRightArmRot.set(0.2 + breath, -0.2, 0.1);
      targetLeftArmRot.set(0.4, 0.3, -0.2);
    } else if (state === 'MOVE' || state === 'SPRINT') {
      const mult = state === 'SPRINT' ? 1.6 : 1.0;
      targetTorsoY = 0.9 + Math.abs(runCycle) * 0.08 * mult;
      targetRightArmRot.set(-runCycle * 0.6 * mult, 0, 0.1);
      targetLeftArmRot.set(runCycle * 0.6 * mult + 0.3, 0.2, -0.2);
      targetTorsoRot.x = 0.15 * mult;
    } else if (state === 'ATTACK_1') {
      // Horizontal Slash
      const p = Math.min(1.0, t / this.stateMachine.ATTACK_1_DURATION);
      const swing = Math.sin(p * Math.PI);
      targetTorsoRot.y = (0.5 - p) * 1.6;
      targetRightArmRot.set(-0.6 + swing * 1.5, 0.8 - p * 1.6, -swing * 0.4);
    } else if (state === 'ATTACK_2') {
      // Diagonal Overhead Cleave
      const p = Math.min(1.0, t / this.stateMachine.ATTACK_2_DURATION);
      const swing = Math.sin(p * Math.PI);
      targetTorsoRot.x = swing * 0.3;
      targetRightArmRot.set(1.4 - p * 2.6, -0.2, 0.3);
    } else if (state === 'ATTACK_3') {
      // Heavy 360 Spin Finisher
      const p = Math.min(1.0, t / this.stateMachine.ATTACK_3_DURATION);
      targetTorsoRot.y = p * Math.PI * 2;
      targetRightArmRot.set(-0.2, 1.2, 0.5);
    } else if (state === 'PARRY') {
      // Raise Dhal in defensive deflection posture
      const p = Math.min(1.0, t / this.stateMachine.PARRY_TOTAL_DURATION);
      targetLeftArmRot.set(1.1, 0.6, -0.3);
      targetRightArmRot.set(-0.4, -0.4, 0.2);
      targetTorsoRot.y = 0.35;
    } else if (state === 'DODGE_ROLL') {
      // Acrobatic forward roll
      const p = Math.min(1.0, t / this.stateMachine.DODGE_DURATION);
      targetTorsoRot.x = p * Math.PI * 2;
      targetTorsoY = 0.4 + Math.sin(p * Math.PI) * 0.4;
      targetRightArmRot.set(-1.0, 0, 0);
      targetLeftArmRot.set(-1.0, 0, 0);
    } else if (state === 'DEFLECTED' || state === 'STAGGER') {
      const p = Math.min(1.0, t / this.stateMachine.STAGGER_DURATION);
      targetTorsoRot.x = -0.4 * (1 - p);
      targetRightArmRot.set(-0.8 * (1 - p), 0.4, 0);
    } else if (state === 'POSTURE_BROKEN') {
      // Kneeling / dizzy
      targetTorsoY = 0.55;
      targetTorsoRot.x = 0.45;
      targetRightArmRot.set(0.1, 0, 0);
      targetLeftArmRot.set(0.1, 0, 0);
    }

    // Interpolate visual limb rotations smoothly
    const lerpSpeed = 1.0 - Math.exp(-22 * dt);
    this.torsoMesh.position.y = THREE.MathUtils.lerp(this.torsoMesh.position.y, targetTorsoY, lerpSpeed);
    this.torsoMesh.rotation.x = THREE.MathUtils.lerp(this.torsoMesh.rotation.x, targetTorsoRot.x, lerpSpeed);
    this.torsoMesh.rotation.y = THREE.MathUtils.lerp(this.torsoMesh.rotation.y, targetTorsoRot.y, lerpSpeed);
    this.torsoMesh.rotation.z = THREE.MathUtils.lerp(this.torsoMesh.rotation.z, targetTorsoRot.z, lerpSpeed);

    this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, targetRightArmRot.x, lerpSpeed);
    this.rightArm.rotation.y = THREE.MathUtils.lerp(this.rightArm.rotation.y, targetRightArmRot.y, lerpSpeed);
    this.rightArm.rotation.z = THREE.MathUtils.lerp(this.rightArm.rotation.z, targetRightArmRot.z, lerpSpeed);

    this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, targetLeftArmRot.x, lerpSpeed);
    this.leftArm.rotation.y = THREE.MathUtils.lerp(this.leftArm.rotation.y, targetLeftArmRot.y, lerpSpeed);
    this.leftArm.rotation.z = THREE.MathUtils.lerp(this.leftArm.rotation.z, targetLeftArmRot.z, lerpSpeed);
  }

  public override update(dt: number): void {
    super.update(dt);
    this.stateMachine.update(dt);

    // Marma posture natural decay
    this.timeSinceLastPostureHit += dt;
    if (this.timeSinceLastPostureHit > this.marmaDecayDelay && this.stateMachine.currentState !== 'POSTURE_BROKEN') {
      this.currentMarma = Math.max(0, this.currentMarma - this.marmaDecayRate * dt);
    }

    if (this.stateMachine.currentState === 'POSTURE_BROKEN' && this.stateMachine.stateTime >= this.stateMachine.POSTURE_BROKEN_DURATION) {
      this.currentMarma = 0; // Reset posture on recovery
    }
  }
}

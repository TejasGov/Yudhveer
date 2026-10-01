import * as THREE from 'three';
import { Enemy } from './Enemy';
import { SoundFX } from '../combat/SoundFX';
import { ParticleFX } from '../combat/ParticleFX';

export class BossBaoli extends Enemy {
  private soundFXMgr: SoundFX;
  private particleFXMgr: ParticleFX;
  private weaponAuraMat: THREE.MeshStandardMaterial | null = null;
  private attackChoice = 1;

  constructor(id = 'baoli_guardian') {
    super(id, 0x2a3342); // Dark Moonlit Stone & Ancient Bronze

    this.maxHealth = 220;
    this.currentHealth = 220;
    this.maxMarma = 140;
    this.moveSpeed = 3.8;
    this.marmaDecayRate = 9;

    this.soundFXMgr = SoundFX.getInstance();
    this.particleFXMgr = ParticleFX.getInstance();

    // Scale up slightly for formidable boss presence
    this.torsoMesh.scale.set(1.2, 1.2, 1.2);

    // Equip Ancient Vedic Gada / Heavy War Mace
    this.equipVedicGada();
  }

  private equipVedicGada(): void {
    const rSocket = this.getSocket('mixamorigRightHand');
    const gadaGroup = new THREE.Group();

    // Reinforced Dark Bronze Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.045, 1.4, 12);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x3d2b1f,
      metalness: 0.6,
      roughness: 0.5,
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 0.6;
    shaft.castShadow = true;
    gadaGroup.add(shaft);

    // Heavy Fluted Mace Head (Gada bulb)
    const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
    this.weaponAuraMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.25,
      emissive: 0x221100,
      emissiveIntensity: 0.5,
    });
    const head = new THREE.Mesh(headGeo, this.weaponAuraMat);
    head.position.y = 1.35;
    head.scale.set(1.1, 1.3, 1.1);
    head.castShadow = true;
    gadaGroup.add(head);

    // Spiked Crown Rings on Mace Head
    const ringGeo = new THREE.TorusGeometry(0.23, 0.04, 8, 16);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.2 });
    const ring1 = new THREE.Mesh(ringGeo, goldMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 1.35;
    gadaGroup.add(ring1);

    // Heavy Pommel
    const pommelGeo = new THREE.SphereGeometry(0.065, 10, 10);
    const pommel = new THREE.Mesh(pommelGeo, goldMat);
    pommel.position.y = -0.1;
    gadaGroup.add(pommel);

    gadaGroup.position.set(0, -0.3, 0.2);
    gadaGroup.rotation.set(-Math.PI * 0.38, 0, 0);

    this.swordMesh = gadaGroup;
    if (rSocket) {
      rSocket.remove(this.swordMesh);
      rSocket.add(gadaGroup);
    }
  }

  public override updateAI(dt: number, playerPos: THREE.Vector3): void {
    const currentState = this.stateMachine.currentState;

    if (currentState === 'DEAD') {
      this.updateHUD();
      return;
    }

    if (currentState === 'POSTURE_BROKEN' || currentState === 'DEFLECTED' || currentState === 'STAGGER') {
      this.updateProceduralAnimations(dt, 0);
      this.updateHUD();
      return;
    }

    const myPos = this.getPosition();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, myPos);
    toPlayer.y = 0;
    const distance = toPlayer.length();

    // Rotate to face player smoothly
    if (distance > 0.1) {
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 8.0 * dt);
    }

    // Dynamic Attack Cycling
    if (currentState.startsWith('ATTACK')) {
      if (!this.rigDrivesMotion(currentState)) {
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
        this.group.position.addScaledVector(forward, 2.2 * dt);
      }
      this.updateProceduralAnimations(dt, 0);
      this.updateHUD();
      return;
    }

    // Approach / Spacing Phase
    if (distance > 3.2) {
      const step = toPlayer.clone().normalize().multiplyScalar(this.moveSpeed * dt);
      this.group.position.add(step);
      if (currentState !== 'MOVE') this.stateMachine.changeState('MOVE');
      this.updateProceduralAnimations(dt, 1.0);
    } else if (distance < 1.3) {
      const step = toPlayer.clone().normalize().multiplyScalar(-1.8 * dt);
      this.group.position.add(step);
      if (currentState !== 'MOVE') this.stateMachine.changeState('MOVE');
      this.updateProceduralAnimations(dt, 0.5);
    } else {
      if (currentState !== 'IDLE') this.stateMachine.changeState('IDLE');
      this.updateProceduralAnimations(dt, 0);

      // Trigger chosen attack combo (1: club combo, 2: mace combo, 3: spin mace)
      if (this.stateMachine.stateTime >= 1.6) {
        this.attackChoice = (this.attackChoice % 3) + 1;
        const nextAttack = this.attackChoice === 1 ? 'ATTACK_1' : this.attackChoice === 2 ? 'ATTACK_2' : 'ATTACK_3';
        this.soundFXMgr.playSwordSwing(0.75);
        this.particleFXMgr.spawnDeflectionShockwave(this.getPosition().clone().add(new THREE.Vector3(0, 0.5, 0)));
        this.stateMachine.changeState(nextAttack);
      }
    }

    this.updateHUD();
  }

  public override updateHUD(): void {
    super.updateHUD();
    const targetName = document.getElementById('target-name');
    if (targetName) {
      targetName.textContent = 'BAOLI GUARDIAN • ASURA COMMANDER';
      targetName.className = 'text-amber-300 font-serif uppercase tracking-[0.18em] font-bold';
    }
  }
}

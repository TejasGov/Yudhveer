import * as THREE from 'three';
import { Character } from './Character';
import { SoundFX } from '../combat/SoundFX';
import { ParticleFX } from '../combat/ParticleFX';

export class Enemy extends Character {
  private soundFX: SoundFX;
  private particleFX: ParticleFX;

  // AI Combat loop timers
  private aiTimer = 0;
  private attackCooldown = 2.4;
  private isTelegraphing = false;
  private telegraphDuration = 0.6;
  private telegraphTimer = 0;

  // Visual cues for telegraphing
  private bladeMaterial: THREE.MeshStandardMaterial | null = null;
  private defaultBladeColor = new THREE.Color(0xee6666);
  private telegraphGlowColor = new THREE.Color(0xff0000);

  constructor(id = 'dummy_gladiator', color = 0x8b1e1e) {
    super(id, color); // Crimson / Iron Asura by default

    this.soundFX = SoundFX.getInstance();
    this.particleFX = ParticleFX.getInstance();

    // Re-color blade for enemy
    this.swordMesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && child.name !== 'mixamorigRightHand') {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && mat.color.getHex() === 0xeeeeff) {
          this.bladeMaterial = mat.clone();
          this.bladeMaterial.color.copy(this.defaultBladeColor);
          this.bladeMaterial.emissive = new THREE.Color(0x000000);
          (child as THREE.Mesh).material = this.bladeMaterial;
        }
      }
    });

    this.stateMachine.onStateChanged = (newState) => {
      if (newState === 'ATTACK_1') {
        this.soundFX.playSwordSwing(0.8);
      }
    };
  }

  public updateAI(dt: number, playerPos: THREE.Vector3): void {
    const currentState = this.stateMachine.currentState;

    if (currentState === 'DEAD') {
      this.updateHUD();
      return;
    }

    if (currentState === 'POSTURE_BROKEN' || currentState === 'DEFLECTED' || currentState === 'STAGGER') {
      this.isTelegraphing = false;
      if (this.bladeMaterial) {
        this.bladeMaterial.emissive.setHex(0x000000);
      }
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
      let diff = targetAngle - this.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1.0, 8.0 * dt);
    }

    // 1. Telegraph Phase
    if (this.isTelegraphing) {
      this.telegraphTimer += dt;
      const glow = Math.sin((this.telegraphTimer / this.telegraphDuration) * Math.PI) * 1.5;
      if (this.bladeMaterial) {
        this.bladeMaterial.emissive.copy(this.telegraphGlowColor).multiplyScalar(glow);
      }

      // Telegraph stance: raise right arm back
      this.rightArm.rotation.set(-1.2, 0.4, -0.4);
      this.torsoMesh.rotation.y = 0.5;

      if (this.telegraphTimer >= this.telegraphDuration) {
        this.isTelegraphing = false;
        this.telegraphTimer = 0;
        if (this.bladeMaterial) {
          this.bladeMaterial.emissive.setHex(0x000000);
        }
        // Unleash strike!
        this.stateMachine.changeState('ATTACK_1');
      }

      this.updateHUD();
      return;
    }

    // 2. Attack Execution Phase
    if (currentState === 'ATTACK_1') {
      // Forward swing step
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
      this.group.position.addScaledVector(forward, 2.0 * dt);
      if (this.rigidBody) {
        this.rigidBody.setTranslation(
          { x: this.group.position.x, y: this.group.position.y, z: this.group.position.z },
          true
        );
      }
      this.updateProceduralAnimations(dt, 0);
      this.updateHUD();
      return;
    }

    // 3. Spacing / Approach Loop
    this.aiTimer += dt;
    let moveMagnitude = 0;

    if (distance > 2.6) {
      // Move closer to combat engagement range
      const step = toPlayer.clone().normalize().multiplyScalar(3.2 * dt);
      this.group.position.add(step);
      if (this.rigidBody) {
        this.rigidBody.setTranslation(
          { x: this.group.position.x, y: this.group.position.y, z: this.group.position.z },
          true
        );
      }
      if (currentState !== 'MOVE') this.stateMachine.changeState('MOVE');
      moveMagnitude = 1.0;
    } else if (distance < 1.4) {
      // Back up slightly if too close
      const step = toPlayer.clone().normalize().multiplyScalar(-2.0 * dt);
      this.group.position.add(step);
      if (this.rigidBody) {
        this.rigidBody.setTranslation(
          { x: this.group.position.x, y: this.group.position.y, z: this.group.position.z },
          true
        );
      }
      if (currentState !== 'MOVE') this.stateMachine.changeState('MOVE');
      moveMagnitude = 0.5;
    } else {
      // In strike range -> Circle or prepare attack
      if (currentState !== 'IDLE') this.stateMachine.changeState('IDLE');

      if (this.aiTimer >= this.attackCooldown) {
        this.aiTimer = 0;
        this.isTelegraphing = true;
        this.telegraphTimer = 0;
        this.soundFX.playTelegraphSound();
      }
    }

    this.updateProceduralAnimations(dt, moveMagnitude);
    this.updateHUD();
  }

  public updateHUD(): void {
    const hpBar = document.getElementById('target-health-bar');
    const hpNum = document.getElementById('target-hp-num');
    const marmaBar = document.getElementById('target-marma-bar');
    const marmaStatus = document.getElementById('target-marma-status');
    const marmaPrompt = document.getElementById('marma-prompt');
    const targetName = document.getElementById('target-name');

    const hpPercent = Math.max(0, (this.currentHealth / this.maxHealth) * 100);
    if (hpBar) hpBar.style.width = `${hpPercent}%`;
    if (hpNum) hpNum.textContent = `${Math.ceil(hpPercent)}%`;

    const marmaPercent = Math.min(100, (this.currentMarma / this.maxMarma) * 100);
    if (marmaBar) {
      marmaBar.style.width = `${marmaPercent}%`;
      if (this.stateMachine.currentState === 'POSTURE_BROKEN') {
        marmaBar.className = 'h-full bg-red-500 animate-pulse transition-all duration-75';
      } else {
        marmaBar.className = 'h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-75';
      }
    }

    if (marmaStatus) {
      if (this.stateMachine.currentState === 'POSTURE_BROKEN') {
        marmaStatus.textContent = 'SHATTERED';
        marmaStatus.className = 'text-[9px] text-red-400 font-bold animate-pulse font-mono';
      } else {
        marmaStatus.textContent = `${Math.ceil(marmaPercent)}%`;
        marmaStatus.className = 'text-[9px] font-mono text-amber-300';
      }
    }

    // Toggle Sanskrit Marma Deathblow Execution Prompt
    if (marmaPrompt) {
      if (this.stateMachine.currentState === 'POSTURE_BROKEN') {
        marmaPrompt.classList.remove('hidden');
        marmaPrompt.classList.add('flex');
      } else {
        marmaPrompt.classList.remove('flex');
        marmaPrompt.classList.add('hidden');
      }
    }

    if (targetName && targetName.textContent === 'MERCENARY SENTINEL' && this.id !== 'dummy_gladiator') {
      targetName.textContent = this.id.replace(/_/g, ' ').toUpperCase();
    }
  }

  public resetStats(): void {
    this.currentHealth = this.maxHealth;
    this.currentMarma = 0;
    this.stateMachine.changeState('IDLE');
    this.isTelegraphing = false;
    this.aiTimer = 0;
  }
}

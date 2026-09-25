import * as THREE from 'three';
import { Enemy } from './Enemy';
import { SoundFX } from '../combat/SoundFX';
import { ParticleFX } from '../combat/ParticleFX';
import { ProjectileManager } from '../combat/ProjectileManager';

export class BossMahayodha extends Enemy {
  public phase = 1;
  public isEnraged = false;
  private flameBladeMat: THREE.MeshStandardMaterial | null = null;
  private projectileMgr: ProjectileManager;
  private soundFXMgr: SoundFX;
  private particleFXMgr: ParticleFX;

  // Boss attack sequence
  private specialAttackTimer = 0;
  private specialCooldown = 4.5;
  private leapTimer = 0;
  private isLeaping = false;

  constructor(id = 'boss_mahayodha') {
    super(id, 0x181820); // Dark obsidian plate with crimson & gold accents

    this.maxHealth = 260;
    this.currentHealth = 260;
    this.maxMarma = 160;
    this.moveSpeed = 4.2;
    this.marmaDecayRate = 8;

    this.projectileMgr = ProjectileManager.getInstance();
    this.soundFXMgr = SoundFX.getInstance();
    this.particleFXMgr = ParticleFX.getInstance();

    // Scale up boss model for colossal presence
    this.torsoMesh.scale.set(1.35, 1.35, 1.35);

    // Equip Grandmaster's Great Khanda
    this.equipGrandKhanda();
  }

  private equipGrandKhanda(): void {
    const rSocket = this.getSocket('mixamorigRightHand');
    if (rSocket) {
      rSocket.remove(this.swordMesh);
      const greatSword = new THREE.Group();

      // Broad Heavy Steel Blade with serrated Vedic edge
      const bladeGeo = new THREE.BoxGeometry(0.14, 1.6, 0.03);
      this.flameBladeMat = new THREE.MeshStandardMaterial({
        color: 0x222226,
        emissive: 0x000000,
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.2
      });
      const blade = new THREE.Mesh(bladeGeo, this.flameBladeMat);
      blade.position.y = 0.85;
      blade.castShadow = true;
      greatSword.add(blade);

      // Gold Guard
      const guardGeo = new THREE.BoxGeometry(0.35, 0.06, 0.1);
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 });
      const guard = new THREE.Mesh(guardGeo, goldMat);
      guard.position.y = 0.08;
      greatSword.add(guard);

      greatSword.position.set(0, -0.35, 0.2);
      greatSword.rotation.set(-Math.PI * 0.35, 0, 0);

      this.swordMesh = greatSword;
      rSocket.add(greatSword);
    }
  }

  public override takeDamage(amount: number): void {
    super.takeDamage(amount);

    // Trigger Phase 2 Agni Awaken at 50% HP
    if (this.phase === 1 && this.currentHealth <= this.maxHealth * 0.5) {
      this.triggerPhase2();
    }
  }

  public triggerPhase2(): void {
    if (this.phase === 2) return;
    this.phase = 2;
    this.isEnraged = true;
    this.moveSpeed = 6.0;

    // Ignite Khanda blade
    if (this.flameBladeMat) {
      this.flameBladeMat.color.setHex(0xff3300);
      this.flameBladeMat.emissive.setHex(0xff2200);
      this.flameBladeMat.emissiveIntensity = 2.0;
    }

    // Phase transition audio & VFX
    this.soundFXMgr.playBossPhaseTransition();
    this.particleFXMgr.spawnDeflectionShockwave(this.getPosition(), undefined, true);
    this.particleFXMgr.spawnFlames(this.getPosition(), 60, 2.0);

    // Update Boss UI Banner
    const subtitle = document.getElementById('level-subtitle');
    if (subtitle) {
      subtitle.textContent = '🔥 PHASE II: AGNI ENRAGE - GRANDMASTER AWAKENED';
      subtitle.className = 'text-xs text-orange-400 font-bold uppercase tracking-widest animate-pulse';
    }
  }

  public override updateAI(dt: number, playerPos: THREE.Vector3): void {
    if (this.stateMachine.currentState === 'DEAD') {
      this.updateHUD();
      return;
    }

    // In Phase 2, constantly emit flame particles from blade
    if (this.phase === 2) {
      const { tip } = this.getSocketWorldPosition();
      this.particleFXMgr.spawnFlames(tip, 3, 0.2);
    }

    if (this.stateMachine.currentState === 'POSTURE_BROKEN' || this.stateMachine.currentState === 'DEFLECTED' || this.stateMachine.currentState === 'STAGGER') {
      this.updateProceduralAnimations(dt, 0);
      this.updateHUD();
      return;
    }

    const myPos = this.getPosition();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, myPos);
    toPlayer.y = 0;
    const distance = toPlayer.length();

    // Rotate to face player
    if (distance > 0.1) {
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, 9.0 * dt);
    }

    // Special Attack / Flame Wave in Phase 2
    this.specialAttackTimer += dt;
    if (this.phase === 2 && this.specialAttackTimer >= this.specialCooldown && distance > 3.0) {
      this.specialAttackTimer = 0;
      // Unleash ground Flame Wave!
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
      this.projectileMgr.spawnFlameWave(myPos.clone().add(new THREE.Vector3(0, 0.2, 0)), forward, this.id);
      this.stateMachine.changeState('ATTACK_2');
      this.updateProceduralAnimations(dt, 0);
      this.updateHUD();
      return;
    }

    // Regular melee combat logic
    super.updateAI(dt, playerPos);
  }

  private getSocketWorldPosition(): { tip: THREE.Vector3 } {
    const tip = new THREE.Vector3();
    const rSocket = this.getSocket('mixamorigRightHand');
    if (rSocket) {
      rSocket.getWorldPosition(tip);
      tip.y += 0.8;
    } else {
      tip.copy(this.getPosition()).add(new THREE.Vector3(0, 1.2, 0));
    }
    return { tip };
  }

  public override updateHUD(): void {
    super.updateHUD();
    const targetName = document.getElementById('target-name');
    if (targetName) {
      if (this.phase === 2) {
        targetName.textContent = '🔥 GRANDMASTER MAHAYODHA (AGNI PHASE)';
        targetName.className = 'text-orange-400 font-serif uppercase tracking-[0.2em] font-extrabold';
      } else {
        targetName.textContent = 'GRANDMASTER MAHAYODHA';
        targetName.className = 'text-amber-200 font-serif uppercase tracking-[0.2em] font-bold';
      }
    }
  }
}

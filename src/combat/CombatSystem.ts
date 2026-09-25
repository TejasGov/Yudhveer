import * as THREE from 'three';
import gsap from 'gsap';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { HitboxManager } from './HitboxManager';
import { ParticleFX } from './ParticleFX';
import { SoundFX } from './SoundFX';
import { SceneManager } from '../core/SceneManager';

export class CombatSystem {
  private static instance: CombatSystem | null = null;
  private hitboxManager: HitboxManager;
  private particleFX: ParticleFX;
  private soundFX: SoundFX;
  private sceneManager: SceneManager;

  // Attack hit registration debounce tracking
  private playerHitRegistered = false;
  private enemyHitMap: Map<string, boolean> = new Map();

  // Combo count
  public currentCombo = 0;
  private comboResetTimer: number | null = null;

  // Hit-Stop global timescale modifier controlled by GSAP
  public globalTimeScale = 1.0;

  private constructor() {
    this.hitboxManager = HitboxManager.getInstance();
    this.particleFX = ParticleFX.getInstance();
    this.soundFX = SoundFX.getInstance();
    this.sceneManager = SceneManager.getInstance();
  }

  public static getInstance(): CombatSystem {
    if (!CombatSystem.instance) {
      CombatSystem.instance = new CombatSystem();
    }
    return CombatSystem.instance;
  }

  public update(player: Player, enemies: Enemy[]): void {
    const playerState = player.stateMachine.currentState;

    // Reset player hit flag when leaving attack
    if (!playerState.startsWith('ATTACK')) {
      this.playerHitRegistered = false;
    }

    enemies.forEach((enemy) => {
      if (enemy.stateMachine.currentState === 'DEAD') return;

      const enemyState = enemy.stateMachine.currentState;
      if (enemyState !== 'ATTACK_1' && enemyState !== 'ATTACK_2') {
        this.enemyHitMap.set(enemy.id, false);
      }

      // 1. Process Player attacking this Enemy
      if (playerState.startsWith('ATTACK') && !this.playerHitRegistered) {
        const progress = player.stateMachine.stateTime;
        if (progress >= 0.12 && progress <= 0.48) {
          const { hit, hitPoint } = this.hitboxManager.checkWeaponIntersection(player, enemy, 0.9);
          if (hit) {
            this.playerHitRegistered = true;
            this.resolvePlayerHitOnEnemy(player, enemy, hitPoint, playerState);
          }
        }
      }

      // 2. Process this Enemy attacking Player
      if ((enemyState === 'ATTACK_1' || enemyState === 'ATTACK_2') && !this.enemyHitMap.get(enemy.id)) {
        const progress = enemy.stateMachine.stateTime;
        if (progress >= 0.12 && progress <= 0.45) {
          const { hit, hitPoint } = this.hitboxManager.checkWeaponIntersection(enemy, player, 0.85);
          if (hit) {
            this.enemyHitMap.set(enemy.id, true);
            this.resolveEnemyHitOnPlayer(enemy, player, hitPoint);
          }
        }
      }
    });
  }

  private resolvePlayerHitOnEnemy(
    player: Player,
    enemy: Enemy,
    hitPoint: THREE.Vector3,
    attackState: string
  ): void {
    let damage = 22;
    let postureDmg = 25;

    if (attackState === 'ATTACK_2') {
      damage = 30;
      postureDmg = 32;
    } else if (attackState === 'ATTACK_3') {
      damage = 48;
      postureDmg = 50;
    }

    if (enemy.stateMachine.currentState === 'POSTURE_BROKEN') {
      damage *= 2.2;
    }

    enemy.takeDamage(damage);
    const broken = enemy.addMarmaDamage(postureDmg);

    this.soundFX.playHitImpact();
    this.particleFX.spawnSparks(hitPoint, 25, false);
    this.sceneManager.triggerScreenShake(0.2, 0.16);
    this.triggerHitStop(0.08, 0.08);

    if (broken) {
      this.soundFX.playPostureBreak();
      this.showCombatBanner('MARMA BROKEN!', 'CRITICAL OPENING!', 'text-red-400 crimson-glow');
    } else if (enemy.stateMachine.currentState !== 'POSTURE_BROKEN') {
      enemy.stateMachine.changeState('STAGGER');
    }

    this.incrementCombo();
  }

  private resolveEnemyHitOnPlayer(enemy: Enemy, player: Player, hitPoint: THREE.Vector3): void {
    if (player.stateMachine.isInvulnerable) {
      return;
    }

    // 140ms Dhal Parry Window -> DEFLECTION!
    if (player.stateMachine.currentState === 'PARRY' && player.stateMachine.isParryActive) {
      this.handlePerfectParry(player, enemy, hitPoint);
      return;
    }

    player.takeDamage(16);
    player.addMarmaDamage(18);

    this.soundFX.playHitImpact();
    this.particleFX.spawnSparks(hitPoint, 30, false);
    this.sceneManager.triggerScreenShake(0.35, 0.22);
    player.stateMachine.changeState('STAGGER');

    this.resetCombo();
  }

  private handlePerfectParry(player: Player, enemy: Enemy, hitPoint: THREE.Vector3): void {
    this.soundFX.playParryClash();
    this.particleFX.spawnSparks(hitPoint, 55, true);
    this.particleFX.spawnDeflectionShockwave(hitPoint);
    this.triggerHitStop(0.05, 0.14);
    this.sceneManager.triggerScreenShake(0.42, 0.28);

    const postureBroken = enemy.addMarmaDamage(50);
    if (postureBroken) {
      this.soundFX.playPostureBreak();
      this.showCombatBanner('DEFLECTION!', 'ENEMY MARMA SHATTERED', 'text-yellow-300 gold-glow');
    } else {
      enemy.stateMachine.changeState('DEFLECTED');
      this.showCombatBanner('PERFECT PARRY!', '140ms DEFLECTION', 'text-yellow-300 gold-glow');
    }

    this.incrementCombo();
  }

  public triggerHitStop(targetTimeScale = 0.05, duration = 0.12): void {
    gsap.killTweensOf(this);
    this.globalTimeScale = targetTimeScale;

    gsap.to(this, {
      globalTimeScale: 1.0,
      duration,
      ease: 'power3.out',
      delay: duration * 0.5
    });
  }

  private incrementCombo(): void {
    this.currentCombo++;
    const comboDisplay = document.getElementById('combo-display');
    const comboCount = document.getElementById('combo-count');

    if (comboDisplay && comboCount) {
      comboCount.textContent = this.currentCombo.toString();
      comboDisplay.style.opacity = '1';
      comboDisplay.className = 'hud-font text-2xl text-amber-400 font-bold mt-2 opacity-100 scale-110 transition-transform';
      setTimeout(() => {
        if (comboDisplay) comboDisplay.className = 'hud-font text-2xl text-amber-400 font-bold mt-2 opacity-100 scale-100 transition-transform';
      }, 100);
    }

    if (this.comboResetTimer) {
      window.clearTimeout(this.comboResetTimer);
    }
    this.comboResetTimer = window.setTimeout(() => {
      this.resetCombo();
    }, 2500);
  }

  private resetCombo(): void {
    this.currentCombo = 0;
    const comboDisplay = document.getElementById('combo-display');
    if (comboDisplay) {
      comboDisplay.style.opacity = '0';
    }
  }

  public showCombatBanner(title: string, sub: string, styleClass: string): void {
    const banner = document.getElementById('parry-banner');
    const subtitle = document.getElementById('parry-sub');

    if (banner && subtitle) {
      banner.textContent = title;
      banner.className = `hud-font text-4xl md:text-5xl font-extrabold scale-100 transition-transform duration-150 uppercase tracking-widest ${styleClass}`;
      subtitle.textContent = sub;
      subtitle.className = 'text-xs uppercase tracking-widest text-amber-200 mt-1 font-semibold scale-100 transition-transform duration-150';

      setTimeout(() => {
        if (banner) banner.className = 'hud-font text-4xl md:text-5xl font-extrabold scale-0 transition-transform duration-200 uppercase tracking-widest';
        if (subtitle) subtitle.className = 'text-xs uppercase tracking-widest text-amber-200 mt-1 font-semibold scale-0 transition-transform duration-200';
      }, 1200);
    }
  }
}

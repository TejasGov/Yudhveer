import * as THREE from 'three';
import { Boss } from './Boss';
import type { CharacterState } from './CharacterStateMachine';
import { ProjectileManager } from '../combat/ProjectileManager';
import { SceneManager } from '../core/SceneManager';

/** Below this share of health he enters his second phase. */
const PHASE_2_AT = 0.5;
/** Seconds between flame waves in phase two, breathed at anyone further off than `WAVE_MIN_RANGE`. */
const WAVE_COOLDOWN = 4.5;
const WAVE_MIN_RANGE = 3.2;

/**
 * Chapter III final boss, Takshaka, king of the nagas. He rises to Dwarka's arena once Shalva has fallen. Phase one is
 * claws and a leap; below half health he roars, embers rise off him, he presses faster and breathes fire along the
 * ground at anyone who keeps their distance.
 */
export class BossTakshaka extends Boss {
  public phase = 1;
  private waveTimer = 0;
  private projectiles = ProjectileManager.getInstance();

  constructor(id = 'takshaka') {
    super(id, 0x1c2418, {
      attackInterval: 1.4,
      strikeRange: 3.0,
      tooClose: 1.4,
      leapRange: 6,
      leapMax: 11,
      roarRange: 16,
    });
    this.displayName = 'Takshaka';
    this.epithet = 'King of the nagas';
    this.maxHealth = 460;
    this.currentHealth = 460;
    this.maxMarma = 170;
    this.moveSpeed = 4.2;
    this.marmaDecayRate = 8;
    this.turnRate = 4.5;
    this.lungeSpec = { a: 0.05, b: 0.45, maxDist: 1.5, stopDist: 1.7 };
    this.torsoMesh.scale.setScalar(1.3);
    // Claws, not a blade: the strike segment hangs off his hand, nothing drawn.
    const socket = this.getSocket('mixamorigRightHand');
    socket?.remove(this.swordMesh);
    this.swordMesh = new THREE.Group();
    socket?.add(this.swordMesh);
    this.shieldMesh.visible = false;
  }

  public override takeDamage(amount: number): void {
    super.takeDamage(amount);
    if (this.phase === 1 && this.currentHealth > 0 && this.currentHealth <= this.maxHealth * PHASE_2_AT) this.enterPhase2();
  }

  /** He roars (CHARGE), fire bursts around him, and he fights faster. */
  private enterPhase2(): void {
    this.phase = 2;
    this.tuning = { ...this.tuning, attackInterval: 0.95 };
    this.turnRate = 5.5;
    this.soundFX.playBossPhaseTransition();
    this.particleFX.spawnDeflectionShockwave(this.getPosition(), undefined, true);
    this.particleFX.spawnFlames(this.getPosition(), 60, 2.0);
    SceneManager.getInstance().triggerScreenShake(0.35, 0.4);
    if (this.hasClip('CHARGE') && this.stateMachine.currentState !== 'POSTURE_BROKEN') this.stateMachine.changeState('CHARGE');
  }

  protected override onRoar(): void {
    this.soundFX.playRoar(0.75);
    this.particleFX.spawnDustPuff(this.getPosition(), 24);
  }

  protected override specialAction(dt: number, distance: number): boolean {
    if (this.phase !== 2) return false;
    this.waveTimer += dt;
    if (this.waveTimer < WAVE_COOLDOWN || distance <= WAVE_MIN_RANGE) return false;
    this.waveTimer = 0;
    this.stateMachine.changeState('CAST');
    return true;
  }

  protected override onStateChange(state: CharacterState, previous: CharacterState): void {
    super.onStateChange(state, previous);
    if (state !== 'CAST') return;
    // Fire breathed along the ground in front of him.
    const forward = new THREE.Vector3(Math.sin(this.group.rotation.y), 0, Math.cos(this.group.rotation.y));
    this.projectiles.spawnFlameWave(this.getPosition().clone().addScaledVector(forward, 0.9).setY(this.getPosition().y + 0.2), forward, this.id);
  }

  public override updateAI(dt: number, target: Parameters<Boss['updateAI']>[1]): void {
    // Second phase: embers rise off his claws.
    if (this.phase === 2 && this.stateMachine.currentState !== 'DEAD' && Math.random() < 0.5) {
      this.particleFX.spawnFlames(this.getWeaponPoints().tip, 2, 0.25);
    }
    super.updateAI(dt, target);
  }
}

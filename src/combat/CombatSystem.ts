import * as THREE from 'three';
import gsap from 'gsap';
import { Player, CHARGED_MULTIPLIER } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { HitboxManager } from './HitboxManager';
import { ParticleFX } from './ParticleFX';
import { SoundFX } from './SoundFX';
import { SceneManager } from '../core/SceneManager';
import type { Character } from '../entities/Character';
import type { CharacterState } from '../entities/CharacterStateMachine';

/** Posture a chip hit deals into an armoured (committed) enemy attack, as a share of normal. */
const ARMORED_POSTURE = 0.3;
/** After a stagger ends, this long before another hit can stagger the player again (s). */
const STAGGER_GRACE = 0.4;
/** After an enemy's stagger ends, this long before a light hit can stagger it again (s): its chance to answer. */
const ENEMY_STAGGER_GRACE = 0.8;
/** A boss shrugs off even heavy blows for this long after one staggers it (s): finishers alone can't pin it down. */
const BOSS_STAGGER_GRACE = 2.5;
/**
 * Share of a plain blow's posture damage an enemy takes (a boss less still): deflecting its attacks is what breaks
 * it, so a combo alone doesn't leave it open every time.
 */
const BLADE_POSTURE = 0.7;
const BOSS_BLADE_POSTURE = 0.35;

/** A short line the HUD flashes mid-screen. `tone` picks its colour. */
export interface Callout {
  text: string;
  sub?: string;
  tone: 'gold' | 'red' | 'pale';
}

/** What the chapter-complete screen reports. */
export interface FightStats {
  deflections: number;
  blocks: number;
  hitsTaken: number;
  postureBreaks: number;
  damageDealt: number;
}

/** One resolved blow, for the combat log. */
export interface CombatEvent {
  t: number;
  attacker: string;
  defender: string;
  attack: string;
  /** State time of the attacker when it landed. */
  at: number;
  result: 'hit' | 'armored' | 'break' | 'blocked' | 'deflected' | 'evaded' | 'player-hit';
  point: number[];
}

export class CombatSystem {
  private static instance: CombatSystem | null = null;
  private hitboxManager: HitboxManager;
  private particleFX: ParticleFX;
  private soundFX: SoundFX;
  private sceneManager: SceneManager;

  /** Per attacker: the attack in progress and which of its strike windows have already landed. */
  private readonly strikes = new Map<string, { state: string; lastTime: number; landed: Set<number> }>();
  /** Recent hits, newest last (debug overlay and tests read this). */
  public readonly log: CombatEvent[] = [];
  /** Total simulated combat time, for the log. */
  private clock = 0;
  /** Until when (combat clock) further hits on the player deal damage without restarting a stagger. */
  private playerStaggerImmuneUntil = 0;
  /** Per enemy: until when light hits cannot stagger it again. */
  private readonly staggerImmuneUntil = new Map<string, number>();

  /** Hit-stop and slow motion: the engine scales simulated time by this. */
  public globalTimeScale = 1.0;
  /** This chapter's tallies (reset by `resetStats`). */
  public stats: FightStats = emptyStats();
  /** Mid-screen callouts (the HUD shows them). */
  public onCallout: ((callout: Callout) => void) | null = null;
  /** The player took a blow to the body (HUD flash). */
  public onPlayerHurt: (() => void) | null = null;

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

  /**
   * One fixed step of melee: each attacker's blade, swept over the step, against each opponent's body, during the
   * attack's strike windows (measured from the animation for animated characters). Each window lands at most once.
   */
  public update(player: Player, enemies: Enemy[], dt = 1 / 60): void {
    this.clock += dt;
    const living = enemies.filter((e) => e.stateMachine.currentState !== 'DEAD');
    for (const enemy of living) {
      const w = this.activeStrike(player);
      if (w !== null) {
        const { hit, hitPoint } = this.hitboxManager.checkWeaponIntersection(player, enemy);
        if (hit) {
          this.markLanded(player, w);
          this.resolvePlayerHitOnEnemy(player, enemy, hitPoint, player.stateMachine.currentState);
        }
      }
      const e = this.activeStrike(enemy);
      if (e !== null) {
        const { hit, hitPoint } = this.hitboxManager.checkWeaponIntersection(enemy, player);
        if (hit) {
          this.markLanded(enemy, e);
          if (player.isEvading()) this.resolveEvasion(enemy, player);
          else this.resolveEnemyHitOnPlayer(enemy, player, hitPoint);
        }
      }
    }
    this.hitboxManager.commitBlades([player, ...enemies]);
  }

  /** The strike window `c` is in right now and has not landed yet, or null. Resets when a new attack begins. */
  private activeStrike(c: Character): number | null {
    const sm = c.stateMachine;
    const state = sm.currentState;
    let track = this.strikes.get(c.id);
    if (!track || track.state !== state || sm.stateTime < track.lastTime) {
      track = { state, lastTime: sm.stateTime, landed: new Set() };
      this.strikes.set(c.id, track);
    }
    track.lastTime = sm.stateTime;
    if (!state.startsWith('ATTACK')) return null;
    const windows = c.hitWindows(state);
    const i = windows.findIndex((w, k) => !track!.landed.has(k) && sm.stateTime >= w.t0 && sm.stateTime <= w.t1);
    return i < 0 ? null : i;
  }

  private markLanded(c: Character, window: number): void {
    this.strikes.get(c.id)?.landed.add(window);
  }

  private record(event: Omit<CombatEvent, 't'>): void {
    this.log.push({ t: +this.clock.toFixed(3), ...event });
    if (this.log.length > 200) this.log.shift();
    this.onEvent?.(this.log[this.log.length - 1]);
  }

  /**
   * Whether a blow makes the enemy flinch. Heavy blows break through a committed attack and move a boss; light ones
   * never do. Neither re-staggers an enemy that just recovered (no stun-locking by attack spam).
   */
  private canStagger(enemy: Enemy, armored: boolean, heavyBlow: boolean): boolean {
    // Even a heavy blow can't restagger an enemy that has only just recovered: a finisher can't loop the combo.
    const recovered = this.clock >= (this.staggerImmuneUntil.get(enemy.id) ?? 0);
    if (heavyBlow) return recovered;
    if (armored || enemy.heavyPoise) return false;
    return recovered;
  }

  /** Called for every recorded hit (debug overlay). */
  public onEvent: ((event: CombatEvent) => void) | null = null;

  private resolvePlayerHitOnEnemy(
    player: Player,
    enemy: Enemy,
    hitPoint: THREE.Vector3,
    attackState: string
  ): void {
    // What the blow does comes from the weapon in his hand.
    const blow = player.weapon.blows[attackState as CharacterState] ?? player.weapon.blows.ATTACK_1!;
    let damage = blow.damage;
    let postureDmg = blow.posture;

    const charged = player.chargedHits > 0;
    if (charged) {
      player.chargedHits--;
      damage *= CHARGED_MULTIPLIER;
      postureDmg *= CHARGED_MULTIPLIER;
    }

    if (enemy.stateMachine.currentState === 'POSTURE_BROKEN') {
      damage *= 2.2;
    }

    // Committed enemy attacks are armoured: a chip hit lands but barely dents posture and does not interrupt.
    // Heavy blows (finisher, leaping strike, a charged hit) still break through.
    const heavyBlow = charged || !!blow.heavy;
    const armored = enemy.isArmored();
    if (armored && !heavyBlow) postureDmg *= ARMORED_POSTURE;
    postureDmg *= enemy.isBoss ? BOSS_BLADE_POSTURE : BLADE_POSTURE;
    // Some hides turn a light blow thrown into their swing: only part of it gets through.
    const glancing = armored && !heavyBlow && enemy.armorDamage < 1;
    if (glancing) damage *= enemy.armorDamage;

    enemy.takeDamage(damage);
    const broken = enemy.addMarmaDamage(postureDmg);

    const crush = player.weapon.sound.impact === 'crush';
    const heavy = charged || crush || attackState === 'ATTACK_JUMP';
    if (glancing) {
      this.soundFX.playGlancingBlow();
      this.particleFX.spawnSparks(hitPoint, 10, false);
      this.triggerHitStop(0.3, 0.06);
    } else {
      this.soundFX.playHitImpact(player.weapon.sound.impact);
      this.particleFX.spawnSparks(hitPoint, heavy ? 45 : 25, charged);
      this.sceneManager.triggerScreenShake(heavy ? 0.4 : 0.2, heavy ? 0.24 : 0.16);
      this.triggerHitStop(0.06, heavy || blow.heavy ? 0.15 : 0.1);
    }

    this.stats.damageDealt += damage;
    if (broken) {
      this.stats.postureBreaks++;
      this.soundFX.playPostureBreak();
      this.callout({ text: 'Marma broken', sub: 'Strike now', tone: 'red' });
    } else if (enemy.stateMachine.currentState !== 'POSTURE_BROKEN' && this.canStagger(enemy, armored, heavyBlow)) {
      enemy.stateMachine.changeState('STAGGER');
      const grace = enemy.heavyPoise ? BOSS_STAGGER_GRACE : ENEMY_STAGGER_GRACE;
      this.staggerImmuneUntil.set(enemy.id, this.clock + enemy.stateMachine.STAGGER_DURATION + grace);
    }
    this.record({
      attacker: player.id, defender: enemy.id, attack: attackState, at: player.stateMachine.stateTime,
      result: broken ? 'break' : enemy.stateMachine.currentState === 'STAGGER' ? 'hit' : armored ? 'armored' : 'hit', point: hitPoint.toArray(),
    });

  }

  /** A blow that would have landed passes over the sliding player: a beat of slow motion marks the near miss. */
  private resolveEvasion(enemy: Enemy, player: Player): void {
    this.record({ attacker: enemy.id, defender: player.id, attack: enemy.stateMachine.currentState,
      at: enemy.stateMachine.stateTime, result: 'evaded', point: player.getPosition().toArray() });
    this.triggerHitStop(0.35, 0.2);
    this.callout({ text: 'Evaded', tone: 'pale' });
  }

  private resolveEnemyHitOnPlayer(enemy: Enemy, player: Player, hitPoint: THREE.Vector3): void {
    const entry = { attacker: enemy.id, defender: player.id, attack: enemy.stateMachine.currentState,
      at: enemy.stateMachine.stateTime, point: hitPoint.toArray() };
    // 140ms Dhal Parry Window -> DEFLECTION!
    if (player.stateMachine.currentState === 'PARRY' && player.stateMachine.isParryActive) {
      this.handlePerfectParry(player, enemy, hitPoint);
      this.record({ ...entry, result: 'deflected' });
      return;
    }

    // Raised dhal (a guard, or a parry pressed too early): the blow lands on the shield.
    const { damage, posture } = enemyBlow(enemy);
    if (player.isGuarding() && player.isFacing(enemy.getPosition())) {
      this.handleBlockedHit(player, hitPoint, damage, posture);
      this.record({ ...entry, result: 'blocked' });
      return;
    }
    this.record({ ...entry, result: 'player-hit' });

    this.stats.hitsTaken++;
    player.takeDamage(damage);
    const broken = player.addMarmaDamage(posture);
    this.onPlayerHurt?.();
    if (broken && player.stateMachine.currentState !== 'DEAD') this.callout({ text: 'Posture broken', tone: 'red' });

    this.soundFX.playHitImpact();
    this.particleFX.spawnSparks(hitPoint, 30, false);
    this.sceneManager.triggerScreenShake(0.35, 0.22);
    // No stun-lock: a stagger (and a short grace after it) is not restarted by the rest of a combo, so the player
    // always gets a window to guard, parry or get out.
    if (!broken && player.stateMachine.currentState !== 'DEAD' && this.clock >= this.playerStaggerImmuneUntil) {
      player.stateMachine.changeState('STAGGER');
      this.playerStaggerImmuneUntil = this.clock + player.stateMachine.STAGGER_DURATION + STAGGER_GRACE;
    }
  }

  private handlePerfectParry(player: Player, enemy: Enemy, hitPoint: THREE.Vector3): void {
    this.soundFX.playParryClash();
    this.particleFX.spawnSparks(hitPoint, 55, true);
    this.particleFX.spawnDeflectionShockwave(hitPoint);
    this.triggerHitStop(0.05, 0.14);
    this.sceneManager.triggerScreenShake(0.42, 0.28);

    this.stats.deflections++;
    const postureBroken = enemy.addMarmaDamage(50);
    if (postureBroken) {
      this.stats.postureBreaks++;
      this.soundFX.playPostureBreak();
      this.callout({ text: 'Marma broken', sub: 'Strike now', tone: 'red' });
    } else {
      enemy.stateMachine.changeState('DEFLECTED');
      this.callout({ text: 'Deflected', tone: 'gold' });
    }
  }

  /** A blow taken on the guard: a little health gets through, posture takes more, and the dhal rocks back. */
  public handleBlockedHit(player: Player, hitPoint: THREE.Vector3, damage: number, postureDamage: number): void {
    this.stats.blocks++;
    player.takeDamage(damage * 0.2);
    const broken = player.addMarmaDamage(postureDamage * 1.25);
    this.soundFX.playParryClash();
    this.particleFX.spawnSparks(hitPoint, 18, false);
    this.sceneManager.triggerScreenShake(0.15, 0.14);
    if (broken) this.callout({ text: 'Guard broken', tone: 'red' });
    else if (player.stateMachine.currentState !== 'DEAD') player.stateMachine.changeState('BLOCK_HIT');
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

  public callout(callout: Callout): void {
    this.onCallout?.(callout);
  }

  /** A new fight: tallies to zero, no stagger immunities or half-finished strikes carried over. */
  public resetStats(): void {
    this.stats = emptyStats();
    this.strikes.clear();
    this.staggerImmuneUntil.clear();
    this.playerStaggerImmuneUntil = 0;
    gsap.killTweensOf(this);
    this.globalTimeScale = 1;
  }
}

function emptyStats(): FightStats {
  return { deflections: 0, blocks: 0, hitsTaken: 0, postureBreaks: 0, damageDealt: 0 };
}

/** Damage and posture a blow from `enemy` deals the player: bosses hit harder. */
function enemyBlow(enemy: Enemy): { damage: number; posture: number } {
  const k = enemy.damageScale;
  if (!enemy.isBoss) return { damage: 16 * k, posture: 18 * k };
  const finisher = enemy.stateMachine.currentState === 'ATTACK_3' || enemy.stateMachine.currentState === 'ATTACK_JUMP';
  return finisher ? { damage: 24 * k, posture: 28 * k } : { damage: 18 * k, posture: 21 * k };
}

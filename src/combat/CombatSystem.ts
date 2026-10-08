import * as THREE from 'three';
import gsap from 'gsap';
import { Player, CHARGED_MULTIPLIER } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import type { Blow } from '../entities/characters/YodhaWeapons';
import { HitboxManager } from './HitboxManager';
import { ParticleFX } from './ParticleFX';
import { BloodFX } from './BloodFX';
import { SoundFX } from './SoundFX';
import { SceneManager } from '../core/SceneManager';
import { InputManager } from '../core/InputManager';
import { IMPACTS, type ImpactKind, type ImpactSpec } from '../core/ImpactCamera';
import { HitFeel, blowSpec, weaponKindOf } from './HitFeel';
import type { BlowTier } from './HitReact';
import type { Character } from '../entities/Character';
import type { CharacterState } from '../entities/CharacterStateMachine';

/** What a boss's kick (its answer to a run of blocked blows) does: a little damage and posture (times its blows' scale), and how far it throws him. */
const SHOVE_DAMAGE = 8;
const SHOVE_POSTURE = 16;
const SHOVE_KNOCK = 2.6;
/** Posture a guard breaking adds, as a share of the boss's bar. */
const GUARD_BREAK_POSTURE = 0.16;
/** Posture a chip hit deals into an armoured (committed) enemy attack, as a share of normal. */
const ARMORED_POSTURE = 0.3;
/** After a stagger ends, this long before another hit can stagger the player again (s). */
const STAGGER_GRACE = 0.4;
/** Both campaign parries and replicated duel parries apply this same posture cost. */
const DEFLECTION_POSTURE = 50;
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
/**
 * Hit-stop budget: freezes add up to at most this many milliseconds in any `FREEZE_WINDOW` (a sweep through a crowd
 * lands many blows at once and must not stall the game).
 */
const FREEZE_BUDGET = 240;
const FREEZE_WINDOW = 500;

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
  /** His blows a boss's guard turned aside, and the guards he broke (combat/Guard.ts). */
  bossBlocks: number;
  guardBreaks: number;
}

/** One resolved blow, for the combat log. */
export interface CombatEvent {
  t: number;
  attacker: string;
  defender: string;
  attack: string;
  /** State time of the attacker when it landed. */
  at: number;
  result: 'hit' | 'armored' | 'break' | 'blocked' | 'deflected' | 'evaded' | 'player-hit' | 'guarded' | 'guard-break';
  point: number[];
}

export class CombatSystem {
  private static instance: CombatSystem | null = null;
  private hitboxManager: HitboxManager;
  private particleFX: ParticleFX;
  private soundFX: SoundFX;
  private sceneManager: SceneManager;

  /** Per attacker: the attack in progress and which of its strike windows have already landed. */
  private readonly strikes = new Map<string, { state: string; lastTime: number; serial: number | null; landed: Set<number> }>();
  /** Recent hits, newest last (debug overlay and tests read this). */
  public readonly log: CombatEvent[] = [];
  /** Total simulated combat time, for the log. */
  private clock = 0;
  /** Until when (combat clock) further hits on the player deal damage without restarting a stagger. */
  private playerStaggerImmuneUntil = 0;
  private readonly heroStaggerImmuneUntil = new Map<string, number>();
  /** Per enemy: until when light hits cannot stagger it again. */
  private readonly staggerImmuneUntil = new Map<string, number>();

  /**
   * Slow motion (the outros' beats, a slide under a blow): the rate simulated time runs at. A hit-stop freeze holds it
   * at nothing on top, for a stretch of wall-clock time (`freeze`), then lets go at once.
   */
  public slowScale = 1;
  /** The freeze in progress (performance.now() milliseconds), and recent ones against the budget. */
  private freezeFrom = 0;
  private freezeUntil = 0;
  private readonly freezes: { at: number; ms: number }[] = [];
  /** Gamepad rumble for impacts. */
  private readonly input = InputManager.getInstance();
  /** Seconds of the step being resolved (a blade's velocity at a hit is how far it moved over it). */
  private stepDt = 1 / 60;
  /** `impact` as a function for HitFeel's floor strikes, made once. */
  private readonly impactHook = (kind: ImpactKind, dir?: THREE.Vector3, scale?: number): void => this.impact(kind, dir, scale);

  /** The rate simulated time runs at now: 0 while frozen, else the slow-motion rate. Setting it ends any freeze. */
  public get globalTimeScale(): number {
    return performance.now() < this.freezeUntil ? 0 : this.slowScale;
  }

  public set globalTimeScale(scale: number) {
    this.slowScale = scale;
    this.freezeUntil = 0;
  }

  /**
   * Simulated seconds in a frame of `rawDt` wall-clock seconds ending at `now` (ms): the part spent frozen counts for
   * nothing, the rest runs at the slow-motion rate. Exact whatever the frame rate, so a 40 ms freeze is 40 ms.
   */
  public simulatedTime(rawDt: number, now: number): number {
    const start = now - rawDt * 1000;
    const frozen = Math.max(0, Math.min(now, this.freezeUntil) - Math.max(start, this.freezeFrom)) / 1000;
    return Math.max(0, rawDt - frozen) * this.slowScale;
  }

  /**
   * Hit-stop: simulated time stops dead for `ms` of real time, then resumes at full rate with no ramp (a ramp only
   * showed the poses stepping). Overlapping freezes take the longer, not the sum, within the budget above.
   */
  public freeze(ms: number): void {
    const now = performance.now();
    while (this.freezes.length && now - this.freezes[0].at > FREEZE_WINDOW) this.freezes.shift();
    const used = this.freezes.reduce((sum, f) => sum + f.ms, 0);
    const until = now + Math.min(ms, FREEZE_BUDGET - used);
    if (until <= this.freezeUntil || until <= now) return;
    this.freezes.push({ at: now, ms: until - Math.max(now, this.freezeUntil) });
    if (now >= this.freezeUntil) this.freezeFrom = now;
    this.freezeUntil = until;
  }

  /**
   * One event of the impact table (ImpactCamera's IMPACTS): its hit-stop, the camera's kick, shake and FOV punch, and
   * the controller's rumble. `dir`: the way the force travels (attacker to victim), world space.
   */
  public impact(kind: ImpactKind, dir?: THREE.Vector3, scale = 1, own?: ImpactSpec): void {
    // `own`: a weapon's numbers for this event (HitFeel.blowSpec) in place of the table's.
    const spec = own ?? IMPACTS[kind];
    if (spec.freeze > 0) this.freeze(spec.freeze);
    this.sceneManager.impact.impact(kind, this.sceneManager.camera, { dir, scale, spec: own });
    const [strong, weak, ms] = spec.rumble;
    this.input.rumble(strong * Math.min(scale, 1.4), weak * Math.min(scale, 1.4), ms);
  }
  /** This chapter's tallies (reset by `resetStats`). */
  public stats: FightStats = emptyStats();
  /** Mid-screen callouts (the HUD shows them). */
  public onCallout: ((callout: Callout) => void) | null = null;
  /** The hero took a blow (`damage`: how hard; the screen's edge pulses with it). */
  public onPlayerHurt: ((damage: number) => void) | null = null;

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
    this.stepDt = dt;
    const living = enemies.filter((e) => e.stateMachine.currentState !== 'DEAD');
    for (const enemy of living) {
      // A boss's kick connects partway through its clip (it has no blade to sweep).
      if (enemy.stateMachine.currentState === 'SHOVE' && !enemy.shoveLanded && enemy.stateMachine.stateTime >= enemy.shoveContact()) {
        this.landShove(enemy, player);
      }
      if (enemy.ambush) this.landAmbush(enemy, player);
      const w = this.activeStrike(player);
      if (w !== null && !enemy.submerged) {
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
    // A weapon brought down on the floor (the mace's slam, a leaping strike): sparks, dust, a thud.
    HitFeel.floorStrike(player, dt, (this.strikes.get(player.id)?.landed.size ?? 0) > 0, this.impactHook);
    this.hitboxManager.commitBlades([player, ...enemies]);
  }

  /** The strike window `c` is in right now and has not landed yet, or null. Resets when a new attack begins. */
  private activeStrike(c: Character): number | null {
    const sm = c.stateMachine;
    const state = sm.currentState;
    let track = this.strikes.get(c.id);
    if (!track || track.state !== state || track.serial !== c.receivedAttackId || (c.receivedAttackId === null && sm.stateTime < track.lastTime)) {
      track = { state, lastTime: sm.stateTime, serial: c.receivedAttackId, landed: new Set() };
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
    // A boss with its guard up turns a light blow aside; a heavy one breaks the guard (combat/Guard.ts).
    const verdict = enemy.guard?.meet(heavyBlow, player.getPosition()) ?? null;
    if (verdict === 'block') {
      this.resolveBlocked(player, enemy, hitPoint, attackState, blow);
      return;
    }
    const armored = enemy.isArmored();
    if (armored && !heavyBlow) postureDmg *= ARMORED_POSTURE;
    postureDmg *= enemy.isBoss ? BOSS_BLADE_POSTURE : BLADE_POSTURE;
    // Some hides turn a light blow thrown into their swing: only part of it gets through.
    const glancing = armored && !heavyBlow && enemy.armorDamage < 1;
    if (glancing) damage *= enemy.armorDamage;

    const guardBroken = verdict === 'break';
    if (guardBroken) {
      enemy.guard!.broke();
      postureDmg += enemy.maxMarma * GUARD_BREAK_POSTURE;
    }
    enemy.takeDamage(damage);
    const broken = enemy.addMarmaDamage(postureDmg);
    // It remembers the blow (and from where it came): the more it takes, the likelier it guards and answers.
    enemy.guard?.struck(player.getPosition());

    const crush = player.weapon.sound.impact === 'crush';
    const heavy = charged || crush || attackState === 'ATTACK_JUMP';
    // What the camera and the pad feel: a slam (a charged blow, the leaping strike, a gada finisher), a heavy blow (a
    // finisher, any gada blow) or a light one. A boss's last blow and a broken posture outrank them.
    const along = enemy.getPosition().clone().sub(player.getPosition()).setY(0);
    const slam = charged || attackState === 'ATTACK_JUMP' || (crush && !!blow.heavy);
    let kind: ImpactKind = glancing ? 'glance' : slam ? 'hitSlam' : blow.heavy || crush ? 'hitHeavy' : 'hitLight';
    if (enemy.isBoss && enemy.currentHealth <= 0) kind = 'bossKill';
    // What this weapon makes of it (HitFeel): the victim's flinch, push and flash, chingaari where steel meets hide or
    // armour, the layers of sound and the dust; and the camera's and the blood's own direction.
    const weapon = weaponKindOf(player);
    const tier: BlowTier = slam ? 'slam' : blow.heavy ? 'heavy' : 'light';
    const reeling = broken || (enemy.stateMachine.currentState !== 'POSTURE_BROKEN' && this.canStagger(enemy, armored, heavyBlow));
    const feel = HitFeel.blowLanded({
      attacker: player, victim: enemy, point: hitPoint, dt: this.stepDt, weapon, tier,
      glancing, armored, boss: enemy.isBoss, along, reeling,
    });
    if (glancing) {
      this.soundFX.playGlancingBlow();
    } else {
      this.soundFX.playHitImpact(player.weapon.sound.impact);
      // With blood on, the red sparks of a flesh blow give way to it (a charged blow keeps its gold).
      const blood = BloodFX.getInstance();
      const bleeds = blood.bleeds(enemy.blood);
      if (!bleeds || charged) this.particleFX.spawnSparks(hitPoint, heavy ? 45 : 25, charged);
      if (bleeds) {
        blood.spill(hitPoint, feel.spill, damage, enemy.blood, enemy.group.position.y, enemy.currentHealth <= 0, { thin: weapon === 'blade' });
      }
    }
    this.impact(kind, feel.dir, 1, blowSpec(kind, weapon, tier));
    if (broken) this.impact('postureBreak', along);
    if (guardBroken && !broken && enemy.currentHealth > 0) this.announceGuardBreak(player, enemy, hitPoint, along);

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
      result: guardBroken ? 'guard-break' : broken ? 'break' : enemy.stateMachine.currentState === 'STAGGER' ? 'hit' : armored ? 'armored' : 'hit', point: hitPoint.toArray(),
    });

  }

  /**
   * His light blow lands on a boss's raised guard: nothing gets through but a little posture. The weapons ring and throw
   * chingaari where they met, the freeze and the camera's kick say it was stopped, and his blade bounces off and him with it
   * (`Player.recoil`). A run of these is what the boss answers (combat/Guard.ts).
   */
  private resolveBlocked(player: Player, enemy: Enemy, hitPoint: THREE.Vector3, attackState: string, blow: Blow): void {
    const guard = enemy.guard!;
    const spec = guard.spec;
    // Where the weapons met: the closest points of his blade and its weapon.
    const at = guard.contactPoint(player, hitPoint, _contact);
    guard.blocked();
    if (spec.chip > 0) enemy.takeDamage(blow.damage * spec.chip);
    const broken = enemy.addMarmaDamage(blow.posture * (enemy.isBoss ? BOSS_BLADE_POSTURE : BLADE_POSTURE) * spec.posture);
    this.stats.bossBlocks++;
    const weapon = weaponKindOf(player);
    const along = enemy.getPosition().clone().sub(player.getPosition()).setY(0);
    HitFeel.blocked({ point: at, attacker: player, weapon, strike: spec.ring, power: weapon === 'crush' ? 1.25 : 1.1, floor: enemy.group.position.y, dt: this.stepDt });
    // The camera is thrown back along the bounce, away from the boss; a mace's rebound is the heavier.
    this.impact('clash', along.clone().negate().normalize(), weapon === 'crush' ? 1.3 : weapon === 'wood' ? 0.8 : 1);
    this.record({ attacker: player.id, defender: enemy.id, attack: attackState, at: player.stateMachine.stateTime, result: 'guarded', point: at.toArray() });
    player.recoil(enemy.getPosition(), weapon === 'crush' ? 0.75 : weapon === 'wood' ? 0.35 : 0.5);
    if (broken) {
      guard.broke();
      this.stats.postureBreaks++;
      this.soundFX.playPostureBreak();
      this.callout({ text: 'Marma broken', sub: 'Strike now', tone: 'red' });
      this.impact('postureBreak', along);
    }
  }

  /** A heavy blow (a finisher, a charged blow, the leaping strike) broke a boss's raised guard: the clash of it, and the word. */
  private announceGuardBreak(player: Player, enemy: Enemy, hitPoint: THREE.Vector3, along: THREE.Vector3): void {
    this.stats.guardBreaks++;
    const weapon = weaponKindOf(player);
    const iron = weapon === 'crush' || enemy.guard!.spec.ring === 'iron';
    this.soundFX.playGuardBreak(iron ? 'iron' : enemy.guard!.spec.ring);
    if (weapon !== 'wood') {
      HitFeel.clash({ point: hitPoint, attacker: player, weapon: iron ? 'crush' : 'blade', power: 1.5, floor: enemy.group.position.y, dt: this.stepDt });
    }
    this.impact('postureBreak', along);
    this.callout({ text: 'Guard broken', sub: 'Strike now', tone: 'gold' });
  }

  /**
   * A boss's kick connects: a little damage and posture, and he is thrown back. He can slide it (an evasion), parry it
   * (the boss is deflected), or take it on the dhal (a block that still pushes him back less).
   */
  private landShove(enemy: Enemy, player: Player): void {
    enemy.shoveLanded = true;
    const here = enemy.getPosition();
    const hero = player.getPosition();
    const dx = hero.x - here.x;
    const dz = hero.z - here.z;
    const entry = { attacker: enemy.id, defender: player.id, attack: 'SHOVE', at: enemy.stateMachine.stateTime };
    if (Math.hypot(dx, dz) > enemy.shoveReach() || !enemy.isFacing(hero, THREE.MathUtils.degToRad(70)) || player.isDown()) return;
    const point = _contact.set(hero.x, hero.y + 1.1, hero.z);
    if (player.isEvading()) {
      this.resolveEvasion(enemy, player);
      return;
    }
    if (player.stateMachine.currentState === 'PARRY' && player.stateMachine.isParryActive) {
      this.handlePerfectParry(player, enemy, point);
      this.record({ ...entry, point: point.toArray(), result: 'deflected' });
      return;
    }
    const k = enemy.damageScale;
    const damage = SHOVE_DAMAGE * k;
    const posture = SHOVE_POSTURE * k;
    const away = _away.set(dx, 0, dz);
    if (player.isGuarding() && player.isFacing(here)) {
      this.handleBlockedHit(player, point, damage, posture, here, enemy);
      player.knock(away, SHOVE_KNOCK * 0.4);
      this.record({ ...entry, point: point.toArray(), result: 'blocked' });
      return;
    }
    this.record({ ...entry, point: point.toArray(), result: 'player-hit' });
    this.stats.hitsTaken++;
    player.takeDamage(damage);
    const broken = player.addMarmaDamage(posture);
    this.onPlayerHurt?.(damage);
    if (broken && player.stateMachine.currentState !== 'DEAD') this.callout({ text: 'Posture broken', tone: 'red' });
    // A boot, not a blade: the weight of a body, dust off him and no blood.
    this.soundFX.playHitImpact('crush');
    this.soundFX.playBlowWeight('crush', 0);
    this.particleFX.spawnDustPuff(player.group.position, 10);
    this.impact(broken ? 'guardBroken' : 'hurtHeavy', away.clone().normalize(), 0.9);
    player.knock(away, SHOVE_KNOCK);
    if (!broken && player.stateMachine.currentState !== 'DEAD' && this.clock >= this.playerStaggerImmuneUntil) {
      player.stateMachine.changeState('STAGGER');
      this.playerStaggerImmuneUntil = this.clock + player.stateMachine.STAGGER_DURATION + STAGGER_GRACE;
    }
  }

  /** A blow that would have landed passes over the sliding player: a beat of slow motion marks the near miss. */
  /**
   * A blow from behind that lands the moment it comes (`Enemy.ambush`): no block or parry turns it. Slid under (the
   * slide's untouchable span) or jumped over (off the ground), it misses; otherwise it lands as a heavy blow.
   */
  private landAmbush(enemy: Enemy, player: Player): void {
    const blow = enemy.ambush!;
    enemy.ambush = null;
    if (player.isDown()) return;
    const airborne = player.stateMachine.currentState === 'JUMP' && !(player.motor?.grounded ?? true);
    if (player.isEvading() || airborne) {
      this.resolveEvasion(enemy, player);
      return;
    }
    const point = player.getPosition().clone().add(new THREE.Vector3(0, 1.1, 0));
    this.record({ attacker: enemy.id, defender: player.id, attack: 'AMBUSH', at: enemy.stateMachine.stateTime, point: point.toArray(), result: 'player-hit' });
    this.stats.hitsTaken++;
    player.takeDamage(blow.damage);
    const broken = player.addMarmaDamage(blow.posture);
    this.onPlayerHurt?.(blow.damage);
    this.soundFX.playHitImpact(enemy.impactSound);
    const blood = BloodFX.getInstance();
    if (!blood.bleeds('red')) this.particleFX.spawnSparks(point, 30, false);
    else blood.spill(point, player.getPosition().clone().sub(enemy.getPosition()), blow.damage, 'red', player.group.position.y, player.currentHealth <= 0);
    const away = player.getPosition().clone().sub(enemy.getPosition()).setY(0);
    this.impact(broken ? 'guardBroken' : 'hurtHeavy', away, 1.3);
    if (broken) this.callout({ text: 'Posture broken', tone: 'red' });
    else if (player.stateMachine.currentState !== 'DEAD' && this.clock >= this.playerStaggerImmuneUntil) {
      player.stateMachine.changeState('STAGGER');
      this.playerStaggerImmuneUntil = this.clock + player.stateMachine.STAGGER_DURATION + STAGGER_GRACE;
    }
  }

  private resolveEvasion(enemy: Character, player: Player): void {
    this.record({ attacker: enemy.id, defender: player.id, attack: enemy.stateMachine.currentState,
      at: enemy.stateMachine.stateTime, result: 'evaded', point: player.getPosition().toArray() });
    this.slowBeat(0.35, 0.2);
    this.impact('evade');
    this.callout({ text: 'Evaded', tone: 'pale' });
  }

  private resolveEnemyHitOnPlayer(enemy: Enemy, player: Player, hitPoint: THREE.Vector3): void {
    this.resolveIncomingBlow(enemy, player, hitPoint, enemyBlow(enemy));
  }

  /**
   * Third melee case: two heroes. The defender uses the same parry, guard, slide and posture path as campaign.
   * A weapon's Blow supplies the numbers; no boss scale or armour is borrowed. Network callers invoke this only
   * on the defender's browser and send the resulting outcome back to the attacker.
   */
  public resolveHeroHitOnHero(attacker: Player, defender: Player, point: THREE.Vector3): void {
    const blow = attacker.weapon.blows[attacker.stateMachine.currentState] ?? attacker.weapon.blows.ATTACK_1!;
    const charged = attacker.chargedHits > 0;
    if (charged) attacker.chargedHits--;
    const scale = charged ? CHARGED_MULTIPLIER : 1;
    if (defender.isEvading()) this.resolveEvasion(attacker, defender);
    else this.resolveIncomingBlow(attacker, defender, point, {
      damage: blow.damage * scale * (defender.stateMachine.currentState === 'POSTURE_BROKEN' ? 2.2 : 1),
      posture: blow.posture * scale,
    });
  }

  /** One duel step: the local bot has two authorities; a network peer resolves only incoming blades. */
  public updateDuel(local: Player, opponent: Player, dt: number, network = false,
    onHit?: (event: CombatEvent, window: number, charged: boolean) => void,
    onContact?: (window: number) => void): void {
    this.clock += dt;
    this.stepDt = dt;
    if (!local.isDown() && !opponent.isDown()) {
      if (network) {
        // Predict contact only: no blood, damage, posture, charge consumption or defence verdict here.
        const window = this.activeStrike(local);
        if (window !== null) {
          const contact = this.hitboxManager.checkWeaponIntersection(local, opponent);
          if (contact.hit) {
            this.markLanded(local, window);
            this.particleFX.spawnSparks(contact.hitPoint, 5);
            this.soundFX.playHitImpact('wood');
            onContact?.(window);
          }
        }
      }
      for (const [attacker, defender] of network ? [[opponent, local]] : [[local, opponent], [opponent, local]]) {
        const window = this.activeStrike(attacker);
        if (window === null) continue;
        const { hit, hitPoint } = this.hitboxManager.checkWeaponIntersection(attacker, defender);
        if (hit) {
          const before = defender.currentHealth;
          const charged = attacker.chargedHits > 0;
          this.markLanded(attacker, window);
          this.resolveHeroHitOnHero(attacker, defender, hitPoint);
          if (attacker === local) this.stats.damageDealt += before - defender.currentHealth;
          onHit?.(this.log[this.log.length - 1], window, charged);
        }
      }
    }
    this.hitboxManager.commitBlades([local, opponent]);
  }

  /** Adds the confirmed peer feedback after the neutral predicted contact; it never applies peer damage locally. */
  public confirmHeroContact(attacker: Player, defender: Player, result: CombatEvent['result'], point: THREE.Vector3): void {
    if (result === 'evaded') return;
    if (result === 'blocked' || result === 'deflected') {
      this.particleFX.spawnSparks(point, result === 'deflected' ? 24 : 12);
      if (result === 'deflected') this.soundFX.playParryClash();
      else { this.soundFX.playShieldBlock(); this.impact('block'); }
      return;
    }
    this.soundFX.playHitImpact(attacker.weapon.sound.impact);
    const blood = BloodFX.getInstance();
    if (blood.bleeds('red')) blood.spill(point, defender.getPosition().clone().sub(attacker.getPosition()),
      attacker.weapon.blows.ATTACK_1!.damage, 'red', defender.group.position.y, defender.currentHealth <= 0);
    else this.particleFX.spawnSparks(point, 16, false);
    this.impact('hitLight');
  }

  private resolveIncomingBlow(enemy: Enemy | Player, player: Player, hitPoint: THREE.Vector3, blow: { damage: number; posture: number }): void {
    const entry = { attacker: enemy.id, defender: player.id, attack: enemy.stateMachine.currentState,
      at: enemy.stateMachine.stateTime, point: hitPoint.toArray() };
    // 140ms Dhal Parry Window -> DEFLECTION!
    if (player.stateMachine.currentState === 'PARRY' && player.stateMachine.isParryActive) {
      this.handlePerfectParry(player, enemy, hitPoint);
      this.record({ ...entry, result: 'deflected' });
      return;
    }

    // Raised dhal (a guard, or a parry pressed too early): the blow lands on the shield.
    const { damage, posture } = blow;
    if (player.isGuarding() && player.isFacing(enemy.getPosition())) {
      this.handleBlockedHit(player, hitPoint, damage, posture, enemy.getPosition(), enemy);
      this.record({ ...entry, result: 'blocked' });
      return;
    }
    this.record({ ...entry, result: 'player-hit' });

    this.stats.hitsTaken++;
    player.takeDamage(damage);
    const broken = player.addMarmaDamage(posture);
    this.onPlayerHurt?.(damage);
    if (broken && player.stateMachine.currentState !== 'DEAD') this.callout({ text: 'Posture broken', tone: 'red' });

    this.soundFX.playHitImpact(enemy instanceof Player ? enemy.weapon.sound.impact : enemy.impactSound);
    const blood = BloodFX.getInstance();
    if (!blood.bleeds('red')) this.particleFX.spawnSparks(hitPoint, 30, false);
    else {
      blood.spill(hitPoint, player.getPosition().clone().sub(enemy.getPosition()), damage, 'red', player.group.position.y, player.currentHealth <= 0);
    }
    // Knocked back, away from the attacker. A boss's heavy blow lands harder, by how much it dealt.
    const away = player.getPosition().clone().sub(enemy.getPosition()).setY(0);
    if (broken) this.impact('guardBroken', away);
    else if (enemy instanceof Enemy && enemy.isBoss && damage >= 24) this.impact('hurtHeavy', away, Math.min(1.4, damage / 18));
    else this.impact('hurt', away);
    // No stun-lock: a stagger (and a short grace after it) is not restarted by the rest of a combo, so the player
    // always gets a window to guard, parry or get out.
    if (!broken && player.stateMachine.currentState !== 'DEAD' && this.clock >= (enemy instanceof Player
      ? this.heroStaggerImmuneUntil.get(player.id) ?? 0 : this.playerStaggerImmuneUntil)) {
      player.stateMachine.changeState('STAGGER');
      const until = this.clock + player.stateMachine.STAGGER_DURATION + STAGGER_GRACE;
      if (enemy instanceof Player) this.heroStaggerImmuneUntil.set(player.id, until);
      else this.playerStaggerImmuneUntil = until;
    }
  }

  /** The owner receives a defender's parry verdict: the same posture cost and deflected state. */
  public applyHeroDeflection(hero: Player): void {
    const broken = hero.addMarmaDamage(DEFLECTION_POSTURE);
    if (!broken) hero.stateMachine.changeState('DEFLECTED');
    this.impact(broken ? 'postureBreak' : 'deflect');
  }

  private handlePerfectParry(player: Player, enemy: Character, hitPoint: THREE.Vector3): void {
    this.soundFX.playParryClash();
    HitFeel.clash({ point: hitPoint, attacker: enemy, weapon: weaponKindOf(enemy), power: 1.5, floor: enemy.group.position.y, dt: this.stepDt });
    this.particleFX.spawnDeflectionShockwave(hitPoint);
    // A deflect is a crisp snap toward the attacker (the hero meets the blow), not a shake.
    const toward = enemy.getPosition().clone().sub(player.getPosition()).setY(0);
    this.impact('deflect', toward);

    this.stats.deflections++;
    const postureBroken = enemy.addMarmaDamage(DEFLECTION_POSTURE);
    if (postureBroken) this.impact('postureBreak', toward);
    if (postureBroken) {
      this.stats.postureBreaks++;
      this.soundFX.playPostureBreak();
      this.callout({ text: 'Marma broken', sub: 'Strike now', tone: 'red' });
    } else {
      enemy.stateMachine.changeState('DEFLECTED');
      this.callout({ text: 'Deflected', tone: 'gold' });
    }
  }

  /**
   * A blow taken on the guard: a little health gets through, posture takes more, and the dhal rocks back. `from`:
   * where the blow came from (the camera is knocked back away from it).
   */
  public handleBlockedHit(player: Player, hitPoint: THREE.Vector3, damage: number, postureDamage: number, from?: THREE.Vector3, attacker?: Character): void {
    this.stats.blocks++;
    player.takeDamage(damage * 0.2);
    const broken = player.addMarmaDamage(postureDamage * 1.25);
    this.soundFX.playShieldBlock();
    HitFeel.clash({
      point: hitPoint, attacker, from, weapon: attacker ? weaponKindOf(attacker) : 'blade', power: 0.65,
      floor: player.group.position.y, dt: this.stepDt,
    });
    const away = from ? player.getPosition().clone().sub(from).setY(0) : undefined;
    this.impact(broken ? 'guardBroken' : 'block', away);
    if (broken) this.callout({ text: 'Guard broken', tone: 'red' });
    else if (player.stateMachine.currentState !== 'DEAD') player.stateMachine.changeState('BLOCK_HIT');
  }

  /**
   * A beat of slow motion (a slide under a blow): `scale` for half of `seconds`, easing back over the rest. Not a
   * hit-stop (that is `freeze`); with poses interpolated between steps it stays smooth.
   */
  public slowBeat(scale: number, seconds: number): void {
    gsap.killTweensOf(this);
    this.slowScale = scale;
    gsap.to(this, { slowScale: 1, duration: seconds, ease: 'power3.out', delay: seconds * 0.5 });
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
    this.heroStaggerImmuneUntil.clear();
    gsap.killTweensOf(this);
    this.globalTimeScale = 1;
    this.freezes.length = 0;
  }
}

function emptyStats(): FightStats {
  return { deflections: 0, blocks: 0, hitsTaken: 0, postureBreaks: 0, damageDealt: 0, bossBlocks: 0, guardBreaks: 0 };
}

const _contact = new THREE.Vector3();
const _away = new THREE.Vector3();

/** Damage and posture a blow from `enemy` deals the player: bosses hit harder. */
function enemyBlow(enemy: Enemy): { damage: number; posture: number } {
  const k = enemy.damageScale;
  if (!enemy.isBoss) return { damage: 16 * k, posture: 18 * k };
  const finisher = enemy.stateMachine.currentState === 'ATTACK_3' || enemy.stateMachine.currentState === 'ATTACK_JUMP';
  return finisher ? { damage: 24 * k, posture: 28 * k } : { damage: 18 * k, posture: 21 * k };
}

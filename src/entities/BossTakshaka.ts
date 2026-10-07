import * as THREE from 'three';
import { Boss } from './Boss';
import { Guard } from '../combat/Guard';
import type { CharacterState } from './CharacterStateMachine';
import { ProjectileManager } from '../combat/ProjectileManager';
import { SceneManager } from '../core/SceneManager';
import { ease, type Shot } from '../cinematics/CinematicDirector';
import { frame, offset, type IntroContext } from '../cinematics/Intros';
import { DivePool } from './BossShalva';
import { charged, hush, impact } from '../cinematics/Entrance';
import { waterColumn } from '../levels/environment/SeaBurst';

/** The serpent king's own colour where he strikes the stone: naga green. */
const NAGA = 0x46ffb4;

/**
 * His ambush (the user, 2026-10-07): mid-fight he sinks into his dark water and comes up behind the hero, striking the
 * moment he is up. The warning is the water opening behind the hero, green fire in it and a hiss, `UNDER` seconds
 * before the blow: slid under or jumped over, it misses; it cannot be blocked or parried. Seconds: going under, out of
 * sight (the warning), coming up and striking, and the recovery after.
 */
const AMBUSH = { sink: 0.45, under: 0.85, strikeAt: 0.12, recover: 0.75 };
/** Seconds between ambushes (randomised in this range), and before the first; metres behind the hero he comes up. */
const AMBUSH_EVERY: [number, number] = [11, 15];
const AMBUSH_FIRST = 9;
const AMBUSH_BEHIND = 1.7;
/** The arena's open floor (Dwarka's rosette): he never comes up past it. */
const AMBUSH_ARENA = 9.4;

/** Below this share of health he enters his second phase. */
const PHASE_2_AT = 0.5;
/** Seconds between flame waves in phase two, breathed at anyone further off than `WAVE_MIN_RANGE`. */
const WAVE_COOLDOWN = 4.5;
const WAVE_MIN_RANGE = 3.2;
/**
 * Seconds into his breath (the CAST) that the fire leaves him. It used to leave the moment the cast began: from 3 m and
 * more, at 9.5 m/s, it was on the hero a third of a second later with nothing to read (milestone 12). Now the roar's
 * first beat, his head drawn back, is the warning; the fire follows it.
 */
const WAVE_RELEASE = 0.75;
/** His arrival: how far below the stone he waits (he is 2.6 m tall), how long the water takes to open on it, and how long he takes to rise (world seconds). */
const RISE_DEPTH = 3.4;
const POOL_SECONDS = 0.9;
const RISE_SECONDS = 1.3;

/**
 * Chapter III final boss, Takshaka, king of the nagas. He rises to Dwarka's arena once Shalva has fallen. Phase one is
 * claws and a leap; below half health he roars, embers rise off him, he presses faster and breathes fire along the
 * ground at anyone who keeps their distance.
 */
export class BossTakshaka extends Boss {
  public phase = 1;
  private waveTimer = 0;
  /** A breath begun and not yet loosed. */
  private wavePending = false;
  private projectiles = ProjectileManager.getInstance();
  /** The dark water that opens on the stone where he comes up (his arrival), and how far open it is (-1: none). */
  private readonly pool = new DivePool();
  private poolOpen = -1;
  /** 0 standing on the floor, 1 out of sight below it; the model is sunk by this. */
  private depth = 0;
  private rising: { t: number; spray: number } | null = null;
  /** The ambush under way (see `AMBUSH`), and the time until the next one may come. */
  private ambushing: { phase: 'sink' | 'under' | 'strike'; t: number } | null = null;
  private ambushCooldown = AMBUSH_FIRST;

  constructor(id = 'takshaka') {
    super(id, 0x1c2418, {
      attackInterval: 1.3, // milestone 12: was 1.4
      strikeRange: 3.0,
      tooClose: 1.4,
      leapRange: 6,
      leapMax: 11,
      roarRange: 16,
    });
    this.displayName = 'Takshaka';
    this.nativeName = 'तक्षक';
    this.blood = 'ichor';
    this.epithet = 'King of the nagas';
    // Milestone 12: health 460 -> 1000, blows at 119 %. "Bosses fight back": his guard and a posture that starts over after a break
    // make the fight longer and harder: health 1000 -> 640 (a steady player still wins four in five).
    this.maxHealth = 640;
    this.currentHealth = 640;
    this.damageScale = 1.19;
    this.maxMarma = 170;
    // No weapon: his forearms and claws come up across his face.
    this.guard = new Guard(this, {
      base: 0.45, perBlow: 0.3, max: 0.9, hold: 0.8, extend: 0.65, longest: 1.4, cooldown: 1.7, recovery: 0.35, window: 0.18,
      answerAfter: [2, 3], shove: 0.4, ring: 'claw',
    });
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
    // A great arm through the air.
    this.swingSound = 'heavy';
    this.group.add(this.pool.mesh);
  }

  /**
   * His arrival (docs/proposals/ENTRANCES.md, "Takshaka"): over the hero's shoulder, the stone darkens and the water
   * opens on the arena's far side; low at its rim and slowed, the hood breaks the surface and the serpent king comes up
   * out of the dark water, lightning behind him; then the roar and his name. He waits out of sight under the floor until
   * the water opens (the engine shows him the moment his model is ready, so he is sunk here before that frame draws).
   */
  public override arrival(ctx: IntroContext): Shot[] {
    this.depth = 1;
    this.rising = null;
    this.poolOpen = -1;
    this.modelGroup.position.y = -RISE_DEPTH;
    const b = this.getPosition().clone();
    const h = this.visualHeight();
    const f = frame(this.group.rotation.y);
    const hero = ctx.player.getPosition().clone();
    const fh = frame(ctx.player.group.rotation.y);
    return [
      // Over the hero's right shoulder across the empty floor: the stone darkens and the water opens where he will come.
      {
        duration: 2.8,
        fadeIn: 0.4,
        ease: ease.drift,
        sway: 0.01,
        keys: [
          { pos: offset(hero, fh, -1.7, -0.95, 1.75), look: offset(b, f, 0, 0, 0.3), fov: 44 },
          { pos: offset(hero, fh, -0.9, -0.75, 1.6), look: offset(b, f, 0, 0, 0.4), fov: 40 },
        ],
        cues: [
          { at: 0.4, run: () => { this.poolOpen = 0; } },
          { at: 1.5, run: () => this.soundFX.strike(0.7, 1.0) },
          // The storm and the sea go quiet; a swell rises under the water opening.
          { at: 1.2, run: () => hush(0.15, 1.2) },
          { at: 1.2, run: () => this.soundFX.playRiser(1.6 + 1.3, 0.9) },
        ],
      },
      // Low at the water's rim, slowed: the hood breaks the surface and he comes up, the camera tilting up with him.
      {
        duration: 3.4,
        timeScale: [[0, 1], [0.25, 0.35], [2.8, 0.35], [3.4, 0.9]],
        fadeIn: 0.15,
        ease: ease.out,
        sway: 0.012,
        keys: [
          { pos: offset(b, f, h * 1.15, -h * 0.6, 0.35), look: offset(b, f, 0, 0, 0.4), fov: 36 },
          { pos: offset(b, f, h * 1.05, -h * 0.5, 0.75), look: offset(b, f, 0, 0, h * 0.72), fov: 33 },
        ],
        cues: [
          { at: 0, run: () => this.rise() },
          { at: 1.3, run: () => this.soundFX.strike(1.5, 0.2) },
        ],
      },
      // The roar and his name, low on his claw side, tilting up from his hands to his face.
      {
        duration: 4.2,
        fadeIn: 0.12,
        ease: ease.out,
        sway: 0.02,
        keys: [
          { pos: offset(b, f, h * 1.55, -h * 0.95, h * 0.14), look: offset(b, f, 0, 0, h * 0.38), fov: 40 },
          { pos: offset(b, f, h * 1.45, -h * 0.6, h * 0.42), look: offset(b, f, 0, -h * 0.05, h * 0.74), fov: 33 },
        ],
        cues: [
          { at: 0.35, run: () => this.playIntro() },
          {
            at: 0.35 + this.introCardDelay,
            run: () => {
              ctx.cards.boss(this);
              this.soundFX.playSting(0.84);
            },
          },
          // However the arrival went: the sound back (the hush is the scene's, not the fight's).
          { at: 0.1, run: () => hush(1, 0.3) },
        ],
      },
    ];
  }

  /** He breaks the surface: the rise begins (see `update`), with a heavy splash. */
  private rise(): void {
    this.rising = { t: 0, spray: 0 };
    this.soundFX.playSplash(4);
    // The water torn up with him, and the storm crawling over his hood as he comes.
    waterColumn(this.getPosition().clone(), { height: 8, radius: 1.1, seconds: 2.0, onFloor: true, core: false });
    charged(this, RISE_SECONDS + 1.2, { arcs: 5, width: 0.045 });
  }

  public override update(dt: number): void {
    super.update(dt);
    if (this.poolOpen >= 0 && this.poolOpen < 1) this.poolOpen = Math.min(1, this.poolOpen + dt / POOL_SECONDS);
    const r = this.rising;
    if (r) {
      r.t += dt;
      const k = Math.min(1, r.t / RISE_SECONDS);
      this.depth = (1 - k) * (1 - k);
      r.spray -= dt;
      if (r.spray <= 0) {
        r.spray = 0.11;
        this.particleFX.spawnDustPuff(this.getPosition(), 12 + Math.round(8 * Math.random()));
      }
      if (r.t >= RISE_SECONDS) {
        this.rising = null;
        this.depth = 0;
        this.poolOpen = -1;
        // He stands: the stone cracks out from him in naga green, and the world's sound comes back.
        impact(this.getPosition(), { color: NAGA, radius: 8, jolt: 0.16, strength: 0.9 });
      }
    }
    if (this.poolOpen >= 0) {
      const k = this.poolOpen * this.poolOpen * (3 - 2 * this.poolOpen);
      this.pool.set('pool', k, 1.6, 0.92, dt);
    } else this.pool.close(dt);
    this.modelGroup.position.y = -RISE_DEPTH * this.depth;
  }

  /** The arrival cut short (skipped, or the scene settled): up on the stone at once, the water gone. */
  public override settleIntro(): void {
    super.settleIntro();
    this.soundFX.hush(1, 0.2);
    this.rising = null;
    this.depth = 0;
    this.poolOpen = -1;
    this.pool.hide();
    this.modelGroup.position.y = 0;
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
    SceneManager.getInstance().quake(this.getPosition());
    if (this.hasClip('CHARGE') && this.stateMachine.currentState !== 'POSTURE_BROKEN') this.stateMachine.changeState('CHARGE');
  }

  protected override onRoar(): void {
    this.soundFX.playRoar(0.75, 'naga');
    this.particleFX.spawnDustPuff(this.getPosition(), 24);
  }

  protected override specialAction(dt: number, distance: number): boolean {
    if (this.tryAmbush()) return true;
    if (this.phase !== 2) return false;
    this.waveTimer += dt;
    if (this.waveTimer < WAVE_COOLDOWN || distance <= WAVE_MIN_RANGE) return false;
    this.waveTimer = 0;
    this.stateMachine.changeState('CAST');
    return true;
  }

  protected override onStateChange(state: CharacterState, previous: CharacterState): void {
    super.onStateChange(state, previous);
    // The breath is loosed at WAVE_RELEASE (`updateAI`), if nothing has broken it off by then.
    this.wavePending = state === 'CAST';
  }

  /** Fire breathed along the ground in front of him. */
  private breathe(): void {
    const forward = new THREE.Vector3(Math.sin(this.group.rotation.y), 0, Math.cos(this.group.rotation.y));
    this.projectiles.spawnFlameWave(this.getPosition().clone().addScaledVector(forward, 0.9).setY(this.getPosition().y + 0.2), forward, this.id, this.damageScale);
  }

  /** The ambush, if it is time and the two of them are on the open floor. */
  private tryAmbush(): boolean {
    const target = this.ambushTarget;
    if (this.ambushing || this.ambushCooldown > 0 || !target || target.isDown() || !this.hasRoared) return false;
    const here = this.getPosition();
    const hero = target.getPosition();
    if (Math.hypot(here.x, here.z) > AMBUSH_ARENA || Math.hypot(hero.x, hero.z) > AMBUSH_ARENA) return false;
    this.ambushing = { phase: 'sink', t: 0 };
    this.settle('IDLE');
    this.poolOpen = 0.6;
    this.particleFX.spawnDustPuff(here, 30);
    this.soundFX.playPlunge();
    return true;
  }

  /**
   * Where he comes up: behind the hero, on the far side of him from where the serpent king went under (a hero fights
   * facing him, so that is at his back, between him and the camera following him), pulled in off the arena's edge.
   */
  private behind(hero: { getPosition(): THREE.Vector3 }, from: THREE.Vector3): THREE.Vector3 {
    const at = hero.getPosition();
    const away = at.clone().sub(from).setY(0);
    if (away.lengthSq() < 1e-4) away.set(1, 0, 0);
    const p = at.clone().addScaledVector(away.normalize(), AMBUSH_BEHIND);
    const r = Math.hypot(p.x, p.z);
    if (r > AMBUSH_ARENA) p.set((p.x * AMBUSH_ARENA) / r, p.y, (p.z * AMBUSH_ARENA) / r);
    return p;
  }

  private updateAmbush(dt: number, target: Parameters<Boss['updateAI']>[1]): void {
    const a = this.ambushing!;
    const state = this.stateMachine.currentState;
    a.t += dt;
    if (a.phase === 'sink') {
      // Rocked as he goes (a heavy blow, a deflection, a broken posture): he stays up, where he is.
      if (state === 'STAGGER' || state === 'POSTURE_BROKEN' || state === 'DEFLECTED') {
        this.endAmbush(4);
        return;
      }
      this.depth = ease.in(Math.min(1, a.t / AMBUSH.sink));
      if (Math.random() < 0.6) this.particleFX.spawnFlames(this.getPosition(), 3, 0.6);
      if (a.t >= AMBUSH.sink) {
        a.phase = 'under';
        a.t = 0;
        this.submerged = true;
        this.modelGroup.visible = false;
        // Out of sight: the water closes where he went and opens behind the hero (the warning).
        const p = this.behind(target, this.getPosition());
        this.group.position.set(p.x, p.y, p.z);
        this.faceTowards(target.getPosition());
        this.markTeleported();
        this.poolOpen = 0;
        this.soundFX.playRoar(1.25, 'naga');
        this.soundFX.playTelegraphSound();
      }
      return;
    }
    if (a.phase === 'under') {
      this.faceTowards(target.getPosition());
      if (Math.random() < 0.7) this.particleFX.spawnFlames(this.getPosition(), 2, 0.7);
      if (a.t >= AMBUSH.under || target.isDown()) {
        a.phase = 'strike';
        a.t = 0;
        this.submerged = false;
        this.modelGroup.visible = true;
        this.depth = 0.35;
        this.faceTowards(target.getPosition());
        this.particleFX.spawnDustPuff(this.getPosition(), 40);
        this.soundFX.playSplash(4);
        this.soundFX.playSwordSwing(0.8, 'heavy');
        // Up with his claws already sweeping (a clip, not an attack state: the blow is the ambush's, not a blade's).
        this.playClip('standing_melee_attack_horizontal', { startAt: 0.55, timeScale: 1.6, fade: 0.05 });
      }
      return;
    }
    // Up and striking: the blow lands at once; then he recovers and fights on.
    this.depth = Math.max(0, 0.35 - a.t * 3);
    if (a.t >= AMBUSH.strikeAt && a.t - dt < AMBUSH.strikeAt && !target.isDown()) {
      this.ambush = { damage: 26 * this.damageScale, posture: 32 * this.damageScale };
      impact(this.getPosition(), { color: NAGA, radius: 4, jolt: 0, strength: 0.5 });
    }
    if (a.t >= AMBUSH.strikeAt + AMBUSH.recover) this.endAmbush(THREE.MathUtils.lerp(AMBUSH_EVERY[0], AMBUSH_EVERY[1], Math.random()));
  }

  private endAmbush(cooldown: number): void {
    this.ambushing = null;
    this.ambushCooldown = cooldown;
    this.depth = 0;
    this.poolOpen = -1;
    this.submerged = false;
    this.modelGroup.visible = true;
    this.settle('IDLE');
  }

  /** The hero, as the AI last saw it (the ambush is chosen in `specialAction`, which is not handed the target). */
  private ambushTarget: Parameters<Boss['updateAI']>[1] | null = null;

  public override updateAI(dt: number, target: Parameters<Boss['updateAI']>[1]): void {
    this.ambushTarget = target;
    if (this.stateMachine.currentState === 'DEAD') {
      if (this.ambushing) this.endAmbush(99);
    } else if (this.ambushing) {
      this.updateAmbush(dt, target);
      return;
    } else if (this.hasRoared) this.ambushCooldown -= dt;
    // Second phase: embers rise off his claws.
    if (this.phase === 2 && this.stateMachine.currentState !== 'DEAD' && Math.random() < 0.5) {
      this.particleFX.spawnFlames(this.getWeaponPoints().tip, 2, 0.25);
    }
    if (this.wavePending && this.stateMachine.currentState === 'CAST' && this.stateMachine.stateTime >= WAVE_RELEASE) {
      this.wavePending = false;
      this.breathe();
    }
    super.updateAI(dt, target);
  }
}

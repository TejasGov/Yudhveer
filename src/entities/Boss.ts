import * as THREE from 'three';
import { Enemy, type FightTarget } from './Enemy';
import type { CharacterState } from './CharacterStateMachine';

/** How a boss fights: its spacing, how often it swings and when it leaps in. */
export interface BossTuning {
  /** Seconds between the end of one attack and the start of the next. */
  attackInterval: number;
  /** Swings from this far. */
  strikeRange: number;
  /** Keeps at least this much room when not swinging. */
  tooClose: number;
  /** Kept further off than this (and no further than `leapMax`), it closes the gap with a leaping strike. */
  leapRange: number;
  leapMax: number;
  /** It roars once when the player first comes this close (unless a cutscene already did). */
  roarRange: number;
}

/** After a stagger, seconds before a boss swings back (if its target is in reach). */
const RETORT_DELAY = 0.25;

/**
 * A boss: heavy poise, a slow heavy turn, a rotation of attacks, a leap to close distance and a roar (CHARGE) when
 * the fight begins. The cutscene plays the roar through `playIntro`.
 */
export class Boss extends Enemy {
  protected tuning: BossTuning;
  private attackChoice = 0;
  /** Time since its last attack ended (s). */
  private attackTimer = 0;
  public hasRoared = false;

  constructor(id: string, color: number, tuning: BossTuning) {
    super(id, color);
    this.isBoss = true;
    this.heavyPoise = true;
    this.tuning = tuning;
    this.turnRate = 3.5;
    // Heavy: its turns wind up and settle slowly, it gathers and sheds speed slowly, and it sticks to a choice longer.
    this.turnAccel = 12;
    this.accel = 6;
    this.decel = 10;
    this.dwell = 0.5;
  }

  /** The roar (or its like) for the cutscene; returns its length. */
  public override playIntro(): number {
    this.hasRoared = true;
    if (!this.hasClip('CHARGE')) return 0;
    this.stateMachine.changeState('CHARGE');
    this.onRoar();
    return this.stateMachine.CHARGE_DURATION;
  }

  /**
   * A boss with an authored entrance (a clip of its own, played by `playIntro`) gives its length and marks, so the
   * cutscene can be cut to it; null for the usual roar.
   */
  public scriptedEntrance(): { duration: number; marks: Record<string, number> } | null {
    return null;
  }

  /** The cutscene ended or was skipped: whatever the intro left half done is put right. */
  public settleIntro(): void {
    this.hasRoared = true;
  }

  /** The roar ends by itself (in cutscenes nothing else would end it). */
  public override update(dt: number): void {
    super.update(dt);
    const sm = this.stateMachine;
    if (sm.currentState === 'CHARGE' && sm.stateTime >= sm.CHARGE_DURATION) sm.changeState('IDLE');
  }

  /** Sound and dust for the roar. */
  protected onRoar(): void {
    this.soundFX.playRoar(this.bodyHeight > 3 ? 0.8 : 1);
  }

  /** Its next attack in rotation (the states its rig has); an answer to a run of blocked blows is its quickest, not its string. */
  protected chooseAttack(): CharacterState {
    let options = (['ATTACK_1', 'ATTACK_2', 'ATTACK_3'] as CharacterState[]).filter((s) => this.hasClip(s) || !this.rig);
    if (this.counterNext) {
      const quick = options.filter((s) => s !== 'ATTACK_3');
      if (quick.length) options = quick;
      this.counterNext = false;
      // Struck from behind a moment ago: the wide cut, a backhand across where he stands.
      if (this.guard?.flanked && options.includes('ATTACK_2')) return 'ATTACK_2';
    }
    this.attackChoice = (this.attackChoice + 1) % options.length;
    return options[this.attackChoice];
  }

  /** Its next blow is due now (an answer). */
  protected override readyNow(): void {
    this.attackTimer = this.tuning.attackInterval;
  }

  /** Extra behaviour before the melee loop (phase changes, ranged attacks); true when it took the step. */
  protected specialAction(_dt: number, _distance: number): boolean {
    return false;
  }

  public override updateAI(dt: number, target: FightTarget): void {
    const state = this.stateMachine.currentState;
    if (state === 'DEAD') return;
    if (state === 'POSTURE_BROKEN' || state === 'DEFLECTED' || state === 'STAGGER') {
      // Staggered, it answers almost as soon as it recovers instead of resting a full interval (a deflection or
      // a posture break is the opening that buys real time).
      if (state === 'STAGGER') this.attackTimer = Math.max(this.attackTimer, this.tuning.attackInterval - RETORT_DELAY);
      this.updateProceduralAnimations(dt, 0);
      return;
    }

    const toTarget = new THREE.Vector3().subVectors(target.getPosition(), this.getPosition()).setY(0);
    const distance = toTarget.length();
    if (distance > 0.1 && this.mayTrack() && state !== 'CHARGE') {
      this.faceTarget(this.bearingTo(toTarget, distance), dt);
    }
    if (state !== 'ATTACK_JUMP') this.rootMotionScale = 1;

    if (state.startsWith('ATTACK')) {
      if (!this.rigDrivesMotion(state)) this.applyLunge(dt);
      this.updateProceduralAnimations(dt, 0);
      return;
    }
    if (state === 'SHOVE') {
      this.updateShove(dt);
      return;
    }
    // The roar and casts play out where it stands.
    if (state === 'CHARGE') {
      if (this.stateMachine.stateTime >= this.stateMachine.CHARGE_DURATION) this.stateMachine.changeState('IDLE');
      return;
    }
    if (state === 'CAST') {
      this.updateProceduralAnimations(dt, 0);
      return;
    }
    if (target.isDown()) {
      this.settle('IDLE');
      return;
    }
    if (!this.hasRoared && distance <= this.tuning.roarRange) {
      this.playIntro();
      return;
    }
    if (this.specialAction(dt, distance)) return;

    // The attack timer keeps running while it repositions, and once ready it swings at anyone in reach, so
    // crowding it cannot keep it from attacking. Kept at a distance, it leaps.
    this.attackTimer += dt;
    const { attackInterval, strikeRange, tooClose, leapRange, leapMax } = this.tuning;
    // Guarding, or answering a run of blows: before anything else it might do (combat/Guard.ts).
    if (this.guard) {
      const action = this.guard.step(dt, this.guardView(target, toTarget, distance, Math.max(0, attackInterval - this.attackTimer), distance <= strikeRange));
      if (action === 'hold') {
        this.holdGuard(dt);
        return;
      }
      if (this.answer(action)) {
        this.updateProceduralAnimations(dt, 0);
        return;
      }
    }
    const ready = this.attackTimer >= attackInterval && !this.guard?.settling;
    const mode = this.chooseMoveMode(distance, strikeRange, tooClose, dt);
    const leapClip = this.rig?.definition.states.ATTACK_JUMP;
    if (ready && distance > leapRange && distance <= leapMax && leapClip) {
      this.attackTimer = 0;
      this.particleFX.spawnDustPuff(this.getPosition(), 18);
      // Stretch the leap so it comes down just short of the target.
      const travel = this.rig!.clipInfo(leapClip.clip)?.rootMotion?.samples.at(-1);
      const scale = this.rig!.definition.scale ?? 1;
      const clipReach = travel ? Math.hypot(travel[0], travel[1]) * scale : 2.4;
      this.rootMotionScale = THREE.MathUtils.clamp((distance - this.lungeSpec.stopDist) / clipReach, 1, 3.5);
      this.stateMachine.changeState('ATTACK_JUMP');
    } else if (ready && distance <= strikeRange) {
      this.attackTimer = 0;
      this.stateMachine.changeState(this.chooseAttack());
      this.planLunge(distance);
      this.updateProceduralAnimations(dt, 0);
    } else if (mode === 'approach') {
      this.steer(toTarget.normalize(), this.moveSpeed, dt);
      this.settle('MOVE');
      this.updateProceduralAnimations(dt, 1);
    } else if (mode === 'retreat') {
      this.backOff(toTarget.normalize(), dt);
      this.updateProceduralAnimations(dt, 0.5);
    } else {
      this.circle(toTarget.normalize(), dt);
      this.updateProceduralAnimations(dt, 0);
    }
  }
}

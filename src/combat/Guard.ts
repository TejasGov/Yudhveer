import * as THREE from 'three';
import type { CharacterStateMachine } from '../entities/CharacterStateMachine';
import { closestPointsSegments } from './HitboxManager';

/*
 * How a boss fights back against the one who will not stop hitting it (docs/STORY.md, "Bosses fight back"). The user
 * played it: slide past a boss, stand behind it and spam the attack, and it just stood there. Three answers, all of them
 * the boss's own weapon and body, none of them a number on its health:
 *
 * - It turns on him. Struck from behind or the flank, or with him swinging at its back, it pivots to face him at about
 *   twice its usual rate (still a turn with weight: `Character.turnToward`, three times the acceleration, as Shalva squares
 *   up to the hero as he sinks), and not while it is winding up a blow of its own (a slide behind it still beats a swing).
 * - It guards. Seeing his swing begin, a free boss may raise its weapon across its body (the BLOCK state, the Great Sword
 *   Pack's guard) and turn his blows aside: no damage, a little posture, a clang and sparks along the blade, and the hero's
 *   weapon bounces off. The chance rises with every blow it has taken lately (`pressure`), more for one from behind. It
 *   never guards while it is winding up, swinging, casting or recovering from a blow of its own (those are the openings
 *   timing finds), nor while its next blow is due, and a guard that has been up a while comes down and stays down a while
 *   (`cooldown`). Heavy blows (a finisher, a charged blow, the leaping strike) break it.
 * - It answers. After two or three blows in a row on its guard it strikes back: its quickest blow, or a kick that sends the
 *   hero back, both with the wind-up their clips have (never under half a second). Hit again and again without it
 *   guarding, it answers too (`snap`).
 *
 * This file is the boss's judgement: when to turn, guard, drop the guard and answer. What a block does (the sparks, the
 * sound, the hero's recoil) is CombatSystem's and HitFeel's.
 */

/** How a boss guards, and how much; every number is one boss's own (see its constructor). */
export interface GuardSpec {
  /** Chance of raising the guard against a swing of his when it has taken nothing lately; added per blow of pressure; the most. */
  base: number;
  perBlow: number;
  max: number;
  /** Seconds a blow is remembered (the pressure it adds falls off with this time constant). */
  memory: number;
  /** Seconds the guard stays up with no blow on it; a blow on it keeps it up to at least `extend`; never past `longest`. */
  hold: number;
  extend: number;
  longest: number;
  /** Seconds after lowering the guard before it may raise it again, and after it is broken. */
  cooldown: number;
  broken: number;
  /** Seconds after a blow of its own ends in which it cannot guard (the opening a well-timed blow finds). */
  recovery: number;
  /** It does not raise the guard when its own next blow is due within this many seconds. */
  window: number;
  /** Seconds from seeing his swing begin to the guard starting to rise. */
  react: number;
  /** He is "swinging at it" within this ground distance (m), centre to centre. */
  reach: number;
  /** Blocked blows in a row after which it answers: a whole number of them, at random from min to max. */
  answerAfter: [number, number];
  /** Of its answers, the share that is the kick (when he is close enough and its rig has one), the rest its quickest blow. */
  shove: number;
  /** Ground distance (m) within which the kick can answer. */
  shoveRange: number;
  /** Pressure at which it answers without waiting to guard (a run of blows it did not guard). */
  snap: number;
  /** Share of a blocked blow's damage (a small chip, or none) and of its posture damage that gets through. */
  chip: number;
  posture: number;
  /** What rings when it is struck: steel on steel, iron (a gada, a cleaver), or claw on steel. */
  ring: 'steel' | 'iron' | 'claw';
}

/** A guard a boss has unless its constructor says otherwise. */
export const DEFAULT_GUARD: GuardSpec = {
  base: 0.12, perBlow: 0.2, max: 0.7, memory: 2.6,
  hold: 0.85, extend: 0.7, longest: 1.6,
  cooldown: 1.5, broken: 2.6, recovery: 0.7, window: 0.45,
  react: 0.1, reach: 4, answerAfter: [2, 3], shove: 0.4, shoveRange: 2.8, snap: 3.4,
  chip: 0, posture: 0.5, ring: 'steel',
};

/** What the hero is doing to it, as far as the guard cares (`Player.swing`). */
export interface HeroSwing {
  /** One number per swing (a chained blow is a new one). */
  id: number;
  /** Seconds until his blade's first strike window opens (0 once it has). */
  until: number;
  /** A finisher or a charged blow: one that breaks a guard. */
  heavy: boolean;
}

export type GuardAction = 'none' | 'hold' | 'counter' | 'shove';

/** What the guard sees of the boss it belongs to, each step. */
export interface GuardView {
  /** Ground distance to the hero (m), and the angle between where it faces and where he is (0 to PI). */
  distance: number;
  off: number;
  swing: HeroSwing | null;
  heroDown: boolean;
  /** Seconds until its own next blow is due (0: due), and whether he is within its reach to strike. */
  readyIn: number;
  inReach: boolean;
  /** Free to guard: standing, walking or circling, not winding up, swinging, casting, roaring, diving or hurt. */
  free: boolean;
}

/** What the guard needs of its owner (`Enemy`). */
export interface GuardHost {
  readonly stateMachine: CharacterStateMachine;
  readonly group: THREE.Object3D;
  getPosition(): THREE.Vector3;
  getWeaponPoints(): { tip: THREE.Vector3; hilt: THREE.Vector3 };
  /** Its posture bar starts over when a break ends (a boss that fights back is not left standing broken: `Character.renewsPosture`). */
  renewsPosture: boolean;
  /** Its guard just went up (a sound). */
  onGuardRaised(): void;
}

/** The front arc a guard covers (radians either side of where it faces). */
export const GUARD_ARC = THREE.MathUtils.degToRad(80);
/** The guard counts as up this long after the state begins: the raise takes a moment, and a blow inside it lands. */
const RAISED_AT = 0.12;
/** An answer waits this long after the block that earned it: the hero's weapon is still bouncing back. */
const ANSWER_DELAY = 0.42;
/** After an answer, none for this long (a run of blows is not answered every other second). */
const ANSWER_COOLDOWN = 2.4;
/** A blow it takes adds this much pressure; one from behind or the flank, more; one on its guard, less. */
const STRUCK = 1;
const STRUCK_FLANK = 1.5;
const BLOCKED = 0.5;
/** The quick turn: how long it lasts after a blow from behind (s), how far off its facing counts as behind (rad). */
const ALARM_TIME = 1.4;
const BEHIND = THREE.MathUtils.degToRad(105);
/** He is "at its back" within this ground distance (m), and swinging, or this close (m) standing. */
const ALARM_RANGE = 4.6;
const ALARM_CLOSE = 3.0;
/** He must be there this long (s) before it turns on him for merely standing behind it. */
const ALARM_AFTER = 0.25;
/** A blow from behind is "just now" for this long (s): the answer to it is a backhand. */
const FLANK_MEMORY = 2.5;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

const wrap = (a: number) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

export class Guard {
  public spec: GuardSpec;
  /** Blows it has taken lately, weighted (decays with `spec.memory`). */
  public pressure = 0;
  /** Blows turned aside in this guard, and how many it will take before it answers. */
  public blocks = 0;
  private need = 3;
  /** Seconds the guard has been up, and how much longer it will stay. */
  public raisedFor = 0;
  private holdLeft = 0;
  private cooldown = 0;
  private answerCooldown = 0;
  /** Seconds since a blow of its own ended (`attackEnded`; counted while it is free). */
  private sinceAttack = 99;
  /** Seconds until the guard starts to rise (it has seen a swing and chosen to meet it), -1 if it has not. */
  private wantUp = -1;
  /** The last swing of his it chose about. */
  private seen = -1;
  private alarm = 0;
  private behindFor = 0;
  /** Seconds since a blow of his struck it from outside its front arc (an answer to that is the wide cut, a backhand). */
  private sinceFlank = 99;
  /** What it will do once the blow that earned it has bounced off, and in how long. */
  private answer: 'counter' | 'shove' | null = null;
  private answerWait = 0;
  /** Tallies for the playtest and the dev tools. */
  public readonly tally = { raised: 0, blocked: 0, broken: 0, answers: 0, shoves: 0 };

  constructor(private readonly host: GuardHost, spec: Partial<GuardSpec> = {}) {
    this.spec = { ...DEFAULT_GUARD, ...spec };
    host.renewsPosture = true;
  }

  /** Whether it is turning on him (quickly) now. */
  public get alarmed(): boolean {
    return this.alarm > 0;
  }

  /** The guard is raised (or taking a blow): the pose is up, whether or not it will turn a blow aside yet. */
  public isUp(): boolean {
    const state = this.host.stateMachine.currentState;
    return state === 'BLOCK' || state === 'BLOCK_HIT';
  }

  /** Where the hero stands is within the front arc the guard covers. */
  public covers(heroPos: THREE.Vector3): boolean {
    const p = this.host.getPosition();
    const off = wrap(Math.atan2(heroPos.x - p.x, heroPos.z - p.z) - this.host.group.rotation.y);
    return Math.abs(off) <= GUARD_ARC;
  }

  /**
   * A blow of his lands on it. 'block': a light blow turned aside. 'break': a heavy one (`heavy`) into a raised guard.
   * null: the guard is not up (yet), or he is round its side.
   */
  public meet(heavy: boolean, heroPos: THREE.Vector3): 'block' | 'break' | null {
    if (!this.isUp() || this.raisedFor < RAISED_AT || !this.covers(heroPos)) return null;
    return heavy ? 'break' : 'block';
  }

  /** Where his blade met its weapon (world), into `out`: the closest points of the two, or on his blade nearest it. */
  public contactPoint(hero: { getWeaponPoints(): { tip: THREE.Vector3; hilt: THREE.Vector3 } }, fallback: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    const mine = this.host.getWeaponPoints();
    const his = hero.getWeaponPoints();
    const gap = Math.sqrt(closestPointsSegments(his.hilt, his.tip, mine.hilt, mine.tip, _a, _b));
    // Close: the middle between them. Far (its weapon is held away from where his struck): on his blade, drawn toward it.
    return gap < 0.9 ? out.copy(_a).lerp(_b, 0.5) : out.copy(fallback).lerp(_b, 0.35);
  }

  /** A blow of his turned aside: the guard holds, jolts and counts; after enough of them it answers. */
  public blocked(): void {
    const sm = this.host.stateMachine;
    this.tally.blocked++;
    this.blocks++;
    this.pressure += BLOCKED;
    this.holdLeft = Math.min(this.spec.longest - this.raisedFor, Math.max(this.holdLeft, this.spec.extend));
    sm.changeState('BLOCK_HIT');
    sm.guardHeld = true;
    if (!this.answer && this.blocks >= this.need) {
      this.answer = this.chooseAnswer();
      this.answerWait = ANSWER_DELAY;
    }
  }

  /**
   * A blow of his lands (it was not guarding, or could not): it remembers; from behind, it turns on him. The blows that fall on
   * it while it is staggered, broken or knocked aside are the price of that, not pressure to answer: they count for nothing.
   */
  public struck(heroPos: THREE.Vector3): void {
    const state = this.host.stateMachine.currentState;
    if (state === 'STAGGER' || state === 'POSTURE_BROKEN' || state === 'DEFLECTED' || state === 'DEAD') return;
    const flank = !this.covers(heroPos);
    this.pressure += flank ? STRUCK_FLANK : STRUCK;
    if (flank) {
      this.alarm = Math.max(this.alarm, ALARM_TIME);
      this.sinceFlank = 0;
    }
  }

  /** It was struck from behind or the flank within the last couple of seconds: it answers with a backhand, its wide cut. */
  public get flanked(): boolean {
    return this.sinceFlank < FLANK_MEMORY;
  }

  /**
   * Every simulation step, whatever it is doing (staggered, broken, swinging): what it remembers fades and its waits run down. (Only
   * counted while it was free, a stagger or a posture break would leave its memory of a spammer as full as it was.)
   */
  public tick(dt: number): void {
    this.pressure *= Math.exp(-dt / this.spec.memory);
    if (this.pressure < 0.01) this.pressure = 0;
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.answerCooldown > 0) this.answerCooldown -= dt;
    if (this.alarm > 0) this.alarm -= dt;
    this.sinceAttack += dt;
    this.sinceFlank += dt;
  }

  /** A blow of its own (a swing, a cast, the kick) has just ended: the opening after it begins. */
  public attackEnded(): void {
    this.sinceAttack = 0;
  }

  /** A heavy blow broke the guard. */
  public broke(): void {
    this.tally.broken++;
    this.release(this.spec.broken);
  }

  /** Dev and tests: forgets everything (a retry, a scene). */
  public reset(): void {
    this.pressure = 0;
    this.blocks = 0;
    this.cooldown = 0;
    this.answerCooldown = 0;
    this.sinceAttack = 99;
    this.wantUp = -1;
    this.seen = -1;
    this.alarm = 0;
    this.behindFor = 0;
    this.sinceFlank = 99;
    this.answer = null;
    this.answerWait = 0;
    this.host.stateMachine.guardHeld = false;
  }

  /**
   * One step of its judgement, before it chooses a blow of its own. 'hold': the guard is up and it stays planted;
   * 'counter' and 'shove': it answers now (the guard is down); 'none': carry on as usual.
   */
  public step(dt: number, v: GuardView): GuardAction {
    const sm = this.host.stateMachine;
    this.watchBack(dt, v);

    if (this.isUp()) return this.holding(dt, v);
    this.raisedFor = 0;
    sm.guardHeld = false;
    if (!v.free || v.heroDown) {
      this.wantUp = -1;
      return 'none';
    }
    // It has seen a swing and chosen to meet it: the guard goes up after a moment's reaction.
    if (this.wantUp >= 0) {
      this.wantUp -= dt;
      if (this.wantUp < 0 && this.mayGuard(v)) {
        this.raise();
        return 'hold';
      }
    }
    const swing = v.swing;
    if (swing && swing.id !== this.seen && v.distance <= this.spec.reach) {
      this.seen = swing.id;
      if (this.mayGuard(v) && Math.random() < this.chance()) this.wantUp = this.spec.react;
    }
    // A run of blows it did not guard: it answers anyway.
    if (this.pressure >= this.spec.snap && this.answerCooldown <= 0 && v.inReach && v.off <= GUARD_ARC) {
      this.pressure *= 0.35;
      this.answerCooldown = ANSWER_COOLDOWN;
      const action = this.chooseAnswer();
      this.tally.answers++;
      if (action === 'shove') this.tally.shoves++;
      return action;
    }
    return 'none';
  }

  // ------------------------------------------------------------------------------------------------ Internals

  /** The chance it meets a swing of his with the guard now. */
  private chance(): number {
    return THREE.MathUtils.clamp(this.spec.base + this.spec.perBlow * this.pressure, 0, this.spec.max);
  }

  /** Whether it is in a position to guard: not just after a blow of its own, not about to make one, facing him. */
  private mayGuard(v: GuardView): boolean {
    return this.cooldown <= 0 && this.sinceAttack >= this.spec.recovery && v.readyIn >= this.spec.window && v.off <= GUARD_ARC && v.free;
  }

  private raise(): void {
    const sm = this.host.stateMachine;
    sm.changeState('BLOCK');
    sm.guardHeld = true;
    this.holdLeft = this.spec.hold;
    this.raisedFor = 0;
    this.blocks = 0;
    this.need = this.spec.answerAfter[0] + Math.floor(Math.random() * (this.spec.answerAfter[1] - this.spec.answerAfter[0] + 1));
    this.answer = null;
    this.answerWait = 0;
    this.wantUp = -1;
    this.tally.raised++;
    this.host.onGuardRaised();
  }

  /** The guard is up: it stays planted until its time is out, he leaves, its own blow is due, or its answer is. */
  private holding(dt: number, v: GuardView): GuardAction {
    this.raisedFor += dt;
    this.holdLeft -= dt;
    if (this.answer) {
      this.answerWait -= dt;
      if (this.answerWait <= 0) {
        const action = this.answer;
        this.tally.answers++;
        if (action === 'shove') this.tally.shoves++;
        this.answerCooldown = ANSWER_COOLDOWN;
        this.release(this.spec.cooldown);
        return action;
      }
      return 'hold';
    }
    if (v.heroDown || v.distance > this.spec.reach + 1.4 || this.holdLeft <= 0 || this.raisedFor >= this.spec.longest) {
      this.release(this.spec.cooldown);
      return 'none';
    }
    // Its own next blow is due and he is in reach: the guard goes into it.
    if (v.readyIn <= 0 && v.inReach) {
      this.release(this.spec.cooldown);
      return 'none';
    }
    return 'hold';
  }

  /** The guard comes down (or was broken): back to its stance, and not again for `cooldown` seconds. */
  private release(cooldown: number): void {
    const sm = this.host.stateMachine;
    sm.guardHeld = false;
    if (this.isUp()) sm.changeState('IDLE');
    this.cooldown = cooldown;
    this.answer = null;
    this.wantUp = -1;
    this.raisedFor = 0;
  }

  /** The kick when he is close and it has one, else its quickest blow. */
  private chooseAnswer(): 'counter' | 'shove' {
    return Math.random() < this.spec.shove && this.canShove ? 'shove' : 'counter';
  }

  /** Set by the owner: it has a kick (its rig has the clip) and he is within its range (see `Enemy`). */
  public canShove = false;

  /** He is at its back: after a moment of that, or with him swinging, it turns on him. */
  private watchBack(dt: number, v: GuardView): void {
    const at = v.off > BEHIND && v.distance < ALARM_RANGE && !v.heroDown && (v.swing !== null || v.distance < ALARM_CLOSE);
    this.behindFor = at ? this.behindFor + dt : Math.max(0, this.behindFor - dt * 2);
    if (this.behindFor >= ALARM_AFTER) this.alarm = Math.max(this.alarm, ALARM_TIME * 0.6);
  }
}

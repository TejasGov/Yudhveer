import * as THREE from 'three';
import { Boss } from './Boss';
import type { CharacterState } from './CharacterStateMachine';
import type { FightTarget } from './Enemy';
import { CharacterRig, type CharacterDefinition } from './animation/CharacterRig';
import { asset } from '../core/Assets';
import { disposeObject } from '../levels/GLBLevel';
import { createToonRamp, toonifyModel } from '../levels/environment/ToonRelight';
import { PhysicsWorld } from '../core/PhysicsWorld';
import type RAPIER from '@dimforge/rapier3d-compat';
import {
  AxeMotion, AXE_WINDOWS, AXE_TIP, AXE_HEEL, AXE_POMMEL, HOLD_ROTATION, isAxeAttack, recallPath, recallTime, type AxeAttack, type AxeCues,
} from '../combat/ChainAxeMotion';
import { AxeChain, HELD_DISTANCE } from '../combat/AxeChain';
import { AxeBody, type BodyLayer } from '../combat/AxeBody';
import { AxeFX, bladeHeat } from '../combat/AxeFX';
import { DrivenRibbon, trailLook } from '../combat/SlashRibbon';
import type { HeroRead } from '../combat/Tactics';

/** The head's collision sphere (axe-local centre, radius): on the curved head toward its point, small enough that only
 * real rock stops it (audit L4: the old 0.4 m ball round the haft cancelled blows beside pillars). */
const HEAD = new THREE.Vector3(-0.32, 0.5, 0);
const HEAD_RADIUS = 0.27;
/** The fire trail's inner end, down the haft (axe-local): the ribbon spans most of the head. */
const TRAIL_INNER = new THREE.Vector3(-0.2, 0, 0);
/** The fire runs from this long before a strike window to this long after it (s). */
const FIRE_LEAD = 0.1;
const FIRE_TAIL = 0.4;
/** The floor probe: from this high above the head, down; a lift beyond the last is an overhang, not the floor. */
const FLOOR_PROBE = 1.2;
const FLOOR_MAX_LIFT = 0.55;
/** A hit whose surface faces up more than this is floor, not a wall. */
const FLOOR_NORMAL = 0.6;
/** Embers shed per second along the blade at full heat (plus some per m/s of the blade), and smouldering at the top. */
const EMBERS_BASE = 22;
const EMBERS_PER_SPEED = 1.5;
const EMBERS_MAX = 70;
const EMBERS_COILED = 16;
/** A scrape throws its sparks at most this often (s). */
const SCRAPE_EVERY = 0.07;
/** The interrupted recall's arc (boss-local direction, metres per metre). */
const RECALL_BULGE = [0.2, 0.8, 0] as const;
/** The catch's recoil of the right hand (boss-local metres at its peak) and how long it lasts (s). */
const CATCH_RECOIL = new THREE.Vector3(0.02, 0.06, -0.17);
const CATCH_SPAN = 0.28;

const CUE_WHIP = 1, CUE_STOP = 2, CUE_RECALL = 4, CUE_HOME = 8, CUE_FLOOR = 16;
const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };
const DOWN = { x: 0, y: -1, z: 0 };
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _u = new THREE.Vector3();

/**
 * The keeper before the island's sealed mace room: a chained, burning axe thrown like the Blades of Chaos. She winds
 * up with her whole body (combat/AxeBody.ts), holds it coiled for a beat, whips it out on its chain along one long
 * curve (combat/ChainAxeMotion.ts), lets the chain stop it or the floor take it, and snaps it back into her hand. The
 * chain is a light rope (combat/AxeChain.ts); the blade burns, sheds embers and strikes sparks and fire off the rock
 * (combat/AxeFX.ts, the 'fire' trail of combat/SlashRibbon.ts).
 *
 * The travelling blade is the only damaging part. CombatSystem sees the usual swept blade segment in its strike
 * windows and applies its existing guard, parry, slide and posture code. Real rock (a Rapier sphere sweep, walls only)
 * cancels the rest of a blow and recalls the axe; the floor only ever holds the blade up (the slam lands on it).
 * The axe and chain are posed per simulation step and drawn between steps (`renderUpdate`, audit M2).
 */
export class BossIslandDemoness extends Boss {
  private readonly axe = new THREE.Group();
  private readonly chain = new AxeChain();
  private readonly tether = this.chain.mesh;
  private readonly motion = new AxeMotion();
  private readonly body = new AxeBody();
  private readonly fx = AxeFX.get();
  private readonly trail: DrivenRibbon;
  private readonly fireLook = trailLook('fire', false);
  private readonly cues: AxeCues = { apex: 0, whip: 0, stop: 0, recall: 0, home: 0, settled: 0, plants: false };
  private readonly hand = new THREE.Vector3(0.8, 2.1, 0.3);
  private readonly bladeTip = new THREE.Vector3();
  private readonly bladeHilt = new THREE.Vector3();
  private readonly physics = PhysicsWorld.getInstance();
  private ball: RAPIER.Ball | null = null;
  private readonly previousHead = new THREE.Vector3();
  private readonly head = new THREE.Vector3();
  private readonly origin = new THREE.Vector3();
  private readonly travel = new THREE.Vector3();
  private readonly contact = new THREE.Vector3();
  private readonly contactNormal = new THREE.Vector3();
  private readonly recallPosition = new THREE.Vector3();
  private readonly recallRotation = new THREE.Quaternion();
  private readonly chainEnd = new THREE.Vector3();
  // The blade's edge (world) this step and last: the trail, the embers and the FX's directions.
  private readonly edgeTip = new THREE.Vector3();
  private readonly edgeInner = new THREE.Vector3();
  private readonly lastTip = new THREE.Vector3();
  private readonly lastInner = new THREE.Vector3();
  private hasEdge = false;
  // Render interpolation (audit M2): the axe's pose at the last two steps.
  private readonly axePrev = new THREE.Vector3();
  private readonly axeCurr = new THREE.Vector3();
  private readonly quatPrev = new THREE.Quaternion();
  private readonly quatCurr = new THREE.Quaternion();
  // The body's layers: what the attack asks for, eased out after it.
  private readonly layer: BodyLayer = { twist: 0, lean: 0, lunge: 0, rise: 0, legs: 0 };
  private readonly keyed = { twist: 0, lean: 0, lunge: 0, rise: 0, legs: 0, heat: 0 };
  private readonly armTarget = new THREE.Vector3();
  private armWeight = 0;
  private heat = 0;
  private socket: THREE.Object3D | null = null;
  private socketRig: CharacterRig | null = null;
  private setBladeHeat: ((heat: number) => void) | null = null;
  private poseState: CharacterState = 'IDLE';
  private poseTime = 0;
  private recallTime = 0;
  private recallSpan = 0.35;
  private recalling = false;
  private obstructed = false;
  private hasPreviousHead = false;
  private attackReach = 2.5;
  private closeAttack = false;
  private fired = 0;
  private scrapeClock = 0;
  private caughtAt = -1;
  private target: FightTarget | null = null;
  private targetHealth = NaN;
  private targetGuarding = false;

  constructor(id = 'island_demoness') {
    super(id, 0x5f3430, { attackInterval: 2.1, strikeRange: 4.8, tooClose: 1.5, leapRange: 100, leapMax: 100, roarRange: 0 });
    this.displayName = 'Spider Demoness'; this.epithet = 'Keeper of the sealed shrine';
    this.maxHealth = this.currentHealth = 480; this.maxMarma = 130; this.renewsPosture = true;
    this.damageScale = 0.65; this.moveSpeed = 1.3; this.turnRate = 2.8; this.hasRoared = true;
    this.lungeSpec = { a: 0, b: 0, maxDist: 0, stopDist: 1.5 };
    this.axe.name = 'TravellingChainAxe';
    this.group.add(this.axe, this.tether);
    // Her trail burns, and is stepped after the axe is posed (a trail stepped first would lag the blade a step).
    this.trail = new DrivenRibbon(0xff6a1a, 0.72);
    this.trail.live = (tip, hilt) => this.trailEdgeNow(tip, hilt);
    this.slashRibbon = this.trail;
    this.chain.stow(this.hand);
    this.poseAxe(0);
    this.axePrev.copy(this.axeCurr);
    this.quatPrev.copy(this.quatCurr);
  }

  public override async attachRig(definition: CharacterDefinition): Promise<CharacterRig> {
    const rig = await super.attachRig(definition);
    const prop = await CharacterRig.loadProp(asset('weapons/island_chain_axe.glb'));
    if (this.retired) { disposeObject(prop); return rig; }
    toonifyModel(prop, createToonRamp([0.18, 0.46, 0.8, 1]));
    this.setBladeHeat = bladeHeat(prop);
    // Grip at the actual handle, above the decorative tail. Hit points cover the curved head, not the shaft.
    prop.position.set(-0.1, -0.72, 0);
    const old = this.swordMesh;
    old.removeFromParent(); disposeObject(old);
    this.axe.add(prop); this.swordMesh = this.axe;
    return rig;
  }

  public override hitWindows(state: CharacterState = this.stateMachine.currentState) {
    if (state === this.stateMachine.currentState && this.obstructed) return [];
    return AXE_WINDOWS[state as keyof typeof AXE_WINDOWS] ?? [];
  }

  protected override chooseAttack(_read: HeroRead | null = null, distance = 0): CharacterState {
    this.counterNext = false;
    this.attackReach = THREE.MathUtils.clamp(distance, 1.65, 4.8);
    // A short slam at six metres could never connect. Keep the throw for range and alternate the close blows.
    if (distance > 3.1) return this.lastAttack = 'ATTACK_3';
    this.closeAttack = !this.closeAttack;
    return this.lastAttack = this.closeAttack ? 'ATTACK_1' : 'ATTACK_2';
  }

  public override trackUntil(): number {
    return 0.3; // Aim through the draw; from the top of the wind-up the blow keeps that heading.
  }

  /** Her swing's whoosh belongs to the whip-out, not to the start of the wind-up (AxeFX.whip). */
  protected override onStateChange(state: CharacterState, previous: CharacterState): void {
    if (state.startsWith('ATTACK')) return;
    super.onStateChange(state, previous);
  }

  public override updateAI(dt: number, target: FightTarget): void {
    this.target = target;
    super.updateAI(dt, target);
  }

  public override update(dt: number): void {
    this.axePrev.copy(this.axeCurr);
    this.quatPrev.copy(this.quatCurr);
    // The body's layers off again before the mixer (and HitReact) pose this step: they are laid on afresh after.
    this.body.restore();
    super.update(dt);
    this.poseAxe(dt);
  }

  /** Between two steps: the axe and its chain where they were `alpha` of the way through (audit M2). */
  public override renderUpdate(alpha: number): void {
    this.axe.position.lerpVectors(this.axePrev, this.axeCurr, alpha);
    this.axe.quaternion.slerpQuaternions(this.quatPrev, this.quatCurr, alpha);
    this.chain.draw(alpha);
  }

  public override renderRestore(): void {
    this.axe.position.copy(this.axeCurr);
    this.axe.quaternion.copy(this.quatCurr);
  }

  private poseAxe(dt: number): void {
    const sm = this.stateMachine;
    const state = sm.currentState, t = sm.stateTime;
    const attack = isAxeAttack(state);
    if (state !== this.poseState || t < this.poseTime) {
      if (attack) {
        this.motion.prepare(state, this.attackReach);
        this.motion.cue(this.cues);
        this.fx.glow(this.trail.mesh);
        this.fx.glow(this.tether);
        this.obstructed = false;
        this.recalling = false;
        this.fired = 0;
        this.scrapeClock = 0;
        this.caughtAt = -1;
      } else if (isAxeAttack(this.poseState) && this.axe.position.distanceTo(this.hand) > HELD_DISTANCE) {
        this.beginRecall();
      }
      this.poseState = state;
    }
    this.poseTime = t;
    this.layBody(dt, state, t, attack);
    this.readHand();
    if (this.recalling) {
      // Interrupted (a deflection, a stagger, rock, death): hauled straight home on the chain.
      const u = this.recallTime / this.recallSpan;
      recallPath(this.recallPosition, this.hand, u, RECALL_BULGE, 0.1, this.axe.position);
      this.axe.quaternion.slerpQuaternions(this.recallRotation, HOLD_ROTATION, THREE.MathUtils.smoothstep(u, 0, 0.7));
      this.recallTime += dt;
      if (u >= 1) {
        this.recalling = false;
        this.axe.position.copy(this.hand);
        this.axe.quaternion.copy(HOLD_ROTATION);
        if (state !== 'DEAD') this.fx.caught(this.worldOf(this.hand, _v), this.travel.set(0, 0, 0), 0.7);
      }
    } else if (attack && !this.obstructed) {
      this.motion.pose(state, t, this.hand, this.axe.position, this.axe.quaternion);
    } else {
      this.axe.position.copy(this.hand);
      this.axe.quaternion.copy(HOLD_ROTATION);
    }
    // Rock: only while the axe is out of her hand (audit L3: a held axe never pops off the hand beside a wall).
    if ((attack || this.recalling) && this.axe.position.distanceTo(this.hand) > 0.3) this.clipToCave(state, t, dt);
    else this.hasPreviousHead = false;
    // Audit L5: the axe stays out (and comes home) after a killing blow; only then is it put away.
    const shown = state !== 'DEAD' || this.recalling;
    this.axe.visible = this.tether.visible = shown;
    this.axe.updateMatrix();
    this.updateEdge(dt);
    this.burn(dt, state, t, attack, shown);
    // The chain: from the hand to the haft (the pommel once it is well out).
    const out = this.axe.position.distanceTo(this.hand);
    const pommel = THREE.MathUtils.smoothstep(out, 0.4, 1.4);
    this.chainEnd.copy(AXE_POMMEL).multiplyScalar(pommel).applyQuaternion(this.axe.quaternion).add(this.axe.position);
    this.chain.heat = this.heat;
    if (shown && out > HELD_DISTANCE) this.chain.step(dt, this.hand, this.chainEnd, this.slack(state, t, attack));
    else this.chain.step(dt, this.hand, this.hand, 0);
    this.chain.draw(1);
    this.axeCurr.copy(this.axe.position);
    this.quatCurr.copy(this.axe.quaternion);
    this.fx.step(dt);
  }

  /** The body's share of the blow (the attack's keyed layers), eased away when the attack ends or breaks off. */
  private layBody(dt: number, state: CharacterState, t: number, attack: boolean): void {
    if (attack) {
      this.motion.body(t, this.keyed);
      this.layer.twist = this.keyed.twist;
      this.layer.lean = this.keyed.lean;
      this.layer.lunge = this.keyed.lunge;
      this.layer.rise = this.keyed.rise;
      this.layer.legs = this.keyed.legs;
      this.heat = this.keyed.heat;
      this.armWeight = this.motion.arm(t, this.armTarget);
      // The catch jolts her hand back.
      if (this.caughtAt >= 0 && t >= this.caughtAt) {
        const k = (t - this.caughtAt) / CATCH_SPAN;
        if (k < 1) this.armTarget.addScaledVector(CATCH_RECOIL, Math.sin(Math.PI * Math.min(1, k * 1.6)) * (1 - k * 0.4));
      }
    } else {
      const k = Math.exp(-11 * dt);
      this.layer.twist *= k; this.layer.lean *= k; this.layer.lunge *= k; this.layer.rise *= k; this.layer.legs *= k;
      this.armWeight *= k;
      this.heat = Math.max(0, this.heat - dt * (state === 'DEAD' ? 2.5 : 1.2));
    }
    if (!this.rig || state === 'DEAD') return;
    if (!this.body.bind(this.rig.root)) return;
    this.body.apply(this.group, this.layer, this.armTarget, this.armWeight);
  }

  /** The right hand's socket, boss-local (after the body's layers). */
  private readHand(): void {
    if (this.rig !== this.socketRig) {
      this.socketRig = this.rig;
      this.socket = this.rig?.socket('Socket_Hand_R') ?? null;
    }
    if (!this.socket) return;
    this.socket.updateWorldMatrix(true, false);
    const e = this.socket.matrixWorld.elements;
    this.hand.set(e[12], e[13], e[14]);
    this.group.worldToLocal(this.hand);
  }

  /** How much spare chain hangs between hand and haft now (0: taut). */
  private slack(state: CharacterState, t: number, attack: boolean): number {
    if (!attack || this.recalling) return 0.06;
    const c = this.cues;
    if (t < c.whip) return 0.14;
    if (t < c.stop) return THREE.MathUtils.lerp(0.06, 0.015, (t - c.whip) / Math.max(0.01, c.stop - c.whip));
    if (t < c.stop + 0.06) return c.plants ? 0.1 : 0;
    if (t < c.recall) return c.plants ? 0.13 : 0.08;
    return 0.05;
  }

  private beginRecall(): void {
    this.recallPosition.copy(this.axe.position);
    this.recallRotation.copy(this.axe.quaternion);
    this.recallTime = 0;
    this.recallSpan = Math.max(0.25, recallTime(this.recallPosition.distanceTo(this.hand)));
    this.recalling = true;
    this.fx.reel(0.8);
  }

  /** Boss-local `local` in world space, into `out`. */
  private worldOf(local: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    return out.copy(local).applyMatrix4(this.group.matrixWorld);
  }

  /** The blade's burning edge now (world, from this step's pose) and its last step. */
  private updateEdge(dt: number): void {
    this.lastTip.copy(this.edgeTip);
    this.lastInner.copy(this.edgeInner);
    this.group.updateWorldMatrix(true, false);
    this.edgeTip.copy(AXE_TIP).applyMatrix4(this.axe.matrix).applyMatrix4(this.group.matrixWorld);
    this.edgeInner.copy(TRAIL_INNER).applyMatrix4(this.axe.matrix).applyMatrix4(this.group.matrixWorld);
    if (!this.hasEdge || dt <= 0) {
      this.lastTip.copy(this.edgeTip);
      this.lastInner.copy(this.edgeInner);
    }
    this.hasEdge = true;
    this.travel.subVectors(this.edgeTip, this.lastTip);
  }

  /** The fire trail's edge as it is drawn this frame (between steps). */
  private trailEdgeNow(tip: THREE.Vector3, inner: THREE.Vector3): void {
    this.axe.updateMatrix();
    tip.copy(AXE_TIP).applyMatrix4(this.axe.matrix).applyMatrix4(this.group.matrixWorld);
    inner.copy(TRAIL_INNER).applyMatrix4(this.axe.matrix).applyMatrix4(this.group.matrixWorld);
  }

  /** Heat, fire and the moments of the swing (once each per attack). */
  private burn(dt: number, state: CharacterState, t: number, attack: boolean, shown: boolean): void {
    this.setBladeHeat?.(shown ? this.heat : 0);
    const speed = dt > 0 ? this.travel.length() / dt : 0;
    // The trail: from just before the strike window to well after it, while the blade is out.
    let burning = false;
    if (attack && shown) {
      for (const w of AXE_WINDOWS[state as AxeAttack]) if (t >= w.t0 - FIRE_LEAD && t <= w.t1 + FIRE_TAIL) burning = true;
    }
    burning &&= this.axe.position.distanceTo(this.hand) > 0.5;
    this.trail.drive(this.edgeTip, this.edgeInner, burning, dt, this.fireLook);
    // Embers off the blade: a stream through the swing, a smoulder at the top of the wind-up.
    if (shown && this.heat > 0.05 && dt > 0) {
      const c = this.cues;
      let rate = 0;
      if (burning) rate = Math.min(EMBERS_MAX, EMBERS_BASE + EMBERS_PER_SPEED * speed) * Math.min(1, this.heat);
      else if (attack && t >= c.apex - 0.08 && t < c.whip) rate = EMBERS_COILED;
      else if (attack && t < c.settled) rate = 6 * this.heat;
      const n = this.emberDebt(rate * dt);
      if (n > 0) this.fx.shedAlong(this.lastTip, this.lastInner, this.edgeTip, this.edgeInner, n, dt);
    }
    // The hero struck: fire off the wound (or his guard), over the hit's own feel.
    this.watchTarget(state, t, attack);
    if (!attack || this.obstructed) return;
    const c = this.cues;
    const power = THREE.MathUtils.clamp(0.75 + speed / 40, 0.8, 1.3);
    if (!(this.fired & CUE_WHIP) && t >= c.whip) {
      this.fired |= CUE_WHIP;
      this.fx.whip(this.edgeTip, this.motionDir(_u), 1);
    }
    if (!(this.fired & CUE_STOP) && t >= c.stop) {
      this.fired |= CUE_STOP;
      if (!c.plants) this.fx.taut(this.edgeTip, this.motionDir(_u), state === 'ATTACK_3' ? 1.2 : 0.85);
      else if (!(this.fired & CUE_FLOOR)) {
        // The slam came down short of any floor the probe found: it lands where the clip put it.
        this.fired |= CUE_FLOOR;
        this.fx.floorStrike(this.edgeTip, this.motionDir(_u), 1, this.group.position.y);
      }
    }
    if (!(this.fired & CUE_RECALL) && t >= c.recall) {
      this.fired |= CUE_RECALL;
      this.fx.reel(1);
    }
    if (!(this.fired & CUE_HOME) && t >= c.home) {
      this.fired |= CUE_HOME;
      this.caughtAt = t;
      this.fx.caught(this.worldOf(this.hand, _v), this.motionDir(_u), power * 0.9);
    }
  }

  private emberOwed = 0;

  /** Whole embers due now for a fractional `amount`. */
  private emberDebt(amount: number): number {
    this.emberOwed += amount;
    const n = Math.floor(this.emberOwed);
    this.emberOwed -= n;
    return n;
  }

  /** The blade's travel this step (world), or her facing if it hardly moved. */
  private motionDir(out: THREE.Vector3): THREE.Vector3 {
    out.copy(this.travel);
    if (out.lengthSq() < 1e-6) out.set(Math.sin(this.group.rotation.y), 0, Math.cos(this.group.rotation.y));
    return out.normalize();
  }

  /** Her blade landed on the hero (his health fell in a strike window) or on his guard (he took it on the dhal). */
  private watchTarget(state: CharacterState, t: number, attack: boolean): void {
    const hero = this.target as unknown as { currentHealth?: number; stateMachine?: { currentState: string } } | null;
    if (!hero || hero.currentHealth === undefined) return;
    const health = hero.currentHealth;
    const guarding = hero.stateMachine?.currentState === 'BLOCK_HIT';
    let inWindow = false;
    if (attack) for (const w of AXE_WINDOWS[state as AxeAttack]) if (t >= w.t0 && t <= w.t1 + 0.05) inWindow = true;
    if (inWindow && (health < this.targetHealth || (guarding && !this.targetGuarding))) {
      this.fx.heroStrike(this.edgeTip, this.motionDir(_u), health >= this.targetHealth);
    }
    this.targetHealth = health;
    this.targetGuarding = guarding;
  }

  /**
   * Keeps the head out of the rock. The floor holds it up (a downward probe; the slam lands on it, the sweep scrapes
   * along it); a wall or a pillar (a Rapier sphere sweep along the chain from the hand and since the last step, faces
   * that are not floor) stops it, cancels the rest of the blow and recalls the axe from there. Fighter capsules and
   * sensors are excluded; they still use CombatSystem's parry, guard and body contact.
   */
  private clipToCave(state: CharacterState, t: number, dt: number): void {
    this.group.updateWorldMatrix(true, false);
    this.axe.updateMatrix();
    this.head.copy(HEAD).applyMatrix4(this.axe.matrix).applyMatrix4(this.group.matrixWorld);
    const { world, RAPIER_INSTANCE: R } = this.physics;
    if (world && R) {
      const ball = (this.ball ??= new R.Ball(HEAD_RADIUS));
      const flags = R.QueryFilterFlags.EXCLUDE_DYNAMIC | R.QueryFilterFlags.EXCLUDE_KINEMATIC | R.QueryFilterFlags.EXCLUDE_SENSORS;
      const start = _w.copy(this.head);
      let moved = false, floor = false, blocked = false;
      // 1. The floor under the head.
      this.origin.copy(this.head);
      this.origin.y += FLOOR_PROBE;
      const down = world.castShape(this.origin, IDENTITY, DOWN, ball, 0, FLOOR_PROBE, false, flags);
      if (down) {
        const centre = this.origin.y - down.time_of_impact;
        if (centre > this.head.y && centre - this.head.y < FLOOR_MAX_LIFT) {
          this.head.y = centre;
          floor = moved = true;
          this.contact.set(down.witness1.x, down.witness1.y, down.witness1.z);
        }
      }
      // 2. Walls: along the chain from the hand, and since the last step.
      this.worldOf(this.hand, this.origin);
      if (this.sweep(this.origin, ball, flags)) blocked = moved = true;
      if (this.hasPreviousHead && this.previousHead.distanceTo(this.head) < 3 && this.sweep(this.previousHead, ball, flags)) blocked = moved = true;
      if (moved) {
        // The axe follows its head (group-local).
        this.group.worldToLocal(_v.copy(start));
        this.group.worldToLocal(_u.copy(this.head));
        this.axe.position.add(_u.sub(_v));
        this.axe.updateMatrix();
      }
      const attack = isAxeAttack(state);
      const fast = this.hasPreviousHead && dt > 0 ? this.previousHead.distanceTo(this.head) / dt : 0;
      _u.subVectors(this.head, this.previousHead);
      if (blocked && attack && !this.obstructed) {
        this.obstructed = true;
        this.fx.wallStrike(this.contact, this.contactNormal, _u, THREE.MathUtils.clamp(fast / 12, 0.6, 1.3));
        this.beginRecall();
      } else if (floor && attack && !this.obstructed) {
        if (this.cues.plants && !(this.fired & CUE_FLOOR) && t >= this.cues.whip) {
          this.fired |= CUE_FLOOR;
          this.fx.floorStrike(this.contact, _u, THREE.MathUtils.clamp(fast / 14, 0.85, 1.35), this.contact.y);
        } else if (!this.cues.plants && fast > 4 && t - this.scrapeClock >= SCRAPE_EVERY) {
          this.scrapeClock = t;
          this.fx.scrape(this.contact, _u, THREE.MathUtils.clamp(fast / 18, 0.4, 1.1), this.contact.y);
        }
      }
    }
    this.axe.updateWorldMatrix(true, false);
    this.previousHead.copy(HEAD).applyMatrix4(this.axe.matrix).applyMatrix4(this.group.matrixWorld);
    this.hasPreviousHead = true;
  }

  /** A sphere sweep of the head from `from`; true (head clamped, contact kept) if it met a wall rather than floor. */
  private sweep(from: THREE.Vector3, ball: RAPIER.Ball, flags: number): boolean {
    const world = this.physics.world!;
    this.travel.subVectors(this.head, from);
    const length = this.travel.length();
    if (length < 1e-5) return false;
    this.travel.divideScalar(length);
    const hit = world.castShape(from, IDENTITY, this.travel, ball, 0, length, false, flags);
    if (!hit || hit.normal1.y > FLOOR_NORMAL) return false; // the floor: the probe has it
    this.head.copy(from).addScaledVector(this.travel, Math.max(0, hit.time_of_impact - 0.01));
    this.contact.set(hit.witness1.x, hit.witness1.y, hit.witness1.z);
    this.contactNormal.set(hit.normal1.x, hit.normal1.y, hit.normal1.z);
    return true;
  }

  public override getWeaponPoints() {
    this.group.updateWorldMatrix(true, false);
    this.axe.updateMatrix();
    return {
      tip: this.bladeTip.copy(AXE_TIP).applyMatrix4(this.axe.matrix).applyMatrix4(this.group.matrixWorld).clone(),
      hilt: this.bladeHilt.copy(AXE_HEEL).applyMatrix4(this.axe.matrix).applyMatrix4(this.group.matrixWorld).clone(),
    };
  }

  public override weaponSegmentInto(tip: THREE.Vector3, hilt: THREE.Vector3): void {
    this.group.updateWorldMatrix(true, false);
    this.axe.updateMatrix();
    tip.copy(AXE_TIP).applyMatrix4(this.axe.matrix).applyMatrix4(this.group.matrixWorld);
    hilt.copy(AXE_HEEL).applyMatrix4(this.axe.matrix).applyMatrix4(this.group.matrixWorld);
  }

  public override weaponTipInto(out: THREE.Vector3): THREE.Vector3 {
    this.group.updateWorldMatrix(true, false);
    this.axe.updateMatrix();
    return out.copy(AXE_TIP).applyMatrix4(this.axe.matrix).applyMatrix4(this.group.matrixWorld);
  }

  /** Dev and probes: what the axe is doing (the capture tools read it). */
  public axeProbe(): { heat: number; embers: number; shed: number; links: number; stretch: number; obstructed: boolean; recalling: boolean } {
    return { heat: this.heat, embers: this.fx.live, shed: this.fx.shed, links: this.tether.count, stretch: this.chain.stretch, obstructed: this.obstructed, recalling: this.recalling };
  }
}


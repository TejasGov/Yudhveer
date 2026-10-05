import * as THREE from 'three';
import { Character, type HitWindow } from './Character';
import { CharacterMotor } from '../physics/CharacterMotor';
import type { CharacterState } from './CharacterStateMachine';
import { SoundFX, type SwingKind, type ImpactKind } from '../combat/SoundFX';
import { ParticleFX } from '../combat/ParticleFX';
import type { BloodKind } from '../combat/BloodFX';

/** What an enemy's AI needs to know about the one it is fighting. */
export interface FightTarget {
  getPosition(): THREE.Vector3;
  /** Down: enemies stop pressing the attack. */
  isDown(): boolean;
}

const UP = new THREE.Vector3(0, 1, 0);
/** A running minion drops its route and fights when its target comes this close. */
const ROUTE_BREAK = 4;
/** A waypoint counts as reached within this distance (ground plane). */
const WAYPOINT_RADIUS = 0.6;

export class Enemy extends Character {
  protected soundFX = SoundFX.getInstance();
  protected particleFX = ParticleFX.getInstance();

  /** Shown on its health bar and on cutscene cards. */
  public displayName = 'Warrior';
  public epithet = '';
  /** Bosses get the large bar at the foot of the screen and a cutscene of their own. */
  public isBoss = false;
  /** How its weapon sounds: the whoosh of a swing, and the blow when it lands on the hero. */
  public swingSound: SwingKind = 'blade';
  public impactSound: ImpactKind = 'blade';
  /** What a blow draws from it (BloodFX, off until approved): red, a naga's ichor, a ghost's ash, or nothing. */
  public blood: BloodKind = 'red';
  /**
   * Waypoints to run along before joining the fight (minions crossing bridges), level coordinates. The AI follows
   * them and ignores its target until the last one, or until the target comes within `ROUTE_BREAK` metres.
   */
  public route: THREE.Vector3[] = [];
  /** Seconds to stand before setting off along `route`. */
  public routeDelay = 0;
  /** Where it entered the fight (feet): a boss that falls off the arena is put back here. */
  public readonly home = new THREE.Vector3();
  /** In its cutscene, seconds after `playIntro` starts that its name card should land (the peak of the beat). */
  public introCardDelay = 1.2;
  /** Light hits never make it flinch (bosses): only heavy blows, deflections and a posture break do. */
  public heavyPoise = false;
  /** Its blows deal this much more (or less) than the usual for its kind (CombatSystem's enemyBlow). */
  public damageScale = 1;
  /** Share of a light blow's damage that gets through while it is armoured (committed to an attack). */
  public armorDamage = 1;

  // AI timing
  private aiTimer = 0;
  protected attackCooldown = 2.4;
  protected isTelegraphing = false;
  protected telegraphDuration = 0.6;
  private telegraphTimer = 0;
  /** Turn rate while tracking the player (rad/s). */
  protected turnRate = 7;
  /** Swings from this far; walks in when further. */
  protected engageRange = 2.6;
  /** Backs off when the player is closer than this (and it is not ready to swing). */
  protected crowdRange = 1.4;
  /** Attacks it picks from, in turn (states its rig has; the greybox only knows ATTACK_1). */
  protected attackStates: CharacterState[] = ['ATTACK_1'];
  /** Chance that a swing chains into the next attack of the list (rigged enemies). */
  protected comboChance = 0;
  private attackIndex = 0;
  private chainFor: { state: CharacterState; t: number } | null = null;
  private circleDir: 1 | -1 = 1;
  private circleTimer = 0;
  /** The current attack's step-in: eased over [a, b] state seconds, covering `allow` metres and ending at rest. */
  protected lungePlan: { a: number; b: number; allow: number } | null = null;
  /** Step-in for a swing: up to `maxDist` metres, stopping `stopDist` metres from the target. */
  protected lungeSpec = { a: 0, b: 0.3, maxDist: 1.2, stopDist: 1.3 };

  // Greybox telegraph: the blade glows while the arm winds up.
  private bladeMaterial: THREE.MeshStandardMaterial | null = null;
  private readonly telegraphGlowColor = new THREE.Color(0xff0000);

  constructor(id = 'enemy', color = 0x8b1e1e) {
    super(id, color);

    this.swordMesh.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (mesh.isMesh && mat && mat.color.getHex() === 0xeeeeff) {
        this.bladeMaterial = mat.clone();
        this.bladeMaterial.color.setHex(0xee6666);
        this.bladeMaterial.emissive = new THREE.Color(0x000000);
        mesh.material = this.bladeMaterial;
      }
    });
    this.stateMachine.onStateChanged = (state, previous) => this.onStateChange(state, previous);
  }

  /** One AI step: face, space, wind up and swing at `target`. */
  public updateAI(dt: number, target: FightTarget): void {
    const state = this.stateMachine.currentState;
    if (state === 'DEAD') return;

    if (state === 'POSTURE_BROKEN' || state === 'DEFLECTED' || state === 'STAGGER') {
      this.cancelTelegraph();
      this.updateProceduralAnimations(dt, 0);
      return;
    }

    const toTarget = new THREE.Vector3().subVectors(target.getPosition(), this.getPosition()).setY(0);
    const distance = toTarget.length();

    if (this.route.length > 0 && !state.startsWith('ATTACK') && !this.isTelegraphing) {
      if (distance < ROUTE_BREAK || target.isDown()) this.route = [];
      else {
        this.followRoute(dt);
        this.updateProceduralAnimations(dt, 1);
        return;
      }
    }

    // Face the target the short way round at a limited rate, but not once a swing is committed.
    if (distance > 0.1 && this.mayTrack()) this.turnToward(Math.atan2(toTarget.x, toTarget.z), this.turnRate, dt);

    if (this.isTelegraphing) {
      this.updateTelegraph(dt, distance);
      return;
    }

    if (state.startsWith('ATTACK')) {
      if (!this.rigDrivesMotion(state)) this.applyLunge(dt);
      this.maybeChain(state);
      this.updateProceduralAnimations(dt, 0);
      return;
    }

    // Nothing left to fight: lower the blade and wait.
    if (target.isDown()) {
      this.settle('IDLE');
      this.updateProceduralAnimations(dt, 0);
      return;
    }

    this.aiTimer += dt;
    const dir = toTarget.clone().normalize();
    let moveMagnitude = 0;
    // Ready and within reach: attack, however close the player has pressed in (backing off forever under
    // pressure would let attack spam keep it from ever swinging).
    if (distance <= this.engageRange && this.aiTimer >= this.attackCooldown) {
      this.aiTimer = 0;
      this.beginTelegraph();
    } else if (distance > this.engageRange) {
      this.group.position.addScaledVector(dir, this.moveSpeed * dt);
      this.settle('MOVE');
      moveMagnitude = 1;
    } else if (distance < this.crowdRange) {
      this.backOff(dir, dt);
      moveMagnitude = 0.5;
    } else {
      this.circle(dir, dt);
    }
    this.updateProceduralAnimations(dt, moveMagnitude);
  }

  /** Runs toward the next waypoint of `route`, dropping each as it is reached. */
  private followRoute(dt: number): void {
    if (this.routeDelay > 0) {
      this.routeDelay -= dt;
      this.settle('IDLE');
      return;
    }
    const pos = this.getPosition();
    let wp = this.route[0];
    while (wp && Math.hypot(wp.x - pos.x, wp.z - pos.z) < WAYPOINT_RADIUS) {
      this.route.shift();
      wp = this.route[0];
    }
    if (!wp) return;
    const dir = new THREE.Vector3(wp.x - pos.x, 0, wp.z - pos.z).normalize();
    this.turnToward(Math.atan2(dir.x, dir.z), this.turnRate * 1.5, dt);
    this.group.position.addScaledVector(dir, this.moveSpeed * dt);
    this.settle('MOVE');
  }

  /** Changes state unless already in it (re-entering would restart the clip). */
  protected settle(state: CharacterState): void {
    if (this.stateMachine.currentState !== state) this.stateMachine.changeState(state);
  }

  protected hasClip(state: CharacterState): boolean {
    return !!this.rig?.definition.states[state];
  }

  /** Gives ground while facing the target: a back-step if it has one (not over an edge: it holds instead). */
  protected backOff(dir: THREE.Vector3, dt: number): void {
    if (!this.footing(dir.clone().negate())) {
      this.settle('IDLE');
      return;
    }
    this.group.position.addScaledVector(dir, -this.walkSpeed * dt);
    this.settle(this.hasClip('WALK_BACK') ? 'WALK_BACK' : 'MOVE');
  }

  /** Waiting for its next swing: circles the target if its rig can strafe, else holds its ground. */
  protected circle(dir: THREE.Vector3, dt: number): void {
    if (!this.hasClip('STRAFE_LEFT') || !this.hasClip('STRAFE_RIGHT')) {
      this.settle('IDLE');
      return;
    }
    this.circleTimer -= dt;
    if (this.circleTimer <= 0) {
      this.circleDir = Math.random() < 0.5 ? 1 : -1;
      this.circleTimer = 1.4 + Math.random() * 1.6;
    }
    // Sideways relative to the target: +1 moves to its own right. Never off an edge: the other way, or hold.
    let side = new THREE.Vector3().crossVectors(dir, UP).multiplyScalar(-this.circleDir);
    if (!this.footing(side)) {
      this.circleDir = this.circleDir > 0 ? -1 : 1;
      side = side.negate();
      if (!this.footing(side)) {
        this.settle('IDLE');
        return;
      }
    }
    this.group.position.addScaledVector(side, this.walkSpeed * 0.8 * dt);
    this.settle(this.circleDir > 0 ? 'STRAFE_RIGHT' : 'STRAFE_LEFT');
  }

  /** Ground a short step along `dir` beyond its body (bridges and ledges have edges). */
  protected footing(dir: THREE.Vector3, ahead = 0.6): boolean {
    return CharacterMotor.hasGround(this.getPosition().clone().addScaledVector(dir, ahead + (this.motor?.radius ?? 0.4)));
  }

  private beginTelegraph(): void {
    this.settle('IDLE');
    this.isTelegraphing = true;
    this.telegraphTimer = 0;
    this.soundFX.playTelegraphSound();
    // A glint along the blade: the readable "it is coming" cue.
    if (this.rig) this.particleFX.spawnSparks(this.getWeaponPoints().tip, 10, true);
  }

  private updateTelegraph(dt: number, distance: number): void {
    this.telegraphTimer += dt;
    const windUp = this.rig ? Math.min(this.telegraphDuration, 0.3) : this.telegraphDuration;
    if (!this.rig) {
      const glow = Math.sin((this.telegraphTimer / windUp) * Math.PI) * 1.5;
      this.bladeMaterial?.emissive.copy(this.telegraphGlowColor).multiplyScalar(glow);
      this.rightArm.rotation.set(-1.2, 0.4, -0.4);
      this.torsoMesh.rotation.y = 0.5;
    }
    if (this.telegraphTimer < windUp) return;
    this.cancelTelegraph();
    const attack = this.attackStates[this.attackIndex % this.attackStates.length];
    this.attackIndex++;
    this.stateMachine.changeState(this.hasClip(attack) || !this.rig ? attack : 'ATTACK_1');
    this.onAttackStart(this.stateMachine.currentState);
    this.planLunge(distance);
  }

  private cancelTelegraph(): void {
    this.isTelegraphing = false;
    this.telegraphTimer = 0;
    this.bladeMaterial?.emissive.setHex(0x000000);
  }

  /** Mid-swing: sometimes queue the next attack of the string (the state machine chains it at the end). */
  private maybeChain(state: CharacterState): void {
    const sm = this.stateMachine;
    if (this.comboChance <= 0 || !sm.comboWindowOpen || state === 'ATTACK_3') return;
    // Decide once per swing: a new swing of the same state starts its clock again below the decision time.
    if (this.chainFor?.state === state && sm.stateTime >= this.chainFor.t) return;
    this.chainFor = { state, t: sm.stateTime };
    const next: CharacterState = state === 'ATTACK_1' ? 'ATTACK_2' : 'ATTACK_3';
    if (this.hasClip(next)) sm.comboQueued = Math.random() < this.comboChance;
  }

  /** Every state change: swing sounds. Subclasses add their own cues. */
  protected onStateChange(state: CharacterState, _previous: CharacterState): void {
    if (state.startsWith('ATTACK')) this.soundFX.playSwordSwing(this.isBoss ? 0.72 : 0.85, this.swingSound);
  }

  /** A swing begins from the AI (not a chained follow-up). */
  protected onAttackStart(_state: CharacterState): void {}

  /**
   * Committed to an attack: a wind-up (telegraph), a swing or a cast. Chip hits land but do not interrupt it; only
   * a deflection, a posture break or a heavy blow does.
   */
  public isArmored(): boolean {
    const state = this.stateMachine.currentState;
    return this.isTelegraphing || state.startsWith('ATTACK') || state === 'CAST';
  }

  /** May still turn toward the target: always outside attacks, and inside one only until it commits. */
  protected mayTrack(): boolean {
    const state = this.stateMachine.currentState;
    if (!state.startsWith('ATTACK')) return true;
    return this.stateMachine.stateTime < this.trackUntil(state);
  }

  /** Plans the step-in for an attack that starts now, `distance` metres from the target. */
  protected planLunge(distance: number): void {
    const { a, b, maxDist, stopDist } = this.lungeSpec;
    this.lungePlan = { a, b, allow: THREE.MathUtils.clamp(distance - stopDist, 0, maxDist) };
  }

  /**
   * Eased step-in: speed 6u(1-u)/(b-a) over the span integrates to exactly `allow` and ends at rest, so the swing
   * arrives at its stop distance instead of running through the target.
   */
  protected applyLunge(dt: number): void {
    const plan = this.lungePlan;
    const t = this.stateMachine.stateTime;
    if (!plan || t < plan.a || t > plan.b || plan.allow <= 0) return;
    const span = plan.b - plan.a;
    const u = THREE.MathUtils.clamp((t - plan.a) / span, 0, 1);
    const speed = (plan.allow * 6 * u * (1 - u)) / span;
    const yaw = this.group.rotation.y;
    this.group.position.x += Math.sin(yaw) * speed * dt;
    this.group.position.z += Math.cos(yaw) * speed * dt;
  }

  /** The greybox swing (0.38 s) cuts through the middle of its arc. */
  protected override defaultHitWindows(state: CharacterState): HitWindow[] {
    const d = this.stateMachine.attackDuration(state);
    if (d <= 0) return [];
    return state === 'ATTACK_1' ? [{ t0: Math.min(0.08, d * 0.2), t1: Math.min(0.3, d * 0.8) }] : [{ t0: d * 0.15, t1: d * 0.75 }];
  }

  /** Placed for a cutscene: standing, facing `point`. Returns nothing; bosses override `playIntro` instead. */
  public faceTowards(point: THREE.Vector3): void {
    this.group.rotation.y = Math.atan2(point.x - this.group.position.x, point.z - this.group.position.z);
  }

  /**
   * The cutscene beat for this enemy (a roar, a salute): starts it and returns how long it lasts in seconds.
   * Plain enemies have none.
   */
  public playIntro(): number {
    return 0;
  }
}

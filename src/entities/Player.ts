import * as THREE from 'three';
import { Character, type PreparedRig } from './Character';
import type { CharacterState } from './CharacterStateMachine';
import { InputManager, type InputState } from '../core/InputManager';
import { SoundFX } from '../combat/SoundFX';
import { ParticleFX } from '../combat/ParticleFX';
import { KITS, Skills, type Ability, type Attire, type HeroKit } from '../game/Progression';
import { WEAPON_SETS, dressed, type WeaponSet } from './characters/YodhaWeapons';
import type { HeroSwing } from '../combat/Guard';

/** A completed charge (hold Q) empowers this many blows, each dealing this much more damage and posture. */
const CHARGED_HITS = 3;
export const CHARGED_MULTIPLIER = 1.6;

/**
 * Locomotion feel. He always travels the way he faces and turns toward the input rather than sliding sideways;
 * a sharp change of direction bleeds his speed while he swings round, and speed builds and falls off over a few
 * tenths of a second. That momentum is most of what makes a run read as a heavy warrior instead of a cursor.
 */
const LOCOMOTION = {
  acceleration: 9, // m/s^2 up to running pace (~0.4 s)
  sprintAcceleration: 6, // a sprint takes longer to wind up
  deceleration: 14, // m/s^2 to a stop (~0.3 s from a run)
  turnRate: 11, // rad/s standing or walking (a half-turn in ~0.3 s)
  sprintTurnRate: 5, // rad/s at full sprint: wide arcs
  airTurnRate: 2.5, // rad/s of steering while airborne
  stopSpeed: 0.35, // below this with no input he is standing still
  // rad/s^2: his turns wind up and settle rather than snapping to full rate in one step (JITTER.md, fix 2). Quicker
  // than the proposal's 45 so a half-turn still takes about as long as before (~0.45 s); his ease-in is kept.
  turnAccel: 60,
  turnGain: 14, // 1/s: turn speed asked for per radian still to turn (the ease into the heading)
};

/**
 * Swings find their mark. An attack turns toward the nearest enemy roughly where he is aiming (the stick or keys,
 * else his facing) and steps in to reach it as the blade comes round, so a blow is aimed rather than lucky.
 */
const ASSIST = {
  range: 5.5, // m, centre to centre
  cone: THREE.MathUtils.degToRad(75), // either side of the aim
  closeRange: 2.2, // m: an enemy this close is found in any direction
  turnRate: 18, // rad/s while winding up
  turnAccel: 150, // rad/s^2: quick enough to swing round onto a foe behind him within the wind-up (a half-turn ~0.3 s)
  reach: 1.2, // m from his centre to the target's body where the blade lands best
  maxStep: 2.2, // m the step-in may cover
  idleStep: 0.35, // m he steps into a swing at nothing
};

/**
 * The slide (F / B), in clip seconds: low enough to pass under a blow from `untouchable[0]` to `[1]`, and back up
 * enough to swing, guard or run on from `actFrom`. `travel` scales the clip's 5.6 m.
 */
const SLIDE = { untouchable: [0.1, 0.78], actFrom: 0.92, travel: 0.8 };
/** After a swing's cancel point, movement takes over this much later than a slide or a follow-up blow. */
const MOVE_CANCEL_DELAY = 0.12;
/**
 * His blow turned aside by a boss's guard throws him back a step and out of the swing (DEFLECTED): this long, and from this
 * far into it he can slide, guard or parry out of it (the answer the boss makes comes after the recoil, never into it).
 */
const RECOIL = 0.3;
const RECOIL_FREE = 0.14;

export class Player extends Character {
  private inputManager: InputManager;
  private soundFX: SoundFX;
  private particleFX: ParticleFX;
  /** Yaw of the camera's view (SceneManager.viewYaw): WASD are relative to it. */
  public viewYaw = 0;

  /** What he carries and which moves are his, set by the chapter (`equip`). Starts as the first chapter's. */
  public readonly skills = new Skills(KITS.baoli);
  public weapon: WeaponSet = WEAPON_SETS[KITS.baoli.weapon];
  /** What he wears (the model his rig is built on); set with the kit, changed by the story (`wear`). */
  public attire: Attire = KITS.baoli.attire;
  /** His rig in another attire, loaded ahead so the story's change of clothes is instant (`ready`, `wear`). */
  private wardrobe: { attire: Attire; weapon: WeaponSet; rig: Promise<PreparedRig>; ready: PreparedRig | null } | null = null;
  /** Called when the fight teaches him a move (the engine shows the banner). */
  public onLearned: ((ability: Ability) => void) | null = null;

  /**
   * Whether blows can kill him. Off in a fight he is scripted to lose (the prologue): his health stops at 1 and the
   * story ends the fight instead of the defeat screen.
   */
  public mortal = true;
  /** Blows still empowered by a completed charge. */
  public chargedHits = 0;
  /** Called when a charge completes (the engine shows the banner). */
  public onCharged: (() => void) | null = null;
  /** Current ground speed along his facing (m/s): built up and bled off, never set outright. */
  public speed = 0;
  /** When the current jump touched down (state seconds, -1 while airborne). */
  private jumpLandedAt = -1;
  /** Who might be struck, and this step's input direction (world, zero when none): attacks aim with them. */
  private foes: readonly Character[] = [];
  private aimDir = new THREE.Vector3();
  /** Counts his swings (a chained blow is a new one): the boss's guard decides about each as it begins. */
  private swingSerial = 0;
  /** The enemy the current swing is aimed at, and how far it steps in before its blade arrives (state seconds). */
  private attackTarget: Character | null = null;
  /** A swing at nothing turns him to where he aimed it (yaw), over its wind-up; null when it has a target or no aim. */
  private aimYaw: number | null = null;
  private step = { allow: 0, until: 0 };

  constructor() {
    super('player_hero', 0xd4af37); // Royal Gold
    this.chainsEarly = true;
    this.turnAccel = LOCOMOTION.turnAccel;
    // His gait follows the stick at once: the clip dwell that steadies the AI's would only make him feel late.
    this.visualDwell = 0;

    this.inputManager = InputManager.getInstance();
    this.soundFX = SoundFX.getInstance();
    this.particleFX = ParticleFX.getInstance();

    this.stateMachine.DEFLECTED_DURATION = RECOIL;
    this.stateMachine.onStateChanged = (newState) => {
      this.rootMotionScale = 1;
      if (newState.startsWith('ATTACK')) {
        this.swingSerial++;
        const swing = this.weapon.sound.swing;
        this.soundFX.playSwordSwing(newState === 'ATTACK_1' ? swing[0] : newState === 'ATTACK_2' ? swing[1] : swing[2], this.weapon.sound.whoosh);
        this.aimAttack(newState); // chained swings too, which the state machine starts
      }
    };
  }

  /**
   * Whether `ability` is his in this chapter. The guard and the parry are the dhal's, so they need the shield as well
   * as the lesson.
   */
  public can(ability: Ability): boolean {
    if ((ability === 'block' || ability === 'parry') && !this.weapon.shield) return false;
    return this.skills.has(ability);
  }

  /** Teaches him a move the chapter withheld (banner and save included). */
  public learn(ability: Ability): void {
    if (this.skills.learn(ability)) this.onLearned?.(ability);
  }

  /**
   * Puts him in a chapter's kit: its weapon (and the dhal, if that weapon comes with it), its moves and what he wears.
   * Changing weapon or attire rebuilds his rig, so call it while the chapter loads. A kit whose story changes his
   * attire (`becomes`) has that rig loaded too before this resolves.
   */
  public async equip(kit: HeroKit): Promise<void> {
    this.skills.setKit(kit);
    const set = WEAPON_SETS[kit.weapon];
    if (!kit.becomes && this.wardrobe) {
      // Readied for a change this chapter will not make: let it go.
      void this.wardrobe.rig.then((p) => p.rig.dispose()).catch(() => undefined);
      this.wardrobe = null;
    }
    const later = kit.becomes ? this.ready(kit.becomes, set) : Promise.resolve();
    if (set !== this.weapon || kit.attire !== this.attire || !this.rig) {
      // Every chapter starts with the weapon in hand; one that cannot be sheathed never is.
      this.swordSheathed = false;
      await this.attachRig(dressed(set, kit.attire));
      this.weapon = set;
      this.attire = kit.attire;
    }
    await later.catch((err) => console.error(`[Player] his ${kit.becomes} rig failed to load`, err));
  }

  /** Loads his rig in `attire` (with `weapon`, by default the one in hand) for a later `wear`. */
  public ready(attire: Attire, weapon: WeaponSet = this.weapon): Promise<void> {
    const w = this.wardrobe;
    if (w && w.attire === attire && w.weapon === weapon) return w.rig.then(() => undefined);
    w?.rig.then((p) => { if (this.wardrobe !== w) p.rig.dispose(); }).catch(() => undefined);
    const entry: NonNullable<Player['wardrobe']> = { attire, weapon, rig: this.prepareRig(dressed(weapon, attire)), ready: null };
    this.wardrobe = entry;
    return entry.rig.then((p) => { entry.ready = p; });
  }

  /**
   * Changes what he wears, at once if that rig was readied (`ready`; a kit's `becomes` is), keeping his weapon,
   * state and the clip a cue is playing. Not readied, it loads first (and false is returned).
   */
  public wear(attire: Attire): boolean {
    if (attire === this.attire && this.rig) return true;
    const w = this.wardrobe;
    if (w?.ready && w.attire === attire && w.weapon === this.weapon) {
      this.wardrobe = null;
      this.mountRig(w.ready, true);
      this.attire = attire;
      return true;
    }
    void this.ready(attire).then(() => this.wear(attire)).catch((err) => console.error(`[Player] could not change into ${attire}`, err));
    return false;
  }

  public handleInput(dt: number, viewYaw: number, foes: readonly Character[] = []): void {
    this.viewYaw = viewYaw;
    this.foes = foes;
    const input = this.inputManager.getState();
    const sm = this.stateMachine;
    const state = sm.currentState;
    sm.guardHeld = input.parry && this.can('block');

    // Don't allow new actions during locked states
    if (state === 'POSTURE_BROKEN' || state === 'DEAD') {
      this.speed = 0;
      return;
    }

    const grounded = this.motor?.grounded ?? true;
    const free = state === 'IDLE' || state === 'WALK' || state === 'MOVE' || state === 'SPRINT';
    const moveVec = this.calculateInputDirection(input);
    const moving = moveVec.lengthSq() > 0.001;
    if (moving) this.aimDir.copy(moveVec);
    else this.aimDir.set(0, 0, 0);
    // A swing whose blade has finished can be cut short (and a slide once he is back up).
    const recovering = this.inRecovery();
    const slideDone = state === 'DODGE' && this.slideRecovered();
    // Rocked back by a boss's guard: a moment on, he may slide, guard or parry out of it (not swing again).
    const recoiled = state === 'DEFLECTED' && sm.stateTime >= RECOIL_FREE;
    const canAct = free || state === 'BLOCK' || recovering || slideDone || recoiled;

    // 0. Slide (F): out of anything but a hit, a fall or the middle of a swing.
    if (input.dodge && grounded && this.can('dodge') && (canAct || state === 'CHARGE' || (state === 'PARRY' && !sm.isParryActive))) {
      this.inputManager.consume('dodge');
      this.beginSlide(moving ? moveVec : null);
      return;
    }

    // 1. Dhal (Right Click): a press opens the 140 ms parry window, holding on settles into a guard.
    if (input.parryPressed && canAct && grounded && this.can('parry')) {
      this.inputManager.consume('parry');
      sm.changeState('PARRY');
      return;
    }
    // The guard is a planted stance: movement always wins over it, so holding the button never pins him in place.
    if (input.parry && this.can('block') && !moving && free && grounded && this.speed < LOCOMOTION.stopSpeed) {
      sm.changeState('BLOCK');
      return;
    }

    // 2. Attack Trigger (Left Click) & Combo Chaining. Sheathed, the first click draws the sword; out of a sprint
    // it is a leaping strike.
    // A chained blow is queued from the moment the swing's blade starts; it begins at the swing's cancel point.
    const chaining = state === 'ATTACK_1' || state === 'ATTACK_2';
    if (input.attack) {
      if (grounded && (free || state === 'BLOCK' || slideDone || (recovering && !chaining))) {
        this.inputManager.consume('attack');
        if (this.swordSheathed) sm.changeState('DRAW');
        else if (state === 'SPRINT' && this.can('leap') && this.rig?.definition.states.ATTACK_JUMP) sm.changeState('ATTACK_JUMP');
        else sm.changeState('ATTACK_1');
        return;
      } else if (chaining && this.can('combo') && (sm.comboWindowOpen || sm.stateTime >= (this.hitWindows(state)[0]?.t0 ?? 0))) {
        this.inputManager.consume('attack');
        sm.comboQueued = true;
      }
    }

    // 3. Jump (Space): a running jump at pace, keeping his momentum through the air.
    if (input.jump && canAct && grounded) {
      this.inputManager.consume('jump');
      this.jumpLandedAt = -1;
      this.beginJump(this.speed > this.walkSpeed + 0.5);
      return;
    }

    // 4. Charge (press and hold Q; a finished charge needs a fresh press) and sheathe / draw (X).
    if (input.chargePressed && input.charge && this.can('charge') && free && grounded && !this.swordSheathed) {
      this.inputManager.consume('charge');
      sm.changeState('CHARGE');
      return;
    }
    if (input.stow && free && grounded && this.weapon.stowable) {
      this.inputManager.consume('stow');
      sm.changeState(this.swordSheathed ? 'DRAW' : 'SHEATHE');
      return;
    }

    // 5. Movement handling. Only running and jumping carry momentum; everything else is planted.
    let moveMagnitude = 0;
    const moveCancel = moving && !sm.comboQueued && (slideDone
      || (recovering && sm.stateTime >= (sm.cancelAt[state] ?? 0) + MOVE_CANCEL_DELAY));
    if (state !== 'JUMP' && !free && !moveCancel) this.speed = 0;
    if (free || moveCancel) {
      // Out of a slide he is already moving: he runs straight on.
      if (slideDone) this.speed = Math.max(this.speed, this.moveSpeed * 0.8);
      moveMagnitude = this.locomote(input, moveVec, moving, dt);
    } else if (state === 'DODGE') {
      if (!this.rigDrivesMotion('DODGE')) this.advance(7 * Math.max(0, 1 - sm.stateTime / sm.DODGE_DURATION), dt);
    } else if (state === 'JUMP') {
      this.updateJump(input, moveVec, moving, dt);
    } else if (state === 'CHARGE') {
      if (!input.charge) {
        sm.changeState('IDLE'); // let go early: nothing gathered
      } else if (sm.stateTime >= sm.CHARGE_DURATION) {
        this.chargedHits = CHARGED_HITS;
        this.soundFX.playParryClash();
        this.particleFX.spawnSparks(this.getPosition().clone().setY(this.getPosition().y + 1.2), 45, true);
        sm.changeState('IDLE');
        this.onCharged?.();
      }
    } else if (state === 'BLOCK') {
      // The guard faces where the camera looks; moving drops it and he runs.
      if (!input.parry) sm.changeState('IDLE');
      else if (moving) moveMagnitude = this.locomote(input, moveVec, moving, dt);
      else this.turnTowards(Math.atan2(-Math.sin(this.viewYaw), -Math.cos(this.viewYaw)), LOCOMOTION.turnRate, dt);
    } else if (state.startsWith('ATTACK')) {
      this.followThrough(dt);
    }

    this.updateProceduralAnimations(dt, moveMagnitude);
  }

  /**
   * Walking, running and sprinting. He turns toward the input at a rate that narrows as he speeds up, and moves
   * only along his facing: while the input points away from where he faces he slows to pivot instead of crabbing
   * sideways. Letting go bleeds speed off before he settles into IDLE. Returns how hard he is moving (0..1).
   */
  private locomote(input: InputState, moveVec: THREE.Vector3, moving: boolean, dt: number): number {
    const sm = this.stateMachine;
    let target = 0;
    if (moving) {
      const gait = this.locomotionState(input);
      if (sm.currentState !== gait) sm.changeState(gait);
      const pace = THREE.MathUtils.clamp(this.speed / this.sprintSpeed, 0, 1);
      const turnRate = THREE.MathUtils.lerp(LOCOMOTION.turnRate, LOCOMOTION.sprintTurnRate, pace);
      const offAxis = this.turnTowards(Math.atan2(moveVec.x, moveVec.z), turnRate, dt);
      // Full pace when facing the input, none when it points 90 degrees or more away (a planted pivot).
      target = this.speedOf(gait) * Math.max(0, Math.cos(offAxis)) ** 2;
      const accel = target < this.speed ? LOCOMOTION.deceleration
        : gait === 'SPRINT' ? LOCOMOTION.sprintAcceleration : LOCOMOTION.acceleration;
      this.speed = approach(this.speed, target, accel * dt);
    } else {
      this.speed = approach(this.speed, 0, LOCOMOTION.deceleration * dt);
      if (this.speed < LOCOMOTION.stopSpeed) {
        this.speed = 0;
        if (sm.currentState !== 'IDLE') sm.changeState('IDLE');
      }
    }
    this.advance(this.speed, dt);
    return moving ? 1 : 0;
  }

  /**
   * Leaves the ground at the clip's takeoff and keeps the momentum he jumped with (letting go of the keys does not
   * stop him in mid-air); the input only steers, gently. On touchdown the landing plays out, or he runs straight on.
   */
  private updateJump(input: InputState, moveVec: THREE.Vector3, moving: boolean, dt: number): void {
    const sm = this.stateMachine;
    if (!this.jumpLaunched && sm.stateTime >= this.jump.takeoff) {
      this.motor?.launch(this.jump.speed);
      this.jumpLaunched = true;
      // A standing jump in a held direction still drifts that way.
      if (moving && this.speed < this.walkSpeed) this.speed = this.walkSpeed;
    }
    if (moving) this.turnTowards(Math.atan2(moveVec.x, moveVec.z), LOCOMOTION.airTurnRate, dt);
    this.advance(this.speed, dt);
    if (!this.jumpLaunched || !(this.motor?.grounded ?? true)) return;
    if (this.jumpLandedAt < 0) {
      this.jumpLandedAt = sm.stateTime;
      this.particleFX.spawnDustPuff(this.getPosition(), 10);
    }
    if (!moving) this.speed = approach(this.speed, 0, LOCOMOTION.deceleration * dt);
    if (moving) sm.changeState(this.locomotionState(input));
    else if (sm.stateTime - this.jumpLandedAt >= this.jump.recovery) sm.changeState('IDLE');
  }

  /** Past the current swing's cancel point (its blade has finished): the rest may be cut short. */
  private inRecovery(): boolean {
    const sm = this.stateMachine;
    const at = sm.cancelAt[sm.currentState];
    return at !== undefined && sm.stateTime >= at;
  }

  /** Clip seconds into the slide. */
  private slideTime(): number {
    const config = this.rig?.definition.states.DODGE;
    return config ? this.stateMachine.stateTime * (config.timeScale ?? 1) + (config.startAt ?? 0) : -1;
  }

  /** Back up from the slide enough to act. */
  private slideRecovered(): boolean {
    return this.rig ? this.slideTime() >= SLIDE.actFrom : this.stateMachine.stateTime >= 0.5;
  }

  /** Low in the slide, under any blow or bolt. */
  public isEvading(): boolean {
    if (this.stateMachine.currentState !== 'DODGE') return false;
    if (!this.rig) return this.stateMachine.stateTime < 0.4;
    const t = this.slideTime();
    return t >= SLIDE.untouchable[0] && t <= SLIDE.untouchable[1];
  }

  /**
   * Slides the way the input points (or straight on), turning to it at once. This snap is meant: an evasion must go
   * exactly where it is pressed, and its dust and drop hide the turn.
   */
  private beginSlide(dir: THREE.Vector3 | null): void {
    if (dir) this.faceYaw(Math.atan2(dir.x, dir.z));
    this.speed = 0;
    this.stateMachine.changeState('DODGE');
    this.rootMotionScale = SLIDE.travel;
    this.particleFX.spawnDustPuff(this.getPosition(), 10);
    this.soundFX.playSlide();
  }

  /**
   * Picks what a swing that starts now is aimed at: the nearest enemy within reach and roughly where he is aiming
   * (any direction if one is very close), weighing distance against how far he would have to turn.
   */
  private aimAttack(state: CharacterState): void {
    const pos = this.group.position;
    const aiming = this.aimDir.lengthSq() > 0.001;
    const aim = aiming ? Math.atan2(this.aimDir.x, this.aimDir.z) : this.group.rotation.y;
    let best: Character | null = null;
    let bestScore = Infinity;
    for (const foe of this.foes) {
      if (foe.stateMachine.currentState === 'DEAD' || !foe.group.visible || foe.submerged) continue;
      const p = foe.group.position;
      const dx = p.x - pos.x;
      const dz = p.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > ASSIST.range || Math.abs(p.y - pos.y) > 1.6) continue;
      const off = Math.abs(wrapAngle(Math.atan2(dx, dz) - aim));
      if (off > ASSIST.cone && d > ASSIST.closeRange) continue;
      const score = d + off * 1.5;
      if (score < bestScore) {
        bestScore = score;
        best = foe;
      }
    }
    this.attackTarget = best;
    this.aimYaw = null;
    const strike = this.hitWindows(state)[0];
    this.step.until = strike ? strike.t0 : 0.2;
    if (!best) {
      // At nothing: a short step the way he is aiming, turning onto it over the wind-up (followThrough).
      this.step.allow = ASSIST.idleStep;
      if (aiming) this.aimYaw = aim;
      return;
    }
    const gap = Math.hypot(best.group.position.x - pos.x, best.group.position.z - pos.z) - ASSIST.reach - (best.motor?.radius ?? 0.4);
    const travel = this.rootTravel(state, strike?.t0 ?? 0);
    if (travel > 0.2) {
      // A clip that carries him (the leaping strike) is stretched or shortened to land on the target.
      this.step.allow = 0;
      this.rootMotionScale = THREE.MathUtils.clamp(gap / travel, 0.3, 1.5);
    } else {
      this.step.allow = THREE.MathUtils.clamp(gap, 0, ASSIST.maxStep);
    }
  }

  /** How far `state`'s clip carries him by `until` (state seconds), metres; 0 without root motion. */
  private rootTravel(state: CharacterState, until: number): number {
    const config = this.rig?.definition.states[state];
    const curve = config?.rootMotion ? this.rig!.manifest.clips[config.clip]?.rootMotion : undefined;
    if (!config || !curve) return 0;
    const at = (t: number) => curve.samples[THREE.MathUtils.clamp(Math.round(t * curve.fps), 0, curve.samples.length - 1)];
    const start = config.startAt ?? 0;
    const a = at(start);
    const b = at(start + until * (config.timeScale ?? 1));
    return Math.hypot(b[0] - a[0], b[1] - a[1]) * (this.rig!.definition.scale ?? 1);
  }

  /** During a swing's wind-up: turns onto the target and steps in, so the blade arrives where it is. */
  private followThrough(dt: number): void {
    const t = this.stateMachine.stateTime;
    if (t > this.step.until) return;
    const target = this.attackTarget;
    if (target && target.stateMachine.currentState !== 'DEAD') {
      const p = target.group.position;
      this.turnTowards(Math.atan2(p.x - this.group.position.x, p.z - this.group.position.z), ASSIST.turnRate, dt, ASSIST.turnAccel);
    } else if (this.aimYaw !== null) {
      this.turnTowards(this.aimYaw, ASSIST.turnRate, dt, ASSIST.turnAccel);
    }
    // Eased: speed 6u(1-u)/span integrates to exactly `allow` and comes to rest as the blade lands.
    const span = this.step.until;
    if (this.step.allow <= 0 || span <= 0) return;
    const u = THREE.MathUtils.clamp(t / span, 0, 1);
    this.advance((this.step.allow * 6 * u * (1 - u)) / span, dt);
  }

  private locomotionState(input: InputState): CharacterState {
    return input.sprint ? 'SPRINT' : input.walk ? 'WALK' : 'MOVE';
  }

  private speedOf(state: CharacterState): number {
    return state === 'SPRINT' ? this.sprintSpeed : state === 'WALK' ? this.walkSpeed : this.moveSpeed;
  }

  /** Moves him `speed` m/s along his facing. */
  private advance(speed: number, dt: number): void {
    if (speed <= 0) return;
    const yaw = this.group.rotation.y;
    this.group.position.x += Math.sin(yaw) * speed * dt;
    this.group.position.z += Math.cos(yaw) * speed * dt;
  }

  /**
   * Turns toward `yaw` at no more than `rate` rad/s, easing in over the last few degrees, its turn speed changing by
   * `accel` at most (Character.turnToward); returns the angle still left to turn afterwards.
   */
  private turnTowards(yaw: number, rate: number, dt: number, accel = LOCOMOTION.turnAccel): number {
    return this.turnToward(yaw, rate, dt, { accel, gain: LOCOMOTION.turnGain, deadzone: THREE.MathUtils.degToRad(0.2) });
  }

  /** The input as a world direction relative to the camera, keeping a stick's partial deflection. */
  private calculateInputDirection(input: InputState): THREE.Vector3 {
    const s = Math.sin(this.viewYaw);
    const c = Math.cos(this.viewYaw);
    // Forward (into the screen) is -(sin, cos); right is (cos, -sin).
    return new THREE.Vector3(-s * input.moveY + c * input.moveX, 0, -c * input.moveY - s * input.moveX);
  }

  public override takeDamage(amount: number): void {
    super.takeDamage(this.mortal ? amount : Math.max(0, Math.min(amount, this.currentHealth - 1)));
  }

  /** The blow he is making, for a boss that guards to watch (combat/Guard.ts); null when he is not swinging. */
  public swing(): HeroSwing | null {
    const sm = this.stateMachine;
    const state = sm.currentState;
    if (!state.startsWith('ATTACK')) return null;
    const first = this.hitWindows(state)[0];
    const blow = this.weapon.blows[state] ?? this.weapon.blows.ATTACK_1;
    return { id: this.swingSerial, until: Math.max(0, (first?.t0 ?? 0) - sm.stateTime), heavy: this.chargedHits > 0 || !!blow?.heavy };
  }

  /**
   * A boss's guard turned his blow aside: the blade bounces, he is rocked back a step (`metres`) and loses the rest of the
   * swing and the chain with it, for the moment `RECOIL` lasts (a slide, a guard or a parry can cut it short).
   */
  public recoil(from: THREE.Vector3, metres: number): void {
    const state = this.stateMachine.currentState;
    if (state === 'DEAD' || state === 'POSTURE_BROKEN') return;
    this.stateMachine.changeState('DEFLECTED');
    this.speed = 0;
    this.knock(this.getPosition().clone().sub(from), metres);
  }

  /** Down and out of the fight (enemies stop pressing). */
  public isDown(): boolean {
    return this.stateMachine.currentState === 'DEAD';
  }

  /** Back on his feet at full strength (a new chapter or a retry). */
  public revive(): void {
    this.currentHealth = this.maxHealth;
    this.currentMarma = 0;
    this.chargedHits = 0;
    this.speed = 0;
    this.stateMachine.reset();
  }
}

/** Moves `value` toward `target` by at most `maxStep`. */
function approach(value: number, target: number, maxStep: number): number {
  return value < target ? Math.min(value + maxStep, target) : Math.max(value - maxStep, target);
}

/** The same angle in (-PI, PI]. */
function wrapAngle(a: number): number {
  return a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
}

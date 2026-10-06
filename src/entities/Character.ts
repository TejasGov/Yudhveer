import * as THREE from 'three';
import { Entity } from './Entity';
import { CharacterStateMachine, type CharacterState, type TimedStateKey } from './CharacterStateMachine';
import { SlashRibbon, trailActive, trailLookOf } from '../combat/SlashRibbon';
import { HitReact } from '../combat/HitReact';
import { CharacterRig, type CharacterDefinition, type SocketAttachment, type StateAnimation } from './animation/CharacterRig';
import { CharacterMotor, DEFAULT_MOTOR, type MotorOptions } from '../physics/CharacterMotor';
import { PhysicsWorld } from '../core/PhysicsWorld';
import type RAPIER from '@dimforge/rapier3d-compat';
import { ACTORS } from './ActorRegistry';
import { disposeObject } from '../levels/GLBLevel';

const UP = new THREE.Vector3(0, 1, 0);
// State-machine timers an animated character sets from its clip lengths (when the state is marked `timesState`).
const TIMED_STATES: Partial<Record<CharacterState, TimedStateKey>> = {
  ATTACK_1: 'ATTACK_1_DURATION',
  ATTACK_2: 'ATTACK_2_DURATION',
  ATTACK_3: 'ATTACK_3_DURATION',
  ATTACK_JUMP: 'ATTACK_JUMP_DURATION',
  CHARGE: 'CHARGE_DURATION',
  BLOCK_HIT: 'BLOCK_HIT_DURATION',
  SHEATHE: 'SHEATHE_DURATION',
  DRAW: 'DRAW_DURATION',
  STAGGER: 'STAGGER_DURATION',
  CAST: 'CAST_DURATION',
  DODGE: 'DODGE_DURATION',
};
/** A swing can be cut short this long (s) after its blade has finished. */
const CANCEL_AFTER_STRIKE = 0.06;
const SHEATHED_MARK = 'sheathed';
/** Walks and runs: at ease, one that is not getting anywhere stands in REST (see `Character.atEase`). */
const LOCOMOTION_STATES: CharacterState[] = ['WALK', 'MOVE', 'SPRINT', 'STRAFE_LEFT', 'STRAFE_RIGHT', 'WALK_BACK'];
/** m/s: below this it is standing still, above `MOVING_SPEED` it is going somewhere; still for `STILL_AFTER` s. */
const STILL_SPEED = 0.3;
const MOVING_SPEED = 0.6;
const STILL_AFTER = 0.2;
/** Every entry of the state table that is standing, walking or running (the visual dwell below applies between them). */
const LOCOMOTION_KEYS: CharacterState[] = ['IDLE', 'REST', ...LOCOMOTION_STATES];
/**
 * Headings within this of the target are close enough: a few centimetres of shove swing the bearing to a near
 * neighbour by degrees, and chasing that at full turn rate is what made headings look nervous.
 */
const TURN_DEADZONE = THREE.MathUtils.degToRad(1.5);
/** Turn speed asked for per radian still to turn (1/s): a turn eases into its heading instead of stopping dead. */
const TURN_GAIN = 8;
/** How quickly the speed that paces the stride follows the real speed (1/s): shoves and single steps don't flicker it. */
const STRIDE_FILTER = 8;
// A jump without clip timing (greybox): leaves at once, ~1 m high.
const DEFAULT_JUMP = { takeoff: 0, landing: 0.58, speed: 7, recovery: 0.12 };
/** How far above his feet a scabbard's tip is kept (m). */
const SCABBARD_CLEARANCE = 0.03;
const _scabbardPivot = new THREE.Vector3();
const _scabbardTip = new THREE.Vector3();
const _scabbardAxis = new THREE.Vector3();
const _scabbardQuat = new THREE.Quaternion();
const _scabbardTurn = new THREE.Quaternion();
const _trailTip = new THREE.Vector3();
const _trailHilt = new THREE.Vector3();

/** How a jump plays out, in state seconds: when to leave the ground and how fast, and how long landing takes. */
export interface JumpPlan {
  clip: string | null;
  takeoff: number;
  /** Clip time of touchdown (state seconds); the fall pose is held from here until the feet actually land. */
  landing: number;
  speed: number;
  recovery: number;
}

export class Character extends Entity {
  public maxHealth = 100;
  public currentHealth = 100;

  // Marma (Vedic Posture / Stance meter)
  public maxMarma = 100;
  public currentMarma = 0;
  public marmaDecayRate = 12; // Decays per second when not taking posture damage
  public marmaDecayDelay = 1.8; // Delay before decay starts
  public timeSinceLastPostureHit = 0;

  public stateMachine: CharacterStateMachine;
  public walkSpeed = 1.8;
  public moveSpeed = 5.5;
  public sprintSpeed = 9.0;
  public rotationSpeed = 12.0;

  /** The jump in progress (set by `beginJump`), whether it has left the ground yet, and when it touched down. */
  public jump: JumpPlan = { clip: null, ...DEFAULT_JUMP };
  public jumpLaunched = false;
  /** The sword is in its scabbard (moved there by the sheathe clip, back out by the draw). */
  public swordSheathed = false;

  // Visual Meshes for Greybox fallback
  public primitiveRoot: THREE.Group;
  public torsoMesh: THREE.Mesh;
  public headMesh: THREE.Mesh;
  public rightArm: THREE.Group;
  public leftArm: THREE.Group;
  public swordMesh: THREE.Group;
  public shieldMesh: THREE.Group;

  // Procedural Weapon Ribbon Trail
  public slashRibbon: SlashRibbon;

  /** Collision, gravity and stepping; null until `attachPhysics` (then gameplay moves are resolved by it). */
  public motor: CharacterMotor | null = null;
  /** Skinned, animated model that replaces the greybox once `attachRig` resolves. */
  public rig: CharacterRig | null = null;
  private rigState: CharacterState | null = null;
  private rigStateTime = 0;
  /** The definition entry the rig is playing (REST stands in for IDLE at ease; see `animationKey`). */
  private rigKey: CharacterState | null = null;
  /** The rig is playing a cue's clip (`playScripted`), not its state's: props keep the state's hold, not REST's. */
  private scripted = false;
  private readonly lastGroundPos = new THREE.Vector3();

  /**
   * Out of the fight (a cutscene, the start of a chapter, after the battle; the Engine sets it every step): IDLE plays
   * the calm standing idle (`states.REST`, else IDLE's own clip) instead of a guard, and a walk or run that is not
   * getting anywhere (stopped, or held against something) stands in it rather than stepping on the spot. In the fight
   * it is off, and every state plays exactly its own clip.
   */
  public atEase = false;
  /**
   * Stays in its fight stance even out of the fight: it has squared up and the fight is about to start (Andhaka from
   * his entrance's roar to the first blow). The Engine stands it at ease only while this is off, and clears it as the
   * fight starts.
   */
  public onGuard = false;
  /**
   * Gone under the water (Shalva's dive): out of sight, it cannot be struck or aimed at, it does not block anyone, and
   * it leaves no footfalls.
   */
  public submerged = false;
  /**
   * Metres per second the character really moved last step (after collision, without fighter-separation shoves), and
   * how long it has been ~still.
   */
  private actualSpeed = 0;
  private stillFor = 0;
  /** `actualSpeed` smoothed: what speed-matched walks and runs pace their stride to (JITTER.md, fix 5). */
  private visSpeed = 0;
  /**
   * How fast the heading is turning (rad/s). Turning has momentum: it winds up at no more than `turnAccel` and settles
   * the same way, so a heavy body never snaps from still to full turn in one step (JITTER.md, fix 2).
   */
  public yawVel = 0;
  /** Fastest change of turning speed, rad/s^2: a minion's; bosses are heavier (Boss), the hero quicker (Player). */
  public turnAccel = 30;
  /** Whether something turned it this step (else a turn under way coasts to a stop), and the heading it left. */
  private turnedThisStep = false;
  private turnedYaw = 0;
  /** Its weight in the fighter-separation push, about its capsule's volume (the hero's is 1): big bodies shove small ones. */
  public mass = 1;
  /** This step's shove from fighter separation (x, z metres): not its own movement, so the stride ignores it. */
  public readonly sepPush = new THREE.Vector3();
  /**
   * Minimum seconds a walk, run or stand is shown before another one replaces it: a decision undone within a step or
   * two never reaches the screen as a pop of the pose. (The state itself changes at once; only the clip waits.)
   */
  protected visualDwell = 0.2;
  private rigKeyAge = 0;
  /**
   * Put somewhere outside its own movement (a spawn, a cutscene mark, a boss coming up out of the water): the Engine
   * drops its render interpolation, so the next frame does not smear it across the gap (JITTER.md, fix 6).
   */
  public static onTeleported: ((character: Character) => void) | null = null;

  constructor(id: string, color = 0xd4af37, ribbonColor = 0xffd15c) {
    super(id);

    this.stateMachine = new CharacterStateMachine();
    ACTORS.set(this.group, this);
    this.primitiveRoot = new THREE.Group();
    this.modelGroup.add(this.primitiveRoot);

    // Procedural weapon ribbon (its newest point follows the blade as it is drawn between two steps)
    this.slashRibbon = new SlashRibbon(ribbonColor, 0.75);
    this.slashRibbon.live = (tip, hilt) => this.weaponSegmentInto(tip, hilt);

    // Build stylized greybox mesh hierarchy
    const capsuleMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.65
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      roughness: 0.5,
      metalness: 0.8
    });

    // Torso capsule
    const torsoGeo = new THREE.CapsuleGeometry(0.38, 0.75, 16, 32);
    this.torsoMesh = new THREE.Mesh(torsoGeo, capsuleMat);
    this.torsoMesh.position.y = 0.9;
    this.torsoMesh.castShadow = true;
    this.torsoMesh.receiveShadow = true;
    this.primitiveRoot.add(this.torsoMesh);

    // Head sphere with ancient warrior helmet crest
    const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
    this.headMesh = new THREE.Mesh(headGeo, darkMat);
    this.headMesh.position.y = 0.68;
    this.headMesh.castShadow = true;
    this.torsoMesh.add(this.headMesh);

    // Right Arm (Weapon Arm)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.45, 0.35, 0);
    this.torsoMesh.add(this.rightArm);

    // Left Arm (Dhal / Shield Arm)
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.45, 0.35, 0);
    this.torsoMesh.add(this.leftArm);

    // Sword (Khanda / Talwar inspired directional sword-box)
    this.swordMesh = this.createSwordMesh();
    this.swordMesh.position.set(0, -0.3, 0.2);
    this.swordMesh.rotation.set(-Math.PI * 0.4, 0, 0);

    // Dhal (Round Indian Buckler Shield)
    this.shieldMesh = this.createDhalShieldMesh();
    this.shieldMesh.position.set(0, -0.2, 0.25);
    this.shieldMesh.rotation.set(0, Math.PI * 0.5, 0);

    // Hook arms to sockets
    const rSocket = this.getSocket('mixamorigRightHand');
    if (rSocket) {
      this.rightArm.add(rSocket);
      rSocket.add(this.swordMesh);
    }

    const lSocket = this.getSocket('mixamorigLeftHand');
    if (lSocket) {
      this.leftArm.add(lSocket);
      lSocket.add(this.shieldMesh);
    }
  }

  private createSwordMesh(): THREE.Group {
    const swordGroup = new THREE.Group();

    // Steel Blade (Directional box)
    const bladeGeo = new THREE.BoxGeometry(0.08, 1.1, 0.02);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeff,
      metalness: 0.95,
      roughness: 0.15
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.6;
    blade.castShadow = true;
    swordGroup.add(blade);

    // Gold Guard & Crossbar
    const guardGeo = new THREE.BoxGeometry(0.24, 0.04, 0.06);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.25
    });
    const guard = new THREE.Mesh(guardGeo, goldMat);
    guard.position.y = 0.05;
    guard.castShadow = true;
    swordGroup.add(guard);

    // Grip Hilt
    const hiltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.22, 8);
    const hiltMat = new THREE.MeshStandardMaterial({ color: 0x4a180d, roughness: 0.8 });
    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
    hilt.position.y = -0.08;
    swordGroup.add(hilt);

    // Pommel
    const pommelGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const pommel = new THREE.Mesh(pommelGeo, goldMat);
    pommel.position.y = -0.2;
    swordGroup.add(pommel);

    return swordGroup;
  }

  private createDhalShieldMesh(): THREE.Group {
    const shieldGroup = new THREE.Group();

    // Outer Round Buckler Disk (Dhal)
    const shieldGeo = new THREE.CylinderGeometry(0.36, 0.38, 0.04, 24);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x1a2130,
      metalness: 0.7,
      roughness: 0.35
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.rotation.x = Math.PI / 2;
    shield.castShadow = true;
    shieldGroup.add(shield);

    // Ornate Golden Bosses (4 Vedic brass studs on Dhal)
    const bossGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const bossMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2
    });

    const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    angles.forEach((ang) => {
      const boss = new THREE.Mesh(bossGeo, bossMat);
      boss.position.set(Math.cos(ang) * 0.18, Math.sin(ang) * 0.18, 0.03);
      shieldGroup.add(boss);
    });

    return shieldGroup;
  }

  /**
   * Gives the character a physical capsule: from now on every fixed step's movement (input, AI, jumps, lunges,
   * root motion) is resolved against the level, other fighters and gravity by a `CharacterMotor`.
   * @param footOffset capsule centre height above the feet (half-height + radius)
   */
  public attachPhysics(body: RAPIER.RigidBody, collider: RAPIER.Collider, footOffset: number, options: MotorOptions = DEFAULT_MOTOR): void {
    this.motor?.dispose();
    this.rigidBody = body;
    this.collider = collider;
    this.motor = new CharacterMotor(body, collider, footOffset, options);
    this.bodyHeight = footOffset * 2;
    this.motor.teleport(this.group.position);
    this.lastGroundPos.copy(this.group.position);
  }

  /** Teleport (spawns, respawns): skips collision and resets falling. */
  public override setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
    this.lastGroundPos.set(x, y, z);
    if (this.motor) this.motor.teleport(this.group.position);
    else this.rigidBody?.setTranslation({ x, y, z }, true);
    this.markTeleported();
  }

  /** It was moved (or turned) in one go, not by walking there: no interpolation from where it was, no turn under way. */
  public markTeleported(): void {
    this.yawVel = 0;
    Character.onTeleported?.(this);
  }

  /** Faces `yaw` at once: a placement, never gameplay turning (which goes through `turnToward`). */
  public faceYaw(yaw: number): void {
    this.group.rotation.y = wrapAngle(yaw);
    this.yawVel = 0;
    this.turnedYaw = this.group.rotation.y;
  }

  /** Releases the capsule's controller; the body itself is removed by whoever created it. */
  public detachPhysics(): void {
    this.motor?.dispose();
    this.motor = null;
  }

  /**
   * Swaps the greybox for an animated model from the character pipeline: the sword and dhal move onto the
   * rig's hand sockets, locomotion speeds and attack timings come from the definition and its clips.
   */
  public async attachRig(definition: CharacterDefinition): Promise<CharacterRig> {
    return this.mountRig(await this.prepareRig(definition));
  }

  /**
   * Loads a rig and its props and gets it ready to wear (props on its sockets, strike windows measured) without
   * touching the character, so `mountRig` can put it on at once (the hero's change of attire mid-scene).
   */
  public async prepareRig(definition: CharacterDefinition): Promise<PreparedRig> {
    const [rig, prop, shield] = await Promise.all([
      CharacterRig.load(definition),
      definition.weapon?.build ? Promise.resolve(definition.weapon.build())
        : definition.weapon?.model ? CharacterRig.loadProp(definition.weapon.model) : Promise.resolve(null),
      definition.offhand?.model ? CharacterRig.loadProp(definition.offhand.model) : Promise.resolve(null),
    ]);
    const prepared: PreparedRig = { definition, rig, prop: prop as THREE.Group | null, shield: shield as THREE.Group | null, strikes: null };
    // With its own props the rig can be measured now; the greybox sword is only lent to it as it is mounted.
    if (prop && (!definition.offhand || shield)) this.fitProps(prepared);
    return prepared;
  }

  /** Puts the props on the prepared rig's sockets, sizes it, and measures its attack clips with them. */
  private fitProps(p: PreparedRig): void {
    const { definition, rig } = p;
    const sword = p.prop ?? this.swordMesh;
    if (definition.weapon && !rig.attach(sword, definition.weapon)) {
      console.warn(`[Character ${this.id}] rig has no socket ${definition.weapon.socket}`);
    }
    if (definition.offhand) rig.attach(p.shield ?? this.shieldMesh, definition.offhand);
    // The scabbard hangs on the hips from the start, empty while the blade is drawn.
    const scabbard = definition.sheath?.build?.();
    if (scabbard && rig.attach(scabbard, definition.sheath!)) p.scabbard = scabbard;
    else if (scabbard) console.warn(`[Character ${this.id}] rig has no socket ${definition.sheath!.socket}`);
    if (definition.scale) rig.applyScale(definition.scale);
    const blade = definition.weapon?.blade ?? this.bladeSpan;
    // Hit windows straight from each attack clip's motion (scaled to the state's playback rate and start).
    const windows = new Map<CharacterState, HitWindow[]>();
    for (const [state, config] of Object.entries(definition.states) as [CharacterState, NonNullable<typeof definition.states.IDLE>][]) {
      if (!state.startsWith('ATTACK')) continue;
      const rate = config.timeScale ?? 1;
      const start = config.startAt ?? 0;
      const end = config.endAt ?? Infinity;
      const spans = rig.measureStrikes(config.clip, () => sword.localToWorld(new THREE.Vector3(0, blade[1], 0)))
        .filter((s) => s.t1 > start && s.t0 < end)
        .map((s) => ({ t0: Math.max(0, s.t0 - start) / rate, t1: (Math.min(s.t1, end) - start) / rate }));
      windows.set(state, spans);
    }
    p.strikes = windows;
  }

  /**
   * Wears a prepared rig (once: it is the character's from then on), disposing the one it had. `keepPose`: a clip a
   * cue was playing carries on in the new rig from the same moment (a change of clothes under a flash of light).
   */
  public mountRig(p: PreparedRig, keepPose = false): CharacterRig {
    const { definition, rig } = p;
    const was = keepPose && this.rig && this.scripted ? { clip: this.rig.clip, time: this.rig.time } : null;
    // Modelled weapons replace the greybox ones everywhere (sockets, sheathing, hit detection). The ones they replace
    // (the greybox's, or the last rig's: the lathi, the sword, the dhal) are freed, not only taken off: off its socket,
    // the old rig's dispose below never reaches a prop, and every change of chapter left one on the GPU (audit W-08).
    if (p.prop) {
      const old = this.swordMesh;
      old.removeFromParent();
      if (old !== p.prop) disposeObject(old);
      this.swordMesh = p.prop;
    }
    if (p.shield) {
      const old = this.shieldMesh;
      old.removeFromParent();
      if (old !== p.shield) disposeObject(old);
      this.shieldMesh = p.shield;
    }
    if (definition.weapon?.blade) this.bladeSpan = definition.weapon.blade;
    if (!p.strikes) this.fitProps(p);
    this.primitiveRoot.visible = false;
    this.modelGroup.add(rig.root);
    this.rig?.dispose();
    this.walkSpeed = definition.locomotion.walkSpeed;
    this.moveSpeed = definition.locomotion.moveSpeed;
    this.sprintSpeed = definition.locomotion.sprintSpeed;
    for (const state of Object.keys(TIMED_STATES) as CharacterState[]) {
      const config = definition.states[state];
      const seconds = config?.timesState ? rig.stateDuration(config) : undefined;
      if (seconds) this.stateMachine[TIMED_STATES[state]!] = seconds;
    }
    this.rig = rig;
    this.strikeWindows.clear();
    this.stateMachine.cancelAt = {};
    for (const [state, spans] of p.strikes!) {
      this.strikeWindows.set(state, spans);
      if (this.chainsEarly && spans.length) this.stateMachine.cancelAt[state] = spans[spans.length - 1].t1 + CANCEL_AFTER_STRIKE;
    }
    this.rigState = null;
    this.rigKey = null;
    this.lastGroundPos.copy(this.group.position);
    // The scabbard's hold as it was attached (a prepared rig is worn once, so it has not been lifted yet).
    const sheath = definition.sheath;
    this.scabbard = p.scabbard && sheath ? {
      object: p.scabbard,
      hold: p.scabbard.quaternion.clone(),
      grip: new THREE.Vector3(...sheath.grip),
      tip: (p.scabbard.userData.tip as THREE.Vector3 | undefined) ?? new THREE.Vector3(0, 1, 0),
    } : null;
    if (this.swordSheathed) this.stowSword(true);
    if (was?.clip && rig.clipInfo(was.clip)) this.playScripted({ clip: was.clip, fade: 0, startAt: was.time });
    return rig;
  }

  /**
   * Starts a jump. Its timing comes from the jump clip (a running one when `moving`): the character leaves the
   * ground at the clip's takeoff, with the speed that keeps it in the air exactly as long as the clip, so on flat
   * ground the feet touch down when the animation lands.
   */
  public beginJump(moving: boolean): void {
    const config = this.rig?.definition.states.JUMP;
    const clip = config ? (moving && config.movingClip) || config.clip : null;
    const air = clip ? this.rig!.clipInfo(clip)?.airborne : undefined;
    if (clip && air) {
      const rate = config!.timeScale ?? 1;
      const airtime = (air.landing - air.takeoff) / rate;
      const gravity = Math.abs(PhysicsWorld.getInstance().gravityY);
      this.jump = {
        clip,
        takeoff: air.takeoff / rate,
        landing: air.landing / rate,
        speed: THREE.MathUtils.clamp((gravity * airtime) / 2, 5, 8),
        recovery: (this.rig!.clipInfo(clip)!.duration - air.landing) / rate,
      };
    } else {
      this.jump = { clip, ...DEFAULT_JUMP };
    }
    this.jumpLaunched = false;
    this.stateMachine.changeState('JUMP');
  }

  /** The weapon's trail: it grows while the blade is in a swing and fades after (combat/SlashRibbon.ts). */
  private updateTrail(dt: number): void {
    this.weaponSegmentInto(_trailTip, _trailHilt);
    this.slashRibbon.update(_trailTip, _trailHilt, trailActive(this), dt, trailLookOf(this));
  }

  /** Plays the current state's clip, matches locomotion speed and applies root motion. */
  private updateRig(dt: number): void {
    const rig = this.rig!;
    const sm = this.stateMachine;
    const pos = this.group.position;
    const key = this.animationKey(dt);
    this.rigKeyAge += dt;
    // A new state, the same state re-entered (its timer restarted), or IDLE turning into REST or back (but a cue's
    // clip plays on until the state changes, as it always has: an entrance cued as the cutscene begins included).
    if (sm.currentState !== this.rigState || sm.stateTime < this.rigStateTime || (key !== this.rigKey && !this.scripted)) {
      // One walk, run or stand swapped for another moments after it began waits out the dwell (see `visualDwell`).
      const hop = key !== this.rigKey && this.rigKey !== null && !this.scripted && LOCOMOTION_KEYS.includes(key)
        && LOCOMOTION_KEYS.includes(this.rigKey) && this.rigKeyAge < this.visualDwell;
      if (!hop) {
        const config = this.stateAnimation(key);
        rig.play(sm.currentState === 'JUMP' && this.jump.clip ? { ...config, clip: this.jump.clip } : config);
        if (key !== this.rigKey) this.rigKeyAge = 0;
        this.rigState = sm.currentState;
        this.rigKey = key;
        this.scripted = false;
      }
    }
    this.rigStateTime = sm.stateTime;
    if (sm.currentState === 'JUMP') this.syncJumpClip();
    const root = rig.update(dt, this.visSpeed);
    rig.updateMounts(this.scripted ? sm.currentState : key, dt);
    this.liftScabbard();
    // Root motion is just more intended movement; the motor (end of update) resolves it with the rest.
    if (root) pos.add(root.multiplyScalar(this.rootMotionScale).applyAxisAngle(UP, this.group.rotation.y));
  }

  /** The clip and playback for `key`: the definition's entry, a stand-in where one is natural, else IDLE's. */
  private stateAnimation(key: CharacterState): StateAnimation {
    const states = this.rig!.definition.states;
    const own = states[key];
    if (own) return own;
    // No back-step of its own: its walk played backwards (never its forward run, which read as running in reverse).
    if (key === 'WALK_BACK' && states.WALK) return { clip: states.WALK.clip, reverse: true, fade: 0.25 };
    return states.IDLE;
  }

  /**
   * Plays a clip outside the state table (a scripted entrance) in the current state; the next change of state takes
   * over as usual.
   */
  protected playScripted(config: StateAnimation): void {
    if (!this.rig) return;
    this.rig.play(config);
    this.rigState = this.stateMachine.currentState;
    this.rigStateTime = this.stateMachine.stateTime;
    this.rigKey = this.animationKey(0);
    this.scripted = true;
  }

  /**
   * Which entry of the definition's state table animates the character now: its state's own, except at ease (see
   * `atEase`), where IDLE, and a walk or run that has not really moved for a moment, play REST. The state itself is
   * untouched, so whatever drives it (AI, input, a staged walk) carries on as before.
   */
  private animationKey(dt: number): CharacterState {
    const state = this.stateMachine.currentState;
    if (!this.atEase) {
      this.stillFor = 0;
      return state;
    }
    if (!LOCOMOTION_STATES.includes(state)) {
      this.stillFor = 0;
      return state === 'IDLE' ? 'REST' : state;
    }
    // Hysteresis: still once it has barely moved for a moment, moving again once it clearly does.
    if (this.actualSpeed < STILL_SPEED) this.stillFor += dt;
    else if (this.actualSpeed > MOVING_SPEED) this.stillFor = 0;
    return this.stillFor >= STILL_AFTER ? 'REST' : state;
  }

  /** A cutscene cue: plays one of the model's clips by name (see `playScripted`). False if it has no such clip. */
  public playClip(clip: string, options: { timeScale?: number; fade?: number; startAt?: number; reverse?: boolean } = {}): boolean {
    if (!this.rig?.clipInfo(clip)) return false;
    this.playScripted({ clip, ...options });
    return true;
  }

  /**
   * Keeps the jump clip in step with the physics: a longer fall (off a ledge) holds the last airborne pose until
   * the feet touch down, an early touchdown (onto a ledge) skips straight to the landing.
   */
  private syncJumpClip(): void {
    const rig = this.rig!;
    const air = this.jump.clip ? rig.clipInfo(this.jump.clip)?.airborne : undefined;
    if (!air || rig.clip !== this.jump.clip) return;
    const landed = this.jumpLaunched && !!this.motor?.grounded;
    const fallPose = air.landing - 1 / 30;
    if (!landed && this.jumpLaunched && rig.time >= fallPose) rig.hold(fallPose);
    else if (landed && rig.time < air.landing) {
      rig.hold(null);
      rig.seek(air.landing);
    } else rig.hold(null);
  }

  /**
   * Moves the sword between the hand and the scabbard on the hips at the sheathe clip's "sheathed" moment, where
   * the two sockets coincide: forwards while sheathing, backwards (in reverse) while drawing.
   */
  private updateSwordStowage(): void {
    const state = this.stateMachine.currentState;
    if (state !== 'SHEATHE' && state !== 'DRAW') return;
    const rig = this.rig;
    const config = rig?.definition.states[state];
    const mark = config ? rig!.clipInfo(config.clip)?.marks?.[SHEATHED_MARK] : undefined;
    const sheathing = state === 'SHEATHE';
    if (this.swordSheathed === sheathing) return; // already swapped
    if (mark === undefined || rig!.clip !== config!.clip) {
      // No sheathe clip: the sword simply goes away (or comes back) halfway through.
      const half = (sheathing ? this.stateMachine.SHEATHE_DURATION : this.stateMachine.DRAW_DURATION) / 2;
      if (this.stateMachine.stateTime >= half) this.stowSword(sheathing, true);
    } else if (sheathing ? rig!.time >= mark : rig!.time <= mark) {
      this.stowSword(sheathing, true);
    }
  }

  /**
   * Puts the sword in the scabbard (or back in hand). At the sheathe clip's mark the hand is at the scabbard's mouth
   * but holds the blade at its own angle, so `blend` lets the blade turn into the scabbard (or into the hand's hold)
   * over a moment instead of jumping; a chapter start or a change of rig puts it there at once.
   */
  public stowSword(sheathed: boolean, blend = false): void {
    const rig = this.rig;
    const def = rig?.definition;
    const into = def?.weapon && (sheathed ? def.sheath && stowedIn(def.weapon, def.sheath) : def.weapon);
    if (!into || !rig!.attach(this.swordMesh, into, { blend })) {
      // No scabbard of its own: the blade goes to the hips' socket as the hand held it, or out of sight.
      const socket = sheathed ? rig?.socket('Socket_Sheath') : def?.weapon && rig!.socket(def.weapon.socket);
      if (socket) socket.add(this.swordMesh);
      else this.swordMesh.visible = !sheathed;
    }
    this.swordSheathed = sheathed;
  }

  /**
   * The scabbard on the hips (`CharacterDefinition.sheath`): its hold on its socket, the blade's grip point it hangs
   * from, and its tip (both in its own frame).
   */
  private scabbard: { object: THREE.Object3D; hold: THREE.Quaternion; grip: THREE.Vector3; tip: THREE.Vector3 } | null = null;

  /**
   * Hung down and back from the hip, a scabbard's tip would go into the ground when he kneels or lands low; as a real
   * one does, it swings up about the hilt instead, just as far as keeps the tip a few centimetres off the ground (the
   * ground taken as his feet's height), and drops back as he rises. A blade in it goes with it.
   */
  private liftScabbard(): void {
    const sc = this.scabbard;
    const socket = sc?.object.parent;
    if (!sc || !socket) return;
    const obj = sc.object;
    obj.quaternion.copy(sc.hold);
    obj.position.copy(sc.grip).applyQuaternion(sc.hold).negate();
    // The blade in it: its own hold if that is still easing in from the hand (sheathed a moment ago), else the
    // scabbard's (it hangs at the same angle). Both are set from their holds every step, lifted or not.
    const blade = this.swordSheathed && this.swordMesh.parent === socket ? this.swordMesh : null;
    const grip = this.rig?.definition.weapon?.grip;
    const turn = _scabbardTurn.identity();
    socket.updateWorldMatrix(true, false);
    const pivot = _scabbardPivot.setFromMatrixPosition(socket.matrixWorld);
    obj.updateMatrix();
    const reach = _scabbardTip.copy(sc.tip).applyMatrix4(obj.matrix).applyMatrix4(socket.matrixWorld).sub(pivot);
    const length = reach.length();
    const floor = this.group.position.y + SCABBARD_CLEARANCE;
    if (length > 1e-3 && pivot.y + reach.y < floor) {
      const lift = Math.asin(THREE.MathUtils.clamp((floor - pivot.y) / length, -1, 1)) - Math.asin(reach.y / length);
      // About the level axis across the scabbard, in the world; then into the socket's frame, before its hold.
      const axis = _scabbardAxis.crossVectors(reach, UP).normalize();
      const socketQuat = socket.getWorldQuaternion(_scabbardQuat).invert();
      turn.setFromAxisAngle(axis.applyQuaternion(socketQuat), lift);
      obj.quaternion.premultiply(turn);
      obj.position.copy(sc.grip).applyQuaternion(obj.quaternion).negate();
    }
    if (blade && grip) {
      blade.quaternion.copy(this.rig!.holdOf(blade) ?? sc.hold).premultiply(turn);
      blade.position.set(...grip).applyQuaternion(blade.quaternion).negate();
    }
  }

  /** Follow-up swings may cut the current one short once its blade has finished (`CharacterStateMachine.cancelAt`). */
  protected chainsEarly = false;

  /** Stretches the current clip's root-motion travel (a leap aimed at a target further than the clip goes). */
  public rootMotionScale = 1;

  /** The blade's extent up the weapon's local +Y (m): its hit-detection segment. */
  private bladeSpan: [number, number] = [0.05, 1.15];

  /** Total height of the body capsule (set with the physics; a greybox default before that). */
  public bodyHeight = 1.9;
  /** Measured per attack state from the rig's clips: when the blade is really swinging (state seconds). */
  private readonly strikeWindows = new Map<CharacterState, HitWindow[]>();

  /** Standing height of what is drawn (the rig's model, or the capsule for the greybox), metres. */
  public visualHeight(): number {
    const rig = this.rig;
    return rig ? rig.manifest.height * (rig.definition.scale ?? 1) : this.bodyHeight;
  }

  /** The body's hurt volume: the physics capsule, standing on the feet. */
  public hurtCapsule(): { a: THREE.Vector3; b: THREE.Vector3; radius: number } {
    const radius = this.motor?.radius ?? 0.4;
    const feet = this.group.position;
    return {
      a: new THREE.Vector3(feet.x, feet.y + radius, feet.z),
      b: new THREE.Vector3(feet.x, feet.y + Math.max(this.bodyHeight - radius, radius), feet.z),
      radius,
    };
  }

  /**
   * When `state`'s blade can land, in state seconds: one entry per strike. An animated character's windows come
   * from its clips; the greybox falls back to `defaultHitWindows`.
   */
  public hitWindows(state: CharacterState = this.stateMachine.currentState): HitWindow[] {
    return this.strikeWindows.get(state) ?? this.defaultHitWindows(state);
  }

  /** Greybox swings: the middle of the swing. Subclasses with hand-timed attacks override this. */
  protected defaultHitWindows(state: CharacterState): HitWindow[] {
    const d = this.stateMachine.attackDuration(state);
    return d > 0 ? [{ t0: d * 0.15, t1: d * 0.75 }] : [];
  }

  /**
   * Until when (state seconds) an attacker may still turn toward its target: committed from shortly before its
   * first strike, so a side-step can beat the swing.
   */
  public trackUntil(state: CharacterState = this.stateMachine.currentState): number {
    const first = this.hitWindows(state)[0];
    return first ? Math.max(0, first.t0 - 0.15) : 0;
  }

  /**
   * Turns toward `yaw` at no more than `maxRate` rad/s, always the short way round; returns the angle left to turn.
   * The turn has weight: its speed builds and falls at `turnAccel` at most, it eases into the heading, and it ignores
   * a bearing within the deadzone. Staging passes a tighter deadzone so marks are faced exactly.
   * (Never lerp angles directly: across +-PI that spins the long way.)
   */
  public turnToward(yaw: number, maxRate: number, dt: number, options: TurnOptions = {}): number {
    const { accel = this.turnAccel, gain = TURN_GAIN, deadzone = TURN_DEADZONE } = options;
    const diff = wrapAngle(yaw - this.group.rotation.y);
    this.turnedThisStep = true;
    if (dt <= 0) return diff;
    if (Math.abs(diff) < deadzone && Math.abs(this.yawVel) < 0.2) {
      this.yawVel = 0;
      this.turnedYaw = this.group.rotation.y;
      return diff;
    }
    // The turn speed it wants: proportional to the angle left (it eases in), capped by its rate and by what it can
    // still brake to rest from at `accel` (so it never overshoots). The turn speed itself changes by `accel` at most.
    const want = Math.sign(diff) * Math.min(maxRate, gain * Math.abs(diff), Math.sqrt(2 * accel * Math.abs(diff)));
    this.yawVel += THREE.MathUtils.clamp(want - this.yawVel, -accel * dt, accel * dt);
    let step = this.yawVel * dt;
    if (Math.sign(step) === Math.sign(diff) && Math.abs(step) > Math.abs(diff)) {
      step = diff;
      this.yawVel = diff / dt;
    }
    this.group.rotation.y = wrapAngle(this.group.rotation.y + step);
    this.turnedYaw = this.group.rotation.y;
    return wrapAngle(diff - step);
  }

  /**
   * A turn nothing kept steering this step (a swing committed, a stagger, a mark reached) coasts to a stop at
   * `turnAccel` rather than halting in one step. A heading set outright meanwhile (a placement) cancels it instead.
   */
  private coastTurn(dt: number): void {
    if (!this.turnedThisStep && this.yawVel !== 0) {
      if (Math.abs(wrapAngle(this.group.rotation.y - this.turnedYaw)) > 1e-5) this.yawVel = 0;
      else {
        const v = this.yawVel;
        this.yawVel = v > 0 ? Math.max(0, v - this.turnAccel * dt) : Math.min(0, v + this.turnAccel * dt);
        this.group.rotation.y = wrapAngle(this.group.rotation.y + this.yawVel * dt);
        this.turnedYaw = this.group.rotation.y;
      }
    }
    this.turnedThisStep = false;
  }

  /** The dhal is up: a held guard, a blow being absorbed, or a parry whose deflection window has passed. */
  public isGuarding(): boolean {
    const state = this.stateMachine.currentState;
    return state === 'BLOCK' || state === 'BLOCK_HIT' || (state === 'PARRY' && !this.stateMachine.isParryActive);
  }

  /** Whether `point` lies within `maxAngle` (radians) either side of where the character faces. */
  public isFacing(point: THREE.Vector3, maxAngle = THREE.MathUtils.degToRad(100)): boolean {
    const toX = point.x - this.group.position.x;
    const toZ = point.z - this.group.position.z;
    const yaw = this.group.rotation.y;
    const cos = (Math.sin(yaw) * toX + Math.cos(yaw) * toZ) / (Math.hypot(toX, toZ) || 1);
    return cos >= Math.cos(maxAngle);
  }

  /** True while the current state's clip moves the character itself (scripted lunges should stand down). */
  public rigDrivesMotion(state: CharacterState): boolean {
    return !!this.rig?.definition.states[state]?.rootMotion;
  }

  /** Where the weapon's business end is now (world), into `out`; nothing allocated (read every frame on wet ground). */
  public weaponTipInto(out: THREE.Vector3): THREE.Vector3 {
    this.swordMesh.updateWorldMatrix(true, false);
    return this.swordMesh.localToWorld(out.set(0, this.bladeSpan[1], 0));
  }

  /** The blade's tip and hilt now (world), into the given vectors; nothing allocated (the trail reads it every frame). */
  public weaponSegmentInto(tip: THREE.Vector3, hilt: THREE.Vector3): void {
    if (this.rig) {
      this.swordMesh.updateWorldMatrix(true, false);
      this.swordMesh.localToWorld(tip.set(0, this.bladeSpan[1], 0));
      this.swordMesh.localToWorld(hilt.set(0, this.bladeSpan[0], 0));
      return;
    }
    const w = this.getWeaponPoints();
    tip.copy(w.tip);
    hilt.copy(w.hilt);
  }

  public getWeaponPoints(): { tip: THREE.Vector3; hilt: THREE.Vector3 } {
    if (this.rig) {
      // The sword rides the rig's hand socket: read its blade straight from the animated skeleton.
      this.swordMesh.updateWorldMatrix(true, false);
      return {
        hilt: this.swordMesh.localToWorld(new THREE.Vector3(0, this.bladeSpan[0], 0)),
        tip: this.swordMesh.localToWorld(new THREE.Vector3(0, this.bladeSpan[1], 0)),
      };
    }
    const rSocket = this.getSocket('mixamorigRightHand');
    const hilt = new THREE.Vector3();
    const tip = new THREE.Vector3();

    if (rSocket) {
      rSocket.getWorldPosition(hilt);
      const quat = new THREE.Quaternion();
      rSocket.getWorldQuaternion(quat);
      const dir = new THREE.Vector3(0, 1.1, 0).applyQuaternion(quat);
      tip.copy(hilt).add(dir);
    } else {
      this.group.getWorldPosition(hilt);
      tip.copy(hilt).add(new THREE.Vector3(0, 1.1, 0.8));
    }

    return { tip, hilt };
  }

  public takeDamage(amount: number): void {
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    if (this.currentHealth <= 0) {
      this.stateMachine.changeState('DEAD');
    }
  }

  public addMarmaDamage(amount: number): boolean {
    this.timeSinceLastPostureHit = 0;
    this.currentMarma = Math.min(this.maxMarma, this.currentMarma + amount);

    if (this.currentMarma >= this.maxMarma) {
      this.currentMarma = this.maxMarma;
      this.stateMachine.changeState('POSTURE_BROKEN');
      return true; // Posture broken!
    }
    return false;
  }

  /**
   * Procedural animation updates for greybox limbs based on state machine
   */
  public updateProceduralAnimations(dt: number, moveMagnitude: number): void {
    const state = this.stateMachine.currentState;
    const t = this.stateMachine.stateTime;
    if (this.rig) {
      // The rig animates the body; the weapon's trail is laid in `update`, every step (not only when this runs).
      return;
    }

    let targetRightArmRot = new THREE.Euler(0, 0, 0);
    let targetLeftArmRot = new THREE.Euler(0, 0, 0);
    let targetTorsoRot = new THREE.Euler(0, 0, 0);
    let targetTorsoY = 0.9;

    const runCycle = Math.sin(performance.now() * 0.012);

    if (state === 'IDLE') {
      const breath = Math.sin(performance.now() * 0.003) * 0.04;
      targetTorsoY = 0.9 + breath;
      targetRightArmRot.set(0.2 + breath, -0.2, 0.1);
      targetLeftArmRot.set(0.4, 0.3, -0.2);
    } else if (state === 'MOVE' || state === 'SPRINT') {
      const mult = state === 'SPRINT' ? 1.6 : 1.0;
      targetTorsoY = 0.9 + Math.abs(runCycle) * 0.08 * mult;
      targetRightArmRot.set(-runCycle * 0.6 * mult, 0, 0.1);
      targetLeftArmRot.set(runCycle * 0.6 * mult + 0.3, 0.2, -0.2);
      targetTorsoRot.x = 0.15 * mult;
    } else if (state === 'ATTACK_1') {
      const p = Math.min(1.0, t / this.stateMachine.ATTACK_1_DURATION);
      const swing = Math.sin(p * Math.PI);
      targetTorsoRot.y = (0.5 - p) * 1.6;
      targetRightArmRot.set(-0.6 + swing * 1.5, 0.8 - p * 1.6, -swing * 0.4);
    } else if (state === 'ATTACK_2') {
      const p = Math.min(1.0, t / this.stateMachine.ATTACK_2_DURATION);
      const swing = Math.sin(p * Math.PI);
      targetTorsoRot.x = swing * 0.3;
      targetRightArmRot.set(1.4 - p * 2.6, -0.2, 0.3);
    } else if (state === 'ATTACK_3') {
      const p = Math.min(1.0, t / this.stateMachine.ATTACK_3_DURATION);
      targetTorsoRot.y = p * Math.PI * 2;
      targetRightArmRot.set(-0.2, 1.2, 0.5);
    } else if (state === 'PARRY') {
      targetLeftArmRot.set(1.1, 0.6, -0.3);
      targetRightArmRot.set(-0.4, -0.4, 0.2);
      targetTorsoRot.y = 0.35;
    } else if (state === 'DEFLECTED' || state === 'STAGGER') {
      const p = Math.min(1.0, t / this.stateMachine.STAGGER_DURATION);
      targetTorsoRot.x = -0.4 * (1 - p);
      targetRightArmRot.set(-0.8 * (1 - p), 0.4, 0);
    } else if (state === 'POSTURE_BROKEN') {
      targetTorsoY = 0.55;
      targetTorsoRot.x = 0.45;
      targetRightArmRot.set(0.1, 0, 0);
      targetLeftArmRot.set(0.1, 0, 0);
    }

    const lerpSpeed = 1.0 - Math.exp(-22 * dt);
    this.torsoMesh.position.y = THREE.MathUtils.lerp(this.torsoMesh.position.y, targetTorsoY, lerpSpeed);
    this.torsoMesh.rotation.x = THREE.MathUtils.lerp(this.torsoMesh.rotation.x, targetTorsoRot.x, lerpSpeed);
    this.torsoMesh.rotation.y = THREE.MathUtils.lerp(this.torsoMesh.rotation.y, targetTorsoRot.y, lerpSpeed);
    this.torsoMesh.rotation.z = THREE.MathUtils.lerp(this.torsoMesh.rotation.z, targetTorsoRot.z, lerpSpeed);

    this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, targetRightArmRot.x, lerpSpeed);
    this.rightArm.rotation.y = THREE.MathUtils.lerp(this.rightArm.rotation.y, targetRightArmRot.y, lerpSpeed);
    this.rightArm.rotation.z = THREE.MathUtils.lerp(this.rightArm.rotation.z, targetRightArmRot.z, lerpSpeed);

    this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, targetLeftArmRot.x, lerpSpeed);
    this.leftArm.rotation.y = THREE.MathUtils.lerp(this.leftArm.rotation.y, targetLeftArmRot.y, lerpSpeed);
    this.leftArm.rotation.z = THREE.MathUtils.lerp(this.leftArm.rotation.z, targetLeftArmRot.z, lerpSpeed);

    // Update weapon ribbon trail
    const { tip, hilt } = this.getWeaponPoints();
    this.slashRibbon.update(tip, hilt, trailActive(this), dt, trailLookOf(this));
  }

  public override update(dt: number): void {
    super.update(dt);
    this.stateMachine.update(dt);
    if (this.rig) this.updateRig(dt);
    // A blow's flinch and push, laid over the pose the rig has just taken (combat/HitReact.ts).
    HitReact.step(this, dt);
    if (this.rig) this.updateTrail(dt);
    this.updateSwordStowage();

    // Marma posture natural decay
    this.timeSinceLastPostureHit += dt;
    if (this.timeSinceLastPostureHit > this.marmaDecayDelay && this.stateMachine.currentState !== 'POSTURE_BROKEN') {
      this.currentMarma = Math.max(0, this.currentMarma - this.marmaDecayRate * dt);
    }

    if (this.stateMachine.currentState === 'POSTURE_BROKEN' && this.stateMachine.stateTime >= this.stateMachine.POSTURE_BROKEN_DURATION) {
      this.currentMarma = 0;
    }

    this.coastTurn(dt);
    // Last: everything this step moved the character freely; collide, step and fall in one place.
    this.motor?.resolve(this.group.position, dt);
    const pos = this.group.position;
    if (dt > 0) {
      // Its own pace, not a neighbour's shove (fix 5): the stride keeps time with where it is really going.
      const x = pos.x - this.lastGroundPos.x - this.sepPush.x;
      const z = pos.z - this.lastGroundPos.z - this.sepPush.z;
      this.actualSpeed = Math.hypot(x, z) / dt;
      this.visSpeed += (this.actualSpeed - this.visSpeed) * (1 - Math.exp(-STRIDE_FILTER * dt));
    }
    this.sepPush.set(0, 0, 0);
    this.lastGroundPos.copy(pos);
  }
}

/** How `turnToward` turns: its angular acceleration (rad/s^2), ease-in gain (1/s) and deadzone (radians). */
export interface TurnOptions {
  accel?: number;
  gain?: number;
  deadzone?: number;
}

/** A span of an attack (state seconds) in which its blade can land; each window lands at most once. */
export interface HitWindow {
  t0: number;
  t1: number;
}

/**
 * How a stowable blade sits in its scabbard: the weapon's own attachment (its grip and size) on the scabbard's socket
 * at the scabbard's angle, so blade and scabbard share one hold and only the hilt shows.
 */
function stowedIn(weapon: SocketAttachment, sheath: SocketAttachment): SocketAttachment {
  return {
    ...weapon,
    socket: sheath.socket,
    socketFrame: sheath.socketFrame,
    restWorldRotation: sheath.restWorldRotation,
    stateRotations: undefined,
    stateGrips: undefined,
    oneHandGrip: undefined,
    twoHanded: undefined,
  };
}

/** The same angle in (-PI, PI]. */
export function wrapAngle(a: number): number {
  return a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
}

/** A rig loaded and fitted with its props, ready to wear (`Character.prepareRig` / `mountRig`). */
export interface PreparedRig {
  definition: CharacterDefinition;
  rig: CharacterRig;
  prop: THREE.Group | null;
  shield: THREE.Group | null;
  /** The scabbard on its socket (`CharacterDefinition.sheath`), once the props are fitted. */
  scabbard?: THREE.Object3D;
  /** Hit windows per attack state, measured with the props on (null until they are). */
  strikes: Map<CharacterState, HitWindow[]> | null;
}

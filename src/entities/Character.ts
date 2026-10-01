import * as THREE from 'three';
import { Entity } from './Entity';
import { CharacterStateMachine, type CharacterState, type TimedStateKey } from './CharacterStateMachine';
import { SlashRibbon } from '../combat/SlashRibbon';
import { CharacterRig, type CharacterDefinition } from './animation/CharacterRig';
import { CharacterMotor, DEFAULT_MOTOR, type MotorOptions } from '../physics/CharacterMotor';
import { PhysicsWorld } from '../core/PhysicsWorld';
import type RAPIER from '@dimforge/rapier3d-compat';

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
};
const SHEATHED_MARK = 'sheathed';
// A jump without clip timing (greybox): leaves at once, ~1 m high.
const DEFAULT_JUMP = { takeoff: 0, landing: 0.58, speed: 7, recovery: 0.12 };

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

  // Dodge direction vector
  public dodgeDirection = new THREE.Vector3(0, 0, 1);
  public dodgeSpeed = 11.5;

  /** Collision, gravity and stepping; null until `attachPhysics` (then gameplay moves are resolved by it). */
  public motor: CharacterMotor | null = null;
  /** Skinned, animated model that replaces the greybox once `attachRig` resolves. */
  public rig: CharacterRig | null = null;
  private rigState: CharacterState | null = null;
  private rigStateTime = 0;
  private readonly lastGroundPos = new THREE.Vector3();

  constructor(id: string, color = 0xd4af37, ribbonColor = 0xffd15c) {
    super(id);

    this.stateMachine = new CharacterStateMachine();
    this.primitiveRoot = new THREE.Group();
    this.modelGroup.add(this.primitiveRoot);

    // Procedural weapon ribbon
    this.slashRibbon = new SlashRibbon(ribbonColor, 0.75);

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
   * Gives the character a physical capsule: from now on every fixed step's movement (input, AI, dodges, lunges,
   * root motion) is resolved against the level, other fighters and gravity by a `CharacterMotor`.
   * @param footOffset capsule centre height above the feet (half-height + radius)
   */
  public attachPhysics(body: RAPIER.RigidBody, collider: RAPIER.Collider, footOffset: number, options: MotorOptions = DEFAULT_MOTOR): void {
    this.motor?.dispose();
    this.rigidBody = body;
    this.collider = collider;
    this.motor = new CharacterMotor(body, collider, footOffset, options);
    this.motor.teleport(this.group.position);
    this.lastGroundPos.copy(this.group.position);
  }

  /** Teleport (spawns, respawns): skips collision and resets falling. */
  public override setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
    this.lastGroundPos.set(x, y, z);
    if (this.motor) this.motor.teleport(this.group.position);
    else this.rigidBody?.setTranslation({ x, y, z }, true);
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
    const rig = await CharacterRig.load(definition);
    if (definition.weapon && !rig.attach(this.swordMesh, definition.weapon)) {
      console.warn(`[Character ${this.id}] rig has no socket ${definition.weapon.socket}`);
    }
    if (definition.offhand) rig.attach(this.shieldMesh, definition.offhand);
    this.primitiveRoot.visible = false;
    this.modelGroup.add(rig.root);
    this.walkSpeed = definition.locomotion.walkSpeed;
    this.moveSpeed = definition.locomotion.moveSpeed;
    this.sprintSpeed = definition.locomotion.sprintSpeed;
    for (const state of Object.keys(TIMED_STATES) as CharacterState[]) {
      const config = definition.states[state];
      const seconds = config?.timesState ? rig.stateDuration(config) : undefined;
      if (seconds) this.stateMachine[TIMED_STATES[state]!] = seconds;
    }
    this.rig = rig;
    this.rigState = null;
    this.lastGroundPos.copy(this.group.position);
    if (this.swordSheathed) this.stowSword(true);
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

  /** Plays the current state's clip, matches locomotion speed and applies root motion. */
  private updateRig(dt: number): void {
    const rig = this.rig!;
    const sm = this.stateMachine;
    const pos = this.group.position;
    const groundSpeed = dt > 0 ? Math.hypot(pos.x - this.lastGroundPos.x, pos.z - this.lastGroundPos.z) / dt : 0;
    // A new state, or the same state re-entered (its timer restarted).
    if (sm.currentState !== this.rigState || sm.stateTime < this.rigStateTime) {
      const config = rig.definition.states[sm.currentState] ?? rig.definition.states.IDLE;
      rig.play(sm.currentState === 'JUMP' && this.jump.clip ? { ...config, clip: this.jump.clip } : config);
      this.rigState = sm.currentState;
    }
    this.rigStateTime = sm.stateTime;
    if (sm.currentState === 'JUMP') this.syncJumpClip();
    const root = rig.update(dt, groundSpeed);
    // Root motion is just more intended movement; the motor (end of update) resolves it with the rest.
    if (root) pos.add(root.applyAxisAngle(UP, this.group.rotation.y));
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
      if (this.stateMachine.stateTime >= half) this.stowSword(sheathing);
    } else if (sheathing ? rig!.time >= mark : rig!.time <= mark) {
      this.stowSword(sheathing);
    }
  }

  /** Puts the sword in the scabbard (or back in hand), keeping its grip so the swap at the sheathe mark is seamless. */
  public stowSword(sheathed: boolean): void {
    const hand = this.rig?.definition.weapon ? this.rig.socket(this.rig.definition.weapon.socket) : undefined;
    const scabbard = this.rig?.socket('Socket_Sheath');
    if (hand && scabbard) (sheathed ? scabbard : hand).add(this.swordMesh);
    else this.swordMesh.visible = !sheathed;
    this.swordSheathed = sheathed;
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

  public getWeaponPoints(): { tip: THREE.Vector3; hilt: THREE.Vector3 } {
    if (this.rig) {
      // The sword rides the rig's hand socket: read its blade straight from the animated skeleton.
      this.swordMesh.updateWorldMatrix(true, false);
      return {
        hilt: this.swordMesh.localToWorld(new THREE.Vector3(0, 0.05, 0)),
        tip: this.swordMesh.localToWorld(new THREE.Vector3(0, 1.15, 0)),
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
      // The rig animates the body; only the weapon trail is procedural.
      const { tip, hilt } = this.getWeaponPoints();
      this.slashRibbon.update(tip, hilt, state.startsWith('ATTACK'));
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
    } else if (state === 'DODGE_ROLL') {
      const p = Math.min(1.0, t / this.stateMachine.DODGE_DURATION);
      targetTorsoRot.x = p * Math.PI * 2;
      targetTorsoY = 0.4 + Math.sin(p * Math.PI) * 0.4;
      targetRightArmRot.set(-1.0, 0, 0);
      targetLeftArmRot.set(-1.0, 0, 0);
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
    const isAttacking = state.startsWith('ATTACK');
    const { tip, hilt } = this.getWeaponPoints();
    this.slashRibbon.update(tip, hilt, isAttacking);
  }

  public override update(dt: number): void {
    super.update(dt);
    this.stateMachine.update(dt);
    if (this.rig) this.updateRig(dt);
    this.updateSwordStowage();

    // Marma posture natural decay
    this.timeSinceLastPostureHit += dt;
    if (this.timeSinceLastPostureHit > this.marmaDecayDelay && this.stateMachine.currentState !== 'POSTURE_BROKEN') {
      this.currentMarma = Math.max(0, this.currentMarma - this.marmaDecayRate * dt);
    }

    if (this.stateMachine.currentState === 'POSTURE_BROKEN' && this.stateMachine.stateTime >= this.stateMachine.POSTURE_BROKEN_DURATION) {
      this.currentMarma = 0;
    }

    // Last: everything this step moved the character freely; collide, step and fall in one place.
    this.motor?.resolve(this.group.position, dt);
    this.lastGroundPos.copy(this.group.position);
  }
}

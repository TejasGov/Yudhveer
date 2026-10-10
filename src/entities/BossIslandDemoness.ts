import * as THREE from 'three';
import { Boss } from './Boss';
import type { CharacterState } from './CharacterStateMachine';
import { CharacterRig, type CharacterDefinition } from './animation/CharacterRig';
import { asset } from '../core/Assets';
import { disposeObject } from '../levels/GLBLevel';
import { createToonRamp, toonifyModel } from '../levels/environment/ToonRelight';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { axePose, AXE_WINDOWS, AXE_TIP, AXE_HEEL } from '../combat/ChainAxeMotion';
import type { HeroRead } from '../combat/Tactics';

const CHAIN_UP = new THREE.Vector3(0, 1, 0);
const HOLD_ROTATION = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.3);

/**
 * The keeper before the island's sealed mace room. A single chained axe sweeps, slams and throws, then comes back.
 * The travelling blade is the only damaging part; the connecting chain is a visual tether. Timed authored paths
 * make wind-up, commitment and recovery readable without a spring solver changing the blow on different machines.
 * CombatSystem sees the usual swept blade segment and applies its existing guard, parry, slide and posture code.
 * These paths and the first-pass body rig are a playable prototype; final animation and balance need playtesting.
 */
export class BossIslandDemoness extends Boss {
  private readonly axe = new THREE.Group();
  private readonly tether = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.035, 0.009, 4, 8), new THREE.MeshToonMaterial({ color: 0x8c6a44 }), 128,
  );
  private readonly linkPose = new THREE.Object3D();
  private readonly linkDirection = new THREE.Vector3();
  private readonly hand = new THREE.Vector3(0.8, 2.1, 0.3);
  private readonly bladeTip = new THREE.Vector3();
  private readonly bladeHilt = new THREE.Vector3();
  private readonly physics = PhysicsWorld.getInstance();
  private readonly previousHead = new THREE.Vector3();
  private readonly head = new THREE.Vector3();
  private readonly origin = new THREE.Vector3();
  private readonly travel = new THREE.Vector3();
  private readonly recallPosition = new THREE.Vector3();
  private readonly recallRotation = new THREE.Quaternion();
  private poseState: CharacterState = 'IDLE';
  private poseTime = 0;
  private recallTime = 0;
  private recalling = false;
  private obstructed = false;
  private hasPreviousHead = false;
  private attackReach = 2.5;
  private closeAttack = false;

  constructor(id = 'island_demoness') {
    super(id, 0x5f3430, { attackInterval: 2.1, strikeRange: 4.8, tooClose: 1.5, leapRange: 100, leapMax: 100, roarRange: 0 });
    this.displayName = 'Spider Demoness'; this.epithet = 'Keeper of the sealed shrine';
    this.maxHealth = this.currentHealth = 480; this.maxMarma = 130; this.renewsPosture = true;
    this.damageScale = 0.65; this.moveSpeed = 2.3; this.turnRate = 2.8; this.hasRoared = true;
    this.lungeSpec = { a: 0, b: 0, maxDist: 0, stopDist: 1.5 };
    this.axe.name = 'TravellingChainAxe';
    this.tether.frustumCulled = false;
    this.group.add(this.axe, this.tether);
    this.poseAxe(0);
  }

  public override async attachRig(definition: CharacterDefinition): Promise<CharacterRig> {
    const rig = await super.attachRig(definition);
    const prop = await CharacterRig.loadProp(asset('weapons/island_chain_axe.glb'));
    if (this.retired) { disposeObject(prop); return rig; }
    toonifyModel(prop, createToonRamp([0.18, 0.46, 0.8, 1]));
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
    return 0.35; // Aim during the tell; the entire strike and recall keep that heading.
  }

  public override update(dt: number): void {
    super.update(dt);
    this.poseAxe(dt);
  }

  private poseAxe(dt: number): void {
    const state = this.stateMachine.currentState, t = this.stateMachine.stateTime;
    const changed = state !== this.poseState || t < this.poseTime;
    if (changed) {
      if (!state.startsWith('ATTACK') && this.poseState.startsWith('ATTACK')) this.beginRecall();
      if (state.startsWith('ATTACK')) {
        this.obstructed = false; this.recalling = false;
      }
      this.poseState = state;
    }
    this.poseTime = t;
    const socket = this.rig?.root.getObjectByName('Socket_Hand_R');
    if (socket) {
      this.group.updateWorldMatrix(true, true);
      socket.getWorldPosition(this.hand); this.group.worldToLocal(this.hand);
    }
    axePose(state, t, this.attackReach, this.hand, this.axe.position, this.axe.quaternion);
    if (this.recalling) {
      this.recallTime += dt;
      const k = THREE.MathUtils.smoothstep(this.recallTime, 0, 0.4);
      this.axe.position.lerpVectors(this.recallPosition, this.hand, k);
      this.axe.quaternion.slerpQuaternions(this.recallRotation, HOLD_ROTATION, k);
      if (k >= 1) this.recalling = false;
    } else if (this.obstructed) {
      this.axe.position.copy(this.hand); this.axe.rotation.set(0, 0, -0.3);
    }
    this.clipToCave(state);
    this.axe.visible = this.tether.visible = state !== 'DEAD';
    this.axe.updateMatrixWorld(true);
    const distance = this.hand.distanceTo(this.axe.position);
    this.tether.count = distance < 0.08 ? 0 : Math.min(128, Math.ceil(distance / 0.055));
    for (let i = 0; i < this.tether.count; i++) {
      const k = (i + 0.5) / this.tether.count;
      this.linkPose.position.lerpVectors(this.hand, this.axe.position, k);
      const sag = Math.min(0.25, distance * 0.08);
      this.linkPose.position.y -= sag * Math.sin(k * Math.PI);
      this.linkDirection.subVectors(this.axe.position, this.hand);
      this.linkDirection.y -= sag * Math.PI * Math.cos(k * Math.PI);
      if (this.linkDirection.lengthSq() < 1e-6) this.linkDirection.set(0, 1, 0);
      this.linkPose.quaternion.setFromUnitVectors(CHAIN_UP, this.linkDirection.normalize());
      this.linkPose.rotateY(i % 2 ? Math.PI / 2 : 0);
      this.linkPose.updateMatrix(); this.tether.setMatrixAt(i, this.linkPose.matrix);
    }
    this.tether.instanceMatrix.needsUpdate = true;
  }

  private beginRecall(): void {
    this.recallPosition.copy(this.axe.position); this.recallRotation.copy(this.axe.quaternion);
    this.recallTime = 0; this.recalling = true;
  }

  /**
   * Sweep a conservative sphere around the axe head against scenery, both along the tether and since last step.
   * Fighter capsules and sensors are excluded; they still use CombatSystem's parry/guard/body contact. A rock hit
   * cancels damage for the rest of this attack and recalls from the contact point, including on the return leg.
   */
  private clipToCave(state: CharacterState): void {
    this.group.updateWorldMatrix(true, true);
    this.axe.localToWorld(this.head.set(-0.3, 0.4, 0));
    const { world, RAPIER_INSTANCE: R } = this.physics;
    if (world && R && state !== 'DEAD') {
      const shape = new R.Ball(0.4);
      const flags = R.QueryFilterFlags.EXCLUDE_DYNAMIC | R.QueryFilterFlags.EXCLUDE_KINEMATIC | R.QueryFilterFlags.EXCLUDE_SENSORS;
      let blocked = false;
      const sweep = (from: THREE.Vector3) => {
        this.travel.subVectors(this.head, from);
        const length = this.travel.length();
        if (length < 1e-5) return;
        this.travel.divideScalar(length);
        const hit = world.castShape(from, { x: 0, y: 0, z: 0, w: 1 }, this.travel, shape, 0.02, length, true, flags);
        if (hit) {
          this.head.copy(from).addScaledVector(this.travel, Math.max(0, hit.time_of_impact - 0.02));
          blocked = true;
        }
      };
      this.group.localToWorld(this.origin.copy(this.hand));
      sweep(this.origin);
      if (this.hasPreviousHead && this.previousHead.distanceTo(this.head) < 3) sweep(this.previousHead);
      if (blocked) {
        this.axe.localToWorld(this.origin.set(-0.3, 0.4, 0));
        this.group.worldToLocal(this.origin); this.group.worldToLocal(this.head);
        this.axe.position.add(this.head.sub(this.origin));
        if (!this.obstructed && state.startsWith('ATTACK')) {
          this.obstructed = true; this.beginRecall();
          this.soundFX.playHitImpact('crush');
        }
      }
    }
    this.axe.updateWorldMatrix(true, false);
    this.axe.localToWorld(this.previousHead.set(-0.3, 0.4, 0)); this.hasPreviousHead = true;
  }

  public override getWeaponPoints() {
    this.group.updateWorldMatrix(true, true);
    return { tip: this.axe.localToWorld(this.bladeTip.copy(AXE_TIP)).clone(), hilt: this.axe.localToWorld(this.bladeHilt.copy(AXE_HEEL)).clone() };
  }

  public override weaponSegmentInto(tip: THREE.Vector3, hilt: THREE.Vector3): void {
    this.group.updateWorldMatrix(true, true);
    this.axe.localToWorld(tip.copy(AXE_TIP)); this.axe.localToWorld(hilt.copy(AXE_HEEL));
  }

  public override weaponTipInto(out: THREE.Vector3): THREE.Vector3 {
    this.axe.updateWorldMatrix(true, false);
    return this.axe.localToWorld(out.copy(AXE_TIP));
  }
}

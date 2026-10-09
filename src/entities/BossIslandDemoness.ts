import * as THREE from 'three';
import { Boss } from './Boss';
import type { CharacterState } from './CharacterStateMachine';
import { CharacterRig, type CharacterDefinition } from './animation/CharacterRig';
import { asset } from '../core/Assets';
import { disposeObject } from '../levels/GLBLevel';
import { createToonRamp, toonifyModel } from '../levels/environment/ToonRelight';

const CHAIN_UP = new THREE.Vector3(0, 1, 0);

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

  constructor(id = 'island_demoness') {
    super(id, 0x5f3430, { attackInterval: 1.8, strikeRange: 5.8, tooClose: 1.5, leapRange: 100, leapMax: 100, roarRange: 0 });
    this.displayName = 'Spider Demoness'; this.epithet = 'Keeper of the sealed shrine';
    this.maxHealth = this.currentHealth = 480; this.maxMarma = 130; this.renewsPosture = true;
    this.damageScale = 0.65; this.moveSpeed = 2.3; this.turnRate = 2.8; this.hasRoared = true;
    this.lungeSpec = { a: 0, b: 0, maxDist: 0, stopDist: 1.5 };
    this.axe.name = 'TravellingChainAxe';
    this.tether.frustumCulled = false;
    this.group.add(this.axe, this.tether);
    this.poseAxe();
  }

  public override async attachRig(definition: CharacterDefinition): Promise<CharacterRig> {
    const rig = await super.attachRig(definition);
    const prop = await CharacterRig.loadProp(asset('weapons/island_chain_axe.glb'));
    if (this.retired) { disposeObject(prop); return rig; }
    toonifyModel(prop, createToonRamp([0.18, 0.46, 0.8, 1]));
    prop.position.y = -0.45; // The source includes a hanging chain below the handle; hold it above that chain.
    this.swordMesh.removeFromParent();
    this.axe.add(prop); this.swordMesh = this.axe;
    return rig;
  }

  public override hitWindows(state: CharacterState = this.stateMachine.currentState) {
    if (state === 'ATTACK_1') return [{ t0: 0.65, t1: 1.05 }];
    if (state === 'ATTACK_2') return [{ t0: 0.8, t1: 1.1 }];
    if (state === 'ATTACK_3') return [{ t0: 0.65, t1: 0.95 }, { t0: 1.25, t1: 1.55 }];
    return [];
  }

  public override update(dt: number): void {
    super.update(dt);
    this.poseAxe();
  }

  private poseAxe(): void {
    const state = this.stateMachine.currentState, t = this.stateMachine.stateTime;
    const socket = this.rig?.root.getObjectByName('Socket_Hand_R');
    if (socket) {
      this.group.updateWorldMatrix(true, true);
      socket.getWorldPosition(this.hand); this.group.worldToLocal(this.hand);
    }
    this.axe.position.copy(this.hand); this.axe.rotation.set(0, 0, -0.3);
    if (state === 'ATTACK_1') {
      const k = THREE.MathUtils.clamp((t - 0.45) / 0.75, 0, 1), angle = -1.25 + k * 2.5;
      const reach = 1 + 4 * Math.sin(k * Math.PI);
      this.axe.position.set(Math.sin(angle) * reach, 1.15, Math.cos(angle) * reach);
      this.axe.rotation.z = -Math.PI / 2;
    } else if (state === 'ATTACK_2') {
      const k = THREE.MathUtils.clamp((t - 0.5) / 0.7, 0, 1);
      this.axe.position.set(0, 3.8 - 3.5 * k, 1.8 + 2.2 * Math.sin(k * Math.PI));
      this.axe.rotation.x = -Math.PI / 2 * k;
    } else if (state === 'ATTACK_3') {
      const out = THREE.MathUtils.clamp((t - 0.45) / 0.5, 0, 1), back = THREE.MathUtils.clamp((t - 1.15) / 0.5, 0, 1);
      this.axe.position.set(0, 1.2, 0.8 + 5 * (out - back));
      this.axe.rotation.z = t * 9;
    }
    this.axe.visible = this.tether.visible = state !== 'DEAD';
    this.axe.updateMatrixWorld(true);
    this.tether.count = Math.max(1, Math.min(128, Math.ceil(this.hand.distanceTo(this.axe.position) / 0.055)));
    for (let i = 0; i < this.tether.count; i++) {
      const k = (i + 0.5) / this.tether.count;
      this.linkPose.position.lerpVectors(this.hand, this.axe.position, k);
      this.linkPose.position.y -= 0.25 * Math.sin(k * Math.PI);
      this.linkDirection.subVectors(this.axe.position, this.hand);
      this.linkDirection.y -= 0.25 * Math.PI * Math.cos(k * Math.PI);
      if (this.linkDirection.lengthSq() < 1e-6) this.linkDirection.set(0, 1, 0);
      this.linkPose.quaternion.setFromUnitVectors(CHAIN_UP, this.linkDirection.normalize());
      this.linkPose.rotateY(i % 2 ? Math.PI / 2 : 0);
      this.linkPose.updateMatrix(); this.tether.setMatrixAt(i, this.linkPose.matrix);
    }
    this.tether.instanceMatrix.needsUpdate = true;
  }

  public override getWeaponPoints() {
    this.group.updateWorldMatrix(true, true);
    return { tip: this.axe.localToWorld(this.bladeTip.set(0, 1.05, 0)).clone(), hilt: this.axe.localToWorld(this.bladeHilt.set(0, 0.2, 0)).clone() };
  }

  public override weaponSegmentInto(tip: THREE.Vector3, hilt: THREE.Vector3): void {
    this.group.updateWorldMatrix(true, true);
    this.axe.localToWorld(tip.set(0, 1.05, 0)); this.axe.localToWorld(hilt.set(0, 0.2, 0));
  }
}

import * as THREE from 'three';
import { Boss } from './Boss';

/**
 * Chapter I boss, the Baoli Guardian: a 3.2 m horned demon with a talwar (see characters/BaoliGuardian.ts). A slow walker who
 * swings from far off and leaps at anyone who keeps their distance.
 */
export class BossBaoli extends Boss {
  constructor(id = 'baoli_guardian') {
    super(id, 0x2a3342, {
      attackInterval: 1.6,
      strikeRange: 3.8, // 2.9 m tall with a 1.7 m blade
      tooClose: 1.8,
      leapRange: 6.5,
      leapMax: 11,
      roarRange: 16,
    });
    this.displayName = 'Baoli Guardian';
    this.epithet = 'Asura of the stepwell';
    this.maxHealth = 450;
    this.currentHealth = 450;
    this.maxMarma = 140;
    this.moveSpeed = 3.8;
    this.marmaDecayRate = 9;
    this.lungeSpec = { a: 0.1, b: 0.6, maxDist: 1.6, stopDist: 2.2 };
    this.torsoMesh.scale.setScalar(1.2);
    this.equipGreyboxGada();
  }

  protected override onRoar(): void {
    this.soundFX.playRoar(0.8);
    this.particleFX.spawnDustPuff(this.getPosition(), 24);
  }

  /** The stand-in weapon until his rig and talwar load (or if they fail to). */
  private equipGreyboxGada(): void {
    const socket = this.getSocket('mixamorigRightHand');
    const gada = new THREE.Group();
    const bronze = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, metalness: 0.6, roughness: 0.5 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.25 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 1.4, 12), bronze);
    shaft.position.y = 0.6;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), gold);
    head.position.y = 1.35;
    head.scale.set(1.1, 1.3, 1.1);
    gada.add(shaft, head);
    gada.traverse((o) => { o.castShadow = true; });
    gada.position.set(0, -0.3, 0.2);
    gada.rotation.set(-Math.PI * 0.38, 0, 0);
    socket?.remove(this.swordMesh);
    this.swordMesh = gada;
    socket?.add(gada);
  }
}

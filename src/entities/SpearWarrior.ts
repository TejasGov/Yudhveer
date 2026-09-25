import * as THREE from 'three';
import { Enemy } from './Enemy';
import { SoundFX } from '../combat/SoundFX';

export class SpearWarrior extends Enemy {
  public spearMesh: THREE.Group;
  private soundFXInstance: SoundFX;

  constructor(id: string) {
    super(id);
    this.maxHealth = 95;
    this.currentHealth = 95;
    this.maxMarma = 110;
    this.moveSpeed = 4.2;
    this.soundFXInstance = SoundFX.getInstance();

    // Remove sword from right hand socket and attach Spear
    const rSocket = this.getSocket('mixamorigRightHand');
    if (rSocket) {
      rSocket.remove(this.swordMesh);
      this.spearMesh = this.createSpearMesh();
      rSocket.add(this.spearMesh);
    } else {
      this.spearMesh = this.createSpearMesh();
    }

    this.stateMachine.onStateChanged = (newState) => {
      if (newState === 'ATTACK_1') {
        this.soundFXInstance.playSpearThrust();
      }
    };
  }

  private createSpearMesh(): THREE.Group {
    const spearGroup = new THREE.Group();

    // Long Ash wood shaft
    const shaftGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8);
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e18,
      roughness: 0.8
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 0.8;
    shaft.castShadow = true;
    spearGroup.add(shaft);

    // Vedic Spearhead Blade
    const headGeo = new THREE.ConeGeometry(0.09, 0.45, 4);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xddddf0,
      metalness: 0.95,
      roughness: 0.2
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.95;
    head.castShadow = true;
    spearGroup.add(head);

    // Brass collar
    const collarGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9 });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.y = 1.7;
    spearGroup.add(collar);

    return spearGroup;
  }
}

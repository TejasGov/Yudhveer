import * as THREE from 'three';
import { Enemy } from './Enemy';
import type { CharacterState } from './CharacterStateMachine';

/** A spearman with long reach (greybox; not placed in any chapter yet). */
export class SpearWarrior extends Enemy {
  public spearMesh: THREE.Group;

  constructor(id: string) {
    super(id);
    this.displayName = 'Spear warrior';
    this.maxHealth = 95;
    this.currentHealth = 95;
    this.maxMarma = 110;
    this.moveSpeed = 4.2;
    this.engageRange = 3.2;

    const socket = this.getSocket('mixamorigRightHand');
    socket?.remove(this.swordMesh);
    this.spearMesh = createSpearMesh();
    this.swordMesh = this.spearMesh;
    socket?.add(this.spearMesh);
  }

  protected override onStateChange(state: CharacterState): void {
    if (state.startsWith('ATTACK')) this.soundFX.playSpearThrust();
  }
}

function createSpearMesh(): THREE.Group {
  const spear = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.8 }));
  shaft.position.y = 0.8;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 4), new THREE.MeshStandardMaterial({ color: 0xddddf0, metalness: 0.95, roughness: 0.2 }));
  head.position.y = 1.95;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9 }));
  collar.position.y = 1.7;
  spear.add(shaft, head, collar);
  spear.traverse((o) => { o.castShadow = true; });
  return spear;
}

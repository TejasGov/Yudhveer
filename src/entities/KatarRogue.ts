import * as THREE from 'three';
import { Enemy } from './Enemy';
import { SoundFX } from '../combat/SoundFX';

export class KatarRogue extends Enemy {
  private soundFXInstance: SoundFX;

  constructor(id: string) {
    super(id);
    this.maxHealth = 85;
    this.currentHealth = 85;
    this.maxMarma = 75;
    this.moveSpeed = 6.2;
    this.soundFXInstance = SoundFX.getInstance();

    // Replace sword and shield with Dual Katars (Push-daggers)
    const rSocket = this.getSocket('mixamorigRightHand');
    if (rSocket) {
      rSocket.remove(this.swordMesh);
      rSocket.add(this.createKatarMesh());
    }

    const lSocket = this.getSocket('mixamorigLeftHand');
    if (lSocket) {
      lSocket.remove(this.shieldMesh);
      lSocket.add(this.createKatarMesh());
    }

    this.stateMachine.onStateChanged = (newState) => {
      if (newState === 'ATTACK_1') {
        this.soundFXInstance.playKatarSlash();
      }
    };
  }

  private createKatarMesh(): THREE.Group {
    const katar = new THREE.Group();

    // H-shaped side bars and grip
    const barGeo = new THREE.BoxGeometry(0.02, 0.2, 0.02);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8 });
    
    const bar1 = new THREE.Mesh(barGeo, goldMat);
    bar1.position.set(0.06, -0.05, 0);
    katar.add(bar1);

    const bar2 = new THREE.Mesh(barGeo, goldMat);
    bar2.position.set(-0.06, -0.05, 0);
    katar.add(bar2);

    // Triangular dagger blade
    const bladeGeo = new THREE.ConeGeometry(0.08, 0.45, 3);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeff,
      metalness: 0.95,
      roughness: 0.15
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.25;
    blade.castShadow = true;
    katar.add(blade);

    return katar;
  }
}

import * as THREE from 'three';
import { Enemy } from './Enemy';

/**
 * Chapter IV minions, the rakshasas: they run in from the outlying islands across the bridges, then hack with the
 * cleaver grown into their hand. Little health: they come in numbers.
 */
export class Rakshasa extends Enemy {
  constructor(id: string) {
    super(id, 0x55534f);
    this.displayName = 'Rakshasa';
    this.maxHealth = 45;
    this.currentHealth = 45;
    this.maxMarma = 40;
    this.moveSpeed = 4.2;
    this.attackCooldown = 2.2;
    this.telegraphDuration = 0.5;
    this.engageRange = 2.4;
    this.turnRate = 6;
    this.attackStates = ['ATTACK_1', 'ATTACK_2'];
    // The cleaver is part of the model: the strike segment hangs off the hand, nothing drawn.
    const socket = this.getSocket('mixamorigRightHand');
    socket?.remove(this.swordMesh);
    this.swordMesh = new THREE.Group();
    socket?.add(this.swordMesh);
    this.shieldMesh.visible = false;
  }
}

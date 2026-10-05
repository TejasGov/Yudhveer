import * as THREE from 'three';
import { Enemy } from './Enemy';

/**
 * The prologue's raiders, Andhaka's men come for the guru: brutes with a cleaver grown into the hand (the rakshasa
 * model, recoloured; a PLACEHOLDER until the village goons are made). They come in numbers through the gate, and the
 * boy with the lathi is not meant to beat them all (the chapter's fight is a scripted loss).
 */
export class Raider extends Enemy {
  constructor(id: string) {
    super(id, 0x6a5040);
    this.displayName = 'Raider';
    this.maxHealth = 40;
    this.currentHealth = 40;
    this.maxMarma = 40;
    this.moveSpeed = 4;
    this.attackCooldown = 2.4;
    this.telegraphDuration = 0.55;
    this.engageRange = 2.4;
    this.turnRate = 6;
    this.damageScale = 0.85;
    this.attackStates = ['ATTACK_1', 'ATTACK_2'];
    // The cleaver is part of the model: the strike segment hangs off the hand, nothing drawn.
    const socket = this.getSocket('mixamorigRightHand');
    socket?.remove(this.swordMesh);
    this.swordMesh = new THREE.Group();
    socket?.add(this.swordMesh);
    this.shieldMesh.visible = false;
  }
}

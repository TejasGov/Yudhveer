import * as THREE from 'three';
import { Enemy } from './Enemy';

export class MercenaryGrunt extends Enemy {
  constructor(id: string, color = 0x6e3b2e) {
    super(id);
    this.maxHealth = 80;
    this.currentHealth = 80;
    this.maxMarma = 80;
    this.moveSpeed = 4.8;
  }
}

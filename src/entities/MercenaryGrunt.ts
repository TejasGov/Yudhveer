import { Enemy } from './Enemy';

/** A basic sword-and-shield grunt (greybox; not placed in any chapter yet). */
export class MercenaryGrunt extends Enemy {
  constructor(id: string, color = 0x6e3b2e) {
    super(id, color);
    this.displayName = 'Mercenary';
    this.maxHealth = 80;
    this.currentHealth = 80;
    this.maxMarma = 80;
    this.moveSpeed = 4.8;
  }
}

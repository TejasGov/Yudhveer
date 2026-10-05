import { Enemy } from './Enemy';

/**
 * The old vanara mentor as a sparring partner (Chapter II's training, `game/stories/Akhada.ts`): he comes at the boy
 * with slow, plainly telegraphed blows, one at a time, so the dhal can be learned on them. A master is not hurt by a
 * student: blows land on him for nothing, and only a heavy one rocks him. His own blows sting rather than wound. Once
 * the lesson is over the story stands him aside (the cast takes his place) and he leaves the fight.
 */
export class VanaraMentor extends Enemy {
  constructor(id: string) {
    super(id, 0x8a7a68);
    this.displayName = 'Old Vanara';
    this.epithet = 'Teacher of the Hanuman akhada';
    this.maxHealth = 100;
    this.currentHealth = 100;
    // Parries rock him back (DEFLECTED) but never break him: the lesson is the parry, not the opening after it.
    this.maxMarma = 100000;
    this.heavyPoise = true;
    this.damageScale = 0.3;
    this.attackCooldown = 2.1;
    this.telegraphDuration = 0.8;
    this.turnRate = 5;
    this.engageRange = 2.2;
    this.crowdRange = 1.2;
    this.attackStates = ['ATTACK_1', 'ATTACK_2'];
    this.lungeSpec = { a: 0, b: 0.35, maxDist: 1.0, stopDist: 1.2 };
    this.shieldMesh.visible = false;
  }

  /** The student's blows do him no harm. */
  public override takeDamage(_amount: number): void {}
}

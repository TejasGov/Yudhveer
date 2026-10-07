import type { HitWindow } from './Character';
import type { CharacterState } from './CharacterStateMachine';
import { Enemy } from './Enemy';

/**
 * The old vanara mentor as a sparring partner (Chapter II's training, `game/stories/Akhada.ts`): he comes at the boy
 * with slow, plainly telegraphed blows of his staff, one at a time, so the dhal can be learned on them. A master is not
 * hurt by a student: blows land on him for nothing, and only a heavy one rocks him. His own blows sting rather than
 * wound. Once the lesson is over the story stands him aside (the cast takes his place) and he leaves the fight.
 */
export class VanaraMentor extends Enemy {
  constructor(id: string) {
    super(id, 0x8a7a68);
    this.displayName = 'Old Vanara';
    this.blood = 'none'; // sparring with the teacher draws no blood
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
    // A teacher's blows are the lesson: he reads nothing of the boy (pro mode changes nothing here).
    this.cunning = false;
    // A staff, not a blade: the whoosh and knock of wood.
    this.swingSound = 'lathi';
    this.impactSound = 'wood';
  }

  /**
   * One blow per attack, to be met once: the main stroke of each staff swing. (Measured from the clips, the wind-up
   * turn and the follow-through swing the staff fast enough to count as strikes of their own.)
   */
  public override hitWindows(state: CharacterState = this.stateMachine.currentState): HitWindow[] {
    const windows = super.hitWindows(state);
    if (windows.length < 2) return windows;
    return [windows.reduce((best, w) => (w.t1 - w.t0 > best.t1 - best.t0 ? w : best))];
  }

  /** The student's blows do him no harm. */
  public override takeDamage(_amount: number): void {}
}

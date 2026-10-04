import { Enemy } from './Enemy';
import type { CharacterState } from './CharacterStateMachine';

/** Chapter II, the Vetala: a fast twin-blade fighter who chains his cuts; fragile in posture. */
export class Vetala extends Enemy {
  constructor(id: string) {
    super(id, 0x2a2430);
    this.displayName = 'Vetala';
    this.epithet = 'Fast, and strikes in strings';
    this.maxHealth = 160;
    this.currentHealth = 160;
    this.maxMarma = 110;
    this.moveSpeed = 6.2;
    this.attackCooldown = 1.8;
    this.telegraphDuration = 0.45;
    this.turnRate = 9;
    this.engageRange = 2.4;
    this.attackStates = ['ATTACK_1', 'ATTACK_2', 'ATTACK_1', 'ATTACK_3'];
    this.comboChance = 0.45;
    this.lungeSpec = { a: 0, b: 0.25, maxDist: 1.4, stopDist: 1.1 };
    // The greybox carries a second sword until his model (and his own two swords) load.
    this.shieldMesh.visible = false;
  }

  protected override onStateChange(state: CharacterState): void {
    if (state.startsWith('ATTACK')) this.soundFX.playKatarSlash();
  }
}

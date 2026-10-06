import { Enemy } from './Enemy';
import { Guard } from '../combat/Guard';
import type { CharacterState } from './CharacterStateMachine';
import type { CharacterDefinition, CharacterRig } from './animation/CharacterRig';

/**
 * The model's own spare pair of notched swords, crossed on his lower back (a skinned part of `vetala.glb`). He fights
 * with the two he holds, so the spare pair is hidden: four identical blades read as a mistake, not a fighter.
 */
const SPARE_SWORDS = 'Swords_Sheathed';

/** Chapter II, the Vetala: a fast twin-blade fighter who chains his cuts; fragile in posture. */
export class Vetala extends Enemy {
  constructor(id: string) {
    super(id, 0x2a2430);
    this.displayName = 'Vetala';
    this.blood = 'ash'; // a ghost in a corpse: no blood, a puff of grave-ash
    this.epithet = 'Fast, and strikes in strings';
    // Milestone 12: health 160 -> 200, blows at 92 %.
    this.maxHealth = 200;
    this.currentHealth = 200;
    this.damageScale = 0.92;
    this.maxMarma = 110;
    // Two blades crossed before him: quick to raise, quick to drop, and his answer is his quick cut or a kick.
    this.guard = new Guard(this, {
      base: 0.12, perBlow: 0.2, max: 0.65, hold: 0.7, extend: 0.6, longest: 1.2, cooldown: 1.4, recovery: 0.6, react: 0.09, reach: 3.4,
      answerAfter: [2, 3], shove: 0.3, shoveRange: 2.4, ring: 'steel',
    });
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

  public override async attachRig(definition: CharacterDefinition): Promise<CharacterRig> {
    const rig = await super.attachRig(definition);
    const spare = rig.root.getObjectByName(SPARE_SWORDS);
    if (spare) spare.visible = false;
    return rig;
  }

  protected override onStateChange(state: CharacterState): void {
    if (state.startsWith('ATTACK')) this.soundFX.playKatarSlash();
  }
}

import { Boss } from './Boss';

/**
 * Chapter III boss, Shalva, the raider who brought war to Dwarka (characters/Shalva.ts): a spiked gada, an overhead
 * smash, a spinning double blow and a three-blow string, and a leap at anyone who keeps their distance. When he
 * falls, Takshaka comes for the city (the chapter's finale).
 */
export class BossShalva extends Boss {
  constructor(id = 'shalva') {
    super(id, 0x4a3530, {
      attackInterval: 1.35,
      strikeRange: 3.1, // 2.6 m tall with a 1.5 m gada
      tooClose: 1.6,
      leapRange: 6,
      leapMax: 12,
      roarRange: 18,
    });
    this.displayName = 'Shalva';
    this.epithet = 'Raider of Dwarka';
    this.maxHealth = 380;
    this.currentHealth = 380;
    this.maxMarma = 150;
    this.moveSpeed = 4;
    this.marmaDecayRate = 9;
    this.turnRate = 4;
    this.lungeSpec = { a: 0.1, b: 0.55, maxDist: 1.5, stopDist: 2 };
    this.torsoMesh.scale.setScalar(1.15);
    // The spiked gada.
    this.swingSound = 'heavy';
    this.impactSound = 'crush';
  }

  protected override onRoar(): void {
    this.soundFX.playRoar(0.9);
    this.particleFX.spawnDustPuff(this.getPosition(), 20);
  }
}

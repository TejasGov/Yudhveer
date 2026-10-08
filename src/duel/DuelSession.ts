import type { Engine } from '../core/Engine';
import { InputManager } from '../core/InputManager';
import { Player } from '../entities/Player';
import { HeroBot, SKILLS } from '../debug/HeroBot';
import { DUEL_LOADOUT, DUEL_SPAWNS, DUEL_STARTING_HEALTH } from './Rules';

/**
 * The first duel spike: a second real hero driven through HeroBot's buffered controls, on the existing Akhada.
 * Its input and camera bearing belong to it alone. Neither the campaign's crowd AI nor its scenes, waves, saves
 * and lessons take part. Network sessions later replace this local opponent with a RemoteHero; both paths call
 * the third combat case, whose defender uses the campaign's existing defence functions.
 */
export class DuelSession {
  public readonly opponent: Player;
  public readonly loadout = DUEL_LOADOUT;
  public finished = false;
  private readonly input = InputManager.isolated();
  private readonly camera = { viewYaw: 0, cameraYaw: 0 };
  private readonly bot: HeroBot;

  constructor(private readonly engine: Engine) {
    this.opponent = new Player('duel_opponent', this.input);
    this.bot = new HeroBot(engine, SKILLS.steady, Math.random, {
      hero: this.opponent, foe: engine.player!, input: this.input, camera: this.camera,
    });
  }

  public async prepare(): Promise<void> {
    await Promise.all([this.engine.player!.equip(this.loadout), this.opponent.equip(this.loadout)]);
  }

  public reset(): void {
    const heroes = [this.engine.player!, this.opponent];
    heroes.forEach((hero, i) => {
      hero.maxHealth = DUEL_STARTING_HEALTH;
      hero.mortal = true;
      hero.renewsPosture = true;
      hero.revive();
      const [x, y, z] = DUEL_SPAWNS[i];
      hero.setPosition(x, y, z);
      hero.faceYaw(i === 0 ? Math.PI : 0);
      hero.group.visible = true;
      hero.atEase = false;
      hero.onGuard = false;
    });
    this.camera.cameraYaw = this.camera.viewYaw = Math.PI;
    this.engine.sceneManager.resetFollowCamera(heroes[0].getPosition(), heroes[0].group.rotation.y);
    this.engine.combatSystem.resetStats();
    this.finished = false;
  }

  public step(dt: number): void {
    if (this.finished) return;
    const hero = this.engine.player!;
    this.input.advance(dt);
    this.bot.step(dt);
    this.camera.cameraYaw -= this.input.consumeLook(dt).yaw;
    this.camera.viewYaw = this.camera.cameraYaw;
    hero.handleInput(dt, this.engine.sceneManager.viewYaw, [this.opponent]);
    this.opponent.handleInput(dt, this.camera.viewYaw, [hero]);
    hero.update(dt);
    this.opponent.update(dt);
    this.engine.combatSystem.updateDuel(hero, this.opponent, dt);
  }

  public dispose(): void {
    this.bot.release();
    this.opponent.retire();
  }
}

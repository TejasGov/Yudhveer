import * as THREE from 'three';
import type { Engine } from '../core/Engine';
import { InputManager } from '../core/InputManager';
import { Player } from '../entities/Player';
import { RemoteHero } from '../entities/RemoteHero';
import { DuelTransport, type DuelMessage } from './Transport';
import { separateFighters } from '../physics/CharacterMotor';
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
  private readonly bot: HeroBot | null;
  public active = true;
  public suspended = false;
  public onStart: (() => void) | null = null;
  public onFinish: ((won: boolean) => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  private seq = 0;
  private sendClock = 0;
  private probeClock = 0;
  private readonly previous = new THREE.Vector3();
  private readonly verdicts = new Set<string>();

  constructor(private readonly engine: Engine, public readonly transport?: DuelTransport) {
    this.active = !transport;
    this.opponent = transport ? new RemoteHero() : new Player('duel_opponent', this.input);
    this.bot = transport ? null : new HeroBot(engine, SKILLS.steady, Math.random, {
      hero: this.opponent, foe: engine.player!, input: this.input, camera: this.camera,
    });
    if (transport) {
      transport.onMessage = (m) => this.receive(m);
      transport.onDisconnect = () => { this.active = false; this.finished = true; this.onDisconnect?.(); };
    }
  }

  private receive(m: DuelMessage): void {
    const hero = this.engine.player!;
    if (m.type === 'disconnected') { this.active = false; this.finished = true; this.onDisconnect?.(); return; }
    if (m.type === 'start') { this.reset(); this.active = true; this.onStart?.(); return; }
    if (!('round' in m) || m.round !== this.transport?.round) return;
    if (m.type === 'state') (this.opponent as RemoteHero).receive(m.state);
    if (m.type === 'hit') {
      const key = m.swing + ':' + m.window;
      if (this.verdicts.has(key)) return;
      this.verdicts.add(key);
      this.opponent.currentHealth = m.health;
      this.opponent.currentMarma = m.posture;
      if (m.charged) hero.chargedHits = Math.max(0, hero.chargedHits - 1);
      if (m.result === 'deflected') this.engine.combatSystem.applyHeroDeflection(hero);
      else if (m.result !== 'evaded') this.engine.combatSystem.impact(m.result === 'blocked' ? 'block' : 'hitLight');
    }
    if (m.type === 'finish') { this.finished = true; this.active = false; this.onFinish?.(m.winner === this.transport!.seat); }
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
      const seat = this.transport ? (i === 0 ? this.transport.seat : 1 - this.transport.seat) : i;
      const spawn = DUEL_SPAWNS[seat];
      hero.setPosition(spawn[0], spawn[1], spawn[2]);
      hero.faceYaw(seat === 0 ? Math.PI : 0);
      hero.group.visible = true;
      hero.atEase = false;
      hero.onGuard = false;
    });
    this.camera.cameraYaw = this.camera.viewYaw = Math.PI;
    this.engine.sceneManager.resetFollowCamera(heroes[0].getPosition(), heroes[0].group.rotation.y);
    this.engine.combatSystem.resetStats();
    this.finished = false;
    this.seq = 0; this.sendClock = 0; this.probeClock = 0;
    this.verdicts.clear();
    this.previous.copy(heroes[0].getPosition());
    if (this.opponent instanceof RemoteHero) this.opponent.clearSnapshots();
  }

  public step(dt: number): void {
    if (this.finished || !this.active) return;
    const hero = this.engine.player!;
    this.input.advance(dt);
    this.bot?.step(dt);
    this.camera.cameraYaw -= this.input.consumeLook(dt).yaw;
    this.camera.viewYaw = this.camera.cameraYaw;
    if (!this.suspended) hero.handleInput(dt, this.engine.sceneManager.viewYaw, [this.opponent]);
    if (!this.transport) this.opponent.handleInput(dt, this.camera.viewYaw, [hero]);
    // Only locally simulated bodies separate. A received hero must never push the authoritative local player.
    if (!this.transport) separateFighters([hero, this.opponent].filter(f => f.motor).map(f => ({
      position: f.group.position, radius: f.motor!.radius, mass: f.mass, push: f.sepPush,
      solid: !f.isDown() && !f.isEvading(),
    })));
    hero.update(dt);
    this.opponent.update(dt);
    this.engine.combatSystem.updateDuel(hero, this.opponent, dt, !!this.transport, (event, window, charged) => {
      if (!this.transport) return;
      this.transport.send({ type: 'hit', round: this.transport.round,
        swing: (this.opponent as RemoteHero).snapshot?.swing ?? 0, window, result: event.result,
        health: hero.currentHealth, posture: hero.currentMarma, charged,
      });
    });
    if (this.transport) {
      this.sendClock += dt; this.probeClock += dt;
      const p = hero.getPosition();
      if (this.sendClock >= 1 / 30) {
        this.sendClock %= 1 / 30;
        this.transport.send({ type: 'state', round: this.transport.round, state: {
          seq: this.seq++, position: p.toArray(), yaw: hero.group.rotation.y,
          velocity: p.clone().sub(this.previous).divideScalar(dt).toArray(),
          state: hero.stateMachine.currentState, time: hero.stateMachine.stateTime, swing: hero.attackId,
          health: hero.currentHealth, posture: hero.currentMarma, charged: hero.chargedHits,
        } });
      }
      this.previous.copy(p);
      if (this.probeClock >= 1) { this.probeClock = 0; this.transport.probe(); }
    }
  }

  public dispose(): void {
    this.bot?.release();
    this.transport?.close();
    this.opponent.retire();
  }
}

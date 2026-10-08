import * as THREE from 'three';
import type { Engine } from '../core/Engine';
import { InputManager } from '../core/InputManager';
import { Player } from '../entities/Player';
import { RemoteHero } from '../entities/RemoteHero';
import { DuelTransport, type DuelMessage } from './Transport';
import { separateFighters } from '../physics/CharacterMotor';
import { HeroBot, SKILLS } from '../debug/HeroBot';
import { DUEL_LOADOUT, DUEL_ROUND_KITS, DUEL_ROUNDS_TO_WIN, DUEL_SPAWNS, DUEL_STARTING_HEALTH } from './Rules';

/**
 * The first duel spike: a second real hero driven through HeroBot's buffered controls, on the existing Akhada.
 * Its input and camera bearing belong to it alone. Neither the campaign's crowd AI nor its scenes, waves, saves
 * and lessons take part. Network sessions replace this local opponent with a RemoteHero; both paths call
 * the third combat case, whose defender uses the campaign's existing defence functions.
 */
export class DuelSession {
  public readonly opponent: Player;
  public readonly loadout = DUEL_LOADOUT;
  public readonly rules = { roundsToWin: DUEL_ROUNDS_TO_WIN, startingHealth: DUEL_STARTING_HEALTH };
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
  private readonly velocity = new THREE.Vector3();
  private readonly sentAt = new Map<number, number>();
  private readonly sendTimer: ReturnType<typeof setInterval> | null;
  private readonly probeTimer: ReturnType<typeof setInterval> | null;
  private lastReceived = performance.now();
  private readonly previous = new THREE.Vector3();
  private readonly verdicts = new Set<string>();

  constructor(private readonly engine: Engine, public readonly transport?: DuelTransport) {
    this.active = !transport;
    this.opponent = transport ? new RemoteHero() : new Player('duel_opponent', this.input);
    this.bot = transport ? null : new HeroBot(engine, SKILLS.steady, Math.random, {
      hero: this.opponent, foe: engine.player!, input: this.input, camera: this.camera,
    });
    this.sendTimer = transport ? setInterval(() => this.sendState(), 1000 / 30) : null;
    this.probeTimer = transport ? setInterval(() => {
      if (!this.active || this.finished) return;
      if (performance.now() - this.lastReceived > 5000) {
        transport.close(); this.active = false; this.finished = true; this.onDisconnect?.();
      } else transport.probe();
    }, 1000) : null;
    if (transport) {
      transport.onMessage = (m) => this.receive(m);
      transport.onDisconnect = () => { this.active = false; this.finished = true; this.onDisconnect?.(); };
    }
  }

  private receive(m: DuelMessage): void {
    const hero = this.engine.player!;
    if (m.type === 'disconnected') { this.active = false; this.finished = true; this.onDisconnect?.(); return; }
    if (m.type === 'start') { this.reset(); this.active = true; this.lastReceived = performance.now(); this.onStart?.(); return; }
    if (!('round' in m) || m.round !== this.transport?.round) return;
    if (m.type === 'state') { this.lastReceived = performance.now(); (this.opponent as RemoteHero).receive(m.state); }
    if (m.type === 'hit') {
      const key = m.swing + ':' + m.window;
      if (this.verdicts.has(key)) return;
      this.verdicts.add(key);
      const at = this.sentAt.get(m.seenSeq);
      if (at !== undefined) this.transport!.metrics.verdictAgeMs = performance.now() - at;
      this.engine.combatSystem.stats.damageDealt += Math.max(0, this.opponent.currentHealth - m.health);
      this.opponent.currentHealth = Math.min(this.opponent.currentHealth, m.health);
      this.opponent.currentMarma = m.posture;
      if (m.charged) hero.chargedHits = Math.max(0, hero.chargedHits - 1);
      if (m.result === 'deflected') this.engine.combatSystem.applyHeroDeflection(hero);
      else if (m.result !== 'evaded') this.engine.combatSystem.impact(m.result === 'blocked' ? 'block' : 'hitLight');
    }
    if (m.type === 'finish') { this.finished = true; this.active = false; this.onFinish?.(m.winner === this.transport!.seat); }
  }

  public async prepare(): Promise<void> {
    await Promise.all([this.engine.player!.prepareDuelKits(DUEL_ROUND_KITS.map(r => r.loadout)),
      this.opponent.prepareDuelKits(DUEL_ROUND_KITS.map(r => r.loadout))]);
    this.engine.player!.equipDuelKit(this.loadout); this.opponent.equipDuelKit(this.loadout);
  }

  public reset(): void {
    const heroes = [this.engine.player!, this.opponent];
    heroes.forEach((hero, i) => {
      hero.maxHealth = this.rules.startingHealth;
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
    this.seq = 0; this.velocity.set(0, 0, 0); this.sentAt.clear();
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
      if (event.result === 'deflected') this.transport.metrics.parryAgeMs = hero.stateMachine.stateTime * 1000;
      this.transport.send({ type: 'hit', round: this.transport.round,
        swing: (this.opponent as RemoteHero).snapshot?.swing ?? 0, window, result: event.result,
        health: hero.currentHealth, posture: hero.currentMarma, charged, seenSeq: (this.opponent as RemoteHero).snapshot?.seq ?? 0,
      });
    });
    const p = hero.getPosition();
    this.velocity.copy(p).sub(this.previous).divideScalar(Math.max(dt, 1e-4));
    this.previous.copy(p);
  }

  /** Wall-clock cadence: hit-stop must not stop the network stream. */
  private sendState(): void {
    if (!this.transport || !this.active || this.finished) return;
    const hero = this.engine.player!;
    const seq = this.seq++;
    this.sentAt.set(seq, performance.now());
    if (this.sentAt.size > 256) this.sentAt.delete(this.sentAt.keys().next().value!);
    this.transport.send({ type: 'state', round: this.transport.round, state: {
      seq, position: hero.getPosition().toArray(), yaw: hero.group.rotation.y,
      velocity: this.velocity.toArray(), state: hero.stateMachine.currentState,
      time: hero.stateMachine.stateTime, swing: hero.attackId, health: hero.currentHealth,
      posture: hero.currentMarma, charged: hero.chargedHits,
    } });
    const status = document.getElementById('duel-network');
    const text = 'Room ' + this.transport.room + ' · ' + Math.round(this.transport.metrics.peerRtt) + ' ms ping';
    if (status && status.textContent !== text) status.textContent = text;
  }

  public dispose(): void {
    if (this.sendTimer) clearInterval(this.sendTimer);
    if (this.probeTimer) clearInterval(this.probeTimer);
    this.bot?.release();
    this.transport?.close();
    this.engine.player!.clearDuelKits(); this.opponent.clearDuelKits();
    this.opponent.retire();
  }
}

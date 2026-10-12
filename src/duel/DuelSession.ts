import * as THREE from 'three';
import type { Engine } from '../core/Engine';
import { InputManager } from '../core/InputManager';
import { Player } from '../entities/Player';
import { RemoteHero, type HeroSnapshot } from '../entities/RemoteHero';
import { DuelTransport, type DuelMessage } from './Transport';
import { separateFighters } from '../physics/CharacterMotor';
import { HeroBot, SKILLS } from '../debug/HeroBot';
import { DuelNameTags, readDuelName } from './NameTags';
import { DUEL_ROUND_KITS, DUEL_ROUNDS_TO_WIN, DUEL_ROUND_SECONDS, DUEL_ROUND_CARD_SECONDS, DUEL_STALL_MS, DUEL_SPAWNS, duelLoadoutId } from './Rules';

/**
 * One best-of-three duel: practice simulates both heroes; an online session simulates only its owner, interpolates
 * the peer and reports incoming contacts. Every round kit is readied in the lobby, then switched synchronously.
 * The room alone awards online rounds and opens new epochs. Practice follows the same scoring and timer rule
 * on simulated seconds, so its pause really freezes. No campaign scene, lesson, save or enemy AI participates.
 */
export class DuelSession {
  public readonly opponent: Player;
  public readonly rules = { roundsToWin: DUEL_ROUNDS_TO_WIN, startingHealth: DUEL_ROUND_KITS[0].health };
  public finished = false;
  public active = false;
  public suspended = false;
  public roundNumber = 1;
  public epoch = 0;
  public score: [number, number] = [0, 0];
  public remaining = DUEL_ROUND_SECONDS;
  public localName = readDuelName();
  public opponentName = 'HeroBot';
  public readonly rounds: { number: number; epoch: number; seconds: number; winner: number | null; reason: string; health: number[] }[] = [];
  public onNames: (() => void) | null = null;
  public onStart: (() => void) | null = null;
  public onFinish: ((won: boolean) => void) | null = null;
  public onDisconnect: ((reason?: string) => void) | null = null;
  private readonly input = InputManager.isolated();
  private readonly camera = { viewYaw: 0, cameraYaw: 0 };
  private readonly bot: HeroBot | null;
  private readonly tags: DuelNameTags;
  private cardLeft = 0;
  private deadline = 0;
  private seq = 0;
  private tick = 0;
  private lastStep = performance.now();
  private publishedSwing = -1;
  private publishedAttack = false;
  private chargeId = 0;
  private chargeSpent = 0;
  private readonly restoreChargeHook: () => void;
  private readonly sentStates = new Map<number, HeroSnapshot>();
  private readonly velocity = new THREE.Vector3();
  private readonly sentAt = new Map<number, number>();
  private readonly contacts = new Map<string, number>();
  private readonly sendTimer: ReturnType<typeof setInterval> | null;
  private readonly probeTimer: ReturnType<typeof setInterval> | null;
  private lastReceived = performance.now();
  private readonly previous = new THREE.Vector3();
  private readonly verdicts = new Set<string>();

  public get loadout() { return DUEL_ROUND_KITS[this.roundNumber - 1].loadout; }
  public get scoreText(): string {
    const seat = this.transport?.seat ?? 0;
    return this.score[seat] + ' – ' + this.score[1 - seat];
  }

  constructor(private readonly engine: Engine, public readonly transport?: DuelTransport) {
    const hero = engine.player!, previousCharge = hero.onCharged;
    const onCharged = () => { this.chargeId++; this.chargeSpent = 0; previousCharge?.(); };
    hero.onCharged = onCharged;
    this.restoreChargeHook = () => { if (hero.onCharged === onCharged) hero.onCharged = previousCharge; };
    this.opponent = transport ? new RemoteHero() : new Player('duel_opponent', this.input);
    this.tags = new DuelNameTags([engine.player!, this.opponent]);
    if (transport) { this.localName = transport.name; this.opponentName = 'Yodha'; }
    this.setNames();
    this.bot = transport ? null : new HeroBot(engine, SKILLS.steady, Math.random, {
      hero: this.opponent, foe: engine.player!, input: this.input, camera: this.camera,
    });
    this.sendTimer = transport ? setInterval(() => this.sendState(), 1000 / 30) : null;
    this.probeTimer = transport ? setInterval(() => {
      if (!this.active || this.finished) return;
      if (performance.now() - this.lastReceived > 5000) this.disconnect();
      else transport.probe();
    }, 1000) : null;
    if (transport) {
      transport.onMessage = m => this.receive(m);
      transport.onDisconnect = reason => this.disconnect(reason);
    }
  }

  private disconnect(reason?: string): void {
    this.active = false; this.finished = true; this.transport?.close();
    document.getElementById('duel-card')!.hidden = true;
    this.onDisconnect?.(reason);
  }

  private setNames(names?: [string, string]): void {
    if (names && this.transport) {
      this.localName = names[this.transport.seat].slice(0, 16);
      this.opponentName = names[1 - this.transport.seat].slice(0, 16);
    }
    this.tags.names(this.localName, this.opponentName);
    this.onNames?.();
  }

  private card(text?: string): void {
    const element = document.getElementById('duel-card')!;
    element.textContent = text ?? 'Round ' + this.roundNumber + '\n' + (this.roundNumber === 1 ? 'Unarmed' : 'Khanda and dhal') + ' · ' + DUEL_ROUND_KITS[this.roundNumber - 1].health + ' health';
    element.hidden = false;
  }

  public ready(): void {
    this.transport?.send({ type: 'ready', round: this.transport.round, loadout: duelLoadoutId(this.roundNumber) });
  }

  private receive(m: DuelMessage): void {
    const hero = this.engine.player!;
    if (m.type === 'disconnected') { this.disconnect(); return; }
    if (m.type === 'error') {
      this.disconnect(m.message); return;
    }
    if (m.type === 'profiles') { this.setNames(m.names); return; }
    if (m.type === 'card') {
      if (!DUEL_ROUND_KITS[m.roundNumber - 1] || m.loadout !== duelLoadoutId(m.roundNumber) || m.health !== DUEL_ROUND_KITS[m.roundNumber - 1].health) {
        this.disconnect('Round loadout mismatch. Reload both clients.'); return;
      }
      this.epoch = m.round; this.score = m.score; this.reset(m.roundNumber); this.setNames(m.names);
      this.active = false; this.finished = false; this.card(); this.onStart?.(); return;
    }
    if (!('round' in m) || m.round !== this.transport?.round) return;
    if (m.type === 'prepare') {
      this.score = m.score; this.rounds.length = 0; this.finished = false;
      this.reset(m.roundNumber); this.ready(); return;
    }
    if (m.type === 'start') {
      if (m.round !== this.epoch || m.loadout !== duelLoadoutId(this.roundNumber)) return;
      this.active = true; this.lastStep = this.lastReceived = performance.now(); this.deadline = performance.now() + m.seconds * 1000;
      document.getElementById('duel-card')!.hidden = true; this.onStart?.(); return;
    }
    if (m.type === 'finish') {
      if (!this.active) return;
      this.score = m.score; this.recordRound(m.winner, m.reason); this.active = false;
      if (m.matchOver) { this.finished = true; this.onFinish?.(m.winner === this.transport!.seat); }
      else { this.reset(m.nextRound); this.card('Round ' + this.roundNumber + '\nWaiting for both heroes'); this.ready(); }
      return;
    }
    if (!this.active || this.finished) return;
    if (m.type === 'state' || m.type === 'attack' || m.type === 'motion') {
      if (m.state.loadout !== duelLoadoutId(this.roundNumber)) { this.disconnect('Round loadout mismatch. Reload both clients.'); return; }
      this.lastReceived = performance.now(); (this.opponent as RemoteHero).receive(m.state, performance.now(), m.type !== 'state');
    }
    if (m.type === 'hit') {
      const seen = this.sentStates.get(m.seenSeq);
      if (!seen || seen.swing !== m.swing || !seen.state.startsWith('ATTACK') || !hero.hitWindows(seen.state)[m.window]) return;
      const key = m.swing + ':' + m.window;
      if (this.verdicts.has(key)) return; this.verdicts.add(key);
      const at = this.sentAt.get(m.seenSeq), contact = this.contacts.get(key);
      if (at !== undefined) this.transport!.metrics.verdictAgeMs = performance.now() - at;
      if (contact !== undefined) {
        const metrics = this.transport!.metrics;
        metrics.verdictFeedbackMs = performance.now() - contact;
        metrics.feedbackMinMs = metrics.feedbacks ? Math.min(metrics.feedbackMinMs, metrics.verdictFeedbackMs) : metrics.verdictFeedbackMs;
        metrics.feedbackMaxMs = Math.max(metrics.feedbackMaxMs, metrics.verdictFeedbackMs);
        metrics.feedbackMeanMs += (metrics.verdictFeedbackMs - metrics.feedbackMeanMs) / ++metrics.feedbacks;
      }
      this.engine.combatSystem.stats.damageDealt += Math.max(0, this.opponent.currentHealth - m.health);
      this.opponent.currentHealth = Math.min(this.opponent.currentHealth, m.health); this.opponent.currentMarma = m.posture;
      if (m.charged && seen.chargeId === this.chargeId) {
        hero.spendCharge(); this.chargeSpent = Math.min(3, this.chargeSpent + 1);
      }
      if (m.result === 'deflected') this.engine.combatSystem.applyHeroDeflection(hero);
      this.engine.combatSystem.confirmHeroContact(hero, this.opponent, m.result, new THREE.Vector3(...m.point));
    }
  }

  public async prepare(): Promise<void> {
    const kits = DUEL_ROUND_KITS.map(r => r.loadout);
    await Promise.all([this.engine.player!.prepareDuelKits(kits), this.opponent.prepareDuelKits(kits)]);
  }

  public reset(number = this.roundNumber): void {
    this.roundNumber = number;
    const rule = DUEL_ROUND_KITS[number - 1];
    const heroes = [this.engine.player!, this.opponent];
    heroes.forEach((hero, i) => {
      hero.equipDuelKit(rule.loadout); hero.maxHealth = rule.health; hero.duelBlowScale = rule.damageScale; hero.mortal = true; hero.renewsPosture = true;
      hero.revive(); hero.speed = 0; hero.stateMachine.guardHeld = false;
      const seat = this.transport ? (i === 0 ? this.transport.seat : 1 - this.transport.seat) : i;
      const spawn = DUEL_SPAWNS[seat]; hero.setPosition(spawn[0], spawn[1], spawn[2]);
      hero.faceYaw(seat === 0 ? Math.PI : 0); hero.group.visible = true; hero.atEase = false; hero.onGuard = false;
    });
    this.input.releaseAll(); this.engine.inputManager.releaseAll();
    this.camera.cameraYaw = this.camera.viewYaw = Math.PI;
    this.engine.sceneManager.resetFollowCamera(heroes[0].getPosition(), heroes[0].group.rotation.y);
    this.engine.combatSystem.resetStats(); this.remaining = DUEL_ROUND_SECONDS;
    this.seq = 0; this.tick = 0; this.lastStep = performance.now(); this.velocity.set(0, 0, 0); this.sentAt.clear(); this.contacts.clear(); this.verdicts.clear();
    this.publishedSwing = -1; this.publishedAttack = false; this.sentStates.clear();
    this.chargeId = 0; this.chargeSpent = 0;
    this.previous.copy(heroes[0].getPosition());
    if (this.opponent instanceof RemoteHero) this.opponent.clearSnapshots();
    this.setNames();
  }

  /** Starts a practice round card after all kits and both motors are ready. */
  public beginPractice(): void {
    this.epoch++; this.active = false; this.cardLeft = DUEL_ROUND_CARD_SECONDS; this.card();
  }

  private recordRound(winner: number | null, reason: string): void {
    this.rounds.push({ number: this.roundNumber, epoch: this.epoch, seconds: +(DUEL_ROUND_SECONDS - this.remaining).toFixed(2),
      winner, reason, health: [this.engine.player!.currentHealth, this.opponent.currentHealth] });
  }

  private finishPractice(winner: 0 | 1 | null, reason: string): void {
    this.recordRound(winner, reason); this.active = false;
    if (winner !== null) this.score[winner]++;
    if (this.score.some(s => s >= DUEL_ROUNDS_TO_WIN)) { this.finished = true; this.onFinish?.(winner === 0); }
    else { this.reset(winner === null ? this.roundNumber : this.roundNumber + 1); this.beginPractice(); }
  }

  /** Online pause releases the guard and cancels controlled movement; attacks already committed may finish. */
  public suspend(): void {
    this.suspended = true;
    const hero = this.engine.player!;
    hero.speed = 0; hero.stateMachine.guardHeld = false;
    if (['BLOCK', 'PARRY', 'BLOCK_HIT', 'MOVE', 'SPRINT', 'WALK', 'CHARGE'].includes(hero.stateMachine.currentState)) hero.stateMachine.changeState('IDLE');
  }

  public step(dt: number): void {
    if (this.finished) return;
    if (!this.active) {
      if (!this.transport && this.cardLeft > 0) {
        this.cardLeft = Math.max(0, this.cardLeft - dt);
        if (this.cardLeft === 0) { this.active = true; document.getElementById('duel-card')!.hidden = true; this.onStart?.(); }
      }
      return;
    }
    const hero = this.engine.player!;
    this.remaining = this.transport ? Math.max(0, (this.deadline - performance.now()) / 1000) : Math.max(0, this.remaining - dt);
    this.lastStep = performance.now(); this.tick++;
    this.input.advance(dt); this.bot?.step(dt);
    this.camera.cameraYaw -= this.input.consumeLook(dt).yaw; this.camera.viewYaw = this.camera.cameraYaw;
    if (!this.suspended) hero.handleInput(dt, this.engine.sceneManager.viewYaw, [this.opponent]);
    if (!this.transport) this.opponent.handleInput(dt, this.camera.viewYaw, [hero]);
    // A received hero must never push the authoritative local body.
    if (!this.transport) separateFighters([hero, this.opponent].filter(f => f.motor).map(f => ({
      position: f.group.position, radius: f.motor!.radius, mass: f.mass, push: f.sepPush, solid: !f.isDown() && !f.isEvading(),
    })));
    hero.update(dt); this.opponent.update(dt);
    if (this.opponent instanceof RemoteHero && this.opponent.combatTimeline.overflowed) {
      this.disconnect('Duel stopped: combat updates fell too far behind.'); return;
    }
    if (this.transport && hero.attackId !== this.publishedSwing && hero.stateMachine.currentState.startsWith('ATTACK')) {
      this.publishedSwing = hero.attackId;
      this.publishedAttack = true;
      this.transport.send({ type: 'attack', round: this.transport.round, state: this.snapshot() });
    }
    this.engine.combatSystem.updateDuel(hero, this.opponent, dt, !!this.transport, (event, window, charged) => {
      if (!this.transport) return;
      if (event.result === 'deflected') this.transport.metrics.parryAgeMs = hero.stateMachine.stateTime * 1000;
      this.transport.send({ type: 'hit', round: this.transport.round,
        swing: (this.opponent as RemoteHero).snapshot?.swing ?? 0, window, result: event.result,
        health: hero.currentHealth, posture: hero.currentMarma, charged, seenSeq: (this.opponent as RemoteHero).snapshot?.seq ?? 0,
        point: event.point ?? hero.getPosition().toArray(),
      });
    }, window => {
      const key = hero.attackId + ':' + window; this.contacts.set(key, performance.now());
      if (this.contacts.size > 256) this.contacts.delete(this.contacts.keys().next().value!);
      if (this.transport) this.transport.metrics.predictedContacts++;
    });
    // Cancellation and recovery are reliable too: they bound the last active pose even at 100% snapshot loss.
    if (this.transport && this.publishedAttack && !hero.stateMachine.currentState.startsWith('ATTACK')) {
      this.publishedAttack = false;
      this.transport.send({ type: 'motion', round: this.transport.round, state: this.snapshot() });
    }
    const p = hero.getPosition(); this.velocity.copy(p).sub(this.previous).divideScalar(Math.max(dt, 1e-4)); this.previous.copy(p);
    if (!this.transport) {
      if (hero.isDown() || this.opponent.isDown()) this.finishPractice(hero.isDown() ? 1 : 0, 'ko');
      else if (this.remaining === 0) {
        const a = hero.currentHealth / hero.maxHealth, b = this.opponent.currentHealth / this.opponent.maxHealth;
        this.finishPractice(a === b ? null : a > b ? 0 : 1, 'time');
      }
    }
  }

  public updatePresentation(): void {
    const status = document.getElementById('duel-match')!; status.hidden = false;
    status.textContent = this.scoreText + ' · Round ' + this.roundNumber + ' · ' + Math.ceil(this.remaining) + 's';
    this.tags.update(this.engine.sceneManager.camera);
  }

  /** Wall-clock snapshots continue through hit-stop and online pause. Every one identifies its round kit. */
  private sendState(): void {
    if (!this.transport || !this.active || this.finished) return;
    // A background tab can run timers without rendering. Do not advertise a healthy but invulnerable hero.
    if (performance.now() - this.lastStep >= DUEL_STALL_MS) { this.disconnect('Duel stopped: your browser stopped simulating.'); return; }
    this.transport.send({ type: this.engine.player!.stateMachine.currentState.startsWith('ATTACK') ? 'motion' : 'state',
      round: this.transport.round, state: this.snapshot() });
    const status = document.getElementById('duel-network');
    const text = 'Room ' + this.transport.room + ' · ' + Math.round(this.transport.metrics.peerRtt) + ' ms ping';
    if (status && status.textContent !== text) status.textContent = text;
  }

  private snapshot(): HeroSnapshot {
    const hero = this.engine.player!, seq = this.seq++;
    const state: HeroSnapshot = {
      loadout: duelLoadoutId(this.roundNumber), seq, tick: this.tick, position: hero.getPosition().toArray(), yaw: hero.group.rotation.y,
      velocity: this.velocity.toArray(), state: hero.stateMachine.currentState, time: hero.stateMachine.stateTime,
      swing: hero.attackId, health: hero.currentHealth, posture: hero.currentMarma, charged: hero.chargedHits,
      chargeId: this.chargeId, chargeSpent: this.chargeSpent,
    };
    this.sentAt.set(seq, performance.now()); this.sentStates.set(seq, state);
    if (this.sentStates.size > 512) { const first = this.sentStates.keys().next().value!; this.sentStates.delete(first); this.sentAt.delete(first); }
    return state;
  }

  public dispose(): void {
    this.restoreChargeHook();
    if (this.sendTimer) clearInterval(this.sendTimer); if (this.probeTimer) clearInterval(this.probeTimer);
    this.bot?.release(); this.transport?.close(); this.tags.dispose();
    document.getElementById('duel-card')!.hidden = true; document.getElementById('duel-match')!.hidden = true;
    this.engine.player!.duelBlowScale = 1;
    this.engine.player!.clearDuelKits(); this.opponent.clearDuelKits(); this.opponent.retire();
  }
}

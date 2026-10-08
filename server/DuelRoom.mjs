/**
 * Shared room authority for Node and the Durable Object. Scores, round epochs, the short round card and the
 * clock belong here; heroes and defence belong to their browsers. Epochs keep increasing across ties and
 * rematches, so an old snapshot or verdict can never enter a new fight. Rules.ts is the single round table;
 * Node 22.18+ strips its types and the Worker bundles it. Modified defenders can still lie: no anti-cheat yet.
 */
import { DUEL_ROUND_KITS, DUEL_ROUNDS_TO_WIN, DUEL_ROUND_SECONDS, DUEL_ROUND_CARD_SECONDS, DUEL_STALL_MS, DUEL_SNAPSHOT_QUEUE_BYTES, DUEL_MAX_QUEUE_BYTES, duelLoadoutId } from '../src/duel/Rules.ts';
import { DuelPeer } from './DuelPeer.mjs';
const STATES = new Set(['IDLE', 'REST', 'WALK', 'MOVE', 'SPRINT', 'STRAFE_LEFT', 'STRAFE_RIGHT', 'WALK_BACK',
  'JUMP', 'DODGE', 'ATTACK_1', 'ATTACK_2', 'ATTACK_3', 'ATTACK_JUMP', 'CHARGE', 'CAST', 'PARRY', 'BLOCK',
  'BLOCK_HIT', 'SHOVE', 'SHEATHE', 'DRAW', 'STAGGER', 'DEFLECTED', 'POSTURE_BROKEN', 'DEAD']);
const RESULTS = new Set(['player-hit', 'blocked', 'deflected', 'evaded']);
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const vector = v => Array.isArray(v) && v.length === 3 && v.every(n => finite(n, -1000, 1000));
export const roomCode = code => typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code);
export const playerName = name => typeof name === 'string' ? name.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 16) || 'Yodha' : 'Yodha';
export function validSnapshot(s, number = 1) {
  const rule = DUEL_ROUND_KITS[number - 1];
  return !!rule && !!s && Number.isSafeInteger(s.seq) && s.seq >= 0 && vector(s.position) && vector(s.velocity)
    && Number.isSafeInteger(s.tick) && s.tick >= 0
    && finite(s.yaw, -100, 100) && STATES.has(s.state) && finite(s.time, 0, 86400)
    && Number.isSafeInteger(s.swing) && s.swing >= 0 && finite(s.health, 0, rule.health)
    && finite(s.posture, 0, 100) && Number.isInteger(s.charged) && s.charged >= 0 && s.charged <= 3
    && s.loadout === duelLoadoutId(number)
    && (number !== 1 || (!['PARRY', 'BLOCK', 'BLOCK_HIT', 'CHARGE', 'ATTACK_JUMP', 'SHEATHE', 'DRAW'].includes(s.state) && s.charged === 0));
}
export class DuelRoom {
  constructor(code, clock = {}) {
    this.code = code; this.seats = new Map(); this.round = 0; this.roundNumber = 0; this.nextRound = 1;
    this.score = [0, 0]; this.active = false; this.phase = 'lobby'; this.timer = null;
    this.progressTimer = null;
    this.now = clock.now ?? Date.now; this.schedule = clock.schedule ?? setTimeout; this.cancel = clock.cancel ?? clearTimeout;
  }
  send(socket, message) {
    const seat = this.seats.get(socket);
    if (seat) {
      const queued = Math.max(socket.bufferedAmount ?? 0, seat.outBytes);
      if (queued >= DUEL_MAX_QUEUE_BYTES) { this.leave(socket); socket.close(1000, 'Connection congested'); return; }
      if (message.type === 'state' && queued >= DUEL_SNAPSHOT_QUEUE_BYTES) return;
      message = { ...message, delivery: ++seat.delivery };
    }
    const raw = JSON.stringify(message);
    if (seat) {
      const bytes = new TextEncoder().encode(raw).length;
      if (seat.outBytes + bytes > DUEL_MAX_QUEUE_BYTES) { this.leave(socket); socket.close(1000, 'Connection congested'); return; }
      seat.outgoing.set(message.delivery, { bytes, at: this.now() }); seat.outBytes += bytes;
    }
    try { socket.send(raw); } catch { this.leave(socket); }
  }
  broadcast(message) { for (const socket of this.seats.keys()) this.send(socket, message); }
  names() { return [0, 1].map(i => [...this.seats.values()].find(s => s.seat === i)?.name ?? 'Yodha'); }
  roundData(type) {
    return { type, round: this.round, roundNumber: this.roundNumber, score: [...this.score],
      loadout: duelLoadoutId(this.roundNumber), health: DUEL_ROUND_KITS[this.roundNumber - 1].health,
      names: this.names(), seconds: DUEL_ROUND_SECONDS };
  }
  join(socket, create) {
    if (this.seats.size === 0 && !create) { this.send(socket, { type: 'error', message: 'Room not found' }); socket.close(1008); return false; }
    // A Durable Object outlives its sockets. Recreating an empty code starts a fresh room, not a closed lobby.
    if (this.seats.size === 0 && this.phase === 'closed' && create) {
      this.round = 0; this.roundNumber = 0; this.nextRound = 1; this.score = [0, 0]; this.phase = 'lobby';
    }
    if (this.seats.size >= 2) { this.send(socket, { type: 'error', message: 'Room is full' }); socket.close(1008); return false; }
    const seat = [...this.seats.values()].some(s => s.seat === 0) ? 1 : 0;
    this.seats.set(socket, { seat, name: 'Yodha', ready: false, rematch: false, seq: -1, health: 100,
      hits: new Set(), rateAt: this.now(), rate: 0, tick: -1, progressedAt: this.now(),
      outgoing: new Map(), outBytes: 0, delivery: 0 });
    this.send(socket, { type: 'joined', room: this.code, seat });
    this.broadcast({ type: 'waiting', players: this.seats.size }); return true;
  }
  leave(socket) {
    if (!this.seats.delete(socket)) return;
    this.cancel(this.timer); this.timer = null; this.active = false; this.phase = 'closed';
    this.cancel(this.progressTimer); this.progressTimer = null;
    this.broadcast({ type: 'disconnected' });
    const peers = [...this.seats.keys()]; this.seats.clear();
    for (const peer of peers) peer.close(1000, 'Opponent disconnected');
  }
  startIfReady() {
    if (!['lobby', 'between'].includes(this.phase) || this.seats.size !== 2 || ![...this.seats.values()].every(s => s.ready)) return;
    this.round++; this.roundNumber = this.nextRound; this.phase = 'card';
    for (const seat of this.seats.values()) {
      seat.seq = -1; seat.hits.clear(); seat.ready = false; seat.rematch = false;
      seat.health = DUEL_ROUND_KITS[this.roundNumber - 1].health;
    }
    this.broadcast({ ...this.roundData('card'), cardSeconds: DUEL_ROUND_CARD_SECONDS });
    this.timer = this.schedule(() => {
      if (this.phase !== 'card') return;
      this.phase = 'fight'; this.active = true; this.broadcast(this.roundData('start'));
      for (const seat of this.seats.values()) { seat.tick = -1; seat.progressedAt = this.now(); seat.evidence = new DuelPeer(seat.seat, this.now()); }
      this.watchProgress();
      this.timer = this.schedule(() => this.timeout(), DUEL_ROUND_SECONDS * 1000);
      this.timer?.unref?.();
    }, DUEL_ROUND_CARD_SECONDS * 1000);
    this.timer?.unref?.();
  }
  timeout() {
    if (!this.active) return;
    if (!this.checkProgress()) return;
    const health = [0, 1].map(i => [...this.seats.values()].find(s => s.seat === i).health / DUEL_ROUND_KITS[this.roundNumber - 1].health);
    this.finish(health[0] === health[1] ? null : health[0] > health[1] ? 0 : 1, 'time');
  }
  finish(winner, reason = 'ko') {
    if (!this.active) return;
    this.cancel(this.timer); this.timer = null; this.active = false;
    this.cancel(this.progressTimer); this.progressTimer = null;
    if (winner !== null) this.score[winner]++;
    const matchOver = this.score.some(s => s >= DUEL_ROUNDS_TO_WIN);
    this.phase = matchOver ? 'finished' : 'between';
    this.nextRound = winner === null ? this.roundNumber : this.roundNumber + 1;
    for (const seat of this.seats.values()) seat.ready = false;
    this.broadcast({ type: 'finish', round: this.round, roundNumber: this.roundNumber, winner,
      score: [...this.score], matchOver, nextRound: this.nextRound, reason });
  }
  message(socket, raw) {
    const sender = this.seats.get(socket);
    if (!sender || typeof raw !== 'string' || raw.length > 4096) return;
    if (this.now() - sender.rateAt >= 1000) { sender.rateAt = this.now(); sender.rate = 0; }
    if (++sender.rate > 120) { socket.close(1008, 'Message limit'); this.leave(socket); return; }
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.type === 'ack' && Number.isSafeInteger(m.delivery) && m.delivery > 0 && m.delivery <= sender.delivery) {
      for (const [id, packet] of sender.outgoing) {
        if (id > m.delivery) break;
        sender.outBytes -= packet.bytes; sender.outgoing.delete(id);
      }
      return;
    }
    if (m.type === 'hello' && this.phase === 'lobby') {
      sender.name = playerName(m.name); this.broadcast({ type: 'profiles', names: this.names() }); return;
    }
    if (m.type === 'ready' && ['lobby', 'between'].includes(this.phase) && m.round === this.round) {
      if (m.loadout !== duelLoadoutId(this.nextRound)) {
        this.send(socket, { type: 'error', message: 'Round loadout mismatch. Reload both clients.' }); return;
      }
      sender.ready = true; this.startIfReady(); return;
    }
    if (m.type === 'rematch' && this.phase === 'finished' && m.round === this.round) {
      sender.rematch = true; this.broadcast({ type: 'rematch-wait' });
      if (this.seats.size === 2 && [...this.seats.values()].every(s => s.rematch)) {
        this.score = [0, 0]; this.nextRound = 1; this.phase = 'between';
        for (const seat of this.seats.values()) seat.ready = false;
        this.broadcast({ type: 'prepare', round: this.round, roundNumber: 1, score: [...this.score] });
      }
      return;
    }
    if (!this.active || m.round !== this.round) return;
    if ((m.type === 'probe' || m.type === 'echo') && finite(m.at, 0, 1e15)) {
      for (const [peer] of this.seats) if (peer !== socket) this.send(peer, m); return;
    }
    if (['state', 'attack', 'motion'].includes(m.type) && validSnapshot(m.state, this.roundNumber)
      && (m.type !== 'state' || m.state.seq > sender.seq)) {
      if (!sender.evidence.accept(m.state, this.now(), m.type === 'attack')) return;
      if (m.state.tick > sender.tick) { sender.tick = m.state.tick; sender.progressedAt = this.now(); }
      sender.seq = Math.max(sender.seq, m.state.seq); sender.health = Math.min(sender.health, m.state.health); m.state.health = sender.health;
    } else if (m.type === 'hit' && Number.isSafeInteger(m.swing) && m.swing >= 0
      && Number.isInteger(m.window) && m.window >= 0 && m.window < 8 && RESULTS.has(m.result)
      && finite(m.health, 0, DUEL_ROUND_KITS[this.roundNumber - 1].health) && finite(m.posture, 0, 100)
      && typeof m.charged === 'boolean' && Number.isSafeInteger(m.seenSeq) && m.seenSeq >= 0 && vector(m.point)
      && (this.roundNumber !== 1 || (!['blocked', 'deflected'].includes(m.result) && !m.charged))) {
      const attacker = [...this.seats.values()].find(s => s !== sender);
      if (!attacker?.evidence.witnessed(m)) return;
      const key = m.swing + ':' + m.window; if (sender.hits.has(key)) return;
      sender.hits.add(key); sender.health = Math.min(sender.health, m.health); m.health = sender.health;
      if (sender.hits.size > 2048) { socket.close(1008, 'Round message limit'); this.leave(socket); return; }
    } else return;
    for (const [peer] of this.seats) if (peer !== socket) this.send(peer, { ...m, seat: sender.seat });
    if (m.type === 'hit' && m.health === 0) this.finish(1 - sender.seat);
  }

  /** Socket traffic alone is not liveness: the defender must advance its fixed-step simulation. */
  checkProgress() {
    for (const [socket, seat] of this.seats) {
      const pending = seat.outgoing.values().next().value;
      if (pending && this.now() - pending.at >= DUEL_STALL_MS) {
        this.leave(socket); socket.close(1000, 'Delivery stalled'); return false;
      }
      if (this.now() - seat.progressedAt < DUEL_STALL_MS) continue;
      this.send(socket, { type: 'error', message: 'Duel stopped: browser simulation stalled.' });
      this.leave(socket); socket.close(1000, 'Simulation stalled'); return false;
    }
    return true;
  }
  watchProgress() {
    this.progressTimer = this.schedule(() => {
      if (this.active && this.checkProgress()) this.watchProgress();
    }, 250);
    this.progressTimer?.unref?.();
  }
}

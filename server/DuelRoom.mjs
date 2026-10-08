/**
 * A two-seat room shared by the local relay and the Cloudflare Durable Object. The server owns membership and
 * round epochs, but never simulates a hero or judges a blade contact. Both rigs must report ready before a round
 * starts; a rematch needs both players. Only a defender may report its own health, and stale-round messages are
 * discarded. This is a trusted-peer spike, not competitive anti-cheat: a modified defender can still lie.
 */
const STATES = new Set(['IDLE', 'REST', 'WALK', 'MOVE', 'SPRINT', 'STRAFE_LEFT', 'STRAFE_RIGHT', 'WALK_BACK',
  'JUMP', 'DODGE', 'ATTACK_1', 'ATTACK_2', 'ATTACK_3', 'ATTACK_JUMP', 'CHARGE', 'CAST', 'PARRY', 'BLOCK',
  'BLOCK_HIT', 'SHOVE', 'SHEATHE', 'DRAW', 'STAGGER', 'DEFLECTED', 'POSTURE_BROKEN', 'DEAD']);
const RESULTS = new Set(['player-hit', 'blocked', 'deflected', 'evaded']);
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const vector = (v) => Array.isArray(v) && v.length === 3 && v.every(n => finite(n, -1000, 1000));
export const roomCode = (code) => typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code);
export function validSnapshot(s) {
  return !!s && Number.isSafeInteger(s.seq) && s.seq >= 0 && vector(s.position) && vector(s.velocity)
    && finite(s.yaw, -100, 100) && STATES.has(s.state) && finite(s.time, 0, 86400)
    && Number.isSafeInteger(s.swing) && s.swing >= 0 && finite(s.health, 0, 100)
    && finite(s.posture, 0, 100) && Number.isInteger(s.charged) && s.charged >= 0 && s.charged <= 3;
}
export class DuelRoom {
  constructor(code) { this.code = code; this.seats = new Map(); this.round = 0; this.active = false; }
  send(socket, message) {
    try { socket.send(JSON.stringify(message)); } catch { this.leave(socket); }
  }
  broadcast(message) { for (const socket of this.seats.keys()) this.send(socket, message); }
  join(socket, create) {
    if (this.seats.size === 0 && !create) { this.send(socket, { type: 'error', message: 'Room not found' }); socket.close(1008); return false; }
    if (this.seats.size >= 2) { this.send(socket, { type: 'error', message: 'Room is full' }); socket.close(1008); return false; }
    const occupied = [...this.seats.values()].map(s => s.seat);
    const seat = occupied.includes(0) ? 1 : 0;
    this.seats.set(socket, { seat, ready: false, rematch: false, seq: -1, hits: new Set(), rateAt: Date.now(), rate: 0 });
    this.send(socket, { type: 'joined', room: this.code, seat });
    this.broadcast({ type: 'waiting', players: this.seats.size });
    return true;
  }
  leave(socket) {
    if (!this.seats.delete(socket)) return;
    this.active = false;
    for (const seat of this.seats.values()) { seat.ready = false; seat.rematch = false; }
    this.broadcast({ type: 'disconnected' });
    const peers = [...this.seats.keys()];
    this.seats.clear();
    for (const peer of peers) peer.close(1000, 'Opponent disconnected');
  }
  startIfReady() {
    if (this.seats.size !== 2 || ![...this.seats.values()].every(s => s.ready)) return;
    this.round++; this.active = true;
    for (const seat of this.seats.values()) { seat.seq = -1; seat.hits.clear(); seat.rematch = false; }
    this.broadcast({ type: 'start', round: this.round });
  }
  message(socket, raw) {
    const sender = this.seats.get(socket);
    if (!sender || typeof raw !== 'string' || raw.length > 4096) return;
    if (Date.now() - sender.rateAt > 1000) { sender.rateAt = Date.now(); sender.rate = 0; }
    if (++sender.rate > 120) { socket.close(1008, 'Message limit'); this.leave(socket); return; }
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.type === 'ping' && finite(m.at, 0, 1e15)) { this.send(socket, { type: 'pong', at: m.at }); return; }
    if (m.type === 'ready' && !this.active) { sender.ready = true; this.startIfReady(); return; }
    if (m.type === 'rematch' && !this.active && m.round === this.round) {
      sender.rematch = true;
      this.broadcast({ type: 'rematch-wait' });
      if (this.seats.size === 2 && [...this.seats.values()].every(s => s.rematch)) {
        for (const seat of this.seats.values()) seat.ready = true;
        this.startIfReady();
      }
      return;
    }
    if (!this.active || m.round !== this.round) return;
    if ((m.type === 'probe' || m.type === 'echo') && finite(m.at, 0, 1e15)) {
      for (const [peer] of this.seats) if (peer !== socket) this.send(peer, m);
      return;
    }
    if (m.type === 'state' && validSnapshot(m.state) && m.state.seq > sender.seq) {
      sender.seq = m.state.seq;
    } else if (m.type === 'hit' && Number.isSafeInteger(m.swing) && m.swing >= 0
      && Number.isInteger(m.window) && m.window >= 0 && m.window < 8 && RESULTS.has(m.result)
      && finite(m.health, 0, 100) && finite(m.posture, 0, 100) && typeof m.charged === 'boolean'
      && Number.isSafeInteger(m.seenSeq) && m.seenSeq >= 0) {
      const key = m.swing + ':' + m.window;
      if (sender.hits.has(key)) return;
      sender.hits.add(key);
      if (sender.hits.size > 2048) { socket.close(1008, 'Round message limit'); this.leave(socket); return; }
    } else return;
    // Supply the seat ourselves: a client cannot forge the other player's identity.
    for (const [peer] of this.seats) if (peer !== socket) this.send(peer, { ...m, seat: sender.seat });
    if (m.type === 'hit' && m.health === 0) {
      this.active = false;
      this.broadcast({ type: 'finish', round: this.round, winner: 1 - sender.seat });
    }
  }
}

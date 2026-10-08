import type { HeroSnapshot } from '../entities/RemoteHero';
import type { CombatEvent } from '../combat/CombatSystem';

/**
 * WebSocket room transport, with a deliberately visible latency simulator. Each endpoint delays outgoing packets
 * by delayMs (one-way); set 20, 40 or 75 on both peers for 40, 80 or 150 ms peer RTT before the real network cost.
 * Jitter may reorder replaceable snapshots. Loss drops snapshots only: room control and defender results remain
 * reliable, as they are on WebSocket, so a lost update cannot erase a death or a parry. Probe/echo measures the
 * complete simulated peer round trip. No clock sync or timestamp from another browser is trusted.
 */
export interface LatencySettings { delayMs: number; jitterMs: number; loss: number }
export interface RoundMessage {
  round: number; roundNumber: number; score: [number, number]; loadout: string; health: number;
  names: [string, string]; seconds: number;
}
export type DuelMessage =
  | { type: 'joined'; room: string; seat: 0 | 1 }
  | { type: 'waiting'; players: number }
  | ({ type: 'start' } & RoundMessage)
  | ({ type: 'card'; cardSeconds: number } & RoundMessage)
  | { type: 'profiles'; names: [string, string] }
  | { type: 'prepare'; round: number; roundNumber: number; score: [number, number] }
  | { type: 'state'; round: number; state: HeroSnapshot }
  | { type: 'hit'; round: number; swing: number; window: number; result: CombatEvent['result']; health: number; posture: number; charged: boolean; seenSeq: number; point: number[] }
  | { type: 'finish'; round: number; roundNumber: number; winner: 0 | 1 | null; score: [number, number]; matchOver: boolean; nextRound: number; reason: 'ko' | 'time' }
  | { type: 'rematch-wait' }
  | { type: 'disconnected' }
  | { type: 'error'; message: string }
  | { type: 'probe' | 'echo'; round: number; at: number };

export class DuelTransport {
  public room = '';
  public name = 'Yodha';
  public seat: 0 | 1 = 0;
  public round = 0;
  public latency: LatencySettings = { delayMs: 0, jitterMs: 0, loss: 0 };
  public readonly metrics = { sent: 0, received: 0, dropped: 0, peerRtt: 0, probes: 0, verdictAgeMs: 0, parryAgeMs: 0, predictedContacts: 0, verdictFeedbackMs: 0, peerRttMin: 0, peerRttMax: 0, peerRttMean: 0,
    feedbacks: 0, feedbackMinMs: 0, feedbackMaxMs: 0, feedbackMeanMs: 0 };
  public onMessage: ((message: DuelMessage) => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  private socket: WebSocket | null = null;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private reliableDue = 0;
  private closed = false;

  public async connect(endpoint: string, code?: string, name = 'Yodha'): Promise<void> {
    this.name = name.trim().slice(0, 16) || 'Yodha';
    const url = new URL(endpoint);
    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') throw new Error('Use a ws:// or wss:// relay address');
    const room = code?.trim().toUpperCase() ?? Array.from(crypto.getRandomValues(new Uint8Array(6)), n =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join('');
    if (!/^[A-Z0-9]{6}$/.test(room)) throw new Error('Room codes have six letters or digits');
    url.searchParams.set('room', room);
    url.searchParams.set('create', code ? '0' : '1');
    this.room = room;
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);
      this.socket = socket;
      let joined = false;
      const timeout = setTimeout(() => { reject(new Error('Relay connection timed out')); this.close(); }, 10000);
      socket.onmessage = event => {
        let m: DuelMessage;
        try { m = JSON.parse(String(event.data)); } catch { return; }
        this.metrics.received++;
        if (m.type === 'joined') { joined = true; this.seat = m.seat; clearTimeout(timeout); this.send({ type: 'hello', name: this.name }); resolve(); }
        if (m.type === 'error' && !joined) { clearTimeout(timeout); reject(new Error(m.message)); }
        if (m.type === 'start' || m.type === 'card') this.round = m.round;
        if (m.type === 'probe') { this.send({ type: 'echo', round: m.round, at: m.at }); return; }
        if (m.type === 'echo') {
          const metrics = this.metrics;
          metrics.peerRtt = performance.now() - m.at;
          metrics.peerRttMin = metrics.probes ? Math.min(metrics.peerRttMin, metrics.peerRtt) : metrics.peerRtt;
          metrics.peerRttMax = Math.max(metrics.peerRttMax, metrics.peerRtt);
          metrics.peerRttMean += (metrics.peerRtt - metrics.peerRttMean) / ++metrics.probes;
          return;
        }
        this.onMessage?.(m);
      };
      socket.onerror = () => { if (!joined) { clearTimeout(timeout); reject(new Error('Cannot reach the duel relay')); } };
      socket.onclose = () => {
        clearTimeout(timeout);
        if (!joined) reject(new Error('Relay closed the connection'));
        if (!this.closed) this.onDisconnect?.();
      };
    });
  }

  public send<T extends { type: string }>(message: T): void {
    if (!this.socket || this.closed) return;
    const replaceable = message.type === 'state';
    if (replaceable && (Math.random() < this.latency.loss || this.timers.size > 120)) {
      this.metrics.dropped++; return;
    }
    const now = performance.now();
    let due = now + Math.max(0, this.latency.delayMs + (Math.random() * 2 - 1) * this.latency.jitterMs);
    if (!replaceable) { due = Math.max(due, this.reliableDue); this.reliableDue = due; }
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (this.socket?.readyState !== WebSocket.OPEN || this.closed) return;
      this.socket.send(JSON.stringify(message)); this.metrics.sent++;
    }, Math.max(0, due - now));
    this.timers.add(timer);
  }

  public probe(): void { this.send({ type: 'probe', round: this.round, at: performance.now() }); }
  public rematch(): void { this.send({ type: 'rematch', round: this.round }); }
  public close(): void {
    this.closed = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.socket?.close();
    this.onMessage = null; this.onDisconnect = null;
  }
}

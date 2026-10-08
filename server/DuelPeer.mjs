import { DUEL_ATTACKS, DUEL_SPAWNS } from '../src/duel/Rules.ts';

/**
 * Bounded evidence for one round's peer. A defender still owns its health/defence; it cannot invent an attack
 * serial, window or observed packet. Simulation time cannot outrun the room clock. Movement and attack token
 * budgets allow network bursts without granting an unlimited per-packet allowance. This is plausibility checking,
 * not proof that a modified browser is honest. No input replay or deterministic physics runs on the relay.
 */
export class DuelPeer {
  constructor(seat, at) {
    this.startedAt = at; this.at = at; this.position = [...DUEL_SPAWNS[seat]]; this.seq = -1;
    this.distance = 3; this.attacks = 4; this.lastSwing = -1; this.lastAttackTick = -30;
    this.swings = new Map(); this.samples = new Map();
  }
  accept(s, now, start = false) {
    if (this.samples.has(s.seq)) return false;
    if (s.tick > (now - this.startedAt) * 0.06 + 30) return false;
    const rule = DUEL_ATTACKS[s.loadout]?.[s.state];
    if (start && (!rule || s.time > 1 / 30 + 1e-4 || s.swing <= this.lastSwing || s.tick - this.lastAttackTick < 12)) return false;
    if (!start && s.state.startsWith('ATTACK')) {
      const origin = this.swings.get(s.swing);
      if (!origin || origin.state !== s.state || !rule || s.time > rule.duration + 0.05
        || Math.abs(s.time - origin.time - (s.tick - origin.tick) / 60) > 0.05) return false;
    }
    const elapsed = Math.max(0, (now - this.at) / 1000);
    const distance = Math.min(3, this.distance + elapsed * 20);
    const attacks = Math.min(4, this.attacks + elapsed * 3);
    const moved = s.seq > this.seq ? Math.hypot(...s.position.map((v, i) => v - this.position[i])) : 0;
    if (moved > distance || (start && attacks < 1)) return false;
    this.at = now; this.distance = distance - moved; this.attacks = attacks - (start ? 1 : 0);
    if (s.seq > this.seq) { this.seq = s.seq; this.position = [...s.position]; }
    if (start) {
      this.lastSwing = s.swing; this.lastAttackTick = s.tick; this.swings.set(s.swing, s);
      if (this.swings.size > 64) this.swings.delete(this.swings.keys().next().value);
    }
    this.samples.set(s.seq, s);
    if (this.samples.size > 512) this.samples.delete(this.samples.keys().next().value);
    return true;
  }
  witnessed(m) {
    const sample = this.samples.get(m.seenSeq), origin = this.swings.get(m.swing);
    return !!sample && !!origin && sample.swing === m.swing && sample.state === origin.state
      && !!DUEL_ATTACKS[origin.loadout]?.[origin.state]?.windows[m.window];
  }
}

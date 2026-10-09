import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket, WebSocketServer } from 'ws';
import { once } from 'node:events';
import { loadDuelModule } from './duel-test-runtime.mjs';
import { DuelRoom } from '../server/DuelRoom.mjs';
import { CombatTimeline } from '../src/duel/CombatTimeline.ts';
import * as rules from '../src/duel/Rules.ts';

/**
 * Two production transports meet the shared room over real local WebSockets. Each preset exercises three rounds,
 * verdict delivery through the production combat timeline, rematch readiness and peer disconnect notification.
 * Timers advance a scripted sender clock; eligible contacts report a fixture KO. This deliberately measures the
 * protocol and its latency simulator, not Rapier geometry, human reactions or whether parrying feels responsive.
 */
const until = async (predicate, label) => {
  const deadline = performance.now() + 8000;
  while (!predicate()) {
    if (performance.now() >= deadline) throw new Error('Timed out: ' + label);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};

for (const ping of [40, 80, 150]) test('real WebSockets: three rounds, verdicts and rematch at ' + ping + ' ms', { timeout: 25000 }, async t => {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0, maxPayload: 4096 }); await once(server, 'listening');
  let room;
  server.on('connection', (socket, request) => {
    const url = new URL(request.url, 'http://localhost'); room ??= new DuelRoom(url.searchParams.get('room'));
    room.join(socket, url.searchParams.get('create') === '1');
    socket.on('message', data => room.message(socket, data.toString()));
    socket.on('close', () => room.leave(socket));
  });
  const { DuelTransport } = await loadDuelModule('src/duel/Transport.ts', { './Rules': rules }, {
    WebSocket, URL, crypto: globalThis.crypto, performance, setTimeout, clearTimeout,
  });
  const clients = [];
  function client() {
    const transport = new DuelTransport(); transport.latency = { delayMs: ping / 2, jitterMs: 10, loss: 0.5 };
    const c = { transport, timeline: new CombatTimeline(), seq: 0, swing: 0, active: false, number: 1,
      health: 100, since: 0, attackTick: null, sent: new Map(), resolved: new Set(), finishes: [], ages: [], disconnected: false };
    c.state = () => {
      const tick = Math.floor((performance.now() - c.since) * 0.06), attack = c.attackTick !== null;
      const s = { loadout: rules.duelLoadoutId(c.number), seq: c.seq++, tick,
        position: [0, 0, transport.seat === 0 ? 3 : -3], velocity: [0, 0, 0], yaw: 0,
        state: attack ? 'ATTACK_1' : 'IDLE', time: attack ? (tick - c.attackTick) / 60 : 0,
        swing: c.swing, health: c.health, posture: 0, charged: 0, chargeId: 0, chargeSpent: 0 };
      c.sent.set(s.seq, performance.now()); return s;
    };
    c.attack = () => {
      c.swing++; c.attackTick = Math.floor((performance.now() - c.since) * 0.06);
      transport.send({ type: 'attack', round: transport.round, state: c.state() });
    };
    transport.onDisconnect = () => { c.disconnected = true; c.active = false; };
    transport.onMessage = m => {
      if (m.type === 'card') { c.number = m.roundNumber; c.health = m.health; c.seq = 0; c.attackTick = null; c.timeline.reset(); c.resolved.clear(); }
      if (m.type === 'start') { c.since = performance.now(); c.active = true; }
      if (m.type === 'attack' || m.type === 'motion') c.timeline.receive(m.state, performance.now());
      if (m.type === 'hit') c.ages.push(performance.now() - c.sent.get(m.seenSeq));
      if (m.type === 'finish') {
        c.active = false; c.finishes.push(m);
        if (!m.matchOver) transport.send({ type: 'ready', round: transport.round, loadout: rules.duelLoadoutId(m.nextRound) });
      }
      if (m.type === 'prepare') transport.send({ type: 'ready', round: transport.round, loadout: rules.duelLoadoutId(1) });
      if (m.type === 'disconnected' || m.type === 'error') { c.active = false; c.disconnected = true; }
    };
    c.interval = setInterval(() => {
      if (!c.active) return;
      let type = c.attackTick === null ? 'state' : 'motion';
      if (c.attackTick !== null && Math.floor((performance.now() - c.since) * 0.06) - c.attackTick >= 30) c.attackTick = null;
      transport.send({ type, round: transport.round, state: c.state() });
    }, 1000 / 30);
    c.simulation = setInterval(() => {
      if (!c.active) return;
      const s = c.timeline.sample(performance.now() - 100, 1 / 60);
      const w = s && rules.DUEL_ATTACKS[s.loadout]?.[s.state]?.windows[0];
      if (!w || s.time < w[0] || s.time > w[1] || c.resolved.has(s.swing)) return;
      c.resolved.add(s.swing); c.health = 0;
      transport.send({ type: 'hit', round: transport.round, swing: s.swing, window: 0, seenSeq: s.seq,
        health: 0, posture: 0, charged: false, result: 'player-hit', point: [0, 0, 0] });
    }, 1000 / 60);
    c.probes = setInterval(() => { if (c.active) transport.probe(); }, 200);
    clients.push(c); return c;
  }
  const a = client(), b = client();
  try {
    const endpoint = 'ws://127.0.0.1:' + server.address().port;
    await a.transport.connect(endpoint, undefined, 'A'); await b.transport.connect(endpoint, a.transport.room, 'B');
    for (const c of clients) c.transport.send({ type: 'ready', round: 0, loadout: rules.duelLoadoutId(1) });
    for (const [i, attacker] of [a, b, a].entries()) {
      await until(() => clients.every(c => c.active && c.number === i + 1), 'round ' + (i + 1));
      attacker.attack();
      await until(() => clients.every(c => c.finishes.length === i + 1), 'verdict ' + (i + 1));
      assert.equal(clients.some(c => c.disconnected), false);
    }
    assert.deepEqual(Array.from(a.finishes.at(-1).score), [2, 1]); assert.deepEqual(Array.from(b.finishes.at(-1).score), [2, 1]);
    for (const c of clients) c.transport.rematch();
    await until(() => clients.every(c => c.active && c.transport.round === 4), 'rematch');
    assert.deepEqual(room.score, [0, 0]); assert.equal(a.health, 100); assert.equal(b.health, 100);
    a.transport.close(); await until(() => b.disconnected, 'disconnect');
    t.diagnostic(JSON.stringify({ presetPing: ping, jitter: 10, loss: 0.5,
      peerRttMeans: clients.map(c => +c.transport.metrics.peerRttMean.toFixed(1)),
      snapshotToVerdictMs: clients.flatMap(c => c.ages).map(n => +n.toFixed(1)),
      droppedMovementSnapshots: clients.map(c => c.transport.metrics.dropped) }));
  } finally {
    for (const c of clients) { clearInterval(c.interval); clearInterval(c.simulation); clearInterval(c.probes); c.transport.close(); }
    for (const socket of server.clients) socket.terminate();
    await new Promise(resolve => server.close(resolve));
  }
});

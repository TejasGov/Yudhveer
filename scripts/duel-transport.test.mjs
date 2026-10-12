import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDuelModule } from './duel-test-runtime.mjs';
import * as rules from '../src/duel/Rules.ts';

test('socket pressure drops replaceable poses but retains reliable combat and fails at the hard limit', async () => {
  const timers = [], writes = [], closed = [];
  const { DuelTransport } = await loadDuelModule('src/duel/Transport.ts', { './Rules': rules }, {
    performance: { now: () => 0 }, WebSocket: { OPEN: 1 },
    setTimeout: fn => { timers.push(fn); return fn; }, clearTimeout() {},
  });
  const transport = new DuelTransport();
  transport.socket = { readyState: 1, bufferedAmount: rules.DUEL_SNAPSHOT_QUEUE_BYTES, send: s => writes.push(JSON.parse(s)), close: () => closed.push(true) };
  transport.send({ type: 'state' }); transport.send({ type: 'hit' });
  for (const run of timers.splice(0)) run();
  assert.equal(writes.length, 1); assert.equal(writes[0].type, 'hit'); assert.equal(transport.metrics.dropped, 1);
  transport.socket.bufferedAmount = 10 * 1024 * 1024;
  let reason; transport.onDisconnect = message => reason = message;
  transport.send({ type: 'attack' }); for (const run of timers.splice(0)) run();
  assert.equal(writes.length, 1); assert.equal(closed.length, 1); assert.match(reason, /keep up/);
});

test('simulated loss never drops reliable attack starts, poses or cancellation', async () => {
  const timers = [], writes = [];
  const { DuelTransport } = await loadDuelModule('src/duel/Transport.ts', { './Rules': rules }, {
    performance: { now: () => 0 }, WebSocket: { OPEN: 1 },
    setTimeout: fn => { timers.push(fn); return fn; }, clearTimeout() {},
  });
  const transport = new DuelTransport(); transport.latency.loss = 1;
  transport.socket = { readyState: 1, bufferedAmount: 0, send: s => writes.push(JSON.parse(s)) };
  for (const type of ['state', 'attack', 'motion', 'motion', 'hit']) transport.send({ type });
  for (const run of timers) run();
  assert.deepEqual(writes.map(m => m.type), ['attack', 'motion', 'motion', 'hit']);
});

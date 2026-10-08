import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelRoom, validSnapshot } from '../server/DuelRoom.mjs';

// Protocol tests use the actual shared room core, without a simulated game. Browser checks exercise the real
// WebSocket and CombatSystem separately. These cases catch membership, stale-round and duplicate-hit failures.
const socket = () => ({ messages: [], closed: false, send(raw) { this.messages.push(JSON.parse(raw)); }, close() { this.closed = true; } });
const send = (room, peer, data) => room.message(peer, JSON.stringify(data));
const pair = () => {
  const room = new DuelRoom('ABC123'), a = socket(), b = socket();
  room.join(a, true); room.join(b, false);
  send(room, a, { type: 'ready' }); send(room, b, { type: 'ready' });
  return { room, a, b };
};
const hit = (round, health = 70) => ({ type: 'hit', round, swing: 1, window: 0, result: 'player-hit', health, posture: 20, charged: false });
const state = { seq: 1, position: [0, 0, 0], velocity: [1, 0, 0], yaw: 0, state: 'ATTACK_1', time: 0.3, swing: 1, health: 100, posture: 0, charged: 0 };

test('missing rooms and third players are rejected', () => {
  const empty = new DuelRoom('ABC123'), missing = socket(); empty.join(missing, false);
  assert.equal(missing.messages[0].message, 'Room not found'); assert.equal(missing.closed, true);
  const { room } = pair(), third = socket(); room.join(third, false);
  assert.equal(third.messages[0].message, 'Room is full'); assert.equal(room.seats.size, 2);
});
test('start waits for both loaded heroes', () => {
  const room = new DuelRoom('ABC123'), a = socket(), b = socket(); room.join(a, true); room.join(b, false);
  send(room, a, { type: 'ready' }); assert.equal(room.active, false);
  send(room, b, { type: 'ready' }); assert.equal(room.active, true); assert.equal(room.round, 1);
});
test('snapshots are validated, ordered and scoped to a round', () => {
  const { room, a, b } = pair(); const before = b.messages.length;
  send(room, a, { type: 'state', round: 0, state });
  send(room, a, { type: 'state', round: 1, state: { ...state, position: [null, 0, 0] } });
  assert.equal(b.messages.length, before);
  send(room, a, { type: 'state', round: 1, state, seat: 1 });
  assert.equal(b.messages.at(-1).seat, 0);
  send(room, a, { type: 'state', round: 1, state }); assert.equal(b.messages.length, before + 1);
  assert.equal(validSnapshot({ ...state, health: -1 }), false);
});
test('defender verdicts are delivered once and a lethal verdict ends the round', () => {
  const { room, a, b } = pair(); send(room, a, hit(1)); const before = b.messages.length;
  send(room, a, hit(1)); assert.equal(b.messages.length, before);
  send(room, a, { ...hit(1, 0), swing: 2 }); assert.equal(room.active, false);
  assert.deepEqual(b.messages.at(-1), { type: 'finish', round: 1, winner: 1 });
});
test('both players must request rematch and old verdicts cannot enter it', () => {
  const { room, a, b } = pair(); send(room, a, hit(1, 0));
  send(room, a, { type: 'rematch', round: 1 }); assert.equal(room.round, 1);
  send(room, b, { type: 'rematch', round: 1 }); assert.equal(room.round, 2); assert.equal(room.active, true);
  const before = b.messages.length; send(room, a, { ...hit(1), swing: 2 }); assert.equal(b.messages.length, before);
});
test('disconnect notifies survivor and peer probes traverse the room', () => {
  const { room, a, b } = pair(); send(room, a, { type: 'probe', round: 1, at: 123 });
  assert.equal(b.messages.at(-1).type, 'probe');
  room.leave(a); assert.equal(room.active, false); assert.equal(b.messages.at(-1).type, 'disconnected');
});

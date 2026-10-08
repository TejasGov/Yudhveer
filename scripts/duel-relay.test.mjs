import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelRoom, validSnapshot } from '../server/DuelRoom.mjs';
import { DUEL_ROUND_KITS, DUEL_ROUNDS_TO_WIN, duelLoadoutId } from '../src/duel/Rules.ts';

/** The actual shared core, with a controllable server clock: no waiting, fake scoring or duplicated kit table. */
const socket = () => ({ messages: [], closed: false, send(raw) { this.messages.push(JSON.parse(raw)); }, close() { this.closed = true; } });
const send = (room, peer, data) => room.message(peer, JSON.stringify(data));
const clock = () => {
  let at = 0, serial = 0; const timers = new Map();
  return { now: () => at, schedule: (fn, delay) => { const id = ++serial; timers.set(id, { fn, at: at + delay }); return id; },
    cancel: id => timers.delete(id), advance(seconds) {
      const end = at + seconds * 1000;
      for (;;) {
        const next = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]); at = next[1].at; next[1].fn();
      }
      at = end;
    } };
};
const ready = (room, a, b) => {
  for (const peer of [a, b]) send(room, peer, { type: 'ready', round: room.round, loadout: duelLoadoutId(room.nextRound) });
};
const pair = () => {
  const time = clock(), room = new DuelRoom('ABC123', time), a = socket(), b = socket();
  room.join(a, true); room.join(b, false); ready(room, a, b); time.advance(2);
  return { room, a, b, time };
};
const next = p => { ready(p.room, p.a, p.b); p.time.advance(2); };
const hit = (round, health = 70) => ({ type: 'hit', round, swing: 1, window: 0, result: 'player-hit', health, posture: 20, charged: false, seenSeq: 1, point: [0, 1, 0] });
const state = { loadout: 'training:fists', seq: 1, position: [0, 0, 0], velocity: [1, 0, 0], yaw: 0, state: 'ATTACK_1', time: 0.3, swing: 1, health: 100, posture: 0, charged: 0 };

test('shared table is best of three, unarmed 100 then summit 100 and 130', () => {
  assert.equal(DUEL_ROUNDS_TO_WIN, 2);
  assert.deepEqual(DUEL_ROUND_KITS.map(r => [r.health, r.loadout.attire, r.loadout.weapon]),
    [[100, 'training', 'fists'], [100, 'kavach', 'khanda'], [130, 'kavach', 'khanda']]);
  assert.deepEqual(DUEL_ROUND_KITS[0].loadout.abilities, ['dodge', 'combo']);
});
test('missing rooms and third players are rejected', () => {
  const empty = new DuelRoom('ABC123'), missing = socket(); empty.join(missing, false);
  assert.equal(missing.messages[0].message, 'Room not found'); assert.equal(missing.closed, true);
  const { room } = pair(), third = socket(); room.join(third, false);
  assert.equal(third.messages[0].message, 'Room is full'); assert.equal(room.seats.size, 2);
});
test('both loaded kits and the complete round card precede combat', () => {
  const time = clock(), room = new DuelRoom('ABC123', time), a = socket(), b = socket(); room.join(a, true); room.join(b, false);
  send(room, a, { type: 'ready', round: 0, loadout: duelLoadoutId(1) }); assert.equal(room.phase, 'lobby');
  send(room, b, { type: 'ready', round: 0, loadout: 'kavach:khanda' }); assert.equal(room.phase, 'lobby');
  send(room, b, { type: 'ready', round: 0, loadout: duelLoadoutId(1) }); assert.equal(room.phase, 'card');
  send(room, a, hit(1, 0)); assert.deepEqual(room.score, [0, 0]);
  time.advance(1.99); assert.equal(room.active, false); time.advance(0.01); assert.equal(room.active, true);
});
test('snapshots are ordered, round scoped, bound to kit, and cannot heal a defender', () => {
  const { room, a, b } = pair(); const before = b.messages.length;
  send(room, a, { type: 'state', round: 0, state });
  send(room, a, { type: 'state', round: 1, state: { ...state, position: [null, 0, 0] } });
  send(room, a, { type: 'state', round: 1, state: { ...state, loadout: 'kavach:khanda' } });
  assert.equal(b.messages.length, before);
  send(room, a, { type: 'state', round: 1, state, seat: 1 }); assert.equal(b.messages.at(-1).seat, 0);
  send(room, a, { type: 'state', round: 1, state }); assert.equal(b.messages.length, before + 1);
  send(room, a, hit(1, 30)); send(room, a, { type: 'state', round: 1, state: { ...state, seq: 2 } });
  assert.equal(b.messages.at(-1).state.health, 30);
});
test('unarmed snapshots and verdicts cannot guard, parry or charge', () => {
  const { room, a, b } = pair(), before = b.messages.length;
  for (const s of ['PARRY', 'BLOCK', 'CHARGE', 'ATTACK_JUMP']) assert.equal(validSnapshot({ ...state, state: s }), false);
  for (const result of ['blocked', 'deflected']) send(room, a, { ...hit(1), result });
  send(room, a, { ...hit(1), charged: true }); assert.equal(b.messages.length, before);
});
test('verdict is once per swing/window; 2-0 ends after two rounds', () => {
  const p = pair(); send(p.room, p.b, hit(1)); const before = p.a.messages.length;
  send(p.room, p.b, hit(1)); assert.equal(p.a.messages.length, before);
  send(p.room, p.b, { ...hit(1, 0), swing: 2 }); assert.deepEqual(p.room.score, [1, 0]); assert.equal(p.room.phase, 'between');
  next(p); send(p.room, p.b, hit(2, 0)); assert.deepEqual(p.room.score, [2, 0]); assert.equal(p.room.phase, 'finished');
  ready(p.room, p.a, p.b); p.time.advance(2); assert.equal(p.room.roundNumber, 2);
});
test('1-1 opens round three with 130 health and ends 2-1', () => {
  const p = pair(); send(p.room, p.b, hit(1, 0)); next(p); send(p.room, p.a, hit(2, 0)); next(p);
  assert.equal(p.room.roundNumber, 3); assert.deepEqual(p.room.score, [1, 1]); assert.equal(p.a.messages.at(-1).health, 130);
  assert.equal(validSnapshot({ ...state, loadout: 'kavach:khanda', health: 130 }, 3), true);
  assert.equal(validSnapshot({ ...state, loadout: 'kavach:khanda', health: 131 }, 3), false);
  send(p.room, p.b, hit(3, 0)); assert.deepEqual(p.room.score, [2, 1]); assert.equal(p.room.phase, 'finished');
});
test('stale state, verdict and readiness cannot enter a later epoch', () => {
  const p = pair(); send(p.room, p.b, hit(1, 0));
  send(p.room, p.a, { type: 'ready', round: 0, loadout: duelLoadoutId(2) }); assert.equal(p.room.seats.get(p.a).ready, false);
  next(p); const before = p.b.messages.length;
  send(p.room, p.a, hit(1, 0)); send(p.room, p.a, { type: 'state', round: 1, state });
  assert.equal(p.b.messages.length, before); assert.deepEqual(p.room.score, [1, 0]);
});
test('only both requests at match end rematch; score resets and epochs do not', () => {
  const p = pair(); send(p.room, p.b, hit(1, 0));
  send(p.room, p.a, { type: 'rematch', round: 1 }); assert.equal(p.room.seats.get(p.a).rematch, false);
  next(p); send(p.room, p.b, hit(2, 0));
  send(p.room, p.a, { type: 'rematch', round: 2 }); assert.equal(p.room.phase, 'finished');
  send(p.room, p.b, { type: 'rematch', round: 2 }); assert.deepEqual(p.room.score, [0, 0]); next(p);
  assert.equal(p.room.round, 3); assert.equal(p.room.roundNumber, 1); assert.equal(p.room.active, true);
  send(p.room, p.a, hit(2, 0)); assert.deepEqual(p.room.score, [0, 0]);
});
test('90 seconds compares health shares; an exact tie replays the same kit in a fresh epoch', () => {
  const p = pair(); p.time.advance(90); assert.equal(p.room.phase, 'between'); assert.deepEqual(p.room.score, [0, 0]);
  next(p); assert.equal(p.room.round, 2); assert.equal(p.room.roundNumber, 1);
  send(p.room, p.a, { type: 'state', round: 2, state: { ...state, health: 70 } }); p.time.advance(90);
  assert.deepEqual(p.room.score, [0, 1]); assert.equal(p.a.messages.at(-1).reason, 'time');
});
test('hello preserves names as bounded text, and round messages carry both names', () => {
  const p = pair(); p.room.phase = 'lobby'; p.room.active = false;
  send(p.room, p.a, { type: 'hello', name: '  <b>Yodha</b>  ' }); send(p.room, p.b, { type: 'hello', name: '01234567890123456789' });
  assert.deepEqual(p.a.messages.at(-1).names, ['<b>Yodha</b>', '0123456789012345']);
});
test('disconnect cancels card/clock; peer probes traverse the room', () => {
  const p = pair(); send(p.room, p.a, { type: 'probe', round: 1, at: 123 }); assert.equal(p.b.messages.at(-1).type, 'probe');
  p.room.leave(p.a); assert.equal(p.room.active, false); assert.equal(p.b.messages.at(-1).type, 'disconnected');
  p.time.advance(100); assert.equal(p.room.phase, 'closed');
});

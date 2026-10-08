import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelRoom, validSnapshot } from '../server/DuelRoom.mjs';
import { DUEL_ROUND_KITS, DUEL_ROUNDS_TO_WIN, duelLoadoutId } from '../src/duel/Rules.ts';

/** The actual shared core, with a controllable server clock: no waiting, fake scoring or duplicated kit table. */
const socket = () => ({ messages: [], closed: false, send(raw) { const message = JSON.parse(raw); this.messages.push(message); if (this.room && this.autoAck !== false && message.delivery) this.room.message(this, JSON.stringify({ type: 'ack', delivery: message.delivery })); }, close() { this.closed = true; } });
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
  a.room = b.room = room; room.join(a, true); room.join(b, false); ready(room, a, b); time.advance(2); room.testAdvance = seconds => time.advance(seconds);
  return { room, a, b, time };
};
const next = p => { ready(p.room, p.a, p.b); p.time.advance(2); };
const hit = (round, health = 70) => ({ type: 'hit', round, swing: 1, window: 0, result: 'player-hit', health, posture: 20, charged: false, seenSeq: 1, point: [0, 1, 0] });
const state = { loadout: 'training:fists', seq: 1, tick: 1, position: [0, 0, 0], velocity: [1, 0, 0], yaw: 0, state: 'IDLE', time: 0.3, swing: 1, health: 100, posture: 0, charged: 0 };

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
  defend(room, a, hit(1, 0)); assert.deepEqual(room.score, [0, 0]);
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
  defend(room, a, hit(1, 30)); send(room, a, { type: 'state', round: 1, state: { ...state, seq: 2 } });
  assert.equal(b.messages.at(-1).state.health, 30);
});
test('unarmed snapshots and verdicts cannot guard, parry or charge', () => {
  const { room, a, b } = pair(), before = b.messages.length;
  for (const s of ['PARRY', 'BLOCK', 'CHARGE', 'ATTACK_JUMP']) assert.equal(validSnapshot({ ...state, state: s }), false);
  for (const result of ['blocked', 'deflected']) send(room, a, { ...hit(1), result });
  send(room, a, { ...hit(1), charged: true }); assert.equal(b.messages.length, before);
});
test('verdict is once per swing/window; 2-0 ends after two rounds', () => {
  const p = pair(); defend(p.room, p.b, hit(1)); const before = p.a.messages.length;
  defend(p.room, p.b, hit(1)); assert.equal(p.a.messages.length, before);
  defend(p.room, p.b, { ...hit(1, 0), swing: 2 }); assert.deepEqual(p.room.score, [1, 0]); assert.equal(p.room.phase, 'between');
  next(p); defend(p.room, p.b, hit(2, 0)); assert.deepEqual(p.room.score, [2, 0]); assert.equal(p.room.phase, 'finished');
  ready(p.room, p.a, p.b); p.time.advance(2); assert.equal(p.room.roundNumber, 2);
});
test('1-1 opens round three with 130 health and ends 2-1', () => {
  const p = pair(); defend(p.room, p.b, hit(1, 0)); next(p); defend(p.room, p.a, hit(2, 0)); next(p);
  assert.equal(p.room.roundNumber, 3); assert.deepEqual(p.room.score, [1, 1]); assert.equal(p.a.messages.at(-1).health, 130);
  assert.equal(validSnapshot({ ...state, loadout: 'kavach:khanda', health: 130 }, 3), true);
  assert.equal(validSnapshot({ ...state, loadout: 'kavach:khanda', health: 131 }, 3), false);
  defend(p.room, p.b, hit(3, 0)); assert.deepEqual(p.room.score, [2, 1]); assert.equal(p.room.phase, 'finished');
});
test('stale state, verdict and readiness cannot enter a later epoch', () => {
  const p = pair(); defend(p.room, p.b, hit(1, 0));
  send(p.room, p.a, { type: 'ready', round: 0, loadout: duelLoadoutId(2) }); assert.equal(p.room.seats.get(p.a).ready, false);
  next(p); const before = p.b.messages.length;
  defend(p.room, p.a, hit(1, 0)); send(p.room, p.a, { type: 'state', round: 1, state });
  assert.equal(p.b.messages.length, before); assert.deepEqual(p.room.score, [1, 0]);
});
test('only both requests at match end rematch; score resets and epochs do not', () => {
  const p = pair(); defend(p.room, p.b, hit(1, 0));
  send(p.room, p.a, { type: 'rematch', round: 1 }); assert.equal(p.room.seats.get(p.a).rematch, false);
  next(p); defend(p.room, p.b, hit(2, 0));
  send(p.room, p.a, { type: 'rematch', round: 2 }); assert.equal(p.room.phase, 'finished');
  send(p.room, p.b, { type: 'rematch', round: 2 }); assert.deepEqual(p.room.score, [0, 0]); next(p);
  assert.equal(p.room.round, 3); assert.equal(p.room.roundNumber, 1); assert.equal(p.room.active, true);
  defend(p.room, p.a, hit(2, 0)); assert.deepEqual(p.room.score, [0, 0]);
});
test('90 seconds compares health shares; an exact tie replays the same kit in a fresh epoch', () => {
  const p = pair(); playFor(p, 90); assert.equal(p.room.phase, 'between'); assert.deepEqual(p.room.score, [0, 0]);
  next(p); assert.equal(p.room.round, 2); assert.equal(p.room.roundNumber, 1);
  send(p.room, p.a, { type: 'state', round: 2, state: { ...state, health: 70 } }); playFor(p, 90);
  assert.deepEqual(p.room.score, [0, 1]); assert.equal(p.a.messages.at(-1).reason, 'time');
});
test('hello preserves names as bounded text, and round messages carry both names', () => {
  const time = clock(), room = new DuelRoom('ABC123', time), a = socket(), b = socket();
  room.join(a, true); room.join(b, false); const p = { room, a, b, time };
  send(p.room, p.a, { type: 'hello', name: '  <b>Yodha</b>  ' }); send(p.room, p.b, { type: 'hello', name: '01234567890123456789' });
  assert.deepEqual(p.a.messages.at(-1).names, ['<b>Yodha</b>', '0123456789012345']);
  ready(room, a, b); time.advance(2);
  assert.deepEqual(a.messages.at(-1).names, ['<b>Yodha</b>', '0123456789012345']);
});
test('disconnect cancels card/clock; peer probes traverse the room', () => {
  const p = pair(); send(p.room, p.a, { type: 'probe', round: 1, at: 123 }); assert.equal(p.b.messages.at(-1).type, 'probe');
  p.room.leave(p.a); assert.equal(p.room.active, false); assert.equal(p.b.messages.at(-1).type, 'disconnected');
  p.time.advance(100); assert.equal(p.room.phase, 'closed');
});

test('a racing lethal verdict cannot award a second score after the round is closed', () => {
  const p = pair(); defend(p.room, p.a, hit(1, 0)); defend(p.room, p.b, hit(1, 0));
  assert.deepEqual(p.room.score, [0, 1]);
  assert.equal(p.a.messages.filter(m => m.type === 'finish').length, 1);
});

function playFor(p, seconds) {
  for (let n = 0; n < seconds; n++) {
    for (const peer of [p.a, p.b]) {
      const seat = p.room.seats.get(peer);
      send(p.room, peer, { type: 'state', round: p.room.round, state: { ...state, state: 'IDLE', seq: seat.seq + 1, tick: Math.max(0, Math.floor((p.room.now() - seat.evidence.startedAt) * 0.06)), health: seat.health, loadout: duelLoadoutId(p.room.roundNumber) } });
    }
    p.time.advance(1);
  }
}

test('fresh sequence numbers and probes cannot keep a frozen simulation alive', () => {
  const p = pair();
  for (let n = 1; n <= 9 && p.room.active; n++) {
    send(p.room, p.a, { type: 'state', round: 1, state: { ...state, seq: n, tick: 1 } });
    send(p.room, p.b, { type: 'state', round: 1, state: { ...state, seq: n, tick: (n - 1) * 15 } });
    send(p.room, p.a, { type: 'probe', round: 1, at: n });
    p.time.advance(0.25);
  }
  assert.equal(p.room.phase, 'closed'); assert.deepEqual(p.room.score, [0, 0]);
  assert.equal(p.b.messages.at(-1).type, 'disconnected');
});

test('an idle or paused hero remains connected while its simulation advances', () => {
  const p = pair(); playFor(p, 10); assert.equal(p.room.active, true);
  p.room.leave(p.a);
});

/** A verdict fixture first publishes the attack it claims to have witnessed. */
function defend(room, peer, message) {
  if (room.active && message.round === room.round) {
    const [attacker, seat] = [...room.seats].find(([socket]) => socket !== peer);
    if (!seat.evidence.swings.has(message.swing)) {
      if (seat.evidence.swings.size) room.testAdvance(0.5);
      const snapshot = { ...state, loadout: duelLoadoutId(room.roundNumber), state: 'ATTACK_1', time: 0,
        position: [0, 0, seat.seat === 0 ? 3 : -3], seq: seat.seq + 1, swing: message.swing,
        tick: Math.floor((room.now() - seat.evidence.startedAt) * 0.06), health: seat.health };
      send(room, attacker, { type: 'attack', round: room.round, state: snapshot });
    }
    message.seenSeq = seat.evidence.swings.get(message.swing)?.seq ?? message.seenSeq;
  }
  send(room, peer, message);
}

test('invented swings, unseen references and nonexistent strike windows cannot parry a peer', () => {
  const p = pair(); p.room.finish(0); next(p);
  const forged = { ...hit(p.room.round, 100), result: 'deflected', swing: 999, seenSeq: 999 };
  send(p.room, p.b, forged); assert.equal(p.a.messages.some(m => m.type === 'hit'), false);
  defend(p.room, p.b, { ...hit(p.room.round, 100), result: 'deflected' });
  const before = p.a.messages.filter(m => m.type === 'hit').length; assert.equal(before, 1);
  send(p.room, p.b, { ...forged, swing: 1, window: 1, seenSeq: 0 });
  send(p.room, p.b, { ...forged, swing: 1, window: 0 });
  assert.equal(p.a.messages.filter(m => m.type === 'hit').length, before);
});

test('teleports, unregistered attacks, impossible clocks and same-frame attack spam are rejected', () => {
  const p = pair(); const before = p.b.messages.length;
  for (const change of [{position:[900,0,0]}, {tick:99999}, {state:'ATTACK_1'}])
    send(p.room,p.a,{type:'state',round:1,state:{...state,...change}});
  assert.equal(p.b.messages.length,before);
  const opening={...state,seq:2,tick:1,time:0,state:'ATTACK_1',position:[0,0,3]};
  send(p.room,p.a,{type:'attack',round:1,state:opening});
  for(let n=2;n<30;n++)send(p.room,p.a,{type:'attack',round:1,state:{...opening,seq:n+1,swing:n}});
  assert.equal(p.b.messages.filter(m=>m.type==='attack').length,1);
});

test('room bounds unacknowledged delivery even on a Worker socket without bufferedAmount', () => {
  const p = pair(); p.b.autoAck = false;
  for (let n = 0; n < 500 && p.room.seats.has(p.b); n++) p.room.send(p.b, { type: 'motion', state: { ...state, padding: 'x'.repeat(500) } });
  assert.equal(p.room.phase, 'closed'); assert.equal(p.b.closed, true);
});

test('future acknowledgements cannot erase backlog and missing receipts end an active session', () => {
  const p = pair(); p.b.autoAck = false; p.room.send(p.b, { type: 'probe', round: 1, at: 0 });
  const seat = p.room.seats.get(p.b), before = seat.outBytes;
  send(p.room, p.b, { type: 'ack', delivery: seat.delivery + 1 }); assert.equal(seat.outBytes, before);
  for (let n = 0; n < 8 && p.room.active; n++) {
    for (const peer of [p.a, p.b]) send(p.room, peer, { type: 'state', round: 1, state: { ...state, seq: n + 1, tick: n * 15, position: [0, 0, peer === p.a ? 3 : -3] } });
    p.time.advance(0.25);
  }
  assert.equal(p.room.phase, 'closed');
});

test('an empty retained room can be recreated after disconnect with fresh epochs and score', () => {
  const p = pair(); defend(p.room, p.b, hit(1, 0)); p.room.leave(p.a);
  const missing = socket(); assert.equal(p.room.join(missing, false), false);
  const c = socket(), d = socket(); c.room = d.room = p.room;
  assert.equal(p.room.join(c, true), true); assert.equal(p.room.join(d, false), true);
  ready(p.room, c, d); p.time.advance(2);
  assert.equal(p.room.active, true); assert.equal(p.room.round, 1); assert.equal(p.room.roundNumber, 1);
  assert.deepEqual(p.room.score, [0, 0]); assert.equal(p.room.seats.size, 2);
  // Events from detached old sockets cannot touch the replacement session.
  p.room.leave(p.b); send(p.room, p.a, hit(1, 0)); assert.equal(p.room.active, true);
});

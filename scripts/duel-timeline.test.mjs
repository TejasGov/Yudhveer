import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatTimeline } from '../src/duel/CombatTimeline.ts';
import { DUEL_ATTACKS } from '../src/duel/Rules.ts';

/** Actual receiver timeline with a controlled clock. Animation windows are the same wire bounds checked by duelCheck. */
const pose = (seq, tick, state = 'ATTACK_1', time = tick / 60) => ({
  seq, tick, state, time, swing: 1, loadout: 'training:fists', position: [0, 0, tick / 60],
  velocity: [0, 0, 1], yaw: 0, health: 100, posture: 0, charged: 0,
});
const within = (s, window) => !!s?.state.startsWith('ATTACK') && s.time >= window[0] && s.time <= window[1];

test('a 250 ms hitch preserves the received fist strike and catches up', () => {
  const timeline = new CombatTimeline();
  for (let tick = 0; tick < 30; tick += 2) timeline.receive(pose(tick, tick), tick * 1000 / 60);
  timeline.receive(pose(30, 30, 'IDLE', 0), 500);
  const samples = [];
  for (let now = 0; now < 184; now += 1000 / 60) samples.push(timeline.sample(now, 1 / 60));
  for (let now = 434; now < 1000; now += 1000 / 60) samples.push(timeline.sample(now, 1 / 60));
  assert.ok(samples.some(s => within(s, DUEL_ATTACKS['training:fists'].ATTACK_1.windows[0])));
  assert.equal(timeline.pending, false); assert.equal(timeline.overflowed, false);
});

test('a coalesced packet burst cannot compress the short armed finisher out of existence', () => {
  const timeline = new CombatTimeline(), window = DUEL_ATTACKS['kavach:khanda'].ATTACK_3.windows[0];
  for (let tick = 0; tick < 60; tick += 2) timeline.receive(pose(tick, tick, 'ATTACK_3'), 100);
  timeline.receive(pose(60, 60, 'IDLE', 0), 100);
  let eligible = 0;
  for (let now = 100; now < 1800; now += 1000 / 60) if (within(timeline.sample(now, 1 / 60), window)) eligible++;
  assert.ok(eligible > 0); assert.equal(timeline.pending, false);
});

test('an early reliable cancellation does not fabricate the rest of the attack', () => {
  const timeline = new CombatTimeline(); timeline.receive(pose(0, 0), 0);
  timeline.receive(pose(1, 6, 'STAGGER', 0), 100);
  for (let now = 0; now < 700; now += 1000 / 60)
    assert.equal(within(timeline.sample(now, 1 / 60), DUEL_ATTACKS['training:fists'].ATTACK_1.windows[0]), false);
  assert.equal(timeline.completed.state, 'STAGGER');
});

test('attack playback has no accumulated idle delay between exchanges', () => {
  const timeline = new CombatTimeline(); timeline.receive(pose(0, 0), 0);
  timeline.receive(pose(1, 30, 'IDLE', 0), 500);
  for (let now = 0; now < 1000; now += 1000 / 60) timeline.sample(now, 1 / 60);
  timeline.receive({ ...pose(2, 600), swing: 2, time: 0 }, 10000);
  assert.equal(timeline.sample(9999, 1 / 60), null);
  assert.equal(timeline.sample(10000, 1 / 60).time, 0);
});

test('bounded history and excessive playback delay fail instead of silently skipping combat', () => {
  const queue = new CombatTimeline(); for (let tick = 0; tick < 257; tick++) queue.receive(pose(tick, tick), tick);
  assert.equal(queue.overflowed, true);
  const stale = new CombatTimeline(); stale.receive(pose(0, 0), 0); stale.sample(2100, 1 / 60);
  assert.equal(stale.overflowed, true); stale.reset(); assert.equal(stale.overflowed, false);
});

test('40/80/150 ms delay and severe jitter preserve reliable combat windows', () => {
  for (const delay of [20, 40, 75]) {
    let seed = 42, reliableDue = 0;
    const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
    const timeline = new CombatTimeline(), packets = [];
    for (let tick = 0; tick < 30; tick += 2) {
      reliableDue = Math.max(reliableDue, tick * 1000 / 60 + Math.max(0, delay + (rng() * 2 - 1) * 250));
      packets.push({ at: reliableDue, state: pose(tick, tick) });
    }
    packets.push({ at: Math.max(reliableDue, 500 + delay), state: pose(30, 30, 'IDLE', 0) });
    let cursor = 0, eligible = false;
    for (let now = 0; now < 2000; now += 1000 / 60) {
      while (cursor < packets.length && packets[cursor].at <= now) {
        const p = packets[cursor++]; timeline.receive(p.state, p.at);
      }
      const sample = timeline.sample(now - 100, 1 / 60);
      eligible = eligible || within(sample, DUEL_ATTACKS['training:fists'].ATTACK_1.windows[0]);
    }
    assert.equal(eligible, true); assert.equal(timeline.overflowed, false);
  }
});

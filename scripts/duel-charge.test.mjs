import test from 'node:test';
import assert from 'node:assert/strict';
import { ChargeLedger } from '../src/duel/ChargeLedger.ts';
import * as THREE from 'three';
import * as rules from '../src/duel/Rules.ts';
import { loadDuelModule } from './duel-test-runtime.mjs';

test('repeated stale snapshots do not refund a consumed charge or empower a fourth blow', () => {
  const ledger = new ChargeLedger(), state = { chargeId: 1, chargeSpent: 0, charged: 3 };
  for (let hit = 0; hit < 3; hit++) {
    assert.equal(ledger.remaining(state), 3 - hit); ledger.consume(state);
    for (let frame = 0; frame < 15; frame++) assert.equal(ledger.remaining(state), 2 - hit);
  }
  assert.equal(ledger.remaining(state), 0);
});

test('partial and complete owner acknowledgements do not double-spend', () => {
  const ledger = new ChargeLedger(), state = { chargeId: 1, chargeSpent: 0, charged: 3 };
  ledger.consume(state); ledger.consume(state);
  assert.equal(ledger.remaining({ ...state, chargeSpent: 1, charged: 2 }), 1);
  assert.equal(ledger.remaining({ ...state, chargeSpent: 2, charged: 1 }), 1);
  assert.equal(ledger.remaining(state), 1);
});

test('a fresh charge and a new round are independent of old unacknowledged contacts', () => {
  const ledger = new ChargeLedger(), state = { chargeId: 1, chargeSpent: 0, charged: 3 };
  ledger.consume(state); assert.equal(ledger.remaining({ ...state, chargeId: 2 }), 3);
  ledger.consume(state); assert.equal(ledger.remaining({ ...state, chargeId: 2 }), 3);
  ledger.reset(); assert.equal(ledger.remaining(state), 3);
});

test('an owner ignores late consumption from an earlier charge generation', async () => {
  const { DuelSession } = await loadDuelModule('src/duel/DuelSession.ts', {
    three: THREE, '../core/InputManager': { InputManager: {} }, '../entities/Player': { Player: class {} },
    '../entities/RemoteHero': { RemoteHero: class {} }, './Transport': { DuelTransport: class {} },
    '../physics/CharacterMotor': { separateFighters() {} }, '../debug/HeroBot': { HeroBot: class {}, SKILLS: {} },
    './NameTags': { DuelNameTags: class {}, readDuelName() {} }, './Rules': rules,
  }, { performance: { now: () => 0 } });
  const hero = { chargedHits: 3, spendCharge() { this.chargedHits--; }, hitWindows: () => [{}] };
  const session = Object.assign(Object.create(DuelSession.prototype), {
    engine: { player: hero, combatSystem: { stats: { damageDealt: 0 }, confirmHeroContact() {} } },
    transport: { round: 1, metrics: {} }, active: true, finished: false, chargeId: 2, chargeSpent: 0,
    opponent: { currentHealth: 100, currentMarma: 0 }, verdicts: new Set(), sentAt: new Map(), contacts: new Map(),
    sentStates: new Map([[1, { swing: 1, state: 'ATTACK_1', chargeId: 1 }], [2, { swing: 2, state: 'ATTACK_1', chargeId: 2 }]]),
  });
  const hit = { type: 'hit', round: 1, window: 0, charged: true, result: 'player-hit', health: 90, posture: 10, point: [0, 0, 0] };
  session.receive({ ...hit, swing: 1, seenSeq: 1 }); assert.equal(hero.chargedHits, 3);
  session.receive({ ...hit, swing: 2, seenSeq: 2 }); assert.equal(hero.chargedHits, 2);
  session.receive({ ...hit, swing: 2, seenSeq: 2 }); assert.equal(hero.chargedHits, 2);
});

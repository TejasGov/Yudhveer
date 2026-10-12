import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadDuelModule } from './duel-test-runtime.mjs';

const { HeroBot, SKILLS } = await loadDuelModule('src/debug/HeroBot.ts', {
  three: THREE, '../entities/Player': { Player: class {} },
  '../physics/CharacterMotor': { CharacterMotor: {} }, '../core/Settings': { Settings: {} },
});

test('Duel offence notices a threat after reaction delay; campaign selection stays unchanged', () => {
  for (const duel of [true, false]) {
    const presses = [];
    const player = { stateMachine: { currentState: 'IDLE' }, weapon: { reach: 2.6, blows: {} },
      currentMarma: 0, maxMarma: 100, chargedHits: 0, can: () => false, getPosition: () => new THREE.Vector3(), isDown: () => false };
    const target = { e: { stateMachine: { currentState: 'IDLE' } }, dist: 2, dir: new THREE.Vector3(0, 0, 1) };
    const bot = Object.assign(Object.create(HeroBot.prototype), { player, duel: duel ? { foe: target.e } : undefined,
      engine: { mode: 'play' }, skill: SKILLS.steady, input: { keys: {} }, now: 0, lastAttackPress: -9, lastBounce: -99,
      charging: false, noticeAt: new Map([['swing', 0.3]]), tap: a => presses.push(a), plan() {},
      enemyViews: () => [target], collectThreats: () => [{ group: 'swing', kind: 'melee', tContact: 0.2 }],
      act(threats, views) { this.fight(target, threats, views, 'IDLE', player.getPosition()); },
    });
    bot.step(1 / 60); assert.equal(presses.length, duel ? 1 : 0);
    presses.length = 0; bot.now = 0.3; bot.lastAttackPress = -9; bot.step(1 / 60);
    assert.equal(presses.length, 0);
  }
});

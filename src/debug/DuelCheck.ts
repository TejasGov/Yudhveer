import * as THREE from 'three';
import type { Engine } from '../core/Engine';

/**
 * Dev-only defence regression checks for the third melee case. They use two equipped heroes and the actual
 * CombatSystem resolver, not a second rules implementation. The tests include the boundary of the existing
 * 140 ms parry, guard chip and posture, the slide's invulnerable span, charged weapon data and a lethal blow.
 * The swept-blade and network scenarios are separate browser checks, described in docs/PVP.md.
 */
export async function checkDuelDefence(engine: Engine): Promise<Record<string, boolean>> {
  await engine.startDuel();
  const attacker = engine.duel!.opponent;
  const defender = engine.player!;
  const combat = engine.combatSystem;
  const point = new THREE.Vector3(0, 1, 0);
  const result: Record<string, boolean> = {};
  const reset = () => {
    engine.duel!.reset();
    combat.resetStats();
    attacker.setPosition(0, 0, -1);
    defender.setPosition(0, 0, 1);
    defender.faceYaw(Math.PI);
    attacker.stateMachine.changeState('ATTACK_1');
  };
  reset();
  defender.stateMachine.changeState('PARRY');
  defender.stateMachine.update(0.13);
  combat.resolveHeroHitOnHero(attacker, defender, point);
  result.parryAt130ms = defender.currentHealth === 100 && attacker.currentMarma === 50 && combat.log.at(-1)?.result === 'deflected';
  reset();
  defender.stateMachine.changeState('PARRY');
  defender.stateMachine.update(0.15);
  combat.resolveHeroHitOnHero(attacker, defender, point);
  const blow = attacker.weapon.blows.ATTACK_1!;
  result.expiredParryGuards = defender.currentHealth === 100 - blow.damage * 0.2 && defender.currentMarma === blow.posture * 1.25;
  reset();
  defender.stateMachine.changeState('BLOCK'); defender.faceYaw(0);
  combat.resolveHeroHitOnHero(attacker, defender, point);
  result.guardRearHit = defender.currentHealth === 100 - blow.damage;
  reset();
  defender.stateMachine.changeState('DODGE'); defender.stateMachine.stateTime = 0.3;
  combat.resolveHeroHitOnHero(attacker, defender, point);
  result.slideInvulnerable = defender.currentHealth === 100 && combat.log.at(-1)?.result === 'evaded';
  reset(); attacker.chargedHits = 3;
  combat.resolveHeroHitOnHero(attacker, defender, point);
  result.chargedBlow = Math.abs(defender.currentHealth - (100 - blow.damage * 1.6)) < 1e-6 && attacker.chargedHits === 2;
  reset(); defender.currentHealth = 1;
  combat.resolveHeroHitOnHero(attacker, defender, point);
  result.lethalStaysDead = defender.isDown() && defender.currentHealth === 0;
  reset(); defender.addMarmaDamage(100); defender.update(2.6);
  result.duelPostureRenews = defender.currentMarma === 0;
  engine.duel!.reset();
  if (Object.values(result).some(ok => !ok)) throw new Error('Duel defence regression: ' + JSON.stringify(result));
  return result;
}

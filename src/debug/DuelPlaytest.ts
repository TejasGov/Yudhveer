import type { Engine } from '../core/Engine';
import { HeroBot, SKILLS } from './HeroBot';
import { mulberry32, yieldNow } from './Playtest';
import { DUEL_ROUND_KITS, DUEL_ROUND_SECONDS } from '../duel/Rules';

/**
 * Dev-only bot-versus-bot yardstick. Measure each kit independently, including round three even if a normal
 * match would have ended 2-0. Both bots press the real buffered controls and the real swept hand/blade resolver
 * decides the blows. The local bot's seed is recorded; the opponent and effect randomness are not deterministic.
 * Hidden Browser panes use debugAdvance, never requestAnimationFrame. These samples cannot settle human feel.
 */
export async function measureDuelRounds(engine: Engine, runs = 3): Promise<unknown[]> {
  await engine.startDuel();
  engine.inputManager.exitPointerLock();
  const duel = engine.duel!;
  const finish = duel.onFinish;
  const results: unknown[] = [];
  duel.onFinish = null;
  try {
    for (let number = 1; number <= DUEL_ROUND_KITS.length; number++) {
      for (let run = 1; run <= runs; run++) {
        duel.finished = false; duel.score = number === 3 ? [1, 1] : [0, 0]; duel.rounds.length = 0;
        duel.reset(number); duel.beginPractice();
        const bot = new HeroBot(engine, SKILLS.steady, mulberry32(run * 31337 + number), {
          hero: engine.player!, foe: duel.opponent, input: engine.inputManager, camera: engine.sceneManager,
        });
        try {
          for (let n = 0; !duel.rounds.length && n < (DUEL_ROUND_SECONDS + 5) * 60; n++) {
            if (duel.active) bot.step(1 / 60);
            engine.debugAdvance(1 / 60);
            if (n % 120 === 0) await yieldNow();
          }
          results.push({ run, ...duel.rounds[0], stalled: !duel.rounds.length });
        } finally { bot.release(); }
      }
    }
  } finally {
    duel.onFinish = finish; duel.finished = false; duel.score = [0, 0]; duel.rounds.length = 0;
    duel.reset(1); duel.beginPractice();
  }
  return results;
}

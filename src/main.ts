import './style.css';
import { Engine } from './core/Engine';
import { BloodFX, type GoreLevel } from './combat/BloodFX';
import { SoundFX, VICTORY_STINGER, type VictoryGrade, type VictoryStinger } from './combat/SoundFX';

window.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('game-container');
  if (!container) {
    console.error('Failed to find #game-container element');
    return;
  }

  const engine = new Engine();
  // Dev-only console handle: `__yudhveer.levelManager.activeLevel`, `__yudhveer.sceneManager.renderer.info`, ...
  if (import.meta.env.DEV) {
    (window as unknown as { __yudhveer: Engine }).__yudhveer = engine;
    // Combat test hooks: step the simulation deterministically, read the hit log, show the overlay.
    (window as unknown as { __debug: unknown }).__debug = {
      step: (frames: number, each?: (frame: number) => void) => engine.debugStep(frames, each),
      log: () => engine.combatSystem.log,
      overlay: (on?: boolean) => engine.combatDebug.toggle(on),
      // Cutscene tuning: start a chapter, then freeze its intro on a shot.
      chapter: (id: number, intro = true) => engine.startChapter(id, { intro }),
      shot: (index: number, time: number) => engine.debugShot(index, time),
      advance: (seconds: number) => engine.debugAdvance(seconds),
      resume: () => engine.debugResume(),
      // Story scenes: win the chapter's fight now, to see its ending.
      win: () => engine.debugWin(),
      // The victory sound: play it now, or render it offline and report its level and spectrum (`'chime'` is the
      // old one, for comparison).
      // Blood (prototype, off by default): `blood(true)` for Full, `blood('low')`, `blood(false)` for off.
      blood: (on: boolean | GoreLevel = true) => {
        BloodFX.getInstance().level = on === true ? 'full' : on === false ? 'off' : on;
        return BloodFX.getInstance().level;
      },
      victory: (grade?: VictoryGrade, stinger?: VictoryStinger) => SoundFX.getInstance().playLevelClear(grade, stinger),
      renderVictory: async (grade: VictoryGrade = 'boss', stinger: VictoryStinger | 'chime' = VICTORY_STINGER, compress = true) => {
        const { analyseSound } = await import('./combat/AudioDebug');
        const buffer = await SoundFX.getInstance().renderOffline((fx) => {
          if (stinger !== 'chime') fx.playLevelClear(grade, stinger);
          else {
            const tone = (fx as unknown as { tone(s: object): void }).tone.bind(fx);
            [261.6, 329.6, 392, 523.3].forEach((f, i) => tone({ type: 'sine', freq: f, gain: 0.2, duration: 2.4, delay: i * 0.14, wet: 0.4 }));
          }
        }, 12, compress);
        return { ...analyseSound(buffer), ring: analyseSound(buffer, 3, 1) };
      },
    };
  }
  try {
    await engine.init(container);
  } catch (err) {
    console.error('[Yudhveer] Failed to start', err);
  }
});

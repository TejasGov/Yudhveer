import './style.css';
import { Engine } from './core/Engine';

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
    };
  }
  try {
    await engine.init(container);
  } catch (err) {
    console.error('[Yudhveer] Failed to start', err);
  }
});

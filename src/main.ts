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
  if (import.meta.env.DEV) (window as unknown as { __yudhveer: Engine }).__yudhveer = engine;
  await engine.init(container);
});

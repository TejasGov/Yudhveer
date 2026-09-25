import './style.css';
import { Engine } from './core/Engine';

window.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('game-container');
  if (!container) {
    console.error('Failed to find #game-container element');
    return;
  }

  const engine = new Engine();
  await engine.init(container);
});

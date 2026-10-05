import './style.css';
import { Engine } from './core/Engine';
import * as THREE from 'three';
import { BloodFX, type BloodKind, type GoreLevel } from './combat/BloodFX';
import { Level3_Dwarka } from './levels/Level3_Dwarka';
import { BossShalva } from './entities/BossShalva';
import { SoundFX, VICTORY_STINGER, type VictoryGrade, type VictoryStinger } from './combat/SoundFX';
import { JitterProbe, type ProbeOptions } from './debug/JitterProbe';
import { IMPACTS, type ImpactKind } from './core/ImpactCamera';

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
    const probe = new JitterProbe(engine);
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
      // Blood, overriding the Gore setting for this session: `blood(true)` for Full, `blood('low')`, `blood(false)` for
      // off, `blood(null)` back to the setting.
      blood: (on: boolean | GoreLevel | null = true) => {
        BloodFX.getInstance().level = on === true ? 'full' : on === false ? 'off' : on;
        return { level: BloodFX.getInstance().level, ...BloodFX.getInstance().counts };
      },
      // A blow's blood at a point (x, y, z), flung along (dx, dz), as if from a victim standing at height `feet`.
      bleed: (x: number, y: number, z: number, opts: { dx?: number; dz?: number; damage?: number; kind?: BloodKind; feet?: number; kill?: boolean } = {}) => {
        const { dx = 0, dz = 1, damage = 30, kind = 'red', feet = y - 1.2, kill = false } = opts;
        BloodFX.getInstance().spill(new THREE.Vector3(x, y, z), new THREE.Vector3(dx, 0, dz), damage, kind, feet, kill, { scripted: true });
        return BloodFX.getInstance().counts;
      },
      // Shalva's dive (Dwarka): `shalvaDive()` sends him under now, whatever his cooldown.
      shalvaDive: () => engine.enemies.some((e) => e instanceof BossShalva && e.debugDive()),
      // Dwarka's rain: `rain('low')` thins it to a third, `rain(false)` stops it (the stone stays wet), `rain()` full.
      rain: (level: boolean | 'low' = true) => {
        const rain = level === true ? 'full' : level === false ? 'off' : level;
        Level3_Dwarka.rainLevel = rain;
        const active = engine.levelManager.activeLevel;
        if (active instanceof Level3_Dwarka) active.setRain(rain);
        return rain;
      },
      // Dwarka's sea: `tide({ level: 0.4 })` holds the tide there (metres from mean sea level; `level: null` lets it
      // run), `speed` scales the tide's pace, `swell` the swells' size (0: flat), `quality` the grid ('full', 'low',
      // 'flat'). `tide()` reports the sea's state.
      tide: (opts: Parameters<Level3_Dwarka['debugTide']>[0] = {}) => {
        if (opts.quality) Level3_Dwarka.seaQuality = opts.quality;
        const active = engine.levelManager.activeLevel;
        return active instanceof Level3_Dwarka ? active.debugTide(opts) : null;
      },
      // The jitter probe (docs/proposals/JITTER.md): `jitter({ seconds, mode, hero })` measures the fight as it stands;
      // `jitterScenario('S1')` loads a scripted scenario first (`jitterScenario()` lists them).
      jitter: (options?: ProbeOptions) => probe.run(options),
      jitterScenario: (name?: string, options?: ProbeOptions) => (name ? probe.scenario(name, options) : JitterProbe.scenarios()),
      // The impact camera (docs/proposals/IMPACT_CAMERA.md): `impact('deflect', { dirX: 0, dirZ: -1 })` fires an event of
      // the table (its hit-stop, camera and rumble) along a world direction; `impactTune` is the live table (edit, then
      // copy the numbers back into ImpactCamera.ts); `freeze(90)` is a bare hit-stop.
      impact: (kind: ImpactKind, opts: { dirX?: number; dirZ?: number; scale?: number } = {}) => {
        const dir = opts.dirX !== undefined || opts.dirZ !== undefined ? new THREE.Vector3(opts.dirX ?? 0, 0, opts.dirZ ?? 0) : undefined;
        engine.combatSystem.impact(kind, dir, opts.scale ?? 1);
        return { ...engine.sceneManager.impact.offset };
      },
      impactTune: IMPACTS,
      freeze: (ms: number) => engine.combatSystem.freeze(ms),
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

import * as THREE from 'three';
import type { Engine } from '../core/Engine';
import { Character } from '../entities/Character';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { CharacterRig } from '../entities/animation/CharacterRig';
import { CombatSystem } from '../combat/CombatSystem';
import { chapterById } from '../game/Chapters';
import { HeroBot, SKILLS } from './HeroBot';
import { mulberry32, yieldNow } from './Playtest';

/*
 * The performance probe (docs/STORY.md, "Milestone 12"): frame time, draw calls and triangles of each level in play and in
 * its cutscenes, with where the CPU time goes. Dev builds only, through `__debug.perf(...)`.
 *
 * A frame here is the engine's real one (`gameLoop`: fixed steps, interpolation, the level, the HUD, the render and its
 * post chain), called by hand with a clock that moves 1/60 s a frame, so it works with the Browser pane hidden (no
 * requestAnimationFrame). Its CPU time is the time of that call; its GPU time is a timer query round it
 * (EXT_disjoint_timer_query_webgl2), when the browser has one. The hero is played by the bot, so a fight is a real one.
 */

interface LoopHandle {
  gameLoop(time: number): void;
  lastTime: number;
  isRunning: boolean;
  paused: boolean;
  mode: string;
  outcome: string | null;
  seenScenes: Set<string>;
  hud: { update(...args: unknown[]): void };
  particleFX: { update(dt: number): void };
  levelManager: { update(...args: unknown[]): void };
}
const loop = (e: Engine) => e as unknown as LoopHandle;

const FRAME_MS = 1000 / 60;

interface Timer {
  ext: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
  gl: WebGL2RenderingContext;
}

function gpuTimer(engine: Engine): Timer {
  const gl = engine.sceneManager.renderer.getContext() as WebGL2RenderingContext;
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as Timer['ext'];
  return { gl, ext };
}

/** One sample of a frame. */
export interface Frame {
  cpu: number;
  gpu: number | null;
  calls: number;
  triangles: number;
  points: number;
  lines: number;
}

export interface Stat {
  mean: number;
  p50: number;
  p95: number;
  max: number;
}

function stat(xs: number[]): Stat {
  if (!xs.length) return { mean: 0, p50: 0, p95: 0, max: 0 };
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))];
  const r = (n: number) => Math.round(n * 100) / 100;
  return { mean: r(xs.reduce((a, b) => a + b, 0) / xs.length), p50: r(q(0.5)), p95: r(q(0.95)), max: r(s[s.length - 1]) };
}

export interface PerfReport {
  chapter: number;
  name: string;
  view: string;
  frames: number;
  size: [number, number];
  cpu: Stat;
  gpu: Stat | null;
  calls: Stat;
  triangles: Stat;
  /** Mean milliseconds per frame by phase (they overlap: `loop` contains the rest, `render` the shadow pass...). */
  phases: Record<string, number>;
  /** Kilobytes of JS heap allocated per frame in all, and by phase (where the browser reports the heap). */
  allocKB: number;
  allocByPhase: Record<string, number>;
  /** Scene and GPU memory counts. */
  scene: { nodes: number; meshes: number; skinned: number; visibleMeshes: number; lights: number; shadowLights: number; shadowMap: number; geometries: number; textures: number; programs: number };
  /** Frames over 20 ms of CPU (a visible hitch), and what they were (when the frame is tagged). */
  hitches: { frame: number; cpu: number; note: string }[];
}

type Patch = { obj: Record<string, unknown>; key: string; original: unknown; own: boolean };

/** The JS heap in use now (bytes), where the browser says (Chromium's `performance.memory`). */
const heap = (): number => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0;

/** Times calls to `obj[key]` under `label` for the length of a measurement; undone by `restore`. */
class Phases {
  private readonly patches: Patch[] = [];
  private readonly total = new Map<string, number>();
  /** Bytes each phase allocated (the heap's growth across its calls: a collection inside one only ever shows as less). */
  private readonly bytes = new Map<string, number>();

  public wrap(obj: object, key: string, label: string): void {
    const target = obj as Record<string, unknown>;
    const original = target[key];
    if (typeof original !== 'function') return;
    this.patches.push({ obj: target, key, original, own: Object.prototype.hasOwnProperty.call(target, key) });
    const fn = original as (...args: unknown[]) => unknown;
    target[key] = (...args: unknown[]) => {
      const h0 = heap();
      const t0 = performance.now();
      try {
        return fn.apply(target, args);
      } finally {
        this.add(label, performance.now() - t0, heap() - h0);
      }
    };
  }

  /** Like `wrap` for a method on a class's prototype (called on any instance). */
  public wrapProto(proto: object, key: string, label: string): void {
    const target = proto as Record<string, unknown>;
    const original = target[key];
    if (typeof original !== 'function') return;
    this.patches.push({ obj: target, key, original, own: true });
    const fn = original as (...args: unknown[]) => unknown;
    const self = this;
    target[key] = function (this: unknown, ...args: unknown[]) {
      const h0 = heap();
      const t0 = performance.now();
      try {
        return fn.apply(this, args);
      } finally {
        self.add(label, performance.now() - t0, heap() - h0);
      }
    };
  }

  public add(label: string, ms: number, bytes = 0): void {
    this.total.set(label, (this.total.get(label) ?? 0) + ms);
    if (bytes > 0) this.bytes.set(label, (this.bytes.get(label) ?? 0) + bytes);
  }

  public reset(): void {
    this.total.clear();
    this.bytes.clear();
  }

  /** Kilobytes allocated per frame by each phase (the nested ones count inside the ones that call them). */
  public kilobytes(frames: number): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of [...this.bytes.entries()].sort((a, b) => b[1] - a[1])) out[k] = Math.round((v / frames / 1024) * 100) / 100;
    return out;
  }

  public means(frames: number): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of [...this.total.entries()].sort((a, b) => b[1] - a[1])) out[k] = Math.round((v / frames) * 1000) / 1000;
    return out;
  }

  public restore(): void {
    for (const p of this.patches.reverse()) {
      if (p.own) p.obj[p.key] = p.original;
      else delete p.obj[p.key];
    }
    this.patches.length = 0;
  }
}

/** The scene's size, as the renderer sees it. */
function sceneCensus(engine: Engine): PerfReport['scene'] {
  const sm = engine.sceneManager;
  let nodes = 0;
  let meshes = 0;
  let skinned = 0;
  let visible = 0;
  let lights = 0;
  let shadowLights = 0;
  sm.scene.traverse((o) => {
    nodes++;
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      meshes++;
      if ((m as THREE.SkinnedMesh).isSkinnedMesh) skinned++;
      let vis = m.visible;
      for (let p = m.parent; vis && p; p = p.parent) vis = p.visible;
      if (vis) visible++;
    }
    const l = o as THREE.Light;
    if (l.isLight) {
      lights++;
      if (l.castShadow) shadowLights++;
    }
  });
  const info = sm.renderer.info;
  return {
    nodes, meshes, skinned, visibleMeshes: visible, lights, shadowLights, shadowMap: sm.dirLight.shadow.mapSize.width,
    geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs?.length ?? 0,
  };
}

/** Runs `frames` frames by calling the engine's own loop; `before` runs ahead of each (the bot's decision). */
async function runFrames(
  engine: Engine, frames: number, before: (i: number) => void | Promise<void>, note: (i: number) => string = () => '',
  options: { skip?: number; stopWhen?: () => boolean } = {},
): Promise<{ samples: Frame[]; hitches: PerfReport['hitches']; phases: Record<string, number>; allocKB: number; allocByPhase: Record<string, number> }> {
  const h = loop(engine);
  const sm = engine.sceneManager;
  const renderer = sm.renderer;
  const { gl, ext } = gpuTimer(engine);
  const samples: Frame[] = [];
  const queries: (WebGLQuery | null)[] = [];
  const hitches: PerfReport['hitches'] = [];
  // What a frame added to the GPU's side (programs compiled, geometries and textures uploaded): a hitch's cause.
  const gpuCounts = () => [renderer.info.programs?.length ?? 0, renderer.info.memory.geometries, renderer.info.memory.textures];
  let lastCounts = gpuCounts();
  const realRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  const autoReset = renderer.info.autoReset;
  renderer.info.autoReset = false;
  const ph = new Phases();
  // The pieces of the frame, by what they cost.
  ph.wrap(sm.scene, 'updateMatrixWorld', 'scene.updateMatrixWorld');
  ph.wrap(renderer, 'render', 'renderer.render (calls)');
  ph.wrap(renderer.shadowMap, 'render', 'shadow pass');
  ph.wrap(sm.postFX, 'render', 'post chain');
  ph.wrap(engine.sceneManager, 'render', 'render');
  ph.wrap(engine as unknown as object, 'fixedUpdate', 'fixedUpdate');
  ph.wrap(engine as unknown as object, 'updateCamera', 'updateCamera');
  ph.wrap(engine as unknown as object, 'updateFlow', 'updateFlow');
  ph.wrap(engine as unknown as object, 'applyInterpolation', 'applyInterpolation');
  ph.wrap(engine as unknown as object, 'captureTransforms', 'captureTransforms');
  ph.wrap(engine as unknown as object, 'restoreSimulationState', 'restoreSimulationState');
  ph.wrap(h.hud, 'update', 'hud.update');
  ph.wrap(h.particleFX, 'update', 'particleFX.update');
  ph.wrap(h.levelManager, 'update', 'level.update');
  ph.wrap(engine.physicsWorld, 'step', 'physics.step');
  ph.wrap(engine.combatSystem, 'update', 'combat.update');
  ph.wrap(engine.projectileManager, 'update', 'projectiles.update');
  ph.wrapProto(Enemy.prototype, 'updateAI', 'enemy.updateAI');
  ph.wrapProto(Character.prototype, 'update', 'character.update (+rig)');
  ph.wrapProto(CharacterRig.prototype, 'update', 'rig.update');
  ph.wrapProto(CombatSystem.prototype, 'update', 'combat.update');
  ph.wrapProto(Boss.prototype, 'updateAI', 'boss.updateAI');
  let time = performance.now();
  h.lastTime = time;
  h.isRunning = true;
  // Bytes allocated across the frames themselves: the heap's growth from one call's end to the next call's end, less what a
  // collection took back (which only shows as a fall: those frames count what they allocated after it).
  let allocated = 0;
  let heapAt = heap();
  try {
    for (let i = 0; i < frames; i++) {
      await before(i);
      time += FRAME_MS;
      renderer.info.reset();
      let q: WebGLQuery | null = null;
      if (ext) {
        q = gl.createQuery();
        gl.beginQuery(ext.TIME_ELAPSED_EXT, q!);
      }
      const heapBefore = heap();
      const t0 = performance.now();
      h.gameLoop(time);
      const cpu = performance.now() - t0;
      const grown = heap() - heapBefore;
      if (grown > 0 && i >= (options.skip ?? 0)) allocated += grown;
      heapAt = heap();
      if (q) gl.endQuery(ext!.TIME_ELAPSED_EXT);
      queries.push(q);
      const info = renderer.info.render;
      const counts = gpuCounts();
      const added = counts.map((c, k) => c - lastCounts[k]);
      lastCounts = counts;
      if (i >= (options.skip ?? 0)) {
        samples.push({ cpu, gpu: null, calls: info.calls, triangles: info.triangles, points: info.points, lines: info.lines });
        if (cpu > 20) {
          const gained = [added[0] > 0 ? `+${added[0]} programs` : '', added[1] > 0 ? `+${added[1]} geometries` : '', added[2] > 0 ? `+${added[2]} textures` : ''].filter(Boolean).join(' ');
          hitches.push({ frame: i, cpu: Math.round(cpu * 10) / 10, note: [note(i), gained].filter(Boolean).join('; ') });
        }
      }
      if (i % 30 === 29) await yieldNow();
      if (options.stopWhen?.()) break;
    }
  } finally {
    window.requestAnimationFrame = realRaf;
    renderer.info.autoReset = autoReset;
    ph.restore();
  }
  // The GPU's side: each query is read once it is ready (give the driver a few breaths).
  if (ext) {
    for (let tries = 0; tries < 40; tries++) {
      if (queries.every((q) => !q || gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))) break;
      await yieldNow();
    }
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
    const skip = options.skip ?? 0;
    queries.forEach((q, i) => {
      if (!q || i < skip || !samples[i - skip]) return;
      if (!disjoint && gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) samples[i - skip].gpu = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
      gl.deleteQuery(q);
    });
  }
  const counted = Math.max(1, samples.length + (options.skip ?? 0));
  void heapAt;
  return { samples, hitches, phases: ph.means(counted), allocKB: Math.round((allocated / Math.max(1, samples.length) / 1024) * 10) / 10, allocByPhase: ph.kilobytes(counted) };
}

function report(
  engine: Engine, chapter: number, view: string,
  frames: { samples: Frame[]; hitches: PerfReport['hitches']; phases: Record<string, number>; allocKB?: number; allocByPhase?: Record<string, number> },
): PerfReport {
  const { samples } = frames;
  const gpu = samples.map((s) => s.gpu).filter((g): g is number => g !== null);
  const canvas = engine.sceneManager.renderer.domElement;
  return {
    chapter, name: chapterById(chapter).name, view, frames: samples.length, size: [canvas.width, canvas.height],
    cpu: stat(samples.map((s) => s.cpu)), gpu: gpu.length ? stat(gpu) : null,
    calls: stat(samples.map((s) => s.calls)), triangles: stat(samples.map((s) => s.triangles)),
    phases: frames.phases, allocKB: frames.allocKB ?? 0, allocByPhase: frames.allocByPhase ?? {}, scene: sceneCensus(engine), hitches: frames.hitches.slice(0, 12),
  };
}

export interface PerfOptions {
  /** Frames to skip first (shader compiles and the first draws are not what is being measured). */
  warmup?: number;
  /** Seconds of the fight to play (default: the whole of it, to its end or the cap). */
  seconds?: number;
  seed?: number;
}

/**
 * A chapter's fight, played by the bot, frame by frame through the real loop. Reports the frames after the warm-up.
 * Starts with the intro skipped and the bosses settled, as the playtest does.
 */
export async function perfFight(engine: Engine, chapterId: number, options: PerfOptions = {}): Promise<PerfReport> {
  const I = loop(engine);
  const seed = options.seed ?? 1;
  const realRandom = Math.random;
  Math.random = mulberry32(seed * 7919 + chapterId);
  try {
    I.seenScenes.clear();
    await engine.startChapter(chapterId, { intro: false });
    engine.debugStep(0);
    for (const e of engine.enemies) if (e instanceof Boss) e.settleIntro();
    const bot = new HeroBot(engine, SKILLS.steady, mulberry32(seed * 31337 + chapterId));
    const frames = Math.round((options.seconds ?? 240) * 60);
    const spawned = new Set(engine.enemies.map((e) => e.id));
    let lastMode = I.mode;
    const run = await runFrames(engine, frames, (i) => {
      bot.step(1 / 60);
      void i;
    }, () => {
      // What was happening when a frame hitched: a new foe, a scene starting or ending.
      const notes: string[] = [];
      for (const e of engine.enemies) if (!spawned.has(e.id)) {
        spawned.add(e.id);
        notes.push(`new ${e.id}`);
      }
      if (I.mode !== lastMode) {
        notes.push(`${lastMode} -> ${I.mode}`);
        lastMode = I.mode;
      }
      return notes.join(', ');
    }, { skip: options.warmup ?? 120, stopWhen: () => I.outcome !== null || engine.player!.isDown() });
    bot.release();
    return report(engine, chapterId, 'fight (bot, steady)', run);
  } finally {
    Math.random = realRandom;
  }
}

/**
 * A chapter's cutscenes through the real loop: its intro and opening as the player sees them, then (the fight won at
 * once, `debugWin`) every scene to its ending, whatever stands between (a boss's fall, another arriving). Every `every`
 * seconds of a scene `burst` frames are measured and the time between is stepped. `heaviest` names the costliest
 * frames (by GPU time, else CPU) and when in which part they came.
 */
export async function perfScenes(engine: Engine, chapterId: number, options: { every?: number; burst?: number; endings?: boolean; maxSeconds?: number } = {}):
  Promise<{ intro: PerfReport; ending?: PerfReport; heaviest: { part: string; at: number; cpu: number; gpu: number | null; calls: number; triangles: number }[] }> {
  const I = loop(engine);
  const every = options.every ?? 2;
  const burst = options.burst ?? 6;
  const cap = options.maxSeconds ?? 400;
  const realRandom = Math.random;
  Math.random = mulberry32(chapterId + 99);
  const all: { part: string; at: number; frame: Frame }[] = [];
  const parts: Record<string, { samples: Frame[]; hitches: PerfReport['hitches']; phases: Record<string, number>; allocKB?: number; allocByPhase?: Record<string, number> }> = {
    intro: { samples: [], hitches: [], phases: {} }, ending: { samples: [], hitches: [], phases: {} },
  };
  try {
    I.seenScenes.clear();
    await engine.startChapter(chapterId, { intro: true });
    I.isRunning = false; // (`debugStep(0)` would cut the intro short: it puts the game in play)
    let part: 'intro' | 'ending' = 'intro';
    let t = 0;
    let fightSeen = false;
    let guard = 0;
    while (t < cap && guard++ < 8000) {
      const mode = I.mode;
      if (mode === 'intro') {
        I.paused = false;
        // (A burst whose timer queries were all voided by a disjoint event — the GPU's clock reset by something else using
        // it — is taken again, up to twice.)
        let run = await runFrames(engine, burst, () => undefined, () => '', { skip: 1 });
        for (let again = 0; again < 2 && run.samples.length && run.samples.every((s) => s.gpu === null); again++) {
          run = await runFrames(engine, burst, () => undefined, () => '', { skip: 1 });
        }
        const bucket = parts[part];
        run.samples.forEach((s) => all.push({ part, at: Math.round(t * 10) / 10, frame: s }));
        bucket.samples.push(...run.samples);
        bucket.hitches.push(...run.hitches.map((hh) => ({ ...hh, note: `${part} ${t.toFixed(0)} s` })));
        bucket.phases = run.phases;
        bucket.allocKB = run.allocKB;
        bucket.allocByPhase = run.allocByPhase;
        engine.debugAdvance(Math.max(0.05, every - burst / 60));
        t += every;
      } else if (mode === 'play' || mode === 'handoff') {
        // The opening is over: the fight, won at once (if the ending is wanted), whatever scenes follow.
        if (options.endings === false) break;
        if (!fightSeen) {
          fightSeen = true;
          part = 'ending';
        }
        engine.debugWin();
        engine.debugAdvance(0.25);
        t += 0.25;
      } else if (mode === 'outro') {
        engine.debugAdvance(0.25);
        t += 0.25;
      } else if (mode === 'loading') {
        await yieldNow();
      } else break; // over: the chapter's outcome screen
    }
    return {
      intro: report(engine, chapterId, 'intro + opening', parts.intro),
      ending: parts.ending.samples.length ? report(engine, chapterId, 'scenes after the fight', parts.ending) : undefined,
      heaviest: all.sort((a, b) => (b.frame.gpu ?? b.frame.cpu) - (a.frame.gpu ?? a.frame.cpu)).slice(0, 5)
        .map((x) => ({ part: x.part, at: x.at, cpu: Math.round(x.frame.cpu * 100) / 100, gpu: x.frame.gpu === null ? null : Math.round(x.frame.gpu * 100) / 100, calls: x.frame.calls, triangles: x.frame.triangles })),
    };
  } finally {
    Math.random = realRandom;
  }
}

/**
 * One picture of a cutscene, held still and drawn `frames` times: what that shot costs to draw, and with `change` what it
 * costs with something different (the shadows off, a smaller pixel ratio...; `change` returns what undoes it). The cutscene
 * is played (stepped) to `at` seconds into its `part` (the intro and opening, or the scenes after the fight, won at once),
 * then the game is held and only the picture is drawn: the same shot every frame, so two runs differ only by the change.
 */
export async function perfShot(
  engine: Engine, chapterId: number, at: number,
  options: { part?: 'intro' | 'ending'; frames?: number; change?: (engine: Engine) => (() => void) | void } = {},
): Promise<PerfReport> {
  const I = loop(engine);
  const realRandom = Math.random;
  Math.random = mulberry32(chapterId + 99);
  try {
    I.seenScenes.clear();
    await engine.startChapter(chapterId, { intro: true });
    I.isRunning = false;
    let t = 0;
    let part: 'intro' | 'ending' = 'intro';
    let guard = 0;
    // Step to the moment: through the intro, and (the ending wanted) through the fight won at once.
    while (guard++ < 4000) {
      if (I.mode === 'loading') {
        await yieldNow();
        continue;
      }
      if (part === 'intro' && options.part === 'ending' && (I.mode === 'play' || I.mode === 'handoff')) {
        part = 'ending';
        t = 0;
      }
      if (part === 'ending' && (I.mode === 'play' || I.mode === 'handoff')) engine.debugWin();
      if (t >= at && (part === (options.part ?? 'intro')) && (I.mode === 'intro')) break;
      engine.debugAdvance(0.25);
      if (part === (options.part ?? 'intro')) t += 0.25;
      if (I.mode === 'over') break;
    }
    I.paused = true;
    const undo = options.change?.(engine);
    try {
      const run = await runFrames(engine, options.frames ?? 90, () => undefined, () => '', { skip: 30 });
      return report(engine, chapterId, `shot ${options.part ?? 'intro'} ${at} s`, run);
    } finally {
      undo?.();
    }
  } finally {
    Math.random = realRandom;
  }
}

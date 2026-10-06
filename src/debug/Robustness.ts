import * as THREE from 'three';
import type { Engine } from '../core/Engine';
import { CHAPTERS, chapterById } from '../game/Chapters';
import { SceneManager } from '../core/SceneManager';
import { HeroBot, SKILLS } from './HeroBot';
import { hookConsole } from './Flow';
import { mulberry32, yieldNow } from './Playtest';

/*
 * The robustness checks (docs/STORY.md, "Milestone 12"): what a player can do to the game that the happy path never does,
 * done on purpose and checked for a crash, a console error or a state the game cannot leave. Dev builds only, through
 * `__debug.robustness()`. Everything is driven the way the menus and the browser drive it (the real buttons, the real
 * `blur` and `resize` events, the real frame loop on a clock of the check's own), so it runs with the Browser pane hidden.
 *
 *   quit      to the title from every point of every chapter (the intro, the opening scene, the fight, a boss's entrance,
 *             the ending scene, the defeat and chapter-complete screens), then straight into another chapter: no
 *             enemy, rig or loading screen left behind, and the next fight plays.
 *   retry     the Retry button and the pause menu's Restart pressed again and again: one fight, once, with the foes
 *             there should be, nothing from the loads that were replaced, the loading screen gone.
 *   pause     pausing in a cutscene and in the fight (the menu, the browser losing focus), and resuming: nothing moves
 *             while the menu is up, everything carries on after, and the cutscene still ends in the fight.
 *   rate      the real loop at 30, 60, 144 and 240 frames a second, with uneven frames and a stalled one: game time keeps
 *             pace with the clock, nothing goes NaN, nothing is thrown through the floor.
 *   resize    the window made tiny, empty, enormous, very wide and very tall, in a fight and in a cutscene: the camera
 *             and the render targets stay valid and the GPU raises no error.
 *   menus     New game, Chapters, Settings, Controls, Pause, Quit to title, one after the other.
 */

const FIXED_DT = 1 / 60;
/** Wall-clock seconds a wait for something asynchronous (a chapter loading) may take. */
const LOAD_WAIT = 90;

interface Inner {
  mode: string;
  paused: boolean;
  outcome: 'defeat' | 'victory' | null;
  loadToken: number;
  fightTime: number;
  modeTime: number;
  sceneRun: unknown;
  finale: { boss: unknown } | null;
  chapter: { id: number; level: number } | null;
  screens: { top?: string; empty: boolean };
  isRunning: boolean;
  lastTime: number;
  seenScenes: Set<string>;
  gameLoop(time: number): void;
  onMenu(action: string): void;
}
const inner = (e: Engine) => e as unknown as Inner;

const $ = (selector: string) => document.querySelector<HTMLElement>(selector);
const visible = (selector: string): boolean => {
  const el = $(selector);
  return !!el && !el.hidden && getComputedStyle(el).display !== 'none';
};
const click = (selector: string): boolean => {
  const el = $(selector) as HTMLButtonElement | null;
  if (!el || el.disabled) return false;
  el.click();
  return true;
};

export interface RobustnessCase {
  name: string;
  ok: boolean;
  notes: string[];
  failures: string[];
  seconds: number;
}

export interface RobustnessReport {
  ok: boolean;
  cases: RobustnessCase[];
  errors: string[];
  warnings: string[];
  wallSeconds: number;
}

export interface RobustnessOptions {
  /** Which checks to run ('quit', 'retry', 'pause', 'rate', 'resize', 'menus'); all by default. */
  only?: string[];
  /** Which chapters the per-chapter checks visit (all by default). */
  chapters?: number[];
}

/** The world as the renderer holds it: what a leak would grow. */
interface Census {
  skinned: number;
  meshes: number;
  geometries: number;
  textures: number;
  enemies: number;
  cast: number;
  loading: boolean;
}

/** One check's working space: the engine, what it did, what went wrong. */
class Run {
  public readonly notes: string[] = [];
  public readonly failures: string[] = [];
  public readonly I: Inner;
  private bot: HeroBot | null = null;
  private seed = 1;

  constructor(public readonly engine: Engine) {
    this.I = inner(engine);
  }

  public note(message: string): void {
    this.notes.push(message);
  }

  public check(condition: unknown, message: string): boolean {
    if (!condition) this.failures.push(message);
    return !!condition;
  }

  /** The loop is ours to step (the real one is off), and not frozen by an earlier step. */
  public unfreeze(): void {
    this.I.isRunning = false;
    this.I.paused = false;
  }

  /** Waits (in wall time) for a chapter's load to be over. */
  public async loaded(): Promise<boolean> {
    const t0 = performance.now();
    while (this.I.mode === 'loading' && performance.now() - t0 < LOAD_WAIT * 1000) await yieldNow();
    return this.I.mode !== 'loading';
  }

  /** Starts a chapter the way the menus do (`intro`) or as a retry does, and waits for its load. */
  public async begin(id: number, intro: boolean): Promise<void> {
    this.release();
    // Every story scene plays (a scene already seen this session is only settled).
    this.I.seenScenes.clear();
    await this.engine.startChapter(id, { intro });
    this.I.isRunning = false;
    this.check(await this.loaded(), `chapter ${id} never finished loading`);
  }

  public release(): void {
    this.bot?.release();
    this.bot = null;
    this.engine.inputManager.keys.Space = false;
  }

  /** `seconds` of game on the fixed step, the bot at the controls (when `play`). */
  public async step(seconds: number, play = false): Promise<void> {
    const steps = Math.round(seconds / FIXED_DT);
    if (play && !this.bot && this.engine.player) this.bot = new HeroBot(this.engine, SKILLS.steady, mulberry32(this.seed++ * 31 + 7));
    for (let i = 0; i < steps; i++) {
      if (this.I.mode === 'loading') {
        await yieldNow();
        i--;
        continue;
      }
      if (play && this.I.mode === 'play') this.bot?.step(FIXED_DT);
      this.engine.debugAdvance(FIXED_DT);
      if (i % 90 === 89) await yieldNow();
    }
    // (`debugAdvance` leaves the game frozen, for a developer looking at it; here only a pause menu holds it.)
    this.I.paused = this.I.screens.top === 'pause';
  }

  /** Steps in `chunk`-second pieces until `until` holds (true) or `limit` seconds have gone by (false). */
  public async until(until: () => boolean, limit: number, chunk = 0.25, play = false): Promise<boolean> {
    for (let t = 0; t < limit; t += chunk) {
      if (until()) return true;
      await this.step(chunk, play);
    }
    return until();
  }

  /** Everyone but the final boss falls (so that he comes). */
  public fallAllButFinale(): void {
    const keep = this.I.finale?.boss;
    for (const e of this.engine.enemies) {
      if (e === keep) continue;
      e.currentHealth = 0;
      e.stateMachine.changeState('DEAD');
    }
  }

  /** The hero falls (a chapter he can lose). */
  public fell(): void {
    this.engine.player?.takeDamage(1e6);
  }

  /**
   * The real frame loop for `count` frames on a clock that moves `dt` seconds (or what `dt()` says) a frame; `each` runs
   * before each frame with the length it is about to have. Returns the seconds the loop took in (a frame over 0.25 s counts as 0.25).
   */
  public async frames(count: number, dt: number | (() => number), each?: (i: number, dt: number) => void, drawEvery = 1): Promise<number> {
    const I = this.I;
    const realRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
    // (A check of the loop's timing need not draw every frame: `drawEvery` keeps the picture honest at a tenth of the cost.)
    const sm = this.engine.sceneManager;
    const draw = SceneManager.prototype.render.bind(sm);
    let n = 0;
    if (drawEvery > 1) sm.render = (dtRender: number) => { if (n++ % drawEvery === 0) draw(dtRender); };
    let t = performance.now();
    let clock = 0;
    I.lastTime = t;
    I.isRunning = true;
    try {
      for (let i = 0; i < count; i++) {
        const d = typeof dt === 'number' ? dt : dt();
        each?.(i, d);
        t += d * 1000;
        clock += Math.min(d, 0.25);
        I.gameLoop(t);
        if (i % 30 === 29) await yieldNow();
      }
    } finally {
      window.requestAnimationFrame = realRaf;
      // (The wrapper was an own property over the class's method: take it away.)
      if (drawEvery > 1) delete (sm as unknown as Record<string, unknown>).render;
      I.isRunning = false;
    }
    return clock;
  }

  public census(): Census {
    const sm = this.engine.sceneManager;
    let skinned = 0;
    let meshes = 0;
    sm.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      meshes++;
      if ((m as THREE.SkinnedMesh).isSkinnedMesh) skinned++;
    });
    return {
      skinned, meshes, geometries: sm.renderer.info.memory.geometries, textures: sm.renderer.info.memory.textures,
      enemies: this.engine.enemies.length, cast: this.engine.cast.length, loading: visible('#loading'),
    };
  }

  /** The title, with nothing of any fight left on it. */
  public expectTitle(where: string): void {
    const { I, engine } = this;
    this.check(I.mode === 'title', `${where}: mode is ${I.mode}, not the title`);
    this.check(I.screens.top === 'title', `${where}: the top screen is ${I.screens.top}`);
    this.check(!visible('#loading'), `${where}: the loading screen is still up`);
    this.check(!visible('#hud'), `${where}: the HUD is still up`);
    this.check(!I.paused, `${where}: still paused at the title`);
    this.check(engine.enemies.length === 0, `${where}: ${engine.enemies.length} enemies left at the title`);
    this.check(engine.cast.length === 0, `${where}: ${engine.cast.length} cast left at the title`);
    this.check(engine.player?.group.visible === false, `${where}: the hero is still in view at the title`);
    this.check(I.chapter === null, `${where}: a chapter is still set`);
  }

  /** Quits to the title by whichever way the screen in front has. */
  public quit(): string {
    const top = this.I.screens.top;
    if (top === 'defeat' && click('#defeat [data-action="quit"]')) return 'defeat screen';
    if (top === 'cleared' && click('#cleared [data-action="quit"]')) return 'cleared screen';
    if (top === 'credits') {
      click('#credits [data-action="leave"]');
      return 'credits';
    }
    this.unfreeze();
    if (top !== 'pause') this.I.onMenu('pause');
    return click('#pause [data-action="quit"]') ? 'pause menu' : `no way out (top: ${top})`;
  }

  /**
   * Everyone in the arena falls (the playtest's win), over and over until `until` or the clock runs out; the skip button is
   * held while `skip` says so (a cutscene on the way).
   */
  public async winUntil(until: () => boolean, limit: number, skip: () => boolean = () => false, sparing = false): Promise<boolean> {
    try {
      for (let t = 0; t < limit; t += 0.25) {
        if (until()) return true;
        this.engine.inputManager.keys.Space = skip();
        if (sparing) this.fallAllButFinale();
        else this.engine.debugWin();
        await this.step(0.25);
        if (this.I.mode === 'loading') await this.loaded();
      }
      return until();
    } finally {
      this.engine.inputManager.keys.Space = false;
    }
  }
}

type Stage = 'intro' | 'opening' | 'fight' | 'finale' | 'ending' | 'defeat' | 'cleared';
const STAGES: Stage[] = ['intro', 'opening', 'fight', 'finale', 'ending', 'defeat', 'cleared'];

/** Brings the game to a stage of a chapter; false when that chapter has no such stage. */
async function reach(r: Run, id: number, stage: Stage): Promise<boolean> {
  const { I, engine } = r;
  switch (stage) {
    case 'intro':
      await r.begin(id, true);
      await r.step(2);
      return I.mode === 'intro';
    case 'opening':
      await r.begin(id, true);
      if (!(await r.until(() => I.sceneRun !== null, 150))) return false;
      await r.step(1);
      return true;
    case 'fight':
      await r.begin(id, false);
      await r.step(3, true);
      return I.mode === 'play';
    case 'finale': {
      // A boss's entrance (the cutscene when he arrives, or the story scene when the one before him falls).
      await r.begin(id, false);
      await r.step(1, true);
      if (!(await r.winUntil(() => I.mode === 'intro' && I.outcome === null, 180, () => false, true))) return false;
      await r.step(1);
      return true;
    }
    case 'ending': {
      await r.begin(id, false);
      await r.step(1, true);
      const between = () => I.mode === 'intro' && I.outcome === null;
      // (The cutscenes on the way, a boss's fall and the next one's entrance, are skipped.)
      if (I.finale && !(await r.winUntil(() => I.finale!.boss !== null && I.mode === 'play', 300, between, true))) return false;
      engine.debugWin();
      if (!(await r.winUntil(() => I.mode === 'intro' && I.outcome === 'victory', 120, between))) return false;
      await r.step(1);
      return true;
    }
    case 'defeat':
      // (The prologue's hero is never felled: its fight ends in the scripted beating, which the ending stage covers.)
      if (chapterById(id).story?.loss) return false;
      await r.begin(id, false);
      await r.step(1, true);
      // (The akhada's lesson holds him unfallen while the vanara teaches; the check wants the defeat screen.)
      engine.player!.mortal = true;
      r.fell();
      return r.until(() => I.screens.top === 'defeat', 20);
    case 'cleared': {
      await r.begin(id, false);
      await r.step(1, true);
      engine.debugWin();
      // Past the ending scene (held skip) to the chapter-complete screen (or the next chapter, or the credits).
      const done = () => I.screens.top === 'cleared' || I.screens.top === 'credits' || (I.chapter !== null && I.chapter.id !== id);
      for (let t = 0; t < 120 && !done(); t += 0.25) {
        if (I.mode === 'intro') engine.inputManager.keys.Space = true;
        engine.debugWin();
        await r.step(0.25);
        engine.inputManager.keys.Space = false;
        if (I.mode === 'loading') await r.loaded();
      }
      r.release();
      return I.screens.top === 'cleared' || I.screens.top === 'credits';
    }
  }
}

/** Quit from every stage of every chapter, then play on. */
async function quitCases(r: Run, chapters: number[]): Promise<void> {
  const base = new Map<number, Census>();
  const last = new Map<number, Census>();
  let n = 0;
  for (const id of chapters) {
    for (const stage of STAGES) {
      const where = `chapter ${id}, ${stage}`;
      let reached: boolean;
      try {
        reached = await reach(r, id, stage);
      } catch (err) {
        r.check(false, `${where}: could not be reached: ${String((err as Error)?.stack ?? err).slice(0, 300)}`);
        continue;
      }
      if (!reached) {
        r.note(`${where}: not a stage this chapter has`);
        continue;
      }
      const how = r.quit();
      await r.step(0.5);
      r.expectTitle(`${where} (quit by the ${how})`);
      // At rest the title holds the same of the world, cycle after cycle: a rig or a mesh left behind shows as growth.
      const c = r.census();
      r.note(`${where}: ${c.geometries} geometries, ${c.textures} textures, ${c.skinned} skinned meshes at the title`);
      const level = chapterLevel(id);
      const first = base.get(level);
      last.set(level, c);
      if (!first) base.set(level, c);
      // (A rig left behind shows as another skinned mesh at once. What a scene made in its level - a fire, a shot's props -
      // stays until the level is started again, so the GPU's geometries are compared at the end of a level's cycles.)
      else r.check(c.skinned <= first.skinned, `${where}: ${c.skinned} skinned meshes at the title, ${first.skinned} the first time (a rig left behind)`);
      // And the game goes on: another chapter, straight from the title.
      const next = chapters[(chapters.indexOf(id) + 1) % chapters.length];
      await r.begin(next, false);
      await r.step(2, true);
      r.check(r.I.mode === 'play', `${where}: the next chapter (${next}) did not reach its fight (mode ${r.I.mode})`);
      r.check(!visible('#loading'), `${where}: the loading screen is up over the next chapter`);
      // (The prologue's raiders and the island's creatures come after the start.)
      r.check(r.engine.enemies.length > 0 || !!chapterById(next).expedition || next === 0, `${where}: the next chapter (${next}) has no enemies`);
      n++;
    }
  }
  for (const [level, first] of base) {
    const end = last.get(level)!;
    r.check(end.geometries <= first.geometries + 40, `level ${level}: ${end.geometries} geometries on the GPU at the title after its last cycle, ${first.geometries} after its first (something is not freed)`);
    r.check(end.textures <= first.textures + 30, `level ${level}: ${end.textures} textures on the GPU at the title after its last cycle, ${first.textures} after its first`);
  }
  r.note(`${n} quits to the title, each followed by another chapter`);
  r.unfreeze();
  r.quit();
  await r.step(0.5);
}

const chapterLevel = (id: number): number => CHAPTERS.find((c) => c.id === id)?.level ?? -1;

/** Retry and Restart pressed over and over. */
async function retryCases(r: Run, chapters: number[]): Promise<void> {
  const { I } = r;
  for (const id of chapters) {
    const where = `chapter ${id}`;
    // What one clean start of the chapter holds.
    await r.begin(id, false);
    await r.step(0.5, true);
    const clean = r.census();
    r.fell();
    const mortal = r.engine.player!.isDown();
    if (mortal && (await r.until(() => I.screens.top === 'defeat', 20))) {
      let pressed = 0;
      for (let i = 0; i < 12; i++) if (click('#defeat [data-action="retry"]')) pressed++;
      r.check(pressed >= 1, `${where}: the Retry button was not there to press`);
      r.note(`${where}: Retry pressed ${pressed} times at once`);
      r.check(await r.loaded(), `${where}: stuck loading after Retry`);
      await settleLoads(r);
      await r.step(1.5, true);
      sameAs(r, clean, `${where} after Retry x${pressed}`);
    } else if (mortal) r.check(false, `${where}: the defeat screen never came`);

    // The pause menu's Restart, again and again.
    r.unfreeze();
    await r.step(0.5, true);
    r.I.onMenu('pause');
    let pressed = 0;
    for (let i = 0; i < 12; i++) if (click('#pause [data-action="restart"]')) pressed++;
    r.note(`${where}: Restart pressed ${pressed} times at once`);
    r.check(pressed >= 1, `${where}: the pause menu's Restart was not there to press`);
    r.check(await r.loaded(), `${where}: stuck loading after Restart`);
    await settleLoads(r);
    await r.step(1.5, true);
    sameAs(r, clean, `${where} after Restart x${pressed}`);

    // Restarted in the middle of a cutscene.
    await r.begin(id, true);
    await r.step(2);
    r.unfreeze();
    r.I.onMenu('pause');
    for (let i = 0; i < 3; i++) click('#pause [data-action="restart"]');
    r.check(await r.loaded(), `${where}: stuck loading after a Restart in the intro`);
    await settleLoads(r);
    await r.step(1.5, true);
    sameAs(r, clean, `${where} after a Restart in its intro`);

    // Another chapter chosen before the last one has loaded (the Chapters screen's button): the last one wins.
    const other = chapters[(chapters.indexOf(id) + 1) % chapters.length];
    if (other !== id) {
      const first = r.engine.startChapter(id, { intro: false });
      const second = r.engine.startChapter(other, { intro: false });
      await Promise.all([first, second]);
      r.I.isRunning = false;
      await settleLoads(r);
      await r.step(1, true);
      r.check(r.I.chapter?.id === other, `${where}: two chapters started at once, and ${r.I.chapter?.id} won, not ${other}`);
      r.check(!visible('#loading'), `${where}: the loading screen is up after two loads at once`);
    }
  }
  r.unfreeze();
  r.quit();
  await r.step(0.5);
}

/** Lets loads that were replaced finish (their rigs arrive late and must free themselves). */
async function settleLoads(r: Run): Promise<void> {
  for (let i = 0; i < 60; i++) await yieldNow();
  await new Promise((res) => setTimeout(res, 400));
}

/** The chapter as it is after a clean start: the same foes, the same rigs, nothing on the loading screen. */
function sameAs(r: Run, clean: Census, where: string): void {
  const c = r.census();
  r.check(r.I.mode === 'play', `${where}: mode ${r.I.mode}, not the fight`);
  r.check(!c.loading, `${where}: the loading screen is up over the fight`);
  r.check(r.I.screens.empty, `${where}: a menu is still up (${r.I.screens.top})`);
  r.check(c.enemies >= 1 || clean.enemies === 0, `${where}: no enemies in the fight`);
  r.check(c.skinned <= clean.skinned + 1, `${where}: ${c.skinned} skinned meshes in the scene, ${clean.skinned} for a clean start (rigs left over)`);
  r.check(c.meshes <= clean.meshes + 12, `${where}: ${c.meshes} meshes in the scene, ${clean.meshes} for a clean start`);
}

/** Pausing in cutscenes and in the fight, and resuming. */
async function pauseCases(r: Run, chapters: number[]): Promise<void> {
  const { I, engine: e } = r;
  // The pointer lock is a browser gesture this check cannot make; the real Resume asks for it first.
  const input = e.inputManager as unknown as { requestPointerLock(el: HTMLElement): Promise<boolean> };
  const realLock = input.requestPointerLock;
  input.requestPointerLock = async () => true;
  let cycles = 0;
  try {
    for (const id of chapters) {
      for (const stage of ['intro', 'opening', 'fight', 'finale', 'ending'] as Stage[]) {
        const where = `chapter ${id}, ${stage}`;
        if (!(await reach(r, id, stage))) continue;
        cycles++;
        r.unfreeze();
        const cam = e.sceneManager.camera.position.clone();
        const hero = e.player!.getPosition().clone();
        const clock = { mode: I.modeTime, fight: I.fightTime };
        const how = stage === 'fight' && id % 2 ? 'blur' : 'menu';
        if (how === 'blur') window.dispatchEvent(new Event('blur'));
        else I.onMenu('pause');
        r.check(I.paused, `${where}: not paused after the ${how}`);
        r.check(I.screens.top === 'pause', `${where}: the pause menu is not up (top: ${I.screens.top})`);
        // Time passes outside (a second and a half of frames), and a second pause (the browser's blur after Esc) does nothing.
        window.dispatchEvent(new Event('blur'));
        await r.frames(90, 1 / 60);
        const moved = e.sceneManager.camera.position.distanceTo(cam) + e.player!.getPosition().distanceTo(hero);
        r.check(moved < 1e-3, `${where}: things moved ${moved.toFixed(4)} m while the game was paused`);
        r.check(Math.abs(I.modeTime - clock.mode) < 1e-6, `${where}: the scene's clock ran on while paused`);
        r.check(Math.abs(I.fightTime - clock.fight) < 1e-6, `${where}: the fight's clock ran on while paused`);
        // Resume: through the button.
        const modeThen = I.mode;
        click('#pause [data-action="resume"]');
        for (let i = 0; i < 40 && I.paused; i++) await yieldNow();
        r.check(!I.paused, `${where}: still paused after Resume`);
        r.check(I.screens.empty, `${where}: a menu is still up after Resume (${I.screens.top})`);
        await r.frames(60, 1 / 60);
        r.check(I.mode !== modeThen || I.modeTime > clock.mode + 0.5, `${where}: the clock did not run again after Resume`);
        // The cutscene still ends in the fight (hold skip).
        if (I.mode === 'intro') {
          const done = await skipOut(r);
          r.check(done, `${where}: the cutscene did not end after the pause (mode ${I.mode})`);
        }
        r.release();
      }
    }
  } finally {
    input.requestPointerLock = realLock;
  }
  r.note(`${cycles} pauses, each with 1.5 s of frames while paused, a resume and the cutscene or fight carried on`);
  r.unfreeze();
  r.quit();
  await r.step(0.5);
}

/** Holds the skip button, frame by frame on the real loop, until nothing is playing. */
async function skipOut(r: Run): Promise<boolean> {
  const { I, engine: e } = r;
  for (let guard = 0; guard < 20 && I.mode === 'intro'; guard++) {
    e.inputManager.keys.Space = true;
    await r.frames(60, 1 / 60);
    e.inputManager.keys.Space = false;
    await r.frames(10, 1 / 60);
  }
  return I.mode !== 'intro';
}

/** The real loop at other frame rates. */
async function rateCases(r: Run, chapters: number[]): Promise<void> {
  const { I, engine: e } = r;
  const rng = mulberry32(99);
  // [label, the frame's length, frames a second (for how many to run)]
  const profiles: [string, () => number, number][] = [
    ['60 fps', () => 1 / 60, 60],
    ['30 fps', () => 1 / 30, 30],
    ['144 fps', () => 1 / 144, 144],
    ['240 fps', () => 1 / 240, 240],
    ['uneven (5-45 ms)', () => 0.005 + rng() * 0.04, 40],
    ['a 0.4 s stall every 90 frames', (() => { let n = 0; return () => (++n % 90 === 0 ? 0.4 : 1 / 60); })(), 50],
  ];
  for (const id of chapters) {
    for (const [label, dt, fps] of profiles) {
      const where = `chapter ${id}, ${label}`;
      await r.begin(id, false);
      r.unfreeze();
      const bot = new HeroBot(e, SKILLS.steady, mulberry32(id * 13 + 5));
      let worst = 0;
      let nan = 0;
      let ran = 0;
      let playClock = 0;
      let playGame = 0;
      let prev: { mode: string; fight: number; dt: number; held: boolean } | null = null;
      const last = new Map<unknown, THREE.Vector3>();
      // The same ten seconds of the clock at every rate.
      const total = Math.round(10 * fps);
      // The bot decides once a frame, as a player's hands do.
      await r.frames(total, dt, (_i, d) => {
        ran++;
        // The frame before: how much game time it ran in the fight, against the clock it was given. Frames in a hit-stop or
        // a slow-motion beat are left out: both run on the wall clock (the beat is a gsap tween), which this harness races
        // ahead of, so half a second of slow motion would cover seconds of these frames. The loop is what is checked here.
        if (prev && prev.mode === 'play' && I.mode === 'play' && !prev.held) {
          playClock += Math.min(prev.dt, 0.25);
          playGame += I.fightTime - prev.fight;
        }
        const cs = e.combatSystem;
        prev = { mode: I.mode, fight: I.fightTime, dt: d, held: cs.slowScale < 0.999 || cs.globalTimeScale === 0 };
        if (I.mode === 'play') bot.step(Math.min(d, 0.25));
        for (const c of [e.player!, ...e.enemies]) {
          const p = c.getPosition();
          if (!Number.isFinite(p.x + p.y + p.z)) nan++;
          const was = last.get(c);
          if (was) worst = Math.max(worst, p.distanceTo(was));
          last.set(c, p.clone());
        }
      }, Math.max(1, Math.round(fps / 30)));
      bot.release();
      // Game time keeps pace with the clock while the fight is on (hit-stop and slow motion take a little, a stalled frame is
      // capped at a quarter of a second and its backlog dropped, so a stall runs slower).
      const ratio = playClock > 1 ? playGame / playClock : 1;
      r.note(`${where}: ${playGame.toFixed(1)} s of game in ${playClock.toFixed(1)} s of fight clock (${(ratio * 100).toFixed(0)}%), farthest step ${worst.toFixed(2)} m, ended in ${I.mode}`);
      r.check(nan === 0, `${where}: a position went NaN ${nan} times`);
      const stall = label.includes('stall');
      r.check(ratio > (stall ? 0.6 : 0.9) && ratio < 1.05, `${where}: game time ran at ${(ratio * 100).toFixed(0)}% of the clock`);
      r.check(worst < 6, `${where}: someone moved ${worst.toFixed(1)} m in one frame`);
      r.check(ran === total, `${where}: ${ran} frames ran, not ${total}`);
    }
  }
  r.unfreeze();
  r.quit();
  await r.step(0.5);
}

/** Overrides the window's size for a moment (the page cannot resize its own window). */
function withWindowSize<T>(w: number, h: number, body: () => T): T {
  const wd = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  const hd = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true, writable: true });
  try {
    return body();
  } finally {
    if (wd) Object.defineProperty(window, 'innerWidth', wd);
    if (hd) Object.defineProperty(window, 'innerHeight', hd);
  }
}

/** The window's size changed under a fight and under a cutscene. */
async function resizeCases(r: Run, chapters: number[]): Promise<void> {
  const { I, engine: e } = r;
  const sm = e.sceneManager;
  const gl = sm.renderer.getContext();
  const real = [window.innerWidth, window.innerHeight];
  const sizes: [number, number][] = [[1, 1], [0, 0], [320, 200], [200, 3000], [3000, 200], [3840, 2160], [1, 4000], [real[0], 0], [0, real[1]], [real[0], real[1]]];
  for (const id of chapters) {
    for (const stage of ['intro', 'fight'] as Stage[]) {
      if (!(await reach(r, id, stage))) continue;
      r.unfreeze();
      for (const [w, h] of sizes) {
        const where = `chapter ${id}, ${stage}, ${w}x${h}`;
        withWindowSize(w, h, () => window.dispatchEvent(new Event('resize')));
        // A frame of the real loop with that size standing (the window is still the size the engine last accepted).
        await withWindowSizeAsync(w, h, () => r.frames(6, 1 / 60));
        const aspect = sm.camera.aspect;
        const size = sm.renderer.getSize(new THREE.Vector2());
        r.check(Number.isFinite(aspect) && aspect > 0, `${where}: the camera's aspect is ${aspect}`);
        r.check(Number.isFinite(size.x + size.y) && size.x >= 1 && size.y >= 1, `${where}: the renderer is ${size.x}x${size.y}`);
        const err = gl.getError();
        r.check(err === 0, `${where}: the GPU raised error 0x${err.toString(16)}`);
        r.check(Number.isFinite(sm.camera.position.x + sm.camera.position.y + sm.camera.position.z), `${where}: the camera position went NaN`);
        const plates = $('#enemy-plates');
        r.check(!plates || !/NaN/.test(plates.innerHTML), `${where}: an enemy's health plate has a NaN position`);
        void I;
      }
      window.dispatchEvent(new Event('resize'));
      r.release();
    }
  }
  r.unfreeze();
  r.quit();
  await r.step(0.5);
}

async function withWindowSizeAsync<T>(w: number, h: number, body: () => Promise<T>): Promise<T> {
  const wd = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  const hd = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true, writable: true });
  try {
    return await body();
  } finally {
    if (wd) Object.defineProperty(window, 'innerWidth', wd);
    if (hd) Object.defineProperty(window, 'innerHeight', hd);
  }
}

/** The menus, one after the other. */
async function menuCases(r: Run): Promise<void> {
  const { I, engine: e } = r;
  const input = e.inputManager as unknown as { requestPointerLock(el: HTMLElement): Promise<boolean> };
  const realLock = input.requestPointerLock;
  input.requestPointerLock = async () => true;
  try {
    r.unfreeze();
    r.quit();
    await r.step(0.5);
    r.expectTitle('menus: the title to begin with');
    for (const [button, screen] of [['chapters', 'chapters'], ['settings', 'settings'], ['controls', 'controls']] as const) {
      click(`#title [data-action="${button}"]`);
      r.check(I.screens.top === screen, `menus: ${button} did not open (top: ${I.screens.top})`);
      click(`#${screen} [data-action="back"]`);
      r.check(I.screens.top === 'title', `menus: Back from ${screen} did not return to the title (top: ${I.screens.top})`);
    }
    // Every setting button pressed (they cycle), then Back.
    click('#title [data-action="settings"]');
    for (const b of Array.from(document.querySelectorAll<HTMLButtonElement>('#settings [data-setting]'))) if (!b.hidden) b.click();
    click('#settings [data-action="back"]');
    // The Chapters screen: its first button starts that chapter.
    click('#title [data-action="chapters"]');
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('#chapters [data-action="chapter"]'));
    r.check(buttons.length > 0, 'menus: the Chapters screen lists no chapters');
    buttons[0]?.click();
    r.check(await r.loaded(), 'menus: the chosen chapter never loaded');
    r.I.isRunning = false;
    await r.step(2);
    r.check(I.mode === 'intro' || I.mode === 'play', `menus: after choosing a chapter the mode is ${I.mode}`);
    // Pause, open Settings and Controls from it, back, resume.
    r.unfreeze();
    I.onMenu('pause');
    click('#pause [data-action="settings"]');
    r.check(I.screens.top === 'settings', `menus: Settings from the pause menu (top: ${I.screens.top})`);
    click('#settings [data-action="back"]');
    click('#pause [data-action="controls"]');
    r.check(I.screens.top === 'controls', `menus: Controls from the pause menu (top: ${I.screens.top})`);
    click('#controls [data-action="back"]');
    r.check(I.screens.top === 'pause', `menus: back from Controls did not return to the pause menu (top: ${I.screens.top})`);
    click('#pause [data-action="resume"]');
    for (let i = 0; i < 40 && I.paused; i++) await yieldNow();
    r.check(!I.paused, 'menus: still paused after Resume');
    await r.frames(30, 1 / 60);
    // New game from the title, then out again.
    r.quit();
    await r.step(0.5);
    r.expectTitle('menus: back at the title');
    click('#title [data-action="new"]');
    r.check(await r.loaded(), 'menus: New game never loaded');
    r.I.isRunning = false;
    await r.step(1);
    r.check(I.chapter?.id === CHAPTERS[0].id, `menus: New game started chapter ${I.chapter?.id}`);
    r.check(I.mode === 'intro', `menus: New game's mode is ${I.mode}`);
    r.quit();
    await r.step(0.5);
    r.expectTitle('menus: after New game');
  } finally {
    input.requestPointerLock = realLock;
  }
}

/** All the checks (or the ones in `options.only`). The engine is left stopped at the title (`debugResume` puts real time back). */
export async function runRobustness(engineRef: Engine, options: RobustnessOptions = {}): Promise<RobustnessReport> {
  const wall0 = performance.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  const chapters = options.chapters ?? CHAPTERS.map((c) => c.id);
  const wanted = (name: string) => !options.only || options.only.includes(name);
  const cases: RobustnessCase[] = [];
  let tag = 'start';
  const unhook = hookConsole(errors, warnings, () => `[${tag}]`);
  const keys = ['yudhveer.learned.v1', 'yudhveer.progress.v1'];
  const saved: Record<string, string | null> = {};
  for (const k of keys) {
    try {
      saved[k] = localStorage.getItem(k);
    } catch {
      saved[k] = null;
    }
  }
  const realRandom = Math.random;
  const run = async (name: string, body: (r: Run) => Promise<void>) => {
    tag = name;
    const r = new Run(engineRef);
    const before = errors.length;
    const t0 = performance.now();
    try {
      await body(r);
    } catch (err) {
      r.failures.push(`threw: ${String((err as Error)?.stack ?? err).slice(0, 500)}`);
    }
    r.release();
    const fresh = errors.slice(before);
    for (const message of fresh.slice(0, 5)) r.failures.push(`console: ${message}`);
    cases.push({ name, ok: r.failures.length === 0, notes: r.notes, failures: r.failures, seconds: Math.round((performance.now() - t0) / 100) / 10 });
  };
  try {
    Math.random = mulberry32(7);
    if (wanted('quit')) await run('quit', (r) => quitCases(r, chapters));
    if (wanted('retry')) await run('retry', (r) => retryCases(r, chapters.filter((c) => c > 0)));
    if (wanted('pause')) await run('pause', (r) => pauseCases(r, chapters));
    if (wanted('rate')) await run('rate', (r) => rateCases(r, chapters.filter((c) => c > 0)));
    if (wanted('resize')) await run('resize', (r) => resizeCases(r, chapters));
    if (wanted('menus')) await run('menus', (r) => menuCases(r));
  } finally {
    Math.random = realRandom;
    unhook();
    for (const k of keys) {
      try {
        if (saved[k] === null) localStorage.removeItem(k);
        else localStorage.setItem(k, saved[k]!);
      } catch {
        // Storage blocked.
      }
    }
    window.dispatchEvent(new Event('resize'));
  }
  return { ok: cases.every((c) => c.ok) && errors.length === 0, cases, errors, warnings, wallSeconds: Math.round((performance.now() - wall0) / 100) / 10 };
}

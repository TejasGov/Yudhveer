import type { Engine } from '../core/Engine';
import { CHAPTERS, chapterById } from '../game/Chapters';
import { Progress } from '../core/Settings';
import { HeroBot, SKILLS, type BotSkill } from './HeroBot';
import { mulberry32, yieldNow } from './Playtest';

/*
 * The flow playtest (docs/STORY.md, "Milestone 12"): plays the campaign as a player meets it, chapter after chapter, with
 * every console error and warning hooked: the chapter's intro and its opening scene, the fight (the hero bot), every scene
 * inside it, the ending, the chapter-complete screen and its Continue button, the next chapter loading, and after the
 * last chapter the credits and the title. The same sequence the menus drive, stepped on the engine's fixed clock
 * (`debugAdvance`), so it runs with the Browser pane hidden. Dev builds only (`__debug.playtestFlow`).
 */

const FIXED_DT = 1 / 60;

export interface FlowOptions {
  from?: number;
  to?: number;
  skill?: string | BotSkill;
  /** Hold the skip button through every cutscene (the path a player in a hurry takes) instead of watching them. */
  skip?: boolean;
  seed?: number;
  /** Retries after a defeat before the flow gives up on a chapter. */
  retries?: number;
  /** Cap on one chapter's game seconds, cutscenes included. */
  maxChapterSeconds?: number;
}

export interface FlowChapter {
  id: number;
  name: string;
  /** Game seconds from the chapter's start to each moment (the first moment of each mode it passed through). */
  timeline: { t: number; mode: string; note?: string }[];
  scenes: string[];
  introSeconds: number;
  fightSeconds: number;
  endingSeconds: number;
  deaths: number;
  outcome: string;
  /** The hero as the fight began: weapon, moves, and his health at the end. */
  kit: { weapon: string; moves: string[]; attire: string };
  hpAtEnd: number;
  unlockedAfter: number;
  problems: string[];
}

export interface FlowReport {
  chapters: FlowChapter[];
  credits: boolean;
  backAtTitle: boolean;
  gameSeconds: number;
  wallSeconds: number;
  errors: string[];
  warnings: string[];
}

interface EngineInternals {
  mode: string;
  outcome: 'defeat' | 'victory' | null;
  fightTime: number;
  chapter: { id: number; continues?: boolean } | null;
  seenScenes: Set<string>;
  screens: { top?: string; empty: boolean; clear(): void };
  sceneRun: unknown;
  paused: boolean;
}
const internals = (e: Engine) => e as unknown as EngineInternals;

const click = (selector: string): boolean => {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el || (el as HTMLButtonElement).disabled) return false;
  el.click();
  return true;
};

/** Hooks the page's errors and warnings for the length of a run. */
export function hookConsole(errors: string[], warnings: string[], tag: () => string): () => void {
  const error = console.error;
  const warn = console.warn;
  console.error = (...args: unknown[]) => {
    errors.push(`${tag()} console.error: ${args.map(String).join(' ').slice(0, 400)}`);
    error.apply(console, args);
  };
  console.warn = (...args: unknown[]) => {
    warnings.push(`${tag()} console.warn: ${args.map(String).join(' ').slice(0, 300)}`);
    warn.apply(console, args);
  };
  const onError = (e: ErrorEvent) => errors.push(`${tag()} window.error: ${e.message} (${e.filename?.split('/').pop()}:${e.lineno})`);
  const onRejection = (e: PromiseRejectionEvent) => errors.push(`${tag()} unhandledrejection: ${String((e.reason as Error)?.stack ?? e.reason).slice(0, 400)}`);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    console.error = error;
    console.warn = warn;
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}

/**
 * Plays chapters `from` to `to` (default: the whole campaign) from the first chapter's start. The player's saved lessons
 * and progress are put back afterwards.
 */
export async function playFlow(engine: Engine, options: FlowOptions = {}): Promise<FlowReport> {
  const I = internals(engine);
  const from = options.from ?? CHAPTERS[0].id;
  const to = options.to ?? CHAPTERS[CHAPTERS.length - 1].id;
  const skill = typeof options.skill === 'object' ? options.skill : SKILLS[options.skill ?? 'steady'] ?? SKILLS.steady;
  const seed = options.seed ?? 1;
  const maxChapter = options.maxChapterSeconds ?? 900;
  const errors: string[] = [];
  const warnings: string[] = [];
  const report: FlowReport = { chapters: [], credits: false, backAtTitle: false, gameSeconds: 0, wallSeconds: 0, errors, warnings };
  const wall0 = performance.now();
  let tag = 'start';
  const unhook = hookConsole(errors, warnings, () => `[${tag}]`);
  const realRandom = Math.random;
  const saved: Record<string, string | null> = {};
  const keys = ['yudhveer.learned.v1', 'yudhveer.progress.v1'];
  for (const k of keys) {
    try {
      saved[k] = localStorage.getItem(k);
    } catch {
      saved[k] = null;
    }
  }
  let game = 0;
  const advance = (seconds: number) => {
    engine.debugAdvance(seconds);
    game += seconds;
  };
  try {
    Math.random = mulberry32(seed * 104729 + 3);
    try {
      localStorage.removeItem('yudhveer.learned.v1');
    } catch {
      // Storage blocked.
    }
    I.seenScenes.clear();
    // The campaign from its start: from the menu's New game (its click is a gesture; the mouse lock is refused here, which the engine tolerates).
    tag = `ch${from}`;
    await engine.startChapter(from, { intro: true });
    // The real-time loop off (everything below is stepped); `debugStep(0)` would do it but cuts the intro short (it puts the game in play).
    (engine as unknown as { isRunning: boolean }).isRunning = false;

    let chapter: FlowChapter | null = null;
    let bot: HeroBot | null = null;
    let botFor = -1;
    let lastMode = '';
    let chapterStart = 0;
    let fightStart = -1;
    let endStart = -1;
    let retries = 0;
    const pending = (): FlowChapter => chapter!;
    const begin = (id: number) => {
      const c = chapterById(id);
      // A chapter that ran straight on into this one (the prologue, from black) is closed here.
      const prev = chapter as FlowChapter | null;
      if (prev && prev.outcome === '?') {
        prev.outcome = 'ran on';
        prev.fightSeconds = +((endStart >= 0 ? endStart : game) - Math.max(fightStart, 0)).toFixed(1);
        if (endStart >= 0) prev.endingSeconds = +(game - endStart).toFixed(1);
      }
      chapter = {
        id, name: c.name, timeline: [], scenes: [], introSeconds: 0, fightSeconds: 0, endingSeconds: 0, deaths: 0, outcome: '?',
        kit: { weapon: '', moves: [], attire: '' }, hpAtEnd: 0, unlockedAfter: 0, problems: [],
      };
      report.chapters.push(chapter);
      chapterStart = game;
      fightStart = -1;
      endStart = -1;
      lastMode = '';
      retries = 0;
      tag = `ch${id}`;
    };
    begin(from);
    let guard = 0;
    let n = 0;
    while (guard++ < 400000) {
      const mode = I.mode;
      const id = I.chapter?.id ?? chapter!.id;
      // The next chapter began by itself (the prologue runs straight on) or from the Continue button.
      if (id !== chapter!.id && mode !== 'title') {
        if (id > to) break;
        begin(id);
      }
      if (game - chapterStart > maxChapter) {
        pending().problems.push(`still going after ${maxChapter} s (mode ${mode})`);
        pending().outcome = 'stall';
        break;
      }
      if (mode !== lastMode) {
        pending().timeline.push({ t: +(game - chapterStart).toFixed(1), mode, note: I.screens.top });
        // The first time the cutscenes give way to the fight: what he carries into it.
        if ((mode === 'play' || mode === 'handoff') && fightStart < 0) {
          fightStart = game;
          pending().introSeconds = +(game - chapterStart).toFixed(1);
          const p = engine.player!;
          pending().kit = { weapon: p.weapon.id, moves: (['dodge', 'combo', 'block', 'parry', 'charge', 'leap'] as const).filter((m) => p.can(m)), attire: p.attire };
        }
        lastMode = mode;
      }
      for (const s of I.seenScenes) if (!pending().scenes.includes(s)) pending().scenes.push(s);

      if (mode === 'loading') {
        await yieldNow();
        continue;
      }
      if (mode === 'title') {
        report.backAtTitle = true;
        break;
      }
      if (mode === 'intro') {
        if (options.skip) engine.inputManager.keys.Space = true;
        advance(0.25);
        engine.inputManager.keys.Space = false;
        if (endStart < 0 && I.outcome !== null) endStart = game;
        if (++n % 8 === 0) await yieldNow();
        continue;
      }
      if (mode === 'play' || mode === 'handoff') {
        if (!bot || botFor !== id || botFor < 0) {
          bot?.release();
          // (Each attempt plays differently: the same seed would make the same mistakes at the same moments every retry.)
          bot = new HeroBot(engine, skill, mulberry32(seed * 7 + id + pending().deaths * 1009));
          botFor = id;
          // The first attempt: a boss has roared in the intro already (it settles when a cutscene ends; this one may be skipped).
        }
        bot.step(FIXED_DT);
        advance(FIXED_DT);
        if (engine.enemies.some((e) => !e.rig && e.stateMachine.currentState !== 'DEAD')) await yieldNow();
        else if (++n % 60 === 0) await yieldNow();
        const p = engine.player!;
        if (!Number.isFinite(p.getPosition().x + p.getPosition().y + p.getPosition().z)) {
          pending().problems.push('the hero\'s position went NaN');
          break;
        }
        continue;
      }
      bot?.release();
      botFor = -1;
      bot = null;
      if (mode === 'outro') {
        if (endStart < 0) endStart = game;
        advance(0.25);
        continue;
      }
      if (mode === 'over') {
        // The outcome: wait for its screen (the ending scene plays first), then press its button.
        const top = I.screens.top;
        if (top === 'defeat') {
          pending().deaths++;
          pending().outcome = 'defeat';
          if (retries++ >= (options.retries ?? 3)) {
            pending().problems.push('gave up after the retries');
            break;
          }
          click('#defeat [data-action="retry"]');
          await yieldNow();
          continue;
        }
        if (top === 'cleared') {
          pending().outcome = 'cleared';
          pending().hpAtEnd = Math.round(engine.player!.currentHealth);
          pending().unlockedAfter = Progress.unlocked();
          pending().fightSeconds = +((endStart >= 0 ? endStart : game) - Math.max(fightStart, 0)).toFixed(1);
          if (endStart >= 0) pending().endingSeconds = +(game - endStart).toFixed(1);
          if (id >= to) {
            report.gameSeconds = game;
            break;
          }
          click('#cleared [data-action="next"]');
          await yieldNow();
          continue;
        }
        if (top === 'credits') {
          report.credits = true;
          pending().outcome = 'credits';
          pending().hpAtEnd = Math.round(engine.player!.currentHealth);
          pending().fightSeconds = +((endStart >= 0 ? endStart : game) - Math.max(fightStart, 0)).toFixed(1);
          if (endStart >= 0) pending().endingSeconds = +(game - endStart).toFixed(1);
          pending().unlockedAfter = Progress.unlocked();
          click('#credits [data-action="leave"]');
          await yieldNow();
          continue;
        }
        advance(0.25);
        continue;
      }
      advance(0.25);
    }
    if (I.mode === 'title') report.backAtTitle = true;
    const last = report.chapters[report.chapters.length - 1];
    if (last && last.outcome === '?' && I.outcome === 'victory') last.outcome = 'won';
    report.gameSeconds = game;
  } finally {
    Math.random = realRandom;
    engine.inputManager.keys.Space = false;
    unhook();
    for (const k of keys) {
      try {
        if (saved[k] === null) localStorage.removeItem(k);
        else localStorage.setItem(k, saved[k]!);
      } catch {
        // Storage blocked.
      }
    }
    report.wallSeconds = (performance.now() - wall0) / 1000;
  }
  return report;
}

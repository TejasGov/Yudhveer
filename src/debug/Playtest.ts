import type { Engine } from '../core/Engine';
import type { Enemy } from '../entities/Enemy';
import type { CombatEvent } from '../combat/CombatSystem';
import type { CharacterState } from '../entities/CharacterStateMachine';
import { Character } from '../entities/Character';
import { CHAPTERS, chapterById } from '../game/Chapters';
import { ExpeditionRun } from '../game/Expedition';
import { forgetLesson } from '../game/stories/Akhada';
import { Boss } from '../entities/Boss';
import { WEAPON_SETS, type Blow } from '../entities/characters/YodhaWeapons';
import type { WeaponId } from '../game/Progression';
import { HeroBot, SKILLS, type BotSkill } from './HeroBot';
import type { GuardSpec } from '../combat/Guard';

/*
 * The playtest (docs/STORY.md, "Milestone 12"): plays a chapter's fight with the hero bot (HeroBot.ts) on the engine's own
 * fixed step, deterministically (Math.random is seeded for each run), and measures what a designer wants to know: how
 * often the fight is won, how long it takes, what it costs in health, which blows do the damage, how often each kind of
 * attack lands and how much warning it gave. Dev builds only, through `__debug.playtest(chapter, runs, options)`;
 * `__debug.playtestFlow(...)` plays the chapters end to end (intro, opening, fight, ending, the next chapter) with console
 * errors hooked, `__debug.playtestTrace(...)` is one fight blow by blow.
 *
 * A run starts the chapter as a first attempt that has skipped its intro and opening: the bosses have roared, nothing is
 * learned or seen yet, but every story scene inside the fight plays (the Akhada's lesson and arrival, Shalva's fall, a
 * finale's entrance). It ends when the engine decides it: the last foe falls (a win), the hero does (a loss), the
 * prologue's scripted loss comes (the beating), or the time cap runs out (a stall: the bot could not finish).
 *
 * `options.tune` tries a different number without editing code: per enemy (by its name on screen), its health, damage and
 * pacing; per weapon, its blows; the hero's health.
 */

const FIXED_DT = 1 / 60;
/** Where `Skills.learn` keeps what the fights have taught (game/Progression.ts). */
const LEARNED_KEY = 'yudhveer.learned.v1';

/** What-if numbers for an enemy, by its name on screen ("Baoli Guardian", "Shalva", "Rakshasa"...). */
export interface EnemyTune {
  health?: number;
  posture?: number;
  /** Its blows' damage and posture, as a multiple of the usual (Enemy.damageScale). */
  damageScale?: number;
  moveSpeed?: number;
  attackCooldown?: number;
  telegraphDuration?: number;
  engageRange?: number;
  comboChance?: number;
  /** A boss: seconds between its attacks, and how far its swing reaches. */
  interval?: number;
  strikeRange?: number;
  /** The share of a light blow's damage that gets through while it swings (Enemy.armorDamage). */
  armorDamage?: number;
  /** Its guard's numbers (combat/Guard.ts, `GuardSpec`): `{ base: 0.2, hold: 1 }`; `{ base: 0, max: 0 }` takes the guard away. */
  guard?: Partial<GuardSpec>;
}

export interface PlaytestOptions {
  /** 'novice' | 'steady' (default) | 'expert', or a skill of your own. */
  skill?: string | BotSkill;
  /** The first run's seed; each next one adds one. */
  seed?: number;
  /** Cap on a run's length in game seconds (cutscenes included). */
  maxSeconds?: number;
  /** Keep every run's detail in the report (else only the summary and a one-line entry per run). */
  detail?: boolean;
  /** Write a line of the fight every `every` seconds (from `from`), and every blow the hero takes, into the run's `trace`. */
  trace?: { every?: number; from?: number; enemies?: number };
  /** What-if numbers (see `EnemyTune`), for the length of the playtest. */
  tune?: {
    enemies?: Record<string, EnemyTune>;
    /** A weapon's blows: `{ mace: { ATTACK_1: { damage: 30 } } }`. */
    weapons?: Partial<Record<WeaponId, Partial<Record<CharacterState, Partial<Blow>>>>>;
    /** The hero's health. */
    health?: number;
  };
}

/** One blow that landed on the hero (or was met on his guard). */
export interface HitRecord {
  t: number;
  fight: number;
  hp: number;
  damage: number;
  /** Who struck (an enemy's id, or the kind of bolt), and with what. */
  attacker: string;
  /** The enemy's name on screen (or the bolt's kind). */
  name: string;
  attack: string;
  /** Seconds into the attack when it landed (its warning, the wind-up), or null for a bolt or a wave. */
  at: number | null;
  result: string;
}

export interface RunResult {
  chapter: number;
  seed: number;
  skill: string;
  outcome: 'win' | 'loss' | 'scripted-loss' | 'stall';
  /** What decided the prologue's scripted loss. */
  trigger?: string;
  /** Seconds of fight (the engine's own clock: play mode only), and of game time in all (cutscenes included). */
  fightTime: number;
  gameTime: number;
  hpLeft: number;
  damageTaken: number;
  lowestHp: number;
  stats: { hitsTaken: number; blocks: number; deflections: number; postureBreaks: number; damageDealt: number; bossBlocks: number; guardBreaks: number };
  /** What each boss's guard did (combat/Guard.ts): raised, blows turned aside, broken by a heavy blow, answers made, kicks. */
  guards: Record<string, { name: string; raised: number; blocked: number; broken: number; answers: number; shoves: number }>;
  /** Each foe: when it first fought, seconds it stood in the fight, when it fell (fight seconds) and the hero's health then. */
  foes: Record<string, { name: string; first: number; alive: number; fell: number | null; hpAtFirst: number; hpAtFall: number | null }>;
  hits: HitRecord[];
  /** How many times each kind of attack was thrown ("Shalva ATTACK_1", "ORB"). */
  attacks: Record<string, number>;
  /** The bot's own account of what it did. */
  answers: Record<string, number>;
  errors: string[];
  /** The fight as it went (`PlaytestOptions.trace`). */
  trace?: string[];
}

interface EngineInternals {
  mode: string;
  outcome: 'defeat' | 'victory' | null;
  fightTime: number;
  beaten: boolean;
  seenScenes: Set<string>;
  chapter: { id: number; story?: { loss?: unknown } } | null;
  screens: { empty: boolean; clear(): void };
}
const internals = (e: Engine) => e as unknown as EngineInternals;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lets the page breathe (a rig loading, a fetch finishing) without the clamping of a timer. */
export function yieldNow(): Promise<void> {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => resolve();
    ch.port2.postMessage(0);
  });
}

/** Default cap per chapter: long enough for the fight and its scenes, short enough to call a stall. */
function defaultCap(chapter: number): number {
  return chapter === 3 ? 420 : chapter === 5 ? 520 : chapter === 4 ? 420 : 300;
}

function skillOf(s: string | BotSkill | undefined): BotSkill {
  if (typeof s === 'object') return s;
  return SKILLS[s ?? 'steady'] ?? SKILLS.steady;
}

/** The player's own saved lessons are put back once a session of runs is over: each run is a first attempt. */
async function withSession<T>(options: PlaytestOptions, body: () => Promise<T>): Promise<T> {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(LEARNED_KEY);
  } catch {
    // Storage blocked.
  }
  const undo = applyTune(options.tune);
  try {
    return await body();
  } finally {
    undo();
    try {
      if (saved === null) localStorage.removeItem(LEARNED_KEY);
      else localStorage.setItem(LEARNED_KEY, saved);
    } catch {
      // Storage blocked.
    }
  }
}

/** Puts the what-if numbers in (enemies are tuned as their rigs come in) and returns the way back. */
function applyTune(tune: PlaytestOptions['tune']): () => void {
  if (!tune) return () => undefined;
  const undo: (() => void)[] = [];
  if (tune.weapons) {
    for (const [weapon, blows] of Object.entries(tune.weapons) as [WeaponId, Partial<Record<CharacterState, Partial<Blow>>>][]) {
      const set = WEAPON_SETS[weapon];
      for (const [state, change] of Object.entries(blows) as [CharacterState, Partial<Blow>][]) {
        const was = set.blows[state];
        if (!was) continue;
        set.blows[state] = { ...was, ...change };
        undo.push(() => { set.blows[state] = was; });
      }
    }
  }
  if (tune.enemies) {
    const proto = Character.prototype as unknown as { attachRig(this: Character, def: unknown): Promise<unknown> };
    const original = proto.attachRig;
    proto.attachRig = async function (this: Character, def: unknown) {
      const rig = await original.call(this, def);
      const e = this as Enemy;
      const t = e.isBoss !== undefined ? tune.enemies![e.displayName] : undefined;
      if (t) tuneEnemy(e, t);
      return rig;
    };
    undo.push(() => { proto.attachRig = original; });
  }
  return () => undo.reverse().forEach((f) => f());
}

function tuneEnemy(e: Enemy, t: EnemyTune): void {
  const p = e as unknown as Record<string, unknown> & { tuning?: { attackInterval: number; strikeRange: number } };
  if (t.health !== undefined) e.maxHealth = e.currentHealth = t.health;
  if (t.posture !== undefined) e.maxMarma = t.posture;
  if (t.damageScale !== undefined) e.damageScale = t.damageScale;
  if (t.armorDamage !== undefined) e.armorDamage = t.armorDamage;
  if (t.guard && e.guard) Object.assign(e.guard.spec, t.guard);
  if (t.moveSpeed !== undefined) e.moveSpeed = t.moveSpeed;
  if (t.attackCooldown !== undefined) p.attackCooldown = t.attackCooldown;
  if (t.telegraphDuration !== undefined) p.telegraphDuration = t.telegraphDuration;
  if (t.engageRange !== undefined) p.engageRange = t.engageRange;
  if (t.comboChance !== undefined) p.comboChance = t.comboChance;
  if (p.tuning) {
    if (t.interval !== undefined) p.tuning.attackInterval = t.interval;
    if (t.strikeRange !== undefined) p.tuning.strikeRange = t.strikeRange;
  }
}

/** One run of a chapter's fight. */
export async function playOnce(engine: Engine, chapterId: number, skill: BotSkill, seed: number, options: PlaytestOptions = {}): Promise<RunResult> {
  const I = internals(engine);
  const errors: string[] = [];
  const realRandom = Math.random;
  const events: CombatEvent[] = [];
  const cs = engine.combatSystem;
  const prevOnEvent = cs.onEvent;
  cs.onEvent = (e) => {
    prevOnEvent?.(e);
    events.push(e);
  };
  const onError = (e: ErrorEvent) => errors.push(`error: ${e.message}`);
  window.addEventListener('error', onError);
  const hero = engine.player!;
  const maxHealth = hero.maxHealth;
  try {
    Math.random = mulberry32(seed * 7919 + chapterId * 104729 + 17);
    // Every scene plays as on a first attempt: the fight's own (arrival, a fallen boss's last words, an entrance), and
    // nothing is known yet that a fight teaches (the guru's Shakti, the akhada's lesson, the expedition's checkpoint).
    I.seenScenes.clear();
    try {
      localStorage.removeItem(LEARNED_KEY);
    } catch {
      // Storage blocked: nothing saved to forget.
    }
    forgetLesson();
    if (chapterById(chapterId).expedition) new ExpeditionRun(chapterById(chapterId).expedition!, chapterId, true);
    if (options.tune?.health !== undefined) hero.maxHealth = options.tune.health;
    await engine.startChapter(chapterId, { intro: false });
    engine.debugStep(0); // stops the real-time loop: nothing moves between the steps below
    // The boss has roared in the intro the player skipped (a retry would hear it roar at the fight's start instead, a few
    // helpless seconds that a first attempt does not have).
    for (const e of engine.enemies) if (e instanceof Boss) e.settleIntro();
    const bot = new HeroBot(engine, skill, mulberry32(seed * 31337 + chapterId + 5));
    const cap = options.maxSeconds ?? defaultCap(chapterId);
    const hits: HitRecord[] = [];
    const foes: RunResult['foes'] = {};
    const attacks: Record<string, number> = {};
    const lastState = new Map<string, string>();
    const seenProjectiles = new Set<string>();
    let hp = hero.currentHealth;
    let taken = 0;
    let lowest = hp;
    let game = 0;
    let n = 0;
    // Who is fighting, and for how long; and which attacks they begin.
    const sampleFoes = () => {
      if (I.mode !== 'play' && I.mode !== 'handoff' && I.mode !== 'outro' && I.mode !== 'over') return;
      for (const e of engine.enemies) {
        if (!e.group.visible) continue;
        const state = e.stateMachine.currentState;
        const alive = state !== 'DEAD';
        let f = foes[e.id];
        if (!f && alive) f = foes[e.id] = { name: e.displayName, first: I.fightTime, alive: 0, fell: null, hpAtFirst: hero.currentHealth, hpAtFall: null };
        if (f && alive && I.mode === 'play') f.alive += FIXED_DT;
        if (f && !alive && f.fell === null) {
          f.fell = I.fightTime;
          f.hpAtFall = hero.currentHealth;
        }
        if (state !== lastState.get(e.id)) {
          lastState.set(e.id, state);
          if ((state.startsWith('ATTACK') || state === 'SHOVE') && I.mode === 'play') attacks[`${e.displayName} ${state}`] = (attacks[`${e.displayName} ${state}`] ?? 0) + 1;
        }
      }
      for (const p of engine.projectileManager.projectiles) {
        if (seenProjectiles.has(p.id)) continue;
        seenProjectiles.add(p.id);
        if (p.ownerId !== hero.id) attacks[p.type] = (attacks[p.type] ?? 0) + 1;
      }
    };
    const nameOf = (id: string) => foes[id]?.name ?? engine.enemies.find((e) => e.id === id)?.displayName ?? id;
    const trace: string[] | undefined = options.trace ? [] : undefined;
    const every = Math.max(1, Math.round((options.trace?.every ?? 0.5) * 60));
    let before = new Set(engine.projectileManager.projectiles.map((p) => p.id));
    let projectileTypes = new Map(engine.projectileManager.projectiles.map((p) => [p.id, p.type] as const));
    let step = 0;
    while (game < cap) {
      bot.step(FIXED_DT);
      events.length = 0;
      engine.debugAdvance(FIXED_DT);
      game += FIXED_DT;
      step++;
      if (trace) {
        for (const e of events) {
          if (e.defender === hero.id) trace.push(`${game.toFixed(2)}   >> ${e.attacker} ${e.attack}@${e.at.toFixed(2)} ${e.result}`);
        }
        if (game >= (options.trace?.from ?? 0) && step % every === 0) {
          const hp0 = hero.getPosition();
          const near = engine.enemies.filter((e) => e.group.visible && e.stateMachine.currentState !== 'DEAD')
            .map((e) => ({ e, d: e.getPosition().distanceTo(hp0) })).sort((a, b) => a.d - b.d).slice(0, options.trace?.enemies ?? 4)
            .map(({ e, d }) => `${e.id.slice(0, 10)} ${e.stateMachine.currentState}@${e.stateMachine.stateTime.toFixed(2)} d${d.toFixed(1)} hp${Math.round(e.currentHealth)}`);
          trace.push(`${game.toFixed(2)} [${I.mode}] hero ${hero.stateMachine.currentState}@${hero.stateMachine.stateTime.toFixed(2)} (${hp0.x.toFixed(1)},${hp0.z.toFixed(1)}) hp${Math.round(hero.currentHealth)} m${Math.round(hero.currentMarma)} | ${near.join(' | ')}`);
        }
      }

      sampleFoes();

      // What the hero took this step, and from whom.
      const now = hero.currentHealth;
      if (now < hp - 1e-6) {
        const dmg = hp - now;
        taken += dmg;
        const mine = events.filter((e) => e.defender === hero.id && (e.result === 'player-hit' || e.result === 'blocked'));
        if (mine.length) {
          for (const e of mine) {
            hits.push({
              t: +game.toFixed(2), fight: +I.fightTime.toFixed(2), hp: +now.toFixed(1), damage: +(dmg / mine.length).toFixed(1), attacker: e.attacker,
              name: nameOf(e.attacker), attack: e.attack, at: +e.at.toFixed(2), result: e.result,
            });
          }
        } else {
          // A bolt, a shaft or a wave: whichever of them went out this step.
          const gone = [...before].filter((id) => !engine.projectileManager.projectiles.some((p) => p.id === id));
          const type = String(gone.map((id) => projectileTypes.get(id)).find(Boolean) ?? 'projectile');
          hits.push({ t: +game.toFixed(2), fight: +I.fightTime.toFixed(2), hp: +now.toFixed(1), damage: +dmg.toFixed(1), attacker: type, name: type, attack: type, at: null, result: 'player-hit' });
        }
      }
      hp = now;
      lowest = Math.min(lowest, hp);
      before = new Set(engine.projectileManager.projectiles.map((p) => p.id));
      projectileTypes = new Map(engine.projectileManager.projectiles.map((p) => [p.id, p.type] as const));

      if (I.outcome !== null || hero.isDown()) break;
      // A rig still loading (a foe whose model has not come in) needs real time; otherwise a breath now and then.
      const waiting = I.mode === 'play' && engine.enemies.some((e) => !e.rig && e.stateMachine.currentState !== 'DEAD');
      if (waiting || ++n % 40 === 0) await yieldNow();
    }
    bot.release();
    sampleFoes();

    const stats = { ...cs.stats };
    const guards: RunResult['guards'] = {};
    for (const e of engine.enemies) if (e.guard) guards[e.id] = { name: e.displayName, ...e.guard.tally };
    let outcome: RunResult['outcome'] = 'stall';
    let trigger: string | undefined;
    if (I.beaten) {
      outcome = 'scripted-loss';
      const dead = engine.enemies.filter((e) => e.stateMachine.currentState === 'DEAD').length;
      trigger = hero.currentHealth / hero.maxHealth <= 0.3 ? 'health' : dead >= 3 ? 'raiders' : 'time';
    } else if (hero.isDown()) outcome = 'loss';
    else if (I.outcome === 'victory') outcome = 'win';
    else if (I.outcome === 'defeat') outcome = 'loss';
    const answers: Record<string, number> = {};
    for (const ev of bot.events) answers[ev.kind] = (answers[ev.kind] ?? 0) + 1;
    return {
      chapter: chapterId, seed, skill: skill.name, outcome, trigger, fightTime: +I.fightTime.toFixed(2), gameTime: +game.toFixed(1),
      hpLeft: Math.round(hero.currentHealth), damageTaken: Math.round(taken), lowestHp: Math.round(lowest), stats, guards, foes, hits, attacks, answers, errors, trace,
    };
  } finally {
    Math.random = realRandom;
    hero.maxHealth = maxHealth;
    cs.onEvent = prevOnEvent;
    window.removeEventListener('error', onError);
  }
}

// ---------------------------------------------------------------------------------------------------- reports

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (i - lo);
}
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export interface SourceRow {
  /** "Shalva ATTACK_1", "Cave runt ATTACK_2", "ORB". */
  source: string;
  /** Times thrown (all runs), landed on the hero, met on his guard. */
  thrown: number;
  hits: number;
  blocked: number;
  /** Hits as a share of the times thrown. */
  hitRate: number | null;
  damage: number;
  /** Mean damage per run. */
  perRun: number;
  /** Share of all damage taken. */
  share: number;
  /** Seconds into the attack at which it landed: the warning the wind-up gave (shortest, mean). */
  warnMin: number | null;
  warnMean: number | null;
}

export interface ChapterReport {
  chapter: number;
  name: string;
  skill: string;
  runs: number;
  wins: number;
  losses: number;
  scripted: number;
  stalls: number;
  winRate: number;
  /** Fight seconds of the runs that ended in a win (or the scripted loss). */
  time: { mean: number; median: number; p10: number; p90: number };
  /** Health lost per run that was won (or the scripted loss), and in every run. */
  damage: { mean: number; median: number; p90: number };
  damageAll: number;
  /** Mean lowest health reached. */
  lowest: number;
  stats: { hitsTaken: number; blocks: number; deflections: number; postureBreaks: number; bossBlocks: number; guardBreaks: number };
  /** Per boss that guards, per run on average: its guard raised, blows turned aside, guards broken, answers, kicks. */
  guards: { name: string; raised: number; blocked: number; broken: number; answers: number; shoves: number }[];
  sources: SourceRow[];
  foes: { id: string; name: string; alive: number; first: number; hpAtFirst: number; hpAtFall: number | null; fell: number }[];
  /** The deaths: who finished the hero, and when in the fight (seconds), per losing run. */
  deaths: { seed: number; fight: number; by: string }[];
  triggers?: Record<string, number>;
  answers: Record<string, number>;
  runsDetail?: RunResult[];
  summary: string[];
}

export function summarise(chapter: number, results: RunResult[], detail = false): ChapterReport {
  const done = results.filter((r) => r.outcome === 'win' || r.outcome === 'scripted-loss');
  const times = done.map((r) => r.fightTime);
  const dmg = done.map((r) => r.damageTaken);
  const bySource = new Map<string, { hits: number; blocked: number; damage: number; at: number[] }>();
  const thrown = new Map<string, number>();
  let total = 0;
  for (const r of results) {
    for (const [k, v] of Object.entries(r.attacks ?? {})) thrown.set(k, (thrown.get(k) ?? 0) + v);
    for (const h of r.hits) {
      const k = h.name === h.attack ? h.name : `${h.name} ${h.attack}`;
      const row = bySource.get(k) ?? { hits: 0, blocked: 0, damage: 0, at: [] };
      if (h.result === 'blocked') row.blocked++;
      else row.hits++;
      row.damage += h.damage;
      if (h.at !== null) row.at.push(h.at);
      bySource.set(k, row);
      total += h.damage;
    }
  }
  const keys = new Set([...bySource.keys(), ...thrown.keys()]);
  const sources: SourceRow[] = [...keys].map((source) => {
    const v = bySource.get(source) ?? { hits: 0, blocked: 0, damage: 0, at: [] };
    const t = thrown.get(source) ?? 0;
    return {
      source, thrown: t, hits: v.hits, blocked: v.blocked, hitRate: t ? r2(v.hits / t) : null, damage: Math.round(v.damage),
      perRun: r1(v.damage / Math.max(1, results.length)), share: r2(v.damage / Math.max(1, total)),
      warnMin: v.at.length ? r2(Math.min(...v.at)) : null, warnMean: v.at.length ? r2(mean(v.at)) : null,
    };
  }).sort((a, b) => b.damage - a.damage || b.thrown - a.thrown);
  const foeIds = new Set<string>();
  results.forEach((r) => Object.keys(r.foes).forEach((id) => foeIds.add(id)));
  const foes = [...foeIds].map((id) => {
    const rows = results.map((r) => r.foes[id]).filter(Boolean);
    const fell = rows.filter((f) => f.fell !== null);
    return {
      id, name: rows[0].name, alive: r1(mean(rows.map((f) => f.alive))), first: r1(mean(rows.map((f) => f.first))),
      hpAtFirst: Math.round(mean(rows.map((f) => f.hpAtFirst))), hpAtFall: fell.length ? Math.round(mean(fell.map((f) => f.hpAtFall ?? 0))) : null,
      fell: fell.length / rows.length,
    };
  }).sort((a, b) => a.first - b.first);
  const answers: Record<string, number> = {};
  for (const r of results) for (const [k, v] of Object.entries(r.answers)) answers[k] = (answers[k] ?? 0) + v;
  for (const k of Object.keys(answers)) answers[k] = r1(answers[k] / results.length);
  const deaths = results.filter((r) => r.outcome === 'loss').map((r) => {
    const last = r.hits[r.hits.length - 1];
    return { seed: r.seed, fight: r.fightTime, by: last ? (last.name === last.attack ? last.name : `${last.name} ${last.attack}`) : '?' };
  });
  const triggers: Record<string, number> = {};
  for (const r of results) if (r.trigger) triggers[r.trigger] = (triggers[r.trigger] ?? 0) + 1;
  const m = (f: (r: RunResult) => number) => r1(mean(results.map(f)));
  const report: ChapterReport = {
    chapter, name: chapterById(chapter).name, skill: results[0]?.skill ?? '', runs: results.length,
    wins: results.filter((r) => r.outcome === 'win').length, losses: results.filter((r) => r.outcome === 'loss').length,
    scripted: results.filter((r) => r.outcome === 'scripted-loss').length, stalls: results.filter((r) => r.outcome === 'stall').length,
    winRate: r2(results.filter((r) => r.outcome === 'win' || r.outcome === 'scripted-loss').length / Math.max(1, results.length)),
    time: { mean: r1(mean(times)), median: r1(quantile(times, 0.5)), p10: r1(quantile(times, 0.1)), p90: r1(quantile(times, 0.9)) },
    damage: { mean: r1(mean(dmg)), median: r1(quantile(dmg, 0.5)), p90: r1(quantile(dmg, 0.9)) },
    damageAll: m((r) => r.damageTaken), lowest: m((r) => r.lowestHp),
    stats: {
      hitsTaken: m((r) => r.stats.hitsTaken), blocks: m((r) => r.stats.blocks), deflections: m((r) => r.stats.deflections), postureBreaks: m((r) => r.stats.postureBreaks),
      bossBlocks: m((r) => r.stats.bossBlocks ?? 0), guardBreaks: m((r) => r.stats.guardBreaks ?? 0),
    },
    guards: summariseGuards(results),
    sources, foes, deaths, answers, triggers: Object.keys(triggers).length ? triggers : undefined,
    summary: [],
  };
  if (detail) report.runsDetail = results;
  report.summary = lines(report, results);
  return report;
}

/** Each boss's guard, averaged over the runs it was in. */
function summariseGuards(results: RunResult[]): ChapterReport['guards'] {
  const by = new Map<string, { name: string; n: number; raised: number; blocked: number; broken: number; answers: number; shoves: number }>();
  for (const r of results) {
    for (const g of Object.values(r.guards ?? {})) {
      const row = by.get(g.name) ?? { name: g.name, n: 0, raised: 0, blocked: 0, broken: 0, answers: 0, shoves: 0 };
      row.n++;
      row.raised += g.raised;
      row.blocked += g.blocked;
      row.broken += g.broken;
      row.answers += g.answers;
      row.shoves += g.shoves;
      by.set(g.name, row);
    }
  }
  return [...by.values()].map((g) => ({
    name: g.name, raised: r1(g.raised / g.n), blocked: r1(g.blocked / g.n), broken: r1(g.broken / g.n), answers: r1(g.answers / g.n), shoves: r1(g.shoves / g.n),
  }));
}

/** A report as a few lines of text, for a table or a log. */
function lines(r: ChapterReport, results: RunResult[]): string[] {
  const out: string[] = [];
  const head = `${r.chapter} ${r.name} [${r.skill}] ${r.runs} runs: win ${Math.round(r.winRate * 100)}% (${r.wins} won, ${r.scripted} scripted, ${r.losses} lost, ${r.stalls} stalled)`;
  out.push(head);
  out.push(`  fight ${r.time.median}s median (${r.time.p10}-${r.time.p90}), mean ${r.time.mean}s; damage taken ${r.damage.mean} (median ${r.damage.median}, p90 ${r.damage.p90}); lowest hp ${r.lowest}; hits ${r.stats.hitsTaken}, blocks ${r.stats.blocks}, deflections ${r.stats.deflections}, breaks ${r.stats.postureBreaks}`);
  for (const g of r.guards) out.push(`  ${g.name}'s guard per run: raised ${g.raised}, turned aside ${g.blocked}, broken ${g.broken}; answers ${g.answers} (kicks ${g.shoves})`);
  // One line per kind of foe (a pack's members are alike).
  const kinds = new Map<string, { n: number; alive: number; first: number; fell: number }>();
  for (const f of r.foes) {
    const k = kinds.get(f.name) ?? { n: 0, alive: 0, first: 0, fell: 0 };
    k.n++;
    k.alive += f.alive;
    k.first = k.n === 1 ? f.first : Math.min(k.first, f.first);
    k.fell += f.fell;
    kinds.set(f.name, k);
  }
  for (const [name, k] of kinds) out.push(`  ${name}${k.n > 1 ? ` x${k.n}` : ''}: from ${r1(k.first)}s, stood ${r1(k.alive / k.n)}s each, fell in ${Math.round((k.fell / k.n) * 100)}%`);
  for (const s of r.sources.slice(0, 9)) {
    out.push(`  ${s.source}: thrown ${s.thrown}, hit ${s.hits}${s.blocked ? ` (+${s.blocked} blocked)` : ''}${s.hitRate === null ? '' : ` = ${Math.round(s.hitRate * 100)}%`}, ${s.perRun}/run (${Math.round(s.share * 100)}% of damage)${s.warnMin === null ? '' : `, landed ${s.warnMin}-${s.warnMean}s in`}`);
  }
  if (r.deaths.length) out.push(`  deaths: ${r.deaths.map((d) => `${d.by}@${d.fight}s`).join(', ')}`);
  if (r.triggers) out.push(`  scripted loss by: ${JSON.stringify(r.triggers)}`);
  out.push(`  bot: ${JSON.stringify(r.answers)}; errors: ${results.reduce((n, x) => n + x.errors.length, 0)}`);
  return out;
}

declare global {
  interface Window {
    __playtestProgress?: { chapter: number; run: number; runs: number; done: boolean };
  }
}

/**
 * Plays `runs` fights of each chapter in `chapters` (an id or a list) and reports. Starts the seeds at `options.seed`
 * (default 1). Leaves the engine stopped (`debugResume` puts real time back).
 */
export async function runPlaytest(engine: Engine, chapters: number | number[], runs = 10, options: PlaytestOptions = {}): Promise<ChapterReport[]> {
  const list = Array.isArray(chapters) ? chapters : [chapters];
  const skill = skillOf(options.skill);
  const seed0 = options.seed ?? 1;
  const reports: ChapterReport[] = [];
  await withSession(options, async () => {
    for (const id of list) {
      const results: RunResult[] = [];
      for (let i = 0; i < runs; i++) {
        window.__playtestProgress = { chapter: id, run: i, runs, done: false };
        results.push(await playOnce(engine, id, skill, seed0 + i, options));
      }
      reports.push(summarise(id, results, options.detail));
    }
  });
  window.__playtestProgress = { chapter: list[list.length - 1], run: runs, runs, done: true };
  return reports;
}

/** One run with its blow-by-blow `trace` (a line every half second, every blow the hero takes): what a fight looked like. */
export async function traceFight(engine: Engine, chapter: number, options: PlaytestOptions = {}): Promise<{ run: RunResult; lines: string[] }> {
  return withSession(options, async () => {
    const run = await playOnce(engine, chapter, skillOf(options.skill), options.seed ?? 1, { ...options, trace: options.trace ?? {} });
    return { run, lines: run.trace ?? [] };
  });
}

export { CHAPTERS, SKILLS };
export type { Enemy };

import * as THREE from 'three';
import type { Engine } from '../core/Engine';
import type { InputState, PressAction } from '../core/InputManager';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { CharacterState } from '../entities/CharacterStateMachine';
import { CharacterMotor } from '../physics/CharacterMotor';
import { Settings } from '../core/Settings';

/*
 * The hero bot (docs/STORY.md, "Milestone 12"): plays Yudhveer through the engine's own input path, for the playtest
 * (`__debug.playtest`, src/debug/Playtest.ts). Dev builds only.
 *
 * It is meant to stand in for a player, not a solver: it sees what a player sees (where everyone is, what state they are
 * in, a blow's wind-up, a bolt in the air) and answers it the way a player's hands would, a reaction time late and with
 * a little error: a parry pressed a hair early or late (early ones fall back to a block, as the game intends), a slide,
 * a held guard. Between blows it closes in, strikes, chains, and waits for a safe moment to commit a swing. Three skills
 * bracket the players the game has (`SKILLS`); the steady one is the yardstick for the difficulty curve.
 *
 * It presses what a keyboard would: Mouse2 held for the guard, buffered taps for the rest, the camera turned through
 * the mouse's own path, and the stick's analogue push for movement (relative to the camera, as WASD is).
 */

const FIXED_DT = 1 / 60;
const UP = new THREE.Vector3(0, 1, 0);

/** How a bot player plays; see `SKILLS`. */
export interface BotSkill {
  name: string;
  /** Seconds from a cue becoming visible to the bot acting on it. */
  react: number;
  /** Timing error (s, standard deviation) on slides, guards and parries. */
  jitter: number;
  /** Chance it answers a given blow at all (it can be looking elsewhere, or simply late). */
  attention: number;
  /** Of its answers, the share that are parries when it has the dhal (else a guard or a slide). */
  parry: number;
  /** Of the rest, the share that are guards (when it has one) rather than slides. */
  guard: number;
  /** Seconds before a blow it has seen coming that it will not start a swing (waits for it to pass); 0 trades blows. */
  patience: number;
  /** Uses Shakti and the leaping strike when it is safe to. */
  tricks: boolean;
  /** How fast it turns the camera (rad/s). */
  look: number;
}

export const SKILLS: Record<string, BotSkill> = {
  // A first-time player: slow to see a blow, answers about half of them, trades blows rather than waiting.
  novice: { name: 'novice', react: 0.42, jitter: 0.1, attention: 0.7, parry: 0.1, guard: 0.5, patience: 0, tricks: false, look: 3 },
  // Someone who has played a few fights: sees most blows, parries some, slides the rest, mostly waits for a blow to pass.
  steady: { name: 'steady', react: 0.3, jitter: 0.06, attention: 0.9, parry: 0.4, guard: 0.35, patience: 0.35, tricks: true, look: 6 },
  // A veteran of the game: quick, nearly always answers, parries most things, punishes every opening.
  expert: { name: 'expert', react: 0.2, jitter: 0.035, attention: 0.97, parry: 0.75, guard: 0.2, patience: 0.5, tricks: true, look: 9 },
};

/** What the bot reads of an enemy beyond the public API. */
interface EnemyPrivates {
  isTelegraphing: boolean;
  telegraphTimer: number;
  telegraphDuration: number;
  engageRange: number;
  attackStates: string[];
  attackIndex: number;
  tuning?: { strikeRange: number; leapMax: number; leapRange: number };
  lungeSpec: { maxDist: number };
  route: THREE.Vector3[];
}
const priv = (e: Enemy) => e as unknown as EnemyPrivates;

interface Tracker {
  state: string;
  /** Attack instances so far (a telegraph, or a swing not preceded by one, starts a new one). */
  serial: number;
  seenAt: number;
  telegraphing: boolean;
  telegraphEndedAt: number;
  /** When a caster last began its cast (or a hurler its draw): the cue its bolt is the end of. */
  cueAt: number;
  casting: boolean;
  /** A dive (Shalva's) seen coming: when the water began to churn. */
  diveAt: number;
}

/** One blow on its way to the hero: from a swing's strike window, a bolt, a wave of fire. */
export interface Threat {
  key: string;
  /** All the blows of one attack share a group. */
  group: string;
  kind: 'melee' | 'bolt' | 'wave';
  source: string;
  /** Seconds until it can land (its strike window opens), until it is most likely to, and until it is over. */
  tHit: number;
  tContact: number;
  tEnd: number;
  /** Ground direction from the hero to where it comes from (unit). */
  dir: THREE.Vector3;
  seenAt: number;
  /** Where it came from (the enemy's position). */
  from: THREE.Vector3;
}

type Action =
  | { kind: 'slide'; at: number; dir: THREE.Vector3 }
  | { kind: 'parry'; at: number; hold: number }
  | { kind: 'guard'; at: number; until: number };

export interface BotEvent {
  t: number;
  kind: 'parry' | 'slide' | 'guard' | 'missed' | 'late';
  source: string;
  lead: number;
}

interface View {
  e: Enemy;
  dist: number;
  /** Ground direction from the hero to it (unit). */
  dir: THREE.Vector3;
}

/** The island's walkable line, from the landing to the altar (build_island.py's PATH, after the sea cave). */
const ISLAND_ROUTE: [number, number][] = [[0, -3], [-2, -9], [-1, -14], [0, -18], [0, -25], [5, -30], [9, -34], [11, -39], [10, -46],
  [8, -54], [4, -58], [1, -62], [0, -70], [0, -74.4]];

const CASTERS = new Set(['Mayavi', 'Yatudhana', 'Cave hurler']);

/** Shalva's dive (entities/BossShalva.ts): seconds under the water, the last of it the boil, and the smash after he breaks the surface. */
const DIVE = { under: 2.0, boil: 0.55, reaction: 1.0 };

const wrap = (a: number) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

interface EngineInternals {
  mode: string;
  chapter: { id: number; level: number } | null;
  expedition: { complete: boolean } | null;
}

export class HeroBot {
  public events: BotEvent[] = [];
  private now = 0;
  private readonly trackers = new Map<string, Tracker>();
  private readonly seenAtKey = new Map<string, number>();
  /** When the bot will have noticed each attack (its first sight of it, plus its reaction). */
  private readonly noticeAt = new Map<string, number>();
  private readonly answered = new Set<string>();
  private actions: Action[] = [];
  private guardUntil = -1;
  private guardFrom = Infinity;
  private lastAttackPress = -1;
  private lastCharge = -99;
  private routeIndex = 0;
  private routed = false;
  private charging = false;
  /** Closing in that goes nowhere (see `trackProgress`). */
  private progressAt = -1;
  private progressDist = 0;
  private lastApproach = -9;
  private detourUntil = -1;
  private detourSide: 1 | -1 = 1;
  private readonly detour = new THREE.Vector3();
  private readonly original: () => InputState;
  private readonly input;
  private readonly player: Player;
  private move: { x: number; z: number; sprint: boolean } | null = null;
  private lookTarget: THREE.Vector3 | null = null;

  constructor(private readonly engine: Engine, public readonly skill: BotSkill, private readonly rng: () => number) {
    this.input = engine.inputManager;
    this.player = engine.player!;
    this.original = this.input.getState.bind(this.input);
    // The stick's analogue push: movement is whatever the bot decided this step; everything else is the real state.
    this.input.getState = (): InputState => {
      const s = this.original();
      if (this.move) {
        const yaw = this.engine.sceneManager.viewYaw;
        const c = Math.cos(yaw);
        const sn = Math.sin(yaw);
        // WASD's inverse: forward is -(sin, cos), right is (cos, -sin) in the view's frame.
        s.moveX = c * this.move.x - sn * this.move.z;
        s.moveY = -sn * this.move.x - c * this.move.z;
        s.sprint = this.move.sprint;
        s.walk = false;
      } else {
        s.moveX = 0;
        s.moveY = 0;
        s.sprint = false;
      }
      return s;
    };
  }

  /** Gives the keyboard back: nothing held, no push on the stick. */
  public release(): void {
    this.input.getState = this.original;
    this.input.keys.Mouse2 = false;
    this.input.keys.KeyQ = false;
  }

  private tap(action: PressAction): void {
    (this.input as unknown as { press(a: PressAction): void }).press(action);
  }

  /** A normal deviate (Box-Muller) from the seeded generator. */
  private gauss(): number {
    const u = Math.max(1e-9, this.rng());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * this.rng());
  }

  private get internals(): EngineInternals {
    return this.engine as unknown as EngineInternals;
  }

  /** One decision, before the engine's fixed step. */
  public step(dt: number = FIXED_DT): void {
    this.now += dt;
    const player = this.player;
    this.move = null;
    this.input.keys.Mouse2 = false;
    this.input.keys.KeyQ = false;
    const mode = this.internals.mode;
    if ((mode !== 'play' && mode !== 'handoff') || player.isDown()) {
      this.actions = [];
      this.guardUntil = -1;
      this.charging = false;
      return;
    }
    const views = this.enemyViews();
    const threats = this.collectThreats(views);
    this.plan(threats, views);
    this.act(threats, views, dt);
  }

  // ---------------------------------------------------------------------------------------------------- seeing

  private enemyViews(): View[] {
    const hero = this.player.getPosition();
    const views: View[] = [];
    for (const e of this.engine.enemies) {
      if (e.stateMachine.currentState === 'DEAD' || !e.group.visible) continue;
      // The cue of a cast or a draw, seen from the first moment of it (the bolt comes later).
      const tr = this.tracker(e);
      const casting = e.stateMachine.currentState === 'CAST' || (!e.isBoss && e.stateMachine.currentState === 'CHARGE') || ((e as unknown as { drawing?: number }).drawing ?? 0) > 0;
      if (casting && !tr.casting) tr.cueAt = this.now;
      tr.casting = casting;
      if (e.submerged) continue;
      const d = new THREE.Vector3(e.getPosition().x - hero.x, 0, e.getPosition().z - hero.z);
      const dist = d.length();
      views.push({ e, dist, dir: dist > 1e-6 ? d.divideScalar(dist) : new THREE.Vector3(0, 0, 1) });
    }
    return views.sort((a, b) => a.dist - b.dist);
  }

  private tracker(e: Enemy): Tracker {
    let t = this.trackers.get(e.id);
    if (!t) {
      t = { state: e.stateMachine.currentState, serial: 0, seenAt: this.now, telegraphing: false, telegraphEndedAt: -9, cueAt: -99, casting: false, diveAt: -99 };
      this.trackers.set(e.id, t);
    }
    return t;
  }

  /**
   * Whether the hero is inside the area a swing can reach: a boss's strike range, a minion's engage range and lunge. A
   * leap's last blow (`landing`) is its landing, which reaches wherever he stands within the run; its first is the take-off.
   */
  private inReach(e: Enemy, dist: number, state: string, landing = false): boolean {
    const p = priv(e);
    if (state === 'ATTACK_JUMP' && landing) return dist <= (p.tuning?.leapMax ?? 8) + 2;
    const reach = e.isBoss ? (p.tuning?.strikeRange ?? 3.5) + 1.6 : p.engageRange + (p.lungeSpec?.maxDist ?? 1.2) + 0.7;
    return dist <= reach;
  }

  private collectThreats(views: View[]): Threat[] {
    const threats: Threat[] = [];
    for (const { e, dist, dir } of views) {
      const tr = this.tracker(e);
      const state = e.stateMachine.currentState;
      const p = priv(e);
      const telegraphing = p.isTelegraphing;
      if (telegraphing && !tr.telegraphing) {
        tr.serial++;
        tr.seenAt = this.now;
      }
      if (!telegraphing && tr.telegraphing) tr.telegraphEndedAt = this.now;
      tr.telegraphing = telegraphing;
      if (state !== tr.state) {
        // A new swing: part of the telegraph that preceded it, else an attack of its own (a boss's, or a chained blow).
        if (state.startsWith('ATTACK') && this.now - tr.telegraphEndedAt > 0.15) {
          tr.serial++;
          tr.seenAt = this.now;
        }
        tr.state = state;
      }
      const group = `${e.id}:${tr.serial}`;
      if (!this.noticeAt.has(group) && (telegraphing || state.startsWith('ATTACK'))) {
        this.noticeAt.set(group, tr.seenAt + this.skill.react + Math.abs(this.gauss()) * 0.03);
      }
      if (telegraphing) {
        // Its swing is coming: after the rest of its wind-up, the first strike of the next attack on its list.
        const next = (p.attackStates[p.attackIndex % p.attackStates.length] ?? 'ATTACK_1') as CharacterState;
        const windUp = e.rig ? Math.min(p.telegraphDuration, 0.3) : p.telegraphDuration;
        const lead = Math.max(0, windUp - p.telegraphTimer);
        const w = e.hitWindows(next)[0] ?? e.hitWindows('ATTACK_1')[0];
        if (w && this.inReach(e, dist, next)) {
          threats.push({
            key: `${group}:${next}:0`, group, kind: 'melee', source: e.id, from: e.getPosition().clone(), dir,
            tHit: lead + w.t0, tContact: lead + w.t0 + 0.3 * (w.t1 - w.t0), tEnd: lead + w.t1, seenAt: tr.seenAt,
          });
        }
      } else if (state.startsWith('ATTACK')) {
        const t = e.stateMachine.stateTime;
        const windows = e.hitWindows(state);
        windows.forEach((w, i) => {
          if (w.t1 <= t || !this.inReach(e, dist, state, i === windows.length - 1)) return;
          threats.push({
            key: `${group}:${state}:${i}`, group, kind: 'melee', source: e.id, from: e.getPosition().clone(), dir,
            tHit: w.t0 - t, tContact: Math.max(0.02, w.t0 + 0.3 * (w.t1 - w.t0) - t), tEnd: w.t1 - t, seenAt: tr.seenAt,
          });
        });
      }
    }
    // A boss under the water (Shalva's dive): the pool churns where he will come up, and his smash lands a second after.
    for (const e of this.engine.enemies) {
      const dive = (e as unknown as { dive?: { phase: string; t: number; burst: THREE.Vector3 } | null }).dive;
      if (!e.submerged || !dive || dive.phase !== 'under' || dive.t < DIVE.under - DIVE.boil) continue;
      const tr = this.tracker(e);
      if (this.now - tr.diveAt > 3) {
        tr.diveAt = this.now;
        tr.serial++;
      }
      const hp = this.player.getPosition();
      const d = new THREE.Vector3(dive.burst.x - hp.x, 0, dive.burst.z - hp.z);
      if (d.length() > 3.6) continue;
      const group = `${e.id}:${tr.serial}`;
      if (!this.noticeAt.has(group)) this.noticeAt.set(group, tr.diveAt + this.skill.react + Math.abs(this.gauss()) * 0.03);
      const lead = Math.max(0, DIVE.under - dive.t);
      threats.push({
        key: `${group}:burst`, group, kind: 'melee', source: e.id, from: dive.burst.clone(), dir: d.length() > 1e-6 ? d.normalize() : new THREE.Vector3(0, 0, 1),
        tHit: lead + DIVE.reaction - 0.2, tContact: lead + DIVE.reaction, tEnd: lead + DIVE.reaction + 0.15, seenAt: tr.diveAt,
      });
    }
    // Bolts and waves in the air, from the first moment they are.
    const hero = this.player.getPosition();
    const chest = new THREE.Vector3(hero.x, hero.y + 0.9, hero.z);
    for (const pr of this.engine.projectileManager.projectiles) {
      if (pr.isParried || pr.ownerId === this.player.id) continue;
      const r = pr.position.clone().sub(chest);
      const speed = pr.velocity.length();
      if (speed < 1e-3) continue;
      const v = pr.velocity.clone().divideScalar(speed);
      const along = -r.dot(v); // distance still to go to the closest point
      if (along < -0.3) continue;
      const miss = r.clone().addScaledVector(v, along).length();
      const hitR = pr.radius + 0.5;
      if (miss > hitR + 0.25) continue;
      const tHit = Math.max(0, (along - Math.sqrt(Math.max(0, hitR * hitR - miss * miss))) / speed);
      const key = `proj:${pr.id}`;
      if (!this.seenAtKey.has(key)) {
        // A bolt is the end of a cast, and the cast was in plain sight: a player is ready for it from the cue.
        const cue = this.trackers.get(pr.ownerId)?.cueAt ?? -99;
        const seen = this.now - cue < 2 ? cue : this.now;
        this.seenAtKey.set(key, seen);
        this.noticeAt.set(key, seen + this.skill.react + Math.abs(this.gauss()) * 0.03);
      }
      const dir = new THREE.Vector3(-r.x, 0, -r.z);
      if (dir.lengthSq() > 1e-8) dir.normalize();
      else dir.set(0, 0, 1);
      threats.push({
        key, group: key, kind: pr.type === 'FLAME_WAVE' ? 'wave' : 'bolt', source: pr.ownerId, from: pr.position.clone(), dir,
        tHit, tContact: tHit + 0.03, tEnd: tHit + 0.25, seenAt: this.seenAtKey.get(key)!,
      });
    }
    return threats;
  }

  // ---------------------------------------------------------------------------------------------------- answering

  /** Seconds until the hero's hands are free for a defence: a swing may be cut short at its cancel point. */
  private freeIn(): number {
    const sm = this.player.stateMachine;
    const state = sm.currentState;
    if (state.startsWith('ATTACK')) {
      const at = sm.cancelAt[state];
      return at === undefined ? Math.max(0, sm.attackDuration(state) - sm.stateTime) : Math.max(0, at - sm.stateTime);
    }
    if (state === 'DODGE') return Math.max(0, 0.8 - sm.stateTime);
    if (state === 'STAGGER' || state === 'DEFLECTED' || state === 'BLOCK_HIT') return 9;
    return 0;
  }

  /** The training's vanara is in the arena: the lesson asks for the guard, then the parry, and a player does as he says. */
  private inLesson(): boolean {
    return this.engine.enemies.some((e) => e.displayName === 'Old Vanara' && e.group.visible && e.stateMachine.currentState !== 'DEAD');
  }

  /** Decides the answer to every blow the bot has had time to notice. */
  private plan(threats: Threat[], views: View[]): void {
    const player = this.player;
    const skill = this.skill;
    const lesson = this.inLesson();
    // The earliest first: one answer may cover those that follow it.
    const open = threats.filter((t) => !this.answered.has(t.key)).sort((a, b) => a.tContact - b.tContact);
    for (const t of open) {
      if (this.answered.has(t.key)) continue;
      if (this.now < (this.noticeAt.get(t.group) ?? 0)) continue;
      const free = this.freeIn();
      const lead = t.tContact;
      const group = threats.filter((o) => o.group === t.group);
      if (!lesson && this.rng() > skill.attention) {
        group.forEach((o) => this.answered.add(o.key));
        this.events.push({ t: this.now, kind: 'missed', source: t.source, lead });
        continue;
      }
      const hasParry = player.can('parry');
      const hasGuard = player.can('block');
      const hasSlide = player.can('dodge');
      const postureHigh = player.currentMarma > player.maxMarma * 0.65;
      const earliest = Math.max(0, free);
      let choice: 'parry' | 'guard' | 'slide' | 'none' = 'none';
      if (lesson) {
        // Stage one: take his blows on the dhal. Stage two: turn them.
        if (hasParry && lead - earliest >= 0.1) choice = 'parry';
        else if (hasGuard && lead - earliest >= 0.4) choice = 'guard';
      } else if (hasParry && this.rng() < skill.parry && lead - earliest >= 0.1) choice = 'parry';
      else if (hasGuard && !postureHigh && this.rng() < skill.guard && lead - earliest >= 0.4) choice = 'guard';
      else if (hasSlide && lead - earliest >= 0.13 && this.slideRoute(t, views, group.filter((o) => o.tContact >= lead - 0.1).length)) choice = 'slide';
      else if (hasParry && lead - earliest >= 0.1) choice = 'parry';
      else if (hasGuard && lead - earliest >= 0.35) choice = 'guard';
      if (choice === 'none') {
        // Too late for this blow; the ones that follow it are still to be answered.
        group.filter((o) => Math.abs(o.tContact - lead) < 0.15).forEach((o) => this.answered.add(o.key));
        this.answered.add(t.key);
        this.events.push({ t: this.now, kind: 'late', source: t.source, lead });
        continue;
      }
      const jitter = this.gauss() * skill.jitter;
      if (choice === 'parry') {
        // Aimed a hair ahead of the blow: pressed early it falls back to a block, pressed late it is a hit.
        const at = Math.max(earliest, lead - 0.1 + jitter);
        this.actions.push({ kind: 'parry', at: this.now + at, hold: Math.max(0.45, t.tEnd - at + 0.1) });
        this.answered.add(t.key);
        this.events.push({ t: this.now, kind: 'parry', source: t.source, lead });
      } else if (choice === 'guard') {
        const last = Math.max(...group.map((o) => o.tEnd));
        this.actions.push({ kind: 'guard', at: this.now + Math.max(earliest, lead - 0.5 + jitter * 0.5), until: this.now + last + 0.2 });
        group.forEach((o) => this.answered.add(o.key));
        this.events.push({ t: this.now, kind: 'guard', source: t.source, lead });
      } else {
        const at = Math.max(earliest, lead - 0.3 + jitter);
        const dir = this.slideRoute(t, views, group.filter((o) => o.tContact >= lead - 0.1).length)!;
        this.actions.push({ kind: 'slide', at: this.now + at, dir });
        // The slide is untouchable from 0.09 s to 0.66 s in: whatever lands in that span is covered.
        const from = this.now + at + 0.1;
        const to = this.now + at + 0.62;
        threats.forEach((o) => {
          const when = this.now + o.tContact;
          if (when >= from && when <= to) this.answered.add(o.key);
        });
        this.answered.add(t.key);
        this.events.push({ t: this.now, kind: 'slide', source: t.source, lead });
      }
    }
    if (this.answered.size > 400) {
      const live = new Set(threats.map((t) => t.key));
      for (const k of [...this.answered]) if (!live.has(k)) this.answered.delete(k);
    }
    if (this.noticeAt.size > 600) {
      const live = new Set(threats.map((t) => t.group));
      for (const k of [...this.noticeAt.keys()]) if (!live.has(k)) this.noticeAt.delete(k);
    }
  }

  /**
   * The way to slide for a threat: onto ground, away from everyone about to strike, sideways of the blow by preference
   * (a bolt or a wave is crossed, never run along). Null when there is none.
   */
  private slideRoute(t: Threat, views: View[], blows = 1): THREE.Vector3 | null {
    const hero = this.player.getPosition();
    let best: THREE.Vector3 | null = null;
    let bestScore = -Infinity;
    for (const deg of [90, -90, 135, -135, 180, 45, -45, 0]) {
      const d = t.dir.clone().applyAxisAngle(UP, THREE.MathUtils.degToRad(deg)).setY(0).normalize();
      const end = hero.clone().addScaledVector(d, 3.6);
      if (!CharacterMotor.hasGround(end, 1.4)) continue;
      let score = 0;
      for (const v of views) {
        const gap = Math.hypot(v.e.getPosition().x - end.x, v.e.getPosition().z - end.z);
        score += Math.min(gap, 5) * (v.e.stateMachine.currentState.startsWith('ATTACK') || priv(v.e).isTelegraphing ? 1.5 : 0.5);
      }
      // Sideways keeps him in the fight; straight back only buys room; through the blow is the last resort.
      const a = Math.abs(deg);
      score += a === 90 ? 1.5 : a === 135 ? 1 : a === 180 ? 0.5 : 0;
      // A string of blows is run from, not crossed: out of its reach for the rest of it.
      if (blows > 1 && a >= 135) score += 4;
      if (t.kind !== 'melee' && a === 90) score += 3;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  }

  // ---------------------------------------------------------------------------------------------------- acting

  private act(threats: Threat[], views: View[], dt: number): void {
    const player = this.player;
    const state = player.stateMachine.currentState;
    const hero = player.getPosition();

    // Scheduled answers come due.
    let slid = false;
    for (const a of [...this.actions]) {
      if (this.now < a.at) continue;
      this.actions.splice(this.actions.indexOf(a), 1);
      if (a.kind === 'parry') {
        this.tap('parry');
        this.guardFrom = this.now;
        this.guardUntil = Math.max(this.guardUntil, this.now + a.hold);
      } else if (a.kind === 'slide') {
        this.tap('dodge');
        this.move = { x: a.dir.x, z: a.dir.z, sprint: false };
        slid = true;
      } else {
        this.guardFrom = this.now;
        this.guardUntil = Math.max(this.guardUntil, a.until);
      }
    }
    const guarding = this.now >= this.guardFrom && this.now < this.guardUntil;
    if (guarding) this.input.keys.Mouse2 = true;

    // The camera is on whoever matters most now: the nearest blow's source, else what it is fighting.
    const target = this.pickTarget(views);
    const soonThreat = threats.filter((t) => t.kind === 'melee').sort((a, b) => a.tContact - b.tContact)[0];
    const focus = soonThreat?.from ?? target?.e.getPosition() ?? views[0]?.e.getPosition() ?? null;
    this.lookTarget = focus ? focus.clone() : null;
    if (slid) {
      this.turnCamera(dt);
      return;
    }
    // An answer due within a moment holds him still (a guard needs him standing; a swing now would shut out a slide).
    const pending = this.actions.some((a) => a.at - this.now < 0.45);
    if (state === 'DODGE' || state === 'PARRY' || state === 'BLOCK_HIT' || state === 'STAGGER' || state === 'DEFLECTED' || state === 'POSTURE_BROKEN') {
      this.turnCamera(dt);
      return; // the hands are busy
    }
    if (guarding || pending) {
      this.turnCamera(dt);
      return;
    }
    // Expedition: with nobody to fight, on along the way.
    if (!target) {
      this.walkRoute(hero);
      this.turnCamera(dt);
      return;
    }
    this.fight(target, threats, views, state, hero);
    this.turnCamera(dt);
  }

  /** Whoever it should fight: the nearest, casters first for a player who knows to, the broken before the standing. */
  private pickTarget(views: View[]): View | null {
    let best: View | null = null;
    let bestScore = Infinity;
    for (const v of views) {
      // A teacher's staff cannot be struck for good (the training's vanara): he is what the guard is learned on.
      if (v.e.displayName === 'Old Vanara') continue;
      if (priv(v.e).route.length > 0 && v.dist > 9) continue; // still crossing a bridge
      let score = v.dist;
      if (this.skill.tricks) {
        if (CASTERS.has(v.e.displayName) && v.dist < 14) score -= 4;
        if (v.e.stateMachine.currentState === 'POSTURE_BROKEN') score -= 3;
      }
      if (score < bestScore) {
        bestScore = score;
        best = v;
      }
    }
    return best;
  }

  /** Starts a swing, chains, closes in or holds: everything that is not an answer. */
  private fight(target: View, threats: Threat[], views: View[], state: CharacterState, hero: THREE.Vector3): void {
    void hero;
    const player = this.player;
    const sm = player.stateMachine;
    const skill = this.skill;
    const tdist = target.dist;
    const big = target.e.isBoss;
    const swingRange = big ? 3.4 : 2.6;
    // The soonest blow he has noticed and not answered: a swing now must be over (cancellable) before it lands.
    const soonest = threats.filter((t) => t.tContact > -0.1).reduce((m, t) => Math.min(m, t.tContact), Infinity);
    const swingCost = state.startsWith('ATTACK') ? 0.3 : 0.5;
    const safe = skill.patience === 0 || soonest > swingCost + skill.patience;
    const nearest = views[0]?.dist ?? 99;

    // Shakti: on a quiet moment, far from everyone, held until it is whole.
    if (skill.tricks) {
      if (this.charging) {
        if (player.chargedHits > 0 || nearest < (views.some((v) => v.e.isBoss) ? 9 : 4.5) || soonest < 1.2) {
          this.charging = false;
          this.lastCharge = this.now;
        } else {
          this.input.keys.KeyQ = true;
          if (state !== 'CHARGE') this.tap('charge');
          return;
        }
      } else if (player.can('charge') && player.chargedHits === 0 && nearest > (views.some((v) => v.e.isBoss) ? 14 : 12) && soonest > 2.5
        && this.now - this.lastCharge > 8 && (state === 'IDLE' || state === 'MOVE' || state === 'WALK')) {
        this.charging = true;
        this.input.keys.KeyQ = true;
        this.tap('charge');
        return;
      }
    }

    if (state.startsWith('ATTACK')) {
      // Chain: the next blow is queued from the moment this one's blade starts, if there is a blow to follow it with.
      const first = player.hitWindows(state as CharacterState)[0];
      const chaining = (state === 'ATTACK_1' || state === 'ATTACK_2') && player.can('combo');
      if (chaining && !sm.comboQueued && safe && tdist <= swingRange + 0.8 && sm.stateTime >= (first?.t0 ?? 0)) {
        this.tap('attack');
        return;
      }
      // After the last blow of a string (or a lone one), a fresh string starts once the swing may be cut.
      const cancel = sm.cancelAt[state];
      if ((state === 'ATTACK_3' || !chaining) && cancel !== undefined && sm.stateTime >= cancel && safe && tdist <= swingRange + 0.6
        && this.now - this.lastAttackPress > 0.15) {
        this.tap('attack');
        this.lastAttackPress = this.now;
      }
      return;
    }

    // Out of a sprint, a leap (the mace and the khanda), when the target is a stretch away and nothing is about to land.
    if (skill.tricks && state === 'SPRINT' && player.can('leap') && tdist > 4.2 && tdist < 7.5 && soonest > 1.2
      && (big || CASTERS.has(target.e.displayName))) {
      this.tap('attack');
      this.lastAttackPress = this.now;
      return;
    }

    if (tdist <= swingRange) {
      if (safe && this.now - this.lastAttackPress > 0.12) {
        this.tap('attack');
        this.lastAttackPress = this.now;
      }
      // (Not safe: he stands off the blow rather than into it; an answer is already planned for what it has noticed.)
      return;
    }
    // Out of his swing's reach with another of his blows still to come: he does not walk into it (a bolt in the air he
    // runs on through).
    const soonestMelee = threats.filter((t) => t.kind === 'melee' && t.tContact > -0.1).reduce((m, t) => Math.min(m, t.tContact), Infinity);
    if (skill.patience > 0 && soonestMelee < 1.1) return;
    // Close in; at a sprint when far and a leap is worth it. Running at someone without getting nearer (a pillar, the
    // altar's stair, a foe backing off round it) he turns aside and goes round, as a player would.
    this.trackProgress(tdist);
    if (this.now < this.detourUntil) {
      this.move = { x: this.detour.x, z: this.detour.z, sprint: false };
      return;
    }
    const sprint = skill.tricks && tdist > 8.5 && player.can('leap') && (big || CASTERS.has(target.e.displayName)) && soonest > 1.5;
    this.move = { x: target.dir.x, z: target.dir.z, sprint };
    this.lastApproach = this.now;
  }

  /** Whether closing in is getting anywhere: if not for a second and a half, the way round (alternating sides). */
  private trackProgress(dist: number, toward?: THREE.Vector3): void {
    if (this.now - this.lastApproach > 0.5 || this.progressAt < 0) {
      this.progressAt = this.now;
      this.progressDist = dist;
      return;
    }
    if (this.now - this.progressAt < 1.5) return;
    if (dist > this.progressDist - 0.5) {
      const t = this.engine.enemies.find((e) => e.stateMachine.currentState !== 'DEAD' && e.group.visible && !e.submerged);
      const hero = this.player.getPosition();
      const way = toward?.clone() ?? (t ? new THREE.Vector3(t.getPosition().x - hero.x, 0, t.getPosition().z - hero.z).normalize() : new THREE.Vector3(0, 0, -1));
      this.detourSide = this.detourSide === 1 ? -1 : 1;
      this.detour.copy(way).applyAxisAngle(UP, (Math.PI / 2) * this.detourSide).addScaledVector(way, 0.3).normalize();
      this.detourUntil = this.now + 1.4;
    }
    this.progressAt = this.now;
    this.progressDist = dist;
  }

  /** On along the island's way toward the altar. */
  private walkRoute(hero: THREE.Vector3): void {
    if (!this.internals.expedition || this.internals.chapter?.id !== 3) return;
    if (!this.routed) {
      // A retry starts him at the last checkpoint, part of the way along: on from the nearest point of the way.
      this.routed = true;
      let nearest = Infinity;
      ISLAND_ROUTE.forEach(([x, z], i) => {
        const d = Math.hypot(x - hero.x, z - hero.z);
        if (d < nearest) {
          nearest = d;
          this.routeIndex = i;
        }
      });
    }
    while (this.routeIndex < ISLAND_ROUTE.length - 1
      && Math.hypot(ISLAND_ROUTE[this.routeIndex][0] - hero.x, ISLAND_ROUTE[this.routeIndex][1] - hero.z) < 1.6) this.routeIndex++;
    const [x, z] = ISLAND_ROUTE[this.routeIndex];
    const d = new THREE.Vector3(x - hero.x, 0, z - hero.z);
    if (d.length() < 0.3) return;
    // (Behind the altar after a foe that backed away round it, the way on is round it: see `trackProgress`.)
    this.trackProgress(d.length(), d.clone().normalize());
    d.normalize();
    if (this.now < this.detourUntil) {
      this.move = { x: this.detour.x, z: this.detour.z, sprint: false };
      return;
    }
    this.move = { x: d.x, z: d.z, sprint: false };
    this.lastApproach = this.now;
  }

  /** Turns the camera toward `lookTarget` at the player's own speed, through the mouse's path (a guard faces the camera's way). */
  private turnCamera(dt: number): void {
    const sm = this.engine.sceneManager;
    const hero = this.player.getPosition();
    // On the route with nobody in sight: look the way it goes.
    let at = this.lookTarget;
    if (!at && this.move) at = new THREE.Vector3(hero.x + this.move.x, 0, hero.z + this.move.z);
    if (!at) return;
    const dx = at.x - hero.x;
    const dz = at.z - hero.z;
    if (Math.hypot(dx, dz) < 0.3) return;
    const want = Math.atan2(-dx, -dz);
    const diff = wrap(want - sm.cameraYaw);
    const step = THREE.MathUtils.clamp(diff, -this.skill.look * dt, this.skill.look * dt);
    if (Math.abs(step) < 1e-5) return;
    // The camera's yaw falls by what the mouse turns it by: counts at the user's sensitivity.
    const perCount = 0.0022 * Settings.get().mouseSensitivity;
    (this.input as unknown as { mouseDX: number }).mouseDX += -step / perCount;
  }
}

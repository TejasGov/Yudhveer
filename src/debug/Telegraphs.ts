import type { Engine } from '../core/Engine';
import type { Enemy } from '../entities/Enemy';
import type { CharacterState } from '../entities/CharacterStateMachine';
import type { CharacterDefinition } from '../entities/animation/CharacterRig';
import { BossBaoli } from '../entities/BossBaoli';
import { BossShalva } from '../entities/BossShalva';
import { BossTakshaka } from '../entities/BossTakshaka';
import { BossAndhaka } from '../entities/BossAndhaka';
import { Vetala } from '../entities/Vetala';
import { Mayavi } from '../entities/Mayavi';
import { Rakshasa } from '../entities/Rakshasa';
import { Yatudhana } from '../entities/Yatudhana';
import { Raider } from '../entities/Raider';
import { VanaraMentor } from '../entities/Vanara';
import { MiniMonster, ArcherMonster } from '../entities/IslandMonsters';
import { BAOLI_GUARDIAN } from '../entities/characters/BaoliGuardian';
import { SHALVA } from '../entities/characters/Shalva';
import { TAKSHAKA } from '../entities/characters/Takshaka';
import { ANDHAKA } from '../entities/characters/Andhaka';
import { VETALA } from '../entities/characters/Vetala';
import { MAYAVI } from '../entities/characters/Mayavi';
import { RAKSHASA } from '../entities/characters/Rakshasa';
import { YATUDHANA } from '../entities/characters/Yatudhana';
import { RAIDER } from '../entities/characters/Village';
import { MENTOR } from '../entities/characters/Akhada';
import { MINI_MONSTER, ARCHER_MONSTER } from '../entities/characters/IslandMonsters';

/*
 * The telegraph table (docs/STORY.md, "Milestone 12"): for every enemy, every attack it has, how long before its blade can
 * land the player gets to see it coming. A minion stands a beat in a wind-up with a glint and a sound (`telegraphDuration`,
 * at most 0.3 s with a rig) and then swings; a boss has no beat of its own, its swing starts at once, so its warning is the
 * clip's own wind-up, the time to its first strike window. A person needs about a quarter of a second to see a cue and
 * press a button, and a slide takes 0.09 s to leave the ground: a first blow under about half a second is a blow the
 * player can only meet by guessing. Dev builds only (`__debug.telegraphs()`).
 */

interface Entry {
  name: string;
  make: () => Enemy;
  rig: CharacterDefinition;
}

const ENEMIES: Entry[] = [
  { name: 'Baoli Guardian', make: () => new BossBaoli('t_guardian'), rig: BAOLI_GUARDIAN },
  { name: 'Vetala', make: () => new Vetala('t_vetala'), rig: VETALA },
  { name: 'Mayavi', make: () => new Mayavi('t_mayavi'), rig: MAYAVI },
  { name: 'Old Vanara (spar)', make: () => new VanaraMentor('t_vanara'), rig: MENTOR },
  { name: 'Shalva', make: () => new BossShalva('t_shalva'), rig: SHALVA },
  { name: 'Takshaka', make: () => new BossTakshaka('t_takshaka'), rig: TAKSHAKA },
  { name: 'Rakshasa', make: () => new Rakshasa('t_rakshasa'), rig: RAKSHASA },
  { name: 'Yatudhana', make: () => new Yatudhana('t_yatudhana'), rig: YATUDHANA },
  { name: 'Andhaka', make: () => new BossAndhaka('t_andhaka'), rig: ANDHAKA },
  { name: 'Raider', make: () => new Raider('t_raider'), rig: RAIDER },
  { name: 'Cave runt', make: () => new MiniMonster('t_runt'), rig: MINI_MONSTER },
  { name: 'Cave hurler', make: () => new ArcherMonster('t_hurler'), rig: ARCHER_MONSTER },
];

interface Private {
  telegraphDuration: number;
  attackCooldown: number;
  engageRange: number;
  attackStates: CharacterState[];
  comboChance: number;
  tuning?: { attackInterval: number; strikeRange: number; leapRange: number; leapMax: number };
  lungeSpec: { maxDist: number };
  turnRate: number;
  moveSpeed: number;
}

export interface AttackRow {
  state: string;
  /** Seconds the whole attack takes. */
  duration: number;
  /** Strike windows (state seconds). */
  windows: [number, number][];
  /** The time from the first sign of the attack to its first strike: a minion's wind-up plus the clip's own lead-in. */
  warning: number;
  /** True under 0.5 s: a first blow a player can only guess at. */
  fast: boolean;
  /** Until when (state seconds) it can still turn onto the hero (so a step aside beats the swing). */
  tracksUntil: number;
}

export interface EnemyRow {
  name: string;
  health: number;
  posture: number;
  moveSpeed: number;
  /** Seconds between its attacks (a boss's interval after an attack; a minion's cooldown) and its reach. */
  interval: number;
  reach: number;
  blowDamage: [number, number];
  attacks: AttackRow[];
}

/** Every enemy's attacks and the warning each gives, from the live rigs. */
export async function telegraphTable(engine: Engine): Promise<EnemyRow[]> {
  void engine;
  const rows: EnemyRow[] = [];
  for (const { name, make, rig } of ENEMIES) {
    const e = make();
    try {
      await e.attachRig(rig);
    } catch (err) {
      console.error(`[telegraphs] ${name} failed to load`, err);
      continue;
    }
    const p = e as unknown as Private;
    const sm = e.stateMachine;
    const attacks: AttackRow[] = [];
    for (const state of ['ATTACK_1', 'ATTACK_2', 'ATTACK_3', 'ATTACK_JUMP', 'CAST', 'CHARGE', 'SHOVE'] as CharacterState[]) {
      if (!rig.states[state]) continue;
      const windows = e.hitWindows(state).map((w) => [Math.round(w.t0 * 100) / 100, Math.round(w.t1 * 100) / 100] as [number, number]);
      const first = windows[0]?.[0] ?? 0;
      const wind = e.isBoss ? 0 : Math.min(p.telegraphDuration, 0.3);
      const key = `${state}_DURATION` as keyof typeof sm;
      const duration = Math.round(((sm[key] as number | undefined) ?? 0) * 100) / 100;
      attacks.push({
        state, duration, windows, warning: Math.round((wind + first) * 100) / 100, fast: windows.length > 0 && wind + first < 0.5,
        tracksUntil: Math.round(Math.max(0, first - 0.15) * 100) / 100,
      });
    }
    const blow = (finisher: boolean) => {
      const k = e.damageScale;
      return e.isBoss ? Math.round((finisher ? 24 : 18) * k * 10) / 10 : Math.round(16 * k * 10) / 10;
    };
    rows.push({
      name, health: e.maxHealth, posture: e.maxMarma, moveSpeed: Math.round(e.moveSpeed * 100) / 100,
      interval: Math.round((p.tuning?.attackInterval ?? p.attackCooldown) * 100) / 100,
      reach: Math.round((p.tuning?.strikeRange ?? p.engageRange) * 100) / 100,
      blowDamage: [blow(false), blow(true)], attacks,
    });
    e.rig?.dispose();
  }
  return rows;
}

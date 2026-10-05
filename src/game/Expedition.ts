import * as THREE from 'three';
import type { Enemy } from '../entities/Enemy';
import type { CharacterDefinition } from '../entities/animation/CharacterRig';

/*
 * An explorable chapter (docs/STORY.md, "Milestone 7"): instead of a fight in one arena, the hero walks a map and its
 * opponents come out as he reaches each place (`encounters`). The chapter is won by reaching the `goal` once every
 * encounter is cleared (the island: taking up the mace), not by the last enemy falling. A cleared encounter with a
 * `checkpoint` is where a retry starts him (for the rest of the session).
 */

/** One opponent of an encounter: spawned where it waits, hidden until its model is in. */
export interface ExpeditionSpawn {
  /** Unique in the chapter (story beats can name it). */
  id: string;
  make: (id: string) => Enemy;
  /** Feet. */
  at: THREE.Vector3;
  /** Faces this as it appears (default: the hero). */
  face?: THREE.Vector3;
  capsule: { halfHeight: number; radius: number };
  rig: CharacterDefinition;
}

export interface Encounter {
  id: string;
  /**
   * When it starts: the hero comes within `radius` of `at` (on the ground plane), or an earlier encounter is down to
   * `alive` opponents still standing (a second wave).
   */
  start: { at: THREE.Vector3; radius: number } | { after: string; alive: number };
  spawns: ExpeditionSpawn[];
  /** The callout as it starts. */
  callout?: { text: string; sub?: string };
  /** Once cleared, a retry starts the hero here, facing `face`. */
  checkpoint?: { at: THREE.Vector3; face: THREE.Vector3 };
}

export interface Expedition {
  encounters: Encounter[];
  /** Reached with every encounter cleared: the chapter is won. `hint` if he gets there while any still stand. */
  goal: { at: THREE.Vector3; radius: number; hint: string };
}

/** Per chapter id: the furthest encounter (index) whose checkpoint the hero has reached this session. */
const checkpoints = new Map<number, number>();

/** One attempt at an expedition chapter. */
export class ExpeditionRun {
  private readonly started = new Set<string>();
  private readonly cleared = new Set<string>();
  private resumeAt: Encounter['checkpoint'] | null = null;
  private atGoal = false;
  /** Every encounter cleared and the goal reached (or `finish`ed). */
  public complete = false;

  /** `fresh`: a new start (from a menu, with its intro) forgets the session's checkpoint. */
  constructor(private readonly def: Expedition, private readonly key: number, fresh: boolean) {
    if (fresh) checkpoints.delete(key);
    const reached = checkpoints.get(key) ?? -1;
    def.encounters.forEach((e, i) => {
      if (i > reached) return;
      this.started.add(e.id);
      this.cleared.add(e.id);
      if (e.checkpoint) this.resumeAt = e.checkpoint;
    });
  }

  /** Where a retry puts the hero (null: the level's spawn). */
  public resumePoint(): Encounter['checkpoint'] | null {
    return this.resumeAt;
  }

  /** Whether an encounter has been fought to the end. */
  public isCleared(id: string): boolean {
    return this.cleared.has(id);
  }

  /** Dev and story: over now (the goal is reached). */
  public finish(): void {
    this.complete = true;
  }

  /**
   * One step: encounters due to start now (the caller spawns their opponents), and a hint if the hero has just come
   * to the goal with opponents still standing.
   */
  public update(hero: THREE.Vector3, enemies: readonly Enemy[]): { start: Encounter[]; hint: string | null } {
    const start: Encounter[] = [];
    if (this.complete) return { start, hint: null };
    const standing = (e: Encounter) => e.spawns.filter((s) => {
      const enemy = enemies.find((x) => x.id === s.id);
      return !enemy || enemy.stateMachine.currentState !== 'DEAD';
    }).length;

    this.def.encounters.forEach((e, i) => {
      if (this.started.has(e.id)) {
        if (!this.cleared.has(e.id) && standing(e) === 0) {
          this.cleared.add(e.id);
          if (e.checkpoint && i > (checkpoints.get(this.key) ?? -1)) checkpoints.set(this.key, i);
        }
        return;
      }
      const due = 'after' in e.start
        ? this.started.has(e.start.after) && standing(this.def.encounters.find((x) => x.id === (e.start as { after: string }).after)!) <= e.start.alive
        : Math.hypot(hero.x - e.start.at.x, hero.z - e.start.at.z) < e.start.radius && Math.abs(hero.y - e.start.at.y) < 4;
      if (due) {
        this.started.add(e.id);
        start.push(e);
      }
    });

    const g = this.def.goal;
    const there = Math.hypot(hero.x - g.at.x, hero.z - g.at.z) < g.radius && Math.abs(hero.y - g.at.y) < 2;
    let hint: string | null = null;
    if (there && this.def.encounters.every((e) => this.cleared.has(e.id))) this.complete = true;
    else if (there && !this.atGoal) hint = g.hint;
    this.atGoal = there;
    return { start, hint };
  }
}

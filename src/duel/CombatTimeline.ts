import type { HeroSnapshot } from '../entities/RemoteHero';

/**
 * Reliable attack poses have a small, bounded playback timeline separate from replaceable locomotion. Sender
 * simulation ticks space these poses: packets arriving in a burst cannot compress a whole strike into one frame.
 * After a render hitch playback catches up at at most twice normal speed, retaining every strike interval. The
 * defender still uses its current controls and body; nothing is rewound. Excessive backlog ends the connection.
 * A completed attack releases the timeline, so hit-stop does not accumulate delay across an entire match.
 */
export class CombatTimeline {
  private readonly frames: { at: number; state: HeroSnapshot }[] = [];
  private cursor: number | null = null;
  private lastSeq = -1;
  public overflowed = false;
  public completed: HeroSnapshot | null = null;
  public get pending(): boolean { return this.frames.length > 0; }

  public receive(state: HeroSnapshot, at: number): void {
    if (state.seq <= this.lastSeq) return;
    this.lastSeq = state.seq;
    const last = this.frames.at(-1);
    this.frames.push({ at: last ? last.at + Math.max(0, state.tick - last.state.tick) * 1000 / 60 : at, state });
    if (this.frames.length > 256) { this.overflowed = true; this.frames.length = 0; }
  }

  public sample(target: number, dt: number): HeroSnapshot | null {
    if (!this.frames.length || target < this.frames[0].at) return null;
    this.cursor ??= this.frames[0].at;
    this.cursor = Math.min(target, this.frames.at(-1)!.at, this.cursor + dt * 2000);
    if (target - this.cursor > 2000) { this.overflowed = true; return null; }
    while (this.frames.length > 1 && this.frames[1].at <= this.cursor) this.frames.shift();
    const a = this.frames[0], b = this.frames[1] ?? a;
    const k = Math.max(0, Math.min(1, (this.cursor - a.at) / Math.max(1, b.at - a.at)));
    const state = interpolateHero(a.state, b.state, k);
    if (this.frames.length === 1 && !a.state.state.startsWith('ATTACK')) {
      this.completed = state; this.frames.length = 0; this.cursor = null;
    }
    return state;
  }

  public reset(): void {
    this.frames.length = 0; this.cursor = null; this.lastSeq = -1; this.completed = null; this.overflowed = false;
  }
}

/** Poses share a sender simulation clock, including hit-stop; state transitions arrive reliably at their start. */
export function interpolateHero(a: HeroSnapshot, b: HeroSnapshot, k: number): HeroSnapshot {
  const state = k >= 1 ? b : a;
  const same = a.state === b.state && a.swing === b.swing;
  const time = same ? a.time + (b.time - a.time) * k
    : k < 1 && a.state.startsWith('ATTACK') ? a.time + (b.tick - a.tick) * k / 60 : state.time;
  const angle = b.yaw - a.yaw;
  return { ...state, time, position: a.position.map((v, i) => v + (b.position[i] - v) * k) as [number, number, number],
    yaw: a.yaw + (angle - Math.PI * 2 * Math.round(angle / (Math.PI * 2))) * k };
}

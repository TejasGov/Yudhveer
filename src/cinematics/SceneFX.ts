/*
 * Effects a story scene starts that play out over time (a light swelling, a figure fading into it): updated on the
 * game's own clock (the Engine's fixed step, so `__debug.advance` drives them too) and torn down with the chapter.
 * A scene's `run` cues start them; anything they change outside themselves (the place's lights) they put back in
 * their `onClear`.
 */

type Task = (dt: number) => boolean;

const tasks: Task[] = [];
const cleanups: (() => void)[] = [];

export const SceneFX = {
  /**
   * Calls `apply` with 0..1 over `seconds` (eased), from the next step; 1 is always applied last. `delay` seconds
   * first, if given.
   */
  tween(seconds: number, apply: (k: number) => void, options: { ease?: (t: number) => number; delay?: number } = {}): void {
    let t = -(options.delay ?? 0);
    const ease = options.ease ?? ((x: number) => x * x * (3 - 2 * x));
    tasks.push((dt) => {
      t += dt;
      if (t < 0) return true;
      const u = Math.min(1, t / Math.max(seconds, 1e-3));
      apply(ease(u));
      return u < 1;
    });
  },

  /** Calls `fn` every step until it returns false (or the chapter ends). */
  every(fn: (dt: number) => boolean | void): void {
    tasks.push((dt) => fn(dt) !== false);
  },

  /** Runs once when the effects are cleared (leaving the chapter): remove what was added, restore what was changed. */
  onClear(fn: () => void): void {
    cleanups.push(fn);
  },

  /** One step of every running effect. */
  update(dt: number): void {
    for (let i = 0; i < tasks.length; i++) {
      if (!tasks[i](dt)) tasks.splice(i--, 1);
    }
  },

  /** Stops every effect and undoes them (the Engine, when a chapter is left). */
  clear(): void {
    tasks.length = 0;
    const fns = cleanups.splice(0);
    for (const fn of fns.reverse()) {
      try {
        fn();
      } catch (err) {
        console.error('[SceneFX] cleanup failed', err);
      }
    }
  },
};

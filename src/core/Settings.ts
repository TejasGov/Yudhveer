/** Player preferences, kept in localStorage. Every read goes through `Settings.get()`. */
export interface GameSettings {
  masterVolume: number; // 0..1
  musicVolume: number; // 0..1
  mouseSensitivity: number; // multiplier, 0.3..2.5
  padLookSpeed: number; // rad/s at full stick, 1..5
  invertY: boolean;
  cameraShake: boolean;
  hints: boolean;
}

const KEY = 'yudhveer.settings.v1';
const DEFAULTS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  mouseSensitivity: 1,
  padLookSpeed: 2.8,
  invertY: false,
  cameraShake: true,
  hints: true,
};

let current: GameSettings = load();
const listeners = new Set<(s: GameSettings) => void>();

function load(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<GameSettings>) };
  } catch {
    // Private mode or blocked storage: defaults for this session.
  }
  return { ...DEFAULTS };
}

export const Settings = {
  get(): Readonly<GameSettings> {
    return current;
  },
  set<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    current = { ...current, [key]: value };
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      // Not persisted; still applies now.
    }
    listeners.forEach((fn) => fn(current));
  },
  onChange(fn: (s: GameSettings) => void): void {
    listeners.add(fn);
  },
};

/** Campaign progress: the highest chapter the player may start. */
const PROGRESS_KEY = 'yudhveer.progress.v1';

export const Progress = {
  unlocked(): number {
    try {
      const n = parseInt(localStorage.getItem(PROGRESS_KEY) ?? '1', 10);
      return Number.isFinite(n) && n >= 1 ? n : 1;
    } catch {
      return 1;
    }
  },
  unlock(chapter: number): void {
    if (chapter <= Progress.unlocked()) return;
    try {
      localStorage.setItem(PROGRESS_KEY, String(chapter));
    } catch {
      // Not persisted.
    }
  },
};

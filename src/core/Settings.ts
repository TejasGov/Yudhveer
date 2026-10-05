/** How much blood a blow draws (docs/STORY.md, "Blood"): none, a little (the default), or all of it. */
export type GoreLevel = 'off' | 'low' | 'full';

/** Player preferences, kept in localStorage. Every read goes through `Settings.get()`. */
export interface GameSettings {
  masterVolume: number; // 0..1
  musicVolume: number; // 0..1
  mouseSensitivity: number; // multiplier, 0.3..2.5
  padLookSpeed: number; // rad/s at full stick, 1..5
  invertY: boolean;
  /** How much blows move the camera (ImpactCamera), 0..1. Saves from before the slider held true / false. */
  cameraShake: number;
  /** Controller rumble strength, 0..1. */
  vibration: number;
  hints: boolean;
  gore: GoreLevel;
}

const KEY = 'yudhveer.settings.v1';

/** Players who ask their system for less motion start with half the camera shake. */
function reducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

const DEFAULTS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  mouseSensitivity: 1,
  padLookSpeed: 2.8,
  invertY: false,
  cameraShake: reducedMotion() ? 0.5 : 1,
  vibration: 1,
  hints: true,
  gore: 'low',
};

let current: GameSettings = load();
const listeners = new Set<(s: GameSettings) => void>();

function load(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<GameSettings>) };
      if (!['off', 'low', 'full'].includes(saved.gore)) saved.gore = DEFAULTS.gore;
      // The camera shake was a toggle: on is the full amount (or the reduced-motion default), off is none.
      const shake = saved.cameraShake as unknown;
      if (typeof shake === 'boolean') saved.cameraShake = shake ? DEFAULTS.cameraShake : 0;
      else if (typeof shake !== 'number' || !Number.isFinite(shake)) saved.cameraShake = DEFAULTS.cameraShake;
      if (typeof saved.vibration !== 'number' || !Number.isFinite(saved.vibration)) saved.vibration = DEFAULTS.vibration;
      return saved;
    }
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

/**
 * Campaign progress: the highest chapter id the player may start. A new player has only the prologue (0); saves from
 * before the prologue existed start at 2 or more (nothing was written until a chapter was cleared), so they keep
 * everything they had.
 */
const PROGRESS_KEY = 'yudhveer.progress.v1';

export const Progress = {
  unlocked(): number {
    try {
      const n = parseInt(localStorage.getItem(PROGRESS_KEY) ?? '0', 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
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

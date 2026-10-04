import { Settings } from '../core/Settings';

type Wave = OscillatorType;

/** One synthesized tone: an oscillator with a pitch glide and an attack/decay envelope. */
interface ToneSpec {
  type: Wave;
  freq: number;
  /** Glide to this frequency over the tone. */
  to?: number;
  /** Exponential glide (default) or linear. */
  linear?: boolean;
  gain: number;
  attack?: number;
  duration: number;
  delay?: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number };
}

/**
 * All game audio, synthesized with the Web Audio API (no audio files): combat sounds, cutscene hits, menu ticks
 * and a procedural tanpura drone with a drum pulse for boss fights. Everything runs through one master gain
 * (Settings.masterVolume) split into effects and music buses.
 */
export class SoundFX {
  private static instance: SoundFX | null = null;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  public readonly music = new MusicBed();

  private constructor() {
    Settings.onChange(() => this.applyVolumes());
  }

  public static getInstance(): SoundFX {
    if (!SoundFX.instance) SoundFX.instance = new SoundFX();
    return SoundFX.instance;
  }

  /** Creates (or resumes) the audio context. Browsers only allow this from a user gesture. */
  public init(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.ratio.value = 4;
      this.master = ctx.createGain();
      this.sfxBus = ctx.createGain();
      this.musicBus = ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.master.connect(compressor);
      compressor.connect(ctx.destination);
      const length = ctx.sampleRate;
      this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      this.ctx = ctx;
      this.applyVolumes();
      this.music.connect(ctx, this.musicBus);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.master || !this.musicBus) return;
    const s = Settings.get();
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.masterVolume * s.masterVolume, t, 0.05);
    this.musicBus.gain.setTargetAtTime(s.musicVolume * s.musicVolume * 0.9, t, 0.05);
  }

  private ready(): AudioContext | null {
    return this.ctx && this.ctx.state === 'running' ? this.ctx : null;
  }

  private tone(spec: ToneSpec, out: AudioNode | null = this.sfxBus): void {
    const ctx = this.ready();
    if (!ctx || !out) return;
    const t = ctx.currentTime + (spec.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, t);
    if (spec.to !== undefined) {
      if (spec.linear) osc.frequency.linearRampToValueAtTime(spec.to, t + spec.duration);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.to), t + spec.duration);
    }
    const attack = spec.attack ?? 0.004;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(spec.gain, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + spec.duration);
    let node: AudioNode = osc;
    if (spec.filter) {
      const f = ctx.createBiquadFilter();
      f.type = spec.filter.type;
      f.frequency.value = spec.filter.freq;
      f.Q.value = spec.filter.q ?? 1;
      osc.connect(f);
      node = f;
    }
    node.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + spec.duration + 0.02);
  }

  /** Filtered noise with a swept filter (whooshes, breath, roars). */
  private noise(opts: {
    duration: number; gain: number; attack?: number; delay?: number;
    filter: BiquadFilterType; from: number; peak?: number; to: number; q?: number;
  }): void {
    const ctx = this.ready();
    if (!ctx || !this.sfxBus || !this.noiseBuffer) return;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = opts.filter;
    f.Q.value = opts.q ?? 1;
    f.frequency.setValueAtTime(opts.from, t);
    if (opts.peak) f.frequency.exponentialRampToValueAtTime(opts.peak, t + opts.duration * 0.35);
    f.frequency.exponentialRampToValueAtTime(opts.to, t + opts.duration);
    const g = ctx.createGain();
    const attack = opts.attack ?? 0.03;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(opts.gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + opts.duration);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + opts.duration + 0.05);
  }

  // --- Combat -------------------------------------------------------------------------------------------------

  /** Steel on bronze: a parry or a blow caught on the dhal. */
  public playParryClash(): void {
    this.tone({ type: 'triangle', freq: 1400, to: 320, gain: 0.5, duration: 0.09 });
    this.tone({ type: 'sine', freq: 840, gain: 0.38, duration: 1.2 });
    this.tone({ type: 'sine', freq: 2520, gain: 0.14, duration: 0.8 });
    this.tone({ type: 'sine', freq: 1263, gain: 0.08, duration: 0.6 });
  }

  public playSwordSwing(pitch = 1): void {
    this.noise({ duration: 0.22, gain: 0.22, attack: 0.05, filter: 'bandpass', from: 400 * pitch, peak: 1400 * pitch, to: 300 * pitch, q: 3 });
  }

  public playKatarSlash(): void {
    this.noise({ duration: 0.14, gain: 0.18, attack: 0.02, filter: 'bandpass', from: 900, peak: 2600, to: 700, q: 4 });
    this.tone({ type: 'sawtooth', freq: 900, to: 320, gain: 0.06, duration: 0.09 });
  }

  public playSpearThrust(): void {
    this.tone({ type: 'sine', freq: 650, to: 180, gain: 0.22, duration: 0.15 });
  }

  public playChakramThrow(): void {
    this.tone({ type: 'sawtooth', freq: 440, to: 880, linear: true, gain: 0.12, duration: 0.18, filter: { type: 'bandpass', freq: 650, q: 4 } });
    this.tone({ type: 'sawtooth', freq: 880, to: 420, linear: true, gain: 0.1, duration: 0.3, delay: 0.16, filter: { type: 'bandpass', freq: 650, q: 4 } });
  }

  public playHitImpact(): void {
    this.tone({ type: 'triangle', freq: 160, to: 35, gain: 0.42, duration: 0.16 });
    this.noise({ duration: 0.08, gain: 0.16, attack: 0.002, filter: 'lowpass', from: 2400, to: 400 });
  }

  /** A blade turned aside by hide or armour: a dull knock and a short scrape. */
  public playGlancingBlow(): void {
    this.tone({ type: 'triangle', freq: 260, to: 110, gain: 0.26, duration: 0.1 });
    this.noise({ duration: 0.07, gain: 0.1, attack: 0.002, filter: 'bandpass', from: 3200, to: 1800, q: 2 });
  }

  /** A deep brass gong: a posture breaks. */
  public playPostureBreak(): void {
    [120, 185, 290, 440].forEach((f, i) => this.tone({ type: 'sine', freq: f, to: f * 0.95, gain: 0.25 / (i + 1), duration: 1.8 }));
  }

  public playFlameBurst(): void {
    this.tone({ type: 'sawtooth', freq: 120, to: 45, gain: 0.35, duration: 0.6, filter: { type: 'lowpass', freq: 450 } });
    this.noise({ duration: 0.8, gain: 0.22, attack: 0.05, filter: 'lowpass', from: 300, peak: 1600, to: 200 });
  }

  public playBossPhaseTransition(): void {
    this.tone({ type: 'sawtooth', freq: 80, to: 320, linear: true, gain: 0.32, duration: 0.8, filter: { type: 'lowpass', freq: 900 } });
    this.tone({ type: 'sawtooth', freq: 320, to: 70, gain: 0.3, duration: 0.8, delay: 0.75, filter: { type: 'lowpass', freq: 700 } });
    this.playPostureBreak();
  }

  /** A low, rising warning before an enemy swing. */
  public playTelegraphSound(): void {
    this.tone({ type: 'sawtooth', freq: 300, to: 650, gain: 0.08, duration: 0.22, filter: { type: 'bandpass', freq: 500, q: 5 } });
  }

  /** A boss roars: a growl (detuned saws) over a throaty noise swell. Lower `pitch` is bigger. */
  public playRoar(pitch = 1): void {
    const base = 70 * pitch;
    for (const detune of [1, 1.07, 0.5]) {
      this.tone({
        type: 'sawtooth', freq: base * detune, to: base * detune * 0.7, gain: 0.16, attack: 0.25, duration: 2.2,
        filter: { type: 'lowpass', freq: 520 * pitch, q: 2 },
      });
    }
    this.noise({ duration: 2.3, gain: 0.34, attack: 0.3, filter: 'bandpass', from: 220 * pitch, peak: 700 * pitch, to: 160 * pitch, q: 1.6 });
  }

  // --- Cutscenes, menus, outcomes ------------------------------------------------------------------------------

  /** A chapter card lands: a struck bell over a deep drum. */
  public playCardHit(): void {
    this.tone({ type: 'sine', freq: 82, to: 41, gain: 0.55, duration: 1.6 });
    this.noise({ duration: 0.25, gain: 0.12, attack: 0.002, filter: 'lowpass', from: 900, to: 120 });
    [220, 329.6, 440, 587, 880].forEach((f, i) => this.tone({ type: 'sine', freq: f, gain: 0.12 / (i + 1), attack: 0.003, duration: 3.5 - i * 0.4 }));
  }

  /** A short metallic tick as the menu focus moves. */
  public playUiMove(): void {
    this.tone({ type: 'sine', freq: 1320, gain: 0.05, duration: 0.07 });
  }

  public playUiConfirm(): void {
    this.tone({ type: 'sine', freq: 660, gain: 0.08, duration: 0.25 });
    this.tone({ type: 'sine', freq: 990, gain: 0.05, duration: 0.3, delay: 0.04 });
  }

  /** The chapter is won: a rising bell chord. */
  public playLevelClear(): void {
    [261.6, 329.6, 392, 523.3].forEach((f, i) => this.tone({ type: 'sine', freq: f, gain: 0.2, duration: 2.4, delay: i * 0.14 }));
  }

  /** The player falls: a low bell, slowly fading. */
  public playDefeat(): void {
    [110, 164.8, 220].forEach((f, i) => this.tone({ type: 'sine', freq: f, to: f * 0.97, gain: 0.22 / (i + 1), duration: 3.5, delay: i * 0.05 }));
  }
}

/** A mood for the music bed: the drone's tonic and whether the drum pulse plays. */
export interface MusicMood {
  /** Sa, in Hz. */
  tonic: number;
  /** Seconds between tanpura plucks. */
  pluck: number;
  /** Drum pulse (boss fights), beats per minute; 0 for none. */
  pulse: number;
}

/**
 * A tanpura drone (Pa, Sa, Sa, low Sa, plucked in a cycle) with an optional pakhawaj-like pulse, scheduled ahead
 * on the audio clock. Plucks are pre-rendered per pitch with an OfflineAudioContext.
 */
class MusicBed {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private mood: MusicMood | null = null;
  private plucks = new Map<number, Promise<AudioBuffer>>();
  private nextPluck = 0;
  private pluckIndex = 0;
  private nextBeat = 0;
  private beatIndex = 0;
  private timer: number | null = null;

  public connect(ctx: AudioContext, bus: GainNode): void {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(bus);
    if (this.mood) this.start();
  }

  /** Crossfades to `mood` (null fades out). */
  public play(mood: MusicMood | null): void {
    const same = this.mood && mood && this.mood.tonic === mood.tonic && this.mood.pulse === mood.pulse;
    this.mood = mood;
    if (!this.ctx || !this.out) return;
    const t = this.ctx.currentTime;
    if (!mood) {
      this.out.gain.setTargetAtTime(0, t, 0.6);
      return;
    }
    if (!same) {
      this.pluckIndex = 0;
      this.nextPluck = t + 0.2;
      this.nextBeat = t + 0.4;
      this.beatIndex = 0;
    }
    this.out.gain.setTargetAtTime(0.5, t, 0.8);
    this.start();
  }

  private start(): void {
    if (this.timer !== null || !this.ctx) return;
    this.timer = window.setInterval(() => this.schedule(), 200);
  }

  private schedule(): void {
    const ctx = this.ctx;
    const mood = this.mood;
    if (!ctx || !this.out || !mood || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + 0.6;
    // Pa, Sa, Sa, low Sa.
    const cycle = [mood.tonic * 0.75, mood.tonic, mood.tonic, mood.tonic / 2];
    while (this.nextPluck < horizon) {
      const freq = cycle[this.pluckIndex % cycle.length];
      const at = this.nextPluck;
      const level = this.pluckIndex % 4 === 3 ? 0.55 : 0.4;
      void this.pluckBuffer(freq).then((buffer) => {
        if (!this.out || at < ctx.currentTime - 0.05) return;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const g = ctx.createGain();
        g.gain.value = level;
        src.connect(g);
        g.connect(this.out);
        src.start(at);
      });
      this.pluckIndex++;
      this.nextPluck += mood.pluck * (this.pluckIndex % 4 === 0 ? 1.6 : 1);
    }
    if (mood.pulse > 0) {
      const beat = 60 / mood.pulse;
      // dha . dhin dha | . ge na .
      const pattern = [1, 0, 0.55, 0.8, 0, 0.45, 0.6, 0];
      while (this.nextBeat < horizon) {
        const level = pattern[this.beatIndex % pattern.length];
        if (level > 0) this.drum(this.nextBeat, level, this.beatIndex % 8 === 0);
        this.beatIndex++;
        this.nextBeat += beat / 2;
      }
    } else {
      this.nextBeat = horizon;
    }
  }

  private drum(at: number, level: number, low: boolean): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const f0 = low ? 92 : 128;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, at);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.55, at + 0.35);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.5 * level, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + (low ? 0.7 : 0.4));
    osc.connect(g);
    g.connect(this.out!);
    osc.start(at);
    osc.stop(at + 0.75);
  }

  /** One tanpura pluck at `freq`: a harmonic series whose upper partials bloom after the attack (the jawari). */
  private pluckBuffer(freq: number): Promise<AudioBuffer> {
    const key = Math.round(freq * 100);
    let pending = this.plucks.get(key);
    if (pending) return pending;
    const rate = 22050;
    const seconds = 7;
    const off = new OfflineAudioContext(1, rate * seconds, rate);
    const sum = off.createGain();
    sum.gain.value = 0.22;
    sum.connect(off.destination);
    for (let n = 1; n <= 18; n++) {
      const f = freq * n * (1 + 0.0007 * n);
      if (f > rate / 2.2) break;
      const osc = off.createOscillator();
      osc.frequency.value = f;
      const g = off.createGain();
      const amp = 1 / Math.pow(n, 0.9);
      const bloom = n > 3 ? 0.25 + Math.min(1, n / 10) * 0.5 : 0.05;
      g.gain.setValueAtTime(0, 0);
      g.gain.linearRampToValueAtTime(amp, 0.01);
      g.gain.linearRampToValueAtTime(amp * (0.5 + bloom), bloom + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, seconds * (1 - n / 40));
      osc.connect(g);
      g.connect(sum);
      osc.start(0);
    }
    pending = off.startRendering();
    this.plucks.set(key, pending);
    return pending;
  }
}

/** Per-place moods: chapter backdrops and the boss pulse. */
export const MOODS = {
  title: { tonic: 110, pluck: 1.15, pulse: 0 },
  baoli: { tonic: 110, pluck: 1.1, pulse: 0 },
  akhada: { tonic: 123.5, pluck: 0.95, pulse: 0 },
  dwarka: { tonic: 103.8, pluck: 1.2, pulse: 0 },
  summit: { tonic: 92.5, pluck: 1.25, pulse: 0 },
} satisfies Record<string, MusicMood>;

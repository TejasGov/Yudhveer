import { Settings } from '../core/Settings';
import sampleIds from 'virtual:sfx-samples';
import trackIds from 'virtual:music-tracks';

/**
 * The recorded effects (public/assets/sfx, ElevenLabs takes) and how loud each plays against the rest. Every one has
 * a synthesized stand-in that plays until (or unless) its recording is decoded.
 */
const SAMPLE_GAIN = {
  swing_blade: 0.42,
  swing_lathi: 0.4,
  swing_heavy: 0.5,
  hit_blade: 0.6,
  hit_wood: 0.6,
  hit_crush: 0.65,
  parry_clash: 0.62,
  shield_block: 0.55,
  glancing_blow: 0.55,
  posture_break: 0.6,
  slide: 0.6,
  katar_slash: 0.45,
  magic_bolt: 0.45,
  flame_burst: 0.6,
  telegraph: 0.32,
  roar_brute: 0.6,
  roar_naga: 0.7,
  phase_surge: 0.55,
} as const;
export type Sample = keyof typeof SAMPLE_GAIN;
const SAMPLES = new Set(sampleIds);

/** A weapon's whoosh: steel, a staff, or something heavy (a mace, a gada). */
export type SwingKind = 'blade' | 'lathi' | 'heavy';
/** What a blow lands like. */
export type ImpactKind = 'blade' | 'wood' | 'crush';
/** Whose roar: a big beast or demon, or the naga king. */
export type RoarKind = 'brute' | 'naga';

type Wave = OscillatorType;
type NoiseColor = 'white' | 'pink' | 'brown';

/** Where a sound goes: when it starts, where it sits left to right, and how much of it reaches the reverb. */
interface Placement {
  delay?: number;
  /** -1 (left) to 1 (right). */
  pan?: number;
  /** Send to the place's reverb, 0..1. */
  wet?: number;
  /** The ambience bus instead of the effects bus. */
  amb?: boolean;
}

/** One synthesized tone: an oscillator with a pitch glide and an attack/decay envelope. */
interface ToneSpec extends Placement {
  type: Wave;
  freq: number;
  /** Glide to this frequency over the tone. */
  to?: number;
  /** Exponential glide (default) or linear. */
  linear?: boolean;
  gain: number;
  attack?: number;
  duration: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number };
}

/** Filtered noise with a swept filter (whooshes, breath, wind, surf, rumble). */
interface NoiseSpec extends Placement {
  duration: number;
  gain: number;
  attack?: number;
  color?: NoiseColor;
  filter: BiquadFilterType;
  from: number;
  peak?: number;
  to: number;
  q?: number;
}

/** A voice: a buzzing source shaped by vowel formants, for roars, laughs and animal calls. */
interface VoiceSpec extends Placement {
  /** [seconds, Hz] points; the pitch glides between them. */
  pitch: [number, number][];
  duration: number;
  gain: number;
  /** Formants (Hz) at the start and, optionally, the end (the mouth opening or closing). */
  vowel: Vowel;
  toVowel?: Vowel;
  /** Breath noise through the same mouth, 0..1. */
  breath?: number;
  /** Throat distortion, 0 (clean) to ~8 (growl). */
  grit?: number;
  /** An octave-below undertone, 0..1. */
  sub?: number;
  attack?: number;
  /** Larger than 1 for a bigger throat (lower formants). */
  size?: number;
}

type Vowel = [number, number, number];
const VOWELS = {
  a: [730, 1090, 2440] as Vowel,
  o: [570, 840, 2410] as Vowel,
  u: [300, 870, 2240] as Vowel,
  e: [530, 1840, 2480] as Vowel,
  m: [250, 1000, 2200] as Vowel,
};

/** A place's sound: its reverb, the ground underfoot, and its ambience. */
export type Ambience = 'village' | 'baoli' | 'akhada' | 'island' | 'dwarka' | 'summit';
type Surface = 'stone' | 'earth' | 'snow';

const SPACES: Record<Ambience, { seconds: number; damp: number; send: number; surface: Surface }> = {
  // A walled village courtyard in the desert: mud walls close by, open sky.
  village: { seconds: 1.2, damp: 0.65, send: 0.14, surface: 'earth' },
  // A stepwell: stone on every side, long and bright.
  baoli: { seconds: 3.2, damp: 0.35, send: 0.3, surface: 'stone' },
  // A jungle clearing: short, soft.
  akhada: { seconds: 1.3, damp: 0.75, send: 0.16, surface: 'earth' },
  // Caves under the island: rock all round, long and dark, every sound coming back from somewhere unseen.
  island: { seconds: 3.6, damp: 0.5, send: 0.34, surface: 'stone' },
  // A sea-facing court: open, some stone.
  dwarka: { seconds: 1.8, damp: 0.55, send: 0.2, surface: 'stone' },
  // A mountain top: huge, dark.
  summit: { seconds: 4, damp: 0.8, send: 0.26, surface: 'snow' },
};

/** A running ambience: its steady layers and its timed events. */
interface AmbienceRun {
  kind: Ambience;
  layers: { stop(): void }[];
  events: { next: number; every: [number, number]; fire: (at: number) => void }[];
  timer: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
/** `x` give or take `spread` (a fraction), so no two hits sound quite alike. */
const vary = (x: number, spread = 0.06) => x * (1 + (Math.random() * 2 - 1) * spread);

/**
 * All game audio, through the Web Audio API. Combat sounds are recordings (public/assets/sfx) with a slightly different
 * pitch and level each time, each with a synthesized stand-in for before it has loaded; each place's ambience and
 * reverb, cutscene hits and menu ticks are synthesized; the soundtrack is recorded loops (`music`, public/assets/music)
 * over a procedural tanpura drone as its fallback; and the story's lines bring recorded dialogue (`playVoice`).
 * Everything runs through one master gain (Settings.masterVolume) split into effects, ambience and music buses.
 */
export class SoundFX {
  private static instance: SoundFX | null = null;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbIn: GainNode | null = null;
  private noise_: Record<NoiseColor, AudioBuffer> | null = null;
  private shapers = new Map<number, WaveShaperNode['curve']>();
  private ambience: AmbienceRun | null = null;
  private wantedAmbience: Ambience | null = null;
  private samples = new Map<Sample, AudioBuffer>();
  public readonly music = new Music();
  /** Lightning, `delay` seconds before its thunder is heard (the summit). */
  public onLightning: ((strength: number) => void) | null = null;

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
      this.ambBus = ctx.createGain();
      this.ambBus.gain.value = 0.7;
      this.musicBus = ctx.createGain();
      this.reverb = ctx.createConvolver();
      this.reverbIn = ctx.createGain();
      this.reverbIn.connect(this.reverb);
      this.reverb.connect(this.master);
      for (const bus of [this.sfxBus, this.ambBus, this.musicBus]) bus.connect(this.master);
      this.master.connect(compressor);
      compressor.connect(ctx.destination);
      this.noise_ = makeNoise(ctx);
      this.ctx = ctx;
      this.setSpace(this.wantedAmbience ?? 'akhada');
      this.applyVolumes();
      this.music.connect(ctx, this.musicBus);
      if (this.wantedAmbience) this.playAmbience(this.wantedAmbience);
      this.loadSamples(ctx);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Fetches and decodes every recorded effect there is, in the background; each replaces its synth once ready. */
  private loadSamples(ctx: AudioContext): void {
    for (const id of Object.keys(SAMPLE_GAIN) as Sample[]) {
      if (!SAMPLES.has(id)) continue;
      fetch(`/assets/sfx/${id}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => this.samples.set(id, buffer))
        .catch((err) => console.warn(`[SoundFX] ${id} could not be loaded; keeping its synthesized version`, err));
    }
  }

  /** Which recorded effects are decoded (for testing). */
  public loadedSamples(): string[] {
    return [...this.samples.keys()];
  }

  /**
   * Plays a recorded effect at `rate` (and `gain`), each a few percent off so repeats never sound identical, placed
   * like any other sound. False if the recording is not ready (the caller plays its synth instead).
   */
  private sample(id: Sample, o: Placement & { rate?: number; gain?: number } = {}): boolean {
    const buffer = this.samples.get(id);
    if (!buffer) return false;
    const ctx = this.ready();
    if (!ctx) return true;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = vary(o.rate ?? 1, 0.05);
    const g = ctx.createGain();
    g.gain.value = vary(SAMPLE_GAIN[id] * (o.gain ?? 1), 0.12);
    src.connect(g);
    this.place(g, o);
    src.start(ctx.currentTime + (o.delay ?? 0));
    return true;
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

  // --- Building blocks ----------------------------------------------------------------------------------------

  /** Sends `node` to its bus (panned) and, if asked, to the reverb. */
  private place(node: AudioNode, p: Placement): void {
    const ctx = this.ctx!;
    let last = node;
    if (p.pan) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, p.pan));
      node.connect(panner);
      last = panner;
    }
    last.connect((p.amb ? this.ambBus : this.sfxBus)!);
    if (p.wet) {
      const send = ctx.createGain();
      send.gain.value = p.wet;
      last.connect(send);
      send.connect(this.reverbIn!);
    }
  }

  private tone(spec: ToneSpec): void {
    const ctx = this.ready();
    if (!ctx) return;
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
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(spec.duration, attack + 0.01));
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
    this.place(gain, spec);
    osc.start(t);
    osc.stop(t + spec.duration + 0.02);
  }

  private noise(spec: NoiseSpec): void {
    const ctx = this.ready();
    if (!ctx || !this.noise_) return;
    const t = ctx.currentTime + (spec.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise_[spec.color ?? 'white'];
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = spec.filter;
    f.Q.value = spec.q ?? 1;
    f.frequency.setValueAtTime(spec.from, t);
    if (spec.peak) f.frequency.exponentialRampToValueAtTime(spec.peak, t + spec.duration * 0.35);
    f.frequency.exponentialRampToValueAtTime(spec.to, t + spec.duration);
    const g = ctx.createGain();
    const attack = Math.min(spec.attack ?? 0.03, spec.duration * 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(spec.gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + spec.duration);
    src.connect(f);
    f.connect(g);
    this.place(g, spec);
    src.start(t, Math.random() * 1.5);
    src.stop(t + spec.duration + 0.05);
  }

  /**
   * A struck metal body: partials at `ratios` of `base`, each ringing for its own time. Steel rings high and
   * inharmonic; bronze lower, with a hum below.
   */
  private ring(base: number, ratios: number[], decays: number[], gain: number, p: Placement = {}): void {
    ratios.forEach((r, i) => {
      this.tone({ type: 'sine', freq: vary(base * r, 0.004), gain: gain / (1 + i * 0.6), attack: 0.0015, duration: decays[i] ?? decays[decays.length - 1], ...p });
    });
  }

  /** A body blow: a pitch-dropping thump (flesh, wood, earth). */
  private thump(freq: number, duration: number, gain: number, p: Placement = {}): void {
    this.tone({ type: 'sine', freq: vary(freq), to: freq * 0.35, gain, attack: 0.002, duration, ...p });
  }

  /** A soft-clipping curve for a throat's growl (cached per drive). */
  private shaper(drive: number): WaveShaperNode['curve'] {
    const key = Math.round(drive * 10);
    let curve = this.shapers.get(key);
    if (!curve) {
      const n = 1024;
      const c = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        c[i] = Math.tanh(x * (1 + drive)) / Math.tanh(1 + drive);
      }
      curve = c;
      this.shapers.set(key, curve);
    }
    return curve;
  }

  /** A voice: a buzzing glottis (and breath) through three vowel formants. */
  private voice(spec: VoiceSpec): void {
    const ctx = this.ready();
    if (!ctx || !this.noise_) return;
    const t = ctx.currentTime + (spec.delay ?? 0);
    const end = t + spec.duration;
    const size = spec.size ?? 1;
    const mouth = ctx.createGain();
    const amp = ctx.createGain();
    const attack = spec.attack ?? 0.03;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(spec.gain, t + attack);
    amp.gain.setTargetAtTime(spec.gain * 0.7, t + attack, spec.duration * 0.5);
    amp.gain.exponentialRampToValueAtTime(0.0001, end);

    // The glottis: two slightly detuned saws, and the undertone.
    const sources: AudioScheduledSourceNode[] = [];
    const glottis = ctx.createGain();
    glottis.gain.value = 0.5;
    for (const detune of [0, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.detune.value = detune;
      setPitch(osc.frequency, spec.pitch, t, 1);
      osc.connect(glottis);
      sources.push(osc);
    }
    if (spec.sub) {
      const sub = ctx.createOscillator();
      sub.type = 'triangle';
      setPitch(sub.frequency, spec.pitch, t, 0.5);
      const g = ctx.createGain();
      g.gain.value = spec.sub;
      sub.connect(g);
      g.connect(amp);
      sources.push(sub);
    }
    let source: AudioNode = glottis;
    if (spec.grit) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.shaper(spec.grit);
      glottis.connect(shaper);
      source = shaper;
    }
    if (spec.breath) {
      const breath = ctx.createBufferSource();
      breath.buffer = this.noise_.white;
      breath.loop = true;
      const g = ctx.createGain();
      g.gain.value = spec.breath;
      breath.connect(g);
      g.connect(mouth);
      sources.push(breath);
    }
    source.connect(mouth);
    // The mouth: three formants, opening or closing from one vowel to the next.
    const formantOut = ctx.createGain();
    spec.vowel.forEach((f, i) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = [6, 9, 12][i];
      bp.frequency.setValueAtTime(f / size, t);
      if (spec.toVowel) bp.frequency.linearRampToValueAtTime(spec.toVowel[i] / size, end);
      const g = ctx.createGain();
      g.gain.value = [2.6, 1.5, 0.7][i];
      mouth.connect(bp);
      bp.connect(g);
      g.connect(formantOut);
    });
    formantOut.connect(amp);
    this.place(amp, spec);
    for (const s of sources) {
      s.start(t);
      s.stop(end + 0.05);
    }
  }

  // --- Places -------------------------------------------------------------------------------------------------

  /** The place's reverb. */
  private setSpace(kind: Ambience): void {
    const ctx = this.ctx;
    if (!ctx || !this.reverb || !this.reverbIn) return;
    const space = SPACES[kind];
    this.reverb.buffer = makeImpulse(ctx, space.seconds, space.damp);
    // Every effect gets a little of the place; voices and distant events ask for more themselves.
    this.sfxBus!.disconnect();
    this.sfxBus!.connect(this.master!);
    const send = ctx.createGain();
    send.gain.value = space.send;
    this.sfxBus!.connect(send);
    send.connect(this.reverbIn);
  }

  /** Starts the place's ambience (null stops it); its reverb and ground change with it. */
  public playAmbience(kind: Ambience | null): void {
    this.wantedAmbience = kind;
    if (this.ambience?.kind === kind) return;
    this.stopAmbience();
    const ctx = this.ctx;
    if (!kind || !ctx) return;
    this.setSpace(kind);
    const run: AmbienceRun = { kind, layers: [], events: [], timer: 0 };
    const now = ctx.currentTime;
    const every = (range: [number, number], fire: (at: number) => void, first = rand(range[0] * 0.2, range[1] * 0.6)) => {
      run.events.push({ next: now + first, every: range, fire });
    };
    switch (kind) {
      case 'village': {
        // Dusk in a desert village: the evening wind over the walls, the cooking fire, goats and a dog somewhere,
        // and the temple bell for the evening aarti.
        run.layers.push(this.layer({ color: 'pink', filter: 'bandpass', freq: 420, q: 0.8, gain: 0.045, sway: 0.08, sweep: 160 }));
        run.layers.push(this.layer({ color: 'brown', filter: 'lowpass', freq: 140, gain: 0.04, sway: 0.03 }));
        every([0.15, 0.9], (at) => this.crackle(at));
        every([9, 20], (at) => this.goat(at), 3);
        every([14, 30], (at) => this.dog(at), 8);
        every([1.5, 4], (at) => this.cricket(at), 6);
        every([26, 46], (at) => this.templeBell(at, 1.2, rand(-0.6, 0.6)), 12);
        break;
      }
      case 'baoli': {
        // Night in a Rajasthani stepwell: desert air over the rim, drips into the deep water, crickets in the
        // steps, a temple bell and a peacock far off.
        run.layers.push(this.layer({ color: 'pink', filter: 'bandpass', freq: 380, q: 0.7, gain: 0.05, sway: 0.06, sweep: 120 }));
        run.layers.push(this.layer({ color: 'brown', filter: 'lowpass', freq: 110, gain: 0.05, sway: 0.03 }));
        every([0.5, 2.4], (at) => this.drip(at));
        every([0.8, 3], (at) => this.cricket(at));
        every([24, 44], (at) => this.templeBell(at, 0.55, rand(-0.6, 0.6)), 6);
        every([28, 55], (at) => this.peacock(at), 14);
        break;
      }
      case 'akhada': {
        // Hanuman's jungle akhada: a hum of chanting voices on the drone's Sa, insects, leaves, koels and small
        // birds, the hoots of the vanaras in the trees and a small bell.
        run.layers.push(this.hum(123.5));
        run.layers.push(this.layer({ color: 'white', filter: 'bandpass', freq: 5600, q: 2.5, gain: 0.018, tremolo: 23 }));
        run.layers.push(this.layer({ color: 'pink', filter: 'highpass', freq: 2200, gain: 0.03, sway: 0.13 }));
        every([1, 3.5], (at) => this.bird(at));
        every([9, 18], (at) => this.koel(at), 4);
        every([14, 28], (at) => this.monkeys(at), 8);
        every([30, 50], (at) => this.templeBell(at, 1.6, rand(-0.5, 0.5)), 18);
        break;
      }
      case 'island': {
        // The caves: the sea breathing far behind, air moving through the tunnels, water dripping into pools, the
        // lamps' flames, a stone falling somewhere, and something large that drags itself through the dark.
        run.layers.push(this.layer({ color: 'brown', filter: 'lowpass', freq: 90, gain: 0.07, sway: 0.04 }));
        run.layers.push(this.layer({ color: 'pink', filter: 'bandpass', freq: 260, q: 6, gain: 0.03, sway: 0.05, sweep: 90 }));
        every([0.4, 1.8], (at) => this.drip(at));
        every([2.5, 6], (at) => this.drip(at + 0.03));
        every([0.3, 1.2], (at) => this.crackle(at));
        every([12, 26], (at) => this.stoneFall(at), 7);
        every([18, 38], (at) => this.slither(at), 10);
        every([9, 16], (at) => this.gust(at), 4);
        break;
      }
      case 'dwarka': {
        // Dwarka on the sea: waves breaking below the walls, wind off the water, gulls, and a shankh from the
        // temple now and then.
        run.layers.push(this.layer({ color: 'brown', filter: 'lowpass', freq: 220, gain: 0.08, sway: 0.08 }));
        run.layers.push(this.layer({ color: 'pink', filter: 'bandpass', freq: 600, q: 0.6, gain: 0.03, sway: 0.05, sweep: 200 }));
        every([5.5, 9], (at) => this.wave(at), 0.5);
        every([7, 18], (at) => this.gull(at));
        every([40, 70], (at) => this.shankh(at), 12);
        break;
      }
      case 'summit': {
        // Kailasha under the eclipse: wind howling over the ridge, snow hiss, the volcano's rumble below, and
        // thunder (with its lightning).
        run.layers.push(this.layer({ color: 'pink', filter: 'bandpass', freq: 520, q: 5, gain: 0.08, sway: 0.07, sweep: 260 }));
        run.layers.push(this.layer({ color: 'pink', filter: 'bandpass', freq: 900, q: 14, gain: 0.035, sway: 0.05, sweep: 380 }));
        run.layers.push(this.layer({ color: 'white', filter: 'highpass', freq: 6500, gain: 0.012, sway: 0.2 }));
        run.layers.push(this.layer({ color: 'brown', filter: 'lowpass', freq: 70, gain: 0.16, sway: 0.025 }));
        every([5, 12], (at) => this.gust(at));
        every([16, 32], (at) => this.thunder(at), 7);
        every([22, 40], (at) => this.eruption(at), 15);
        break;
      }
    }
    run.timer = window.setInterval(() => {
      const c = this.ctx;
      if (!c || c.state !== 'running') return;
      const horizon = c.currentTime + 0.4;
      for (const e of run.events) {
        if (e.next < c.currentTime - 1) e.next = c.currentTime + rand(...e.every) * 0.5; // after a pause
        while (e.next < horizon) {
          e.fire(Math.max(0, e.next - c.currentTime));
          e.next += rand(...e.every);
        }
      }
    }, 150);
    this.ambience = run;
  }

  private stopAmbience(): void {
    const run = this.ambience;
    if (!run) return;
    window.clearInterval(run.timer);
    for (const l of run.layers) l.stop();
    this.ambience = null;
  }

  /**
   * A steady ambience layer: looping noise through a filter whose level sways at `sway` Hz (and whose centre
   * sweeps by `sweep` Hz), or flutters at `tremolo` Hz (insects).
   */
  private layer(o: { color: NoiseColor; filter: BiquadFilterType; freq: number; q?: number; gain: number; sway?: number; sweep?: number; tremolo?: number }): { stop(): void } {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise_![o.color];
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.filter;
    f.frequency.value = o.freq;
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(o.gain, t, 1.5);
    const level = ctx.createGain();
    level.gain.value = 1;
    const lfos: OscillatorNode[] = [];
    const lfo = (rate: number, depth: number, param: AudioParam) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = rate * vary(1, 0.3);
      const d = ctx.createGain();
      d.gain.value = depth;
      osc.connect(d);
      d.connect(param);
      osc.start(t);
      lfos.push(osc);
    };
    if (o.sway) lfo(o.sway, 0.6, level.gain);
    if (o.sway && o.sweep) {
      lfo(o.sway * 0.7, o.sweep, f.frequency);
      lfo(o.sway * 1.9, o.sweep * 0.4, f.frequency);
    }
    if (o.tremolo) lfo(o.tremolo, 0.8, level.gain);
    src.connect(f);
    f.connect(level);
    level.connect(g);
    this.place(g, { amb: true, wet: 0.3 });
    src.start(t, Math.random() * 1.5);
    return {
      stop: () => {
        const now = ctx.currentTime;
        g.gain.setTargetAtTime(0, now, 0.6);
        src.stop(now + 3);
        for (const l of lfos) l.stop(now + 3);
      },
    };
  }

  /** Voices humming on `tonic` (the akhada's chant), swelling open now and then into an "om". */
  private hum(tonic: number): { stop(): void } {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(0.05, t, 3);
    const mouth = ctx.createBiquadFilter();
    mouth.type = 'lowpass';
    mouth.frequency.value = 380;
    mouth.Q.value = 2;
    const nodes: AudioScheduledSourceNode[] = [];
    // Several singers, each a little off the others; Sa, its octave below, and Pa.
    for (const [ratio, level] of [[1, 0.5], [1, 0.4], [0.5, 0.5], [1.5, 0.18], [2, 0.12]] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = tonic * ratio;
      osc.detune.value = rand(-9, 9);
      const vib = ctx.createOscillator();
      vib.frequency.value = rand(4.5, 5.5);
      const vibDepth = ctx.createGain();
      vibDepth.gain.value = rand(1.5, 3);
      vib.connect(vibDepth);
      vibDepth.connect(osc.detune);
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g);
      g.connect(mouth);
      osc.start(t);
      vib.start(t);
      nodes.push(osc, vib);
    }
    // The breath of the chant: the mouth opens slowly and closes (om), every ten seconds or so.
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.09;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 260;
    swell.connect(swellDepth);
    swellDepth.connect(mouth.frequency);
    swell.start(t);
    nodes.push(swell);
    mouth.connect(out);
    this.place(out, { amb: true, wet: 0.5 });
    return {
      stop: () => {
        const now = ctx.currentTime;
        out.gain.setTargetAtTime(0, now, 0.8);
        for (const n of nodes) n.stop(now + 4);
      },
    };
  }

  // Ambience events (`at`: seconds from now).

  private drip(at: number): void {
    const f = rand(900, 2100);
    const pan = rand(-0.8, 0.8);
    this.tone({ type: 'sine', freq: f, to: f * 1.7, gain: rand(0.04, 0.09), attack: 0.001, duration: 0.07, delay: at, pan, wet: 0.9, amb: true });
    if (Math.random() < 0.4) this.tone({ type: 'sine', freq: f * 0.8, to: f * 1.2, gain: 0.025, attack: 0.001, duration: 0.05, delay: at + 0.11, pan, wet: 0.9, amb: true });
  }

  private cricket(at: number): void {
    const f = rand(4100, 4700);
    const pan = rand(-0.9, 0.9);
    const pulses = Math.random() < 0.5 ? 3 : 4;
    const reps = 1 + Math.floor(Math.random() * 3);
    for (let r = 0; r < reps; r++) {
      for (let i = 0; i < pulses; i++) {
        this.tone({ type: 'sine', freq: f, gain: 0.03, attack: 0.003, duration: 0.018, delay: at + r * 0.32 + i * 0.03, pan, amb: true });
      }
    }
  }

  /** A temple bell; `brightness` above 1 is a smaller bell. */
  private templeBell(at: number, brightness: number, pan: number): void {
    const base = 310 * brightness;
    this.ring(base, [0.5, 1, 1.19, 1.5, 2, 2.52, 3.01], [6, 5, 4, 3.5, 2.5, 1.8, 1.2], 0.05, { delay: at, pan, wet: 0.8, amb: true });
  }

  /** A peacock's cry across the desert night: "may-awe", twice. */
  private peacock(at: number): void {
    const pan = rand(-0.7, 0.7);
    for (const [d, top] of [[0, 1], [0.75, 1.08]] as const) {
      this.voice({
        pitch: [[0, 620 * top], [0.12, 980 * top], [0.42, 760 * top]], duration: 0.5, gain: 0.05, vowel: VOWELS.e, toVowel: VOWELS.a,
        size: 0.55, breath: 0.15, grit: 2, attack: 0.04, delay: at + d, pan, wet: 0.8, amb: true,
      });
    }
  }

  private bird(at: number): void {
    const pan = rand(-0.9, 0.9);
    const f = rand(2400, 4200);
    const notes = 2 + Math.floor(Math.random() * 4);
    const up = Math.random() < 0.5;
    for (let i = 0; i < notes; i++) {
      this.tone({ type: 'sine', freq: f * (up ? 1 : 1.3), to: f * (up ? 1.35 : 0.9), gain: 0.03, attack: 0.005, duration: rand(0.05, 0.09), delay: at + i * rand(0.09, 0.14), pan, wet: 0.2, amb: true });
    }
  }

  /** The koel: "ku-oo", rising each time it repeats. */
  private koel(at: number): void {
    const pan = rand(-0.8, 0.8);
    const reps = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < reps; i++) {
      const f = 760 * (1 + i * 0.07);
      this.tone({ type: 'sine', freq: f, to: f * 1.45, gain: 0.045, attack: 0.03, duration: 0.42, delay: at + i * 0.62, pan, wet: 0.45, amb: true });
    }
  }

  /** Vanaras in the trees: a run of hoots that quickens and climbs. */
  private monkeys(at: number): void {
    const pan = rand(-0.8, 0.8);
    const hoots = 4 + Math.floor(Math.random() * 4);
    let d = 0;
    for (let i = 0; i < hoots; i++) {
      const f = 300 + i * 34;
      this.voice({
        pitch: [[0, f], [0.1, f * 1.45]], duration: 0.16, gain: 0.05, vowel: VOWELS.u, toVowel: VOWELS.o, size: 0.7,
        breath: 0.2, attack: 0.02, delay: at + d, pan, wet: 0.5, amb: true,
      });
      d += 0.34 - i * 0.03;
    }
  }

  /** A crack and a few sparks from the cooking fire. */
  private crackle(at: number): void {
    const pan = rand(-0.3, 0.6);
    const pops = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < pops; i++) {
      this.noise({ color: 'white', filter: 'bandpass', from: rand(1800, 3600), to: 1200, q: 1.5, duration: rand(0.02, 0.05), gain: rand(0.03, 0.07), attack: 0.001, delay: at + i * rand(0.03, 0.09), pan, wet: 0.2, amb: true });
    }
  }

  /** A goat in a pen: a wavering "meh-eh-eh". */
  private goat(at: number): void {
    const pan = rand(-0.8, 0.8);
    const f = rand(380, 470);
    this.voice({
      pitch: [[0, f], [0.08, f * 1.12], [0.5, f * 0.96]], duration: 0.6, gain: 0.04, vowel: VOWELS.e, toVowel: VOWELS.a,
      size: 0.6, breath: 0.25, grit: 4, attack: 0.03, delay: at, pan, wet: 0.5, amb: true,
    });
  }

  /** A village dog barking, two or three times, far off. */
  private dog(at: number): void {
    const pan = rand(-0.9, 0.9);
    const barks = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < barks; i++) {
      const f = rand(300, 360);
      this.voice({
        pitch: [[0, f * 1.2], [0.05, f * 1.5], [0.14, f]], duration: 0.16, gain: 0.035, vowel: VOWELS.a, toVowel: VOWELS.o,
        size: 0.8, breath: 0.3, grit: 6, attack: 0.008, delay: at + i * rand(0.28, 0.4), pan, wet: 0.7, amb: true,
      });
    }
  }

  /** A wave: the swell, the break and the wash running back. */
  private wave(at: number): void {
    const pan = rand(-0.5, 0.5);
    this.noise({ color: 'pink', filter: 'lowpass', from: 220, peak: 1600, to: 260, duration: 5.5, gain: rand(0.12, 0.2), attack: 2.2, delay: at, pan, amb: true });
    this.noise({ color: 'white', filter: 'highpass', from: 2500, to: 5000, duration: 3.2, gain: 0.04, attack: 0.4, delay: at + 2, pan: -pan, amb: true });
    this.thump(60, 1.2, 0.1, { delay: at + 1.9, amb: true });
  }

  private gull(at: number): void {
    const pan = rand(-0.9, 0.9);
    const calls = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < calls; i++) {
      this.voice({
        pitch: [[0, 1250], [0.06, 1650], [0.32, 1050]], duration: 0.36, gain: 0.04, vowel: VOWELS.e, toVowel: VOWELS.a, size: 0.5,
        grit: 3, attack: 0.02, delay: at + i * 0.42, pan, wet: 0.4, amb: true,
      });
    }
  }

  /** The shankh blown at the temple: a long horn tone rising into its note. */
  private shankh(at: number): void {
    const pan = rand(-0.4, 0.4);
    for (const [ratio, level] of [[1, 0.06], [2, 0.03], [3, 0.012]] as const) {
      this.tone({ type: 'sawtooth', freq: 214 * ratio, to: 226 * ratio, linear: true, gain: level, attack: 0.6, duration: 3, delay: at, pan, wet: 0.8, amb: true, filter: { type: 'lowpass', freq: 1300 } });
    }
  }

  /** A gust: the wind rising through the rocks and dropping. */
  private gust(at: number): void {
    this.noise({ color: 'pink', filter: 'bandpass', from: 300, peak: rand(900, 1400), to: 380, q: 3, duration: rand(3.5, 6), gain: rand(0.12, 0.2), attack: 1.6, delay: at, pan: rand(-0.6, 0.6), amb: true });
  }

  /** A few stones knocked loose somewhere in the dark, rattling down. */
  private stoneFall(at: number): void {
    const pan = rand(-0.9, 0.9);
    const n = 3 + Math.floor(Math.random() * 5);
    let d = 0;
    for (let i = 0; i < n; i++) {
      d += rand(0.06, 0.28);
      this.noise({ color: 'white', filter: 'bandpass', from: rand(700, 1600), to: 400, q: 3, duration: 0.05, gain: rand(0.02, 0.05), attack: 0.002, delay: at + d, pan, wet: 0.9, amb: true });
    }
    this.thump(80, 0.4, 0.04, { delay: at + d, pan, amb: true });
  }

  /** Something long dragging itself over wet rock, out of sight: a slow scrape and hiss that comes and goes. */
  private slither(at: number): void {
    const pan = rand(-0.8, 0.8);
    const len = rand(2.5, 4.5);
    this.noise({ color: 'pink', filter: 'bandpass', from: 1800, peak: 3200, to: 1500, q: 1.5, duration: len, gain: rand(0.025, 0.04), attack: len * 0.4, delay: at, pan, wet: 0.7, amb: true });
    this.noise({ color: 'brown', filter: 'lowpass', from: 160, peak: 260, to: 120, duration: len, gain: 0.05, attack: len * 0.5, delay: at, pan, wet: 0.6, amb: true });
    if (Math.random() < 0.5) this.noise({ color: 'white', filter: 'highpass', from: 4200, to: 5200, duration: 1.1, gain: 0.02, attack: 0.3, delay: at + len * 0.7, pan: -pan * 0.5, wet: 0.8, amb: true });
  }

  /** Lightning now, thunder after (sooner and sharper the closer it is). */
  private thunder(at: number): void {
    const near = Math.random();
    const lag = 0.25 + (1 - near) * 1.6;
    const pan = rand(-0.6, 0.6);
    const strength = 0.4 + near * 0.6;
    window.setTimeout(() => this.onLightning?.(strength), at * 1000);
    const t = at + lag;
    if (near > 0.5) this.noise({ color: 'white', filter: 'highpass', from: 1800, to: 900, duration: 0.25, gain: 0.25 * near, attack: 0.003, delay: t, pan, wet: 0.5, amb: true });
    this.noise({ color: 'brown', filter: 'lowpass', from: 900, to: 90, duration: 4.5, gain: 0.5 * strength, attack: 0.05, delay: t, pan, wet: 0.6, amb: true });
    for (let i = 1; i <= 3; i++) {
      this.noise({ color: 'brown', filter: 'lowpass', from: 420, to: 80, duration: 2.5, gain: 0.3 * strength / i, attack: 0.15, delay: t + i * rand(0.5, 0.9), pan: pan * -0.5, wet: 0.6, amb: true });
    }
    this.thump(55, 2.2, 0.35 * strength, { delay: t, amb: true });
  }

  /** The volcano below: a deep boom, rolling rumble and the crackle of falling rock. */
  private eruption(at: number): void {
    this.thump(42, 2.4, 0.4, { delay: at, amb: true });
    this.noise({ color: 'brown', filter: 'lowpass', from: 260, to: 50, duration: 4, gain: 0.3, attack: 0.3, delay: at, wet: 0.5, amb: true });
    for (let i = 0; i < 9; i++) {
      this.noise({ color: 'white', filter: 'bandpass', from: rand(1500, 3000), to: 900, q: 2, duration: 0.04, gain: 0.02, attack: 0.002, delay: at + 0.6 + rand(0, 2.2), pan: rand(-0.7, 0.7), wet: 0.6, amb: true });
    }
  }

  // --- Combat -------------------------------------------------------------------------------------------------

  /** Steel on bronze: a perfect parry (or a charge gathered). */
  public playParryClash(): void {
    if (this.sample('parry_clash')) return;
    this.synthClash();
  }

  /** A blow caught on the raised dhal. */
  public playShieldBlock(): void {
    if (this.sample('shield_block')) return;
    this.synthClash();
  }

  private synthClash(): void {
    this.tone({ type: 'triangle', freq: 1400, to: 320, gain: 0.5, duration: 0.09 });
    this.tone({ type: 'sine', freq: 840, gain: 0.38, duration: 1.2 });
    this.tone({ type: 'sine', freq: 2520, gain: 0.14, duration: 0.8 });
    this.tone({ type: 'sine', freq: 1263, gain: 0.08, duration: 0.6 });
  }

  /**
   * A weapon's whoosh. `pitch` is the swing's own (each blow of a combo differs; lower is heavier): the synth follows
   * it fully, the recording only a little (around its weapon's usual pitch).
   */
  public playSwordSwing(pitch = 1, kind: SwingKind = 'blade'): void {
    const usual = kind === 'lathi' ? 1.25 : kind === 'heavy' ? 0.62 : 0.95;
    if (this.sample(`swing_${kind}`, { rate: Math.max(0.8, Math.min(1.2, 1 + (pitch / usual - 1) * 0.35)) })) return;
    this.noise({ duration: 0.22, gain: 0.22, attack: 0.05, filter: 'bandpass', from: 400 * pitch, peak: 1400 * pitch, to: 300 * pitch, q: 3 });
  }

  /** The hero's slide along the ground. */
  public playSlide(): void {
    if (this.sample('slide')) return;
    this.noise({ duration: 0.22, gain: 0.22, attack: 0.05, filter: 'bandpass', from: 220, peak: 770, to: 165, q: 3 });
  }

  public playKatarSlash(): void {
    if (this.sample('katar_slash')) return;
    this.noise({ duration: 0.14, gain: 0.18, attack: 0.02, filter: 'bandpass', from: 900, peak: 2600, to: 700, q: 4 });
    this.tone({ type: 'sawtooth', freq: 900, to: 320, gain: 0.06, duration: 0.09 });
  }

  /** A spear's thrust: a quick, high steel whoosh (no recording of its own). */
  public playSpearThrust(): void {
    if (this.sample('swing_blade', { rate: 1.15, gain: 0.85 })) return;
    this.tone({ type: 'sine', freq: 650, to: 180, gain: 0.22, duration: 0.15 });
  }

  public playChakramThrow(): void {
    this.tone({ type: 'sawtooth', freq: 440, to: 880, linear: true, gain: 0.12, duration: 0.18, filter: { type: 'bandpass', freq: 650, q: 4 } });
    this.tone({ type: 'sawtooth', freq: 880, to: 420, linear: true, gain: 0.1, duration: 0.3, delay: 0.16, filter: { type: 'bandpass', freq: 650, q: 4 } });
  }

  /** A sorcerer's bolt leaves the hand (Mayavi). */
  public playMagicBolt(): void {
    if (this.sample('magic_bolt')) return;
    this.playFlameBurst();
  }

  /** A blow landing: steel by default, a hard knock for wood, a deep thud for a mace. */
  public playHitImpact(kind: ImpactKind = 'blade'): void {
    if (this.sample(`hit_${kind}`)) return;
    if (kind === 'wood') {
      this.tone({ type: 'triangle', freq: 330, to: 140, gain: 0.4, duration: 0.09 });
      this.noise({ duration: 0.05, gain: 0.2, attack: 0.001, filter: 'bandpass', from: 2800, to: 900, q: 1.5 });
    } else if (kind === 'crush') {
      this.tone({ type: 'triangle', freq: 110, to: 28, gain: 0.55, duration: 0.3 });
      this.tone({ type: 'sine', freq: 70, to: 30, gain: 0.35, duration: 0.45 });
      this.noise({ duration: 0.12, gain: 0.2, attack: 0.002, filter: 'lowpass', from: 1800, to: 200 });
    } else {
      this.tone({ type: 'triangle', freq: 160, to: 35, gain: 0.42, duration: 0.16 });
      this.noise({ duration: 0.08, gain: 0.16, attack: 0.002, filter: 'lowpass', from: 2400, to: 400 });
    }
  }

  /** A blade turned aside by hide or armour: a dull knock and a short scrape. */
  public playGlancingBlow(): void {
    if (this.sample('glancing_blow')) return;
    this.tone({ type: 'triangle', freq: 260, to: 110, gain: 0.26, duration: 0.1 });
    this.noise({ duration: 0.07, gain: 0.1, attack: 0.002, filter: 'bandpass', from: 3200, to: 1800, q: 2 });
  }

  /** A deep brass gong: a posture breaks. */
  public playPostureBreak(): void {
    if (this.sample('posture_break')) return;
    [120, 185, 290, 440].forEach((f, i) => this.tone({ type: 'sine', freq: f, to: f * 0.95, gain: 0.25 / (i + 1), duration: 1.8 }));
  }

  public playFlameBurst(): void {
    if (this.sample('flame_burst')) return;
    this.tone({ type: 'sawtooth', freq: 120, to: 45, gain: 0.35, duration: 0.6, filter: { type: 'lowpass', freq: 450 } });
    this.noise({ duration: 0.8, gain: 0.22, attack: 0.05, filter: 'lowpass', from: 300, peak: 1600, to: 200 });
  }

  public playBossPhaseTransition(): void {
    if (this.sample('phase_surge', { wet: 0.3 })) return;
    this.tone({ type: 'sawtooth', freq: 80, to: 320, linear: true, gain: 0.32, duration: 0.8, filter: { type: 'lowpass', freq: 900 } });
    this.tone({ type: 'sawtooth', freq: 320, to: 70, gain: 0.3, duration: 0.8, delay: 0.75, filter: { type: 'lowpass', freq: 700 } });
    this.playPostureBreak();
  }

  /** A low, rising warning before an enemy swing. */
  public playTelegraphSound(): void {
    if (this.sample('telegraph')) return;
    this.tone({ type: 'sawtooth', freq: 300, to: 650, gain: 0.08, duration: 0.22, filter: { type: 'bandpass', freq: 500, q: 5 } });
  }

  /** A boss roars: a growl (detuned saws) over a throaty noise swell. Lower `pitch` is bigger. */
  public playRoar(pitch = 1, kind: RoarKind = 'brute'): void {
    if (this.sample(`roar_${kind}`, { rate: 0.7 + 0.3 * pitch, wet: 0.35 })) return;
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

  /** Raiders at the gate: a narsingha horn blown twice, rough and rising, and a shout under it. */
  public playRaidHorn(): void {
    for (const d of [0, 1.1]) {
      for (const [ratio, level] of [[1, 0.09], [2, 0.04], [3, 0.02]] as const) {
        this.tone({ type: 'sawtooth', freq: 150 * ratio, to: 196 * ratio, gain: level, attack: 0.18, duration: d ? 1.6 : 0.8, delay: d, wet: 0.6, filter: { type: 'lowpass', freq: 1500 } });
      }
    }
    this.noise({ duration: 1.4, gain: 0.12, attack: 0.2, filter: 'bandpass', from: 500, peak: 900, to: 400, q: 1.2, delay: 0.5 });
  }

  /** A heavy blade comes down, heard in the dark (the guru's fall). */
  public playFallingBlow(): void {
    this.noise({ duration: 0.35, gain: 0.3, attack: 0.08, filter: 'bandpass', from: 300, peak: 1100, to: 200, q: 2 });
    this.thump(60, 1.4, 0.5, { delay: 0.24, wet: 0.6 });
    this.noise({ color: 'brown', filter: 'lowpass', from: 700, to: 90, duration: 1.2, gain: 0.25, attack: 0.01, delay: 0.24, wet: 0.5 });
  }

  /** A chapter card lands: a struck bell over a deep drum. */
  public playCardHit(): void {
    this.tone({ type: 'sine', freq: 82, to: 41, gain: 0.55, duration: 1.6 });
    this.noise({ duration: 0.25, gain: 0.12, attack: 0.002, filter: 'lowpass', from: 900, to: 120 });
    this.ring(220, [1, 1.5, 2, 2.67, 4], [3.5, 3.1, 2.7, 2.3, 1.9], 0.12, { wet: 0.5 });
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
    [261.6, 329.6, 392, 523.3].forEach((f, i) => this.tone({ type: 'sine', freq: f, gain: 0.2, duration: 2.4, delay: i * 0.14, wet: 0.4 }));
  }

  /** The player falls: a low bell, slowly fading. */
  public playDefeat(): void {
    [110, 164.8, 220].forEach((f, i) => this.tone({ type: 'sine', freq: f, to: f * 0.97, gain: 0.22 / (i + 1), duration: 3.5, delay: i * 0.05, wet: 0.5 }));
  }

  // --- Recorded dialogue ---------------------------------------------------------------------------------------

  /** Decodes a recorded line; null before audio has started (no gesture yet) or if the file is not audio. */
  public async decodeVoice(data: ArrayBuffer): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      return await this.ctx.decodeAudioData(data);
    } catch {
      return null;
    }
  }

  /**
   * Plays a recorded line from `offset` seconds through the effects bus (so the master volume applies), with `wet`
   * of the place's reverb (a remembered voice sounds far off), `delay` seconds from now. The music dips under it.
   * Returns how to stop it, or null if audio is not running.
   */
  public playVoice(buffer: AudioBuffer, offset = 0, wet = 0, delay = 0): (() => void) | null {
    const ctx = this.ready();
    if (!ctx || offset >= buffer.duration) return null;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.9;
    src.connect(gain);
    this.place(gain, { wet });
    src.start(ctx.currentTime + delay, offset);
    const release = this.music.duck(delay);
    src.onended = release;
    return () => {
      try {
        src.stop();
      } catch {
        // Already ended.
      }
      release();
    };
  }
}

/** Sets a pitch curve from [seconds, Hz] points, scaled by `k`. */
function setPitch(param: AudioParam, points: [number, number][], t: number, k: number): void {
  param.setValueAtTime(points[0][1] * k, t);
  for (const [at, hz] of points.slice(1)) param.linearRampToValueAtTime(hz * k, t + at);
}

/** Two seconds of white, pink and brown noise. */
function makeNoise(ctx: AudioContext): Record<NoiseColor, AudioBuffer> {
  const length = ctx.sampleRate * 2;
  const make = (fill: (data: Float32Array) => void) => {
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    fill(buffer.getChannelData(0));
    return buffer;
  };
  return {
    white: make((d) => {
      for (let i = 0; i < length; i++) d[i] = Math.random() * 2 - 1;
    }),
    // Paul Kellet's filter: -3 dB per octave.
    pink: make((d) => {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }),
    // Integrated white: -6 dB per octave.
    brown: make((d) => {
      let last = 0;
      for (let i = 0; i < length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
    }),
  };
}

/** A stereo room tail: decaying noise, darker (`damp`) as it goes. */
function makeImpulse(ctx: AudioContext, seconds: number, damp: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buffer.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const x = i / length;
      // The filter closes as the tail decays: high frequencies die first.
      const k = 1 - damp * Math.min(1, x * 3) * 0.95;
      lp += k * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.pow(1 - x, 2.2) * (i < rate * 0.012 ? i / (rate * 0.012) : 1);
    }
  }
  return buffer;
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
  village: { tonic: 116.5, pluck: 1.05, pulse: 0 },
  baoli: { tonic: 110, pluck: 1.1, pulse: 0 },
  akhada: { tonic: 123.5, pluck: 0.95, pulse: 0 },
  dwarka: { tonic: 103.8, pluck: 1.2, pulse: 0 },
  summit: { tonic: 92.5, pluck: 1.25, pulse: 0 },
} satisfies Record<string, MusicMood>;

/** The soundtrack's loops (public/assets/music, ElevenLabs, 60 s each). */
export type Track = 'title' | 'village' | 'baoli' | 'akhada' | 'island' | 'dwarka' | 'summit' | 'boss' | 'andhaka_final';
const TRACKS = new Set(trackIds);
/** Each loop's level, evening out how loud they came out (the akhada's was made quiet). */
const TRACK_GAIN: Partial<Record<Track, number>> = { akhada: 1.5, baoli: 1.15, title: 1.1, boss: 0.85, andhaka_final: 0.9 };
/** The drone a track falls back to if its recording is missing or will not decode. */
const FALLBACK: Record<Track, MusicMood> = {
  title: MOODS.title,
  village: MOODS.village,
  baoli: MOODS.baoli,
  akhada: MOODS.akhada,
  island: MOODS.dwarka,
  dwarka: MOODS.dwarka,
  summit: MOODS.summit,
  boss: { ...MOODS.baoli, pulse: 84 },
  andhaka_final: { ...MOODS.summit, pulse: 84 },
};
/** Seconds one loop takes to hand over to the next. */
const CROSSFADE = 1.5;
/** Decoded loops kept at once (about 20 MB each); the least recently played go first. */
const KEEP_DECODED = 4;
/** Music level under a spoken line, and in a cutscene. */
const DUCKED = 0.4;
const DIMMED = 0.65;

/**
 * The soundtrack: one recorded loop at a time, crossfading to the next, dipping under spoken lines (`duck`) and in
 * cutscenes (`dim`). Loops are fetched and decoded when first asked for (or ahead, with `prefetch`); the one playing
 * carries on until the next is ready. A loop with no recording plays the tanpura drone (`MusicBed`) in its place.
 */
class Music {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private readonly bed = new MusicBed();
  private wanted: Track | null = null;
  private playing: { track: Track; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  /** In order of last use. */
  private readonly decoded = new Map<Track, AudioBuffer>();
  private readonly pending = new Map<Track, Promise<AudioBuffer | null>>();
  private readonly failed = new Set<Track>();
  private ducks = 0;
  private dimmed = false;

  public connect(ctx: AudioContext, bus: GainNode): void {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.connect(bus);
    this.bed.connect(ctx, this.out);
    this.play(this.wanted);
  }

  /** The loop now playing or on its way (for testing). */
  public get track(): Track | null {
    return this.wanted;
  }

  /** Crossfades to `track` (null fades out). Asking for the one already playing changes nothing. */
  public play(track: Track | null): void {
    this.wanted = track;
    if (!this.ctx) return;
    if (track && this.playing?.track === track) return;
    if (!track) {
      this.fadeOut();
      this.bed.play(null);
      return;
    }
    const ready = this.decoded.get(track);
    if (ready) {
      this.start(track, ready);
    } else if (!TRACKS.has(track) || this.failed.has(track)) {
      this.fadeOut();
      this.bed.play(FALLBACK[track]);
    } else {
      void this.load(track).then((buffer) => {
        if (this.wanted !== track || this.playing?.track === track) return;
        if (buffer) this.start(track, buffer);
        else this.play(track); // now known to have failed: the drone
      });
    }
  }

  /** Starts fetching and decoding a loop that will be wanted soon (a boss's). */
  public prefetch(track: Track): void {
    if (this.ctx && TRACKS.has(track)) void this.load(track);
  }

  /** Dips the music (under a voice, `delay` seconds from now); call what it returns to let it back up. */
  public duck(delay = 0): () => void {
    this.ducks++;
    this.applyLevel(delay, 0.12);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.ducks--;
      this.applyLevel(0, 0.5);
    };
  }

  /** Lower in cutscenes. */
  public dim(on: boolean): void {
    if (this.dimmed === on) return;
    this.dimmed = on;
    this.applyLevel(0, 0.6);
  }

  private applyLevel(delay: number, smoothing: number): void {
    if (!this.ctx || !this.out) return;
    const now = this.ctx.currentTime;
    const g = this.out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.setTargetAtTime((this.ducks > 0 ? DUCKED : 1) * (this.dimmed ? DIMMED : 1), now + delay, smoothing);
  }

  private start(track: Track, buffer: AudioBuffer): void {
    const ctx = this.ctx!;
    this.fadeOut();
    this.bed.play(null);
    // Most recently used last.
    this.decoded.delete(track);
    this.decoded.set(track, buffer);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(TRACK_GAIN[track] ?? 1, t + CROSSFADE);
    src.connect(gain);
    gain.connect(this.out!);
    src.start(t);
    this.playing = { track, src, gain };
  }

  private fadeOut(): void {
    const p = this.playing;
    if (!p || !this.ctx) return;
    this.playing = null;
    const t = this.ctx.currentTime;
    const g = p.gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + CROSSFADE);
    p.src.stop(t + CROSSFADE + 0.05);
  }

  private load(track: Track): Promise<AudioBuffer | null> {
    const ready = this.decoded.get(track);
    if (ready) return Promise.resolve(ready);
    let p = this.pending.get(track);
    if (!p) {
      const ctx = this.ctx!;
      p = fetch(`/assets/music/${track}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => {
          this.decoded.set(track, buffer);
          this.evict();
          return buffer;
        })
        .catch((err) => {
          console.warn(`[Music] ${track} could not be loaded; the drone plays instead`, err);
          this.failed.add(track);
          return null;
        })
        .finally(() => this.pending.delete(track));
      this.pending.set(track, p);
    }
    return p;
  }

  /** Lets go of the least recently used loops beyond `KEEP_DECODED` (never the one playing or wanted). */
  private evict(): void {
    for (const track of this.decoded.keys()) {
      if (this.decoded.size <= KEEP_DECODED) return;
      if (track !== this.playing?.track && track !== this.wanted) this.decoded.delete(track);
    }
  }
}

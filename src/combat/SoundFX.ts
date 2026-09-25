/**
 * SoundFX - Procedural Web Audio API Sound Synthesizer
 * Synthesizes resonant bronze temple bells, steel deflection clangs, and combat audio in real-time.
 * Zero external .wav/.mp3 downloads required.
 */
export class SoundFX {
  private static instance: SoundFX | null = null;
  private static ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  private static _isMuted: boolean = false;

  private constructor() {}

  public static getInstance(): SoundFX {
    if (!SoundFX.instance) {
      SoundFX.instance = new SoundFX();
    }
    return SoundFX.instance;
  }

  public static init(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public init(): void {
    SoundFX.init();
  }

  public static toggleMute(): boolean {
    this._isMuted = !this._isMuted;
    if (this.instance) {
      this.instance.isMuted = this._isMuted;
    }
    return this._isMuted;
  }

  public toggleMute(): boolean {
    return SoundFX.toggleMute();
  }

  /**
   * Resonant bronze temple bell + high-pitched steel deflection clang
   */
  public static playParry(): void {
    if (this._isMuted) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Layer 1: High metallic snap (sharp transient)
    const oscSnap = ctx.createOscillator();
    const gainSnap = ctx.createGain();
    oscSnap.type = 'triangle';
    oscSnap.frequency.setValueAtTime(1400, now);
    oscSnap.frequency.exponentialRampToValueAtTime(320, now + 0.08);

    gainSnap.gain.setValueAtTime(0.7, now);
    gainSnap.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    oscSnap.connect(gainSnap);
    gainSnap.connect(ctx.destination);

    // Layer 2: Resonant Bronze Temple Bell ring (deep metallic ringout)
    const oscBell = ctx.createOscillator();
    const gainBell = ctx.createGain();
    oscBell.type = 'sine';
    oscBell.frequency.setValueAtTime(840, now);

    gainBell.gain.setValueAtTime(0.6, now);
    gainBell.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    oscBell.connect(gainBell);
    gainBell.connect(ctx.destination);

    // Layer 3: Overtone shimmer
    const oscHarmonic = ctx.createOscillator();
    const gainHarmonic = ctx.createGain();
    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(2520, now); // 3x overtone
    gainHarmonic.gain.setValueAtTime(0.25, now);
    gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    oscHarmonic.connect(gainHarmonic);
    gainHarmonic.connect(ctx.destination);

    oscSnap.start(now);
    oscSnap.stop(now + 0.09);
    oscBell.start(now);
    oscBell.stop(now + 1.25);
    oscHarmonic.start(now);
    oscHarmonic.stop(now + 0.85);
  }

  public playParryClash(): void {
    SoundFX.playParry();
  }

  /**
   * Low dull wooden/leather thud for a standard block
   */
  public static playBlock(): void {
    if (this._isMuted) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.15);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playBlock(): void {
    SoundFX.playBlock();
  }

  /**
   * Sword whoosh swing sound
   */
  public playSwordSwing(pitch = 1.0): void {
    if (this.isMuted || SoundFX._isMuted) return;
    SoundFX.init();
    const ctx = SoundFX.ctx;
    if (!ctx) return;

    const t = ctx.currentTime;
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    const bufferSize = Math.floor(ctx.sampleRate * 0.2);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400 * pitch, t);
    filter.frequency.exponentialRampToValueAtTime(1400 * pitch, t + 0.08);
    filter.frequency.exponentialRampToValueAtTime(300 * pitch, t + 0.2);
    filter.Q.setValueAtTime(3.0, t);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.22);
  }

  /**
   * Fast sharp dual Katar slice
   */
  public playKatarSlash(): void {
    if (this.isMuted || SoundFX._isMuted) return;
    SoundFX.init();
    const ctx = SoundFX.ctx;
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.09);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Spear piercing thrust sound
   */
  public playSpearThrust(): void {
    if (this.isMuted || SoundFX._isMuted) return;
    SoundFX.init();
    const ctx = SoundFX.ctx;
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.15);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Chakram spinning projectile whistle
   */
  public playChakramThrow(): void {
    if (this.isMuted || SoundFX._isMuted) return;
    SoundFX.init();
    const ctx = SoundFX.ctx;
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.15);
    osc.frequency.linearRampToValueAtTime(440, t + 0.35);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.Q.setValueAtTime(4, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  /**
   * Flesh hit / impact thud
   */
  public playHitImpact(): void {
    if (this.isMuted || SoundFX._isMuted) return;
    SoundFX.init();
    const ctx = SoundFX.ctx;
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.15);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Deep brass gong on posture / Marma break
   */
  public playPostureBreak(): void {
    if (this.isMuted || SoundFX._isMuted) return;
    SoundFX.init();
    const ctx = SoundFX.ctx;
    if (!ctx) return;

    const t = ctx.currentTime;
    const gongFreqs = [120, 185, 290, 440];

    gongFreqs.forEach((f, i) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.95, t + 1.8);

      gain.gain.setValueAtTime(0.25 / (i + 1), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 1.85);
    });
  }

  /**
   * Boss Flame Burst / Roar
   */
  public playFlameBurst(): void {
    if (this.isMuted || SoundFX._isMuted) return;
    SoundFX.init();
    const ctx = SoundFX.ctx;
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.6);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.65);
  }

  /**
   * Boss Phase 2 Transition Warcry
   */
  public playBossPhaseTransition(): void {
    if (this.isMuted || SoundFX._isMuted) return;
    SoundFX.init();
    const ctx = SoundFX.ctx;
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(320, t + 0.8);
    osc.frequency.exponentialRampToValueAtTime(70, t + 1.5);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 1.6);
  }

  /**
   * Wall kick / acrobatic leap sound
   */
  public playWallKick(): void {
    if (this.isMuted || SoundFX._isMuted) return;
    SoundFX.init();
    const ctx = SoundFX.ctx;
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.12);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Level Cleared Triumphal Bell
   */
  public playLevelClear(): void {
    if (this.isMuted || SoundFX._isMuted) return;
    SoundFX.init();
    const ctx = SoundFX.ctx;
    if (!ctx) return;

    const t = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.50]; // C5 Major chord

    chord.forEach((freq, idx) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);

      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.25, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.12 + 1.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 1.6);
    });
  }

  /**
   * Dodge roll whoosh
   */
  public playDodgeWhoosh(): void {
    if (this.isMuted || SoundFX._isMuted) return;
    SoundFX.init();
    const ctx = SoundFX.ctx;
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.25);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  /**
   * Telegraph audio cue for enemy attack
   */
  public playTelegraphSound(): void {
    if (this.isMuted || SoundFX._isMuted) return;
    SoundFX.init();
    const ctx = SoundFX.ctx;
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(650, t + 0.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, t);
    filter.Q.setValueAtTime(5, t);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.24);
  }
}

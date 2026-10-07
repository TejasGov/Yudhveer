import * as THREE from 'three';
import { SoundFX } from '../combat/SoundFX';
import { Voices } from '../combat/Voices';

/** One spoken line. */
export interface Line {
  /** Who speaks, as shown above the line (a name, in sentence case). Omit for a line with no speaker. */
  speaker?: string;
  text: string;
  /** Its recording, `public/assets/voice/<voice>.mp3`. Without one (or until the file exists) the line is read. */
  voice?: string;
  /** Seconds on screen, instead of the recording's length or the reading time. */
  hold?: number;
  /**
   * Its recording echoes (`SoundFX.playVoiceEcho`): a remembered voice, a verse ringing out. `gap` between repeats,
   * `feedback` how long they ring on, `wet` its reverb.
   */
  echo?: { gap?: number; feedback?: number; wet?: number };
  /**
   * How it is shown in a cutscene: `memory`, a voice remembered (italic, a little faded); `verse`, words that ring
   * out over the picture (large and bold in the middle of the frame, no speaker: the prologue's shloka).
   */
  look?: 'memory' | 'verse';
}

/** Letters of the Sanskrit transliteration a verse's face lacks: drawn as the plain letter with its dot (`.iast-dot`). */
const IAST_DOTS: Record<string, [string, 'above' | 'below']> = { 'ṁ': ['m', 'above'], 'ṃ': ['m', 'below'], 'ṛ': ['r', 'below'], 'ṅ': ['n', 'above'], 'ṇ': ['n', 'below'], 'ṭ': ['t', 'below'], 'ḍ': ['d', 'below'], 'ṣ': ['s', 'below'], 'ḥ': ['h', 'below'] };

/** Sets `text` into `el`, its dotted letters as a plain letter with a drawn dot (no markup from the text itself). */
function setVerse(el: HTMLElement, text: string): void {
  el.textContent = '';
  let run = '';
  for (const ch of text) {
    const dotted = IAST_DOTS[ch];
    if (!dotted) {
      run += ch;
      continue;
    }
    if (run) el.append(run);
    run = '';
    const span = document.createElement('span');
    span.className = `iast-dot ${dotted[1]}`;
    span.textContent = dotted[0];
    el.append(span);
  }
  if (run) el.append(run);
}

/** Devanagari in a line: it is set in the Devanagari face. */
const DEVANAGARI = /[ऀ-ॿ]/;

/**
 * `scene`: a cutscene's lines, low in the frame over the letterbox; the player can read ahead. `voice`: a voice in
 * the hero's head during the fight (the guru's remembered teachings), above the HUD, on its timer only (the buttons
 * are busy fighting), in italics, with a little of the place's reverb. `aloud`: spoken out loud in the arena during
 * the fight (a foe's taunt): placed and timed as `voice`, but upright and dry, a man in front of him and not a memory.
 */
export type LineStyle = 'scene' | 'voice' | 'aloud';

/** The styles spoken over a fight: they wait behind each other instead of cutting in. */
const IN_FIGHT: readonly LineStyle[] = ['voice', 'aloud'];

/** Seconds a line without a recording stays up: a lead-in, then a comfortable reading pace. */
export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return THREE.MathUtils.clamp(1.2 + words * 0.3, 2.2, 8);
}

/** After its recording ends, a line stays this long. */
export const VOICE_TAIL = 0.45;
/** A recording that arrives later than this into its line is not started (the line has moved on without it). */
const LATE_VOICE = 0.6;
/** A line can't be read past in its first moments (one press should not skip two lines). */
const ADVANCE_GUARD = 0.25;
const VOICE_WET = 0.35;

const $ = (id: string) => document.getElementById(id)!;

interface Entry {
  line: Line;
  style: LineStyle;
  /** Called when this line is done (the last line of a group); `cut`: the player read past it. */
  done?: (cut: boolean) => void;
}

/**
 * Subtitles and the voices behind them. Lines play one after another, each for its recording's length or its reading
 * time; `advance` (the skip button tapped, in cutscenes) moves on early. The caller runs `update` every rendered
 * frame while the game is not paused.
 */
export class Dialogue {
  private readonly root = $('subtitle');
  private readonly speakerEl = $('subtitle-speaker');
  private readonly textEl = $('subtitle-line');
  private queue: Entry[] = [];
  private entry: Entry | null = null;
  private time = 0;
  private duration = 0;
  private voice: AudioBuffer | null = null;
  /** Line seconds at which its recording started. */
  private voiceAt = 0;
  private stopVoice: (() => void) | null = null;
  private paused = false;
  /** Bumped whenever the line changes, so a recording that arrives late knows it is too late. */
  private token = 0;

  /**
   * Speaks `lines`, then calls `onDone` (`cut`: the player read past the last one). Cutscene lines replace whatever
   * is being said; in-fight lines wait behind other in-fight lines.
   */
  public play(lines: Line[], style: LineStyle, onDone?: (cut: boolean) => void): void {
    const entries: Entry[] = lines.map((line) => ({ line, style }));
    if (entries.length === 0) {
      onDone?.(false);
      return;
    }
    entries[entries.length - 1].done = onDone;
    Voices.preload(lines.map((l) => l.voice));
    if (IN_FIGHT.includes(style) && this.entry && IN_FIGHT.includes(this.entry.style)) {
      this.queue.push(...entries);
      return;
    }
    this.clear();
    this.queue = entries;
    this.next(false);
  }

  /** Whether a line is up. */
  public get speaking(): boolean {
    return this.entry !== null;
  }

  /** The player read ahead: the next line now (cutscene lines only). */
  public advance(): void {
    if (this.entry?.style !== 'scene' || this.time < ADVANCE_GUARD) return;
    this.next(true);
  }

  public update(dt: number): void {
    if (!this.entry || this.paused) return;
    this.time += dt;
    if (this.time >= this.duration) this.next(false);
  }

  /** The game paused: the line holds and its recording stops; on resume it picks up where it was. */
  public setPaused(on: boolean): void {
    if (on === this.paused) return;
    this.paused = on;
    if (on) this.silence();
    else if (this.entry && this.voice) this.speak(this.voice, this.time - this.voiceAt);
  }

  /** Stops talking at once (nothing waiting is called). */
  public clear(): void {
    this.token++;
    this.queue = [];
    this.entry = null;
    this.silence();
    this.voice = null;
    this.root.classList.remove('show');
  }

  private next(cut: boolean): void {
    const done = this.entry?.done;
    this.token++;
    this.silence();
    this.voice = null;
    this.entry = this.queue.shift() ?? null;
    if (this.entry) this.start(this.entry);
    else this.root.classList.remove('show');
    done?.(cut);
  }

  private start(entry: Entry): void {
    const { line } = entry;
    this.time = 0;
    this.duration = line.hold ?? readingTime(line.text);
    this.speakerEl.textContent = line.speaker ?? '';
    if (line.look === 'verse') setVerse(this.textEl, line.text);
    else this.textEl.textContent = line.text;
    this.root.classList.toggle('voice', entry.style === 'voice');
    this.root.classList.toggle('aloud', entry.style === 'aloud');
    this.root.classList.toggle('memory', line.look === 'memory');
    this.root.classList.toggle('verse', line.look === 'verse');
    this.textEl.classList.toggle('deva', DEVANAGARI.test(line.text));
    this.root.classList.remove('show');
    void this.root.offsetWidth; // restart the fade between lines
    this.root.classList.add('show');

    const ready = Voices.get(line.voice);
    if (ready) {
      this.useVoice(ready);
      return;
    }
    if (!Voices.has(line.voice)) return;
    const token = this.token;
    void Voices.load(line.voice).then((buffer) => {
      if (buffer && token === this.token && this.time < LATE_VOICE) this.useVoice(buffer);
    });
  }

  /** The recording starts now, and the line lasts as long as it does (unless the line has a hold of its own). */
  private useVoice(buffer: AudioBuffer): void {
    this.voice = buffer;
    this.voiceAt = this.time;
    if (this.entry?.line.hold === undefined) this.duration = this.time + buffer.duration + VOICE_TAIL;
    if (!this.paused) this.speak(buffer, 0);
  }

  private speak(buffer: AudioBuffer, offset: number): void {
    this.silence();
    // Only the voice in his head carries the place's reverb; a line said aloud (a cutscene's, a foe's taunt) is dry.
    const echo = this.entry?.line.echo;
    if (echo && offset === 0) {
      this.stopVoice = SoundFX.getInstance().playVoiceEcho(buffer, echo.wet ?? 0.3, 0, echo);
      return;
    }
    this.stopVoice = SoundFX.getInstance().playVoice(buffer, offset, this.entry?.style === 'voice' ? VOICE_WET : 0);
  }

  private silence(): void {
    this.stopVoice?.();
    this.stopVoice = null;
  }
}

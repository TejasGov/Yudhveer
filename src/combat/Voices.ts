import available from 'virtual:voice-lines';
import { SoundFX } from './SoundFX';
import { asset } from '../core/Assets';

const AVAILABLE = new Set(available);

/**
 * Recorded dialogue: `public/assets/voice/<id>.mp3`, fetched and decoded once, on first use or ahead of time with
 * `preload`. Only files that exist are asked for (the build lists them, see vite.config.ts), and anything that
 * still goes wrong (a bad file, audio not started yet) just means the line is shown without a voice.
 */
export class Voices {
  private static readonly loaded = new Map<string, AudioBuffer>();
  private static readonly pending = new Map<string, Promise<AudioBuffer | null>>();

  /** Whether a recording exists for this line. */
  public static has(id: string | undefined): id is string {
    return !!id && AVAILABLE.has(id);
  }

  /** The decoded recording, if it is ready now. */
  public static get(id: string | undefined): AudioBuffer | null {
    return id ? Voices.loaded.get(id) ?? null : null;
  }

  /** Fetches and decodes a recording; null if there is none or it cannot be played. */
  public static load(id: string | undefined): Promise<AudioBuffer | null> {
    if (!Voices.has(id)) return Promise.resolve(null);
    const ready = Voices.loaded.get(id);
    if (ready) return Promise.resolve(ready);
    let p = Voices.pending.get(id);
    if (!p) {
      p = fetch(asset(`voice/${id}.mp3`))
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((data) => (data ? SoundFX.getInstance().decodeVoice(data) : null))
        .catch(() => null)
        .then((buffer) => {
          Voices.pending.delete(id);
          // Not decoded (audio not started yet): try again next time.
          if (buffer) Voices.loaded.set(id, buffer);
          return buffer;
        });
      Voices.pending.set(id, p);
    }
    return p;
  }

  /** Starts loading these lines' recordings, so they are ready when spoken. */
  public static preload(ids: (string | undefined)[]): void {
    for (const id of ids) void Voices.load(id);
  }
}

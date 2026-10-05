/**
 * Dev: numbers for a rendered sound, since a test cannot listen. Level (peak, RMS over time), where its energy sits
 * (bands, spectral centroid over the first seconds) and how long until it is effectively silent.
 */
export interface SoundReport {
  seconds: number;
  peakDb: number;
  /** When the peak falls (s). */
  peakAt: number;
  /** RMS of each half second, dBFS. */
  rmsDb: number[];
  /** Seconds until the level stays below -50 dBFS. */
  tailSeconds: number;
  /** Share of the energy in each band over `window` seconds from `from`. */
  bands: Record<string, number>;
  centroidHz: number;
}

const db = (x: number) => (x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -120);

export function analyseSound(buffer: AudioBuffer, window = 3, from = 0): SoundReport {
  const rate = buffer.sampleRate;
  const n = buffer.length;
  const mono = new Float32Array(n);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < n; i++) mono[i] += d[i] / buffer.numberOfChannels;
  }
  let peak = 0;
  let peakAt = 0;
  for (let i = 0; i < n; i++) {
    if (Math.abs(mono[i]) > peak) {
      peak = Math.abs(mono[i]);
      peakAt = i / rate;
    }
  }
  const half = Math.floor(rate / 2);
  const rmsDb: number[] = [];
  let tail = 0;
  for (let s = 0; s < n; s += half) {
    let sum = 0;
    const e = Math.min(n, s + half);
    for (let i = s; i < e; i++) sum += mono[i] * mono[i];
    const r = Math.sqrt(sum / (e - s));
    rmsDb.push(db(r));
    if (db(r) > -50) tail = e / rate;
  }
  // Averaged magnitude spectrum: 4096-point frames, hopping by half, Hann window.
  const size = 4096;
  const spectrum = new Float64Array(size / 2);
  const frames = Math.max(1, Math.floor((Math.min(n, rate * window) - size) / (size / 2)));
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  for (let f = 0; f < frames; f++) {
    const off = Math.floor(from * rate) + f * (size / 2);
    for (let i = 0; i < size; i++) {
      re[i] = (mono[off + i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k < size / 2; k++) spectrum[k] += re[k] * re[k] + im[k] * im[k];
  }
  const edges: [string, number, number][] = [
    ['<80', 0, 80], ['80-250', 80, 250], ['250-1k', 250, 1000], ['1k-4k', 1000, 4000], ['>4k', 4000, rate / 2],
  ];
  const bands: Record<string, number> = {};
  let total = 0;
  let weighted = 0;
  for (let k = 1; k < size / 2; k++) {
    total += spectrum[k];
    weighted += spectrum[k] * ((k * rate) / size);
  }
  for (const [name, lo, hi] of edges) {
    let e = 0;
    for (let k = 1; k < size / 2; k++) {
      const hz = (k * rate) / size;
      if (hz >= lo && hz < hi) e += spectrum[k];
    }
    bands[name] = Math.round((e / total) * 1000) / 1000;
  }
  return { seconds: buffer.duration, peakDb: db(peak), peakAt: Math.round(peakAt * 1000) / 1000, rmsDb, tailSeconds: tail, bands, centroidHz: Math.round(weighted / total) };
}

/** In-place radix-2 FFT. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const ar = re[i + k + len / 2];
        const ai = im[i + k + len / 2];
        const xr = ar * wr - ai * wi;
        const xi = ar * wi + ai * wr;
        re[i + k + len / 2] = re[i + k] - xr;
        im[i + k + len / 2] = im[i + k] - xi;
        re[i + k] += xr;
        im[i + k] += xi;
      }
    }
  }
}

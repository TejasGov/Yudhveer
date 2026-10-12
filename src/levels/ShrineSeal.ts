import * as THREE from 'three';

/*
 * The rock seal across Chapter III's last chamber, and the magic that opens it (docs/ISLAND_DEMONESS.md).
 *
 * Closed, it is a carved gate of the cave's own rock: a wall of dressed stone with a pointed arch in it, two door halves
 * filling the arch, runes cut into all of it and glowing dimly (cyan, a breathing ward). The rock is the cave wall's
 * material (its strata, its normal map, its colour), mapped with the same world-space strata so the gate carries on
 * the walls on either side of it.
 *
 * `open()` runs a fixed sequence (times in seconds from the call):
 *   0.00  the runes ignite one by one (rune order is painted into the rune map), a chime for each few
 *   0.40  a low rumble, a tremor in the camera, dust shaken from the roof
 *   0.90  cracks of light spread across the face from the middle
 *   1.40  the doors split at the seam and slide sideways into the rock either side, debris falling
 *   2.00  light floods through the gap (cyan turning amber), a shaft and a spill on the floor, motes streaming out
 *   2.20  a resonant bloom; the altar room's lamps come up to full
 * and settles open by `END`. Nothing here sinks through the floor: the doors go sideways, behind the wings of the gate.
 *
 * Everything in the picture is shader work on a handful of draws (the rock and its runes, a gap glow, light shafts, a floor
 * spill, three point clouds, one instanced debris mesh): no extra lights are made here; the one point light is the level's.
 */

/** Hooks the level wires to the game (so this file only needs three): the camera's shake, the sounds, a puff of floor dust. */
export interface SealHooks {
  /** A jolt of the cutscene camera (`joltCamera`'s amount, metres of the old shake). */
  jolt?(amount: number): void;
  /** A cue for the sound: what it is, and (for the chimes) how far up the build it is. */
  sound?(cue: 'chime' | 'rumble' | 'split' | 'grind' | 'bloom', n: number): void;
  /** Dust thrown up from the floor at a point. */
  dust?(at: THREE.Vector3, count: number): void;
}

/** Where the gate stands and how big it is (game coordinates; the cave is 16 m wide and 8 m high here). */
export const GATE = {
  /** The face of the rock wall, the doors' front and back, and the back of the passage. */
  zFront: -71.95,
  zBack: -73.35,
  doorFront: -72.05,
  doorBack: -72.95,
  /** Half the arch's width, the floor, the arch's spring line and its rise (so its crown is at 3.8). */
  half: 4.3,
  floor: -2.5,
  spring: 0.8,
  rise: 3.0,
  /** The wall's extent (it runs into the cave rock either side and above). */
  outer: 10,
  bottom: -3.4,
  top: 7.2,
  /** How far a door goes: its edge ends well inside the rock beyond the jamb. */
  slide: 5.0,
};

/** The gate's collider while closed: a box over the arch's opening (half extents), centred on the passage. */
/** How much lighter the dressed stone of the doors reads than the raw wings of the gate. */
const DOOR_TONE = 1.18;
export const GATE_COLLIDER = { centre: new THREE.Vector3(0, 0.6, -72.5), half: new THREE.Vector3(GATE.half + 0.1, 4.8, 0.8) };

/** Seconds the whole sequence takes (the last of its dust and motes gone), and when the doors move. */
export const SEAL_TIMES = { split: 1.4, slideEnd: 2.8, flood: 2.2, end: 8.0 };

// ---------------------------------------------------------------------------------------------------------------------
// Noise and a seeded generator (deterministic: the same seal every run)

function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), sx), l(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), sx), sy),
    l(l(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), sx), l(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), sx), sy),
    sz,
  );
}

/** The rock face's relief (metres in or out of the plane): broad swells and a finer grain. */
function relief(x: number, y: number): number {
  return (vnoise(x * 0.8, y * 0.8, 1.7) - 0.5) * 0.24 + (vnoise(x * 2.6, y * 2.6, 5.3) - 0.5) * 0.08;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------------------------------------------------
// The rune map: R the glow of a rune stroke, G when it ignites (0..1), B how deep it is cut (darkens the rock round it)

/** The part of the gate's plane the rune map covers, in game x and y. */
const RUNE_AREA = { x0: -6, x1: 6, y0: -2.7, y1: 5.4 };
const RUNE_W = 1280;
const RUNE_H = 864;
/** Where the mandala sits (the middle of the doors). */
const HUB = { x: 0, y: 1.1 };

/** `Math`, held in the module: the raster's per-pixel loops call it a million times, and a global lookup is slow wherever the globals sit behind a wrapper (a test's sandbox). */
const M = Math;

class RuneRaster {
  private readonly pxPerM = RUNE_W / (RUNE_AREA.x1 - RUNE_AREA.x0);

  /** `data` (RGBA, RUNE_W by RUNE_H) is painted into as it stands: a map begun elsewhere, or the empty one. */
  constructor(public readonly data: Uint8Array = new Uint8Array(RUNE_W * RUNE_H * 4)) {}

  /**
   * Marks every pixel within reach of a primitive (distance in metres, from `dist`). `spans` (optional) gives the x ranges
   * worth visiting on a row, for shapes that are thin in a big box (a ring).
   */
  private stroke(box: [number, number, number, number], width: number, order: number, dist: (x: number, y: number) => number, glow = true, spans?: (y: number, reach: number) => [number, number][]): void {
    const reach = width * 0.9 + 0.045;
    const px0 = M.max(0, M.floor((box[0] - reach - RUNE_AREA.x0) * this.pxPerM));
    const px1 = M.min(RUNE_W - 1, M.ceil((box[1] + reach - RUNE_AREA.x0) * this.pxPerM));
    const py0 = M.max(0, M.floor((box[2] - reach - RUNE_AREA.y0) * this.pxPerM));
    const py1 = M.min(RUNE_H - 1, M.ceil((box[3] + reach - RUNE_AREA.y0) * this.pxPerM));
    const o = M.round(M.min(1, M.max(0, order)) * 255);
    for (let py = py0; py <= py1; py++) {
      const y = RUNE_AREA.y0 + (py + 0.5) / this.pxPerM;
      const ranges: [number, number][] = spans ? spans(y, reach) : [[box[0] - reach, box[1] + reach]];
      for (const [r0, r1] of ranges) {
      const a0 = M.max(px0, M.floor((r0 - RUNE_AREA.x0) * this.pxPerM)), a1 = M.min(px1, M.ceil((r1 - RUNE_AREA.x0) * this.pxPerM));
      for (let px = a0; px <= a1; px++) {
        const x = RUNE_AREA.x0 + (px + 0.5) / this.pxPerM;
        const d = dist(x, y);
        const core = M.min(1, M.max(0, 1 - (d - width / 2) / 0.016));
        const groove = M.min(1, M.max(0, 1 - (d - width * 0.9) / 0.04));
        if (groove <= 0.01) continue;
        const i = (py * RUNE_W + px) * 4;
        const d8 = this.data;
        const r = M.round(core * 255), b = M.round(groove * 255);
        if (glow && r > d8[i]) d8[i] = r;
        if (b >= d8[i + 2]) { if (glow) d8[i + 1] = o; d8[i + 2] = b; }
      }
      }
    }
  }

  /** The x ranges of a row that are within `reach` of the segment (a, b): a thin diagonal is a band, not its box. */
  private static segmentSpans(ax: number, ay: number, bx: number, by: number): (y: number, reach: number) => [number, number][] {
    const dy = by - ay;
    return (y, reach) => {
      if (M.abs(dy) < 1e-6) return [[M.min(ax, bx) - reach, M.max(ax, bx) + reach]];
      const t0 = M.min(1, M.max(0, (y - reach - ay) / dy)), t1 = M.min(1, M.max(0, (y + reach - ay) / dy));
      const x0 = ax + (bx - ax) * t0, x1 = ax + (bx - ax) * t1;
      return [[M.min(x0, x1) - reach, M.max(x0, x1) + reach]];
    };
  }

  /** A cut in the stone that does not glow (its edge darkens the rock): the gate's mouldings and joints. */
  public cut(ax: number, ay: number, bx: number, by: number, width: number): void {
    const dx = bx - ax, dy = by - ay;
    const len2 = M.max(1e-9, dx * dx + dy * dy);
    this.stroke([M.min(ax, bx), M.max(ax, bx), M.min(ay, by), M.max(ay, by)], width, 0, (x, y) => {
      const t = M.min(1, M.max(0, ((x - ax) * dx + (y - ay) * dy) / len2));
      const ex = x - ax - dx * t, ey = y - ay - dy * t;
      return M.sqrt(ex * ex + ey * ey);
    }, false, RuneRaster.segmentSpans(ax, ay, bx, by));
  }

  public line(ax: number, ay: number, bx: number, by: number, width: number, order: number): void {
    const dx = bx - ax, dy = by - ay;
    const len2 = M.max(1e-9, dx * dx + dy * dy);
    this.stroke([M.min(ax, bx), M.max(ax, bx), M.min(ay, by), M.max(ay, by)], width, order, (x, y) => {
      const t = M.min(1, M.max(0, ((x - ax) * dx + (y - ay) * dy) / len2));
      const ex = x - ax - dx * t, ey = y - ay - dy * t;
      return M.sqrt(ex * ex + ey * ey);
    }, true, RuneRaster.segmentSpans(ax, ay, bx, by));
  }

  public ring(cx: number, cy: number, r: number, width: number, order: number): void {
    this.stroke([cx - r, cx + r, cy - r, cy + r], width, order, (x, y) => M.abs(M.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) - r), true, (y, reach) => {
      const dy = y - cy, out = r + reach, inner = r - reach;
      if (M.abs(dy) > out) return [];
      const hx = M.sqrt(out * out - dy * dy);
      if (M.abs(dy) >= inner) return [[cx - hx, cx + hx]];
      const ix = M.sqrt(inner * inner - dy * dy);
      return [[cx - hx, cx - ix], [cx + ix, cx + hx]];
    });
  }

  public dot(cx: number, cy: number, r: number, order: number): void {
    this.stroke([cx, cx, cy, cy], r * 2, order, (x, y) => M.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)));
  }

  /** Pixels in a metre of the map. */
  public get pixelsPerMetre(): number { return this.pxPerM; }

  /**
   * Lays a coverage layer from a scratch canvas (square, `size` px, an even number, centred on the world point (cx, cy)) on the map.
   * The scratch pixels are the map's own (same scale, aligned on the pixel edge), so nothing is resampled.
   */
  public lay(core: Uint8ClampedArray, groove: Uint8ClampedArray, size: number, cx: number, cy: number, order: number): void {
    const pcx = M.round((cx - RUNE_AREA.x0) * this.pxPerM), pcy = M.round((cy - RUNE_AREA.y0) * this.pxPerM);
    const o = M.round(M.min(1, M.max(0, order)) * 255), d8 = this.data;
    for (let j = 0; j < size; j++) {
      const py = pcy + size / 2 - j - 1;
      if (py < 0 || py >= RUNE_H) continue;
      for (let i = 0; i < size; i++) {
        const px = pcx - size / 2 + i;
        if (px < 0 || px >= RUNE_W) continue;
        const k = (j * size + i) * 4 + 3;
        const g = groove[k];
        if (g < 4) continue;
        const at = (py * RUNE_W + px) * 4;
        if (core[k] > d8[at]) d8[at] = core[k];
        if (g >= d8[at + 2]) { d8[at + 1] = o; d8[at + 2] = g; }
      }
    }
  }

  /**
   * A syllable in Devanagari: with no canvas to set it in (a test, a platform without one) a stand-in drawn in strokes, a
   * headline with a stem or two hanging from it and a curl, `h` tall, turned `rot` radians.
   */
  public stand(text: string, cx: number, cy: number, h: number, rot: number, order: number): void {
    const c = M.cos(rot), sn = M.sin(rot);
    const P = (u: number, v: number): [number, number] => [cx + (u * c - v * sn) * h, cy + (u * sn + v * c) * h];
    const seg = (u0: number, v0: number, u1: number, v1: number) => { const a = P(u0, v0), b = P(u1, v1); this.line(a[0], a[1], b[0], b[1], 0.03, order); };
    const n = M.max(1, M.min(3, Array.from(text).length > 2 ? 3 : 1));
    const w = 0.32 * n;
    seg(-w, 0.34, w, 0.34);
    for (let k = 0; k < n; k++) {
      const x = -w + (2 * w * (k + 0.5)) / n;
      seg(x, 0.34, x, -0.4);
      seg(x - 0.14, -0.05, x, -0.05);
    }
  }

  public texture(): THREE.DataTexture {
    const tex = new THREE.DataTexture(this.data, RUNE_W, RUNE_H, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 4;
    tex.name = 'SealRunes';
    tex.needsUpdate = true;
    return tex;
  }
}

/** The font the seal's text is set in: the game's own Devanagari face (index.html), then the system's. */
const DEVA_FONT = '"Tiro Devanagari Hindi", "Nirmala UI", "Mangal", "Noto Sans Devanagari", serif';
/** The bija mantras (ॐ ह्रीं श्रीं क्लीं ऐं) the rings repeat, and the syllables of the columns (ॐ नमः शिवाय; the first vowels). */
const BIJA = ['ॐ', 'ह्रीं', 'श्रीं', 'क्लीं', 'ऐं'];
const PANCHAKSHARA = ['न', 'मः', 'शि', 'वा', 'य'];
const VOWELS = ['अ', 'आ', 'इ', 'उ'];

/** Whether the game's Devanagari face is loaded (true too where there is no font loading to wait for). */
function fontReady(): boolean {
  return typeof document === 'undefined' || !document.fonts || document.fonts.check('40px "Tiro Devanagari Hindi"', 'ॐ');
}

interface TextItem { text: string; x: number; y: number; h: number; rot: number; order: number }

/**
 * Sets each item of text in the canvas (core and a wider, blurred cut round it) and lays it on the map; without a canvas,
 * strokes. Returns the painter: each call lays items for up to `budget` milliseconds (at least one; Infinity: all of them)
 * and says whether every item is laid. The items go on in order however the calls slice them, so the map is the same.
 */
function textPainter(r: RuneRaster, items: TextItem[]): (budget: number) => boolean {
  const SIZE = 160;
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const ctx = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;
  if (!canvas || !ctx) {
    return () => {
      for (const it of items) r.stand(it.text, it.x, it.y, it.h, it.rot, it.order);
      return true;
    };
  }
  canvas.width = SIZE; canvas.height = SIZE;
  const ppm = r.pixelsPerMetre;
  const set = (it: TextItem, cut: boolean) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate(-it.rot);
    ctx.font = `${Math.round(it.h * ppm * 0.92)}px ${DEVA_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round';
    // The cut is the letter fattened by a few millimetres and softened; the glowing stroke the letter a little thickened.
    ctx.filter = cut ? 'blur(1.3px)' : 'none';
    ctx.lineWidth = cut ? 0.045 * ppm : 0.007 * ppm;
    ctx.strokeText(it.text, 0, 0);
    ctx.fillText(it.text, 0, 0);
    ctx.filter = 'none';
    return ctx.getImageData(0, 0, SIZE, SIZE).data;
  };
  let next = 0;
  return (budget) => {
    const until = performance.now() + budget;
    while (next < items.length) {
      const it = items[next++];
      r.lay(set(it, false), set(it, true), SIZE, it.x, it.y, it.order);
      if (performance.now() >= until) break;
    }
    return next >= items.length;
  };
}

/** The gate's carving without its text (the strokes), and the text still to be laid over it; painted once for the page. */
interface RuneStrokes { data: Uint8Array; text: TextItem[] }
let strokeCache: RuneStrokes | null = null;
/** The finished map (strokes and text, in the face the game means), kept for the page: a retry or a replay builds the gate again. */
let finishedRunes: Uint8Array | null = null;
/** Milliseconds of text laid per slice while the level loads (the rest waits for the next turn, so no frame is held up). */
const TEXT_SLICE_MS = 5;

/**
 * Paints the gate's carving into a map (R the glow of a stroke, G when it ignites, B how deep it is cut): a Sri Yantra
 * on the doors (nested interlocking triangles round a bindu with ॐ, two rings of lotus petals, a bhupura square with its four
 * T-shaped gates), the bija mantras round it, Devanagari in the columns beside it and in a ring round the arch, ॐ at its crown;
 * and the gate's mouldings, cut but not lit. This is the strokes; the text, listed with them, is laid over them by `RunePaint`.
 */
function runeStrokes(): RuneStrokes {
  if (strokeCache) return strokeCache;
  const r = new RuneRaster();
  const rand = rng(31);
  const { half, spring, rise, floor } = GATE;
  const hx = HUB.x, hy = HUB.y;
  // The order a stroke ignites in follows its distance from the hub (the middle first, the arch's crown last), a little jittered.
  const orderAt = (x: number, y: number) => Math.min(0.9, 0.06 + Math.hypot(x - hx, (y - hy) * 0.9) * 0.1 + rand() * 0.03);
  const W = 0.028;
  // The seam: the door's split, first to wake.
  r.line(0, floor + 0.05, 0, spring + rise - 0.1, 0.034, 0.02);
  const text: TextItem[] = [];

  // The bindu: a ring with ॐ in it.
  r.ring(hx, hy, 0.27, W, 0.03);
  text.push({ text: 'ॐ', x: hx, y: hy, h: 0.3, rot: 0, order: 0.03 });
  // Nine triangles, four upward and five downward, interlocked round it (apex and base heights from the hub).
  const tri = (apex: number, base: number, width: number, order: number) => {
    r.line(hx, hy + apex, hx - width, hy + base, W, order);
    r.line(hx, hy + apex, hx + width, hy + base, W, order);
    r.line(hx - width, hy + base, hx + width, hy + base, W, order);
  };
  // (apex, base, half-width of the base): the upward ones and the downward ones differ in size and stand at staggered heights, so
  // that each pierces the others' sides and no two lie alike.
  [[0.98, -0.42, 0.86], [0.8, -0.6, 0.66], [0.64, -0.34, 0.5], [0.5, -0.5, 0.36]].forEach(([a, b, w], k) => tri(a, b, w, 0.08 + k * 0.025));
  [[-0.98, 0.5, 0.84], [-0.84, 0.64, 0.62], [-0.7, 0.36, 0.52], [-0.58, 0.54, 0.4], [-0.64, 0.4, 0.6]].forEach(([a, b, w], k) => tri(a, b, w, 0.1 + k * 0.025));
  // The rings and the lotus: eight petals, then sixteen.
  r.ring(hx, hy, 1.05, W, 0.24);
  const petals = (n: number, r0: number, r1: number, phase: number, order: number) => {
    for (let i = 0; i < n; i++) {
      const a = phase + (i / n) * Math.PI * 2, wide = (Math.PI / n) * 0.84;
      for (const side of [-1, 1]) {
        let prev: [number, number] | null = null;
        for (let k = 0; k <= 9; k++) {
          const t = k / 9, rad = r0 + (r1 - r0) * t;
          const ang = a + side * wide * Math.pow(1 - t, 0.8) * (1 + 0.28 * Math.sin(Math.PI * t));
          const pt: [number, number] = [hx + Math.cos(ang) * rad, hy + Math.sin(ang) * rad];
          if (prev) r.line(prev[0], prev[1], pt[0], pt[1], W, order + i * 0.002);
          prev = pt;
        }
      }
    }
  };
  petals(8, 1.07, 1.45, Math.PI / 8, 0.27);
  r.ring(hx, hy, 1.47, W, 0.32);
  petals(16, 1.49, 1.83, 0, 0.35);
  r.ring(hx, hy, 1.86, W, 0.44);
  r.ring(hx, hy, 1.92, W, 0.45);
  // The bija mantras round it (thirty, round the outer ring, their tops outward).
  for (let i = 0; i < 30; i++) {
    const a = Math.PI / 2 - (i / 30) * Math.PI * 2;
    text.push({ text: BIJA[i % BIJA.length], x: hx + Math.cos(a) * 2.06, y: hy + Math.sin(a) * 2.06, h: 0.25, rot: a - Math.PI / 2, order: 0.5 + (i / 30) * 0.1 });
  }
  // The bhupura: a square frame with a T-shaped gate in the middle of each side.
  const S = 2.22;
  for (let q = 0; q < 4; q++) {
    const nx = Math.round(Math.cos((q * Math.PI) / 2)), ny = Math.round(Math.sin((q * Math.PI) / 2));
    const P = (a: number, b: number): [number, number] => [hx + nx * (S + b) - ny * a, hy + ny * (S + b) + nx * a];
    const seg = (a0: number, b0: number, a1: number, b1: number, order: number) => { const p = P(a0, b0), t = P(a1, b1); r.line(p[0], p[1], t[0], t[1], W, order); };
    seg(-S, 0, -0.34, 0, 0.62); seg(0.34, 0, S, 0, 0.62);
    seg(-0.34, 0, -0.34, 0.24, 0.64); seg(-0.34, 0.24, 0.34, 0.24, 0.64); seg(0.34, 0.24, 0.34, 0, 0.64);
    seg(-0.16, 0.24, -0.16, 0.09, 0.66); seg(-0.16, 0.09, 0.16, 0.09, 0.66); seg(0.16, 0.09, 0.16, 0.24, 0.66);
  }
  // Columns beside the yantra (the bijas, then the vowels), and on each wing beyond the jamb ॐ नमः शिवाय, read from the top down.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const y = -1.75 + k * 0.7;
      text.push({ text: BIJA[(5 - k) % BIJA.length], x: side * 3.05, y, h: 0.4, rot: 0, order: orderAt(side * 3.05, y) + 0.1 });
    }
    for (let k = 0; k < 4; k++) {
      const y = -1.5 + k * 0.7;
      text.push({ text: VOWELS[3 - k], x: side * 3.8, y, h: 0.4, rot: 0, order: orderAt(side * 3.8, y) + 0.1 });
    }
    for (let k = 0; k < 5; k++) text.push({ text: PANCHAKSHARA[4 - k], x: side * 5.1, y: -1.9 + k * 0.7, h: 0.5, rot: 0, order: 0.78 + k * 0.015 });
  }
  // The gate's mouldings, cut into the stone (they darken the rock, they do not glow): a sill, rails and panels on each door, the
  // arch's edge and the joints of its voussoirs.
  r.cut(-half + 0.1, floor + 0.12, half - 0.1, floor + 0.12, 0.05);
  const arch = (ax: number, sy: number, ry: number, from: number, to: number, w: number) => {
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a0 = from + ((to - from) * i) / n, a1 = from + ((to - from) * (i + 1)) / n;
      r.cut(ax * Math.cos(a0), sy + ry * Math.sin(a0), ax * Math.cos(a1), sy + ry * Math.sin(a1), w);
    }
  };
  arch(half + 0.18, spring, rise + 0.18, 0, Math.PI, 0.06);
  arch(half + 0.34, spring, rise + 0.34, 0, Math.PI, 0.04);
  for (const side of [-1, 1]) {
    // A panel inset in each door half: up the outer edge, along the sill, round under the arch, and a rail across.
    const x0 = side * 0.4, x1 = side * (half - 0.45);
    r.cut(x0, floor + 0.45, x0, spring + rise * 0.98 - 0.5, 0.04);
    r.cut(x1, floor + 0.45, x1, spring, 0.04);
    r.cut(x0, floor + 0.45, x1, floor + 0.45, 0.04);
    r.cut(x0, -1.35, x1, -1.35, 0.035);
  }
  for (let i = 1; i < 14; i++) {
    const phi = Math.PI * (i / 14);
    const c = Math.cos(phi), sn = Math.sin(phi);
    r.cut((half + 0.18) * c, spring + (rise + 0.18) * sn, (half + 1.05) * c * 1.0, spring + (rise + 1.05) * sn, 0.035);
  }
  // The ring of syllables round the arch, set on the stone above it (turned so each stands out from the arch).
  for (let i = 0; i < 22; i++) {
    const phi = Math.PI * (0.06 + (i / 21) * 0.88);
    const nx = Math.cos(phi) / half, ny = Math.sin(phi) / rise;
    const nl = Math.hypot(nx, ny);
    const ax = half * Math.cos(phi), ay = spring + rise * Math.sin(phi);
    text.push({ text: BIJA[i % BIJA.length], x: ax + (nx / nl) * 0.55, y: ay + (ny / nl) * 0.55, h: 0.36, rot: Math.atan2(ny, nx) - Math.PI / 2, order: 0.84 + (i % 5) * 0.012 });
  }
  // The crown: ॐ in a ring above the arch's apex.
  r.ring(0, 4.85, 0.36, W, 0.9);
  text.push({ text: 'ॐ', x: 0, y: 4.85, h: 0.4, rot: 0, order: 0.9 });
  return strokeCache = { data: r.data, text };
}

/**
 * The gate's rune map, in two layers: the strokes (quick, and painted once for the page) and the text over them, which is slow
 * to set in the canvas and so is laid a few milliseconds at a time between the turns of the load, not in the level's
 * constructor (it is long done before the hero reaches the gate). A map already finished is handed back as it is, with no
 * painting at all; one begun before the game's Devanagari face had arrived is laid again, over the same strokes, once it has.
 */
class RunePaint {
  public readonly texture: THREE.DataTexture;
  private readonly raster: RuneRaster | null = null;
  private readonly strokes: RuneStrokes | null = null;
  private paint: ((budget: number) => boolean) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** The face is as it will be, so what is finished is the map for good. */
  private settled: boolean;
  private disposed = false;

  constructor() {
    if (finishedRunes) {
      this.settled = true;
      this.texture = new RuneRaster(finishedRunes).texture();
      return;
    }
    this.strokes = runeStrokes();
    this.raster = new RuneRaster(this.strokes.data.slice());
    this.texture = this.raster.texture();
    this.settled = fontReady();
    this.lay();
    // The game's Devanagari face may still be on its way: the text is laid again once it is here.
    if (!this.settled) {
      void document.fonts.load('48px "Tiro Devanagari Hindi"', 'ॐह्रीं').then(() => this.arrived(true), () => this.arrived(false));
    }
  }

  /** The text over the bare strokes (again, if it was begun): all at once with no document to set it in, else slice by slice. */
  private lay(): void {
    if (!this.raster || !this.strokes) return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.raster.data.set(this.strokes.data);
    this.paint = textPainter(this.raster, this.strokes.text);
    if (typeof document === 'undefined') { this.paint(Infinity); this.done(); } else this.timer = setTimeout(() => this.slice(), 0);
  }

  private slice(): void {
    this.timer = null;
    if (this.disposed || !this.paint) return;
    if (this.paint(TEXT_SLICE_MS)) this.done();
    else this.timer = setTimeout(() => this.slice(), 0);
  }

  private done(): void {
    this.paint = null;
    this.texture.needsUpdate = true;
    if (this.settled && this.raster && !finishedRunes) finishedRunes = this.raster.data;
  }

  /** The face has come (`loaded`) or never will: what is laid in it is the map from now on. */
  private arrived(loaded: boolean): void {
    if (this.disposed) return;
    this.settled = true;
    if (loaded) this.lay();
    else if (!this.paint) this.done();
  }

  public dispose(): void {
    this.disposed = true;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.texture.dispose();
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The rock: a gate wall (wings, lintel and jambs: one mesh) and two door halves

/** Vertex data for one mesh: positions, the rock's strata uv, the rune map's uv, a colour (variation about 1), indices. */
class Mesher {
  public readonly pos: number[] = [];
  public readonly uv: number[] = [];
  public readonly rune: number[] = [];
  public readonly col: number[] = [];
  public readonly idx: number[] = [];
  /** A multiplier on the colour of everything added next. */
  public tone = 1;

  public get count(): number { return this.pos.length / 3; }

  /** A vertex at (x, y) on the gate's plane pushed to depth `z`; its rune uv comes from (x, y) as it is when the gate is shut. */
  public add(x: number, y: number, z: number, uAxis: number, vAxis: number, bare = false): number {
    this.pos.push(x, y, z);
    // The cave's strata: 5 m across, 4 m high a repeat (build_island.py), V flipped for glTF.
    this.uv.push(uAxis / 5, 1 - vAxis / 4);
    // Off the rune map (its edge is blank) for the passage's walls and the doors' edges: no runes are cut there.
    if (bare) this.rune.push(-0.5, -0.5);
    else this.rune.push((x - RUNE_AREA.x0) / (RUNE_AREA.x1 - RUNE_AREA.x0), (y - RUNE_AREA.y0) / (RUNE_AREA.y1 - RUNE_AREA.y0));
    // Variation of the colour: broad mottling, darker toward the floor (grime) and a little in the cut-in edges.
    const n = (0.9 + 0.2 * vnoise(x * 0.5, y * 0.5, 9.1)) * this.tone;
    const grime = 1 - 0.28 * (1 - smooth(-2.5, 0.6, y));
    this.col.push(n * grime, n * grime, n * grime);
    return this.count - 1;
  }

  public quad(a: number, b: number, c: number, d: number): void { this.idx.push(a, b, c, c, b, d); }

  /** Joins the rows of a grid built in `rows` x `cols` vertices from `first`. */
  public grid(first: number, rows: number, cols: number): void {
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = first + j * cols + i;
        this.quad(a, a + 1, a + cols, a + cols + 1);
      }
    }
  }

  public build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aRune', new THREE.Float32BufferAttribute(this.rune, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** The arch's point at angle `phi` (0 at its right spring, pi at its left), by the gate's measurements. */
const archPoint = (phi: number): [number, number] => [GATE.half * Math.cos(phi), GATE.spring + GATE.rise * Math.sin(phi)];

const WING_COLS = 14;
const ROW_STEP = 0.3;
const WING_ROWS = Math.round((GATE.spring - GATE.bottom) / ROW_STEP) + 1;

/** The gate wall: the two wings either side of the arch, the lintel over it, and the jambs and soffit (the arch's depth). */
function buildFrame(): THREE.BufferGeometry {
  const m = new Mesher();
  const { half, outer, spring, bottom, top, zFront, zBack } = GATE;
  // The face at (x, y): the same function everywhere, so the wings, the lintel and the jambs meet without a crack.
  const face = (x: number, y: number) => m.add(x, y, zFront + relief(x, y), x, y);
  // The wings: x from the jamb out to the cave rock, y from below the floor up to the spring line.
  for (const side of [1, -1]) {
    const first = m.count;
    for (let j = 0; j < WING_ROWS; j++) {
      const y = bottom + j * ROW_STEP;
      for (let i = 0; i <= WING_COLS; i++) face(side * (half + ((outer - half) * i) / WING_COLS), y);
    }
    m.grid(first, WING_ROWS, WING_COLS + 1);
  }
  // The lintel: a loft from the arch (and the spring line out to either side of it) up to the top of the wall.
  const bottomPath: [number, number][] = [];
  for (let i = 0; i <= WING_COLS; i++) bottomPath.push([outer - ((outer - half) * i) / WING_COLS, spring]);
  const ARCH = 56;
  for (let i = 1; i <= ARCH; i++) bottomPath.push(archPoint((i / ARCH) * Math.PI));
  for (let i = 1; i <= WING_COLS; i++) bottomPath.push([-half - ((outer - half) * i) / WING_COLS, spring]);
  const N = bottomPath.length - 1;
  const ROWS = 17;
  const first = m.count;
  for (let j = 0; j < ROWS; j++) {
    const t = j / (ROWS - 1);
    for (let i = 0; i <= N; i++) {
      const [bx, by] = bottomPath[i];
      const tx = outer - (2 * outer * i) / N;
      face(bx + (tx - bx) * t, by + (top - by) * t);
    }
  }
  m.grid(first, ROWS, N + 1);
  // The jambs and soffit: from the foot of the right jamb up round the arch and down the left, three rows deep.
  const reveal: [number, number][] = [];
  for (let y = GATE.floor; y < spring - 1e-6; y += ROW_STEP) reveal.push([half, y]);
  for (let i = 0; i <= ARCH; i++) reveal.push(archPoint((i / ARCH) * Math.PI));
  for (let y = spring - ROW_STEP; y > GATE.floor - 1e-6; y -= ROW_STEP) reveal.push([-half, y]);
  const depth = [0, 0.5, 1];
  const rfirst = m.count;
  for (let k = 0; k < depth.length; k++) {
    for (let i = 0; i < reveal.length; i++) {
      const [x, y] = reveal[i];
      const z = zFront + (zBack - zFront) * depth[k] + (k === 0 ? relief(x, y) : (vnoise(x * 2.1, y * 2.1, k * 3.3) - 0.5) * 0.06);
      // Shade the reveal's strata along the passage (its uv runs with depth, not with x).
      m.add(x, y, z, -z, y, true);
    }
  }
  m.grid(rfirst, depth.length, reveal.length);
  return m.build();
}

const DOOR_COLS = 16;
const DOOR_ROWS = 15;

/** One door half (side +1 the right one, -1 the left): its face, recessed a little into the arch, and its edge at the seam. */
function buildDoor(side: 1 | -1): THREE.BufferGeometry {
  const m = new Mesher();
  m.tone = DOOR_TONE;
  const { half, spring, rise, floor, doorFront, doorBack } = GATE;
  const w = half - 0.03;
  const first = m.count;
  for (let j = 0; j < DOOR_ROWS; j++) {
    for (let i = 0; i < DOOR_COLS; i++) {
      const x = side * w * Math.sin((i / (DOOR_COLS - 1)) * Math.PI / 2);
      const topY = spring + rise * Math.sqrt(Math.max(0, 1 - (x / half) * (x / half)));
      const y = floor - 0.05 + ((topY - (floor - 0.05)) * j) / (DOOR_ROWS - 1);
      m.add(x, y, doorFront + relief(x, y) * 0.45, x, y);
    }
  }
  m.grid(first, DOOR_ROWS, DOOR_COLS);
  // The edge at the seam, front to back.
  const efirst = m.count;
  for (let k = 0; k < 2; k++) {
    for (let j = 0; j < DOOR_ROWS; j++) {
      const y = floor - 0.05 + ((spring + rise - (floor - 0.05)) * j) / (DOOR_ROWS - 1);
      m.add(0, y, k === 0 ? doorFront : doorBack, -(k === 0 ? doorFront : doorBack), y, true);
    }
  }
  m.grid(efirst, 2, DOOR_ROWS);
  return m.build();
}

// ---------------------------------------------------------------------------------------------------------------------
// The rock's material: the cave wall's, with the runes, the grooves and the cracks of light worked into its shader

interface SealUniforms {
  [uniform: string]: THREE.IUniform;
  uRuneMap: THREE.IUniform<THREE.Texture | null>;
  uTime: THREE.IUniform<number>;
  uIgnite: THREE.IUniform<number>;
  uBase: THREE.IUniform<number>;
  uRuneGain: THREE.IUniform<number>;
  uCrack: THREE.IUniform<number>;
  uCrackGain: THREE.IUniform<number>;
  uWarm: THREE.IUniform<number>;
  uRuneCyan: THREE.IUniform<THREE.Color>;
  uRuneAmber: THREE.IUniform<THREE.Color>;
}

const ROCK_COMMON = /* glsl */ `
uniform sampler2D uRuneMap;
uniform float uTime;
uniform float uIgnite;
uniform float uBase;
uniform float uRuneGain;
uniform float uCrack;
uniform float uCrackGain;
uniform float uWarm;
uniform vec3 uRuneCyan;
uniform vec3 uRuneAmber;
varying vec2 vRune;
vec2 sealHash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
// Distance (in cells) from a cell border: how near a crack this point is.
float sealEdge(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = sealHash(n + g);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  }
  return sqrt(d2) - sqrt(d1);
}
`;

const ROCK_GLOW = /* glsl */ `
{
  float order = sealRune.g;
  float lit = smoothstep(order - 0.01, order + 0.08, uIgnite);
  float breath = 0.8 + 0.2 * sin(uTime * 1.6 + order * 11.0);
  float flare = 1.0 + 0.22 * sin(uTime * 5.0 + order * 37.0);
  float level = mix(uBase * breath, flare, lit);
  vec3 runeColour = mix(uRuneCyan, uRuneAmber, uWarm);
  vec3 glow = runeColour * smoothstep(0.4, 0.95, sealRune.r) * level * uRuneGain;
  if (uCrack > 0.001) {
    vec2 pm = (vRune - vec2(0.5, 0.469)) * vec2(12.0, 8.1);
    float rr = length(pm);
    float crackFront = uCrack * 10.0;
    float reveal = 1.0 - smoothstep(crackFront - 1.4, crackFront, rr);
    vec2 q = pm * 0.8 + vec2(sin(pm.y * 1.3), cos(pm.x * 1.1)) * 0.4;
    float line = (1.0 - smoothstep(0.0, 0.035, sealEdge(q))) + 0.6 * (1.0 - smoothstep(0.0, 0.03, sealEdge(q * 2.4 + 11.0)));
    glow += mix(vec3(0.35, 0.85, 1.0), vec3(1.0, 0.7, 0.3), uWarm) * line * reveal * uCrackGain * 0.55;
  }
  totalEmissiveRadiance += glow * 1.55;
}
`;

function makeRockMaterial(source: THREE.Material | null, ramp: THREE.Texture | null, runeMap: THREE.Texture, uniforms: SealUniforms): THREE.MeshToonMaterial {
  const src = source as THREE.MeshToonMaterial | null;
  const mat = src && src.isMeshToonMaterial
    ? src.clone()
    : new THREE.MeshToonMaterial({ gradientMap: ramp, color: 0x6a5c4e });
  mat.name = 'SealRock';
  mat.vertexColors = true;
  mat.side = THREE.DoubleSide;
  mat.emissive.set(0x000000);
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aRune;\nvarying vec2 vRune;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRune = aRune;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + ROCK_COMMON)
      .replace('#include <map_fragment>', '#include <map_fragment>\nvec3 sealRune = texture2D(uRuneMap, vRune).rgb;\nfloat sealLip = texture2D(uRuneMap, vRune + vec2(0.0016, -0.0023)).r - sealRune.r;\ndiffuseColor.rgb *= (1.0 - 0.7 * sealRune.b) * (1.0 - 0.55 * clamp(sealLip, 0.0, 1.0) + 0.32 * clamp(-sealLip, 0.0, 1.0));')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + ROCK_GLOW);
    mat.userData.shader = shader;
  };
  mat.customProgramCacheKey = () => 'yudhveer-shrine-seal';
  uniforms.uRuneMap.value = runeMap;
  return mat;
}

// ---------------------------------------------------------------------------------------------------------------------
// The light: a glow in the gap, shafts, a spill on the floor (all additive, premultiplied like the game's flames)

const additive = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor } as const;

const LIGHT_COMMON = /* glsl */ `
uniform float uTime;
uniform float uWarm;
uniform float uIntensity;
uniform vec3 uCyan;
uniform vec3 uAmber;
`;

/** A glow filling the arch behind the doors: the first light through the seam. */
function makeGapGlow(uniforms: Record<string, THREE.IUniform>): THREE.Mesh {
  const { half, floor, spring, rise } = GATE;
  const shape = new THREE.Shape();
  const w = half - 0.05;
  shape.moveTo(w, floor);
  shape.lineTo(w, spring);
  for (let i = 1; i <= 32; i++) {
    const phi = (i / 32) * Math.PI;
    shape.lineTo(w * Math.cos(phi), spring + (rise - 0.05) * Math.sin(phi));
  }
  shape.lineTo(-w, floor);
  shape.closePath();
  const mat = new THREE.ShaderMaterial({
    name: 'SealGapGlow',
    uniforms: { ...uniforms, uGap: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vPos; varying float vNear;
void main() {
  vPos = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNear = smoothstep(0.8, 3.2, length(mv.xyz));
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: /* glsl */ `${LIGHT_COMMON}
uniform float uGap;
varying vec3 vPos; varying float vNear;
void main() {
  // Brightest at the seam, falling away across the opening: the light pours out of the gap, it does not fill the arch.
  float across = pow(1.0 - smoothstep(0.0, 1.2 + uGap * 0.3, abs(vPos.x)), 1.5);
  float up = 0.5 + 0.5 * smoothstep(-2.5, 3.6, vPos.y);
  float shimmer = 0.78 + 0.22 * sin(uTime * 7.0 + vPos.y * 3.0 + vPos.x * 2.0) * sin(vPos.x * 21.0 - uTime * 3.0);
  vec3 c = mix(uCyan, uAmber, uWarm);
  gl_FragColor = vec4(c * across * up * shimmer * uIntensity * vNear, 1.0);
}`,
    ...additive,
  });
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), mat);
  mesh.position.z = GATE.zBack + 0.28;
  mesh.name = 'SealGapGlow';
  mesh.renderOrder = 4;
  mesh.visible = false;
  return mesh;
}

/** Shafts of light out of the opened gate: camera-facing beams from the gap down to the floor in front of it. */
function makeShafts(uniforms: Record<string, THREE.IUniform>): THREE.Mesh {
  const rand = rng(77);
  const BEAMS = 9;
  const aA: number[] = [], aB: number[] = [], aUV: number[] = [], aW: number[] = [], aSeed: number[] = [], idx: number[] = [];
  for (let b = 0; b < BEAMS; b++) {
    const t = b / (BEAMS - 1);
    const x = (t - 0.5) * 6.4 + (rand() - 0.5) * 0.4;
    const a = [x, 0.4 + rand() * 2.2, GATE.zBack + 0.5];
    const e = [x * (1.5 + rand() * 0.6), -2.4, -71.9 + 6.5 + rand() * 4.5];
    const w0 = 0.35 + rand() * 0.4, w1 = 1.0 + rand() * 1.0;
    const seed = rand();
    for (const [along, side] of [[0, -1], [0, 1], [1, -1], [1, 1]]) {
      aA.push(...a); aB.push(...e); aUV.push(along, side); aW.push(w0, w1); aSeed.push(seed);
    }
    const o = b * 4;
    idx.push(o, o + 1, o + 2, o + 2, o + 1, o + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(aA, 3));
  g.setAttribute('aA', new THREE.Float32BufferAttribute(aA, 3));
  g.setAttribute('aB', new THREE.Float32BufferAttribute(aB, 3));
  g.setAttribute('aUV', new THREE.Float32BufferAttribute(aUV, 2));
  g.setAttribute('aW', new THREE.Float32BufferAttribute(aW, 2));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(aSeed, 1));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -68), 12);
  const mat = new THREE.ShaderMaterial({
    name: 'SealShafts',
    uniforms,
    vertexShader: /* glsl */ `attribute vec3 aA; attribute vec3 aB; attribute vec2 aUV; attribute vec2 aW; attribute float aSeed;
varying vec2 vUv; varying float vSeed; varying float vNear;
void main() {
  vec3 p = mix(aA, aB, aUV.x);
  vec3 axis = normalize(aB - aA);
  vec3 toCam = normalize(cameraPosition - p);
  vec3 side = cross(axis, toCam);
  side = length(side) < 1e-3 ? vec3(1.0, 0.0, 0.0) : normalize(side);
  p += side * aUV.y * mix(aW.x, aW.y, aUV.x) * 0.5;
  vUv = aUV; vSeed = aSeed;
  vNear = smoothstep(0.9, 3.5, distance(cameraPosition, p));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`,
    fragmentShader: /* glsl */ `${LIGHT_COMMON}
varying vec2 vUv; varying float vSeed; varying float vNear;
void main() {
  float across = 1.0 - abs(vUv.y);
  float profile = pow(max(across, 0.0), 1.7);
  float along = 1.0 - smoothstep(0.0, 1.0, vUv.x);
  float root = smoothstep(0.0, 0.05, vUv.x);
  float streak = 0.7 + 0.3 * sin(vUv.y * 9.0 + vSeed * 40.0 + uTime * 0.7);
  vec3 c = mix(uCyan, uAmber, uWarm);
  gl_FragColor = vec4(c * profile * along * root * streak * uIntensity * 0.3 * vNear, 1.0);
}`,
    side: THREE.DoubleSide,
    ...additive,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'SealShafts';
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.visible = false;
  return mesh;
}

/** The lit room's light spilled across the floor in front of the gate. */
function makeSpill(uniforms: Record<string, THREE.IUniform>): THREE.Mesh {
  const y = -2.4;
  const z0 = GATE.zFront + 0.1, z1 = -62.0;
  const pos = [-4.0, y, z0, 4.0, y, z0, -7.2, y, z1, 7.2, y, z1];
  const uv = [0, 0, 1, 0, 0, 1, 1, 1];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([0, 1, 2, 2, 1, 3]);
  const mat = new THREE.ShaderMaterial({
    name: 'SealSpill',
    uniforms,
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `${LIGHT_COMMON}
varying vec2 vUv;
void main() {
  float lateral = 1.0 - smoothstep(0.55, 1.0, abs(vUv.x * 2.0 - 1.0));
  float along = pow(1.0 - vUv.y, 1.5) * smoothstep(0.0, 0.04, vUv.y);
  float rays = 0.65 + 0.35 * sin((vUv.x - 0.5) * 38.0 * (1.0 + vUv.y * 0.6) + uTime * 0.4);
  vec3 c = mix(uCyan, uAmber, uWarm);
  gl_FragColor = vec4(c * lateral * along * rays * uIntensity * 0.4, 1.0);
}`,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    ...additive,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'SealSpill';
  mesh.renderOrder = 3;
  mesh.frustumCulled = false;
  mesh.visible = false;
  return mesh;
}

// ---------------------------------------------------------------------------------------------------------------------
// Point clouds that animate on the GPU from the time since the cue: dust, sparks (ballistic) and motes (flowing to a mark)

type CloudKind = 'dust' | 'sparks' | 'motes';

const CLOUD_VERTEX = /* glsl */ `
uniform float uSealTime;
uniform float uHeight;
uniform vec3 uGravity;
attribute vec3 aVel;
attribute vec4 aInfo;   // x: when it starts, y: its life, z: its size (m), w: a seed
varying float vAlpha;
varying float vSeed;
varying float vK;
void main() {
  float t = uSealTime - aInfo.x;
  float k = t / aInfo.y;
  vSeed = aInfo.w;
  vK = k;
  if (t < 0.0 || k > 1.0) {
    vAlpha = 0.0;
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  #ifdef FLOW
  // To its mark along a lifted curve, swirling a little on the way (aVel is the whole way there).
  float e = k * k * (3.0 - 2.0 * k);
  vec3 p = position + aVel * e;
  p.y += sin(e * 3.14159) * (0.5 + aInfo.w * 0.8);
  p.xz += vec2(sin(t * 3.1 + aInfo.w * 25.0), cos(t * 2.7 + aInfo.w * 17.0)) * 0.22 * sin(e * 3.14159);
  #else
  vec3 p = position + aVel * t + 0.5 * uGravity * t * t;
  #endif
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  #ifdef FLOW
  vAlpha = smoothstep(0.0, 0.14, k) * (1.0 - smoothstep(0.62, 1.0, k));
  #else
  vAlpha = smoothstep(0.0, 0.1, k) * (1.0 - smoothstep(0.5, 1.0, k));
  #endif
  gl_PointSize = min(aInfo.z * projectionMatrix[1][1] * 0.5 * uHeight / max(0.1, -mv.z), 64.0);
}`;

const DUST_FRAGMENT = /* glsl */ `
uniform vec3 uTint;
varying float vAlpha;
varying float vSeed;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0 || vAlpha <= 0.0) discard;
  float a = 1.0 - smoothstep(0.2, 1.0, d);
  gl_FragColor = vec4(uTint * (0.75 + 0.25 * vSeed), a * a * vAlpha * 0.5);
  #include <colorspace_fragment>
}`;

const GLOW_FRAGMENT = /* glsl */ `
uniform float uWarm;
uniform vec3 uCyan;
uniform vec3 uAmber;
uniform float uBright;
varying float vAlpha;
varying float vSeed;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0 || vAlpha <= 0.0) discard;
  float body = exp(-d * d * 3.0);
  float core = 1.0 - smoothstep(0.0, 0.35, d);
  vec3 c = mix(mix(uCyan, vec3(1.0), 0.25), mix(uAmber, vec3(1.0, 0.95, 0.75), 0.2), clamp(uWarm + (vSeed - 0.5) * 0.5, 0.0, 1.0));
  gl_FragColor = vec4(c * (body * 0.55 + core * 0.9) * vAlpha * uBright, 1.0);
}`;

interface CloudSpec { count: number; kind: CloudKind }

function makeCloud(spec: CloudSpec, shared: Record<string, THREE.IUniform>, fill: (i: number, r: () => number, out: { p: THREE.Vector3; v: THREE.Vector3; info: THREE.Vector4 }) => void, seed: number): THREE.Points {
  const rand = rng(seed);
  const pos = new Float32Array(spec.count * 3), vel = new Float32Array(spec.count * 3), info = new Float32Array(spec.count * 4);
  const out = { p: new THREE.Vector3(), v: new THREE.Vector3(), info: new THREE.Vector4() };
  for (let i = 0; i < spec.count; i++) {
    fill(i, rand, out);
    out.p.toArray(pos, i * 3);
    out.v.toArray(vel, i * 3);
    out.info.toArray(info, i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
  g.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -68), 14);
  const dust = spec.kind === 'dust';
  const uniforms: Record<string, THREE.IUniform> = {
    ...shared,
    uHeight: { value: 900 },
    uGravity: { value: new THREE.Vector3(0, spec.kind === 'sparks' ? -6 : -0.35, 0) },
    uBright: { value: spec.kind === 'sparks' ? 1.5 : 1.0 },
  };
  const mat = new THREE.ShaderMaterial({
    name: 'Seal' + spec.kind,
    uniforms,
    vertexShader: CLOUD_VERTEX,
    fragmentShader: dust ? DUST_FRAGMENT : GLOW_FRAGMENT,
    defines: spec.kind === 'motes' ? { FLOW: '' } : {},
    ...(dust ? { transparent: true, depthWrite: false } : additive),
  });
  const points = new THREE.Points(g, mat);
  points.name = 'Seal' + spec.kind;
  points.frustumCulled = false;
  points.renderOrder = dust ? 3 : 5;
  points.visible = false;
  const drawing = new THREE.Vector2();
  points.onBeforeRender = (renderer) => { uniforms.uHeight.value = renderer.getDrawingBufferSize(drawing).y; };
  return points;
}

// ---------------------------------------------------------------------------------------------------------------------
// Debris: rock chunks thrown off the seam and the arch, falling, bouncing and lying where they land

interface Chunk {
  p: THREE.Vector3; v: THREE.Vector3; q: THREE.Quaternion; w: THREE.Vector3;
  size: THREE.Vector3; born: number; rest: boolean; bounces: number;
  /** The throw as it was made (position, velocity, turn, spin), for `rearm` to put back: a replay throws the same rocks. */
  start: { p: THREE.Vector3; v: THREE.Vector3; q: THREE.Quaternion; w: THREE.Vector3 };
}

function chunkGeometry(): THREE.BufferGeometry {
  const g = new THREE.DodecahedronGeometry(1, 0);
  const rand = rng(5);
  const pos = g.attributes.position;
  // One displacement per distinct corner so the faces stay closed.
  const seen = new Map<string, THREE.Vector3>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    let d = seen.get(key);
    if (!d) { d = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.55); seen.set(key, d); }
    pos.setXYZ(i, pos.getX(i) + d.x, pos.getY(i) + d.y, pos.getZ(i) + d.z);
  }
  const uv = new Float32Array(pos.count * 2), col = new Float32Array(pos.count * 3), rune = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) * 0.5 + pos.getZ(i) * 0.3;
    uv[i * 2 + 1] = pos.getY(i) * 0.5 + pos.getZ(i) * 0.2;
    col.fill(0.5 + 0.25 * rand(), i * 3, i * 3 + 3);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aRune', new THREE.BufferAttribute(rune, 2));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------

type Phase = 'closed' | 'opening' | 'open';

/** The seal: its meshes, its sequence and its light. Add `group` to the level; call `update` every frame. */
export class ShrineSeal {
  public readonly group = new THREE.Group();
  /** Every glowing part (for the selective bloom): the level adds them to its `bloomObjects`. */
  public readonly glowing: THREE.Object3D[] = [];
  /** The point light at the gate: a cold glow while closed, the flood's light later. The level adds and positions it. */
  public readonly light = new THREE.PointLight(0x7fd8ff, 0, 10, 1.5);
  public phase: Phase = 'closed';
  /** Seconds since `open()` (0 while closed). */
  public t = 0;

  private readonly uniforms: SealUniforms;
  private readonly lightUniforms: Record<string, THREE.IUniform>;
  private readonly cloudUniforms: Record<string, THREE.IUniform>;
  private rock: THREE.MeshToonMaterial;
  private readonly runeMap: THREE.DataTexture;
  private readonly runes: RunePaint;
  private frame: THREE.Mesh;
  private readonly doors: THREE.Mesh[] = [];
  private gap: THREE.Mesh;
  private shafts: THREE.Mesh;
  private spill: THREE.Mesh;
  private readonly clouds: THREE.Points[] = [];
  private debris: THREE.InstancedMesh;
  private readonly chunks: Chunk[] = [];
  private chunkTime = 0;
  private fired = 0;
  private lastTremor = 0;
  private clock = 0;
  private disposed = false;
  private readonly events: { at: number; run: () => void }[];
  /** How far up the altar room's own lamps are (dark while shut, full once the light has flooded), for the level to scale them. */
  public roomGain = 0;
  private readonly tmpM = new THREE.Matrix4();
  private readonly tmpS = new THREE.Vector3();
  private readonly tmpQ = new THREE.Quaternion();

  constructor(private readonly hooks: SealHooks = {}, ramp: THREE.Texture | null = null, soulMark = new THREE.Vector3(2.6, -2.45, -71.2), insideMark = new THREE.Vector3(1.7, -2.11, -74.6)) {
    this.group.name = 'SealedMaceRoom';
    this.runes = new RunePaint();
    this.runeMap = this.runes.texture;
    this.uniforms = {
      uRuneMap: { value: this.runeMap },
      uTime: { value: 0 },
      uIgnite: { value: 0 },
      uBase: { value: 0.085 },
      uRuneGain: { value: 1 },
      uCrack: { value: 0 },
      uCrackGain: { value: 1 },
      uWarm: { value: 0 },
      uRuneCyan: { value: new THREE.Color(0.1, 0.6, 1.0) },
      uRuneAmber: { value: new THREE.Color(1.0, 0.62, 0.22) },
    };
    this.rock = makeRockMaterial(null, ramp, this.runeMap, this.uniforms);
    this.frame = new THREE.Mesh(buildFrame(), this.rock);
    this.frame.name = 'Seal_Frame';
    for (const side of [1, -1] as const) {
      const door = new THREE.Mesh(buildDoor(side), this.rock);
      door.name = side > 0 ? 'Seal_DoorR' : 'Seal_DoorL';
      this.doors.push(door);
    }
    for (const mesh of [this.frame, ...this.doors]) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.group.add(mesh);
      this.glowing.push(mesh);
    }

    this.lightUniforms = {
      uTime: this.uniforms.uTime,
      uWarm: this.uniforms.uWarm,
      uIntensity: { value: 0 },
      uCyan: { value: new THREE.Color(0.2, 0.75, 1.0) },
      uAmber: { value: new THREE.Color(1.0, 0.6, 0.2) },
    };
    this.gap = makeGapGlow(this.lightUniforms);
    this.shafts = makeShafts({ ...this.lightUniforms, uIntensity: { value: 0 } });
    this.spill = makeSpill({ ...this.lightUniforms, uIntensity: { value: 0 } });
    this.group.add(this.gap, this.shafts, this.spill);
    this.glowing.push(this.gap, this.shafts, this.spill);

    this.cloudUniforms = {
      uSealTime: { value: -10 },
      uWarm: this.uniforms.uWarm,
      uCyan: this.lightUniforms.uCyan,
      uAmber: this.lightUniforms.uAmber,
      uTint: { value: new THREE.Color(0.5, 0.46, 0.42) },
    };
    const { zFront } = GATE;
    // Dust shaken from the roof over the gate and the seam, all the way through the opening.
    const dust = makeCloud({ count: 150, kind: 'dust' }, this.cloudUniforms, (i, r, o) => {
      const burst = i >= 100;
      o.p.set((r() - 0.5) * (burst ? 1.2 : 9), burst ? -2.3 + r() * 0.5 : 3.6 + r() * 1.6, zFront + 0.15 + r() * 1.1);
      o.v.set((r() - 0.5) * (burst ? 2.2 : 0.2), burst ? 0.4 + r() * 1.1 : -0.1 - r() * 0.4, burst ? 0.3 + r() * 1.0 : 0.05 + r() * 0.15);
      o.info.set(burst ? SEAL_TIMES.split + r() * 0.5 : 0.4 + r() * 2.9, burst ? 1.8 + r() * 1.4 : 1.8 + r() * 1.8, burst ? 0.5 + r() * 0.6 : 0.2 + r() * 0.35, r());
    }, 11);
    // Sparks where the doors grind the sill.
    const sparks = makeCloud({ count: 60, kind: 'sparks' }, this.cloudUniforms, (i, r, o) => {
      const side = i % 2 ? 1 : -1;
      o.p.set(side * (0.1 + r() * 0.5), GATE.floor + 0.08, GATE.doorFront + 0.1);
      o.v.set(side * (0.8 + r() * 2.2), 1.2 + r() * 2.2, 0.4 + r() * 1.4);
      o.info.set(SEAL_TIMES.split + r() * 1.0, 0.5 + r() * 0.7, 0.05 + r() * 0.06, r());
    }, 13);
    // Motes out of the gap, streaming to where the soul stands and gathering round her; the later ones follow her in to the altar.
    const MOTES = 120, FIRST = 76;
    const motes = makeCloud({ count: MOTES, kind: 'motes' }, this.cloudUniforms, (i, r, o) => {
      const to = i < FIRST ? soulMark : insideMark;
      o.p.set((r() - 0.5) * 0.9, GATE.floor + 0.3 + r() * 4.3, GATE.doorBack - 0.1);
      o.v.set(to.x + (r() - 0.5) * 1.1 - o.p.x, to.y + 0.2 + r() * 1.5 - o.p.y, to.z + (r() - 0.5) * 1.1 - o.p.z);
      const start = i < FIRST ? 1.7 + (i / FIRST) * 2.0 : 3.6 + ((i - FIRST) / (MOTES - FIRST)) * 2.0;
      o.info.set(start + r() * 0.3, 1.6 + r() * 1.3, 0.05 + r() * 0.1, r());
    }, 17);
    this.clouds.push(dust, sparks, motes);
    for (const c of this.clouds) { this.group.add(c); }
    this.glowing.push(sparks, motes);
    // All of the light and the clouds are hidden while the seal is shut: the loading screen's warm-up frame draws each once
    // (Engine.warmUp), so none of their programs is built as the doors open.
    for (const o of [this.gap, this.shafts, this.spill, ...this.clouds]) o.userData.warm = true;

    // Debris: a pool of chunks, each with its own hand-off time; positions are CPU (they bounce on the floor).
    const CHUNKS = 30;
    this.debris = new THREE.InstancedMesh(chunkGeometry(), this.rock, CHUNKS);
    this.debris.name = 'SealDebris';
    this.debris.frustumCulled = false;
    this.debris.castShadow = false;
    this.debris.count = 0;
    this.group.add(this.debris);
    const rand = rng(23);
    for (let i = 0; i < CHUNKS; i++) {
      const fromSeam = i < 16;
      const side = i % 2 ? 1 : -1;
      const size = (fromSeam ? 0.1 + rand() * 0.28 : 0.14 + rand() * 0.34) * 0.62;
      const p = new THREE.Vector3(fromSeam ? side * (0.1 + rand() * 0.5) : (rand() - 0.5) * 7.4, fromSeam ? GATE.floor + rand() * 5.6 : 3.2 + rand() * 1.4, GATE.doorFront + 0.05);
      const v = new THREE.Vector3(fromSeam ? side * (0.5 + rand() * 1.6) : (rand() - 0.5) * 0.8, fromSeam ? rand() * 1.4 : -rand() * 0.5, 0.15 + rand() * 0.55);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6, rand() * 6, rand() * 6));
      const w = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(9);
      this.chunks.push({
        p, v, q, w,
        size: new THREE.Vector3(size * (0.8 + rand() * 0.5), size * (0.7 + rand() * 0.5), size * (0.8 + rand() * 0.5)),
        born: fromSeam ? SEAL_TIMES.split + rand() * 0.55 : SEAL_TIMES.split + 0.15 + rand() * 1.5,
        rest: false,
        bounces: 0,
        start: { p: p.clone(), v: v.clone(), q: q.clone(), w: w.clone() },
      });
    }

    const jolt = (a: number) => this.hooks.jolt?.(a);
    const sound = (cue: Parameters<NonNullable<SealHooks['sound']>>[0], n = 0) => this.hooks.sound?.(cue, n);
    this.events = [
      { at: 0.0, run: () => sound('chime', 0) },
      { at: 0.3, run: () => sound('chime', 1) },
      { at: 0.55, run: () => sound('chime', 2) },
      { at: 0.78, run: () => sound('chime', 3) },
      { at: 0.98, run: () => sound('chime', 4) },
      { at: 0.4, run: () => sound('rumble', 0) },
      { at: SEAL_TIMES.split - 0.02, run: () => { jolt(0.13); sound('split', 0); this.hooks.dust?.(new THREE.Vector3(0, GATE.floor + 0.1, GATE.zFront + 0.3), 18); } },
      { at: SEAL_TIMES.split + 0.15, run: () => sound('grind', 0) },
      { at: SEAL_TIMES.split + 0.5, run: () => sound('grind', 1) },
      { at: SEAL_TIMES.split + 0.85, run: () => sound('grind', 2) },
      { at: SEAL_TIMES.split + 1.2, run: () => sound('grind', 3) },
      { at: SEAL_TIMES.flood, run: () => { jolt(0.035); sound('bloom', 0); } },
    ].sort((a, b) => a.at - b.at);
    this.rearm();
  }

  /** The cave wall's own material (and the colour of the rock beside the gate) for the seal's stone. */
  public setRock(source: THREE.Material | null, tint?: THREE.Color): void {
    if (!source) return;
    const next = makeRockMaterial(source, null, this.runeMap, this.uniforms);
    if (tint) next.color.copy(tint);
    for (const mesh of [this.frame, ...this.doors, this.debris]) mesh.material = next;
    this.rock.dispose();
    this.rock = next;
  }

  /** Starts the sequence (once: a second call while it runs or after it has run does nothing). */
  public open(): void {
    if (this.phase !== 'closed') return;
    this.phase = 'opening';
    this.t = 0;
    this.fired = 0;
    this.lastTremor = 0;
    this.chunkTime = 0;
    this.show(true);
    this.update(0, this.clock);
  }

  /** Back to shut, at once (a retry, a replay): doors home, runes dim, nothing left over from the sequence. */
  public rearm(): void {
    this.phase = 'closed';
    this.t = 0;
    this.fired = 0;
    this.roomGain = 0;
    this.doors.forEach((d, i) => { d.position.set(0, 0, 0); d.visible = true; d.userData.side = i ? -1 : 1; });
    this.frame.visible = true;
    this.show(false);
    // The rocks are back where the seam and the arch throw them from (they lay on the floor, spent, after the first opening).
    this.chunks.forEach((c) => {
      c.rest = false; c.bounces = 0;
      c.p.copy(c.start.p); c.v.copy(c.start.v); c.q.copy(c.start.q); c.w.copy(c.start.w);
    });
    this.chunkTime = 0;
    this.debris.count = 0;
    this.applyClosed();
  }

  /** The gate is a closed wall, runes dim: the idle look (and what `rearm` leaves). */
  private applyClosed(): void {
    const u = this.uniforms;
    u.uIgnite.value = 0; u.uBase.value = 0.085; u.uRuneGain.value = 1; u.uCrack.value = 0; u.uCrackGain.value = 1; u.uWarm.value = 0;
    this.cloudUniforms.uSealTime.value = -10;
    this.lightUniforms.uIntensity.value = 0;
    this.light.color.setRGB(0.45, 0.85, 1.0);
    this.light.intensity = 1.6;
  }

  /** The effects' meshes are drawn only while the sequence runs (and its afterglow). */
  private show(on: boolean): void {
    this.gap.visible = on;
    this.shafts.visible = on;
    this.spill.visible = on;
    for (const c of this.clouds) c.visible = on;
  }

  public get isOpen(): boolean { return this.phase !== 'closed'; }

  public update(dt: number, time: number): void {
    this.clock = time;
    const u = this.uniforms;
    u.uTime.value = time;
    this.lightUniforms.uTime.value = time;
    if (this.phase === 'closed') {
      // The ward breathes (the light with the runes).
      this.light.intensity = 1.6 + 0.35 * Math.sin(time * 1.6);
      return;
    }
    if (this.phase === 'open') return;
    this.t += dt;
    const t = this.t;
    while (this.fired < this.events.length && this.events[this.fired].at <= t) this.events[this.fired++].run();
    // The tremor: a low shaking through the build-up, harder as the doors go.
    if (t >= 0.4 && t < SEAL_TIMES.slideEnd && t - this.lastTremor >= 0.14) {
      this.lastTremor = t;
      this.hooks.jolt?.(t < SEAL_TIMES.split ? 0.02 + 0.045 * smooth(0.4, SEAL_TIMES.split, t) : 0.04);
    }

    // The runes ignite in order, then burn amber with the flood and settle low.
    u.uIgnite.value = Math.min(1.3, t / 1.15);
    u.uWarm.value = smooth(1.9, 3.5, t);
    u.uRuneGain.value = 1 - 0.55 * smooth(3.4, 6.0, t);
    u.uCrack.value = smooth(0.9, 1.9, t);
    u.uCrackGain.value = 1 - 0.8 * smooth(2.6, 4.2, t);
    this.cloudUniforms.uSealTime.value = t;

    // The doors: the seam first shudders, then they go, accelerating and braking (stone has weight).
    const slide = smooth(SEAL_TIMES.split, SEAL_TIMES.slideEnd, t);
    const eased = slide * slide * (3 - 2 * slide);
    const shudder = t > SEAL_TIMES.split - 0.12 && t < SEAL_TIMES.split ? Math.sin(t * 90) * 0.012 : 0;
    this.doors.forEach((d) => {
      const side = d.userData.side as number;
      d.position.x = side * (GATE.slide * eased + shudder);
      d.position.z = t > SEAL_TIMES.split && slide < 1 ? Math.sin(t * 47 + side) * 0.006 : 0;
      d.visible = eased < 0.999;
    });

    // Light: the cold ward swells, the cracks flare, the flood (cyan turning amber) and its slow decay to a warm hold.
    const swell = smooth(0, SEAL_TIMES.split, t);
    const flood = smooth(SEAL_TIMES.split + 0.2, SEAL_TIMES.flood + 0.8, t);
    const cool = new THREE.Color(0.35, 0.82, 1.0), warm = new THREE.Color(1.0, 0.62, 0.26);
    this.light.color.copy(cool).lerp(warm, u.uWarm.value);
    const peak = 3 + 5 * swell + 9 * flood * (1 - 0.7 * smooth(SEAL_TIMES.flood + 0.8, 6, t));
    this.light.intensity = Math.max(2.2, peak) * (0.95 + 0.05 * Math.sin(time * 13));
    this.roomGain = smooth(1.6, 3.2, t);

    const gapShow = smooth(SEAL_TIMES.split - 0.05, SEAL_TIMES.split + 0.5, t) * (1 - smooth(2.1, 3.1, t));
    this.gap.visible = gapShow > 0.002;
    (this.gap.material as THREE.ShaderMaterial).uniforms.uIntensity.value = 2.0 * gapShow;
    (this.gap.material as THREE.ShaderMaterial).uniforms.uGap.value = GATE.slide * eased;
    const shaft = smooth(2.0, 3.2, t) * (1 - 0.9 * smooth(3.6, 6.4, t));
    (this.shafts.material as THREE.ShaderMaterial).uniforms.uIntensity.value = 1.5 * shaft;
    (this.spill.material as THREE.ShaderMaterial).uniforms.uIntensity.value = 0.8 * shaft;
    this.shafts.visible = shaft > 0.002;
    this.spill.visible = shaft > 0.002;
    const tint = this.cloudUniforms.uTint.value as THREE.Color;
    tint.setRGB(0.34, 0.36, 0.38).lerp(this.scratchWarm.setRGB(0.8, 0.62, 0.42), smooth(1.8, 3.4, t));

    this.stepDebris(dt, t);
    if (t >= SEAL_TIMES.end) this.finish();
  }

  private readonly scratchWarm = new THREE.Color();

  /** Chunks thrown off the gate fall, bounce on the floor and lie there (the transforms of the ones in flight are rewritten). */
  private stepDebris(dt: number, t: number): void {
    const FLOOR = GATE.floor;
    let live = 0;
    const step = Math.min(dt, 1 / 30);
    for (let i = 0; i < this.chunks.length; i++) {
      const c = this.chunks[i];
      if (t < c.born) continue;
      live = i + 1;
      if (!c.rest) {
        c.v.y -= 9.8 * step;
        c.p.addScaledVector(c.v, step);
        c.q.premultiply(this.tmpQ.setFromAxisAngle(this.tmpS.copy(c.w).normalize(), c.w.length() * step));
        const half = Math.min(c.size.x, c.size.y, c.size.z) * 0.8;
        if (c.p.y < FLOOR + half) {
          c.p.y = FLOOR + half;
          if (c.bounces >= 2 || Math.abs(c.v.y) < 1.1) {
            c.rest = true;
            c.w.set(0, 0, 0);
            c.v.set(0, 0, 0);
          } else {
            c.bounces++;
            c.v.y = -c.v.y * 0.32;
            c.v.x *= 0.6; c.v.z *= 0.6;
            c.w.multiplyScalar(0.55);
          }
        }
      }
      this.tmpM.compose(c.p, c.q, c.size);
      this.debris.setMatrixAt(i, this.tmpM);
    }
    this.debris.count = live;
    this.debris.instanceMatrix.needsUpdate = true;
  }

  /** The sequence is over: the doors gone into the rock, the effects hidden, only the gate wall and the fallen chunks remain. */
  private finish(): void {
    this.phase = 'open';
    this.t = SEAL_TIMES.end;
    this.doors.forEach((d) => { d.visible = false; });
    this.show(false);
    this.roomGain = 1;
    this.light.color.setRGB(1.0, 0.62, 0.26);
    this.light.intensity = 2.4;
    this.uniforms.uBase.value = 0.4;
    this.uniforms.uWarm.value = 1;
    this.uniforms.uRuneGain.value = 0.45;
    this.uniforms.uCrack.value = 0;
    this.uniforms.uIgnite.value = 0;
    // Anything still in the air has come to rest where it fell.
    for (let i = 0; i < this.chunks.length; i++) {
      const c = this.chunks[i];
      if (!c.rest) {
        c.rest = true;
        c.p.y = GATE.floor + Math.min(c.size.x, c.size.y, c.size.z) * 0.8;
      }
      this.tmpM.compose(c.p, c.q, c.size);
      this.debris.setMatrixAt(i, this.tmpM);
    }
    this.debris.count = this.chunks.length;
    this.debris.instanceMatrix.needsUpdate = true;
  }

  /** Whether the sequence (and its afterglow) is still running. */
  public get running(): boolean { return this.phase === 'opening'; }

  /** Seconds of the sequence left (0 once it is over, or while shut). */
  public get remaining(): number { return this.phase === 'opening' ? Math.max(0, SEAL_TIMES.end - this.t) : 0; }

  public dispose(): void {
    this.disposed = true;
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose?.();
    });
    this.debris.dispose();
    this.runes.dispose();
  }
}

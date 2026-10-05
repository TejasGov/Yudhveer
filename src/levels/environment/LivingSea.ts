import * as THREE from 'three';
import { RAIN_SLOPE, rainClock } from './WetGround';

/*
 * A living sea for Dwarka (docs/STORY.md, "Dwarka's tide"): the whole sea rises and falls on a slow tide, long
 * Gerstner swells heave through it, foam hugs every islet and laps in and out with both, and the shore rock just above
 * the water is dark and glossy where the sea has just been. Cheap by design: one draw for the sea (a camera-centred
 * grid whose cells grow with distance), no depth-buffer foam, no reflections beyond the sky's, no FFT. The shoreline
 * the foam follows is baked once at load from the level's own rock (`bakeShore`), and the same swells run on the CPU
 * (`seaHeight`) for anything that floats.
 */

/** One swell: travelling along `dir` (x, z), `length` metres crest to crest, `height` metres up and down. */
interface Swell {
  dir: [number, number];
  length: number;
  height: number;
  /** Q*k*A, 0..1: how far the crests lean and sharpen (the four together stay under 1, so they never loop). */
  steepness: number;
  /** Phase offset (radians), so the crests do not all line up at the origin. */
  phase: number;
}

/**
 * Long, slow swells rolling in from the open sea to the south (+z) onto the islands: a sea heave, not a chop (the rain
 * and the scrolling normal maps give the fine detail).
 */
const SWELLS: Swell[] = [
  { dir: [-0.25, -1], length: 44, height: 0.3, steepness: 0.24, phase: 0 },
  { dir: [0.45, -1], length: 27, height: 0.17, steepness: 0.2, phase: 1.7 },
  { dir: [-0.7, -1], length: 16.5, height: 0.085, steepness: 0.18, phase: 4.1 },
  { dir: [0.12, -1], length: 10.5, height: 0.04, steepness: 0.14, phase: 2.6 },
];
/** Deep-water speeds (w = sqrt(g k)) slowed a little: the storm's swell rolls rather than runs. */
const SWELL_PACE = 0.82;

/**
 * The tide: metres either side of its mean, the mean against the authored sea level, and seconds for a whole rise and
 * fall. At its height the lowest shelves round the islets are just awash; at its ebb their footings show.
 */
const TIDE_RANGE = 0.34;
const TIDE_MEAN = -0.06;
const TIDE_PERIOD = 96;
/**
 * The wet band on the shore rock: how far above the still water the swells wet it (metres), and how fast it dries
 * back down once the tide has left it (metres a second; the tide ebbs at up to ~0.022 m/s, so by low water the band
 * is half a metre or so, and the flood closes it again).
 */
const SWASH = 0.22;
const DRYING = 0.006;

/** The sea is the square inside the horizon disc's hole (the export's 700 m plane): the horizon stays flat. */
const SEA_HALF = 350;
/** Far enough from the grid's centre to cover that square from any camera inside it. */
const GRID_REACH = 720;

export type SeaQuality = 'full' | 'low' | 'flat';

/** Cells either side of the centre and the spacing at the centre (m); the spacing grows geometrically outward. */
const GRIDS: Record<SeaQuality, { cells: number; spacing: number }> = {
  full: { cells: 80, spacing: 0.5 }, // 161 x 161 vertices, 51k triangles
  low: { cells: 40, spacing: 1.1 }, // 13k triangles
  flat: { cells: 16, spacing: 4 }, // swells off: the tide and the foam's rim only
};

/** The baked shoreline: where the land meets the sea at four sea levels, as a signed distance (m). */
const SHORE_LEVELS = { first: -0.85, step: (0.85 * 2) / 3 };
const SHORE_DISTANCE = { min: -6, range: 38 };
/** The baked area: every islet, reef and the fort's island (x -170..170, z -245..95), at 512 x 512 (0.66 m). */
const SHORE_RECT = { minX: -170, minZ: -245, size: 340 };
const SHORE_TEXELS = 512;
/** The foam's noise: a tiling square of random values this many texels on a side. */
const NOISE_TEXELS = 64;

// ---------------------------------------------------------------------------------------------------------------
// The sea's state, shared by the shaders (as uniforms) and the CPU (`seaHeight`).
// ---------------------------------------------------------------------------------------------------------------

const waveA = SWELLS.map((s) => {
  const len = Math.hypot(s.dir[0], s.dir[1]);
  const k = (Math.PI * 2) / s.length;
  return new THREE.Vector4(s.dir[0] / len, s.dir[1] / len, k, Math.sqrt(9.81 * k) * SWELL_PACE);
});
const waveB = SWELLS.map((s) => {
  const k = (Math.PI * 2) / s.length;
  return new THREE.Vector4(s.height, s.steepness / k, s.phase, 0);
});

/** Uniforms every patched material shares (the tide line on the rock reads the same values). */
const sea = {
  uSeaTime: { value: 0 },
  uSeaTide: { value: TIDE_MEAN - TIDE_RANGE },
  uSeaSwell: { value: 1 },
  uSeaCentre: { value: new THREE.Vector2() },
  uSeaHalf: { value: SEA_HALF },
  uSeaGrid: { value: new THREE.Vector2(GRIDS.full.spacing, 0) },
  uWaveA: { value: waveA },
  uWaveB: { value: waveB },
  uWetTop: { value: TIDE_MEAN - TIDE_RANGE + SWASH },
};

const SEA_COMMON = /* glsl */ `
uniform float uSeaTime;
uniform float uSeaTide;
uniform float uSeaSwell;
uniform vec2 uSeaCentre;
uniform float uSeaHalf;
uniform vec2 uSeaGrid;
uniform vec4 uWaveA[4]; // (dir.x, dir.z, k, w)
uniform vec4 uWaveB[4]; // (height, horizontal reach Q*A, phase, -)
// Swells die out toward the sea's square edge, so it meets the flat horizon disc without a seam.
float seaEdge(vec2 p) { return 1.0 - smoothstep(uSeaHalf * 0.55, uSeaHalf * 0.97, max(abs(p.x), abs(p.y))); }
`;

// ---------------------------------------------------------------------------------------------------------------
// CPU copy of the swells, for anything that floats.
// ---------------------------------------------------------------------------------------------------------------

const scratch = { x: 0, y: 0, z: 0 };

/** The surface's displacement from rest at grid point (x, z), exactly as the sea's vertex shader moves it. */
function displacement(x: number, z: number, out = scratch): typeof scratch {
  out.x = out.y = out.z = 0;
  const swell = sea.uSeaSwell.value;
  if (swell <= 0) return out;
  x = THREE.MathUtils.clamp(x, -SEA_HALF, SEA_HALF);
  z = THREE.MathUtils.clamp(z, -SEA_HALF, SEA_HALF);
  const centre = sea.uSeaCentre.value;
  const grid = sea.uSeaGrid.value;
  const spacing = grid.x + grid.y * Math.max(Math.abs(x - centre.x), Math.abs(z - centre.y));
  const edge = (1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(x), Math.abs(z)), SEA_HALF * 0.55, SEA_HALF * 0.97)) * swell;
  const t = sea.uSeaTime.value;
  for (let i = 0; i < waveA.length; i++) {
    const a = waveA[i];
    const b = waveB[i];
    const length = (Math.PI * 2) / a.z;
    const w = edge * (1 - THREE.MathUtils.smoothstep(spacing, 0.22 * length, 0.4 * length));
    if (w <= 0) continue;
    const th = a.z * (a.x * x + a.y * z) - a.w * t + b.z;
    const c = Math.cos(th);
    out.x += w * a.x * b.y * c;
    out.y += w * b.x * Math.sin(th);
    out.z += w * a.y * b.y * c;
  }
  return out;
}

/**
 * The sea's surface height (world y) at world (x, z) right now: the tide plus the swells, as drawn. The swells move
 * the water sideways too, so the grid point that ends up over (x, z) is found by a few fixed-point steps.
 */
export function seaHeight(x: number, z: number): number {
  let px = x;
  let pz = z;
  for (let i = 0; i < 3; i++) {
    const d = displacement(px, pz);
    px = x - d.x;
    pz = z - d.z;
  }
  return sea.uSeaTide.value + displacement(px, pz).y;
}

// ---------------------------------------------------------------------------------------------------------------
// The shoreline bake: the land seen from above, then its distance from the water at four sea levels.
// ---------------------------------------------------------------------------------------------------------------

/**
 * Renders the land straight down into a float target (each texel the highest surface there), reads it back and turns
 * it into the signed distance (m) from the waterline with the sea at each of four levels, packed into one RGBA8
 * texture. The sea's shader interpolates between the four by the water's live height, so the foam follows the line
 * where the water actually meets the rock as the tide and the swells move it. ~30 ms, once, at load.
 */
export function bakeShore(renderer: THREE.WebGLRenderer, land: THREE.Mesh[]): THREE.DataTexture {
  const n = SHORE_TEXELS;
  const { minX, minZ, size } = SHORE_RECT;
  const target = new THREE.WebGLRenderTarget(n, n, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying float vY;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vY = world.y;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    // Offset so that "nothing here" (cleared to 0) reads as the deep sea floor.
    fragmentShader: /* glsl */ `
      varying float vY;
      void main() { gl_FragColor = vec4(vY + 1000.0, 0.0, 0.0, 1.0); }`,
  });
  const scene = new THREE.Scene();
  for (const mesh of land) {
    if ((mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) continue;
    const proxy = new THREE.Mesh(mesh.geometry, material);
    proxy.matrixAutoUpdate = false;
    proxy.matrix.copy(mesh.matrixWorld);
    proxy.matrixWorldNeedsUpdate = true;
    scene.add(proxy);
  }
  // Looking straight down with -z up the screen: x runs left to right and the first row read back is the +z edge.
  const half = size / 2;
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, 1, 2000);
  camera.position.set(minX + half, 1000, minZ + half);
  camera.up.set(0, 0, -1);
  camera.lookAt(minX + half, 0, minZ + half);
  camera.updateMatrixWorld();

  const previous = { target: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha() };
  const pixels = new Float32Array(n * n * 4);
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.readRenderTargetPixels(target, 0, 0, n, n, pixels);
  renderer.setRenderTarget(previous.target);
  renderer.setClearColor(previous.color, previous.alpha);
  target.dispose();
  material.dispose();

  // Heights by texel, row j at z = minZ + (j + 0.5) * cell.
  const height = new Float32Array(n * n);
  for (let r = 0; r < n; r++) {
    const j = n - 1 - r;
    for (let i = 0; i < n; i++) {
      const v = pixels[(r * n + i) * 4];
      height[j * n + i] = v > 0 ? v - 1000 : -1000;
    }
  }

  const cell = size / n;
  const data = new Uint8Array(n * n * 4);
  const toLand = new Float64Array(n * n);
  const toWater = new Float64Array(n * n);
  const work = { f: new Float64Array(n), d: new Float64Array(n), v: new Int32Array(n), z: new Float64Array(n + 1) };
  for (let c = 0; c < 4; c++) {
    const level = SHORE_LEVELS.first + SHORE_LEVELS.step * c;
    for (let k = 0; k < n * n; k++) {
      const land = height[k] > level;
      toLand[k] = land ? 0 : FAR;
      toWater[k] = land ? FAR : 0;
    }
    distanceTransform(toLand, n, work);
    distanceTransform(toWater, n, work);
    for (let k = 0; k < n * n; k++) {
      // Half a texel in from either side, so the waterline itself is at 0.
      const d = (toLand[k] > 0 ? Math.sqrt(toLand[k]) - 0.5 : 0.5 - Math.sqrt(toWater[k])) * cell;
      data[k * 4 + c] = Math.round(THREE.MathUtils.clamp((d - SHORE_DISTANCE.min) / SHORE_DISTANCE.range, 0, 1) * 255);
    }
  }
  const texture = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  texture.name = 'Dwarka_Shore_Distance';
  return texture;
}

const FAR = 1e20;

/** Squared Euclidean distance to the nearest zero, in place (Felzenszwalb and Huttenlocher: columns, then rows). */
function distanceTransform(grid: Float64Array, n: number, w: { f: Float64Array; d: Float64Array; v: Int32Array; z: Float64Array }): void {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) w.f[j] = grid[j * n + i];
    edt1d(w);
    for (let j = 0; j < n; j++) grid[j * n + i] = w.d[j];
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) w.f[i] = grid[j * n + i];
    edt1d(w);
    for (let i = 0; i < n; i++) grid[j * n + i] = w.d[i];
  }
}

function edt1d({ f, d, v, z }: { f: Float64Array; d: Float64Array; v: Int32Array; z: Float64Array }): void {
  const n = f.length;
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The sea's material: the exported water, displaced by the swells, with their normals, the foam and the rain.
// ---------------------------------------------------------------------------------------------------------------

const SEA_VERTEX = /* glsl */ `
${SEA_COMMON}
varying vec2 vSeaP;
varying float vSeaH;
`;

/**
 * Replaces beginnormal_vertex: the grid point (clamped to the sea's square), its swell and its normal. The swells'
 * normals are only per vertex: they are tens of metres long and the grid is fine where it is close, and a per-pixel
 * copy doubled the sea's cost where it fills the screen (the scrolling normal maps carry the fine detail).
 */
const SEA_DISPLACE = /* glsl */ `
vec2 seaP = clamp(uSeaCentre + position.xz, -uSeaHalf, uSeaHalf);
vec2 seaRel = seaP - uSeaCentre;
// The grid's spacing here: a swell shorter than ~3 cells is faded out of the displacement (its normals stay).
float seaSpacing = uSeaGrid.x + uSeaGrid.y * max(abs(seaRel.x), abs(seaRel.y));
float seaFade = seaEdge(seaP) * uSeaSwell;
vec3 seaD = vec3(0.0);
vec3 objectNormal = vec3(0.0, 1.0, 0.0);
for (int i = 0; i < 4; i++) {
  vec4 a = uWaveA[i];
  vec4 b = uWaveB[i];
  float len = 6.2831853 / a.z;
  float w = seaFade * (1.0 - smoothstep(0.22 * len, 0.4 * len, seaSpacing));
  float th = a.z * dot(a.xy, seaP) - a.w * uSeaTime + b.z;
  float s = sin(th);
  float c = cos(th);
  seaD += w * vec3(a.x * b.y * c, b.x * s, a.y * b.y * c);
  objectNormal += w * vec3(-a.x * a.z * b.x * c, -a.z * b.y * s, -a.y * a.z * b.x * c);
}
objectNormal = normalize(objectNormal);
vSeaP = seaP;
vSeaH = seaD.y;
`;

const SEA_FRAGMENT = /* glsl */ `
${SEA_COMMON}
uniform sampler2D uShore;
uniform vec4 uShoreRect;  // (min x, min z, 1 / size, 1 / size)
uniform vec4 uShoreCode;  // (first level, level step, distance at 0, distance range)
uniform vec3 uFoamColor;
uniform float uSeaRain;
uniform float uRainTime;
varying vec2 vSeaP;
varying float vSeaH;
${RAIN_SLOPE}

// Distance (m) from the waterline with the sea at 'level' (positive out to sea), from the four baked levels; and how
// far the line moves between the two levels either side (metres: small at a cliff, large over a flat shelf).
vec2 shoreDistance(vec2 p, float level) {
  vec2 uv = (p - uShoreRect.xy) * uShoreRect.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec2(1e3, 0.0);
  vec4 d = texture2D(uShore, uv) * uShoreCode.w + uShoreCode.z;
  float x = clamp((level - uShoreCode.x) / uShoreCode.y, 0.0, 3.0);
  vec2 pair = x < 1.0 ? d.rg : x < 2.0 ? d.gb : d.ba;
  return vec2(mix(pair.x, pair.y, x - min(floor(x), 2.0)), pair.y - pair.x);
}

// Value noise from a small tiling texture of random values (one fetch; hashing it in the shader cost every sea pixel
// ~0.15 ms, since the compiler runs the foam whether or not a pixel is near a shore). Each channel is its own field.
uniform sampler2D uSeaNoise;
vec4 seaNoise(vec2 p) { return texture2D(uSeaNoise, p * ${(1 / NOISE_TEXELS).toFixed(6)}); }

// Shore foam in soft-edged bands (the cel look): a rim hugging the rock, widening as a crest runs up it, and lines
// that roll in toward it with the swell and break up as they go.
float seaFoam(vec2 p, float dist) {
  float level = uSeaTide + vSeaH;
  vec2 sd = shoreDistance(p, level);
  float d = sd.x;
  if (d > 14.0) return 0.0;
  float n = seaNoise(p * 0.3 + vec2(uSeaTime * 0.031, -uSeaTime * 0.023)).r;
#ifdef SEA_SIMPLE
  // The low setting: the rim alone, torn by the one noise.
  float f = (1.0 - smoothstep(0.15, 0.4 + 0.5 * n, abs(d))) * smoothstep(0.25, 0.45, n);
#else
  float lace = seaNoise(p * 0.95 - vec2(uSeaTime * 0.07, uSeaTime * 0.05)).g;
  float torn = 0.5 * lace + 0.5 * seaNoise(p * 2.3 + vec2(-uSeaTime * 0.11, uSeaTime * 0.09)).b;
  // Water only just over a flat shelf (a reef, an apron of rock) is all "near the line" at once: there the foam is
  // only scattered lace, never a sheet.
  float shelf = smoothstep(1.5, 5.0, sd.y) * (1.0 - smoothstep(0.0, 1.5, d));
  // The rim: a thin line of white against the rock (gapped here and there), and broken wash beyond it that spreads
  // further out as a crest arrives and draws back in the trough.
  float edge = (1.0 - smoothstep(0.15, 0.35 + 0.35 * n, abs(d))) * smoothstep(0.12, 0.3, torn);
  float washWidth = 0.6 + 1.0 * n + max(vSeaH, 0.0) * 1.6;
  // (Not under the rock: where the bake and the drawn rock disagree a little, the water there stays clear.)
  float wash = (1.0 - smoothstep(washWidth * 0.6, washWidth, d)) * smoothstep(-1.0, 0.0, d) * smoothstep(0.42, 0.58, torn) * 0.6;
  float rim = max(edge, wash);
  // (the lace: thin threads along the noise's mid-line, as foam lies on water that has just washed over rock)
  float threads = smoothstep(0.82, 0.92, 1.0 - abs(torn * 2.0 - 1.0));
  rim = mix(rim, threads * 0.55, shelf);
  // One or two broken lines rolling in behind it, gone before they are far out.
  float roll = fract(d / 4.4 + uSeaTime * 0.15 + n * 0.9);
  float lines = smoothstep(0.0, 0.06, roll) * (1.0 - smoothstep(0.1, 0.19, roll));
  lines *= (1.0 - smoothstep(1.0, 4.5 + 3.0 * n, d)) * smoothstep(0.48, 0.62, lace) * (1.0 - shelf);
  // Far off the lines would shimmer: the rim alone.
  lines *= 1.0 - smoothstep(120.0, 260.0, dist);
  float f = max(rim, lines * 0.62);
#endif
  return smoothstep(0.32, 0.42, f) * 0.42 + smoothstep(0.72, 0.82, f) * 0.3;
}
`;

/** Patches the exported water material into the living sea (its scrolling normal map and sky reflections kept). */
function seaMaterial(material: THREE.MeshStandardMaterial, shore: THREE.Texture, noise: THREE.Texture, uvFit: { u: THREE.Vector3; v: THREE.Vector3 }, rain: { value: number }): void {
  const extra = {
    uShore: { value: shore },
    uSeaNoise: { value: noise },
    uShoreRect: { value: new THREE.Vector4(SHORE_RECT.minX, SHORE_RECT.minZ, 1 / SHORE_RECT.size, 1 / SHORE_RECT.size) },
    uShoreCode: { value: new THREE.Vector4(SHORE_LEVELS.first, SHORE_LEVELS.step, SHORE_DISTANCE.min, SHORE_DISTANCE.range) },
    // Grey-white under the storm (pure white would glow against the dark water).
    uFoamColor: { value: new THREE.Color(0.5, 0.55, 0.58) },
    uSeaRain: rain,
    uRainTime: rainClock,
    uSeaUvU: { value: uvFit.u },
    uSeaUvV: { value: uvFit.v },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sea, extra);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${SEA_VERTEX}\nuniform vec3 uSeaUvU;\nuniform vec3 uSeaUvV;`)
      .replace('#include <beginnormal_vertex>', SEA_DISPLACE)
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(seaP.x + seaD.x, uSeaTide + seaD.y, seaP.y + seaD.z);
#ifdef USE_NORMALMAP
  // The export's own texture mapping, carried over to wherever this grid point is now.
  vNormalMapUv = (normalMapTransform * vec3(dot(uSeaUvU, vec3(seaP, 1.0)), dot(uSeaUvV, vec3(seaP, 1.0)), 1.0)).xy;
#endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SEA_FRAGMENT}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float seaViewDist = length(vViewPosition);
float seaFoamAmount = seaFoam(vSeaP, seaViewDist);
diffuseColor.rgb = mix(diffuseColor.rgb, uFoamColor, seaFoamAmount);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.85, seaFoamAmount);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  // Raindrops pock the water near the camera (not on the low setting); foam is matte and flat.
#ifdef SEA_RAIN
  float rainFade = uSeaRain * (1.0 - smoothstep(12.0, 45.0, seaViewDist));
  if (rainFade > 0.001) {
    vec2 rs = rainSlope(vSeaP * 0.35) * rainFade * 0.6;
    normal = normalize(normal + (viewMatrix * vec4(-rs.x, 0.0, -rs.y, 0.0)).xyz);
  }
#endif
  normal = normalize(mix(normal, nonPerturbedNormal, seaFoamAmount * 0.8));
}`);
  };
  material.customProgramCacheKey = () => 'dwarka-living-sea';
  material.needsUpdate = true;
}

// ---------------------------------------------------------------------------------------------------------------
// The tide line on the shore rock.
// ---------------------------------------------------------------------------------------------------------------

/**
 * Darkens and glosses a shore material in the band the sea has just left: from the water up to where the tide stood
 * a little while ago (`uWetTop`, which lags the ebb), soaked darkest just above the water where the swell still
 * washes. Chained after any earlier patch (the rain's), so the stone stays rain-wet above it.
 */
export function tidemark(material: THREE.MeshStandardMaterial): void {
  if (material.userData.tidemark) return;
  material.userData.tidemark = true;
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.uSeaTide = sea.uSeaTide;
    shader.uniforms.uWetTop = sea.uWetTop;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTideWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvTideWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSeaTide;\nuniform float uWetTop;\nvarying vec3 vTideWorld;')
      .replace('#include <color_fragment>', `#include <color_fragment>
float tideAbove = vTideWorld.y - uSeaTide;
// The tide line is not ruled: it wanders a little with the rock.
float tideWobble = 0.06 * sin(vTideWorld.x * 0.9 + vTideWorld.z * 0.4) + 0.04 * sin(vTideWorld.z * 1.7 - vTideWorld.x * 0.3);
float tideTop = uWetTop - uSeaTide + tideWobble;
float tideWet = 1.0 - smoothstep(tideTop - 0.06, tideTop + 0.02, tideAbove);
float tideSoak = 1.0 - smoothstep(0.12 + tideWobble, 0.18 + tideWobble, tideAbove);
diffuseColor.rgb *= mix(1.0, 0.68, tideWet) * mix(1.0, 0.8, tideSoak);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor *= mix(1.0, 0.45, tideWet);`);
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}|tidemark`;
  material.needsUpdate = true;
}

// ---------------------------------------------------------------------------------------------------------------
// The sea itself.
// ---------------------------------------------------------------------------------------------------------------

export interface SeaParts {
  /** The exported 700 m water plane (its material becomes the sea's; the plane itself is hidden). */
  ocean: THREE.Mesh;
  /** The flat horizon disc round it: kept flat, raised and lowered with the tide. */
  horizon: THREE.Mesh | null;
  /** The exported surf ring at a fixed height: replaced by the sea's own foam (hidden). */
  surf: THREE.Mesh | null;
  /** Everything the sea washes against, for the shoreline bake. */
  land: THREE.Mesh[];
}

/** Dev overrides (`__debug.tide`): a fixed tide level, the tide's pace, the swells' size. */
export interface TideDebug {
  level?: number | null;
  speed?: number;
  swell?: number;
}

export class LivingSea {
  public readonly mesh: THREE.Mesh;
  public readonly shore: THREE.DataTexture;
  public readonly noise = noiseTexture();
  private readonly material: THREE.MeshStandardMaterial;
  private readonly horizon: THREE.Mesh | null;
  /** The export's thin clearcoat on the water, dropped on the low setting (a second specular lobe on every pixel). */
  private readonly clearcoat: number;
  private readonly horizonY: number;
  private readonly rain = { value: 1 };
  private quality: SeaQuality = 'full';
  private tideClock = 0;
  private fixedLevel: number | null = null;
  private tidePace = 1;
  private swellScale = 1;

  constructor(parts: SeaParts, renderer: THREE.WebGLRenderer, quality: SeaQuality) {
    this.shore = bakeShore(renderer, parts.land);
    const material = (this.material = parts.ocean.material as THREE.MeshStandardMaterial);
    this.clearcoat = (material as THREE.MeshPhysicalMaterial).clearcoat ?? 0;
    seaMaterial(material, this.shore, this.noise, fitPlanarUv(parts.ocean), this.rain);
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
    this.mesh.name = 'Dwarka_Living_Sea';
    // Placed in the shader round the camera, so never culled.
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = parts.ocean.receiveShadow;
    // After the land: the sea runs under every islet and the arena, and drawn first it would shade all of that only to
    // be painted over (most of its cost, in the fight's view). Drawn after, the depth test skips what the rock hides.
    this.mesh.renderOrder = parts.ocean.renderOrder + 1;
    parts.ocean.visible = false;
    if (parts.surf) parts.surf.visible = false;
    this.horizon = parts.horizon;
    this.horizonY = parts.horizon?.position.y ?? 0;
    this.setQuality(quality);
    sea.uSeaTime.value = 0;
    this.update(0, null);
    sea.uWetTop.value = sea.uSeaTide.value + SWASH;
  }

  /**
   * 'full': the 51k-triangle grid; 'low': a coarser one (13k), the foam's rim alone, no raindrops on the water and no
   * clearcoat (the per-pixel work is most of the sea's cost); 'flat': as low, and no swells (the tide and rim stay).
   */
  public setQuality(quality: SeaQuality): void {
    this.quality = quality;
    const physical = this.material as THREE.MeshPhysicalMaterial;
    if (physical.isMeshPhysicalMaterial) physical.clearcoat = quality === 'full' ? this.clearcoat : 0;
    this.applyDefines();
    const { cells, spacing } = GRIDS[quality];
    this.mesh.geometry.dispose();
    this.mesh.geometry = seaGrid(cells, spacing);
    sea.uSeaGrid.value.set(spacing, growth(cells, spacing) - 1);
    this.applySwell();
  }

  public get state(): { quality: SeaQuality; level: number; wetTop: number; tide: number; swell: number; pace: number } {
    return {
      quality: this.quality,
      level: +sea.uSeaTide.value.toFixed(3),
      wetTop: +sea.uWetTop.value.toFixed(3),
      tide: +((this.tideClock / TIDE_PERIOD) % 1).toFixed(3),
      swell: this.swellScale,
      pace: this.tidePace,
    };
  }

  public debug(opts: TideDebug): void {
    if (opts.level !== undefined) this.fixedLevel = opts.level;
    if (opts.speed !== undefined) this.tidePace = opts.speed;
    if (opts.swell !== undefined) this.swellScale = opts.swell;
    this.applySwell();
  }

  /** Raindrops on the water: 1 in the full rain, less in the light one, 0 with none. */
  public setRain(amount: number): void {
    this.rain.value = amount;
    this.applyDefines();
  }

  /**
   * The shader's variants: the low setting's simple foam, and the raindrops on the water only while it rains (as
   * defines, not branches: the compiler flattens such branches, so a switched-off effect would still be paid for).
   */
  private applyDefines(): void {
    const defines = (this.material.defines ??= {});
    const want: Record<string, boolean> = { SEA_SIMPLE: this.quality !== 'full', SEA_RAIN: this.quality === 'full' && this.rain.value > 0 };
    let changed = false;
    for (const [name, on] of Object.entries(want)) {
      if (on === (name in defines)) continue;
      if (on) defines[name] = '';
      else delete defines[name];
      changed = true;
    }
    if (changed) this.material.needsUpdate = true;
  }

  private applySwell(): void {
    sea.uSeaSwell.value = this.quality === 'flat' ? 0 : this.swellScale;
  }

  /** On game time (the sea hangs while paused): the swells, the tide, the wet band, the grid under the camera. */
  public update(dt: number, camera: THREE.Camera | null): void {
    sea.uSeaTime.value += dt;
    this.tideClock += dt * this.tidePace;
    // Low water when the chapter opens: the sea creeps up the rocks through the fight.
    const level = this.fixedLevel ?? TIDE_MEAN - TIDE_RANGE * Math.cos((this.tideClock / TIDE_PERIOD) * Math.PI * 2);
    sea.uSeaTide.value = level;
    const reach = level + SWASH * Math.min(1, sea.uSeaSwell.value);
    sea.uWetTop.value = Math.max(reach, sea.uWetTop.value - DRYING * dt * Math.max(1, this.tidePace));
    if (this.horizon) this.horizon.position.y = this.horizonY + level;
    if (camera) {
      // Snapped to the finest cell, so the grid steps rather than slides under the swells (they would swim).
      const step = sea.uSeaGrid.value.x * 2;
      sea.uSeaCentre.value.set(Math.round(camera.position.x / step) * step, Math.round(camera.position.z / step) * step);
    }
  }
}

/** Random values in four independent channels, tiling, filtered: value noise at the cost of one fetch. */
function noiseTexture(): THREE.DataTexture {
  const n = NOISE_TEXELS;
  const data = new Uint8Array(n * n * 4);
  let seed = 90211;
  for (let i = 0; i < data.length; i++) data[i] = ((seed = (1664525 * seed + 1013904223) >>> 0) >>> 24);
  const texture = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  texture.name = 'Dwarka_Sea_Noise';
  return texture;
}

/** The growth factor q of a grid whose cells start at `spacing` and reach GRID_REACH in `cells` steps. */
function growth(cells: number, spacing: number): number {
  let lo = 1.000001;
  let hi = 1.5;
  for (let i = 0; i < 60; i++) {
    const q = (lo + hi) / 2;
    if ((spacing * (q ** cells - 1)) / (q - 1) > GRID_REACH) hi = q;
    else lo = q;
  }
  return (lo + hi) / 2;
}

/**
 * The sea's grid, in metres from the camera: (2 cells + 1)^2 vertices whose spacing grows geometrically from the
 * centre, fine under the camera and coarse at the horizon. Its quads are split along the diagonal that points away from
 * the centre, so the four quadrants mirror each other.
 */
function seaGrid(cells: number, spacing: number): THREE.BufferGeometry {
  const q = growth(cells, spacing);
  const axis: number[] = [];
  for (let i = -cells; i <= cells; i++) axis.push(Math.sign(i) * ((spacing * (q ** Math.abs(i) - 1)) / (q - 1)));
  const side = axis.length;
  const position = new Float32Array(side * side * 3);
  for (let j = 0; j < side; j++) for (let i = 0; i < side; i++) position.set([axis[i], 0, axis[j]], (j * side + i) * 3);
  const index: number[] = [];
  for (let j = 0; j < side - 1; j++) {
    for (let i = 0; i < side - 1; i++) {
      const a = j * side + i;
      const b = a + 1;
      const c = a + side;
      const d = c + 1;
      if ((i < cells) === (j < cells)) index.push(a, c, d, a, d, b);
      else index.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setIndex(index);
  return geometry;
}

/** The export's planar texture mapping, u and v as (a, b, c) . (x, z, 1), fitted to its plane (least squares). */
function fitPlanarUv(mesh: THREE.Mesh): { u: THREE.Vector3; v: THREE.Vector3 } {
  const pos = mesh.geometry.getAttribute('position');
  const uv = mesh.geometry.getAttribute('uv');
  const fallback = { u: new THREE.Vector3(1 / 95, 0, 0), v: new THREE.Vector3(0, 1 / 95, 1) };
  if (!pos || !uv) return fallback;
  mesh.updateWorldMatrix(true, false);
  const p = new THREE.Vector3();
  const m = new THREE.Matrix3();
  const bu = new THREE.Vector3();
  const bv = new THREE.Vector3();
  const e = m.elements;
  e.fill(0);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    const row = [p.x, p.z, 1];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) e[c * 3 + r] += row[r] * row[c];
    bu.addScaledVector(new THREE.Vector3(...row), uv.getX(i));
    bv.addScaledVector(new THREE.Vector3(...row), uv.getY(i));
  }
  if (Math.abs(m.determinant()) < 1e-9) return fallback;
  m.invert();
  return { u: bu.applyMatrix3(m), v: bv.applyMatrix3(m) };
}

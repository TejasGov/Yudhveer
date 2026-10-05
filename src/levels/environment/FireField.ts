import * as THREE from 'three';

/*
 * Fire drawn in a shader (the village, docs/STORY.md "The village and the reveal", and since the fire pass every other
 * flame in the game, "Real fire everywhere"): every flame in a level in one instanced draw. Each fire spot gets a few
 * tongues (camera-facing quads, turned about the vertical only so they stay upright) and a soft glow behind them. A
 * tongue is a teardrop of noise-eroded flame scrolling upward, its outline pushed about by the noise, cut into three
 * flat bands (a deep red rim, orange, a yellow-white core: the cel look), premultiplied so the rim covers what is
 * behind it while the core adds light. The glow is additive. The flames write no depth, so the ink pass never outlines
 * them.
 *
 * Fires belong to groups (a torch, the hearth, a burning roof, one lamp of a row lit one after another...); each group
 * has an amount (0 out .. 1 full, more is fiercer) and a flicker the level reads back to drive that group's light
 * (`flicker`), so the light breathes with the flames. A wind (`setWind`) leans every tongue and, in its gusts, makes
 * them flutter and gutter low (the lights dip with them). Everything is uniforms: lighting or putting out a fire, or
 * the wind changing, never recompiles a shader or rebuilds a buffer.
 */

export interface FireSpot {
  /** The flame's foot (the field's own coordinates: the level's, or a moving parent's). */
  at: THREE.Vector3;
  /** Metres tall at full. */
  size: number;
  group: string;
  /** Tongues here (the field's count for the group otherwise). */
  tongues?: number;
  /** How far the side tongues stand from the middle, in metres (0.12 x size otherwise): a brazier's bowl spreads them. */
  spread?: number;
  /** The main tongue's width as a share of its height (0.62 otherwise; a thin wick flame less). */
  width?: number;
  /** The glow's size relative to the flame (1 otherwise; 0 none). */
  glow?: number;
}

export interface FirePalette {
  rim: THREE.Color;
  body: THREE.Color;
  core: THREE.Color;
  glow: THREE.Color;
}

export interface FireFieldOptions {
  /** Tongues per spot, by group (3 otherwise), for spots that do not say. */
  tongues?: (group: string) => number;
  /** The bands' colours (HDR, linear), if not the village's. */
  palette?: Partial<FirePalette>;
}

/** Groups a field can tell apart (a uniform array; one level of lamps lit one at a time needs a group each). */
const MAX_GROUPS = 32;
/** How far a tongue's tip is blown per metre of its height, per metre a second of wind; and as far as it ever goes. */
const LEAN_PER_WIND = 0.12;
const MAX_LEAN = 0.5;
/** Wind (m/s) where gusts begin to make the flames gutter, and where they gutter most. */
const GUST_FROM = 2.9;
const GUST_FULL = 4.3;

const VERTEX = /* glsl */ `
attribute vec4 aFlame;   // xyz foot, w height
attribute vec4 aShape;   // x width (fraction of height; a glow's size), y seed, z group, w kind (0 tongue, 1 glow)
uniform float uGroups[${MAX_GROUPS}];
uniform vec3 uLean;      // where the wind blows a tip, per metre of the flame's height (world)
varying vec2 vUv;
varying float vSeed;
varying float vAmount;
varying float vKind;
void main() {
  float amount = uGroups[int(aShape.z + 0.5)];
  vAmount = amount;
  vSeed = aShape.y;
  vKind = aShape.w;
  vUv = uv;
  // Grows with the fire, never quite to nothing while it burns at all; gone when out.
  float grow = amount < 0.02 ? 0.0 : 0.35 + 0.65 * min(amount, 1.6);
  float h = aFlame.w * grow;
  vec3 foot = (modelMatrix * vec4(aFlame.xyz, 1.0)).xyz;
  vec3 toCam = cameraPosition - foot;
  toCam.y = 0.0;
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), normalize(toCam + vec3(1e-4, 0.0, 0.0))));
  vec2 p = position.xy;          // x -0.5..0.5, y 0..1 (the plane moved up by half)
  vec3 world;
  if (aShape.w > 0.5) {
    // The glow: a camera-facing disc round the fire's middle, nudged toward the camera so it sits over the tongues
    // (by no more than the flame is tall: a wick's glow must not stand out in front of its lamp).
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 r2 = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 centre = foot + vec3(0.0, h * 0.35, 0.0) + uLean * h * 0.15;
    world = centre + (r2 * p.x + up * (p.y - 0.5)) * h * 1.6 * aShape.x + normalize(cameraPosition - centre) * min(0.15, h * 0.6);
  } else {
    // A tongue, its tip carried off by the wind (the foot stays on the wick). The flat tongue stands at the front of
    // the flame's body, a third of its width toward the camera, as the near side of a real flame would: a flame set
    // down in a lamp's cup, or a wick half sunk in stone, still shows.
    float w = h * aShape.x;
    world = foot + normalize(toCam + vec3(1e-4, 0.0, 0.0)) * w * 0.35 + right * p.x * w + vec3(0.0, p.y * h, 0.0) + uLean * h * p.y * p.y;
  }
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uGust;     // 0 still air .. 1 a strong gust: the tongues flutter harder
uniform vec3 uRim;
uniform vec3 uBody;
uniform vec3 uCore;
uniform vec3 uGlow;
varying vec2 vUv;
varying float vSeed;
varying float vAmount;
varying float vKind;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { return noise(p) * 0.55 + noise(p * 2.1 + 3.7) * 0.3 + noise(p * 4.3 + 7.1) * 0.15; }
void main() {
  if (vAmount < 0.02) discard;
  if (vKind > 0.5) {
    // Additive glow: a soft disc that breathes.
    float d = length(vUv - 0.5) * 2.0;
    float g = pow(max(0.0, 1.0 - d), 2.2) * (0.8 + 0.2 * sin(uTime * 7.0 + vSeed * 40.0));
    gl_FragColor = vec4(uGlow * g * 0.22 * min(vAmount, 1.3), 0.0);
    return;
  }
  float t = uTime * (1.6 + vSeed * 0.8 + uGust * 1.4) + vSeed * 31.0;
  vec2 uv = vUv;
  // Noise scrolling up through the tongue pushes its outline about, more toward the tip (and more in a gust).
  float n = fbm(vec2(uv.x * 2.6 + vSeed * 9.0, uv.y * 2.2 - t * 1.4));
  float n2 = fbm(vec2(uv.x * 5.0 - vSeed * 5.0, uv.y * 4.0 - t * 2.3));
  float x = (uv.x - 0.5) + (n - 0.5) * (0.42 + 0.25 * uGust) * uv.y + sin(t * 1.3 + uv.y * 3.0) * (0.04 + 0.05 * uGust) * uv.y;
  // A teardrop: round at the foot, widest a quarter up, drawn out to a tip.
  float y = uv.y;
  float halfWidth = 0.5 * smoothstep(0.0, 0.16, y) * pow(max(0.0, 1.0 - y), 0.85) * (0.75 + 0.5 * n2);
  float d = abs(x) / max(halfWidth, 1e-3);
  // Licks breaking off the top: the noise eats into the upper half.
  float erode = smoothstep(0.35, 1.0, y + (n2 - 0.5) * 0.55);
  float flame = (1.0 - smoothstep(0.75, 1.0, d)) * (1.0 - erode);
  if (flame < 0.01) discard;
  // Heat: hottest low in the middle.
  float heat = (1.0 - d) * (1.0 - y * 0.85) + (n - 0.5) * 0.25;
  vec3 col = uRim;
  float a = 0.9;
  if (heat > 0.2) { col = uBody; a = 0.7; }
  if (heat > 0.6) { col = uCore; a = 0.35; }
  float k = min(vAmount, 1.4);
  // Premultiplied: alpha covers what is behind (the rim reads against a bright sky), colour adds light.
  float alpha = flame * a * min(1.0, k * 1.5);
  gl_FragColor = vec4(col * flame * (0.75 + 0.35 * k), alpha);
}`;

/** The village's colours: a deep red rim, orange, a yellow-white core, an amber glow. */
const VILLAGE_PALETTE: FirePalette = {
  rim: new THREE.Color(0.75, 0.1, 0.02),
  body: new THREE.Color(1.4, 0.33, 0.04),
  core: new THREE.Color(2.1, 1.0, 0.22),
  glow: new THREE.Color(1.6, 0.55, 0.12),
};

export class FireField {
  public readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private readonly groupIndex = new Map<string, number>();
  private readonly amounts = new Float32Array(MAX_GROUPS);
  /** Each group's current flicker (about 0.8 .. 1.1), for its light. */
  private readonly flickers = new Float32Array(MAX_GROUPS).fill(1);
  private readonly seeds = new Float32Array(MAX_GROUPS);
  private readonly uniformsGroups: number[] = new Array(MAX_GROUPS).fill(0);
  /** How hard the wind gusts now (0 .. 1; see `setWind`). */
  private gust = 0;

  constructor(spots: FireSpot[], options: FireFieldOptions = {}) {
    const tongues = options.tongues ?? (() => 3);
    const tongueGeo = new THREE.PlaneGeometry(1, 1);
    tongueGeo.translate(0, 0.5, 0);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = tongueGeo.index;
    geo.setAttribute('position', tongueGeo.getAttribute('position'));
    geo.setAttribute('uv', tongueGeo.getAttribute('uv'));
    const flames: number[] = [];
    const shapes: number[] = [];
    for (const spot of spots) {
      let g = this.groupIndex.get(spot.group);
      if (g === undefined) {
        g = this.groupIndex.size;
        if (g >= MAX_GROUPS) throw new Error(`FireField: more than ${MAX_GROUPS} groups`);
        this.groupIndex.set(spot.group, g);
        this.seeds[g] = Math.random() * 100;
      }
      const n = Math.max(1, spot.tongues ?? tongues(spot.group));
      // The glow first (drawn under the tongues within the one draw).
      const glow = spot.glow ?? 1;
      if (glow > 0) {
        flames.push(spot.at.x, spot.at.y, spot.at.z, spot.size);
        shapes.push(glow, Math.random(), g, 1);
      }
      const spread = spot.spread ?? spot.size * 0.12;
      const width = spot.width ?? 0.62;
      for (let i = 0; i < n; i++) {
        const main = i === 0;
        const a = (i / Math.max(1, n - 1)) * Math.PI * 2 + Math.random() * 1.2;
        const r = main ? 0 : spread * (0.6 + 0.4 * Math.random());
        flames.push(spot.at.x + Math.cos(a) * r, spot.at.y, spot.at.z + Math.sin(a) * r, spot.size * (main ? 1 : 0.55 + Math.random() * 0.3));
        shapes.push(main ? width : width * (0.8 + Math.random() * 0.23), Math.random(), g, 0);
      }
    }
    geo.setAttribute('aFlame', new THREE.InstancedBufferAttribute(new Float32Array(flames), 4));
    geo.setAttribute('aShape', new THREE.InstancedBufferAttribute(new Float32Array(shapes), 4));
    geo.instanceCount = flames.length / 4;
    const palette = { ...VILLAGE_PALETTE, ...options.palette };
    this.material = new THREE.ShaderMaterial({
      name: 'FireField',
      uniforms: {
        uTime: { value: 0 },
        uGust: { value: 0 },
        uLean: { value: new THREE.Vector3() },
        uGroups: { value: this.uniformsGroups },
        uRim: { value: palette.rim.clone() },
        uBody: { value: palette.body.clone() },
        uCore: { value: palette.core.clone() },
        uGlow: { value: palette.glow.clone() },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'FireField';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
  }

  /** How fiercely a group burns: 0 out .. 1 full (up to 1.6). Unknown groups are ignored. */
  public set(group: string, amount: number): void {
    const g = this.groupIndex.get(group);
    if (g !== undefined) this.amounts[g] = Math.max(0, amount);
  }

  public get(group: string): number {
    const g = this.groupIndex.get(group);
    return g === undefined ? 0 : this.amounts[g];
  }

  /** The group's flicker now (multiply its light by this and its amount). */
  public flicker(group: string): number {
    const g = this.groupIndex.get(group);
    return g === undefined ? 1 : this.flickers[g];
  }

  public has(group: string): boolean {
    return this.groupIndex.has(group);
  }

  /**
   * The wind on the flames, metres a second along x and z (still air by default): every tongue leans with it, and in
   * its gusts (from about 3 m/s) they flutter harder and gutter, each fire dipping low and catching again on its own
   * beat, its light dipping with it (`flicker`).
   */
  public setWind(x: number, z: number, gusts = true): void {
    const speed = Math.hypot(x, z);
    const lean = Math.min(MAX_LEAN, speed * LEAN_PER_WIND);
    (this.material.uniforms.uLean.value as THREE.Vector3).set(speed > 1e-4 ? (x / speed) * lean : 0, 0, speed > 1e-4 ? (z / speed) * lean : 0);
    // A fire carried through still air (Takshaka's wave) trails its flames without guttering: `gusts` false.
    this.gust = gusts ? THREE.MathUtils.smoothstep(speed, GUST_FROM, GUST_FULL) : 0;
    this.material.uniforms.uGust.value = this.gust;
  }

  public update(time: number): void {
    this.material.uniforms.uTime.value = time;
    for (let g = 0; g < MAX_GROUPS; g++) {
      const s = this.seeds[g];
      // Gusts and gutters: the same few sines the old roof light used, slower parts for the big fires.
      const n = Math.sin(time * 9.0 + s) * 0.5 + Math.sin(time * 21.7 + 1.3 + s * 1.7) * 0.3 + Math.sin(time * 3.1 + s * 0.6) * 0.35;
      // In a gust each fire gutters low and catches again on its own beat (nothing in still air).
      const gutter = this.gust * (0.55 + 0.45 * Math.sin(time * 7.3 + s * 2.3));
      this.flickers[g] = (0.86 + 0.12 * n) * (1 - 0.45 * gutter);
      this.uniformsGroups[g] = this.amounts[g] * (0.94 + 0.06 * n) * (1 - 0.35 * gutter);
    }
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

/** A flame modelled in a level's mesh: where it stands (its foot, world coordinates), how tall and how wide it is. */
export interface ModelledFlame {
  foot: THREE.Vector3;
  height: number;
  width: number;
}

/**
 * The flames modelled in a level's meshes (cones, bipyramids, pills: one closed piece per flame, often a core inside a
 * shell), so a FireField can burn where they stood. Every separate piece is found (triangles that share vertices, with
 * vertices split along seams welded back together); the pieces that stand on one foot are one flame, as tall as the
 * tallest of them. World coordinates: the meshes' `matrixWorld` must be current. The pieces are measured, so a mesh
 * whose origin is far from its geometry (the island's tier flames) lands where it is seen.
 */
export function findModelledFlames(meshes: THREE.Mesh[]): ModelledFlame[] {
  const pieces: ModelledFlame[] = meshPieces(meshes).map((box) => ({
    foot: new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2),
    height: box.max.y - box.min.y,
    width: Math.max(box.max.x - box.min.x, box.max.z - box.min.z),
  }));
  // A core inside its shell (or the two cones of one flame) stand on one foot: one flame, as tall as the tallest.
  pieces.sort((a, b) => b.height - a.height);
  const flames: ModelledFlame[] = [];
  for (const piece of pieces) {
    const same = flames.some((f) => Math.abs(f.foot.y - piece.foot.y) < Math.max(0.03, f.height * 0.3)
      && Math.hypot(f.foot.x - piece.foot.x, f.foot.z - piece.foot.z) < Math.max(0.03, f.width * 0.5));
    if (!same) flames.push(piece);
  }
  return flames;
}

/**
 * The separate pieces of some meshes (triangles that share vertices, vertices split along seams welded back together),
 * as world-space boxes: a lamp's dishes, a flame's core and shell. `matrixWorld` must be current.
 */
export function meshPieces(meshes: THREE.Mesh[]): THREE.Box3[] {
  const pieces: THREE.Box3[] = [];
  const v = new THREE.Vector3();
  for (const mesh of meshes) {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const n = pos.count;
    const parent = new Int32Array(n);
    for (let i = 0; i < n; i++) parent[i] = i;
    const find = (a: number): number => {
      while (parent[a] !== a) {
        parent[a] = parent[parent[a]];
        a = parent[a];
      }
      return a;
    };
    const unite = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[ra] = rb;
    };
    const index = geo.index;
    const corners = index ? index.count : n;
    for (let i = 0; i + 2 < corners; i += 3) {
      const a = index ? index.getX(i) : i;
      const b = index ? index.getX(i + 1) : i + 1;
      const c = index ? index.getX(i + 2) : i + 2;
      unite(a, b);
      unite(b, c);
    }
    const welded = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i);
      const key = `${Math.round(v.x * 1e4)},${Math.round(v.y * 1e4)},${Math.round(v.z * 1e4)}`;
      const other = welded.get(key);
      if (other === undefined) welded.set(key, i);
      else unite(i, other);
    }
    const boxes = new Map<number, THREE.Box3>();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      let box = boxes.get(root);
      if (!box) boxes.set(root, (box = new THREE.Box3()));
      box.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
    }
    pieces.push(...boxes.values());
  }
  return pieces;
}

/**
 * A fire spot for a modelled flame: as tall as the modelled one looks (a tongue's teardrop fills about four fifths of
 * its height and two thirds of its width), as wide as it was, within what still reads as a flame.
 */
export function spotForFlame(flame: ModelledFlame, group: string, extra: Partial<FireSpot> = {}): FireSpot {
  const size = flame.height * 1.25;
  return {
    at: flame.foot.clone(),
    size,
    group,
    width: THREE.MathUtils.clamp(flame.width / (0.65 * size), 0.38, 0.72),
    tongues: 1,
    ...extra,
  };
}

import * as THREE from 'three';

/*
 * Fire drawn in a shader (the village, docs/STORY.md "The village and the reveal"): every flame in a level in one
 * instanced draw. Each fire spot gets a few tongues (camera-facing quads, turned about the vertical only so they stay
 * upright) and a soft glow behind them. A tongue is a teardrop of noise-eroded flame scrolling upward, its outline
 * pushed about by the noise, cut into three flat bands (a deep red rim, orange, a yellow-white core: the cel look),
 * premultiplied so the rim covers what is behind it while the core adds light. The glow is additive.
 *
 * Fires belong to groups (a torch, the hearth, a burning roof...); each group has an amount (0 out .. 1 full, more is
 * fiercer) and a flicker the level reads back to drive that group's light (`flicker`), so the light breathes with the
 * flames. Everything is uniforms: lighting or putting out a fire never recompiles a shader or rebuilds a buffer.
 */

export interface FireSpot {
  /** The flame's foot (level coordinates). */
  at: THREE.Vector3;
  /** Metres tall at full. */
  size: number;
  group: string;
}

const MAX_GROUPS = 8;

const VERTEX = /* glsl */ `
attribute vec4 aFlame;   // xyz foot, w height
attribute vec4 aShape;   // x width (fraction of height), y seed, z group, w kind (0 tongue, 1 glow)
uniform float uGroups[${MAX_GROUPS}];
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
  float w = h * aShape.x;
  vec3 foot = (modelMatrix * vec4(aFlame.xyz, 1.0)).xyz;
  vec3 toCam = cameraPosition - foot;
  toCam.y = 0.0;
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), normalize(toCam + vec3(1e-4, 0.0, 0.0))));
  vec2 p = position.xy;          // x -0.5..0.5, y 0..1 (the plane moved up by half)
  vec3 world;
  if (aShape.w > 0.5) {
    // The glow: a camera-facing disc round the fire's middle, nudged toward the camera so it sits over the tongues.
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 r2 = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    world = foot + vec3(0.0, h * 0.35, 0.0) + (r2 * p.x + up * (p.y - 0.5)) * h * 1.6 + normalize(cameraPosition - foot) * 0.15;
  } else {
    world = foot + right * p.x * w + vec3(0.0, p.y * h, 0.0);
  }
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
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
  float t = uTime * (1.6 + vSeed * 0.8) + vSeed * 31.0;
  vec2 uv = vUv;
  // Noise scrolling up through the tongue pushes its outline about, more toward the tip.
  float n = fbm(vec2(uv.x * 2.6 + vSeed * 9.0, uv.y * 2.2 - t * 1.4));
  float n2 = fbm(vec2(uv.x * 5.0 - vSeed * 5.0, uv.y * 4.0 - t * 2.3));
  float x = (uv.x - 0.5) + (n - 0.5) * 0.42 * uv.y + sin(t * 1.3 + uv.y * 3.0) * 0.04 * uv.y;
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

export class FireField {
  public readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private readonly groupIndex = new Map<string, number>();
  private readonly amounts = new Float32Array(MAX_GROUPS);
  /** Each group's current flicker (about 0.8 .. 1.1), for its light. */
  private readonly flickers = new Float32Array(MAX_GROUPS).fill(1);
  private readonly seeds = new Float32Array(MAX_GROUPS);
  private readonly uniformsGroups: number[] = new Array(MAX_GROUPS).fill(0);

  constructor(spots: FireSpot[], tongues: (group: string) => number = () => 3) {
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
      const n = Math.max(1, tongues(spot.group));
      // The glow first (drawn under the tongues within the one draw).
      flames.push(spot.at.x, spot.at.y, spot.at.z, spot.size);
      shapes.push(1, Math.random(), g, 1);
      for (let i = 0; i < n; i++) {
        const main = i === 0;
        const a = Math.random() * Math.PI * 2;
        const r = main ? 0 : spot.size * 0.12;
        flames.push(spot.at.x + Math.cos(a) * r, spot.at.y, spot.at.z + Math.sin(a) * r, spot.size * (main ? 1 : 0.55 + Math.random() * 0.3));
        shapes.push(main ? 0.62 : 0.5 + Math.random() * 0.14, Math.random(), g, 0);
      }
    }
    geo.setAttribute('aFlame', new THREE.InstancedBufferAttribute(new Float32Array(flames), 4));
    geo.setAttribute('aShape', new THREE.InstancedBufferAttribute(new Float32Array(shapes), 4));
    geo.instanceCount = flames.length / 4;
    this.material = new THREE.ShaderMaterial({
      name: 'FireField',
      uniforms: {
        uTime: { value: 0 },
        uGroups: { value: this.uniformsGroups },
        uRim: { value: new THREE.Color(0.75, 0.1, 0.02) },
        uBody: { value: new THREE.Color(1.4, 0.33, 0.04) },
        uCore: { value: new THREE.Color(2.1, 1.0, 0.22) },
        uGlow: { value: new THREE.Color(1.6, 0.55, 0.12) },
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

  public update(time: number): void {
    this.material.uniforms.uTime.value = time;
    for (let g = 0; g < MAX_GROUPS; g++) {
      const s = this.seeds[g];
      // Gusts and gutters: the same few sines the old roof light used, slower parts for the big fires.
      const n = Math.sin(time * 9.0 + s) * 0.5 + Math.sin(time * 21.7 + 1.3 + s * 1.7) * 0.3 + Math.sin(time * 3.1 + s * 0.6) * 0.35;
      this.flickers[g] = 0.86 + 0.12 * n;
      this.uniformsGroups[g] = this.amounts[g] * (0.94 + 0.06 * n);
    }
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

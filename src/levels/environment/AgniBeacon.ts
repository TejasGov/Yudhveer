import * as THREE from 'three';

const NOISE_GLSL = /* glsl */ `
float bHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(bHash(i), bHash(i + vec2(1, 0)), f.x), mix(bHash(i + vec2(0, 1)), bHash(i + vec2(1, 1)), f.x), f.y);
}
float bFbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * bNoise(p); p = p * 2.07 + 13.1; a *= 0.5; }
  return s;
}
// Cel-banded fire palette (HDR, feeds the bloom): ember red -> orange -> white-hot core.
vec4 fireBands(float v) {
  if (v > 0.66) return vec4(5.2, 3.4, 1.3, 1.0);
  if (v > 0.46) return vec4(3.6, 1.15, 0.12, 0.9);
  if (v > 0.28) return vec4(1.9, 0.26, 0.03, 0.7);
  if (v > 0.14) return vec4(0.7, 0.06, 0.01, 0.4);
  return vec4(0.0);
}`;

// Column of fire rising from the altar into the sky. Height comes from the geometry (0 at the altar, 1 at the
// top), not UVs: Blender's exporter flips V, which is what made the placeholder's fire run downward.
const BEAM_VERTEX = /* glsl */ `
uniform float uHeight;
varying float vH;
varying float vAngle;
varying float vRim;
void main() {
  vH = position.y / uHeight;
  vAngle = atan(position.z, position.x) / 6.2831853 + 0.5;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vRim = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`;
const BEAM_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uPulse;
uniform float uHeight;
uniform float uReach;
varying float vH;
varying float vAngle;
varying float vRim;
${NOISE_GLSL}
void main() {
  float y = vH * uHeight; // metres above the altar
  // Everything samples (y - speed * t): features climb as time runs. A slow twist spirals the tongues.
  float around = vAngle * 7.0 + y * 0.018 - uTime * 0.4;
  float tongues = bFbm(vec2(around, y * 0.08 - uTime * 1.9));
  float wisps = bFbm(vec2(around * 2.3 + 5.0, y * 0.22 - uTime * 3.6));
  // Energy pulses racing up the column into the sky.
  float surge = max(0.5 + 0.5 * sin(y * 0.03 - uTime * 2.4), 0.0);
  surge = surge * surge * surge * surge;
  // Full strength low down, a long fade as it climbs into the clouds.
  float fade = smoothstep(0.0, 0.004, vH) * (1.0 - smoothstep(0.18, 1.0, vH));
  // Once lit, the fire climbs the column: nothing above uReach, a bright surge at its head while it rises.
  fade *= 1.0 - smoothstep(uReach - 30.0, uReach, y);
  float head = uReach < uHeight ? exp(-pow((y - uReach + 18.0) / 14.0, 2.0)) * 0.45 : 0.0;
  float rim = clamp(vRim, 0.0, 1.0);
  float core = rim * sqrt(rim); // brightest facing the viewer, soft at the column's edges (no pow() on a maybe-negative)
  float v = (tongues * 0.7 + wisps * 0.42 + surge * 0.3 + head) * core * fade * uPulse;
  vec4 c = fireBands(v);
  if (c.a <= 0.0) discard;
  gl_FragColor = vec4(c.rgb * c.a, c.a);
}`;

// Camera-facing flame on the altar (billboarded in the vertex shader).
const FLAME_VERTEX = /* glsl */ `
uniform vec2 uSize;
uniform float uFlame;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 centre = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  centre.xy += (uv - vec2(0.5, 0.0)) * uSize * vec2(mix(1.0, uFlame, 0.6), uFlame);
  gl_Position = projectionMatrix * centre;
}`;
const FLAME_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uPulse;
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  vec2 p = vUv;
  float y = clamp(p.y, 0.0, 1.0);
  float n = bFbm(vec2(p.x * 4.0, y * 3.0 - uTime * 2.4));
  p.x += (n - 0.5) * 0.35 * y;
  // Teardrop: wide at the base, licking to a point.
  float width = mix(0.42, 0.02, pow(y, 0.8));
  float d = abs(p.x - 0.5) / max(width, 1e-3);
  float shape = (1.0 - smoothstep(0.55, 1.0, d + (1.0 - n) * 0.45 * y)) * (1.0 - smoothstep(0.7, 1.0, y + (n - 0.5) * 0.3));
  vec4 c = fireBands(shape * (1.0 - 0.5 * d) * uPulse);
  if (c.a <= 0.0) discard;
  gl_FragColor = vec4(c.rgb * c.a, c.a);
}`;

// Embers lifting off the fire and drifting on the wind; positions live entirely in the vertex shader.
const EMBER_VERTEX = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uEmberHeight;
uniform float uViewportHeight;
uniform float uEmbers;
varying float vLife;
varying float vShow;
void main() {
  float life = fract(uTime * (0.05 + aSeed.w * 0.05) + aSeed.z);
  vec3 p = vec3((aSeed.x - 0.5) * 3.5, life * uEmberHeight, (aSeed.y - 0.5) * 3.5);
  p.x += sin(uTime * 0.9 + aSeed.w * 30.0) * 1.5 * life + life * life * 14.0;
  p.z += cos(uTime * 0.7 + aSeed.x * 20.0) * 1.5 * life;
  vLife = life;
  vShow = step(aSeed.w, uEmbers); // a share of the embers: a few while it smoulders, all of them lit
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(0.35 * projectionMatrix[1][1] * 0.5 * uViewportHeight / max(-mv.z, 0.1), 6.0);
}`;
const EMBER_FRAGMENT = /* glsl */ `
varying float vLife;
varying float vShow;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.0, 0.5, d)) * (1.0 - vLife) * smoothstep(0.0, 0.08, vLife) * vShow;
  gl_FragColor = vec4(vec3(4.0, 1.2, 0.2) * a, a);
}`;

const COLUMN_HEIGHT = 520;
/** Seconds the fire takes to climb the whole column once lit (slow off the altar, then racing into the sky). */
const CLIMB = 3.2;
/** Smouldering: the altar's coals, a few embers, a little light. */
const SMOULDER = { flame: 0.3, pulse: 0.62, embers: 0.12, light: 0.06 };

const smooth = (a: number, b: number, t: number) => THREE.MathUtils.smoothstep(t, a, b);

/**
 * The Ritual Beacon of Agni on the far temple cliff: a living cel-shaded fire column climbing from the altar
 * into the sky, a flickering altar flame, rising embers and the fire light, all sharing one pulse so the
 * column, flame and light breathe together.
 *
 * It smoulders (`smoulder`: coals on the altar, no column) until Andhaka is crowned; `ignite` lights it there and then
 * (the altar flares, the fire races up the column into the sky, the embers and the light come up), `burn` at once.
 */
export class AgniBeacon {
  public readonly group = new THREE.Group();
  /** Meshes/points that should feed the selective bloom. */
  public readonly glowing: THREE.Object3D[] = [];
  private readonly uniforms = {
    uTime: { value: 0 },
    uPulse: { value: 1 },
    uViewportHeight: { value: 1080 },
    uFlame: { value: 1 },
    uEmbers: { value: 1 },
  };
  /** Metres of the column the fire has climbed. */
  private readonly reach = { value: COLUMN_HEIGHT };
  /** Lit or not, and the `update` time it was lit at (NaN: the next update; -Infinity: burning steadily). */
  private state: { lit: boolean; at: number } = { lit: true, at: -Infinity };
  private readonly light: THREE.PointLight | null;
  private readonly baseLight: number;

  /**
   * @param placeholder the exported 50 m placeholder cylinder, discarded in favour of the full column
   * @param altar world position of the fire at the column's foot
   * @param light the exported fire light, if any, to flicker in step with the fire
   */
  constructor(placeholder: THREE.Mesh | null, altar: THREE.Vector3, light: THREE.PointLight | null) {
    this.group.name = 'AgniBeacon';
    if (placeholder) {
      placeholder.removeFromParent();
      placeholder.geometry.dispose();
      (placeholder.material as THREE.Material).dispose();
    }

    // Open cylinder with its base at the altar, flaring slightly as it rises.
    const columnGeo = new THREE.CylinderGeometry(3.2, 1.9, COLUMN_HEIGHT, 32, 96, true).translate(0, COLUMN_HEIGHT / 2, 0);
    const column = new THREE.Mesh(columnGeo, new THREE.ShaderMaterial({
      name: 'AgniBeacon_Column',
      uniforms: { ...this.uniforms, uHeight: { value: COLUMN_HEIGHT }, uReach: this.reach },
      vertexShader: BEAM_VERTEX,
      fragmentShader: BEAM_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }));
    column.name = 'AgniBeacon_Column';
    column.position.copy(altar);
    column.renderOrder = 4;

    const flame = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0),
      new THREE.ShaderMaterial({
        name: 'AgniBeacon_Flame',
        uniforms: { ...this.uniforms, uSize: { value: new THREE.Vector2(6, 11) } },
        vertexShader: FLAME_VERTEX,
        fragmentShader: FLAME_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    flame.position.copy(altar);
    flame.frustumCulled = false;
    flame.renderOrder = 5;

    const count = 420;
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    emberGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const embers = new THREE.Points(emberGeo, new THREE.ShaderMaterial({
      name: 'AgniBeacon_Embers',
      uniforms: { ...this.uniforms, uEmberHeight: { value: 90 } },
      vertexShader: EMBER_VERTEX,
      fragmentShader: EMBER_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    embers.position.copy(altar);
    embers.frustumCulled = false;
    embers.renderOrder = 5;

    this.group.add(column, flame, embers);
    this.glowing.push(column, flame, embers);
    this.light = light;
    this.baseLight = light?.intensity ?? 0;
  }

  /** Coals only: no column, a low red glow on the altar, a few embers. */
  public smoulder(): void {
    this.state = { lit: false, at: -Infinity };
  }

  /** Lights it now: the altar flares and the fire climbs the column into the sky. */
  public ignite(): void {
    if (!this.state.lit) this.state = { lit: true, at: NaN };
  }

  /** Burning steadily, at once (no ignition). */
  public burn(): void {
    this.state = { lit: true, at: -Infinity };
  }

  public get lit(): boolean {
    return this.state.lit;
  }

  public update(time: number, viewportHeight: number): void {
    if (Number.isNaN(this.state.at)) this.state.at = time;
    // Layered sines: a slow breath, a fire-like flutter and occasional surges.
    const breath = 0.85 + 0.15 * Math.sin(time * 1.3);
    const flutter = 0.9 + 0.1 * Math.sin(time * 13.7) * Math.sin(time * 7.1 + 1.3);
    const surge = 1 + 0.35 * Math.max(0, Math.sin(time * 0.37) * Math.sin(time * 2.9));
    let pulse = breath * flutter * surge;
    let flame = 1;
    let embers = 1;
    let light = 1;
    if (!this.state.lit) {
      this.reach.value = 0;
      pulse *= SMOULDER.pulse;
      flame = SMOULDER.flame;
      embers = SMOULDER.embers;
      light = SMOULDER.light;
    } else {
      // Since it was lit: the altar flares (a burst taller than its steady flame) and settles; the fire climbs the
      // column; the embers and the light come up with it.
      const s = time - this.state.at;
      const flare = smooth(0, 0.3, s) * (1 - smooth(0.5, 2.2, s));
      this.reach.value = s >= CLIMB ? COLUMN_HEIGHT : COLUMN_HEIGHT * Math.pow(s / CLIMB, 1.8);
      flame = SMOULDER.flame + (1 - SMOULDER.flame) * smooth(0, 0.45, s) + 0.75 * flare;
      pulse *= SMOULDER.pulse + (1 - SMOULDER.pulse) * smooth(0, 0.5, s) + 0.7 * flare;
      embers = SMOULDER.embers + (1 - SMOULDER.embers) * smooth(0.1, 1.4, s);
      light = SMOULDER.light + (1 - SMOULDER.light) * smooth(0, 0.4, s) + 1.4 * flare;
    }
    this.uniforms.uTime.value = time;
    this.uniforms.uPulse.value = pulse;
    this.uniforms.uFlame.value = flame;
    this.uniforms.uEmbers.value = embers;
    this.uniforms.uViewportHeight.value = viewportHeight;
    if (this.light) this.light.intensity = this.baseLight * pulse * light;
  }
}

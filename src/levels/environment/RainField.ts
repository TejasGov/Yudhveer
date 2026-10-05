import * as THREE from 'three';

/**
 * Rain as thin, slanted streaks in one draw call. Every drop is a quad whose head and tail are computed in the vertex
 * shader from a fixed seed, the clock and the wind: it falls through a box that travels with the camera and wraps
 * round it, so nothing is uploaded per frame. Two populations share the buffer: a near box (fine streaks the camera
 * moves through) and a far box set out ahead of the camera (longer, wider streaks) that gives wide shots their
 * curtain of rain without crowding close-ups. A streak is never thinner than about a pixel; what a sub-pixel streak
 * would have covered fades its alpha instead, so the far rain reads as haze rather than shimmer.
 */
export interface RainOptions {
  /** Drops in the near box and in the far one. */
  near: number;
  far: number;
}

/** Per-viewer density: `full`, `low` (a third of the drops) or `off`. */
export type RainLevel = 'full' | 'low' | 'off';

const NEAR_EXTENT = new THREE.Vector3(26, 16, 26);
const FAR_EXTENT = new THREE.Vector3(110, 46, 110);

const VERTEX = /* glsl */ `
attribute vec4 aSeed;   // xyz: position in the box (0..1); w: per-drop variety (0..1)
attribute vec3 aCorner; // x: -1 / 1 across the streak; y: 0 (tail) / 1 (head); z: 1 for the far population
uniform float uTime;
uniform vec3 uNearCenter;
uniform vec3 uFarCenter;
uniform vec3 uNearExtent;
uniform vec3 uFarExtent;
uniform vec2 uDrift;      // accumulated wind offset (m)
uniform vec2 uWind;       // current wind (m/s), slants the streaks
uniform float uFall;      // fall speed (m/s)
uniform float uPixel;     // 2 / (projectionMatrix[1][1] * viewport height): metres per pixel at 1 m
varying float vAlpha;
varying float vAlong;

void main() {
  bool far = aCorner.z > 0.5;
  vec3 extent = far ? uFarExtent : uNearExtent;
  vec3 center = far ? uFarCenter : uNearCenter;
  float v = aSeed.w;
  float speed = uFall * mix(0.85, 1.2, v);
  vec2 drift = uDrift * mix(0.9, 1.1, fract(v * 13.7));
  vec3 p = aSeed.xyz * extent;
  p.y -= uTime * speed;
  p.xz += drift;
  vec3 origin = center - extent * 0.5;
  p = origin + mod(p - origin, extent);

  // A streak is the drop's path over a short exposure: longer in the far box so it reads at a distance.
  vec3 vel = vec3(uWind.x, -speed, uWind.y);
  float len = (far ? 0.11 : 0.045) * mix(0.7, 1.3, fract(v * 7.31));
  vec3 tail = p - vel * len;
  vec4 headV = viewMatrix * vec4(p, 1.0);
  vec4 tailV = viewMatrix * vec4(tail, 1.0);
  vec2 dir = headV.xy - tailV.xy;
  float dl = length(dir);
  dir = dl > 1e-5 ? dir / dl : vec2(0.0, 1.0);
  vec2 side = vec2(-dir.y, dir.x);
  vec4 mv = mix(tailV, headV, aCorner.y);
  float depth = max(-mv.z, 0.05);
  float width = (far ? 0.03 : 0.011) * mix(0.7, 1.25, fract(v * 3.17));
  float minWidth = uPixel * depth * 1.1;
  float drawn = max(width, minWidth);
  mv.xy += side * aCorner.x * drawn * 0.5;
  gl_Position = projectionMatrix * mv;

  // Fades: right at the lens, towards the box walls (so the wrap is never seen), and with distance.
  vec3 q = abs(p - center) / extent;
  float edge = 1.0 - smoothstep(0.36, 0.5, max(q.x, max(q.y, q.z)));
  float nearFade = smoothstep(far ? 6.0 : 1.4, far ? 14.0 : 3.2, depth);
  float distFade = far ? 1.0 - smoothstep(40.0, 75.0, depth) : 1.0 - smoothstep(10.0, 13.0, depth);
  float base = far ? 0.27 : 0.32;
  vAlpha = base * mix(0.45, 1.0, fract(v * 5.9)) * edge * nearFade * distFade * (width / drawn);
  vAlong = aCorner.y;
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uFlash;
varying float vAlpha;
varying float vAlong;
void main() {
  // Brightest at the head, gone at the tail.
  float a = vAlpha * vAlong * (1.0 + uFlash * 1.5);
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor * (1.0 + uFlash * 2.5), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class RainField {
  public readonly mesh: THREE.Mesh;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly geometry: THREE.BufferGeometry;
  private readonly counts: { near: number; far: number };
  private readonly forward = new THREE.Vector3();
  private clock = 0;
  private gustPhase = Math.random() * 100;

  constructor(opts: RainOptions) {
    this.counts = { near: opts.near, far: opts.far };
    const total = opts.near + opts.far;
    // Near and far drops are interleaved, so any prefix of the buffer (a lower density) keeps the same mix.
    const seeds = new Float32Array(total * 4 * 4);
    const corners = new Float32Array(total * 4 * 3);
    const index = new Uint32Array(total * 6);
    const farEvery = opts.far > 0 ? (opts.near + opts.far) / opts.far : Infinity;
    let farMade = 0;
    for (let i = 0; i < total; i++) {
      const far = farMade < opts.far && i + 1 >= (farMade + 1) * farEvery - 0.5;
      if (far) farMade++;
      const s = [Math.random(), Math.random(), Math.random(), Math.random()];
      for (let c = 0; c < 4; c++) {
        const k = i * 4 + c;
        seeds.set(s, k * 4);
        corners.set([c & 1 ? 1 : -1, c >> 1, far ? 1 : 0], k * 3);
      }
      index.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    this.geometry.setAttribute('aCorner', new THREE.BufferAttribute(corners, 3));
    // Positions come from the shader; this attribute only sizes the draw.
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 4 * 3), 3));
    this.geometry.setIndex(new THREE.BufferAttribute(index, 1));

    this.uniforms = {
      uTime: { value: 0 },
      uNearCenter: { value: new THREE.Vector3() },
      uFarCenter: { value: new THREE.Vector3() },
      uNearExtent: { value: NEAR_EXTENT.clone() },
      uFarExtent: { value: FAR_EXTENT.clone() },
      uDrift: { value: new THREE.Vector2() },
      uWind: { value: new THREE.Vector2(2.6, 1.1) },
      uFall: { value: 10.5 },
      uPixel: { value: 0.002 },
      uColor: { value: new THREE.Color(0.58, 0.64, 0.72) },
      uFlash: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      name: 'RainField',
      uniforms: this.uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.name = 'Rain';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
  }

  /** Thins the rain (a prefix of the drops) or stops drawing it. */
  public setLevel(level: RainLevel): void {
    const total = this.counts.near + this.counts.far;
    this.mesh.visible = level !== 'off';
    this.geometry.setDrawRange(0, Math.round((level === 'low' ? total / 3 : total)) * 6);
  }

  /**
   * `dt` is game time (0 while paused: the rain hangs), `flash` the lightning (0..1). The wind gusts: it swings in
   * strength and a little in direction, and the drift it carries the drops by is integrated here.
   */
  public update(dt: number, camera: THREE.PerspectiveCamera, viewportHeight: number, flash: number): void {
    this.clock += dt;
    const u = this.uniforms;
    const t = this.clock + this.gustPhase;
    const gust = 1 + 0.45 * Math.sin(t * 0.31) * Math.sin(t * 0.17 + 1.3) + 0.2 * Math.sin(t * 1.1);
    const angle = 0.4 + 0.25 * Math.sin(t * 0.07);
    const strength = 2.6 * gust;
    (u.uWind.value as THREE.Vector2).set(Math.cos(angle) * strength, Math.sin(angle) * strength);
    (u.uDrift.value as THREE.Vector2).addScaledVector(u.uWind.value as THREE.Vector2, dt);
    u.uTime.value = this.clock;
    camera.getWorldDirection(this.forward);
    (u.uNearCenter.value as THREE.Vector3).copy(camera.position).addScaledVector(this.forward, NEAR_EXTENT.x * 0.22);
    (u.uFarCenter.value as THREE.Vector3).copy(camera.position).addScaledVector(this.forward, FAR_EXTENT.x * 0.42);
    u.uPixel.value = 2 / (camera.projectionMatrix.elements[5] * Math.max(1, viewportHeight));
    u.uFlash.value = flash;
  }

  /** The wind now (m/s, x and z), for anything else the gusts should move. */
  public get wind(): THREE.Vector2 {
    return this.uniforms.uWind.value as THREE.Vector2;
  }
}

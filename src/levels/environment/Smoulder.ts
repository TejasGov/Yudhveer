import * as THREE from 'three';

/*
 * What a burning roof gives the night (the village after the raid, docs/STORY.md): a column of smoke leaning off on
 * the wind, lit orange from beneath by the fire; sparks that climb out of it and drift across the courtyard, dying;
 * and ash coming down over everything. Cheap: 28 smoke puffs (one instanced draw of camera-facing quads) and 220
 * points (one draw for sparks and ash together), moved on the CPU. `amount` (0..1) is how much of it there is; at 0
 * nothing is drawn.
 */

/** Defaults: smoke puffs, motes, and of the motes how many are sparks (the rest ash). See `SmoulderOptions`. */
const DEFAULT_PUFFS = 28;
const DEFAULT_MOTES = 220;
const DEFAULT_SPARKS = 90;

export interface SmoulderOptions {
  /** Smoke puffs in the column (28). */
  puffs?: number;
  /** Sparks and ash flakes in all (220), and how many of them are sparks (90): a second fire's sparks without ash. */
  motes?: number;
  sparks?: number;
  /** Scales the puffs (1): thicker smoke. */
  puffSize?: number;
}

const SMOKE_VERTEX = /* glsl */ `
attribute vec4 aPuff; // xyz centre, w size
attribute vec2 aLife; // age 0..1, seed
varying vec2 vUv;
varying vec2 vLife;
varying float vLow;
void main() {
  vUv = uv;
  vLife = aLife;
  // A camera-facing quad: offsets along the view's right and up.
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float a = aLife.y * 6.2831853 + aLife.x * 1.4;
  vec2 p = mat2(cos(a), -sin(a), sin(a), cos(a)) * position.xy;
  vec3 world = aPuff.xyz + (right * p.x + up * p.y) * aPuff.w;
  vLow = aLife.x;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const SMOKE_FRAGMENT = /* glsl */ `
uniform float uAmount;
uniform vec3 uLit;
uniform vec3 uDark;
varying vec2 vUv;
varying vec2 vLife;
varying float vLow;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec2 c = vUv - 0.5;
  float d = length(c) * 2.0;
  float n = noise(vUv * 3.5 + vLife.y * 17.0) * 0.6 + noise(vUv * 7.0 - vLife.y * 9.0) * 0.4;
  // A soft, lumpy puff, cut into two flat bands (the cel look).
  float body = smoothstep(1.0, 0.35, d + (n - 0.5) * 0.7);
  float band = body > 0.55 ? 1.0 : body > 0.18 ? 0.6 : 0.0;
  // Thickest young, thinning as it climbs and spreads.
  float fade = smoothstep(0.0, 0.12, vLife.x) * (1.0 - smoothstep(0.55, 1.0, vLife.x));
  float alpha = band * fade * 0.72 * uAmount;
  if (alpha < 0.01) discard;
  // Lit by the fire from beneath while low; grey-black above.
  vec3 col = mix(uLit, uDark, smoothstep(0.0, 0.3, vLow));
  gl_FragColor = vec4(col, alpha);
}`;

const MOTE_VERTEX = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;
varying vec3 vColor;
varying float vAlpha;
uniform float uScale;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  // Flakes and sparks stay specks however near the lens they drift.
  gl_PointSize = clamp(aSize * uScale / -mv.z, 1.5, 5.0);
  gl_Position = projectionMatrix * mv;
}`;

const MOTE_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  gl_FragColor = vec4(vColor, vAlpha);
}`;

interface Puff { pos: THREE.Vector3; vel: THREE.Vector3; age: number; life: number; size: number; seed: number }
interface Mote { pos: THREE.Vector3; vel: THREE.Vector3; age: number; life: number; spark: boolean; size: number; phase: number }

export class Smoulder {
  public readonly group = new THREE.Group();
  /** 0 nothing .. 1 the fire's full smoke, sparks and ash. */
  public amount = 0;
  private readonly puffs: Puff[] = [];
  private readonly motes: Mote[] = [];
  private readonly smoke: THREE.Mesh;
  private readonly smokeMaterial: THREE.ShaderMaterial;
  private readonly aPuff: THREE.InstancedBufferAttribute;
  private readonly aLife: THREE.InstancedBufferAttribute;
  private readonly points: THREE.Points;
  private readonly moteMaterial: THREE.ShaderMaterial;
  private readonly wind: THREE.Vector3;
  private readonly nPuffs: number;
  private readonly nMotes: number;
  private readonly nSparks: number;
  private readonly puffSize: number;

  /**
   * @param source where the fire burns (the smoke's root), `spread` metres across.
   * @param area the courtyard's half-size (sparks drift and ash falls within it).
   */
  constructor(private readonly source: THREE.Vector3, private readonly spread: number, private readonly area: number, wind: THREE.Vector3, options: SmoulderOptions = {}) {
    this.wind = wind.clone();
    this.nPuffs = options.puffs ?? DEFAULT_PUFFS;
    this.nMotes = options.motes ?? DEFAULT_MOTES;
    this.nSparks = Math.min(this.nMotes, options.sparks ?? DEFAULT_SPARKS);
    this.puffSize = options.puffSize ?? 1;
    const PUFFS = this.nPuffs;
    const MOTES = this.nMotes;
    const SPARKS = this.nSparks;
    this.group.name = 'Smoulder';

    const quad = new THREE.InstancedBufferGeometry();
    const plane = new THREE.PlaneGeometry(1, 1);
    quad.index = plane.index;
    quad.setAttribute('position', plane.getAttribute('position'));
    quad.setAttribute('uv', plane.getAttribute('uv'));
    this.aPuff = new THREE.InstancedBufferAttribute(new Float32Array(PUFFS * 4), 4);
    this.aLife = new THREE.InstancedBufferAttribute(new Float32Array(PUFFS * 2), 2);
    this.aPuff.setUsage(THREE.DynamicDrawUsage);
    this.aLife.setUsage(THREE.DynamicDrawUsage);
    quad.setAttribute('aPuff', this.aPuff);
    quad.setAttribute('aLife', this.aLife);
    quad.instanceCount = PUFFS;
    this.smokeMaterial = new THREE.ShaderMaterial({
      name: 'Smoke',
      uniforms: {
        uAmount: { value: 0 },
        uLit: { value: new THREE.Color(0.32, 0.11, 0.04) },
        uDark: { value: new THREE.Color(0.035, 0.03, 0.04) },
      },
      vertexShader: SMOKE_VERTEX,
      fragmentShader: SMOKE_FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    this.smoke = new THREE.Mesh(quad, this.smokeMaterial);
    this.smoke.frustumCulled = false;
    this.smoke.renderOrder = 5;
    this.group.add(this.smoke);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(MOTES), 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(MOTES), 1).setUsage(THREE.DynamicDrawUsage));
    this.moteMaterial = new THREE.ShaderMaterial({
      name: 'Motes',
      uniforms: { uScale: { value: 600 } },
      vertexShader: MOTE_VERTEX,
      fragmentShader: MOTE_FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.moteMaterial);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    this.group.add(this.points);

    for (let i = 0; i < PUFFS; i++) this.puffs.push(this.newPuff(Math.random()));
    for (let i = 0; i < MOTES; i++) this.motes.push(this.newMote(i < SPARKS, Math.random()));
    this.group.visible = false;
  }

  /** The sparks, for the bloom. */
  public get glowing(): THREE.Object3D {
    return this.points;
  }

  private newPuff(age = 0): Puff {
    const r = this.spread * 0.5;
    return {
      pos: this.source.clone().add(new THREE.Vector3((Math.random() - 0.5) * r, Math.random() * 0.3, (Math.random() - 0.5) * r)),
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.25, 1.1 + Math.random() * 0.5, (Math.random() - 0.5) * 0.25),
      age,
      life: 7 + Math.random() * 4,
      size: (1.1 + Math.random() * 0.7) * this.puffSize,
      seed: Math.random(),
    };
  }

  private newMote(spark: boolean, age = 0): Mote {
    const a = this.area;
    const pos = spark
      ? this.source.clone().add(new THREE.Vector3((Math.random() - 0.5) * this.spread, Math.random() * 0.8, (Math.random() - 0.5) * this.spread))
      : new THREE.Vector3((Math.random() * 2 - 1) * a, 3 + Math.random() * 6, (Math.random() * 2 - 1) * a);
    return {
      pos,
      vel: spark
        ? new THREE.Vector3((Math.random() - 0.5) * 0.8, 1.2 + Math.random() * 1.8, (Math.random() - 0.5) * 0.8)
        : new THREE.Vector3(0, -0.25 - Math.random() * 0.25, 0),
      age,
      life: spark ? 2.5 + Math.random() * 3.5 : 9 + Math.random() * 8,
      spark,
      size: spark ? 0.035 + Math.random() * 0.03 : 0.03 + Math.random() * 0.035,
      phase: Math.random() * 6.28,
    };
  }

  /** Every particle back to a fresh start (a retry). */
  public reset(): void {
    const PUFFS = this.nPuffs;
    const MOTES = this.nMotes;
    const SPARKS = this.nSparks;
    this.amount = 0;
    this.group.visible = false;
    for (let i = 0; i < PUFFS; i++) this.puffs[i] = this.newPuff(Math.random());
    for (let i = 0; i < MOTES; i++) this.motes[i] = this.newMote(i < SPARKS, Math.random());
  }

  public update(dt: number, camera: THREE.Camera): void {
    const PUFFS = this.nPuffs;
    const MOTES = this.nMotes;
    const on = this.amount > 0.001;
    this.group.visible = on;
    if (!on || dt <= 0) return;
    const step = Math.min(dt, 0.05);
    this.smokeMaterial.uniforms.uAmount.value = this.amount;
    for (let i = 0; i < PUFFS; i++) {
      const p = this.puffs[i];
      p.age += step / p.life;
      if (p.age >= 1) {
        this.puffs[i] = this.newPuff();
        continue;
      }
      // Rises, slows, and leans off on the wind as it climbs.
      p.vel.y = Math.max(0.25, p.vel.y - step * 0.12);
      p.pos.addScaledVector(p.vel, step).addScaledVector(this.wind, step * Math.min(1, p.age * 2.5));
      const size = p.size * (1 + p.age * 3.2);
      this.aPuff.setXYZW(i, p.pos.x, p.pos.y, p.pos.z, size);
      this.aLife.setXY(i, p.age, p.seed);
    }
    this.aPuff.needsUpdate = true;
    this.aLife.needsUpdate = true;

    const geo = this.points.geometry;
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const size = geo.getAttribute('aSize') as THREE.BufferAttribute;
    const color = geo.getAttribute('aColor') as THREE.BufferAttribute;
    const alpha = geo.getAttribute('aAlpha') as THREE.BufferAttribute;
    for (let i = 0; i < MOTES; i++) {
      const m = this.motes[i];
      m.age += step / m.life;
      if (m.age >= 1 || (!m.spark && m.pos.y < 0)) {
        this.motes[i] = this.newMote(m.spark);
        continue;
      }
      m.phase += step * (m.spark ? 3.1 : 1.7);
      if (m.spark) {
        // Climb, slow, and drift off on the wind, wandering.
        m.vel.y = Math.max(0.15, m.vel.y - step * 0.6);
        m.pos.addScaledVector(m.vel, step).addScaledVector(this.wind, step * 1.6);
        m.pos.x += Math.sin(m.phase) * step * 0.4;
        m.pos.z += Math.cos(m.phase * 0.8) * step * 0.4;
      } else {
        // Ash: falling slowly, fluttering, carried a little on the wind.
        m.pos.addScaledVector(m.vel, step).addScaledVector(this.wind, step * 0.6);
        m.pos.x += Math.sin(m.phase) * step * 0.35;
        m.pos.z += Math.sin(m.phase * 1.3 + 1.0) * step * 0.25;
      }
      pos.setXYZ(i, m.pos.x, m.pos.y, m.pos.z);
      size.setX(i, m.size);
      const k = m.spark ? Math.pow(1 - m.age, 1.4) : Math.min(1, m.age * 6) * (1 - Math.pow(m.age, 4));
      if (m.spark) {
        // White-hot to deep red as it cools (HDR: the young ones bloom).
        const heat = 1 - m.age;
        color.setXYZ(i, 2.6 + heat * 2.0, 0.55 + heat * 1.4, 0.08 + heat * 0.3);
        alpha.setX(i, k * this.amount * (0.75 + 0.25 * Math.sin(m.phase * 4.0)));
      } else {
        color.setXYZ(i, 0.2, 0.19, 0.19);
        alpha.setX(i, k * this.amount * 0.85);
      }
    }
    pos.needsUpdate = true;
    size.needsUpdate = true;
    color.needsUpdate = true;
    alpha.needsUpdate = true;
    // Sizes in metres: scale by the viewport's height and lens.
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.isPerspectiveCamera) {
      const h = (cam.userData.viewportHeight as number | undefined) ?? window.innerHeight * Math.min(window.devicePixelRatio, 2);
      this.moteMaterial.uniforms.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    }
  }

  public dispose(): void {
    this.smoke.geometry.dispose();
    this.smokeMaterial.dispose();
    this.points.geometry.dispose();
    this.moteMaterial.dispose();
  }
}

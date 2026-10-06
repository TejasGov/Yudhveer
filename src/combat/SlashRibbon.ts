import * as THREE from 'three';
import type { Character } from '../entities/Character';

/*
 * A weapon's trail: a thin, bright arc that follows the blade's tip through a swing and is gone a moment after it (docs/STORY.md,
 * "Hit feel"). It used to be the whole blade swept through the air (hilt to tip, sixteen steps long, one flat colour), which
 * read as a great yellow fan; this is a narrow ribbon along the last stretch of the weapon only, drawn as:
 *
 * - a white-hot line riding the path of the tip, going over a short way into the weapon's tint across the ribbon's width, the
 *   tint thinning to nothing at the inner edge (a faint translucent body, never an opaque wedge);
 * - fading along its length with age, each point living a seventh of a second (a little longer for a staff or a mace, which
 *   are broader and heavier);
 * - added to the picture (light, not paint), in HDR, so the hot line is brighter than the bloom's threshold;
 * - shown only while the blade is really swinging: from just before an attack's strike windows (measured from the animation,
 *   `Character.hitWindows`) to just after, never through the wind-up or the recovery.
 *
 * Points are taken each simulation step and smoothed with a spline (a fast swing is a few centimetres of arc per step, and
 * straight segments between them would show as facets). The newest point is pulled onto the blade as it is drawn this frame
 * (a vertex-shader offset set in `onBeforeRender`), so the trail never runs ahead of the blade or leaves a gap behind its tip
 * when the picture is interpolated between two steps.
 */

/** Steps of trail kept (the newest first), and how finely each is smoothed. */
const MAX_SAMPLES = 16;
const SUB = 3;
const MAX_COLUMNS = (MAX_SAMPLES - 1) * SUB + 1;
/** A swing's trail starts this long before its first strike window and runs this long past the last (s). */
const LEAD = 0.06;
const TAIL = 0.05;
/** The tip moving less than this since the last point (m) adds none. */
const MIN_STEP2 = 0.005 * 0.005;

export type TrailKind = 'blade' | 'wood' | 'crush';

export interface TrailLook {
  /** Seconds a point of the trail lives. */
  life: number;
  /** How far in from the tip the ribbon's inner edge lies, as a share of the weapon's length (its breadth). */
  span: number;
  /** Brightness (HDR) of the white-hot line, and the opacity of the tinted body behind it. */
  heat: number;
  body: number;
  tint: THREE.Color;
}

const BASE: Record<TrailKind, { life: number; span: number; heat: number; body: number; hero: number; foe: number }> = {
  blade: { life: 0.13, span: 0.2, heat: 2.6, body: 0.85, hero: 0xffb347, foe: 0xff5a38 },
  wood: { life: 0.16, span: 0.26, heat: 2.0, body: 0.7, hero: 0xf0b866, foe: 0xe8804a },
  crush: { life: 0.17, span: 0.28, heat: 2.4, body: 0.9, hero: 0xff8a3a, foe: 0xff4a28 },
};
const LOOKS = new Map<string, TrailLook>();

/** The trail look for a weapon of `kind`: the hero's golden, an enemy's a hot red. Shared (never mutated). */
export function trailLook(kind: TrailKind, hero: boolean): TrailLook {
  const key = kind + (hero ? '+' : '-');
  let look = LOOKS.get(key);
  if (!look) {
    const b = BASE[kind];
    look = { life: b.life, span: b.span, heat: b.heat, body: b.body, tint: new THREE.Color(hero ? b.hero : b.foe) };
    LOOKS.set(key, look);
  }
  return look;
}

/** The look of `c`'s trail: by its weapon (the hero's `weapon.sound.impact`, an enemy's `impactSound`) and whose it is. */
export function trailLookOf(c: Character): TrailLook {
  const o = c as unknown as { weapon?: { sound?: { impact?: TrailKind } }; impactSound?: TrailKind };
  return trailLook(o.weapon?.sound?.impact ?? o.impactSound ?? 'blade', o.weapon !== undefined);
}

/** Whether `c`'s blade is in the swing of an attack now (its strike windows, a little either side). */
export function trailActive(c: Character): boolean {
  const sm = c.stateMachine;
  const state = sm.currentState;
  if (!state.startsWith('ATTACK')) return false;
  const t = sm.stateTime;
  for (const w of c.hitWindows(state)) if (t >= w.t0 - LEAD && t <= w.t1 + TAIL) return true;
  return false;
}

interface Sample {
  tip: THREE.Vector3;
  inner: THREE.Vector3;
  /** The ribbon's own clock (s) when it was taken. */
  t: number;
}

const VERTEX = /* glsl */ `
uniform vec3 uHeadTip;     // how far the newest point is from where the picture has the blade now (tip, inner)
uniform vec3 uHeadInner;
attribute float aPull;     // 1 at the newest point, falling to 0 a step back
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position + mix(uHeadTip, uHeadInner, uv.x) * aPull;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uTint;
uniform float uHeat;
uniform float uBody;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float age = clamp(vUv.y, 0.0, 1.0);
  float fade = pow(1.0 - age, 1.8);
  float edge = clamp(vUv.x, 0.0, 1.0);             // 0 on the tip's own path, 1 at the inner edge (a pow of a negative is NaN, and one NaN blacks the bloom out)
  float hot = exp(-edge * 10.0);                   // a thin white-hot line along the tip's path
  float body = pow(1.0 - edge, 1.5) * uBody;       // and the translucent tinted body behind it, thinning to nothing
  vec3 col = uTint * body * (0.6 + 0.4 * (1.0 - age)) + vec3(1.0, 0.95, 0.82) * hot * uHeat;
  gl_FragColor = vec4(col * fade * uOpacity, 1.0);
}`;

const _head = new THREE.Vector3();
const _hilt = new THREE.Vector3();
const _inner = new THREE.Vector3();

export class SlashRibbon {
  public mesh: THREE.Mesh;
  /**
   * Where the blade's tip and hilt are in the picture now (world, into the vectors): set by the owner. While the trail is
   * growing its newest point follows it, so the picture, interpolated between simulation steps, shows no gap or lead.
   */
  public live: ((tip: THREE.Vector3, hilt: THREE.Vector3) => void) | null = null;

  private readonly geometry = new THREE.BufferGeometry();
  private readonly positions = new Float32Array(MAX_COLUMNS * 2 * 3);
  private readonly uvs = new Float32Array(MAX_COLUMNS * 2 * 2);
  private readonly pulls = new Float32Array(MAX_COLUMNS * 2);
  private readonly material: THREE.ShaderMaterial;
  /** Newest first. */
  private samples: Sample[] = [];
  private spare: Sample[] = [];
  private time = 0;
  private growing = false;
  private look: TrailLook = trailLook('blade', true);

  /** `color`: the tint until a look is given (`update`); `opacity`: overall strength. */
  constructor(color = 0xffd15c, opacity = 0.75) {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aPull', new THREE.BufferAttribute(this.pulls, 1).setUsage(THREE.DynamicDrawUsage));
    const index: number[] = [];
    for (let c = 0; c < MAX_COLUMNS - 1; c++) {
      const v = c * 2;
      index.push(v, v + 1, v + 2, v + 2, v + 1, v + 3);
    }
    this.geometry.setIndex(index);
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.ShaderMaterial({
      name: 'SlashTrail',
      uniforms: {
        uTint: { value: new THREE.Color(color) },
        uHeat: { value: this.look.heat },
        uBody: { value: this.look.body },
        uOpacity: { value: opacity / 0.75 },
        uHeadTip: { value: new THREE.Vector3() },
        uHeadInner: { value: new THREE.Vector3() },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'SlashTrail';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    this.mesh.visible = false;
    this.mesh.onBeforeRender = () => this.pullHead();
  }

  /**
   * One simulation step. `tip` and `hilt`: the blade's ends (world); `active`: the blade is in a swing (`trailActive`), so the
   * trail grows, and otherwise only fades; `look`: what it is made of (`trailLookOf`).
   */
  public update(tip: THREE.Vector3, hilt: THREE.Vector3, active: boolean, dt = 1 / 60, look?: TrailLook): void {
    this.time += dt;
    if (look && look !== this.look) this.setLook(look);
    this.growing = active;
    if (active) {
      const inner = _inner.lerpVectors(tip, hilt, this.look.span);
      const last = this.samples[0];
      if (!last || last.tip.distanceToSquared(tip) > MIN_STEP2) {
        const s = this.spare.pop() ?? { tip: new THREE.Vector3(), inner: new THREE.Vector3(), t: 0 };
        s.tip.copy(tip);
        s.inner.copy(inner);
        s.t = this.time;
        this.samples.unshift(s);
        if (this.samples.length > MAX_SAMPLES) this.spare.push(this.samples.pop()!);
      }
    }
    // Points past their life are gone.
    while (this.samples.length > 0 && this.time - this.samples[this.samples.length - 1].t >= this.look.life) {
      this.spare.push(this.samples.pop()!);
    }
    this.rebuild();
  }

  /** Drops the trail at once (a cutscene starts: no AI step will fade it, and it would hang in the air). */
  public clear(): void {
    while (this.samples.length) this.spare.push(this.samples.pop()!);
    this.growing = false;
    this.rebuild();
  }

  public setColor(color: number): void {
    this.material.uniforms.uTint.value.setHex(color);
  }

  private setLook(look: TrailLook): void {
    this.look = look;
    this.material.uniforms.uTint.value.copy(look.tint);
    this.material.uniforms.uHeat.value = look.heat;
    this.material.uniforms.uBody.value = look.body;
  }

  /** Smooths the points into columns of two vertices (the tip's path and the inner edge) and sets what is drawn. */
  private rebuild(): void {
    const n = this.samples.length;
    if (n < 2) {
      this.mesh.visible = false;
      this.geometry.setDrawRange(0, 0);
      return;
    }
    const pos = this.positions;
    const uv = this.uvs;
    const pull = this.pulls;
    const life = this.look.life;
    let col = 0;
    const put = (rail: 0 | 1, c: number, x: number, y: number, z: number, age: number, p: number): void => {
      const v = c * 2 + rail;
      pos[v * 3] = x;
      pos[v * 3 + 1] = y;
      pos[v * 3 + 2] = z;
      uv[v * 2] = rail;
      uv[v * 2 + 1] = age;
      pull[v] = p;
    };
    for (let i = 0; i < n - 1; i++) {
      const a = this.samples[Math.max(i - 1, 0)];
      const b = this.samples[i];
      const c = this.samples[i + 1];
      const d = this.samples[Math.min(i + 2, n - 1)];
      const ageB = (this.time - b.t) / life;
      const ageC = (this.time - c.t) / life;
      for (let k = 0; k < SUB; k++) {
        const u = k / SUB;
        const age = ageB + (ageC - ageB) * u;
        // Only the first segment is pulled onto the live blade, falling off toward its far end.
        const p = i === 0 ? 1 - u : 0;
        spline(a.tip, b.tip, c.tip, d.tip, u, _head);
        put(0, col, _head.x, _head.y, _head.z, age, p);
        spline(a.inner, b.inner, c.inner, d.inner, u, _head);
        put(1, col, _head.x, _head.y, _head.z, age, p);
        col++;
      }
    }
    const last = this.samples[n - 1];
    const ageLast = (this.time - last.t) / life;
    put(0, col, last.tip.x, last.tip.y, last.tip.z, ageLast, 0);
    put(1, col, last.inner.x, last.inner.y, last.inner.z, ageLast, 0);
    col++;
    this.geometry.setDrawRange(0, (col - 1) * 6);
    for (const name of ['position', 'uv', 'aPull']) {
      const attr = this.geometry.getAttribute(name) as THREE.BufferAttribute;
      attr.clearUpdateRanges();
      attr.addUpdateRange(0, col * 2 * attr.itemSize);
      attr.needsUpdate = true;
    }
    this.mesh.visible = true;
  }

  /** Just before it is drawn: how far the newest point is from where the blade is in this frame's interpolated pose. */
  private pullHead(): void {
    const u = this.material.uniforms;
    const newest = this.samples[0];
    if (!this.growing || !this.live || !newest) {
      (u.uHeadTip.value as THREE.Vector3).set(0, 0, 0);
      (u.uHeadInner.value as THREE.Vector3).set(0, 0, 0);
      return;
    }
    this.live(_head, _hilt);
    _inner.lerpVectors(_head, _hilt, this.look.span);
    (u.uHeadTip.value as THREE.Vector3).subVectors(_head, newest.tip);
    (u.uHeadInner.value as THREE.Vector3).subVectors(_inner, newest.inner);
    this.material.uniformsNeedUpdate = true;
  }
}

/** Catmull-Rom through `b` and `c` (`a` before, `d` after) at `u` in 0..1, into `out`. */
function spline(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, u: number, out: THREE.Vector3): void {
  const u2 = u * u;
  const u3 = u2 * u;
  out.set(
    0.5 * (2 * b.x + (c.x - a.x) * u + (2 * a.x - 5 * b.x + 4 * c.x - d.x) * u2 + (3 * b.x - a.x - 3 * c.x + d.x) * u3),
    0.5 * (2 * b.y + (c.y - a.y) * u + (2 * a.y - 5 * b.y + 4 * c.y - d.y) * u2 + (3 * b.y - a.y - 3 * c.y + d.y) * u3),
    0.5 * (2 * b.z + (c.z - a.z) * u + (2 * a.z - 5 * b.z + 4 * c.z - d.z) * u2 + (3 * b.z - a.z - 3 * c.z + d.z) * u3),
  );
}

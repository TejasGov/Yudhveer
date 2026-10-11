import * as THREE from 'three';
import { createToonRamp, patchShader } from '../levels/environment/ToonRelight';

/*
 * The island demoness's chain: a light Verlet rope from her hand to the axe's haft, drawn as instanced iron links.
 * The ends are pinned to the hand and the haft; the 26 nodes between carry their own inertia and gravity, so the chain
 * bows behind a fast swing, hangs while it is drawn back, snaps straight when the strike reaches full stretch and slaps
 * after the axe on its way home. Its length is the distance between the ends plus a slack the boss sets per phase
 * (`step`), and its constraints only ever pull (a chain does not push): slack bunches and droops, it never stretches.
 *
 * All of it lives in the boss's local space and is stepped with the simulation. `draw(alpha)` places the links on the
 * rope between the last two steps (the boss calls it from its render hook), along the polyline by arc length, every
 * other link turned a quarter about the chain. Links glow hotter toward the blade (`heat`): an instanced attribute
 * read as emission by a patched toon material. Nothing is allocated after construction.
 */

const NODES = 28;
const PITCH = 0.056;
export const MAX_LINKS = 128;
const ITERATIONS = 14;
const DAMPING = 0.986;
const GRAVITY = -9.8;
/** Closer than this the axe is in her hand and there is no chain to see. */
export const HELD_DISTANCE = 0.08;
/** The floor near her (boss-local y): a chain lying in the dust stays on it. */
const FLOOR = 0.03;

const _v = new THREE.Vector3();
const _t = new THREE.Vector3();
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1.45, 1);
const _m = new THREE.Matrix4();
const _quarter = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
const UP = new THREE.Vector3(0, 1, 0);

export class AxeChain {
  public readonly mesh: THREE.InstancedMesh;
  /** How hot the blade end glows (0..1); the boss sets it from the attack. */
  public heat = 0;
  private readonly x = new Float32Array(NODES * 3);
  private readonly o = new Float32Array(NODES * 3);
  private readonly prev = new Float32Array(NODES * 3);
  private readonly curr = new Float32Array(NODES * 3);
  private readonly drawn = new Float32Array(NODES * 3);
  private readonly cum = new Float32Array(NODES);
  private readonly heatAttr: THREE.InstancedBufferAttribute;
  private length = 0;
  private lengthPrev = 0;
  private out = false;
  private outPrev = false;
  private heatPrev = 0;
  private heatCurr = 0;
  /** How straight the chain is now (chord / length): 1 at full stretch. */
  public stretch = 0;

  constructor() {
    const geometry = new THREE.TorusGeometry(0.034, 0.0095, 5, 10);
    this.heatAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_LINKS), 1);
    this.heatAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aHeat', this.heatAttr);
    const material = new THREE.MeshToonMaterial({ name: 'AxeChain', color: 0x5a4e46, gradientMap: createToonRamp([0.22, 0.5, 0.82, 1]) });
    patchShader(material, 'axeChainHeat', (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aHeat;\nvarying float vHeat;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeat = aHeat;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vHeat;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    float hh = clamp(vHeat, 0.0, 1.0);
    vec3 heatCol = mix(vec3(0.5, 0.035, 0.0), vec3(1.0, 0.32, 0.04), smoothstep(0.0, 0.6, hh));
    heatCol = mix(heatCol, vec3(1.0, 0.62, 0.3), smoothstep(0.85, 1.0, hh));
    totalEmissiveRadiance += heatCol * hh * 1.9;
  }`);
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, MAX_LINKS);
    this.mesh.name = 'AxeChain';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
  }

  /** The chain is in her hand (nothing to draw); the nodes wait there. */
  public stow(hand: THREE.Vector3): void {
    for (let i = 0; i < NODES; i++) {
      hand.toArray(this.x, i * 3);
      hand.toArray(this.o, i * 3);
    }
    this.out = false;
    this.length = 0;
  }

  /**
   * One simulation step (boss-local): `hand` and `end` (the haft) pin the ends; `slack` is the share of extra chain
   * beyond the straight distance between them (0: taut).
   */
  public step(dt: number, hand: THREE.Vector3, end: THREE.Vector3, slack: number): void {
    this.prev.set(this.curr);
    this.lengthPrev = this.length;
    this.outPrev = this.out;
    this.heatPrev = this.heatCurr;
    this.heatCurr = this.heat;
    const chord = hand.distanceTo(end);
    if (chord < HELD_DISTANCE) {
      this.stow(hand);
      this.curr.set(this.x);
      this.stretch = 0;
      return;
    }
    const x = this.x;
    const o = this.o;
    if (!this.out) {
      // Paid out from the hand: laid along the straight line, at rest.
      for (let i = 0; i < NODES; i++) {
        _v.lerpVectors(hand, end, i / (NODES - 1)).toArray(x, i * 3);
        _v.toArray(o, i * 3);
      }
      this.out = true;
    }
    this.length = chord * (1 + Math.max(0, slack));
    const seg = this.length / (NODES - 1);
    const g = GRAVITY * dt * dt;
    for (let i = 1; i < NODES - 1; i++) {
      const k = i * 3;
      for (let c = 0; c < 3; c++) {
        const p = x[k + c];
        x[k + c] = p + (p - o[k + c]) * DAMPING + (c === 1 ? g : 0);
        o[k + c] = p;
      }
    }
    hand.toArray(x, 0);
    hand.toArray(o, 0);
    end.toArray(x, (NODES - 1) * 3);
    end.toArray(o, (NODES - 1) * 3);
    for (let it = 0; it < ITERATIONS; it++) {
      const forward = (it & 1) === 0;
      for (let j = 0; j < NODES - 1; j++) {
        const i = forward ? j : NODES - 2 - j;
        const a = i * 3, b = a + 3;
        const dx = x[b] - x[a], dy = x[b + 1] - x[a + 1], dz = x[b + 2] - x[a + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d <= seg || d < 1e-9) continue;
        const wa = i === 0 ? 0 : 1;
        const wb = i + 1 === NODES - 1 ? 0 : 1;
        const w = wa + wb;
        if (w === 0) continue;
        const k = (d - seg) / (d * w);
        x[a] += dx * k * wa; x[a + 1] += dy * k * wa; x[a + 2] += dz * k * wa;
        x[b] -= dx * k * wb; x[b + 1] -= dy * k * wb; x[b + 2] -= dz * k * wb;
      }
    }
    for (let i = 1; i < NODES - 1; i++) if (x[i * 3 + 1] < FLOOR) x[i * 3 + 1] = FLOOR;
    this.curr.set(x);
    this.stretch = chord / Math.max(1e-6, this.length);
  }

  /** Places the links on the rope `alpha` of the way from the last step to this one. */
  public draw(alpha: number): void {
    if (!this.out && !this.outPrev) {
      this.mesh.count = 0;
      return;
    }
    const a = this.outPrev && this.out ? alpha : 1;
    const r = this.drawn;
    const from = this.outPrev ? this.prev : this.curr;
    let total = 0;
    for (let i = 0; i < NODES * 3; i++) r[i] = from[i] + (this.curr[i] - from[i]) * a;
    this.cum[0] = 0;
    for (let i = 1; i < NODES; i++) {
      const k = i * 3;
      total += Math.hypot(r[k] - r[k - 3], r[k + 1] - r[k - 2], r[k + 2] - r[k - 1]);
      this.cum[i] = total;
    }
    const length = this.out ? this.lengthPrev + (this.length - this.lengthPrev) * a : 0;
    const count = this.out ? Math.min(MAX_LINKS, Math.ceil(Math.max(length, total) / PITCH)) : 0;
    const heat = this.heatPrev + (this.heatCurr - this.heatPrev) * a;
    const matrices = this.mesh.instanceMatrix.array as Float32Array;
    const heats = this.heatAttr.array as Float32Array;
    let seg = 1;
    for (let k = 0; k < count; k++) {
      const s = ((k + 0.5) / count) * total;
      while (seg < NODES - 1 && this.cum[seg] < s) seg++;
      const i0 = (seg - 1) * 3, i1 = seg * 3;
      const span = this.cum[seg] - this.cum[seg - 1];
      const u = span > 1e-9 ? (s - this.cum[seg - 1]) / span : 0;
      _v.set(r[i0] + (r[i1] - r[i0]) * u, r[i0 + 1] + (r[i1 + 1] - r[i0 + 1]) * u, r[i0 + 2] + (r[i1 + 2] - r[i0 + 2]) * u);
      // The chain's direction here: this span's, eased toward the next one's past its middle (no kink at a node).
      _t.set(r[i1] - r[i0], r[i1 + 1] - r[i0 + 1], r[i1 + 2] - r[i0 + 2]);
      if (seg < NODES - 1 && u > 0.5) {
        const i2 = i1 + 3;
        _n.set(r[i2] - r[i1], r[i2 + 1] - r[i1 + 1], r[i2 + 2] - r[i1 + 2]);
        const ln = _n.length(), lt = _t.length();
        if (ln > 1e-9 && lt > 1e-9) _t.multiplyScalar(1 / lt).lerp(_n.multiplyScalar(1 / ln), (u - 0.5) * 0.9);
      }
      if (_t.lengthSq() < 1e-12) _t.copy(UP);
      _q.setFromUnitVectors(UP, _t.normalize());
      if (k & 1) _q.multiply(_quarter);
      _m.compose(_v, _q, _s);
      _m.toArray(matrices, k * 16);
      const along = (k + 0.5) / count;
      const hot = THREE.MathUtils.smoothstep(along, 0.3, 1);
      heats[k] = heat * hot * hot;
    }
    this.mesh.count = count;
    if (count > 0) {
      const im = this.mesh.instanceMatrix;
      im.clearUpdateRanges();
      im.addUpdateRange(0, count * 16);
      im.needsUpdate = true;
      this.heatAttr.clearUpdateRanges();
      this.heatAttr.addUpdateRange(0, count);
      this.heatAttr.needsUpdate = true;
    }
  }
}

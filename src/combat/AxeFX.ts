import * as THREE from 'three';
import { ParticleFX } from './ParticleFX';
import { ClashFX } from './ClashFX';
import { SoundFX } from './SoundFX';
import { SceneManager } from '../core/SceneManager';
import { InputManager } from '../core/InputManager';
import { IMPACTS, type ImpactKind } from '../core/ImpactCamera';
import { patchShader } from '../levels/environment/ToonRelight';

/*
 * The island demoness's burning axe, beyond its trail (combat/SlashRibbon.ts 'fire') and chain (combat/AxeChain.ts):
 *
 * - embers: a pool of hot points shed along the blade as it swings (40-80 a second), born with a share of the blade's
 *   own velocity, slowing in the air, rising a little and cooling from white-yellow through orange to a dull red; and
 *   bursts of them where it strikes. One draw call, additive and HDR (the bloom keeps them), buffers made once;
 * - a warm flash: a camera-facing glow quad where it strikes, with the clash's one pooled light (ClashFX) pulsed there
 *   (no light is added);
 * - the moments of a swing put together: the whip-out (whoosh, chain rattle, a camera punch), the chain snapping taut,
 *   the blade on stone (sparks, dust, embers, the flash, a heavier camera hit and the stone's crack), a scrape, a wall,
 *   the hero struck, and the axe caught back in her hand;
 * - the blade's heat: its head glows from dull red to orange-white as she winds up and swings (`bladeHeat`).
 *
 * Shared by every demoness (one pool, added to the scene once with the fight's other particles).
 */

const MAX_EMBERS = 420;
const EMBER_DRAG = 2.4;
const EMBER_LIFT = 1.6;

const EMBER_VERTEX = /* glsl */ `
uniform float uHeight;
attribute vec4 aData;   // x: size (m), y: age (0..1 of its life), z: seed, w: brightness
varying float vAge;
varying float vBright;
void main() {
  vAge = aData.y;
  vBright = aData.w;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = aData.x * (1.0 - 0.5 * aData.y);
  gl_PointSize = clamp(size * projectionMatrix[1][1] * 0.5 * uHeight / max(0.1, -mv.z), 1.5, 64.0);
}`;
const EMBER_FRAGMENT = /* glsl */ `
varying float vAge;
varying float vBright;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float core = 1.0 - smoothstep(0.0, 0.45, d);
  float glow = 1.0 - smoothstep(0.15, 1.0, d);
  vec3 c = mix(vec3(3.6, 2.0, 0.55), vec3(2.8, 0.75, 0.08), smoothstep(0.0, 0.22, vAge));
  c = mix(c, vec3(0.9, 0.1, 0.015), smoothstep(0.3, 0.8, vAge));
  float fade = 1.0 - smoothstep(0.7, 1.0, vAge);
  gl_FragColor = vec4(c * (glow * glow * 0.55 + core) * fade * vBright, 1.0);
}`;
const FLASH_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FLASH_FRAGMENT = /* glsl */ `
uniform float uGain;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float g = pow(max(0.0, 1.0 - d), 2.2);
  float core = pow(max(0.0, 1.0 - d * 2.2), 2.0);
  gl_FragColor = vec4((vec3(2.4, 0.78, 0.16) * g + vec3(2.5, 1.45, 0.55) * core) * uGain, 1.0);
}`;

/** Uploads only the live part of a per-step buffer. */
function upload(attr: THREE.BufferAttribute, count: number): void {
  attr.clearUpdateRanges();
  attr.addUpdateRange(0, count * attr.itemSize);
  attr.needsUpdate = true;
}

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export class AxeFX {
  private static shared: AxeFX | null = null;

  public static get(): AxeFX {
    if (!AxeFX.shared) AxeFX.shared = new AxeFX();
    return AxeFX.shared;
  }

  private readonly pos = new Float32Array(MAX_EMBERS * 3);
  private readonly vel = new Float32Array(MAX_EMBERS * 3);
  private readonly age = new Float32Array(MAX_EMBERS);
  private readonly life = new Float32Array(MAX_EMBERS);
  private readonly size = new Float32Array(MAX_EMBERS);
  private readonly seed = new Float32Array(MAX_EMBERS);
  private count = 0;
  private readonly position: THREE.BufferAttribute;
  private readonly data: THREE.BufferAttribute;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly points: THREE.Points;
  private readonly flashMesh: THREE.Mesh;
  private readonly flashUniforms = { uGain: { value: 0 } };
  private flashAge = 1;
  private flashLife = 0.12;
  private flashPeak = 0;
  private attached = false;
  /** Embers shed since the game began (the capture probes read it). */
  public shed = 0;

  private constructor() {
    this.position = new THREE.BufferAttribute(this.pos.slice(), 3).setUsage(THREE.DynamicDrawUsage);
    this.data = new THREE.BufferAttribute(new Float32Array(MAX_EMBERS * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.position);
    this.geometry.setAttribute('aData', this.data);
    this.geometry.setDrawRange(0, 0);
    const uniforms = { uHeight: { value: 900 } };
    const material = new THREE.ShaderMaterial({
      name: 'AxeEmbers', uniforms, vertexShader: EMBER_VERTEX, fragmentShader: EMBER_FRAGMENT,
      transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    this.points = new THREE.Points(this.geometry, material);
    this.points.name = 'AxeEmbers';
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.points.visible = false;
    const drawing = new THREE.Vector2();
    this.points.onBeforeRender = (renderer) => {
      uniforms.uHeight.value = renderer.getDrawingBufferSize(drawing).y;
    };
    this.flashMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      name: 'AxeFlash', uniforms: this.flashUniforms, vertexShader: FLASH_VERTEX, fragmentShader: FLASH_FRAGMENT,
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    }));
    this.flashMesh.name = 'AxeFlash';
    this.flashMesh.frustumCulled = false;
    this.flashMesh.renderOrder = 6;
    this.flashMesh.visible = false;
    this.flashMesh.onBeforeRender = (_r, _s, camera) => {
      this.flashMesh.quaternion.copy(camera.quaternion);
      this.flashMesh.updateMatrixWorld();
    };
    // Both hidden until she strikes: the loading screen's warm-up frame draws them once (Engine.warmUp, after `ready`).
    this.points.userData.warm = true;
    this.flashMesh.userData.warm = true;
  }

  /** In the scene, hidden, from the moment she is made (the first step would do it, in the middle of the fight she is in). */
  public ready(): void {
    this.attach();
  }

  /** Into the fight's scene once, with the bloom (it outlives level loads, as the sparks do). */
  private attach(): void {
    if (this.attached) return;
    const scene = ParticleFX.getInstance().scene;
    if (!scene) return;
    scene.add(this.points, this.flashMesh);
    const post = SceneManager.getInstance().postFX;
    post.keepBloom(this.points);
    post.keepBloom(this.flashMesh);
    this.attached = true;
  }

  /** `object` glows (the bloom takes its HDR): a demoness's fire trail and hot chain, selected again each attack, since a
   * level load clears the selection (not kept for good: they go with her). */
  public glow(object: THREE.Object3D): void {
    const bloom = SceneManager.getInstance().postFX;
    bloom.addBloom(object);
  }

  /** `object` is no longer selected for the bloom (a demoness's trail and chain, once she is gone). */
  public unglow(object: THREE.Object3D): void {
    SceneManager.getInstance().postFX.removeBloom(object);
  }

  /**
   * Every ember and the flash gone at once. Only a demoness steps this shared pool, so the one that is retired (the chapter
   * left or tried again, the game quit) clears it, or its last embers and flash would hang in the shared scene, drawn at
   * the same spot every frame, for good (audit L1).
   */
  public clear(): void {
    this.count = 0;
    this.geometry.setDrawRange(0, 0);
    this.points.visible = false;
    this.flashAge = this.flashLife;
    this.flashUniforms.uGain.value = 0;
    this.flashMesh.visible = false;
  }

  /** One simulation step: the embers fly and cool, the flash fades. */
  public step(dt: number): void {
    this.attach();
    if (dt <= 0) return;
    const p = this.pos, v = this.vel;
    const drag = Math.exp(-EMBER_DRAG * dt);
    let n = this.count;
    for (let i = 0; i < n; i++) {
      this.age[i] += dt / this.life[i];
      if (this.age[i] >= 1) {
        // Out: the last one takes its place (the live ones stay packed at the front).
        n--;
        this.copy(n, i);
        i--;
        continue;
      }
      const k = i * 3;
      v[k] *= drag;
      v[k + 1] = v[k + 1] * drag + EMBER_LIFT * dt;
      v[k + 2] *= drag;
      p[k] += v[k] * dt;
      p[k + 1] += v[k + 1] * dt;
      p[k + 2] += v[k + 2] * dt;
    }
    this.count = n;
    const pa = this.position.array as Float32Array;
    const da = this.data.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      pa[k] = p[k]; pa[k + 1] = p[k + 1]; pa[k + 2] = p[k + 2];
      const a = this.age[i];
      da[i * 4] = this.size[i];
      da[i * 4 + 1] = a;
      da[i * 4 + 2] = this.seed[i];
      da[i * 4 + 3] = 0.78 + 0.22 * Math.sin(a * 38 + this.seed[i] * 6.283);
    }
    this.geometry.setDrawRange(0, n);
    this.points.visible = n > 0;
    if (n > 0) {
      upload(this.position, n);
      upload(this.data, n);
    }
    if (this.flashAge < this.flashLife) {
      this.flashAge += dt;
      const k = Math.max(0, 1 - this.flashAge / this.flashLife);
      this.flashUniforms.uGain.value = this.flashPeak * k * k;
      this.flashMesh.visible = k > 0;
    } else this.flashMesh.visible = false;
  }

  /** Embers alive now. */
  public get live(): number {
    return this.count;
  }

  private copy(from: number, to: number): void {
    if (from === to) return;
    for (let c = 0; c < 3; c++) {
      this.pos[to * 3 + c] = this.pos[from * 3 + c];
      this.vel[to * 3 + c] = this.vel[from * 3 + c];
    }
    this.age[to] = this.age[from];
    this.life[to] = this.life[from];
    this.size[to] = this.size[from];
    this.seed[to] = this.seed[from];
  }

  /** One ember at `at` flying at `velocity` (m/s). */
  private ember(at: THREE.Vector3, vx: number, vy: number, vz: number, life: number, size: number): void {
    if (this.count >= MAX_EMBERS) return;
    const i = this.count++;
    at.toArray(this.pos, i * 3);
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.age[i] = 0;
    this.life[i] = life;
    this.size[i] = size;
    this.seed[i] = Math.random();
    this.shed++;
  }

  /**
   * `n` embers shed along the blade, between its edge from the last step (`a0`-`b0`) and this one (`a1`-`b1`), each
   * with `inherit` of the blade's velocity there over `dt`.
   */
  public shedAlong(a0: THREE.Vector3, b0: THREE.Vector3, a1: THREE.Vector3, b1: THREE.Vector3, n: number, dt: number, inherit = 0.35): void {
    for (let i = 0; i < n; i++) {
      const u = Math.random(), s = Math.random();
      _v.lerpVectors(a0, b0, s);
      _w.lerpVectors(a1, b1, s);
      _dir.subVectors(_w, _v).multiplyScalar(inherit / Math.max(dt, 1e-4));
      _v.lerp(_w, u);
      this.ember(_v,
        _dir.x + (Math.random() - 0.5) * 1.4, _dir.y + Math.random() * 0.9 + 0.2, _dir.z + (Math.random() - 0.5) * 1.4,
        0.45 + Math.random() * 0.6, 0.026 + Math.random() * 0.03);
    }
  }

  /** A burst of `n` embers from `at`, thrown about `dir` (any length; zero: every way) at up to `speed`. */
  public burst(at: THREE.Vector3, n: number, dir: THREE.Vector3 | null, speed: number, spread = 0.9): void {
    const d = dir && dir.lengthSq() > 1e-8 ? _dir.copy(dir).normalize() : null;
    for (let i = 0; i < n; i++) {
      _v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(spread);
      if (d) _v.add(d);
      _v.y += 0.35;
      const s = speed * (0.3 + 0.7 * Math.random());
      this.ember(at, _v.x * s, _v.y * s, _v.z * s, 0.5 + Math.random() * 0.8, 0.03 + Math.random() * 0.035);
    }
  }

  /** A warm flash at `at`: the glow quad (`size` metres) and the clash light pulsed there. */
  public flash(at: THREE.Vector3, intensity: number, size: number, life = 0.12): void {
    this.flashMesh.position.copy(at);
    this.flashMesh.scale.setScalar(size);
    this.flashPeak = intensity;
    this.flashAge = 0;
    this.flashLife = life;
    this.flashUniforms.uGain.value = intensity;
    this.flashMesh.visible = true;
    ClashFX.getInstance().glow(at, 1.8 + 2.0 * intensity, life);
  }

  private camera(kind: ImpactKind, dir: THREE.Vector3 | undefined, scale: number): void {
    const sm = SceneManager.getInstance();
    sm.impact.impact(kind, sm.camera, { dir, scale });
    const [strong, weak, ms] = IMPACTS[kind].rumble;
    InputManager.getInstance().rumble(strong * Math.min(scale, 1.4), weak * Math.min(scale, 1.4), ms);
  }

  // ------------------------------------------------------------------------------------------------ the moments

  /** The whip-out: the blade leaves the coil. */
  public whip(at: THREE.Vector3, travel: THREE.Vector3, power: number): void {
    SoundFX.getInstance().playAxeWhoosh(power);
    SoundFX.getInstance().playChainRattle(0.34, power);
    this.camera('axeWhip', travel, power);
    this.burst(at, Math.round(14 * power), travel, 5, 0.7);
  }

  /** The chain at full stretch: it cracks and the blade jolts. */
  public taut(at: THREE.Vector3, travel: THREE.Vector3, power: number): void {
    SoundFX.getInstance().playChainCrack(power);
    this.camera('axeTaut', travel, power);
    this.burst(at, Math.round(12 * power), travel, 4.5, 0.6);
  }

  /** The blade into the floor (the slam), `swing` its travel, `floor` the ground's height there. */
  public floorStrike(at: THREE.Vector3, swing: THREE.Vector3, power: number, floor: number): void {
    _w.set(swing.x, 0, swing.z);
    if (_w.lengthSq() < 1e-6) _w.set(0, 0, 1);
    _w.normalize().multiplyScalar(0.45).addScaledVector(_up, 0.9).normalize();
    ClashFX.getInstance().sparks(at, _w, 'stone', 1.2 * power, floor);
    ParticleFX.getInstance().spawnDustPuff(at, Math.round(16 * power));
    ParticleFX.getInstance().spawnEmbers(at, Math.round(10 * power), 0.5, 1.4);
    this.burst(at, Math.round(34 * power), _w, 6.5, 1.0);
    this.flash(_v.copy(at).addScaledVector(_up, 0.25), 1.6 * power, 2.2, 0.16);
    SoundFX.getInstance().playAxeImpact(power);
    this.camera('axeSlam', undefined, power);
  }

  /** The blade dragged along the floor at speed (the sweep's low arc catching it). */
  public scrape(at: THREE.Vector3, travel: THREE.Vector3, power: number, floor: number): void {
    ClashFX.getInstance().sparks(at, travel, 'stone', 0.55 * power, floor);
    this.burst(at, Math.round(7 * power), travel, 4, 0.6);
    SoundFX.getInstance().playAxeScrape(power);
    this.camera('axeScrape', undefined, power);
  }

  /** The blade into rock (a wall or a pillar stopped it): `normal` faces out of the rock. */
  public wallStrike(at: THREE.Vector3, normal: THREE.Vector3, travel: THREE.Vector3, power: number): void {
    _w.copy(travel);
    if (_w.lengthSq() < 1e-6) _w.copy(normal);
    _w.normalize();
    _w.addScaledVector(normal, -2 * _w.dot(normal)).addScaledVector(normal, 0.6).normalize();
    ClashFX.getInstance().sparks(at, _w, 'stone', power, undefined);
    ParticleFX.getInstance().spawnDustPuff(at, Math.round(9 * power));
    this.burst(at, Math.round(22 * power), _w, 5, 0.9);
    this.flash(at, 1.1 * power, 1.6, 0.13);
    SoundFX.getInstance().playAxeImpact(0.75 * power);
    this.camera('axeSlam', undefined, 0.55 * power);
  }

  /** The blade landed on the hero (`guarded`: on his guard): fire off the wound or the shield, over the hit's own feel. */
  public heroStrike(at: THREE.Vector3, travel: THREE.Vector3, guarded: boolean): void {
    this.burst(at, guarded ? 14 : 28, travel, guarded ? 4 : 5.5, 0.85);
    this.flash(at, guarded ? 0.7 : 1.15, guarded ? 1.0 : 1.4, 0.1);
  }

  /** Back in her hand: the snap. */
  public caught(at: THREE.Vector3, travel: THREE.Vector3, power: number): void {
    SoundFX.getInstance().playAxeReturn(power);
    this.camera('axeRecall', travel, power);
    this.burst(at, Math.round(9 * power), null, 2.2, 1);
  }

  /** The chain reeled in (the recall begins). */
  public reel(power: number): void {
    SoundFX.getInstance().playChainRattle(0.26, 0.8 * power);
  }
}

/**
 * The axe's head glows with its heat: a dull red to an orange-white, strongest along the cutting edge, over the toon
 * materials of the supplied prop (its own vertex space: the head is above y 0.78 and to -x of the haft). Returns the
 * setter (0..1+).
 */
export function bladeHeat(prop: THREE.Object3D): (heat: number) => void {
  const uniform = { value: 0 };
  const done = new Set<THREE.Material>();
  prop.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (done.has(mat)) continue;
      done.add(mat);
      patchShader(mat, 'axeHeat', (shader) => {
        shader.uniforms.uAxeHeat = uniform;
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vAxeLocal;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAxeLocal = position;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vAxeLocal;\nuniform float uAxeHeat;')
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    float head = smoothstep(0.7, 0.86, vAxeLocal.y) * (1.0 - smoothstep(-0.02, 0.1, vAxeLocal.x));
    float edge = smoothstep(-0.28, -0.39, vAxeLocal.x);
    float h = clamp(uAxeHeat, 0.0, 1.3);
    vec3 heat = mix(vec3(0.3, 0.02, 0.0), vec3(0.85, 0.2, 0.025), smoothstep(0.0, 0.6, h));
    heat = mix(heat, vec3(1.5, 0.6, 0.14), smoothstep(0.75, 1.15, h) * edge);
    totalEmissiveRadiance += heat * h * head * (0.3 + 0.8 * edge);
  }`);
      });
      mat.needsUpdate = true;
    }
  });
  return (heat: number) => {
    uniform.value = heat;
  };
}

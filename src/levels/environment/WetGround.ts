import * as THREE from 'three';
import { ACTORS } from '../../entities/ActorRegistry';
import type { Character } from '../../entities/Character';

// ---------------------------------------------------------------------------------------------------------------
// Wet stone: darker, glossier, and pocked with raindrop rings in its normals.
// ---------------------------------------------------------------------------------------------------------------

/** Shared by every wetted material (and the sea's rain): the rain's clock. */
export const rainClock = { value: 0 };

/** The raindrop rings' slope at a point (metres): needs `uniform float uRainTime` declared before it. */
export const RAIN_SLOPE = /* glsl */ `
float rainHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// Raindrops landing: in every cell of a grid one drop at a time, its ring spreading and dying; two offset grids.
vec2 rainSlope(vec2 p) {
  vec2 s = vec2(0.0);
  for (int l = 0; l < 2; l++) {
    float fl = float(l);
    vec2 q = p * (2.7 + fl * 1.1) + fl * vec2(0.37, 0.71);
    vec2 cell = floor(q);
    vec2 f = fract(q);
    float h = rainHash(cell + fl * 17.0);
    vec2 c = 0.3 + 0.4 * vec2(rainHash(cell + 3.1), rainHash(cell + 8.7));
    float age = fract(uRainTime * (0.8 + 0.6 * h) + h);
    vec2 d = f - c;
    float r = length(d);
    float x = (r - age * 0.26) * 34.0;
    float env = exp(-x * x * 0.5) * (1.0 - age) * (1.0 - age);
    s += d / max(r, 1e-3) * env * sin(x * 1.6);
  }
  return s;
}`;

const RAIN_RIPPLES = /* glsl */ `
uniform float uRainTime;
uniform float uRainRipple;
varying vec3 vRainWorld;
${RAIN_SLOPE}`;

export interface WetOptions {
  /** Albedo multiplier (rain darkens stone). */
  darken: number;
  roughness: number;
  /**
   * How strongly it mirrors the sky. Only applies with `envMap`: a material on the scene's environment takes the
   * scene's intensity instead of its own.
   */
  envMapIntensity: number;
  envMap?: { texture: THREE.Texture; rotation?: THREE.Euler };
  /** Strength of the raindrop rings in the normals (0: none). */
  ripples: number;
}

/** Makes a level material look rained on. Patches the shader once (the program is shared by every wet material). */
export function wetten(material: THREE.MeshStandardMaterial, opts: WetOptions): void {
  if (material.userData.wet) return;
  material.userData.wet = true;
  material.color.multiplyScalar(opts.darken);
  material.roughness = opts.roughness;
  material.envMapIntensity = opts.envMapIntensity;
  if (opts.envMap) {
    material.envMap = opts.envMap.texture;
    if (opts.envMap.rotation) material.envMapRotation.copy(opts.envMap.rotation);
  }
  if (opts.ripples <= 0) return;
  const strength = { value: opts.ripples };
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.uRainTime = rainClock;
    shader.uniforms.uRainRipple = strength;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRainWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvRainWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${RAIN_RIPPLES}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  // Only up-facing surfaces catch the rings, and only near the camera (they would shimmer further out).
  float fade = uRainRipple * (1.0 - smoothstep(9.0, 20.0, length(vViewPosition)));
  if (fade > 0.001) {
    vec2 rs = rainSlope(vRainWorld.xz) * fade;
    vec3 n = (viewMatrix * vec4(-rs.x, 0.0, -rs.y, 0.0)).xyz;
    normal = normalize(normal + n * max(dot(normal, (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), 0.0));
  }
}`);
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}|wet-rain`;
  material.needsUpdate = true;
}

/** Advances the raindrop rings of every wetted material. */
export function tickWetMaterials(dt: number): void {
  rainClock.value += dt;
}

// ---------------------------------------------------------------------------------------------------------------
// Splashes on the floor: random raindrops, and the rings and spray of whatever walks, falls or strikes there.
// ---------------------------------------------------------------------------------------------------------------

const SPLASH_VERTEX = /* glsl */ `
attribute vec4 aImpact; // (x, z, start time, strength), or a raindrop slot: strength < 0, its seed = -strength
uniform float uTime;
uniform float uFloorY;
uniform vec2 uFocus;
uniform float uRadius;
uniform float uArena;
uniform vec3 uCamPos;
varying vec2 vUv;
varying float vT;      // 0..1 through the ring's (or the spray's) life
varying float vKind;   // 0 ring, 1 spray
varying float vHeavy;  // 0 a raindrop, 1 a footstep, up to ~5 a slam
varying float vSeed;
varying float vFade;

float h1(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  vec2 center;
  float age, life, strength, seed;
  bool rain = aImpact.w < 0.0;
  if (rain) {
    seed = -aImpact.w;
    float period = mix(0.45, 0.95, h1(seed * 91.3));
    float tt = uTime / period + h1(seed * 17.1);
    float cycle = floor(tt);
    age = fract(tt) * period;
    float a = h1(seed * 13.7 + cycle * 1.618) * 6.2831853;
    float r = sqrt(h1(seed * 7.9 + cycle * 2.414)) * uRadius;
    center = uFocus + vec2(cos(a), sin(a)) * r;
    strength = 0.0;
    life = 0.34;
    if (length(center) > uArena) age = -1.0;
    seed = fract(seed * 7.0 + cycle * 0.37);
  } else {
    center = aImpact.xy;
    age = uTime - aImpact.z;
    strength = aImpact.w;
    life = mix(0.95, 2.0, clamp((strength - 1.0) / 4.0, 0.0, 1.0));
    seed = fract(aImpact.z * 7.31);
  }
  float kind = position.z;
  float sprayLife = rain ? 0.2 : 0.3 + 0.08 * strength;
  bool hidden = age < 0.0 || age > (kind > 0.5 ? sprayLife : life) || (kind > 0.5 && !rain && strength < 0.8);
  if (hidden) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // outside the clip volume: nothing drawn
    return;
  }
  vec3 base = vec3(center.x, uFloorY, center.y);
  // Raindrop rings thin out with distance (a field of tiny rings far off reads as a pattern, not rain).
  vFade = rain ? 1.0 - smoothstep(5.0, 11.0, distance(uCamPos, base)) : 1.0;
  vec3 world;
  if (kind < 0.5) {
    float reach = rain ? 0.17 : 0.45 + 0.42 * strength;
    world = base + vec3(position.x * reach, 0.0, position.y * reach);
    vT = age / life;
  } else {
    // The spray stands up facing the camera (turning about the vertical only).
    vec3 toCam = uCamPos - base;
    toCam.y = 0.0;
    vec3 right = length(toCam) > 1e-3 ? normalize(vec3(toCam.z, 0.0, -toCam.x)) : vec3(1.0, 0.0, 0.0);
    float w = rain ? 0.07 : 0.12 + 0.2 * strength;
    float h = rain ? 0.09 : 0.1 + 0.17 * strength;
    world = base + right * position.x * w + vec3(0.0, (position.y * 0.5 + 0.5) * h, 0.0);
    vT = age / sprayLife;
  }
  vUv = position.xy;
  vKind = kind;
  vHeavy = strength;
  vSeed = seed;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const SPLASH_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uFlash;
varying vec2 vUv;
varying float vT;
varying float vKind;
varying float vHeavy;
varying float vSeed;
varying float vFade;

float h1(float n) { return fract(sin(n) * 43758.5453); }
// A crisp (toon) ring of half-width w at radius at.
float ring(float r, float at, float w) { return 1.0 - smoothstep(w * 0.5, w, abs(r - at)); }

void main() {
  float a = 0.0;
  if (vKind < 0.5) {
    float r = length(vUv);
    if (r > 1.0) discard;
    float t = vT;
    float grow = 1.0 - (1.0 - t) * (1.0 - t); // eases out
    if (vHeavy <= 0.0) {
      a = ring(r, grow * 0.9, 0.16) * (1.0 - t) * (1.0 - t);
      a += (1.0 - smoothstep(0.08, 0.2, r)) * (1.0 - smoothstep(0.0, 0.25, t)) * 0.8;
      a *= 0.5;
    } else {
      float fade = (1.0 - t) * (1.0 - t);
      a = ring(r, grow * 0.92, 0.05) * fade;
      a += ring(r, grow * 0.6, 0.045) * fade * 0.7;
      if (vHeavy > 1.8) a += ring(r, grow * 0.3, 0.05) * fade * 0.6;
      // Churned water right where it struck, at first.
      a += (1.0 - smoothstep(0.1, 0.32, r)) * (1.0 - smoothstep(0.0, 0.3, t)) * clamp(vHeavy * 0.25, 0.25, 0.9);
      a *= 0.6;
    }
  } else {
    // A crown of drops thrown up and falling back.
    float drops = vHeavy <= 0.0 ? 4.0 : 6.0 + vHeavy * 3.0;
    vec2 p = vec2(vUv.x, vUv.y * 0.5 + 0.5);
    for (int i = 0; i < 22; i++) {
      float fi = float(i);
      if (fi >= drops) break;
      float s = vSeed * 13.1 + fi * 1.731;
      float side = h1(s) * 2.0 - 1.0;
      float top = mix(0.45, 1.0, h1(s + 0.5));
      vec2 at = vec2(side * (0.25 + 0.75 * vT), 4.0 * top * vT * (1.0 - vT) * 0.95 + 0.04);
      float size = vHeavy <= 0.0 ? mix(0.07, 0.11, h1(s + 0.9)) : mix(0.03, 0.06, h1(s + 0.9));
      // A drop is a little taller than wide, stretched along its flight.
      vec2 d = (p - at) * vec2(1.25, 1.0);
      a = max(a, 1.0 - smoothstep(size * 0.6, size, length(d)));
    }
    a *= (1.0 - smoothstep(0.6, 1.0, vT)) * 0.75;
  }
  a *= vFade;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor * (1.0 + uFlash * 2.0), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface SplashOptions {
  floorY: number;
  /** Radius of the floor that is open to the rain (splashes stop at its edge). */
  arenaRadius: number;
  /** Raindrop splash slots, and how many ripples (footsteps, falls, blows) can be alive at once. */
  raindrops: number;
  impacts: number;
}

/**
 * Every splash on the arena floor in one instanced draw: a flat quad for the ring and an upright one for the thrown
 * drops, per instance. Raindrop slots are placed and timed in the shader from their seed (recycled round wherever the
 * camera looks); impacts are a ring buffer, one instance written per ripple.
 */
export class GroundSplashes {
  public readonly mesh: THREE.Mesh;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly impacts: THREE.InstancedBufferAttribute;
  private readonly firstImpact: number;
  private readonly impactCount: number;
  private next = 0;
  private clock = 0;
  private readonly ray = new THREE.Vector3();
  private readonly arenaRadius: number;
  private readonly floorY: number;

  constructor(opts: SplashOptions) {
    this.arenaRadius = opts.arenaRadius;
    this.floorY = opts.floorY;
    const geometry = new THREE.InstancedBufferGeometry();
    // xy: the corner; z: 0 for the ring quad (on the floor), 1 for the spray (standing up).
    const corners = [-1, -1, 1, -1, -1, 1, 1, 1];
    const position = new Float32Array(8 * 3);
    for (let q = 0; q < 2; q++) for (let c = 0; c < 4; c++) position.set([corners[c * 2], corners[c * 2 + 1], q], (q * 4 + c) * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setIndex([0, 2, 1, 1, 2, 3, 4, 5, 6, 6, 5, 7]);
    this.firstImpact = opts.raindrops;
    this.impactCount = opts.impacts;
    const data = new Float32Array((opts.raindrops + opts.impacts) * 4);
    for (let i = 0; i < opts.raindrops; i++) data[i * 4 + 3] = -(i + 1) / opts.raindrops;
    for (let i = opts.raindrops; i < opts.raindrops + opts.impacts; i++) data.set([0, 0, -100, 1], i * 4);
    this.impacts = new THREE.InstancedBufferAttribute(data, 4);
    this.impacts.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aImpact', this.impacts);
    geometry.instanceCount = opts.raindrops + opts.impacts;

    this.uniforms = {
      uTime: { value: 0 },
      uFloorY: { value: opts.floorY + 0.03 },
      uFocus: { value: new THREE.Vector2() },
      uRadius: { value: 9 },
      uArena: { value: opts.arenaRadius },
      uCamPos: { value: new THREE.Vector3() },
      uColor: { value: new THREE.Color(0.62, 0.68, 0.76) },
      uFlash: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      name: 'GroundSplashes',
      uniforms: this.uniforms,
      vertexShader: SPLASH_VERTEX,
      fragmentShader: SPLASH_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'GroundSplashes';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
  }

  /** Fewer raindrop splashes (the low setting) or none. */
  public setRaindrops(fraction: number): void {
    const g = this.mesh.geometry as THREE.InstancedBufferGeometry;
    // Raindrop slots come first; keep the impacts by drawing all instances but parking the dropped raindrops.
    const keep = Math.round(this.firstImpact * fraction);
    for (let i = 0; i < this.firstImpact; i++) this.impacts.array[i * 4 + 3] = i < keep ? -(i + 1) / this.firstImpact : 0;
    // A parked slot has strength 0 and start -100: an impact long over, never drawn.
    for (let i = keep; i < this.firstImpact; i++) this.impacts.array[i * 4 + 2] = -100;
    this.impacts.clearUpdateRanges();
    this.impacts.needsUpdate = true;
    g.instanceCount = this.firstImpact + this.impactCount;
  }

  /**
   * A ripple (and, if strong enough, a spray) at world (x, z): ~0.6 a walking step, ~1 a running one, 2-3 a landing
   * or a body falling, 4-5 a slam. A second one at nearly the same place and moment only strengthens the first.
   */
  public add(x: number, z: number, strength: number): boolean {
    if (Math.hypot(x, z) > this.arenaRadius) return false;
    const a = this.impacts.array as Float32Array;
    const last = this.firstImpact + ((this.next + this.impactCount - 1) % this.impactCount);
    if (this.clock - a[last * 4 + 2] < 0.12 && Math.hypot(a[last * 4] - x, a[last * 4 + 1] - z) < 0.6) {
      if (strength <= a[last * 4 + 3]) return true;
      a[last * 4 + 3] = strength;
      this.impacts.addUpdateRange(last * 4, 4);
      this.impacts.needsUpdate = true;
      return true;
    }
    const slot = this.firstImpact + this.next;
    a[slot * 4] = x;
    a[slot * 4 + 1] = z;
    a[slot * 4 + 2] = this.clock;
    a[slot * 4 + 3] = strength;
    this.impacts.addUpdateRange(slot * 4, 4);
    this.impacts.needsUpdate = true;
    this.next = (this.next + 1) % this.impactCount;
    return true;
  }

  /** Raindrops land round the floor point the camera looks at (or under it, looking up). */
  public update(dt: number, camera: THREE.Camera, flash: number): void {
    this.clock += dt;
    const u = this.uniforms;
    u.uTime.value = this.clock;
    u.uFlash.value = flash;
    (u.uCamPos.value as THREE.Vector3).copy(camera.position);
    camera.getWorldDirection(this.ray);
    const focus = u.uFocus.value as THREE.Vector2;
    const drop = camera.position.y - this.floorY;
    // Where the view meets the floor, no further than 7 m out.
    const along = this.ray.y < -0.05 ? Math.min(drop / -this.ray.y, 7) : 3;
    focus.set(camera.position.x + this.ray.x * along, camera.position.z + this.ray.z * along);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Who is splashing: every character in the scene, by its feet, its landings, its falls and its weapon.
// ---------------------------------------------------------------------------------------------------------------

interface Track {
  character: Character;
  rig: unknown;
  feet: [THREE.Object3D | null, THREE.Object3D | null];
  hips: THREE.Object3D | null;
  planted: [boolean, boolean];
  x: number;
  y: number;
  z: number;
  vy: number;
  travelled: number;
  side: number;
  airborne: boolean;
  fell: boolean;
  struck: boolean;
  /** The weapon's lowest point so far in this downswing (y = Infinity: not coming down). */
  tipLow: THREE.Vector3;
  tipLast: number;
  lastState: string;
  lastStateTime: number;
  seen: number;
}

export interface FootfallEvents {
  /** The hero's own foot came down (strength as for `GroundSplashes.add`). */
  step?(strength: number): void;
  /** Anything heavy hit the water: a landing, a body, a blow into the ground. */
  splash?(strength: number, x: number, z: number): void;
}

/**
 * A shade or a remembered figure (Extra's `shade` / `ghost`) hovers and leaves the water alone; one gone under it
 * (`submerged`, Shalva's dive) makes its own wake.
 */
function insubstantial(character: Character): boolean {
  const spirit = character as Character & { shade?: unknown; ghost?: unknown };
  return !!spirit.shade || !!spirit.ghost || character.submerged;
}

const STRIKE_STRENGTH: Record<string, number> = { ATTACK_JUMP: 4.8, ATTACK_3: 3.4 };

/**
 * Watches every visible character standing on the floor and splashes where they put their feet down (toe bones, or
 * every ~0.85 m without them), land from a jump, fall dead, or drive a weapon into the ground. Nothing is allocated
 * per frame: tracks are made once per character and swept when it leaves the scene.
 */
export class Footfalls {
  private readonly tracks = new Map<Character, Track>();
  private frame = 0;
  private readonly p = new THREE.Vector3();
  private readonly sweep = (track: Track, character: Character) => {
    if (track.seen !== this.frame) this.tracks.delete(character);
  };

  constructor(
    private readonly scene: THREE.Object3D,
    private readonly splashes: GroundSplashes,
    private readonly floorY: number,
    private readonly events: FootfallEvents = {},
  ) {}

  public update(dt: number): void {
    if (dt <= 0) return;
    this.frame++;
    const children = this.scene.children;
    for (let i = 0; i < children.length; i++) {
      const group = children[i];
      const character = ACTORS.get(group);
      if (!character || !group.visible || insubstantial(character)) continue;
      let track = this.tracks.get(character);
      if (!track) {
        track = this.makeTrack(character);
        this.tracks.set(character, track);
      }
      track.seen = this.frame;
      this.follow(track, dt);
    }
    if (this.frame % 30 === 0) this.tracks.forEach(this.sweep);
  }

  private makeTrack(character: Character): Track {
    const pos = character.group.position;
    return {
      character, rig: null, feet: [null, null], hips: null, planted: [true, true],
      x: pos.x, y: pos.y, z: pos.z, vy: 0, travelled: 0, side: 1,
      airborne: false, fell: false, struck: false, tipLow: new THREE.Vector3(0, Infinity, 0), tipLast: Infinity,
      lastState: '', lastStateTime: 0, seen: 0,
    };
  }

  private findBones(track: Track): void {
    const rig = track.character.rig;
    track.rig = rig;
    track.feet = [null, null];
    track.hips = null;
    if (!rig) return;
    rig.root.traverse((o) => {
      if (!(o as THREE.Bone).isBone) return;
      if (/LeftToeBase$/.test(o.name)) track.feet[0] = o;
      else if (/RightToeBase$/.test(o.name)) track.feet[1] = o;
      else if (/Hips$/.test(o.name)) track.hips = o;
    });
    // No toes: the feet themselves.
    rig.root.traverse((o) => {
      if (!track.feet[0] && /LeftFoot$/.test(o.name)) track.feet[0] = o;
      if (!track.feet[1] && /RightFoot$/.test(o.name)) track.feet[1] = o;
    });
  }

  private follow(track: Track, dt: number): void {
    const c = track.character;
    if (track.rig !== c.rig) this.findBones(track);
    const pos = c.group.position;
    const dx = pos.x - track.x;
    const dz = pos.z - track.z;
    const speed = Math.hypot(dx, dz) / dt;
    const vy = (pos.y - track.y) / dt;
    const teleported = speed > 18 || Math.abs(vy) > 30;
    track.x = pos.x;
    track.y = pos.y;
    track.z = pos.z;
    if (teleported) return;
    const height = pos.y - this.floorY;
    const onFloor = Math.abs(height) < 0.3;
    const hero = c.id.startsWith('player');

    // Landing from a jump or a leap.
    if (height > 0.35) {
      track.airborne = true;
      track.vy = Math.min(track.vy, vy);
    } else if (track.airborne && height < 0.12) {
      track.airborne = false;
      const s = THREE.MathUtils.clamp(-track.vy * 0.4, 1.4, 3.5);
      track.vy = 0;
      if (this.splashes.add(pos.x, pos.z, s)) this.events.splash?.(s, pos.x, pos.z);
    }
    if (!onFloor) return;

    const sm = c.stateMachine;
    const state = sm.currentState;
    // A new state, or the same attack started again.
    if (state !== track.lastState || sm.stateTime < track.lastStateTime) {
      track.struck = false;
      track.tipLow.y = Infinity;
      track.tipLast = Infinity;
      if (state !== 'DEAD') track.fell = false;
    }
    track.lastState = state;
    track.lastStateTime = sm.stateTime;

    // The body hits the ground.
    if (state === 'DEAD') {
      if (!track.fell && sm.stateTime > 0.75) {
        track.fell = true;
        const at = track.hips ? track.hips.getWorldPosition(this.p) : this.p.copy(pos);
        if (this.splashes.add(at.x, at.z, 3)) this.events.splash?.(3, at.x, at.z);
      }
      return;
    }

    // A weapon brought down to the ground: the mace's slam, a smash. Where the downswing bottoms out within half a
    // metre of the floor (a mace's head stops short of it), the water bursts up.
    if (state.startsWith('ATTACK') && !track.struck) {
      const tip = c.weaponTipInto(this.p);
      if (tip.y < track.tipLast) {
        if (tip.y < track.tipLow.y) track.tipLow.copy(tip);
      } else if (tip.y > track.tipLast + 0.01 && track.tipLow.y !== Infinity) {
        const low = track.tipLow;
        if (low.y - this.floorY < 0.5) {
          track.struck = true;
          const s = STRIKE_STRENGTH[state] ?? 2.4;
          if (this.splashes.add(low.x, low.z, s)) this.events.splash?.(s, low.x, low.z);
        }
        low.y = Infinity;
      }
      track.tipLast = tip.y;
    }

    // Footfalls.
    const moving = speed > 0.5;
    if (track.feet[0] && track.feet[1]) {
      for (let f = 0; f < 2; f++) {
        const foot = track.feet[f]!.getWorldPosition(this.p);
        const lift = foot.y - pos.y;
        if (track.planted[f] && lift > 0.13) track.planted[f] = false;
        else if (!track.planted[f] && lift < 0.075) {
          track.planted[f] = true;
          if (moving) this.step(foot.x, foot.z, speed, hero);
        }
      }
    } else if (moving) {
      track.travelled += speed * dt;
      if (track.travelled > 0.85) {
        track.travelled = 0;
        track.side = -track.side;
        // A little to one side, then the other.
        const k = (0.14 * track.side) / Math.max(speed * dt, 1e-3);
        this.step(pos.x - dz * k, pos.z + dx * k, speed, hero);
      }
    }
  }

  private step(x: number, z: number, speed: number, hero: boolean): void {
    const s = THREE.MathUtils.clamp(0.45 + speed * 0.1, 0.55, 1.4);
    if (this.splashes.add(x, z, s) && hero) this.events.step?.(s);
  }
}

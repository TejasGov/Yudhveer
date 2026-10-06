import * as THREE from 'three';
import { BloodFX } from './BloodFX';
import { ClashFX } from './ClashFX';
import { HitReact } from './HitReact';
import { SceneManager } from '../core/SceneManager';

/*
 * The fight's small effects: hit sparks, dust, flame licks and embers, the Baoli's mist, and parry shockwaves. Every
 * kind is one draw call, whatever is alive, drawn only while something is: its buffers are filled from the start each
 * frame and only the live part is drawn and uploaded. None of them is frustum-culled: their particles move every frame
 * and a bounding sphere would always be stale (until the fire pass, a stale one hid all four kinds in play).
 *
 * Sparks are streaks along their flight, white-hot at the head and cooling down the tail to orange and red; flames and
 * embers are soft hot points that rise and cool from yellow-white through orange to a dull red. Both are HDR and feed
 * the bloom. Dust and mist take the level's light, so a night's mist stays a night's mist.
 */

interface SparkParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  /** Width in metres. */
  size: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
  /** A hot (golden) spark: brighter, and it cools from white. */
  hot: boolean;
  /** Chingaari (`spawnChingaari`): a longer tail (times the usual), and the ground it skitters on. */
  streak?: number;
  floor?: number;
  bounces?: number;
}

interface ShockwaveRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
}

interface DustParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
  opacity: number;
}

interface FlameParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  /** Width in metres at its birth (it shrinks as it rises and cools). */
  size: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
  /** An ember: a small spark of fire drifting up, slower and longer-lived than a lick of flame. */
  ember: boolean;
}

interface MistParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
  opacity: number;
}

/**
 * A steady stream of particles whatever the frame rate: `take(perSecond, dt)` adds what is owed for `dt` seconds and
 * hands out the whole particles due now. Nothing while paused (dt 0), so a paused game never fills a pool that would
 * burst on unpause.
 */
export class Emitter {
  private owed = Math.random();

  public take(perSecond: number, dt: number): number {
    if (!(dt > 0) || !(perSecond > 0)) return 0;
    this.owed += perSecond * dt;
    const n = Math.floor(this.owed);
    this.owed -= n;
    return n;
  }
}

/** Seconds of a spark's flight its streak shows. */
const STREAK = 0.024;
/** What a cooling spark, flame or ember comes to before it goes out. */
const EMBER_RED = new THREE.Color(0.55, 0.06, 0.012);
/** Chingaari's colours at birth (they cool toward EMBER_RED): pale white-gold cores down to orange. */
const CHINGAARI = [new THREE.Color(1, 0.96, 0.82), new THREE.Color(1, 0.84, 0.5), new THREE.Color(1, 0.66, 0.24), new THREE.Color(1, 0.48, 0.14)];
const _up = new THREE.Vector3(0, 1, 0);
const _right = new THREE.Vector3(1, 0, 0);
const _u = new THREE.Vector3();
const _v = new THREE.Vector3();

const SPARK_VERTEX = /* glsl */ `
attribute vec3 aHead;
attribute vec3 aTail;
attribute vec4 aColor;   // rgb (HDR, faded with its life), a: width in metres
varying vec3 vColor;
varying vec2 vUv;
void main() {
  vec4 h = modelViewMatrix * vec4(aHead, 1.0);
  vec4 t = modelViewMatrix * vec4(aTail, 1.0);
  vec2 d = t.xy - h.xy;
  float len = length(d);
  vec2 dir = len > 1e-5 ? d / len : vec2(0.0, -1.0);
  // Never shorter than it is wide: a slow spark is a hot dot, not nothing.
  t.xy = h.xy + dir * max(len, aColor.a);
  // The quad: across (x -0.5..0.5) and from the head (y 0) down the tail (y 1); the head rounded by half a width.
  vec4 p = mix(h - vec4(dir * aColor.a * 0.5, 0.0, 0.0), t, position.y);
  p.xy += vec2(-dir.y, dir.x) * aColor.a * position.x;
  vColor = aColor.rgb;
  vUv = vec2(position.x * 2.0, position.y);
  gl_Position = projectionMatrix * p;
}`;
const SPARK_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying vec2 vUv;
void main() {
  float across = 1.0 - abs(vUv.x);
  float body = smoothstep(0.0, 0.55, across);
  float head = 1.0 - vUv.y;
  // White-hot down its middle at the head, its colour along the tail, fading out to the tail's end.
  float a = body * (0.2 + 0.8 * head);
  vec3 hot = vec3(1.0, 0.92, 0.75) * max(max(vColor.r, vColor.g), vColor.b);
  vec3 col = mix(vColor, hot, head * head * smoothstep(0.5, 1.0, across));
  gl_FragColor = vec4(col * a, 1.0);
}`;

/** A soft point of light or haze: `aSize` metres across, faded by `aAlpha` (or by its colour, for additive ones). */
const POINT_VERTEX = /* glsl */ `
uniform float uHeight;
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(aSize * projectionMatrix[1][1] * 0.5 * uHeight / max(0.1, -mv.z), 512.0);
}`;
/**
 * Fire, additive: a hot core inside a softer body. A lick of flame (`vAlpha` 1) is a teardrop, its round foot drawn up
 * into a point (they rise, so up is the way they lick); an ember (`vAlpha` 0) a round spark.
 */
const FLAME_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
float teardrop(vec2 q) {
  if (q.y < -0.35) return length(q - vec2(0.0, -0.35)) / 0.6;
  float t = (q.y + 0.35) / 1.3;
  if (t >= 1.0) return 2.0;
  return abs(q.x) / (0.6 * pow(1.0 - t, 0.9));
}
void main() {
  vec2 q = (gl_PointCoord - 0.5) * 2.0;
  q.y = -q.y;
  bool lick = vAlpha > 0.5;
  float d = lick ? teardrop(q) : length(q);
  if (d > 1.0) discard;
  float body = 1.0 - smoothstep(0.3, 1.0, d);
  float core = 1.0 - smoothstep(0.0, 0.42, lick ? length(q - vec2(0.0, -0.3)) / 0.6 : d);
  gl_FragColor = vec4(vColor * (body * body + core * 0.7), 1.0);
}`;
/** Dust and mist: a soft round puff in the level's light (normal blending). */
const HAZE_FRAGMENT = /* glsl */ `
uniform vec3 uTint;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float a = (1.0 - smoothstep(0.2, 1.0, d));
  gl_FragColor = vec4(vColor * uTint, a * a * vAlpha);
  #include <colorspace_fragment>
}`;

export class ParticleFX {
  private static instance: ParticleFX | null = null;
  public scene: THREE.Scene | null = null;
  /**
   * Something struck the ground here (a landing, a slide, a roar, a leap: every dust puff), `count` its size. A level
   * whose ground answers (Dwarka's wet stone splashes) listens while it is loaded, and returns true where no dust
   * should rise (water splashes instead).
   */
  public onGroundImpact: ((origin: THREE.Vector3, count: number) => boolean) | null = null;

  // Sparks: instanced streaks.
  private sparks: SparkParticle[] = [];
  private readonly sparkMaxCount = 600;
  private readonly sparkGeo = new THREE.InstancedBufferGeometry();
  private readonly sparkHead: THREE.InstancedBufferAttribute;
  private readonly sparkTail: THREE.InstancedBufferAttribute;
  private readonly sparkColor: THREE.InstancedBufferAttribute;
  private readonly sparkMesh: THREE.Mesh;

  // Dust
  private dustPuffs: DustParticle[] = [];
  private readonly dustMaxCount = 300;
  private readonly dust: PointPool;

  // Flames and embers
  private flames: FlameParticle[] = [];
  private readonly flameMaxCount = 500;
  private readonly flame: PointPool;

  // Mist (the Baoli)
  private mist: MistParticle[] = [];
  private readonly mistMaxCount = 200;
  private readonly mistPool: PointPool;

  // Shockwaves
  private shockwaves: ShockwaveRing[] = [];
  private shockwaveGeo: THREE.RingGeometry;
  private shockwaveMat: THREE.MeshBasicMaterial;

  /** The level's light on the haze now (see `levelLight`). */
  private readonly hazeTint = new THREE.Color(1, 1, 1);
  private readonly scratch = new THREE.Color();

  private constructor() {
    // Sparks: a quad per spark, its corners across (x) and along (y) the streak.
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0]), 3));
    this.sparkGeo.setIndex([0, 2, 1, 2, 3, 1]);
    this.sparkHead = dynamic(new THREE.InstancedBufferAttribute(new Float32Array(this.sparkMaxCount * 3), 3));
    this.sparkTail = dynamic(new THREE.InstancedBufferAttribute(new Float32Array(this.sparkMaxCount * 3), 3));
    this.sparkColor = dynamic(new THREE.InstancedBufferAttribute(new Float32Array(this.sparkMaxCount * 4), 4));
    this.sparkGeo.setAttribute('aHead', this.sparkHead);
    this.sparkGeo.setAttribute('aTail', this.sparkTail);
    this.sparkGeo.setAttribute('aColor', this.sparkColor);
    this.sparkGeo.instanceCount = 0;
    this.sparkMesh = new THREE.Mesh(this.sparkGeo, new THREE.ShaderMaterial({
      name: 'Sparks',
      vertexShader: SPARK_VERTEX,
      fragmentShader: SPARK_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      side: THREE.DoubleSide,
    }));
    this.sparkMesh.name = 'Sparks';
    this.sparkMesh.frustumCulled = false;
    this.sparkMesh.renderOrder = 5;
    this.sparkMesh.visible = false;

    this.dust = new PointPool('Dust', this.dustMaxCount, HAZE_FRAGMENT, THREE.NormalBlending, 3);
    this.flame = new PointPool('Flames', this.flameMaxCount, FLAME_FRAGMENT, 'additive', 5);
    this.mistPool = new PointPool('Mist', this.mistMaxCount, HAZE_FRAGMENT, THREE.NormalBlending, 2);
    (this.dust.material.uniforms.uTint.value as THREE.Color).copy(this.hazeTint);

    // Shockwave ring setup
    this.shockwaveGeo = new THREE.RingGeometry(0.2, 0.4, 32);
    this.shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  public static getInstance(): ParticleFX {
    if (!ParticleFX.instance) {
      ParticleFX.instance = new ParticleFX();
    }
    return ParticleFX.instance;
  }

  public init(scene: THREE.Scene): void {
    this.scene = scene;
    scene.add(this.sparkMesh, this.dust.points, this.flame.points, this.mistPool.points);
    // Sparks and fire glow in every level (the bloom keeps them selected across level loads).
    const postFX = SceneManager.getInstance().postFX;
    postFX.keepBloom(this.sparkMesh);
    postFX.keepBloom(this.flame.points);
    BloodFX.getInstance().init(scene);
    // The clash's pooled light, with the other lights, before any level's materials are compiled.
    ClashFX.getInstance().init(scene);
  }

  /**
   * Spawn 3D sparks at impact/clash point
   */
  public spawnSparks(origin: THREE.Vector3, count = 35, isGolden = true): void {
    const goldColors = [
      new THREE.Color(0xfff3a1),
      new THREE.Color(0xffcc00),
      new THREE.Color(0xff8800),
      new THREE.Color(0xffffff)
    ];

    const redColors = [
      new THREE.Color(0xff3333),
      new THREE.Color(0xcc1111),
      new THREE.Color(0xff6666)
    ];

    const palette = isGolden ? goldColors : redColors;

    for (let i = 0; i < count; i++) {
      if (this.sparks.length >= this.sparkMaxCount) {
        this.sparks.shift();
      }

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = isGolden ? (4 + Math.random() * 8) : (2 + Math.random() * 5);

      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.cos(phi) * speed + (isGolden ? 2 : 1);
      const vz = Math.sin(phi) * Math.sin(theta) * speed;

      const col = palette[Math.floor(Math.random() * palette.length)].clone();

      this.sparks.push({
        position: origin.clone(),
        velocity: new THREE.Vector3(vx, vy, vz),
        size: isGolden ? 0.016 + Math.random() * 0.014 : 0.012 + Math.random() * 0.008,
        life: 0,
        maxLife: isGolden ? (0.3 + Math.random() * 0.3) : 0.2 + Math.random() * 0.12,
        color: col,
        hot: isGolden,
      });
    }
  }

  /**
   * Chingaari: a spray of sparks thrown along `dir` (unit; the way a blade was travelling as it scraped), within `cone`
   * radians of it, a share `pop` thrown every which way instead (the round pop where the metal met). White-hot at the head,
   * orange down a long tail, falling, and skittering once or twice where they meet `floor` (ClashFX is how a clash gets them).
   */
  public spawnChingaari(origin: THREE.Vector3, dir: THREE.Vector3, o: {
    count: number; cone: number; pop: number; speed: [number, number]; life: [number, number]; size: [number, number];
    streak: number; lift: number; floor?: number;
  }): void {
    // Two axes across the spray.
    const across = Math.abs(dir.y) < 0.9 ? _up : _right;
    _u.crossVectors(dir, across).normalize();
    _v.crossVectors(dir, _u);
    for (let i = 0; i < o.count; i++) {
      if (this.sparks.length >= this.sparkMaxCount) this.sparks.shift();
      let x: number;
      let y: number;
      let z: number;
      if (Math.random() < o.pop) {
        const theta = Math.random() * Math.PI * 2;
        const cosPhi = Math.random() * 2 - 1;
        const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
        x = sinPhi * Math.cos(theta);
        y = cosPhi;
        z = sinPhi * Math.sin(theta);
      } else {
        const a = o.cone * Math.pow(Math.random(), 0.7);
        const t = Math.random() * Math.PI * 2;
        const s = Math.sin(a);
        const c = Math.cos(a);
        const ct = Math.cos(t) * s;
        const st = Math.sin(t) * s;
        x = dir.x * c + _u.x * ct + _v.x * st;
        y = dir.y * c + _u.y * ct + _v.y * st;
        z = dir.z * c + _u.z * ct + _v.z * st;
      }
      const speed = o.speed[0] + (o.speed[1] - o.speed[0]) * Math.pow(Math.random(), 0.8);
      const col = CHINGAARI[Math.floor(Math.random() * CHINGAARI.length)].clone();
      this.sparks.push({
        position: origin.clone(),
        velocity: new THREE.Vector3(x * speed, y * speed + o.lift * Math.random(), z * speed),
        size: o.size[0] + (o.size[1] - o.size[0]) * Math.random(),
        life: 0,
        maxLife: o.life[0] + (o.life[1] - o.life[0]) * Math.random(),
        color: col,
        hot: true,
        streak: o.streak,
        floor: o.floor,
        bounces: 0,
      });
    }
  }

  /**
   * Spawn expanding shockwave ring on deflection parry or boss ground smash
   */
  public spawnDeflectionShockwave(origin: THREE.Vector3, normal?: THREE.Vector3, isFire = false): void {
    if (!this.scene) return;

    const ringMat = this.shockwaveMat.clone();
    if (isFire) {
      ringMat.color.setHex(0xff3300);
    }
    const ring = new THREE.Mesh(this.shockwaveGeo, ringMat);
    ring.position.copy(origin);

    if (normal) {
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.normalize());
    } else {
      ring.rotation.x = -Math.PI / 2;
    }

    this.scene.add(ring);
    this.shockwaves.push({
      mesh: ring,
      life: 0,
      maxLife: isFire ? 0.5 : 0.35,
      startScale: 0.5,
      endScale: isFire ? 6.0 : 3.5
    });
  }

  /**
   * Spawn dust puff for jump landings or heavy footfalls
   */
  public spawnDustPuff(origin: THREE.Vector3, count = 12): void {
    if (this.onGroundImpact?.(origin, count)) return;
    for (let i = 0; i < count; i++) {
      if (this.dustPuffs.length >= this.dustMaxCount) {
        this.dustPuffs.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;

      this.dustPuffs.push({
        position: new THREE.Vector3(
          origin.x + (Math.random() - 0.5) * 0.4,
          origin.y + 0.05,
          origin.z + (Math.random() - 0.5) * 0.4
        ),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          0.3 + Math.random() * 0.4,
          Math.sin(angle) * speed
        ),
        size: 0.22 + Math.random() * 0.2,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
        opacity: 0.34
      });
    }
  }

  /**
   * Spawn flame particles & embers (fire waves, the naga king's second phase, braziers): licks of flame that rise fast,
   * shrink and cool.
   */
  public spawnFlames(origin: THREE.Vector3, count = 8, spread = 0.3): void {
    // Orange through gold (no white: bright as they are, white licks read as glass drops, not fire).
    const fireColors = [
      new THREE.Color(0xff4a10),
      new THREE.Color(0xff7a18),
      new THREE.Color(0xffa830),
      new THREE.Color(0xffc040)
    ];

    for (let i = 0; i < count; i++) {
      if (this.flames.length >= this.flameMaxCount) {
        this.flames.shift();
      }

      const col = fireColors[Math.floor(Math.random() * fireColors.length)].clone();
      this.flames.push({
        position: new THREE.Vector3(
          origin.x + (Math.random() - 0.5) * spread,
          origin.y + (Math.random() - 0.5) * spread,
          origin.z + (Math.random() - 0.5) * spread
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 1.2,
          1.5 + Math.random() * 2.5,
          (Math.random() - 0.5) * 1.2
        ),
        size: 0.12 + Math.random() * 0.12,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.35,
        color: col,
        ember: false,
      });
    }
  }

  /**
   * Embers: small sparks of fire drifting up off a fire (a brazier's coals, a wave of fire) and winking out as they
   * cool; slower and longer-lived than a lick of flame. `lift` scales how fast they rise.
   */
  public spawnEmbers(origin: THREE.Vector3, count = 4, spread = 0.3, lift = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.flames.length >= this.flameMaxCount) this.flames.shift();
      this.flames.push({
        position: new THREE.Vector3(
          origin.x + (Math.random() - 0.5) * spread,
          origin.y + Math.random() * spread * 0.3,
          origin.z + (Math.random() - 0.5) * spread,
        ),
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.6, (0.5 + Math.random() * 1.1) * lift, (Math.random() - 0.5) * 0.6),
        size: 0.025 + Math.random() * 0.025,
        life: 0,
        maxLife: 0.9 + Math.random() * 1.2,
        color: new THREE.Color(1.0, 0.45 + Math.random() * 0.25, 0.08),
        ember: true,
      });
    }
  }

  /**
   * Spawn ambient mist over water ghats in Level 1 Baoli
   */
  public spawnMist(boundsRadius = 12): void {
    if (this.mist.length >= this.mistMaxCount) return;

    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * boundsRadius;
    this.mist.push({
      position: new THREE.Vector3(
        Math.cos(angle) * r,
        0.15 + Math.random() * 0.4,
        Math.sin(angle) * r
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        0.05 + Math.random() * 0.08,
        (Math.random() - 0.5) * 0.3
      ),
      size: 0.9 + Math.random() * 0.7,
      life: 0,
      maxLife: 3.5 + Math.random() * 2.0,
      opacity: 0.16
    });
  }

  /**
   * Update all active particles in the scene
   */
  public update(dt: number): void {
    const gravity = -18;
    BloodFX.getInstance().update(dt);
    // The hit flash on whoever was struck, and the flash of light of a clash.
    HitReact.update(dt);
    ClashFX.getInstance().update(dt);
    this.levelLight();

    // 1. Sparks: they fly, fall and slow in the air; each frame's streak is its last few hundredths of a second.
    const sparkDrag = Math.pow(0.96, dt * 60);
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.sparks.splice(i, 1);
        continue;
      }
      p.velocity.y += gravity * dt;
      p.velocity.x *= sparkDrag;
      p.velocity.z *= sparkDrag;
      p.position.addScaledVector(p.velocity, dt);
      // Chingaari skitter where they meet the floor: up to twice, each time losing most of their pace.
      if (p.floor !== undefined && p.position.y < p.floor && p.velocity.y < 0) {
        p.position.y = p.floor;
        p.velocity.y *= -0.34;
        p.velocity.x *= 0.62;
        p.velocity.z *= 0.62;
        p.bounces = (p.bounces ?? 0) + 1;
        if (p.bounces > 2 || p.velocity.y < 0.7) this.sparks.splice(i, 1);
      }
    }
    const head = this.sparkHead.array as Float32Array;
    const tail = this.sparkTail.array as Float32Array;
    const sparkCol = this.sparkColor.array as Float32Array;
    const col = this.scratch;
    for (let i = 0; i < this.sparks.length; i++) {
      const p = this.sparks[i];
      const k = p.life / p.maxLife;
      head[i * 3] = p.position.x;
      head[i * 3 + 1] = p.position.y;
      head[i * 3 + 2] = p.position.z;
      const streak = STREAK * (p.streak ?? 1);
      tail[i * 3] = p.position.x - p.velocity.x * streak;
      tail[i * 3 + 1] = p.position.y - p.velocity.y * streak;
      tail[i * 3 + 2] = p.position.z - p.velocity.z * streak;
      // Hot sparks start white-hot and well over the bloom's threshold, then cool to orange and red as they die.
      const glow = p.hot ? 3.2 * Math.pow(1 - k, 1.3) + 0.15 : 1.6 * (1 - k) + 0.1;
      col.copy(p.color).lerp(EMBER_RED, Math.pow(k, p.hot ? 0.8 : 1.2)).multiplyScalar(glow);
      sparkCol[i * 4] = col.r;
      sparkCol[i * 4 + 1] = col.g;
      sparkCol[i * 4 + 2] = col.b;
      sparkCol[i * 4 + 3] = p.size * (1 - 0.35 * k);
    }
    this.sparkGeo.instanceCount = this.sparks.length;
    this.sparkMesh.visible = this.sparks.length > 0;
    for (const attr of [this.sparkHead, this.sparkTail, this.sparkColor]) upload(attr, this.sparks.length);

    // 2. Dust: puffs thrown out low, slowing, swelling and fading.
    const dustDrag = Math.pow(0.92, dt * 60);
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const d = this.dustPuffs[i];
      d.life += dt;
      if (d.life >= d.maxLife) {
        this.dustPuffs.splice(i, 1);
        continue;
      }
      d.velocity.y += -1.5 * dt;
      d.velocity.x *= dustDrag;
      d.velocity.z *= dustDrag;
      d.position.addScaledVector(d.velocity, dt);
    }
    this.dust.fill(this.dustPuffs.length, (i, out) => {
      const d = this.dustPuffs[i];
      const k = d.life / d.maxLife;
      out.position.copy(d.position);
      out.color.setRGB(0.66, 0.46, 0.22);
      out.size = d.size * (1 + 0.9 * k);
      out.alpha = d.opacity * Math.min(1, k * 8) * (1 - k) * (1 - k);
    });

    // 3. Flames and embers: licks rise fast, shrink and cool; embers drift up, flicker and wink out.
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      f.life += dt;
      if (f.life >= f.maxLife) {
        this.flames.splice(i, 1);
        continue;
      }
      const wander = f.ember ? 1.2 : 2;
      f.velocity.x += (Math.random() - 0.5) * wander * dt;
      f.velocity.z += (Math.random() - 0.5) * wander * dt;
      if (f.ember) f.velocity.y *= Math.pow(0.985, dt * 60);
      f.position.addScaledVector(f.velocity, dt);
    }
    this.flame.fill(this.flames.length, (i, out) => {
      const f = this.flames[i];
      const k = f.life / f.maxLife;
      out.position.copy(f.position);
      if (f.ember) {
        // A bright orange point that flickers as it cools to red and goes out.
        const flick = 0.75 + 0.25 * Math.sin(f.life * 31 + i * 1.7);
        out.color.copy(f.color).lerp(EMBER_RED, k).multiplyScalar(2.6 * (1 - k * k) * flick);
        out.size = f.size * (1 - 0.4 * k);
        out.alpha = 0;
      } else {
        // A lick of flame: gold at birth, orange, then dull red, shrinking as it goes.
        out.color.copy(f.color).lerp(EMBER_RED, Math.pow(k, 0.7)).multiplyScalar(1.6 * Math.pow(1 - k, 1.2) + 0.05);
        out.size = f.size * (1 - 0.55 * k);
        out.alpha = 1;
      }
    });

    // 4. Mist: drifting slowly up, fading in and out.
    for (let i = this.mist.length - 1; i >= 0; i--) {
      const m = this.mist[i];
      m.life += dt;
      if (m.life >= m.maxLife) {
        this.mist.splice(i, 1);
        continue;
      }
      m.position.addScaledVector(m.velocity, dt);
    }
    this.mistPool.fill(this.mist.length, (i, out) => {
      const m = this.mist[i];
      const k = m.life / m.maxLife;
      out.position.copy(m.position);
      out.color.setRGB(0.28, 0.46, 0.63);
      out.size = m.size * (1 + 0.35 * k);
      out.alpha = m.opacity * THREE.MathUtils.smoothstep(k, 0, 0.25) * (1 - THREE.MathUtils.smoothstep(k, 0.55, 1));
    });

    // 5. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        if (this.scene) this.scene.remove(s.mesh);
        (s.mesh.material as THREE.Material).dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }
      const progress = s.life / s.maxLife;
      const currentScale = s.startScale + (s.endScale - s.startScale) * Math.sin(progress * Math.PI * 0.5);
      s.mesh.scale.set(currentScale, currentScale, currentScale);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.9;
    }
  }

  /**
   * The level's light on dust and mist, roughly what a pale surface facing the sky would catch (the ambient, the sky's
   * hemisphere and a share of the key): a dusk courtyard's dust stays warm and bright, the Baoli's mist moonlit blue,
   * the island's cave dust nearly black.
   */
  private levelLight(): void {
    const sm = SceneManager.getInstance();
    const t = this.hazeTint.setRGB(0, 0, 0);
    t.add(this.scratch.copy(sm.ambientLight.color).multiplyScalar(sm.ambientLight.intensity));
    t.add(this.scratch.copy(sm.hemiLight.color).multiplyScalar(sm.hemiLight.intensity * 0.7));
    t.add(this.scratch.copy(sm.dirLight.color).multiplyScalar(sm.dirLight.intensity * 0.25));
    t.r = Math.min(t.r, 1.2);
    t.g = Math.min(t.g, 1.2);
    t.b = Math.min(t.b, 1.2);
    (this.dust.material.uniforms.uTint.value as THREE.Color).copy(t);
    (this.mistPool.material.uniforms.uTint.value as THREE.Color).copy(t);
  }
}

/** One kind of point particle: its buffers (filled from the front each frame) and its draw (only the live part). */
class PointPool {
  public readonly points: THREE.Points;
  public readonly material: THREE.ShaderMaterial;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly position: THREE.BufferAttribute;
  private readonly color: THREE.BufferAttribute;
  private readonly size: THREE.BufferAttribute;
  private readonly alpha: THREE.BufferAttribute;
  private readonly out = { position: new THREE.Vector3(), color: new THREE.Color(), size: 0, alpha: 0 };

  constructor(name: string, max: number, fragmentShader: string, blending: THREE.Blending | 'additive', renderOrder: number) {
    this.position = dynamic(new THREE.BufferAttribute(new Float32Array(max * 3), 3));
    this.color = dynamic(new THREE.BufferAttribute(new Float32Array(max * 3), 3));
    this.size = dynamic(new THREE.BufferAttribute(new Float32Array(max), 1));
    this.alpha = dynamic(new THREE.BufferAttribute(new Float32Array(max), 1));
    this.geometry.setAttribute('position', this.position);
    this.geometry.setAttribute('aColor', this.color);
    this.geometry.setAttribute('aSize', this.size);
    this.geometry.setAttribute('aAlpha', this.alpha);
    this.geometry.setDrawRange(0, 0);
    const uniforms = { uHeight: { value: 900 }, uTint: { value: new THREE.Color(1, 1, 1) } };
    this.material = new THREE.ShaderMaterial({
      name,
      uniforms,
      vertexShader: POINT_VERTEX,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      ...(blending === 'additive'
        ? { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }
        : { blending }),
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = name;
    this.points.frustumCulled = false;
    this.points.renderOrder = renderOrder;
    this.points.visible = false;
    // Sizes are metres: the drawing buffer's height turns them into pixels (as BloodFX's drops).
    const drawing = new THREE.Vector2();
    this.points.onBeforeRender = (renderer) => {
      uniforms.uHeight.value = renderer.getDrawingBufferSize(drawing).y;
    };
  }

  /** Writes `count` particles (`each` fills one) and draws only those. */
  public fill(count: number, each: (i: number, out: { position: THREE.Vector3; color: THREE.Color; size: number; alpha: number }) => void): void {
    const pos = this.position.array as Float32Array;
    const col = this.color.array as Float32Array;
    const size = this.size.array as Float32Array;
    const alpha = this.alpha.array as Float32Array;
    const out = this.out;
    for (let i = 0; i < count; i++) {
      each(i, out);
      pos[i * 3] = out.position.x;
      pos[i * 3 + 1] = out.position.y;
      pos[i * 3 + 2] = out.position.z;
      col[i * 3] = out.color.r;
      col[i * 3 + 1] = out.color.g;
      col[i * 3 + 2] = out.color.b;
      size[i] = out.size;
      alpha[i] = out.alpha;
    }
    this.geometry.setDrawRange(0, count);
    this.points.visible = count > 0;
    for (const attr of [this.position, this.color, this.size, this.alpha]) upload(attr, count);
  }
}

function dynamic<T extends THREE.BufferAttribute>(attr: T): T {
  attr.setUsage(THREE.DynamicDrawUsage);
  return attr;
}

/** Uploads only the first `count` items of a per-frame buffer (nothing when none are alive). */
function upload(attr: THREE.BufferAttribute, count: number): void {
  if (count <= 0) return;
  attr.clearUpdateRanges();
  attr.addUpdateRange(0, count * attr.itemSize);
  attr.needsUpdate = true;
}

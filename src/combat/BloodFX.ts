import * as THREE from 'three';
import { Settings, type GoreLevel } from '../core/Settings';
import { CharacterMotor } from '../physics/CharacterMotor';

/**
 * Toon blood (docs/STORY.md, "Blood"; approved as option A in docs/APPROVALS.md): hard-edged ink droplets that spray
 * off a blow along its line, more and faster for more damage, and at Full splats on the ground that spread in, lie a
 * while and dry away from their edges. What bleeds what (`Enemy.blood`): men, rakshasas, asuras and Andhaka dark red;
 * Takshaka and the island's cave creatures a green-black ichor; the Vetala no blood at all but a puff of grave-ash;
 * the sparring vanara and the shades nothing.
 *
 * The amount follows the Gore setting (Off / Low / Full, Low by default). Splats are laid on the level's real ground
 * (a ray down to its colliders, turned to its slope, and made smaller or left out where they would hang over a step's
 * edge). In the rain (Dwarka) they wash out: they spread wider, thin and go sooner. Story scenes draw no blood unless a
 * cue spills it (`spill(..., { scripted: true })`), and the fight's blood is cleared as a scene begins.
 *
 * Cost: two draw calls in all (one Points for every droplet, one InstancedMesh for every splat), fixed buffers; one
 * short ray per blow, and at most thirteen more per splat, only when one is laid.
 */
export type BloodKind = 'red' | 'ichor' | 'ash' | 'none';
export type { GoreLevel };
/** The level a new player starts at (the Gore setting's default). */
export const BLOOD_DEFAULT: GoreLevel = 'low';

const PALETTE: Record<Exclude<BloodKind, 'none'>, number[]> = {
  red: [0x2a0303, 0x3d0606, 0x520909],
  ichor: [0x0a1207, 0x131e0c, 0x1f2c12],
  ash: [0x2e2b28, 0x4a4540, 0x6a645c],
};

const MAX_DROPS = 400;
const MAX_SPLATS = 32;
/** Seconds a splat lies before it starts to dry, and how long drying takes; in the rain, both shorter. */
const SPLAT_LIFE = 7;
const SPLAT_DRY = 1.8;
const WET_LIFE = 3.2;
const WET_DRY = 1.3;
/** In the rain a splat spreads this much wider as it washes out. */
const WET_SPREAD = 0.45;
const UP = new THREE.Vector3(0, 1, 0);

interface Drop {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
  life: number;
  max: number;
  ground: number;
  color: THREE.Color;
  /** Ash rises and drifts instead of falling. */
  ash: boolean;
}

interface Splat {
  age: number;
  /** Seconds before it appears (the droplets landing). */
  wait: number;
  pos: THREE.Vector3;
  /** Laid flat on the ground's slope, turned at random about it. */
  quat: THREE.Quaternion;
  sx: number;
  sz: number;
  color: THREE.Color;
  variant: number;
  /** Laid in the rain: it washes out. */
  wet: boolean;
}

const lifeOf = (s: Splat) => (s.wet ? WET_LIFE + WET_DRY : SPLAT_LIFE + SPLAT_DRY);
/** Scratch for the per-frame splat matrices. */
const scratch = { m: new THREE.Matrix4(), s: new THREE.Vector3() };

export class BloodFX {
  private static instance: BloodFX | null = null;
  /** A dev override of the Gore setting (`__debug.blood`), until the setting next changes. */
  private override: GoreLevel | null = null;
  /** In a story scene: blows draw no blood unless a cue asks for it. */
  public suppressed = false;
  /** It is raining where the blood falls (Dwarka): splats wash out sooner. */
  public wet = false;

  private drops: Drop[] = [];
  private readonly dropGeo = new THREE.BufferGeometry();
  private readonly dropPos = new Float32Array(MAX_DROPS * 3);
  private readonly dropCol = new Float32Array(MAX_DROPS * 3);
  private readonly dropSize = new Float32Array(MAX_DROPS);
  private readonly dropPoints: THREE.Points;

  private splats: Splat[] = [];
  private readonly splatMesh: THREE.InstancedMesh;
  private readonly splatTint: THREE.InstancedBufferAttribute;
  private readonly splatErode: THREE.InstancedBufferAttribute;
  private readonly splatVariant: THREE.InstancedBufferAttribute;
  private readonly splatWash: THREE.InstancedBufferAttribute;

  private constructor() {
    Settings.onChange(() => {
      this.override = null;
    });
    this.dropGeo.setAttribute('position', new THREE.BufferAttribute(this.dropPos, 3));
    this.dropGeo.setAttribute('color', new THREE.BufferAttribute(this.dropCol, 3));
    this.dropGeo.setAttribute('size', new THREE.BufferAttribute(this.dropSize, 1));
    const dropUniforms = { uHeight: { value: 900 } };
    this.dropPoints = new THREE.Points(this.dropGeo, new THREE.ShaderMaterial({
      uniforms: dropUniforms,
      vertexShader: /* glsl */ `
        uniform float uHeight;
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          // size is the drop's width in metres.
          gl_PointSize = size * projectionMatrix[1][1] * 0.5 * uHeight / max(0.1, -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          if (dot(d, d) > 0.25) discard;
          // A flat ink drop with a darker rim: reads as cel-shaded, not as a glowing particle.
          float rim = smoothstep(0.12, 0.25, dot(d, d));
          gl_FragColor = vec4(vColor * (0.7 - 0.35 * rim), 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    this.dropPoints.frustumCulled = false;
    const size = new THREE.Vector2();
    this.dropPoints.onBeforeRender = (renderer) => {
      dropUniforms.uHeight.value = renderer.getDrawingBufferSize(size).y;
    };
    this.dropPoints.renderOrder = 2;

    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    this.splatTint = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SPLATS * 3), 3);
    this.splatErode = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SPLATS), 1);
    this.splatVariant = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SPLATS), 1);
    this.splatWash = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SPLATS), 1);
    geo.setAttribute('aTint', this.splatTint);
    geo.setAttribute('aErode', this.splatErode);
    geo.setAttribute('aVariant', this.splatVariant);
    geo.setAttribute('aWash', this.splatWash);
    const material = new THREE.ShaderMaterial({
      uniforms: { map: { value: makeSplatAtlas() } },
      vertexShader: /* glsl */ `
        attribute vec3 aTint;
        attribute float aErode;
        attribute float aVariant;
        attribute float aWash;
        varying vec2 vUv;
        varying vec3 vTint;
        varying float vErode;
        varying float vWash;
        void main() {
          vec2 cell = vec2(mod(aVariant, 2.0), floor(aVariant / 2.0)) * 0.5;
          vUv = cell + uv * 0.5;
          vTint = aTint;
          vErode = aErode;
          vWash = aWash;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        varying vec2 vUv;
        varying vec3 vTint;
        varying float vErode;
        varying float vWash;
        void main() {
          float a = texture2D(map, vUv).a;
          // Hard-edged (toon): the splat is wherever its density clears the erosion threshold, so it spreads in
          // and dries away from the edges.
          if (a < vErode) discard;
          float edge = smoothstep(vErode, vErode + 0.08, a);
          // In the rain (vWash >= 0): darker on the wet stone at first (Dwarka's grade is brighter than the toon
          // levels'), then washed thinner and paler, the stone showing through. Dry splats have vWash < 0.
          float wet = step(0.0, vWash);
          float wash = max(vWash, 0.0);
          vec3 col = vTint * (0.7 + 0.3 * edge) * mix(1.0, 0.45 + 0.5 * wash, wet);
          gl_FragColor = vec4(col, 1.0 - 0.6 * wash);
          #include <colorspace_fragment>
        }`,
      depthWrite: false,
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.splatMesh = new THREE.InstancedMesh(geo, material, MAX_SPLATS);
    this.splatMesh.count = 0;
    this.splatMesh.frustumCulled = false;
    this.splatMesh.renderOrder = 1;
  }

  public static getInstance(): BloodFX {
    if (!BloodFX.instance) BloodFX.instance = new BloodFX();
    return BloodFX.instance;
  }

  public init(scene: THREE.Scene): void {
    scene.add(this.dropPoints);
    scene.add(this.splatMesh);
  }

  /** The Gore setting (or a dev override of it). */
  public get level(): GoreLevel {
    return this.override ?? Settings.get().gore;
  }

  /** Dev: a gore level for this session (`__debug.blood`), not saved; null goes back to the setting. */
  public set level(level: GoreLevel | null) {
    this.override = level;
  }

  public get enabled(): boolean {
    return this.level !== 'off';
  }

  /** Whether a blow on something that bleeds `kind` draws blood now (the fight's red sparks give way to it). */
  public bleeds(kind: BloodKind): boolean {
    return this.enabled && kind !== 'none' && !this.suppressed;
  }

  /**
   * A blow lands: blood (or ash) sprays from `point` along `dir` (the blow's travel, flattened), more for more
   * `damage` and on a killing blow; at Full a splat lands on the ground beyond it. `ground` is the victim's feet, used
   * where no ground is found below. Nothing in a story scene unless `scripted`. `thin`: a slice's spray, a narrow, quick
   * jet along the cut rather than a spread.
   */
  public spill(point: THREE.Vector3, dir: THREE.Vector3, damage: number, kind: BloodKind, ground: number, kill = false,
    opts: { scripted?: boolean; thin?: boolean } = {}): void {
    if (this.level === 'off' || kind === 'none' || (this.suppressed && !opts.scripted)) return;
    const full = this.level === 'full';
    const ash = kind === 'ash';
    const palette = PALETTE[kind];
    const flat = new THREE.Vector3(dir.x, 0, dir.z);
    if (flat.lengthSq() < 1e-4) flat.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    flat.normalize();
    const side = new THREE.Vector3(-flat.z, 0, flat.x);
    // Drops end on the real ground below the blow (a step down, a slope), not at the victim's feet.
    const below = ash ? null : CharacterMotor.groundBelow(new THREE.Vector3(point.x, Math.max(point.y, ground + 0.6), point.z), 4);
    const dropGround = below ?? ground;
    let count = full ? 10 + damage * 0.55 : 5 + damage * 0.2;
    if (kill) count *= 1.6;
    count = Math.min(full ? 46 : 16, Math.round(count));
    for (let i = 0; i < count; i++) {
      if (this.drops.length >= MAX_DROPS) this.drops.shift();
      const speed = (ash ? 0.5 + Math.random() * 1.1 : 2.4 + Math.random() * (3 + damage * 0.05)) * (opts.thin && !ash ? 1.3 : 1);
      const vel = flat.clone().multiplyScalar(speed)
        .addScaledVector(side, (Math.random() - 0.5) * speed * (opts.thin ? 0.3 : 0.9))
        .add(new THREE.Vector3(0, ash ? 0.5 + Math.random() * 0.8 : opts.thin ? 0.4 + Math.random() * 1.4 : 0.8 + Math.random() * 2.2, 0));
      const big = Math.random() < 0.25;
      this.drops.push({
        pos: point.clone().addScaledVector(side, (Math.random() - 0.5) * (opts.thin ? 0.12 : 0.35)).add(new THREE.Vector3(0, (Math.random() - 0.5) * 0.25, 0)),
        vel,
        // Low: fewer, and smaller.
        size: (ash ? 0.05 + Math.random() * 0.07 : (big ? 0.06 : 0.03) + Math.random() * 0.03) * (full || ash ? 1 : 0.8),
        life: 0,
        max: ash ? 0.9 + Math.random() * 0.6 : 0.5 + Math.random() * 0.45,
        ground: dropGround,
        color: new THREE.Color(palette[Math.floor(Math.random() * palette.length)]),
        ash,
      });
    }
    if (!full || ash) return;
    const splats = kill ? 2 : damage >= 25 ? 1 : Math.random() < 0.6 ? 1 : 0;
    // Rays start well above the ground the blow fell on (a stair climbs away from it), and a splat lands no further
    // up or down from it than a fighter could have stood (not on a roof overhead, not at the foot of a cliff).
    const base = Math.max(dropGround, ground);
    const top = base + 2.2;
    for (let i = 0; i < splats; i++) {
      const at = new THREE.Vector3(point.x, top, point.z)
        .addScaledVector(flat, 0.35 + Math.random() * 0.7 + i * 0.5)
        .addScaledVector(side, (Math.random() - 0.5) * 0.6);
      const want = Math.min(1.5, 0.45 + damage * 0.018 + Math.random() * 0.25) * (kill && i === 0 ? 1.3 : 1);
      const laid = this.findGround(at, want);
      if (!laid || laid.y > base + 1.6 || laid.y < base - 1.5) continue;
      if (this.splats.length >= MAX_SPLATS) this.splats.shift();
      const quat = new THREE.Quaternion().setFromUnitVectors(UP, laid.normal)
        .multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.random() * Math.PI * 2));
      this.splats.push({
        age: 0, wait: 0.12 + i * 0.1 + Math.random() * 0.1,
        pos: at.setY(laid.y).addScaledVector(laid.normal, 0.012), quat,
        sx: laid.size, sz: laid.size * (0.8 + Math.random() * 0.4),
        color: new THREE.Color(palette[0]).lerp(new THREE.Color(palette[1]), Math.random()),
        variant: Math.floor(Math.random() * 4),
        wet: this.wet,
      });
    }
  }

  /**
   * The ground under `at` (from its height down) for a splat about `size` across: its height and normal, and the size
   * that lies flat there. A splat that would hang over a step's edge or a drop is made smaller (down to one that fits
   * a stair's tread), or left out.
   */
  private findGround(at: THREE.Vector3, size: number): { y: number; normal: THREE.Vector3; size: number } | null {
    const normal = new THREE.Vector3();
    const y = CharacterMotor.groundBelow(at, 4, normal);
    // Nothing below, or a wall or a steep face: no splat.
    if (y === null || normal.y < 0.7) return null;
    const probe = new THREE.Vector3();
    const corners = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const s of [size, size * 0.55, Math.min(size, 0.3)]) {
      const r = s * 0.42;
      const lies = corners.every(([dx, dz]) => {
        probe.set(at.x + dx * r, y + 0.4, at.z + dz * r);
        const there = CharacterMotor.groundBelow(probe, 0.8);
        // Where the slope through the centre says the ground should be.
        const expected = y - (normal.x * dx * r + normal.z * dz * r) / normal.y;
        return there !== null && Math.abs(there - expected) < 0.05;
      });
      if (lies) return { y, normal, size: s };
    }
    return null;
  }

  /** Clears everything on the ground and in the air (a chapter change, a story scene beginning). */
  public clear(): void {
    this.drops = [];
    this.splats = [];
    this.splatMesh.count = 0;
    for (let i = 0; i < MAX_DROPS; i++) this.dropSize[i] = 0;
    this.dropGeo.attributes.size.needsUpdate = true;
  }

  /** How many drops are in the air and splats on the ground, and where the splats lie (dev checks). */
  public get counts(): { drops: number; splats: number; at: number[][] } {
    return {
      drops: this.drops.length, splats: this.splats.length,
      at: this.splats.map((s) => [+s.pos.x.toFixed(2), +s.pos.y.toFixed(3), +s.pos.z.toFixed(2), +s.sx.toFixed(2)]),
    };
  }

  public update(dt: number): void {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.life += dt;
      if (d.ash) {
        d.vel.multiplyScalar(1 - 1.8 * dt);
        d.vel.y += 0.6 * dt;
      } else {
        d.vel.y -= 15 * dt;
      }
      d.pos.addScaledVector(d.vel, dt);
      if (d.life >= d.max || (!d.ash && d.pos.y < d.ground)) this.drops.splice(i, 1);
    }
    for (let i = 0; i < MAX_DROPS; i++) {
      const d = this.drops[i];
      if (d) {
        this.dropPos.set([d.pos.x, d.pos.y, d.pos.z], i * 3);
        this.dropCol.set([d.color.r, d.color.g, d.color.b], i * 3);
        const k = d.life / d.max;
        // Drops thin as they fly; ash swells as it rises.
        this.dropSize[i] = d.ash ? d.size * (0.6 + 1.2 * k) * (1 - k * k) : d.size * (1 - 0.5 * k);
      } else {
        this.dropSize[i] = 0;
        this.dropPos[i * 3 + 1] = -9999;
      }
    }
    for (const name of ['position', 'color', 'size']) this.dropGeo.attributes[name].needsUpdate = true;

    let n = 0;
    for (let i = 0; i < this.splats.length; i++) {
      const s = this.splats[i];
      s.age += dt;
      const t = s.age - s.wait;
      const life = s.wet ? WET_LIFE : SPLAT_LIFE;
      const dry = s.wet ? WET_DRY : SPLAT_DRY;
      if (t < 0 || t > life + dry) continue;
      // Spreads in over a quarter second (erosion 0.95 -> 0.35), lies, then dries from its edges.
      const erode = t < 0.25 ? 0.95 - (t / 0.25) * 0.6 : t < life ? 0.35 : 0.35 + ((t - life) / dry) * 0.65;
      // In the rain the water carries it wider as it thins.
      const wash = s.wet ? Math.min(1, t / (life + dry)) : -1;
      const grow = 1 + WET_SPREAD * Math.max(0, wash);
      scratch.m.compose(s.pos, s.quat, scratch.s.set(s.sx * grow, 1, s.sz * grow));
      this.splatMesh.setMatrixAt(n, scratch.m);
      this.splatTint.setXYZ(n, s.color.r, s.color.g, s.color.b);
      this.splatErode.setX(n, erode);
      this.splatVariant.setX(n, s.variant);
      this.splatWash.setX(n, wash);
      n++;
    }
    if (this.splats.some((s) => s.age - s.wait > lifeOf(s))) this.splats = this.splats.filter((s) => s.age - s.wait <= lifeOf(s));
    this.splatMesh.count = n;
    this.splatMesh.instanceMatrix.needsUpdate = true;
    this.splatTint.needsUpdate = true;
    this.splatErode.needsUpdate = true;
    this.splatVariant.needsUpdate = true;
    this.splatWash.needsUpdate = true;
  }
}

/**
 * Four splat shapes in a 2x2 atlas, as density in the alpha: a main pool of overlapping blobs, densest in the middle,
 * with a few flung droplets and a streak, and some grain so it dries unevenly.
 */
function makeSplatAtlas(): THREE.CanvasTexture {
  const cell = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = cell * 2;
  const ctx = canvas.getContext('2d')!;
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const blob = (x: number, y: number, r: number, density: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${density})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  for (let v = 0; v < 4; v++) {
    const ox = (v % 2) * cell;
    const oy = Math.floor(v / 2) * cell;
    const cx = ox + cell / 2;
    const cy = oy + cell / 2;
    for (let i = 0; i < 7; i++) {
      blob(cx + (rnd() - 0.5) * 34, cy + (rnd() - 0.5) * 34, 18 + rnd() * 16, 0.55);
    }
    // Flung drops, and a streak toward one side.
    const ang = rnd() * Math.PI * 2;
    for (let i = 0; i < 9; i++) {
      const a = ang + (rnd() - 0.5) * 1.6;
      const r = 34 + rnd() * 24;
      blob(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3 + rnd() * 5, 0.9);
    }
    for (let i = 0; i < 6; i++) blob(cx + Math.cos(ang) * (16 + i * 6), cy + Math.sin(ang) * (16 + i * 6), 9 - i, 0.8);
  }
  // Grain.
  const img = ctx.getImageData(0, 0, cell * 2, cell * 2);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = Math.max(0, img.data[i] - rnd() * 22);
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.premultiplyAlpha = false;
  return tex;
}

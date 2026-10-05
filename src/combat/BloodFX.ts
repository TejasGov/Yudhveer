import * as THREE from 'three';

/**
 * PROTOTYPE, off until the user approves (docs/APPROVALS.md, "Blood"). Toon blood: hard-edged ink droplets that spray
 * off a blow along its line, sized by the damage, and short-lived splats on the ground that dry away from their
 * edges. What bleeds what: men and rakshasas dark red, nagas and the cave creatures a green-black ichor, ghosts
 * (the Vetala) no blood at all but a puff of ash.
 *
 * Cost: two draw calls in all (one Points for every droplet, one InstancedMesh for every splat), fixed buffers, no
 * allocation per hit after warm-up.
 */
export type BloodKind = 'red' | 'ichor' | 'ash' | 'none';
/** Off; Low (droplets only, fewer); Full (more droplets, and splats on the ground). */
export type GoreLevel = 'off' | 'low' | 'full';
/** The level a new game starts at. Off until approved. */
export const BLOOD_DEFAULT: GoreLevel = 'off';

const PALETTE: Record<Exclude<BloodKind, 'none'>, number[]> = {
  red: [0x2a0303, 0x3d0606, 0x520909],
  ichor: [0x0a1207, 0x131e0c, 0x1f2c12],
  ash: [0x2e2b28, 0x4a4540, 0x6a645c],
};

const MAX_DROPS = 400;
const MAX_SPLATS = 32;
/** Seconds a splat lies before it starts to dry, and how long drying takes. */
const SPLAT_LIFE = 7;
const SPLAT_DRY = 1.8;

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
  matrix: THREE.Matrix4;
  color: THREE.Color;
  variant: number;
}

export class BloodFX {
  private static instance: BloodFX | null = null;
  public level: GoreLevel = BLOOD_DEFAULT;

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

  private constructor() {
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
    geo.setAttribute('aTint', this.splatTint);
    geo.setAttribute('aErode', this.splatErode);
    geo.setAttribute('aVariant', this.splatVariant);
    const material = new THREE.ShaderMaterial({
      uniforms: { map: { value: makeSplatAtlas() } },
      vertexShader: /* glsl */ `
        attribute vec3 aTint;
        attribute float aErode;
        attribute float aVariant;
        varying vec2 vUv;
        varying vec3 vTint;
        varying float vErode;
        void main() {
          vec2 cell = vec2(mod(aVariant, 2.0), floor(aVariant / 2.0)) * 0.5;
          vUv = cell + uv * 0.5;
          vTint = aTint;
          vErode = aErode;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        varying vec2 vUv;
        varying vec3 vTint;
        varying float vErode;
        void main() {
          float a = texture2D(map, vUv).a;
          // Hard-edged (toon): the splat is wherever its density clears the erosion threshold, so it spreads in
          // and dries away from the edges.
          if (a < vErode) discard;
          float edge = smoothstep(vErode, vErode + 0.08, a);
          gl_FragColor = vec4(vTint * (0.7 + 0.3 * edge), 1.0);
          #include <colorspace_fragment>
        }`,
      depthWrite: false,
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

  public get enabled(): boolean {
    return this.level !== 'off';
  }

  /**
   * A blow lands: blood (or ash) sprays from `point` along `dir` (the blow's travel, flattened), more for more
   * `damage` and on a killing blow; at Full a splat lands on the ground (`ground`, the victim's feet) beyond it.
   */
  public spill(point: THREE.Vector3, dir: THREE.Vector3, damage: number, kind: BloodKind, ground: number, kill = false): void {
    if (this.level === 'off' || kind === 'none') return;
    const full = this.level === 'full';
    const ash = kind === 'ash';
    const palette = PALETTE[kind];
    const flat = new THREE.Vector3(dir.x, 0, dir.z);
    if (flat.lengthSq() < 1e-4) flat.set(Math.random() - 0.5, 0, Math.random() - 0.5);
    flat.normalize();
    const side = new THREE.Vector3(-flat.z, 0, flat.x);
    let count = full ? 10 + damage * 0.55 : 5 + damage * 0.2;
    if (kill) count *= 1.6;
    count = Math.min(full ? 46 : 16, Math.round(count));
    for (let i = 0; i < count; i++) {
      if (this.drops.length >= MAX_DROPS) this.drops.shift();
      const speed = ash ? 0.5 + Math.random() * 1.1 : 2.4 + Math.random() * (3 + damage * 0.05);
      const vel = flat.clone().multiplyScalar(speed)
        .addScaledVector(side, (Math.random() - 0.5) * speed * 0.9)
        .add(new THREE.Vector3(0, ash ? 0.5 + Math.random() * 0.8 : 0.8 + Math.random() * 2.2, 0));
      const big = Math.random() < 0.25;
      this.drops.push({
        pos: point.clone().addScaledVector(side, (Math.random() - 0.5) * 0.35).add(new THREE.Vector3(0, (Math.random() - 0.5) * 0.25, 0)),
        vel,
        size: ash ? 0.05 + Math.random() * 0.07 : (big ? 0.06 : 0.03) + Math.random() * 0.03,
        life: 0,
        max: ash ? 0.9 + Math.random() * 0.6 : 0.5 + Math.random() * 0.45,
        ground,
        color: new THREE.Color(palette[Math.floor(Math.random() * palette.length)]),
        ash,
      });
    }
    if (!full || ash) return;
    const splats = kill ? 2 : damage >= 25 ? 1 : Math.random() < 0.6 ? 1 : 0;
    for (let i = 0; i < splats; i++) {
      const at = new THREE.Vector3(point.x, ground + 0.015, point.z)
        .addScaledVector(flat, 0.35 + Math.random() * 0.7 + i * 0.5)
        .addScaledVector(side, (Math.random() - 0.5) * 0.6);
      const size = Math.min(1.5, 0.45 + damage * 0.018 + Math.random() * 0.25) * (kill && i === 0 ? 1.3 : 1);
      const m = new THREE.Matrix4().compose(
        at, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2),
        new THREE.Vector3(size, 1, size * (0.8 + Math.random() * 0.4)),
      );
      if (this.splats.length >= MAX_SPLATS) this.splats.shift();
      this.splats.push({
        age: 0, wait: 0.12 + i * 0.1 + Math.random() * 0.1, matrix: m,
        color: new THREE.Color(palette[0]).lerp(new THREE.Color(palette[1]), Math.random()),
        variant: Math.floor(Math.random() * 4),
      });
    }
  }

  /** Clears everything on the ground and in the air (a chapter change). */
  public clear(): void {
    this.drops = [];
    this.splats = [];
    this.splatMesh.count = 0;
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
      if (t > SPLAT_LIFE + SPLAT_DRY) continue;
      if (t < 0) continue;
      // Spreads in over a quarter second (erosion 0.95 -> 0.35), lies, then dries from its edges.
      const erode = t < 0.25 ? 0.95 - (t / 0.25) * 0.6 : t < SPLAT_LIFE ? 0.35 : 0.35 + ((t - SPLAT_LIFE) / SPLAT_DRY) * 0.65;
      this.splatMesh.setMatrixAt(n, s.matrix);
      this.splatTint.setXYZ(n, s.color.r, s.color.g, s.color.b);
      this.splatErode.setX(n, erode);
      this.splatVariant.setX(n, s.variant);
      n++;
    }
    this.splats = this.splats.filter((s) => s.age - s.wait <= SPLAT_LIFE + SPLAT_DRY);
    this.splatMesh.count = n;
    this.splatMesh.instanceMatrix.needsUpdate = true;
    this.splatTint.needsUpdate = true;
    this.splatErode.needsUpdate = true;
    this.splatVariant.needsUpdate = true;
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

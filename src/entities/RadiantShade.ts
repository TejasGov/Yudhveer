import * as THREE from 'three';
import { createToonRamp } from '../levels/environment/ToonRelight';

/**
 * How a radiant shade is drawn: the released human soul of Chapter III (`CastMember.shade.radiant`). Where the grey
 * ghost wash makes a pale see-through figure, this is a body of moonlight: silver in its shadows, pale gold where it
 * is lit, a soft rim at its edges and a gentle glow from within, drawn OPAQUE (so no hair, saree or back face ever
 * shows through another, as it does through a translucent body) and faded in or out by dissolving from the feet up,
 * with a bright edge. The saree's red is drawn down to its brightness (no stains); the face keeps its own detail.
 *
 * It also brings what a glowing figure gives off: ONE point light that follows her (made with the chapter and kept
 * switched on at no intensity, so it never changes the scene's light count and recompiles every shader as she
 * appears), a faint halo behind her, rising motes and a faint trail at her steps. Everything is allocated once; a
 * step allocates nothing.
 */
export interface Radiance {
  /** The pale gold of her lit side (the shade's own `color` is the silver of her shadows). */
  gold?: THREE.ColorRepresentation;
  /** How much of her colour she gives off from within (0..1.5; 0.6 default). */
  glow?: number;
  /** How much of the place's light she takes (0..1, 0.5 default): she carries her own, so the cave's does not burn her out. */
  lit?: number;
  /** The soft fresnel rim, its colour, strength and sharpness. */
  rim?: THREE.ColorRepresentation;
  rimStrength?: number;
  rimPower?: number;
  /** The share of the figure's own texture colour kept (the face): 0 is all moonlight, 1 all texture. */
  own?: number;
  /** The slow shimmer, 0 for none (0.1 default). */
  shimmer?: number;
  /** The light that follows her. `intensity` 0 for none. */
  light?: { color?: THREE.ColorRepresentation; cool?: THREE.ColorRepresentation; intensity?: number; distance?: number; height?: number };
  /** Motes rising off her per second (on top of Shade.ts's own), at full presence. */
  motes?: number;
  /** The halo behind her: its opacity (0 for none). */
  aura?: number;
  /** Wisps left at her steps, per second per planted foot. */
  trail?: number;
}

const MAX_PARTICLES = 192;
const FEET = ['LeftToeBase', 'RightToeBase'] as const;

/** The uniforms every radiant material of one shade shares (one object, so a step sets them once). */
interface Uniforms {
  uTime: THREE.IUniform<number>;
  uReveal: THREE.IUniform<number>;
  uBaseY: THREE.IUniform<number>;
  uHeight: THREE.IUniform<number>;
  uGlow: THREE.IUniform<number>;
  [key: string]: THREE.IUniform;
}

/** A soft radial falloff, procedural (no canvas, so it needs no browser). */
function softDisc(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot((x + 0.5) / size - 0.5, (y + 0.5) / size - 0.5) * 2;
      const a = Math.pow(Math.max(0, 1 - d), 2.2);
      data.set([255, 255, 255, Math.round(a * 255)], (y * size + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class RadiantShade {
  private readonly uniforms: Uniforms;
  private readonly materials: THREE.MeshToonMaterial[] = [];
  private readonly ramp = createToonRamp([0.34, 0.62, 0.86, 1]);
  private readonly light: THREE.PointLight | null;
  private readonly warm = new THREE.Color();
  private readonly cool = new THREE.Color();
  private readonly lightBase: number;
  private readonly lightHeight: number;
  private readonly aura: THREE.Sprite | null;
  private readonly auraTexture: THREE.DataTexture | null;
  private readonly auraOpacity: number;
  private readonly particles: THREE.Points;
  private readonly particleMaterial: THREE.ShaderMaterial;
  private readonly position = new Float32Array(MAX_PARTICLES * 3);
  private readonly alpha = new Float32Array(MAX_PARTICLES);
  private readonly size = new Float32Array(MAX_PARTICLES);
  private readonly velocity = new Float32Array(MAX_PARTICLES * 3);
  private readonly age = new Float32Array(MAX_PARTICLES);
  private readonly life = new Float32Array(MAX_PARTICLES);
  private readonly phase = new Float32Array(MAX_PARTICLES);
  private readonly peak = new Float32Array(MAX_PARTICLES);
  private count = 0;
  private time = 0;
  private owedMotes = 0;
  private readonly owedTrail = [0, 0];
  private readonly feet: (THREE.Object3D | null)[] = [null, null];
  private readonly scratch = new THREE.Vector3();
  private lastX = NaN;
  private lastZ = NaN;
  private speed = 0;
  private parent: THREE.Object3D | null = null;

  constructor(private readonly spec: Radiance, private readonly silver: THREE.ColorRepresentation, private readonly height: number) {
    const gold = new THREE.Color(spec.gold ?? 0xffe0a8);
    const silverColor = new THREE.Color(silver);
    this.uniforms = {
      uTime: { value: 0 }, uReveal: { value: 1.5 }, uBaseY: { value: 0 }, uHeight: { value: height },
      uGlow: { value: spec.glow ?? 0.6 }, uShimmer: { value: spec.shimmer ?? 0.1 }, uLit: { value: spec.lit ?? 0.5 },
      uSilver: { value: silverColor }, uGold: { value: gold },
      uRim: { value: new THREE.Color(spec.rim ?? 0xcfe4ff).multiplyScalar(spec.rimStrength ?? 0.9) },
      uRimPower: { value: spec.rimPower ?? 2.2 }, uOwn: { value: spec.own ?? 0.3 },
      uDesat: { value: 0.92 }, uFloor: { value: 0.2 }, uGain: { value: 2.4 }, uOwnGain: { value: 1.0 },
      uEdge: { value: new THREE.Color(1.0, 0.9, 0.68) },
    };
    const lit = spec.light;
    this.lightBase = lit?.intensity ?? 0;
    this.lightHeight = lit?.height ?? 1.0;
    this.warm.set(lit?.color ?? 0xffddb0);
    this.cool.set(lit?.cool ?? 0xa8c8ff);
    this.light = this.lightBase > 0 ? new THREE.PointLight(this.warm, 0, lit?.distance ?? 3.2, 2) : null;
    if (this.light) this.light.castShadow = false;

    this.auraOpacity = spec.aura ?? 0.16;
    if (this.auraOpacity > 0) {
      this.auraTexture = softDisc();
      this.aura = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.auraTexture, color: new THREE.Color(1.0, 0.93, 0.78), transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false,
      }));
      this.aura.scale.set(0.95 * height, 1.55 * height, 1);
      this.aura.position.y = 0.52 * height;
      this.aura.renderOrder = 2;
    } else {
      this.auraTexture = null;
      this.aura = null;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.position, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(1.5, 1.35, 1.05) }, uScale: { value: 600 } },
      vertexShader: /* glsl */ `
        attribute float aAlpha; attribute float aSize; varying float vA; uniform float uScale;
        void main() {
          vA = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = pow(max(1.0 - d, 0.0), 2.0) * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(uColor * a, a);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(geo, this.particleMaterial);
    this.particles.frustumCulled = false;
    this.particles.visible = false;
    this.particles.renderOrder = 3;
  }

  /** Her body's material in place of `source`'s: keeps the texture, takes the moonlight. */
  public material(source: THREE.Material): THREE.MeshToonMaterial {
    const map = (source as THREE.MeshStandardMaterial).map ?? null;
    const mat = new THREE.MeshToonMaterial({ name: 'Radiant', color: 0xffffff, map, gradientMap: this.ramp });
    mat.emissive.set(0x000000);
    const uniforms = this.uniforms;
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRadWorld;')
        .replace('#include <project_vertex>', 'vRadWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#include <project_vertex>');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vRadWorld;
uniform float uTime, uReveal, uBaseY, uHeight, uGlow, uShimmer, uLit, uRimPower, uOwn, uDesat, uFloor, uGain, uOwnGain;
uniform vec3 uSilver, uGold, uRim, uEdge;
float radHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float radNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(radHash(i), radHash(i + vec3(1, 0, 0)), f.x), mix(radHash(i + vec3(0, 1, 0)), radHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(radHash(i + vec3(0, 0, 1)), radHash(i + vec3(1, 0, 1)), f.x), mix(radHash(i + vec3(0, 1, 1)), radHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`)
        .replace('#include <map_fragment>', `#include <map_fragment>
float radEdge = 0.0;
{
  // moonlight in place of the texture's colour: silver in the shadows, pale gold where it is lit; the saree's red is
  // drawn down to its brightness; a share of the texture stays, so the face keeps its own detail
  float radL = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float radRed = clamp((diffuseColor.r - 0.5 * (diffuseColor.g + diffuseColor.b)) * 4.5, 0.0, 1.0);
  vec3 radOwn = mix(diffuseColor.rgb, vec3(radL), uDesat * radRed) * uOwnGain;
  float radLift = uFloor + (0.94 - uFloor) * (1.0 - exp(-uGain * radL));
  vec3 radTone = mix(uSilver, uGold, smoothstep(0.0, 0.24, radL)) * radLift;
  diffuseColor.rgb = mix(radTone, radOwn, uOwn);
  if (uReveal < 1.3) {
    float radH = (vRadWorld.y - uBaseY) / uHeight;
    float radD = radH + (radNoise(vRadWorld * 9.0 + vec3(0.0, uTime * 0.6, 0.0)) - 0.5) * 0.35;
    if (radD > uReveal) discard;
    radEdge = 1.0 - smoothstep(0.0, 0.06, uReveal - radD);
  }
}`)
        .replace('#include <aomap_fragment>', `reflectedLight.directDiffuse *= uLit;
reflectedLight.indirectDiffuse *= uLit;
#include <aomap_fragment>`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  float radFacing = abs(dot(normalize(vNormal), normalize(vViewPosition)));
  float radRim = pow(1.0 - radFacing, uRimPower);
  float radSheen = 0.5 + 0.5 * sin(vRadWorld.y * 7.0 - uTime * 1.3 + radNoise(vRadWorld * 4.0) * 3.0);
  vec3 radCell = vRadWorld * 38.0;
  float radSpark = step(0.97, radHash(floor(radCell) + floor(uTime * 3.0))) * smoothstep(0.22, 0.0, length(fract(radCell) - 0.5));
  totalEmissiveRadiance = diffuseColor.rgb * (uGlow + uShimmer * radSheen)
    + uRim * radRim * (0.65 + 0.35 * radSheen)
    + uGold * radSpark * uShimmer * 3.0
    + uEdge * radEdge * 1.3;
}`);
    };
    mat.customProgramCacheKey = () => 'yudhveer-radiant-shade-1';
    this.materials.push(mat);
    return mat;
  }

  /** Adds her light to the scene (not under her group, which is hidden until she appears: a hidden light is not counted). */
  public attach(scene: THREE.Object3D | null, body: THREE.Object3D): void {
    this.parent = scene;
    if (this.light && scene && !this.light.parent) scene.add(this.light);
    if (scene && !this.particles.parent) scene.add(this.particles);
    if (this.aura && !this.aura.parent) body.add(this.aura);
  }

  /** `k`: her presence, 0 gone to 1 wholly there; `body`: her group (its feet are where she stands). */
  public update(dt: number, k: number, body: THREE.Object3D, visible: boolean, rig: THREE.Object3D | null): void {
    this.time += dt;
    const u = this.uniforms;
    u.uTime.value = this.time;
    u.uBaseY.value = body.position.y;
    u.uReveal.value = k >= 1 ? 1.5 : -0.15 + 1.45 * k;
    u.uGlow.value = (this.spec.glow ?? 0.6) * (1 + 0.07 * Math.sin(this.time * 1.9));
    const x = body.position.x, z = body.position.z;
    if (dt > 0 && this.lastX === this.lastX) this.speed = Math.hypot(x - this.lastX, z - this.lastZ) / dt;
    this.lastX = x; this.lastZ = z;
    const on = visible && k > 0.02;

    if (this.light) {
      if (!this.light.parent && this.parent) this.parent.add(this.light);
      this.light.position.set(x, body.position.y + this.lightHeight * this.height, z);
      this.light.intensity = on ? this.lightBase * k * (0.93 + 0.07 * Math.sin(this.time * 2.3)) : 0;
      this.light.color.lerpColors(this.warm, this.cool, 0.5 + 0.5 * Math.sin(this.time * 0.55));
    }
    if (this.aura) (this.aura.material as THREE.SpriteMaterial).opacity = on ? this.auraOpacity * k * (0.9 + 0.1 * Math.sin(this.time * 1.4)) : 0;

    // motes: off her whole body, rising
    if (on) {
      this.owedMotes += (this.spec.motes ?? 26) * k * dt;
      while (this.owedMotes >= 1) {
        this.owedMotes -= 1;
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 0.34;
        this.spawn(x + Math.cos(a) * r, body.position.y + (0.1 + Math.random() * 1.55) * this.height / 1.8, z + Math.sin(a) * r,
          0.18 + Math.random() * 0.34, 2.2 + Math.random() * 1.3, 0.1 + Math.random() * 0.08, 0.9);
      }
      this.owedMotes = Math.min(this.owedMotes, 1);
      // the trail: a faint wisp from each foot that is down while she goes
      if (rig && this.speed > 0.25) {
        for (let f = 0; f < 2; f++) {
          const bone = this.feet[f] ?? (this.feet[f] = rig.getObjectByName(FEET[f]) ?? null);
          if (!bone) continue;
          bone.getWorldPosition(this.scratch);
          if (this.scratch.y > body.position.y + 0.07) continue;
          this.owedTrail[f] += (this.spec.trail ?? 7) * k * dt;
          while (this.owedTrail[f] >= 1) {
            this.owedTrail[f] -= 1;
            this.spawn(this.scratch.x + (Math.random() - 0.5) * 0.08, this.scratch.y + 0.03, this.scratch.z + (Math.random() - 0.5) * 0.08,
              0.07 + Math.random() * 0.06, 1.2 + Math.random() * 0.6, 0.1 + Math.random() * 0.05, 0.7);
          }
          this.owedTrail[f] = Math.min(this.owedTrail[f], 1);
        }
      }
    }

    // advance the particles (swap-remove: nothing is allocated)
    const n0 = this.count;
    for (let i = n0 - 1; i >= 0; i--) {
      const age = this.age[i] += dt;
      if (age >= this.life[i]) {
        const last = --this.count;
        if (i !== last) this.copy(last, i);
        continue;
      }
      const j = i * 3;
      const sway = Math.sin(this.time * 1.7 + this.phase[i]) * 0.05;
      this.position[j] += (this.velocity[j] + sway) * dt;
      this.position[j + 1] += this.velocity[j + 1] * dt;
      this.position[j + 2] += (this.velocity[j + 2] - sway) * dt;
      const t = age / this.life[i];
      this.alpha[i] = this.peak[i] * Math.min(1, age * 4) * (1 - t) * (1 - t);
    }
    this.particles.visible = this.count > 0;
    const geo = this.particles.geometry;
    geo.setDrawRange(0, this.count);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
  }

  private spawn(x: number, y: number, z: number, rise: number, life: number, size: number, peak: number): void {
    if (this.count >= MAX_PARTICLES) return;
    const i = this.count++;
    const j = i * 3;
    this.position[j] = x; this.position[j + 1] = y; this.position[j + 2] = z;
    this.velocity[j] = 0; this.velocity[j + 1] = rise; this.velocity[j + 2] = 0;
    this.age[i] = 0; this.life[i] = life; this.size[i] = size; this.phase[i] = Math.random() * 6.28; this.peak[i] = peak;
    this.alpha[i] = 0;
  }

  private copy(from: number, to: number): void {
    const a = from * 3, b = to * 3;
    for (let k = 0; k < 3; k++) { this.position[b + k] = this.position[a + k]; this.velocity[b + k] = this.velocity[a + k]; }
    this.alpha[to] = this.alpha[from]; this.size[to] = this.size[from]; this.age[to] = this.age[from];
    this.life[to] = this.life[from]; this.phase[to] = this.phase[from]; this.peak[to] = this.peak[from];
  }

  public dispose(): void {
    this.light?.removeFromParent();
    this.light?.dispose();
    this.particles.removeFromParent();
    this.particles.geometry.dispose();
    this.particleMaterial.dispose();
    if (this.aura) {
      this.aura.removeFromParent();
      (this.aura.material as THREE.SpriteMaterial).dispose();
    }
    this.auraTexture?.dispose();
    this.materials.forEach((m) => m.dispose());
    this.ramp.dispose();
  }
}

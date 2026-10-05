import * as THREE from 'three';
import { EXPORTED_LIGHT_SCALE, GLBLevel } from './GLBLevel';
import type { LevelAtmosphere } from './LevelTypes';
import { createToonRamp, toonifyModel } from './environment/ToonRelight';
import { Smoulder } from './environment/Smoulder';
import { ParticleFX } from '../combat/ParticleFX';
import { SceneManager } from '../core/SceneManager';

const LEVEL_URL = '/assets/levels/village_dusk.glb';

/** Toward the setting sun: low over the north gate, a little west (the raid, and Andhaka, come out of it). */
export const VILLAGE_SUN = new THREE.Vector3(-0.26, 0.07, -0.96).normalize();
/** The key light comes from the sun's side, raised so its shadows stay on the courtyard instead of running away. */
const KEY_DIR = new THREE.Vector3(-0.3, 0.36, -0.88).normalize();
/** The gateway in the north wall (its middle, at the threshold), and the open desert beyond it. */
export const VILLAGE_GATE = new THREE.Vector3(0, 0, -11.3);

const FLAME = /^(Flame_|RaidFire_)/;
const RAID_FIRE = /^RaidFire_/;
const NO_SHADOW = /^(Env_|Ground_|Flame_|RaidFire_)/;
/** The burning roof's own light (exported with the map, dark until the raid fires the roof). */
const RAID_LIGHT = 'RaidFire_Light';
/** Where the north-east hut's roof burns (its flames' middle), and the wind that leans its smoke off west. */
export const VILLAGE_ROOF_FIRE = new THREE.Vector3(6.2, 3.0, -5.9);
const WIND = new THREE.Vector3(-0.55, 0, 0.3);

/**
 * The last of the light through the gate (the prologue's ending): a low, hard light just inside the gateway, under
 * the lintel, between the gate's torches with the sunset behind them. Whoever walks in through the gate throws a
 * shadow far down the courtyard ahead of him and up the south wall; the scene brings it up (`setGateLight`). It casts
 * shadows, so it is made with the level (one shader variant from the start) and its shadow map is only redrawn while
 * it is lit.
 */
export const GATE_LIGHT_AT = new THREE.Vector3(0, 3.6, -10.5);
export const GATE_LIGHT_AIM = new THREE.Vector3(0, 0.4, 3.0);
const GATE_LIGHT_COLOR = 0xffa04e;
/** Its strength at full (candela; it falls off with distance only gently, decay 1). */
const GATE_LIGHT_MAX = 30;

/** The night after the raid: what each light and the fog become at `setNight(1)`. */
const NIGHT = {
  ambient: { color: 0x2b3256, intensity: 0.42 },
  hemi: { sky: 0x34446f, ground: 0x1e130c, intensity: 0.42 },
  key: { color: 0x7d93cf, intensity: 0.3 },
  fog: 0x1a1928,
};

interface Flame { mesh: THREE.Object3D; base: THREE.Vector3; seed: number }

/**
 * The prologue: Yudhveer's village, a small walled courtyard in the Rajasthani desert at dusk (built and exported by
 * `game asset/levels/00_village/build_village.py`). Flat vertex-coloured shapes, cel-shaded with ink lines like the
 * other arenas, under a sky drawn in code: the sun going down behind the north gate. The fire the raid leaves on the
 * north-east hut stays out until a scene calls for it (`cue('raid-fire')`).
 */
export class Level0_Village extends GLBLevel {
  public readonly id = 0;
  public readonly title = 'Prologue: the village';
  public readonly subtitle = 'A desert courtyard at dusk • The raid';
  public readonly atmosphere: LevelAtmosphere = {
    background: new THREE.Color(0xd08a62),
    backgroundIntensity: 1.0,
    environment: null,
    environmentIntensity: 0,
    // Dust in the low sun: the far fort and ridges go soft and warm.
    fog: { color: 0xcc8a66, near: 28, far: 230 },
    ambient: { color: 0x8a6c9c, intensity: 0.55 },
    hemi: { sky: 0xffb98a, ground: 0x6a4430, intensity: 0.65 },
    key: { color: 0xffa65c, intensity: 2.3, direction: KEY_DIR, normalBias: 0.02 },
    exposure: 1.0,
    bloom: { threshold: 0.85, smoothing: 0.12, intensity: 1.2 },
    vignette: { offset: 0.3, darkness: 0.55 },
    ink: { color: 0x1c0d08, thickness: 1.0, threshold: 0.014, fadeNear: 30, fadeFar: 85 },
  };
  private ramp = createToonRamp([0.3, 0.55, 0.84, 1.0]);
  private sky: THREE.Mesh | null = null;
  private flames: Flame[] = [];
  private raidFire: THREE.Object3D[] = [];
  /** The burning roof's light and its strength when blazing; how much the roof burns now (0 out .. 1 blazing). */
  private raidLight: THREE.Light | null = null;
  private raidLightBase = 0;
  private fire = 0;
  private particleFX = ParticleFX.getInstance();
  /** See GATE_LIGHT_AT. */
  public readonly gateLight: THREE.SpotLight;
  /** How far night has fallen (`setNight`), and how much of the key light's strength is left (`setSun`). */
  private night = 0;
  private sun = 1;
  /** Smoke over the burning roof, its sparks drifting across the courtyard, ash falling. */
  public readonly smoulder = new Smoulder(VILLAGE_ROOF_FIRE, 2.2, 10.5, WIND);

  constructor() {
    super(LEVEL_URL);
    this.ownedTextures.add(this.ramp);
    this.playerSpawn.set(0, 0, 3);
    // The courtyard inside its walls, and the lane out through the north gate where the raiders come in (and the
    // hero leaves). Not explorable: the desert outside is scenery.
    this.arenaBoundsSpec = {
      shape: {
        kind: 'polygon',
        points: [[-10.6, -10.6], [-1.6, -10.6], [-1.6, -18.5], [1.6, -18.5], [1.6, -10.6], [10.6, -10.6], [10.6, 10.6], [-10.6, 10.6]],
      },
      floorY: -1,
      height: 8,
    };
    this.killPlaneY = -10;

    const light = new THREE.SpotLight(GATE_LIGHT_COLOR, 0, 0, 0.62, 0.55, 1);
    light.name = 'GateLight';
    light.position.copy(GATE_LIGHT_AT);
    light.target.position.copy(GATE_LIGHT_AIM);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.near = 0.4;
    light.shadow.camera.far = 38;
    light.shadow.bias = -0.0004;
    light.shadow.normalBias = 0.025;
    // Drawn once now (so the map exists), then only while it is lit.
    light.shadow.autoUpdate = false;
    light.shadow.needsUpdate = true;
    this.gateLight = light;
    this.group.add(light, light.target, this.smoulder.group);
    this.bloomObjects.push(this.smoulder.glowing);
  }

  protected async loadEnvironment(): Promise<void> {
    this.sky = createDuskSky();
    this.group.add(this.sky);
  }

  /** The burning roof's light stays in the scene from the start, dark: lighting it later recompiles nothing. */
  protected override prepareExportedLight(light: THREE.Light): void {
    if (light.name !== RAID_LIGHT) {
      super.prepareExportedLight(light);
      return;
    }
    light.intensity *= EXPORTED_LIGHT_SCALE;
    light.castShadow = false;
    this.raidLight = light;
    this.raidLightBase = light.intensity;
    light.intensity = 0;
  }

  protected prepareModel(model: THREE.Object3D): void {
    model.traverse((obj) => {
      if (RAID_FIRE.test(obj.name) && obj.name !== RAID_LIGHT) this.raidFire.push(obj);
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = !NO_SHADOW.test(mesh.name);
      mesh.receiveShadow = !FLAME.test(mesh.name);
      if (FLAME.test(mesh.name)) this.flames.push({ mesh, base: mesh.scale.clone(), seed: Math.random() * 100 });
    });
    toonifyModel(model, this.ramp, (src) => {
      // Flames: unlit and orange, bright enough to bloom.
      if (src.name !== 'Flame') return undefined;
      return new THREE.MeshBasicMaterial({ name: 'Flame', color: new THREE.Color(1.5, 0.5, 0.08), fog: false });
    });
    // The burning roof's flames a deeper red-orange than the lamps', so they read as fire, not white thorns, at night.
    const roofFlame = new THREE.MeshBasicMaterial({ name: 'RoofFlame', color: new THREE.Color(1.15, 0.3, 0.03), fog: false });
    for (const obj of this.raidFire) {
      obj.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        (o as THREE.Mesh).material = roofFlame;
        this.bloomObjects.push(o);
      });
      obj.visible = false;
    }
    // The flames' colour is kept short of white (the tone curve would bleach them), so bloom takes them lower.
    this.collectBloom(model, 0.6);
  }

  /**
   * Story cues for the place: `raid-fire` sets the north-east hut's roof alight at once (the raid's end); `chapter-start`
   * (every start of the chapter, a retry too) puts the place back as it was before the raid: dusk, the roof whole, no
   * smoke, the gate's light out and where it belongs.
   */
  public cue(name: string): void {
    if (name === 'raid-fire') {
      this.setRaidFire(1);
      this.smoulder.amount = Math.max(this.smoulder.amount, 1);
    } else if (name === 'chapter-start') {
      this.setRaidFire(0);
      this.smoulder.reset();
      this.setGateLight(0);
      this.aimGateLight(GATE_LIGHT_AT, GATE_LIGHT_AIM, GATE_LIGHT_COLOR);
      this.sun = 1;
      this.setNight(0);
    }
  }

  /** How much the north-east hut's roof burns: 0 out (the roof whole), up to 1 blazing; its flames grow with it. */
  public setRaidFire(k: number): void {
    this.fire = THREE.MathUtils.clamp(k, 0, 1.5);
    for (const obj of this.raidFire) obj.visible = this.fire > 0.02;
  }

  /** The gate's low light (see GATE_LIGHT_AT), 0 out .. 1 full; its shadow map is redrawn only while it is lit. */
  public setGateLight(k: number): void {
    const on = k > 0.001;
    this.gateLight.intensity = GATE_LIGHT_MAX * Math.max(0, k);
    this.gateLight.shadow.autoUpdate = on;
    if (on) this.gateLight.shadow.needsUpdate = true;
  }

  /** Moves the gate's light (another shot's source): where it shines from and at, and its colour. */
  public aimGateLight(from: THREE.Vector3, at: THREE.Vector3, color: THREE.ColorRepresentation = GATE_LIGHT_COLOR): void {
    this.gateLight.position.copy(from);
    this.gateLight.target.position.copy(at);
    this.gateLight.updateMatrixWorld();
    this.gateLight.target.updateMatrixWorld();
    this.gateLight.color.set(color);
    this.gateLight.shadow.needsUpdate = true;
  }

  /**
   * Dusk (0) to the night after the raid (1): the sky darkens to indigo over a dull red horizon, and the ambient, sky
   * and key lights and the fog go from the sunset's warmth to cold moonlight. In between, the sun going down.
   */
  public setNight(k: number): void {
    const n = THREE.MathUtils.clamp(k, 0, 1);
    this.night = n;
    const sm = SceneManager.getInstance();
    const atm = this.atmosphere;
    const mix = (from: number, to: number) => new THREE.Color(from).lerp(new THREE.Color(to), n);
    sm.ambientLight.color.copy(mix(atm.ambient.color, NIGHT.ambient.color));
    sm.ambientLight.intensity = THREE.MathUtils.lerp(atm.ambient.intensity, NIGHT.ambient.intensity, n);
    sm.hemiLight.color.copy(mix(atm.hemi.sky, NIGHT.hemi.sky));
    sm.hemiLight.groundColor.copy(mix(atm.hemi.ground, NIGHT.hemi.ground));
    sm.hemiLight.intensity = THREE.MathUtils.lerp(atm.hemi.intensity, NIGHT.hemi.intensity, n);
    sm.dirLight.color.copy(mix(atm.key.color, NIGHT.key.color));
    sm.dirLight.intensity = THREE.MathUtils.lerp(atm.key.intensity, NIGHT.key.intensity, n) * this.sun;
    sm.scene.fog?.color.copy(mix(atm.fog.color, NIGHT.fog));
    if (this.sky) (this.sky.material as THREE.ShaderMaterial).uniforms.uNight.value = n;
  }

  /**
   * The key light's share of its strength (1 all of it): the low sun dropping behind the wall, leaving the courtyard
   * to the gate's light. Night's moonlight takes it back up.
   */
  public setSun(k: number): void {
    this.sun = THREE.MathUtils.clamp(k, 0, 1);
    this.setNight(this.night);
  }

  public override update(time: number, dt: number, camera: THREE.Camera): void {
    super.update(time, dt, camera);
    this.sky?.position.copy(camera.position);
    const roof = 0.55 + 0.45 * Math.min(1, this.fire);
    for (const f of this.flames) {
      if (!f.mesh.visible) continue;
      const n = Math.sin(time * 13 + f.seed) * 0.5 + Math.sin(time * 29.3 + f.seed * 1.7) * 0.3;
      const k = RAID_FIRE.test(f.mesh.name) ? roof : 1;
      f.mesh.scale.set(f.base.x * k * (1 + 0.08 * n), f.base.y * k * (1 + 0.22 * n), f.base.z * k * (1 + 0.08 * n));
    }
    if (this.raidLight) {
      const n = Math.sin(time * 9.0) * 0.5 + Math.sin(time * 21.7 + 1.3) * 0.3 + Math.sin(time * 4.1) * 0.2;
      this.raidLight.intensity = this.raidLightBase * this.fire * (0.82 + 0.18 * n);
    }
    // Flames licking off the burning roof; its smoke, sparks and ash.
    if (this.fire > 0.02 && dt > 0 && Math.random() < 0.35 * this.fire) this.particleFX.spawnFlames(VILLAGE_ROOF_FIRE.clone().setY(3.2), 2, 1.6);
    this.smoulder.update(dt, camera);
  }

  public override dispose(): void {
    this.smoulder.dispose();
    this.gateLight.shadow.dispose();
    super.dispose();
  }
}

/**
 * The dusk sky, worked out per pixel from the view direction (no texture): a violet zenith, mauve and rose through
 * the middle, gold down to the horizon under the sun and peach away from it, the sun's disc and its glow, and a few
 * streaks of cloud lit from beneath. Drawn first, on a sphere that follows the camera.
 */
function createDuskSky(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    name: 'DuskSky',
    uniforms: { uSun: { value: VILLAGE_SUN.clone() }, uNight: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = clip.xyww; // pinned to the far plane
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun;
      uniform float uNight;
      varying vec3 vDir;
      vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        float toSun = dot(d, uSun);
        float sunSide = smoothstep(-0.4, 1.0, toSun);
        // Bands from the horizon up, warmer under the sun.
        vec3 horizon = mix(lin(vec3(0.86, 0.55, 0.42)), lin(vec3(1.0, 0.78, 0.42)), sunSide);
        vec3 low = mix(lin(vec3(0.78, 0.45, 0.5)), lin(vec3(0.98, 0.56, 0.38)), sunSide);
        vec3 mid = lin(vec3(0.5, 0.33, 0.55));
        vec3 zenith = lin(vec3(0.16, 0.14, 0.33));
        float up = max(h, 0.0);
        vec3 col = mix(horizon, low, smoothstep(0.0, 0.08, up));
        col = mix(col, mid, smoothstep(0.08, 0.3, up));
        col = mix(col, zenith, smoothstep(0.3, 0.85, up));
        // Below the horizon (seen past the dunes' edge): the haze.
        col = mix(col, lin(vec3(0.8, 0.54, 0.4)), smoothstep(0.0, -0.08, h));
        // The sun and its glow.
        float glow = pow(max(toSun, 0.0), 8.0) * 0.55 + pow(max(toSun, 0.0), 60.0) * 0.9;
        col += lin(vec3(1.0, 0.72, 0.38)) * glow;
        col = mix(col, lin(vec3(1.0, 0.95, 0.78)) * 2.6, smoothstep(0.9994, 0.99965, toSun));
        // Thin cloud streaks in the low sky, lit gold under the sun and rose away from it.
        vec2 p = vec2(atan(d.z, d.x) * 3.0, up * 26.0);
        float streak = noise(p * vec2(1.0, 1.0) + vec2(0.0, 3.0)) * noise(p * vec2(2.3, 0.6));
        float clouds = smoothstep(0.32, 0.6, streak) * smoothstep(0.03, 0.1, up) * (1.0 - smoothstep(0.16, 0.32, up));
        vec3 cloudCol = mix(lin(vec3(0.72, 0.38, 0.48)), lin(vec3(1.0, 0.66, 0.4)), sunSide);
        col = mix(col, cloudCol, clouds * 0.7);
        // Night: indigo overhead, a dull ember-red band low where the sun went down, the clouds dark against it.
        if (uNight > 0.0) {
          vec3 night = mix(lin(vec3(0.16, 0.11, 0.15)), lin(vec3(0.05, 0.06, 0.13)), smoothstep(0.0, 0.35, up));
          night += lin(vec3(0.42, 0.13, 0.08)) * pow(max(toSun, 0.0), 6.0) * (1.0 - smoothstep(0.0, 0.2, up)) * 0.8;
          night = mix(night, lin(vec3(0.06, 0.05, 0.08)), clouds * 0.6);
          night = mix(night, lin(vec3(0.14, 0.1, 0.12)), smoothstep(0.0, -0.08, h));
          col = mix(col, night, uNight);
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), material);
  sky.name = 'DuskSky';
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  return sky;
}

import * as THREE from 'three';
import { GLBLevel } from './GLBLevel';
import type { LevelAtmosphere } from './LevelTypes';
import { createToonRamp, toonifyModel } from './environment/ToonRelight';
import { ParticleFX } from '../combat/ParticleFX';

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
  private burning = false;
  private particleFX = ParticleFX.getInstance();

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
  }

  protected async loadEnvironment(): Promise<void> {
    this.sky = createDuskSky();
    this.group.add(this.sky);
  }

  protected prepareModel(model: THREE.Object3D): void {
    model.traverse((obj) => {
      if (RAID_FIRE.test(obj.name)) this.raidFire.push(obj);
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
    for (const obj of this.raidFire) obj.visible = false;
    // The flames' colour is kept short of white (the tone curve would bleach them), so bloom takes them lower.
    this.collectBloom(model, 0.6);
  }

  /** Story cues for the place: `raid-fire` sets the north-east hut's roof alight (the raid's end). */
  public cue(name: string): void {
    if (name !== 'raid-fire') return;
    this.burning = true;
    for (const obj of this.raidFire) obj.visible = true;
  }

  public override update(time: number, dt: number, camera: THREE.Camera): void {
    super.update(time, dt, camera);
    this.sky?.position.copy(camera.position);
    for (const f of this.flames) {
      if (!f.mesh.visible) continue;
      const n = Math.sin(time * 13 + f.seed) * 0.5 + Math.sin(time * 29.3 + f.seed * 1.7) * 0.3;
      f.mesh.scale.set(f.base.x * (1 + 0.08 * n), f.base.y * (1 + 0.22 * n), f.base.z * (1 + 0.08 * n));
    }
    // Embers off the burning roof.
    if (this.burning && dt > 0 && Math.random() < 0.35) this.particleFX.spawnFlames(new THREE.Vector3(6.2, 3.2, -5.9), 2, 1.6);
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
    uniforms: { uSun: { value: VILLAGE_SUN.clone() } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = clip.xyww; // pinned to the far plane
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun;
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

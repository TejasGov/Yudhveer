import * as THREE from 'three';
import { GLBLevel } from './GLBLevel';
import type { LevelAtmosphere } from './LevelTypes';
import { SceneManager } from '../core/SceneManager';
import { addLampGlow, addRimLight, createToonRamp, toonifyModel, toToonMaterial } from './environment/ToonRelight';
import { FireField, type FireSpot } from './environment/FireField';
import { SkyDome, prepareEquirect } from './environment/SkyDome';
import { WaterRippleMaterial } from './environment/WaterRippleMaterial';
import { asset } from '../core/Assets';

const LEVEL_URL = asset('levels/akhada_atrium.glb');

/**
 * Toward the setting sun, as the sky draws it: low in the north-west, behind the Hanuman monolith's shoulder, so the
 * view in from the south gateway looks into the glow.
 */
export const AKHADA_SUN = new THREE.Vector3(-0.55, 0.1, -0.83).normalize();
/**
 * The key comes from the sun's side but raised (as the village's does), so the shaft through the 21 m octagonal
 * oculus falls across the arena floor in a long golden slant instead of up the south wall.
 */
const SUN_KEY_DIR = new THREE.Vector3(-0.42, 0.8, -0.43).normalize();
/**
 * The night's moonlight: steeper than the Blender sun (40, -15, 0 deg) so the shaft through the oculus lands on the
 * arena floor and the foot of the Hanuman bust instead of the north wall; same azimuth.
 */
const OCULUS_KEY_DIR = new THREE.Vector3(-0.1, 0.94, 0.33).normalize();
const VERMILLION = 0xff1a24;

/**
 * The two looks the akhada turns between (STORY.md, Milestone 6, "Day into night"): the warm sunset of the lesson and
 * the cobalt and vermillion night the Vetala and Mayavi come out into.
 */
interface Look {
  fog: { color: number; density: number };
  ambient: { color: number; intensity: number };
  hemi: { sky: number; ground: number; intensity: number };
  key: { color: number; intensity: number; direction: THREE.Vector3; normalBias: number };
  exposure: number;
  bloom: { threshold: number; smoothing: number; intensity: number };
  vignette: { offset: number; darkness: number };
  ink: number;
  /** The rim on the monolith's carving. */
  rim: { color: number; strength: number; start: number };
  /** The pair of spots under the bust, and the one raking its face from high left. */
  uplight: { color: number; intensity: number };
  faceKey: { color: number; intensity: number };
}

const SUNSET: Look = {
  // Dust and woodsmoke in the low sun: the forest beyond the walls goes soft and gold.
  fog: { color: 0xd9a088, density: 0.0045 },
  // The shade under the roof stays blue-violet (the open sky); the earth bounces warm.
  ambient: { color: 0x9484c2, intensity: 0.55 },
  hemi: { sky: 0xa6aae6, ground: 0x8a5232, intensity: 0.7 },
  key: { color: 0xffb878, intensity: 3.1, direction: SUN_KEY_DIR, normalBias: 0.02 },
  exposure: 1.05,
  bloom: { threshold: 0.86, smoothing: 0.12, intensity: 1.1 },
  vignette: { offset: 0.3, darkness: 0.55 },
  ink: 0x1c0d08,
  rim: { color: 0xffc890, strength: 0.4, start: 0.68 },
  // Warm deepak light under the bust, and the late sun raking its face.
  uplight: { color: 0xffa04a, intensity: 12 },
  faceKey: { color: 0xffc27a, intensity: 520 },
};

/** The original comic night (commit 5096e21): one cobalt key through the oculus, vermillion from below. */
const NIGHT: Look = {
  fog: { color: 0x080b24, density: 0.011 },
  ambient: { color: 0x2a3a8f, intensity: 0.35 },
  hemi: { sky: 0x2745c8, ground: 0x5a0a10, intensity: 0.55 },
  key: { color: 0x1e55ff, intensity: 5.5, direction: OCULUS_KEY_DIR, normalBias: 0 },
  exposure: 1.15,
  bloom: { threshold: 0.9, smoothing: 0.1, intensity: 1.6 },
  vignette: { offset: 0.28, darkness: 0.7 },
  ink: 0x04030c,
  rim: { color: 0x8fb4ff, strength: 0.55, start: 0.66 },
  uplight: { color: VERMILLION, intensity: 22 },
  faceKey: { color: 0x5d7bff, intensity: 750 },
};

/** Vermillion grazers just above the earth at the arena corners (Blender (+-9.7, +-8, 0.5)), lit with the night. */
const GRAZERS: [number, number][] = [[-9.7, 8], [9.7, 8], [-9.7, -8], [9.7, -8]];
const GRAZER_INTENSITY = 14;
/**
 * A faint amber light at the two lit deepam stands nearest the camera (a pair of point lights shared between the eight
 * stands, a constant count: no shader recompiles), breathing with their flames: the stands' bowls and the verandah floor
 * round them catch the flames' warmth, inside the cobalt and vermillion night. The second hands off softly as a third
 * stand comes as near.
 */
const STAND_GLOW = { color: 0xffa24c, intensity: 2.2, distance: 6, decay: 2, lights: 2, above: 0.8 };

/**
 * Time of day as the story moves it (`cue`): the lesson darkens toward dusk, then night falls with the arrival.
 * `t` is 0 at the sunset of the opening and 1 at full night.
 */
const DUSK = { t: 0.18, seconds: 40 };
const TWILIGHT = { t: 0.35, seconds: 35 };
const NIGHTFALL_SECONDS = 6;

/**
 * The lamps are lit for the evening aarti while night falls: the brass diyas before the monolith first, from the middle
 * outward, then the tall deepams from the north end down the verandahs, a pair at a time (left, then right).
 */
const MAX_LAMPS = 24;
const LAMPS_FROM = 1.0;
const LAMP_STEP = 0.5;
const PAIR_LAG = 0.18;
/** A flame catches (with a little flare) in this long; the light it throws rises more slowly. */
const FLAME_CATCH = 0.45;
const GLOW_RISE = 1.4;

// Materials that are cut-out cards: alpha test, both faces, no shadow casting (forest cards are huge).
const FOLIAGE = /Tree_Card|leaves|fern|calathea|branches|Creeper_Leaf|Dry_Brown_Leaves/i;
const FLAMES = /Flame/i;
const NO_SHADOW_CAST = /BR_Forest|BR_Vegetation|BR_Tree|BR_Distant|Puddle|Rain/i;
const HANUMAN_STONE = 'BR_Hanuman_Saffron_Mineral_Stone';
// The two Hanuman frescos beside the monolith and the two verandah Ramayana narrative panels.
const MURALS = /Fresco|Narrative_Border/;
// Warm deepak light: yellow-amber, faint enough to stay below the bloom threshold.
const MURAL_GLOW = { color: 0xffc46b, intensity: 0.38 };

const scratchA = new THREE.Color();
const scratchB = new THREE.Color();
const lerp = THREE.MathUtils.lerp;
/** Two hex colours mixed (in linear light), as hex. */
function mixHex(a: number, b: number, t: number): number {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return scratchA.setHex(a).lerp(scratchB.setHex(b), t).getHex();
}
function mixColor(out: THREE.Color, a: number, b: number, t: number, scaleA = 1, scaleB = 1): THREE.Color {
  return out.setHex(a).multiplyScalar(scaleA).lerp(scratchB.setHex(b).multiplyScalar(scaleB), t);
}
/** 0 to 1 with a small overshoot at the end: a wick catching. */
function easeOutBack(u: number): number {
  const c = 1.70158;
  return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
}

interface Lamp {
  /** Its flame's foot (the wick), and how tall the exported flame stood. */
  centre: THREE.Vector3;
  height: number;
  /** Seconds after the lighting begins that this one catches. */
  at: number;
}

/**
 * Level 2: enclosed akhada under an open octagonal oculus, a weathered Hanuman monolith on the north wall.
 * Two looks, blended by the time of day (`cue`): a warm, cinematic sunset (STORY.md, Chapter II: one low golden key
 * through the oculus, a soft blue-violet fill from the open sky, warm haze, a sky drawn in code with the sun going
 * down behind the monolith, deepak light under the bust), turning into the comic cel-shaded night the chapter used to
 * have (one cobalt key through the oculus, vermillion grazers at floor level and vermillion uplights under the bust,
 * a starry sky), while the akhada's lamps are lit one pair after another. Screen-space ink lines throughout.
 */
export class Level2_Akhada extends GLBLevel {
  public readonly id = 2;
  public readonly title = 'Level 2: Hanuman Akhada';
  public readonly subtitle = 'Oculus Courtyard of the Monolith • The Vetala and Mayavi';
  private readonly fog = { ...SUNSET.fog };
  private readonly ink = { color: SUNSET.ink, thickness: 1.0, threshold: 0.013, fadeNear: 28, fadeFar: 60 };
  public readonly atmosphere: LevelAtmosphere = {
    // The sky dome draws the sky; this only shows if it is missing.
    background: new THREE.Color(0x040614),
    backgroundIntensity: 1.0,
    environment: null,
    environmentIntensity: 0.6,
    fog: this.fog,
    ambient: { ...SUNSET.ambient },
    hemi: { ...SUNSET.hemi },
    key: { ...SUNSET.key, direction: SUNSET.key.direction.clone() },
    exposure: SUNSET.exposure,
    bloom: { ...SUNSET.bloom },
    vignette: { ...SUNSET.vignette },
    ink: this.ink,
  };
  private ramp = createToonRamp([0.16, 0.42, 0.78, 1.0]);
  // Deeper shadow band and a harder step for the monolith, so the carved features read from across the arena.
  private bustRamp = createToonRamp([0.1, 0.32, 0.75, 1.0]);
  private puddles: WaterRippleMaterial | null = null;
  private muralGlows: { uTime: THREE.IUniform<number> }[] = [];

  // Time of day: `t` now, and the ease it is following (`easeSeconds` 0 when it holds still).
  private t = 0;
  private easeFrom = 0;
  private easeTo = 0;
  private easeTime = 0;
  private easeSeconds = 0;
  /** Everything is built and the SceneManager may be told when the light changes. */
  private lit = false;

  // What the time of day drives.
  private sky: SkyDome | null = null;
  private dayEnvironment: THREE.Texture | null = null;
  private nightEnvironment: THREE.Texture | null = null;
  private ridge: THREE.ShaderMaterial | null = null;
  private rim: { uRimColor: THREE.IUniform<THREE.Color>; uRimStart: THREE.IUniform<number> } | null = null;
  private foliage: { mat: THREE.MeshToonMaterial; base: number }[] = [];
  private uplights: THREE.SpotLight[] = [];
  private faceKey: THREE.SpotLight | null = null;

  // The lamps: seconds since they began to be lit (< 0 all out, Infinity all burning), and per lamp its flame's size
  // (its FireField group's amount, `lamp_<i>`) and the light it throws.
  private lamps: Lamp[] = [];
  private lampClock = -1;
  private lampsDoneAt = 0;
  private readonly flameSize = new Float32Array(MAX_LAMPS);
  private readonly lampLight = new Float32Array(MAX_LAMPS);
  /** Every lamp's flame (see FireField): a group per lamp, so each catches in its turn and flickers on its own. */
  private fires: FireField | null = null;
  private murals: { mat: THREE.MeshToonMaterial; halo: THREE.Mesh; haloColor: THREE.Color; centre: THREE.Vector3; lamp: number }[] = [];
  private grazers: { light: THREE.PointLight; lamp: number }[] = [];
  /** See STAND_GLOW. */
  private readonly standLights: THREE.PointLight[] = [];

  constructor() {
    super(LEVEL_URL);
    this.ownedTextures.add(this.ramp).add(this.bustRamp);
    this.playerSpawn.set(0, 0, 6);
    for (let i = 0; i < STAND_GLOW.lights; i++) {
      const light = new THREE.PointLight(STAND_GLOW.color, 0, STAND_GLOW.distance, STAND_GLOW.decay);
      light.name = 'Akhada_Deepam_Glow';
      light.castShadow = false;
      this.standLights.push(light);
      this.group.add(light);
    }
  }

  protected async loadEnvironment(): Promise<void> {
    const sunset = prepareEquirect(createSunsetSky());
    const night = prepareEquirect(createNightSky());
    this.ownedTextures.add(sunset).add(night);
    // Both skies on one dome, crossfaded by the time of day.
    this.sky = new SkyDome(sunset);
    this.sky.setFlash(night, 0);
    this.group.add(this.sky.mesh);
    // Toon materials ignore the environment; it only feeds the rain puddles' reflections.
    this.dayEnvironment = this.bakeEnvironment(sunset);
    this.nightEnvironment = this.bakeEnvironment(night);
    this.atmosphere.environment = this.dayEnvironment;
  }

  protected prepareModel(model: THREE.Object3D): void {
    let monolith: THREE.Object3D | null = null;
    model.traverse((obj) => {
      if (obj.name === 'BR_Hanuman_Weathered_Monolith') monolith = obj;
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const names = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => m.name).join(' ');
      mesh.castShadow = !NO_SHADOW_CAST.test(mesh.name) && !FOLIAGE.test(names) && !FLAMES.test(names);
      mesh.receiveShadow = !FLAMES.test(names);
    });
    toonifyModel(model, this.ramp, (src, mesh) => this.convertMaterial(src as THREE.MeshStandardMaterial, mesh));
    this.lightMurals(model);
    this.prepareLamps(model);

    this.collectBloom(model);
    this.addLightRig(monolith);

    this.applyLook();
    this.updateLamps();
    this.lit = true;
  }

  /**
   * Story cues (STORY.md, Milestone 6, "Day into night"): `day` (the sunset, lamps out, at once), `dusk` and
   * `twilight` (the lesson drawing on: the light eases a little lower), `nightfall` (night falls over a few seconds
   * and the lamps are lit) and `night` (full night with every lamp burning, at once: a skipped or settled arrival).
   */
  public cue(name: string): void {
    switch (name) {
      case 'day':
        this.easeSeconds = 0;
        this.setTime(0);
        this.lampClock = -1;
        this.updateLamps();
        break;
      case 'dusk':
        this.easeToward(DUSK.t, DUSK.seconds);
        break;
      case 'twilight':
        this.easeToward(TWILIGHT.t, TWILIGHT.seconds);
        break;
      case 'nightfall':
        this.easeToward(1, NIGHTFALL_SECONDS);
        if (this.lampClock < 0) {
          this.lampClock = 0;
          this.updateLamps();
        }
        break;
      case 'night':
        this.easeSeconds = 0;
        this.setTime(1);
        this.lampClock = Infinity;
        this.updateLamps();
        break;
    }
  }

  /** Eases the time of day on toward `to` (never back toward the day). */
  private easeToward(to: number, seconds: number): void {
    if (to <= this.t) return;
    this.easeFrom = this.t;
    this.easeTo = to;
    this.easeTime = 0;
    this.easeSeconds = seconds;
  }

  private setTime(t: number): void {
    if (t === this.t) return;
    this.t = t;
    this.applyLook();
  }

  /** Everything the time of day drives, at `t`. Runs only when `t` changes. */
  private applyLook(): void {
    const t = this.t;
    const D = SUNSET;
    const N = NIGHT;
    const a = this.atmosphere;
    this.fog.color = mixHex(D.fog.color, N.fog.color, t);
    this.fog.density = lerp(D.fog.density, N.fog.density, t);
    a.ambient.color = mixHex(D.ambient.color, N.ambient.color, t);
    a.ambient.intensity = lerp(D.ambient.intensity, N.ambient.intensity, t);
    a.hemi.sky = mixHex(D.hemi.sky, N.hemi.sky, t);
    a.hemi.ground = mixHex(D.hemi.ground, N.hemi.ground, t);
    a.hemi.intensity = lerp(D.hemi.intensity, N.hemi.intensity, t);
    a.key.color = mixHex(D.key.color, N.key.color, t);
    a.key.intensity = lerp(D.key.intensity, N.key.intensity, t);
    a.key.direction.lerpVectors(D.key.direction, N.key.direction, t).normalize();
    a.key.normalBias = lerp(D.key.normalBias, N.key.normalBias, t);
    a.exposure = lerp(D.exposure, N.exposure, t);
    a.bloom.threshold = lerp(D.bloom.threshold, N.bloom.threshold, t);
    a.bloom.smoothing = lerp(D.bloom.smoothing, N.bloom.smoothing, t);
    a.bloom.intensity = lerp(D.bloom.intensity, N.bloom.intensity, t);
    a.vignette.offset = lerp(D.vignette.offset, N.vignette.offset, t);
    a.vignette.darkness = lerp(D.vignette.darkness, N.vignette.darkness, t);
    this.ink.color = mixHex(D.ink, N.ink, t);
    // The puddles reflect whichever sky is the more of the two.
    a.environment = t < 0.5 ? this.dayEnvironment : this.nightEnvironment;

    this.sky?.setFlash(null, t);
    if (this.ridge) this.ridge.uniforms.uNight.value = t;
    if (this.rim) {
      mixColor(this.rim.uRimColor.value, D.rim.color, N.rim.color, t, D.rim.strength, N.rim.strength);
      this.rim.uRimStart.value = lerp(D.rim.start, N.rim.start, t);
    }
    // The canopy's authored sun glow goes with the sun.
    for (const f of this.foliage) f.mat.emissiveIntensity = f.base * (1 - t);
    for (const up of this.uplights) {
      mixColor(up.color, D.uplight.color, N.uplight.color, t);
      up.intensity = lerp(D.uplight.intensity, N.uplight.intensity, t);
    }
    if (this.faceKey) {
      mixColor(this.faceKey.color, D.faceKey.color, N.faceKey.color, t);
      this.faceKey.intensity = lerp(D.faceKey.intensity, N.faceKey.intensity, t);
    }
    if (this.lit) SceneManager.getInstance().applyAtmosphere(a);
  }

  /** Each lamp's flame and light from the lamp clock. Runs only while the lamps are being lit (or put out). */
  private updateLamps(): void {
    const clock = this.lampClock;
    let anyFlame = false;
    for (let i = 0; i < Math.min(this.lamps.length, MAX_LAMPS); i++) {
      const since = clock - this.lamps[i].at;
      const u = clock < 0 ? 0 : since / FLAME_CATCH;
      // Catching: the flame grows in with a little flare past its size (the FireField's amount).
      this.flameSize[i] = u <= 0 ? 0 : u >= 1 ? 1 : easeOutBack(u);
      this.lampLight[i] = clock < 0 ? 0 : THREE.MathUtils.smootherstep(since / GLOW_RISE, 0, 1);
      this.fires?.set(`lamp_${i}`, this.flameSize[i]);
      anyFlame ||= this.flameSize[i] > 0;
    }
    // Unlit, the flames cost no draw call.
    if (this.fires) this.fires.mesh.visible = anyFlame;
    for (const m of this.murals) {
      const k = this.lampLight[m.lamp];
      m.mat.emissiveIntensity = MURAL_GLOW.intensity * k;
      (m.halo.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(m.haloColor).multiplyScalar(k);
      m.halo.visible = k > 0;
    }
  }

  /**
   * Each mural gets its own copy of its toon material with a faint deepak glow pooled at its own base, so the
   * paintings stay readable in the verandah shadows without looking backlit. The glow is the lamps': out by day.
   */
  private lightMurals(model: THREE.Object3D): void {
    const shared = new Set<THREE.Material>();
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material) || !MURALS.test(mesh.material.name)) return;
      const own = (mesh.material as THREE.MeshToonMaterial).clone();
      const bounds = new THREE.Box3().setFromObject(mesh);
      const glow = addLampGlow(own, { bounds, ...MURAL_GLOW });
      this.muralGlows.push(glow);
      shared.add(mesh.material);
      mesh.material = own;
      const halo = createLampHalo(bounds, glow.uTime);
      this.group.add(halo);
      const haloColor = (halo.material as THREE.ShaderMaterial).uniforms.uColor.value.clone();
      // Which lamp it belongs to is settled once the lamps are found.
      this.murals.push({ mat: own, halo, haloColor, centre: bounds.getCenter(new THREE.Vector3()), lamp: 0 });
    });
    shared.forEach((m) => m.dispose());
  }

  /**
   * Finds the lamps in the flame meshes (the static deepam flames are one merged mesh, the diya lanterns' two) and
   * orders them for the lighting; their flames burn in a FireField (a group per lamp, `lamp_<i>`, the lamp clock its
   * amount), and the exported flames, frozen cones, go.
   */
  private prepareLamps(model: THREE.Object3D): void {
    const flames: THREE.Mesh[] = [];
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && !Array.isArray(mesh.material) && FLAMES.test(mesh.material.name)) flames.push(mesh);
    });

    // Group the flame vertices into lamps by where they stand (lamps are metres apart; a lamp's wicks are not).
    const found: { x: number; z: number; minY: number; maxY: number; n: number }[] = [];
    const world = new THREE.Vector3();
    for (const mesh of flames) {
      const pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        world.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        let k = found.findIndex((l) => Math.hypot(l.x / l.n - world.x, l.z / l.n - world.z) < 0.6);
        if (k < 0) {
          k = found.length;
          found.push({ x: 0, z: 0, minY: world.y, maxY: world.y, n: 0 });
        }
        const l = found[k];
        l.x += world.x;
        l.z += world.z;
        l.minY = Math.min(l.minY, world.y);
        l.maxY = Math.max(l.maxY, world.y);
        l.n++;
      }
    }
    const centres = found.map((l) => new THREE.Vector3(l.x / l.n, l.minY, l.z / l.n));
    const heights = new Map(centres.map((c, i) => [c, found[i].maxY - found[i].minY]));

    // The order of the lighting: mirrored pairs, the low diyas before the monolith first (from the middle out),
    // then the tall deepams from the north end southward.
    const isDiya = (c: THREE.Vector3) => c.y < 1.5;
    const pairKey = (c: THREE.Vector3) => `${isDiya(c) ? 0 : 1}|${Math.round(Math.abs(c.x))}|${Math.round(c.z)}`;
    const pairs = [...new Set(centres.map(pairKey))].map((key) => centres.filter((c) => pairKey(c) === key));
    pairs.sort((p, q) => {
      const a = p[0];
      const b = q[0];
      if (isDiya(a) !== isDiya(b)) return isDiya(a) ? -1 : 1;
      return isDiya(a) ? Math.abs(a.x) - Math.abs(b.x) : a.z - b.z || Math.abs(a.x) - Math.abs(b.x);
    });
    const at = new Map<THREE.Vector3, number>();
    pairs.forEach((pair, step) => pair.forEach((c) => at.set(c, LAMPS_FROM + step * LAMP_STEP + (c.x > 0 ? PAIR_LAG : 0))));
    this.lamps = centres.map((centre) => ({ centre, height: heights.get(centre) ?? 0.3, at: at.get(centre) ?? LAMPS_FROM }));
    this.lampsDoneAt = Math.max(0, ...this.lamps.map((l) => l.at)) + Math.max(FLAME_CATCH, GLOW_RISE);
    if (found.length > MAX_LAMPS) console.warn(`[Level2_Akhada] ${found.length} lamps; only ${MAX_LAMPS} light separately`);

    // The flames: a tall deepam's two tongues, a lantern's diya one slim one, each sized to the flame exported there.
    const spots: FireSpot[] = this.lamps.slice(0, MAX_LAMPS).map((lamp, i) => ({
      at: lamp.centre.clone(),
      size: lamp.height * 1.2,
      group: `lamp_${i}`,
      tongues: lamp.height > 0.2 ? 2 : 1,
      width: lamp.height > 0.2 ? 0.55 : 0.5,
    }));
    for (const mesh of flames) mesh.removeFromParent();
    this.fires = new FireField(spots);
    this.fires.mesh.visible = false;
    this.group.add(this.fires.mesh);
    this.bloomObjects.push(this.fires.mesh);

    // A mural's glow is the nearest lamp's.
    for (const m of this.murals) m.lamp = this.nearestLamp(m.centre);
  }

  private nearestLamp(p: THREE.Vector3): number {
    let best = 0;
    let bestDist = Infinity;
    this.lamps.forEach((l, i) => {
      const d = Math.hypot(l.centre.x - p.x, l.centre.z - p.z);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return Math.min(best, MAX_LAMPS - 1);
  }

  /** Level-specific conversions; undefined falls through to the default toon conversion. */
  private convertMaterial(src: THREE.MeshStandardMaterial, mesh: THREE.Mesh): THREE.Material | undefined {
    const name = src.name;
    if (name === 'BR_Distant_Mountain_Haze') {
      // The Blender bake (sunset alpenglow in a MountainTint attribute) exports as flat white; shade the three
      // ridge rings by distance, height and how far they face the sun instead (or as night silhouettes).
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.ridge = createRidgeMaterial(name);
      return this.ridge;
    }
    if (FLAMES.test(name)) {
      const flame = src.emissive.getHSL({ h: 0, s: 0, l: 0 }).l > 0.01 ? src.emissive.clone() : new THREE.Color(1, 0.35, 0.05);
      return new THREE.MeshBasicMaterial({ name, color: flame.multiplyScalar(6), fog: false, transparent: src.transparent, map: src.map });
    }
    if (name === 'BR_Akhada_Shallow_Rainwater') {
      this.puddles ??= new WaterRippleMaterial({ color: 0x2a1e2c, opacity: 0.55, roughness: 0.02, envMapIntensity: 5, waveStrength: 0.25, waveScale: 0.6 });
      return this.puddles;
    }
    if (name === HANUMAN_STONE) {
      // Sharper, more pronounced monolith: harder light steps, deeper relief, a rim on every carved edge (warm in the
      // sun, cool cobalt at night).
      const bust = toToonMaterial(src, this.bustRamp);
      bust.normalScale.multiplyScalar(1.4);
      this.rim = addRimLight(bust, SUNSET.rim);
      return bust;
    }
    if (!FOLIAGE.test(name) && name !== 'BR_FA_Faded_Saffron_Cloth') return undefined;
    const toon = toToonMaterial(src, this.ramp);
    if (FOLIAGE.test(name)) {
      toon.alphaTest = 0.35;
      toon.transparent = false;
      toon.side = THREE.DoubleSide;
      // The cards' self-emission fakes the low sun through the canopy (authored for this sunset): kept, softened so
      // the leaves glow rather than burn; it fades with the sun (at night it would read as glowing trees).
      toon.emissiveIntensity *= 0.7;
      this.foliage.push({ mat: toon, base: toon.emissiveIntensity });
    }
    if (name === 'BR_FA_Faded_Saffron_Cloth') toon.side = THREE.DoubleSide;
    return toon;
  }

  private addLightRig(monolith: THREE.Object3D | null): void {
    // Dark by day; each comes up with the deepam stand nearest it as the lamps are lit.
    for (const [x, z] of GRAZERS) {
      const graze = new THREE.PointLight(VERMILLION, 0, 14, 2);
      graze.position.set(x, 0.45, z);
      graze.name = 'Akhada_Vermillion_Grazer';
      this.group.add(graze);
      this.grazers.push({ light: graze, lamp: this.nearestLamp(graze.position) });
    }

    // Light under the Hanuman bust, aimed at its chin and chest from either side of the plinth: an accent under the
    // face (warm deepak in the sun, vermillion at night), not a wash over it.
    const bust = new THREE.Box3();
    if (monolith) bust.setFromObject(monolith);
    else bust.set(new THREE.Vector3(-9.5, 0, -19.5), new THREE.Vector3(9.5, 13.9, -14));
    const face = new THREE.Vector3((bust.min.x + bust.max.x) / 2, bust.min.y + (bust.max.y - bust.min.y) * 0.22, bust.max.z - 1.5);
    for (const side of [-1, 1]) {
      const up = new THREE.SpotLight(SUNSET.uplight.color, SUNSET.uplight.intensity, 20, THREE.MathUtils.degToRad(28), 0.85, 2);
      up.name = 'Akhada_Hanuman_Uplight';
      up.position.set(side * 2.6, 0.4, bust.max.z + 2.2);
      up.target.position.copy(face).setX(face.x + side * 1.2);
      this.group.add(up, up.target);
      this.uplights.push(up);
    }

    // The roof shades the face from the oculus key, so a spot raking in from high left (the last of the sun, or cobalt
    // moonlight) carves it into crisp toon bands (lit brow and cheek, dark eye sockets and jaw side).
    const faceCentre = new THREE.Vector3(face.x, bust.min.y + (bust.max.y - bust.min.y) * 0.6, bust.max.z - 2);
    const carve = new THREE.SpotLight(SUNSET.faceKey.color, SUNSET.faceKey.intensity, 32, THREE.MathUtils.degToRad(26), 0.45, 2);
    carve.name = 'Akhada_Hanuman_Face_Key';
    carve.position.set(faceCentre.x - 9, faceCentre.y + 5, faceCentre.z + 7);
    carve.target.position.copy(faceCentre);
    this.group.add(carve, carve.target);
    this.faceKey = carve;
  }

  public override update(time: number, dt: number, camera: THREE.Camera): void {
    this.fires?.update(time);
    super.update(time, dt, camera);
    this.sky?.follow(camera);
    this.puddles?.update(time);
    for (const glow of this.muralGlows) glow.uTime.value = time;
    if (!this.lit) return;
    if (this.easeSeconds > 0) {
      this.easeTime += dt;
      const k = Math.min(1, this.easeTime / this.easeSeconds);
      if (k >= 1) this.easeSeconds = 0;
      this.setTime(lerp(this.easeFrom, this.easeTo, THREE.MathUtils.smoothstep(k, 0, 1)));
    }
    if (this.lampClock >= 0 && this.lampClock < this.lampsDoneAt) {
      this.lampClock += dt;
      this.updateLamps();
    }
    // The grazers come up with the stand nearest each, and breathe with its flame (the grade stays the night's
    // vermillion: only the flicker is the lamp's).
    for (const g of this.grazers) g.light.intensity = GRAZER_INTENSITY * this.lampLight[g.lamp] * (this.fires?.flicker(`lamp_${g.lamp}`) ?? 1);
    this.updateStandGlow(camera);
  }

  /** See STAND_GLOW: the two lit stands nearest the camera, the second fading out as a third comes as near. */
  private updateStandGlow(camera: THREE.Camera): void {
    const eye = camera.position;
    const stands = this.lamps
      .map((lamp, i) => ({ lamp, i, d: lamp.centre.distanceTo(eye) }))
      .filter(({ lamp, i }) => lamp.height > 0.2 && i < MAX_LAMPS)
      .sort((a, b) => a.d - b.d);
    this.standLights.forEach((light, k) => {
      const stand = stands[k];
      if (!stand) {
        light.intensity = 0;
        return;
      }
      const handoff = k + 1 < stands.length ? THREE.MathUtils.smoothstep(stands[k + 1].d - stand.d, 0, 1.5) : 1;
      // Well above the flame: nearer, it burned the stand's own bowl white.
      light.position.copy(stand.lamp.centre).y += STAND_GLOW.above;
      light.intensity = STAND_GLOW.intensity * this.lampLight[stand.i] * (this.fires?.flicker(`lamp_${stand.i}`) ?? 1) * (k === 0 ? 1 : handoff);
    });
  }

  public override dispose(): void {
    this.fires?.dispose();
    super.dispose();
  }
}

/**
 * Faint warm spill from the deepaks onto the frame and wall around a mural, so the glow doesn't stop at the
 * painting's edge. An additive quad just in front of the wall, pooled low, flickering with the mural's glow.
 */
function createLampHalo(bounds: THREE.Box3, uTime: THREE.IUniform<number>): THREE.Mesh {
  const size = bounds.getSize(new THREE.Vector3());
  const centre = bounds.getCenter(new THREE.Vector3());
  // Panels are thin along their facing axis and face the arena centre.
  const facesZ = size.z < size.x;
  const width = facesZ ? size.x : size.z;
  const normal = facesZ
    ? new THREE.Vector3(0, 0, centre.z > 0 ? -1 : 1)
    : new THREE.Vector3(centre.x > 0 ? -1 : 1, 0, 0);
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.7, size.y * 1.9),
    new THREE.ShaderMaterial({
      name: 'MuralLampHalo',
      uniforms: { uTime, uColor: { value: new THREE.Color(0.25, 0.15, 0.042) } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          vec2 d = (vUv - vec2(0.5, 0.3)) * vec2(1.0, 1.35);
          float fall = 1.0 - smoothstep(0.0, 0.62, length(d));
          float flick = 0.93 + 0.07 * sin(uTime * 6.1) * sin(uTime * 2.3 + 1.1);
          gl_FragColor = vec4(uColor * fall * fall * flick, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.name = 'MuralLampHalo';
  // The painting is recessed in a stone frame: sit just proud of the frame so the spill reaches it.
  halo.position.copy(centre).addScaledVector(normal, 0.7);
  halo.position.y -= size.y * 0.1;
  halo.lookAt(halo.position.clone().add(normal));
  halo.renderOrder = 3;
  return halo;
}


/**
 * The distant ranges (88-258 m), unaffected by scene fog, in both looks (`uNight` blends them). Sunset haze: near
 * rings dusky violet, far rings paler and warmer, the crests and the slopes turned toward the sun lit gold, a band of
 * haze at their feet. Night silhouettes: near rings darkest, far rings hazier and bluer, moonlit cobalt on the crests,
 * a vermillion horizon glow at their feet.
 */
function createRidgeMaterial(name: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name,
    uniforms: {
      uSun: { value: new THREE.Vector2(AKHADA_SUN.x, AKHADA_SUN.z).normalize() },
      uNight: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec2 uSun;
      uniform float uNight;
      varying vec3 vWorld;
      void main() {
        float far = smoothstep(80.0, 260.0, length(vWorld.xz));
        float crest = pow(clamp(vWorld.y / 70.0, 0.0, 1.0), 1.6);
        float sunward = smoothstep(-0.2, 1.0, dot(normalize(vWorld.xz), uSun));
        vec3 day = mix(vec3(0.09, 0.05, 0.1), vec3(0.3, 0.19, 0.22), far);
        day += vec3(0.4, 0.19, 0.06) * sunward * (0.35 + 0.65 * far);
        day += vec3(0.28, 0.15, 0.06) * crest * (1.0 - 0.4 * far);
        day = mix(day, vec3(0.62, 0.34, 0.2), (1.0 - smoothstep(-4.0, 16.0, vWorld.y)) * (0.4 + 0.5 * far));
        vec3 night = mix(vec3(0.006, 0.008, 0.03), vec3(0.03, 0.03, 0.1), far);
        night += vec3(0.02, 0.035, 0.16) * crest * (1.0 - 0.5 * far);
        night += vec3(0.09, 0.006, 0.015) * (1.0 - smoothstep(-4.0, 14.0, vWorld.y)) * far;
        gl_FragColor = vec4(mix(day, night, uNight), 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

/**
 * Equirect sunset sky for the oculus and the gaps over the walls: a blue-violet zenith through rose to gold at the
 * horizon, the sun low in the north-west (AKHADA_SUN) with its glow, and long streaks of cloud lit from beneath.
 */
function createSunsetSky(): THREE.CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0, '#2c3170');
  g.addColorStop(0.2, '#4b4d92');
  g.addColorStop(0.33, '#8a6f9e');
  g.addColorStop(0.42, '#d48a7c');
  g.addColorStop(0.475, '#f4ad66');
  g.addColorStop(0.5, '#ffd08c');
  g.addColorStop(0.52, '#d99670');
  g.addColorStop(1.0, '#4a2c26');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Where the sun sits on the panorama (the equirect convention three.js samples with; the canvas top is straight up).
  const sx = (Math.atan2(AKHADA_SUN.z, AKHADA_SUN.x) / (Math.PI * 2) + 0.5) * w;
  const sy = (0.5 - Math.asin(AKHADA_SUN.y) / Math.PI) * h;
  // Drawn at x - w, x and x + w so the glow carries across the seam.
  const around = (draw: (x: number) => void) => [sx - w, sx, sx + w].forEach(draw);

  // The broad warm glow along the horizon on the sun's side, squashed flat.
  around((x) => {
    ctx.save();
    ctx.translate(x, sy);
    ctx.scale(3.2, 1);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 260);
    glow.addColorStop(0, 'rgba(255, 214, 140, 0.95)');
    glow.addColorStop(0.35, 'rgba(255, 168, 92, 0.55)');
    glow.addColorStop(1, 'rgba(255, 140, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-260, -260, 520, 520);
    ctx.restore();
  });

  // Streaks of cloud in the low sky, gold toward the sun and rose away from it.
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const x = rand() * w;
    const y = h * (0.3 + rand() * 0.15);
    const warm = 1 - Math.min(Math.abs(x - sx), w - Math.abs(x - sx)) / (w / 2);
    const r = Math.round(200 + 55 * warm);
    const gr = Math.round(120 + 70 * warm);
    const b = Math.round(130 - 40 * warm);
    ctx.fillStyle = `rgba(${r}, ${gr}, ${b}, ${0.12 + rand() * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 60 + rand() * 180, 3 + rand() * 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // The disc itself, just above the horizon haze.
  around((x) => {
    const disc = ctx.createRadialGradient(x, sy, 0, x, sy, 34);
    disc.addColorStop(0, 'rgba(255, 250, 225, 1)');
    disc.addColorStop(0.45, 'rgba(255, 236, 180, 1)');
    disc.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = disc;
    ctx.fillRect(x - 34, sy - 34, 68, 68);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Equirect night sky for the oculus (the chapter's original night): cobalt zenith, vermillion-violet horizon glow, stars. */
function createNightSky(): THREE.CanvasTexture {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.0, '#02030c');
  g.addColorStop(0.18, '#050b2e');
  g.addColorStop(0.38, '#0b1c6b');
  g.addColorStop(0.47, '#23195a');
  g.addColorStop(0.5, '#4a1030');
  g.addColorStop(0.53, '#12050e');
  g.addColorStop(1.0, '#030205');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400; i++) {
    const y = Math.pow(rand(), 1.6) * h * 0.46;
    const r = rand() < 0.94 ? 0.7 : 1.4;
    ctx.fillStyle = `rgba(200, 215, 255, ${0.25 + rand() * 0.6})`;
    ctx.beginPath();
    ctx.arc(rand() * w, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

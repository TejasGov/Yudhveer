import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { GLBLevel } from './GLBLevel';
import type { LevelAtmosphere } from './LevelTypes';
import { RainField, type RainLevel } from './environment/RainField';
import { StormSky } from './environment/StormSky';
import { Footfalls, GroundSplashes, tickWetMaterials, wetten } from './environment/WetGround';
import { LivingSea, seaHeight, tidemark, type SeaQuality, type TideDebug } from './environment/LivingSea';
import { FireField, findModelledFlames, spotForFlame } from './environment/FireField';
import { SceneManager } from '../core/SceneManager';
import { ParticleFX } from '../combat/ParticleFX';
import { SoundFX } from '../combat/SoundFX';
import { BloodFX } from '../combat/BloodFX';
import { asset } from '../core/Assets';

/**
 * Level 3: Dwarka, Krishna's sea city at sunset - a ruined circular arena on an island among temple islands, the
 * Krishna statue, a coastal fort and a moored trading boat. Built in `game asset/levels/03_dwarka/dwarka.blend` and
 * exported with its own browser notes (`game asset/levels/03_dwarka/BROWSER_NOTES.md`, `browser/scene-config.js`), whose
 * light rig, sky orientation, material rules and arena coordinates this follows. Unlike the other arenas it
 * keeps its authored PBR look (no cel shading or ink); the fight uses the campaign's follow camera.
 *
 * It rains (docs/STORY.md, "Dwarka in the rain"): a storm deck over the sunset, the light cooler and lower, slanted
 * rain round the camera, the stone dark and glossy with raindrop rings in it, splashes on the floor, and ripples and
 * spray wherever anyone steps, lands, falls or brings a weapon down. Distant lightning and thunder come with the
 * ambience (SoundFX 'dwarka'), never over a line.
 *
 * The sea lives (docs/STORY.md, "Dwarka's tide"): a slow tide creeps up and down the islets' rock, long swells heave
 * through it, foam hugs the shores and laps in and out with both, the rock is dark and glossy where the water has just
 * been, and the moored boat rides it (`LivingSea`).
 */
const LEVEL_URL = asset('dwarka/dwarka_browser.glb');
const SKY_URL = asset('dwarka/dwarka_horizon_sunset_2k.exr');

// scene-config.js (Three.js coordinates; Blender (x, y, z) -> (x, z, -y)).
const ENVIRONMENT_QUATERNION = new THREE.Quaternion(0.016459044069051743, -0.5674096941947937, -0.005852972157299519, 0.8232503533363342);
const SUN_POSITION = new THREE.Vector3(-51.762545108795166, 9.396252028644085, 163.18045377731323);
const SUN_TARGET = new THREE.Vector3(0, 8, -30);
/** The fight plane and the radius that is safe to stand on. */
export const DWARKA_FLOOR_Y = 7.6;
const SAFE_RADIUS = 10.8;
/** Fighter starts: the hero on the west mark, his opponent on the east. */
export const DWARKA_STARTS = { hero: new THREE.Vector3(-5, DWARKA_FLOOR_Y, 0), opponent: new THREE.Vector3(5, DWARKA_FLOOR_Y, 0) };

// The export's material rules (browser/main.js tuneModel).
const SHADOW_CASTERS = /Shattered_Sky_Arena|Golden_Temple|Krishna_Divine|Sacred_Stone_Gateway|DW_Coast_Fort/i;
const ATMOSPHERIC = /Haze|Mist|Dust|Backdrop|Foam/i;
const DECAL = /Puddle|Wet_Margin|Stain|Blood|Rosette|Crack/i;
const DEEP_DECAL = /Blood|Stain|Rosette|Crack/i;
const OCEAN = /Ocean|Water_Surface/i;
const GROWTH = /Moss_Patches|Algae_Patches/;
const HILLS = /Hills|Backdrop/i;
const BOAT = 'DW_Coastal_Trading_Boat';
/** The ropes from the boat to the quay: their boat ends ride up and down with it. */
const MOORINGS = 'DW_Harbor_Moorings';
/** The exported sea: its water plane (rebuilt as the living sea), the flat horizon disc round it, and its surf ring. */
const SEA_PLANE = 'BR_Ocean_Surface';
const SEA_HORIZON = 'BR_Ocean_Horizon';
const SEA_SURF = 'BR_Batch_07_Shoreline_Foam';
/** Never part of the shoreline the sea's foam follows: the sea, the sky, haze, and foliage that overhangs the water. */
const NOT_SHORE = /Ocean|Foam|Haze|Mist|Dust|Backdrop|Hills|Leaves|Grass|Creeper|Trunks|Pennant|Moorings|Boat|Diya|Gold_Accents/i;
/** Rock the sea washes: the tide leaves its wet band on these (only near the water; the arena is far above it). */
const SHORE_ROCK = /^DW_(Salt_Eroded_Coastal_Rock_PolyHaven|Sea_Worn_Rock|Weathered_Limestone_PolyHaven|Ancient_Blockwork_PolyHaven|Fort_Tidal_Foundations|Tidal_Olive_Algae_PolyHaven|Photographic_Moss_Lichen_PolyHaven)$/;
/** Replaced by the runtime dust below (it drifts; the baked one can't). */
const BAKED_DUST = 'DW_Subtle_Rim_Dust_Motes';
const DUST_COUNT = 150;
/** The wet stone: the arena's paving and ruined sandstone, the limestone and blockwork round it, and the puddles. */
const PAVING = /^DW_Arena_Weathered_Paving$/;
const PUDDLES = /^DW_Arena_Shallow_Rain_Puddles$/;
const WET_MARGINS = /^DW_Arena_Damp_Stone$/;
const STONE = /^DW_(Arena_Ruined_Sandstone|Weathered_Limestone_PolyHaven|Ancient_Blockwork_PolyHaven)$/;
/**
 * The eight diyas round the islets: their exported flames (static pills, one mesh) only say where they burn. A
 * FireField burns there instead, leaning in the storm's wind and guttering in its gusts; the two nearest the camera
 * light their stone (a constant count of lights: no shader recompiles).
 */
const DIYA_FLAMES = 'BR_Batch_09_Diya_Flame';
const DIYA_LIGHTS = 2;
/** The lights stand this far over the flames' feet: any lower, the diyas' own bowls burned white round the wick. */
const DIYA_LIGHT = { color: 0xff9548, intensity: 2.4, distance: 5, decay: 2, above: 0.45 };
/**
 * The flames' bands for Dwarka's grade: the storm's grey daylight and its AgX curve (which bleaches bright oranges) wash
 * the village's colours out to a pale peach, so these are deeper and more saturated, not brighter.
 */
const DIYA_PALETTE = {
  rim: new THREE.Color(0.85, 0.07, 0.0),
  body: new THREE.Color(1.7, 0.32, 0.0),
  core: new THREE.Color(2.4, 1.0, 0.1),
  glow: new THREE.Color(1.8, 0.45, 0.04),
};
/** Drops in the rain's near and far boxes, and the floor's splash slots. */
const RAIN_DROPS = { near: 5200, far: 2600 };
const SPLASH_SLOTS = { raindrops: 360, impacts: 64 };

/** The boat lies along x (17.5 m by 6): the sea is sampled this far fore and aft, and to either side. */
const BOAT_HALF_LENGTH = 7;
const BOAT_HALF_BEAM = 2.5;
const BOAT_TILT = new THREE.Euler();
/** The mooring ropes run from the quay (z -78.7) to the boat (z -70): their ends from here on ride with the boat. */
const MOORING_QUAY_Z = -77.5;
const MOORING_BOAT_Z = -72;

/** Lifts a material's vertices by the boat's heave, fully at the boat's end of the ropes and not at all at the quay. */
function rideWithBoat(material: THREE.Material): { value: number } {
  const heave = { value: 0 };
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.uBoatHeave = heave;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uBoatHeave;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
transformed.y += uBoatHeave * smoothstep(${MOORING_QUAY_Z.toFixed(1)}, ${MOORING_BOAT_Z.toFixed(1)}, (modelMatrix * vec4(transformed, 1.0)).z);`);
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}|boat-heave`;
  material.needsUpdate = true;
  return heave;
}

export class Level3_Dwarka extends GLBLevel {
  public readonly id = 3;
  public readonly title = 'Level 3: Dwarka';
  public readonly subtitle = 'The sea city at sunset';
  public readonly atmosphere: LevelAtmosphere = {
    background: new THREE.Color(0x7d8690),
    // The storm: the sunset dimmed behind the cloud deck, rain haze closing in on the far islands, a cooler fill and
    // a low, weak sun (the front bounce light below is cooled with it).
    backgroundIntensity: 0.18,
    environment: null,
    environmentIntensity: 0.24,
    fog: { color: 0x7a838c, near: 120, far: 1700 },
    // A broad, shadowless fill approximates the coastal sky bounce (the front bounce light is added below).
    ambient: { color: 0xffffff, intensity: 0 },
    hemi: { sky: 0xb4bfcc, ground: 0x4f524f, intensity: 0.42 },
    key: { color: 0xf0b88c, intensity: 0.34, direction: SUN_POSITION.clone().sub(SUN_TARGET).normalize(), normalBias: 0.05 },
    exposure: 1.25,
    toneMapping: 'agx',
    environmentRotation: new THREE.Euler().setFromQuaternion(ENVIRONMENT_QUATERNION),
    clip: { near: 0.25, far: 5000 },
    bloom: { threshold: 0.95, smoothing: 0.1, intensity: 0.8 },
    vignette: { offset: 0.35, darkness: 0.35 },
    ink: null,
  };

  private waterNormals: THREE.Texture[] = [];
  private boat: { object: THREE.Object3D; base: THREE.Vector3; turn: THREE.Quaternion; heave: number; pitch: number; roll: number } | null = null;
  private moorings: { uniform: { value: number } } | null = null;
  /** The sea's grid for every Dwarka loaded from now on (dev: `__debug.tide({ quality: 'low' })`). */
  public static seaQuality: SeaQuality = 'full';
  public sea: LivingSea | null = null;
  private dust: THREE.Points | null = null;
  private dustOrigins = new Float32Array(DUST_COUNT * 3);
  /** The rain's density for every Dwarka loaded from now on (dev: `__debug.rain('low')`). */
  public static rainLevel: RainLevel = 'full';
  private rain: RainField | null = null;
  private sky: StormSky | null = null;
  private splashes: GroundSplashes | null = null;
  private footfalls: Footfalls | null = null;
  private lastSplashSound = 0;
  /** The diyas' flames (see DIYA_FLAMES): where each burns (a little above its wick), its fire group, and the lights. */
  private fires: FireField | null = null;
  private diyas: { at: THREE.Vector3; group: string }[] = [];
  private readonly diyaLights: THREE.PointLight[] = [];

  constructor() {
    super(LEVEL_URL);
    this.playerSpawn.copy(DWARKA_STARTS.hero);
    // The arena floor is a flat disc (the export has no collision guide); walls on its rim keep the fight on it.
    this.arenaBoundsSpec = {
      shape: { kind: 'circle', center: [0, 0], radius: SAFE_RADIUS, segments: 32 },
      floorY: DWARKA_FLOOR_Y - 1,
      height: 6,
    };
    this.killPlaneY = DWARKA_FLOOR_Y - 6;
    // The fight uses the same over-the-shoulder follow camera as every other chapter (the export's side-on
    // CAM_Fighting_Stage is not used: one camera across the campaign).
    const front = new THREE.DirectionalLight(0xd4d2cc, 0.7);
    front.name = 'Dwarka_Front_Bounce';
    front.position.set(-35, 35, 55);
    front.target.position.set(-15, 12, -25);
    this.group.add(front, front.target);
  }

  protected async loadEnvironment(): Promise<void> {
    const hdr = await new EXRLoader().loadAsync(SKY_URL);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    this.ownedTextures.add(hdr);
    this.atmosphere.background = hdr;
    this.atmosphere.environment = this.bakeEnvironment(hdr);
  }

  protected prepareModel(model: THREE.Object3D): void {
    // The fight plane (radius 10.8) as a 1 m thick disc whose top is the floor.
    this.addStaticCylinder(new THREE.Vector3(0, DWARKA_FLOOR_Y - 0.5, 0), 0.5, SAFE_RADIUS + 0.4);

    // Wet stone mirrors the sky more than the scene's dim environment allows.
    const envMap = this.atmosphere.environment ? { texture: this.atmosphere.environment, rotation: this.atmosphere.environmentRotation } : undefined;
    const seaParts: { ocean: THREE.Mesh | null; horizon: THREE.Mesh | null; surf: THREE.Mesh | null; land: THREE.Mesh[] } = { ocean: null, horizon: null, surf: null, land: [] };
    const diyaFlames: THREE.Mesh[] = [];
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = mesh.name;
      if (name === BAKED_DUST) mesh.visible = false;
      if (name === DIYA_FLAMES) diyaFlames.push(mesh);
      if (name === BOAT) this.boat = { object: mesh, base: mesh.position.clone(), turn: mesh.quaternion.clone(), heave: 0, pitch: 0, roll: 0 };
      if (name === SEA_PLANE) seaParts.ocean = mesh;
      else if (name === SEA_HORIZON) seaParts.horizon = mesh;
      else if (name === SEA_SURF) seaParts.surf = mesh;
      else if (!NOT_SHORE.test(name)) seaParts.land.push(mesh);
      const atmospheric = ATMOSPHERIC.test(name);
      const decal = DECAL.test(name);
      mesh.castShadow = SHADOW_CASTERS.test(name) && !atmospheric && !decal;
      mesh.receiveShadow = !atmospheric;
      if (GROWTH.test(name)) {
        mesh.castShadow = false;
        mesh.renderOrder = 1;
      }
      if (decal) mesh.renderOrder = DEEP_DECAL.test(name) ? 3 : 2;
      for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[]) {
        if (!material) continue;
        if (PAVING.test(material.name)) wetten(material, { darken: 0.52, roughness: 0.34, envMapIntensity: 0.55, envMap, ripples: 0.45 });
        else if (PUDDLES.test(material.name)) wetten(material, { darken: 0.8, roughness: 0.03, envMapIntensity: 0.9, envMap, ripples: 1.1 });
        else if (WET_MARGINS.test(material.name)) wetten(material, { darken: 0.75, roughness: 0.2, envMapIntensity: 0.5, envMap, ripples: 0 });
        else if (STONE.test(material.name)) wetten(material, { darken: 0.74, roughness: 0.5, envMapIntensity: 0.3, envMap, ripples: 0 });
        if (SHORE_ROCK.test(material.name)) tidemark(material);
        if (name === MOORINGS) this.moorings = { uniform: rideWithBoat(material) };
        if (material.transparent) {
          material.depthWrite = false;
          material.forceSinglePass = true;
        }
        if (decal) {
          material.polygonOffset = true;
          material.polygonOffsetFactor = -1;
          material.polygonOffsetUnits = -1;
        }
        // The rain roughens the sea: a softer, greyer glitter.
        if (OCEAN.test(name)) material.roughness = 0.42;
        if (OCEAN.test(name) && material.normalMap && !material.userData.runtimeWater) {
          material.normalMap = material.normalMap.clone();
          material.normalMap.wrapS = material.normalMap.wrapT = THREE.RepeatWrapping;
          material.userData.runtimeWater = true;
          this.waterNormals.push(material.normalMap);
          this.ownedTextures.add(material.normalMap);
        }
        // The unlit hills (KHR_materials_unlit) draw behind everything and never occlude.
        if (HILLS.test(name)) {
          material.depthWrite = false;
          mesh.renderOrder = -2;
        }
      }
    });

    if (seaParts.ocean) {
      this.sea = new LivingSea({ ...seaParts, ocean: seaParts.ocean }, SceneManager.getInstance().renderer, Level3_Dwarka.seaQuality);
      this.ownedTextures.add(this.sea.shore).add(this.sea.noise);
      this.group.add(this.sea.mesh);
    }

    this.lightDiyas(diyaFlames);
    this.collectBloom(model);
    if (this.fires) this.bloomObjects.push(this.fires.mesh);
    this.addDust();
    this.addRain();
  }

  /** The diyas' flames (see DIYA_FLAMES), each a group of its own so its light gutters with it. */
  private lightDiyas(meshes: THREE.Mesh[]): void {
    const flames = findModelledFlames(meshes);
    for (const mesh of meshes) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
    if (!flames.length) return;
    this.diyas = flames.map((f, i) => ({ at: f.foot.clone().setY(f.foot.y + DIYA_LIGHT.above), group: `diya_${i}` }));
    // A wick's flame: a little smaller than the pill that stood there.
    this.fires = new FireField(flames.map((f, i) => spotForFlame(f, `diya_${i}`, { size: f.height * 0.8, width: 0.56 })), { palette: DIYA_PALETTE });
    for (const d of this.diyas) this.fires.set(d.group, 1);
    this.group.add(this.fires.mesh);
    for (let i = 0; i < DIYA_LIGHTS; i++) {
      const light = new THREE.PointLight(DIYA_LIGHT.color, 0, DIYA_LIGHT.distance, DIYA_LIGHT.decay);
      light.name = 'Dwarka_Diya_Light';
      light.castShadow = false;
      this.diyaLights.push(light);
      this.group.add(light);
    }
  }

  /** The flames lean and gutter in the rain's wind; the diyas nearest the camera get the lights, breathing with them. */
  private updateDiyas(time: number, camera: THREE.Camera): void {
    if (!this.fires) return;
    const wind = this.rain?.wind;
    if (wind) this.fires.setWind(wind.x, wind.y);
    this.fires.update(time);
    const eye = camera.position;
    const near = [...this.diyas].sort((a, b) => a.at.distanceToSquared(eye) - b.at.distanceToSquared(eye));
    this.diyaLights.forEach((light, i) => {
      const diya = near[i];
      if (!diya) return;
      light.position.copy(diya.at);
      light.intensity = DIYA_LIGHT.intensity * this.fires!.flicker(diya.group);
    });
  }

  /** The sea: 'full', 'low' (a quarter of the triangles, simpler foam, no raindrops on it) or 'flat' (no swells either). */
  public setSeaQuality(quality: SeaQuality): void {
    Level3_Dwarka.seaQuality = quality;
    this.sea?.setQuality(quality);
  }

  /** Dev (`__debug.tide`): hold the tide at a level (null: let it run), change its pace, scale the swells. */
  public debugTide(opts: TideDebug & { quality?: SeaQuality }): LivingSea['state'] | null {
    if (opts.quality) this.setSeaQuality(opts.quality);
    this.sea?.debug(opts);
    return this.sea?.state ?? null;
  }

  /** The storm's three draws: the cloud deck, the rain, and the splashes on the floor. */
  private addRain(): void {
    this.sky = new StormSky(0x4c535c, 0x7c838b, (this.atmosphere.fog as { color: number }).color, SUN_POSITION.clone().sub(SUN_TARGET));
    this.rain = new RainField(RAIN_DROPS);
    this.splashes = new GroundSplashes({ floorY: DWARKA_FLOOR_Y, arenaRadius: 12.2, ...SPLASH_SLOTS });
    this.group.add(this.sky.mesh, this.rain.mesh, this.splashes.mesh);
    this.setRain(Level3_Dwarka.rainLevel);
    // Blood on the stone washes out in the rain.
    BloodFX.getInstance().wet = true;
    // Every dust puff on the floor (landings, slides, roars, leaps) is water thrown up instead.
    ParticleFX.getInstance().onGroundImpact = (origin, count) => {
      if (Math.abs(origin.y - DWARKA_FLOOR_Y) > 0.5 || !this.splashes) return false;
      const strength = THREE.MathUtils.clamp(count / 7, 1.2, 5);
      if (!this.splashes.add(origin.x, origin.z, strength)) return false;
      this.splashSound(strength);
      return true;
    };
  }

  /** Rain density: 'full', 'low' (a third of the drops and splashes) or 'off' (the stone stays wet). */
  public setRain(level: RainLevel): void {
    Level3_Dwarka.rainLevel = level;
    this.rain?.setLevel(level);
    this.splashes?.setRaindrops(level === 'full' ? 1 : level === 'low' ? 0.35 : 0);
    this.sea?.setRain(level === 'full' ? 1 : level === 'low' ? 0.5 : 0);
  }

  private splashSound(strength: number): void {
    const now = performance.now();
    if (strength < 1.4 || now - this.lastSplashSound < 90) return;
    this.lastSplashSound = now;
    SoundFX.getInstance().playSplash(strength);
  }

  public override dispose(): void {
    ParticleFX.getInstance().onGroundImpact = null;
    BloodFX.getInstance().wet = false;
    this.fires?.dispose();
    this.footfalls = null;
    this.rain = null;
    this.sky = null;
    this.splashes = null;
    this.sea = null;
    super.dispose();
  }

  /** Sparse dust drifting around the arena rim, as in the export's preview. */
  private addDust(): void {
    let seed = 734819;
    const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < DUST_COUNT; i++) {
      const radius = 11.8 + random() * 7;
      const angle = random() * Math.PI * 2;
      this.dustOrigins.set([Math.cos(angle) * radius, DWARKA_FLOOR_Y + 0.2 + random() * 4, Math.sin(angle) * radius], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.dustOrigins.slice(), 3));
    const size = 16;
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const r = Math.hypot((x - 7.5) / 7.5, (y - 7.5) / 7.5);
      pixels.set([255, 255, 255, Math.round(Math.max(0, 1 - r) ** 2 * 255)], (y * size + x) * 4);
    }
    const sprite = new THREE.DataTexture(pixels, size, size);
    sprite.needsUpdate = true;
    this.ownedTextures.add(sprite);
    this.dust = new THREE.Points(geometry, new THREE.PointsMaterial({
      color: 0xd7bf8d, map: sprite, size: 0.07, opacity: 0.2, transparent: true, depthWrite: false,
    }));
    this.dust.name = 'Dwarka_Rim_Dust';
    this.dust.frustumCulled = false;
    this.group.add(this.dust);
  }

  public override update(time: number, dt: number, camera: THREE.Camera): void {
    super.update(time, dt, camera);
    this.updateStorm(dt, camera);
    this.updateDiyas(time, camera);
    // The sea's normals drift; the tide and the swells move it; the boat rides them.
    for (const normal of this.waterNormals) normal.offset.set((time * 0.002) % 1, (time * 0.0011) % 1);
    this.sea?.update(dt, camera);
    this.rideBoat(dt);
    if (this.dust) {
      const pos = this.dust.geometry.attributes.position as THREE.BufferAttribute;
      const a = pos.array as Float32Array;
      for (let i = 0; i < DUST_COUNT; i++) {
        a[i * 3] = this.dustOrigins[i * 3] + Math.sin(time * 0.12 + i) * 0.5;
        a[i * 3 + 1] = this.dustOrigins[i * 3 + 1] + Math.sin(time * 0.22 + i * 0.7) * 0.2;
      }
      pos.needsUpdate = true;
    }
  }

  /**
   * The moored boat rides the sea: up and down with the tide and the swells under its middle, pitching and rolling with
   * the slope between bow and stern and from side to side, all eased (a laden hull answers slowly). Its mooring ropes'
   * boat ends go with it.
   */
  private rideBoat(dt: number): void {
    const boat = this.boat;
    if (!boat || dt <= 0) return;
    const { x, z } = boat.base;
    const heave = seaHeight(x, z);
    const pitch = Math.atan2(seaHeight(x + BOAT_HALF_LENGTH, z) - seaHeight(x - BOAT_HALF_LENGTH, z), BOAT_HALF_LENGTH * 2);
    const roll = -Math.atan2(seaHeight(x, z + BOAT_HALF_BEAM) - seaHeight(x, z - BOAT_HALF_BEAM), BOAT_HALF_BEAM * 2);
    const k = 1 - Math.exp(-dt * 1.6);
    boat.heave += (heave - boat.heave) * k;
    boat.pitch += (pitch * 0.7 - boat.pitch) * k;
    boat.roll += (roll * 0.7 - boat.roll) * k;
    boat.object.position.y = boat.base.y + boat.heave;
    boat.object.quaternion.setFromEuler(BOAT_TILT.set(boat.roll, 0, boat.pitch)).multiply(boat.turn);
    if (this.moorings) this.moorings.uniform.value = boat.heave;
  }

  /** The storm runs on game time (it hangs while paused); a lightning flash is read off the sky light it raises. */
  private updateStorm(dt: number, camera: THREE.Camera): void {
    if (!this.rain || !this.sky || !this.splashes) return;
    const sm = SceneManager.getInstance();
    const flash = THREE.MathUtils.clamp((sm.hemiLight.intensity / this.atmosphere.hemi.intensity - 1) / 4, 0, 1);
    tickWetMaterials(dt);
    this.sky.update(dt, camera, flash);
    this.rain.update(dt, camera as THREE.PerspectiveCamera, sm.renderer.domElement.height, flash);
    this.splashes.update(dt, camera, flash);
    const scene = this.group.parent;
    if (!this.footfalls && scene) {
      this.footfalls = new Footfalls(scene, this.splashes, DWARKA_FLOOR_Y, {
        step: (s) => SoundFX.getInstance().playWetStep(s),
        splash: (s) => this.splashSound(s),
      });
    }
    this.footfalls?.update(dt);
  }
}

import * as THREE from 'three';
import { GLBLevel } from './GLBLevel';
import type { LevelAtmosphere } from './LevelTypes';
import { WaterRippleMaterial } from './environment/WaterRippleMaterial';
import { WeatherParticles } from './environment/WeatherParticles';
import { SkyDome, prepareEquirect } from './environment/SkyDome';
import { AgniBeacon } from './environment/AgniBeacon';
import { MistSleeveMaterial, addSleeveHeights } from './environment/MistSleeve';
import { addSnowCover, type SnowCover } from './environment/SnowCover';
import { addRimLight, createToonRamp, liftAlbedo, toonifyModel, toToonMaterial } from './environment/ToonRelight';
import { SceneManager } from '../core/SceneManager';
import { ParticleFX } from '../combat/ParticleFX';

const LEVEL_URL = '/assets/levels/charnel_ridge.glb';
const SKY_URL = '/assets/sky/charnel_eclipse_4096.jpg';
// From level 3/web_sky/sky_manifest.json (three axes, from the sky bake origin).
const ECLIPSE_DIR = new THREE.Vector3(0.0, 0.35112, -0.93633);
const FLASHES = [
  { url: '/assets/sky/charnel_flash1_2048.jpg', dir: new THREE.Vector3(0.8713, 0.3746, 0.3171) },
  { url: '/assets/sky/charnel_flash2_2048.jpg', dir: new THREE.Vector3(-0.6243, 0.4695, 0.6243) },
  { url: '/assets/sky/charnel_flash3_2048.jpg', dir: new THREE.Vector3(-0.8236, 0.309, -0.4755) },
];
// Exported lights further out than this sit inside the baked sky's reach; their glow is emissive + bloom.
// The Agni beacon's fire light is the exception - the animated beacon drives it.
const LIVE_LIGHT_RADIUS = 45;
const BEACON_LIGHT = 'Point_Beacon_Fire';
// In Blender the fog volume scatters the Agni spot and brazier fires into a warm glow on the dais; without
// volumetrics they need more direct light to read.
const WARM_LIGHT_BOOST: Record<string, number> = { Spot_Agni_Beacon: 2.5, Point_Brazier_Fire_E: 1.6, Point_Brazier_Fire_W: 1.6 };
// Albedo gamma per baked family: basalt is near-black (#1C1E22) and needs the most lift.
const ALBEDO_LIFT: Record<string, number> = {
  Coarse_Basalt_Ash: 0.72, Basalt_Ash_Floor: 0.72, Basalt_Ash_Floor_Crag: 0.72, Monument_Basalt: 0.75,
  Slate_Silhouette: 0.72, Vista_Pinnacle_Rock: 0.72, Temple_Weathered_Stone: 0.85, Pilgrim_Trail_Stone: 0.85,
  Weathered_Timber: 0.85,
};
// Extra snow over the bake, which left cliff faces bare: rock walls get vertical runs, walkable floors only a
// light dusting (they already carry baked drifts and the blood).
const SNOW_COVER: Record<string, SnowCover> = {
  Coarse_Basalt_Ash: { amount: 1, wall: 1 },
  Slate_Silhouette: { amount: 1, wall: 0.9 },
  Vista_Pinnacle_Rock: { amount: 1, wall: 0.9 },
  Basalt_Ash_Floor_Crag: { amount: 0.8, wall: 0.8 },
  Basalt_Ash_Floor: { amount: 0.35, wall: 0 },
  Temple_Weathered_Stone: { amount: 0.6, wall: 0.3 },
  Pilgrim_Trail_Stone: { amount: 0.5, wall: 0.2 },
};

/**
 * Level 3: frozen octagonal basalt plateau above a cloud sea under a silver solar eclipse, cel-shaded with
 * ink lines. Distant peaks, the volcano and the Rakshasa / Vasuki reliefs are baked into the sky panorama;
 * the arena, ruins, lakes, bridges and near outcrops are geometry whose procedural Blender look-dev was
 * baked to textures at export (materials arrive as `<family>@<object>`).
 */
export class Level3_Summit extends GLBLevel {
  public readonly id = 3;
  public readonly title = 'Level 3: Kailasha Summit';
  public readonly subtitle = 'The Charnel Ridge Beneath the Eclipse • Grandmaster Mahayodha (Agni Duel)';
  public readonly atmosphere: LevelAtmosphere = {
    background: new THREE.Color(0x0a0b0e),
    backgroundIntensity: 1.0,
    environment: null,
    environmentIntensity: 0.45,
    // Grey-blue mountain haze as in the Blender renders: it lifts distance instead of burying it in black.
    fog: { color: 0x5b6475, density: 0.0105 },
    ambient: { color: 0x8793ad, intensity: 0.3 },
    hemi: { sky: 0xa3aec6, ground: 0x2a2c33, intensity: 1.0 },
    key: { color: 0xdce8ff, intensity: 2.6, direction: ECLIPSE_DIR },
    exposure: 1.25,
    bloom: { threshold: 0.88, smoothing: 0.1, intensity: 1.7 },
    vignette: { offset: 0.3, darkness: 0.6 },
    ink: { color: 0x07080c, thickness: 1.0, threshold: 0.014, fadeNear: 35, fadeFar: 90 },
  };

  private ramp = createToonRamp([0.22, 0.48, 0.82, 1.0]);
  private monumentRamp = createToonRamp([0.1, 0.34, 0.76, 1.0]);
  private sky: SkyDome | null = null;
  private flashTextures: THREE.Texture[] = [];
  private flashLight = new THREE.DirectionalLight(0xc9d8ff, 0);
  private weather = new WeatherParticles({
    count: 6000,
    extent: new THREE.Vector3(56, 26, 56),
    fallSpeed: 1.4,
    swirl: 1.8,
    wind: new THREE.Vector2(-0.9, 0.35),
    size: 0.035,
    ashFraction: 0.3,
    emberFraction: 0.03,
  });
  private beacon: AgniBeacon | null = null;
  private mist: MistSleeveMaterial | null = null;
  private lakes: WaterRippleMaterial[] = [];
  private scrollers: THREE.Texture[] = [];
  private flamePoints: THREE.Vector3[] = [];
  private particleFX = ParticleFX.getInstance();
  private nextStrike = 6 + Math.random() * 6;
  private strike: { start: number; flash: number } | null = null;

  constructor() {
    super(LEVEL_URL);
    // Merge the remaining props per material (the exporter already joined the smallest ones).
    this.batchStatic = true;
    this.ownedTextures.add(this.ramp).add(this.monumentRamp);
    this.playerSpawn.set(0, 0, 6);
    this.flashLight.name = 'Summit_Lightning';
    this.group.add(this.flashLight, this.flashLight.target, this.weather.points);
  }

  protected async loadEnvironment(): Promise<void> {
    const loader = new THREE.TextureLoader();
    const [sky, ...flashes] = await Promise.all([SKY_URL, ...FLASHES.map((f) => f.url)].map((u) => loader.loadAsync(u)));
    [sky, ...flashes].forEach((t) => this.ownedTextures.add(prepareEquirect(t)));
    this.flashTextures = flashes;
    this.sky = new SkyDome(sky);
    this.group.add(this.sky.mesh);

    // Image-based fill from the same panorama, so ice, water and steel pick up the cloud sea and corona.
    const envSource = sky.clone();
    envSource.mapping = THREE.EquirectangularReflectionMapping;
    this.atmosphere.environment = this.bakeEnvironment(envSource);
    envSource.dispose();
    this.atmosphere.background = new THREE.Color(0x0a0b0e); // the dome draws the sky
  }

  protected override prepareExportedLight(light: THREE.Light): void {
    super.prepareExportedLight(light);
    if (!light.parent) return;
    if (light.name === BEACON_LIGHT) return; // flickered by the beacon itself
    light.intensity *= WARM_LIGHT_BOOST[light.name] ?? 1;
    if (light.getWorldPosition(new THREE.Vector3()).length() > LIVE_LIGHT_RADIUS) {
      light.removeFromParent();
    } else if (!light.userData.flicker && /Brazier|Fire/.test(light.name)) {
      this.addFlicker(light);
    }
  }

  protected prepareModel(model: THREE.Object3D): void {
    const box = new THREE.Box3();
    const found: { beam: THREE.Mesh | null; light: THREE.PointLight | null } = { beam: null, light: null };
    model.traverse((obj) => {
      if (obj.name === BEACON_LIGHT) found.light = obj as THREE.PointLight;
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const far = /^(Environment_|Vista_)/.test(mesh.name) || /^(Environment_|Vista_)/.test(mesh.parent?.name ?? '');
      mesh.castShadow = !far;
      mesh.receiveShadow = !far;
      const names = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => m.name);
      if (names.includes('VFX_Beacon_Placeholder')) found.beam = mesh;
      if (names.includes('Vista_Mist_Collar')) {
        // Every sleeve (not just the first): a translucent collar must not throw a solid cylinder shadow.
        mesh.castShadow = mesh.receiveShadow = false;
        if (!mesh.geometry.attributes.aHeight) addSleeveHeights(mesh.geometry);
      }
      if (names.includes('VFX_Brazier_Flame')) {
        box.setFromObject(mesh);
        this.flamePoints.push(new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y + 0.15, (box.min.z + box.max.z) / 2));
      }
      if (names.includes('Skull_Socket_Void')) mesh.castShadow = false;
    });

    toonifyModel(model, this.ramp, (src, mesh) => this.convertMaterial(src as THREE.MeshStandardMaterial, mesh));

    // The beam's foot sits on the altar; the fire light hovers 2.5 m above it.
    const altar = new THREE.Vector3();
    if (found.beam) {
      box.setFromObject(found.beam);
      altar.set((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
    } else if (found.light) {
      found.light.getWorldPosition(altar).y -= 2.5;
    }
    if (found.beam || found.light) {
      this.beacon = new AgniBeacon(found.beam, altar, found.light);
      this.group.add(this.beacon.group);
    }

    this.collectBloom(model);
    this.bloomObjects.push(this.weather.points, ...(this.beacon?.glowing ?? []));
  }

  /** Level-specific conversions; undefined falls through to the default toon conversion. */
  private convertMaterial(mat: THREE.MeshStandardMaterial, mesh: THREE.Mesh): THREE.Material | undefined {
    const family = mat.name.split('@')[0];
    switch (family) {
      case 'Monument_Basalt': {
        // Shiva and Nandi: the same pronounced cel treatment as Hanuman and Kaali, with an eclipse-silver rim.
        const stone = toToonMaterial(mat, this.monumentRamp);
        liftAlbedo(stone, ALBEDO_LIFT[family]);
        addRimLight(stone, { color: 0xdce8ff, strength: 0.6, start: 0.64 });
        return stone;
      }
      case 'Mat_RakshasTal':
      case 'Mat_Manasarovar': {
        // Rakshas Tal is the demon lake: near-black with a blood cast. Manasarovar stays glacial blue.
        const lake = new WaterRippleMaterial(family === 'Mat_RakshasTal'
          ? { color: 0x160607, opacity: 0.92, roughness: 0.06, envMapIntensity: 1.3, waveStrength: 0.3, waveScale: 1.6 }
          : { color: 0x12303f, opacity: 0.9, roughness: 0.04, envMapIntensity: 1.5, waveStrength: 0.3, waveScale: 1.6 });
        this.lakes.push(lake);
        mesh.receiveShadow = true;
        return lake;
      }
      case 'Mat_Manasarovar_Falls': {
        const streaks = createStreakTexture();
        this.scrollers.push(streaks);
        return new THREE.MeshBasicMaterial({ name: mat.name, map: streaks, color: 0xb4c6d8, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
      }
      case 'Vista_Mist_Collar':
        this.mist ??= new MistSleeveMaterial(0x9aa4b5, 0.55);
        return this.mist;
      case 'VFX_Beacon_Placeholder':
        return mat; // re-materialised by the AgniBeacon
      case 'Lantern_Flame':
      case 'VFX_Brazier_Flame': {
        mesh.castShadow = mesh.receiveShadow = false;
        const tint = family === 'Lantern_Flame' ? new THREE.Color(1, 0.42, 0.08) : new THREE.Color(1, 0.28, 0.04);
        return new THREE.MeshBasicMaterial({ name: mat.name, color: tint.multiplyScalar(6), fog: false });
      }
      default: {
        if (!(family in ALBEDO_LIFT)) return undefined;
        const baked = toToonMaterial(mat, this.ramp);
        liftAlbedo(baked, ALBEDO_LIFT[family]);
        if (SNOW_COVER[family]) addSnowCover(baked, SNOW_COVER[family]);
        return baked;
      }
    }
  }

  public override update(time: number, dt: number, camera: THREE.Camera): void {
    super.update(time, dt, camera);
    const viewportHeight = SceneManager.getInstance().renderer.domElement.height;
    this.sky?.follow(camera);
    this.weather.update(time, camera.position, viewportHeight);
    this.beacon?.update(time, viewportHeight);
    this.mist?.update(time);
    this.lakes.forEach((l) => l.update(time));
    this.scrollers.forEach((t) => t.offset.set(0, time * 0.9));
    for (const p of this.flamePoints) if (Math.random() < 0.6) this.particleFX.spawnFlames(p, 1, 0.3);
    this.updateLightning(time);
  }

  /** Crossfade to a lightning-lit panorama, flicker 2-3 times, fade back; a cool light strikes from that side. */
  private updateLightning(time: number): void {
    if (!this.sky || this.flashTextures.length === 0) return;
    if (!this.strike && time >= this.nextStrike) {
      const flash = Math.floor(Math.random() * FLASHES.length);
      this.strike = { start: time, flash };
      this.sky.setFlash(this.flashTextures[flash], 0);
      this.flashLight.position.copy(FLASHES[flash].dir).multiplyScalar(60);
      this.nextStrike = time + 9 + Math.random() * 14;
    }
    if (!this.strike) return;
    const t = time - this.strike.start;
    // Three quick pulses (~50 ms rise), then a ~300 ms tail.
    const pulse = (at: number, peak: number) => peak * Math.max(0, 1 - Math.abs(t - at) / 0.05);
    let mix = Math.max(pulse(0.05, 1), pulse(0.19, 0.55), pulse(0.33, 0.9));
    if (t > 0.33) mix = Math.max(mix, 0.9 * Math.max(0, 1 - (t - 0.33) / 0.3));
    this.sky.setFlash(null, mix);
    this.flashLight.intensity = mix * 3.2;
    if (t > 0.7) {
      this.strike = null;
      this.sky.setFlash(null, 0);
      this.flashLight.intensity = 0;
    }
  }
}

/** Vertical water streaks for the Manasarovar falls, scrolled downward in `update`. */
function createStreakTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(180, 200, 220, 0.35)';
  ctx.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 64;
    const y = Math.random() * 256;
    ctx.fillStyle = `rgba(235, 245, 255, ${0.3 + Math.random() * 0.6})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 20 + Math.random() * 60);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { GLBLevel } from './GLBLevel';
import type { LevelAtmosphere } from './LevelTypes';
import { WaterRippleMaterial } from './environment/WaterRippleMaterial';
import { addRimLight, createToonRamp, toonifyModel, toToonMaterial } from './environment/ToonRelight';
import { ParticleFX } from '../combat/ParticleFX';

const LEVEL_URL = '/assets/levels/moonlit_baoli.glb';
// The fighting platform; the level is re-centred so its top-centre is the origin (spawns, bounds are relative).
const ARENA_FLOOR = 'Arena_Floor';
// Direction from the arena toward the moon baked into the sky (Blender -> three axes).
const MOON_DIR = new THREE.Vector3(0.299, 0.707, -0.641).normalize();

const ADDITIVE_MATERIALS = new Set(['FX_Glow', 'FX_Glow_Far', 'Flame_Outer']);
const SOFT_TRANSPARENT = new Set(['Waterfall_Sheet', 'Waterfall_Streaks', 'Waterfall_Foam', 'Mist', 'Mist_Water']);
const DECALS = new Set(['Yantra_Groove', 'Yantra_Gold']);
const SHADOW_CASTERS = /^(Pillar_|Pedestal_|Statue_|Temple_|Deco_HangingLamps|Deco_Curtains)/;
const SHADOW_RECEIVERS = /^(Arena_Floor|Arena_Steps|Arena_PoolBed|Arena_Yantra|Env_Ground|Env_Pathways|Temple_)/;
// The Devi (Durga) shrine gets the same pronounced cel treatment as the Level 2 Hanuman monolith.
const DEITY_STONE = new Set(['Devi_Stone', 'Kaali_Black', 'Kaali_Sandstone']);

interface Scroller { texture: THREE.Texture; speed: THREE.Vector2 }

/**
 * Level 1: moonlit stepwell arena - shallow rippling pool, waterfalls, mist, Devi shrine.
 * Cel-shaded with ink lines like Level 2; water, mist, waterfalls and glows keep their own shading.
 */
export class Level1_Baoli extends GLBLevel {
  public readonly id = 1;
  public readonly title = 'Level 1: The Moonlit Baoli';
  public readonly subtitle = 'Submerged Stepped Ghat • Baoli Guardian Boss Duel';
  public readonly atmosphere: LevelAtmosphere = {
    background: new THREE.Color(0x070b16),
    backgroundIntensity: 1.0,
    environment: null,
    environmentIntensity: 0.35,
    fog: { color: 0x0a1224, density: 0.0045 },
    ambient: { color: 0x6d86b8, intensity: 0.2 },
    hemi: { sky: 0x7ea0d6, ground: 0x1a2130, intensity: 0.34 },
    key: { color: 0xd4e9ff, intensity: 1.3, direction: MOON_DIR },
    exposure: 1.2,
    bloom: { threshold: 0.85, smoothing: 0.12, intensity: 1.3 },
    vignette: { offset: 0.3, darkness: 0.6 },
    ink: { color: 0x04050c, thickness: 1.0, threshold: 0.014, fadeNear: 30, fadeFar: 75 },
  };
  private ramp = createToonRamp([0.18, 0.45, 0.8, 1.0]);
  private deityRamp = createToonRamp([0.07, 0.3, 0.74, 1.0]);
  public waterMaterial: WaterRippleMaterial | null = null;
  private scrollers: Scroller[] = [];
  private particleFX = ParticleFX.getInstance();

  constructor() {
    super(LEVEL_URL);
    this.ownedTextures.add(this.ramp).add(this.deityRamp);
    this.anchorNode = ARENA_FLOOR;
    // The whole stepwell is the arena: the 28 m island, the wadeable pool (bed 0.7 m down) and the terraced
    // steps up to just inside the colonnades and corner chhatris (~42.5 m out). The temples, shrine and
    // jungle beyond the rim are off-limits.
    this.arenaBoundsSpec = { shape: { kind: 'rect', center: [0, 0], halfExtents: [41, 41] }, floorY: -1.5, height: 14 };
    this.killPlaneY = -12;
  }

  protected async loadEnvironment(): Promise<void> {
    const [bg, hdr] = await Promise.all([
      new THREE.TextureLoader().loadAsync('/assets/sky/baoli_night_sky_4k.jpg'),
      new HDRLoader().loadAsync('/assets/sky/baoli_night_sky_1k.hdr'),
    ]);
    bg.mapping = THREE.EquirectangularReflectionMapping;
    bg.colorSpace = THREE.SRGBColorSpace;
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    this.atmosphere.environment = this.bakeEnvironment(hdr);
    hdr.dispose();
    this.ownedTextures.add(bg);
    this.atmosphere.background = bg;
  }

  protected prepareModel(model: THREE.Object3D): void {
    const scrolledMaps = new Set<THREE.Texture>();
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = SHADOW_CASTERS.test(mesh.name) || SHADOW_CASTERS.test(mesh.parent?.name ?? '');
      mesh.receiveShadow = SHADOW_RECEIVERS.test(mesh.name) || SHADOW_RECEIVERS.test(mesh.parent?.name ?? '');

      const scroll = obj.userData.uv_scroll ?? mesh.parent?.userData.uv_scroll;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        this.fixMaterial(mat, mesh);
        if (scroll && mat.map && !scrolledMaps.has(mat.map)) {
          scrolledMaps.add(mat.map);
          mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
          this.scrollers.push({ texture: mat.map, speed: new THREE.Vector2(scroll[0], scroll[1]) });
        }
      });
    });
    toonifyModel(model, this.ramp, (src) => this.toonOverride(src as THREE.MeshStandardMaterial));
    this.collectBloom(model);

    // Pillars the dodge-roll can wall-kick from.
    model.traverse((obj) => {
      if (/^Pillar_/.test(obj.name) && obj.userData.collider === 'cylinder') {
        this.wallKickPoints.push(obj.getWorldPosition(new THREE.Vector3()).setY(0));
      }
    });
  }

  /** Cel-shading exceptions; undefined falls through to the default toon conversion. */
  private toonOverride(src: THREE.MeshStandardMaterial): THREE.Material | undefined {
    if (src.name === 'Water_Deep') return src; // plunge pools keep their reflections
    if (DEITY_STONE.has(src.name)) {
      const stone = toToonMaterial(src, this.deityRamp);
      stone.normalScale.multiplyScalar(1.4);
      addRimLight(stone, { color: 0xa9c8ff, strength: 0.55, start: 0.66 });
      return stone;
    }
    if (src.name === 'Yantra_Gold') {
      // Textured metal has no specular in toon; lift it and let it glint so the inlay still reads as gold.
      const gold = toToonMaterial(src, this.ramp);
      gold.color.setRGB(1.6, 1.25, 0.6);
      gold.emissive.setRGB(0.16, 0.1, 0.02);
      gold.emissiveMap = src.map;
      return gold;
    }
    return undefined;
  }

  private fixMaterial(mat: THREE.MeshStandardMaterial, mesh: THREE.Mesh): void {
    const name = mat.name;
    if (ADDITIVE_MATERIALS.has(name)) {
      mat.transparent = true;
      mat.blending = THREE.AdditiveBlending;
      mat.depthWrite = false;
      mesh.renderOrder = 3;
    } else if (SOFT_TRANSPARENT.has(name)) {
      mat.transparent = true;
      mat.depthWrite = false;
      mat.side = THREE.DoubleSide;
      mesh.renderOrder = 2;
    } else if (DECALS.has(name)) {
      mat.transparent = true;
      mat.depthWrite = false;
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = -2;
      mat.polygonOffsetUnits = -2;
      mesh.renderOrder = 1;
    } else if (name.startsWith('Foliage_')) {
      mat.alphaTest = 0.5;
      mat.transparent = false;
      mat.side = THREE.DoubleSide;
    } else if (name === 'Water_Shallow') {
      // Transmission is too costly for gameplay; a reflective translucent surface with analytic ripples instead.
      this.waterMaterial ??= new WaterRippleMaterial({
        color: 0x0b2230,
        opacity: 0.78,
        roughness: 0.04,
        envMapIntensity: 1.4,
        waveStrength: 0.4,
      });
      mat.dispose();
      mesh.material = this.waterMaterial;
    } else if (name === 'Riverbed_Rock_Arena') {
      mat.roughness = 0.6; // Blender remapped this texture to 0.2-0.55 for a damp look
    } else if (name === 'Stone_Steps_Wet') {
      mat.roughness = 0.35;
    }
  }

  public override update(time: number, dt: number, camera: THREE.Camera): void {
    super.update(time, dt, camera);
    for (const s of this.scrollers) {
      s.texture.offset.set(s.speed.x * time, s.speed.y * time);
    }
    this.waterMaterial?.update(time);
    if (Math.random() < 0.2) this.particleFX.spawnMist(14);
  }
}

import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { GLBLevel } from './GLBLevel';
import type { LevelAtmosphere } from './LevelTypes';
import { WaterRippleMaterial } from './environment/WaterRippleMaterial';
import { addRimLight, createToonRamp, patchShader, toonifyModel, toToonMaterial } from './environment/ToonRelight';
import { FireField, findModelledFlames, spotForFlame, type FireSpot } from './environment/FireField';
import { Emitter, ParticleFX } from '../combat/ParticleFX';

const LEVEL_URL = '/assets/levels/moonlit_baoli.glb';
// The fighting platform; the level is re-centred so its top-centre is the origin (spawns, bounds are relative).
const ARENA_FLOOR = 'Arena_Floor';
// Direction from the arena toward the moon baked into the sky (Blender -> three axes).
const MOON_DIR = new THREE.Vector3(0.299, 0.707, -0.641).normalize();

const ADDITIVE_MATERIALS = new Set(['FX_Glow', 'FX_Glow_Far', 'Flame_Outer']);
/**
 * The export's flames: a faceted core (lit, ink-outlined) in an additive shell, static. Burned by a FireField instead,
 * all but the far fort's lamps (`FX_*`): dots of light across the valley, too far off for a flame's shape to show.
 */
const FLAME_MATERIALS = new Set(['Flame_Core', 'Flame_Outer']);
const DISTANT_LAMPS = /^FX_/;
/**
 * The near lamps' glow halos (`FX_Glow`, additive): from across the stepwell they make the lamps read, but within a
 * couple of metres they washed the whole frame out over the flames. They fade out between these distances (metres from
 * the camera); the FireField's own glow is there up close.
 */
const NEAR_GLOW_FADE = { from: 1.5, to: 6 };
/** The deepastambhas' torch lights, each breathing with its own lamp's flames. */
const TORCH_LIGHT = /^Torch_Light_/;
/** The Devi's lamps' light, breathing with them. */
const KAALI_LIGHT = 'Kaali_Uplight';
const SOFT_TRANSPARENT = new Set(['Waterfall_Sheet', 'Waterfall_Streaks', 'Waterfall_Foam', 'Mist', 'Mist_Water']);
const DECALS = new Set(['Yantra_Groove', 'Yantra_Gold']);
const SHADOW_CASTERS = /^(Pillar_|Pedestal_|Statue_|Temple_|Deco_HangingLamps|Deco_Curtains)/;
const SHADOW_RECEIVERS = /^(Arena_Floor|Arena_Steps|Arena_PoolBed|Arena_Yantra|Env_Ground|Env_Pathways|Temple_)/;
// The Devi (Durga) shrine gets the same pronounced cel treatment as the Level 2 Hanuman monolith.
const DEITY_STONE = new Set(['Devi_Stone', 'Kaali_Black', 'Kaali_Sandstone']);
/**
 * The Devi's shrine on the terrace above the stepwell, ~66 m from the island (the statue, its pedestal, lamps,
 * offerings and glow, all under one node whose origin is the pedestal's base): twice its modelled size, so the Devi
 * reads from the arena and stands over the boy who kneels to her (docs/STORY.md, "The divya kavach"). Its lights move
 * out with it.
 */
const SHRINE = 'Kaali_Shrine';
const SHRINE_SCALE = 2;
const SHRINE_LIGHTS = ['Kaali_Uplight', 'Kaali_Spot', 'Kaali_Rim'];
/** The terrace's paving there (game coordinates). */
const TERRACE_Y = 4.15;

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
  /** The mist over the water, at a rate (never per frame, nothing while paused). */
  private readonly mist = new Emitter();
  /** Every near flame in the stepwell (see FireField), and the deepastambhas' torch lights by group. */
  private fires: FireField | null = null;
  private readonly torchLights: THREE.Light[] = [];

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

  /** The deepastambhas' torch lights and the Devi's uplight breathe with their own flames (see `lightFlames`). */
  protected override prepareExportedLight(light: THREE.Light): void {
    super.prepareExportedLight(light);
    if (!light.parent) return;
    if (TORCH_LIGHT.test(light.name)) this.torchLights.push(light);
    if (light.name === KAALI_LIGHT) this.flickerWith(light, () => this.fires?.flicker('kaali') ?? 1);
  }

  protected prepareModel(model: THREE.Object3D): void {
    this.enlargeShrine(model);
    this.lightFlames(model);
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
    if (this.fires) this.bloomObjects.push(this.fires.mesh);
  }

  /**
   * The near flames (the deepastambhas' tiers and crowns, the Devi's lamps and her offering, the diyas down the steps,
   * the hanging lamps) burn in one FireField: the export's static cores and shells only say where (each flame measured,
   * its core and shell one flame), and go. They are no longer outlined in ink (they write no depth). Each deepastambha
   * is a group of its own, and its torch light (`Torch_Light_*`, on its crown) breathes with it.
   */
  private lightFlames(model: THREE.Object3D): void {
    model.updateMatrixWorld(true);
    const meshes = new Map<string, THREE.Mesh[]>();
    const centre = new THREE.Vector3();
    const lightAt = this.torchLights.map((l) => l.getWorldPosition(new THREE.Vector3()));
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material) || !FLAME_MATERIALS.has(mesh.material.name)) return;
      if (DISTANT_LAMPS.test(mesh.name) || DISTANT_LAMPS.test(mesh.parent?.name ?? '')) return;
      new THREE.Box3().setFromObject(mesh).getCenter(centre);
      // A deepastambha's flames go with the torch light on its crown; the rest by what they are.
      const torch = lightAt.findIndex((p) => Math.hypot(p.x - centre.x, p.z - centre.z) < 1.5);
      const name = `${mesh.parent?.name ?? ''} ${mesh.name}`;
      const group = torch >= 0 ? `stambha_${torch}` : /Kaali/.test(name) ? 'kaali' : /Hanging/.test(name) ? 'hanging' : 'diya';
      const list = meshes.get(group) ?? [];
      list.push(mesh);
      meshes.set(group, list);
    });
    const spots: FireSpot[] = [];
    for (const [group, list] of meshes) {
      // Sized to the flame inside its shell (the shell was a glow round it): a little under the shell's height.
      for (const flame of findModelledFlames(list)) spots.push(spotForFlame(flame, group, { size: flame.height * 0.95, tongues: flame.height > 0.25 ? 2 : 1 }));
      for (const mesh of list) mesh.removeFromParent();
    }
    if (!spots.length) return;
    this.fires = new FireField(spots);
    for (const group of meshes.keys()) this.fires.set(group, 1);
    this.torchLights.forEach((light, i) => this.flickerWith(light, () => this.fires?.flicker(`stambha_${i}`) ?? 1));
    this.group.add(this.fires.mesh);
  }

  /**
   * Scales the Devi's shrine about its base (`SHRINE_SCALE`), with its lights and its pedestal's authored collider,
   * and lays a floor on the terrace between the stone lions and the pedestal for the scene there (the stepwell's own
   * colliders stop at the top step; the arena's walls keep the fight off it).
   */
  private enlargeShrine(model: THREE.Object3D): void {
    const shrine = model.getObjectByName(SHRINE);
    if (!shrine) {
      console.warn(`[Level1_Baoli] no ${SHRINE} node; the Devi's shrine is left as modelled`);
      return;
    }
    const pivot = shrine.position.clone();
    shrine.scale.multiplyScalar(SHRINE_SCALE);
    shrine.traverse((o) => {
      if (o.userData.collider_radius !== undefined) o.userData.collider_radius *= SHRINE_SCALE;
      if (o.userData.collider_height !== undefined) o.userData.collider_height *= SHRINE_SCALE;
    });
    for (const name of SHRINE_LIGHTS) {
      const node = model.getObjectByName(name);
      if (!node || node.parent !== shrine.parent) continue;
      node.position.sub(pivot).multiplyScalar(SHRINE_SCALE).add(pivot);
      node.traverse((o) => {
        const light = o as THREE.PointLight;
        if (light.isLight && light.distance > 0) light.distance *= SHRINE_SCALE;
      });
    }
    model.updateMatrixWorld(true);
    this.addStaticBox(new THREE.Vector3(0, TERRACE_Y - 0.5, 57), new THREE.Vector3(13, 0.5, 8));
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
      if (name === 'FX_Glow' && !mat.userData.nearFade) {
        mat.userData.nearFade = true;
        patchShader(mat, 'nearfade', (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
gl_FragColor.rgb *= smoothstep(${NEAR_GLOW_FADE.from.toFixed(2)}, ${NEAR_GLOW_FADE.to.toFixed(2)}, length(vViewPosition));`);
        });
      }
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
    // The flames first, so the lights that breathe with them (GLBLevel's flicker) read this frame's.
    this.fires?.update(time);
    super.update(time, dt, camera);
    for (const s of this.scrollers) {
      s.texture.offset.set(s.speed.x * time, s.speed.y * time);
    }
    this.waterMaterial?.update(time);
    // Mist rising off the water: twelve puffs a second (W-11: by game time, so the same at any frame rate and none
    // while paused).
    for (let n = this.mist.take(12, dt); n > 0; n--) this.particleFX.spawnMist(14);
  }

  public override dispose(): void {
    this.fires?.dispose();
    super.dispose();
  }
}

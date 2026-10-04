import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { GLBLevel } from './GLBLevel';
import type { LevelAtmosphere } from './LevelTypes';

/**
 * Level 3: Dwarka, Krishna's sea city at sunset - a ruined circular arena on an island among temple islands, the
 * Krishna statue, a coastal fort and a moored trading boat. Built in `game asset/levels/03_dwarka/dwarka.blend` and
 * exported with its own browser notes (`game asset/levels/03_dwarka/BROWSER_NOTES.md`, `browser/scene-config.js`), whose
 * light rig, sky orientation, material rules and arena coordinates this follows. Unlike the other arenas it
 * keeps its authored PBR look (no cel shading or ink); the fight uses the campaign's follow camera.
 */
const LEVEL_URL = '/assets/dwarka/dwarka_browser.glb';
const SKY_URL = '/assets/dwarka/dwarka_horizon_sunset_2k.hdr';

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
/** Replaced by the runtime dust below (it drifts; the baked one can't). */
const BAKED_DUST = 'DW_Subtle_Rim_Dust_Motes';
const DUST_COUNT = 150;

export class Level3_Dwarka extends GLBLevel {
  public readonly id = 3;
  public readonly title = 'Level 3: Dwarka';
  public readonly subtitle = 'The sea city at sunset';
  public readonly atmosphere: LevelAtmosphere = {
    background: new THREE.Color(0xb8aaa0),
    backgroundIntensity: 0.34,
    environment: null,
    environmentIntensity: 0.34,
    fog: { color: 0xb8aaa0, near: 220, far: 2200 },
    // A broad, shadowless fill approximates the coastal sky bounce (the front bounce light is added below).
    ambient: { color: 0xffffff, intensity: 0 },
    hemi: { sky: 0xd2d6cc, ground: 0x67604b, intensity: 0.35 },
    key: { color: 0xffbb7a, intensity: 0.5, direction: SUN_POSITION.clone().sub(SUN_TARGET).normalize(), normalBias: 0.05 },
    exposure: 1.3,
    toneMapping: 'agx',
    environmentRotation: new THREE.Euler().setFromQuaternion(ENVIRONMENT_QUATERNION),
    clip: { near: 0.25, far: 5000 },
    bloom: { threshold: 0.95, smoothing: 0.1, intensity: 0.8 },
    vignette: { offset: 0.35, darkness: 0.35 },
    ink: null,
  };

  private waterNormals: THREE.Texture[] = [];
  private boat: { object: THREE.Object3D; baseY: number; baseRoll: number } | null = null;
  private dust: THREE.Points | null = null;
  private dustOrigins = new Float32Array(DUST_COUNT * 3);

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
    const front = new THREE.DirectionalLight(0xffd6a0, 0.95);
    front.name = 'Dwarka_Front_Bounce';
    front.position.set(-35, 35, 55);
    front.target.position.set(-15, 12, -25);
    this.group.add(front, front.target);
  }

  protected async loadEnvironment(): Promise<void> {
    const hdr = await new HDRLoader().loadAsync(SKY_URL);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    this.ownedTextures.add(hdr);
    this.atmosphere.background = hdr;
    this.atmosphere.environment = this.bakeEnvironment(hdr);
  }

  protected prepareModel(model: THREE.Object3D): void {
    // The fight plane (radius 10.8) as a 1 m thick disc whose top is the floor.
    this.addStaticCylinder(new THREE.Vector3(0, DWARKA_FLOOR_Y - 0.5, 0), 0.5, SAFE_RADIUS + 0.4);

    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const name = mesh.name;
      if (name === BAKED_DUST) mesh.visible = false;
      if (name === BOAT) this.boat = { object: mesh, baseY: mesh.position.y, baseRoll: mesh.rotation.x };
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
        if (material.transparent) {
          material.depthWrite = false;
          material.forceSinglePass = true;
        }
        if (decal) {
          material.polygonOffset = true;
          material.polygonOffsetFactor = -1;
          material.polygonOffsetUnits = -1;
        }
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

    this.collectBloom(model);
    this.addDust();
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
    // The sea's normals drift; the boat heaves 1.8 cm and rolls a fraction of a degree.
    for (const normal of this.waterNormals) normal.offset.set((time * 0.002) % 1, (time * 0.0011) % 1);
    if (this.boat) {
      this.boat.object.position.y = this.boat.baseY + Math.sin(time * 0.65) * 0.018;
      this.boat.object.rotation.x = this.boat.baseRoll + Math.sin(time * 0.43) * 0.0015;
    }
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
}

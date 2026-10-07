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
import { FireField, findModelledFlames, meshPieces, spotForFlame, type FireSpot } from './environment/FireField';
import { SceneManager } from '../core/SceneManager';
import { Emitter, ParticleFX } from '../combat/ParticleFX';
import { SoundFX } from '../combat/SoundFX';
import { asset } from '../core/Assets';

const LEVEL_URL = asset('levels/charnel_ridge.glb');
const SKY_URL = asset('sky/charnel_eclipse_4096.jpg');
/**
 * Where Andhaka stands up from his throne at the head of Shiva's stair (Engine's FINALES), facing down the stair (+z).
 * The throne is built behind it from his entrance clip's "seat" blocks (andhaka_intro.py measures them off his seated
 * body), so the rock always fits the model.
 */
export const ANDHAKA_THRONE = new THREE.Vector3(0, 4.05, -9.6);
/**
 * Where the healing herbs come up in the last fight (Engine's FINALES, `Sanjeevani`): beside the foot of Shiva's stair,
 * under the dais, and on the crag by Nandi at the far end of the bridge (worth the run). Put on the ground under them.
 */
export const SUMMIT_HERBS = [new THREE.Vector3(-5.6, 0, 1.6), new THREE.Vector3(3.6, -2.2, 25.4)];
const ANDHAKA_MANIFEST = asset('characters/andhaka.manifest.json');
// From game asset/levels/04_summit/web_sky/sky_manifest.json (three axes, from the sky bake origin).
const ECLIPSE_DIR = new THREE.Vector3(0.0, 0.35112, -0.93633);
const FLASHES = [
  { url: asset('sky/charnel_flash1_2048.jpg'), dir: new THREE.Vector3(0.8713, 0.3746, 0.3171) },
  { url: asset('sky/charnel_flash2_2048.jpg'), dir: new THREE.Vector3(-0.6243, 0.4695, 0.6243) },
  { url: asset('sky/charnel_flash3_2048.jpg'), dir: new THREE.Vector3(-0.8236, 0.309, -0.4755) },
];
// Exported lights further out than this sit inside the baked sky's reach; their glow is emissive + bloom.
// The Agni beacon's fire light is the exception - the animated beacon drives it.
const LIVE_LIGHT_RADIUS = 45;
const BEACON_LIGHT = 'Point_Beacon_Fire';
// In Blender the fog volume scatters the Agni spot and brazier fires into a warm glow on the dais; without
// volumetrics they need more direct light to read.
const WARM_LIGHT_BOOST: Record<string, number> = { Spot_Agni_Beacon: 2.5, Point_Brazier_Fire_E: 1.6, Point_Brazier_Fire_W: 1.6 };
// The beacon's fires on the dais: the braziers on the pilasters either side of Shiva and the warm spot that throws
// their light down over the dais and the stair. They smoulder with the beacon until Andhaka is crowned.
const DAIS_FIRE_LIGHTS = ['Point_Brazier_Fire_E', 'Point_Brazier_Fire_W', 'Spot_Agni_Beacon'];
/** Smouldering, the braziers keep this share of their light (the spot none), and their coals burn this low. */
const DAIS_SMOULDER = { light: 0.14, coals: 0.75 };
/** Seconds after the crowning that the dais braziers catch from the beacon. */
const DAIS_CATCH = 0.25;
/** A brazier's fire in its bowl (metres tall at full) and the small tongues of its coals round the inside of the lip. */
const BRAZIER_FIRE = { size: 1.0, tongues: 6, spread: 0.22, coals: 7, coalSize: 0.2 };
/**
 * The temple's two deepams: dark bronze (they rendered flat orange in their own light), wick flames round the lips of
 * their two dishes (five on the upper, four on the lower), and a warm light over them that breathes with the flames.
 */
const DEEPAM = { bronze: 0x3b2a1b, wicks: [5, 4], flame: 0.13, light: 6 };
// Albedo gamma per baked family: basalt is near-black (#1C1E22) and needs the most lift.
const ALBEDO_LIFT: Record<string, number> = {
  Coarse_Basalt_Ash: 0.72, Basalt_Ash_Floor: 0.72, Basalt_Ash_Floor_Crag: 0.72, Monument_Basalt: 0.75,
  Slate_Silhouette: 0.72, Vista_Pinnacle_Rock: 0.72, Temple_Weathered_Stone: 0.85, Pilgrim_Trail_Stone: 0.85,
  Weathered_Timber: 0.85,
  // The rebuilt Shiva temple (dais, stair, pilasters, lotus carvings) and its shadowed recesses.
  Shiva_Temple_Weathered_Granite: 0.85, Shiva_Temple_Recess_Stone: 0.8,
};
// Extra snow over the bake, which left cliff faces bare: rock walls get vertical runs, walkable floors only a
// light dusting (they already carry baked drifts and the blood).
const SNOW_COVER: Record<string, SnowCover> = {
  Coarse_Basalt_Ash: { amount: 1, wall: 1 },
  // The beacon cliff and the far peak: their bake is about three texels a metre, a flat colour a face, so their slate
  // is mottled in world space instead (its mean colour; audit W-15).
  Slate_Silhouette: { amount: 1, wall: 0.9, breakup: { color: 0x22252a, amount: 1 } },
  Vista_Pinnacle_Rock: { amount: 1, wall: 0.9 },
  Basalt_Ash_Floor_Crag: { amount: 0.8, wall: 0.8 },
  Basalt_Ash_Floor: { amount: 0.35, wall: 0 },
  Temple_Weathered_Stone: { amount: 0.6, wall: 0.3 },
  Shiva_Temple_Weathered_Granite: { amount: 0.55, wall: 0.25 },
  Pilgrim_Trail_Stone: { amount: 0.5, wall: 0.2 },
};
/**
 * The terrain and the vista rock came out of the bake flat-shaded (every face its own vertices and normal), and the
 * cel ramp then lit each face as a band of its own: the snow and the cliffs broke into square patches (audit W-15).
 * Their normals are smoothed at load, creased so ledges and ridges keep their edge. Not the small scattered rocks
 * (`Joined_*`) or the lake's spikes, which are meant to be faceted, nor stairs, trails and masonry.
 */
const SMOOTH_FACETS = {
  families: ['Coarse_Basalt_Ash', 'Slate_Silhouette', 'Vista_Pinnacle_Rock'],
  minVertices: 1000,
  creaseDeg: 50,
};

/**
 * Smooth normals for a flat-shaded mesh, in place: each vertex takes the area-weighted normal of the faces round its
 * position that lie within `creaseDeg` of its own face. Positions, UVs and the index are unchanged.
 */
function smoothFacets(geometry: THREE.BufferGeometry, creaseDeg: number): void {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const index = geometry.index;
  if (!normal || !index) return;
  const count = position.count;
  const pos = new Float32Array(count * 3);
  const own = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[3 * i] = position.getX(i); pos[3 * i + 1] = position.getY(i); pos[3 * i + 2] = position.getZ(i);
    own[3 * i] = normal.getX(i); own[3 * i + 1] = normal.getY(i); own[3 * i + 2] = normal.getZ(i);
  }
  // Vertices that share a position are one point of the surface. The key packs the position, 17 bits an axis across
  // the mesh's bounds (under a millimetre a step for these), into one number a double holds exactly.
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox!;
  const STEPS = 131071;
  const sx = STEPS / Math.max(max.x - min.x, 1e-6), sy = STEPS / Math.max(max.y - min.y, 1e-6), sz = STEPS / Math.max(max.z - min.z, 1e-6);
  const point = new Int32Array(count);
  const points = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    const key = Math.round((pos[3 * i] - min.x) * sx) * 2 ** 34 + Math.round((pos[3 * i + 1] - min.y) * sy) * 2 ** 17
      + Math.round((pos[3 * i + 2] - min.z) * sz);
    let p = points.get(key);
    if (p === undefined) points.set(key, (p = points.size));
    point[i] = p;
  }
  // Each face's normal, its length twice the face's area (the weight), and the faces round each point.
  const faces = index.count / 3;
  const corner = Uint32Array.from({ length: index.count }, (_, k) => index.getX(k));
  const faceNormal = new Float32Array(faces * 3);
  const faceArea = new Float32Array(faces);
  const start = new Int32Array(points.size + 1);
  for (let f = 0; f < faces; f++) {
    const a = 3 * corner[3 * f], b = 3 * corner[3 * f + 1], c = 3 * corner[3 * f + 2];
    const cbx = pos[c] - pos[b], cby = pos[c + 1] - pos[b + 1], cbz = pos[c + 2] - pos[b + 2];
    const abx = pos[a] - pos[b], aby = pos[a + 1] - pos[b + 1], abz = pos[a + 2] - pos[b + 2];
    const nx = cby * abz - cbz * aby, ny = cbz * abx - cbx * abz, nz = cbx * aby - cby * abx;
    faceNormal[3 * f] = nx; faceNormal[3 * f + 1] = ny; faceNormal[3 * f + 2] = nz;
    faceArea[f] = Math.hypot(nx, ny, nz);
    for (let k = 0; k < 3; k++) start[point[corner[3 * f + k]] + 1]++;
  }
  for (let p = 0; p < points.size; p++) start[p + 1] += start[p];
  const fill = start.slice(0, points.size);
  const around = new Int32Array(faces * 3);
  for (let f = 0; f < faces; f++) for (let k = 0; k < 3; k++) around[fill[point[corner[3 * f + k]]]++] = f;
  // Each vertex: its own (flat) normal decides which of the faces round it lie on its side of a crease.
  const crease = Math.cos(THREE.MathUtils.degToRad(creaseDeg));
  for (let i = 0; i < count; i++) {
    const ox = own[3 * i], oy = own[3 * i + 1], oz = own[3 * i + 2];
    let x = 0, y = 0, z = 0;
    for (let j = start[point[i]]; j < start[point[i] + 1]; j++) {
      const f = around[j];
      const nx = faceNormal[3 * f], ny = faceNormal[3 * f + 1], nz = faceNormal[3 * f + 2];
      if (faceArea[f] > 0 && nx * ox + ny * oy + nz * oz >= crease * faceArea[f]) {
        x += nx; y += ny; z += nz;
      }
    }
    const length = Math.hypot(x, y, z);
    if (length > 0) normal.setXYZ(i, x / length, y / length, z / length);
  }
  normal.needsUpdate = true;
}

/**
 * Level 4: frozen octagonal basalt plateau above a cloud sea under a silver solar eclipse, cel-shaded with
 * ink lines. Distant peaks, the volcano and the Rakshasa / Vasuki reliefs are baked into the sky panorama;
 * the arena, ruins, lakes, bridges and near outcrops are geometry whose procedural Blender look-dev was
 * baked to textures at export (materials arrive as `<family>@<object>`).
 */
export class Level4_Summit extends GLBLevel {
  public readonly id = 4;
  public readonly title = 'Level 4: Kailasha Summit';
  public readonly subtitle = 'The Charnel Ridge Beneath the Eclipse • Rakshasas, then Andhaka';
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
  /**
   * The dais braziers (their fire groups `dais_E` / `dais_W` and coals `coals_E` / `coals_W` in `fires`), their lights
   * and the spot (see DAIS_FIRE_LIGHTS); `at`: when they caught (see `cue`).
   */
  private daisFire = {
    lights: [] as { light: THREE.Light; base: number }[],
    /** Each brazier: its side, the middle of its fire (for the bursts), its licks and embers. */
    braziers: [] as { side: string; point: THREE.Vector3; licks: Emitter; embers: Emitter }[],
    lit: false,
    at: -Infinity,
    burst: true,
  };
  /** Every flame on the summit but the beacon's: the deepams, the braziers and their coals (see FireField). */
  private fires: FireField | null = null;
  /**
   * The vista shrine's two lantern posts, far out on the ridge: their lights (`*Lantern*_Light`) stand beyond the live
   * lights' reach and go, and their glass heads have no flame, so a lantern's fire glows there instead (where its light
   * stood), a warm point across the gulf.
   */
  private readonly lanterns: THREE.Vector3[] = [];
  private clock = 0;
  private mist: MistSleeveMaterial | null = null;
  private lakes: WaterRippleMaterial[] = [];
  private scrollers: THREE.Texture[] = [];
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
    await this.buildThrone();
  }

  /**
   * Andhaka's throne: a rough basalt seat with a taller stone at its left (where his crown waits), snow on its tops,
   * empty through the waves; he is found sitting on it. Colliders stop short of its front, clear of his body.
   */
  private async buildThrone(): Promise<void> {
    let blocks: { centre: [number, number, number]; size: [number, number, number] }[] | undefined;
    try {
      const manifest = await (await fetch(ANDHAKA_MANIFEST)).json();
      blocks = manifest.clips?.coronation?.seat;
    } catch {
      blocks = undefined;
    }
    if (!blocks?.length) return;
    const basalt = new THREE.MeshStandardMaterial({ name: 'Andhaka_Throne', color: 0x2e3036, roughness: 0.9 });
    const mat = toToonMaterial(basalt, this.ramp);
    basalt.dispose();
    liftAlbedo(mat, 0.75);
    addSnowCover(mat, { amount: 0.7, wall: 0.25 });
    // A fixed seed, so the rock is the same every visit.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    for (const block of blocks) {
      const [w, h, d] = block.size;
      const geo = new THREE.BoxGeometry(w, h, d, 5, 4, 4);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const jitter = new Map<string, THREE.Vector3>();
      for (let i = 0; i < pos.count; i++) {
        // Shared corners move together (the box's faces are split), so the rock stays closed.
        const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
        if (!jitter.has(key)) {
          const top = pos.getY(i) > h / 2 - 1e-3;
          const bottom = pos.getY(i) < -h / 2 + 1e-3;
          // Rough faces, the top a little narrower than the foot and its edges knocked off: weathered stone.
          const u = (pos.getY(i) + h / 2) / h;
          const edge = top && (Math.abs(pos.getX(i)) > w / 2 - 1e-3 || Math.abs(pos.getZ(i)) > d / 2 - 1e-3) ? 0.06 : 0;
          jitter.set(key, new THREE.Vector3(
            rand() * 0.07 - Math.sign(pos.getX(i)) * 0.07 * u,
            bottom ? 0 : rand() * (top ? 0.035 : 0.06) - edge,
            rand() * 0.07 - Math.sign(pos.getZ(i)) * 0.07 * u,
          ));
        }
        const j = jitter.get(key)!;
        pos.setXYZ(i, pos.getX(i) + j.x, pos.getY(i) + j.y, pos.getZ(i) + j.z);
      }
      const faceted = geo.toNonIndexed();
      geo.dispose();
      faceted.computeVertexNormals();
      const rock = new THREE.Mesh(faceted, mat);
      rock.name = 'Andhaka_Throne';
      rock.position.set(ANDHAKA_THRONE.x + block.centre[0], ANDHAKA_THRONE.y - 0.05 + block.centre[1], ANDHAKA_THRONE.z + block.centre[2]);
      rock.castShadow = rock.receiveShadow = true;
      this.group.add(rock);
      // Collider: the block less 0.2 m off its front (toward his standing place).
      const trim = 0.2;
      this.addStaticBox(
        new THREE.Vector3(rock.position.x, rock.position.y, rock.position.z - trim / 2),
        new THREE.Vector3(w / 2, h / 2, Math.max(0.05, d / 2 - trim / 2)),
      );
    }
  }

  protected override prepareExportedLight(light: THREE.Light): void {
    super.prepareExportedLight(light);
    if (!light.parent) return;
    if (light.name === BEACON_LIGHT) return; // flickered by the beacon itself
    light.intensity *= WARM_LIGHT_BOOST[light.name] ?? 1;
    if (DAIS_FIRE_LIGHTS.includes(light.name)) this.daisFire.lights.push({ light, base: light.intensity });
    const brazier = /^Point_Brazier_Fire_([EW])$/.exec(light.name);
    if (/Lantern/.test(light.name)) this.lanterns.push(light.getWorldPosition(new THREE.Vector3()));
    if (light.getWorldPosition(new THREE.Vector3()).length() > LIVE_LIGHT_RADIUS) {
      light.removeFromParent();
    } else if (brazier) {
      // A brazier's light breathes with its own fire (updateDaisFire then scales it by how lit the fire is).
      this.flickerWith(light, () => this.fires?.flicker(`dais_${brazier[1]}`) ?? 1);
    } else if (!light.userData.flicker && /Brazier|Fire/.test(light.name)) {
      this.addFlicker(light);
    }
  }

  protected prepareModel(model: THREE.Object3D): void {
    const box = new THREE.Box3();
    const found: { beam: THREE.Mesh | null; light: THREE.PointLight | null } = { beam: null, light: null };
    const deepams: THREE.Mesh[] = [];
    const brazierFlames: THREE.Mesh[] = [];
    const bowls: THREE.Mesh[] = [];
    const lanternFlames: THREE.Mesh[] = [];
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
      if (names.includes('VFX_Brazier_Flame')) brazierFlames.push(mesh);
      if (names.includes('Brazier_Blackened_Iron')) bowls.push(mesh);
      if (names.includes('Lantern_Flame')) lanternFlames.push(mesh);
      if (names.includes('Skull_Socket_Void')) mesh.castShadow = false;
      if (/^Temple_Deepam/.test(mesh.name)) deepams.push(mesh);
    });

    // Every flame but the beacon's in one FireField: the export's flame meshes (the braziers' spiky crowns, any lantern
    // flames) only say where they burn, and go.
    const spots: FireSpot[] = [];
    this.deepamFlames(deepams, spots);
    this.brazierFires(brazierFlames, bowls, spots);
    for (const flame of findModelledFlames(lanternFlames)) spots.push(spotForFlame(flame, 'lanterns'));
    // The vista lanterns (see `lanterns`): a small flame in each head, its glow wide enough to read across the gulf.
    for (const at of this.lanterns) spots.push({ at: at.clone().setY(at.y - 0.12), size: 0.3, group: 'lanterns', tongues: 1, width: 0.5, glow: 3 });
    for (const mesh of [...brazierFlames, ...lanternFlames]) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
    this.fires = new FireField(spots);
    for (const group of ['deepam_E', 'deepam_W', 'lanterns']) this.fires.set(group, 1);
    this.group.add(this.fires.mesh);

    // The flat-shaded terrain and vista rock, smoothed (see SMOOTH_FACETS); each geometry once.
    const smoothed = new Set<THREE.BufferGeometry>();
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || smoothed.has(mesh.geometry) || mesh.name.startsWith('Joined_')) return;
      const family = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).name.split('@')[0];
      if (!SMOOTH_FACETS.families.includes(family) || mesh.geometry.attributes.position.count < SMOOTH_FACETS.minVertices) return;
      smoothFacets(mesh.geometry, SMOOTH_FACETS.creaseDeg);
      smoothed.add(mesh.geometry);
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
    this.bloomObjects.push(this.weather.points, this.fires.mesh, ...(this.beacon?.glowing ?? []));
    this.cue('chapter-start');
  }

  /**
   * The temple's two bronze deepams (oil lamps) burn: wick flames round the lips of their two dishes (the dishes found
   * as the lamp's flat, wide pieces, the upper first) and a small warm light over them, flickering with them.
   */
  private deepamFlames(deepams: THREE.Mesh[], spots: FireSpot[]): void {
    const centre = new THREE.Vector3();
    for (const lamp of deepams) {
      const whole = new THREE.Box3().setFromObject(lamp);
      whole.getCenter(centre);
      const group = `deepam_${centre.x >= 0 ? 'E' : 'W'}`;
      const dishes = meshPieces([lamp])
        .filter((b) => b.max.y - b.min.y < 0.25 && Math.max(b.max.x - b.min.x, b.max.z - b.min.z) > 0.3)
        .sort((a, b) => b.max.y - a.max.y);
      dishes.forEach((dish, d) => {
        const n = DEEPAM.wicks[d] ?? 0;
        const r = Math.max(dish.max.x - dish.min.x, dish.max.z - dish.min.z) * 0.42;
        const c = dish.getCenter(new THREE.Vector3());
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + d * 0.6;
          spots.push({
            at: new THREE.Vector3(c.x + Math.cos(a) * r, dish.max.y - 0.005, c.z + Math.sin(a) * r),
            size: DEEPAM.flame * (d === 0 ? 1 : 0.85),
            group,
            tongues: 1,
            width: 0.5,
          });
        }
      });
      // The light well above the lamp: it warms the stair's foot and the snow round it; any nearer, it burned the small
      // bronze lamp itself to flat orange.
      const top = dishes[0]?.max.y ?? whole.max.y;
      const light = new THREE.PointLight(0xffa040, DEEPAM.light, 9, 2);
      light.position.set(centre.x, top + 1.0, centre.z + 0.3);
      this.group.add(light);
      this.flickerWith(light, () => this.fires?.flicker(group) ?? 1);
    }
  }

  /**
   * The dais braziers: a fire in each bowl (its middle where the export's flame stood, its tongues spread over the
   * bowl), and its coals, small tongues round the inside of the lip that glow on while it smoulders.
   */
  private brazierFires(flames: THREE.Mesh[], bowls: THREE.Mesh[], spots: FireSpot[]): void {
    const box = new THREE.Box3();
    for (const flame of flames) {
      box.setFromObject(flame);
      const side = (box.min.x + box.max.x) / 2 >= 0 ? 'E' : 'W';
      const foot = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
      // The bowl it burns in (its rim and size), else a bowl about the export's.
      const bowl = bowls.map((b) => new THREE.Box3().setFromObject(b)).find((b) => b.containsPoint(foot.clone().setY((b.min.y + b.max.y) / 2)));
      const rim = bowl ? bowl.max.y : foot.y + 0.08;
      const radius = bowl ? Math.max(bowl.max.x - bowl.min.x, bowl.max.z - bowl.min.z) / 2 : 0.55;
      if (bowl) foot.set((bowl.min.x + bowl.max.x) / 2, foot.y, (bowl.min.z + bowl.max.z) / 2);
      spots.push({ at: foot, size: BRAZIER_FIRE.size, group: `dais_${side}`, tongues: BRAZIER_FIRE.tongues, spread: BRAZIER_FIRE.spread, width: 0.6 });
      // The coals' tongues: uneven, some low in the bowl, some licking up at the lip (not a ring of candles).
      for (let k = 0; k < BRAZIER_FIRE.coals; k++) {
        const a = ((k + Math.random() * 0.7) / BRAZIER_FIRE.coals) * Math.PI * 2;
        const r = radius * (0.35 + 0.4 * Math.random());
        spots.push({
          at: new THREE.Vector3(foot.x + Math.cos(a) * r, rim - 0.1 + Math.random() * 0.05, foot.z + Math.sin(a) * r),
          size: BRAZIER_FIRE.coalSize * (0.5 + 0.8 * Math.random()),
          group: `coals_${side}`,
          tongues: 1,
          width: 0.6,
          glow: 1.4,
        });
      }
      this.daisFire.braziers.push({ side, point: foot.clone().setY(foot.y + 0.15), licks: new Emitter(), embers: new Emitter() });
    }
  }

  /**
   * Story cues: `chapter-start` (the beacon and the dais braziers smoulder: they wait for the king), `crowned` (the
   * crown settles on Andhaka's head: the beacon flares and its fire races up into the sky, the braziers catch a moment
   * later and the warm light floods the dais) and `crowned-settled` (his entrance was skipped or cut short: all of it
   * burning at once).
   */
  public cue(name: string): void {
    const fire = this.daisFire;
    switch (name) {
      case 'chapter-start':
        this.beacon?.smoulder();
        fire.lit = false;
        fire.at = -Infinity;
        break;
      case 'crowned':
        if (fire.lit) return;
        this.beacon?.ignite();
        fire.lit = true;
        fire.at = this.clock + DAIS_CATCH;
        fire.burst = false;
        SoundFX.getInstance().playFlameBurst();
        break;
      case 'crowned-settled':
        if (fire.lit) return;
        this.beacon?.burn();
        fire.lit = true;
        fire.at = -Infinity;
        fire.burst = true;
        break;
    }
  }

  /**
   * The dais braziers and the spot, smouldering or lit (with their flare as they catch). Smouldering, a brazier is its
   * coals: small uneven tongues low in the bowl, an ember now and then. Lit, its fire stands up out of the bowl (taller
   * for a moment as it catches, throwing licks of flame) and sends up embers.
   */
  private updateDaisFire(time: number, dt: number): void {
    const fire = this.daisFire;
    const s = time - fire.at;
    const smooth = (a: number, b: number, t: number) => THREE.MathUtils.smoothstep(t, a, b);
    const lit = fire.lit ? smooth(0, 0.35, s) : 0;
    const flare = fire.lit ? smooth(0, 0.25, s) * (1 - smooth(0.45, 1.8, s)) : 0;
    if (fire.lit && !fire.burst && s >= 0) {
      fire.burst = true;
      for (const { point } of fire.braziers) {
        this.particleFX.spawnFlames(point, 28, 0.55);
        this.particleFX.spawnSparks(point.clone().add(new THREE.Vector3(0, 0.6, 0)), 30, true);
      }
    }
    const flicker = ((this.fires?.flicker('dais_E') ?? 1) + (this.fires?.flicker('dais_W') ?? 1)) / 2;
    for (const { light, base } of fire.lights) {
      // The braziers' lights are flickered with their fires (GLBLevel.update) before this; the spot breathes with both.
      const spot = light.name.startsWith('Spot');
      const from = spot ? base * flicker : light.intensity;
      const rest = spot ? 0 : DAIS_SMOULDER.light;
      light.intensity = from * (rest + (1 - rest) * lit + 1.1 * flare);
    }
    for (const b of fire.braziers) {
      this.fires?.set(`dais_${b.side}`, lit > 0.01 ? lit + 0.7 * flare : 0);
      // The coals sink into the fire once it stands up out of the bowl.
      this.fires?.set(`coals_${b.side}`, DAIS_SMOULDER.coals * (1 - 0.55 * lit));
      // Embers rising off it: a few off the coals, more once it burns; licks of flame thrown off as it roars up (W-11: at
      // a rate, never per frame).
      for (let n = b.licks.take(30 * flare, dt); n > 0; n--) this.particleFX.spawnFlames(b.point.clone().setY(b.point.y + 0.4), 1, 0.35);
      for (let n = b.embers.take(1.5 + 5 * lit + 14 * flare, dt); n > 0; n--) this.particleFX.spawnEmbers(b.point, 1, 0.7, 1 + lit);
    }
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
      case 'Shiva_Temple_Aged_Bronze': {
        // The deepams: dark aged bronze, so their flames and the light over them warm it instead of it glowing orange.
        const bronze = toToonMaterial(mat, this.ramp);
        bronze.color.set(DEEPAM.bronze);
        return bronze;
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
    // The flames first, so the lights that breathe with them (GLBLevel's flicker, the dais) read this frame's.
    this.fires?.update(time);
    super.update(time, dt, camera);
    const viewportHeight = SceneManager.getInstance().renderer.domElement.height;
    this.sky?.follow(camera);
    this.weather.update(time, camera.position, viewportHeight);
    this.clock = time;
    this.beacon?.update(time, viewportHeight);
    this.updateDaisFire(time, dt);
    this.mist?.update(time);
    this.lakes.forEach((l) => l.update(time));
    this.scrollers.forEach((t) => t.offset.set(0, time * 0.9));
    this.updateLightning(time);
  }

  public override dispose(): void {
    this.fires?.dispose();
    super.dispose();
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

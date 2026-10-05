import * as THREE from 'three';
import { GLBLevel } from './GLBLevel';
import type { LevelAtmosphere } from './LevelTypes';
import { addLampGlow, addRimLight, createToonRamp, toonifyModel, toToonMaterial } from './environment/ToonRelight';
import { WaterRippleMaterial } from './environment/WaterRippleMaterial';

const LEVEL_URL = '/assets/levels/akhada_atrium.glb';

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
/** Warm deepak light under the bust, and the late sun raking its face. */
const DEEPAK = 0xffa04a;
const SUNLIT = 0xffc27a;

// Materials that are cut-out cards: alpha test, both faces, no shadow casting (forest cards are huge).
const FOLIAGE = /Tree_Card|leaves|fern|calathea|branches|Creeper_Leaf|Dry_Brown_Leaves/i;
const FLAMES = /Flame/i;
const NO_SHADOW_CAST = /BR_Forest|BR_Vegetation|BR_Tree|BR_Distant|Puddle|Rain/i;
const HANUMAN_STONE = 'BR_Hanuman_Saffron_Mineral_Stone';
// The two Hanuman frescos beside the monolith and the two verandah Ramayana narrative panels.
const MURALS = /Fresco|Narrative_Border/;
// Warm deepak light: yellow-amber, faint enough to stay below the bloom threshold.
const MURAL_GLOW = { color: 0xffc46b, intensity: 0.38 };

/**
 * Level 2: enclosed akhada under an open octagonal oculus, a weathered Hanuman monolith on the north wall.
 * Lit as a warm, cinematic sunset (STORY.md, Chapter II): one low golden key through the oculus (the roof shadows
 * carve the shaft onto the earth), a soft blue-violet fill from the open sky, warm haze, a sky drawn in code with
 * the sun going down behind the monolith, faint deepak light under the bust, plus the screen-space ink lines.
 */
export class Level2_Akhada extends GLBLevel {
  public readonly id = 2;
  public readonly title = 'Level 2: Hanuman Akhada';
  public readonly subtitle = 'Oculus Courtyard of the Monolith • The Vetala and Mayavi';
  public readonly atmosphere: LevelAtmosphere = {
    background: new THREE.Color(0xe0a070),
    backgroundIntensity: 1.0,
    environment: null,
    environmentIntensity: 0.6,
    // Dust and woodsmoke in the low sun: the forest beyond the walls goes soft and gold.
    fog: { color: 0xd9a088, density: 0.0045 },
    // The shade under the roof stays blue-violet (the open sky); the earth bounces warm.
    ambient: { color: 0x9484c2, intensity: 0.55 },
    hemi: { sky: 0xa6aae6, ground: 0x8a5232, intensity: 0.7 },
    key: { color: 0xffb878, intensity: 3.1, direction: SUN_KEY_DIR, normalBias: 0.02 },
    exposure: 1.05,
    bloom: { threshold: 0.86, smoothing: 0.12, intensity: 1.1 },
    vignette: { offset: 0.3, darkness: 0.55 },
    ink: { color: 0x1c0d08, thickness: 1.0, threshold: 0.013, fadeNear: 28, fadeFar: 60 },
  };
  private ramp = createToonRamp([0.16, 0.42, 0.78, 1.0]);
  // Deeper shadow band and a harder step for the monolith, so the carved features read from across the arena.
  private bustRamp = createToonRamp([0.1, 0.32, 0.75, 1.0]);
  private puddles: WaterRippleMaterial | null = null;
  private muralGlows: { uTime: THREE.IUniform<number> }[] = [];

  constructor() {
    super(LEVEL_URL);
    this.ownedTextures.add(this.ramp).add(this.bustRamp);
    this.playerSpawn.set(0, 0, 6);
  }

  protected async loadEnvironment(): Promise<void> {
    const sky = createSunsetSky();
    this.ownedTextures.add(sky);
    this.atmosphere.background = sky;
    // Toon materials ignore the environment; it only feeds the rain puddles' reflections.
    this.atmosphere.environment = this.bakeEnvironment(sky);
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

    this.collectBloom(model);
    this.addLightRig(monolith);
  }

  /**
   * Each mural gets its own copy of its toon material with a faint deepak glow pooled at its own base, so the
   * paintings stay readable in the verandah shadows without looking backlit.
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
      this.group.add(createLampHalo(bounds, glow.uTime));
    });
    shared.forEach((m) => m.dispose());
  }

  /** Level-specific conversions; undefined falls through to the default toon conversion. */
  private convertMaterial(src: THREE.MeshStandardMaterial, mesh: THREE.Mesh): THREE.Material | undefined {
    const name = src.name;
    if (name === 'BR_Distant_Mountain_Haze') {
      // The Blender bake (sunset alpenglow in a MountainTint attribute) exports as flat white; shade the three
      // ridge rings by distance, height and how far they face the sun instead.
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      return createRidgeMaterial(name);
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
      // Sharper, more pronounced monolith: harder light steps, deeper relief, a warm sunset rim on every carved edge.
      const bust = toToonMaterial(src, this.bustRamp);
      bust.normalScale.multiplyScalar(1.4);
      addRimLight(bust, { color: 0xffc890, strength: 0.4, start: 0.68 });
      return bust;
    }
    if (!FOLIAGE.test(name) && name !== 'BR_FA_Faded_Saffron_Cloth') return undefined;
    const toon = toToonMaterial(src, this.ramp);
    if (FOLIAGE.test(name)) {
      toon.alphaTest = 0.35;
      toon.transparent = false;
      toon.side = THREE.DoubleSide;
      // The cards' self-emission fakes the low sun through the canopy (authored for this sunset): kept, softened so
      // the leaves glow rather than burn.
      toon.emissiveIntensity *= 0.7;
    }
    if (name === 'BR_FA_Faded_Saffron_Cloth') toon.side = THREE.DoubleSide;
    return toon;
  }

  private addLightRig(monolith: THREE.Object3D | null): void {
    // Deepak light under the Hanuman bust, aimed at its chin and chest from either side of the plinth: a warm accent
    // under the face (the lamps of the evening aarti), not a wash over it.
    const bust = new THREE.Box3();
    if (monolith) bust.setFromObject(monolith);
    else bust.set(new THREE.Vector3(-9.5, 0, -19.5), new THREE.Vector3(9.5, 13.9, -14));
    const face = new THREE.Vector3((bust.min.x + bust.max.x) / 2, bust.min.y + (bust.max.y - bust.min.y) * 0.22, bust.max.z - 1.5);
    for (const side of [-1, 1]) {
      const up = new THREE.SpotLight(DEEPAK, 12, 20, THREE.MathUtils.degToRad(28), 0.85, 2);
      up.name = 'Akhada_Hanuman_Uplight';
      up.position.set(side * 2.6, 0.4, bust.max.z + 2.2);
      up.target.position.copy(face).setX(face.x + side * 1.2);
      this.group.add(up, up.target);
    }

    // The roof shades the face from the oculus key, so the last of the sun rakes in from high left and carves it
    // into crisp toon bands (lit brow and cheek, dark eye sockets and jaw side).
    const faceCentre = new THREE.Vector3(face.x, bust.min.y + (bust.max.y - bust.min.y) * 0.6, bust.max.z - 2);
    const carve = new THREE.SpotLight(SUNLIT, 520, 32, THREE.MathUtils.degToRad(26), 0.45, 2);
    carve.name = 'Akhada_Hanuman_Face_Key';
    carve.position.set(faceCentre.x - 9, faceCentre.y + 5, faceCentre.z + 7);
    carve.target.position.copy(faceCentre);
    this.group.add(carve, carve.target);
  }

  public override update(time: number, dt: number, camera: THREE.Camera): void {
    super.update(time, dt, camera);
    this.puddles?.update(time);
    for (const glow of this.muralGlows) glow.uTime.value = time;
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
 * Sunset haze for the distant ranges (88-258 m): near rings dusky violet, far rings paler and warmer, the crests and
 * the slopes turned toward the sun lit gold, a band of haze at their feet. Unaffected by scene fog.
 */
function createRidgeMaterial(name: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name,
    uniforms: { uSun: { value: new THREE.Vector2(AKHADA_SUN.x, AKHADA_SUN.z).normalize() } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec2 uSun;
      varying vec3 vWorld;
      void main() {
        float far = smoothstep(80.0, 260.0, length(vWorld.xz));
        float crest = pow(clamp(vWorld.y / 70.0, 0.0, 1.0), 1.6);
        float sunward = smoothstep(-0.2, 1.0, dot(normalize(vWorld.xz), uSun));
        vec3 col = mix(vec3(0.09, 0.05, 0.1), vec3(0.3, 0.19, 0.22), far);
        col += vec3(0.4, 0.19, 0.06) * sunward * (0.35 + 0.65 * far);
        col += vec3(0.28, 0.15, 0.06) * crest * (1.0 - 0.4 * far);
        col = mix(col, vec3(0.62, 0.34, 0.2), (1.0 - smoothstep(-4.0, 16.0, vWorld.y)) * (0.4 + 0.5 * far));
        gl_FragColor = vec4(col, 1.0);
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

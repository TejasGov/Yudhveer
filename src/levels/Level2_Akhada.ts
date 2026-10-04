import * as THREE from 'three';
import { GLBLevel } from './GLBLevel';
import type { LevelAtmosphere } from './LevelTypes';
import { addLampGlow, addRimLight, createToonRamp, toonifyModel, toToonMaterial } from './environment/ToonRelight';
import { WaterRippleMaterial } from './environment/WaterRippleMaterial';

const LEVEL_URL = '/assets/levels/akhada_atrium.glb';

const COBALT = 0x1e55ff;
const VERMILLION = 0xff1a24;
// Steeper than the Blender sun (40, -15, 0 deg) so the shaft through the 14.7 m-high octagonal oculus lands on
// the arena floor and the foot of the Hanuman bust instead of the north wall; same azimuth.
const OCULUS_KEY_DIR = new THREE.Vector3(-0.1, 0.94, 0.33).normalize();

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
 * The authored sunset is replaced by a comic cel-shaded night: one cobalt key through the oculus (the roof
 * shadows carve the shaft onto the earth), vermillion grazers at floor level and vermillion uplights under
 * the Hanuman bust, plus screen-space ink lines.
 */
export class Level2_Akhada extends GLBLevel {
  public readonly id = 2;
  public readonly title = 'Level 2: Hanuman Akhada';
  public readonly subtitle = 'Oculus Courtyard of the Monolith • The Vetala and Mayavi';
  public readonly atmosphere: LevelAtmosphere = {
    background: new THREE.Color(0x040614),
    backgroundIntensity: 1.0,
    environment: null,
    environmentIntensity: 0.6,
    fog: { color: 0x080b24, density: 0.011 },
    ambient: { color: 0x2a3a8f, intensity: 0.35 },
    hemi: { sky: 0x2745c8, ground: 0x5a0a10, intensity: 0.55 },
    key: { color: COBALT, intensity: 5.5, direction: OCULUS_KEY_DIR },
    exposure: 1.15,
    bloom: { threshold: 0.9, smoothing: 0.1, intensity: 1.6 },
    vignette: { offset: 0.28, darkness: 0.7 },
    ink: { color: 0x04030c, thickness: 1.0, threshold: 0.013, fadeNear: 28, fadeFar: 60 },
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
    const sky = createNightSky();
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
      // The Blender bake (sunset alpenglow in a MountainTint attribute) exports as flat white and would not fit
      // the night relight anyway; shade the three ridge rings by distance and height instead.
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
      // Sharper, more pronounced monolith: harder light steps, deeper relief, a cool cobalt rim on every carved edge.
      const bust = toToonMaterial(src, this.bustRamp);
      bust.normalScale.multiplyScalar(1.4);
      addRimLight(bust, { color: 0x8fb4ff, strength: 0.55, start: 0.66 });
      return bust;
    }
    if (!FOLIAGE.test(name) && name !== 'BR_FA_Faded_Saffron_Cloth') return undefined;
    const toon = toToonMaterial(src, this.ramp);
    if (FOLIAGE.test(name)) {
      toon.alphaTest = 0.35;
      toon.transparent = false;
      toon.side = THREE.DoubleSide;
      // The cards' self-emission faked sunset backlight through the canopy; at night it reads as glowing trees.
      toon.emissive.setRGB(0, 0, 0);
      toon.emissiveMap = null;
    }
    if (name === 'BR_FA_Faded_Saffron_Cloth') toon.side = THREE.DoubleSide;
    return toon;
  }

  private addLightRig(monolith: THREE.Object3D | null): void {
    // Vermillion grazers just above the earth at the arena corners (Blender (+-9.7, +-8, 0.5)).
    for (const [x, z] of [[-9.7, 8], [9.7, 8], [-9.7, -8], [9.7, -8]]) {
      const graze = new THREE.PointLight(VERMILLION, 14, 14, 2);
      graze.position.set(x, 0.45, z);
      graze.name = 'Akhada_Vermillion_Grazer';
      this.group.add(graze);
    }

    // Uplights under the Hanuman bust, aimed at its face from either side of the plinth.
    const bust = new THREE.Box3();
    if (monolith) bust.setFromObject(monolith);
    else bust.set(new THREE.Vector3(-9.5, 0, -19.5), new THREE.Vector3(9.5, 13.9, -14));
    // Aimed at the chin and chest, dimmer and softer: a vermillion accent under the face, not a wash over it.
    const face = new THREE.Vector3((bust.min.x + bust.max.x) / 2, bust.min.y + (bust.max.y - bust.min.y) * 0.22, bust.max.z - 1.5);
    for (const side of [-1, 1]) {
      const up = new THREE.SpotLight(VERMILLION, 22, 20, THREE.MathUtils.degToRad(28), 0.85, 2);
      up.name = 'Akhada_Hanuman_Uplight';
      up.position.set(side * 2.6, 0.4, bust.max.z + 2.2);
      up.target.position.copy(face).setX(face.x + side * 1.2);
      this.group.add(up, up.target);
    }

    // The roof shades the face from the oculus key, so a cobalt spot raking in from high left carves it
    // into crisp toon bands (lit brow and cheek, dark eye sockets and jaw side).
    const faceCentre = new THREE.Vector3(face.x, bust.min.y + (bust.max.y - bust.min.y) * 0.6, bust.max.z - 2);
    const carve = new THREE.SpotLight(0x5d7bff, 750, 32, THREE.MathUtils.degToRad(26), 0.45, 2);
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
 * Night silhouettes for the distant ranges (88-258 m): near rings darkest, far rings hazier and bluer,
 * moonlit cobalt on the crests, a vermillion horizon glow at their feet. Unaffected by scene fog.
 */
function createRidgeMaterial(name: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        float far = smoothstep(80.0, 260.0, length(vWorld.xz));
        float crest = pow(clamp(vWorld.y / 70.0, 0.0, 1.0), 1.6);
        vec3 col = mix(vec3(0.006, 0.008, 0.03), vec3(0.03, 0.03, 0.1), far);
        col += vec3(0.02, 0.035, 0.16) * crest * (1.0 - 0.5 * far);
        col += vec3(0.09, 0.006, 0.015) * (1.0 - smoothstep(-4.0, 14.0, vWorld.y)) * far;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

/** Equirect night sky for the oculus: cobalt zenith, vermillion-violet horizon glow, sparse stars. */
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

import * as THREE from 'three';
import { GLBLevel } from './GLBLevel';
import type { LevelAtmosphere } from './LevelTypes';
import { createToonRamp, toonifyModel } from './environment/ToonRelight';
import { CharacterRig } from '../entities/animation/CharacterRig';
import { WEAPON_SETS } from '../entities/characters/YodhaWeapons';
import { ease, type Shot } from '../cinematics/CinematicDirector';
import type { IntroContext } from '../cinematics/Intros';

const LEVEL_URL = '/assets/levels/island_caves.glb';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * Where things are in the caves (game coordinates; the build script `game asset/levels/03_island/build_island.py`
 * lays the map out on the same numbers). The path runs north (-z) and down from the sea cave to the shrine.
 */
export const ISLAND = {
  /** Where the boat put him ashore, facing the way in. */
  landing: v(0, 0, 2.2),
  /** The boat at the landing, and the canopy over its stern where the boatman sits. */
  boat: v(1.6, -0.45, 8.6),
  boatman: v(1.4, 0.35, 9.9),
  /** The mouth of the first tunnel, a lamp either side. */
  tunnel: v(0, 0, -3.4),
  /** The hall of bones (first encounter), the black pool (second) and the shrine (third), at floor height. */
  hall: v(0, -0.5, -25),
  pool: v(10.5, -2, -46),
  /** The pool's water (the pit in the pool chamber's west side). */
  water: v(4.6, -2.32, -47.5),
  shrine: v(0, -2.5, -68.5),
  /** The altar the mace lies on, and where he stands before it (on the dais). */
  altar: v(0, -2.14, -76.5),
  beforeAltar: v(0, -2.14, -74.75),
  /** Where the mace rests on the altar (the export's `Mark_Mace` refines it). */
  mace: v(0, -1.06, -76.5),
};

const FLAME = /^Flame_/;
const NO_SHADOW = /^(Flame_|Water_|Eyes_|Stalactites|Props|Cave)/;
/** Point lights the lamps share: the nearest this many lamps are lit (a constant count: no shader recompiles). */
const LAMP_LIGHTS = 8;
const LAMP_COLOR = new THREE.Color(1.0, 0.56, 0.24);
const MACE_COLOR = new THREE.Color(1.0, 0.8, 0.45);

interface Lamp { pos: THREE.Vector3; power: number; range: number; seed: number; color: THREE.Color; out?: boolean }
interface Flame { mesh: THREE.Object3D; base: THREE.Vector3; seed: number }
interface Eyes { mesh: THREE.Object3D; seed: number; next: number; shut: number; gone: number }
interface Ripple { mesh: THREE.Mesh; t: number; life: number }

/**
 * Chapter III: the island's caves (STORY.md, "Chapter III"), the one explorable map. Dark rock lit only by the oil
 * lamps someone still keeps: warm pools of light with the black between them, eyes that shine in the alcoves and go
 * out when he comes close, a pool of black water where something moves. The blessed mace lies on the shrine's altar
 * at the far end (`cue('take-mace')` lifts it away).
 *
 * The lamps are empties in the export; the nearest few to the camera share a small pool of point lights.
 */
export class Level5_Island extends GLBLevel {
  public readonly id = 5;
  public readonly title = 'Chapter III: the island';
  public readonly subtitle = 'The caves under the island • The blessed mace';
  public readonly atmosphere: LevelAtmosphere = {
    background: new THREE.Color(0x010203),
    backgroundIntensity: 1,
    environment: null,
    environmentIntensity: 0,
    // The dark between the lamps: anything a few lamps away is gone into black.
    fog: { color: 0x020203, density: 0.05 },
    ambient: { color: 0x4a4e60, intensity: 0.35 },
    hemi: { sky: 0x2a3348, ground: 0x0c0907, intensity: 0.35 },
    // A faint cold fill from above (the one shadowed light); the lamps do the real lighting.
    key: { color: 0x6c7da8, intensity: 0.22, direction: new THREE.Vector3(0.25, 1, 0.35).normalize(), normalBias: 0.02 },
    exposure: 1.05,
    bloom: { threshold: 0.8, smoothing: 0.15, intensity: 1.15 },
    vignette: { offset: 0.22, darkness: 0.8 },
    ink: { color: 0x050302, thickness: 1.0, threshold: 0.03, fadeNear: 5, fadeFar: 22 },
  };

  /** Where the mace lies (from the export); its model, hidden once he has taken it up. */
  public readonly maceRest = ISLAND.mace.clone();
  private mace: THREE.Object3D | null = null;
  private maceHalo: THREE.Mesh | null = null;
  private ramp = createToonRamp([0.22, 0.5, 0.8, 1.0]);
  private lamps: Lamp[] = [];
  private lights: THREE.PointLight[] = [];
  private moon: THREE.PointLight | null = null;
  private flames: Flame[] = [];
  private eyes: Eyes[] = [];
  private ripples: Ripple[] = [];
  private rippleTimer = 2;
  private poolCentre = ISLAND.water.clone();

  constructor() {
    super(LEVEL_URL);
    this.ownedTextures.add(this.ramp);
    this.playerSpawn.copy(ISLAND.landing);
    // Keeps him out of the sea: the cave's own rock does the rest (its walls are the level's collision).
    this.arenaBoundsSpec = {
      shape: { kind: 'polygon', points: [[-30, 5.4], [30, 5.4], [30, -95], [-30, -95]] },
      floorY: -6,
      height: 14,
    };
    this.killPlaneY = -12;
    // Many small props (shelves, bones, pillars) in a few materials: one draw call per material.
    this.batchStatic = true;
    for (let i = 0; i < LAMP_LIGHTS; i++) {
      const light = new THREE.PointLight(LAMP_COLOR, 0, 8, 2);
      light.castShadow = false;
      this.lights.push(light);
      this.group.add(light);
    }
  }

  protected async loadEnvironment(): Promise<void> {
    // The mace on the altar: the hero's own (the blessed mace of his next kit), laid on its side across the cloth.
    const weapon = WEAPON_SETS.mace.definition.weapon;
    if (!weapon?.model) return;
    try {
      const prop = await CharacterRig.loadProp(weapon.model);
      if (this.disposed) return;
      toonifyModel(prop, this.ramp);
      const holder = new THREE.Group();
      holder.name = 'BlessedMace';
      prop.scale.setScalar(weapon.scale ?? 1);
      // Grip at the origin, head up +Y: lay it along the altar (+Y to -X), the head a little raised on the cloth.
      prop.rotation.z = Math.PI / 2 + 0.06;
      prop.position.x = 0.45;
      holder.add(prop);
      // A faint gold halo round it: something blessed, seen from across the shrine.
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 16, 12),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.62, 0.22), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      );
      halo.scale.set(1.5, 0.45, 0.6);
      halo.position.set(-0.05, 0.05, 0);
      holder.add(halo);
      this.mace = holder;
      this.maceHalo = halo;
      this.group.add(holder);
    } catch (err) {
      console.warn('[Level5_Island] the mace model did not load; the altar stays bare', err);
    }
  }

  protected prepareModel(model: THREE.Object3D): void {
    const lampMeshes: THREE.Object3D[] = [];
    model.traverse((obj) => {
      if (obj.name.startsWith('Lamp_')) lampMeshes.push(obj);
      if (obj.name === 'Mark_Mace') obj.getWorldPosition(this.maceRest);
      if (obj.name === 'Mark_Pool') obj.getWorldPosition(this.poolCentre);
      if (obj.name === 'Moon_Spill') {
        // Moonlight off the sea, in at the cave mouth.
        this.moon = new THREE.PointLight(0x6f8fd0, 9, 16, 1.6);
        obj.getWorldPosition(this.moon.position);
      }
      if (obj.name.startsWith('Eyes_')) this.eyes.push({ mesh: obj, seed: Math.random() * 10, next: 1 + Math.random() * 4, shut: 0, gone: 0 });
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = !NO_SHADOW.test(mesh.name);
      mesh.receiveShadow = !/^(Flame_|Eyes_|Water_)/.test(mesh.name);
      if (FLAME.test(mesh.name)) this.flames.push({ mesh, base: mesh.scale.clone(), seed: Math.random() * 100 });
    });
    for (const obj of lampMeshes) {
      const pos = obj.getWorldPosition(new THREE.Vector3());
      this.lamps.push({
        pos,
        power: Number(obj.userData.lamp_power ?? 1),
        range: Number(obj.userData.lamp_range ?? 8),
        seed: Math.random() * 100,
        color: LAMP_COLOR,
      });
    }
    // The mace's own glow: a lamp of its own on the altar, gold rather than flame.
    this.lamps.push({ pos: this.maceRest.clone().add(v(0, 0.6, 0.3)), power: 0.3, range: 5, seed: 0, color: MACE_COLOR });
    if (this.moon) this.group.add(this.moon);
    if (this.mace) this.mace.position.copy(this.maceRest);

    toonifyModel(model, this.ramp, (src) => {
      if (src.name === 'Flame') return new THREE.MeshBasicMaterial({ name: 'Flame', color: new THREE.Color(1.5, 0.42, 0.06), fog: false });
      // Eyes in the dark: unlit and through the fog, so they shine where nothing else can be seen.
      if (src.name === 'Eyes') return new THREE.MeshBasicMaterial({ name: 'Eyes', color: new THREE.Color(1.3, 1.5, 0.35), fog: false });
      if (src.name === 'Water') {
        const water = new THREE.MeshStandardMaterial({ name: 'Water', color: 0x020507, roughness: 0.1, metalness: 0.2 });
        water.userData.keepShading = true;
        return water;
      }
      return undefined;
    });
    this.collectBloom(model, 0.6);
  }

  /** Story cues: `take-mace` lifts the mace off the altar (he has it now). */
  public cue(name: string): void {
    if (name !== 'take-mace') return;
    if (this.mace) this.mace.visible = false;
    const glow = this.lamps.find((l) => l.color === MACE_COLOR);
    if (glow) glow.out = true;
  }

  public override update(time: number, dt: number, camera: THREE.Camera): void {
    super.update(time, dt, camera);
    const eye = camera.position;
    for (const f of this.flames) {
      const n = Math.sin(time * 13 + f.seed) * 0.5 + Math.sin(time * 29.3 + f.seed * 1.7) * 0.3;
      f.mesh.scale.set(f.base.x * (1 + 0.08 * n), f.base.y * (1 + 0.22 * n), f.base.z * (1 + 0.08 * n));
    }
    this.updateLamps(time, eye);
    this.updateEyes(dt, eye);
    this.updatePool(dt);
    if (this.maceHalo) {
      const m = this.maceHalo.material as THREE.MeshBasicMaterial;
      m.opacity = 0.1 + 0.04 * Math.sin(time * 1.7);
    }
  }

  /** The nearest lamps to the camera get the lights, flickering; the rest are flames in the dark. */
  private updateLamps(time: number, eye: THREE.Vector3): void {
    const lit = this.lamps.filter((l) => !l.out).sort((a, b) => a.pos.distanceToSquared(eye) - b.pos.distanceToSquared(eye));
    for (let i = 0; i < this.lights.length; i++) {
      const light = this.lights[i];
      const lamp = lit[i];
      if (!lamp) {
        light.intensity = 0;
        continue;
      }
      const n = Math.sin(time * 11 + lamp.seed) * 0.5 + Math.sin(time * 23.7 + lamp.seed * 1.7) * 0.3 + Math.sin(time * 5.3 + lamp.seed) * 0.2;
      light.position.copy(lamp.pos);
      light.color.copy(lamp.color);
      light.distance = lamp.range * 1.5;
      light.intensity = lamp.power * 36 * (lamp.color === MACE_COLOR ? 1 : 0.86 + 0.14 * n);
    }
  }

  /** Eyes blink now and then, and go out (back into the rock) while anyone comes near them. */
  private updateEyes(dt: number, eye: THREE.Vector3): void {
    const p = new THREE.Vector3();
    for (const e of this.eyes) {
      e.mesh.getWorldPosition(p);
      const near = p.distanceTo(eye) < 7;
      e.gone = near ? Math.min(1, e.gone + dt * 3) : Math.max(0, e.gone - dt * 0.25);
      e.next -= dt;
      if (e.next <= 0) {
        e.shut = 0.14;
        e.next = 2 + Math.random() * 5;
      }
      e.shut = Math.max(0, e.shut - dt);
      e.mesh.visible = e.gone < 0.5;
      e.mesh.scale.y = e.shut > 0 ? 0.1 : 1;
    }
  }

  /** Rings spreading on the black water: something moving under it. */
  private updatePool(dt: number): void {
    if (dt <= 0) return;
    this.rippleTimer -= dt;
    if (this.rippleTimer <= 0) {
      this.rippleTimer = 1.8 + Math.random() * 4;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1, 40),
        new THREE.MeshBasicMaterial({ color: 0x8a96a0, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.6;
      ring.position.set(this.poolCentre.x + Math.cos(a) * r, this.poolCentre.y + 0.02, this.poolCentre.z + Math.sin(a) * r);
      this.group.add(ring);
      this.ripples.push({ mesh: ring, t: 0, life: 2.6 + Math.random() * 1.5 });
    }
    for (const rp of [...this.ripples]) {
      rp.t += dt;
      const k = rp.t / rp.life;
      rp.mesh.scale.setScalar(0.15 + k * 1.3);
      (rp.mesh.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - k);
      if (k >= 1) {
        rp.mesh.removeFromParent();
        rp.mesh.geometry.dispose();
        (rp.mesh.material as THREE.Material).dispose();
        this.ripples.splice(this.ripples.indexOf(rp), 1);
      }
    }
  }
}

/**
 * The island's intro (Intros' establishing shots): from the night sea in through the cave mouth to the boat at the
 * landing, then down the first tunnel, its lamps going away into the dark.
 */
export function islandEstablishing(ctx: IntroContext): Shot[] {
  return [
    {
      duration: 7,
      fadeIn: 1.8,
      ease: ease.drift,
      keys: [
        { pos: v(0.6, 1.0, 17.5), look: v(0.2, 0.8, -2), fov: 46 },
        { pos: v(0.9, 1.5, 13.0), look: v(0.2, 0.9, -4), fov: 44 },
      ],
      cues: [{ at: 1.4, run: () => ctx.cards.chapter() }],
    },
    {
      duration: 6,
      fadeIn: 0.4,
      ease: ease.drift,
      keys: [
        { pos: v(-0.6, 1.5, -6.5), look: v(-1.5, 0.9, -14), fov: 46 },
        { pos: v(-1.6, 1.3, -10.5), look: v(-0.6, 0.6, -20), fov: 44 },
      ],
    },
  ];
}

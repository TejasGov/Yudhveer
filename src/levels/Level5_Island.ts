import * as THREE from 'three';
import { GLBLevel } from './GLBLevel';
import type { LevelAtmosphere } from './LevelTypes';
import { createToonRamp, toonifyModel } from './environment/ToonRelight';
import { FireField, findModelledFlames, spotForFlame, type ModelledFlame } from './environment/FireField';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { CharacterRig } from '../entities/animation/CharacterRig';
import { WEAPON_SETS } from '../entities/characters/YodhaWeapons';
import { ease, joltCamera, type Shot } from '../cinematics/CinematicDirector';
import { SoundFX } from '../combat/SoundFX';
import { ShrineSeal, GATE_COLLIDER, type SealHooks } from './ShrineSeal';
import type { IntroContext } from '../cinematics/Intros';
import { asset } from '../core/Assets';
import type RAPIER from '@dimforge/rapier3d-compat';

const LEVEL_URL = asset('levels/island_caves.glb');

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * Where things are in the caves (game coordinates; the build script `game asset/levels/03_island/build_island.py`
 * lays the map out on the same numbers). The path runs north (-z) and down from the sea cave to the shrine.
 */
export const ISLAND = {
  /** Where the boat put him ashore, facing the way in. */
  landing: v(0, 0, 2.2),
  /** The boat at the landing, and the thatched canopy amidships where the boatman sits. */
  boat: v(1.6, -0.45, 8.6),
  boatman: v(1.6, 0.15, 8.5),
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
  /**
   * The rock seal across the chamber (STORY.md, Chapter III): the soul's mark in front of it (east of the corpse's reach,
   * a metre and a half from the gate's face), and the mark she is settled on inside the opened room.
   */
  sealMark: v(2.6, -2.45, -71.2),
  inside: v(1.7, -2.11, -74.6),
};

const FLAME = /^Flame_/;
/** No shadows from the flames, water and eyes, the shell, the code-built props, the hanging stalactites, or the
 *  dressing laid over the rock (`Prop_*`, the pool's rim, the reliefs): only the big pieces a lamp stands beside. */
const NO_SHADOW = /^(Flame_|Water_|Eyes_|Stalactites|Props|Cave|Prop_|Pool_Rim|Shrine_Relief|Altar_Relief)/;
/** Point lights the lamps share: the nearest this many lamps are lit (a constant count: no shader recompiles). */
const LAMP_LIGHTS = 8;
const LAMP_COLOR = new THREE.Color(1.0, 0.56, 0.24);
/** The mace's own glow: the lamp the level lights over it (put out when he takes the mace up, lit again on a restart). */
export const MACE_COLOR = new THREE.Color(1.0, 0.8, 0.45);
/**
 * A lamp's light stands at least this far off the rock (and out of anything it stands in), as near its flame as that
 * allows: lights 0.3 m from the wall blew the rock behind them to white, and the brass deepastambhas, their lights
 * inside them, burned near-white.
 */
const LAMP_CLEARANCE = 0.55;
/**
 * The demoness's chamber (docs/ISLAND_DEMONESS.md): the brass lamp stands copied in from the altar room, by the walls
 * either side of her; the diyas set at the foot of the seal; the warm fill over the middle of the floor; and how much
 * the two shelf lamps at the chamber's mouth are strengthened.
 */
const CHAMBER_STANDS = { x: 4.6, z: -67.2, floor: -2.5, power: 1.25, range: 10 };
const GATE_DIYAS = [-3.4, -1.2, 1.2];
const GATE_DIYAS_Z = -71.35;
const CHAMBER_SHELF_BOOST = 1.5;
const CHAMBER_FILL = { pos: v(0, 1.5, -66.6), power: 0.75, range: 12, color: new THREE.Color(1.0, 0.66, 0.34) };

/** What the seal calls on the game for: the cutscene camera's shake, and its sounds (a build of chimes, a rumble, the doors, a bloom). */
function sealHooks(): SealHooks {
  const CHIMES = [0.9, 1.0, 1.2, 1.5, 2.0];
  return {
    jolt: (amount) => joltCamera(amount),
    sound: (cue, n) => {
      const fx = SoundFX.getInstance();
      if (cue === 'chime') fx.playTempleBell(CHIMES[Math.min(n, CHIMES.length - 1)], n % 2 ? 0.3 : -0.3);
      else if (cue === 'rumble') { fx.playImpactBoom(0.42); fx.playHeavyStep(0.45); }
      else if (cue === 'split') { fx.playStoneStrike(1.3); fx.playImpactBoom(0.8); }
      else if (cue === 'grind') fx.playHeavyStep(0.5 - n * 0.08);
      else if (cue === 'bloom') { fx.playTempleBell(0.5, 0); fx.playTempleBell(1.0, 0.1); fx.playTempleBell(2.0, -0.1); fx.playTanpura(4.5, 0.1); }
    },
  };
}

/** A lamp light's strength per unit of `lamp_power` (candela), and its falloff: gentler than the inverse square, so the
 *  pool of light reaches out into the dark without the near rock clipping. */
const LAMP_GAIN = 17;
const LAMP_DECAY = 1.5;

interface Lamp {
  /** The lamp's mark (its flame's, a little above it) and where its light stands (off the rock; see LAMP_CLEARANCE). */
  pos: THREE.Vector3;
  light: THREE.Vector3;
  power: number;
  range: number;
  color: THREE.Color;
  /** The fire group its flame burns in (its light flickers with it); none for the mace's glow. */
  group: string | null;
  out?: boolean;
  /** Stands in the altar room behind the seal: its light comes up only as the seal opens (ShrineSeal.roomGain). */
  behind?: boolean;
}
interface Eyes { mesh: THREE.Object3D; seed: number; next: number; shut: number; gone: number }
interface Ripple { mesh: THREE.Mesh; t: number; life: number; live: boolean }
/** Rings on the pool at once, at most: one every 1.8 s at the soonest, each living 4.1 s at the longest. */
const RIPPLES = 4;

/**
 * Chapter III: the island's caves (STORY.md, "Chapter III"), the one explorable map. Dark rock lit only by the oil
 * lamps someone still keeps: warm pools of light with the black between them, eyes that shine in the alcoves and go
 * out when he comes close, a pool of black water where something moves. The blessed mace lies on the shrine's altar
 * at the far end (`cue('take-mace')` lifts it away).
 *
 * The lamps are empties in the export; the nearest few to the camera share a small pool of point lights. Their flames
 * (cones in the export, `Flame_*`) burn in a FireField: one instanced draw, a group per lamp, each lamp's light
 * flickering with its own flame.
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
  /**
   * The seal across the last chamber: a carved gate of the cave's own rock (ShrineSeal), added to the exported cave.
   * Opening it removes only the door's own physics body; the wings of the gate stay solid.
   */
  private readonly seal: ShrineSeal;
  private readonly shrineSeal: THREE.Group;
  private sealBody: RAPIER.RigidBody | null = null;
  private sealOpen = false;
  /** Seconds of the opening sequence still to run (0 shut, or done). */
  private sealFade = 0;
  private readonly sealLight: THREE.PointLight;
  private ramp = createToonRamp([0.22, 0.5, 0.8, 1.0]);
  private lamps: Lamp[] = [];
  private lights: THREE.PointLight[] = [];
  private moon: THREE.PointLight | null = null;
  /** Every flame in the caves (see FireField). */
  private fires: FireField | null = null;
  /** The lamps' lights have been stood clear of the rock (needs the colliders, so on the first frame). */
  private lampsPlaced = false;
  private eyes: Eyes[] = [];
  private ripples: Ripple[] = [];
  private rippleTimer = 2;
  private poolCentre = ISLAND.water.clone();

  constructor() {
    super(LEVEL_URL);
    this.ownedTextures.add(this.ramp);
    this.seal = new ShrineSeal(sealHooks(), this.ramp, ISLAND.sealMark, ISLAND.inside);
    this.shrineSeal = this.seal.group;
    this.sealLight = this.seal.light;
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
      const light = new THREE.PointLight(LAMP_COLOR, 0, 8, LAMP_DECAY);
      light.castShadow = false;
      this.lights.push(light);
      this.group.add(light);
    }
  }

  protected async loadEnvironment(): Promise<void> {
    this.buildShrineSeal();
    this.buildRipples();
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
    // A pair of the altar room's brass lamp stands and a few diyas stood in the demoness's chamber (before the pass below,
    // which sets every mesh's shadows).
    const dressing = this.copyChamberProps(model);
    const lampMeshes: THREE.Object3D[] = [];
    const flameMeshes: THREE.Mesh[] = [];
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
      if (FLAME.test(mesh.name)) flameMeshes.push(mesh);
    });
    lampMeshes.forEach((obj, i) => {
      const pos = obj.getWorldPosition(new THREE.Vector3());
      this.lamps.push({
        pos,
        light: pos.clone(),
        power: Number(obj.userData.lamp_power ?? 1),
        range: Number(obj.userData.lamp_range ?? 8),
        color: LAMP_COLOR,
        group: `lamp_${i}`,
      });
    });
    // The flames are measured, then their cones taken out; a FireField burns where they stood.
    const flames = findModelledFlames(flameMeshes);
    for (const mesh of flameMeshes) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
    const wicks = this.drawLampsOutOfRock(model, flames);
    this.lightChamber(flames, wicks, dressing);
    this.lightFlames(flames, wicks);
    // The mace's own glow: a lamp of its own on the altar, gold rather than flame.
    const glow = this.maceRest.clone().add(v(0, 0.6, 0.3));
    this.lamps.push({ pos: glow, light: glow.clone(), power: 0.3, range: 5, color: MACE_COLOR, group: null });
    // The altar room's lamps (the mace's glow with them) stay dark while it is sealed: they light as the seal opens.
    for (const lamp of this.lamps) if (lamp.pos.z < -73.2) lamp.behind = true;
    if (this.moon) this.group.add(this.moon);
    if (this.mace) this.mace.position.copy(this.maceRest);

    toonifyModel(model, this.ramp, (src) => {
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
    // The seal's stone is the cave wall's own (its strata, its normal map, its colour beside the gate).
    // (The cave is one node with a mesh per material: the wall's is the one painted over most of the rock.)
    const walls: THREE.Mesh[] = [];
    model.getObjectByName('Cave')?.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && !Array.isArray(mesh.material) && mesh.material.name === 'CaveWall') walls.push(mesh);
    });
    this.seal.setRock(walls[0] ? (walls[0].material as THREE.Material) : null, this.wallTint(walls[0]));
    // The gate's wings are part of the rock: solid however the doors stand (the door's own collider is the one that goes).
    for (const side of [-1, 1]) this.addStaticBox(v(side * 6.85, 1, -72.65), v(2.65, 4.8, 0.7));
  }

  /** The mean colour of the cave's wall paint within sight of the gate (the seal's stone is tinted to match it). */
  private wallTint(cave?: THREE.Mesh): THREE.Color | undefined {
    const col = cave?.geometry.getAttribute('color');
    const pos = cave?.geometry.getAttribute('position');
    if (!col || !pos) return undefined;
    const sum = new THREE.Color(0, 0, 0);
    let n = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (Math.abs(x) > 7 || z > -62 || z < -76 || y < -2.4 || y > 2.4) continue;
      sum.r += col.getX(i); sum.g += col.getY(i); sum.b += col.getZ(i);
      n++;
    }
    return n > 20 ? sum.multiplyScalar(1 / n) : undefined;
  }

  /**
   * Dresses the demoness's chamber (she fights between the tunnel and the seal): a pair of the shrine's brass lamp stands
   * (copies of the altar room's, with their flames: `lightChamber`) set by the walls, and a few clay diyas at the foot of the
   * seal. Returns where each stand was copied from and by how much it moved, and the copied diyas' wicks.
   */
  private copyChamberProps(model: THREE.Object3D): { stands: { from: THREE.Vector3; by: THREE.Vector3 }[]; diyas: THREE.Vector3[] } {
    const stands: { from: THREE.Vector3; by: THREE.Vector3 }[] = [];
    for (const [name, x, z] of [['Deepastambha_E', CHAMBER_STANDS.x, CHAMBER_STANDS.z], ['Deepastambha_W', -CHAMBER_STANDS.x, CHAMBER_STANDS.z]] as const) {
      const src = model.getObjectByName(name);
      if (!src) continue;
      const from = src.getWorldPosition(new THREE.Vector3());
      const copy = src.clone();
      copy.name = name.replace('Deepastambha', 'Deepastambha_Chamber');
      copy.position.set(x, CHAMBER_STANDS.floor, z);
      model.add(copy);
      stands.push({ from, by: copy.position.clone().sub(from) });
    }
    const diyas: THREE.Vector3[] = [];
    const diya = model.getObjectByName('Prop_diya');
    if (diya) {
      for (const [i, x] of GATE_DIYAS.entries()) {
        const copy = diya.clone();
        copy.name = `Prop_diya_gate_${i}`;
        copy.position.set(x, CHAMBER_STANDS.floor, GATE_DIYAS_Z);
        copy.rotation.set(0, i * 1.7, 0);
        model.add(copy);
        diyas.push(copy.position.clone());
      }
    }
    return { stands, diyas };
  }

  /**
   * The chamber's light (the first this chamber has had): each copied stand burns like the altar room's (its five flames, a
   * lamp of its own in the shared pool); the diyas by the seal burn as wicks; a high warm fill hangs in the middle of the
   * chamber, so that the fight reads, a lamp like the others (the pool's nearest eight are lit, so it costs no light).
   */
  private lightChamber(flames: ModelledFlame[], wicks: Set<ModelledFlame>, dressing: { stands: { from: THREE.Vector3; by: THREE.Vector3 }[]; diyas: THREE.Vector3[] }): void {
    dressing.stands.forEach((stand, i) => {
      for (const f of flames.filter((o) => Math.hypot(o.foot.x - stand.from.x, o.foot.z - stand.from.z) < 0.7 && o.foot.y > stand.from.y)) {
        flames.push({ foot: f.foot.clone().add(stand.by), height: f.height, width: f.width });
      }
      const original = this.lamps.reduce((a, b) => (b.pos.distanceToSquared(stand.from) < a.pos.distanceToSquared(stand.from) ? b : a));
      const pos = original.pos.clone().add(stand.by);
      this.lamps.push({ pos, light: pos.clone(), power: CHAMBER_STANDS.power, range: CHAMBER_STANDS.range, color: LAMP_COLOR, group: `lamp_stand_${i}` });
    });
    for (const at of dressing.diyas) {
      const wick: ModelledFlame = { foot: v(at.x, at.y + 0.135, at.z), height: 0.2, width: 0.07 };
      flames.push(wick);
      wicks.add(wick);
    }
    // The two shelf lamps at the chamber's mouth stand stronger now, and one more, warmer, hangs over the middle of the floor.
    for (const lamp of this.lamps) if (lamp.pos.z < -63 && lamp.pos.z > -66 && lamp.group) lamp.power *= CHAMBER_SHELF_BOOST;
    this.lamps.push({ pos: CHAMBER_FILL.pos.clone(), light: CHAMBER_FILL.pos.clone(), power: CHAMBER_FILL.power, range: CHAMBER_FILL.range, color: CHAMBER_FILL.color, group: null });
  }

  /**
   * The diyas' flames (a flame standing on a `Prop_diya`, at its wick), returned so they burn as wick flames.
   *
   * The rock columns laid by the first tunnel's mouth (`Prop_rock_column*`, dressing placed after the lamps' shelves
   * were cut into the shell) swallow the two shelf lamps there: diya, wick and flame inside the rock, only the shelf's
   * end poking out. Each diya buried in the dressing rock is drawn out along its spout (toward the path) until it
   * clears the rock, its flame and its lamp with it, and a ledge of the shelf's stone is laid under it.
   */
  private drawLampsOutOfRock(model: THREE.Object3D, flames: ModelledFlame[]): Set<ModelledFlame> {
    const rock: THREE.Mesh[] = [];
    const diyas: THREE.Mesh[] = [];
    const wicks = new Set<ModelledFlame>();
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (/^Prop_(rock_column|cave_wall)/.test(mesh.name)) rock.push(mesh);
      if (/^Prop_diya/.test(mesh.name)) diyas.push(mesh);
    });
    const ray = new THREE.Raycaster();
    const box = new THREE.Box3();
    const centre = new THREE.Vector3();
    for (const diya of diyas) {
      box.setFromObject(diya);
      box.getCenter(centre);
      // Its wick: the flame standing on it, off its middle toward the spout.
      const wick = flames.find((f) => Math.hypot(f.foot.x - centre.x, f.foot.z - centre.z) < 0.2 && Math.abs(f.foot.y - box.max.y) < 0.15);
      if (!wick) continue;
      wicks.add(wick);
      const out = new THREE.Vector3(wick.foot.x - centre.x, 0, wick.foot.z - centre.z);
      if (!rock.length || out.lengthSq() < 1e-6) continue;
      out.normalize();
      // From a metre out in front of it, back toward it: where the rock's face stands, along its spout.
      ray.set(centre.clone().addScaledVector(out, 1), out.clone().negate());
      ray.far = 1.2;
      const hit = ray.intersectObjects(rock, false)[0];
      if (!hit) continue;
      const half = Math.abs((box.max.x - box.min.x) * out.x) / 2 + Math.abs((box.max.z - box.min.z) * out.z) / 2;
      const shift = 1 - hit.distance + half + 0.03;
      if (shift < 0.05) continue;
      const by = out.clone().multiplyScalar(shift);
      diya.position.add(diya.parent ? diya.parent.worldToLocal(centre.clone().add(by)).sub(diya.parent.worldToLocal(centre.clone())) : by);
      diya.updateMatrixWorld(true);
      wick.foot.add(by);
      const lamp = this.lamps.reduce((a, b) => (b.pos.distanceToSquared(wick.foot) < a.pos.distanceToSquared(wick.foot) ? b : a));
      lamp.pos.add(by);
      lamp.light.copy(lamp.pos);
      const width = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) + 0.14;
      model.add(this.ledge(diya.material as THREE.Material, box.min.y, hit.point, out, shift + half + 0.06, width));
    }
    return wicks;
  }

  /**
   * A short ledge of the shelves' dark stone (STONE_DARK in build_island.py, as vertex colour in the cave's painted
   * material, `painted`, so it is shaded like the shelf it carries on from), its top at `top`, running `length` m out
   * from the rock face at `from` along `out`.
   */
  private ledge(painted: THREE.Material, top: number, from: THREE.Vector3, out: THREE.Vector3, length: number, width: number): THREE.Mesh {
    const geo = new THREE.BoxGeometry(width, 0.1, length);
    geo.deleteAttribute('uv');
    const stone = new THREE.Color(0x463c33);
    const colours = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < colours.length; i += 3) stone.toArray(colours, i);
    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    const ledge = new THREE.Mesh(geo, painted);
    ledge.name = 'Prop_shelf_ledge';
    ledge.position.copy(from).addScaledVector(out, length / 2 - 0.06).setY(top - 0.05);
    ledge.rotation.y = Math.atan2(out.x, out.z);
    ledge.castShadow = false;
    ledge.receiveShadow = true;
    return ledge;
  }

  /**
   * The flames: the export's cones (`Flame_*`: a wall torch's, a brazier's, a diya's at its wick, five round each
   * deepastambha's top bowl), measured, become a FireField, each flame in its lamp's group so the lamp's light flickers
   * with it. Measured, not read off the nodes' origins: the deepastambhas' flames have theirs at the world origin, 75 m
   * away (they used to swing through the air as they were scaled about it). A diya's flame (`wicks`) is a wick's: one
   * slim tongue, smaller than the cone that stood there (which was as tall as the lamp).
   */
  private lightFlames(flames: ModelledFlame[], wicks: Set<ModelledFlame>): void {
    const groupOf = (foot: THREE.Vector3): string => {
      let best = this.lamps[0];
      for (const lamp of this.lamps) {
        if (Math.hypot(lamp.pos.x - foot.x, lamp.pos.z - foot.z) < Math.hypot(best.pos.x - foot.x, best.pos.z - foot.z)) best = lamp;
      }
      return best?.group ?? 'lamp';
    };
    // A torch or a brazier (the bigger flames) burns with a second tongue beside the first.
    const spots = flames.map((f) => spotForFlame(f, groupOf(f.foot), wicks.has(f) ? { size: 0.17, width: 0.5 } : { tongues: f.height > 0.3 ? 2 : 1 }));
    this.fires = new FireField(spots);
    this.fires.set('lamp', 1);
    for (const lamp of this.lamps) if (lamp.group) this.fires.set(lamp.group, 1);
    this.group.add(this.fires.mesh);
    this.bloomObjects.push(this.fires.mesh);
  }

  /**
   * Stands each lamp's light clear of the rock (see LAMP_CLEARANCE): of the points within 0.65 m of the lamp at its
   * height, the one with the most room round it up to that clearance, then the least moved, then (between equals) the
   * one looking into the most open space; found with rays against the level's colliders. A light inside something solid
   * (a deepastambha's, inside its collider) steps 0.8-1 m out of it. Once, as the level first runs: the colliders are
   * built after the model is prepared.
   */
  private placeLampLights(): void {
    const physics = PhysicsWorld.getInstance();
    if (!physics.world) return;
    const dir = new THREE.Vector3();
    const probe = new THREE.Vector3();
    const OPEN = 1.5;
    /** The nearest rock round `p` (12 horizontal rays, to OPEN m; 0 inside something solid). */
    const room = (p: THREE.Vector3): number => {
      let near = OPEN;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const hit = physics.castCameraRay(p, dir.set(Math.cos(a), 0, Math.sin(a)), OPEN);
        if (hit !== null) near = Math.min(near, hit);
      }
      return near;
    };
    for (const lamp of this.lamps) {
      // Inside something solid (a deepastambha's light, in its stand), it steps well clear of it: a brass lamp a hand's
      // breadth from a light burns white whatever the light's strength.
      const inside = physics.castCameraRay(lamp.pos, dir.set(0, 1, 0), 0.01) === 0;
      let best = lamp.pos;
      let bestScore = -Infinity;
      for (const r of inside ? [0.8, 1.0] : [0, 0.25, 0.45, 0.65]) {
        for (let k = 0; k < (r === 0 ? 1 : 8); k++) {
          const a = (k / 8) * Math.PI * 2;
          probe.set(lamp.pos.x + Math.cos(a) * r, lamp.pos.y, lamp.pos.z + Math.sin(a) * r);
          // Never through the rock to the far side of it (from inside a solid prop every way out "hits" it).
          if (r > 0 && !inside && physics.castCameraRay(lamp.pos, dir.copy(probe).sub(lamp.pos).normalize(), r) !== null) continue;
          const space = room(probe);
          const score = Math.min(space, LAMP_CLEARANCE) * 10 - r + space * 0.4;
          if (score > bestScore) {
            bestScore = score;
            best = probe.clone();
          }
        }
      }
      lamp.light.copy(best);
    }
    this.lampsPlaced = true;
  }

  /** The rock seal across the chamber, shut (its door collider in place). The exported cave, lamps, altar and mace are left as they are. */
  private buildShrineSeal(): void {
    this.group.add(this.shrineSeal);
    this.sealLight.position.set(0, 0.2, -70.4);
    this.group.add(this.sealLight);
    this.bloomObjects.push(...this.seal.glowing);
    if (!this.sealOpen) this.sealBody = this.physics.createStaticBox(GATE_COLLIDER.centre, GATE_COLLIDER.half).body;
    this.shrineSeal.visible = true;
  }

  /**
   * Story cues: the soul opens the seal; `take-mace` lifts the mace from its altar; `chapter-start` (the chapter begun again,
   * a retry or a replay in the same page: the level is reused) puts back everything the story changed here, so the shut
   * seal, its collider, the mace and the mace's lamp are all as on the first visit. Each is safe to send twice.
   */
  public cue(name: string): void {
    if (name === 'open-shrine') {
      if (this.sealOpen) return;
      this.sealOpen = true;
      if (this.sealBody) { this.physics.removeBody(this.sealBody); this.sealBody = null; }
      this.seal.open();
      this.sealFade = this.seal.remaining;
      return;
    }
    if (name === 'chapter-start') {
      this.sealOpen = false;
      this.sealFade = 0;
      this.seal.rearm();
      this.shrineSeal.visible = true;
      if (!this.sealBody) this.sealBody = this.physics.createStaticBox(GATE_COLLIDER.centre, GATE_COLLIDER.half).body;
      if (this.mace) this.mace.visible = true;
      const lit = this.lamps.find((l) => l.color === MACE_COLOR);
      if (lit) lit.out = false;
      return;
    }
    if (name !== 'take-mace') return;
    if (this.mace) this.mace.visible = false;
    const glow = this.lamps.find((l) => l.color === MACE_COLOR);
    if (glow) glow.out = true;
  }

  public override update(time: number, dt: number, camera: THREE.Camera): void {
    this.seal.update(dt, time);
    this.sealFade = this.seal.remaining;
    this.fires?.update(time);
    super.update(time, dt, camera);
    const eye = camera.position;
    if (!this.lampsPlaced) this.placeLampLights();
    this.updateLamps(eye);
    this.updateEyes(dt, eye);
    this.updatePool(dt);
    if (this.maceHalo) {
      const m = this.maceHalo.material as THREE.MeshBasicMaterial;
      m.opacity = 0.1 + 0.04 * Math.sin(time * 1.7);
    }
  }

  /** The nearest lamps to the camera get the lights, flickering with their flames; the rest are flames in the dark. */
  private updateLamps(eye: THREE.Vector3): void {
    // The altar room's lamps come up as the seal opens (its light floods through); shut, they are dark and cost no slot.
    const room = this.seal.roomGain;
    const lit = this.lamps.filter((l) => !l.out && !(l.behind && room <= 0.001)).sort((a, b) => a.pos.distanceToSquared(eye) - b.pos.distanceToSquared(eye));
    for (let i = 0; i < this.lights.length; i++) {
      const light = this.lights[i];
      const lamp = lit[i];
      if (!lamp) {
        light.intensity = 0;
        continue;
      }
      light.position.copy(lamp.light);
      light.color.copy(lamp.color);
      light.distance = lamp.range * 1.5;
      light.intensity = lamp.power * LAMP_GAIN * (lamp.group ? this.fires?.flicker(lamp.group) ?? 1 : 1) * (lamp.behind ? room : 1);
    }
  }

  public override dispose(): void {
    if (this.sealBody) { this.physics.removeBody(this.sealBody); this.sealBody = null; }
    this.seal.dispose();
    this.fires?.dispose();
    super.dispose();
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

  /**
   * The rings on the water, made once and used again: a ring made and freed per ripple freed its shader program with the
   * last of them (nothing else uses it), and the next ring built it again, in the middle of the fight. Each is hidden
   * while it is not rippling; the loading screen's warm-up frame draws them (Engine.warmUp), so the program is there first.
   */
  private buildRipples(): void {
    if (this.ripples.length) return;
    const geometry = new THREE.RingGeometry(0.9, 1, 40);
    for (let i = 0; i < RIPPLES; i++) {
      const ring = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color: 0x8a96a0, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }),
      );
      ring.name = 'PoolRipple';
      ring.rotation.x = -Math.PI / 2;
      // Idle: hidden, tiny and far below the pool (the warm-up frame draws it, and nothing of it could show).
      ring.position.y = -500;
      ring.scale.setScalar(0.001);
      ring.visible = false;
      ring.userData.warm = true;
      this.group.add(ring);
      this.ripples.push({ mesh: ring, t: 0, life: 1, live: false });
    }
  }

  /** Rings spreading on the black water: something moving under it. */
  private updatePool(dt: number): void {
    if (dt <= 0) return;
    this.rippleTimer -= dt;
    if (this.rippleTimer <= 0) {
      this.rippleTimer = 1.8 + Math.random() * 4;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.6;
      const life = 2.6 + Math.random() * 1.5;
      const rp = this.ripples.find((x) => !x.live);
      if (rp) {
        rp.mesh.position.set(this.poolCentre.x + Math.cos(a) * r, this.poolCentre.y + 0.02, this.poolCentre.z + Math.sin(a) * r);
        rp.t = 0;
        rp.life = life;
        rp.live = true;
        rp.mesh.visible = true;
      }
    }
    for (const rp of this.ripples) {
      if (!rp.live) continue;
      rp.t += dt;
      const k = rp.t / rp.life;
      rp.mesh.scale.setScalar(0.15 + k * 1.3);
      (rp.mesh.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - k);
      if (k >= 1) {
        rp.live = false;
        rp.mesh.visible = false;
        rp.mesh.position.y = -500;
        rp.mesh.scale.setScalar(0.001);
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

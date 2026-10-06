import * as THREE from 'three';
import { ParticleFX } from './ParticleFX';
import { SceneManager } from '../core/SceneManager';

/*
 * Chingaari: the sparks where metal meets metal or stone (docs/STORY.md, "Hit feel"). Not a round puff: a spray thrown
 * along the way the blade was travelling (what a blade scraping across armour or a dhal throws), white-hot at the head
 * and orange down the tail, falling and skittering on the floor, living a third of a second; and a flash of light with it.
 *
 * The light is one PointLight made when the game starts (ParticleFX.init), always in the scene at zero intensity, so no
 * material ever recompiles for it, and moved to wherever the next clash is: nothing is created per blow.
 */

/** What struck what: steel on steel or hide, iron (a mace) on armour, either on the floor. */
export type Strike = 'steel' | 'iron' | 'stone';

interface Look {
  count: number;
  /** Half-angle of the spray round the blade's travel (radians), and the share thrown every which way instead. */
  cone: number;
  pop: number;
  speed: [number, number];
  life: [number, number];
  size: [number, number];
  /** Longer tails than the other sparks have: a fast spark is a streak. */
  streak: number;
  /** Extra upward kick (m/s). */
  lift: number;
  /** The light: its strength and how long it lasts (s). */
  light: number;
  lightLife: number;
}

const LOOK: Record<Strike, Look> = {
  steel: { count: 26, cone: 0.42, pop: 0.28, speed: [5, 12], life: [0.2, 0.42], size: [0.012, 0.024], streak: 2, lift: 1.2, light: 11, lightLife: 0.07 },
  iron: { count: 34, cone: 0.55, pop: 0.35, speed: [4, 10], life: [0.22, 0.46], size: [0.015, 0.03], streak: 1.7, lift: 1.5, light: 15, lightLife: 0.085 },
  stone: { count: 30, cone: 1.1, pop: 0.2, speed: [3, 9], life: [0.22, 0.5], size: [0.014, 0.028], streak: 1.6, lift: 2.8, light: 13, lightLife: 0.08 },
};
const LIGHT_COLOR = new THREE.Color(1, 0.68, 0.34);
/** The flash sits this far toward the camera from the clash, so what faces us is what it lights. */
const LIGHT_LIFT = 0.25;

const _dir = new THREE.Vector3();
const _toCamera = new THREE.Vector3();

export class ClashFX {
  private static instance: ClashFX | null = null;
  private light: THREE.PointLight | null = null;
  private peak = 0;
  private life = 0.07;
  private age = 1;
  private lastWall = 0;

  private constructor() {}

  public static getInstance(): ClashFX {
    if (!ClashFX.instance) ClashFX.instance = new ClashFX();
    return ClashFX.instance;
  }

  /** The pooled light (once, with the scene's other lights, before any level compiles its materials). */
  public init(scene: THREE.Scene): void {
    if (this.light) return;
    const light = new THREE.PointLight(LIGHT_COLOR, 0, 6.5, 2);
    light.name = 'ClashLight';
    light.castShadow = false;
    scene.add(light);
    this.light = light;
  }

  /**
   * A spray of chingaari from `point`, thrown along `swing` (the blade's travel there; any length), `power` 1 being a full
   * clash. `floor`: the height of the ground under it, where the sparks skitter (default: they fall past it).
   */
  public sparks(point: THREE.Vector3, swing: THREE.Vector3, strike: Strike, power = 1, floor?: number): void {
    const look = LOOK[strike];
    const dir = _dir.copy(swing);
    if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0);
    dir.normalize();
    ParticleFX.getInstance().spawnChingaari(point, dir, {
      count: Math.max(3, Math.round(look.count * power)),
      cone: look.cone,
      pop: look.pop,
      speed: look.speed,
      life: look.life,
      size: look.size,
      streak: look.streak,
      lift: look.lift,
      floor,
    });
    this.glow(point, look.light * Math.min(1.3, 0.55 + 0.6 * power), look.lightLife);
  }

  /** A flash of light at `point`: `intensity` in candela, gone in `life` seconds. A newer one takes the light over. */
  public glow(point: THREE.Vector3, intensity: number, life = 0.07): void {
    const light = this.light;
    if (!light) return;
    // A weaker flash never cuts a stronger one still going short.
    const now = this.peak * (1 - this.age / this.life) ** 2;
    if (this.age < this.life && now > intensity) return;
    const camera = SceneManager.getInstance().camera;
    _toCamera.subVectors(camera.position, point);
    if (_toCamera.lengthSq() > 1e-6) _toCamera.normalize();
    light.position.copy(point).addScaledVector(_toCamera, LIGHT_LIFT);
    this.peak = intensity;
    this.life = life;
    this.age = 0;
    this.lastWall = performance.now();
    light.intensity = intensity;
  }

  /**
   * Once per rendered frame (ParticleFX.update's `dt`: simulated seconds, 0 in a hit-stop). Like the hit flash, the light
   * is made to last a few hundredths of real time, so a freeze holds the sparks but not a white-out; in stepped tests, with no
   * real time passing, it runs on simulated time.
   */
  public update(dt: number): void {
    const light = this.light;
    if (!light) return;
    const now = performance.now();
    const wall = Math.min(0.05, Math.max(0, (now - this.lastWall) / 1000));
    this.lastWall = now;
    if (this.age >= this.life) {
      if (light.intensity !== 0) light.intensity = 0;
      return;
    }
    this.age += Math.max(dt, wall);
    const k = 1 - this.age / this.life;
    light.intensity = k > 0 ? this.peak * k * k : 0;
  }
}

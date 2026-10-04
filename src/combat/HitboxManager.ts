import * as THREE from 'three';
import { Character } from '../entities/Character';

export interface WeaponHitPoint {
  tip: THREE.Vector3;
  hilt: THREE.Vector3;
}

/** A body's hurt volume: the segment a-b swept by a sphere of `radius`. */
export interface Capsule {
  a: THREE.Vector3;
  b: THREE.Vector3;
  radius: number;
}

export interface SweptHit {
  hit: boolean;
  /** Point on the blade closest to the body at first touch (sparks go here). */
  hitPoint: THREE.Vector3;
  /** How far through this step's swing the first touch happened (0..1). */
  fraction: number;
}

/** Half the blade's thickness, added to the body radius. */
const BLADE_RADIUS = 0.05;
/** Swing sub-steps: at most this much tip travel between tests, and at most this many tests per step. */
const MAX_TIP_STEP = 0.1;
const MAX_SUBSTEPS = 24;

/**
 * Weapon hit detection: the blade segment swept from where it was last step to where it is now, sub-stepped so a
 * fast swing cannot pass through a body between two steps, tested against the defender's hurt capsule.
 */
export class HitboxManager {
  private static instance: HitboxManager | null = null;
  /** Each fighter's blade at the end of the previous step. */
  private readonly lastBlade = new Map<string, WeaponHitPoint>();

  private constructor() {}

  public static getInstance(): HitboxManager {
    if (!HitboxManager.instance) {
      HitboxManager.instance = new HitboxManager();
    }
    return HitboxManager.instance;
  }

  /** The blade now and where it was last step (the same, for a fighter seen for the first time). */
  public blade(character: Character): { prev: WeaponHitPoint; curr: WeaponHitPoint } {
    const curr = character.getWeaponPoints();
    const last = this.lastBlade.get(character.id);
    // No swing is 3 m in one step: that is a teleport (spawn, respawn), not a sweep across the arena.
    const prev = last && last.tip.distanceTo(curr.tip) < 3 ? last : curr;
    return { prev, curr };
  }

  /** Call once per step after all tests: this step's blade becomes next step's "previous". */
  public commitBlades(characters: Character[]): void {
    for (const c of characters) {
      const { tip, hilt } = c.getWeaponPoints();
      this.lastBlade.set(c.id, { tip: tip.clone(), hilt: hilt.clone() });
    }
  }

  public forget(id: string): void {
    this.lastBlade.delete(id);
  }

  /** Did `attacker`'s blade, moving over this step, touch `defender`'s body? */
  public checkWeaponIntersection(attacker: Character, defender: Character): SweptHit {
    const { prev, curr } = this.blade(attacker);
    return sweepBlade(prev, curr, defender.hurtCapsule());
  }
}

/** Sweeps the blade from `prev` to `curr` and reports the first sub-step at which it touches `body`. */
export function sweepBlade(prev: WeaponHitPoint, curr: WeaponHitPoint, body: Capsule): SweptHit {
  const travel = Math.max(prev.tip.distanceTo(curr.tip), prev.hilt.distanceTo(curr.hilt));
  const steps = THREE.MathUtils.clamp(Math.ceil(travel / MAX_TIP_STEP), 1, MAX_SUBSTEPS);
  const hilt = new THREE.Vector3();
  const tip = new THREE.Vector3();
  const onBlade = new THREE.Vector3();
  const onBody = new THREE.Vector3();
  const reach = body.radius + BLADE_RADIUS;
  for (let s = 1; s <= steps; s++) {
    const f = s / steps;
    hilt.lerpVectors(prev.hilt, curr.hilt, f);
    tip.lerpVectors(prev.tip, curr.tip, f);
    if (closestPointsSegments(hilt, tip, body.a, body.b, onBlade, onBody) <= reach * reach) {
      return { hit: true, hitPoint: onBlade.clone(), fraction: f };
    }
  }
  return { hit: false, hitPoint: curr.tip.clone(), fraction: 1 };
}

/**
 * Closest points between segments p1-q1 and p2-q2 (written to c1, c2); returns their squared distance.
 * (Ericson, Real-Time Collision Detection, 5.1.9.)
 */
export function closestPointsSegments(
  p1: THREE.Vector3, q1: THREE.Vector3, p2: THREE.Vector3, q2: THREE.Vector3,
  c1: THREE.Vector3, c2: THREE.Vector3,
): number {
  const d1 = new THREE.Vector3().subVectors(q1, p1);
  const d2 = new THREE.Vector3().subVectors(q2, p2);
  const r = new THREE.Vector3().subVectors(p1, p2);
  const a = d1.lengthSq();
  const e = d2.lengthSq();
  const f = d2.dot(r);
  let s: number;
  let t: number;
  const EPS = 1e-9;
  if (a <= EPS && e <= EPS) {
    s = t = 0;
  } else if (a <= EPS) {
    s = 0;
    t = THREE.MathUtils.clamp(f / e, 0, 1);
  } else {
    const c = d1.dot(r);
    if (e <= EPS) {
      t = 0;
      s = THREE.MathUtils.clamp(-c / a, 0, 1);
    } else {
      const b = d1.dot(d2);
      const denom = a * e - b * b;
      s = denom > EPS ? THREE.MathUtils.clamp((b * f - c * e) / denom, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = THREE.MathUtils.clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = THREE.MathUtils.clamp((b - c) / a, 0, 1);
      }
    }
  }
  c1.copy(p1).addScaledVector(d1, s);
  c2.copy(p2).addScaledVector(d2, t);
  return c1.distanceToSquared(c2);
}

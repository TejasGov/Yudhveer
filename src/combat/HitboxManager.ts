import * as THREE from 'three';
import { Character } from '../entities/Character';

export interface WeaponHitPoint {
  tip: THREE.Vector3;
  hilt: THREE.Vector3;
}

export class HitboxManager {
  private static instance: HitboxManager | null = null;

  private constructor() {}

  public static getInstance(): HitboxManager {
    if (!HitboxManager.instance) {
      HitboxManager.instance = new HitboxManager();
    }
    return HitboxManager.instance;
  }

  /**
   * Extract sword hilt and tip world coordinates
   */
  public getWeaponPoints(character: Character): WeaponHitPoint {
    const rSocket = character.getSocket('mixamorigRightHand');
    const hilt = new THREE.Vector3();
    const tip = new THREE.Vector3();

    if (rSocket) {
      rSocket.getWorldPosition(hilt);
      
      // Calculate tip based on sword orientation
      const dir = new THREE.Vector3(0, 1.1, 0);
      dir.applyQuaternion(rSocket.quaternion);
      tip.copy(hilt).add(dir);
    } else {
      character.group.getWorldPosition(hilt);
      tip.copy(hilt).add(new THREE.Vector3(0, 1, 1));
    }

    return { tip, hilt };
  }

  /**
   * Check if weapon line segment intersects defender's hurtbox cylinder/capsule
   */
  public checkWeaponIntersection(
    attacker: Character,
    defender: Character,
    hurtboxRadius = 0.55
  ): { hit: boolean; hitPoint: THREE.Vector3 } {
    const { tip, hilt } = this.getWeaponPoints(attacker);
    const defenderCenter = defender.getPosition().clone().add(new THREE.Vector3(0, 0.9, 0));

    // Distance from line segment (hilt -> tip) to defender point
    const ab = new THREE.Vector3().subVectors(tip, hilt);
    const ap = new THREE.Vector3().subVectors(defenderCenter, hilt);

    const abLenSq = ab.lengthSq();
    let t = abLenSq > 0 ? ap.dot(ab) / abLenSq : 0;
    t = Math.max(0, Math.min(1, t));

    const closestPointOnBlade = new THREE.Vector3().copy(hilt).addScaledVector(ab, t);
    const distSq = closestPointOnBlade.distanceToSquared(defenderCenter);

    const hit = distSq <= (hurtboxRadius * hurtboxRadius);
    return { hit, hitPoint: closestPointOnBlade };
  }
}

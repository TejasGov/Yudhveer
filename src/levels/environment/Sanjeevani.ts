import * as THREE from 'three';
import { SceneFX } from '../../cinematics/SceneFX';
import { motes } from '../../cinematics/DivineLight';
import { SceneManager } from '../../core/SceneManager';
import type { Character } from '../../entities/Character';

/*
 * Sanjeevani, the healing herb of the Himalaya (the one Hanuman carried the mountain for), in the last fight (the user,
 * 2026-10-07): once the hero is below half health, two of them come up out of the summit's stone, by Shiva's stair and
 * by Nandi. Walking over one takes it: it gives back `heal` of his health (over `healOver` seconds, so his bar fills),
 * and withers. Each is there once. The Engine says when they come and when one is taken (`Finale.herbs`); this is the
 * herb itself: a tuft of stems and leaves with a glowing bud on each, growing up out of a pool of light on the ground,
 * swaying, its motes drifting up. Everything runs on SceneFX's clock and goes with the chapter.
 */

export const SANJEEVANI = {
  /** The hero's health below which they come up (a share of his whole). */
  below: 0.5,
  /** What one gives back, a share of his whole health, over `healOver` seconds. */
  heal: 0.15,
  healOver: 0.8,
  /** How near (m, on the ground) he must come to take one. */
  reach: 1.1,
  /** Seconds to grow up out of the ground, and to wither when taken. */
  grow: 1.8,
  wither: 0.7,
  /** How big it stands (the tuft is modelled about 0.6 m tall). */
  size: 1.5,
};

const LEAF = new THREE.Color(0x2f7a3a);
const LEAF_GLOW = new THREE.Color(0x2c8a2a);
const STEM = new THREE.Color(0x3d5e2a);
/** The buds, the pool of light and the motes: a living gold-green, bright enough to bloom. */
const BUD = new THREE.Color(1.6, 2.6, 0.9);
const POOL = new THREE.Color(0.55, 1.0, 0.35);
const MOTE = new THREE.Color(1.1, 2.2, 0.8);

export interface Herb {
  /** Where it grows (on the ground). */
  readonly at: THREE.Vector3;
  /** Grown and not yet taken. */
  readonly ripe: boolean;
  /** Taken by `hero`: he gets his health back, its light goes up round him, and it withers. */
  take(hero: Character): void;
}

/** A leaf blade in the XY plane, pointing up +y from its base. */
function leafGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.42, 0.38, 0, 1);
  s.quadraticCurveTo(-0.42, 0.38, 0, 0);
  return new THREE.ShapeGeometry(s, 6);
}

/** A soft round glow, for the pool of light on the ground. */
function poolTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** One herb, growing up out of the ground at `at` from now. */
export function sprout(parent: THREE.Object3D, at: THREE.Vector3): Herb {
  const root = new THREE.Group();
  root.name = 'Sanjeevani';
  root.position.copy(at);
  root.rotation.y = Math.random() * Math.PI * 2;
  parent.add(root);

  const leafGeo = leafGeometry();
  const budGeo = new THREE.SphereGeometry(1, 10, 8);
  const leafMat = new THREE.MeshLambertMaterial({ color: LEAF, emissive: LEAF_GLOW, emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const stemMat = new THREE.MeshLambertMaterial({ color: STEM, emissive: LEAF_GLOW, emissiveIntensity: 0.4 });
  const budMat = new THREE.MeshBasicMaterial({ color: BUD.clone(), toneMapped: false });
  const poolMap = poolTexture();
  const poolMat = new THREE.MeshBasicMaterial({ map: poolMap, color: POOL, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const geometries: THREE.BufferGeometry[] = [leafGeo, budGeo];

  // The pool of light it grows out of.
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), poolMat);
  geometries.push(pool.geometry);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.04;
  pool.renderOrder = 2;
  root.add(pool);

  // The tuft: stems leaning out round the middle, each with leaves up it and a bud at its tip. Each stem sways about
  // its base on its own.
  const stems: { pivot: THREE.Group; phase: number; rate: number; lean: number }[] = [];
  const buds: THREE.Mesh[] = [];
  const COUNT = 9;
  for (let i = 0; i < COUNT; i++) {
    const yaw = (i / COUNT) * Math.PI * 2 + rand(-0.3, 0.3);
    const centre = i === 0;
    const h = centre ? 0.62 : rand(0.34, 0.54);
    const out = centre ? 0.02 : rand(0.1, 0.2);
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      dir.clone().multiplyScalar(out * 0.2).setY(h * 0.55),
      dir.clone().multiplyScalar(out).setY(h),
    );
    const pivot = new THREE.Group();
    pivot.position.copy(dir.clone().multiplyScalar(centre ? 0 : 0.05));
    root.add(pivot);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.009, 4, false), stemMat);
    geometries.push(stem.geometry);
    pivot.add(stem);
    for (const [t, side] of [[0.3, 1], [0.55, -1], [0.78, 1]] as const) {
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      const size = rand(0.09, 0.14) * (1.15 - t * 0.4);
      leaf.scale.set(size, size * 1.6, size);
      leaf.position.copy(curve.getPoint(t));
      leaf.rotation.set(rand(0.8, 1.15), yaw + side * rand(0.9, 1.4), 0, 'YXZ');
      pivot.add(leaf);
    }
    const bud = new THREE.Mesh(budGeo, budMat);
    bud.scale.setScalar(centre ? 0.042 : rand(0.026, 0.034));
    bud.position.copy(curve.getPoint(1)).add(new THREE.Vector3(0, 0.015, 0));
    pivot.add(bud);
    buds.push(bud);
    stems.push({ pivot, phase: Math.random() * 6.28, rate: rand(1.0, 1.6), lean: rand(0.04, 0.07) });
  }
  root.scale.setScalar(0.001);

  const fx = SceneManager.getInstance().postFX;
  buds.forEach((b) => fx.addBloom(b));
  fx.addBloom(pool);
  // Its motes, drifting up off it (many as it comes up); and the ones that go up round the hero when he takes it.
  const drift = motes(parent, { at: at.clone().setY(at.y + 0.1), radius: 0.5, rate: 0, rise: 0.7, life: 3.2, color: MOTE, size: 0.13 });
  const gift = motes(parent, { at: at.clone(), radius: 0.55, rate: 0, rise: 1.4, life: 1.6, color: MOTE, size: 0.14, spin: 2.2 });

  let gone = false;
  const remove = () => {
    if (gone) return;
    gone = true;
    buds.forEach((b) => fx.removeBloom(b));
    fx.removeBloom(pool);
    root.removeFromParent();
    geometries.forEach((g) => g.dispose());
    [leafMat, stemMat, budMat, poolMat].forEach((m) => m.dispose());
    poolMap.dispose();
  };
  SceneFX.onClear(remove);

  let age = 0;
  let taken: { t: number; hero: Character } | null = null;
  const herb = {
    at: at.clone(),
    get ripe() {
      return !gone && !taken && age >= SANJEEVANI.grow * 0.6;
    },
    take(hero: Character) {
      if (!herb.ripe) return;
      taken = { t: 0, hero };
      // His health back, a little at a time, so his bar fills.
      const total = hero.maxHealth * SANJEEVANI.heal;
      let given = 0;
      SceneFX.tween(SANJEEVANI.healOver, (k) => {
        const due = total * k - given;
        given += due;
        if (hero.stateMachine.currentState !== 'DEAD') hero.currentHealth = Math.min(hero.maxHealth, hero.currentHealth + due);
      }, { ease: (x) => 1 - (1 - x) * (1 - x) });
    },
  };

  SceneFX.every((dt) => {
    if (gone) return false;
    age += dt;
    const time = age;
    // Growing up out of the ground: a quick rise that overshoots a touch and settles; the pool comes up under it.
    const g = Math.min(1, age / SANJEEVANI.grow);
    const back = 1.6;
    const grown = g >= 1 ? 1 : 1 + (back + 1) * Math.pow(g - 1, 3) + back * Math.pow(g - 1, 2);
    let scale = Math.max(0.001, grown);
    let glow = 0.55 + 0.25 * Math.sin(time * 2.2);
    drift.rate = g < 1 ? 30 * (1 - g) + 7 : 7;
    if (taken) {
      // Taken: its light goes up round him, its buds flare, and it withers into the ground.
      taken.t += dt;
      const w = Math.min(1, taken.t / SANJEEVANI.wither);
      scale = Math.max(0.001, 1 - w * w);
      glow = (1 - w) * 1.6;
      drift.rate = 0;
      gift.at.copy(taken.hero.getPosition());
      gift.rate = taken.t < 0.9 ? 70 : 0;
      budMat.color.copy(BUD).multiplyScalar(1 + 1.5 * (1 - w));
      if (taken.t >= 2.0) {
        remove();
        return false;
      }
    } else {
      budMat.color.copy(BUD).multiplyScalar(0.85 + 0.3 * Math.sin(time * 3.1));
    }
    root.scale.setScalar(scale * SANJEEVANI.size);
    poolMat.opacity = Math.min(1, g * 1.5) * glow * 0.55;
    for (const s of stems) {
      s.pivot.rotation.x = Math.sin(time * s.rate + s.phase) * s.lean;
      s.pivot.rotation.z = Math.cos(time * s.rate * 0.8 + s.phase) * s.lean * 0.7;
    }
    return true;
  });

  return herb;
}

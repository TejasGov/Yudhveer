import * as THREE from 'three';
import { SceneFX } from './SceneFX';
import { SceneManager } from '../core/SceneManager';

/*
 * A bolt of lightning that lands where a scene says (docs/proposals/ENTRANCES.md): a jagged ribbon from high in the
 * clouds down to `to`, with a couple of branches, drawn as camera-facing quads bright enough to bloom. It lives a
 * third of a second on the game's clock (so a shot in slow motion holds it crawling over the figure), flickering, and
 * re-strikes along a new path once before it fades. The storm sky's own glow is aimed separately (StormSky.strikeAt).
 */

const UP = new THREE.Vector3(0, 1, 0);

/** A jagged path from `a` to `b`: the straight line, bent at its midpoints `depth` times. */
function jagged(a: THREE.Vector3, b: THREE.Vector3, depth: number, bend: number): THREE.Vector3[] {
  let points = [a.clone(), b.clone()];
  for (let d = 0; d < depth; d++) {
    const next: THREE.Vector3[] = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1];
      const q = points[i];
      const seg = q.clone().sub(p);
      const len = seg.length();
      const dir = seg.clone().normalize();
      // A random direction across the segment.
      const across = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : UP).normalize();
      const around = across.clone().applyAxisAngle(dir, Math.random() * Math.PI * 2);
      next.push(p.clone().lerp(q, 0.5).addScaledVector(around, (Math.random() - 0.5) * 2 * len * bend), q);
    }
    points = next;
  }
  return points;
}

/** The ribbon: each segment a quad facing the camera, `width` across, thinning toward the ground. */
function ribbon(paths: { points: THREE.Vector3[]; width: number }[], camera: THREE.Vector3): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const { points, width } of paths) {
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1];
      const q = points[i];
      const t0 = (i - 1) / (points.length - 1);
      const t1 = i / (points.length - 1);
      const seg = q.clone().sub(p).normalize();
      const toCam = camera.clone().sub(p).normalize();
      const side = new THREE.Vector3().crossVectors(seg, toCam).normalize();
      // Thick in the clouds, down to a point where it lands.
      const w0 = width * (1.1 - 0.95 * t0 * t0) * 0.5;
      const w1 = width * (1.1 - 0.95 * t1 * t1) * 0.5;
      const base = positions.length / 3;
      positions.push(
        p.x - side.x * w0, p.y - side.y * w0, p.z - side.z * w0,
        p.x + side.x * w0, p.y + side.y * w0, p.z + side.z * w0,
        q.x + side.x * w1, q.y + side.y * w1, q.z + side.z * w1,
        q.x - side.x * w1, q.y - side.y * w1, q.z - side.z * w1,
      );
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

/** The main bolt down to `to` from a point `height` up and some way off, and `branches` forks off its upper half. */
function strikePaths(to: THREE.Vector3, height: number, width: number, branches: number): { points: THREE.Vector3[]; width: number }[] {
  const top = to.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5 * height, height, (Math.random() - 0.5) * 0.5 * height));
  const main = jagged(top, to, 7, 0.19);
  const paths = [{ points: main, width }];
  for (let b = 0; b < branches; b++) {
    const i = Math.floor(main.length * (0.15 + Math.random() * 0.45));
    const from = main[i];
    const reach = height * (0.18 + Math.random() * 0.2);
    const end = from.clone().add(new THREE.Vector3((Math.random() - 0.5) * reach, -reach * (0.6 + Math.random() * 0.4), (Math.random() - 0.5) * reach));
    paths.push({ points: jagged(from, end, 4, 0.2), width: width * 0.45 });
  }
  return paths;
}

/**
 * Lightning strikes `to`. `seconds` on the game's clock; `height` is how far up in the clouds it starts; `width` the
 * bolt's thickness in metres (a bolt seen from 40 m wants about 0.4).
 */
export function bolt(to: THREE.Vector3, options: { seconds?: number; width?: number; height?: number; branches?: number } = {}): void {
  const { seconds = 0.34, width = 0.36, height = 60, branches = 2 } = options;
  const sm = SceneManager.getInstance();
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(3.2, 3.5, 4.2),
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(ribbon(strikePaths(to, height, width, branches), sm.camera.position), material);
  mesh.name = 'LightningBolt';
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  sm.scene.add(mesh);
  sm.postFX.addBloom(mesh);
  let gone = false;
  const remove = () => {
    if (gone) return;
    gone = true;
    sm.postFX.removeBloom(mesh);
    mesh.removeFromParent();
    mesh.geometry.dispose();
    material.dispose();
  };
  let t = 0;
  let restruck = false;
  SceneFX.every((dt) => {
    if (gone) return false;
    t += dt;
    const k = t / seconds;
    // Flicker: full, a dip, then the re-strike along a fresh path, then the fade.
    if (k >= 0.42 && !restruck) {
      restruck = true;
      mesh.geometry.dispose();
      mesh.geometry = ribbon(strikePaths(to, height, width * 0.85, branches), sm.camera.position);
    }
    const flicker = k < 0.22 ? 1 : k < 0.3 ? 0.3 : k < 0.42 ? 0.9 : k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
    material.opacity = Math.max(0, flicker);
    if (k >= 1) {
      remove();
      return false;
    }
    return true;
  });
  SceneFX.onClear(remove);
}

/**
 * Lightning crawling over a body (the concept's knight rising with the storm on his armour): short jagged arcs leaping
 * between nearby points of `points()` (his bones, read each time so they follow him), a few at a time, re-rolled
 * `rate` times a second of game time, for `seconds`; thin and bright enough to bloom. Slow motion holds them crawling.
 */
export function crawl(points: () => THREE.Vector3[], seconds: number, options: { width?: number; rate?: number; arcs?: number; reach?: number; color?: THREE.Color } = {}): void {
  const { width = 0.05, rate = 22, arcs = 4, reach = 0.95, color = new THREE.Color(2.6, 3.0, 4.2) } = options;
  const sm = SceneManager.getInstance();
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  mesh.name = 'LightningCrawl';
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  sm.scene.add(mesh);
  sm.postFX.addBloom(mesh);
  let gone = false;
  const remove = () => {
    if (gone) return;
    gone = true;
    sm.postFX.removeBloom(mesh);
    mesh.removeFromParent();
    mesh.geometry.dispose();
    material.dispose();
  };
  const reroll = () => {
    const pts = points();
    const paths: { points: THREE.Vector3[]; width: number }[] = [];
    for (let n = 0; n < arcs && pts.length > 1; n++) {
      const a = pts[Math.floor(Math.random() * pts.length)];
      // A partner within reach, else a short spark off into the air.
      const near = pts.filter((p) => p !== a && p.distanceTo(a) < reach && p.distanceTo(a) > 0.15);
      const b = near.length
        ? near[Math.floor(Math.random() * near.length)]
        : a.clone().add(new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5).multiplyScalar(0.7));
      paths.push({ points: jagged(a, b, 4, 0.3), width: width * (0.6 + Math.random() * 0.8) });
    }
    mesh.geometry.dispose();
    mesh.geometry = ribbon(paths, sm.camera.position);
  };
  let t = 0;
  let next = 0;
  SceneFX.every((dt) => {
    if (gone) return false;
    t += dt;
    if (t >= next) {
      next = t + 1 / rate;
      reroll();
    }
    // Flickering, and dying away over the last third.
    const fade = t > seconds * 0.66 ? Math.max(0, 1 - (t - seconds * 0.66) / (seconds * 0.34)) : 1;
    material.opacity = fade * (0.55 + Math.random() * 0.45);
    if (t >= seconds) {
      remove();
      return false;
    }
    return true;
  });
  SceneFX.onClear(remove);
}

/** The world positions of a character's bones (for `crawl`): every bone of its rig, read now. */
export function bonesOf(root: THREE.Object3D | undefined): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  root?.traverse((o) => {
    if ((o as THREE.Bone).isBone && !/finger|thumb|index|middle|ring|pinky|toe_end|end$/i.test(o.name)) out.push(o.getWorldPosition(new THREE.Vector3()));
  });
  return out;
}

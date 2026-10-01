import * as THREE from 'three';

/** Outline of the playable fighting area on the ground plane (x, z), level coordinates. */
export type ArenaShape =
  | { kind: 'rect'; center: [number, number]; halfExtents: [number, number] }
  | { kind: 'circle'; center: [number, number]; radius: number; segments?: number }
  | { kind: 'polygon'; points: [number, number][] };

export interface ArenaBoundsSpec {
  shape: ArenaShape;
  /** Bottom of the walls: at or below the lowest walkable surface inside (pools, pits). */
  floorY: number;
  /** Wall height above `floorY`; tall enough that nothing walkable inside rises over it. */
  height: number;
  /** Wall thickness, metres (default 1). Walls sit outside the outline. */
  thickness?: number;
}

/** Static box collider request: centre, half extents, yaw about +Y (radians). */
export type WallBox = { center: THREE.Vector3; halfExtents: THREE.Vector3; rotation: THREE.Quaternion };

/**
 * Invisible walls that keep fighters inside a level's arena, plus a point test for AI and the camera.
 * Walls are emitted per outline edge with their inner face exactly on the outline, so the playable area is
 * the outline itself; corners are covered by extending each wall by the thickness.
 */
export class ArenaBounds {
  public readonly outline: THREE.Vector2[];

  constructor(public readonly spec: ArenaBoundsSpec) {
    this.outline = outlineOf(spec.shape);
  }

  public walls(): WallBox[] {
    const t = this.spec.thickness ?? 1;
    const halfH = this.spec.height / 2;
    const cy = this.spec.floorY + halfH;
    const out: WallBox[] = [];
    const n = this.outline.length;
    for (let i = 0; i < n; i++) {
      const a = this.outline[i];
      const b = this.outline[(i + 1) % n];
      const edge = new THREE.Vector2().subVectors(b, a);
      const len = edge.length();
      if (len < 1e-3) continue;
      const dir = edge.clone().divideScalar(len);
      // Outward normal: of the two perpendiculars, the one whose side is outside the outline.
      let normal = new THREE.Vector2(dir.y, -dir.x);
      const mid = new THREE.Vector2().addVectors(a, b).multiplyScalar(0.5);
      if (this.contains(mid.x + normal.x * 0.05, mid.y + normal.y * 0.05)) normal = normal.negate();
      const centre = mid.clone().addScaledVector(normal, t / 2);
      out.push({
        center: new THREE.Vector3(centre.x, cy, centre.y),
        halfExtents: new THREE.Vector3(len / 2 + t, halfH, t / 2),
        // Box local +X along the edge: a yaw that maps (1,0,0) to (dir.x, 0, dir.y).
        rotation: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-dir.y, dir.x)),
      });
    }
    return out;
  }

  /** True if ground point (x, z) is inside the arena outline. */
  public contains(x: number, z: number): boolean {
    let inside = false;
    const pts = this.outline;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i];
      const b = pts[j];
      if ((a.y > z) !== (b.y > z) && x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }

  /** Clamps (x, z) of `point` to lie inside the outline (nearest point on the boundary when outside). */
  public clamp(point: THREE.Vector3): THREE.Vector3 {
    if (this.contains(point.x, point.z)) return point;
    let best = new THREE.Vector2();
    let bestD = Infinity;
    const p = new THREE.Vector2(point.x, point.z);
    const pts = this.outline;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const ab = new THREE.Vector2().subVectors(b, a);
      const t = THREE.MathUtils.clamp(new THREE.Vector2().subVectors(p, a).dot(ab) / Math.max(ab.lengthSq(), 1e-9), 0, 1);
      const q = a.clone().addScaledVector(ab, t);
      const d = q.distanceToSquared(p);
      if (d < bestD) { bestD = d; best = q; }
    }
    return point.set(best.x, point.y, best.y);
  }

  /** Outline drawn at the wall base and top, for tuning; hidden by default. */
  public createDebugMesh(): THREE.LineSegments {
    const verts: number[] = [];
    const lo = this.spec.floorY + 0.05;
    const hi = this.spec.floorY + this.spec.height;
    for (let i = 0; i < this.outline.length; i++) {
      const a = this.outline[i];
      const b = this.outline[(i + 1) % this.outline.length];
      verts.push(a.x, lo, a.y, b.x, lo, b.y, a.x, hi, a.y, b.x, hi, b.y, a.x, lo, a.y, a.x, hi, a.y);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xff3355, depthTest: false, fog: false }));
    lines.name = 'ArenaBoundsDebug';
    lines.renderOrder = 999;
    lines.visible = false;
    return lines;
  }
}

function outlineOf(shape: ArenaShape): THREE.Vector2[] {
  switch (shape.kind) {
    case 'rect': {
      const [cx, cz] = shape.center;
      const [hx, hz] = shape.halfExtents;
      return [new THREE.Vector2(cx - hx, cz - hz), new THREE.Vector2(cx + hx, cz - hz), new THREE.Vector2(cx + hx, cz + hz), new THREE.Vector2(cx - hx, cz + hz)];
    }
    case 'circle': {
      const n = shape.segments ?? 24;
      return Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return new THREE.Vector2(shape.center[0] + Math.cos(a) * shape.radius, shape.center[1] + Math.sin(a) * shape.radius);
      });
    }
    case 'polygon':
      return shape.points.map(([x, z]) => new THREE.Vector2(x, z));
  }
}

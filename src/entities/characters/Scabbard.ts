import * as THREE from 'three';

/*
 * Scabbards built in code for the hero's stowable blades (docs/STORY.md, "The scabbard"): wood under dark leather,
 * a brass throat at the mouth and a brass chape at the tip, two leather bands between. Plain colours and few
 * polygons, so the cel ramp and the ink lines do the rest, as on the other props.
 *
 * Each is measured on its own blade, in the blade's frame (the weapon convention of game asset/characters/
 * prepare_weapon.py: blade up +Y, its breadth along X, its flats facing +-Z), so the scabbard and the stowed blade
 * share one hold and the blade sits inside it with only the hilt showing.
 */

/** One cross-section of the scabbard: up the blade (y) and its breadth there (x from, x to), with the margin in. */
export type ScabbardStation = [y: number, xFrom: number, xTo: number];

export interface ScabbardShape {
  /** From the mouth (just past the guard) to where the chape begins; the breadth may drift to follow a curved blade. */
  stations: ScabbardStation[];
  /** Where the chape ends in a point (y), and the point's x. */
  tip: [y: number, x: number];
  /** Half the scabbard's thickness at the mouth and at the chape (it tapers between). */
  thickness: [mouth: number, chape: number];
  /**
   * The locket below the throat (from, to, how far proud of the leather): a squarer brass band where a hanger would be
   * tied, and room for whatever stands off the blade's spine there (the basic sword's spine tab).
   */
  locket: [y0: number, y1: number, grow: number];
}

const SIDES = 20;
/** Under 1 the cross-section's flats and edges square off a little: leather over a broad blade, not a tube. */
const SQUARENESS = 0.8;
/** The locket's: much squarer, a metal band. */
const LOCKET_SQUARENESS = 0.3;
const THROAT = 0.055;
const BAND = 0.024;

// Dark and only a little warm: under the summit's dawn and the akhada's sunset a lighter brown went orange.
const leather = () => new THREE.MeshStandardMaterial({ name: 'Scabbard_Leather', color: 0x45291a, roughness: 0.85, metalness: 0 });
const strap = () => new THREE.MeshStandardMaterial({ name: 'Scabbard_Band', color: 0x22140c, roughness: 0.9, metalness: 0 });
const brass = () => new THREE.MeshStandardMaterial({ name: 'Scabbard_Brass', color: 0xa8843e, roughness: 0.35, metalness: 0.6 });

/** The scabbard's section at `y`: centre x, half breadth, half thickness (linear between stations). */
function section(shape: ScabbardShape, y: number): { cx: number; a: number; b: number } {
  const s = shape.stations;
  let i = 0;
  while (i < s.length - 2 && y > s[i + 1][0]) i++;
  const [y0, f0, t0] = s[i];
  const [y1, f1, t1] = s[i + 1];
  const k = THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1);
  const from = f0 + (f1 - f0) * k;
  const to = t0 + (t1 - t0) * k;
  const along = THREE.MathUtils.clamp((y - s[0][0]) / (s[s.length - 1][0] - s[0][0]), 0, 1);
  return { cx: (from + to) / 2, a: (to - from) / 2, b: shape.thickness[0] + (shape.thickness[1] - shape.thickness[0]) * along };
}

/**
 * A closed tube through rings (centre x, half breadth a, half thickness b at height y), capped at both ends: one ring
 * of a flattened, slightly squared ellipse per entry (`squareness` 1 is an ellipse, toward 0 a rectangle).
 */
function loft(rings: { y: number; cx: number; a: number; b: number }[], squareness = SQUARENESS): THREE.BufferGeometry {
  const positions: number[] = [];
  const index: number[] = [];
  const shaped = (c: number) => Math.sign(c) * Math.abs(c) ** squareness;
  for (const r of rings) {
    for (let i = 0; i < SIDES; i++) {
      const t = (i / SIDES) * Math.PI * 2;
      positions.push(r.cx + r.a * shaped(Math.cos(t)), r.y, r.b * shaped(Math.sin(t)));
    }
  }
  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < SIDES; i++) {
      const a = j * SIDES + i;
      const b = j * SIDES + ((i + 1) % SIDES);
      const c = a + SIDES;
      const d = b + SIDES;
      index.push(a, c, b, b, c, d);
    }
  }
  // Caps: a fan about each end ring's centre, facing down at the first ring and up at the last.
  for (const [ring, flip] of [[0, false], [rings.length - 1, true]] as const) {
    const centre = positions.length / 3;
    positions.push(rings[ring].cx, rings[ring].y, 0);
    for (let i = 0; i < SIDES; i++) {
      const a = ring * SIDES + i;
      const b = ring * SIDES + ((i + 1) % SIDES);
      if (flip) index.push(centre, b, a);
      else index.push(centre, a, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** A sleeve round the scabbard from `y0` to `y1`, `grow` metres proud of it (the throat, the locket, the bands). */
function sleeve(shape: ScabbardShape, y0: number, y1: number, grow: number, squareness = SQUARENESS): THREE.BufferGeometry {
  const ring = (y: number) => {
    const s = section(shape, y);
    return { y, cx: s.cx, a: s.a + grow, b: s.b + grow };
  };
  return loft([ring(y0), ring((y0 + y1) / 2), ring(y1)], squareness);
}

/** The scabbard for one blade: a Group in the blade's frame (see the file comment). */
export function buildScabbard(shape: ScabbardShape): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Scabbard';
  const mouth = shape.stations[0][0];
  const chapeFrom = shape.stations[shape.stations.length - 1][0];
  const [tipY, tipX] = shape.tip;
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // The body: wood under leather, from the mouth to the chape, one ring every few centimetres so a curved blade's
  // scabbard bends with it.
  const body: { y: number; cx: number; a: number; b: number }[] = [];
  const steps = Math.max(2, Math.ceil((chapeFrom - mouth) / 0.06));
  for (let i = 0; i <= steps; i++) {
    const y = mouth + ((chapeFrom - mouth) * i) / steps;
    body.push({ y, ...section(shape, y) });
  }
  add(loft(body), leather());

  // Brass at the mouth (the throat, with a lip) and the locket below it; two leather bands further down.
  const metal = brass();
  add(sleeve(shape, mouth - 0.004, mouth + THROAT, 0.004), metal);
  add(sleeve(shape, mouth - 0.004, mouth + 0.012, 0.008), metal);
  const [lockFrom, lockTo, lockGrow] = shape.locket;
  add(sleeve(shape, lockFrom, lockTo, lockGrow, LOCKET_SQUARENESS), metal);
  const bands = strap();
  for (const k of [0.55, 0.78]) {
    const y = mouth + (chapeFrom - mouth) * k;
    add(sleeve(shape, y, y + BAND, 0.003), bands);
  }

  // The chape: brass from the end of the leather to a rounded point, and a small knob on it.
  const end = section(shape, chapeFrom);
  const chape: { y: number; cx: number; a: number; b: number }[] = [];
  for (let i = 0; i <= 6; i++) {
    const k = i / 6;
    // Full width for its first part, then closing fast to the point: a cap, not a cone.
    const close = 1 - Math.max(0, (k - 0.35) / 0.65) ** 1.6;
    chape.push({
      y: chapeFrom - 0.004 + (tipY - chapeFrom + 0.004) * k,
      cx: end.cx + (tipX - end.cx) * k,
      a: Math.max(0.006, (end.a + 0.003) * close),
      b: Math.max(0.006, (end.b + 0.003) * close),
    });
  }
  add(loft(chape), metal);
  const knob = add(new THREE.SphereGeometry(0.011, 10, 8), metal);
  knob.position.set(tipX, tipY + 0.004, 0);
  // Where it ends, for keeping that off the ground (Character: a kneel swings it up about the hilt).
  group.userData.tip = new THREE.Vector3(tipX, tipY + 0.015, 0);
  return group;
}

/*
 * The two shapes were fitted to their blades' meshes (every vertex, edge midpoint and face centre of the blade lies
 * inside the scabbard's cross-section: at most 0.96 and 0.99 of the way to its surface).
 */

/** The magical khanda's (`yodha_khanda.glb`): a straight broad blade, ~0.12 m across, from its guard at ~0.21. */
export const KHANDA_SCABBARD: ScabbardShape = {
  stations: [
    [0.22, -0.052, 0.092],
    [0.45, -0.046, 0.084],
    [0.66, -0.048, 0.082],
    [0.76, -0.04, 0.066],
  ],
  tip: [0.925, 0.008],
  thickness: [0.03, 0.026],
  locket: [0.3, 0.4, 0.01],
};

/**
 * The basic sword's (the Vetala's notched blade, `vetala_sword_r.glb`): broad and curving, its notched edge out to
 * 0.16 at the middle, from its guard collar at 0.32; the tab standing off its spine at ~0.47 goes in the locket.
 */
export const SWORD_SCABBARD: ScabbardShape = {
  stations: [
    [0.33, -0.05, 0.112],
    [0.46, -0.044, 0.135],
    [0.6, -0.02, 0.16],
    [0.76, -0.008, 0.18],
    [0.88, -0.014, 0.172],
    [0.95, -0.01, 0.138],
  ],
  tip: [1.05, 0.022],
  thickness: [0.031, 0.026],
  locket: [0.41, 0.53, 0.012],
};

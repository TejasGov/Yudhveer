import * as THREE from 'three';
import type { CameraKey } from '../cinematics/CinematicDirector';
import type { CastMember, SceneCue, Stage } from '../cinematics/Scene';
import type { CharacterDefinition } from '../entities/animation/CharacterRig';

/*
 * Helpers shared by the chapters' story scenes (docs/STORY.md); the scenes themselves are in game/stories/, one file
 * per chapter, and each chapter names its own in `Chapter.story`.
 * Lines marked draft in STORY.md are placeholders until the chapter's own milestone writes them properly.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * Framing for two people facing each other: the line from `a` to `b`, the side of it the camera stands on (toward
 * `centre`, the open middle of the arena, so it stays clear of walls), and the point between them.
 */
export function twoShot(s: Stage, a: string, b: string, centre: THREE.Vector3) {
  const pa = s.pos(a);
  const pb = s.pos(b);
  const dir = pb.clone().sub(pa).setY(0);
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
  dir.normalize();
  const mid = pa.clone().lerp(pb, 0.5);
  const side = v(dir.z, 0, -dir.x);
  if (mid.clone().add(side).distanceTo(centre) > mid.clone().sub(side).distanceTo(centre)) side.negate();
  return { pa, pb, dir, side, mid };
}
// ---------------------------------------------------------------------------------------------- The dead speak

/*
 * A fallen character's last words come from its shade (docs/STORY.md, "How the dead speak"): a pale blue spirit that
 * rises out of the body and stands over it, turned to the hero. The cameras frame the shade's face and the hero, never
 * the body speaking: it lies below the frame (or is only a dark shape in the wide shots before the shade rises).
 */

/** The cold blue of a shade. */
export const SHADE_BLUE = 0x5c96ff;

/** The id of a fallen fighter's shade in the story's cast. */
export const shade = (fallen: string) => `${fallen}_shade`;

/** A fallen fighter's shade, for a story's cast: its model without weapons, out of sight until it rises. */
export function shadeOf(fallen: string, rig: CharacterDefinition): CastMember {
  return { id: shade(fallen), rig: { ...rig, weapon: undefined, offhand: undefined }, at: v(0, 0, 0), hidden: true, shade: { color: SHADE_BLUE } };
}

/**
 * Where a fallen one's shade stands: over the body, between where its feet and its head lie, but never nearer the
 * hero than half a metre beyond the body's feet, so whatever way it fell the shade stands clear of him.
 */
export function shadeMark(s: Stage, fallen: string): THREE.Vector3 {
  const feet = s.pos(fallen);
  const mid = s.head(fallen).setY(feet.y).sub(feet).multiplyScalar(0.5);
  const away = feet.clone().sub(s.pos('hero')).setY(0);
  if (away.lengthSq() < 1e-6) away.set(0, 0, 1);
  away.normalize();
  const along = mid.dot(away);
  const across = mid.clone().addScaledVector(away, -along).clampLength(0, 0.8);
  return feet.addScaledVector(away, Math.max(along, 0.5)).add(across);
}

/**
 * The shade comes up out of the body, turned to the hero: put on its mark at once (unseen), then rising at `at`
 * seconds into the shot over `over`. List it after any cue that places the hero.
 */
export function shadeRises(fallen: string, at: number, over = 1.6): SceneCue[] {
  return [
    { at: 0, actor: shade(fallen), place: (s) => shadeMark(s, fallen), face: 'hero' },
    { at, actor: shade(fallen), appear: true, over },
  ];
}

/**
 * Framings for a shade speaking with the hero, from where they stand now; `side` is the side of the line between them
 * the camera keeps to. Each keeps the ground where the body lies out of the frame.
 */
export function shadeShots(s: Stage, id: string, side: THREE.Vector3) {
  const hero = s.pos('hero');
  const at = s.pos(id);
  const dir = at.clone().sub(hero).setY(0);
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
  dir.normalize();
  const face = s.head(id);
  const heroHead = s.head('hero');
  // Distances for a shade of Shalva's 2.6 m; the Guardian's 3.2 m is framed from further off.
  const k = Math.max(1, s.height(id) / 2.6);
  return {
    /** Over the hero's shoulder, up at the shade's face. */
    overHero: (): CameraKey[] => {
      const pos = hero.clone().addScaledVector(dir, -1.5 * k * k).addScaledVector(side, 0.65 * k).setY(heroHead.y + 0.15);
      return [
        { pos, look: face, fov: 40 },
        { pos: pos.clone().addScaledVector(dir, 0.25), look: face, fov: 37 },
      ];
    },
    /**
     * Close on the shade's face, three-quarters on from the hero's side of it, level with it (`near`: metres nearer,
     * for the last of its words).
     */
    close: (near = 0): CameraKey[] => {
      const from = (d: number) => {
        const r = (3.3 - near - d) * k;
        return face.clone().addScaledVector(dir, -0.75 * r).addScaledVector(side, 0.66 * r).add(v(0, -0.06, 0));
      };
      const look = face.clone().add(v(0, -0.1 * k, 0));
      return [
        { pos: from(0), look, fov: 32 },
        { pos: from(0.3), look, fov: 30 },
      ];
    },
    /** Over the shade's shoulder, down at the hero. */
    overShade: (): CameraKey[] => {
      const pos = at.clone().addScaledVector(dir, 1.15 * k).addScaledVector(side, 0.95 * k).setY(face.y - 0.25 * k);
      return [
        { pos, look: heroHead, fov: 38 },
        { pos: pos.clone().addScaledVector(dir, -0.15), look: heroHead, fov: 36 },
      ];
    },
    /** Side on to the two of them, level with the hero's chest: the shade at full height, the ground below the frame. */
    side: (): CameraKey[] => {
      const mid = hero.clone().lerp(at, 0.5);
      const look = mid.clone().setY((heroHead.y + face.y) / 2 - 0.15);
      const pos = (d: number) => mid.clone().addScaledVector(side, d * k).setY(look.y - 0.1);
      return [
        { pos: pos(4.8), look, fov: 44 },
        { pos: pos(4.4), look, fov: 42 },
      ];
    },
  };
}

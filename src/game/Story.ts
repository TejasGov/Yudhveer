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
 * A fallen character's last words (docs/STORY.md, "How the dead speak"). They used to come from a shade, a pale blue
 * spirit rising out of the body, the same for everyone; the user found it weird and samey (2026-10-07). Now each one
 * speaks from its own body, in its own way, and goes in its own way (the Baoli Guardian kneels and turns back to stone,
 * Shalva will not go down and the sea takes him, Takshaka burns away in naga fire): the stories stage that. The
 * framings below were made for the shades and still serve: they frame whoever is named, where its head is now.
 */

/** Who speaks a fallen fighter's last words: the fighter itself (the name kept from when a shade did). */
export const shade = (fallen: string) => fallen;

/**
 * The fallen one turns its head to the hero as the scene begins (it no longer rises as a shade): a cue list, kept
 * so the scenes read as they did. `at` and `over` are unused.
 */
export function shadeRises(fallen: string, _at = 0, _over = 0): SceneCue[] {
  return [{ at: 0.2, actor: fallen, face: 'hero' }];
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

/**
 * Framings for a fallen one's shade speaking with the hero, staged as a conversation rather than a row of level,
 * centred frames (Dwarka's two shades; docs/STORY.md, "How the dead speak"). Every camera keeps to `side` of the line
 * between them (no crossed eyelines), most stand low and look up so the shade stands against the sky and the ground
 * where the body lies falls below the frame, and each one pushes in slowly. Faces sit in the upper part of the frame,
 * clear of the subtitles. Distances are for a shade of Shalva's 2.6 m (larger ones are framed from further off);
 * `headroom`: metres the figure rises above its head bone (Takshaka's hood), kept in frame.
 */
export function shadeConversation(s: Stage, fallen: string, side: THREE.Vector3, headroom = 0) {
  const id = shade(fallen);
  const hero = s.pos('hero');
  const at = s.pos(id);
  const dir = at.clone().sub(hero).setY(0);
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
  dir.normalize();
  const face = s.head(id);
  const heroHead = s.head('hero');
  const floor = hero.y;
  const k = Math.max(1, s.height(id) / 2.6);
  /** Where the camera aims for the shade's face, raised to keep a tall crest or hood in frame. */
  const top = face.clone().add(v(0, headroom * 0.6, 0));
  /** Metres further off for the same. */
  const back = 1 + headroom * 0.5;
  /** A point `along` the line from the hero toward the shade, `across` toward `side`, at height `y`. */
  const p = (from: THREE.Vector3, along: number, across: number, y: number) =>
    from.clone().addScaledVector(dir, along).addScaledVector(side, across).setY(y);
  return {
    /**
     * The hero from in front of him and a little to `side`, at his eye height, the fallen one behind the camera: his
     * face as he watches it fall. `hero` and `body` are passed in: he is put on his mark as the shot begins.
     */
    watching: (heroAt: THREE.Vector3, body: THREE.Vector3): CameraKey[] => {
      const toBody = body.clone().sub(heroAt).setY(0).normalize();
      const head = heroAt.clone().setY(heroAt.y + s.height('hero') * 0.92);
      const at = (ahead: number, across: number, up: number) => heroAt.clone().addScaledVector(toBody, ahead).addScaledVector(side, across).setY(head.y + up);
      const look = head.clone().addScaledVector(side, 0.1).add(v(0, -0.08, 0));
      return [
        { pos: at(1.45, 0.75, -0.05), look, fov: 34 },
        { pos: at(1.25, 0.65, -0.04), look, fov: 32 },
      ];
    },
    /**
     * Low beside the hero's way in, looking up past him to where the shade rises over the body: he walks into the
     * frame and the camera eases in after him, tilting up as the shade comes up against the storm. (The body lies
     * below the frame's lower edge.) `body` and `mark` (where he will stop) are passed in: the shade is not up yet.
     */
    rise: (body: THREE.Vector3, mark: THREE.Vector3): CameraKey[] => {
      const toBody = body.clone().sub(mark).setY(0).normalize();
      const spot = (back: number, across: number, y: number) => mark.clone().addScaledVector(toBody, -back).addScaledVector(side, across * k).setY(floor + y);
      const over = body.clone().addScaledVector(toBody, 0.5).setY(floor);
      return [
        { pos: spot(2.2 * k, 1.35, 0.75), look: over.clone().setY(floor + 1.9 * k), fov: 42 },
        { pos: spot(1.75 * k, 1.0, 0.72), look: over.clone().setY(floor + 2.3 * k), fov: 38 },
      ];
    },
    /** Low on the hero's side of it, up at the shade alone against the sky (the hero just out of frame). */
    lowSingle: (): CameraKey[] => {
      const look = top.clone().addScaledVector(side, -0.25 * k).add(v(0, -0.2 * k, 0));
      return [
        { pos: p(at, -2.7 * k * back, 1.35 * k * back, floor + 1.0), look, fov: 36 },
        { pos: p(at, -2.3 * k * back, 1.15 * k * back, floor + 1.05), look, fov: 33 },
      ];
    },
    /**
     * Over the hero's shoulder from his eye height, so the camera looks up at the shade as he does: his shoulder and
     * head soft at one edge, the shade on the far third.
     */
    overHero: (): CameraKey[] => {
      const look = top.clone().addScaledVector(side, -0.55 * k).add(v(0, -0.25 * k, 0));
      return [
        { pos: p(hero, -1.3 * k, 0.75 * k, heroHead.y + 0.02), look, fov: 38 },
        { pos: p(hero, -1.0 * k, 0.68 * k, heroHead.y + 0.04), look, fov: 35 },
      ];
    },
    /**
     * The reverse: from beside the shade's shoulder, a little below its eyes, down at the hero looking up at it, on a
     * long lens (the shade itself just out of frame); the hero on the near third.
     */
    reverse: (): CameraKey[] => {
      const look = heroHead.clone().addScaledVector(side, -0.25).add(v(0, -0.08, 0));
      const y = face.y - 0.25 * k;
      return [
        { pos: p(at, 0.35 * k, 1.65 * k, y), look, fov: 30 },
        { pos: p(at, 0.1 * k, 1.5 * k, y - 0.05), look, fov: 28 },
      ];
    },
    /** The hero alone, a little above his eyes from the shade's side, a slow push in: his reaction. */
    heroSingle: (): CameraKey[] => {
      const look = heroHead.clone().addScaledVector(side, 0.12).add(v(0, 0.04, 0));
      return [
        { pos: p(hero, 1.55, 0.95, heroHead.y + 0.14), look, fov: 30 },
        { pos: p(hero, 1.3, 0.8, heroHead.y + 0.12), look, fov: 28 },
      ];
    },
    /** Close on the shade, three-quarters on and from below its eyes, against the sky; `near`: metres nearer. */
    lowClose: (near = 0): CameraKey[] => {
      const from = (r: number) => face.clone().addScaledVector(dir, -0.72 * r * k).addScaledVector(side, 0.7 * r * k).add(v(0, -0.6 * k, 0));
      // (A crest needs less room this close: the face stays clear of the subtitles.)
      const look = face.clone().addScaledVector(side, -0.2 * k).add(v(0, -0.04 * k + headroom * 0.15, 0));
      return [
        { pos: from((2.6 - near) * back), look, fov: 30 },
        { pos: from((2.25 - near) * back), look, fov: 28 },
      ];
    },
    /**
     * The two of them from low behind the boy, on a longer lens than the rise: his back on the near third, the shade
     * towering over him against the sky, the camera creeping in (the ground between them below the frame).
     */
    twoShot: (): CameraKey[] => {
      const look = at.clone().setY(floor + 2.05 * k);
      return [
        { pos: p(hero, -2.7 * k, 1.3 * k, floor + 0.7), look, fov: 34 },
        { pos: p(hero, -2.35 * k, 1.15 * k, floor + 0.72), look, fov: 33 },
      ];
    },
  };
}

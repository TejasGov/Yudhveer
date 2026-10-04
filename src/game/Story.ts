import * as THREE from 'three';
import { ease, type CameraKey } from '../cinematics/CinematicDirector';
import type { ChapterStory, Stage } from '../cinematics/Scene';

/*
 * The chapters' story scenes and in-fight lines (docs/STORY.md). Each chapter names its own in `Chapter.story`.
 * Lines marked draft in STORY.md are placeholders until the chapter's own milestone writes them properly.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * Framing for two people facing each other: the line from `a` to `b`, the side of it the camera stands on (toward
 * `centre`, the open middle of the arena, so it stays clear of walls), and the point between them.
 */
function twoShot(s: Stage, a: string, b: string, centre: THREE.Vector3) {
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

/** The akhada's open middle, and the south gateway the hero leaves by. */
const AKHADA_CENTRE = v(0, 0, -4);
const AKHADA_GATE = v(0, 0, 40);

/**
 * Chapter II ends (draft): the fallen Mayavi tells the hero where his road goes next, to Dwarka, and that its master
 * fights with a mace (STORY.md, Chapter II).
 */
export const AKHADA_STORY: ChapterStory = {
  ending: {
    id: 'akhada-ending',
    shots: [
      // From black: wide on the two of them, the hero walking up to where the sorcerer lies.
      {
        duration: 3.6,
        fadeIn: 0.9,
        ease: ease.drift,
        cues: [
          // Off camera, while the screen is black: a few steps away from Mayavi, facing him.
          { at: 0, actor: 'hero', place: (s) => s.toward('mayavi', 'hero', Math.min(4, s.pos('mayavi').distanceTo(s.pos('hero')))), face: 'mayavi' },
          { at: 0.5, actor: 'hero', moveTo: (s) => s.toward('mayavi', 'hero', 1.7), face: 'mayavi' },
        ],
        camera: (s): CameraKey[] => {
          const { side, mid, dir } = twoShot(s, 'hero', 'mayavi', AKHADA_CENTRE);
          return [
            { pos: mid.clone().addScaledVector(side, 6).add(v(0, 2.2, 0)).addScaledVector(dir, -0.8), look: mid.clone().add(v(0, 0.7, 0)), fov: 40 },
            { pos: mid.clone().addScaledVector(side, 5.2).add(v(0, 1.8, 0)), look: mid.clone().add(v(0, 0.7, 0)), fov: 38 },
          ];
        },
      },
      // High over the hero's shoulder (above his raised blade), down at the sorcerer.
      {
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.015,
        lines: [{ speaker: 'Mayavi', text: 'A village boy, with a borrowed sword.', voice: 'akhada_end_mayavi_1' }],
        camera: (s): CameraKey[] => {
          const { pa, pb, dir, side } = twoShot(s, 'hero', 'mayavi', AKHADA_CENTRE);
          const look = s.head('mayavi').lerp(pb.clone().add(v(0, 0.3, 0)), 0.5);
          return [
            { pos: pa.clone().addScaledVector(dir, -1.5).addScaledVector(side, 1.3).add(v(0, 2.4, 0)), look, fov: 38 },
            { pos: pa.clone().addScaledVector(dir, -1.2).addScaledVector(side, 1.2).add(v(0, 2.25, 0)), look, fov: 35 },
          ];
        },
      },
      // Low beside Mayavi, up at the hero.
      {
        fadeIn: 0.12,
        ease: ease.out,
        sway: 0.015,
        lines: [{ speaker: 'Yudhveer', text: 'Where did they take my guru?', voice: 'akhada_end_yudhveer_1' }],
        camera: (s): CameraKey[] => {
          const { pa, pb, dir } = twoShot(s, 'hero', 'mayavi', AKHADA_CENTRE);
          // On his sword side, so the dhal on his left arm does not hide his face.
          const right = v(-dir.z, 0, dir.x);
          const look = s.head('hero');
          return [
            { pos: pb.clone().addScaledVector(dir, -0.4).addScaledVector(right, 1.3).add(v(0, 0.8, 0)), look, fov: 38 },
            { pos: pb.clone().addScaledVector(dir, -0.55).addScaledVector(right, 1.15).add(v(0, 0.85, 0)), look, fov: 36 },
          ];
        },
      },
      // Back on Mayavi, closer, for the last of it.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.012,
        lines: [{
          speaker: 'Mayavi',
          text: 'Go to Dwarka, if you want to know why your village burned. Shalva holds it now, and his mace has broken better blades than yours.',
          voice: 'akhada_end_mayavi_2',
        }],
        camera: (s): CameraKey[] => {
          // From beside him, across from the hero.
          const { pb, dir, side } = twoShot(s, 'hero', 'mayavi', AKHADA_CENTRE);
          const head = s.head('mayavi');
          const look = head.clone().lerp(pb.clone().add(v(0, 0.3, 0)), 0.25);
          return [
            { pos: head.clone().addScaledVector(side, 1.9).addScaledVector(dir, 0.4).add(v(0, 1.1, 0)), look, fov: 34 },
            { pos: head.clone().addScaledVector(side, 1.55).addScaledVector(dir, 0.3).add(v(0, 0.9, 0)), look, fov: 32 },
          ];
        },
      },
      // He turns toward the gateway; the camera rises away from him and the picture fades.
      {
        duration: 4.2,
        fadeIn: 0.2,
        fadeOut: 1.4,
        ease: ease.drift,
        cues: [{ at: 0.4, actor: 'hero', face: AKHADA_GATE }],
        camera: (s): CameraKey[] => {
          const h = s.pos('hero');
          const toGate = AKHADA_GATE.clone().sub(h).setY(0).normalize();
          const look = h.clone().addScaledVector(toGate, 2.5).add(v(0, 0.9, 0));
          return [
            { pos: h.clone().addScaledVector(toGate, -3).add(v(0.8, 2, 0)), look, fov: 44 },
            { pos: h.clone().addScaledVector(toGate, -5.5).add(v(1.2, 4.2, 0)), look, fov: 46 },
          ];
        },
      },
    ],
  },
};

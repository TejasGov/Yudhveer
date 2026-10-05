import * as THREE from 'three';
import { ease, type CameraKey } from '../../cinematics/CinematicDirector';
import type { ChapterStory, Stage } from '../../cinematics/Scene';
import { Enemy } from '../../entities/Enemy';
import { GURU } from '../../entities/characters/Village';
import { twoShot } from '../Story';

/*
 * Chapter I, the moonlit baoli (STORY.md, "Chapter I" and "Milestone 5"). The raiders took the guru down through the
 * old stepwell; Andhaka's darkness has bound its Guardian to stop anyone who follows. The boy has only his lathi and
 * what he remembers of his lessons: the guru's voice comes back to him as the fight asks for it, and teaches him the
 * gathered blow.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * The island's open middle; where the boy comes in on the raiders' trail (the south side, beside the deepastambha
 * that stands on the axis at z 11.8: straight behind it he walked into its collider, stepping on the spot), and where
 * he stops.
 */
const BAOLI_CENTRE = v(0, 0, 0);
const BAOLI_ENTRY = v(1.5, 0, 12.5);
const BAOLI_STAND = v(0, 0, 4.5);

/** Whether the Guardian is in one of these states now. */
const bossIn = (s: Stage, ...states: string[]) => states.includes(s.actor('boss')?.stateMachine.currentState ?? '');

export const BAOLI_STORY: ChapterStory = {
  cast: [
    // The guru as the boy remembers him: pale, see-through, there for one line and gone.
    { id: 'guru', rig: GURU, at: BAOLI_STAND, hidden: true, ghost: { color: 0x9cbcf0 } },
  ],

  // On the raiders' trail into the stepwell; the bound Guardian rises to block the way down. For a breath the boy
  // sees his guru beside him.
  opening: {
    id: 'baoli-opening',
    shots: [
      // Low behind him as he walks in across the island toward the dark shape hunched at its middle.
      {
        duration: 6,
        fadeIn: 0.8,
        ease: ease.drift,
        linesAt: 1.6,
        cues: [
          { at: 0, actor: 'hero', place: BAOLI_ENTRY, face: 'boss' },
          { at: 0, actor: 'boss', face: BAOLI_ENTRY },
          { at: 0.3, actor: 'hero', moveTo: BAOLI_STAND, face: 'boss' },
        ],
        lines: [{ speaker: 'Yudhveer', text: 'Their tracks end at the water. There is a way down, under the well.' }],
        camera: [
          { pos: v(3.6, 1.5, 19), look: v(0.2, 1.6, 0), fov: 42 },
          { pos: v(2.8, 1.7, 13), look: v(0, 1.8, -2), fov: 40 },
        ],
      },
      // Low on the Guardian, heaving where it stands.
      {
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.015,
        lines: [{ speaker: 'Yudhveer', text: 'Stand aside. They carried my guru through here.' }],
        camera: (s): CameraKey[] => {
          const h = s.height('boss');
          return [
            { pos: s.at('boss', h * 1.5, -h * 0.7, h * 0.15), look: s.at('boss', 0, 0, h * 0.5), fov: 40 },
            { pos: s.at('boss', h * 1.3, -h * 0.6, h * 0.2), look: s.at('boss', 0, 0, h * 0.55), fov: 37 },
          ];
        },
      },
      // It rises and roars: whatever kept the well now holds it.
      {
        duration: 5.6,
        fadeIn: 0.12,
        ease: ease.out,
        sway: 0.02,
        cues: [
          { at: 0.3, actor: 'boss', play: 'intro' },
          {
            at: 1.5,
            run: (s) => {
              const boss = s.actor('boss');
              if (boss instanceof Enemy) s.cards.boss(boss);
            },
          },
        ],
        // From its weapon side, low, tilting up to its face as it roars.
        camera: (s): CameraKey[] => {
          const h = s.height('boss');
          return [
            { pos: s.at('boss', h * 1.35, -h * 0.68, h * 0.24), look: s.at('boss', 0, -h * 0.05, h * 0.62), fov: 38 },
            { pos: s.at('boss', h * 1.5, -h * 0.55, h * 0.45), look: s.at('boss', 0, -h * 0.05, h * 0.74), fov: 34 },
          ];
        },
      },
      // The memory: the guru at his shoulder, pale as the moonlight, as he stood at the last lesson.
      {
        fadeIn: 0.3,
        ease: ease.drift,
        sway: 0.01,
        linesAt: 0.8,
        cues: [
          { at: 0, actor: 'guru', place: (s) => s.at('hero', -1.1, 0.95, 0), face: 'boss' },
          { at: 0, actor: 'guru', show: true },
        ],
        lines: [{ speaker: 'Guru', text: 'Do not look at its size, Yudhveer. Look at its feet.', voice: 'baoli_open_guru_1' }],
        // In front of him and to his right: his face, and the guru behind his other shoulder.
        camera: (s): CameraKey[] => {
          const look = s.head('hero').lerp(s.head('guru'), 0.35);
          return [
            { pos: s.at('hero', 2.6, -0.7, 1.6), look, fov: 36 },
            { pos: s.at('hero', 2.3, -0.6, 1.62), look, fov: 33 },
          ];
        },
      },
      // Gone. Over his shoulder to the Guardian, where the fight picks up.
      {
        fadeIn: 0.15,
        ease: ease.inOut,
        linesAt: 0.5,
        cues: [{ at: 0, actor: 'guru', show: false }],
        lines: [{ speaker: 'Yudhveer', text: 'Feet first, Guruji.' }],
        camera: (s): CameraKey[] => {
          const look = s.pos('boss').add(v(0, 1.5, 0));
          return [
            { pos: s.at('hero', -1.9, -0.95, 1.55), look, fov: 40 },
            { pos: s.at('hero', -3.1, -0.6, 2.0), look: look.clone().setY(look.y - 0.2), fov: 52 },
          ];
        },
      },
    ],
  },

  // The guru's teachings, remembered as the fight asks for them. The engine keeps them apart (one at a time, a breath
  // between), so the order here is their priority when two are due at once.
  beats: [
    // The lesson: the gathered blow (Shakti), once the Guardian is worn down (or the fight drags on).
    {
      on: { any: [{ bossBelow: 0.6 }, { fightTime: 45 }] },
      run: (s) => s.player.learn('charge'),
      lines: [
        { speaker: 'Guru', text: 'Now the lesson you would never sit still for.', voice: 'baoli_fight_guru_4' },
        { speaker: 'Guru', text: 'Stand, and gather your strength. Hold it until it is whole, then strike.', voice: 'baoli_fight_guru_5' },
      ],
    },
    // Hurt badly: the prologue's lesson again.
    { on: { heroBelow: 0.5 }, lines: [{ speaker: 'Guru', text: 'Breathe. Feet first. A man off his feet strikes nothing.', voice: 'baoli_fight_guru_3' }] },
    // Its posture broken: the opening.
    { on: { when: (s) => bossIn(s, 'POSTURE_BROKEN') }, lines: [{ speaker: 'Guru', text: 'It reels. Now, Yudhveer!', voice: 'baoli_fight_guru_6' }] },
    // Its leap or its three-blow string: do not stand under it.
    {
      on: { when: (s) => bossIn(s, 'ATTACK_JUMP', 'ATTACK_3') },
      lines: [{ speaker: 'Guru', text: 'Do not stand under the great blows. Slide clear, then answer.', voice: 'baoli_fight_guru_2' }],
    },
    // His first three-blow chain.
    {
      on: { when: (s) => s.player.stateMachine.currentState === 'ATTACK_3' },
      lines: [{ speaker: 'Guru', text: 'Good. Let each blow open the way for the next.', voice: 'baoli_fight_guru_1' }],
    },
    // Near the end: it was not always this.
    { on: { bossBelow: 0.25 }, lines: [{ speaker: 'Guru', text: 'It was not always this. Something dark binds it. Set it free.', voice: 'baoli_fight_guru_7' }] },
  ],

  // Beaten, the Guardian is itself again: Andhaka bound it; a lathi will not take the boy further; the vanaras of
  // the Hanuman akhada must teach him first.
  ending: {
    id: 'baoli-ending',
    shots: [
      // From black: wide on the two of them, the boy walking up to where it lies.
      {
        duration: 3.8,
        fadeIn: 0.9,
        ease: ease.drift,
        cues: [
          { at: 0, actor: 'hero', place: (s) => s.toward('boss', 'hero', Math.min(5.5, s.pos('boss').distanceTo(s.pos('hero')))), face: 'boss' },
          { at: 0.5, actor: 'hero', moveTo: (s) => s.toward('boss', 'hero', 2.8), face: 'boss' },
        ],
        camera: (s): CameraKey[] => {
          const { side, mid, dir } = twoShot(s, 'hero', 'boss', BAOLI_CENTRE);
          return [
            { pos: mid.clone().addScaledVector(side, 7.5).add(v(0, 2.6, 0)).addScaledVector(dir, -1), look: mid.clone().add(v(0, 0.7, 0)), fov: 40 },
            { pos: mid.clone().addScaledVector(side, 6.4).add(v(0, 2.1, 0)), look: mid.clone().add(v(0, 0.7, 0)), fov: 38 },
          ];
        },
      },
      // Low by its head: the darkness gone out of it.
      {
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.012,
        lines: [
          { speaker: 'Baoli Guardian', text: 'The dark... it has let go of me.', voice: 'baoli_end_guardian_1' },
          { speaker: 'Baoli Guardian', text: 'Andhaka bound me to this well, to turn back any who followed his men below.', voice: 'baoli_end_guardian_2' },
        ],
        camera: (s): CameraKey[] => {
          const { dir, side } = twoShot(s, 'hero', 'boss', BAOLI_CENTRE);
          const head = s.head('boss');
          return [
            { pos: head.clone().addScaledVector(side, 2.4).addScaledVector(dir, -0.6).add(v(0, 0.7, 0)), look: head, fov: 36 },
            { pos: head.clone().addScaledVector(side, 2.0).addScaledVector(dir, -0.5).add(v(0, 0.6, 0)), look: head, fov: 34 },
          ];
        },
      },
      // Low beside it, up at the boy.
      {
        fadeIn: 0.12,
        ease: ease.out,
        sway: 0.015,
        lines: [{ speaker: 'Yudhveer', text: 'They took my guru that way. I am going after him.' }],
        camera: (s): CameraKey[] => {
          const { pa, dir, side } = twoShot(s, 'hero', 'boss', BAOLI_CENTRE);
          const look = s.head('hero');
          return [
            { pos: pa.clone().addScaledVector(dir, 1.6).addScaledVector(side, 1.2).add(v(0, 0.7, 0)), look, fov: 38 },
            { pos: pa.clone().addScaledVector(dir, 1.4).addScaledVector(side, 1.05).add(v(0, 0.75, 0)), look, fov: 36 },
          ];
        },
      },
      // High over his shoulder, down at it, for the last of it.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.012,
        lines: [
          { speaker: 'Baoli Guardian', text: 'Not with a lathi. It has carried you this far. It will not carry you further.', voice: 'baoli_end_guardian_3' },
          { speaker: 'Baoli Guardian', text: 'Go to the Hanuman akhada. Let the vanaras teach you to truly fight. Then follow.', voice: 'baoli_end_guardian_4' },
        ],
        camera: (s): CameraKey[] => {
          const { pa, dir, side } = twoShot(s, 'hero', 'boss', BAOLI_CENTRE);
          const look = s.head('boss').lerp(s.pos('boss').add(v(0, 0.3, 0)), 0.4);
          return [
            { pos: pa.clone().addScaledVector(dir, -1.5).addScaledVector(side, 1.3).add(v(0, 2.5, 0)), look, fov: 38 },
            { pos: pa.clone().addScaledVector(dir, -1.2).addScaledVector(side, 1.2).add(v(0, 2.35, 0)), look, fov: 35 },
          ];
        },
      },
      // His answer, close.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.01,
        lines: [{ speaker: 'Yudhveer', text: 'Then I will learn. And then I will follow.' }],
        camera: (s): CameraKey[] => {
          const look = s.head('hero');
          return [
            { pos: s.at('hero', 1.9, -0.9, 1.5), look, fov: 36 },
            { pos: s.at('hero', 1.65, -0.8, 1.52), look, fov: 33 },
          ];
        },
      },
      // He turns back the way he came and walks; the camera stays and rises, and the picture fades.
      {
        duration: 4.6,
        fadeIn: 0.2,
        fadeOut: 1.5,
        ease: ease.drift,
        cues: [{ at: 0.4, actor: 'hero', moveTo: (s) => s.pos('hero').add(BAOLI_ENTRY.clone().sub(s.pos('hero')).setY(0).normalize().multiplyScalar(5)) }],
        camera: (s): CameraKey[] => {
          const h = s.pos('hero');
          const away = BAOLI_ENTRY.clone().sub(h).setY(0).normalize();
          const look = h.clone().addScaledVector(away, 2.5).add(v(0, 0.9, 0));
          return [
            { pos: h.clone().addScaledVector(away, -3).add(v(0.8, 2, 0)), look, fov: 44 },
            { pos: h.clone().addScaledVector(away, -5.5).add(v(1.2, 4.6, 0)), look, fov: 46 },
          ];
        },
      },
    ],
  },
};

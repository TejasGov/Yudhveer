import * as THREE from 'three';
import { ease, type CameraKey } from '../../cinematics/CinematicDirector';
import { awaken, kavachLight, kindleEyes, type KavachLight, type StatueMarks } from '../../cinematics/DivineLight';
import type { ChapterStory, Stage } from '../../cinematics/Scene';
import { Enemy } from '../../entities/Enemy';
import { GURU } from '../../entities/characters/Village';
import { BAOLI_GUARDIAN } from '../../entities/characters/BaoliGuardian';
import { shade, shadeOf, shadeRises, shadeShots, twoShot } from '../Story';

/*
 * Chapter I, the moonlit baoli (STORY.md, "Chapter I" and "Milestone 5"). The raiders took the guru down through the
 * old stepwell; Andhaka's darkness has bound its Guardian to stop anyone who follows. The boy has only his lathi and
 * what he remembers of his lessons: the guru's voice comes back to him as the fight asks for it, and teaches him the
 * gathered blow.
 *
 * Before he goes down, he kneels at the Devi's shrine on the terrace above the well: Durga speaks to him, and her light
 * burns away his training clothes and leaves him in the divya kavach (STORY.md, "The divya kavach").
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

/**
 * The Devi's shrine on the terrace, ~66 m beyond the island (Level1_Baoli scales it to twice its modelled size): where
 * the boy comes up the last steps, where he kneels (between the stone lions, ~6 m short of her pedestal), her face and
 * her eyes (measured off the statue), and what `awaken` lights.
 */
const DEVI_APPROACH = v(0.3, 4.15, 50.6);
const DEVI_KNEEL = v(0, 4.15, 57.5);
const DEVI_FACE = v(-0.5, 16.8, 68.3);
const DEVI_EYES: [THREE.Vector3, THREE.Vector3] = [v(-0.66, 17.05, 68.0), v(-0.34, 17.05, 68.0)];
const DEVI_STATUE: StatueMarks = { head: DEVI_FACE, feet: v(0, 8.7, 64.6), facing: v(0, 0, -1) };
/** Seconds into the light's shot when his clothes burn away into the kavach; where the prayer clip ends. */
const KAVACH_AT = 3.3;
const PRAYED_AT = 1.9;

/**
 * The Devi's prophecy (docs/STORY.md, "The divya kavach"). Subtitles only until they are recorded; the planned voice
 * ids are `baoli_devi_1` to `baoli_devi_3` (docs/APPROVALS.md).
 */
const DEVI_LINES = [
  { speaker: 'Durga', text: 'You climbed to my door with a stick of bamboo, and a grief too heavy for it.' },
  { speaker: 'Durga', text: 'What they carried down this well, they will not keep. Follow it.' },
  { speaker: 'Durga', text: 'Not alone. Wear my kavach. It will turn the blow. It will not move your feet; that is yours to do.' },
];

/** The shrine's effects, set up as the scene starts and started on cue. */
let wake: ((seconds: number) => void) | null = null;
let eyes: ((seconds: number) => void) | null = null;
let gift: KavachLight | null = null;

/**
 * He kneels, prays or rises: one of the Hero- clips, or (a model built without them) the nearest clip it has.
 * `startAt`: clip seconds to start from.
 */
function kneel(s: Stage, clip: string, fallback: string, fade = 0.3, startAt?: number): void {
  if (!s.player.playClip(clip, { fade, startAt })) s.player.playClip(fallback, { fade });
}

/** The Guardian (its enemy id), and the framings for its shade (Story.ts `shadeShots`), on the island's open side. */
const GUARDIAN = 'baoli_guardian';
const shadeOn = (s: Stage) => shadeShots(s, shade(GUARDIAN), twoShot(s, 'hero', shade(GUARDIAN), BAOLI_CENTRE).side);

/** Whether the Guardian is in one of these states now. */
const bossIn = (s: Stage, ...states: string[]) => states.includes(s.actor('boss')?.stateMachine.currentState ?? '');

export const BAOLI_STORY: ChapterStory = {
  cast: [
    // The guru as the boy remembers him: pale, see-through, there for one line and gone.
    { id: 'guru', rig: GURU, at: BAOLI_STAND, hidden: true, ghost: { color: 0x9cbcf0 } },
    // The Guardian freed: its shade, risen over its body for its last words (Story.ts, "The dead speak").
    shadeOf(GUARDIAN, BAOLI_GUARDIAN),
  ],

  // At the Devi's shrine above the well he kneels in his training clothes and rises in the divya kavach; then on the
  // raiders' trail into the stepwell, where the bound Guardian rises to block the way down. For a breath the boy sees
  // his guru beside him.
  opening: {
    id: 'baoli-opening',
    shots: [
      // The Devi's shrine on the terrace above the stepwell (docs/STORY.md, "The divya kavach"). From black: low
      // behind the boy, in his training clothes, as he climbs between the stone lions to the Devi on her lion.
      {
        duration: 5.6,
        fadeIn: 1.0,
        ease: ease.drift,
        cues: [
          { at: 0, actor: 'hero', place: DEVI_APPROACH, face: DEVI_FACE },
          { at: 0.2, actor: 'hero', moveTo: DEVI_KNEEL, face: DEVI_FACE },
          // The Devi's eyes and light, set up dark while nothing is lit (their shaders compile off the moment).
          {
            at: 0,
            run: (s) => {
              wake = awaken(s.level.group, s.level.group, DEVI_STATUE, 'Devi_Stone', 14, 0.25);
              eyes = kindleEyes(s.level.group, DEVI_EYES, 0.4);
            },
          },
        ],
        camera: [
          { pos: v(-2.4, 5.2, 46.4), look: v(0, 9.4, 66), fov: 46 },
          { pos: v(-1.8, 5.4, 48.8), look: v(0, 10.2, 66), fov: 44 },
        ],
      },
      // Side on, close: he lays the lathi down, kneels, and joins his hands.
      {
        duration: 5.2,
        fadeIn: 0.15,
        ease: ease.drift,
        cues: [
          { at: 0, actor: 'hero', place: DEVI_KNEEL, face: DEVI_FACE },
          { at: 0.1, run: (s) => { s.player.swordMesh.visible = false; kneel(s, 'kneeling_down', 'crouch'); } },
          { at: 2.7, run: (s) => kneel(s, 'praying', 'crouch_idle', 0.35) },
        ],
        camera: [
          { pos: v(3.3, 5.25, 55.7), look: v(0, 4.85, 58.0), fov: 40 },
          { pos: v(2.9, 5.15, 56.0), look: v(0, 4.75, 58.0), fov: 38 },
        ],
      },
      // Low behind him, up at the Devi towering over him: her stone warms, her lamps are answered, her eyes open in light.
      {
        duration: 5.4,
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.008,
        cues: [
          { at: 0.3, run: () => wake?.(4.5) },
          { at: 1.6, run: () => eyes?.(1.8) },
        ],
        camera: [
          { pos: v(-1.4, 4.6, 49.6), look: v(0, 9.8, 67), fov: 50 },
          { pos: v(-1.2, 4.65, 50.6), look: v(0, 10.3, 67), fov: 48 },
        ],
      },
      // Up at her face, past the lion's mane, slowly closer: she speaks.
      {
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.006,
        linesAt: 0.6,
        lines: [DEVI_LINES[0]],
        camera: [
          { pos: v(-3.6, 13.6, 60.6), look: DEVI_FACE.clone().add(v(0, -0.3, 0)), fov: 33 },
          { pos: v(-3.3, 13.8, 61.3), look: DEVI_FACE.clone().add(v(0, -0.25, 0)), fov: 30 },
        ],
      },
      // His face, looking up into her light, as she tells him what they cannot keep; he answers.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.008,
        lines: [DEVI_LINES[1], { speaker: 'Yudhveer', text: 'With a stick of bamboo?' }],
        camera: (s): CameraKey[] => {
          const head = s.head('hero');
          return [
            { pos: head.clone().add(v(0.75, -0.12, 1.45)), look: head.clone().add(v(0, 0.05, 0)), fov: 34 },
            { pos: head.clone().add(v(0.65, -0.1, 1.25)), look: head.clone().add(v(0, 0.05, 0)), fov: 32 },
          ];
        },
      },
      // Her face again, square on to her now: the gift.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.006,
        lines: [DEVI_LINES[2]],
        camera: [
          { pos: v(-1.6, 15.0, 59.2), look: DEVI_FACE.clone().add(v(0, -0.7, 0)), fov: 36 },
          { pos: v(-1.4, 15.1, 59.9), look: DEVI_FACE.clone().add(v(0, -0.6, 0)), fov: 33 },
        ],
      },
      // Low, three-quarters on, her pedestal behind him: her light comes down on him; his training clothes burn away in it, and in a white flash he is
      // clothed in the divya kavach.
      {
        duration: 6.4,
        fadeIn: 0.15,
        ease: ease.drift,
        cues: [
          {
            at: 0,
            run: (s) => {
              gift = kavachLight(s.level.group, s.player);
              gift.start(6.2, KAVACH_AT, () => undefined);
            },
          },
          // The change itself, essential: a skipped or settled scene (a retry) still leaves him in the kavach.
          {
            at: KAVACH_AT,
            essential: true,
            run: (s) => {
              s.player.wear('kavach');
              s.player.swordMesh.visible = false;
            },
          },
          { at: KAVACH_AT + 0.05, run: (s) => kneel(s, 'praying', 'crouch_idle', 0, PRAYED_AT) },
        ],
        camera: [
          { pos: v(3.4, 5.2, 53.9), look: v(-0.4, 6.0, 59.6), fov: 50 },
          { pos: v(3.1, 5.15, 54.4), look: v(-0.4, 5.85, 59.4), fov: 48 },
        ],
      },
      // Low in front of him: he rises in the kavach, the light lifting off him, and takes up the lathi.
      {
        duration: 4.0,
        fadeIn: 0.15,
        fadeOut: 0.7,
        ease: ease.out,
        cues: [
          { at: 0.2, run: (s) => kneel(s, 'kneel_to_stand', 'calm_idle', 0.3) },
          { at: 1.9, essential: true, run: (s) => { s.player.swordMesh.visible = true; } },
        ],
        camera: (s): CameraKey[] => {
          const p = s.pos('hero');
          return [
            { pos: p.clone().add(v(0.9, 0.55, 2.6)), look: p.clone().add(v(0, 1.0, 0)), fov: 40 },
            { pos: p.clone().add(v(0.75, 0.45, 2.3)), look: p.clone().add(v(0, 1.45, 0)), fov: 40 },
          ];
        },
      },
      // Down in the stepwell:
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
  // the Hanuman akhada must teach him first. It speaks as its shade, freed of the body, and fades as he answers.
  ending: {
    id: 'baoli-ending',
    shots: [
      // From black: wide on the two of them, the boy walking up to where it lies; its shade rises out of it.
      {
        duration: 3.8,
        fadeIn: 0.9,
        ease: ease.drift,
        cues: [
          { at: 0, actor: 'hero', place: (s) => s.toward('boss', 'hero', Math.min(5.5, s.pos('boss').distanceTo(s.pos('hero')))), face: 'boss' },
          ...shadeRises(GUARDIAN, 1.4),
          { at: 0.5, actor: 'hero', moveTo: (s) => s.toward('boss', 'hero', 2.8), face: shade(GUARDIAN) },
        ],
        // (On the boy and the shade's mark, so all of it rises in the frame.)
        camera: (s): CameraKey[] => {
          const { side, mid, dir } = twoShot(s, 'hero', shade(GUARDIAN), BAOLI_CENTRE);
          const look = mid.clone().addScaledVector(dir, 0.6).add(v(0, 1.1, 0));
          return [
            { pos: mid.clone().addScaledVector(side, 8).add(v(0, 2.6, 0)).addScaledVector(dir, -0.4), look, fov: 40 },
            { pos: mid.clone().addScaledVector(side, 7).add(v(0, 2.2, 0)).addScaledVector(dir, 0.2), look, fov: 38 },
          ];
        },
      },
      // Close on its shade, level with its face: the darkness gone out of it.
      {
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.012,
        cues: [{ at: 0, actor: shade(GUARDIAN), face: 'hero' }],
        lines: [
          { speaker: 'Baoli Guardian', text: 'The dark... it has let go of me.', voice: 'baoli_end_guardian_1' },
          { speaker: 'Baoli Guardian', text: 'Andhaka bound me to this well, to turn back any who followed his men below.', voice: 'baoli_end_guardian_2' },
        ],
        camera: (s) => shadeOn(s).close(),
      },
      // Over its shade's shoulder, down at the boy.
      {
        fadeIn: 0.12,
        ease: ease.out,
        sway: 0.015,
        lines: [{ speaker: 'Yudhveer', text: 'They took my guru that way. I am going after him.' }],
        camera: (s) => shadeOn(s).overShade(),
      },
      // Over his shoulder, up at its shade, for the last of it.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.012,
        lines: [
          { speaker: 'Baoli Guardian', text: 'Not with a lathi. It has carried you this far. It will not carry you further.', voice: 'baoli_end_guardian_3' },
          { speaker: 'Baoli Guardian', text: 'Go to the Hanuman akhada. Let the vanaras teach you to truly fight. Then follow.', voice: 'baoli_end_guardian_4' },
        ],
        camera: (s) => shadeOn(s).overHero(),
      },
      // His answer, side on to the two of them: its word given, the shade sinks back into the stone and is gone.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.01,
        cues: [{ at: 1.0, actor: shade(GUARDIAN), appear: false, over: 2.2 }],
        lines: [{ speaker: 'Yudhveer', text: 'Then I will learn. And then I will follow.' }],
        camera: (s) => shadeOn(s).side(),
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

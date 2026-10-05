import * as THREE from 'three';
import { ease, type CameraKey } from '../cinematics/CinematicDirector';
import type { ChapterStory, SceneCue, Stage } from '../cinematics/Scene';
import { GURU, ANDHAKA_SHADOW } from '../entities/characters/Village';
import { SoundFX } from '../combat/SoundFX';
import { VILLAGE_GATE as GATE, VILLAGE_SUN } from '../levels/Level0_Village';

/*
 * The chapters' story scenes and in-fight lines (docs/STORY.md). Each chapter names its own in `Chapter.story`.
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
// ---------------------------------------------------------------------------------------------------- Prologue

/*
 * The village at dusk (STORY.md, "Prologue"). The sun goes down behind the north gate (-z), so faces turned north are
 * lit and anything between the camera and the gate stands against the glow. Andhaka is only ever his silhouette (characters/Village.ts).
 */

/** The training circle (the north gate is GATE), and where the guru waits out the fight (by the neem tree). */
const LESSON_HERO = v(0, 0, 1.4);
const LESSON_GURU = v(0, 0, -1.3);
const GURU_ASIDE = v(-4.7, 0, -0.5);
/** Where the beaten boy kneels, and where Andhaka comes to stand over him. */
const KNEEL = v(0, 0, 1);
const OVER_HIM = v(0, 0, -2.1);
/** Every raider the fight could have brought on (the waves' ids). */
const RAIDERS = Array.from({ length: 9 }, (_, i) => `raider_${i + 1}`);

const alive = (s: Stage) => s.enemies.filter((e) => e.stateMachine.currentState !== 'DEAD' && e.group.visible);

/**
 * The raiders still standing close round the boy in a half ring on his south side, leaving the way from the gate
 * open. A fallen one stays where it lies.
 */
function ringSlot(s: Stage, id: string): THREE.Vector3 {
  const living = alive(s);
  const i = living.findIndex((e) => e.id === id);
  if (i < 0) return s.pos(id);
  const a = living.length === 1 ? 0.6 : -1.5 + (3 * i) / (living.length - 1);
  return KNEEL.clone().add(v(Math.sin(a) * 2.6, 0, Math.cos(a) * 2.6));
}

export const PROLOGUE_STORY: ChapterStory = {
  cast: [
    // At the lesson: facing the boy across the training circle.
    { id: 'guru', rig: GURU, at: LESSON_GURU, face: LESSON_HERO },
    // Behind the raid, waiting beyond the gate until the boy is down.
    { id: 'andhaka', rig: ANDHAKA_SHADOW, at: v(0, 0, -14), face: KNEEL, hidden: true, silhouette: { color: 0xff8a3a } },
  ],

  // The last lesson, at dusk: the guru corrects the boy's stance, the sun is nearly down, then the horn at the gate.
  opening: {
    id: 'prologue-opening',
    shots: [
      // Side on to the two of them in the chalk circle, the boy swinging his lathi.
      {
        fadeIn: 0.5,
        ease: ease.drift,
        sway: 0.015,
        linesAt: 2.4,
        cues: [
          { at: 0, actor: 'hero', place: LESSON_HERO, face: 'guru' },
          { at: 0, actor: 'guru', place: LESSON_GURU, face: 'hero' },
          { at: 0.5, actor: 'hero', clip: 'one_hand_club_combo', timeScale: 1.1 },
        ],
        lines: [{ speaker: 'Guru', text: 'Again. Feet first, then the lathi. Swung from the arm alone, it is only a stick.', voice: 'prologue_open_guru_1' }],
        camera: [
          { pos: v(4.2, 1.35, 0.9), look: v(0, 1.05, 0), fov: 40 },
          { pos: v(3.7, 1.5, 0.5), look: v(0, 1.1, 0), fov: 38 },
        ],
      },
      // Over the guru's shoulder: the boy, lit by the low sun.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.015,
        cues: [{ at: 0, actor: 'hero', play: 'IDLE' }],
        lines: [{ speaker: 'Yudhveer', text: 'Like this, Guruji?' }],
        camera: (s): CameraKey[] => [
          { pos: s.at('guru', -1.0, -0.55, 1.75), look: s.head('hero'), fov: 36 },
          { pos: s.at('guru', -0.85, -0.5, 1.72), look: s.head('hero'), fov: 33 },
        ],
      },
      // On the guru, against the sunset.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.012,
        lines: [{ speaker: 'Guru', text: 'Better. The sun is nearly down. Once more, and then we eat.', voice: 'prologue_open_guru_2' }],
        camera: (s): CameraKey[] => [
          { pos: s.at('hero', -0.9, 0.55, 1.7), look: s.head('guru'), fov: 34 },
          { pos: s.at('hero', -0.75, 0.5, 1.68), look: s.head('guru'), fov: 31 },
        ],
      },
      // A horn: both turn to the gate, and the raiders step into it out of the glow.
      {
        duration: 4.6,
        fadeIn: 0.1,
        ease: ease.out,
        sway: 0.02,
        cues: [
          { at: 0, run: () => SoundFX.getInstance().playRaidHorn() },
          ...['raider_1', 'raider_2', 'raider_3'].map((id): SceneCue => ({ at: 0, actor: id, show: true })),
          { at: 0.3, actor: 'guru', face: GATE },
          { at: 0.5, actor: 'hero', face: GATE },
          { at: 0.8, actor: 'raider_1', moveTo: v(-1.1, 0, -12.4), face: 'hero' },
          { at: 1.1, actor: 'raider_2', moveTo: v(1.0, 0, -12.8), face: 'hero' },
          { at: 1.5, actor: 'raider_3', moveTo: v(0, 0, -13.6), face: 'hero' },
        ],
        camera: [
          { pos: v(1.3, 1.7, 4.6), look: v(0, 1.7, -12.5), fov: 40 },
          { pos: v(1.0, 1.6, 3.6), look: v(0, 1.6, -12.5), fov: 32 },
        ],
      },
      // The guru, calm, tells him to stand his ground and steps aside; over the boy's shoulder to the gate.
      {
        fadeIn: 0.12,
        ease: ease.inOut,
        linesAt: 0.3,
        cues: [{ at: 0.4, actor: 'guru', moveTo: GURU_ASIDE, face: GATE }],
        lines: [
          { speaker: 'Guru', text: 'Keep your feet, Yudhveer. Whatever comes through that gate, keep your feet.', voice: 'prologue_open_guru_3' },
          { speaker: 'Yudhveer', text: 'Let them come.' },
        ],
        camera: (s): CameraKey[] => [
          { pos: s.at('hero', -1.8, -0.9, 1.6), look: GATE.clone().setY(1.4), fov: 42 },
          { pos: s.at('hero', -3.0, -0.6, 2.0), look: GATE.clone().setY(1.2), fov: 52 },
        ],
      },
    ],
  },

  // The guru's voice across the courtyard while the boy fights.
  beats: [
    { on: { fightTime: 6 }, lines: [{ speaker: 'Guru', text: 'Do not chase them. Let them come to you.', voice: 'prologue_fight_guru_1' }] },
    { on: { heroBelow: 0.6 }, lines: [{ speaker: 'Guru', text: 'Breathe. Feet first.', voice: 'prologue_fight_guru_2' }] },
  ],

  // He cannot win: once he is worn down (or three raiders have fallen, or the fight has gone on long enough) he is
  // beaten, and the ending below plays.
  loss: {
    on: {
      any: [
        { heroBelow: 0.3 },
        { fightTime: 75 },
        { when: (s) => s.enemies.filter((e) => e.stateMachine.currentState === 'DEAD').length >= 3 },
      ],
    },
  },

  // Beaten. Andhaka comes through the gate, a shape against the sunset; the guru steps between them and the blade
  // comes down in the dark. When the picture comes back the raiders are gone, a roof burns, the guru is nowhere.
  ending: {
    id: 'prologue-loss',
    shots: [
      // From above: the boy on his knees, the raiders closing round him.
      {
        duration: 3.6,
        fadeIn: 0.7,
        ease: ease.drift,
        cues: [
          {
            at: 0,
            run: (s) => {
              s.player.stateMachine.changeState('IDLE');
              s.player.playClip('crouch_idle', { fade: 0.3 });
            },
          },
          { at: 0, actor: 'hero', place: KNEEL, face: GATE },
          ...RAIDERS.map((id): SceneCue => ({ at: 0, actor: id, place: (s: Stage) => ringSlot(s, id), face: 'hero' })),
        ],
        camera: [
          { pos: v(4.6, 4.6, 7.2), look: v(0, 0.5, 1.2), fov: 42 },
          { pos: v(3.9, 4.0, 6.4), look: v(0, 0.5, 1.0), fov: 40 },
        ],
      },
      // Low behind him: something huge comes through the gate out of the sun.
      {
        duration: 6.8,
        fadeIn: 0.2,
        ease: ease.drift,
        sway: 0.012,
        cues: [
          { at: 0, actor: 'andhaka', place: v(0, 0, -14), face: 'hero' },
          { at: 0, actor: 'andhaka', show: true },
          { at: 0.2, actor: 'andhaka', moveTo: OVER_HIM, face: 'hero' },
          ...RAIDERS.map((id): SceneCue => ({ at: 1.2, actor: id, face: 'andhaka' })),
        ],
        camera: [
          { pos: v(0.7, 0.55, 3.4), look: v(0, 2.6, -12), fov: 42 },
          { pos: v(0.6, 0.5, 3.0), look: v(0, 2.4, -8), fov: 38 },
        ],
      },
      // Up at him from beside the boy, along the line of the sun: only his outline, the great blade and the glow
      // of the dusk behind him.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.01,
        cues: [{ at: 0, actor: 'andhaka', face: 'hero' }],
        lines: [{ speaker: 'Andhaka', text: "A boy with a stick... Your guru's soul will burn before my god. Kneel.", voice: 'andhaka_prologue_kneel' }],
        camera: (s): CameraKey[] => {
          const a = s.pos('andhaka');
          return [
            { pos: a.clone().addScaledVector(VILLAGE_SUN, -6.2).setY(0.5), look: a.clone().add(v(0, 1.7, 0)), fov: 42 },
            { pos: a.clone().addScaledVector(VILLAGE_SUN, -5.4).setY(0.45), look: a.clone().add(v(0, 1.8, 0)), fov: 40 },
          ];
        },
      },
      // The guru walks out between them.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        linesAt: 2.2,
        cues: [{ at: 0.2, actor: 'guru', moveTo: v(0.2, 0, -0.5), face: 'andhaka' }],
        lines: [{ speaker: 'Guru', text: 'Leave the boy. It is me you came for.', voice: 'prologue_end_guru_1' }],
        camera: [
          { pos: v(6.2, 1.5, 0.4), look: v(0, 1.7, -0.6), fov: 38 },
          { pos: v(5.6, 1.6, 0.1), look: v(0, 1.8, -0.7), fov: 36 },
        ],
      },
      // The blade goes up, and comes down as the picture goes.
      {
        duration: 1.75,
        fadeIn: 0.1,
        fadeOut: 0.1,
        ease: ease.out,
        sway: 0.02,
        cues: [
          { at: 0.1, actor: 'andhaka', clip: 'standing_melee_attack_downward', timeScale: 0.9 },
          { at: 1.6, run: () => SoundFX.getInstance().playFallingBlow() },
        ],
        camera: [
          { pos: v(0.55, 0.65, 2.7), look: v(0, 2.4, -1.6), fov: 44 },
          { pos: v(0.5, 0.6, 2.5), look: v(0, 2.6, -1.6), fov: 40 },
        ],
      },
      // Held in the dark (a fade far longer than the shot never lifts): his cry. The raiders leave, the guru with them.
      {
        duration: 2.2,
        fadeIn: 60,
        linesAt: 0.3,
        cues: [
          { at: 0, actor: 'andhaka', show: false },
          { at: 0, actor: 'guru', show: false },
          { at: 0, run: (s) => { for (const e of alive(s)) e.group.visible = false; }, essential: true },
          { at: 0, run: (s) => s.level.cue?.('raid-fire') },
        ],
        lines: [{ speaker: 'Yudhveer', text: 'Guruji!' }],
        camera: [{ pos: v(0.5, 0.6, 2.5), look: v(0, 2.6, -1.6), fov: 40 }],
      },
      // Later: an empty courtyard, a roof burning, the boy alone where the guru stood.
      {
        duration: 4.8,
        fadeIn: 2.2,
        ease: ease.drift,
        camera: [
          // From the south-west corner, the boy in the circle and the burning roof beyond him.
          { pos: v(-5.2, 3.4, 8.4), look: v(2.4, 1.2, -2.6), fov: 44 },
          { pos: v(-4.4, 2.9, 7.4), look: v(2.2, 1.2, -2.6), fov: 42 },
        ],
      },
      // He gets up and faces the gate the raiders took.
      {
        fadeIn: 0.25,
        ease: ease.drift,
        sway: 0.01,
        linesAt: 1.2,
        cues: [{ at: 0.3, actor: 'hero', play: 'IDLE' }, { at: 0.6, actor: 'hero', face: GATE }],
        lines: [{ speaker: 'Yudhveer', text: 'Guruji... I will find you. Even if I have to climb to the top of the world.' }],
        // In front of him and off to his right (his idle stance stands side on, chest that way): his face lit by the
        // last of the sun.
        camera: (s): CameraKey[] => {
          const face = GATE.clone().sub(s.pos('hero')).setY(0).normalize();
          const side = v(-face.z, 0, face.x);
          const look = s.pos('hero').add(v(0, 1.5, 0));
          return [
            { pos: s.pos('hero').addScaledVector(face, 1.9).addScaledVector(side, 1.7).setY(1.45), look, fov: 36 },
            { pos: s.pos('hero').addScaledVector(face, 1.6).addScaledVector(side, 1.45).setY(1.5), look, fov: 33 },
          ];
        },
      },
      // Out through the gate into the last of the light; the camera stays behind and rises.
      {
        duration: 6.5,
        fadeIn: 0.25,
        fadeOut: 1.8,
        ease: ease.drift,
        cues: [{ at: 0.3, actor: 'hero', moveTo: v(0, 0, -17.5) }],
        camera: [
          { pos: v(0.9, 1.7, 4.4), look: v(0, 1.4, -10), fov: 44 },
          { pos: v(1.2, 4.6, 7.5), look: v(0, 2.2, -14), fov: 46 },
        ],
      },
    ],
  },
};

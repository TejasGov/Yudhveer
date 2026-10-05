import * as THREE from 'three';
import { ease, type CameraKey } from '../../cinematics/CinematicDirector';
import type { ChapterStory, Stage } from '../../cinematics/Scene';
import { SoundFX } from '../../combat/SoundFX';
import { KITS } from '../Progression';
import { ISLAND } from '../../levels/Level5_Island';
import { ISLAND_FOES } from '../IslandExpedition';

/*
 * Chapter III: the island (docs/STORY.md, "Chapter III" and "Milestone 7"). He comes ashore in a sea cave with the
 * akhada's sword and dhal, goes down through the lamp-lit caves to the shrine, and takes up the blessed mace from its
 * altar: the chapter is won when he lifts it. Yudhveer is not voiced (subtitles only); the boatman and the voice in
 * the shrine are.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** The hero is within `r` metres of `p` (on the ground plane, and on its level). */
const near = (s: Stage, p: THREE.Vector3, r: number) => {
  const h = s.pos('hero');
  return Math.hypot(h.x - p.x, h.z - p.z) < r && Math.abs(h.y - p.y) < 3;
};
/** Every one of these has come out and fallen. */
const allDown = (s: Stage, ids: string[]) => ids.every((id) => s.actor(id)?.stateMachine.currentState === 'DEAD');

/** Where he will walk off toward, mace in hand: back up the way he came. */
const WAY_OUT = v(0.6, -2.5, -63);

export const ISLAND_STORY: ChapterStory = {
  // Ashore at the landing: the boatman stays under his canopy in the dark of the boat and will go no further.
  opening: {
    id: 'island-opening',
    shots: [
      // From up in the landing, back toward the sea: the boy on the stones, the boat and its little stern lamp, the
      // moonlit mouth of the cave beyond.
      {
        fadeIn: 0.8,
        ease: ease.drift,
        sway: 0.012,
        linesAt: 1.6,
        cues: [{ at: 0, actor: 'hero', place: ISLAND.landing, face: ISLAND.boat }],
        lines: [{
          speaker: 'Boatman',
          text: 'This is as far as my boat goes. Whatever is kept on this island, it keeps for itself.',
          voice: 'island_open_boatman_1',
        }],
        camera: [
          { pos: v(-3.0, 2.8, -2.6), look: v(1.0, 0.5, 7.5), fov: 44 },
          { pos: v(-2.6, 2.5, -1.9), look: v(1.0, 0.5, 7.5), fov: 42 },
        ],
      },
      // Over his shoulder to the boat.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.015,
        lines: [{ speaker: 'Yudhveer', text: 'They say a mace lies down there. A blessed one.' }],
        camera: (s): CameraKey[] => [
          { pos: s.at('hero', -1.1, -0.6, 1.75), look: ISLAND.boatman, fov: 36 },
          { pos: s.at('hero', -0.95, -0.55, 1.72), look: ISLAND.boatman, fov: 33 },
        ],
      },
      // Close on the canopy: only the dark under it, and the lamp.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.012,
        lines: [{
          speaker: 'Boatman',
          text: 'They say it. Men have gone down to fetch it. I have rowed them here, and I have rowed back alone.',
          voice: 'island_open_boatman_2',
        }],
        camera: [
          { pos: v(-1.2, 1.0, 6.4), look: ISLAND.boatman, fov: 32 },
          { pos: v(-1.0, 0.95, 6.8), look: ISLAND.boatman, fov: 29 },
        ],
      },
      // He turns to the way in, the two lamps either side of the tunnel; the boatman calls after him.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.012,
        linesAt: 0.8,
        cues: [{ at: 0.3, actor: 'hero', face: ISLAND.tunnel }],
        lines: [
          { speaker: 'Yudhveer', text: 'Then wait for me until the tide turns.' },
          { speaker: 'Boatman', text: 'I will wait. Mind the lamps. No one lights them, and they never go out.', voice: 'island_open_boatman_3' },
        ],
        camera: (s): CameraKey[] => {
          const h = s.pos('hero');
          return [
            { pos: h.clone().add(v(1.3, 1.45, -2.4)), look: h.clone().add(v(0, 1.45, 0)), fov: 38 },
            { pos: h.clone().add(v(1.1, 1.5, -2.0)), look: h.clone().add(v(0, 1.5, 0)), fov: 36 },
          ];
        },
      },
      // Behind him as he walks to the tunnel mouth; the lamps, and the black past them.
      {
        duration: 3.6,
        fadeIn: 0.15,
        ease: ease.inOut,
        cues: [{ at: 0.3, actor: 'hero', moveTo: v(0, 0, -0.6), face: ISLAND.tunnel }],
        camera: [
          { pos: v(0.9, 1.9, 4.6), look: v(0, 1.2, -6), fov: 44 },
          { pos: v(0.6, 1.8, 2.9), look: v(0, 1.2, -6), fov: 50 },
        ],
      },
    ],
  },

  // His thoughts on the way down, and the voice in the shrine. Spoken over the walk (and the fights).
  beats: [
    { on: { when: (s) => s.pos('hero').z < -6.5 }, lines: [{ speaker: 'Yudhveer', text: 'Still burning. Who keeps these lamps?' }] },
    { on: { when: (s) => allDown(s, ISLAND_FOES.hall) }, lines: [{ speaker: 'Yudhveer', text: 'Small, and many. So this is where the others ended.' }] },
    {
      on: { when: (s) => near(s, ISLAND.water, 8.5) },
      run: () => SoundFX.getInstance().playRoar(0.45, 'naga'),
      lines: [{ speaker: 'Yudhveer', text: 'Something moves in the water. Keep to the stone.' }],
    },
    {
      on: { when: (s) => s.pos('hero').z < -56 && allDown(s, ISLAND_FOES.pool) },
      lines: [{ speaker: 'Yudhveer', text: 'Warm air, and ghee burning. The shrine is close.' }],
    },
    {
      on: { when: (s) => s.pos('hero').z < -63 },
      lines: [{ speaker: 'Voice in the shrine', text: 'Many have come down for it. None has carried it up.', voice: 'island_shrine_voice_1' }],
    },
    {
      on: { when: (s) => allDown(s, [...ISLAND_FOES.shrine, ...ISLAND_FOES.shrineBehind]) },
      lines: [{ speaker: 'Voice in the shrine', text: 'Come, then. Come and lift it, if you can.', voice: 'island_shrine_voice_2' }],
    },
  ],

  // The extraction: he takes up the blessed mace, and the voice sends him on to Dwarka.
  ending: {
    id: 'island-mace',
    shots: [
      // From behind the altar, low, across the mace: he steps up before it.
      {
        fadeIn: 0.8,
        ease: ease.drift,
        sway: 0.01,
        linesAt: 1.4,
        cues: [
          { at: 0, actor: 'hero', place: v(0, -2.14, -73.4), face: ISLAND.altar },
          { at: 0.3, actor: 'hero', moveTo: ISLAND.beforeAltar, face: ISLAND.altar },
        ],
        lines: [{ speaker: 'Voice in the shrine', text: 'Lift it, if you do not lift it for yourself.', voice: 'island_end_voice_1' }],
        camera: [
          { pos: v(1.1, -0.75, -78.6), look: v(0, -0.65, -74.2), fov: 40 },
          { pos: v(0.9, -0.8, -78.3), look: v(0, -0.6, -74.4), fov: 37 },
        ],
      },
      // Close on the mace in its lamplight.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.01,
        lines: [{ speaker: 'Yudhveer', text: 'Not for myself. For my guru, and against the ones who took him.' }],
        camera: (s): CameraKey[] => {
          const m = (s.level as unknown as { maceRest?: THREE.Vector3 }).maceRest ?? ISLAND.mace;
          return [
            { pos: m.clone().add(v(1.3, 0.55, 1.1)), look: m.clone().add(v(-0.1, 0, 0)), fov: 34 },
            { pos: m.clone().add(v(1.0, 0.45, 0.95)), look: m.clone().add(v(-0.1, 0, 0)), fov: 30 },
          ];
        },
      },
      // He reaches for it; the picture goes dark as he lifts it.
      {
        duration: 2.2,
        fadeIn: 0.12,
        fadeOut: 0.8,
        ease: ease.out,
        cues: [{ at: 0.1, actor: 'hero', clip: 'crouch_idle' }],
        camera: (s): CameraKey[] => [
          { pos: s.at('hero', 1.6, 1.5, 1.3), look: s.pos('hero').add(v(0, 0.9, 0)), fov: 40 },
          { pos: s.at('hero', 1.4, 1.3, 1.2), look: s.pos('hero').add(v(0, 0.9, 0)), fov: 38 },
        ],
      },
      // Held in the dark: the mace leaves the altar and is his.
      {
        duration: 1.8,
        fadeIn: 60,
        cues: [
          {
            at: 0,
            essential: true,
            run: (s) => {
              s.level.cue?.('take-mace');
              void s.player.equip(KITS.dwarka).catch((err) => console.error('[Island] the mace did not load', err));
            },
          },
          { at: 0.4, run: () => SoundFX.getInstance().playCardHit() },
        ],
        camera: (s): CameraKey[] => [{ pos: s.at('hero', 1.4, 1.3, 1.2), look: s.pos('hero').add(v(0, 0.9, 0)), fov: 38 }],
      },
      // From the dark: he has turned from the altar with the mace in his hands, the lamps behind him; the voice sends
      // him on.
      {
        fadeIn: 1.4,
        ease: ease.drift,
        sway: 0.012,
        linesAt: 1.6,
        cues: [
          { at: 0, actor: 'hero', place: ISLAND.beforeAltar, face: WAY_OUT },
          { at: 0, actor: 'hero', play: 'IDLE' },
          { at: 0.5, actor: 'hero', clip: 'power_up' },
        ],
        lines: [{
          speaker: 'Voice in the shrine',
          text: 'Then it will not grow heavy in your hands. Go to Dwarka. The one who holds it fights with a mace, and has not met its equal.',
          voice: 'island_end_voice_2',
        }],
        camera: (s): CameraKey[] => [
          { pos: s.at('hero', 3.0, -1.0, 0.8), look: s.pos('hero').add(v(0, 1.3, 0)), fov: 40 },
          { pos: s.at('hero', 2.5, -0.85, 0.9), look: s.pos('hero').add(v(0, 1.35, 0)), fov: 37 },
        ],
      },
      // Close on him.
      {
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.01,
        linesAt: 0.8,
        cues: [{ at: 0, actor: 'hero', play: 'IDLE' }],
        lines: [{ speaker: 'Yudhveer', text: 'He will meet it now.' }],
        camera: (s): CameraKey[] => [
          { pos: s.at('hero', 1.7, 0.7, 1.55), look: s.head('hero'), fov: 36 },
          { pos: s.at('hero', 1.5, 0.6, 1.55), look: s.head('hero'), fov: 33 },
        ],
      },
      // Down off the dais toward the tunnel; the camera stays by the altar and rises, and the lamps close behind him.
      {
        duration: 6,
        fadeIn: 0.2,
        fadeOut: 1.8,
        ease: ease.drift,
        cues: [{ at: 0.3, actor: 'hero', moveTo: WAY_OUT }],
        camera: [
          { pos: v(-1.2, -0.6, -77.8), look: v(0, -1.0, -68), fov: 44 },
          { pos: v(-1.6, 1.4, -78.4), look: v(0.3, -1.5, -66), fov: 48 },
        ],
      },
    ],
  },
};

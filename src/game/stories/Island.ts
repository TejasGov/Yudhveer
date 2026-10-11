import * as THREE from 'three';
import { ease, type CameraKey } from '../../cinematics/CinematicDirector';
import type { ChapterStory, Stage } from '../../cinematics/Scene';
import { SoundFX } from '../../combat/SoundFX';
import { KITS } from '../Progression';
import { ISLAND } from '../../levels/Level5_Island';
import { ISLAND_FOES } from '../IslandExpedition';
import { grade } from '../../cinematics/Entrance';
import { GURU } from '../../entities/characters/Village';
import { ISLAND_SOUL } from '../../entities/characters/IslandDemoness';
import { Extra } from '../../entities/Extra';

/*
 * Chapter III: the island (docs/STORY.md, "Chapter III" and "Milestone 7"). He comes ashore in a sea cave with the
 * akhada's sword and dhal, goes down through the lamp-lit caves to the shrine, and takes up the blessed mace from its
 * altar: the chapter is won when he lifts it. The boatman and the voice in the shrine are generated voices; Yudhveer
 * is the user's own recordings.
 *
 * The mace in his hands, before he goes on to Dwarka (the user, 2026-10-07: moved here from the prologue's end), the
 * guru's promise comes back to him as a memory: the picture drains to black and white and the guru stands before him
 * on the dais, his voice echoing; then the boy's answer, Raghu's word, kept though life goes.
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

/** How long `great_sword_power_up` plays (s): the mace is gathered, then he stands at ease. */
const POWER_UP_SECONDS = 3.03;

/*
 * The demoness's release scene (below): the soul rises beside the corpse, walks to the rock seal, opens it with a word and
 * walks into the lit shrine. Its shots, in scene seconds (SEAL_AT is when the seal's own sequence starts, its doors split
 * `SEAL_SPLIT` later; her walks are timed with a second's slack either side of what the seal needs):
 *   fall (2.0)  rising (3.4)  at the seal (3.5: SEAL_AT 2.1, then the split)  through it (2.6)  the lit shrine (6.2): 17.7 s
 */
const SEAL_AT = 2.1;
const SEAL_SPLIT = 1.4;
/** Where she faces while the seal wakes: the middle of its mandala. */
const SEAL_FACE = v(0.9, -2.45, -72.6);

/**
 * Where her released soul rises: off the corpse's flank on the side of the way in (the body is four metres across, and she
 * must not stand in it), a little toward the hero, and on the seal's side of the chamber (her walk to it passes clear of the
 * body). Pushed farther along if the hero is standing there.
 */
const soulSpawn = (s: Stage): THREE.Vector3 => {
  const boss = s.pos(ISLAND_FOES.boss), hero = s.pos('hero');
  const p = boss.clone().add(v(2.7, 0, 0.9));
  p.x = THREE.MathUtils.clamp(p.x, 2.7, 3.5);
  if (Math.hypot(hero.x - p.x, hero.z - p.z) < 1.5) { p.x = Math.min(3.5, p.x + 0.6); p.z -= 0.9; }
  return p;
};

export const ISLAND_STORY: ChapterStory = {
  // The guru, only as a memory at the end (out of sight until then).
  cast: [
    { id: 'guru', rig: GURU, at: v(0, -2.1, -70), hidden: true },
    { id: 'island_soul', rig: ISLAND_SOUL, at: v(0, -2.45, -68.5), hidden: true,
      shade: { color: 0x9adbea, opacity: 0.55, grounded: true } },
  ],

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
          { speaker: 'Yudhveer', text: 'Then wait for me until the tide turns.', voice: 'island_open_hero_2' },
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
    { on: { when: (s) => s.pos('hero').z < -6.5 }, lines: [{ speaker: 'Yudhveer', text: 'Still burning. Who keeps these lamps?', voice: 'island_walk_hero_1' }] },
    { on: { when: (s) => allDown(s, ISLAND_FOES.hall) }, lines: [{ speaker: 'Yudhveer', text: 'Small, and many. So this is where the others ended.', voice: 'island_walk_hero_2' }] },
    {
      on: { when: (s) => near(s, ISLAND.water, 8.5) },
      run: () => SoundFX.getInstance().playRoar(0.45, 'naga'),
      lines: [{ speaker: 'Yudhveer', text: 'Something moves in the water. Keep to the stone.' }],
    },
    {
      on: { when: (s) => s.pos('hero').z < -56 && allDown(s, [...ISLAND_FOES.pool, ...ISLAND_FOES.poolBehind]) },
      lines: [{ speaker: 'Yudhveer', text: 'Warm air, and ghee burning. The shrine is close.', voice: 'island_walk_hero_4' }],
    },
    {
      on: { when: (s) => s.pos('hero').z < -63 },
      lines: [{ speaker: 'Voice in the shrine', text: 'Many have come down for it. None has carried it up.', voice: 'island_shrine_voice_1' }],
    },
    {
      on: { when: s => !!s.actor(ISLAND_FOES.boss)?.group.visible },
      scene: {
        id: 'island-demoness-reveal',
        shots: [{
          duration: 3, fadeIn: 0.2,
          camera: s => [
            { pos: s.pos(ISLAND_FOES.boss).add(v(3.5, 1.1, 4)), look: s.head(ISLAND_FOES.boss), fov: 48 },
            { pos: s.pos(ISLAND_FOES.boss).add(v(3.0, 1.4, 3.4)), look: s.head(ISLAND_FOES.boss), fov: 44 },
          ],
        }],
      },
    },
    {
      on: { fallen: ISLAND_FOES.boss },
      scene: {
        id: 'island-soul-release',
        shots: [
          // Her fall, from the way in.
          {
            duration: 2.0, fadeIn: 0.25,
            camera: s => [{ pos: s.pos(ISLAND_FOES.boss).add(v(3, 2.3, 4)), look: s.pos(ISLAND_FOES.boss).add(v(0, 1.2, 0)), fov: 46 }],
          },
          // Her soul rises off the corpse's flank (never out of it), seen low in profile against the cave's gate; "Follow me" and
          // she walks to the seal. The camera is close, so the body is out of the frame.
          {
            duration: 3.4, fadeIn: 0.3,
            ease: ease.drift,
            sway: 0.01,
            cues: [
              { at: 0, actor: 'island_soul', place: soulSpawn, face: 'hero' },
              { at: 0, actor: 'island_soul', appear: true, over: 1.4 },
              { at: 1.2, actor: 'island_soul', moveTo: ISLAND.sealMark, face: SEAL_FACE },
            ],
            linesAt: 0.9,
            lines: [{ speaker: 'Released soul', text: 'The binding is broken. Follow me.', hold: 2.4 }],
            camera: (s): CameraKey[] => {
              // Low and close while she rises, then on past her shoulder as she turns and walks off north to the seal.
              const p = s.pos('island_soul');
              return [
                { pos: p.clone().add(v(0.4, 0.2, 1.8)), look: p.clone().add(v(0, 1.15, 0)), fov: 36 },
                { pos: p.clone().add(v(0.9, 0.3, 1.0)), look: p.clone().add(v(-0.05, 1.5, -1.0)), fov: 36 },
                { pos: p.clone().add(v(1.5, 0.45, -0.4)), look: p.clone().add(v(-0.1, 1.5, -2.5)), fov: 40 },
              ];
            },
          },
          // At the seal, wide, from over her shoulder and above the corpse: the gate and its runes with her small before it, and a
          // slow push in while its sequence builds (the runes ignite, the rumble, the cracks), to the instant the doors split.
          {
            duration: SEAL_AT + SEAL_SPLIT, fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.012,
            linesAt: 0.4,
            lines: [{ speaker: 'Released soul', text: 'Behind this stone, the lamps still burn.', hold: 2.4 }],
            cues: [
              // The opening is gameplay, so skipping the scene must also open the seal (its collider goes at once).
              { at: SEAL_AT, essential: true, run: s => s.level.cue?.('open-shrine') },
            ],
            camera: [
              { pos: v(4.4, -0.9, -68.0), look: v(1.0, 0.25, -72.0), fov: 52 },
              { pos: v(4.1, -1.3, -68.9), look: v(0.9, 0.25, -72.0), fov: 50 },
            ],
          },
          // The doors split and slide away into the rock (a shake as they go): the camera, on from where it was, swings round the gate's
          // edge as the light floods through, to look in at the opening; she walks in. The shrine's voice calls over the shot after this.
          {
            duration: 2.6,
            ease: ease.inOut,
            sway: 0.008,
            carryLines: true,
            linesAt: 1.0,
            lines: [{ speaker: 'Voice in the shrine', text: 'Come, then. Come and lift it, if you can.', voice: 'island_shrine_voice_2' }],
            cues: [
              { at: 0.8, actor: 'island_soul', moveTo: ISLAND.inside, face: ISLAND.altar },
            ],
            camera: [
              { pos: v(4.1, -1.3, -68.9), look: v(0.9, 0.25, -72.0), fov: 50 },
              { pos: v(4.7, -0.6, -70.8), look: v(0.9, -0.4, -74.2), fov: 50 },
            ],
          },
          // The lit shrine, held: the altar and its torana, the lamps come up, motes drifting; she walks in and stands before it
          // while the voice finishes, the camera gliding along the gate's face (a lateral move across the opening) to look in squarely
          // from its threshold. (She is settled on her mark whether or not she got there.)
          {
            duration: 6.2,
            ease: ease.drift,
            sway: 0.01,
            cues: [
              { at: 3.4, essential: true, run: s => {
                const soul = s.actor('island_soul');
                soul?.setPosition(ISLAND.inside.x, ISLAND.inside.y, ISLAND.inside.z);
                if (soul instanceof Extra) soul.appear(true, 0);
              } },
            ],
            camera: [
              { pos: v(4.7, -0.6, -70.8), look: v(0.9, -0.4, -74.2), fov: 50 },
              { pos: v(2.4, -0.85, -71.0), look: v(0.8, -0.6, -75.5), fov: 51 },
              { pos: v(0.1, -1.0, -71.2), look: v(0.7, -0.7, -76.3), fov: 53 },
            ],
          },
        ],
      },
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
          // On the altar's dais (its top is at -2.115): placed 2.5 cm inside it, he snagged and walked on the spot.
          { at: 0, actor: 'hero', place: v(0, -2.1, -73.4), face: ISLAND.altar },
          { at: 0.3, actor: 'hero', moveTo: ISLAND.beforeAltar, face: ISLAND.altar },
        ],
        lines: [{ speaker: 'Voice in the shrine', text: 'Lift it, if you do not lift it for yourself.', voice: 'island_end_voice_1' }],
        // From behind the altar, in front of the torana (its pillars stand at z -77.9 to -78.3, x 0.4 to 0.8).
        camera: [
          { pos: v(1.15, -0.72, -77.62), look: v(0, -0.65, -74.2), fov: 46 },
          { pos: v(0.95, -0.78, -77.5), look: v(0, -0.6, -74.4), fov: 42 },
        ],
      },
      // Close on the mace in its lamplight.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.01,
        lines: [{ speaker: 'Yudhveer', text: 'Not for myself. For my guru, and against the ones who took him.', voice: 'island_end_hero_1' }],
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
      // him on. The mace gathers its power in his two fists (the Great Sword Pack's "Power Up", the mace laid through
      // both hands as in the fight), then he settles at ease with it low at his side. The hero's own one-handed "Power
      // Up" swung the mace's gold head across his face about 3 s in, and was held on its last frame, there, for the
      // rest of the voice's 13 s.
      {
        fadeIn: 1.4,
        ease: ease.drift,
        sway: 0.012,
        linesAt: 1.6,
        cues: [
          { at: 0, actor: 'hero', place: ISLAND.beforeAltar, face: WAY_OUT },
          { at: 0, actor: 'hero', play: 'IDLE' },
          { at: 0.5, actor: 'hero', clip: 'great_sword_power_up' },
          { at: 0.5 + POWER_UP_SECONDS + 0.1, actor: 'hero', play: 'IDLE' },
        ],
        lines: [{
          speaker: 'Voice in the shrine',
          text: 'Then it will not grow heavy in your hands. Go to Dwarka. The one who holds it fights with a mace, and has not met its equal.',
          voice: 'island_end_voice_2',
        }],
        // From his left (it was from his right, where the mace held out before him came between the lens and his face).
        camera: (s): CameraKey[] => [
          { pos: s.at('hero', 2.9, 1.3, 0.8), look: s.pos('hero').add(v(0, 1.3, 0)), fov: 40 },
          { pos: s.at('hero', 2.5, 1.1, 0.9), look: s.pos('hero').add(v(0, 1.35, 0)), fov: 37 },
        ],
      },
      // Close on him.
      {
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.01,
        linesAt: 0.8,
        cues: [{ at: 0, actor: 'hero', play: 'IDLE' }],
        lines: [{ speaker: 'Yudhveer', text: 'He will meet it now.', voice: 'island_end_hero_2' }],
        camera: (s): CameraKey[] => [
          { pos: s.at('hero', 1.7, 0.7, 1.55), look: s.head('hero'), fov: 36 },
          { pos: s.at('hero', 1.5, 0.6, 1.55), look: s.head('hero'), fov: 33 },
        ],
      },
      // The memory: the picture drains to black and white and the guru stands before him on the dais, where the lamps
      // are; his voice comes back, echoing: the promise. Over the boy's shoulder at him.
      {
        duration: 4.4,
        fadeIn: 0.6,
        ease: ease.drift,
        sway: 0.008,
        carryLines: true,
        linesAt: 0.7,
        cues: [
          { at: 0, run: () => grade(1, 0.5) },
          { at: 0, actor: 'guru', place: (s: Stage) => s.at('hero', 1.9, 0, 0), face: 'hero' },
          { at: 0, run: (s) => s.actor('guru')?.playClip('breathing_idle', { fade: 0 }) },
          { at: 0, actor: 'guru', show: true },
          { at: 0.1, run: () => SoundFX.getInstance().playTempleBell(1.6, 0) },
        ],
        lines: [{
          speaker: 'Guru',
          text: "Promise me, Yudhveer... when the time comes, you'll search for the truth. You'll go to the Baoli.",
          voice: 'prologue_end_guru_2',
          echo: { gap: 0.38, feedback: 0.5, wet: 0.5 },
          look: 'memory',
        }],
        camera: (s): CameraKey[] => {
          const guru = s.at('hero', 1.9, 0, 0);
          const look = guru.clone().add(v(0, 1.6, 0));
          return [
            { pos: s.at('hero', -0.9, -0.45, 1.7), look, fov: 36 },
            { pos: s.at('hero', -0.6, -0.4, 1.68), look, fov: 32 },
          ];
        },
      },
      // Close on the boy as the voice goes on and the memory fades: the guru is gone again.
      {
        duration: 5.0,
        fadeIn: 0.5,
        ease: ease.drift,
        sway: 0.008,
        cues: [
          { at: 0, actor: 'guru', show: false },
          { at: 3.6, run: () => grade(0, 1.2) },
        ],
        camera: (s): CameraKey[] => [
          { pos: s.at('hero', 1.1, 0.35, s.head('hero').y - s.pos('hero').y - 0.05), look: s.head('hero'), fov: 30 },
          { pos: s.at('hero', 0.9, 0.3, s.head('hero').y - s.pos('hero').y - 0.08), look: s.head('hero'), fov: 27 },
        ],
      },
      // His answer, low in front of him, the shrine's lamps behind: the word of Raghu's line is kept, though life goes.
      {
        fadeIn: 0.25,
        ease: ease.drift,
        sway: 0.01,
        linesAt: 0.5,
        cues: [{ at: 0, run: () => grade(0, 0) }],
        lines: [{ speaker: 'Yudhveer', text: 'रघुकुल रीत सदा चली आई, प्राण जाइ बरु बचनु न जाई', voice: 'prologue_end_hero_3' }],
        camera: (s): CameraKey[] => [
          { pos: s.at('hero', 2.1, 0.45, 1.0), look: s.head('hero').add(v(0, 0.02, 0)), fov: 34 },
          { pos: s.at('hero', 1.75, 0.38, 1.12), look: s.head('hero').add(v(0, 0.02, 0)), fov: 31 },
        ],
      },
      // Down off the dais toward the tunnel; the camera stays by the altar and rises, and the lamps close behind him.
      {
        duration: 6,
        fadeIn: 0.2,
        fadeOut: 1.8,
        ease: ease.drift,
        cues: [
          // Out of the memory, however it went (a skip): in colour, the guru gone.
          { at: 0, run: () => grade(0, 0), essential: true },
          { at: 0, actor: 'guru', show: false, essential: true },
          { at: 0.3, actor: 'hero', moveTo: WAY_OUT },
        ],
        camera: [
          { pos: v(-1.2, -0.6, -77.55), look: v(0, -1.0, -68), fov: 46 },
          { pos: v(-1.5, 1.2, -77.6), look: v(0.3, -1.5, -66), fov: 50 },
        ],
      },
    ],
  },
};

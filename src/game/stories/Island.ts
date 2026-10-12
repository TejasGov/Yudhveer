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
import { soulRelease, type SoulRelease } from '../../cinematics/DivineLight';
import { SceneFX } from '../../cinematics/SceneFX';
import { PhysicsWorld } from '../../core/PhysicsWorld';

/*
 * Chapter III: the island (docs/STORY.md, "Chapter III" and "Milestone 7"). He comes ashore in a sea cave with the
 * akhada's sword and dhal, goes down through the lamp-lit caves to the shrine, and takes up the blessed mace from its
 * altar: the chapter is won when he lifts it. The boatman and the apsara (the Spider Demoness's bound soul, set free
 * when she falls) are generated voices; Yudhveer is the user's own recordings.
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
 * The demoness's release scene (below), timed to the apsara's 8 s piece (`apsara`, from her death: full to about 4.5 s, then
 * fading out): light leaves the corpse and gathers into a column, the apsara forms in it head bowed, lifts her head and
 * speaks as the music fades; she walks to the rock seal, opens it with a word and walks into the lit shrine. Its shots, in
 * scene seconds (SEAL_AT is when the seal's own sequence starts, its doors split `SEAL_SPLIT` later; her walks are timed
 * with a second's slack either side of what the seal needs; every voiced line ends inside its shot or the shots it is
 * carried over):
 *   fall (1.6)  the light leaves her (1.8)  she forms (2.4)  she turns to him (3.3)  she sets off (1.7)  at the seal (4.9:
 *   SEAL_AT 3.5, then the split)  through it (2.6)  the lit shrine (6.2): 24.5 s
 */
const FALL = 1.6;
const GATHER = 1.8;
/** When she starts to form in the light (scene seconds). */
const FORM_AT = FALL + GATHER;
/** How long she takes to form (the dissolve up from her feet). */
const FORMING = 1.6;
const SEAL_AT = 3.5;
const SEAL_SPLIT = 1.4;
/** Where she faces while the seal wakes: the middle of its mandala. */
const SEAL_FACE = v(0.9, -2.45, -72.6);

/**
 * Where her released soul rises, in the chamber before the seal (metres: the floor there is solid, and the walk from its far
 * edge to the seal's mark takes less time than the runes need to ignite). The keeper has no leash, so her corpse may lie
 * anywhere she chased the hero; the soul never rises outside this.
 */
const SOUL_ZONE = { x0: -4.5, x1: 5.5, z0: -71, z1: -67.6 };
/** How far from the middle of the corpse she must rise (the body is four metres across), and from the hero. */
const BODY_CLEAR = 2.5;
const HERO_CLEAR = 1.5;

/**
 * Where her released soul rises: off the corpse's flank on the side of the way in (she must not stand in the body), a
 * little toward the hero, and on the seal's side of the chamber (her walk to it passes clear of the body). The spot is
 * worked out from the corpse but kept in the chamber (`SOUL_ZONE`): a corpse down the corridor does not draw her after it,
 * and one lying where she would rise (or the hero standing there) moves her to the nearest free spot instead of into it.
 */
const soulSpawn = (s: Stage): THREE.Vector3 => {
  const boss = s.pos(ISLAND_FOES.boss), hero = s.pos('hero');
  const z = SOUL_ZONE, mark = ISLAND.sealMark;
  const free = (x: number, y: number) => x >= z.x0 && x <= z.x1 && y >= z.z0 && y <= z.z1
    && Math.hypot(x - boss.x, y - boss.z) >= BODY_CLEAR && Math.hypot(x - hero.x, y - hero.z) >= HERO_CLEAR;
  // Off the corpse's flank (x relative to it, within the seal's side of the zone), a little toward the hero.
  let px = THREE.MathUtils.clamp(boss.x + 2.7, 2.7, 3.5), pz = THREE.MathUtils.clamp(boss.z + 0.9, z.z0, z.z1);
  if (!free(px, pz)) {
    // Taken (the body, the hero): the free spot nearest the seal's mark (her walk stays short), not far from where she would have risen.
    const wx = px, wz = pz;
    let best = Infinity;
    for (let x = z.x0; x <= z.x1 + 1e-6; x += 0.25) {
      for (let y = z.z0; y <= z.z1 + 1e-6; y += 0.25) {
        if (!free(x, y)) continue;
        const cost = Math.hypot(x - mark.x, y - mark.z) + 0.3 * Math.hypot(x - wx, y - wz);
        if (cost < best) { best = cost; px = x; pz = y; }
      }
    }
  }
  return v(px, boss.y, pz);
};

/** The light of her release, set up (dark) as the demoness is revealed, so her death does not wait on its shaders. */
let release: SoulRelease | null = null;
const releaseOf = (s: Stage): SoulRelease => (release?.alive ? release : (release = soulRelease(s.level.group)));

/** `to`, or short of it toward `from` if rock stands between them: a cutscene camera kept out of the stone. */
const clearOf = (from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 => {
  const dir = to.clone().sub(from);
  const dist = dir.length();
  const hit = dist > 1e-3 ? PhysicsWorld.getInstance().castCameraRay(from, dir.divideScalar(dist), dist + 0.3) : null;
  return hit === null ? to : from.clone().addScaledVector(dir, Math.max(0.5, hit - 0.3));
};

const soulOf = (s: Stage): Extra | null => {
  const soul = s.actor('island_soul');
  return soul instanceof Extra ? soul : null;
};

/**
 * Which way she faces as she forms: away from the body (whose bulk would otherwise stand between her and the camera before
 * her), turned up to 57 degrees toward the hero. She turns the rest of the way to him once she has lifted her head.
 */
const formFacing = (s: Stage): THREE.Vector3 => {
  const p = soulSpawn(s), c = s.pos(ISLAND_FOES.boss), h = s.pos('hero');
  const away = Math.atan2(p.x - c.x, p.z - c.z);
  const toHero = Math.atan2(h.x - p.x, h.z - p.z) - away;
  const yaw = away + THREE.MathUtils.clamp(Math.atan2(Math.sin(toHero), Math.cos(toHero)), -1, 1);
  return p.add(v(Math.sin(yaw), 0, Math.cos(yaw)));
};

export const ISLAND_STORY: ChapterStory = {
  // The guru, only as a memory at the end (out of sight until then).
  cast: [
    { id: 'guru', rig: GURU, at: v(0, -2.1, -70), hidden: true },
    // Her released soul: a body of moonlight (silver in shadow, pale gold lit, drawn opaque and dissolved in), walking
    // gracefully; her light, halo, motes and the trail at her steps come with it (entities/RadiantShade.ts).
    { id: 'island_soul', rig: ISLAND_SOUL, at: v(0, -2.45, -68.5), hidden: true,
      shade: {
        color: 0xb4c8ea, grounded: true, graceful: true,
        radiant: {
          gold: 0xffe2ae, glow: 0.46, lit: 0.5, rim: 0xd2e6ff, rimStrength: 0.7, own: 0.34, shimmer: 0.08,
          light: { color: 0xffdcae, cool: 0xa9c9ff, intensity: 2.6, distance: 3.2, height: 0.3 },
          motes: 26, aura: 0.1, trail: 7,
        },
      } },
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

  // His thoughts on the way down, spoken over the walk (and the fights); the demoness, her bound soul's whisper, her release.
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
    // The demoness; and from inside her, faint and far off, the woman bound in her. (Her whisper was a beat at the chamber's
    // mouth, but the reveal follows within a step or two there and cut it off: it is the reveal's own line now.)
    {
      on: { when: s => !!s.actor(ISLAND_FOES.boss)?.group.visible },
      run: (s) => {
        releaseOf(s);
        SoundFX.getInstance().music.prefetch('apsara');
      },
      scene: {
        id: 'island-demoness-reveal',
        shots: [
          {
            duration: 3, fadeIn: 0.2,
            linesAt: 0.6,
            carryLines: true,
            lines: [{
              speaker: "A woman's voice",
              text: 'Many have come down for it... none has carried it up. Free me.',
              voice: 'island_soul_0',
              echo: { gap: 0.3, feedback: 0.4, wet: 0.55 },
            }],
            camera: s => [
              { pos: s.pos(ISLAND_FOES.boss).add(v(3.5, 1.1, 4)), look: s.head(ISLAND_FOES.boss), fov: 48 },
              { pos: s.pos(ISLAND_FOES.boss).add(v(3.0, 1.4, 3.4)), look: s.head(ISLAND_FOES.boss), fov: 44 },
            ],
          },
          // Close on the woman's face the spider wears, while the whisper finishes ("Free me").
          {
            duration: 3.6, fadeIn: 0.15,
            ease: ease.drift,
            sway: 0.008,
            camera: s => {
              const head = s.head(ISLAND_FOES.boss);
              return [
                // (the head bone is at the top of her neck: her face is a hand above it)
                { pos: head.clone().add(v(1.8, 0.08, 2.2)), look: head.clone().add(v(0, 0.13, 0)), fov: 28 },
                { pos: head.clone().add(v(1.5, 0.1, 1.85)), look: head.clone().add(v(0, 0.14, 0)), fov: 25 },
              ];
            },
          },
        ],
      },
    },
    {
      on: { fallen: ISLAND_FOES.boss },
      scene: {
        id: 'island-soul-release',
        shots: [
          // Her fall, from the way in. The apsara's piece begins as she goes down (the boss's music let go quickly: the cave goes
          // quiet under it), and the light starts to seep out of her.
          {
            duration: FALL, fadeIn: 0.25,
            cues: [
              // Where she will form, out of sight: her light kindles there before she does.
              { at: 0, actor: 'island_soul', place: soulSpawn, face: formFacing },
              { at: 0, run: () => {
                const music = SoundFX.getInstance().music;
                music.dim(false);
                music.play('apsara', { fadeIn: 0.05, fadeOut: 0.7 });
                music.then('island');
              } },
              { at: 0, run: s => {
                const soul = soulOf(s), body = s.actor(ISLAND_FOES.boss);
                if (!soul || !body) return;
                soul.bow = 1;
                releaseOf(s).start(body, soul, FORM_AT);
              } },
            ],
            camera: s => [{ pos: s.pos(ISLAND_FOES.boss).add(v(3, 2.3, 4)), look: s.pos(ISLAND_FOES.boss).add(v(0, 1.2, 0)), fov: 46 }],
          },
          // The light leaves her: gold motes seep up off the body and spiral into a column beside it, where she will stand; the
          // cave darkens round it. Square to the light, on the chamber's open side: the column in the middle, the body coming in.
          {
            duration: GATHER, fadeIn: 0.3,
            ease: ease.drift,
            sway: 0.008,
            camera: (s): CameraKey[] => {
              const p = s.pos('island_soul'), c = s.pos(ISLAND_FOES.boss);
              const away = p.clone().sub(c).setY(0);
              if (away.lengthSq() < 1e-6) away.set(1, 0, 0);
              away.normalize();
              const side = v(-away.z, 0, away.x);
              if (side.z < 0) side.negate();
              const look = p.clone().lerp(c, 0.25).add(v(0, 0.95, 0));
              const at = (out: number, across: number, up: number) => clearOf(look, p.clone().addScaledVector(away, out).addScaledVector(side, across).add(v(0, up, 0)));
              return [
                { pos: at(0.3, 2.9, 0.9), look, fov: 46 },
                { pos: at(0.3, 2.5, 1.0), look: look.clone().add(v(0, 0.15, 0)), fov: 45 },
              ];
            },
          },
          // She forms in the light, head bowed (dissolving in from her feet as the motes go into her): a crane up from her feet
          // to her face, three-quarters from the front on the side away from him. She lifts her head, and turns to him.
          {
            duration: 2.4, fadeIn: 0.35,
            ease: (t) => 1 - Math.pow(1 - t, 2.2),
            sway: 0.006,
            cues: [
              { at: 0, actor: 'island_soul', appear: true, over: FORMING },
              { at: 0.3, actor: 'hero', face: 'island_soul' },
              { at: 1.2, run: s => {
                const soul = soulOf(s);
                if (soul) SceneFX.tween(0.9, (k) => { soul.bow = 1 - k; });
              } },
              { at: 1.9, actor: 'island_soul', face: 'hero' },
            ],
            camera: (s): CameraKey[] => {
              const p = s.pos('island_soul'), h = s.pos('hero');
              const yaw = s.actor('island_soul')?.group.rotation.y ?? 0;
              // `at`'s side is her left; the camera goes on the side he is not
              const k = Math.cos(yaw) * (h.x - p.x) - Math.sin(yaw) * (h.z - p.z) < 0 ? 1 : -1;
              const chest = p.clone().add(v(0, 1.1, 0));
              // where her face will be (she is still down in the ground as the shot starts: not her head bone's now)
              const face = p.clone().add(v(0, 0.9 * s.height('island_soul'), 0));
              return [
                { pos: clearOf(chest, s.at('island_soul', 2.1, k * 1.1, 0.5)), look: p.clone().add(v(0, 0.6, 0)), fov: 38 },
                { pos: clearOf(chest, s.at('island_soul', 1.8, k * 0.95, 1.0)), look: p.clone().add(v(0, 1.1, 0)), fov: 34 },
                { pos: clearOf(chest, s.at('island_soul', 1.6, k * 0.85, 1.45)), look: face, fov: 31 },
              ];
            },
          },
          // Over his shoulder (the one away from the body) to her as she turns to him: her first words, as the music fades.
          {
            duration: 3.3, fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.008,
            cues: [
              // however it went (a skip): her head up
              { at: 0, essential: true, run: s => { const soul = soulOf(s); if (soul) soul.bow = 0; } },
              { at: 2.4, run: () => SoundFX.getInstance().music.dim(true) },
            ],
            linesAt: 0.15,
            carryLines: true,
            lines: [{ speaker: 'The apsara', text: 'The binding is broken... Follow me, Yudhveer.', voice: 'island_soul_1' }],
            camera: (s): CameraKey[] => {
              const eyes = s.head('hero'), her = s.head('island_soul'), c = s.pos(ISLAND_FOES.boss);
              const to = her.clone().sub(eyes).setY(0).normalize();
              const right = v(to.z, 0, -to.x);
              if (right.dot(c.sub(eyes)) > 0) right.negate();
              return [
                { pos: clearOf(eyes, eyes.clone().addScaledVector(to, -1.5).addScaledVector(right, 0.65).add(v(0, 0.12, 0))), look: her, fov: 31 },
                { pos: clearOf(eyes, eyes.clone().addScaledVector(to, -1.15).addScaledVector(right, 0.5).add(v(0, 0.08, 0))), look: her.clone().add(v(0, -0.04, 0)), fov: 28 },
              ];
            },
          },
          // "Follow me": she turns from him and sets off for the seal, toward the camera (waiting low on her way there, to the side
          // away from the body), him behind her. The island's own music comes in under the rest of the scene.
          {
            duration: 1.7, fadeIn: 0.1,
            ease: ease.drift,
            sway: 0.008,
            cues: [{ at: 0.1, actor: 'island_soul', moveTo: ISLAND.sealMark, face: SEAL_FACE }],
            camera: (s): CameraKey[] => {
              const p = s.pos('island_soul'), c = s.pos(ISLAND_FOES.boss);
              const way = ISLAND.sealMark.clone().sub(p).setY(0);
              if (way.lengthSq() < 1e-6) way.set(0, 0, -1);
              way.normalize();
              const side = v(-way.z, 0, way.x);
              if (side.dot(c.sub(p)) > 0) side.negate();
              const face = p.clone().add(v(0, 0.9 * s.height('island_soul'), 0));
              const at = (ahead: number, across: number) => clearOf(face, p.clone().addScaledVector(way, ahead).addScaledVector(side, across).add(v(0, 1.25, 0)));
              return [
                { pos: at(2.5, 0.9), look: face.clone().add(v(0, -0.15, 0)), fov: 38 },
                { pos: at(2.8, 1.0), look: face.clone().addScaledVector(way, 0.8).add(v(0, -0.15, 0)), fov: 38 },
              ];
            },
          },
          // At the seal, wide, from over her shoulder and above the corpse: the gate and its runes with her small before it, and a
          // slow push in while its sequence builds (the runes ignite, the rumble, the cracks), to the instant the doors split.
          {
            duration: SEAL_AT + SEAL_SPLIT, fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.012,
            linesAt: 0.2,
            lines: [{ speaker: 'The apsara', text: 'Behind this stone... the lamps still burn.', voice: 'island_soul_2' }],
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
          // edge as the light floods through, to look in at the opening; she walks in, calling him after her (over the shot after this).
          {
            duration: 2.6,
            ease: ease.inOut,
            sway: 0.008,
            carryLines: true,
            linesAt: 1.0,
            lines: [{ speaker: 'The apsara', text: 'Come. It has waited a long time for you.', voice: 'island_soul_3' }],
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
              // however it went (a skip): the light of her release gone, the picture back
              { at: 0, essential: true, run: () => release?.end() },
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

  // The extraction: he takes up the blessed mace, and the apsara, standing by the altar, sends him on to Dwarka.
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
          // she turns from the altar to him as he comes
          { at: 0.6, actor: 'island_soul', face: 'hero' },
        ],
        lines: [{ speaker: 'The apsara', text: 'Lift it... if you do not lift it for yourself.', voice: 'island_soul_4' }],
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
      // From the dark: he has turned from the altar with the mace in his hands, the lamps behind him; the apsara sends
      // him on. The mace gathers its power in his two fists (the Great Sword Pack's "Power Up", the mace laid through
      // both hands as in the fight), then he settles at ease with it low at his side. The hero's own one-handed "Power
      // Up" swung the mace's gold head across his face about 3 s in, and was held on its last frame, there, for the
      // rest of the old voice's 13 s.
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
          speaker: 'The apsara',
          text: 'Then it will not grow heavy in your hands. Go to Dwarka. The one who holds it fights with a mace... and has not met its equal.',
          voice: 'island_soul_5',
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

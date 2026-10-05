import * as THREE from 'three';
import { ease, type CameraKey } from '../../cinematics/CinematicDirector';
import type { ChapterStory, Stage } from '../../cinematics/Scene';
import { awaken, dawn, intoLight, type StatueMarks } from '../../cinematics/DivineLight';
import { SceneFX } from '../../cinematics/SceneFX';
import { ParticleFX } from '../../combat/ParticleFX';
import { SoundFX } from '../../combat/SoundFX';
import { GURU } from '../../entities/characters/Village';

/*
 * Chapter V, the Kailasha summit (STORY.md, "Chapter V" and "Milestone 9"). The fight is as it was: rakshasas (and
 * now the yatudhana sorcerers among them) over the bridges, then Andhaka's entrance and the last fight. This is what
 * comes after: the guru, thought dead and in truth Andhaka's captive, is found at the feet of Shiva's statue, where
 * Andhaka carried him to give his soul to his god. He is Shiva. Andhaka carried his own judge up the mountain.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * The statue of Shiva on the dais (`Monument_LordShiva` in charnel_ridge.glb: x -4.2..4.2, y 3.7..13.6, z -18.3..
 * -11.4), facing down the stair toward the arena and the bridges.
 */
const STATUE: StatueMarks = { head: v(0, 12.8, -14.4), feet: v(0, 4.1, -14.6), facing: v(0, 0, 1) };
/** The front of the dais, at the statue's feet (its top is 4 m up; the stair comes up to it from the arena). */
const DAIS_Y = 4.05;
/** Where the guru kneels, bound for the sacrifice: at Shiva's feet, a little to the west of the stair's head. */
const GURU_MARK = v(-1.7, DAIS_Y, -10.35);
/** Facing down the stair. */
const GURU_FACE = v(-1.7, DAIS_Y, 0);
/** Where the boy stops beside him (east of him, a step down the dais toward the stair). */
const BESIDE_GURU = v(-0.55, DAIS_Y, -9.55);
/** At the foot of the stair, looking up it. */
const STAIR_FOOT = v(0.7, 0, 3.4);
/** Where Andhaka's body is moved to (in the dark) if he fell where the guru kneels. */
const CLEAR_OF_GURU = v(2.6, DAIS_Y, -9.7);

/**
 * How far into his `death` clip the guru is held: sunk to the ground, slumped, his staff still in his hand (a
 * captive's pose; he has no kneel of his own). PLACEHOLDER until he has a bound, kneeling clip.
 */
const KNEEL_AT = 1.5;

/** The guru, held slumped on the ground (see KNEEL_AT). */
function kneel(s: Stage): void {
  const guru = s.actor('guru');
  if (!guru?.playClip('death', { fade: 0 })) return;
  guru.rig?.hold(KNEEL_AT);
}

/** The boy goes down on one knee (Mixamo "Kneeling Down", held on the knee once down). */
function heroKneels(s: Stage): void {
  s.player.stateMachine.changeState('IDLE');
  s.player.playClip('kneeling_down', { fade: 0.3, timeScale: 1.15 });
}

/**
 * On his knees, his palms pressed together before his chest (anjali: Mixamo's kneeling "Praying" with the arms laid by
 * IK, game asset/characters/anjali_post.py; plain "Praying" in a build without it), unless he is already praying.
 */
function heroPrays(s: Stage): void {
  const clip = s.player.rig?.clipInfo('praying_anjali') ? 'praying_anjali' : 'praying';
  if (s.player.rig?.clip === clip) return;
  s.player.playClip(clip, { fade: 0.9 });
}

/**
 * Before he kneels to pray he lays his dhal down: it lies on the stone at his side (put back on his arm when the
 * chapter is left).
 */
function layDownShield(s: Stage): void {
  const hand = s.player.rig?.socket('Socket_Hand_L');
  if (!hand) return;
  const h = s.pos('hero');
  const yaw = s.player.group.rotation.y;
  for (const item of [...hand.children]) {
    const home = { position: item.position.clone(), quaternion: item.quaternion.clone(), scale: item.scale.clone() };
    const scale = item.getWorldScale(new THREE.Vector3());
    s.level.group.add(item);
    // Flat on the stone at his left, face up.
    item.position.copy(h).add(v(Math.cos(yaw) * 0.75, 0.04, -Math.sin(yaw) * 0.75));
    item.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, yaw + 0.4));
    item.scale.copy(scale);
    SceneFX.onClear(() => {
      hand.add(item);
      item.position.copy(home.position);
      item.quaternion.copy(home.quaternion);
      item.scale.copy(home.scale);
    });
  }
}

/** The effects for the reveal, set up dark in the opening black (adding lights rebuilds shaders: not on camera). */
interface Reveal {
  guruToLight: (seconds: number) => void;
  statueWakes: (seconds: number) => void;
}
let reveal: Reveal | null = null;

/** A point `up` metres above a mark. */
const above = (p: THREE.Vector3, up: number) => p.clone().add(v(0, up, 0));

/** Under this share of his health in Andhaka's fight, the guru's voice comes back to him (once a fight). */
const LOW_HEALTH = 0.35;

export const SUMMIT_STORY: ChapterStory = {
  cast: [
    // Out of sight through the fight (Andhaka has him at the statue's feet); found when it is over.
    { id: 'guru', rig: GURU, at: GURU_MARK, face: GURU_FACE, hidden: true },
  ],

  beats: [
    // Hurt badly in the last fight, he hears his guru's first lesson again (the prologue's recording, remembered), so
    // the ending's "You kept your feet" answers it. Andhaka's fight only: his arrival gives the hero back his health,
    // and a line spent on the waves would leave the fight that matters without it.
    {
      on: { when: (s) => s.actor('andhaka') !== null && s.player.currentHealth / s.player.maxHealth < LOW_HEALTH },
      lines: [{ speaker: 'Guru', text: 'Breathe. Feet first.', voice: 'prologue_fight_guru_2' }],
    },
  ],

  ending: {
    id: 'summit-ending',
    shots: [
      // From black, high over the arena: Andhaka fallen, the boy standing over him in the snow. He sheathes his blade.
      // Then a voice from above, from the dais: his name.
      {
        duration: 6.2,
        fadeIn: 1.6,
        ease: ease.drift,
        linesAt: 4.4,
        cues: [
          { at: 0, actor: 'boss', place: (s) => (s.pos('boss').distanceTo(GURU_MARK) < 2.8 || s.pos('boss').distanceTo(BESIDE_GURU) < 2 ? CLEAR_OF_GURU : s.pos('boss')) },
          { at: 0, actor: 'hero', place: (s) => (s.pos('boss').distanceTo(STAIR_FOOT) < 1.8 ? STAIR_FOOT.clone().add(v(-2.2, 0, 0.6)) : STAIR_FOOT), face: 'boss' },
          { at: 0, actor: 'guru', place: GURU_MARK, face: GURU_FACE },
          { at: 0, actor: 'guru', show: true },
          { at: 0, run: kneel },
          {
            at: 0,
            run: (s) => {
              reveal = { guruToLight: intoLight(s.level.group, s.actor('guru')!), statueWakes: awaken(s.level.group, s.level.group, STATUE) };
              SoundFX.getInstance().music.prefetch('shiva');
            },
          },
          { at: 1.4, actor: 'hero', play: 'SHEATHE' },
        ],
        lines: [{ speaker: 'Guru', text: 'Yudhveer.', voice: 'summit_end_guru_1' }],
        camera: (s): CameraKey[] => {
          const mid = s.pos('hero').lerp(s.pos('boss'), 0.5);
          return [
            { pos: v(8.5, 7.2, 13.5), look: above(mid, 0.6), fov: 42 },
            { pos: v(6.8, 5.6, 11.6), look: above(mid, 0.9), fov: 40 },
          ];
        },
      },
      // Low in front of him: he turns toward the voice, up the stair.
      {
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.015,
        linesAt: 1.1,
        cues: [{ at: 0.2, actor: 'hero', face: GURU_MARK }],
        lines: [{ speaker: 'Yudhveer', text: 'Guruji?' }],
        camera: (s): CameraKey[] => {
          const h = s.pos('hero');
          const up = GURU_MARK.clone().sub(h).setY(0).normalize();
          const side = v(-up.z, 0, up.x);
          return [
            { pos: h.clone().addScaledVector(up, 2.2).addScaledVector(side, 0.9).setY(h.y + 1.25), look: above(h, 1.55), fov: 36 },
            { pos: h.clone().addScaledVector(up, 1.9).addScaledVector(side, 0.75).setY(h.y + 1.3), look: above(h, 1.55), fov: 33 },
          ];
        },
      },
      // Over his shoulder, up the stair: at the head of it, at the feet of the god, his guru on his knees. He runs.
      {
        duration: 5.2,
        fadeIn: 0.12,
        ease: ease.inOut,
        cues: [{ at: 1.3, actor: 'hero', moveTo: BESIDE_GURU, gait: 'run', face: 'guru' }],
        camera: (s): CameraKey[] => {
          const h = s.pos('hero');
          const up = GURU_MARK.clone().sub(h).setY(0).normalize();
          const side = v(-up.z, 0, up.x);
          return [
            { pos: h.clone().addScaledVector(up, -1.6).addScaledVector(side, -0.8).setY(h.y + 1.7), look: above(GURU_MARK, 2.4), fov: 40 },
            { pos: h.clone().addScaledVector(up, 1.5).addScaledVector(side, -0.9).setY(h.y + 1.9), look: above(GURU_MARK, 2.0), fov: 38 },
          ];
        },
      },
      // On the dais, side on: the boy comes to him and goes down on one knee beside him.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.012,
        linesAt: 1.8,
        cues: [
          { at: 0, actor: 'hero', place: BESIDE_GURU, face: 'guru' },
          { at: 0.5, run: heroKneels },
        ],
        lines: [
          { speaker: 'Yudhveer', text: 'Guruji... you live.' },
          { speaker: 'Guru', text: 'I live. He meant my soul for his god, and carried me all the way up the mountain to give it.', voice: 'summit_end_guru_2' },
        ],
        // Side on to the two of them, from over the head of the stair (inside its west coping).
        camera: [
          { pos: v(-3.0, DAIS_Y + 1.6, -6.8), look: v(-1.15, DAIS_Y + 0.6, -10.0), fov: 38 },
          { pos: v(-2.7, DAIS_Y + 1.5, -7.2), look: v(-1.15, DAIS_Y + 0.65, -10.0), fov: 36 },
        ],
      },
      // Cut: both of them on their feet, the bonds gone. Low on the guru, the statue rising behind him.
      {
        fadeIn: 0.2,
        ease: ease.drift,
        sway: 0.01,
        linesAt: 0.8,
        cues: [
          { at: 0, actor: 'guru', play: 'IDLE' },
          { at: 0, actor: 'hero', play: 'IDLE' },
          { at: 0, actor: 'guru', face: 'hero' },
          { at: 0, actor: 'hero', face: 'guru' },
        ],
        lines: [
          { speaker: 'Guru', text: 'You kept your feet, Yudhveer.', voice: 'summit_end_guru_3' },
          { speaker: 'Yudhveer', text: 'I said I would find you. Even at the top of the world.' },
        ],
        camera: (s): CameraKey[] => {
          const g = s.pos('guru');
          const toHero = s.pos('hero').sub(g).setY(0).normalize();
          const side = v(-toHero.z, 0, toHero.x);
          // His head as he stands (he is still slumped as the shot is framed: the cut stands him up).
          const look = above(g, 1.5);
          return [
            { pos: g.clone().addScaledVector(toHero, 2.9).addScaledVector(side, 1.7).setY(g.y + 1.45), look, fov: 36 },
            { pos: g.clone().addScaledVector(toHero, 2.6).addScaledVector(side, 1.5).setY(g.y + 1.5), look, fov: 33 },
          ];
        },
      },
      // The irony, quietly, over the boy's shoulder; then the guru looks up at the statue.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.01,
        cues: [{ at: 0.2, run: () => SoundFX.getInstance().music.dim(true) }],
        lines: [
          { speaker: 'Guru', text: 'He gathered wise souls to throw down Mahadeva. He never asked whose soul he carried up the mountain.', voice: 'summit_end_guru_4' },
          { speaker: 'Guru', text: 'Look up, Yudhveer.', voice: 'summit_end_guru_5' },
        ],
        camera: (s): CameraKey[] => {
          const h = s.pos('hero');
          const toGuru = s.pos('guru').sub(h).setY(0).normalize();
          const side = v(-toGuru.z, 0, toGuru.x);
          const look = s.head('guru');
          return [
            { pos: h.clone().addScaledVector(toGuru, -0.9).addScaledVector(side, -0.6).setY(h.y + 1.75), look, fov: 34 },
            { pos: h.clone().addScaledVector(toGuru, -0.8).addScaledVector(side, -0.5).setY(h.y + 1.72), look, fov: 31 },
          ];
        },
      },
      // He becomes light: it gathers in him, motes rise off him, and he fades into it.
      {
        duration: 6,
        fadeIn: 0.25,
        ease: ease.drift,
        cues: [
          { at: 0, actor: 'guru', face: GURU_FACE },
          { at: 0.5, run: () => reveal?.guruToLight(5.4) },
          // His glory's music (docs/STORY.md, "The village and the reveal"): the conch sounds as the light swells in
          // him, at once, over the dimmed summit loop; its damru and drums come in as the statue wakes.
          {
            at: 0.5,
            run: () => {
              const music = SoundFX.getInstance().music;
              music.dim(false);
              music.play('shiva', { fadeIn: 0.03 });
            },
          },
        ],
        // In front of him and to his west, clear of the boy.
        camera: [
          { pos: above(GURU_MARK, 1.55).add(v(-0.7, 0, 3.0)), look: above(GURU_MARK, 1.1), fov: 40 },
          { pos: above(GURU_MARK, 1.5).add(v(-0.55, 0, 2.5)), look: above(GURU_MARK, 1.2), fov: 38 },
        ],
      },
      // Where he stood the light goes up: the camera rises up the statue to its face as the stone wakes and the halo
      // kindles. The light finds Andhaka where he lies, and he is ash.
      {
        duration: 7,
        fadeIn: 0.2,
        ease: ease.inOut,
        cues: [
          { at: 0.2, run: () => reveal?.statueWakes(4.8) },
          {
            at: 1.6,
            run: (s) => {
              const body = s.actor('andhaka');
              if (!body?.group.visible) return;
              const fx = ParticleFX.getInstance();
              for (let i = 0; i < 4; i++) fx.spawnDustPuff(above(body.getPosition(), i * 0.35), 30);
              body.group.visible = false;
            },
          },
        ],
        camera: [
          { pos: v(-0.6, DAIS_Y + 1.6, -6.4), look: above(GURU_MARK, 1.4), fov: 42 },
          { pos: v(0.1, DAIS_Y + 3.0, -4.6), look: v(-0.4, 8.2, -12.5), fov: 44 },
          { pos: v(0.6, 8.2, -2.4), look: STATUE.head, fov: 44 },
        ],
      },
      // Up at the statue's face, lit, from the boy's side: the voice is the guru's still, and not only his.
      {
        fadeIn: 0.2,
        ease: ease.drift,
        sway: 0.01,
        linesAt: 0.6,
        lines: [{ speaker: 'Shiva', text: 'Every lesson was mine to give. Every step was yours to take.', voice: 'summit_reveal_shiva_1' }],
        // From down the stair: the whole of the god in his light, the dark steps under the words.
        camera: [
          { pos: v(1.7, DAIS_Y - 0.6, -1.2), look: STATUE.head.clone().add(v(0, -3.2, 0)), fov: 46 },
          { pos: v(1.4, DAIS_Y - 0.3, -2.2), look: STATUE.head.clone().add(v(0, -2.9, 0)), fov: 44 },
        ],
      },
      // The boy, looking up into the light, goes down on one knee.
      {
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.012,
        linesAt: 1.4,
        duration: 5.4,
        cues: [
          { at: 0, actor: 'hero', face: STATUE.feet },
          { at: 0, run: layDownShield },
          { at: 0.3, run: heroKneels },
          // Down on his knees, he joins his palms before Shiva.
          { at: 2.4, run: heroPrays },
        ],
        lines: [{ speaker: 'Yudhveer', text: 'Mahadeva...' }],
        camera: (s): CameraKey[] => {
          const h = s.pos('hero');
          // Low behind him, to his west: the boy small, going down before the lit feet of the god; then round in front
          // of him, the god's light on his face, as he joins his palms.
          return [
            { pos: h.clone().add(v(-2.4, 0.85, 1.8)), look: above(h, 0.95).add(v(0, 0, -0.9)), fov: 40 },
            { pos: h.clone().add(v(-2.1, 0.8, 1.5)), look: above(h, 0.95).add(v(0, 0, -0.9)), fov: 38 },
            { pos: h.clone().add(v(-1.6, 0.9, -1.5)), look: above(h, 0.85).add(v(0.1, 0, 0)), fov: 38 },
          ];
        },
      },
      // The eclipse passes. From behind and below him, the camera draws back and up off the dais: the boy small at the
      // god's feet in the new light. Fade to black, and the credits.
      {
        duration: 11,
        fadeIn: 0.25,
        fadeOut: 3,
        ease: ease.drift,
        linesAt: 1.2,
        cues: [
          { at: 0, run: heroPrays },
          { at: 0, run: () => dawn(9, 1.9) },
          { at: 0.1, run: () => SoundFX.getInstance().music.dim(false) },
        ],
        lines: [{ speaker: 'Shiva', text: 'The dark is lifted from the mountain. Go home, Yudhveer, and teach what you have learned.', voice: 'summit_reveal_shiva_2' }],
        camera: [
          { pos: v(1.4, DAIS_Y + 1.6, -5.4), look: v(0, 8.5, -14), fov: 46 },
          { pos: v(2.6, 6.8, 4.5), look: v(0, 8.0, -14), fov: 48 },
          { pos: v(3.6, 9.5, 14), look: v(0, 8.0, -14), fov: 50 },
        ],
      },
    ],
  },
};

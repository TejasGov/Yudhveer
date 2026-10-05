import * as THREE from 'three';
import { ease, joltCamera, type CameraKey } from '../../cinematics/CinematicDirector';
import { Concussion } from '../../cinematics/Concussion';
import type { ActorRef, ChapterStory, SceneCue, Stage } from '../../cinematics/Scene';
import { SceneFX } from '../../cinematics/SceneFX';
import { ParticleFX } from '../../combat/ParticleFX';
import { SoundFX } from '../../combat/SoundFX';
import { Voices } from '../../combat/Voices';
import { SceneManager } from '../../core/SceneManager';
import type { Character } from '../../entities/Character';
import { ANDHAKA_SHADOW, GURU, RAIDER, VILLAGER_ELDER, VILLAGER_MAN, VILLAGER_WOMAN, VILLAGER_WOMAN_B } from '../../entities/characters/Village';
import { VILLAGE_GATE as GATE, VILLAGE_MANDIR as MANDIR, type Level0_Village } from '../../levels/Level0_Village';

/*
 * The prologue, "The Last Lesson" (docs/STORY.md, "Prologue", "Milestone 4" and "The prologue's ending"): the lesson at
 * dusk, the raid, the fight he cannot win, and what it costs him.
 *
 * The ending is told from inside the boy's head once he is struck down: concussed, he sees Andhaka mostly as a
 * shadow (a low light just inside the gate throws it down the courtyard, over him and up the south wall), hears him
 * through ringing ears, and sees him clearly for well under a second when his eyes fight into focus. The guru steps
 * between them, is struck down and dragged away; the boy wakes at night by the burning roof and walks out of the
 * gate, his own shadow now running ahead of him into the desert.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** The training circle (the north gate is GATE), and where the guru waits out the fight (by the neem tree). */
const LESSON_HERO = v(0, 0, 1.4);
const LESSON_GURU = v(0, 0, -1.3);
const GURU_ASIDE = v(-4.7, 0, -0.5);
/** Where the boy goes down (facing the gate), and where Andhaka comes to stand over him. */
const KNEEL = v(0, 0, 1);
const ANDHAKA_FROM = v(0, 0, -13.6);
const OVER_HIM = v(0, 0, -2.0);
/** Where the guru stands between them (a little to the side, so he falls beside the boy, not on him). */
const BETWEEN = v(-0.45, 0, -0.9);
/** Behind the boy's left shoulder: the raider who brings him down. */
const BEHIND_HIM = v(-0.75, 0, 2.25);
/** Where the boy is put to walk out of the gate in the last shot, and where he stops outside it. */
const AT_GATE = v(0, 0, -8.6);
const OUTSIDE = v(0, 0, -14.6);
/** Every raider the fight could have brought on (the waves' ids). */
const RAIDERS = Array.from({ length: 9 }, (_, i) => `raider_${i + 1}`);

/** The raiders still standing after the fight: loose about him, not a ring; aside for Andhaka; and out of the gate. */
const LOOSE = [v(-2.7, 0, 2.6), v(2.3, 0, 3.1), v(2.9, 0, -0.4), v(-3.1, 0, -1.3), v(-1.6, 0, 4.4), v(3.6, 0, 1.6)];
const ASIDE = [v(-3.3, 0, 3.0), v(3.0, 0, 3.6), v(3.6, 0, -1.9), v(-3.6, 0, -2.6), v(-2.2, 0, 4.9), v(4.2, 0, 1.1)];
// (Into the gateway, not through it: fighters have bodies and no paths round the gate's pillars. They are gone by the
// time his eyes open again.)
const EXIT = [v(-0.8, 0, -9.3), v(0.9, 0, -9.7), v(-0.1, 0, -10.2), v(0.4, 0, -8.6), v(-1.1, 0, -8.4), v(1.2, 0, -8.9)];

/**
 * The villagers (story cast, placeholders: docs/STORY.md, "The village and the reveal"). The raid's dead lie where they
 * fell from the start of the ending: a man on the path from the gate, an old man by the burning hut, a woman by the
 * north-west hut's door. Through the dusk shots the living cower at the edges (behind the well, at the mandir's steps,
 * by the houses); at night they mourn: the wife kneels by her husband's body, the son weeps over his father, the old
 * man sits dazed against the house wall, a woman prays at the mandir by its lamps.
 */
const DEAD_MAN = v(1.9, 0, -5.2);
const DEAD_ELDER = v(4.4, 0, -3.3);
const DEAD_WOMAN = v(-4.9, 0, -4.5);
/** The courtyard's sides, for the living to face away from the raid. */
const VILLAGERS: { id: string; dusk: { at: THREE.Vector3; face: THREE.Vector3; clip: string; from?: number }; night: { at: THREE.Vector3; face: THREE.Vector3; clip: string; from?: number } }[] = [
  // The wife: cowering by the house door at dusk; at night, on her knees by her husband's body.
  { id: 'v_woman', dusk: { at: v(3.9, 0, 6.6), face: GATE, clip: 'terrified' }, night: { at: DEAD_MAN.clone().add(v(0.95, 0, 0.5)), face: DEAD_MAN, clip: 'kneeling_idle' } },
  // Another woman: hidden behind the well at dusk; at night kneeling in prayer at the mandir's step, by its lamps, her
  // palms pressed together (anjali: Praying with the arms laid by IK, game asset/characters/anjali_post.py).
  { id: 'v_woman_b', dusk: { at: v(7.6, 0, 3.1), face: v(6.4, 0, 2.0), clip: 'hiding' }, night: { at: MANDIR.clone().add(v(0.15, 0, -0.55)), face: MANDIR.clone().add(v(0.15, 0, 4)), clip: 'praying_anjali' } },
  // The old man: frozen with fear at the mandir's step; at night sitting dazed against the house's wall.
  { id: 'v_elder', dusk: { at: MANDIR.clone().add(v(1.0, 0, -0.45)), face: GATE, clip: 'terrified', from: 3 }, night: { at: v(5.9, 0, 7.15), face: v(5.9, 0, 0), clip: 'sitting_dazed', from: 2 } },
  // The son: hiding by the north-west hut at dusk; at night standing over his father's body, weeping. He crouches
  // against the hut's south-west side, well clear of the woman who fell at its door: her death clip throws her head
  // 0.4 m toward where he was, and his crouched foot was on her face (1.6 m from her head now, 1.9 m from her mark).
  { id: 'v_man', dusk: { at: v(-6.75, 0, -4.1), face: v(-9.5, 0, -3.3), clip: 'hiding' }, night: { at: DEAD_ELDER.clone().add(v(1.0, 0, 0.9)), face: DEAD_ELDER, clip: 'crying' } },
];
const DEAD: { id: string; at: THREE.Vector3; face: THREE.Vector3; clip: string }[] = [
  { id: 'v_dead_man', at: DEAD_MAN, face: v(0.6, 0, -9.5), clip: 'falling_forward_death' },
  { id: 'v_dead_elder', at: DEAD_ELDER, face: v(7.7, 0, -7.3), clip: 'falling_back_death' },
  { id: 'v_dead_woman', at: DEAD_WOMAN, face: v(-1, 0, -9), clip: 'dying_backwards' },
];

/** Everyone in the village where the raid left them (the dusk shots: the dead fallen, the living cowering). */
function villagersAtDusk(): SceneCue[] {
  return [
    ...DEAD.flatMap((d): SceneCue[] => [
      { at: 0, actor: d.id, place: d.at, face: d.face },
      { at: 0, actor: d.id, show: true },
      { at: 0, run: (s) => pose(s, d.id, d.clip, { from: 4, fade: 0 }) },
    ]),
    ...VILLAGERS.flatMap((w): SceneCue[] => [
      { at: 0, actor: w.id, place: w.dusk.at, face: w.dusk.face },
      { at: 0, actor: w.id, show: true },
      { at: 0, run: (s) => pose(s, w.id, w.dusk.clip, { from: w.dusk.from ?? 0, fade: 0 }) },
    ]),
  ];
}

/** The living after the raid, a long while later (the night shots). */
function villagersAtNight(): SceneCue[] {
  return VILLAGERS.flatMap((w): SceneCue[] => [
    { at: 0, actor: w.id, place: w.night.at, face: w.night.face },
    { at: 0, run: (s) => pose(s, w.id, w.night.clip, { from: w.night.from ?? 0, fade: 0 }) },
  ]);
}

const alive = (s: Stage) => s.enemies.filter((e) => e.stateMachine.currentState !== 'DEAD' && e.group.visible);
const village = (s: Stage) => s.level as Level0_Village;

/** Each raider still standing, to its own mark in `marks` (walking, or put there at once), facing `face`. */
function raiders(marks: THREE.Vector3[], how: 'place' | 'walk', face: ActorRef | THREE.Vector3, at = 0): SceneCue[] {
  return RAIDERS.map((id): SceneCue => {
    const mark = (s: Stage) => {
      const i = alive(s).findIndex((e) => e.id === id);
      return i < 0 ? s.pos(id) : marks[i % marks.length].clone();
    };
    const when = at + (Number(id.split('_')[1]) % 4) * 0.25;
    return how === 'place' ? { at, actor: id, place: mark, face } : { at: when, actor: id, moveTo: mark, face };
  });
}

/**
 * Plays one of a character's clips from `from` (clip seconds; or from its end, reversed) and freezes it at `hold`:
 * a fall stopped on its knees, a collapse played backwards as a struggle up off the ground.
 */
function pose(s: Stage, who: ActorRef, clip: string, o: { from?: number; hold?: number; timeScale?: number; fade?: number; reverse?: boolean } = {}): void {
  const actor = s.actor(who);
  if (!actor?.playClip(clip, { fade: o.fade ?? 0.25, timeScale: o.timeScale, reverse: o.reverse })) return;
  const rig = actor.rig!;
  if (o.from !== undefined) rig.seek(o.from);
  const hold = o.hold;
  if (hold === undefined) return;
  SceneFX.every(() => {
    if (rig.clip !== clip) return false;
    if (o.reverse ? rig.time <= hold : rig.time >= hold) {
      rig.hold(hold);
      return false;
    }
    return true;
  });
}

/** A giant's tread: every stride `who` takes, a thud felt through the ground (and a puff of dust), until hidden. */
function footfalls(s: Stage, who: ActorRef, stride: number, gain: number): void {
  const actor = s.actor(who);
  if (!actor) return;
  const last = actor.getPosition().clone();
  let walked = 0;
  SceneFX.every(() => {
    if (!actor.group.visible) return false;
    const p = actor.getPosition();
    walked += Math.hypot(p.x - last.x, p.z - last.z);
    last.copy(p);
    if (walked < stride) return true;
    walked -= stride;
    SoundFX.getInstance().playHeavyStep(gain);
    joltCamera(0.025 * gain, 0.3);
    ParticleFX.getInstance().spawnDustPuff(p.clone(), 5);
    return true;
  });
}

/**
 * The bearer drags the fallen guru off by the arms: the body slides along behind him, head first toward his heels,
 * until the bearer is hidden.
 */
function drag(s: Stage, bearer: string, body: string): void {
  const b = s.actor(bearer);
  const g = s.actor(body);
  if (!b || !g) return;
  // Where his head lies from his feet, in his own frame (the fall's last pose).
  g.group.updateMatrixWorld(true);
  const head = s.head(body).sub(g.getPosition()).setY(0).applyAxisAngle(new THREE.Vector3(0, 1, 0), -g.group.rotation.y);
  const headYaw = Math.atan2(head.x, head.z);
  SceneFX.every(() => {
    if (!b.group.visible) return false;
    const bp = b.getPosition();
    const back = v(-Math.sin(b.group.rotation.y), 0, -Math.cos(b.group.rotation.y));
    const hands = bp.clone().addScaledVector(back, 0.7);
    const toward = bp.clone().sub(g.getPosition()).setY(0);
    if (toward.lengthSq() > 1e-4) g.group.rotation.y = Math.atan2(toward.x, toward.z) - headYaw;
    const h = head.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), g.group.rotation.y);
    g.setPosition(hands.x - h.x, 0, hands.z - h.z);
    return true;
  });
}

let glintTexture: THREE.CanvasTexture | null = null;

/** A star of light on the cleaver's edge for a moment, as it catches the sun (blooms). */
function glint(s: Stage, who: ActorRef): void {
  const actor = s.actor(who) as Character | null;
  if (!actor) return;
  if (!glintTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,220,160,0.6)');
    r.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,240,220,0.9)';
    g.fillRect(0, 31, 64, 2);
    g.fillRect(31, 0, 2, 64);
    glintTexture = new THREE.CanvasTexture(c);
  }
  const material = new THREE.SpriteMaterial({ map: glintTexture, color: new THREE.Color(3, 2.4, 1.6), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const star = new THREE.Sprite(material);
  star.scale.setScalar(0.01);
  s.level.group.add(star);
  const fx = SceneManager.getInstance().postFX;
  fx.addBloom(star);
  let t = 0;
  const gone = () => {
    fx.removeBloom(star);
    star.removeFromParent();
    material.dispose();
  };
  SceneFX.onClear(gone);
  SceneFX.every((dt) => {
    t += dt;
    const { tip, hilt } = actor.getWeaponPoints();
    star.position.copy(hilt.lerp(tip, 0.82));
    const k = Math.sin(Math.min(1, t / 0.45) * Math.PI);
    star.scale.setScalar(0.04 + 0.26 * k);
    material.rotation = t * 1.5;
    if (t < 0.45) return true;
    gone();
    return false;
  });
}

/** His laugh (the summit's recording), heard through the boy's ringing ears; returns how to cut it off. */
function laugh(): () => void {
  let stop: (() => void) | null = null;
  let cut = false;
  const play = (buffer: AudioBuffer | null) => {
    if (buffer && !cut) stop = SoundFX.getInstance().playVoice(buffer, 0, 0.35);
  };
  const ready = Voices.get('andhaka_laugh');
  if (ready) play(ready);
  else void Voices.load('andhaka_laugh').then(play);
  return () => {
    cut = true;
    stop?.();
  };
}
let stopLaugh: (() => void) | null = null;

/** A tween of the place on the game's clock (the gate's light coming up, night falling). */
const fade = (seconds: number, apply: (k: number) => void, delay = 0) => SceneFX.tween(seconds, apply, { delay });

/** The boy's eyes when he is down: on his knees, head bowed; and lying in the dust, his head on its side. */
const KNEEL_EYES = v(0.03, 1.0, 0.72);
const DUST_EYES = v(-0.05, 0.19, 0.34);

export const PROLOGUE_STORY: ChapterStory = {
  cast: [
    // At the lesson: facing the boy across the training circle.
    { id: 'guru', rig: GURU, at: LESSON_GURU, face: LESSON_HERO },
    // Behind the raid, waiting beyond the gate until the boy is down; a slow, heavy tread when he comes.
    {
      id: 'andhaka',
      rig: { ...ANDHAKA_SHADOW, locomotion: { ...ANDHAKA_SHADOW.locomotion, walkSpeed: 1.15 } },
      at: ANDHAKA_FROM,
      face: KNEEL,
      hidden: true,
      silhouette: { color: 0xff8a3a },
    },
    // His men who are not in the fight: the one who brings the boy down, and the one who drags the guru away.
    { id: 'brute', rig: RAIDER, at: v(-6, 0, -16), hidden: true },
    { id: 'bearer', rig: RAIDER, at: v(6, 0, -16), hidden: true },
    // The villagers, alive and dead (see VILLAGERS, DEAD): out of sight until the ending.
    { id: 'v_woman', rig: VILLAGER_WOMAN, at: v(3.9, 0, 6.6), hidden: true },
    { id: 'v_woman_b', rig: VILLAGER_WOMAN_B, at: v(7.6, 0, 3.1), hidden: true },
    { id: 'v_elder', rig: VILLAGER_ELDER, at: v(-2.4, 0, 6.7), hidden: true },
    { id: 'v_man', rig: VILLAGER_MAN, at: v(-5.2, 0, -3.7), hidden: true },
    { id: 'v_dead_man', rig: VILLAGER_MAN, at: DEAD_MAN, hidden: true },
    { id: 'v_dead_elder', rig: { ...VILLAGER_ELDER, tint: 0xc8bcb0 }, at: DEAD_ELDER, hidden: true },
    { id: 'v_dead_woman', rig: VILLAGER_WOMAN_B, at: DEAD_WOMAN, hidden: true },
  ],

  // The last lesson, at dusk: the guru corrects the boy's stance, the sun is nearly down, then the horn at the gate.
  opening: {
    id: 'prologue-opening',
    shots: [
      // Side on to the two of them in the chalk circle, the boy on guard with his lathi in both hands: a sweep, then a
      // blow brought down from overhead (entered at the top of its swing, as his combo enters it: its own wind-up puts
      // the staff through his head), then on guard again. (Out of his calm stand, or back into it, the staff's foot
      // would swing past his legs as his hold changes.)
      {
        fadeIn: 0.5,
        ease: ease.drift,
        sway: 0.015,
        linesAt: 2.4,
        cues: [
          { at: 0, actor: 'hero', place: LESSON_HERO, face: 'guru' },
          { at: 0, actor: 'guru', place: LESSON_GURU, face: 'hero' },
          { at: 0, run: (s) => s.player.playClip('great_sword_idle', { fade: 0 }) },
          { at: 0.5, actor: 'hero', clip: 'great_sword_slash', timeScale: 1.1 },
          { at: 1.45, run: (s) => s.player.playClip('great_sword_slash_3', { startAt: 0.72, timeScale: 0.9, fade: 0.22 }) },
          { at: 2.9, run: (s) => s.player.playClip('great_sword_idle', { fade: 0.5 }) },
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
          // Their card, as they come out of the glow (the intro shows only the place, so it is shown here).
          { at: 2.0, run: (s) => s.cards.horde() },
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

  // The shot list, the shadow and the concussion: docs/STORY.md, "The prologue's ending".
  ending: {
    id: 'prologue-loss',
    shots: [
      // 1. The blow. Low in front of him, winded and swaying, a raider steps in behind him and swings. It lands.
      {
        duration: 2.0,
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.03,
        cues: [
          { at: 0, run: (s) => s.player.stateMachine.changeState('IDLE') },
          { at: 0, actor: 'hero', place: KNEEL, face: GATE },
          { at: 0, run: (s) => pose(s, 'hero', 'death_2', { fade: 0.15 }) },
          { at: 0, actor: 'brute', place: BEHIND_HIM.clone().add(v(-0.5, 0, 0.6)), face: 'hero' },
          { at: 0, actor: 'brute', show: true },
          ...raiders(LOOSE, 'place', 'hero'),
          { at: 0, actor: 'andhaka', place: ANDHAKA_FROM, face: KNEEL },
          { at: 0, actor: 'guru', place: GURU_ASIDE, face: 'hero' },
          ...villagersAtDusk(),
          { at: 0.05, actor: 'brute', moveTo: BEHIND_HIM, face: 'hero' },
          { at: 0.1, run: (s) => s.actor('brute')?.playClip('standing_melee_attack_horizontal', { fade: 0.2 }) },
          // The roof the raiders fired during the fight takes hold over the next minute.
          { at: 0, run: (s) => fade(14, (k) => village(s).setRaidFire(0.35 + 0.65 * k)) },
          { at: 0, run: (s) => fade(10, (k) => { village(s).smoulder.amount = 0.2 + 0.25 * k; }) },
          { at: 0, run: () => Voices.preload(['andhaka_laugh']) },
          {
            at: 1.05,
            run: (s) => {
              SoundFX.getInstance().playHitImpact('crush');
              Concussion.hit(1, 0.55);
              ParticleFX.getInstance().spawnDustPuff(s.pos('hero'), 8);
            },
          },
          // The blow to the head (Mixamo "Dying", head impact to two knees: he reels, then his knees go).
          { at: 1.0, run: (s) => pose(s, 'hero', 'head_impact_to_knees', { from: 0.15, fade: 0.08 }) },
        ],
        camera: [
          { pos: v(1.5, 1.05, -1.2), look: v(0, 1.15, 1.3), fov: 36 },
          { pos: v(1.3, 1.0, -0.95), look: v(0, 1.05, 1.3), fov: 33 },
        ],
      },
      // 2. On his knees. Ground level in front of him as he drops into the dust; the edges going dark.
      {
        duration: 2.8,
        ease: ease.drift,
        sway: 0.02,
        cues: [
          // His knees go (the clip's 2.2 - 2.7 s), held there upright, then settling into a kneel.
          { at: 0, run: (s) => pose(s, 'hero', 'head_impact_to_knees', { from: 1.15, hold: 2.72, fade: 0.05 }) },
          { at: 2.1, run: (s) => s.actor('hero')?.playClip('kneeling_idle', { fade: 0.7 }) },
          { at: 0.4, actor: 'brute', moveTo: v(-2.0, 0, 2.9), face: 'hero' },
          { at: 1.5, run: (s) => { SoundFX.getInstance().playBodyFall(0.7); ParticleFX.getInstance().spawnDustPuff(s.pos('hero'), 10); } },
          // The roof's sparks have caught the haystack by the south-west hut.
          { at: 0, run: (s) => fade(12, (k) => village(s).setHayFire(0.9 * k), 1) },
          { at: 1.2, run: () => Concussion.daze(0.75, 1.5) },
          { at: 2.3, run: () => Concussion.blink(0.25, 0.2, 0.3) },
        ],
        camera: [
          { pos: v(0.95, 0.34, -1.5), look: v(0, 0.72, 1.0), fov: 36 },
          { pos: v(0.8, 0.32, -1.25), look: v(0, 0.68, 1.0), fov: 34 },
        ],
      },
      // 3. Through his eyes, head hanging: the dust swims. The last of the light comes through the gate across the
      // ground before him; heavy footfalls; a shape slides down the light toward him and the light goes out of it.
      {
        duration: 5.2,
        fadeIn: 0.2,
        ease: ease.linear,
        sway: 0.05,
        cues: [
          { at: 0, run: (s) => fade(2.5, (k) => village(s).setGateLight(k)) },
          { at: 0, run: (s) => fade(6, (k) => village(s).setNight(0.35 * k)) },
          // The sun drops behind the west wall: only the gate's light is left on the courtyard floor.
          { at: 0, run: (s) => fade(3, (k) => village(s).setSun(1 - 0.85 * k)) },
          { at: 0, actor: 'andhaka', show: true },
          { at: 0.1, actor: 'andhaka', moveTo: OVER_HIM, face: 'hero' },
          { at: 0.1, run: (s) => footfalls(s, 'andhaka', 1.35, 1) },
          ...raiders(ASIDE, 'walk', 'andhaka', 1.6),
          { at: 2.2, actor: 'brute', moveTo: v(-3.3, 0, 2.3), face: 'andhaka' },
          { at: 2.9, run: () => Concussion.blink(0.12, 0.05, 0.25) },
          { at: 4.6, run: () => Concussion.blink(0.2, 0.1, 0.3) },
        ],
        camera: [
          { pos: KNEEL_EYES, look: v(0.05, 0, -1.0), fov: 52, roll: 0.1 },
          { pos: KNEEL_EYES.clone().add(v(0.02, 0.02, -0.03)), look: v(0, 0, -1.5), fov: 52, roll: 0.06 },
          { pos: KNEEL_EYES.clone().add(v(0.03, 0.03, -0.05)), look: v(-0.05, 0, -1.9), fov: 50, roll: 0.12 },
        ],
      },
      // 4. His shadow. From over Andhaka's path, low, looking south past the boy: the boy kneels in it, and the giant
      // shape grows up the south wall behind him with each step. Andhaka speaks; his words run on over the next shots.
      {
        duration: 5.6,
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.015,
        linesAt: 0.6,
        carryLines: true,
        cues: [{ at: 0, run: () => Concussion.daze(0.4, 0.8) }],
        // Captioned only as a voice: the boy does not know whose it is, and the Baoli Guardian is the first to name
        // Andhaka (Chapter I's ending).
        lines: [{ speaker: 'A voice', text: "A boy with a stick... Your guru's soul will burn before my god. Kneel.", voice: 'andhaka_prologue_kneel' }],
        camera: [
          { pos: v(0.32, 1.62, -1.05), look: v(-0.05, -0.2, 7.0), fov: 40 },
          { pos: v(0.28, 1.55, -0.8), look: v(-0.05, -0.15, 7.0), fov: 37 },
        ],
      },
      // 5. He tries to rise on his lathi, in the dark of the shadow, its edge gold behind him. (Keep your feet.)
      {
        duration: 2.0,
        ease: ease.drift,
        sway: 0.02,
        cues: [
          { at: 0, run: () => Concussion.daze(0.5, 0.6) },
          // He gets one foot under him (kneel to stand, held part way up) and can get no further.
          { at: 0.15, run: (s) => pose(s, 'hero', 'kneel_to_stand', { from: 0.1, hold: 0.62, timeScale: 0.45, fade: 0.5 }) },
        ],
        camera: [
          { pos: v(2.1, 0.62, 1.45), look: v(0, 0.88, 0.95), fov: 30 },
          { pos: v(1.9, 0.68, 1.35), look: v(0, 0.95, 0.95), fov: 29 },
        ],
      },
      // 6. He looks up. His eyes fight into focus for a moment: the giant against the sunset, the cleaver catching
      // the light ("Kneel."). The picture swims away again. The guru starts toward them.
      {
        duration: 1.3,
        ease: ease.linear,
        sway: 0.02,
        cues: [
          { at: 0, run: () => Concussion.daze(0.8, 0.2) },
          { at: 0, actor: 'guru', moveTo: BETWEEN, face: 'hero' },
          { at: 0.22, run: () => Concussion.focus(1, 0.18) },
          { at: 0.45, run: (s) => glint(s, 'andhaka') },
          { at: 0.9, run: () => Concussion.focus(0, 0.2) },
          { at: 0.5, actor: 'brute', moveTo: BEHIND_HIM, gait: 'run', face: 'hero' },
        ],
        camera: [
          { pos: KNEEL_EYES.clone().add(v(0.02, 0.1, 0.02)), look: v(0, 2.85, -2.0), fov: 44, roll: -0.05 },
          { pos: KNEEL_EYES.clone().add(v(0.02, 0.08, 0.0)), look: v(0, 2.95, -2.0), fov: 42, roll: -0.03 },
        ],
      },
      // 7. A blow from behind: he pitches forward into the dust, the world tipping over, and his eyes close.
      {
        duration: 1.2,
        ease: ease.in,
        sway: 0.02,
        cues: [
          { at: 0, run: (s) => s.actor('brute')?.playClip('standing_melee_attack_horizontal', { fade: 0.1, timeScale: 1.4 }) },
          { at: 0, run: (s) => pose(s, 'hero', 'death_2', { from: 2.25, fade: 0.1, timeScale: 1.3 }) },
          { at: 0.02, run: () => { SoundFX.getInstance().playHitImpact('crush'); Concussion.hit(1.1, 0.85); } },
          { at: 0.75, run: (s) => { SoundFX.getInstance().playBodyFall(1); ParticleFX.getInstance().spawnDustPuff(s.pos('hero').add(v(0, 0, -0.4)), 10); } },
          { at: 0.75, run: () => Concussion.lids(1, 0.4) },
        ],
        camera: [
          { pos: KNEEL_EYES.clone().add(v(0.02, 0.08, 0.0)), look: v(0, 2.6, -2.0), fov: 46, roll: 0.05 },
          { pos: v(0.0, 0.55, 0.45), look: v(-0.1, 0.5, -3.0), fov: 48, roll: 0.35 },
          { pos: DUST_EYES, look: v(-0.3, 0.45, -3.0), fov: 48, roll: 0.5 },
        ],
      },
      // 8. His eyes open on the dust, the world on its side. Andhaka's feet; the guru's feet and staff come between
      // them, and he turns and looks down at the boy.
      {
        duration: 3.6,
        fadeIn: 0.1,
        ease: ease.linear,
        sway: 0.03,
        cues: [
          { at: 0.1, run: () => Concussion.lids(0.15, 1.1) },
          { at: 0.3, actor: 'brute', moveTo: v(-1.9, 0, 2.8), face: 'andhaka' },
          { at: 2.4, run: () => Concussion.blink(0.18, 0.12, 0.35) },
        ],
        camera: [
          { pos: DUST_EYES, look: v(-0.3, 0.45, -3.0), fov: 48, roll: 0.5 },
          { pos: DUST_EYES.clone().add(v(0, 0.01, 0)), look: v(-0.3, 0.55, -3.0), fov: 46, roll: 0.46 },
        ],
      },
      // 9. The guru, close, in profile, lit by the burning roof: he turns from the boy to Andhaka.
      {
        fadeIn: 0.1,
        ease: ease.drift,
        sway: 0.01,
        linesAt: 0.9,
        cues: [
          { at: 0, actor: 'guru', place: BETWEEN, face: 'hero' },
          { at: 0, run: () => { Concussion.daze(0.3, 0.6); Concussion.focus(0.65, 0.8); Concussion.lids(0, 0.3); } },
          { at: 0.35, actor: 'guru', face: 'andhaka' },
        ],
        lines: [{ speaker: 'Guru', text: 'Leave the boy. It is me you came for.', voice: 'prologue_end_guru_1' }],
        camera: (s): CameraKey[] => {
          const head = s.head('guru');
          return [
            { pos: head.clone().add(v(2.9, -0.06, 0.45)), look: head.clone().add(v(0, -0.06, 0)), fov: 17 },
            { pos: head.clone().add(v(2.6, -0.05, 0.4)), look: head.clone().add(v(0, -0.05, 0)), fov: 16 },
          ];
        },
      },
      // 10. From the dust, up at the two of them, swimming: the giant laughs. The blade goes up and comes down; the
      // guru falls back beside the boy, and the boy's eyes shut.
      {
        duration: 4.0,
        fadeIn: 0.1,
        ease: ease.linear,
        sway: 0.03,
        cues: [
          { at: 0, run: () => { Concussion.daze(0.95, 0.4); Concussion.focus(0, 0.4); } },
          { at: 0.25, run: () => { stopLaugh = laugh(); } },
          { at: 2.35, run: (s) => s.actor('andhaka')?.playClip('standing_melee_attack_downward', { fade: 0.2 }) },
          { at: 2.95, run: () => SoundFX.getInstance().playFallingBlow() },
          { at: 3.15, run: (s) => pose(s, 'guru', 'impact', { fade: 0.05 }) },
          { at: 3.2, run: () => { Concussion.hit(0.6, 0.9); stopLaugh?.(); } },
          { at: 3.4, run: (s) => pose(s, 'guru', 'death', { fade: 0.2 }) },
          { at: 3.45, run: () => Concussion.lids(1, 0.35) },
        ],
        camera: [
          { pos: DUST_EYES, look: v(-0.2, 2.0, -2.0), fov: 50, roll: 0.42 },
          { pos: DUST_EYES.clone().add(v(0, 0.01, 0)), look: v(-0.2, 2.2, -2.0), fov: 48, roll: 0.38 },
        ],
      },
      // 11. Black: his cry.
      {
        duration: 1.8,
        fadeIn: 60,
        linesAt: 0.25,
        cues: [{ at: 0.7, run: (s) => SoundFX.getInstance().playBodyFall(0.5) }],
        lines: [{ speaker: 'Yudhveer', text: 'Guruji!' }],
        camera: [{ pos: DUST_EYES, look: v(0.25, 0.9, -8), fov: 46, roll: 0.45 }],
      },
      // 12. Eyes half open, the world on its side and swimming: in the bright gate, shapes going; a raider drags the
      // guru away by the arms; Andhaka goes after them; their long shadows reach back across the ground to the boy.
      // A horn. His eyes close.
      {
        duration: 5.6,
        ease: ease.linear,
        sway: 0.03,
        cues: [
          { at: 0, run: () => { Concussion.daze(0.9, 0.3); Concussion.lids(0.3, 1.0); } },
          { at: 0, actor: 'bearer', place: (s: Stage) => s.head('guru').setY(0).add(v(0.15, 0, -0.75)), face: GATE },
          { at: 0, actor: 'bearer', show: true },
          { at: 0.05, run: (s) => drag(s, 'bearer', 'guru') },
          { at: 0.15, actor: 'bearer', moveTo: v(0.5, 0, -17.5) },
          { at: 0.6, actor: 'andhaka', moveTo: v(-0.4, 0, -16.5) },
          { at: 0.6, run: (s) => footfalls(s, 'andhaka', 1.35, 0.6) },
          ...raiders(EXIT, 'walk', GATE.clone().add(v(0, 0, -10)), 0.9),
          { at: 1.3, actor: 'brute', moveTo: v(1.2, 0, -15.5) },
          { at: 2.2, run: () => Concussion.blink(0.3, 0.2, 0.5) },
          { at: 3.2, run: () => SoundFX.getInstance().playRaidHorn() },
          { at: 4.0, run: () => Concussion.lids(1, 1.5) },
        ],
        camera: [
          { pos: DUST_EYES, look: v(0.25, 0.9, -8), fov: 46, roll: 0.45 },
          { pos: DUST_EYES.clone().add(v(0, 0.01, 0)), look: v(0.2, 1.0, -8), fov: 45, roll: 0.42 },
        ],
      },
      // 13. Black, a long moment: the ringing ebbs, the fire's crackle comes up. Night falls; they are gone.
      {
        duration: 1.8,
        fadeIn: 60,
        cues: [
          { at: 0, run: () => Concussion.end(1.6) },
          { at: 0, actor: 'andhaka', show: false },
          { at: 0, actor: 'guru', show: false },
          { at: 0, actor: 'brute', show: false },
          { at: 0, actor: 'bearer', show: false },
          { at: 0, run: (s) => { for (const e of alive(s)) e.group.visible = false; }, essential: true },
          ...villagersAtNight(),
          {
            at: 0,
            run: (s) => {
              const place = village(s);
              place.setSun(1);
              place.setNight(1);
              place.setGateLight(0);
              // Burning lower now, a long while after; the haystack too.
              place.setRaidFire(0.7);
              place.setHayFire(0.6);
              place.smoulder.amount = 1;
            },
          },
        ],
        camera: [{ pos: DUST_EYES, look: v(0.25, 0.9, -8), fov: 46, roll: 0.45 }],
      },
      // 14. Later. High over the courtyard at night, slowly closer: the roof burning, its smoke leaning off across the
      // sky, sparks and ash coming down, and the boy alone in the dust of the circle. The chapter's cleared line comes
      // up over it, quietly: the prologue runs straight on into Chapter I, with no chapter-complete screen to say it.
      {
        duration: 6.0,
        fadeIn: 2.2,
        ease: ease.drift,
        sway: 0.012,
        cues: [
          { at: 0, run: () => Concussion.end(0), essential: true },
          { at: 1.8, run: (s) => s.cards.caption(s.chapter.clearedLine, 3.4) },
        ],
        camera: [
          { pos: v(-6.2, 4.4, 9.2), look: v(3.0, 1.3, -3.2), fov: 46 },
          { pos: v(-5.4, 3.8, 8.2), look: v(2.8, 1.3, -3.2), fov: 44 },
        ],
      },
      // 14b. The guru's mandir: low at its step, its lamps still burning and a woman praying before it; the camera
      // lifts past the bell to the saffron flag against the smoke.
      {
        duration: 4.2,
        fadeIn: 0.35,
        ease: ease.inOut,
        sway: 0.01,
        camera: [
          { pos: MANDIR.clone().add(v(1.6, 0.45, -2.6)), look: MANDIR.clone().add(v(-0.1, 0.9, 1.4)), fov: 38 },
          { pos: MANDIR.clone().add(v(1.9, 1.3, -3.3)), look: MANDIR.clone().add(v(-0.05, 2.7, 1.6)), fov: 40 },
          { pos: MANDIR.clone().add(v(2.1, 2.2, -3.9)), look: MANDIR.clone().add(v(0.0, 4.6, 1.8)), fov: 42 },
        ],
      },
      // 15. He pushes himself up out of the dust onto one knee, on the lathi, and stands.
      {
        duration: 4.6,
        fadeIn: 0.3,
        ease: ease.drift,
        sway: 0.015,
        cues: [
          // Up off his face onto his hands and knees, onto one knee, and up (Mixamo "Standing Up", from lying).
          { at: 0.1, run: (s) => pose(s, 'hero', 'stand_up_from_stomach', { from: 3.4, timeScale: 1.15, fade: 0.4 }) },
          { at: 4.3, run: (s) => s.actor('hero')?.playClip('calm_idle', { fade: 0.8 }) },
        ],
        camera: [
          { pos: v(2.3, 0.45, 1.75), look: v(0, 0.45, 0.85), fov: 34 },
          { pos: v(2.1, 0.8, 1.6), look: v(0, 0.95, 0.95), fov: 33 },
          { pos: v(2.0, 1.2, 1.5), look: v(0, 1.35, 1.0), fov: 32 },
        ],
      },
      // 16. His vow, close, the fire on his face and ash falling past it.
      {
        fadeIn: 0.25,
        ease: ease.drift,
        sway: 0.01,
        linesAt: 1.2,
        cues: [{ at: 0.1, actor: 'hero', play: 'IDLE' }, { at: 0.3, actor: 'hero', face: GATE }],
        lines: [{ speaker: 'Yudhveer', text: 'Guruji... I will find you. Even if I have to climb to the top of the world.' }],
        // In front of him, a little to his side, so the guru's mandir stands behind him: its lamps, the bell in its
        // porch and the saffron flag over his shoulder; his face lit by the burning roof.
        camera: (s): CameraKey[] => {
          const h = s.pos('hero');
          const toShrine = MANDIR.clone().add(v(0, 0, 1.6)).sub(h).setY(0).normalize();
          const side = v(-toShrine.z, 0, toShrine.x);
          const look = h.clone().add(v(0, 1.68, 0)).addScaledVector(side, -0.3);
          return [
            { pos: h.clone().addScaledVector(toShrine, -2.4).addScaledVector(side, 0.6).setY(1.4), look, fov: 38 },
            { pos: h.clone().addScaledVector(toShrine, -2.1).addScaledVector(side, 0.5).setY(1.42), look, fov: 35 },
          ];
        },
      },
      // 17. The threshold. From the path outside the gate, looking back in: he walks out of the burning village toward
      // us, a dark figure in the gateway where Andhaka stood, his own shadow now running out ahead of him into the
      // desert; he stops on the path and the camera rises away over the dunes.
      {
        duration: 10,
        fadeIn: 0.35,
        fadeOut: 2.6,
        ease: ease.drift,
        cues: [
          { at: 0, actor: 'hero', place: AT_GATE, face: OUTSIDE },
          {
            at: 0,
            run: (s) => {
              const place = village(s);
              place.aimGateLight(v(0.25, 1.75, -1.6), v(0, 0.3, -26), 0xff7a33);
              place.setGateLight(0.85);
            },
          },
          { at: 0.5, actor: 'hero', moveTo: OUTSIDE },
        ],
        camera: [
          { pos: v(0.8, 1.05, -19.5), look: v(0, 1.3, -9.0), fov: 38 },
          { pos: v(1.1, 1.6, -20.8), look: v(0, 1.1, -12.0), fov: 40 },
          { pos: v(2.1, 3.3, -23.0), look: v(0, 0.9, -12.6), fov: 44 },
        ],
      },
    ],
  },
};

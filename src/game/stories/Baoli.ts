import * as THREE from 'three';
import { ease, type CameraKey } from '../../cinematics/CinematicDirector';
import { awaken, kavachLight, kindleEyes, type KavachLight, type StatueMarks } from '../../cinematics/DivineLight';
import type { ChapterStory, Stage } from '../../cinematics/Scene';
import { SceneFX } from '../../cinematics/SceneFX';
import { Enemy } from '../../entities/Enemy';
import { GURU } from '../../entities/characters/Village';
import { BAOLI_GUARDIAN } from '../../entities/characters/BaoliGuardian';
import { buildLathi } from '../../entities/characters/YodhaWeapons';
import { createToonRamp, toonifyModel } from '../../levels/environment/ToonRelight';
import { disposeObject } from '../../levels/GLBLevel';
import { SoundFX } from '../../combat/SoundFX';
import { ParticleFX } from '../../combat/ParticleFX';
import { charged, glowingEyes, glowingWater, impact, turnToStone } from '../../cinematics/Entrance';
import { groundShock } from '../../cinematics/Shockwave';
import { shade, shadeShots, twoShot } from '../Story';

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

/** The Devi's prophecy (docs/STORY.md, "The divya kavach"), in Moana's voice (game asset/voice/VOICES.md). */
const DEVI_LINES = [
  { speaker: 'Durga', text: 'You climbed to my door with a stick of bamboo, and a grief too heavy for it.', voice: 'baoli_devi_1' },
  { speaker: 'Durga', text: 'What they carried down this well, they will not keep. Follow it.', voice: 'baoli_devi_2' },
  { speaker: 'Durga', text: 'Not alone. Wear my kavach. No evil will pierce it. Go, my child. You have my blessing.', voice: 'baoli_devi_3' },
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

/** His prayer: palms pressed together before his chest (anjali), or Mixamo's Praying in a build without it. */
function prayer(s: Stage): string {
  return s.player.rig?.clipInfo('praying_anjali') ? 'praying_anjali' : 'praying';
}

/**
 * The lathi laid down before the Devi, and taken up again. He lays it on the stone at his right (the cut into the kneel
 * puts it there: he stands at his mark with it already down) and it lies there through his prayer, her gift and the
 * flash that changes his clothes (a copy of it, since the change of clothes gives him a new rig and a new lathi in his
 * hand). Rising, he takes it up: `kneel_take` (game asset/characters/take_post.py) bends him to his right, closes his fist
 * on it where it lies and brings it up with him as he stands, and at the moment his fist closes (the clip's `grasp` mark)
 * the real lathi is in his hand and the copy is gone, the same stick in the same place. (It used to vanish as he knelt
 * and reappear in his hand 1.9 s into the rise.)
 */
const TAKE_CLIP = 'kneel_take';
/**
 * Where the clip's fist closes on it, if a model has not got the clip to sample: metres to his right, ahead and up from
 * where he kneels (the numbers in take_post.py); the stick lies along his facing, its head to his back.
 */
const LAID = { right: 0.27, ahead: 0.12, up: 0.04 };
/** The grasp mark's fallback (s into the clip), should the manifest not give it. */
const GRASP_FALLBACK = 0.6;

/** The lathi on the ground, while it lies there (null otherwise). */
let laid: THREE.Group | null = null;

/** Takes the lathi off the ground: gone from the scene and freed. */
function pickUpLaid(): void {
  if (!laid) return;
  laid.removeFromParent();
  disposeObject(laid);
  laid = null;
}

/** Where his right fist closes on the lathi (world), as the take clip has it: from the clip itself, else from the numbers. */
function laidPose(s: Stage): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  const p = s.player;
  const socket = p.rig?.socket('Socket_Hand_R');
  const mark = p.rig?.clipInfo(TAKE_CLIP)?.marks?.grasp;
  p.group.updateMatrixWorld(true);
  const sampled = socket && mark !== undefined
    ? p.rig!.sampleAt(TAKE_CLIP, mark, () => ({ position: socket.getWorldPosition(new THREE.Vector3()), quaternion: socket.getWorldQuaternion(new THREE.Quaternion()) }))
    : undefined;
  if (sampled) return sampled;
  // His facing, his right, and the stick's head toward his back (+Y of the lathi runs along the fist's bar).
  const yaw = p.group.rotation.y;
  const ahead = v(Math.sin(yaw), 0, Math.cos(yaw));
  const right = v(-Math.cos(yaw), 0, Math.sin(yaw));
  const position = p.group.position.clone().addScaledVector(right, LAID.right).addScaledVector(ahead, LAID.ahead).add(v(0, LAID.up, 0));
  const quaternion = new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), ahead.clone().negate());
  return { position, quaternion };
}

/**
 * Lays the lathi on the stone at his right: the one in his hand goes out of sight and a copy lies where his fist will meet
 * it. He stands at his mark with empty hands (the fingers open as the prop leaves the socket: CharacterRig).
 */
function layLathiDown(s: Stage): void {
  s.player.swordMesh.visible = false;
  if (laid) return;
  const pose = laidPose(s);
  const level = s.level.group;
  const lathi = buildLathi();
  // The look of every prop in a hand (CharacterRig.attach): the cel ramp, no rim.
  const ramp = createToonRamp([0.18, 0.46, 0.8, 1.0]);
  toonifyModel(lathi, ramp);
  lathi.scale.setScalar(1 / level.getWorldScale(new THREE.Vector3()).x);
  lathi.position.copy(level.worldToLocal(pose.position.clone()));
  lathi.quaternion.copy(level.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(pose.quaternion));
  level.add(lathi);
  laid = lathi;
  SceneFX.onClear(() => {
    pickUpLaid();
    ramp.dispose();
  });
}

/** His fist has closed on the lathi: the real one is in his hand, and the one on the ground is gone. */
function lathiInHand(s: Stage): void {
  pickUpLaid();
  s.player.swordMesh.visible = true;
}

/**
 * Rising from his prayer he bends to his right and takes the lathi up (`kneel_take`), his fist closing on it at the clip's
 * `grasp` mark. A model without the clip (an older build) simply rises, and the lathi is in his hand when the shot ends.
 */
function takeLathiUp(s: Stage): void {
  const p = s.player;
  if (!p.playClip(TAKE_CLIP, { fade: 0 })) {
    kneel(s, 'kneel_to_stand', 'calm_idle', 0.3);
    return;
  }
  const mark = p.rig?.clipInfo(TAKE_CLIP)?.marks?.grasp ?? GRASP_FALLBACK;
  SceneFX.every(() => {
    if (p.rig?.clip !== TAKE_CLIP) return false;
    if (p.rig.time < mark) return true;
    lathiInHand(s);
    return false;
  });
}

/** The Guardian (its enemy id), and the framings for its shade (Story.ts `shadeShots`), on the island's open side. */
const GUARDIAN = 'baoli_guardian';
const shadeOn = (s: Stage) => shadeShots(s, shade(GUARDIAN), twoShot(s, 'hero', shade(GUARDIAN), BAOLI_CENTRE).side);

/** Whether the Guardian is in one of these states now. */
const bossIn = (s: Stage, ...states: string[]) => states.includes(s.actor('boss')?.stateMachine.currentState ?? '');

// ------------------------------------------------------------------------------------------- the Guardian wakes

/*
 * The Guardian's entrance (docs/proposals/ENTRANCES.md, "Baoli Guardian"). The boy walks into a stepwell gone dark: its
 * lamps low, and at the island's middle a great stone shape crouched with one fist on the step, still as the carvings,
 * Andhaka's binding crawling over it in threads of ember. The lamps flare up one after another, from the far stambhas
 * in to it; close and slowed, its eyes kindle and it lifts its head; and it rises and brings its weapon down on the
 * stone, the step cracking out in ember and every lamp in the well guttering at the blow, its name over it. Then the
 * guru's one line.
 *
 * Its crouch is the three-point landing at the end of Mixamo's "Mutant Jump Attack" (held on its lowest frame, then
 * played on through its rise); the blow is its "Standing Melee Attack Downward".
 */

/** Crouched with a fist on the stone (clip seconds), and where the rise out of it starts. */
const STATUE = { clip: 'mutant_jump_attack', crouch: 2.05, wake: 2.2 };
/** The blow down onto the step, and when it lands (clip seconds). */
const BLOW = { clip: 'standing_melee_attack_downward', lands: 0.95 };
/** Andhaka's binding: ember, as his light in the gate was in the prologue. */
const EMBER = 0xff7a33;
const EMBER_HOT = new THREE.Color(3.4, 1.3, 0.4);

/** The Guardian's eyes (bound: ember; they go out as it is freed). */
let guardianEyes: ReturnType<typeof glowingEyes> | null = null;

/** The stepwell's lamps, as the level gives them to a scene. */
interface WellLamps {
  lampStands(): { group: string; at: THREE.Vector3 }[];
  setFlames(group: string, amount: number): void;
  getFlames(group: string): number;
}
const wellLamps = (s: Stage): WellLamps | null => {
  const level = s.level as Partial<WellLamps>;
  return level.lampStands && level.setFlames && level.getFlames ? (level as WellLamps) : null;
};

/**
 * Every lamp in the well to `amount` over `seconds` (game time) after `delay`, one after another from the farthest from
 * the Guardian in to it when `stagger` (seconds between them) is given; each flare that rises past 1 roars as it
 * catches. Put back as they burn when the chapter is left.
 */
function lamps(s: Stage, amount: number, seconds: number, stagger = 0, delay = 0): void {
  const well = wellLamps(s);
  if (!well) return;
  const guardian = s.pos('boss');
  // The stambhas from the farthest in to it, then the diyas down the steps and the hanging lamps all at once.
  const stands = well.lampStands().sort((a, b) => b.at.distanceTo(guardian) - a.at.distanceTo(guardian))
    .concat(['diya', 'hanging'].map((group) => ({ group, at: guardian })));
  stands.forEach((stand, i) => {
    let from = -1;
    SceneFX.tween(seconds, (k) => {
      if (from < 0) {
        from = well.getFlames(stand.group);
        // A stambha flaring up throws fire off its crown as it catches.
        if (amount > 1.2) {
          SoundFX.getInstance().playFlameBurst();
          if (stand.at !== guardian) ParticleFX.getInstance().spawnFlames(stand.at.clone().add(v(0, 0.4, 0)), 40, 0.5);
        }
      }
      well.setFlames(stand.group, THREE.MathUtils.lerp(from, amount, k));
    }, { delay: delay + i * stagger });
  });
  SceneFX.onClear(() => {
    for (const stand of well.lampStands()) well.setFlames(stand.group, 1);
    well.setFlames('diya', 1);
    well.setFlames('hanging', 1);
  });
}

/** Holds the Guardian crouched like the carvings, its eyes dark, Andhaka's binding crawling over it. */
function petrify(s: Stage): void {
  const boss = s.actor('boss');
  if (!boss) return;
  if (boss.playClip(STATUE.clip, { startAt: STATUE.crouch, fade: 0 })) boss.rig?.hold(STATUE.crouch);
  guardianEyes = glowingEyes(boss, { color: EMBER, height: s.height('boss'), size: 0.14 });
  charged(boss, 11, { color: EMBER_HOT.clone().multiplyScalar(0.55), arcs: 2, width: 0.03, rate: 7, reach: 0.8 });
}

/** It wakes (`waken`): the eyes kindle, the binding flares over it, and it lifts its head and rises out of the crouch. */
function waken(s: Stage): void {
  const boss = s.actor('boss');
  if (!boss) return;
  guardianEyes?.kindle(0.5);
  charged(boss, 2.4, { color: EMBER_HOT, arcs: 5, width: 0.045, rate: 18 });
  boss.playClip(STATUE.clip, { startAt: STATUE.wake, timeScale: 0.75, fade: 0.1 });
  SoundFX.getInstance().playRiser(3.4, 0.8);
}

/**
 * The blow: it brings its weapon down on the step before it, and where it lands the stone cracks out in ember, every
 * lamp in the well gutters, and its name lands.
 */
function blow(s: Stage): void {
  const boss = s.actor('boss');
  if (!(boss instanceof Enemy)) return;
  // Its roar, as the bosses' cutscenes have it (it counts as the roar the fight would otherwise open with).
  boss.playIntro();
  boss.playClip(BLOW.clip, { fade: 0.15 });
  SceneFX.every(() => {
    if (boss.rig?.clip !== BLOW.clip) return false;
    if (boss.rig.time < BLOW.lands) return true;
    const yaw = boss.group.rotation.y;
    const at = boss.getPosition().add(v(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(s.height('boss') * 0.55));
    impact(at, { color: EMBER, radius: 8, jolt: 0.2, strength: 1 });
    charged(boss, 0.9, { color: EMBER_HOT, arcs: 6, width: 0.05, rate: 24 });
    lamps(s, 0.15, 0.08);
    lamps(s, 1, 2.4, 0, 0.35);
    return false;
  });
}

// ------------------------------------------------------------------------------------------------- the way on

/*
 * The bridge to Chapter II (the user, 2026-10-07): freed, the Guardian turns back to stone, and the water at the
 * island's east edge begins to glow; the boy runs off the edge and dives into the light (Mixamo "Run To Dive"), and the
 * picture goes. The way down the raiders took is under the well; the way on for him is the water.
 */
const DIVE = {
  /** Where he starts his run, the island's edge (between the east stambha and the steps), and where he goes in. */
  runFrom: v(9.77, 0, 3.56),
  edge: v(12.4, 0, 4.51),
  water: v(15.2, -0.24, 5.54),
};
/** The glowing water (set as it lights). */
let pond: ReturnType<typeof glowingWater> | null = null;

/** He runs off the island's edge and dives into the glowing water, and is gone into its light. */
function dive(s: Stage): void {
  const p = s.player;
  p.faceYaw(Math.atan2(DIVE.water.x - DIVE.runFrom.x, DIVE.water.z - DIVE.runFrom.z));
  p.playClip('run_to_dive', { fade: 0.1 });
  const from = p.group.position.clone();
  const seconds = 1.15;
  p.carried = true;
  let t = 0;
  SceneFX.every((dt) => {
    t += dt;
    const k = Math.min(1, t / seconds);
    // The run to the edge, then out over the water in an arc and down into it, as the clip leaves the ground.
    let pos: THREE.Vector3;
    if (k < 0.45) pos = from.clone().lerp(DIVE.edge, k / 0.45);
    else {
      const u = (k - 0.45) / 0.55;
      pos = DIVE.edge.clone().lerp(DIVE.water, u);
      pos.y = THREE.MathUtils.lerp(DIVE.edge.y, DIVE.water.y - 0.5, u) + 1.3 * 4 * u * (1 - u);
    }
    p.group.position.copy(pos);
    p.markTeleported();
    if (k < 1) return true;
    p.group.visible = false;
    pond?.burst();
    groundShock(DIVE.water.clone(), { radius: 4, color: 0xffd890, seconds: 2.5, dust: false });
    ParticleFX.getInstance().spawnDustPuff(DIVE.water.clone().add(v(0, 0.1, 0)), 40);
    SoundFX.getInstance().playSplash(5);
    return false;
  });
  SceneFX.onClear(() => {
    p.group.visible = true;
    p.carried = false;
  });
}

export const BAOLI_STORY: ChapterStory = {
  cast: [
    // The guru as the boy remembers him: pale, see-through, there for one line and gone.
    { id: 'guru', rig: GURU, at: BAOLI_STAND, hidden: true, ghost: { color: 0x9cbcf0 } },
  ],

  // At the Devi's shrine above the well he kneels in his training clothes and rises in the divya kavach; then on the
  // raiders' trail into the stepwell, where the bound Guardian rises to block the way down. For a breath the boy sees
  // his guru beside him.
  opening: {
    id: 'baoli-opening',
    shots: [
      // The Devi's shrine on the terrace above the stepwell (docs/STORY.md, "The divya kavach"). From black: low
      // behind the boy, in his training clothes, as he climbs between the stone lions to the Devi on her lion, asking
      // her for the way. It cuts as he nears the mark he kneels on (the next shot puts him there).
      {
        duration: 4.4,
        fadeIn: 1.0,
        ease: ease.drift,
        linesAt: 1.4,
        lines: [{ speaker: 'Yudhveer', text: 'It has been a long road, Maa. Guide me.', voice: 'baoli_open_hero_1' }],
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
      // Side on, close, from his right: the lathi lies on the stone at his side (laid down across the cut: he stands at his
      // mark with it already down), and he kneels and joins his hands (held a breath and a half once joined).
      {
        duration: 4.4,
        fadeIn: 0.15,
        ease: ease.drift,
        cues: [
          { at: 0, actor: 'hero', place: DEVI_KNEEL, face: DEVI_FACE },
          { at: 0, run: layLathiDown },
          { at: 0.1, run: (s) => kneel(s, 'kneeling_down', 'crouch') },
          { at: 2.7, run: (s) => kneel(s, prayer(s), 'crouch_idle', 0.35) },
        ],
        camera: [
          { pos: v(-3.3, 5.25, 55.7), look: v(0, 4.85, 58.0), fov: 40 },
          { pos: v(-2.9, 5.15, 56.0), look: v(0, 4.75, 58.0), fov: 38 },
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
      // Up at her face, past the lion's mane, slowly closer: she answers. (Her first line, the "stick of bamboo", and the
      // boy's reply to it are cut: the answer comes straight.)
      {
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.006,
        linesAt: 0.6,
        lines: [DEVI_LINES[1]],
        camera: [
          { pos: v(-3.6, 13.6, 60.6), look: DEVI_FACE.clone().add(v(0, -0.3, 0)), fov: 33 },
          { pos: v(-3.3, 13.8, 61.3), look: DEVI_FACE.clone().add(v(0, -0.25, 0)), fov: 30 },
        ],
      },
      // Her face again, square on to her now: the gift.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.006,
        lines: [DEVI_LINES[2]],
        // A small shankh behind her blessing, for its weight: the summit's conch, faded early (not the whole song).
        cues: [{ at: 0.15, run: () => SoundFX.getInstance().playShankh() }],
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
          { at: KAVACH_AT + 0.05, run: (s) => kneel(s, prayer(s), 'crouch_idle', 0, PRAYED_AT) },
        ],
        camera: [
          { pos: v(3.4, 5.2, 53.9), look: v(-0.4, 6.0, 59.6), fov: 50 },
          { pos: v(3.1, 5.15, 54.4), look: v(-0.4, 5.85, 59.4), fov: 48 },
        ],
      },
      // Low in front of him, from his right: in the kavach he bends over to his right and takes up the lathi where it lies,
      // the light lifting off him, and rises with it.
      {
        duration: 4.0,
        fadeIn: 0.15,
        fadeOut: 0.7,
        ease: ease.out,
        cues: [
          { at: 0.2, run: takeLathiUp },
          // Standing, he lets the lathi come upright at his side and stands at ease (the clip carries it level beside him).
          { at: 2.8, actor: 'hero', play: 'IDLE' },
          // Skipped or settled, the lathi is in his hand and none lies on the ground.
          { at: 3.9, essential: true, run: lathiInHand },
        ],
        camera: (s): CameraKey[] => {
          const p = s.pos('hero');
          return [
            { pos: p.clone().add(v(-1.15, 0.5, 2.5)), look: p.clone().add(v(-0.1, 0.55, 0)), fov: 40 },
            { pos: p.clone().add(v(-0.95, 0.5, 2.2)), look: p.clone().add(v(0, 1.3, 0)), fov: 40 },
          ];
        },
      },
      // Down in the stepwell (the Guardian wakes, above). Low behind him as he walks in across the island: the well's
      // lamps burn low, and at its middle a great stone shape crouches with a fist on the step, ember crawling over it.
      {
        duration: 4.4,
        fadeIn: 0.8,
        ease: ease.drift,
        cues: [
          { at: 0, actor: 'hero', place: BAOLI_ENTRY, face: 'boss' },
          { at: 0, actor: 'boss', face: BAOLI_ENTRY },
          { at: 0, run: (s) => { lamps(s, 0.12, 0.01); petrify(s); } },
          { at: 0.3, actor: 'hero', moveTo: BAOLI_STAND, face: 'boss' },
        ],
        camera: [
          { pos: v(3.6, 1.5, 19), look: v(0.2, 1.6, 0), fov: 42 },
          { pos: v(2.8, 1.7, 13), look: v(0, 1.8, -2), fov: 40 },
        ],
      },
      // High on the steps behind him, the well below: the lamps flare up one after another, from the far stambhas in to
      // the stone shape, their fire doubled in the water.
      {
        duration: 3.4,
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.01,
        cues: [{ at: 0.2, run: (s) => lamps(s, 1.6, 0.3, 0.42) }],
        // Low in front of it, off its weapon side: the far stambha burns up behind its dark shape last.
        camera: (s): CameraKey[] => {
          const h = s.height('boss');
          return [
            { pos: s.at('boss', h * 1.7, -h * 0.4, h * 0.14), look: s.at('boss', -h * 1.5, 0, h * 0.8), fov: 52 },
            { pos: s.at('boss', h * 1.5, -h * 0.34, h * 0.13), look: s.at('boss', -h * 1.5, 0, h * 0.84), fov: 49 },
          ];
        },
      },
      // Close and low on the stone face, the world slowing: its eyes kindle, the binding flares over it, and it lifts
      // its head and rises.
      {
        duration: 3.6,
        timeScale: [[0, 1], [0.4, 0.4], [3.0, 0.4], [3.6, 1]],
        fadeIn: 0.1,
        ease: ease.out,
        sway: 0.01,
        cues: [{ at: 0.25, run: (s) => waken(s) }],
        camera: (s): CameraKey[] => {
          const h = s.height('boss');
          const head = s.head('boss');
          return [
            { pos: s.at('boss', h * 0.7, -h * 0.16, 0).setY(head.y - 0.1), look: head, fov: 34 },
            { pos: s.at('boss', h * 0.85, -h * 0.2, 0).setY(head.y - 0.25), look: head.clone().add(v(0, h * 0.3, 0)), fov: 40 },
          ];
        },
      },
      // Low and wide from the boy's side: it brings its weapon down on the step, the stone cracks out in ember, the
      // lamps gutter at the blow, and its name lands, a sting under it.
      {
        duration: 3.6,
        fadeIn: 0.08,
        ease: ease.out,
        sway: 0.02,
        cues: [
          { at: 0.1, run: (s) => blow(s) },
          {
            at: 1.55,
            run: (s) => {
              const boss = s.actor('boss');
              if (boss instanceof Enemy) s.cards.boss(boss);
              SoundFX.getInstance().playSting(0.9);
            },
          },
        ],
        camera: (s): CameraKey[] => {
          const h = s.height('boss');
          return [
            { pos: s.at('boss', h * 2.2, -h * 1.0, h * 0.12), look: s.at('boss', h * 0.3, 0, h * 0.55), fov: 46 },
            { pos: s.at('boss', h * 2.0, -h * 0.9, h * 0.16), look: s.at('boss', h * 0.2, 0, h * 0.62), fov: 42 },
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
          // However the waking went (skipped, or settled on a retry): the lamps as they burn, the Guardian on its feet.
          { at: 0, run: (s) => lamps(s, 1, 0.3), essential: true },
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
        duration: 2.2,
        fadeIn: 0.15,
        ease: ease.inOut,
        cues: [{ at: 0, actor: 'guru', show: false }],
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

  // Beaten, the Guardian is down on its knees and itself again: Andhaka's ember drains out of it, it tells the boy where
  // to go, and turns back to stone, a carving at peace. The water at the island's edge begins to glow: the way on. He
  // runs, and dives into the light. (The cut lines: the binding explained, the lathi, and the boy's two answers.)
  ending: {
    id: 'baoli-ending',
    shots: [
      // From black: wide on the two of them, the boy walking up to where it kneels; the ember drains out of it.
      {
        duration: 3.8,
        fadeIn: 0.9,
        ease: ease.drift,
        cues: [
          { at: 0, actor: 'hero', place: (s) => s.toward('boss', 'hero', Math.min(5.5, s.pos('boss').distanceTo(s.pos('hero')))), face: 'boss' },
          { at: 0, actor: 'boss', clip: 'kneeling_idle' },
          { at: 0.3, actor: 'boss', face: 'hero' },
          // Freed: the ember goes out of its eyes, and the last of the binding crawls off it.
          { at: 0, run: () => guardianEyes?.out(1.4) },
          { at: 0.2, run: (s) => { const b = s.actor('boss'); if (b) charged(b, 2.2, { color: EMBER_HOT.clone().multiplyScalar(0.7), arcs: 3, width: 0.035, rate: 12 }); } },
          { at: 0.5, actor: 'hero', moveTo: (s) => s.toward('boss', 'hero', 2.8), face: 'boss' },
        ],
        camera: (s): CameraKey[] => {
          const { side, mid, dir } = twoShot(s, 'hero', 'boss', BAOLI_CENTRE);
          const look = mid.clone().addScaledVector(dir, 0.6).add(v(0, 1.1, 0));
          return [
            { pos: mid.clone().addScaledVector(side, 8).add(v(0, 2.6, 0)).addScaledVector(dir, -0.4), look, fov: 40 },
            { pos: mid.clone().addScaledVector(side, 7).add(v(0, 2.2, 0)).addScaledVector(dir, 0.2), look, fov: 38 },
          ];
        },
      },
      // Close on its face as it kneels, the darkness gone out of it.
      {
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.012,
        lines: [{ speaker: 'Baoli Guardian', text: 'The dark... it has let go of me.', voice: 'baoli_end_guardian_1' }],
        camera: (s) => shadeOn(s).close(),
      },
      // Over his shoulder, down at it: where he must go.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.012,
        lines: [{ speaker: 'Baoli Guardian', text: 'Go to the Hanuman akhada. Let the vanaras teach you to truly fight. Then follow.', voice: 'baoli_end_guardian_4' }],
        camera: (s) => shadeOn(s).overHero(),
      },
      // Side on to the two of them: its word given, it bows its head and turns back to stone, gold lifting off it; and
      // beyond the island's edge the water begins to glow.
      {
        duration: 4.0,
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.01,
        cues: [
          { at: 0.3, run: (s) => { const b = s.actor('boss'); if (b) turnToStone(b, 2.6); } },
          { at: 1.6, run: () => { pond = glowingWater(DIVE.water, { radius: 2.8, seconds: 2.2 }); } },
          { at: 2.4, actor: 'hero', face: DIVE.water },
        ],
        camera: (s) => shadeOn(s).side(),
      },
      // Low at the island's edge, looking out over the glowing water: he walks up to the edge.
      {
        duration: 3.0,
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.01,
        cues: [{ at: 0.1, actor: 'hero', moveTo: DIVE.runFrom, face: DIVE.water }],
        camera: (): CameraKey[] => [
          { pos: DIVE.edge.clone().add(v(1.4, 0.5, -3.2)), look: DIVE.water.clone().add(v(0, 0.4, 0)), fov: 44 },
          { pos: DIVE.edge.clone().add(v(1.2, 0.45, -2.8)), look: DIVE.runFrom.clone().add(v(0, 1.2, 0)), fov: 46 },
        ],
      },
      // Wide from the water, side on: he runs off the edge and dives into the light, slowed at the top of the dive; the
      // water flares as he goes in, and the picture goes.
      {
        duration: 3.4,
        timeScale: [[0, 1], [0.7, 1], [0.95, 0.35], [1.6, 0.35], [1.9, 1]],
        fadeIn: 0.1,
        fadeOut: 1.0,
        ease: ease.drift,
        sway: 0.012,
        cues: [{ at: 0.2, run: (s) => dive(s) }],
        camera: (): CameraKey[] => [
          { pos: DIVE.water.clone().add(v(-1.2, 0.9, -6.4)), look: DIVE.edge.clone().lerp(DIVE.water, 0.5).add(v(0, 1.0, 0)), fov: 46 },
          { pos: DIVE.water.clone().add(v(-1.0, 0.8, -5.8)), look: DIVE.water.clone().add(v(0, 0.3, 0)), fov: 42 },
        ],
      },
    ],
  },
};

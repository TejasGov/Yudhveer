import * as THREE from 'three';
import { ease, type Shot } from './CinematicDirector';
import type { Chapter } from '../game/Chapters';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { BossAndhaka } from '../entities/BossAndhaka';
import type { CameraPose, GameLevel } from '../levels/LevelTypes';
import { islandEstablishing } from '../levels/Level5_Island';
import type { Line } from '../ui/Dialogue';

/** What an intro is staged with: the chapter's fighters where they stand, and the cards to show. */
export interface IntroContext {
  chapter: Chapter;
  level: GameLevel;
  player: Player;
  enemies: Enemy[];
  /** Wave chapters: the card for their minions (one close-up stands for all of them). */
  horde: { name: string; epithet: string } | null;
  cards: {
    chapter(): void;
    boss(enemy: Enemy): void;
    name(enemy: Enemy): void;
    title(name: string, epithet: string): void;
  };
  /** A line spoken over the cutscene (subtitled; voiced if it has a recording). */
  say(lines: Line[]): void;
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Andhaka's line as the crown settles and the beacon takes fire (docs/APPROVALS.md: the options; subtitle only until
 * the user approves a recording, then it gets its `voice` id).
 */
const CROWNING_LINE: Line = { speaker: 'Andhaka', text: 'Burn, Agni. Let the gods see their king.', hold: 2.8 };
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Facing and side unit vectors for a character's heading. */
export function frame(yaw: number): { fwd: THREE.Vector3; side: THREE.Vector3 } {
  return { fwd: v(Math.sin(yaw), 0, Math.cos(yaw)), side: v(Math.cos(yaw), 0, -Math.sin(yaw)) };
}

/** `base` + a*fwd + b*side + c*up. */
export function offset(base: THREE.Vector3, f: { fwd: THREE.Vector3; side: THREE.Vector3 }, a: number, b: number, c: number): THREE.Vector3 {
  return base.clone().addScaledVector(f.fwd, a).addScaledVector(f.side, b).addScaledVector(UP, c);
}

/**
 * Low and in front of the boss, pushing in and tilting up from its weapon hand to its face while it roars; the
 * name card lands as the roar peaks.
 */
function bossReveal(ctx: IntroContext, boss: Enemy): Shot {
  const b = boss.getPosition().clone();
  const h = boss.visualHeight();
  const f = frame(boss.group.rotation.y);
  return {
    duration: 6.2,
    fadeIn: 0.25,
    ease: ease.out,
    sway: 0.02,
    keys: [
      // `side` is the character's left (a shield arm): stay on the weapon side so a raised dhal never fills the frame.
      { pos: offset(b, f, h * 1.6, -h * 1.0, h * 0.12), look: offset(b, f, 0, 0, h * 0.35), fov: 40 },
      { pos: offset(b, f, h * 1.35, -h * 0.68, h * 0.24), look: offset(b, f, 0, -h * 0.05, h * 0.62), fov: 35 },
      { pos: offset(b, f, h * 1.5, -h * 0.55, h * 0.45), look: offset(b, f, 0, -h * 0.05, h * 0.74), fov: 33 },
    ],
    cues: [
      { at: 0.35, run: () => boss.playIntro() },
      { at: 0.35 + boss.introCardDelay, run: () => ctx.cards.boss(boss) },
    ],
  };
}

/** A medium close-up of one enemy from its front quarter, drifting in, with its name. */
function enemyCloseUp(ctx: IntroContext, enemy: Enemy, index: number, card?: { name: string; epithet: string }): Shot {
  const q = enemy.getPosition().clone();
  const h = enemy.visualHeight();
  const f = frame(enemy.group.rotation.y);
  // Alternate sides so consecutive close-ups don't jump across the same line.
  const s = index % 2 === 0 ? 1 : -1;
  return {
    duration: 2.8,
    fadeIn: 0.2,
    ease: ease.out,
    sway: 0.02,
    keys: [
      { pos: offset(q, f, h * 1.75, s * h * 0.75, h * 0.62), look: offset(q, f, 0, 0, h * 0.6), fov: 36 },
      { pos: offset(q, f, h * 1.45, s * h * 0.45, h * 0.72), look: offset(q, f, 0, 0, h * 0.7), fov: 34 },
    ],
    cues: [
      { at: 0.2, run: () => enemy.playIntro() },
      { at: 0.35, run: () => (card ? ctx.cards.title(card.name, card.epithet) : ctx.cards.name(enemy)) },
    ],
  };
}

/** Over the hero's shoulder toward what he faces, easing back to where the gameplay camera will pick up. */
function heroShot(ctx: IntroContext, target: THREE.Vector3): Shot {
  const p = ctx.player.getPosition().clone();
  const f = frame(ctx.player.group.rotation.y);
  // The gameplay camera sits over the right shoulder, which is -side in this frame.
  return {
    duration: 2.6,
    fadeIn: 0.2,
    ease: ease.inOut,
    keys: [
      { pos: offset(p, f, -1.9, -0.95, 1.55), look: target.clone().setY(target.y + 1.3), fov: 40 },
      { pos: offset(p, f, -3.1, -0.6, 2.0), look: target.clone().setY(target.y + 1.2), fov: 52 },
    ],
  };
}

/** Where the hero's opponents stand (the boss, or the middle of the group). */
function opponentsCentre(ctx: IntroContext): THREE.Vector3 {
  const boss = ctx.enemies.find((e) => e.isBoss);
  if (boss) return boss.getPosition().clone();
  return ctx.enemies.reduce((c, e) => c.add(e.getPosition()), new THREE.Vector3()).divideScalar(Math.max(1, ctx.enemies.length));
}

/** The opening shots of each arena, then its opponents, then the hero. */
/**
 * An authored camera from the level file (falling back to the pose its export notes give), and keys that drift
 * into it: from `back` metres further out along its view and `lift` higher, sliding `side` metres across.
 */
function authored(ctx: IntroContext, name: string, fallback: CameraPose): CameraPose {
  return ctx.level.cameraPose(name, fallback.pos.distanceTo(fallback.look)) ?? fallback;
}

function driftInto(pose: CameraPose, back: number, lift: number, side: number, fovFrom = pose.fov): { pos: THREE.Vector3; look: THREE.Vector3; fov: number }[] {
  const forward = pose.look.clone().sub(pose.pos).normalize();
  const right = new THREE.Vector3().crossVectors(forward, UP).normalize();
  const start = pose.pos.clone().addScaledVector(forward, -back).addScaledVector(UP, lift).addScaledVector(right, -side);
  const look = pose.look.clone().addScaledVector(right, -side * 0.5);
  return [{ pos: start, look, fov: fovFrom }, { pos: pose.pos.clone(), look: pose.look.clone(), fov: pose.fov }];
}

const pose = (pos: THREE.Vector3, look: THREE.Vector3, fov: number): CameraPose => ({ pos, look, fov });

const ESTABLISHING: Record<number, (ctx: IntroContext) => Shot[]> = {
  // The village at dusk: down over the south wall toward the north gate and the sun going down behind it, then low
  // across the courtyard to the training circle, where the guru and the boy are at their lesson.
  0: (ctx) => [
    {
      duration: 7,
      fadeIn: 1.6,
      ease: ease.drift,
      keys: [
        { pos: v(1.5, 10, 19), look: v(-1, 3.5, -22), fov: 46 },
        { pos: v(0.5, 6.5, 14), look: v(-0.5, 2.6, -16), fov: 46 },
      ],
      cues: [{ at: 1.2, run: () => ctx.cards.chapter() }],
    },
    {
      duration: 5.5,
      fadeIn: 0.3,
      ease: ease.drift,
      keys: [
        { pos: v(8.5, 1.4, 5), look: v(0, 1.1, -0.5), fov: 42 },
        { pos: v(6.2, 1.9, 6.4), look: v(0, 1.2, 0), fov: 40 },
      ],
    },
  ],
  // The moonlit stepwell: pull back from the falls and drop into the baoli, then circle the island.
  1: (ctx) => [
    {
      duration: 6.5,
      fadeIn: 1.4,
      ease: ease.drift,
      keys: [
        { pos: v(-9, 7, -88), look: v(-7, 36, -124), fov: 50 },
        { pos: v(-6, 10, -76), look: v(-7, 26, -122), fov: 48 },
        { pos: v(-3, 14, -60), look: v(-6, 12, -118), fov: 46 },
      ],
      cues: [{ at: 1.2, run: () => ctx.cards.chapter() }],
    },
    {
      duration: 6.5,
      fadeIn: 0.3,
      ease: ease.drift,
      keys: [
        { pos: v(30, 17, -26), look: v(0, 0.5, -2), fov: 44 },
        { pos: v(36, 14, -2), look: v(0, 0.5, 0), fov: 44 },
        { pos: v(30, 11, 20), look: v(0, 1, 0), fov: 44 },
      ],
    },
  ],
  // The akhada: through the south gateway toward the monolith, then up Hanuman's face.
  2: (ctx) => [
    {
      duration: 6.5,
      fadeIn: 1.4,
      ease: ease.drift,
      keys: [
        { pos: v(0, 2.2, 46), look: v(0, 7.5, -18), fov: 46 },
        { pos: v(0, 3.4, 31), look: v(0, 6.5, -18), fov: 46 },
      ],
      cues: [{ at: 1.2, run: () => ctx.cards.chapter() }],
    },
    {
      duration: 5,
      fadeIn: 0.3,
      ease: ease.drift,
      keys: [
        { pos: v(-8, 1.2, 5), look: v(0, 7.5, -17), fov: 44 },
        { pos: v(-3, 3.8, -1), look: v(0, 9.6, -17), fov: 42 },
      ],
    },
  ],
  // Dwarka at sunset, through the export's own cameras: the islands from high over the sea, across the arena to
  // the setting sun, then down the approach to the arena.
  3: (ctx) => [
    {
      duration: 7,
      fadeIn: 1.4,
      ease: ease.drift,
      keys: driftInto(authored(ctx, 'CAM_Dwarka_Cinematic_Overview', pose(v(110, 75, 156), v(-10, 13, -32), 28.4)), 28, 10, 6, 30),
      cues: [{ at: 1.2, run: () => ctx.cards.chapter() }],
    },
    {
      duration: 6,
      fadeIn: 0.3,
      ease: ease.drift,
      keys: driftInto(authored(ctx, 'CAM_Ocean_Sunset', pose(v(11, 20, -40), v(-15, 8, 100), 32)), 6, 2, -5),
    },
    {
      duration: 5.5,
      fadeIn: 0.3,
      ease: ease.drift,
      keys: driftInto(authored(ctx, 'CAM_Dwarka_Establishing', pose(v(-1, 23, 60), v(-7, 18, -22), 38.5)), 10, 3, 0),
    },
  ],
  // The summit: in along the bridge from Nandi toward Shiva and the eclipse, then around the plateau.
  4: (ctx) => [
    {
      duration: 6.5,
      fadeIn: 1.4,
      ease: ease.drift,
      keys: [
        { pos: v(0, 1.6, 40), look: v(0, 12, -40), fov: 46 },
        { pos: v(0, 3.2, 31), look: v(0, 10, -36), fov: 46 },
        { pos: v(0, 4.6, 22), look: v(0, 8.5, -30), fov: 46 },
      ],
      cues: [{ at: 1.2, run: () => ctx.cards.chapter() }],
    },
    {
      duration: 6,
      fadeIn: 0.3,
      ease: ease.drift,
      keys: [
        { pos: v(22, 9, 8), look: v(0, 3, -6), fov: 44 },
        { pos: v(14, 7, 18), look: v(0, 2.5, -4), fov: 44 },
        { pos: v(-4, 5.5, 21), look: v(0, 2, -4), fov: 44 },
      ],
    },
  ],
  // The island: in from the night sea to the boat at the landing, then down the first tunnel (Level5_Island).
  5: islandEstablishing,
};

/**
 * The full intro for a chapter: establishing shots, its opponents (a boss's roar, or a pass across a group), the hero.
 * A chapter whose opponents arrive in its story (`introPlaceOnly`) gets the place alone; its opening scene goes on.
 */
export function buildIntro(ctx: IntroContext): Shot[] {
  const shots = (ESTABLISHING[ctx.chapter.level] ?? (() => []))(ctx);
  if (shots.length === 0) shots.push({ duration: 3, fadeIn: 1, keys: [{ pos: v(0, 8, 18), look: v(0, 1, 0) }], cues: [{ at: 0.5, run: () => ctx.cards.chapter() }] });
  if (ctx.chapter.introPlaceOnly) return shots;
  const boss = ctx.enemies.find((e) => e.isBoss);
  if (boss) shots.push(bossReveal(ctx, boss));
  else if (ctx.horde && ctx.enemies.length) shots.push({ ...enemyCloseUp(ctx, ctx.enemies[0], 0, ctx.horde), duration: 3.4 });
  else ctx.enemies.forEach((enemy, i) => shots.push(enemyCloseUp(ctx, enemy, i)));
  // Every chapter ends over the hero's shoulder, where the follow camera takes over.
  shots.push(heroShot(ctx, opponentsCentre(ctx)));
  return shots;
}

/** A boss arriving mid-fight: his reveal (or his own entrance), then back over the hero's shoulder. */
export function buildArrival(ctx: IntroContext, boss: Enemy): Shot[] {
  const entrance = boss instanceof Boss ? boss.scriptedEntrance() : null;
  if (entrance) return [...entranceShots(ctx, boss as Boss, entrance), heroShot(ctx, boss.getPosition())];
  const reveal = bossReveal(ctx, boss);
  return [{ ...reveal, fadeIn: 0.4 }, heroShot(ctx, boss.getPosition())];
}

/**
 * A boss's authored entrance, cut to its clip's marks (Andhaka's: he smiles, crowns himself, draws his sword from
 * the stone and roars): close on his face as the smile comes, the crown raised and lowered from his left, low on his
 * sword side as he sinks to the hilt and draws, then the roar and his name from his sword side.
 */
function entranceShots(ctx: IntroContext, boss: Boss, entrance: { duration: number; marks: Record<string, number> }): Shot[] {
  if (boss instanceof BossAndhaka && entrance.marks.lift !== undefined) return enthronedEntrance(ctx, boss, entrance);
  const b = boss.getPosition().clone();
  const h = boss.visualHeight();
  const f = frame(boss.group.rotation.y);
  const m = entrance.marks;
  const crownEnd = m.crowned + 0.9;
  const drawEnd = m.roar ?? m.drawn + 0.5;
  // He stands with his head a little forward of his feet.
  const face = offset(b, f, h * 0.12, 0, h * 0.875);
  return [
    {
      duration: m.smile + 2.4,
      fadeIn: 0.4,
      ease: ease.out,
      sway: 0.01,
      keys: [
        { pos: offset(b, f, h * 0.12 + 2.3, -0.35, h * 0.86), look: face, fov: 30 },
        { pos: offset(b, f, h * 0.12 + 1.6, -0.22, h * 0.87), look: face, fov: 25 },
      ],
      cues: [{ at: 0, run: () => boss.playIntro() }],
    },
    {
      duration: crownEnd - (m.smile + 2.4),
      fadeIn: 0.2,
      ease: ease.drift,
      sway: 0.015,
      keys: [
        { pos: offset(b, f, 4.8, 1.4, h * 0.6), look: offset(b, f, 0.25, 0, h * 0.82), fov: 40 },
        { pos: offset(b, f, 4.1, 0.85, h * 0.68), look: offset(b, f, 0.25, 0, h * 0.86), fov: 37 },
      ],
    },
    {
      duration: drawEnd - crownEnd,
      fadeIn: 0.15,
      ease: ease.drift,
      sway: 0.02,
      keys: [
        { pos: offset(b, f, 3.3, -3.4, h * 0.22), look: offset(b, f, 0.5, -0.9, h * 0.38), fov: 42 },
        { pos: offset(b, f, 3.0, -3.0, h * 0.4), look: offset(b, f, 0.4, -0.6, h * 0.62), fov: 40 },
      ],
    },
    {
      duration: entrance.duration - drawEnd + 0.4,
      fadeIn: 0.12,
      ease: ease.out,
      sway: 0.02,
      keys: [
        // From his sword side, looking across him: the snow behind him, not the dark statue.
        { pos: offset(b, f, 4.6, -3.8, h * 0.22), look: offset(b, f, 0, 0.5, h * 0.66), fov: 42 },
        { pos: offset(b, f, 4.0, -3.2, h * 0.3), look: offset(b, f, 0, 0.4, h * 0.7), fov: 39 },
      ],
      cues: [{ at: 0.6, run: () => ctx.cards.boss(boss) }],
    },
  ];
}

/**
 * Andhaka found on his throne (docs/STORY.md, "Andhaka's entrance"), cut to his clip's marks: from down the stair, the
 * seated king laughing; closer as he throws his head back; his smiling face; the crown taken off the throne's arm and
 * raised; close as it comes down onto his head (the beacon takes fire as it settles: BossAndhaka cues the level); the
 * beacon behind him, its fire racing into the sky; low on his sword side as he rises with the blade out of the stone;
 * the roar and his name. Each shot frames where his head and hands will be, read off the clip before it plays.
 *
 * The face close-ups are long lenses from his eye line, a little way off: close and low with a wide lens drew his face
 * out (the nose and beard swelling toward the camera).
 */
function enthronedEntrance(ctx: IntroContext, boss: BossAndhaka, entrance: { duration: number; marks: Record<string, number> }): Shot[] {
  const b = boss.getPosition().clone();
  const h = boss.visualHeight();
  const f = frame(boss.group.rotation.y);
  const m = entrance.marks;
  const at = (bone: 'Head' | 'LeftHand' | 'RightHand', t: number, fallback: THREE.Vector3) => boss.entrancePoint(bone, t) ?? fallback;
  const seatedHead = offset(b, f, -0.55, 0, h * 0.7);
  const laughing = at('Head', 1.2, seatedHead);
  const smiling = at('Head', (m.settle + m.lift) / 2 + 0.4, seatedHead);
  const crowned = at('Head', m.crowned, seatedHead);
  const crownRest = at('LeftHand', m.lift, offset(b, f, -0.5, 0.85, h * 0.36));
  const hilt = at('RightHand', m.grip, offset(b, f, -0.4, -0.95, h * 0.4));
  const up = (p: THREE.Vector3, y: number) => p.clone().addScaledVector(UP, y);
  // The Agni beacon on the far cliff (Level4_Summit), if this place has one.
  const beacon = ctx.level.group.getObjectByName('AgniBeacon_Column')?.getWorldPosition(new THREE.Vector3()) ?? null;
  // Shot boundaries (entrance seconds).
  const t1 = 2.6;
  const t2 = m.settle + 1.2;
  const t3 = m.lift - 0.35;
  const t4 = m.crowned - 0.9;
  const t4b = beacon ? m.crowned + 0.35 : m.grip - 0.25;
  const t5 = beacon ? m.grip + 0.55 : t4b;
  const t6 = m.roar;
  return [
    // Found: from down the stair, the king on his rock, laughing.
    {
      duration: t1,
      fadeIn: 0.4,
      ease: ease.drift,
      sway: 0.01,
      keys: [
        { pos: offset(b, f, 7.6, -1.3, 1.3), look: up(laughing, -0.75), fov: 34 },
        { pos: offset(b, f, 6.4, -1.0, 1.45), look: up(laughing, -0.6), fov: 31 },
      ],
      cues: [{ at: 0, run: () => boss.playIntro() }],
    },
    // Closer, from his sword side, as the laugh takes him and he settles.
    {
      duration: t2 - t1,
      fadeIn: 0.15,
      ease: ease.drift,
      sway: 0.012,
      keys: [
        { pos: laughing.clone().addScaledVector(f.fwd, 4.3).addScaledVector(f.side, -1.9).addScaledVector(UP, -0.55), look: up(laughing, -0.55), fov: 34 },
        { pos: laughing.clone().addScaledVector(f.fwd, 3.9).addScaledVector(f.side, -1.6).addScaledVector(UP, -0.45), look: up(laughing, -0.45), fov: 32 },
      ],
    },
    // His smiling face, close, looking down the stair at the boy: from his eye line on a long lens.
    {
      duration: t3 - t2,
      fadeIn: 0.15,
      ease: ease.out,
      sway: 0.004,
      keys: [
        { pos: smiling.clone().addScaledVector(f.fwd, 2.7).addScaledVector(f.side, 0.3).addScaledVector(UP, 0.04), look: up(smiling, 0.03), fov: 16.8 },
        { pos: smiling.clone().addScaledVector(f.fwd, 2.35).addScaledVector(f.side, 0.21).addScaledVector(UP, 0.04), look: up(smiling, 0.03), fov: 15.3 },
      ],
    },
    // The crown: his hand takes it off the throne's arm and raises it; the camera rises with it from his left.
    {
      duration: t4 - t3,
      fadeIn: 0.15,
      ease: ease.inOut,
      sway: 0.01,
      keys: [
        { pos: crownRest.clone().addScaledVector(f.fwd, 2.4).addScaledVector(f.side, 1.3).addScaledVector(UP, 0.35), look: up(crownRest, 0.15), fov: 34 },
        { pos: crowned.clone().addScaledVector(f.fwd, 2.6).addScaledVector(f.side, 1.4).addScaledVector(UP, -0.2), look: up(crowned, 0.3), fov: 34 },
      ],
    },
    // Close on his face as the crown comes down onto his head (level with it, on a long lens, from his right, so the
    // left arm raising the crown stays clear of his face). As it settles the beacon takes fire; he speaks.
    {
      duration: t4b - t4,
      fadeIn: 0.12,
      ease: ease.out,
      sway: 0.005,
      keys: [
        { pos: crowned.clone().addScaledVector(f.fwd, 3.5).addScaledVector(f.side, -1.25).addScaledVector(UP, 0.02), look: up(crowned, 0.1), fov: 22 },
        { pos: crowned.clone().addScaledVector(f.fwd, 3.1).addScaledVector(f.side, -1.1).addScaledVector(UP, 0.02), look: up(crowned, 0.08), fov: 20.4 },
      ],
      cues: [{ at: m.crowned + 0.1 - t4, run: () => ctx.say([CROWNING_LINE]) }],
    },
    // The beacon answers: low before him on his left, the crowned king dark against it, the fire racing up off the far
    // cliff into the sky behind him; his fist goes to the hilt.
    ...(beacon ? [beaconShot(crowned, beacon, t5 - t4b)] : []),
    // Low on his sword side: his fist closes on the hilt and he rises, the blade coming up out of the stone.
    {
      duration: t6 - t5,
      fadeIn: 0.12,
      ease: ease.drift,
      sway: 0.015,
      keys: [
        { pos: offset(b, f, 2.6, -3.3, 0.55), look: up(hilt, 0.1), fov: 40 },
        { pos: offset(b, f, 3.2, -3.6, 0.8), look: offset(b, f, 0, -0.3, h * 0.62), fov: 42 },
      ],
    },
    // The roar and his name, from his sword side looking across him: the snow behind him, not the dark statue.
    {
      duration: entrance.duration - t6 + 0.4,
      fadeIn: 0.12,
      ease: ease.out,
      sway: 0.02,
      keys: [
        { pos: offset(b, f, 4.6, -3.8, h * 0.22), look: offset(b, f, 0, 0.5, h * 0.66), fov: 42 },
        { pos: offset(b, f, 4.0, -3.2, h * 0.3), look: offset(b, f, 0, 0.4, h * 0.7), fov: 39 },
      ],
      cues: [{ at: 0.6, run: () => ctx.cards.boss(boss) }],
    },
  ];
}

/**
 * Low in front of the crowned king, a little off the line from his head to the beacon so the fire climbs beside him,
 * looking past him and tilting up as it rises.
 */
function beaconShot(head: THREE.Vector3, beacon: THREE.Vector3, duration: number): Shot {
  const toBeacon = beacon.clone().sub(head).setY(0).normalize();
  const across = new THREE.Vector3(-toBeacon.z, 0, toBeacon.x);
  const at = (back: number, aside: number, drop: number) =>
    head.clone().addScaledVector(toBeacon, -back).addScaledVector(across, aside).addScaledVector(UP, -drop);
  const past = (ahead: number, rise: number) => head.clone().addScaledVector(toBeacon, ahead).addScaledVector(UP, rise);
  return {
    duration,
    fadeIn: 0.1,
    ease: ease.out,
    sway: 0.012,
    keys: [
      { pos: at(6.8, -1.5, 1.7), look: past(6, 1.6), fov: 44 },
      { pos: at(6.2, -1.35, 1.9), look: past(6, 3.4), fov: 46 },
    ],
  };
}

/** The slow orbit behind the title screen, per arena. */
/** `frame`: metres the subject sits right of centre, clear of the title menu on the left. */
export const ATTRACT: Record<number, { centre: THREE.Vector3; radius: number; height: number; look: number; speed: number; frame?: number }> = {
  0: { centre: v(0, 0, -1), radius: 17, height: 7, look: 2.5, speed: 0.03 },
  1: { centre: v(0, 0, -6), radius: 36, height: 13, look: 3, speed: 0.025 },
  2: { centre: v(0, 0, -4), radius: 15, height: 6, look: 6, speed: 0.03 },
  3: { centre: v(0, 0, -20), radius: 120, height: 48, look: 12, speed: 0.012, frame: 32 },
  4: { centre: v(0, 0, -4), radius: 24, height: 8, look: 4, speed: 0.025 },
};

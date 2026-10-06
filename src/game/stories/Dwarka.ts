import * as THREE from 'three';
import { ease, type CameraKey } from '../../cinematics/CinematicDirector';
import type { ChapterStory, Stage } from '../../cinematics/Scene';
import { SceneFX } from '../../cinematics/SceneFX';
import { CharacterRig } from '../../entities/animation/CharacterRig';
import { wrapAngle } from '../../entities/Character';
import type { Player } from '../../entities/Player';
import { ParticleFX } from '../../combat/ParticleFX';
import { SoundFX } from '../../combat/SoundFX';
import { DWARKA_FLOOR_Y } from '../../levels/Level3_Dwarka';
import { WEAPON_SETS } from '../../entities/characters/YodhaWeapons';
import { SHALVA } from '../../entities/characters/Shalva';
import { TAKSHAKA } from '../../entities/characters/Takshaka';
import { shade, shadeConversation, shadeOf, shadeRises } from '../Story';
import { asset } from '../../core/Assets';

/*
 * Chapter IV, Dwarka (docs/STORY.md, "Milestone 8"). The hero comes with the island's mace; Shalva taunts him at
 * the arena, and beaten, tells him what Andhaka is doing with the souls he takes. Then Takshaka comes up out of the
 * sea, and dying, sees what the boy is and gives him his sword: the magical khanda the summit is fought with.
 *
 * The sun is low over the sea to the south (+z): faces turned that way are lit, so the cameras stand on that side.
 *
 * Both fallen speak as shades (Story.ts, "The dead speak"): a blue spirit rises out of the body and stands over it,
 * and the cameras frame it and the hero, the body below the frame.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const Y = DWARKA_FLOOR_Y;
const UP = v(0, 1, 0);

/**
 * The shades' framings (Story.ts `shadeConversation`), on the sunward side of the line from the hero to the shade
 * (or `side`, before the shade is up).
 */
const shadeTalk = (s: Stage, fallen: string, side = pair(s, 'hero', shade(fallen)).side) =>
  shadeConversation(s, fallen, side, HOOD[fallen] ?? 0);
/** Metres a shade's crest rises above its head (the serpent king's hood), kept in frame. */
const HOOD: Record<string, number> = { takshaka: 0.6 };

/** Two people facing each other: the line from `a` to `b`, the sunward side of it, the point between them. */
function pair(s: Stage, a: string, b: string) {
  const pa = s.pos(a);
  const pb = s.pos(b);
  const dir = pb.clone().sub(pa).setY(0);
  if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
  dir.normalize();
  const mid = pa.clone().lerp(pb, 0.5);
  const side = v(dir.z, 0, -dir.x);
  if (side.z < 0) side.negate();
  // Near the south rim, look from the arena's side instead of from over the water.
  if (mid.clone().addScaledVector(side, 5).setY(0).length() > 13) side.negate();
  return { pa, pb, dir, side, mid };
}

// ------------------------------------------------------------------------------------------------- the sword

const KHANDA_URL = asset('weapons/yodha_khanda.glb');
/**
 * The khanda's hold in his fist: the summit's own (`WEAPON_SETS.khanda`, its grip on `Socket_Hand_R` at its own size),
 * so it is the same sword here as there, and at ease (REST) it lowers as it does there.
 */
const KHANDA = WEAPON_SETS.khanda.definition.weapon!;
/** The prepared khanda's tip, up its +Y from the grip (prepare_weapon.py --length 1.05). */
const KHANDA_POINT = 0.87;

/**
 * He goes down on one knee before the sword (Mixamo "Kneeling Down"). At `takeAt` (clip seconds) his right fist has
 * come to rest just above his right knee, and that is where the khanda's grip stands, sampled from the clip as
 * BossAndhaka places his sword at his entrance's "grip" mark: the fist closes on the grip, not near it.
 */
const KNEEL = { clip: 'kneeling_down', timeScale: 1.15, takeAt: 2.55 };
/** He rises with it (Mixamo "Kneel To Stand"): his fist goes straight up half a metre, and the blade comes with it. */
const RISE = { clip: 'kneel_to_stand', timeScale: 1.1 };
/**
 * Where the blade goes into the stone, from below his fist at the take (metres to his right, and ahead): out and ahead
 * of his kneeling right knee, so the sword leans with its hilt toward him, offered, and the blade clears his leg
 * (straight down from his fist it went through his thigh). Drawn, it slides out of this slot along its own length.
 */
const SLOT = { right: 0.24, ahead: 0.3 };
/** How far clear of the serpent king's body (along the line between them) he kneels, and the bounds on that. */
const KNEEL_CLEAR = 0.85;
const KNEEL_FROM = [2.4, 3.2];
/** The step he takes up to the sword from where he stood to listen (m). */
const STEP_UP = 0.55;
/** Seconds the blade takes to swing up from point-down, through level in front of him, into his hold. */
const SWING_UP = 0.5;
/** Where the mace lies, from where he stood (m to his left, and ahead): its head beside his left foot as he kneels. */
const MACE_LAID = { left: 0.5, ahead: 0.35 };
/** The mace on the ground (hero_mace.glb): its head's centre up the haft from the grip, and its radius. */
const MACE_HEAD = { along: 0.56, radius: 0.124 };

/**
 * The take, worked out as the scene begins: where he stands to hear the serpent king out (a step back from where he
 * will kneel, so the sword rises clear of the mace in his hand), where he kneels and faces, the sword's grip and its
 * slot in the stone.
 */
interface Take {
  stand: THREE.Vector3;
  at: THREE.Vector3;
  yaw: number;
  /** His left, level: the sword's flat faces it (toward the sunward cameras). */
  left: THREE.Vector3;
  grip: THREE.Vector3;
  slot: THREE.Vector3;
}

/** Takshaka's sword: standing in the stone, drawn, then in the hero's fist; gone again when the chapter is left. */
let sword: THREE.Object3D | null = null;
/** Its model loading: a fresh copy each time the scene is told, freed with it. */
let swordLoad: Promise<THREE.Object3D> | null = null;
let take: Take | null = null;
/** Which telling is current (putting things back cancels one whose sword is still loading). */
let raising = 0;
/** It is his: in his fist with the summit's hold (drawn, or put there at once by a skipped scene). */
let held = false;
/** The mace he laid down for it: on the ground, and where it goes back to in his hand. */
let laid: { mace: THREE.Object3D; hand: THREE.Object3D; position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 } | null = null;
/** Putting it all back is set to happen when the chapter is left (SceneFX's clear). */
let restoreArmed = false;

function loadSword(): Promise<THREE.Object3D> {
  swordLoad ??= CharacterRig.loadProp(KHANDA_URL).catch((err) => {
    swordLoad = null;
    throw err;
  });
  return swordLoad;
}

/** Frees a prop that was drawn (its own copy: the model's buffers are shared by URL, never its meshes). */
function disposeProp(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    for (const m of ([] as THREE.Material[]).concat(mesh.material ?? [])) {
      (m as THREE.MeshToonMaterial).map?.dispose();
      m.dispose();
    }
  });
}

/**
 * The mace back in his hands and no sword anywhere: when the chapter is left (a retry, the summit, the title) and at
 * the opening. The summit's kit then gives him his own khanda; a retry here starts with the mace.
 */
function restore(player: Player): void {
  raising++;
  take = null;
  held = false;
  swordLoad = null;
  if (sword) {
    player.rig?.detach(sword);
    sword.removeFromParent();
    disposeProp(sword);
    sword = null;
  }
  if (laid) {
    const { mace, hand, position, quaternion, scale } = laid;
    laid = null;
    hand.add(mace);
    mace.position.copy(position);
    mace.quaternion.copy(quaternion);
    mace.scale.copy(scale);
  }
  player.swordMesh.visible = true;
}

/** Once per telling: put everything back when the chapter is left. */
function restoreLater(s: Stage): void {
  if (restoreArmed) return;
  restoreArmed = true;
  SceneFX.onClear(() => {
    restoreArmed = false;
    restore(s.player);
  });
}

/**
 * How far the serpent king's fallen body reaches toward the hero along the line between them (within a body's width of
 * it, below waist height), from his skinned mesh as it lies: an arm flung out toward the boy reaches ~1.75 m.
 */
function bodyReach(s: Stage, toward: THREE.Vector3): number {
  const body = s.actor('takshaka');
  const from = s.pos('takshaka');
  const dir = toward.clone().sub(from).setY(0).normalize();
  const vertex = new THREE.Vector3();
  let reach = 0;
  body?.rig?.root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.visible) return;
    mesh.updateMatrixWorld(true);
    const count = mesh.geometry.attributes.position.count;
    for (let i = 0; i < count; i += 5) {
      mesh.getVertexPosition(i, vertex).applyMatrix4(mesh.matrixWorld).sub(from);
      const across = Math.abs(vertex.x * dir.z - vertex.z * dir.x);
      if (vertex.y < 0.8 && across < 0.6) reach = Math.max(reach, vertex.x * dir.x + vertex.z * dir.z);
    }
  });
  return reach;
}

/**
 * Where he will kneel, facing the serpent king, clear of his body, and where the sword will stand (worked out once per
 * telling, as the scene begins, from where the two are then).
 */
function planTake(s: Stage): Take {
  if (take) return take;
  const hero = s.pos('hero');
  const distance = THREE.MathUtils.clamp(bodyReach(s, hero) + KNEEL_CLEAR, KNEEL_FROM[0], KNEEL_FROM[1]);
  const at = s.toward('takshaka', 'hero', distance);
  const to = s.pos('takshaka');
  const yaw = Math.atan2(to.x - at.x, to.z - at.z);
  // His right fist at the take, in his own frame (x to his left, z ahead), from the clip itself.
  const p = s.player;
  const socket = p.rig?.socket('Socket_Hand_R');
  p.group.updateMatrixWorld(true);
  const fist = (socket && p.rig!.sampleAt(KNEEL.clip, KNEEL.takeAt, () => p.group.worldToLocal(socket.getWorldPosition(new THREE.Vector3()))))
    ?? v(-0.16, 0.37, 0.2);
  const slot = v(fist.x - SLOT.right, 0, fist.z + SLOT.ahead).applyAxisAngle(UP, yaw).add(at).setY(Y);
  const grip = fist.applyAxisAngle(UP, yaw).add(at);
  const stand = s.toward('takshaka', 'hero', distance + STEP_UP);
  take = { stand, at, yaw, left: v(Math.cos(yaw), 0, -Math.sin(yaw)), grip, slot };
  return take;
}

/** The sword's world orientation with its grip at `grip` and its blade running down into the slot, its flat to his left. */
function inSlot(t: Take, grip: THREE.Vector3, out: THREE.Quaternion): THREE.Quaternion {
  const y = t.slot.clone().sub(grip).normalize();
  const x = new THREE.Vector3().crossVectors(y, t.left).normalize();
  const z = new THREE.Vector3().crossVectors(x, y);
  return out.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/** Out of a burst of naga fire, the khanda stands deep in the stone, leaning, its grip where his fist will close on it. */
function raiseSword(s: Stage): void {
  const t = planTake(s);
  ParticleFX.getInstance().spawnFlames(t.slot.clone().setY(Y + 0.1), 50, 0.6);
  ParticleFX.getInstance().spawnDeflectionShockwave(t.slot.clone().setY(Y + 0.2), undefined, true);
  SoundFX.getInstance().playFlameBurst();
  restoreLater(s);
  const mine = raising;
  void loadSword().then((model) => {
    if (mine !== raising || held || model.parent) return;
    sword = model;
    const level = s.level.group;
    model.scale.setScalar(1 / level.getWorldScale(new THREE.Vector3()).x);
    model.position.copy(level.worldToLocal(t.grip.clone()));
    model.quaternion.copy(level.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(inSlot(t, t.grip, new THREE.Quaternion())));
    level.add(model);
  }, () => undefined);
}

/**
 * He has laid the mace down where he stood to hear the serpent king out: on the stone at his left, its head forward and
 * resting on the stone, its butt on it too, clear of the sword at his right. It happens across the cut into the take,
 * as the summit's dhal is laid down (Summit.ts `layDownShield`): his kneeling hand never comes lower than his knee, so
 * carried down in his fist the mace would go into the stone, and let go of on the way it floats. It stays there, a prop
 * of the level, until the chapter is left.
 */
function layDownMace(s: Stage, t: Take): void {
  const mace = s.player.swordMesh;
  const hand = mace.parent;
  if (laid || !hand) return;
  laid = { mace, hand, position: mace.position.clone(), quaternion: mace.quaternion.clone(), scale: mace.scale.clone() };
  restoreLater(s);
  const level = s.level.group;
  const scale = mace.getWorldScale(new THREE.Vector3()).divide(level.getWorldScale(new THREE.Vector3()));
  level.add(mace);
  mace.scale.copy(scale);
  // Its head on the stone out past his left foot; the haft back along his left side, sloping down to the butt.
  const ahead = v(Math.sin(t.yaw), 0, Math.cos(t.yaw));
  const head = t.stand.clone().addScaledVector(t.left, MACE_LAID.left).addScaledVector(ahead, MACE_LAID.ahead).setY(Y + MACE_HEAD.radius + 0.004);
  const haft = ahead.clone().multiplyScalar(Math.cos(0.125)).add(v(0, Math.sin(0.125), 0));
  const world = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(t.left, haft, t.left.clone().cross(haft)));
  mace.quaternion.copy(level.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
  mace.position.copy(level.worldToLocal(head.addScaledVector(haft, -MACE_HEAD.along)));
}

/**
 * He settles on his mark (the staged walk stops a few centimetres short: he glides the rest, so his fist meets the
 * grip) and goes down on one knee before the sword; at the take his fist closes on it and he draws it (`draw`).
 */
function kneelToTake(s: Stage): void {
  const p = s.player;
  const t = planTake(s);
  restoreLater(s);
  const from = p.group.position.clone();
  const fromYaw = p.group.rotation.y;
  SceneFX.tween(0.3, (k) => {
    p.group.position.lerpVectors(from, t.at, k);
    p.faceYaw(fromYaw + wrapAngle(t.yaw - fromYaw) * k);
  });
  p.playClip(KNEEL.clip, { timeScale: KNEEL.timeScale, fade: 0.3 });
  SceneFX.every(() => {
    if (take !== t || held || p.rig?.clip !== KNEEL.clip) return false;
    if (p.rig.time < KNEEL.takeAt) return true;
    draw(s, t);
    return false;
  });
}

/**
 * The draw. His fist on the grip, he rises, and the khanda slides up out of its slot in the stone along its own length
 * with his hand (it turns about the slot as his fist goes up, leaning less); once its point is out it swings up through
 * level in front of him, point toward Takshaka, into his hold, and from there it is held as the summit holds it.
 */
function draw(s: Stage, t: Take): void {
  const p = s.player;
  const hand = p.rig?.socket('Socket_Hand_R');
  const blade = sword;
  if (!blade || !hand) {
    takeNow(s);
    return;
  }
  p.playClip(RISE.clip, { timeScale: RISE.timeScale, fade: 0.25 });
  hand.updateWorldMatrix(true, false);
  // The few millimetres the fist missed the grip by close as he takes the weight.
  const missed = blade.getWorldPosition(new THREE.Vector3()).sub(hand.getWorldPosition(new THREE.Vector3()));
  const ahead = v(Math.sin(t.yaw), 0, Math.cos(t.yaw));
  // Level in front of him, point toward the serpent king, flat to his left: halfway up the swing.
  const level = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(t.left.clone().cross(ahead).negate(), ahead, t.left));
  hand.add(blade);
  blade.scale.setScalar(1 / hand.getWorldScale(new THREE.Vector3()).x);
  const handQ = new THREE.Quaternion();
  const out = new THREE.Quaternion();
  const world = new THREE.Quaternion();
  const gripAt = new THREE.Vector3();
  let age = 0;
  let swing = -1;
  SceneFX.every((dt) => {
    if (take !== t || held || blade.parent !== hand) return false;
    age += dt;
    hand.updateWorldMatrix(true, false);
    hand.getWorldQuaternion(handQ);
    gripAt.copy(missed).multiplyScalar(Math.max(0, 1 - age / 0.25)).add(hand.getWorldPosition(new THREE.Vector3()));
    // Through the slot until its point is out of the stone, then up into his hold.
    if (swing < 0) {
      inSlot(t, gripAt, world);
      if (gripAt.distanceTo(t.slot) >= KHANDA_POINT) {
        swing = 0;
        out.copy(world);
      }
    } else {
      swing = Math.min(1, swing + dt / SWING_UP);
      const k = THREE.MathUtils.smoothstep(swing, 0, 1);
      if (k < 0.5) world.slerpQuaternions(out, level, k * 2);
      else world.slerpQuaternions(level, handQ, k * 2 - 1);
    }
    blade.quaternion.copy(handQ).invert().multiply(world);
    blade.position.copy(hand.worldToLocal(gripAt.clone()));
    if (swing < 1) return true;
    p.rig!.attach(blade, KHANDA);
    held = true;
    return false;
  });
}

/**
 * However the scene went (skipped, or the sword still loading at the take): the mace laid down and the khanda in his
 * hand, now. Essential, so the chapter-complete screen and a replay find him as the story left him.
 */
function takeNow(s: Stage): void {
  const t = planTake(s);
  restoreLater(s);
  layDownMace(s, t);
  if (held) return;
  const mine = raising;
  void loadSword().then((model) => {
    if (mine !== raising || held || !s.player.rig?.attach(model, KHANDA)) return;
    sword = model;
    held = true;
    // A scene skipped part way left him going down on his knee or rising: on his feet, at ease.
    s.player.stateMachine.changeState('IDLE');
  }, () => undefined);
}

/**
 * "Rest, serpent king": he lowers the khanda and stands at ease, a calm standing idle rather than the guard, as he
 * will be behind the chapter-complete screen. (At ease his hold eases to the summit's lowered one by itself.)
 */
function lowerSword(s: Stage): void {
  s.player.stateMachine.changeState('IDLE');
}

/**
 * A point in the take's own frame: `fwd` metres toward the serpent king and `left` to the hero's left of where he
 * kneels, `up` above the floor (the sword's shots are framed in it; his left is the sunward side).
 */
function takeFrame(s: Stage, fwd: number, left: number, up: number): THREE.Vector3 {
  const t = planTake(s);
  return t.at.clone().addScaledVector(v(Math.sin(t.yaw), 0, Math.cos(t.yaw)), fwd).addScaledVector(t.left, left).setY(Y + up);
}

// ------------------------------------------------------------------------------------------------- the story

/** Where the hero stands as Shalva falls: a few paces off him, on the line he fought along. */
const heroStart = (s: Stage) => s.toward('shalva', 'hero', THREE.MathUtils.clamp(s.pos('shalva').distanceTo(s.pos('hero')), 3.4, 4.6));

export const DWARKA_STORY: ChapterStory = {
  // Their shades, for their last words.
  cast: [shadeOf('shalva', SHALVA), shadeOf('takshaka', TAKSHAKA)],

  // Shalva waits on the rosette. He knows the mace, and he knows the boy.
  opening: {
    id: 'dwarka-opening',
    shots: [
      // Side on, low, across the arena: the hero walks in with the mace in both hands.
      {
        fadeIn: 0.4,
        ease: ease.drift,
        sway: 0.012,
        linesAt: 1.8,
        cues: [
          { at: 0, run: (s) => restore(s.player), essential: true },
          { at: 0, actor: 'hero', face: 'shalva' },
          { at: 0, actor: 'shalva', face: 'hero' },
          { at: 0.3, actor: 'hero', moveTo: (s) => s.toward('shalva', 'hero', 6.5), face: 'shalva' },
        ],
        lines: [{ speaker: 'Shalva', text: 'So the island gave up its mace. To a boy from a burned village.', voice: 'dwarka_open_shalva_1' }],
        camera: (s): CameraKey[] => {
          const { mid, side, dir } = pair(s, 'hero', 'shalva');
          return [
            { pos: mid.clone().addScaledVector(side, 11).addScaledVector(dir, 0.6).add(v(0, 1.8, 0)), look: mid.clone().addScaledVector(dir, 0.6).add(v(0, 1.3, 0)), fov: 46 },
            { pos: mid.clone().addScaledVector(side, 10).addScaledVector(dir, 0.9).add(v(0, 1.6, 0)), look: mid.clone().addScaledVector(dir, 0.9).add(v(0, 1.3, 0)), fov: 44 },
          ];
        },
      },
      // Over Shalva's shoulder, down at the hero.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.012,
        lines: [{ speaker: 'Yudhveer', text: 'Where is my guru?' }],
        camera: (s): CameraKey[] => {
          const { pb, dir, side } = pair(s, 'hero', 'shalva');
          const look = s.head('hero');
          return [
            { pos: pb.clone().addScaledVector(dir, 1.2).addScaledVector(side, 1.4).add(v(0, 2.6, 0)), look, fov: 34 },
            { pos: pb.clone().addScaledVector(dir, 1.0).addScaledVector(side, 1.3).add(v(0, 2.5, 0)), look, fov: 31 },
          ];
        },
      },
      // Up at Shalva from in front of the hero.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.01,
        lines: [{
          speaker: 'Shalva',
          text: 'Far beyond your reach, and further every day. Beat me, and I will tell you why he was taken. Fail, and the sea can have you.',
          voice: 'dwarka_open_shalva_2',
        }],
        camera: (s): CameraKey[] => {
          const { pa, dir, side } = pair(s, 'hero', 'shalva');
          const look = s.head('shalva');
          return [
            { pos: pa.clone().addScaledVector(dir, 1.6).addScaledVector(side, 1.2).add(v(0, 1.1, 0)), look, fov: 36 },
            { pos: pa.clone().addScaledVector(dir, 1.9).addScaledVector(side, 1.1).add(v(0, 1.0, 0)), look, fov: 33 },
          ];
        },
      },
      // He roars and lifts the gada; the hero sets his feet. Behind the hero, out to the fight.
      {
        fadeIn: 0.12,
        ease: ease.inOut,
        linesAt: 1.6,
        cues: [{ at: 0.1, actor: 'shalva', clip: 'mutant_roaring', timeScale: 1.1 }, { at: 0.3, run: () => SoundFX.getInstance().playRoar(0.9) }],
        lines: [{ speaker: 'Yudhveer', text: 'Then lift your gada.' }],
        camera: (s): CameraKey[] => {
          const { pa, dir, side } = pair(s, 'hero', 'shalva');
          const look = s.pos('shalva').add(v(0, 1.6, 0));
          return [
            { pos: pa.clone().addScaledVector(dir, -1.9).addScaledVector(side, 0.9).add(v(0, 1.8, 0)), look, fov: 44 },
            { pos: pa.clone().addScaledVector(dir, -3.0).addScaledVector(side, 0.6).add(v(0, 2.2, 0)), look, fov: 50 },
          ];
        },
      },
    ],
  },

  beats: [
    // Shalva falls. Before anything else comes for the boy (the engine holds the finale for a due beat), he keeps
    // his word: Andhaka's purpose, and where the guru is kept. Then the sea stirs.
    {
      on: { fallen: 'shalva' },
      scene: {
        id: 'dwarka-shalva-falls',
        shots: [
          // The boy, breathing hard, watching Shalva go down (the fall is behind the camera: heard, not seen).
          {
            duration: 2.0,
            fadeIn: 0.5,
            ease: ease.drift,
            sway: 0.008,
            cues: [
              { at: 0, actor: 'hero', place: heroStart, face: 'shalva' },
            ],
            camera: (s) => shadeTalk(s, 'shalva', pair(s, 'hero', 'shalva').side).watching(heroStart(s), s.pos('shalva')),
          },
          // Low beside his way in: he walks into the frame toward the fallen king and the camera eases in after him,
          // tilting up as the shade rises over the body against the storm (the body below the frame).
          {
            duration: 3.4,
            fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.008,
            cues: [
              ...shadeRises('shalva', 1.0),
              { at: 0.1, actor: 'hero', moveTo: (s) => s.toward('shalva', 'hero', 1.9), face: shade('shalva') },
            ],
            camera: (s) => shadeTalk(s, 'shalva', pair(s, 'hero', 'shalva').side).rise(s.pos('shalva'), s.toward('shalva', 'hero', 1.9)),
          },
          // Low on the hero's side, up at the shade alone against the storm, as it speaks.
          {
            fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.01,
            cues: [{ at: 0, actor: shade('shalva'), face: 'hero' }],
            lines: [{ speaker: 'Shalva', text: 'Enough. You have earned your answer, boy. Much good may it do you.', voice: 'dwarka_fall_shalva_1' }],
            camera: (s) => shadeTalk(s, 'shalva').lowSingle(),
          },
          // Over the boy's shoulder, from his eyes, up at it: the truth about Andhaka.
          {
            fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.01,
            lines: [{
              speaker: 'Shalva',
              text: 'Andhaka gathers souls. Wise ones: sages, teachers, the ones a village listens to. He burns them before his god.',
              voice: 'dwarka_fall_shalva_2',
            }],
            camera: (s) => shadeTalk(s, 'shalva').overHero(),
          },
          // The reverse, from behind the shade's shoulder: the boy looks up at it.
          {
            fadeIn: 0.12,
            ease: ease.out,
            sway: 0.01,
            lines: [{ speaker: 'Yudhveer', text: 'To what end?' }],
            camera: (s) => shadeTalk(s, 'shalva').reverse(),
          },
          // Close on the shade, from below, for the rest of it.
          {
            fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.01,
            lines: [{
              speaker: 'Shalva',
              text: 'Every soul he burns makes him greater. When the fire is high enough, he will stand against Shiva himself, and take his seat on Kailasha.',
              voice: 'dwarka_fall_shalva_3',
            }],
            camera: (s) => shadeTalk(s, 'shalva').lowClose(),
          },
          // The boy alone: his guru.
          {
            fadeIn: 0.12,
            ease: ease.out,
            sway: 0.01,
            lines: [{ speaker: 'Yudhveer', text: 'And my guru?' }],
            camera: (s) => shadeTalk(s, 'shalva').heroSingle(),
          },
          // Low behind the boy, the two of them: where the guru is kept.
          {
            fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.01,
            lines: [{
              speaker: 'Shalva',
              text: 'The wisest of them all, Andhaka says. He keeps him for the last fire, on the summit.',
              voice: 'dwarka_fall_shalva_4',
            }],
            camera: (s) => shadeTalk(s, 'shalva').twoShot(),
          },
          // Closer still on the shade for its last words.
          {
            fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.01,
            lines: [{ speaker: 'Shalva', text: 'But you will not live to climb it. The serpent king does not let his prey leave this shore.', voice: 'dwarka_fall_shalva_5' }],
            camera: (s) => shadeTalk(s, 'shalva').lowClose(0.45),
          },
          // The sea stirs behind him: a hiss from the water, and the hero turns to it; Shalva's shade sinks back into
          // the stones and is gone. (Takshaka's own arrival follows.)
          {
            duration: 2.6,
            fadeIn: 0.15,
            ease: ease.out,
            sway: 0.02,
            cues: [
              { at: 0, actor: shade('shalva'), appear: false, over: 1.4 },
              { at: 0.2, run: () => SoundFX.getInstance().playRoar(0.7, 'naga') },
              { at: 0.5, actor: 'hero', face: (s) => s.pos('hero').multiplyScalar(-1).setY(Y) },
            ],
            camera: (s): CameraKey[] => {
              const h = s.pos('hero');
              const out = h.clone().multiplyScalar(-1).setY(0).normalize();
              const look = h.clone().addScaledVector(out, 8).setY(Y + 1.2);
              return [
                { pos: h.clone().addScaledVector(out, -1.8).add(v(0.5, 1.7, 0.5)), look, fov: 42 },
                { pos: h.clone().addScaledVector(out, -2.6).add(v(0.6, 2.0, 0.6)), look, fov: 48 },
              ];
            },
          },
        ],
      },
    },
  ],

  // Takshaka dying: he served Andhaka and was sure no one could stand against him; he sees what the boy is, and
  // gives him his sword. The khanda stands in the stone in a burst of naga fire, and the hero takes it up.
  ending: {
    id: 'dwarka-ending',
    shots: [
      // The serpent king down at the arena's edge, the hero walking up to him; his shade rises out of him.
      {
        duration: 3.6,
        fadeIn: 0.9,
        ease: ease.drift,
        cues: [
          { at: 0, run: () => void loadSword().catch(() => undefined) },
          { at: 0, actor: 'hero', place: (s) => s.toward('takshaka', 'hero', Math.min(4.5, s.pos('takshaka').distanceTo(s.pos('hero')))), face: 'takshaka' },
          ...shadeRises('takshaka', 1.3),
          // Up to a step short of where he will kneel for the sword: clear of the body, however it fell (`planTake`).
          { at: 0.5, actor: 'hero', moveTo: (s) => planTake(s).stand, face: shade('takshaka') },
        ],
        // Low beside the hero's way in, up past him to where the shade rises against the storm (the body below the
        // frame), easing in after him.
        camera: (s) => shadeTalk(s, 'takshaka', pair(s, 'hero', 'takshaka').side).rise(s.pos('takshaka'), planTake(s).stand),
      },
      // Low on the hero's side, up at the serpent king's shade alone against the storm.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.012,
        cues: [{ at: 0, actor: shade('takshaka'), face: 'hero' }],
        lines: [{
          speaker: 'Takshaka',
          text: 'A hundred years I kept the sea for him. I have watched kings kneel to Andhaka, and gods look away.',
          voice: 'dwarka_end_takshaka_1',
        }],
        camera: (s) => shadeTalk(s, 'takshaka').lowSingle(),
      },
      // Close on the serpent king's shade, from below: the prophecy, and the gift.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.01,
        linesAt: 0.6,
        lines: [{
          speaker: 'Takshaka',
          text: 'You will not defeat him, boy... No. I was the fool. You were born to end his reign. Take my sword.',
          voice: 'dwarka_end_takshaka_2',
        }],
        camera: (s) => shadeTalk(s, 'takshaka').lowClose(),
      },
      // Naga fire between them, and out of it the sword, standing deep in the stone, leaning, its hilt toward him.
      {
        duration: 3.4,
        fadeIn: 0.1,
        ease: ease.out,
        sway: 0.015,
        cues: [{ at: 0.4, run: raiseSword }],
        // Low on his sunward left: the boy standing, the sword in the stone a step in front of him, the serpent king's
        // hand beyond it.
        camera: (s): CameraKey[] => [
          { pos: takeFrame(s, 0.55, 3.0, 0.75), look: takeFrame(s, 0.05, -0.25, 0.45), fov: 44 },
          { pos: takeFrame(s, 0.5, 2.6, 0.68), look: takeFrame(s, 0.1, -0.25, 0.42), fov: 42 },
        ],
      },
      // The mace laid on the stone beside him (across the cut), he steps up to the sword and goes down on one knee before
      // it; his fist closes on the grip, and as he rises the khanda slides up out of the stone with it and swings up into
      // his guard.
      {
        duration: 5.8,
        fadeIn: 0.12,
        ease: ease.drift,
        cues: [
          { at: 0, run: (s) => layDownMace(s, planTake(s)) },
          { at: 0.05, actor: 'hero', moveTo: (s) => planTake(s).at, face: 'takshaka' },
          { at: 0.75, run: kneelToTake },
          // The sword-and-dhal idle: the khanda up and ready, as the summit will hold it.
          { at: 4.45, actor: 'hero', clip: 'idle' },
          { at: 5.7, run: takeNow, essential: true },
        ],
        // Low on his sunward left, a little ahead of him, clear of the serpent king's body: the mace laid on the stone
        // in front of him, his fist on the leaning hilt, the blade sliding out of the stone; drifting up as he rises.
        camera: (s): CameraKey[] => [
          { pos: takeFrame(s, 1.0, 2.3, 0.75), look: takeFrame(s, 0.25, 0, 0.55), fov: 42 },
          { pos: takeFrame(s, 0.95, 2.1, 1.05), look: takeFrame(s, 0.2, 0, 0.95), fov: 42 },
        ],
      },
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.01,
        linesAt: 0.5,
        cues: [{ at: 0, actor: 'hero', face: shade('takshaka') }, { at: 0.6, run: lowerSword }],
        lines: [{ speaker: 'Yudhveer', text: 'Rest, serpent king. I will carry it to the summit.' }],
        camera: (s): CameraKey[] => {
          const { pa, dir, side } = pair(s, 'hero', 'takshaka');
          const look = s.head('hero');
          return [
            { pos: pa.clone().addScaledVector(dir, 1.4).addScaledVector(side, 1.0).add(v(0, 1.3, 0)), look, fov: 36 },
            { pos: pa.clone().addScaledVector(dir, 1.2).addScaledVector(side, 0.9).add(v(0, 1.35, 0)), look, fov: 33 },
          ];
        },
      },
      // The camera rises away over the arena and the sea; the serpent king's shade sinks back into the stone and is
      // gone, and the picture fades. He keeps the khanda (and the mace lies where he laid it) behind the
      // chapter-complete screen; leaving the chapter puts the mace back in his hands (`restore`), and the summit's kit
      // gives him his own khanda.
      {
        duration: 4.4,
        fadeIn: 0.2,
        fadeOut: 1.6,
        ease: ease.drift,
        cues: [{ at: 0.3, actor: shade('takshaka'), appear: false, over: 2.2 }],
        camera: (s): CameraKey[] => {
          const { mid, side } = pair(s, 'hero', 'takshaka');
          const look = mid.clone().add(v(0, 0.8, 0));
          return [
            { pos: mid.clone().addScaledVector(side, 4).add(v(0, 2.4, 0)), look, fov: 44 },
            { pos: mid.clone().addScaledVector(side, 8).add(v(0, 6.5, 0)), look, fov: 48 },
          ];
        },
      },
    ],
  },
};

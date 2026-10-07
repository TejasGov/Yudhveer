import * as THREE from 'three';
import { ease, type CameraKey } from '../../cinematics/CinematicDirector';
import type { ChapterStory, Stage } from '../../cinematics/Scene';
import { SceneFX } from '../../cinematics/SceneFX';
import { CharacterRig } from '../../entities/animation/CharacterRig';
import { Enemy } from '../../entities/Enemy';
import { BossShalva } from '../../entities/BossShalva';
import { seaHeight, seaLevel, type LivingSea } from '../../levels/environment/LivingSea';
import { burnAway, charged, grade, hush, impact, strike } from '../../cinematics/Entrance';
import { seaBurst, waterColumn } from '../../levels/environment/SeaBurst';
import { wrapAngle, type Character } from '../../entities/Character';
import type { Player } from '../../entities/Player';
import { ParticleFX } from '../../combat/ParticleFX';
import { SoundFX } from '../../combat/SoundFX';
import { DWARKA_FLOOR_Y, DWARKA_STARTS } from '../../levels/Level3_Dwarka';
import { WEAPON_SETS } from '../../entities/characters/YodhaWeapons';
import { SHALVA } from '../../entities/characters/Shalva';
import { shade, shadeConversation, shadeRises } from '../Story';
import { asset } from '../../core/Assets';

/*
 * Chapter IV, Dwarka (docs/STORY.md, "Milestone 8"). The hero comes with the island's mace; Shalva comes up out of
 * the storm sea and leaps into the arena (the storm entrance, below), and beaten, tells him what Andhaka is doing
 * with the souls he takes. Then Takshaka comes up out of the
 * sea, and dying, sees what the boy is and gives him his sword: the magical khanda the summit is fought with.
 *
 * The sun is low over the sea to the south (+z): faces turned that way are lit, so the cameras stand on that side.
 *
 * Both fallen speak where they fell, each in his own way (Story.ts, "How the dead speak"): Shalva on his feet, hunched
 * over his wound, until the sea takes him; Takshaka on the stone, his head lifted, until he burns away in naga fire.
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

// ---------------------------------------------------------------------------------------- the storm entrance

/*
 * Shalva's entrance (docs/proposals/ENTRANCES.md, "Shalva"). The chapter opens on the storm sea, drained to silver:
 * lightning comes down into the empty water far out past the south-east shore, and where it struck he comes up out of
 * the sea, roaring, the storm crawling over his armour. Far off on the water he lifts his gada to the sky and the next
 * bolt comes down onto it. He crouches and goes up out of the sea in one bound, the water thrown up after him in a
 * column; the boy, on the arena's stone, sees a black shape falling out of the storm at him; and in the hush he comes
 * down on the east mark, fist and gada to the stone, the floor cracking out from him in lightning, and the colour comes
 * back into the world with the blow. He rises, and his name lands over the roar.
 *
 * One clip makes the bound (Mixamo "Mutant Jump Attack"): its crouch, its takeoff at 0.55 s, its rise, its fall, its
 * touchdown at 1.5 s and its three-point landing (the fist on the stone at 1.7 s, up again by 3 s), cut across four
 * shots: the scene carries him (up out of the sea, down out of the clouds) while the clip is held on its rising and
 * falling frames.
 *
 * The figure on the sea is a stand-in, `shalva_far`, one of the story's cast (the same model, drawn as a black shape
 * with a cold rim; no body, so it can stand on the water and be thrown through the air). The boss waits unseen on his
 * mark (SPAWNS, hidden) and is shown in colour as the stand-in touches down; a skipped or settled scene shows him there
 * at once.
 */

/** Where he comes up in the sea: out past the south-east shore, where the water is open (the harbour lies north). */
const SEA_MARK = v(26, 0, 52);
/** How deep his feet are when the bolt strikes (all of him under) and once he has risen (thigh-deep in the swells). */
const UNDER = 3.3;
const WADING = 0.85;
const FAR = 'shalva_far';
/** The bound (Mixamo "Mutant Jump Attack"), in clip seconds. */
const BOUND = {
  clip: 'mutant_jump_attack',
  crouch: 0.15,
  takeoff: 0.55,
  /** Legs drawn up, rising (held as the scene carries him up out of the sea). */
  rising: 0.92,
  /** Coming down, gada ready (held as he falls out of the storm). */
  falling: 1.18,
  touchdown: 1.5,
};
/** Gada over his head to the sky, feet on the ground (Mixamo "Standing Melee Run Jump Attack", its top). */
const CALL = { clip: 'standing_melee_run_jump_attack', at: 1.62 };
/** How far (radians) the roar (`mutant_roaring` from 0.6 s) turns his chest and head to his left at its height. */
const ROAR_TURN = 0.47;
/** How high over the east mark he is as the impact shot finds him falling into its frame. */
const DROP_FROM = 4.5;

/** How deep the stand-in's feet are under the water now, and whether he is riding the sea at all. */
let sunk = UNDER;
let afloat = false;
/** The stand-in's current flight (a new one, or the scene's end, stops the last). */
let flight = 0;

/** The level direction from the arena's centre out to the sea mark, and its left-hand side. */
function seaward(): { out: THREE.Vector3; side: THREE.Vector3 } {
  const out = SEA_MARK.clone().setY(0).normalize();
  return { out, side: v(out.z, 0, -out.x) };
}

/**
 * A camera point out toward the sea: `r` metres from the arena's centre along his line, `aside` to the left, `above`
 * the water there. The arena stands 7.6 m over a low rock shelf (y about 1.5 from 14 to 22 m out), the sea is open
 * from 24 m out and reefs lie beside his line from 26 to 34 m: the far shots sit on the water itself past them, 40 m
 * out, with nothing in frame but sea, sky and him (the concept's frames), high enough that the storm's swells pass
 * under the lens.
 */
function onTheWater(r: number, above: number, aside = 0): THREE.Vector3 {
  const { out, side } = seaward();
  return out.multiplyScalar(r).addScaledVector(side, aside).setY(seaLevel() + above);
}

/** The sea's surface at the mark. */
const surfaceAtMark = () => seaHeight(SEA_MARK.x, SEA_MARK.z);
/** Where the gada's head is as he holds it up to the sky (the bolt lands on it). */
const gadaHead = (s: Stage) => s.head(FAR).add(v(0, 1.0, 0));

/** Holds `actor` on one frame of `clip` (clip seconds), blending into it over `fade` (world seconds). */
function pose(actor: Character, clip: string, at: number, fade = 0.2): void {
  if (actor.playClip(clip, { startAt: at, fade })) actor.rig?.hold(at);
}

/** Calls `fn` once `actor`'s clip `clip` has played to `at` (clip seconds), unless another clip has taken over. */
function whenClip(actor: Character, clip: string, at: number, fn: () => void): void {
  SceneFX.every(() => {
    if (actor.rig?.clip !== clip) return false;
    if (actor.rig.time < at) return true;
    fn();
    return false;
  });
}

/**
 * Puts the stand-in under the sea at the mark, facing the arena, and keeps him riding the swells (his feet `sunk`
 * metres under the surface) until he leaves the water or the scene ends; a ring of spray now and then at the waterline
 * once he is up.
 */
function underTheSea(s: Stage): void {
  const far = s.actor(FAR);
  if (!far) return;
  flight++;
  sunk = UNDER;
  far.setPosition(SEA_MARK.x, surfaceAtMark() - sunk, SEA_MARK.z);
  far.faceYaw(Math.atan2(-SEA_MARK.x, -SEA_MARK.z));
  far.playClip('orc_idle', { fade: 0 });
  far.group.visible = true;
  afloat = true;
  let spray = 0;
  SceneFX.every((dt) => {
    if (!afloat) return false;
    // He rides a third of the swell: the sea heaves about him rather than carrying him (and the close shots hold him).
    const p = far.group.position;
    const surface = seaHeight(p.x, p.z);
    const still = seaLevel();
    p.y = still + (surface - still) * 0.35 - sunk;
    far.markTeleported();
    // Spray thrown off him where he stands in the sea.
    spray -= dt;
    if (spray <= 0 && sunk < 2.4) {
      spray = 0.25;
      ParticleFX.getInstance().spawnDustPuff(p.clone().setY(surface + 0.2), 8);
    }
    return true;
  });
  SceneFX.onClear(() => {
    afloat = false;
    flight++;
    sunk = UNDER;
  });
}

/**
 * The storm rising on the open sea (LivingSea.surge): the swells heaving `heave` times their height, whitecaps and
 * spume by `storm`, eased there over `seconds` (game time); back to the sea as it was when the chapter is left.
 */
function seaStorm(s: Stage, heave: number, storm: number, seconds: number): void {
  const sea = (s.level as { sea?: LivingSea | null }).sea;
  if (!sea) return;
  const from = sea.surging;
  SceneFX.tween(seconds, (k) => sea.surge(THREE.MathUtils.lerp(from.heave, heave, k), THREE.MathUtils.lerp(from.storm, storm, k)));
  SceneFX.onClear(() => sea.surge(1, 0));
}

/** Lightning comes down into the empty sea where he will rise, and the water bursts. */
function summon(s: Stage): void {
  const at = SEA_MARK.clone().setY(surfaceAtMark());
  strike(1.6, 0.22, { at, level: s.level, width: 0.6 });
  seaBurst(at, { radius: 9, seconds: 0.9, spray: 12 });
  SoundFX.getInstance().playSplash(5);
}

/**
 * He comes up out of the water where it struck, over `seconds` (world time), roaring at the sky, the sea bursting away
 * from him and the storm crawling over his armour.
 */
function riseFromTheSea(s: Stage, seconds: number): void {
  const far = s.actor(FAR);
  if (!far) return;
  far.playClip('mutant_roaring', { timeScale: 0.85, fade: 0.1 });
  const from = sunk;
  SceneFX.tween(seconds, (k) => { sunk = THREE.MathUtils.lerp(from, WADING, k); }, { ease: (t) => 1 - (1 - t) * (1 - t) * (1 - t) });
  seaBurst(far.group.position.clone().setY(surfaceAtMark()), { radius: 12, seconds: 1.1, spray: 16 });
  SoundFX.getInstance().playSplash(5);
  charged(far, seconds * 2.2, { arcs: 5, width: 0.045 });
}

/** He lifts the gada to the sky (a slow blend into the held frame), standing on the water. */
function callTheStorm(s: Stage): void {
  const far = s.actor(FAR);
  if (far) pose(far, CALL.clip, CALL.at, 1.1);
}

/**
 * The bound out of the sea: he crouches, and at the clip's takeoff the sea is thrown up after him in a column, a bolt
 * comes down with him, and the scene carries him up and in toward the island, held on the clip's rising frame.
 */
function bound(s: Stage): void {
  const far = s.actor(FAR);
  if (!far) return;
  far.faceYaw(Math.atan2(-SEA_MARK.x, -SEA_MARK.z));
  far.playClip(BOUND.clip, { startAt: BOUND.crouch, fade: 0.12 });
  whenClip(far, BOUND.clip, BOUND.takeoff, () => {
    afloat = false;
    const at = far.group.position.clone().setY(surfaceAtMark());
    waterColumn(at, { height: 20, radius: 1.9, seconds: 2.6 });
    seaBurst(at, { radius: 11, seconds: 1.1, spray: 14 });
    SoundFX.getInstance().playSplash(5);
    strike(1.5, 0.1, { at: s.head(FAR), level: s.level, width: 0.32 });
    const id = ++flight;
    const velocity = seaward().out.multiplyScalar(-7).setY(24);
    SceneFX.every((dt) => {
      if (id !== flight) return false;
      far.group.position.addScaledVector(velocity, dt);
      far.markTeleported();
      if (far.rig?.clip === BOUND.clip && far.rig.time >= BOUND.rising) far.rig.hold(BOUND.rising);
      return true;
    });
  });
}

/** His fall out of the storm: from high over the sea's edge to just over the east mark (the impact shot takes him on). */
function fallLine(s: Stage): { from: THREE.Vector3; to: THREE.Vector3 } {
  const mark = s.pos('shalva');
  const { out } = seaward();
  return {
    from: mark.clone().addScaledVector(out, 9).add(v(0, 24, 0)),
    to: mark.clone().addScaledVector(out, 1.5).add(v(0, DROP_FROM + 4, 0)),
  };
}

/** Out of the storm over the arena: from high over the sea's edge down toward the east mark, held on the falling frame. */
function fallFromTheStorm(s: Stage, seconds: number): void {
  const far = s.actor(FAR);
  if (!far) return;
  afloat = false;
  const id = ++flight;
  const mark = s.pos('shalva');
  const { out } = seaward();
  const { from, to } = fallLine(s);
  far.setPosition(from.x, from.y, from.z);
  far.faceYaw(Math.atan2(to.x - from.x, to.z - from.z));
  pose(far, BOUND.clip, BOUND.falling, 0);
  let t = 0;
  SceneFX.every((dt) => {
    if (id !== flight) return false;
    t = Math.min(seconds, t + dt);
    const k = t / seconds;
    far.group.position.lerpVectors(from, to, k * (0.55 + 0.45 * k));
    far.markTeleported();
    return t < seconds;
  });
}

/**
 * The last of the fall, into the impact shot's frame: from `DROP_FROM` metres over the east mark, the clip running on
 * from its falling frame and the body brought down so the feet meet the stone exactly at its touchdown.
 */
function dropOntoTheMark(s: Stage): void {
  const far = s.actor(FAR);
  if (!far) return;
  const id = ++flight;
  const mark = s.pos('shalva');
  const hero = s.pos('hero');
  far.faceYaw(Math.atan2(hero.x - mark.x, hero.z - mark.z));
  far.setPosition(mark.x, mark.y + DROP_FROM, mark.z);
  far.playClip(BOUND.clip, { startAt: BOUND.falling, fade: 0 });
  SceneFX.every(() => {
    if (id !== flight || far.rig?.clip !== BOUND.clip) return false;
    const k = THREE.MathUtils.clamp((far.rig.time - BOUND.falling) / (BOUND.touchdown - BOUND.falling), 0, 1);
    far.group.position.set(mark.x, mark.y + DROP_FROM * (1 - k * k), mark.z);
    far.markTeleported();
    if (k < 1) return true;
    touchdown(s, far.rig.time);
    return false;
  });
}

/**
 * He is down: the stand-in gone and the boss in his place in colour, the same frame of the same clip, the floor
 * cracking out from him in lightning, a bolt coming down with him, the boom, and the world's sound back.
 */
function touchdown(s: Stage, clipTime: number): void {
  afloat = false;
  flight++;
  const far = s.actor(FAR);
  const boss = s.actor('shalva');
  if (far) far.group.visible = false;
  if (!boss) return;
  const at = s.pos('shalva');
  const hero = s.pos('hero');
  boss.faceYaw(Math.atan2(hero.x - at.x, hero.z - at.z));
  boss.group.visible = true;
  boss.playClip(BOUND.clip, { startAt: clipTime, fade: 0 });
  grade(0, 0.08);
  seaStorm(s, 1.4, 0.35, 3);
  strike(1.6, 0.04, { at: at.clone().add(v(0, 1.2, 0)), level: s.level, width: 0.55 });
  impact(at, { color: 0xa8c8ff, radius: 10, wet: true, jolt: 0.24, strength: 1.2 });
  charged(boss, 1.8, { arcs: 4, width: 0.04 });
}

// ------------------------------------------------------------------------------------------------ the climb

/*
 * The bridge from the island (the user, 2026-10-07): the boy climbs the arena's west face out of the rain, hauls himself
 * over its lip and calls Shalva out across the stone to the sea; then the storm entrance. Mixamo "Climbing Up Wall",
 * "Braced Hang To Crouch" and "Yelling Out". The mace is put away for the climb (it would go through the rock) and is
 * in his hands again as he stands.
 */
const CLIMB = {
  /** On the west face, his feet as the climb shot finds him; where his hands meet the lip; where he stands to call. */
  face: v(-13.75, 4.5, 0.4),
  lip: v(-13.35, 8.05, 0.4),
  stand: v(-11.0, Y, 0.4),
  /** "Braced Hang To Crouch": where his feet end up over where they began, on the ledge it climbs onto (m). */
  hangRise: 1.48,
};

/** On the west face, climbing: the clip's own rise carried on by the scene, the mace put away. */
function climbing(s: Stage, seconds: number): void {
  const p = s.player;
  p.swordMesh.visible = false;
  p.carried = true;
  SceneFX.onClear(() => {
    p.swordMesh.visible = true;
    p.carried = false;
  });
  p.faceYaw(Math.PI / 2);
  p.setPosition(CLIMB.face.x, CLIMB.face.y, CLIMB.face.z);
  p.playClip('climbing_up_wall', { fade: 0 });
  const from = CLIMB.face.clone();
  SceneFX.tween(seconds, (k) => {
    p.group.position.set(from.x, from.y + 0.9 * k, from.z);
    p.markTeleported();
  }, { ease: (t) => t });
}

/** Over the lip: he hauls himself up onto the arena's edge and comes up into a crouch on the stone. */
function overTheLip(s: Stage): void {
  const p = s.player;
  p.faceYaw(Math.PI / 2);
  // The clip climbs its own body up onto the ledge (its feet end 1.48 m over where they began) but not forward: the
  // scene carries him in over the lip as he comes up.
  const from = v(CLIMB.lip.x - 0.3, CLIMB.lip.y - CLIMB.hangRise, CLIMB.lip.z);
  p.setPosition(from.x, from.y, from.z);
  p.playClip('braced_hang_to_crouch', { fade: 0 });
  SceneFX.tween(1.1, (k) => {
    p.group.position.set(from.x + 0.75 * Math.max(0, (k - 0.35) / 0.65), from.y, from.z);
    p.markTeleported();
  });
}

/** He stands at the edge and calls Shalva out, across the stone to the sea. */
function callOut(s: Stage): void {
  const p = s.player;
  p.carried = false;
  p.setPosition(CLIMB.stand.x, CLIMB.stand.y, CLIMB.stand.z);
  p.faceYaw(Math.atan2(SEA_MARK.x - CLIMB.stand.x, SEA_MARK.z - CLIMB.stand.z));
  p.swordMesh.visible = true;
  p.playClip('yelling_out', { fade: 0.2 });
}

// ------------------------------------------------------------------------------------------------- the story

/** Where the hero stands as Shalva falls: a few paces off him, on the line he fought along. */
const heroStart = (s: Stage) => s.toward('shalva', 'hero', THREE.MathUtils.clamp(s.pos('shalva').distanceTo(s.pos('hero')), 3.4, 4.6));

export const DWARKA_STORY: ChapterStory = {
  // The figure on the sea (the storm entrance, above), and their shades, for their last words.
  cast: [
    // A black shape with a cold rim (the prologue's Andhaka): seen against the storm, never in the face until he lands.
    { id: FAR, rig: SHALVA, at: SEA_MARK.clone(), face: v(0, 0, 0), hidden: true, silhouette: { color: 0xd2deff } },
  ],

  // The storm entrance (above): the bolt into the empty sea, his rising, the bolt onto his gada, the bound, the fall
  // out of the storm, the landing; then the boy's question, the raider's one answer, and the fight.
  opening: {
    id: 'dwarka-storm-entrance',
    shots: [
      // Low on the rock shelf under the arena's west face, up at him against the storm: the boy climbing the last of
      // the wall out of the rain.
      {
        duration: 2.8,
        fadeIn: 0.4,
        ease: ease.drift,
        sway: 0.015,
        cues: [{ at: 0, run: (s) => climbing(s, 2.8) }],
        camera: (): CameraKey[] => [
          { pos: CLIMB.face.clone().add(v(-3.6, -1.6, 2.4)), look: CLIMB.face.clone().add(v(0, 1.4, 0)), fov: 44 },
          { pos: CLIMB.face.clone().add(v(-3.2, -1.5, 2.1)), look: CLIMB.face.clone().add(v(0, 2.3, 0)), fov: 42 },
        ],
      },
      // On the arena's stone at the edge, low: his hands come over the lip and he hauls himself up into a crouch.
      {
        duration: 1.9,
        fadeIn: 0.08,
        ease: ease.out,
        sway: 0.012,
        cues: [{ at: 0, run: (s) => overTheLip(s) }],
        camera: (): CameraKey[] => [
          { pos: CLIMB.lip.clone().add(v(2.6, -0.1, 1.9)), look: CLIMB.lip.clone().add(v(0, 0.2, 0)), fov: 40 },
          { pos: CLIMB.lip.clone().add(v(2.4, 0.1, 1.7)), look: CLIMB.lip.clone().add(v(0.3, 0.9, 0)), fov: 40 },
        ],
      },
      // Low in front of him, the arena and the storm behind: he stands and calls Shalva out, across the stone to the
      // sea.
      {
        duration: 3.0,
        fadeIn: 0.06,
        ease: ease.drift,
        sway: 0.015,
        linesAt: 1.1,
        cues: [{ at: 0, run: (s) => callOut(s) }],
        lines: [{ speaker: 'Yudhveer', text: 'SHALVA!', voice: 'dwarka_open_hero_1' }],
        camera: (): CameraKey[] => {
          const toSea = SEA_MARK.clone().sub(CLIMB.stand).setY(0).normalize();
          const side = v(toSea.z, 0, -toSea.x);
          return [
            { pos: CLIMB.stand.clone().addScaledVector(toSea, 3.1).addScaledVector(side, 1.0).add(v(0, 0.55, 0)), look: CLIMB.stand.clone().add(v(0, 1.45, 0)), fov: 40 },
            { pos: CLIMB.stand.clone().addScaledVector(toSea, 2.6).addScaledVector(side, 0.8).add(v(0, 0.6, 0)), look: CLIMB.stand.clone().add(v(0, 1.55, 0)), fov: 36 },
          ];
        },
      },
      // The picture drains to silver and grain. Down on the water on a long lens: rain, swells, the horizon, nothing.
      // Lightning comes down into the empty sea far out, and the water bursts where it struck.
      {
        duration: 2.9,
        fadeIn: 0.5,
        ease: ease.drift,
        sway: 0.02,
        cues: [
          { at: 0, run: (s) => restore(s.player), essential: true },
          // (Across the cut, he has walked in from the edge to where he will fight.)
          { at: 0, run: (s) => { s.player.carried = false; }, essential: true },
          { at: 0, actor: 'hero', place: DWARKA_STARTS.hero, face: SEA_MARK },
          { at: 0, run: (s) => underTheSea(s) },
          { at: 0, run: () => grade(1, 0.01) },
          { at: 0, run: (s) => seaStorm(s, 1.7, 1, 0.01) },
          { at: 0, actor: 'hero', face: SEA_MARK },
          { at: 1.5, run: (s) => summon(s) },
        ],
        camera: (): CameraKey[] => {
          const look = SEA_MARK.clone().setY(surfaceAtMark() + 1.6);
          return [
            { pos: onTheWater(40, 2.1, -1.2), look, fov: 36 },
            { pos: onTheWater(40.6, 1.9, -1.0), look, fov: 32 },
          ];
        },
      },
      // Close and low at the water, the world slowing: where it struck, he comes up out of the sea roaring at the sky,
      // the water bursting away from him, the storm crawling over his armour, a bolt onto him.
      {
        duration: 3.6,
        timeScale: [[0, 1], [0.35, 0.4], [3.0, 0.4], [3.6, 0.8]],
        fadeIn: 0.1,
        ease: ease.out,
        sway: 0.012,
        cues: [
          { at: 0, run: (s) => riseFromTheSea(s, 1.05) },
          { at: 1.5, run: (s) => strike(1.6, 0.12, { at: s.head(FAR).add(v(0, 0.4, 0)), level: s.level, width: 0.26 }) },
        ],
        camera: (s): CameraKey[] => {
          // Framed on the water where he is (he rides the swell), not the still sea.
          const surface = s.pos(FAR).y + sunk;
          const body = s.at(FAR, 0, 0, 0).setY(surface + 1.1);
          return [
            { pos: s.at(FAR, 4.6, 1.5, 0).setY(surface + 0.45), look: body.clone().setY(surface + 1.0), fov: 44 },
            { pos: s.at(FAR, 4.1, 1.3, 0).setY(surface + 0.5), look: body.clone().setY(surface + 1.45), fov: 42 },
          ];
        },
      },
      // Far again, the concept's first frame: a small black figure standing on the storm sea, and he lifts his gada to
      // the sky. The bolt comes down onto it; a second follows.
      {
        duration: 3.2,
        fadeIn: 0.1,
        ease: ease.drift,
        sway: 0.018,
        cues: [
          { at: 0, run: (s) => callTheStorm(s) },
          { at: 1.35, run: (s) => strike(1.6, 0.18, { at: gadaHead(s), level: s.level, width: 0.55 }) },
          { at: 2.05, run: (s) => strike(1.2, 0.4, { at: gadaHead(s), level: s.level, width: 0.45 }) },
        ],
        camera: (): CameraKey[] => {
          const look = SEA_MARK.clone().setY(surfaceAtMark() + 1.9);
          return [
            { pos: onTheWater(40, 2.0, 1.2), look, fov: 50 },
            { pos: onTheWater(40.5, 1.8, 1.0), look, fov: 46 },
          ];
        },
      },
      // Low on the water beside him: he crouches and goes up out of the sea, the world nearly stopping as he leaves it,
      // the water thrown up after him in a column, lightning with him; then full speed and he is gone out of the top.
      {
        duration: 2.9,
        timeScale: [[0, 1], [0.38, 1], [0.6, 0.16], [1.9, 0.16], [2.4, 1]],
        fadeIn: 0.08,
        ease: ease.inOut,
        sway: 0.02,
        cues: [{ at: 0, run: (s) => bound(s) }],
        camera: (s): CameraKey[] => {
          const surface = s.pos(FAR).y + sunk;
          const foot = s.at(FAR, 0, 0, 0).setY(surface + 1.4);
          return [
            { pos: s.at(FAR, 7.5, -11.5, 0).setY(seaLevel() + 1.6), look: foot, fov: 38 },
            { pos: s.at(FAR, 8.0, -12.5, 0).setY(seaLevel() + 1.4), look: foot.clone().setY(surface + 10), fov: 50 },
          ];
        },
      },
      // On the arena's stone, low behind the boy: out of the storm over the sea's edge a black shape is falling at him,
      // a bolt behind it. The rain and the sea go quiet; a swell rises.
      {
        duration: 2.4,
        fadeIn: 0.06,
        ease: ease.inOut,
        sway: 0.015,
        cues: [
          { at: 0, run: (s) => fallFromTheStorm(s, 2.4) },
          { at: 0, actor: 'hero', face: 'shalva' },
          { at: 0.7, run: (s) => strike(1.3, 0.3, { at: s.pos('shalva').addScaledVector(seaward().out, 30).add(v(0, 2, 0)), level: s.level, width: 0.7 }) },
          { at: 0.9, run: () => hush(0.12, 0.9) },
          { at: 0.9, run: () => SoundFX.getInstance().playRiser(2.3) },
        ],
        camera: (s): CameraKey[] => {
          const hero = s.pos('hero');
          const mark = s.pos('shalva');
          const dir = mark.clone().sub(hero).setY(0).normalize();
          const side = v(dir.z, 0, -dir.x);
          const { from, to } = fallLine(s);
          return [
            { pos: hero.clone().addScaledVector(dir, -1.7).addScaledVector(side, 0.7).add(v(0, 0.75, 0)), look: from.clone().add(v(0, -3, 0)), fov: 36 },
            { pos: hero.clone().addScaledVector(dir, -1.9).addScaledVector(side, 0.8).add(v(0, 0.6, 0)), look: to.clone().add(v(0, 1, 0)), fov: 40 },
          ];
        },
      },
      // Low and wide in front of the east mark: he drops into the frame, slowed, and comes down fist and gada to the
      // stone; at full speed the floor cracks out from him in lightning, the colour comes back with the blow, and the
      // world's sound with it. He rises out of the crouch.
      {
        duration: 3.5,
        timeScale: [[0, 0.32], [0.75, 0.32], [0.95, 1]],
        fadeIn: 0,
        ease: ease.out,
        sway: 0.02,
        cues: [
          { at: 0, run: (s) => dropOntoTheMark(s) },
          { at: 0, actor: 'hero', face: 'shalva' },
        ],
        camera: (s): CameraKey[] => [
          { pos: s.at('shalva', 6.4, -2.6, 0.45), look: s.at('shalva', 0, 0, 3.0), fov: 54 },
          { pos: s.at('shalva', 5.6, -2.3, 0.5), look: s.at('shalva', 0, 0, 1.3), fov: 46 },
          { pos: s.at('shalva', 4.6, -1.8, 0.55), look: s.at('shalva', 0, 0, 1.5), fov: 42 },
        ],
      },
      // Low in front of him: he throws his head back and roars at the storm, and his name lands, a sting under it.
      {
        duration: 2.7,
        fadeIn: 0.08,
        ease: ease.out,
        sway: 0.02,
        cues: [
          // However the landing went (skipped, or settled on a retry): in colour, the sound back, the boss on his mark.
          { at: 0, run: (s) => { afloat = false; flight++; grade(0, 0.2); hush(1, 0.2); seaStorm(s, 1.4, 0.35, 0.3); }, essential: true },
          { at: 0, actor: FAR, show: false },
          { at: 0, actor: 'shalva', show: true },
          // Turned a little to his right of the boy: the roar brings his chest and head round to the left by about as much,
          // so at its height he roars straight at him (and the camera between them).
          {
            at: 0,
            run: (s) => {
              const b = s.actor('shalva');
              const at = s.pos('shalva');
              const hero = s.pos('hero');
              b?.faceYaw(Math.atan2(hero.x - at.x, hero.z - at.z) - ROAR_TURN);
            },
          },
          { at: 0.1, actor: 'shalva', play: 'intro' },
          // The roar from where his chest comes round to the front and his head goes back (its first beat and its
          // look round behind him are left out).
          { at: 0.1, run: (s) => { s.actor('shalva')?.playClip('mutant_roaring', { startAt: 0.6, timeScale: 0.6, fade: 0.2 }); } },
          {
            at: 0.85,
            run: (s) => {
              const b = s.actor('shalva');
              if (b instanceof Enemy) s.cards.boss(b);
              SoundFX.getInstance().playSting(1);
            },
          },
        ],
        camera: (s): CameraKey[] => {
          const at = s.pos('shalva');
          const dir = s.pos('hero').sub(at).setY(0).normalize();
          const side = v(dir.z, 0, -dir.x);
          return [
            { pos: at.clone().addScaledVector(dir, 4.6).addScaledVector(side, 0.5).add(v(0, 0.4, 0)), look: at.clone().add(v(0, 1.9, 0)), fov: 38 },
            { pos: at.clone().addScaledVector(dir, 3.9).addScaledVector(side, 0.4).add(v(0, 0.5, 0)), look: at.clone().add(v(0, 2.1, 0)), fov: 33 },
          ];
        },
      },
      // Over Shalva's shoulder, down at the hero.
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.012,
        lines: [{ speaker: 'Yudhveer', text: 'Where is my guru?', voice: 'dwarka_open_hero_2' }],
        camera: (s): CameraKey[] => {
          const { pb, dir, side } = pair(s, 'hero', 'shalva');
          const look = s.head('hero');
          return [
            { pos: pb.clone().addScaledVector(dir, 1.2).addScaledVector(side, 1.4).add(v(0, 2.6, 0)), look, fov: 34 },
            { pos: pb.clone().addScaledVector(dir, 1.0).addScaledVector(side, 1.3).add(v(0, 2.5, 0)), look, fov: 31 },
          ];
        },
      },
      // Up at Shalva from in front of the hero: his one answer (the opening's other three lines went with the old
      // staging; a shorter recording of this one waits for approval, docs/APPROVALS.md).
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
      // The hero sets his feet. Behind him, out to the fight.
      {
        duration: 2.2,
        fadeIn: 0.12,
        ease: ease.inOut,
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
          // Low on the hero's side, up at him alone against the storm, hunched over his wound and still on his feet.
          {
            fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.01,
            lines: [{
              speaker: 'Shalva',
              text: 'Andhaka gathers souls. Wise ones: sages, teachers, the ones a village listens to. He burns them before his god.',
              voice: 'dwarka_fall_shalva_2',
            }],
            camera: (s) => shadeTalk(s, 'shalva').lowSingle(),
          },
          // The boy alone: his guru.
          {
            fadeIn: 0.12,
            ease: ease.out,
            sway: 0.01,
            lines: [{ speaker: 'Yudhveer', text: 'And my guru?', voice: 'dwarka_fall_hero_1' }],
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
          // Closer on him for his last words.
          {
            fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.01,
            lines: [{ speaker: 'Shalva', text: 'But you will not live to climb it. The serpent king does not let his prey leave this shore.', voice: 'dwarka_fall_shalva_5' }],
            camera: (s) => shadeTalk(s, 'shalva').lowClose(0.45),
          },
          // The sea he threatened the boy with takes him: his dark water opens under him and he sinks into the stone,
          // and from the water comes the serpent king's hiss; the hero turns to it. (Takshaka's own arrival follows.)
          {
            duration: 2.6,
            fadeIn: 0.15,
            ease: ease.out,
            sway: 0.02,
            cues: [
              // (Essential: skipped, he is gone under the stone all the same, clear of the serpent king's way.)
              { at: 0, run: (s) => { const b = s.actor('shalva'); if (b instanceof BossShalva) b.seaTakesHim(2.0); }, essential: true },
              { at: 0.2, run: () => SoundFX.getInstance().playRoar(0.7, 'naga') },
              { at: 0.5, actor: 'hero', face: (s) => s.pos('hero').multiplyScalar(-1).setY(Y) },
            ],
            // Low and side on to the two of them: he goes down into the dark water, and the camera eases round past the
            // boy as he turns to the hiss.
            camera: (s): CameraKey[] => {
              const { mid, side, pb } = pair(s, 'hero', 'shalva');
              const look = pb.clone().add(v(0, 1.0, 0));
              return [
                { pos: mid.clone().addScaledVector(side, 4.6).add(v(0, 0.8, 0)), look, fov: 42 },
                { pos: mid.clone().addScaledVector(side, 5.2).add(v(0, 1.4, 0)), look: mid.clone().add(v(0, 1.2, 0)), fov: 46 },
              ];
            },
          },
        ],
      },
    },
  ],

  // Takshaka dying where he fell, his head lifted off the stone: he sees what the boy is, and gives him his sword. The
  // khanda stands in the stone in a burst of naga fire, the hero takes it up, and the serpent king burns away in his
  // own green fire as the camera rises into the storm (the summit's sky takes it from there: Summit's intro). His first
  // line ("A hundred years I kept the sea...") is cut.
  ending: {
    id: 'dwarka-ending',
    shots: [
      // The serpent king down on the stone, the hero walking up to him; low across the stone at his lifted head.
      {
        duration: 3.6,
        fadeIn: 0.9,
        ease: ease.drift,
        cues: [
          { at: 0, run: () => void loadSword().catch(() => undefined) },
          { at: 0, actor: 'hero', place: (s) => s.toward('takshaka', 'hero', Math.min(4.5, s.pos('takshaka').distanceTo(s.pos('hero')))), face: 'takshaka' },
          // Up to a step short of where he will kneel for the sword: clear of the body, however it fell (`planTake`).
          { at: 0.5, actor: 'hero', moveTo: (s) => planTake(s).stand, face: 'takshaka' },
        ],
        camera: (s): CameraKey[] => {
          const head = s.head('takshaka');
          const { dir, side } = pair(s, 'takshaka', 'hero');
          const pos = head.clone().addScaledVector(dir, -1.6).addScaledVector(side, 1.4).setY(Y + 0.35);
          return [
            { pos, look: head.clone().lerp(planTake(s).stand.clone().setY(Y + 1.2), 0.5), fov: 44 },
            { pos: pos.clone().addScaledVector(side, -0.3), look: head.clone().lerp(planTake(s).stand.clone().setY(Y + 1.4), 0.6), fov: 40 },
          ];
        },
      },
      // Over the boy's shoulder, down at the serpent king's head on the stone: the prophecy, and the gift.
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
        camera: (s): CameraKey[] => {
          const head = s.head('takshaka');
          const { pa, dir, side } = pair(s, 'hero', 'takshaka');
          const eye = s.head('hero').y;
          const look = head.clone().add(v(0, 0.2, 0));
          return [
            { pos: pa.clone().addScaledVector(dir, -0.9).addScaledVector(side, 0.65).setY(eye + 0.15), look, fov: 36 },
            { pos: pa.clone().addScaledVector(dir, -0.6).addScaledVector(side, 0.55).setY(eye + 0.1), look, fov: 32 },
          ];
        },
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
        cues: [{ at: 0, actor: 'hero', face: 'takshaka' }, { at: 0.6, run: lowerSword }],
        lines: [{ speaker: 'Yudhveer', text: 'Rest, serpent king. I will carry it to the summit.', voice: 'dwarka_end_hero_1' }],
        camera: (s): CameraKey[] => {
          const { pa, dir, side } = pair(s, 'hero', 'takshaka');
          const look = s.head('hero');
          return [
            { pos: pa.clone().addScaledVector(dir, 1.4).addScaledVector(side, 1.0).add(v(0, 1.3, 0)), look, fov: 36 },
            { pos: pa.clone().addScaledVector(dir, 1.2).addScaledVector(side, 0.9).add(v(0, 1.35, 0)), look, fov: 33 },
          ];
        },
      },
      // The camera rises away over the arena as the serpent king burns away in green naga fire, and tilts up into the
      // storm: the summit's intro opens on its own sky (the bridge to Chapter V). He keeps the khanda (and the mace lies
      // where he laid it) behind the chapter-complete screen; leaving the chapter puts the mace back in his hands
      // (`restore`), and the summit's kit gives him his own khanda.
      {
        duration: 5.2,
        fadeIn: 0.2,
        fadeOut: 0.8,
        ease: ease.inOut,
        cues: [{ at: 0.3, run: (s) => { const t = s.actor('takshaka'); if (t) burnAway(t, 0x46ffb4, 2.8); } }],
        camera: (s): CameraKey[] => {
          const { mid, side } = pair(s, 'hero', 'takshaka');
          const look = mid.clone().add(v(0, 0.8, 0));
          return [
            { pos: mid.clone().addScaledVector(side, 4).add(v(0, 2.4, 0)), look, fov: 44 },
            { pos: mid.clone().addScaledVector(side, 7).add(v(0, 5.5, 0)), look: mid.clone().add(v(0, 6, 0)), fov: 50 },
            { pos: mid.clone().addScaledVector(side, 8).add(v(0, 7.5, 0)), look: mid.clone().addScaledVector(side, -10).add(v(0, 60, 0)), fov: 56 },
          ];
        },
      },
    ],
  },
};

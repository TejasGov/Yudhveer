import * as THREE from 'three';
import { ease, type CameraKey } from '../../cinematics/CinematicDirector';
import type { ChapterStory, SceneShot, Stage } from '../../cinematics/Scene';
import { SceneFX } from '../../cinematics/SceneFX';
import { CharacterRig } from '../../entities/animation/CharacterRig';
import type { Character } from '../../entities/Character';
import type { Enemy } from '../../entities/Enemy';
import { MENTOR_CAST } from '../../entities/characters/Akhada';
import { YODHA } from '../../entities/characters/Yodha';
import { CombatSystem } from '../../combat/CombatSystem';
import { SoundFX } from '../../combat/SoundFX';
import { twoShot } from '../Story';

/*
 * Chapter II, the Hanuman forest akhada, from sunset into night (docs/STORY.md, "Chapter II" and "Milestone 6").
 *
 *   Opening (a cutscene): Yudhveer at sword practice against the old vanara, who knocks him about; the dhal handed
 *     over ("A dhal is not for hiding").
 *   Training (played): the vanara spars with him. Three blows taken on the guard teach the parry; three blows turned
 *     with it end the lesson. The guard and the parry are the akhada kit's `taught` moves, learned here.
 *   Arrival (a cutscene): the Vetala and Mayavi come out of the north end as night falls and the lamps are lit; the
 *     vanara stands aside to watch.
 *   The fight, with the vanara calling from the verandah; then the ending: he sends the boy to Dwarka, and warns him
 *     that Shalva's mace will break a sword, which points him at the island.
 *
 * The vanara is two characters with one model: `mentor_spar`, the sparring partner (an Enemy, entities/Vanara.ts,
 * spawned by the Engine, on guard with his staff), and `mentor`, the story's cast member who takes his place once the
 * lesson is over (leaning on the planted staff; `MENTOR_CAST`).
 *
 * Time of day is the level's (`Level2_Akhada.cue`): `day` as the opening starts, `dusk` and `twilight` as the lesson
 * goes on, `nightfall` as the two come out, and `night` (essential) at the arrival's end, so a skipped arrival or a
 * retry (which settles it) is full night with the lamps burning.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Where everyone stands. The Engine spawns the sparring vanara and the hidden bosses on these marks. */
export const AKHADA_MARKS = {
  /** The training circle, on the north-south line through the oculus' shaft of light (the sun, later the moon). */
  hero: v(0, 0, 5.2),
  mentor: v(0, 0, 2.6),
  /**
   * Where the vanara squares up for the lesson: well off to the boy's right front (~48 deg), so the follow camera
   * (behind the boy, looking north, over his right shoulder) keeps him clear of the boy even once he has closed in
   * to strike (straight down the line, he would be hidden behind him).
   */
  spar: v(2.1, 0, 3.3),
  /** Where the vanara watches the real fight from: the west verandah's edge. */
  aside: v(-8, 0, 5.5),
  /** The Vetala and Mayavi wait out of sight at the north end, by the monolith, and come out from there... */
  vetalaWaits: v(5, 0, -10.5),
  mayaviWaits: v(-5, 0, -11),
  /** ...to where they stand to fight. */
  vetala: v(2.5, 0, -2.8),
  mayavi: v(-3.2, 0, -5.5),
};
const M = AKHADA_MARKS;

/** The akhada's open middle, and the south gateway the hero leaves by. */
const AKHADA_CENTRE = v(0, 0, -4);
const AKHADA_GATE = v(0, 0, 40);

/**
 * The lesson, across one visit to the chapter (a session): once it has been passed, a retry goes straight to the
 * fight. `hitsAtArrival` and `blocksAtParry` are tallies at the moment a stage of it began.
 */
const drill = { done: false, hitsAtArrival: 0, blocksAtParry: 0 };
/** The lesson is to be taught afresh: a new campaign, or a first attempt measured by the playtest (src/debug/Playtest.ts). */
export function forgetLesson(): void {
  drill.done = false;
  drill.hitsAtArrival = 0;
  drill.blocksAtParry = 0;
}
const stats = () => CombatSystem.getInstance().stats;
const sfx = () => SoundFX.getInstance();

/** The hero's dhal, on his arm or not (it is handed to him in the opening). */
function dhal(s: Stage, on: boolean): void {
  s.player.shieldMesh.visible = on;
}

// ------------------------------------------------------------------------------------------- the dhal handed over

/**
 * "Here." (opening shot 4): the vanara holds the dhal out in his free left hand (`staff_point`, the hand going out at
 * chest height) and the boy reaches for it with his left, palm up (`casting_2`, his hand out in front of him); on the
 * frame their hands meet it is laid on the boy's palm and is his. Both clips are sampled (as BossAndhaka places his
 * crown and sword at his entrance's marks), so the vanara stands where his fist is on the dhal's far rim at that frame
 * and the boy's hand under its middle: the dhal goes over with no jump. `meet` is clip seconds; `at` is shot seconds,
 * on the word in the recording (`akhada_train_mentor_1`: "Here." at 4.07 s, the lines start at 0.8).
 */
const HANDOFF = {
  at: 4.9,
  boy: { clip: 'casting_2', meet: 0.45 },
  vanara: { clip: 'staff_point', meet: 2.1, from: 2.5 },
};
/** The dhal's radius (yodha_dhal.glb, 0.66 m across): the vanara holds its rim, the boy its middle. */
const DHAL_RIM = 0.32;
/** Carried at his side before he holds it out: its middle below his fist, its face out from his left hip. */
const DHAL_CARRY = { below: 0.3, out: 0.06 };

/** The handover worked out (`planHandoff`): where the vanara stands and faces, and how he holds the dhal out. */
interface Handoff {
  at: THREE.Vector3;
  yaw: number;
  /** The dhal in the vanara's left-hand socket's frame at the meet: the boy's own hold of it, then. */
  inHand: THREE.Matrix4;
}

/** The vanara's dhal: the boy's model, loaded for the scene; the boy's own (hidden till then) takes over at the meet. */
interface Lent {
  load: Promise<THREE.Object3D>;
  prop: THREE.Object3D | null;
}
let lent: Lent | null = null;

/**
 * Starts loading the dhal the vanara carries (the boy's own model, already downloaded with his rig). It goes with the
 * vanara's rig if the chapter is left first.
 */
function lendDhal(): void {
  if (lent) return;
  const entry: Lent = { load: CharacterRig.loadProp(YODHA.offhand!.model!), prop: null };
  entry.load.catch(() => { if (lent === entry) lent = null; });
  lent = entry;
  SceneFX.onClear(() => { if (lent === entry) lent = null; });
}

/**
 * Where the vanara must stand so that, both clips at their meet, his fist is on the dhal's far rim and the boy's
 * hand under its middle (the boy where he stands now); and the dhal's hold in the vanara's fist then.
 */
function planHandoff(s: Stage): Handoff | null {
  const boy = s.player;
  const vanara = s.actor('mentor_spar');
  const boyHand = boy.rig?.socket('Socket_Hand_L');
  const hand = vanara?.rig?.socket('Socket_Hand_L');
  if (!vanara?.rig || !boyHand || !hand) return null;
  const dhalNow = boy.shieldMesh;
  boy.group.updateMatrixWorld(true);
  // The dhal on his palm at the meet (his hold of it), and where his hand is.
  const onPalm = boy.rig!.sampleAt(HANDOFF.boy.clip, HANDOFF.boy.meet, () => dhalNow.matrixWorld.clone());
  const middle = boy.rig!.sampleAt(HANDOFF.boy.clip, HANDOFF.boy.meet, () => dhalNow.localToWorld(new THREE.Vector3(0, 0, 0.02)));
  if (!onPalm || !middle) return null;
  // His fist out in front of him at the meet, in his own frame.
  vanara.group.updateMatrixWorld(true);
  const reach = vanara.rig.sampleAt(HANDOFF.vanara.clip, HANDOFF.vanara.meet, () => vanara.group.worldToLocal(hand.getWorldPosition(new THREE.Vector3())));
  if (!reach) return null;
  const from = boy.getPosition();
  let at = vanara.getPosition();
  let yaw = 0;
  for (let i = 0; i < 8; i++) {
    yaw = Math.atan2(from.x - at.x, from.z - at.z);
    // The rim on his side of the dhal's middle, level with it, and where that puts him.
    const away = at.clone().sub(middle).setY(0).normalize();
    const rim = middle.clone().addScaledVector(away, DHAL_RIM);
    const fist = reach.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(at);
    at = at.add(rim.sub(fist).setY(0));
  }
  yaw = Math.atan2(from.x - at.x, from.z - at.z);
  // His fist's frame at the meet, there and so turned: the dhal's hold in it.
  const was = { p: vanara.group.position.clone(), y: vanara.group.rotation.y };
  vanara.group.position.copy(at);
  vanara.group.rotation.y = yaw;
  vanara.group.updateMatrixWorld(true);
  const fist = vanara.rig.sampleAt(HANDOFF.vanara.clip, HANDOFF.vanara.meet, () => hand.matrixWorld.clone());
  vanara.group.position.copy(was.p);
  vanara.group.rotation.y = was.y;
  vanara.group.updateMatrixWorld(true);
  return fist ? { at, yaw, inHand: fist.invert().multiply(onPalm) } : null;
}

/**
 * Shot 4 begins: the vanara stands on his mark with the dhal in his left hand. It hangs at his side while he talks,
 * comes up with his hand as he holds it out, and on the frame the boy's hand meets it the boy's own dhal (on his arm,
 * hidden till now, where this one is that frame) takes its place.
 */
function offerDhal(s: Stage, plan: Handoff): void {
  const vanara = s.actor('mentor_spar');
  const hand = vanara?.rig?.socket('Socket_Hand_L');
  const entry = lent;
  if (!vanara?.rig || !hand || !entry) return;
  void entry.load.then((prop) => {
    if (lent !== entry || entry.prop || !vanara.rig?.attach(prop, { socket: 'Socket_Hand_L', socketFrame: true, restWorldRotation: [0, 0, 0], grip: [0, 0, 0] })) return;
    entry.prop = prop;
    carryDhal(s, vanara, hand, prop, plan);
  }, () => undefined);
}

/** The vanara's dhal, frame by frame, until it is the boy's (see `offerDhal`). */
function carryDhal(s: Stage, vanara: Character, hand: THREE.Object3D, prop: THREE.Object3D, plan: Handoff): void {
  const boy = s.player;
  const mine = boy.shieldMesh;
  const carry = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const world = new THREE.Matrix4();
  const held = new THREE.Matrix4();
  const target = new THREE.Matrix4();
  const p = [new THREE.Vector3(), new THREE.Vector3()];
  const q = [new THREE.Quaternion(), new THREE.Quaternion()];
  const sc = new THREE.Vector3();
  const step = (): boolean => {
    if (lent?.prop !== prop || !prop.parent) return false;
    const rig = vanara.rig!;
    hand.updateWorldMatrix(true, false);
    // At his side: below his fist, upright, its face out from his hip (it follows the fist, not the fist's turn).
    const body = vanara.group.getWorldQuaternion(q[0]);
    const fistAt = hand.getWorldPosition(p[0]);
    const side = new THREE.Vector3(DHAL_CARRY.out, -DHAL_CARRY.below, 0).applyQuaternion(body);
    world.compose(fistAt.add(side), body.multiply(carry), sc.set(1, 1, 1));
    // Out in front of him, in his fist as the boy will take it: eased in as his hand comes up.
    const t = rig.clip === HANDOFF.vanara.clip ? rig.time : 0;
    const up = THREE.MathUtils.smoothstep(t, 1.25, 2.0);
    held.multiplyMatrices(hand.matrixWorld, plan.inHand);
    blend(world, held, up, p, q, sc);
    // The last moment: onto the boy's palm exactly, where his own dhal is.
    const reaching = boy.rig?.clip === HANDOFF.boy.clip ? boy.rig.time : -1;
    if (reaching >= 0) {
      mine.updateWorldMatrix(true, false);
      target.copy(mine.matrixWorld);
      blend(world, target, THREE.MathUtils.smoothstep(reaching, HANDOFF.boy.meet - 0.15, HANDOFF.boy.meet), p, q, sc);
    }
    if (reaching >= HANDOFF.boy.meet) {
      giveDhal(s);
      return false;
    }
    // Into the fist's frame (it rides the hand between steps).
    world.premultiply(hand.matrixWorld.clone().invert()).decompose(prop.position, prop.quaternion, prop.scale);
    return true;
  };
  // Placed at once (it was put on the fist just now), then every step.
  if (step()) SceneFX.every(step);
}

/** `a` toward `b` by `k` (positions and turns, unit scale), into `a`. */
function blend(a: THREE.Matrix4, b: THREE.Matrix4, k: number, p: THREE.Vector3[], q: THREE.Quaternion[], s: THREE.Vector3): void {
  if (k <= 0) return;
  a.decompose(p[0], q[0], s);
  b.decompose(p[1], q[1], s);
  a.compose(p[0].lerp(p[1], k), q[0].slerp(q[1], k), s.set(1, 1, 1));
}

/** The dhal is his: the vanara's goes, his own (on his arm, where it was that frame) shows. Essential. */
function giveDhal(s: Stage): void {
  const entry = lent;
  lent = null;
  if (entry?.prop) {
    s.actor('mentor_spar')?.rig?.detach(entry.prop);
    // Its own parsed copy: free its meshes and textures (the toon ramp is the vanara's rig's, freed with it).
    entry.prop.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      for (const m of ([] as THREE.Material[]).concat(mesh.material ?? [])) {
        (m as THREE.MeshToonMaterial).map?.dispose();
        m.dispose();
      }
    });
  }
  dhal(s, true);
}

/** Shot 4 begins: the vanara on his mark for the handover, turned to the boy, the dhal in his hand. */
function standToOffer(s: Stage): void {
  const plan = planHandoff(s);
  const vanara = s.actor('mentor_spar');
  if (!plan || !vanara) return;
  vanara.setPosition(plan.at.x, plan.at.y, plan.at.z);
  vanara.faceYaw(plan.yaw);
  offerDhal(s, plan);
}

/**
 * The lesson is over: the cast's vanara takes the sparring one's place (the sparring one leaves the fight, out of
 * sight on the verandah), the hero has his breath and both moves back, and from now on he can fall.
 */
function endLesson(s: Stage): void {
  drill.done = true;
  drill.hitsAtArrival = stats().hitsTaken;
  const spar = s.actor('mentor_spar');
  if (spar) {
    spar.group.visible = false;
    spar.currentHealth = 0;
    spar.stateMachine.changeState('DEAD');
  }
  dhal(s, true);
  s.player.learn('block');
  s.player.learn('parry');
  s.player.mortal = true;
  s.player.currentHealth = s.player.maxHealth;
  s.player.currentMarma = 0;
}

/** A medium close-up of an enemy from its front quarter, drifting in, with its name card. */
function closeUp(id: 'vetala' | 'mayavi', clip: string, side: 1 | -1): SceneShot {
  return {
    duration: 2.9,
    fadeIn: 0.15,
    ease: ease.out,
    sway: 0.02,
    cues: [
      { at: 0, actor: id, place: M[id], face: 'hero' },
      { at: 0, actor: id, play: 'IDLE' },
      { at: 0.2, actor: id, clip },
      { at: 0.4, run: (s) => { const e = s.actor(id); if (e) s.cards.name(e as Enemy); } },
    ],
    camera: (s): CameraKey[] => {
      const h = s.height(id);
      return [
        { pos: s.at(id, h * 1.7, side * h * 0.7, h * 0.62), look: s.at(id, 0, 0, h * 0.62), fov: 36 },
        { pos: s.at(id, h * 1.4, side * h * 0.45, h * 0.72), look: s.at(id, 0, 0, h * 0.7), fov: 34 },
      ];
    },
  };
}

export const AKHADA_STORY: ChapterStory = {
  cast: [
    // The vanara once the lesson is over: out of sight until then (the sparring one is him meanwhile).
    { id: 'mentor', rig: MENTOR_CAST, at: M.aside, face: AKHADA_CENTRE, hidden: true },
  ],

  // Sword practice in the evening sun, a montage: the boy swings, the old vanara swats him aside, again and again;
  // then he hands over the dhal and squares up to teach it.
  opening: {
    id: 'akhada-opening',
    shots: [
      // Side on in the patch of sun: a cut, parried and answered; the boy rocks back.
      {
        duration: 3.6,
        fadeIn: 1.0,
        ease: ease.drift,
        sway: 0.015,
        linesAt: 2.2,
        cues: [
          { at: 0, actor: 'hero', place: M.hero, face: M.mentor },
          { at: 0, actor: 'mentor_spar', place: M.mentor, face: M.hero },
          { at: 0, run: (s) => dhal(s, false) },
          // The dhal he will hand over (shot 4), loading now.
          { at: 0, run: lendDhal },
          // The sunset, lamps out (a restart from the training comes back to it).
          { at: 0, run: (s) => s.level.cue?.('day'), essential: true },
          { at: 0.5, actor: 'hero', clip: 'slash_3', timeScale: 1.2 },
          { at: 0.7, run: () => sfx().playSwordSwing(1, 'blade') },
          { at: 0.6, actor: 'mentor_spar', clip: 'great_sword_slash', timeScale: 1.3 },
          { at: 1.05, run: () => sfx().playParryClash() },
          { at: 1.2, actor: 'hero', clip: 'impact_2', timeScale: 1.1 },
        ],
        lines: [{ speaker: 'Vanara', text: 'Again.', voice: 'akhada_open_mentor_1' }],
        camera: [
          { pos: v(4.6, 1.25, 4.6), look: v(0, 1.0, 3.9), fov: 40 },
          { pos: v(4.0, 1.4, 4.2), look: v(0, 1.05, 3.9), fov: 38 },
        ],
      },
      // Low behind him: the spinning cut, all of himself in it, and the old one simply not there.
      {
        fadeIn: 0.45,
        ease: ease.drift,
        sway: 0.02,
        linesAt: 2.0,
        cues: [
          { at: 0, actor: 'hero', place: M.hero, face: M.mentor },
          { at: 0.25, actor: 'hero', clip: 'slash_4', timeScale: 1.15 },
          { at: 0.45, run: () => sfx().playSwordSwing(0.85, 'blade') },
          { at: 0.35, actor: 'mentor_spar', moveTo: v(-1.1, 0, 2.9), face: 'hero' },
          // Stepped aside, he grounds the staff and talks, unhurried.
          { at: 1.6, actor: 'mentor_spar', clip: 'staff_talk' },
        ],
        lines: [{ speaker: 'Vanara', text: 'You strike where I was, boy. Strike where I will be.', voice: 'akhada_open_mentor_2' }],
        camera: [
          { pos: v(-2.3, 0.6, 9.0), look: v(0, 1.25, 3.4), fov: 42 },
          { pos: v(-2.0, 0.65, 8.5), look: v(0, 1.3, 3.4), fov: 40 },
        ],
      },
      // Over the vanara's shoulder: the boy, stubborn, at it again; the blow meets the staff.
      {
        fadeIn: 0.45,
        ease: ease.drift,
        sway: 0.015,
        linesAt: 1.7,
        cues: [
          { at: 0, actor: 'mentor_spar', place: M.mentor, face: M.hero },
          { at: 0, actor: 'hero', place: M.hero, face: M.mentor },
          { at: 0.3, actor: 'hero', clip: 'slash_5', timeScale: 1.25 },
          { at: 0.45, run: () => sfx().playSwordSwing(1.15, 'blade') },
          { at: 0.4, actor: 'mentor_spar', clip: 'great_sword_slash_4', timeScale: 1.4 },
          { at: 0.8, run: () => sfx().playParryClash() },
        ],
        lines: [{ speaker: 'Yudhveer', text: 'Again.' }],
        camera: (s): CameraKey[] => [
          { pos: s.at('mentor_spar', -1.1, -0.55, 1.55), look: s.head('hero'), fov: 36 },
          { pos: s.at('mentor_spar', -0.95, -0.5, 1.5), look: s.head('hero'), fov: 33 },
        ],
      },
      // He has come up to the boy with the dhal at his side; on "Here." he holds it out and the boy takes it.
      {
        fadeIn: 0.5,
        ease: ease.drift,
        sway: 0.012,
        linesAt: 0.8,
        cues: [
          { at: 0, actor: 'hero', play: 'IDLE' },
          // A long step short of him (~1.5 m: the reach of both their arms and the dhal between), so the staff,
          // planted at his side, stays clear of it.
          { at: 0, run: standToOffer },
          { at: 0.1, actor: 'mentor_spar', clip: 'staff_talk' },
          // "Here.": the vanara's free hand goes out with it, the boy's left hand comes up under it, palm up.
          { at: HANDOFF.vanara.from, actor: 'mentor_spar', clip: HANDOFF.vanara.clip, timeScale: HANDOFF.vanara.meet / (HANDOFF.at - HANDOFF.vanara.from) },
          { at: HANDOFF.at - HANDOFF.boy.meet, actor: 'hero', clip: HANDOFF.boy.clip },
          // It is his (if the scene was skipped or the dhal had not loaded, at once). He settles back into his stand.
          { at: HANDOFF.at + 0.2, run: giveDhal, essential: true },
          { at: HANDOFF.at + 0.9, actor: 'hero', play: 'IDLE' },
          // He talks on, the hand that held it free.
          { at: 7.8, actor: 'mentor_spar', clip: 'staff_talk' },
        ],
        lines: [{
          speaker: 'Vanara',
          text: 'Hmph. You swing like a farmer, boy. Here. A dhal is not for hiding. Meet the blow... and turn it away.',
          voice: 'akhada_train_mentor_1',
        }],
        // Square on to the two of them from the boy's shield side: the vanara left of frame, the dhal right.
        camera: [
          { pos: v(-4.0, 1.5, 4.4), look: v(0, 1.2, 4.45), fov: 38 },
          { pos: v(-3.5, 1.45, 4.45), look: v(0, 1.25, 4.5), fov: 35 },
        ],
      },
      // He steps back to his mark and squares up, the boy turning to keep him in front; over the boy's shoulder,
      // easing back to where the follow camera takes over (behind him, looking north).
      {
        fadeIn: 0.15,
        ease: ease.inOut,
        linesAt: 1.2,
        cues: [
          { at: 0.2, actor: 'mentor_spar', moveTo: M.spar, face: 'hero' },
          { at: 0.6, actor: 'hero', face: M.spar },
        ],
        lines: [{ speaker: 'Vanara', text: 'Raise it. I will come at you, and you will hold.', voice: 'akhada_open_mentor_3' }],
        camera: (s): CameraKey[] => [
          { pos: s.at('hero', -1.9, -0.95, 1.55), look: M.spar.clone().setY(1.2), fov: 40 },
          { pos: M.hero.clone().add(v(0.55, 2.0, 3.3)), look: M.hero.clone().lerp(M.spar, 0.5).setY(1.2), fov: 52 },
        ],
      },
    ],
  },

  beats: [
    // The lesson, stage one: the guard. He cannot fall while the old one is teaching.
    {
      on: { when: () => !drill.done },
      run: (s) => {
        s.player.mortal = false;
        s.player.learn('block');
        // The light starts to go while they spar.
        s.level.cue?.('dusk');
      },
      hint: 'Hold {guard} to raise the dhal and take his blows on it.',
      lines: [{ speaker: 'Vanara', text: 'Feet planted. Here it comes.', voice: 'akhada_train_mentor_2' }],
    },
    {
      on: { when: (s) => !drill.done && !s.player.can('parry') && stats().hitsTaken >= 2 && stats().blocks < 3 },
      hint: 'Hold {guard} to raise the dhal.',
      lines: [{ speaker: 'Vanara', text: 'The dhal does nothing hanging at your side. Raise it!', voice: 'akhada_train_mentor_3' }],
    },
    // Stage two: three blows held, so the parry.
    {
      on: { when: () => !drill.done && stats().blocks >= 3 },
      run: (s) => {
        drill.blocksAtParry = stats().blocks;
        s.player.learn('parry');
        s.level.cue?.('twilight');
      },
      hint: 'Press {guard} just as a blow lands to turn it away. Too early, and you only block.',
      lines: [{
        speaker: 'Vanara',
        text: 'Good. You can stand. Now the harder thing: do not wait for the blow. Meet it as it falls, and turn it.',
        voice: 'akhada_train_mentor_4',
      }],
    },
    {
      on: { when: (s) => !drill.done && s.player.can('parry') && stats().deflections >= 1 },
      lines: [{ speaker: 'Vanara', text: 'Hah! There. Again.', voice: 'akhada_train_mentor_5' }],
    },
    {
      on: { when: (s) => !drill.done && s.player.can('parry') && stats().deflections === 0 && stats().blocks >= drill.blocksAtParry + 4 },
      hint: 'Press {guard} as his staff comes down, not before.',
      lines: [{ speaker: 'Vanara', text: 'Too soon, and you are only hiding. Wait for it... then meet it.', voice: 'akhada_train_mentor_6' }],
    },

    // Three blows turned: the lesson is over, and the akhada has visitors.
    {
      on: { when: (s) => drill.done || (s.player.can('parry') && stats().deflections >= 3) },
      scene: {
        id: 'akhada-arrival',
        shots: [
          // He grounds his staff. (Here the cast's vanara takes the sparring one's place.)
          {
            fadeIn: 0.2,
            ease: ease.drift,
            sway: 0.012,
            cues: [
              { at: 0, actor: 'mentor', place: (s) => s.pos('mentor_spar'), face: 'hero' },
              { at: 0, actor: 'mentor', show: true },
              { at: 0, actor: 'mentor_spar', place: M.aside },
              { at: 0, run: endLesson, essential: true },
              { at: 0, actor: 'hero', face: 'mentor' },
              { at: 0.3, actor: 'mentor', clip: 'staff_talk' },
            ],
            lines: [{ speaker: 'Vanara', text: 'Enough. You will do... for a farmer.', voice: 'akhada_arrive_mentor_1' }],
            camera: (s): CameraKey[] => {
              const { mid, side } = twoShot(s, 'hero', 'mentor', AKHADA_CENTRE);
              const look = s.head('mentor').lerp(mid.clone().setY(1.3), 0.35);
              return [
                { pos: mid.clone().addScaledVector(side, 4.3).setY(1.5), look, fov: 38 },
                { pos: mid.clone().addScaledVector(side, 3.8).setY(1.5), look, fov: 36 },
              ];
            },
          },
          // He turns his head to the north end: two shapes come out from under the monolith as the night comes down
          // and the lamps are lit, one pair after another.
          {
            duration: 5.2,
            fadeIn: 0.15,
            ease: ease.drift,
            linesAt: 0.3,
            cues: [
              { at: 0, run: (s) => s.level.cue?.('nightfall') },
              { at: 0, actor: 'vetala', place: M.vetalaWaits, face: 'hero' },
              { at: 0, actor: 'mayavi', place: M.mayaviWaits, face: 'hero' },
              { at: 0, actor: 'vetala', show: true },
              { at: 0, actor: 'mayavi', show: true },
              { at: 0.2, actor: 'mentor', face: M.vetalaWaits },
              // A look down, then his free hand out at the two of them.
              { at: 0.3, actor: 'mentor', clip: 'staff_point' },
              { at: 0.4, actor: 'hero', face: AKHADA_CENTRE },
              { at: 0.6, actor: 'vetala', moveTo: M.vetala, face: 'hero' },
              { at: 1.0, actor: 'mayavi', moveTo: M.mayavi, face: 'hero' },
            ],
            lines: [{ speaker: 'Vanara', text: 'Hm. You did not climb this hill alone, boy.', voice: 'akhada_arrive_mentor_2' }],
            camera: (s): CameraKey[] => [
              { pos: s.pos('hero').add(v(2.6, 2.9, 4.4)), look: v(0, 1.2, -8), fov: 46 },
              { pos: s.pos('hero').add(v(2.2, 2.5, 3.6)), look: v(0, 1.2, -6.5), fov: 42 },
            ],
          },
          closeUp('vetala', 'power_up', -1),
          closeUp('mayavi', 'casting', 1),
          // The vanara walks off to the verandah to watch; over the boy's shoulder at what he faces.
          {
            fadeIn: 0.15,
            ease: ease.inOut,
            linesAt: 0.3,
            cues: [
              // Full night by now; a skipped or settled arrival lands here at once.
              { at: 0, run: (s) => s.level.cue?.('night'), essential: true },
              { at: 0, actor: 'hero', face: AKHADA_CENTRE },
              { at: 0.3, actor: 'mentor', moveTo: M.aside, face: AKHADA_CENTRE },
            ],
            lines: [{ speaker: 'Vanara', text: 'These two are yours. Show me what the dhal is for.', voice: 'akhada_arrive_mentor_3' }],
            camera: (s): CameraKey[] => {
              const target = M.vetala.clone().lerp(M.mayavi, 0.5);
              return [
                { pos: s.at('hero', -1.9, -0.95, 1.55), look: target.clone().setY(1.3), fov: 40 },
                { pos: s.at('hero', -3.1, -0.6, 2.0), look: target.clone().setY(1.2), fov: 52 },
              ];
            },
          },
        ],
      },
    },

    // From the verandah, while he fights.
    {
      on: { when: () => drill.done && stats().hitsTaken >= drill.hitsAtArrival + 2 },
      lines: [{ speaker: 'Vanara', text: 'Fire turns on a dhal like any blade. Send it back to him.', voice: 'akhada_fight_mentor_1' }],
    },
    { on: { fallen: 'vetala' }, lines: [{ speaker: 'Vanara', text: 'One. Do not stand there admiring it.', voice: 'akhada_fight_mentor_2' }] },
  ],

  // Both down. The old vanara walks out to him: Dwarka, and Shalva's mace, and the island.
  ending: {
    id: 'akhada-ending',
    shots: [
      // From black: wide on the two of them, the vanara coming across the earth to the boy.
      {
        duration: 3.8,
        fadeIn: 0.9,
        ease: ease.drift,
        cues: [
          { at: 0, actor: 'mentor', place: (s) => s.toward('hero', 'mentor', Math.min(4.2, s.pos('mentor').distanceTo(s.pos('hero')))), face: 'hero' },
          { at: 0, actor: 'hero', face: 'mentor' },
          { at: 0.4, actor: 'mentor', moveTo: (s) => s.toward('hero', 'mentor', 1.8), face: 'hero' },
        ],
        camera: (s): CameraKey[] => {
          const { side, mid, dir } = twoShot(s, 'hero', 'mentor', AKHADA_CENTRE);
          return [
            { pos: mid.clone().addScaledVector(side, 6.2).add(v(0, 2.4, 0)).addScaledVector(dir, -0.8), look: mid.clone().add(v(0, 0.8, 0)), fov: 40 },
            { pos: mid.clone().addScaledVector(side, 5.2).add(v(0, 1.9, 0)), look: mid.clone().add(v(0, 0.8, 0)), fov: 38 },
          ];
        },
      },
      // Over the boy's shoulder, down at the old one: a hand to his beard.
      {
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.015,
        cues: [{ at: 0.1, actor: 'mentor', clip: 'staff_ponder' }],
        lines: [{ speaker: 'Vanara', text: 'Hm. Not a farmer, then.', voice: 'akhada_end_mentor_1' }],
        camera: (s): CameraKey[] => [
          { pos: s.at('hero', -1.5, -0.8, 1.9), look: s.head('mentor'), fov: 38 },
          { pos: s.at('hero', -1.35, -0.75, 1.88), look: s.head('mentor'), fov: 36 },
        ],
      },
      // Low beside the vanara, up at the boy.
      {
        fadeIn: 0.12,
        ease: ease.out,
        sway: 0.015,
        cues: [{ at: 0, actor: 'mentor', play: 'IDLE' }],
        lines: [{ speaker: 'Yudhveer', text: 'Where did they take my guru?' }],
        camera: (s): CameraKey[] => [
          { pos: s.at('mentor', -1.3, -1.0, 1.3), look: s.head('hero'), fov: 38 },
          { pos: s.at('mentor', -1.15, -0.95, 1.32), look: s.head('hero'), fov: 36 },
        ],
      },
      // On the vanara, closer: Dwarka, and Shalva. ("Not from me": a slow shake of the head; then he talks it out.)
      {
        fadeIn: 0.12,
        ease: ease.drift,
        sway: 0.012,
        cues: [
          { at: 0, actor: 'mentor', clip: 'staff_shake' },
          { at: 2.7, actor: 'mentor', clip: 'staff_talk' },
        ],
        lines: [
          { speaker: 'Vanara', text: 'Not from me. Go to Dwarka, if you would know why your village burned.', voice: 'akhada_end_mentor_2' },
          {
            speaker: 'Vanara',
            text: 'Shalva holds it now. His mace has broken better blades than yours. Better than mine. A sword will not be enough.',
            voice: 'akhada_end_mentor_3',
          },
        ],
        camera: (s): CameraKey[] => {
          const { side, dir } = twoShot(s, 'mentor', 'hero', AKHADA_CENTRE);
          const head = s.head('mentor');
          return [
            { pos: head.clone().addScaledVector(dir, 2.0).addScaledVector(side, 1.0).add(v(0, 0.1, 0)), look: head, fov: 36 },
            { pos: head.clone().addScaledVector(dir, 1.75).addScaledVector(side, 0.9).add(v(0, 0.1, 0)), look: head, fov: 34 },
          ];
        },
      },
      {
        fadeIn: 0.12,
        ease: ease.out,
        sway: 0.012,
        cues: [{ at: 0, actor: 'mentor', play: 'IDLE' }],
        lines: [{ speaker: 'Yudhveer', text: 'Then what will?' }],
        camera: (s): CameraKey[] => [
          { pos: s.at('mentor', -1.2, -1.0, 1.3), look: s.head('hero'), fov: 36 },
          { pos: s.at('mentor', -1.1, -0.95, 1.32), look: s.head('hero'), fov: 34 },
        ],
      },
      // Side on to the two of them, the lamps behind: the island, and the blessed mace. He looks down, thinking, then
      // points the boy on his way, and talks on.
      {
        fadeIn: 0.15,
        ease: ease.drift,
        sway: 0.01,
        cues: [
          { at: 0.1, actor: 'mentor', clip: 'staff_point' },
          { at: 4.4, actor: 'mentor', clip: 'staff_talk' },
        ],
        lines: [{
          speaker: 'Vanara',
          text: 'Out past the city, on an island, a blessed mace lies waiting. Old things keep it. Take it from them first. Then go to Shalva.',
          voice: 'akhada_end_mentor_4',
        }],
        camera: (s): CameraKey[] => {
          const { side, mid } = twoShot(s, 'hero', 'mentor', AKHADA_CENTRE);
          const look = mid.clone().setY(1.35);
          return [
            { pos: mid.clone().addScaledVector(side, 3.8).setY(1.45), look, fov: 38 },
            { pos: mid.clone().addScaledVector(side, 3.4).setY(1.45), look, fov: 36 },
          ];
        },
      },
      // He turns for the gateway and goes; the old one calls after him; the camera rises and the picture fades.
      {
        duration: 5.6,
        fadeIn: 0.2,
        fadeOut: 1.4,
        ease: ease.drift,
        linesAt: 1.6,
        cues: [
          { at: 0, actor: 'mentor', play: 'IDLE' },
          { at: 0.3, actor: 'hero', face: AKHADA_GATE },
          { at: 0.9, actor: 'hero', moveTo: (s) => s.pos('hero').add(AKHADA_GATE.clone().sub(s.pos('hero')).setY(0).normalize().multiplyScalar(5)) },
        ],
        lines: [{ speaker: 'Vanara', text: 'And keep the dhal up, boy.', voice: 'akhada_end_mentor_5' }],
        camera: (s): CameraKey[] => {
          const h = s.pos('hero');
          const toGate = AKHADA_GATE.clone().sub(h).setY(0).normalize();
          const look = h.clone().addScaledVector(toGate, 3).add(v(0, 0.9, 0));
          return [
            { pos: h.clone().addScaledVector(toGate, -3).add(v(0.8, 2, 0)), look, fov: 44 },
            { pos: h.clone().addScaledVector(toGate, -5.5).add(v(1.2, 4.2, 0)), look, fov: 46 },
          ];
        },
      },
    ],
  },
};

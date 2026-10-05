import * as THREE from 'three';
import { ease, type CameraKey } from '../../cinematics/CinematicDirector';
import type { ChapterStory, Stage } from '../../cinematics/Scene';
import { CharacterRig } from '../../entities/animation/CharacterRig';
import { ParticleFX } from '../../combat/ParticleFX';
import { SoundFX } from '../../combat/SoundFX';
import { DWARKA_FLOOR_Y } from '../../levels/Level3_Dwarka';
import { YODHA } from '../../entities/characters/Yodha';
import { SHALVA } from '../../entities/characters/Shalva';
import { TAKSHAKA } from '../../entities/characters/Takshaka';
import { shade, shadeOf, shadeRises, shadeShots } from '../Story';

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

/** The shades' framings (Story.ts `shadeShots`), on the sunward side of the line from the hero to the shade. */
const shadeOn = (s: Stage, fallen: string) => shadeShots(s, shade(fallen), pair(s, 'hero', shade(fallen)).side);

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

const KHANDA_URL = '/assets/weapons/yodha_khanda.glb';
/** The prepared khanda's grip-to-point length (prepare_weapon.py --length 1.05; its blade ends 0.87 up). */
const KHANDA_POINT = 0.87;

/** Takshaka's sword, standing in the stone and then in the hero's hand; gone again once the scene is over. */
let sword: THREE.Object3D | null = null;
let swordLoad: Promise<THREE.Object3D> | null = null;
/** He has reached for it (it may still be loading); and which raising of it is current (a settle cancels one). */
let taken: Stage | null = null;
let raising = 0;

function loadSword(): Promise<THREE.Object3D> {
  swordLoad ??= CharacterRig.loadProp(KHANDA_URL).catch((err) => {
    swordLoad = null;
    throw err;
  });
  return swordLoad;
}

/** Where the sword stands: between the hero and the fallen serpent king, a little nearer the hero. */
const swordMark = (s: Stage) => s.toward('hero', 'takshaka', 0.8);

/** Out of a burst of naga fire, the khanda stands point down in the stone. */
function raiseSword(s: Stage): void {
  const at = swordMark(s);
  ParticleFX.getInstance().spawnFlames(at.clone().setY(Y + 0.1), 50, 0.6);
  ParticleFX.getInstance().spawnDeflectionShockwave(at.clone().setY(Y + 0.2), undefined, true);
  SoundFX.getInstance().playFlameBurst();
  const mine = ++raising;
  void loadSword().then((model) => {
    if (mine !== raising) return;
    removeSword();
    sword = model;
    model.scale.setScalar(1);
    model.rotation.set(Math.PI, s.player.group.rotation.y, 0); // point down, its edge across his path
    model.position.set(at.x, Y + KHANDA_POINT - 0.08, at.z);
    s.level.group.add(model);
    if (taken) takeSword(taken);
  }, () => undefined);
}

/** He takes it up: the mace goes down (out of sight) and the khanda is in his right fist, as the summit holds it. */
function takeSword(s: Stage): void {
  taken = s;
  const socket = s.player.rig?.socket('Socket_Hand_R');
  if (!sword || !socket) return;
  // The mace hangs off the same socket at 0.7 of its model's size: the khanda is held at its own.
  const scale = s.player.swordMesh.scale.x / 0.7;
  s.player.swordMesh.visible = false;
  sword.removeFromParent();
  sword.position.set(0, 0, 0);
  sword.quaternion.identity();
  sword.scale.setScalar(scale);
  socket.add(sword);
}

/**
 * "Rest, serpent king": he lowers the khanda (the hold it has at ease in his hand, YODHA's REST) and stands at ease, a
 * calm standing idle rather than the guard, as he will be behind the chapter-complete screen.
 */
function lowerSword(s: Stage): void {
  const rest = YODHA.weapon?.stateRotations?.REST;
  if (sword && rest) sword.rotation.set(...rest);
  s.player.stateMachine.changeState('IDLE');
}

function removeSword(): void {
  sword?.removeFromParent();
  sword = null;
}

/** After the scene, or skipped, or the chapter begun again: the mace back in his hands, no sword anywhere. */
function settleSword(s: Stage): void {
  raising++;
  taken = null;
  removeSword();
  s.player.swordMesh.visible = true;
}

// ------------------------------------------------------------------------------------------------- the story

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
          { at: 0, run: settleSword, essential: true },
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
          // Wide: Shalva down on the stones, the hero walking up to him; his shade rises out of him.
          {
            duration: 3.4,
            fadeIn: 0.5,
            ease: ease.drift,
            cues: [
              ...shadeRises('shalva', 1.2),
              { at: 0.6, actor: 'hero', moveTo: (s) => s.toward('shalva', 'hero', 1.9), face: shade('shalva') },
            ],
            camera: (s): CameraKey[] => {
              const { pb, mid, side } = pair(s, 'hero', shade('shalva'));
              const look = mid.lerp(pb, 0.45).add(v(0, 0.6, 0));
              return [
                { pos: look.clone().addScaledVector(side, 7).add(v(0, 2.8, 0)), look, fov: 42 },
                { pos: look.clone().addScaledVector(side, 6).add(v(0, 2.2, 0)), look, fov: 40 },
              ];
            },
          },
          // Up at his shade, from over the hero's shoulder.
          {
            fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.012,
            cues: [{ at: 0, actor: shade('shalva'), face: 'hero' }],
            lines: [
              { speaker: 'Shalva', text: 'Enough. You have earned your answer, boy. Much good may it do you.', voice: 'dwarka_fall_shalva_1' },
              {
                speaker: 'Shalva',
                text: 'Andhaka gathers souls. Wise ones: sages, teachers, the ones a village listens to. He burns them before his god.',
                voice: 'dwarka_fall_shalva_2',
              },
            ],
            camera: (s) => shadeOn(s, 'shalva').overHero(),
          },
          // Over the shade's shoulder, down at the hero.
          {
            fadeIn: 0.12,
            ease: ease.out,
            sway: 0.012,
            lines: [{ speaker: 'Yudhveer', text: 'To what end?' }],
            camera: (s) => shadeOn(s, 'shalva').overShade(),
          },
          // Close on the shade for the rest of it.
          {
            fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.01,
            lines: [{
              speaker: 'Shalva',
              text: 'Every soul he burns makes him greater. When the fire is high enough, he will stand against Shiva himself, and take his seat on Kailasha.',
              voice: 'dwarka_fall_shalva_3',
            }],
            camera: (s) => shadeOn(s, 'shalva').close(),
          },
          {
            fadeIn: 0.12,
            ease: ease.out,
            sway: 0.012,
            lines: [{ speaker: 'Yudhveer', text: 'And my guru?' }],
            camera: (s) => shadeOn(s, 'shalva').overShade(),
          },
          {
            fadeIn: 0.12,
            ease: ease.drift,
            sway: 0.01,
            lines: [
              {
                speaker: 'Shalva',
                text: 'The wisest of them all, Andhaka says. He keeps him for the last fire, on the summit.',
                voice: 'dwarka_fall_shalva_4',
              },
              { speaker: 'Shalva', text: 'But you will not live to climb it. The serpent king does not let his prey leave this shore.', voice: 'dwarka_fall_shalva_5' },
            ],
            camera: (s) => shadeOn(s, 'shalva').close(0.4),
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
      // Wide: the serpent king down at the arena's edge, the hero walking up to him; his shade rises out of him.
      {
        duration: 3.6,
        fadeIn: 0.9,
        ease: ease.drift,
        cues: [
          { at: 0, run: () => void loadSword().catch(() => undefined) },
          { at: 0, actor: 'hero', place: (s) => s.toward('takshaka', 'hero', Math.min(4.5, s.pos('takshaka').distanceTo(s.pos('hero')))), face: 'takshaka' },
          ...shadeRises('takshaka', 1.3),
          { at: 0.5, actor: 'hero', moveTo: (s) => s.toward('takshaka', 'hero', 2.4), face: shade('takshaka') },
        ],
        camera: (s): CameraKey[] => {
          const { mid, side } = pair(s, 'hero', shade('takshaka'));
          return [
            { pos: mid.clone().addScaledVector(side, 7).add(v(0, 2.8, 0)), look: mid.clone().add(v(0, 0.7, 0)), fov: 42 },
            { pos: mid.clone().addScaledVector(side, 6).add(v(0, 2.3, 0)), look: mid.clone().add(v(0, 0.7, 0)), fov: 40 },
          ];
        },
      },
      // Up at his shade, over the hero's shoulder.
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
        camera: (s) => shadeOn(s, 'takshaka').overHero(),
      },
      // Close on the serpent king's shade: the prophecy, and the gift.
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
        camera: (s) => shadeOn(s, 'takshaka').close(),
      },
      // Naga fire between them, and out of it the sword, standing in the stone.
      {
        duration: 3.4,
        fadeIn: 0.1,
        ease: ease.out,
        sway: 0.015,
        cues: [{ at: 0.4, run: raiseSword }],
        camera: (s): CameraKey[] => {
          const { side, dir } = pair(s, 'hero', 'takshaka');
          const at = swordMark(s);
          const look = at.clone().setY(Y + 0.7);
          return [
            { pos: at.clone().addScaledVector(side, 2.6).addScaledVector(dir, -0.9).setY(Y + 1.1), look, fov: 40 },
            { pos: at.clone().addScaledVector(side, 2.1).addScaledVector(dir, -0.7).setY(Y + 1.0), look, fov: 36 },
          ];
        },
      },
      // He lays the mace down, takes the khanda by the grip and draws it out of the stone.
      {
        duration: 5.2,
        fadeIn: 0.12,
        ease: ease.drift,
        cues: [
          { at: 0.1, actor: 'hero', moveTo: (s) => s.toward('takshaka', 'hero', 2.4 - 0.45), face: (s) => swordMark(s) },
          { at: 1.1, actor: 'hero', clip: 'crouch', timeScale: 1.2 },
          { at: 1.9, run: takeSword },
          // The sword-and-dhal idle: the khanda up and ready, as the summit will hold it.
          { at: 2.2, actor: 'hero', clip: 'idle' },
        ],
        camera: (s): CameraKey[] => {
          const { pa, dir, side } = pair(s, 'hero', 'takshaka');
          const look = pa.clone().add(v(0, 1.1, 0));
          return [
            { pos: pa.clone().addScaledVector(dir, 2.8).addScaledVector(side, 1.8).add(v(0, 1.3, 0)), look, fov: 42 },
            { pos: pa.clone().addScaledVector(dir, 2.6).addScaledVector(side, 1.5).add(v(0, 1.5, 0)), look, fov: 40 },
          ];
        },
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
      // gone, and the picture fades.
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
      // In the dark: the mace back in his hands for whenever this chapter is played again.
      { duration: 0.1, fadeIn: 60, cues: [{ at: 0, run: settleSword, essential: true }] },
    ],
  },
};

import * as THREE from 'three';
import type { CameraKey, Shot } from './CinematicDirector';
import { frame, offset, type IntroContext } from './Intros';
import type { Character } from '../entities/Character';
import type { CharacterDefinition } from '../entities/animation/CharacterRig';
import type { CharacterState } from '../entities/CharacterStateMachine';
import type { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Extra } from '../entities/Extra';
import { haunt } from './Shade';
import type { Chapter } from '../game/Chapters';
import type { Ability } from '../game/Progression';
import type { GameLevel } from '../levels/LevelTypes';
import { Voices } from '../combat/Voices';
import { readingTime, VOICE_TAIL, type Dialogue, type Line } from '../ui/Dialogue';

/*
 * Story scenes, authored as data (docs/STORY.md, "Milestone 3"). A scene is a list of shots for the CinematicDirector;
 * each shot can carry dialogue lines and cues for the characters (play a clip, walk to a mark, turn to face someone)
 * or hooks that run code. A chapter declares its scenes and in-fight lines in `Chapter.story`; the Engine plays them.
 */

/**
 * Who a cue or a camera is about: the hero, the chapter's boss (the last to arrive), an enemy by its id, or one of the
 * story's cast (`ChapterStory.cast`) by its id.
 */
export type ActorRef = 'hero' | 'boss' | (string & {});

/** A point in the world, given outright or worked out from the stage when it is needed. */
export type Mark = THREE.Vector3 | ((s: Stage) => THREE.Vector3);

/** A cue at `at` seconds into its shot. */
export type SceneCue = { at: number } & (
  /** A state's clip (`'ATTACK_1'`, `'IDLE'`), or `'intro'`: the enemy's own cutscene beat (a boss's roar). */
  | { actor: ActorRef; play: CharacterState | 'intro' }
  /** Any clip in the character's model file, by name. */
  | { actor: ActorRef; clip: string; timeScale?: number }
  /** Walks (or runs) to a mark, then turns to `face` if given. */
  | { actor: ActorRef; moveTo: Mark; gait?: 'walk' | 'run'; face?: ActorRef | Mark }
  /** Puts the character on a mark at once (off camera), facing `face` if given. */
  | { actor: ActorRef; place: Mark; face?: ActorRef | Mark }
  /** Turns to face someone or something. */
  | { actor: ActorRef; face: ActorRef | Mark }
  /** Shows or hides a character (one of the cast arriving; raiders gone when the picture comes back). */
  | { actor: ActorRef; show: boolean }
  /**
   * A shade (`CastMember.shade`) rises out of the ground and fades in, or sinks and fades away, over `over` seconds
   * (default 1.6); cold motes drift up off it while it is there. Anyone else is shown or hidden, as `show`. A scene
   * that ends before it (skipped, settled) leaves the shade there or gone at once.
   */
  | { actor: ActorRef; appear: boolean; over?: number }
  /**
   * Runs code. `essential`: it changes the game, not just the picture (teaches a move, opens a gate), so it still
   * runs if the scene is skipped before it.
   */
  | { run: (s: Stage) => void; essential?: boolean }
);

export interface SceneShot {
  /** The camera's path, or a function of the stage giving it when the shot starts. Omitted: the frame holds. */
  camera?: CameraKey[] | ((s: Stage) => CameraKey[]);
  /** Seconds. Default: as long as its lines take to say, plus `linesAt` and a breath after. */
  duration?: number;
  ease?: (t: number) => number;
  sway?: number;
  fadeIn?: number;
  fadeOut?: number;
  /** Spoken one after another from `linesAt` seconds (default 0.4). The shot does not end while one is up. */
  lines?: Line[];
  linesAt?: number;
  /**
   * The lines run on over the shots after this one instead of holding it: a long line spoken across cuts (Andhaka's,
   * over his shadow and then the boy's eyes). The shot then needs its own `duration`, and the shots it runs on into
   * should not have lines of their own until it is done.
   */
  carryLines?: boolean;
  cues?: SceneCue[];
}

export interface StoryScene {
  /** Unique. Each scene plays once per session; after that (a retry) it is settled instead of played. */
  id: string;
  shots: SceneShot[];
  /** The letterbox bars (default on). */
  letterbox?: boolean;
}

/** When a mid-fight beat fires (once per attempt at the chapter). */
export type Trigger =
  /** A boss's health (`enemy`: that enemy's) has fallen below this fraction. */
  | { bossBelow: number; enemy?: string }
  /** That enemy has fallen. */
  | { fallen: string }
  /** The hero has just been taught this move (`Player.learn`). */
  | { learned: Ability }
  /** The hero's health has fallen below this fraction. */
  | { heroBelow: number }
  /** Seconds of fighting. */
  | { fightTime: number }
  /** Whichever of these comes first. */
  | { any: Trigger[] }
  | { when: (s: Stage) => boolean };

/**
 * A story beat in the fight: a cutscene (the fight stops, as for a boss's arrival) or lines the hero hears while he
 * fights (the guru's voice). `run` runs as it fires (e.g. teaching the move the guru's line is about).
 */
export type StoryBeat = {
  on: Trigger;
  run?: (s: Stage) => void;
  /** A control hint shown with it (`{guard}`-style placeholders become the right key or button), as a lesson's. */
  hint?: string;
} & ({ scene: StoryScene } | { lines: Line[] });

/**
 * Someone the story brings on who does not fight: the guru, Andhaka seen only as a shadow. Spawned with the chapter
 * (loaded with it, no body to collide with) and moved by scene cues like anyone else (`actor: <id>`).
 */
export interface CastMember {
  id: string;
  rig: CharacterDefinition;
  /** Where it stands when the chapter starts (feet), and what it faces. */
  at: THREE.Vector3;
  face?: THREE.Vector3;
  /** Out of sight until a `show` cue brings it on. */
  hidden?: boolean;
  /**
   * Drawn as a black shape with a rim of `color` light: a figure seen against the sky, never in the face (Andhaka
   * in the prologue).
   */
  silhouette?: { color: THREE.ColorRepresentation };
  /**
   * Drawn pale and see-through, washed in `color` with a glowing rim: someone remembered, not there (the guru in
   * Chapter I). `opacity` defaults to 0.3.
   */
  ghost?: { color: THREE.ColorRepresentation; opacity?: number };
  /**
   * The spirit of someone who has fallen, risen to speak over the body (Shalva, Takshaka, the Baoli Guardian): drawn
   * as a ghost, washed in `color` with a stronger glow and rim (`opacity` defaults to 0.6), hovering a hand's breadth
   * off the ground, breathing and flickering faintly. Brought on and off with `appear` cues, which fade it. Its rig is
   * usually the fallen fighter's without weapons (`shadeOf` in game/Story.ts).
   */
  shade?: { color: THREE.ColorRepresentation; opacity?: number };
}

/** What a chapter tells, and when. */
export interface ChapterStory {
  /** After the chapter's intro, before the fight. */
  opening?: StoryScene;
  beats?: StoryBeat[];
  /** Once the chapter is won, before the chapter-complete screen. */
  ending?: StoryScene;
  /** Its characters who are not in the fight. */
  cast?: CastMember[];
  /**
   * A fight the hero cannot win (the prologue): he cannot fall, and once `on` is met the fight stops, the hero is
   * beaten and the chapter is over: its `ending` plays and the campaign goes on as if it had been won.
   */
  loss?: { on: Trigger };
}

/** Where everyone stands while a scene plays, with helpers to frame them. */
export class Stage {
  constructor(
    public readonly chapter: Chapter,
    public readonly level: GameLevel,
    public readonly player: Player,
    /** Everyone in the chapter, fallen or not. */
    public readonly enemies: readonly Enemy[],
    public readonly cards: IntroContext['cards'],
    /** The story's characters who do not fight. */
    public readonly cast: readonly Character[] = [],
  ) {}

  public actor(ref: ActorRef): Character | null {
    if (ref === 'hero') return this.player;
    if (ref === 'boss') {
      const bosses = this.enemies.filter((e) => e.isBoss);
      return bosses.filter((e) => e.stateMachine.currentState !== 'DEAD').at(-1) ?? bosses.at(-1) ?? null;
    }
    return this.enemies.find((e) => e.id === ref) ?? this.cast.find((c) => c.id === ref) ?? null;
  }

  /** Where a character's feet are (the origin if there is no such character). */
  public pos(ref: ActorRef): THREE.Vector3 {
    return this.actor(ref)?.getPosition().clone() ?? new THREE.Vector3();
  }

  /** A point `fwd` metres in front of a character, `side` to its left, `up` above its feet. */
  public at(ref: ActorRef, fwd: number, side: number, up: number): THREE.Vector3 {
    const a = this.actor(ref);
    return offset(this.pos(ref), frame(a?.group.rotation.y ?? 0), fwd, side, up);
  }

  /** `distance` metres from `from` toward `to` (a mark beside someone, facing them). */
  public toward(from: ActorRef, to: ActorRef, distance: number): THREE.Vector3 {
    const a = this.pos(from);
    const dir = this.pos(to).sub(a).setY(0);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    return a.addScaledVector(dir.normalize(), distance);
  }

  /** Where a character's head is now (its head bone; near the top of it without one), to frame faces. */
  public head(ref: ActorRef): THREE.Vector3 {
    const a = this.actor(ref);
    if (!a) return new THREE.Vector3();
    let bone: THREE.Object3D | undefined;
    a.rig?.root.traverse((o) => {
      if (!bone && (o as THREE.Bone).isBone && /^(mixamorig:?)?head$/i.test(o.name)) bone = o;
    });
    if (!bone) return this.pos(ref).add(new THREE.Vector3(0, a.visualHeight() * 0.92, 0));
    a.group.updateMatrixWorld(true);
    return bone.getWorldPosition(new THREE.Vector3());
  }

  /** How tall a character stands (a fallback for none). */
  public height(ref: ActorRef): number {
    return this.actor(ref)?.visualHeight() ?? 1.8;
  }

  /** A mark or a character's position, now. */
  public point(target: ActorRef | Mark): THREE.Vector3 {
    if (typeof target === 'string') return this.pos(target);
    return typeof target === 'function' ? target(this) : target.clone();
  }
}

/** Seconds a shade takes to rise and fade in (or sink and fade away) by default. */
const SHADE_FADE = 1.6;

/** Turning speed for characters turning on cue, rad/s. */
const TURN_RATE = 6;
/** Close enough to a mark. */
const ARRIVED = 0.08;
/** Seconds a staged walk may make no headway before it is reported (dev builds). */
const STUCK_WARNING = 0.75;

/** States nothing ends in a cutscene: walking and running loop, and the hero's jump, guard and charge wait for him. */
const LOCOMOTION: CharacterState[] = ['WALK', 'MOVE', 'SPRINT', 'STRAFE_LEFT', 'STRAFE_RIGHT', 'WALK_BACK'];
const HERO_HELD: CharacterState[] = ['JUMP', 'BLOCK', 'CHARGE'];

interface Move {
  actor: Character;
  to: THREE.Vector3;
  speed: number;
  gait: CharacterState;
  face: THREE.Vector3 | null;
  /** How far it still had to go last step, and how long it has been making no headway (held by the level). */
  left: number;
  stuck: number;
}

/**
 * Characters walking to marks and turning on cue, one fixed step at a time (the motor still resolves them against
 * the level). `settle` puts everyone where they were going at once: a skipped scene ends as a played one would.
 */
export class Staging {
  private moves: Move[] = [];
  private turns = new Map<Character, THREE.Vector3>();
  /** A character was put somewhere outside the fixed step (render interpolation must not drag it back). */
  public onTeleport: ((actor: Character) => void) | null = null;

  /** A scene starts: anyone caught mid-stride (or the hero mid-jump or on guard) stops; weapon trails drop. */
  public begin(hero: Character, others: readonly Character[]): void {
    const halt = (a: Character, held: CharacterState[]) => {
      if (held.includes(a.stateMachine.currentState)) a.stateMachine.changeState('IDLE');
      a.slashRibbon.clear();
    };
    halt(hero, [...LOCOMOTION, ...HERO_HELD]);
    for (const a of others) halt(a, LOCOMOTION);
  }

  public moveTo(actor: Character, to: THREE.Vector3, gait: 'walk' | 'run', face: THREE.Vector3 | null): void {
    this.moves = this.moves.filter((m) => m.actor !== actor);
    this.turns.delete(actor);
    const run = gait === 'run';
    this.moves.push({ actor, to, speed: run ? actor.moveSpeed : actor.walkSpeed, gait: run ? 'MOVE' : 'WALK', face, left: Infinity, stuck: 0 });
  }

  public face(actor: Character, point: THREE.Vector3): void {
    this.moves = this.moves.filter((m) => m.actor !== actor);
    this.turns.set(actor, point);
  }

  /** Puts a character on a mark at once (and turned toward `face`). */
  public place(actor: Character, to: THREE.Vector3, face: THREE.Vector3 | null): void {
    this.moves = this.moves.filter((m) => m.actor !== actor);
    this.turns.delete(actor);
    actor.setPosition(to.x, to.y, to.z);
    if (face) this.turnNow(actor, face);
    this.onTeleport?.(actor);
  }

  public update(dt: number): void {
    for (const m of [...this.moves]) {
      const pos = m.actor.group.position;
      const d = new THREE.Vector3(m.to.x - pos.x, 0, m.to.z - pos.z);
      const dist = d.length();
      if (dist <= ARRIVED) {
        this.moves.splice(this.moves.indexOf(m), 1);
        m.actor.stateMachine.changeState('IDLE');
        if (m.face) this.turns.set(m.actor, m.face);
        continue;
      }
      // Held where it stands (a prop's collider, a lip in the floor): at ease it stands rather than walking on the
      // spot (Character.atEase), but the mark wants moving, so say so while developing.
      m.stuck = m.left - dist < m.speed * dt * 0.25 ? m.stuck + dt : 0;
      m.left = dist;
      if (import.meta.env.DEV && m.stuck >= STUCK_WARNING && m.stuck - dt < STUCK_WARNING) {
        console.warn(`[Staging] ${m.actor.id} is held ${dist.toFixed(2)} m short of its mark`, m.to.toArray());
      }
      m.actor.turnToward(Math.atan2(d.x, d.z), TURN_RATE, dt);
      pos.addScaledVector(d.divideScalar(dist), Math.min(dist, m.speed * dt));
      if (m.actor.stateMachine.currentState !== m.gait) m.actor.stateMachine.changeState(m.gait);
    }
    for (const [actor, point] of this.turns) {
      const p = actor.getPosition();
      if (Math.abs(actor.turnToward(Math.atan2(point.x - p.x, point.z - p.z), TURN_RATE, dt)) < 0.01) this.turns.delete(actor);
    }
  }

  /** Everyone on their marks and turned, now. */
  public settle(): void {
    const moves = this.moves;
    this.moves = [];
    for (const m of moves) {
      m.actor.stateMachine.changeState('IDLE');
      this.place(m.actor, m.to, m.face);
    }
    for (const [actor, point] of this.turns) {
      this.turnNow(actor, point);
      this.onTeleport?.(actor);
    }
    this.turns.clear();
  }

  /** Forgets every move and turn (leaving a chapter). */
  public clear(): void {
    this.moves = [];
    this.turns.clear();
  }

  private turnNow(actor: Character, point: THREE.Vector3): void {
    const p = actor.getPosition();
    if (Math.hypot(point.x - p.x, point.z - p.z) > 1e-3) actor.group.rotation.y = Math.atan2(point.x - p.x, point.z - p.z);
  }
}

/** Seconds a line is expected to take (its recording if already loaded, else its reading time). */
function lineSeconds(line: Line): number {
  if (line.hold !== undefined) return line.hold;
  const voice = Voices.get(line.voice);
  return voice ? voice.duration + VOICE_TAIL : readingTime(line.text);
}

/** One shot's lines: whether they are done, and whether the player read past the last of them. */
interface LineGroup {
  done: boolean;
  cut: boolean;
}

/**
 * One playing of a scene: its shots for the director, the lines and cues wired in. Call `finish` when the director
 * is done with it (played through or skipped): cues that change where people stand or what the game knows are
 * applied if they had not fired, and the lines stop.
 */
export class SceneRun {
  public readonly shots: Shot[];
  private readonly pending = new Set<SceneCue>();

  constructor(
    public readonly scene: StoryScene,
    private readonly stage: Stage,
    private readonly dialogue: Dialogue,
    private readonly staging: Staging,
  ) {
    this.shots = scene.shots.map((shot) => this.compile(shot));
  }

  /** The skip button tapped: on to the next line. */
  public advance(): void {
    this.dialogue.advance();
  }

  /** Settles whatever the scene did not get to, and silences it. */
  public finish(): void {
    this.settle();
    this.dialogue.clear();
  }

  /**
   * Applies the scene without playing it (seen before, or a retry): its marks, turns and essential hooks. Lines
   * already being spoken (the guru's, in the fight) are left alone.
   */
  public settle(): void {
    for (const cue of [...this.pending]) this.fire(cue, true);
    this.pending.clear();
    this.staging.settle();
  }

  private compile(shot: SceneShot): Shot {
    const lines = shot.lines ?? [];
    const group: LineGroup = { done: lines.length === 0, cut: false };
    const linesAt = shot.linesAt ?? 0.4;
    const spoken = lines.reduce((t, l) => t + lineSeconds(l), 0);
    const cues = (shot.cues ?? []).map((cue) => {
      this.pending.add(cue);
      return { at: cue.at, run: () => this.fire(cue, false) };
    });
    if (lines.length) {
      cues.push({
        at: linesAt,
        run: () => this.dialogue.play(lines, 'scene', (cut) => {
          if (shot.carryLines) return;
          group.done = true;
          group.cut = cut;
        }),
      });
    }
    const camera = shot.camera;
    // Lines carried over the next shots neither hold this one nor end it.
    if (shot.carryLines) group.done = true;
    return {
      duration: shot.duration ?? Math.max(2, linesAt + spoken + 0.6),
      keys: typeof camera === 'function' ? () => camera(this.stage) : camera ?? [],
      ease: shot.ease,
      sway: shot.sway,
      fadeIn: shot.fadeIn,
      fadeOut: shot.fadeOut,
      cues,
      holdWhile: () => !group.done,
      // The player read past the shot's last line: cut to the next shot.
      endWhen: () => group.done && group.cut,
    };
  }

  /** A cue, played (`settling` false) or applied instantly because the scene ended before it. */
  private fire(cue: SceneCue, settling: boolean): void {
    this.pending.delete(cue);
    const s = this.stage;
    if ('run' in cue) {
      if (!settling || cue.essential) cue.run(s);
      return;
    }
    const actor = s.actor(cue.actor);
    if (!actor) return;
    if ('play' in cue) {
      if (settling) return;
      if (cue.play === 'intro') {
        if (actor instanceof Enemy) actor.playIntro();
      } else actor.stateMachine.changeState(cue.play);
    } else if ('clip' in cue) {
      if (!settling) actor.playClip(cue.clip, { timeScale: cue.timeScale });
    } else if ('moveTo' in cue) {
      const face = cue.face !== undefined ? s.point(cue.face) : null;
      this.staging.moveTo(actor, s.point(cue.moveTo), cue.gait ?? 'walk', face);
    } else if ('place' in cue) {
      this.staging.place(actor, s.point(cue.place), cue.face !== undefined ? s.point(cue.face) : null);
    } else if ('show' in cue) {
      if (actor instanceof Extra) actor.appear(cue.show, 0);
      else actor.group.visible = cue.show;
    } else if ('appear' in cue) {
      if (actor instanceof Extra) {
        actor.appear(cue.appear, settling ? 0 : cue.over ?? SHADE_FADE);
        if (cue.appear && !settling && actor.shade) haunt(s.level.group, actor);
      } else actor.group.visible = cue.appear;
    } else {
      this.staging.face(actor, s.point(cue.face));
    }
  }
}

/** The recordings a chapter's story names, to load with the chapter. */
export function storyVoices(story: ChapterStory | undefined): (string | undefined)[] {
  if (!story) return [];
  const scenes = [story.opening, story.ending, ...(story.beats ?? []).map((b) => ('scene' in b ? b.scene : undefined))];
  const lines = scenes.flatMap((sc) => sc?.shots.flatMap((shot) => shot.lines ?? []) ?? []);
  for (const b of story.beats ?? []) if ('lines' in b) lines.push(...b.lines);
  return lines.map((l) => l.voice);
}

/** Whether a beat's trigger has been met. `learned`: moves taught during this attempt. */
export function triggered(on: Trigger, s: Stage, fight: { time: number; learned: ReadonlySet<Ability> }): boolean {
  if ('bossBelow' in on) {
    const who = on.enemy ? s.actor(on.enemy) : s.actor('boss');
    return !!who && who.currentHealth / who.maxHealth < on.bossBelow;
  }
  if ('fallen' in on) return s.actor(on.fallen)?.stateMachine.currentState === 'DEAD';
  if ('learned' in on) return fight.learned.has(on.learned);
  if ('heroBelow' in on) return s.player.currentHealth / s.player.maxHealth < on.heroBelow;
  if ('fightTime' in on) return fight.time >= on.fightTime;
  if ('any' in on) return on.any.some((t) => triggered(t, s, fight));
  return on.when(s);
}

import * as THREE from 'three';
import gsap from 'gsap';
import { SceneManager } from './SceneManager';
import { PhysicsWorld } from './PhysicsWorld';
import { InputManager, type MenuAction } from './InputManager';
import { Settings, Progress, type GameSettings } from './Settings';
import { LevelManager } from '../levels/LevelManager';
import { disposeObject } from '../levels/GLBLevel';
import { ParticleFX } from '../combat/ParticleFX';
import { BloodFX } from '../combat/BloodFX';
import { SoundFX, type Track, type Ambience } from '../combat/SoundFX';
import { CombatSystem } from '../combat/CombatSystem';
import { CombatDebug } from '../combat/CombatDebug';
import { ProjectileManager } from '../combat/ProjectileManager';
import { Voices } from '../combat/Voices';
import { HitboxManager } from '../combat/HitboxManager';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { Vetala } from '../entities/Vetala';
import { Mayavi } from '../entities/Mayavi';
import { BossTakshaka } from '../entities/BossTakshaka';
import { Rakshasa } from '../entities/Rakshasa';
import { Yatudhana } from '../entities/Yatudhana';
import { BossBaoli } from '../entities/BossBaoli';
import { BossShalva } from '../entities/BossShalva';
import { BossAndhaka } from '../entities/BossAndhaka';
import { Raider } from '../entities/Raider';
import { VanaraMentor } from '../entities/Vanara';
import { Extra } from '../entities/Extra';
import { DWARKA_STARTS } from '../levels/Level3_Dwarka';
import { BAOLI_GUARDIAN } from '../entities/characters/BaoliGuardian';
import { VETALA } from '../entities/characters/Vetala';
import { MAYAVI } from '../entities/characters/Mayavi';
import { TAKSHAKA } from '../entities/characters/Takshaka';
import { RAKSHASA } from '../entities/characters/Rakshasa';
import { YATUDHANA } from '../entities/characters/Yatudhana';
import { SHALVA } from '../entities/characters/Shalva';
import { ANDHAKA } from '../entities/characters/Andhaka';
import { ANDHAKA_THRONE } from '../levels/Level4_Summit';
import { RAIDER } from '../entities/characters/Village';
import { MENTOR } from '../entities/characters/Akhada';
import { AKHADA_MARKS } from '../game/stories/Akhada';
import { CharacterRig, type CharacterDefinition } from '../entities/animation/CharacterRig';
import type { Character } from '../entities/Character';
import { separateFighters } from '../physics/CharacterMotor';
import { CHAPTERS, LAST_CHAPTER, chapterById, chapterTitle, type Chapter } from '../game/Chapters';
import { KITS, type Ability } from '../game/Progression';
import { ExpeditionRun, type ExpeditionSpawn } from '../game/Expedition';
import { CinematicDirector } from '../cinematics/CinematicDirector';
import { buildIntro, buildArrival, ATTRACT, type IntroContext } from '../cinematics/Intros';
import { SceneRun, Stage, Staging, storyVoices, triggered, type StoryBeat, type StoryScene } from '../cinematics/Scene';
import { SceneFX } from '../cinematics/SceneFX';
import { Hud } from '../ui/Hud';
import { Cinema } from '../ui/Cinema';
import { Dialogue } from '../ui/Dialogue';
import { Credits } from '../ui/Credits';
import { ScreenStack } from '../ui/Menus';
import { refreshGlyphs } from '../ui/Glyphs';

// Capsules: half-height of the cylinder part and radius (metres); the feet sit at the capsule's bottom.
const FIGHTER_CAPSULE = { halfHeight: 0.55, radius: 0.4 };
/** The Vetala and Mayavi stand about 2.1 m. */
const TALL_CAPSULE = { halfHeight: 0.6, radius: 0.42 };
/** Takshaka: 2.6 m with the hood. */
const NAGA_CAPSULE = { halfHeight: 0.75, radius: 0.55 };
/** The rakshasa minions (and the prologue's raiders, on their model): 1.85 m. */
const MINION_CAPSULE = { halfHeight: 0.52, radius: 0.4 };
/** The Baoli Guardian: 3.2 m tall and broad. */
const BAOLI_CAPSULE = { halfHeight: 0.95, radius: 0.65 };
/** Shalva: 2.6 m and lean. */
const SHALVA_CAPSULE = { halfHeight: 0.78, radius: 0.48 };
/** Andhaka: 3.15 m. Narrower than his shoulders so he fits the 1.3 m gate at the head of the summit's main bridge. */
const ANDHAKA_CAPSULE = { halfHeight: 1.03, radius: 0.52 };

// Gameplay and physics advance in fixed 60 Hz steps; rendering interpolates between the last two steps.
const FIXED_DT = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;
/** How long the camera takes to settle from the last cutscene shot into the follow camera. */
const HANDOFF_SECONDS = 1.1;
/** The title screen stands in this chapter's arena (the moonlit baoli, as it always has). */
const TITLE_CHAPTER = 1;
/** Hold the skip button this long to skip a cutscene. */
const SKIP_HOLD = 0.7;
/** A press of the skip button shorter than this is a tap: on to the next line. */
const SKIP_TAP = 0.3;
/** After the hero falls / the last enemy falls, this long before the outcome screen. */
const DEFEAT_DELAY = 2.6;
const VICTORY_DELAY = 3.4;

/** Who stands where in each chapter, and what they are. */
interface Spawn {
  make: () => Enemy;
  at: THREE.Vector3;
  capsule: { halfHeight: number; radius: number };
  rig: CharacterDefinition;
  /** Out of sight (and so out of the fight) until a story scene's `show` cue brings it on. */
  hidden?: boolean;
}

const SPAWNS: Record<number, Spawn[]> = {
  // The prologue's courtyard is empty until the raiders come through the gate: see HORDES.
  0: [],
  1: [{ make: () => new BossBaoli('baoli_guardian'), at: new THREE.Vector3(0, 0, -4.2), capsule: BAOLI_CAPSULE, rig: BAOLI_GUARDIAN }],
  // The old vanara spars with the hero first; the Vetala and Mayavi wait out of sight at the north end until the
  // lesson is over and the story brings them on (game/stories/Akhada.ts).
  2: [
    { make: () => new VanaraMentor('mentor_spar'), at: AKHADA_MARKS.mentor, capsule: FIGHTER_CAPSULE, rig: MENTOR },
    { make: () => new Vetala('vetala'), at: AKHADA_MARKS.vetalaWaits, capsule: TALL_CAPSULE, rig: VETALA, hidden: true },
    { make: () => new Mayavi('mayavi'), at: AKHADA_MARKS.mayaviWaits, capsule: TALL_CAPSULE, rig: MAYAVI, hidden: true },
  ],
  // Dwarka's east fighter mark, facing the hero across the rosette (Takshaka comes after him: see FINALES).
  3: [{ make: () => new BossShalva('shalva'), at: DWARKA_STARTS.opponent, capsule: SHALVA_CAPSULE, rig: SHALVA }],
  // Chapter IV opens with no one in the arena: see HORDES and FINALES.
  4: [],
};

/**
 * Chapters fought in waves: minions appear at `lanes` (in turn) and run each lane's route to the arena, no more than
 * `maxAlive` at once and `interval` seconds apart, `total` in all.
 */
interface Horde {
  minion: (index: number) => Enemy;
  minionCapsule: { halfHeight: number; radius: number };
  minionRig: CharacterDefinition;
  lanes: { at: THREE.Vector3; route: THREE.Vector3[]; delay: number }[];
  total: number;
  maxAlive: number;
  interval: number;
  /** Shown on the intro's card for the first minion. */
  card: { name: string; epithet: string };
  /** A second kind mixed into the waves: minion `index` (from 0) is one of these when `is(index)`. */
  alt?: {
    is: (index: number) => boolean;
    minion: (index: number) => Enemy;
    capsule: { halfHeight: number; radius: number };
    rig: CharacterDefinition;
  };
}

/**
 * A chapter's final boss: he arrives with his own cutscene once everyone else has fallen (and no more minions are
 * due). `at` can depend on where the hero stands.
 */
interface Finale extends Omit<Spawn, 'at'> {
  at: THREE.Vector3 | ((hero: THREE.Vector3) => THREE.Vector3);
  /** His fight's music (the boss theme if not given). */
  music?: Track;
  /** A point he faces as he arrives (the hero if not given): an entrance staged on a fixed set piece. */
  face?: THREE.Vector3;
}

const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/**
 * The summit's two outpost islands and their bridges to the central crag, past Nandi to the head of the main bridge,
 * then straight up its centre line (it is 2 m wide, x -1..1) to the arena. `delay`: seconds the first minion of a lane
 * waits, so the two lanes don't reach the bridge head together.
 */
const summitLane = (side: 1 | -1, delay: number) => ({
  at: v3(20 * side, -3.1, 29.5),
  delay,
  route: [v3(12 * side, 0, 29), v3(6 * side, 0, 29), v3(3 * side, 0, 25.5), v3(0, 0, 24), v3(0, 0, 21), v3(0, 0, 17),
    v3(0, 0, 13), v3(0, 0, 9)],
});

/**
 * The village gate: the raiders wait just outside it (out of sight of the lesson) and run in to the courtyard. More
 * come than the boy can stand against: the prologue's fight ends in its scripted loss long before the last of them.
 */
const raidLane = (x: number, z: number, delay: number) => ({ at: v3(x, 0, z), delay, route: [v3(x * 0.5, 0, -10), v3(x, 0, -5)] });

const HORDES: Record<number, Horde> = {
  0: {
    minion: (i) => new Raider(`raider_${i + 1}`),
    minionCapsule: MINION_CAPSULE,
    minionRig: RAIDER,
    lanes: [raidLane(-0.9, -14.5, 0), raidLane(0.9, -15.2, 0.5), raidLane(0, -16.6, 1.1)],
    total: 9,
    maxAlive: 3,
    interval: 3,
    card: { name: 'Raiders', epithet: 'Out of the desert at dusk' },
  },
  4: {
    minion: (i) => new Rakshasa(`rakshasa_${i + 1}`),
    minionCapsule: MINION_CAPSULE,
    minionRig: RAKSHASA,
    lanes: [summitLane(1, 0), summitLane(-1, 3.5)],
    total: 8,
    maxAlive: 3,
    interval: 4,
    card: { name: 'Rakshasas', epithet: 'They cross the bridges. Their king comes after.' },
    // The sorcerers hang back and throw fire while the brutes press in: the third, sixth and eighth to come.
    alt: { is: (i) => i === 2 || i === 5 || i === 7, minion: (i) => new Yatudhana(`yatudhana_${i + 1}`), capsule: MINION_CAPSULE, rig: YATUDHANA },
  },
};

const FINALES: Record<number, Finale> = {
  // Dwarka: the naga king comes up onto the arena's far side from the hero, 7 m out from its centre.
  3: {
    make: () => new BossTakshaka('takshaka'),
    at: (hero) => {
      const away = new THREE.Vector3(-hero.x, 0, -hero.z);
      if (away.lengthSq() < 1) away.copy(DWARKA_STARTS.opponent).setY(0);
      return away.normalize().multiplyScalar(7).setY(DWARKA_STARTS.opponent.y);
    },
    capsule: NAGA_CAPSULE,
    rig: TAKSHAKA,
  },
  // The summit: at the top of Shiva's stair, on the dais (4 m up), facing straight down the stair toward the arena: he
  // is found seated on the rock throne behind that spot (Level4_Summit's ANDHAKA_THRONE) and rises from it.
  4: {
    make: () => new BossAndhaka('andhaka'), at: ANDHAKA_THRONE.clone(), face: ANDHAKA_THRONE.clone().setZ(10),
    capsule: ANDHAKA_CAPSULE, rig: ANDHAKA, music: 'andhaka_final',
  },
};

/** Each arena's music: the village (the prologue), the stepwell, the akhada, Dwarka, the summit. Bosses bring their own. */
const LEVEL_MUSIC: Record<number, Track> = { 0: 'village', 1: 'baoli', 2: 'akhada', 3: 'dwarka', 4: 'summit', 5: 'island' };
/** Each arena's ambience and reverb: the village, the stepwell, the jungle akhada, the sea at Dwarka, the mountain. */
const LEVEL_AMBIENCE: Record<number, Ambience> = { 0: 'village', 1: 'baoli', 2: 'akhada', 3: 'dwarka', 4: 'summit', 5: 'island' };

/**
 * The first fights (the prologue, then Chapter I) teach the basics, one line at a time: fight seconds, text, the move
 * it needs and (fourth) a move that makes it moot. Only moves the hero has are mentioned, and each hint shows once
 * per session, so Chapter I after the prologue teaches only what is new (chaining blows).
 */
const FIRST_FIGHT_HINTS: [number, string, Ability?, Ability?][] = [
  [1.5, 'Press {attack} to strike.', undefined, 'combo'],
  [1.5, 'Press {attack} to strike. Press it again as the blow lands to chain up to three.', 'combo'],
  [1.5, 'Press {guard} just as a blow lands to deflect it.', 'parry'],
  [10, 'Press {dodge} to slide under a blow. You can slide out of a swing once it has landed.', 'dodge'],
  [18, 'Hold {guard} to keep your guard up. Blocking still wears down your posture.', 'block'],
  [26, 'Hold {charge}, standing, until your strength gathers: the next three blows strike harder.', 'charge'],
  [36, 'Sprint with {sprint} and attack to leap in with a falling strike.', 'leap'],
];

/**
 * Seconds of fight after an in-fight line before a beat may start another: the guru's voice never talks over itself
 * or runs one lesson into the next. A beat whose moment passes while he waits (a posture break) fires the next time.
 */
const LINES_GAP = 4;

const ABILITY_NAMES: Record<Ability, string> = {
  dodge: 'The slide',
  combo: 'Chained blows',
  block: 'The guard',
  parry: 'The parry',
  charge: 'Shakti, the gathered blow',
  leap: 'The leaping strike',
};

/** `intro`: any cutscene (a chapter's intro, a boss arriving, a story scene); nobody acts on their own. */
type Mode = 'boot' | 'title' | 'loading' | 'intro' | 'handoff' | 'play' | 'outro' | 'over';

interface InterpolatedTransform {
  prevPos: THREE.Vector3;
  prevQuat: THREE.Quaternion;
  currPos: THREE.Vector3;
  currQuat: THREE.Quaternion;
}

const $ = (id: string) => document.getElementById(id)!;

/**
 * The game: a fixed-step simulation with interpolated rendering, and the flow around it (title, chapter loading,
 * the intro cutscene, the fight, pause, defeat, chapter complete).
 */
export class Engine {
  public sceneManager = SceneManager.getInstance();
  public physicsWorld = PhysicsWorld.getInstance();
  public inputManager = InputManager.getInstance();
  public levelManager = LevelManager.getInstance();
  public particleFX = ParticleFX.getInstance();
  public soundFX = SoundFX.getInstance();
  public combatSystem = CombatSystem.getInstance();
  public projectileManager = ProjectileManager.getInstance();
  /** F3 (dev builds, or ?debug): blades, hurt capsules, strike windows, contacts and the combat log. */
  public combatDebug: CombatDebug;

  public player: Player | null = null;
  public enemies: Enemy[] = [];
  /** The chapter story's characters who do not fight (the guru), spawned with it. */
  public cast: Extra[] = [];

  private readonly hud = new Hud();
  private readonly cinema = new Cinema();
  private readonly dialogue = new Dialogue();
  private readonly screens = new ScreenStack();
  /** The roll after the campaign's last scene. */
  private readonly credits = new Credits();
  private readonly director: CinematicDirector;
  /** Characters walking to their marks in story scenes. */
  private readonly staging = new Staging();
  /** The story scene playing, if one is. */
  private sceneRun: SceneRun | null = null;
  /** Story scenes already played this session: a retry settles them instead of playing them again. */
  private readonly seenScenes = new Set<string>();
  /** The chapter's mid-fight beats, and whether each has fired this attempt. */
  private beats: { beat: StoryBeat; fired: boolean }[] = [];
  /** Moves taught during this attempt (`learned` triggers). */
  private readonly learnedNow = new Set<Ability>();
  /** Fight seconds when the last in-fight line was still up (beats' lines keep `LINES_GAP` from it). */
  private linesEndedAt = -Infinity;
  private container!: HTMLElement;

  private mode: Mode = 'boot';
  private paused = false;
  private chapter: Chapter | null = null;
  private loadToken = 0;
  private modeTime = 0;
  private fightTime = 0;
  private skipHeld = 0;
  /** The skip button must be let go before it counts again (held into a cutscene, or just used to skip one). */
  private skipLatched = false;
  private hintIndex = 0;
  /** The first fights' hints play once per session (by index), not on every retry or again in the next chapter. */
  private readonly hintsShown = new Set<number>();
  private attractAngle = 0.6;
  private outcomeAt = 0;
  private outcome: 'defeat' | 'victory' | null = null;
  /** The chapter's scripted loss has come (the prologue): the hero is beaten and out of the player's hands. */
  private beaten = false;
  /** After a failed chapter load: whether the title (and its arena) is still there to go back to. */
  private recoverable = false;
  /** The current chapter's waves, if it has them. */
  private horde: { def: Horde; minions: Enemy[]; timer: number } | null = null;
  /** The chapter's final boss, while he is still to come (`boss` null) and once he is here. */
  private finale: { def: Finale; boss: Enemy | null } | null = null;
  /** An explorable chapter's encounters and goal (the island), while one is under way. */
  private expedition: ExpeditionRun | null = null;
  private readonly handoff = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 45, t: 0 };

  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
  private interpolated = new Map<THREE.Object3D, InterpolatedTransform>();

  constructor() {
    this.combatDebug = new CombatDebug(this.sceneManager.scene);
    this.director = new CinematicDirector(this.sceneManager.camera);
    // Put on a mark by a cue (in a render frame): the next frame must not interpolate from where they were.
    this.staging.onTeleport = (actor) => this.interpolated.delete(actor.group);
    this.combatSystem.onEvent = (e) => this.combatDebug.onEvent(e);
    this.combatSystem.onCallout = (c) => this.hud.callout(c);
    this.combatSystem.onPlayerHurt = (damage) => this.hud.hurt(damage, BloodFX.getInstance().enabled);
    this.soundFX.onLightning = (strength) => this.sceneManager.flash(strength);
    this.soundFX.hushed = () => this.dialogue.speaking;
    this.projectileManager.onPlayerContact = (result) => {
      if (result === 'hit') {
        this.combatSystem.stats.hitsTaken++;
        this.hud.hurt();
      } else if (result === 'deflected') {
        this.combatSystem.stats.deflections++;
        this.hud.callout({ text: 'Deflected', tone: 'gold' });
      } else this.combatSystem.stats.blocks++;
    };
  }

  public async init(container: HTMLElement): Promise<void> {
    this.container = container;
    this.sceneManager.mount(container);
    this.setupInput();
    this.setupMenus();
    this.showLoading('', 'Yudhveer', 0);

    try {
      await this.physicsWorld.init();
    } catch (err) {
      this.loadFailed('Your browser could not start the physics engine (WebAssembly).', err);
      return;
    }
    this.particleFX.init(this.sceneManager.scene);
    this.projectileManager.init(this.sceneManager.scene);
    this.levelManager.init(this.sceneManager.scene);

    this.player = new Player();
    this.player.onCharged = () => this.hud.callout({ text: 'Shakti', sub: 'Your next three blows strike harder', tone: 'gold' });
    this.player.onLearned = (ability) => {
      this.learnedNow.add(ability);
      this.hud.callout({ text: 'Learned', sub: ABILITY_NAMES[ability], tone: 'gold' });
      this.hintLearned(ability);
    };
    this.player.group.visible = false;

    // The title screen stands in its chapter's arena; the hero streams in alongside it.
    const firstLevel = chapterById(TITLE_CHAPTER).level;
    let levelShare = 0;
    let heroShare = 0;
    const report = () => this.showLoading('', 'Yudhveer', levelShare * 0.8 + heroShare * 0.2);
    const level = this.levelManager.loadLevel(firstLevel, (f) => { levelShare = f; report(); });
    const hero = this.player.equip(KITS[chapterById(TITLE_CHAPTER).kit]).then(() => { heroShare = 1; report(); })
      .catch((err) => console.error('[Engine] Yodha failed to load; keeping the greybox', err));

    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop);

    try {
      await level;
    } catch (err) {
      this.loadFailed('The arena could not be loaded. Check your connection and reload the page.', err);
      return;
    }
    await hero;
    this.addFighter(this.player, this.levelManager.activeLevel!.playerSpawn, FIGHTER_CAPSULE);
    this.player.group.visible = false;
    this.enterTitle();
  }

  // ---------------------------------------------------------------------------------------------------- Input

  private setupInput(): void {
    const input = this.inputManager;
    input.onMenu = (action) => this.onMenu(action);
    input.onDeviceChange = (device) => {
      this.hud.setDevice(device);
      this.updateCaptureHint();
    };
    input.onAnyInput = () => {
      this.soundFX.init();
      if (this.mode === 'intro') this.cinema.skip(this.skipHeld / SKIP_HOLD, true);
    };
    input.onPointerLockChange = (locked) => {
      this.updateCaptureHint();
      // Esc releases the mouse: that is the pause button on a keyboard.
      if (!locked && !this.paused && this.inFight()) this.pause();
    };
    window.addEventListener('blur', () => { if (!this.paused && this.inFight()) this.pause(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && !this.paused && this.inFight()) this.pause(); });
    // Audio may only start from a user gesture.
    const unlock = () => this.soundFX.init();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    $('capture-hint').addEventListener('click', () => void this.capturePointer());

    const debugAllowed = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'F3' && debugAllowed) {
        e.preventDefault();
        this.combatDebug.toggle();
      }
      // Dev shortcut: Shift+0..5 jumps straight into a chapter's fight (0: the prologue).
      if (import.meta.env.DEV && e.shiftKey && /^Digit[0-5]$/.test(e.code)) {
        void this.startChapter(parseInt(e.code.slice(5), 10), { intro: false });
      }
    });
  }

  private inFight(): boolean {
    return this.mode === 'intro' || this.mode === 'handoff' || this.mode === 'play' || this.mode === 'outro';
  }

  private onMenu(action: MenuAction): void {
    if (action === 'pause') {
      if (this.paused) void this.resume();
      else if (this.inFight()) this.pause();
      else this.screens.handle('back');
      return;
    }
    this.screens.handle(action);
  }

  /** Locks the mouse for keyboard play; with a controller there is nothing to lock. */
  private async capturePointer(): Promise<boolean> {
    if (this.inputManager.device === 'gamepad') return true;
    const ok = await this.inputManager.requestPointerLock(this.container);
    this.updateCaptureHint();
    return ok;
  }

  private updateCaptureHint(): void {
    const want = !this.paused && (this.mode === 'play' || this.mode === 'handoff') && this.inputManager.device === 'keyboard'
      && !this.inputManager.isPointerLocked;
    $('capture-hint').hidden = !want;
  }

  // ---------------------------------------------------------------------------------------------------- Menus

  private setupMenus(): void {
    const click = (screen: string, handler: (action: string, button: HTMLButtonElement) => void) => {
      $(screen).addEventListener('click', (e) => {
        const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
        if (!button || button.disabled) return;
        button.blur();
        this.soundFX.init();
        if (!button.dataset.setting) this.soundFX.playUiConfirm();
        handler(button.dataset.action ?? '', button);
      });
    };

    click('title', (action) => {
      if (action === 'continue') void this.beginCampaign(Math.min(Progress.unlocked(), LAST_CHAPTER));
      else if (action === 'new') void this.beginCampaign(CHAPTERS[0].id);
      else if (action === 'chapters') this.openChapters();
      else if (action === 'settings') this.openSettings();
      else if (action === 'controls') this.screens.push('controls');
    });
    click('pause', (action) => {
      if (action === 'resume') void this.resume();
      else if (action === 'restart') void this.restartChapter();
      else if (action === 'settings') this.openSettings();
      else if (action === 'controls') this.screens.push('controls');
      else if (action === 'quit') this.enterTitle();
    });
    click('chapters', (action, button) => {
      if (action === 'back') this.screens.pop();
      else if (action === 'chapter') void this.beginCampaign(parseInt(button.dataset.chapter!, 10));
    });
    click('controls', (action) => { if (action === 'back') this.screens.pop(); });
    $('loading-recover').addEventListener('click', () => {
      if (this.recoverable) void this.recoverToTitle();
      else location.reload();
    });
    click('settings', (action, button) => {
      if (action === 'back') this.screens.pop();
      else if (button.dataset.setting) this.adjustSetting(button, 1, true);
    });
    click('defeat', (action) => {
      if (action === 'retry') void this.restartChapter();
      else if (action === 'quit') this.enterTitle();
    });
    click('cleared', (action) => {
      const next = this.chapter ? CHAPTERS.find((c) => c.id === this.chapter!.id + 1) : undefined;
      if (action === 'next') {
        if (next) void this.beginCampaign(next.id);
        else this.enterTitle();
      } else if (action === 'quit') this.enterTitle();
    });

    this.screens.nav('settings').onAdjust = (button, dir) => this.adjustSetting(button, dir, false);
    // Clicking along a slider sets it there.
    $('settings').addEventListener('click', (e) => {
      const meter = (e.target as HTMLElement).closest<HTMLElement>('.meter');
      const button = meter?.closest<HTMLButtonElement>('button');
      if (!meter || !button?.dataset.setting) return;
      e.stopImmediatePropagation();
      const rect = meter.getBoundingClientRect();
      const f = THREE.MathUtils.clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const min = parseFloat(button.dataset.min!);
      const max = parseFloat(button.dataset.max!);
      const step = parseFloat(button.dataset.step!);
      Settings.set(button.dataset.setting as keyof GameSettings, Math.round((min + f * (max - min)) / step) * step as never);
      this.soundFX.playUiMove();
    }, true);
    // B on a controller backs out of the pause menu into the fight. (Esc can't: the browser won't let a page
    // recapture the mouse from the Esc key, so keyboard players resume with a click.)
    this.screens.onBackAtRoot = (id) => {
      if (id === 'pause' && this.inputManager.device === 'gamepad') void this.resume();
      if (id === 'credits') this.credits.finish();
    };
    this.credits.onDone = () => this.enterTitle();
    this.renderSettings();
    Settings.onChange(() => this.renderSettings());
  }

  /** After a failed chapter load the old arena is gone: reload the first chapter's arena behind the title. */
  private async recoverToTitle(): Promise<void> {
    this.showLoading('', 'Yudhveer', 0);
    try {
      await this.levelManager.loadLevel(chapterById(TITLE_CHAPTER).level, (f) => this.showLoading('', 'Yudhveer', f));
    } catch (err) {
      this.loadFailed('The arena could not be loaded. Check your connection and reload the page.', err);
      this.recoverable = false;
      $('loading-recover').textContent = 'Reload';
      return;
    }
    this.enterTitle();
  }

  /** Starts a chapter from a menu: the click is a user gesture, so the mouse can be locked now. */
  private async beginCampaign(chapterId: number): Promise<void> {
    this.soundFX.init();
    void this.capturePointer();
    await this.startChapter(chapterId, { intro: true });
  }

  private openChapters(): void {
    const list = $('chapters-menu');
    const unlocked = Progress.unlocked();
    list.replaceChildren(...CHAPTERS.map((c, i) => {
      const b = document.createElement('button');
      b.dataset.action = 'chapter';
      b.dataset.chapter = String(c.id);
      b.disabled = c.id > unlocked;
      // The prologue has no numeral: a small mark in its place.
      b.innerHTML = `<span class="ch-num">${c.numeral || '॰'}</span><span class="ch-name"></span><span class="ch-state">${c.id > unlocked ? 'Locked' : ''}</span>`;
      const name = b.querySelector('.ch-name')!;
      name.textContent = c.numeral ? c.name : `Prologue: ${c.name}`;
      const place = document.createElement('span');
      place.className = 'ch-place';
      const before = CHAPTERS[i - 1];
      place.textContent = c.id > unlocked && before ? `Clear ${before.numeral ? `chapter ${before.numeral}` : 'the prologue'} to begin` : c.place;
      name.appendChild(place);
      return b;
    }));
    this.screens.push('chapters');
  }

  private openSettings(): void {
    this.renderSettings();
    this.screens.push('settings');
  }

  private adjustSetting(button: HTMLButtonElement, dir: -1 | 1, wrap: boolean): boolean {
    const key = button.dataset.setting as keyof GameSettings | undefined;
    if (!key) return false;
    const s = Settings.get();
    if (button.dataset.kind === 'toggle') {
      Settings.set(key, !s[key] as never);
    } else if (button.dataset.kind === 'choice') {
      // One of a few named values (Gore: off, low, full), stepped through; clicking wraps round.
      const options = button.dataset.options!.split(',');
      let i = options.indexOf(String(s[key])) + dir;
      if (wrap) i = (i + options.length) % options.length;
      else if (i < 0 || i >= options.length) return true;
      Settings.set(key, options[i] as never);
    } else {
      const min = parseFloat(button.dataset.min!);
      const max = parseFloat(button.dataset.max!);
      const step = parseFloat(button.dataset.step!);
      let v = (s[key] as number) + dir * step;
      if (wrap && v > max + 1e-6) v = min;
      Settings.set(key, Math.round(THREE.MathUtils.clamp(v, min, max) / step) * step as never);
    }
    this.soundFX.playUiMove();
    return true;
  }

  private renderSettings(): void {
    const s = Settings.get();
    document.querySelectorAll<HTMLButtonElement>('#settings-menu [data-setting]').forEach((b) => {
      const key = b.dataset.setting as keyof GameSettings;
      const out = b.querySelector('output')!;
      if (b.dataset.kind === 'toggle') {
        out.textContent = s[key] ? 'On' : 'Off';
        return;
      }
      if (b.dataset.kind === 'choice') {
        const options = b.dataset.options!.split(',');
        const labels = b.dataset.labels?.split(',') ?? options;
        out.textContent = labels[options.indexOf(String(s[key]))] ?? String(s[key]);
        return;
      }
      const min = parseFloat(b.dataset.min!);
      const max = parseFloat(b.dataset.max!);
      const v = s[key] as number;
      const f = (v - min) / (max - min);
      const label = max <= 1 ? `${Math.round(v * 100)}` : v.toFixed(1);
      out.innerHTML = `<span class="meter"><i style="width:${(f * 100).toFixed(1)}%"></i><b style="left:${(f * 100).toFixed(1)}%"></b></span><span class="value">${label}</span>`;
    });
  }

  // ---------------------------------------------------------------------------------------------------- Flow

  private setMode(mode: Mode): void {
    // Story scenes draw no blood unless a cue spills it, and the fight's is gone at the cut into one.
    const blood = BloodFX.getInstance();
    if (mode === 'intro' && this.mode !== 'intro') blood.clear();
    blood.suppressed = mode === 'intro';
    this.mode = mode;
    this.modeTime = 0;
    this.updateCaptureHint();
    this.applyEase();
  }

  /**
   * Out of the fight (cutscenes, the chapter's start, once it is won or lost) everyone stands at ease: a calm standing
   * idle (`states.REST`), not a guard, and never a walk on the spot (Character.atEase). The story's cast never fights.
   * Applied as the mode changes (before a cutscene's first cue) and every step (fighters spawned meanwhile). A fighter
   * `onGuard` keeps its stance until the fight starts.
   */
  private applyEase(): void {
    const atEase = this.mode !== 'play' && this.mode !== 'handoff';
    // On guard (Character.onGuard) only until the fight it squared up for has started.
    const ease = (c: Character) => {
      if (!atEase) c.onGuard = false;
      c.atEase = atEase && !c.onGuard;
    };
    if (this.player) ease(this.player);
    for (const enemy of this.enemies) ease(enemy);
    for (const extra of this.cast) extra.atEase = true;
  }

  private showLoading(kicker: string, title: string, fraction: number): void {
    $('loading').hidden = false;
    $('loading-menu').hidden = true;
    $('loading-kicker').textContent = kicker;
    $('loading-title').textContent = title;
    $('loading-bar').style.width = `${Math.round(THREE.MathUtils.clamp(fraction, 0, 1) * 100)}%`;
    $('loading-error').hidden = true;
  }

  private hideLoading(): void {
    $('loading').hidden = true;
  }

  /** Shows a load failure with a way out: back to the title, or a reload if there is no title to go back to. */
  private loadFailed(message: string, err: unknown): void {
    console.error('[Engine]', message, err);
    $('loading').hidden = false;
    const el = $('loading-error');
    el.hidden = false;
    el.textContent = message;
    const canReturn = this.levelManager.activeLevel !== null && this.player?.motor != null && this.mode !== 'boot';
    $('loading-recover').textContent = canReturn ? 'Return to the title' : 'Reload';
    $('loading-menu').hidden = false;
    this.screens.only('loading'); // keyboard and controller can reach the button
    this.inputManager.exitPointerLock();
    this.recoverable = canReturn;
  }

  /** The title screen over a slow orbit of whatever arena is loaded. */
  private enterTitle(): void {
    this.loadToken++;
    this.paused = false;
    this.credits.stop();
    this.director.skip();
    this.dialogue.clear();
    this.dialogue.setPaused(false);
    this.cinema.setActive(false);
    this.cinema.setFade(0);
    this.hud.show(false);
    this.hud.clearHint();
    this.clearEnemies();
    if (this.player) this.player.group.visible = false;
    this.combatSystem.resetStats();
    gsap.killTweensOf(this.combatSystem);
    this.combatSystem.globalTimeScale = 1;
    this.inputManager.exitPointerLock();
    this.hideLoading();
    this.chapter = null;
    this.setMode('title');

    // Continue appears once there is somewhere past the start to continue to.
    const unlocked = Math.min(Progress.unlocked(), LAST_CHAPTER);
    const resume = unlocked > CHAPTERS[0].id;
    const cont = $('title-continue') as HTMLButtonElement;
    cont.hidden = !resume;
    $('continue-detail').textContent = resume ? `${chapterTitle(chapterById(unlocked))}, ${chapterById(unlocked).name}` : '';
    this.screens.only('title', resume ? cont : null);
    refreshGlyphs(document, this.inputManager.device);
    this.soundFX.music.play('title');
    this.soundFX.music.dim(false);
    this.soundFX.playAmbience(null);
  }

  /**
   * Loads (if needed) the chapter's arena, places the hero and its enemies, and plays the intro or goes straight
   * into the fight.
   */
  public async startChapter(id: number, options: { intro: boolean }): Promise<void> {
    if (!this.player) return;
    const chapter = chapterById(id);
    const token = ++this.loadToken;
    this.chapter = chapter;
    this.paused = false;
    this.screens.clear();
    this.director.skip();
    this.dialogue.clear();
    this.dialogue.setPaused(false);
    this.cinema.setActive(false);
    this.hud.show(false);
    this.hud.clearHint();
    gsap.killTweensOf(this.combatSystem);
    this.combatSystem.globalTimeScale = 1;
    this.setMode('loading');
    this.outcome = null;
    this.clearEnemies();
    BloodFX.getInstance().clear();
    this.player.group.visible = false;

    const kicker = chapterTitle(chapter);
    const needLevel = !this.levelManager.isLoaded(chapter.level);
    let levelShare = needLevel ? 0 : 1;
    let rigShare = 0;
    const report = () => this.showLoading(kicker, chapter.name, levelShare * 0.75 + rigShare * 0.25);
    report();
    this.soundFX.music.play(LEVEL_MUSIC[chapter.level] ?? 'title');
    this.soundFX.playAmbience(LEVEL_AMBIENCE[chapter.level] ?? null);

    try {
      if (needLevel) await this.levelManager.loadLevel(chapter.level, (f) => { levelShare = f; report(); });
    } catch (err) {
      if (token === this.loadToken) this.loadFailed('This chapter could not be loaded. Check your connection, then choose it again from the title screen.', err);
      return;
    }
    if (token !== this.loadToken) return;
    levelShare = 1;
    report();
    // A (re)started chapter puts back what its story changed in the place (the summit's beacon smoulders again).
    this.levelManager.activeLevel?.cue?.('chapter-start');

    // The chapter decides his weapon and moves; a new weapon is a new rig, so it loads with the rest.
    const hero = this.player.equip(KITS[chapter.kit])
      .catch((err) => console.error('[Engine] Yodha failed to arm; keeping the previous weapon', err));
    const rigs = [hero, ...this.spawnEnemies(chapter), ...this.startHorde(chapter), ...this.spawnCast(chapter)];
    this.finale = FINALES[chapter.level] ? { def: FINALES[chapter.level], boss: null } : null;
    if (this.finale) CharacterRig.prefetch(this.finale.def.rig);
    // The boss's music, ready for when he comes.
    if (this.finale || this.enemies.some((e) => e.isBoss)) this.soundFX.music.prefetch(this.finale?.def.music ?? 'boss');
    let done = 0;
    await Promise.all(rigs.map((p) => p.finally(() => { rigShare = ++done / rigs.length; report(); })));
    if (token !== this.loadToken) return;

    this.placeHero();
    this.combatSystem.resetStats();
    this.projectileManager.clear();
    this.hud.bind(this.enemies);
    this.fightTime = 0;
    this.hintIndex = chapter.id <= 1 && Settings.get().hints ? 0 : FIRST_FIGHT_HINTS.length;
    // A fight he is meant to lose cannot kill him.
    this.player.mortal = !chapter.story?.loss;
    this.beaten = false;
    this.beats = (chapter.story?.beats ?? []).map((beat) => ({ beat, fired: false }));
    this.learnedNow.clear();
    this.linesEndedAt = -Infinity;
    Voices.preload(storyVoices(chapter.story));
    this.expedition = chapter.expedition ? new ExpeditionRun(chapter.expedition, chapter.id, options.intro) : null;
    for (const e of chapter.expedition?.encounters ?? []) for (const s of e.spawns) CharacterRig.prefetch(s.rig);
    this.hideLoading();

    if (options.intro) this.playIntro(chapter);
    else {
      // No cutscenes on a retry: the opening scene's marks and hooks still apply.
      if (chapter.story?.opening) this.storyScene(chapter.story.opening, () => {}, false);
      this.resumeExpedition();
      this.beginFight(true);
    }
  }

  /** Sets up a wave chapter: the first minions (one per lane) now. */
  private startHorde(chapter: Chapter): Promise<unknown>[] {
    const def = HORDES[chapter.level];
    if (!def) return [];
    this.horde = { def, minions: [], timer: def.interval };
    if (def.alt) CharacterRig.prefetch(def.alt.rig);
    return def.lanes.slice(0, Math.min(def.lanes.length, def.maxAlive, def.total)).map(() => this.spawnMinion());
  }

  /** The next minion, at the next lane's start, running its route; hidden until its model is ready. */
  private spawnMinion(): Promise<unknown> {
    const h = this.horde!;
    const index = h.minions.length;
    const lane = h.def.lanes[index % h.def.lanes.length];
    const alt = h.def.alt?.is(index) ? h.def.alt : null;
    const enemy = alt ? alt.minion(index) : h.def.minion(index);
    this.addFighter(enemy, lane.at, alt?.capsule ?? h.def.minionCapsule);
    enemy.route = lane.route.map((p) => p.clone());
    // Only the opening minions stagger their start; later ones are already spaced by the spawn interval.
    enemy.routeDelay = index < h.def.lanes.length ? lane.delay : 0;
    enemy.faceTowards(lane.route[0]);
    enemy.group.visible = false;
    this.enemies.push(enemy);
    h.minions.push(enemy);
    this.hud.add(enemy);
    // A chapter whose opponents arrive in its story keeps the first of them out of sight until a scene's `show` cue.
    const waiting = this.mode === 'loading' && !!this.chapter?.introPlaceOnly;
    return enemy.attachRig(alt?.rig ?? h.def.minionRig)
      .catch((err) => console.error(`[Engine] ${enemy.id} rig failed to load; keeping the greybox`, err))
      .finally(() => { enemy.group.visible = !waiting; });
  }

  /** Waves: replace fallen minions until the total is reached. */
  private updateHorde(dt: number): void {
    const h = this.horde;
    if (!h || h.minions.length >= h.def.total) return;
    const alive = h.minions.filter((m) => m.stateMachine.currentState !== 'DEAD').length;
    h.timer -= dt;
    if (alive < h.def.maxAlive && h.timer <= 0) {
      h.timer = h.def.interval;
      void this.spawnMinion();
    }
  }

  /** Every minion due has come, and everyone in the arena has fallen. */
  private fieldCleared(): boolean {
    if (this.horde && this.horde.minions.length < this.horde.def.total) return false;
    return this.enemies.every((e) => e.stateMachine.currentState === 'DEAD');
  }

  /**
   * The final boss comes once the field is clear, after any story beat that is due (a fallen boss's last words,
   * Dwarka's Shalva) has had its scene.
   */
  private updateFinale(): void {
    if (this.finale && !this.finale.boss && this.fieldCleared() && !this.beatDue()) void this.finaleArrives();
  }

  /** A story beat whose moment has come but has not played yet. */
  private beatDue(): boolean {
    if (!this.beats.length || !this.player) return false;
    const stage = this.stage();
    return this.beats.some((b) => !b.fired && triggered(b.beat.on, stage, { time: this.fightTime, learned: this.learnedNow }));
  }

  /** The final boss appears where the chapter puts him and gets his own cutscene; then the fight resumes. */
  private async finaleArrives(): Promise<void> {
    const f = this.finale!;
    const token = this.loadToken;
    const enemy = f.def.make();
    f.boss = enemy;
    this.soundFX.music.play(f.def.music ?? 'boss');
    const at = typeof f.def.at === 'function' ? f.def.at(this.player!.getPosition()) : f.def.at;
    this.addFighter(enemy, at, f.def.capsule);
    enemy.faceTowards(f.def.face ?? this.player!.getPosition());
    enemy.group.visible = false;
    this.enemies.push(enemy);
    this.hud.add(enemy);
    this.hud.clearHint();
    try {
      await enemy.attachRig(f.def.rig);
    } catch (err) {
      console.error(`[Engine] ${enemy.id} rig failed to load; keeping the greybox`, err);
    }
    enemy.group.visible = true;
    if (token !== this.loadToken || this.player!.isDown() || (this.mode !== 'play' && this.mode !== 'handoff')) return;
    // The hero turns to face what is coming, and gets his breath back while it comes: the final fight starts whole
    // (there is no healing, and the boss is tuned for a fresh hero).
    const p = this.player!;
    p.currentHealth = p.maxHealth;
    p.currentMarma = 0;
    p.group.rotation.y = Math.atan2(enemy.getPosition().x - p.getPosition().x, enemy.getPosition().z - p.getPosition().z);
    this.projectileManager.clear();
    this.dialogue.clear();
    this.setMode('intro');
    this.resetSkip();
    this.hud.show(false);
    this.cinema.setActive(true);
    this.soundFX.music.dim(true);
    this.director.play(buildArrival(this.introContext(this.chapter!), enemy), () => this.endIntro());
  }

  /** A retry of an explorable chapter starts the hero at the last checkpoint he reached. */
  private resumeExpedition(): void {
    const at = this.expedition?.resumePoint();
    if (!at || !this.player) return;
    this.player.setPosition(at.at.x, at.at.y, at.at.z);
    this.player.group.rotation.y = Math.atan2(at.face.x - at.at.x, at.face.z - at.at.z);
    this.interpolated.clear();
    this.sceneManager.resetFollowCamera(this.player.getPosition(), this.player.group.rotation.y);
  }

  /** Explorable chapters: opponents come out as the hero reaches each encounter's place. */
  private updateExpedition(): void {
    if (!this.expedition || !this.player) return;
    const { start, hint } = this.expedition.update(this.player.getPosition(), this.enemies);
    for (const encounter of start) {
      if (encounter.callout) this.hud.callout({ ...encounter.callout, tone: 'red' });
      for (const spawn of encounter.spawns) void this.spawnFoe(spawn);
    }
    if (hint) this.hud.hint(hint, 4);
  }

  /** One of an encounter's opponents, where it waits, facing the hero; hidden until its model is ready. */
  private spawnFoe(spawn: ExpeditionSpawn): Promise<unknown> {
    const enemy = spawn.make(spawn.id);
    this.addFighter(enemy, spawn.at, spawn.capsule);
    enemy.faceTowards(spawn.face ?? this.player!.getPosition());
    enemy.group.visible = false;
    this.enemies.push(enemy);
    this.hud.add(enemy);
    return enemy.attachRig(spawn.rig)
      .catch((err) => console.error(`[Engine] ${enemy.id} rig failed to load; keeping the greybox`, err))
      .finally(() => { enemy.group.visible = true; });
  }

  /** The chapter story's cast, where it first stands (hidden if it comes on later); loaded with the chapter. */
  private spawnCast(chapter: Chapter): Promise<unknown>[] {
    return (chapter.story?.cast ?? []).map((m) => {
      const extra = new Extra(m.id);
      if (m.silhouette) extra.silhouetteColor = m.silhouette.color;
      if (m.ghost) extra.ghost = m.ghost;
      if (m.shade) extra.shade = m.shade;
      extra.setPosition(m.at.x, m.at.y, m.at.z);
      if (m.face) extra.group.rotation.y = Math.atan2(m.face.x - m.at.x, m.face.z - m.at.z);
      extra.appear(!m.hidden, 0);
      this.sceneManager.scene.add(extra.group);
      this.cast.push(extra);
      return extra.attachRig(m.rig).catch((err) => console.error(`[Engine] ${m.id} rig failed to load; keeping the greybox`, err));
    });
  }

  private restartChapter(): Promise<void> {
    return this.chapter ? this.startChapter(this.chapter.id, { intro: false }) : Promise.resolve();
  }

  private spawnEnemies(chapter: Chapter): Promise<unknown>[] {
    const spawns = SPAWNS[chapter.level] ?? [];
    const spawnPoint = this.levelManager.activeLevel!.playerSpawn;
    return spawns.map((s) => {
      const enemy = s.make();
      this.addFighter(enemy, s.at, s.capsule);
      enemy.faceTowards(spawnPoint);
      if (s.hidden) enemy.group.visible = false;
      this.enemies.push(enemy);
      return enemy.attachRig(s.rig).catch((err) => console.error(`[Engine] ${enemy.id} rig failed to load; keeping the greybox`, err));
    });
  }

  /** The hero at the level's spawn, at full strength, facing his opponents, the follow camera behind him. */
  private placeHero(): void {
    const player = this.player!;
    const spawn = this.levelManager.activeLevel!.playerSpawn;
    player.revive();
    if (player.swordSheathed) player.stowSword(false);
    player.setPosition(spawn.x, spawn.y, spawn.z);
    const centre = this.enemies.length
      ? this.enemies.reduce((c, e) => c.add(e.getPosition()), new THREE.Vector3()).divideScalar(this.enemies.length)
      : spawn.clone().add(new THREE.Vector3(0, 0, -1));
    player.group.rotation.y = Math.atan2(centre.x - spawn.x, centre.z - spawn.z);
    player.group.visible = true;
    HitboxManager.getInstance().forget(player.id);
    this.interpolated.clear();
    this.sceneManager.resetFollowCamera(player.getPosition(), player.group.rotation.y);
  }

  private playIntro(chapter: Chapter): void {
    this.setMode('intro');
    this.resetSkip();
    this.cinema.setActive(true);
    this.cinema.setFade(1);
    this.soundFX.music.dim(true);
    const token = this.loadToken;
    this.director.play(buildIntro(this.introContext(chapter)), () => this.afterIntro(chapter, token));
  }

  /** The intro is over (or skipped): the chapter's opening scene, if it has one, then the fight. */
  private afterIntro(chapter: Chapter, token: number): void {
    const opening = chapter.story?.opening;
    if (!opening || token !== this.loadToken || this.mode !== 'intro') this.endIntro();
    else this.storyScene(opening, () => this.endIntro());
  }

  /** A new cutscene: a press already held when it starts (or that skipped the last one) does not count. */
  private resetSkip(): void {
    this.skipHeld = 0;
    this.skipLatched = this.inputManager.skipHeld();
  }

  /** Who stands where, for story scenes and beat triggers. */
  private stage(): Stage {
    return new Stage(this.chapter!, this.levelManager.activeLevel!, this.player!, this.enemies, this.introContext(this.chapter!).cards, this.cast);
  }

  /**
   * A story scene: played the first time this session (if `play`), otherwise settled (its marks and essential hooks
   * applied at once). `onDone` either way, once it is over.
   */
  private storyScene(scene: StoryScene, onDone: () => void, play = true): void {
    if (play && !this.seenScenes.has(scene.id)) {
      this.playScene(scene, onDone);
      return;
    }
    new SceneRun(scene, this.stage(), this.dialogue, this.staging).settle();
    onDone();
  }

  /** Plays a story scene as a cutscene (whatever fight there is holds still); `onDone` once played or skipped. */
  private playScene(scene: StoryScene, onDone: () => void): void {
    this.seenScenes.add(scene.id);
    this.setMode('intro');
    this.resetSkip();
    this.hud.show(false);
    this.hud.clearHint();
    this.projectileManager.clear();
    this.dialogue.clear();
    this.cinema.setActive(true, scene.letterbox !== false);
    this.soundFX.music.dim(true);
    const stage = this.stage();
    this.staging.begin(stage.player, stage.enemies);
    const run = new SceneRun(scene, stage, this.dialogue, this.staging);
    const token = this.loadToken;
    this.sceneRun = run;
    this.director.play(run.shots, () => {
      if (this.sceneRun === run) this.sceneRun = null;
      run.finish();
      // Left for the title or another chapter: nothing follows.
      if (token === this.loadToken) onDone();
    });
  }

  /** Mid-fight story beats whose moment has come: lines spoken over the fight, or a scene that stops it. */
  private updateBeats(): void {
    if (!this.beats.length || !this.player || this.player.isDown()) return;
    // A final boss still loading in gets his own cutscene first.
    if (this.finale?.boss && !this.finale.boss.group.visible) return;
    // In-fight lines keep their distance: none starts while another is spoken or until a breath after it.
    if (this.dialogue.speaking) this.linesEndedAt = this.fightTime;
    const quiet = this.fightTime - this.linesEndedAt >= LINES_GAP;
    const stage = this.stage();
    for (const b of this.beats) {
      if (b.fired || ('lines' in b.beat && !quiet)) continue;
      if (!triggered(b.beat.on, stage, { time: this.fightTime, learned: this.learnedNow })) continue;
      b.fired = true;
      b.beat.run?.(stage);
      if (b.beat.hint) this.hud.hint(b.beat.hint, 9);
      if ('lines' in b.beat) {
        this.dialogue.play(b.beat.lines, 'voice');
        return; // one voice at a time
      } else {
        this.storyScene(b.beat.scene, () => this.endIntro());
        if (this.mode !== 'play') return; // one scene at a time
      }
    }
  }

  /** The chapter is decided and its outcome screen is due: a won chapter's ending scene first, if it has one. */
  private concludeChapter(): void {
    // Whoever was still on the move when the fight was decided stops (the hero can run on through the victory);
    // a played ending does this too, but one already seen is only settled.
    if (this.mode === 'outro' && this.player) this.staging.begin(this.player, [...this.enemies, ...this.cast]);
    const ending = this.mode === 'outro' ? this.chapter?.story?.ending : undefined;
    if (!ending) {
      if (this.mode === 'outro') this.mode = 'over';
      this.showOutcome();
      return;
    }
    this.storyScene(ending, () => {
      this.mode = 'over';
      this.cinema.setActive(false);
      this.soundFX.music.dim(false);
      // A chapter that runs straight on stays black into the next one's loading.
      if (!this.chapter?.continues) this.fadeFromBlack(0.8);
      this.showOutcome();
    });
  }

  /** Fades the picture back in from however black the screen is now. */
  private fadeFromBlack(seconds: number): void {
    const fade = { a: this.cinema.fade };
    gsap.to(fade, { a: 0, duration: seconds, ease: 'power1.out', onUpdate: () => this.cinema.setFade(fade.a) });
  }

  private introContext(chapter: Chapter): IntroContext {
    return {
      chapter,
      level: this.levelManager.activeLevel!,
      player: this.player!,
      enemies: this.enemies.filter((e) => e.stateMachine.currentState !== 'DEAD'),
      horde: this.horde ? this.horde.def.card : null,
      cards: {
        chapter: () => {
          this.cinema.chapterCard(chapter);
          this.soundFX.playCardHit();
        },
        boss: (enemy) => this.cinema.nameCard(enemy.displayName, enemy.epithet, 3.6),
        name: (enemy) => this.cinema.nameCard(enemy.displayName, enemy.epithet, 1.9, true),
        title: (name, epithet) => this.cinema.nameCard(name, epithet, 2.6, true),
      },
      say: (lines) => this.dialogue.play(lines, 'scene'),
    };
  }

  /** The cutscene is over (or skipped): the camera eases into the follow camera and the fight starts. */
  private endIntro(): void {
    if (this.mode !== 'intro') return;
    // Skipped before the roar (or halfway through an entrance): the fight still starts without one, set right.
    for (const e of this.enemies) if (e instanceof Boss) e.settleIntro();
    const cam = this.sceneManager.camera;
    this.handoff.pos.copy(cam.position);
    this.handoff.quat.copy(cam.quaternion);
    this.handoff.fov = cam.fov;
    this.handoff.t = 0;
    this.cinema.setActive(false);
    this.cinema.setFade(0);
    this.beginFight(false);
    this.setMode('handoff');
  }

  /** Control to the player. `fadeIn` for a retry (no cutscene): a short fade from black. */
  private beginFight(fadeIn: boolean): void {
    this.setMode('play');
    this.inputManager.releaseAll();
    this.inputManager.discardLook();
    this.hud.show(true);
    this.hud.showBoss(true);
    this.hud.setDevice(this.inputManager.device);
    this.soundFX.music.play(this.fightMusic());
    this.soundFX.music.dim(false);
    if (fadeIn) {
      // A retry skips the cutscene, but the boss still announces himself.
      this.cinema.setFade(1);
      this.fadeFromBlack(0.8);
    }
    this.updateCaptureHint();
  }

  /** The music for the fight as it stands: a boss still standing brings his (or the boss theme); else the arena's. */
  private fightMusic(): Track {
    const finale = this.finale?.boss;
    if (finale && finale.stateMachine.currentState !== 'DEAD') return this.finale!.def.music ?? 'boss';
    if (this.enemies.some((e) => e.isBoss && e.stateMachine.currentState !== 'DEAD')) return 'boss';
    return LEVEL_MUSIC[this.chapter!.level] ?? 'title';
  }

  private pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.dialogue.setPaused(true);
    this.inputManager.releaseAll();
    this.inputManager.exitPointerLock();
    $('pause-chapter').textContent = this.chapter ? `${chapterTitle(this.chapter)}, ${this.chapter.name}` : '';
    this.screens.only('pause');
    this.updateCaptureHint();
  }

  private async resume(): Promise<void> {
    if (!this.paused) return;
    // On a keyboard the mouse must be recaptured; the browser can refuse for a moment after Esc.
    if (this.inputManager.device === 'keyboard' && !(await this.capturePointer())) {
      $('pause-chapter').textContent = 'Click Resume again to continue.';
      return;
    }
    this.screens.clear();
    this.paused = false;
    this.dialogue.setPaused(false);
    this.inputManager.releaseAll();
    this.inputManager.discardLook();
    this.lastTime = performance.now();
    this.updateCaptureHint();
  }

  /**
   * A fight the hero is meant to lose (the prologue): once its moment comes he is beaten (on his knees, out of the
   * player's hands) and the chapter ends in its story, as a won chapter would: its ending scene, then onward.
   */
  private checkLoss(): void {
    const loss = this.chapter?.story?.loss;
    if (!loss || this.mode !== 'play' || !this.player) return;
    if (!triggered(loss.on, this.stage(), { time: this.fightTime, learned: this.learnedNow })) return;
    this.beaten = true;
    this.setMode('outro');
    this.outcome = 'victory';
    this.outcomeAt = 1.6;
    this.hud.clearHint();
    this.hud.showBoss(false);
    this.dialogue.clear();
    this.soundFX.music.play(null);
    this.soundFX.playDefeat();
    // They stand over him from here (their AI stops): nobody left mid-stride, running on the spot.
    this.staging.begin(this.player, this.enemies);
    this.player.stateMachine.changeState('POSTURE_BROKEN');
    this.slowMotion(0.35, 1.2);
  }

  /** The fight is decided: the hero fell, or every enemy did. */
  private checkOutcome(): void {
    if (this.mode !== 'play' || !this.player) return;
    if (this.player.isDown()) {
      this.setMode('over');
      this.outcome = 'defeat';
      this.outcomeAt = DEFEAT_DELAY;
      this.hud.clearHint();
      this.dialogue.clear();
      this.soundFX.music.play(null);
      this.soundFX.playDefeat();
      this.slowMotion(0.4, 1.2);
      return;
    }
    // An explorable chapter is won at its goal (the island's altar), not when the last opponent falls.
    const quest = this.expedition;
    if (quest ? !quest.complete : this.enemies.length === 0 || !this.fieldCleared()) return;
    if (this.finale && !this.finale.boss) return; // the final boss is still to come
    this.setMode('outro');
    this.outcome = 'victory';
    this.outcomeAt = quest ? 0.4 : VICTORY_DELAY;
    this.hud.clearHint();
    this.hud.showBoss(false);
    this.soundFX.music.play(LEVEL_MUSIC[this.chapter!.level] ?? 'title');
    if (quest) return; // its ending scene follows at once
    const boss = this.finale?.boss ?? this.enemies.find((e) => e.isBoss);
    const last = !CHAPTERS.some((c) => c.id === this.chapter!.id + 1);
    this.soundFX.playLevelClear(last ? 'final' : boss ? 'boss' : 'clear');
    this.hud.callout({ text: boss ? `${boss.displayName} has fallen` : this.chapter!.clearedLine, tone: 'pale' });
    this.slowMotion(0.3, 1.6);
  }

  private slowMotion(scale: number, seconds: number): void {
    gsap.killTweensOf(this.combatSystem);
    this.combatSystem.globalTimeScale = scale;
    gsap.to(this.combatSystem, { globalTimeScale: 1, duration: 0.6, delay: seconds, ease: 'power1.in' });
  }

  private showOutcome(): void {
    const chapter = this.chapter!;
    this.inputManager.exitPointerLock();
    this.hud.show(false);
    if (this.outcome === 'defeat') {
      const boss = this.enemies.find((e) => e.isBoss && e.stateMachine.currentState !== 'DEAD');
      $('defeat-line').textContent = boss ? `${boss.displayName} still stands.` : chapter.defeatLine;
      this.screens.only('defeat');
      return;
    }
    // Chapter complete.
    const next = CHAPTERS.find((c) => c.id === chapter.id + 1);
    Progress.unlock(next ? next.id : chapter.id + 1);
    if (next && chapter.continues) {
      // Straight on into the next chapter, from black.
      void this.startChapter(next.id, { intro: true });
      return;
    }
    if (!next && chapter.story?.ending) {
      // The campaign's last scene is over: the credits, then the title.
      this.rollCredits();
      return;
    }
    const s = this.combatSystem.stats;
    const minutes = Math.floor(this.fightTime / 60);
    const seconds = Math.floor(this.fightTime % 60).toString().padStart(2, '0');
    $('cleared-kicker').textContent = next ? `${chapterTitle(chapter)} complete` : 'The campaign is complete';
    $('cleared-title').textContent = next ? chapter.clearedLine : `${chapter.clearedLine} Thank you for playing.`;
    const stats: [string, string | number][] = [
      ['Time', `${minutes}:${seconds}`],
      ['Deflections', s.deflections],
      ['Blows taken', s.hitsTaken],
      ['Posture breaks', s.postureBreaks],
    ];
    $('cleared-stats').innerHTML = stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    const nextButton = $('cleared-next') as HTMLButtonElement;
    nextButton.textContent = next ? `Continue to chapter ${next.numeral}` : 'Return to the title';
    this.screens.only('cleared');
  }

  /** The credits over black after the last chapter's ending; the title after them. */
  private rollCredits(): void {
    this.cinema.setActive(false);
    this.cinema.setFade(1);
    this.dialogue.clear();
    // The reveal's chant (the summit's ending) plays out under the roll first, then the title's loop.
    this.soundFX.music.then('title');
    this.soundFX.music.dim(false);
    this.soundFX.playAmbience(null);
    this.screens.only('credits');
    this.credits.start();
  }

  // ---------------------------------------------------------------------------------------------------- World

  /**
   * Puts a fighter in the world with a physical capsule whose bottom sits at `feet`; from then on its movement
   * is resolved by a CharacterMotor (collision with the level and other fighters, stepping, gravity).
   */
  private addFighter(fighter: Character, feet: THREE.Vector3, capsule: { halfHeight: number; radius: number }): void {
    const footOffset = capsule.halfHeight + capsule.radius;
    const { body, collider } = this.physicsWorld.createCharacterCapsule(
      new THREE.Vector3(feet.x, feet.y + footOffset, feet.z), capsule.halfHeight, capsule.radius, true,
    );
    fighter.group.position.copy(feet);
    if (fighter instanceof Enemy) fighter.home.copy(feet);
    fighter.attachPhysics(body, collider, footOffset);
    this.sceneManager.scene.add(fighter.group);
    this.sceneManager.scene.add(fighter.slashRibbon.mesh);
  }

  private clearEnemies(): void {
    for (const enemy of this.enemies) {
      this.sceneManager.scene.remove(enemy.group);
      this.sceneManager.scene.remove(enemy.slashRibbon.mesh);
      enemy.detachPhysics();
      if (enemy.rigidBody) this.physicsWorld.removeBody(enemy.rigidBody);
      enemy.rig?.dispose();
      disposeObject(enemy.group);
      disposeObject(enemy.slashRibbon.mesh);
      HitboxManager.getInstance().forget(enemy.id);
    }
    this.enemies = [];
    for (const extra of this.cast) {
      this.sceneManager.scene.remove(extra.group);
      extra.rig?.dispose();
      disposeObject(extra.group);
    }
    this.cast = [];
    this.horde = null;
    this.finale = null;
    this.expedition = null;
    this.staging.clear();
    SceneFX.clear();
    this.combatDebug.prune(this.player ? [this.player] : []);
    this.projectileManager.clear();
    this.interpolated.clear();
    this.hud.bind([]);
  }

  /**
   * Out-of-arena recovery: a player who falls below the level's kill plane is put back at the spawn; an enemy
   * that falls is out of the fight (ring-out).
   */
  private recoverFalls(): void {
    const level = this.levelManager.activeLevel;
    if (!level || !this.player) return;
    if (this.player.getPosition().y < level.killPlaneY) {
      const spawn = level.playerSpawn;
      this.player.setPosition(spawn.x, spawn.y, spawn.z);
      this.interpolated.delete(this.player.group);
    }
    // A minion that falls is gone; a boss (its leap can carry it off a bridge) is put back where it came in.
    for (const enemy of this.enemies) {
      if (enemy.getPosition().y >= level.killPlaneY || enemy.stateMachine.currentState === 'DEAD') continue;
      if (enemy.isBoss) {
        enemy.setPosition(enemy.home.x, enemy.home.y, enemy.home.z);
        enemy.stateMachine.changeState('IDLE');
        this.interpolated.delete(enemy.group);
      } else {
        enemy.currentHealth = 0;
        enemy.stateMachine.changeState('DEAD');
      }
    }
  }

  /** One fixed simulation step. In cutscenes nobody acts on their own; the director cues what happens. */
  private fixedUpdate(dt: number): void {
    const player = this.player;
    if (!player) return;
    this.physicsWorld.step(dt);
    this.inputManager.advance(dt);
    const acting = this.mode === 'play' || this.mode === 'handoff' || this.mode === 'outro';
    const playerControl = acting && !this.beaten;
    this.applyEase();

    if (playerControl) player.handleInput(dt, this.sceneManager.viewYaw, this.enemies);
    else player.updateProceduralAnimations(dt, 0);
    // Enemies still hidden (a boss whose model is loading) wait.
    // Once the hero is beaten (a scripted loss) they stand over him instead of pressing on.
    if ((acting || this.mode === 'over') && !this.beaten) this.enemies.forEach((enemy) => { if (enemy.group.visible) enemy.updateAI(dt, player); });

    // Low in a slide he passes between and under enemies instead of stopping against them.
    separateFighters([player, ...this.enemies].filter((f) => f.motor).map((f) => ({
      position: f.group.position, radius: f.motor!.radius,
      solid: f.stateMachine.currentState !== 'DEAD' && !f.submerged && !(f === player && player.isEvading()),
    })));

    // Story scenes walk people to their marks (the motor below still resolves them).
    if (this.mode === 'intro') this.staging.update(dt);
    SceneFX.update(dt);
    player.update(dt);
    this.enemies.forEach((enemy) => enemy.update(dt));
    this.cast.forEach((extra) => extra.update(dt));

    if (acting || this.mode === 'over') {
      this.combatSystem.update(player, this.enemies, dt);
      this.projectileManager.update(dt, player, this.enemies);
    }
    this.recoverFalls();
    if (this.mode === 'play') {
      this.fightTime += dt;
      this.updateHorde(dt);
      this.updateFinale();
      this.updateExpedition();
    }
  }

  private simulating(): boolean {
    return !this.paused && (this.inFight() || this.mode === 'over');
  }

  private simulatedObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [...this.enemies, ...this.cast].map((c) => c.group);
    if (this.player) objects.push(this.player.group);
    return objects;
  }

  private captureTransforms(which: 'prev' | 'curr'): void {
    for (const obj of this.simulatedObjects()) {
      let t = this.interpolated.get(obj);
      if (!t) {
        t = {
          prevPos: obj.position.clone(), prevQuat: obj.quaternion.clone(),
          currPos: obj.position.clone(), currQuat: obj.quaternion.clone(),
        };
        this.interpolated.set(obj, t);
      }
      (which === 'prev' ? t.prevPos : t.currPos).copy(obj.position);
      (which === 'prev' ? t.prevQuat : t.currQuat).copy(obj.quaternion);
    }
  }

  private applyInterpolation(alpha: number): void {
    this.interpolated.forEach((t, obj) => {
      obj.position.lerpVectors(t.prevPos, t.currPos, alpha);
      obj.quaternion.slerpQuaternions(t.prevQuat, t.currQuat, alpha);
    });
  }

  private restoreSimulationState(): void {
    this.interpolated.forEach((t, obj) => {
      obj.position.copy(t.currPos);
      obj.quaternion.copy(t.currQuat);
    });
  }

  /**
   * Test hook: stops the real-time loop and advances `frames` frames exactly as the loop does (one fixed step,
   * render interpolation, camera, restore), so headless tests exercise the same path as play.
   */
  public debugStep(frames: number, each?: (frame: number) => void): void {
    this.isRunning = false;
    if (this.mode !== 'play') this.setMode('play');
    for (let i = 0; i < frames; i++) {
      this.captureTransforms('prev');
      this.fixedUpdate(FIXED_DT);
      this.captureTransforms('curr');
      this.applyInterpolation(0.5);
      if (this.player) this.sceneManager.updateCamera(this.player.getPosition(), 0, 0, FIXED_DT);
      this.restoreSimulationState();
      each?.(i);
    }
  }

  /** Dev: freezes the running cutscene on shot `index` at `time` seconds (unfreeze with `debugResume`). */
  public debugShot(index: number, time: number): void {
    if (this.mode !== 'intro') return;
    this.paused = true;
    this.director.seek(index, time);
    this.cinema.setFade(this.director.fade);
    this.sceneManager.focusKeyLight(this.director.focus());
  }

  /** Dev: runs the game for `seconds` of fixed steps right now (cutscenes included), then holds still. */
  public debugAdvance(seconds: number): void {
    this.paused = false;
    for (let i = 0; i < Math.round(seconds / FIXED_DT); i++) {
      if (this.simulating()) this.fixedUpdate(FIXED_DT);
      this.modeTime += FIXED_DT;
      this.updateCamera(FIXED_DT);
      this.updateFlow(FIXED_DT);
      this.dialogue.update(FIXED_DT);
      this.particleFX.update(FIXED_DT);
    }
    this.paused = true;
  }

  /**
   * Dev: everyone in the arena falls now; the victory, the chapter's ending scene and its outcome follow as in play.
   * A chapter with a scripted loss is "won" by losing: the hero is brought low and its loss plays.
   */
  public debugWin(): void {
    if (this.chapter?.story?.loss && this.player) {
      this.player.currentHealth = 1;
      return;
    }
    for (const e of this.enemies) {
      e.currentHealth = 0;
      e.stateMachine.changeState('DEAD');
    }
    // An explorable chapter: as if he had reached its goal (the island's ending puts him at the altar).
    this.expedition?.finish();
  }

  /** Dev: back to real time after `debugShot` / `debugAdvance` / `debugStep`. */
  public debugResume(): void {
    this.paused = false;
    this.lastTime = performance.now();
    if (!this.isRunning) {
      this.isRunning = true;
      requestAnimationFrame(this.gameLoop);
    }
  }

  // ---------------------------------------------------------------------------------------------------- Frame

  private gameLoop = (time: number): void => {
    if (!this.isRunning) return;
    requestAnimationFrame(this.gameLoop);

    const rawDt = Math.min((time - this.lastTime) / 1000, 0.25);
    this.lastTime = time;
    this.inputManager.poll(time / 1000);

    const simulate = this.simulating();
    const effectiveDt = simulate ? rawDt * this.combatSystem.globalTimeScale : 0;

    if (simulate) {
      this.accumulator += effectiveDt;
      let steps = 0;
      while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        this.captureTransforms('prev');
        this.fixedUpdate(FIXED_DT);
        this.accumulator -= FIXED_DT;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0; // too far behind (tab stall): drop the backlog
      if (steps > 0) this.captureTransforms('curr');
      this.applyInterpolation(this.accumulator / FIXED_DT);
    }

    if (!this.paused) {
      this.modeTime += rawDt;
      this.updateCamera(rawDt);
      this.updateFlow(rawDt);
      this.dialogue.update(rawDt);
    }

    this.particleFX.update(effectiveDt);
    if (this.player) this.combatDebug.update([this.player, ...this.enemies], rawDt);
    this.levelManager.update(time * 0.001, this.paused ? 0 : rawDt, this.sceneManager.camera);
    if (this.player && (this.mode === 'play' || this.mode === 'handoff' || this.mode === 'outro' || this.mode === 'over')) {
      this.hud.update(this.player, this.enemies, this.sceneManager.camera, rawDt);
    }

    this.sceneManager.render(rawDt);
    if (simulate) this.restoreSimulationState();
  };

  private updateCamera(dt: number): void {
    const sm = this.sceneManager;
    const cam = sm.camera;
    switch (this.mode) {
      case 'boot':
      case 'loading':
        return;
      case 'title': {
        const a = ATTRACT[this.levelManager.activeLevel?.id ?? 1] ?? ATTRACT[1];
        this.attractAngle += a.speed * dt;
        cam.position.set(a.centre.x + Math.sin(this.attractAngle) * a.radius, a.height, a.centre.z + Math.cos(this.attractAngle) * a.radius);
        // Aim left of the subject by `frame` metres so it sits right of the menu.
        const shift = a.frame ?? 0;
        cam.lookAt(a.centre.x - Math.cos(this.attractAngle) * shift, a.look, a.centre.z + Math.sin(this.attractAngle) * shift);
        if (cam.fov !== 45) {
          cam.fov = 45;
          cam.updateProjectionMatrix();
        }
        sm.focusKeyLight(a.centre);
        return;
      }
      case 'intro':
        this.inputManager.discardLook();
        this.director.update(dt);
        if (this.mode !== 'intro') return; // ended this frame
        this.cinema.setFade(this.director.fade);
        sm.focusKeyLight(this.director.focus());
        return;
      default: {
        if (!this.player) return;
        const look = this.mode === 'over' ? { yaw: 0, pitch: 0 } : this.inputManager.consumeLook(dt);
        sm.updateCamera(this.player.getPosition(), look.yaw, look.pitch, dt);
        if (this.mode === 'handoff') {
          this.handoff.t += dt;
          const k = THREE.MathUtils.smootherstep(Math.min(1, this.handoff.t / HANDOFF_SECONDS), 0, 1);
          cam.position.lerpVectors(this.handoff.pos, cam.position, k);
          cam.quaternion.slerpQuaternions(this.handoff.quat, cam.quaternion.clone(), k);
          cam.fov = THREE.MathUtils.lerp(this.handoff.fov, sm.gameplayFov, k);
          cam.updateProjectionMatrix();
        }
      }
    }
  }

  private updateFlow(dt: number): void {
    switch (this.mode) {
      case 'intro': {
        // Hold to skip; a tap moves on to the next line.
        if (!this.inputManager.skipHeld()) {
          if (this.skipHeld > 0 && this.skipHeld < SKIP_TAP) this.sceneRun?.advance();
          this.skipHeld = 0;
          this.skipLatched = false;
        } else if (!this.skipLatched) {
          this.skipHeld += dt;
        }
        const show = this.skipHeld > 0 || this.modeTime > 2.5;
        this.cinema.skip(Math.min(1, this.skipHeld / SKIP_HOLD), show);
        if (this.skipHeld >= SKIP_HOLD) {
          this.skipHeld = 0;
          this.skipLatched = true;
          this.director.skip();
        }
        break;
      }
      case 'handoff':
        if (this.handoff.t >= HANDOFF_SECONDS) this.setMode('play');
        this.checkOutcome();
        break;
      case 'play':
        this.updateHints();
        this.updateBeats();
        this.checkLoss();
        if (this.mode === 'play') this.checkOutcome();
        break;
      case 'outro':
      case 'over':
        this.outcomeAt -= dt;
        if (this.outcomeAt <= 0 && this.screens.empty) {
          this.outcomeAt = Infinity;
          this.concludeChapter();
        }
        break;
      default:
        break;
    }
  }

  private updateHints(): void {
    while (this.hintIndex < FIRST_FIGHT_HINTS.length) {
      const [at, text, needs, moot] = FIRST_FIGHT_HINTS[this.hintIndex];
      // A move he does not have yet is not taught; nor is a hint already seen, or one a better move replaces.
      if ((needs && !this.player?.can(needs)) || (moot && this.player?.can(moot)) || this.hintsShown.has(this.hintIndex)) {
        this.hintIndex++;
        continue;
      }
      if (this.fightTime < at) return;
      this.hud.hint(text, 6);
      this.hintsShown.add(this.hintIndex);
      this.hintIndex++;
      break;
    }
  }

  /**
   * A move just taught mid-fight (the guru's charge, in Chapter I): its first-fight hint now, since the hints in order
   * passed it by while it was still locked.
   */
  private hintLearned(ability: Ability): void {
    const index = FIRST_FIGHT_HINTS.findIndex(([, , needs]) => needs === ability);
    if (index < 0 || this.hintsShown.has(index) || !Settings.get().hints) return;
    this.hud.hint(FIRST_FIGHT_HINTS[index][1], 8);
    this.hintsShown.add(index);
  }
}

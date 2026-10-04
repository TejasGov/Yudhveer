import * as THREE from 'three';
import gsap from 'gsap';
import { SceneManager } from './SceneManager';
import { PhysicsWorld } from './PhysicsWorld';
import { InputManager, type MenuAction } from './InputManager';
import { Settings, Progress, type GameSettings } from './Settings';
import { LevelManager } from '../levels/LevelManager';
import { disposeObject } from '../levels/GLBLevel';
import { ParticleFX } from '../combat/ParticleFX';
import { SoundFX, MOODS, type MusicMood, type Ambience } from '../combat/SoundFX';
import { CombatSystem } from '../combat/CombatSystem';
import { CombatDebug } from '../combat/CombatDebug';
import { ProjectileManager } from '../combat/ProjectileManager';
import { HitboxManager } from '../combat/HitboxManager';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { Vetala } from '../entities/Vetala';
import { Mayavi } from '../entities/Mayavi';
import { BossTakshaka } from '../entities/BossTakshaka';
import { Rakshasa } from '../entities/Rakshasa';
import { BossBaoli } from '../entities/BossBaoli';
import { BossShalva } from '../entities/BossShalva';
import { BossAndhaka } from '../entities/BossAndhaka';
import { DWARKA_STARTS } from '../levels/Level3_Dwarka';
import { YODHA } from '../entities/characters/Yodha';
import { BAOLI_GUARDIAN } from '../entities/characters/BaoliGuardian';
import { VETALA } from '../entities/characters/Vetala';
import { MAYAVI } from '../entities/characters/Mayavi';
import { TAKSHAKA } from '../entities/characters/Takshaka';
import { RAKSHASA } from '../entities/characters/Rakshasa';
import { SHALVA } from '../entities/characters/Shalva';
import { ANDHAKA } from '../entities/characters/Andhaka';
import { CharacterRig, type CharacterDefinition } from '../entities/animation/CharacterRig';
import type { Character } from '../entities/Character';
import { separateFighters } from '../physics/CharacterMotor';
import { CHAPTERS, chapterById, type Chapter } from '../game/Chapters';
import { CinematicDirector } from '../cinematics/CinematicDirector';
import { buildIntro, buildArrival, ATTRACT, type IntroContext } from '../cinematics/Intros';
import { Hud } from '../ui/Hud';
import { Cinema } from '../ui/Cinema';
import { ScreenStack } from '../ui/Menus';
import { refreshGlyphs } from '../ui/Glyphs';

// Capsules: half-height of the cylinder part and radius (metres); the feet sit at the capsule's bottom.
const FIGHTER_CAPSULE = { halfHeight: 0.55, radius: 0.4 };
/** The Vetala and Mayavi stand about 2.1 m. */
const TALL_CAPSULE = { halfHeight: 0.6, radius: 0.42 };
/** Takshaka: 2.6 m with the hood. */
const NAGA_CAPSULE = { halfHeight: 0.75, radius: 0.55 };
/** The rakshasa minions: 1.85 m. */
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
/** Hold the skip button this long to skip a cutscene. */
const SKIP_HOLD = 0.7;
/** After the hero falls / the last enemy falls, this long before the outcome screen. */
const DEFEAT_DELAY = 2.6;
const VICTORY_DELAY = 3.4;

/** Who stands where in each chapter, and what they are. */
interface Spawn {
  make: () => Enemy;
  at: THREE.Vector3;
  capsule: { halfHeight: number; radius: number };
  rig: CharacterDefinition;
}

const SPAWNS: Record<number, Spawn[]> = {
  1: [{ make: () => new BossBaoli('baoli_guardian'), at: new THREE.Vector3(0, 0, -4.2), capsule: BAOLI_CAPSULE, rig: BAOLI_GUARDIAN }],
  2: [
    { make: () => new Vetala('vetala'), at: new THREE.Vector3(2.5, 0, -2.8), capsule: TALL_CAPSULE, rig: VETALA },
    { make: () => new Mayavi('mayavi'), at: new THREE.Vector3(-3.2, 0, -5.5), capsule: TALL_CAPSULE, rig: MAYAVI },
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
}

/**
 * A chapter's final boss: he arrives with his own cutscene once everyone else has fallen (and no more minions are
 * due). `at` can depend on where the hero stands.
 */
interface Finale extends Omit<Spawn, 'at'> {
  at: THREE.Vector3 | ((hero: THREE.Vector3) => THREE.Vector3);
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

const HORDES: Record<number, Horde> = {
  4: {
    minion: (i) => new Rakshasa(`rakshasa_${i + 1}`),
    minionCapsule: MINION_CAPSULE,
    minionRig: RAKSHASA,
    lanes: [summitLane(1, 0), summitLane(-1, 3.5)],
    total: 6,
    maxAlive: 3,
    interval: 4,
    card: { name: 'Rakshasas', epithet: 'Six cross the bridges. Their king comes after.' },
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
  // The summit: at the top of Shiva's stair, on the dais (4 m up), facing down toward the arena.
  4: { make: () => new BossAndhaka('andhaka'), at: v3(0, 4.05, -9.6), capsule: ANDHAKA_CAPSULE, rig: ANDHAKA },
};

const LEVEL_MOODS: Record<number, MusicMood> = { 1: MOODS.baoli, 2: MOODS.akhada, 3: MOODS.dwarka, 4: MOODS.summit };
/** Each arena's ambience and reverb: the stepwell, the jungle akhada, the sea at Dwarka, the mountain. */
const LEVEL_AMBIENCE: Record<number, Ambience> = { 1: 'baoli', 2: 'akhada', 3: 'dwarka', 4: 'summit' };

/** Chapter I teaches the basics, one line at a time (fight seconds, text). */
const FIRST_FIGHT_HINTS: [number, string][] = [
  [1.5, 'Press {guard} just as a blow lands to deflect it.'],
  [10, 'Press {dodge} to slide under a blow. You can slide out of a swing once it has landed.'],
  [18, 'Hold {guard} to keep your guard up. Blocking still wears down your posture.'],
  [26, 'Hold {charge} to put your strength into the next three blows.'],
  [36, 'Sprint with {sprint} and attack to leap in with a falling strike.'],
];

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

  private readonly hud = new Hud();
  private readonly cinema = new Cinema();
  private readonly screens = new ScreenStack();
  private readonly director: CinematicDirector;
  private container!: HTMLElement;

  private mode: Mode = 'boot';
  private paused = false;
  private chapter: Chapter | null = null;
  private loadToken = 0;
  private modeTime = 0;
  private fightTime = 0;
  private skipHeld = 0;
  private hintIndex = 0;
  /** The first fight's hints play once per session, not on every retry. */
  private hintsShown = false;
  private attractAngle = 0.6;
  private outcomeAt = 0;
  private outcome: 'defeat' | 'victory' | null = null;
  /** After a failed chapter load: whether the title (and its arena) is still there to go back to. */
  private recoverable = false;
  /** The current chapter's waves, if it has them. */
  private horde: { def: Horde; minions: Enemy[]; timer: number } | null = null;
  /** The chapter's final boss, while he is still to come (`boss` null) and once he is here. */
  private finale: { def: Finale; boss: Enemy | null } | null = null;
  private readonly handoff = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 45, t: 0 };

  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
  private interpolated = new Map<THREE.Object3D, InterpolatedTransform>();

  constructor() {
    this.combatDebug = new CombatDebug(this.sceneManager.scene);
    this.director = new CinematicDirector(this.sceneManager.camera);
    this.combatSystem.onEvent = (e) => this.combatDebug.onEvent(e);
    this.combatSystem.onCallout = (c) => this.hud.callout(c);
    this.combatSystem.onPlayerHurt = () => this.hud.hurt();
    this.soundFX.onLightning = (strength) => this.sceneManager.flash(strength);
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
    this.player.group.visible = false;

    // The title screen stands in the first chapter's arena; the hero streams in alongside it.
    const firstLevel = CHAPTERS[0].level;
    let levelShare = 0;
    let heroShare = 0;
    const report = () => this.showLoading('', 'Yudhveer', levelShare * 0.8 + heroShare * 0.2);
    const level = this.levelManager.loadLevel(firstLevel, (f) => { levelShare = f; report(); });
    const hero = this.player.attachRig(YODHA).then(() => { heroShare = 1; report(); })
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
      // Dev shortcut: Shift+1..4 jumps straight into a chapter's fight.
      if (import.meta.env.DEV && e.shiftKey && /^Digit[1-4]$/.test(e.code)) {
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
      if (action === 'continue') void this.beginCampaign(Math.min(Progress.unlocked(), CHAPTERS.length));
      else if (action === 'new') void this.beginCampaign(1);
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
    };
    this.renderSettings();
    Settings.onChange(() => this.renderSettings());
  }

  /** After a failed chapter load the old arena is gone: reload the first chapter's arena behind the title. */
  private async recoverToTitle(): Promise<void> {
    this.showLoading('', 'Yudhveer', 0);
    try {
      await this.levelManager.loadLevel(CHAPTERS[0].level, (f) => this.showLoading('', 'Yudhveer', f));
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
    list.replaceChildren(...CHAPTERS.map((c) => {
      const b = document.createElement('button');
      b.dataset.action = 'chapter';
      b.dataset.chapter = String(c.id);
      b.disabled = c.id > unlocked;
      b.innerHTML = `<span class="ch-num">${c.numeral}</span><span class="ch-name"></span><span class="ch-state">${c.id > unlocked ? 'Locked' : ''}</span>`;
      const name = b.querySelector('.ch-name')!;
      name.textContent = c.name;
      const place = document.createElement('span');
      place.className = 'ch-place';
      place.textContent = c.id > unlocked ? `Clear chapter ${CHAPTERS[c.id - 2].numeral} to begin` : c.place;
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
    this.mode = mode;
    this.modeTime = 0;
    this.updateCaptureHint();
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
    this.director.skip();
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

    const unlocked = Math.min(Progress.unlocked(), CHAPTERS.length);
    const cont = $('title-continue') as HTMLButtonElement;
    cont.hidden = unlocked <= 1;
    $('continue-detail').textContent = unlocked > 1 ? `Chapter ${chapterById(unlocked).numeral}, ${chapterById(unlocked).name}` : '';
    this.screens.only('title', unlocked > 1 ? cont : null);
    refreshGlyphs(document, this.inputManager.device);
    this.soundFX.music.play(MOODS.title);
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
    this.cinema.setActive(false);
    this.hud.show(false);
    this.hud.clearHint();
    gsap.killTweensOf(this.combatSystem);
    this.combatSystem.globalTimeScale = 1;
    this.setMode('loading');
    this.outcome = null;
    this.clearEnemies();
    this.player.group.visible = false;

    const kicker = `Chapter ${chapter.numeral}`;
    const needLevel = !this.levelManager.isLoaded(chapter.level);
    let levelShare = needLevel ? 0 : 1;
    let rigShare = 0;
    const report = () => this.showLoading(kicker, chapter.name, levelShare * 0.75 + rigShare * 0.25);
    report();
    this.soundFX.music.play(LEVEL_MOODS[chapter.level] ?? MOODS.title);
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

    const rigs = [...this.spawnEnemies(chapter), ...this.startHorde(chapter)];
    this.finale = FINALES[chapter.level] ? { def: FINALES[chapter.level], boss: null } : null;
    if (this.finale) CharacterRig.prefetch(this.finale.def.rig);
    let done = 0;
    await Promise.all(rigs.map((p) => p.finally(() => { rigShare = ++done / rigs.length; report(); })));
    if (token !== this.loadToken) return;

    this.placeHero();
    this.combatSystem.resetStats();
    this.projectileManager.clear();
    this.hud.bind(this.enemies);
    this.fightTime = 0;
    this.hintIndex = chapter.id === 1 && Settings.get().hints && !this.hintsShown ? 0 : FIRST_FIGHT_HINTS.length;
    this.hideLoading();

    if (options.intro) this.playIntro(chapter);
    else this.beginFight(true);
  }

  /** Sets up a wave chapter: the first minions (one per lane) now. */
  private startHorde(chapter: Chapter): Promise<unknown>[] {
    const def = HORDES[chapter.level];
    if (!def) return [];
    this.horde = { def, minions: [], timer: def.interval };
    return def.lanes.slice(0, Math.min(def.lanes.length, def.maxAlive, def.total)).map(() => this.spawnMinion());
  }

  /** The next minion, at the next lane's start, running its route; hidden until its model is ready. */
  private spawnMinion(): Promise<unknown> {
    const h = this.horde!;
    const index = h.minions.length;
    const lane = h.def.lanes[index % h.def.lanes.length];
    const enemy = h.def.minion(index);
    this.addFighter(enemy, lane.at, h.def.minionCapsule);
    enemy.route = lane.route.map((p) => p.clone());
    // Only the opening minions stagger their start; later ones are already spaced by the spawn interval.
    enemy.routeDelay = index < h.def.lanes.length ? lane.delay : 0;
    enemy.faceTowards(lane.route[0]);
    enemy.group.visible = false;
    this.enemies.push(enemy);
    h.minions.push(enemy);
    this.hud.add(enemy);
    return enemy.attachRig(h.def.minionRig)
      .catch((err) => console.error(`[Engine] ${enemy.id} rig failed to load; keeping the greybox`, err))
      .finally(() => { enemy.group.visible = true; });
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

  /** The final boss comes once the field is clear. */
  private updateFinale(): void {
    if (this.finale && !this.finale.boss && this.fieldCleared()) void this.finaleArrives();
  }

  /** The final boss appears where the chapter puts him and gets his own cutscene; then the fight resumes. */
  private async finaleArrives(): Promise<void> {
    const f = this.finale!;
    const token = this.loadToken;
    const enemy = f.def.make();
    f.boss = enemy;
    const at = typeof f.def.at === 'function' ? f.def.at(this.player!.getPosition()) : f.def.at;
    this.addFighter(enemy, at, f.def.capsule);
    enemy.faceTowards(this.player!.getPosition());
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
    this.setMode('intro');
    this.skipHeld = 0;
    this.hud.show(false);
    this.cinema.setActive(true);
    this.director.play(buildArrival(this.introContext(this.chapter!), enemy), () => this.endIntro());
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
    this.skipHeld = 0;
    this.cinema.setActive(true);
    this.cinema.setFade(1);
    this.director.play(buildIntro(this.introContext(chapter)), () => this.endIntro());
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
    const boss = this.enemies.find((e) => e.isBoss);
    const mood = LEVEL_MOODS[this.chapter!.level] ?? MOODS.title;
    this.soundFX.music.play(boss ? { ...mood, pulse: 84 } : { ...mood, pulse: 96 });
    if (fadeIn) {
      // A retry skips the cutscene, but the boss still announces himself.
      this.cinema.setFade(1);
      const fade = { a: 1 };
      gsap.to(fade, { a: 0, duration: 0.8, ease: 'power1.out', onUpdate: () => this.cinema.setFade(fade.a) });
    }
    this.updateCaptureHint();
  }

  private pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.inputManager.releaseAll();
    this.inputManager.exitPointerLock();
    $('pause-chapter').textContent = this.chapter ? `Chapter ${this.chapter.numeral}, ${this.chapter.name}` : '';
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
    this.inputManager.releaseAll();
    this.inputManager.discardLook();
    this.lastTime = performance.now();
    this.updateCaptureHint();
  }

  /** The fight is decided: the hero fell, or every enemy did. */
  private checkOutcome(): void {
    if (this.mode !== 'play' || !this.player) return;
    if (this.player.isDown()) {
      this.setMode('over');
      this.outcome = 'defeat';
      this.outcomeAt = DEFEAT_DELAY;
      this.hud.clearHint();
      this.soundFX.music.play(null);
      this.soundFX.playDefeat();
      this.slowMotion(0.4, 1.2);
      return;
    }
    if (this.enemies.length === 0 || !this.fieldCleared()) return;
    if (this.finale && !this.finale.boss) return; // the final boss is still to come
    this.setMode('outro');
    this.outcome = 'victory';
    this.outcomeAt = VICTORY_DELAY;
    this.hud.clearHint();
    this.hud.showBoss(false);
    this.soundFX.playLevelClear();
    this.soundFX.music.play(LEVEL_MOODS[this.chapter!.level] ?? MOODS.title);
    const boss = this.finale?.boss ?? this.enemies.find((e) => e.isBoss);
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
    const s = this.combatSystem.stats;
    const minutes = Math.floor(this.fightTime / 60);
    const seconds = Math.floor(this.fightTime % 60).toString().padStart(2, '0');
    $('cleared-kicker').textContent = next ? `Chapter ${chapter.numeral} complete` : 'The campaign is complete';
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
    this.horde = null;
    this.finale = null;
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
    const playerControl = acting;

    if (playerControl) player.handleInput(dt, this.sceneManager.viewYaw, this.enemies);
    else player.updateProceduralAnimations(dt, 0);
    // Enemies still hidden (a boss whose model is loading) wait.
    if (acting || this.mode === 'over') this.enemies.forEach((enemy) => { if (enemy.group.visible) enemy.updateAI(dt, player); });

    // Low in a slide he passes between and under enemies instead of stopping against them.
    separateFighters([player, ...this.enemies].filter((f) => f.motor).map((f) => ({
      position: f.group.position, radius: f.motor!.radius,
      solid: f.stateMachine.currentState !== 'DEAD' && !(f === player && player.isEvading()),
    })));

    player.update(dt);
    this.enemies.forEach((enemy) => enemy.update(dt));

    if (acting || this.mode === 'over') {
      this.combatSystem.update(player, this.enemies, dt);
      this.projectileManager.update(dt, player, this.enemies);
    }
    this.recoverFalls();
    if (this.mode === 'play') {
      this.fightTime += dt;
      this.updateHorde(dt);
      this.updateFinale();
    }
  }

  private simulating(): boolean {
    return !this.paused && (this.inFight() || this.mode === 'over');
  }

  private simulatedObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = this.enemies.map((e) => e.group);
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
      this.particleFX.update(FIXED_DT);
    }
    this.paused = true;
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
        // Hold to skip.
        this.skipHeld = this.inputManager.skipHeld() ? this.skipHeld + dt : 0;
        const show = this.skipHeld > 0 || this.modeTime > 2.5;
        this.cinema.skip(Math.min(1, this.skipHeld / SKIP_HOLD), show);
        if (this.skipHeld >= SKIP_HOLD) {
          this.skipHeld = 0;
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
        this.checkOutcome();
        break;
      case 'outro':
      case 'over':
        this.outcomeAt -= dt;
        if (this.outcomeAt <= 0 && this.screens.empty) {
          if (this.mode === 'outro') this.mode = 'over';
          this.showOutcome();
          this.outcomeAt = Infinity;
        }
        break;
      default:
        break;
    }
  }

  private updateHints(): void {
    if (this.hintIndex >= FIRST_FIGHT_HINTS.length) return;
    const [at, text] = FIRST_FIGHT_HINTS[this.hintIndex];
    if (this.fightTime < at) return;
    this.hud.hint(text, 6);
    this.hintIndex++;
    if (this.hintIndex >= FIRST_FIGHT_HINTS.length) this.hintsShown = true;
  }
}

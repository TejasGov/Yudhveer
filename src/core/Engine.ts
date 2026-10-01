import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { PhysicsWorld } from './PhysicsWorld';
import { InputManager } from './InputManager';
import { LevelManager } from '../levels/LevelManager';
import { disposeObject } from '../levels/GLBLevel';
import { ParticleFX } from '../combat/ParticleFX';
import { SoundFX } from '../combat/SoundFX';
import { CombatSystem } from '../combat/CombatSystem';
import { ProjectileManager } from '../combat/ProjectileManager';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { MercenaryGrunt } from '../entities/MercenaryGrunt';
import { SpearWarrior } from '../entities/SpearWarrior';
import { KatarRogue } from '../entities/KatarRogue';
import { ChakramThrower } from '../entities/ChakramThrower';
import { BossMahayodha } from '../entities/BossMahayodha';
import { BossBaoli } from '../entities/BossBaoli';
import { YODHA } from '../entities/characters/Yodha';
import { LEVEL1_BOSS } from '../entities/characters/Level1Boss';
import type { Character } from '../entities/Character';
import { separateFighters } from '../physics/CharacterMotor';

// Capsules: half-height of the cylinder part and radius (metres); the feet sit at the capsule's bottom.
const FIGHTER_CAPSULE = { halfHeight: 0.55, radius: 0.4 };
const BOSS_CAPSULE = { halfHeight: 0.75, radius: 0.55 };

// Gameplay and physics advance in fixed 60 Hz steps; rendering interpolates between the last two steps.
const FIXED_DT = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;

interface InterpolatedTransform {
  prevPos: THREE.Vector3;
  prevQuat: THREE.Quaternion;
  currPos: THREE.Vector3;
  currQuat: THREE.Quaternion;
}

export class Engine {
  public sceneManager: SceneManager;
  public physicsWorld: PhysicsWorld;
  public inputManager: InputManager;
  public levelManager: LevelManager;
  public particleFX: ParticleFX;
  public soundFX: SoundFX;
  public combatSystem: CombatSystem;
  public projectileManager: ProjectileManager;

  public player: Player | null = null;
  public enemies: Enemy[] = [];

  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
  private interpolated = new Map<THREE.Object3D, InterpolatedTransform>();
  private fpsCounter = 0;
  private fpsTimer = 0;
  private levelClearTriggered = false;

  constructor() {
    this.sceneManager = SceneManager.getInstance();
    this.physicsWorld = PhysicsWorld.getInstance();
    this.inputManager = InputManager.getInstance();
    this.levelManager = LevelManager.getInstance();
    this.particleFX = ParticleFX.getInstance();
    this.soundFX = SoundFX.getInstance();
    this.combatSystem = CombatSystem.getInstance();
    this.projectileManager = ProjectileManager.getInstance();
  }

  public async init(container: HTMLElement): Promise<void> {
    console.log('[Engine] Initializing Yudhveer Game Engine...');

    this.sceneManager.mount(container);
    await this.physicsWorld.init();

    this.particleFX.init(this.sceneManager.scene);
    this.projectileManager.init(this.sceneManager.scene);
    this.levelManager.init(this.sceneManager.scene);

    // The level streams in behind the loading veil; its temporary floor keeps everyone standing meanwhile.
    const levelReady = this.levelManager.loadLevel(1);
    const spawn = this.levelManager.activeLevel!.playerSpawn;

    // Spawn Player
    this.player = new Player();
    this.addFighter(this.player, spawn, FIGHTER_CAPSULE);
    this.player.onCharged = () => this.combatSystem.showCombatBanner('SHAKTI!', 'NEXT 3 BLOWS EMPOWERED', 'text-yellow-300 gold-glow');
    // The animated protagonist streams in and replaces the greybox when ready.
    this.player.attachRig(YODHA).catch((err) => console.error('[Engine] Yodha failed to load; keeping the greybox', err));

    // Spawn initial Level 1 enemies
    this.spawnLevelEnemies(1);

    this.setupUIHandlers(container);

    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));

    console.log('[Engine] Loop started (fixed 60 Hz simulation, interpolated rendering)');
    await levelReady.catch((err) => console.error('[Engine] Level 1 failed to load', err));
  }

  public spawnLevelEnemies(levelIndex: number): void {
    // Clear existing enemies & ribbons
    this.enemies.forEach((enemy) => {
      this.sceneManager.scene.remove(enemy.group);
      this.sceneManager.scene.remove(enemy.slashRibbon.mesh);
      enemy.detachPhysics();
      if (enemy.rigidBody) this.physicsWorld.removeBody(enemy.rigidBody);
      disposeObject(enemy.group);
      disposeObject(enemy.slashRibbon.mesh);
    });
    this.enemies = [];
    this.projectileManager.clear();
    this.levelClearTriggered = false;
    this.interpolated.clear();

    if (levelIndex === 1) {
      // Level 1: Baoli Guardian Boss with All-/NPC-only animations
      const boss = new BossBaoli('baoli_guardian');
      boss.slashRibbon.setColor(0xd4af37);
      this.addFighter(boss, new THREE.Vector3(0, 0, -4.2), BOSS_CAPSULE);
      boss.attachRig(LEVEL1_BOSS).catch((err) => console.error('[Engine] Level 1 Boss rig failed to load', err));
      this.enemies.push(boss);
    } else if (levelIndex === 2) {
      // Level 2: Agile Katar Rogue & Chakram Thrower
      const katar = new KatarRogue('katar_rogue_1');
      this.addFighter(katar, new THREE.Vector3(2.5, 0, -2.8), FIGHTER_CAPSULE);

      const chakram = new ChakramThrower('chakram_thrower_1');
      this.addFighter(chakram, new THREE.Vector3(-3.2, 0, -5.5), FIGHTER_CAPSULE);

      this.enemies.push(katar, chakram);
    } else if (levelIndex === 3) {
      // Level 3: Grandmaster Mahayodha Boss
      const boss = new BossMahayodha('boss_mahayodha');
      boss.slashRibbon.setColor(0xff3300);
      this.addFighter(boss, new THREE.Vector3(0, 0, -4.5), BOSS_CAPSULE);

      this.enemies.push(boss);
    }
  }

  private setupUIHandlers(container: HTMLElement): void {
    const startOverlay = document.getElementById('start-overlay');
    const levelSelect = document.getElementById('level-select') as HTMLSelectElement;
    const glbBtn = document.getElementById('glb-loader-btn');
    const glbModal = document.getElementById('glb-modal');
    const glbClose = document.getElementById('glb-modal-close');
    const audioBtn = document.getElementById('audio-toggle-btn');
    const btnLoadPlayerGLB = document.getElementById('btn-load-player-glb');
    const btnLoadLevelGLB = document.getElementById('btn-load-level-glb');
    const inputPlayerGLB = document.getElementById('glb-player-url') as HTMLInputElement;
    const inputLevelGLB = document.getElementById('glb-level-url') as HTMLInputElement;

    if (startOverlay) {
      startOverlay.addEventListener('click', () => {
        this.soundFX.init();
        this.inputManager.requestPointerLock(container);
      });
    }

    this.inputManager.onPointerLockChange = (locked) => {
      if (startOverlay) {
        startOverlay.style.opacity = locked ? '0' : '1';
        startOverlay.style.pointerEvents = locked ? 'none' : 'auto';
      }
    };

    if (levelSelect) {
      levelSelect.addEventListener('change', (e) => {
        const val = parseInt((e.target as HTMLSelectElement).value, 10);
        this.switchLevel(val);
        levelSelect.blur(); // don't let the focused dropdown swallow movement keys
      });
    }

    // Level hotkeys work mid-fight too, when the pointer is locked and the dropdown can't be clicked.
    const levelKeys: Record<string, number> = { Digit1: 1, Digit2: 2, Digit3: 3, Numpad1: 1, Numpad2: 2, Numpad3: 3 };
    window.addEventListener('keydown', (e) => {
      if (e.repeat || (e.target instanceof Element && e.target.closest('input, textarea, select'))) return;
      const level = levelKeys[e.code];
      if (level) this.switchLevel(level);
    });

    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const muted = this.soundFX.toggleMute();
        audioBtn.textContent = muted ? '🔇' : '🔊';
      });
    }

    if (glbBtn && glbModal && glbClose) {
      glbBtn.addEventListener('click', () => {
        glbModal.classList.remove('hidden');
        this.inputManager.exitPointerLock();
      });
      glbClose.addEventListener('click', () => {
        glbModal.classList.add('hidden');
      });
    }

    if (btnLoadPlayerGLB && inputPlayerGLB) {
      btnLoadPlayerGLB.addEventListener('click', async () => {
        const url = inputPlayerGLB.value.trim();
        if (url && this.player) {
          btnLoadPlayerGLB.textContent = 'Loading...';
          const success = await this.player.loadGLBModel(url);
          btnLoadPlayerGLB.textContent = success ? 'Loaded ✓' : 'Failed ✗';
          setTimeout(() => { btnLoadPlayerGLB.textContent = 'Apply'; }, 2000);
        }
      });
    }

    if (btnLoadLevelGLB && inputLevelGLB) {
      btnLoadLevelGLB.addEventListener('click', async () => {
        const url = inputLevelGLB.value.trim();
        if (url) {
          btnLoadLevelGLB.textContent = 'Loading...';
          const success = await this.levelManager.loadGLBModel(url);
          btnLoadLevelGLB.textContent = success ? 'Loaded ✓' : 'Failed ✗';
          setTimeout(() => { btnLoadLevelGLB.textContent = 'Apply'; }, 2000);
        }
      });
    }
  }

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
    fighter.attachPhysics(body, collider, footOffset);
    this.sceneManager.scene.add(fighter.group);
    this.sceneManager.scene.add(fighter.slashRibbon.mesh);
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
    for (const enemy of this.enemies) {
      if (enemy.getPosition().y < level.killPlaneY && enemy.stateMachine.currentState !== 'DEAD') {
        enemy.currentHealth = 0;
        enemy.stateMachine.changeState('DEAD');
      }
    }
  }

  public async switchLevel(levelIndex: number): Promise<void> {
    const levelReady = this.levelManager.loadLevel(levelIndex);
    this.spawnLevelEnemies(levelIndex);
    if (this.player) {
      const spawn = this.levelManager.activeLevel!.playerSpawn;
      this.player.setPosition(spawn.x, spawn.y, spawn.z);
      this.player.currentHealth = this.player.maxHealth;
      this.player.currentMarma = 0;
      this.player.stateMachine.reset(); // also revives a dead player
      this.player.updateHUD();
    }
    await levelReady.catch((err) => console.error(`[Engine] Level ${levelIndex} failed to load`, err));
  }

  /**
   * Check for wall kicks off the active level's pillars
   */
  private checkWallKick(): void {
    const pillars = this.levelManager.activeLevel?.wallKickPoints;
    if (!this.player || !pillars || pillars.length === 0) return;

    const pPos = this.player.getPosition();
    for (const pillarPos of pillars) {
      const dist = pPos.distanceTo(pillarPos);
      if (dist < 1.8 && this.player.stateMachine.currentState === 'DODGE_ROLL' && this.player.stateMachine.stateTime < 0.1) {
        // Wall-kick boost!
        const kickDir = new THREE.Vector3().subVectors(pPos, pillarPos).normalize();
        this.player.dodgeDirection.copy(kickDir);
        this.player.dodgeSpeed = 16.0;
        this.soundFX.playWallKick();
        this.particleFX.spawnDeflectionShockwave(pPos);
        break;
      }
    }
  }

  /**
   * Check if all enemies in the current level are defeated
   */
  private checkLevelProgression(): void {
    if (this.levelClearTriggered || this.enemies.length === 0) return;

    const allDead = this.enemies.every((e) => e.stateMachine.currentState === 'DEAD' || e.currentHealth <= 0);
    if (allDead) {
      this.levelClearTriggered = true;
      this.soundFX.playLevelClear();

      const nextLevel = (this.levelManager.currentLevelIndex % 3) + 1;
      const isFinal = this.levelManager.currentLevelIndex === 3;

      if (isFinal) {
        this.combatSystem.showCombatBanner('VICTORY ACHIEVED!', 'GRANDMASTER DEFEATED • CHAMPION OF YUDHVEER', 'text-yellow-300 gold-glow');
      } else {
        this.combatSystem.showCombatBanner('LEVEL CLEARED!', `ADVANCING TO LEVEL ${nextLevel}...`, 'text-emerald-400');
        setTimeout(() => {
          this.switchLevel(nextLevel);
        }, 3000);
      }
    }
  }

  /** One fixed simulation step: physics, input, AI, combat and projectiles. */
  private fixedUpdate(dt: number): void {
    this.physicsWorld.step(dt);
    if (!this.player) return;

    // 1. Intent: input and AI move everyone freely.
    this.player.handleInput(dt, this.sceneManager.cameraYaw);
    this.checkWallKick();
    this.enemies.forEach((enemy) => enemy.updateAI(dt, this.player!.getPosition()));

    // 2. Fighters push apart instead of overlapping (corpses don't block).
    separateFighters([this.player, ...this.enemies].filter((f) => f.motor).map((f) => ({
      position: f.group.position, radius: f.motor!.radius, solid: f.stateMachine.currentState !== 'DEAD',
    })));

    // 3. Resolve: states and animation, then each motor collides, steps and applies gravity.
    this.player.update(dt);
    this.enemies.forEach((enemy) => enemy.update(dt));

    this.combatSystem.update(this.player, this.enemies);
    this.projectileManager.update(dt, this.player);
    this.recoverFalls();
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

  /** Blends characters between the last two simulation states for this frame's render. */
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

  private gameLoop(time: number): void {
    if (!this.isRunning) return;

    requestAnimationFrame(this.gameLoop.bind(this));

    const rawDt = Math.min((time - this.lastTime) / 1000, 0.25);
    this.lastTime = time;

    // Hit-stop / slow motion scales simulated time, not the frame rate.
    const effectiveDt = rawDt * this.combatSystem.globalTimeScale;

    // 1. Fixed-step simulation
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

    // 2. Interpolated presentation
    this.applyInterpolation(this.accumulator / FIXED_DT);

    if (this.player) {
      const mouse = this.inputManager.consumeMouseDelta();
      this.sceneManager.updateCamera(this.player.getPosition(), mouse.x, mouse.y, rawDt);
    }

    this.particleFX.update(effectiveDt);
    this.levelManager.update(time * 0.001, effectiveDt, this.sceneManager.camera);

    // 3. Level clear / progression check
    this.checkLevelProgression();

    // 4. Render through the post chain, then hand the true simulation state back to gameplay
    this.sceneManager.render(rawDt);
    this.restoreSimulationState();

    // 5. FPS Counter
    this.fpsCounter++;
    this.fpsTimer += rawDt;
    if (this.fpsTimer >= 1.0) {
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) fpsEl.textContent = `${this.fpsCounter} FPS`;
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }
  }
}

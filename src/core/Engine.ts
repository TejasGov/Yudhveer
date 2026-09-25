import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { PhysicsWorld } from './PhysicsWorld';
import { InputManager } from './InputManager';
import { LevelManager } from '../levels/LevelManager';
import { Level1_Baoli } from '../levels/Level1_Baoli';
import { Level2_Mandapa } from '../levels/Level2_Mandapa';
import { Level3_Sanctum } from '../levels/Level3_Sanctum';
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

    // Spawn Player
    this.player = new Player();
    this.player.setPosition(0, 0, 4.0);
    this.sceneManager.scene.add(this.player.group);

    const playerCapsule = this.physicsWorld.createCharacterCapsule(
      new THREE.Vector3(0, 0.9, 4.0),
      0.55,
      0.4,
      true
    );
    this.player.rigidBody = playerCapsule.body;
    this.player.collider = playerCapsule.collider;

    // Spawn initial Level 1 enemies
    this.spawnLevelEnemies(1);

    this.setupUIHandlers(container);

    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));

    console.log('[Engine] Ready & Loop Started at 60 FPS');
  }

  public spawnLevelEnemies(levelIndex: number): void {
    // Clear existing enemies
    this.enemies.forEach((enemy) => {
      this.sceneManager.scene.remove(enemy.group);
    });
    this.enemies = [];
    this.projectileManager.clear();
    this.levelClearTriggered = false;

    // Atmosphere update
    this.sceneManager.setLevelAtmosphere(levelIndex);

    if (levelIndex === 1) {
      // Level 1: Mercenary Grunt & Spear Duo
      const grunt = new MercenaryGrunt('merc_grunt_1');
      grunt.setPosition(2.2, 0, -3.2);
      this.sceneManager.scene.add(grunt.group);
      const gruntCapsule = this.physicsWorld.createCharacterCapsule(new THREE.Vector3(2.2, 0.9, -3.2), 0.55, 0.4, true);
      grunt.rigidBody = gruntCapsule.body;
      grunt.collider = gruntCapsule.collider;

      const spear = new SpearWarrior('spear_warrior_1');
      spear.setPosition(-2.2, 0, -3.8);
      this.sceneManager.scene.add(spear.group);
      const spearCapsule = this.physicsWorld.createCharacterCapsule(new THREE.Vector3(-2.2, 0.9, -3.8), 0.55, 0.4, true);
      spear.rigidBody = spearCapsule.body;
      spear.collider = spearCapsule.collider;

      this.enemies.push(grunt, spear);
    } else if (levelIndex === 2) {
      // Level 2: Agile Katar Rogue & Chakram Thrower
      const katar = new KatarRogue('katar_rogue_1');
      katar.setPosition(2.5, 0, -2.8);
      this.sceneManager.scene.add(katar.group);
      const katarCapsule = this.physicsWorld.createCharacterCapsule(new THREE.Vector3(2.5, 0.9, -2.8), 0.55, 0.4, true);
      katar.rigidBody = katarCapsule.body;
      katar.collider = katarCapsule.collider;

      const chakram = new ChakramThrower('chakram_thrower_1');
      chakram.setPosition(-3.2, 0, -5.5);
      this.sceneManager.scene.add(chakram.group);
      const chakramCapsule = this.physicsWorld.createCharacterCapsule(new THREE.Vector3(-3.2, 0.9, -5.5), 0.55, 0.4, true);
      chakram.rigidBody = chakramCapsule.body;
      chakram.collider = chakramCapsule.collider;

      this.enemies.push(katar, chakram);
    } else if (levelIndex === 3) {
      // Level 3: Grandmaster Mahayodha Boss
      const boss = new BossMahayodha('boss_mahayodha');
      boss.setPosition(0, 0, -4.5);
      this.sceneManager.scene.add(boss.group);
      const bossCapsule = this.physicsWorld.createCharacterCapsule(new THREE.Vector3(0, 1.2, -4.5), 0.75, 0.55, true);
      boss.rigidBody = bossCapsule.body;
      boss.collider = bossCapsule.collider;

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
      });
    }

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

  public switchLevel(levelIndex: number): void {
    this.levelManager.loadLevel(levelIndex);
    this.spawnLevelEnemies(levelIndex);
    if (this.player) {
      this.player.setPosition(0, 0, 4.0);
      this.player.currentHealth = this.player.maxHealth;
      this.player.currentMarma = 0;
      this.player.stateMachine.changeState('IDLE');
    }
  }

  /**
   * Check for wall kicks on temple pillars in Level 2 Mandapa
   */
  private checkWallKick(): void {
    if (!this.player || this.levelManager.currentLevelIndex !== 2) return;
    const mandapa = this.levelManager.activeLevelInstance as Level2_Mandapa;
    if (!mandapa || !mandapa.wallKickPillars) return;

    const pPos = this.player.getPosition();
    for (const pillarPos of mandapa.wallKickPillars) {
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

  private gameLoop(time: number): void {
    if (!this.isRunning) return;

    requestAnimationFrame(this.gameLoop.bind(this));

    const rawDt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    const effectiveDt = rawDt * this.combatSystem.globalTimeScale;

    // 1. Step Physics
    this.physicsWorld.step(effectiveDt);

    // 2. Update Player
    if (this.player) {
      this.player.handleInput(effectiveDt, this.sceneManager.cameraYaw);
      this.player.update(effectiveDt);
      this.checkWallKick();

      // 3. Update Enemies
      this.enemies.forEach((enemy) => {
        enemy.updateAI(effectiveDt, this.player!.getPosition());
        enemy.update(effectiveDt);
      });

      // 4. Combat collisions & Hit registration
      this.combatSystem.update(this.player, this.enemies);

      // 5. Update Projectiles (Chakrams & Flame Waves)
      this.projectileManager.update(effectiveDt, this.player);

      // 6. Update Camera
      const input = this.inputManager.getState();
      this.sceneManager.updateCamera(
        this.player.getPosition(),
        input.mouseXDelta,
        input.mouseYDelta,
        rawDt
      );
    }

    // 7. Ambient Particle FX by Level
    if (this.levelManager.currentLevelIndex === 1) {
      if (Math.random() < 0.2) this.particleFX.spawnMist(14);
    } else if (this.levelManager.currentLevelIndex === 3) {
      const sanctum = this.levelManager.activeLevelInstance as Level3_Sanctum;
      if (sanctum && sanctum.brazierPositions) {
        sanctum.brazierPositions.forEach((pos) => {
          this.particleFX.spawnFlames(pos, 2, 0.4);
        });
      }
    }

    this.particleFX.update(effectiveDt);
    this.levelManager.update(time * 0.001);

    // 8. Level clear / progression check
    this.checkLevelProgression();

    // 9. Render Scene
    this.sceneManager.render();

    // 10. FPS Counter
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

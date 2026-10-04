import * as THREE from 'three';
import { GLBLevel } from './GLBLevel';
import { Level1_Baoli } from './Level1_Baoli';
import { Level2_Akhada } from './Level2_Akhada';
import { Level3_Dwarka } from './Level3_Dwarka';
import { Level4_Summit } from './Level4_Summit';
import type { GameLevel, LevelAtmosphere } from './LevelTypes';
import { SceneManager } from '../core/SceneManager';

const LEVELS: Record<number, () => GameLevel> = {
  1: () => new Level1_Baoli(),
  2: () => new Level2_Akhada(),
  3: () => new Level3_Dwarka(),
  4: () => new Level4_Summit(),
};

/** Any Blender GLB swapped in from the dev console (`__yudhveer.levelManager.loadGLBModel(url)`), lit like the level it replaces. */
class CustomGLBLevel extends GLBLevel {
  public readonly id = 0;
  public readonly title = 'Custom GLB Arena';
  public readonly subtitle: string;
  public readonly atmosphere: LevelAtmosphere;

  constructor(url: string, atmosphere: LevelAtmosphere) {
    super(url);
    this.subtitle = `Imported: ${url}`;
    // Borrow lighting and grading, but not textures owned (and about to be disposed) by the old level.
    this.atmosphere = { ...atmosphere, background: new THREE.Color(0x0a0d14), environment: null };
  }

  protected prepareModel(model: THREE.Object3D): void {
    let hasCollider = false;
    model.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) obj.castShadow = obj.receiveShadow = true;
      if (obj.userData.collider && obj.userData.collider !== 'none') hasCollider = true;
    });
    // Untagged GLBs get the old hot-swap behaviour: a 40 m floor slab at y = 0.
    if (!hasCollider) this.addStaticBox(new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(20, 0.5, 20));
    this.collectBloom(model);
  }
}

export class LevelManager {
  private static instance: LevelManager | null = null;
  public scene: THREE.Scene | null = null;
  public activeLevel: GameLevel | null = null;
  public currentLevelIndex = 1;
  private loadToken = 0;
  private ready = false;
  private sceneManager = SceneManager.getInstance();

  private constructor() {}

  public static getInstance(): LevelManager {
    if (!LevelManager.instance) {
      LevelManager.instance = new LevelManager();
    }
    return LevelManager.instance;
  }

  public init(scene: THREE.Scene): void {
    this.scene = scene;
  }

  /**
   * Swaps to level `levelIndex`. Resolves once it is loaded, lit and graded; a newer call supersedes it.
   * `onProgress` reports the download (0..1).
   */
  public loadLevel(levelIndex: number, onProgress?: (fraction: number) => void): Promise<GameLevel> {
    const make = LEVELS[levelIndex] ?? LEVELS[1];
    this.currentLevelIndex = LEVELS[levelIndex] ? levelIndex : 1;
    return this.activate(make(), onProgress);
  }

  /** Whether level `levelIndex` is the one loaded and ready. */
  public isLoaded(levelIndex: number): boolean {
    return this.ready && this.activeLevel?.id === levelIndex;
  }

  /** Hot-swaps the arena for an arbitrary GLB, keeping the current level's lighting. */
  public async loadGLBModel(path: string): Promise<boolean> {
    if (!this.activeLevel) return false;
    try {
      await this.activate(new CustomGLBLevel(path, this.activeLevel.atmosphere));
      return true;
    } catch (err) {
      console.warn(`[LevelManager] Failed to load GLB level: ${path}`, err);
      return false;
    }
  }

  private async activate(level: GameLevel, onProgress?: (fraction: number) => void): Promise<GameLevel> {
    if (!this.scene) throw new Error('LevelManager not initialised');
    const token = ++this.loadToken;

    // Unload first so two levels' textures and colliders never coexist on the GPU / in Rapier.
    this.unloadActive();
    this.ready = false;
    this.activeLevel = level;
    this.scene.add(level.group);
    onProgress?.(0);

    await level.load((f) => { if (token === this.loadToken) onProgress?.(f); });
    if (token !== this.loadToken) return level; // superseded; the newer load already disposed it

    this.sceneManager.applyAtmosphere(level.atmosphere);
    this.sceneManager.postFX.setBloomObjects(level.bloomObjects);
    this.ready = true;
    console.log(`[LevelManager] Loaded ${level.title}`);
    return level;
  }

  private unloadActive(): void {
    if (!this.activeLevel) return;
    this.sceneManager.postFX.setBloomObjects([]);
    this.sceneManager.clearAtmosphere();
    this.activeLevel.dispose();
    this.activeLevel = null;
  }

  public update(time: number, dt: number, camera: THREE.Camera): void {
    this.activeLevel?.update(time, dt, camera);
  }
}

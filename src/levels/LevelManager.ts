import * as THREE from 'three';
import { GLBLevel } from './GLBLevel';
import { Level1_Baoli } from './Level1_Baoli';
import { Level2_Akhada } from './Level2_Akhada';
import { Level3_Summit } from './Level3_Summit';
import type { GameLevel, LevelAtmosphere } from './LevelTypes';
import { SceneManager } from '../core/SceneManager';

const LEVELS: Record<number, () => GameLevel> = {
  1: () => new Level1_Baoli(),
  2: () => new Level2_Akhada(),
  3: () => new Level3_Summit(),
};

/** Any Blender GLB dropped in through the GLB SWAP panel, lit like the level it replaces. */
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

  /** Swaps to level `levelIndex`. Resolves once it is loaded, lit and graded; a newer call supersedes it. */
  public loadLevel(levelIndex: number): Promise<GameLevel> {
    const make = LEVELS[levelIndex] ?? LEVELS[1];
    this.currentLevelIndex = LEVELS[levelIndex] ? levelIndex : 1;
    return this.activate(make());
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

  private async activate(level: GameLevel): Promise<GameLevel> {
    if (!this.scene) throw new Error('LevelManager not initialised');
    const token = ++this.loadToken;

    // Unload first so two levels' textures and colliders never coexist on the GPU / in Rapier.
    this.unloadActive();
    this.activeLevel = level;
    this.scene.add(level.group);
    this.showLoading(level.title, 0);

    try {
      await level.load((f) => { if (token === this.loadToken) this.showLoading(level.title, f); });
    } catch (err) {
      if (token === this.loadToken) this.showLoading(`Failed to load ${level.title}`, 1, true);
      throw err;
    }
    if (token !== this.loadToken) return level; // superseded; the newer load already disposed it

    this.sceneManager.applyAtmosphere(level.atmosphere);
    this.sceneManager.postFX.setBloomObjects(level.bloomObjects);
    this.updateLevelUI(level);
    this.hideLoading();
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

  private updateLevelUI(level: GameLevel): void {
    const titleEl = document.getElementById('level-title');
    const subEl = document.getElementById('level-subtitle');
    const letterboxTitle = document.getElementById('level-title-top');
    const levelSelect = document.getElementById('level-select') as HTMLSelectElement | null;
    if (titleEl) titleEl.textContent = level.title;
    if (subEl) subEl.textContent = level.subtitle;
    if (letterboxTitle) letterboxTitle.textContent = level.title.toUpperCase();
    if (levelSelect && level.id > 0) levelSelect.value = level.id.toString();
  }

  private showLoading(title: string, fraction: number, failed = false): void {
    const veil = document.getElementById('level-loading');
    const label = document.getElementById('level-loading-title');
    const bar = document.getElementById('level-loading-bar');
    veil?.classList.remove('hidden');
    veil?.classList.add('flex');
    if (label) label.textContent = title.toUpperCase();
    if (bar) {
      bar.style.width = `${Math.round(fraction * 100)}%`;
      bar.classList.toggle('bg-red-600', failed);
    }
  }

  private hideLoading(): void {
    const veil = document.getElementById('level-loading');
    veil?.classList.add('hidden');
    veil?.classList.remove('flex');
  }
}

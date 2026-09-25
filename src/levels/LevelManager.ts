import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Level1_Baoli } from './Level1_Baoli';
import { Level2_Mandapa } from './Level2_Mandapa';
import { Level3_Sanctum } from './Level3_Sanctum';
import { PhysicsWorld } from '../core/PhysicsWorld';

export class LevelManager {
  private static instance: LevelManager | null = null;
  public scene: THREE.Scene | null = null;
  public currentLevelGroup: THREE.Group | null = null;
  public currentLevelIndex = 1;
  public activeLevelInstance: Level1_Baoli | Level2_Mandapa | Level3_Sanctum | null = null;
  private physicsWorld: PhysicsWorld;

  public levelData = [
    {
      id: 1,
      title: 'Level 1: The Moonlit Baoli',
      subtitle: 'Submerged Stepped Ghat • Mercenary Grunt & Spear Duo'
    },
    {
      id: 2,
      title: 'Level 2: Mandapa of Pillars',
      subtitle: 'Ancient Temple Hypostyle • Agile Katar Rogues & Chakrams'
    },
    {
      id: 3,
      title: 'Level 3: Garbhagriha Sanctum',
      subtitle: 'Inner Sacred Sanctum • Grandmaster Mahayodha (Agni Duel)'
    }
  ];

  private constructor() {
    this.physicsWorld = PhysicsWorld.getInstance();
  }

  public static getInstance(): LevelManager {
    if (!LevelManager.instance) {
      LevelManager.instance = new LevelManager();
    }
    return LevelManager.instance;
  }

  public init(scene: THREE.Scene): void {
    this.scene = scene;
    this.loadLevel(1);
  }

  public loadLevel(levelIndex: number): void {
    if (!this.scene) return;

    if (this.currentLevelGroup) {
      this.scene.remove(this.currentLevelGroup);
      this.currentLevelGroup.traverse((child) => {
        if ((child as THREE.Mesh).geometry) {
          (child as THREE.Mesh).geometry.dispose();
        }
      });
    }

    this.currentLevelIndex = levelIndex;

    if (levelIndex === 2) {
      this.activeLevelInstance = new Level2_Mandapa();
    } else if (levelIndex === 3) {
      this.activeLevelInstance = new Level3_Sanctum();
    } else {
      this.activeLevelInstance = new Level1_Baoli();
    }

    this.currentLevelGroup = this.activeLevelInstance.group;
    this.scene.add(this.currentLevelGroup);

    // Update level banner UI
    const info = this.levelData.find((l) => l.id === levelIndex) || this.levelData[0];
    const titleEl = document.getElementById('level-title');
    const subEl = document.getElementById('level-subtitle');
    const levelSelect = document.getElementById('level-select') as HTMLSelectElement;

    if (titleEl) titleEl.textContent = info.title;
    if (subEl) subEl.textContent = info.subtitle;
    if (levelSelect) levelSelect.value = levelIndex.toString();

    console.log(`[LevelManager] Loaded ${info.title}`);
  }

  public update(time: number): void {
    if (this.activeLevelInstance instanceof Level1_Baoli) {
      this.activeLevelInstance.update(time);
    }
  }

  /**
   * Hot-swappable custom GLB level loader
   */
  public async loadGLBModel(path: string): Promise<boolean> {
    if (!this.scene) return false;
    const loader = new GLTFLoader();

    return new Promise((resolve) => {
      loader.load(
        path,
        (gltf) => {
          if (this.currentLevelGroup) {
            this.scene!.remove(this.currentLevelGroup);
          }

          const model = gltf.scene;
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          this.currentLevelGroup = model;
          this.scene!.add(this.currentLevelGroup);

          this.physicsWorld.createStaticBox(
            new THREE.Vector3(0, -0.5, 0),
            new THREE.Vector3(20, 0.5, 20)
          );

          const titleEl = document.getElementById('level-title');
          const subEl = document.getElementById('level-subtitle');
          if (titleEl) titleEl.textContent = 'Custom GLB Arena';
          if (subEl) subEl.textContent = `Imported: ${path}`;

          resolve(true);
        },
        undefined,
        (err) => {
          console.warn(`[LevelManager] Failed to load GLB level: ${path}`, err);
          resolve(false);
        }
      );
    });
  }
}

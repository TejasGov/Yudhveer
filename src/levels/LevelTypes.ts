import * as THREE from 'three';
import type { ArenaBounds } from './ArenaBounds';

/** Screen-space comic ink lines (Level 2). Distances are metres in view space. */
export interface InkOutlineSettings {
  color: number;
  thickness: number;
  /** Relative depth discontinuity that starts an ink line. */
  threshold: number;
  /** Lines fade out between these view distances so the far forest does not turn black. */
  fadeNear: number;
  fadeFar: number;
}

/**
 * Everything the SceneManager and PostFX need to light and grade a level.
 * Levels own the textures they reference here and dispose them in `dispose()`.
 */
export interface LevelAtmosphere {
  background: THREE.Color | THREE.Texture;
  backgroundIntensity: number;
  environment: THREE.Texture | null;
  environmentIntensity: number;
  fog: { color: number; density: number };
  ambient: { color: number; intensity: number };
  hemi: { sky: number; ground: number; intensity: number };
  /** The single shadow-casting light; it follows the player along `direction` (towards the light). */
  key: { color: number; intensity: number; direction: THREE.Vector3 };
  exposure: number;
  bloom: { threshold: number; smoothing: number; intensity: number };
  vignette: { offset: number; darkness: number };
  ink: InkOutlineSettings | null;
}

export interface GameLevel {
  readonly id: number;
  readonly title: string;
  readonly subtitle: string;
  readonly group: THREE.Group;
  /** Valid once `load()` resolves; the level may refine it while loading (e.g. when a sky finishes). */
  readonly atmosphere: LevelAtmosphere;
  readonly playerSpawn: THREE.Vector3;
  /** Pillar centres the dodge-roll wall kick can push off. */
  readonly wallKickPoints: THREE.Vector3[];
  /** Emissive meshes (flames, lamps, lava, eclipse corona) that feed the selective bloom. */
  readonly bloomObjects: THREE.Object3D[];
  /** Arena walls keeping fighters in the fight, if the level defines them. */
  readonly bounds: ArenaBounds | null;
  /** Falling below this height (level coordinates) means out of the arena: the engine recovers the fighter. */
  readonly killPlaneY: number;
  load(onProgress?: (fraction: number) => void): Promise<void>;
  update(time: number, dt: number, camera: THREE.Camera): void;
  dispose(): void;
}

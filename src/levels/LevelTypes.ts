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
  /** Exponential fog (`density`), or linear fog from `near` to `far` metres. */
  fog: { color: number; density: number } | { color: number; near: number; far: number };
  ambient: { color: number; intensity: number };
  hemi: { sky: number; ground: number; intensity: number };
  /**
   * The single shadow-casting light; it follows the player along `direction` (towards the light). `normalBias`
   * fights shadow acne under a grazing (sunset) light.
   */
  key: { color: number; intensity: number; direction: THREE.Vector3; normalBias?: number };
  exposure: number;
  /** Tone curve: ACES filmic (default) or AgX (scenes authored in Blender's AgX view). */
  toneMapping?: 'aces' | 'agx';
  /** Orientation of the sky and its reflections (an HDR exported from Blender); identity when absent. */
  environmentRotation?: THREE.Euler;
  /** Camera clip planes for this level (default 0.1 / 1000 m); large seascapes need a further far plane. */
  clip?: { near: number; far: number };
  bloom: { threshold: number; smoothing: number; intensity: number };
  vignette: { offset: number; darkness: number };
  ink: InkOutlineSettings | null;
}

/** An authored camera from the level file: where it is, what it looks at, its lens. */
export interface CameraPose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

export interface GameLevel {
  readonly id: number;
  readonly title: string;
  readonly subtitle: string;
  readonly group: THREE.Group;
  /** Valid once `load()` resolves; the level may refine it while loading (e.g. when a sky finishes). */
  readonly atmosphere: LevelAtmosphere;
  readonly playerSpawn: THREE.Vector3;
  /** Emissive meshes (flames, lamps, lava, eclipse corona) that feed the selective bloom. */
  readonly bloomObjects: THREE.Object3D[];
  /** Arena walls keeping fighters in the fight, if the level defines them. */
  readonly bounds: ArenaBounds | null;
  /** Falling below this height (level coordinates) means out of the arena: the engine recovers the fighter. */
  readonly killPlaneY: number;
  /** An authored camera exported with the level, by name (cutscenes use them), or null. */
  cameraPose(name: string, lookDistance?: number): CameraPose | null;
  load(onProgress?: (fraction: number) => void): Promise<void>;
  update(time: number, dt: number, camera: THREE.Camera): void;
  dispose(): void;
}

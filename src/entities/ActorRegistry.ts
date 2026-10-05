import type * as THREE from 'three';
import type { Character } from './Character';

/**
 * Every character, by its scene group. Lets a level find who is standing in it (footfalls on wet ground, Dwarka) by
 * walking the scene's children, without the engine handing it lists. Weak: a character no one holds is let go.
 */
export const ACTORS = new WeakMap<THREE.Object3D, Character>();

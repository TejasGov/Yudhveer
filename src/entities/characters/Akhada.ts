import * as THREE from 'three';
import type { CharacterDefinition } from '../animation/CharacterRig';
import { BAOLI_GUARDIAN } from './BaoliGuardian';

/*
 * Chapter II's people (docs/STORY.md, "Chapter II"). Kept here so the swap for the real model is one file.
 */

/**
 * The old vanara mentor of the Hanuman akhada. PLACEHOLDER: the Baoli Guardian's model (hunched, heavy-shouldered,
 * which reads well enough as an old monkey-warrior at a distance) cut down to 1.6 m and dyed a grey-brown, his talwar
 * standing in for a practice blade. The user will replace him with a Meshy model: give it the same clip names, or
 * point `states` at its own, and both the sparring partner (`entities/Vanara.ts`) and the story's cast follow.
 * (The tint goes above 1 to lift the demon's near-black plate toward a weathered grey-brown.)
 */
export const MENTOR: CharacterDefinition = { ...BAOLI_GUARDIAN, scale: 0.5, tint: new THREE.Color(1.5, 1.38, 1.22) };

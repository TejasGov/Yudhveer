import * as THREE from 'three';
import { motes } from './DivineLight';
import { SceneFX } from './SceneFX';
import type { Extra } from '../entities/Extra';

/*
 * The dead speak as shades (docs/STORY.md, "How the dead speak"): a fallen character's last words come from a pale
 * blue spirit standing over the body (`CastMember.shade`), not from the body itself. The shade's own fade, rise and
 * flicker are in Extra; this adds what it gives off.
 */

/** The shades already giving off motes (one stream each, for the chapter). */
const haunting = new WeakSet<Extra>();

/**
 * Cold motes drifting up off a shade while it is there, as many as it is present: they thin as it fades and stop
 * when it is gone. Started the first time it appears in a played scene; stopped with the chapter's effects.
 */
export function haunt(parent: THREE.Object3D, shade: Extra): void {
  if (haunting.has(shade)) return;
  haunting.add(shade);
  const height = shade.visualHeight();
  const stream = motes(parent, {
    at: shade.getPosition(),
    radius: 0.18 * height,
    rate: 0,
    rise: 0.45 * height,
    life: 2.6,
    color: new THREE.Color(0.75, 1.15, 2.2),
  });
  SceneFX.every(() => {
    stream.at.copy(shade.getPosition());
    stream.rate = shade.group.visible ? 16 * shade.presence : 0;
  });
}

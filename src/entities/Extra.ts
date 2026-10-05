import * as THREE from 'three';
import { Character } from './Character';
import type { CharacterDefinition, CharacterRig } from './animation/CharacterRig';
import { addRimLight } from '../levels/environment/ToonRelight';

/**
 * One of a story's cast (`ChapterStory.cast`): a character in the scenes but not in the fight, such as the guru. It has
 * no body (fighters pass through it) and no AI: it stands, animates and goes where scene cues send it.
 */
export class Extra extends Character {
  /** Set before the rig loads: drawn as a black shape with a rim of this light (see `CastMember.silhouette`). */
  public silhouetteColor: THREE.ColorRepresentation | null = null;

  constructor(id: string) {
    super(id, 0x8a7560);
  }

  public override async attachRig(definition: CharacterDefinition): Promise<CharacterRig> {
    const rig = await super.attachRig(definition);
    if (this.silhouetteColor !== null) this.shadowed(rig, this.silhouetteColor);
    return rig;
  }

  /**
   * Every surface (the body and whatever it holds) black, with a hard rim of `color` round its edges: against a
   * bright sky only the outline reads. One material, so the rig's own are freed.
   */
  private shadowed(rig: CharacterRig, color: THREE.ColorRepresentation): void {
    const black = new THREE.MeshToonMaterial({ name: 'Silhouette', color: 0x000000 });
    // Only the very edge: a wider rim catches every fold of the body and starts to draw the face.
    addRimLight(black, { color, strength: 1.4, start: 0.86 });
    const old = new Set<THREE.Material>();
    rig.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => old.add(m));
      mesh.material = black;
      mesh.receiveShadow = false;
    });
    old.forEach((m) => m.dispose());
  }
}

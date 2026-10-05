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
  /** Set before the rig loads: drawn as a pale, see-through memory (see `CastMember.ghost`). */
  public ghost: { color: THREE.ColorRepresentation; opacity?: number } | null = null;

  constructor(id: string) {
    super(id, 0x8a7560);
  }

  public override async attachRig(definition: CharacterDefinition): Promise<CharacterRig> {
    const rig = await super.attachRig(definition);
    if (this.silhouetteColor !== null) this.shadowed(rig, this.silhouetteColor);
    else if (this.ghost) this.ghostly(rig, this.ghost.color, this.ghost.opacity ?? 0.3);
    return rig;
  }

  /**
   * Every surface washed in `color`, lit from within and see-through, with a bright rim: a figure remembered. Each
   * material keeps its texture (the face still reads); it writes depth, so the far side of the body does not show
   * through the near one. Casts no shadow.
   */
  private ghostly(rig: CharacterRig, color: THREE.ColorRepresentation, opacity: number): void {
    const made = new Map<THREE.Material, THREE.MeshToonMaterial>();
    const wash = (m: THREE.Material) => {
      let ghost = made.get(m);
      if (!ghost) {
        const map = (m as THREE.MeshStandardMaterial).map ?? null;
        ghost = new THREE.MeshToonMaterial({ name: 'Ghost', color, map, transparent: true, opacity });
        ghost.emissive.set(color).multiplyScalar(0.15);
        addRimLight(ghost, { color, strength: 1.3, start: 0.72 });
        made.set(m, ghost);
      }
      return ghost;
    };
    rig.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(wash) : wash(mesh.material);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    });
    // The textures stay with the ghost materials; only the old materials themselves go.
    made.forEach((_, m) => m.dispose());
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

import * as THREE from 'three';
import { Character } from './Character';
import type { CharacterDefinition, CharacterRig } from './animation/CharacterRig';
import { addRimLight } from '../levels/environment/ToonRelight';

/** A shade's opacity when wholly there (see `CastMember.shade`). */
const SHADE_OPACITY = 0.6;
/** How far a shade hovers off the ground, and how far below that it rises from as it comes (m). */
const SHADE_HOVER = 0.12;
const SHADE_RISE = 0.9;

/**
 * One of a story's cast (`ChapterStory.cast`): a character in the scenes but not in the fight, such as the guru. It has
 * no body (fighters pass through it) and no AI: it stands, animates and goes where scene cues send it.
 */
export class Extra extends Character {
  /** Set before the rig loads: drawn as a black shape with a rim of this light (see `CastMember.silhouette`). */
  public silhouetteColor: THREE.ColorRepresentation | null = null;
  /** Set before the rig loads: drawn as a pale, see-through memory (see `CastMember.ghost`). */
  public ghost: { color: THREE.ColorRepresentation; opacity?: number } | null = null;
  /** Set before the rig loads: the spirit of someone fallen, risen to speak over the body (see `CastMember.shade`). */
  public shade: { color: THREE.ColorRepresentation; opacity?: number } | null = null;
  /**
   * A shade's presence: 0 gone, 1 wholly there. It eases toward its target (`appear`); as it comes the shade rises out
   * of the ground to hover a hand's breadth up, and its see-through materials fade in with it.
   */
  public presence = 1;
  private presenceTarget = 1;
  private presenceRate = 0;
  /** The ghost materials and the opacity each has when wholly there. */
  private ghostMaterials: { material: THREE.Material; opacity: number }[] = [];
  /** Seconds a shade has been about (its breathing and flicker). */
  private haunting = 0;

  constructor(id: string) {
    super(id, 0x8a7560);
  }

  public override async attachRig(definition: CharacterDefinition): Promise<CharacterRig> {
    const rig = await super.attachRig(definition);
    if (this.silhouetteColor !== null) this.shadowed(rig, this.silhouetteColor);
    else if (this.shade) this.ghostly(rig, this.shade.color, this.shade.opacity ?? SHADE_OPACITY, 1.15, 1.2, 0.8);
    else if (this.ghost) this.ghostly(rig, this.ghost.color, this.ghost.opacity ?? 0.3);
    this.applyPresence();
    return rig;
  }

  /**
   * A shade comes (`show`) or goes over `seconds` (0: at once): it rises out of the ground as it fades in, and sinks
   * back as it fades out, hidden once it is gone. Anyone else is simply shown or hidden.
   */
  public appear(show: boolean, seconds: number): void {
    if (!this.shade) {
      this.group.visible = show;
      return;
    }
    this.presenceTarget = show ? 1 : 0;
    if (seconds <= 0) this.presence = this.presenceTarget;
    this.presenceRate = seconds > 0 ? 1 / seconds : 0;
    if (show) this.group.visible = true;
    this.applyPresence();
  }

  public override update(dt: number): void {
    super.update(dt);
    if (!this.shade) return;
    this.haunting += dt;
    if (this.presence !== this.presenceTarget) {
      const step = this.presenceRate * dt;
      this.presence = this.presence < this.presenceTarget
        ? Math.min(this.presenceTarget, this.presence + step)
        : Math.max(this.presenceTarget, this.presence - step);
    }
    this.applyPresence();
  }

  /** A shade's height off the ground, opacity and visibility, from its presence (and a slow breath and flicker). */
  private applyPresence(): void {
    if (!this.shade) return;
    const t = this.haunting;
    const k = this.presence * this.presence * (3 - 2 * this.presence);
    this.modelGroup.position.y = SHADE_HOVER - SHADE_RISE * (1 - k) + Math.sin(t * 1.25) * 0.03;
    const flicker = 0.9 + 0.06 * Math.sin(t * 6.1) + 0.04 * Math.sin(t * 15.7 + 1.3);
    for (const g of this.ghostMaterials) g.material.opacity = g.opacity * k * flicker;
    if (this.presence <= 0 && this.presenceTarget <= 0) this.group.visible = false;
  }

  /**
   * Every surface washed in `color`, lit from within and see-through, with a bright rim: a figure remembered. Each
   * material keeps its texture (the face still reads); it writes depth, so the far side of the body does not show
   * through the near one. Casts no shadow.
   */
  private ghostly(rig: CharacterRig, color: THREE.ColorRepresentation, opacity: number, glow = 0.15, rim = 1.3, rimStart = 0.72): void {
    const made = new Map<THREE.Material, THREE.MeshToonMaterial>();
    const wash = (m: THREE.Material) => {
      let ghost = made.get(m);
      if (!ghost) {
        const map = (m as THREE.MeshStandardMaterial).map ?? null;
        ghost = new THREE.MeshToonMaterial({ name: 'Ghost', color, map, transparent: true, opacity });
        ghost.emissive.set(color).multiplyScalar(glow);
        // A shade carries its own light: its features show in it however the place lights it.
        if (this.shade && map) ghost.emissiveMap = map;
        addRimLight(ghost, { color, strength: rim, start: rimStart });
        made.set(m, ghost);
        this.ghostMaterials.push({ material: ghost, opacity });
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

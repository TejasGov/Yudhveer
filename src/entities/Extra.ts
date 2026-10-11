import * as THREE from 'three';
import { Character } from './Character';
import type { CharacterDefinition, CharacterRig } from './animation/CharacterRig';
import { CharacterMotor } from '../physics/CharacterMotor';
import { addRimLight } from '../levels/environment/ToonRelight';
import { RadiantShade, type Radiance } from './RadiantShade';

/** A shade's opacity when wholly there (see `CastMember.shade`). */
const SHADE_OPACITY = 0.6;
/** A graceful shade's rise onto a new floor level: the smoothing time (s; 90% of a step in about twice this) and how far ahead she looks (m). */
const GROUND_SMOOTH = 0.12;
const GROUND_LOOKAHEAD = 0.45;

/** What `CastMember.shade` gives: the colour and opacity of the wash, and the opt-in extras. */
export interface ShadeSpec {
  color: THREE.ColorRepresentation;
  opacity?: number;
  /** Keeps a walking shade on nearby walkable floor instead of hovering and bobbing. */
  grounded?: boolean;
  /**
   * Drawn as a body of moonlight instead of a grey translucent ghost (see RadiantShade): `color` is its silver,
   * `opacity` is not used (it is drawn opaque and dissolves in).
   */
  radiant?: Radiance;
  /**
   * Walks gracefully when staged (Scene.ts `Staging`): its speed eases in and out, it turns toward where it is going
   * before it moves off, brakes onto its mark, settles onto a new floor level over a moment, and its stride follows
   * the commanded speed. Other shades walk as they always did.
   */
  graceful?: boolean;
}
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
  public shade: ShadeSpec | null = null;
  /** See `ShadeSpec.graceful`. Set from the shade's spec when its rig loads. */
  public graceful = false;
  /** The ground speed Staging commands this step (m/s), which a graceful walker's stride is timed to. */
  public commandedSpeed = 0;
  /** Her light, halo and motes (a radiant shade only). */
  private radiance: RadiantShade | null = null;
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
  private groundVelocity = 0;
  private readonly groundProbe = new THREE.Vector3();
  private readonly groundNormal = new THREE.Vector3();

  constructor(id: string) {
    super(id, 0x8a7560);
  }

  public override async attachRig(definition: CharacterDefinition): Promise<CharacterRig> {
    const rig = await super.attachRig(definition);
    if (this.silhouetteColor !== null) this.shadowed(rig, this.silhouetteColor);
    else if (this.shade?.radiant) this.radiant(rig, this.shade.color, this.shade.radiant);
    else if (this.shade) this.ghostly(rig, this.shade.color, this.shade.opacity ?? SHADE_OPACITY, 1.15, 1.2, 0.8);
    else if (this.ghost) this.ghostly(rig, this.ghost.color, this.ghost.opacity ?? 0.3);
    if (this.shade?.graceful) this.makeGraceful(rig);
    this.applyPresence();
    return rig;
  }

  /** See `ShadeSpec.graceful`: a stride timed to the commanded speed from the first frame, however slow the start. */
  public makeGraceful(rig: CharacterRig): void {
    this.graceful = true;
    rig.matchSnap = true;
    rig.matchFloor = 0.3;
  }

  /** Where she is no more: her light, halo and motes go with her (the chapter is over). */
  public override retire(): void {
    this.radiance?.dispose();
    this.radiance = null;
    super.retire();
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
    if (this.shade?.grounded) this.followGround(dt);
    // A graceful walker's stride follows the speed it is commanded, not the filtered speed it has covered.
    if (this.graceful) this.visSpeed = this.commandedSpeed;
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
    if (this.radiance) {
      const k = this.presence * this.presence * (3 - 2 * this.presence);
      this.radiance.attach(this.group.parent, this.group);
      this.radiance.update(dt, k, this.group, this.group.visible, this.rig?.root ?? null);
    }
  }

  /**
   * A walking shade follows nearby walkable level surfaces; walls, overhead rock and fighter capsules cannot lift it.
   * A graceful one looks a step ahead and glides to the level it will stand on (a critically damped rise, so a step up
   * to the dais is climbed over about a quarter of a second, starting before the edge, never a pop).
   */
  private followGround(dt: number): void {
    const feet = this.group.position;
    let target = this.groundAt(feet.x, feet.y, feet.z, feet.y);
    if (target === null) return;
    if (!this.graceful || dt <= 0) {
      feet.y = target;
      return;
    }
    if (this.commandedSpeed > 0.3) {
      const yaw = this.group.rotation.y;
      const ahead = this.groundAt(feet.x + Math.sin(yaw) * GROUND_LOOKAHEAD, feet.y, feet.z + Math.cos(yaw) * GROUND_LOOKAHEAD, feet.y);
      if (ahead !== null && ahead > target) target = ahead;
    }
    if (Math.abs(target - feet.y) < 1e-4 && Math.abs(this.groundVelocity) < 1e-3) {
      feet.y = target;
      this.groundVelocity = 0;
      return;
    }
    // critically damped approach (Unity's SmoothDamp): no initial jump, no overshoot
    const omega = 2 / GROUND_SMOOTH;
    const x = omega * dt;
    const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = feet.y - target;
    const temp = (this.groundVelocity + omega * change) * dt;
    this.groundVelocity = (this.groundVelocity - omega * temp) * decay;
    feet.y = target + (change + temp) * decay;
  }

  /** The walkable floor under (x, z) near `y`, or null (nothing solid, too steep, or beyond the allowed step or drop). */
  private groundAt(x: number, y: number, z: number, from: number): number | null {
    this.groundProbe.set(x, y + 0.6, z);
    const ground = CharacterMotor.groundBelow(this.groundProbe, 1.8, this.groundNormal);
    return ground !== null && this.groundNormal.y >= Math.cos(THREE.MathUtils.degToRad(50))
      && ground <= from + 0.45 && ground >= from - 1.2 ? ground : null;
  }

  /** A shade's height off the ground, opacity and visibility, from its presence (and a slow breath and flicker). */
  private applyPresence(): void {
    if (!this.shade) return;
    const t = this.haunting;
    const k = this.presence * this.presence * (3 - 2 * this.presence);
    this.modelGroup.position.y = this.shade.grounded
      ? -SHADE_RISE * (1 - k)
      : SHADE_HOVER - SHADE_RISE * (1 - k) + Math.sin(t * 1.25) * 0.03;
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
   * Every surface in moonlight (RadiantShade): silver and pale gold, a soft rim and a glow from within, opaque. Her
   * light, halo and motes are made now and kept at no intensity until she appears.
   */
  private radiant(rig: CharacterRig, silver: THREE.ColorRepresentation, spec: Radiance): void {
    const radiance = new RadiantShade(spec, silver, this.visualHeight());
    const made = new Map<THREE.Material, THREE.MeshToonMaterial>();
    const body = (m: THREE.Material) => {
      let mat = made.get(m);
      if (!mat) { mat = radiance.material(m); made.set(m, mat); }
      return mat;
    };
    rig.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(body) : body(mesh.material);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    });
    made.forEach((_, m) => m.dispose());
    this.radiance?.dispose();
    this.radiance = radiance;
    radiance.attach(this.group.parent, this.group);
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

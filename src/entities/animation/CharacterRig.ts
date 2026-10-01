import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { CharacterState } from '../CharacterStateMachine';
import { addRimLight, createToonRamp, toToonMaterial } from '../../levels/environment/ToonRelight';

/** One clip as described by `characters/build_character.py`'s manifest. */
export interface ClipInfo {
  duration: number;
  loop: boolean;
  /** Loops: ground speed the clip was authored at (m/s), so playback can match movement. */
  speed?: number;
  /** One-shots: horizontal travel stripped from the hips, character-local (x right, z forward), in metres. */
  rootMotion?: { fps: number; samples: [number, number][] };
  /** Jumps: when the feet leave and touch the ground (s). The clip has no height; physics supplies it. */
  airborne?: { takeoff: number; landing: number };
  /** Named moments in composite clips (s), e.g. the sheathe's "sheathed". */
  marks?: Record<string, number>;
}

export interface CharacterManifest {
  model: string;
  height: number;
  sockets: string[];
  clips: Record<string, ClipInfo>;
}

export interface StateAnimation {
  clip: string;
  /** Scale playback to the character's ground speed (locomotion loops with a recorded `speed`). */
  matchSpeed?: boolean;
  /** Fixed playback rate (default 1). */
  timeScale?: number;
  /** Move the character with the clip's root-motion curve (lunging attacks). */
  rootMotion?: boolean;
  /** The state lasts exactly one play of the clip (attacks): the state machine's timer is set from it. */
  timesState?: boolean;
  /** Cross-fade into this clip, seconds (default 0.15). */
  fade?: number;
  /** Played instead of `clip` when the state begins on the move (a running jump rather than a standing one). */
  movingClip?: string;
  /** Play the clip backwards (drawing the sword is the sheathe in reverse). */
  reverse?: boolean;
}

export interface SocketAttachment {
  socket: string;
  /**
   * World orientation the attached object should have when the rig is in its rest (T-)pose, XYZ Euler radians,
   * character facing +Z. Lets attachments be authored against the pose instead of the hand bone's roll.
   */
  restWorldRotation: [number, number, number];
  /** Point on the attached object (its own space) that sits at the socket, e.g. the grip. */
  grip: [number, number, number];
}

export interface CharacterDefinition {
  model: string;
  manifest: string;
  states: Partial<Record<CharacterState, StateAnimation>> & { IDLE: StateAnimation };
  locomotion: { walkSpeed: number; moveSpeed: number; sprintSpeed: number };
  weapon?: SocketAttachment;
  offhand?: SocketAttachment;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const DEFAULT_FADE = 0.15;
const MATCH_SPEED_RANGE: [number, number] = [0.5, 2.4];

/**
 * A skinned character built by the character pipeline: cel-shaded to match the levels, cross-fading between
 * state clips, matching locomotion playback to ground speed and feeding root motion back to gameplay.
 */
export class CharacterRig {
  public readonly root: THREE.Object3D;
  public readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private readonly ramp = createToonRamp([0.18, 0.46, 0.8, 1.0]);
  private current: { config: StateAnimation; action: THREE.AnimationAction; lastTime: number } | null = null;

  private constructor(
    gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] },
    public readonly manifest: CharacterManifest,
    public readonly definition: CharacterDefinition,
  ) {
    this.root = gltf.scene;
    this.root.name = `CharacterRig_${manifest.model}`;
    this.mixer = new THREE.AnimationMixer(this.root);
    for (const clip of gltf.animations) {
      const info = manifest.clips[clip.name];
      const action = this.mixer.clipAction(clip);
      if (info && !info.loop) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(clip.name, action);
    }
    this.stylise();
  }

  public static async load(definition: CharacterDefinition): Promise<CharacterRig> {
    const [gltf, manifest] = await Promise.all([
      loader.loadAsync(definition.model),
      fetch(definition.manifest).then((r) => {
        if (!r.ok) throw new Error(`manifest ${definition.manifest}: HTTP ${r.status}`);
        return r.json() as Promise<CharacterManifest>;
      }),
    ]);
    const missing = Object.values(definition.states).map((s) => s!.clip).filter((c) => !gltf.animations.some((a) => a.name === c));
    if (missing.length) console.warn(`[CharacterRig] ${definition.model} has no clips named ${[...new Set(missing)].join(', ')}`);
    return new CharacterRig(gltf, manifest, definition);
  }

  /**
   * Cel shading with a faint, thin warm rim (it is added regardless of how lit he is, so it must stay subtle or he
   * glows in dark levels); skinned meshes are never frustum-culled.
   */
  private stylise(): void {
    const converted = new Map<THREE.Material, THREE.Material>();
    this.root.traverse((obj) => {
      const mesh = obj as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Bind-pose bounds don't cover swings and lunges; one character is cheap to always draw.
      mesh.frustumCulled = false;
      const src = mesh.material as THREE.MeshStandardMaterial;
      if (!converted.has(src)) {
        const toon = toToonMaterial(src, this.ramp);
        addRimLight(toon, { color: 0xffe6c4, strength: 0.14, start: 0.74 });
        converted.set(src, toon);
        src.dispose();
      }
      mesh.material = converted.get(src)!;
    });
  }

  public clipInfo(name: string): ClipInfo | undefined {
    return this.manifest.clips[name];
  }

  public socket(name: string): THREE.Object3D | undefined {
    return this.root.getObjectByName(name) ?? undefined;
  }

  /**
   * Parents `object` to a socket so that, in the rest pose, it has `restWorldRotation` and its `grip` point
   * sits on the socket. Call before the rig is moved or animated (the rest pose must still be current).
   */
  public attach(object: THREE.Object3D, attachment: SocketAttachment): boolean {
    const socket = this.socket(attachment.socket);
    if (!socket) return false;
    this.root.updateMatrixWorld(true);
    const socketRest = socket.getWorldQuaternion(new THREE.Quaternion());
    const desired = new THREE.Quaternion().setFromEuler(new THREE.Euler(...attachment.restWorldRotation));
    object.quaternion.copy(socketRest.invert().multiply(desired));
    object.position.set(...attachment.grip).applyQuaternion(object.quaternion).negate();
    object.scale.setScalar(1 / socket.getWorldScale(new THREE.Vector3()).x);
    // Props join the cel look: shiny PBR metal next to toon shading reads as glowing.
    object.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const src = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!mesh.isMesh || !src?.isMeshStandardMaterial) return;
      mesh.material = toToonMaterial(src, this.ramp);
      src.dispose();
    });
    socket.add(object);
    return true;
  }

  /** Cross-fades to the animation for `config`; a looping clip that is already playing just continues. */
  public play(config: StateAnimation): void {
    const action = this.actions.get(config.clip);
    if (!action) return;
    const info = this.manifest.clips[config.clip];
    const fade = config.fade ?? DEFAULT_FADE;
    const previous = this.current?.action;
    if (previous === action && info?.loop) {
      this.current = { config, action, lastTime: action.time };
      return;
    }
    action.reset();
    const rate = config.timeScale ?? 1;
    action.setEffectiveTimeScale(config.reverse ? -rate : rate);
    if (config.reverse) action.time = action.getClip().duration;
    action.setEffectiveWeight(1);
    action.play();
    if (previous && previous !== action) action.crossFadeFrom(previous, fade, false);
    else action.fadeIn(fade);
    this.current = { config, action, lastTime: action.time };
  }

  /** Seconds one play of this state's clip takes at its configured rate. */
  public stateDuration(config: StateAnimation): number | undefined {
    const info = this.manifest.clips[config.clip];
    return info ? info.duration / (config.timeScale ?? 1) : undefined;
  }

  /** The playing clip's name and its position in clip seconds (counts down when reversed). */
  public get clip(): string | undefined {
    return this.current?.config.clip;
  }

  public get time(): number {
    return this.current?.action.time ?? 0;
  }

  /** Jumps the playing clip to `time` (clip seconds), e.g. straight to the landing when touching down early. */
  public seek(time: number): void {
    if (!this.current) return;
    this.current.action.time = time;
    this.current.lastTime = time;
  }

  /** Freezes the playing clip at `time` (a fall pose held until the feet touch down) or, with null, lets it run. */
  public hold(time: number | null): void {
    if (!this.current) return;
    if (time !== null) this.seek(time);
    this.current.action.paused = time !== null;
  }

  public drivesRootMotion(): boolean {
    return !!(this.current?.config.rootMotion && this.manifest.clips[this.current.config.clip]?.rootMotion);
  }

  /**
   * Advances the animation. `groundSpeed` (m/s) drives speed-matched loops. Returns this step's root motion in
   * character-local space (x right, z forward), or null when the current clip doesn't drive the character.
   */
  public update(dt: number, groundSpeed: number): THREE.Vector3 | null {
    const cur = this.current;
    if (cur?.config.matchSpeed) {
      const authored = this.manifest.clips[cur.config.clip]?.speed;
      if (authored && authored > 0.01) {
        const scale = THREE.MathUtils.clamp(groundSpeed / authored, ...MATCH_SPEED_RANGE);
        cur.action.setEffectiveTimeScale(scale);
      }
    }
    this.mixer.update(dt);
    if (!cur || !this.drivesRootMotion()) return null;
    const curve = this.manifest.clips[cur.config.clip].rootMotion!;
    const t = cur.action.time;
    const delta = sampleCurve(curve, t).sub(sampleCurve(curve, cur.lastTime));
    cur.lastTime = t;
    return delta;
  }

  public dispose(): void {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
    this.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.MeshToonMaterial | undefined;
      if (mat) {
        mat.map?.dispose();
        mat.dispose();
      }
    });
    this.ramp.dispose();
  }
}

function sampleCurve(curve: { fps: number; samples: [number, number][] }, time: number): THREE.Vector3 {
  const f = THREE.MathUtils.clamp(time * curve.fps, 0, curve.samples.length - 1);
  const i = Math.floor(f);
  const j = Math.min(i + 1, curve.samples.length - 1);
  const k = f - i;
  const a = curve.samples[i];
  const b = curve.samples[j];
  return new THREE.Vector3(a[0] + (b[0] - a[0]) * k, 0, a[1] + (b[1] - a[1]) * k);
}

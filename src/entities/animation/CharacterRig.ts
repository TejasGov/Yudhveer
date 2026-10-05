import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { CharacterState } from '../CharacterStateMachine';
import { addRimLight, createToonRamp, toToonMaterial } from '../../levels/environment/ToonRelight';

/** One clip as described by `game asset/characters/build_character.py`'s manifest. */
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
  /** Clip seconds to start from, skipping a slow lead-in (an attack's settle from idle). The state is shorter by it. */
  startAt?: number;
  /**
   * Clip seconds to stop at: one swing cut out of a longer combo clip (`startAt` to `endAt`). The state is only as
   * long as that span; the next state's cross-fade takes the pose from there.
   */
  endAt?: number;
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
  /**
   * `restWorldRotation` is relative to the socket's own frame instead of the rest-pose world. For grip sockets made
   * by the pipeline's --fists (+Y along the fist's bar toward the thumb, +Z out of the back of the hand), where a
   * prepared weapon (blade up +Y) fits with no rotation at all.
   */
  socketFrame?: boolean;
  /**
   * Other rest orientations for particular states, whose clips were authored for a different hold (a shield
   * strapped to the forearm in combat clips, carried facing forward in generic runs). Blended to over ~0.2 s.
   */
  stateRotations?: Partial<Record<CharacterState, [number, number, number]>>;
  /**
   * A weapon model (GLB, made by game asset/characters/prepare_weapon.py: grip at the origin, blade up +Y) to wield instead of
   * the built-in greybox sword.
   */
  model?: string;
  /** Builds the prop in code instead (a placeholder with no model file yet); takes the place of `model`. */
  build?: () => THREE.Group;
  /** Where the blade starts (just past the guard) and ends, up its local +Y (m): the hit-detection segment. */
  blade?: [number, number];
  /** Size of the prop relative to its model (a borrowed weapon cut down or scaled up to suit the wielder). */
  scale?: number;
  /**
   * Held in both hands: the other hand's socket (e.g. `Socket_Hand_L`). Each frame the prop turns about its grip so
   * its +Y runs from that hand through this one, and the haft lies in both fists whatever the clip does with the
   * wrists. Two-handed clips (the Great Sword Pack) keep the fists ~0.2 m apart; once they are further apart than
   * that (a one-handed clip, a fall) the prop eases back to its own hold.
   */
  twoHanded?: string;
}

/** An attached prop and the grip orientations it can take (socket-local). */
interface Mount {
  object: THREE.Object3D;
  grip: THREE.Vector3;
  base: THREE.Quaternion;
  byState: Map<CharacterState, THREE.Quaternion>;
  /** Two-handed: the other hand's socket, and this socket (see `SocketAttachment.twoHanded`). */
  aim?: { other: THREE.Object3D; socket: THREE.Object3D };
  /** The hold before the two-handed aim (state rotations ease this; the aim is applied on top each frame). */
  hold: THREE.Quaternion;
}

// Fist-to-fist distance (m) under which a two-handed prop is fully aimed through both hands, and over which not at all.
const TWO_HANDS_NEAR = 0.3;
const TWO_HANDS_FAR = 0.45;
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _q = new THREE.Quaternion();

export interface CharacterDefinition {
  model: string;
  manifest: string;
  states: Partial<Record<CharacterState, StateAnimation>> & { IDLE: StateAnimation };
  locomotion: { walkSpeed: number; moveSpeed: number; sprintSpeed: number };
  weapon?: SocketAttachment;
  offhand?: SocketAttachment;
  /**
   * Uniform size of the whole character, props included (a model shared by two characters can read as two people);
   * locomotion and root motion scale with it.
   */
  scale?: number;
  /** Multiplies every material's colour (a shared model recoloured for another character). */
  tint?: THREE.ColorRepresentation;
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
/**
 * Downloaded GLBs by URL. Several characters can share one model (the rakshasa waves); each still parses its own copy,
 * so disposing one never frees geometry or textures another is drawing.
 */
const buffers = new Map<string, Promise<ArrayBuffer>>();

function fetchModel(url: string): Promise<ArrayBuffer> {
  let pending = buffers.get(url);
  if (!pending) {
    pending = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
      return r.arrayBuffer();
    });
    pending.catch(() => buffers.delete(url));
    buffers.set(url, pending);
  }
  return pending;
}

async function loadModel(url: string): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  const data = await fetchModel(url);
  return loader.parseAsync(data, url.slice(0, url.lastIndexOf('/') + 1));
}
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
  private readonly mounts: Mount[] = [];
  /** The definition's `scale`, applied once props are attached (see `applyScale`). */
  private scale = 1;

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

  /** Starts downloading a character's model ahead of time (a boss due mid-fight), so spawning it doesn't wait. */
  public static prefetch(definition: CharacterDefinition): void {
    void fetchModel(definition.model).catch(() => undefined);
  }

  /** Loads a weapon model for `SocketAttachment.model`. */
  public static async loadProp(url: string): Promise<THREE.Object3D> {
    const gltf = await loadModel(url);
    gltf.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    return gltf.scene;
  }

  public static async load(definition: CharacterDefinition): Promise<CharacterRig> {
    const [gltf, manifest] = await Promise.all([
      loadModel(definition.model),
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
    const tint = this.definition.tint !== undefined ? new THREE.Color(this.definition.tint) : null;
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
        if (tint) toon.color.multiply(tint);
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
    const socketRestInv = socket.getWorldQuaternion(new THREE.Quaternion()).invert();
    const orientation = (euler: [number, number, number]) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler));
      return attachment.socketFrame ? q : socketRestInv.clone().multiply(q);
    };
    const mount: Mount = {
      object,
      grip: new THREE.Vector3(...attachment.grip),
      base: orientation(attachment.restWorldRotation),
      byState: new Map(Object.entries(attachment.stateRotations ?? {})
        .map(([state, euler]) => [state as CharacterState, orientation(euler!)])),
      hold: new THREE.Quaternion(),
    };
    const other = attachment.twoHanded ? this.socket(attachment.twoHanded) : undefined;
    if (other) mount.aim = { other, socket };
    mount.hold.copy(mount.base);
    object.quaternion.copy(mount.base);
    object.position.copy(mount.grip).applyQuaternion(object.quaternion).negate();
    object.scale.setScalar((attachment.scale ?? 1) / socket.getWorldScale(new THREE.Vector3()).x);
    if (mount.byState.size || mount.aim) this.mounts.push(mount);
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

  /**
   * When a clip's strikes happen, measured from the animation itself (clip seconds): spans where the weapon tip,
   * relative to the character, moves at least 45 % of its peak speed in that clip. Spans closer than 0.12 s merge;
   * blips shorter than 0.05 s are dropped. Each span is one hit. Samples a throwaway mixer, so call it while the
   * rig is not mid-frame (at load).
   */
  public measureStrikes(clipName: string, tipOf: () => THREE.Vector3): { t0: number; t1: number; peak: number }[] {
    const action = this.actions.get(clipName);
    if (!action) return [];
    const clip = action.getClip();
    const probe = new THREE.AnimationMixer(this.root);
    probe.clipAction(clip).play();
    const dt = 1 / 60;
    const tips: THREE.Vector3[] = [];
    for (let t = 0; t <= clip.duration + 1e-6; t += dt) {
      probe.setTime(t);
      this.root.updateMatrixWorld(true);
      this.aimTwoHanded();
      tips.push(this.root.worldToLocal(tipOf()));
    }
    probe.stopAllAction();
    probe.uncacheRoot(this.root);
    const speed = tips.map((p, i) => (i === 0 ? 0 : p.distanceTo(tips[i - 1]) / dt));
    const peak = Math.max(...speed);
    const spans: { t0: number; t1: number; peak: number }[] = [];
    speed.forEach((v, i) => {
      if (v < peak * 0.45) return;
      const t = i * dt;
      const last = spans[spans.length - 1];
      if (last && t - last.t1 <= 0.12) {
        last.t1 = t;
        if (v > speed[Math.round(last.peak / dt)]) last.peak = t;
      } else spans.push({ t0: t - dt, t1: t, peak: t });
    });
    return spans.filter((s) => s.t1 - s.t0 >= 0.05);
  }

  /**
   * Reads something off the rig as it would be posed at `time` (clip seconds) in `clipName`, e.g. where a hand
   * will be at a clip's mark; the live animation takes the pose back on its next update.
   */
  public sampleAt<T>(clipName: string, time: number, read: () => T): T | undefined {
    const action = this.actions.get(clipName);
    if (!action) return undefined;
    const probe = new THREE.AnimationMixer(this.root);
    probe.clipAction(action.getClip()).play();
    probe.setTime(time);
    this.root.updateMatrixWorld(true);
    const value = read();
    probe.stopAllAction();
    probe.uncacheRoot(this.root);
    return value;
  }

  /**
   * Sizes the whole character, props included. Call after attaching props (attachment normalises a prop to its
   * own size against the socket, so scaling first would undo it on the weapon).
   */
  public applyScale(scale: number): void {
    this.scale = scale;
    this.root.scale.setScalar(scale);
  }

  /**
   * Eases props with per-state holds (see `SocketAttachment.stateRotations`) toward the hold for `state`, then turns
   * two-handed props through both fists of the pose just animated.
   */
  public updateMounts(state: CharacterState, dt: number): void {
    const t = 1 - Math.exp(-12 * dt);
    for (const m of this.mounts) {
      const target = m.byState.get(state) ?? m.base;
      if (m.hold.angleTo(target) >= 1e-4) m.hold.slerp(target, t);
      if (m.aim) continue;
      m.object.quaternion.copy(m.hold);
      m.object.position.copy(m.grip).applyQuaternion(m.object.quaternion).negate();
    }
    if (this.mounts.some((m) => m.aim)) {
      this.root.updateMatrixWorld(true);
      this.aimTwoHanded();
    }
  }

  /**
   * Two-handed props: from their hold, the least turn that lays +Y along the line from the other fist through this
   * one (socket-local), weighted down as the fists part. Needs the rig's world matrices current.
   */
  private aimTwoHanded(): void {
    for (const m of this.mounts) {
      if (!m.aim) continue;
      const { socket, other } = m.aim;
      // The other fist in this socket's space, in metres (sockets can carry the rig's scale).
      const local = socket.worldToLocal(other.getWorldPosition(_a));
      const scale = socket.getWorldScale(_b).x / (this.root.getWorldScale(_b).x || 1);
      const apart = local.length() * scale;
      const w = 1 - THREE.MathUtils.smoothstep(apart, TWO_HANDS_NEAR, TWO_HANDS_FAR);
      m.object.quaternion.copy(m.hold);
      if (w > 0 && apart > 0.02) {
        const up = _b.set(0, 1, 0).applyQuaternion(m.hold);
        _q.setFromUnitVectors(up, local.negate().normalize());
        m.object.quaternion.premultiply(_q.slerp(new THREE.Quaternion(), 1 - w));
      }
      m.object.position.copy(m.grip).applyQuaternion(m.object.quaternion).negate();
      m.object.updateMatrixWorld(true);
    }
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
    else if (config.startAt) action.time = config.startAt;
    action.setEffectiveWeight(1);
    action.play();
    // The very first clip, or a restart of the one playing, starts at full weight: fading in from nothing would
    // blend through the bind (T) pose.
    if (previous && previous !== action) action.crossFadeFrom(previous, fade, false);
    this.current = { config, action, lastTime: action.time };
  }

  /** Seconds one play of this state's clip takes at its configured rate. */
  public stateDuration(config: StateAnimation): number | undefined {
    const info = this.manifest.clips[config.clip];
    return info ? (Math.min(config.endAt ?? Infinity, info.duration) - (config.startAt ?? 0)) / (config.timeScale ?? 1) : undefined;
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
        const scale = THREE.MathUtils.clamp(groundSpeed / (authored * this.scale), ...MATCH_SPEED_RANGE);
        cur.action.setEffectiveTimeScale(scale);
      }
    }
    this.mixer.update(dt);
    if (!cur || !this.drivesRootMotion()) return null;
    const curve = this.manifest.clips[cur.config.clip].rootMotion!;
    const t = cur.action.time;
    const delta = sampleCurve(curve, t).sub(sampleCurve(curve, cur.lastTime)).multiplyScalar(this.scale);
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

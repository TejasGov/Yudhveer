import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { CharacterState } from '../CharacterStateMachine';
import { addRimLight, createToonRamp, toToonMaterial } from '../../levels/environment/ToonRelight';
import { disposeObject } from '../../levels/GLBLevel';
import { installHitFlash } from '../../combat/HitReact';

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
  /**
   * Authored clips played seated: the blocks of what he sits on, character-local (x right, y up, z forward; metres,
   * before the definition's scale), so a level can build it where he will sit (Andhaka's throne).
   */
  seat?: { centre: [number, number, number]; size: [number, number, number] }[];
  /** Both hands take this finger pose while the clip plays, whatever they hold (prayer: `flat`). See `HandPose`. */
  hands?: HandPose;
}

/**
 * The finger poses a rig built with finger bones of its own (game asset/characters/hands.py, `--finger-markers`) carries
 * as `hand_<pose>` clips: closed round the haft in the hand's socket, hanging relaxed, laid flat. Each frame a hand that
 * holds a prop closes, an empty one relaxes, and a clip marked `hands: 'flat'` (prayer) lays both flat.
 */
export type HandPose = 'fist' | 'relaxed' | 'flat';
const HAND_POSES: HandPose[] = ['fist', 'relaxed', 'flat'];
const FINGER_NODE = /^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)\d$/;
/** How quickly a hand eases into its new pose (1/s): most of the way in about a fifth of a second. */
const HAND_RATE = 14;

/** One hand's finger bones and their poses (all in the bones' order), and the socket whose props close it. */
interface Hand {
  bones: THREE.Object3D[];
  poses: Record<HandPose, THREE.Quaternion[]>;
  /** What the fingers show now, eased toward the pose wanted (null until the first frame). */
  shown: THREE.Quaternion[] | null;
  socket: THREE.Object3D | undefined;
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
   * `REST` is the hold at ease (see `Character.atEase`): a blade lowered, a staff upright, in a hand hanging relaxed.
   */
  stateRotations?: Partial<Record<CharacterState, [number, number, number]>>;
  /**
   * Other grip points for particular states, eased to as the rotations are: a staff held near its foot to swing
   * slides through the hand at ease (`REST`) until it stands on its foot.
   */
  stateGrips?: Partial<Record<CharacterState, [number, number, number]>>;
  /**
   * Two-handed props: the grip point while the other hand is off it (the fists apart: a slide, a fall, a cutscene's
   * one-handed clip), slid to as the hands part and back as they meet. A staff swung in both hands near its foot is
   * held in one nearer its balance. A state's own grip (`stateGrips`) wins over it.
   */
  oneHandGrip?: [number, number, number];
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
  /** The socket it was attached to: away from it (a sword in its scabbard) its holds do not apply. */
  home: THREE.Object3D;
  /** The grip point now (eased toward the state's, see `SocketAttachment.stateGrips`), and the usual one. */
  grip: THREE.Vector3;
  gripBase: THREE.Vector3;
  gripByState: Map<CharacterState, THREE.Vector3>;
  /** Two-handed: the grip with one hand on it (`SocketAttachment.oneHandGrip`), and how much both are on it (0..1). */
  oneHand?: THREE.Vector3;
  both: number;
  base: THREE.Quaternion;
  byState: Map<CharacterState, THREE.Quaternion>;
  /**
   * Two-handed: the other hand's socket, this socket (see `SocketAttachment.twoHanded`), and how fully it is laid
   * through both fists now (0-1; the other hand closes on it as much).
   */
  aim?: { other: THREE.Object3D; socket: THREE.Object3D; weight: number };
  /** The hold before the two-handed aim (state rotations ease this; the aim is applied on top each frame). */
  hold: THREE.Quaternion;
}

// Fist-to-fist distance (m) under which a two-handed prop is fully aimed through both hands, and over which not at all.
const TWO_HANDS_NEAR = 0.3;
const TWO_HANDS_FAR = 0.45;
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _hq = new THREE.Quaternion();

export interface CharacterDefinition {
  model: string;
  manifest: string;
  /**
   * Clips per state. `REST` is the calm standing idle the character keeps out of the fight (cutscenes, a chapter's
   * start, after the battle): IDLE plays it while at ease. Without one, IDLE's own clip stands in.
   */
  states: Partial<Record<CharacterState, StateAnimation>> & { IDLE: StateAnimation };
  locomotion: { walkSpeed: number; moveSpeed: number; sprintSpeed: number };
  weapon?: SocketAttachment;
  offhand?: SocketAttachment;
  /**
   * The scabbard a stowable weapon is sheathed in (`build`, on its socket, e.g. `Socket_Sheath` on the hips), worn
   * whether the blade is in it or drawn. It is built in the blade's own frame and hung with the blade's `grip`, so
   * the stowed blade takes the very same hold and sits inside it, only the hilt showing.
   */
  sheath?: SocketAttachment;
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
/** Fastest change of a speed-matched clip's playback rate, per second (JITTER.md, fix 5). */
const STRIDE_RATE = 2.5;

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
  /** Cross-fades under way (see `blendTo`): each clip's weight from `from` to `to` over `duration` seconds. */
  private readonly fades = new Map<THREE.AnimationAction, { from: number; to: number; t: number; duration: number }>();
  private readonly mounts: Mount[] = [];
  /** The definition's `scale`, applied once props are attached (see `applyScale`). */
  private scale = 1;
  /** Finger bones and poses (see `HandPose`), for a rig built with them; null otherwise (the clips move any fingers). */
  private readonly hands: Hand[] | null;
  /**
   * Dev counter for the jitter probe (`__debug.jitter`): looping clips started over from their first frame while still
   * visibly blended in, each one a pop of the pose and a restarted stride.
   */
  public restarts = 0;

  private constructor(
    gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] },
    public readonly manifest: CharacterManifest,
    public readonly definition: CharacterDefinition,
  ) {
    this.root = gltf.scene;
    this.root.name = `CharacterRig_${manifest.model}`;
    this.mixer = new THREE.AnimationMixer(this.root);
    // Finger poses: read once, and the fingers left out of every other clip, so the hands are set per frame instead.
    const handClips = new Map<HandPose, THREE.AnimationClip>();
    for (const clip of gltf.animations) {
      const pose = clip.name.startsWith('hand_') ? (clip.name.slice(5) as HandPose) : null;
      if (pose && HAND_POSES.includes(pose)) handClips.set(pose, clip);
    }
    this.hands = handClips.size === HAND_POSES.length ? this.readHands(handClips) : null;
    for (const clip of gltf.animations) {
      if (clip.name.startsWith('hand_')) continue;
      if (this.hands) {
        clip.tracks = clip.tracks.filter((t) => !FINGER_NODE.test(THREE.PropertyBinding.parseTrackName(t.name).nodeName));
      }
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
        installHitFlash(toon);
        converted.set(src, toon);
        src.dispose();
      }
      mesh.material = converted.get(src)!;
    });
  }

  /** Each hand's finger bones and their poses, from the build's `hand_*` clips (the first key of each bone's track). */
  private readHands(clips: Map<HandPose, THREE.AnimationClip>): Hand[] {
    return (['Right', 'Left'] as const).map((side) => {
      const names = clips.get('fist')!.tracks
        .map((t) => THREE.PropertyBinding.parseTrackName(t.name))
        .filter((p) => p.propertyName === 'quaternion' && FINGER_NODE.test(p.nodeName) && p.nodeName.startsWith(side))
        .map((p) => p.nodeName)
        .filter((n) => this.root.getObjectByName(n));
      const poses = {} as Record<HandPose, THREE.Quaternion[]>;
      for (const pose of HAND_POSES) {
        const tracks = new Map(clips.get(pose)!.tracks.map((t) => [t.name, t.values]));
        poses[pose] = names.map((n) => {
          const v = tracks.get(`${n}.quaternion`);
          return v ? new THREE.Quaternion(v[0], v[1], v[2], v[3]) : this.root.getObjectByName(n)!.quaternion.clone();
        });
      }
      return { bones: names.map((n) => this.root.getObjectByName(n)!), poses, shown: null, socket: this.socket(`Socket_Hand_${side[0]}`) };
    });
  }

  /**
   * Sets the fingers of each hand (rigs built with finger bones, see `HandPose`), eased toward what it does now: both
   * flat while the clip asks for it (prayer), otherwise closed on what it holds and relaxed when empty.
   */
  private updateHands(dt: number): void {
    if (!this.hands) return;
    const flat = !!this.current && this.manifest.clips[this.current.config.clip]?.hands === 'flat';
    const k = 1 - Math.exp(-HAND_RATE * dt);
    for (const hand of this.hands) {
      const grip = flat ? 0 : this.gripOf(hand);
      const first = !hand.shown;
      const shown = (hand.shown ??= hand.bones.map(() => new THREE.Quaternion()));
      hand.bones.forEach((bone, i) => {
        if (flat) _hq.copy(hand.poses.flat[i]);
        else _hq.copy(hand.poses.relaxed[i]).slerp(hand.poses.fist[i], grip);
        if (first) shown[i].copy(_hq);
        else shown[i].slerp(_hq, k);
        bone.quaternion.copy(shown[i]);
      });
    }
  }

  /** How far a hand closes (0 open, 1 a fist): round a prop shown in its socket, or a two-handed haft laid through it. */
  private gripOf(hand: Hand): number {
    const socket = hand.socket;
    if (!socket) return 0;
    if (socket.children.some((c) => c.visible)) return 1;
    let grip = 0;
    for (const m of this.mounts) {
      if (m.aim?.other === socket && m.object.visible && m.object.parent === m.home) grip = Math.max(grip, m.aim.weight);
    }
    return grip;
  }

  public clipInfo(name: string): ClipInfo | undefined {
    return this.manifest.clips[name];
  }

  public socket(name: string): THREE.Object3D | undefined {
    return this.root.getObjectByName(name) ?? undefined;
  }

  /**
   * Parents `object` to a socket so that, in the rest pose, it has `restWorldRotation` and its `grip` point
   * sits on the socket. Call before the rig is moved or animated (the rest pose must still be current), unless the
   * attachment is in the socket's own frame (`socketFrame`), which needs no rest pose.
   *
   * `blend`: the prop turns into its hold from the way it faces now instead of snapping to it, over a moment (the rate
   * the per-state holds ease at, ~0.2 s): a blade going from the hand into its scabbard at the sheathe clip's mark,
   * where the hand's angle and the scabbard's differ. An object mounted before (sheathed, then drawn again) is
   * mounted afresh: one prop, one hold.
   */
  public attach(object: THREE.Object3D, attachment: SocketAttachment, options: { blend?: boolean } = {}): boolean {
    const socket = this.socket(attachment.socket);
    if (!socket) return false;
    this.root.updateMatrixWorld(true);
    this.unmount(object);
    // The way it faces now, in the socket's frame: where a blended hold starts from.
    const facing = options.blend && object.parent
      ? socket.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(object.getWorldQuaternion(new THREE.Quaternion()))
      : null;
    const socketRestInv = socket.getWorldQuaternion(new THREE.Quaternion()).invert();
    const orientation = (euler: [number, number, number]) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler));
      return attachment.socketFrame ? q : socketRestInv.clone().multiply(q);
    };
    const mount: Mount = {
      object,
      home: socket,
      grip: new THREE.Vector3(...attachment.grip),
      gripBase: new THREE.Vector3(...attachment.grip),
      gripByState: new Map(Object.entries(attachment.stateGrips ?? {})
        .map(([state, grip]) => [state as CharacterState, new THREE.Vector3(...grip!)])),
      oneHand: attachment.oneHandGrip && attachment.twoHanded ? new THREE.Vector3(...attachment.oneHandGrip) : undefined,
      both: 1,
      base: orientation(attachment.restWorldRotation),
      byState: new Map(Object.entries(attachment.stateRotations ?? {})
        .map(([state, euler]) => [state as CharacterState, orientation(euler!)])),
      hold: new THREE.Quaternion(),
    };
    const other = attachment.twoHanded ? this.socket(attachment.twoHanded) : undefined;
    if (other) mount.aim = { other, socket, weight: 0 };
    mount.hold.copy(facing ?? mount.base);
    object.quaternion.copy(mount.hold);
    object.position.copy(mount.grip).applyQuaternion(object.quaternion).negate();
    object.scale.setScalar((attachment.scale ?? 1) / socket.getWorldScale(new THREE.Vector3()).x);
    // A blended hold eases to its base like a state's hold does, so it needs the per-step update as well.
    if (mount.byState.size || mount.gripByState.size || mount.aim || facing) this.mounts.push(mount);
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

  /** The hold a prop with a changing hold has now (socket-local), or undefined for a prop whose hold never changes. */
  public holdOf(object: THREE.Object3D): THREE.Quaternion | undefined {
    return this.mounts.find((m) => m.object === object)?.hold;
  }

  /** Takes a prop off its socket and forgets its hold (a story prop handed on, or put away). */
  public detach(object: THREE.Object3D): void {
    this.unmount(object);
    object.removeFromParent();
  }

  /** Forgets any hold `object` has (it keeps its place in the scene graph). */
  private unmount(object: THREE.Object3D): void {
    for (let i = this.mounts.length - 1; i >= 0; i--) if (this.mounts[i].object === object) this.mounts.splice(i, 1);
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
    // The sampled poses must not leave their two-handedness behind for the live grip (see `Mount.both`).
    const both = this.mounts.map((m) => m.both);
    for (let t = 0; t <= clip.duration + 1e-6; t += dt) {
      probe.setTime(t);
      this.root.updateMatrixWorld(true);
      this.aimTwoHanded();
      tips.push(this.root.worldToLocal(tipOf()));
    }
    probe.stopAllAction();
    probe.uncacheRoot(this.root);
    this.mounts.forEach((m, i) => (m.both = both[i]));
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
      if (m.object.parent !== m.home) continue;
      const target = m.byState.get(state) ?? m.base;
      if (m.hold.angleTo(target) >= 1e-4) m.hold.slerp(target, t);
      // The state's own grip, else (two-handed) between the one-handed and two-handed grips as the last frame's fists
      // were: eased, so a hand sliding along a staff never jumps.
      const grip = m.gripByState.get(state) ?? (m.oneHand ? _c.lerpVectors(m.oneHand, m.gripBase, m.both) : m.gripBase);
      if (m.grip.distanceToSquared(grip) >= 1e-8) m.grip.lerp(grip, t);
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
      m.aim.weight = 0;
      if (m.object.parent !== m.home) continue;
      const { socket, other } = m.aim;
      // The other fist in this socket's space, in metres (sockets can carry the rig's scale).
      const local = socket.worldToLocal(other.getWorldPosition(_a));
      const scale = socket.getWorldScale(_b).x / (this.root.getWorldScale(_b).x || 1);
      const apart = local.length() * scale;
      const w = 1 - THREE.MathUtils.smoothstep(apart, TWO_HANDS_NEAR, TWO_HANDS_FAR);
      m.both = w;
      m.object.quaternion.copy(m.hold);
      if (w > 0 && apart > 0.02) {
        m.aim.weight = w;
        const up = _b.set(0, 1, 0).applyQuaternion(m.hold);
        _q.setFromUnitVectors(up, local.negate().normalize());
        m.object.quaternion.premultiply(_q.slerp(new THREE.Quaternion(), 1 - w));
      }
      m.object.position.copy(m.grip).applyQuaternion(m.object.quaternion).negate();
      m.object.updateMatrixWorld(true);
    }
  }

  /**
   * Cross-fades to the animation for `config`; a looping clip that is already playing just continues, and one still
   * fading out from a moment ago blends back in from where it is (no restarted stride, no pop of the pose).
   */
  public play(config: StateAnimation): void {
    const action = this.actions.get(config.clip);
    if (!action) return;
    const info = this.manifest.clips[config.clip];
    const fade = config.fade ?? DEFAULT_FADE;
    const previous = this.current?.action;
    const rate = config.timeScale ?? 1;
    if (previous === action && info?.loop) {
      // The same loop under another state (a walk played backwards as a back-step): only its direction changes.
      action.setEffectiveTimeScale(config.reverse ? -rate : rate);
      this.current = { config, action, lastTime: action.time };
      return;
    }
    const resume = !!info?.loop && !!previous && this.weightOf(action) > 0.01;
    if (!resume) {
      if (info?.loop && action.getEffectiveWeight() > 0.01) this.restarts++;
      action.reset();
      if (config.reverse) action.time = action.getClip().duration;
      else if (config.startAt) action.time = config.startAt;
    }
    action.setEffectiveTimeScale(config.reverse ? -rate : rate);
    action.play();
    if (previous && previous !== action) this.blendTo(action, resume ? this.weightOf(action) : 0, fade);
    else {
      // The very first clip, or a restart of the one playing, starts at full weight: fading in from nothing would
      // blend through the bind (T) pose.
      this.fades.delete(action);
      action.setEffectiveWeight(1);
    }
    this.current = { config, action, lastTime: action.time };
  }

  /** How much of the pose `action` makes up now (0 if it is not playing at all). */
  private weightOf(action: THREE.AnimationAction): number {
    return action.isScheduled() && action.enabled ? action.getEffectiveWeight() : 0;
  }

  /**
   * Fades `action` in from `from` and every other clip with weight out, all over `seconds` and each from the weight it
   * has now. The weights keep summing to one, so a fade begun while another is still under way never jumps (three.js's
   * own cross-fade restarts both sides from 1 and 0) and never lets the bind pose show through.
   */
  private blendTo(action: THREE.AnimationAction, from: number, seconds: number): void {
    for (const other of this.actions.values()) {
      if (other === action) continue;
      const w = this.weightOf(other);
      if (w > 0) this.fades.set(other, { from: w, to: 0, t: 0, duration: seconds });
      else this.fades.delete(other);
    }
    action.setEffectiveWeight(from);
    this.fades.set(action, { from, to: 1, t: 0, duration: seconds });
  }

  /** Advances the cross-fades by `dt` (simulated) seconds; a clip faded right out stops. */
  private updateFades(dt: number): void {
    for (const [action, f] of this.fades) {
      f.t += dt;
      const k = f.duration > 0 ? Math.min(1, f.t / f.duration) : 1;
      action.setEffectiveWeight(f.from + (f.to - f.from) * k);
      if (k < 1) continue;
      this.fades.delete(action);
      if (f.to === 0) action.stop();
    }
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

  /** The playing clip's effective playback rate (speed-matched loops change it with the ground speed). */
  public get timeScale(): number {
    return this.current?.action.getEffectiveTimeScale() ?? 1;
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
        const want = THREE.MathUtils.clamp(groundSpeed / (authored * this.scale), ...MATCH_SPEED_RANGE);
        // The stride re-times smoothly: a small deadband (the already smoothed speed's last per cent of wobble is not
        // worth chasing), and at most STRIDE_RATE per second of change.
        const now = cur.action.getEffectiveTimeScale();
        if (Math.abs(want - now) > 0.02 * want) {
          cur.action.setEffectiveTimeScale(now + THREE.MathUtils.clamp(want - now, -STRIDE_RATE * dt, STRIDE_RATE * dt));
        }
      }
    }
    this.updateFades(dt);
    this.mixer.update(dt);
    this.updateHands(dt);
    if (!cur || !this.drivesRootMotion()) return null;
    const curve = this.manifest.clips[cur.config.clip].rootMotion!;
    const t = cur.action.time;
    const delta = sampleCurve(curve, t).sub(sampleCurve(curve, cur.lastTime)).multiplyScalar(this.scale);
    cur.lastTime = t;
    return delta;
  }

  /**
   * Frees the model and the props still on its sockets: every geometry, every material (arrays too) and every texture
   * they hold, the levels' way (`disposeObject`). It used to free only the colour maps, so each rig it let go left its
   * normal maps on the GPU (audit W-08). Every rig parses its own copy of its model, so nothing here is shared.
   */
  public dispose(): void {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
    disposeObject(this.root);
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

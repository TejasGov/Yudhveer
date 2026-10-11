import * as THREE from 'three';
import { PostFX } from './postfx/PostFX';
import { PhysicsWorld } from './PhysicsWorld';
import type { LevelAtmosphere } from '../levels/LevelTypes';
import { ImpactCamera, IMPACTS } from './ImpactCamera';
import { InputManager } from './InputManager';

// Spring-arm camera: gap kept in front of whatever blocks the arm, and the shortest the arm may get.
const CAMERA_PADDING = 0.3;
const CAMERA_MIN_ARM = 0.6;
// When the arm collapses below its minimum (a pocket between a pillar and a wall: the clamped arm ends up inside the stone
// and the hero is hidden for as long as he stays), it swings round his head to where there is room, trying these turns
// in order (radians, alternating sides). The first that gives nearly the usual arm (CAMERA_SWING_ROOM of it) with the hero in
// plain view wins, else the roomiest that still has him in view.
const CAMERA_SWING = [30, -30, 60, -60, 90, -90, 120, -120, 150, -150].map((deg) => THREE.MathUtils.degToRad(deg));
const CAMERA_SWING_ROOM = 0.9;
// ... and turns back once the usual arm has this much more than the minimum (so it does not flicker at the edge).
const CAMERA_SWING_RELEASE = 0.4;
// In view: a ray from the camera to his head (and a hand's width either side of it), chest and feet reaches 90% of the way.
const CAMERA_VIEW_REACH = 0.9;
const CAMERA_VIEW_SIDE = 0.35;

/** The spring arm along one direction: its length, and how far it may reach before geometry or its padding. */
interface ArmProbe { dir: THREE.Vector3; length: number; target: number }

export class SceneManager {
  private static instance: SceneManager | null = null;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public dirLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public hemiLight: THREE.HemisphereLight;

  // Third person camera configuration
  public cameraPivot: THREE.Vector3 = new THREE.Vector3(0, 1.2, 0);
  public cameraDistance = 3.4;
  public cameraHeight = 1.65;
  public cameraShoulderOffset = 0.55; // Over-the-right-shoulder offset
  public cameraYaw = 0; // Horizontal rotation
  public cameraPitch = -0.12; // Vertical tilt
  /** Field of view while playing; cutscenes set their own. */
  public readonly gameplayFov = 65;
  /**
   * Yaw of where the camera actually looks (same convention as `cameraYaw`). The shoulder offset turns the view a
   * few degrees off `cameraYaw`; movement uses this so W runs straight into the screen instead of slightly across it.
   */
  public viewYaw = 0;

  // Current spring-arm length (shortened when level geometry is in the way)
  private armLength = 3.4;
  // How far the arm is turned about the head, radians, to get out of a pocket (0 almost always; see CAMERA_SWING)
  private armSwing = 0;
  private readonly physics = PhysicsWorld.getInstance();

  /**
   * Blows landing, felt in the gameplay camera (kick, smooth shake, FOV punch). The Engine applies it after the
   * follow solve each frame; it is never written back into the follow camera's yaw, pitch, pivot or `viewYaw`.
   */
  public readonly impact = new ImpactCamera();

  // Offset of the shadow-casting key light from the player; follows the level's moon or sun.
  private keyLightOffset = new THREE.Vector3(15, 25, 15);
  public readonly postFX: PostFX;

  private constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a101d);
    this.scene.fog = new THREE.FogExp2(0x0a101d, 0.02);

    this.camera = new THREE.PerspectiveCamera(
      65,
      // (A window with no size yet, a hidden frame, has no aspect: 16:9 until the first real resize.)
      window.innerWidth / window.innerHeight || 16 / 9,
      0.1,
      1000
    );

    // The post chain draws the scene into its own multisampled buffer; the canvas itself only ever gets its last, full-screen
    // pass. A multisampled canvas with a depth and stencil buffer of its own (the defaults) was a second set of buffers
    // the size of the screen, resolved every frame, for a pass that draws a quad (milestone 12; the library's advice too).
    this.renderer = new THREE.WebGLRenderer({ antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMappingExposure = 1.2;

    // Atmospheric Lighting
    this.ambientLight = new THREE.AmbientLight(0x7ea0d6, 0.4);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x7ea0d6, 0x1a2130, 0.65);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xd4e2ff, 2.0);
    this.dirLight.position.set(15, 25, 15);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 60;
    this.dirLight.shadow.camera.left = -20;
    this.dirLight.shadow.camera.right = 20;
    this.dirLight.shadow.camera.top = 20;
    this.dirLight.shadow.camera.bottom = -20;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    // Tone mapping moves into the post chain (the renderer outputs linear HDR).
    this.postFX = new PostFX(this.renderer, this.scene, this.camera);

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  public static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }

  /**
   * Drops the outgoing level's sky and environment before they are disposed. Rendering a disposed equirect
   * background (the loop keeps drawing while the next level streams in) makes three.js rebuild its cube
   * conversion, which nothing would ever free.
   */
  public clearAtmosphere(): void {
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.environment = null;
  }

  public applyAtmosphere(atm: LevelAtmosphere): void {
    this.scene.background = atm.background;
    this.scene.backgroundIntensity = atm.backgroundIntensity;
    this.scene.environment = atm.environment;
    this.scene.environmentIntensity = atm.environmentIntensity;
    // Exponential or linear fog; swapping the kind recompiles materials once, on level change.
    if ('density' in atm.fog) {
      if (!(this.scene.fog as THREE.FogExp2 | null)?.isFogExp2) this.scene.fog = new THREE.FogExp2(atm.fog.color, atm.fog.density);
      const fog = this.scene.fog as THREE.FogExp2;
      fog.color.setHex(atm.fog.color);
      fog.density = atm.fog.density;
    } else {
      if (!(this.scene.fog as THREE.Fog | null)?.isFog) this.scene.fog = new THREE.Fog(atm.fog.color, atm.fog.near, atm.fog.far);
      const fog = this.scene.fog as THREE.Fog;
      fog.color.setHex(atm.fog.color);
      fog.near = atm.fog.near;
      fog.far = atm.fog.far;
    }
    this.scene.backgroundRotation.copy(atm.environmentRotation ?? new THREE.Euler());
    this.scene.environmentRotation.copy(atm.environmentRotation ?? new THREE.Euler());
    this.camera.near = atm.clip?.near ?? 0.1;
    this.camera.far = atm.clip?.far ?? 1000;
    this.camera.updateProjectionMatrix();
    this.dirLight.shadow.normalBias = atm.key.normalBias ?? 0;
    this.ambientLight.color.setHex(atm.ambient.color);
    this.ambientLight.intensity = atm.ambient.intensity;
    this.hemiLight.color.setHex(atm.hemi.sky);
    this.hemiLight.groundColor.setHex(atm.hemi.ground);
    this.hemiLight.intensity = atm.hemi.intensity;
    this.dirLight.color.setHex(atm.key.color);
    this.dirLight.intensity = atm.key.intensity;
    this.keyLightOffset.copy(atm.key.direction).normalize().multiplyScalar(30);
    this.renderer.toneMappingExposure = atm.exposure;
    this.postFX.configure(atm);
  }

  public mount(container: HTMLElement): void {
    container.appendChild(this.renderer.domElement);
  }

  private onWindowResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // A window with no width or height (minimised, a hidden frame) has nothing to draw into: a zero-sized target makes the
    // aspect NaN and every pass of the post chain raise a framebuffer error. Keep the last real size until it has one.
    if (!(w >= 1 && h >= 1)) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.postFX.setSize(w, h);
  }

  /**
   * The follow camera: turns by `yawDelta` / `pitchDelta` radians (InputManager.consumeLook), eases its pivot to
   * the target's head and pulls in in front of anything in the way.
   */
  public updateCamera(
    targetPos: THREE.Vector3,
    yawDelta: number,
    pitchDelta: number,
    dt: number
  ): void {
    this.cameraYaw -= yawDelta;
    this.cameraPitch -= pitchDelta;
    this.cameraPitch = Math.max(-1.1, Math.min(0.8, this.cameraPitch));
    if (this.camera.fov !== this.gameplayFov) {
      this.camera.fov = this.gameplayFov;
      this.camera.updateProjectionMatrix();
    }

    this.cameraPivot.lerp(
      new THREE.Vector3(targetPos.x, targetPos.y + this.cameraHeight, targetPos.z),
      1.0 - Math.exp(-15 * dt)
    );

    const cosPitch = Math.cos(this.cameraPitch);
    const sinPitch = Math.sin(this.cameraPitch);
    const sinYaw = Math.sin(this.cameraYaw);
    const cosYaw = Math.cos(this.cameraYaw);

    const right = new THREE.Vector3(cosYaw, 0, -sinYaw);

    // Spring arm from the pivot (head height) to the over-the-shoulder spot. If visible level geometry is in the
    // way - the ground when standing on a lower platform, a cliff, a pillar - the arm shortens to just in front of
    // it, so the camera never sinks below the floor or into walls and pitch always responds.
    const armAt = (swing: number): ArmProbe => {
      const yaw = this.cameraYaw + swing;
      const sin = Math.sin(yaw), cos = Math.cos(yaw);
      const reach = new THREE.Vector3(sin * cosPitch, -sinPitch, cos * cosPitch).multiplyScalar(this.cameraDistance)
        .addScaledVector(new THREE.Vector3(cos, 0, -sin), this.cameraShoulderOffset);
      const length = reach.length();
      const dir = reach.divideScalar(length);
      const hit = this.physics.castCameraRay(this.cameraPivot, dir, length + CAMERA_PADDING);
      return { dir, length, target: hit === null ? length : hit - CAMERA_PADDING };
    };
    const nominal = armAt(0);
    // Only when even the shortest arm would sit inside the stone (or after such a swing, until it has turned back) does the
    // arm look elsewhere; everywhere else this is the one cast and the arm it always was.
    const probe = nominal.target < CAMERA_MIN_ARM || this.armSwing !== 0 ? this.swingArm(nominal, armAt, targetPos, dt) : nominal;
    const armDir = probe.dir;
    const target = Math.max(CAMERA_MIN_ARM, probe.target);
    // Pull in at once (never show the inside of a wall), ease back out when the way clears.
    this.armLength = target < this.armLength ? target : THREE.MathUtils.lerp(this.armLength, target, 1 - Math.exp(-6 * dt));
    this.camera.position.copy(this.cameraPivot).addScaledVector(armDir, this.armLength);

    const lookAtTarget = this.cameraPivot
      .clone()
      .addScaledVector(right, this.cameraShoulderOffset * 0.5);
    this.camera.lookAt(lookAtTarget);
    // Movement keeps the view the player steers by: a swing to get out of a pocket must not turn W (it comes back as the
    // pocket is left), so the view yaw is taken from where the usual arm would put the camera.
    const viewFrom = this.armSwing === 0 ? this.camera.position : this.cameraPivot.clone().addScaledVector(nominal.dir, this.armLength);
    const view = lookAtTarget.clone().sub(viewFrom);
    this.viewYaw = Math.atan2(-view.x, -view.z);

    this.focusKeyLight(targetPos);
  }

  /**
   * The usual arm has collapsed below CAMERA_MIN_ARM (or the camera is still turned away from it after that): picks the
   * arm to use. A swing that still has room and sees the hero is held until the usual arm has clearly cleared, then eased
   * back to nothing; a new one is the first of CAMERA_SWING that gives nearly the usual arm with him in view, else the roomiest
   * that has him in view, and the camera cuts straight to it (it was inside the stone anyway). Where nothing fits, the usual
   * arm and its clamp stay.
   */
  private swingArm(nominal: ArmProbe, armAt: (swing: number) => ArmProbe, hero: THREE.Vector3, dt: number): ArmProbe {
    const usable = (p: ArmProbe) => p.target >= CAMERA_MIN_ARM && this.heroInView(p, hero);
    if (this.armSwing !== 0) {
      if (nominal.target >= CAMERA_MIN_ARM + CAMERA_SWING_RELEASE) {
        const next = Math.abs(this.armSwing) < 0.02 ? 0 : this.armSwing * Math.exp(-5 * dt);
        const home = next === 0 ? nominal : armAt(next);
        if (next === 0 || usable(home)) { this.armSwing = next; return home; }
      }
      const held = armAt(this.armSwing);
      if (usable(held)) return held;
    }
    const sign = this.armSwing < 0 ? -1 : 1;
    let best: ArmProbe | null = null;
    let bestSwing = 0;
    for (const turn of CAMERA_SWING) {
      const swing = turn * sign;
      const p = armAt(swing);
      if (!usable(p)) continue;
      if (!best || p.target > best.target) { best = p; bestSwing = swing; }
      if (p.target >= p.length * CAMERA_SWING_ROOM) break;
    }
    if (!best) { this.armSwing = 0; return nominal; }
    this.armSwing = bestSwing;
    this.armLength = Math.min(best.target, best.length);
    return best;
  }

  /** The camera at the end of this arm has a clear line to the hero's head, chest and feet (physics only: nothing draws here). */
  private heroInView(p: ArmProbe, feet: THREE.Vector3): boolean {
    const cam = this.cameraPivot.clone().addScaledVector(p.dir, Math.max(CAMERA_MIN_ARM, Math.min(p.target, p.length)));
    const across = new THREE.Vector3(feet.z - cam.z, 0, cam.x - feet.x).normalize().multiplyScalar(CAMERA_VIEW_SIDE);
    const aim = new THREE.Vector3();
    for (const [lift, side] of [[1.55, -1], [1.55, 1], [1.0, 0], [0.25, 0]] as const) {
      aim.set(feet.x, feet.y + lift, feet.z).addScaledVector(across, side);
      const to = aim.clone().sub(cam);
      const distance = to.length();
      const hit = this.physics.castCameraRay(cam, to.divideScalar(distance), distance);
      if (hit !== null && hit < distance * CAMERA_VIEW_REACH) return false;
    }
    return true;
  }

  /**
   * The ground shakes at `origin` (a boss's roar as his second phase begins): an undirected shake, weaker the further
   * the camera is from it, and a low rumble in the controller.
   */
  public quake(origin: THREE.Vector3): void {
    const scale = THREE.MathUtils.clamp(1 - origin.distanceTo(this.camera.position) / 12, 0.35, 1);
    this.impact.impact('quake', this.camera, { scale });
    const [strong, weak, ms] = IMPACTS.quake.rumble;
    InputManager.getInstance().rumble(strong * scale, weak * scale, ms);
  }

  /** How far the follow camera sits from its pivot now (the spring arm, shortened by whatever is in the way). */
  public get arm(): number {
    return this.armLength;
  }

  /** Centres the shadow-casting key light (and its 40 m shadow box) on `point`. */
  public focusKeyLight(point: THREE.Vector3): void {
    this.dirLight.position.copy(point).add(this.keyLightOffset);
    this.dirLight.target.position.copy(point);
    this.dirLight.target.updateMatrixWorld();
  }

  /** Puts the follow camera straight behind a character facing `faceYaw`, with no easing (fight start, respawn). */
  public resetFollowCamera(targetPos: THREE.Vector3, faceYaw: number): void {
    this.cameraYaw = faceYaw + Math.PI;
    this.cameraPitch = -0.12;
    this.cameraPivot.set(targetPos.x, targetPos.y + this.cameraHeight, targetPos.z);
    this.armLength = this.cameraDistance;
    this.armSwing = 0;
  }

  private flashBase: { hemi: number; ambient: number } | null = null;

  /** Lightning: the sky light flares and flickers out (a brighter flash for a nearer strike). */
  public flash(strength = 1): void {
    const base = this.flashBase ?? { hemi: this.hemiLight.intensity, ambient: this.ambientLight.intensity };
    this.flashBase = base;
    const set = (k: number) => {
      this.hemiLight.intensity = base.hemi * (1 + k * 4 * strength);
      this.ambientLight.intensity = base.ambient * (1 + k * 3 * strength);
    };
    // A flare, a dip, a second flare, then out.
    ([[0, 1], [70, 0.2], [130, 0.75], [260, 0.3], [420, 0]] as const).forEach(([ms, k]) =>
      window.setTimeout(() => {
        set(k);
        if (k === 0) this.flashBase = null;
      }, ms));
  }

  public render(dt: number): void {
    this.postFX.render(dt);
  }
}

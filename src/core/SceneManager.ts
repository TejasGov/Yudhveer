import * as THREE from 'three';
import { PostFX } from './postfx/PostFX';
import { PhysicsWorld } from './PhysicsWorld';
import type { LevelAtmosphere } from '../levels/LevelTypes';
import { ImpactCamera, IMPACTS } from './ImpactCamera';
import { InputManager } from './InputManager';

// Spring-arm camera: gap kept in front of whatever blocks the arm, and the shortest the arm may get.
const CAMERA_PADDING = 0.3;
const CAMERA_MIN_ARM = 0.6;

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

    const backward = new THREE.Vector3(sinYaw * cosPitch, -sinPitch, cosYaw * cosPitch);
    const right = new THREE.Vector3(cosYaw, 0, -sinYaw);

    // Spring arm from the pivot (head height) to the over-the-shoulder spot. If visible level geometry is in the
    // way - the ground when standing on a lower platform, a cliff, a pillar - the arm shortens to just in front of
    // it, so the camera never sinks below the floor or into walls and pitch always responds.
    const arm = new THREE.Vector3().addScaledVector(backward, this.cameraDistance).addScaledVector(right, this.cameraShoulderOffset);
    const fullLength = arm.length();
    const armDir = arm.divideScalar(fullLength);
    const hit = this.physics.castCameraRay(this.cameraPivot, armDir, fullLength + CAMERA_PADDING);
    const target = hit === null ? fullLength : Math.max(CAMERA_MIN_ARM, hit - CAMERA_PADDING);
    // Pull in at once (never show the inside of a wall), ease back out when the way clears.
    this.armLength = target < this.armLength ? target : THREE.MathUtils.lerp(this.armLength, target, 1 - Math.exp(-6 * dt));
    this.camera.position.copy(this.cameraPivot).addScaledVector(armDir, this.armLength);

    const lookAtTarget = this.cameraPivot
      .clone()
      .addScaledVector(right, this.cameraShoulderOffset * 0.5);
    this.camera.lookAt(lookAtTarget);
    const view = lookAtTarget.clone().sub(this.camera.position);
    this.viewYaw = Math.atan2(-view.x, -view.z);

    this.focusKeyLight(targetPos);
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

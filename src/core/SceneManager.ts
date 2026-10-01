import * as THREE from 'three';
import gsap from 'gsap';
import { PostFX } from './postfx/PostFX';
import { PhysicsWorld } from './PhysicsWorld';
import type { LevelAtmosphere } from '../levels/LevelTypes';

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

  // Current spring-arm length (shortened when level geometry is in the way)
  private armLength = 3.4;
  private readonly physics = PhysicsWorld.getInstance();

  // Screen shake offset
  private shakeOffset = new THREE.Vector3();

  // Offset of the shadow-casting key light from the player; follows the level's moon or sun.
  private keyLightOffset = new THREE.Vector3(15, 25, 15);
  public readonly postFX: PostFX;

  private constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a101d);
    this.scene.fog = new THREE.FogExp2(0x0a101d, 0.02);

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
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
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.setHex(atm.fog.color);
    fog.density = atm.fog.density;
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
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.postFX.setSize(window.innerWidth, window.innerHeight);
  }

  public updateCamera(
    targetPos: THREE.Vector3,
    deltaX: number,
    deltaY: number,
    dt: number
  ): void {
    const mouseSensitivity = 0.0022;

    this.cameraYaw -= deltaX * mouseSensitivity;
    this.cameraPitch -= deltaY * mouseSensitivity;
    this.cameraPitch = Math.max(-1.1, Math.min(0.8, this.cameraPitch));

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
    this.camera.position.copy(this.cameraPivot).addScaledVector(armDir, this.armLength).add(this.shakeOffset);

    const lookAtTarget = this.cameraPivot
      .clone()
      .addScaledVector(right, this.cameraShoulderOffset * 0.5);
    this.camera.lookAt(lookAtTarget);

    this.dirLight.position.copy(targetPos).add(this.keyLightOffset);
    this.dirLight.target.position.copy(targetPos);
    this.dirLight.target.updateMatrixWorld();
  }

  public triggerScreenShake(intensity = 0.25, duration = 0.22): void {
    const shakeObj = { intensity };

    gsap.to(shakeObj, {
      intensity: 0,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        this.shakeOffset.set(
          (Math.random() - 0.5) * shakeObj.intensity,
          (Math.random() - 0.5) * shakeObj.intensity,
          (Math.random() - 0.5) * shakeObj.intensity
        );
      },
      onComplete: () => {
        this.shakeOffset.set(0, 0, 0);
      }
    });

    const overlay = document.getElementById('combat-fx-overlay');
    if (overlay) {
      overlay.style.backgroundColor = intensity > 0.3 ? 'rgba(255, 200, 0, 0.25)' : 'rgba(255, 50, 50, 0.2)';
      overlay.style.opacity = '1';
      setTimeout(() => {
        overlay.style.opacity = '0';
      }, duration * 400);
    }
  }

  public render(dt: number): void {
    this.postFX.render(dt);
  }
}

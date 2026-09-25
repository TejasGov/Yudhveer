import * as THREE from 'three';
import gsap from 'gsap';

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

  // Screen shake offset
  private shakeOffset = new THREE.Vector3();

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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
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

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  public static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }

  public setLevelAtmosphere(levelIndex: number): void {
    if (levelIndex === 1) {
      // Moonlit Baoli
      this.scene.background = new THREE.Color(0x08101e);
      (this.scene.fog as THREE.FogExp2).color.setHex(0x08101e);
      this.ambientLight.color.setHex(0x7ea0d6);
      this.dirLight.color.setHex(0xc8dcff);
      this.dirLight.intensity = 1.9;
    } else if (levelIndex === 2) {
      // Mandapa of Pillars
      this.scene.background = new THREE.Color(0x16120d);
      (this.scene.fog as THREE.FogExp2).color.setHex(0x16120d);
      this.ambientLight.color.setHex(0xd4af37);
      this.dirLight.color.setHex(0xffe2b8);
      this.dirLight.intensity = 2.2;
    } else if (levelIndex === 3) {
      // Garbhagriha Sanctum
      this.scene.background = new THREE.Color(0x120808);
      (this.scene.fog as THREE.FogExp2).color.setHex(0x120808);
      this.ambientLight.color.setHex(0xff5522);
      this.dirLight.color.setHex(0xff8844);
      this.dirLight.intensity = 2.4;
    }
  }

  public mount(container: HTMLElement): void {
    container.appendChild(this.renderer.domElement);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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

    const desiredCameraPos = this.cameraPivot
      .clone()
      .addScaledVector(backward, this.cameraDistance)
      .addScaledVector(right, this.cameraShoulderOffset)
      .add(this.shakeOffset);

    if (desiredCameraPos.y < 0.4) {
      desiredCameraPos.y = 0.4;
    }

    this.camera.position.copy(desiredCameraPos);

    const lookAtTarget = this.cameraPivot
      .clone()
      .addScaledVector(right, this.cameraShoulderOffset * 0.5);
    this.camera.lookAt(lookAtTarget);

    this.dirLight.position.set(targetPos.x + 15, targetPos.y + 25, targetPos.z + 15);
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

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

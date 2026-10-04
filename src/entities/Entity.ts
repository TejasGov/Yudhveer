import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Entity {
  public id: string;
  public group: THREE.Group;
  public modelGroup: THREE.Group;
  public rigidBody: RAPIER.RigidBody | null = null;
  public collider: RAPIER.Collider | null = null;
  
  // Socket attachments for weapons, shields, VFX
  public sockets: Map<string, THREE.Object3D> = new Map();
  public currentModel: THREE.Object3D | null = null;
  public mixer: THREE.AnimationMixer | null = null;
  public animations: Map<string, THREE.AnimationClip> = new Map();

  constructor(id: string) {
    this.id = id;
    this.group = new THREE.Group();
    // Gameplay reads and writes the heading as `group.rotation.y`, while rendering interpolates `group.quaternion`.
    // Converting a quaternion back to the default XYZ order turns any heading past +-90 degrees into
    // (PI, PI - yaw, PI), so `rotation.y` would be wrong and characters would turn the wrong way. In YXZ order a pure
    // heading always comes back as (0, yaw, 0).
    this.group.rotation.order = 'YXZ';
    this.modelGroup = new THREE.Group();
    this.group.add(this.modelGroup);

    this.initSockets();
  }

  protected initSockets(): void {
    const rightHandSocket = new THREE.Object3D();
    rightHandSocket.name = 'mixamorigRightHand';
    this.modelGroup.add(rightHandSocket);
    this.sockets.set('mixamorigRightHand', rightHandSocket);

    const leftHandSocket = new THREE.Object3D();
    leftHandSocket.name = 'mixamorigLeftHand';
    this.modelGroup.add(leftHandSocket);
    this.sockets.set('mixamorigLeftHand', leftHandSocket);

    const headSocket = new THREE.Object3D();
    headSocket.name = 'mixamorigHead';
    this.modelGroup.add(headSocket);
    this.sockets.set('mixamorigHead', headSocket);
  }

  public getSocket(name: string): THREE.Object3D | null {
    return this.sockets.get(name) || null;
  }

  public attachToSocket(socketName: string, object: THREE.Object3D): void {
    const socket = this.getSocket(socketName);
    if (socket) {
      socket.add(object);
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
    if (this.rigidBody) {
      this.rigidBody.setTranslation({ x, y, z }, true);
    }
  }

  public getRotation(): THREE.Euler {
    return this.group.rotation;
  }

  /**
   * Hot-Swappable GLB Loader:
   * Replaces primitive geometry while preserving physics, state machines, and socket attachments.
   */
  public async loadGLBModel(path: string): Promise<boolean> {
    const loader = new GLTFLoader();
    return new Promise((resolve) => {
      loader.load(
        path,
        (gltf) => {
          // Store existing socket children before swapping
          const preservedAttachments: { socketName: string; children: THREE.Object3D[] }[] = [];
          this.sockets.forEach((socket, name) => {
            const children = [...socket.children];
            preservedAttachments.push({ socketName: name, children });
          });

          // Remove old model
          if (this.currentModel) {
            this.modelGroup.remove(this.currentModel);
            this.currentModel.traverse((child) => {
              if ((child as THREE.Mesh).geometry) {
                (child as THREE.Mesh).geometry.dispose();
              }
            });
          }

          this.currentModel = gltf.scene;
          this.currentModel.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
            // Bind bones to sockets if name matches
            if (this.sockets.has(child.name)) {
              this.sockets.set(child.name, child);
            }
          });

          this.modelGroup.add(this.currentModel);

          // Restore weapon socket attachments to new bones/nodes
          preservedAttachments.forEach(({ socketName, children }) => {
            const socket = this.getSocket(socketName);
            if (socket) {
              children.forEach((c) => socket.add(c));
            }
          });

          // Animation mixer setup if GLB contains skeletal clips
          if (gltf.animations && gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.currentModel);
            gltf.animations.forEach((clip) => {
              this.animations.set(clip.name, clip);
            });
          }

          console.log(`[Entity ${this.id}] Successfully loaded GLB model: ${path}`);
          resolve(true);
        },
        undefined,
        (error) => {
          console.warn(`[Entity ${this.id}] Failed to load GLB: ${path}`, error);
          resolve(false);
        }
      );
    });
  }

  public update(dt: number): void {
    if (this.mixer) {
      this.mixer.update(dt);
    }
  }
}

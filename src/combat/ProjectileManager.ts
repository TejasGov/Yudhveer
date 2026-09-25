import * as THREE from 'three';
import { Player } from '../entities/Player';
import { SoundFX } from './SoundFX';
import { ParticleFX } from './ParticleFX';

export interface Projectile {
  id: string;
  type: 'CHAKRAM' | 'FLAME_WAVE';
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  damage: number;
  postureDamage: number;
  life: number;
  maxLife: number;
  ownerId: string;
  isParried: boolean;
}

export class ProjectileManager {
  private static instance: ProjectileManager | null = null;
  public scene: THREE.Scene | null = null;
  public projectiles: Projectile[] = [];
  private soundFX: SoundFX;
  private particleFX: ParticleFX;

  private constructor() {
    this.soundFX = SoundFX.getInstance();
    this.particleFX = ParticleFX.getInstance();
  }

  public static getInstance(): ProjectileManager {
    if (!ProjectileManager.instance) {
      ProjectileManager.instance = new ProjectileManager();
    }
    return ProjectileManager.instance;
  }

  public init(scene: THREE.Scene): void {
    this.scene = scene;
  }

  public spawnChakram(origin: THREE.Vector3, targetPos: THREE.Vector3, ownerId: string): void {
    if (!this.scene) return;

    // Glowing golden sharpened ring
    const ringGeo = new THREE.TorusGeometry(0.38, 0.05, 8, 24);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xffaa00,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.position.copy(origin);
    mesh.rotation.x = Math.PI / 2;
    this.scene.add(mesh);

    const dir = new THREE.Vector3().subVectors(targetPos, origin);
    dir.y = 0; // Flat flight
    dir.normalize();

    const speed = 12.0;

    this.projectiles.push({
      id: `chakram_${Date.now()}_${Math.random()}`,
      type: 'CHAKRAM',
      mesh,
      position: mesh.position,
      velocity: dir.multiplyScalar(speed),
      radius: 0.45,
      damage: 16,
      postureDamage: 25,
      life: 0,
      maxLife: 3.5,
      ownerId,
      isParried: false
    });

    this.soundFX.playChakramThrow();
  }

  public spawnFlameWave(origin: THREE.Vector3, forwardDir: THREE.Vector3, ownerId: string): void {
    if (!this.scene) return;

    const waveGroup = new THREE.Group();
    waveGroup.position.copy(origin);

    const arcGeo = new THREE.TorusGeometry(1.5, 0.2, 8, 16, Math.PI * 0.7);
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.85
    });
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.rotation.x = Math.PI / 2;
    waveGroup.add(arcMesh);

    this.scene.add(waveGroup);

    const speed = 9.5;
    const dir = forwardDir.clone().normalize();

    this.projectiles.push({
      id: `flamewave_${Date.now()}_${Math.random()}`,
      type: 'FLAME_WAVE',
      mesh: waveGroup,
      position: waveGroup.position,
      velocity: dir.multiplyScalar(speed),
      radius: 1.5,
      damage: 28,
      postureDamage: 40,
      life: 0,
      maxLife: 2.2,
      ownerId,
      isParried: false
    });

    this.soundFX.playFlameBurst();
  }

  public update(dt: number, player: Player): void {
    const playerPos = player.getPosition().clone().add(new THREE.Vector3(0, 0.9, 0));

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.destroyProjectile(i);
        continue;
      }

      // Move projectile
      p.position.addScaledVector(p.velocity, dt);

      // Mesh animations
      if (p.type === 'CHAKRAM') {
        p.mesh.rotation.z += 25 * dt;
        this.particleFX.spawnSparks(p.position, 1, true);
      } else if (p.type === 'FLAME_WAVE') {
        p.mesh.scale.addScalar(0.8 * dt);
        this.particleFX.spawnFlames(p.position, 4, 0.8);
      }

      // Check collision with Player
      if (!p.isParried && p.ownerId !== player.id) {
        const dist = p.position.distanceTo(playerPos);
        if (dist <= p.radius + 0.5) {
          // Check Player Defense
          if (player.stateMachine.isInvulnerable) {
            // Player successfully dodged through
            continue;
          }

          if (player.stateMachine.currentState === 'PARRY' && player.stateMachine.isParryActive) {
            // Deflected projectile!
            p.isParried = true;
            p.velocity.negate().multiplyScalar(1.2);
            p.ownerId = player.id;
            this.soundFX.playParryClash();
            this.particleFX.spawnSparks(p.position, 40, true);
            this.particleFX.spawnDeflectionShockwave(p.position);
            continue;
          }

          // Direct Hit on Player
          player.takeDamage(p.damage);
          player.addMarmaDamage(p.postureDamage);
          player.stateMachine.changeState('STAGGER');
          this.soundFX.playHitImpact();
          this.particleFX.spawnSparks(p.position, 25, false);

          this.destroyProjectile(i);
        }
      }
    }
  }

  private destroyProjectile(index: number): void {
    const p = this.projectiles[index];
    if (this.scene && p.mesh) {
      this.scene.remove(p.mesh);
      p.mesh.traverse((c) => {
        if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
      });
    }
    this.projectiles.splice(index, 1);
  }

  public clear(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.destroyProjectile(i);
    }
  }
}

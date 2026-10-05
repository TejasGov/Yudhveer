import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import { SoundFX } from './SoundFX';
import { ParticleFX } from './ParticleFX';
import { SceneManager } from '../core/SceneManager';

export interface Projectile {
  id: string;
  type: 'CHAKRAM' | 'FLAME_WAVE' | 'ORB';
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
  /** How each projectile that reached the player was met (stats, callouts). */
  public onPlayerContact: ((result: 'deflected' | 'blocked' | 'hit') => void) | null = null;

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
    const ringGeo = new THREE.TorusGeometry(0.24, 0.035, 8, 24);
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

  /** A bolt of fire from a sorcerer's hand, flying straight at `targetPos` (deflectable like a chakram). */
  public spawnOrb(origin: THREE.Vector3, targetPos: THREE.Vector3, ownerId: string): void {
    if (!this.scene) return;
    const group = new THREE.Group();
    group.position.copy(origin);
    // An unlit HDR core (it blooms) inside a soft additive halo.
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.1, 3.2) }));
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 10),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.25, 1), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    group.add(core, halo);
    this.scene.add(group);
    SceneManager.getInstance().postFX.addBloom(core);
    const dir = new THREE.Vector3().subVectors(targetPos, origin).normalize();
    this.projectiles.push({
      id: `orb_${Date.now()}_${Math.random()}`,
      type: 'ORB',
      mesh: group,
      position: group.position,
      velocity: dir.multiplyScalar(11),
      radius: 0.3,
      damage: 18,
      postureDamage: 28,
      life: 0,
      maxLife: 3,
      ownerId,
      isParried: false,
    });
    this.soundFX.playMagicBolt();
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

  public update(dt: number, player: Player, enemies: Enemy[] = []): void {
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
      } else if (p.type === 'ORB') {
        const pulse = 1 + Math.sin(p.life * 30) * 0.12;
        p.mesh.scale.setScalar(pulse);
        if (Math.random() < 0.6) this.particleFX.spawnSparks(p.position, 1, false);
      } else if (p.type === 'FLAME_WAVE') {
        p.mesh.scale.addScalar(0.8 * dt);
        this.particleFX.spawnFlames(p.position, 4, 0.8);
      }

      // A deflected projectile flies back and hurts whoever it reaches.
      if (p.isParried && this.hitEnemy(p, enemies)) {
        this.destroyProjectile(i);
        continue;
      }

      // Check collision with Player
      // Under a slide, bolts and fire pass over.
      if (!p.isParried && p.ownerId !== player.id && player.stateMachine.currentState !== 'DEAD' && !player.isEvading()) {
        const dist = p.position.distanceTo(playerPos);
        if (dist <= p.radius + 0.5) {
          // Check Player Defense
          if (player.stateMachine.currentState === 'PARRY' && player.stateMachine.isParryActive) {
            // Deflected projectile!
            p.isParried = true;
            p.velocity.negate().multiplyScalar(1.2);
            p.ownerId = player.id;
            this.soundFX.playParryClash();
            this.particleFX.spawnSparks(p.position, 40, true);
            this.particleFX.spawnDeflectionShockwave(p.position);
            this.onPlayerContact?.('deflected');
            continue;
          }

          if (player.isGuarding() && player.isFacing(p.position)) {
            // Caught on the raised dhal
            player.takeDamage(p.damage * 0.2);
            if (!player.addMarmaDamage(p.postureDamage * 1.25)) player.stateMachine.changeState('BLOCK_HIT');
            this.soundFX.playShieldBlock();
            this.particleFX.spawnSparks(p.position, 18, false);
            this.onPlayerContact?.('blocked');
            this.destroyProjectile(i);
            continue;
          }

          // Direct Hit on Player
          player.takeDamage(p.damage);
          if (!player.addMarmaDamage(p.postureDamage) && player.currentHealth > 0) {
            player.stateMachine.changeState('STAGGER');
          }
          this.soundFX.playHitImpact();
          this.particleFX.spawnSparks(p.position, 25, false);
          this.onPlayerContact?.('hit');

          this.destroyProjectile(i);
        }
      }
    }
  }

  /** A returned projectile against the enemies' bodies: hits the first it reaches. */
  private hitEnemy(p: Projectile, enemies: Enemy[]): boolean {
    for (const enemy of enemies) {
      if (enemy.stateMachine.currentState === 'DEAD') continue;
      const body = enemy.hurtCapsule();
      const centre = body.a.clone().add(body.b).multiplyScalar(0.5);
      if (centre.distanceTo(p.position) > p.radius + body.radius + 0.4) continue;
      enemy.takeDamage(p.damage * 1.5);
      const broken = enemy.addMarmaDamage(p.postureDamage * 1.5);
      if (!broken && !enemy.heavyPoise && enemy.currentHealth > 0) enemy.stateMachine.changeState('STAGGER');
      this.soundFX.playHitImpact();
      this.particleFX.spawnSparks(p.position, 35, true);
      return true;
    }
    return false;
  }

  private destroyProjectile(index: number): void {
    const p = this.projectiles[index];
    if (this.scene && p.mesh) {
      p.mesh.traverse((c) => SceneManager.getInstance().postFX.removeBloom(c));
      this.scene.remove(p.mesh);
      p.mesh.traverse((c) => {
        const mesh = c as THREE.Mesh;
        mesh.geometry?.dispose();
        (mesh.material as THREE.Material | undefined)?.dispose();
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

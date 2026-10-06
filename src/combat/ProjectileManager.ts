import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import { SoundFX } from './SoundFX';
import { Emitter, ParticleFX } from './ParticleFX';
import { SceneManager } from '../core/SceneManager';
import { FireField, type FireSpot } from '../levels/environment/FireField';

/** A wave of fire, its flames along an arc bowed forward: how wide the arc is (radians) and its radius (metres). */
const WAVE_ARC = Math.PI * 0.7;
const WAVE_RADIUS = 1.5;
const WAVE_FLAMES = 13;
/**
 * The naga king's fire: deeper and more saturated than a lamp's, so it stays fire-coloured in Dwarka's grey storm light
 * and its AgX grade (which bleaches bright oranges: the village's colours wash out there to a pale peach, and hotter
 * ones only go whiter).
 */
const WAVE_PALETTE = {
  rim: new THREE.Color(0.85, 0.06, 0.0),
  body: new THREE.Color(1.75, 0.3, 0.0),
  core: new THREE.Color(2.4, 0.95, 0.08),
  glow: new THREE.Color(1.8, 0.42, 0.03),
};
/** How far above the floor a wave flies (Takshaka breathes it from 0.2 m up). */
const WAVE_HEIGHT = 0.2;

/** A wave of fire's own: its flames, the arc they stand on (in the wave's space), its clock and its trail. */
interface WaveFire {
  field: FireField;
  arc: THREE.Vector3[];
  time: number;
  /** Seconds to the next scorch mark, and the licks and embers it throws. */
  scorch: number;
  licks: Emitter;
  embers: Emitter;
  yaw: number;
}

/**
 * What a bolt and a shaft are made of, made once and kept for the session (milestone 12): every shot used to build its
 * own spheres and materials and free them when it ended, and the last one of a kind taking its shader program with it,
 * so each hurler's firebrand (and each bolt) compiled a program again in the middle of the fight (a frame of 100 ms or
 * more). `ProjectileManager.anchor` draws one of each under the loading screen and keeps them in the scene.
 */
interface Parts {
  orbCore: THREE.Mesh;
  orbHalo: THREE.Mesh;
  arrowShaft: THREE.Mesh;
  arrowHead: THREE.Mesh;
}
let parts: Parts | null = null;

function sharedParts(): Parts {
  if (parts) return parts;
  const make = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
    geometry.userData.shared = true;
    material.userData.shared = true;
    return new THREE.Mesh(geometry, material);
  };
  parts = {
    orbCore: make(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.1, 3.2) })),
    orbHalo: make(
      new THREE.SphereGeometry(0.24, 12, 10),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.25, 1), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }),
    ),
    arrowShaft: make(new THREE.CylinderGeometry(0.018, 0.018, 0.75, 5), new THREE.MeshBasicMaterial({ color: 0x2a1a10 })),
    arrowHead: make(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.9, 0.2) })),
  };
  return parts;
}

/** A shot's own mesh from a shared piece: the same geometry and material, a transform of its own. */
function instance(piece: THREE.Mesh): THREE.Mesh {
  const mesh = new THREE.Mesh(piece.geometry, piece.material);
  mesh.userData.shared = true;
  return mesh;
}

export interface Projectile {
  id: string;
  type: 'CHAKRAM' | 'FLAME_WAVE' | 'ORB' | 'ARROW';
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  damage: number;
  postureDamage: number;
  /**
   * How hard it lands on the hero as a multiple of `damage` and `postureDamage`: its caster's `damageScale` (milestone 12:
   * a bolt is one of its caster's blows, so a weak caster's bolts are weak too). A bolt deflected back hurts by `damage`
   * whoever cast it.
   */
  scale: number;
  life: number;
  maxLife: number;
  ownerId: string;
  isParried: boolean;
  /** A wave of fire's flames (FLAME_WAVE only). */
  fire?: WaveFire;
}

export class ProjectileManager {
  private static instance: ProjectileManager | null = null;
  public scene: THREE.Scene | null = null;
  public projectiles: Projectile[] = [];
  private soundFX: SoundFX;
  private particleFX: ParticleFX;
  /** Scorched stone where waves of fire have passed. */
  private readonly scorches = new Scorches();
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
    scene.add(this.scorches.mesh);
    // One of each kind of bolt stays in the scene, hidden: it keeps their shader programs alive, and the loading screen's
    // warm-up frame (Engine.warmUp) draws it, so the first shot of a fight compiles nothing.
    const shared = sharedParts();
    const anchor = new THREE.Group();
    anchor.name = 'ProjectileAnchor';
    for (const piece of [shared.orbCore, shared.orbHalo, shared.arrowShaft, shared.arrowHead]) {
      const mesh = instance(piece);
      mesh.position.set(0, -500, 0);
      mesh.frustumCulled = false;
      anchor.add(mesh);
    }
    anchor.visible = false;
    scene.add(anchor);
    this.anchor = anchor;
  }

  /** Hidden anchors holding the bolts' programs (see `init`). */
  private anchor: THREE.Group | null = null;

  /** Shows the anchors for the loading screen's warm-up frame (they are drawn once, far below the world), then hides them. */
  public warm(draw: () => void): void {
    if (!this.anchor) return;
    this.anchor.visible = true;
    try {
      draw();
    } finally {
      this.anchor.visible = false;
    }
  }

  public spawnChakram(origin: THREE.Vector3, targetPos: THREE.Vector3, ownerId: string, scale = 1): void {
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
      scale,
      life: 0,
      maxLife: 3.5,
      ownerId,
      isParried: false
    });

    this.soundFX.playChakramThrow();
  }

  /** A bolt of fire from a sorcerer's hand, flying straight at `targetPos` (deflectable like a chakram). */
  public spawnOrb(origin: THREE.Vector3, targetPos: THREE.Vector3, ownerId: string, scale = 1): void {
    if (!this.scene) return;
    const group = new THREE.Group();
    group.position.copy(origin);
    // An unlit HDR core (it blooms) inside a soft additive halo.
    const shared = sharedParts();
    const core = instance(shared.orbCore);
    const halo = instance(shared.orbHalo);
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
      scale,
      life: 0,
      maxLife: 3,
      ownerId,
      isParried: false,
    });
    this.soundFX.playMagicBolt();
  }

  /**
   * A shaft of fire from a cave archer, the hurlers' firebrand (Chapter III): fast and straight at `targetPos`, its
   * burning head first. Deflectable like the others.
   */
  public spawnArrow(origin: THREE.Vector3, targetPos: THREE.Vector3, ownerId: string, scale = 1): void {
    if (!this.scene) return;
    const group = new THREE.Group();
    group.position.copy(origin);
    // Along local +Z: a dark shaft, and an unlit burning head (it blooms) at the front.
    const shared = sharedParts();
    const shaft = instance(shared.arrowShaft);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -0.2;
    const head = instance(shared.arrowHead);
    head.scale.set(1, 1, 2.2);
    head.position.z = 0.2;
    group.add(shaft, head);
    this.scene.add(group);
    SceneManager.getInstance().postFX.addBloom(head);
    const dir = new THREE.Vector3().subVectors(targetPos, origin).normalize();
    group.lookAt(origin.clone().add(dir));
    this.projectiles.push({
      id: `arrow_${Date.now()}_${Math.random()}`,
      type: 'ARROW',
      mesh: group,
      position: group.position,
      velocity: dir.multiplyScalar(17),
      radius: 0.22,
      damage: 13,
      postureDamage: 20,
      scale,
      life: 0,
      maxLife: 2.2,
      ownerId,
      isParried: false,
    });
    this.soundFX.playSwordSwing(1.6, 'blade');
  }

  /**
   * Takshaka's breath: a wave of fire running along the ground (docs/STORY.md, "Real fire everywhere"). Its flames stand
   * on an arc bowed forward, its middle where it is and its ends trailing back, tallest in the middle; they flare up as
   * it is breathed, trail back as it runs, throw licks and embers, scorch the stone behind them, and die down at the end
   * of its run. The arc spreads as it goes (the flames keep their height). One instanced draw, in the bloom.
   */
  public spawnFlameWave(origin: THREE.Vector3, forwardDir: THREE.Vector3, ownerId: string, scale = 1): void {
    if (!this.scene) return;

    const waveGroup = new THREE.Group();
    waveGroup.position.copy(origin);

    const dir = forwardDir.clone().setY(0);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    dir.normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const arc: THREE.Vector3[] = [];
    const spots: FireSpot[] = [];
    for (let i = 0; i < WAVE_FLAMES; i++) {
      // Uneven: each flame a little off its place on the arc and of its own height, tallest toward the middle.
      const u = (i + (Math.random() - 0.5) * 0.6) / (WAVE_FLAMES - 1) - 0.5;
      const a = u * WAVE_ARC;
      const r = WAVE_RADIUS + (Math.random() - 0.5) * 0.25;
      const at = dir.clone().multiplyScalar(r * Math.cos(a) - WAVE_RADIUS).addScaledVector(side, r * Math.sin(a)).setY(-WAVE_HEIGHT);
      arc.push(at);
      const middle = 1 - Math.min(1, Math.abs(u) * 2);
      spots.push({ at, size: 0.55 + 0.55 * middle + Math.random() * 0.35, group: 'wave', tongues: 2 + (Math.random() < 0.5 ? 1 : 0), spread: 0.18, width: 0.62 });
    }
    const field = new FireField(spots, { palette: WAVE_PALETTE });
    // Carried through still air at speed, its flames trail back (without guttering).
    field.setWind(-dir.x * 3.6, -dir.z * 3.6, false);
    field.set('wave', 0);
    waveGroup.add(field.mesh);
    SceneManager.getInstance().postFX.addBloom(field.mesh);

    this.scene.add(waveGroup);

    const speed = 9.5;

    this.projectiles.push({
      id: `flamewave_${Date.now()}_${Math.random()}`,
      type: 'FLAME_WAVE',
      mesh: waveGroup,
      position: waveGroup.position,
      velocity: dir.clone().multiplyScalar(speed),
      radius: 1.5,
      damage: 28,
      postureDamage: 40,
      scale,
      life: 0,
      maxLife: 2.2,
      ownerId,
      isParried: false,
      fire: { field, arc, time: 0, scorch: 0.05, licks: new Emitter(), embers: new Emitter(), yaw: Math.atan2(dir.x, dir.z) },
    });

    this.soundFX.playFlameBurst();
  }

  /** A wave of fire as it runs: its flames, the licks and embers off it, the scorch it leaves. */
  private burnWave(p: Projectile, dt: number): void {
    const fire = p.fire;
    // It spreads as it goes, sideways and along; its flames keep their height and stay on the floor.
    p.mesh.scale.x += 0.8 * dt;
    p.mesh.scale.z += 0.8 * dt;
    if (!fire) return;
    fire.time += dt;
    // Up in a flash as it is breathed, dying down over the last of its run.
    fire.field.set('wave', 1.15 * Math.min(1, p.life / 0.12) * Math.min(1, Math.max(0, p.maxLife - p.life) / 0.35));
    fire.field.update(fire.time);
    p.mesh.updateMatrixWorld();
    const onArc = () => p.mesh.localToWorld(fire.arc[Math.floor(Math.random() * fire.arc.length)].clone());
    for (let n = fire.licks.take(22, dt); n > 0; n--) this.particleFX.spawnFlames(onArc().setY(p.position.y + 0.1), 1, 0.4);
    for (let n = fire.embers.take(45, dt); n > 0; n--) this.particleFX.spawnEmbers(onArc(), 1, 0.4, 1.4);
    fire.scorch -= dt;
    if (fire.scorch <= 0 && p.life < p.maxLife - 0.25) {
      fire.scorch = 0.09;
      // Under the flames, just behind the arc's middle: as wide as the arc is now.
      const at = p.position.clone().addScaledVector(p.velocity, -0.06 / Math.max(1e-3, p.velocity.length()));
      at.y -= WAVE_HEIGHT - 0.012;
      this.scorches.add(at, fire.yaw, WAVE_RADIUS * 2 * Math.sin(WAVE_ARC / 2) * p.mesh.scale.x * 0.9);
    }
  }

  public update(dt: number, player: Player, enemies: Enemy[] = []): void {
    const playerPos = player.getPosition().clone().add(new THREE.Vector3(0, 0.9, 0));
    this.scorches.update(dt);

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
      } else if (p.type === 'ARROW') {
        // Point along the flight (a parried shaft turns round); a few sparks off its burning head.
        p.mesh.lookAt(p.position.x + p.velocity.x, p.position.y + p.velocity.y, p.position.z + p.velocity.z);
        if (Math.random() < 0.35) this.particleFX.spawnSparks(p.position, 1, false);
      } else if (p.type === 'FLAME_WAVE') {
        this.burnWave(p, dt);
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
            player.takeDamage(p.damage * p.scale * 0.2);
            if (!player.addMarmaDamage(p.postureDamage * p.scale * 1.25)) player.stateMachine.changeState('BLOCK_HIT');
            this.soundFX.playShieldBlock();
            this.particleFX.spawnSparks(p.position, 18, false);
            this.onPlayerContact?.('blocked');
            this.destroyProjectile(i);
            continue;
          }

          // Direct Hit on Player
          player.takeDamage(p.damage * p.scale);
          if (!player.addMarmaDamage(p.postureDamage * p.scale) && player.currentHealth > 0) {
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
        // (The bolts' own pieces are shared and stay: see `sharedParts`. A wave's flames are its own.)
        if (mesh.userData.shared) return;
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
    this.scorches.clear();
  }
}

/**
 * Scorched stone where a wave of fire passed: ragged soot with a dull ember glow in it that cools at once, the soot
 * fading in a second or two. Flat on the floor; one instanced draw for every mark, drawn only while any shows.
 */
class Scorches {
  public readonly mesh: THREE.InstancedMesh;
  private readonly marks: { matrix: THREE.Matrix4; age: number; seed: number }[] = [];
  private readonly ages: THREE.InstancedBufferAttribute;
  private readonly seeds: THREE.InstancedBufferAttribute;
  private static readonly MAX = 48;
  private static readonly LIFE = 1.7;

  constructor() {
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.ages = new THREE.InstancedBufferAttribute(new Float32Array(Scorches.MAX), 1).setUsage(THREE.DynamicDrawUsage);
    this.seeds = new THREE.InstancedBufferAttribute(new Float32Array(Scorches.MAX), 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aAge', this.ages);
    geo.setAttribute('aSeed', this.seeds);
    const material = new THREE.ShaderMaterial({
      name: 'Scorch',
      uniforms: { uLife: { value: Scorches.LIFE } },
      vertexShader: /* glsl */ `
        attribute float aAge;
        attribute float aSeed;
        varying vec2 vUv;
        varying float vAge;
        varying float vSeed;
        void main() {
          vUv = uv;
          vAge = aAge;
          vSeed = aSeed;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uLife;
        varying vec2 vUv;
        varying float vAge;
        varying float vSeed;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
        }
        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float n = noise(vUv * vec2(9.0, 4.0) + vSeed * 17.0) * 0.6 + noise(vUv * vec2(23.0, 11.0) - vSeed * 9.0) * 0.4;
          // A ragged oval of soot, eaten away at its edges (and more as it fades).
          float k = vAge / uLife;
          float d = length(p) + (n - 0.5) * 0.55 + k * 0.35;
          float soot = 1.0 - smoothstep(0.55, 0.95, d);
          if (soot < 0.01) discard;
          // Embers in the char, cooling fast.
          float hot = smoothstep(0.62, 0.86, n) * (1.0 - smoothstep(0.0, 0.45, vAge)) * soot;
          vec3 col = vec3(0.035, 0.022, 0.014) + vec3(2.2, 0.55, 0.08) * hot;
          gl_FragColor = vec4(col, soot * 0.72 * (1.0 - smoothstep(0.55, 1.0, k)));
        }`,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.InstancedMesh(geo, material, Scorches.MAX);
    this.mesh.name = 'Scorches';
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.visible = false;
  }

  /** A mark centred at `at` (on the floor), across the way a wave ran (`yaw`), `width` metres wide. */
  public add(at: THREE.Vector3, yaw: number, width: number): void {
    if (this.marks.length >= Scorches.MAX) this.marks.shift();
    const matrix = new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(width, 1, 1.1));
    this.marks.push({ matrix, age: 0, seed: Math.random() * 10 });
  }

  public update(dt: number): void {
    for (let i = this.marks.length - 1; i >= 0; i--) {
      this.marks[i].age += dt;
      if (this.marks[i].age >= Scorches.LIFE) this.marks.splice(i, 1);
    }
    this.marks.forEach((m, i) => {
      this.mesh.setMatrixAt(i, m.matrix);
      this.ages.setX(i, m.age);
      this.seeds.setX(i, m.seed);
    });
    this.mesh.count = this.marks.length;
    this.mesh.visible = this.marks.length > 0;
    if (this.marks.length) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.ages.needsUpdate = true;
      this.seeds.needsUpdate = true;
    }
  }

  public clear(): void {
    this.marks.length = 0;
    this.mesh.count = 0;
    this.mesh.visible = false;
  }
}

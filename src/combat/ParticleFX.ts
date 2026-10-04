import * as THREE from 'three';

interface SparkParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface ShockwaveRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  startScale: number;
  endScale: number;
}

interface DustParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
  opacity: number;
}

interface FlameParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface MistParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
  opacity: number;
}

export class ParticleFX {
  private static instance: ParticleFX | null = null;
  public scene: THREE.Scene | null = null;

  // Sparks
  private sparks: SparkParticle[] = [];
  private sparkGeo: THREE.BufferGeometry;
  private sparkMat: THREE.PointsMaterial;
  private sparkPoints: THREE.Points;
  private sparkPositions: Float32Array;
  private sparkColors: Float32Array;
  private sparkMaxCount = 600;

  // Dust
  private dustPuffs: DustParticle[] = [];
  private dustGeo: THREE.BufferGeometry;
  private dustMat: THREE.PointsMaterial;
  private dustPoints: THREE.Points;
  private dustPositions: Float32Array;
  private dustMaxCount = 300;

  // Flames & Embers (Level 3 Sanctum / Boss)
  private flames: FlameParticle[] = [];
  private flameGeo: THREE.BufferGeometry;
  private flameMat: THREE.PointsMaterial;
  private flamePoints: THREE.Points;
  private flamePositions: Float32Array;
  private flameColors: Float32Array;
  private flameMaxCount = 500;

  // Mist & Fog (Level 1 Baoli)
  private mist: MistParticle[] = [];
  private mistGeo: THREE.BufferGeometry;
  private mistMat: THREE.PointsMaterial;
  private mistPoints: THREE.Points;
  private mistPositions: Float32Array;
  private mistMaxCount = 200;

  // Shockwaves
  private shockwaves: ShockwaveRing[] = [];
  private shockwaveGeo: THREE.RingGeometry;
  private shockwaveMat: THREE.MeshBasicMaterial;

  private constructor() {
    // Every particle is a soft round dot rather than a hard square.
    const dot = createSoftDot();
    // Sparks setup
    this.sparkPositions = new Float32Array(this.sparkMaxCount * 3);
    this.sparkColors = new Float32Array(this.sparkMaxCount * 3);
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    this.sparkGeo.setAttribute('color', new THREE.BufferAttribute(this.sparkColors, 3));

    this.sparkMat = new THREE.PointsMaterial({
      map: dot,
      alphaTest: 0.01,
      size: 0.17,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sparkPoints = new THREE.Points(this.sparkGeo, this.sparkMat);

    // Dust setup
    this.dustPositions = new Float32Array(this.dustMaxCount * 3);
    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    this.dustMat = new THREE.PointsMaterial({
      map: dot,
      alphaTest: 0.01,
      size: 0.38,
      color: 0xd4b483,
      transparent: true,
      opacity: 0.4,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
    this.dustPoints = new THREE.Points(this.dustGeo, this.dustMat);

    // Flames setup
    this.flamePositions = new Float32Array(this.flameMaxCount * 3);
    this.flameColors = new Float32Array(this.flameMaxCount * 3);
    this.flameGeo = new THREE.BufferGeometry();
    this.flameGeo.setAttribute('position', new THREE.BufferAttribute(this.flamePositions, 3));
    this.flameGeo.setAttribute('color', new THREE.BufferAttribute(this.flameColors, 3));
    this.flameMat = new THREE.PointsMaterial({
      map: dot,
      alphaTest: 0.01,
      size: 0.3,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.flamePoints = new THREE.Points(this.flameGeo, this.flameMat);

    // Mist setup
    this.mistPositions = new Float32Array(this.mistMaxCount * 3);
    this.mistGeo = new THREE.BufferGeometry();
    this.mistGeo.setAttribute('position', new THREE.BufferAttribute(this.mistPositions, 3));
    this.mistMat = new THREE.PointsMaterial({
      map: dot,
      alphaTest: 0.01,
      size: 1.15,
      color: 0x90b5d0,
      transparent: true,
      opacity: 0.25,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
    this.mistPoints = new THREE.Points(this.mistGeo, this.mistMat);

    // Shockwave ring setup
    this.shockwaveGeo = new THREE.RingGeometry(0.2, 0.4, 32);
    this.shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  public static getInstance(): ParticleFX {
    if (!ParticleFX.instance) {
      ParticleFX.instance = new ParticleFX();
    }
    return ParticleFX.instance;
  }

  public init(scene: THREE.Scene): void {
    this.scene = scene;
    scene.add(this.sparkPoints);
    scene.add(this.dustPoints);
    scene.add(this.flamePoints);
    scene.add(this.mistPoints);
  }

  /**
   * Spawn 3D sparks at impact/clash point
   */
  public spawnSparks(origin: THREE.Vector3, count = 35, isGolden = true): void {
    const goldColors = [
      new THREE.Color(0xfff3a1),
      new THREE.Color(0xffcc00),
      new THREE.Color(0xff8800),
      new THREE.Color(0xffffff)
    ];

    const redColors = [
      new THREE.Color(0xff3333),
      new THREE.Color(0xcc1111),
      new THREE.Color(0xff6666)
    ];

    const palette = isGolden ? goldColors : redColors;

    for (let i = 0; i < count; i++) {
      if (this.sparks.length >= this.sparkMaxCount) {
        this.sparks.shift();
      }

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = isGolden ? (4 + Math.random() * 8) : (2 + Math.random() * 5);

      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.cos(phi) * speed + (isGolden ? 2 : 1);
      const vz = Math.sin(phi) * Math.sin(theta) * speed;

      const col = palette[Math.floor(Math.random() * palette.length)].clone();

      this.sparks.push({
        position: origin.clone(),
        velocity: new THREE.Vector3(vx, vy, vz),
        size: isGolden ? (0.08 + Math.random() * 0.08) : 0.06,
        life: 0,
        maxLife: isGolden ? (0.3 + Math.random() * 0.3) : 0.25,
        color: col
      });
    }
  }

  /**
   * Spawn expanding shockwave ring on deflection parry or boss ground smash
   */
  public spawnDeflectionShockwave(origin: THREE.Vector3, normal?: THREE.Vector3, isFire = false): void {
    if (!this.scene) return;

    const ringMat = this.shockwaveMat.clone();
    if (isFire) {
      ringMat.color.setHex(0xff3300);
    }
    const ring = new THREE.Mesh(this.shockwaveGeo, ringMat);
    ring.position.copy(origin);

    if (normal) {
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.normalize());
    } else {
      ring.rotation.x = -Math.PI / 2;
    }

    this.scene.add(ring);
    this.shockwaves.push({
      mesh: ring,
      life: 0,
      maxLife: isFire ? 0.5 : 0.35,
      startScale: 0.5,
      endScale: isFire ? 6.0 : 3.5
    });
  }

  /**
   * Spawn dust puff for jump landings or heavy footfalls
   */
  public spawnDustPuff(origin: THREE.Vector3, count = 12): void {
    for (let i = 0; i < count; i++) {
      if (this.dustPuffs.length >= this.dustMaxCount) {
        this.dustPuffs.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;

      this.dustPuffs.push({
        position: new THREE.Vector3(
          origin.x + (Math.random() - 0.5) * 0.4,
          origin.y + 0.05,
          origin.z + (Math.random() - 0.5) * 0.4
        ),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          0.3 + Math.random() * 0.4,
          Math.sin(angle) * speed
        ),
        size: 0.2 + Math.random() * 0.2,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
        opacity: 0.4
      });
    }
  }

  /**
   * Spawn flame particles & embers (fire waves, the naga king's second phase, braziers)
   */
  public spawnFlames(origin: THREE.Vector3, count = 8, spread = 0.3): void {
    const fireColors = [
      new THREE.Color(0xff2200),
      new THREE.Color(0xff7700),
      new THREE.Color(0xffcc00),
      new THREE.Color(0xffffff)
    ];

    for (let i = 0; i < count; i++) {
      if (this.flames.length >= this.flameMaxCount) {
        this.flames.shift();
      }

      const col = fireColors[Math.floor(Math.random() * fireColors.length)].clone();
      this.flames.push({
        position: new THREE.Vector3(
          origin.x + (Math.random() - 0.5) * spread,
          origin.y + (Math.random() - 0.5) * spread,
          origin.z + (Math.random() - 0.5) * spread
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 1.2,
          1.5 + Math.random() * 2.5,
          (Math.random() - 0.5) * 1.2
        ),
        size: 0.15 + Math.random() * 0.15,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.35,
        color: col
      });
    }
  }

  /**
   * Spawn ambient mist over water ghats in Level 1 Baoli
   */
  public spawnMist(boundsRadius = 12): void {
    if (this.mist.length >= this.mistMaxCount) return;

    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * boundsRadius;
    this.mist.push({
      position: new THREE.Vector3(
        Math.cos(angle) * r,
        0.15 + Math.random() * 0.4,
        Math.sin(angle) * r
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        0.05 + Math.random() * 0.08,
        (Math.random() - 0.5) * 0.3
      ),
      size: 0.8 + Math.random() * 0.6,
      life: 0,
      maxLife: 3.5 + Math.random() * 2.0,
      opacity: 0.2
    });
  }

  /**
   * Update all active particles in the scene
   */
  public update(dt: number): void {
    const gravity = -18;

    // 1. Update Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.sparks.splice(i, 1);
        continue;
      }
      p.velocity.y += gravity * dt;
      p.velocity.x *= 0.96;
      p.velocity.z *= 0.96;
      p.position.addScaledVector(p.velocity, dt);
    }

    const posAttr = this.sparkGeo.attributes.position as THREE.BufferAttribute;
    const colAttr = this.sparkGeo.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < this.sparkMaxCount; i++) {
      if (i < this.sparks.length) {
        const p = this.sparks[i];
        this.sparkPositions[i * 3] = p.position.x;
        this.sparkPositions[i * 3 + 1] = p.position.y;
        this.sparkPositions[i * 3 + 2] = p.position.z;
        const alpha = 1 - (p.life / p.maxLife);
        this.sparkColors[i * 3] = p.color.r * alpha;
        this.sparkColors[i * 3 + 1] = p.color.g * alpha;
        this.sparkColors[i * 3 + 2] = p.color.b * alpha;
      } else {
        this.sparkPositions[i * 3] = 0;
        this.sparkPositions[i * 3 + 1] = -9999;
        this.sparkPositions[i * 3 + 2] = 0;
      }
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // 2. Update Dust
    for (let i = this.dustPuffs.length - 1; i >= 0; i--) {
      const d = this.dustPuffs[i];
      d.life += dt;
      if (d.life >= d.maxLife) {
        this.dustPuffs.splice(i, 1);
        continue;
      }
      d.velocity.y += -1.5 * dt;
      d.velocity.x *= 0.92;
      d.velocity.z *= 0.92;
      d.position.addScaledVector(d.velocity, dt);
    }

    const dustPosAttr = this.dustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < this.dustMaxCount; i++) {
      if (i < this.dustPuffs.length) {
        const d = this.dustPuffs[i];
        this.dustPositions[i * 3] = d.position.x;
        this.dustPositions[i * 3 + 1] = d.position.y;
        this.dustPositions[i * 3 + 2] = d.position.z;
      } else {
        this.dustPositions[i * 3] = 0;
        this.dustPositions[i * 3 + 1] = -9999;
        this.dustPositions[i * 3 + 2] = 0;
      }
    }
    dustPosAttr.needsUpdate = true;

    // 3. Update Flames & Embers
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      f.life += dt;
      if (f.life >= f.maxLife) {
        this.flames.splice(i, 1);
        continue;
      }
      f.velocity.x += (Math.random() - 0.5) * 2 * dt;
      f.velocity.z += (Math.random() - 0.5) * 2 * dt;
      f.position.addScaledVector(f.velocity, dt);
    }

    const flamePosAttr = this.flameGeo.attributes.position as THREE.BufferAttribute;
    const flameColAttr = this.flameGeo.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < this.flameMaxCount; i++) {
      if (i < this.flames.length) {
        const f = this.flames[i];
        this.flamePositions[i * 3] = f.position.x;
        this.flamePositions[i * 3 + 1] = f.position.y;
        this.flamePositions[i * 3 + 2] = f.position.z;
        const alpha = 1 - (f.life / f.maxLife);
        this.flameColors[i * 3] = f.color.r * alpha;
        this.flameColors[i * 3 + 1] = f.color.g * alpha;
        this.flameColors[i * 3 + 2] = f.color.b * alpha;
      } else {
        this.flamePositions[i * 3] = 0;
        this.flamePositions[i * 3 + 1] = -9999;
        this.flamePositions[i * 3 + 2] = 0;
      }
    }
    flamePosAttr.needsUpdate = true;
    flameColAttr.needsUpdate = true;

    // 4. Update Mist
    for (let i = this.mist.length - 1; i >= 0; i--) {
      const m = this.mist[i];
      m.life += dt;
      if (m.life >= m.maxLife) {
        this.mist.splice(i, 1);
        continue;
      }
      m.position.addScaledVector(m.velocity, dt);
    }

    const mistPosAttr = this.mistGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < this.mistMaxCount; i++) {
      if (i < this.mist.length) {
        const m = this.mist[i];
        this.mistPositions[i * 3] = m.position.x;
        this.mistPositions[i * 3 + 1] = m.position.y;
        this.mistPositions[i * 3 + 2] = m.position.z;
      } else {
        this.mistPositions[i * 3] = 0;
        this.mistPositions[i * 3 + 1] = -9999;
        this.mistPositions[i * 3 + 2] = 0;
      }
    }
    mistPosAttr.needsUpdate = true;

    // 5. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        if (this.scene) this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }
      const progress = s.life / s.maxLife;
      const currentScale = s.startScale + (s.endScale - s.startScale) * Math.sin(progress * Math.PI * 0.5);
      s.mesh.scale.set(currentScale, currentScale, currentScale);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.9;
    }
  }
}

/** A white dot fading to transparent at its rim: the sprite for every particle. */
function createSoftDot(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

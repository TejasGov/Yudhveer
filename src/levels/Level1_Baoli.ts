import * as THREE from 'three';
import { PhysicsWorld } from '../core/PhysicsWorld';

export class Level1_Baoli {
  public group: THREE.Group;
  private physicsWorld: PhysicsWorld;
  public waterMesh: THREE.Mesh | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.physicsWorld = PhysicsWorld.getInstance();
    this.buildMoonlitBaoli();
  }

  private buildMoonlitBaoli(): void {
    // Ancient weathered stone
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x2b333c, // Dark slate with cool moonlit tint
      roughness: 0.75,
      metalness: 0.25
    });

    const stepMat = new THREE.MeshStandardMaterial({
      color: 0x3d4855,
      roughness: 0.7,
      metalness: 0.2
    });

    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.35,
      metalness: 0.8
    });

    // 1. Central 26x26 Stepped Platform (Main Arena)
    const platformHalfSize = 13;
    const platformHeight = 1.0;
    const baseGeo = new THREE.BoxGeometry(platformHalfSize * 2, platformHeight, platformHalfSize * 2);
    const baseMesh = new THREE.Mesh(baseGeo, stoneMat);
    baseMesh.position.set(0, -platformHeight / 2, 0);
    baseMesh.receiveShadow = true;
    this.group.add(baseMesh);

    this.physicsWorld.createStaticBox(
      new THREE.Vector3(0, -platformHeight / 2, 0),
      new THREE.Vector3(platformHalfSize, platformHeight / 2, platformHalfSize)
    );

    // 2. Central Vedic Dueling Circle Inlay
    const circleGeo = new THREE.RingGeometry(0.1, 7.8, 48);
    const circleMat = new THREE.MeshStandardMaterial({
      color: 0x242a33,
      roughness: 0.6,
      metalness: 0.3,
      side: THREE.DoubleSide
    });
    const circleMesh = new THREE.Mesh(circleGeo, circleMat);
    circleMesh.rotation.x = -Math.PI / 2;
    circleMesh.position.y = 0.015;
    circleMesh.receiveShadow = true;
    this.group.add(circleMesh);

    // Golden boundary ring
    const ringGeo = new THREE.RingGeometry(7.7, 7.95, 64);
    const ringMesh = new THREE.Mesh(ringGeo, goldTrimMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.02;
    this.group.add(ringMesh);

    // 3. Four Massive Indian Temple Pillars with Physics Colliders
    const pillarPositions = [
      new THREE.Vector3(9.5, 0, 9.5),
      new THREE.Vector3(-9.5, 0, 9.5),
      new THREE.Vector3(9.5, 0, -9.5),
      new THREE.Vector3(-9.5, 0, -9.5)
    ];

    const pillarRadius = 1.15;
    const pillarHeight = 7.5;

    pillarPositions.forEach((pos) => {
      const pillarGroup = new THREE.Group();
      pillarGroup.position.copy(pos);

      // Pillar Column
      const colGeo = new THREE.CylinderGeometry(pillarRadius * 0.85, pillarRadius, pillarHeight, 16);
      const colMesh = new THREE.Mesh(colGeo, stoneMat);
      colMesh.position.y = pillarHeight / 2;
      colMesh.castShadow = true;
      colMesh.receiveShadow = true;
      pillarGroup.add(colMesh);

      // Capital & Base
      const capGeo = new THREE.BoxGeometry(pillarRadius * 2.5, 0.6, pillarRadius * 2.5);
      const capTop = new THREE.Mesh(capGeo, stoneMat);
      capTop.position.y = pillarHeight;
      capTop.castShadow = true;
      pillarGroup.add(capTop);

      const capBottom = new THREE.Mesh(capGeo, stoneMat);
      capBottom.position.y = 0.3;
      pillarGroup.add(capBottom);

      // Torch Brazier on Pillar
      const brazierGeo = new THREE.CylinderGeometry(0.35, 0.15, 0.4, 8);
      const brazierMesh = new THREE.Mesh(brazierGeo, goldTrimMat);
      brazierMesh.position.set(0, 3.2, pillarRadius * 0.9);
      pillarGroup.add(brazierMesh);

      // Warm torch point light
      const torchLight = new THREE.PointLight(0xffaa44, 1.6, 14, 1.6);
      torchLight.position.set(0, 3.6, pillarRadius * 1.1);
      pillarGroup.add(torchLight);

      this.group.add(pillarGroup);

      this.physicsWorld.createStaticCylinder(
        new THREE.Vector3(pos.x, pillarHeight / 2, pos.z),
        pillarHeight / 2,
        pillarRadius
      );
    });

    // 4. Submerged Stepped Ghats (Stepwell descending tiers)
    for (let step = 1; step <= 4; step++) {
      const stepWidth = platformHalfSize + step * 2.6;
      const stepY = -step * 0.75;

      const stepBorderGeo = new THREE.BoxGeometry(stepWidth * 2, 0.75, stepWidth * 2);
      const stepMesh = new THREE.Mesh(stepBorderGeo, stepMat);
      stepMesh.position.y = stepY - 0.375;
      stepMesh.receiveShadow = true;
      this.group.add(stepMesh);
    }

    // 5. Submerged Water Surface with Moonlit Sheen
    const waterGeo = new THREE.PlaneGeometry(55, 55, 32, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x092238,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.82
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.y = -3.2;
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);
  }

  public update(time: number): void {
    if (this.waterMesh) {
      // Subtle water ripple undulation
      this.waterMesh.position.y = -3.2 + Math.sin(time * 1.5) * 0.04;
    }
  }
}

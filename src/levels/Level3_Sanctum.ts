import * as THREE from 'three';
import { PhysicsWorld } from '../core/PhysicsWorld';

export class Level3_Sanctum {
  public group: THREE.Group;
  private physicsWorld: PhysicsWorld;
  public brazierPositions: THREE.Vector3[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.physicsWorld = PhysicsWorld.getInstance();
    this.buildGarbhagrihaSanctum();
  }

  private buildGarbhagrihaSanctum(): void {
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.15,
      metalness: 0.95
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.85
    });

    const glowingRuneMat = new THREE.MeshStandardMaterial({
      color: 0xff4411,
      emissive: 0xff2200,
      emissiveIntensity: 1.4,
      roughness: 0.2,
      metalness: 0.5
    });

    // 1. Floating Obsidian Sanctum Dais
    const size = 13.5;
    const baseGeo = new THREE.CylinderGeometry(size, size * 0.92, 1.8, 48);
    const base = new THREE.Mesh(baseGeo, obsidianMat);
    base.position.y = -0.9;
    base.receiveShadow = true;
    this.group.add(base);

    this.physicsWorld.createStaticBox(
      new THREE.Vector3(0, -0.9, 0),
      new THREE.Vector3(size, 0.9, size)
    );

    // 2. Sacred Agni Rune Circles (Vedic Geometry)
    const ringGeo1 = new THREE.RingGeometry(size * 0.86, size * 0.93, 64);
    const ring1 = new THREE.Mesh(ringGeo1, glowingRuneMat);
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.02;
    this.group.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(4.2, 4.4, 48);
    const ring2 = new THREE.Mesh(ringGeo2, brassMat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.025;
    this.group.add(ring2);

    // 3. Four Colossal Brass Braziers (Burning eternal sacred flames)
    const brazierCoords = [
      new THREE.Vector3(8.5, 0, 8.5),
      new THREE.Vector3(-8.5, 0, 8.5),
      new THREE.Vector3(8.5, 0, -8.5),
      new THREE.Vector3(-8.5, 0, -8.5)
    ];

    brazierCoords.forEach((pos) => {
      this.brazierPositions.push(pos.clone().add(new THREE.Vector3(0, 2.2, 0)));

      const brazierGroup = new THREE.Group();
      brazierGroup.position.copy(pos);

      // Ornate Heavy Brass Bowl
      const bowlGeo = new THREE.CylinderGeometry(1.4, 0.6, 1.5, 16);
      const bowl = new THREE.Mesh(bowlGeo, brassMat);
      bowl.position.y = 1.2;
      bowl.castShadow = true;
      bowl.receiveShadow = true;
      brazierGroup.add(bowl);

      // Stone Pedestal
      const pedGeo = new THREE.BoxGeometry(2.2, 0.6, 2.2);
      const ped = new THREE.Mesh(pedGeo, obsidianMat);
      ped.position.y = 0.3;
      ped.castShadow = true;
      brazierGroup.add(ped);

      // Fire Light
      const fireLight = new THREE.PointLight(0xff4400, 2.8, 18, 1.5);
      fireLight.position.set(0, 2.5, 0);
      fireLight.castShadow = false;
      brazierGroup.add(fireLight);

      this.group.add(brazierGroup);

      this.physicsWorld.createStaticCylinder(
        new THREE.Vector3(pos.x, 1.2, pos.z),
        1.2,
        1.1
      );
    });

    // 4. Dark Monolith Spire Pillars
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(ang) * (size * 0.95);
      const z = Math.sin(ang) * (size * 0.95);

      const spireGeo = new THREE.ConeGeometry(0.7, 8, 4);
      const spire = new THREE.Mesh(spireGeo, obsidianMat);
      spire.position.set(x, 4.0, z);
      spire.rotation.y = ang;
      spire.castShadow = true;
      spire.receiveShadow = true;
      this.group.add(spire);
    }
  }
}

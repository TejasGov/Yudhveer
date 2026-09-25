import * as THREE from 'three';
import { PhysicsWorld } from '../core/PhysicsWorld';

export class Level2_Mandapa {
  public group: THREE.Group;
  private physicsWorld: PhysicsWorld;
  public wallKickPillars: THREE.Vector3[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.physicsWorld = PhysicsWorld.getInstance();
    this.buildMandapaHypostyle();
  }

  private buildMandapaHypostyle(): void {
    const sandstoneMat = new THREE.MeshStandardMaterial({
      color: 0x544738, // Warm ancient sandstone
      roughness: 0.8,
      metalness: 0.15
    });

    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0x363c46,
      roughness: 0.45,
      metalness: 0.4
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xe5a93b,
      roughness: 0.25,
      metalness: 0.85
    });

    // 1. Elevated Temple Pavilion Platform
    const size = 15;
    const baseGeo = new THREE.BoxGeometry(size * 2, 1.2, size * 2);
    const base = new THREE.Mesh(baseGeo, sandstoneMat);
    base.position.y = -0.6;
    base.receiveShadow = true;
    this.group.add(base);

    this.physicsWorld.createStaticBox(
      new THREE.Vector3(0, -0.6, 0),
      new THREE.Vector3(size, 0.6, size)
    );

    // 2. Colonnade Pillars (Hypostyle Hall layout)
    const pillarRadius = 0.7;
    const pillarHeight = 8.0;

    const gridPoints = [-11, -5.5, 5.5, 11];
    gridPoints.forEach((x) => {
      gridPoints.forEach((z) => {
        // Keep center arena open for duel
        if (Math.abs(x) < 5 && Math.abs(z) < 5) return;

        const pillarPos = new THREE.Vector3(x, 0, z);
        this.wallKickPillars.push(pillarPos);

        const colGeo = new THREE.CylinderGeometry(pillarRadius * 0.9, pillarRadius, pillarHeight, 16);
        const col = new THREE.Mesh(colGeo, sandstoneMat);
        col.position.set(x, pillarHeight / 2, z);
        col.castShadow = true;
        col.receiveShadow = true;
        this.group.add(col);

        // Ornate Brass Ring Bands
        const ringGeo = new THREE.TorusGeometry(pillarRadius * 1.05, 0.08, 8, 24);
        const ring = new THREE.Mesh(ringGeo, goldMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, 3.5, z);
        this.group.add(ring);

        // Hanging Temple Lantern
        const lanternGeo = new THREE.OctahedronGeometry(0.35);
        const lanternMat = new THREE.MeshStandardMaterial({
          color: 0xffaa33,
          emissive: 0xff7711,
          emissiveIntensity: 0.8
        });
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.set(x, 5.2, z);
        this.group.add(lantern);

        const lanternLight = new THREE.PointLight(0xff9922, 1.2, 10);
        lanternLight.position.set(x, 5.0, z);
        this.group.add(lanternLight);

        this.physicsWorld.createStaticCylinder(
          new THREE.Vector3(x, pillarHeight / 2, z),
          pillarHeight / 2,
          pillarRadius
        );
      });
    });

    // 3. Elevated Central Altar Dais (Vertical platform for fighting)
    const daisGeo = new THREE.CylinderGeometry(4.0, 4.5, 0.6, 32);
    const dais = new THREE.Mesh(daisGeo, marbleMat);
    dais.position.set(0, 0.3, 0);
    dais.receiveShadow = true;
    this.group.add(dais);

    // Altar Trim
    const daisTrimGeo = new THREE.RingGeometry(3.9, 4.1, 32);
    const daisTrim = new THREE.Mesh(daisTrimGeo, goldMat);
    daisTrim.rotation.x = -Math.PI / 2;
    daisTrim.position.set(0, 0.61, 0);
    this.group.add(daisTrim);
  }
}

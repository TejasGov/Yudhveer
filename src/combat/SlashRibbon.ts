import * as THREE from 'three';

export class SlashRibbon {
  public mesh: THREE.Mesh;
  private maxPoints = 16;
  private positions: THREE.Vector3[] = [];
  private geometry: THREE.BufferGeometry;
  private positionsArray: Float32Array;
  private uvsArray: Float32Array;
  private colorsArray: Float32Array;
  private baseColor: THREE.Color;

  constructor(color = 0xffd15c, opacity = 0.75) {
    this.baseColor = new THREE.Color(color);
    this.geometry = new THREE.BufferGeometry();

    const maxVertices = this.maxPoints * 2;
    this.positionsArray = new Float32Array(maxVertices * 3);
    this.uvsArray = new Float32Array(maxVertices * 2);
    this.colorsArray = new Float32Array(maxVertices * 4);

    // Create quad index strip: (0, 1, 2), (2, 1, 3), etc.
    const indices: number[] = [];
    for (let i = 0; i < this.maxPoints - 1; i++) {
      const p = i * 2;
      indices.push(p, p + 1, p + 2);
      indices.push(p + 2, p + 1, p + 3);
    }

    this.geometry.setIndex(indices);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positionsArray, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvsArray, 2));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colorsArray, 4));

    const material = new THREE.MeshBasicMaterial({
      color: this.baseColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
  }

  public update(tipPos: THREE.Vector3, basePos: THREE.Vector3, isSlashing: boolean): void {
    if (isSlashing) {
      // Add newest tip & base pair to the front
      this.positions.unshift(tipPos.clone(), basePos.clone());
      if (this.positions.length > this.maxPoints * 2) {
        this.positions.length = this.maxPoints * 2;
      }
    } else {
      // Fade out trail smoothly when not swinging
      if (this.positions.length > 0) {
        this.positions.splice(0, 2);
      }
    }

    const currentCount = this.positions.length / 2;
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;
    const uvAttr = this.geometry.attributes.uv as THREE.BufferAttribute;

    for (let i = 0; i < this.maxPoints * 2; i++) {
      if (i < this.positions.length) {
        const p = this.positions[i];
        posAttr.setXYZ(i, p.x, p.y, p.z);

        const segmentIdx = Math.floor(i / 2);
        const progress = segmentIdx / Math.max(1, currentCount - 1); // 0 at head, 1 at tail
        const alpha = Math.max(0, 1.0 - progress);

        colAttr.setXYZW(i, this.baseColor.r, this.baseColor.g, this.baseColor.b, alpha);
        uvAttr.setXY(i, i % 2 === 0 ? 0 : 1, progress);
      } else {
        // Collapse unused points to the last known position
        const fallback = this.positions.length > 0 ? this.positions[this.positions.length - 1] : new THREE.Vector3(0, -999, 0);
        posAttr.setXYZ(i, fallback.x, fallback.y, fallback.z);
        colAttr.setXYZW(i, 0, 0, 0, 0);
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    uvAttr.needsUpdate = true;
  }

  public setColor(color: number): void {
    this.baseColor.setHex(color);
  }
}

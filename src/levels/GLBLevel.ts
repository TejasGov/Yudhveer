import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PhysicsWorld } from '../core/PhysicsWorld';
import { SceneManager } from '../core/SceneManager';
import type { GameLevel, LevelAtmosphere } from './LevelTypes';
import { ArenaBounds, type ArenaBoundsSpec } from './ArenaBounds';

// Blender's glTF exporter converts light watts to candela with 683 lm/W; Blender itself renders watts / (4*pi^2).
// Scaling back keeps lamp brightness identical to the Blender renders.
export const EXPORTED_LIGHT_SCALE = 1 / (683 * Math.PI);

const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

interface Flicker { light: THREE.Light; base: number; seed: number }

export type LoadProgress = (fraction: number) => void;

/** Frees geometry, materials and every texture they reference below `root`. */
export function disposeObject(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
    if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => materials.add(m));
    (obj as THREE.PointLight).shadow?.dispose();
  });
  const textures = new Set<THREE.Texture>();
  materials.forEach((mat) => {
    Object.values(mat).forEach((v) => { if ((v as THREE.Texture)?.isTexture) textures.add(v as THREE.Texture); });
    const uniforms = (mat as THREE.ShaderMaterial).uniforms ?? mat.userData.shader?.uniforms;
    if (uniforms) Object.values(uniforms).forEach((u) => { if ((u as THREE.IUniform).value?.isTexture) textures.add((u as THREE.IUniform).value); });
    mat.dispose();
  });
  textures.forEach(disposeTexture);
}

export function disposeTexture(tex: THREE.Texture): void {
  tex.dispose();
  // GLTFLoader decodes to ImageBitmaps in the browser; close them so the CPU copy goes too.
  const image = tex.source?.data as ImageBitmap | undefined;
  if (image && typeof image.close === 'function') image.close();
}

/**
 * A level streamed from a Blender-exported GLB.
 *
 * Collision comes from the `collider` custom property Blender writes into node extras:
 * `trimesh` (exact triangles), `cylinder` and `box` (fitted to the node's world bounds unless
 * `collider_radius` / `collider_height` are given). Nodes named `Collider_*` are collision-only.
 */
export abstract class GLBLevel implements GameLevel {
  public abstract readonly id: number;
  public abstract readonly title: string;
  public abstract readonly subtitle: string;
  public abstract readonly atmosphere: LevelAtmosphere;

  public readonly group = new THREE.Group();
  public readonly playerSpawn = new THREE.Vector3(0, 0, 4);
  public readonly wallKickPoints: THREE.Vector3[] = [];
  public readonly bloomObjects: THREE.Object3D[] = [];
  /** Invisible arena walls, built from `arenaBoundsSpec` once the level has loaded. */
  public bounds: ArenaBounds | null = null;
  /** Anything that falls below this height (level coordinates) is out of the fight and gets recovered. */
  public killPlaneY = -40;

  protected readonly physics = PhysicsWorld.getInstance();
  protected disposed = false;
  /**
   * Re-centre the model on this node: its top-centre lands on the origin, so spawns and bounds can be authored
   * relative to the arena floor even if the scene is moved around in Blender.
   */
  protected anchorNode: string | null = null;
  /** Arena outline the walls follow (level coordinates, after anchoring). */
  protected arenaBoundsSpec: ArenaBoundsSpec | null = null;
  /**
   * Merge opaque meshes that share a material into one draw call each (after colliders are built).
   * Worth it for scenes of many small props; leave off for levels already batched into culling cells.
   */
  protected batchStatic = false;
  /** Textures created by the level itself (skies, ramps, env maps) rather than loaded with the GLB. */
  protected readonly ownedTextures = new Set<THREE.Texture>();
  /** Render targets behind baked environments; disposing only their texture would leave them allocated. */
  private readonly ownedTargets = new Set<THREE.WebGLRenderTarget>();
  private bodies: RAPIER.RigidBody[] = [];
  /** Invisible arena walls: they block fighters but not the camera. */
  private wallColliders: RAPIER.Collider[] = [];
  private flickers: Flicker[] = [];

  protected constructor(private readonly url: string, private readonly floorOffset = 0) {}

  public async load(onProgress?: LoadProgress): Promise<void> {
    // Keeps anything standing in the arena up while the GLB streams in.
    const tempFloor = this.physics.createStaticBox(new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(14, 0.5, 14)).body;
    this.bodies.push(tempFloor);

    const [gltf] = await Promise.all([
      gltfLoader.loadAsync(this.url, (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); }),
      this.loadEnvironment(),
    ]);
    if (this.disposed) {
      disposeObject(gltf.scene);
      return;
    }

    const model = gltf.scene;
    model.name = `${this.constructor.name}_GLB`;
    model.position.y = this.floorOffset;
    model.updateMatrixWorld(true);
    this.applyAnchor(model);

    const exportedLights: THREE.Light[] = [];
    model.traverse((obj) => {
      if ((obj as THREE.Light).isLight) exportedLights.push(obj as THREE.Light);
      if (obj.name.startsWith('Collider_')) obj.visible = false;
    });
    exportedLights.forEach((light) => this.prepareExportedLight(light));
    this.prepareModel(model);
    sharpenTextures(model);

    this.buildColliders(model);
    this.buildBounds();
    if (this.batchStatic) batchStaticMeshes(model, this.bloomObjects);
    this.physics.removeBody(tempFloor);
    this.bodies = this.bodies.filter((b) => b !== tempFloor);
    this.group.add(model);
  }

  private applyAnchor(model: THREE.Object3D): void {
    if (!this.anchorNode) return;
    const node = model.getObjectByName(this.anchorNode);
    if (!node) {
      console.warn(`[${this.constructor.name}] anchor node ${this.anchorNode} not found; model left in place`);
      return;
    }
    const box = new THREE.Box3().setFromObject(node);
    model.position.x -= (box.min.x + box.max.x) / 2;
    model.position.z -= (box.min.z + box.max.z) / 2;
    model.position.y -= box.max.y;
    model.updateMatrixWorld(true);
  }

  private buildBounds(): void {
    if (!this.arenaBoundsSpec) return;
    this.bounds = new ArenaBounds(this.arenaBoundsSpec);
    for (const wall of this.bounds.walls()) {
      const { body, collider } = this.physics.createStaticBox(wall.center, wall.halfExtents, wall.rotation);
      this.physics.setCameraTransparent(collider, true);
      this.wallColliders.push(collider);
      this.bodies.push(body);
    }
    this.group.add(this.bounds.createDebugMesh());
  }

  /** Draws the arena walls' outline (for tuning bounds); off by default. */
  public showBounds(visible: boolean): void {
    const debug = this.group.getObjectByName('ArenaBoundsDebug');
    if (debug) debug.visible = visible;
  }

  /** Skies, environment maps and other textures fetched alongside the GLB. */
  protected async loadEnvironment(): Promise<void> {}

  /** Prefiltered (PMREM) environment from an equirect texture, released with the level. */
  protected bakeEnvironment(equirect: THREE.Texture): THREE.Texture {
    const pmrem = new THREE.PMREMGenerator(SceneManager.getInstance().renderer);
    const target = pmrem.fromEquirectangular(equirect);
    pmrem.dispose();
    this.ownedTargets.add(target);
    return target.texture;
  }

  /** Materials, shadows, animated surfaces. Runs once, before colliders are built. */
  protected abstract prepareModel(model: THREE.Object3D): void;

  /**
   * Exported punctual lights arrive in Blender watts converted to candela; bring them back to what the
   * Blender renders showed. Directional lights are dropped: the engine owns the one shadowed key light.
   */
  protected prepareExportedLight(light: THREE.Light): void {
    if ((light as THREE.DirectionalLight).isDirectionalLight) {
      light.removeFromParent();
      return;
    }
    light.intensity *= EXPORTED_LIGHT_SCALE;
    light.castShadow = false;
    if (light.userData.flicker) this.addFlicker(light);
  }

  /** A fixed box collider owned (and removed on dispose) by this level. */
  protected addStaticBox(center: THREE.Vector3, halfExtents: THREE.Vector3): void {
    this.bodies.push(this.physics.createStaticBox(center, halfExtents).body);
  }

  protected addFlicker(light: THREE.Light): void {
    this.flickers.push({ light, base: light.intensity, seed: Math.random() * 100 });
  }

  /** Registers bright emissive or additive meshes below `root` with the selective bloom. */
  protected collectBloom(root: THREE.Object3D, minLuminance = 1.0): void {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const luminance = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
      const glows = mats.some((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (mat.blending === THREE.AdditiveBlending) return true;
        // Unlit HDR colours (flames authored as MeshBasicMaterial with colour > 1).
        if ((m as THREE.MeshBasicMaterial).isMeshBasicMaterial) return luminance((m as THREE.MeshBasicMaterial).color) >= minLuminance;
        if (!mat.emissive) return false;
        return luminance(mat.emissive) * (mat.emissiveIntensity ?? 1) >= minLuminance;
      });
      if (glows && !this.bloomObjects.includes(mesh)) this.bloomObjects.push(mesh);
    });
  }

  private buildColliders(model: THREE.Object3D): void {
    const v = new THREE.Vector3();
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    model.traverse((obj) => {
      const kind = obj.userData.collider;
      if (!kind || kind === 'none') return;
      if (kind === 'trimesh') {
        obj.traverse((c) => {
          const mesh = c as THREE.Mesh;
          if (!mesh.isMesh) return;
          const pos = mesh.geometry.attributes.position;
          const verts = new Float32Array(pos.count * 3);
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
            verts[i * 3] = v.x;
            verts[i * 3 + 1] = v.y;
            verts[i * 3 + 2] = v.z;
          }
          const idx = mesh.geometry.index
            ? new Uint32Array(mesh.geometry.index.array)
            : Uint32Array.from({ length: pos.count }, (_, i) => i);
          this.bodies.push(this.physics.createStaticTrimesh(verts, idx).body);
        });
        return;
      }
      if (kind !== 'cylinder' && kind !== 'box') return;

      if (obj.userData.collider_radius !== undefined) {
        // Explicit authoring values: the node origin sits at the base of the shape.
        const radius = obj.userData.collider_radius;
        const height = obj.userData.collider_height ?? 3.0;
        obj.getWorldPosition(v);
        this.bodies.push(this.physics.createStaticCylinder(new THREE.Vector3(v.x, v.y + height / 2, v.z), height / 2, radius).body);
        return;
      }
      box.setFromObject(obj);
      if (box.isEmpty()) return;
      box.getCenter(v);
      box.getSize(size);
      const body = kind === 'cylinder'
        ? this.physics.createStaticCylinder(v.clone(), size.y / 2, Math.max(size.x, size.z) / 2).body
        : this.physics.createStaticBox(v.clone(), size.clone().multiplyScalar(0.5)).body;
      this.bodies.push(body);
    });
  }

  public update(time: number, _dt: number, _camera: THREE.Camera): void {
    for (const f of this.flickers) {
      const n = Math.sin(time * 11.0 + f.seed) * 0.5 + Math.sin(time * 23.7 + f.seed * 1.7) * 0.3 + Math.sin(time * 5.3 + f.seed) * 0.2;
      f.light.intensity = f.base * (0.88 + 0.12 * n);
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.wallColliders.forEach((c) => this.physics.setCameraTransparent(c, false));
    this.wallColliders = [];
    this.bodies.forEach((b) => this.physics.removeBody(b));
    this.bodies = [];
    this.group.removeFromParent();
    disposeObject(this.group);
    this.ownedTextures.forEach(disposeTexture);
    this.ownedTextures.clear();
    this.ownedTargets.forEach((t) => t.dispose());
    this.ownedTargets.clear();
    this.bloomObjects.length = 0;
  }
}

/** Anisotropic filtering on every material map: keeps floors and carved reliefs crisp at grazing angles. */
function sharpenTextures(root: THREE.Object3D, level = 8): void {
  const anisotropy = Math.min(level, SceneManager.getInstance().renderer.capabilities.getMaxAnisotropy());
  root.traverse((obj) => {
    const mats = (obj as THREE.Mesh).material;
    if (!mats) return;
    (Array.isArray(mats) ? mats : [mats]).forEach((m) => {
      Object.values(m).forEach((v) => { if ((v as THREE.Texture)?.isTexture) (v as THREE.Texture).anisotropy = anisotropy; });
    });
  });
}

/** Float32, non-interleaved copy of a (possibly meshopt-quantized) geometry, so differing encodings can merge. */
function toFloatGeometry(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  const getters = ['getX', 'getY', 'getZ', 'getW'] as const;
  for (const [name, attr] of Object.entries(src.attributes)) {
    const a = attr as THREE.BufferAttribute;
    const arr = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) {
      for (let k = 0; k < a.itemSize; k++) arr[i * a.itemSize + k] = a[getters[k]](i);
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
  }
  if (src.index) out.setIndex(new THREE.BufferAttribute(new Uint32Array(src.index.array), 1));
  return out;
}

/**
 * Merges static, opaque, single-material meshes below `model` that share material, shadow flags and vertex
 * layout. Transparent meshes keep their own draw calls so they still depth-sort; `keep` meshes (bloom
 * selection) are left alone. Returns the number of draw calls saved.
 */
function batchStaticMeshes(model: THREE.Object3D, keep: THREE.Object3D[]): number {
  model.updateMatrixWorld(true);
  const toModel = model.matrixWorld.clone().invert();
  const groups = new Map<string, THREE.Mesh[]>();
  model.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh || (mesh as THREE.InstancedMesh).isInstancedMesh) return;
    if (Array.isArray(mesh.material) || mesh.material.transparent || !mesh.visible || keep.includes(mesh)) return;
    const g = mesh.geometry;
    const key = [mesh.material.uuid, mesh.castShadow, mesh.receiveShadow, mesh.renderOrder, !!g.index,
      Object.keys(g.attributes).sort().join(',')].join('|');
    const list = groups.get(key);
    if (list) list.push(mesh);
    else groups.set(key, [mesh]);
  });

  let saved = 0;
  const retired = new Set<THREE.BufferGeometry>();
  groups.forEach((meshes) => {
    if (meshes.length < 2) return;
    const parts = meshes.map((m) => toFloatGeometry(m.geometry).applyMatrix4(new THREE.Matrix4().multiplyMatrices(toModel, m.matrixWorld)));
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!merged) return;
    const first = meshes[0];
    const batch = new THREE.Mesh(merged, first.material);
    batch.name = 'Batch_' + (first.material as THREE.Material).name;
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    batch.renderOrder = first.renderOrder;
    model.add(batch);
    meshes.forEach((m) => { retired.add(m.geometry); m.removeFromParent(); });
    saved += meshes.length - 1;
  });
  // Dispose source geometry no longer drawn by any remaining mesh (glTF instances share geometry).
  model.traverse((obj) => { const g = (obj as THREE.Mesh).geometry; if (g) retired.delete(g); });
  retired.forEach((g) => g.dispose());
  return saved;
}

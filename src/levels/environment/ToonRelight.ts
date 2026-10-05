import * as THREE from 'three';

/** A nearest-filtered 1D ramp for MeshToonMaterial; each entry is one flat light band. */
export function createToonRamp(bands: number[]): THREE.DataTexture {
  const data = new Uint8Array(bands.length * 4);
  bands.forEach((b, i) => data.set([b * 255, b * 255, b * 255, 255], i * 4));
  const ramp = new THREE.DataTexture(data, bands.length, 1, THREE.RGBAFormat);
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

/**
 * Converts a PBR material to cel shading while keeping its textures, alpha, emission and decal offsets.
 * Toon shading has no specular response, so dark untextured metals get their albedo lifted to still read as
 * brass. Already-bright metals (gold trim) are left alone: lifting them past 1 makes them bloom like lamps.
 */
export function toToonMaterial(src: THREE.MeshStandardMaterial, ramp: THREE.Texture): THREE.MeshToonMaterial {
  const color = src.color.clone();
  const luminance = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  if (src.metalness > 0.5 && !src.map && luminance < 0.3) color.multiplyScalar(Math.min(2.6, 0.3 / Math.max(luminance, 1e-3)));
  return new THREE.MeshToonMaterial({
    name: src.name,
    color,
    map: src.map,
    gradientMap: ramp,
    normalMap: src.normalMap,
    normalScale: src.normalScale,
    emissive: src.emissive,
    emissiveMap: src.emissiveMap,
    emissiveIntensity: src.emissiveIntensity,
    alphaMap: src.alphaMap,
    alphaTest: src.alphaTest,
    transparent: src.transparent,
    opacity: src.opacity,
    side: src.side,
    vertexColors: src.vertexColors,
    aoMap: src.aoMap,
    depthWrite: src.depthWrite,
    depthTest: src.depthTest,
    polygonOffset: src.polygonOffset,
    polygonOffsetFactor: src.polygonOffsetFactor,
    polygonOffsetUnits: src.polygonOffsetUnits,
    fog: src.fog,
  });
}

/**
 * Additive glows, soft transparent sheets (waterfalls, mist) and anything flagged `userData.keepShading`
 * (water) keep their own shading; opaque, alpha-tested and decal materials go toon.
 */
function keepsOwnShading(m: THREE.Material): boolean {
  const mat = m as THREE.MeshStandardMaterial;
  return !mat.isMeshStandardMaterial || mat.userData.keepShading === true || mat.blending !== THREE.NormalBlending
    || (mat.transparent && mat.alphaTest === 0 && !mat.polygonOffset);
}

/**
 * Cel-shades every eligible material below `root`, sharing one converted material per source.
 * `override` runs first for each source material: return a replacement (or the source itself to keep it),
 * or undefined to fall through to the default conversion.
 */
export function toonifyModel(
  root: THREE.Object3D,
  ramp: THREE.Texture,
  override?: (src: THREE.Material, mesh: THREE.Mesh) => THREE.Material | undefined,
): void {
  const converted = new Map<THREE.Material, THREE.Material>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const convert = (src: THREE.Material): THREE.Material => {
      let next = converted.get(src);
      if (!next) {
        next = override?.(src, mesh) ?? (keepsOwnShading(src) ? src : toToonMaterial(src as THREE.MeshStandardMaterial, ramp));
        converted.set(src, next);
      }
      return next;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material);
  });
  converted.forEach((next, src) => { if (next !== src) src.dispose(); });
}

export interface RimLight {
  color: THREE.ColorRepresentation;
  strength: number;
  /** Where the rim band starts in 1 - N.V (0 = facing the camera, 1 = grazing); lower is a wider rim. */
  start: number;
}

/**
 * Hard-edged anime rim light on a toon material. Uses the smooth geometric normal (not the normal map), so it
 * traces the big carved forms and silhouette cleanly instead of sparkling on surface grain. Returns the uniforms, so a
 * level can retint the rim as its light changes (`uRimColor` is the colour times the strength).
 */
export function addRimLight(mat: THREE.MeshToonMaterial, rim: RimLight): { uRimColor: THREE.IUniform<THREE.Color>; uRimStart: THREE.IUniform<number> } {
  const uniforms = {
    uRimColor: { value: new THREE.Color(rim.color).multiplyScalar(rim.strength) },
    uRimStart: { value: rim.start },
  };
  patchShader(mat, 'rim', (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimStart;')
      .replace('#include <opaque_fragment>', `float rimFacing = 1.0 - saturate(abs(dot(normalize(vNormal), normalize(vViewPosition))));
outgoingLight += uRimColor * mix(vec3(1.0), diffuseColor.rgb, 0.5) * smoothstep(uRimStart, uRimStart + 0.04, rimFacing);
#include <opaque_fragment>`);
  });
  return uniforms;
}

/**
 * Gamma-lifts the albedo (colour^gamma, gamma < 1): very dark surfaces brighten a lot while near-white ones
 * (snow) barely move. Stands in for the volumetric haze and bounce that lift dark stone in the Blender renders.
 */
export function liftAlbedo(mat: THREE.MeshToonMaterial, gamma: number): void {
  const uniforms = { uAlbedoGamma: { value: gamma } };
  patchShader(mat, 'lift', (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uAlbedoGamma;')
      .replace('#include <map_fragment>', `#include <map_fragment>
diffuseColor.rgb = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(uAlbedoGamma));`);
  });
}

export interface LampGlow {
  /** World bounds of the lit panel (a vertical plane); the glow pools at its bottom edge and centre. */
  bounds: THREE.Box3;
  color: THREE.ColorRepresentation;
  intensity: number;
}

/**
 * A faint, permanent oil-lamp (deepak) glow on a painted panel: the texture itself glows warm, strongest along
 * the bottom edge and centre as if diyas burn just below it, fading upward and to the sides, with a slow
 * flicker. Keeps the panel readable in full shadow without looking backlit. Returns the uniforms to animate.
 */
export function addLampGlow(mat: THREE.MeshToonMaterial, glow: LampGlow): { uTime: THREE.IUniform<number> } {
  mat.emissive.set(glow.color);
  mat.emissiveMap = mat.map;
  mat.emissiveIntensity = glow.intensity;
  const size = glow.bounds.getSize(new THREE.Vector3());
  const uniforms = {
    uTime: { value: 0 },
    uGlowMin: { value: glow.bounds.min.clone() },
    uGlowSize: { value: size.max(new THREE.Vector3(1e-3, 1e-3, 1e-3)) },
    // Horizontal axis of the panel: whichever of x / z it spans.
    uGlowAxis: { value: size.x >= size.z ? new THREE.Vector2(1, 0) : new THREE.Vector2(0, 1) },
    uGlowSeed: { value: glow.bounds.min.x * 1.7 + glow.bounds.min.z * 0.9 },
  };
  patchShader(mat, 'lampglow', (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGlowWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlowWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime;
uniform vec3 uGlowMin;
uniform vec3 uGlowSize;
uniform vec2 uGlowAxis;
uniform float uGlowSeed;
varying vec3 vGlowWorld;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  vec3 q = clamp((vGlowWorld - uGlowMin) / uGlowSize, 0.0, 1.0);
  float across = dot(q.xz, uGlowAxis) * 2.0 - 1.0;          // -1..1 over the panel width
  float lift = 1.0 - 0.65 * smoothstep(0.0, 1.0, q.y);      // pooled at the lamps below, fading upward
  float spread = 1.0 - 0.45 * across * across;              // brightest in the middle
  float flick = 0.93 + 0.07 * sin(uTime * 6.1 + uGlowSeed) * sin(uTime * 2.3 + uGlowSeed * 1.7);
  totalEmissiveRadiance *= lift * spread * flick;
}`);
  });
  return { uTime: uniforms.uTime };
}

/** Chains a shader patch onto a material, keeping any earlier onBeforeCompile patches. */
export function patchShader(mat: THREE.Material, key: string, apply: (shader: THREE.WebGLProgramParametersWithUniforms) => void): void {
  const previous = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    previous.call(mat, shader, renderer);
    apply(shader);
    mat.userData.shader = shader;
  };
  mat.userData.shaderPatchKey = (mat.userData.shaderPatchKey ?? '') + '|' + key;
  mat.customProgramCacheKey = () => 'yudhveer' + mat.userData.shaderPatchKey;
}

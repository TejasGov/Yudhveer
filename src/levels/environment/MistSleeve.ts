import * as THREE from 'three';

const VERTEX = /* glsl */ `
attribute float aHeight;
varying float vHeight;
varying vec3 vWorld;
varying vec3 vNormalW;
#include <fog_pars_vertex>
void main() {
  vHeight = aHeight;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
varying float vHeight;
varying vec3 vWorld;
varying vec3 vNormalW;
#include <fog_pars_fragment>
float mHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float mNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(mHash(i), mHash(i + vec3(1, 0, 0)), f.x), mix(mHash(i + vec3(0, 1, 0)), mHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(mHash(i + vec3(0, 0, 1)), mHash(i + vec3(1, 0, 1)), f.x), mix(mHash(i + vec3(0, 1, 1)), mHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float mFbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * mNoise(p); p = p * 2.02 + 7.3; a *= 0.5; } return s; }
void main() {
  float h = clamp(vHeight, 0.0, 1.0);
  // Dense low, thinning upward and gone well before the top edge: no hard rim.
  float profile = smoothstep(0.0, 0.2, h) * (1.0 - smoothstep(0.25, 0.85, h));
  // Slowly drifting, rising wisps.
  vec3 p = vWorld * 0.06 + vec3(uTime * 0.035, -uTime * 0.05, uTime * 0.025);
  float wisp = smoothstep(0.32, 0.72, mFbm(p) - h * 0.15);
  // Fade where the sleeve turns edge-on, so no cylinder outline shows.
  float facing = abs(dot(normalize(vNormalW), normalize(cameraPosition - vWorld)));
  float soft = smoothstep(0.08, 0.65, facing);
  float a = uOpacity * profile * wisp * soft;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
  #include <fog_fragment>
}`;

/**
 * Soft volumetric-looking mist for Blender's "mist collar" sleeves around pinnacles and cliffs. The authoring
 * shader faded alpha by height and noise; exported flat, the sleeves read as hard translucent rings.
 * Needs a per-vertex `aHeight` (0 at the sleeve's foot, 1 at its top) - see `addSleeveHeights`.
 */
export class MistSleeveMaterial extends THREE.ShaderMaterial {
  constructor(color: THREE.ColorRepresentation, opacity: number) {
    super({
      name: 'MistSleeve',
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uTime: { value: 0 } },
      ]),
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
  }

  public update(time: number): void {
    this.uniforms.uTime.value = time;
  }
}

/** Adds the normalised height attribute the sleeve shader fades by, from the mesh's own vertical extent. */
export function addSleeveHeights(geometry: THREE.BufferGeometry): void {
  const pos = geometry.attributes.position;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    min = Math.min(min, y);
    max = Math.max(max, y);
  }
  const span = Math.max(max - min, 1e-4);
  const heights = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) heights[i] = (pos.getY(i) - min) / span;
  geometry.setAttribute('aHeight', new THREE.BufferAttribute(heights, 1));
}

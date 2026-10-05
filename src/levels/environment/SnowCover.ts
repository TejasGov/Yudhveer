import * as THREE from 'three';
import { patchShader } from './ToonRelight';

export interface SnowCover {
  /** Overall strength, 0..1. */
  amount: number;
  /** Snow streaking down steep faces, 0..1 (0 = only ledges and tops hold snow). */
  wall: number;
  /**
   * Rock whose bake is too coarse to hold up when seen close (the summit's beacon cliff: about three texels a metre, so
   * one flat colour per face, which read as square patches): this share of its baked colour gives way to `color`
   * mottled by world-space noise, under the snow. Unset keeps the bake as it is.
   */
  breakup?: { color: THREE.ColorRepresentation; amount: number };
}

const SNOW_COLOR = new THREE.Color(0xdde4ee);

const NOISE_GLSL = /* glsl */ `
float snHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float snNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(snHash(i), snHash(i + vec3(1, 0, 0)), f.x), mix(snHash(i + vec3(0, 1, 0)), snHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(snHash(i + vec3(0, 0, 1)), snHash(i + vec3(1, 0, 1)), f.x), mix(snHash(i + vec3(0, 1, 1)), snHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float snFbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * snNoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }`;

/**
 * World-space snow over a (baked) rock material. Blender's bake only snowed up-facing surfaces, which left tall
 * cliff faces bare black; this adds drift patches on ledges and tops and long vertical snow runs down steep
 * faces, nothing under overhangs. Seamless across merged meshes since it never uses UVs.
 */
export function addSnowCover(mat: THREE.MeshToonMaterial, snow: SnowCover): void {
  const uniforms = {
    uSnowAmount: { value: snow.amount },
    uSnowWall: { value: snow.wall },
    uSnowColor: { value: SNOW_COLOR },
    uBreakupColor: { value: new THREE.Color(snow.breakup?.color ?? 0) },
    uBreakup: { value: snow.breakup?.amount ?? 0 },
  };
  // Its own program when the rock is broken up, so the other snowed materials never pay for the extra noise.
  patchShader(mat, snow.breakup ? 'snow-breakup' : 'snow', (shader) => {
    Object.assign(shader.uniforms, uniforms);
    if (snow.breakup) {
      // Straight after the map is read, so the albedo lift (`liftAlbedo`, chained before this) applies to it too.
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
{
  float grain = snFbm(vSnowWorld * 0.21 + 3.1);
  float fleck = snNoise(vSnowWorld * 1.7);
  diffuseColor.rgb = mix(diffuseColor.rgb, uBreakupColor * (0.55 + 0.9 * grain + 0.3 * (fleck - 0.5)), uBreakup);
}`);
    }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSnowWorld;\nvarying vec3 vSnowNormal;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vSnowWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
vSnowNormal = normalize(mat3(modelMatrix) * objectNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uSnowAmount;
uniform float uSnowWall;
uniform vec3 uSnowColor;
uniform vec3 uBreakupColor;
uniform float uBreakup;
varying vec3 vSnowWorld;
varying vec3 vSnowNormal;
${NOISE_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 n = normalize(vSnowNormal);
  vec3 p = vSnowWorld;
  float drift = snFbm(p * 0.18);
  float fine = snNoise(p * 2.3);
  // Ledges and tops: wind-drift patches, more of them the flatter the surface.
  float tops = smoothstep(0.3, 0.7, n.y) * smoothstep(0.4, 0.5, drift + n.y * 0.22 + (fine - 0.5) * 0.06);
  // Steep faces: tall, narrow runs (noise stretched along y); never under overhangs.
  float runs = snFbm(vec3(p.x * 0.45, p.y * 0.07, p.z * 0.45));
  float walls = smoothstep(-0.15, 0.2, n.y) * smoothstep(0.5, 0.57, runs + (fine - 0.5) * 0.08) * uSnowWall;
  float snow = clamp(max(tops, walls) * uSnowAmount, 0.0, 1.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, uSnowColor * (0.88 + 0.16 * fine), snow);
}`);
  });
}

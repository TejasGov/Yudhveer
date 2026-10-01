import * as THREE from 'three';

const MAX_IMPACTS = 6;

export interface WaterRippleOptions {
  color: THREE.ColorRepresentation;
  opacity: number;
  roughness?: number;
  envMapIntensity?: number;
  /** Slope multiplier of the ambient swell; 0 is a mirror. */
  waveStrength?: number;
  /** Metres per unit of the wave pattern; larger values stretch the ripples. */
  waveScale?: number;
}

/**
 * Shallow water: a MeshStandardMaterial whose normal is bent by analytic swells plus expanding impact rings
 * (footsteps, bodies hitting the water). Reflections come from `scene.environment`, so the surface picks up
 * each level's sky. Assumes a horizontal surface.
 */
export class WaterRippleMaterial extends THREE.MeshStandardMaterial {
  private readonly rippleUniforms = {
    uTime: { value: 0 },
    uWaveStrength: { value: 1 },
    uWaveScale: { value: 1 },
    uImpacts: { value: Array.from({ length: MAX_IMPACTS }, () => new THREE.Vector4(0, 0, -100, 0)) },
  };
  private nextImpact = 0;

  constructor(opts: WaterRippleOptions) {
    super({
      name: 'WaterRipple',
      color: opts.color,
      roughness: opts.roughness ?? 0.05,
      metalness: 0.05,
      transparent: opts.opacity < 1,
      opacity: opts.opacity,
      envMapIntensity: opts.envMapIntensity ?? 1.2,
    });
    // Water stays physically shaded (reflections) when a level converts to toon.
    this.userData.keepShading = true;
    this.rippleUniforms.uWaveStrength.value = opts.waveStrength ?? 0.35;
    this.rippleUniforms.uWaveScale.value = opts.waveScale ?? 1;

    this.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.rippleUniforms);
      this.userData.shader = shader;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWaterWorld;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
#define MAX_IMPACTS ${MAX_IMPACTS}
uniform float uTime;
uniform float uWaveStrength;
uniform float uWaveScale;
uniform vec4 uImpacts[MAX_IMPACTS];
varying vec3 vWaterWorld;

// Gradient of one travelling sine swell: direction, wavelength (m), speed (rad/s), amplitude.
vec2 swell(vec2 p, vec2 dir, float len, float speed, float amp) {
  vec2 d = normalize(dir);
  float k = 6.2831853 / len;
  return d * (k * amp * cos(dot(d, p) * k + uTime * speed));
}

vec2 waterSlope(vec2 p) {
  vec2 s = swell(p, vec2(1.0, 0.35), 3.1, 1.3, 0.030)
         + swell(p, vec2(-0.45, 1.0), 1.7, 1.9, 0.018)
         + swell(p, vec2(0.8, -0.9), 0.93, 2.7, 0.009)
         + swell(p, vec2(-1.0, -0.2), 0.51, 3.6, 0.004);
  for (int i = 0; i < MAX_IMPACTS; i++) {
    vec4 imp = uImpacts[i];
    float age = uTime - imp.z;
    if (age < 0.0 || age > 2.5) continue;
    vec2 dp = p - imp.xy;
    float r = length(dp);
    float front = age * 2.2;
    float band = (r - front) * 2.5;
    float envelope = exp(-band * band) * exp(-age * 1.7) * imp.w; // not pow(): negative bases are NaN on D3D
    s += (dp / max(r, 1e-3)) * envelope * cos((r - front) * 16.0) * 1.6;
  }
  return s;
}`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  vec2 slope = waterSlope(vWaterWorld.xz / uWaveScale) * uWaveStrength / uWaveScale;
  normal = normalize((viewMatrix * vec4(normalize(vec3(-slope.x, 1.0, -slope.y)), 0.0)).xyz);
}`);
    };
    this.customProgramCacheKey = () => 'yudhveer-water-ripple';
  }

  public update(time: number): void {
    this.rippleUniforms.uTime.value = time;
  }

  /** Spawns an expanding ring at world (x, z). Strength ~1 for a footstep, ~3 for a body fall. */
  public addImpact(x: number, z: number, strength = 1): void {
    const slot = this.rippleUniforms.uImpacts.value[this.nextImpact];
    slot.set(x / this.rippleUniforms.uWaveScale.value, z / this.rippleUniforms.uWaveScale.value, this.rippleUniforms.uTime.value, strength);
    this.nextImpact = (this.nextImpact + 1) % MAX_IMPACTS;
  }
}

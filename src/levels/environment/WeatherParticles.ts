import * as THREE from 'three';

export interface WeatherOptions {
  count: number;
  /** Size of the box of flakes that travels with the camera, metres. */
  extent: THREE.Vector3;
  fallSpeed: number;
  /** Radius of the swirling drift, metres. */
  swirl: number;
  /** Constant wind drift on x/z, metres per second. */
  wind: THREE.Vector2;
  /** Snowflake diameter in metres (ash and embers are drawn smaller). */
  size: number;
  /** Fractions of the population rendered as grey ash and glowing embers; the rest is snow. */
  ashFraction: number;
  emberFraction: number;
}

const VERTEX = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform vec3 uCenter;
uniform vec3 uExtent;
uniform float uFall;
uniform float uSwirl;
uniform vec2 uWind;
uniform float uSize;
uniform float uViewportHeight;
uniform float uAsh;
uniform float uEmber;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float kind = aSeed.w;
  bool ember = kind < uEmber;
  bool ash = !ember && kind < uEmber + uAsh;
  float speedJitter = mix(0.6, 1.4, fract(kind * 7.13 + aSeed.x));
  vec3 p = aSeed.xyz * uExtent;
  // Embers rise from the braziers' heat instead of falling.
  p.y += uTime * uFall * speedJitter * (ember ? 0.35 : -1.0);
  float phase = aSeed.y * 12.0 + kind * 6.2831;
  p.x += sin(uTime * 0.37 + phase) * uSwirl + uTime * uWind.x;
  p.z += cos(uTime * 0.29 + phase * 1.3) * uSwirl + uTime * uWind.y;
  vec3 origin = uCenter - uExtent * 0.5;
  p = origin + mod(p - origin, uExtent);

  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = uSize * (ember ? 0.45 : (ash ? 0.8 : 1.0)) * mix(0.7, 1.3, fract(kind * 31.7));
  gl_PointSize = min(size * projectionMatrix[1][1] * 0.5 * uViewportHeight / max(-mv.z, 0.1), 48.0);

  float edge = 1.0 - smoothstep(0.35, 0.5, length((p.xz - uCenter.xz) / uExtent.xz));
  vAlpha = smoothstep(0.4, 2.0, -mv.z) * edge;
  vColor = ember ? vec3(4.0, 1.1, 0.25) : (ash ? vec3(0.09, 0.09, 0.1) : vec3(0.62, 0.66, 0.72));
}`;

const FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.15, 0.5, d)) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Camera-following GPU snow / ash / ember field; everything moves in the vertex shader. */
export class WeatherParticles {
  public readonly points: THREE.Points;
  private readonly uniforms: Record<string, THREE.IUniform>;

  constructor(opts: WeatherOptions) {
    const seeds = new Float32Array(opts.count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    // Positions are computed in the shader; this attribute only sizes the draw call.
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(opts.count * 3), 3));

    this.uniforms = {
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector3() },
      uExtent: { value: opts.extent.clone() },
      uFall: { value: opts.fallSpeed },
      uSwirl: { value: opts.swirl },
      uWind: { value: opts.wind.clone() },
      uSize: { value: opts.size },
      uViewportHeight: { value: 1080 },
      uAsh: { value: opts.ashFraction },
      uEmber: { value: opts.emberFraction },
    };
    const material = new THREE.ShaderMaterial({
      name: 'WeatherParticles',
      uniforms: this.uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.name = 'WeatherParticles';
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  /** `viewportHeight` is the drawing-buffer height in pixels (point sizes are in pixels). */
  public update(time: number, cameraPosition: THREE.Vector3, viewportHeight: number): void {
    this.uniforms.uTime.value = time;
    this.uniforms.uCenter.value.copy(cameraPosition);
    this.uniforms.uViewportHeight.value = viewportHeight;
  }
}

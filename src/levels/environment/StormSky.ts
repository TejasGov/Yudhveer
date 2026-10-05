import * as THREE from 'three';

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uCloud;
uniform vec3 uHorizon;
uniform float uFlash;
uniform vec2 uFlashAt;
uniform vec2 uWind;
uniform vec3 uSun;
uniform vec3 uFog;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.55;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.07 + vec2(1.7, 9.2); a *= 0.5; }
  return s;
}

void main() {
  vec3 d = normalize(vDir);
  // Below the horizon it is the rain haze itself, so the sea's far edge melts into it from any height.
  if (d.y < 0.0) {
    gl_FragColor = vec4(uFog, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    return;
  }
  // The cloud deck as a plane overhead: directions near the horizon look a long way across it.
  vec2 uv = d.xz / (d.y + 0.14) * 1.6 + uWind * uTime;
  float n = fbm(uv);
  float cover = smoothstep(0.32, 0.72, n);
  float lower = fbm(uv * 2.3 + vec2(uTime * 0.05, 0.0));
  // Heavy and dark overhead, lighter towards the horizon, with one long break low over the sun where the sunset
  // still glows through.
  float up = smoothstep(0.0, 0.35, d.y);
  float alpha = mix(0.8, 0.98, up) * mix(0.82, 1.0, cover);
  vec3 sunDir = normalize(uSun);
  float az = dot(normalize(d.xz + 1e-4), normalize(sunDir.xz + 1e-4));
  float gap = smoothstep(0.55, 0.98, az) * (1.0 - smoothstep(0.02, 0.2, d.y));
  alpha *= 1.0 - 0.8 * gap * mix(1.0, 0.55, cover);
  vec3 col = mix(uHorizon, uCloud, up) * mix(1.25, 0.7, cover * lower);
  // Down to the haze at the horizon (outside the sun's break).
  float haze = 1.0 - smoothstep(0.0, 0.05, d.y);
  col = mix(col, uFog, haze);
  alpha = mix(alpha, 1.0, haze * (1.0 - gap * 0.85));
  // Lightning lights the deck from inside, brightest round where it struck.
  float near = exp(-3.0 * length(d.xz / max(d.y + 0.2, 0.2) - uFlashAt));
  col += uFlash * vec3(0.75, 0.8, 1.0) * (0.35 + 1.4 * near) * mix(0.5, 1.0, lower);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * A storm deck over the level's own sky: a camera-centred dome drawn over the HDR background (but behind all
 * geometry), dark and heavy overhead and broken low over the sun so the sunset still shows through. Lightning
 * lights it from inside.
 */
export class StormSky {
  public readonly mesh: THREE.Mesh;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private clock = 0;

  constructor(cloud: THREE.ColorRepresentation, horizon: THREE.ColorRepresentation, fog: THREE.ColorRepresentation, sun: THREE.Vector3) {
    this.uniforms = {
      uTime: { value: 0 },
      uCloud: { value: new THREE.Color(cloud) },
      uHorizon: { value: new THREE.Color(horizon) },
      uFlash: { value: 0 },
      uFlashAt: { value: new THREE.Vector2() },
      uWind: { value: new THREE.Vector2(0.018, 0.007) },
      uSun: { value: sun.clone().normalize() },
      uFog: { value: new THREE.Color(fog) },
    };
    const material = new THREE.ShaderMaterial({
      name: 'StormSky',
      uniforms: this.uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), material);
    this.mesh.name = 'StormSky';
    this.mesh.scale.setScalar(3800);
    this.mesh.frustumCulled = false;
    // First among the see-through things, so the hills' backdrop and the haze draw over it.
    this.mesh.renderOrder = -3;
  }

  public update(dt: number, camera: THREE.Camera, flash: number): void {
    this.clock += dt;
    this.uniforms.uTime.value = this.clock;
    // A new flash strikes somewhere new.
    if (flash > 0 && this.uniforms.uFlash.value === 0) (this.uniforms.uFlashAt.value as THREE.Vector2).set(Math.random() * 6 - 3, Math.random() * 6 - 3);
    this.uniforms.uFlash.value = flash;
    this.mesh.position.copy(camera.position);
  }
}

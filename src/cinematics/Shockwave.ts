import * as THREE from 'three';
import { SceneFX } from './SceneFX';
import { SceneManager } from '../core/SceneManager';
import { ParticleFX } from '../combat/ParticleFX';

/*
 * The ground answering a blow from above (docs/proposals/ENTRANCES.md, "the arrival"): a ring of light racing out
 * across the floor from `at`, cracks torn out through the stone glowing in the colour of what struck it (lightning
 * blue, naga green, lamp fire) and cooling to dark scars, and a ring of dust thrown up off the shock. One draw on the
 * floor, on the game's clock (slow motion holds it), gone when the chapter is left or after `seconds`.
 */

const FRAGMENT = /* glsl */ `
uniform float uRing;
uniform float uCrack;
uniform float uHeat;
uniform float uAlpha;
uniform vec3 uColor;
uniform float uSeed;
varying vec2 vP;
float hash(float x) { return fract(sin(x * 91.17 + uSeed) * 43758.5453); }
float noise(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }
void main() {
  float r = length(vP);
  float a = atan(vP.y, vP.x) / 6.28318 + 0.5;
  // The shock ring: thin and bright at its front, a soft wake behind.
  float front = smoothstep(uRing - 0.06, uRing, r) * (1.0 - smoothstep(uRing, uRing + 0.015, r));
  float wake = smoothstep(uRing - 0.35, uRing, r) * (1.0 - step(uRing, r)) * 0.25;
  float ring = (front + wake) * (1.0 - smoothstep(0.75, 1.0, uRing));
  // Cracks: radial lines that wander with distance, each its own length, forking once.
  float cracks = 0.0;
  for (int k = 0; k < 2; k++) {
    float n = 13.0 + float(k) * 9.0;
    float ang = a * n + (noise(r * 9.0 + float(k) * 13.0) - 0.5) * (0.9 + r * 1.6);
    float cell = floor(ang);
    float d = abs(fract(ang) - 0.5) / n * 6.28318 * max(r, 0.05);
    float len = (0.35 + 0.65 * hash(cell + float(k) * 50.0)) * uCrack * (k == 0 ? 1.0 : 0.6);
    float w = 0.012 * (1.0 - r / max(len, 0.01));
    cracks = max(cracks, (1.0 - smoothstep(w * 0.4, w, d)) * step(r, len) * step(0.06, r));
  }
  // The scorched, broken centre.
  float centre = 1.0 - smoothstep(0.05, 0.22 * uCrack + 0.01, r);
  vec3 hot = uColor * (2.6 * uHeat);
  vec3 col = hot * cracks + uColor * 2.2 * ring;
  float dark = max(cracks * (1.0 - uHeat), centre * 0.7);
  float alpha = uAlpha * clamp(max(max(cracks, ring), dark), 0.0, 1.0);
  if (alpha < 0.01) discard;
  // Lit cracks glow; cooled ones (and the centre) are dark scars.
  col = mix(vec3(0.02, 0.018, 0.016), col, clamp(uHeat * cracks + ring, 0.0, 1.0));
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`;

/**
 * A blow lands at `at` on the floor: the shock ring out to `radius` metres in a third of a second, cracks to most of
 * that, glowing `color` then cooling over a couple of seconds, the scars left `seconds` before they fade.
 */
export function groundShock(at: THREE.Vector3, options: { radius?: number; color?: THREE.ColorRepresentation; seconds?: number; dust?: boolean } = {}): void {
  const { radius = 9, color = 0x9ec4ff, seconds = 7, dust = true } = options;
  const sm = SceneManager.getInstance();
  const geometry = new THREE.PlaneGeometry(2, 2);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    name: 'GroundShock',
    uniforms: {
      uRing: { value: 0 },
      uCrack: { value: 0 },
      uHeat: { value: 1 },
      uAlpha: { value: 1 },
      uColor: { value: new THREE.Color(color) },
      uSeed: { value: Math.random() * 100 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'GroundShock';
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mesh.scale.set(radius, 1, radius);
  mesh.position.copy(at).add(new THREE.Vector3(0, 0.03, 0));
  sm.scene.add(mesh);
  sm.postFX.addBloom(mesh);
  let gone = false;
  const remove = () => {
    if (gone) return;
    gone = true;
    sm.postFX.removeBloom(mesh);
    mesh.removeFromParent();
    geometry.dispose();
    material.dispose();
  };
  const particles = ParticleFX.getInstance();
  let t = 0;
  let rounds = 0;
  const u = material.uniforms;
  SceneFX.every((dt) => {
    if (gone) return false;
    t += dt;
    u.uRing.value = Math.min(1, 1 - Math.pow(1 - Math.min(1, t / 0.35), 3));
    u.uCrack.value = 0.85 * (1 - Math.pow(1 - Math.min(1, t / 0.22), 2));
    u.uHeat.value = Math.max(0, 1 - t / 2.2);
    u.uAlpha.value = t < seconds - 1 ? 1 : Math.max(0, seconds - t);
    // Dust thrown up off the shock front as it passes: two rounds.
    if (dust && rounds < 2 && t >= rounds * 0.12) {
      rounds++;
      const ring = radius * u.uRing.value * 0.8 + 0.8;
      const n = 12;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + rounds * 0.3;
        particles.spawnDustPuff(new THREE.Vector3(at.x + Math.cos(ang) * ring, at.y + 0.1, at.z + Math.sin(ang) * ring), 8);
      }
    }
    if (t >= seconds) {
      remove();
      return false;
    }
    return true;
  });
  SceneFX.onClear(remove);
}

import * as THREE from 'three';
import { SceneFX } from '../../cinematics/SceneFX';
import { SceneManager } from '../../core/SceneManager';
import { ParticleFX } from '../../combat/ParticleFX';
import { seaHeight } from './LivingSea';

/*
 * The sea bursting away from something huge (docs/proposals/ENTRANCES.md, "Shalva"): a crater torn in the water, a
 * wide ring of white foam racing outward from it with streaks flung past the rim, and columns of spray off the ring,
 * over most of a second on the game's clock (a slowed shot holds it). One small draw on the water's surface, gone
 * when it is over.
 */

const FRAGMENT = /* glsl */ `
uniform float uOpen;
uniform float uAlpha;
uniform float uSeed;
varying vec2 vP;
float hash(float x) { return fract(sin(x * 78.233 + uSeed) * 43758.5453); }
// Value noise round the ring: "cells" random values about the circle, wrapping, so there is no seam.
float ringNoise(float turn, float cells) {
  float x = turn * cells;
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash(mod(i, cells)), hash(mod(i + 1.0, cells)), f);
}
void main() {
  float r = length(vP);
  float turn = atan(vP.y, vP.x) / 6.2831853 + 0.5;
  float n1 = ringNoise(turn, 6.0);
  float n2 = ringNoise(turn, 19.0);
  float n3 = ringNoise(turn, 53.0);
  // The front is ragged: it bulges and lags round the ring.
  float edge = max(uOpen, 0.001) * (1.0 + (n1 - 0.5) * 0.22 + (n2 - 0.5) * 0.1);
  // The foam at the front, broken into clots; tongues of it flung out past the front, each its own length; the dark
  // torn water inside.
  float rim = smoothstep(edge - 0.26, edge - 0.05, r) * (1.0 - smoothstep(edge, edge + 0.05, r)) * smoothstep(0.25, 0.6, n3 * 0.7 + n2 * 0.3);
  float tongue = smoothstep(0.62, 0.85, n3 * 0.55 + n2 * 0.45) * step(edge - 0.05, r) * (1.0 - smoothstep(edge, edge + 0.12 + 0.35 * n1, r));
  float inside = 1.0 - smoothstep(edge - 0.65, edge - 0.2, r);
  float foam = clamp(rim + tongue * 0.7, 0.0, 1.0);
  vec3 col = mix(vec3(0.015, 0.025, 0.04), vec3(1.7, 1.8, 1.95), foam);
  float alpha = uAlpha * clamp(inside * 0.8 + foam, 0.0, 1.0);
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`;

/** The sea bursts at `centre` (level coordinates, its height is read from the sea): to `radius` metres over `seconds`. */
export function seaBurst(centre: THREE.Vector3, options: { radius?: number; seconds?: number; spray?: number } = {}): void {
  const { radius = 10, seconds = 0.9, spray = 14 } = options;
  const sm = SceneManager.getInstance();
  const geometry = new THREE.PlaneGeometry(2, 2);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    name: 'SeaBurst',
    uniforms: { uOpen: { value: 0 }, uAlpha: { value: 1 }, uSeed: { value: Math.random() * 100 } },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'SeaBurst';
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.scale.set(radius, 1, radius);
  const place = () => mesh.position.set(centre.x, seaHeight(centre.x, centre.z) + 0.14, centre.z);
  place();
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
  let sprayed = 0;
  SceneFX.every((dt) => {
    if (gone) return false;
    t += dt;
    const k = Math.min(1, t / seconds);
    const open = 1 - (1 - k) * (1 - k) * (1 - k);
    material.uniforms.uOpen.value = open;
    material.uniforms.uAlpha.value = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
    place();
    // Spray goes up off the ring as it races out: three rounds of it.
    if (sprayed < 3 && k >= 0.05 + sprayed * 0.14) {
      sprayed++;
      const ring = radius * open;
      const n = 8;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + sprayed * 0.4;
        particles.spawnDustPuff(new THREE.Vector3(centre.x + Math.cos(ang) * ring, mesh.position.y, centre.z + Math.sin(ang) * ring), spray);
      }
    }
    if (k >= 1) {
      remove();
      return false;
    }
    return true;
  });
  SceneFX.onClear(remove);
}

const COLUMN_VERTEX = /* glsl */ `
uniform float uRise;
uniform float uFlare;
varying vec2 vUv;
varying float vY;
void main() {
  vUv = uv;
  // y runs 0 at the sea to 1 at the top; the column flares wider as it climbs, and wider still as it falls apart.
  float y = position.y;
  vY = y;
  float r = 0.55 + y * (0.9 + uFlare * 1.6);
  vec3 p = vec3(position.x * r, y * uRise, position.z * r);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const COLUMN_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uAlpha;
uniform float uDense;
varying vec2 vUv;
varying float vY;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  // Streaks of water torn upward: noise stretched up the column, scrolling up.
  vec2 q = vec2(vUv.x * 26.0, vY * 2.4 - uTime * 3.2);
  float n = noise(q) * 0.6 + noise(q * 2.3 + 7.0) * 0.4;
  float streaks = smoothstep(0.42 - uDense * 0.2, 0.78, n);
  // Solid at the foot, ragged and thinning toward the top.
  float body = (1.0 - smoothstep(0.55, 1.0, vY + (n - 0.5) * 0.35)) * smoothstep(0.0, 0.05, vY);
  float a = uAlpha * streaks * body * (0.45 + 0.4 * uDense);
  if (a < 0.01) discard;
  vec3 col = mix(vec3(0.4, 0.44, 0.48), vec3(1.05, 1.1, 1.15), streaks);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

/**
 * The sea thrown straight up at `centre` (something huge leaving the water): a column of torn white water `height`
 * metres high and about `radius` across, erupting over the first third of `seconds` (game time), hanging, then
 * coming apart; spray off its top as it climbs. Two shells: a dense core and a wider veil.
 */
export function waterColumn(centre: THREE.Vector3, options: { height?: number; radius?: number; seconds?: number; onFloor?: boolean; core?: boolean } = {}): void {
  // `core`: false for the veil alone, when someone must be seen inside it.
  const { height = 14, radius = 2.2, seconds = 1.8, onFloor = false, core = true } = options;
  // From the sea's surface there, or (onFloor) from `centre` itself: water torn up out of a pool on stone.
  const baseY = () => (onFloor ? centre.y : seaHeight(centre.x, centre.z));
  const sm = SceneManager.getInstance();
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 36, 12, true);
  geometry.translate(0, 0.5, 0);
  const shells = [
    { scale: radius, dense: 1 },
    { scale: radius * 1.55, dense: 0.25 },
  ].slice(core ? 0 : 1).map(({ scale, dense }) => {
    const material = new THREE.ShaderMaterial({
      name: 'WaterColumn',
      uniforms: { uRise: { value: 0 }, uFlare: { value: 0 }, uTime: { value: Math.random() * 10 }, uAlpha: { value: 1 }, uDense: { value: dense } },
      vertexShader: COLUMN_VERTEX,
      fragmentShader: COLUMN_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'WaterColumn';
    mesh.frustumCulled = false;
    mesh.renderOrder = 5;
    mesh.scale.set(scale, height, scale);
    mesh.position.set(centre.x, baseY() - 0.2, centre.z);
    sm.scene.add(mesh);
    return { mesh, material };
  });
  let gone = false;
  const remove = () => {
    if (gone) return;
    gone = true;
    for (const { mesh, material } of shells) {
      mesh.removeFromParent();
      material.dispose();
    }
    geometry.dispose();
  };
  const particles = ParticleFX.getInstance();
  let t = 0;
  let puff = 0;
  SceneFX.every((dt) => {
    if (gone) return false;
    t += dt;
    const k = Math.min(1, t / seconds);
    // Erupts over the first third (fast, easing out), hangs, and falls apart: wider, lower, fading.
    const up = Math.min(1, k / 0.32);
    const rise = 1 - (1 - up) * (1 - up) * (1 - up);
    const fall = Math.max(0, (k - 0.5) / 0.5);
    for (const { material } of shells) {
      material.uniforms.uRise.value = rise * (1 - 0.35 * fall * fall);
      material.uniforms.uFlare.value = fall;
      material.uniforms.uTime.value += dt;
      material.uniforms.uAlpha.value = k < 0.5 ? 1 : 1 - fall;
    }
    puff -= dt;
    if (puff <= 0 && k < 0.7) {
      puff = 0.06;
      const top = centre.clone().setY(baseY() + height * rise * (0.6 + Math.random() * 0.4));
      particles.spawnDustPuff(top.add(new THREE.Vector3((Math.random() - 0.5) * radius, 0, (Math.random() - 0.5) * radius)), 10);
    }
    if (k >= 1) {
      remove();
      return false;
    }
    return true;
  });
  SceneFX.onClear(remove);
}

import * as THREE from 'three';

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = clip.xyww; // pinned to the far plane
}`;

const FRAGMENT = /* glsl */ `
#include <common>
uniform sampler2D uSky;
uniform sampler2D uFlash;
uniform float uFlashMix;
uniform float uIntensity;
varying vec3 vDir;
void main() {
  vec2 uv = equirectUv(normalize(vDir));
  vec3 sky = texture2D(uSky, uv).rgb;
  vec3 flash = texture2D(uFlash, uv).rgb;
  gl_FragColor = vec4(mix(sky, flash, uFlashMix) * uIntensity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * Equirect sky on a camera-centred sphere, so it can crossfade to an alternate panorama
 * (lightning-lit variants) - `scene.background` can only hard-switch.
 * Uses the same equirect convention as `scene.background`, so baked skies line up with the level.
 */
export class SkyDome {
  public readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor(sky: THREE.Texture, intensity = 1) {
    this.material = new THREE.ShaderMaterial({
      name: 'SkyDome',
      uniforms: {
        uSky: { value: sky },
        uFlash: { value: sky },
        uFlashMix: { value: 0 },
        uIntensity: { value: intensity },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), this.material);
    this.mesh.name = 'SkyDome';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
  }

  public setFlash(texture: THREE.Texture | null, mix: number): void {
    if (texture) this.material.uniforms.uFlash.value = texture;
    this.material.uniforms.uFlashMix.value = mix;
  }

  public follow(camera: THREE.Camera): void {
    this.mesh.position.copy(camera.position);
  }
}

/**
 * Equirect textures sample across the u = 0/1 seam; mipmaps there pick a tiny level and draw a line.
 * Linear filtering without mips avoids it at the cost of slight shimmer on the far clouds.
 */
export function prepareEquirect(tex: THREE.Texture): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

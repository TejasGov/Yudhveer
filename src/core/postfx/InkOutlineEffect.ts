import * as THREE from 'three';
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';
import type { InkOutlineSettings } from '../../levels/LevelTypes';

const FRAGMENT = /* glsl */ `
uniform vec3 inkColor;
uniform float thickness;
uniform float threshold;
uniform vec2 fade;

float linearDepth(const in vec2 uv) {
  return -getViewZ(readDepth(uv));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  float d = -getViewZ(depth);
  vec2 t = texelSize * thickness;
  float dl = linearDepth(uv - vec2(t.x, 0.0));
  float dr = linearDepth(uv + vec2(t.x, 0.0));
  float dd = linearDepth(uv - vec2(0.0, t.y));
  float du = linearDepth(uv + vec2(0.0, t.y));
  // Relative second derivative: silhouettes and creases, independent of distance, ignores flat slopes.
  float edge = abs(dl + dr + dd + du - 4.0 * d) / max(d, 0.1);
  float ink = smoothstep(threshold, threshold * 2.5, edge);
  ink *= 1.0 - smoothstep(fade.x, fade.y, d);
  outputColor = vec4(mix(inputColor.rgb, inkColor, ink), inputColor.a);
}`;

/** Depth-discontinuity ink lines for the comic look; one full-screen pass, no extra geometry. */
export class InkOutlineEffect extends Effect {
  constructor() {
    super('InkOutlineEffect', FRAGMENT, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ['inkColor', new THREE.Uniform(new THREE.Color(0x05040a))],
        ['thickness', new THREE.Uniform(1.0)],
        ['threshold', new THREE.Uniform(0.02)],
        ['fade', new THREE.Uniform(new THREE.Vector2(30, 70))],
      ]),
    });
  }

  public configure(s: InkOutlineSettings): void {
    this.uniforms.get('inkColor')!.value.setHex(s.color);
    this.uniforms.get('thickness')!.value = s.thickness;
    this.uniforms.get('threshold')!.value = s.threshold;
    this.uniforms.get('fade')!.value.set(s.fadeNear, s.fadeFar);
  }
}

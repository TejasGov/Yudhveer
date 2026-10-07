import * as THREE from 'three';
import { BlendFunction, Effect } from 'postprocessing';

/*
 * The storm grade (docs/proposals/ENTRANCES.md, "Shalva"): the finished picture drained to silver monochrome, its
 * contrast pushed, its blacks crushed, coarse living film grain over it and the edges closed in. A scene fades it in
 * with `amount` (0 is the picture as it was, and costs a mix) and snaps it back to colour on a beat. Last in the main
 * effect pass, after the tone mapping, so it grades display colour.
 */

const FRAGMENT = /* glsl */ `
uniform float uAmount;
uniform float uTime;
uniform float uFlash;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 col = inputColor.rgb;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  // Graded as the eye sees it (display gamma; the effect runs in linear light and is put back at the end): a hard
  // S-curve that pulls the storm's greys apart (the sky up toward silver, the sea down toward slate, so the whitecaps
  // read on it) and crushes the blacks, so a figure against the sky is a silhouette.
  float d = pow(max(lum, 0.0), 1.0 / 2.2);
  float m = smoothstep(0.14, 0.78, d);
  // Silver: a breath of cold in the greys, put on after the curve (before it, the curve multiplied it into the shadows).
  vec3 mono = vec3(m) * vec3(0.97, 0.99, 1.03);
  // Lightning: the greys blow out toward white while the blacks hold, so a figure against the sky goes to pure
  // silhouette for a frame (the concept's strike frames).
  mono = pow(mono, vec3(1.0 / (1.0 + 1.2 * uFlash)));
  // Coarse grain, re-rolled every frame, heavier in the shadows.
  vec2 cell = floor(uv * resolution / 1.3);
  float g = hash(cell + vec2(fract(uTime * 7.31), fract(uTime * 3.17)) * 100.0) - 0.5;
  mono += g * 0.075 * (0.6 + 0.4 * (1.0 - m));
  // The edges close in, well past the level's own vignette.
  vec2 c = (uv - 0.5) * vec2(aspect, 1.0);
  mono *= 1.0 - 0.6 * smoothstep(0.32, 0.95, length(c));
  mono = pow(clamp(mono, 0.0, 1.0), vec3(2.2));
  outputColor = vec4(mix(col, mono, uAmount), inputColor.a);
}`;

export class StormGradeEffect extends Effect {
  constructor() {
    super('StormGradeEffect', FRAGMENT, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uAmount', new THREE.Uniform(0)],
        ['uTime', new THREE.Uniform(0)],
        ['uFlash', new THREE.Uniform(0)],
      ]),
    });
  }

  /** How far into the grade the picture is: 0 colour, 1 the silver storm. */
  public get amount(): number {
    return this.uniforms.get('uAmount')!.value as number;
  }

  public set amount(value: number) {
    this.uniforms.get('uAmount')!.value = THREE.MathUtils.clamp(value, 0, 1);
  }

  /** A lightning flash through the grade, 0..1 (Entrance.strike sets it and lets it die away). */
  public get flash(): number {
    return this.uniforms.get('uFlash')!.value as number;
  }

  public set flash(value: number) {
    this.uniforms.get('uFlash')!.value = THREE.MathUtils.clamp(value, 0, 1);
  }

  public override update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime = 0): void {
    this.uniforms.get('uTime')!.value = ((this.uniforms.get('uTime')!.value as number) + deltaTime) % 1000;
  }
}

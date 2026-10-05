import * as THREE from 'three';
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';

/*
 * A dazed hero's eyes (docs/STORY.md, "The prologue's ending"): the picture swims out of focus and back, splits into
 * two, its colours smear apart toward the edges, the edges close in, and the lids come down. Its own pass after the
 * grade (PostFX), so it blurs the finished picture, ink lines and bloom included; the pass only runs while any of it
 * is up (`active`). The Concussion driver (cinematics/Concussion.ts) sets it from scene cues.
 */

const FRAGMENT = /* glsl */ `
uniform float uBlur;
uniform vec2 uGhost;
uniform float uChroma;
uniform float uDark;
uniform float uLid;
uniform float uDesat;
uniform float uFlash;

const int TAPS = 16;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 c = uv - 0.5;
  // 0 at the centre, about 0.5 at the middle of the edges and up to ~0.8 in the corners (16:9).
  float edge = length(c * vec2(aspect, 1.0));
  vec3 col = inputColor.rgb;
  bool ghost = dot(uGhost, uGhost) > 1e-9;
  if (uBlur > 0.001 || ghost || uChroma > 0.001) {
    // A disc of taps on a golden-angle spiral, turned per pixel so its pattern dissolves into grain; out of focus
    // more toward the edges. Half the taps read a second, shifted picture: double vision.
    float radius = uBlur * (0.75 + 1.1 * edge);
    vec2 scale = vec2(1.0 / aspect, 1.0);
    float spin = hash(floor(uv * resolution)) * 6.2831853;
    vec2 smear = normalize(c + 1e-5) * uChroma * (0.35 + 1.6 * edge) * scale;
    vec3 sum = vec3(0.0);
    for (int i = 0; i < TAPS; i++) {
      float fi = float(i);
      float r = sqrt((fi + 0.5) / float(TAPS)) * radius;
      float a = fi * 2.39996323 + spin;
      vec2 p = uv + vec2(cos(a), sin(a)) * r * scale;
      if (ghost && mod(fi, 2.0) > 0.5) p += uGhost;
      if (uChroma > 0.001) {
        sum += vec3(texture2D(inputBuffer, p + smear).r, texture2D(inputBuffer, p).g, texture2D(inputBuffer, p - smear).b);
      } else {
        sum += texture2D(inputBuffer, p).rgb;
      }
    }
    col = sum / float(TAPS);
  }
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, vec3(lum), uDesat);
  // The blow: a hot white-gold flash.
  col += uFlash * vec3(1.0, 0.86, 0.7);
  // The edges close in.
  col *= 1.0 - uDark * smoothstep(0.18, 0.78, edge);
  // The lids: a slit that narrows from top and bottom, its corners closing first.
  float open = 1.0 - uLid;
  float x = (uv.x - 0.5) * 2.0;
  float lidY = open * (1.0 - (1.0 - open) * 0.55 * x * x) + 0.08 * open;
  col *= 1.0 - smoothstep(lidY - 0.08, lidY, abs(uv.y - 0.5) * 2.0);
  outputColor = vec4(col, inputColor.a);
}`;

export interface ConcussionParams {
  /** Out of focus: the blur's radius as a fraction of the screen's height (0.012 is heavy). */
  blur: number;
  /** Double vision: the second picture's offset, as a fraction of the screen's height. */
  ghost: THREE.Vector2;
  /** Colour fringes toward the edges, as a fraction of the screen's height. */
  chroma: number;
  /** The edges darkening, 0..1. */
  dark: number;
  /** The eyelids, 0 open .. 1 shut. */
  lid: number;
  /** Colour drained, 0..1. */
  desat: number;
  /** A white flash, 0..1. */
  flash: number;
}

export class ConcussionEffect extends Effect {
  constructor() {
    super('ConcussionEffect', FRAGMENT, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['uBlur', new THREE.Uniform(0)],
        ['uGhost', new THREE.Uniform(new THREE.Vector2())],
        ['uChroma', new THREE.Uniform(0)],
        ['uDark', new THREE.Uniform(0)],
        ['uLid', new THREE.Uniform(0)],
        ['uDesat', new THREE.Uniform(0)],
        ['uFlash', new THREE.Uniform(0)],
      ]),
    });
  }

  /** Whether any of it shows (the pass is skipped when not). */
  public active = false;

  public set(p: ConcussionParams): void {
    const u = this.uniforms;
    u.get('uBlur')!.value = p.blur;
    (u.get('uGhost')!.value as THREE.Vector2).copy(p.ghost);
    u.get('uChroma')!.value = p.chroma;
    u.get('uDark')!.value = p.dark;
    u.get('uLid')!.value = p.lid;
    u.get('uDesat')!.value = p.desat;
    u.get('uFlash')!.value = p.flash;
    this.active = p.blur > 1e-4 || p.ghost.lengthSq() > 1e-9 || p.chroma > 1e-4 || p.dark > 1e-3 || p.lid > 1e-3 || p.desat > 1e-3 || p.flash > 1e-3;
  }

  /** Clear eyes: everything off, the pass skipped. */
  public reset(): void {
    this.set({ blur: 0, ghost: new THREE.Vector2(), chroma: 0, dark: 0, lid: 0, desat: 0, flash: 0 });
  }
}

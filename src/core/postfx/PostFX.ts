import * as THREE from 'three';
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  SelectiveBloomEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  type Effect,
} from 'postprocessing';
import { InkOutlineEffect } from './InkOutlineEffect';
import type { LevelAtmosphere } from '../../levels/LevelTypes';

/**
 * HDR post chain: scene -> [ink outline] -> selective bloom -> vignette -> ACES tone mapping.
 * The renderer itself runs without tone mapping; everything is graded here in half-float.
 * Only objects added with `addBloom` glow, and only where they exceed the level's luminance threshold,
 * so sparks, embers, flames and blade trails bloom while lit stone never does.
 */
export class PostFX {
  public readonly composer: EffectComposer;
  public readonly bloom: SelectiveBloomEffect;
  private readonly ink = new InkOutlineEffect();
  private readonly vignette = new VignetteEffect({ offset: 0.3, darkness: 0.55 });
  private readonly toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  private effectPass: EffectPass | null = null;
  private inkEnabled: boolean | null = null;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, private readonly camera: THREE.Camera) {
    renderer.toneMapping = THREE.NoToneMapping;
    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: Math.min(4, renderer.capabilities.maxSamples),
    });
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new SelectiveBloomEffect(scene, camera, {
      mipmapBlur: true,
      luminanceThreshold: 0.9,
      luminanceSmoothing: 0.1,
      intensity: 1.5,
      radius: 0.7,
    });
    this.rebuildPass(false);
  }

  /** The effect list is compiled into one shader, so toggling ink rebuilds the pass (only on level change). */
  private rebuildPass(withInk: boolean): void {
    if (this.inkEnabled === withInk) return;
    this.inkEnabled = withInk;
    if (this.effectPass) {
      this.composer.removePass(this.effectPass);
      this.effectPass.dispose();
    }
    const effects: Effect[] = withInk ? [this.ink] : [];
    effects.push(this.bloom, this.vignette, this.toneMapping);
    this.effectPass = new EffectPass(this.camera, ...effects);
    this.composer.addPass(this.effectPass);
  }

  public configure(atm: LevelAtmosphere): void {
    this.bloom.luminanceMaterial.threshold = atm.bloom.threshold;
    this.bloom.luminanceMaterial.smoothing = atm.bloom.smoothing;
    this.bloom.intensity = atm.bloom.intensity;
    this.vignette.offset = atm.vignette.offset;
    this.vignette.darkness = atm.vignette.darkness;
    if (atm.ink) this.ink.configure(atm.ink);
    this.rebuildPass(atm.ink !== null);
  }

  public setBloomObjects(objects: THREE.Object3D[]): void {
    this.bloom.selection.clear();
    objects.forEach((o) => this.bloom.selection.add(o));
  }

  public addBloom(object: THREE.Object3D): void {
    this.bloom.selection.add(object);
  }

  public removeBloom(object: THREE.Object3D): void {
    this.bloom.selection.delete(object);
  }

  public setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  public render(dt: number): void {
    this.composer.render(dt);
  }
}

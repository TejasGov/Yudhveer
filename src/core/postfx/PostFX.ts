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
import { ConcussionEffect } from './ConcussionEffect';
import type { LevelAtmosphere } from '../../levels/LevelTypes';

/**
 * HDR post chain: scene -> [ink outline] -> selective bloom -> vignette -> ACES tone mapping -> [concussion].
 * The renderer itself runs without tone mapping; everything is graded here in half-float. The concussion (a dazed
 * hero's swimming eyes, `concussion`) is a pass of its own on the finished picture, run only while it shows.
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
  /** A dazed hero's eyes (cinematics/Concussion.ts drives it); its pass is skipped while it shows nothing. */
  public readonly concussion = new ConcussionEffect();
  private readonly concussionPass: EffectPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, private readonly camera: THREE.Camera) {
    renderer.toneMapping = THREE.NoToneMapping;
    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: Math.min(4, renderer.capabilities.maxSamples),
    });
    // Which pass draws to the screen is decided per frame (the concussion's, while it shows).
    this.composer.autoRenderToScreen = false;
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new SelectiveBloomEffect(scene, camera, {
      mipmapBlur: true,
      luminanceThreshold: 0.9,
      luminanceSmoothing: 0.1,
      intensity: 1.5,
      radius: 0.7,
    });
    this.rebuildPass(false);
    this.concussionPass = new EffectPass(camera, this.concussion);
    this.concussionPass.enabled = false;
    this.composer.addPass(this.concussionPass);
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
    // Straight after the scene render, before the concussion's pass.
    this.composer.addPass(this.effectPass, 1);
  }

  public configure(atm: LevelAtmosphere): void {
    this.bloom.luminanceMaterial.threshold = atm.bloom.threshold;
    this.bloom.luminanceMaterial.smoothing = atm.bloom.smoothing;
    this.bloom.intensity = atm.bloom.intensity;
    this.vignette.offset = atm.vignette.offset;
    this.vignette.darkness = atm.vignette.darkness;
    if (atm.ink) this.ink.configure(atm.ink);
    this.toneMapping.mode = atm.toneMapping === 'agx' ? ToneMappingMode.AGX : ToneMappingMode.ACES_FILMIC;
    this.rebuildPass(atm.ink !== null);
  }

  /** Glowing things that belong to no level (the fight's sparks and embers): kept selected through every level load. */
  private readonly lasting = new Set<THREE.Object3D>();

  public setBloomObjects(objects: THREE.Object3D[]): void {
    this.bloom.selection.clear();
    this.lasting.forEach((o) => this.bloom.selection.add(o));
    objects.forEach((o) => this.bloom.selection.add(o));
  }

  /** Selects `object` for the bloom for good (`setBloomObjects` keeps it). */
  public keepBloom(object: THREE.Object3D): void {
    this.lasting.add(object);
    this.bloom.selection.add(object);
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
    const dazed = this.concussion.active;
    this.concussionPass.enabled = dazed;
    this.concussionPass.renderToScreen = dazed;
    if (this.effectPass) this.effectPass.renderToScreen = !dazed;
    this.composer.render(dt);
  }
}

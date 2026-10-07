import * as THREE from 'three';
import { SceneFX } from './SceneFX';
import { joltCamera } from './CinematicDirector';
import { SoundFX } from '../combat/SoundFX';
import { ParticleFX } from '../combat/ParticleFX';
import { SceneManager } from '../core/SceneManager';
import type { Character } from '../entities/Character';
import type { GameLevel } from '../levels/LevelTypes';
import { bolt, bonesOf, crawl } from './Lightning';
import { groundShock } from './Shockwave';
import { motes } from './DivineLight';

/*
 * The pieces an "aura" entrance is built from (docs/proposals/ENTRANCES.md): a bolt of lightning on cue, a figure
 * thrown through the air to a mark, and the ground answering a landing. Each is a plain function a scene's `run` cue
 * calls, on the game's own clock (SceneFX), so a shot in slow motion (`SceneShot.timeScale`) slows them with the world.
 */

/**
 * Lightning now, and its thunder `lag` seconds after: the sky and the storm light up by `strength` (1 near, 1.6 on the
 * boss). With `at`, the bolt itself is drawn down onto that point (Lightning.ts) and the level's storm deck, if it
 * has one, glows brightest over it (`aimLightning`).
 */
export function strike(strength = 1, lag = 0.3, options: { at?: THREE.Vector3; level?: GameLevel; width?: number } = {}): void {
  if (options.at) {
    (options.level as { aimLightning?: (p: THREE.Vector3) => void } | undefined)?.aimLightning?.(options.at);
    bolt(options.at, { width: options.width });
  }
  // Through the storm grade, if it is up: the light flares less (a full flare washes the silver out and swallows the
  // bolt), and the greys lift toward white for a moment while the figures stay black.
  const fx = SceneManager.getInstance().postFX.grade;
  const graded = fx.amount > 0.05;
  SoundFX.getInstance().strike(strength, lag, graded ? strength * 0.3 : strength);
  if (graded) {
    const peak = Math.min(0.7, 0.3 + 0.25 * strength);
    SceneFX.tween(0.32, (k) => { fx.flash = peak * (k < 0.12 ? 1 : k < 0.2 ? 0.35 : k < 0.3 ? 0.9 : 1 - (k - 0.3) / 0.7); }, { ease: (t) => t });
    SceneFX.onClear(() => { fx.flash = 0; });
  }
}

/**
 * Lightning crawling over `actor` for `seconds` (world time): arcs leaping between his bones (Lightning.crawl), the
 * storm on his armour.
 */
export function charged(actor: Character, seconds: number, options: { width?: number; arcs?: number; color?: THREE.Color; rate?: number; reach?: number } = {}): void {
  crawl(() => bonesOf(actor.rig?.root), seconds, options);
}

/**
 * Eyes kindling in `actor`'s face (a bound guardian waking, a corpse opening its eyes): two hot points and a glow
 * between them, kept on its head as it moves, `size` scaled to its height. Set up dark; the returned function lights
 * them over `seconds` (world time). Gone when the chapter is left, or with `out`.
 */
export function glowingEyes(actor: Character, options: { color?: THREE.ColorRepresentation; size?: number; height?: number } = {}): { kindle: (seconds: number) => void; out: (seconds: number) => void } {
  const { color = 0xff7a33, size = 0.16, height = 1.8 } = options;
  const sm = SceneManager.getInstance();
  const k = height / 1.8;
  let head: THREE.Object3D | undefined;
  actor.rig?.root.traverse((o) => {
    if (!head && (o as THREE.Bone).isBone && /^(mixamorig:?)?head$/i.test(o.name)) head = o;
  });
  const dot = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const hot = new THREE.Color(color).multiplyScalar(3);
  const mats: THREE.SpriteMaterial[] = [];
  const sprites = [size * 0.32 * k, size * 0.32 * k, size * 2.0 * k].map((scale, i) => {
    const mat = new THREE.SpriteMaterial({ map: dot, color: i < 2 ? hot.clone().lerp(new THREE.Color(4, 4, 3.6), 0.35) : new THREE.Color(color), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: i === 2, fog: false });
    mats.push(mat);
    const sprite = new THREE.Sprite(mat);
    sprite.scale.setScalar(scale);
    sprite.renderOrder = 5;
    sm.scene.add(sprite);
    sm.postFX.addBloom(sprite);
    return sprite;
  });
  let level = 0;
  let gone = false;
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const fwd = new THREE.Vector3();
  const up = new THREE.Vector3();
  const right = new THREE.Vector3();
  SceneFX.every(() => {
    if (gone) return false;
    if (!head) return true;
    head.getWorldPosition(pos);
    head.getWorldQuaternion(quat);
    // A Mixamo head bone: +Z out of the face, +Y up the skull, its origin at the base of it.
    fwd.set(0, 0, 1).applyQuaternion(quat);
    up.set(0, 1, 0).applyQuaternion(quat);
    right.crossVectors(up, fwd).normalize();
    const eyes = pos.addScaledVector(up, 0.085 * k).addScaledVector(fwd, 0.1 * k);
    sprites[0].position.copy(eyes).addScaledVector(right, 0.034 * k);
    sprites[1].position.copy(eyes).addScaledVector(right, -0.034 * k);
    sprites[2].position.copy(eyes).addScaledVector(fwd, 0.04 * k);
    const flicker = 0.85 + Math.random() * 0.15;
    mats[0].opacity = mats[1].opacity = level * flicker;
    mats[2].opacity = level * 0.28 * flicker;
    return true;
  });
  const remove = () => {
    if (gone) return;
    gone = true;
    for (const sprite of sprites) {
      sm.postFX.removeBloom(sprite);
      sprite.removeFromParent();
    }
    for (const mat of mats) mat.dispose();
    dot.dispose();
  };
  SceneFX.onClear(remove);
  return {
    kindle: (seconds) => SceneFX.tween(seconds, (t) => { level = t; }, { ease: (t) => t * t }),
    out: (seconds) => SceneFX.tween(seconds, (t) => { level = 1 - t; if (t >= 1) remove(); }),
  };
}

/**
 * The world holds its breath (SoundFX.hush): the rain, the sea and the music down to `level` over `seconds`; 1
 * brings them back, and leaving the chapter always does.
 */
export function hush(level: number, seconds = 0.4): void {
  SoundFX.getInstance().hush(level, seconds);
  SceneFX.onClear(() => SoundFX.getInstance().hush(1, 0.2));
}

/**
 * A boss arrives on the floor at `at`: the shock ring and the cracks glowing `color` (Shockwave.groundShock), the
 * dust, the quake and the jolt (`landing`), the sub boom, and the world's sound coming back with the blow.
 */
export function impact(at: THREE.Vector3, options: { color?: THREE.ColorRepresentation; radius?: number; wet?: boolean; jolt?: number; strength?: number } = {}): void {
  const { color, radius = 9, wet = false, jolt = 0.2, strength = 1 } = options;
  groundShock(at, { radius, color });
  landing(at, { dust: 80, wet, jolt });
  SoundFX.getInstance().playImpactBoom(strength);
  hush(1, 0.25);
}

/**
 * The storm grade (PostFX.grade): the picture drained to silver and grain over `seconds` of world time to `amount`
 * (1 full, 0 colour). Put back to colour when the chapter is left.
 */
export function grade(amount: number, seconds = 0.5): void {
  // A grade set outright wins over any throb or grade still running (`throb`): a skipped entrance's `grade(0, 0)`
  // must not be undone by the tween of a cue it cut short.
  const epoch = ++throbEpoch;
  const fx = SceneManager.getInstance().postFX.grade;
  const from = fx.amount;
  if (seconds <= 0) fx.amount = amount;
  else SceneFX.tween(seconds, (k) => { if (epoch === throbEpoch) fx.amount = THREE.MathUtils.lerp(from, amount, k); });
  SceneFX.onClear(() => { fx.amount = 0; });
}

/**
 * Throws `actor` from where it stands to `to` along a parabola whose top is `apex` metres over the higher of the two
 * ends, over `seconds` (world time), turned to face its landing; `onLand` as it arrives. For the story's cast (no body
 * to fall): a fighter would be pulled back by its motor.
 */
export function arc(actor: Character, to: THREE.Vector3, apex: number, seconds: number, onLand?: () => void): void {
  const from = actor.group.position.clone();
  const end = to.clone();
  const top = Math.max(from.y, end.y) + apex;
  const lift = top - (from.y + end.y) / 2;
  actor.faceYaw(Math.atan2(end.x - from.x, end.z - from.z));
  let landed = false;
  SceneFX.tween(seconds, (k) => {
    const p = actor.group.position;
    p.lerpVectors(from, end, k);
    p.y = THREE.MathUtils.lerp(from.y, end.y, k) + lift * 4 * k * (1 - k);
    actor.markTeleported();
    if (k >= 1 && !landed) {
      landed = true;
      onLand?.();
    }
  }, { ease: (t) => t });
}

/**
 * The ground answers something heavy landing at `at`: a burst of dust (or spray), the stone shuddering under the
 * camera, a jolt to the cutscene frame and a heavy splash or thud.
 */
export function landing(at: THREE.Vector3, options: { dust?: number; wet?: boolean; jolt?: number } = {}): void {
  const { dust = 60, wet = false, jolt = 0.14 } = options;
  ParticleFX.getInstance().spawnDustPuff(at, dust);
  SceneManager.getInstance().quake(at);
  joltCamera(jolt);
  const sfx = SoundFX.getInstance();
  if (wet) sfx.playSplash(5);
  sfx.playFallingBlow();
}

// --------------------------------------------------------------------------------------------- the fallen go

/**
 * The fallen each go their own way (docs/STORY.md, "How the dead speak"): these are the pieces. Materials changed here
 * are put back when the chapter is left.
 */

/** Every material on `actor`'s model, once each. */
function materialsOf(actor: Character): THREE.MeshStandardMaterial[] {
  const out = new Set<THREE.MeshStandardMaterial>();
  actor.rig?.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of ([] as THREE.Material[]).concat(mesh.material)) out.add(m as THREE.MeshStandardMaterial);
  });
  return [...out];
}

/**
 * Back to stone over `seconds` (the Baoli Guardian freed: a carving again): its colours drain to the grey of weathered
 * stone and any glow in it goes out; golden motes lift off it as the binding leaves.
 */
export function turnToStone(actor: Character, seconds = 2.5): void {
  const stone = new THREE.Color(0x8d8a82);
  const was = materialsOf(actor).map((m) => ({ m, color: m.color?.clone(), emissive: m.emissive?.clone() }));
  SceneFX.tween(seconds, (k) => {
    for (const { m, color, emissive } of was) {
      if (color && m.color) {
        const grey = (color.r * 0.3 + color.g * 0.59 + color.b * 0.11) * 0.6 + 0.4;
        m.color.copy(color).lerp(stone.clone().multiplyScalar(grey), k);
      }
      if (emissive && m.emissive) m.emissive.copy(emissive).multiplyScalar(1 - k);
    }
  });
  SceneFX.onClear(() => {
    for (const { m, color, emissive } of was) {
      if (color && m.color) m.color.copy(color);
      if (emissive && m.emissive) m.emissive.copy(emissive);
    }
  });
  const sm = SceneManager.getInstance();
  const source = motes(sm.scene, { at: actor.getPosition().add(new THREE.Vector3(0, 1.4, 0)), radius: 1.2, rate: 26, rise: 2.4, life: 2.6, color: new THREE.Color(2.6, 2.0, 1.1), size: 0.14 });
  SceneFX.tween(seconds + 1.5, (k) => { source.rate = 26 * (1 - k); });
}

/**
 * Burnt away in fire of `color` over `seconds` (Takshaka, the naga king, gone in naga fire): the fire crawling over
 * him and rising off him as motes, his body thinning to nothing; then out of sight.
 */
export function burnAway(actor: Character, color: THREE.ColorRepresentation, seconds = 3): void {
  const hot = new THREE.Color(color).multiplyScalar(2.4);
  charged(actor, seconds, { color: hot, arcs: 7, width: 0.06, rate: 20, reach: 1.1 });
  const sm = SceneManager.getInstance();
  const source = motes(sm.scene, { at: actor.getPosition().add(new THREE.Vector3(0, 0.6, 0)), radius: 1.4, rate: 60, rise: 3.2, life: 2.2, color: hot, size: 0.16 });
  const mats = materialsOf(actor).map((m) => ({ m, opacity: m.opacity, transparent: m.transparent }));
  SceneFX.tween(seconds, (k) => {
    for (const { m, opacity } of mats) {
      m.transparent = true;
      m.opacity = opacity * (1 - k * k);
    }
    source.rate = 60 * (1 - k);
    if (k >= 1) actor.group.visible = false;
  });
  SceneFX.onClear(() => {
    for (const { m, opacity, transparent } of mats) {
      m.opacity = opacity;
      m.transparent = transparent;
    }
  });
  SoundFX.getInstance().playFlameBurst();
}

/**
 * Water beginning to glow at `at` (a way opening under the stepwell): a soft light on the surface with rings rippling
 * out of it, motes lifting off it and a lamp under it, fading up over `seconds`. Gone when the chapter is left.
 */
export function glowingWater(at: THREE.Vector3, options: { radius?: number; color?: THREE.ColorRepresentation; seconds?: number } = {}): { burst: () => void } {
  const { radius = 2.6, color = 0xffd890, seconds = 2 } = options;
  const sm = SceneManager.getInstance();
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLevel: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() { vP = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uLevel;
      uniform vec3 uColor;
      varying vec2 vP;
      void main() {
        float r = length(vP);
        float core = exp(-r * r * 5.0);
        float rings = (0.5 + 0.5 * sin(r * 22.0 - uTime * 3.2)) * (1.0 - smoothstep(0.2, 1.0, r)) * 0.35;
        float a = uLevel * clamp(core + rings, 0.0, 1.0) * (1.0 - smoothstep(0.85, 1.0, r));
        if (a < 0.005) discard;
        gl_FragColor = vec4(uColor * (1.4 + core * 1.6), a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const geometry = new THREE.PlaneGeometry(2 * radius, 2 * radius);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(at).add(new THREE.Vector3(0, 0.02, 0));
  mesh.renderOrder = 4;
  sm.scene.add(mesh);
  sm.postFX.addBloom(mesh);
  const light = new THREE.PointLight(color, 0, radius * 5, 2);
  light.position.copy(at).add(new THREE.Vector3(0, 0.6, 0));
  sm.scene.add(light);
  const source = motes(sm.scene, { at: at.clone(), radius: radius * 0.6, rate: 0, rise: 1.8, life: 2.4, color: new THREE.Color(color).multiplyScalar(2.2), size: 0.12 });
  let gone = false;
  SceneFX.every((dt) => {
    if (gone) return false;
    material.uniforms.uTime.value += dt;
    return true;
  });
  SceneFX.tween(seconds, (k) => {
    material.uniforms.uLevel.value = k;
    light.intensity = 9 * k;
    source.rate = 18 * k;
  });
  SceneFX.onClear(() => {
    gone = true;
    sm.postFX.removeBloom(mesh);
    mesh.removeFromParent();
    light.removeFromParent();
    geometry.dispose();
    material.dispose();
  });
  return {
    // Something goes in: the light flares up and settles.
    burst: () => SceneFX.tween(1.2, (k) => {
      const flare = Math.sin(Math.PI * Math.min(1, k * 1.6));
      material.uniforms.uLevel.value = 1 + flare * 1.5;
      light.intensity = 9 + flare * 40;
      source.rate = 18 + flare * 80;
    }, { ease: (t) => t }),
  };
}

/**
 * A throb of colour through the storm grade (Andhaka's entrance: power and fear): the picture, black and white, flushes
 * toward colour by \`depth\` (1: all the way) and drains back over \`seconds\`, like a heartbeat.
 */
export function throb(depth = 0.65, seconds = 0.7): void {
  const fx = SceneManager.getInstance().postFX.grade;
  const epoch = throbEpoch;
  SceneFX.tween(seconds, (k) => {
    if (epoch !== throbEpoch) return;
    fx.amount = 1 - depth * Math.sin(Math.PI * k) * (k < 0.5 ? 1 : 1 - (k - 0.5) * 0.6);
  }, { ease: (t) => t });
}
/** Bumped by every `grade`: a throb or grade begun before it no longer touches the picture. */
let throbEpoch = 0;

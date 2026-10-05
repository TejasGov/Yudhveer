import * as THREE from 'three';
import { SceneFX } from './SceneFX';
import type { Character } from '../entities/Character';
import { SceneManager } from '../core/SceneManager';

/*
 * The summit's last light (docs/STORY.md, "Milestone 9"): the guru turning to light, the statue of Shiva waking, the
 * eclipse giving way. Each effect is started by a scene cue, runs on SceneFX's clock and is undone with the chapter.
 */

/** A soft round dot, for the motes and the halo's glow. */
function softDot(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Puts `obj` into the scene's selective bloom (with its meshes), and takes it out again on clear. */
function bloom(obj: THREE.Object3D): void {
  const fx = SceneManager.getInstance().postFX;
  obj.traverse((o) => fx.addBloom(o));
  SceneFX.onClear(() => obj.traverse((o) => fx.removeBloom(o)));
}

/** Removes `obj` from its parent and frees its geometry and materials on clear. */
function disposeOnClear(obj: THREE.Object3D, textures: THREE.Texture[] = []): void {
  SceneFX.onClear(() => {
    obj.removeFromParent();
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
      mats.forEach((m) => m.dispose());
    });
    textures.forEach((t) => t.dispose());
  });
}

/**
 * Motes of light drifting up from around a point: `rate` per second while it is above 0. They rise, sway and fade.
 * Returns a handle to move the source and change the rate.
 */
export function motes(
  parent: THREE.Object3D,
  options: { at: THREE.Vector3; radius: number; rate: number; rise?: number; life?: number; color?: THREE.Color; size?: number; spin?: number; spread?: number },
): { at: THREE.Vector3; rate: number; radius: number } {
  const MAX = 420;
  const positions = new Float32Array(MAX * 3);
  const alphas = new Float32Array(MAX);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  const map = softDot();
  const color = options.color ?? new THREE.Color(2.4, 2.0, 1.3);
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, color: { value: color }, size: { value: options.size ?? 0.18 }, scale: { value: 600 } },
    vertexShader: /* glsl */ `
      attribute float alpha;
      varying float vAlpha;
      uniform float size;
      uniform float scale;
      void main() {
        vAlpha = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * scale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform vec3 color;
      varying float vAlpha;
      void main() {
        float a = texture2D(map, gl_PointCoord).a * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(color * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  parent.add(points);
  bloom(points);
  disposeOnClear(points, [map]);

  const handle = { at: options.at.clone(), rate: options.rate, radius: options.radius };
  const rise = options.rise ?? 1.1;
  const life = options.life ?? 3.2;
  // Optional: a whirl round the source (rad/s) and an outward drift (m/s), for sparks thrown off.
  const spin = options.spin ?? 0;
  const spread = options.spread ?? 0;
  const parts: { p: THREE.Vector3; v: THREE.Vector3; age: number; phase: number }[] = [];
  let owed = 0;
  SceneFX.every((dt) => {
    owed += handle.rate * dt;
    while (owed >= 1 && parts.length < MAX) {
      owed -= 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * handle.radius;
      parts.push({
        p: handle.at.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.random() * 0.4, Math.sin(a) * r)),
        v: new THREE.Vector3(0, rise * (0.6 + Math.random() * 0.8), 0),
        age: 0,
        phase: Math.random() * 6.28,
      });
    }
    owed = Math.min(owed, 1);
    for (let i = parts.length - 1; i >= 0; i--) {
      const m = parts[i];
      m.age += dt;
      if (m.age >= life) {
        parts.splice(i, 1);
        continue;
      }
      m.p.addScaledVector(m.v, dt);
      if (spin || spread) {
        const dx = m.p.x - handle.at.x;
        const dz = m.p.z - handle.at.z;
        const r = Math.hypot(dx, dz) || 1e-3;
        m.p.x += (-dz * spin + (dx / r) * spread) * dt;
        m.p.z += (dx * spin + (dz / r) * spread) * dt;
      }
      m.p.x += Math.sin(m.age * 1.7 + m.phase) * 0.25 * dt;
      m.p.z += Math.cos(m.age * 1.3 + m.phase) * 0.25 * dt;
    }
    for (let i = 0; i < MAX; i++) {
      const m = parts[i];
      if (m) {
        positions.set([m.p.x, m.p.y, m.p.z], i * 3);
        const u = m.age / life;
        alphas[i] = Math.min(1, u * 5) * (1 - u);
      } else alphas[i] = 0;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.alpha.needsUpdate = true;
  });
  return handle;
}

/**
 * Someone becomes light: light gathers in them (their surfaces glow white-gold, a light swells at their chest, motes
 * rise off them), then they fade into it and are gone; they are hidden at the end. Set up now (its light dark, so
 * adding it costs its shader rebuild before anyone is watching); the returned function starts it, over `seconds`.
 */
export function intoLight(parent: THREE.Object3D, who: Character): (seconds: number) => void {
  const mats: THREE.MeshToonMaterial[] = [];
  const meshes: THREE.Mesh[] = [];
  who.rig?.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshes.push(mesh);
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const toon = m as THREE.MeshToonMaterial;
      if (!toon.emissive || mats.includes(toon)) continue;
      toon.transparent = true;
      toon.depthWrite = true;
      mats.push(toon);
    }
  });
  const fx = SceneManager.getInstance().postFX;
  meshes.forEach((m) => fx.addBloom(m));
  SceneFX.onClear(() => meshes.forEach((m) => fx.removeBloom(m)));

  const chest = who.getPosition().clone().add(new THREE.Vector3(0, 1.1, 0));
  const light = new THREE.PointLight(0xfff0d8, 0, 9, 1.6);
  light.position.copy(chest);
  parent.add(light);
  disposeOnClear(light);
  const rising = motes(parent, { at: who.getPosition().clone(), radius: 0.55, rate: 0, rise: 1.3, life: 2.6 });

  const glow = new THREE.Color(1.4, 1.2, 0.85);
  return (seconds) => SceneFX.tween(seconds, (k) => {
    // Gathers over the first half, fades out of sight over the second; the light and the motes follow.
    const gather = THREE.MathUtils.smoothstep(k, 0, 0.55);
    const fade = THREE.MathUtils.smoothstep(k, 0.5, 1);
    for (const m of mats) {
      m.emissive.copy(glow).multiplyScalar(gather * 1.6);
      m.opacity = 1 - fade;
    }
    light.intensity = 14 * gather * (1 - fade * 0.8);
    rising.rate = 90 * gather * (1 - fade * 0.7);
    if (k >= 1) {
      who.group.visible = false;
      rising.rate = 0;
    }
  }, { ease: (t) => t });
}

/** Where the statue of Shiva stands, for `awaken`: its head (the halo goes behind it) and its feet. */
export interface StatueMarks {
  head: THREE.Vector3;
  feet: THREE.Vector3;
  /** The way it faces (level ground plane). */
  facing: THREE.Vector3;
}

/**
 * The statue wakes: its stone warms with an inner light, a light at its feet lifts it out of the dark, a halo kindles
 * behind its head and motes rise round its feet; it stays lit after. Set up now, all of it dark; the returned
 * function starts it, over `seconds`. `keyLight`: the light at its feet, `warmth`: how much the stone glows (a pale stone wants less than dark basalt).
 */
export function awaken(parent: THREE.Object3D, level: THREE.Object3D, statue: StatueMarks, materialPrefix = 'Monument_Basalt', keyLight = 45, warmth = 1): (seconds: number) => void {
  // The stone: every material of its family glows a little from within.
  const stone: { m: THREE.MeshToonMaterial; was: THREE.Color }[] = [];
  level.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const toon = m as THREE.MeshToonMaterial;
      if (toon.name?.startsWith(materialPrefix) && toon.emissive && !stone.some((s) => s.m === toon)) stone.push({ m: toon, was: toon.emissive.clone() });
    }
  });
  SceneFX.onClear(() => stone.forEach((s) => s.m.emissive.copy(s.was)));
  const warm = new THREE.Color(0.12, 0.1, 0.07).multiplyScalar(warmth);

  // Lit from in front and below, as if by the light at its feet.
  const face = statue.facing.clone().setY(0).normalize();
  const key = new THREE.PointLight(0xfff1d6, 0, 34, 1.2);
  key.position.copy(statue.feet).addScaledVector(face, 5).add(new THREE.Vector3(0, 4, 0));
  parent.add(key);
  disposeOnClear(key);

  // The halo (a prabhavali): a bright ring and a soft disc of light behind the head.
  const halo = new THREE.Group();
  halo.position.copy(statue.head).addScaledVector(face, -0.9);
  halo.lookAt(halo.position.clone().add(face));
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.25, 96), ringMat);
  const dotTex = softDot();
  const discMat = new THREE.MeshBasicMaterial({ map: dotTex, color: new THREE.Color(1.6, 1.3, 0.85), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 7.5), discMat);
  disc.position.z = -0.05;
  halo.add(disc, ring);
  parent.add(halo);
  bloom(halo);
  disposeOnClear(halo, [dotTex]);

  const feet = motes(parent, { at: statue.feet, radius: 3.4, rate: 0, rise: 1.6, life: 4.5 });

  return (seconds) => {
    SceneFX.tween(seconds, (k) => {
      const early = THREE.MathUtils.smoothstep(k, 0, 0.6);
      const late = THREE.MathUtils.smoothstep(k, 0.25, 1);
      for (const s of stone) s.m.emissive.copy(s.was).lerp(warm, early);
      key.intensity = keyLight * early;
      ringMat.opacity = late;
      discMat.opacity = 0.4 * late;
      halo.scale.setScalar(0.6 + 0.4 * late);
        feet.rate = 60 * early;
    });
    // The halo turns, slowly, from then on.
    SceneFX.every((dt) => {
      ring.rotation.z += dt * 0.15;
    });
  };
}

/**
 * The eclipse passes: the sky light and the ambient rise by `factor` and the key light warms toward `warm`, over
 * `seconds`. Put back as it was when the chapter is left.
 */
export function dawn(seconds: number, factor = 1.8, warm: THREE.ColorRepresentation = 0xffe2b8): void {
  const sm = SceneManager.getInstance();
  const was = {
    hemi: sm.hemiLight.intensity,
    ambient: sm.ambientLight.intensity,
    key: sm.dirLight.intensity,
    keyColor: sm.dirLight.color.clone(),
    fog: (sm.scene.fog as THREE.FogExp2 | null)?.color.clone() ?? null,
  };
  SceneFX.onClear(() => {
    sm.hemiLight.intensity = was.hemi;
    sm.ambientLight.intensity = was.ambient;
    sm.dirLight.intensity = was.key;
    sm.dirLight.color.copy(was.keyColor);
    if (was.fog && sm.scene.fog) (sm.scene.fog as THREE.FogExp2).color.copy(was.fog);
  });
  const target = new THREE.Color(warm);
  const fogTo = was.fog?.clone().lerp(new THREE.Color(0xc8b8a4), 0.5) ?? null;
  SceneFX.tween(seconds, (k) => {
    sm.hemiLight.intensity = was.hemi * (1 + (factor - 1) * k);
    sm.ambientLight.intensity = was.ambient * (1 + (factor - 1) * k);
    sm.dirLight.intensity = was.key * (1 + (factor - 1) * 0.5 * k);
    sm.dirLight.color.copy(was.keyColor).lerp(target, k);
    if (fogTo && was.fog && sm.scene.fog) (sm.scene.fog as THREE.FogExp2).color.copy(was.fog).lerp(fogTo, k);
  });
}

/**
 * The Devi's eyes kindle: two small points of light in the stone face, and a soft glow over them. Set up now, dark;
 * the returned function lights them over `seconds` (they stay lit).
 */
export function kindleEyes(parent: THREE.Object3D, eyes: [THREE.Vector3, THREE.Vector3], size = 0.5): (seconds: number) => void {
  const tex = softDot();
  const group = new THREE.Group();
  const mats: THREE.SpriteMaterial[] = [];
  // The points are drawn over the stone they sit in (a carved face has no clean surface to sit on).
  const add = (at: THREE.Vector3, scale: number, color: THREE.Color, onTop: boolean) => {
    const mat = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: !onTop, fog: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(at);
    sprite.scale.setScalar(scale);
    sprite.renderOrder = 4;
    group.add(sprite);
    mats.push(mat);
  };
  for (const e of eyes) add(e, size, new THREE.Color(4, 3, 1.6), true);
  add(eyes[0].clone().lerp(eyes[1], 0.5), size * 6, new THREE.Color(0.9, 0.6, 0.3), false);
  parent.add(group);
  bloom(group);
  disposeOnClear(group, [tex]);
  return (seconds) => SceneFX.tween(seconds, (k) => {
    for (const m of mats) m.opacity = k;
  });
}

/** The Devi's light on the hero (`kavachLight`). */
export interface KavachLight {
  /** Starts it: the light comes down over `seconds`; `swapAt` seconds in, a white flash and `swap` (the change). */
  start(seconds: number, swapAt: number, swap: () => void): void;
}

/** A column of light, brightest low and fading up into the dark, with slow streaks running up it. */
function lightShaft(radius: number, height: number, color: THREE.Color): { mesh: THREE.Mesh; uniforms: { opacity: { value: number }; time: { value: number } } } {
  const uniforms = { opacity: { value: 0 }, time: { value: 0 }, color: { value: color } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float opacity;
      uniform float time;
      uniform vec3 color;
      varying vec2 vUv;
      void main() {
        // (Clamped: a negative base would make pow NaN, and the bloom spreads a NaN over the whole picture.)
        float fall = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.6) * smoothstep(0.0, 0.06, vUv.y);
        float streak = 0.65 + 0.35 * sin(vUv.x * 62.83 + time * 0.7) * sin(vUv.x * 25.13 - vUv.y * 9.0 - time * 2.3);
        float a = opacity * fall * streak;
        gl_FragColor = vec4(color * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const geo = new THREE.CylinderGeometry(radius * 0.55, radius, height, 48, 1, true);
  geo.translate(0, height / 2, 0);
  return { mesh: new THREE.Mesh(geo, mat), uniforms };
}

/**
 * The Devi's gift (Chapter I; docs/STORY.md, "The divya kavach"): a shaft of light comes down on the kneeling boy, a
 * pool of it spreads round his knees, gold motes whirl up round him and his clothes glow hotter and hotter, embers
 * lifting off them; then a white flash, `swap` (the training clothes gone, the divya kavach on), a burst of marigold
 * sparks, and the glow in the new armour cools as the light lifts away. Set up now (dark).
 */
export function kavachLight(parent: THREE.Object3D, who: Character): KavachLight {
  const feet = who.getPosition().clone();
  const shaft = lightShaft(1.0, 24, new THREE.Color(1.9, 1.5, 0.85));
  const core = lightShaft(0.38, 24, new THREE.Color(2.4, 2.1, 1.6));
  const shafts = new THREE.Group();
  shafts.position.copy(feet).add(new THREE.Vector3(0, -0.05, 0));
  shafts.add(shaft.mesh, core.mesh);
  shafts.visible = false;
  parent.add(shafts);
  bloom(shafts);
  disposeOnClear(shafts);

  const poolTex = softDot();
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(1.6, 1.2, 0.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.copy(feet).add(new THREE.Vector3(0, 0.04, 0));
  pool.visible = false;
  parent.add(pool);
  bloom(pool);
  disposeOnClear(pool, [poolTex]);

  const light = new THREE.PointLight(0xffe2b0, 0, 12, 1.6);
  light.position.copy(feet).add(new THREE.Vector3(0, 1.6, 0.6));
  parent.add(light);
  disposeOnClear(light);

  const rising = motes(parent, { at: feet, radius: 1.1, rate: 0, rise: 1.6, life: 2.8, spin: 0.9 });
  const embers = motes(parent, { at: feet.clone().add(new THREE.Vector3(0, 0.3, 0)), radius: 0.45, rate: 0, rise: 1.2, life: 1.6, color: new THREE.Color(3.0, 1.1, 0.25), size: 0.07, spin: 2.2, spread: 0.35 });
  const petals = motes(parent, { at: feet.clone().add(new THREE.Vector3(0, 0.6, 0)), radius: 0.6, rate: 0, rise: 0.9, life: 3.4, color: new THREE.Color(2.2, 0.9, 0.12), size: 0.12, spin: 1.4, spread: 1.4 });

  // The hero's own glow: every material of the rig he has on now (it changes at the swap).
  const glow = new THREE.Color(1.5, 1.05, 0.5);
  const was = new Map<THREE.MeshToonMaterial, { color: THREE.Color; intensity: number }>();
  const shine = (amount: number) => {
    who.rig?.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const toon = m as THREE.MeshToonMaterial;
        if (!toon.emissive) continue;
        if (!was.has(toon)) was.set(toon, { color: toon.emissive.clone(), intensity: toon.emissiveIntensity });
        const base = was.get(toon)!;
        toon.emissive.copy(base.color).lerp(glow, Math.min(1, amount));
        toon.emissiveIntensity = Math.max(base.intensity, amount);
      }
    });
  };
  const fx = SceneManager.getInstance().postFX;
  const flash = (amount: number) => fx.concussion.set({ blur: 0, ghost: new THREE.Vector2(), chroma: 0, dark: 0, lid: 0, desat: 0, flash: amount });
  SceneFX.onClear(() => {
    flash(0);
    for (const [m, base] of was) {
      m.emissive.copy(base.color);
      m.emissiveIntensity = base.intensity;
    }
  });

  return {
    start(seconds, swapAt, swap) {
      let t = 0;
      let swapped = false;
      SceneFX.every((dt) => {
        t += dt;
        shaft.uniforms.time.value = t;
        core.uniforms.time.value = t;
        const before = THREE.MathUtils.smoothstep(t, 0, swapAt);
        const after = swapped ? THREE.MathUtils.smoothstep(t, swapAt + 0.6, seconds) : 0;
        // The light comes down and gathers, then lifts away once he is clothed in it.
        const on = THREE.MathUtils.smoothstep(t, 0, Math.min(1.6, swapAt * 0.5)) * (1 - after);
        shaft.uniforms.opacity.value = 0.3 * on;
        core.uniforms.opacity.value = 0.55 * on * (0.6 + 0.4 * before);
        poolMat.opacity = 0.9 * on;
        shafts.visible = pool.visible = on > 1e-3;
        light.intensity = 30 * on * (0.5 + 0.5 * before);
        rising.rate = 70 * on;
        if (!swapped) {
          // The clothes glow hotter and hotter, embers lifting off them, until the light whites out the picture.
          shine(1.6 * THREE.MathUtils.smoothstep(t, swapAt * 0.35, swapAt));
          embers.rate = 160 * THREE.MathUtils.smoothstep(t, swapAt * 0.45, swapAt);
          flash(0.95 * THREE.MathUtils.smoothstep(t, swapAt - 0.3, swapAt));
          if (t >= swapAt) {
            swapped = true;
            embers.rate = 0;
            swap();
          }
        } else {
          const since = t - swapAt;
          flash(Math.max(0, 0.95 - since * 1.3));
          // A burst of marigold sparks as the light breaks, then the armour's glow cools.
          petals.rate = since < 0.5 ? 260 : 0;
          shine(1.6 * Math.max(0, 1 - since / 1.8));
        }
        if (t >= seconds) {
          rising.rate = 0;
          petals.rate = 0;
          flash(0);
          shine(0);
          return false;
        }
        return true;
      });
    },
  };
}

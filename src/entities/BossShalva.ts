import * as THREE from 'three';
import { Boss } from './Boss';
import { Guard } from '../combat/Guard';
import { SceneManager } from '../core/SceneManager';
import type { FightTarget } from './Enemy';

/*
 * Shalva's dive (docs/STORY.md, "Shalva's dive"): the lord of maya goes under the rain-flooded stone in a burst of
 * water, a wake runs at the hero for about two seconds, the water boils where he will come up, and he bursts out of it
 * at the hero's side already swinging his gada overhead. He uses it when the hero keeps away from him (kiting, or out
 * of his leap's reach) or has just beaten him with a string of blows; never twice within ten seconds or so.
 */

/** Seconds to sink out of sight, under the water (the wake, then the boil), and to rise. */
const SINK = 0.6;
const UNDER = 2.0;
/** The last part of UNDER: the water boils on the spot where he will come up (it no longer follows the hero). */
const BOIL = 0.55;
const RISE = 0.32;
/** How far below the floor his model sinks (he is 2.6 m tall). */
const DEPTH = 3.1;
/** Seconds between dives (randomised in this range), and before the first one once the fight is on. */
const COOLDOWN: [number, number] = [10, 14];
const FIRST_DIVE = 7;
/** Kept further off than this for `KITE_SECONDS` (or past his leap), he dives at the hero. */
const KITE_RANGE = 6.5;
const KITE_SECONDS = 1.3;
/** Hit this many times (or for this much) within `COMBO_WINDOW` seconds, he goes under to get out of it. */
const COMBO_HITS = 3;
const COMBO_DAMAGE = 70;
const COMBO_WINDOW = 3;
/**
 * Where he comes up: this far from the hero (inside the overhead smash's reach, about 1.8 m), this many degrees round
 * from where he went under (to either side).
 */
const BURST_DISTANCE = 1.75;
const BURST_ANGLE: [number, number] = [85, 115];
/** Inside the arena's safe radius (Dwarka's is 10.8). */
const ARENA_RADIUS = 9.6;
/** The overhead smash out of the water comes down this long after he breaks the surface. */
const REACTION = 1.0;
/** The wake's rings: one this often, and the boil's. */
const WAKE_EVERY = 0.13;
const BOIL_EVERY = 0.11;

const UP = new THREE.Vector3(0, 1, 0);

type DivePhase = 'sink' | 'under' | 'rise';

interface Dive {
  phase: DivePhase;
  t: number;
  /** Where he went under (the hero's view of him then): he comes up round to one side of it. */
  from: THREE.Vector3;
  side: 1 | -1;
  /** Degrees round from the line hero -> where he went under (within BURST_ANGLE). */
  angle: number;
  /** Where he will come up (follows the hero until the boil). */
  burst: THREE.Vector3;
  ring: number;
  /** Seconds after breaking the surface that the smash starts; -1 once it has (or if it won't: the hero is down). */
  swingAt: number;
}

const ease = {
  in: (u: number) => u * u * u,
  out: (u: number) => 1 - (1 - u) * (1 - u),
};

/**
 * Chapter III boss, Shalva, the raider who brought war to Dwarka (characters/Shalva.ts): a spiked gada, an overhead
 * smash, a spinning double blow and a three-blow string, a leap at anyone who keeps their distance, and his dive
 * (above). When he falls, Takshaka comes for the city (the chapter's finale).
 */
export class BossShalva extends Boss {
  private dive: Dive | null = null;
  /** 0 standing on the floor, 1 out of sight below it; the model is sunk by this. */
  private depth = 0;
  private diveCooldown = FIRST_DIVE;
  private kiteTime = 0;
  /** Recent blows taken: [fight seconds, damage]. */
  private hits: [number, number][] = [];
  private clock = 0;
  private target: FightTarget | null = null;
  /** The dark water where he goes under, runs beneath the stone, and boils up. */
  private readonly pool = new DivePool();

  constructor(id = 'shalva') {
    super(id, 0x4a3530, {
      attackInterval: 1.25, // milestone 12: was 1.35
      strikeRange: 3.1, // 2.6 m tall with a 1.5 m gada
      tooClose: 1.6,
      leapRange: 6,
      leapMax: 12,
      roarRange: 18,
    });
    this.displayName = 'Shalva';
    this.epithet = 'Raider of Dwarka';
    // Milestone 12: health 380 -> 800 (the mace ended him in thirteen seconds), blows at 114 %. "Bosses fight back": his guard turns
    // blows aside and a posture that breaks now starts over (it never did: he was broken again by the next blow), so each blow that
    // lands is worth less and he is up more: health 800 -> 540 gives the same fight (a steady player wins four in five).
    this.maxHealth = 540;
    this.currentHealth = 540;
    this.damageScale = 1.14;
    this.maxMarma = 150;
    // The gada held across him; iron on steel rings low.
    this.guard = new Guard(this, {
      base: 0.45, perBlow: 0.3, max: 0.9, hold: 0.85, extend: 0.7, longest: 1.5, cooldown: 1.6, recovery: 0.35, window: 0.18,
      answerAfter: [2, 3], shove: 0.4, ring: 'iron',
    });
    this.moveSpeed = 4;
    this.marmaDecayRate = 9;
    this.turnRate = 4;
    this.lungeSpec = { a: 0.1, b: 0.55, maxDist: 1.5, stopDist: 2 };
    this.torsoMesh.scale.setScalar(1.15);
    // The spiked gada.
    this.swingSound = 'heavy';
    this.impactSound = 'crush';
    this.group.add(this.pool.mesh);
  }

  protected override onRoar(): void {
    this.soundFX.playRoar(0.9);
    this.particleFX.spawnDustPuff(this.getPosition(), 20);
  }

  public override takeDamage(amount: number): void {
    super.takeDamage(amount);
    this.hits.push([this.clock, amount]);
  }

  /** Going under he is committed: light blows chip him but do not stop him. */
  public override isArmored(): boolean {
    return this.dive?.phase === 'sink' || super.isArmored();
  }

  /** Whether he is in the middle of a dive (dev and tests). */
  public get diving(): DivePhase | null {
    return this.dive?.phase ?? null;
  }

  /** Dev: dive at the hero now, whatever the cooldown. */
  public debugDive(): boolean {
    if (!this.target || this.dive) return false;
    this.startDive(this.target);
    return true;
  }

  public override updateAI(dt: number, target: FightTarget): void {
    this.target = target;
    this.clock += dt;
    const state = this.stateMachine.currentState;
    if (state === 'DEAD') {
      this.surface();
      return;
    }
    if (this.dive) {
      this.updateDive(dt, target);
      return;
    }
    if (this.hasRoared) this.diveCooldown -= dt;
    const distance = this.getPosition().distanceTo(target.getPosition());
    this.kiteTime = distance > KITE_RANGE ? this.kiteTime + dt : Math.max(0, this.kiteTime - dt * 2);
    super.updateAI(dt, target);
  }

  /** Before his melee and his leap: the dive, when the hero keeps away or has just landed a string of blows on him. */
  protected override specialAction(_dt: number, distance: number): boolean {
    const target = this.target;
    if (!target || this.diveCooldown > 0 || target.isDown()) return false;
    this.hits = this.hits.filter(([t]) => this.clock - t <= COMBO_WINDOW);
    const taken = this.hits.reduce((sum, [, d]) => sum + d, 0);
    const beaten = this.hits.length >= COMBO_HITS || taken >= COMBO_DAMAGE;
    const kiting = this.kiteTime >= KITE_SECONDS || distance > this.tuning.leapMax;
    if (!beaten && !kiting) return false;
    // Only from the open floor, at a hero on it (the water is the arena's).
    const here = this.getPosition();
    const hero = target.getPosition();
    if (Math.hypot(here.x, here.z) > ARENA_RADIUS + 0.6 || Math.hypot(hero.x, hero.z) > ARENA_RADIUS + 0.6) return false;
    this.startDive(target);
    return true;
  }

  private startDive(target: FightTarget): void {
    const here = this.getPosition().clone();
    this.dive = {
      phase: 'sink', t: 0, from: here, side: Math.random() < 0.5 ? 1 : -1,
      angle: THREE.MathUtils.lerp(BURST_ANGLE[0], BURST_ANGLE[1], Math.random()),
      burst: here.clone(), ring: 0, swingAt: 0,
    };
    this.hits = [];
    this.kiteTime = 0;
    this.settle('IDLE');
    // (He turns to the hero as he sinks: updateDive.)
    // He goes under in a burst of water.
    this.particleFX.spawnDustPuff(here, 36);
    this.soundFX.playPlunge();
  }

  /** Where he will come up: round to one side of the hero from where he went under, inside the arena. */
  private burstPoint(dive: Dive, hero: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    const away = dive.from.clone().sub(hero).setY(0);
    if (away.lengthSq() < 0.01) away.set(1, 0, 0);
    away.normalize();
    const pick = (side: number) => {
      const deg = dive.angle * side;
      return out.copy(hero).addScaledVector(away.clone().applyAxisAngle(UP, THREE.MathUtils.degToRad(deg)), BURST_DISTANCE).setY(hero.y);
    };
    pick(dive.side);
    if (Math.hypot(out.x, out.z) > ARENA_RADIUS) {
      // Against the rim: the other side, else pulled in toward the middle.
      pick(-dive.side);
      const r = Math.hypot(out.x, out.z);
      if (r > ARENA_RADIUS) out.set((out.x * ARENA_RADIUS) / r, out.y, (out.z * ARENA_RADIUS) / r);
    }
    return out;
  }

  private updateDive(dt: number, target: FightTarget): void {
    const dive = this.dive!;
    const state = this.stateMachine.currentState;
    dive.t += dt;
    if (dive.phase === 'sink') {
      // A heavy blow, a deflection or a broken posture stops him going under: he comes back up where he is.
      if (state === 'STAGGER' || state === 'POSTURE_BROKEN' || state === 'DEFLECTED') {
        this.surface();
        this.diveCooldown = 4;
        return;
      }
      this.settle('IDLE');
      // Squaring up to the hero as he sinks, quicker than his usual heavy turn but still a turn, not a snap.
      const hero = target.getPosition();
      const here = this.getPosition();
      this.turnToward(Math.atan2(hero.x - here.x, hero.z - here.z), this.turnRate * 2, dt, { accel: this.turnAccel * 3 });
      this.depth = ease.in(Math.min(1, dive.t / SINK));
      if (dive.t >= 0.3 && dive.ring === 0) {
        dive.ring = 1;
        this.particleFX.spawnDustPuff(this.getPosition(), 24);
      }
      if (dive.t >= SINK) {
        dive.phase = 'under';
        dive.t = 0;
        dive.ring = 0;
        this.submerged = true;
        this.modelGroup.visible = false;
        this.soundFX.playWake(UNDER);
      }
      return;
    }

    if (dive.phase === 'under') {
      const hero = target.getPosition();
      const boiling = dive.t >= UNDER - BOIL;
      if (!boiling) this.burstPoint(dive, hero, dive.burst);
      // The wake runs to where he will come up, arriving as the boil begins.
      const pos = this.group.position;
      const to = dive.burst.clone().sub(pos).setY(0);
      const left = Math.max(0.05, UNDER - BOIL - dive.t);
      const step = Math.min(to.length(), Math.min(14, Math.max(5, to.length() / left)) * dt);
      if (to.lengthSq() > 1e-4) {
        // (He is out of sight, so this may snap: turned along the wake, so the dark shape under the water runs
        // lengthwise.)
        this.faceYaw(Math.atan2(to.x, to.z));
        pos.addScaledVector(to.normalize(), step);
      }
      dive.ring -= dt;
      if (dive.ring <= 0) {
        dive.ring = boiling ? BOIL_EVERY : WAKE_EVERY;
        // A small ring and spray along the wake; bigger as the water boils where he will come up.
        this.particleFX.spawnDustPuff(boiling ? dive.burst : pos, boiling ? 14 + 6 * Math.random() : 9);
      }
      if (boiling && dive.t - dt < UNDER - BOIL) this.soundFX.playTelegraphSound();
      if (dive.t >= UNDER || target.isDown()) this.burstOut(dive, target);
      return;
    }

    // Rising: out of the water, then the smash (unless the hero is down, or a blow has already rocked him).
    this.depth = 1 - ease.out(Math.min(1, dive.t / RISE));
    if (state === 'STAGGER' || state === 'POSTURE_BROKEN' || state === 'DEFLECTED') dive.swingAt = -1;
    // Rising with his gada going up, he keeps turning onto the hero until the smash comes down (no snap at the swing).
    if (dive.swingAt >= 0 && !target.isDown()) {
      const hero = target.getPosition();
      const here = this.getPosition();
      this.turnToward(Math.atan2(hero.x - here.x, hero.z - here.z), this.turnRate * 2, dt, { accel: this.turnAccel * 3 });
    }
    if (dive.swingAt >= 0 && dive.t >= dive.swingAt && !target.isDown()) {
      dive.swingAt = -1;
      this.stateMachine.changeState('ATTACK_1');
      this.planLunge(this.getPosition().distanceTo(target.getPosition()));
    }
    if (dive.t >= Math.max(RISE, dive.swingAt)) this.endDive();
    else if (state.startsWith('ATTACK')) this.applyLunge(dt);
  }

  /**
   * He breaks the surface beside the hero, facing him, and his gada goes up. Out of sight until now, he is put there
   * outright: a teleport, so the frame he appears in is not interpolated from where the wake was (JITTER.md, fix 6).
   */
  private burstOut(dive: Dive, target: FightTarget): void {
    const pos = this.group.position;
    pos.x = dive.burst.x;
    pos.z = dive.burst.z;
    dive.phase = 'rise';
    dive.t = 0;
    this.submerged = false;
    this.modelGroup.visible = true;
    this.faceTowards(target.getPosition());
    this.markTeleported();
    this.particleFX.spawnDustPuff(pos, 40);
    this.soundFX.playSplash(5);
    // The stone shudders as he erupts beside the hero (an undirected shake; the smash that follows lands on its own).
    SceneManager.getInstance().quake(pos);
    this.soundFX.playRoar(1.05);
    // Timed so the smash comes down (its last strike window: the first is the gada going up) REACTION after he is
    // seen, the gada raised the whole while.
    const strike = this.hitWindows('ATTACK_1').at(-1)?.t0 ?? 0.6;
    dive.swingAt = target.isDown() ? -1 : Math.max(0.15, REACTION - strike);
  }

  /** The dive is over: the smash plays out under his usual AI; the next dive is a while off. */
  private endDive(): void {
    this.dive = null;
    this.depth = 0;
    this.diveCooldown = THREE.MathUtils.lerp(COOLDOWN[0], COOLDOWN[1], Math.random());
  }

  /** Back on the floor at once, in sight and solid (a dive cut short, the fight over, a scene begun). */
  public surface(): void {
    if (!this.dive && this.depth === 0 && !this.submerged) return;
    this.dive = null;
    this.depth = 0;
    this.submerged = false;
    this.modelGroup.visible = true;
    this.modelGroup.position.y = 0;
    this.pool.hide();
  }

  public override update(dt: number): void {
    // Out of the fight (a cutscene, the chapter won or lost) nobody is left under the water.
    if (this.atEase && (this.dive || this.submerged)) this.surface();
    super.update(dt);
    this.modelGroup.position.y = -DEPTH * this.depth;
    this.updatePool(dt);
  }

  /**
   * The water's tells, from the dive: a dark pool opening as he goes under; a dark shape running under the stone with
   * the wake; the pool opening and churning where he will come up (the boil); and closing behind him as he rises.
   */
  private updatePool(dt: number): void {
    const d = this.dive;
    const pool = this.pool;
    if (!d) {
      pool.close(dt);
      return;
    }
    if (d.phase === 'sink') pool.set('pool', ease.out(Math.min(1, d.t / 0.25)), 1.5, 0.92, dt);
    else if (d.phase === 'rise') pool.set('pool', 1, 1.3, 0.92, dt);
    else if (d.t < UNDER - BOIL) pool.set('shadow', Math.min(1, d.t / 0.3), 1, 0.8, dt);
    else pool.set('pool', ease.out(Math.min(1, (d.t - (UNDER - BOIL)) / (BOIL * 0.7))), 1.3, 0.95, dt);
  }

  public override settleIntro(): void {
    super.settleIntro();
    this.surface();
  }
}

/**
 * Dark churning water on the stone at Shalva's feet (one small draw, only while he dives): a pool with a foam rim and a
 * slow swirl, or, while he runs under the floor, a soft dark shape stretched along his way.
 */
class DivePool {
  public readonly mesh: THREE.Mesh;
  private readonly uniforms = { uOpen: { value: 0 }, uAlpha: { value: 0 }, uShadow: { value: 0 }, uTime: { value: 0 } };
  private open = 0;

  constructor() {
    const geometry = new THREE.PlaneGeometry(2, 2);
    geometry.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      name: 'ShalvaDivePool',
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        varying vec2 vP;
        void main() {
          vP = uv * 2.0 - 1.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOpen;
        uniform float uAlpha;
        uniform float uShadow;
        uniform float uTime;
        varying vec2 vP;
        void main() {
          float r = length(vP);
          float edge = max(uOpen, 0.001);
          if (r > edge) discard;
          float a = atan(vP.y, vP.x);
          float u = r / edge;
          // Deep water, a slow swirl drawn into the middle, a hard foam rim (toon).
          float swirl = step(0.62, sin(a * 4.0 + u * 9.0 - uTime * 5.0) * 0.5 + 0.5) * (0.35 + 0.65 * u);
          vec3 deep = vec3(0.012, 0.022, 0.032);
          vec3 col = mix(deep, vec3(0.09, 0.12, 0.15), swirl * 0.6);
          float rim = step(0.9, u) * (1.0 - uShadow);
          col = mix(col, vec3(0.5, 0.56, 0.62), rim);
          float alpha = uAlpha * mix(1.0, 1.0 - smoothstep(0.55, 1.0, u), uShadow);
          gl_FragColor = vec4(col, alpha);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }));
    this.mesh.name = 'ShalvaDivePool';
    this.mesh.position.y = 0.03;
    this.mesh.renderOrder = 3;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    // Drawn once under the loading screen, so its shader is built before the first dive (Engine.warmUp).
    this.mesh.userData.warm = true;
  }

  /** `kind` at `open` (0..1 of its radius `radius` m), `alpha`: a pool, or the shape running under the stone. */
  public set(kind: 'pool' | 'shadow', open: number, radius: number, alpha: number, dt: number): void {
    const u = this.uniforms;
    u.uTime.value += dt;
    u.uShadow.value = kind === 'shadow' ? 1 : 0;
    u.uAlpha.value = alpha;
    this.open = open;
    u.uOpen.value = open;
    // The shape under the water is long and narrow along his way (his facing while he is under).
    if (kind === 'shadow') this.mesh.scale.set(0.75, 1, 1.7);
    else this.mesh.scale.set(radius, 1, radius);
    this.mesh.visible = open > 0.01;
  }

  /** Closing behind him once he is up. */
  public close(dt: number): void {
    if (!this.mesh.visible) return;
    this.open = Math.max(0, this.open - dt * 1.8);
    this.uniforms.uOpen.value = this.open;
    this.uniforms.uTime.value += dt;
    if (this.open <= 0.01) this.mesh.visible = false;
  }

  public hide(): void {
    this.open = 0;
    this.mesh.visible = false;
  }
}

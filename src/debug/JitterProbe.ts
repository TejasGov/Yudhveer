import * as THREE from 'three';
import type { Engine } from '../core/Engine';
import type { Character } from '../entities/Character';
import type { CharacterState } from '../entities/CharacterStateMachine';
import { Boss } from '../entities/Boss';

/*
 * The jitter probe (docs/proposals/JITTER.md, section 6): measures how much the fighters twitch, so every fix to the
 * locomotion, facing, separation and animation layers is checked by numbers, not by eye. Dev builds only, through
 * `__debug.jitter(...)` and the scripted scenarios of `__debug.jitterScenario(name)`.
 *
 * `step` mode drives the engine's own fixed step (`debugStep`), so a scenario is deterministic: Math.random is seeded
 * for its length, and the hero is held still or moved along a scripted path. `live` mode samples real rendered frames
 * instead (interpolation, bones and the camera included), for what only shows on screen.
 */

const LOCOMOTION: CharacterState[] = ['IDLE', 'WALK', 'MOVE', 'SPRINT', 'STRAFE_LEFT', 'STRAFE_RIGHT', 'WALK_BACK'];
const DEG = 180 / Math.PI;
/** A state run this short (fixed steps) that ends in another locomotion state is a twitch, not a decision. */
const SHORT_RUN = 5;

export type HeroMotion = 'still' | 'figure8' | 'circle' | 'input';

export interface ProbeOptions {
  seconds?: number;
  mode?: 'step' | 'live';
  /** Only these fighters (ids); every enemy otherwise. */
  ids?: string[];
  hero?: HeroMotion;
  /** Seeds Math.random for the run (step mode), so the AI's choices repeat; null leaves it alone. */
  seed?: number | null;
  /** Live mode: start the outros' slow motion (scale, seconds) as sampling begins (pose staleness). */
  slowMotion?: [number, number];
}

/** Per fighter, per second unless noted (JITTER.md's table). */
export interface Metrics {
  locoFlips: number;
  /** Total. */
  shortRuns: number;
  /** Total. */
  clipRestarts: number;
  velReversals: number;
  yawReversals: number;
  /** Degrees per second squared. */
  maxAngAccel: number;
  tsJumps: number;
  yReversals: number;
  /** Seconds in all. */
  pinned: number;
  /** Live mode: share of rendered frames where the root moved but the pose did not (0..1). */
  poseStale?: number;
}

export interface CameraMetrics {
  /** Largest translational offset the shake added (m), and its largest change between two frames (m). */
  maxShakeOffset: number;
  maxShakeStep: number;
  /** Largest rotational offset the shake added (degrees). */
  maxShakeAngle: number;
}

export interface ProbeReport {
  scenario?: string;
  mode: 'step' | 'live';
  seconds: number;
  fighters: Record<string, Metrics>;
  /** All the enemies together: rates summed, maxima kept, totals added (the row for a before/after table). */
  total: Metrics;
  camera?: CameraMetrics;
  verdict: 'pass' | 'fail';
  failures: string[];
}

interface Track {
  c: Character;
  boss: boolean;
  state: CharacterState;
  run: number;
  locoFlips: number;
  shortRuns: number;
  restarts0: number;
  pos: THREE.Vector3;
  vel: THREE.Vector2;
  velReversals: number;
  yaw: number;
  yawRate: number;
  /** Last yaw rate above the threshold (its sign decides a reversal). */
  yawSig: number;
  yawReversals: number;
  maxAngAccel: number;
  clip: string | undefined;
  ts: number;
  tsJumps: number;
  ySig: number;
  yReversals: number;
  pinned: number;
  frames: number;
  stale: number;
  pose: Float32Array | null;
  bones: THREE.Bone[];
  first: boolean;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wrap = (a: number) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

/** A few bones that always animate (hips, spine, an arm), read for pose staleness. */
function sampleBones(c: Character): THREE.Bone[] {
  const bones: THREE.Bone[] = [];
  c.rig?.root.traverse((o) => {
    if ((o as THREE.Bone).isBone && bones.length < 12) bones.push(o as THREE.Bone);
  });
  return bones;
}

/** The scripted scenarios: a chapter, how the hero moves, and for how long. */
const SCENARIOS: Record<string, { chapter: number; seconds: number; hero: HeroMotion; pack?: boolean; mode?: 'step' | 'live'; slowMotion?: [number, number]; note: string }> = {
  S1: { chapter: 5, seconds: 40, hero: 'still', pack: true, note: 'Summit pack (rakshasas) around a still hero' },
  S1p: { chapter: 0, seconds: 20, hero: 'still', pack: true, note: 'Prologue raiders around a still hero' },
  S2: { chapter: 5, seconds: 15, hero: 'figure8', pack: true, note: 'Summit pack, the hero walking a slow figure-8' },
  S3: { chapter: 4, seconds: 20, hero: 'circle', note: 'Shalva in Dwarka, the hero circle-strafing him' },
  S3b: { chapter: 1, seconds: 20, hero: 'circle', note: 'The Baoli guardian, the hero circle-strafing him' },
  S5: { chapter: 2, seconds: 20, hero: 'still', note: 'The akhada: the old vanara spars with a still hero' },
  S4: { chapter: 5, seconds: 3, hero: 'still', pack: true, mode: 'live', slowMotion: [0.3, 3], note: 'Slow motion over the summit pack (pose staleness, live frames)' },
};

export class JitterProbe {
  constructor(private readonly engine: Engine) {}

  public static scenarios(): Record<string, string> {
    return Object.fromEntries(Object.entries(SCENARIOS).map(([k, v]) => [k, v.note]));
  }

  /** Loads a scenario's chapter, sets the scene up the same way every time, and measures it. */
  public async scenario(name: string, overrides: ProbeOptions = {}): Promise<ProbeReport> {
    const s = SCENARIOS[name];
    if (!s) throw new Error(`No scenario ${name}: ${Object.keys(SCENARIOS).join(', ')}`);
    const engine = this.engine;
    await engine.startChapter(s.chapter, { intro: false });
    engine.debugStep(0); // stop the real-time loop: nothing moves between here and the run
    const hero = engine.player!;
    const enemies = engine.enemies.filter((e) => e.stateMachine.currentState !== 'DEAD');
    for (const e of enemies) {
      if (e instanceof Boss) e.settleIntro();
    }
    if (s.pack) {
      // The minions that came with the chapter, in a loose arc 3.5 m in front of the hero, routes dropped.
      const at = hero.getPosition();
      const yaw = hero.group.rotation.y;
      const pack = enemies.filter((e) => !e.isBoss);
      pack.forEach((e, i) => {
        const a = yaw + THREE.MathUtils.degToRad((i - (pack.length - 1) / 2) * 40);
        e.route = [];
        e.routeDelay = 0;
        e.group.visible = true;
        e.setPosition(at.x + Math.sin(a) * 3.5, at.y, at.z + Math.cos(a) * 3.5);
        e.faceTowards(at);
      });
    }
    const report = await this.run({ seconds: s.seconds, hero: s.hero, mode: s.mode ?? 'step', slowMotion: s.slowMotion, ...overrides });
    report.scenario = name;
    return report;
  }

  public async run(options: ProbeOptions = {}): Promise<ProbeReport> {
    const { seconds = 20, mode = 'step', hero: motion = 'still', seed = 7, ids, slowMotion } = options;
    const engine = this.engine;
    const hero = engine.player;
    if (!hero) throw new Error('No hero yet');
    const fighters = engine.enemies.filter((e) => (ids ? ids.includes(e.id) : true));
    const tracks = fighters.map((c) => this.track(c));
    const mortal = hero.mortal;
    hero.mortal = false;
    const origin = hero.getPosition().clone();
    const camera = { maxShakeOffset: 0, maxShakeStep: 0, maxShakeAngle: 0 };
    const lastShake = new THREE.Vector3();
    let t = 0;
    const moveHero = (dt: number) => {
      // Held up and unbroken for the length of the run: what is measured is the enemies, not a fight's outcome.
      hero.currentHealth = hero.maxHealth;
      hero.currentMarma = 0;
      if (motion === 'figure8') {
        const th = t * 0.45;
        const p = new THREE.Vector3(origin.x + Math.sin(th) * 2.6, hero.getPosition().y, origin.z + Math.sin(th) * Math.cos(th) * 2.6);
        const d = p.clone().sub(hero.getPosition());
        if (d.lengthSq() > 1e-8) hero.group.rotation.y = Math.atan2(d.x, d.z);
        hero.group.position.copy(p);
      } else if (motion === 'circle') {
        const foe = engine.enemies.find((e) => e.stateMachine.currentState !== 'DEAD' && !e.submerged);
        if (foe) {
          const c = foe.getPosition();
          const th = t * 0.65;
          hero.group.position.set(c.x + Math.sin(th) * 3.2, hero.getPosition().y, c.z + Math.cos(th) * 3.2);
          hero.group.rotation.y = Math.atan2(c.x - hero.group.position.x, c.z - hero.group.position.z);
        }
      }
      t += dt;
    };
    const sampleCamera = () => {
      const sm = engine.sceneManager as unknown as {
        shakeOffset?: THREE.Vector3;
        impact?: { offset: { angle: number; push: number } };
      };
      const offset = sm.impact ? new THREE.Vector3(0, 0, sm.impact.offset.push) : sm.shakeOffset ?? new THREE.Vector3();
      camera.maxShakeOffset = Math.max(camera.maxShakeOffset, offset.length());
      camera.maxShakeStep = Math.max(camera.maxShakeStep, offset.distanceTo(lastShake));
      camera.maxShakeAngle = Math.max(camera.maxShakeAngle, sm.impact?.offset.angle ?? 0);
      lastShake.copy(offset);
    };

    const random = Math.random;
    if (mode === 'step' && seed !== null) Math.random = mulberry32(seed);
    try {
      if (mode === 'step') {
        const dt = 1 / 60;
        const steps = Math.round(seconds / dt);
        for (let i = 0; i < steps; i++) {
          moveHero(dt);
          engine.debugStep(1);
          for (const tr of tracks) this.sample(tr, dt, false);
          sampleCamera();
        }
      } else {
        engine.debugResume();
        if (slowMotion) engine.debugSlowMotion(slowMotion[0], slowMotion[1]);
        await new Promise<void>((resolve) => {
          let elapsed = 0;
          engine.debugFrame = (dt) => {
            // A dev tool's window flickering out of view pauses the fight (Engine's visibility handler): carry on.
            if ((engine as unknown as { paused: boolean }).paused) {
              engine.debugResume();
              return;
            }
            if (dt <= 0) return;
            moveHero(dt);
            for (const tr of tracks) this.sample(tr, dt, true);
            sampleCamera();
            elapsed += dt;
            if (elapsed >= seconds) {
              engine.debugFrame = null;
              resolve();
            }
          };
        });
      }
    } finally {
      Math.random = random;
      hero.mortal = mortal;
    }

    const report: ProbeReport = { mode, seconds, fighters: {}, total: this.empty(), verdict: 'pass', failures: [] };
    for (const tr of tracks) {
      const m = this.finish(tr, seconds, mode === 'live');
      report.fighters[tr.c.id] = m;
      this.add(report.total, m);
      this.judge(tr, m, motion === 'still', seconds, report.failures);
    }
    if (mode === 'live') {
      report.camera = camera;
      if (camera.maxShakeStep > 0.01) report.failures.push(`camera: shake moved ${(camera.maxShakeStep * 100).toFixed(1)} cm in one frame`);
    }
    report.verdict = report.failures.length ? 'fail' : 'pass';
    return report;
  }

  private track(c: Character): Track {
    return {
      c, boss: c instanceof Boss, state: c.stateMachine.currentState, run: 0, locoFlips: 0, shortRuns: 0,
      restarts0: c.rig?.restarts ?? 0, pos: c.getPosition().clone(), vel: new THREE.Vector2(), velReversals: 0,
      yaw: c.group.rotation.y, yawRate: 0, yawSig: 0, yawReversals: 0, maxAngAccel: 0, clip: c.rig?.clip,
      ts: c.rig?.timeScale ?? 1, tsJumps: 0, ySig: 0, yReversals: 0, pinned: 0, frames: 0, stale: 0, pose: null,
      bones: sampleBones(c), first: true,
    };
  }

  private sample(tr: Track, dt: number, live: boolean): void {
    const c = tr.c;
    const state = c.stateMachine.currentState;
    // State runs: a flip between two locomotion states, and a run too short to have been a decision.
    if (state !== tr.state) {
      const loco = LOCOMOTION.includes(state) && LOCOMOTION.includes(tr.state);
      if (loco) {
        tr.locoFlips++;
        if (tr.run <= SHORT_RUN && !live) tr.shortRuns++;
      }
      tr.state = state;
      tr.run = 0;
    }
    tr.run++;
    const pos = c.getPosition();
    const vx = (pos.x - tr.pos.x) / dt;
    const vz = (pos.z - tr.pos.z) / dt;
    const dy = pos.y - tr.pos.y;
    const yawRate = wrap(c.group.rotation.y - tr.yaw) / dt;
    const moved = Math.hypot(pos.x - tr.pos.x, pos.z - tr.pos.z);
    if (!tr.first && c.group.visible && state !== 'DEAD') {
      const v = new THREE.Vector2(vx, vz);
      if (v.length() > 0.1 && tr.vel.length() > 0.1 && v.dot(tr.vel) < 0) tr.velReversals++;
      if (v.length() > 0.1) tr.vel.copy(v);
      if (Math.abs(dy) > 0.0005) {
        const s = Math.sign(dy);
        if (tr.ySig !== 0 && s !== tr.ySig) tr.yReversals++;
        tr.ySig = s;
      }
      if (Math.abs(yawRate) > THREE.MathUtils.degToRad(10)) {
        const s = Math.sign(yawRate);
        if (tr.yawSig !== 0 && s !== tr.yawSig) tr.yawReversals++;
        tr.yawSig = s;
      }
      // Live frames with no simulation step in them (slow motion) say nothing about acceleration.
      if (!live || moved > 0 || yawRate !== 0) tr.maxAngAccel = Math.max(tr.maxAngAccel, (Math.abs(yawRate - tr.yawRate) / dt) * DEG);
      const rig = c.rig;
      if (rig) {
        if (rig.clip === tr.clip && Math.abs(rig.timeScale - tr.ts) > 0.05) tr.tsJumps++;
        tr.clip = rig.clip;
        tr.ts = rig.timeScale;
      }
      // Pinned: standing exactly a body's width from a neighbour (held there by the separation push).
      const others: Character[] = [...this.engine.enemies, ...(this.engine.player ? [this.engine.player] : [])];
      for (const o of others) {
        if (o === c || !o.motor || !c.motor || o.stateMachine.currentState === 'DEAD') continue;
        const d = Math.hypot(o.getPosition().x - pos.x, o.getPosition().z - pos.z);
        if (Math.abs(d - (o.motor.radius + c.motor.radius)) <= 0.01) {
          tr.pinned += dt;
          break;
        }
      }
      if (live && tr.bones.length) {
        tr.frames++;
        const pose = new Float32Array(tr.bones.length * 4);
        tr.bones.forEach((b, i) => b.quaternion.toArray(pose, i * 4));
        if (moved > 0.001 && tr.pose && pose.every((x, i) => x === tr.pose![i])) tr.stale++;
        tr.pose = pose;
      }
    }
    if (moved > 0 || !live) tr.yawRate = yawRate;
    tr.first = false;
    tr.pos.copy(pos);
    tr.yaw = c.group.rotation.y;
  }

  private empty(): Metrics {
    return { locoFlips: 0, shortRuns: 0, clipRestarts: 0, velReversals: 0, yawReversals: 0, maxAngAccel: 0, tsJumps: 0, yReversals: 0, pinned: 0 };
  }

  private finish(tr: Track, seconds: number, live: boolean): Metrics {
    const r = (n: number) => +(n / seconds).toFixed(2);
    const m: Metrics = {
      locoFlips: r(tr.locoFlips), shortRuns: tr.shortRuns, clipRestarts: (tr.c.rig?.restarts ?? 0) - tr.restarts0,
      velReversals: r(tr.velReversals), yawReversals: r(tr.yawReversals), maxAngAccel: Math.round(tr.maxAngAccel),
      tsJumps: r(tr.tsJumps), yReversals: r(tr.yReversals), pinned: +tr.pinned.toFixed(2),
    };
    if (live) m.poseStale = tr.frames ? +(tr.stale / tr.frames).toFixed(3) : 0;
    return m;
  }

  private add(total: Metrics, m: Metrics): void {
    total.locoFlips = +(total.locoFlips + m.locoFlips).toFixed(2);
    total.shortRuns += m.shortRuns;
    total.clipRestarts += m.clipRestarts;
    total.velReversals = +(total.velReversals + m.velReversals).toFixed(2);
    total.yawReversals = +(total.yawReversals + m.yawReversals).toFixed(2);
    total.maxAngAccel = Math.max(total.maxAngAccel, m.maxAngAccel);
    total.tsJumps = +(total.tsJumps + m.tsJumps).toFixed(2);
    total.yReversals = +(total.yReversals + m.yReversals).toFixed(2);
    total.pinned = +(total.pinned + m.pinned).toFixed(2);
    if (m.poseStale !== undefined) total.poseStale = Math.max(total.poseStale ?? 0, m.poseStale);
  }

  /** JITTER.md's pass thresholds. */
  private judge(tr: Track, m: Metrics, still: boolean, seconds: number, failures: string[]): void {
    const id = tr.c.id;
    if (m.locoFlips > 0.5) failures.push(`${id}: locoFlips ${m.locoFlips}/s`);
    if (m.shortRuns > 0) failures.push(`${id}: shortRuns ${m.shortRuns}`);
    if (m.clipRestarts > 0) failures.push(`${id}: clipRestarts ${m.clipRestarts}`);
    if (still && m.velReversals > 0.5) failures.push(`${id}: velReversals ${m.velReversals}/s`);
    if (still && m.yawReversals > 0.5) failures.push(`${id}: yawReversals ${m.yawReversals}/s`);
    if (m.maxAngAccel > (tr.boss ? 1500 : 3000)) failures.push(`${id}: maxAngAccel ${m.maxAngAccel} deg/s^2`);
    if (m.tsJumps > 1) failures.push(`${id}: tsJumps ${m.tsJumps}/s`);
    if (m.pinned > seconds / 20) failures.push(`${id}: pinned ${m.pinned} s`);
    if (m.poseStale !== undefined && m.poseStale > 0) failures.push(`${id}: poseStale ${(m.poseStale * 100).toFixed(0)} %`);
  }
}

# Proposal: subtle camera impact for heavy blows and deflects

Status: proposal, research only. No game code was changed to write this.
Goal (from the brief): "not too much, subtle but a feel". Heavy blows and deflects should land in the camera and the
hands. Light hits barely register. The fight must stay readable.

## TL;DR

Replace today's random per-frame position jitter with an **`ImpactCamera`** that adds a small offset **after** the
follow camera has solved. The offset has three layers, all running in real time so they still play during hit-stop:

1. **Kick.** A directional rotational impulse (0.2–1.2°) along the blow, returned by a slightly underdamped spring in
   about 250 ms. This is where most of the "feel" comes from.
2. **Trauma shake.** Smooth noise (not `Math.random`), rotation only, amplitude = trauma². It is effectively zero for
   light hits, about 0.3–0.8° for heavy ones and about 1.2° for a boss kill.
3. **FOV punch.** −1 to −3° for 120–300 ms on deflects, posture breaks and kills.

Alongside the camera:

- **Hit-stop becomes a real freeze** (30–140 ms by event) with a hard resume instead of today's slow ramp.
- **Dual-rumble mapping** for gamepads.
- **The "Camera shake" toggle becomes a 0–100 % slider.** The default follows `prefers-reduced-motion`.

Everything is one table of numbers per event (§4).

---

## 1. What we have today

| Piece | Where | Notes |
|---|---|---|
| Screen shake | `core/SceneManager.ts:243-262`, applied at `:198` | `Math.random()` offsets of ±intensity/2 m per axis on every gsap tick. Intensity is 0.15–0.42, so up to **±21 cm** of white noise. It is translational only, has no direction, and is all-or-nothing on `Settings.cameraShake`. White noise reads as glitching, not weight (see JITTER.md §3.7). |
| Shake calls | `combat/CombatSystem.ts:218` (player hit: 0.2 / 0.4 heavy), `:278` (hero hit: 0.35), `:292` (deflect: 0.42), `:313` (block: 0.15); `entities/BossAndhaka.ts:252`, `entities/BossTakshaka.ts:66` (0.35, 0.4 s) | A deflect currently shakes *harder* than a heavy hit. A deflect should feel crisp, not shaky. |
| Hit-stop | `CombatSystem.ts:318-328` | Holds `globalTimeScale` at 0.05–0.35 for half the duration, then a `power3.out` ramp. Hits use 0.06/0.1–0.15 s. Deflects use 0.05/0.14. Evasion uses 0.35/0.2. Glancing blows use 0.3/0.06. The ramp causes low-rate pose stepping (JITTER.md §3.4). |
| Slow motion | `core/Engine.ts:1280-1284` | Outro, defeat and loss: 0.3–0.4× for 1.2–1.6 s. Keep it for kills. |
| Cutscene jolt | `cinematics/CinematicDirector.ts:20-25, 203-211` | Random position plus random roll, linear decay. Used by `Concussion.hit` (`cinematics/Concussion.ts:132`) and Prologue cues. |
| Concussion post effect | `core/postfx/ConcussionEffect.ts`, `cinematics/Concussion.ts` | Flash, double vision, desaturation, muffle. Cutscene vocabulary only. Too strong for gameplay hits, but a 5 % `spike` could serve the boss kill. |
| Gamepad | `core/InputManager.ts:222-253` | Polls the first pad. **No rumble anywhere.** |
| Settings | `core/Settings.ts:11`, `index.html:125` | `cameraShake: boolean`. |

Event information is already available at the call sites: `CombatSystem` knows attacker, victim, hit point, the
`heavy` / `charged` / `crush` flags, deflect, block, posture break and glancing blows.

## 2. What good practice says

- **Trauma, not shake** (Eiserloh, GDC 2016):
  - Events add *trauma* in 0..1, and trauma decays linearly.
  - Shake = trauma² (or ³), so small events are nearly invisible and big ones jump out.
  - Drive the offsets with **smooth noise** (Perlin or simplex) sampled over time, not random per frame. Random per
    frame is buzzy and frame-rate dependent.
  - In 3D, **rotational** shake (yaw, pitch, roll) reads far better than translation. Translation causes parallax
    swimming and clips the camera into walls.
- **Directional kick plus spring return.** Juice talks and engine tools (Vlambeer's "Art of Screenshake",
  Cinemachine Impulse) push the camera along the impact direction and let it settle. It reads as *force*, where
  noise only reads as *noise*. A slightly underdamped spring (ζ ≈ 0.5–0.7) gives one small rebound, which feels
  physical.
- **Hit-stop does most of the work.** Freeze attacker and victim for a few frames. Fighting games scale it from light
  to heavy (for example 8/12/16 frames). Action games use about 50–100 ms on heavy hits. God of War (2018) spent
  months tuning hit-stop. It deliberately uses *less* camera shake than other action games so the fight stays
  legible, and leans on sound, hit-stop and big reaction poses. That is the model for "subtle but felt".
- **Deflect feel (Sekiro).** The parry is sold by a bright spark, a distinct high-pitched clang, a short freeze and a
  crisp camera pop. It does not use a long shake. Missed deflects become guards with a duller sound. Our
  deflect/block split matches this.
- **FOV punch.** A brief narrowing of FOV (zoom in) on a big moment adds focus without moving the frame much.
- **Rumble.** Heavy events use the strong (low-frequency) motor and crisp events (deflect, block) the weak
  (high-frequency) one, with short durations. On the web this is
  `gamepad.vibrationActuator.playEffect('dual-rumble', { duration, strongMagnitude, weakMagnitude })`. It is not
  supported in every browser, so feature-detect it.
- **Accessibility** (Game Accessibility Guidelines): "Provide an option to turn off / hide background movement" and
  "Include toggle/slider for any haptics". Use a slider rather than an on/off switch, as several shipped games do
  (Cult of the Lamb, WoW's Full/Reduced/Off).

I did not find primary-source tuning numbers for Hades or Ghost of Tsushima. They are references for *watching*, not
for numbers.

## 3. Design: `ImpactCamera`

`src/core/ImpactCamera.ts`, owned by `SceneManager`.

```ts
export type ImpactKind =
  | 'hitLight' | 'hitHeavy' | 'hitSlam'      // the hero's blows landing (slam: charged / gada / leaping strike)
  | 'hurt' | 'hurtHeavy'                     // the hero being hit (heavy: boss finisher, guard broken)
  | 'block' | 'deflect' | 'postureBreak'
  | 'bossKill' | 'quake';                    // quake: footfalls, roars, scripted cues

export interface ImpactOptions {
  /** World direction the force travels (attacker → victim). Optional: undirected events just shake. */
  dir?: THREE.Vector3;
  /** 0..n multiplier (e.g. damage-scaled). */
  scale?: number;
}

export class ImpactCamera {
  impact(kind: ImpactKind, opts?: ImpactOptions): void;   // called from combat at the moment of contact
  addTrauma(amount: number): void;                       // raw access (bosses' footfalls, cutscene cues)
  update(realDt: number): void;                          // once per rendered frame, wall-clock dt
  apply(camera: THREE.PerspectiveCamera, armLength?: number): void; // AFTER the follow / director solve
  reset(): void;                                         // chapter load, pause, title
}
```

### 3.1 State and per-frame maths

Everything is in camera-local angles (radians) plus a tiny local translation:

- `trauma` in 0..1, decaying at `TRAUMA_DECAY` = 1.6/s (linear).
- `kick` holds `{ yaw, pitch, roll }` as angle and velocity, plus `push` (metres along the view axis). Each component
  is a damped spring toward 0 with ω = 32 rad/s and ζ = 0.6. The spring is integrated exactly or semi-implicitly
  with substeps of at most 1/240 s, so it is frame-rate independent.
- `fovPunch` is a spring toward 0 with ω = 22 rad/s and ζ = 0.8 (no visible rebound).

```ts
update(dt) {
  this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY * dt);
  this.t += dt;
  springStep(this.kick, dt, 32, 0.6);  springStep(this.fov, dt, 22, 0.8);
}
apply(cam, arm = 3.4) {
  const s = Settings.get().cameraShake;              // 0..1 slider
  const sh = this.trauma * this.trauma * s;           // trauma²
  // smooth noise: 1D simplex/perlin, or a sum of 3 incommensurate sines per axis (no deps)
  const yaw   = (MAX_YAW   * sh * noise(this.t * FREQ, 0) + this.kick.yaw.x)   * s;
  const pitch = (MAX_PITCH * sh * noise(this.t * FREQ, 1) + this.kick.pitch.x) * s;
  const roll  = (MAX_ROLL  * sh * noise(this.t * FREQ * 0.8, 2) + this.kick.roll.x) * s;
  _q.setFromEuler(_e.set(pitch, yaw, roll, 'YXZ'));
  cam.quaternion.multiply(_q);                        // local: rotate about the camera's own axes
  // tiny push along the view, never into walls: scaled by how much arm there is
  const room = THREE.MathUtils.clamp((arm - 0.8) / 2.6, 0, 1);
  cam.translateZ(-this.kick.push.x * room * s);
  const fov = this.fov.x * s;
  if (Math.abs(fov) > 1e-3) { cam.fov = baseFov + fov; cam.updateProjectionMatrix(); }
}
```

Note the double use of `s` on the shake term: the slider then scales shake quadratically and kick linearly, which
keeps low slider values very calm. Constants: `MAX_YAW` = 2.5°, `MAX_PITCH` = 2.0°, `MAX_ROLL` = 3.0° at trauma 1,
and `FREQ` = 11 Hz. Use 8–12 Hz: lower reads as heavy, while 20 Hz and above reads as buzz.

**Direction.** For `opts.dir`, transform it into camera space (`d = dir.applyQuaternion(cam.quaternion⁻¹)`). Then
add an impulse to the kick velocities:

- `yaw.v += -d.x · K`. The view swings *with* the force: a blow coming from screen-left pushes the view right.
- `pitch.v += -d.y · K` plus a small downward component on slams.
- `roll.v += -d.x · K · 0.5`.

For blows the hero lands, `dir` is from the hero to the victim, so the camera leans slightly *into* the blow. For blows
he takes, `dir` is from the attacker to the hero, so the camera is knocked back. Impulse velocities are chosen so the
spring's first peak equals the table's kick angle. For ζ = 0.6 and ω = 32 the peak is
`v/ω_d · e^(−ζωt) · sin(ω_d t) ≈ 0.0156 × v` at t ≈ 36 ms, so v ≈ angle / 0.0156. It has settled below 1 % by about
250 ms.

**Stacking.** Trauma adds and is clamped to 1. Kick impulses add, but the total kick is clamped to ±1.5°. A combo of
light hits can never build a big shake, because each adds at most 0.12 trauma and 0.12² is about 0.

### 3.2 Layering with the follow camera (no fighting)

The order inside `Engine.updateCamera` (`core/Engine.ts:1605-1647`) is:

1. `sm.updateCamera(...)` solves pivot, yaw/pitch, spring arm and `lookAt` exactly as now. Remove `shakeOffset`
   from it (`SceneManager.ts:41, 198, 204`).
2. The handoff blend, if in handoff.
3. `impactCamera.update(rawDt)` and then `impactCamera.apply(cam, sm.armLength)`. `armLength` is private today
   (`SceneManager.ts:37`); expose a getter.

The offset is **never written back** into `cameraYaw`, `cameraPitch`, `cameraPivot` or `viewYaw`. Movement direction
(`viewYaw`, `SceneManager.ts:204-205`) and the spring arm are computed before it, so WASD direction is unaffected and
the arm never accumulates shake. Because the offset is rotational with only a few cm of push scaled by available
arm, it cannot push the camera through a wall the arm ray already avoided.

The offset is applied every rendered frame from real time (`rawDt`), so the kick and shake play **during** hit-stop,
when simulated time is frozen. That is what makes the freeze read as impact rather than lag.

### 3.3 Cutscenes

- `CinematicDirector.apply` calls `impactCamera.apply(camera)` after its `lookAt` and roll. `joltCamera(amount, s)`
  becomes a thin wrapper: `addTrauma(amount / 0.16 × 0.5)`, plus an undirected kick for amounts of 0.1 or more.
  Existing cues (Concussion, Prologue footfalls) keep working with smooth noise instead of random.
- Gameplay impacts do not fire in cutscenes (combat does not run in `intro`). `reset()` on cut-in and cut-out, so
  nothing carries across a shot cut.
- Scripted moments may pass `scale` above 1. They are still multiplied by the player's slider.

### 3.4 Hit-stop (changed alongside)

Replace `triggerHitStop(scale, duration)` with `freeze(ms)`. It sets `globalTimeScale = 0` for `ms` of wall-clock
time and then **snaps back to 1**, with no ramp. This is the fighting-game model, and it removes the low-rate pose
stepping described in JITTER.md §3.4.

- Freezes are combined with max, not added. A new freeze while frozen extends to `max(remaining, new)`.
- Cap total freeze at 180 ms in any 0.5 s window, so multi-hit sweeps on a crowd do not stall the game.
- Long-term option: freeze only attacker and victim (per-character time scale), as God of War does. Global is fine
  for our 1–3 fighter scenes.

### 3.5 Gamepad rumble

In `InputManager`, add `rumble(strong, weak, ms)`. It does nothing unless `device === 'gamepad'` and
`pad.vibrationActuator?.playEffect` exists. It multiplies by a new `Settings.vibration` (0..1, default 1). Newer
effects preempt older ones; drop a request whose total magnitude is lower than the one playing.

## 4. Per-event tuning table (starting values)

Angles are in degrees at slider 100 %. Kick is the first peak of the spring. Trauma gives shake = trauma² × max
(2.5° yaw, 2.0° pitch, 3.0° roll), so 0.35 trauma ≈ 0.3° yaw.

| Event | Trigger (current code) | Hit-stop | Trauma | Kick (dir) | Push | FOV punch | Rumble strong/weak, ms |
|---|---|---|---|---|---|---|---|
| Light hit dealt | `resolvePlayerHitOnEnemy`, not heavy | 40 ms | 0.10 | 0.25° along swing | 0 | 0 | 0 / 0.15, 50 |
| Heavy hit dealt (finisher, `blow.heavy`) | same, heavy | 75 ms | 0.30 | 0.55° along blow, +0.15° pitch down | 2 cm | −0.8°, 150 ms | 0.35 / 0.3, 110 |
| Charged / gada slam / leaping strike | `charged \|\| crush \|\| ATTACK_JUMP` | 110 ms | 0.45 | 0.9° pitch down + 0.4° along | 4 cm | −1.5°, 200 ms | 0.7 / 0.4, 170 |
| Glancing blow (armoured) | `glancing` | 30 ms | 0.05 | 0.15° | 0 | 0 | 0 / 0.2, 40 |
| Hero hit (minion) | `resolveEnemyHitOnPlayer` | 60 ms | 0.25 | 0.6° away from attacker, slight roll | −2 cm | 0 | 0.4 / 0.3, 120 |
| Hero hit hard (boss finisher, `damage ≥ 24`) | same, boss | 90 ms | 0.45 | 1.0° away | −3 cm | +1° (widens), 200 ms | 0.75 / 0.4, 200 |
| Block (guard takes it) | `handleBlockedHit` | 30 ms | 0.08 | 0.35° away | −1 cm | 0 | 0.1 / 0.35, 60 |
| **Deflect** (perfect parry) | `handlePerfectParry` | 90 ms | 0.12 | 0.5° *toward* attacker (snap) | 2 cm | **−1.5°, 120 ms** | 0.15 / 0.7, 60 (crisp tick) |
| Posture break (enemy) | `broken` | 140 ms | 0.35 | 0.7° along last blow | 3 cm | −2°, 260 ms | 0.5 / 0.5, 180 |
| Guard / posture broken (hero) | `Guard broken` / `Posture broken` | 100 ms | 0.4 | 0.9° away | −3 cm | +1.5°, 250 ms | 0.7 / 0.3, 220 |
| Boss kill | last blow on a boss, then existing `slowMotion(0.3, 1.6)` | 200 ms, then slow-mo | 0.65 | 1.2° along blow | 4 cm | −3°, held through slow-mo, release 0.5 s | 1.0 / 0.6, 350 decaying |
| Quake (boss footfall, roar, Takshaka/Andhaka shakes) | `BossAndhaka.ts:252`, `BossTakshaka.ts:66` | none | 0.3–0.45 by distance | none (undirected) | 0 | 0 | 0.4 / 0, 250 |
| Evasion (slide under a blow) | `resolveEvasion` | keep as slow-mo beat (0.35× for 0.2 s); no camera | 0 | 0 | 0 | −1°, 200 ms | 0 / 0.1, 40 |

Design notes on the numbers:

- **Light hits get almost no shake** (0.10² = 1 % of max, about 0.03°). Their feel is the 40 ms freeze, a 0.25° kick
  and the sound. This keeps a 3-hit combo clean.
- **Deflect is a snap, not a shake.** The camera dips *toward* the attacker (the hero meets the blow), FOV tightens
  1.5° for 120 ms, and the weak motor ticks, with a 90 ms freeze under it. It should feel "clean and bright", like
  Sekiro's clang. Today it is the shakiest event (0.42), which is backwards.
- **Being hit pushes the camera away and widens FOV slightly.** Off-balance is the opposite of the attack-side zoom.
- **Bosses' heavy hits on the hero** scale by the damage ratio (`scale = damage / 18`), capped at 1.4.
- Everything stays under about 1.5° of rotation and 4 cm of translation at 100 %. That is subtle at our 65° FOV and
  3.4 m arm.

## 5. Accessibility and settings

- Replace `cameraShake: boolean` with `cameraShake: number` (0..1, step 0.1). In `Settings.load()` migrate `true` → 1
  and `false` → 0.
- The default is 1, or 0.5 when `matchMedia('(prefers-reduced-motion: reduce)').matches`.
- In the UI (`index.html:125`), make it a slider like the volume ones (`data-min=0 data-max=1 data-step=0.1`),
  labelled "Camera shake". It scales trauma shake quadratically and kick and FOV punch linearly (§3.1).
- Hit-stop is **not** scaled by this slider. It is gameplay timing and affects parry rhythm.
- Add a **Vibration** slider (0–100 %), shown only once a gamepad has been seen.
- At 0 %, nothing moves the gameplay camera except the player and the follow solve. Cutscene sway stays authored.

## 6. Implementation steps

1. **`ImpactCamera`** class, springs and noise. Unit-test the spring: impulse → peak angle matches the table ±10 %
   at 30, 60 and 144 Hz frame times.
2. **Wire it into `Engine.updateCamera`** after the follow solve and handoff, and into `CinematicDirector.apply`.
   Remove `shakeOffset`. Turn `triggerScreenShake(i, d)` into a deprecated shim → `addTrauma(i × 1.2)` until the
   call sites move.
3. **Change the call sites in `CombatSystem`** to `impact(kind, { dir })`. Directions:
   - hero blows: `enemy.pos - player.pos`
   - blows on the hero: `player.pos - enemy.pos`
   - deflect: `enemy.pos - player.pos`
   - bosses' quakes: undirected, scaled by `1 - dist/12`.
4. **Hit-stop:** `freeze(ms)` replaces `triggerHitStop`, with the numbers from the table.
5. **Rumble:** `InputManager.rumble`, plus the settings slider.
6. **Settings migration** and the slider.
7. **Tuning hooks** (below).

## 7. Testing and tuning

- **Dev hooks:**
  - `__debug.impact(kind, {dirX, dirZ, scale})` fires any event on demand.
  - `__debug.impactTune` exposes the live table (edit numbers in the console, then copy back).
  - `__debug.freeze(ms)` triggers a freeze.
- **Combat sandbox:** chapter 4 (Shalva) for parries, chapter 5 for crowds (light-combo spam).
- **Acceptance checks:**
  1. During a 10-hit light combo, the camera's peak rotational offset is at most 0.6° and returns to 0 within
     300 ms after the last hit.
  2. With the slider at 0, the camera transform equals the pure follow solve, bit for bit.
  3. `viewYaw` is identical with impacts on and off. Hold W through a slam: the run direction must not wobble.
  4. Spring-arm test: slam with the back to a wall; the camera never clips.
  5. At 30 fps and at 144 fps, kicks peak at the same angle and settle in the same time (frame-rate independence).
  6. The jitter probe's camera metric (JITTER.md §6): no per-frame translational noise above 1 cm.
- **Blind A/B:** record 30 s clips of the same fight at 0 %, 50 % and 100 %. The 100 % version should feel "hits
  land" without anyone describing it as "shaky". If testers call it shaky, lower trauma before kick.
- **Tuning order:** hit-stop first (it carries most of the weight), then kick, then FOV, then trauma, then rumble.
  Turn each layer off in isolation to check it is pulling its weight.

## References

- Squirrel Eiserloh, "Math for Game Programmers: Juicing Your Cameras With Math", GDC 2016: https://www.gdcvault.com/play/1023557/Math-for-Game-Programmers-Juicing (summary: https://www.gamedeveloper.com/programming/video-sprucing-up-cameras-with-math)
- Jan Willem Nijman (Vlambeer), "The Art of Screenshake", 2013, discussed at https://infovore.org/?p=5275
- PlayStation Blog, "Game developers explain what makes God of War (2018)'s combat tick" (2022), on hit-stop and deliberately reduced shake: https://blog.playstation.com/?p=370399
- GDC 2019 God of War talks (Mihir Sheth, "Evolving Combat in 'God of War' for a New Perspective"): https://gdconf.com/news/boy-does-gdc-2019-offer-more-great-god-war-talks-you-can-shake-axe
- Superjump, "The Art and Science of Sekiro's Combat" (deflect feedback, spark and pitch): https://www.superjumpmagazine.com/the-art-and-science-of-sekiros-combat/
- Source Gaming, "Thoughts on Hitstop" (Sakurai, Famitsu vol. 490): https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/
- Daniel Holden, "Spring-It-On: The Game Developer's Spring-Roll-Call" (damped springs, exact integration): https://theorangeduck.com/page/spring-roll-call
- Unity Cinemachine Impulse (directional impulse source/listener pattern): https://docs.unity3d.com/Packages/com.unity.cinemachine@2.9/manual/CinemachineImpulse.html
- MDN, `GamepadHapticActuator.playEffect()` ("dual-rumble", strong/weak magnitude): https://developer.mozilla.org/en-US/docs/Web/API/GamepadHapticActuator/playEffect
- Game Accessibility Guidelines, full list ("Provide an option to turn off / hide background movement", "Include toggle/slider for any haptics"): https://gameaccessibilityguidelines.com/full-list/

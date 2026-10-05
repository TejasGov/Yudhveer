# Proposal: character jitter and weightless turning

Status: approved ("build both jitter fixes and impact camera") and implemented, 2026-10-05. Results at the end.
Scope: models that shake in place, twitch, or turn with no sense of weight. Camera impact is in
[IMPACT_CAMERA.md](IMPACT_CAMERA.md).

## TL;DR

The render loop is mostly sound. It runs a fixed 60 Hz step, interpolates position and rotation with `slerp`, and
already works around the Euler ±90° trap with `rotation.order = 'YXZ'`. The jitter comes from the simulation and
the animation layers above that loop. I measured the top three causes in the running game:

1. **AI locomotion thrash.** Enemies jump between MOVE, IDLE and STRAFE every few frames at hard distance
   thresholds, with no hysteresis and no minimum dwell time. When a minion has no back-step clip it "backs off" by
   playing its forward run. On every flip, `CharacterRig.play()` resets the run clip to frame 0 and starts a new
   cross-fade. Measured: a rakshasa standing near a still hero made **26 one-step MOVE bursts and 122 velocity
   reversals in 40 s**, about a 3–5 Hz twitch.
2. **Bang-bang facing.** `turnToward` either snaps to the target or turns at the full rate. There is no angular
   velocity state, no acceleration limit and no deadzone. Measured peak: **≈20,600 °/s²**, which is 0 → 344 °/s in
   one step. This is the turn that has "no weight".
3. **Hard fighter separation feeding back into AI and animation.** `separateFighters` resolves 100 % of any overlap
   every step, half to each fighter, whatever their mass. Minions pinned against each other get pushed back across
   the AI thresholds of cause 1, and the push also feeds the speed-matching of the locomotion clips.

Two more issues stack on top of these. **Skeletal poses are not interpolated**: the mixer only advances inside the
fixed step, so in slow motion and hit-stop ramps the limbs step at 10–20 Hz while the root glides. The **white-noise
screen shake** also moves the camera up to ±20 cm at random every frame on every hit.

Fix order: (1) locomotion hysteresis, dwell time and clip-restart fix → (2) spring-damped facing → (3) soft,
mass-weighted separation plus AI spacing → (4) skeletal pose interpolation and hard-edged hit-stop → (5) smoothed
speed-matching → (6) teleport hygiene → (7) replace the screen shake (IMPACT_CAMERA.md). Step 0 is to land the
jitter probe below, so every step is measured before and after.

---

## 1. How the frame works today (what is already right)

| Piece | Where | Verdict |
|---|---|---|
| Fixed 60 Hz step, accumulator, 5-step cap | `core/Engine.ts:77-78, 1570-1584` | Correct ("Fix Your Timestep"). |
| Render interpolation of `group.position` (lerp) and `group.quaternion` (slerp, shortest path) | `Engine.ts:1478-1483` | Correct. |
| Restore sim state after render | `Engine.ts:1485-1490, 1602` | Correct. |
| Euler round-trip trap (quaternion → XYZ Euler turns yaw > 90° into `(π, π-yaw, π)`) | `entities/Entity.ts:21-25` sets `rotation.order = 'YXZ'` | Already fixed. Keep it. |
| Teleports from cutscene cues drop interpolation | `Engine.ts:342`, `cinematics/Scene.ts:286-292` | Correct for `Staging.place`. Not every teleport goes through it (see §3.6). |
| Follow camera follows the interpolated hero, damped with `1 - exp(-15 dt)` | `core/SceneManager.ts:175-178` | Correct and frame-rate independent. |
| Yaw maths uses `wrapAngle` (short way round) | `entities/Character.ts:551-556, 741-743` | Correct. |

So this is not a timestep or interpolation bug at the transform level. The remaining problems sit in the layers above.

## 2. Measurements

I used the running dev server and the existing `__debug.step` hook, which runs exactly the play-loop path. I logged
the state, clip, position and yaw of every fighter at every step. No source was modified.

**Scenario S1.** Chapter 5 (summit), hero standing still, two rakshasas and a yatudhana, 2400 steps (40 s).

| Fighter | State changes | One-step state runs | Velocity reversals | Clip restarts | Top transitions |
|---|---|---|---|---|---|
| rakshasa_1 | 68 | **26** | **122** | 68 | MOVE→IDLE 27, IDLE→MOVE 26 |
| rakshasa_2 | 19 | 3 | 95 | 19 | IDLE↔ATTACK, IDLE↔MOVE |
| shalva (chapter 4, has strafe clips, 20 s) | 17 | 0 | 3 | 16 | clean |

The trace for rakshasa_1 shows the mechanism. It sits at 1.40–1.42 m from the hero, which is exactly `crowdRange`
(1.4). It is also exactly 0.80 m from rakshasa_2, which is the sum of their capsule radii, so it is pinned by
separation. The loop repeats every 12–22 steps:

- IDLE (the "circle" branch, which has no strafe clip)
- separation pushes it in below 1.4 m
- one step of `backOff`, which has no WALK_BACK clip and so plays MOVE, the forward run, backwards at 1.6 m/s
- back above 1.4 m → IDLE

**Scenario S2.** The hero walks a slow figure-8 near the minions, 900 steps.

| Fighter | Yaw direction reversals | Max angular acceleration | Steps where yaw velocity jumped > 3° |
|---|---|---|---|
| rakshasa_1 | 4 | 20,626 °/s² | 6 |
| rakshasa_2 | 6 | 20,626 °/s² | 6 |
| yatudhana_3 | 4 | 36,097 °/s² | 15 |

A heavy body should not exceed roughly 1,500–3,000 °/s² (see §4.2 for the numbers).

**Scenario S3.** Vertical motion over 600 steps. rakshasa_1 shows 45 vertical reversals of more than 0.5 mm and steps
up to 7 mm. That is the horizontal twitch from S1 riding over sloped ground; `grounded` never flipped. The motor's
ground snapping is not a primary cause today.

## 3. Root causes in our code (with evidence)

### 3.1 Locomotion state thrash, the #1 cause

- `entities/Enemy.ts:149-161`: three hard bands (`> engageRange` → MOVE toward the target, `< crowdRange` →
  backOff, otherwise circle). There is no hysteresis and no minimum time in a branch, and each branch moves the
  enemy at its full speed from the first step.
- `Enemy.ts:201`: `settle(hasClip('WALK_BACK') ? 'WALK_BACK' : 'MOVE')`. Rakshasa, yatudhana, raider, the Baoli
  guardian, Takshaka, the island monsters and the mentor have no WALK_BACK clip. Their back-off plays the forward
  run while moving backwards. Only Shalva, Mayavi, Vetala and Andhaka define strafe or back-step clips.
- `Enemy.ts:205-208`: without strafe clips, the "circle" branch is IDLE. The band between the thresholds is therefore
  a dead zone that separation keeps pushing the enemy out of.
- `Boss.ts:136-160` has the same structure (`strikeRange` / `tooClose`). Bosses are mostly spared because they have
  strafe clips and a slow 3.5 rad/s turn.
- `entities/animation/CharacterRig.ts:411-432`: `play()` only continues a looping clip if it is the *current* action.
  MOVE→IDLE→MOVE calls `action.reset()` (line 421), which sets time to 0 and restarts the fade, then
  `crossFadeFrom(previous, 0.15)`. Each flip shows as a pop of the run pose (about 11 % weight after one step) plus a
  restarted stride.
- `entities/Character.ts:390`: any state change re-plays the rig. There is no animation-side dwell time.

### 3.2 Facing has no inertia, the #2 cause

- `Character.ts:551-556` `turnToward`: `step = clamp(diff, ±rate·dt)`. Angular velocity goes from 0 to the maximum
  rate in one step and back to 0 in one step. Enemies turn at 6–7 rad/s (344–400 °/s), bosses at 3.5 rad/s, and
  route following at 1.5× that (`Enemy.ts:180`).
- There is no deadzone, and the target bearing is recomputed every step from `atan2(target - self)`
  (`Enemy.ts:123`, `Boss.ts:101-103`). When fighters are close (separation keeps them about 0.8 m apart) a few cm of
  separation push or lunge swings the bearing by 5–10°, and the turn chases it at full rate. The result is the
  "nervous" heading.
- Snap writes: `Enemy.faceTowards` (`Enemy.ts:332-334`, used by AI in `BossShalva.ts:183, 266, 283`),
  `BossShalva.ts:247`, `Player.ts:328` (slide), `Player.ts:367` (swing at nothing). Interpolation smooths these over
  one 16 ms step, so they read as a pop.
- The player's `turnTowards` (`Player.ts:429-434`) is better: it eases in over the last degrees (`diff·14dt`). It
  still has no acceleration limit, and `ASSIST.turnRate = 20 rad/s` (`Player.ts:37`) makes swing-aim turns snap.

### 3.3 Separation is hard, symmetric and invisible to the AI, the #3 cause

- `physics/CharacterMotor.ts:160-181`: 100 % of the overlap is resolved in one step, split 50/50 regardless of size.
  A 3.2 m Baoli guardian and the hero shove each other equally.
- `core/Engine.ts:1428-1431`: separation runs after the AI has moved everyone, so the AI never sees it coming. The
  next step the AI walks back in and separation pushes back out. That is ping-pong, and with the band thresholds of
  §3.1 it becomes state thrash.
- Minions do no steering-level separation of their own. They converge on the same point and rely on the hard push.

### 3.4 Skeletal pose is not interpolated (stepping in slow motion, hit-stop and on high-refresh screens)

- The mixer advances only in the fixed step: `Character.update` (line 713) → `updateRig` → `rig.update` →
  `mixer.update(dt)` (`CharacterRig.ts:480`). `applyInterpolation` (`Engine.ts:1478`) smooths only the root `group`.
- `Engine.slowMotion` (`Engine.ts:1280-1284`) runs at 0.3–0.4× for 1.2–1.6 s on victory, defeat and the scripted
  loss. That is one fixed step every 2.5–3.3 render frames, so the **limbs pose at 18–24 Hz while the root glides
  smoothly**.
- `CombatSystem.triggerHitStop` (`combat/CombatSystem.ts:318-328`) eases back from 0.05–0.35× over 100–200 ms with
  `power3.out`, on almost every hit (lines 207, 219, 243, 291). Each hit therefore ends with about 0.1 s of
  low-rate pose stepping.
- On 120/144 Hz displays, limbs update at 60 Hz while the root moves at 144 Hz. This is subtle, but it is a constant
  "shimmer" on fast swings.
- The weapon trail and hit detection read the skeleton in the fixed step (`Character.ts:578-609`). That is correct for
  gameplay and must stay.

### 3.5 Speed-matched clips follow a noisy speed

- `Character.ts:386` measures `groundSpeed` from the *intended* displacement before collision. That includes
  separation pushes and lunges. `CharacterRig.ts:473-479` sets the clip time scale from it every step (clamped
  0.5–2.4×, line 165). A pinned minion's stride rate flickers with the shove. S1 logged 74 time-scale jumps of more
  than 0.05 for rakshasa_1.

### 3.6 Transform writers and teleports inside the step

Several systems write `group.position` and `group.rotation.y` in one fixed step, in this order:

1. Player input / enemy AI
2. `separateFighters`
3. Staging (cutscenes)
4. Root motion (`Character.ts:402`)
5. Lunges (`Enemy.ts:312-322`)
6. Special boss code
7. `motor.resolve` (`Character.ts:727`)

Each is fine alone. Together, no single place owns velocity, so nothing can be smoothed.

Teleports inside the step that do not drop interpolation smear across one frame: `BossShalva.burstOut` moves him to
the burst point (`BossShalva.ts:277-278`). `recoverFalls` is handled (`Engine.ts:1395, 1403`).

### 3.7 The camera adds white noise

- `core/SceneManager.ts:243-262`: `triggerScreenShake` writes `Math.random()` offsets of up to ±intensity/2 per axis
  (0.4 → ±20 cm) every gsap tick, added to the camera position at line 198. In cutscenes, `joltCamera` does the same
  (`cinematics/CinematicDirector.ts:203-206, 211`).
- White noise at frame rate is the textbook definition of jitter. During a combo the whole picture buzzes, and every
  model on screen appears to shake. See IMPACT_CAMERA.md for the replacement.

### 3.8 Checked and not a cause today

- Euler wrap: fixed (`Entity.ts:21-25`). Slerp takes the shortest path. `wrapAngle` is used everywhere yaw is diffed.
- Root motion double-apply: no. `rigDrivesMotion` gates lunges (`Enemy.ts:131`, `Boss.ts:107`), and root motion is
  integrated once per step from the curve delta (`CharacterRig.ts:481-486`).
- Kinematic controller ping-pong: no `grounded` flips in S3. Offset 0.02 m is sane. `autostep` 0.75 m and
  snap-to-ground 0.45 m (`CharacterMotor.ts:17-23`) are generous and could pop a body onto props, so watch them once
  the larger issues are fixed.
- Large world coordinates: the arenas sit within about 40 m of the origin, so float precision is fine.
- Socket and weapon lag: props are parented to bones and the two-handed aim refreshes world matrices
  (`CharacterRig.ts:380-383, 406`). No one-frame lag found.

## 4. Industry practice (short)

- **Fixed step and interpolation.** Simulate at a fixed dt and render the blend `prev·(1-α) + curr·α` with
  `α = accumulator/dt`. This applies to *every* visible state, including rotations (slerp) and, in engines that need
  it, animation poses. Without it you get temporal aliasing. [Fiedler]
- **Separate simulation from presentation.** The gameplay body may move discretely. The visual model follows it with
  smoothing (a "visual offset" that decays), so corrections never pop. This is standard in networked and physics
  games for the same reason. [Fiedler; Holden]
- **Frame-rate-independent smoothing.** Use `x = lerp(x, target, 1 - exp(-λ·dt))`, never a per-frame constant. For
  anything that has *velocity*, such as facing, use a critically damped (or slightly underdamped) spring with an
  angular velocity state. That gives continuous acceleration, which is what "weight" is. [Driscoll; Holden]
- **Turn limits with deadzone and hysteresis.** Cap the turn rate *and* the angular acceleration, ignore tiny bearing
  changes, and stop retargeting inside a minimum distance.
- **Locomotion decisions need hysteresis and minimum dwell time.** Use separate enter and exit thresholds, and commit
  to a branch for at least about 0.3–0.5 s. Animation state machines additionally avoid restarting a looping clip
  that is still fading out. Re-entering blends from its current phase.
- **One writer per transform.** Systems express intent (desired velocity, desired heading). One integrator per
  character turns intent into motion with acceleration limits. Collision resolves last.
- **Crowd spacing at the steering level.** Reynolds-style separation steering, or velocity obstacles (RVO/ORCA) for
  dense crowds, keeps agents apart *before* the physics push. Melee games add attack "slots" or "tokens" around the
  player so minions do not stack on one point. [Reynolds; van den Berg et al.]
- **Kinematic character controllers.** Rapier's KCC resolves the desired translation with a small skin `offset`,
  `autostep` (only when touching floor) and `snapToGround`. Character-vs-character is usually handled outside the
  KCC, as we do, but it should be soft. [Rapier docs]
- **Hit-stop.** A *freeze* (both parties hold one pose) and then a hard resume. A long slow ramp only shows the
  low-rate stepping. [Sakurai via Source Gaming; PlayStation Blog on God of War]

## 5. Fix plan (prioritised)

Each item lists cause → change → expected effect → risk → verify. The snippets are sketches.

### Step 0. Land the jitter probe (§6) first

It turns S1–S3 into a repeatable test. Record a baseline and attach the numbers to each fix's PR.

### Fix 1. Locomotion hysteresis, dwell time and clip continuity (cause 3.1)

**Change A: AI bands with hysteresis and commitment** (`Enemy.updateAI`, `Boss.updateAI`).

```ts
// Enemy fields
private moveMode: 'approach' | 'hold' | 'retreat' = 'hold';
private modeTime = 0;
const MIN_DWELL = 0.4;    // s committed to a locomotion choice
const HYST = 0.35;        // m

// in updateAI, replacing the three-way if:
this.modeTime += dt;
const want =
  distance > this.engageRange + (this.moveMode === 'approach' ? -HYST : HYST) ? 'approach' :
  distance < this.crowdRange  - (this.moveMode === 'retreat'  ? -HYST : HYST) ? 'retreat'  : 'hold';
if (want !== this.moveMode && this.modeTime >= MIN_DWELL) { this.moveMode = want; this.modeTime = 0; }
```

Approach stops only once inside `engageRange - 0.35`. Retreat stops only once outside `crowdRange + 0.35`.

**Change B: no backwards run.** If there is no WALK_BACK clip, do not retreat by moving. Hold (IDLE) and let the
attack cooldown decide. Alternatively, define `WALK_BACK: { clip: <walk>, reverse: true, matchSpeed: false }` per
character. `reverse` already exists in `StateAnimation`.

**Change C: velocity, not position steps.** Give `Enemy` a `speed` that approaches the band's target speed with
acceleration (as `Player.locomote` does, `Player.ts:251-274`). For example accel 10 m/s² and decel 14 m/s² for
minions, lower for bosses. Then a 1-step MOVE moves 2 mm, not 7 cm.

**Change D: clip continuity** (`CharacterRig.play`).

```ts
if (info?.loop && action.isRunning() && action.getEffectiveWeight() > 0.01 && previous !== action) {
  // re-entering a loop that is still fading out: blend back from its current phase, no reset
  action.setEffectiveTimeScale(rate);
  action.crossFadeFrom(previous!, fade, false);
  this.current = { config, action, lastTime: action.time };
  return;
}
```

Optionally add an animation-side minimum dwell for locomotion keys in `Character.updateRig`: hold the visual key for
at least 0.2 s unless the new state is non-locomotion.

- **Effect:** S1 one-step runs 26 → 0. Locomotion flips 1.7/s → below 0.3/s. Velocity reversals drop by an order of
  magnitude.
- **Risk:** AI feels slightly lazier. Tune `MIN_DWELL` per class, shorter for minions. Combat timing is untouched.
- **Verify:** probe S1 and S2. Watch a 3-minion fight with F3.

### Fix 2. Spring-damped facing (cause 3.2)

Replace the body of `Character.turnToward` (one function used by AI, bosses and staging) with an angular spring.
Keep its signature and return value so callers do not change.

```ts
// Character fields
public yawVel = 0;                 // rad/s
public turnAccel = 30;             // rad/s^2 (minions); bosses ~12, hero ~45
const DEADZONE = THREE.MathUtils.degToRad(1.5);

public turnToward(yaw: number, maxRate: number, dt: number): number {
  let diff = wrapAngle(yaw - this.group.rotation.y);
  if (Math.abs(diff) < DEADZONE && Math.abs(this.yawVel) < 0.2) { this.yawVel = 0; return diff; }
  // desired turn speed proportional to the angle left (eases in at the end), capped at the class's rate;
  // the turn speed itself may only change by turnAccel: it winds up and settles instead of snapping
  const GAIN = 8;                                     // 1/s: ~8 deg/s of turn per degree left
  const desiredVel = THREE.MathUtils.clamp(diff * GAIN, -maxRate, maxRate);
  const dv = THREE.MathUtils.clamp(desiredVel - this.yawVel, -this.turnAccel * dt, this.turnAccel * dt);
  this.yawVel += dv;
  // never overshoot within one step
  const step = Math.abs(this.yawVel * dt) > Math.abs(diff) ? diff : this.yawVel * dt;
  this.group.rotation.y = wrapAngle(this.group.rotation.y + step);
  return wrapAngle(diff - step);
}
```

This is a proportional turn limited in both rate and acceleration: angular velocity is continuous and the arrival is
eased. If the heaviest bosses want a touch of overshoot, a critically damped spring on the wrapped angle (Holden's
`simple_spring_damper_exact`) is the drop-in alternative. Tune either one with the probe.

Also:
- **Bearing hysteresis.** Inside 0.9 m of the target, AI keeps its last bearing instead of recomputing
  `atan2` (`Enemy.ts:123`, `Boss.ts:101`).
- **Replace AI snap writes** (`faceTowards` in `BossShalva.ts:183, 266, 283`) with `turnToward` over a few steps,
  except under water, where he is unseen.
- **Player:** keep the existing ease-in, add the same acceleration cap (about 45 rad/s²), and lower
  `ASSIST.turnRate` to about 14 rad/s with the acceleration cap.

- **Effect:** peak angular acceleration 20–36k → at most 2–3k °/s². Heading stops chasing centimetre shoves. Turns
  read as heavy.
- **Risk:** slower acquisition can make enemy swings miss a strafing player. That is intended (Sekiro-like
  readability). If needed, raise `turnAccel` during the wind-up only.
- **Verify:** probe S2 (max angular acceleration, yaw reversals/s), plus a manual circle-strafe test around a boss.

### Fix 3. Soft, mass-weighted separation plus AI spacing (cause 3.3)

```ts
// separateFighters: resolve a fraction per step, weighted by mass, speed-capped
const k = 0.35;                 // share of overlap removed per step (~1 - e^{-25 dt})
const maxPush = 2.0 * dt;       // m per step
const wa = b.mass / (a.mass + b.mass), wb = 1 - wa;
const corr = Math.min(overlap * k, maxPush);
a.position.x -= nx * corr * wa; ...  b.position.x += nx * corr * wb; ...
```

- Mass is roughly proportional to capsule volume (hero 1, minion 1, Shalva 2, Baoli 4).
- Report each fighter's separation displacement as `sepPush` so AI and animation can ignore it (see Fix 5).
- **AI steering separation:** in `Enemy.updateAI` add a Reynolds separation term from other living enemies within
  1.3 m to the move direction before integrating.
- **Slots:** give each living minion a slot angle around the hero (spread by index). "Approach" targets
  `hero + R·dir(slot)` instead of the hero's centre, so minions stop converging on one point.

- **Effect:** removes the pinned-minion ping-pong. Big bodies stop being shoved by the hero.
- **Risk:** a softer push allows brief overlaps of a few cm. That is invisible at our camera distance. The slide
  already disables solidity.
- **Verify:** probe S1 velocity reversals (target below 10 per 40 s) and the "pinned" counter (distance ≈ radius sum
  for more than 1 s).

### Fix 4. Interpolate skeletal poses and make hit-stop a freeze (cause 3.4)

**Pose interpolation.** Mirror what `captureTransforms` does for roots:

- For every visible rigged character, cache its bones (`SkinnedMesh.skeleton.bones`, about 50–70 per rig).
- At `captureTransforms('prev'|'curr')` copy each bone's local `position` and `quaternion`.
- In `applyInterpolation`, `lerpVectors` / `slerpQuaternions` the bones.
- In `restoreSimulationState`, copy back `curr`.

The fixed step keeps the exact pose that hit detection used. Only the rendered frame is blended. Cost is about
5 characters × 65 bones × 2 copies per frame, which is negligible. Clear a character's pose cache when it teleports
or its rig is swapped.

**Hit-stop as a freeze.** Change `triggerHitStop` to hold `globalTimeScale = 0` for N ms and then snap back to 1
(no `power3` ramp). Fighting games freeze and resume. The ramp is what produces the low-rate stepping. Keep
`slowMotion` for the outro beats; with pose interpolation it becomes smooth.

- **Effect:** smooth limbs in slow motion and on 120/144 Hz screens. Hits read crisper.
- **Risk:** two-handed aim and the sword-in-hand corrections are computed post-mixer per step. Interpolating bones
  and then props parented to them is consistent. Exclude `mounts` objects from interpolation, since they ride bones.
- **Verify:** probe metric "render frames where root moved but pose did not" during `slowMotion(0.3)`. It should go
  from about 70 % to 0 %.

### Fix 5. Speed-match on filtered, post-collision speed (cause 3.5)

In `Character.updateRig` use a filtered speed:

```ts
this.visSpeed += (this.actualSpeedExclSep - this.visSpeed) * (1 - Math.exp(-8 * dt))
```

Here `actualSpeed` is measured after `motor.resolve` minus `sepPush`. Pass `visSpeed` to `rig.update`. Add a ±5 %
deadband before calling `setEffectiveTimeScale`.

- **Effect:** no stride-rate flicker when shoved. Feet slide less.
- **Risk:** a one-step lag at gait start, which is invisible.
- **Verify:** probe count of time-scale jumps above 0.05 per second.

### Fix 6. Teleport hygiene (cause 3.6)

- Add `Character.markTeleported()`, which sets a flag. At `captureTransforms('curr')` the Engine copies `curr` into
  `prev` for flagged objects, and does the same for the bone cache.
- Call it from `Character.setPosition` and from `BossShalva.burstOut`.
- Long term, move AI and input to write `desiredVelocity` / `desiredYaw`, and have one `Character.integrate(dt)`
  apply acceleration limits, root motion and lunges before `motor.resolve`. Avoid big-bang refactors: do this per
  class as Fixes 1–2 touch them.

### Fix 7. Replace the white-noise screen shake (cause 3.7)

See IMPACT_CAMERA.md: smooth noise, rotational, trauma², and applied as an offset after the follow solve.

### Later: motor tuning

Once the above lands, re-run S3 on stairs and props. If pops show, lower `maxStepHeight` (0.75 m) for minions and
set `snapToGround` to about 0.3 m.

## 6. Jitter probe (debug tool design)

`src/debug/JitterProbe.ts`, dev builds only. Exposed as `__debug.jitter(opts)` and as an F3 overlay tab.

**API**

```ts
__debug.jitter({ seconds = 20, mode: 'step' | 'live' = 'step', ids?: string[], hero?: 'still' | 'figure8' | 'input' })
  -> { [id]: Metrics, camera: CameraMetrics, verdict: 'pass' | 'fail', failures: string[] }
```

- `step` drives `engine.debugStep` (deterministic, like S1/S2).
- `live` samples real rendered frames via a post-render hook, including interpolation, bones and camera.

**Per-character metrics (per second unless noted)**

| Metric | Definition | Threshold (pass) |
|---|---|---|
| locoFlips | locomotion-state changes (IDLE/WALK/MOVE/STRAFE/WALK_BACK) | ≤ 0.5 /s |
| shortRuns | state runs ≤ 5 steps (total) | 0 |
| clipRestarts | `play()` with `reset()` on a looping clip that had weight > 0 | 0 |
| velReversals | sign flips of horizontal velocity (\|v\| > 0.1 m/s) | ≤ 0.5 /s with a still hero |
| yawReversals | sign flips of yaw rate (\|ω\| > 10°/s) | ≤ 0.5 /s with a still hero |
| maxAngAccel | max \|Δω\|/dt | ≤ 3000 °/s² (minion), ≤ 1500 (boss) |
| tsJumps | effective time-scale changes > 0.05 | ≤ 1 /s |
| yReversals | vertical reversals > 0.5 mm | ≤ 1 /s on flat ground |
| pinned | s with neighbour distance ≈ radius sum (±1 cm) | ≤ 1 s per 20 s |
| poseStale (live) | rendered frames where root moved > 1 mm but bone matrices identical to last frame | 0 % (after Fix 4) |

**Camera metrics (live):** the camera's angular velocity and jerk without user look input. The maximum translational
offset per frame added by shake should be at most 1 cm (after IMPACT_CAMERA).

**Scenarios (scripted, one call each):**

- **S1** summit pack versus a still hero.
- **S2** figure-8 hero (moves the hero kinematically, as in §2).
- **S3** boss duel (Shalva) with the hero circle-strafing.
- **S4** `slowMotion(0.3, 1.6)` with a fighter mid-swing (pose staleness).
- **S5** staged walk in the Akhada intro (staging versus separation).

Keep the S1–S2 numbers from §2 in the doc as the baseline. A CI-style headless run (Playwright plus `__debug`) can
fail a PR when a threshold regresses.

**Overlay:** per fighter, a small sparkline of yaw rate and the state letter above the head. Flips flash red, so a
human can see thrash without reading numbers.

## References

- Glenn Fiedler, "Fix Your Timestep!" (2004): https://gafferongames.com/post/fix_your_timestep/
- Daniel Holden (orangeduck), "Spring-It-On: The Game Developer's Spring-Roll-Call": https://theorangeduck.com/page/spring-roll-call
- Rory Driscoll, "Frame Rate Independent Damping Using Lerp" (2016): http://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/
- Howling Moon Software, "Improved Lerp Smoothing": https://howlingmoonsoftware.com/improved-lerp-smoothing/
- Rapier, JavaScript character controller guide (offset, autostep, snap-to-ground): https://rapier.rs/docs/user_guides/javascript/character_controller
- Craig Reynolds, "Steering Behaviors For Autonomous Characters": https://www.red3d.com/cwr/steer/
- J. van den Berg et al., RVO2 / ORCA (reciprocal collision avoidance): https://gamma.cs.unc.edu/RVO2/
- three.js docs, AnimationMixer / AnimationAction (`crossFadeFrom`, `reset`, `isRunning`): https://threejs.org/docs/#api/en/animation/AnimationAction
- three.js docs, Quaternion (`slerpQuaternions`, shortest path): https://threejs.org/docs/#api/en/math/Quaternion
- Source Gaming, "Thoughts on Hitstop" (Sakurai's Famitsu column, vol. 490): https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/
- PlayStation Blog, "Game developers explain what makes God of War (2018)'s combat tick" (2022): https://blog.playstation.com/?p=370399

## Results (2026-10-05)

Measured with the probe (`src/debug/JitterProbe.ts`, `__debug.jitterScenario(name)` in dev builds). Step-mode
scenarios run the engine's own fixed step with Math.random seeded (seed 7), so each one repeats exactly; the before
numbers are the same code with only the probe added. Rates are per second for all the scenario's enemies together;
`max ang. accel` is the worst single fighter.

| Scenario | | loco flips/s | short runs | clip restarts | vel. reversals/s | yaw reversals/s | max ang. accel (deg/s^2) | ts jumps/s | y reversals/s | pinned (s) |
|---|---|---|---|---|---|---|---|---|---|---|
| S1 summit pack, still hero, 40 s | before | 4.07 | 98 | 141 | 17.43 | 0.43 | 12,897 | 0 | 9.58 | 5.1 |
| | after | 0.10 | 2 | 4 | 0.03 | 0.03 | 799 | 0 | 0.40 | 0 |
| S1p prologue raiders, still hero, 20 s | before | 1.70 | 29 | 20 | 1.15 | 0.35 | 4,830 | 0 | 0.70 | 0 |
| | after | 0.30 | 3 | 6 | 0.15 | 0 | 834 | 0 | 0.05 | 0 |
| S2 summit pack, hero walking a figure-8, 15 s | before | 8.60 | 96 | 114 | 7.80 | 0.53 | 20,626 | 0.80 | 7.60 | 13.3 |
| | after | 1.60 | 6 | 6 | 0.54 | 0.33 | 1,719 | 0 | 4.14 | 2.74 |
| S3 Shalva, hero circle-strafing, 20 s | before | 0.05 | 1 | 1 | 0 | 0 | 10,821 | 0 | 2.15 | 0 |
| | after | 0.35 | 1 | 2 | 0.35 | 0 | 688 | 0 | 0.40 | 0 |
| S3b Baoli guardian, hero circle-strafing, 20 s | before | 0 | 0 | 1 | 0.20 | 0.05 | 12,032 | 0 | 0.60 | 0 |
| | after | 0 | 0 | 1 | 0.20 | 0.05 | 688 | 0 | 0 | 0 |
| S5 akhada sparring, still hero, 20 s | before | 0.25 | 3 | 5 | 0.05 | 0 | 38 | 0 | 0 | 0 |
| | after | 0.10 | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |

Live frames (`mode: 'live'`):

| | before | after |
|---|---|---|
| S4 pose staleness in `slowMotion(0.3)` (rendered frames where the root moved and the limbs did not) | 32 % | 0 % |
| Camera: largest translation added by shake (a light hit, a heavy hit, a deflect) | 25.7 cm | 1.8 cm |
| Camera: largest jump between two frames | 31.7 cm | 0.6 cm |
| Camera: largest rotation added | 0 (it only translated) | 0.76 deg |

Reading the after column:

- The remaining clip restarts are each looping clip's first play in the run (the counter counts any restart of a loop
  whose weight reads above 1 %, and three.js reports an action that has never played at full weight), not pops.
- The remaining short runs are attack, one step of IDLE, then MOVE: the state machine ends a swing in IDLE and the AI
  starts its run the next step. The clip dwell (0.2 s) keeps that from showing.
- S2 and S3 flip more than S1 because the hero is moving: those flips are decisions kept at least 0.4 s (0.5 s for a
  boss), and Shalva now holds and strafes inside his range instead of walking at a hero who stays just outside it.
- S2's y reversals are minions walking over the summit's uneven rock; S1's came from a standing body trembling on the
  character controller's skin, now held still (below).
- Max angular acceleration is now the turn limits: 30 rad/s^2 for minions (1,719 deg/s^2), 12 for bosses (688).

What was built, per step:

0. The probe and its scenarios (S1, S1p, S2, S3, S3b, S5 step mode; S4 live), `__debug.jitter(options)`.
1. Locomotion: approach / hold / retreat with 0.35 m of hysteresis and a 0.4 s commitment (bosses 0.5 s); velocity
   with acceleration (minions 10 / 14 m/s^2, bosses 6 / 10) instead of full-speed position steps; no backwards run (a
   character without a back-step clip plays its walk in reverse, and holds if it has no walk); cross-fades that start
   from every clip's current weight, and a loop still fading out blends back from its phase instead of restarting; a
   0.2 s dwell between locomotion clips (not for the hero).
2. Facing: turn speed with an acceleration cap (minions 30, bosses 12, hero 60 rad/s^2; the swing aim 150), an
   ease-in, a 1.5 deg deadzone, a coast to a stop when nothing steers it, and the bearing kept within 0.9 m of the
   target. Snaps removed: Shalva turns to the hero as he sinks and as he rises (the turn under the water and the burst
   out of it stay snaps, out of sight); the hero's swing at nothing turns over its wind-up. Kept on purpose: the slide
   (an evasion goes exactly where it is pressed) and placements (spawns, cutscene marks, the hero turned to face a
   boss as his cutscene cuts in), now through `faceYaw`.
3. Separation: soft (35 % per step of the first 8 cm of overlap, anything deeper at once so nobody walks through
   anybody; the proposal's 2 m/s cap was left out for that reason), weighted by capsule volume; each fighter's shove
   reported as `sepPush`; Reynolds spacing between enemies while they move (not along a route); slots round the hero
   at least 70 deg apart for minions.
4. Bone poses interpolated between fixed steps like the roots (restored to the exact step pose after the frame);
   hit-stop is a freeze of real time (`CombatSystem.freeze`, combined by max, 180 ms per 0.5 s budget) with a hard
   resume. The slide's near miss keeps its slow-motion beat, now smooth.
5. Stride from the real, post-collision speed without shoves, filtered (8/s), a 2 % deadband and at most 2.5/s of
   rate change.
6. `Character.markTeleported` (called by `setPosition`, Shalva's burst out of the water, the hero turned at a boss's
   arrival) drops the root and pose interpolation.
7. The white-noise screen shake is gone: `ImpactCamera` (IMPACT_CAMERA.md).

Also, from the "later" list: a body standing still on the ground no longer trembles on the character controller's
skin (movement under 6 mm that the controller invents for a body not trying to move is dropped).

Not done: the probe's F3 overlay (sparklines and state letters over heads); the numbers are in the console instead.

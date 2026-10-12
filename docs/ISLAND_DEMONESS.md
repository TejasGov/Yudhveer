# Island demoness — encounter and rig review

The hall fight is unchanged. The pool contains the former final encounter's two hurlers, four runts and two
rear reinforcements. Once both waves clear, the final chamber starts the Spider Demoness fight. Her released
human soul stands calmly, walks to the rock seal, opens it and walks beside the altar. The original ghee/fire
dressing, altar, mace pickup, voice files and chapter ending remain intact. The existing cave GLB is divided by
a separately owned, removable rock curtain; the cave itself was not rebuilt.

Work is on the `cave-demoness` review branch and has not been deployed. The 2026-10-11 audit and rework (last section)
supersedes the sizes, speeds and timings quoted in the older sections; they are kept as history.

## Asset provenance and current human rig

The supplied inputs are `E:\hindan\spider demon.glb`, `E:\hindan\human form of spider.glb` and
`E:\hindan\spider chain axe.glb`. They contained no skeletons or animation. These originals remain untouched;
their SHA-256 hashes are in [ISLAND_DEMONESS_SOURCES.json](ISLAND_DEMONESS_SOURCES.json). Their original provider,
plan and license details were not supplied, so no third-party license is asserted for the meshes.

The user approved a Meshy humanoid rig job for the supplied human mesh on 2026-10-10:
`01a12465-28fb-744f-9461-3f645036c8e5`, status `SUCCEEDED`, actual cost **5 credits**. Its saved bundled walking
animation is the source of the soul's walk. The relaxed idle is the game's existing Adobe Mixamo
`Stance-Calm Idle.fbx`, retargeted locally through the existing character pipeline. The final
`scripts/prepare-island-soul.py` transfers the walk through both skeletons' rest frames, removes horizontal
root travel and records the authored walking speed. No provider animation job was needed beyond that approved
rig job. The task record is retained locally; signed download URLs are deliberately absent from repo documentation.

The integrated human GLB was 4,016,032 bytes (now 4,159,260 after the 2026-10-11 rebuild), 30,658 triangles, with 24 skin joints, an 8.3333 s calm idle and a
1.033333 s walk. It keeps the original mesh appearance; embedded textures range from 1024 to 2048 pixels. The
manifest recorded the walk at 1.6184 m/s (now 1.2313 m/s, played at 1.0x; see the last section). `ISLAND_SOUL` maps IDLE/REST to idle and WALK/MOVE/SPRINT to the actual
walk with speed matching; staged movement remains 1.3 m/s.

Only this soul opts into `shade.grounded`. It follows nearby walkable cave floor through
`CharacterMotor.groundBelow`, ignoring fighter capsules and sensors, rejecting steep normals and bounding
step/drop changes. At full presence it has no hover offset or vertical bob. Other story shades keep their existing
hovering behaviour. Its fade-in still rises from the ground, and its ghost tint, opacity and cold motes remain.

## Integrated spider rig

`scripts/build-island-spider.py` rebuilds the source spider locally with eight leg chains of three joints each,
39 exported skin joints, bone-heat weights with nearest-weighted repair where needed, and foot IK baked into
ordinary animation tracks. Textures are capped at 2048 pixels. The browser does not run an IK solver. The
movement setting is reduced to 1.3 m/s. The move clip is 0.8 s with authored speed 0.6923077 m/s; runtime playback
is approximately 1.878, within the engine's 2.4 speed-matching cap.

The reviewed GLB and manifest from `E:\hindan\cave-demoness-work\rig-rebuild` are now integrated into the public
assets. The spider hash at that pass was `736ff07c…02aa9`; the 2026-10-11 rebuild (normals restored, WebP textures, feet
levelled) is 2,988,916 bytes, `4ba197cd…b482`. Its audit found
39 joints, 22,076 weighted vertices with at most four influences, exact loop endpoints, and eight feet within
3 mm of the authored 0.045 m foot target. Stance residual after engine forward motion is 1–4 cm. Blender walk,
attack_2 and death previews were reviewed for shape and ground contact. These measurements are not a final
animation-quality or weapon-choreography verdict.

## Rebuilding working copies

Use Blender 5.2.2 headlessly and absolute paths. The scripts write derived outputs separately; they do not
save over the supplied inputs. Inspect candidate renders before copying outputs into public assets.

The saved human inputs are `soul-walking.glb` from the approved Meshy job and `soul-idle.glb` plus its manifest
from the existing character pipeline. The idle intermediate uses the existing
`E:\hindan\game asset\characters\animations\Stance-Calm Idle.fbx`; that source and all other files under
`game asset/` were read only. `E:\hindan\game asset\characters\build_character.py` is the existing character pipeline
used to prepare that intermediate from the rigged human at 1.8 m height, with the Stance animation prefix.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' -b --python scripts/prepare-island-soul.py -- 'E:\hindan\cave-demoness-work\rig-rebuild\soul-walking.glb' 'E:\hindan\cave-demoness-work\rig-rebuild\soul-idle.glb' 'E:\hindan\cave-demoness-work\rig-rebuild\island_soul.glb'
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' -b --python scripts/build-island-spider.py -- 'E:\hindan\spider demon.glb' 'E:\hindan\cave-demoness-work\rig-rebuild\island_demoness.glb'
```

`scripts/build-island-demoness.py` is retained as the **legacy prototype builder**, including the original
simplified spider and floating-human clips. It is not the current human workflow. It remains the preparation
recipe for the axe export (`--only axe`; 824,372 bytes since 2026-10-11, WebP textures); running it must not replace the reviewed human or spider outputs.

## Combat and release timing

One axe travels on authored local paths: a broad horizontal sweep, overhead slam and straight throw with a
harmless return and punish window. Up to 128 instanced alternating metal links connect the animated hand to the
axe; the links are visual, without physics or damage. The supplied weapon also has its own short ornamental
chain. The blade uses the existing swept intersection and campaign defence resolver. Static scenery contact
cancels the remaining damage and recalls the axe. Final body-to-weapon choreography remains under review.

Provisional combat values are 480 health, 130 posture, 0.65 enemy damage scale, 2.1 seconds between attacks and
4.8 m engagement range. No human balance measurement supports these numbers yet. The release scene's two added
lines remain subtitles; no voice recordings were created or replaced.

The release scene opens the wall at 0.5 s into its last shot. Movement starts at 2.4 s, after its 1.8 s visual
fade. The 6.2 s shot gives the soul time to walk to the altar, with essential settlement at 5.95 s and a final
mark of `(1.7, -2.11, -74.6)` on the dais. The wall cue and settlement remain essential, so skipping or replaying
the scene leaves the seal open and the soul visible beside the original altar. The pool checkpoint waits for
both waves; the boss requires earlier encounters cleared. Restarting before victory rebuilds the closed seal
and boss fight.

## Verification and remaining review

The human idle and walking poses were rendered and visually inspected in Blender, showing relaxed arms and
alternating leg motion. Those renders are local Blender previews, not browser screenshots or an in-game quality
verdict. Preview files are `E:\hindan\cave-demoness-work\rig-rebuild\soul-idle-preview.png` and
`soul-walk-preview.png` in the same directory. `preview-motion.py` there samples four phases of a named GLB clip.

Three focused soul tests execute the actual story schedule, Character/CharacterRig animation, Extra grounding,
Staging motion and GLBLevel collision construction against the shipped cave and human GLBs. They verify wall
fade timing, sufficient walking time before settlement, floor following, normal walk playback, calm idle after
arrival, fighter/steep-surface/overhead safeguards and unchanged hovering-shade defaults. The measured route had
232 walking frames, minimum effective walk rate **0.77818**, maximum floor error **1.91e-7 m**, and arrived at
`(1.67619, -2.11000, -74.54158)` within Staging's 8 cm arrival tolerance, then played idle. The essential cue
settles the exact mark. These are geometry and runtime logic checks; they do not measure human animation feel.

Final checks passed: TypeScript, Vite build, asset URL validation, 13 cave/soul tests, 35 non-network duel tests
and three WebSocket integration tests run outside the sandbox: **51 tests total**. The earlier combat pass's
build/regression evidence is recorded separately below.

```powershell
node --experimental-vm-modules --test scripts/island-soul.test.mjs scripts/island-demoness.test.mjs
npx tsc --noEmit
```

Start Vite, then select Chapter III or run `await __debug.chapter(3, false)`. Play the hall, pool and final
chamber; test death/retry and skip the soul scene once. `__debug.win()` bypasses the expedition goal and is not
an encounter-sequence test. Browser access was denied, so a full browser playthrough, camera/collision review,
defence feel, campaign bot comparison and assessment of final visual quality remain unverified.

## Combat correction — 2026-10-10

The first playtest reported bad axe/combat behaviour. Inspection found discontinuous attack entry/exit poses,
spin during the entire throw state, a hit segment along the handle instead of the curved cutting head, and
short-range attacks selected at almost six metres. The new `ChainAxeMotion.ts` keeps pose keys and strike
windows together. Each attack starts and ends at the animated hand. Close attacks alternate below 3.1 m;
farther away she throws. Reach is captured at attack entry, capped at 4.8 m, and tracking ends at 0.35 seconds.
Interrupted attacks recall over 0.4 seconds instead of teleporting. The decorative tether disappears when held.
The supplied axe's grip is placed at local source (0.1, 0.72, 0); damage endpoints follow its curved head.

Wall handling uses real Rapier sphere sweeps along the tether and from the previous head position. It excludes
fighter bodies and sensors. A collision cancels further damage for that attack, with a fresh attack clearing
the latch. This is conservative collision for a rigid axe, not a physical chain wrapping around pillars.

TypeScript, Vite and all 48 duel/encounter regression tests pass. Ten targeted tests include production pose/contact sampling at 60 Hz, both close attack choices at
1.65/2.5/3.1 m, throws at 4/4.8 m, interruption recall, real Rapier wall/fighter/sensor cases, and all three attacks
at the boss spawn against the shipped cave collision meshes. The tests also retain encounter progression,
retry/skip and rig-export checks. These are automated geometry and logic measurements, not a human feel verdict.

Choices to review in play: harmless return, 2.1-second attack interval and 4.8 m maximum range. Refresh the game
and start chapter III again so the existing boss instance is rebuilt. The procedural body rig, cave presentation
and soul animation still need a visual pass; no model or animation asset was changed in this combat correction.

## Audit and rework — 2026-10-11

A three-batch multi-agent pass (audit, fix, verify) against four goals: a God of War-style chained axe with a fiery trail,
a cohesive scene, an ethereal soul who walks gracefully, and a cinematic unlock. Reports, proofs, frame captures and the
reusable capture script are under `E:\hindan\game asset\audit\cave-demoness\` (outside the repo).

**Axe** (`ChainAxeMotion.ts`, `AxeBody.ts`, `AxeChain.ts`, `AxeFX.ts`, `SlashRibbon` `fire` kind, `BossIslandDemoness.ts`):
continuous curved paths with a 0.42–0.45 s body-carried wind-up (procedural torso twist up to 34°, lean, reared forelegs
on the slam, lunge on the throw), a 100–110 ms apex hold, and whip-outs peaking at 24–28 m/s with no mid-stroke dip. The
chain lags, arcs, goes taut and heats toward the blade. A 0.42 s fire ribbon with embers, stone/wall/hero impact bursts,
`axe*` ImpactCamera kinds, and five timed sounds (whoosh, rattle, crack, stone hit, return snap). Damage windows open
after the whip-out and close before the recall; the 140 ms parry and the guard remain achievable. The axe and chain are
interpolated per rendered frame through `Character.renderUpdate/renderRestore` (simulation unchanged).

**Spider asset:** the pale slivers along her silhouette were custom normals scrambled by the build's seam weld; the build
now restores the supplied normals, and `rim.albedo` keeps dark flaps dark. Textures are WebP (2048/1024/512): 10.88 →
2.99 MB. Feet are levelled to within 1 cm. The axe is 2.56 → 0.82 MB.

**Soul** (`Extra.ts`, `RadiantShade.ts`, `scripts/prepare-island-soul.py`, `island_soul_skin.py`, `island_soul_walk.py`):
skirt reweighted (worst hem stretch 37 → 6 cm, no fins), soles grounded, the Meshy walk refined to 109 steps/min with a
0.82 stride and relaxed arms, at a true 1.23 m/s and 1.0x playback. Opt-in `shade.graceful` staging eases starts and
stops, turns before walking and damps step-ups; opt-in `shade.radiant` renders her opaque moonlit silver and pale gold
with a rim, halo, motes and one follow light (created with the chapter at zero intensity, so the light count is constant).

**Unlock and chamber** (`ShrineSeal.ts`, `Level5_Island.ts`, `stories/Island.ts`): the boss chamber is lit by lamp stands,
diyas and a fill (mean luma about 30/255, was 6). The seal is an arched gate in the cave's own stone, carved with a Sri
Yantra (bindu with ॐ, interlocking triangles, 8 and 16 lotus petals, a bhupura with four gates) and the bija mantras
ॐ ह्रीं श्रीं क्लीं ऐं in Devanagari. Opening, about 2.8 s: mantras ignite with chimes, rumble and tremor with dust, a web of
light cracks, the doors split and slide aside with debris, then a cyan-to-amber flood with shafts and motes and a
resonant bloom. The soul rises in the chamber clear of the corpse and the hero, is framed throughout, reaches the seal at
about 7.6 s and the altar mark at about 13.6 s with no settle snap (a 176-case sweep covers far corpses and 180° turns).
The release scene is 17.7 s. `chapter-start` re-arms the seal, its collider, the debris, the mace and its lamp.
`island_shrine_voice_2` plays as the doors part. *(2026-10-12: the scene is now 24.5 s and voiced by the apsara; see the
last section.)*

**Engine-wide fixes found on the way:** `HitReact` compares quaternions with a float32-safe tolerance (a flinch could stick
on bones a clip never rewrites); the follow camera swings round the hero when its arm collapses into rock (unchanged
elsewhere); `disposeObject` disposes InstancedMesh; the duel menu disables online play when no relay is configured, and
duel code is lazy-loaded.

Checks: TypeScript, build, 32 island/soul tests and 38 duel tests pass. Still to judge in real-time play: the
synthesized sounds, the feel of the faster strikes (first touch now 0.70–0.85 s after the attack starts), and the
provisional combat values above.

## The swing, rigged — 2026-10-12

Playtest verdict on the 2026-10-11 axe: the fire and FX were right, the swing was not. Measured on the real rig (a
frame-stepped in-game capture plus per-step bone samples), the old choreography flew the axe out of her hand on its chain
from the first frames of the draw while her arm, locked straight by IK targets up to 30 cm out of reach, waved an open
hand; the axe sat at a fixed boss-local angle (24-51° off in the fist after a catch), the wrist never moved, the slam's
elbow bent backwards for 13 frames and flipped twice, the sweep's recall passed through her torso and head, every attack
popped at entry, and the body segments peaked out of order or all at once. This rework changes only the motion: the
fire trail, heat, FX, damage windows, reach and the 2.1 s cadence are as they were (the strike stops at the same times).

**The axe in her fist** (`ChainAxeMotion.ts`, `BossIslandDemoness.ts`). The axe is placed from `Socket_Hand_R` every step,
position and rotation (`GRIP`: a hammer grip, the haft across the palm and out past the thumb, the edge where the knuckles
point), so it moves with her hand and never slides in it. It stays there through the draw and the coil, leaves her fist
at the whip-out (the strike curve now starts where her grip is then, from rest, so hand and axe part without a jump),
turns into line with the chain over 0.2 s, and on the recall lands in her fist at `home` and stays (no more overshoot
through the palm: the axe's momentum is taken by her arm, a 0.14 m give and return over 0.4 s). With no rig yet, the
hand is where the arm keys put it.

**The arm** (`AxeBody.ts`). Per attack, keyed in boss-local metres: the grip, the wrist (deviation, flexion, roll, in
degrees from the rig's relaxed hand: cocked back with radial deviation and extension on the draw, snapped through with
ulnar deviation and flexion on the throw, the dart-thrower's path a hammer swing takes), and the left wrist. At rest she
holds the axe out at her right side (see the fix round below), carried with her chest through idle, walk and flinches. The solve each step:
- the clavicle (`Shoulder_R`) shrugs toward a target above the shoulder or past the arm's length (up to 24°);
- a two-bone IK that bends the elbow about its own hinge, swings the arm onto the target, then turns it about the reach
  until the elbow faces its pole (fixed in the chest): no arc-to-arc rotation, so no flips. It eases short of a straight
  arm (from 90% of its length) and never folds tighter than a third of it;
- the wrist from the keyed angles, held to anatomy (radial 20°, ulnar 35°, extension 65°, flexion 70°, at most 68° off
  the forearm's line, continuously), its roll split half and half with the forearm (no twist bones in this rig);
- three passes so the grip, not the wrist, lands on the target; the left arm swings against the right on its own keys;
- the hips run 0.06 s ahead of the chest; the neck and head take back most of the twist and lean (eyes on the hero).

Body and arm keys are clamped cubic splines (they leave the first key and reach the last at rest, and their acceleration is
continuous through every key; the heat keeps its Catmull-Rom). An attack that ends or is broken off is dead-blended: every
layer and both arms' weights carry on at the speed they had, that speed dying away, faded out over 0.25 s; death lets the
arm go back to the clip the same way.

**Measured** with the swing tester's harness (`slots/swing/tools/swing-metrics.mjs`, unchanged thresholds) on in-game
captures of this branch: 90 of 92 checks pass (the 2026-10-11 code: 58 of 92). Grip gap 0 mm and drift 0° while held, no
backwards elbow, no flips, elbow never under 42° inside, wrist at most 68°, forearm roll at most 532°/s, no wrist target
out of reach, no torso or head penetration, kinetic chain in order on all three blows (pelvis to hand 108-234 ms). The two
left: a one-frame stall of her root while she walks after the throw (her movement, not the swing), and the impact clip's
own linear crossfade when a sweep is parried (3.0 and 3.9 deg/frame³ against a 3 limit).

Tests (`scripts/island-demoness.test.mjs`, 38 island tests): the earlier axe tests follow the new design (in her fist
through the draw, caught and kept; the whip-out's travel speed; the tip's peak band widened to 31 m/s because the blade
now turns about a moving hand), and five new ones run the boss on the shipped rig and clips: grip on the socket within a
centimetre and unturned while held; no backwards, flipping or folded elbow and the wrist within 70°, targets in reach, also
when deflected or killed; no pops by the tester's spike rule at entry, release, catch and exit; interruptions no harsher than
the swing itself and fully eased out in 0.25 s; hips, chest, upper arm, forearm and hand peaking in that order; and the
chest calibration the rest hold uses matches the GLB.

Known limits: the hand has no finger bones (one skinned `Hand_R`), so her fist cannot close round the haft or open at the
release; the haft sits across the palm of the modelled claw. A rebuild of the spider GLB with finger chains would allow both
(`CharacterRig` already drives `hand_*` finger poses). The parry and death flinches carry the clip crossfade's own kink.

### Fix round — 2026-10-12

The independent tester and the orchestrator, looking at the captures, found what the metrics did not:
- **The blade covered her face from the front**: the hero's view, at every catch, at rest, and in the slam's raise.
  - The rest hold and every catch are now out at her right side and a little back: the haft up and out, the blade forward. The
    slam is raised by her side, and its overhead coil sits over her right shoulder rather than over her head.
  - The sweep's recall comes home low across her front (under her chest). The throw's comes round her right.
  - The returning blade turns into her grip only over the last part of the recall, so it is not swung across her on the way in.
- **The throw's catch snapped**: the axe arrived at about 16 m/s and stopped in one step (11 m/s).
  - The recall is now braked into her fist: `x^2 (1 + 2 (1 - x))`, with no speed at either end. Its arc off the line has no
    speed at either end either, and the sweep's recall is 60 ms longer.
  - Her hand gives 0.15 m along the way the axe comes in, starting 0.1 s before it lands, and the keys carry her on to her rest
    hold from there.
  - The throw's recall is lifted off the floor (less drop, an arc up and out to her right, and a tauter hauled chain).
- **Sitting on limits**: the wrist keys now keep it under about 57° off the forearm (the 68° clamp was reached for 23 frames).
  The sweep's torso clearance went from 0.08 m to about 0.2 m.
- **The flinch cross-fade**: a swing that ends or breaks off has its bones (the ones the layers move) ride a critically damped
  spring (28/s) over the clip's linear cross-fade. They are let go between 0.2 and 0.45 s. In death the arm lets the axe go over
  0.42 s, and the layers are dropped at 0.47 s.
- **Spider back**: checked by a mesh test against the ellipsoid through her abdomen skin. The axe stays more than 1.2 radii out.
  There was no overlap: the earlier frames showed the blade in front of the spider body, not through it.

New tests:
- In her fist, no blade point falls inside her head (0.3 m) or chest (0.24 m) outline from the tester's front arm camera or the
  game camera. In or coming into her fist, the blade stays at least 0.35 m out from the line through her face and chest.
- The recall changes speed by less than 5 m/s per step, lands under 4 m/s, and her hand is giving as it lands.
- The axe stays outside the spider back's ellipsoid.
- The wrist stays at or under 60°.

The 41 island tests pass.

Still the case: in flight, the strike itself (the slam's overhead arc) and the haul home pass in front of her for a few
frames. Only the held axe and the catch are kept clear.

## The apsara — 2026-10-12

The released soul is the **apsara queen** bound inside the demoness (whose human body the spider wears). She is voiced
(ElevenLabs "Aakancha", unOLncGEZHyisV6yF1a5, flow YsZ801z0kT6TtHcbava6; lines `island_soul_0..5`, texts in STORY.md,
"Chapter III lines") and replaces the old man's "voice in the shrine", whose four files went to
`game asset/voice/retired/`. Her entry is scored by `apsara`, an 8 s one-shot (`music/apsara.mp3`, `ONE_SHOT`,
`TRACK_GAIN` 1.25).

**The reveal** (`island-demoness-reveal`): her whisper from inside the demoness, "Free me", echoing, over the existing
3 s push and a second, closer 3.6 s shot on the demoness's face (it was a beat at `z < -63`, which the reveal cut off within
a step). The reveal also builds the release's light (dark, its shaders compiled) and fetches `apsara`.

**The release** (`island-soul-release`, 24.5 s; scene seconds):
- **Her fall, 0-1.6.** The boss music is let go over 0.7 s (`Music.play` `fadeOut`) as `apsara` starts; `then('island')`
  hands over to the island loop when it ends (8 s). The soul is placed, out of sight, beside the corpse (`soulSpawn`),
  facing away from the body and turned up to 57° toward the hero (`formFacing`), head bowed (`Extra.bow`).
- **The light leaves her, 1.6-3.4.** Gold motes seep up off the body (a third from the woman's torso) and spiral slowly
  into a column of soft light where she will stand; her own follow light is lit there first (`Extra.kindle`, so the
  light count never changes). The picture darkens at the edges and drains a little (the concussion pass: `dark` 0.42,
  `desat` 0.2), and the corpse darkens to ash over 2.8 s (colours only; it never vanishes). Camera: square to the light on
  the chamber's open side, the column in the middle and the body coming in from the side.
- **She forms, 3.4-5.8.** She dissolves in from her feet over 1.6 s as the motes go into her and the column fades into
  her; a crane from her knees to her face, three-quarters from the front on the side away from the hero. She lifts her
  head (4.6-5.5) and turns to him (5.3).
- **She speaks, 5.8-9.1.** Over his shoulder (the one away from the body): "The binding is broken... Follow me,
  Yudhveer." (5.95-9.71), as the music decays. The music dims under the rest of the scene from 8.2.
- **She sets off, 9.1-10.8.** On "Follow me" she turns from him and walks toward a low camera on her way to the seal,
  him behind her.
- **At the seal, 10.8-15.7** (SEAL_AT 3.5, then the split): "Behind this stone... the lamps still burn." (11.0-15.2);
  `open-shrine` at 14.3 (essential). **Through it, 15.7-18.3**: "Come. It has waited a long time for you." (16.7-20.1,
  carried). **The lit shrine, 18.3-24.5**, as before (an essential cue there ends the light of her release at once if the
  scene was skipped; her settlement at 21.7).

In the ending she turns from the altar to the hero as he comes ("Lift it... if you do not lift it for yourself."), and
sends him on to Dwarka in her voice.

Code: `src/game/stories/Island.ts` (the scene, `formFacing`, `clearOf`: every new camera is pulled in short of rock along
the line to its subject), `src/cinematics/DivineLight.ts` (`soulRelease`: column, pool, 256 motes on closed-form spiral
paths in preallocated arrays, the grade, the ash), `src/entities/Extra.ts` (`bow`: head, neck and upper chest turned
about the line of her shoulders over the clip's pose, kept from the clip's own pose because the mixer does not rewrite
a bone whose value has not changed; `kindle`), `src/entities/RadiantShade.ts` (the kindled light), `src/combat/SoundFX.ts`
(`apsara`, `fadeOut`, and `then` waiting for a one-shot still loading).

Tests (`scripts/island-soul.test.mjs`, 44 island tests): every voiced line of the reveal and the release ends inside its
shot or the shots it is carried over and never runs into the next (durations by ffprobe); her six lines are hers and no old
voice is left; the bow goes forward the way she faces, holds without building up and lifts back exactly, on the shipped
rig; the music hands over (the boss let go in 0.7 s, the piece once, then the island loop; `then` waits for a piece still
loading; a skip crossfades); and the 176-case spawn sweep now also checks that the new shots' cameras see their subject
through no rock.

Checked in-game with the capture slot (`slots/apsara`, runs `v1`..`final`, shots `S1a_reveal_cutscene` and
`S7_release_full`). Known limits: the demoness's death clip leaves her slumped but upright, so the corpse is a dark husk
beside the soul rather than a heap; the capture has no audio, so the music and voices were laid in afterwards from the
logged scene clock (`video/S7_release_full_audio.mp4`) without the ambience or effects; the music only stays in step
with the picture if it was fetched before her death (it is, at the reveal).

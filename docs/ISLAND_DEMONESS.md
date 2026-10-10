# Island demoness â€” encounter and rig review

The hall fight is unchanged. The pool contains the former final encounter's two hurlers, four runts and two
rear reinforcements. Once both waves clear, the final chamber starts the Spider Demoness fight. Her released
human soul stands calmly, walks to the rock seal, opens it and walks beside the altar. The original ghee/fire
dressing, altar, mace pickup, voice files and chapter ending remain intact. The existing cave GLB is divided by
a separately owned, removable rock curtain; the cave itself was not rebuilt.

Work is on the `cave-demoness` review branch. This rig pass has not been deployed.

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

The integrated human GLB is 4,016,032 bytes, 30,658 triangles, with 24 skin joints, an 8.3333 s calm idle and a
1.033333 s walk. It keeps the original mesh appearance; embedded textures range from 1024 to 2048 pixels. The
manifest records the walk at 1.6184 m/s. `ISLAND_SOUL` maps IDLE/REST to idle and WALK/MOVE/SPRINT to the actual
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
assets. The final spider hash is `736ff07ca29ca9ac09f46a3ee8985d9b372ba4271f27eb12d1ad181fb9f02aa9`. Its audit found
39 joints, 22,076 weighted vertices with at most four influences, exact loop endpoints, and eight feet within
3 mm of the authored 0.045 m foot target. Stance residual after engine forward motion is 1â€“4 cm. Blender walk,
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
recipe for the 2,560,068-byte axe export; running it must not replace the reviewed human or spider outputs.

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

## Combat correction â€” 2026-10-10

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

# Island demoness — encounter prototype

The hall fight is unchanged. The pool now contains the former final encounter's two hurlers, four runts and two
rear reinforcements. Once both waves clear, the final chamber starts the Spider Demoness fight. Her human soul
appears after her death, leads to the rock seal, opens it in a cold flash and floats beside the altar. The original
ghee/fire dressing, altar, mace pickup and chapter ending remain intact. No cave GLB was rebuilt: this pass divides
the existing last chamber with a separately owned, removable rock curtain.

Work is on `cave-demoness`, branched from the verified PvP head `170cef7`. Nothing has been merged or deployed.

## Assets and animation

The user supplied `E:\hindan\spider demon.glb`, `human form of spider.glb` and `spider chain axe.glb`. They contained
no skeletons or animation. Source files are untouched; hashes are in ISLAND_DEMONESS_SOURCES.json. Origin/license
details beyond user supply have not been established; no third-party license is asserted and no provider job ran.

Blender 5.2.2 built geometric prototype skins and seven clips for each character: idle, move, three attacks,
impact and death. The demoness has root, torso, head, arm and six spider-leg bones. The human floats as a soul;
this is not a finished human walking cycle. Geometric skin weights and the arm/body attack poses need visual
refinement. A Blender render of idle and attack poses was inspected; this is not browser rendering evidence.

Working exports are 3.97 MB (demoness), 5.16 MB (human) and 2.56 MB (axe), versus approximately 144 MB of supplied
GLBs combined. Textures are reduced to a maximum of 1024 pixels; triangle counts remain 27,664 / 30,658 / 3,144.
The browser uses the existing toon and ghost materials. No files under `game asset/` were modified.

Rebuild working copies, with Blender's executable on PATH or its absolute path:

```powershell
blender -b --python scripts/build-island-demoness.py -- --source E:\hindan --output E:\hindan\cave-demoness-work\prepared
```

The script writes only its output directory. Copy the two character GLBs/manifests into public/assets/characters,
and the axe GLB into public/assets/weapons after inspection. It recreates exports from the original inputs.

## Combat and scene choices

One axe travels on authored local paths: a broad horizontal sweep, overhead slam, and straight throw with a
harmless return and a punish window. Up to 128 instanced alternating metal links connect the
animated hand to the axe; the links are visual, without physics or damage. The supplied weapon also has its own
short ornamental chain. The blade uses the existing swept intersection and campaign defence resolver. The axe
now sweeps a conservative head sphere against static scenery; a rock contact cancels that attack's remaining
damage and recalls the axe. Final body-to-weapon choreography remains unfinished.

Provisional values: 480 health, 130 posture, 0.65 enemy damage scale, 2.3 m/s movement, 2.1 seconds between attacks,
and 4.8 m engagement range. She has no added guard or magical attack in this pass. No human balance measurement supports
these numbers yet. The release scene's two new lines are subtitles; no voice files were created or replaced.

The pool checkpoint waits for the main pack and rear wave. The boss requires all previous encounters cleared.
The wall cue is essential, so a skipped or previously seen release scene still removes its collider and leaves
the soul visible near the original altar. Restarting before victory rebuilds the closed seal and the boss fight.

## Verification and trying it

TypeScript, Vite build and asset URL validation pass. Ten targeted tests execute production code: encounter
prerequisites/goal, checkpoint ordering, swept axe contacts, rig clips/durations, gate removal/retry, skipped scene
settlement, and downward rays at every encounter/checkpoint position against the shipped cave geometry.

```powershell
node --experimental-vm-modules --test scripts/island-demoness.test.mjs
```

Start the Vite dev server, then use the chapter menu or the development console:

```js
await __debug.chapter(3, false)
```

Play the hall, pool and final chamber. Test death/retry during the pool rear wave and boss fight, and skip the soul
scene once. The mace room should open in either case. `__debug.win()` bypasses the expedition goal and is not a
test of this sequence. For a hidden Browser pane, stop the normal loop and use debugAdvance as documented in PVP.md.

Browser access was previously denied. A full browser playthrough, camera/collision review, defence feel and
campaign before/after bot runs remain unverified. This is a first wiring prototype ready for review, not a claim
of polished chained-weapon animation or final difficulty.

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

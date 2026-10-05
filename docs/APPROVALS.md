# Waiting for approval

Things that need the user's say-so before they go further: credit spends, downloads, new voice lines, and choices
between options. Each entry says what it is, what it costs, and what happens on a yes. Nothing here has been spent or
downloaded yet.

## Andhaka's crowning line (2026-10-05): APPROVED, DONE

**Decision:** "go with A - let the gods see their new ruler". The line is now "Burn, Agni. Let the gods see their new
ruler." (voice id `summit_crown_andhaka_1`, ElevenLabs flow hNijKdjbfXylpNQQdcpK; take A 4.96 s in the game, levelled to
-18 LUFS; take B 5.44 s kept in `game asset/voice/takes/`). It starts 1.75 s before the crown settles so it fits
between the crown and his roar (docs/STORY.md, "Andhaka's model and entrance"). The proposal as it was:

As the crown settles on his head the Agni beacon takes fire (docs/STORY.md, "Andhaka's model and entrance", shot 5).
He speaks one line there, tying the crown to the fire. It is in the game now as a subtitle only (`CROWNING_LINE` in
`src/cinematics/Intros.ts`, no `voice` id). The options, in his voice (Roderich, Crude & Ruthless,
`game asset/voice/VOICES.md`):

| | Line | Characters | To record (2 takes) |
|---|---|---|---|
| **A (picked, in the game)** | Burn, Agni. Let the gods see their king. | 40 | about 96 credits |
| B | Fire for the crown. Ash for the boy. | 36 | about 86 credits |
| C | Let it burn. Let Shiva see who sits on his mountain now. | 56 | about 134 credits |

Why A: he commands the fire god like a servant and lights the beacon as a proclamation to heaven. "Their king" is his
arrogance, and it sets up the ending, where Shiva himself answers. B is the cruelest and is aimed at the boy, but it
says less about the beacon. C names Shiva and so gives away the irony before the ending does.

Cost: about 1.2 ElevenLabs credits per character per take, 2 takes (the usual workflow: two takes, loudnorm to -18
LUFS). On a yes: record the chosen line as `summit_andhaka_crowned`, add `voice: 'summit_andhaka_crowned'` to
`CROWNING_LINE`, drop its `hold` (the recording sets the length), and list it in STORY.md's Chapter V lines.


## Dwarka's rain: a recorded rain bed (option, costs credits, not generated): DECLINED

**Decision:** "current is good enough". The synthesized rain stays; nothing generated. The proposal as it was:

Chapter IV now plays in a storm (docs/STORY.md, "Dwarka in the rain"). Its rain, thunder and splashes are synthesized
(filtered noise, no credits) and work. A recording would make the steady downpour sound more like real rain on stone
and sea; the thunder and splashes are fine synthesized. If wanted, ElevenLabs Sound Effects, two takes each:

| Sound | Prompt | Length |
|---|---|---|
| `amb_dwarka_rain` (a loop) | Steady heavy rain on wet stone paving and open sea, close patter of drops on stone and puddles, soft wind gusts, distant surf, no thunder, no music, seamless loop | 22 s |
| `amb_dwarka_thunder` | Distant thunder rolling over the sea, a soft crack far away then a long low rumble fading out, no rain | 8 s |

Estimated cost: about 40 credits per second with the duration set, so (22 + 8) s x 2 takes is about **2,400
credits** (check the rate shown in the account before generating). On a yes: generate both, the user picks a take
each, loudnorm to -18 LUFS, put them in public/assets/sfx, and the `'dwarka'` ambience loops the rain under the
synthesized patter (dropping the synthesized hiss layers) and plays the thunder recording in place of the synth.

## Victory sound: which of the two (no cost): APPROVED, `ghanta`

**Decision:** keep the temple bell (`ghanta`, the default); no change to `VICTORY_STINGER`, and no recorded stinger.
The proposal as it was:

"The sfx when player wins is too childish." The old one was a C-major arpeggio of four pure sine tones (C4 E4 G4 C5,
0.14 s apart, 2.4 s), a bright music-box chime. It is replaced by two synthesized stingers (no credits; `SoundFX.ts`,
`VICTORY_STINGER`), each in three weights: a chapter of waves, a boss felled, and the last victory (Andhaka on the
summit). The music dips under it (to 40 %) and comes back as the bell rings out.

- **`ghanta` (default):** one deep drum stroke and a great bronze temple bell struck with it, ringing long (its hum an
  octave below, its minor third and fifth, each partial a slowly beating pair, the clapper's knock); for a boss the
  bell is struck again, softer, 1.75 s later; under it a low drone that settles from Pa to Sa. The last victory adds a
  lone drum stroke before the strike and a low conch under the ring. Energy mostly 80-250 Hz (centroid ~150 Hz),
  peak about -1.5 dBFS before the master compressor, audible for ~5-6 s.
- **`shankha`:** two drum strokes (dha ... DHUM; three for the last), then a low conch blown long (rising into its
  note, held 2.2-3.6 s, sagging as the breath gives out) over a drone, and a small temple bell as it dies. More
  ceremonial; brighter (centroid ~230 Hz in the held part).

To hear them in a dev build (after a click so audio is running): `__debug.victory('boss', 'ghanta')`,
`__debug.victory('final', 'shankha')`, and so on. **On a yes to `shankha`:** change `VICTORY_STINGER` in
`src/combat/SoundFX.ts`. Nothing else changes.

**Option, costs credits (not generated):** a recorded stinger from ElevenLabs Sound Effects, if the synth is not
enough. Prompts (duration set to 6 s, prompt influence ~0.5), two takes each as with the voices:

1. `victory_ghanta`: "A single strike of a huge ancient bronze temple bell in a stone mountain shrine, deep and dark,
   long shimmering decay, with one low ceremonial drum hit at the same moment, solemn, no melody, cinematic"
2. `victory_shankha`: "A low conch shell horn blown once, long and mournful, rising into its note, over a single deep
   dhol drum stroke, a small brass temple bell at the end, solemn Indian temple, dark, cinematic, no melody"
3. `victory_final`: "Ancient Indian temple at night after a great battle: three slow deep war drum strokes, a huge
   bronze bell struck once, a long low conch call over it, reverberating across mountains, solemn and weighty"

Estimated cost: about 40 credits per second of audio with the duration set, so 6 s x 2 takes x 3 prompts is about
**1,440 credits** (check the rate shown in the ElevenLabs account before generating). On a yes: generate, the user
picks a take each, they go to `public/assets/sfx/` and `playLevelClear` plays them (the synth kept as the fallback,
as with every other effect).

## Blood: APPROVED, DONE (option A with B's hurt pulse, Gore default Low)

**Decision:** "i'll go with your recommendation on blood". Live now: toon ink sprays scaled by damage, splats laid on the
real ground (rays down to the level's colliders, turned to the slope, shrunk or left out at a step's edge) that dry
away, washing out faster in Dwarka's rain; colours per enemy as below; the dark-red hurt pulse at the screen's edge on a
hard blow; a Gore option (Off / Low / Full, Low by default) in the Settings menu, saved with the other settings; no blood
in story scenes unless a cue asks. Weapon stains not built (decide after playing). Details in docs/STORY.md, "The
victory sound, and blood". The proposal as it was:

"There needs to be some blood effect also." Three approaches, from lightest to heaviest:

**A. Toon blood sprays and ground splats (recommended; prototype built).** On a landed blow, hard-edged dark ink drops
spray off along the blade's line (away from the attacker), more and faster for more damage and on a killing blow;
at Full a splat lands on the ground beyond the victim (1, or 2 on a kill), spreads in over a quarter second, lies
7 s, then dries away from its edges. Drops are flat discs with a darker rim and no glow (normal blending), splats a
cut-out shape with a hard edge: it reads like the ink outlines and flat shading of the rest of the game, not like
realistic gore. The red sparks of a flesh blow give way to it (a charged blow keeps its gold sparks; parries,
blocks and glancing blows are unchanged).
- *Perf:* two draw calls in all, whatever is on screen (one `Points` for up to 400 drops, one `InstancedMesh` for
  up to 32 splats); fixed buffers, rewritten each frame like the existing sparks, dust and flames (one draw call
  each), the same cost class as what is already there.
- *Effort:* done as a prototype (`src/combat/BloodFX.ts`, ~300 lines). For release: a gore option in Settings and the
  options menu, splats laid on the real ground (a downward ray; today they sit at the victim's feet height, so on a
  slope or a step they can float or sink a little), and a final pass on colours per level lighting.

**B. Hurt vignette and weapon stains.** A dark-red pulse at the screen's edge when the hero takes a heavy blow (the
HUD already flashes on `onPlayerHurt`), and blood building up on the blade over a fight (a decal or a tint ramp on the
weapon's material), wiped when sheathed. Perf: one full-screen pass already exists for the vignette; the stain is a
uniform per weapon. Effort: about a day; the stain needs each weapon's UVs checked. Good alongside A, weak alone.

**C. Wounds on bodies and dismemberment.** Decals projected onto the skinned characters, severed limbs. Perf: decals
on skinned meshes need their own skinning (a draw call per wound) and the rigs were not built for it. Effort: weeks.
Does not fit the tone (mythic, grounded, not splatter) or the cel look. Not recommended.

**Who bleeds what** (`Enemy.blood`): men and the hero, rakshasas, asuras and Andhaka: dark red (#2a0303 to #520909).
Takshaka and the island's cave creatures: a green-black ichor (#0a1207 to #1f2c12). The Vetala (a ghost riding a
corpse): no blood, a puff of grey grave-ash that rises and drifts, and no splat. The old vanara (sparring, his
teacher): nothing.

**Gore setting:** Off / Low / Full (`GoreLevel`), for ratings and taste. Low: fewer, smaller drops and no splats.
Full: as above. A rating board looks for exactly this switch; Off should leave only the sparks the game has today.

**Recommendation:** A, with B's hurt vignette, the setting defaulting to Low (Full one click away). Then decide
weapon stains after playing with it.

**The prototype** is in the build but **off** (`BLOOD_DEFAULT = 'off'` in `src/combat/BloodFX.ts`), so nothing
changes until a yes. In a dev build: `__debug.blood(true)` (Full), `__debug.blood('low')`, `__debug.blood(false)`.
Screenshots (summit, rakshasas; the colour of the second and third set was forced on the same rakshasa to show it):
- `E:\hindan\game asset\previews\blood_full_red_spray.jpg` (Full, a spray just after the blow)
- `E:\hindan\game asset\previews\blood_full_red_kill.jpg` (Full, splats after a killing blow, and the hero's own)
- `E:\hindan\game asset\previews\blood_full_red_ground.jpg` (Full, two light blows)
- `E:\hindan\game asset\previews\blood_low_red_spray.jpg` (Low)
- `E:\hindan\game asset\previews\blood_full_ichor_spray.jpg`, `blood_full_ichor_ground.jpg` (ichor)
- `E:\hindan\game asset\previews\blood_ash_spray.jpg` (the Vetala's ash)

On a yes: set the default (Low recommended), add the Gore option to the options menu and `Settings`, ground the
splats with a ray, and build the hurt vignette if wanted.

## Dialogue pass: rewrites of the weakest lines (proposal, costs credits on a yes, nothing recorded)

"Some dialogues are too AI slop and hamper the narrative." Every line was reviewed (91 spoken, plus 53 card, callout,
epithet and hint texts). 37 are flagged, with 1-2 rewrites each, in **docs/proposals/DIALOGUE.md**. The 15 most
damaging come first: Shiva's two lines and the guru's summit lines, Andhaka's prologue line (it gives away Dwarka's
reveal), the island's worthiness exchange, Shalva's exposition, the Guardian, Takshaka's "born to end his reign".

| Tier | Voiced lines | Characters | To record (2 takes) |
|---|---|---|---|
| 1 (climax, island, prologue) | 7 | 492 | about 1,180 credits |
| 2 (Dwarka, baoli) | 7 | 621 | about 1,490 credits |
| 3 (optional, akhada) | 2 | 139 | about 335 credits |
| **All** | **16** | **1,252** | **about 3,005 credits** (about 3,580 with direction tags) |

Free: one cut (`summit_end_guru_4`), two trims of existing takes, 9 subtitle changes, 9 card or epithet changes. On a
yes (per line or per tier): change the texts, trim, record the picked lines with the usual workflow, and update the
STORY.md tables. The prologue lines wait for the prologue ending's restaging.

## The island cave: new 3D assets (DONE 2026-10-05: Sketchfab + Poly Haven, no Meshy)

"The cave needs better 3d assets." The cave is 31k triangles, and its props are about 2k triangles of code
primitives. **docs/proposals/CAVE_ASSETS.md** proposes 14 asset groups (a rock wall kit, stalagmites, skeletons,
Indian weapons, the shrine's torana, altar and deepastambhas, braziers, diya niches, torches, a nagakal and broken
idol, the boat and rope, rubble, offerings). Each has a placement, a triangle budget, a Meshy prompt and 2-3
Sketchfab candidates (38 models: 35 CC-BY, 2 CC0, 1 Sketchfab Standard, all downloadable).

- **Meshy (recommended: the 8 Indian-specific and hero pieces, meshy-7, 2 options each at about 30 credits):**
  about **480 credits** (+ about 6-12 for the torana's concept image); about 730 with the 4 optional items.
- **Sketchfab (recommended: 15 free downloads, for the generic rock, bones, torches and rubble):** 14 need a credit
  line (listed in the doc), and the user downloads them (a login is needed).
- Result: about 180-220k triangles for the level, a GLB of about 6-9 MB (the other levels are 10-13 MB).

On a yes: check the Meshy balance, generate (reading each result in Blender before the next), the user downloads the
Sketchfab picks, then decimate, retint and place them through `build_island.py` in place of the primitives, with
colliders, lamps and marks unchanged.

**Approved and done (2026-10-05).** The user: "don't use meshy for cave assets, get as many as you think are necessary
from sketchfab, i've given you mcp access, cite them properly use poly haven for decent cave stone textures". No Meshy
credits spent. 25 Sketchfab models downloaded (the user's signed-in session; no Sketchfab MCP was available), 23 used
(22 CC BY 4.0, 1 CC0), plus 3 Poly Haven textures (CC0); every one credited in the credits roll, docs/ASSET_CREDITS.md
and `game asset/README.md`. The level is 7.5 MB (was 1.2 MB). Nothing is blocked; no terms or consents were accepted.

Left for a later pass (code-built still, nothing suitable or licensable found, or worth Meshy on a later yes): the
boat's cane canopy and pole, the landing's lantern post, the dais and altar (code-built, now textured stone with a
carved relief), the wall shelves, the dried flowers, the eyes. The torana is a Sanchi-style (Buddhist) gateway: the
right form, but its carvings are Buddhist; a Hindu torana would need Meshy or a better find. The ending's two camera
keys behind the altar moved 1 m forward so they stand in front of the new torana (`src/game/stories/Island.ts`).

## The village: Sketchfab props and villagers (blocked: a Sketchfab sign-in in the Browser pane)

The village's dressing and people were approved to come partly from Sketchfab (CC0 / CC BY 4.0 / Sketchfab Standard,
Indian-looking, in the game's style). The Browser pane this session used was not signed in at sketchfab.com (its
`/i/users/me` answered 401), so nothing was downloaded from Sketchfab for the village; no credentials were typed and
no terms accepted. What was done instead: the dressing is code-built in `build_village.py` plus the island's already
downloaded Sketchfab props (pots, talwars, a dhal, diyas, rope, rubble; credited), and the villagers are Mixamo's
Peasant Man, Abe and Peasant Girl, re-dyed (docs/STORY.md, "The village and the reveal").

On a sign-in (the user signs in at sketchfab.com in the Browser pane, or a session that has it does the download):
worth fetching, then preparing like the cave's props (`levels/03_island/prepare_cave_props.py`) and placing in
`build_village.py`: a bullock cart and a charpai (the code-built ones are the weakest props up close), terracotta matkas
and a chulha, and Indian villagers in dhoti, kurta and saree if any suit the cel style (to replace the Mixamo
placeholders). Each needs its licence checked (never NC / ND) and a line in docs/ASSET_CREDITS.md.

## The Devi's prophecy in the baoli: Durga's voice: APPROVED, DONE (2026-10-05)

Chapter I now opens at the Devi's shrine above the stepwell (docs/STORY.md, "The divya kavach"): the boy kneels to
Durga, she speaks, and her light clothes him in the divya kavach. Her three lines are in the game as **subtitles only**
(`DEVI_LINES` in `src/game/stories/Baoli.ts`, no `voice` yet); the boy answers one line, unvoiced as always.

| Planned id | Speaker | Line | Characters | To record (2 takes) |
|---|---|---|---|---|
| `baoli_devi_1` | Durga | You climbed to my door with a stick of bamboo, and a grief too heavy for it. | 76 | about 182 credits |
| `baoli_devi_2` | Durga | What they carried down this well, they will not keep. Follow it. | 64 | about 154 credits |
| (none) | Yudhveer | With a stick of bamboo? | (subtitle only) | - |
| `baoli_devi_3` | Durga | Not alone. Wear my kavach. It will turn the blow. It will not move your feet; that is yours to do. | 98 | about 235 credits |
| **All** | | | **238** | **about 571 credits** |

Why these words: she sees him as he is (a village boy with a lathi and a grief), she does not name Andhaka or the
guru, and "they will not keep" what they carried is true in a way he cannot yet understand (the guru is Shiva; no one
holds him) without giving the summit away. The kavach is her protection, not his strength: "It will not move your
feet" ties it to the guru's first lesson ("feet first"), which the fight then repeats.

**Voice candidates** (ElevenLabs library, Indian English, female; listed only, nothing generated):

| | Voice | voice_id | Why |
|---|---|---|---|
| **A (recommended)** | Moana - Deep & Sophisticated | `mKn4iVyn09DrJ8cFw5Rn` | Deep, resonant, commandingly calm with a warm, polished texture: the most "divine" weight of the three without theatre. |
| B | India - Husky & Cosmo | `mmSZflZFDoe6qEecRgIO` | Deep and husky, warm and grounded, no high inflections: a darker, earthier Devi. |
| C | Aakancha - warm, perceptive, deeply human | `unOLncGEZHyisV6yF1a5` | Warm, mature, slightly husky, deliberate pauses: the most motherly; less power, more tenderness. |

Suggested delivery: slow, low, unhurried, a faint reverb in the game (the voice is the stone's), no whisper.

Cost: about 1.2 ElevenLabs credits per character per take, 2 takes: **about 571 credits** for the three lines. On a
yes: record with the chosen voice (the usual workflow: two takes, loudnorm to -18 LUFS), add `voice: 'baoli_devi_N'`
to `DEVI_LINES`, add the voice to `game asset/voice/VOICES.md`, and mark them recorded in STORY.md's Chapter I table.

**Approved and done (2026-10-05).** The user chose A, Moana, and rewrote the last line's sense: "it will protect you
from evil, you have my blessings", with "the same shankh sound behind this dialogue for weight, only a small version".
Line 3 is now "Not alone. Wear my kavach. No evil will pierce it. Go, my child. You have my blessing." Recorded in
flow VPM6tD8eCElptM16TltN, two takes each (714 credits); the user picked takes B, B, A. The shankh is the first 5.5 s of
the summit's "Har Har Mahadev" (its conch, faded out from 3.4 s), `public/assets/sfx/shankh.mp3`, played at low level
as her blessing's shot begins.

## Feel pass: jitter fixes and the impact camera (2026-10-05): APPROVED, DONE; tuning choices open (no cost)

**Decision:** "build both jitter fixes and impact camera". Built as docs/proposals/JITTER.md and IMPACT_CAMERA.md
describe (results and the before/after table at the end of JITTER.md). Nothing spent or downloaded. A few numbers
were tuned differently from the proposals; each is one constant, and worth a look in play:

| Choice | In the game now | Other options |
|---|---|---|
| The hero's turn acceleration | 60 rad/s^2 (a half-turn about as quick as before, ~0.45 s) | 45 (the proposal: heavier, a little slower to come round) or 90 (snappier) |
| The hero's swing aim | 18 rad/s at up to 150 rad/s^2 (was 20 rad/s with no limit) | The proposal's 14 rad/s: weightier, but a foe behind him may no longer be reached in the wind-up |
| Gada blows | a gada finisher is a slam (110 ms freeze, -1.5 deg FOV); its other blows are heavy (75 ms) | The proposal's table: every gada blow a slam (more punch, busier camera in a gada combo) |
| The slide | still turns him to the stick at once (an evasion goes where it is pressed) | A very fast turn over its first tenth of a second |
| Minions with no back-step clip | back off with their walk played in reverse | Hold their ground instead (the proposal's first option) |
| Camera shake | 100 % by default, 50 % with the system's reduced-motion setting | If the fight reads shaky, lower trauma first (`__debug.impactTune`), then the kicks |

On a choice: change the constant named (`LOCOMOTION.turnAccel` and `ASSIST` in `src/entities/Player.ts`, the
classification in `CombatSystem.resolvePlayerHitOnEnemy`, `IMPACTS` in `src/core/ImpactCamera.ts`), re-run
`__debug.jitterScenario('S2')` and play a fight.

## Dwarka's tide (2026-10-05): BUILT; tuning choices open (no cost)

"Yes build the tides": the sea now has a tide, Gerstner swells, shore foam from a baked shoreline, a wet band on the
rock, raindrops on the water and a boat that rides it (docs/STORY.md, "Dwarka's tide"; screenshots
`game asset/previews/dwarka_tide_*.jpg`). Nothing spent or downloaded. Choices to weigh, each a one-line change:

1. **How far and how fast the tide goes.** Now 0.34 m either side, a full cycle every 96 s (so a fight sees it creep
   up and back), from low water at the start. At high water the low reef shelves round the islets go awash with
   lace foam; at low water their footings show (`dwarka_tide_high*.jpg`, `dwarka_tide_low*.jpg`). Options: smaller
   (0.25 m, the reefs never quite cover) or slower (3 minutes, a tide you notice only across a long fight).
2. **How big the swells are.** Up to ~0.6 m above and below the tide where they add up: a storm heave, visible as long
   bands in the sunset's glitter and in the water climbing the rock (`dwarka_tide_foam_lap_a/b.jpg`, 1.5 s apart). Could
   be calmer (half) if it reads as too rough for a harbour.
3. **The foam's look.** Two soft-edged tones of grey-white (a thin line on the rock, broken wash beyond it, lines rolling
   in), dimmed for the storm. Could be whiter, or one tone only (more cel), or without the rolling lines.
4. **A graphics setting.** There is none yet; the sea has `'full'`, `'low'` and `'flat'` (`Level3_Dwarka.seaQuality`,
   dev `__debug.tide({ quality })`). Suggest a Settings entry "Graphics: High / Low" that sets the sea to `'low'` and
   the rain to `'low'` together. Not added (it is a menu change).
5. **Integrated graphics are unmeasured.** On this machine (RX 9060 XT, 1080p) the sea costs 0.05 ms in the fight's view
   (less than before: 0.12) and ~0.21-0.23 ms where it fills the screen (before: 0.13-0.17). An integrated GPU is
   perhaps 5-10x slower, so the open-sea shots might cost ~0.5 ms more there; `'low'` takes about a third off. Worth a
   check on a laptop before release.
6. **The boat.** It rides the swells and the tide now, but as exported it sits on its side floats with the keel clear
   of the water (unchanged). Option: sink it ~0.3 m so the hull meets the sea.
7. **Where the shoreline is baked.** At load, from the level's own rock (~0.1 s, once, no file to keep in step with
   the .blend). The alternative is a texture baked in Blender and shipped (no load cost, but it must be re-baked
   whenever the islands change). Kept at load.

## Audit fixes (2026-10-05)

### Real fire everywhere (batches 6 and 7: W-01 to W-07, W-09 to W-11, W-13, W-14, W-16, W-17, V2-01): DONE; judgement calls

No credits spent, nothing downloaded, nothing blocked. What was built is in docs/STORY.md, "Real fire everywhere";
captures in `game asset/audit/fixes/fix-fire/`. Calls made on the way, each a constant or a few lines to change:

- **The island's "floating" shelf flame (W-02):** its diya was there, but a rock column (dressing laid after the shelves
  were cut) had swallowed both shelf lamps at the first tunnel's mouth, diya, wick and flame. Rather than remove the
  flames, the game draws any diya buried in the dressing rock out along its spout onto a short ledge of the shelf's
  stone (`Level5_Island.drawLampsOutOfRock`). The cleaner fix is in `build_island.py` (`diya_on_shelf` should test the
  dressing rock too), left alone (outside this pass).
- **Island lamp lights (W-09):** at least 0.55 m clear of the rock, the deepastambhas' a metre out of their stands;
  gain 36 to 17 with decay 2 to 1.5. The tunnel view is about 10 % darker overall, with no clipping.
- **Summit deepams (W-03):** bronze #3b2a1b; "the lips" read as both dishes' rims (five wick flames on the upper, four
  on the lower); their light moved a metre above the top dish (any nearer, it burned the small lamp flat orange).
- **Summit braziers (W-10):** smouldering, uneven small tongues low in the bowl and an ember now and then; licks of
  flame only as they catch (close up the licks read as orange orbs).
- **Summit lanterns:** no `Lantern_Flame` meshes exist in `charnel_ridge.glb` (any that appear are converted). The vista
  shrine's two lantern posts, 60 m out with their lights past the live radius, glow warm in their (opaque) glass heads.
- **Baoli (W-04):** the near lamps' `FX_Glow` halos now fade out within 1.5 to 6 m of the camera (they washed the close
  shots out over the flames); the far fort's glow dots are unchanged.
- **Akhada (W-05):** "a faint amber light per pair of stands" became two shared lights at the two lit deepam stands
  nearest the camera, handing off softly. The grazers stay vermillion; only their flicker is new. Easy to drop
  (`STAND_GLOW.lights` 0) if it softens the night's grade too much.
- **Dwarka (W-06):** the lean and the gutters follow the rain's own gusting wind (lean capped at 0.5 m per metre of
  flame); the flames' bands are deeper and more saturated there (the AgX grade bleached the village's to peach). The
  diya on the arena's north-east rim stands half inside a rock (as exported) and shows only partly.
- **Takshaka's wave (W-07):** besides the fire, its arc is now centred on its path (the torus was an arc off to one
  side of the point that hits).
- **Village (W-13, W-14):** the sandstone's gain is 0.86 of the textured surfaces'. `village_dusk.glb` was rebuilt with
  `build_village.py` (the diyas' flames at their wicks); diffed against an unmodified rebuild, only the four
  `Fire_lamp_*` empties moved. The originals are in `game asset/levels/00_village/_backup_2026-10-05/`.
- **Known, unchanged:** ink lines of what stands behind a flame still draw over it (the ink pass reads depth, and
  flames write none); it was so in the village before.

### The hands: C-04, C-06, C-11, S-15 (done), C-12 (not done)

No credits, downloads or sign-ins were needed. Judgement calls, made while the user was away:

- **C-04: real finger bones, not a better baked curl.** The decision rule's first path worked. The hero's mesh has
  clearly separate fingers and thumb (gaps between all of them in a top view), so bones deform cleanly; the same held
  for the training model, the vanara, the Guardian and Shalva. Markers per model are in
  `game asset/characters/rigs/<name>.fingers.json`, read off top-view renders with a centimetre grid. The fallback
  (path 2) was not needed. Every socket is unchanged to 0.000 mm (`game asset/audit/fixes/fix-hands/socket_check.txt`).
- **The grips are set in code, not baked into the clips:** each frame a hand closes on what its socket holds, the
  other hand on a two-handed haft, relaxes when empty, and lies flat when the clip is marked `"hands": "flat"`. That
  needs no per-weapon or per-clip tables. There is one fist per model, round a bar about 2 cm in radius (3.4 cm on the
  3.2 m Guardian), which fits every haft and grip in the game (1.7 to 3.6 cm). A per-weapon pose can be added later.
- **GLB size:** the clips' constant finger channels are pruned after export (the game sets the fingers). The new bones
  and poses still add a little: yodha.glb 8.25 to 8.51 MB, yodha_training 4.52 to 4.74, vanara 3.73 to 3.90, Guardian
  3.83 to 4.01, Shalva 3.46 to 3.64.
- **The villager woman at the mandir** (C-06's check) has Mixamo's own fingers, but her Praying is a V of open palms
  touching only at the heel. She now gets the same anjali (`--post anjali_post.py`; nothing else in her model changed).
- **S-15:** an authored `posture_break` clip (struck, down on one knee, up again: 2.47 s) instead of a section of Head
  Impact To Knees. That clip falls to both knees, face down, and takes 4.5 s; the state lasts 2.5 s.
- **C-11:** the grip moved 6 cm up the haft, as suggested; the left fist now closes 8.5 cm above the butt.
- **C-12 not done:** the guru's staff arm is held at rest in every clip (`guru_post.py`), so the 3.7 cm shoulder
  asymmetry never shows. Re-rigging him would re-solve all his heat weights, which "only if nothing else changes" rules
  out.
- **Seen, not mine:** with the fists closed, the basic sword's grip being 8.8 cm off the socket (C-03) shows more in
  chapters II and III: the red grip sits beside the fist. The weapon-grips fix covers it.

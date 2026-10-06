# Waiting for approval

Things that need the user's say-so before they go further: credit spends, downloads, new voice lines, and choices
between options. Each entry says what it is, what it costs, and what happens on a yes. Nothing here has been spent or
downloaded yet.

## Andhaka's crowning line (2026-10-05): APPROVED, DONE

**Decision:** "go with A - let the gods see their new ruler". The line is now "Burn, Agni. Let the gods see their new
ruler." (voice id `summit_crown_andhaka_1`, ElevenLabs flow hNijKdjbfXylpNQQdcpK; take A 4.96 s in the game, levelled to
-18 LUFS; take B 5.44 s kept in `game asset/voice/takes/`). It starts 1.75 s before the crown settles so it fits
between the crown and his roar (docs/STORY.md, "Andhaka's model and entrance"). The original proposal, as it was
before the decision (superseded: option A was recorded as "...their new ruler." under the id above, not as
`summit_andhaka_crowned`, and the line is voiced, no longer subtitle only):

As the crown settles on his head the Agni beacon takes fire (docs/STORY.md, "Andhaka's model and entrance", shot 5).
He speaks one line there, tying the crown to the fire. It is in the game now as a subtitle only (`CROWNING_LINE` in
`src/cinematics/Intros.ts`, no `voice` id). The options, in his voice (Roderich, Crude & Ruthless,
`game asset/voice/VOICES.md`):

| | Line | Characters | To record (2 takes) |
|---|---|---|---|
| **A (picked; recorded as "Burn, Agni. Let the gods see their new ruler.")** | Burn, Agni. Let the gods see their king. | 40 | about 96 credits |
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
and `game asset/README.md`. The level was 7.5 MB (from 1.2 MB), and is 8.1 MB (8,142,180 bytes) since the Meshy boat
replaced the Sketchfab one. Nothing is blocked; no terms or consents were accepted.

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

### Holds and hand-offs: C-01, V1-02, C-02, S-09, C-03, C-10, C-08, C-07, C-05, V1-01, C-09 (done)

Holds and hand-offs (AUDIT.md C-01, V1-02, C-02, S-09, C-03, C-10, C-08, C-07, C-05, V1-01, C-09): done, no cost, no
model rebuilt (docs/STORY.md, "Holds and hand-offs"; captures in `game asset/audit/fixes/fix-holds/`). Judgement calls
worth a look in play, each a constant or two:

| Choice | In the game now | Other options |
|---|---|---|
| The lathi's grip | right fist 0.27 m up from the foot (`LATHI_GRIP`) | the audit's 0.45 m: the bamboo under the left fist then runs into his hip and thigh in the guard, the walk and the spin |
| The lathi's walk | the hero's own walk, staff in one hand (cutscenes walk him to the Devi and out of the village) | the guard walk (`great_sword_walk`) in the fight only |
| The lathi's third blow | the high spin: two blows of 18/26 each (was one blow of 36/52) | its first blow only, at full weight |
| The lathi's overhead blow | entered at the top of its swing (its own wind-up puts the staff through his head) | a slower blend for more wind-up |
| The scabbard | dark leather, brass throat, locket and chape; 47 deg down and 17 out along the left thigh; worn empty while drawn | brighter or darker brass; steeper or flatter; a baldric strap |
| The sword's grip | an offset onto the borrowed blade's grip (`SWORD_GRIP`) | a prepared hero copy of the model (`prepare_weapon.py`, no credit); or the distinct basic sword the audit suggests |
| Dwarka's complete screen | the khanda in his hand, the mace on the stone | drop the screen's view of him |
| Dwarka's mace | laid down across the cut into the take (no laying-down clip) | a Mixamo "put down" clip, if one is downloaded |
| The dhal handed over | the vanara holds its far rim, the boy's palm comes up under its middle (2 cm off): the two hands 32 cm apart across the 66 cm dhal when it passes | the vanara holding it by its middle, so both hands meet within ~10 cm (the audit's number), at the cost of his hand covering the boss |

Seen in passing, not changed: on the island, the take is hidden in the black hold, but in the last shot ("He will meet
it now") the "power_up" clip swings the one-handed mace's head across his face (about 3 s in); in the Baoli, the
lathi (hidden while he kneels) reappears in his hand 1.9 s into the rise with nothing picked up; with the lathi (and
every weapon) the charge's "Power Up" crosses the staff over his head for a few frames.

### Flow, teaching, memory and polish (batches 8-12 and batch 9's free parts): DONE; judgement calls

No credits spent, nothing downloaded, no sign-ins; no voiced line's text changed. What changed is in docs/STORY.md
(the milestones it touches, and "The summit's snow, and memory between chapters"); captures in
`game asset/audit/fixes/fix-flow/`.

- **Shakti in II-IV (S-04), reversible:** `charge` is back in the akhada, island and Dwarka kits, so the guru's Chapter I
  lesson keeps working; STORY.md's "Charge arrives with the magical sword" is replaced. To undo: drop `'charge'` from
  those three kits in `src/game/Progression.ts` (then a vanara line should say why it is gone; that costs credits).
- **Newly granted moves (S-03):** "the first chapter that grants it" is read against every earlier chapter's kit (moves
  given or taught), not only the previous one; comparing with the previous kit alone would re-teach block and parry at
  the summit (Dwarka's mace has no dhal). Only Dwarka's leap qualifies; its hint shows 4 s into the fight.
- **The Akhada drill and "Combat hints" off (S-12):** not exempt. With hints off the drill stays playable: the vanara
  says what to do, "Learned: The guard / The parry" names the moves, the hero cannot fall while he teaches, and the
  Controls screen lists the guard. To exempt it, show `b.beat.hint` regardless of the setting for the drill's beats.
- **Dead card text (S-11, V3-01):** the prologue's cleared line is a caption over the night shot, the summit's the
  first line of the credits, and a chapter's defeat line sits under "<boss> still stands." The prologue's defeat line
  ("The village burns.") is removed rather than shown: he cannot fall there (`Chapter.defeatLine` is now optional). The
  "Raiders" card, which the place-only intro skipped, comes up in the opening as they step out of the gate's glow.
- **The summit's low-health line (S-05):** Andhaka's fight only (under 35 %), once: Andhaka's arrival restores the hero,
  so a line spent on the rakshasa waves would leave the fight that matters, the one "You kept your feet" answers,
  without it.
- **The dry style (V3-02):** named `aloud` (beside `scene` and `voice`); unused until the boss lines are recorded. Tested
  with a temporary call only (`v302_aloud_style_test.jpg`); nothing in the game uses it yet.
- **Dwarka's file (W-12):** the shipped GLB had been touched up after its export by the building session's
  `validate_export.py` (the hills made unlit, the moss and algae's vertex alpha moved into COLOR_0); the new export
  script does the same, or the hills would have lit and the patches lost their fade. Positions are packed at 16 bits,
  not the exporter's default 12, for 0.5 MB: at 12 the 2.8 km horizon disc moved up to 95 cm and the arena's 6 mm
  decals could have met the paving. The old file is kept in `game asset/levels/03_dwarka/_backup_2026-10-05/`. The
  optional decimation of the summit's staircase and pilasters was skipped: it means re-exporting the summit, whose
  export re-bakes every object (not isolated).
- **The summit's square patches (W-15):** the code fallback, not a re-bake (a re-bake redoes every object's texture):
  smoothed normals on the flat-shaded terrain and vista rock, and the beacon cliff's 3-texels-a-metre bake replaced
  by world-space mottling of its mean colour (`SnowCover.breakup`). The trail up the cliff stays stepped (it is steps).
- **Memory (W-08):** besides the greybox prop and the texture slots the audit named, each character's bone texture
  leaked (`disposeObject` now frees skeletons). Measured: steady at 35/51 and 88/67 (geometries/textures) over ten
  prologue <-> Chapter I round trips.
- **Chapter I's lead-in (S-07):** 2.0 s cut (the walk up to the Devi 5.6 to 4.4 s, the kneel 5.2 to 4.4 s); the cut now
  comes as he nears his mark, which the next shot puts him on.
- **Credits (S-14):** Dwarka's Poly Haven sources are listed with links; their authors are not (no local record, and
  nothing was fetched). Dwarka's fort and moored boat were "user supplied" in the building session's notes, with no
  source recorded: worth a line from you on where they came from, in case they need a credit.

### The kavach's promise: a small mechanic (S-06, proposal, your decision, not built)

Durga says "No evil will pierce it", but in play the kavach only changes his clothes: damage, posture and guard are
as before, so the Guardian hits as hard a minute after the promise. Options, cheapest first (no credits; each needs a
little combat tuning and a playtest):

| | What it does | Shown as | Effort |
|---|---|---|---|
| **A (recommended)** | Once a fight, the first blow that would take him under a quarter of his health is turned: no damage, a short stagger for the attacker | a gold ripple over him and the callout "The kavach holds" | S: a flag in `Player.takeDamage`, a callout, the ripple from `DivineLight` |
| B | Blocked blows' chip damage halved while he wears it | nothing new (felt, not seen) | S, but nearly invisible until the akhada gives him a dhal |
| C | A slow regeneration of posture after a hit | the posture bar | S, but it reads as a stat, not a gift |

Why A: it keeps the Devi's words true at the moment they matter (the brink of a fall), it is seen, and once a fight
it saves a life without making him strong (STORY.md, "The idea"). It also gives the summit's "Breathe. Feet first."
moment a partner: the armour holds once, the feet must do the rest ("It will not move your feet" was the first draft
of her line). On a yes: build A in the Player, tune it against the Guardian and Andhaka, and add it to STORY.md's
"The divya kavach".

## Milestone 11: the placeholders replaced (2026-10-05): DONE; judgement calls, one item still to do

Made while the user was away (docs/STORY.md, "Milestone 11"). **Meshy: 144 credits** within the 160 cap (balance 812
before, 668 after): 8 nano-banana concepts at 3 (image-to-image; raider A `01a10dbb-45ef-7712-9db7-8494ef71fbaa`, B
`01a10dbb-4c39-769d-ab94-03a795542532`; yatudhana A `01a10dbb-a264-77f9-831a-82ffee016f5d`, B
`01a10dbb-a847-7388-b531-49ebf9441906`; runt A `01a10dbb-5138-7680-b4ba-e20944c045de`, B
`01a10dbb-56c8-7723-ba58-bfa317fff37a`; hurler A `01a10dbb-5cf6-73bd-b7e5-14e14c76564b`, B
`01a10dbb-6235-77d9-98b0-44c23588fc16`) and 4 Meshy 7 image-to-3D models at 30 (raider
`01a10dbf-4c7f-71ed-9356-a62fd84754d6`, yatudhana `01a10dbf-5107-71d6-be54-6c49ea879f60`, runt
`01a10dbf-547c-72fe-a134-5cc602d6135e`, hurler `01a10dbf-57f5-76df-bda6-09459491d51e`). No retries were needed. Nothing
else was paid for or downloaded; no sign-ins. Calls made on the way, each easy to undo:

- **The picks:** the A concept of each (`game asset/concepts/<who>_A.png`; the B's are kept beside them). Raider A is
  veiled: nine copies of one model read as a band of anonymous dacoits, and Meshy's faces are soft. Runt B had four
  arms. Hurler B (an olive ghoul) would have looked like the runts' bigger brother; A's soot-black and embers set them
  apart in the dark.
- **The archers are hurlers.** There is no bow clip on disk (and Mixamo needs a sign-in), so they throw: the draw's
  glow is a brand catching fire in the hand, the shaft of fire is that brand hurled (the projectile is unchanged). On
  screen they are "Cave hurler"; the pool's callout is "Hurlers across the water: Slide under their firebrands, or turn
  them on the dhal" (was "Archers across the water: Slide under their shafts..."). Code names (`ArcherMonster`,
  `pool_archer_*`) are unchanged. Back to "archer" is two strings in `IslandMonsters.ts` and `IslandExpedition.ts`.
- **Their embers glow** (`game asset/characters/ember_glow.py`, an emissive map made from the colour map's warm, bright
  texels: the forearm cracks and the eyes only). Without it they were black shapes in the dark caves. To drop it,
  rebuild without `--extras ember_glow.py`.
- **The raiders' talwar** is the island's Sketchfab talwar (CC BY 4.0, already credited), prepared at 0.95 m, not a new
  Meshy model; the fist closes on it with the finger bones. It has the source's dark red stains on the blade.
- **A dead raider drops it:** three seconds into his fall it leaves the opening hand and lies flat beside him, pointing
  away from the body (it used to stand straight up out of his fist). Two constants in `Raider.ts`.
- **The prologue's brute** (the raider who strikes the boy down from behind) now swings a talwar where the placeholder
  had its fused cleaver; it reads as the flat of the blade in the blurred shot. Option: give the brute (story cast
  only) a club instead.
- **The runts are lighter:** decimated to 17k triangles with a 1k map (up to six at once); the others keep 31k and 2k.
- **Clawed hands as modelled:** only the raiders got finger bones; the yatudhana, the runts and the hurlers hold nothing.
- **Sizes:** the raiders 1.75 m (the rakshasas' 1.85 m capsule kept), the yatudhana 1.8 m, the runts 1.1 m, the hurlers
  1.8 m, as the placeholders stood.

**Still to do (needs a yes on credits):** the basic sword's model, about **36 credits** (two nano-banana concepts at 3
and a Meshy 7 model at 30). The weapon-grips helper is changing the lathi's and the basic sword's holds now, so
the sword was left alone here.
*Done since (milestone 11b, below): the sword, 36 credits.*

**Blocked on a sign-in (Mixamo):** a bow draw-and-loose (or an overarm throw) for the hurlers, and a cast and death of
the yatudhana's own (both borrow Mayavi's). Nothing was tried: Mixamo is out of bounds without the user's login.

## Milestones (2026-10-05)

Made while the user was away (docs/STORY.md, Roadmap). One subsection per milestone: the calls made, each easy to undo,
and what is left for the user.

### Milestone 10: voices and sound: DONE; loop seams still to be listened to

**ElevenLabs spend: 718 credits as `estimate_only` quoted them** (490 for the first run, 228 for the re-rolls) against
the 2,000 allowed; the finished generations each report their own price, and those add up to 239. 34 takes in 17 runs of
Sound Effects v2 (flows `EouKT1OETCbAtnrFgtel` and `V7UM1onltxC63Gd9nSLs`; every session and take is in
`game asset/sfx/_m10_sources.json`, the raw takes in `game asset/sfx/takes/`). Nothing else was paid for or downloaded;
no sign-ins. The rate seen is 10 credits per second quoted (3.3 reported) per take, not the 40 the older notes above
assume, so if the declined rain bed and thunder were ever wanted they would be about 600 quoted, and the three recorded
victory stingers about 360.

**Voices (checked, nothing recorded):** all 66 voice files are used (65 by a line's `voice` id, one, the laugh, played
by name), every id the code asks for has its file, and every speaker except Yudhveer is voiced (his lines are subtitles
only, by design). The dialogue rewrites in docs/proposals/DIALOGUE.md are pending the user's yes and were not recorded.

**The inventory** (`src/combat/SoundFX.ts`). Recorded before: the weapons' whooshes and blows, the parry, the block, the
glancing blow, the posture break, the slide, the katar, the magic bolt, the flame burst, the telegraph, the roars, the
phase surge and the conch (19 files). Synthesized, ranked by how often and how loudly they play, and what became of them:

| Sound | Where it plays | Now |
|---|---|---|
| `playWetStep` | every step the hero takes in Dwarka | recorded (two takes, picked at random) |
| `playSplash` | Dwarka landings, falls, mace slams, Shalva surfacing | recorded (a light and a heavy one) |
| `playUiMove`, `playUiConfirm` | every menu move and press | recorded (a small bronze bell, tapped and struck) |
| `playDefeat` | every defeat | recorded (a great bronze bell) |
| `playCardHit` | every chapter card | recorded (a dhol stroke with its stick's crack) |
| `playPlunge`, `playWake` | each of Shalva's dives | recorded |
| `playHeavyStep`, `playBodyFall`, `playFallingBlow`, `playRaidHorn` | the prologue | recorded (the horn a narsingha-style Rajasthani war horn: a short blast, then a long one) |
| `playEarRing` | the prologue's concussions | **kept synthesized:** a pure tone whose length and level the cutscene sets, and it is routed past the muffler |
| `playLevelClear` | each chapter won | **kept synthesized:** "keep the temple bell; no recorded stinger" (above) |
| the places' ambience events (drips, wind, waves, thunder, animals, bells) | everywhere | **kept synthesized:** the rain bed was declined, and "current is good enough" |
| `playChakramThrow` | nothing calls it | left alone (dead code) |

**Calls made:**

- **Dwarka.** The recorded steps and splashes are one-shots; the declined rain bed, the waves and the thunder are
  untouched. Dwarka's distant shankh (an ambience event every minute or two) now plays the existing conch recording
  (synth as fallback; no credits).
- **Levels were set by measuring** each sound through the real chain (an offline render through the effects bus, the
  place's reverb and the master compressor, master volume 1), against the recordings already there. In that chain combat
  blows peak near -6 dBFS (`hit_crush` -6.2, `hit_blade` -6.5), the slide -10.7 and the telegraph -13.5, and the new ones
  come to: steps -16 to -13 (walking to sprinting), light splashes -14 to -12, heavy ones -10 to -8, plunge -6.4, wake -7.6
  at its end, Andhaka's tread -8.7, body fall -9.3 (-15 at the guru's half level), falling blow -3.2, horn -10.3, card
  -5.5, menu bells -21 (move) and -15 (press), defeat -7.7. Each is one number in `SAMPLE_GAIN`.
- **This changes the mix.** The synthesized steps and menu ticks were effectively inaudible. Measured live at the master
  output (volume 0.8): Dwarka's rain bed sits near -37 dBFS RMS and the title music near -33, while the old step peaked
  near -48 and the old menu tick near -43. The recorded steps peak near -19 there, about 18 dB over the bed's RMS (7 dB
  over its usual peaks), and the menus now ring. If the steps feel too forward, lower `wet_step` and `wet_step_2`; they
  are the sounds heard most.
- **Re-rolls (8 extra takes).** The first takes of four sounds were not usable as they came: the giant's step (94% of its
  energy below 80 Hz, a hum), the horn (one long note, not two blasts), the wake (loudest at its start; the game needs a
  swell) and the defeat bell (a boom with no bell partials). The re-rolls fixed the step (69% of it between 80 and 250 Hz)
  and the bell (a true strike, its partials ringing). The horn came out as a single long note each time and the wake still
  did not swell, so `raid_horn.mp3` is assembled from two takes (a short blast, a breath, a long one) and the wake is
  levelled and given a swell. Every edit is in `game asset/sfx/process_sfx.py`.
- **Small speakers.** The giant's tread, the body fall and the wake are mostly under 80 Hz (72%, 66% and 59% of their
  energy); the synthesized tread was lower still (99%), the synthesized fall and wake less low (61% and 34%). A harmonic
  was added to the tread. Worth hearing on laptop speakers.
- **Two things not done, for the user:** the hero makes no footstep sound in any chapter but Dwarka (nor do the enemies in
  the fights), and a felled enemy makes no fall sound (`playBodyFall` exists and could be called from `Enemy`'s death;
  that file belongs to the combat passes).

**Music check.** All ten tracks (title, village, baoli, akhada, island, dwarka, summit, boss, andhaka_final, shiva)
fetch, decode (60 s each) and play, and none falls back to the drone. Wiring, confirmed by starting each chapter in a
dev build: the prologue plays `village`, Chapter I `boss` (the Guardian is up from the start; `baoli` plays in the intro
and after), Chapter II `akhada`, **Chapter III `island` (level 5; it was already wired, so the roadmap's "awaits its
chapter" was stale and is gone)**, Dwarka `boss` (Shalva; `dwarka` under the intro and the ending), the summit `summit`
with `andhaka_final` for Andhaka, and `shiva` as the reveal's one-shot. Loudness is even: integrated -11.4 to -16.4 LUFS,
-12.8 to -15.0 once `TRACK_GAIN` is applied. **The loop seams are not clean (measured, not listened to):** `village`
ends at full level and fades in over 3 s; `title` fades out over its last 4 s, `island` over about 5 s and `boss` over
1.5 s before the seam (the recording then starts at full level, or fades in from silence, as `akhada` and `island` do),
so those dip for 1.5 to 8 s at every loop; `summit` has a small step; `baoli`, `dwarka` and `andhaka_final` loop
cleanly. A fix that needs ears: loop each from after its fade-in to before its fade-out with a short
crossfade (an overlap schedule in `Music`, or a crossfaded copy of each file). Not done here.
*Done since ("Music loop seams", below): measured clean, still to be listened to.*

**Checks.** `npx tsc --noEmit` and `npm run build` pass with no warnings; the bundle carries no `__debug` or `__yudhveer`
and lists 33 recordings and 10 tracks. In a dev build, after a real click: the audio context runs, all 33 recordings
fetch (200) and decode, there are no console warnings or errors, each new sound renders offline with its level and
spectrum, and played live each one reached the master output. In Dwarka, played in real time, the hero's steps called the
recordings (both takes), and Shalva's dive called `plunge`, `wake`, the telegraph, the splashes, the roar and the smash,
none falling back to the synth. To hear one: in a dev build, click once, then in the console
`__yudhveer.soundFX.playCardHit()` (or any `play...` method).

### Milestone 11b: the weapons pass (2026-10-05): DONE; judgement calls

Made while the user was away (docs/STORY.md, "The weapons pass"; captures, Blender renders and the lab scripts in
`game asset/audit/fixes/m11b-weapons/`). **Meshy: 36 credits** within the cap of 40 (balance 668 before, 632 after): two
nano-banana text-to-image concepts at 3 (sword A `01a10e8e-75b8-7347-997a-dc9aa7c6bedd`, sword B
`01a10e8e-7847-7665-a7f7-6c8c0b31112b`) and one Meshy 7.1 image-to-3D model at 30 (`01a10e90-4f0c-70bb-91fa-c831e6bc0a02`:
`meshy-7.1`, textured, 2k, no PBR, remeshed to a target of 10,000 triangles, triangle topology, no pose options; it came
out at 9,906, first time). Nothing else was paid for or downloaded; no sign-ins. Calls made on the way, each easy to undo:

- **The pick: A.** A is a gently curved single-edged talwar with a shallow fuller, downturned quillons and a bronze disc
  pommel: an Indian sword a young warrior could carry, and nothing like the Vetala's broad notched blades or the khanda.
  B (a slim straight arming sword with a red-corded grip) read European. Both are in `game asset/concepts/`.
- **A broader blade and a smaller pommel than the model made** (`prepare_weapon.py --widen 1.5 --pommel 0.8`, two new
  opt-in flags). Meshy's blade came out true to the concept but 3.8 cm across and 1.1 cm thick: at the game's camera it
  was a thread beside the dhal. Broadened by half (5.7 by 1.6 cm, from 2 cm above the guard) it holds its own, and the
  pommel's disc (it was 11 cm across) is a fifth smaller so it reads as a pommel, not a plate. To undo: prepare again
  without the flags and refit the scabbard (`fit_scabbard.py`, whose output is `SWORD_SCABBARD`).
- **Reach.** His hit segment is now `[0.1, 0.87]` (it was `[0.11, 0.97]` with the Vetala's longer blade): 10 cm shorter,
  the same as the khanda's. Strike windows are measured from the clips as always. For the old reach, prepare it at
  `--length 1.08` (and `blade: [0.11, 0.97]`, a refit scabbard).
- **The sword's grip is the model's origin** (`SWORD_GRIP = [0, 0, 0]`): `prepare_weapon.py` puts the grip's middle (55 %
  of the way from the pommel to the guard) there, and the fist closes on it in every state (checked: guard, rest, the
  three blows, the leap, parry, block, stagger, deflection, posture break, charge, slide, run, sprint, sheathe, draw).
- **The lathi stays built in code** (no credits). Its look is mine: the bamboo's tones (a tan from `0x9a7a42` to
  `0xa8884c`), dark node ridges (`0x4b3318`), an iron ferrule and cap (`0x5d6068`), brass (`0xb48a3a`) and a red cord
  (`0x7c3027`). The cord is the loudest thing on it (the only saturated colour); to quieten it, change its colour in
  `buildLathi` (or `LATHI_CORD.turns`). 6,920 triangles (the cord's tube is 5,600 of them: 35 turns, 10 segments a turn, 8 sides).
- **The guru kneels upright and free,** in Mixamo's Kneeling Idle (the one the hero's own kneel uses). Not bound: his staff
  arm is held at rest in every clip (`guru_post.py`, unchanged: the audit left his rig alone), so there are no hands to
  tie. The staff in that hand stands 0.46 m into the dais (it is the length of his whole body; the stone hides it): he
  seems to have planted it. The `death` clip held at 1.5 s read as a fall, not a captive.
- **Island, the last shot:** the mace is gathered in the Great Sword Pack's "Power Up", held in both hands as in the fight
  (the same clip is the lathi's and the mace's charge, below), and after it he stands at ease with the mace low at his
  side (the hold of the clip's end, with the head beside his face, is gone). The camera is on his left now (the mace held
  before him came between the lens and his face from his right): the next shot's close-up was already on his left.
- **The charge for two-handed weapons:** `great_sword_power_up` at 1.536x for the lathi and the mace, so the charge lasts
  1.975 s (the hero's own "Power Up" at 1.2x gave 1.972 s): **no balance change** (the m12 helper's `timeScale` knob is
  `CHARGE_TWO_HANDED` in `YodhaWeapons.ts`). The sword and the khanda keep the hero's own "Power Up" (neither crosses his
  head). The clip is in `yodha.glb` and `yodha_training.glb` (both rebuilt; every older clip and socket is as it was: a
  rebuild with the old clip list is byte for byte the old file).
- **The Baoli's lathi:**
  - *Laid down across the cut, not by a gesture.* There is no lay-down clip (Mixamo's "Put Down" or "Pick Up" would
    need a sign-in); authoring the reach down was the harder half, and the cut into the kneel is where the old version
    already hid the lathi (it popped out of his hand 0.1 s in). He stands at his mark with empty hands, the lathi on the
    stone at his right.
  - *Taken up with an authored reach* (`kneel_take`, `take_post.py`; 3.47 s; +62 KB in each hero model). With arms 40 cm to
    the wrist, taking something off the ground from a kneel is a deep stoop; the right arm is laid by IK. Tried and left:
    both hands on a staff laid across his front (the arms cannot reach it from a kneel short of a prostration), and a
    thumb-forward grasp (the staff passed through the ground and his spine on the lift).
  - *Its iron foot points at the Devi* (head to his back): that is how the bar through the fist runs in the grasp that
    works. If a head toward her matters, flip `TAKE.bar` and rework the lift in `take_post.py` (the hand's path differs).
  - *The camera is on his right for the kneel and the rise* (it was on his left, where the lathi, on his right, would be
    hidden behind him). The rise shot is as long as it was (4.0 s): the fade begins as he settles at ease.
  - *A copy lies on the stone through the prayer and the flash* (the change of clothes gives him a new rig and a new
    lathi), and at the clip's `grasp` mark the real lathi is in his fist and the copy is gone: 9 mm of the hand's own
    motion between two frames, no turn. Skipped or on a retry, the lathi is simply in his hand (an essential cue).
- **Hero models:** `yodha.glb` 8.51 to 8.58 MB, `yodha_training.glb` 4.74 to 4.80 MB, `guru.glb` 2.61 to 2.64 MB. The
  scratch rebuilds with the old clip lists were compared with the shipped files first (sha-256 identical) so that the
  only change is the added clips.
- **Credits:** `docs/ASSET_CREDITS.md` ("The hero's sword, made with Meshy") and the credits roll (a small block, "The
  hero's sword"). The Vetala keeps his own swords (nothing of his changed).

**Blocked on a sign-in (Mixamo):** a real pick-up and put-down (so the Baoli's lathi could be laid by a gesture too, and
the Baoli's reach could be Mixamo's own), and a bound, kneeling captive of the guru's own with his hands tied (his staff
arm is held at rest, so his hands cannot take a pose). Nothing was tried: Mixamo is out of bounds without the user's login.

### Music loop seams (milestone 12): DONE; measured, not listened to

Made while the user was away. **Nothing was listened to, so every claim here is a measurement** (the scripts, the
tables, the spectrograms and the envelopes are in `game asset/music/loops/`, outside git). No credits, no downloads, no
sign-ins; the mp3 files are untouched. It fixes what milestone 10 measured (above): `village`, `title`, `island` and
`boss` dipped for 1.5 to 8 s at every repeat, `akhada` fell silent at both ends, `summit` dropped from its loud ending
to its quiet opening, and `baoli`, `andhaka_final` and `dwarka` repeated from the middle of a phrase, a bar or a
section.

**What it does** (`src/combat/SoundFX.ts`: the `LOOPS` table, `loopOf` and `blendSeam`, about 70 lines, and two small
edits in `Music`):

- A track named in `LOOPS` plays from 0 once, so its intro and fade-in are heard as before, then repeats `start` to
  `end` for good.
- The seam is made once, when the recording is decoded: the `fade` seconds before `end` are mixed (equal power, cos and
  sin over the length) with the same length before `start`, in the decoded buffer itself. The one source then loops
  natively between the two points, so what plays at the join is the music running on without a break.
- Why not two scheduled sources: the timer that schedules the next pass is throttled to once a second, or a minute, in
  a hidden tab, and a seam it missed would be silence. The baked seam needs no timer and no extra node, so there is
  nothing new to cancel when a track changes mid-crossfade. Chapter changes and crossfades, ducking and dimming,
  `TRACK_GAIN`, the volume settings, the one-shot `shiva` and its `then`, and the drone fallback run the same code as
  before.
- **The points are whole frames** (`loopOf` rounds them to the decoded rate and the blend uses the same frames).
  Found by rendering the first version: the engine plays a loop point that falls between two samples interpolated, half
  a sample off, on every second pass. With whole frames the engine plays exactly what the blend made, at 44.1 and
  48 kHz.
- A track not named repeats whole, as it always did; so does one whose file is too short for its points (a replaced
  recording), without error.

| Track | BPM | start s | end s | fade s | Loop | What repeats (and what plays only once) |
|---|---|---|---|---|---|---|
| `title` | 70 | 3.429 | 53.764 | 1.5 | 50.3 s | from the opening D drone through the phrases, the loud wash and the outro (D again) back to the drone (the first 3.4 s play once, the fade-out never) |
| `village` | 115 | 43.826 | 58.435 | 1.0 | 14.6 s, 7 bars | the second groove's last 7 bars (the haze, the first groove and the break play once) |
| `baoli` | 82 | 8.780 | 55.606 | 1.0 | 46.8 s, 16 bars | beat 12 to beat 76: the same chord, four 16-beat phrases apart (the first 8.8 s play once) |
| `akhada` | 70 | 15.981 | 57.124 | 1.0 | 41.1 s, 12 hits | from 0.25 s before the first hit to 0.25 s before the 13th, both in the quiet between hits (the 16 s opening plays once; the 13th hit and the fade-out never) |
| `island` | 70 | 34.286 | 51.429 | 1.0 | 17.1 s, 5 bars | the groove (the pads before it play once, the coda and fade-out never) |
| `dwarka` | 72 | 30.833 | 57.500 | 1.0 | 26.7 s, 8 bars | the groove (the pad intro and the groove's first 4 s play once) |
| `summit` | 104 | 38.654 | 57.115 | 1.0 | 18.5 s, 8 bars | the loud second half (the opening and the first half play once) |
| `boss` | 71 | 3.380 | 57.465 | 1.0 | 54.1 s, 16 bars | nearly all of it (the first bar plays once, the fade-out never) |
| `andhaka_final` | 69 | 13.913 | 55.652 | 1.0 | 41.7 s, 12 bars | the middle and end of it (the first 14 s play once) |

**How the points were chosen** (by numbers and spectrograms, the ears being away):

- Every recording is an integer tempo (the onset envelope repeats at exact multiples of the beat: 70, 115, 82, 70, 70,
  72, 104, 71 and 69 BPM) and its 60 s hold exactly that many beats. So `end` is a whole number of bars (4 beats) after
  `start`, and the beat carries on across the join (the title, a drone piece with no beat, is the one exception). The
  sections come from the 50 ms RMS envelope, the log-mel spectrogram and the chroma.
- The candidates were every beat as `start` and every whole bar count after it as `end` (300 to 1,200 pairs a track).
  Each was scored on the two seconds before both ends (the difference in level, in log-mel spectrum and in chroma, the
  correlation of the onset patterns with `end` free to move 40 ms to line them up, and the simulated seam's dips) and
  the best looked at as spectrograms. Both ends have to sit in the same kind of music. That is why `village` and `island`
  repeat one section: a seam between their grooves and their melody or pad sections has a spectrum 6 to 12 dB apart (and
  for `village` a different chord), a morph rather than a continuation. And why the title joins its drone to its own
  drone: same pitch, partials and level (chroma distance 0.005, 0.7 dB).
- Among the clean ones the longest was taken that kept the dips natural (`dwarka`'s 30 s loop had a 3.4 dB dip, so its
  26.7 s one was taken; `summit`'s 20.8 s one had less alike ends). `end` is `start` plus a whole number of beats to
  within 1 ms for all but `baoli`, whose `end` is 3 ms early, which flattened its blend. `fade` is 1.0 s (a beat or two
  at these tempi), 1.5 s for the title's drone; 0.5 to 1.5 s moved the dips by 0.7 dB at most on the four tracks tried.

**Measured**, on the real `Music` class rendered offline (`OfflineAudioContext`, three joins a track; the unmodified
class from git HEAD rendered the same way for "before"). Dip: the lowest of the 0.5 s windows centred within 1 s of the
join, against the surrounding 4 s (power mean), in dB (the target: no deeper than about 1.5). "Its own" is the same
number taken at every position inside the loop, so it shows how much of a dip is just the pulse of the music (median,
and the 5th percentile). Step: the largest change between two neighbouring samples at the join, full scale being 1.

| Track | dip before | dip after | its own | step before -> after | after, against the steps near it |
|---|---|---|---|---|---|
| `title` | -55.4 | -1.1 | -2.0 (-17.9: its phrases fall silent between) | 0.0001 -> 0.005 | 0.43 |
| `village` | -41.2 | -1.4 | -2.7 (-3.4) | 0.66 -> 0.05 | 0.14 |
| `baoli` | -10.0 | -0.8 | -2.5 (-9.9: its phrase-end dips) | 0.12 -> 0.002 | 0.08 |
| `akhada` | -38.0 | -25.3 | -21.3 (-24.9: the hits decay 40 dB) | 0.0004 -> 0.001 | 0.07 |
| `island` | -48.0 | -2.0 | -1.5 (-1.7) | 0.005 -> 0.013 | 0.09 |
| `dwarka` | -2.0 | -1.5 | -2.9 (-4.6) | 0.67 -> 0.008 | 0.03 |
| `summit` | -22.5 | -1.6 | -1.7 (-2.5) | 0.69 -> 0.009 | 0.05 |
| `boss` | -32.4 | -0.9 | -1.5 (-3.2) | 0.30 -> 0.06 | 0.26 |
| `andhaka_final` | -2.8 | -0.9 | -2.2 (-3.3) | 0.64 -> 0.02 | 0.08 |

Five are inside 1.5 dB, `dwarka` and `summit` at 1.5 and 1.6, `island` at -2.0 (its own median is -1.5, and its lowest
window is the groove's own pulse 1 s after the join, not the blend). `akhada` cannot be judged by a window rule (its
hits decay 40 dB); its seam is at the floor (-44 dB) before a hit, and the hit spacing across the join is 3.434 s
against the recording's own 3.428 +- 0.004. The step at the join is 0.03 to 0.43 of the 99.9th-percentile step within
50 ms of it: no click (before, `village`, `dwarka`, `summit` and `andhaka_final` jumped by 0.64 to 0.69 of full scale,
`island` by 6 times its neighbours). Inside the blend, the short-time level (0.2 s windows) stays within 1.8 dB of what
two unrelated signals would give (`title` +-1.8, `village` +-1.3, `baoli` +-1.1, the rest 0.9 or less). Where two
near-full-scale sides add, a sample peak can rise a little: `village` 0.90 -> 0.94 and `dwarka` 1.02 -> 1.05 (decoded,
before `TRACK_GAIN`; the file itself decodes above 1), nothing else by more than 0.01; the master compressor takes it.

**Tested:**

- The real `Music` class on an `OfflineAudioContext` at 44.1 and 48 kHz, all nine tracks: its output over three joins
  equals "play 0 to `end`, then `start` to `end`" of the buffer the engine used, to 6e-8 (float rounding).
- The live dev build (Chromium 152, 48 kHz), after a click: all six chapters (`__debug.chapter(0..5, false)`) start the
  expected track (village, boss, akhada, island, boss, summit) with its loop points and `TRACK_GAIN`, and one music
  source alive. For all nine tracks the real-time output at the join (a gap-free AudioWorklet tap, a seek to 3 s before
  it) matches the offline render within 0.1 dB, with no gap and no zero frame. The title's first pass reached its loop
  end in real time (54 s): dip -1.1, no errors.
- Rapid changes: 80 random `play` calls 20 to 350 ms apart (all tracks, `null`, `shiva`, fade-ins from 0.03 to 2 s,
  `duck`, `dim`, `prefetch`, `then`), and then 12 chapter starts 350 ms apart. After the last, exactly one music source
  is alive (48 sources made, one left; 11 made, one left), it is the wanted track, and the drone is silent. Up to 9
  fade-outs overlapped during the first storm, as the existing 1.5 s crossfade always let them.
- The drone fallback: a recording that 404s and one that will not decode both give the existing warning and the drone,
  and the next track brings it down; a replacement file shorter than the table's `end` repeats whole, without error.
- A context suspended 2 s and resumed (same source, sound flows); ducking (0.4) and dimming (0.65) levels as before; a
  one-shot stand-in for `shiva` (no loop points, and `then('title')` handed over when it ended); the game's own pause
  leaves the music alone.
- No console errors from any of it (the two fallback warnings are the existing ones). `npx tsc --noEmit` and
  `npm run build` pass.

**Left for the user, with ears.** Listen to each seam once: the title's (the outro drone morphing into the opening
drone, 1.5 s, at 53.8 s), the short loops (`village` 14.6 s and `island` 17.1 s repeat quickly), `summit` and `dwarka`.
To hear a seam without waiting a minute, in a dev build (`npm run dev`), click once, then in the console:

    const m = __yudhveer.soundFX.music; m.play('village');   // wait until it starts, then:
    const p = m.playing, c = __yudhveer.soundFX.ctx, old = p.src, s = c.createBufferSource();
    s.buffer = old.buffer; s.loop = true; s.loopStart = old.loopStart; s.loopEnd = old.loopEnd; s.connect(p.gain);
    old.stop(); s.start(0, old.loopEnd - 5); p.src = s;   // five seconds before the join

I did not take longer loops whose seams cross two kinds of music (a morph, not a continuation): `summit` 28.8 to 58.8 s
(30 s, spectrum 6.5 dB apart), `village` 25.0 to 58.4 s (33 s, groove to melody), the `island` pad or coda to its
groove (9 to 12 dB apart). If a seam is heard, change that track's `start`, `end` or `fade` in `LOOPS` (seconds) or
delete its line.

**To undo:** empty `LOOPS`. Every track then repeats whole, exactly as before (`loopOf` finds nothing, `blendSeam`
never runs).

### Hit feel and sparks (2026-10-06): DONE; judgement calls, tuning numbers

The user's report: no blow of the sword, lathi or gada is felt on the enemy, only blows taken; sparks at the sword's strike
"a nice touch to have"; the weapon trails read as big flat yellow fans. What was built is in docs/STORY.md, "Hit feel";
before and after contact sheets (the original build against this one, the same scene, camera and frames, stepped at 60 a second)
in `game asset/audit/fixes/hitfeel/`: `sheet_flinch_<lathi|sword|gada|khanda>.jpg` (each weapon on a normal enemy and a boss),
`sheet_sparks_blows.jpg` (a khanda glancing off Andhaka, a sword chipping the Guardian mid-swing), `sheet_sparks_clash.jpg`
(parry and block), `sheet_slam.jpg` and `sheet_slam_khanda.jpg` (blades on stone), `sheet_trails.jpg` (three moments of one
swing, each weapon). `make_sheets.py` rebuilds them from the captures. **ElevenLabs: 52 credits as `estimate_only` quoted them
(17.3 as the six finished takes report), against the 150 allowed.** Three new sounds, two takes each (flow
`VpXZs6ZaWgoOvx9xSfVa`; `game asset/sfx/_hitfeel_sources.json` has every take and why one was picked); at the default length
each node was quoted at 100 credits for two takes, so `duration_seconds` was set (0.8, 1.2 and 0.6 s). No re-rolls, nothing
else paid for or downloaded, no sign-ins.

**The numbers** (each in one place, so each is easy to change):

- *The flinch* (`HitReact.ts`): peak lean of the head in degrees by weapon and tier (light, heavy, slam): staff 5.5, 8, 10;
  blade 5.5, 8.5, 11; mace 9.5, 12.5, 14.5. A boss 0.85 of that; a victim in its own hit clip 0.6, a broken posture 0.5.
  Springs (the head's angle is the sum of its shares: spine 0.78 split evenly, neck 0.14, head 0.05 plus 0.3 of its own
  lagging spring): torso omega 18/s, zeta 0.8, 30 % of the peak jumped to at once, peak at 52 ms and back within 6 % by 234
  ms; head omega 14, zeta 0.7, peak at 76 ms, settled by 280 ms; the twist (omega 20) is 0.55 of the lean at a blow
  straight across the body, 9 degrees at most; no more than 22 degrees however many blows add up. Pushback along the blow:
  staff 3 cm, blade 3.5, mace 7, times 1, 1.3, 1.6 by tier, a boss 0.5 of it, none while the victim is committed to a
  swing, decaying at 14/s (90 % in ~160 ms). The lean follows the blow's direction plus, for a slash, the cut's (blade
  0.56, staff 0.2 of it): from behind the hero a recoil straight away from him is mostly foreshortened.
- *The flash:* a warm glint (1, 0.84, 0.58) on the silhouette with a faint wash over the body: added to the lit colour as
  0.05 plus up to 1.0 by `smoothstep(0.45, 0.95, edge)` (how edge-on the surface is to the camera); starts at 0.5 (staff),
  0.55 (blade), 0.7 (mace), times 0.8 for a light blow, 0.85 on a boss; lasts 80, 75, 100 ms (slam 1.25 times), fading as
  the square, on real time (a hit-stop does not hold it).
- *The camera and hit-stop* (`HitFeel.ts`, `ImpactCamera.ts`): freeze in ms, trauma, kick in degrees, dip, by weapon and
  tier (light, heavy, slam). Staff 65/.09/.42/0, 90/.26/.8/.15, 115/.42/.6/.6; blade 60/.08/.38/0, 90/.24/.75/.12,
  120/.4/.55/.7; mace 85/.18/.35/.3, 120/.45/.6/.55, 150/.65/.5/1.2. The table's own were 40, 75 and 110 ms and are 65, 95
  and 130; a glance 30 is 45 (a mace's 60); the new `thud` (a weapon on stone) 55 ms, trauma .2, dip .55. The budget of
  hit-stop in any half second is 240 ms (was 180). The blade's camera nudge follows the swing for 0.7 of its direction, the
  staff's for 0.25, the mace's not at all. The shake slider scales shake and kick as before and not the freeze.
- *Chingaari* (`ClashFX.ts`): steel 28 sparks, a 0.42 rad cone, 28 % thrown every way, 5 to 12 m/s, living 0.2 to 0.42 s, 2 to
  4 cm wide, tails twice the others'; iron (the mace) 36, 0.55 rad, 35 %, 4 to 10 m/s, 0.22 to 0.46 s, 2.6 to 5 cm; stone
  32, a 1.1 rad fan, 20 %, 3 to 9 m/s. They fall at 18 m/s squared and skitter up to twice (0.34 of their fall, 0.62 of their
  run kept). They start 0.32 m toward the camera and 0.1 to 0.2 m to the near side of the body. Strength: a glance 1.0 (times
  1.15 a tier), a light blow chipping a committed boss 0.5, a parry 1.5, a block 0.65, a floor strike 0.6 to 1.4 by how fast
  the head was falling (0.75 for a blade, 0.6 on Dwarka's wet stone). The light: one PointLight (2.5 m, decay 2), 2.5, 3 and 2.7
  candela at the clash for steel, iron and stone (times 0.55 + 0.6 of the strength, 1.3 at most: a parry's steel is 3.3), 0.25
  m toward the camera from it, gone in 70, 85 and 80 ms, 0 the rest of the time; the scene's lights go from three to four,
  once, at start.
- *Trails* (`SlashRibbon.ts`): life 0.13 s (blade), 0.16 (staff), 0.17 (mace); breadth the last 20, 26, 28 % of the weapon;
  the white-hot line 3.0, 2.4, 2.8 times in HDR, the tinted body 0.85, 0.7, 0.9; the hero's tints gold (`0xffb347`), pale
  bamboo (`0xf0b866`), orange (`0xff8a3a`), an enemy's red (`0xff5a38`, `0xe8804a`, `0xff4a28`). From 60 ms before an attack's
  first strike window to 50 ms after its last.
- *Sound* (`SoundFX.ts`): `hit_wood` 0.6 to 1.5 (see below), `blade_clang` 1.4, `stone_slam` 0.7, `lathi_crack` 1.0; the
  synthesized layers under every blow (a sine falling from ~120 Hz for the staff, ~108 for the blade, ~78 for the mace, 0.17
  to 0.34 s) and each weapon's own (the crack, a 5 kHz hiss, a 62 Hz boom and a recording of the mace's blow at 0.62 speed,
  and the chips falling); one set per 45 ms however many are struck in a sweep. Levels through the real chain (peaks): the
  staff's blow -6.3 dB (-4.7 heavy), the blade's -6.4, the mace's -4.3 (-4.8 slam), a steel glance -7.5, an iron one -6.4, a
  stone strike -5.8, against the parry's -6.5 and the block's -7.

**Calls made**, each easy to undo:

- **The flinch is a layer of the simulation step, after the rig update, as asked, and not a render-time effect.** So it
  lives in the pose the hit-stop holds and the render interpolation blends, a hit starts it at 30 % of its peak at the very
  frame of contact, and it also moves the victim's weapon hand by a few centimetres for a quarter of a second (a boss's
  swing a hair short, never a state change). A render-time layer would have left even that alone but would not have shown
  up in the stepped captures; if the weapon hand's few centimetres ever matter, it is a change to `applyBones`.
- **Sparks where it is armour or stone, not on flesh.** A committed enemy's light chip draws chingaari only on a boss
  (`armored && isBoss`, steel and iron, not the staff), the one that already says "your blow did not interrupt this": a
  minion's blow draws its blood (or the old puff with Gore off) as before. Andhaka's hide (the only `armorDamage` below 1)
  is the glance. The staff throws no sparks anywhere (on a hide, a puff of dust; on the dhal, a little dust shaken loose).
- **The flash and the clash light were turned down after the first contact sheets** (the victim whited out at contact, the hero
  at a parry or a block). The flash was a wash of 0.16 plus a wide rim, 0.8 to 1.0 to start; it is now the glint above. The
  light was 8, 10 and 9 candela over 6.5 m: a toon material lights every face turned any way to a light (its ramp never goes
  to black), so a flash bright enough to show on the blades lit the whole body a metre off. Measured on the side view of the
  parry (the hero's mean brightness inside his own box, contact frame, the light on against the same frame with it off):
  +64 % then, +30 % now (the torso +29 %, now +17 %); a block +44 %, now +17 %. Only the flash and the light changed (the
  sparks, sounds, camera and flinch are as they were), and the sheets (`sheet_flinch_*`, `sheet_sparks_*`, `sheet_slam*`) are
  re-shot with the final numbers.
- **The old parry starburst and the red block puff are gone**, replaced by the same chingaari (the parry at 1.5). The parry's
  and the shield's sounds are as they were.
- **The mace's floor strike is where the downswing bottoms out within 0.55 m of the stone,** still falling at 4.5 m/s or more:
  its head stops 0.4 to 0.5 m short of the floor in every downswing (the clips were made for a longer blade, as Dwarka's
  splash already reads it). That is the plain chop (`ATTACK_1`), the spin finisher and the leap, not the sweep (`ATTACK_2`,
  0.79 m). A blade only on its leap. Not if the swing has already landed on someone. Measured on the khanda's leap on the
  summit's stair: the blade is planted at 0.2 m by frame 48 and the sparks come at 47. Enemies' own slams (Shalva's, Andhaka's)
  already have dust, a ring and a quake of their own (their files are another pass's) and were left alone: giving them
  `HitFeel.floorStrike` is one call per fighter.
- **`hit_wood` was 11 to 13 dB under the blade's and the mace's** (the old recording peaks at -24 dBFS, a low thud with no
  crack in it), which is part of why the lathi felt like nothing. Raised from 0.6 to 1.5 in `SAMPLE_GAIN`, and the crack
  laid over it. This changes the mix of the first two chapters: their blows are 12 dB louder.
- **The trails are not in the bloom.** They were not before; tried, it changed nothing visible (the levels' thresholds sit
  above them), so no per-character selection to keep and release.
- **The hero is not flinched** when he is struck (his hit clips and the screen's pulses already carry it).
- **Not done:** the island's expedition fights were checked for their bones (every rig resolves its spine, neck and head by
  ancestry) and one cave runt was hit, not played through; the real-time loop was driven by hand (frames at 14 ms in a hidden
  pane) for the freeze, the flash and the shake, not played with a pad. Sound was measured, not listened to.

**Checks.** `npx tsc --noEmit` and `npm run build` pass, and the production bundle has no `__debug`. No console errors across
all chapters, Gore off and full, the shake at 0. Stun-lock: fifteen seconds of light blows on the Guardian (twice), Shalva and
Andhaka, the original build against this one, the same harness: the Guardian's two runs are identical to the blow (21 blows,
2 attacks, 0 staggers, 93 hp left; then 15 blows, 1 attack, 4 posture breaks, dead), Shalva's too (11 blows, 1 attack, dead);
Andhaka (random in his choices) 13 blows and 5 attacks before, 19 and 4 after; no stagger anywhere, and every boss that lived
kept attacking. Frame time in the heavy fights (three raiders on the hero in the village, Shalva at Dwarka, the summit with its
rakshasas, all attacking, 400 stepped frames each with render and a GPU sync), the two builds interleaved: the simulation step
1.64 ms before and 1.63 to 1.70 after (village), 0.65 and 0.78 (Dwarka), 1.21 and 1.49 (summit, random fights), the frame
7.18 and 7.30 ms, 5.99 and 6.32, 6.50 and 6.72, all inside the noise of a GPU shared with other work (the fourth light itself:
the same 7.45 ms with it hidden); nothing is allocated per blow but the sparks' own small objects, as before, and no light,
material or geometry.

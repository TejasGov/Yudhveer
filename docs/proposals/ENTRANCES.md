# Entrances as bridges: the boss and character entrance overhaul (Shalva, Takshaka, the Baoli Guardian, the Vetala and the Mayavi DONE 2026-10-07)

The user: "the entrances of the bosses and characters [except the final boss] ... it is too ps3 tekken like right now.
Imagine Aura scenes, suited to each character, there's too much dialogue in the game for 2026 attention spans ... so
these entry scenes act as the bridge between chapters not mere game angles." With concept art for Shalva: a tiny
armoured figure far out on a storm sea, lightning striking down into the weapon he holds; close, the knight rising out
of the ocean with the water bursting away from him; the figure again, distant, the sea rushing at the camera.

Andhaka's entrance is excluded (it is the bar). This document is the audit of every other entrance, the grammar the
new ones follow, what is in the game now (Shalva's storm entrance, Takshaka's rise, and the engine pieces they stand
on), and a ready-to-build storyboard for each of the rest, with its dialogue cut. Costs that need a yes are in
`docs/APPROVALS.md` ("Entrances").

## 1. The audit

A read-only pass over `src/cinematics/`, `src/game/stories/*.ts`, `src/core/Engine.ts` and the levels, with the
shot lists timed against the recordings in `public/assets/voice` (unspecified shots last as long as their lines:
`Scene.ts`, `compile`). "w" is words spoken.

| Entrance | Where | What happened | Lines / w | Time before the fight |
|---|---|---|---|---|
| Prologue raiders | `stories/Prologue.ts` 285-373 | A horn, three raiders step out of the gate glow, a "Raiders" card. Good. | 5 / 46 (the lesson) | ~36 s |
| Prologue Andhaka's shadow | `Prologue.ts` 393-500 | Silhouette, footfalls that jolt the camera, the gate light, the boy's concussion. The closest to the bar. | 4 / 41 | (the ending) |
| Baoli Guardian | `stories/Baoli.ts` 341-397 | The hero walks in; the boss, already on its mark since the spawn, plays the roar; a low tilt-up copied from `bossReveal`. | 4 / 36 | ~80 s incl. the Devi scene |
| Vanara mentor | `stories/Akhada.ts` 323-443 | No entrance: he is the sparring partner. The dhal hand-off is staged well. | 5 / 45 | ~34 s |
| Vetala, Mayavi | `Akhada.ts` 293-310, 491-570 | `closeUp()`: a 2.9 s card each, in place. | 3 / 27 | ~22 s |
| Island runts, hurlers | `IslandExpedition.ts` 33-100 | Spawned visible on a radius trigger; a HUD callout. No entrance at all. | 0 | 0 |
| **Shalva** (before) | `Intros.ts` 65-85 + `Dwarka.ts` 404-480 | 18.5 s of establishing, the generic roar (6.2 s), a hero shot, then a 4-line opening in which he roars **again**. He stood on the rosette from the spawn. | 4 / 48 | **~61 s** |
| **Takshaka** (before) | `Engine.ts` `finaleArrives` | Spawned standing on the floor 7 m from the hero; the generic roar and card. The code comments said he "comes up out of the sea"; nothing rose. | 0 | ~9 s |
| Summit waves | `Intros.ts` `enemyCloseUp` | A 3.4 s horde card. | 1 / 9 | 15.8 s (Andhaka) |

**Weakest to strongest:** Takshaka, Shalva, the island monsters, Vetala and Mayavi, the Baoli Guardian, the vanara
(no entrance needed), the prologue raiders, the prologue shadow.

**Why they felt like PS3 Tekken.** Three systemic causes, not nine separate ones:

1. **One camera template.** All four boss reveals were `bossReveal` (`Intros.ts:65`) or its Baoli copy
   (`Baoli.ts:373`): low, weapon side, three keys, tilt up. The talk scenes were two-key pushes of about a metre
   (`Story.ts:78-249`). Only Andhaka's entrance cut to the marks of a clip.
2. **Dialogue set the pace.** A shot lasted as long as its line (`Scene.ts:436`, `:443`), and the roar came last,
   after the talk (`Dwarka.ts:459`, `Baoli.ts:373`). There was never a distance shot or a scale shot: the boss was
   always already on his mark when the camera found him.
3. **The world never answered.** No stings (`SoundFX` had none), the music dimmed to 0.65 in every scene, lightning on
   a random timer only (`SoundFX.ts:661`) and never on cue, no `cue()` on Baoli or Dwarka, and bosses popped onto a
   mark (`Engine.ts:105`, `:198`). All four reveals shared one roar clip, `mutant_roaring`.

## 2. The grammar

Every new entrance is four beats in 10 to 16 seconds, with at most one spoken line, and the name card over the roar:

1. **The far shot.** A small figure in a big hostile place. A long lens, almost no camera move. The weather is the
   first actor (the sea, the rain, the snow, the lamps).
2. **The world reacts first.** Lightning, lamps flaring, water opening, fog parting: the place announces him before
   the camera shows his face.
3. **The reveal, slowed.** Close or low, in slow motion (`SceneShot.timeScale`), then back to full speed. A
   Snyder-style ramp without the post-processing.
4. **The arrival.** He does something physical to the arena (a landing, a shockwave, a rise through the floor), the
   camera takes one jolt, the ground answers (`landing()`), and the card lands in Devanagari and Latin as he roars.

References the storyboards lean on (shot-by-shot from memory; scrub the links): Elden Ring's Radahn intro
(https://www.youtube.com/watch?v=hC0Q7dG2S_g, arena scale first, the face after), Sekiro's Isshin (cutscene at 2:06 in
https://m.youtube.com/watch?v=9XCUb--5nzI, a small figure in a burning field, then tight on the draw), Shadow of the
Colossus's Valus (https://www.youtube.com/watch?v=II0ldngC1nI, feet and silhouette first, tilt up on a horn swell),
Ghost of Tsushima's Kurosawa mode (stillness, then a clean reverse cut), Zack Snyder's speed ramp
(https://studiobinder.com/blog/zack-snyder-movies-directing-style), and the Indian iconography named per character
below. For myth: Shalva's Saubha, a flying city "filled with darkness" that moved like a whirling firebrand
(Bhagavata 10.76, https://bhagavata.org/canto10/chapter76.html); the naga king Mucalinda's seven-hood crown over the
Buddha (https://termatree.com/blogs/termatree/naga-buddha); the Vetala hanging from its tree in Vikram-Betaal
(https://en.wikipedia.org/wiki/Vetala); Hanuman as patron of the akhara, wrestlers touching the soil before practice
(https://people.howstuffworks.com/culture-traditions/cultural-traditions/kushti-indian-traditional-mud-wrestling.htm).

## 3. In the game now (2026-10-07)

The third pass, after "no funny running ... i want these scenes to have AURA": Shalva no longer runs anywhere (he
goes up out of the sea in one bound and comes down out of the storm), and the Baoli Guardian, the Vetala and the
Mayavi have entrances of their own, and the old vanara a prelude. Five Mixamo clips were downloaded for them
(2026-10-07, without skin, 30 fps, `Entrance-` in `game asset/characters/animations/`): "Hanging Idle", "Freehang
Drop", "Falling Idle" and "Hard Landing" (the Vetala; Shalva carries the last two too, unused yet), and "Sitting Idle"
(`wall_sitting_idle`, the vanara, who also takes Andhaka's "Sit To Stand"). The rest is the library the game had.

### The engine pieces

- **Slow motion and speed ramps:** `SceneShot.timeScale` takes a number or a ramp, `[[seconds into the shot, speed],
  ...]`, eased between (`CinematicDirector.rampAt`, `TimeRamp`): full speed into a leap, down to 0.16 as he leaves the
  water, back up as he clears the frame. The camera, the lines and the shot's own clock keep real time; the fighters,
  the cast, `SceneFX` tweens, the particles and the level's clock (rain, sea, sky) run at the ramp's rate
  (`Engine.gameLoop`, `debugAdvance`). Cue times are real seconds; tween lengths are world seconds.
- **Lightning:** `Lightning.bolt(to)` (a jagged bloom-bright ribbon from 60 m up, two branches, a flicker and a
  re-strike), `Entrance.strike(strength, lag, { at, level })` (the bolt, the storm deck's glow aimed over it with
  `StormSky.strikeAt`, the flash, the thunder after). Under the storm grade the light flares less (`SoundFX.strike`'s
  `flash`) so the bolt still reads against the sky, and the grade itself lifts toward white for a moment.
- **Lightning on a body:** `Lightning.crawl(points, seconds)` / `Entrance.charged(actor, seconds, { color })`: short
  jagged arcs leaping between the character's own bones, re-rolled many times a second, bloom-bright, in any colour
  (storm blue on Shalva and Takshaka, ember on the bound Guardian).
- **The storm grade** (`StormGradeEffect`, last in the main effect pass): the picture graded in display gamma by a hard
  S-curve (the storm's sky up to silver, the sea down to slate, the blacks crushed so a figure against the sky is a
  silhouette), a breath of cold put on after the curve (before it, the curve multiplied it into the shadows and the
  first pass came out blue), living grain, closed-in edges, and a `flash` for lightning. `Entrance.grade(amount, s)`.
- **A storm on the sea:** `LivingSea.surge(heave, storm)`: the swells' height alone raised (their reach untouched, so
  the crests never loop) and whitecaps torn off the highest crests with spume streaks down the wind (`seaCaps`), the
  shore's flat cel foam put away while it lasts. `seaLevel()` is the still water's height, for cameras that ride above
  the swells. The CPU copy (`seaHeight`) follows the heave, so anything floating rides the same sea.
- **Water:** `seaBurst(centre)` (a ragged foam front torn out across the water, broken into clots and tongues, no
  longer a regular ring) and `waterColumn(centre, { height, radius, onFloor, core })` (the sea thrown straight up in a
  streaked column that erupts, hangs and comes apart; `core: false` for the veil alone when someone must be seen in it).
- **The ground answering:** `Shockwave.groundShock(at, { color })`: a ring of light racing out across the floor and
  cracks torn out through the stone glowing in the striker's colour, cooling to dark scars. `Entrance.impact(at)` is the
  whole arrival: the shock and cracks, the dust, the quake and the jolt (`landing`), the sub boom, the sound back.
- **Eyes:** `Entrance.glowingEyes(actor, { color })`: two hot points and a glow kept on the head bone as it moves,
  kindled and put out by the scene (the Guardian's ember). The Vetala had pale green ones; the user found them abrupt
  and bad, and they are gone.
- **Sound, synthesized** (no recordings, no credits): `SoundFX.hush(level)` (the rain, the sea, the wind and the music
  down for the vacuum before a blow; `Entrance.hush` puts it back when the chapter is left), `playRiser(seconds)` (air
  rushing up a rising filter, a climbing tone, cut dead where the blow lands), `playImpactBoom()` (a sub drop, the crack
  of stone, debris), `playSting(pitch)` (a double stroke on the big drum under a dark brass chord: root, fifth, octave
  and the flat second, Bhairav's colour; re-tuned per character). Levels checked offline: the boom and the sting peak
  about -2 dBFS through the master compressor (the chapter card's hit about -6 to -8), the arrival's biggest moments.
- **Pose holds:** a scene holds one frame of a clip (`playClip` with `startAt`, then `rig.hold`), which is how one
  Mixamo clip is cut across four shots (Shalva's bound) and how the Guardian crouches like a carving.
- **The stepwell's lamps:** `Level1_Baoli.lampStands()`, `setFlames(group, amount)`, `getFlames`: each stambha's
  flames, its torch light and the lamps' glow halos dim, flare and gutter together.
- **The name card in Devanagari:** `Enemy.nativeName` over the Latin name (Shalva, Takshaka, the Baoli Guardian, the
  Vetala, the Mayavi). Andhaka's card is unchanged.
- **A boss arriving mid-fight stages its own arrival:** `Boss.arrival(ctx)`. The finale's mark can now be worked out
  from where the fallen lie too (`Finale.at(hero, fallen)`): Takshaka rises clear of Shalva's body.

### Shalva: the storm entrance (`src/game/stories/Dwarka.ts`, `dwarka-storm-entrance`)

Chapter IV's intro is one 7 s overview with the chapter card; then about 21 s of entrance, two lines and the fight.
From the first frame the picture is in the storm grade and the sea is in a storm (`seaStorm`: heave 1.7, whitecaps).

| | Shot | Real s | What happens |
|---|---|---|---|
| 1 | On the water 40 m out (past the reefs), long lens | 2.9 | Nothing but the heaving sea and the sky. At 1.5 s lightning comes down into the empty water far out and the sea bursts where it struck. |
| 2 | Close and low at the waterline, ramping down to 0.4 | 3.6 | Where it struck, he comes up out of the sea roaring at the sky (`mutant_roaring`), a black shape with a cold rim, the storm crawling over his armour, a bolt onto him. He rides a third of the swell, so the sea heaves about him. |
| 3 | Far again, 40 m out, wide (image one) | 3.2 | A small black figure standing thigh-deep on the storm sea lifts his gada to the sky (a held frame of `standing_melee_run_jump_attack`, blended into over a second) and the bolt comes down onto it; a second follows. |
| 4 | Low on the water beside him; ramp 1 to 0.16 at takeoff, back to 1 | 2.9 | He crouches and goes up out of the sea (`mutant_jump_attack`: its crouch, its takeoff at 0.55 s, then held on its rising frame as the scene carries him up at 24 m/s): the sea thrown up after him in a 20 m column, a burst across the water, a bolt with him; then he is gone out of the top of the frame. |
| 5 | On the arena's stone, low behind the boy | 2.4 | Out of the storm over the sea's edge a black shape is falling at him (held on the clip's falling frame), a bolt behind it. The rain and the sea go quiet (`hush`), and a riser swells. |
| 6 | Low and wide in front of the east mark; ramp 0.32 to 1 at touchdown | 3.5 | He drops into the frame and the clip runs on to its touchdown exactly as his feet reach the stone: the stand-in goes and the boss is there in the same frame of the same clip, in colour; a bolt comes down with him, the floor cracks out in lightning, the boom, the colour and the world's sound come back with the blow. He is down in a three-point crouch, fist and gada on the stone, and rises. |
| 7 | Low in front of him, on the line to the boy | 2.7 | The roar from its second beat (turned so that at its height he roars straight down the lens) and the card, a sting under it: शाल्व / Shalva / Raider of Dwarka. |
| 8-10 | | | "Where is my guru?"; his one line; the hand-off to the fight (as before). |

Cut, against the first two passes: the run across the water (the sprint clip at 11 m/s on the sea read as jogging on
water), the leap from the shore's edge, and the overhead smash on landing.

### The Baoli Guardian: the carving wakes (`src/game/stories/Baoli.ts`, the stepwell half of `baoli-opening`)

| | Shot | Real s | What happens |
|---|---|---|---|
| 1 | Low behind the boy walking in | 4.4 | The well's lamps burn low (0.12). At the island's middle a great stone shape crouches with a fist on the step (`mutant_jump_attack`'s landing, held), ember threads of Andhaka's binding crawling over it. |
| 2 | Low in front of it, off its weapon side | 3.4 | The lamps flare up one after another (1.6, each throwing fire off its crown with a roar of flame), from the far stambhas in to it, then the diyas and the hanging lamps; the stambha behind it last, rimming its shape. |
| 3 | Close and low on the stone face, ramping to 0.4 | 3.6 | Its eyes kindle ember (`glowingEyes`), the binding flares over it, a riser; it lifts its head and rises out of the crouch. |
| 4 | Low and wide from the boy's side | 3.6 | It brings its weapon down on the step (`standing_melee_attack_downward`; its roar as the blow begins): the stone cracks out in ember, the boom, every lamp in the well gutters to 0.15 and catches again; the card and a sting. |
| 5-6 | | | The guru's "Look at its feet" (kept); the hand-off, wordless. |

Cut: the boy's two lines ("Their tracks end at the water..." and "Stand aside...") and "Feet first, Guruji." Its eyes
burn through the fight and go out as its shade rises (freed). The Devi scene before it is unchanged.

### The Vetala and the Mayavi: the night visitors (`src/game/stories/Akhada.ts`, `akhada-arrival`)

| | Shot | Real s | What happens |
|---|---|---|---|
| 1 | The two of them | 2.6 | The vanara grounds his staff and lifts his head to the roof; the night comes down (`nightfall`). |
| 2 | Low in the court, up at the octagon's rim (fov 20 to 15) | 3.0 | Something hangs by its hands from the rim's edge 15 m up (`hanging_idle`), a dangling shape against the stars, swaying. |
| 3 | Low on the court's east side; ramp to 0.3 at the landing | 3.0 | It lets go (`freehang_drop`'s release) and falls the fifteen metres into the court (`falling_idle`, a stand-in from the cast), turning as it comes to face the boy, and comes down in a three-point landing on its mark (`hard_landing`, the real Vetala taking over in the same frame): dust off the stone and no sound at all (the world hushed). |
| 4 | Close and low on its face | 2.8 | It lifts its head and rises (`power_up`); the card, a sting pitched high. |
| 5 | Across the court, the west side | 3.0 | Smoke rises off the stone from nothing; in it, three of the Mayavi standing in a triangle, all casting (two of them violet ghosts from the cast). |
| 6 | Close on him | 3.0 | The two false ones flicker and go out; the one left flings violet fire at the stone (`magic_attack_01`, violet cracks); the card and a sting. |
| 7 | | | The vanara's one line, "These two are yours. Show me what the dhal is for." (kept). |

Cut: "Enough. You will do... for a farmer." and "Hm. You did not climb this hill alone, boy." The Vetala hangs from
the octagon's rim, not from the Hanuman monolith, out of respect for the shrine.

### The old vanara: the prelude (`src/game/stories/Akhada.ts`, the start of `akhada-opening`)

A teacher, not a threat. Two shots before the sparring montage: wide at sunset off the boy's shoulder up the empty
pit, one stroke of the temple bell (`SoundFX.playTempleBell`), and at the far end the old vanara sitting on the
plinth beside the Hanuman monolith (0.52 m high) with his staff across his knees (`wall_sitting_idle`); then low and
three-quarters on him as he turns his head and gets up (`sit_to_stand`), and his small card: Old Vanara / Teacher of
the Hanuman akhada. No line. The montage starts from there (the sparring vanara takes over).

### Takshaka: the rise (`src/entities/BossTakshaka.ts`, `arrival`)

As before (the dark water opens, the hood breaks the surface, the roar and the card), and now: the world hushes and a
riser swells as the water opens; the rise ramps to 0.35; a veil of torn water goes up with him (`waterColumn`, veil
only, so he is seen inside it) and the storm crawls over his hood; as he stands the stone cracks out from him in naga
green with the boom and the sound coming back; a sting under his card. He rises on the 7 m ring at least 4.5 m clear of
the hero and of Shalva's body (it lay across the water's rim in a test, his gada filling the close shots).

**Verified** (2026-10-07), each through the fixed step with every shot captured to disk and looked at frame by frame,
no console errors: Shalva's opening to the hand-off; the Guardian's waking to the guru's line; the night visitors to
the vanara's line; Takshaka's rise to the fight. **Not yet seen at full speed with sound by a person.** Test:
`__debug.chapter(4, true)` (Shalva), `__debug.chapter(1, true)` (the Guardian, after the Devi scene),
`__debug.chapter(2, true)` and pass the parry lesson (the night visitors), `__debug.chapter(4, false)` then
`__debug.win()` (Takshaka).

### The bridges and the fallen (2026-10-07)

The user asked that the chapters connect and that the fallen stop all rising as the same blue spirit. The bridges (the
Guardian glimpsed in the Baoli's establishing, the boy's plea to the Devi, the dive into the glowing water, the climb
up Dwarka's west face and "SHALVA!", the tilt up into the storm that the summit's sky picks up) and the three different
ends (the Guardian kneels and turns to stone, Shalva stands until his own sea takes him, Takshaka burns away in naga
fire) are in `docs/STORY.md`, "The bridges between chapters" and "How the dead speak". New Mixamo clips: Run To Dive,
Climbing Up Wall, Braced Hang To Crouch and Yelling Out (the hero); the Guardian takes the hero's kneels.

## 4. The storyboards still to build

Each is the grammar above, cut to the character; "needs" names engine work beyond what is in now. Lines are subtitle
text unless marked (voiced).

### ~~The vanara mentor (Chapter II)~~ (built, section 3; the storyboard as it was)

A teacher, not a threat: warm. Today he is simply the sparring partner when the scene opens.

1. (3 s) Wide at sunset, the pit empty, dust in the light, one bell (`SoundFX` has the ghanta: a single stroke).
2. (3 s) Push in on the Hanuman shrine; a lamp is lit (the akhada's `FireField` cue 'dusk' already lights them).
3. (2 s) Low three-quarter: the old vanara sitting on the pit wall, staff across his knees, turning his head.
4. (2 s) The hero's eye line: he touches the soil to his forehead (no clip: the kneel `kneeling_down` at 0.6x,
   or skip), and rises. Card, small: the mentor's name in Devanagari (वानर) over "Old Vanara / Teacher of the Hanuman
   akhada".

Dialogue: keep "Here. A dhal is not for hiding." Cut two of the other four. No cost.

### The island (Chapter III)

The caves are the one explorable chapter; its monsters come on a radius trigger with a HUD callout. The Descent's
rule: light only from what is carried. Two short beats, not cutscenes, so exploring is not interrupted:

- **The hurler's first firebrand** (3 s, the first encounter only): a 2 s slow-motion beat (`Engine.slowMotion` is
  private and outro-only: expose a 2-second variant for the expedition's first encounter) as the brand lights its
  face for one frame, then the throw. A small card: the hurler's name.
- **The mace** (the ending, already a scene): add the shaft of light from the ceiling crack onto the stone before the
  hand closes (`DivineLight.intoLight` exists), and a 1.5 s slow lift with the shadows on the wall growing. Cut the
  ending's four lines to the shrine's "Go to Dwarka" and one more.

### Takshaka's dying prophecy (Chapter IV, the ending)

The entrance is done (above). The ending already kneels and draws well. Two changes: cut his first line ("A hundred
years I kept the sea...", 51 w in all) to the prophecy and "Take my sword" (APPROVALS: a trim, not a re-record, if the
recording has a pause to cut at; else re-record); and a vision in the blade as it lights (the summit's eclipse sky
drawn small in a bloom sprite, `glint()` from the prologue).

### Yudhveer's own arrivals (every chapter)

A 4 s signature at the end of each establishing: the weapon's butt tapped once on the ground (the lathi, the sword,
the mace), cut to his boots with a ring of dust, then a low angle on his face; the same three shots every chapter
with only the place's FX changing (drips, sunset dust, torchlight, rain, snow). Kurosawa stillness. Needs: a tap clip
(none; use the first frames of the idle with a `joltCamera(0.03)`) and a small motif (a sting, APPROVALS).

### The summit waves (Chapter V, light touch)

No cutscene. The first rakshasa to top the bridge gets a one-frame low angle through `enemyCloseUp` as now, but with
a snow gust (`WeatherParticles` burst) and a howl (`playRoar(1.4)` at low gain) a second before. The yatudhanas: a
red eye-flash (their emissive, a `SceneFX.tween`) as they come out of the mist. Andhaka is unchanged.

## 5. The dialogue cut, scene by scene

| Scene | Now | Keep | Cut or show instead |
|---|---|---|---|
| Prologue lesson | 5 / 46 w | "Keep your feet" (the summit's payoff) | the rest: show the lesson |
| Prologue Andhaka | 4 / 41 | "Kneel"; the guru's "Leave the boy" | the vow to one short line |
| Durga | 4 / 51 | the kavach promise, "follow it" | the "stick of bamboo" exchange |
| **Guardian walk-in** | 4 / 36 | the ghost guru's "Look at its feet" | **done**: 1 / 11 (the carving wakes instead) |
| Guardian ending | 6 / 74 | Andhaka named; "go to the Hanuman akhada" | trim the rest |
| Akhada opening | 5 / 45 | "Here. A dhal is not for hiding." | two of the others |
| **Akhada arrival** | 3 / 27 | "These two are yours..." | **done**: 1 / 11 (the Vetala and Mayavi are shown) |
| Akhada ending | 7 / 80 | Dwarka, Shalva's mace, the island | "Not a farmer", the questions, the 14 s "Out past the city" |
| Island | 5 + 6 + 4 | the boatman's lamps; the shrine's "Go to Dwarka" | the rest |
| **Shalva opening** | 4 / 48 | "Where is my guru?"; "Beat me and I will tell you" | **done**: 2 / 27 (and "SHALVA!" before it) |
| **Shalva falls** | 7 / 99 | Andhaka burns wise souls; the guru on the summit; "serpent king" | **done**: 4 / 56 |
| **Takshaka dies** | 3 / 51 | the prophecy; "Take my sword" | **done**: his first line cut |
| **Guardian ending** | 6 / 74 | "The dark... let go of me"; "Go to the Hanuman akhada" | **done**: 2 / 21 |
| **Akhada ending** | 7 / 80 | Dwarka; the island's mace; "keep the dhal up" | **done**: 4 / 51 |
| **Durga** | 4 / 51 | the boy's plea (new); "Follow it"; the kavach | **done**: 3 / 38 |
| Summit ending | 11 / 94 | the beats | trim lines |

Everything voiced that is cut costs nothing; everything shortened that is voiced is a re-record (about 1.2 credits
per character per take, two takes), listed in APPROVALS.

## 6. Engine work still wanted, in order

1. ~~The bolt on the target~~, ~~a speed ramp~~, ~~stings~~ (synthesized), ~~lamp cues on the stepwell~~ (`setFlames`),
   ~~a sea surge~~ (`LivingSea.surge`): done (section 3).
2. **A world-time hold on the first encounter** (S): the island's slow-motion beat.
3. ~~Mixamo clips~~: downloaded and in (section 3). Shalva has "Falling Idle" and "Hard Landing" built in but keeps
   the jump attack's held frames and three-point landing, which read heavier with the gada.
4. **Not worth it now:** depth of field or a rack focus (the post stack is ink, bloom, vignette, tone, grade; a DOF pass
   is M and costs frame time on the sea), a dolly-zoom helper (fov and position are already keyed together: author it).

## 7. What a yes is needed for

See `docs/APPROVALS.md`, "Entrances": the shorter Shalva line (re-record), Takshaka's trimmed first line (an audio
cut or a re-record), the optional stings (ElevenLabs sound effects), and the Devanagari spellings on the cards.

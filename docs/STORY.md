# Yudhveer: story and progression plan

The design document for the campaign's story and the hero's growth. **Read this first** in any session that works on
story, levels, progression or new characters, and update it when a milestone lands or a decision changes.

## The idea

Yudhveer is a young Indian yodha who sets out to defeat evil. He must not start strong: if the player has the best
sword and shield from the first minute, the game becomes Tekken or Mortal Kombat, and the feeling of perseverance,
struggle and a true warrior spirit is lost. So he starts with almost nothing, loses the first fight that matters,
and earns every weapon and skill on the road. Each chapter prepares him for the next.

## Andhaka's purpose

Andhaka gathers **wise, intelligent souls** to sacrifice before his deity. Through those sacrifices he means to
challenge the divinity of Lord Shiva and set himself up as the ultimate ruler. That is why the village was raided
and the guru taken: the guru was a soul worth sacrificing. The irony the ending turns on is that the guru is Shiva
himself: Andhaka has carried his own judge up the mountain.

## The story, chapter by chapter

### Prologue: the village raid (new map)

- His village (desert, dusk). Yudhveer trains with a lathi under his guru.
- **A very small arena**, not explorable. Goons raid the village; he fights a group of them and is **defeated**.
- **The guru appears to be killed** in the raid. In truth he is **captured**.
- Behind the raid stands a huge figure with a great sword: **Andhaka, seen only as a silhouette**. He is never shown
  in the face here, only his size and his blade against the light. The mystery stays until the summit, where his
  entrance (the smile, the crown, the sword drawn from the stone) reveals him at last.
- Yudhveer sets out after him.

### Chapter I: the Moonlit Baoli (existing map)

- **Why he is here:** the raiders fled with the guru through the old baoli. The stepwell outside the village hides
  a passage they used, and Andhaka's darkness has bound the Baoli Guardian (once the well's protector) to block
  anyone who follows.
- **Weapon: the lathi only.** No sword, no shield.
- He fights the Baoli Guardian by **remembering his guru's teachings**: the guru's voice and memories guide him
  through the fight, teaching the basics as he needs them.
- **Freed by its defeat**, the Guardian tells him a lathi will not carry him further: he must go to the vanaras of
  the Hanuman akhada to learn to truly fight.

### Chapter II: the Hanuman forest akhada (existing map, relit)

- **The look changes:** the same forest area, but no longer only the blue and red night lighting. It becomes a
  **sunset day scene**, warm and cinematically beautiful, while the mentor teaches; time moves on, and by the time the
  Vetala and Mayavi show up it is the old blue and red night, the akhada's lamps lit (see "Day into night", Milestone 6).
- **Opening cinematic (not playable):** Yudhveer learning to fight with a sword.
- **Then gameplay:** an **old vanara (monkey-like) mentor** teaches him. He **gives Yudhveer the shield** and teaches
  him to block and **parry** and to fight properly.
  - The mentor is the user's own model (an old monkey sage with a staff), in the game since 2026-10-05.
- **Weapons: a very basic sword and the shield.**
- He clears the chapter with them (the Vetala and Mayavi).
- **At the chapter's end**, with both bosses beaten, he learns he must go to **Dwarka**, where he will find out why
  his village was attacked. He also learns that Dwarka's boss (Shalva) fights with a **mace**, and that a sword
  will not be enough against it: hence the island and its blessed mace.
  - *In the game since milestone 6* (`src/game/stories/Akhada.ts`, `akhada-ending`): the vanara mentor's scene, not
    the fallen Mayavi's. He sends the boy to Dwarka to learn why his village burned, warns him that Shalva's mace
    has broken better blades than his, and tells him of the blessed mace on the island. See "Milestone 6" below.

### Chapter III: the island (new map, its own chapter)

- He learns that a **blessed mace** is kept on the island.
- **Underground:** dark, lit only by lamps and fire, in the spirit of the *Anaconda* films (tension, the unseen in
  the dark).
- **The one explorable mission in the game**, because exploring is the mission: he searches the caves for the mace.
- He wins it by defeating the island's **mini monsters** and **archer monsters**.
  - Both are placeholders for now; the user will make them later.

### Chapter IV: Dwarka (existing map)

- **Weapon: the blessed mace, two-handed. No shield** while he carries it. The mace has its **own animation set**
  (heavy two-handed swings), different from the sword's.
- At Dwarka he learns the truth: **Andhaka and his purpose** (see above).
- He defeats Shalva, mace against mace, then Takshaka.
- **Takshaka's dying prophecy.** As the serpent king dies, he tells Yudhveer that Andhaka cannot be defeated, then
  realises he was foolish not to see it: Yudhveer has set his purpose and is destined to free them all from Andhaka's
  reign. Takshaka **grants him the magical sword**.
  - This is the sword the hero carries in the game now (`yodha_khanda.glb`).

### Chapter V: the Kailasha summit (existing map)

- **Weapon: the magical sword** (with the shield).
- It plays as it does now: rakshasa waves over the bridges, then Andhaka's entrance and the final fight.
- **Add a second minion type** alongside the current rakshasas, for variety. Placeholder for now.
- **The final reveal:** the guru, thought dead and in truth Andhaka's captive, is revealed to be **Lord Shiva
  incarnate**: the statue of Shiva on the summit. The teacher was the god all along.

## Weapon progression

| Chapter | Weapon | Shield | Skills unlocked |
|---|---|---|---|
| Prologue | Lathi | none | strike (single blows), dodge |
| I. Baoli | Lathi | none | the guru's teachings, learned during the fight |
| II. Hanuman forest | Basic sword | **Dhal, from the vanara mentor** | block, parry |
| III. Island | **Blessed mace** (two-handed) | none | heavy two-handed blows |
| IV. Dwarka | Blessed mace (two-handed) | none | (to decide) |
| V. Summit | **Magical sword, from Takshaka** | dhal | the full kit |

## Placeholders to replace later (the user, with Meshy)

- The island's mini monsters and archer monsters (Chapter III).
- The second minion type on the summit (Chapter V).
- The lathi, the basic sword and the blessed mace models (to source or make).
- Village characters (prologue). The guru is done (Meshy 7, 2026-10-04); so is the old vanara (the user's model,
  2026-10-05).

## What has to be built

1. **Progression system:** *done (milestone 1).* See "Milestone 1" below.
2. **Weapon sets for the hero:** *done (milestone 1), with placeholder models and borrowed clips.*
3. **Prologue:** *done (milestone 4).* See "Milestone 4" below.
4. **The guru's voice in Chapter I:** teaching prompts tied to the fight.
5. **Chapter II:** the sunset relight of the atrium, the non-playable training cinematic, the mentor (the user's model
   since 2026-10-05),
   the shield-and-parry training section.
6. **The island (Chapter III):** a new underground, lamp-lit map that the player explores, the mace's resting
   place, mini monster and archer placeholders, the extraction scene.
7. **Dwarka (Chapter IV):** the hero with the two-handed mace and no shield; Takshaka's death scene with the
   prophecy and the sword handed over.
8. **Summit (Chapter V):** the second minion type (placeholder) in the waves; the guru's reveal as Shiva.
9. **Voice and sound** (ElevenLabs): the guru, the mentor, Takshaka's prophecy, Andhaka; real character sound
   effects to replace the synthesized ones the user disliked.

Suggested order: progression system and weapon sets first, then the prologue, then the chapters in order.

## Milestone 1: progression and weapon sets (landed)

- **`src/game/Progression.ts`:** a `HeroKit` per chapter (`Chapter.kit`) names the weapon and the moves allowed. The
  kit follows from the chapter, so replaying Chapter I gives the lathi again. The campaign save is still
  `Progress.unlocked`; what a fight *teaches* mid-chapter (`Player.learn`, saved per kit) sits on top of it.
- **Moves that can be locked:** slide (`dodge`), chained blows (`combo`), `block`, `parry`, `charge` (Shakti) and
  `leap` (the strike out of a sprint). Block and parry also need the dhal in hand.
- **`src/entities/characters/YodhaWeapons.ts`:** one `WeaponSet` per weapon: the hero's rig with that weapon's clips
  and grip, damage and posture per blow, sound, whether it comes with the dhal, whether it can be sheathed. Hit
  windows are still measured from the clips, so a new move set needs no timing by hand. Changing weapon rebuilds
  the rig while the chapter loads (`Player.equip`).
- **Chapter hints** (Engine `FIRST_FIGHT_HINTS`) only mention moves the hero has.

| Kit | Weapon | Dhal | Moves | Blows (damage / posture) |
|---|---|---|---|---|
| `baoli` (I) | Lathi | no | slide, chained blows; **charge is the guru's lesson (not yet taught)** | 17/26, 22/32, 36/52 |
| `akhada` (II) | Basic sword | yes | slide, chain, block, parry | 18/20, 24/26, 38/40, leap 44/48 |
| `dwarka` (IV) | Blessed mace | no | slide, chain, **slam out of a run** | 36/44, 46/54, spin 2 x 38/46, slam 80/90 |
| `summit` (V) | Magical khanda | yes | everything | 22/25, 30/32, 48/50, leap 55/60 |

- **Decided here:** Dwarka's "skills unlocked" (it said *to decide*) is the mace's slam out of a run. Charge arrives
  with the magical sword, so it is the one move the summit adds over the akhada's kit besides the leap.
- **Placeholders:** the lathi is a staff built in code (`buildLathi`); the basic sword is the Vetala's notched blade;
  the mace is Shalva's gada at 0.7 scale. The lathi's swings are cut from Mixamo's One Hand Club Combo; the mace's
  from the Mace Attack Combo, Spin Mace Attack and the brute's run-jump attack. The mace is held in the right hand
  only: both hands on the haft needs a clip authored for it. *(Since milestone 8 the mace has its own two-handed
  clips from the Great Sword Pack, held in both hands: see "Milestone 8".)*
- **Kit keys are not chapter numbers**, so the prologue and the island slot in as new kits (`KitId`) without
  renumbering anything. The island's kit is the mace again.
- **Two-handed clips arrived** (2026-10-04): Mixamo's Great Sword Pack, 51 clips, in `game asset/characters/animations`
  as `Mace-*` (zip kept in `animations/packs/`), for the mace's own move set in milestone 8.
- **Known gaps:** the pause screen's controls list still shows every move; the lathi has no guard at all, so Chapter
  I is a pure slide-and-strike fight until the guru's teachings (milestone 4) hand something over.

## Milestone 3: story delivery (landed)

The systems every later chapter tells its story with. Code: `src/cinematics/Scene.ts` (the authoring format and its
player), `src/ui/Dialogue.ts` (subtitles and voices), `src/combat/Voices.ts` (recordings), `src/game/Story.ts` (the
scenes themselves), wired up in `Engine` (`storyScene`, `playScene`, `updateBeats`, `concludeChapter`).

- **A chapter's story** is `Chapter.story` (a `ChapterStory`): an `opening` scene (after the chapter's intro, before
  the fight), mid-fight `beats`, and an `ending` scene (once the chapter is won, before the chapter-complete screen).
- **Beats** fire once per attempt, on a trigger: `{ bossBelow: 0.5 }` (or `{ bossBelow, enemy: 'takshaka' }`),
  `{ fallen: 'vetala' }`, `{ learned: 'charge' }` (the hero was just taught it: `Player.learn`), `{ fightTime: 20 }`,
  or `{ when: (s) => ... }`. A beat is either `scene` (a cutscene: the fight stops, as for a boss's arrival, then hands
  back to the follow camera) or `lines` (spoken over the fight without stopping it: the guru's voice in his head). Its
  `run` hook runs as it fires, e.g. to teach the move a line is about.
- **Scenes** are lists of shots. A shot has a `camera` (keys, or a function of the stage evaluated when the shot
  starts, so it frames people where they stand then), a `duration` (default: as long as its lines take), `ease`,
  `sway`, `fadeIn` / `fadeOut`, `lines` (spoken from `linesAt`, default 0.4 s; the shot holds until the last is done)
  and `cues` at seconds into the shot. Cues at 0 s run before the shot's camera is framed.
- **Cues:** `{ actor, play: 'IDLE' | ... | 'intro' }` (a state's clip, or an enemy's roar), `{ actor, clip: 'name' }`
  (any clip in the model), `{ actor, moveTo: mark, gait: 'walk' | 'run', face }`, `{ actor, place: mark, face }` (at
  once), `{ actor, face: who or mark }`, and `{ run: (s) => ..., essential: true }`. Actors are `'hero'`, `'boss'` (the
  last boss to arrive) or an enemy id. Marks are vectors or functions of the stage; `Stage` has `pos`, `head`,
  `at(actor, fwd, side, up)`, `toward(from, to, metres)` and `height` to build them.
- **Skipping** (hold Space or A, as for the intros) and **retries** leave the game as a played scene would: unfired
  moves, places and turns are applied at once and `essential` hooks still run (other `run` cues and clips do not, so
  anything that changes the game belongs in an essential hook). A scene plays once per session; after that (a retry)
  it is settled instead. A retry also settles the opening rather than playing it, like the intro.
- **Lines** are `{ speaker, text, voice?, hold? }`. A tap of the skip button (Space, Enter or A) reads ahead to the
  next line, and past the last line of a shot cuts to the next shot; holding skips the scene. In-fight lines run on
  their timer only (the buttons are busy fighting), sit above the HUD in italics and wait behind each other.
- **Voices:** `voice: 'akhada_end_mayavi_1'` plays `public/assets/voice/akhada_end_mayavi_1.mp3` through the effects
  bus (master volume applies; in-fight lines get a little of the place's reverb) and the line lasts as long as the
  recording. Without the file the line shows for a reading time from its length. The build lists the files that exist
  (`virtual:voice-lines`, `vite.config.ts`), so a missing recording is never even requested: no console errors. A
  chapter's recordings load with the chapter. Name new files `<chapter>_<scene>_<speaker>_<n>`.
- **Testing:** in a dev build, `__debug.chapter(2, false)` then `__debug.win()` plays Chapter II's ending.

```ts
// src/game/Story.ts: a mid-fight beat and an ending, for some chapter.
export const BAOLI_STORY: ChapterStory = {
  beats: [
    { on: { bossBelow: 0.6 }, run: (s) => s.player.learn('charge'),
      lines: [{ speaker: 'Guru', text: 'Gather yourself before you strike.', voice: 'baoli_guru_charge_1' }] },
  ],
  ending: {
    id: 'baoli-ending',
    shots: [{
      fadeIn: 0.8,
      cues: [{ at: 0.5, actor: 'hero', moveTo: (s) => s.toward('boss', 'hero', 2.5), face: 'boss' }],
      camera: (s) => [{ pos: s.at('boss', 4, -2, 2.4), look: s.head('boss'), fov: 38 }],
      lines: [{ speaker: 'Baoli Guardian', text: 'Go to the akhada.', voice: 'baoli_end_guardian_1' }],
    }],
  },
};
// src/game/Chapters.ts: { id: 1, ..., story: BAOLI_STORY }
```

- **Left for later:** there is no setting to turn subtitles off yet; the pause screen's controls list does not mention the
  tap to read ahead. (A scene's own characters arrived with milestone 4: `ChapterStory.cast`.)

## Milestone 4: the prologue (landed)

"The Last Lesson", chapter id 0, before Chapter I. Code: `src/levels/Level0_Village.ts`, `PROLOGUE_STORY` in
`src/game/Story.ts`, `src/entities/characters/Village.ts` (its placeholder people), `src/entities/Raider.ts`,
`src/entities/Extra.ts`; the map is built by `game asset/levels/00_village/build_village.py` (command in that
folder's README).

- **The village:** a 22 m walled mud courtyard at dusk, not explorable (walls on its rim, plus the lane out through
  the north gate): three round thatched huts, a sandstone house, a neem tree on its platform, a well, a cooking fire,
  a gateway with a chhatri, and dunes, khejri trees and a hill fort outside. Flat vertex colours (two materials, under
  1 MB), cel-shaded with ink like the other arenas, under a sky drawn in a shader: the sun going down behind the gate,
  so faces turned north are lit and anything between the camera and the gate stands against the glow. Its own
  ambience (`village`: evening wind, the fire crackling, goats, a dog, crickets, the aarti bell) and music tonic.
- **Flow:** the intro shows only the place (`Chapter.introPlaceOnly`), then the opening scene: the lesson, the horn at
  the gate, the raiders stepping out of the sunset (they wait out of sight until a `show` cue), the guru stepping
  aside. The fight: raiders come in through the gate in waves (9 in all, 3 at a time); the guru's voice twice. **The
  scripted loss** (`ChapterStory.loss`): the hero cannot die (`Player.mortal` off), and once his health is under 30 %,
  or three raiders have fallen, or 75 s have passed, he is beaten (no defeat screen) and the ending plays: on his
  knees with the raiders round him; Andhaka walks in through the gate, a black shape against the sun, and says his
  line; the guru steps between them; the blade comes down as the picture cuts to black; "Guruji!" in the dark; later,
  an empty courtyard, a roof burning, no guru; Yudhveer's vow; he walks out of the gate. The campaign then runs
  straight on into Chapter I's intro (`Chapter.continues`), and Chapter I is unlocked.
- **Andhaka is only a silhouette:** his model and cleaver without the crown (he crowns himself at the summit), every
  surface black with a thin rim of sunset light (`CastMember.silhouette`), framed along the line of the sun.
- **Kit `prologue`:** the lathi, single blows only (no chaining) and the slide. Chapter I adds the chain, and the first
  fights' hints now show once per session each, so Chapter I after the prologue only teaches what is new.
- **Progress:** a new player has the prologue only (`Progress.unlocked` defaults to 0); clearing it unlocks Chapter I.
  Saves from before the prologue (2 or more) keep everything. The title's Continue appears once Chapter I is open; the
  chapter list shows the prologue first ("Prologue: The Last Lesson", a ॰ for its numeral). The title screen still
  stands in the baoli. Dev: Shift+0 or `__debug.chapter(0)`; `__debug.win()` in the prologue brings the loss.
- **New in the scene system:** `ChapterStory.cast`, characters who are in the story but not the fight (no body, no
  AI), loaded with the chapter and addressed by id in cues; a `show` cue; triggers `heroBelow` and `any`; a level can
  take story cues (`GameLevel.cue`, the village's `raid-fire`). Weapon trails are cleared when a scene starts.
- **The guru's model** (2026-10-04): Meshy 7 from `game asset/concepts/guru.png`, 31k triangles, autorigged, his
  staff part of the mesh and bound to his right hand, which is held at rest in every clip (`guru_post.py`). His
  own Mixamo clips: Breathing Idle and Iv Pole Walking (upright, a hand on a pole).
- **Placeholders:** the raiders are the summit's rakshasas, dyed dust-brown; the roof fire is plain
  flame cones; the kneel is the hero's crouch idle; the lathi is still built in code.
- **Left for later:** the courtyard keeps its dusk light after the raid (no time-of-day change); the guru has no fight
  of his own; every prologue line is recorded (2026-10-04).

### Prologue lines

Every line, for recording (ElevenLabs; the voices are in `game asset/voice/VOICES.md`). A recording goes in
`public/assets/voice/<id>.mp3`; until then the line is shown for its reading time.

| Id | Speaker | Text | Recorded |
|---|---|---|---|
| `prologue_open_guru_1` | Guru | Again. Feet first, then the lathi. Swung from the arm alone, it is only a stick. | yes |
| `prologue_open_yudhveer_1` | Yudhveer | Like this, Guruji? | subtitle only |
| `prologue_open_guru_2` | Guru | Better. The sun is nearly down. Once more, and then we eat. | yes |
| `prologue_open_guru_3` | Guru | Keep your feet, Yudhveer. Whatever comes through that gate, keep your feet. | yes |
| `prologue_open_yudhveer_2` | Yudhveer | Let them come. | subtitle only |
| `prologue_fight_guru_1` | Guru (in the fight) | Do not chase them. Let them come to you. | yes |
| `prologue_fight_guru_2` | Guru (in the fight) | Breathe. Feet first. | yes |
| `andhaka_prologue_kneel` | Andhaka | A boy with a stick... Your guru's soul will burn before my god. Kneel. | yes |
| `prologue_end_guru_1` | Guru | Leave the boy. It is me you came for. | yes |
| `prologue_end_yudhveer_cry` | Yudhveer | Guruji! | subtitle only |
| `yudhveer_prologue_find` | Yudhveer | Guruji... I will find you. Even if I have to climb to the top of the world. | subtitle only |

## Milestone 5: Chapter I (landed)

"The Moonlit Baoli", chapter id 1. Code: `BAOLI_STORY` in `src/game/stories/Baoli.ts` (its own file, so the later
chapters' stories can be written alongside it), wired in `src/game/Chapters.ts`; small additions to
`src/cinematics/Scene.ts` and `src/entities/Extra.ts` (the ghost) and `src/core/Engine.ts` (spacing of in-fight lines,
the hint for a move just learned). The map and the Guardian's fight are unchanged.

- **Flow:** the intro shows only the stepwell (`introPlaceOnly`); the Guardian rises in the opening scene instead.
  **Opening:** low behind the boy as he walks in across the island on the raiders' trail toward the dark shape hunched
  at its middle; he tells it to stand aside; it rises and roars (its name card); for a breath his guru stands at his
  shoulder, pale and see-through, and tells him to look at its feet; gone, and over his shoulder into the fight.
- **The guru's remembered voice** (in-fight `lines` beats, each once per attempt): the lesson of the gathered blow
  (teaches `charge` through `Player.learn`) once the Guardian is under 60 % or 45 s have passed; "feet first" when the
  boy is under half health; "now" when the Guardian's posture breaks; slide clear when it leaps or starts its
  three-blow string; praise for his first three-blow chain; near the end (under 25 %) that something binds it.
- **Lines keep their distance** (Engine, `LINES_GAP`): a beat's lines never start while another in-fight line is up,
  nor within 4 s of fight after one; a beat whose moment passes while it waits (a posture break) fires the next time.
  Only one beat's lines start per frame, so the order of `beats` is their priority. The prologue's two beats follow
  the same rule.
- **Charge** is Q (pad: its charge button), held while standing for 1.6 s; the three blows after it strike harder.
  The guru's line says it in his words ("Stand, and gather your strength. Hold it until it is whole, then strike.");
  the first-fight hint now reads "Hold {charge}, standing, until your strength gathers: the next three blows strike
  harder." The hints in order skip it while it is locked, so learning it shows its hint at once (`hintLearned`, once
  per session, if hints are on). A retry after learning it keeps it (saved per kit) and the hint comes at 26 s as
  before; the guru still says the lesson.
- **Ending:** from black, the boy walks up to the fallen Guardian; freed, it says Andhaka bound it to the well to turn
  back anyone who followed; he says he is going after his guru; not with a lathi: go to the Hanuman akhada, let the
  vanaras teach him to truly fight, then follow; "Then I will learn. And then I will follow."; he turns back the way he
  came and the picture fades into the chapter-complete screen.
- **New in the scene system:** `CastMember.ghost` (`{ color, opacity? }`): a cast member drawn pale and see-through
  with its textures kept and a glowing rim, writing depth so the body does not show through itself, casting no shadow.
  The guru is cast as one, hidden until the opening's memory shot.
- **Decided here:** the Guardian stays the Guardian (its name card and epithet are unchanged); it speaks lying where it
  fell (no dissolve or rising). The chapter's card lines are unchanged.
- **Left for later:** the guru's and the Guardian's lines are unrecorded (Yudhveer's are subtitles only, no voice); the Guardian has no "bound" look in the fight (darkness on it, freed
  light at the end); the ending is framed off the boss's head bone wherever it fell, so an odd fall (in the pool, on the
  steps) can frame less well; the guru's voice in the fight has no ghostly treatment beyond the in-fight italics.

### Chapter I lines

| Id | Speaker | Text | Recorded |
|---|---|---|---|
| (none) | Yudhveer | Their tracks end at the water. There is a way down, under the well. | subtitle only |
| (none) | Yudhveer | Stand aside. They carried my guru through here. | subtitle only |
| `baoli_open_guru_1` | Guru (remembered) | Do not look at its size, Yudhveer. Look at its feet. | yes |
| (none) | Yudhveer | Feet first, Guruji. | subtitle only |
| `baoli_fight_guru_1` | Guru (in the fight; his first three-blow chain) | Good. Let each blow open the way for the next. | yes |
| `baoli_fight_guru_2` | Guru (in the fight; the Guardian leaps or starts its string) | Do not stand under the great blows. Slide clear, then answer. | yes |
| `baoli_fight_guru_3` | Guru (in the fight; under half health) | Breathe. Feet first. A man off his feet strikes nothing. | yes |
| `baoli_fight_guru_4` | Guru (in the fight; Guardian under 60 % or 45 s: teaches charge) | Now the lesson you would never sit still for. | yes |
| `baoli_fight_guru_5` | Guru (in the fight, follows 4) | Stand, and gather your strength. Hold it until it is whole, then strike. | yes |
| `baoli_fight_guru_6` | Guru (in the fight; its posture breaks) | It reels. Now, Yudhveer! | yes |
| `baoli_fight_guru_7` | Guru (in the fight; Guardian under 25 %) | It was not always this. Something dark binds it. Set it free. | yes |
| `baoli_end_guardian_1` | Baoli Guardian | The dark... it has let go of me. | yes |
| `baoli_end_guardian_2` | Baoli Guardian | Andhaka bound me to this well, to turn back any who followed his men below. | yes |
| (none) | Yudhveer | They took my guru that way. I am going after him. | subtitle only |
| `baoli_end_guardian_3` | Baoli Guardian | Not with a lathi. It has carried you this far. It will not carry you further. | yes |
| `baoli_end_guardian_4` | Baoli Guardian | Go to the Hanuman akhada. Let the vanaras teach you to truly fight. Then follow. | yes |
| (none) | Yudhveer | Then I will learn. And then I will follow. | subtitle only |

## Milestone 6: Chapter II (landed)

"Hanuman Akhada", chapter id 2. Code: `src/game/stories/Akhada.ts` (`AKHADA_STORY`, `AKHADA_MARKS`),
`src/entities/Vanara.ts` (the sparring vanara), `src/entities/characters/Akhada.ts` (`MENTOR`, `MENTOR_CAST`),
the relight in `src/levels/Level2_Akhada.ts`.

- **The sunset relight** (code only, the .glb is unchanged): the night's cobalt key, vermillion grazers and starry sky
  are gone. A low golden key (warm, raised from the sun's side so the shaft through the oculus slants across the
  floor), a soft blue-violet ambient and hemisphere fill, warm haze, and a sky drawn on a canvas (blue-violet zenith,
  rose, gold at the horizon, the sun low in the north-west behind the monolith, `AKHADA_SUN`). Deepak-warm uplights
  and a sunlit raking spot on the Hanuman bust, a warm rim on its carving; the forest cards keep their authored
  backlight glow; the distant ranges are shaded as sunset haze, gold on the sun side. Same cel ramp and ink lines.
  Since "Day into night" (below) the night is back for the fight, so the four grazers are back too (dark by day).
- **Day into night** (`Level2_Akhada.cue`): the level keeps both looks, the sunset and the original cobalt and
  vermillion night (commit 5096e21), and blends them by one time of day `t` (0 sunset, 1 night): key, fill, hemisphere
  and ambient (colour, intensity, the key's direction and shadow bias), fog, exposure, bloom, vignette, the ink colour,
  the sky (both canvas skies on one `SkyDome`, crossfaded; the puddles reflect whichever is the more), the ridges, the
  bust's rim, uplights and raking spot, the canopy's sun glow (gone at night) and the vermillion grazers. Only runs
  when `t` moves. The lamps are out by day (flames shrunk to nothing and hidden, mural glows and halos off, grazers
  dark) and are lit as night falls, for the evening aarti: a mirrored pair every half second, the eight brass diyas
  before the monolith from the middle out, then the tall deepams from the north end down the verandahs, each flame
  catching with a small flare (a per-lamp size in the flames' vertex shader: the merged flame meshes stay one draw call
  each) and its light (mural glow, halo, the nearest grazer) rising over a second and a half. Story cues
  (`src/game/stories/Akhada.ts`): `day` at the opening (essential: a restart from the training comes back to the
  sunset), `dusk` when the training starts (t eases to 0.18 over 40 s), `twilight` when the parry is taught (0.35 over
  35 s), `nightfall` as the two come out in the arrival (to 1 over 6 s, the lamps lit over its first 5 s) and `night`
  (essential) on the arrival's last shot: a skipped arrival, and a retry (which settles the arrival and goes straight
  to the fight), land on full night with every lamp burning, never mid-transition. From the fight to the ending it is
  night. The ending's lines say nothing of the sun. **Left for later:** a replay of the chapter in the same session
  (level still loaded, lesson already passed) shows its place-only intro at night.
- **Flow:** the intro shows the place only (`introPlaceOnly`), then the **opening**, a non-playable montage: sword
  practice in the sun against the old vanara, who swats the boy about ("Again."), the dhal handed over (the recorded
  `akhada_train_mentor_1`), and the vanara squaring up. Then the **training** (played, not explorable): the vanara
  spars, and the beats teach as it goes, while the light goes toward dusk. Then the **arrival** scene: the vanara calls
  it ("Enough"), night falls and the lamps are lit as the Vetala and Mayavi come out of the north end (name cards), and
  he walks off to the west verandah to watch. The **fight**, with
  two lines from him. The **ending** is his scene: Dwarka, Shalva's mace, the island's blessed mace; the boy is brief
  and leaves by the south gateway.
- **The training:** kit `akhada` now has `block` and `parry` in `taught` (abilities: slide and chain only). The first
  beat teaches the guard (`Player.learn('block')`, hint "Hold {guard}..."); three blows taken on it
  (`CombatSystem.stats.blocks`) teach the parry (hint "Press {guard} just as a blow lands..."); three blows turned
  (`stats.deflections`) end the lesson and play the arrival. Reactive lines: when he takes two blows without the guard,
  on his first parry, and when he keeps blocking without a parry. The hero cannot fall while the vanara teaches
  (`Player.mortal` off), and the arrival gives him back his health and posture. The vanara (`VanaraMentor`) is slow and
  plainly telegraphed, takes no damage, cannot be posture-broken and hits for 0.3 of a minion's blow. The lesson is
  kept for the session: a retry (after falling to the Vetala) goes straight to the bosses. What is learned is saved
  per kit, as for the guru's charge.
- **Two characters, one vanara:** `mentor_spar` (the Enemy who spars) and `mentor` (the story's cast member). At the
  arrival the cast one takes the sparring one's place and the sparring one leaves the fight (hidden, out of the way
  on the verandah, counted as fallen).
- **New in the engine (additive):** `Spawn.hidden` (an enemy spawned out of sight, out of the fight until a `show`
  cue: the Vetala and Mayavi wait at the north end), `StoryBeat.hint` (a control hint with a beat), and the HUD gives
  no plate to an enemy that is not shown.
- **The vanara's model** (2026-10-05; it replaced the placeholder, the Baoli Guardian at half size): the user's old
  monkey sage (`vanara.glb`, ~29k triangles, 1.75 m to the top of his topknot, autorigged; his tail is bound wholly to
  the hips) with his staff (`vanara_staff.glb`, a separate prop in the right fist, laid through both fists in his
  two-handed clips). He fights with the Great Sword Pack's clips: on guard `great_sword_idle`, a wide sweep
  (`great_sword_slash`, ATTACK_1) and a long lunging one (`great_sword_slash_3`, ATTACK_2) in the spar, the turn into
  an overhead blow (`great_sword_slash_4`) in the opening; a parry knocks his staff up (`great_sword_impact`). The
  spar counts one blow per attack (`VanaraMentor.hitWindows` keeps each swing's main stroke: the wind-up turns are
  fast enough to measure as strikes), and his staff whooshes and knocks like wood. Once the lesson is over the cast's
  vanara (`MENTOR_CAST`) leans on the planted staff, a hand on his hip (`staff_rest`), walks with it like a pole
  (`iv_pole_walking`), and strokes his beard on "Hm. Not a farmer, then." (`staff_ponder`); both authored clips are
  cut from Great Sword idles by `game asset/characters/vanara_post.py`. No new Mixamo clips: the Browser pane was not
  signed in to Mixamo, so a dedicated talking clip is still to get.
- **Left for later:** the mentor has no name (subtitles say "Vanara"); every vanara line but the dhal handover is
  unrecorded; the chapter-complete screen counts the training's deflections; the hero's sword-clip timings in the
  montage are by eye.

### Chapter II lines

The vanara mentor's voice is Rusty Malone (`game asset/voice/VOICES.md`). Yudhveer is subtitles only.

| Id | Speaker | Text | Trigger | Recorded |
|---|---|---|---|---|
| `akhada_open_mentor_1` | Vanara | Again. | opening, the first parried cut | yes |
| `akhada_open_mentor_2` | Vanara | You strike where I was, boy. Strike where I will be. | opening, the spinning cut that misses | yes |
| (no id) | Yudhveer | Again. | opening, at it once more | subtitle only |
| `akhada_train_mentor_1` | Vanara | Hmph. You swing like a farmer, boy. Here. A dhal is not for hiding. Meet the blow... and turn it away. | opening, the dhal handed over | yes (`mentor_ch2_dhal`) |
| `akhada_open_mentor_3` | Vanara | Raise it. I will come at you, and you will hold. | opening, last shot | yes |
| `akhada_train_mentor_2` | Vanara | Feet planted. Here it comes. | training starts (the guard taught) | yes |
| `akhada_train_mentor_3` | Vanara | The dhal does nothing hanging at your side. Raise it! | training, two blows taken unguarded | yes |
| `akhada_train_mentor_4` | Vanara | Good. You can stand. Now the harder thing: do not wait for the blow. Meet it as it falls, and turn it. | training, three blocks (the parry taught) | yes |
| `akhada_train_mentor_5` | Vanara | Hah! There. Again. | training, first parry | yes |
| `akhada_train_mentor_6` | Vanara | Too soon, and you are only hiding. Wait for it... then meet it. | training, four more blocks and no parry | yes |
| `akhada_arrive_mentor_1` | Vanara | Enough. You will do... for a farmer. | arrival, three parries | yes |
| `akhada_arrive_mentor_2` | Vanara | Hm. You did not climb this hill alone, boy. | arrival, the two come out | yes |
| `akhada_arrive_mentor_3` | Vanara | These two are yours. Show me what the dhal is for. | arrival, last shot | yes |
| `akhada_fight_mentor_1` | Vanara (in the fight) | Fire turns on a dhal like any blade. Send it back to him. | two blows taken in the boss fight | yes |
| `akhada_fight_mentor_2` | Vanara (in the fight) | One. Do not stand there admiring it. | the Vetala falls | yes |
| `akhada_end_mentor_1` | Vanara | Hm. Not a farmer, then. | ending | yes |
| (no id) | Yudhveer | Where did they take my guru? | ending | subtitle only |
| `akhada_end_mentor_2` | Vanara | Not from me. Go to Dwarka, if you would know why your village burned. | ending | yes |
| `akhada_end_mentor_3` | Vanara | Shalva holds it now. His mace has broken better blades than yours. Better than mine. A sword will not be enough. | ending | yes |
| (no id) | Yudhveer | Then what will? | ending | subtitle only |
| `akhada_end_mentor_4` | Vanara | Out past the city, on an island, a blessed mace lies waiting. Old things keep it. Take it from them first. Then go to Shalva. | ending | yes |
| `akhada_end_mentor_5` | Vanara | And keep the dhal up, boy. | ending, as he walks out | yes |

## Milestone 7: Chapter III, the island (landed)

"The Island", chapter id 3 (level 5), between the akhada and Dwarka. Code: `src/levels/Level5_Island.ts` (the map,
its lamps, eyes, pool and the mace on the altar), `src/game/stories/Island.ts` (`ISLAND_STORY`),
`src/game/Expedition.ts` (explorable chapters), `src/game/IslandExpedition.ts` (its encounters),
`src/entities/IslandMonsters.ts` and `src/entities/characters/IslandMonsters.ts` (the placeholder creatures), an
`ARROW` projectile (`ProjectileManager.spawnArrow`) and an `island` ambience in `SoundFX`. The map is built by
`game asset/levels/03_island/build_island.py` (command in `game asset/README.md`), 1.2 MB.

- **Chapter numbers:** the island is inserted as id 3; Dwarka is now id 4 (Chapter IV) and the summit id 5 (Chapter V).
  Level indices (`Chapter.level`, Engine's per-level tables) are unchanged; the island's is 5. Dev: Shift+3 or
  `__debug.chapter(3)` is the island, `__debug.chapter(4)` Dwarka, `__debug.chapter(5)` the summit. Old saves keep
  their number, so a save that had reached Dwarka (3) now opens the island instead.
- **The kit (decided here):** he goes down with the akhada's sword and dhal (`island` kit: sword, slide, chain, block,
  parry; block and parry already learned at the akhada) and comes up with the mace. Taking it up in the ending
  equips the `dwarka` kit on the spot (`Player.equip(KITS.dwarka)` in an essential hook, behind a black hold), so the
  last shots show him with the mace and Chapter IV starts with it already in hand. The table's "III. Island: blessed
  mace" is the mace he wins there; he fights the island with the sword.
- **The map:** a sea cave where the boat lands, then about 90 m of caves going north and 2.5 m down: the landing (two
  lamps either side of the way in), a winding tunnel, **the hall of bones** (a brazier, the remains of earlier
  seekers, stalagmites for cover), a descent with a torch, **the black pool** (a pit of black water ringed with
  stones, ripples spreading on it, braziers on the dry side), a last tunnel, and **the shrine** (a dais, the altar
  with the mace on red cloth, a stone torana, two brass deepastambhas). Three dead-end alcoves hold eyes. The cave
  is one shell: a union of ellipsoids voxel-remeshed, roughened, pressed flat onto the path's floor heights, turned
  inward and painted with vertex colours; it is its own trimesh collider. The arena bounds are a single wall across
  the landing, keeping him out of the sea; the pool has an invisible drum round it.
- **Light:** almost none but the lamps (20 flames, exported as `Lamp_*` empties); the 8 nearest to the camera share a
  fixed pool of 8 point lights (flickering, no shadows; a constant count so nothing recompiles), plus moonlight at the
  mouth and a gold glow on the mace. Black fog between (`FogExp2` 0.05), a faint cold key, heavy vignette. Eyes in
  the alcoves shine through the fog, blink, and go out when he comes within 7 m. Ambience `island`: drips, the
  lamps, a stone falling, wind in the tunnels, something long dragging itself over wet rock; music `island`. Static
  props are batched (about 95 draw calls in the hall fight, shadows and post included).
- **Explorable chapter (`Chapter.expedition`):** encounters start as he reaches their place (or when an earlier one is
  down to N standing), each with a callout; the chapter is won at the goal (before the altar) once every encounter
  is cleared ("Not while its keepers stand." until then), and its ending plays at once (no victory slow-motion).
  A cleared encounter with a checkpoint is where a retry starts him (this session; a fresh start from the menu
  forgets it). `__debug.win()` kills everyone present and completes the expedition.
- **Encounters:** the hall: 5 runts out of the dark at its edges. The pool: 2 archers (across the water and by the
  way on) and 3 runts. The shrine: 2 archers either side of the dais and 4 runts; when they are down to 2, 2 more
  runts come down the tunnel behind him. Checkpoints after the hall and the pool.
- **Creatures (PLACEHOLDERS, their own files):** *cave runts* (mini monsters): the rakshasa at 0.6 scale (1.1 m),
  dyed pale, 24 health, fast (5.4 m/s), quicker swings, light blows; each closes in on its own side of him so a pack
  surrounds him. *Cave archers*: Mayavi at 0.85 scale, dyed moss-dark, 50 health; they keep 6 to 12 m off, circle,
  back off, and every 3 to 4.6 s draw (a fire-glow gathers in the hand and the telegraph sounds, 0.85 s) and loose a
  shaft of fire (13 damage; slide under it, block it or parry it back); only with a clear line to him (a ray against
  the rock), otherwise they come round; cornered (under 2.4 m), they claw. A hit during the draw cancels the shot.
- **Story:** the opening on the landing (the boatman, unseen under his boat's canopy, will go no further); his own
  thoughts over the walk; the voice in the shrine as he enters and when the keepers are down; the extraction: he
  steps up to the altar, the voice, the picture goes dark as he lifts it, then he stands with the mace raised, the
  voice sends him to Dwarka, and he walks back up the way he came. Yudhveer is subtitles only.
- **Left for later:** the creatures' real models and a bow (the archers cast with Mayavi's clip); a clip for lifting
  the mace (the reach is the crouch idle, the lift is hidden in the dark); no map or compass (the way is linear);
  the boatman is never seen.

### Chapter III lines

For recording (ElevenLabs). A recording goes in `public/assets/voice/<id>.mp3`; until then the line is shown for its
reading time.

| Id | Speaker | Text | Trigger | Recorded |
|---|---|---|---|---|
| `island_open_boatman_1` | Boatman | This is as far as my boat goes. Whatever is kept on this island, it keeps for itself. | opening | yes |
| (no id) | Yudhveer | They say a mace lies down there. A blessed one. | opening | subtitle only |
| `island_open_boatman_2` | Boatman | They say it. Men have gone down to fetch it. I have rowed them here, and I have rowed back alone. | opening | yes |
| (no id) | Yudhveer | Then wait for me until the tide turns. | opening | subtitle only |
| `island_open_boatman_3` | Boatman | I will wait. Mind the lamps. No one lights them, and they never go out. | opening | yes |
| (no id) | Yudhveer (walking) | Still burning. Who keeps these lamps? | the first tunnel | subtitle only |
| (no id) | Yudhveer (walking) | Small, and many. So this is where the others ended. | the hall's runts all down | subtitle only |
| (no id) | Yudhveer (walking) | Something moves in the water. Keep to the stone. | near the black pool | subtitle only |
| (no id) | Yudhveer (walking) | Warm air, and ghee burning. The shrine is close. | the last tunnel, pool cleared | subtitle only |
| `island_shrine_voice_1` | Voice in the shrine | Many have come down for it. None has carried it up. | the shrine's door | yes |
| `island_shrine_voice_2` | Voice in the shrine | Come, then. Come and lift it, if you can. | the shrine's keepers all down | yes |
| `island_end_voice_1` | Voice in the shrine | Lift it, if you do not lift it for yourself. | ending, before the altar | yes |
| (no id) | Yudhveer | Not for myself. For my guru, and against the ones who took him. | ending | subtitle only |
| `island_end_voice_2` | Voice in the shrine | Then it will not grow heavy in your hands. Go to Dwarka. The one who holds it fights with a mace, and has not met its equal. | ending, mace in hand | yes |
| (no id) | Yudhveer | He will meet it now. | ending | subtitle only |

## Milestone 8: Chapter IV, Dwarka (landed)

"Dwarka", chapter id 4 (Chapter IV, after the island, chapter id 3, from milestone 7; level index 3). Code: `src/game/stories/Dwarka.ts`
(`DWARKA_STORY`), the mace's move set in `src/entities/characters/YodhaWeapons.ts` (`MACE_STATES`), the two-handed
hold in `src/entities/animation/CharacterRig.ts` (`SocketAttachment.twoHanded`).

- **The mace's own move set** (kit `dwarka`, and the island's, which shares the `mace` weapon set): Mixamo's Great
  Sword Pack, 11 of its clips added to `yodha.glb` (7.58 MB to 7.96 MB; command in `game asset/README.md`). Idle
  `great_sword_idle`; walk `great_sword_walk`; run and sprint `great_sword_run_2` (authored at 3.7 m/s: 0.93x at the
  run, 1.47x at the sprint); blows: a wide two-handed sweep (`great_sword_slash`, 0.34 to 1.05 s), an overhead smash
  driven down from a crouch (`great_sword_slash_3`, 0.35 to 1.3 s), the high spin attack as the finisher (two blows,
  travelling about 2 m), and the jump attack for the slam out of a run (about 3 m); hit reactions
  `great_sword_impact_2` (stagger) and `great_sword_impact` (deflected); death `two_handed_sword_death_2`. The slide,
  jump and posture break keep the hero's own clips. Hit windows are measured from the clips as before: sweep
  0.15-0.37 s, smash 0.32-0.62 s, spin 0.18-0.27 and 0.76-0.89 s, slam 0.6-0.92 s (state seconds). Damage and posture
  are unchanged (36/44, 46/54, spin 2 x 38/46, slam 80/90).
- **Both hands on the haft:** the Great Sword clips keep the two fists about 0.2 m apart on one grip (the left below
  the right) in every frame, but along a line that is not the right fist's own bar. So the mace stays in
  `Socket_Hand_R` with no grip offset, and each frame (`CharacterRig.updateMounts`, and in `measureStrikes` so the hit
  windows see it too) it turns about the grip by the least rotation that lays its haft along the line from the left
  fist through the right. The left hand then lands on the haft 0.2 m below the right, where Shalva's gada (1.05 m at
  0.7 scale, gripped 0.23 m up) still has haft. When the fists part (over 0.3 m, gone by 0.45 m: the slide, a fall)
  the mace eases back to the right fist's own hold. Checked in Blender renders of the clips with and without the aim,
  and in the game (the idle and the smash, close up).
- **Testing:** `__debug.chapter(4, false)` then `__debug.win()` plays Shalva's fall; `__debug.win()` again, once
  Takshaka is up, plays the ending.
- **Flow:** the intro, then the **opening**: Shalva on the rosette knows the island's mace and the boy; "Where is my
  guru?"; Shalva promises the answer if he is beaten, and roars. The fight. **Shalva falls**: a beat scene
  (`{ fallen: 'shalva' }`) before anything else, in which the dying Shalva tells him the truth: Andhaka burns wise
  souls before his god to grow great enough to stand against Shiva and take his seat on Kailasha; the guru, "the
  wisest of them all", is kept for the last fire, on the summit. The guru's being Shiva stays hidden. The sea stirs,
  the hero turns to it, and Takshaka's own arrival (as before) brings the serpent king up. The **ending**: Takshaka
  dying; his hundred years serving Andhaka; the recorded prophecy; naga fire, and the khanda stands point down in the
  stone between them; the hero crouches, takes it (the mace leaves his hands) and stands with it up in the
  sword-and-dhal idle; "Rest, serpent king. I will carry it to the summit." The camera rises away.
- **New in the engine (one change):** the final boss now waits for a story beat that is due (`Engine.beatDue`), so a
  fallen boss's last words play before the next boss comes on.
- **The sword in the scene** is `yodha_khanda.glb` loaded as a prop, stood in the level and then parented to the right
  hand socket; an essential hook at the end of the ending (and at the start of the opening) takes it away and gives
  the mace back, so a skipped scene or a replay of the chapter is left right. The next chapter's kit equips the khanda
  properly.
- **Left for later:** the flame burst is the existing naga fire; the hero lays the mace down out of sight (it simply leaves his hands); the khanda is held
  in the sword pack's idle without the dhal; the sprint is the mace's run played faster.

### Chapter IV lines

Takshaka's voice is Kundan, Shalva's is Mani (`game asset/voice/VOICES.md`). Yudhveer is subtitles only.

| Id | Speaker | Text | Trigger | Recorded |
|---|---|---|---|---|
| `dwarka_open_shalva_1` | Shalva | So the island gave up its mace. To a boy from a burned village. | opening, the hero walks in | yes |
| (no id) | Yudhveer | Where is my guru? | opening | subtitle only |
| `dwarka_open_shalva_2` | Shalva | Far beyond your reach, and further every day. Beat me, and I will tell you why he was taken. Fail, and the sea can have you. | opening | yes |
| (no id) | Yudhveer | Then lift your gada. | opening, Shalva roars | subtitle only |
| `dwarka_fall_shalva_1` | Shalva | Enough. You have earned your answer, boy. Much good may it do you. | Shalva falls | yes |
| `dwarka_fall_shalva_2` | Shalva | Andhaka gathers souls. Wise ones: sages, teachers, the ones a village listens to. He burns them before his god. | Shalva falls | yes |
| (no id) | Yudhveer | To what end? | Shalva falls | subtitle only |
| `dwarka_fall_shalva_3` | Shalva | Every soul he burns makes him greater. When the fire is high enough, he will stand against Shiva himself, and take his seat on Kailasha. | Shalva falls | yes |
| (no id) | Yudhveer | And my guru? | Shalva falls | subtitle only |
| `dwarka_fall_shalva_4` | Shalva | The wisest of them all, Andhaka says. He keeps him for the last fire, on the summit. | Shalva falls | yes |
| `dwarka_fall_shalva_5` | Shalva | But you will not live to climb it. The serpent king does not let his prey leave this shore. | Shalva falls, then Takshaka rises | yes |
| `dwarka_end_takshaka_1` | Takshaka | A hundred years I kept the sea for him. I have watched kings kneel to Andhaka, and gods look away. | ending | yes |
| `dwarka_end_takshaka_2` | Takshaka | You will not defeat him, boy... No. I was the fool. You were born to end his reign. Take my sword. | ending, then the sword | yes (`takshaka_prophecy`, levelled to -18 LUFS) |
| (no id) | Yudhveer | Rest, serpent king. I will carry it to the summit. | ending, the khanda in his hand | subtitle only |

## Milestone 9: Chapter V, the summit (landed)

"Kailasha Summit", chapter id 5. Code: `SUMMIT_STORY` in `src/game/stories/Summit.ts` (wired in `Chapters.ts`), the
second minion in `src/entities/Yatudhana.ts` and `src/entities/characters/Yatudhana.ts`, the reveal's light in
`src/cinematics/DivineLight.ts` on a small new effects clock `src/cinematics/SceneFX.ts`, the credits in
`src/ui/Credits.ts` and `src/ui/credits.css`; small additions to `src/core/Engine.ts` (a second kind in a horde, the
effects clock, the credits after the last chapter). The map, Andhaka and his entrance are unchanged.

- **The second minion, the yatudhana** (a sorcerer rakshasa; PLACEHOLDER: Mayavi's model at 0.86 scale, about 1.8 m,
  tinted ash-grey). A ranged caster: it runs its bridge route like the brutes but leaves it once the hero is within
  11 m, keeps 5 to 9.5 m off, and throws a single fire bolt (Mayavi's, deflectable back at it) every 3.8 s or so; cornered
  inside 2.2 m it claws and kicks. Frail: 38 health, 30 posture, its blows at 0.75. The brutes press in while the
  casters hang back, so the hero has to deflect while crowded or break off to run them down. The waves are now 8 (was
  6): the third, sixth and eighth are yatudhanas (`Horde.alt`). The intro card's epithet no longer counts them.
- **The ending** (`summit-ending`, after Andhaka falls and the victory beat):
  1. From black, high over the arena: Andhaka fallen, the boy sheathes his blade. A voice from the dais: "Yudhveer."
  2. Low in front of him: he turns up the stair. "Guruji?"
  3. Over his shoulder up Shiva's stair: at the head of it, at the statue's feet, the guru slumped on the stone,
     Andhaka's captive. The boy runs up.
  4. Side on, on the dais: he goes down on one knee beside him; the guru speaks.
  5. Cut: both on their feet. Over the boy's shoulder on the guru, the statue behind: "You kept your feet" (the
     prologue's lesson), the boy's answer (his vow).
  6. Over the boy's shoulder, close: the irony, and "Look up."
  7. The guru becomes light: his surfaces glow white-gold, a light swells in him, motes rise off him, he fades into it
     and is gone.
  8. The camera rises from where he stood up the statue to its face as the stone warms, a light lifts it out of the
     dark and a slowly turning halo (a prabhavali) kindles behind its head; Andhaka's body crumbles to ash.
  9. From down the stair, the whole god in his light: the first line as Shiva.
  10. Low behind the boy, small on one knee before the lit feet: "Mahadeva..."
  11. The eclipse passes (the sky and ambient light rise and the key light warms over 9 s); the camera draws back and up
      off the dais, the last line, a long fade to black.
- **The guru on the summit** is a story cast member (`GURU`), out of sight through the fight and found in the ending.
  He has no kneel: he is held at 1.5 s into his `death` clip (sunk to the ground, slumped, his staff in his hand).
  Placeholder until he has a bound or kneeling clip.
- **Credits:** after the last chapter's ending the chapter-complete screen is replaced by a slow roll over black in the
  title's type (the Devanagari name, YUDHVEER, then Created by TejasGov; Built with Three.js, Rapier, Vite; Characters:
  Meshy, Mixamo; Voices, sound and music: ElevenLabs; Places: Blender, Poly Haven; "Thank you for playing."), about 50 s
  to the music of the title, then the title. "Return to the title" (bottom right; confirm, back or Esc) leaves early.
  The campaign is still unlocked one past the last chapter, as before.
- **New in the scene system:** `SceneFX` (`tween`, `every`, `onClear`): effects a scene's `run` cues start that play
  out on the game's fixed step (so `__debug.advance` drives them) and are undone when the chapter is left (lights put
  back, meshes freed). `DivineLight`: `intoLight` (someone turns to light and fades), `awaken` (a statue's stone warms,
  a light, a halo, motes), `dawn` (the place's light rises and warms), `motes`. Lights are added dark in the opening
  black and only started later, so their shader rebuild is never on camera.
- **Decided here:** the guru is found slumped, not visibly bound; Shiva speaks in the guru's voice (speaker "Shiva",
  ids `summit_reveal_shiva_*`, to be recorded with the guru's narrator voice); the eclipse passes at the end (only for
  the scene; the map is untouched); the reveal is light and the statue, not a model change.
- **Left for later:** the lines are unrecorded; no bonds or kneel clip for the captive guru; the yatudhana's model
  (Meshy) and its own cast and death; a hold-to-skip on the credits rather than a button.
- **Testing:** in a dev build, `__debug.chapter(5, false)`, then `__debug.win()` per wave until Andhaka arrives, let
  his entrance play, `__debug.win()` again: the ending, then the credits.

### Chapter V lines

The guru's voice (and Shiva's) is the deep narrator in `game asset/voice/VOICES.md`. Yudhveer is subtitles only.

| Id | Speaker | Text | Trigger | Recorded |
|---|---|---|---|---|
| `summit_end_guru_1` | Guru (off, from the dais) | Yudhveer. | ending, shot 1 | yes |
| (no id) | Yudhveer | Guruji? | ending, he turns to the stair | subtitle only |
| (no id) | Yudhveer | Guruji... you live. | ending, kneeling beside him | subtitle only |
| `summit_end_guru_2` | Guru | I live. He meant my soul for his god, and carried me all the way up the mountain to give it. | ending, kneeling | yes |
| `summit_end_guru_3` | Guru | You kept your feet, Yudhveer. | ending, both standing | yes |
| (no id) | Yudhveer | I said I would find you. Even at the top of the world. | ending, both standing | subtitle only |
| `summit_end_guru_4` | Guru | He gathered wise souls to throw down Mahadeva. He never asked whose soul he carried up the mountain. | ending, before the light | yes |
| `summit_end_guru_5` | Guru | Look up, Yudhveer. | ending, before the light | yes |
| `summit_reveal_shiva_1` | Shiva | Every lesson was mine to give. Every step was yours to take. | the statue lit | yes |
| (no id) | Yudhveer | Mahadeva... | he kneels before the statue | subtitle only |
| `summit_reveal_shiva_2` | Shiva | The dark is lifted from the mountain. Go home, Yudhveer, and teach what you have learned. | the eclipse passes, last shot | yes |

## Tools

- **ElevenLabs:** voices, character sound effects, music.
- **Meshy:** characters and props (the placeholders above).
- **Blender:** the tool connection is already set up; for building and lighting maps.
- **Poly Haven:** CC0 textures, skies and models, for the village and the island.
- **Mixamo** (downloaded by the user): animations.

## Decisions (2026-10-04)

- **The guru** seems to die in the raid but is captured; at the end he is revealed as Shiva incarnate (the summit's
  Shiva statue).
- **The island** is its own chapter (III), before Dwarka (now IV); the summit becomes V.
- **The mace** is one mace, held in both hands. No shield while he carries it.
- **Trial areas are not explorable** (the prologue arena, the akhada training), except the island, where
  exploring is the mission.

## Already decided (from earlier sessions)

- Sound: the per-place ambience stays (stepwell, jungle, sea, mountain with thunder and lightning). The synthesized
  character sounds were reverted; they are to be replaced with real ones. Done: 18 recorded ElevenLabs effects
  (public/assets/sfx, per-weapon whoosh and impact, roars, parry, block, telegraph, phase surge) play through
  `SoundFX` with slight pitch and level variation, the synth kept as their fallback; recorded music loops
  (public/assets/music: title, village, baoli, akhada, island, dwarka, summit, boss, andhaka_final) crossfade per
  chapter and boss (`LEVEL_MUSIC` and `Finale.music` in Engine), dip under voices and in cutscenes; Andhaka laughs
  (voice/andhaka_laugh) as his entrance smile begins and at his second phase.
- Andhaka's in-game entrance at the summit (smile, crown, sword from the stone) is the reveal of his face.
- **Yudhveer has no voice** (2026-10-05): his lines are subtitles only, with no `voice` id and no recording. Every
  other speaker is voiced. His old takes are kept in `game asset/voice/unused_yudhveer/`.

## Roadmap

Each milestone is one chat. Start it with: "Read docs/STORY.md, let's do milestone N." Tick it off here when done.

- [x] **0. Merge and set up** (this chat or a short one): merge `campaign-production-pass` into `main`; connect
  ElevenLabs, Meshy and Poly Haven.
- [x] **1. Progression system:** five chapters (the island inserted as III), the hero's kit per chapter (weapon,
  shield, allowed moves), saved with progress.
- [x] **2. Hero weapon sets:** lathi, basic sword, two-handed mace (own animations), magical sword; hit data,
  trails, sounds. The user downloads the Mixamo packs it asks for.
- [x] **3. Story delivery:** dialogue and subtitle system, cinematic cutscene tools for story beats (beyond intros),
  voice line playback.
- [x] **4. Prologue:** the small village arena, goons, the scripted loss, the guru taken, Andhaka's silhouette.
- [x] **5. Chapter I rework:** lathi fight, the guru's remembered teachings, the freed Guardian's words.
- [x] **6. Chapter II rework:** the sunset relight, the sword-training cinematic, the vanara mentor (placeholder;
  the user's model since 2026-10-05), shield and parry training, the ending that points to Dwarka.
- [x] **7. Chapter III, the island:** the new underground lamp-lit map (explorable), mini monster and archer
  placeholders, the blessed mace.
- [x] **8. Chapter IV, Dwarka:** the hero with the mace, Shalva mace against mace, the truth about Andhaka,
  Takshaka's prophecy and the sword.
- [x] **9. Chapter V, the summit:** the second minion type, the guru-as-Shiva ending cinematic, credits.
- [ ] **10. Voices and sound:** ElevenLabs voices for every line, real character sound effects, music per chapter.
  (Effects and music wired; the island track awaits its chapter; remaining: voices for every line.)
- [ ] **11. Replace placeholders:** the user's Meshy models (island monsters, second minion, weapons;
  the mentor is done).
- [ ] **12. Polish and balance:** full playthroughs, difficulty curve across the five chapters, performance,
  loading sizes.
- [ ] **13. Release:** final build, deploy, a trailer if wanted.

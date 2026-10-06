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
- Behind the raid stands a huge figure with a great sword: **Andhaka, seen almost only as a shadow**. The beaten boy,
  concussed, sees his shadow fall over him and climb the wall behind him, hears his tread and his voice, and sees
  him clearly for under a second, a black shape against the sunset (see "The prologue's ending"). The mystery stays until the summit, where his
  entrance (found seated on his rock throne, laughing; the smile; the crown; rising with the sword drawn from the
  stone) reveals him at last.
- Yudhveer sets out after him.

### Chapter I: the Moonlit Baoli (existing map)

- **Why he is here:** the raiders fled with the guru through the old baoli. The stepwell outside the village hides
  a passage they used, and Andhaka's darkness has bound the Baoli Guardian (once the well's protector) to block
  anyone who follows.
- **Weapon: the lathi only.** No sword, no shield.
- **The Devi's gift:** before he goes down, he kneels at the shrine of Durga on the terrace above the well; she speaks
  to him, and her light burns away his training clothes and leaves him in the **divya kavach**, the armour he wears
  from then on (see "The divya kavach").
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
  - Both made with Meshy in milestone 11 (2026-10-05): the cave runts, and cave hurlers for the archers (no bow clip
    exists, so they hurl firebrands). See "Milestone 11".

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
- **Add a second minion type** alongside the current rakshasas, for variety: the yatudhana (its own Meshy model since
  milestone 11).
- **The final reveal:** the guru, thought dead and in truth Andhaka's captive, is revealed to be **Lord Shiva
  incarnate**: the statue of Shiva on the summit. The teacher was the god all along.

## Weapon progression

| Chapter | Weapon | Shield | Skills unlocked |
|---|---|---|---|
| Prologue | Lathi | none | strike (single blows), dodge |
| I. Baoli | Lathi | none | the guru's teachings, learned during the fight: chained blows, Shakti (charge) |
| II. Hanuman forest | Basic sword | **Dhal, from the vanara mentor** | block, parry |
| III. Island | Basic sword (he wins the **blessed mace** at its end) | dhal | none new: he finds the mace |
| IV. Dwarka | Blessed mace (two-handed) | none | heavy two-handed blows, the slam out of a run (the leap) |
| V. Summit | **Magical sword, from Takshaka** | dhal | the full kit |

Shakti, once the guru has taught it, stays his in every chapter after (since 2026-10-05; see "Milestone 1").

## Placeholders to replace later (the user, with Meshy)

- ~~The island's mini monsters and archer monsters (Chapter III).~~ Done (milestone 11): cave runts and cave hurlers.
- ~~The second minion type on the summit (Chapter V).~~ Done (milestone 11): the yatudhana.
- ~~The village raiders (prologue).~~ Done (milestone 11): desert dacoits with talwars.
- ~~The basic sword's model.~~ Done (milestone 11b): a Meshy talwar, see "The weapons pass" below.
- The lathi (built in code, with nodes, ferrules and a cord wrap since milestone 11b) and the blessed mace models (to
  source or make).
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
| `baoli` (I) | Lathi | no | slide, chained blows; **charge is the guru's lesson (not yet taught)** | 17/26, 22/32, spin 2 x 18/26 |
| `akhada` (II) | Basic sword | yes | slide, chain, charge; block and parry taught in the drill | 18/20, 24/26, 38/40, leap 44/48 |
| `island` (III) | Basic sword | yes | slide, chain, block, parry, charge | as the akhada's |
| `dwarka` (IV) | Blessed mace | no | slide, chain, charge, **slam out of a run** | 36/44, 46/54, spin 2 x 38/46, slam 80/90 |
| `summit` (V) | Magical khanda | yes | everything | 22/25, 30/32, 48/50, leap 55/60 |

- **Decided here:** Dwarka's "skills unlocked" (it said *to decide*) is the mace's slam out of a run.
- **Charge stays (2026-10-05, the audit's S-04):** it was decided here that charge would arrive with the magical sword,
  so the akhada, the island and Dwarka left it out. But the guru teaches it in Chapter I, and it then quietly stopped
  working for three chapters with nothing on screen to say why. It is now in every kit after Chapter I. A reversible
  call (docs/APPROVALS.md, "Audit fixes"): taking it back out is three lines in `Progression.ts`, and would want a line
  from the vanara to explain it.
- **A move a chapter is the first to grant** gets its control hint early in that chapter's fight (4 s in), once a
  session and only with "Combat hints" on: Dwarka's leap is the one (the first fights teach everything else).
- **Placeholders:** the lathi is a staff built in code (`buildLathi`); the basic sword is the Vetala's notched blade
  *(since milestone 11b his own Meshy talwar)*; the mace is Shalva's gada at 0.7 scale. The lathi's swings are cut from Mixamo's One Hand Club Combo; the mace's
  from the Mace Attack Combo, Spin Mace Attack and the brute's run-jump attack. The mace is held in the right hand
  only: both hands on the haft needs a clip authored for it. *(Since milestone 8 the mace has its own two-handed
  clips from the Great Sword Pack, held in both hands: see "Milestone 8". Since the audit fixes the lathi is two-handed
  too, on the same clips, and the sword and the khanda have scabbards: see "Holds and hand-offs".)*
- **Kit keys are not chapter numbers**, so the prologue and the island slot in as new kits (`KitId`) without
  renumbering anything. The island's kit is the akhada's sword and dhal (see "Milestone 7"); the mace is what he
  carries out of it.
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
- **How a beat's lines are heard** (`style`, 2026-10-05): `voice` by default, the remembered voice in his head (italic,
  above the HUD, a little of the place's reverb); or `aloud`, said out loud in the arena (upright, in the same place,
  dry), for a foe's taunt or a boss calling out his own move (DIALOGUE.md's new boss lines). In-fight lines of either
  kind wait behind each other. A beat's `hint` shows only with "Combat hints" on.
- **Nothing is said on the blow that ends a fight** (2026-10-05): beats are checked after the outcome, so a killing
  blow that crosses a boss's health mark starts no line, and a line already playing stops at the victory, as on a
  defeat (it used to run on through the victory's slow motion).
- **Scenes** are lists of shots. A shot has a `camera` (keys, or a function of the stage evaluated when the shot
  starts, so it frames people where they stand then), a `duration` (default: as long as its lines take), `ease`,
  `sway`, `fadeIn` / `fadeOut`, `lines` (spoken from `linesAt`, default 0.4 s; the shot holds until the last is done)
  and `cues` at seconds into the shot. Cues at 0 s run before the shot's camera is framed.
- **Cues:** `{ actor, play: 'IDLE' | ... | 'intro' }` (a state's clip, or an enemy's roar; in a cutscene `IDLE` is the
  calm standing idle, see "Standing at ease" below), `{ actor, clip: 'name' }`
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
`src/game/stories/Prologue.ts` (was `src/game/Story.ts`), `src/entities/characters/Village.ts` (its placeholder
people), `src/entities/Raider.ts`, `src/entities/Extra.ts`; the map is built by
`game asset/levels/00_village/build_village.py` (command in that folder's README).

- **The village:** a 22 m walled mud courtyard at dusk, not explorable (walls on its rim, plus the lane out through
  the north gate): three round thatched huts, a sandstone house, a neem tree on its platform, a well, a cooking fire,
  a gateway with a chhatri, and dunes, khejri trees and a hill fort outside. Flat vertex colours (two materials, under
  1 MB), cel-shaded with ink like the other arenas, under a sky drawn in a shader: the sun going down behind the gate,
  so faces turned north are lit and anything between the camera and the gate stands against the glow. Its own
  ambience (`village`: evening wind, the fire crackling, goats, a dog, crickets, the aarti bell) and music tonic.
- **Flow:** the intro shows only the place (`Chapter.introPlaceOnly`), then the opening scene: the lesson, the horn at
  the gate, the raiders stepping out of the sunset (they wait out of sight until a `show` cue; their card, "Raiders: Out
  of the desert at dusk", comes up as they do, since the place-only intro has no close-up for it), the guru stepping
  aside. The fight: raiders come in through the gate in waves (9 in all, 3 at a time); the guru's voice twice. **The
  scripted loss** (`ChapterStory.loss`): the hero cannot die (`Player.mortal` off), and once his health is under 30 %,
  or three raiders have fallen, or 75 s have passed, he is beaten (no defeat screen) and the ending plays (reworked
  2026-10-05, see "The prologue's ending"): struck down from behind and concussed, he sees Andhaka come as a shadow;
  the guru steps between them, is struck down and dragged away; he wakes at night by the burning roof, makes his vow
  and walks out of the gate. The campaign then runs
  straight on into Chapter I's intro (`Chapter.continues`), and Chapter I is unlocked.
- **Andhaka is a shadow:** his model and cleaver without the crown (he crowns himself at the summit), every
  surface black with a thin rim of sunset light (`CastMember.silhouette`); in the ending he is mostly his shadow
  (see "The prologue's ending").
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
- **Placeholders:** the raiders were the summit's rakshasas, dyed dust-brown (their own model since milestone 11:
  desert dacoits with talwars); the villagers are Mixamo characters
  re-dyed (see "The village and the reveal"); the lathi is still built in code. (The roof fire's plain cones and the
  boy's held and reversed death clips were replaced on 2026-10-05: the fire shader, Mixamo's kneel and stand-up.)
- **Left for later:** the guru has no fight of his own; every prologue line is recorded (2026-10-04). (The courtyard
  now goes from dusk to night in the ending.)

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
| `andhaka_prologue_kneel` | Andhaka (captioned "A voice": the boy cannot see who speaks, and the Baoli Guardian is the first to name him) | A boy with a stick... Your guru's soul will burn before my god. Kneel. | yes |
| `prologue_end_guru_1` | Guru | Leave the boy. It is me you came for. | yes |
| `prologue_end_yudhveer_cry` | Yudhveer | Guruji! | subtitle only |
| `yudhveer_prologue_find` | Yudhveer | Guruji... I will find you. Even if I have to climb to the top of the world. | subtitle only |

## The prologue's ending (2026-10-05)

The user: "the epilogue of the village is too childish, we need to make that more beautiful and believable", and
"the silhouette scene of final boss in epilogue is bad, we just need to see him for one second, otherwise we just
need to see the shadow of him being cast on the protag and behind him to show the gravitas; after the protag is
beaten his eyes flicker (camera effect with some blur and re focus) as he faces minor concussion, that's why the final
boss is not easily visible."

The old ending stood the raiders in a ring round a crouching boy, walked Andhaka's silhouette in through the gate in
plain view for some ten seconds, and cut away on the blow. The new one (`ending` in `src/game/stories/Prologue.ts`,
about 70 s, every voiced line and id kept) is told from inside the boy's head once he is struck:

| # | Shot | What happens |
|---|---|---|
| 1 | **The blow** (2 s): low, three-quarters on him, a slow push | Winded and swaying, he does not see the raider step in behind him. The swing lands: a crushing thud, a white flash, the picture jolts out of focus and splits, the ears ring; he reels (Mixamo "Dying", head impact to two knees). The roof the raid fired is taking hold; behind him the guru's mandir, an old villager frozen on its step. |
| 2 | **On his knees** (2.8 s): ground level in front of him | His knees go and he drops into the dust (the clip held as he lands on his knees, settling into Mixamo's "Kneeling Idle"); the edges darken, the focus swims; a slow blink. The haystack by the south-west hut catches from the roof's sparks. |
| 3 | **His eyes** (5.2 s): POV, head hanging, horizon tipped | The sun sinks behind the west wall and the last light comes low through the gate across the ground. Heavy footfalls (a thud, dust and a jolt each stride); only a pair of feet at the very top of the frame, then a huge head-and-shoulders shadow slides down the light and over him. Raiders step aside. |
| 4 | **His shadow** (5.6 s): from Andhaka's side, over the boy | The boy kneels in the dark of it; behind him the shadow grows up the south wall with each step, head, shoulders and the cleaver, until it stands over him. Andhaka speaks; his line runs on over the next shots. |
| 5 | **Keep your feet** (2 s): low, side on | He tries to rise on his lathi (Mixamo "Standing", kneel to stand, held a third of the way up), the shadow's gold edge behind him. |
| 6 | **The glimpse** (1.3 s): POV, up | His eyes fight into focus for under a second ("Kneel."): the giant against the sunset, the cleaver catching the light in a glint. It swims away again. The guru starts toward them. |
| 7 | **The fall** (1.2 s): POV tumbling | A blow from behind; the world tips over into the dust and his eyes close. |
| 8 | **In the dust** (3.6 s): POV, head on its side | His eyes open: Andhaka's feet, blurred; the guru's feet and staff come between them and the guru turns to look down at him. |
| 9 | **The guru** (~4.5 s): close, in profile, long lens, firelit | He turns from the boy to Andhaka: "Leave the boy. It is me you came for." Andhaka's hand at the edge of frame; the boy's eyes hold on his face (the blur eases). |
| 10 | **The laugh, the blade** (4 s): POV from the dust, up | Swimming and doubled: the guru's back, the dark mass beyond it, laughing (`andhaka_laugh`). The blade goes up and comes down; the guru falls back beside the boy; the laugh cuts off as his eyes shut. |
| 11 | **Black** (1.8 s) | "Guruji!" |
| 12 | **Taken** (5.6 s): POV, eyes half open | In the bright gate, shapes going: a raider drags the guru away by the arms, Andhaka goes after, their long shadows reaching back across the ground to the boy. A horn. His eyes close. |
| 13 | **Black** (1.8 s) | The ringing ebbs and the fire's crackle comes up. Night falls. |
| 14 | **Later** (6 s): high and wide, slowly closer | Night: indigo sky over a dull red horizon, the roof burning lower and charred, the roofs outside the walls burning, its smoke leaning off across the sky, sparks and ash coming down; the boy in the dust of the circle; the dead where they fell, a wife on her knees by her husband, a son weeping over his father. The chapter's cleared line comes up over it as a quiet caption, "The village is quiet. The guru is gone." (the prologue runs straight on into Chapter I, with no chapter-complete screen to show it). |
| 14b | **The shrine** (4.2 s): low at the mandir's step, lifting | Its lamps still burning, a woman praying before it; the camera lifts past the bell to the saffron flag against the smoke. |
| 15 | **He rises** (4.6 s): low, side on, rising with him | Off his face onto his hands and knees, onto one knee, and up (Mixamo "Standing Up", from lying). |
| 16 | **The vow** (with the line): close, firelit, ash falling | In front of him, the mandir behind him (its lamps, the bell, the flag over his shoulder): "Guruji... I will find you. Even if I have to climb to the top of the world." |
| 17 | **The threshold** (10 s): from the path outside the gate, then rising away | He walks out of the burning village toward us, a dark figure in the gateway where Andhaka stood; the fires behind him throw his own long shadow out ahead of him into the desert. He stops on the path; the camera rises over the dunes; fade. |

**How long Andhaka is seen:** clearly, only in shot 6, about 0.7 s in focus (1.3 s in all, the first and last of it
swimming). Everywhere else he is his shadow, his feet at the edge of a POV, a blurred and doubled dark mass (shot 10),
or a small shape in the bright gate through half-closed eyes (shot 12). He is still drawn as a silhouette; his face is
kept for the summit.

**The shadow** (`Level0_Village.gateLight`): a real shadow from a shadow-casting light, not a decal. A spotlight just
inside the gateway, under the lintel (3.6 m up), between the gate's torches with the sunset behind them, aimed down
the courtyard. Because it sits barely above Andhaka's head (3.15 m), his shadow is thrown far ahead of him and
magnified: it reaches the boy when Andhaka is only a few steps inside the gate, swallows him, and climbs the south
wall behind him to about 2.4 m as he comes to stand over him. Meanwhile the sun drops (`setSun`: the key light falls
to 15 %) so the gate's light rules the courtyard floor. The light is built with the level (so lighting it compiles no
new shaders) with its shadow map drawn once and then only redrawn while it is lit; the last shot moves it behind the
boy (`aimGateLight`), "the fires of the village", to throw his shadow out of the gate.

**The concussion** (`src/cinematics/Concussion.ts` drives `src/core/postfx/ConcussionEffect.ts`): a reusable post
effect, its own pass after the grade (so it blurs the finished picture, ink and bloom included), skipped entirely when
nothing shows. One pass, 16 taps on a golden-angle disc turned per pixel: out of focus (more toward the edges), double
vision (half the taps read a shifted picture), colour fringes toward the edges, the edges darkening, colour drained, a
white flash, and eyelids (a slit closing from top and bottom, corners first). Its driver eases all of it from scene
cues: `hit(strength, level)` (a blow: flash, jolt, the focus thrown out, the ears ringing), `daze(level, s)` (how
dazed, the focus swimming on its own while dazed), `focus(clear, s)` (fighting to focus: 1 pulls it sharp),
`blink(close, hold, open)`, `lids(to, s)` (eyes sinking shut / opening), `end(s)`. The sound goes with it: a low-pass on
the whole mix (`SoundFX.muffle`), a high beating whine in the ears (`playEarRing`) that is not muffled. It runs on the
game clock (SceneFX), and is undone by `end`, by skipping (the night shot's essential `end(0)`) and when the chapter is
left. Also new for it: `CameraKey.roll` (a Dutch angle), `joltCamera` (a cutscene camera shake: blows, footfalls),
`SceneShot.carryLines` (a line spoken on across cuts), `Character.playClip` `startAt` / `reverse`.

**The place** (`Level0_Village`): `setNight(k)` takes the sky to indigo over a dull red horizon and the lights and fog
from sunset to moonlight; `setRaidFire(k)` (the roof's light now stays in the scene, dark, from the start: no shader
recompile when it catches; its flames a deeper red-orange); `Smoulder` (`src/levels/environment/Smoulder.ts`): the
roof's smoke column leaning off on the wind, lit from beneath, sparks drifting across the courtyard and ash falling
(two draws). `chapter-start` puts all of it back, so a retry starts at dusk with the roof whole.

**Sound beats:** the crushing blow, the ears ringing and the world muffled; giant footfalls; Andhaka's line muffled
and far; the laugh; the falling blow; silence and "Guruji!"; the raid horn as they go; the fire's crackle as the
ringing ebbs. (New synths then: `playHeavyStep`, `playBodyFall`, `playEarRing`. Since milestone 10 the tread, the
falls, the falling blow and the raid horn are recordings; the ear ring stays a synthesized tone.)

**Room for a line:** the guru arrives facing the boy and only turns to Andhaka at the start of shot 9, a natural place
for "Keep your feet, Yudhveer" (docs/proposals/DIALOGUE.md, 8A) if that is approved. Nothing else was added: no new
lines, voiced or not.

- **Testing:** `__debug.chapter(0, false)`, `__debug.win()`, then `__debug.advance(s)` in small steps (it ticks the
  level too: its flames, smoke and fire light move with the steps) and `__yudhveer.sceneManager.render()` before a
  screenshot. `Concussion.state` reports the daze.
- **Left for later:** a real fall, a struggle up and a drag (Mixamo: "Getting Up", "Dragging" / "Being Dragged") would
  replace the held and reversed death clips and the dragged guru's slide; the raiders could carry torches; real
  footfall and fire recordings.

## Milestone 5: Chapter I (landed)

"The Moonlit Baoli", chapter id 1. Code: `BAOLI_STORY` in `src/game/stories/Baoli.ts` (its own file, so the later
chapters' stories can be written alongside it), wired in `src/game/Chapters.ts`; small additions to
`src/cinematics/Scene.ts` and `src/entities/Extra.ts` (the ghost) and `src/core/Engine.ts` (spacing of in-fight lines,
the hint for a move just learned). The map and the Guardian's fight are unchanged.

- **Flow:** the intro shows only the stepwell (`introPlaceOnly`); the Guardian rises in the opening scene instead.
  **Opening:** low behind the boy as he walks in across the island on the raiders' trail toward the dark shape hunched
  at its middle; he tells it to stand aside; it rises and roars (its name card); for a breath his guru stands at his
  shoulder, pale and see-through, and tells him to look at its feet; gone, and over his shoulder into the fight.
  *(Since 2026-10-05 the opening begins at the Devi's shrine above the well, where he is given the divya kavach:
  see "The divya kavach". There he lays the lathi down on the stone at his right and takes it up again as he rises:
  see "The weapons pass".)*
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
- **Decided here:** the Guardian stays the Guardian (its name card is unchanged); it speaks lying where it
  fell (no dissolve or rising). The chapter's card lines are unchanged. *(Since 2026-10-05 it speaks as its shade,
  risen over the body: see "How the dead speak". Its epithet is "Keeper of the stepwell", was "Asura of the stepwell":
  it is the well's own protector, bound, not a demon of it. Falling to it, the defeat screen says "Baoli Guardian still
  stands." and, under it, the chapter's "The stepwell keeps its guardian.")*
- **Left for later:** the guru's and the Guardian's lines are unrecorded (Yudhveer's are subtitles only, no voice); the Guardian has no "bound" look in the fight (darkness on it, freed
  light at the end); the ending is framed off the boss's head bone wherever it fell, so an odd fall (in the pool, on the
  steps) can frame less well; the guru's voice in the fight has no ghostly treatment beyond the in-fight italics.

### Chapter I lines

| Id | Speaker | Text | Recorded |
|---|---|---|---|
| `baoli_devi_1` | Durga | You climbed to my door with a stick of bamboo, and a grief too heavy for it. | Moana, take B |
| `baoli_devi_2` | Durga | What they carried down this well, they will not keep. Follow it. | Moana, take B |
| (none) | Yudhveer | With a stick of bamboo? | subtitle only |
| `baoli_devi_3` | Durga | Not alone. Wear my kavach. No evil will pierce it. Go, my child. You have my blessing. | Moana, take A; a small shankh under it |
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
  catching with a small flare (a FireField group per lamp, the lamp clock its amount: one draw for every flame; see
  "Real fire everywhere") and its light (mural glow, halo, the nearest grazer) rising over a second and a half. Story cues
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
  cut from Great Sword idles by `game asset/characters/vanara_post.py`.
- **The vanara talking** (2026-10-05, Mixamo `Vanara-*` clips): three clips laid over `staff_rest` by
  `vanara_post.py`, the head, neck and left arm from Mixamo and the rest (the right hand on the planted staff, the
  legs) from `staff_rest`, so the staff stays planted while he talks: `staff_talk` (looped, General Conversation),
  `staff_point` (Looking Down Then Pointing Forward: a look down, then the free hand out) and `staff_shake`
  (Thoughtful Head Shake, the head only). Used on his lines: the opening ("You strike where I was", leaning on the
  staff once he has stepped aside; the dhal handover), the arrival ("Enough..." talks; "You did not climb this hill
  alone" points the two out), and the ending (a head shake on "Not from me", talking through Dwarka and Shalva, the
  look down and point on the island line, then talking on). Between them, and wherever he is not sparring, he stands
  at `staff_rest` (his calm idle; the guard idle `great_sword_idle` is only for the montage and the spar). No staff
  attack clips: Mixamo has none that beat the Great Sword sweeps.
- **Framing** (2026-10-05): the dhal handover is shot square on from the boy's shield side, the vanara stopping 1.45 m
  short of him with the staff planted at his side, so the staff no longer crosses the dhal. *(Since the audit fixes he
  really hands it over: see "Holds and hand-offs".)* For the lesson he squares
  up on `AKHADA_MARKS.spar`, off the boy's right front (~48 deg), and the boy turns to face him: the follow camera
  (behind the boy, looking north) keeps him clear of the boy even once he has closed in to strike, where straight down
  the north-south line he was hidden behind him. The last opening shot ends over the boy's shoulder where the follow
  camera picks up.
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
`src/entities/IslandMonsters.ts` and `src/entities/characters/IslandMonsters.ts` (the creatures), an
`ARROW` projectile (`ProjectileManager.spawnArrow`) and an `island` ambience in `SoundFX`. The map is built by
`game asset/levels/03_island/build_island.py` (command in `game asset/README.md`), 1.2 MB; dressed on 2026-10-05
with 23 Sketchfab models and 3 Poly Haven textures (7.5 MB), then the Meshy boat (8.1 MB, 8,142,180 bytes; credits in
docs/ASSET_CREDITS.md).

- **Chapter numbers:** the island is inserted as id 3; Dwarka is now id 4 (Chapter IV) and the summit id 5 (Chapter V).
  Level indices (`Chapter.level`, Engine's per-level tables) are unchanged; the island's is 5. Dev: Shift+3 or
  `__debug.chapter(3)` is the island, `__debug.chapter(4)` Dwarka, `__debug.chapter(5)` the summit. Old saves keep
  their number, so a save that had reached Dwarka (3) now opens the island instead.
- **The kit (decided here):** he goes down with the akhada's sword and dhal (`island` kit: sword, slide, chain, block,
  parry, charge; block and parry already learned at the akhada, charge from the guru) and comes up with the mace.
  Taking it up in the ending equips the `dwarka` kit on the spot (`Player.equip(KITS.dwarka)` in an essential hook,
  behind a black hold), so the last shots show him with the mace and Chapter IV starts with it already in hand. The
  weapon table's island row names the mace he wins there; he fights the island with the sword.
- **The map:** a sea cave where the boat lands, then about 90 m of caves going north and 2.5 m down: the landing (two
  lamps either side of the way in), a winding tunnel, **the hall of bones** (a brazier, the remains of earlier
  seekers, stalagmites for cover), a descent with a torch, **the black pool** (a pit of black water ringed with
  stones, ripples spreading on it, braziers on the dry side), a last tunnel, and **the shrine** (a dais, the altar
  with the mace on red cloth, a stone torana, two brass deepastambhas). Three dead-end alcoves hold eyes. The cave
  is one shell: a union of ellipsoids voxel-remeshed, roughened, pressed flat onto the path's floor heights, turned
  inward and painted with vertex colours; it is its own trimesh collider. The arena bounds are a single wall across
  the landing, keeping him out of the sea; the pool has an invisible drum round it.
- **Light:** almost none but the lamps (20 flames, exported as `Lamp_*` empties; the flames burn in a FireField, see
  "Real fire everywhere"); the 8 nearest to the camera share a fixed pool of 8 point lights (flickering with their own
  flames, stood clear of the rock, no shadows; a constant count so nothing recompiles), plus moonlight at the
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
- **Creatures (their own files; their own Meshy models since milestone 11, see "Milestone 11"):** *cave runts* (mini
  monsters, 1.1 m, clawing goblin-things; placeholder: the rakshasa at 0.6 scale): 24 health, fast (5.4 m/s), quicker
  swings, light blows; each closes in on its own side of him so a pack surrounds him. *Cave archers*, now *cave
  hurlers* (1.8 m, soot-black with ember cracks that glow; placeholder: Mayavi at 0.85 scale): 50 health; they keep 6
  to 12 m off, circle, back off, and every 3 to 4.6 s draw (a brand catches fire in the hand, the glow gathering, and
  the telegraph sounds, 0.85 s) and hurl it, a shaft of fire (13 damage; slide under it, block it or parry it back);
  only with a clear line to him (a ray against the rock), otherwise they come round; cornered (under 2.4 m), they
  claw. A hit during the draw cancels the throw.
- **Story:** the opening on the landing (the boatman, unseen under his boat's canopy, will go no further); his own
  thoughts over the walk; the voice in the shrine as he enters and when the keepers are down; the extraction: he
  steps up to the altar, the voice, the picture goes dark as he lifts it, then he stands with the mace in both fists,
  gathering its power (the Great Sword Pack's "Power Up": see "The weapons pass"), the voice sends him to Dwarka, and
  he walks back up the way he came. Yudhveer is subtitles only.
- **Left for later:** (the creatures' real models: done in milestone 11; there is still no bow clip, so the archers
  are hurlers who throw with Mayavi's cast); a clip for lifting
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
  and in the game (the idle and the smash, close up). *(Since the audit fixes the hero's own gada is held 6 cm further
  up the haft, `grip: [0, 0.06, 0]`, so his left fist closes on the haft about 8.5 cm above its butt instead of on the
  butt; see "The hands".)*
- **Testing:** `__debug.chapter(4, false)` then `__debug.win()` plays Shalva's fall; `__debug.win()` again, once
  Takshaka is up, plays the ending.
- **Flow:** the intro, then the **opening**: Shalva on the rosette knows the island's mace and the boy; "Where is my
  guru?"; Shalva promises the answer if he is beaten, and roars. The fight. **Shalva falls**: a beat scene
  (`{ fallen: 'shalva' }`) before anything else, in which the dying Shalva tells him the truth: Andhaka burns wise
  souls before his god to grow great enough to stand against Shiva and take his seat on Kailasha; the guru, "the
  wisest of them all", is kept for the last fire, on the summit. The guru's being Shiva stays hidden. The sea stirs,
  the hero turns to it, and Takshaka's own arrival (as before) brings the serpent king up. The **ending**: Takshaka
  dying; his hundred years serving Andhaka; the recorded prophecy; naga fire, and the khanda stands deep in the stone
  in front of him, leaning, its hilt toward him; the mace laid on the stone at his side, he steps up, goes down on one
  knee, takes it by the grip and draws it as he rises, and stands with it up in the sword-and-dhal idle; "Rest, serpent
  king. I will carry it to the summit." The camera rises away. *(Reworked by the audit fixes: see "Holds and
  hand-offs".)*
- **New in the engine (one change):** the final boss now waits for a story beat that is due (`Engine.beatDue`), so a
  fallen boss's last words play before the next boss comes on.
- **The sword in the scene** is `yodha_khanda.glb` loaded as a prop, stood in the level and then mounted on the right
  hand socket with the summit's own hold (`WEAPON_SETS.khanda`, so the same size and grip as there); he keeps it, and
  the mace lies where he laid it, behind the chapter-complete screen. Leaving the chapter (a retry, the summit, the
  title) puts the mace back in his hands and frees the prop (SceneFX's clear), and the opening's essential hook does
  too, so a retry starts with the mace. The next chapter's kit equips the khanda properly.
- **Weather:** it rains (see "Dwarka in the rain").
- **Shalva dives:** he can go under the flooded stone and burst up beside the hero (see "Shalva's dive").
- **Moves** (2026-10-05): the kit keeps the guru's Shakti (charge), and Dwarka is the first chapter to grant the leap
  (the mace's slam out of a run), so its hint ("Sprint with {sprint} and attack to leap in with a falling strike.")
  comes up 4 s into the fight, once a session, with "Combat hints" on. Falling to Shalva or Takshaka, the defeat screen
  says "<name> still stands." and, under it, "Dwarka sinks a little further."
- **The level's file** (`public/assets/dwarka/dwarka_browser.glb`, 2026-10-05, audit W-12): re-exported from
  `game asset/levels/03_dwarka/dwarka.blend` by `export_glb_dwarka.py` with the first export's own selection, options
  and touch-ups to the file (the unlit hills, the moss and algae's vertex alpha), now with WebP textures and meshopt
  geometry as the other levels: 26.3 MB to 11.5 MB. Checked against the old file: the same nodes, meshes, materials
  and cameras, UVs and colours identical to the byte, positions within 5 cm on the 2.8 km horizon disc and half a
  millimetre in the arena (16-bit positions, not the exporter's 12). It also loads a little faster here, served from
  this machine (the chapter about 0.62 s against 0.75 s, its first frame 0.37 s against 0.49 s); over a network the
  15 MB less to download is what counts (about 2.4 s less at 50 Mbit/s). The old file is in
  `game asset/levels/03_dwarka/_backup_2026-10-05/`.
- **Left for later:** the flame burst is the existing naga fire; the mace is laid down across a cut (no laying-down
  clip); the khanda is held in the sword pack's idle without the dhal; the sprint is the mace's run played faster.

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

- **The second minion, the yatudhana** (a sorcerer-demon of Vedic lore, about 1.8 m; its own Meshy model since
  milestone 11, see "Milestone 11"; the placeholder was Mayavi's model at 0.86 scale, tinted ash-grey). A ranged caster: it runs its bridge route like the brutes but leaves it once the hero is within
  11 m, keeps 5 to 9.5 m off, and throws a single fire bolt (Mayavi's, deflectable back at it) every 3.8 s or so; cornered
  inside 2.2 m it claws and kicks. Frail: 38 health, 30 posture, its blows at 0.75. The brutes press in while the
  casters hang back, so the hero has to deflect while crowded or break off to run them down. The waves are now 8 (was
  6): the third, sixth and eighth are yatudhanas (`Horde.alt`). The intro card's epithet no longer counts them.
- **The ending** (`summit-ending`, after Andhaka falls and the victory beat):
  1. From black, high over the arena: Andhaka fallen, the boy sheathes his blade (in its scabbard on his left hip,
     since the audit fixes). A voice from the dais: "Yudhveer."
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
  10. Low behind the boy, small before the lit feet: he lays his dhal down beside him, goes down on his knee (Mixamo
      "Kneeling Down") and joins his palms in prayer (`praying_anjali`: Mixamo's kneeling "Praying" with the palms
      pressed together before his chest; see "The hands"), the camera coming round in front of him: "Mahadeva..."
  11. The eclipse passes (the sky and ambient light rise and the key light warms over 9 s); he prays on as the camera
      draws back and up off the dais, the last line, a long fade to black.
- **His glory's music** (2026-10-05): as the guru turns to light (shot 7) the reveal's own piece starts at once over
  the dimmed summit loop, `shiva` (see "The village and the reveal"): its conch on the light, its damru and drums as
  the statue wakes, its chorus as the eclipse passes; it plays on into the credits and hands over to the title's loop
  when it ends.
- **The guru on the summit** is a story cast member (`GURU`), out of sight through the fight and found in the ending.
  He kneels at Shiva's feet in Mixamo's Kneeling Idle, retargeted onto his rig (since the weapons pass, milestone 11b;
  he used to be held at 1.5 s into his `death` clip, sunk to the ground and slumped), his staff in his hand and planted
  in the stone beside him.
- **Credits:** after the last chapter's ending the chapter-complete screen is replaced by a slow roll over black in the
  title's type (first, alone, the chapter's cleared line, "The summit is silent." (since 2026-10-05: no screen showed it
  before); then the Devanagari name, YUDHVEER, Created by TejasGov; Built with Three.js, Rapier, Vite; Characters:
  Meshy, Mixamo; Voices, sound and music: ElevenLabs; Places: Blender, Poly Haven; the third-party models and textures;
  "Thank you for playing."), 72 s (`ROLL_SECONDS`) under the reveal's chant and then the title's music, then the title.
  "Return to the title" (bottom right; confirm, back or Esc) leaves early. The campaign is still unlocked one past the
  last chapter, as before.
- **In the last fight** (2026-10-05): when the hero falls under 35 % of his health against Andhaka (not in the waves:
  Andhaka's arrival gives him his health back), the guru's voice comes back to him once, the prologue's recorded
  "Breathe. Feet first." (`prologue_fight_guru_2`, the remembered `voice` style), so the ending's "You kept your feet"
  answers it.
- **New in the scene system:** `SceneFX` (`tween`, `every`, `onClear`): effects a scene's `run` cues start that play
  out on the game's fixed step (so `__debug.advance` drives them) and are undone when the chapter is left (lights put
  back, meshes freed). `DivineLight`: `intoLight` (someone turns to light and fades), `awaken` (a statue's stone warms,
  a light, a halo, motes), `dawn` (the place's light rises and warms), `motes`. Lights are added dark in the opening
  black and only started later, so their shader rebuild is never on camera.
- **Decided here:** the guru is found slumped, not visibly bound; Shiva speaks in the guru's voice (speaker "Shiva",
  ids `summit_reveal_shiva_*`, to be recorded with the guru's narrator voice); the eclipse passes at the end (only for
  the scene; the map is untouched); the reveal is light and the statue, not a model change.
- **Left for later:** no bonds for the captive guru (he kneels free; the kneel clip came with milestone 11b); the yatudhana's own cast and death clips (it has
  its model since milestone 11, and still moves with Mayavi's clips); a hold-to-skip on the credits rather than a
  button. (Every line is recorded: see the table below.)
- **Testing:** in a dev build, `__debug.chapter(5, false)`, then `__debug.win()` per wave until Andhaka arrives, let
  his entrance play, `__debug.win()` again: the ending, then the credits.

### Chapter V lines

The guru's voice (and Shiva's) is the deep narrator in `game asset/voice/VOICES.md`. Yudhveer is subtitles only.

| Id | Speaker | Text | Trigger | Recorded |
|---|---|---|---|---|
| `summit_crown_andhaka_1` | Andhaka | Burn, Agni. Let the gods see their new ruler. | his entrance, raising the crown to his head | yes (option A, approved 2026-10-05) |
| `prologue_fight_guru_2` | Guru (remembered, in the fight) | Breathe. Feet first. | Andhaka's fight, the hero under 35 % (once) | the prologue's recording, reused (2026-10-05) |
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

## Andhaka's model and entrance (2026-10-05)

"We can't compromise on the final boss quality." Andhaka is now the user's 100k-triangle model
(`game asset/characters/sources/andhaka_100k.glb`, the same design as before at far higher fidelity; it has no crown
of its own, so the crown stays the prop he puts on). The old model (the prototype's Mahishasura, adopted) had a
slightly broken rig; the new one is auto-rigged from markers with Mixamo-named finger bones, its weights checked at
the shoulders, wrists and hips in the attacks, the death, the crouch and sitting (a drape over his left shoulder
and down his back is kept off the arm and the thigh, so it neither flies up with the arm nor swings out like a tail
when he sits). All ~102k triangles are kept; the colour map stays 4k, normal and metal / roughness 2k (WebP), 8.8 MB
in all with 17 clips (was 5.5 MB). The face's Smile shape key is ported (the mouth is split finer, the grin a
little stronger to read through the beard). Fight clips, states and tuning are unchanged.

**The entrance** (`coronation`, `game asset/characters/andhaka_intro.py`; framed by `enthronedEntrance` in
`src/cinematics/Intros.ts`). When the last rakshasa falls he is found on the dais at the head of Shiva's stair,
SEATED on a rock throne (built by the summit level from the clip's own "seat" blocks, so it fits him; it stands empty
through the waves and stays for the ending), his cleaver planted in the stone by his right knee, his crown on the
throne's taller left stone. His laugh (`andhaka_laugh`, already recorded) plays as the smile begins. As the crown
settles the Agni beacon takes fire, and he speaks one line (subtitle only until a recording is approved: see
docs/APPROVALS.md).

1. **Found** (0 - 2.6 s): from down the stair, low, the king on his rock, laughing (Mixamo's Sitting Laughing).
2. **The laugh** (2.6 - 4.5 s): closer, from his sword side, as he throws his head back, doubles over and settles
   (into Sitting Idle).
3. **The smile** (4.5 - 6.25 s): close on his face, looking down the stair at the boy, the Smile shape key full. From
   his eye line on a long lens (about 16 degrees, 2.35 - 2.7 m off), not from below on a wide one.
4. **The crown** (6.25 - 8.1 s): from his left, his hand takes the crown off the throne's arm and raises it. At 7.25 s
   (`CROWNING_LEAD`, 1.75 s before the "crowned" mark) he speaks, recorded (`summit_crown_andhaka_1`, take A, 4.96 s,
   speech 0.09 - ~4.7 s): "Burn, Agni." as he lifts the crown, a breath, "Let the gods see their new ruler." over the
   beacon, ending just before his roar (12.0 s). The subtitle shows with the voice (it lasts the recording plus the
   usual tail); the recording is fetched as the entrance begins.
5. **Crowned** (8.1 - 9.35 s): close on his face from his right (his left arm, raising the crown, stays clear of his
   face), level with it on a long lens, as he sets the crown on his own head, bowing to it, grinning. As it settles
   (9.0 s, the clip's "crowned" mark) the beacon takes fire at his word.
6. **The beacon** (9.35 - 10.55 s): low in front of him, off the line from his head to the beacon: the crowned king
   under Shiva's statue, the brazier on the west pilaster flared up, and the beacon's fire racing up off the far cliff
   into the sky behind him. His fist goes to the hilt.
7. **He rises** (10.55 - 12 s): low on his sword side, he stands (Sit To Stand), the blade coming up out of the stone.
8. **The roar** (12 s - end): the capture's roar, his name card, then his stance and the fight.

**The beacon waits for the king.** The summit's fires (the Agni beacon on the far temple cliff, `AgniBeacon`; the
braziers on the pilasters either side of Shiva and the warm spot that throws their light over the dais, in
`Level4_Summit`) smoulder from the start of the chapter: coals and a few embers on the beacon's altar, no column,
the braziers' coals (small tongues low in their bowls, an ember now and then), the dais dark. When the crown settles BossAndhaka cues the level (`crowned`): the altar flares, the
fire climbs the column (slow off the altar, racing up into the sky over about 3 s), the embers and the beacon's light
come up, and a quarter second later the braziers catch with a burst of flame and sparks and the spot floods the dais;
a flame burst sounds. It burns through the fight and the ending. A skipped or cut-short entrance (or none) lights it
all at once (`crowned-settled`, from `settleIntro`). Every chapter start, a retry included, cues `chapter-start`: a
retry restarts the waves, so the beacon smoulders again until his entrance crowns him again (or is skipped).

**His face in the close-ups** (fixed 2026-10-05): Blender's automatic weights had shared his face between the Head and
neck bones as a smooth gradient (the nose about 55% Head, the mouth 45%, the chin 30%, the beard partly on the spine
and collarbones). Whenever his head turned on his neck (the seated laugh and idle, the bow to the crown) the brow went
with the head and the mouth, chin and beard lagged 3 - 4 cm behind: the face drew out by about a tenth of its height
in the close-ups. `andhaka_face.py` now gives the face and skull wholly to Head and the beard 85% and up (easing back
to the automatic weights down the throat and at the nape); measured in the smile close-up, the face no longer moves
against the skull at all (the beard's tip by about 2 cm). The close-ups were also moved up to his eye line and onto
longer lenses. The Smile shape key is unchanged.

For cutscenes he also carries a calm standing idle (Mixamo's Standing Idle With Axe, `standing_idle_with_axe`,
`ANDHAKA_CALM_IDLE`); the prologue's silhouette stands in it over the boy instead of the fight's guard shuffle.

- **Testing:** `__debug.chapter(5, false)`, then kill the wave minions only (not Andhaka: `__debug.win()` kills the
  waiting boss too) until the mode is `intro`, then `__debug.advance(s)` and `__yudhveer.sceneManager.render()` to step
  through the shots.

## Standing at ease (2026-10-05)

The user: no character, in any chapter, should do "that stupid static jogging thing" in a cutscene, at the start of a
scene or after a battle. What it was, chapter by chapter:

- **Everywhere:** out of the fight everyone stood in their fight's IDLE, a guard that bobs on the spot: the hero's
  sword-and-shield or great-sword stance, the brutes' heaving mutant idle, and for **Shalva** (Chapter IV) and
  **Andhaka** (the prologue's silhouette, the summit) a *strafe on the spot*, literally stepping in place.
- **Prologue, after the loss:** the raiders' AI stops when the boy is beaten, and they were left in MOVE: the run cycle
  at its slowest playback (matchSpeed's 0.5 floor) while standing still, jogging on the spot until the scene cut.
- **Chapter I opening:** the boy was placed straight behind the deepastambha on the axis (z 11.8, a 0.7 m cylinder
  collider) and walked into it for ~4 s, walk cycle running, before sliding round it. `BAOLI_ENTRY` is now x 1.5.
- **Chapter III ending:** placed 2.5 cm inside the altar's dais, he snagged on it and walked on the spot for ~2 s
  before the mace. Placed on its top now (y -2.1).
- **Any chapter, after the battle:** a won chapter whose ending had already been seen this session is only settled, so
  a hero still running (a key held) when the victory delay ran out was left in MOVE behind the chapter-complete screen,
  running on the spot (found in the code, not seen).

The mechanism (`Character.atEase`, `CharacterState` `REST`):

- **`REST`** is a state-table entry: the calm standing idle (`CharacterDefinition.states.REST`). Out of the fight (every
  mode but play and handoff: intros, story scenes, a boss's arrival, the victory, the loss, the chapter-complete and
  defeat screens) the Engine sets `atEase` on everyone, and the cast always: IDLE then plays REST (cross-fading,
  0.4 s), and a walk or run that is not really moving (after collision) for 0.2 s stands in REST too, instead of
  stepping on the spot. The state machine is untouched, so AI, input and staged walks carry on as before; in the
  fight every state plays its own clip, as it did. A cue's clip (`clip:`, an entrance) plays on until the state
  changes. Without a REST entry IDLE's own clip stands in.
- **Props at ease:** `SocketAttachment.stateRotations.REST` lowers what a relaxed hand holds: the khanda and the basic
  sword point down and ahead, the lathi stands upright at his side (slid down through his hand, its top a little
  ahead of him, `stateGrips`), the mace rests its head by his foot; the Baoli Guardian's talwar is lowered, Shalva
  holds his gada upright, the Vetala's two blades hang. (A sword in its scabbard keeps its own hold.)
- **The calm clips** (Mixamo, `Stance-` in game asset/characters/animations): `calm_idle` (Mixamo "Idle", a relaxed
  stand) for the hero (every weapon), the Vetala and Mayavi (so the yatudhanas and the island's archers); `orc_idle`
  ("Male Orc Standing Idle", heavy and still) for the Baoli Guardian, Shalva, Takshaka and the rakshasas (so the raiders
  and the island's mini monsters). Andhaka's is `standing_idle_with_axe` (`ANDHAKA_CALM_IDLE`), the vanara's
  `staff_rest`; the guru's IDLE was already his breathing idle.
- Staging: the loss and the end of a won fight stop anyone mid-stride (`Staging.begin`); a staged walk held by the
  level for 0.75 s is reported in dev builds (`[Staging] ... is held ... short of its mark`).
- Dwarka's farewell ("Rest, serpent king") lowers the khanda and stands at ease instead of the sword-and-dhal guard;
  the guard after the sword is drawn from the stone stays (a story beat).
- **Left as is:** the guru's (and the cast vanara's) pole walk is authored at 0.24 m/s and plays at its 2.4x ceiling
  at 1.1 m/s, a quick shuffle; it travels, so it is not on the spot.
- **On guard** (`Character.onGuard`): a fighter who has squared up for a fight that is about to start keeps his stance
  out of the fight instead of standing at ease; the Engine clears it as the fight starts. Andhaka sets it at his
  entrance's roar (and when it finishes), so the last over-the-shoulder shot shows him in his stance, not dropping
  into `standing_idle_with_axe`. Nobody else uses it.

## The divya kavach (2026-10-05)

The user: in the village the hero should wear "white and dark orange training attire with bamboo kavach"; in the baoli
"he then kneels in front of goddess durga's statue, and hears a prophesy and gets granted the divya kavach (his current
attire), then he fights the baoli guardian"; the Durga statue "is already in baoli map ... make it 2x in size".

- **Two looks** (`Attire` in `src/game/Progression.ts`): `training` (`yodha_training.glb`: white dhoti, dark-orange
  sash, a bamboo kavach and shoulder guard, cloth wraps; a Meshy 7 model of the same hero, auto-rigged and built with
  yodha.glb's clips, flags and height, game asset/README.md) and `kavach` (`yodha.glb`, the divya kavach). Each kit
  names what he wears as its chapter starts: the prologue and Chapter I `training`, the rest `kavach`; Chapter I's kit
  also says what its story changes him into (`becomes: 'kavach'`).
- **The change** (`Player.wear`): the kit's `becomes` rig is loaded with the chapter (`Player.ready`, through
  `Character.prepareRig`: model, props on its sockets, strike windows measured), so the swap in the scene is instant
  (`Character.mountRig`): same weapon, state, position and facing, and the clip a cue is playing carries on from the
  same moment. The hero's model and manifest come from `ATTIRE_MODELS` (`src/entities/characters/Yodha.ts`) over the
  weapon set's definition (`dressed`).
- **Retries:** the change is an essential cue, so a settled opening (any retry of Chapter I) starts the fight in the
  kavach, as the fight follows the scene. Replaying Chapter I from the title starts in training clothes again.
- **The shrine** (`Level1_Baoli.enlargeShrine`): the Devi on her lion (`Statue_Devi`), her pedestal, lamps, offerings
  and glow, all under the `Kaali_Shrine` node on the terrace ~66 m beyond the island, are scaled 2x about the
  pedestal's base at load (the statue now stands ~8.7 to 18.7 m up, her face ~16.8 m), with its three lights moved out
  with it and the pedestal's authored collider doubled. A floor collider is laid on the terrace between the stone lions
  and the pedestal for the scene (outside the arena's walls; the fight never reaches it). She reads from the arena now,
  and stays lit (halo, eyes) after the scene.
- **The opening, new shots first** (`BAOLI_STORY.opening`; the old shots follow unchanged):
  1. From black: low behind the boy, in training clothes, as he climbs between the stone lions to the Devi (4.4 s, cut
     as he nears the mark the next shot puts him on; was 5.6 s).
  2. Side on: he kneels (`kneeling_down`, then `praying_anjali`, palms pressed together before his chest; the lathi is
     laid aside, hidden; 4.4 s, was 5.2: the long run of cutscenes from the prologue's loss to this fight is 2 s
     shorter, audit S-07).
  3. Low behind him, the Devi towering over him: her stone warms, a halo kindles behind her head, her eyes open in light
     (`awaken` with a softer key light and warmth for the pale stone, `kindleEyes`).
  4. Up at her face past the lion's mane: her first line.
  5. His face, looking up into her light: her second line; he answers ("With a stick of bamboo?").
  6. Square on to her: the gift.
  7. Low three-quarters on, her pedestal behind him: a shaft of light comes down on him, gold motes whirl up, his
     clothes glow hotter, embers lift off them; a white flash, and he is in the divya kavach (`kavachLight`, the swap at
     3.3 s); marigold sparks burst and the armour's glow cools as the light lifts.
  8. Low in front: he rises in the kavach (`kneel_to_stand`), takes up the lathi; fade to black.
  9. Then as before: in the stepwell, the walk in ("Their tracks end at the water..."), the Guardian rises and roars,
     the guru's memory, "Feet first, Guruji", and the fight.
- **Left for later:** Durga's lines are unrecorded (docs/APPROVALS.md has the candidates and the cost); the statue is a
  simple model, so the close shots of her face are kept medium; the kneel clips are the ones main's yodha.glb gained on
  2026-10-05 (until a branch has them, the scene falls back to `crouch` / `crouch_idle` and `calm_idle`).

## How the dead speak (2026-10-05)

The user: when a dead character speaks, show "a blue shadow of them" or frame away from the body, so a corpse is not
seen talking. Every moment a fallen character speaks, and what it does now:

| Moment | Who | Treatment |
|---|---|---|
| Chapter I ending (`baoli-ending`) | the Baoli Guardian, freed | its shade |
| Chapter IV, Shalva falls (`dwarka-shalva-falls`) | Shalva | his shade |
| Chapter IV ending (`dwarka-ending`) | Takshaka, dying | his shade |

No one else who speaks is dead: the guru in the prologue is alive when he speaks (and taken, not killed); the guru
slumped on the summit is alive; Andhaka, the Vetala, the Mayavi and the minions say nothing once they fall.

- **The shade** (`CastMember.shade`, `shadeOf` in `src/game/Story.ts`): the fallen fighter's own model without its
  weapons, a cast member drawn as a ghost (Extra's `ghostly`): cold blue (`SHADE_BLUE`), 0.6 opacity, lit from within
  by its own texture (its face and armour read in any light), a soft rim, hovering a hand's breadth up with a slow
  breath and a faint flicker, cold motes drifting up off it (`src/cinematics/Shade.ts`). It stands over the body
  (`shadeMark`: between where its feet and head lie, never nearer the hero than half a metre past its feet), turned to
  the hero.
- **Coming and going:** an `appear` cue (`{ actor, appear: true | false, over }`): it rises out of the ground through the
  body as it fades in (`shadeRises`, during the wide shot of the hero walking up, before any line), and sinks and
  fades away when its words are done: Shalva's as the sea stirs, Takshaka's as the camera rises away at the end, the
  Guardian's as the boy answers it. Skipped or settled, a scene leaves the shade gone at once.
- **Framing** (`shadeShots`, the baoli): over the hero's shoulder up at the shade's face; close on its face,
  three-quarters on, level with it; over the shade's shoulder down at the hero; side on to the two of them. Each keeps
  the ground where the body lies below the frame; the body is seen only in the wide shots, lying still, before and after.
- **Dwarka's two shades, reworked (2026-10-05)** ("make his blue soul scene less awkward using camera angle";
  `shadeConversation` in `src/game/Story.ts`). The old cut was a row of level, centred, static frames (one
  over-the-shoulder held for two long lines, a reverse with the shade's flank filling a third of the frame and the boy
  looking into the lens). Now every camera keeps to one side of the line between them (eyelines match), most stand low
  and look up so the shade stands against the storm sky and the ground where the body lies falls below the frame, faces
  sit high, clear of the subtitles, and every shot pushes in slowly. Shalva's fall (10 shots; his 5 lines and the boy's
  2 unchanged): the boy's face as Shalva goes down (the fall heard, not seen); low beside his way in, he walks into the
  frame and the camera tilts up after him as the shade rises against the storm (`rise`); low up at the shade alone
  ("Enough..."); over the boy's shoulder from his eyes ("Andhaka gathers souls..."); the reverse from beside the
  shade's shoulder, down at the boy ("To what end?"); low close on the shade ("Every soul..."); the boy alone ("And my
  guru?"); low behind the boy, the shade towering over him ("The wisest of them all..."); closer still on the shade for
  its last words; the sea stirs (as before). The body is never in frame. Takshaka's ending uses the same rise, low
  single and low close (his hood kept in frame, `headroom`); the sword, "Rest, serpent king" and the rise away are
  unchanged. Previews: `game asset/previews/shalva_shade_before_*.jpg`, `shalva_shade_after_*.jpg`,
  `takshaka_shade_after_*.jpg`.
- Lines, voices, timings and beats are unchanged; the hero now faces the shade rather than the body.
- **Left for later:** the shade's model is the fighter's own (a dedicated spirit look, or a rising clip, could come
  later); against a bright sky the shade reads paler than in the baoli's dark (Dwarka's storm grade helps).

## Dwarka in the rain (2026-10-05)

The user: "the dwarka scene needs to have rain, and also rain dependent effects like water splashing on the arena
ground, walking ripples". Chapter IV now plays in a storm, every scene and the fight. Code: `src/levels/Level3_Dwarka.ts`
(the grade, materials and wiring), `src/levels/environment/RainField.ts`, `StormSky.ts` and `WetGround.ts`.

- **The look:** a storm deck over the sunset (`StormSky`: a camera-centred dome over the HDR sky, dark grey and heavy
  overhead, one long break low over the sun where the sunset still glows, the rain haze below the horizon so the sea's
  far edge melts into it). The grade is cooler and lower: sky 0.18, environment 0.24, exposure 1.25, a weaker warm sun
  (0.34), a grey-blue fill, grey rain haze closing in from 120 to 1700 m, the front bounce light cooled to grey. Still
  Dwarka: the statue, temples and boat read in the opening wide; Shalva, Takshaka and their blue shades read against
  the grey (the shades better than against the old bright sky).
- **Rain** (`RainField`, one draw): 7,800 slanted streaks, each a camera-facing quad moved entirely in the vertex
  shader through boxes that travel and wrap round the camera, so nothing is uploaded per frame. A near box (26 x 16 x
  26 m, fine pale blue-grey streaks, faded out within ~2 m of the lens) and a far one set out ahead of the camera (110 x
  46 x 110 m, longer and wider), so wide shots get a curtain of rain and close-ups stay clear. Never thinner than a
  pixel (thinner streaks fade instead of shimmering). The wind gusts and swings; the streaks slant with it.
- **Wet stone** (`wetten`): the arena paving darker (x0.52) and glossy (roughness 0.34) with its own reflection of the
  sky; the five puddles near mirrors; the damp margins, the ruined sandstone, limestone and blockwork darkened and
  less rough. The paving and puddles carry raindrop rings in their normals (two offset grids of drops, faded beyond
  ~15 m). The sea is rougher (0.42), its glitter softer.
- **Splashes** (`GroundSplashes`, one instanced draw): 360 raindrop splash slots (a ring and, close up, a little crown
  of drops), placed and timed in the shader round where the camera looks, and kept to the arena floor; plus 64 ripples
  for things that touch the water: footsteps (two rings, a small spray when running), landings and slides (bigger,
  three rings, churned water), a body falling (Shalva, at 0.75 s into his death), and blows brought down to the ground
  (where a downswing bottoms out within half a metre of the floor: the mace's slam is the biggest, 4.8). Every dust
  puff on the floor (landings, slides, roars, leaps: `ParticleFX.onGroundImpact`) is water thrown up instead, so
  Takshaka's arrival roar raises a burst at his feet.
- **Who splashes** (`Footfalls`): every visible character in the scene (found through `ACTORS`, a weak map from scene
  group to character): by its toe bones (a foot coming down while moving), or every 0.85 m without them; shades and
  remembered figures do not touch the water.
- **Sound** (SoundFX `'dwarka'`, synthesized, no credits): the downpour (a bright hiss, a fuller body that swells with
  the gusts, a low roar off the sea), single drops pattering close by, rain gusts, the waves as before, the shankh
  rarer, the gulls gone. Distant thunder every 28-55 s with a soft lightning flash (the sky light, the cloud deck and
  the rain flare), never while a line is up (`SoundFX.hushed`). The hero's steps splash (`playWetStep`); landings, falls
  and the slam splash (`playSplash`). A recorded rain bed was offered and declined ("current is good enough"); the rain,
  waves and thunder stay synthesized. (Since milestone 10 the steps and the splashes themselves are recordings, and the
  distant shankh is the recorded conch.)
- **Cost:** 3 draw calls and ~19k triangles; at 1080p the frame was within noise of before (~8 ms either way in the
  test view); the level's update is ~0.02 ms. Nothing allocated per frame.
- **Dev:** `__debug.rain('low')` thins the rain to a third (and the splashes), `__debug.rain(false)` stops it (the
  stone stays wet), `__debug.rain()` full. There is no graphics setting yet; this is where a low setting would hook in.

## Dwarka's tide (2026-10-05)

The user asked how GPU-heavy fake tides in Dwarka's sea would be, then: "yes build the tides". Built as recommended:
a tide, Gerstner swells and baked-map shore foam; no depth-buffer foam, no planar reflections, no FFT ocean. Code:
`src/levels/environment/LivingSea.ts` (the sea, the shoreline bake, the tide line on the rock, `seaHeight`), wired in
`src/levels/Level3_Dwarka.ts`.

- **The tide:** the whole sea rises and falls 0.34 m either side of a mean 6 cm under the authored sea level, once
  every 96 s, from low water as the chapter opens (so it creeps up the rocks through the fight). At its height the
  lowest shelves round the islets (the "broken tidal reefs and ruin footings") are just awash; at its ebb their
  footings show. The horizon disc rises and falls with it and stays flat.
- **Swells:** four Gerstner waves rolling in from the open sea to the south onto the islands (44, 27, 16.5 and 10.5 m
  long; 0.3, 0.17, 0.085 and 0.04 m high; deep-water speeds slowed to 0.82): a heave, not a chop. They are drawn on a
  camera-centred grid (161 x 161 vertices, 51k triangles) whose cells are 0.5 m under the camera and grow outward to
  reach the horizon disc, snapped to 1 m steps so it does not swim; they die out toward the edge of the sea's 700 m
  square, where it meets the flat horizon disc without a seam. Normals come from the waves' derivatives per vertex
  (a per-pixel copy doubled the sea's cost where it fills the screen) with the export's scrolling normal maps on top.
  The exported 441-vertex plane is hidden; its material (roughness 0.42 in the rain, the scrolling normals, the sky
  reflection) is the sea's.
- **Shore foam:** baked at load from the level's own rock (~0.1 s, once): the land seen straight down, then the signed
  distance from the waterline with the sea at four levels (-0.85 to 0.85 m), packed in one 512 x 512 texture over every
  islet (0.66 m a texel). The shader picks between the four by the water's live height there, so the foam follows the
  line where the water actually meets the rock as the tide and each swell move it: a thin, gapped line of white against
  the rock, a broken wash beyond it that spreads out as a crest runs up and draws back in the trough, and one or two
  broken lines rolling in behind. Soft-edged bands (two tones of grey-white, never pure white in the storm). Where the
  water only just covers a flat shelf it breaks into thin threads of lace instead of lying as a sheet. The exported
  surf ring (a fixed mesh 8 cm above the old sea level) is hidden.
- **The wet band:** the shore rock (coastal rock, sea-worn rock, limestone, blockwork, the fort's tidal footings, the
  algae and moss on them) is darker and glossier from the water up to where the tide stood a little while ago: the
  line follows the flood at once and lags the ebb (drying 6 mm a second), so by low water there is half a metre or so
  of dark, glossy rock above the sea, soaked darkest just above the water where the swell still washes. The line
  wanders a little with the rock. Only near the sea; the arena (7.6 m up) is untouched.
- **Rain on the water:** raindrop rings in the sea's normals within ~45 m of the camera (the floor's own rings, scaled
  up to the sea), off when the rain is off.
- **What floats:** the moored trading boat rides the sea (`seaHeight`, the CPU copy of the swells, sampled under its
  middle, fore and aft and to either side): up and down with the tide and the swells, pitching and rolling a degree or
  so, eased like a laden hull. The boat ends of its mooring ropes go up and down with it. (It sits on its side floats
  with its keel clear of the water, as exported; that is unchanged.)
- **Gameplay is untouched:** the arena floor, its collider and the walls do not move; the fight is 7.6 m above the
  sea. Shalva's dive goes under the rain-flooded arena stone, not the sea, so it, the floor's splashes, footfalls and
  `playSplash` keep the floor's height. Nothing else in the chapter floats or is placed on the sea.
- **Quality:** there is no graphics setting yet. `Level3_Dwarka.seaQuality`: `'full'` (the default), `'low'` (a 13k
  triangle grid, the foam's rim alone, no raindrops on the sea, no clearcoat) and `'flat'` (as low, and no swells; the
  tide and the rim stay). A graphics setting would set this and `rain('low')` together.
- **Cost** (1920 x 1080, AMD RX 9060 XT, GPU timer queries, the sea drawn and not drawn on alternate frames, median of
  ~150 pairs): the gameplay view mid-fight 0.12 ms for the old sea, 0.05 ms now (the sea is drawn after the land, so
  the depth test skips it under the islets and the arena); the wide shot of the islands 0.13 -> ~0.21 ms; the sunset
  shot over open water 0.17 -> ~0.23 ms (low: ~0.14). Whole frames: 2.21 -> 2.14 ms, 2.32 -> ~2.40 ms, 2.09 -> ~2.15
  ms. Draw calls one fewer (80, 92, 78), triangles +50k (the grid). The sea's update and the boat: 0.007 ms a frame.
  The shared GPU made single runs noisy (about +/- 0.05 ms). Not measured on integrated graphics.
- **Dev:** `__debug.tide({ level: 0.3 })` holds the tide there (metres from the authored sea level; `level: null` lets
  it run), `speed` scales its pace (the wet band dries at the same pace), `swell` the swells' size (0: flat),
  `quality` the sea's setting; `__debug.tide()` reports the level, the wet band's top and where the tide is in its
  cycle. Screenshots: `game asset/previews/dwarka_tide_*.jpg`.

## The victory sound, and blood (2026-10-05)

- **Victory:** "the sfx when player wins is too childish." The old C-major sine arpeggio is gone. `playLevelClear`
  now plays a synthesized temple stinger (`VICTORY_STINGER` in `src/combat/SoundFX.ts`): `ghanta` (default), a deep
  drum stroke and a great bronze bell ringing long over a drone settling Pa to Sa, or `shankha`, drum strokes and a
  long low conch. Three weights: `clear` (a chapter of waves), `boss`, `final` (the last chapter, Andhaka). The music
  dips under it. The island (an explorable chapter) still has none: its ending scene follows at once with its own
  card hit. Dev: `__debug.victory(grade, stinger)` plays one, `__debug.renderVictory(grade, stinger)` renders it
  offline and reports level and spectrum (`src/combat/AudioDebug.ts`). The choice, and an optional recorded
  (ElevenLabs) version, are in docs/APPROVALS.md.
- **Victory, approved:** `ghanta` stays the stinger.
- **Blood (live, 2026-10-05; approved: option A with B's hurt pulse, Gore default Low).** `src/combat/BloodFX.ts`:
  - **Gore setting** (`Settings.gore`, saved with the other settings; Settings menu "Gore": Off / Low / Full, Low for a
    new player). Off: only the sparks the game had before. Low: fewer, smaller ink drops along the blow, no splats.
    Full: more drops, and splats on the ground (one per heavy blow, two on a kill) that spread in, lie 7 s and dry away
    from their edges. The red sparks of a flesh blow give way to the blood (a charged blow keeps its gold).
  - **Grounded:** drops end on the ground found by a ray straight down from the blow (fighters ignored); a splat is laid
    where a ray down from above finds level geometry, turned to its slope (`CharacterMotor.groundBelow`), and four more
    rays at its edge check it lies flat: one that would hang over a step's edge or a drop is made smaller (down to one
    that fits a stair tread, 0.3 m) or left out; none on walls or steep faces, none far above or below the victim
    (checked on the summit's stair: splats on the treads, none floating or sunk).
  - **Rain (Dwarka):** a splat laid in the rain starts darker on the bright wet stone, then spreads 45 % wider, thins and
    fades (3.2 s, then 1.3 s drying, against 7 + 1.8 s in the dry).
  - **Who bleeds what** (`Enemy.blood`), checked for every chapter: raiders (prologue), the Baoli Guardian (an asura),
    the Mayavi, Shalva, the rakshasas and yatudhanas, Andhaka and the hero: dark red. Takshaka and the island's cave
    creatures (mini monsters, archers): green-black ichor. The Vetala: grave-ash, no splat. The sparring vanara: nothing.
    Shades are cast members, never struck.
  - **The hurt pulse** (B): a blow on the hero of 18 or more (a boss's swing; a minion's is 16) with Gore on pulses dark
    blood-red ink in from the screen's edges, deeper the harder the blow, over about a second (`#blood-pulse`,
    `Hud.hurt`), over the existing red flash.
  - **Not in story scenes:** blows draw no blood while a scene plays unless a cue spills it (`spill(..., { scripted:
    true })`), and the fight's blood is cleared at the cut into a scene.
  - **Cost:** unchanged, two draw calls; one ray per blow, at most thirteen more per splat laid.
  - **Dev:** `__debug.blood(true | 'low' | false | null)` overrides the setting for the session (null: back to it) and
    reports counts; `__debug.bleed(x, y, z, { kind, damage, kill })` spills at a point. Previews in
    `game asset/previews/blood_*` (`blood_low_dwarka`, `blood_full_dwarka_wet_splat`, `blood_full_dwarka_washing`,
    `blood_full_summit_stair`, `blood_hurt_pulse`, `blood_settings_gore`).
  - **Left for later:** weapon stains (B's other half), after playing with it.

## Shalva's dive (2026-10-05)

"Make shalva slightly more intelligent (he can hide in water and teleport basically closer to the player (quick 2
second))." Code: `src/entities/BossShalva.ts`.

- **The move:** he goes under the rain-flooded stone in a burst of water (0.6 s: a dark churning pool with a foam rim
  opens at his feet, he sinks into it, a plunge splash and a deep gulp, `SoundFX.playPlunge`). For 2 s he is gone
  (`Character.submerged`: out of sight, cannot be struck or aimed at, blocks no one, leaves no footfalls): a wake of
  rings and spray, with a dark shape under the stone, runs at the hero with a low churning rumble that swells
  (`playWake`); for the last 0.55 s the water boils on the spot where he will come up (the pool opens again, rings burst
  from it, the telegraph tone sounds). He bursts out of it with a splash and a roar beside the hero (1.75 m off, 85-115
  degrees round from where he went under: at the side and a little behind, kept inside the arena), gada already raised,
  and brings it down in his overhead smash 1 s after breaking the surface: blocked, deflected or slid under like any
  other blow.
- **When:** once his roar has started the fight, no sooner than 7 s in, and never within 10-14 s of the last dive: when
  the hero keeps more than 6.5 m off for 1.3 s (kiting) or is beyond his leap (12 m), or when the hero has just hit him
  3 times (or for 70) within 3 s. Only from the open floor. Never in a scene (anyone under the water surfaces as the
  fight stops: a scene, the chapter won or lost); a heavy blow, a deflection or a posture break during the sink stops
  it. In a 45 s test against a kiting hero he dived every ~16 s.
- **Tuning note:** his ordinary overhead smash only connects within about 1.8 m (his lunge stops at 2 m), so the burst
  puts him at 1.75 m; left as it was for his other attacks.
- **Dev:** `__debug.shalvaDive()` sends him under now. Previews: `game asset/previews/shalva_dive_*.jpg`.

## The village and the reveal (2026-10-05)

The user: the prologue's ending "needs better assets, better fire, better textures, and some placeholder people dead
and alive", proper kneeling and praying clips from Mixamo (the praying also for the final Shiva scene), the village
"much better with textures and maybe even a mandir", and for the Shiva reveal "a different music, an energetic har
har mahadev chant with shankh opening and damru beats for his glory".

- **The mandir** (the guru's shrine): Meshy 7 (`game asset/levels/00_village/sources/mandir_meshy7.glb`, from
  `concepts/mandir_B.png`; 18.2k triangles, 2k colour map), whitewashed and ochre-stained, a pillared porch with its
  bell, a shikhara, the saffron flag, a shivling inside. Scaled to 5.4 m and set by the south wall west of the axis,
  its porch facing up the courtyard to the gate (`VILLAGE_MANDIR`), with a box collider, clay diyas burning on its
  plinth (their own warm light, `Shrine_Lamp`), marigolds and a tulsi. West of the axis so the south wall stays clear
  behind the boy for the shadow shots; it stands behind him in the blow and on his knees, an old man frozen on its
  step; at night a woman prays at its lamps (the new shot 14b); the vow is framed against it, and the last shot sees
  it lit through the gate behind him.
- **Textures** (Poly Haven, CC0; credits in docs/ASSET_CREDITS.md): mud plaster (Clay Plaster), thatch (Reed Roof
  04), packed earth (Dry Ground 01, cracked), dunes (Aerial Sand), sandstone (Red Sandstone Wall), wood (Old Planks
  02), bark (Bark Brown 02). The build makes them neutral detail maps (mean 0.8, mostly desaturated, contrast
  softened) that multiply the vertex colours, UV'd by a world-space box projection per surface, so the palette and
  the painted bands stay as they were and the cel ramp still bands the light; the game scales those materials back
  up (`TEXTURE_GAIN`). The level batches by material (`batchStatic`).
- **The fire** (`src/levels/environment/FireField.ts`; since the fire pass every level's, see "Real fire everywhere"):
  every flame in the village in one instanced draw. Each fire
  spot (`Fire_<group>_<n>` empties in the GLB) gets a few tongues (quads turned to the camera about the vertical) and
  a soft additive glow; a tongue is a teardrop of flame eaten away by scrolling noise, its outline pushed about,
  cut into three flat bands (deep red rim, orange body, yellow core), premultiplied so the rim reads against a bright
  sky and the core adds light. Groups (torch, hearth, lamp, roof, hay, far, embers) are lit by uniforms; each group's
  flicker drives its light (`RaidFire_Light`, `HayFire_Light`), so nothing recompiles when a fire catches. The burning
  roof is ten spots up the courtyard side of the thatch; the thatch chars round it as it burns (a patch on the thatch
  material: blackened by a noise-broken radius, embers pulsing in the char, a glowing burning edge); charred beams fallen
  off it smoulder below. The haystack by the south-west hut catches from its sparks (`setHayFire`) with its own smoke,
  sparks, char and light; roofs beyond the walls burn (`far`). The roof's smoke column is thicker (40 puffs, larger).
  Not done: heat haze (it needs its own screen pass; not cheap enough here).
- **Dressing** (code-built in `build_village.py` unless noted): string charpais (one kicked over against the west wall),
  a bullock cart with a cracked wheel and slumped bed, haystacks, cane baskets (some tipped or stamped flat), a second
  cloth line, mandana lozenges round the huts' doors, a layered thatch, a tulsi vrindavan, a gate door hanging off its
  hinge. What the raid left (spears, broken pots and baskets, a cot kicked over, a dropped water pot, two talwars and a
  dhal in the dust, rubble, the charred beams) is `Raid_*` in the GLB: hidden through the lesson and the fight, there
  from the ending on (`setRaidFire`). Reused from the island's Sketchfab props: clay pots, the talwars and dhal, the
  diyas, a rope coil, rubble.
- **The villagers** (story cast; `VILLAGER_MAN`, `VILLAGER_ELDER`, `VILLAGER_WOMAN`(`_B`) in
  `src/entities/characters/Village.ts`): Mixamo's Peasant Man, Abe and Peasant Girl, re-dyed to village cottons
  (`game asset/characters/villager_dye.py`), with their own `Village-` clips. Seven in the ending: three dead from its
  first shot (a man on the path from the gate, an old man by the burning hut, a woman by the north-west hut), four
  alive: at dusk cowering (a woman by the house door, one hidden behind the well, the old man frozen on the mandir's
  step, the son hiding against the north-west hut's south-west side, 1.6 m from the woman who fell at its door: he
  used to crouch on her face); at night mourning (the wife on her knees by her husband, the son
  weeping over his father, the old man sitting dazed against the house wall, a woman praying at the mandir).
- **The hero's kneel and prayer** (Mixamo, `Hero-` clips in `yodha.glb`, all its earlier clips kept): Kneeling Down,
  Kneeling Idle, Kneeling (one knee), Standing (kneel to stand), Dying (head impact to two knees), Standing Up (from
  lying on the stomach), Praying (kneeling). The prologue uses the head impact, the kneel, the kneel-to-stand and the
  stand-up (shots 1, 2, 5, 15) in place of the held and reversed death clips; the summit uses Kneeling Down beside the
  guru (shot 4) and before Shiva, then Praying (shots 10-11). *(Since the audit fixes the prayer is `praying_anjali`,
  palms together, for him and for the woman at the mandir; see "The hands".)*
- **The reveal's music** (`public/assets/music/shiva.mp3`, ElevenLabs Music, one take, flow kxekrrK5hmJeffLuHDBI; the
  original in `game asset/music/shiva_har_har_mahadev.mp3`): 60 s. A conch blast over silence (0-2.5 s, ringing away
  to silence by about 6.3 s), then damru, dhol and tabla driving at a lower level (6.6-20.5 s), the full chorus ("Har
  Har Mahadev", call and response, drones, bells, brass swells) from about 21 s to the climax, resolving on a last
  conch and bell from 53.5 s and fading out by 60 s. Levelled by a plain gain to about -15 LUFS (the other loops are
  -13.6 to -15). A one-shot track (`ONE_SHOT` in SoundFX's Music: no loop, `play(track, { fadeIn })`, `then(track)`
  to follow it): it starts with a 30 ms fade as the light swells in the guru (shot 7, 0.5 s in), the drums enter as the
  statue wakes, it ducks under Shiva's lines (the usual voice duck), the chorus lands as the eclipse passes, and it
  plays on under the credits (`rollCredits` asks for the title's loop `then`), which take it at about 33 s and
  crossfade to the title when it ends. The phase-surge sound that used to mark the light is dropped (the conch is it).
- **Perf** (the village, the dev build in a 720 x 567 pane): play, wide over the courtyard: 119 draw calls before,
  75 after (static batching by material; the raid's debris hidden); the night wide shot: 99 before, 94 after (seven
  villagers, the fire field and the haystack's smoke added); frame time stayed within about 1.3-2.2 ms either way at
  that size (it varies more between runs than between versions). The GLB is 3.9 MB, 65k triangles (was 0.8 MB); the
  villagers 1.2-1.9 MB each.
- **Testing:** as for the prologue's ending above; `__debug.chapter(5, false)`, the waves killed, then `__debug.win()`
  in Andhaka's fight for the reveal. Previews: `game asset/previews/village_after_*.jpg`, `summit_pray_*.jpg` (and the
  `village_before_*` ones).

## Real fire everywhere (2026-10-05)

The audit (docs/AUDIT.md, "Fire and light inventory") found only two fires that met the bar, "fire and light should
have detail, it cannot be a pyramid poly triangle": the village's FireField and the summit's AgniBeacon. Every other
flame was a static or barely animated mesh (cones, bipyramids, capsules), and the fight's particles never drew at all.
This pass (audit batches 6 and 7) puts every flame in the game in the village's shader fire.

- **FireField** (`src/levels/environment/FireField.ts`) is now every level's: one instanced draw per level (and one per
  wave of Takshaka's fire), up to 32 groups (one per lamp where lamps are lit one by one or flicker apart), a per-spot
  tongue count, spread, width and glow. A wind (`setWind`) leans every tongue and in its gusts (from about 3 m/s) makes
  them flutter and gutter, each fire dipping and catching on its own beat, its light dipping with it. Each tongue stands
  a third of its width toward the camera, at the front of the flame's body, so a flame set down in a cup or half sunk
  in stone still shows. `findModelledFlames` measures the flames an export modelled (each separate piece, a core and
  its shell taken as one flame) so the FireField burns exactly where they stood, and the meshes go. The flames write no
  depth, so the ink pass never outlines them. Lights that belong to a fire breathe with its group's flicker
  (`GLBLevel.flickerWith`), not their own sines.
- **The island:** the 20 cones (and the deepastambhas' tier flames, whose origin was the world origin, so they swung
  through the air as they were scaled) are a FireField, a group per lamp; a diya's flame is a slim wick flame. The 8
  shared lamp lights flicker with their own flames, stand at least 0.55 m clear of the rock (found once with rays
  against the colliders; a deepastambha's light, which stood inside it, steps a metre out) and fall off more gently
  (decay 1.5, `LAMP_GAIN` 17): the rock behind a lamp no longer burns white. The two shelf lamps at the first tunnel's
  mouth, which a rock column laid over the shelves had swallowed (diya, wick and flame inside the rock), are drawn out
  along their spouts onto a short ledge of the shelf's stone (`drawLampsOutOfRock`).
- **The baoli:** the deepastambhas (their tiers and crowns), the Devi's lamps and her offering, the 124 diyas down the
  steps and the hanging lamps are a FireField (a group per deepastambha, its torch light breathing with it; the Devi's
  uplight with her lamps). The far fort's lamps keep their glow dots. The near lamps' glow halos (`FX_Glow`) fade out
  within a few metres of the camera, where they washed the whole frame out over the flames.
- **The akhada:** the 16 lamps (8 tall deepams, 8 brass diya lanterns) are a FireField, a group per lamp: the lamp
  clock that lights them for the aarti sets each group's amount, so each flame still catches in its turn with a small
  flare. The vermillion grazers breathe with their stands' flames (their colour unchanged: the night's grade is a
  logged choice), and a faint amber light at the two lit stands nearest the camera warms their bowls and the floor
  round them (a pair of lights shared by the eight stands; the second hands off softly as a third comes as near).
- **Dwarka:** the 8 diyas burn in a FireField leaning in the storm's wind (the rain's own gusting wind) and guttering in
  its gusts; the two nearest the camera light their stone. Their bands are deeper and more saturated than the village's
  (the storm light and the AgX grade bleached those to a pale peach).
- **The summit:** the deepams are dark bronze with wick flames round the lips of both dishes (five and four) and their
  light above them, breathing with them. The braziers smoulder as coals (small uneven tongues low in the bowl, an ember
  now and then), stand up as a fire in the bowl when they catch (taller for a moment, with licks of flame, sparks and
  embers), and their lights flicker with them. The vista shrine's lanterns, whose lights are past the live lights'
  reach and whose glass heads have no flame, glow warm across the gulf.
- **Takshaka's wave of fire** (`ProjectileManager.spawnFlameWave`): flames on an arc bowed forward, tallest in the
  middle, trailing back as it runs, in the bloom, throwing licks and embers and leaving scorched stone behind it that
  cools and fades (one instanced draw for every mark). The arc spreads as it goes, its flames keeping their height.
- **The village:** the gate torches, the hearth and the shrine's lamps light with their own flames' flicker (each torch
  its own); the mandir's diyas burn at their wicks, at the spouts' tips (`build_village.py`, the GLB rebuilt; nothing
  else in it changed); the sandstone's gain is a little lower (`STONE_GAIN`) so the torch-lit gate pillars do not clip.
- **ParticleFX** (`src/combat/ParticleFX.ts`): its four kinds never drew (their bounding spheres were stale and
  culled them); they are drawn without culling, and only their live particles. Hit sparks are streaks along their flight, white-hot
  at the head, cooling down the tail; flames are teardrop licks and embers small sparks, both cooling to red, both in
  the bloom; dust and mist take the level's light and fade in and out. Particle emission in the levels is by rate times
  game time (`Emitter`): the same at any frame rate, none while paused.
- **The kavach's light** (`DivineLight.lightShaft`): the column's sides fade where it is seen edge-on, as AgniBeacon's
  does: a soft shaft, not a glass tube.
- **Testing:** `__debug.advance(s)` now ticks the level too, on a clock of its own that real time carries on from (no
  more ticking `levelManager.update` by hand). Captures: `game asset/audit/fixes/fix-fire/` (`before_*`, `after*_*`,
  `final_*` pairs 0.2 s apart). Cost, at 1024 x 768 on the audit's machine: GPU time within 0.07 ms of before in every
  level's view, draw calls down where meshes went (the island 115 to 84, the baoli 187 to 164).

## The hands (2026-10-05, audit fixes)

The audit (docs/AUDIT.md, C-04) found that no model built with `--fists` had a closed fist: the curl the build baked
into the mesh stopped at about 90 degrees, an open claw with a straight thumb, so every haft sat across fingertips or
an open palm, and prayer (C-06) was two claws at the chin. The user asked that the hero's hand be properly rigged.

- **Finger bones** (game asset/characters/hands.py, `build_character.py --finger-markers`): the hero in both looks,
  the vanara, the Baoli Guardian and Shalva now have Mixamo-named finger bones (68 joints on the hero, was 28),
  placed from markers read off each model's hand (`rigs/<name>.fingers.json`), their weights shared out by shape.
  Nothing is baked into the mesh any more, and every hand socket (and the hero's scabbard socket) is exactly where it
  was: weapon holds are unchanged. Heights, triangles, textures and every clip are kept.
- **Each hand, every frame** (`CharacterRig`, from the model's `hand_fist`, `hand_relaxed` and `hand_flat` poses): a
  hand that holds something in its socket closes on it (a fist round a haft about 2 cm in radius on the hero, the
  thumb across); a two-handed haft closes the other hand too, as far as the haft is laid through it (the mace, the
  vanara's staff); an empty hand hangs relaxed; a clip marked `"hands": "flat"` (the prayers) lays both flat. Each
  change eases over about a fifth of a second. Hiding a prop opens the hand (the lathi laid aside at the shrine, the
  dhal laid down at the summit). Models without these poses (Andhaka, whose clips move his own fingers; the guru; the
  villagers) are untouched.
- **Anjali** (`praying_anjali`, game asset/characters/anjali_post.py): Mixamo's kneeling Praying with both arms laid by
  IK so the palms press together, flat, about 15 cm before the sternum, fingers up and a little forward. The hero
  prays so at the Devi's shrine (both looks, through the change of clothes) and before Shiva; the woman praying at the
  village mandir too (she has Mixamo's own fingers, already straight). `Baoli.ts` and `Summit.ts` fall back to Praying
  in a model without it.
- **The posture break** (`posture_break`, yodha_post.py): the hero's POSTURE_BROKEN played `crouch_idle`, a
  placeholder. Now he is struck and reels back, drops to one knee and gets up again, all in the state's 2.5 s (Head
  Impact To Knees to where his knees go, the last of Kneeling Down, Kneel To Stand; cut, sped up and blended).
- **The mace** (C-11): the right fist 6 cm further up the haft (`grip: [0, 0.06, 0]` in `YodhaWeapons.ts`), so the
  left closes on the haft with 8.5 cm of it below, not on the butt.
- **Evidence:** Blender before / after close-ups (fists on a bar, flat hands, prayer) in
  `game asset/audit/fixes/fix-hands/blender/`; in-game captures of every held weapon, both prayers and the posture
  break in `game asset/audit/fixes/fix-hands/` (`before_*` and `after_*`).
- **Left as is:** the basic sword's hold (C-03, the grip 8.8 cm off the socket) and the sheathed blade (C-05) are
  separate fixes (both done since: see "Holds and hand-offs" and "The weapons pass"); the fists close where the sockets
  are. The guru's shoulder (C-12) is not changed (see docs/APPROVALS.md).

## Holds and hand-offs (audit fixes, 2026-10-05)

The audit (docs/AUDIT.md, the characters track) found props held off their grips, handed over by popping, and a
sheathed blade sticking straight out of the hip. What changed (no model rebuilt; before and after captures in
`game asset/audit/fixes/fix-holds/`):

- **Takshaka's sword** (Dwarka's ending, `src/game/stories/Dwarka.ts`). The khanda in his hand was 1.43x its size (it
  was scaled against the mace's old 0.7) and, lowered, sank 24 cm into the floor. It is now mounted with the summit's
  own hold (`WEAPON_SETS.khanda`), so it is the summit's sword at the summit's size, and lowered it clears the floor
  by 6 cm. The take is staged: where he will kneel is worked out as the scene begins (`planTake`: facing the serpent
  king, clear of his fallen body), and he stands a step short of it to hear him out. The sword comes up out of the
  naga fire deep in the stone in front of him, leaning, its hilt where his right fist will be at the bottom of Mixamo's
  "Kneeling Down" (sampled from the clip, as BossAndhaka places his sword at his entrance's "grip" mark: at the take the
  fist is 9 mm from the grip, closed over the next 0.25 s). Across the cut into the take the mace lies on the stone at
  his left (laid down as the summit's dhal is: a prop of the level until the chapter is left). He steps up, kneels,
  takes the grip and rises ("Kneel To Stand"): the blade slides up out of its slot along its own length with his fist,
  then swings up through level into his guard, and from there it is the summit's hold. A skipped scene puts it all in
  place at once (an essential cue).
- **The chapter-complete screen after Dwarka** shows him with the khanda (lowered, at ease) and the mace on the stone;
  the old last shot that gave him the mace back is gone. Leaving the chapter puts the mace back (SceneFX's clear), so
  the summit starts with its own kit and a retry of Chapter IV with the mace (both checked).
- **The basic sword's grip** (`YodhaWeapons.ts`, `SWORD_GRIP`). It reused the Vetala's grip offset, which suits his
  sockets but held the hero's 9 cm off his fist, beside the open fingers; it is now the middle of the sword's wrapped
  grip, on its axis (the fingers close round it). *(Superseded by milestone 11b: the sword is his own model, grip at
  the origin.)*
- **The Vetala's spare swords:** his model's `Swords_Sheathed` (a second pair crossed on his back) is hidden
  (`Vetala.attachRig`).
- **The hiding villager** in the prologue's dusk shots crouches 1.6 m from the dead woman's head (it was 0.2 m: his foot
  was on her face). He is still in frame in the two dusk shots that showed him.
- **The dhal handed over** (Akhada's opening, shot 4). The vanara carries the boy's dhal (a copy of its model) at his
  left side from the start of the shot; on "Here." his free hand holds it out (`staff_point`) and the boy's left hand
  comes up under it, palm up (`casting_2`). Both clips are sampled, so the vanara stands where his hand is on the dhal's
  far rim and the boy's under its middle on the frame their hands meet (the boy's hand 2 cm from the dhal's middle,
  the hands 32 cm apart across it); that frame the boy's own dhal takes its place on his arm. A skipped scene, or one
  whose copy had not loaded, gives it to him at once.

### The scabbard

`src/entities/characters/Scabbard.ts`: a scabbard built in code for each stowable blade (the basic sword, the
khanda), wood under dark leather, a brass throat, locket and chape, two leather bands, tapering to a rounded point;
plain colours and few polygons for the cel ramp and the ink. Each is fitted to its blade's mesh: every point of the
blade lies inside it. It hangs on `Socket_Sheath` (`CharacterDefinition.sheath`), empty while the blade is drawn, at
`SHEATHED` (`YodhaWeapons.ts`): down and back along the outside of the left thigh, 47 degrees below level and 17 out,
hilt up and forward at the hip, edge up (the socket alone held the blade straight back and level, the hilt-height point
skewering the belt). Sheathed, the blade takes the scabbard's own hold (its grip and size, the scabbard's angle), so only
the hilt shows. At the sheathe clip's "sheathed" mark the hand is at the scabbard's mouth but holds the blade at its own
angle: the blade turns into the scabbard over ~0.2 s (`stowSword(…, blend)`), and drawing turns it into the hand the
same way. When he kneels or lands low, the scabbard swings up about its hilt just enough to keep its tip 3 cm off the
ground, and drops back as he rises (`Character.liftScabbard`). Over the walks, runs, guards, blows and hits its lower
half keeps 12 cm or more from his left hand and 10 cm from his left shin (but in the finisher's kneeling landing). In
the summit ending he sheathes into it before the guru calls him.

### The two-handed lathi

The lathi was swung one-handed with a club's clips, so the 1.55 m staff went through his left arm and past his head. It
is now held in both hands on the mace's Great Sword Pack clips (`LATHI_STATES`): the guard (`great_sword_idle`), the
run, a wide sweep, an overhead blow and the high spin as the finisher (two blows, each half the old third blow), the
hit reactions and the death, the staff laid through both fists every frame (`twoHanded`). It is gripped near its foot
(the right fist 0.27 m up from the iron), as a long staff is for a full swing: held further up, the bamboo under the
left fist ran into his hip and thigh. The overhead blow is entered at the top of its swing (its wind-up, and the blend
into it from any moment it can be chained, put the staff through his head). Measured frame by frame over the chain
and those clips, no part of him comes within the staff's radius but the hands that hold it. The swings take as long as
the old ones (~0.7 s; the finisher ~1 s); hit windows are measured from the clips as always. Kept one-handed: the
walk (the cutscenes walk him to the Devi, into the stepwell and out of the burning village, where a guard walk read
as stalking), the slide, the jump and the posture break; when his fists part the staff slides back
through his hand to its old one-handed grip (`oneHandGrip`), so the prologue's beating and night look as they did. At
ease it stands at his side, its top a little ahead of him, its foot by his heel. The prologue's lesson now shows him
on guard and swinging it in both hands. The charge (Mixamo's "Power Up") drew both fists to his chest and crossed any
staff in his hand over his head for a few frames; it is now the Great Sword Pack's own two-handed "Power Up" for the
lathi and the mace (milestone 11b, "The weapons pass").

## The summit's snow, and memory between chapters (2026-10-05)

Two of the audit's world findings (docs/AUDIT.md, W-15 and W-08), fixed in code.

- **Square patches in the summit's snow and cliffs** (W-15). The bake left the terrain and the vista rock flat-shaded
  (every face with its own vertices and normal), and the cel ramp then lit each face as a band of its own: the beacon
  cliff, the far peak and the snow at the stair's foot broke into patches that read as voxels. `Level4_Summit` now
  smooths those normals at load (`smoothFacets`: creased at 50 degrees, so ledges and ridges keep their edge; the
  families `Coarse_Basalt_Ash`, `Slate_Silhouette`, `Vista_Pinnacle_Rock`, not the scattered `Joined_*` rocks, the
  lake's spikes, the stair, the trail or the masonry; about 0.1 s for 344k vertices). The beacon cliff's bake is also
  too coarse to hold up close (about three texels a metre, one flat colour a face), so its slate is mottled in world
  space instead (`SnowCover.breakup`: its mean colour, broken up by noise, under the same snow). Re-baking the level
  was not done: the export bakes every object again, so nothing else would have stayed byte-identical. Captures:
  `game asset/audit/fixes/fix-flow/w15_before_*`, `w15_after_*`.
- **Chapter changes no longer leak** (W-08). Each change of chapter (the prologue and Chapter I in turn) left 14
  geometries and 9 textures on the GPU: the hero's old prop (the lathi, taken off its socket before the old rig was
  freed, so never freed), the normal maps of every rig let go (only colour maps were freed), and the bone texture of
  every skinned character (its pose lives in a small texture no material lists). `Character.mountRig` frees the props
  it replaces, `CharacterRig.dispose` frees everything below the rig through the levels' `disposeObject`, and that
  frees skeletons' bone textures too. Ten round trips between the prologue and Chapter I now hold at 35 geometries / 51
  textures and 88 / 67 (they grew by 14 / 9 a round trip), and two passes through all six chapters end where they
  began.

## Milestone 11: the placeholders replaced (2026-10-05)

Made while the user was away, on the standing rules (Meshy 7 image-to-3D, textured, remeshed to about 30k triangles,
no pose mode; two concept options per asset; a cap of 160 credits). The raiders, the yatudhana, the cave runts and the
cave hurlers are their own models now. Spent: **144 credits** (8 concepts at 3, 4 models at 30); judgement calls in
docs/APPROVALS.md, "Milestone 11".

- **Concepts** (`game asset/concepts/<who>_A.png` and `_B.png`): Meshy nano-banana image-to-image, each painted over a
  flat grey T-pose silhouette of the training hero's model (`audit/fixes/m11-placeholders/blender/pose_ref_silhouette.png`)
  with `concepts/style_ref.png` as the style: a full body in a T-pose, front on, plain grey, nothing held. The A of each
  was picked (raider B was a fine bearded bandit, but the veil keeps nine copies of one face anonymous; yatudhana B was
  less gaunt and less demonic; runt B came out with four arms; hurler B, an olive ghoul, would have read like the
  runts). The hurler's concept had sparks in the air round its forearms, painted out before the 3D pass
  (`cave_hurler_A_clean.png`).
- **The models** (`game asset/characters/sources/<who>_meshy7.glb`, 31k triangles, one 2k colour map each), checked
  in front, side and back renders before rigging; all four were usable first time. Auto-rigged
  (`rigs/<who>.markers.json`, read off gridded front renders and mesh cross-sections), built with the clip set each
  placeholder used, so `Raider`, `Yatudhana`, `MiniMonster` and `ArcherMonster` behave as before:

  | Who | Game model | Height | Clips | Rig |
  |---|---|---|---|---|
  | The raiders: desert dacoits in Andhaka's service, a rust turban with its tail across the face, leather over dun cotton | `raider.glb` (2.1 MB) | 1.75 m | the rakshasa brutes' nine | 23 joints + 40 finger bones (`rigs/raider.fingers.json`): the fist closes on the talwar |
  | The yatudhana: a gaunt sorcerer-demon, ash-grey skin cracked like clay, a skull's face with ember eyes, rudraksha and bone, tattered charcoal cloth | `yatudhana.glb` (2.5 MB) | 1.8 m | Mayavi's seventeen (it casts with his cast) | 23 joints; clawed hands as modelled |
  | The cave runts: small bhoota goblins, grey-green, milky eyes, bat ears, needle teeth, a cord of bones, a rag | `cave_runt.glb` (1.2 MB, decimated to 17k triangles, 1k map: they come six at a time) | 1.1 m | the brutes' nine, quicker (the placeholder's rates) | 23 joints; claws |
  | The cave hurlers ("archer monsters"): lanky, soot-black, ember cracks up the forearms, coal eyes, ragged cloth | `cave_hurler.glb` (2.2 MB) | 1.8 m | Mayavi's seventeen (his cast is the throw) | 23 joints; claws |

- **The raiders' talwar** is a prop on the right hand's socket, not in the model: the island's Sketchfab "Indian Talwar
  Weapon (low poly)" (Sangam Senapati, CC BY 4.0, already credited) prepared with `prepare_weapon.py` at 0.95 m
  (`public/assets/weapons/raider_talwar.glb`; grip at the origin, blade 0.05 to 0.89 m). Dead, a raider lets go of it:
  three seconds into his fall (the body settled) it drops from the opening hand and lies flat beside it, pointing away
  from the body (`Raider.letGo`), instead of standing up out of his fist. The prologue's brute and bearer (story cast)
  carry it too.
- **No bow among the clips** (and Mixamo needs a sign-in), so the archers are hurlers: they light a brand in the hand
  (the draw's glow) and hurl it (the existing shaft of fire, a dark shaft with a burning head: a firebrand). Nothing in
  their behaviour changed; their name on screen is "Cave hurler" and the pool's callout "Hurlers across the water: Slide
  under their firebrands, or turn them on the dhal". Their ember cracks and eyes glow: `ember_glow.py` (a build
  `--extras`) copies the warm, bright texels of the colour map into an emissive map (3 % of it; nowhere else lights),
  which the toon materials keep, so in the dark caves the cracks and eyes burn while the body stays soot.
- **Claws:** the runts, the hurlers and the yatudhana hold nothing; their hit segment runs along the right hand
  (0.17, 0.26 and 0.28 m), as Mayavi's did.
- **Verified in the game** (captures in `game asset/audit/fixes/m11-placeholders/`): the prologue's raiders through the
  gate, closing in, swinging, struck, dying and dropping the talwar, and the brute in the ending (`raider_*`,
  `prologue_end_*`); the yatudhana on the summit's bridge casting, struck and dying (`yatudhana_*`); the runts' pack in
  the hall of bones, clawing, struck (ichor) and dying, and the hurlers at the black pool drawing, throwing, struck and
  dying (`runts_*`, `hurler_*`). Blender checks (poses of every clip, the fist on the talwar) in `blender/`.
- **Left for later:** the yatudhana has no cast or death of its own (Mayavi's); the hurlers no throw clip of their own
  (a bow or a throw from Mixamo needs a sign-in); the villagers are still Mixamo placeholders. (The basic sword's model
  was left for the weapons pass: done, below.)

## The weapons pass (milestone 11b, 2026-10-05)

Made while the user was away: the hero's own sword, a lathi that reads as bamboo, the captive guru's kneel, and three
scene leftovers the audit's fixes had seen and not changed. Meshy: **36 credits** (cap 40: two nano-banana concepts at 3 and
one Meshy 7.1 model at 30; balance 668 to 632). Judgement calls in docs/APPROVALS.md, "Milestones (2026-10-05)";
before and after captures for every item in `game asset/audit/fixes/m11b-weapons/` (`item1_*` to `item4c_*`, the finished
ones; earlier passes in `iterations/`; Blender renders in `blender/`, the lab and capture scripts in `scripts/`).

- **The hero's sword (chapters II and III).** His basic sword was the Vetala's notched blade (`vetala_sword_r.glb`, held
  by an offset). It is now a talwar made for him: `concepts/sword_A.png` (nano-banana text to image, 3 credits; B, a
  straight arming sword that read European, is kept beside it), turned into a model by Meshy 7.1 image to 3D (textured,
  2k, remeshed to 9,906 triangles: `weapons/hero_sword_meshy7.glb`), and prepared as a weapon with `prepare_weapon.py
  --length 0.98 --texture 1024 --widen 1.5 --pommel 0.8` (`public/assets/weapons/hero_sword.glb`, 0.41 MB): grip at the
  origin, blade up +Y, a gently curved single-edged blade with a shallow fuller, a steel crossguard with downturned
  quillons, a leather-wrapped grip and a bronze disc pommel; guard at 0.10 m, point at 0.88 m. It is distinct from the
  Vetala's blades (broad, notched, a collar for a guard) and from the summit's khanda (straight, 12 cm across). Two new
  opt-in flags for `prepare_weapon.py`: the generated blade was true to its concept but only 3.8 cm across, a thread
  beside the dhal and the khanda's 12 cm at the game's camera, so `--widen 1.5` broadens it about its own curved
  centreline (to 5.7 cm across and 1.6 cm thick, from 2 cm above the guard so the hilt keeps its size) and `--pommel
  0.8` takes a fifth off the pommel's width. `SWORD_GRIP` is `[0, 0, 0]` now and the hit segment `[0.1, 0.87]` (it was `[0.11, 0.97]` with the longer
  Vetala blade: the talwar reaches as far as the khanda). **The scabbard** (`Scabbard.ts`, `SWORD_SCABBARD`) is refitted:
  ten stations every 7 cm that follow the blade's curve, its chape closing 3.7 cm past the point; every vertex, edge
  midpoint and face centre of the blade lies inside it (the body at most 0.934 of the way to the leather's surface, the
  chape 0.70: `game asset/audit/fixes/m11b-weapons/scripts/fit_scabbard.py`). Checked on the model: the fist closes round
  the grip in the guard, at ease, in all three blows and the leap, the parry, the block, the stagger, the deflection, the
  posture break, the charge, the slide and the run and sprint; and through the sheathe (the blade turns into the
  scabbard at the clip's mark, the hilt the only part that shows) and the draw. Made with Meshy: credited in
  `docs/ASSET_CREDITS.md` and the credits roll ("The hero's sword").
- **The lathi** (`buildLathi`, still built in code, no credits). A bamboo staff: it tapers from 5.1 cm across at the foot
  to 3.8 cm at the head; four nodes stand proud of the shaft as darker ridges (a culm's joints crowd toward its thick
  end: 29 to 34 cm apart, the cord covering the stretch below the first) and each internode has a slightly different tone;
  the foot is shod in an iron ferrule with a ridge and a flat heel, the head in a brass band under an iron cap with a
  ridge and a dome; a red cord is wound 35 turns round the grip under both fists (28 cm, from just above the foot's
  iron). Plain colours and strong shapes (vertex colours on lathe profiles, one material but the cord) for the cel ramp
  and the ink; four meshes, 6,920 triangles (the cord's round tube is 5,600 of them). Its length (-0.57 to +1.05),
  `LATHI_GRIP`, the hit segment and every two-handed hold are unchanged. It is exported now (the Baoli lays a copy on the stone).
- **The captive guru's kneel** (`Summit.ts`). `guru.glb` is rebuilt with one more clip, Mixamo's Kneeling Idle
  (`Hero-Kneeling Idle`, 4.27 s, looped) retargeted onto his rig: his README command with `kneeling_idle` added to `--clips`, so his
  other clips (breathing idle, iv pole walk, run, impact, death) and `guru_post.py`'s hold of the staff arm at rest are
  as they were (2.61 to 2.64 MB; nothing else in his model changed: a rebuild with the old list is byte for byte the old
  file). At the summit he kneels upright at Shiva's feet, his staff in his hand and planted in the dais, and stands for
  "You kept your feet". It replaces the `death` clip held at 1.5 s.
- **The island's last shot** (`Island.ts`). After the mace is taken, the hero's own one-handed "Power Up" swung the
  mace's gold head across his face about 3 s in, and was held on its last frame, there, for the voice's 13 s. The mace is
  now gathered with the Great Sword Pack's "Power Up" (`great_sword_power_up`, 3.03 s; it is in `yodha.glb` and
  `yodha_training.glb` since this pass), the mace laid through both fists as in the fight (its line comes no nearer his
  head than 0.39 m; the old clip's: 0.15 m), after which he stands at ease with it low at his side. The camera is on his
  left (it was on his right, where the mace held out before him came between the lens and his face).
- **The charge** (`CHARGE_TWO_HANDED` in `YodhaWeapons.ts`). The same clip is the lathi's and the mace's Shakti: "a hold
  for the charge with two-handed weapons". Played at 1.536x so it lasts 1.975 s, the 1.972 s the hero's own "Power Up"
  gave (how long the button is held is balance, not look). Measured over the clip in Blender
  (`scripts/weapon_clip.py`) and in the game (`item4c_*`), neither weapon crosses his head. The sword and the khanda keep
  the hero's own "Power Up".
- **The Baoli** (`Baoli.ts`, `take_post.py`). The lathi used to vanish as he knelt (0.1 s into the kneel, in plain view)
  and reappear in his hand 1.9 s into the rise with nothing picked up. Now it is laid on the stone at his right across the
  cut into the kneel (he stands at his mark with empty hands, the lathi on the ground along his facing, its iron foot
  toward the Devi), the camera is on his right so it shows, and it lies there through the prayer, the Devi's words and
  the flash (a copy of the lathi: the change of clothes gives him a new rig and a new lathi in his hand). Rising, he takes
  it up with `kneel_take`, a new clip authored by `game asset/characters/take_post.py` (in both hero builds, 3.47 s): from
  the prayer he bends over to his right (his arms are 40 cm to the wrist, so the ground at his side takes a deep stoop), his
  right arm laid by IK so the fist's grip socket lies on the staff, back of the hand up; the fist closes (the open hand
  comes down over the staff, the fingers close, 0.25 s), the hand carries the staff up level along his side, and he rises
  with it (Mixamo's Kneel To Stand for the rest of him), standing with it held beside his hip, from where the lathi's
  REST hold brings it upright at his side as he settles at ease. At the clip's `grasp` mark (0.6 s) the copy on the stone
  gives way to the real lathi in his fist, the same stick in the same place (measured: 9 mm of the hand's own motion
  between two frames, no turn). The fist's place is read off the clip itself (`rig.sampleAt`), so the numbers in
  `take_post.py` and `Baoli.ts` cannot drift apart; the shot is as long as it was (4.0 s).
- **Left for later:** the lathi laid down is a cut, not a gesture (no lay-down clip: the reach down is authored, the
  reverse would be a second clip); a Meshy model of the lathi, if the user wants a hero prop of it.

## Hit feel (2026-10-06)

The user, after playing: "in none of the levels do we feel any impact of sword/lathi/gada hitting the enemy, we only feel
when it hits us", and "sword striking chingaari (sparks) is a nice touch to have". The cause: a boss, or anything committed
to a swing, never flinches from a light blow (`Enemy.heavyPoise`, `isArmored`: the no-stun-lock rule), so a blow that landed
changed nothing on screen but a number, and the hit sound of the staff was 11 to 13 dB under the blade's and the mace's (a low thud with no crack in it). Nothing of that rule
was touched: the layers below sit on top of the animation and change no state, so the stagger and stun-lock rules are
exactly as they were (checked: spamming light blows on the Guardian, Shalva and Andhaka for fifteen seconds, none of them
ever staggers, and each keeps attacking). Numbers and judgement calls in docs/APPROVALS.md, "Hit feel and sparks"; before
and after contact sheets (the original build against this one, frame by frame, 60 steps a second) in
`game asset/audit/fixes/hitfeel/` (`sheet_*.jpg`, `make_sheets.py`).

- **A flinch on every blow** (`combat/HitReact.ts`). After the rig has posed a character (`Character.update`, one line after
  `updateRig`), the spine, neck and head are turned away from the blow about world axes (through each bone's parent, so the
  rig's own bone axes do not matter), on damped springs: peak in ~50 ms, back in ~230 ms, the head a little later and
  further; a few degrees for the lathi, ten and more for the gada, a boss a little less, one already in its own hit clip a
  little less again; several blows add up from whichever way each came. A blow across the body also twists it (a torque
  about the vertical, by which side of the victim's axis the blade struck and which way it was going). Plus a pushback of
  a few centimetres along the blow, never while the victim is committed to a swing (it would slide through the move), and
  resolved with the rest of its movement by its motor, so never through a wall. The animation writes its own pose every step,
  so nothing is left behind; a bone nobody rewrites is put back from its saved pose.
- **A hit flash.** Every character's cel materials carry one more uniform (`installHitFlash`, called where `CharacterRig`
  makes them, so the shader is compiled with the rest and not at the first blow): a warm-white wash, strongest at the
  silhouette, ~75 ms of real time (it plays out inside the hit-stop it comes with, so it is a flash and not a held
  white-out). At 0 the material is exactly what it was.
- **Weight per weapon** (`combat/HitFeel.ts`). The hit-stop is longer for all (light 40 to 65 ms, heavy 75 to 95, slam 110
  to 130), the camera shake slider still scales the shake and not the freeze. *The staff cracks:* a recording of bamboo
  snapping laid over its blow (`lathi_crack`), a crisp, short kick. *The blade slices:* the camera nudged along the swing
  rather than straight into the victim, a thin hiss of steel under the blow, the blood a narrow jet along the cut (`thin`).
  *The mace crushes:* a freeze up to 150 ms, more shake, a dip of the camera, a boom an octave down (the mace's own blow
  recording pitched down, and a sine), dust at the victim's feet, the chips of stone falling. Every blow also gets a low
  synthesized body thump.
- **Chingaari** (`combat/ClashFX.ts`, `ParticleFX.spawnChingaari`). Where metal meets metal or stone, sparks are thrown
  along the way the blade was travelling (its velocity at the contact, from `HitboxManager`'s blade last step and now),
  not as a round puff: white-hot heads, orange tails twice as long as the other sparks', falling, skittering up to twice
  where they meet the floor, living a third of a second. They start on the near side of the body struck (and toward the
  camera), where they can be seen. One PointLight, made at start with the scene's other lights and left at zero, flashes at
  each clash for ~70 ms (nothing is created per blow; no material recompiles). Where: a blow turned aside by Andhaka's
  hide (`glancing`) and a committed boss's armour (a light blow chipping a boss mid-swing), for steel and iron (a staff
  throws none), with a clang (`blade_clang`); an enemy's blade parried, deflected or blocked (the old round starburst
  and red puff are replaced; the parry's and the shield's own sounds stay); a weapon brought down on the floor, where its
  downswing bottoms out within half a metre of the stone and still falling (the mace's slam and chops, any weapon's leaping
  strike), unless the swing has already landed on someone: sparks, dust (Dwarka's wet stone splashes instead), a dip of the
  camera, a low rumble and `stone_slam`.
- **Trails** (`combat/SlashRibbon.ts`). Was the whole blade swept through the air, hilt to tip, sixteen steps, one flat
  colour: a great yellow fan. Now a ribbon along the last fifth to quarter of the weapon, a white-hot line riding the tip's
  path that goes over into the weapon's tint across the width and thins to nothing (additive, in HDR), fading along its
  length over 0.13 s (blade) to 0.17 s (mace), smoothed with a spline, its newest point pulled onto the blade as it is
  drawn (a vertex-shader offset: no lead, no gap when the picture is interpolated between steps), and shown only from just
  before an attack's first strike window to just after its last. The hero's are gold, an enemy's a hot red. It is no
  longer updated by `updateProceduralAnimations` (which skips some states) but every step by `Character.update`, so one
  that is cut short fades out and never hangs in the air.
- **Dev:** `HitReact.read(character)` reports a flinch (degrees, push, flash, and the bones it turns). The three new
  recordings (`blade_clang`, `stone_slam`, `lathi_crack`) are in `public/assets/sfx` and their masters in `game asset/sfx`
  (`process_sfx.py` builds them from the takes). Stepping a fight frame by frame (`__debug.step`) shows the flinch; the
  hit-stop, the flash's real-time decay and the camera need the real loop.

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
  `SoundFX` with slight pitch and level variation, the synth kept as their fallback (14 more in milestone 10: Dwarka's
  steps and splashes, Shalva's plunge and wake, the prologue's tread, falls, blade and horn, the chapter card's dhol,
  the menus' bells and the defeat bell); recorded music loops
  (public/assets/music: title, village, baoli, akhada, island, dwarka, summit, boss, andhaka_final) crossfade per
  chapter and boss (`LEVEL_MUSIC` and `Finale.music` in Engine), dip under voices and in cutscenes; each plays its
  intro once, then repeats between its own loop points (`LOOPS` in SoundFX: a whole number of bars apart, the last
  second or so before the end blended equal-power into the music before the start, in the decoded buffer, so the
  fade-ins and fade-outs the 60 s clips were made with are not heard at the seam; docs/APPROVALS.md, "Music loop
  seams"); Andhaka laughs (voice/andhaka_laugh) as his entrance smile begins and at his second phase.
- Andhaka's in-game entrance at the summit (seated laughing, the smile, the crown, rising with the sword from the
  stone) is the reveal of his face. See "Andhaka's model and entrance".
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
- [x] **4. Prologue:** the small village arena, goons, the scripted loss, the guru taken, Andhaka's shadow (ending
  reworked 2026-10-05: the concussion, the shadow, night).
- [x] **5. Chapter I rework:** lathi fight, the guru's remembered teachings, the freed Guardian's words.
- [x] **6. Chapter II rework:** the sunset relight, the sword-training cinematic, the vanara mentor (placeholder;
  the user's model since 2026-10-05), shield and parry training, the ending that points to Dwarka.
- [x] **7. Chapter III, the island:** the new underground lamp-lit map (explorable), mini monster and archer
  placeholders, the blessed mace.
- [x] **8. Chapter IV, Dwarka:** the hero with the mace, Shalva mace against mace, the truth about Andhaka,
  Takshaka's prophecy and the sword.
- [x] **9. Chapter V, the summit:** the second minion type, the guru-as-Shiva ending cinematic, credits.
- [x] **10. Voices and sound:** ElevenLabs voices for every line, real character sound effects, music per chapter.
  *Done 2026-10-05 (docs/APPROVALS.md, "Milestones"). Every voiced line has its recording, and every speaker but
  Yudhveer (unvoiced by design: subtitles only) is voiced. The dialogue rewrites in docs/proposals/DIALOGUE.md are
  pending the user's yes, so none of them was recorded. The sound effects that were still synthesized are recordings
  now (33 recordings in all, each with its synth as fallback); all ten music tracks play, the island's on Chapter III.*
- [ ] **11. Replace placeholders:** the user's Meshy models (island monsters, second minion, weapons;
  the mentor is done). *The raiders, the island's runts and hurlers and the yatudhana: done 2026-10-05 (see
  "Milestone 11"); the hero's basic sword: done 2026-10-05 (see "The weapons pass"). Left: the villagers; a lathi
  and a mace model, if wanted.*
- [ ] **12. Polish and balance:** full playthroughs, difficulty curve across the five chapters, performance,
  loading sizes.
- [ ] **13. Release:** final build, deploy, a trailer if wanted.

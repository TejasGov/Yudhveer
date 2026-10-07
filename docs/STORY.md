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
  swings, light blows (at 0.6 of a brute's since milestone 12, was 0.45); each closes in on its own side of him so a pack surrounds him. *Cave archers*, now *cave
  hurlers* (1.8 m, soot-black with ember cracks that glow; placeholder: Mayavi at 0.85 scale): 50 health; they keep 6
  to 12 m off, circle, back off, and every 3 to 4.6 s draw (a brand catches fire in the hand, the glow gathering, and
  the telegraph sounds, 0.85 s) and hurl it, a shaft of fire (13 damage times the hurler's 0.85 since milestone 12, so 11, where it was 13 whatever the hurler's blows were; slide under it, block it or parry it back);
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
- **Flow:** the intro (one shot since 2026-10-06: the overview camera and the chapter card), then the **opening**,
  the storm entrance (see "Entrances as bridges"): far out on the sea a figure stands waist-deep with his gada up and
  lightning finds it; close and slowed he comes up out of the water; he runs the swells in and leaps onto the east mark,
  the stone shuddering, the roar, his card. "Where is my guru?"; his one line (beat me and I will tell you why). The
  fight. *(Before: Shalva stood on the rosette from the spawn, roared twice, and the opening ran four lines.)* **Shalva falls**: a beat scene
  (`{ fallen: 'shalva' }`) before anything else, in which the dying Shalva tells him the truth: Andhaka burns wise
  souls before his god to grow great enough to stand against Shiva and take his seat on Kailasha; the guru, "the
  wisest of them all", is kept for the last fire, on the summit. The guru's being Shiva stays hidden. The sea stirs,
  the hero turns to it, and Takshaka's arrival brings the serpent king up through the dark water that opens on the
  stone (`BossTakshaka.arrival`, since 2026-10-06; before, he stood up on the floor and roared). The **ending**: Takshaka
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

Since the storm entrance (2026-10-06) the opening speaks two of its four lines: "Where is my guru?" and Shalva's
"Far beyond your reach..." (`dwarka_open_shalva_2`). "So the island gave up its mace..." (`dwarka_open_shalva_1`)
and "Then lift your gada." are no longer played; the recording stays on disk. A shorter take of his one line waits in
docs/APPROVALS.md ("Entrances").

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
  inside 2.2 m it claws and kicks. Frail: 38 health, 30 posture, its blows and its bolts at 0.75 (the bolt did 18 whatever that said until milestone 12; 13.5 now). The brutes press in while the
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

## Boss powers (2026-10-07)

The user: "we need to give special powers to certain bosses".

- **Takshaka's ambush** (`BossTakshaka`, `AMBUSH`): every 11 to 15 s of the fight (the first after 9), from the open
  floor, he sinks into his green-lit dark water (0.45 s) and is gone; the water opens behind the hero, on the far side
  of him from where the serpent king went under (between the hero and the follow camera), naga fire in it and a hiss
  (0.85 s: the warning); he erupts there and his claws sweep at once. The blow (`Enemy.ambush`, resolved by
  `CombatSystem.landAmbush`) cannot be blocked or parried: slid under (the slide's untouchable span) or jumped over
  (off the ground) it misses ("Evaded"); otherwise it lands heavy (26 x his 1.19 = 31) and staggers. Rocked as he sinks,
  he stays up. Tested: standing, it hits for 31; sliding into the warning, it is evaded.
- **Andhaka's variants, and his throne** (`BossAndhaka`, `VARIANTS`, `THRONE_WAY`; `AndhakaVariant`; revised the
  same day): below half health, once his roar is over, he does not fight on himself. Three variants of himself come up
  out of ember in a ring round the hero (flanking him, then at his back) as he turns away laughing and walks back up
  Shiva's stair to his throne (the stair's foot, the dais; put on the seat if anything holds him for 9 s); he sits,
  laughing (Mixamo "Sitting Laughing", then "Sitting Idle"), held on the seat, and no blow or posture damage touches
  him there. While he sits he recovers, 3.5 % of his health a second, up to 75 % (he went up at half): his bar fills.
  At most three variants stand at once, six in all: each one that falls is replaced two seconds later until the six are
  spent. When the last is down he stands up off the throne ("Sit To Stand"), ember crawling on him, laughing, and comes
  back down to fight (his leap, usually). A variant is his own model darkened to smoulder, crowned: 70 health, half his
  damage (16 x 0.73 = 11.7 a blow, his are 18 x 1.3 = 23.4), slower, his plainer blows only; it burns back into ember
  when it falls. If he falls, every variant goes with him. The Engine brings them in (`Enemy.onSummon`, `Engine.summon`:
  his model and collider, a health bar, counted toward the field being cleared). Tested: up the stair and seated, a
  200-point blow while seated did nothing, six came three at a time, he recovered to 540 of 720, and rose after the sixth.
- **Andhaka's laugh echoes** off the mountains (`SoundFX.playVoiceEcho`: two crossed delay lines bouncing the laugh
  left and right, each repeat darker and quieter), in his entrance and as his second phase begins.
- **Andhaka's entrance, with more aura** (`Intros.ts`, `enthronedEntrance`; the sequence kept, no slow motion): it opens
  in black and white (the storm grade), thunder strikes behind him and each strike throbs colour through the picture
  (`Entrance.throb`) like a heartbeat; his smile is half graded so his dark face reads; the crowning is no longer shown
  from the front (it was not well rigged): one shot from behind his right shoulder, his bulk filling half the frame and
  the stair falling away to the arena, thunder as the crown goes on; then the Agni beacon, and with its fire the colour
  comes into the world for good. Skipped, it is in colour at once (`BossAndhaka.settleIntro`; a later `grade` now also stops
  any grade tween still running, so a skip mid-shot can no longer leave the fight in black and white).
- **Sanjeevani, the healing herbs of the last fight** (`Sanjeevani.ts`, `SANJEEVANI`; Level4_Summit's `SUMMIT_HERBS`;
  `Finale.herbs`; the user, 2026-10-07): once Yudhveer is below half health in Andhaka's fight, two herbs come up out of
  the stone with a rising shimmer and a hint ("by the stair, and by Nandi"): one beside the foot of Shiva's stair under
  the dais, one on the crag by Nandi at the far end of the bridge (worth the run). A tuft of stems with glowing buds
  over a pool of light, motes drifting up. Walking over one while hurt takes it: 15 % of his health back over 0.8 s (his
  bar fills), a chime, its light spiralling up round him, and it withers. Each is there once; at full health he walks
  through without taking it. Tested: none at 55 %, both at 49 %, not taken at full health, 40 to 55 and 30 to 45.

## The akhada's lesson without a mouse (2026-10-07)

The user: the parry lesson is near impossible for players without a mouse (a trackpad's right click cannot be timed
to 140 ms), and a lesson that will not end is a rage quit. Now:

- **E is the dhal** as well as the right mouse button: press to parry, hold to guard (`InputManager`; the hints and the
  controls screen show "E or Right click").
- **While the parry is taught** (`Akhada.ts`, `LESSON`, `teachParry`), the parry turns a blow for 0.35 s after the press
  (not 140 ms), and the vanara's staff flashes with a small bell half a second before each blow lands (`NOW`, measured:
  0.62 s and 0.92 s into his two swings). The hint says so: "When his staff flashes, press E or Right click". Any
  reaction from about 0.12 s to 0.4 s after the flash turns the blow; later is too late. Once the lesson is over the
  parry is the usual 140 ms, with no flash.
- **No gate:** three turned blows end the lesson as before; if they don't come, the visitors cut it short after eight
  more of his blows (taken, held or turned), about half a minute.
- Tested (keyboard events, stepped): E held blocked the three blows of stage one; a player pressing 0.12, 0.18, 0.25 or
  0.4 s after each flash turned three of three and the lesson ended at about 12 s; one pressing at 0.48 s or never was
  let through by the visitors after eight blows (about 32 s).

## Yudhveer's voice, the shloka, and new words (2026-10-07)

Yudhveer is voiced now, by the user's own recordings (game asset/voice/VOICES.md): 20 of his 23 lines, and three new.

- **The island's end, before Dwarka** (`Island.ts`; moved here from the prologue the same day, at the user's word), the mace in his hands:
  - **The memory:** the picture drains to black and white (the storm grade), and the guru stands before him on the shrine's
    dais. His voice comes back, echoing, as a memory (italic): "Promise me, Yudhveer... when the time comes, you'll search
    for the truth. You'll go to the Baoli." (The words are the prologue's; here they are remembered, the Baoli behind him.)
  - **Close on the boy,** the colour coming back.
  - **His answer,** low in front of him, the shrine's torana and lamps behind: "रघुकुल रीत सदा चली आई, प्राण जाइ बरु बचनु न
    जाई" (his recording). Then he walks out with the mace.
- **The prologue's end** (`Prologue.ts`), after he stands up out of the dust:
  - **His vow,** now voiced.
  - **The shloka** (`SHLOKA`): the Gita's 4.7 in his voice, one phrase to a shot:
    1. his eyes, close;
    2. the burning roof, low, embers torn off it, the picture shaking;
    3. over his shoulder to the gate;
    4. low on him, rising to his face.

    Each phrase echoes and rings out large in the middle of the picture as it is spoken (`Line.look: 'verse'`): Rozha One (the heavy face of Indian film titles) cast in golden yellow, a fire glow round it, gold rules above and below, coming in out of a blur with its letters drawing together and a shine running across it (Rozha One lacks ṁ and ṛ: their dots are drawn, `.iast-dot`).
    In the pauses an Indian score carries it, synthesized (`SoundFX.playTanpura`, `playDhol`, `playShehnai` in Bhairav):
    the tanpura's drone, the dhol, and a shehnai's cry. The fires flare with it. On "aham" the drums, the conch and a
    boom come down together, and embers burst round him. The music under the ending is hushed through it and comes
    back on the threshold, whose essential cues also restore the music, the grade and the fires on a skip.
- **Before the night fight** (`Akhada.ts`): the vanara, at the verandah's edge, recites the Hanuman Chalisa's
  "संकट कटै मिटै सब पीरा, जो सुमिरै हनुमत बलबीरा" (generated in Hindi), and the boy answers "Jai Hanuman!" (his recording,
  his battle cry).
- **On the throne** (`Summit.ts` beats, `BossAndhaka.enthroned`): once his laugh is done, Andhaka chants the first verse
  of the Shiva Tandava Stotram, aloud, while his variants fight. The voice is his own (Roderich) in Devanagari, sped up,
  echoed, with a robotic disturbance under it.
- **The last word** is Shiva's: "Evil may wear a crown, but it cannot last forever. Truth may walk barefoot, but it
  always reaches the throne. Whenever life tests you, choose Dharma, for Dharma always wins." It replaces "Go home, and
  teach what you have learned"; the last shot is 21 s so it is spoken before the fade.
- **New in the dialogue:**
  - `Line.echo` (a recording through `playVoiceEcho`);
  - `Line.look`: `memory` (italic) or `verse` (large, bold, mid-frame);
  - Devanagari lines are set in the Devanagari face.

## Pro mode: enemies that read him (2026-10-07)

The user asked how the opponents could be made more intelligent, then: do the first three answers (read the hero,
choose the blow for the moment, punish his habits) behind a setting, "so people don't get rage baited and quit", and
give the hero more health to meet it. So: **Settings > Pro mode** (off by default; `Settings.proMode`), and
`src/combat/Tactics.ts`.

- **Reading him** (`Player.read`, `FightTarget.read`, `Enemy.readHero`): each step an enemy sees whether his dhal is up,
  whether he is in the slide (and in its untouchable moment), charging, swinging, how much health he has, and his
  habits: how many slides, blocks, swings and parries in the last six seconds (`Habits`, `HABIT_WINDOW`). Outside pro
  mode, and for the vanara who teaches (`Enemy.cunning = false`), an enemy reads nothing and fights as before.
- **The blow for the moment** (`pickAttack`): in place of the next blow in the string, a weighted choice among the blows
  the enemy has anyway (ATTACK_1 the quick one, ATTACK_2 the wide cut, ATTACK_3 the heavy): the quick blow into his
  swing or his charge; the heavy one against a raised dhal, a block-spammer, or a man under 30 % health; the wide cut
  across a slide; the long blow from far off and the short one in close; not the same blow twice running, as a rule.
  With a kick to hand and the dhal up in its reach, the kick half the time (`kickTheGuard`). Minions choose at the end
  of their wind-up (`Enemy.updateTelegraph`), bosses as their blow is due (`Boss.chooseAttack`).
- **His habits punished** (`holdForSlide`, `PRO.guardBonus`): a slide-spammer (two or more slides in the window) who is
  untouchable the moment a blow is due finds it held until he comes up, for at most 0.6 s; a block-spammer meets the
  heavy blows and kicks above; a swing-spammer finds the bosses' guards 1.3x readier (combat/Guard.ts, `chance`).
- **His health** (`PRO.heroHealth`, `Engine.heroHealth`): 130 in pro mode, 100 otherwise, set as he is placed for a
  chapter; turned on or off mid-chapter, his health keeps its share (60 of 100 becomes 78 of 130). It was 150 first:
  the steady bot then found pro mode easier than the plain game (below).
- Nothing reacts instantly: the slide wait is capped, the weights leave room for chance, and the choice is only ever
  among the blows the enemy already has. The telegraphs are unchanged.

Tested in the akhada against the Vetala (the only early boss the hero can guard against), the hero held still by a
script, 40 s each:

| | Pro mode off | Pro mode on |
|---|---|---|
| Hero turtling behind the dhal: the Vetala's blows | 6 quick, 6 wide, 3 heavy, no kicks | 6 kicks, 4 heavy, 2 wide, no quick |
| Hero sliding every 0.9 s: blows thrown into his untouchable moment | 9 of 15 | 0 of 12 |

The steady bot (`__debug.playtest([4, 5], 5, { skill: 'steady', seed: 11 })`), five runs a chapter, the same seeds in each
column; "damage" is the mean taken over the won runs:

| | Off, 100 health | On, 150 health | On, 130 health (kept) |
|---|---|---|---|
| Dwarka (Shalva, Takshaka) | won 20 %, 61 s, damage 93 | won 60 %, 69 s, damage 154 | won 20 %, 50 s, damage 51 |
| Summit (the waves, Andhaka) | won 80 %, 95 s, damage 73 | won 80 %, 88 s, damage 64 | won 80 %, 96 s, damage 53 |

At 150 the enemies' better blows (Dwarka: 65 % more damage landed) were more than paid for and pro mode came out
easier than the plain game; at 130 the bot wins exactly as often as it does in the plain game, with the enemies reading
it. Five runs is a small sample. The bot has no habits to speak of (a slide or two a fight in the akhada, fifteen in
Dwarka); a player who hides behind the dhal or slides at every glint will feel pro mode more than it did. Not yet
played by hand.

## The bridges between chapters (2026-10-07)

The user: "scenes will need connections". What each chapter now hands to the next:

- **Prologue to Chapter I:** the Baoli's establishing shows the Guardian already there, crouched on the island like a
  carving with ember threads on it, with a push in on it; then the boy climbs to the Devi asking her, "It has been a
  long road, Maa. Guide me." (subtitle). Her answer is two of her three lines (the "stick of bamboo" and his reply are cut).
- **Chapter I to II:** the Guardian, freed and turned to stone, tells him to go to the akhada; the water at the island's
  east edge begins to glow (`Entrance.glowingWater`), and he runs off the edge and dives into the light (Mixamo "Run To
  Dive"; `Character.carried` lets a scene carry him without the motor dropping him). The akhada opens on the old
  vanara waiting by the shrine.
- **Chapter III to IV:** after the overview, he climbs Dwarka's west face out of the rain (Mixamo "Climbing Up Wall"),
  hauls himself over the lip ("Braced Hang To Crouch") and calls out "SHALVA!" ("Yelling Out"); then the storm entrance.
- **Chapter IV to V:** as Takshaka burns away the camera rises and tilts up into the storm; the summit's intro opens
  looking straight up into its own sky, the eclipse, and tilts down to the mountain. Its cinematics go on as they were.

Lines cut (all free; Yudhveer's lines are subtitles, everyone else's are recordings, cut whole): the Devi's first line
and the boy's reply; the Guardian's second and third lines and the boy's two answers; the akhada ending's "Not a
farmer", "Then what will?" and Shalva's mace "has broken better blades"; Shalva's first and third lines and "To what
end?"; Takshaka's first line. New subtitles: "It has been a long road, Maa. Guide me." and "SHALVA!".

## Entrances as bridges (2026-10-06)

"The entrances of the bosses and characters [except the final boss] ... too PS3 Tekken like ... Imagine aura scenes,
suited to each character, there's too much dialogue in the game." The audit, the grammar every new entrance follows,
what is built and the storyboards for the rest are in `docs/proposals/ENTRANCES.md`; the yeses it needs are in
`docs/APPROVALS.md` ("Entrances"). Andhaka's entrance is untouched.

**What the audit found.** All four boss reveals were one camera template (`bossReveal`: low, weapon side, tilt up)
and one roar clip; a shot lasted as long as its line, and the roar came after the talk; the world never answered (no
stings, lightning on a random timer only, bosses popped onto their marks). Shalva had about 61 s of intro and talk
before control and roared twice; Takshaka was spawned standing on the floor though the code said he came out of the sea.

**New in the engine:**

- `SceneShot.timeScale` (and `Shot.timeScale`): slow motion inside a shot. The camera, the lines and the shot's clock
  run in real time; the people, the scene's effects, the particles and the level's clock (rain, sea, sky) run at the
  shot's rate (`Engine.gameLoop`, `debugAdvance`; `CinematicDirector.timeScale`).
- `SoundFX.strike(strength, lag)`: lightning on cue, the flash now and the thunder after; `Entrance.strike()` for
  scenes. `Entrance.arc()` throws one of the cast along a parabola to a mark; `Entrance.landing()` is the ground's
  answer (a burst, a quake, a camera jolt, a splash or a thud).
- `Lightning.bolt(to)`: the bolt itself, a jagged bloom-bright ribbon from the clouds down to a point, with a
  flicker and a re-strike; `StormSky.strikeAt` aims the deck's glow over the same point (`Level3_Dwarka.aimLightning`).
- `PostFX.grade` (`StormGradeEffect`): the picture drained to silver monochrome with crushed blacks, film grain and
  closed-in edges, faded in by a scene (`Entrance.grade`) and off between scenes.
- `seaBurst(centre)`: the sea torn open in a ring of foam, streaks and spray (`levels/environment/SeaBurst.ts`).
- `Enemy.nativeName`: the boss card shows the name in Devanagari over the Latin one (Shalva, Takshaka, the Baoli
  Guardian, the Vetala and the Mayavi have theirs; Andhaka's card is as it was).
- `Boss.arrival(ctx)`: a boss arriving mid-fight stages its own shots in place of the generic reveal
  (`buildArrival`). `DivePool` is exported from BossShalva for it.

**Shalva's storm entrance** (`src/game/stories/Dwarka.ts`, `dwarka-storm-entrance`; Chapter IV is `introPlaceOnly`):
the figure on the sea is a stand-in, `shalva_far`, one of the story's cast (the same model, no body, so it rides the
swells by `seaHeight` and can be thrown), and the boss spawns hidden on his mark and is shown as the stand-in lands.
He is drawn as a black shape with a cold rim (the prologue's Andhaka), and the whole entrance plays in the storm
grade, silver and grained, until he lands gada first on the east mark and the colour comes back with the blow: the
first time his face is seen. The far shots sit on the water itself, 40 m out past the reefs (the rim's ruins and the
shelf's pillars block the sea from anywhere higher), measured in the running level. About 21 s of entrance and two
lines where there were four. (The shot list as it is now: the third pass, below.)

**Takshaka's rise** (`BossTakshaka.arrival`): over the hero's shoulder the dark water opens on the far side of the
floor; low at its rim and slowed, the hood breaks the surface and he comes up 3.4 m out of it; the roar and his card.

**The third pass (2026-10-07):** "no funny running that Shalva is seemingly doing on the water ... i want these
scenes to have AURA." Shalva no longer runs: summoned by a bolt into the empty sea, he comes up out of it where it
struck, lifts his gada to the sky for the next bolt, goes up out of the sea in one bound (the water thrown up after him
in a column) and comes down out of the storm over the boy's head onto the east mark, the stone cracking out in
lightning and the colour and the sound coming back with the blow; one Mixamo clip ("Mutant Jump Attack") cut across
four shots by held frames. The Baoli Guardian wakes from a crouched carving as the stepwell's lamps flare in to it,
its eyes kindling ember, and its first blow cracks the step and gutters every lamp; the Vetala drops fifteen metres
from the akhada's roof rim, where it hung by its hands, without a sound (Mixamo's Hanging Idle, Freehang Drop, Falling
Idle and Hard Landing, downloaded for it; its glowing eyes were cut as abrupt); the Mayavi is three of him, then one;
the old vanara is first seen sitting by the Hanuman monolith at sunset, and rises. Takshaka's rise gained the hush, the
riser, a veil of water, naga-green cracks and a sting, and rises clear of Shalva's body. Opening talk cut: the
Guardian's walk-in from 4 lines to 1, the akhada's arrival from 3 to 1. New in the engine: speed ramps
(`timeScale: [[t, speed], ...]`), `LivingSea.surge` (a storm on the sea), `waterColumn`, `Shockwave.groundShock`,
`Lightning.crawl` / `Entrance.charged`, `Entrance.glowingEyes`, `Entrance.impact` and `hush`, synthesized
`SoundFX.playRiser`, `playImpactBoom` and `playSting`, the stepwell's `setFlames`, and a reworked storm grade
(display-gamma S-curve, neutral silver). All of it: `docs/proposals/ENTRANCES.md`, section 3.

- **Testing:** `__debug.chapter(4, true)` plays the intro and the storm entrance (the Browser pane does not run the
  frame loop while hidden: step with `__debug.advance(s)` and `__yudhveer.sceneManager.render(0)`; to look at the
  frames, copy the canvas to a 2D canvas after the render). For Takshaka: `__debug.chapter(4, false)`,
  `__debug.win()`, hold to skip Shalva's last words. The Guardian: `__debug.chapter(1, true)` (after the Devi
  scene). The night visitors: `__debug.chapter(2, true)` and pass the parry lesson.

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

## How the dead speak (2026-10-05; each in its own way since 2026-10-07)

**2026-10-07, superseded:** the user found every fallen one rising as the same blue shade "weird", and asked that
each go differently. Now there are no shades: each speaks from its own body, and goes in its own way.

| Who | How he speaks | How he goes |
|---|---|---|
| The Baoli Guardian | beaten to its knees (its death state is the hero's Mixamo Kneeling Down; it kneels on in Kneeling Idle), turned to the boy, Andhaka's last ember crawling off it | it turns back to stone, a carving at peace (`Entrance.turnToStone`: its colours drain to weathered grey, gold motes lift off it), and stays kneeling where it fell |
| Shalva | he will not go down: his death clip is held on its stagger (`BossShalva`, `BEATEN_AT`), hunched over the wound with his gada, still on his feet | the sea he threatened the boy with takes him: his own dark water opens under him and he sinks into the stone (`BossShalva.seaTakesHim`, essential: gone even if skipped, clear of the serpent king's way) |
| Takshaka | lying where he fell, framed over the boy's shoulder down at his head and his reaching claw | he burns away in naga-green fire as the camera rises into the storm (`Entrance.burnAway`) |

`Story.ts`'s shade framings stay and serve: `shade(id)` is now the fighter itself, so they frame the body where its head
is. The table below is the history.

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
  cools and fades (one instanced draw for every mark). The arc spreads as it goes, its flames keeping their height. Since
  milestone 12 it leaves Takshaka 0.75 s into his breath (his head drawn back is the warning; it used to leave on the
  cast's first frame) and hurts by 28 times his `damageScale`.
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
  makes them, so the shader is compiled with the rest and not at the first blow): a warm glint on the silhouette with
  only a faint wash over the body, so the victim stays readable at contact, ~75 ms of real time (it plays out inside the
  hit-stop it comes with, so it is a flash and not a held white-out). At 0 the material is exactly what it was.
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
  each clash for ~70 ms, a short-range (2.5 m) glint on the weapons, hands and floor and not a flood over the bodies
  (nothing is created per blow; no material recompiles). Where: a blow turned aside by Andhaka's
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

## Milestone 12: polish and balance (2026-10-06)

Made while the user was away, on the standing rules (code and numbers only: no asset was re-exported, rebuilt or paid for; loading-size compression is left to release prep). Four things: a bot that plays the game (the playtest), the difficulty curve it showed to be missing, the frame hitches it and a frame probe found, and what a player can do to the game that the happy path never does. Judgement calls and before/after numbers are also in docs/APPROVALS.md, "Milestones (2026-10-05)", "Milestone 12".

### The playtest (dev builds only)

Everything below is under `src/debug/` and reached through `__debug` (`src/main.ts`, inside `import.meta.env.DEV`): none of it is in the production bundle (checked: no `__debug`, `HeroBot`, `Playtest`, `PerfProbe` or the GPU timer extension in `dist/`).

- **`await __debug.playtest(chapters, runs = 10, options)`** (`Playtest.ts`) has a bot play each chapter's fight `runs` times and returns a report per chapter (`.summary` is the text). A run starts the chapter as a first attempt that has skipped its intro and opening (the bosses have roared, nothing is learned or seen), every story scene inside the fight plays, and it ends as the engine decides: the last foe falls, the hero does, the prologue's scripted loss comes, or a time cap passes (a "stall": the bot could not finish). It is stepped on the engine's own fixed 1/60 step (`debugAdvance`), with `Math.random` seeded per run, so **a seed replays the same fight** (to within the order in which a chapter's models arrive) and a chapter's 24 runs take from half a minute (Dwarka) to three (the summit). The report gives the win rate, the fight's time and the health it cost (median, p10 to p90), the lowest health reached, how many blows landed, were blocked or deflected and how many postures broke, how long each foe stood and the hero's health as it first fought and as it fell (the cost of a boss's fight), the deaths (who landed the last blow and when), and **per source**: how many of each kind of blow ("Shalva ATTACK_1", "ORB", "ARROW") were thrown, how many landed on the hero or met his guard, the damage per run, and the warning they gave (the earliest and the mean time into the attack at which one landed).
  Options: `skill` (`'novice' | 'steady' | 'expert'`, default `'steady'`), `seed` (the first run's; each next adds one), `maxSeconds`, `detail` (keep every run), `trace`, and **`tune`**, what-if numbers for the length of the run without editing code: `{ enemies: { Shalva: { health: 800, damageScale: 1.1, interval: 1.25 } }, weapons: { mace: { ATTACK_1: { damage: 30 } } }, health: 120 }` (per enemy by its name on screen: `health, posture, damageScale, moveSpeed, attackCooldown, telegraphDuration, engageRange, comboChance, interval, strikeRange, armorDamage`). The tuning in "The difficulty curve" was found this way.
- **`__debug.playtestTrace(chapter, { seed, trace: { every } })`** is one fight blow by blow: a line of the fight every `every` seconds (positions, states, health) and a line for every blow the hero takes.
- **`await __debug.telegraphs()`** is the warning table: for each enemy kind, every attack's strike windows (state seconds), its length, and the time before the first window (the warning), flagged FAST under 0.5 s.
- **`await __debug.playtestFlow({ from, to, skill, skip })`** (`Flow.ts`) plays the campaign as a player meets it, chapter after chapter, through the menus' own buttons (the intro, the opening scene, the fight, the ending, the chapter-complete screen's Continue, the retry after a defeat, the credits, the title), with `console.error` and `console.warn`, `window.onerror` and unhandled rejections hooked. `skip: true` holds the skip button through every cutscene.
- **`await __debug.robustness({ only, chapters })`** (`Robustness.ts`): see "Robustness".
- **`await __debug.perf(chapter)` and `perfScenes(chapter)`** (`PerfProbe.ts`): see "Performance".

**The bot** (`HeroBot.ts`) plays through the engine's own input path (the patched `getState`, the mouse's own path for the camera), and sees what a player sees: where everyone is and what state they are in, a blow's wind-up (the strike windows of the attack in progress, measured from its animation, and a minion's telegraph), a bolt or a wave of fire in the air (and the cast that threw it, as the cue), Shalva's water boiling. It answers a blow a reaction time after it sees it: a parry (with the dhal), a guard, or a slide (a direction that leaves the blow's reach, away from the others), with timing error, and it can miss one entirely. Between blows it closes in, strikes, chains and holds off a swing when a blow is about to land; with the skill it charges Shakti when the field is quiet and leaps in out of a run. It walks the island's way to the altar and steps round what blocks it. It is a proxy for a player, not a solver: the three skills bracket the players the game has.

| Skill | Reaction | Timing error | Answers a blow | Parries (of answers, with the dhal) | Guards (of the rest) | Holds off a swing | Shakti and the leap |
|---|---|---|---|---|---|---|---|
| `novice`: a first-time player | 0.42 s | 0.10 s | 70 % | 10 % | 50 % | never (trades blows) | no |
| `steady`: a few fights played (**the yardstick**) | 0.30 s | 0.06 s | 90 % | 40 % | 35 % | within 0.35 s of a blow | yes |
| `expert`: a veteran | 0.20 s | 0.035 s | 97 % | 75 % | 20 % | within 0.5 s of a blow | yes |

### The difficulty curve

*(Since this pass the five bosses guard, turn and answer, and the numbers it set for the Guardian, Shalva, Takshaka and Andhaka are superseded: see "Bosses fight back", below.)*

**Where it started.** The playtest's first numbers (a steady player, 12 runs a chapter) showed no curve at all: the first boss cost more health than the last, Dwarka was the easiest chapter in the game, and the one fight that was meant to be hardest was beaten nine times in ten.

| Chapter | Steady win | Fight | Health lost (of 100) | What the numbers said |
|---|---|---|---|---|
| I Baoli | 100 % | 17 s | **74** | the Guardian's three-blow string (24 a blow, three blows) was 82 % of the damage, and it landed on the steady bot 1.7 times in every string |
| II Akhada | 83 % | 52 s (38 of them the lesson) | 64 | Mayavi's bolts (a fixed 18) were 46 % of it; the Vetala and Mayavi died in 10 and 14 s |
| III Island | 88 % | 89 s | 71 | the hurlers' firebrands (a fixed 13) were 76 % of it |
| IV Dwarka | **100 %** | **27 s** | **43** | the mace (77 damage a second) ended Shalva in 13 s and Takshaka in 10; both bosses together cost less than the first |
| V Summit | 92 % | 68 s | 79 | the waves cost 3 %: the fight was Andhaka's three-blow string (36 %) and the yatudhanas' bolts (29 %) |

**What it should be**, and the numbers it was tuned to (the steady bot is the yardstick): the win rate falls a step a chapter, from the first boss nobody loses to (100 %) through about 95, 90 and 85 % to the summit at about 70; the Guardian costs a steady player well under half his health; every boss fight is longer than the last was short; and **no blow lands without warning**. The prologue is a scripted loss and stays one.

**Where it is now** (the same bot; the steady skill 24 runs a chapter (96 on the island, in Dwarka and on the summit), the novice and the expert 16 (32 on the summit; 12 in the prologue); each cell is win rate / median seconds of fight / health lost in the runs that were won; Chapters IV and V add up two health bars, since the hero's health is restored when their last boss arrives):

| Chapter | Steady, before | Steady, after | Novice, before | Novice, after | Expert, before | Expert, after |
|---|---|---|---|---|---|---|
| 0 Prologue | 100 % / 17 s / 6 | 100 % / 17 s / 5 | 100 % / 12 s / 17 | 100 % / 11 s / 18 | 100 % / 21 s / 5 | 100 % / 22 s / 0 |
| I Baoli | 100 % / 17 s / 74 | 100 % / 24 s / 40 | 92 % / 14 s / 76 | 100 % / 20 s / 50 | 100 % / 25 s / 44 | 100 % / 25 s / 36 |
| II Akhada | 83 % / 52 s / 64 | 96 % / 55 s / 64 | 92 % / 70 s / 82 | 88 % / 70 s / 85 | 92 % / 49 s / 62 | 100 % / 50 s / 56 |
| III Island | 88 % / 89 s / 71 | 91 % / 86 s / 61 | 75 % / 82 s / 75 | 81 % / 84 s / 70 | 100 % / 82 s / 42 | 88 % / 82 s / 52 |
| IV Dwarka | 100 % / 27 s / 43 | 78 % / 48 s / 90 | 100 % / 19 s / 42 | 100 % / 29 s / 129 | 100 % / 37 s / 46 | 94 % / 59 s / 107 |
| V Summit | 92 % / 68 s / 79 | 70 % / 63 s / 55 | 50 % / 67 s / 115 | 66 % / 60 s / 72 | 100 % / 63 s / 44 | 94 % / 62 s / 34 |

*The steady player's curve is the "Steady, after" column: 100, 96, 91, 78 and 70 per cent for chapters I to V (it was 100, 83, 88, 100 and 92).* The novice and expert are brackets, not a second curve: the novice bot trades blows, and with the mace's burst (Shalva falls to it in 15 s whatever his health) trading wins; the expert has the parry, which is most of what the summit asks. Neither is the player the numbers are tuned for.

What changed, every number (no hero number, weapon blow or move was touched):

| Who | What | Before | After |
|---|---|---|---|
| Baoli Guardian (I) | health | 450 | 1000 |
| | blows (`damageScale`; its blows were 18, its string's 24) | 1.0 | 0.6 (10.8, 14.4) |
| | seconds between its attacks (`attackInterval`) | 1.6 | 2.0 |
| Vetala (II) | health | 160 | 200 |
| | blows | 1.0 (16) | 0.92 (14.7) |
| Mayavi (II) | health | 90 | 110 |
| | blows and bolts (his bolt was a fixed 18) | 1.0 (16 and 18) | 0.8 (12.8 and 14.4) |
| Cave runt (III) | blows | 0.45 (7.2) | 0.6 (9.6) |
| Cave hurler (III) | blows | 0.7 (11.2) | 0.85 (13.6) |
| | its firebrand (a fixed 13, whatever its blows were) | 13 | 11 (13 x its 0.85) |
| Shalva (IV) | health | 380 | 800 |
| | blows | 1.0 (18, 24) | 1.14 (20.5, 27.4) |
| | `attackInterval` | 1.35 | 1.25 |
| Takshaka (IV) | health | 460 | 1000 |
| | blows | 1.0 (18, 24) | 1.19 (21.4, 28.6) |
| | `attackInterval` (phase two's 0.95 is unchanged) | 1.4 | 1.3 |
| | the wave of fire (28) leaves him | on the first frame of his breath | 0.75 s into it |
| | the wave's damage | a fixed 28 | 28 x his 1.19 = 33.3 |
| Andhaka (V) | health | 640 | 840 |
| | blows (`damageScale`) | 1.1 (19.8, 26.4) | 1.3 (23.4, 31.2) |
| Yatudhana (V) | its bolt (its blows were already 0.75; the bolt was a fixed 18) | 18 | 13.5 (18 x 0.75) |
| Bolts, generally | what a bolt, a firebrand and the wave of fire do to the hero | a fixed number per kind | the kind's number times its caster's `damageScale` (`Projectile.scale`); what a bolt deflected back does is unchanged |

**Why these and not others** (the judgement calls, more of them in docs/APPROVALS.md):

- *Health up, blows down, for the first boss* (the Guardian: 450 to 1000 health, blows to 0.6, a pause of 2 s between attacks): the fight is half again as long, and a mistake costs 11 or 14 health, not 18 or 24. The cost fell from 74 to 40. Its three-blow string still lands (it is a string: one slide does not clear it), but a steady player no longer pays 24 three times for it.
- *Health up, blows up a little, for Dwarka and the summit*: Shalva 380 to 800 and Takshaka 460 to 1000 stretch two fights from 27 s to 48 s; their blows are 14 and 19 % harder, because longer fights at the old strength were fine but not frightening. Andhaka's 640 to 840 and his blows from 110 to 130 % make the summit's fight the one a steady player loses in three attempts of ten (how hard he hits hardly matters, at 130, 135, 140 % a steady player won 73, 73 and 75 times in a hundred; how long he stands does, 760, 820 and 860 health won 73, 63 and 67). Dwarka's win rate is the least stable number (a novice there wins 100 % at one setting and a third of the time at a setting 3 % stronger: the mace kills so fast that it all comes down to whether the fifth blow lands before the boss falls), which is why the setting it ended on was checked on 168 runs.
- *Bolts follow their caster's `damageScale`*: they were a fixed 18 (Mayavi, the yatudhana), 13 (the hurlers) and 28 (the wave of fire) whatever their caster's blows were set to, so the only way to ease the island's firebrands (76 % of its damage) or the akhada's bolts (46 %) was a change to the projectile's own numbers for every caster at once. They now take their caster's scale at the moment they are thrown (`Projectile.scale`). What a bolt turned back does to the thing it hits is unchanged. This is the one rule change in the pass.
- *Takshaka's breath is loosed 0.75 s into his cast*: the wave of fire left him on the cast's first frame, so from the 3 m and more he breathes it from (phase two) it reached the hero a third of a second later with nothing yet to read. Now his head drawn back is the warning and the fire follows. (Checked by stepping him: cast at 14.13 s, the wave at 14.88 s.)
- *The prologue is untouched.* The scripted loss came in 100 % of 36 runs, after 11 to 22 s and three felled raiders, and cost the hero 0 to 18 health. Its raiders hit at 0.85 and there is nothing in it to balance.
- *The akhada's lesson is untouched* (the vanara hits at 0.3, cannot be hurt, and costs 7 health in its 38 s).
- *The posture break is where the hero's damage comes from*, and was left alone: a broken posture takes 2.2 times the blow for the length of the break, so most of a boss's health goes in two or three breaks, and a lathi chain breaks the Guardian every few swings. That is why 1000 health makes the Guardian's fight 24 s and not 40.

**Hardest moments** (the steady bot; the source's share of the damage, and how often its blows landed):

- **I Baoli:** Baoli Guardian's string 85 % (56 landed from 33 thrown); Baoli Guardian's first blow 15 % (13 landed from 30 thrown). No run lost in 24.
- **II Akhada:** the bolts 41 % (45 landed from 109 thrown); Vetala's first blow 23 % (25 landed from 32 thrown); Vetala's second blow 21 % (23 landed from 37 thrown, 1 more blocked). 1 of 24 runs lost, to Vetala's second blow, at 84 s.
- **III Island:** the firebrands 73 % (464 landed from 966 thrown); Cave runt's first blow 26 % (160 landed from 509 thrown, 19 more blocked); Cave runt's second blow 2 % (10 landed from 94 thrown, 2 more blocked). 9 of 96 runs lost, to the firebrands (7) and Cave runt's first blow (2), between 65 and 83 s.
- **IV Dwarka:** Shalva's first blow 44 % (205 landed from 301 thrown); Takshaka's string 23 % (75 landed from 134 thrown); Shalva's string 11 % (38 landed from 182 thrown). 21 of 96 runs lost, to mostly Shalva's first blow (10), Takshaka's second blow (5) and Takshaka's string (3), between 21 and 50 s.
- **V Summit:** Andhaka's string 54 % (125 landed from 201 thrown, 41 more blocked); Andhaka's second blow 19 % (56 landed from 234 thrown, 28 more blocked); the bolts 19 % (126 landed from 325 thrown). 29 of 96 runs lost, to Andhaka's string (19), Andhaka's second blow (8) and Andhaka's first blow (2), between 44 and 80 s.

**Fairness: no blow without warning.** `__debug.telegraphs()` lists, for every attack of every enemy, how long after the first sign of it its strike windows open (its warning: a minion's glint, 0.3 s, then the clip's lead-in; a boss has no glint, so the clip's own wind-up); the playtest records, for every blow that landed on a bot, how far into its attack it landed. Over the last battery's 388 fights (a novice, a steady and an expert bot, chapters 0 to 5), **no blow landed on the hero with less than 0.73 s of warning from the first sign of its attack**, and no boss's blow with less than 0.73 s, against reactions of 0.20 (expert), 0.30 (steady) and 0.42 s (novice):

| Enemy | Warning of each attack's first window (s) | Earliest a blow landed (s from the first sign) |
|---|---|---|
| Baoli Guardian | chop 0.4, sweep 0.8, three-blow string 0.87, leap 0.3 | 0.85, 0.93, 0.98 |
| Vetala | cut 0.82, cut 0.68, string 1.33 | 0.87, 0.73, 1.33 |
| Shalva | swing 0.33, swing 0.32, string 0.64, leap 1.7; the dive: the water boils 0.55 s | 0.77, 1.1, 0.75 |
| Takshaka | claw 0.56, sweep 0.7, four-blow string 0.77, leap 0.3; the breath 0.75 (was none) | 0.73, 0.82, 0.95 |
| Andhaka | cleave 0.74, chop 0.71, three-blow string 0.75, leap 1.7 | 0.85, 0.77, 0.87 |
| Cave runt, raider, rakshasa | one or two swings, 0.62 to 0.95 | 0.73, 0.97, 0.93 |
| Mayavi, the hurlers, the yatudhana | a bolt: the cast (the hurler's brand takes light for 0.85 s), then 0.4 to 0.7 s of flight | not a swing: see the bolts |

The attacks the table flags FAST (a first window under 0.5 s: Shalva's two swings, the Guardian's chop and leap, Takshaka's leap, the casters' claws) never landed at that window in any run: it is a flourish of the weapon that does not reach the hero's body, and the blow that lands is the next window, 0.4 s on; the claws are only used when a caster is cornered. So nothing was changed for readability; the one blow that had no warning at all was Takshaka's wave of fire (above).

### Performance

**How it was measured** (`__debug.perf(chapter)` for a fight, `__debug.perfScenes(chapter)` for the cutscenes, `__debug.perfShot(chapter, seconds, { part, change })` for one held picture, `src/debug/PerfProbe.ts`): the engine's real frame (`gameLoop`: the fixed steps, the interpolation, the level, the HUD, the render and its post chain) called by hand on a clock that moves 1/60 s a frame, so it runs with the Browser pane hidden. A frame's CPU time is the time of that call; its GPU time is a `EXT_disjoint_timer_query_webgl2` query round it; draw calls and triangles are `renderer.info` over every pass (the shadow pass and the bloom's too). A fight is played by the steady bot to its end; the cutscenes are each chapter's intro and opening, then every scene after the fight is won. Chrome 154 on the machine's AMD Radeon RX 9060 XT (ANGLE, Direct3D 11), a 1280x720 window at a pixel ratio of 1.25 (a 1600x900 canvas), nothing else running. "Before" is the code at the start of this milestone (a288019) with only the probe added, "after" is this branch, each in the same browser one after the other, two rounds each to show the noise.

**What the numbers said.** The steady cost of a frame was never the trouble: 2.4 to 4.7 ms of CPU and 1.9 to 2.9 ms of GPU in a fight, against the 16.7 ms of 60 frames a second, and the same in the cutscenes (the dearest picture in the game, the akhada's ending, is 3.8 ms of CPU and 2.7 of GPU, 292 draw calls: the shadow pass is 0.9 ms of that CPU and 0.6 of that GPU, and nothing else is as much). What a player feels is the **hitch**, a frame of 20 to 460 ms, and the probe named every one by what the frame had added to the GPU (programs compiled, geometries and textures uploaded) and what had just spawned:

| Hitch (before) | Cost | Cause |
|---|---|---|
| The akhada's two bosses come on at the end of the lesson (+4 programs, +15 geometries, +18 textures); Shalva's fall scene begins (+2 programs); two moments of Baoli's fight (+1 and +2 programs) | 40 to 460 ms | they were loaded or made but never drawn, so their shaders and textures were built the first time they were seen |
| A foe spawns mid-fight: a wave's rakshasa or yatudhana, a pack of the island's runts and hurlers, Takshaka, Andhaka | 20 to 230 ms (Andhaka's 180 ms) | its 1 to 9 MB model parsed again for each one (a pack of five parsed it five times), then its geometry and textures uploaded the first time it was drawn, then its strike windows measured (sixty samples of the pose for every clip of every attack) |
| A frame on the summit that only added a program (the first of the yatudhanas' bolts) | 230 ms (+1 program) | a bolt built its own spheres and materials and freed them when it ended, the last of a kind taking its shader program with it, so the next bolt compiled it again |

The summit had seven such frames in one round and eleven in the other (the worst 229 ms), the akhada 2 and 3 (the worst 457 ms), the island 3, Dwarka 2, Baoli 2 and 0.

**What was done** (all in code; no asset touched):

1. **A model is parsed once and cloned** (`CharacterRig`): the parsed scene is a template; a character is a `SkeletonUtils.clone` of it (its own bones, the geometry, textures and clips shared, marked `userData.shared` so freeing one character leaves the others their meshes). Templates a chapter does not need are freed when the next starts (`CharacterRig.trim`), the raw downloaded buffer is dropped after its parse, and the weapon and shield models are cached.
2. **Strike windows are measured once per definition** (`Character.fitProps`, and `dressed()` hands out one definition per weapon and look), not once per spawn.
3. **A warm-up frame under the loading screen** (`Engine.warmUp`): everyone in the chapter, hidden or not, and everyone who will come later (a wave's second kind, the island's creatures, the final boss) is made once and drawn once, the late ones kept hidden for as long as the chapter lasts, with the things that are only sometimes drawn (Shalva's pool, a hurler's glow) and one of each bolt. The programs compile, the geometry and textures reach the GPU and the windows are measured while the loading bar is up, and `prefetchLater` starts those models parsing as soon as the chapter starts.
4. **Bolts are shared pieces** (`ProjectileManager`): their spheres and materials are made once and kept (an anchor in the scene, hidden, keeps their programs alive), so a shot is a mesh and a transform.
5. **The canvas has no buffers of its own** (`SceneManager`): the post chain draws the scene into its own multisampled buffer and the canvas only ever gets its last, full-screen pass, so the renderer is made without the default multisampling, depth and stencil (the post-processing library's own advice): a screen-sized set of buffers less, and one resolve less a frame. Its effect is below the noise of the timer (the GPU's mean is unchanged to a tenth of a millisecond), so it is counted as a saving of memory, not of time. (Checked picture for picture: the first frame of every chapter on the old build and on this one, no GL error in any, and the two differ only where the sky's clouds and the summit's snow have moved on in the time between: `game asset/audit/fixes/m12-balance/`, `before_*`, `after_*` and an amplified `diff_*`.)

**A fight**, the steady bot to its end (two rounds of each build, one after the other; CPU is the frame's own time in ms: the mean and the 95th percentile of the two rounds, and the worst frame of either; GPU the mean; draw calls and thousands of triangles the mean; a hitch is a frame over 20 ms, its count in each round):

| Chapter | CPU mean, before > after | CPU p95 | Worst frame | Frames over 20 ms | GPU mean | Draw calls | Triangles (k) |
|---|---|---|---|---|---|---|---|
| 0 Prologue | 4.7 > 3.9 | 6.7 > 4.9 | 26.8 > 21.3 | 1, 1 > 1, 1 | 2.8 > 2.3 | 104 > 109 | 457 > 489 |
| I Baoli | 3.2 > 3.2 | 4.1 > 3.8 | 112.6 > 6.9 | 2, 0 > 0, 0 | 2.5 > 2.5 | 159 > 161 | 430 > 415 |
| II Akhada | 3.9 > 3.9 | 4.9 > 4.8 | 457.2 > 12.1 | 2, 3 > 0, 0 | 2.8 > 2.8 | 285 > 286 | 727 > 727 |
| III Island | 4 > 3.8 | 5.7 > 5.4 | 153.7 > 60.7 | 3, 3 > 4, 4 | 2.3 > 2.4 | 126 > 125 | 822 > 818 |
| IV Dwarka | 2.4 > 2.5 | 3.1 > 3.2 | 95.8 > 65.6 | 2, 2 > 0, 1 | 1.9 > 2 | 78 > 85 | 496 > 516 |
| V Summit | 4.5 > 4.1 | 6.4 > 5.7 | 229.2 > 52.4 | 7, 11 > 2, 3 | 2.9 > 2.8 | 165 > 156 | 1303 > 1264 |

**The cutscenes**, each chapter's intro with its opening and the scenes after its fight (a burst of frames every two seconds of scene; CPU is the mean in ms with the worst sampled frame after it in brackets; GPU the mean; the draw calls are the busiest frame's):

| Chapter | Intro CPU, before > after | Ending CPU, before > after | GPU (intro, ending) | Draw calls (intro, ending) |
|---|---|---|---|---|
| 0 Prologue | 3.3 (4.4) > 3 (4.4) | 3.5 (118.3) > 3 (5.4) | 2, 2.4 | 97, 216 |
| I Baoli | 2.9 (33.1) > 2.7 (8.9) | 2.7 (4.2) > 2.7 (4.6) | 2.1, 2.3 | 179, 165 |
| II Akhada | 3.8 (7.5) > 3.6 (5.1) | 2.9 (4.5) > 3.1 (5) | 2.6, 2.4 | 372, 278 |
| III Island | 1.6 (6.6) > 1.8 (15.6) | 1.7 (3.6) > 2.1 (46.1) | 1.5, 1.6 | 102, 101 |
| IV Dwarka | 2.6 (5.4) > 2.4 (5) | 2.5 (4.6) > 2.4 (8.6) | 2, 1.8 | 95, 95 |
| V Summit | 3.2 (5.6) > 3.6 (7.6) | 3.8 (7.7) > 4.1 (10) | 2.6, 3 | 161, 203 |

**Starting a chapter** (milliseconds from the call to the fight ready: the first start of it in a session, then a retry; the JS heap in MB just after; the geometries and textures the GPU holds then):

| Chapter | First start | Retry | JS heap (MB) | GPU geometries / textures |
|---|---|---|---|---|
| 0 Prologue | 1074 > 838 | 612 > 210 | 166 > 137 | 21 / 38 > 47 / 80 |
| I Baoli | 272 > 116 | 288 > 97 | 273 > 110 | 110 / 64 > 126 / 78 |
| II Akhada | 951 > 932 | 311 > 67 | 237 > 158 | 9 / 31 > 234 / 120 |
| III Island | 265 > 524 | 0 > 28 | 265 > 146 | 22 / 37 > 78 / 100 |
| IV Dwarka | 588 > 825 | 200 > 50 | 307 > 145 | 50 / 12 > 86 / 79 |
| V Summit | 927 > 1360 | 126 > 86 | 296 > 218 | 10 / 8 > 102 / 90 |

**Reading the tables.** The steady frame is unchanged, as it should be: what changed is the tail. No frame over 20 ms is left in Baoli or the akhada (the worst frame fell from 113 and 457 ms to 7 and 12), and the summit's eleven became two or three (229 to 52 ms). What is left is the making of a pack: five runts or hurlers arriving together are 40 to 60 ms (what costs is making that many characters at once, not their models: staggering the clones one to a turn of the event loop was tried and changed nothing), Andhaka's and Takshaka's arrival, and the first draw of a cutscene's own things (the island's ending has a frame of 46 ms where two textures first reach the GPU). The price is in the **first start of a chapter**, which does more under its loading bar (250 to 430 ms more on the island, Dwarka and the summit, where a second kind of foe and a final boss are made ready); a retry takes 30 to 210 ms where it took up to 610, the JS heap is 17 to 60 % lower after a start (the downloaded buffers and the parsed copies are gone), and the GPU already holds everyone's geometry and textures at the start of a fight (the akhada 9 to 234 geometries), where it used to take them as each was first drawn. Draw calls and triangles are the same (the bot's fights differ a little, a few percent).

**Measured and left** (so nobody measures them again): the shadow pass (0.2 to 1.9 ms of CPU) and its 2048 map, the 6 to 13 lights of a level, the allocation of about 430 KB a frame (four fifths of it inside three.js's own render and the post chain's), the matrix update of a level's 400 to 1600 nodes (0.15 to 1.25 ms, the prologue's the dearest), and the updates of hidden characters (the prologue's villagers, 0.1 ms a rig). Each is small beside the hitches, and each is a change to the look or a risk to a scene for a gain of under a millisecond. Held on the akhada's dearest picture, switching things off costs this much: the shadows 0.9 ms of CPU and 0.6 of GPU (and 100 draw calls), the lamps and other lights 0.6 and 0.3, the characters 0.6 and 0.1, a pixel ratio of 1 instead of 1.25 0.1 and 0.4, the bloom's selection nothing. The one steady cost big enough for a pass of its own is the akhada's 285 meshes in view (see "Left for later").

### Robustness

`__debug.robustness({ only, chapters })` (`src/debug/Robustness.ts`) does to the game what a player can do and the happy path never does, and checks for a crash, a console error or a state it cannot leave. It drives the real thing (the menus' buttons, the browser's `blur` and `resize` events, the real frame loop on a clock of its own), so it runs with the Browser pane hidden. The last full run, on this branch, had no console error and no failure (3.5 minutes):

| Check | What it does | Last run |
|---|---|---|
| `quit` | Quits to the title from every point of every chapter: the intro, the opening scene, the fight, a boss's entrance, the ending scene, the defeat screen, the chapter-complete screen (by the pause menu, or the screen's own button), then goes straight into another chapter. At the title: no enemy or cast member, no loading screen, no HUD, no pause, the hero out of view; the next fight plays; no skinned mesh is left in the scene, and what the GPU holds at the title does not grow over a level's cycles. | 36 quits |
| `retry` | The defeat screen's Retry and the pause menu's Restart pressed twelve times at once; Restart in the middle of an intro; two chapters started at once. One fight, with the foes there should be, no rig left over from a load that was replaced, no loading screen over it. | chapters I to V |
| `pause` | Pauses in cutscenes and in the fight (the menu, and the window losing focus), runs a second and a half of frames while paused (nothing moves, neither clock runs), resumes through the button, and ends a cutscene by holding skip. | 26 pauses |
| `rate` | The real loop for ten seconds of clock at 30, 60, 144 and 240 frames a second, with frames of 5 to 45 ms, and with a 0.4 s stall every 90 frames: game time keeps pace with the clock (100 %; stalls run at 82 to 90 %, since a frame over a quarter of a second is capped), no position goes NaN, nobody moves more than 1 m in a frame. | 30 runs |
| `resize` | The window made 1x1, 0x0, 320x200, 200x3000, 3000x200, 3840x2160, 1x4000, and with one side empty, in a cutscene and in a fight: the camera's aspect and the renderer's size stay valid, the GPU raises no error, no health plate has a NaN position. | 120 sizes |
| `menus` | New game, Chapters, Settings (every setting pressed), Controls, Pause from a chapter and Settings and Controls from it, Resume, Quit to title, New game again. | |

And the campaign, played end to end (`__debug.playtestFlow`): the steady bot through all six chapters with every cutscene watched (intro, opening, fight, ending, the Continue button, the credits, the title): 20 minutes of game time in 54 s (5 in intros and openings, 9 fighting, 6 in endings), one defeat on the summit and its Retry, no error and four warnings, all "Pointer lock refused" (the page was not given a gesture); and a novice with every cutscene held through, 9 minutes in 33 s, no error (and a D3D compiler warning about one shader's float precision).

**Found and fixed:**

- **Spam retry leaked rigs and could leave the loading screen over a fight.** Every Retry or Restart starts a load; a load that is replaced (the button pressed again, the title chosen) finished its rigs late: they were added to the new fight's scene (about three rigs a press, never freed), and its progress bar drew the loading screen over a fight already begun. `Character.retire()` (a character that was cleared before its rig arrived frees the rig when it does) and the load token's guard on the loading screen (`Engine.startChapter`'s `report`) fix both.
- **A window with no size broke the render.** A minimised or hidden window has an inner size of 0: the camera's aspect went NaN and every pass of the post chain raised `GL_INVALID_FRAMEBUFFER_OPERATION`. `SceneManager.onWindowResize` keeps the last real size until the window has one (and the first aspect falls back to 16:9).
- **A new game kept what the last one taught.** New game from the title now clears the scenes seen, the hints shown, the akhada's lesson and the moves the fights taught (`Engine.newCampaign`), so the story and its teaching play again; the chapters stay unlocked.

### Left for later

- **A person at the controls.** The numbers are tuned against a bot (the steady skill is the yardstick). It reads blows from the engine's own data, as a player does from the screen, but it does not get tired, tense or lost: treat the curve as a first draft to be felt, and re-run `__debug.playtest([1, 2, 3, 4, 5], 24)` after any change to a weapon, a clip or an enemy (milestone 11b's weapons pass landed in `main` while this was being made: the hero's blows and hit windows are the hero's side of every number above).
- **The hit feel pass and Dwarka.** Merged with this branch in a scratch copy, main's hit feel pass (`combat/HitReact.ts`) lifts a steady player's Dwarka from 78 % to 92 %: the lean and twist a blow gives a swinging boss throw his blade off line (Shalva's first blow lands 39 % of the time, not 68 %). Skipping the lean and twist while the victim is committed to a swing (`if (this.committed(victim)) return;` in `trigger`) puts the curve back (II 99, III 94, IV 83, V 69); see docs/APPROVALS.md, "Milestone 12", item 6.
- **Loading sizes** (the roadmap's last word on this milestone) are for release prep, as agreed: the per-chapter downloads are 3.9 to 13.6 MB for a level, 8.5 MB for the hero (4.7 MB more for his training look) and 8.7 MB for Andhaka; nothing was compressed. *Done in milestone 13: see "Release".*
- **Draw calls in the akhada** (285 meshes in view) are the biggest steady cost left (about 3.6 ms of the frame's 3.9 ms of CPU is the render): merging the level's static meshes by material would cut it by half, but the level's code finds meshes by name (lamps, fires, the oculus), so it needs a pass of its own.
- **A pack's arrival** (five runts, six hurlers and runts) is still a frame of 40 to 60 ms, and a cutscene's own first draws are a frame of 45 ms here and there (the island's ending); a pool of foes made ahead and hidden would remove the first, and a warm-up that plays each story scene's first shot under the loading screen the second.
- **Hidden characters** (the prologue's villagers, the Vetala and Mayavi until the lesson ends) are still updated every step (0.1 ms a rig); skipping them is easy and was not done, because a scene cue that poses a hidden actor before showing it would then start its clip late.

## Release (milestone 13, 2026-10-06)

Made while the user was away, on the standing rules: nothing was published, uploaded, paid for or downloaded, and no model was rebuilt or regenerated. What exists is a build that works from any address, the files each host wants, a smaller download and a test of the production build; **publishing waits for the user's yes and a chosen host** (docs/APPROVALS.md, "Milestone 13"). The hosts, the sizes, the commands and the smoke test are in **docs/DEPLOY.md**; in short:

- **Any address.** Every file the game asks for goes through `asset()` (`src/core/Assets.ts`), built from Vite's `base` (`/`, `/Yudhveer/` for GitHub Pages, `./` for the itch.io zip; `--base` or `YUDHVEER_BASE`): 62 absolute `/assets/...` addresses in `src` were routed through it (`npm run build` fails on a new one: `scripts/check-asset-urls.mjs`). A build adds `?v=<hash of the file>` to each (`virtual:asset-versions`), so a host can cache `/assets/` for a year (`public/_headers`).
- **The download**, measured per chapter on the production build (table in docs/DEPLOY.md): the title screen 33.75 > 28.74 MB, a first visit through the summit 160.20 > 142.88 MB, `public/assets` 155.83 > 138.56 MB. The characters were already meshopt and WebP compressed; what was left was Blender's one-buffer-view-per-keyframe-track index (the hero's JSON chunk was 2.63 of his 8.58 MB), which `scripts/pack-glb.mjs` joins, writing the vertex streams in meshopt codec version 1: the 14 characters that are not bosses 41.63 > 29.39 MB (the hero 8.58 > 6.21, the Dwarka sky and Baoli's 1k sky as lossless half-float EXR 4.97 > 2.44 MB). Every value is the same (compared in the tool, in three's loader on 32 files, and in renders: the hero in both looks and every chapter's first frame, pixel for pixel; `game asset/audit/fixes/m13-release/`). The four bosses' models are left for the boss work (20.29 > 17.65 MB when `npm run pack:glb` is run on them).
- **What the title costs** (28.7 MB before a button): the Baoli arena is its backdrop (12.3 MB) and the hero's second look (6.2 MB) loads with it; the prologue loads Andhaka (9.4 MB) for a silhouette. Options in docs/DEPLOY.md; none made.
- **The files for the hosts**: `.github/workflows/pages.yml` (`workflow_dispatch` only, base `/Yudhveer/`), `public/_headers` (Netlify and Cloudflare Pages), `npm run build:itch` (`scripts/pack-itch.mjs`: base `./`, `yudhveer-itch.zip`), `scripts/serve-dist.mjs` (a test server that mounts a build under a sub-path and logs every request).
- **Smoke test**, both bases, all six chapters from the title, intros skipped, a few seconds played, Quit to title between them (relative build): no console error but the pane's "Pointer lock refused", no 404 but `/favicon.ico`, nothing outside the base, 110 audio files decoded.
- **A felled foe's body now makes its fall sound** (`combat/BodyFall.ts`, `CharacterRig.measureLanding`): the recorded `body_fall`, once, at the moment the death clip's hips reach the ground (read off the clip when the model loads: a rakshasa's lands 1.93 s into a 4.6 s clip), a body still airborne waiting for the ground. **The "source data detached" warning** from the debug jump during the prologue's run into Chapter I could not be reproduced in four tries (the same chapter, a later one, the prologue again, rendering during the load); no button of the menus can start a chapter while another is loading, so it is the debug path's (`__debug.chapter`). One window was closed anyway: `CharacterRig.load` pins its template the moment its model is in hand, not after its manifest, so a chapter started in that gap cannot free it (`trim` closes a freed template's bitmaps) from under a character about to be cloned from it.

## Bosses fight back (2026-10-06)

The user, after playing: "the villain does not just stand when I slide past him, go behind him and spam [the attack]; he uses his weapon to block my attacks too, and that sword / gada [clang] on that". What was wrong, found by spamming a boss and watching it (`game asset/audit/fixes/boss-guard/`): a boss had no answer to a hero at its back or to a hero who simply kept hitting it. Its turn was the slow heavy one (3.5 to 5 rad/s, built at 12 rad/s^2), it never raised its weapon, and its **posture never started over**: the line meant to empty the bar when a break ended (`Character.update`) could not run (the state had already left POSTURE_BROKEN), so a boss that had been broken stood up with a full bar and the next blow broke it again, every 2.5 s for as long as he clicked. Twenty seconds of spam from behind on the build this started from: the Guardian was broken 8 s of them and threw three blows, the Vetala was broken 12.8 s and threw one. "The villain just stands" was this. All three are fixed. Numbers, calls and credits are in docs/APPROVALS.md, "Milestones (2026-10-05)", "Bosses block (item 4)"; the contact sheets (the turn after a slide behind, a block, a guard broken by a charged blow, the kick, the counter, frame by frame at 60 a second) are `game asset/audit/fixes/boss-guard/sheet_<guardian|vetala|shalva|takshaka|andhaka>.jpg`.

### What a boss does now

- **It turns on him** (`Guard.alarmed`, `Enemy.faceTarget`). Struck from outside its front arc (more than 105 degrees off its facing), or with him standing at its back for a quarter of a second (within 3 m, or 4.6 m and swinging), a boss pivots at 2.2 times its usual rate for 1.4 s after such a blow (0.84 s after merely seeing him there), and never in the middle of a swing of its own (a slide behind it still beats a blow it has begun). It is still a turn with weight, **within the feel pass's limits**: it builds its turning speed at no more than 25 rad/s^2 for a boss and 50 for the rest (the jitter probe fails a boss over 1500 deg/s^2 and the rest over 3000; 3 times a boss's own 12 was 2063 and failed), and it plans its braking on 0.6 of that, because planned on all of it a turn at this speed runs a step late, arrives at its heading still turning and stops dead (a 5500 deg/s^2 snap in one step: `TurnOptions.margin`). Measured (the hero placed 2 m behind it, two clicks, the time until it faces him within 10 degrees): the Guardian 0.73 s (it was 0.93), Shalva 0.67 (1.18), Takshaka 0.75 (0.87), Andhaka 0.90 (1.13), the Vetala 0.50 (0.50, already as quick as 50 rad/s^2 allows). The quickest a boss can turn half way round at 25 rad/s^2 is 0.71 s. With `__debug.jitter` and the hero standing behind it for six seconds: the Guardian fails on the build this started from (1973 deg/s^2) and passes now (1432), Takshaka 1687 > passes, the Vetala 10408 > 2865 (its remaining three failures, locomotion flips, a clip restart and yaw reversals, are the same as before); the other scripted scenarios (S3, S3b) fail as they did, on clip restarts, and are unchanged.
- **It guards** (`combat/Guard.ts`). Seeing his swing begin (`Player.swing`), a free boss rolls to raise its weapon across its body (the BLOCK state: the Great Sword Pack's raise into a crouched guard, held on its last pose; a blow taken on it is BLOCK_HIT, `great_sword_impact`, settling back into the held guard). The chance is `base + perBlow * pressure`, up to `max`; pressure is the blows it has taken lately (1 each, 1.5 from outside its front arc, a blocked one 0.5, fading with a 2.6 s memory, not counting while it is staggered or broken). It is free to guard only when it is standing, walking or circling, not winding up, swinging, casting, roaring or diving, not in the `recovery` after one of its own blows ended (0.3 to 0.5 s) and not when its own next blow is due within `window` seconds. It covers the front arc only (80 degrees either side), so a hero at its flank still lands his blows. A guard stays up `hold` seconds (a blow on it keeps it up to `extend`, never past `longest`) and is not raised again for `cooldown`. **The openings are the point:** a boss is never guarding while it swings, in the moment after, or about to swing, so timing beats spam. **Hard pressed** (2.5 blows of pressure, a hero who will not stop) it is more eager: the recovery narrows by half, the window by 70 % (never under the 0.22 s a raise takes) and the wait after a guard by 75 %; a swing it was not free for is rolled for the moment it is (while the blade is still 0.12 s or more from landing); with pressure over 1.5 and a swing of his in the last 0.9 s it puts the guard up between its own blows (every 0.35 s it decides), and when its own blow is due with his about to land on the guard (within 0.35 s) it takes his first. **The weapon comes down, then it strikes:** after a guard ends (not when it answers), its own blow starts 0.3 s later (`LOWERING`), so a boss does not go from a raised guard into a four-blow string in the same step with a hero who has swung into the opening.
- **A block** (`CombatSystem.resolveBlocked`, `HitFeel.blocked`, `Player.recoil`). A light blow on the raised guard does no damage and half the posture a blow that lands does (`posture` 0.5: 17 % of the blow's own), the weapons ring and throw chingaari where they met (the closest points of the two blades, `Guard.contactPoint`: along the hero's blade), with the light's flash, the camera's `clash` event (75 ms freeze, a kick back along the bounce) and a clang: steel on steel (`guard_clang_steel`, alternating with `blade_clang`), iron for a gada, a cleaver or the hero's mace (`guard_clang_iron` over a low bong), a claw's dull knock and scrape (Takshaka), a staff's crack and a faint ring (no sparks: a staff throws none). The hero's weapon bounces: `Player.recoil` puts him in DEFLECTED for 0.3 s (the swing and its chain are gone), throws him back 0.5 m (0.75 for a mace, 0.35 for a staff) and, from 0.14 s in, lets him slide, guard or parry out of it. His next click is lost to the recoil, which is what makes a mash lose to a guard.
- **A heavy blow breaks the guard** (a finisher, a charged Shakti blow, the leaping strike: whatever `heavyBlow` already was). It does its damage and 16 % of the boss's posture bar more, the guard is gone for 2.6 s and the boss staggers as it already did to a heavy blow (the 2.5 s grace between staggers still stands), `Guard broken` in gold, a louder clang. A hero who chains a string breaks the guard with its last blow: that is what teaches mixing blows in.
- **It answers** after two or three blocks in a row (the Guardian's three), or when the blows it has taken pile up past `snap` (3.4: a run of them it did not guard): a **backhand** if it was last struck from behind or the flank (its wide cut, `ATTACK_2`), else its quickest blow, made ready now (never the string, never `ATTACK_3`), with a glint along its weapon and the telegraph's rising note as the cue (a boss had none); or **a kick** (`SHOVE`, the Great Sword Pack's front kick `great_sword_kick_2`: a lunge in and the foot at his chest 0.68 s after it begins) when he is close, 8 times its blows' scale in damage and 16 in posture, throwing him 2.6 m (never off an edge) and staggering him; he can slide it, parry it (the boss is deflected) or take it on the dhal (two fifths of the push). Never into the recoil: an answer waits 0.42 s after the block that earned it, and not again for 2.4 s. Warning: the kick's window opens 0.62 s after it begins (0.92 for the Vetala, whose telegraph glints first) and it landed 0.68 s in, in every battery; the counter swing is a blow of its own clips, whose warnings `__debug.telegraphs()` lists (the first blow of one landed no sooner than 0.73 s after its first sign in any battery). The brief's floor was about half a second.
- **Clips** (`game asset/README.md`, `G`). The five bosses are rebuilt with `great_sword_blocking` (the raise, 0.47 s), `_2` (the hold, 0.97 s) and `_3` (the lowering, 0.5 s), the last two in the models but not used (the raise's last pose is the hold, and the guard crossfades to the stance), `great_sword_impact` (a blow on the guard) and `great_sword_kick_2` (the kick), +0.15 to 0.54 MB each. Every old clip, socket, finger bone, height and triangle count is as it was (compared with the shipped files; the old ones are in `game asset/characters/_backup_2026-10-06/`). All five rigs took the clips: no procedural guard pose was needed. The two-handed clips are played with one weapon in the right hand, as Shalva's and Andhaka's strafes already were; the Vetala crosses his two blades and Takshaka brings both forearms and claws up.
- **Sound** (`SoundFX.playBlocked`, `playGuardBreak`): two new recordings, `guard_clang_iron` and `guard_clang_steel` (ElevenLabs, 12 credits as the takes report, 36 as `estimate_only` quoted them), over the existing `blade_clang`, `parry_clash` (the ring) and `shield_block` (the gada's low body). Levels through the real chain (an offline render): a steel block peaks at -5 dB, an iron one at -4.6, a staff's -6.4, a claw's -7, against the parry's -7.5 and the dhal's -6.5.
- **The bot** (`HeroBot`), for the numbers below. A steady or expert player waits out a guard that is up and covers him (and swings anyway with a charged blow stored), **waits a second to see the counter begin** after a blow of his is turned aside and while a boss's weapon is coming down (a swing cannot be taken back and the counter is the one blow a boss makes with him standing right there: before this the steady bot swung into every counter it was not looking at, and Takshaka's string landed 1.3 times for every time it was thrown, against 0.8), reads the kick as a blow (its window at the clip's contact) and is free to slide, guard or parry from the 0.14 s of the recoil. The novice keeps clicking. `__debug.playtest` reports each boss's guard per run (raised, blows turned aside, broken, answers, kicks) and `tune.enemies.<name>.guard` takes `GuardSpec` fields for what-ifs.

### The numbers, per boss

| Boss (weapon, ring) | base + per blow, most | recovery / window | holds / blow keeps it / at most / wait | answers after | kick share |
|---|---|---|---|---|---|
| Baoli Guardian (talwar, steel) | 0.40 + 0.30, 0.85 | 0.5 / 0.30 s | 0.80 / 0.65 / 1.4 / 1.9 s | 3 blocks | 35 % |
| Vetala (two swords, steel) | 0.45 + 0.30, 0.90 | 0.4 / 0.20 s | 0.70 / 0.60 / 1.2 / 1.4 s | 2 to 3 | 30 % (within 2.4 m) |
| Shalva (gada, iron) | 0.45 + 0.30, 0.90 | 0.35 / 0.18 s | 0.85 / 0.70 / 1.5 / 1.6 s | 2 to 3 | 40 % |
| Takshaka (claws, claw) | 0.45 + 0.30, 0.90 | 0.35 / 0.18 s | 0.80 / 0.65 / 1.4 / 1.7 s | 2 to 3 | 40 % |
| Andhaka (cleaver, iron) | 0.45 + 0.30, 0.90 | 0.30 / 0.15 s | 0.75 / 0.65 / 1.3 / 1.4 s | 2 to 3 | 35 % |

(Common to all: the guard is up from 0.12 s into its raise, a reaction of 0.10 s, the kick's range 2.8 m, a blocked blow's damage 0 and posture 0.5, a guard that was broken stays down 2.6 s. The Vetala reacts in 0.09 s and sees him within 3.4 m, the rest within 4. Raiders and the other minions do not guard.)

**Twenty seconds of spam, before and after** (a hero who clicks every 8th step and, when the boss faces him, slides to 2 m behind it again; the mean of 3 runs; before is one run of the build this started from). *Turned aside* is blows of his that met a raised guard (a heavy blow that broke one is counted apart); *down* is time in STAGGER or POSTURE_BROKEN:

| Boss | Blows landed | Turned aside | Guards raised | Boss's blows thrown / landed | Health the hero lost | Down | Before: blows / aside / thrown / landed / lost / down |
|---|---|---|---|---|---|---|---|
| Guardian | 31 | 1.3 | 2.3 | 5.0 / 4.7 | 34 | 4.7 s | 36 / 0 / 3 / 1 / 11 / 9.0 s |
| Vetala | 28 | 3.3 | 4.0 | 4.3 / 4.0 | 59 | 8.3 s | 34 / 0 / 1 / 1 / 15 / 14.4 s |
| Shalva | 22 | 0.7 | 2.0 | 5.0 / 1.0 | 27 | 4.6 s | 21 / 0 / 5 / 3 / 68 / 3.3 s |
| Takshaka | 19 | 3.0 | 3.3 | 4.7 / 6.0 | 135 | 2.6 s | 21 / 0 / 4 / 5 / 129 / 5.2 s |
| Andhaka | 18 | 3.0 | 3.3 | 5.7 / 8.3 | 218 | 0.0 s | 20 / 0 / 7 / 6 / 164 / 1.9 s |

(The hero has no health limit in this test: it is what a hero who only clicked would have lost, and a real one dies first. The same hero standing in front and following the boss round does the same: 1 to 4 blows turned aside in 20 s, 0.3 to 3 broken guards, the boss attacking 4 to 6 times.) The Guardian and the Vetala used to stand broken for half to three quarters of it (9 and 14 s) and threw three blows and one; they now throw five and four and are down for 5 and 8 s, as the hero's blows earn (a posture break is the reward for hitting a boss, not a lock). Never a boss standing: the longest any boss stayed within reach of him without attacking, guarding or turning was 1.7 s (the Guardian; Shalva's 3 s is his dive under the water, as before).

### The balance

**Where it ended** (the steady bot is the yardstick, 48 runs a chapter, 96 in IV and V and 24 in the prologue; win rate (wins/runs) / median seconds of fight / median health lost over all runs; IV and V add two health bars). "Before" is the build this started from (main at 1298556: the hit feel pass and the playtest bot), measured the same way:

| Chapter | Steady, before | Steady, after | Aim |
|---|---|---|---|
| 0 Prologue | 100 % / 17 s / 5 (M12) | 100 % (24/24) / 16.5 s / 0 | scripted loss |
| I Baoli | 100 % (48/48) / 23.4 s / 40 | 100 % (48/48) / 25.7 s / 36 | 100 |
| II Akhada | 98 % (47/48) / 58.9 s / 66 | 98 % (47/48) / 59.0 s / 53 | 95 |
| III Island | 94 % (45/48) / 85.6 s / 60 | 88 % (42/48) / 86.1 s / 52 | 90 |
| IV Dwarka | 80 % (77/96) / 51.2 s / 83 | 73 % (70/96) / 60.4 s / 83; **76 % in 288 runs** (three seeds) | 80 |
| V Summit | 74 % (71/96) / 62.1 s / 46 | 68 % (65/96) / 59.2 s / 42; **70 % in 192 runs** (two runs) | 70 |

| Skill | IV, before | IV, after | V, before | V, after |
|---|---|---|---|---|
| Novice (24 runs) | 100 % / 31.8 s | 46 % (11/24) / 29.5 s | 46 % (11/24) / 57.4 s | 54 % (13/24) / 55.8 s |
| Expert (24 runs) | 79 % (19/24) / 57.7 s | 88 % (21/24) / 67.8 s | 92 % (22/24) / 62.9 s | 96 % (23/24) / 57.4 s |

(Island, III, has no boss and no change: its 88 against 94 is run to run, 42 of 48 against 45; the figure was 98 and 96 on the way.) A mashing novice at Dwarka was 100 % because the lock let him stand behind a boss that never got up, and is 46 % now: that is the brief. The steady and the expert players, who wait out a guard and a counter, are where they were; the blows each boss lands are where a good player takes them (Dwarka: Shalva's first blow 41 a run, Takshaka's string 19; the summit: Andhaka's string 36, the bolts 13).

What changed, every number (no hero number, weapon blow or move was touched):

| Who | What | Before | After |
|---|---|---|---|
| Baoli Guardian (I) | health | 1000 | 650 |
| | blows (`damageScale`) | 0.6 (10.8, 14.4) | 0.4 (7.2, 9.6) |
| Vetala (II) | health | 200 | 200 |
| Shalva (IV) | health | 800 | 520 |
| Takshaka (IV) | health | 1000 | 640 |
| Andhaka (V) | health | 840 | 720 |
| the five bosses | guard, turn, answers | none | the table above |
| the five bosses | a posture that broke | stayed full: the next blow broke it again | starts again at 0 (`Character.renewsPosture`, set by `Guard`'s constructor) |
| the hero, the minions | a posture that broke | as it was | as it was |

**Why health went down.** A boss that is no longer locked swings more often (the Guardian threw his string 1.2 times a fight and throws it 2.1) and turns some of the hero's blows aside (1.9 a fight for the Guardian, 4.8 in Dwarka, 1.1 on the summit, each costing the hero the bounce and the wait for the counter), so every number M12 set for a locked boss is a harder fight now. Held at the old health a steady player won less: Andhaka at 840, 58 % (96 runs, against 70 % at 720); Dwarka at 640 and 780, 59 % (76 % at 520 and 640). The new health brings each chapter back to its aim. Dwarka is the steepest of them (Shalva's health 480 gave 84 %, 560 gave 77, 640 gave 59), which is why its number is pooled over three seeds. The Guardian's blows went down as well as his health (0.6 to 0.4) because the first boss is meant to cost a steady player well under half his health: at 0.5 it cost 69 in a fight of 36 s (he swings more), at 0.4 it costs 36.

### Fairness

No boss blocks mid-swing, in the recovery after a blow, or with its next blow due; a block is a bounce of 0.3 s (the hero can slide, guard or parry from 0.14 s in); the beat of 0.3 s after a guard comes down gives the weapon time to lower; the counter and the kick wait 0.42 s after the block that earned them and have 0.62 s (kick) and 0.73 s (swing) of warning, against a steady player's 0.30 s reaction; a heavy blow, a charged blow or a flank always gets through; and 20 s of spam keeps every boss attacking (above). Robustness: `__debug.robustness()` passes every check but one, **a failure the build this started from has too**: chapter I at 30 frames a second runs game time at 71 % of the clock (main at 1298556: the same 71 %); it is the hit feel pass's hit-stop (65 to 130 ms freezes, up to 240 ms in half a second) in a bot's fight, not this pass. `__debug.playtestFlow({ from: 1, to: 5, skip: true })` clears all five chapters, no console error and four warnings, all "Pointer lock refused".

### Not done, and left

- **The raiders and the other minions do not guard** (the brief said maybe a rare raider): a minion's blow would have had to be read from a blade, and the prologue is a scripted loss.
- **No quick step** (the brief offered it with the backhand and the guard as the answer to a blow from behind): the answers are the guard, the backhand, the kick and the quick swing.
- **No hint teaches the guard**: the pose, the clang and the recoil say it. A one-time line when the first blow is turned aside is a few lines in `CombatSystem.resolveBlocked`.
- **The hero's and the minions' posture bars still never start over** (the bug above): the hero is re-broken by the next blow he takes, and it is part of the danger every number in Milestone 12 was tuned on, so it was left as it was; if you want it fixed it is `Player.renewsPosture = true` and his chapters get easier. Every minion's too (the island and the summit's waves rest on it).
- **A person at the controls.** The numbers are tuned against a bot that waits out a guard and a counter; a player who mashes does not (the novice row), and one who is hard to read may find a guard comes up too seldom or too often. `tune.enemies.<name>.guard` (`base`, `perBlow`, `max`, `recovery`, `window`, `hold`...) answers what a change does before it is made.
- **"Right click" is the dhal here** (left click strikes): the report was read as the attack.

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
- [x] **12. Polish and balance:** a bot plays every chapter's fight and the whole campaign (`__debug.playtest`,
  `playtestFlow`), the difficulty curve (a steady player wins 100, 96, 91, 78 and 70 per cent of the chapters' fights, it
  was 100, 83, 88, 100 and 92; no blow comes without warning), the frame hitches of 100 to 460 ms gone (models parsed
  once, a warm-up under the loading screen), the quit, retry, pause, frame-rate and resize checks (see "Milestone 12").
  *Loading sizes: left to release prep.*
- [x] **13. Release:** final build, deploy, a trailer if wanted. *Deploy prepared, publishing waits for the user
  (docs/DEPLOY.md, "Release"): the build works from any address, the host files, the sizes and the production smoke
  test are done; the host is the user's choice (docs/APPROVALS.md, "Milestone 13"). A trailer: not made.*

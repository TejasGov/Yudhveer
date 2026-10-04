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

- **The look changes:** the same forest area, but no longer the blue and red night lighting. It becomes a
  **sunset day scene**, warm and cinematically beautiful.
- **Opening cinematic (not playable):** Yudhveer learning to fight with a sword.
- **Then gameplay:** an **old vanara (monkey-like) mentor** teaches him. He **gives Yudhveer the shield** and teaches
  him to block and **parry** and to fight properly.
  - The mentor is a placeholder for now; the user will make his model with Meshy.
- **Weapons: a very basic sword and the shield.**
- He clears the chapter with them (the Vetala and Mayavi).
- **At the chapter's end**, with both bosses beaten, he learns he must go to **Dwarka**, where he will find out why
  his village was attacked. He also learns that Dwarka's boss (Shalva) fights with a **mace**, and that a sword
  will not be enough against it: hence the island and its blessed mace.

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
| Prologue | Lathi | none | strike, dodge |
| I. Baoli | Lathi | none | the guru's teachings, learned during the fight |
| II. Hanuman forest | Basic sword | **Dhal, from the vanara mentor** | block, parry |
| III. Island | **Blessed mace** (two-handed) | none | heavy two-handed blows |
| IV. Dwarka | Blessed mace (two-handed) | none | (to decide) |
| V. Summit | **Magical sword, from Takshaka** | dhal | the full kit |

## Placeholders to replace later (the user, with Meshy)

- The old vanara mentor (Chapter II).
- The island's mini monsters and archer monsters (Chapter III).
- The second minion type on the summit (Chapter V).
- The lathi, the basic sword and the blessed mace models (to source or make).
- Village characters and the guru (prologue).

## What has to be built

1. **Progression system:** *done (milestone 1).* See "Milestone 1" below.
2. **Weapon sets for the hero:** *done (milestone 1), with placeholder models and borrowed clips.*
3. **Prologue:** the small village arena, the goons, the scripted loss, the guru's apparent death, Andhaka's
   silhouette shot.
4. **The guru's voice in Chapter I:** teaching prompts tied to the fight.
5. **Chapter II:** the sunset relight of the atrium, the non-playable training cinematic, the mentor (placeholder),
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
  only: both hands on the haft needs a clip authored for it.
- **Kit keys are not chapter numbers**, so the prologue and the island slot in as new kits (`KitId`) without
  renumbering anything. The island's kit is the mace again.
- **Known gaps:** the pause screen's controls list still shows every move; the lathi has no guard at all, so Chapter
  I is a pure slide-and-strike fight until the guru's teachings (milestone 4) hand something over.

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
  character sounds were reverted; they are to be replaced with real ones.
- Andhaka's in-game entrance at the summit (smile, crown, sword from the stone) is the reveal of his face.

## Roadmap

Each milestone is one chat. Start it with: "Read docs/STORY.md, let's do milestone N." Tick it off here when done.

- [ ] **0. Merge and set up** (this chat or a short one): merge `campaign-production-pass` into `main`; connect
  ElevenLabs, Meshy and Poly Haven.
- [ ] **1. Progression system:** five chapters (the island inserted as III), the hero's kit per chapter (weapon,
  shield, allowed moves), saved with progress.
- [ ] **2. Hero weapon sets:** lathi, basic sword, two-handed mace (own animations), magical sword; hit data,
  trails, sounds. The user downloads the Mixamo packs it asks for.
- [ ] **3. Story delivery:** dialogue and subtitle system, cinematic cutscene tools for story beats (beyond intros),
  voice line playback.
- [ ] **4. Prologue:** the small village arena, goons, the scripted loss, the guru taken, Andhaka's silhouette.
- [ ] **5. Chapter I rework:** lathi fight, the guru's remembered teachings, the freed Guardian's words.
- [ ] **6. Chapter II rework:** the sunset relight, the sword-training cinematic, the vanara mentor (placeholder),
  shield and parry training, the ending that points to Dwarka.
- [ ] **7. Chapter III, the island:** the new underground lamp-lit map (explorable), mini monster and archer
  placeholders, the blessed mace.
- [ ] **8. Chapter IV, Dwarka:** the hero with the mace, Shalva mace against mace, the truth about Andhaka,
  Takshaka's prophecy and the sword.
- [ ] **9. Chapter V, the summit:** the second minion type, the guru-as-Shiva ending cinematic, credits.
- [ ] **10. Voices and sound:** ElevenLabs voices for every line, real character sound effects, music per chapter.
- [ ] **11. Replace placeholders:** the user's Meshy models (mentor, island monsters, second minion, weapons).
- [ ] **12. Polish and balance:** full playthroughs, difficulty curve across the five chapters, performance,
  loading sizes.
- [ ] **13. Release:** final build, deploy, a trailer if wanted.

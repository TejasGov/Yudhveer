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

- **Weapon: the lathi only.** No sword, no shield.
- He fights the Baoli Guardian by **remembering his guru's teachings**: the guru's voice and memories guide him
  through the fight, teaching the basics as he needs them.

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

1. **Progression system:** abilities and weapons unlocked per chapter, saved with progress; the hero's state
   (weapon, shield, which moves are allowed) set by the chapter.
2. **Weapon sets for the hero:** move sets, hit data and sounds for the lathi, the basic sword and the mace (the
   mace needs heavy animations; source them from Mixamo or Meshy).
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

## Still open: why Chapter I happens

Proposal, to confirm: **the raiders fled with the guru through the old baoli.** The stepwell outside the village
hides a passage the raiders used, and Andhaka's darkness has bound the Baoli Guardian (once the well's protector) to
block anyone who follows. Yudhveer goes down with only his lathi and the guru's teachings in his head. Freed by
defeat, the Guardian tells him that a lathi will not carry him further: he must go to the vanaras of the Hanuman
akhada to learn to truly fight. That chains the prologue to Chapter I and Chapter I to Chapter II.

Alternatives considered: the baoli as the village's poisoned water, which he must clear before he can leave; or
the guru's dropped rudraksha leading him there.

## Already decided (from earlier sessions)

- Sound: the per-place ambience stays (stepwell, jungle, sea, mountain with thunder and lightning). The synthesized
  character sounds were reverted; they are to be replaced with real ones.
- Andhaka's in-game entrance at the summit (smile, crown, sword from the stone) is the reveal of his face.

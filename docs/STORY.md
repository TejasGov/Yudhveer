# Yudhveer: story and progression plan

The design document for the campaign's story and the hero's growth. **Read this first** in any session that works on
story, levels, progression or new characters, and update it when a milestone lands or a decision changes.

## The idea

Yudhveer is a young Indian yodha who sets out to defeat evil. He must not start strong: if the player has the best
sword and shield from the first minute, the game becomes Tekken or Mortal Kombat, and the feeling of perseverance,
struggle and a true warrior spirit is lost. So he starts with almost nothing, loses the first fight that matters,
and earns every weapon and skill on the road. Each chapter prepares him for the next.

## The story, chapter by chapter

### Prologue: the village raid (new map)

- His village (desert, dusk). Yudhveer trains with a lathi under his guru.
- Rakshasas raid the village. He fights and **loses**.
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

### Chapter III: the island and Dwarka

- **A new map: an island.** He learns that a **blessed mace** is kept there.
- He wins it by defeating the island's **mini monsters** and **archer monsters**.
  - Both are placeholders for now; the user will make them later.
- **Weapon: the blessed mace.** With it he defeats Chapter III's bosses at Dwarka: Shalva, then Takshaka.
- **Takshaka's dying prophecy.** As the serpent king dies, he tells Yudhveer that Andhaka cannot be defeated, then
  realises he was foolish not to see it: Yudhveer has set his purpose and is destined to free them all from Andhaka's
  reign. Takshaka **grants him the magical sword**.
  - This is the sword the hero carries in the game now (`yodha_khanda.glb`).

### Chapter IV: the Kailasha summit (existing map)

- **Weapon: the magical sword** (with the shield).
- It plays as it does now: rakshasa waves over the bridges, then Andhaka's entrance and the final fight.
- **Add a second minion type** alongside the current rakshasas, for variety. Placeholder for now.

## Weapon progression

| Chapter | Weapon | Shield | Skills unlocked |
|---|---|---|---|
| Prologue | Lathi | none | strike, dodge |
| I. Baoli | Lathi | none | the guru's teachings, learned during the fight |
| II. Hanuman forest | Basic sword | **Dhal, from the vanara mentor** | block, parry |
| III. Island, Dwarka | **Blessed mace** | dhal | (to decide) |
| IV. Summit | **Magical sword, from Takshaka** | dhal | the full kit |

## Placeholders to replace later (the user, with Meshy)

- The old vanara mentor (Chapter II).
- The island's mini monsters and archer monsters (Chapter III).
- The second minion type on the summit (Chapter IV).
- The lathi, the basic sword and the blessed mace models (to source or make).
- Village characters and the guru (prologue).

## What has to be built

1. **Progression system:** abilities and weapons unlocked per chapter, saved with progress; the hero's state
   (weapon, shield, which moves are allowed) set by the chapter.
2. **Weapon sets for the hero:** move sets, hit data and sounds for the lathi, the basic sword and the mace (the
   mace needs heavy animations; source them from Mixamo or Meshy).
3. **Prologue:** the village map, the raid, the scripted loss, Andhaka's silhouette shot.
4. **The guru's voice in Chapter I:** teaching prompts tied to the fight.
5. **Chapter II:** the sunset relight of the atrium, the non-playable training cinematic, the mentor (placeholder),
   the shield-and-parry training section.
6. **The island:** a new map, the mace's resting place, mini monster and archer placeholders, the extraction scene.
7. **Takshaka's death scene:** the prophecy, the sword handed over.
8. **Summit:** the second minion type (placeholder) in the waves.
9. **Voice and sound** (ElevenLabs): the guru, the mentor, Takshaka's prophecy, Andhaka; real character sound
   effects to replace the synthesized ones the user disliked.

Suggested order: progression system and weapon sets first, then the prologue, then the chapters in order.

## Tools

- **ElevenLabs:** voices, character sound effects, music.
- **Meshy:** characters and props (the placeholders above).
- **Blender:** the tool connection is already set up; for building and lighting maps.
- **Poly Haven:** CC0 textures, skies and models, for the village and the island.
- **Mixamo** (downloaded by the user): animations.

## Open questions

- **The guru:** is he killed in the raid, or taken (a rescue could then land at the summit)?
- **The island and Dwarka:** is the island part of Chapter III (island, then Dwarka) or its own chapter?
- **The mace:** does Yudhveer fight with mace and shield, or the mace in both hands?
- **The interludes:** small explorable areas, or tight trial arenas?

## Already decided (from earlier sessions)

- Sound: the per-place ambience stays (stepwell, jungle, sea, mountain with thunder and lightning). The synthesized
  character sounds were reverted; they are to be replaced with real ones.
- Andhaka's in-game entrance at the summit (smile, crown, sword from the stone) is the reveal of his face.

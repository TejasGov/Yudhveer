# Dialogue pass: proposals (not applied)

The user: "some dialogues are too AI slop and hamper the narrative of the game, rework them (don't generate eleven
labs voice for it just yet, just text proposals, not all dialogues need revamping but some do)".

Nothing here is in the game yet, and no audio has been generated. The texts in the game are in
`src/game/Story.ts` (prologue), `src/game/stories/*.ts`, `src/game/Chapters.ts` (cards), `src/cinematics/Intros.ts`
(Andhaka's crowning line) and the entities' epithets. docs/STORY.md has the per-chapter line tables.

**Reviewed:** 91 spoken lines (62 voiced, 29 Yudhveer subtitles, the crowning line included), plus 53 card, callout,
epithet and hint texts: 144 in all. **Flagged:** 37. That is 19 voiced lines (16 rewrites, 1 cut, 2 trims of the
existing recordings), 9 subtitles and 9 card or epithet texts. The other 107 stay as they are. Most of the writing is
already spare and works: the guru's lessons, the vanara's teasing, the boatman, Shalva's opening sneer.

**Re-record cost** at about 1.2 ElevenLabs credits per character per take, 2 takes (2.4 credits per character), for
the recommended text (option A) of each voiced rewrite:

| Tier | Lines | Characters | Credits |
|---|---|---|---|
| 1, the climax and the island (top 8) | `summit_reveal_shiva_1`, `_2`, `summit_end_guru_2`, `andhaka_prologue_kneel`, `prologue_end_guru_1`, `island_end_voice_1`, `_2` | 492 | about 1,180 |
| 2, Dwarka and the baoli | `dwarka_open_shalva_2`, `dwarka_fall_shalva_3`, `dwarka_end_takshaka_2`, `baoli_end_guardian_1`, `_3`, `_4`, `baoli_fight_guru_7` | 621 | about 1,490 |
| 3, optional | `akhada_end_mentor_2`, `akhada_train_mentor_4` | 139 | about 335 |
| **All 16** | | **1,252** | **about 3,005** |

Free: the cut (`summit_end_guru_4`), the two trims (`akhada_end_mentor_3`, `baoli_fight_guru_3`: the existing take
A cut at a pause with ffmpeg), every subtitle and every card. Inline direction tags (`[calm, wry]`) are billed as
characters too: with about 15 characters of tag per line, the total is about 3,580 credits. Tier 1 alone fixes the
worst of it.

---

## What reads as "AI" here, in patterns

1. **The plot is stated four times.** Andhaka says the guru's soul "will burn before my god" in the prologue. Shalva
   explains it over three lines at Dwarka. The guru restates it twice on the summit ("He meant my soul for his
   god...", "He gathered wise souls to throw down Mahadeva..."). STORY.md says the boy *learns* the truth at Dwarka,
   but the prologue already told him. The summit's irony is spelled out in words a moment before the light shows it.
2. **Aphorisms with a balanced structure.** "Every lesson was mine to give. Every step was yours to take." "It has
   carried you this far. It will not carry you further." "Then I will learn. And then I will follow." "A dhal is not
   for hiding." One of these per character is a voice. Six across the cast is a tic.
3. **Questions that only cue the next line.** "To what end?", "Then what will?", "And my guru?". Yudhveer asks
   whatever the plot needs next, so he reads as an interviewer, not a boy.
4. **Stock worthiness and destiny tropes.** "Lift it, if you do not lift it for yourself" / "Not for myself" /
   "Then it will not grow heavy in your hands" is the Mjolnir test, word for word in spirit. "You were born to end his
   reign" and "has not met its equal" are generic chosen-one phrasing.
5. **Grand words with nothing behind them.** "The dark is lifted from the mountain." "The dark... it has let go of
   me." "Something dark binds it. Set it free." "Far beyond your reach." "A crown waits for the one who would wear
   it." Each of these could sit in any fantasy game.
6. **Everyone talks the same way.** Four speakers call him "boy" (the vanara seven times, Shalva, Takshaka,
   Andhaka). The guardian, the shrine voice and the guru all deliver the same kind of solemn instruction.
7. **One motif used too often.** Feet come up seven times before the summit ("Feet first" twice word for word, "Keep
   your feet", "Look at its feet", "Feet planted", "A man off his feet..."). The payoff, "You kept your feet", lands
   harder if the motif shows up three or four times.
8. **Repeated card shapes.** Chapter I's card says "Something old keeps the water here." Chapter III's says
   "Something blessed is kept in the dark. Something keeps it." Of the cleared lines, three are "quiet" and one is
   "silent".

Voices to aim for, from the brief: the guru is spare, warm and oblique (and wry, since he is a god letting himself be
carried). Andhaka is crude and hungry. The vanara is gruff, teasing and practical. Shalva is a proud, bitter sea-king.
Takshaka is ancient and tired. The boatman is plain and superstitious. Yudhveer is young, determined and uses few
words; he is never eloquent.

---

## The 15 most damaging, in order

Credits are for 2 takes of option A (2.4 credits per character).

### 1. `summit_reveal_shiva_1`: Shiva, the statue lit (Chapter V ending, shot 9)

- **Now:** "Every lesson was mine to give. Every step was yours to take."
- **Why it fails:** a greeting-card aphorism with balanced halves, at the game's single most important moment.
- **A (recommended):** "Did you think I needed carrying, Yudhveer? I only wanted to see how far you would come."
  (87 chars, about 209 credits.) It is wry and warm, and it shows he let himself be taken. It answers Andhaka's
  carrying without explaining it, and it keeps the beat: the teacher was the god.
- **B:** "So. You climbed the whole mountain for one old man." (51, about 122.)

### 2. `summit_end_guru_4`: the guru, before the light (shot 6)

- **Now:** "He gathered wise souls to throw down Mahadeva. He never asked whose soul he carried up the mountain."
- **Why it fails:** the character states the theme and explains the twist a few seconds before the scene shows it.
- **Recommended: cut.** Go straight from "You kept your feet" and the boy's answer to "Look up, Yudhveer." The light
  and the statue do the telling. Free (the shot needs a short `duration` if it is left with only "Look up").
- **If a line is wanted:** "He climbed a long way to meet a god." (36, about 86.) Oblique: true twice over.

### 3. `summit_reveal_shiva_2`: Shiva, the eclipse passes (last shot)

- **Now:** "The dark is lifted from the mountain. Go home, Yudhveer, and teach what you have learned."
- **Why it fails:** stock words ("the dark is lifted") and the moral said outright.
- **A (recommended):** "Go home, Yudhveer. Somewhere there is a boy with a stick, and no one to teach him." (82, about
  197.) It echoes Andhaka's sneer ("A boy with a stick") and turns it round: the boy becomes the guru.
- **B:** "The sun is coming back. Go home, Yudhveer. Light the fire. Then we eat." (71, about 170.) It echoes the
  prologue's "Once more, and then we eat"; a god's promise, left open.

### 4. `andhaka_prologue_kneel`: Andhaka, over the beaten boy (prologue ending)

- **Now:** "A boy with a stick... Your guru's soul will burn before my god. Kneel."
- **Why it fails:** it gives away Dwarka's reveal in the first ten minutes, and it is an announcement where it should
  be appetite.
- **A (recommended):** "A boy with a stick... Kneel. I did not come for scraps." (55, about 132.) He is crude and
  hungry, and the boy is scraps beside the meal. Nothing is explained, so Shalva's answer at Dwarka is a real reveal.
- **B:** "A stick. Against me, a stick. Kneel, and you may keep it." (57, about 137.)
- **Note:** another helper is reworking this ending's staging right now. Apply this after that lands.

### 5. `island_end_voice_1` and Yudhveer's answer: the shrine voice, before the altar (Chapter III ending)

- **Now:** "Lift it, if you do not lift it for yourself." / Yudhveer: "Not for myself. For my guru, and against the
  ones who took him."
- **Why it fails:** the Mjolnir worthiness test, and an awkward conditional. The boy answers with a manifesto.
- **A (recommended):** voice: "Many reached for it. It knew what each of them wanted it for." (61, about 146.)
  Yudhveer: "I want my guru back." The mace still judges, without a speech about it, and the boy sounds his age.
- **B:** voice: "Another one. What do you want it for?" (37, about 89.) Yudhveer as in A.

### 6. `island_end_voice_2` and "He will meet it now.": the shrine voice, mace in hand

- **Now:** "Then it will not grow heavy in your hands. Go to Dwarka. The one who holds it fights with a mace, and has
  not met its equal." / Yudhveer: "He will meet it now."
- **Why it fails:** the worthiness trope again. "The one who holds it" (it being Dwarka) is unclear. It repeats what
  the vanara already said, and the boy gets a trailer quip.
- **A (recommended):** "That will do. Take it up. Shalva has broken every gada brought against him. He has not met
  this one." (100, about 240.) **Cut** Yudhveer's line: he raises the mace and says nothing. That shot then needs a
  `duration` (about 2.5 s) in `src/game/stories/Island.ts`.
- **B:** "That will do. Go. The sea-king at Dwarka has broken every gada brought against him. Not this one." (97,
  about 233.)

### 7. `summit_end_guru_2`: the guru, slumped on the dais

- **Now:** "I live. He meant my soul for his god, and carried me all the way up the mountain to give it."
- **Why it fails:** the plot restated (the fourth time), and it sets up #2's explanation.
- **A (recommended):** "I live. He carried me every step of the way. It was good of him." (64, about 154.) Dry and warm.
  The irony is planted, not explained.
- **B:** "I live. An old man, carried all the way up a mountain. I have had worse journeys." (81, about 194.)

### 8. `prologue_end_guru_1`: the guru steps between them

- **Now:** "Leave the boy. It is me you came for."
- **Why it fails:** a stock film line ("It's me you want").
- **A (recommended):** "Leave him be. ... Keep your feet, Yudhveer." (43, about 103.) His last words to the boy are the
  lesson, so the summit's "You kept your feet" pays them off directly. He needs a beat to look back at the boy; check
  that against the new staging.
- **B:** "Not him." (8, about 19.) If the new staging has no room for the look back.

### 9. `dwarka_fall_shalva_3` and "To what end?": Shalva, fallen

- **Now:** Yudhveer: "To what end?" / Shalva: "Every soul he burns makes him greater. When the fire is high enough, he
  will stand against Shiva himself, and take his seat on Kailasha."
- **Why it fails:** a cue question, then exposition with stock grandeur ("Shiva himself").
- **A (recommended):** Yudhveer: "Why?" Shalva: "Each one he burns, he grows. When he is great enough, he means to climb
  Kailasha and sit in Shiva's seat." (105, about 252.)
- **B (more bitter):** "...he climbs Kailasha and sits in Shiva's seat. And kings like me kneel to him there." (136,
  about 326.)
- `dwarka_fall_shalva_2` and `_4` can stay. Once Andhaka's prologue line stops explaining, `_2` is the first time the
  player hears it.

### 10. `dwarka_open_shalva_2`: Shalva, the opening

- **Now:** "Far beyond your reach, and further every day. Beat me, and I will tell you why he was taken. Fail, and
  the sea can have you."
- **Why it fails:** a game-rules bargain in stock phrasing.
- **A (recommended):** "Out of your reach. You want to know why? Win it from me. Lose, and the sea takes you, as it
  took this city." (107, about 257.) A proud king, and bitter about the drowned city.
- **B:** "Where you cannot follow. If you want the why of it, take it from me. Kings do not give answers away."
  (100, about 240.)

### 11. `baoli_end_guardian_3` and `_4`: the freed Guardian

- **Now:** "Not with a lathi. It has carried you this far. It will not carry you further." / "Go to the Hanuman
  akhada. Let the vanaras teach you to truly fight. Then follow."
- **Why it fails:** a balanced aphorism, and "truly fight".
- **A (recommended):** "Not with a stick. What waits below will snap it, and you with it." (65, about 156.) / "Go to
  the Hanuman akhada. The vanaras will put a sword in your hand, and beat you until you can hold it." (104, about
  250.) The second sets up the vanara swatting him in the next chapter's opening.
- **B:** "Not with a lathi. It got you past me. It will not get you past them." (68, about 163.) / "Go to the
  Hanuman akhada. Learn the sword from the vanaras. Then follow." (72, about 173.)
- Yudhveer's "Then I will learn. And then I will follow." becomes "Then the akhada first." (subtitle).

### 12. `baoli_end_guardian_1`: the Guardian's shade rises

- **Now:** "The dark... it has let go of me."
- **Why it fails:** generic "freed from darkness".
- **A (recommended):** "The water... I can hear the water again." (40, about 96.) A well's keeper waking to its well:
  something you can picture.
- **B:** "The dark... it is gone out of the water." (40, about 96.)

### 13. `dwarka_end_takshaka_2` (`takshaka_prophecy`): the serpent king's prophecy

- **Now:** "You will not defeat him, boy... No. I was the fool. You were born to end his reign. Take my sword."
- **Why it fails:** "born to end his reign" is stock chosen-one phrasing, and he is the fourth character to say
  "boy".
- **A (recommended):** "You cannot beat him, manava... No. That is what I told myself, all those years on my knees. I
  was the fool. It is you. Take my sword." (133, about 319.) Ancient and tired: his despair was his own excuse.
  "Manava" (man, mortal) is what a naga would call him. The destiny beat stays in "It is you".
- **B (lightest touch):** "You will not defeat him, boy... No. I was the fool. You are the one who ends him. Take my
  sword." (96, about 230.)
- This is the user's own beat and the first line ever recorded. It is ranked lower for that reason.

### 14. `baoli_fight_guru_7`: the guru, the Guardian under 25 %

- **Now:** "It was not always this. Something dark binds it. Set it free."
- **Why it fails:** stock phrasing ("something dark binds", "set it free").
- **A (recommended):** "It is not fighting you, Yudhveer. Something is fighting through it." (67, about 161.)
- **B:** "Look at it, Yudhveer. That is not its own anger." (48, about 115.)

### 15. Yudhveer's vow and its echo (subtitles: free)

- **Now:** prologue "Guruji... I will find you. Even if I have to climb to the top of the world." / summit "I said I
  would find you. Even at the top of the world." / and before the raid, "Let them come."
- **Why it fails:** "the top of the world" is a modern idiom that winks at Kailasha. "Let them come." is action-hero
  bravado from a boy about to lose.
- **A (recommended):** prologue "Guruji... I will find you. Wherever he has taken you." / summit "I said I would find
  you." / before the raid, "I will, Guruji." (to "Keep your feet"). He promises to keep his feet, so the summit's "You
  kept your feet" answers his own promise.
- **B:** prologue "Guruji. I will bring you home." / summit "I said I would bring you home." That sets up Shiva's
  "Go home" (#3A) against a vow that cannot be kept the way he meant it.

---

## Further flags (lower priority)

| Id | Speaker, trigger | Now | Why | Proposal | Cost |
|---|---|---|---|---|---|
| `akhada_end_mentor_3` | Vanara, ending | "...Better than mine. A sword will not be enough." | spells out what "broken better blades" already says, and feeds the cue question | **Trim** the recording after "Better than mine." | free |
| (subtitle) | Yudhveer, akhada ending | "Then what will?" | cue question | "Then I need a mace." (the vanara's island line follows as it is) | free |
| `akhada_end_mentor_2` | Vanara, ending | "Not from me. Go to Dwarka, if you would know why your village burned." | "Not from me" reads oddly; "if you would know" is stock-archaic | A: "That I cannot tell you. Dwarka can tell you why your village burned." (68) B: "I do not know. But Dwarka knows why your village burned." (56) | about 163 |
| `akhada_train_mentor_4` | Vanara, parry taught | "Good. You can stand. Now the harder thing: do not wait for the blow. Meet it as it falls, and turn it." | long-winded mid-spar; repeats the dhal line's "meet... turn" | A: "Good. A wall can stand too. Now meet the blow as it falls, and turn it." (71) B: "Good. Now stop waiting for it. Meet the blow as it falls, and turn it." (70) | about 170 |
| `baoli_fight_guru_3` | Guru, under half health | "Breathe. Feet first. A man off his feet strikes nothing." | an aphorism on the end of a motif already said word for word in the prologue | **Trim** after "Feet first." (it is the remembered voice; the repetition is fair) | free |
| (subtitle) | Yudhveer, summit | "Guruji... you live." | stilted | "Guruji... you are alive." | free |
| `island_open_boatman_1` | Boatman, opening | "...Whatever is kept on this island, it keeps for itself." | a touch literary for a plain boatman; keep unless re-recording anyway | (keep) or "Here, and no further. I do not take my boat in under that rock." (63, about 151) | 0 |
| card, Ch. II `line` | chapter card | "The akhada asks one thing: whether you will stand." | the card announces the theme | "Learn the dhal, or learn the floor." / "Where the vanaras teach, and the teaching hurts." | free |
| card, Ch. III `line` | chapter card | "Something blessed is kept in the dark. Something keeps it." | the same shape as Ch. I's card | "A mace on an altar, under the sea-rock. The lamps are still lit." | free |
| card, Ch. V `line` | chapter card | "Under the eclipse, on Shiva's stair, a crown waits for the one who would wear it." | grand words with nothing behind them | "Under the eclipse, on Shiva's stair, the last fire is laid." (ties to Shalva's "last fire") | free |
| card, Ch. II `clearedLine` | chapter cleared | "The courtyard falls quiet." | "quiet" for the third time | "The old vanara nods. Once." | free |
| card, Ch. V `clearedLine` | chapter cleared | "The summit is silent." | the same | "Nothing on the mountain is laughing now." (his laugh) | free |
| epithets: Mayavi, Vetala, Yatudhana | name cards | "Deflect his spells back at him" / "Fast, and strikes in strings" / "Turn its fire back on it" | tutorial tips in the place of a name card's epithet | epithets "Weaver of false fire" / "The corpse-rider" / "Sorcerer of the rakshasas"; the tip moves to the callout's `sub` (a small code change) | free |
| epithet: Shalva | name card | "Raider of Dwarka" | fine; optional | "Lord of Saubha, raider of Dwarka" (in the Mahabharata, Shalva's flying city Saubha attacked Dwarka) | free |

**"Boy":** the vanara keeps it (it is his voice, along with "farmer"). Andhaka keeps "A boy with a stick" (Shiva's
last line turns it round). Takshaka's "manava" (#13A) and Shalva's rewritten opening drop two of the others.

**Feet:** with #8A, #15A and the trim of `baoli_fight_guru_3`, the motif runs: the first lesson; "keep your feet" and
his "I will"; the guru's last words; "Look at its feet" in the baoli; "You kept your feet" on the summit. The in-fight
"Breathe. Feet first." stays as a remembered voice.

## Kept as they are (the good ones)

- **Prologue:** `prologue_open_guru_1` ("...it is only a stick"), `_2` ("Once more, and then we eat": the warmest line
  in the game), `_3`, `prologue_fight_guru_1`, `_2`; "Like this, Guruji?", "Guruji!".
- **Chapter I:** `baoli_open_guru_1` ("Look at its feet"), `baoli_fight_guru_1`, `_2`, `_4` ("Now the lesson you would
  never sit still for": wry and fond), `_5`, `_6`, `baoli_end_guardian_2`; the boy's tracking and "Stand aside" lines.
- **Chapter II:** every vanara line not flagged above. The "farmer" thread ("You swing like a farmer" ... "for a
  farmer" ... "Not a farmer, then"), "You strike where I was, boy. Strike where I will be.", "One. Do not stand
  there admiring it.", "And keep the dhal up, boy." are the best character writing in the script.
  `akhada_train_mentor_1` ("A dhal is not for hiding") is an aphorism, but it is his only one, and it was the first
  line the user approved: keep.
- **Chapter III:** `island_open_boatman_2`, `_3` ("No one lights them, and they never go out"), `island_shrine_voice_1`,
  `_2`; the boy's walking thoughts ("Warm air, and ghee burning" is exactly right).
- **Chapter IV:** `dwarka_open_shalva_1` ("To a boy from a burned village"), `dwarka_fall_shalva_1`, `_2`, `_4`, `_5`;
  `dwarka_end_takshaka_1` ("and gods look away"); "Where is my guru?", "Then lift your gada.", "Rest, serpent king."
- **Chapter V:** `summit_end_guru_1`, `_3`, `_5`; "Mahadeva..."; the crowning line (option A, already up for approval
  in APPROVALS.md: no change proposed).
- Cards and callouts: the prologue's ("One more lesson before the light goes."), Chapter I's and Dwarka's lines, the
  horde cards ("Their king comes after."), the island callouts and "Not while its keepers stand.", the hints (plain
  instructions, as they should be).

## The scenes as they would read (recommended options)

**Prologue ending:** Andhaka: "A boy with a stick... Kneel. I did not come for scraps." / Guru: "Leave him be. ...
Keep your feet, Yudhveer." / "Guruji!" / "Guruji... I will find you. Wherever he has taken you."

**Island ending:** Voice: "Many reached for it. It knew what each of them wanted it for." / Yudhveer: "I want my guru
back." / (he lifts it) Voice: "That will do. Take it up. Shalva has broken every gada brought against him. He has not
met this one." / (he stands with it, silent, and walks out)

**Summit ending:** "Yudhveer." / "Guruji?" / "Guruji... you are alive." / "I live. He carried me every step of the
way. It was good of him." / "You kept your feet, Yudhveer." / "I said I would find you." / "Look up, Yudhveer." /
(light) Shiva: "Did you think I needed carrying, Yudhveer? I only wanted to see how far you would come." /
"Mahadeva..." / "Go home, Yudhveer. Somewhere there is a boy with a stick, and no one to teach him."

## On a yes

1. The user picks per line (A, B, keep), possibly by tier.
2. Change the texts in the story files, `Chapters.ts` and the epithets. Cut `summit_end_guru_4` and Yudhveer's "He will
   meet it now." (each of those shots gets a `duration`). Update STORY.md's line tables.
3. Trim `akhada_end_mentor_3` and `baoli_fight_guru_3` from take A (ffmpeg `atrim` at the pause, then loudnorm -18).
4. Record the picked voiced lines with the usual workflow (eleven_v3, the cast's voice ids, 2 takes, take A levelled
   to -18 LUFS). The old takes stay in `game asset/voice/takes/` for a rollback.
5. The prologue lines wait for the other helper's restaging to land.

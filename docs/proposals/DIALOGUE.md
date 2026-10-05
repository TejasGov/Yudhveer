# Dialogue pass: proposals (not applied)

The user's brief: "suggestions for current AI slop dialogues, they should have real gravity emotion and gameplay
value". Text only. Nothing here is in the game yet and no audio has been generated. Every voiced line waits for the
user's yes (about 1.2 ElevenLabs credits per character per take, 2 takes, so 2.4 credits per character).

This pass was made in three tiers. An auditor read every line in the game and proposed rewrites. A second agent
checked each quote against the code (all 113 entries matched, voiced flags included) and critiqued each rewrite. This
document is the edit of the two: one recommendation per line, at most one alternative.

**In numbers:** 113 entries reviewed (108 existing lines or line groups, about 150 texts once the grouped cards,
callouts and walking thoughts are counted, plus 5 proposed new fight lines). **Proposed for change: 39.** That breaks
down as 20 voiced recordings (17 rewrites of existing lines, 3 new fight lines), 4 free voiced changes (a cut, a trim,
two reuses of an existing take), 10 subtitles and 5 card or epithet texts. **Re-record cost: about 3,410 credits**
for everything recommended, or about 1,110 for Tier 1 alone (see the cost table).

**In the game now** (2026-10-05, after the audit's flow fixes): 96 spoken lines, 66 voiced (65 recordings, as
`prologue_fight_guru_2` is also the summit's low-health line) and Yudhveer's 30, subtitle only, plus Andhaka's
recorded laugh. The review above counted the game before Durga's three lines and Andhaka's crowning line were in it
(91 spoken then); its proposals stand as written. Applied since, all free: D-08's speaker label, D-36's epithet (the
alternative), D-126's reuse, and the code points under "What the lines rely on in code" (each marked there).

---

## Preface

### What changed since the last pass

- **Since then:** Durga's three lines were written and recorded (the user picked takes B, B, A). Andhaka's crowning
  line was approved and recorded. The prologue's ending was restaged (STORY.md, "The prologue's ending"). Yudhveer
  is subtitles only. All of these stay as they are.
- **Every quote is now verified** against the source and given as `file:line`. The old file reference
  `src/game/Story.ts` for the prologue is now `src/game/stories/Prologue.ts`.
- **Recommendations that changed:**
  - The guru's last words in the prologue are now "Leave the boy. I will come quietly." (it was "Keep your
    feet, Yudhveer."). That avoids a third "keep your feet" in one scene. It also plants the god who lets himself be
    carried, which the summit pays off.
  - Yudhveer's vow is now "I will bring you home" (it was option B), so Shiva's "Go home" closes it.
  - Shiva's first line keeps "Did you think I needed carrying?" but drops "I wanted to see how far you would come",
    which made the god sound as if he let the village burn as a test.
  - The shrine voice now answers the boatman's "No one lights them" and teaches what changes when you take the mace
    (no dhal, so slide; do not block).
  - Shalva's "Why?" exchange now answers "why *teachers*".
  - `baoli_fight_guru_3` reuses the prologue's recorded "Breathe. Feet first." instead of an ffmpeg trim.
- **New:** three short boss lines for moves the game never explains (Shalva's dive, Takshaka's flame at range,
  Andhaka's second phase). There is also a free reuse of "Breathe. Feet first." in the final fight, so the motif
  carries from Chapter I to its payoff.
- **Dropped or reversed:** "With a stick of bamboo?" stays (it answers Durga's first line and sets up her "Not
  alone."). The Chapter II card stays. No line for Takshaka's arrival. No new Chapter V cleared line (it could never be
  shown; as written, it now opens the credits). The epithet renames happen only if their tips move to the callout.

### Patterns to avoid

1. **Stating the plot.** It was explained four times: Andhaka in the prologue, Shalva, and the guru twice on the
   summit. The boy should learn it once, at Dwarka.
2. **Balanced aphorisms**, for example "Every lesson was mine to give. Every step was yours to take." One per
   character is a voice; six across the cast is a tic.
3. **Cue questions** that exist only to prompt the next line ("To what end?", "Then what will?"). Yudhveer should
   reason or feel; he should not interview people.
4. **Stock tropes:** the worthiness test ("if you do not lift it for yourself"), the chosen one ("born to end his
   reign"), the darkness ("Something dark binds it", "The dark is lifted").
5. **Grand words with nothing behind them**, for example "a crown waits for the one who would wear it". Prefer a
   thing the player can picture: the water, the lamps, the stick.
6. **One motif, worn out.** "Feet" now stays on its spine: the first lesson; "keep your feet" and the boy's "I will";
   "Look at its feet"; "Breathe. Feet first." as the low-health refrain in fights; "You kept your feet".
7. **A boss reciting his own tell like a tutorial.** A hint from a boss should come out as a boast.

### The voices

- **The guru / Shiva:** spare, warm, oblique; wry, because he is a god letting himself be carried.
- **Yudhveer:** young, few words, never eloquent; he says what he wants, not what the plot needs.
- **Durga:** tender and sure. She speaks to his grief, not to his destiny.
- **Andhaka:** crude and hungry; appetite, not exposition.
- **The Baoli Guardian:** old, slow, freed. It speaks of its well.
- **The vanara:** gruff, teasing, practical; "boy" and "farmer" are his.
- **The boatman:** plain and superstitious.
- **The voice in the shrine:** patient, old and sad; it has seen many die for the mace.
- **Shalva:** a proud, bitter sea-king who boasts.
- **Takshaka:** ancient and tired, ashamed of a hundred years on his knees.

### What the lines rely on in code (from the audit, not dialogue changes)

- **`baoli_fight_guru_7` can fire on the killing blow.** Gate it on the Guardian being alive. *Done (2026-10-05): no
  fight's line starts on the blow that ends it, and a line still playing stops at the victory.*
- **Durga promises "No evil will pierce it", but the kavach has no effect in play.** Fix the game, not the line:
  for example, it turns one killing blow per chapter with a gold flash. *Proposed as a small mechanic in
  docs/APPROVALS.md ("The kavach's promise"), waiting for your call; not built.*
- **Fight beats play in the in-head `voice` style, with reverb** (`src/ui/Dialogue.ts`). That suits the remembered
  guru. The three new boss lines are spoken aloud in the arena, so they need a dry style. *Done (2026-10-05): a beat
  can say `style: 'aloud'` (upright, above the HUD, dry); the `scene` style stays the cutscenes'.*
- **`Summit.ts` has no `beats` yet.** The two summit fight lines need a `beats` array: Andhaka's phase two and the
  hero's low health. *The low-health beat is in (D-126); Andhaka's phase two waits for its recording (D-125).*

---

## The scenes, in story order

In each "reads as" sequence, a **bold** line is changed or new. Costs are 2 takes at 2.4 credits per character, for
the text alone. Direction tags such as `[low, wry]` are billed too (about 15 characters a line).

### Prologue: the lesson and the raid

**Reads as:** Guru: "Again. Feet first, then the lathi. Swung from the arm alone, it is only a stick." /
Yudhveer: "Like this, Guruji?" / Guru: "Better. The sun is nearly down. Once more, and then we eat." / Guru: "Keep
your feet, Yudhveer. Whatever comes through that gate, keep your feet." / Yudhveer: **"I will, Guruji."** / (the
fight) Guru: "Do not chase them. Let them come to you." / (hurt) Guru: "Breathe. Feet first."

#### D-05 · Yudhveer · Prologue opening, shot 5 · `src/game/stories/Prologue.ts:353`
- **Now:** "Let them come."
- **Wrong:** action-hero bravado from a boy who is about to lose. It also pre-echoes the guru's "Let them come to
  you" six seconds later, so the guru seems to repeat the boy.
- **Recommended:** "I will, Guruji."
- **Or:** keep "Let them come." (the verifier reads it as bravado the defeat punishes).
- **Gameplay value:** a promise, so the summit's "You kept your feet" answers his own word.
- **Subtitle:** free.

### Prologue: the ending

**Reads as:** Andhaka (a shadow): **"A boy with a stick... Kneel. I did not come for scraps."** / the guru steps
between them: **"Leave the boy. I will come quietly."** / the laugh; the blade comes down anyway / black: "Guruji!" /
night, the dead and the mourners, the mandir's lamps: **"Guruji... I will bring you home."**

The guru offers himself and is struck down anyway, and the boy's vow is about a home that has just burned. Shalva's
answer at Dwarka becomes a real reveal.

#### D-08 · Andhaka · Prologue ending, shot 4 (carried over 4-6) · `src/game/stories/Prologue.ts:480`
- **Now:** "A boy with a stick... Your guru's soul will burn before my god. Kneel."
- **Wrong:** it gives away Dwarka's reveal in the first ten minutes, and it is an announcement where he should show
  appetite.
- **Recommended:** "A boy with a stick... Kneel. I did not come for scraps."
- **Or:** "A stick. Against me, a stick. Kneel, and you may keep it."
- **Gameplay value:** none (story). It keeps "A boy with a stick", which Shiva's last line turns round.
- **Speaker label (free, the user's call):** the subtitle names the hidden shadow "Andhaka". Showing no name keeps the
  mystery, and lets the Guardian say the name first (D-31). STORY.md's table names him, so this is a choice, not a fix.
  *Done (2026-10-05): captioned "A voice"; the recording and its text are unchanged.*
- **Voiced** (Andhaka, Roderich): 55 characters, about 132 credits.

#### D-09 · Guru · Prologue ending, shot 9 · `src/game/stories/Prologue.ts:566`
- **Now:** "Leave the boy. It is me you came for."
- **Wrong:** a stock film line ("It's me you want").
- **Recommended:** "Leave the boy. I will come quietly."
- **Or:** "Leave him be. ... Keep your feet, Yudhveer." (his last words become the lesson. It would be the third "keep your
  feet" in the prologue, and it needs him to look back at the boy, in shot 8 or at the start of shot 9.)
- **Gameplay value:** none (story). It plants the willing captive: "It was good of him" and "Did you think I needed
  carrying?" pay it off.
- **Voiced** (guru, Shivank S): 35 characters, about 84 credits. It fits shot 9 (about 4.5 s).

#### D-11 · Yudhveer · Prologue ending, shot 16 (the vow) · `src/game/stories/Prologue.ts:710`
- **Now:** "Guruji... I will find you. Even if I have to climb to the top of the world."
- **Wrong:** "the top of the world" is a modern idiom that winks at Kailasha.
- **Recommended:** "Guruji... I will bring you home."
- **Or:** "Wherever he has taken you, Guruji. I am coming."
- **Gameplay value:** none. It sets up the summit's "I said I would bring you home" and Shiva's "Go home". It must
  change together with D-101.
- **Subtitle:** free.

### Chapter I: the Devi and the stepwell

Chapter card (kept): "Something old keeps the water here."

**Reads as (no changes):** Durga: "You climbed to my door with a stick of bamboo, and a grief too heavy for it." /
"What they carried down this well, they will not keep. Follow it." / Yudhveer: "With a stick of bamboo?" / Durga:
"Not alone. Wear my kavach. No evil will pierce it. Go, my child. You have my blessing." / Yudhveer: "Their tracks
end at the water. There is a way down, under the well." / "Stand aside. They carried my guru through here." / Guru
(remembered): "Do not look at its size, Yudhveer. Look at its feet." / Yudhveer: "Feet first, Guruji."

Durga's three lines are kept as the user chose them. The review found nothing wrong in the words. The only gap is
the kavach's promise, which the game should honour (see "What the lines rely on in code").

### Chapter I: the fight with the Guardian

**Reads as:** (his first three-blow chain) "Good. Let each blow open the way for the next." / (it leaps) "Do not stand
under the great blows. Slide clear, then answer." / (under half health) **"Breathe. Feet first."** / (the charge
taught) "Now the lesson you would never sit still for." **"Be still. Breathe in and hold it. Then let it out in three
blows."** / (posture broken) "It reels. Now, Yudhveer!" / (Guardian under a quarter) **"It is not fighting you,
Yudhveer. Something is fighting through it."**

#### D-25 · Guru (remembered) · Chapter I fight, hero under 50 % · `src/game/stories/Baoli.ts:335`
- **Now:** "Breathe. Feet first. A man off his feet strikes nothing."
- **Wrong:** an aphorism tacked onto the motif.
- **Recommended:** "Breathe. Feet first.", pointing this beat at the existing `prologue_fight_guru_2` recording
  (2.08 s).
- **Gameplay value:** a calm cue at low health; the same words every time make it a refrain the player learns.
- **Voiced:** free (an existing take, no trim).

#### D-24 · Guru (remembered) · Chapter I fight, after D-23 (charge taught) · `src/game/stories/Baoli.ts:331`
- **Now:** "Stand, and gather your strength. Hold it until it is whole, then strike."
- **Wrong:** 8.8 s mid-fight. "Until it is whole" is abstract, and it never says the payoff.
- **Recommended:** "Be still. Breathe in and hold it. Then let it out in three blows."
- **Or:** "Stand still and gather it. Then spend it: three blows."
- **Gameplay value:** teaches the Shakti charge in his own image (breath): stand still, hold, three heavier blows.
- **Voiced** (guru): 65 characters, about 156 credits. Optional: the hint and the "Shakti" callout already say it.

#### D-29 · Guru (remembered) · Chapter I fight, Guardian under 25 % · `src/game/stories/Baoli.ts:349`
- **Now:** "It was not always this. Something dark binds it. Set it free."
- **Wrong:** stock phrasing ("something dark binds", "set it free").
- **Recommended:** "It is not fighting you, Yudhveer. Something is fighting through it."
- **Or:** "Look at its eyes. That is not its own anger."
- **Gameplay value:** makes the player see the boss as a victim just before the freed shade speaks. Gate it so it
  cannot fire on the killing blow.
- **Voiced** (guru): 67 characters, about 161 credits.

### Chapter I: the ending (the Guardian's shade)

**Reads as:** **"The water... I can hear the water again."** / "Andhaka bound me to this well, to turn back any who
followed his men below." / Yudhveer: **"Andhaka... They took my guru that way. I am going after him."** / **"Not with that
stick. What waits below will snap it, and you with it."** / **"Go up to the Hanuman akhada. The vanaras will put a
sword in your hand, and beat you until you can hold it."** / Yudhveer: **"The akhada, then."**

#### D-30 · Baoli Guardian · Chapter I ending, close on its shade · `src/game/stories/Baoli.ts:384`
- **Now:** "The dark... it has let go of me."
- **Wrong:** generic "freed from darkness".
- **Recommended:** "The water... I can hear the water again."
- **Or:** "The well is quiet. I had forgotten it could be quiet."
- **Gameplay value:** none (it tells you who the Guardian was, a well's keeper).
- **Voiced** (Guardian, Dhurv): 40 characters, about 96 credits.

#### D-31 / D-32 · Yudhveer · Chapter I ending, over the shade's shoulder · `src/game/stories/Baoli.ts:394`
- **Now:** "They took my guru that way. I am going after him." (no reaction to the name before it)
- **Wrong:** this is the first time the name is spoken, and the boy lets it pass.
- **Recommended:** "Andhaka... They took my guru that way. I am going after him." (one line, no new beat)
- **Or:** a separate subtitle "Andhaka." after `baoli_end_guardian_2` (a new line in the shot).
- **Gameplay value:** names the enemy the player will chase for four chapters.
- **Subtitle:** free.

#### D-33 · Baoli Guardian · Chapter I ending · `src/game/stories/Baoli.ts:403`
- **Now:** "Not with a lathi. It has carried you this far. It will not carry you further."
- **Wrong:** a balanced aphorism.
- **Recommended:** "Not with that stick. What waits below will snap it, and you with it."
- **Or:** "Not with a lathi. It got you past me. It will not get you past them."
- **Gameplay value:** a warning that the lathi is finished, and why the weapon changes next chapter.
- **Voiced** (Guardian): 68 characters, about 163 credits.

#### D-34 · Baoli Guardian · Chapter I ending · `src/game/stories/Baoli.ts:404`
- **Now:** "Go to the Hanuman akhada. Let the vanaras teach you to truly fight. Then follow."
- **Wrong:** "truly fight" is empty.
- **Recommended:** "Go up to the Hanuman akhada. The vanaras will put a sword in your hand, and beat you until you can
  hold it."
- **Or (cheaper):** "Go to the Hanuman akhada. Learn the sword from the vanaras. Then follow."
- **Gameplay value:** where to go next and what he will get (a sword). It sets up the vanara swatting him in the
  next opening, and leaves the dhal as the vanara's own surprise.
- **Voiced** (Guardian): 107 characters, about 257 credits (B: 72, about 173).

#### D-35 · Yudhveer · Chapter I ending, the shade sinks · `src/game/stories/Baoli.ts:414`
- **Now:** "Then I will learn. And then I will follow."
- **Wrong:** a balanced aphorism; a boy does not talk like this.
- **Recommended:** "The akhada, then."
- **Or:** "Then the akhada first."
- **Subtitle:** free.

#### D-36 · Epithet · the Guardian's name card · `src/entities/BossBaoli.ts:19`
- **Now:** "Asura of the stepwell"
- **Wrong:** it contradicts the story: the Guardian was the well's protector, bound by Andhaka.
- **Recommended:** "Bound keeper of the stepwell"
- **Or:** "Keeper of the stepwell"
- **Gameplay value:** foreshadows the guru's "Something is fighting through it".
- **Text:** free. *Done (2026-10-05) with the alternative, "Keeper of the stepwell" (the audit's pick); "Bound keeper"
  is one word away if you prefer it.*

### Chapter II: the akhada

Chapter card (kept): "The akhada asks one thing: whether you will stand." The review judged the proposed quip
("Learn the dhal, or learn the floor") glibber than the original.

**Reads as:** the opening, the drill, the arrival and the fight are unchanged. The one optional change is in the
drill: (three blocks) **"Good. A wall can stand too. Now meet the blow as it falls, and turn it."** / "Hah! There.
Again." / "Too soon, and you are only hiding. Wait for it... then meet it." This chapter has the best lines in the
script. The "farmer" thread and "Fire turns on a dhal like any blade. Send it back to him." stay.

#### D-45 · Vanara · Chapter II drill, three blocks (parry taught) · `src/game/stories/Akhada.ts:265`
- **Now:** "Good. You can stand. Now the harder thing: do not wait for the blow. Meet it as it falls, and turn it."
- **Wrong:** 11.4 s while he is attacking you; long-winded.
- **Recommended:** "Good. A wall can stand too. Now meet the blow as it falls, and turn it."
- **Or:** "Good. Now stop waiting for it. Meet the blow as it falls, and turn it."
- **Gameplay value:** teaches parry timing ("as it falls") in about 6 s instead of 11, in his teasing voice.
- **Voiced** (vanara, Rusty Malone): 71 characters, about 170 credits. Optional.

#### D-53 / D-94 · Epithets · Vetala, Mayavi, Yatudhana name cards · `src/entities/Vetala.ts:10`, `src/entities/Mayavi.ts:30`, `src/entities/Yatudhana.ts:34`
- **Now:** "Fast, and strikes in strings" / "Deflect his spells back at him" / "Turn its fire back on it"
- **Wrong:** tutorial tips in the place of a name, but they are the only place some of these mechanics are stated.
- **Recommended:** only if each tip moves to the callout's `sub` line (a small code change): "The corpse-rider" / "Weaver
  of false fire" / "Sorcerer of the rakshasas". Otherwise keep them as they are.
- **Gameplay value:** kept either way; the tip only moves.
- **Text:** free.

### Chapter II: the ending

**Reads as:** "Hm. Not a farmer, then." / Yudhveer: "Where did they take my guru?" / **"I do not know. But Dwarka
knows why your village burned."** / **"Shalva holds it now. His mace has broken better blades than yours. Better than
mine."** / Yudhveer: **"Then I need a mace."** / "Out past the city, on an island, a blessed mace lies waiting. Old
things keep it. Take it from them first. Then go to Shalva." / "And keep the dhal up, boy." / cleared:
**"The old vanara nods. Once."**

#### D-56 · Vanara · Chapter II ending · `src/game/stories/Akhada.ts:424`
- **Now:** "Not from me. Go to Dwarka, if you would know why your village burned."
- **Wrong:** "Not from me" reads as if he knows and will not say; "if you would know" is stock archaic.
- **Recommended:** "I do not know. But Dwarka knows why your village burned."
- **Or:** "That I cannot tell you. Dwarka can tell you why your village burned."
- **Gameplay value:** where to go (Dwarka), and why.
- **Voiced** (vanara): 56 characters, about 134 credits. Optional.

#### D-57 · Vanara · Chapter II ending · `src/game/stories/Akhada.ts:427`
- **Now:** "Shalva holds it now. His mace has broken better blades than yours. Better than mine. A sword will not
  be enough."
- **Wrong:** the last sentence spells out the one before it, and it only exists to prompt the cue question.
- **Recommended:** trim take A after "Better than mine." (ffmpeg `atrim` at the pause, then loudnorm -18). Change the
  subtitle to match.
- **Gameplay value:** still warns that Shalva's mace breaks swords.
- **Voiced:** free (a trim of the 10.16 s take).

#### D-58 · Yudhveer · Chapter II ending · `src/game/stories/Akhada.ts:445`
- **Now:** "Then what will?"
- **Wrong:** a cue question.
- **Recommended:** "Then I need a mace."
- **Or:** "Then I fight mace with mace."
- **Gameplay value:** the boy works out the next weapon himself; the vanara's island line follows as it is.
- **Subtitle:** free.

#### D-61 · Card · Chapter II cleared line · `src/game/Chapters.ts:82`
- **Now:** "The courtyard falls quiet."
- **Wrong:** this is the third cleared card that is "quiet".
- **Recommended:** "The old vanara nods. Once."
- **Text:** free.

### Chapter III: the island

**Chapter card, D-62** (`src/game/Chapters.ts:95`). **Now:** "Something blessed is kept in the dark. Something keeps
it." **Wrong:** the same shape as Chapter I's card. **Recommended:** **"A mace on an altar, under the sea-rock. The
lamps are still lit."** Free.

**Reads as (opening and walk unchanged):** Boatman: "This is as far as my boat goes. Whatever is kept on this
island, it keeps for itself." / Yudhveer: "They say a mace lies down there. A blessed one." / "They say it. Men have gone
down to fetch it. I have rowed them here, and I have rowed back alone." / "Then wait for me until the tide turns." /
"I will wait. Mind the lamps. No one lights them, and they never go out." / (walking) "Still burning. Who keeps these
lamps?" ... "Small, and many. So this is where the others ended." ... "Something moves in the water. Keep to the
stone." ... "Warm air, and ghee burning. The shrine is close." / Voice: "Many have come down for it. None has
carried it up." / "Come, then. Come and lift it, if you can."

### Chapter III: the ending (the altar)

**Reads as:** Voice: **"I kept these lamps lit for every one of them. What do you want it for?"** / Yudhveer: **"I
want my guru back."** / (he lifts it) Voice: **"That will do. It takes both hands: no dhal now. Do not meet Shalva's
blows. Go under them."** / (he raises the mace, silent; the shot holds about 2.5 s)

The lamps, set up by the boatman and wondered at by the boy, turn out to be the voice's vigil for the men who died
here.

#### D-71 · Voice in the shrine · Chapter III ending, before the altar · `src/game/stories/Island.ts:149`
- **Now:** "Lift it, if you do not lift it for yourself."
- **Wrong:** the worthiness test, an awkward conditional, and the third "lift" in a row.
- **Recommended:** "I kept these lamps lit for every one of them. What do you want it for?"
- **Or:** "Many reached for it. It knew what each of them wanted it for."
- **Gameplay value:** none (it answers the chapter's one mystery).
- **Voiced** (shrine voice, Shardul K): 70 characters, about 168 credits.

#### D-72 · Yudhveer · Chapter III ending, close on the mace · `src/game/stories/Island.ts:161`
- **Now:** "Not for myself. For my guru, and against the ones who took him."
- **Wrong:** a manifesto, not a boy.
- **Recommended:** "I want my guru back."
- **Or:** "To bring my guru home."
- **Subtitle:** free.

#### D-73 · Voice in the shrine · Chapter III ending, mace in hand · `src/game/stories/Island.ts:213`
- **Now:** "Then it will not grow heavy in your hands. Go to Dwarka. The one who holds it fights with a mace, and has
  not met its equal."
- **Wrong:** the worthiness trope again. "The one who holds it" (it being Dwarka) is unclear, and it repeats the
  vanara.
- **Recommended:** "That will do. It takes both hands: no dhal now. Do not meet Shalva's blows. Go under them."
- **Or:** "That will do. Take it up. Shalva has broken every gada brought against him. He has not met this one."
- **Gameplay value:** the only warning of the kit change: with the two-handed mace there is no block and no parry in
  Dwarka, so slide under the big blows.
- **Voiced** (shrine voice): 90 characters, about 216 credits.

#### D-74 · Yudhveer · Chapter III ending, close on him · `src/game/stories/Island.ts:228`
- **Now:** "He will meet it now."
- **Wrong:** a trailer quip.
- **Recommended:** cut. He raises the mace and says nothing; give the shot a fixed `duration` of about 2.5 s.
- **Subtitle:** free.

### Chapter IV: Dwarka, Shalva

Chapter card (kept): "The sea is taking the city back. Someone came to finish the work."

**Reads as:** Shalva: "So the island gave up its mace. To a boy from a burned village." / Yudhveer: "Where is my
guru?" / Shalva: **"Out of your reach. You want to know why? Win it from me. Lose, and the sea takes you, as it took
this city."** / Yudhveer: "Then lift your gada." / (the fight; his first dive) Shalva: **"Watch the water, boy. When it
boils, I am there."**

#### D-80 · Shalva · Chapter IV opening, up at Shalva · `src/game/stories/Dwarka.ts:188`
- **Now:** "Far beyond your reach, and further every day. Beat me, and I will tell you why he was taken. Fail, and the
  sea can have you."
- **Wrong:** a game-rules bargain in stock phrasing, 13.6 s long.
- **Recommended:** "Out of your reach. You want to know why? Win it from me. Lose, and the sea takes you, as it took this
  city."
- **Or (if D-122 is not built):** "Out of your reach. Beat me, and I will tell you why. And mind the water, boy: I come up
  where it boils." This carries the dive hint in the opening instead.
- **Gameplay value:** the stakes; the alternative also teaches the dive.
- **Voiced** (Shalva, Mani): 107 characters, about 257 credits.

#### D-122 (new) · Shalva · Chapter IV fight, his first dive · new beat in `src/game/stories/Dwarka.ts` (`beats`, line 219), a `when` on `BossShalva` going under
- **Now:** nothing. His signature move and its tell (the water boils where he will come up) are never hinted.
- **Recommended:** "Watch the water, boy. When it boils, I am there."
- **Or:** "The sea is mine, boy." (a bare taunt, no hint)
- **Gameplay value:** teaches the tell. Watch for the boil, then slide: his overhead smash lands 1 s after he
  surfaces. Once only, on the first dive.
- **Voiced, new** (Shalva): 48 characters, about 115 credits. Needs the dry `aloud` style (its beat's `style: 'aloud'`), not the in-head `voice`.

### Chapter IV: Shalva falls (his shade)

**Reads as:** "Enough. You have earned your answer, boy. Much good may it do you." / "Andhaka gathers souls. Wise
ones: sages, teachers, the ones a village listens to. He burns them before his god." / Yudhveer: **"Why
teachers?"** / **"A wise soul burns higher, and he grows on it. When he is great enough, he climbs Kailasha and takes
Shiva's seat."** / Yudhveer: "And my guru?" / "The wisest of them all, Andhaka says. He keeps him for the last fire,
on the summit." / "But you will not live to climb it. The serpent king does not let his prey leave this shore."

With Andhaka's prologue line no longer explaining, this is the first time the player hears the plan. "A wise soul
burns higher", then "And my guru?", then "The wisest of them all": the boy works out the danger one line before
Shalva says it.

#### D-84 · Yudhveer · Shalva falls, reverse · `src/game/stories/Dwarka.ts:277`
- **Now:** "To what end?"
- **Wrong:** a cue question in an archaic register.
- **Recommended:** "Why teachers?"
- **Or:** "Why?"
- **Subtitle:** free.

#### D-85 · Shalva (shade) · Shalva falls, low close · `src/game/stories/Dwarka.ts:287`
- **Now:** "Every soul he burns makes him greater. When the fire is high enough, he will stand against Shiva himself,
  and take his seat on Kailasha."
- **Wrong:** exposition with stock grandeur ("Shiva himself"), 14.3 s long.
- **Recommended:** "A wise soul burns higher, and he grows on it. When he is great enough, he climbs Kailasha and takes
  Shiva's seat."
- **Or (with "Why?"):** "Each one he burns, he grows. When he is great enough, he means to climb Kailasha and sit in Shiva's
  seat."
- **Gameplay value:** names the destination (Kailasha).
- **Voiced** (Shalva): 113 characters, about 271 credits.

### Chapter IV: Takshaka

Epithets (kept): "Raider of Dwarka", "King of the nagas".

**Reads as:** (the fight, phase two, his flame at range) Takshaka: **"Stand off from me, then, and burn."** / (the
ending, his shade) "A hundred years I kept the sea for him. I have watched kings kneel to Andhaka, and gods look
away." / **"You will not defeat him, boy... No. That is what I told myself, all those years on my knees. You will. Take
my sword."** / Yudhveer: "Rest, serpent king. I will carry it to the summit."

#### D-124 (new) · Takshaka · Chapter IV fight, phase two · new beat in `src/game/stories/Dwarka.ts` (`BossTakshaka.phase === 2`)
- **Now:** nothing. The flame waves he breathes at anyone who keeps away are never taught.
- **Recommended:** "Stand off from me, then, and burn."
- **Or:** "Keep your distance, manava. My fire is long."
- **Gameplay value:** tells the player that range is now the danger: close in.
- **Voiced, new** (Takshaka, Kundan): 34 characters, about 82 credits. Use the `aloud` style.

#### D-91 · Takshaka · Chapter IV ending, the prophecy and the gift · `src/game/stories/Dwarka.ts:388`
- **Now:** "You will not defeat him, boy... No. I was the fool. You were born to end his reign. Take my sword."
- **Wrong:** "born to end his reign" is stock chosen-one phrasing. But this is the user's own beat and the first line ever
  recorded, so this is a proposal only.
- **Recommended:** "You will not defeat him, boy... No. That is what I told myself, all those years on my knees. You will.
  Take my sword." The prophecy stays, as STORY.md asks. It now comes from his shame ("kings kneel" in the line before).
- **Or (lightest touch):** "You will not defeat him, boy... No. I was the fool. You are the one who ends him. Take my sword."
- **Gameplay value:** none (story; the sword is handed over).
- **Voiced** (Takshaka): 117 characters, about 281 credits (B: 96, about 230). Optional.

Not taken: a line for Takshaka's arrival (D-123). It would claim the island's unexplained naga roar, it needs a hook
in a generic arrival scene, and it adds little.

### Chapter V: the summit, the crowning and the fight

**Chapter card, D-93** (`src/game/Chapters.ts:123`). **Now:** "Under the eclipse, on Shiva's stair, a crown waits for
the one who would wear it." **Wrong:** grand words with nothing behind them. **Recommended:** **"Under the eclipse, on
Shiva's stair, the last fire is laid."** It ties to Shalva's "the last fire, on the summit". Free.

**Reads as:** the horde card (kept): "They cross the bridges. Their king comes after." / Andhaka, crowned: "Burn, Agni.
Let the gods see their new ruler." (kept, approved) / (his second phase) Andhaka: **"Good! Your guru taught you
something. I will thank him on the fire."** / (the hero badly hurt) Guru (remembered): **"Breathe. Feet first."**

#### D-125 (new) · Andhaka · Chapter V fight, phase two · new `beats` in `src/game/stories/Summit.ts` (`BossAndhaka.phase === 2`)
- **Now:** nothing but his laugh; the final boss is silent for the whole fight.
- **Recommended:** "Good! Your guru taught you something. I will thank him on the fire."
- **Or:** "Hold still, little goat. This will not take long."
- **Gameplay value:** marks the phase change (he swings sooner and turns faster) together with the roar, and puts
  the guru's life on the line in the fight itself.
- **Voiced, new** (Andhaka): 67 characters, about 161 credits. Use the `aloud` style.

#### D-126 (new use of an existing take) · Guru (remembered) · Chapter V fight, hero under 35 % · new `beats` in `src/game/stories/Summit.ts`
- **Now:** nothing. The feet motif drops out between Chapter I and its payoff.
- **Recommended:** "Breathe. Feet first." (voice `prologue_fight_guru_2`; `Voices.preload(storyVoices(...))` loads it)
- **Gameplay value:** calms the player at low health, and makes "You kept your feet" land a minute later.
- **Voiced:** free (the in-head `voice` style is right here). *Done (2026-10-05): in Andhaka's fight only, once (his
  arrival restores the hero's health, so a line spent on the waves would miss the fight that matters).*

### Chapter V: the ending and the reveal

**Reads as:** Guru (from the dais): "Yudhveer." / Yudhveer: "Guruji?" / **"Guruji... you are alive."** / **"I live. He
carried me every step of the way. It was good of him."** / "You kept your feet, Yudhveer." / Yudhveer: **"I said I
would bring you home."** / "Look up, Yudhveer." / (the light; the statue) Shiva: **"Did you think I needed carrying?
And still you came. All this way."** / Yudhveer: "Mahadeva..." / (the eclipse passes) Shiva: **"Go home, Yudhveer.
Somewhere there is a boy with a stick, and no one to teach him."**

Nothing is explained. "I will come quietly", "It was good of him" and "Did you think I needed carrying?" make one
thread, and the light shows the rest. The boy said he would bring his guru home, and the guru answers "Look up": he is
home. The last line turns Andhaka's sneer round: the boy with a stick becomes the teacher.

#### D-98 · Yudhveer · Chapter V ending, shot 4, kneeling beside him · `src/game/stories/Summit.ts:183`
- **Now:** "Guruji... you live."
- **Wrong:** stilted, and the guru's "I live" answers it word for word.
- **Recommended:** "Guruji... you are alive."
- **Subtitle:** free.

#### D-99 · Guru · Chapter V ending, shot 4 · `src/game/stories/Summit.ts:184`
- **Now:** "I live. He meant my soul for his god, and carried me all the way up the mountain to give it."
- **Wrong:** the plot restated for the fourth time.
- **Recommended:** "I live. He carried me every step of the way. It was good of him."
- **Or:** "I live. An old man, carried all the way up a mountain. I have had worse journeys."
- **Gameplay value:** none (story). It is dry and warm, and it plants the irony without explaining it.
- **Voiced** (guru): 64 characters, about 154 credits.

#### D-101 · Yudhveer · Chapter V ending, shot 5 · `src/game/stories/Summit.ts:206`
- **Now:** "I said I would find you. Even at the top of the world."
- **Wrong:** the same idiom as the vow. It must match D-11.
- **Recommended:** "I said I would bring you home."
- **Or (if the vow keeps "find"):** "I said I would find you."
- **Subtitle:** free.

#### D-102 · Guru · Chapter V ending, shot 6, before the light · `src/game/stories/Summit.ts:227`
- **Now:** "He gathered wise souls to throw down Mahadeva. He never asked whose soul he carried up the mountain."
- **Wrong:** it states the twist seconds before the light shows it.
- **Recommended:** cut. The shot keeps "Look up, Yudhveer." and needs a fixed `duration`.
- **Or:** "He climbed a long way to meet a god." (36 characters, about 86 credits)
- **Voiced:** free (a cut).

#### D-104 · Shiva · Chapter V ending, shot 9, the statue lit · `src/game/stories/Summit.ts:297`
- **Now:** "Every lesson was mine to give. Every step was yours to take."
- **Wrong:** a greeting-card aphorism at the game's most important moment.
- **Recommended:** "Did you think I needed carrying? And still you came. All this way."
- **Or:** "So. You climbed the whole mountain for one old man."
- **Why not the earlier "I wanted to see how far you would come":** it makes the god sound as if he let the village
  burn as a test. This version honours the boy's devotion, and the god keeps his mystery.
- **Gameplay value:** none (the reveal).
- **Voiced** (guru's voice, as Shiva): 66 characters, about 158 credits.

#### D-106 · Shiva · Chapter V ending, last shot, the eclipse passes · `src/game/stories/Summit.ts:343`
- **Now:** "The dark is lifted from the mountain. Go home, Yudhveer, and teach what you have learned."
- **Wrong:** stock words ("the dark is lifted"), and the moral said outright.
- **Recommended:** "Go home, Yudhveer. Somewhere there is a boy with a stick, and no one to teach him."
- **Or:** "The sun is coming back. Go home, Yudhveer. Light the fire. Then we eat." (an echo of the prologue's "then
  we eat")
- **Gameplay value:** none (it closes the story). It works only if D-08 keeps "A boy with a stick".
- **Voiced** (guru's voice): 82 characters, about 197 credits.

---

## Kept as they are

- **Prologue:** `prologue_open_guru_1`, `_2` ("Once more, and then we eat": the warmest line in the game, and the cost the raid
  takes), `_3`, `prologue_fight_guru_1` (teaches holding ground), `_2`; "Like this, Guruji?", "Guruji!". Card: "One
  more lesson before the light goes."
- **Chapter I:** Durga's three lines (the user's choice, recorded); "With a stick of bamboo?" (it doubts the path she
  names, and her "Not alone." answers it); "Their tracks end at the water..."; "Stand aside..."; `baoli_open_guru_1`
  ("Look at its feet": teaches reading its footwork); "Feet first, Guruji."; `baoli_fight_guru_1`, `_2` (teaches the
  slide), `_4` ("Now the lesson you would never sit still for": wry and fond), `_6` (teaches the posture punish);
  `baoli_end_guardian_2`. The card and its cleared line.
- **Chapter II:** every vanara line not listed above. The "farmer" thread ("You swing like a farmer" ... "for a
  farmer" ... "Not a farmer, then"); "You strike where I was, boy. Strike where I will be."; "Fire turns on a dhal like
  any blade. Send it back to him." (the best gameplay line in the game); "One. Do not stand there admiring it.";
  `akhada_end_mentor_4` (long, but it is the route); "And keep the dhal up, boy." `akhada_train_mentor_1` keeps its
  one aphorism; it was the first line the user approved. The card stays.
- **Chapter III:** the boatman's three lines; the boy's walking thoughts ("Warm air, and ghee burning" is exactly
  right); `island_shrine_voice_1`, `_2`; the callouts and "Not while its keepers stand."; the cleared and defeat
  lines.
- **Chapter IV:** `dwarka_open_shalva_1` ("To a boy from a burned village"); "Where is my guru?"; "Then lift your gada.";
  `dwarka_fall_shalva_1`, `_2`, `_4`, `_5` (it warns of the second boss); `dwarka_end_takshaka_1` ("and gods look
  away"); "And my guru?"; "Rest, serpent king."; the card; the epithets.
- **Chapter V:** Andhaka's crowning line (approved); `summit_end_guru_1`, `_3` ("You kept your feet": the payoff),
  `_5` ("Look up, Yudhveer."); "Guruji?"; "Mahadeva..."; the horde card; Andhaka's epithet "Crowned in the eclipse".
- **Throughout:** the combat callouts (Marma broken, Evaded, Posture broken, Deflected, Guard broken, Shakti,
  Learned) and the credits' close. The cleared and defeat lines that can never be shown (the prologue's, Chapter I's
  defeat, Chapter IV's defeat, Chapter V's cleared) need a code fix, not new words. *Done (2026-10-05): the prologue's
  cleared line is a caption over its night shot, Chapter V's opens the credits, the defeat lines sit under "<boss>
  still stands.", and the prologue's defeat line, which no one could see (he cannot fall there), is gone.*

---

## Cost

At 2.4 credits per character (2 takes at about 1.2), for the recommended text. Direction tags add about 15
characters a line (about 36 credits each, about 720 over all 20).

| Tier | Lines to record | Characters | Credits |
|---|---|---|---|
| 1. The spine: the prologue's end, the altar, the summit | `andhaka_prologue_kneel` (55), `prologue_end_guru_1` (35), `island_end_voice_1` (70), `island_end_voice_2` (90), `summit_end_guru_2` (64), `summit_reveal_shiva_1` (66), `summit_reveal_shiva_2` (82) | 462 | about 1,110 |
| 2. The Guardian and Shalva | `baoli_fight_guru_7` (67), `baoli_end_guardian_1` (40), `_3` (68), `_4` (107), `dwarka_open_shalva_2` (107), `dwarka_fall_shalva_3` (113) | 502 | about 1,205 |
| 3. New fight lines (each needs a small code hook, `aloud` style) | `dwarka_fight_shalva_1` (48), `dwarka_fight_takshaka_1` (34), `summit_fight_andhaka_1` (67) | 149 | about 360 |
| 4. Optional | `baoli_fight_guru_5` (65), `akhada_train_mentor_4` (71), `akhada_end_mentor_2` (56), `dwarka_end_takshaka_2` (117) | 309 | about 740 |
| **All 20** | | **1,422** | **about 3,410** (about 4,130 with tags) |

Free: the cut `summit_end_guru_4`, the trim of `akhada_end_mentor_3`, `baoli_fight_guru_3` pointed at
`prologue_fight_guru_2`, the summit's reuse of `prologue_fight_guru_2`, the cut of "He will meet it now.", every
subtitle, card and epithet, and Andhaka's speaker label. Tier 1 alone fixes the worst of it, and Tier 1 with the free
changes reads as a different story.

## On a yes

1. The user picks per line (recommended, the alternative, or keep), or by tier.
2. Record the picked voiced lines with the cast in `game asset/voice/VOICES.md` (eleven_v3; the guru and Shiva
   Shivank S, Andhaka Roderich, the Guardian Dhurv, the vanara Rusty Malone, the shrine voice Shardul K, Shalva Mani,
   Takshaka Kundan): 2 takes each, both kept in `game asset/voice/takes/` (`<id>_a`, `_b`), then the chosen take
   levelled to -18 LUFS (`ffmpeg -af loudnorm=I=-18:TP=-1.5:LRA=11 -b:a 128k`) into
   `Yudhveer/public/assets/voice/<id>.mp3`. The old takes stay for a rollback. Log the flows in VOICES.md and restart
   the dev server so it picks up the new audio.
3. The free audio: trim `akhada_end_mentor_3` after "Better than mine." (ffmpeg `atrim` at the pause, then loudnorm
   -18). Point `baoli_fight_guru_3`'s beat at `prologue_fight_guru_2`.
4. Change the texts in `src/game/stories/*.ts`, `src/game/Chapters.ts` and the epithets. Cut `summit_end_guru_4` and
   "He will meet it now." (each shot gets a `duration`). Add the new beats: Shalva's first dive and Takshaka's phase
   two in `Dwarka.ts`; Andhaka's phase two and the hero under 35 % in a new `beats` array in `Summit.ts`. The three
   boss lines use the `aloud` style.
5. Update STORY.md's line tables (Prologue, Chapter I to V lines), including the new ids and which take is in the
   game.

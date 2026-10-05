# Waiting for approval

Things that need the user's say-so before they go further: credit spends, downloads, new voice lines, and choices
between options. Each entry says what it is, what it costs, and what happens on a yes. Nothing here has been spent or
downloaded yet.

## Andhaka's crowning line (2026-10-05)

As the crown settles on his head the Agni beacon takes fire (docs/STORY.md, "Andhaka's model and entrance", shot 5).
He speaks one line there, tying the crown to the fire. It is in the game now as a subtitle only (`CROWNING_LINE` in
`src/cinematics/Intros.ts`, no `voice` id). The options, in his voice (Roderich, Crude & Ruthless,
`game asset/voice/VOICES.md`):

| | Line | Characters | To record (2 takes) |
|---|---|---|---|
| **A (picked, in the game)** | Burn, Agni. Let the gods see their king. | 40 | about 96 credits |
| B | Fire for the crown. Ash for the boy. | 36 | about 86 credits |
| C | Let it burn. Let Shiva see who sits on his mountain now. | 56 | about 134 credits |

Why A: he commands the fire god like a servant and lights the beacon as a proclamation to heaven. "Their king" is his
arrogance, and it sets up the ending, where Shiva himself answers. B is the cruelest and is aimed at the boy, but it
says less about the beacon. C names Shiva and so gives away the irony before the ending does.

Cost: about 1.2 ElevenLabs credits per character per take, 2 takes (the usual workflow: two takes, loudnorm to -18
LUFS). On a yes: record the chosen line as `summit_andhaka_crowned`, add `voice: 'summit_andhaka_crowned'` to
`CROWNING_LINE`, drop its `hold` (the recording sets the length), and list it in STORY.md's Chapter V lines.


# Yudhveer (युद्धवीर)

A sword-and-shield action game in the browser, a prologue and four chapters: a desert village at dusk, a moonlit stepwell, a Hanuman akhada, the sea city of Dwarka at sunset and the Kailasha summit under an eclipse. Three.js, Rapier physics, Vite and TypeScript, cel-shaded with ink lines.

Live build: https://yudhveer.onrender.com/

## Running it

```bash
npm install
npm run dev      # http://localhost:5199
npm run build    # type-check and build to dist/
npm run preview  # serve the production build
```

## Playing

The campaign runs from the prologue (a fight Yudhveer is meant to lose) through Chapter I to IV, and the prologue runs straight on into Chapter I. Each chapter opens with a short cutscene (hold Space or A to skip; in story scenes, tap it to read on to the next line). Clearing a chapter unlocks the next one; progress and settings are saved in the browser. Retrying after a defeat skips the cutscene.

| Action | Keyboard and mouse | Controller |
|---|---|---|
| Move / look | W A S D / mouse | Left stick / right stick |
| Sprint | Shift | L3 |
| Walk | C (toggle) | Push the stick lightly |
| Jump | Space | A |
| Attack (press again to chain three) | Left click | X or RB |
| Leaping strike | Attack while sprinting | Attack while sprinting |
| Slide (passes under blows and bolts) | F | B |
| Deflect (hold to guard) | Right click | LB or LT |
| Charge the next three blows | Hold Q | Hold Y or RT |
| Sheathe or draw | X | D-pad down |
| Pause | Esc | Start |

What Yudhveer carries and can do depends on the chapter (`src/game/Progression.ts`): the lathi, one blow at a time, in the prologue; the lathi with chained blows in Chapter I, a basic sword and the dhal in II, the blessed mace in two hands (no dhal) in III, the magical khanda and the dhal in IV. A move he has not earned yet (the guard, the deflect, the charge, the leaping strike) does nothing.

Swings turn toward the nearest enemy you are facing or steering toward and step in to reach it. Once a swing's blade has passed, the next blow, a slide or a deflect cuts its follow-through short. The slide is untouchable while low (about half a second) and carries you past an enemy.

Deflect as a blow lands (a 140 ms window) to throw the attacker off balance and damage its posture. A broken posture leaves it open: your blows land at 2.2x while it recovers.

## Chapters

| | Arena | Opponents |
|---|---|---|
| Prologue: The Last Lesson | `game asset/levels/00_village/` | Raiders through the village gate in waves; at the end, Andhaka seen only as a silhouette (a scripted loss) |
| I. The Moonlit Baoli | `game asset/levels/01_baoli/` | Baoli Guardian (boss, a 3.2 m horned demon with a talwar) |
| II. Hanuman Akhada | `game asset/levels/02_akhada/` | The Vetala (twin blades) and Mayavi (a sorcerer whose bolts can be deflected back) |
| III. Dwarka | `game asset/levels/03_dwarka/` | Shalva (boss, an asura raider with a spiked gada and a leap); when he falls, Takshaka, king of the nagas, comes for the city (final boss, two phases; fire breathed along the ground in the second) |
| IV. Kailasha Summit | `game asset/levels/04_summit/` | Six rakshasas run in over the bridges from the two outpost islands (three at a time); when the sixth falls, Andhaka, the asura of darkness, arrives on Shiva's dais: he smiles, crowns himself and draws his cleaver from the stone (final boss, two phases; light blows thrown into his swing glance off his hide, so strike after it lands) |

Dwarka keeps its authored PBR look (AgX, its own HDR sky, no cel shading or ink) and follows `game asset/levels/03_dwarka/BROWSER_NOTES.md` and `browser/scene-config.js`: the fight is a flat 10.8 m disc at y = 7.6 with walls on its rim, fighters start at x = -5 and +5, and the gameplay camera is the same follow camera as every other chapter. Its intro uses the cameras exported in the GLB.

Every character has its own model (`src/entities/characters/`); `game asset/README.md` has how each was rigged and built. A chapter's final boss (`FINALES` in `src/core/Engine.ts`) arrives with his own cutscene once everyone else has fallen.

## Code layout

| Folder | What lives there |
|---|---|
| `src/core` | `Engine` (fixed 60 Hz simulation, interpolated rendering, game flow: title, loading, intro, fight, pause, outcome), input (keyboard, mouse, gamepad), camera, physics, settings and saved progress |
| `src/game` | Chapter list and text, `Progression` (the hero's kit per chapter: weapon and allowed moves) and `Story` (each chapter's scenes and lines) |
| `src/cinematics` | `CinematicDirector` (camera shots along curves, cues, fades), the per-chapter intros, and `Scene` (story scenes and beats authored as data: see docs/STORY.md, "Milestone 3") |
| `src/ui` | HUD, cutscene overlay, subtitles and voices (`Dialogue`), menu navigation, key and button glyphs |
| `src/entities` | Player, enemies, bosses, the animation rig and character definitions |
| `src/combat` | Hit detection (swept blade against body capsule), combat rules, projectiles, particles, synthesized audio and music |
| `src/levels` | Arena loading (GLB, colliders from Blender custom properties) and each level's lighting and effects |

The page markup and styles are `index.html` and `src/style.css`.

## Source art

The Blender files, character models, Mixamo animation clips and weapon models behind `public/assets/` are kept outside this repo, in a `game asset` folder next to it, with the scripts that export them. Its README has the command that rebuilds each file.

## Development tools

In `npm run dev` builds (or any build with `?debug` in the URL for F3):

- **F3**: combat overlay (blades, hurt capsules, strike windows, the hit log).
- **Shift+0 / 1 / 2 / 3 / 4 / 5**: jump straight into a chapter's fight (0: the prologue).
- Console: `__debug.chapter(id, intro?)`, `__debug.shot(index, seconds)` to freeze a cutscene on a shot, `__debug.advance(seconds)`, `__debug.resume()`, `__debug.step(frames)` and `__debug.log()` for deterministic combat tests, `__debug.win()` to win the fight at once (and see the chapter's ending scene; in the prologue it brings on the scripted loss). `__yudhveer` is the engine.
- Balance and soak tools (docs/STORY.md, "Milestone 12"): `await __debug.playtest(chapters, runs, { skill: 'novice' | 'steady' | 'expert', seed, tune })` has a bot play each chapter's fight on the fixed step (seeded: a seed replays the same fight) and reports the win rate, time, damage taken and who dealt it; `__debug.playtestTrace(chapter)` is one fight blow by blow, `__debug.telegraphs()` the warning each enemy's blows give, `__debug.playtestFlow()` the whole campaign (intros, fights, endings, credits) with console errors hooked, `__debug.robustness()` the quit, retry, pause, frame-rate and resize checks, `__debug.perf(chapter)` and `__debug.perfScenes(chapter)` frame time, draw calls and triangles in a fight and in its cutscenes.

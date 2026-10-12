# Release notes: 2026-10-12

What changes for a player and for the host, compared with the live build (`main`, 0457244: the README's "Settings and voices"
state plus the Open Graph banner). A push of this branch to `main` redeploys Cloudflare Pages and Render.

## What is new

- **The duel** (docs/PVP.md). A Duel entry on the title: best of three in the Akhada, fists in round one and the khanda and
  dhal after. Practice against HeroBot works in any build. Online rooms (Create or Join by code) need a relay: a build with
  no `VITE_DUEL_RELAY` and nothing typed in the Relay field switches both buttons off and says "Online duels aren't
  available yet. Practice against HeroBot works." No relay is deployed by this release (`server/` and `npm run duel:relay`
  are the code for one). The duel's code (`DuelSession`, `Transport`, `Rules`, 33 kB) is fetched when a duel is first
  started, not with the campaign.
- **Chapter III's last fight**: the Spider Demoness with her chained, burning axe (held in her fist, full-arm IK, wrist, a
  braked catch), a rock seal with a Sri Yantra, and, once she falls, the released soul as an apsara: voiced (five lines),
  with her own music, walking to the seal and the altar (docs/ISLAND_DEMONESS.md). The first cave fights are unchanged.
- **Feel**: a pocket camera for tight spaces, a more tolerant `HitReact`, character-posed parts interpolated between steps.
- **Loading**: Chapter III's late-built shaders (the demoness's fire, the hidden seal, pool ripples, the shade's motes) are
  compiled under the loading screen instead of in the middle of the fight (`Engine.warmUp`).
- Page description now says five chapters and a duel (it said "three-chapter").

## Verification (all on this branch, Node 24.11, Chrome headless with a GPU, 1902x984)

| Check | Result |
|---|---|
| `npm run build` (asset-URL check, `tsc`, `vite build`) | passes; no warnings. Bundle: `rapier` 4,333 kB, `index` 764, `three` 733, `vendor` 150, `DuelSession` 29, `Transport` 3, `Rules` 0.6, css 19 |
| `node --experimental-vm-modules --test scripts/*.test.mjs` | 82 of 82 pass (duel, relay, island) |
| Production smoke (`npm run serve`, no `VITE_DUEL_RELAY`) | no console errors or warnings, no 4xx, 62 requests to the title and duel, 160 with the campaign's New game; title, Campaign, Chapters (6 listed, 5 locked on a fresh save), Duel menu with Create and Join disabled, practice against HeroBot loads and runs; New game loads and plays the prologue intro |
| `__debug.robustness()` (quit, retry, pause, frame rate, resize, menus) | 6 of 6 pass, 0 errors, 3 known warnings |
| `__debug.playtestFlow({ from: 0, to: 5, skip: true })` | all chapters through the credits, 0 problems, 0 errors; Dwarka cleared with 0 deaths in this run |
| Bot win rate, steady, 20 runs, seed 1 (release / main) | I 20/20 / 19/20; II 20/20 / 18/20; III 19/20 / 19/20 (different boss); V 17/20 / 7/20 |
| Chapter IV (Dwarka), steady, seeds 1 to 60 (release / main) | 19/60 (32 %) / 12/60 (20 %); expert, 30 runs: 8/30 / 10/30 |
| Mid-fight shader links in Chapter III, before and after the prewarm (three fresh pages each) | 41, 38, 39 before; 5, 10, 5 after |

**Chapter IV is not a regression.** The bot loses Dwarka often on `main` too: 12 wins in 60 steady runs on main against 19
in 60 here (one expert run of 30 each: 10 on main, 8 here, level within noise). The "4 deaths" in the last full flow was
that existing difficulty, not something the duel changed; the same flow's later run cleared Dwarka with none. The 83 % for
Chapter IV in docs/STORY.md was measured on an earlier tuning, and neither branch reproduces it now. It is a balance
question (a steady bot wins about a third of Dwarka fights), not a release blocker.

**What the prewarm does and does not fix.** It removes about 85 % of the shader links made after a fight begins (the Chapter
III fight went from about 39 to 5 to 10). The 5 that remain are the demoness's own entrance (about 20 to 33 ms in the
frame, in the cutscene that introduces her). The hitches that remain in that fight are the waves' first textures
(+10 and +12 textures, 40 to 60 ms), which the prewarm does not touch.

## Things to know

- Third-party licence of the three user-supplied spider meshes (`spider demon.glb`, `human form of spider.glb`,
  `spider chain axe.glb`) is not on record (docs/ASSET_CREDITS.md says so). They ship in the build.
- Online duel is untested on a real network and in Cloudflare (docs/PVP.md); the client is trusted for its own defence.
- Chrome-only testing; Firefox and Safari were not run.

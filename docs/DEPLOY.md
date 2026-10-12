# Deploying Yudhveer

Written for milestone 13 (2026-10-06) and checked against the release build on 2026-10-12. **The game is live**: Cloudflare
Pages (`https://yudhveer.pages.dev/`) and Render (`https://yudhveer.onrender.com/`) both rebuild on every push to `main`, so
a push is a deploy (docs/RELEASE_NOTES.md lists what the latest one changed). The campaign is static files: no server code,
no database, no cookies (progress and settings are in the browser's `localStorage`). The one exception is the optional online
duel, which meets through a relay; a build with no `VITE_DUEL_RELAY` has online rooms switched off and everything else works.
The sections below that describe milestone 13's measurements are kept as they were measured (the sizes have grown since:
see "The bundle today").

## The bundle today (2026-10-12, release build)

`npm run build` (Node 24.11 here; Cloudflare's `NODE_VERSION=22` meets Vite 8's `^20.19 || >=22.12`): `dist/` holds 227
files, 149.7 MB of them from `public/assets` (215 files; the largest is `charnel_ridge.glb`, 12.6 MB, against Cloudflare
Pages' 25 MiB per file and 20,000 files). The bundle is eight hashed files: `rapier` 4,333 kB, `index` 764, `three` 733,
`vendor` 150, `DuelSession` 29, `Transport` 3, `Rules` 0.6 and the stylesheet 19; the duel's three small chunks load
only when the Duel menu is used.

## What a build is

- `npm run build` (the default, base `/`): `dist/` holds `index.html`, the bundle in `dist/assets/` (hashed files, listed above;
  milestone 13 measured five, 5.77 MB) and a copy of `public/` (the models, sounds and skies in `dist/assets/<folder>/`;
  138.6 MB in 174 files at milestone 13) plus `_headers`.
- **Every address the game asks for goes through `asset()`** (`src/core/Assets.ts`), built from Vite's `base`. The base is
  the one thing that changes between hosts: `/` (a host with a domain of its own, and `npm run dev`), `/Yudhveer/`
  (GitHub Pages: a project site lives under its repository's name) or `./` (the itch.io zip, which can be unpacked
  anywhere). Set it with `vite build --base=...`, with `YUDHVEER_BASE=...`, or use the scripts below. Nothing in `src` asks
  for `/assets/...` any more, and `npm run build` fails if a new line does (`scripts/check-asset-urls.mjs`).
- **Files carry a version**: a build asks for `<file>?v=<first ten hex digits of the hash of its bytes>`
  (`virtual:asset-versions`, `vite.config.ts`). The files in `public/` are not renamed by the build the way the bundle's
  scripts are, so this is what lets a host cache `/assets/` for a year (`public/_headers`) and still serve a file that
  changed: it is a new address. Under `npm run dev` there is no version.
- **The physics engine is inside the bundle.** Rapier's compat build carries its WebAssembly as base64 inside
  `rapier-<hash>.js`: there is no `.wasm` file, so there is no `application/wasm` type to configure and nothing for a
  host to get wrong. It does need WebAssembly to be allowed: a strict Content-Security-Policy must include
  `'wasm-unsafe-eval'` in `script-src`, or the game stops at "Your browser could not start the physics engine".
  `three` and the game's code are plain scripts. No host here sets a CSP by default.
- **Fonts come from Google Fonts** (the stylesheet link in `index.html`: Alegreya Sans, Cormorant Garamond and Tiro
  Devanagari Hindi, with system fonts as fallbacks). Offline, or where Google is blocked, the text falls back to Segoe UI,
  Georgia and Nirmala; nothing waits on it. Self-hosting them is a download, so it was not done.
- A sub-path or a relative base needs no `404.html`, redirects or rewrites: there is one page.

## What it costs to download

Measured on the production build (`scripts/serve-dist.mjs` logs every request; one fresh page per chapter, the chapter
started from the title's Chapters menu, its intro skipped and a few seconds played; MB are 10^6 bytes; "alone" is that
chapter's own files after the title screen's, "new" is what the chapter adds in play order, to what the chapters before
it already fetched). Compression is the host's: nothing here is precompressed.

| | Before milestone 13 | After | What it is (after) |
|---|---|---|---|
| **The title screen** (before anything is clicked) | 33.75 | **28.74** | the bundle 5.77; the Baoli arena 12.34 (the title stands in it); the hero in both looks, 6.21 + 2.91 (a rig for the Devi's blessing is loaded before the title can show); skies 1.20; manifests 0.30 |
| **First click** (36 recorded effects, the title music) | 2.09 | 2.09 | sfx 1.13, music 0.96 |
| 0 Prologue | 25.42 alone, +25.42 new | 21.98, +21.98 | the village 3.80; **Andhaka 8.70 and his cleaver 0.72, for a silhouette in the last scene**; the guru 2.41; the raiders 1.75 and talwar 0.41; the three villagers 2.34; music 0.96; voices 0.60 |
| I Baoli | 10.86, +8.22 | 10.64, +8.22 | the Guardian 4.01 and his talwar 0.78; music 1.92 (the boss theme too); voices 1.46 |
| II Akhada | 27.09, +27.09 | 23.45, +23.45 | the arena 10.36; the vanara 3.39, Vetala 2.48, Mayavi 1.64; weapons 2.90; music 0.96; voices 1.66 |
| III Island | 15.01, +13.96 | 14.16, +13.11 | the caves 7.96; hurler 1.75, runt 0.93; the mace 0.54; music 0.96; voices 0.92 |
| IV Dwarka | 27.96, +26.46 | 25.24, +23.75 | the arena 11.03; **the sky 1.87 (was 4.13)**; Takshaka 3.93, Shalva 3.64; music 0.96; voices 1.58 |
| V Summit | 36.00, +23.21 | 34.11, +21.55 | the ridge 12.64; sky 0.99; the yatudhana 1.97, rakshasa 1.60; the crown 0.94; music 1.92; voices 0.72 |
| **First visit, through the summit** | **160.20** | **142.88** | running total after each chapter: 52.8, 61.0, 84.5, 97.6, 121.3, 142.9 |

All of `public/assets` is 155.83 MB in the repository before milestone 13 and 138.56 MB now (-17.3 MB, -11 %); the
campaign, played through, fetches nearly all of it.

If the host compresses JavaScript the bundle is **2.05 MB gzipped, 1.54 MB brotli** (rapier alone 1.64 and 1.20): check
the Network tab for the *transferred* size of `rapier-*.js` on your host. GitHub Pages, Netlify and Cloudflare do. Models
and sounds are already compressed formats; a gzip of a model saves 15 to 20 % at best and most hosts do not apply it
to `.glb`.

**What the title costs is a design call, not a size problem.** 28.7 MB must arrive before the player sees a button, and
two thirds of it is not what the first chapter needs: the Baoli arena (12.3 MB) is the title's backdrop
(`TITLE_CHAPTER = 1`, `src/core/Engine.ts`), and the hero's divya kavach look (6.2 MB) is loaded with it because Chapter I
changes his clothes (`Player.equip`: `becomes`). Starting from the title with the prologue the player needs the village
(3.8 MB), not the Baoli. Options, none done (they change what the game loads when, not what it looks like): the title
stands in the village (-8.5 MB on the title, and Baoli loads when Chapter I does); the second look loads in the
background once the title is up (-6.2 MB); the prologue's Andhaka (9.4 MB for a silhouette) loads while the fight is
played. Together the title would be about 14 MB.

## What was done to make it smaller

Everything below is lossless or exact unless it says otherwise, and was checked against the file it replaced. Commands are
in `game asset/README.md` too.

| What | Before | After |
|---|---|---|
| The 14 characters that are not bosses (the hero twice, the guru, the villagers, the vanara, Vetala, Mayavi, the raiders, rakshasas, yatudhana, runts, hurlers) | 41.63 MB | 29.39 MB (-29 %) |
| The six arenas | 60.68 MB | 58.13 MB (-4 %) |
| Dwarka's sunset sky (a Radiance HDR) and Baoli's 1k sky, as half-float OpenEXR | 4.13 + 0.84 MB | 1.87 + 0.57 MB |
| The weapons | 7.64 MB | 7.62 MB |
| The four bosses' models, Andhaka, the Baoli Guardian, Shalva, Takshaka | 20.29 MB | not touched; **17.65 MB** when `npm run pack:glb` is run on them (a dry run), after the boss work lands |

- **The characters were already meshopt and WebP compressed like the levels.** What was left was the file's own index:
  Blender writes one buffer view and one accessor for every keyframe track of every clip (the hero's 86 clips have 6,635
  views), and each is 200 bytes of JSON read before the first frame: the hero's JSON chunk was 2.63 MB of his 8.58, the
  Vetala's 1.72 of 4.01. `scripts/pack-glb.mjs` (`npm run pack:glb -- <files>`) joins them, by kind, into 11 buffer
  views and writes the vertex streams in meshopt codec version 1 (about 8 % smaller; three's bundled decoder reads
  both). Hero 8.58 > 6.21 MB, his training look 4.80 > 2.91, Vetala 4.01 > 2.48, Mayavi 2.86 > 1.64, the villagers 5.07 >
  2.34. No value changes: the tool compares every animation track and mesh attribute with the file it came from before
  it writes, three's own `GLTFLoader` was run on all 32 files before and after (every node transform, light, camera,
  attribute, index, material and track equal to the bit), and the hero in both looks, and the first frame of every
  chapter, render pixel for pixel the same (`game asset/audit/fixes/m13-release/`). Run it again after rebuilding any model
  (`game asset/characters/build_character.py` and the level exporters write the larger form); running it twice changes
  nothing.
- **The skies**: a Radiance file's 8-bit mantissas are exact in a half float, and the HDR loader produced half floats
  anyway, so OpenEXR with the lossless ZIP codec gives the same texture at half the size (`game asset/levels/hdr_to_exr.py`,
  Blender). The game reads them with `EXRLoader` (three chunk +29 KB). Dwarka's four sky views before and after differ
  only where the rain moved. A lossy DWAA file of the Dwarka sky is 0.92 MB at 62 dB (a mean error of 0.3 % of
  brightness): another 0.95 MB if wanted.
- **Not done, with what they would save** (each is a change to what the player sees or hears, so each is yours to call):
  skin weights and UVs as 16-bit integers (the hero 6.21 > about 5.4 MB, error 2x10^-5 and 0.016 of a texel; about 3 MB
  over the 14 characters); the level textures at WebP quality 80 instead of 88 (-17 % of 24 MB of them, 40 dB against
  the originals); the voice lines at 64 kbps (they are 128 kbps mono, 7.0 MB: -3.5 MB); the title and prologue loads
  above. The music loops are 128 kbps stereo (9.85 MB) with sample-exact loop points: left alone. Rapier's 4.33 MB is
  base64 of a 3.25 MB module; a binary file needs a bundler plugin (a new package).

## Hosts

| | GitHub Pages | Netlify / Cloudflare Pages | itch.io | Render (the current one) |
|---|---|---|---|---|
| Address | `https://tejasgov.github.io/Yudhveer/` | its own domain (or yours) | `<you>.itch.io/<game>` | `yudhveer.onrender.com` |
| Build | `build:pages` (base `/Yudhveer/`), by the manual workflow | `npm run build` (base `/`) | `npm run build:itch` (base `./`, a zip) | `npm ci && npm run build`, publish `dist` |
| Cache headers | none to set (`max-age=600`); `?v=` keeps what is cached correct | `public/_headers`: a year, immutable, for `/assets/*`; `index.html` always asked | not yours to set | add the `_headers` rules in the dashboard |
| Limits to check | 1 GB site, a soft 100 GB a month of bandwidth (about 650 complete first visits of 150 MB) | Cloudflare: 25 MiB a file (the largest is 12.6 MB), bandwidth free; Netlify: its bandwidth allowance | 1000 files, a zip of up to 1 GB, 240 characters of path (this one: 226 files, 151 MB zipped, 46 characters) | the plan's bandwidth |
| Good for | free, in the repository, nothing else to sign up for | the best second visit (cached for a year), global CDN | people who find games there | already running |

### GitHub Pages (a manual workflow, never on push)

`.github/workflows/pages.yml` has only `workflow_dispatch`. It runs `npm ci` and `npm run build:pages` and deploys `dist/`.

1. Merge the branch (a workflow appears in the Actions tab only once it is on the default branch).
2. Repository **Settings > Pages > Build and deployment > Source: "GitHub Actions"**. (A private repository needs a paid
   plan for Pages.)
3. **Actions > "Deploy to GitHub Pages (by hand)" > Run workflow**, on `main`. The first run creates the `github-pages`
   environment; its default rule lets the default branch deploy.
4. The address is on the run's summary: `https://tejasgov.github.io/Yudhveer/`.

Caveats: if the repository is renamed, change `/Yudhveer/` in `package.json` (`build:pages`). `public/_headers` is
published as a plain file there and does nothing. The deploy uploads about 150 MB each time.

### Netlify or Cloudflare Pages

Connect the repository; build command `npm run build`, publish directory `dist`; set `NODE_VERSION` to `22`. Both read
`dist/_headers` (copied from `public/_headers`) with no further setting: `/assets/*` is cached for a year as immutable, the
page is revalidated every time. Do not widen that rule to a folder whose files the game asks for without `?v=`.

### itch.io

`npm run build:itch` builds with base `./` into `dist-itch/` and writes `yudhveer-itch.zip` (index.html at the top;
`_headers` left out; written with no tools but Node, so it also works in CI). Upload it as an HTML project ("This file will
be played in the browser"), a viewport of 1280 x 720 with the fullscreen button, and mark it **not** mobile friendly
(keyboard and mouse, or a controller). The game runs in an iframe: use itch.io's draft page to try pointer lock, fullscreen
and a controller before you publish. Saves are in the browser per game page, so a player's progress does not move between
hosts.

### Trying a build the way a host serves it

```bash
npm run build:pages
node scripts/serve-dist.mjs --dir dist --mount /Yudhveer/ --port 5253     # open http://localhost:5253/Yudhveer/
npm run build:itch
node scripts/serve-dist.mjs --dir dist-itch --mount /any/folder/ --port 5254
```

The server only answers under its `--mount` (anything else is a 404, as on GitHub Pages), keeps every request, and
`GET <mount>__requests` returns them as JSON (`?reset=1` clears them); `--gzip` compresses the text types as hosts do and
`--timer-raf` keeps the game's loop running in a tab nobody can see. In Git Bash, set `MSYS_NO_PATHCONV=1` before a
command that passes `/Yudhveer/`, or Git Bash rewrites it to a Windows path (the npm scripts are not affected).

## What the production smoke test found (2026-10-06)

Both builds, each chapter 0 to 5 started from the title's Chapters menu, its intro skipped by holding Space, and a few
seconds played (run, sprint, jump, slide), in the Browser pane with the page's own loop: **no console error or warning
except "Pointer lock refused"** (the pane gives the page no gesture); no failed request but `/favicon.ico` (the pane asks
for it at the root whatever the page's data: icon says; a normal browser does not, and on a sub-path it would be the
domain's, not the game's); no request outside the base; no request for a file without its `?v=`. 110 audio files were
asked for (9 music tracks, 36 effects, 65 voice lines, after a click) and every one decodes. The relative build was
served from `/games/yudhveer-test/` and went through all six chapters in one session with Quit to title between them.

## Before you publish

- [ ] A host is chosen (docs/APPROVALS.md, "Milestone 13").
- [ ] `npm run build` is clean, and the host's own address is tried once with the Network tab open (no 404, `rapier-*.js`
  compressed).
- [ ] The four boss models have had `npm run pack:glb` run on them once the boss work has landed.
- [ ] Nothing from `docs/` is meant to be public: `dist/` holds `public/` and the bundle only.

## Duel relay (Cloudflare Worker + Durable Object)

Prepared 2026-10-12 on branch `duel-cloud`; **not deployed**. Online duels meet through a relay; the static site cannot
be one. The relay is the Worker `yudhveer-duel` (`server/duel-worker.mjs`) with one `DuelRoomObject` Durable Object per
six-character room code. It runs the same room code as the Node dev relay (`server/DuelRoom.mjs`). `server/` is its own
small `cf` project: `server/cloudflare.config.ts` (cf's config format, no Wrangler file), `server/vite.config.ts` (the
Cloudflare Vite plugin, which `cf build`/`cf dev` drive) and `server/package.json`. The game's own build at the repository
root never looks at it, and Pages and Render do not install it.

| What | Value |
| --- | --- |
| Worker | `yudhveer-duel`, compatibility date 2026-10-01, no flags needed |
| Durable Object | binding `DUEL_ROOMS` → class `DuelRoomObject`, SQLite-backed (the only kind the Free plan has). cf has no migrations list: the live `exports.durableObject({ storage: "sqlite" })` entry is what creates the class on the first deploy (Wrangler's `new_sqlite_classes`). The room stores nothing. |
| Allowed pages | `ALLOWED_ORIGINS` in `server/cloudflare.config.ts`: `https://yudhveer.pages.dev`, `https://*.yudhveer.pages.dev` (preview builds), `https://yudhveer.onrender.com`, `http://localhost:*`, `http://127.0.0.1:*`. `*` is one host label or a port. Change it there and `cf deploy` again. |
| Address | `https://yudhveer-duel.socra.workers.dev`; the game wants **`wss://yudhveer-duel.socra.workers.dev`** (`socra` is this account's workers.dev subdomain; `cf deploy` prints the address) |
| Refuses | not a WebSocket upgrade: 426; a page not on the list or no `Origin`: 403; a room code that is not six of A-Z/0-9: 400; joining a code nobody created: "Room not found"; a third player: "Room is full"; a message over 4 KiB or binary: that player is disconnected (1009) |
| Ends a room | a player leaving (the other is told), two seconds without simulation progress or without delivery receipts in a fight, more than 120 messages a second, and **10 minutes without a message** (a lobby nobody joins, a results screen left open) |

### Deploying it

Run these from the repository root of a checkout that has `server/cloudflare.config.ts` (Git Bash; in PowerShell the
quoting of the `--body` JSON differs: use `--body (Get-Content body.json -Raw)`).

1. **Tools and login.** `cf --version` (1.0.0-beta.12 or newer; `npm install -g cf` if missing), then `cf auth whoami`:
   it must say `"authenticated": true` with your one account (if not, `cf auth login`). Then `cd server && npm ci`
   (Vite and the Cloudflare plugin for this folder only; about 55 packages).
2. **Optional, locally first.** In `server/`: `npm run dev` (that is `cf dev`: the Worker and its Durable Object in
   local workerd at `http://localhost:5173`, no account involved). In another terminal at the repository root:

   ```bash
   DUEL_RELAY_URL=ws://localhost:5173 node --experimental-vm-modules --test scripts/duel-*.test.mjs
   ```

   44 tests should pass (without `DUEL_RELAY_URL` the 5 Worker tests are skipped and 39 pass).
3. **Check, then deploy.** In `server/`:

   ```bash
   cf deploy --dry-run   # builds and lists env.DUEL_ROOMS (Durable Object) and env.ALLOWED_ORIGINS; uploads nothing
   cf deploy             # creates yudhveer-duel and its DuelRoomObject namespace, prints the workers.dev address
   ```
4. **Verify it answers.**

   ```bash
   curl -i https://yudhveer-duel.socra.workers.dev/                      # HTTP 426, "WebSocket required"
   curl -i -H "Upgrade: websocket" -H "Origin: https://evil.example" "https://yudhveer-duel.socra.workers.dev/?room=ABC123"   # 403
   DUEL_RELAY_URL=wss://yudhveer-duel.socra.workers.dev DUEL_RELAY_ORIGIN=https://yudhveer.pages.dev \
     node --experimental-vm-modules --test scripts/duel-network.test.mjs scripts/duel-worker.test.mjs
   ```

   The last line plays three short scripted matches and the Worker checks through the live relay (8 tests; a few hundred
   of the day's 100,000 free Durable Object requests). If only the gate test fails, with 426 where it expects 403 or 400,
   Cloudflare's edge did not pass its bare `Upgrade` header on; browsers are unaffected (the curl lines above check the
   same thing).
5. **Point the game at it.** `VITE_DUEL_RELAY` is read when Vite **builds**, so it is a build variable of the Pages
   project, not of the Worker:

   ```bash
   cf pages edit yudhveer --body '{"deployment_configs":{"production":{"env_vars":{"VITE_DUEL_RELAY":{"type":"plain_text","value":"wss://yudhveer-duel.socra.workers.dev"}}}}}'
   cf pages get yudhveer    # deployment_configs.production.env_vars now lists NODE_VERSION and VITE_DUEL_RELAY
   ```

   Existing variables are kept (a key set to `null` is deleted). Add `--dry-run` to see the request first. In the
   dashboard: **Workers & Pages > yudhveer > Settings > Variables and Secrets > Production > Add**, type Text, name
   `VITE_DUEL_RELAY`, value `wss://yudhveer-duel.socra.workers.dev`, Save. Do the same under Preview if preview builds
   should play online too (their `*.yudhveer.pages.dev` origins are already allowed).
6. **Rebuild the site.** The variable applies to the next build only. If the duel mode is not on `main` yet, the push
   that brings it there builds with the variable (and also deploys Render). If it is already there, rebuild `main`:
   `cf pages deployments create yudhveer --branch main`, or the dashboard's **Deployments > (latest) > Retry deployment**.
7. **Two browsers.** Open `https://yudhveer.pages.dev` in two browsers (best on two machines or networks). Duel: the
   Relay field shows `wss://yudhveer-duel.socra.workers.dev` and Create/Join are enabled. Create in one, join the code in
   the other, play the three rounds and a rematch, then close one tab: the other says Opponent disconnected. The Worker's
   logs are in the dashboard (**Workers & Pages > yudhveer-duel > Logs**; observability is on).
8. **Render** builds without the variable, so there the duel menu says no relay is set and Create/Join stay off;
   Practice works. To turn it on there, add `VITE_DUEL_RELAY` with the same value in Render's Environment settings and
   redeploy; `https://yudhveer.onrender.com` is already an allowed origin. Anyone can also paste the address into the Relay
   field on either site.

### Rolling back

- **The game only:** remove the variable and rebuild:
  `cf pages edit yudhveer --body '{"deployment_configs":{"production":{"env_vars":{"VITE_DUEL_RELAY":null}}}}'` then
  `cf pages deployments create yudhveer --branch main`. Or put production back on an earlier build:
  `cf pages deployments list --project-name yudhveer --env production`, then
  `cf pages deployments rollback <deployment-id> --project-name yudhveer` (dashboard: Deployments > ... > Rollback).
- **The relay:** a later bad version is rolled back in the dashboard (**yudhveer-duel > Deployments > Rollback**). To take
  it down entirely, `cf workers delete yudhveer-duel`: rooms hold no stored data, so nothing is lost beyond matches in
  progress. Builds that still name the relay then show "Cannot reach the duel relay" on Create/Join.

### What it costs (Workers Free plan)

From Cloudflare's Durable Object pricing and limits pages (read 2026-10-12): 100,000 Durable Object requests a day,
13,000 GB-s of Durable Object duration a day, SQLite-backed objects only, 5 GB of storage; incoming WebSocket messages
count 20 to a request, outgoing messages are free; opening a socket is one request. An object that has `accept()`ed a
WebSocket is billed duration (128 MB) the whole time the socket is open. Worker requests (100,000 a day) are only the
two upgrades per match. When a daily allowance is used up, further requests fail until 00:00 UTC; the Free plan never
bills.

An estimate, not a measurement on Cloudflare: in a fight each browser sends about 30 snapshots, one probe and one echo a
second, and acknowledges each of the ~32 messages it receives, so the room receives about 128 messages a second, 6.4
billed requests a second. A match with about three minutes of fighting is roughly 1,150 requests (a 3 x 90-second
worst case, 1,730) and, with a five-minute lobby-to-results stay, 37.5 GB-s. So **requests are the limit: about 85
typical matches a day** (duration alone would allow about 345). A lobby left open costs at most 11 minutes, 83 GB-s.
Ways up if that is too few, none done: acknowledge deliveries in batches (receipts are cumulative, so one ack per ~100
ms would cut about a third), or the Workers Paid plan.

### Limits that remain

- The origin check stops other websites' pages from using the relay; it does not stop a script, which can send any
  `Origin`. There is no per-address rate limit, so someone opening rooms in a loop could use up the day's free requests
  (the relay then stops until 00:00 UTC; nothing is billed).
- No WebSocket hibernation: a room's seats, timers and receipts live in the object's memory, and a fight never pauses
  long enough to hibernate. The 10-minute idle close bounds the idle cost instead.
- Not verified on Cloudflare itself: `cf deploy` (only `--dry-run` has run), the workers.dev address answering, real
  latency to the nearest Cloudflare location and the two-browser match. Locally the same code ran in workerd.

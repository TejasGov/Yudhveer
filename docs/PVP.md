# PvP duel — Stage 2

Stage 2 adds best-of-three matches to practice and room play. Campaign still uses
its existing fixed-update block, defence numbers, weapons, scenes and enemy AI.
No deployment, PR, merge, public matchmaking, Wrangler configuration or cloud
resource creation is included.

## Design and match rules

Each browser immediately simulates its own hero at 60 Hz. Snapshots (position,
yaw, velocity, state, state time, swing identity, health, posture and loadout)
leave at about 30 Hz. RemoteHero has no physics motor and renders about 100 ms
behind receipt time. There is no rollback, lockstep or shared deterministic simulation.

The defender resolves incoming contacts through the existing parry, guard,
slide and posture functions. The attacker predicts only a small neutral spark
and wooden thud: no health, posture, charge consumption or blood. A received
verdict adds the confirmed clash or blood. Prediction and defender feedback are
measured separately; an absent prediction does not invalidate a defender verdict.

The shared Node/Cloudflare room core owns scores and round epochs. First to two
wins ends the match: 2-0 stops after round two; 1-1 opens the final. A fresh epoch
is used even when a timed tie replays the same round, and epochs never reset on
rematch. Old state, hit and ready messages are rejected. Rematch is accepted only
at match end, and both players must request it.

The single table is src/duel/Rules.ts; the room imports it too. Development relay
and tests now require Node 22.18+ (verified on 24.11.0). The Worker will need to
bundle this TypeScript import; the cloud runtime is still untested.

| Round | Attire | Weapon | Earned abilities | Health | Duel damage multiplier |
| --- | --- | --- | --- | --- | --- |
| 1 | Bamboo training clothes | Fists | Dodge, combo | 100 | 1 |
| 2 | Kavach | Khanda, dhal | Full summit kit | 100 | 0.07 |
| 3 | Kavach | Khanda, dhal | Full summit kit | 130 | 0.07 |

Both heroes preload the distinct training/fists and kavach/khanda rigs and props
before the initial ready message. Round switches reuse these prepared rigs;
readiness identifies the next loadout. Round cards and snapshots also identify
it. A mismatch ends the session with a reload message rather than silently
letting different kits fight. The room's two-second card starts only after both
ready messages; the next fight starts automatically. There is no between-round
Rematch button.

A duel hero renews posture after a break; the campaign hero keeps its old
behaviour. Online pause releases controls, drops a held guard and stops controlled
movement while simulation and snapshots continue. Already committed attacks can
finish. Practice pause freezes normal simulation. A match ending during online
pause clears that pause before results/rematch.

The provisional 90-second round clock belongs to the room online and to simulated
seconds in practice. Higher health share wins at expiry; an exact tie replays the
same numbered round in a new epoch. The display uses receipt-time timing and may
lag the room by network transit; the room's finish message decides the result.

Names are at most 16 UTF-16 code units, saved as yudhveer.duel.name in localStorage,
default Yodha. Hello transmits the name, and round messages repeat both names.
Floating head labels use local gold and opponent vermilion. Names in those labels,
the boss HUD and results use textContent exclusively. The string <b>Local</b> was
shown literally in both browsers; it created no b element.

## Fists and boxing clips

Fists is a real WeaponSet and WeaponId. Its empty prop group is fitted to
Socket_Hand_R with a 12 cm hit segment, measured and swept through the usual
hitbox code. There is no staff, dhal or scabbard. Reach is 1.05 m centre to centre,
used by attack assistance and the duel HeroBot. Damage/posture/reach live in the
blow table; sounds live in the weapon set.

FISTS_STATES in src/entities/characters/YodhaWeapons.ts is the single mapping.
The original staff-derived placeholders have been replaced by nine Mixamo clips,
downloaded on X Bot without skin, Binary FBX, 30 fps, no keyframe reduction. Only
the leading-hand jab was mirrored, making all three attacks right-handed.

| State | Mixamo selection / description | Clip ID |
| --- | --- | --- |
| IDLE, REST | Boxing Idle | boxing_idle |
| WALK | Boxing Advancing Forward | boxing_walk |
| MOVE, SPRINT | Unarmed Run Forward / Running Forward | boxing_run |
| ATTACK_1 | Boxing Leading Hand Jab, mirrored | boxing_jab_right |
| ATTACK_2 | Boxing Back Hand Cross | boxing_cross |
| ATTACK_3 | Boxing Back Hand Hook | boxing_hook |
| STAGGER | Stomach Hit | boxing_body_hit |
| DEFLECTED | Head Hit | boxing_recoil |
| DEAD | Knocked Out Falling To Back | boxing_knockout |

The new yodha_duel_boxing.glb and manifest are used only by training:fists. They
retain the training mesh, height, sockets, finger poses and inherited hero clips.
The original training/kavach models and every campaign asset remain untouched.
The lobby already preloads all round kits for both heroes; it now preloads this
boxing rig too. RemoteHero uses the same definition and clip offsets.

Boxing manifest entries request hands: 'fist', closing both empty hands. The
existing manifest hand override now supports all three declared poses; clips
without an override still close on props and relax when empty, and prayer stays
flat. Slide, jump and posture recovery keep their existing animations; an unarmed
slide or recovery can be supplied later. Left-hand attacks still need a hand
selection field. No block/parry clips are needed for the unarmed kit.

Sources stay outside the repo in E:\hindan\pvp-boxing-sources. The nine FBX
SHA-256 hashes and export settings are recorded in PVP_BOXING_SOURCES.json.
Rebuild with PowerShell 7: pwsh -File scripts/build-duel-boxing.ps1. Its parameters
can point at another source/staging/Blender directory. It copies inputs to staging,
reads the existing character pipeline, exports only the two new duel assets and
losslessly packs the GLB. It writes nothing under game asset/.

## Boxing integration measurements — 2026-10-08

Blender 5.2.2 retargeted all nine clips onto the existing training skeleton; the
export has 30,959 triangles and 80 clips including inherited hero moves and hand
poses. Packing reduced 4.71 MB to 2.88 MB, with all 6,087 animation tracks and
eight mesh attribute arrays identical. The build retains existing rig warnings
about hand bone lengths and finger/socket construction; no missing clip warnings
were observed in the browser. It adds one separate model download to a duel.

The engine measures hand motion at 60 Hz. The full jab included a second window
at 0.517-0.567 clip seconds on the return stroke. Cropping it at 0.5 seconds removes
that extra strike. Cross/hook each measure one window; their recovery is cropped
to keep the combo shorter than the source clips' long trailing settle.

| Punch | Source crop | Playback rate | State length | Measured hit window, state seconds |
| --- | --- | --- | --- | --- |
| Jab | 0.10-0.50 s | 0.8 | 0.50 s | 0.208-0.375 |
| Cross | 0.25-1.00 s | 1 | 0.75 s | 0.250-0.550 |
| Hook | 0.20-1.10 s | 1 | 0.90 s | 0.217-0.500 |

All 25 browser duel checks pass. Added checks exercise one window on each rig,
the new model/hand metadata, and actual animated swept contacts for each punch:
one blow at 0.9 m centre distance, zero damage at 3 m. The existing resolver,
140 ms parry, guard, slide, posture and round checks are retained.

With the new motion and old fist damage 1.5/2/1.5, all three unarmed bot trials
took 86.18 simulated seconds. Fist damage was raised to 2.5/3/2.5, keeping posture
7/9/8 and reach 1.05 m. Armed data and the 0.07 duel multiplier were not changed.
The final __debug.duelPlaytest(3) samples were:

| Kit | Run 1 | Run 2 | Run 3 | Median |
| --- | --- | --- | --- | --- |
| Boxing, 100 HP | 50.43 s | 50.43 s | 50.43 s | 50.43 s |
| Summit, 100 HP | 21.52 s | 33.35 s | 33.87 s | 33.35 s |
| Summit, 130 HP | 40.68 s | 31.97 s | 39.75 s | 39.75 s |

All nine ended by KO without a stall. The three identical boxing samples reflect
the bots' repeated close-range exchanges, not broad statistical confidence.
Damage, crop offsets and playback rates remain choices for human review. The run
uses simulated seconds and does not reproduce wall-clock hit-stop pacing.

Two real browser clients then completed a 2-1 match through the local relay at the
80 ms preset, using actual hand/blade contacts and defender verdicts. Both agreed
on each score and round; the final used 130 HP. The scripted standing fights took
29.19, 46.92 and 62.51 wall-clock seconds. These are a protocol/contact scenario,
not the bot pacing scenario above and not human reaction measurements.

| Client | Peer RTT mean; range | Contact-to-verdict mean; range | Feedback samples |
| --- | --- | --- | --- |
| Seat 0 | 98.35 ms; 85.60-118.80 ms | 203.70 ms; 181.30-231.70 ms | 86 |
| Seat 1 | 97.26 ms; 86.20-113.90 ms | 208.65 ms; 188.90-243.70 ms | 41 |

One rematch request waited for the peer; the second restored scores 0-0, fists,
100 HP and zero posture on both heroes in epoch 4. Closing the peer exercised
disconnect handling. No runtime errors or missing clips were reported by either
client; the isolated Browser pane refused pointer lock, so normal mouse capture
is still unverified. This integration reran only the 80 ms preset; the older
40/150 ms and loss measurements below remain historical. Human feel is unsettled.

The exact before/after campaign invocation was
__debug.playtest([2, 4, 5], 2, { skill: 'steady' }). Both finished six runs with
zero errors and stalls; wins were 2/2, 0/2, 1/2 both times. Mean damage over all
runs changed from 24.5/120.5/60 to 39.5/120.5/109. These small variable samples
do not establish identical balance. The complete campaign fixed-update block
matches main byte for byte after Git checkout CRLF conversion. Campaign assets,
enemy AI, story, voices, trailers and game asset/ were not edited.

The recorded PowerShell rebuild completed successfully and reproduced the packed
GLB byte for byte (SHA-256 0709baeb6e1453f347e7e2a16f6ae61a61d56eaf27a7cd19b7119ce414d3365d).
TypeScript, Vite build, all 13 relay tests and the 135-file asset URL check pass.
Edited source and new text assets retain CRLF. The nine raw FBXs are not committed.

## Historical Stage 2 plumbing measurements — 2026-10-08

The dev hook __debug.duelPlaytest(3) plays both heroes through HeroBot and real
buffered controls, rig-derived strike windows and swept contact detection. It
measures each kit independently, including the final even when a normal match
would end 2-0. The local bot's seed is recorded by run; opponent/effect randomness
is not deterministic. Values are simulated fight seconds, excluding the card;
debugAdvance does not reproduce real wall-clock hit-stop pacing.

Initial fist damage 4/5/4 produced 13.42, 18.85 and 33.32 seconds. Campaign-strength
khanda rounds took 3.18 seconds each at 100 health and 4.00/4.00/4.23 at 130 health.
Fists were reduced to 1.5/2/1.5 damage, with posture 7/9/8 unchanged. Armed duel
damage was first tried at 0.10, then reduced to 0.07 of the shared weapon Blow.
Posture and campaign weapon damage are unchanged. The final samples were:

| Kit | Run 1 | Run 2 | Run 3 | Median | Starting target |
| --- | --- | --- | --- | --- | --- |
| Unarmed, 100 HP | 49.45 s | 75.12 s | 59.85 s | 59.85 s | 40-60 s |
| Summit, 100 HP | 26.67 s | 30.22 s | 32.55 s | 30.22 s | 30-45 s |
| Summit, 130 HP | 39.50 s | 45.10 s | 28.57 s | 39.50 s | 30-45 s |

These are three samples per kit, not settled balance. Some runs miss the target.
All nine final samples ended by KO, without a stall, and the local fighter won
all nine. Local practice resolves its contacts first; this yardstick does not
establish equal win rates or represent two human players.

Two real browser clients completed a full 2-1 match through the development relay
with the 80 ms preset (40 ms outgoing delay per peer, no jitter/loss). Hidden panes
had gameLoop disabled and were stepped with debugAdvance. Both clients reported
scores 1-0, 1-1, 2-1, and the final started at 130 HP on both heroes. Scripted
standing contacts took 41.46, 45.47 and 58.19 wall-clock seconds; this was a
protocol/contact test, not the bot tuning scenario or a human feel test.

| Final network run | Peer RTT mean; range | Predicted-contact-to-verdict mean; range | Feedback samples |
| --- | --- | --- | --- |
| Seat 0 | 97.44 ms; 89.10-122.00 ms | 201.06 ms; 177.90-244.70 ms | 108 |
| Seat 1 | 98.03 ms; 88.10-117.20 ms | 207.60 ms; 187.90-235.50 ms | 41 |

Actual RTT includes relay/browser scheduling above the configured 80 ms. Contact
feedback is measured from the attacker's predicted contact, not a peer timestamp.
Neither client reported a console error. Stage 1's 40/80/150 ms and jitter/loss
measurements are retained in the historical notes below; Stage 2 does not claim
a new full sweep of all presets.

A separate two-client transition check confirmed that online pause dropped a
held guard to IDLE, kept the timer moving from 84.79 to 77.43 seconds, and allowed
eight real incoming hits (100 to 81.072 HP, no additional parries). An 83.33 ms
scripted parry was accepted before pause. Explicit dev-only KO messages then
exercised a paused 0-2 finish; both Rematch buttons reset scores, names and cached
fists/100 HP in a fresh epoch (4 to 5). Quitting the peer displayed Opponent
disconnected with no Rematch. Those explicit KOs only checked transitions; the
full 2-1 match above used physical contacts. Pointer-lock Resume interaction could
not be verified in the isolated browser; normal mouse capture still needs review.
The real browser __debug.duelCheck() passes 17 checks: the 140 ms parry boundary,
guard chip/posture/facing, slide immunity, scaled charged damage, death/posture
renewal, the kits, empty hand hitbox, unarmed guard rejection, 2-0, 1-1/130 HP,
guard dropping on suspension and practice pause's normal simulation gate.
The 13 shared-room tests also exercise ready/card timing, stale epochs, invalid
loadouts, no healing, timer/tie, rematch, names, disconnect and racing lethal verdicts.

Before and after, the exact browser invocation was
__debug.playtest([2, 4, 5], 2, { skill: 'steady' }). Both completed six runs with
zero errors and zero stalls. Wins stayed 2/2, 0/2, 0/2 in chapters 2, 4, 5.
Mean damage over all runs changed from 25 / 131 / 127.5 to 17.5 / 141 / 100;
chapter 2's winning median changed from 38.5 to 36.1 seconds. As in Stage 1,
these tiny variable samples do not establish identical balance.

Source comparison materialized main's Engine.ts with checkout CRLF and compared
the complete campaign fixed-update block byte for byte: it matches. Campaign
weapon Blow data, enemy AI, story, voices, trailers and assets were not edited.
TypeScript, Vite build, all 13 relay tests and the asset URL check pass.
New and edited source retains CRLF.

## Still open / not verified

- Human feel needs two humans playing at the latency presets. Scripted parries
  and contacts cannot establish that the game feels fair or responsive.
- The 90-second clock, two-second card, fist numbers and 0.07 armed damage
  multiplier are tuning choices for review. Health and best-of-three are decided.
- Left-hand punch volumes and optional unarmed jump, slide and posture recovery
  clips remain. The first boxing set uses three right-hand strikes.
- Receipt-time interpolation, five seconds without state ending the session,
  snapshot-only simulated loss, trusted defender health, first lethal verdict
  winning a racing KO, and limited validation remain spike constraints.
- The Worker/Durable Object adapter has not been run or deployed in Cloudflare.
  Use cf for that future step; no wrangler.toml was added.

## Run locally

Run npm run dev and, in another terminal, npm run duel:relay. Both clients open
Duel, choose names, use the same relay URL, and create/join the six-character
code. Remote hosting will need an approved Cloudflare relay deployment and a
Vite build with VITE_DUEL_RELAY=wss://the-relay-endpoint, alongside the existing
static-site hosting. This branch has not been deployed.

For browser QA, node scripts/make-pvp-check.mjs generates a temporary
pvp-check.html with visible dev controls. It is not shipped. Use the 80 ms preset
on both peers, Script full match and Step live on each. The script alternates
which peer attacks to exercise all three rounds; it does not bypass hit resolution.

## Stage 1 historical notes (superseded rules)

The following is the original spike report. Its single-round/100-HP and posture
open questions are historical; the Stage 2 table and decisions above supersede them.

# PvP duel — Stage 1 spike

The title offers Campaign and Duel. Campaign retains its existing chapter, story,
input, AI and combat paths. `Engine.gameMode` is `'campaign' | 'duel'`; the older
private `mode` remains the screen-flow state (`title`, `play`, `over`, etc.).

## Decided design

- Each browser owns and immediately simulates its own hero at the existing 60 Hz.
- Send position, yaw, state, state time and velocity at approximately 30 Hz.
  Draw the opponent approximately 100 ms behind with interpolation.
- The defender resolves incoming blade contacts using its current parry, guard,
  slide and posture. The attacker receives the result afterwards.
- No rollback or lockstep: random decisions, root motion and Rapier do not form a
  deterministic shared simulation.
- Development uses a Node WebSocket relay. The cloud target is a Cloudflare Worker
  plus one Durable Object per room. Use `cf` for eventual cloud work; no Wrangler
  configuration, deployment or cloud resource creation is part of this spike.
- Hero versus hero is the third CombatSystem case. It takes damage and posture
  from the weapon's `Blow` and calls the existing incoming-blow defence functions.
- The opponent is passed in the Player's existing foes list for aim assistance.
  Its health and posture occupy the existing boss HUD bars.

## Local practice

Duel > Practice against HeroBot loads the existing Akhada directly, without scenes,
waves, lessons or campaign progression writes. HeroBot drives a second real Player
through an isolated InputManager and a separate camera bearing. The same summit
kit gives both heroes the khanda, dhal and all summit abilities. The loadout is a
`HeroKit` data field, `DUEL_LOADOUT`, ready for later choices.

## Open decisions

- `DUEL_ROUNDS_TO_WIN = 1`: one round for the spike; best of three is undecided.
  This is a rule data field; multi-round match scoring is not implemented yet.
- `DUEL_STARTING_HEALTH = 100`: deliberately provisional. An undefended hero dies
  to the khanda's three-blow combo quickly.
- Duel heroes renew posture after a break; the campaign hero retains the existing
  behaviour. Keep this duel-only change or reproduce the campaign behaviour?
- Online pause opens the menu and releases controls while the match continues.
  Practice pauses the simulation. Confirm this online pause policy in playtesting.
- Distinguishing two heroes visually, matchmaking, private-room security and
  competitive anti-cheat are later decisions. Defender authority trusts a peer.

## Measurements and verification

Before changes, browser invocation of
`__debug.playtest([2, 4, 5], 2, { skill: 'steady' })`, seeds 1 and 2,
with the regular game loop disabled and the harness stepping explicitly:

| Chapter | Wins | Mean damage over all runs | Median winning fight time |
| --- | --- | --- | --- |
| 2 Akhada | 2/2 | 40.5 | 38.3 s |
| 4 Dwarka | 2/2 | 109 | 75.9 s |
| 5 Summit | 0/2 | 120.5 | no wins |

All six runs reported zero playtest errors. These are regression samples, not
balance statistics. An idle local hero against HeroBot lost in 2.85 simulated
seconds; the bot approached and landed ATTACK_1, ATTACK_2 and ATTACK_3 through the
real swept-blade hitboxes. Its kit was summit and there were no campaign enemies.
TypeScript and the Vite production build pass. No assets were changed.

Seven browser checks through `__debug.duelCheck()` use the equipped heroes and
the actual resolver: parry at 130 ms; expired parry at 150 ms becoming guard chip
(20% damage and 125% posture); a rear hit bypassing guard; slide invulnerability;
charged damage (160%) consuming one charge; lethal damage retaining DEAD; and
posture renewal. All seven pass. The practice pause menu was inspected in the
browser and contains no Restart chapter.

The same campaign invocation after playing Duel completed all six runs with zero
errors and no stalls. It did **not** reproduce the initial outcomes. An additional
control served untouched `main` source (`c510e04`) with the same assets and debug
invocation; it also differed from the original baseline. A fresh branch session
was checked as well:

| Session | Chapter 2 wins; damage; winning median | Chapter 4 wins; damage; winning median | Chapter 5 wins; damage; winning median |
| --- | --- | --- | --- |
| Original main baseline | 2/2; 40.5; 38.3 s | 2/2; 109; 75.9 s | 0/2; 120.5; — |
| Branch after Duel | 2/2; 41; 36.4 s | 1/2; 107.5; 44.6 s | 0/2; 116; — |
| Unchanged-main control | 2/2; 49.5; 41.0 s | 0/2; 100; — | 0/2; 120.5; — |
| Fresh branch session | 2/2; 48; 36.9 s | 1/2; 91.5; 66.9 s | 1/2; 105.5; 101.6 s |

Damage is the mean over all runs; winning medians exclude losses. Every session
reported zero errors and no stalls. These two-run samples cannot establish
unchanged balance or statistically distinguish regressions. The inference is
that session variation exists independently of this branch, not that every
campaign outcome is guaranteed unchanged. The unchanged harness seeds
`Math.random` per run, but persistent effect state and asynchronous loading still
exist; its exact variation mechanism has not been isolated.

Source comparison confirms that the campaign fixed-update block following the
new Duel early return is byte-identical after newline normalization. Campaign
weapon data, enemy AI, levels, story, voices and assets were not edited. The
incoming-blow refactor retains the campaign defence numbers and paths, and the
campaign hero's posture policy is restored when leaving Duel.

## Network spike

Run `npm run dev` and `npm run duel:relay`. Open two browsers, choose Duel,
create a room on one and join its six-character code on the other. The default
development relay is `ws://<page-host>:8787`; set `DUEL_HOST=0.0.0.0` when testing
from another machine. A production endpoint can be supplied through
`VITE_DUEL_RELAY` or the Relay field. No cloud endpoint is provisioned.

The shared room core in `server/DuelRoom.mjs` owns two seats and round epochs.
Both rigs must be ready. Defender verdicts are deduplicated by swing and strike
window. Snapshots have sequence numbers; stale or reordered ones are discarded.
A lethal verdict ends the round for both peers. Rematch needs both players and
starts a new epoch, rejecting delayed messages from the old round.

The latency simulator delays outgoing packets by the chosen one-way delay. Set
20, 40 or 75 ms on both browsers for 40, 80 or 150 ms peer RTT, plus the real
network cost. Jitter is a uniform plus/minus offset. Loss drops replaceable state
packets; room and hit-result messages stay reliable, matching WebSocket's
semantics. A probe/echo through the peer measures the actual simulated RTT.

Six automated shared-room protocol tests pass:
`node --test scripts/duel-relay.test.mjs`. Two real browser clients joined the
local relay and interpolated each other's received heroes. Final trials after
correcting remote clip sampling (the clips have nonzero `startAt` offsets):

| Preset on both peers | Defender parries | Defender health | Final peer RTT (attacker / defender) | Last verdict age | Local parry age at contact |
| --- | --- | --- | --- | --- | --- |
| 40 ms | 5 | 100 | 41.6 / 42.0 ms | 143.5 ms | 83.3 ms |
| 80 ms | 9 | 100 | 104.6 / 105.4 ms | 200.6 ms | 83.3 ms |
| 150 ms | 10 | 100 | 159.4 / 163.5 ms | 271.6 ms | 66.7 ms |
| 80 ms, ±10 ms jitter, 10% snapshot loss | 12 | 100 | 87.3 / 89.2 ms | 216.0 ms | 100.0 ms |

The loss trial dropped 88 outgoing snapshots on each client. Verdict age is
measured on the attacker's own clock from the referenced snapshot's send time
to the returned defender verdict; it includes the 100 ms interpolation buffer.
RTT and ages are last observed samples, not averages or percentile estimates.
Browser scheduling and the real network add delay beyond the preset.

The scripted attacker repeats ATTACK_1 at a fixed distance; the scripted defender
presses parry from the received strike window. These checks exercise real swept
blade contacts and the existing 140 ms local defence window. They do not measure
human reaction, attack anticipation, moving fights, WAN play or subjective feel.
Loss is application snapshot omission, not a simulation of TCP retransmission
and head-of-line blocking. There is no claim that netcode feel is settled.

After parries were disabled, five ordinary blows killed the defender. Both peers
displayed the matching You won / You fell screen. One rematch request stayed on
Waiting for rematch; the second started epoch 2 with both heroes at 100 health
and zero posture. Closing one client showed Opponent disconnected on the other,
with Rematch removed. Fresh network test clients reported no console errors.

TypeScript (`npx tsc --noEmit -p .`), Vite (`npx vite build`), the six relay tests,
Worker syntax checking and the asset-URL check (132 files) pass. Source files
retain CRLF. The Cloudflare adapter has only been syntax-checked and reviewed
against the official API; the Node shared core has been exercised at runtime.

The remote hero has no motor and cannot push the local authoritative body. It
uses receipt-time interpolation, with no clock synchronization or extrapolation
beyond the last snapshot. Large update gaps can visibly stall an opponent;
five seconds without state ends the session. These are deliberate spike limits.

For repeatable browser checks, run `node scripts/make-pvp-check.mjs` and open
`/pvp-check.html` in development. The generated page is temporary and must not be
committed or deployed. Its controls invoke the same debug hooks, disable
`__yudhveer.gameLoop`, and advance explicitly with `debugAdvance(1 / 60)` when the
Browser pane is hidden. Network stepping uses wall-clock intervals on both
clients so real WebSockets and simulator timers can run. Practice reuses HeroBot
in the production bundle; campaign playtests still use its existing controller.

The Worker delegates by room code to a `DUEL_ROOMS` binding of
`DuelRoomObject`. Its source follows the
[Cloudflare WebSocket Durable Object API](https://developers.cloudflare.com/durable-objects/examples/websocket-server/).
The `cf` CLI is present. No Worker binding, migration, deployment or Wrangler
configuration was created; cloud execution remains unverified.

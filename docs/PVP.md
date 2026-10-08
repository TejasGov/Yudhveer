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

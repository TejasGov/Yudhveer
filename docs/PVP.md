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
- `DUEL_STARTING_HEALTH = 100`: deliberately provisional. An undefended hero dies
  to the khanda's three-blow combo quickly.
- Duel heroes renew posture after a break; the campaign hero retains the existing
  behaviour. Keep this duel-only change or reproduce the campaign behaviour?
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

Network measurements and the final campaign comparison will be recorded after
the network path is implemented. No claim about netcode feel has been made.

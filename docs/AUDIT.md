# YUDHVEER audit report

Date: 2026-10-05

This audit covered the whole game in three tracks: characters, wielding and rigging; world, fire and light (with VFX and performance); and story, flow and code. Each track had three tiers. A Tier 1 auditor ran the game in its own browser tab, stepped scenes with `__debug`, rendered the GLBs in Blender from the command line, and read the code. A Tier 2 verifier, a fresh agent, then tried to reproduce every finding with its own captures and measurements, and added what it found. This Tier 3 report keeps only what survived verification. Tier 1 found 45 issues (12 characters, 17 world, 16 story). Tier 2 confirmed 35 in full and 10 in part, with corrections, and rejected none outright. It added 8 new findings of its own, marked "single-source" below. That gives 53 findings: 17 major, 18 minor and 18 polish. None is a blocker; the only one filed as a blocker (W-01) was downgraded to major. Parts of findings that the verifiers could not reproduce, or showed to be wrong, are listed in the appendix. Nothing under `E:/hindan/Yudhveer` was changed by the auditors or the verifiers. Evidence is in `E:/hindan/game asset/audit/` (Tier 1: `t1_characters`, `t2_world`, `t3_story`; Tier 2: `v1_characters`, `v2_world`, `v3_story`).

The dialogue rewrites are in `docs/proposals/DIALOGUE.md`. They are not repeated here.

## Fix first

1. **C-01, V1-02**: In Dwarka's ending the khanda is mounted at 1.43x scale (1.50 m long) and sinks 24 cm into the floor when lowered.
2. **C-02**: In Dwarka's ending the khanda jumps 0.85 m from the stone by his left hand into his right fist, and the mace vanishes.
3. **C-03**: In chapters 2 and 3 the hero holds the sword about 8.8 cm off its grip (the Vetala's grip offset was reused).
4. **C-04**: No rig built with `--fists` has a closed fist. Each hand is an open claw with a straight thumb. This is the root of C-06 and C-11.
5. **C-05, V1-01**: The sheathed sword is a bare blade sticking straight back from the hip, with no scabbard, in the summit ending and in gameplay.
6. **C-06**: In "Praying", the palms never meet. The hands stay two claws 14 cm apart at the chin.
7. **C-07**: In the Akhada the dhal pops onto the boy's arm. The vanara never holds it.
8. **W-01**: ParticleFX never renders: hit sparks, dust, flame licks, mist and the summit deepams' flames are all culled.
9. **W-02, V2-01**: Every island flame is a flat 52-vertex cone, and the shrine's tier flames swing about 7 m each flicker.
10. **W-03, W-04, W-05, W-06, W-10, W-07**: The other pyramid flames (summit deepams and braziers, Baoli, Akhada, Dwarka, Takshaka's flame wave) should move to FireField.

---

## 1. Characters, wielding and rigging

14 findings: 8 major, 4 minor, 2 polish. Verified 11 confirmed, 1 partly (C-08), plus 2 single-source (V1-01, V1-02).

### C-01 · major · Dwarka ending: Takshaka's khanda is 1.43x too big in the hero's hand

- **Where:** `src/game/stories/Dwarka.ts:100` (`takeSword`); `src/entities/characters/YodhaWeapons.ts:167`. Chapter IV ending, shots 5-6.
- **What is wrong:** `takeSword()` sizes the khanda as `s.player.swordMesh.scale.x / 0.7`, which assumes the mace is mounted at 0.7. The mace set now has `scale: 1`, so the khanda gets scale 1.4286. It is 1.50 m from pommel to tip (1.24 m from grip to tip) on a 1.70 m hero. The same khanda is 1.05 m overall at the summit, so its size jumps between chapters. (The verifier corrected the auditor: 1.50 m is the overall length, not grip to tip.)
- **Evidence:** `Dwarka.ts:100 const scale = s.player.swordMesh.scale.x / 0.7;` and `YodhaWeapons.ts:167` mace `scale: 1`. Measured: the mace mount scale is 0.99999 and the khanda in his hand is at 1.4285712, with local Y -0.179..0.871. Images: `t1_characters/c4_end_take_khanda_shot_b.jpg`, `t1_characters/c4_end_khanda_hero_body.jpg`, compared with `t1_characters/c5_idle_body_front.jpg` (the summit, normal size); `v1_characters/c02_after_take_plus05.jpg` (the blade stands far above his head).
- **Reproduce:** `__debug.chapter(4,false); __yudhveer.playScene(__yudhveer.chapter.story.ending, ()=>{})`. Step with awaited `__debug.advance(0.1)` until `Socket_Hand_R` has a second child (about 25.9 s), then read its `scale.x`.
- **Suggestion:** Size from the socket, not the mace: `sword.scale.setScalar(1 / socket.getWorldScale(new THREE.Vector3()).x)`, which is what `CharacterRig.attach` does. Better, call `s.player.rig.attach(sword, YODHA.weapon!)`, so the hold matches the summit's. Effort S, risk low. No decision or credits needed.

### C-02 · major · Dwarka ending: the khanda teleports 0.85 m from the stone at his left side into his right fist; the mace just vanishes

- **Where:** `src/game/stories/Dwarka.ts:73` (`swordMark`), `:94-107` (`takeSword`), `:416-419` (crouch at 1.1 s, take at 1.9 s). Ending shot 5.
- **What is wrong:** The hero crouches beside the stone, but the sword stands by his left hand. At the take, his right fist is 0.85 m from the grip and his left hand is 0.38 m from it. Within one step the khanda leaves the stone and appears sideways in his right fist. The mace, which was in his right hand the frame before, disappears. Nothing lays it down. The shot is meant to show "He lays the mace down, takes the khanda by the grip and draws it out of the stone".
- **Evidence:** measured 0.1 s before the take: grip `[-1.675,8.39,0]`, `Socket_Hand_R` `[-2.299,7.941,0.364]` (0.851 m). `Dwarka.ts:101 s.player.swordMesh.visible = false;` and no mace lay-down cue. Images: `t1_characters/c4_end_crouch_before_take_i46.jpg`, `t1_characters/c4_end_taken_i48.jpg`; `v1_characters/c02_before_take_shotcam.jpg` and `v1_characters/c02_after_take_shotcam.jpg` (same shot camera, 0.05 s apart: mace gone, khanda sideways in the right fist, stone empty).
- **Reproduce:** as C-01. Capture at awaited 0.05 s steps from the moment the khanda appears in the level (about 21 s into the ending).
- **Suggestion:** Stand him so the stone is at his right foot (offset `moveTo` 0.35 m to his left, and face 90 degrees off the line). Time a reach or crouch clip so `Socket_Hand_R` is within about 5 cm of the grip at the take mark; sample it with `rig.sampleAt`, as `BossAndhaka` does for its "grip" mark. Lay the mace on the ground as a level prop, as `layDownShield` does at the summit, instead of hiding it. Let the draw be the sword rising with the hand. Effort M, risk low.

### C-03 · major · Akhada and Island: the sword is held about 8.8 cm off its grip

- **Where:** `src/entities/characters/YodhaWeapons.ts:141` (`WEAPON_SETS.sword`). Chapters 2 and 3, every state.
- **What is wrong:** The sword set mounts `vetala_sword_r.glb` with `socketFrame: true` and `grip: [0.0964, 0.0234, -0.0261]`. Those numbers come from the Vetala (`Vetala.ts:34`). They fit him only because his `Socket_Hand_R` is not at the fist hole; the hero's `--fists` socket is. On the hero, the fist centre is about 8.8 cm off the haft axis and 4.4 cm outside the grip's widest point. In idle the fingers are open beside the red grip. At ease (REST) the hilt hangs outside the curled fingers.
- **Evidence:** `YodhaWeapons.ts:141 socket: 'Socket_Hand_R', socketFrame: true, restWorldRotation: [0, 0, 0], grip: [0.0964, 0.0234, -0.0261],` (identical to `Vetala.ts:34`, from commit 87b1287). Measured in sword space: the grip band at y=-0.1 is centred at (0.014, 0.007); the socket is at (0.0964, 0.0234, -0.0261). Images: `t1_characters/c2_idle_handR_front.jpg`, `c2_idle_handR_side.jpg`, `c2_open_handR_rest_a.jpg`, `c2_open_handR_rest_b.jpg`; control `t1_characters/c2_vetala_handR_shown.jpg` (correct in the Vetala's fist); `v1_characters/c03_ch2_idle_handR_34.jpg`, `v1_characters/c03_ch2_idle_handR_front.jpg`.
- **Reproduce:** `__debug.chapter(2,false)`; advance 1 s; close-up of `Socket_Hand_R`; `sword.worldToLocal(socket world pos)` returns (0.0966, 0.0236, -0.0261) against a grip axis at x of about 0.02.
- **Suggestion:** Set the grip to the haft axis, about `grip: [0.02, 0.0, 0.007]`, and fine-tune by eye. Better, run `vetala_sword_r` through `prepare_weapon.py` so the grip is at the origin with the blade up +Y, and use `grip: [0,0,0]` like the khanda. Optional, your call: a distinct basic sword model for the hero, since today he and the Vetala wield identical notched blades in the same chapter. Effort S, risk low.

### C-04 · major · No closed fists: every `--fists` rig has a half-curled open claw with a straight thumb

- **Where:** `E:/hindan/game asset/characters/build_character.py:216-275` (FISTS block; weight filter at `:224`; `R = span / 3.0` at `:248`). Affects `yodha.glb`, `yodha_training.glb`, `vanara.glb`, `baoli_guardian.glb`, `shalva.glb`.
- **What is wrong:** The hero has no finger bones (28 joints; `RightHand` goes straight to `RightHand_End`). The only grip is the curl that `build_character.py` bakes into the mesh. In every one of these rigs the fingers bend only about 90 degrees and stop short of the palm, leaving an open C or hook. The thumb stays straight and sticks out. A thin shard of geometry shows below the hero's palm. The Guardian's fingers are almost straight, so its curl barely took. In game, each haft sits across the fingertips or in an open palm: the mace (both hands open), the Guardian's talwar, the sword (C-03) and prayer (C-06). The code comment says "fingertips travel ~170 degrees: a closed fist"; the renders show that intent is not met.
- **Evidence:** Blender: `yodha.glb` NBONES 28, no finger bones. Images: `t1_characters/blender/yodhaFist_rest_0_RightHand_End_front.png` and `_below.png`, `yodhaFist_rest_0_Socket_Hand_R_right.png`, `trainFist_rest_0_Socket_Hand_R_front.png`, `fist_baoli_guardian_rest_0_Socket_Hand_R_front.png`, `fist_shalva_rest_0_Socket_Hand_R_front.png`, `fist_vanara_rest_0_Socket_Hand_R_below.png`; `v1_characters/blender/yodha_rest_handR_below.png`, `yodha_training_rest_handR_below.png`, `vanara_rest_handR_below.png`, `shalva_rest_handR_below.png`, `baoli_guardian_rest_handR_below.png`; in game `t1_characters/c4_mace_idle_hands.jpg`, `t1_characters/c1_baoli_guardian_handR.jpg`, `v1_characters/c11_mace_left_fist.jpg`.
- **Reproduce:** Blender CLI `scripts/render.py <glb> <out> x rest@0@Socket_Hand_R@front@0.4` (and `@below`); or in game, a close-up of `Socket_Hand_R` holding any prop.
- **Suggestion:** Two options; this needs your decision.
  - Best (effort L): give the hero and the vanara real finger bones. `autorig.py` already supports finger markers and `--fingers` (Andhaka has 63 joints and a correct grip). Add finger markers to `rigs/yodha*.markers.json`, rebuild with `--fingers`, then key a grip pose per weapon: a fist for khanda and mace, an open hand for prayer.
  - Cheaper (effort M): fix the curl. The cause is not verified. The auditor's guess is that fingertip verts weighted under 0.5 are skipped at `:224` and that the thumb is excluded. Include all hand-dominant verts, curl a full 170-180 degrees around a bar the size of the haft (about 1.6-2.2 cm radius), and add a thumb wrap pass.
  - Either way, risk is medium: 5 GLBs are rebuilt with the existing local scripts.

### C-05 · major · The sheathed khanda is a bare blade sticking straight back from the hip

- **Where:** `Socket_Sheath` in `yodha.glb` (`build_character.py:527`, `SHEATH_SOCKET` at `:106-107`); `Character.stowSword` (`src/entities/Character.ts:591-597`). Seen in the summit ending.
- **What is wrong:** `stowSword` parents the blade to `Socket_Sheath`, and there is no scabbard mesh. The 0.87 m blade points straight back and level, with its tip at hip height (about 0.97 m). It reads as a sword skewered through the belt. The socket's orientation comes from where the hand was at the "sheathed" mark of Mixamo's sheathe clip, which is a horizontal hand. The left hand comes within 9-13 cm of the blade line (the auditor measured 9.4 cm, the verifier 12.6 cm at another moment). Whether it actually passes through the hilt was not confirmed.
- **Evidence:** verifier's measurement at 4.2 s (clip `calm_idle`): blade direction (0.19,0.01,0.98), dot with forward -1.00, elevation 0.4 degrees; LeftHand 0.126 m, Hips 0.138 m, LeftUpLeg 0.125 m from the blade line. Images: `t1_characters/c5_end_sheathed_khanda_left.jpg`, `t1_characters/c5_end_dhal_laid_shot.jpg` (the ending shot as framed), `v1_characters/c05_sheathed_side_a.jpg`, `v1_characters/c05_sheathed_back.jpg`.
- **Reproduce:** `__debug.chapter(5,false)`; `playScene(chapter.story.ending)`; step about 55 s until the dhal is laid down; check `player.swordMesh.parent.name === 'Socket_Sheath'`.
- **Suggestion:** Add a scabbard prop on `Socket_Sheath` that the blade disappears into. Re-orient the socket so the blade hangs about 40-55 degrees down and back along the left thigh, clear of the hand's swing. Do this either by rotating `Socket_Sheath` in `build_character.py` or by applying a fixed extra rotation in `stowSword`. Then make the sheathe clip's hand meet that new angle: retime the "sheathed" mark, or blend the hold over about 0.15 s. Effort M, risk low. Fix together with V1-01.

### V1-01 · major · single-source · The bare-blade sheath also shows in gameplay (chapters 2, 3 and 5)

- **Where:** `src/entities/Player.ts:258` (sheathe toggle); sword set `stowable: true` in `YodhaWeapons.ts`; `Character.ts:591-597`.
- **What is wrong:** C-05 is not limited to the summit ending. In chapter 2, using the player's own sheathe toggle parents the sword to `Socket_Sheath`. It then sticks back out of the left hip with no scabbard (dot with forward -0.89, elevation 12 degrees, grip 0.71 m and tip 0.91 m above the feet). Any player who sheathes in chapters 2, 3 or 5 sees it.
- **Evidence:** `Player.ts:258 sm.changeState(this.swordSheathed ? 'DRAW' : 'SHEATHE');`. Images: `v1_characters/v1_ch2_sheathed_side.jpg`, `v1_characters/v1_ch2_sheathed_back.jpg`.
- **Reproduce:** `__debug.chapter(2,false)`; advance 1 s; `__yudhveer.player.stateMachine.changeState('SHEATHE')`; advance 2 s; capture the hero from the side.
- **Suggestion:** The same fix as C-05, applied to every stowable set (sword and khanda). Until then, consider making the sets non-stowable. Effort M, risk low.

### C-06 · major · "Praying" never joins the palms

- **Where:** Baoli opening shots 2 and 4 (`src/game/stories/Baoli.ts:118`, `:202`, `kneel(s,'praying',...)`); `Summit.ts:56-59`; `Prologue.ts:67` (villager praying).
- **What is wrong:** Without fingers (C-04), Mixamo "Praying" leaves the two curled hands 14 cm apart at the chin, fingers hooked. A thin shard from the left hand points at the beard. The Durga shrine beat and the summit prayer are meant to show the palms pressed together; `Summit.ts:56` says "his palms together before his face". It reads as two claws held up.
- **Evidence:** measured in the Baoli opening: palm sockets 0.136 m apart (auditor) and 0.139 m apart, wrists 0.161 m (verifier, at 9.9 s). Images: `t1_characters/c1_open_pray_hands_front.jpg`, `t1_characters/c1_open_pray_shot.jpg`, `t1_characters/blender/sh_yodha_praying_1_RightHand_front.png`, `v1_characters/c06_pray_front.jpg`, `v1_characters/c06_pray_shotcam.jpg`.
- **Reproduce:** `__debug.chapter(1,false)`; `playScene(chapter.story.opening)`; advance about 9.5-9.9 s; close-up of the midpoint between `Socket_Hand_R` and `Socket_Hand_L`.
- **Suggestion:** Author a `praying_anjali` clip in a `--post` script. Starting from "praying", use IK to bring both palm sockets together (distance 0, palms facing) about 15 cm in front of the sternum. During prayer, swap in a flat open-hand shape key that undoes the fist curl. The alternative is the finger bones from C-04 with a flat-hand pose. Effort M, risk low. Do this after the C-04 decision.

### C-07 · major · Akhada: the dhal "hand-off" is a pop; the vanara never holds a dhal

- **Where:** `src/game/stories/Akhada.ts:204` (`{ at: 3.4, run: (s) => dhal(s, true), essential: true }`), opening shot 4; `Akhada.ts:68-70`; MENTOR (`Akhada.ts:21-49`) has no offhand prop.
- **What is wrong:** The shot says "He comes up to the boy and hands him the dhal". `dhal()` only toggles visibility. In one frame neither character holds a dhal. In the next, at the same camera, the dhal is on the boy's left arm and the vanara's hands have not moved. The vanara's `Socket_Hand_L` is empty and his right hand holds only his staff.
- **Evidence:** `Akhada.ts:68-69 function dhal(s: Stage, on: boolean): void { s.player.shieldMesh.visible = on; }`. Images: `t1_characters/c2_open_dhal_after_3.7.jpg`, `t1_characters/c2_open_dhal_appeared.jpg`, `v1_characters/c07_dhal_before.jpg`, `v1_characters/c07_dhal_after.jpg` (0.15 s apart, 19.3-19.45 s into the opening).
- **Reproduce:** `__debug.chapter(2,false)`; `playScene(chapter.story.opening)`; step 0.25 s at a time past about 18.6 s, polling `player.shieldMesh.visible`.
- **Suggestion:** Give the vanara the dhal from the scene's start (slung on his back, or a second prop on his `Socket_Hand_L`). At about 2.8 s have him hold it out with his left hand, using a reach like `staff_point`. Move it to the boy's `Socket_Hand_L` on the frame the hands meet; check with `sampleAt` that the sockets are within about 10 cm. If an animated hand-off costs too much, cut on "Here." to an insert of the dhal landing on his forearm, so the pop happens across a cut. Effort M, risk low.

### C-08 · minor (verifier downgraded from major) · Prologue ending: the hiding villager's foot is on the dead woman's head

- **Where:** `src/game/stories/Prologue.ts:61` (`DEAD_WOMAN v(-4.9,0,-4.5)`) and `:71` (`v_man` dusk mark `v(-5.2,0,-3.7)`, clip `hiding`).
- **What is wrong:** `dying_backwards` puts the dead woman's head 0.4 m from her mark, toward the son's hiding mark, which is only 0.85 m away. His right toe is 0.17 m and his right foot 0.21 m from her head bone. In the world, his crouched foot and knee sit on her face. The verifier found that no shot camera frames this during the dusk shots: projecting her head through the scene camera every 0.5 s from 0 to 55 s, it is never in view while he is on that mark. So it is a hidden staging error that any reframing would expose. Those cameras came from a `__debug.chapter` start; a natural playthrough was not checked.
- **Evidence:** the code lines above; measured at 3 s: her head at [-5.15,0.14,-4.14]. Images (debug cameras): `t1_characters/c0_end_deadwoman_vs_hiding_man.jpg`, `t1_characters/c0_end_v_dead_woman.jpg`, `v1_characters/c08_deadwoman_hiding_top.jpg`, `v1_characters/c08_deadwoman_hiding_side.jpg`.
- **Reproduce:** `__debug.chapter(0,false)`; `playScene(chapter.story.ending)`; advance 3 s; read the bones of `v_dead_woman` and `v_man` from `sceneRun.stage.actor(id)`.
- **Suggestion:** Move `v_man`'s dusk mark at least 1.5 m from DEAD_WOMAN, for example `v(-6.4,0,-2.9)` behind the hut corner, or turn her so her head points away from him. Optionally add a dev check that warns when a living actor's foot bones are within 0.5 m of a dead actor's bones at a shot's start. Effort S, risk low.

### C-09 · minor · The lathi uses one-handed club clips: the 1.55 m staff goes through the left arm and grazes the head

- **Where:** `src/entities/characters/YodhaWeapons.ts:81-85` (LATHI_STATES from `one_hand_club_combo`), `:117-124`, lathi built at `:73`. Prologue and chapter I.
- **What is wrong:** The staff runs 0.57 m below the fist and 1.05 m above it, but the clips were made for a short club. At 2.4 s into the clip the staff passes 4.9 cm from the left elbow, through the arm and shoulder pad. At 0.8-1.2 s it passes 10-16 cm from the skull centre, grazing the hair. A lathi is a two-handed weapon, so one-handed swings read as wrong. The auditor also reports that in idle the empty left fist is held across the belly as if carrying a dhal; the verifier did not re-check that.
- **Evidence:** verifier measurements: t=2.4 LeftForeArm 0.049 m; t=0.8 Head 0.121; t=1.0 Head 0.104; t=1.2 Head 0.158. Images: `t1_characters/c1_lathi_club_2.4_lforearm.jpg`, `c1_lathi_club_1.2_side.jpg`, `c1_lathi_club_1.2_close.jpg`, `c1_idle_body.jpg`; `v1_characters/c09_lathi_2.4_elbow.jpg`.
- **Reproduce:** `__debug.chapter(1,false)`; `player.playClip('one_hand_club_combo',{startAt:t,fade:0})`; `__debug.advance(0.02)`; measure the distance from the staff segment (`swordMesh` y -0.57..1.05) to the bones.
- **Suggestion:** Give the lathi the two-handed Great Sword Pack clips the mace already uses (`great_sword_idle`, slash, `slash_3`, `high_spin`) with `twoHanded: 'Socket_Hand_L'`, gripped about 0.45 m from the butt. The existing `aimTwoHanded` keeps it off the body. Raise `TWO_HANDS_FAR` if the fists sit wider than 0.45 m. Effort S-M, risk low; the hit windows re-measure automatically.

### C-10 · minor · The Vetala wears a second pair of bare swords on his back while holding two more

- **Where:** `public/assets/characters/vetala.glb` mesh node `Swords_Sheathed`; `src/entities/characters/Vetala.ts:32-41`.
- **What is wrong:** `vetala.glb` has a skinned `Swords_Sheathed` mesh, two notched blades crossed on his lower back. Nothing in the code hides it, so in the fight he carries four identical swords.
- **Evidence:** in game, `getObjectByName('Swords_Sheathed')` is found and visible; grep for `Swords_Sheathed` in `src` finds nothing. Images: `t1_characters/c2_vetala_back_sheaths.jpg`, `t1_characters/c2_vetala_body_shown.jpg`, `v1_characters/c10_vetala_back.jpg`, `v1_characters/c10_vetala_front.jpg`.
- **Reproduce:** `__debug.chapter(2,false)`; show the Vetala (`group.visible=true`); capture from behind.
- **Suggestion:** In `Vetala.ts`, after the rig loads: `rig.root.getObjectByName('Swords_Sheathed')!.visible = false`. Or drop the node from the build with `--extras`. If he should draw on his entrance, show it until a draw mark and swap then. Effort S, risk low.

### V1-02 · minor · single-source · Dwarka ending: the oversized khanda, lowered at rest, sinks 24 cm into the floor

- **Where:** `src/game/stories/Dwarka.ts:113-117` (`lowerSword`, REST rotation [0,0,1.1]) with `Dwarka.ts:100`; ending shot at `:436`.
- **What is wrong:** After "Rest, serpent king" the khanda takes the REST rotation. At 1.43x scale its lowest point is 0.237 m below his feet. At the correct scale it would be 0.071 m above the floor. This follows from C-01.
- **Evidence:** measured 1 s after `lowerSword`; image `v1_characters/v1_dwarka_lowered_khanda_side.jpg`.
- **Reproduce:** as C-01; step until the khanda's `rotation.z == 1.1` (about +3.9 s after the take); compare the lowest vertex with `player.group.position.y`.
- **Suggestion:** Fix C-01, then re-check that the lowered tip clears the floor. Effort S, risk low.

### C-11 · polish · Hero mace: the left fist sits on the very butt of the haft

- **Where:** `src/entities/characters/YodhaWeapons.ts:163-170` (mace, `grip [0,0,0]`, twoHanded); `public/assets/weapons/hero_mace.glb`.
- **What is wrong:** The two-handed aim works: the left fist is on the haft axis. But the haft ends 0.231 m below the right-hand grip and the left fist sits 0.206 m down, leaving about 2.5 cm of haft below it. With the open hands (C-04), the butt reads as resting in an open left palm.
- **Evidence:** measured mace local Y -0.231..0.819; `Socket_Hand_L` along -0.206, radial 0.000. Images: `t1_characters/c4_mace_idle_hands.jpg`, `t1_characters/c4_mace_idle_body.jpg`, `v1_characters/c11_mace_left_fist_side.jpg`.
- **Reproduce:** `__debug.chapter(4,false)`; advance 1 s; measure the distance from `Socket_Hand_L` to the haft segment.
- **Suggestion:** Move the right-hand grip about 6 cm toward the head (`grip: [0, 0.06, 0]`) so 8 cm of haft shows below the left fist, or lengthen the haft in `prepare_weapon.py`. Do C-04 first. Effort S, risk low.

### C-12 · polish · The guru's shoulder joints are 3.7 cm asymmetric

- **Where:** `E:/hindan/game asset/characters/rigs/guru.markers.json`, giving `guru.glb` RightArm and LeftArm heads.
- **What is wrong:** In rest pose, the right shoulder joint is 3.7 cm closer to the midline and 0.9 cm lower than the left. The auditor says it is mostly hidden because the right is his staff arm and is held still, and would show as a pinched shoulder if that arm animates. The verifier did not confirm that the staff arm never animates, and found the mesh-height-above-joint numbers unreliable. Only the joint asymmetry is solid. For comparison the hero's joints are symmetric within 1.1 cm, and the hero's raised-arm renders show no shoulder collapse.
- **Evidence:** Blender `scripts/shoulder.py`: guru RightArm (-0.156 0.106 1.290), LeftArm (0.193 0.097 1.299); hero R (-0.198 0.044 1.349), L (0.187 0.039 1.338). Images: `t1_characters/blender/guru_breathing_idle_2_body_front.png`, `t1_characters/blender/sh_yodha_one_hand_club_combo_2.1_RightArm_front.png`.
- **Reproduce:** Blender CLI `scripts/shoulder.py <guru.glb>`.
- **Suggestion:** Mirror the left shoulder marker to the right (x = -0.19) and re-run `autorig.py` and `build_character.py`. Only worth it if the staff arm ever animates. Effort S, risk low.

---

## 2. World, fire and light

18 findings: 9 major, 5 minor, 4 polish. Verified 14 confirmed, 3 partly (W-08, W-13, W-16), plus 1 single-source (V2-01). Severity changes by the verifier: W-01 blocker to major; W-08 major to minor; W-10 minor to major; W-13 minor to polish; W-15 polish to minor.

The headline: only two fire systems meet the bar "it cannot be a pyramid poly triangle". They are the village's FireField and the summit's AgniBeacon. Every other flame is a static or barely animated low-poly mesh: a cone, a bipyramid or a capsule. Most of the fixes below reuse FireField.

### W-01 · major (verifier downgraded from blocker) · ParticleFX never renders

- **Where:** `src/combat/ParticleFX.ts:116/132/149/165` (the four `THREE.Points` systems: sparks, dust, flames, mist).
- **What is wrong:** The four points systems keep three.js's default `frustumCulled = true`. Their bounding sphere is computed once, at the first render, while every unused slot is parked at y = -9999. It is never recomputed, so it stays at centre (0,-9999,0), radius 0, and the points are culled whatever is on screen. Every other particle system in the game turns culling off; this one does not. As a result none of these show in play: combat hit sparks, dust puffs, the fire on Takshaka's flame wave, the village roof's flame licks, the summit braziers' licks, Baoli's mist, and the summit Temple_Deepam flames, which are particles only. With gore off, a landed hit shows no effect at all. Combat and the story still work, and blood FX still marks hits with gore on, hence major, not blocker.
- **Evidence:** live: all four have `frustumCulled: true` and `boundingSphere {center: [0,-9999,0], radius: 0}` while sparks and flames are alive. `grep frustumCulled` matches in `BloodFX.ts:129`, `FireField.ts:175`, `AgniBeacon.ts:204/223`, `Smoulder.ts:160/178`, `WeatherParticles.ts:105`, `DivineLight.ts:91`, but not in `ParticleFX.ts`. Images: `t2_world/v5_particles_culled_default.jpg` (nothing visible), `t2_world/v5_particles_culling_off.jpg` (dots appear); `v2_world/v2_w01_culled_default.jpg`, `v2_world/v2_w01_culling_off.jpg`.
- **Reproduce:** `__debug.chapter(5,false); pf=__yudhveer.particleFX; pf.spawnSparks(new THREE.Vector3(4.6,1.8,0.8),60,true)`; read `pf.sparkPoints.geometry.boundingSphere`; render with culling on and off.
- **Suggestion:** Set `frustumCulled = false` on all four Points in the constructor. Effort S, no risk. Then re-tune spark and flame sizes, because they have never been seen in play. Note that `FlameParticle.size` is unused: the PointsMaterial has a single size of 0.3. Fix W-11 at the same time.

### W-02 · major · Island: every flame is a flat 52-vertex cone

- **Where:** `island_caves.glb` `Flame_0..Flame_17` (52 vertices each), `Flame_Tier_E/W` (100 v); `src/levels/Level5_Island.ts:182` (material override), `:208` (animation).
- **What is wrong:** The cave's flames are literal pyramids: one flat orange MeshBasicMaterial cone, no gradient, no glow. Its luminance (0.62) is under the bloom threshold (0.8), so the cones don't even bloom. The only animation is a sine scale wobble. Examples: the wall torch at (19.24,-0.19,-42.76) is a cone on a stick. The hall brazier at (0.03,0.78,-25.49) is a cone in a filigree cup. The shelf lamp at (4.35,1.47,-3.4) is a cone floating about 0.1 m above a bare shelf, with no diya under it. The diya at (11.39,0.81,-35.64) has a cone bigger than the lamp, hovering above its wick.
- **Evidence:** `Level5_Island.ts:182 if (src.name === 'Flame') return new THREE.MeshBasicMaterial({ name: 'Flame', color: new THREE.Color(1.5, 0.42, 0.06), fog: false });`; `:208` scale wobble; bloom threshold 0.8 (`:77`, `PostFX.ts:73`). Images: `t2_world/v3_walltorch_12b.jpg`, `t2_world/v3_walltorch_7b.jpg`, `t2_world/v3_hall_brazier.jpg`, `t2_world/v3_lamp2_close.jpg`; `v2_world/v2_w02_walltorch.jpg`, `v2_world/v2_w02_hall_brazier.jpg`, `v2_world/v2_w09_lamp2_close.jpg`, `v2_world/v2_w02_diya8.jpg`.
- **Reproduce:** `__debug.chapter(3,false)`; camera at (16.8,0,-43.2) looking at (19.24,-0.1,-42.76), fov 35; render.
- **Suggestion:** Reuse FireField in `Level5_Island`. Read each `Flame_*` node's world position and height into FireSpots, hide the cones, and drive the 8 pooled lamp lights from `fires.flicker()`. This is one instanced draw. Put a diya under the floating shelf flame, or remove it. Effort M, risk low. This also removes V2-01.

### V2-01 · major · single-source · Island shrine: the tier flames swing about 7 m each flicker

- **Where:** `src/levels/Level5_Island.ts:164` (flames collected by `/^Flame_/`) and `:207-208` (scale flicker); `island_caves.glb` `Flame_Tier_E/W` (origin at 0,0,0, geometry at about (±3.2,-0.3,-75)).
- **What is wrong:** These two meshes have their origin at the world origin, with the geometry 75 m away. The flicker scales every `Flame_*` mesh about its origin, so on each cycle these flames sweep in world Z from about -72.3 to -79.8. The cones float in mid-air beside the deepastambha, then jump back into the rock wall. The brass deepastambha's own tiers have no flames.
- **Evidence:** measured world Z of Flame_Tier_E over ticked frames: -72.44, -73.76, -77.84, -79.84, -77.57, -74.81; `position = [0,0,0]`. Images: `v2_world/v2_new_tierflame_near.jpg`, `v2_world/v2_new_tierflame_far.jpg`.
- **Reproduce:** `__debug.chapter(3,false)`; tick `levelManager.update` by hand; read Flame_Tier_E's world bounding box every few frames; camera (0,0.8,-66.5) looking at (1.5,-0.5,-75.5), fov 45.
- **Suggestion:** Re-pivot every `Flame_*` mesh at load: move the geometry so its base is at the origin and set `mesh.position` to that point. Effort S, risk low. Replacing the cones with FireField (W-02) removes the problem.

### W-03 · major · Summit: the two Temple_Deepam lamps show no flame

- **Where:** `src/levels/Level4_Summit.ts:255-263` and `:406`; deepams at (±5.05, about 1.0, 0.12).
- **What is wrong:** The deepams' flame exists only as ParticleFX spawns, so because of W-01 nothing is drawn. Two flickering 6 cd point lights shine from lamps with no flame. Even with culling off, the "flame" is round dots drifting metres above the lamp, not a lamp flame. The bronze deepam renders as saturated flat orange.
- **Evidence:** `Level4_Summit.ts PointLight(0xffa040, 6, 9, 2)` with `addFlicker`; `:406 for (const p of this.flamePoints) if (Math.random() < 0.6) this.particleFX.spawnFlames(p, 1, 0.3);`. Images: `t2_world/v5_deepam_mid.jpg`, `t2_world/v5_arena_lit.jpg`, `v2_world/v2_w03_deepam_default.jpg`, `v2_world/v2_w03_deepam_cullingoff.jpg`.
- **Reproduce:** `__debug.chapter(5,false)`; camera at (3.2,2.2,3.0) looking at (5.05,1.4,0.12); tick the level for 90 frames; render.
- **Suggestion:** Put the summit's fires in a FireField: the deepam lips (one tongue each at lip height), the braziers (W-10) and the lantern flames. Drive the deepam lights from `fires.flicker()`. Retint the deepam material toward dark bronze. Effort S-M.

### W-04 · major · Baoli: all flames are static faceted bipyramids, ink-outlined, blown to white by bloom up close

- **Where:** `moonlit_baoli.glb` `Deepastambha_Flames` x4 (Flame_Core 800 v + Flame_Outer 350 v), `Statue_Kaali_Lamps_2/3`, `Deco_Diyas_2/3`, `Deco_HangingLamps_2/3`; `src/levels/Level1_Baoli.ts:15`.
- **What is wrong:** Flame_Core is converted to a lit toon material with an ink outline; Flame_Outer is an additive shell. The shapes are diamond crystals with black lines round them, and they do not move. Level1_Baoli has no flame animation, only the exported light flicker. At 1.5 m, about 11% of the frame is near-white and the bloom washes it out.
- **Evidence:** `Level1_Baoli.ts:15 const ADDITIVE_MATERIALS = new Set(['FX_Glow', 'FX_Glow_Far', 'Flame_Outer']);` (Flame_Core is toonified). Frame diff 0.5% (auditor) and 1.3% (verifier, light flicker only), against 7.2% for the village torch. Images: `t2_world/v1_deepastambha_close_a.jpg`, `t2_world/v1_deepastambha_mid.jpg`, `t2_world/v1_kaali_lamps.jpg`; `v2_world/v2_w04_deepastambha_a.jpg`, `v2_world/v2_w04_deepastambha_mid.jpg`. The verifier did not re-capture the Kaali lamps; the inventory shows the same Core/Outer pattern.
- **Reproduce:** `__debug.chapter(1,false)`; camera at (0.3,3.2,-10.2) looking at (0,3.3,-11.8), fov 35; render at two times.
- **Suggestion:** Replace the deepastambha, Kaali lamp and diya flames with FireField spots (read the vertex clusters the way Akhada's `prepareLamps` does), hide the meshes, and tie `Torch_Light_01..04` to `fires.flicker()`. Keep the `FX_*Glow` dots for the far fort lamps. A quick first step: exclude flames from the ink pass and make Flame_Core unlit (effort S). Full fix effort M.

### W-05 · major · Akhada: the deepam flames are frozen hexagonal cones; the nearby light is red, unflickering and at floor height

- **Where:** `akhada_atrium.glb` `BR_Deepam_Static_Flames_1/_2` (16 lamps), `BR_brass_diya_lantern_flame`; `src/levels/Level2_Akhada.ts:348`, `:360`, `:441-461`, `:527`.
- **What is wrong:** The flames' only motion is the one-time grow-in when the lamps are lit. After that they are completely static (0.0% of pixels change between frames). Up close each is a six-sided cone. The only lights near them are 4 vermillion grazers (#ff1a24, at y 0.45) that never flicker, against amber flames at y 2.2-3.1. The cobalt/vermillion grade is a logged choice, but the flames throw no warm light and nothing breathes.
- **Evidence:** `Level2_Akhada.ts:461 transformed = aLampBase + (transformed - aLampBase) * uFlameSize[int(aLamp + 0.5)];` (the only motion); `:527 new THREE.PointLight(VERMILLION, 0, 14, 2)`; `:360` intensity with no flicker term. Images: `t2_world/v2_deepam_close_a.jpg`, `t2_world/v2_arena_night.jpg`, `v2_world/v2_w05_deepam_a.jpg`.
- **Reproduce:** `__debug.chapter(2,false)`; `level.cue('night')`; camera at (-12.8,2.6,4.9) looking at (-12.8,2.45,6.23).
- **Suggestion:** Feed the 16 lamp centres (already computed in `prepareLamps`) to a FireField, with the lamp clock driving `set(group, flameSize)` so the grow-in is kept. Multiply each grazer by `fires.flicker()`. Optionally add a faint amber point light per pair of stands. Effort M.

### W-06 · major · Dwarka: the 8 diyas burn as frozen low-poly capsules with no light, unmoved by the storm

- **Where:** `dwarka_browser.glb` `BR_Batch_09_Diya_Flame` (2880 v, 8 flames of about 360 v, e.g. at (-8, 4.67, -35)).
- **What is wrong:** An emissive pill-shaped faceted blob. No code animates it, there is no point light in the level (only ambient, hemisphere and two directional lights), and the rain and wind do nothing to it.
- **Evidence:** inventory: MeshStandardMaterial, emissive [1,0.24,0.015] x4; `grep 'Diya' src/levels/Level3_Dwarka.ts` finds only a regex at `:59`. Images: `t2_world/v4_diya_close_a.jpg`, `t2_world/v4_diya_mid.jpg`, `v2_world/v2_w06_diya_a.jpg`.
- **Reproduce:** `__debug.chapter(4,false)`; camera at (-8,5,-33.8) looking at (-8,4.65,-35).
- **Suggestion:** FireField with 8 spots and a wind lean: a uniform wind vector that skews the tongue tips, and guttering by lowering the group's amount in gusts. Add 1-2 pooled point lights for the nearest diyas, as the island does. Hide the mesh. Effort M.

### W-10 · major (verifier raised from minor) · Summit braziers: a static spiky flame that only stretches; the smouldering flame sinks into the bowl's neck

- **Where:** `charnel_ridge.glb` `VFX_Brazier_Flame_E/W` (252 v); `src/levels/Level4_Summit.ts:42`, `:339-343`, `:383`.
- **What is wrong:** The lit flame is a crown of flat faceted triangular spikes. Its only animation is `scale.y` from the lit and flare values; once lit it is static. While smouldering, `scale.y` is 0.3, which puts it at world y 10.12-10.39, inside a bowl that spans 10.0-10.48. What shows is a yellow ring at the stem under the bowl, not coals. This is the same pyramid-flame class as the others, on the final boss's dais.
- **Evidence:** `Level4_Summit.ts:340 f.mesh.scale.y = f.scaleY * height;`. Images: `t2_world/v5_brazier_lit_a.jpg`, `t2_world/v5_brazier_smoulder.jpg`, `t2_world/v5_cliff_texture_zoom.jpg`; `v2_world/v2_w10_brazier_smoulder.jpg`, `v2_world/v2_w10_brazier_lit_a.jpg`.
- **Reproduce:** `__debug.chapter(5,false)`; camera at (3.5,11.6,-11.5) looking at (5.6,10.6,-14.1); then `level.cue('crowned-settled')`.
- **Suggestion:** Move the braziers into the same FireField as W-03, with the "dais" group amount = lit + flare, so a smoulder is small tongues at the rim. Drive `Point_Brazier_Fire_E/W` from `fires.flicker('dais')`. Effort S-M.

### W-07 · major · Takshaka's flame wave is a flat red plastic torus

- **Where:** `src/combat/ProjectileManager.ts:158-171` (`spawnFlameWave`), `:226`.
- **What is wrong:** The projectile is a `TorusGeometry` arc in flat `0xff3300` at 0.85 opacity. It is not registered for bloom, unlike the other projectiles. The fire meant to ride it is ParticleFX, which is invisible (W-01). It is live in play: Takshaka's signature attack reads as a red ring sliding on the floor. (The verifier saw no ink outline on it; the rest is as described.)
- **Evidence:** `ProjectileManager.ts:163-168 new THREE.TorusGeometry(1.5, 0.2, 8, 16, Math.PI * 0.7)` with `MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.85 })`; `:226 this.particleFX.spawnFlames(p.position, 4, 0.8);`; `BossTakshaka.ts:89` calls it. Images: `t2_world/fx_flamewave.jpg`, `v2_world/v2_w07_flamewave.jpg`.
- **Reproduce:** `__yudhveer.projectileManager.spawnFlameWave(origin, new THREE.Vector3(0,0,1), 'x')`; render.
- **Suggestion:** Build the wave from FireField-style tongues: a short-lived instanced field along the arc, scrolling noise, additive glow, depthWrite off, registered for bloom. Add a ground scorch decal. Fix W-01 so its embers show. Effort M.

### W-08 · minor (verifier downgraded from major) · Small GPU memory leak on each chapter load

- **Where:** `src/entities/Character.ts:408-410` (`mountRig`), `src/entities/animation/CharacterRig.ts:560-563` (`dispose`).
- **What is wrong:** Alternating chapter 0 and chapter 1 grows `renderer.info.memory` by about 14 geometries and 8-9 textures per round trip, while the scene's own geometry count stays flat. The verifier identified the objects. The geometries are the hero's greybox lathi (6 small cylinders and a sphere): `mountRig` detaches the old weapon (`this.swordMesh.removeFromParent(); this.swordMesh = p.prop;`) before `this.rig?.dispose()` traverses the old rig, so it is never disposed. The textures are normal maps: `CharacterRig.dispose` frees only `mat.map`. The leak is small, a few KB of geometry plus a few textures per load.
- **Evidence:** verifier's sequence (geometries/textures): 53/72, 108/91, 67/79, 122/99, 81/87, 136/107, ... 178/131. `CharacterRig.ts: mat.map?.dispose(); mat.dispose();`.
- **Reproduce:** loop `await __debug.chapter(0,false)`; render; read `renderer.info.memory`; `await __debug.chapter(1,false)`; repeat.
- **Suggestion:** Dispose the old greybox prop in `mountRig` before detaching it. Make `CharacterRig.dispose` reuse GLBLevel's `disposeObject`, which handles material arrays and every texture slot. Re-run the loop until the counts plateau. Effort S-M.

### W-09 · minor · Island lamp lights blow out the rock behind them; the shrine deepastambhas render near-white

- **Where:** `src/levels/Level5_Island.ts:110` (`PointLight(LAMP_COLOR, 0, 8, 2)`), `:233` (intensity = power x 36); Flame_Tier_E/W area at (±3.2, -0.3, -75).
- **What is wrong:** Each pooled light sits about 0.3 m from the rock at 18-53 cd with inverse-square falloff. The wall behind it clips to white (2.4-6.4% of pixels clip in the close-ups). The shrine's brass deepastambhas burn near-white because their own light sits inside them.
- **Evidence:** images `t2_world/v3_lamp2_close.jpg`, `t2_world/v3_tier_E_close.jpg`, `t2_world/v3_tunnel_gameplay.jpg`; `v2_world/v2_w09_lamp2_close.jpg`, `v2_world/v2_w02_walltorch.jpg`, `v2_world/v2_w02_diya8.jpg`, `v2_world/v2_new_tierflame_near.jpg`.
- **Reproduce:** `__debug.chapter(3,false)`; camera at (3.3,1.65,-2.4) looking at (4.35,1.5,-3.4).
- **Suggestion:** Move each light 0.4-0.6 m off the wall along its normal or toward the cave centre. Lower the gain or use decay 1.5, and clamp the light to a minimum distance. Effort S. Do it alongside W-02.

### W-11 · minor · Particle emission depends on frame rate and continues while paused

- **Where:** `src/levels/Level1_Baoli.ts:211`; `Level4_Summit.ts:345`, `:406`; `Level0_Village.ts:360`; `src/core/Engine.ts:1686/1688`.
- **What is wrong:** Each of these spawns with `Math.random() < p` once per rendered frame, so a 144 Hz display emits 2.4x what a 60 Hz one does. Baoli and the summit also spawn while paused (the level update gets dt = 0 but has no guard), so the pools fill and then burst on unpause. The village is guarded against pause. Hidden today by W-01; it will show once W-01 is fixed.
- **Evidence:** `Level1_Baoli.ts:211 if (Math.random() < 0.2) this.particleFX.spawnMist(14);`; `Level0_Village.ts:360 ... && dt > 0 && Math.random() < 0.12 * this.fire`; `ParticleFX.ts:341` caps mist at 200.
- **Reproduce:** read the code; compare spawn counts over 1 s at 60 and 144 Hz.
- **Suggestion:** Accumulate rate x dt and spawn when it passes 1; skip when dt is 0. Effort S.

### W-12 · minor · Dwarka's level GLB is 25.7 MB and uncompressed; the summit draws about 1M triangles

- **Where:** `public/assets/dwarka/dwarka_browser.glb`; `public/assets/levels/charnel_ridge.glb`.
- **What is wrong:** Dwarka is the only level exported without `EXT_meshopt_compression` and without webp textures: 12.4 MB of PNG/JPEG plus about 13 MB of raw geometry. The other levels are 3.8-13.3 MB and use both. The summit's lit view draws 0.9-1.1M triangles (shadow pass included). Beacon_Staircase alone is 50k vertices and each pilaster about 24k. GPU time is fine on this machine (1.6 ms median), but the load is the heaviest.
- **Evidence:** GLB header parse (both tiers): 25,715 KB, 24 images, 12,355 KB of image bytes, no meshopt or webp. Summit 141 calls / 1,092,842 triangles (auditor) and 112 calls / 914,296 (verifier, gameplay camera).
- **Reproduce:** parse the GLB header; `window.perf()` in the summit.
- **Suggestion:** Re-export Dwarka through the same meshopt and webp path as the other levels (likely 8-10 MB). Decimate Beacon_Staircase and the pilasters, which are far from the camera in play. Effort M.

### W-15 · minor (verifier raised from polish) · Summit: the beacon cliff and the ground snow shade as blocky square patches

- **Where:** `charnel_ridge.glb` `Environment_Beacon_Cliff` (Slate_Silhouette, 1024x1024), `Environment_Peak_03`.
- **What is wrong:** In close and mid shots, and in gameplay views of the ground snow at the stair foot, the snow and rock break into axis-aligned square patches that read as voxels. It is not a filtering problem (linear filtering with mipmaps), and the SnowCover shader uses smooth world-space noise. The verifier's likely cause is the baked albedo atlas: hundreds of tiny UV islands with only a few texels each. That is still an inference.
- **Evidence:** images `t2_world/v5_cliff_texture_zoom.jpg`, `t2_world/v5_beacon_from_arena.jpg`, `v2_world/v2_w15_cliff_zoom.jpg`, `v2_world/v2_w01_culled_default.jpg` (ground snow), `v2_world/v2_w15_cliff_texture.jpg` (the atlas).
- **Reproduce:** `__debug.chapter(5,false)`; camera at (0,6,12) looking at (-38,20,-95), fov 12.
- **Suggestion:** Check the bake on Slate_Silhouette, starting from the atlas's texel density. A smoother toon ramp for distant vista rock is a fallback. Effort S-M.

### W-13 · polish (verifier downgraded from minor) · Village: torch-lit gate stone runs very hot

- **Where:** `village_dusk.glb` `Batch_VillageTex_Stone` (gate pillars at (±2.2, 0..3.6, -10.6)); `src/levels/Level0_Village.ts` `TEXTURE_GAIN`.
- **What is wrong:** The stone's colour is scaled to 1.66. The pillars carry the two gate torches, so their faces get very bright, close to clipping. The verifier showed the pillars do not glow by themselves: with the torches off at night they are as dark as the wall. This is a tuning item, not a lighting bug.
- **Evidence:** material colour [1.656,1.656,1.656]. Images: `t2_world/v0_raid_fire_wide.jpg`; `v2_world/v2_w13_night.jpg`, `v2_world/v2_w13_night_torchesoff.jpg`, `v2_world/v2_w13_pillar_close_night.jpg`.
- **Reproduce:** `__debug.chapter(0,false)`; `level.setNight(1)`; camera at (-4,2.2,6) looking at (5,2.5,-6); then set the gate torches to 0 and compare.
- **Suggestion:** Lower the gain for VillageTex_Stone only, or give it a darker toon ramp band. Effort S.

### W-14 · polish · Village diya flames burn from the middle of the oil, not at the wick

- **Where:** `village_dusk.glb` fire_group "lamp" empties at (-4.45/-4.15/-2.65/-2.35, 0.68, 7.47).
- **What is wrong:** A FireField tongue rises from the centre of each clay diya's bowl, while the modelled black wick at the spout stays unlit.
- **Evidence:** images `t2_world/v0_shrine_lamp_close.jpg`, `v2_world/v2_w14_diya_close.jpg`, `v2_world/v2_w14_diya_top.jpg`.
- **Reproduce:** `__debug.chapter(0,false)`; camera at (-4.3,0.85,6.9) looking at (-4.4,0.72,7.5).
- **Suggestion:** Move the four empties to the spout tips in `build_village.py`. Effort S.

### W-16 · polish · Kavach light shaft: hard vertical cylinder edges

- **Where:** `src/cinematics/DivineLight.ts:349-352` (alpha), `:361` (cylinders); Baoli opening shot 6.
- **What is wrong:** The shaft's two nested cylinders have crisp straight edges with no falloff: the alpha depends only on height and a streak term, with no view-angle fade. The auditor also flagged a washed-out frame at about 3.7 s. The verifier showed it is the scripted white flash that covers the attire swap (`DivineLight.ts:452`), so it is by design (see the appendix).
- **Evidence:** images `t2_world/c1_kavach_shaft_t2.jpg`, `v2_world/v2_w16_shaft_t2.jpg`.
- **Reproduce:** `__debug.chapter(1,false)`; `playScene(opening)`; advance until `director.index == 6`, then +2.0 s.
- **Suggestion:** Fade the column's alpha by a view-angle rim term, as AgniBeacon's `vRim` does. Capping the flash's peak is a matter of taste. Effort S.

### W-17 · polish · Dev tooling: `__debug.advance` never ticks the level

- **Where:** `src/core/Engine.ts:1612-1622` (`debugAdvance`).
- **What is wrong:** `debugAdvance` runs fixedUpdate, the camera, the flow, dialogue and particles, but not `levelManager.update`. In stepped captures and tests, FireField time, flicker lights, the sea, rain and the beacon stay frozen at time 0. Both auditors had to tick levels by hand.
- **Evidence:** `uTime` reads 0 before and after `__debug.advance(0.2)` in chapter 0.
- **Reproduce:** `__debug.chapter(0,false)`; read `level.fires.material.uniforms.uTime`; `__debug.advance(0.2)`; read again.
- **Suggestion:** Call `levelManager.update` with an accumulated debug clock inside `debugAdvance`. Effort S.

---

## 3. Story, flow and code

21 findings: 9 minor, 12 polish, no major. Verified 10 confirmed, 6 partly (S-01, S-02, S-03, S-04, S-08, S-09), plus 5 single-source (V3-01 to V3-05). The verifier downgraded S-01 to S-04 from major to minor.

Health check from the auditor's full run (prologue through credits, stepped with `__debug`): zero console errors or warnings, no window errors or unhandled rejections. `npx tsc --noEmit` and the production build pass with no warnings. The production bundle has no `__debug`, `__yudhveer` or tuning code. All 66 voice mp3s are used and every voice id has its file; 19/19 sfx and 10/10 music tracks match. Retrying Chapter I correctly restores the kavach and the lathi. The verifier also saw zero console errors in its runs.

Dialogue line rewrites and costs are in `docs/proposals/DIALOGUE.md`. V3-02, V3-03 and V3-04 below affect how those proposals are recorded.

### S-02 · minor (verifier downgraded from major) · Fight lines can fire on the killing blow and play over the victory

- **Where:** `src/core/Engine.ts:1777-1781` (`updateBeats()` runs before `checkOutcome()`); `Engine.ts:1286-1314` (the victory branch does not clear dialogue; the defeat branch does at `:1293`); `Scene.ts:485-488`.
- **What is wrong:** A boss-health trigger that the killing blow crosses fires on the frame the boss dies, because a dead boss at 0 HP satisfies `bossBelow`. Its line then plays through the victory slow motion (about 3.4 s); the ending scene clears it. Reproduced: with the Guardian held at 50%, killing it fired "It was not always this... Set it free", still speaking 2.5 s into the outro. In normal play this is rare. One blow must take the Guardian from at least 25% to 0, and only a charged ATTACK_3 on a posture-broken Guardian can (126.7 HP against the 112.5 HP band), or the line gap must end on the killing frame. The "teaches charge after the fight" case needs `__debug.win()`.
- **Evidence:** `Engine.ts:1777-1780 case 'play': this.updateHints(); this.updateBeats(); this.checkLoss(); if (this.mode === 'play') this.checkOutcome();`; runtime log `Guru: It was not always this. Something dark binds it. Set it free. [baoli_fight_guru_7]` in mode `outro`.
- **Reproduce:** `__debug.chapter(1,false)`; hold the boss at 50% for about 40 s of `__debug.advance(1)`; kill it (`takeDamage(currentHealth)`); `__debug.advance(0.05)`.
- **Suggestion:** In `updateBeats`, skip `lines` beats once the outcome is decided (call `checkOutcome` first, or bail out when the field is cleared or the target boss is DEAD). Also call `this.dialogue.clear()` on victory, as defeat does. Effort S, risk low.

### S-03 · minor (verifier downgraded from major) · The leaping strike is never taught in game

- **Where:** `src/core/Engine.ts:234`, `:848`; `src/game/Progression.ts:58-60`.
- **What is wrong:** The only teaching for the leap is hint 6, and hints run only in chapters 0 and 1. The leap first appears in the Dwarka kit as a starting ability, not a `taught` one, so no hint, line or callout ever teaches it. In chapter 4 the hint queue is past its end and `can('leap')` is true. The Controls screen does list it ("Leaping strike: Attack while sprinting", `index.html:147`), which is why the verifier rated it minor.
- **Evidence:** `Engine.ts:234 [36, 'Sprint with {sprint} and attack to leap in with a falling strike.', 'leap'],`; `Engine.ts:848 this.hintIndex = chapter.id <= 1 && Settings.get().hints ? 0 : FIRST_FIGHT_HINTS.length;`.
- **Reproduce:** `__debug.chapter(4,false)`; play 40 s; read `hintIndex`, `hintsShown`, `player.can('leap')`.
- **Suggestion:** Show the hint for each newly granted ability on the first chapter that grants it (compare with the previous kit), or make leap `taught` in the Dwarka kit with a teaching beat. Effort S.

### S-04 · minor (verifier downgraded from major) · Shakti, taught by the guru in Chapter I, silently stops working in Chapters II-IV

- **Where:** `src/game/Progression.ts:51-60`.
- **What is wrong:** The Baoli kit teaches `charge`; the Akhada, Island and Dwarka kits leave it out; the summit brings it back. Withholding it is a documented design decision (STORY.md:152-153, "Charge arrives with the magical sword"). The auditor's claim that STORY.md never mentions this is wrong. The real problem is the story: the guru teaches it, then it stops working with nothing on screen to explain why.
- **Evidence:** `Progression.ts:56-58`; runtime `can('charge')` false in chapters 2, 3 and 4.
- **Reproduce:** load chapters 2-4; read `player.can('charge')`.
- **Suggestion:** Your decision. Either add `charge` back to those kits, or explain it in the story (for example, a line from the vanara) and hint when it returns. Effort S. A new voiced line would cost credits.

### S-01 · minor (verifier downgraded from major) · The prologue's shadow is captioned "Andhaka" and says his purpose

- **Where:** `src/game/stories/Prologue.ts:480` (ending shot 4); `src/ui/Dialogue.ts:138` (the speaker label is shown).
- **What is wrong:** The concussed point-of-view shot captions the shadow "Andhaka", and the line says the guru's soul will burn before his god, which pre-empts what the boy learns at Dwarka (STORY.md:79). The text problem is already logged as DIALOGUE.md proposal #4. The new point is the speaker label. STORY.md's "mystery" refers to how Andhaka looks, not his name, and its own line table names the speaker "Andhaka", so this does not break the story outright.
- **Evidence:** `Prologue.ts:480 { speaker: 'Andhaka', text: "A boy with a stick... Your guru's soul will burn before my god. Kneel.", voice: 'andhaka_prologue_kneel' }`.
- **Reproduce:** play the chapter 0 ending; watch shot 4's subtitle.
- **Suggestion:** Free: set the speaker to "A voice" or leave it empty for this line. The text rewrite is in DIALOGUE.md; see V3-03 for which version to record. Effort S. Re-recording needs credits and your approval.

### S-05 · minor · The last three chapters' boss tells are never hinted; those fights have no lines

- **Where:** `src/game/stories/Dwarka.ts` (only beat: `{ fallen: 'shalva' }` at `:223`); `Summit.ts` (no beats); `BossShalva.ts:16`; `BossTakshaka.ts:9`; `BossAndhaka.ts:244-248`.
- **What is wrong:** Shalva's dive (the water boils where he will come up), Takshaka's phase-two flame waves at range, and Andhaka's phase two (he swings sooner and turns faster) have no line, hint or callout. 30 s of Andhaka's fight, including dropping him to 40%, logged zero lines. Chapters I and II teach through voice; IV and V go silent. Andhaka's phase two does have a roar and a stone shake.
- **Evidence:** runtime: `CHAPTERS[5].story.beats.length` is 0; no lines logged over 30 s.
- **Reproduce:** `__debug.chapter(5,false)`; fight for 30 s with the line logger on.
- **Suggestion:** Add `when`-triggered beats for Shalva's first dive, Takshaka's phase two and Andhaka's phase two (lines in DIALOGUE.md; they need credits). Free option: reuse the recorded `prologue_fight_guru_2` "Breathe. Feet first." as a `heroBelow 0.35` beat in the summit, so the ending's "You kept your feet" pays it off. Do V3-02 first. Effort S-M.

### V3-02 · minor · single-source · Mid-fight lines always play in the guru's "inner voice" style

- **Where:** `src/core/Engine.ts:1137`; `src/ui/Dialogue.ts:15-21`, `:140`, `:167`.
- **What is wrong:** Every `lines` beat plays with style `'voice'`, which the code defines as a voice in the hero's head, placed above the HUD with reverb. Any boss line added for S-05 or S-08 would sound like a memory, not a taunt.
- **Evidence:** `Engine.ts:1137 this.dialogue.play(b.beat.lines, 'voice');`; `Dialogue.ts:167 playVoice(buffer, offset, this.entry?.style === 'voice' ? VOICE_WET : 0)`.
- **Reproduce:** read the code.
- **Suggestion:** Add an optional `style` to line beats (default `'voice'`) and use a dry, in-world style for enemy taunts. Do this before recording boss lines. Effort S, risk low.

### V3-03 · minor · single-source · Two proposed rewrites conflict (D-08 vs D-106)

- **Where:** the auditor's dialogue table, D-08 (`Prologue.ts:480`) against D-106 (`Summit.ts:343`).
- **What is wrong:** D-106's option A ("Somewhere there is a boy with a stick, and no one to teach him.") only works as an echo of Andhaka's "A boy with a stick...". The auditor's D-08 rewrite drops that phrase. Its "I came for the old man" also duplicates the guru's next line, "It is me you came for" (`Prologue.ts:566`).
- **Evidence:** DIALOGUE.md #4 option A keeps the phrase: "A boy with a stick... Kneel. I did not come for scraps." (55 characters, about 132 credits).
- **Suggestion:** If D-08 is re-recorded, use DIALOGUE.md's option A so the summit pays it off. Needs your approval and credits. Effort S.

### S-06 · minor · Durga's "No evil will pierce it" has nothing behind it in play

- **Where:** `src/game/stories/Baoli.ts:50`; `src/game/Progression.ts:20-24`; `src/entities/Player.ts:168-177`.
- **What is wrong:** The kavach only swaps the model. Damage, posture and guard are unchanged, so minutes after the promise the Guardian hits as hard as before. This is a design suggestion rather than a bug.
- **Evidence:** `Progression.ts:21-23 'The same clips, sockets and weapons either way; only the model changes.'`; grep finds no kavach logic in `src/combat`.
- **Suggestion:** Your decision. A small, visible mechanic: for example, the first heavy blow of each fight is turned with a gold ripple and no damage, or chip damage through a block is halved. Show it once with a callout ("The kavach holds"). Effort S-M, needs combat tuning.

### S-09 · minor · Dwarka's chapter-complete screen shows the hero with the mace again

- **Where:** `src/game/stories/Dwarka.ts:465` (final shot runs `settleSword`); `:152` (it also runs at the opening).
- **What is wrong:** The ending's last shot puts the mace back in his hands. The complete screen is semi-transparent, so it shows a hero who has just taken the khanda ("I will carry it to the summit") holding the gold mace. The auditor's claim that he stands in a corpse was not reproduced (appendix).
- **Evidence:** `Dwarka.ts:465 { duration: 0.1, fadeIn: 60, cues: [{ at: 0, run: settleSword, essential: true }] },`; runtime `player.weapon.id` is `'mace'` on the cleared screen. Images: `t3_story/dwarka_cleared_behind_screen.jpg`, `v3_story/dwarka_over_run2.jpg`.
- **Reproduce:** finish chapter 4's ending; read `player.weapon.id` on the cleared screen.
- **Suggestion:** Drop the final settle shot (the opening already runs it), or equip the summit kit's khanda for the complete screen. Effort S.

### S-07 · polish · A long run of cutscenes from the prologue's loss to Chapter I's fight

- **Where:** `src/game/stories/Prologue.ts:382-750`; `src/game/stories/Baoli.ts:84-320` (shots at `:90`, `:112`, `:127`).
- **What is wrong:** The player regains control about 90 s into Chapter I (intro 13 s, opening 76 s), after a prologue ending whose fixed shots alone sum to 61.7 s. Three Devi shots (5.6, 5.2 and 5.4 s) have no lines. Hold-to-skip is available, so this is pacing taste.
- **Evidence:** runtime log `'13.5 intro|baoli-opening'`, `'90.5 play|-'`.
- **Suggestion:** Cut 1-2 s from the approach and kneel shots, or let the player walk the stepwell entry (BAOLI_ENTRY to BAOLI_STAND). Effort S.

### S-08 · polish (verifier downgraded from minor) · Takshaka has no line before he dies; the island's naga roar is never paid off

- **Where:** `src/game/stories/Island.ts:115-118`; `src/cinematics/Intros.ts:286-290`.
- **What is wrong:** The island plays a naga roar at the black pool ("Something moves in the water") and nothing comes of it. Takshaka arrives at Dwarka with only a roar and a name card and first speaks as he dies. STORY.md has no "proud, then broken" arc and does not tie the roar to him, so this is optional.
- **Evidence:** `Island.ts:117 run: () => SoundFX.getInstance().playRoar(0.45, 'naga'),`; the chapter 4 line log goes from `dwarka_fall_shalva_5` to `dwarka_end_takshaka_1`.
- **Suggestion:** Optional, needs credits: one arrival line for Takshaka through `say` that ties the pool's roar to him (DIALOGUE.md D-123). Effort S.

### S-10 · polish · The Baoli Guardian's name card calls it an asura

- **Where:** `src/entities/BossBaoli.ts:19`.
- **What is wrong:** STORY.md:37-38 makes the Guardian the stepwell's own protector, bound by Andhaka. "Asura of the stepwell" undercuts that.
- **Suggestion:** "Keeper of the stepwell". Free. Effort S.

### S-11 · polish · Card texts that can never be seen

- **Where:** `src/game/Chapters.ts:52-53`, `:124`; `src/core/Engine.ts:850`, `:1266-1284`, `:1313`, `:1338-1345`; `src/cinematics/Intros.ts:276`.
- **What is wrong:** The prologue's clearedLine is never shown (the loss path skips the callout and the complete screen). Its defeatLine can't appear because the hero is immortal there. The summit's clearedLine is replaced by the boss callout and the credits. The "Raiders" horde card is skipped because the prologue is `introPlaceOnly`. DIALOGUE.md spends a proposal on the summit's clearedLine. See also V3-01.
- **Suggestion:** Show them (the prologue's as a callout over the night shot, the summit's as the first credits line) or mark them unused, and drop the summit clearedLine proposal from DIALOGUE.md. Effort S.

### V3-01 · polish · single-source · Chapter I's and Dwarka's defeat lines can't be shown either

- **Where:** `src/core/Engine.ts:1329-1330`; `src/game/Chapters.ts:68`, `:112`.
- **What is wrong:** The defeat screen shows "<boss> still stands." whenever a living boss is in the enemy list. In Chapter I and Dwarka a boss is always alive when the hero falls, so "The stepwell keeps its guardian." and "Dwarka sinks a little further." are dead text.
- **Evidence:** `Engine.ts:1330 $('defeat-line').textContent = boss ? \`${boss.displayName} still stands.\` : chapter.defeatLine;`.
- **Suggestion:** Show the chapter's defeatLine as a sub-line under "<boss> still stands.", or drop these strings. Effort S, no risk.

### S-12 · polish · Beat hints ignore the "Combat hints" setting

- **Where:** `src/core/Engine.ts:1135` against `:1818`; `Akhada.ts:246`, `:251`, `:262`, `:275`.
- **What is wrong:** First-fight hints respect `Settings.hints`; a beat's own hint (the Akhada's four guard and parry hints) always shows.
- **Suggestion:** Gate beat hints on `Settings.get().hints` too, or exempt the drill on purpose. Effort S.

### S-13 · polish · Stale docs

- **Where:** `docs/STORY.md:94-103`, `:159-160`, `:745-748`, `:558`; `docs/APPROVALS.md:188`; `game asset/README.md:55`; `game asset/voice/VOICES.md:21`; DIALOGUE.md counts.
- **What is wrong:** (a) STORY.md gives the island the mace with no shield; the code starts it with sword and dhal. (b) Milestone 9 says the lines are unrecorded and the credits run about 50 s; all 7 summit mp3s exist and `ROLL_SECONDS` is 72. (c) The island level is 8,142,180 bytes, not 7.5 MB (APPROVALS, STORY.md and README:55; README:77 says 8.1 MB). (d) VOICES.md lists `guru_ch1_breathe`, which is not in the game. (e) DIALOGUE.md's counts predate the Durga lines and the crowning line.
- **Suggestion:** Update each in place. Effort S.

### S-14 · polish · Asset credits cover only the island and the village

- **Where:** `docs/ASSET_CREDITS.md`; `src/ui/Credits.ts:15-40`.
- **What is wrong:** Dwarka's Poly Haven CC0 skies and textures are not in ASSET_CREDITS.md, and other levels' sources are not documented. The roll lists the CC0 Ganesha under a "Sketchfab, CC BY 4.0" heading. CC0 needs no credit, and the roll already has a generic Poly Haven entry, so this is docs accuracy only.
- **Suggestion:** Add a Dwarka section (and a line per other level); move the CC0 item under its own heading. Effort S.

### S-15 · polish · The hero's posture break still uses a placeholder clip

- **Where:** `src/entities/characters/Yodha.ts:50`.
- **What is wrong:** `POSTURE_BROKEN` plays `crouch_idle`, marked "PLACEHOLDER: no kneel / stagger-down clip", but the hero rig now has `head_impact_to_knees` and `kneeling_idle`, which the prologue uses (`Prologue.ts:416`, `:430-431`).
- **Suggestion:** Try a short section of `head_impact_to_knees`. Effort S.

### S-16 · polish · `?debug` turns on the combat overlay in production builds

- **Where:** `src/core/Engine.ts:470`.
- **What is wrong:** F3 opens the combat overlay in any build whose URL has `?debug`. The chapter jump is DEV-only. Probably intended.
- **Suggestion:** Keep it if intended; otherwise gate it on DEV only. Effort S.

### V3-04 · polish · single-source · The re-record cost estimate is low

- **Where:** the auditor's dialogue table (D-09) and summary.
- **What is wrong:** D-09's option A is 52 characters (125 credits), not 48. All option-A rewrites of existing lines total about 3,084 credits, above the stated 2,700-3,000. Adding the four new fight lines (D-122 to D-125) brings it to about 3,611.
- **Suggestion:** Budget about 3,100 credits for all rewrites of existing lines (about 1,700 for the must-fix tier only) and about 530 for the four new fight lines. Effort S.

### V3-05 · polish · single-source · APPROVALS.md's crowning-line table is out of date

- **Where:** `docs/APPROVALS.md:15-31`.
- **What is wrong:** The header records the decision ("new ruler", voice id `summit_crown_andhaka_1`). The body below still says subtitle only, gives option A as "Let the gods see their king.", and says to record it as `summit_andhaka_crowned`. The code (`Intros.ts:38`), STORY.md and VOICES.md agree with the header.
- **Suggestion:** Label the old body as the original proposal, or fix row A. Effort S.

---

## Fix status

Updated as each fix batch lands on main. "Fixed" means merged after a re-check by the orchestrator (typecheck, build,
and a look at the before and after captures in `E:/hindan/game asset/audit/fixes/`).

| Finding | Status | Commit | Notes |
|---|---|---|---|
| W-01 | Fixed | d506766 | The four particle systems draw; sparks are white-hot streaks, flames teardrops, embers sparks. |
| W-11 | Fixed | d506766 | Spawning is rate x game time (`Emitter`); nothing while paused. |
| W-17 | Fixed | d506766 | `__debug.advance` ticks the level on its own clock. |
| W-02, V2-01, W-09 | Fixed | d506766 | Island flames in FireField; lamp lights off the rock, gentler falloff. The buried shelf diyas are drawn out onto a ledge (the real fix belongs in `build_island.py`). |
| W-03, W-10 | Fixed | d506766 | Summit deepams in dark bronze with wick flames; braziers smoulder as coals and catch into fire. |
| Summit lanterns | Partly | d506766 | No `Lantern_Flame` meshes exist; the vista-shrine lantern heads got a warm glow. |
| W-04 | Fixed | d506766 | Baoli: every near flame in FireField, no ink outline; near glow halos fade within 1.5-6 m. |
| W-05 | Fixed | d506766 | Akhada: 16 deepams in FireField with the grow-in kept; flickering grazers; two faint amber lights. |
| W-06 | Fixed | d506766 | Dwarka: 8 diyas lean and gutter in the storm's wind; two lights. |
| W-07 | Fixed | d506766 | Takshaka's flame wave: tongues on a forward-bowed arc, bloom, embers, a fading scorch. |
| W-13, W-14, W-16 | Fixed | d506766 | Gate stone gain lowered; diya flames at the wick; soft edges on the kavach shaft. |
| C-04 | Fixed | b54586a | Real finger bones on all five fist rigs (the hero 28 to 68 joints): hands close on what they hold, relax when empty, lie flat for prayer. Every socket unchanged to 0.000 mm. |
| C-06 | Fixed | b54586a | A `praying_anjali` clip: palms pressed together before the sternum (Durga beat, summit, the mandir villager). |
| C-11 | Fixed | b54586a | Mace grip 6 cm up the haft; the left fist closes 8.5 cm above the butt. |
| S-15 | Fixed | b54586a | An authored `posture_break` clip: struck, down on one knee, up within 2.5 s. |
| C-12 | Not done | | The guru's staff arm is held still in every clip, so the asymmetry never shows; re-rigging would redo all his weights. |

---

## Fire and light inventory

Every flame and light source the world track found, with its verdict. "Pyramid" means a static or barely animated low-poly mesh flame. Light verdicts are the auditor's; flame verdicts were re-checked by the verifier except where noted.

| Level | Source | Verdict | Finding |
|---|---|---|---|
| L0 Village | Gate torches x2 (FireField) | Good | |
| L0 Village | Mandir diyas x4 (FireField) | Good, but the flame sits mid-bowl, not at the wick | W-14 |
| L0 Village | Hearth; burning roof, haystack, far roofs, embers (FireField) | Good | |
| L0 Village | Smoulder smoke, sparks and ash | Good | |
| L0 Village | Lights Torch_Gate_E/W, Fire_Cooking, Shrine_Lamp, RaidFire_Light, HayFire_Light | Acceptable: they flicker; roof and hay follow the fire, the others use their own sines | |
| L0 Village | GateLight spot | Acceptable | |
| L0 Village | ParticleFX roof licks | Invisible | W-01 |
| L1 Baoli | Deepastambha_Flames x4 (Flame_Core + Flame_Outer) | Pyramid | W-04 |
| L1 Baoli | Statue_Kaali_Lamps | Pyramid (not re-captured by the verifier; same material pattern) | W-04 |
| L1 Baoli | Deco_Diyas, Deco_HangingLamps | Pyramid | W-04 |
| L1 Baoli | FX_FortLamps, FX_FortPathLamps (distant bloom dots) | Acceptable | |
| L1 Baoli | FX_LampGlow, FX_KaaliGlow, FX_HangingGlow | Acceptable | |
| L1 Baoli | Torch_Light_01..04 (flicker) | Acceptable | |
| L1 Baoli | Kaali_Uplight, Spot, Rim | Acceptable | |
| L1 Baoli | ParticleFX mist | Invisible | W-01 |
| L2 Akhada | BR_Deepam_Static_Flames (16 lamps) | Pyramid, fully static | W-05 |
| L2 Akhada | Brass diya lantern flames | Pyramid | W-05 |
| L2 Akhada | Vermillion grazers x4 | Acceptable by design, but red, unflickering and unlike the amber flames | W-05 |
| L2 Akhada | Murals' lamp halo | Acceptable | |
| L3 Island | Flame_0..17 (wall torches, braziers, shelf diyas) | Pyramid (52-vertex cones) | W-02 |
| L3 Island | Flame_Tier_E/W (shrine deepastambhas) | Pyramid, and swings about 7 m each flicker | W-02, V2-01 |
| L3 Island | 8 pooled lamp lights | Acceptable, but blow out the rock | W-09 |
| L3 Island | Moon_Spill; mace halo | Acceptable | |
| L4 Dwarka | BR_Batch_09_Diya_Flame (8 diyas) | Pyramid (static capsule, no light) | W-06 |
| L5 Summit | AgniBeacon column, flame, embers, light | Good | |
| L5 Summit | VFX_Brazier_Flame_E/W | Pyramid (spike crown; sinks into the bowl when smouldering) | W-10 |
| L5 Summit | Lantern_Flame | Pyramid by code path; not captured, and the verifier found no separate meshes (probably batched) | W-03 |
| L5 Summit | Temple_Deepam x2 | No visible flame; their lights are acceptable | W-03, W-01 |
| L5 Summit | Point_Brazier_Fire_E/W, Spot_Agni_Beacon | Acceptable | |
| Cutscene | Kavach light shaft and motes (DivineLight) | Acceptable; hard cylinder edges | W-16 |
| Cutscene | Devi's eyes, Shiva's awakening | Not captured | |
| Projectile | Takshaka's flame wave | Pyramid (flat red torus) | W-07 |

Performance: all six levels drew in 0.7-1.6 ms GPU median at 1024x768 on an RX 9060 XT (auditor's GPU timer; the verifier re-checked only the summit's call and triangle counts).

| Level | View | Draw calls | Triangles | GPU median / p90 |
|---|---|---|---|---|
| Village | raid fire, night | 88 | 273k | 0.84 / 1.20 ms |
| Baoli | arena | 211 | 466k | 1.20 / 1.32 ms |
| Akhada | night | 299 | 730k | 1.39 / 1.41 ms |
| Island | tunnel | 114 | 445k | 0.71 / 0.75 ms |
| Dwarka | arena | 89 | 524k | 1.11 / 1.18 ms |
| Summit | lit | 141 | 1.09M | 1.61 / 2.05 ms |

---

## Coverage

**Characters, wielding and rigging.**
- Checked:
  - The hero in the kavach and in training attire: bones, sockets, fists, shoulders, and the praying and kneeling poses (Blender).
  - In game: the lathi idle and club combo (ch1); sword and dhal idle and REST (ch2); the mace two-handed (ch4); khanda and dhal (ch5).
  - The Dwarka khanda take-up; the sheathed khanda; the Akhada dhal hand-off; the summit dhal laid down.
  - Andhaka's coronation (crown and cleaver: no defect found).
  - Grips and fists of the vanara, Vetala, Baoli Guardian and Shalva.
  - The guru's idle and walk, and shoulder asymmetry; the prologue's dead and hiding villagers.
  - Shoulder joint height for 12 rigs; rig heights from the manifests.
- Holds up well: Andhaka's coronation, the mace laid through both fists, the Vetala's own grips, the summit dhal laid down (2 cm above the stone), and the hero's shoulder joints.
- Not checked:
  - The island mace pick-up (it happens during a cut to black).
  - The Baoli lathi re-show; the lathi's and mace's REST holds out of combat.
  - Foot planting on slopes and steps; the boatman; Andhaka's full throne laugh; T-poses at scene starts beyond those stepped.
  - The rakshasa, Mayavi, Yatudhana, Takshaka and island monsters in close-up.
  - SpearWarrior (not placed in any chapter); forearm twist in extreme clips; whether the face-down dead man floats (inconclusive).
  - Verifier: the C-09 idle left-hand claim, and whether a natural playthrough frames the C-08 spot.
- The verifier confirmed that the kavach in the Baoli praying shot at 9.9 s is correct, not a debug artifact.

**World, fire and light.**
- Checked:
  - An inventory of every light and flame mesh in all six levels.
  - Close-up and gameplay-distance captures of every fire; frame diffs for animation; light flicker.
  - The village raid fire, haystack and night; the summit smoulder and lit states.
  - The ParticleFX culling A/B; Takshaka's flame wave; Dwarka's rain, sea, foam and diyas; the kavach shaft.
  - `renderer.info` and GPU time per level; GLB size breakdown; a chapter-switch leak loop.
  - Code review of FireField, AgniBeacon, GLBLevel, the level fire code, ParticleFX, ProjectileManager and CharacterRig.dispose.
- Not checked:
  - Gore Off/Low/Full in a live fight; Shade, Concussion, the impact camera, Shalva's dive, tide extremes.
  - Summit snow and mist sorting, lightning, sky seams; time-of-day continuity beyond the village.
  - Shadow acne, LOD pops, z-fighting; Devi's eyes and Shiva's awakening.
  - Frame time at 1080p or on integrated GPUs.
  - Verifier: GPU timer numbers (re-checked only the summit's counts), the Baoli Kaali lamp close-up, and the claimed array-material throw in `CharacterRig.dispose`.

**Story, flow and code.**
- Checked:
  - A full stepped run of every chapter's intro, opening, fights, endings, retry, defeat and cleared screens, credits and return to title, with errors hooked and every line logged.
  - Every player-facing line and card in the code against STORY.md and DIALOGUE.md (none of DIALOGUE.md's 15 proposals is applied yet).
  - Voice, sfx and music files against the code; tsc and the production build; debug gating in the bundle.
  - A TODO/PLACEHOLDER sweep; credits against ASSET_CREDITS; APPROVALS against the code.
- Not checked:
  - Hold-to-skip in the browser; settings persistence at runtime.
  - The island's in-cave beats; two Akhada beats; the credits' real-time length.
  - Deep disposal between chapters; the quit-mid-scene race for Dwarka's sword state.
  - Verifier: the prologue ending's real runtime, the island in-cave beats, the Yatudhana fight.
- Chapter V is not a scripted loss in the code (`SUMMIT_STORY` has no `loss`); both tiers tested it as a normal win.
- Side effect: the auditor's run raised the saved progress in the Browser pane's localStorage for `localhost:5199` to 6, which unlocks every chapter. It was at most 2 before. Reset it if you want a fresh save.

---

## Recommended fix batches

In order, each for separate approval. Efforts are the sum of the per-finding estimates (S/M/L). None of these batches needs Meshy credits; only batch 9 needs voice credits.

1. **Prop hold quick fixes.** C-01 + V1-02 (khanda scale), C-03 (sword grip), C-10 (hide the Vetala's spare swords), C-08 (move the hiding villager). Effort 4 x S. Code only, low risk.
2. **Pick-ups and hand-offs.** C-02 (khanda from the stone, mace laid down), C-07 (vanara hands over the dhal). Effort 2 x M. Low risk.
3. **Hands.** C-04 (closed fists), then C-06 (anjali prayer) and C-11 (mace left fist). Optional C-12 (guru shoulder). Effort L (finger bones) or M (curl fix), plus M + S (+ S). **Needs your decision:** finger bones or a better baked curl. Rebuilds 5 GLBs with the local scripts; risk medium.
4. **Scabbard and sheath angle.** C-05 + V1-01. Effort M. Low risk. Until then, consider making the sets non-stowable.
5. **Two-handed lathi.** C-09. Effort S-M. Low risk.
6. **Particles on.** W-01 (turn off culling), W-11 (rate x dt, no spawns while paused), W-17 (debug clock ticks levels). Effort 3 x S. Do W-01 and W-11 together, then re-tune spark and flame sizes.
7. **Real fire everywhere (FireField rollout).** Per level, in this order:
   - Island: W-02 + V2-01 + W-09. Effort M + S + S.
   - Summit: W-03 + W-10. Effort S-M x 2.
   - Baoli: W-04. Effort M (S for the quick unlit/no-ink step).
   - Akhada: W-05. Effort M.
   - Dwarka: W-06, with wind lean. Effort M.
   - Takshaka's flame wave: W-07. Effort M.
   - Village diya wicks: W-14. Effort S.
8. **Flow bugs and teaching.** S-02 (no lines on the killing blow; clear dialogue on victory), S-03 (teach the leap), S-12 (beat hints follow the setting), S-09 (no mace on the Dwarka complete screen), S-11 + V3-01 (dead card text). Effort about 6 x S. **Your decision on S-04** (restore charge in II-IV, or explain it in the story).
9. **Story and voice.** V3-02 first (a dry style for enemy lines), then S-05 (boss tell lines, plus the free "Breathe. Feet first." reuse), S-01 + V3-03 (prologue speaker label free; re-record with the "boy with a stick" phrase kept), S-08 (optional Takshaka arrival line), S-10 (free epithet), S-06 (a kavach mechanic: **your decision**, needs combat tuning). Effort S-M overall. **Needs voice credits:** about 3,100 for all rewrites of existing lines (about 1,700 for the must-fix tier), plus about 530 for the four new fight lines (V3-04). The lines are in `docs/proposals/DIALOGUE.md`.
10. **Memory and size.** W-08 (dispose the greybox prop and normal maps), W-12 (meshopt and webp re-export of Dwarka; decimate the summit staircase and pilasters). Effort S-M + M.
11. **Light and material polish.** W-15 (summit cliff atlas), W-13 (village stone gain), W-16 (soft shaft edges), S-15 (posture-break clip), S-07 (shorter Chapter I lead-in). Effort S-M + 4 x S.
12. **Docs and credits.** S-13, S-14, V3-05, S-16. Effort 4 x S.

---

## Appendix: filtered out by verification

No whole finding was rejected. Tier 2 confirmed every Tier 1 finding in full or in part. These parts of findings were not reproduced or were shown to be wrong, and are left out of the findings above:

| Id | Claim | Why it was filtered |
|---|---|---|
| W-01 | Severity: blocker | Combat and the story still work, and blood FX marks hits with gore on. Downgraded to major. |
| W-16 | The whole frame washing out at about 3.7 s is a defect | It is the scripted white flash that covers the kavach swap (`DivineLight.ts:452`), by design. |
| W-13 | The gate pillars glow at night by themselves | With the gate torches off they are as dark as the wall. The brightness comes from the torches mounted on them. |
| W-08 | `CharacterRig.dispose` throws on material arrays and is the main leak | No throw was observed. The main geometry leak is `Character.mountRig` detaching the greybox prop before dispose. Severity also lowered to minor. |
| W-07 | The flame-wave torus has an ink outline | No outline in the verifier's capture. |
| C-01 | The khanda is 1.50 m "grip to tip" | 1.50 m is pommel to tip. Grip to tip is 1.24 m. The 1.43x scale stands. |
| C-05 | The left hand passes through the sheathed hilt | The verifier measured 12.6 cm from the blade line, a near miss. Not confirmed. |
| C-08 | The overlap is visible on screen | No shot camera frames it during the dusk shots (0-55 s scan). Downgraded to minor. |
| C-12 | Mesh-top-above-joint numbers (8.1 vs 17.7 cm) | The measure is unreliable; it reads asymmetric on the symmetric hero too. Only the joint asymmetry stands. |
| S-01 | The speaker label breaks the "mystery" in STORY.md | STORY.md's mystery is about how he looks, and its own line table names the speaker "Andhaka". Downgraded to minor. |
| S-02 | It happens in normal fights and teaches charge after the fight | It needs one blow to cross the 25% band (only a charged blow on a broken posture can), and the charge case needs `__debug.win()`. |
| S-03 | The leap is never taught | The Controls screen documents it (`index.html:147`). |
| S-04 | STORY.md never says charge is removed | STORY.md:152-153 documents it. |
| S-08 | Takshaka's "proud" half is missing from his arc | STORY.md has no such arc and does not tie the pool roar to Takshaka. |
| S-09 | The hero stands overlapping a corpse | In the verifier's run Takshaka's body was 2.03 m away. A death clip frozen mid-fall in one run was not reproduced in a second. |
| V3-04 | Re-record cost "about 2,700-3,000 credits" | Recounted: about 3,084 for existing lines, about 3,611 with the new fight lines. |

# Asset credits

Third-party assets in the game, with their licences. The originals and their licence files are kept outside the repo in
`game asset/` (see its README). This list grows as assets are added.

## Chapter III, the island's caves (`public/assets/levels/island_caves.glb`)

Built by `game asset/levels/03_island/build_island.py` from props prepared by `prepare_cave_props.py`. Sources and
download dates: `game asset/levels/03_island/sources/sources.json`.

### 3D models (Sketchfab, CC BY 4.0)

**Changes made to every model below** (and to the CC0 one after them): decimated to a game budget, rescaled and re-origined, textures resized
(512 to 1024 px) and recoloured toward the cave's palette (or replaced by a flat colour), metal, roughness and emission
maps dropped, and the result merged into the level's GLB. Individual changes are noted per model.

| Model | Author | Licence | Used as | Triangles in game |
|---|---|---|---|---|
| [Cave Rocks](https://sketchfab.com/3d-models/cave-rocks-4101c07c6a754f85962c6b516af4713a) | [Splanyic](https://sketchfab.com/splanyic) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | rock wall slabs laid over the shell in every chamber, boulders and slabs where the walls meet the floor. Split into separate pieces. | 1.3k, 1.2k, 1.2k, 350, 330 |
| [Rockwall](https://sketchfab.com/3d-models/rockwall-0740082617924a1b973201881594091a) | [DJMaesen](https://sketchfab.com/bumstrum) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | rock columns by the tunnel mouths. | 1.2k |
| [Stalagmites, Collums and Stalacites](https://sketchfab.com/3d-models/stalagmites-collums-and-stalacites-3e06d8e13be64faf85d6ba6a1049b769) | [RBG_illustrations](https://sketchfab.com/RBG_illustrations) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | the stalagmites used as cover (hall, pool) and the hanging stalactites. Split into separate pieces; stretched per placement. | 246, 168, 168, 168 |
| [Stalagmite Formation 1](https://sketchfab.com/3d-models/stalagmite-formation-1-da1f7a9e2fe04549a03d479d938b3088) | [Kallvin](https://sketchfab.com/Kallvin) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | a floor-to-roof column in the hall of bones. | 2.4k |
| [Stalagmite Formation 2](https://sketchfab.com/3d-models/stalagmite-formation-2-736323ad07334c49be26da6f44f0c609) | [Kallvin](https://sketchfab.com/Kallvin) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | a floor-to-roof column in the black pool chamber. | 2.0k |
| [Pile of Skulls](https://sketchfab.com/3d-models/pile-of-skulls-11d46d32494c44218a55192adc067e57) | [Abimael Gonzalez](https://sketchfab.com/abimaelgonzalez) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | skull piles in the hall of bones. | 833 |
| [Bone Pile](https://sketchfab.com/3d-models/bone-pile-1b624083cb604782a0a0dfdb8d17a6c6) | [Kalciumm](https://sketchfab.com/Kalciumm) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | bone piles in the hall of bones. Flat bone colour (the source has no texture). | 1.6k |
| [Buddhist Ceremonial Gateway (Torana)](https://sketchfab.com/3d-models/buddhist-ceremonial-gateway-torana-1d3908a8b30a4932b5df17e1276e5f1a) | [EqualizerX](https://sketchfab.com/EqualizerX) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | the stone gateway behind the altar. Darkened to weathered stone. | 20k |
| [Low poly India Temple Wall](https://sketchfab.com/3d-models/low-poly-india-temple-wall-e3604a8207d448338485fb164c8f30c1) | [Mega 3D](https://sketchfab.com/3dlandscape) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | the carved relief on the altar's face and on the shrine's back wall. | 4.0k |
| [Kutthu Vilakku](https://sketchfab.com/3d-models/kutthu-vilakku-aa1dd5a06d6f443ba9145e4183b2d7e7) | [nitheeshkumaarmv](https://sketchfab.com/nitheeshkumaarmv) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | the two brass lamp pillars by the altar. Recoloured as flat brass; the game's flames sit in its top bowl. | 6.5k |
| [Brazier](https://sketchfab.com/3d-models/brazier-653f30c424874a5a8ba4d71cef51d94e) | [mSameja](https://sketchfab.com/mSameja) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | the three braziers (hall, pool). The game's fire burns in its basket. | 2.2k |
| [diwali diya](https://sketchfab.com/3d-models/diwali-diya-627dea0363f042d3b0c906c90e922aec) | [sinuboy072](https://sketchfab.com/sinuboy072) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | the clay diyas on the wall shelves and the altar. Its own flame removed (the game's flame burns in its spout); flat clay colours. | 800 |
| [Medieval Wall Torch](https://sketchfab.com/3d-models/medieval-wall-torch-77db436da2844cbfb4dde0bb9b396835) | [Kigha](https://sketchfab.com/Kigha) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | the two wall torches. | 1.7k |
| [Coiled Rope 2](https://sketchfab.com/3d-models/coiled-rope-2-e6fe8fedd3d04b1dac3e32e0dd515cbb) | [TepidGames](https://sketchfab.com/TepidGames) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | the rope at the landing's mooring post. Flat rope colour. | 1.6k |
| [Flat rocks](https://sketchfab.com/3d-models/flat-rocks-b76813cc177248418639026b06bc9745) | [DJMaesen](https://sketchfab.com/bumstrum) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | the black pool's rim, the landing's stepping stones, floor-edge stones. | 410, 556, 348, 128 |
| [Rubble](https://sketchfab.com/3d-models/rubble-9a180893d6454f68a764e62be3fc5c92) | [Pert Doherty](https://sketchfab.com/pertdoherty) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | rubble at the walls' feet. | 320 |
| [Hindu Temple Bell](https://sketchfab.com/3d-models/hindu-temple-bell-fd30810e3fa84866b1b4f767c083ea6d) | [Rushat Saiyush J Narayan](https://sketchfab.com/rushat_saiyush) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | a brass bell among the offerings. Flat brass colour. | 1.6k |
| [Assorted Old Pots](https://sketchfab.com/3d-models/assorted-old-pots-7795c6a5fa144bfcb1c33041c71eab00) | [Kigha](https://sketchfab.com/Kigha) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | clay pots among the offerings. Split into separate pots. | 900 each |
| [Indian Talwar Weapon ( low poly )](https://sketchfab.com/3d-models/indian-talwar-weapon-low-poly-9f17d36c21e5405baddf548dc2b66489) | [Sangam Senapati](https://sketchfab.com/sangam04) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | talwars in the hall and laid at the dais. | 1.4k |
| [Indian dhal (shield), 19th century](https://sketchfab.com/3d-models/indian-dhal-shield-19th-century-fca1088c468c480a845977189d66bf59) | [Pedram Ashoori](https://sketchfab.com/pedramashoori) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | split dhals in the hall and at the dais. | 1.6k |
| [Skeleton Sitting](https://sketchfab.com/3d-models/skeleton-sitting-f06c95b499dd465aafe3338fe2b7a30e) | [Buzzie](https://sketchfab.com/Buzzie) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | a dead seeker slumped against the hall wall. | 7.0k |

### 3D model (Sketchfab, CC0)

| Model | Author | Licence | Used as | Triangles in game |
|---|---|---|---|---|
| [Ganesha, 10th - 11th C CE](https://sketchfab.com/3d-models/ganesha-10th-11th-c-ce-375c670515684977b6ec05be115366ac) | [Minneapolis Institute of Art](https://sketchfab.com/artsmia) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | the old idol by the shrine's door. | 9.0k |

The Mia scan (Minneapolis Institute of Art) is CC0 and needs no credit; it is credited as a courtesy, under its own
heading in the credits roll too (it used to sit under the CC BY one).

The boat at the landing (2026-10-05) is not a download: it is a Meshy 7 model made for the game
(`game asset/levels/03_island/sources/boat_meshy7.glb`, 15k triangles, prepared as `props/boat.glb`: turned, scaled to
5.5 m, its 2k map graded), with code-built reed mats round its canopy. It replaced Sketchfab's "Old Boat" by
donnichols (CC BY 4.0), which is no longer in the game and no longer credited.

In the CC BY form the authors ask for (each model's `license.txt`):

- This work is based on "Cave Rocks" (https://sketchfab.com/3d-models/cave-rocks-4101c07c6a754f85962c6b516af4713a) by Splanyic (https://sketchfab.com/splanyic) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Rockwall" (https://sketchfab.com/3d-models/rockwall-0740082617924a1b973201881594091a) by DJMaesen (https://sketchfab.com/bumstrum) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Stalagmites, Collums and Stalacites" (https://sketchfab.com/3d-models/stalagmites-collums-and-stalacites-3e06d8e13be64faf85d6ba6a1049b769) by RBG_illustrations (https://sketchfab.com/RBG_illustrations) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Stalagmite Formation 1" (https://sketchfab.com/3d-models/stalagmite-formation-1-da1f7a9e2fe04549a03d479d938b3088) by Kallvin (https://sketchfab.com/Kallvin) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Stalagmite Formation 2" (https://sketchfab.com/3d-models/stalagmite-formation-2-736323ad07334c49be26da6f44f0c609) by Kallvin (https://sketchfab.com/Kallvin) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Pile of Skulls" (https://sketchfab.com/3d-models/pile-of-skulls-11d46d32494c44218a55192adc067e57) by Abimael Gonzalez (https://sketchfab.com/abimaelgonzalez) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Bone Pile" (https://sketchfab.com/3d-models/bone-pile-1b624083cb604782a0a0dfdb8d17a6c6) by Kalciumm (https://sketchfab.com/Kalciumm) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Buddhist Ceremonial Gateway (Torana)" (https://sketchfab.com/3d-models/buddhist-ceremonial-gateway-torana-1d3908a8b30a4932b5df17e1276e5f1a) by EqualizerX (https://sketchfab.com/EqualizerX) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Low poly India Temple Wall" (https://sketchfab.com/3d-models/low-poly-india-temple-wall-e3604a8207d448338485fb164c8f30c1) by Mega 3D (https://sketchfab.com/3dlandscape) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Kutthu Vilakku" (https://sketchfab.com/3d-models/kutthu-vilakku-aa1dd5a06d6f443ba9145e4183b2d7e7) by nitheeshkumaarmv (https://sketchfab.com/nitheeshkumaarmv) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Brazier" (https://sketchfab.com/3d-models/brazier-653f30c424874a5a8ba4d71cef51d94e) by mSameja (https://sketchfab.com/mSameja) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "diwali   diya" (https://sketchfab.com/3d-models/diwali-diya-627dea0363f042d3b0c906c90e922aec) by sinuboy072 (https://sketchfab.com/sinuboy072) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Medieval Wall Torch" (https://sketchfab.com/3d-models/medieval-wall-torch-77db436da2844cbfb4dde0bb9b396835) by Kigha (https://sketchfab.com/Kigha) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Coiled Rope 2" (https://sketchfab.com/3d-models/coiled-rope-2-e6fe8fedd3d04b1dac3e32e0dd515cbb) by TepidGames (https://sketchfab.com/TepidGames) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Flat rocks" (https://sketchfab.com/3d-models/flat-rocks-b76813cc177248418639026b06bc9745) by DJMaesen (https://sketchfab.com/bumstrum) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Rubble" (https://sketchfab.com/3d-models/rubble-9a180893d6454f68a764e62be3fc5c92) by Pert Doherty (https://sketchfab.com/pertdoherty) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Hindu Temple Bell" (https://sketchfab.com/3d-models/hindu-temple-bell-fd30810e3fa84866b1b4f767c083ea6d) by Rushat Saiyush J Narayan (https://sketchfab.com/rushat_saiyush) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Assorted Old Pots" (https://sketchfab.com/3d-models/assorted-old-pots-7795c6a5fa144bfcb1c33041c71eab00) by Kigha (https://sketchfab.com/Kigha) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Indian Talwar Weapon (  low poly )" (https://sketchfab.com/3d-models/indian-talwar-weapon-low-poly-9f17d36c21e5405baddf548dc2b66489) by Sangam Senapati (https://sketchfab.com/sangam04) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Indian dhal (shield), 19th century" (https://sketchfab.com/3d-models/indian-dhal-shield-19th-century-fca1088c468c480a845977189d66bf59) by Pedram Ashoori (https://sketchfab.com/pedramashoori) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
- This work is based on "Skeleton Sitting" (https://sketchfab.com/3d-models/skeleton-sitting-f06c95b499dd465aafe3338fe2b7a30e) by Buzzie (https://sketchfab.com/Buzzie) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.

### Textures (Poly Haven, CC0)

Made into neutral detail maps (divided by their mean colour, mostly desaturated, softened for the cel shading)
and multiplied by the level's own vertex colours; 1-2k colour, 0.5-1k normal maps.

| Texture | Authors | Licence | Used on |
|---|---|---|---|
| [Cliff Side](https://polyhaven.com/a/cliff_side) | James Ray Cock, Jenelle van Heerden, Dario Barresi | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | the cave's walls and roof (its strata) |
| [Rocks Ground 02](https://polyhaven.com/a/rocks_ground_02) | Rob Tuytel | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | the cave floor |
| [Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry) | Dimitrios Savva, Rico Cilliers | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | the shrine's dais and altar |

Poly Haven assets are CC0 and need no credit; they are credited as a courtesy.

### Downloaded, not used

- [Cliff](https://sketchfab.com/3d-models/cliff-082da1166a814c6e9c9e6c1b38159e4e) by DJMaesen (CC BY 4.0): a candidate, not in the game.
- [Fullpillar](https://sketchfab.com/3d-models/fullpillar-917cce56a480404d9c80b74d0214e3f0) by Howling.Wolf (CC BY 4.0): a candidate, not in the game.

## Prologue, the village (`public/assets/levels/village_dusk.glb`, the villagers, the prologue's and summit's clips)

Built by `game asset/levels/00_village/build_village.py` (and, for the people, `game asset/characters/build_character.py`).
Sources: `game asset/levels/00_village/sources/` (Poly Haven's list in `polyhaven/polyhaven.json`).

### The mandir (Meshy)

The guru's shrine by the south wall is generated for this game with Meshy (Meshy 7, image to 3D from
`game asset/concepts/mandir_B.png`; `sources/mandir_meshy7.glb`, 18.2k triangles, its 2k colour map), scaled to a
5.4 m village shrine. Made for the game; no third-party licence.

### Textures (Poly Haven, CC0)

Made into neutral detail maps (divided by their mean colour, mostly desaturated, contrast softened for the cel shading,
1k or 512 px) and multiplied by the village's own vertex colours.

| Texture | Authors | Licence | Used on |
|---|---|---|---|
| [Clay Plaster](https://polyhaven.com/a/clay_plaster) | Amal Kumar | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | the mud walls, the huts' plastered walls, the planters |
| [Reed Roof 04](https://polyhaven.com/a/reed_roof_04) | Rob Tuytel | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | the huts' thatch, the haystacks, the baskets, the cart's fodder |
| [Dry Ground 01](https://polyhaven.com/a/dry_ground_01) | Rob Tuytel | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | the courtyard's packed earth and the path |
| [Aerial Sand](https://polyhaven.com/a/aerial_sand) | Rob Tuytel | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | the dunes |
| [Red Sandstone Wall](https://polyhaven.com/a/red_sandstone_wall) | Amal Kumar | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | the gateway, the house, the well, the neem's chabutra |
| [Old Planks 02](https://polyhaven.com/a/old_planks_02) | Rob Tuytel | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | the gate's doors, charpais, the cart, posts, spear shafts |
| [Bark Brown 02](https://polyhaven.com/a/bark_brown_02) | Rob Tuytel | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | the neem and the khejri trees |

(Patterned Clay Wall by Dario Barresi, Dimitrios Savva and Rico Cilliers was downloaded as a candidate and is not used.)

### 3D models reused from the island (Sketchfab, CC BY 4.0)

The village reuses these props as prepared for Chapter III (credited above, with their CC BY lines): "Assorted Old
Pots" by Kigha (the clay pots by the well, the house and the huts, a water pot dropped on its side), "Indian Talwar
Weapon (low poly)" by Sangam Senapati and "Indian dhal (shield), 19th century" by Pedram Ashoori (the weapons the fight
left in the dust), "diwali diya" by sinuboy072 (the lamps on the mandir's plinth), "Coiled Rope 2" by TepidGames (by
the well), "Rubble" by Pert Doherty (at the broken gate and the burnt hut). Everything else in the village (huts, walls,
gate, house, charpais, the bullock cart, haystacks, baskets, spears, cloth lines, the tulsi planters, charred beams) is
built by the script.

### The villagers (Mixamo)

Placeholders for the prologue's villagers, from Adobe Mixamo's free character library (royalty-free for use in games
under Mixamo's terms; credited as a courtesy), chosen for clothes that could pass for a Rajasthani village (no modern
dress), rebuilt through the game's pipeline (scaled, decimated where heavy, textures capped at 1k), their clothes
re-dyed by `villager_dye.py`:

| Mixamo character | In the game | Triangles | Changes |
|---|---|---|---|
| Peasant Man | `villager_man.glb` (the son, the dead man) | 4.6k | striped shirt to an off-white kurta, trousers to a dhoti's white, boots to brown |
| Abe | `villager_elder.glb` (the old men, alive and dead) | 19.3k (from 32k) | purple tunic and trousers to a white kurta and dhoti, yellow sleeves to saffron |
| Peasant Girl | `villager_woman.glb` (the women, one of them dead) | 5.0k | none (a second woman is the same model tinted) |

Their clips and the hero's new ones are Mixamo animations (downloaded without skin, 30 fps): `Village-` Terrified,
Crying, Sitting Disbelief, Sad Idle, Hiding, Writhing In Pain, Laying Breathless, Falling Back Death, Falling Forward
Death, Dying Backwards, Look Behind Run, Crawl Backwards, Sitting Dazed; `Hero-` Kneeling Down, Kneeling Idle,
Kneeling (one knee), Standing (kneel to stand), Dying (head impact to two knees), Standing Up (from lying on the
stomach), Praying.

### Music (ElevenLabs)

`public/assets/music/shiva.mp3` (the summit's reveal, "Har Har Mahadev") is generated for this game with ElevenLabs
Music (flow kxekrrK5hmJeffLuHDBI); the original is `game asset/music/shiva_har_har_mahadev.mp3`.

## Chapter IV, Dwarka (`public/assets/dwarka/dwarka_browser.glb`, `dwarka_horizon_sunset_2k.hdr`)

Built in another session from `game asset/levels/03_dwarka/dwarka.blend` (its notes beside it: `*_NOTES.md`), exported
for the game by `export_glb_dwarka.py`. Sources, from those notes and the materials' own records in the file:

### Textures, a model's textures and a sky (Poly Haven, CC0)

| Asset | Kind | Used on |
|---|---|---|
| [Sandstone Cracks](https://polyhaven.com/a/sandstone_cracks) | texture (its normal map; its colour baked into the level's mineral albedos) | the weathered limestone, the sea-worn rock, the arena's ruined sandstone |
| [Old Sandstone 02](https://polyhaven.com/a/old_sandstone_02) | texture | the ancient blockwork |
| [Cliff Side](https://polyhaven.com/a/cliff_side) | texture | the salt-eroded coastal rock, the fort's tidal footings |
| [Large Sandstone Blocks 01](https://polyhaven.com/a/large_sandstone_blocks_01) | texture | the arena's paving |
| [Mossy Rock](https://polyhaven.com/a/mossy_rock) (Rob Tuytel) | texture (1k colour and normal) | moss and lichen on the ledges, olive algae in the tide zone |
| [Tree Small 02](https://polyhaven.com/a/tree_small_02) | a model's bark and leaf textures | the wind-shaped coastal trees and the trailing creepers |
| [Industrial Sunset 02 Pure Sky](https://polyhaven.com/a/industrial_sunset_02_puresky) | sky (2k HDR) | the sky and its reflections, turned to set the sun over the open sea |

Poly Haven assets are CC0 and need no credit; they are credited as a courtesy. Their authors are on the linked pages
(the building session recorded only Mossy Rock's).

### Made for the game, or supplied

- **Meshy** (generated for the game): the arena ("The Shattered Sky Arena"), the golden temple, Krishna's statue
  ("Divine Melody") and the sacred stone gateway (the `source_glb` notes on their nodes).
- **Supplied by the user:** the coastal fort (`coast fort.glb`) and the moored trading boat (`boat.glb`); their origin is
  not recorded in the notes (worth confirming in case either needs a credit).
- **Generated in the building session:** the distant green hills' panorama (an image generator,
  `E:/hindan/level 2/dwarka_work/mountain_provenance.json`) and the sea's normal map (procedural).

## The other levels

- **Chapter I, the baoli** (`public/assets/levels/moonlit_baoli.glb`, `public/assets/sky/baoli_night_sky_*`): its
  stone, ground, bark and cloth textures carry Poly Haven's names and form (CC0): Dry Riverbed Rock, Monastery Stone
  Floor, Rock Face 03, Fort Sandstone, Forrest Ground 01, Stone Path, Sandstone Blocks 08, Jacquard, Bark Brown 02
  (originals in `game asset/levels/01_baoli/textures/`, with three Poly Haven night skies; which one the game's night
  sky was made from is not recorded). The foliage, grass, mist, waterfall, lamp-glow, yantra and Kaali sandstone cards
  were made for the game.
- **Chapter II, the akhada** (`public/assets/levels/akhada_atrium.glb`): Poly Haven's Red Dirt Mud 01 and Sandstone
  Cracks (CC0; named in the file), and tree cards baked from a Poly Haven tree (`game asset/levels/02_akhada/
  THREEJS_NOTES.md`). Its other textures are unnamed in the export; their sources are in the master scene
  (`level2_forest_atrium.blend`, outside `game asset/`).
- **Chapter V, the summit** (`public/assets/levels/charnel_ridge.glb`, `public/assets/sky/charnel_*`): no third-party
  textures. Every surface is baked in Blender from procedural materials (`export_glb_charnel.py`) and the sky
  panoramas are rendered in Blender (`charnel_ridge_sky_bake.py`).
- **The prologue and Chapter III:** above.

## The enemies made with Meshy (milestone 11, 2026-10-05)

Generated for this game with Meshy (concepts: nano-banana image-to-image, styled on `game asset/concepts/style_ref.png`;
models: Meshy 7 image to 3D, textured, about 31k triangles and one 2k colour map each), then auto-rigged and animated
with the game's Mixamo clips. Made for the game; no third-party licence.

| Who | Game model | Concept | Source model |
|---|---|---|---|
| The raiders (prologue) | `public/assets/characters/raider.glb` | `concepts/raider_A.png` | `characters/sources/raider_meshy7.glb` |
| The yatudhanas (Chapter V) | `public/assets/characters/yatudhana.glb` | `concepts/yatudhana_A.png` | `characters/sources/yatudhana_meshy7.glb` |
| The cave runts (Chapter III) | `public/assets/characters/cave_runt.glb` (decimated to 17k) | `concepts/cave_runt_A.png` | `characters/sources/cave_runt_meshy7.glb` |
| The cave hurlers (Chapter III) | `public/assets/characters/cave_hurler.glb` | `concepts/cave_hurler_A.png` (sparks painted out) | `characters/sources/cave_hurler_meshy7.glb` |

The raiders' talwar (`public/assets/weapons/raider_talwar.glb`) is "Indian Talwar Weapon (low poly)" by Sangam
Senapati (Sketchfab, CC BY 4.0; credited above with the island's models), prepared as a weapon: re-origined at the
grip and scaled to 0.95 m.

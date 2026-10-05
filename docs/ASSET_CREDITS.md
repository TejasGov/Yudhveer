# Asset credits

Third-party assets in the game, with their licences. The originals and their licence files are kept outside the repo in
`game asset/` (see its README). This list grows as assets are added.

## Chapter III, the island's caves (`public/assets/levels/island_caves.glb`)

Built by `game asset/levels/03_island/build_island.py` from props prepared by `prepare_cave_props.py`. Sources and
download dates: `game asset/levels/03_island/sources/sources.json`.

### 3D models (Sketchfab)

**Changes made to every model below:** decimated to a game budget, rescaled and re-origined, textures resized
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
| [Ganesha, 10th - 11th C CE](https://sketchfab.com/3d-models/ganesha-10th-11th-c-ce-375c670515684977b6ec05be115366ac) | [Minneapolis Institute of Art](https://sketchfab.com/artsmia) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | the old idol by the shrine's door. | 9.0k |
| [Old Boat](https://sketchfab.com/3d-models/old-boat-a9ce4ca0cac14f448c72bb94ad193437) | [donnichols](https://sketchfab.com/donnichols) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | the boat at the landing. Oars left out; a code-built cane canopy added. | 6.0k |
| [Coiled Rope 2](https://sketchfab.com/3d-models/coiled-rope-2-e6fe8fedd3d04b1dac3e32e0dd515cbb) | [TepidGames](https://sketchfab.com/TepidGames) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | the rope at the landing's mooring post. Flat rope colour. | 1.6k |
| [Flat rocks](https://sketchfab.com/3d-models/flat-rocks-b76813cc177248418639026b06bc9745) | [DJMaesen](https://sketchfab.com/bumstrum) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | the black pool's rim, the landing's stepping stones, floor-edge stones. | 410, 556, 348, 128 |
| [Rubble](https://sketchfab.com/3d-models/rubble-9a180893d6454f68a764e62be3fc5c92) | [Pert Doherty](https://sketchfab.com/pertdoherty) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | rubble at the walls' feet. | 320 |
| [Hindu Temple Bell](https://sketchfab.com/3d-models/hindu-temple-bell-fd30810e3fa84866b1b4f767c083ea6d) | [Rushat Saiyush J Narayan](https://sketchfab.com/rushat_saiyush) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | a brass bell among the offerings. Flat brass colour. | 1.6k |
| [Assorted Old Pots](https://sketchfab.com/3d-models/assorted-old-pots-7795c6a5fa144bfcb1c33041c71eab00) | [Kigha](https://sketchfab.com/Kigha) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | clay pots among the offerings. Split into separate pots. | 900 each |
| [Indian Talwar Weapon ( low poly )](https://sketchfab.com/3d-models/indian-talwar-weapon-low-poly-9f17d36c21e5405baddf548dc2b66489) | [Sangam Senapati](https://sketchfab.com/sangam04) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | talwars in the hall and laid at the dais. | 1.4k |
| [Indian dhal (shield), 19th century](https://sketchfab.com/3d-models/indian-dhal-shield-19th-century-fca1088c468c480a845977189d66bf59) | [Pedram Ashoori](https://sketchfab.com/pedramashoori) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | split dhals in the hall and at the dais. | 1.6k |
| [Skeleton Sitting](https://sketchfab.com/3d-models/skeleton-sitting-f06c95b499dd465aafe3338fe2b7a30e) | [Buzzie](https://sketchfab.com/Buzzie) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) | a dead seeker slumped against the hall wall. | 7.0k |

The Mia scan (Minneapolis Institute of Art) is CC0 and needs no credit; it is credited as a courtesy.

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
- This work is based on "Old Boat" (https://sketchfab.com/3d-models/old-boat-a9ce4ca0cac14f448c72bb94ad193437) by donnichols (https://sketchfab.com/donnichols) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). Changes: decimated, rescaled, retextured.
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

# The island cave: better 3D assets (proposal, nothing generated or downloaded)

The user: "the cave needs better 3d assets, can use meshy/sketchfab for proposals - keep em ready for me to approve".

Chapter III's caves (`src/levels/Level5_Island.ts`, built by `game asset/levels/03_island/build_island.py` into
`public/assets/levels/island_caves.glb`). No Meshy credits have been spent and nothing has been downloaded. The
Sketchfab candidates below were looked up read-only (no login).

## What is there now

Measured from the exported GLB: **31,041 triangles in all, 1.2 MB** (the other levels are 0.8 to 13.6 MB). The cave
shell is 25,319 of them, and **every prop in the level together is about 2,000 triangles**. Everything is built from
code primitives and painted with flat vertex colours: two materials, no textures.

| Thing | How it is built now | Tris | How it reads |
|---|---|---|---|
| Cave shell (landing, tunnels, hall, pool, shrine) | union of ellipsoids, voxel-remeshed at 0.42 m, noise-displaced, decimated, vertex-colour bands | 25.3k | the right shape and good light falloff, but smooth lumpy blobs: no strata, ledges, cracks or overhangs, and nothing up close for the lamps to graze |
| Stalagmites (hall 4, pool 3) | an 8-sided cone with a smaller cone beside it | 52 each | traffic cones; they are cover in the fights, so they are seen a lot |
| Stalactites (about 60) | 6-sided cones hanging from the shell | 840 | fine in the dark at a distance; flat close up |
| The hall of bones (6 remains) | an icosphere skull, a box jaw, 3 box bones each; a stick spear, a disc shield | in `Props` | **weakest**: read as pebbles and sticks, yet the chapter's line is "So this is where the others ended" |
| Braziers (3) | 3 box legs, a cone bowl, a disc of embers | in `Props` | primitive; one stands in the middle of the hall fight |
| Diya shelves (10) and torches (2) | a box shelf and a cone lamp; a box bracket and a cylinder | in `Props` | acceptable as small lights, generic |
| Shrine dais and altar | boxes; two flat "carved panels"; a red cloth box | 108 | **hero space**: the ending's close-ups frame the altar and the mace, and it reads as a grey block |
| Torana (gateway) behind the altar | box pillars with banding, a box lintel, a sphere and a stick for the carved gada | 224 | the second-weakest hero piece: a doorframe, not an Indian stone gateway |
| Deepastambhas (2) | a cylinder pole and three brass discs, little cone flames | 204 each | a good silhouette, plain up close |
| Offerings at the dais | flattened spheres for flowers, a cone bell, box "weapons" | in `Props` | unreadable |
| The black pool rim | 22 squashed spheres | 440 | OK in the dark |
| The boat at the landing | an ellipsoid hull, a cylinder canopy, a stick pole | 344 | the first thing seen in the opening shot; reads as a pod |
| Eyes in the alcoves | emissive dots | 240 | work as they are; keep |

**Weakest first:** the shrine (torana, altar, offerings: the ending's close-ups), the hall of bones (the bones and
the dead seekers' gear), the rock surfaces (the shell everywhere, the stalagmites used as cover), then the landing's
boat, the braziers, the lamps.

## Budget

- **The whole level up to about 250k triangles; at most about 150k in any one view** (the fog closes things off
  within about 20 m). The shell stays as it is: it is the level's trimesh collider and its light shape. The new rock
  pieces are dressing laid over it (visual only, no collider), except where they stand out as cover.
- **Props 1-8k triangles, hero pieces up to about 20k** (the torana; the altar and the rock kit stay under about 10k).
- **Textures:** 1k per prop, 2k for the hero pieces and the rock kit's shared atlas, WebP through gltf-transform, with
  meshopt as now. Aim for under about 10 MB for the GLB (the akhada is 10.7 MB, the summit 13.6 MB).
- **Toon-friendly:** albedo with no baked shadows or strong AO, low contrast, clear colour masses, so the existing
  cel ramp and ink lines do the shading (`toonifyModel` keeps each material's colour map). Normal maps are optional:
  the toon ramp mostly flattens them.
- **Draw calls:** repeated pieces (rocks, stalagmites, diyas, bones) as instances, or batched by material as the level
  does now (`batchStatic`). Keep the 8-light lamp pool as it is.

## The asset list

Meshy cost per generation: meshy-7 text-to-3D with texture is about 30 credits (preview 20 + texture 10), and
image-to-3D with texture is 30. Per the user's rule of 2 options per generation, that is **about 60 credits per
item**. Generation settings, from the memory notes: `ai_model: meshy-7`, `should_remesh: true`, `target_polycount` as
listed (props far below the 30k used for characters), no `pose_mode`, and for 2 options vary the prompt or the image,
not the model tier. Every Meshy prompt below ends with the shared style suffix:

> *Style suffix:* "game-ready prop, stylized hand-painted texture, flat even lighting, no baked shadows, clear readable
> silhouette, ancient South Indian temple craft, weathered, single object centered, no base unless stated"

All the Sketchfab candidates below are downloadable. "CC-BY" means CC Attribution 4.0: credit the author. Tris are
Sketchfab's triangle counts.

### C1. Cave rock wall kit (modular overlays) — priority 1

- **Purpose and placement:** 5-6 pieces laid over the shell's walls in the hall, pool and shrine chambers and at the
  tunnel mouths (the landing's way in between the two diyas especially): a tall wall slab with strata, a ledge or shelf
  (which also seats the diyas), a flowstone curtain, a boulder cluster for the floor's edge, and a broken arch for the
  tunnel mouths. About 40 placements, rotated and scaled; the shell shows between them.
- **Budget:** 2.5-5k each, about 24k unique; one shared 2k atlas.
- **Meshy (text-to-3D, `target_polycount: 5000`, one generation per piece):** "a tall slab of dark wet sea-cave rock,
  layered sedimentary strata, vertical cracks, a shallow ledge at waist height, back face flat to sit against a wall,
  dark grey-brown with damp darker streaks" + suffix. Vary "a curtain of flowstone" / "a broken rock archway" / "a
  cluster of three fallen boulders" for the others. 5 pieces x 60 = **300 credits**, which is why Sketchfab is
  recommended here.
- **Sketchfab:**
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [Cave Rocks](https://sketchfab.com/3d-models/cave-rocks-4101c07c6a754f85962c6b516af4713a) | Splanyic | CC-BY | 15.9k (a set) | **pick**: a game-ready set of cave rocks, already in the budget; a darker retint fits the shell |
  | [Rockwall](https://sketchfab.com/3d-models/rockwall-0740082617924a1b973201881594091a) | DJMaesen (bumstrum) | CC-BY | 3.4k | a tall dark rock column, good for walls and tunnel mouths |
  | [Cliff](https://sketchfab.com/3d-models/cliff-082da1166a814c6e9c9e6c1b38159e4e) | DJMaesen (bumstrum) | CC-BY | 5.7k | a rock ledge "as a natural wall"; 4k maps, downsize them |

### C2. Stalagmites, stalactites and columns — priority 1

- **Purpose and placement:** replace `Stalagmite_Hall_*` and `Stalagmite_Pool_*` (they are cover, so they keep their
  cylinder colliders) and `Stalactites`. Six variants: three floor, two hanging, one floor-to-ceiling column for the
  hall and the pool.
- **Budget:** 1-3k each, about 10k unique, instanced.
- **Meshy (text-to-3D, `target_polycount: 2500`):** "a cluster of three limestone stalagmites of different heights
  rising from a puddled base, wet rippled flowstone surface, pale grey with ochre mineral streaks" + suffix (variant:
  "a hanging cluster of stalactites" / "a floor-to-ceiling limestone column"). 3 generations x 60 = 180 credits if
  Meshy.
- **Sketchfab:**
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [Stalagmites, Collums and Stalacites](https://sketchfab.com/3d-models/stalagmites-collums-and-stalacites-3e06d8e13be64faf85d6ba6a1049b769) | RBG_illustrations | CC-BY | 4.1k (a set) | **pick**: hanging and floor pieces and columns in one set, dark and mossy, game-ready |
  | [Stalagmite Formation 1](https://sketchfab.com/3d-models/stalagmite-formation-1-da1f7a9e2fe04549a03d479d938b3088) | Kallvin | CC-BY | 3.1k | a strong hero stalagmite for hall cover |
  | [Stalagmite Formation 2](https://sketchfab.com/3d-models/stalagmite-formation-2-736323ad07334c49be26da6f44f0c609) | Kallvin | CC-BY | 2.6k | floor to ceiling, "for wall pockets and sloped corners" |

### C3. The dead seekers: skeletons and bone piles — priority 1

- **Purpose and placement:** the hall of bones' six remains, and one or two in the alcoves and at the shrine steps
  (those "who never got further"). Three kinds: a skeleton slumped against the rock with rags and a rusted helmet, a
  sprawled one face down, and bone piles with skulls.
- **Budget:** skeletons 3-6k, piles 0.5-3.5k; about 15k unique.
- **Meshy (text-to-3D, `target_polycount: 6000`):** "the skeleton of an ancient Indian warrior slumped sitting against
  a rock, torn faded saffron dhoti and turban cloth, a rusted iron helmet tilted on the skull, a broken spear across
  its lap, bones yellowed and chipped" + suffix (no `pose_mode`: it is a prop, not a rig). 60 credits; worth it
  because it is the Indian-specific piece the hall lacks.
- **Sketchfab:**
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [Pile of Skulls](https://sketchfab.com/3d-models/pile-of-skulls-11d46d32494c44218a55192adc067e57) | Abimael Gonzalez | CC-BY | 0.8k | **pick**: a mound of skulls, very cheap; retint off its orange |
  | [Bone Pile](https://sketchfab.com/3d-models/bone-pile-1b624083cb604782a0a0dfdb8d17a6c6) | Kalciumm | CC-BY | 3.6k | **pick**: scattered bones and a skull, simple shapes that suit the toon look |
  | [Free Pack - Human Skeleton](https://sketchfab.com/3d-models/free-pack-human-skeleton-950d0a46531f492ab8715777e312a5bf) | PolyOne Studio | CC-BY | 51.6k | a full skeleton plus separate bones; decimate to about 5k and pose it slumped in Blender (or use Meshy above) |

### C4. The seekers' weapons (Indian) — priority 1

- **Purpose and placement:** replace the hall's stick spear and disc shield and the "old weapons laid down" at the dais:
  a rusted talwar, a split round dhal with bosses, a spear with a leaf blade, a small iron gada. Scattered with C3.
- **Budget:** 1-2k each, one generation as a set of 4: about 6k.
- **Meshy (text-to-3D, `target_polycount: 6000`, one prop laid flat):** "a heap of old rusted Indian weapons lying on
  the ground: a curved talwar sword, a round leather dhal shield split in two with four brass bosses, a spear with a
  leaf-shaped blade, a small iron gada mace, corroded and dusty" + suffix. **60 credits.**
- **Sketchfab:** these candidates are all European in shape (a kite shield, a longsword): Meshy is recommended.
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [Old Broken Shield](https://sketchfab.com/3d-models/old-broken-shield-6cfe19c7198445d4946b534187ca93e2) | DasanAlonso | CC-BY | 5.4k | a broken wooden kite shield: wrong culture, good wear |
  | [Old rusted sword v2](https://sketchfab.com/3d-models/old-rusted-sword-v2-af4d062034454d77bcd3005389e929ed) | GrzegorzM | CC-BY | 0.9k | a straight rusted sword, very cheap; a fallback only |

### C5. The shrine's torana (carved stone gateway) — priority 1, hero

- **Purpose and placement:** replaces `Torana_W`, `Torana_E` and `Torana_Lintel` behind the altar (box colliders kept).
  It is the backdrop of the ending's close-ups. Two carved pillars, bracket capitals, a lintel with a kirtimukha face,
  nagas coiled up the pillars (foreshadowing Takshaka, and the thing in the pool), and the carved gada on the lintel
  (the mace's shrine).
- **Budget:** up to about 18-20k, a 2k texture.
- **Meshy (image-to-3D preferred, `target_polycount: 18000`):** first a concept image (meshy text-to-image,
  nano-banana-2 about 6 credits, or a photo the user picks), then: "an ancient carved stone torana gateway in a cave
  shrine, two square pillars with bands of carving and coiled naga serpents climbing them, bracket capitals, a heavy
  lintel with a kirtimukha demon face at its centre and a carved gada mace across it, dark basalt, worn, oil-lamp
  soot near the top, front-facing, symmetrical" + suffix, symmetry on. **60 credits (+ about 6-12 for the concept).**
- **Sketchfab:**
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [Buddhist Ceremonial Gateway (Torana)](https://sketchfab.com/3d-models/buddhist-ceremonial-gateway-torana-1d3908a8b30a4932b5df17e1276e5f1a) | EqualizerX | CC-BY | 66.4k | a Sanchi-style torana: the right form, Buddhist motifs, too heavy (decimate to about 20k); a backup |
  | [Shiva And Pavarti Lintel, 18th C CE](https://sketchfab.com/3d-models/shiva-and-pavarti-lintel-18th-c-ce-25a297d4d0954fbd820a8a3ae751dc36) | Minneapolis Institute of Art | **CC0** | 76.7k | a real carved door lintel scan; decimated to about 8k it could crown code-built or Meshy pillars. Note: it shows Shiva, which could tip the summit's reveal |
  | [Low poly India Temple Wall](https://sketchfab.com/3d-models/low-poly-india-temple-wall-e3604a8207d448338485fb164c8f30c1) | Mega 3D (3dlandscape) | CC-BY | 10k | a carved panel with a deity relief, for the shrine's back wall behind the torana |

### C6. The altar — priority 1, hero

- **Purpose and placement:** replaces `Shrine_Altar` (the box collider and `Mark_Mace` height are kept, so the mace
  still lies at y -1.06). A carved plinth with lotus mouldings and naga reliefs on its face, a flat top for the red
  cloth (kept as a separate code-built strip, so it stays vermilion and toon-flat), and a channel at the front edge
  where the two altar diyas sit.
- **Budget:** 6-10k, a 2k texture.
- **Meshy (text-to-3D, `target_polycount: 9000`):** "an ancient South Indian stone altar plinth, rectangular, 2 m long,
  waist high, stepped base with lotus-petal mouldings, two carved panels of coiled naga serpents on the front, a flat
  polished top, dark grey granite with traces of old red kumkum and soot" + suffix. **60 credits.**
- **Sketchfab:**
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [Stone Altar](https://sketchfab.com/3d-models/stone-altar-3d4f2edb18e4424cabb41b60aa160cb5) | TheoClarke | CC-BY | 3.1k | a rough slab on stones: cheap and ancient, but not Indian or carved |
  | [Altar Ruins](https://sketchfab.com/3d-models/altar-ruins-189d92da96e147e0924c0c0dc5e17d3f) | ion_omat | CC-BY | 12.3k | a ruined altar with pillars; generic "lost civilisation" |

### C7. Deepastambhas (brass lamp pillars) — priority 1

- **Purpose and placement:** the two either side of the altar (`Deepastambha_W/E`, cylinder colliders kept). Their
  flames stay the code's `Flame_Tier_*`, laid onto the new cups.
- **Budget:** 5-8k, one model used twice, 1k texture.
- **Meshy (text-to-3D, `target_polycount: 7000`):** "a tall South Indian brass deepastambha oil-lamp pillar, kuthu
  vilakku style, round stepped base, slender ringed stem, three tiers of small lamp cups getting smaller towards the
  top, a peacock finial, tarnished brass with dark patina" + suffix. **60 credits.**
- **Sketchfab:**
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [Kutthu Vilakku](https://sketchfab.com/3d-models/kutthu-vilakku-aa1dd5a06d6f443ba9145e4183b2d7e7) | nitheeshkumaarmv | CC-BY | 124.8k | exactly the right object, very heavy: needs a decimate to about 8k and a check that it holds up |
  | [Golden Brass Lamp](https://sketchfab.com/3d-models/golden-brass-lamp-0032e769b35b40e0935b913d90256153) | ALEXMOt | Sketchfab Standard ("Free Standard") | 17.6k | an ornate deepam, better on the altar than as a pillar; no credit required, but the file cannot be redistributed as a standalone asset |
  | [Traditional Hanging Oil Lamp](https://sketchfab.com/3d-models/traditional-hanging-oil-lamp-3d-model-4be8c0578edd4fe099a09cf973cac6c6) | Venkat Gurdge | CC-BY | 60.6k | a chained hanging lamp for the shrine door; decimate |

### C8. Braziers — priority 2

- **Purpose and placement:** the hall's central brazier and the pool's two (the lamp empties are kept, flames at the
  bowl).
- **Budget:** 1-4k, used 3 times.
- **Meshy (text-to-3D, `target_polycount: 3000`):** "an ancient Indian iron fire brazier, a wide shallow bowl on three
  curved legs ending in lion paws, a rim of small pointed leaves, black iron rusted orange at the edges, glowing coals
  inside" + suffix. 60 credits if Meshy.
- **Sketchfab:**
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [Brazier](https://sketchfab.com/3d-models/brazier-653f30c424874a5a8ba4d71cef51d94e) | mSameja | CC-BY | 5.8k | **pick**: an ornate pedestal bowl that reads as temple ware |
  | [Medieval Brazier](https://sketchfab.com/3d-models/medieval-brazier-cff29e533e3a4298a5d112cf7bb2558c) | Sky_Hunter | CC-BY | 1.2k | an iron basket on legs, very cheap |
  | [Primitive Brazier (Free)](https://sketchfab.com/3d-models/primitive-brazier-free-3b155a4948b042ffb69f1d8a4aead250) | wolfgar74 | CC-BY | 2.4k | a tripod and bowl, crude, fits "old things keep it" |

### C9. Wall diyas in carved niches — priority 2

- **Purpose and placement:** the 10 `diya_on_shelf` lamps: a clay diya in a small niche carved into the rock (a
  ledge with a little arch), replacing the box shelf. The flame and lamp empty stay code-built.
- **Budget:** 0.5-1.5k, instanced.
- **Meshy (text-to-3D, `target_polycount: 1500`):** "a small arched niche carved into a rough rock face, holding a
  clay oil diya, soot blackening the arch above it, back flat to sit on a wall" + suffix. **60 credits.**
- **Sketchfab:**
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [diwali diya](https://sketchfab.com/3d-models/diwali-diya-627dea0363f042d3b0c906c90e922aec) | sinuboy072 | CC-BY | 6.0k | a stylised clay diya that suits the toon look; decimate to about 1k; no niche |
  | [Pooja / Aarti Thali](https://sketchfab.com/3d-models/pooja-aarti-thali-indian-worship-plate-3d-80d655bc4751404bac1f9300f735c5fe) | Kreeda Dev | CC-BY | 9.3k | a puja plate with a diya, for the altar's offerings (C14) |

### C10. Wall torches (mashaal) — priority 3

- **Purpose and placement:** the two torches (the descent, the last tunnel).
- **Budget:** 0.5-1.5k.
- **Meshy (text-to-3D, `target_polycount: 1500`):** "an Indian mashaal torch in an iron wall bracket, a wooden shaft
  with oil-soaked cloth wrapped round its head, a ring bracket with a spike" + suffix. 60 credits if Meshy.
- **Sketchfab:**
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [Medieval Wall Torch](https://sketchfab.com/3d-models/medieval-wall-torch-77db436da2844cbfb4dde0bb9b396835) | Kigha | CC-BY | 1.7k | **pick**: a simple bracket and torch, PBR, cheap |
  | [Wall Torch](https://sketchfab.com/3d-models/wall-torch-68f61f1132ba46999709c26e79400961) | Sean Thomas (foon.) | CC-BY | 3.0k | a torch holder, a bit more ornate |

### C11. Naga stone and broken statues — priority 2

- **Purpose and placement:** storytelling pieces. A **nagakal** (a stone slab carved with a coiled serpent) on the dry
  side of the black pool, where "something moves in the water", foreshadowing the naga king. A **headless seated
  deity** half sunk at the shrine door. A **fallen statue head** in the last tunnel. They say a temple was here before
  the dark, without a word of dialogue.
- **Budget:** 6-12k each, about 25k unique.
- **Meshy:**
  - Nagakal (text-to-3D, `target_polycount: 6000`): "an ancient Indian nagakal stone slab standing upright, carved in
    relief with an intertwined pair of cobras with raised hoods, rounded top, moss and damp at the base, dark granite"
    + suffix. **60 credits.**
  - Broken idol (text-to-3D, `target_polycount: 10000`): "a broken ancient stone statue of a seated Hindu deity,
    cross-legged on a lotus pedestal, the head and two of four arms broken off, weathered black stone, cracks, moss"
    + suffix. **60 credits.**
- **Sketchfab:**
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [Ganesha, 10th - 11th C CE](https://sketchfab.com/3d-models/ganesha-10th-11th-c-ce-375c670515684977b6ec05be115366ac) | Minneapolis Institute of Art | **CC0** | 64.0k | a real volcanic-stone temple sculpture, chipped and authentic; decimate to about 10k. **Pick** for the broken idol |
  | [Broken Stone Pillar](https://sketchfab.com/3d-models/broken-stone-pillar-fa6b7acf284041428b8a0fbe9fd5e762) | Aupuma | CC-BY | 13.2k | a scanned broken pillar for the tunnel; decimate |
  | [Snake Statue](https://sketchfab.com/3d-models/snake-statue-794b77a3e4654a669cf259d20dc89ec7) | Ville Seppanen (accuman) | CC-BY | 5.1k | a coiled snake on a pedestal, Greek-styled: a weak nagakal stand-in; Meshy recommended |

### C12. The landing: the boat, the mooring post and rope — priority 2

- **Purpose and placement:** the boat in the opening's first shot (the boatman sits unseen under the canopy, so the
  canopy must be deep and dark). A wooden mooring post with a coiled rope, and the lantern post (`LX, LZ`). The
  stern lamp stays code-built.
- **Budget:** the boat 6-10k; the post and rope 1-2k.
- **Meshy:**
  - Boat (text-to-3D, `target_polycount: 9000`): "a small old Indian wooden country boat, a long narrow plank hull with
    a raised curved prow, a deep arched canopy of woven cane and palm leaf over the stern half, a long bamboo pole,
    weathered dark wood, tar-black seams" + suffix. **60 credits.**
  - Mooring post (text-to-3D, `target_polycount: 2000`): "a weathered wooden mooring post driven into wet rocks, a
    thick coir rope tied round it and coiled at its foot" + suffix. 60 credits (optional; code-built is fine).
- **Sketchfab:**
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [Old Boat](https://sketchfab.com/3d-models/old-boat-a9ce4ca0cac14f448c72bb94ad193437) | donnichols | CC-BY | 8.4k | a worn wooden rowing boat, game-optimised; no canopy (add a code-built cane one) |
  | [Fishing boat](https://sketchfab.com/3d-models/fishing-boat-f4b38ccf5ffb46018aa7931c0e106654) | Pabooklas | CC-BY | 7.2k | a plain wooden fishing boat, one 4k material (downsize); no canopy |
  | [Coiled Rope 2](https://sketchfab.com/3d-models/coiled-rope-2-e6fe8fedd3d04b1dac3e32e0dd515cbb) | TepidGames | CC-BY | 20.0k | **pick** for the rope; decimate to about 1.5k |

### C13. Rubble and fallen stones — priority 3

- **Purpose and placement:** around the stalagmites and wall bases, at the pool's rim (could replace `Pool_Rim`'s
  spheres) and on the tunnel floors.
- **Budget:** 0.3-1.5k, instanced.
- **Meshy:** not worth credits.
- **Sketchfab:**
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [70 stylized rocks](https://sketchfab.com/3d-models/70-stylized-rocks-bf0051544c9c41f998c154c546b09669) | ondrasaur | CC-BY | 5.6k (70 rocks) | **pick**: many small rocks, toon-friendly |
  | [Flat rocks](https://sketchfab.com/3d-models/flat-rocks-b76813cc177248418639026b06bc9745) | DJMaesen (bumstrum) | CC-BY | 1.4k | flat slabs "to build natural stairs in a cave": the descent and the pool rim |
  | [Rubble](https://sketchfab.com/3d-models/rubble-9a180893d6454f68a764e62be3fc5c92) | Pert Doherty | CC-BY | 0.3k | a baked rubble pile, almost free |

### C14. Offerings at the dais — priority 3

- **Purpose and placement:** dried marigold garlands, a brass bell, clay pots, a puja plate, at the dais steps
  (replacing the spheres and cone).
- **Budget:** 0.5-3k each.
- **Meshy (text-to-3D, `target_polycount: 4000`, one set):** "old temple offerings on a stone step: dried brown marigold
  garlands, a small tarnished brass hand bell, two clay pots, a brass plate with a cold diya and red kumkum powder" +
  suffix. 60 credits (optional).
- **Sketchfab:**
  | Model | Author | License | Tris | Fit |
  |---|---|---|---|---|
  | [Hindu Temple Bell](https://sketchfab.com/3d-models/hindu-temple-bell-fd30810e3fa84866b1b4f767c083ea6d) | Rush At Games | CC-BY | 3.5k | **pick**: a brass temple bell, right shape |
  | [Assorted Old Pots](https://sketchfab.com/3d-models/assorted-old-pots-7795c6a5fa144bfcb1c33041c71eab00) | Kigha | CC-BY | 7.4k | **pick**: worn clay pots on one UV; use 2-3 of them |
  | [Pooja / Aarti Thali](https://sketchfab.com/3d-models/pooja-aarti-thali-indian-worship-plate-3d-80d655bc4751404bac1f9300f735c5fe) | Kreeda Dev | CC-BY | 9.3k | a puja plate; decimate to about 2k |

Also seen, for reference: [Ellora Caves | India](https://sketchfab.com/3d-models/ellora-caves-india-1a5ec1e212f9451e80dc051e97164d17)
(GSXNet, CC-BY, 136.5k), a rock-cut cave temple. It is too heavy and too specific to use, but it is a good look
reference for carving into living rock, if the shrine chamber should feel rock-cut rather than built.

## Recommended mix

**Meshy (the Indian-specific and hero pieces, where Sketchfab has nothing that fits):**

| Item | Generations | Credits |
|---|---|---|
| C5 torana (image-to-3D from a concept) | 1 x 2 options (+ concept image) | 60 (+ about 6-12) |
| C6 altar | 1 x 2 | 60 |
| C7 deepastambha | 1 x 2 | 60 |
| C3 seated seeker skeleton | 1 x 2 | 60 |
| C4 Indian weapons heap | 1 x 2 | 60 |
| C11 nagakal | 1 x 2 | 60 |
| C12 country boat with cane canopy | 1 x 2 | 60 |
| C9 diya niche | 1 x 2 | 60 |
| **Recommended total** | **8 items, 16 models** | **about 480 (+ about 6-12 for the torana's concept)** |
| Optional | C11 broken idol (if not the CC0 Ganesha), C12 mooring post, C8 Indian brazier, C14 offerings set | +60 each, up to +240 |

So **about 480-490 Meshy credits recommended, about 730 with every optional item.** The balance should be checked
before any spend (`meshy_check_balance`, free).

**Sketchfab (generic cave material, and two CC0 museum scans):** C1 Cave Rocks (plus Rockwall); C2 the
Stalagmites/Columns/Stalactites set (plus Kallvin's Formation 1 and 2); C3 Pile of Skulls and Bone Pile; C8 Brazier
(mSameja); C10 Medieval Wall Torch; C11 the Ganesha scan (CC0, decimated, as the broken idol); C12 Coiled Rope 2; C13
70 stylized rocks and Flat rocks; C14 Hindu Temple Bell and Assorted Old Pots. That is 15 downloads, all CC-BY or CC0.
The user downloads them (a Sketchfab login is needed). Each is then decimated to the budget, retextured or tinted
toward the cave's palette, and its textures downsized to 1k in Blender.

**Estimated result:** about 180-220k triangles for the whole level, about 120-140k in the busiest view (the shrine),
a GLB of about 6-9 MB.

## Attribution (if the recommended Sketchfab picks are used)

To add to the credits roll (`src/ui/Credits.ts`) and a `game asset/levels/03_island/ATTRIBUTION.md`, in the CC-BY
form "Title" by Author, licensed under CC BY 4.0, with the link:

- "Cave Rocks" by Splanyic (CC BY 4.0)
- "Rockwall" by DJMaesen (CC BY 4.0)
- "Stalagmites, Collums and Stalacites" by RBG_illustrations (CC BY 4.0)
- "Stalagmite Formation 1" and "Stalagmite Formation 2" by Kallvin (CC BY 4.0)
- "Pile of Skulls" by Abimael Gonzalez (CC BY 4.0)
- "Bone Pile" by Kalciumm (CC BY 4.0)
- "Brazier" by mSameja (CC BY 4.0)
- "Medieval Wall Torch" by Kigha (CC BY 4.0)
- "Coiled Rope 2" by TepidGames (CC BY 4.0)
- "70 stylized rocks" by ondrasaur (CC BY 4.0)
- "Flat rocks" by DJMaesen (CC BY 4.0)
- "Hindu Temple Bell" by Rush At Games (CC BY 4.0)
- "Assorted Old Pots" by Kigha (CC BY 4.0)
- "Ganesha, 10th - 11th C CE", Minneapolis Institute of Art (CC0: no credit required; credit it anyway as courtesy)

A swapped-in alternative carries its own line (every candidate above is CC-BY except the two Mia scans, CC0, and
ALEXMOt's Golden Brass Lamp, Sketchfab Standard: no credit required, not redistributable on its own). Note that
CC-BY 4.0 also asks for changes to be indicated ("decimated and retextured").

**Candidates listed:** 38 different Sketchfab models across the 14 items, 2-3 per item (the puja plate is listed
under two items, and Ellora as a look reference). Licenses: 35 CC-BY 4.0, 2 CC0 (Minneapolis Institute of Art), 1
Sketchfab Standard; every one is downloadable. No
NonCommercial or NoDerivatives licenses: those were filtered out.

## On a yes

1. The user approves the Meshy list (or a subset) and the Sketchfab picks.
2. Meshy: check the balance (free), generate with the prompts above (2 options each), read each result in Blender
   (triangles, scale, the texture under the toon ramp) before generating the next. The user picks one of each pair.
3. Sketchfab: the user downloads the picks (glTF) into `game asset/levels/03_island/sources/`. Decimate and retint in
   Blender, then save each to `game asset/levels/03_island/props/`.
4. `build_island.py` imports the props and places them where the primitives are now (same positions, colliders,
   `Lamp_*` and `Flame_*` empties, `Mark_Mace`), instances the repeated pieces, and exports with textures (WebP, 1k,
   meshopt). `Level5_Island.ts` needs no change beyond, at most, a `NO_SHADOW` pattern for the new prop names.
5. Check in the game: the hall fight's draw calls (about 95 now), the frame time, the ending's close-ups on the altar
   and torana, and the opening's boat.

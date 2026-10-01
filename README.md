# YUDHVEER (युद्धवीर) | 3D Vedic Combat Game Engine

A production-grade, high-fidelity 3D browser combat game engine built with **Three.js**, **Rapier3D** (`@dimforge/rapier3d-compat`), **Vite**, **TypeScript**, and **GSAP**.

---

## ⚔️ Key Features & Mechanics

- **Vedic Combat Mechanics**:
  - **Dhal Parry (Deflection)**: 140ms deflection window with resonant metallic audio, 3D sparks, expanding shockwave ring, and heavy Marma posture damage.
  - **Marma System**: Poise/posture accumulation system with stance-broken vulnerable execution state.
  - **GSAP Hit-Stop Freeze**: Dynamic timescale deceleration (`timeScale: 0.05`) on perfect parries and critical impacts.
  - **Fluid Combo System**: 3-step dynamic combo (Slash $\rightarrow$ Diagonal Cleave $\rightarrow$ 360 Spin Finisher).
  - **Acrobatic Dodges & Wall-Kicks**: Invulnerable dodge-rolls with dust VFX and pillar-assisted wall-kick momentum boosts.

- **3-Stage Campaign Progression** (Blender-authored arenas streamed as GLB):
  - **Level 1: The Moonlit Baoli** — Cel-shaded, ink-lined stepwell arena over a shallow pool with an analytic ripple-water shader, waterfalls, mist and a Kaali shrine under a baked night sky. Mercenary Grunt & Spear Duo.
  - **Level 2: Hanuman Akhada** — Enclosed akhada beneath an open octagonal oculus and a weathered Hanuman monolith, relit as a cel-shaded comic night: a cobalt (#1E55FF) key through the oculus, vermillion (#FF1A24) floor grazers and bust uplights, screen-space ink lines. Katar Rogues & Chakram Throwers.
  - **Level 3: Kailasha Summit** — Frozen basalt plateau above a cloud sea under a silver solar eclipse; procedural basalt / drift-snow / blood shading, charcoal fog, swirling snow-ash-ember weather and lightning that crossfades the sky. Boss duel against **Grandmaster Mahayodha**.

- **Architectural Excellence**:
  - **Hot-Swappable GLB Loader**: Dynamically swap character models or level arenas while preserving Rapier3D physics colliders and socket attachments (`mixamorigRightHand`, `mixamorigLeftHand`).
  - **Procedural Web Audio Synth**: Custom Web Audio API synthesizer for all sword whooshes, metal clangs, spear thrusts, katar slices, chakram hums, and flame roars (zero external audio asset dependencies).

---

## 🏛️ Level Pipeline

Levels live in `src/levels/`. Each is a `GLBLevel` (async GLB load, colliders from Blender `collider` custom properties, full GPU + Rapier disposal) plus a `LevelAtmosphere` (sky, fog, lights, exposure, bloom, vignette, ink) that `SceneManager.applyAtmosphere` and the post chain (`src/core/postfx/PostFX.ts`: selective bloom → vignette → ACES) consume.

| Level | Source `.blend` | Export script | Runtime asset |
|---|---|---|---|
| 1 | `level 1/moonlit_baoli.blend` | `level 1/export_glb.py` | `public/assets/levels/moonlit_baoli.glb` |
| 2 | `level 2/level2_browser_atrium.blend` | `level 2/export_glb_akhada.py` | `public/assets/levels/akhada_atrium.glb` |
| 3 | `level 3/charnel_ridge_arena.blend` | `level 3/export_glb_charnel.py` | `public/assets/levels/charnel_ridge.glb` + `public/assets/sky/charnel_*.jpg` |

Re-export headless (the `.blend` is only read):

```bash
blender -b "level 2/level2_browser_atrium.blend" --python "level 2/export_glb_akhada.py" -- Yudhveer/public/assets/levels/akhada_atrium.glb
blender -b "level 3/charnel_ridge_arena.blend" --python "level 3/export_glb_charnel.py" -- Yudhveer/public/assets/levels/charnel_ridge.glb
```

The Level 2 exporter converts world-space box-projected textures into UVs and bakes constant tint layers into the images; the Level 3 exporter bakes the procedural look-dev (basalt, drift snow, blood) into per-object textures and drops the far peaks that would cover the relief baked into the sky. All three levels are cel-shaded with screen-space ink lines. The game loop simulates at a fixed 60 Hz and interpolates characters for rendering.

---

## 🎮 Controls

| Action | Input |
|---|---|
| **Move** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> |
| **Sprint** | <kbd>Shift</kbd> |
| **Walk / Run toggle** | <kbd>C</kbd> |
| **Jump** | <kbd>F</kbd> |
| **Dodge Roll / Wall Kick** | <kbd>Space</kbd> |
| **3x Attack Combo** | <kbd>Left Click (LMB)</kbd> |
| **Leaping Strike** | <kbd>Left Click</kbd> while sprinting |
| **Dhal Parry (140ms) / Guard** | <kbd>Right Click (RMB)</kbd>, hold to keep the guard up |
| **Charge (next 3 blows ×1.6)** | hold <kbd>Q</kbd> |
| **Sheathe / Draw** | <kbd>X</kbd> (attacking while sheathed draws) |
| **Camera Look** | Mouse Movement (PointerLock) |
| **Switch Level (testing)** | <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> or the level menu |

---

## 🛠️ Tech Stack

- **Core**: Vite, TypeScript, Vanilla CSS + Tailwind CSS HUD overlay
- **3D Graphics**: Three.js, PCF Shadows, ACESFilmic Tone Mapping
- **Physics**: Rapier3D (`@dimforge/rapier3d-compat`)
- **Animation & FX**: GSAP, Custom Three.js Particle System, Web Audio API

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/TejasGov/Yudhveer.git
cd Yudhveer

# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build
```

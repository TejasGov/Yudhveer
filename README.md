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

- **3-Stage Campaign Progression**:
  - **Level 1: The Moonlit Baoli** — Submerged Stepped Ghat with dynamic water reflections, ambient mist, Mercenary Grunts & Spear Duo.
  - **Level 2: Mandapa of Pillars** — Ancient Temple Hypostyle with colonnades, hanging brass lanterns, Agile Katar Rogues & Chakram Throwers.
  - **Level 3: Garbhagriha Sanctum** — Floating obsidian inner sanctum with colossal burning brass braziers and a 2-Phase Boss duel against **Grandmaster Mahayodha** (*Agni Awaken & Flaming Greatsword*).

- **Architectural Excellence**:
  - **Hot-Swappable GLB Loader**: Dynamically swap character models or level arenas while preserving Rapier3D physics colliders and socket attachments (`mixamorigRightHand`, `mixamorigLeftHand`).
  - **Procedural Web Audio Synth**: Custom Web Audio API synthesizer for all sword whooshes, metal clangs, spear thrusts, katar slices, chakram hums, and flame roars (zero external audio asset dependencies).

---

## 🎮 Controls

| Action | Input |
|---|---|
| **Move** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> |
| **Sprint** | <kbd>Shift</kbd> |
| **Dodge Roll / Wall Kick** | <kbd>Space</kbd> |
| **3x Attack Combo** | <kbd>Left Click (LMB)</kbd> |
| **Dhal Parry (140ms)** | <kbd>Right Click (RMB)</kbd> |
| **Camera Look** | Mouse Movement (PointerLock) |

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

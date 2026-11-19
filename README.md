# Space Mission 101 (Space Mission Designer)

**Team:** Quatcha  
**Member:** Koushik Murugappan S  
**Challenge:** Space Mission Design Challenge  

An interactive 3D aerospace engineering and spaceflight simulation web application built with React, TypeScript, Tailwind CSS, and Three.js (WebGL). Explore a walkable 3D space agency headquarters, assemble modular multi-stage rockets and spacecraft, launch through a T-5 audio-visual countdown, and analyze mission outcomes using real-world aerospace physics and NASA reference data.

## Key Features

- **Walkable 3D Space Agency HQ:** Navigate the command floor (`WASD`) or jump directly to the Rocket Designer, Spacecraft Lab, Missions Briefing, Research Lab, and Launch Complex 39A.
- **Modular Rocket & Spacecraft Designers:** Customize Stage 1/2 bodies, engines, propellant chemistries (`Kerolox`, `Hydrolox`, `Methalox`, `Solid`), side boosters, payload fairings, avionics, solar wings, RTGs, batteries, antennas, and scientific instruments with a live 3D cutaway view.
- **5-Mission Planetary Campaign:**
  1. **LEO Satellite Deployment** (Low Earth Orbit)
  2. **Lunar Lander** (Moon)
  3. **Mars Surface Rover** (Mars)
  4. **ISS Orbital Rendezvous & Docking** (Space Station)
  5. **Deep-Space Jupiter Probe** (5.2 AU)
- **Fast Launch-to-Debrief Loop (~15s):** Features a large HUD countdown (`T-5` → `LIFTOFF`) with synthesized Web Audio tones, ignition chords, and spoken Web Speech API callouts, followed by automated stage separation, orbital insertion, transfer burn, landing/docking, and payload deployment.
- **Discovery-First Post-Flight Debrief:** No pre-launch engineering spoilers—after launch, failures reveal root cause, physics breakdown, actionable fixes, and matching NASA Lessons Learned (LLIS) case studies, while successful flights show optimization tips and a side-by-side comparison against real launch vehicles (Falcon 9, Saturn V/SLS, Atlas V, Dragon 2, Voyager Titan-Centaur).
- **Standalone Portable Files:**
  - `space-mission-designer.html` — single-file offline production bundle of the 3D simulator.
  - `space-mission-101-slides.html` — 7-slide interactive presentation deck with embedded visuals and PDF print support.
- **Game File:**
   - https://space-mission-designer.ai.studio — Local HTML game file .
   

## NASA & Aerospace Open Data References

All reference benchmarks and engineering models are bundled locally in `src/data/realWorldData.ts` and `src/engine/engineeringMath.ts`:

- **NASA Lessons Learned Information System (LLIS):** https://llis.nasa.gov/ *(Vanguard TV-3 #0241, Mars Polar Lander #0634, Rendezvous standards)*
- **NASA Technical Reports Server (NTRS):** https://ntrs.nasa.gov/ *(Tsiolkovsky $\Delta v$ and propulsion benchmarks)*
- **NASA GSFC Planetary Fact Sheet:** https://nssdc.gsfc.nasa.gov/planetary/factsheet/ *(Gravity $g_0 = 9.80665\text{ m/s}^2$, $1/r^2$ solar irradiance)*
- **NASA Deep Space Network (DSN):** https://eyes.nasa.gov/apps/dsn-now/
- **International Docking System Standard (IDSS):** https://www.internationaldockingstandard.com/

## Local Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## AI Disclosure

Generative AI tools assisted in authoring and refactoring application code (`src/App.tsx`), procedural Web Audio & Speech countdown integration (`src/engine/audioEngine.ts`), structuring curated aerospace reference datasets (`src/data/catalog.ts`, `src/data/realWorldData.ts`), and generating the watermarked visuals used in the presentation slide deck.

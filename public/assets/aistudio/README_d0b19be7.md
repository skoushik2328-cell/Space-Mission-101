# 🚀 SPACE MISSION DESIGNER: GTA EDITION • NASA AEROSPACE SIMULATION

**SPACE MISSION DESIGNER (GTA Edition)** merges the iconic aesthetic and HUD of **Grand Theft Auto** (Green Cash Counter, 5-Star Wanted / Danger Level, Circular GPS Radar Minimap, *MISSION PASSED! RESPECT +*, and *WASTED* crash sequences) with **authentic NASA real-world flight datasets, real NASA rocket imagery, and the NASA Lessons Learned Information System (LLIS)**.

---

## 🌟 What's New in the GTA & NASA Real-World Edition

### 1. 🎮 Full GTA-Style HUD & Cinematics
- **GTA Green Cash Counter (Top-Right)**:
  - Large bold green cash with drop shadow: `$ 160,000,000`.
  - Ticks up and animates dynamically as you earn grants from space missions.
- **GTA 5-Star Wanted / Danger Level**:
  - Displays directly below your cash counter (`★ ★ ★ ★ ★`), flashing dynamically to indicate the risk and delta-v challenge of the active mission.
- **GTA Circular GPS Radar Minimap (Bottom-Left Corner)**:
  - Complete with outer cardinal ring (N / E / S / W), range rings, player spacecraft blip (rotating with vehicle pitch), target landing/docking waypoint, and digital altitude/speed indicators.
- **Iconic GTA "MISSION PASSED! RESPECT +" Banner**:
  - Triumphant banner animation with GTA chord progression synth sound when you achieve orbit, land on the Moon, or dock with the ISS.
- **Dramatic GTA "WASTED" Screen Sequence**:
  - When a rocket runs out of fuel suborbital, disintegrates at Max-Q, or crashes into the lunar surface: slow motion, red vignette, and blood-red stamped `WASTED` across the screen!

---

### 2. 📸 Real NASA Rocket & Spacecraft Imagery
Curated high-resolution imagery from the official **NASA Image and Video Library** (`images-api.nasa.gov`):
- **Saturn V (Apollo 11)** (`assets/saturn_apollo.jpg`): Marshall Space Flight Center launch footage.
- **Space Shuttle STS Discovery / Atlantis** (`assets/shuttle.jpg`): Solid Rocket Booster ignition and orbiter ascent.
- **Space Launch System - SLS (Artemis I)** (`assets/artemis.jpg`): Kennedy Space Center Pad 39B launch.
- **SpaceX Falcon 9 Full Thrust** (`assets/falcon.jpg`): Commercial Crew Demo-2 liftoff.
- **Curiosity & Perseverance Mars Science Laboratory** (`assets/mars_curiosity.jpg`): In-situ selfie on Gale / Jezero Crater.
- **International Space Station (ISS)** (`assets/iss.jpg`): Cupola orbital view above Earth.
- **Voyager 1 & 2 Interstellar Probes** (`assets/voyager.jpg`): Deep space spacecraft in cruise.

---

### 3. 🔬 NASA Real-World Data & Lessons Learned System (LLIS)
Integrated with real physical constants from the **NASA NSSDC Planetary Factsheets** (`nssdc.gsfc.nasa.gov`) and official **NASA Lessons Learned Information System (LLIS)** failure diagnostics:

| Failure Type | Real NASA Case Study | Physics Diagnosis & Actionable Engineering Fix |
| :--- | :--- | :--- |
| **Liftoff Failure (TWR < 1.05)** | *NASA LLIS Case #0241: Vanguard TV-3* | Engine thrust cannot overcome surface weight ($g_0 = 9.80665\text{ m/s}^2$). **Remedy:** Add strap-on Solid Rocket Boosters (+14,000 kN to +28,000 kN) or upgrade core engines. |
| **Suborbital Fuel Exhaustion** | *NASA SP-8000 Series: S-IVB Reserves* | Burnout occurs below orbital circular velocity ($v_{circ} = \sqrt{\mu / r}$). **Remedy:** Upgrade upper stage to Cryogenic HydroLOX (Centaur RL-10, $I_{sp} = 462\text{s}$) or Carbon-Composite tanks (-25% dry mass). |
| **Max-Q Aerodynamic Disintegration** | *NASA STS-51L & Falcon 9 CRS-7* | Aerodynamic dynamic pressure exceeded structural load limit ($q > 35\text{ kPa}$). **Remedy:** Implement deep throttle bucket (throttle down to 70% between 10 km and 14 km altitude). |
| **Touchdown Crash ($v > 3.5\text{ m/s}$)** | *NASA LLIS Case #0634: Surveyor 2 & Mars Polar Lander* | Kinetic energy exceeded landing leg aluminum honeycomb crush core limit. **Remedy:** Establish steady terminal throttle hover at 50m; touch down at $< 1.5\text{ m/s}$. |
| **Spacecraft Eclipse Blackout** | *NASA Outer Planets LLIS & Mars Global Surveyor* | Solar flux decays rapidly with distance ($1361\text{ W/m}^2$ at Earth $\to 589\text{ W/m}^2$ at Mars $\to 50\text{ W/m}^2$ at Jupiter). **Remedy:** Equip Radioisotope Thermoelectric Generators (RTG) for deep space. |

---

## 🎮 How to Play

1. **Launch Directly**: Double-click [`start_game.bat`](file:///c:/Users/skous/OneDrive/Desktop/New%20folder%20(2)/start_game.bat) or open [`index.html`](file:///c:/Users/skous/OneDrive/Desktop/New%20folder%20(2)/index.html) in your browser.
2. **First-Person Walkaround**: Use **`W/A/S/D`** to walk, **`Shift`** to sprint, and **`Mouse Drag`** to look around the facility.
3. **Select Mission**: Press **`[E]`** or click **`MISSIONS`** to review flight objectives, NASA benchmarks, and Wanted Star ratings.
4. **VAB Rocket Assembly**: Mix and match engines, tanks, and boosters. Compare your stack against real NASA Saturn V, Space Shuttle, and Falcon 9 specifications.
5. **Rollout & Launch**: Execute T-10s countdown, atmospheric ascent, staging, and payload deployment.

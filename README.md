# 🏎️ Antigravity Apex - High-Fidelity 3D Supercar Racing Game

[![GitHub Repository](https://img.shields.io/badge/GitHub-ycyong99%2FRacing__game-blue?logo=github)](https://github.com/ycyong99/Racing_game)
[![Platform](https://img.shields.io/badge/Platform-Web%20%2F%20HTML5%20%2F%20WebGL-green)](#)
[![Tech Stack](https://img.shields.io/badge/Built%20With-Three.js%20%2F%20Web%20Audio%20API-orange)](#)

> **Antigravity Apex** is a photorealistic, browser-based 3D supercar racing simulator built from scratch to showcase the engineering and creative capabilities of **Google Antigravity**. Built entirely with pure WebGL, Three.js, and procedural Web Audio API synthesis, it features 3 world-class circuits, dynamic times of day, smart multi-car AI pack racing, high-fidelity vehicle physics with automatic reverse, and cockpit telemetry.

---

## ⚡ Quick Play & Live Deployment

### Play Locally
1. Clone or download the repository:
   ```bash
   git clone https://github.com/ycyong99/Racing_game.git
   ```
2. Double-click `launch.bat` (Windows) or open `index.html` directly in **Google Chrome**, **Brave**, or **Microsoft Edge**.

### 🌐 Play on the Web via GitHub Pages
You can host and play this game live on GitHub Pages with zero server setup:
1. On GitHub, navigate to your repository: [https://github.com/ycyong99/Racing_game](https://github.com/ycyong99/Racing_game).
2. Click **Settings** &rarr; **Pages** (under the "Code and automation" sidebar).
3. Under **Branch**, select `main` (or `master`) and folder `/ (root)`.
4. Click **Save**. Within a couple of minutes, your game will be live at:
   ```
   https://ycyong99.github.io/Racing_game/
   ```

---

## 🎮 Driving Controls (Arrow Keys & Automatic Reverse)

| Input Action | Keyboard Key | Gamepad (Xbox / PS) | Touch / Mobile |
| :--- | :--- | :--- | :--- |
| **Forward / Accelerate** | <kbd>↑</kbd> (Up Arrow) / <kbd>W</kbd> | <kbd>RT</kbd> / <kbd>R2</kbd> or <kbd>A</kbd> | GAS Pedal |
| **Reverse / Brake (Auto)** | <kbd>↓</kbd> (Down Arrow) / <kbd>S</kbd> | <kbd>LT</kbd> / <kbd>L2</kbd> | BRAKE Pedal |
| **Steering (Left / Right)**| <kbd>←</kbd> / <kbd>→</kbd> (Left / Right) / <kbd>A</kbd> / <kbd>D</kbd> | Left Analog Thumbstick | ◀ / ▶ Buttons |
| **Steering Sensitivity** | <kbd>[</kbd> (Softer) / <kbd>]</kbd> (Sharper) | - | Settings Slider / Presets |
| **Circuit & Time Menu** | <kbd>T</kbd> | - | Top CIRCUIT & TIME Button |
| **Drift / Handbrake** | <kbd>SPACE</kbd> | <kbd>A</kbd> / <kbd>Cross</kbd> | HANDBRAKE Button |
| **Nitrous Oxide (NOS)** | <kbd>L-SHIFT</kbd> or <kbd>N</kbd> | <kbd>X</kbd> / <kbd>Square</kbd> | NITRO Button |
| **Cycle Camera (5 Angles)**| <kbd>C</kbd> | <kbd>Y</kbd> / <kbd>Triangle</kbd> | Top CAM Button |
| **Mute / Unmute Audio** | <kbd>M</kbd> | - | Top AUDIO Button / Drawer |
| **Emergency Track Reset** | <kbd>R</kbd> | <kbd>Back / View</kbd> | UI Reset |
| **Race Settings** | <kbd>ESC</kbd> or <kbd>TAB</kbd> | <kbd>Start / Menu</kbd> | Top SETUP Button |

> **Seamless Automatic Reverse:** Holding <kbd>↓</kbd> (Down Arrow) decelerates forward motion, then **automatically engages reverse and backs up**. Tapping <kbd>↑</kbd> (Up Arrow) while reversing brakes reverse motion and automatically resumes driving forward. No manual gear shift or <kbd>R</kbd> key required!

---

## 🏁 3 World-Class Race Circuits

Antigravity Apex features 3 completely distinct procedural circuits with custom road geometry, elevation changes, and themed scenic landmarks:

1. **🏔️ Alpine Apex GP (2.5 KM)**
   * Grand Prix circuit featuring high-speed straights, sweeping banked curves, 36m mountain elevation climb, pine forest valleys, and an illuminated mountain tunnel.
2. **🏜️ Akina Canyon Touge (2.8 KM)**
   * Technical mountain drift pass carving through sheer red sandstone cliffs, rapid downhill S-curves, and cliffside hairpins.
3. **🌃 Neo Tokyo Expressway (3.2 KM)**
   * High-speed urban coastal highway featuring a 700m flat-out straight, massive dual-pylon suspension bridge, water canal viaducts, and 90+ glowing neon skyscrapers.

---

## ☀️ Dynamic Lighting & Weather Presets

Toggle lighting and atmospheric conditions at any time (<kbd>T</kbd> key):

* **☀️ Noon (Midday)**: Overhead sun, clear blue atmospheric sky, crisp shadows, calibrated dielectric PBR road textures with zero glare, and maximum visibility.
* **🌅 Dusk (Sunset)**: Golden hour horizon, burning amber-orange atmospheric haze, long cinematic shadows, and highway streetlamps.
* **🌙 Night (Midnight)**: Midnight moonlit sky, glowing car matrix LED projector headlights, illuminated neon city billboards, and sodium streetlights.
* **🌧️ Rainy Night**: Falling dynamic rain particle simulation, wet road puddles with specular reflections, and lens water droplets.
* **⚡ Cyber Twilight**: Synthwave twilight sky with glowing cyan and magenta illumination.

---

## 👥 Multi-Car AI Pack Racing & Starting Grid

* **Selectable Grid Size**: Choose between **4, 6, 8 (Default), or 10 Racers** in the Circuit or Settings menus.
* **Staggered 2-by-2 Starting Grid**: Cars line up in authentic 2-by-2 formation down the starting straight before lights turn green.
* **Smart Overtaking & Pack Avoidance**: AI hypercars read upcoming track curvature, slipstream in drafts, dynamically diverge lanes to overtake, and feature soft lateral repulsion to prevent model clipping.
* **Roster of 9 Unique Competitors**:
  * *Apex Phantom* (`#ffaa00` Amber Gold) — High aggression, daring overtaker
  * *Veloce Cyber* (`#00f0ff` Electric Cyan) — Precision apex line racer
  * *Crimson Fury* (`#ff003c` Scuderia Red) — Aggressive late-braker
  * *Cobalt Beast* (`#2563eb` Royal Blue) — High straight-line speed powerhouse
  * *Viper Green* (`#39ff14` Acid Lime) — Smooth corner carver
  * *Shadow GT* (`#22252c` Stealth Carbon) — Disciplined defender
  * *Hyper Violet* (`#a855f7` Synthwave Purple) — Technical touge drifter
  * *Solar Flare* (`#ff5500` Lava Orange) — High-line passer
  * *Silver Arrow* (`#e2e8f0` Chrome Silver) — High-speed endurance cruiser

---

## 🎯 Adjustable Steering Sensitivity

* **Sensitivity Range**: Continuous 20% to 140% steering response with live percentage readouts.
* **On-the-Fly Hotkeys**: Tap <kbd>[</kbd> to soften steering (-5%) or <kbd>]</kbd> to sharpen steering (+5%).
* **Speed-Sensitive Lock Angle & Lateral G-Clamping**: High-speed stability algorithms automatically trim maximum wheel lock at high velocity, preventing snap oversteer.

---

## 🔊 Re-Engineered Procedural Audio Synthesizer

* **100% Self-Contained**: Powered by the Web Audio API without any external MP3/WAV files.
* **Mechanical Supercar Audio**:
  * Crankshaft sub-bass rumble, primary cylinder firing pulse, and harmonic octave overtone.
  * Analog soft-saturation (`tanh`) waveshaper and flat Butterworth lowpass filter ($Q = 0.5$) preventing speech-like vocal resonances.
  * Induction airflow and turbo aspiration noise layer.
* **FX**: Tire screech friction on drift slip, wind roar scaling with speed, backfire pops on gear shifts, and Nitrous hiss.
* **Interactive Audio Control**: Instant mute/unmute via <kbd>M</kbd> or top HUD button.

---

## 📁 Project Structure

```
Racing_game/
├── index.html            # Main HTML5 container, HUD telemetry, modals
├── launch.bat            # One-click Windows batch launcher
├── README.md             # Project documentation & GitHub guide
├── css/
│   └── style.css         # Glassmorphism UI, speedometer, mini-map & responsive design
└── js/
    ├── main.js           # Game loop orchestrator, race state machine, camera director
    ├── audio.js          # Procedural Web Audio API engine & FX synthesizer
    ├── controls.js       # Keyboard, Gamepad (Xbox/PS), & Touch input manager
    ├── physics.js        # Vehicle physics engine, suspension roll, Pacejka drift friction
    ├── car.js            # PBR hypercar 3D model generator, materials & active aero
    ├── track.js          # Procedural 3D circuits (Alpine, Canyon, Tokyo Expressway)
    ├── ai.js             # Autonomous AI rival racers with pack overtaking
    ├── environment.js    # Skybox shaders, lighting presets (Noon, Dusk, Night, Rain)
    ├── postprocessing.js # ACES tone mapping, calibrated Unreal bloom, speed blur
    └── hud.js            # Real-time dashboard telemetry, mini-map, lap timing
```

---

## 🛠️ Compatibility
* **Browsers**: Google Chrome (Recommended), Brave, Microsoft Edge, Mozilla Firefox, Apple Safari.
* **Graphics API**: WebGL 2.0 supported GPU.
* **Devices**: Desktop, Laptop, Tablet, Mobile (Touch controls included), Gamepads.

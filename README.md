# 🏎️ Antigravity Apex - High-Fidelity 3D Supercar Racing Game

> **Antigravity Apex** is a high-fidelity 3D racing simulator engineered to test out and showcase the full capabilities of **Google Antigravity**. Built entirely with pure WebGL, Three.js, and procedural Web Audio API synthesis, it delivers realistic vehicle physics, high visual fidelity, dynamic weather, smart AI rivals, and full supercar cockpit telemetry.

---

## ⚡ Quick Start

### 1. Launch Game
Simply double-click:
```bat
launch.bat
```
*Or open `index.html` directly in Google Chrome, Brave, or Microsoft Edge.*

---

## 🎮 Driving Controls

| Input Action | Keyboard Key | Gamepad (Xbox / PS) | Touch / Mobile |
| :--- | :--- | :--- | :--- |
| **Forward / Accelerate** | <kbd>↑</kbd> (Up Arrow) or <kbd>W</kbd> | <kbd>RT</kbd> / <kbd>R2</kbd> or <kbd>A</kbd> | GAS Pedal |
| **Reverse / Brake (Auto)** | <kbd>↓</kbd> (Down Arrow) or <kbd>S</kbd> | <kbd>LT</kbd> / <kbd>L2</kbd> | BRAKE Pedal |
| **Steering (Left / Right)**| <kbd>←</kbd> / <kbd>→</kbd> (Left / Right) or <kbd>A</kbd> / <kbd>D</kbd> | Left Analog Thumbstick | ◀ / ▶ Buttons |
| **Drift / Handbrake** | <kbd>SPACE</kbd> | <kbd>A</kbd> / <kbd>Cross</kbd> | HANDBRAKE Button |
| **Nitrous Oxide (NOS)** | <kbd>L-SHIFT</kbd> or <kbd>N</kbd> | <kbd>X</kbd> / <kbd>Square</kbd> | NITRO Button |
| **Cycle Camera (5 Modes)**| <kbd>C</kbd> | <kbd>Y</kbd> / <kbd>Triangle</kbd> | Top CAM Button |
| **Reset Car on Track** | <kbd>R</kbd> (Emergency reset if stuck) | <kbd>Back / View</kbd> | UI Reset |
| **Mute / Unmute Audio** | <kbd>M</kbd> | - | Settings Drawer |
| **In-Game Settings** | <kbd>ESC</kbd> or <kbd>TAB</kbd> | <kbd>Start / Menu</kbd> | Top SETUP Button |

> **Seamless Automatic Reverse:** Holding <kbd>↓</kbd> (Down Arrow) brakes if moving forward, then **automatically engages reverse and backs up** smoothly. When reversing, tapping <kbd>↑</kbd> (Up Arrow) brakes reverse motion and automatically resumes driving forward. No manual gear shift or <kbd>R</kbd> key required!

---

## 🌟 Key Features & Engineering Highlights

### 1. Photorealistic Visual Fidelity & PBR Shading
- **Clearcoat Hypercar Paint**: Crafted with `THREE.MeshPhysicalMaterial` featuring dual-layer clearcoat, metallic flakes, Fresnel reflections, and mirror gloss finish.
- **Active Aerodynamics**: The rear carbon fiber wing dynamically tilts up as an **air brake** during hard deceleration.
- **Carbon-Ceramic Brakes**: Ventilated slotted brake rotors with **dynamic thermal emissive glow** that heats up cherry red under intense braking.
- **Projector LED Headlights & Taillights**: Dual projector lenses with real Three.js `SpotLight`s illuminating the asphalt road ahead, volumetric atmospheric light cones, and edge-to-edge neon taillights.
- **Twin Jet Exhaust Flames**: Dynamic blue plasma fire erupts during Nitrous Boost, with orange backfire pops during high-RPM gear shifts.

### 2. Grand Scenic Circuit & Dynamic Weather System
- **2.5 km Grand Prix Circuit**: Closed 3D Catmull-Rom spline with high-speed straights, sweeping banked curves, mountain elevation climbs, and an illuminated mountain tunnel.
- **4 Dynamic Atmospheric Presets**:
  1. **Golden Sunset (Default)**: Warm amber directional sun, dramatic long shadows, deep twilight gradient sky, and warm atmospheric haze.
  2. **Wet Rainy Night**: Falling dynamic rain particle simulation, slick asphalt with puddle specular reflections, tire water spray mist, and water droplets on the camera lens.
  3. **Crisp Daylight**: Clean Mediterranean midday sun, vibrant colors, and crisp shadows.
  4. **Cyber Twilight**: Synthwave neon sky with vibrant magenta/cyan lighting.
- **Track Furniture**: Armco steel guardrails with support posts, red-and-white rumble curbs, start/finish gantry with timing lights, grandstands, and highway mast floodlights.

### 3. Realistic Vehicle Dynamics & Drift Engine
- **Weight Transfer & Suspension**: Longitudinal pitch (brake dive and acceleration squat) and lateral roll calculated from vehicle G-forces.
- **Pacejka-Inspired Tire Friction**: Combined longitudinal and lateral grip circle.
- **Controlled Drift Mechanics**: Pulling the handbrake (<kbd>SPACE</kbd>) induces rear slip; counter-steering applies stabilizing yaw torque, enabling smooth, cinematic drifts.
- **Drift Scoring System**: Real-time multiplier based on drift angle, speed, and continuous combo duration.
- **7-Speed Transmission**: Realistic RPM power curves with automatic gear shifts or manual control.
- **Nitrous Oxide Boost**: Massive torque surge (+45%) with radial speed blur and FOV camera expansion.

### 4. Smart AI Opponents
- **3 Autonomous Rival Hypercars**:
  - *Apex Phantom* (Aggressive orange hypercar)
  - *Veloce Cyber* (Precision cyan hypercar)
  - *Shadow GT* (Smooth black overtaker)
- Dynamic spline waypoint tracking with curvature-based braking before sharp corners, slipstreaming, and collision avoidance.

### 5. Web Audio API Sound Synthesizer
- **100% Procedural & Self-Contained**: No external audio files or network dependencies.
- Multi-harmonic engine oscillator frequency-modulated by RPM and throttle.
- Turbo blowoff valve hisses and backfire pops.
- Tire screech noise modulated by tire slip ratio.
- High-speed aerodynamic wind roar and Nitrous thruster sound.

### 6. Cockpit Telemetry & 5 Camera Angles
- **Supercar HUD**: Digital tachometer arc with redline shift lights, digital speedometer (KM/H or MPH), gear indicator, circular GPS track mini-map with real-time AI and player blips, and best lap timing.
- **5 Camera Perspectives**:
  1. *Dynamic Chase Cam* (Cinematic spring arm with high-speed lag)
  2. *First-Person Cockpit Cam* (Behind the turning steering wheel inside the cabin)
  3. *Hood / Bonnet Cam* (Low-slung forward view)
  4. *Bumper Cam* (Ultra-low asphalt perspective)
  5. *Drone Cam* (Panoramic orbiting viewpoint)

---

## 📁 Project Architecture

```
Test_Project/
├── index.html            # Main HTML5 game container, HUD layout, modals
├── launch.bat            # One-click Windows batch launcher
├── README.md             # Project documentation & reference manual
├── css/
│   └── style.css         # Glassmorphism supercar UI, telemetry & animations
└── js/
    ├── main.js           # Game loop orchestrator, camera director, race state
    ├── audio.js          # Web Audio API engine & tire screech synthesizer
    ├── controls.js       # Keyboard, Gamepad (Xbox/PS), & Touch input manager
    ├── physics.js        # Vehicle physics engine, suspension, tires, drifting
    ├── car.js            # PBR hypercar 3D model generator & materials
    ├── track.js          # 3D spline circuit, asphalt textures, barriers, tunnel
    ├── ai.js             # Autonomous AI rival racers with collision avoidance
    ├── environment.js    # Skybox, weather systems (rain, puddles, lighting)
    ├── postprocessing.js # Tone mapping, Unreal bloom, radial speed blur
    └── hud.js            # Real-time dashboard telemetry, mini-map, lap timing
```

---

## 🛠️ Requirements & Compatibility
- **Browsers**: Google Chrome (Recommended), Brave Browser, Microsoft Edge, or Mozilla Firefox.
- **Hardware Acceleration**: WebGL 2.0 supported GPU.
- **Input Devices**: Keyboard, Mouse, Xbox / PlayStation Gamepad, or Touchscreen.

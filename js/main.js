/**
 * Antigravity Apex - Core Game Engine & Orchestrator
 * High-performance game loop, multi-perspective cameras, race state machine, and settings.
 */

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = null;
    this.scene = null;
    this.camera = null;

    // Subsystems
    this.track = null;
    this.playerPhysics = null;
    this.playerCar = null;
    this.aiManager = null;
    this.environment = null;
    this.postprocessing = null;
    this.hud = null;

    // Race State Machine
    this.raceState = {
      status: 'COUNTDOWN', // 'COUNTDOWN' | 'RACING' | 'FINISHED' | 'FREEROAM'
      currentLap: 1,
      totalLaps: 3,
      lapTime: 0,
      bestLapTime: Infinity,
      totalTime: 0,
      position: 1,
      countdownTimer: 3.5,
      lastWaypointU: 0.0,
      lineCrossings: 0 // net forward crossings of the start/finish line
    };

    // Camera Modes
    // 0: Chase (Dynamic Spring Arm)
    // 1: Cockpit (First Person)
    // 2: Hood / Bonnet
    // 3: Bumper
    // 4: Drone / Cinematic
    this.cameraMode = 0;
    this.cameraModesCount = 5;
    this.cameraModeNames = ["CHASE CAM", "COCKPIT CAM", "HOOD CAM", "BUMPER CAM", "DRONE CAM"];

    // Camera Spring State
    this.cameraTargetPos = new THREE.Vector3();
    this.cameraCurrentPos = new THREE.Vector3();
    this.cameraLookTarget = new THREE.Vector3();
    this.cameraCurrentLook = new THREE.Vector3();
    this.cameraShakeIntensity = 0;

    // Timing
    this.clock = new THREE.Clock();
    this.isRunning = false;

    // Quality setting
    this.graphicsQuality = 'ultra'; // 'ultra' | 'high' | 'medium'

    // Circuit & Time of Day selection
    this.currentTrackId = 'alpine'; // 'alpine' | 'canyon' | 'city'
    this.currentTimeOfDay = 'noon'; // 'noon' | 'dusk' | 'night'
  }

  init() {
    // 0. Load persistent preferences
    try {
      const savedTrack = localStorage.getItem('antigravity_track_id');
      if (savedTrack && ['alpine', 'canyon', 'city'].includes(savedTrack)) {
        this.currentTrackId = savedTrack;
      }
      const savedTime = localStorage.getItem('antigravity_time_of_day');
      if (savedTime && ['noon', 'dusk', 'night', 'rain', 'cyber', 'sunset', 'daylight'].includes(savedTime)) {
        this.currentTimeOfDay = (savedTime === 'daylight' ? 'noon' : (savedTime === 'sunset' ? 'dusk' : savedTime));
      } else {
        this.currentTimeOfDay = 'noon';
      }
    } catch (e) {}

    // 1. Initialize Three.js Scene & Renderer
    this.scene = new THREE.Scene();

    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1500);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Build Track
    this.track = new RaceTrack({ scene: this.scene, trackId: this.currentTrackId });

    // 3. Build Player Vehicle
    this.playerPhysics = new VehiclePhysics({ track: this.track });
    this.resetPlayerToGrid();

    this.playerCar = new CarModel({
      scene: this.scene,
      isPlayer: true,
      primaryColor: 0xd40b1e
    });

    // 4. Build AI Opponents
    this.aiManager = new AIManager({
      scene: this.scene,
      track: this.track
    });

    // 5. Build Environment & Dynamic Weather
    this.environment = new EnvironmentSystem({
      scene: this.scene,
      renderer: this.renderer,
      track: this.track
    });
    window.Environment = this.environment;
    this.environment.applyPreset(this.currentTimeOfDay);
    if (this.playerCar && this.playerCar.setHeadlightsMode) {
      this.playerCar.setHeadlightsMode(this.currentTimeOfDay);
    }

    // 6. Build Cinematic Post-Processing
    this.postprocessing = new PostProcessingManager({
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera
    });
    if (this.postprocessing && this.postprocessing.setTimeOfDay) {
      this.postprocessing.setTimeOfDay(this.currentTimeOfDay);
    }

    // 7. Build HUD & Telemetry
    this.hud = new HUDController({ track: this.track });
    window.HUD = this.hud;

    // 8. Event Listeners & UI Bindings
    this.bindEvents();
    this.initSavedRecords();
    this.syncCompetitorUI();

    // 9. Position Camera Initially
    this.cameraCurrentPos.copy(this.playerPhysics.position).add(new THREE.Vector3(0, 5, -12));
    this.camera.position.copy(this.cameraCurrentPos);

    // 10. Start Loop
    this.isRunning = true;

    // Show Circuit & Time selection modal on launch so player chooses track & time
    try {
      const welcomed = sessionStorage.getItem('antigravity_race_setup_seen');
      if (!welcomed) {
        const trackModal = document.getElementById('race-select-modal');
        if (trackModal) trackModal.classList.add('active');
        sessionStorage.setItem('antigravity_race_setup_seen', 'true');
      }
    } catch (e) {}

    this.startCountdown();
    this.animate();
  }

  bestLapKey() {
    return `antigravity_best_lap_${this.currentTrackId}`;
  }

  loadBestLap() {
    this.raceState.bestLapTime = Infinity;
    try {
      const savedBest = parseFloat(localStorage.getItem(this.bestLapKey()));
      if (savedBest > 0) {
        this.raceState.bestLapTime = savedBest;
      }
    } catch (e) {}
  }

  initSavedRecords() {
    this.loadBestLap();
    try {
      const savedSens = localStorage.getItem('antigravity_steer_sens');
      if (savedSens) {
        this.setSteeringSensitivity(parseFloat(savedSens));
      } else {
        this.setSteeringSensitivity(0.55);
      }
    } catch (e) {
      this.setSteeringSensitivity(0.55);
    }
    this.syncTrackAndTimeUI();
  }

  startCountdown() {
    if (window.Sound) window.Sound.resume();
    this.raceState.status = 'COUNTDOWN';
    this.raceState.countdownTimer = 3.2;
    this.raceState.currentLap = 1;
    this.raceState.lapTime = 0;
    this.raceState.totalTime = 0;
    this.raceState.position = 1;
    this.raceState.lastWaypointU = 0;
    this.raceState.lineCrossings = 0;

    // Reset start lights and text left over from a previous countdown
    ['pod-1', 'pod-2', 'pod-3'].forEach(id => {
      const pod = document.getElementById(id);
      if (pod) pod.classList.remove('red', 'green');
    });
    const countText = document.getElementById('countdown-text');
    if (countText) {
      countText.innerText = "READY";
      countText.style.color = "";
    }

    const overlay = document.getElementById('countdown-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.onclick = () => {
        this.raceState.status = 'RACING';
        overlay.style.display = 'none';
        if (window.Sound) window.Sound.playCountdownBeep(true);
      };
    }
  }

  updateCountdown(dt) {
    if (this.raceState.status !== 'COUNTDOWN') return;
    if (this.isRaceSelectOpen()) return; // hold the lights while the player is choosing a race

    this.raceState.countdownTimer -= dt;
    const t = this.raceState.countdownTimer;

    const light1 = document.getElementById('pod-1');
    const light2 = document.getElementById('pod-2');
    const light3 = document.getElementById('pod-3');
    const countText = document.getElementById('countdown-text');

    if (t > 2.8) {
      if (light1 && !light1.classList.contains('red')) {
        light1.classList.add('red');
        if (window.Sound) window.Sound.playCountdownBeep(false);
      }
      if (countText) countText.innerText = "3";
    } else if (t > 1.8) {
      if (light2 && !light2.classList.contains('red')) {
        light2.classList.add('red');
        if (window.Sound) window.Sound.playCountdownBeep(false);
      }
      if (countText) countText.innerText = "2";
    } else if (t > 0.8) {
      if (light3 && !light3.classList.contains('red')) {
        light3.classList.add('red');
        if (window.Sound) window.Sound.playCountdownBeep(false);
      }
      if (countText) countText.innerText = "1";
    } else if (t > 0) {
      // GO!
      if (light1) { light1.classList.remove('red'); light1.classList.add('green'); }
      if (light2) { light2.classList.remove('red'); light2.classList.add('green'); }
      if (light3) { light3.classList.remove('red'); light3.classList.add('green'); }
      if (countText && countText.innerText !== "GO!") {
        countText.innerText = "GO!";
        countText.style.color = "#00ff66";
        if (window.Sound) window.Sound.playCountdownBeep(true);
      }
    } else {
      // Race Active!
      this.raceState.status = 'RACING';
      const overlay = document.getElementById('countdown-overlay');
      if (overlay) overlay.style.display = 'none';
    }
  }

  updateRaceProgress(dt) {
    if (this.raceState.status !== 'RACING') return;

    this.raceState.lapTime += dt;
    this.raceState.totalTime += dt;

    // Check lap completion via track spline progression
    const trackInfo = this.track.getTrackInfoAt(this.playerPhysics.position);
    if (!trackInfo) return;

    const currentU = trackInfo.progressU;
    const lastU = this.raceState.lastWaypointU;

    // Track net crossings of the start/finish line so that reversing over it
    // and driving forward again does not count as a completed lap
    if (lastU > 0.88 && currentU < 0.12) {
      this.raceState.lineCrossings++;
      if (this.raceState.lineCrossings >= this.raceState.currentLap) {
        this.onLapCompleted();
      }
    } else if (lastU < 0.12 && currentU > 0.88) {
      this.raceState.lineCrossings--;
    }
    this.raceState.lastWaypointU = currentU;

    // Compute player total distance traveled
    const playerTotalDist = (this.raceState.lineCrossings + currentU) * this.track.trackLength;

    // Compute real-time leaderboard position
    const leaderData = this.aiManager.getLeaderboard(playerTotalDist);
    this.raceState.position = leaderData.playerPosition;
    this.raceState.totalRacers = leaderData.totalRacers;
  }

  onLapCompleted() {
    const completedLapTime = this.raceState.lapTime;
    let isBest = false;

    if (completedLapTime < this.raceState.bestLapTime) {
      this.raceState.bestLapTime = completedLapTime;
      isBest = true;
      try {
        localStorage.setItem(this.bestLapKey(), completedLapTime.toString());
      } catch (e) {}
    }

    if (window.Sound) {
      window.Sound.playLapChime(isBest);
    }

    if (this.hud) {
      this.hud.showToast(isBest ? "NEW BEST LAP RECORD!" : `LAP ${this.raceState.currentLap} COMPLETED`);
    }

    if (this.raceState.currentLap >= this.raceState.totalLaps) {
      // Race Finished!
      this.finishRace();
    } else {
      this.raceState.currentLap++;
      this.raceState.lapTime = 0;
    }
  }

  finishRace() {
    this.raceState.status = 'FINISHED';

    const finishModal = document.getElementById('finish-modal');
    const posNum = document.getElementById('finish-pos-num');
    const timeVal = document.getElementById('finish-time-val');
    const bestVal = document.getElementById('finish-best-val');
    const driftVal = document.getElementById('finish-drift-val');

    if (posNum) {
      const suffixes = ["ST", "ND", "RD", "TH"];
      const s = suffixes[Math.min(3, this.raceState.position - 1)];
      posNum.innerText = `${this.raceState.position}${s}`;
    }
    if (timeVal) timeVal.innerText = this.hud.formatTime(this.raceState.totalTime);
    if (bestVal) bestVal.innerText = this.hud.formatTime(this.raceState.bestLapTime);
    if (driftVal) driftVal.innerText = `${this.playerPhysics.driftScore} PTS`;

    if (finishModal) finishModal.classList.add('active');
  }

  restartRace() {
    const finishModal = document.getElementById('finish-modal');
    if (finishModal) finishModal.classList.remove('active');

    this.resetPlayerToGrid();
    this.aiManager.resetAll();
    this.startCountdown();
  }

  resetPlayerToGrid() {
    const start = this.track.getStartPose();
    this.playerPhysics.reset(start.position.clone().add(new THREE.Vector3(0, 0.52, 0)), start.angle);
  }

  isRaceSelectOpen() {
    const trackModal = document.getElementById('race-select-modal');
    return !!(trackModal && trackModal.classList.contains('active'));
  }

  // Emergency respawn: put the car back on the centre line at its current track position
  respawnPlayerOnTrack() {
    const info = this.track.getTrackInfoAt(this.playerPhysics.position);
    if (!info) return;
    const wp = this.track.waypoints[info.waypointIndex];
    const angle = Math.atan2(info.tangent.x, info.tangent.z);
    this.playerPhysics.reset(wp.position.clone().add(new THREE.Vector3(0, 0.52, 0)), angle, true);
  }

  updateCamera(dt) {
    const p = this.playerPhysics;
    const forward = p.forward;
    const up = p.up;
    const right = p.right;
    const speedRatio = Math.min(1.0, Math.abs(p.speedKmh) / 320);

    // Compute base camera position depending on mode
    let offset = new THREE.Vector3();
    let lookOffset = new THREE.Vector3();
    let fov = 65;
    let smoothSpeed = 12.0;

    switch (this.cameraMode) {
      case 0: // Chase Cam (Dynamic spring arm)
        const chaseDist = 6.8 + speedRatio * 2.8;
        const chaseHeight = 2.4 - speedRatio * 0.4;
        offset = forward.clone().multiplyScalar(-chaseDist).add(up.clone().multiplyScalar(chaseHeight));
        lookOffset = forward.clone().multiplyScalar(12.0).add(up.clone().multiplyScalar(1.2));
        fov = 65 + speedRatio * 16;
        if (p.isNosActive) fov += 8;
        smoothSpeed = 14.0;
        break;

      case 1: // Cockpit Cam (Inside driver's seat)
        offset = forward.clone().multiplyScalar(-0.25).add(up.clone().multiplyScalar(0.78)).add(right.clone().multiplyScalar(-0.32));
        lookOffset = forward.clone().multiplyScalar(18.0).add(up.clone().multiplyScalar(0.72));
        fov = 75 + speedRatio * 10;
        smoothSpeed = 26.0;
        break;

      case 2: // Hood / Bonnet Cam
        offset = forward.clone().multiplyScalar(1.1).add(up.clone().multiplyScalar(0.68));
        lookOffset = forward.clone().multiplyScalar(22.0).add(up.clone().multiplyScalar(0.55));
        fov = 72 + speedRatio * 12;
        smoothSpeed = 22.0;
        break;

      case 3: // Bumper Cam
        offset = forward.clone().multiplyScalar(2.1).add(up.clone().multiplyScalar(0.25));
        lookOffset = forward.clone().multiplyScalar(24.0).add(up.clone().multiplyScalar(0.22));
        fov = 80 + speedRatio * 14;
        smoothSpeed = 28.0;
        break;

      case 4: // Drone Cam (High cinematic orbit)
        offset = forward.clone().multiplyScalar(-15.0).add(up.clone().multiplyScalar(7.5));
        lookOffset = forward.clone().multiplyScalar(4.0).add(up.clone().multiplyScalar(1.0));
        fov = 55;
        smoothSpeed = 5.0;
        break;
    }

    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();

    this.cameraTargetPos.copy(p.position).add(offset);
    this.cameraLookTarget.copy(p.position).add(lookOffset);

    // Apply Camera Shake from speed and rumble strips
    const shakeAmount = (speedRatio * 0.04) + (p.brakeDiscHeat > 0.4 ? 0.03 : 0);
    if (shakeAmount > 0.005) {
      this.cameraTargetPos.x += (Math.random() - 0.5) * shakeAmount;
      this.cameraTargetPos.y += (Math.random() - 0.5) * shakeAmount;
      this.cameraTargetPos.z += (Math.random() - 0.5) * shakeAmount;
    }

    // Smooth slerp camera position & look-at
    this.cameraCurrentPos.lerp(this.cameraTargetPos, Math.min(1.0, dt * smoothSpeed));
    this.cameraCurrentLook.lerp(this.cameraLookTarget, Math.min(1.0, dt * (smoothSpeed * 1.2)));

    this.camera.position.copy(this.cameraCurrentPos);
    this.camera.lookAt(this.cameraCurrentLook);
  }

  toggleCamera() {
    this.cameraMode = (this.cameraMode + 1) % this.cameraModesCount;
    if (this.hud) {
      this.hud.showToast(this.cameraModeNames[this.cameraMode]);
    }
  }

  bindEvents() {
    // Resize handler
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      if (this.postprocessing) {
        this.postprocessing.setSize(w, h);
      }
    });

    // Top action buttons
    const btnCam = document.getElementById('btn-cam');
    if (btnCam) btnCam.addEventListener('click', () => this.toggleCamera());

    // Audio Mute Buttons & UI sync
    const btnAudioMute = document.getElementById('btn-audio-mute');
    const btnAudioText = document.getElementById('btn-audio-text');
    const audioWaves = document.getElementById('audio-icon-waves');
    const btnSettingsMute = document.getElementById('btn-settings-mute');

    this.updateAudioUI = (muted) => {
      if (btnAudioText) btnAudioText.textContent = muted ? "MUTED (M)" : "AUDIO (M)";
      if (btnAudioMute) {
        if (muted) btnAudioMute.classList.add('muted');
        else btnAudioMute.classList.remove('muted');
      }
      if (btnSettingsMute) {
        btnSettingsMute.textContent = muted ? "Unmute Audio (M)" : "Mute Audio (M)";
      }
      if (audioWaves) audioWaves.style.display = muted ? 'none' : 'block';
    };

    const handleAudioToggle = () => {
      if (window.Sound) {
        const muted = window.Sound.toggleMute();
        this.updateAudioUI(muted);
        if (this.hud) this.hud.showToast(muted ? "AUDIO MUTED" : "AUDIO ACTIVE");
      }
    };

    if (btnAudioMute) btnAudioMute.addEventListener('click', handleAudioToggle);
    if (btnSettingsMute) btnSettingsMute.addEventListener('click', handleAudioToggle);

    // Global user gesture audio unlock on first interaction
    const unlockAudio = () => {
      if (window.Sound) window.Sound.resume();
    };
    ['click', 'keydown', 'pointerdown', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, unlockAudio, { passive: true, once: true });
    });

    const btnSettings = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnResume = document.getElementById('btn-resume');

    const toggleModal = () => {
      if (settingsModal) settingsModal.classList.toggle('active');
    };

    if (btnSettings) btnSettings.addEventListener('click', toggleModal);
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', toggleModal);
    if (btnResume) btnResume.addEventListener('click', toggleModal);

    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) btnRestart.addEventListener('click', () => this.restartRace());

    // Weather Preset selector buttons
    const weatherBtns = document.querySelectorAll('.btn-weather');
    weatherBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        weatherBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const preset = btn.getAttribute('data-weather');
        this.environment.applyPreset(preset);
      });
    });

    // Car Paint Swatches
    const paintSwatches = document.querySelectorAll('.paint-swatch');
    paintSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        paintSwatches.forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        const colorHex = parseInt(swatch.getAttribute('data-color'), 16);
        this.playerCar.setPaintColor(colorHex);
      });
    });

    // Speed Unit selector buttons
    const unitBtns = document.querySelectorAll('.btn-unit');
    unitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        unitBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const unit = btn.getAttribute('data-unit');
        this.hud.setSpeedUnit(unit);
      });
    });

    // Quality selector buttons
    const qualityBtns = document.querySelectorAll('.btn-quality');
    qualityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        qualityBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const q = btn.getAttribute('data-quality');
        this.setGraphicsQuality(q);
      });
    });

    // Steering Sensitivity Slider
    const sliderSens = document.getElementById('slider-steer-sens');
    if (sliderSens) {
      sliderSens.addEventListener('input', (e) => {
        this.setSteeringSensitivity(parseFloat(e.target.value) / 100);
      });
    }

    // Steering Sensitivity Preset Buttons
    const sensBtns = document.querySelectorAll('.btn-sens');
    sensBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const sens = parseFloat(btn.getAttribute('data-sens'));
        this.setSteeringSensitivity(sens);
        if (this.hud) {
          this.hud.showToast(`STEERING SENSITIVITY: ${Math.round(sens * 100)}%`);
        }
      });
    });

    // Track & Time Modal Handlers
    const trackModal = document.getElementById('race-select-modal');
    const btnOpenTrack = document.getElementById('btn-open-track-modal');
    const btnCloseTrack = document.getElementById('btn-close-track-modal');
    const btnStartRace = document.getElementById('btn-start-selected-race');

    const toggleTrackModal = () => {
      if (trackModal) trackModal.classList.toggle('active');
    };

    if (btnOpenTrack) btnOpenTrack.addEventListener('click', toggleTrackModal);
    if (btnCloseTrack) btnCloseTrack.addEventListener('click', toggleTrackModal);
    if (btnStartRace) {
      btnStartRace.addEventListener('click', () => {
        if (trackModal) trackModal.classList.remove('active');
        // Full restart: puts cars back on the grid, not just the timer
        this.restartRace();
      });
    }

    // Interactive Track Cards (Modal)
    const trackCards = document.querySelectorAll('.track-card');
    trackCards.forEach(card => {
      card.addEventListener('click', () => {
        const trk = card.getAttribute('data-track');
        this.loadTrack(trk);
      });
    });

    // Interactive Time Cards (Modal)
    const timeCards = document.querySelectorAll('.time-card');
    timeCards.forEach(card => {
      card.addEventListener('click', () => {
        const tm = card.getAttribute('data-time');
        this.setTimeOfDay(tm);
      });
    });

    // Settings Modal Track Option Buttons
    const trackBtns = document.querySelectorAll('.btn-track-opt');
    trackBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const trk = btn.getAttribute('data-track');
        this.loadTrack(trk);
      });
    });

    // Settings Modal Time Option Buttons
    const timeBtns = document.querySelectorAll('.btn-time-opt');
    timeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tm = btn.getAttribute('data-time');
        this.setTimeOfDay(tm);
      });
    });

    // Grid Size Cards (Race Select Modal)
    const gridCards = document.querySelectorAll('.grid-size-card');
    gridCards.forEach(card => {
      card.addEventListener('click', () => {
        const count = parseInt(card.getAttribute('data-rivals'), 10);
        this.setCompetitorCount(count);
      });
    });

    // Grid Size Buttons (Settings Modal)
    const rivalBtns = document.querySelectorAll('.btn-rivals-opt');
    rivalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const count = parseInt(btn.getAttribute('data-rivals'), 10);
        this.setCompetitorCount(count);
      });
    });
  }

  loadTrack(trackId) {
    if (this.currentTrackId === trackId && this.track) {
      this.restartRace();
      return;
    }
    this.currentTrackId = trackId;
    try {
      localStorage.setItem('antigravity_track_id', trackId);
    } catch (e) {}
    this.loadBestLap();

    // 1. Dispose old track
    if (this.track) {
      this.track.dispose();
    }

    // 2. Build new track
    this.track = new RaceTrack({ scene: this.scene, trackId: trackId });

    // 3. Update player physics and reset to new start line
    this.playerPhysics.track = this.track;
    this.resetPlayerToGrid();

    // 4. Update AI Rivals
    if (this.aiManager) {
      this.aiManager.setTrack(this.track);
    }

    // 5. Update Environment (re-apply the preset so the new track's road wetness and streetlights match)
    if (this.environment) {
      this.environment.track = this.track;
      this.environment.applyPreset(this.currentTimeOfDay);
    }

    // 6. Update HUD mini-map bounds & name toast
    if (this.hud) {
      this.hud.track = this.track;
      this.hud.initMinimapBounds();
      this.hud.showToast(`CIRCUIT: ${this.track.trackName.toUpperCase()}`);
    }

    this.syncTrackAndTimeUI();
    this.restartRace();
  }

  setTimeOfDay(time) {
    this.currentTimeOfDay = time;
    try {
      localStorage.setItem('antigravity_time_of_day', time);
    } catch (e) {}

    if (this.environment) {
      this.environment.applyPreset(time);
    }

    if (this.playerCar && this.playerCar.setHeadlightsMode) {
      this.playerCar.setHeadlightsMode(time);
    }

    if (this.postprocessing && this.postprocessing.setTimeOfDay) {
      this.postprocessing.setTimeOfDay(time);
    }

    this.syncTrackAndTimeUI();

    const names = {
      noon: "NOON (MIDDAY)",
      dusk: "DUSK (SUNSET)",
      night: "NIGHT (MIDNIGHT)",
      rain: "RAINY NIGHT",
      cyber: "CYBER TWILIGHT"
    };
    if (this.hud) {
      this.hud.showToast(`TIME: ${names[time] || time.toUpperCase()}`);
    }
  }

  syncTrackAndTimeUI() {
    const trackCards = document.querySelectorAll('.track-card');
    trackCards.forEach(c => {
      c.classList.toggle('selected', c.getAttribute('data-track') === this.currentTrackId);
    });
    const trackBtns = document.querySelectorAll('.btn-track-opt');
    trackBtns.forEach(b => {
      b.classList.toggle('selected', b.getAttribute('data-track') === this.currentTrackId);
    });

    const timeCards = document.querySelectorAll('.time-card');
    timeCards.forEach(c => {
      c.classList.toggle('selected', c.getAttribute('data-time') === this.currentTimeOfDay);
    });
    const timeBtns = document.querySelectorAll('.btn-time-opt');
    timeBtns.forEach(b => {
      b.classList.toggle('selected', b.getAttribute('data-time') === this.currentTimeOfDay);
    });
  }

  setCompetitorCount(count) {
    if (this.aiManager) {
      this.aiManager.setRivalCount(count);
      this.raceState.totalRacers = this.aiManager.rivals.length + 1;
      this.syncCompetitorUI();
      if (this.hud) {
        this.hud.showToast(`GRID SIZE: ${this.raceState.totalRacers} CARS (${this.aiManager.rivals.length} RIVALS)`);
      }
    }
  }

  syncCompetitorUI() {
    const rivalCount = this.aiManager ? this.aiManager.rivalCount : 7;
    const gridCards = document.querySelectorAll('.grid-size-card');
    gridCards.forEach(c => {
      c.classList.toggle('selected', parseInt(c.getAttribute('data-rivals'), 10) === rivalCount);
    });
    const rivalBtns = document.querySelectorAll('.btn-rivals-opt');
    rivalBtns.forEach(b => {
      b.classList.toggle('selected', parseInt(b.getAttribute('data-rivals'), 10) === rivalCount);
    });
    const posTotal = document.getElementById('hud-pos-total');
    if (posTotal) {
      posTotal.innerText = `/ ${rivalCount + 1}`;
    }
  }

  setSteeringSensitivity(val) {
    const clamped = Math.max(0.2, Math.min(1.4, Math.round(val * 100) / 100));
    if (this.playerPhysics) {
      this.playerPhysics.steerSensitivity = clamped;
    }
    try {
      localStorage.setItem('antigravity_steer_sens', clamped.toString());
    } catch (e) {}

    const slider = document.getElementById('slider-steer-sens');
    const badge = document.getElementById('val-steer-sens');
    const pct = Math.round(clamped * 100);
    if (slider) slider.value = pct;
    if (badge) badge.innerText = `${pct}%`;

    // Highlight matching preset button
    const sensBtns = document.querySelectorAll('.btn-sens');
    sensBtns.forEach(btn => {
      const bSens = parseFloat(btn.getAttribute('data-sens'));
      if (Math.abs(bSens - clamped) < 0.04) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  adjustSteeringSensitivity(delta) {
    const current = this.playerPhysics ? this.playerPhysics.steerSensitivity : 0.55;
    const nextVal = current + delta;
    this.setSteeringSensitivity(nextVal);
    if (this.hud) {
      const pct = Math.round((this.playerPhysics ? this.playerPhysics.steerSensitivity : nextVal) * 100);
      this.hud.showToast(`STEERING SENSITIVITY: ${pct}%`);
    }
  }

  setGraphicsQuality(q) {
    this.graphicsQuality = q;
    if (q === 'ultra') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
      this.renderer.shadowMap.enabled = true;
      if (this.postprocessing) this.postprocessing.isEnabled = true;
    } else if (q === 'high') {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = true;
      if (this.postprocessing) this.postprocessing.isEnabled = true;
    } else if (q === 'medium') {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = false;
      if (this.postprocessing) this.postprocessing.isEnabled = false;
    }
    // Shadow-map toggles need materials recompiled, and the composer must match the new pixel ratio
    this.scene.traverse(obj => {
      if (obj.material) {
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => { m.needsUpdate = true; });
      }
    });
    if (this.postprocessing) {
      this.postprocessing.setPixelRatio(this.renderer.getPixelRatio());
    }
  }

  animate() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(0.045, this.clock.getDelta());

    // 1. Process Input
    window.Input.update();

    if (window.Input.consumeCameraToggle()) {
      this.toggleCamera();
    }
    if (window.Input.consumeResetCar()) {
      this.respawnPlayerOnTrack();
    }
    if (window.Input.consumeToggleSettings()) {
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal) settingsModal.classList.toggle('active');
    }
    if (window.Input.consumeToggleTrackModal()) {
      const trackModal = document.getElementById('race-select-modal');
      if (trackModal) trackModal.classList.toggle('active');
    }

    // 2. State & Race Updates
    this.updateCountdown(dt);
    this.updateRaceProgress(dt);

    // Allow instant launch if player hits gas/brake or starts steering
    if (this.raceState.status === 'COUNTDOWN' && !this.isRaceSelectOpen() &&
        (window.Input.throttle > 0 || window.Input.brake > 0)) {
      this.raceState.status = 'RACING';
      const overlay = document.getElementById('countdown-overlay');
      if (overlay) overlay.style.display = 'none';
      if (window.Sound) window.Sound.playCountdownBeep(true);
    }

    const canDrive = (this.raceState.status === 'RACING' || this.raceState.status === 'FREEROAM');
    const effectiveInput = {
      steering: window.Input.steering,
      throttle: canDrive ? window.Input.throttle : 0,
      brake: canDrive ? window.Input.brake : 0,
      handbrake: window.Input.handbrake,
      nos: canDrive ? window.Input.nos : false
    };

    // 3. Step Vehicle Physics
    this.playerPhysics.step(dt, effectiveInput);

    // 4. Update 3D Visual Car Model
    this.playerCar.update(this.playerPhysics, dt);

    // 5. Update AI Racers
    if (canDrive) {
      this.aiManager.update(dt, this.playerPhysics);
    }

    // 6. Update Audio Engine
    if (window.Sound) {
      window.Sound.update({
        rpm: this.playerPhysics.rpm,
        throttle: effectiveInput.throttle,
        speedKmh: this.playerPhysics.speedKmh,
        slip: Math.abs(this.playerPhysics.driftAngle),
        isNosActive: this.playerPhysics.isNosActive,
        gear: this.playerPhysics.currentGear
      });
    }

    // 7. Update Environment & Dynamic Weather Particles
    if (this.environment) {
      this.environment.update(dt, this.camera.position, this.playerPhysics.position);
      // Emit tire smoke if drifting
      if (this.playerPhysics.isDrifting) {
        this.environment.emitTireSmoke(this.playerPhysics.position, true, this.environment.isRaining);
      }
    }

    // 8. Update Camera & Post-Processing
    this.updateCamera(dt);
    if (this.postprocessing) {
      this.postprocessing.update(this.playerPhysics.speedKmh, this.playerPhysics.isNosActive);
    }

    // 9. Update HUD & Telemetry
    if (this.hud) {
      this.hud.update(this.playerPhysics, this.raceState, this.aiManager);
    }

    // 10. Render Scene
    if (this.postprocessing) {
      this.postprocessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Bootstrap on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.Game = new GameEngine();
  window.Game.init();
});

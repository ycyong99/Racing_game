/**
 * Antigravity Apex - Input & Controls Manager
 * Seamless Keyboard, Gamepad (Xbox/PlayStation), Touch, and phone Tilt (accelerometer) controls.
 */

// Tilt tuning (degrees). Sensitivity divides the full-lock / full-pedal angles.
const TILT_STEER_DEADZONE = 2.0;
const TILT_STEER_FULL_LOCK = 28.0;
const TILT_PEDAL_DEADZONE = 4.0;
const TILT_THROTTLE_FULL = 20.0;
const TILT_BRAKE_FULL = 16.0;

class InputManager {
  constructor() {
    this.keys = {};
    this.throttle = 0;
    this.brake = 0;
    this.steering = 0;
    this.handbrake = false;
    this.nos = false;

    // Triggers (fired once per keypress)
    this.cameraToggle = false;
    this.resetCar = false;
    this.shiftUp = false;
    this.shiftDown = false;
    this.toggleSettings = false;
    this.toggleTrackModal = false;

    // Touch inputs
    this.touchSteerLeft = false;
    this.touchSteerRight = false;
    this.touchThrottle = false;
    this.touchBrake = false;
    this.touchHandbrake = false;
    this.touchNos = false;

    // Gamepad
    this.gamepadIndex = null;

    // Phone tilt controls
    // controlMode: 'buttons' (on-screen buttons only), 'tilt' (tilt to steer + on-screen pedals),
    //              'tilt-full' (tilt to steer, tip forward/back for gas/brake)
    this.controlMode = 'buttons';
    this.tiltSensitivity = 1.0;
    this.tiltInvert = false;
    this.tiltAvailable = false;
    this.tiltGravity = null;          // low-pass filtered gravity in screen axes (x right, y up, z out of screen)
    this.tiltZero = null;             // neutral { roll, pitch } captured by calibrateTilt()
    this.tiltCalibratePending = true;
    this.tiltSteer = 0;
    this.tiltThrottle = 0;
    this.tiltBrake = 0;
    this.manualThrottle = 0;          // throttle/brake from keys, pedals and gamepad only (no tilt)
    this.manualBrake = 0;

    this.initKeyboard();
    this.initGamepad();
    this.initTouch();
    this.loadTiltSettings();
    this.initTilt();
  }

  // ---------------------------------------------------------------------------
  // Phone tilt (accelerometer)
  // ---------------------------------------------------------------------------

  loadTiltSettings() {
    const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    let mode = isTouch ? 'tilt' : 'buttons';
    try {
      const savedMode = localStorage.getItem('apex_control_mode');
      if (['buttons', 'tilt', 'tilt-full'].includes(savedMode)) mode = savedMode;
      const savedSens = parseFloat(localStorage.getItem('apex_tilt_sens'));
      if (savedSens >= 0.5 && savedSens <= 2.0) this.tiltSensitivity = savedSens;
      this.tiltInvert = localStorage.getItem('apex_tilt_invert') === 'true';
    } catch (e) {}
    this.setControlMode(mode, false);
  }

  // persist: false when applying a default, so a device's own default isn't locked in
  setControlMode(mode, persist = true) {
    this.controlMode = mode;
    if (persist) {
      try { localStorage.setItem('apex_control_mode', mode); } catch (e) {}
    }
    const body = document.body;
    if (!body) return;
    body.classList.toggle('control-buttons', mode === 'buttons');
    body.classList.toggle('control-tilt', mode === 'tilt');
    body.classList.toggle('control-tilt-full', mode === 'tilt-full');
    if (mode !== 'buttons') this.tiltCalibratePending = true;
  }

  setTiltSensitivity(value) {
    this.tiltSensitivity = Math.max(0.5, Math.min(2.0, value));
    try { localStorage.setItem('apex_tilt_sens', this.tiltSensitivity.toString()); } catch (e) {}
  }

  setTiltInvert(invert) {
    this.tiltInvert = !!invert;
    try { localStorage.setItem('apex_tilt_invert', this.tiltInvert ? 'true' : 'false'); } catch (e) {}
  }

  isTiltActive() {
    return this.controlMode !== 'buttons' && this.tiltAvailable;
  }

  // Current screen rotation in degrees (0 portrait, 90 / 270 landscape)
  screenAngle() {
    if (screen.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle;
    if (typeof window.orientation === 'number') return window.orientation;
    return 0;
  }

  initTilt() {
    if (!('DeviceMotionEvent' in window)) return;
    window.addEventListener('devicemotion', (e) => {
      // accelerationIncludingGravity points "up" in device axes when the phone is still
      const g = e.accelerationIncludingGravity;
      if (!g || g.x === null || g.y === null || g.z === null) return;

      // Device axes (portrait) -> screen axes for the current rotation, so holding the phone
      // either way round in landscape steers the same way
      const a = this.screenAngle() * Math.PI / 180;
      const c = Math.cos(a), s = Math.sin(a);
      const sx = g.x * c - g.y * s;
      const sy = g.x * s + g.y * c;
      const sz = g.z;

      if (!this.tiltGravity) {
        this.tiltGravity = { x: sx, y: sy, z: sz };
      } else {
        // Low-pass filter: smooths hand shake and engine-free jitter while staying responsive
        const k = 0.25;
        this.tiltGravity.x += (sx - this.tiltGravity.x) * k;
        this.tiltGravity.y += (sy - this.tiltGravity.y) * k;
        this.tiltGravity.z += (sz - this.tiltGravity.z) * k;
      }

      if (!this.tiltAvailable) {
        this.tiltAvailable = true;
        if (document.body) document.body.classList.add('tilt-ready');
      }
      if (this.tiltCalibratePending) this.calibrateTilt();
    });

    // A rotation flip changes the axes; re-zero against the new hold
    const recalibrate = () => { this.tiltCalibratePending = true; };
    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener('change', recalibrate);
    } else {
      window.addEventListener('orientationchange', recalibrate);
    }
  }

  // roll: wheel-style rotation of the screen (+ = turned right)
  // pitch: how far the screen is tipped back from vertical (+ = top edge away from the player)
  tiltAngles() {
    const g = this.tiltGravity;
    const mag = Math.hypot(g.x, g.y, g.z) || 1;
    const deg = 180 / Math.PI;
    return {
      roll: Math.asin(Math.max(-1, Math.min(1, -g.x / mag))) * deg,
      pitch: Math.atan2(g.z, g.y) * deg
    };
  }

  // Treat the way the phone is held right now as "straight ahead, no pedal"
  calibrateTilt() {
    if (!this.tiltGravity) {
      this.tiltCalibratePending = true;
      return false;
    }
    this.tiltZero = this.tiltAngles();
    this.tiltCalibratePending = false;
    return true;
  }

  updateTilt() {
    this.tiltSteer = 0;
    this.tiltThrottle = 0;
    this.tiltBrake = 0;
    if (!this.isTiltActive() || !this.tiltZero) return;

    const { roll, pitch } = this.tiltAngles();
    const sens = this.tiltSensitivity;
    const shape = (delta, dead, full) => {
      const mag = Math.abs(delta);
      if (mag <= dead) return 0;
      return Math.sign(delta) * Math.min(1, (mag - dead) / Math.max(1, full / sens - dead));
    };

    // Wrap so a hold near +/-180 degrees can't flip sign
    let dPitch = pitch - this.tiltZero.pitch;
    if (dPitch > 180) dPitch -= 360;
    if (dPitch < -180) dPitch += 360;

    this.tiltSteer = shape(roll - this.tiltZero.roll, TILT_STEER_DEADZONE, TILT_STEER_FULL_LOCK) * (this.tiltInvert ? -1 : 1);
    if (this.controlMode === 'tilt-full') {
      this.tiltThrottle = Math.max(0, shape(dPitch, TILT_PEDAL_DEADZONE, TILT_THROTTLE_FULL));
      this.tiltBrake = Math.max(0, -shape(dPitch, TILT_PEDAL_DEADZONE, TILT_BRAKE_FULL));
    }
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // First key interaction resumes audio context
      if (window.Sound) window.Sound.resume();

      // Track held keys by physical code only. Also tracking e.key caused stuck keys:
      // press W, press Shift (nitro), release W -> keyup reports 'W' and 'w' stayed held.
      this.keys[this.keyId(e)] = true;

      // Prevent arrow keys and space from scrolling the browser window or shifting focus
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) ||
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Tab would otherwise move focus; Escape/Tab both toggle settings
      if (e.code === 'Escape' || e.code === 'Tab' || e.key === 'Escape') {
        e.preventDefault();
      }

      // Single-hit triggers fire once per press, not on OS key auto-repeat
      if (e.repeat) return;

      if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') this.cameraToggle = true;
      if (e.code === 'KeyT' || e.key === 't' || e.key === 'T') this.toggleTrackModal = true;
      if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') this.resetCar = true;
      if (e.code === 'KeyE') this.shiftUp = true;
      if (e.code === 'KeyQ') this.shiftDown = true;
      if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
        if (window.Sound) {
          const muted = window.Sound.toggleMute();
          if (window.Game && window.Game.updateAudioUI) window.Game.updateAudioUI(muted);
          if (window.HUD) window.HUD.showToast(muted ? "AUDIO MUTED" : "AUDIO ACTIVE");
        }
      }

      // Steering sensitivity quick-adjust hotkeys: [ and ]
      if (e.code === 'BracketLeft' || e.key === '[') {
        if (window.Game) window.Game.adjustSteeringSensitivity(-0.05);
      }
      if (e.code === 'BracketRight' || e.key === ']') {
        if (window.Game) window.Game.adjustSteeringSensitivity(+0.05);
      }
      if (e.code === 'Escape' || e.code === 'Tab' || e.key === 'Escape') {
        this.toggleSettings = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[this.keyId(e)] = false;
    });

    // Releasing keys while the window is unfocused never fires keyup; clear them so the car doesn't keep driving
    window.addEventListener('blur', () => {
      this.keys = {};
    });
  }

  keyId(e) {
    return e.code || e.key;
  }

  initGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log("Gamepad connected:", e.gamepad.id);
      this.gamepadIndex = e.gamepad.index;
      if (window.HUD) window.HUD.showToast("CONTROLLER CONNECTED");
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
        if (window.HUD) window.HUD.showToast("CONTROLLER DISCONNECTED");
      }
    });
  }

  initTouch() {
    const bindTouch = (id, prop) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (window.Sound) window.Sound.resume();
        this[prop] = true;
      }, { passive: false });
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        this[prop] = false;
      }, { passive: false });
      el.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        this[prop] = false;
      }, { passive: false });
    };

    // Defer until DOM ready
    setTimeout(() => {
      bindTouch('btn-steer-left', 'touchSteerLeft');
      bindTouch('btn-steer-right', 'touchSteerRight');
      bindTouch('btn-pedal-gas', 'touchThrottle');
      bindTouch('btn-pedal-brake', 'touchBrake');
      bindTouch('btn-touch-handbrake', 'touchHandbrake');
      bindTouch('btn-touch-nos', 'touchNos');
    }, 100);
  }

  pollGamepad() {
    if (this.gamepadIndex === null) return null;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[this.gamepadIndex];
    if (!gp) return null;

    // Standard mappings:
    // Axes: 0: Left Stick X (-1 to 1)
    // Buttons: 7: RT (Throttle 0 to 1), 6: LT (Brake 0 to 1), 0: A (Handbrake), 2: X (NOS), 3: Y (Cam)
    const deadzone = 0.12;
    let stickX = gp.axes[0] || 0;
    if (Math.abs(stickX) < deadzone) stickX = 0;

    let throttle = 0;
    if (gp.buttons[7]) {
      throttle = gp.buttons[7].value !== undefined ? gp.buttons[7].value : (gp.buttons[7].pressed ? 1 : 0);
    }
    // Also support A button or up D-pad
    if (gp.buttons[12] && gp.buttons[12].pressed) throttle = 1;

    let brake = 0;
    if (gp.buttons[6]) {
      brake = gp.buttons[6].value !== undefined ? gp.buttons[6].value : (gp.buttons[6].pressed ? 1 : 0);
    }
    if (gp.buttons[13] && gp.buttons[13].pressed) brake = 1;

    const handbrake = gp.buttons[0] ? gp.buttons[0].pressed : false;
    const nos = gp.buttons[2] ? gp.buttons[2].pressed : false;

    if (gp.buttons[3] && gp.buttons[3].pressed && !this._gpCamPressed) {
      this.cameraToggle = true;
      this._gpCamPressed = true;
    } else if (gp.buttons[3] && !gp.buttons[3].pressed) {
      this._gpCamPressed = false;
    }

    return {
      steering: stickX,
      throttle,
      brake,
      handbrake,
      nos
    };
  }

  update() {
    // 1. Keyboard readings (Arrow keys primary, WASD secondary)
    const kThrottle = (this.keys['ArrowUp'] || this.keys['KeyW']) ? 1 : 0;
    const kBrake = (this.keys['ArrowDown'] || this.keys['KeyS']) ? 1 : 0;
    let kSteering = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) kSteering -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) kSteering += 1;
    const kHandbrake = !!this.keys['Space'];
    const kNos = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['KeyN']);

    // 2. Touch readings
    let tSteering = 0;
    if (this.touchSteerLeft) tSteering -= 1;
    if (this.touchSteerRight) tSteering += 1;
    const tThrottle = this.touchThrottle ? 1 : 0;
    const tBrake = this.touchBrake ? 1 : 0;
    const tHandbrake = this.touchHandbrake;
    const tNos = this.touchNos;

    // 3. Gamepad readings
    const gp = this.pollGamepad();

    if (gp) {
      this.steering = Math.abs(gp.steering) > 0.05 ? gp.steering : (kSteering || tSteering);
      this.throttle = Math.max(gp.throttle, kThrottle, tThrottle);
      this.brake = Math.max(gp.brake, kBrake, tBrake);
      this.handbrake = gp.handbrake || kHandbrake || tHandbrake;
      this.nos = gp.nos || kNos || tNos;
    } else {
      this.steering = kSteering || tSteering;
      this.throttle = Math.max(kThrottle, tThrottle);
      this.brake = Math.max(kBrake, tBrake);
      this.handbrake = kHandbrake || tHandbrake;
      this.nos = kNos || tNos;
    }
    this.manualThrottle = this.throttle;
    this.manualBrake = this.brake;

    // 4. Phone tilt: steers whenever no button/key/stick is steering; in full-tilt mode also drives the pedals
    this.updateTilt();
    if (this.isTiltActive()) {
      if (this.steering === 0) this.steering = this.tiltSteer;
      this.throttle = Math.max(this.throttle, this.tiltThrottle);
      this.brake = Math.max(this.brake, this.tiltBrake);
    }
  }

  // Consume single-frame triggers
  consumeCameraToggle() {
    const val = this.cameraToggle;
    this.cameraToggle = false;
    return val;
  }

  consumeResetCar() {
    const val = this.resetCar;
    this.resetCar = false;
    return val;
  }

  consumeShiftUp() {
    const val = this.shiftUp;
    this.shiftUp = false;
    return val;
  }

  consumeShiftDown() {
    const val = this.shiftDown;
    this.shiftDown = false;
    return val;
  }

  consumeToggleSettings() {
    const val = this.toggleSettings;
    this.toggleSettings = false;
    return val;
  }

  consumeToggleTrackModal() {
    const val = this.toggleTrackModal;
    this.toggleTrackModal = false;
    return val;
  }
}

window.Input = new InputManager();

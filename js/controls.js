/**
 * Antigravity Apex - Input & Controls Manager
 * Seamless Keyboard, Gamepad (Xbox/PlayStation), and Touch controls.
 */

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

    this.initKeyboard();
    this.initGamepad();
    this.initTouch();
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

/**
 * Antigravity Apex - Web Audio API Sound Synthesizer
 * Fully self-contained dynamic procedural audio for vehicle engine, tires, wind, and FX.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;
    this.masterGain = null;

    // Engine sound nodes
    this.engineGain = null;
    this.osc1 = null;
    this.osc2 = null;
    this.subOsc = null;
    this.engineFilter = null;
    this.ceilingFilter = null;
    this.distortion = null;
    this.intakeNoise = null;
    this.intakeFilter = null;
    this.intakeGain = null;

    // Tire screech nodes
    this.tireNoise = null;
    this.tireFilter = null;
    this.tireGain = null;

    // Wind rush nodes
    this.windNoise = null;
    this.windFilter = null;
    this.windGain = null;

    // Nitrous nodes
    this.nosGain = null;
    this.nosNoise = null;
    this.nosFilter = null;

    // State tracking
    this.lastGear = 1;
    this.volume = 0.7;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      // Respect a mute toggled before the context existed
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0.0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSynth();
      this.setupTireSynth();
      this.setupWindSynth();
      this.setupNosSynth();

      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported or blocked:", e);
    }
  }

  resume() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Create procedural white noise buffer
  createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  setupEngineSynth() {
    // Engine Volume
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Warm soft-knee saturation waveshaper (eliminates harsh speech-like vowel formants)
    this.distortion = this.ctx.createWaveShaper();
    this.distortion.curve = this.makeDistortionCurve(3);
    this.distortion.oversample = '2x';

    // Butterworth flat lowpass filter (Q = 0.5 strictly prevents resonant voice formants)
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(250, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(0.5, this.ctx.currentTime);

    // High ceiling filter to prevent vocal frequency peaks (speech VAD suppression)
    this.ceilingFilter = this.ctx.createBiquadFilter();
    this.ceilingFilter.type = 'lowpass';
    this.ceilingFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);
    this.ceilingFilter.Q.setValueAtTime(0.5, this.ctx.currentTime);

    // Supercar engine oscillators:
    // osc1: Primary mechanical cylinder firing pulse (triangle wave for smooth mechanical purr)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'triangle';
    this.osc1.frequency.setValueAtTime(50, this.ctx.currentTime);

    // osc2: 2nd harmonic engine growl (sawtooth at 2.0x fundamental octave)
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'sawtooth';
    this.osc2.frequency.setValueAtTime(100, this.ctx.currentTime);

    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.osc2.connect(osc2Gain);

    // subOsc: Deep crankshaft sub-bass rumble (sine wave at 0.5x fundamental)
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'sine';
    this.subOsc.frequency.setValueAtTime(25, this.ctx.currentTime);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
    this.subOsc.connect(subGain);

    // Intake / exhaust airflow aspiration layer (diffuse broadband texture, masks vocal resonance)
    const intakeBuffer = this.createNoiseBuffer();
    this.intakeNoise = this.ctx.createBufferSource();
    this.intakeNoise.buffer = intakeBuffer;
    this.intakeNoise.loop = true;

    this.intakeFilter = this.ctx.createBiquadFilter();
    this.intakeFilter.type = 'bandpass';
    this.intakeFilter.frequency.setValueAtTime(420, this.ctx.currentTime);
    this.intakeFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    this.intakeGain = this.ctx.createGain();
    this.intakeGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.intakeNoise.connect(this.intakeFilter);
    this.intakeFilter.connect(this.intakeGain);

    // Connect oscillators into waveshaper
    this.osc1.connect(this.distortion);
    osc2Gain.connect(this.distortion);
    subGain.connect(this.distortion);

    this.distortion.connect(this.engineFilter);
    this.engineFilter.connect(this.ceilingFilter);
    this.ceilingFilter.connect(this.engineGain);

    this.intakeGain.connect(this.engineGain);

    this.engineGain.connect(this.masterGain);

    this.osc1.start();
    this.osc2.start();
    this.subOsc.start();
    this.intakeNoise.start();
  }

  setupTireSynth() {
    const noiseBuffer = this.createNoiseBuffer();
    this.tireNoise = this.ctx.createBufferSource();
    this.tireNoise.buffer = noiseBuffer;
    this.tireNoise.loop = true;

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = 'bandpass';
    this.tireFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    this.tireFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.tireNoise.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.masterGain);

    this.tireNoise.start();
  }

  setupWindSynth() {
    const noiseBuffer = this.createNoiseBuffer();
    this.windNoise = this.ctx.createBufferSource();
    this.windNoise.buffer = noiseBuffer;
    this.windNoise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(300, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.windNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    this.windNoise.start();
  }

  setupNosSynth() {
    const noiseBuffer = this.createNoiseBuffer();
    this.nosNoise = this.ctx.createBufferSource();
    this.nosNoise.buffer = noiseBuffer;
    this.nosNoise.loop = true;

    this.nosFilter = this.ctx.createBiquadFilter();
    this.nosFilter.type = 'highpass';
    this.nosFilter.frequency.setValueAtTime(1800, this.ctx.currentTime);

    this.nosGain = this.ctx.createGain();
    this.nosGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.nosNoise.connect(this.nosFilter);
    this.nosFilter.connect(this.nosGain);
    this.nosGain.connect(this.masterGain);

    this.nosNoise.start();
  }

  makeDistortionCurve(amount) {
    const k = amount || 3;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      // Gentle hyperbolic tangent soft saturation (no harsh vowel formants)
      curve[i] = Math.tanh(x * (1.0 + k * 0.35));
    }
    return curve;
  }

  /**
   * Update continuous sounds each frame
   * @param {Object} state - vehicle state: rpm, throttle, speed, slip, isNosActive, gear
   */
  update(state) {
    if (!this.isInitialized || this.isMuted || !this.ctx) return;

    const t = this.ctx.currentTime;
    const rpm = Math.max(800, Math.min(8800, state.rpm || 1000));
    const throttle = state.throttle || 0;
    const speedKmh = Math.abs(state.speedKmh || 0);
    const slip = Math.max(0, Math.min(1, state.slip || 0));
    const isNos = !!state.isNosActive;

    // Detect gear shift pop
    if (state.gear && state.gear !== this.lastGear) {
      if (state.gear > this.lastGear) {
        this.playGearShiftPop();
      }
      this.lastGear = state.gear;
    }

    // 1. Engine Pitch & Throttle Dynamics (V8/V10 harmonic distribution)
    // 800 RPM -> ~40Hz fundamental, 8500 RPM -> ~280Hz
    const baseFreq = 38 + (rpm / 8500) * 240;
    this.osc1.frequency.setTargetAtTime(baseFreq, t, 0.04);
    this.osc2.frequency.setTargetAtTime(baseFreq * 2.0, t, 0.04); // Octave overtone
    this.subOsc.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.04); // Crankshaft sub-bass

    // Filter frequency opens progressively with throttle without speech formant spikes
    const filterFreq = 220 + (throttle * 1200) + (rpm / 8500) * 600;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.05);

    // Intake aspiration roar (masks any voice-like spectral pattern)
    if (this.intakeGain && this.intakeFilter) {
      const intakeVol = (throttle * 0.14) + (rpm / 8500) * 0.08;
      this.intakeGain.gain.setTargetAtTime(intakeVol, t, 0.05);
      this.intakeFilter.frequency.setTargetAtTime(320 + throttle * 500, t, 0.05);
    }

    // Engine volume: base rumble + throttle roar
    const targetEngineVol = 0.20 + (throttle * 0.24) + (rpm / 8500) * 0.16;
    this.engineGain.gain.setTargetAtTime(targetEngineVol, t, 0.05);

    // 2. Tire Screech (broadband road friction)
    if (slip > 0.25 && speedKmh > 15) {
      const screechIntensity = Math.min(1.0, (slip - 0.25) * 1.6);
      this.tireGain.gain.setTargetAtTime(screechIntensity * 0.26, t, 0.03);
      this.tireFilter.frequency.setTargetAtTime(950 + screechIntensity * 700, t, 0.03);
    } else {
      this.tireGain.gain.setTargetAtTime(0.0, t, 0.05);
    }

    // 3. Wind Rush
    const windIntensity = Math.min(1.0, Math.pow(speedKmh / 320, 1.8));
    this.windGain.gain.setTargetAtTime(windIntensity * 0.40, t, 0.1);
    this.windFilter.frequency.setTargetAtTime(200 + windIntensity * 1400, t, 0.1);

    // 4. Nitrous Hiss
    if (isNos) {
      this.nosGain.gain.setTargetAtTime(0.28, t, 0.05);
    } else {
      this.nosGain.gain.setTargetAtTime(0.0, t, 0.08);
    }
  }

  // Gear change backfire pop
  playGearShiftPop() {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    const popOsc = this.ctx.createOscillator();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(120, t);
    popOsc.frequency.exponentialRampToValueAtTime(30, t + 0.08);

    const popGain = this.ctx.createGain();
    popGain.gain.setValueAtTime(0.4, t);
    popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    popOsc.connect(popGain);
    popGain.connect(this.masterGain);

    popOsc.start(t);
    popOsc.stop(t + 0.1);
  }

  // Wall / car collision sound
  playCollisionSound(intensity = 0.5) {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const clampIntensity = Math.max(0.1, Math.min(1.0, intensity));

    // Low punch
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(clampIntensity * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.26);

    // Metallic crunch noise
    // Reuse one buffer: scraping a wall triggers this every frame, and a fresh 2 s buffer each time stalls the game
    if (!this.collisionNoiseBuffer) this.collisionNoiseBuffer = this.createNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.collisionNoiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(800, t);
    noiseFilter.Q.setValueAtTime(3, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(clampIntensity * 0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSource.start(t);
    noiseSource.stop(t + 0.16);
  }

  // Countdown beep (3, 2, 1, GO)
  playCountdownBeep(isGo = false) {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.6 : 0.2));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + (isGo ? 0.65 : 0.25));
  }

  // Lap / victory fanfare chime
  playLapChime(isBest = false) {
    if (!this.isInitialized || this.isMuted) return;
    const t = this.ctx.currentTime;
    const notes = isBest ? [523.25, 659.25, 783.99, 1046.50] : [523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const startTime = t + idx * 0.08;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.55);
    });
  }

  setMasterVolume(vol) {
    this.volume = Math.max(0, Math.min(1.0, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0 : this.volume, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }
}

// Global Sound instance
window.Sound = new SoundEngine();

/**
 * Antigravity Apex - Cinematic Post-Processing Pipeline
 * ACES Filmic Tone Mapping, Unreal Bloom, Dynamic Speed Radial Blur, and Fallback Renderer.
 */

class PostProcessingManager {
  constructor(options = {}) {
    this.renderer = options.renderer;
    this.scene = options.scene;
    this.camera = options.camera;

    this.composer = null;
    this.bloomPass = null;
    this.speedBlurPass = null;
    this.isEnabled = true;
    this.isSupported = false;

    this.init();
  }

  init() {
    // Check if Three.js postprocessing classes are loaded
    if (typeof THREE.EffectComposer === 'undefined' || typeof THREE.RenderPass === 'undefined') {
      console.warn("Postprocessing libraries not loaded; using direct WebGL renderer.");
      this.isSupported = false;
      return;
    }

    try {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // 1. Create Effect Composer
      this.composer = new THREE.EffectComposer(this.renderer);

      // 2. Base Render Pass
      const renderPass = new THREE.RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      // 3. Unreal Bloom Pass (HDR emissive glow)
      if (typeof THREE.UnrealBloomPass !== 'undefined') {
        this.bloomPass = new THREE.UnrealBloomPass(
          new THREE.Vector2(width, height),
          0.35, // strength (crisp, non-blinding)
          0.30, // radius
          1.25  // threshold (only emissive elements > 1.25 glow; road & scenery never bloom)
        );
        this.composer.addPass(this.bloomPass);
      }

      // 4. Custom Radial Speed Blur Shader Pass
      this.initSpeedBlurPass();

      this.isSupported = true;
    } catch (e) {
      console.warn("Error initializing postprocessing:", e);
      this.isSupported = false;
    }
  }

  initSpeedBlurPass() {
    if (typeof THREE.ShaderPass === 'undefined') return;

    const SpeedBlurShader = {
      uniforms: {
        tDiffuse: { value: null },
        strength: { value: 0.0 },
        center: { value: new THREE.Vector2(0.5, 0.5) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float strength;
        uniform vec2 center;
        varying vec2 vUv;

        void main() {
          if (strength < 0.001) {
            gl_FragColor = texture2D(tDiffuse, vUv);
            return;
          }

          vec2 dir = center - vUv;
          vec4 color = vec4(0.0);
          float total = 0.0;
          float samples = 10.0;

          for (float i = 0.0; i < 10.0; i++) {
            float scale = 1.0 - strength * (i / samples);
            color += texture2D(tDiffuse, center - dir * scale);
            total += 1.0;
          }

          gl_FragColor = color / total;
        }
      `
    };

    this.speedBlurPass = new THREE.ShaderPass(SpeedBlurShader);
    this.speedBlurPass.renderToScreen = true;
    this.composer.addPass(this.speedBlurPass);
  }

  setSize(width, height) {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.setSize(width, height);
    }
  }

  setPixelRatio(ratio) {
    if (this.composer) {
      this.composer.setPixelRatio(ratio);
    }
  }

  update(speedKmh, isNosActive) {
    if (!this.speedBlurPass) return;

    // Blur increases dynamically above 220 km/h, and surges with NOS
    let blur = 0.0;
    if (speedKmh > 200) {
      blur = Math.min(0.06, (speedKmh - 200) * 0.00035);
    }
    if (isNosActive) {
      blur += 0.045;
    }

    this.speedBlurPass.uniforms.strength.value = blur;
  }

  render() {
    if (this.isSupported && this.isEnabled && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  setBloomEnabled(enabled) {
    if (this.bloomPass) {
      this.bloomPass.enabled = enabled;
    }
  }

  setTimeOfDay(time) {
    if (!this.bloomPass) return;
    if (time === 'noon' || time === 'daylight') {
      this.bloomPass.threshold = 1.25;
      this.bloomPass.strength = 0.32;
      this.bloomPass.radius = 0.28;
    } else if (time === 'dusk' || time === 'sunset') {
      this.bloomPass.threshold = 1.15;
      this.bloomPass.strength = 0.45;
      this.bloomPass.radius = 0.35;
    } else if (time === 'night' || time === 'rain' || time === 'cyber') {
      this.bloomPass.threshold = 0.95;
      this.bloomPass.strength = 0.65;
      this.bloomPass.radius = 0.38;
    }
  }

  togglePostProcessing() {
    this.isEnabled = !this.isEnabled;
    return this.isEnabled;
  }
}

window.PostProcessingManager = PostProcessingManager;

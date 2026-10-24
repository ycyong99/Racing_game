/**
 * Antigravity Apex - Dynamic Environment & Weather System
 * Skybox gradients, atmospheric lighting, rain simulation, wet road puddles, and particle FX.
 */

class EnvironmentSystem {
  constructor(options = {}) {
    this.scene = options.scene;
    this.renderer = options.renderer;
    this.track = options.track;

    this.currentPreset = 'sunset'; // 'sunset' | 'rain' | 'daylight' | 'cyber'

    // Scene lights
    this.sunLight = null;
    this.ambientLight = null;
    this.hemisphereLight = null;

    // Sky Dome
    this.skyMesh = null;

    // Dynamic Weather Particle Systems
    this.rainParticles = null;
    this.rainCount = 2800;
    this.isRaining = false;

    // Tire Smoke & Sparks Particles
    this.smokeParticles = [];
    this.sparkParticles = [];
    this.skidmarks = [];

    this.initSky();
    this.initLighting();
    this.initWeatherParticles();
    this.applyPreset('sunset');
  }

  initSky() {
    // Large hemisphere sky dome with procedural vertex color gradient
    const skyGeo = new THREE.SphereGeometry(900, 32, 24);

    // Custom shader material for smooth atmospheric horizon gradient
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x2176d2) },
        bottomColor: { value: new THREE.Color(0xa6d8ff) },
        offset: { value: 15.0 },
        exponent: { value: 0.55 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMaterial);
    this.scene.add(this.skyMesh);
  }

  initLighting() {
    // Sun Direction Offset relative to moving camera
    this.sunDirectionOffset = new THREE.Vector3(120, 220, 90);

    // 1. Directional Sun Light with Shadows
    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
    this.sunLight.position.set(120, 220, 90);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 650;
    const d = 140;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0001;
    this.sunLight.shadow.normalBias = 0.04;

    this.scene.add(this.sunLight.target);
    this.scene.add(this.sunLight);

    // 2. Ambient & Hemisphere Light
    this.ambientLight = new THREE.AmbientLight(0xc4dcfa, 0.95);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0xe8f4ff, 0x556e55, 0.85);
    this.scene.add(this.hemisphereLight);

    // 3. Atmospheric Depth Fog
    this.scene.fog = new THREE.FogExp2(0x94ccf6, 0.00045);
  }

  initWeatherParticles() {
    // Instanced Rain Particle System (attached around camera)
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);
    const velocities = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;

      velocities[i * 3] = -0.4;
      velocities[i * 3 + 1] = -1.6 - Math.random() * 0.8;
      velocities[i * 3 + 2] = 0;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainVelocities = velocities;

    const rainMat = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 0.18,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  applyPreset(presetName) {
    this.currentPreset = presetName;
    const lensOverlay = document.getElementById('rain-lens-overlay');

    if (presetName === 'noon' || presetName === 'daylight') {
      // 1. NOON (Midday Clear Sun & Maximum Visibility)
      this.scene.background = new THREE.Color(0x64b5f6);
      this.skyMaterial.uniforms.topColor.value.setHex(0x1e88e5); // Radiant azure blue sky
      this.skyMaterial.uniforms.bottomColor.value.setHex(0xb5e0ff); // Luminous white-blue horizon
      this.skyMaterial.uniforms.offset.value = 15.0;
      this.skyMaterial.uniforms.exponent.value = 0.55;

      this.sunDirectionOffset.set(120, 220, 90);
      this.sunLight.color.setHex(0xffffff);
      this.sunLight.intensity = 2.4;

      this.ambientLight.color.setHex(0xc4dcfa);
      this.ambientLight.intensity = 0.95;
      if (this.hemisphereLight) {
        this.hemisphereLight.color.setHex(0xe8f4ff);
        this.hemisphereLight.groundColor.setHex(0x556e55);
        this.hemisphereLight.intensity = 0.85;
      }
      this.scene.fog.color.setHex(0x94ccf6);
      this.scene.fog.density = 0.00045;

      this.isRaining = false;
      this.rainParticles.visible = false;
      if (lensOverlay) lensOverlay.classList.remove('active');
      this.setRoadWetness(false);

      if (this.renderer) this.renderer.toneMappingExposure = 0.98;
      if (this.track && this.track.setStreetlightsActive) {
        this.track.setStreetlightsActive(false);
      }

    } else if (presetName === 'dusk' || presetName === 'sunset') {
      // 2. DUSK (Golden Hour Sunset & Cinematic Amber Haze)
      this.scene.background = new THREE.Color(0xb85220);
      this.skyMaterial.uniforms.topColor.value.setHex(0x180f33);
      this.skyMaterial.uniforms.bottomColor.value.setHex(0xff5511);
      this.skyMaterial.uniforms.offset.value = 25.0;
      this.skyMaterial.uniforms.exponent.value = 0.65;

      this.sunDirectionOffset.set(300, 55, 180);
      this.sunLight.color.setHex(0xff8833);
      this.sunLight.intensity = 2.2;

      this.ambientLight.color.setHex(0x663344);
      this.ambientLight.intensity = 0.85;
      if (this.hemisphereLight) {
        this.hemisphereLight.color.setHex(0xff8855);
        this.hemisphereLight.groundColor.setHex(0x281525);
        this.hemisphereLight.intensity = 0.75;
      }
      this.scene.fog.color.setHex(0xd06020);
      this.scene.fog.density = 0.0016;

      this.isRaining = false;
      this.rainParticles.visible = false;
      if (lensOverlay) lensOverlay.classList.remove('active');
      this.setRoadWetness(false);

      if (this.renderer) this.renderer.toneMappingExposure = 1.0;
      if (this.track && this.track.setStreetlightsActive) {
        this.track.setStreetlightsActive(true, 1.2);
      }

    } else if (presetName === 'night') {
      // 3. NIGHT (Midnight Moonlit Sky, Glowing Projector Headlights & Streetlamps)
      this.scene.background = new THREE.Color(0x03060e);
      this.skyMaterial.uniforms.topColor.value.setHex(0x010307);
      this.skyMaterial.uniforms.bottomColor.value.setHex(0x070e1c);
      this.skyMaterial.uniforms.offset.value = 35.0;
      this.skyMaterial.uniforms.exponent.value = 0.8;

      this.sunDirectionOffset.set(100, 200, 80);
      this.sunLight.color.setHex(0x5577aa);
      this.sunLight.intensity = 0.45;

      this.ambientLight.color.setHex(0x0f1522);
      this.ambientLight.intensity = 0.35;
      if (this.hemisphereLight) {
        this.hemisphereLight.color.setHex(0x182844);
        this.hemisphereLight.groundColor.setHex(0x080c14);
        this.hemisphereLight.intensity = 0.35;
      }
      this.scene.fog.color.setHex(0x040812);
      this.scene.fog.density = 0.0022;

      this.isRaining = false;
      this.rainParticles.visible = false;
      if (lensOverlay) lensOverlay.classList.remove('active');
      this.setRoadWetness(false);

      if (this.renderer) this.renderer.toneMappingExposure = 1.1;
      if (this.track && this.track.setStreetlightsActive) {
        this.track.setStreetlightsActive(true, 2.8);
      }

    } else if (presetName === 'rain') {
      // Bonus: Wet Rainy Night
      this.scene.background = new THREE.Color(0x04060d);
      this.skyMaterial.uniforms.topColor.value.setHex(0x04060d);
      this.skyMaterial.uniforms.bottomColor.value.setHex(0x0e1828);
      this.skyMaterial.uniforms.offset.value = 35.0;
      this.skyMaterial.uniforms.exponent.value = 0.8;
      this.sunDirectionOffset.set(100, 160, 100);
      this.sunLight.color.setHex(0x334466);
      this.sunLight.intensity = 0.6;
      this.ambientLight.color.setHex(0x142033);
      this.ambientLight.intensity = 0.6;
      if (this.hemisphereLight) {
        this.hemisphereLight.color.setHex(0x1c2c44);
        this.hemisphereLight.groundColor.setHex(0x080c14);
        this.hemisphereLight.intensity = 0.35;
      }
      if (this.renderer) this.renderer.toneMappingExposure = 1.1;
      this.scene.fog.color.setHex(0x090f1a);
      this.scene.fog.density = 0.0035;

      this.isRaining = true;
      this.rainParticles.visible = true;
      if (lensOverlay) lensOverlay.classList.add('active');
      this.setRoadWetness(true);

      if (this.track && this.track.setStreetlightsActive) {
        this.track.setStreetlightsActive(true, 2.8);
      }

    } else if (presetName === 'cyber') {
      // Bonus: Cyber Twilight
      this.scene.background = new THREE.Color(0x120320);
      this.skyMaterial.uniforms.topColor.value.setHex(0x28053f);
      this.skyMaterial.uniforms.bottomColor.value.setHex(0x05f0ff);
      this.skyMaterial.uniforms.offset.value = 25.0;
      this.skyMaterial.uniforms.exponent.value = 0.65;
      this.sunDirectionOffset.set(150, 140, 100);
      this.sunLight.color.setHex(0xff0088);
      this.sunLight.intensity = 2.2;
      this.ambientLight.color.setHex(0x330066);
      this.ambientLight.intensity = 0.9;
      if (this.hemisphereLight) {
        this.hemisphereLight.color.setHex(0xaa44ff);
        this.hemisphereLight.groundColor.setHex(0x1a0630);
        this.hemisphereLight.intensity = 0.6;
      }
      if (this.renderer) this.renderer.toneMappingExposure = 1.0;
      this.scene.fog.color.setHex(0x20053a);
      this.scene.fog.density = 0.002;

      this.isRaining = false;
      this.rainParticles.visible = false;
      if (lensOverlay) lensOverlay.classList.remove('active');
      this.setRoadWetness(false);

      if (this.track && this.track.setStreetlightsActive) {
        this.track.setStreetlightsActive(true, 2.0);
      }
    }
  }

  setRoadWetness(isWet) {
    if (!this.track || !this.track.materials.road) return;
    const roadMat = this.track.materials.road;
    if (isWet) {
      // Natural wet tarmac with puddles (dielectric with water film)
      roadMat.roughness = 0.28;
      roadMat.metalness = 0.04;
    } else {
      // Photorealistic dry matte asphalt (strictly zero metalness)
      roadMat.roughness = 0.92;
      roadMat.metalness = 0.0;
    }
    roadMat.needsUpdate = true;
  }

  emitSparks(pos, velocity) {
    const sparkCount = 8;
    const sparkGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(sparkCount * 3);
    const velList = [];

    for (let i = 0; i < sparkCount; i++) {
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = pos.y + 0.2 + Math.random() * 0.3;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.4;

      velList.push(new THREE.Vector3(
        (Math.random() - 0.5) * 6 - velocity.x * 0.2,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 6 - velocity.z * 0.2
      ));
    }

    sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffcc33,
      size: 0.15,
      blending: THREE.AdditiveBlending
    });

    const sparkMesh = new THREE.Points(sparkGeo, sparkMat);
    this.scene.add(sparkMesh);

    this.sparkParticles.push({
      mesh: sparkMesh,
      velocities: velList,
      life: 0.4
    });
  }

  emitTireSmoke(pos, isDrifting, isWet) {
    if (!isDrifting) return;

    const smokeGeo = new THREE.SphereGeometry(isWet ? 0.2 : 0.35, 6, 6);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: isWet ? 0xaaccff : 0xd8d8d8,
      transparent: true,
      opacity: isWet ? 0.3 : 0.45,
      depthWrite: false
    });

    const smoke = new THREE.Mesh(smokeGeo, smokeMat);
    smoke.position.copy(pos);
    smoke.position.y += 0.2;
    this.scene.add(smoke);

    this.smokeParticles.push({
      mesh: smoke,
      life: 0.65,
      maxLife: 0.65,
      growSpeed: isWet ? 2.5 : 3.8
    });
  }

  update(dt, cameraPos, playerCarPos) {
    // 1. Follow camera with Sun & Sky so lighting is always centered and consistent
    if (cameraPos) {
      if (this.skyMesh) {
        this.skyMesh.position.copy(cameraPos);
      }
      if (this.sunLight) {
        this.sunLight.target.position.copy(cameraPos);
        if (this.sunDirectionOffset) {
          this.sunLight.position.copy(cameraPos).add(this.sunDirectionOffset);
        }
      }
    }

    // 2. Animate Rain Particles around camera
    if (this.isRaining && this.rainParticles && cameraPos) {
      this.rainParticles.position.copy(cameraPos);
      const posAttr = this.rainParticles.geometry.attributes.position;
      const pos = posAttr.array;
      const vels = this.rainVelocities;

      for (let i = 0; i < this.rainCount; i++) {
        pos[i * 3 + 1] += vels[i * 3 + 1] * dt * 60; // velocities are per 60 Hz frame
        if (pos[i * 3 + 1] < -5) {
          pos[i * 3 + 1] = 35 + Math.random() * 5;
          pos[i * 3] = (Math.random() - 0.5) * 80;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 3. Update Tire Smoke Particles
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const sp = this.smokeParticles[i];
      sp.life -= dt;
      sp.mesh.position.y += dt * 1.2;
      const scale = 1.0 + (1.0 - sp.life / sp.maxLife) * sp.growSpeed;
      sp.mesh.scale.set(scale, scale, scale);
      sp.mesh.material.opacity = (sp.life / sp.maxLife) * 0.45;

      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        sp.mesh.material.dispose();
        this.smokeParticles.splice(i, 1);
      }
    }

    // 4. Update Sparks Particles
    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const sk = this.sparkParticles[i];
      sk.life -= dt;
      const posAttr = sk.mesh.geometry.attributes.position;
      const arr = posAttr.array;

      for (let j = 0; j < sk.velocities.length; j++) {
        const vel = sk.velocities[j];
        vel.y -= 9.8 * dt; // gravity
        arr[j * 3] += vel.x * dt;
        arr[j * 3 + 1] += vel.y * dt;
        arr[j * 3 + 2] += vel.z * dt;
      }
      posAttr.needsUpdate = true;

      if (sk.life <= 0) {
        this.scene.remove(sk.mesh);
        sk.mesh.geometry.dispose();
        sk.mesh.material.dispose();
        this.sparkParticles.splice(i, 1);
      }
    }
  }
}

window.EnvironmentSystem = EnvironmentSystem;

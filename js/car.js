/**
 * Antigravity Apex - High Fidelity 3D Hypercar Generator & Materials
 * Procedural supercar with PBR clearcoat paint, active aero, glowing brake discs, and volumetric headlights.
 */

class CarModel {
  constructor(options = {}) {
    this.scene = options.scene;
    this.isPlayer = options.isPlayer !== false;
    this.primaryColor = options.primaryColor || 0xd40b1e; // Default Rosso Corsa
    this.accentColor = options.accentColor || 0x111111; // Carbon black

    this.group = new THREE.Group();
    this.chassisGroup = new THREE.Group();
    this.wheels = []; // [FL, FR, RL, RR]
    this.brakeDiscs = [];
    this.headlights = [];
    this.volumetricCones = [];
    this.taillightMeshes = [];
    this.exhaustFlames = [];

    // Animated components
    this.steeringWheel = null;
    this.activeRearWing = null;
    this.leftHeadlightSpot = null;
    this.rightHeadlightSpot = null;

    // Materials dictionary for dynamic styling
    this.materials = {};

    this.buildMaterials();
    this.buildCar();

    if (this.scene) {
      this.scene.add(this.group);
    }
  }

  dispose() {
    if (this.group && this.scene) {
      this.scene.remove(this.group);
      this.group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    }
  }

  buildMaterials() {
    // 1. Procedural Carbon Fiber Texture
    const carbonCanvas = document.createElement('canvas');
    carbonCanvas.width = 64;
    carbonCanvas.height = 64;
    const ctx = carbonCanvas.getContext('2d');
    ctx.fillStyle = '#181818';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#282828';
    for (let x = 0; x < 64; x += 8) {
      for (let y = 0; y < 64; y += 8) {
        if ((x + y) % 16 === 0) {
          ctx.fillRect(x, y, 8, 8);
        }
      }
    }
    const carbonTex = new THREE.CanvasTexture(carbonCanvas);
    carbonTex.wrapS = THREE.RepeatWrapping;
    carbonTex.wrapT = THREE.RepeatWrapping;
    carbonTex.repeat.set(12, 12);

    // 2. Procedural Tire Tread Texture
    const tireCanvas = document.createElement('canvas');
    tireCanvas.width = 128;
    tireCanvas.height = 128;
    const tctx = tireCanvas.getContext('2d');
    tctx.fillStyle = '#1c1c1e';
    tctx.fillRect(0, 0, 128, 128);
    tctx.strokeStyle = '#0e0e10';
    tctx.lineWidth = 6;
    for (let y = 10; y < 128; y += 24) {
      tctx.beginPath();
      tctx.moveTo(0, y);
      tctx.lineTo(128, y);
      tctx.stroke();
    }
    const tireTex = new THREE.CanvasTexture(tireCanvas);
    tireTex.wrapS = THREE.RepeatWrapping;
    tireTex.wrapT = THREE.RepeatWrapping;
    tireTex.repeat.set(1, 4);

    // PBR Clearcoat Automotive Body Paint
    this.materials.bodyPaint = new THREE.MeshPhysicalMaterial({
      color: this.primaryColor,
      metalness: 0.85,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.95
    });

    // Carbon Fiber Aero Material
    this.materials.carbonFiber = new THREE.MeshStandardMaterial({
      map: carbonTex,
      color: 0x222222,
      metalness: 0.4,
      roughness: 0.35
    });

    // Automotive Glass (Tinted Windshield & Canopy)
    this.materials.glass = new THREE.MeshPhysicalMaterial({
      color: 0x081018,
      metalness: 0.2,
      roughness: 0.05,
      transmission: 0.75,
      transparent: true,
      opacity: 0.45,
      reflectivity: 0.95
    });

    // Dark Interior Cockpit
    this.materials.interior = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.85,
      metalness: 0.1
    });

    // Alloy Wheel Rims
    this.materials.alloyRims = new THREE.MeshStandardMaterial({
      color: 0xd8d8dd,
      metalness: 0.92,
      roughness: 0.22
    });

    // Rubber Tires
    this.materials.tireRubber = new THREE.MeshStandardMaterial({
      map: tireTex,
      color: 0x18181a,
      roughness: 0.85,
      metalness: 0.08
    });

    // Ventilated Brake Discs (with dynamic emissive glow)
    this.materials.brakeDisc = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.9,
      roughness: 0.3,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0
    });

    // Brake Calipers (Brembo Racing Yellow/Red)
    this.materials.brakeCaliper = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      metalness: 0.6,
      roughness: 0.3
    });

    // Projector LED Headlights
    this.materials.headlightLens = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xe0f4ff),
      emissiveIntensity: 3.0,
      roughness: 0.1
    });

    // LED Taillights (Neon Red)
    this.materials.taillightLens = new THREE.MeshStandardMaterial({
      color: 0x200002,
      emissive: new THREE.Color(0xff0a24),
      emissiveIntensity: 3.5,
      roughness: 0.1
    });

    // Exhaust Pipe Metal
    this.materials.exhaustMetal = new THREE.MeshStandardMaterial({
      color: 0x444450,
      metalness: 0.95,
      roughness: 0.15
    });

    // Exhaust Jet Flame Material
    this.materials.exhaustFlame = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
  }

  setPaintColor(hexColor) {
    this.primaryColor = hexColor;
    if (this.materials.bodyPaint) {
      this.materials.bodyPaint.color.setHex(hexColor);
    }
  }

  buildCar() {
    this.group.add(this.chassisGroup);

    // 1. Lower Chassis & Aerodynamic Floorpan
    const floorGeo = new THREE.BoxGeometry(1.82, 0.12, 4.3);
    const floorMesh = new THREE.Mesh(floorGeo, this.materials.carbonFiber);
    floorMesh.position.set(0, 0.14, 0);
    floorMesh.castShadow = true;
    floorMesh.receiveShadow = true;
    this.chassisGroup.add(floorMesh);

    // 2. Sculpted Main Monocoque Body
    this.buildBodywork();

    // 3. Cabin & Glass Canopy
    this.buildCabin();

    // 4. Cockpit Interior & Steering Wheel
    this.buildInterior();

    // 5. Aerodynamic Elements: Front Splitter, Rear Diffuser, Active Wing
    this.buildAero();

    // 6. Projector Headlights & Taillights
    this.buildLighting();

    // 7. Quad Exhaust & Flame FX
    this.buildExhaust();

    // 8. 4 Independent High-Fidelity Wheels & Brakes
    this.buildWheels();
  }

  buildBodywork() {
    // Central Main Torso
    const torsoGeo = new THREE.BoxGeometry(1.78, 0.52, 2.6);
    const torsoMesh = new THREE.Mesh(torsoGeo, this.materials.bodyPaint);
    torsoMesh.position.set(0, 0.42, -0.1);
    torsoMesh.castShadow = true;
    this.chassisGroup.add(torsoMesh);

    // Sloping Front Hood (Nose cone)
    // Square the 4-sided pyramid about its own axis first, then tip it forward.
    // (Rotating Y after X swung the nose 45 deg sideways, leaving a fin sticking out the right.)
    const hoodGeo = new THREE.ConeGeometry(0.9, 1.4, 4);
    hoodGeo.rotateY(Math.PI * 0.25);
    hoodGeo.rotateX(Math.PI * 0.5);
    hoodGeo.scale(1.4, 0.36, 1.0); // half-width 0.89, flush with the torso sides
    const hoodMesh = new THREE.Mesh(hoodGeo, this.materials.bodyPaint);
    hoodMesh.position.set(0, 0.38, 1.6);
    hoodMesh.castShadow = true;
    this.chassisGroup.add(hoodMesh);

    // Sculpted Hood Heat Extraction Vents
    const ventGeo = new THREE.BoxGeometry(0.45, 0.04, 0.6);
    const ventLeft = new THREE.Mesh(ventGeo, this.materials.carbonFiber);
    ventLeft.position.set(-0.42, 0.53, 1.35);
    ventLeft.rotation.x = -0.15;
    const ventRight = ventLeft.clone();
    ventRight.position.x = 0.42;
    this.chassisGroup.add(ventLeft, ventRight);

    // Flared Front Fenders (Left and Right)
    const fenderGeo = new THREE.BoxGeometry(0.24, 0.46, 1.1);
    const fFenderL = new THREE.Mesh(fenderGeo, this.materials.bodyPaint);
    fFenderL.position.set(-0.84, 0.44, 1.3);
    fFenderL.castShadow = true;
    const fFenderR = fFenderL.clone();
    fFenderR.position.x = 0.84;
    this.chassisGroup.add(fFenderL, fFenderR);

    // Flared Muscular Rear Fenders (Haunches)
    const rFenderGeo = new THREE.BoxGeometry(0.28, 0.56, 1.3);
    const rFenderL = new THREE.Mesh(rFenderGeo, this.materials.bodyPaint);
    rFenderL.position.set(-0.88, 0.5, -1.35);
    rFenderL.castShadow = true;
    const rFenderR = rFenderL.clone();
    rFenderR.position.x = 0.88;
    this.chassisGroup.add(rFenderL, rFenderR);

    // Aerodynamic Side Skirts with Air Intakes
    const skirtGeo = new THREE.BoxGeometry(0.18, 0.22, 1.7);
    const skirtL = new THREE.Mesh(skirtGeo, this.materials.carbonFiber);
    skirtL.position.set(-0.89, 0.2, -0.05);
    const skirtR = skirtL.clone();
    skirtR.position.x = 0.89;
    this.chassisGroup.add(skirtL, skirtR);
  }

  buildCabin() {
    // Teardrop Glass Canopy
    const cabinGeo = new THREE.BoxGeometry(1.3, 0.44, 1.8);
    // Skew vertices slightly for aerodynamic rake
    const cabinMesh = new THREE.Mesh(cabinGeo, this.materials.glass);
    cabinMesh.position.set(0, 0.82, -0.15);
    cabinMesh.castShadow = true;
    this.chassisGroup.add(cabinMesh);

    // Carbon Fiber Roof Strip & Scoop. The front edge (windscreen header) sits just above and ahead
    // of the driver's head so it stays out of the cockpit camera's view.
    const roofGeo = new THREE.BoxGeometry(1.0, 0.08, 0.9);
    const roofMesh = new THREE.Mesh(roofGeo, this.materials.carbonFiber);
    roofMesh.position.set(0, 1.05, -0.5);
    roofMesh.castShadow = true;
    this.chassisGroup.add(roofMesh);

    // A-Pillars, raked from the scuttle (z 0.65, y 0.62) back to the roof header (z -0.05, y 1.03)
    const pillarGeo = new THREE.BoxGeometry(0.06, 0.81, 0.06);
    const pillarFL = new THREE.Mesh(pillarGeo, this.materials.carbonFiber);
    pillarFL.position.set(-0.6, 0.825, 0.3);
    pillarFL.rotation.x = -1.04;
    const pillarFR = pillarFL.clone();
    pillarFR.position.x = 0.6;
    this.chassisGroup.add(pillarFL, pillarFR);

    // Side Mirrors with Reflective Glass
    const mirrorStemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.16);
    const mirrorBodyGeo = new THREE.BoxGeometry(0.18, 0.08, 0.1);

    const mirrorL = new THREE.Group();
    const stemL = new THREE.Mesh(mirrorStemGeo, this.materials.carbonFiber);
    stemL.rotation.z = Math.PI * 0.35;
    const mBodyL = new THREE.Mesh(mirrorBodyGeo, this.materials.bodyPaint);
    mBodyL.position.set(-0.12, 0.06, 0);
    mirrorL.add(stemL, mBodyL);
    mirrorL.position.set(-0.76, 0.72, 0.55);

    const mirrorR = mirrorL.clone();
    mirrorR.position.x = 0.76;
    mirrorR.scale.x = -1;
    this.chassisGroup.add(mirrorL, mirrorR);
  }

  buildInterior() {
    // Low dark dashboard (top at y 0.72, well below the cockpit camera's eye line at 0.86)
    const dashGeo = new THREE.BoxGeometry(1.15, 0.12, 0.42);
    const dashMesh = new THREE.Mesh(dashGeo, this.materials.interior);
    dashMesh.position.set(0, 0.66, 0.43);
    this.chassisGroup.add(dashMesh);

    // Digital Instrument Cluster glowing screen, angled up toward the driver
    const screenGeo = new THREE.PlaneGeometry(0.26, 0.09);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(-0.32, 0.745, 0.3);
    screenMesh.rotation.x = -0.6;
    screenMesh.rotation.y = Math.PI;
    this.chassisGroup.add(screenMesh);

    // Formula-Style Racing Steering Wheel
    const wheelGroup = new THREE.Group();
    const rimGeo = new THREE.TorusGeometry(0.14, 0.022, 8, 20);
    const rimMesh = new THREE.Mesh(rimGeo, this.materials.carbonFiber);
    const centerGeo = new THREE.BoxGeometry(0.1, 0.06, 0.02);
    const centerMesh = new THREE.Mesh(centerGeo, this.materials.interior);
    wheelGroup.add(rimMesh, centerMesh);
    wheelGroup.position.set(-0.32, 0.64, 0.12); // rim top sits below the driver's sight line
    wheelGroup.rotation.x = 0.35;
    this.steeringWheel = wheelGroup;
    this.chassisGroup.add(wheelGroup);

    // Racing Bucket Seats (Driver & Passenger)
    const seatGeo = new THREE.BoxGeometry(0.42, 0.55, 0.4);
    const seatDriver = new THREE.Mesh(seatGeo, this.materials.interior);
    seatDriver.position.set(-0.32, 0.52, -0.18);
    const seatPassenger = seatDriver.clone();
    seatPassenger.position.x = 0.32;
    this.chassisGroup.add(seatDriver, seatPassenger);
  }

  buildAero() {
    // 1. Low Front Carbon Splitter
    const splitterGeo = new THREE.BoxGeometry(1.9, 0.05, 0.6);
    const splitter = new THREE.Mesh(splitterGeo, this.materials.carbonFiber);
    splitter.position.set(0, 0.08, 2.1);
    splitter.castShadow = true;

    // Splitter Endplates
    const endplateGeo = new THREE.BoxGeometry(0.04, 0.16, 0.4);
    const endplateL = new THREE.Mesh(endplateGeo, this.materials.carbonFiber);
    endplateL.position.set(-0.95, 0.14, 2.1);
    const endplateR = endplateL.clone();
    endplateR.position.x = 0.95;
    this.chassisGroup.add(splitter, endplateL, endplateR);

    // 2. Rear Aerodynamic Diffuser with 6 Vertical Strakes
    const diffuserGeo = new THREE.BoxGeometry(1.8, 0.12, 0.7);
    const diffuser = new THREE.Mesh(diffuserGeo, this.materials.carbonFiber);
    diffuser.position.set(0, 0.16, -2.1);
    diffuser.rotation.x = -0.15;
    this.chassisGroup.add(diffuser);

    for (let i = -2; i <= 2; i++) {
      const strakeGeo = new THREE.BoxGeometry(0.03, 0.15, 0.65);
      const strake = new THREE.Mesh(strakeGeo, this.materials.carbonFiber);
      strake.position.set(i * 0.32, 0.16, -2.1);
      strake.rotation.x = -0.15;
      this.chassisGroup.add(strake);
    }

    // 3. Active Rear Aerodynamic Wing
    const wingGroup = new THREE.Group();
    const wingBladeGeo = new THREE.BoxGeometry(1.95, 0.04, 0.42);
    const wingBlade = new THREE.Mesh(wingBladeGeo, this.materials.carbonFiber);
    wingBlade.castShadow = true;

    // Wing Swan-neck Pylons
    const pylonGeo = new THREE.BoxGeometry(0.04, 0.38, 0.16);
    const pylonL = new THREE.Mesh(pylonGeo, this.materials.carbonFiber);
    pylonL.position.set(-0.55, -0.15, 0);
    pylonL.rotation.x = -0.2;
    const pylonR = pylonL.clone();
    pylonR.position.x = 0.55;
    wingGroup.add(wingBlade, pylonL, pylonR);

    wingGroup.position.set(0, 0.88, -1.95);
    this.activeRearWing = wingGroup;
    this.chassisGroup.add(wingGroup);
  }

  buildLighting() {
    // Projector Matrix LED Headlights (Left & Right)
    const headGeo = new THREE.BoxGeometry(0.38, 0.08, 0.15);
    const headL = new THREE.Mesh(headGeo, this.materials.headlightLens);
    headL.position.set(-0.65, 0.46, 2.05);
    headL.rotation.y = -0.2;

    const headR = new THREE.Mesh(headGeo, this.materials.headlightLens);
    headR.position.set(0.65, 0.46, 2.05);
    headR.rotation.y = 0.2;
    this.chassisGroup.add(headL, headR);

    // Three.js Real Spotlights casting onto the road (Player car only)
    if (this.isPlayer) {
      this.leftHeadlightSpot = new THREE.SpotLight(0xffffff, 4.0, 75, Math.PI * 0.18, 0.3, 1.2);
      this.leftHeadlightSpot.position.set(-0.65, 0.46, 2.1);
      const targetL = new THREE.Object3D();
      targetL.position.set(-0.5, 0, 30);
      this.chassisGroup.add(targetL);
      this.leftHeadlightSpot.target = targetL;
      this.chassisGroup.add(this.leftHeadlightSpot);

      this.rightHeadlightSpot = new THREE.SpotLight(0xffffff, 4.0, 75, Math.PI * 0.18, 0.3, 1.2);
      this.rightHeadlightSpot.position.set(0.65, 0.46, 2.1);
      const targetR = new THREE.Object3D();
      targetR.position.set(0.5, 0, 30);
      this.chassisGroup.add(targetR);
      this.rightHeadlightSpot.target = targetR;
      this.chassisGroup.add(this.rightHeadlightSpot);

      // Volumetric light cones
      const coneGeo = new THREE.ConeGeometry(3.5, 30, 16, 1, true);
      coneGeo.rotateX(-Math.PI * 0.5);
      coneGeo.translate(0, 0, 15);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0x99ddff,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });

      const coneMeshL = new THREE.Mesh(coneGeo, coneMat);
      coneMeshL.position.set(-0.65, 0.46, 2.1);
      const coneMeshR = new THREE.Mesh(coneGeo, coneMat);
      coneMeshR.position.set(0.65, 0.46, 2.1);
      this.volumetricCones.push(coneMeshL, coneMeshR);
      this.chassisGroup.add(coneMeshL, coneMeshR);
    }

    // Rear Edge-to-Edge LED Lightbar Taillight
    const tailBarGeo = new THREE.BoxGeometry(1.7, 0.06, 0.08);
    const tailBarMesh = new THREE.Mesh(tailBarGeo, this.materials.taillightLens);
    tailBarMesh.position.set(0, 0.58, -2.15);
    this.taillightMeshes.push(tailBarMesh);
    this.chassisGroup.add(tailBarMesh);
  }

  setHeadlightsMode(timeOfDay) {
    const isNight = (timeOfDay === 'night' || timeOfDay === 'rain'); // rain preset is a rainy night
    const isDusk = (timeOfDay === 'dusk' || timeOfDay === 'sunset' || timeOfDay === 'cyber');
    if (this.leftHeadlightSpot && this.rightHeadlightSpot) {
      if (isNight) {
        this.leftHeadlightSpot.visible = true;
        this.rightHeadlightSpot.visible = true;
        this.leftHeadlightSpot.intensity = 8.0;
        this.rightHeadlightSpot.intensity = 8.0;
      } else if (isDusk) {
        this.leftHeadlightSpot.visible = true;
        this.rightHeadlightSpot.visible = true;
        this.leftHeadlightSpot.intensity = 4.0;
        this.rightHeadlightSpot.intensity = 4.0;
      } else {
        // Noon (midday): Headlight spotlights off
        this.leftHeadlightSpot.visible = false;
        this.rightHeadlightSpot.visible = false;
        this.leftHeadlightSpot.intensity = 0.0;
        this.rightHeadlightSpot.intensity = 0.0;
      }
    }
    if (this.volumetricCones) {
      this.volumetricCones.forEach(c => {
        c.visible = (isNight || isDusk);
      });
    }
    if (this.materials.headlightLens) {
      this.materials.headlightLens.emissiveIntensity = isNight ? 4.5 : (isDusk ? 3.0 : 1.2);
    }
  }

  buildExhaust() {
    // Dual titanium exhaust pipes
    const pipeGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.25, 16);
    pipeGeo.rotateX(Math.PI * 0.5);

    const pipeL = new THREE.Mesh(pipeGeo, this.materials.exhaustMetal);
    pipeL.position.set(-0.25, 0.32, -2.18);
    const pipeR = new THREE.Mesh(pipeGeo, this.materials.exhaustMetal);
    pipeR.position.set(0.25, 0.32, -2.18);
    this.chassisGroup.add(pipeL, pipeR);

    // Dynamic Flame Cones
    const flameGeo = new THREE.ConeGeometry(0.09, 0.6, 8);
    flameGeo.rotateX(Math.PI * 0.5);
    flameGeo.translate(0, 0, -0.3);

    const flameL = new THREE.Mesh(flameGeo, this.materials.exhaustFlame.clone());
    flameL.position.set(-0.25, 0.32, -2.25);
    const flameR = new THREE.Mesh(flameGeo, this.materials.exhaustFlame.clone());
    flameR.position.set(0.25, 0.32, -2.25);

    this.exhaustFlames.push(flameL, flameR);
    this.chassisGroup.add(flameL, flameR);
  }

  buildWheels() {
    // 4 Wheels: FL, FR, RL, RR
    const wheelPositions = [
      new THREE.Vector3(-0.92, 0.34, 1.35),  // FL
      new THREE.Vector3(0.92, 0.34, 1.35),   // FR
      new THREE.Vector3(-0.95, 0.36, -1.35), // RL
      new THREE.Vector3(0.95, 0.36, -1.35)  // RR
    ];

    wheelPositions.forEach((pos, idx) => {
      const isFront = idx < 2;
      const isLeft = idx % 2 === 0;

      // Master wheel assembly group (handles steering yaw on front wheels)
      const wheelAssembly = new THREE.Group();
      wheelAssembly.position.copy(pos);

      // Spin group (handles rolling rotation)
      const spinGroup = new THREE.Group();

      // Tire Geometry
      const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 24);
      tireGeo.rotateZ(Math.PI * 0.5);
      const tireMesh = new THREE.Mesh(tireGeo, this.materials.tireRubber);
      tireMesh.castShadow = true;
      spinGroup.add(tireMesh);

      // Alloy Rim Hub & 5 Double-Spokes
      const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.285, 20);
      rimGeo.rotateZ(Math.PI * 0.5);
      const rimMesh = new THREE.Mesh(rimGeo, this.materials.alloyRims);
      spinGroup.add(rimMesh);

      for (let s = 0; s < 5; s++) {
        const spokeGeo = new THREE.BoxGeometry(0.04, 0.42, 0.05);
        spokeGeo.rotateX(s * (Math.PI / 2.5));
        const spokeMesh = new THREE.Mesh(spokeGeo, this.materials.alloyRims);
        spinGroup.add(spokeMesh);
      }

      // Slotted Brake Rotor Disc
      const discGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.04, 20);
      discGeo.rotateZ(Math.PI * 0.5);
      const discMat = this.materials.brakeDisc.clone();
      const discMesh = new THREE.Mesh(discGeo, discMat);
      discMesh.position.x = isLeft ? 0.05 : -0.05;
      spinGroup.add(discMesh);
      this.brakeDiscs.push(discMat);

      wheelAssembly.add(spinGroup);

      // Brake Caliper (Stationary relative to spin, mounts on assembly)
      const caliperGeo = new THREE.BoxGeometry(0.08, 0.14, 0.14);
      const caliperMesh = new THREE.Mesh(caliperGeo, this.materials.brakeCaliper);
      caliperMesh.position.set(isLeft ? 0.06 : -0.06, 0.12, 0);
      wheelAssembly.add(caliperMesh);

      this.group.add(wheelAssembly);
      this.wheels.push({
        assembly: wheelAssembly,
        spinGroup: spinGroup,
        basePos: pos.clone(),
        isFront: isFront,
        isLeft: isLeft
      });
    });
  }

  /**
   * Sync visual model with physics state every frame
   */
  update(physics, dt) {
    // 1. Sync Root Position and Base Orientation
    this.group.position.copy(physics.position);
    this.group.quaternion.copy(physics.quaternion);

    // 2. Chassis Pitch, Roll, and Squat/Dive
    this.chassisGroup.rotation.x = physics.pitchAngle;
    this.chassisGroup.rotation.z = physics.rollAngle;

    // 3. Wheel Rotations & Steering
    this.wheels.forEach((w) => {
      // Rolling spin
      w.spinGroup.rotation.x = physics.wheelSpinAngle;

      // Front wheel steering angle
      // Positive steerAngle yaws the car toward -X (see VehiclePhysics.step), so the wheels turn the same way
      if (w.isFront) {
        w.assembly.rotation.y = -physics.steerAngle;
      }
    });

    // 4. Cockpit Steering Wheel Sync
    if (this.steeringWheel) {
      this.steeringWheel.rotation.z = physics.steerAngle * 2.2;
    }

    // 5. Active Rear Aerodynamic Wing Tilt
    if (this.activeRearWing) {
      this.activeRearWing.rotation.x = physics.wingAngle;
    }

    // 6. Brake Disc Glowing Heat Effect
    const heat = physics.brakeDiscHeat || 0;
    this.brakeDiscs.forEach((mat) => {
      if (heat > 0.05) {
        mat.emissive.setRGB(heat * 1.5, heat * 0.2, 0.0);
        mat.emissiveIntensity = heat * 3.5;
      } else {
        mat.emissiveIntensity = 0;
      }
    });

    // 7. Taillight / Brake Light Intensity
    // Use the live brake state; disc heat lingers for seconds after the pedal is released
    const isBraking = !!physics.isBraking;
    this.materials.taillightLens.emissiveIntensity = isBraking ? 6.0 : 2.5;

    // 8. Dynamic Exhaust Flames (Gear shifts and NOS)
    const isNos = physics.isNosActive;
    const isPop = physics.rpm > 7000 && Math.random() < 0.25;

    this.exhaustFlames.forEach((flame) => {
      if (isNos) {
        flame.material.opacity = 0.9;
        flame.material.color.setHex(0x00f0ff); // Electric cyan plasma
        flame.scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.4, 1.2 + Math.random() * 0.8);
      } else if (isPop) {
        flame.material.opacity = 0.8;
        flame.material.color.setHex(0xffaa00); // Orange fireball
        flame.scale.set(0.8 + Math.random() * 0.5, 0.8 + Math.random() * 0.5, 0.7 + Math.random() * 0.5);
      } else {
        flame.material.opacity = 0.0;
      }
    });
  }
}

window.CarModel = CarModel;

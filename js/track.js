/**
 * Antigravity Apex - Dynamic Multi-Circuit Racing System
 * Supports 3 distinctive world-class tracks:
 * 1. Alpine Apex GP (Grand Prix circuit with elevation & mountain tunnel)
 * 2. Akina Canyon Touge (Technical mountain touge with switchbacks & red rock cliffs)
 * 3. Neo Tokyo Expressway (Urban super-speedway with suspension bridge & glowing skyscrapers)
 */

class RaceTrack {
  constructor(options = {}) {
    this.scene = options.scene;
    this.trackId = options.trackId || 'alpine';
    this.group = new THREE.Group();

    // Road specs (configured per track)
    this.roadWidth = 16.0;
    this.segments = 360;

    // Spline curve definition
    this.curve = null;
    this.waypoints = [];
    this.trackLength = 0;

    // Track metadata
    this.trackName = "Alpine Apex GP";
    this.trackTagline = "Grand Prix Circuit • 2.5 KM";

    // Materials
    this.materials = {};

    this.buildTrack(this.trackId);

    if (this.scene) {
      this.scene.add(this.group);
    }
  }

  dispose() {
    if (!this.group) return;
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
          if (m.map) m.map.dispose(); // canvas textures are per-track and would otherwise leak
          m.dispose();
        });
      }
    });
    if (this.scene) {
      this.scene.remove(this.group);
    }
    this.group.clear();
  }

  buildTrack(trackId) {
    this.trackId = trackId;
    this.waypoints = [];
    this.streetlightSpots = [];
    this.streetlightLamps = [];

    if (trackId === 'canyon') {
      this.trackName = "Akina Canyon Touge";
      this.trackTagline = "Technical Drift Pass • 2.8 KM";
      this.roadWidth = 14.0;
      this.initCanyonSpline();
      this.buildCanyonMaterials();
      this.buildRoadMesh();
      this.buildCurbsAndBarriers();
      this.buildCanyonScenery();
      this.buildCanyonStreetlights();
    } else if (trackId === 'city') {
      this.trackName = "Neo Tokyo Expressway";
      this.trackTagline = "Urban Super Speedway • 3.2 KM";
      this.roadWidth = 18.0;
      this.initCitySpline();
      this.buildCityMaterials();
      this.buildRoadMesh();
      this.buildCurbsAndBarriers();
      this.buildCityScenery();
      this.buildCityStreetlights();
    } else {
      // Default: alpine
      this.trackName = "Alpine Apex GP";
      this.trackTagline = "Grand Prix Circuit • 2.5 KM";
      this.roadWidth = 16.0;
      this.initAlpineSpline();
      this.buildAlpineMaterials();
      this.buildRoadMesh();
      this.buildCurbsAndBarriers();
      this.buildAlpineTunnel();
      this.buildAlpineStartGantryAndGrandstands();
      this.buildAlpineTerrainAndTrees();
      this.buildAlpineStreetlights();
    }
  }

  // =========================================================================
  // 1. TRACK 1: ALPINE APEX GP (GRAND PRIX CIRCUIT)
  // =========================================================================

  initAlpineSpline() {
    const points = [
      new THREE.Vector3(0, 0, 0),          // Start / Finish Line
      new THREE.Vector3(0, 0, 180),        // Straight 1
      new THREE.Vector3(30, 2, 320),       // Gentle bend
      new THREE.Vector3(120, 6, 440),      // Turn 1 entry
      new THREE.Vector3(260, 12, 480),     // Sweeping Banked Turn 1
      new THREE.Vector3(420, 18, 420),     // Turn 2 exit
      new THREE.Vector3(520, 26, 280),     // Uphill climb
      new THREE.Vector3(560, 32, 100),     // Crest
      new THREE.Vector3(520, 36, -80),     // Mountain Ridge
      new THREE.Vector3(410, 32, -220),    // Tunnel Entry
      new THREE.Vector3(280, 24, -340),    // Inside Mountain Tunnel
      new THREE.Vector3(120, 16, -390),    // Tunnel Exit
      new THREE.Vector3(-60, 10, -380),    // Downhill Esses Entry
      new THREE.Vector3(-220, 6, -320),    // Fast Chicane
      new THREE.Vector3(-360, 3, -220),    // Downhill Sweeper
      new THREE.Vector3(-450, 1, -60),     // Flat Straight
      new THREE.Vector3(-460, 0, 120),     // Hairpin Approach
      new THREE.Vector3(-380, 0, 260),     // Tight Hairpin Apex
      new THREE.Vector3(-240, 0, 240),     // Hairpin Exit
      new THREE.Vector3(-120, 0, 120),     // Final S-Bend
      // Wide U-turn south of the grid so the last corner feeds straight onto the start line
      // (the old (-40, 0, 20) point made a hairpin right at the gantry and grandstand)
      // (sweeper points lie on a 65 m-radius arc centred at (-70, -150))
      new THREE.Vector3(-130, 0, -40),     // Final Sweeper Approach
      new THREE.Vector3(-135, 0, -150),    // Final Sweeper Entry
      new THREE.Vector3(-116, 0, -196),
      new THREE.Vector3(-70, 0, -215),     // Final Sweeper Apex
      new THREE.Vector3(-24, 0, -196),
      new THREE.Vector3(-5, 0, -150)       // Final Straight Entry
    ];

    this.curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    this.trackLength = this.curve.getLength();
    this.sampleWaypoints();
  }

  buildAlpineMaterials() {
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 1024;
    roadCanvas.height = 1024;
    const ctx = roadCanvas.getContext('2d');
    ctx.fillStyle = '#24272e';
    ctx.fillRect(0, 0, 1024, 1024);

    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 20;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Boundary solid lines
    ctx.strokeStyle = '#dcdfe5';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(38, 0); ctx.lineTo(38, 1024);
    ctx.moveTo(986, 0); ctx.lineTo(986, 1024);
    ctx.stroke();

    // Red inner rumble lines
    ctx.strokeStyle = '#b81e28';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(60, 0); ctx.lineTo(60, 1024);
    ctx.moveTo(964, 0); ctx.lineTo(964, 1024);
    ctx.stroke();

    // Center dashed yellow line
    ctx.strokeStyle = '#e6b800';
    ctx.lineWidth = 18;
    ctx.setLineDash([55, 45]);
    ctx.beginPath();
    ctx.moveTo(512, 0); ctx.lineTo(512, 1024);
    ctx.stroke();

    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(1, 1);

    this.materials.road = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    this.materials.curb = this.createCurbMaterial('#b81e28', '#dcdfe5');
    this.materials.guardrail = new THREE.MeshStandardMaterial({
      color: 0x8894a4,
      metalness: 0.75,
      roughness: 0.38,
      side: THREE.DoubleSide
    });
    this.materials.concrete = new THREE.MeshStandardMaterial({
      color: 0x3d414a,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
  }

  buildAlpineTunnel() {
    // Anchored to world positions (ridge portal to tunnel exit) rather than fixed spline fractions
    const tunnelUStart = this.uNear(423, -206);
    const tunnelUEnd = this.uNear(7, -390);
    const tunnelSteps = 45;

    for (let i = 0; i < tunnelSteps; i++) {
      const u = tunnelUStart + (i / tunnelSteps) * (tunnelUEnd - tunnelUStart);
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const up = new THREE.Vector3(0, 1, 0);

      const archGeo = new THREE.TorusGeometry(10.5, 0.8, 8, 18, Math.PI);
      const archMesh = new THREE.Mesh(archGeo, this.materials.concrete);
      archMesh.position.copy(pt).add(up.clone().multiplyScalar(1.0));
      archMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      this.group.add(archMesh);

      if (i % 2 === 0) {
        const lightGeo = new THREE.BoxGeometry(0.4, 0.15, 4.0);
        const lightMat = new THREE.MeshStandardMaterial({
          color: 0xffe0aa,
          emissive: 0xffaa44,
          emissiveIntensity: 4.0
        });
        const lightMesh = new THREE.Mesh(lightGeo, lightMat);
        lightMesh.position.copy(pt).add(up.clone().multiplyScalar(9.5));
        lightMesh.quaternion.copy(archMesh.quaternion);
        this.group.add(lightMesh);

        const point = new THREE.PointLight(0xffaa44, 2.5, 30);
        point.position.copy(lightMesh.position).sub(up.clone().multiplyScalar(0.8));
        this.group.add(point);
      }
    }
  }

  buildAlpineStartGantryAndGrandstands() {
    const startPt = this.curve.getPointAt(0);
    const tangent = this.getStartPose().tangent; // spline tangent at u=0 is skewed by the closing curl
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const gantryGroup = new THREE.Group();
    gantryGroup.position.copy(startPt);
    gantryGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

    const pillarGeo = new THREE.BoxGeometry(0.8, 9.0, 0.8);
    const pL = new THREE.Mesh(pillarGeo, this.materials.guardrail);
    pL.position.set(-11.0, 4.5, 0);
    const pR = pL.clone();
    pR.position.set(11.0, 4.5, 0);
    gantryGroup.add(pL, pR);

    const beamGeo = new THREE.BoxGeometry(23.0, 1.4, 1.2);
    const beam = new THREE.Mesh(beamGeo, this.materials.guardrail);
    beam.position.set(0, 8.8, 0);
    gantryGroup.add(beam);

    const boardGeo = new THREE.BoxGeometry(14.0, 1.1, 0.3);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      emissive: 0x00ffcc,
      emissiveIntensity: 2.5
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 8.8, -0.6);
    gantryGroup.add(board);

    this.group.add(gantryGroup);

    // Grandstands
    const standGeo = new THREE.BoxGeometry(10.0, 6.0, 60.0);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x333b48, roughness: 0.8 });
    const standL = new THREE.Mesh(standGeo, standMat);
    standL.position.copy(startPt).add(right.clone().multiplyScalar(-18.0)).add(up.clone().multiplyScalar(3.0)).add(tangent.clone().multiplyScalar(30));
    standL.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    standL.castShadow = true;

    const roofGeo = new THREE.BoxGeometry(11.0, 0.5, 62.0);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xd40b1e, roughness: 0.5 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.copy(standL.position).add(up.clone().multiplyScalar(3.5));
    roof.quaternion.copy(standL.quaternion);

    this.group.add(standL, roof);
  }

  buildAlpineTerrainAndTrees() {
    const profile = {
      blendDist: 25,
      shoulderDrop: -1.0,
      reliefRamp: 50,
      relief: (x, z) => Math.sin(x * 0.007) * 16 + Math.cos(z * 0.007) * 16,
      wall: (farDist) => Math.min(60, Math.pow(farDist * 0.032, 1.6))
    };
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x1a2e22,
      roughness: 0.95,
      metalness: 0.05
    });
    this.buildTerrainMesh(profile, terrainMat);

    // Pine Trees
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 3.5, 6);
    const foliageGeo = new THREE.ConeGeometry(2.4, 7.0, 7);
    foliageGeo.translate(0, 4.5, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x183822, roughness: 0.85 });

    const treeCount = 140;
    for (let i = 0; i < treeCount; i++) {
      const scale = 0.8 + Math.random() * 0.6;
      // Foliage radius is 2.4 * scale; reject spots that land on another stretch of the circuit
      const treePos = this.findRoadsidePosition(14, 32, 2.4 * scale + 1.0);
      if (!treePos) continue;
      treePos.y = this.terrainHeightAt(treePos.x, treePos.z, profile) - 0.3;

      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.75;
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.castShadow = true;
      tree.add(trunk, foliage);
      tree.position.copy(treePos);
      tree.scale.set(scale, scale, scale);
      this.group.add(tree);
    }
  }

  buildAlpineStreetlights() {
    this.buildGenericStreetlights(38, 0xddeeff, 2.5);
  }

  // =========================================================================
  // 2. TRACK 2: AKINA CANYON TOUGE (TECHNICAL MOUNTAIN DRIFT PASS)
  // =========================================================================

  initCanyonSpline() {
    const points = [
      new THREE.Vector3(0, 0, 0),         // Start Straight (Canyon Rim)
      new THREE.Vector3(0, 0, 160),       // Approach to Rim
      new THREE.Vector3(70, -2, 280),     // Canyon Descent Entry
      new THREE.Vector3(180, -6, 360),    // Sweeping Right
      new THREE.Vector3(300, -12, 340),   // Hairpin 1 (Devil's Elbow)
      new THREE.Vector3(260, -18, 220),   // Downhill Chute
      new THREE.Vector3(140, -24, 160),   // Hairpin 2 (Gorge Apex)
      new THREE.Vector3(80, -24, 30),     // Canyon Floor
      new THREE.Vector3(160, -18, -90),   // Snake S-Turn 1
      new THREE.Vector3(280, -10, -160),  // Snake S-Turn 2
      new THREE.Vector3(400, 0, -140),    // Canyon Wall Hairpin 3
      new THREE.Vector3(450, 15, -20),    // Mesa Ridge Climb
      new THREE.Vector3(420, 30, 120),    // High Plateau Straight
      new THREE.Vector3(320, 42, 250),    // Red Rock Rim
      new THREE.Vector3(200, 48, 380),    // Cliff Edge Crest
      new THREE.Vector3(50, 40, 490),     // High Canyon Curve
      new THREE.Vector3(-100, 28, 500),   // Downhill Touge Section
      new THREE.Vector3(-240, 18, 430),   // Fast Ess 1
      new THREE.Vector3(-360, 10, 310),   // Fast Ess 2
      new THREE.Vector3(-440, 4, 170),    // Canyon Arch Bridge Approach
      new THREE.Vector3(-420, 0, 30),     // Hairpin 4 (Red Arch Hairpin)
      new THREE.Vector3(-320, 0, -70),    // Canyon Basin Straight
      new THREE.Vector3(-200, 0, -130),   // Fast Sweeper
      new THREE.Vector3(-100, 0, -100),   // Final Chicane
      new THREE.Vector3(-40, 0, -30)      // Final Straight
    ];

    this.curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    this.trackLength = this.curve.getLength();
    this.sampleWaypoints();
  }

  buildCanyonMaterials() {
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 1024;
    roadCanvas.height = 1024;
    const ctx = roadCanvas.getContext('2d');
    ctx.fillStyle = '#1c1e24';
    ctx.fillRect(0, 0, 1024, 1024);

    // Weathered tarmac grain
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 26;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Solid white verge boundaries
    ctx.strokeStyle = '#dcdfe5';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(35, 0); ctx.lineTo(35, 1024);
    ctx.moveTo(989, 0); ctx.lineTo(989, 1024);
    ctx.stroke();

    // Double solid yellow center line (Touge Mountain Road)
    ctx.strokeStyle = '#e6b800';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(495, 0); ctx.lineTo(495, 1024);
    ctx.moveTo(529, 0); ctx.lineTo(529, 1024);
    ctx.stroke();

    // Heavy tire drift rubber marks
    ctx.fillStyle = 'rgba(8, 10, 14, 0.45)';
    ctx.fillRect(180, 0, 120, 1024);
    ctx.fillRect(720, 0, 120, 1024);

    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(1, 1);

    this.materials.road = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.94,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    this.materials.curb = this.createCurbMaterial('#c03810', '#dcdfe5');
    this.materials.guardrail = new THREE.MeshStandardMaterial({
      color: 0x8a6d58,
      metalness: 0.65,
      roughness: 0.55,
      side: THREE.DoubleSide
    });
    this.materials.concrete = new THREE.MeshStandardMaterial({
      color: 0x6e3a22,
      roughness: 0.96,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
  }

  buildCanyonScenery() {
    // 1. Red Sandstone Canyon Terrain
    const profile = {
      blendDist: 22,
      shoulderDrop: -2.3,
      reliefRamp: 40,
      relief: (x, z) => Math.sin(x * 0.009) * 22 + Math.cos(z * 0.009) * 22,
      wall: (farDist) => Math.min(75, Math.pow(farDist * 0.045, 1.7))
    };
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x6e2e1b, // Terracotta red rock
      roughness: 0.96,
      metalness: 0.04
    });
    this.buildTerrainMesh(profile, terrainMat);

    // 2. Sandstone Monoliths & Rock Spires along the Canyon Rim
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x8b3e24,
      roughness: 0.92,
      metalness: 0.08
    });

    for (let i = 0; i < 75; i++) {
      const rockH = 20 + Math.random() * 45;
      const rockR = 5 + Math.random() * 8;
      // Keep the whole base footprint off the road, including tight switchbacks passing nearby
      const rockPos = this.findRoadsidePosition(rockR + 4, 38, rockR + 1.0);
      if (!rockPos) continue;
      const groundY = this.terrainHeightAt(rockPos.x, rockPos.z, profile);

      const rockGeo = new THREE.CylinderGeometry(rockR * 0.7, rockR, rockH, 6);
      const rockMesh = new THREE.Mesh(rockGeo, rockMat);
      rockMesh.position.set(rockPos.x, groundY - 1.0 + rockH * 0.5, rockPos.z);
      rockMesh.rotation.y = Math.random() * Math.PI;
      rockMesh.castShadow = true;
      this.group.add(rockMesh);
    }

    // 3. Canyon Stone Arch Bridge spanning over the gorge
    const bridgePt = this.curve.getPointAt(0.76);
    const bridgeTan = this.curve.getTangentAt(0.76).normalize();
    const bridgeArchGeo = new THREE.TorusGeometry(18.0, 2.2, 8, 20, Math.PI);
    const bridgeMesh = new THREE.Mesh(bridgeArchGeo, this.materials.concrete);
    bridgeMesh.position.copy(bridgePt).sub(new THREE.Vector3(0, 10, 0));
    bridgeMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), bridgeTan);
    this.group.add(bridgeMesh);

    // 4. Start Gantry with Rustic Steel Truss
    this.buildCanyonStartGantry();
  }

  buildCanyonStartGantry() {
    const startPt = this.curve.getPointAt(0);
    const tangent = this.getStartPose().tangent; // spline tangent at u=0 is skewed by the closing curl

    const gantry = new THREE.Group();
    gantry.position.copy(startPt);
    gantry.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

    const pillarGeo = new THREE.BoxGeometry(0.9, 8.5, 0.9);
    const pL = new THREE.Mesh(pillarGeo, this.materials.guardrail);
    pL.position.set(-9.5, 4.2, 0);
    const pR = pL.clone();
    pR.position.set(9.5, 4.2, 0);
    gantry.add(pL, pR);

    const beamGeo = new THREE.BoxGeometry(20.0, 1.2, 1.0);
    const beam = new THREE.Mesh(beamGeo, this.materials.guardrail);
    beam.position.set(0, 8.2, 0);
    gantry.add(beam);

    const boardGeo = new THREE.BoxGeometry(12.0, 1.0, 0.3);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x110804,
      emissive: 0xff6600,
      emissiveIntensity: 2.8
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 8.2, -0.5);
    gantry.add(board);

    this.group.add(gantry);
  }

  buildCanyonStreetlights() {
    this.buildGenericStreetlights(34, 0xffaa55, 2.2);
  }

  // =========================================================================
  // 3. TRACK 3: NEO TOKYO EXPRESSWAY (URBAN HIGH-SPEED SUPER SPEEDWAY)
  // =========================================================================

  initCitySpline() {
    const points = [
      new THREE.Vector3(0, 0, 0),         // Shuto Expressway Bay Straight (Start)
      new THREE.Vector3(0, 0, 320),       // Long 600m High Speed Straight
      new THREE.Vector3(30, 0, 580),      // High Speed Approach
      new THREE.Vector3(140, 4, 780),     // Sweeper into Waterfront
      new THREE.Vector3(340, 12, 880),    // Banked Elevated Viaduct
      new THREE.Vector3(580, 20, 830),    // Waterfront Overpass Turn
      new THREE.Vector3(760, 24, 630),    // Suspension Bridge Entry
      new THREE.Vector3(830, 24, 340),    // Across Rainbow Suspension Bridge
      new THREE.Vector3(810, 20, 20),     // Bridge Exit
      new THREE.Vector3(690, 14, -250),   // Metropolis City Loop Entry
      new THREE.Vector3(510, 8, -480),    // Downtown Skyscraper Corridor
      new THREE.Vector3(290, 4, -620),    // Neon District Straight
      new THREE.Vector3(70, 2, -660),     // City Center High Speed Run
      new THREE.Vector3(-170, 0, -600),   // West Loop Entry
      new THREE.Vector3(-370, 0, -460),   // West Loop Sweeper
      new THREE.Vector3(-510, 0, -250),   // Cloverleaf Interchange Entry
      new THREE.Vector3(-540, 6, 0),      // Cloverleaf Banked Curve
      new THREE.Vector3(-470, 12, 240),   // Elevated Highway
      new THREE.Vector3(-340, 14, 450),   // Bay View Overlook
      new THREE.Vector3(-190, 8, 480),    // Harbor Bridge
      new THREE.Vector3(-90, 4, 340),     // Harbor Exit
      // Sweep round south of the grid and onto the main straight. The old single point at
      // (-30, 0, 140) ran back down beside the straight and U-turned on the start line,
      // folding the guardrails across the grid.
      new THREE.Vector3(-110, 2, 170),    // Harbor Viaduct Descent
      // (sweeper points lie on a 65 m-radius arc centred at (-75, -170))
      new THREE.Vector3(-138, 0, -60),    // Bayside Approach
      new THREE.Vector3(-140, 0, -170),   // Bayside Sweeper Entry
      new THREE.Vector3(-121, 0, -216),
      new THREE.Vector3(-75, 0, -235),    // Bayside Sweeper Apex
      new THREE.Vector3(-29, 0, -216),
      new THREE.Vector3(-10, 0, -170)     // Final Straight Entry
    ];

    this.curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    this.trackLength = this.curve.getLength();
    this.sampleWaypoints();
  }

  buildCityMaterials() {
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 1024;
    roadCanvas.height = 1024;
    const ctx = roadCanvas.getContext('2d');
    ctx.fillStyle = '#161920';
    ctx.fillRect(0, 0, 1024, 1024);

    // Micro grain
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 16;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Cyan / Neon White Boundary lines
    ctx.strokeStyle = '#00c8d8';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(35, 0); ctx.lineTo(35, 1024);
    ctx.moveTo(989, 0); ctx.lineTo(989, 1024);
    ctx.stroke();

    // 4-Lane Dashed White Dividers
    ctx.strokeStyle = '#dcdfe5';
    ctx.lineWidth = 12;
    ctx.setLineDash([40, 50]);
    ctx.beginPath();
    ctx.moveTo(270, 0); ctx.lineTo(270, 1024);
    ctx.moveTo(512, 0); ctx.lineTo(512, 1024);
    ctx.moveTo(754, 0); ctx.lineTo(754, 1024);
    ctx.stroke();

    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(1, 1);

    this.materials.road = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    this.materials.curb = this.createCurbMaterial('#00b4cc', '#dcdfe5');
    this.materials.guardrail = new THREE.MeshStandardMaterial({
      color: 0x334455,
      metalness: 0.78,
      roughness: 0.35,
      side: THREE.DoubleSide
    });
    this.materials.concrete = new THREE.MeshStandardMaterial({
      color: 0x1b222d,
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
  }

  buildCityScenery() {
    // 1. Water Canal / Bay Plane beneath Expressway
    const waterGeo = new THREE.PlaneGeometry(2400, 2400);
    waterGeo.rotateX(-Math.PI * 0.5);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x050a14,
      roughness: 0.12,
      metalness: 0.85
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -1.2;
    waterMesh.receiveShadow = true;
    this.group.add(waterMesh);

    // 2. Concrete Support Piers underneath Elevated Expressway
    // Each pier runs from the water up to just under the deck. (They used to be a fixed 30 m tall,
    // centred at half the deck height, so most of them punched up through the road.)
    const waterY = -1.2;
    for (let i = 0; i < this.waypoints.length; i += 12) {
      const wp = this.waypoints[i];
      const deckY = wp.position.y - 0.5;
      if (deckY - waterY < 3.0) continue;
      // Skip piers that would stand on a lower stretch of road passing underneath
      const q = this.queryRoad(wp.position.x, wp.position.z, 1, this.roadWidth * 0.5 + 4.0);
      if (q.lowerRoadY !== Infinity) continue;

      const pierH = deckY - waterY;
      const pierGeo = new THREE.CylinderGeometry(1.4, 1.8, pierH, 8);
      const pier = new THREE.Mesh(pierGeo, this.materials.concrete);
      pier.position.set(wp.position.x, waterY + pierH * 0.5, wp.position.z);
      this.group.add(pier);
    }

    // 3. Massive Suspension Bridge across Bay (u ~ 0.28 to 0.40)
    this.buildCitySuspensionBridge();

    // 4. Skyscraper Skyline (85+ glowing towers)
    this.buildCitySkyscrapers();

    // 5. Giant Neon Billboards
    this.buildCityNeonBillboards();

    // 6. Start / Finish Digital Highway Toll Gantry
    this.buildCityStartGantry();
  }

  buildCitySuspensionBridge() {
    // Bridge span, anchored to world positions so it stays put if the circuit's control points change
    const cableStartU = this.uNear(742, 661);
    const cableEndU = this.uNear(811, 24);
    const towerUs = [this.uNear(804, 510), this.uNear(833, 186)];
    const up = new THREE.Vector3(0, 1, 0);

    const towerMat = new THREE.MeshStandardMaterial({
      color: 0xe0e6ed,
      metalness: 0.85,
      roughness: 0.3
    });

    // Twin 75m tall steel suspension towers, each square to the road beneath it
    towerUs.forEach(tu => {
      const towerGroup = new THREE.Group();
      towerGroup.position.copy(this.curve.getPointAt(tu));
      towerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.curve.getTangentAt(tu).normalize());

      // Left & Right Tower legs
      const legGeo = new THREE.BoxGeometry(2.4, 75, 2.4);
      const legL = new THREE.Mesh(legGeo, towerMat);
      legL.position.set(-14.0, 37.5, 0);
      const legR = legL.clone();
      legR.position.x = 14.0;
      towerGroup.add(legL, legR);

      // Cross braces
      const braceGeo = new THREE.BoxGeometry(28.0, 2.2, 1.8);
      const brace1 = new THREE.Mesh(braceGeo, towerMat);
      brace1.position.set(0, 68, 0);
      const brace2 = brace1.clone();
      brace2.position.set(0, 48, 0);
      towerGroup.add(brace1, brace2);

      // Red aviation warning lights on top
      const beaconMat = new THREE.MeshStandardMaterial({ color: 0xff0022, emissive: 0xff0022, emissiveIntensity: 4.0 });
      const bGeo = new THREE.SphereGeometry(0.6, 8, 8);
      const bL = new THREE.Mesh(bGeo, beaconMat);
      bL.position.set(-14.0, 75.5, 0);
      const bR = bL.clone();
      bR.position.x = 14.0;
      towerGroup.add(bL, bR);

      this.group.add(towerGroup);
    });

    // Main Suspension Cable (Catenary curve approximation)
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x99aabb, metalness: 0.9, roughness: 0.2 });
    for (let side = -1; side <= 1; side += 2) {
      const cablePts = [];
      for (let s = 0; s <= 20; s++) {
        const u = cableStartU + (s / 20) * (cableEndU - cableStartU);
        const pt = this.curve.getPointAt(u % 1.0);
        const tan = this.curve.getTangentAt(u % 1.0).normalize();
        const r = new THREE.Vector3().crossVectors(tan, up).normalize();
        const tMid = Math.abs((s / 20) - 0.5) * 2.0; // 0 at center, 1 at ends
        const cableY = pt.y + 4.0 + (tMid * tMid * 48.0);
        cablePts.push(pt.clone().add(r.multiplyScalar(side * 14.0)).setY(cableY));
      }
      const cableCurve = new THREE.CatmullRomCurve3(cablePts);
      const cableGeo = new THREE.TubeGeometry(cableCurve, 30, 0.25, 8, false);
      const cableMesh = new THREE.Mesh(cableGeo, cableMat);
      this.group.add(cableMesh);
    }
  }

  buildCitySkyscrapers() {
    // 90 Architectural skyscraper towers lining the metropolis loop
    const buildingColors = [0x0f1824, 0x141f2d, 0x19283a, 0x0c121c];
    const windowEmissives = [0x00f0ff, 0xffaa00, 0xff0077, 0xddffff];

    for (let i = 0; i < 90; i++) {
      const w = 22 + Math.random() * 26;
      const d = 22 + Math.random() * 26;
      const h = 45 + Math.random() * 95;
      // Building footprint radius (half-diagonal) must clear every part of the expressway
      const halfDiag = Math.hypot(w, d) * 0.5;
      const bPos = this.findRoadsidePosition(halfDiag + 3, 80, halfDiag);
      if (!bPos) continue;

      const bGeo = new THREE.BoxGeometry(w, h, d);
      const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
      const emissive = windowEmissives[Math.floor(Math.random() * windowEmissives.length)];

      const bMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.35,
        metalness: 0.8,
        emissive: emissive,
        emissiveIntensity: 0.15 + Math.random() * 0.4
      });

      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.set(bPos.x, h * 0.5 - 1.0, bPos.z);
      bMesh.castShadow = true;
      this.group.add(bMesh);

      // Roof antenna with red beacon
      if (h > 90) {
        const antGeo = new THREE.CylinderGeometry(0.2, 0.4, 18, 6);
        const ant = new THREE.Mesh(antGeo, this.materials.guardrail);
        ant.position.set(bPos.x, h + 9, bPos.z);
        this.group.add(ant);
      }
    }
  }

  buildCityNeonBillboards() {
    const billboardConfigs = [
      { u: this.uNear(55, 647), text: "APEX", color: 0x00ffcc },
      { u: this.uNear(596, 820), text: "CYBER", color: 0xff0077 },
      { u: this.uNear(464, -519), text: "NITRO", color: 0xffaa00 },
      { u: this.uNear(-334, -494), text: "SHUTO", color: 0x00f0ff },
      { u: this.uNear(-312, 466), text: "TOKYO", color: 0x39ff14 }
    ];

    billboardConfigs.forEach(cfg => {
      const pt = this.curve.getPointAt(cfg.u);
      const tangent = this.curve.getTangentAt(cfg.u).normalize();
      const up = new THREE.Vector3(0, 1, 0);

      const boardGeo = new THREE.BoxGeometry(16.0, 5.0, 0.8);
      const boardMat = new THREE.MeshStandardMaterial({
        color: 0x080c14,
        emissive: cfg.color,
        emissiveIntensity: 3.5
      });
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.copy(pt).add(up.clone().multiplyScalar(12.0));
      board.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      this.group.add(board);
    });
  }

  buildCityStartGantry() {
    const startPt = this.curve.getPointAt(0);
    const tangent = this.getStartPose().tangent; // spline tangent at u=0 is skewed by the closing curl

    const gantry = new THREE.Group();
    gantry.position.copy(startPt);
    gantry.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

    const pillarGeo = new THREE.BoxGeometry(1.0, 9.5, 1.0);
    const pL = new THREE.Mesh(pillarGeo, this.materials.guardrail);
    pL.position.set(-12.0, 4.75, 0);
    const pR = pL.clone();
    pR.position.set(12.0, 4.75, 0);
    gantry.add(pL, pR);

    const beamGeo = new THREE.BoxGeometry(26.0, 1.5, 1.2);
    const beam = new THREE.Mesh(beamGeo, this.materials.guardrail);
    beam.position.set(0, 9.2, 0);
    gantry.add(beam);

    const boardGeo = new THREE.BoxGeometry(16.0, 1.2, 0.3);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x08101a,
      emissive: 0x00f0ff,
      emissiveIntensity: 3.2
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 9.2, -0.6);
    gantry.add(board);

    this.group.add(gantry);
  }

  buildCityStreetlights() {
    this.buildGenericStreetlights(42, 0x00f0ff, 2.6);
  }

  // =========================================================================
  // SHARED ROAD GEOMETRY BUILDERS
  // =========================================================================

  sampleWaypoints() {
    const sampleCount = 600;
    for (let i = 0; i < sampleCount; i++) {
      const u = i / sampleCount;
      const f = this.bankFrameAt(u);

      this.waypoints.push({
        u: u,
        position: f.pt,
        tangent: f.tangent,
        right: f.right,
        bankSlope: f.bankedRight.y, // height change per metre across the banked road
        distance: u * this.trackLength
      });
    }
  }

  // Centre point and axes of the (banked) road surface at spline parameter u.
  // Road, curbs, rails, terrain and physics all use this so they agree on the surface.
  bankFrameAt(u) {
    u = ((u % 1.0) + 1.0) % 1.0;
    const pt = this.curve.getPointAt(u);
    const tangent = this.curve.getTangentAt(u).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const bankAngle = Math.max(-0.12, Math.min(0.12, this.calculateCurvature(u) * 14.0));
    return {
      pt,
      tangent,
      right,
      bankedRight: right.clone().applyAxisAngle(tangent, bankAngle),
      bankedUp: up.clone().applyAxisAngle(tangent, bankAngle)
    };
  }

  // Horizontal proximity query against the road centre line.
  // lowerRoadRadius: also report the lowest road (>2 m below the nearest one) within this radius.
  queryRoad(x, z, step = 1, lowerRoadRadius = 0) {
    let bestSq = Infinity;
    let best = this.waypoints[0];
    for (let i = 0; i < this.waypoints.length; i += step) {
      const p = this.waypoints[i].position;
      const dx = x - p.x;
      const dz = z - p.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestSq) {
        bestSq = dSq;
        best = this.waypoints[i];
      }
    }

    let lowerRoadY = Infinity;
    if (lowerRoadRadius > 0) {
      const rSq = lowerRoadRadius * lowerRoadRadius;
      for (let i = 0; i < this.waypoints.length; i += step) {
        const p = this.waypoints[i].position;
        const dx = x - p.x;
        const dz = z - p.z;
        if (dx * dx + dz * dz < rSq && p.y < best.position.y - 2.0) {
          lowerRoadY = Math.min(lowerRoadY, p.y);
        }
      }
    }

    const sideDist = (x - best.position.x) * best.right.x + (z - best.position.z) * best.right.z;
    return { dist: Math.sqrt(bestSq), waypoint: best, sideDist, lowerRoadY };
  }

  // Spline parameter of the road point nearest to world (x, z)
  uNear(x, z) {
    return this.queryRoad(x, z).waypoint.u;
  }

  // True if a footprint of the given radius at (x, z) stays clear of every part of the road and its barriers
  isClearOfRoad(x, z, radius) {
    return this.queryRoad(x, z).dist > this.roadWidth * 0.5 + 2.5 + radius;
  }

  // Terrain height measured relative to the nearest road, so the ground always sits just below the
  // asphalt and only rises into hills/cliffs well away from it. (The old absolute-height version put
  // Akina's terrain up to 54 m above the road, where its culled back faces showed the sky.)
  terrainHeightAt(x, z, profile) {
    const halfWidth = this.roadWidth * 0.5;
    const corridor = halfWidth + 5.0;
    const q = this.queryRoad(x, z, 2, corridor + 12);
    const wp = q.waypoint;

    // Follow the road's banking across the corridor, 0.6 m under the surface
    const side = Math.max(-(halfWidth + 2.0), Math.min(halfWidth + 2.0, q.sideDist));
    const base = wp.position.y + wp.bankSlope * side - 0.6;

    let h = base;
    if (q.dist > corridor) {
      const t = Math.min(1.0, (q.dist - corridor) / profile.blendDist);
      const s = t * t * (3.0 - 2.0 * t);
      const farDist = Math.max(0, q.dist - corridor - profile.blendDist);
      h = base + s * profile.shoulderDrop
        + profile.relief(x, z) * Math.min(1.0, farDist / profile.reliefRamp)
        + profile.wall(farDist);
    }

    // Never cover a lower stretch of road that passes nearby
    if (q.lowerRoadY !== Infinity) {
      h = Math.min(h, q.lowerRoadY - 1.5);
    }
    return h;
  }

  buildTerrainMesh(profile, material) {
    // 10 m grid: fine enough that triangles can't bridge from road level up into a hillside over the asphalt
    const terrainGeo = new THREE.PlaneGeometry(1600, 1600, 160, 160);
    terrainGeo.rotateX(-Math.PI * 0.5);

    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setY(i, this.terrainHeightAt(posAttr.getX(i), posAttr.getZ(i), profile));
    }
    terrainGeo.computeVertexNormals();

    const terrain = new THREE.Mesh(terrainGeo, material);
    terrain.receiveShadow = true;
    this.group.add(terrain);
    this.terrainProfile = profile;

    // Where the road crosses high over a lower stretch, the ground is kept down for the lower road,
    // so hold the upper deck up with piers (never standing on the lower road itself)
    for (let i = 0; i < this.waypoints.length; i += 6) {
      const wp = this.waypoints[i];
      const deckY = wp.position.y - 0.5;
      const groundY = this.terrainHeightAt(wp.position.x, wp.position.z, profile);
      if (deckY - groundY < 3.0) continue;
      const q = this.queryRoad(wp.position.x, wp.position.z, 1, this.roadWidth * 0.5 + 4.0);
      if (q.lowerRoadY !== Infinity) continue;

      const pierH = deckY - groundY + 1.0;
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, pierH, 8), this.materials.concrete);
      pier.position.set(wp.position.x, groundY - 1.0 + pierH * 0.5, wp.position.z);
      pier.castShadow = true;
      this.group.add(pier);
    }
    return terrain;
  }

  // Pick a random roadside spot that keeps an object of the given radius off every part of the track
  findRoadsidePosition(minOffset, spread, radius, attempts = 12) {
    for (let a = 0; a < attempts; a++) {
      const u = Math.random();
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      const side = Math.random() > 0.5 ? 1 : -1;
      const offset = (this.roadWidth * 0.5 + minOffset + Math.random() * spread) * side;
      const pos = pt.clone().add(right.multiplyScalar(offset));
      if (this.isClearOfRoad(pos.x, pos.z, radius)) return pos;
    }
    return null;
  }

  createCurbMaterial(col1, col2) {
    const curbCanvas = document.createElement('canvas');
    curbCanvas.width = 128;
    curbCanvas.height = 256;
    const cctx = curbCanvas.getContext('2d');
    cctx.fillStyle = col1;
    cctx.fillRect(0, 0, 128, 128);
    cctx.fillStyle = col2;
    cctx.fillRect(0, 128, 128, 128);

    const curbTex = new THREE.CanvasTexture(curbCanvas);
    curbTex.wrapS = THREE.RepeatWrapping;
    curbTex.wrapT = THREE.RepeatWrapping;
    curbTex.repeat.set(1, 1);

    return new THREE.MeshStandardMaterial({
      map: curbTex,
      roughness: 0.88,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
  }

  buildRoadMesh() {
    const roadHalfWidth = this.roadWidth * 0.5;
    const segs = this.segments;
    const geometry = new THREE.BufferGeometry();

    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const { pt, bankedRight, bankedUp } = this.bankFrameAt(u);

      const pLeft = pt.clone().add(bankedRight.clone().multiplyScalar(-roadHalfWidth)).add(bankedUp.clone().multiplyScalar(0.14));
      const pRight = pt.clone().add(bankedRight.clone().multiplyScalar(roadHalfWidth)).add(bankedUp.clone().multiplyScalar(0.14));

      vertices.push(pLeft.x, pLeft.y, pLeft.z);
      vertices.push(pRight.x, pRight.y, pRight.z);

      const vCoord = u * 90;
      uvs.push(0, vCoord);
      uvs.push(1, vCoord);

      if (i < segs) {
        const row1 = i * 2;
        const row2 = (i + 1) * 2;
        indices.push(row1, row1 + 1, row2);
        indices.push(row1 + 1, row2 + 1, row2);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const roadMesh = new THREE.Mesh(geometry, this.materials.road);
    roadMesh.receiveShadow = true;
    this.group.add(roadMesh);
  }

  calculateCurvature(u) {
    const delta = 0.01;
    const t1 = this.curve.getTangentAt((u - delta + 1.0) % 1.0); // wrap: the circuit is closed
    const t2 = this.curve.getTangentAt((u + delta) % 1.0);
    const cross = new THREE.Vector3().crossVectors(t1, t2);
    return cross.y;
  }

  buildCurbsAndBarriers() {
    const segs = this.segments;
    const roadHalfWidth = this.roadWidth * 0.5;

    for (let side = -1; side <= 1; side += 2) {
      const curbGeo = new THREE.BufferGeometry();
      const railGeo = new THREE.BufferGeometry();
      const curbVerts = [], curbUvs = [], curbIdx = [];
      const railVerts = [], railUvs = [], railIdx = [];

      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        // Follow the road's banking so curbs and rails stay attached to the asphalt edge
        const { pt, bankedRight: right, bankedUp } = this.bankFrameAt(u);
        const up = new THREE.Vector3(0, 1, 0);

        const offsetDist = side * roadHalfWidth;
        const curbWidth = 1.3 * side;
        const curbEdge1 = pt.clone().add(right.clone().multiplyScalar(offsetDist)).add(bankedUp.clone().multiplyScalar(0.15));
        const curbEdge2 = pt.clone().add(right.clone().multiplyScalar(offsetDist + curbWidth)).add(bankedUp.clone().multiplyScalar(0.25));

        curbVerts.push(curbEdge1.x, curbEdge1.y, curbEdge1.z);
        curbVerts.push(curbEdge2.x, curbEdge2.y, curbEdge2.z);
        curbUvs.push(0, u * 120);
        curbUvs.push(1, u * 120);

        const railDist = offsetDist + (side * 1.8);
        const railBase = pt.clone().add(right.clone().multiplyScalar(railDist)).add(up.clone().multiplyScalar(0.4));
        const railTop = railBase.clone().add(up.clone().multiplyScalar(0.7));

        railVerts.push(railBase.x, railBase.y, railBase.z);
        railVerts.push(railTop.x, railTop.y, railTop.z);
        railUvs.push(0, u * 50);
        railUvs.push(1, u * 50);

        if (i < segs) {
          const r1 = i * 2;
          const r2 = (i + 1) * 2;
          curbIdx.push(r1, r1 + 1, r2);
          curbIdx.push(r1 + 1, r2 + 1, r2);
          railIdx.push(r1, r1 + 1, r2);
          railIdx.push(r1 + 1, r2 + 1, r2);
        }

        if (i % 6 === 0) {
          const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8);
          const post = new THREE.Mesh(postGeo, this.materials.guardrail);
          post.position.copy(railBase).add(new THREE.Vector3(0, 0.2, 0));
          post.castShadow = true;
          this.group.add(post);
        }
      }

      curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbVerts, 3));
      curbGeo.setAttribute('uv', new THREE.Float32BufferAttribute(curbUvs, 2));
      curbGeo.setIndex(curbIdx);
      curbGeo.computeVertexNormals();
      const curbMesh = new THREE.Mesh(curbGeo, this.materials.curb);
      this.group.add(curbMesh);

      railGeo.setAttribute('position', new THREE.Float32BufferAttribute(railVerts, 3));
      railGeo.setAttribute('uv', new THREE.Float32BufferAttribute(railUvs, 2));
      railGeo.setIndex(railIdx);
      railGeo.computeVertexNormals();
      const railMesh = new THREE.Mesh(railGeo, this.materials.guardrail);
      railMesh.castShadow = true;
      this.group.add(railMesh);
    }
  }

  buildGenericStreetlights(count, lampColor = 0xddeeff, spotIntensity = 2.5) {
    for (let i = 0; i < count; i++) {
      const u = i / count;
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Alternate sides, but use the other side (or skip) if the pole would stand on another stretch of road
      const preferred = (i % 2 === 0) ? 1 : -1;
      const poleOffset = this.roadWidth * 0.5 + 3.2;
      let side = 0;
      for (const s of [preferred, -preferred]) {
        const p = pt.clone().add(right.clone().multiplyScalar(s * poleOffset));
        if (this.queryRoad(p.x, p.z).dist > poleOffset - 0.5) { side = s; break; }
      }
      if (side === 0) continue;
      const polePos = pt.clone().add(right.clone().multiplyScalar(side * poleOffset));

      // 14 m pole sunk 2 m so its foot meets the ground beside banked corners
      const poleGeo = new THREE.CylinderGeometry(0.18, 0.28, 14.0, 8);
      const poleMesh = new THREE.Mesh(poleGeo, this.materials.guardrail);
      poleMesh.position.copy(polePos).add(up.clone().multiplyScalar(5.0));
      poleMesh.castShadow = true;

      const armGeo = new THREE.BoxGeometry(4.0, 0.25, 0.25);
      const armMesh = new THREE.Mesh(armGeo, this.materials.guardrail);
      armMesh.position.copy(poleMesh.position).add(up.clone().multiplyScalar(6.8)).add(right.clone().multiplyScalar(-side * 1.5));
      armMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), right.clone().multiplyScalar(-side));

      const lampGeo = new THREE.BoxGeometry(1.8, 0.2, 0.8);
      const lampMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: lampColor,
        emissiveIntensity: 4.0
      });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.copy(armMesh.position).sub(up.clone().multiplyScalar(0.2));
      lamp.quaternion.copy(armMesh.quaternion);

      this.group.add(poleMesh, armMesh, lamp);
      this.streetlightLamps.push(lamp);

      const spot = new THREE.SpotLight(lampColor, spotIntensity, 45, Math.PI * 0.28, 0.4, 1.2);
      spot.position.copy(lamp.position);
      spot.target.position.copy(pt);
      this.group.add(spot.target);
      this.group.add(spot);
      this.streetlightSpots.push(spot);
    }
  }

  setStreetlightsActive(active, intensity = 2.5) {
    if (this.streetlightSpots) {
      this.streetlightSpots.forEach(s => {
        s.visible = active;
        s.intensity = active ? intensity : 0.0;
      });
    }
    if (this.streetlightLamps) {
      this.streetlightLamps.forEach(l => {
        if (l.material) {
          l.material.emissiveIntensity = active ? Math.min(4.0, intensity * 1.5) : 0.0;
        }
      });
    }
  }

  // Grid pose for the player. The centripetal spline curls sharply in the first few metres
  // around the closing control point, so the tangent at u=0 can point up to ~80 deg off the
  // straight; aim along the chord to a point just down the road instead.
  getStartPose() {
    const position = this.curve.getPointAt(0);
    const ahead = this.curve.getPointAt(0.01).sub(position);
    ahead.y = 0;
    const tangent = ahead.normalize();
    const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
    return { position, angle: Math.atan2(tangent.x, tangent.z), tangent, right };
  }

  getTrackInfoAt(carPos) {
    let bestDistSq = Infinity;
    let bestIdx = 0;

    for (let i = 0; i < this.waypoints.length; i += 3) {
      const dSq = carPos.distanceToSquared(this.waypoints[i].position);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = i;
      }
    }

    // Refine around the coarse match, wrapping across the start/finish seam
    const n = this.waypoints.length;
    const coarseIdx = bestIdx;
    for (let k = -4; k <= 4; k++) {
      const i = (coarseIdx + k + n) % n;
      const dSq = carPos.distanceToSquared(this.waypoints[i].position);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = i;
      }
    }

    const wp = this.waypoints[bestIdx];
    const toCar = carPos.clone().sub(wp.position);
    const distFromCenter = toCar.dot(wp.right);

    // Interpolate height along the tangent so the car doesn't step between waypoints on slopes
    const along = toCar.dot(wp.tangent);
    const horiz = Math.max(0.2, Math.hypot(wp.tangent.x, wp.tangent.z));
    const elevation = wp.position.y + along * (wp.tangent.y / horiz)
      + Math.max(-this.roadWidth * 0.5, Math.min(this.roadWidth * 0.5, distFromCenter)) * wp.bankSlope; // banked surface

    return {
      elevation: elevation + 0.14,
      tangent: wp.tangent,
      trackRight: wp.right,
      normal: new THREE.Vector3(0, 1, 0),
      roadWidth: this.roadWidth,
      distFromCenter: distFromCenter,
      waypointIndex: bestIdx,
      progressU: wp.u,
      distance: wp.distance
    };
  }
}

window.RaceTrack = RaceTrack;
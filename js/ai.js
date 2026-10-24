/**
 * Antigravity Apex - AI Rival Racers
 * Autonomous opponent hypercars with dynamic pathfinding, pack overtaking, and collision avoidance.
 */

// Full Roster of 9 Unique Rival Hypercars
const RIVAL_ROSTER = [
  { name: "Apex Phantom", color: 0xffaa00, aggression: 1.05 },
  { name: "Veloce Cyber", color: 0x00f0ff, aggression: 1.03 },
  { name: "Crimson Fury", color: 0xff003c, aggression: 1.04 },
  { name: "Cobalt Beast", color: 0x2563eb, aggression: 1.01 },
  { name: "Viper Green",  color: 0x39ff14, aggression: 0.99 },
  { name: "Shadow GT",    color: 0x22252c, aggression: 0.98 },
  { name: "Hyper Violet", color: 0xa855f7, aggression: 0.96 },
  { name: "Solar Flare",  color: 0xff5500, aggression: 0.95 },
  { name: "Silver Arrow", color: 0xe2e8f0, aggression: 0.94 }
];

class AIRacer {
  constructor(options = {}) {
    this.scene = options.scene;
    this.track = options.track;
    this.name = options.name || "Rival";
    this.color = options.color || 0xff3300;
    this.laneOffset = options.laneOffset || 0;
    this.initialStartU = options.startU || 0.04;
    this.initialLaneOffset = this.laneOffset;
    this.aggression = options.aggression || 1.0;
    this.maxLaneOffset = 4.8;
    this.rollPersonality();

    // AI 3D Car Model
    this.car = new CarModel({
      scene: this.scene,
      isPlayer: false,
      primaryColor: this.color
    });

    // AI Physics & State
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.speedKmh = 0;
    this.speedMs = 0;
    this.targetSpeedKmh = 260;

    // Spline progress
    this.progressU = this.initialStartU;
    this.lap = 1;
    this.totalDistance = 0;

    // Wheel spin and steering angles for visuals
    this.steerAngle = 0;
    this.wheelSpinAngle = 0;

    // Collision radius
    this.radius = 2.2;
  }

  dispose() {
    if (this.car && this.car.dispose) {
      this.car.dispose();
    }
  }

  // Individual driving style. The roster's aggression sets the driver's general level; every race
  // re-rolls the details so the field never settles into the same nose-to-tail train.
  rollPersonality() {
    const rand = (min, max) => min + Math.random() * (max - min);
    const a = this.aggression;
    this.style = {
      topSpeedKmh: 300 * (1 + (a - 1) * 0.6) + rand(-8, 8), // roster ranks the field without splitting it apart
      cornerSkill: rand(0.95, 1.05) * (0.96 + (a - 0.94) * 0.45), // higher = carries more speed through bends
      minCornerKmh: rand(126, 144),
      brakeLookaheadM: rand(55, 120),     // how early they react to the next corner
      accelRate: rand(7.5, 11.0) * a,
      launchDelay: rand(0.08, 0.55),      // reaction time off the line (s)
      lineCommit: rand(0.5, 1.0),         // how fully they use outside-apex-outside
      laneBias: rand(-0.65, 0.65),        // preferred side of the road (fraction of usable width)
      laneChangeRate: rand(2.4, 4.2),     // m/s sideways
      paceWobble: rand(0.012, 0.045),     // lap-to-lap inconsistency
      paceFreq: rand(0.12, 0.35),
      pacePhase: rand(0, Math.PI * 2),
      mistakesPerMin: rand(0.2, 1.2) / a,
      boldness: Math.min(1, Math.max(0, (a - 0.92) * 6 + rand(-0.2, 0.2))) // keeps attacking vs. sits behind
    };
  }

  reset(startU, laneOffset) {
    this.progressU = (startU !== undefined) ? startU : this.initialStartU;
    this.laneOffset = (laneOffset !== undefined) ? laneOffset : this.initialLaneOffset;
    this.gridLane = this.laneOffset;
    this.lap = 1;
    this.totalDistance = 0;
    this.speedKmh = 0;
    this.speedMs = 0;
    this.raceTime = 0;
    this.mistakeTimer = 0;
    this.overtakeSide = 0;
    this.overtakeTimer = 0;
    this.rollPersonality();

    if (!this.track || !this.track.curve) return;

    const pt = this.track.curve.getPointAt(this.progressU);
    const tangent = this.track.curve.getTangentAt(this.progressU).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

    this.position.copy(pt).add(right.multiplyScalar(this.laneOffset)).add(new THREE.Vector3(0, 0.52, 0));
    this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

    // Sync visual model immediately on the starting grid
    if (this.car && this.car.group) {
      this.car.group.position.copy(this.position);
      this.car.group.quaternion.copy(this.quaternion);
    }
  }

  update(dt, playerCar, otherAIs) {
    if (!this.track || !this.track.curve) return;

    const st = this.style;
    const L = this.track.trackLength || 2500;
    this.raceTime += dt;
    const w = this.maxLaneOffset;
    const curvAt = (u) => (this.track.calculateCurvature ? this.track.calculateCurvature(((u % 1.0) + 1.0) % 1.0) : 0);

    // 1. Cornering speed: each driver reads the road at their own braking distance and carries
    //    speed according to their skill, so they arrive at and leave corners at different paces
    const cNow = curvAt(this.progressU);
    const cAhead = curvAt(this.progressU + st.brakeLookaheadM / L);
    const cornerC = Math.max(Math.abs(cAhead), Math.abs(cNow) * 0.8);
    const pace = 1.0 + st.paceWobble * Math.sin(this.raceTime * st.paceFreq + st.pacePhase);
    this.targetSpeedKmh = Math.max(st.minCornerKmh * st.cornerSkill,
                                   st.topSpeedKmh * pace - cornerC * 3800 / st.cornerSkill);

    // Occasional driver error: lifts or runs a little wide for a moment
    if (this.mistakeTimer > 0) {
      this.mistakeTimer -= dt;
      this.targetSpeedKmh *= 0.78;
    } else if (this.raceTime > 5 && Math.random() < (st.mistakesPerMin / 60) * dt) {
      this.mistakeTimer = 0.5 + Math.random() * 0.9;
    }

    // 2. Personal racing line: outside on the approach, clip the apex, plus a preferred side.
    //    Positive curvature turns toward negative lane offset (see RaceTrack.calculateCurvature).
    const norm = (c) => Math.max(-1, Math.min(1, c / 0.03));
    let laneTarget = w * (st.laneBias + st.lineCommit * 0.7 * (norm(cAhead) - 1.4 * norm(cNow)));
    // Off the line, hold the grid slot for a few seconds instead of all funnelling to one lane
    const gridBlend = Math.min(1, this.raceTime / 6);
    laneTarget = this.gridLane + (laneTarget - this.gridLane) * gridBlend;

    // 3. Traffic: only a car actually in our lane blocks us. Commit to a side to pass it, take a
    //    tow in its slipstream, and sit behind only if we can't (or won't) go for the gap.
    const forward = this.getForward();
    const laneRight = this.getRight().negate(); // direction of increasing laneOffset
    let blocker = null, blockerAhead = Infinity, blockerLateral = 0;
    const consider = (pos, speedKmh) => {
      const to = pos.clone().sub(this.position);
      const ahead = to.dot(forward);
      const lateral = to.dot(laneRight);
      if (ahead > 0 && ahead < 30 && Math.abs(lateral) < 2.6 && ahead < blockerAhead) {
        blocker = { speedKmh }; blockerAhead = ahead; blockerLateral = lateral;
      }
    };
    if (playerCar) consider(playerCar.position, playerCar.speedKmh);
    if (otherAIs) otherAIs.forEach(o => { if (o !== this) consider(o.position, o.speedKmh); });

    if (this.overtakeTimer > 0) this.overtakeTimer -= dt;
    if (blocker) {
      // Slipstream tow
      this.targetSpeedKmh *= 1.0 + 0.04 * (1 - blockerAhead / 30);
      if (this.overtakeTimer <= 0) {
        // Pick the side with more road, nudged by our own preference
        const roomPlus = w - (this.laneOffset + blockerLateral);
        const roomMinus = w + (this.laneOffset + blockerLateral);
        this.overtakeSide = (roomPlus + st.laneBias * 2 > roomMinus) ? 1 : -1;
        this.overtakeTimer = 1.5 + Math.random() * 1.5;
        this.goingForGap = Math.random() < 0.35 + st.boldness * 0.6; // decided once per attempt
      }
      if (this.goingForGap || blockerAhead > 12) {
        laneTarget = this.laneOffset + blockerLateral + this.overtakeSide * 3.2;
      }
      if (blockerAhead < 7) {
        this.targetSpeedKmh = Math.min(this.targetSpeedKmh, Math.max(0, blocker.speedKmh * (0.97 + st.boldness * 0.02)));
      }
    } else if (this.overtakeTimer > 0) {
      // Finish the move before drifting back to our line
      laneTarget = this.laneOffset + this.overtakeSide * 0.5;
    }

    laneTarget = Math.max(-w, Math.min(w, laneTarget));
    const laneStep = st.laneChangeRate * dt;
    this.laneOffset += Math.max(-laneStep, Math.min(laneStep, laneTarget - this.laneOffset));

    // Physical separation from other rivals so cars never clip into each other
    if (otherAIs) {
      for (let i = 0; i < otherAIs.length; i++) {
        const other = otherAIs[i];
        if (other === this) continue;
        const dist = other.position.distanceTo(this.position);
        const minSep = 2.6;
        if (dist < minSep && dist > 0.01) {
          const sepNormal = this.position.clone().sub(other.position).normalize();
          const overlap = minSep - dist;
          this.position.add(sepNormal.clone().multiplyScalar(overlap * 0.5));
          other.position.sub(sepNormal.multiplyScalar(overlap * 0.5));
        }
      }
    }

    // 4. Accelerate / brake towards target speed (after each driver's own launch reaction)
    if (this.raceTime < st.launchDelay) this.targetSpeedKmh = 0;
    const targetMs = this.targetSpeedKmh / 3.6;
    const accelRate = (this.speedMs < targetMs) ? st.accelRate * 0.1 : 1.6; // per-second lerp factors
    this.speedMs += (targetMs - this.speedMs) * Math.min(1.0, accelRate * dt);
    this.speedKmh = this.speedMs * 3.6;

    // 5. Advance spline position
    const deltaU = (this.speedMs * dt) / (this.track.trackLength || 2500);
    const oldU = this.progressU;
    this.progressU = (((this.progressU + deltaU) % 1.0) + 1.0) % 1.0;

    // Lap crossing detection
    if (oldU > 0.85 && this.progressU < 0.15) {
      this.lap++;
    }
    this.totalDistance = (this.lap - 1) * this.track.trackLength + this.progressU * this.track.trackLength;

    // 6. Update World Position & Orientation along track spline
    const targetPt = this.track.curve.getPointAt(this.progressU);
    const tangent = this.track.curve.getTangentAt(this.progressU).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const targetPos = targetPt.clone().add(right.clone().multiplyScalar(this.laneOffset)).add(new THREE.Vector3(0, 0.52, 0));
    this.position.copy(targetPos);

    // Look smoothly along tangent
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    this.quaternion.slerp(targetQuat, dt * 8);

    // 7. Visual updates
    this.wheelSpinAngle += (this.speedMs / 0.34) * dt;

    if (this.car && this.car.group) {
      this.car.group.position.copy(this.position);
      this.car.group.quaternion.copy(this.quaternion);

      if (this.car.wheels) {
        this.car.wheels.forEach(w => {
          if (w.spinGroup) w.spinGroup.rotation.x = this.wheelSpinAngle;
        });
      }
    }

    // 8. Check collision with Player Car
    if (playerCar) {
      this.checkPlayerCollision(playerCar);
    }
  }

  getForward() {
    return new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
  }

  getRight() {
    return new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
  }

  checkPlayerCollision(player) {
    const dist = this.position.distanceTo(player.position);
    const minDist = 3.2;

    if (dist < minDist && dist > 0.01) {
      const normal = player.position.clone().sub(this.position).normalize();
      const penetration = minDist - dist;

      // Push both apart
      player.position.add(normal.clone().multiplyScalar(penetration * 0.6));
      this.position.sub(normal.clone().multiplyScalar(penetration * 0.4));

      // Velocity exchange
      const relativeVel = player.velocity.clone().sub(this.getForward().multiplyScalar(this.speedMs));
      const impactSpeed = relativeVel.length();

      if (impactSpeed > 3.0) {
        player.velocity.add(normal.clone().multiplyScalar(impactSpeed * 0.4));
        if (window.Sound) window.Sound.playCollisionSound(Math.min(1.0, impactSpeed / 10));
        if (window.Environment) window.Environment.emitSparks(player.position, player.velocity);
      }
    }
  }
}

class AIManager {
  constructor(options = {}) {
    this.scene = options.scene;
    this.track = options.track;
    this.rivals = [];

    // Default: 7 AI Rivals (8 cars total on starting grid)
    let savedCount = 7;
    try {
      const stored = localStorage.getItem('antigravity_rival_count');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if ([3, 5, 7, 9].includes(parsed)) savedCount = parsed;
      }
    } catch (e) {}

    this.rivalCount = savedCount;
    this.initRivals(this.rivalCount);
    this.resetAll();
  }

  initRivals(count = 7) {
    // Dispose previous rival cars
    this.dispose();

    this.rivalCount = Math.max(1, Math.min(RIVAL_ROSTER.length, count));

    for (let i = 0; i < this.rivalCount; i++) {
      const cfg = RIVAL_ROSTER[i];
      const racer = new AIRacer({
        scene: this.scene,
        track: this.track,
        name: cfg.name,
        color: cfg.color,
        aggression: cfg.aggression
      });
      this.rivals.push(racer);
    }
  }

  setRivalCount(count) {
    this.rivalCount = Math.max(1, Math.min(RIVAL_ROSTER.length, count));
    try {
      localStorage.setItem('antigravity_rival_count', this.rivalCount.toString());
    } catch (e) {}

    this.initRivals(this.rivalCount);
    this.resetAll();
  }

  setTrack(newTrack) {
    this.track = newTrack;
    this.rivals.forEach(r => {
      r.track = newTrack;
    });
    this.resetAll();
  }

  resetAll() {
    if (!this.track || !this.track.curve) return;

    const L = Math.max(1000, this.track.trackLength || 2500);
    // Distance between rows (~11.5 meters along track)
    const rowSpacingU = 11.5 / L;
    const roadHalfWidth = (this.track.roadWidth || 16.0) * 0.5;
    const sideOffset = Math.min(3.4, roadHalfWidth - 2.0);

    const N = this.rivals.length;
    this.rivals.forEach((r, idx) => {
      // Staggered starting grid slots ahead of player
      // Top seeds start in rows ahead
      const row = Math.floor((N - 1 - idx) / 2);
      const isLeft = (idx % 2 === 0);
      const startU = 0.008 + (row + 1) * rowSpacingU;
      const laneOffset = isLeft ? -sideOffset : sideOffset;

      r.maxLaneOffset = roadHalfWidth - 1.8;
      r.reset(startU, laneOffset);
    });
  }

  update(dt, playerCar) {
    this.rivals.forEach(r => {
      r.update(dt, playerCar, this.rivals);
    });
  }

  dispose() {
    this.rivals.forEach(r => r.dispose());
    this.rivals = [];
  }

  /**
   * Calculate race standings: returns array sorted by race progress
   */
  getLeaderboard(playerTotalDist) {
    const list = [
      { name: "Player", distance: playerTotalDist, isPlayer: true }
    ];

    this.rivals.forEach(r => {
      list.push({
        name: r.name,
        distance: r.totalDistance,
        isPlayer: false
      });
    });

    list.sort((a, b) => b.distance - a.distance);

    // Find player position
    const playerIndex = list.findIndex(item => item.isPlayer);
    return {
      playerPosition: playerIndex + 1,
      totalRacers: list.length,
      standings: list
    };
  }
}

window.AIManager = AIManager;

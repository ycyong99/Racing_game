/**
 * Antigravity Apex - High Fidelity Vehicle Physics Engine
 * Multi-body arcade-simulation dynamics: tire grip, weight transfer, drift dynamics, and collision.
 */

class VehiclePhysics {
  constructor(options = {}) {
    // Vehicle specs (High-performance hybrid hypercar)
    this.mass = 1450; // kg
    this.wheelBase = 2.75; // meters
    this.trackWidth = 1.95; // meters
    this.topSpeedKmh = 365;
    this.nosTopSpeedKmh = 415;

    // Transmission & Engine
    this.gearRatios = [3.8, 2.6, 1.9, 1.45, 1.15, 0.95, 0.78]; // 1st to 7th
    this.reverseRatio = 3.4;
    this.finalDrive = 3.65;
    this.currentGear = 1; // 1 to 7, -1 for reverse
    this.isManual = false;
    this.rpm = 900;
    this.idleRpm = 900;
    this.redlineRpm = 8600;
    this.maxTorque = 920; // Nm

    // Dynamics state
    this.position = new THREE.Vector3(0, 0.5, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.forward = new THREE.Vector3(0, 0, 1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.right = new THREE.Vector3(1, 0, 0);
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.quaternion = new THREE.Quaternion();

    this.speedKmh = 0;
    this.speedMs = 0;
    this.localVelocity = new THREE.Vector3();
    this.angularVelocityY = 0;

    // Steering
    this.steerAngle = 0;
    this.maxSteerAngle = 0.50; // radians (~29 deg) at low speeds
    this.steerSpeed = 5.0; // rad/s
    this.steerSensitivity = 0.55; // Adjustable: 0.2 (very smooth) to 1.4 (sharp), default 55%

    // Weight transfer & suspension
    this.pitchAngle = 0; // nose dive (-) or squat (+)
    this.rollAngle = 0;  // roll left/right
    this.suspensionCompression = [0, 0, 0, 0]; // FL, FR, RL, RR

    // Slip & Drift
    this.frontSlip = 0;
    this.rearSlip = 0;
    this.driftAngle = 0;
    this.isDrifting = false;
    this.driftScore = 0;
    this.driftMultiplier = 1;
    this.driftTimer = 0;

    // Nitrous System
    this.nosCapacity = 100;
    this.nosAmount = 100;
    this.isNosActive = false;

    // Brakes
    this.brakeDiscHeat = 0; // 0 to 1 (for red glow)

    // Wheel visual rotations
    this.wheelRotationSpeed = 0;
    this.wheelSpinAngle = 0;

    // Active Aero wing angle
    this.wingAngle = 0.1; // rad

    // Track reference
    this.track = options.track || null;
  }

  // keepRaceProgress: true for a mid-race respawn (keeps drift points and nitrous)
  reset(position, forwardAngle = 0, keepRaceProgress = false) {
    this.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.angularVelocityY = 0;
    this.speedKmh = 0;
    this.speedMs = 0;
    this.steerAngle = 0;
    this.currentGear = 1;
    this.rpm = this.idleRpm;
    this.driftMultiplier = 1;
    this.driftTimer = 0;
    this.driftAngle = 0;
    this.isDrifting = false;
    this.isNosActive = false;
    this.isBraking = false;
    this.pitchAngle = 0;
    this.rollAngle = 0;
    this.brakeDiscHeat = 0;
    if (!keepRaceProgress) {
      this.driftScore = 0;
      this.nosAmount = this.nosCapacity;
    }
    this.rotation.set(0, forwardAngle, 0);
    this.quaternion.setFromEuler(this.rotation);
    this.updateVectors();
  }

  updateVectors() {
    this.forward.set(0, 0, 1).applyQuaternion(this.quaternion).normalize();
    this.up.set(0, 1, 0).applyQuaternion(this.quaternion).normalize();
    // Up x Forward = Right in Three.js right-handed coordinates (+X is car right)
    this.right.crossVectors(this.up, this.forward).normalize();
  }

  step(dt, input) {
    if (dt > 0.1) dt = 0.1; // clamp delta time for stability

    // 1. Process Steering Input with Sensitivity Adjustment
    // Dynamic max steer scales gracefully with speed and user's sensitivity setting
    const speed = Math.abs(this.speedMs);
    const speedFactor = 1.0 / (1.0 + speed * 0.045);
    const dynamicMaxSteer = this.maxSteerAngle * speedFactor * (0.35 + this.steerSensitivity * 0.65);
    const targetSteer = input.steering * dynamicMaxSteer;

    // Smooth, progressive steering transitions (rate scales with sensitivity)
    const transitionRate = 5.0 + this.steerSensitivity * 5.0;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, transitionRate * dt);

    // 2. Nitrous Oxide activation
    if (input.nos && this.nosAmount > 2 && input.throttle > 0.5) {
      this.isNosActive = true;
      this.nosAmount = Math.max(0, this.nosAmount - dt * 26);
    } else {
      this.isNosActive = false;
      // Passive recharge
      this.nosAmount = Math.min(this.nosCapacity, this.nosAmount + dt * 4.5);
    }

    // 3. Forward Speed & Automatic Direction Transition
    const forwardSpeed = this.velocity.dot(this.forward);
    this.speedMs = forwardSpeed;
    this.speedKmh = forwardSpeed * 3.6;

    // Seamless Arcade Forward / Reverse:
    // - Up Arrow (input.throttle): Drive forward; if reversing, brakes first then drives forward
    // - Down Arrow (input.brake): Brakes if moving forward; if stopped, automatically drives in Reverse
    let driveForce = 0;
    let brakeForce = 0;

    if (this.currentGear === -1) {
      // CURRENTLY IN REVERSE
      if (input.throttle > 0) {
        // Pressing Up Arrow when moving backwards brakes the reverse motion first
        if (forwardSpeed < -0.3) {
          brakeForce = input.throttle * 15000;
        } else {
          // Once stopped, immediately switch to 1st gear and drive forward!
          this.currentGear = 1;
        }
      }

      if (input.brake > 0 && this.currentGear === -1) {
        // Holding Down Arrow drives in reverse!
        const reversePower = Math.sin((this.rpm / this.redlineRpm) * Math.PI * 0.85 + 0.15);
        driveForce = - (this.maxTorque * 0.75 * reversePower * this.reverseRatio * this.finalDrive / 0.35) * input.brake;
        if (this.speedKmh < -65) {
          driveForce *= Math.max(0, 1 - (Math.abs(this.speedKmh) - 65) / 10);
        }
      }
    } else {
      // CURRENTLY IN FORWARD GEAR (1 to 7)
      if (input.brake > 0) {
        if (forwardSpeed > 0.4) {
          // Moving forward: Down Arrow applies strong 4-wheel braking
          brakeForce = input.brake * 16000;
        } else if (input.throttle === 0) {
          // Stopped / near standstill: Holding Down Arrow AUTOMATICALLY engages Reverse!
          this.currentGear = -1;
          const reversePower = Math.sin((this.rpm / this.redlineRpm) * Math.PI * 0.85 + 0.15);
          driveForce = - (this.maxTorque * 0.75 * reversePower * this.reverseRatio * this.finalDrive / 0.35) * input.brake;
        }
      }

      if (input.throttle > 0 && this.currentGear > 0) {
        // Up Arrow accelerates forward through gears 1-7
        const gearRatio = this.gearRatios[this.currentGear - 1];
        const rpmPower = Math.sin((this.rpm / this.redlineRpm) * Math.PI * 0.85 + 0.15);
        const nosMultiplier = this.isNosActive ? 1.45 : 1.0;
        driveForce = (this.maxTorque * rpmPower * gearRatio * this.finalDrive * nosMultiplier / 0.35) * input.throttle;

        const maxSpd = this.isNosActive ? this.nosTopSpeedKmh : this.topSpeedKmh;
        if (this.speedKmh > maxSpd) {
          driveForce *= Math.max(0, 1 - (this.speedKmh - maxSpd) / 20);
        }
      }
    }

    this.isBraking = brakeForce > 0;
    if (brakeForce > 0) {
      this.brakeDiscHeat = Math.min(1.0, this.brakeDiscHeat + dt * 0.9);
    } else {
      this.brakeDiscHeat = Math.max(0.0, this.brakeDiscHeat - dt * 0.35);
    }

    // Update Transmission & Engine RPM
    this.updateTransmission(input, dt);

    // Aerodynamic drag & Rolling resistance
    const dragCoeff = 0.32;
    const frontalArea = 2.1;
    const airDensity = 1.225;
    const aeroDrag = 0.5 * airDensity * dragCoeff * frontalArea * forwardSpeed * Math.abs(forwardSpeed);
    const rollingResistance = 0.015 * this.mass * 9.81 * Math.sign(forwardSpeed);

    // Net longitudinal acceleration (braking opposes current direction)
    const brakeDirection = Math.sign(forwardSpeed) || 1;
    const netLongitudinalForce = driveForce - (brakeForce * brakeDirection) - aeroDrag - rollingResistance;
    const longAccel = netLongitudinalForce / this.mass;

    // 5. Lateral Dynamics & Yaw Steering
    // Ackerman steering yaw calculation:
    // Moving forward (forwardSpeed > 0):
    // - Steer Right (steerAngle > 0) -> rotates clockwise (deltaYaw < 0)
    // - Steer Left (steerAngle < 0) -> rotates counter-clockwise (deltaYaw > 0)
    // Reversing (forwardSpeed < 0): natural reverse turning
    const effectiveSpeed = (speed < 0.2) ? 0 : forwardSpeed;
    let rawYawRate = - (effectiveSpeed / this.wheelBase) * Math.sin(this.steerAngle);

    // Realistic tire grip clamp: prevents unnatural twitching/spinning at high speeds
    // Maximum lateral G-force: 1.35G normal, 1.8G in drift, modulated by user's sensitivity setting
    if (speed > 4.0) {
      const maxLateralG = (this.isDrifting ? 1.75 : 1.35) * 9.81 * (0.6 + this.steerSensitivity * 0.4);
      const maxYawRate = maxLateralG / speed;
      rawYawRate = Math.max(-maxYawRate, Math.min(maxYawRate, rawYawRate));
    }
    let targetYawRate = rawYawRate;

    // Drifting state calculation
    if (input.handbrake && Math.abs(this.speedKmh) > 20) {
      this.isDrifting = true;
      targetYawRate *= 1.5; // sharp drift initiation
      this.driftAngle = this.steerAngle;
      this.driftTimer += dt;
      if (this.driftTimer > 1.2) {
        this.driftMultiplier = Math.max(1, Math.min(5, Math.floor(this.driftTimer * 1.2)));
      }
      // Points scale with time (not frame rate) and with the combo multiplier
      this.driftScore += Math.floor(Math.abs(this.steerAngle) * (Math.abs(this.speedKmh) / 10) * 8 * dt * 60 * this.driftMultiplier);
      this.nosAmount = Math.min(this.nosCapacity, this.nosAmount + dt * 8);
    } else {
      if (this.isDrifting) {
        this.driftTimer = 0;
        this.driftMultiplier = 1;
        this.isDrifting = false;
      }
      this.driftAngle = 0;
    }

    // Responsive yaw rate acceleration
    this.angularVelocityY += (targetYawRate - this.angularVelocityY) * Math.min(1.0, 14.0 * dt);

    // 6. Integrate Yaw Rotation around car Up axis
    const deltaYaw = this.angularVelocityY * dt;
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaYaw);
    this.quaternion.multiply(yawQuat);
    this.updateVectors();

    // Rotate existing velocity vector with the vehicle's turning heading
    this.velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaYaw);

    // 7. Integrate Longitudinal Force
    const forwardAccVec = this.forward.clone().multiplyScalar(longAccel * dt);
    this.velocity.add(forwardAccVec);

    // Apply lateral tire friction / cornering grip (removes sideways slide unless drifting)
    const currentLateralSpd = this.velocity.dot(this.right);
    // Grip values are tuned per 60 Hz frame; scale by dt so handling is identical at any frame rate
    const lateralGrip = Math.pow(this.isDrifting ? 0.94 : 0.80, dt * 60);
    this.velocity.sub(this.right.clone().multiplyScalar(currentLateralSpd * (1.0 - lateralGrip)));

    // Standstill damping
    if (Math.abs(this.speedKmh) < 0.5 && input.throttle === 0 && input.brake === 0) {
      this.velocity.multiplyScalar(Math.pow(0.7, dt * 60));
    }

    // Integrate Position
    this.position.add(this.velocity.clone().multiplyScalar(dt));

    // 8. Suspension, Pitch & Roll (Weight Transfer)
    const targetPitch = (longAccel / 9.81) * 0.055; // Brake dive / Accel squat
    const targetRoll = -(currentLateralSpd / 20.0) * 0.065; // Roll in corners
    this.pitchAngle += (targetPitch - this.pitchAngle) * dt * 10;
    this.rollAngle += (targetRoll - this.rollAngle) * dt * 10;

    // Active rear wing angle (flips up under heavy braking as airbrake!)
    const targetWing = (input.brake > 0.4 && this.speedKmh > 70) ? 0.65 : 0.08;
    this.wingAngle += (targetWing - this.wingAngle) * dt * 8;

    // Wheel visual rotations
    this.wheelRotationSpeed = forwardSpeed / 0.34; // rad/s
    this.wheelSpinAngle += this.wheelRotationSpeed * dt;

    // 9. Track Clamping & Terrain Alignment
    this.handleTrackAlignmentAndCollisions(dt);
  }

  updateTransmission(input, dt) {
    if (this.currentGear === -1) {
      // In reverse, RPM revs up based on Down Arrow (input.brake) and vehicle reverse speed
      const revInput = input ? (input.brake || 0) : 0;
      const targetRpm = Math.max(this.idleRpm, this.idleRpm + revInput * 3800 + Math.abs(this.speedKmh) * 55);
      this.rpm += (targetRpm - this.rpm) * dt * 12;
      return;
    }

    // Automatic gear shifting (1 to 7)
    const throttle = input ? (input.throttle || 0) : 0;
    const upshiftRpm = 7600;
    const downshiftRpm = 3400;

    if (this.rpm > upshiftRpm && this.currentGear < this.gearRatios.length) {
      this.currentGear++;
      this.rpm = 4500;
    } else if (this.rpm < downshiftRpm && this.currentGear > 1) {
      this.currentGear--;
      this.rpm = 6200;
    }

    // Calculate current engine RPM based on road speed and gear ratio
    const currentGearRatio = this.gearRatios[this.currentGear - 1];
    const wheelRpm = (Math.abs(this.speedMs) / (2 * Math.PI * 0.34)) * 60;
    let targetRpm = wheelRpm * currentGearRatio * this.finalDrive;

    // In neutral/low speed, throttle revs up engine
    if (this.speedKmh < 10 && throttle > 0.1) {
      targetRpm = Math.max(targetRpm, this.idleRpm + throttle * 5500);
    }

    targetRpm = Math.max(this.idleRpm, Math.min(this.redlineRpm, targetRpm));
    this.rpm += (targetRpm - this.rpm) * dt * 14;
  }

  handleTrackAlignmentAndCollisions(dt) {
    if (!this.track) {
      // Ground plane fallback
      this.position.y = 0.38;
      return;
    }

    // Query track height, normal, and boundary
    const trackInfo = this.track.getTrackInfoAt(this.position);
    if (!trackInfo) return;

    // Smoothly adhere to track surface elevation
    const targetY = trackInfo.elevation + 0.38;
    this.position.y += (targetY - this.position.y) * dt * 18;

    // Track barrier / guardrail collision detection
    const distFromCenter = trackInfo.distFromCenter;
    const roadHalfWidth = trackInfo.roadWidth * 0.5;
    // Guardrail sits 1.8 m outside the road edge (see RaceTrack.buildCurbsAndBarriers); car half-width ~1.1 m
    const barrierLimit = roadHalfWidth + 1.8 - 1.1;

    if (Math.abs(distFromCenter) > barrierLimit) {
      // Impact with barrier
      const sign = Math.sign(distFromCenter);
      const penetration = Math.abs(distFromCenter) - barrierLimit;

      // Push back onto track
      const pushDir = trackInfo.trackRight.clone().multiplyScalar(-sign);
      this.position.add(pushDir.clone().multiplyScalar(penetration * 1.1));

      // Elastic rebound & velocity damping
      const impactVelocity = this.velocity.dot(pushDir);
      if (impactVelocity < 0) {
        this.velocity.sub(pushDir.clone().multiplyScalar(impactVelocity * 1.5));
        this.velocity.multiplyScalar(0.85); // Speed scrub

        // Trigger collision audio & sparks
        if (window.Sound && Math.abs(impactVelocity) > 2.0) {
          window.Sound.playCollisionSound(Math.min(1.0, Math.abs(impactVelocity) / 12));
        }
        if (window.Environment) {
          window.Environment.emitSparks(this.position, this.velocity);
        }
      }
    }
  }
}

window.VehiclePhysics = VehiclePhysics;

/**
 * Antigravity Apex - Telemetry HUD & Mini-Map Controller
 * Real-time digital dashboard, tachometer, GPS mini-map, drift score popups, and race timing.
 */

class HUDController {
  constructor(options = {}) {
    this.track = options.track;

    // DOM Elements
    this.elSpeed = document.getElementById('hud-speed');
    this.elUnit = document.getElementById('hud-unit');
    this.elGear = document.getElementById('hud-gear');
    this.elTachoFill = document.getElementById('tacho-fill');
    this.elNosBar = document.getElementById('hud-nos-bar');

    this.elPosNum = document.getElementById('hud-pos-num');
    this.elPosTotal = document.getElementById('hud-pos-total');
    this.elLapCurrent = document.getElementById('hud-lap-current');
    this.elLapTime = document.getElementById('hud-lap-time');
    this.elLapBest = document.getElementById('hud-lap-best');

    this.elDriftBadge = document.getElementById('hud-drift-badge');
    this.elDriftScore = document.getElementById('hud-drift-score');
    this.elDriftMult = document.getElementById('hud-drift-mult');

    this.elToast = document.getElementById('hud-notification');

    // Mini-Map
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    // State
    this.speedUnit = 'kmh'; // 'kmh' or 'mph'
    this.toastTimeout = null;

    // Track bounding box for mini-map scaling
    this.initMinimapBounds();
  }

  initMinimapBounds() {
    if (!this.track || !this.track.curve) return;

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i < 200; i++) {
      const pt = this.track.curve.getPointAt(i / 200);
      minX = Math.min(minX, pt.x);
      maxX = Math.max(maxX, pt.x);
      minZ = Math.min(minZ, pt.z);
      maxZ = Math.max(maxZ, pt.z);
    }

    const padding = 60;
    this.bounds = {
      minX: minX - padding,
      maxX: maxX + padding,
      minZ: minZ - padding,
      maxZ: maxZ + padding,
      width: (maxX - minX) + padding * 2,
      height: (maxZ - minZ) + padding * 2
    };
  }

  setSpeedUnit(unit) {
    this.speedUnit = unit;
    if (this.elUnit) {
      this.elUnit.innerText = unit.toUpperCase();
    }
  }

  formatTime(seconds) {
    if (seconds === Infinity || isNaN(seconds) || seconds <= 0) return "--:--.--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 100);

    const mStr = mins < 10 ? '0' + mins : mins;
    const sStr = secs < 10 ? '0' + secs : secs;
    const msStr = millis < 10 ? '0' + millis : millis;
    return `${mStr}:${sStr}.${msStr}`;
  }

  update(physics, raceState, aiManager) {
    // 1. Speed display
    const rawSpeed = Math.abs(physics.speedKmh);
    const displaySpeed = (this.speedUnit === 'mph') ? Math.floor(rawSpeed * 0.621371) : Math.floor(rawSpeed);
    if (this.elSpeed) {
      this.elSpeed.innerText = displaySpeed;
    }

    // 2. Gear display
    if (this.elGear) {
      if (physics.currentGear === -1) {
        this.elGear.innerText = 'R';
        this.elGear.style.color = '#ff4444';
      } else if (rawSpeed < 1 && physics.rpm < 1200) {
        this.elGear.innerText = 'N';
        this.elGear.style.color = '#ffaa00';
      } else {
        this.elGear.innerText = physics.currentGear;
        this.elGear.style.color = '#00ffcc';
      }
    }

    // 3. Tachometer arc gauge
    if (this.elTachoFill) {
      const rpmRatio = Math.max(0, Math.min(1.0, (physics.rpm - 800) / (physics.redlineRpm - 800)));
      // Arc total length is 236
      const offset = 236 * (1.0 - rpmRatio);
      this.elTachoFill.style.strokeDashoffset = offset;
    }

    // 4. NOS meter
    if (this.elNosBar) {
      const nosPct = Math.max(0, Math.min(100, (physics.nosAmount / physics.nosCapacity) * 100));
      this.elNosBar.style.width = `${nosPct}%`;
      if (physics.isNosActive) {
        this.elNosBar.classList.add('active');
      } else {
        this.elNosBar.classList.remove('active');
      }
    }

    // 5. Drift Score Banner
    if (this.elDriftBadge) {
      if (physics.isDrifting && physics.driftScore > 30) {
        this.elDriftBadge.style.display = 'block';
        if (this.elDriftScore) this.elDriftScore.innerText = physics.driftScore;
        if (this.elDriftMult) this.elDriftMult.innerText = `x${physics.driftMultiplier}`;
      } else {
        this.elDriftBadge.style.display = 'none';
      }
    }

    // 6. Race Laps & Standings
    if (raceState) {
      if (this.elLapCurrent) this.elLapCurrent.innerText = `LAP ${raceState.currentLap} / ${raceState.totalLaps}`;
      if (this.elLapTime) this.elLapTime.innerText = this.formatTime(raceState.lapTime);
      if (this.elLapBest) this.elLapBest.innerText = this.formatTime(raceState.bestLapTime);

      if (this.elPosNum) {
        this.elPosNum.innerText = `${raceState.position}`;
      }
      if (this.elPosTotal && raceState.totalRacers) {
        this.elPosTotal.innerText = `/ ${raceState.totalRacers}`;
      }
    }

    // 7. Render Mini-Map
    this.renderMinimap(physics, aiManager);
  }

  renderMinimap(physics, aiManager) {
    if (!this.minimapCtx || !this.bounds) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Map coordinate projection helper
    const projectX = (worldX) => ((worldX - this.bounds.minX) / this.bounds.width) * (w - 24) + 12;
    const projectY = (worldZ) => ((worldZ - this.bounds.minZ) / this.bounds.height) * (h - 24) + 12;

    // Draw track circuit outline
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const samples = 120;
    for (let i = 0; i <= samples; i++) {
      const pt = this.track.curve.getPointAt(i / samples);
      const px = projectX(pt.x);
      const py = projectY(pt.z);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw Start/Finish line mark
    const startPt = this.track.curve.getPointAt(0);
    ctx.fillStyle = '#00ffcc';
    ctx.beginPath();
    ctx.arc(projectX(startPt.x), projectY(startPt.z), 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Draw AI Rival Car blips
    if (aiManager && aiManager.rivals) {
      aiManager.rivals.forEach(r => {
        ctx.fillStyle = '#' + r.color.toString(16).padStart(6, '0');
        ctx.beginPath();
        ctx.arc(projectX(r.position.x), projectY(r.position.z), 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw Player Car blip (glowing cyan triangle arrow)
    const playerPx = projectX(physics.position.x);
    const playerPy = projectY(physics.position.z);

    ctx.save();
    ctx.translate(playerPx, playerPy);

    // Player forward direction in 2D map space
    const forward = physics.forward;
    const heading = Math.atan2(forward.x, forward.z);
    ctx.rotate(heading);

    ctx.fillStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(-4, -4);
    ctx.lineTo(4, -4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  showToast(text) {
    if (!this.elToast) return;
    this.elToast.innerText = text;
    this.elToast.style.display = 'block';

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.elToast.style.display = 'none';
    }, 2500);
  }
}

window.HUDController = HUDController;

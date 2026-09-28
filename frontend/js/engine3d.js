/**
 * Technical CAD Cutaway & Engineering Thermal Heatmap for 4-Cylinder Aero Piston Engine
 */

class EngineSchematicVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.turboAngle = 0;
    this.selectedCylinder = null;

    this.cht = [90, 90, 90, 90];
    this.egt = [750, 750, 750, 750];
    this.mat = 25;
    this.map = 1013;
    this.oilTemp = 85;
    this.oilPress = 3.5;
    this.rpm = 2500;

    this.initInteraction();
    this.animate();
  }

  initInteraction() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

      const cyls = this.getCylinderPositions();
      for (let i = 0; i < cyls.length; i++) {
        const c = cyls[i];
        if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
          this.selectedCylinder = i + 1;
          const infoEl = document.getElementById('selected-cyl-info');
          if (infoEl) {
            infoEl.innerText = `CYLINDER #${i + 1} | CHT: ${this.cht[i].toFixed(1)}°C | EGT: ${this.egt[i].toFixed(0)}°C | SPARK: OK | INJECTOR: NOMINAL`;
          }
          return;
        }
      }
      this.selectedCylinder = null;
    });
  }

  updateData(sensorData, twinData) {
    if (sensorData) {
      this.cht = sensorData.cht_c || this.cht;
      this.egt = sensorData.egt_c || this.egt;
      this.mat = sensorData.mat_c || this.mat;
      this.map = sensorData.map_hpa || this.map;
      this.oilTemp = sensorData.oil_temp_c || this.oilTemp;
      this.oilPress = sensorData.oil_press_bar || this.oilPress;
      this.rpm = sensorData.engine_rpm || this.rpm;
    }
  }

  getCylinderPositions() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    return [
      { id: 1, x: cx - 230, y: cy - 95, w: 105, h: 80, name: 'CYLINDER 1 (L)' },
      { id: 2, x: cx + 125, y: cy - 95, w: 105, h: 80, name: 'CYLINDER 2 (R)' },
      { id: 3, x: cx - 230, y: cy + 35, w: 105, h: 80, name: 'CYLINDER 3 (L)' },
      { id: 4, x: cx + 125, y: cy + 35, w: 105, h: 80, name: 'CYLINDER 4 (R)' },
    ];
  }

  getThermalColor(temp, minT = 60, maxT = 140) {
    if (temp > 135) return '#fee2e2'; // Danger light red fill
    if (temp > 120) return '#fef3c7'; // Warning light amber fill
    return '#f0fdf4';                 // Normal light green fill
  }

  getThermalBorder(temp) {
    if (temp > 135) return '#b91c1c';
    if (temp > 120) return '#b45309';
    return '#15803d';
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // 1. Engineering Grid Background
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // 2. Central Crankcase & Reduction Gearbox CAD Housing
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 95, cy - 85, 190, 175, 4);
    ctx.fill();
    ctx.stroke();

    // Technical Crosshatch in Crankcase
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CRANKCASE & DRY SUMP', cx, cy - 60);

    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText(`OIL TEMP: ${this.oilTemp.toFixed(1)}°C`, cx, cy + 50);
    ctx.fillText(`OIL PRESS: ${this.oilPress.toFixed(2)} bar`, cx, cy + 65);

    // Center Rotating Crankshaft / Propeller Hub
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(`${this.rpm.toFixed(0)}`, cx, cy);
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('RPM', cx, cy + 14);

    // 3. Four Boxer Cylinders with Technical Callouts
    const cyls = this.getCylinderPositions();
    cyls.forEach((c, idx) => {
      const chtVal = this.cht[idx] || 90;
      const egtVal = this.egt[idx] || 750;
      const fillColor = this.getThermalColor(chtVal);
      const borderColor = this.getThermalBorder(chtVal);

      // Connecting Rod Mechanical Line
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx + (c.id % 2 === 1 ? -45 : 45), cy + (c.id <= 2 ? -35 : 35));
      ctx.lineTo(c.x + (c.id % 2 === 1 ? c.w : 0), c.y + c.h / 2);
      ctx.stroke();

      // Cylinder CAD Box
      ctx.save();
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = this.selectedCylinder === c.id ? '#1e40af' : borderColor;
      ctx.lineWidth = this.selectedCylinder === c.id ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.roundRect(c.x, c.y, c.w, c.h, 3);
      ctx.fill();
      ctx.stroke();

      // Cylinder Header Tag
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.name, c.x + c.w / 2, c.y + 18);

      // CHT Readout
      ctx.fillStyle = chtVal > 135 ? '#b91c1c' : (chtVal > 120 ? '#b45309' : '#15803d');
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.fillText(`CHT: ${chtVal.toFixed(1)}°C`, c.x + c.w / 2, c.y + 40);

      // EGT Exhaust Readout
      ctx.fillStyle = egtVal > 880 ? '#b91c1c' : '#334155';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.fillText(`EGT: ${egtVal.toFixed(0)}°C`, c.x + c.w / 2, c.y + 60);

      ctx.restore();
    });

    // 4. Top Turbocharger & Intercooler Unit
    const tcX = cx;
    const tcY = cy - 145;

    // Intercooler Heat Exchanger Box
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(tcX - 110, tcY - 20, 220, 32, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`CHARGE AIR COOLER (CAC) | MAT: ${this.mat.toFixed(1)}°C`, tcX, tcY + 2);

    // Turbocharger Spool
    ctx.save();
    ctx.translate(tcX, tcY + 36);
    ctx.rotate(this.turboAngle);

    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(10, 0);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillText(`TURBO BOOST: ${this.map.toFixed(0)} hPa`, tcX, tcY + 62);
  }

  animate() {
    this.turboAngle += (this.rpm / 5000) * 0.15;
    this.render();
    requestAnimationFrame(() => this.animate());
  }
}

window.EngineSchematicVisualizer = EngineSchematicVisualizer;

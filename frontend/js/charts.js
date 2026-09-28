/**
 * Precision Military-Standard Multi-Trace Telemetry & Residual Plot
 */

class LiveTwinChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.maxPoints = 80;
    this.liveHistory = [];
    this.twinHistory = [];
    this.channel = 'map';

    this.yMin = 400;
    this.yMax = 1800;
  }

  setChannel(channelName) {
    this.channel = channelName;
    this.liveHistory = [];
    this.twinHistory = [];
    if (channelName === 'map') {
      this.yMin = 400;
      this.yMax = 1800;
    } else if (channelName === 'rpm') {
      this.yMin = 1000;
      this.yMax = 6000;
    } else if (channelName === 'cht') {
      this.yMin = 60;
      this.yMax = 150;
    } else if (channelName === 'egt') {
      this.yMin = 600;
      this.yMax = 950;
    } else if (channelName === 'oil_temp') {
      this.yMin = 50;
      this.yMax = 140;
    }
  }

  addPoint(sensor, twin) {
    if (!sensor || !twin) return;

    let liveVal = 0;
    let twinVal = 0;

    if (this.channel === 'map') {
      liveVal = sensor.map_hpa;
      twinVal = twin.map_predicted_hpa;
    } else if (this.channel === 'rpm') {
      liveVal = sensor.engine_rpm;
      twinVal = sensor.engine_rpm;
    } else if (this.channel === 'cht') {
      liveVal = Math.max(...sensor.cht_c);
      twinVal = Math.max(...twin.cht_predicted_c);
    } else if (this.channel === 'egt') {
      liveVal = Math.max(...sensor.egt_c);
      twinVal = Math.max(...twin.egt_predicted_c);
    } else if (this.channel === 'oil_temp') {
      liveVal = sensor.oil_temp_c;
      twinVal = twin.oil_temp_predicted_c;
    }

    this.liveHistory.push(liveVal);
    this.twinHistory.push(twinVal);

    if (this.liveHistory.length > this.maxPoints) {
      this.liveHistory.shift();
      this.twinHistory.shift();
    }

    this.render();
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clean White Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Subtle Grid Lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = (h / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (this.liveHistory.length < 2) return;

    const valToY = (v) => {
      const frac = (v - this.yMin) / (this.yMax - this.yMin);
      return h - frac * h;
    };

    const stepX = w / (this.maxPoints - 1);

    // 1. Digital Twin Physics Prediction (Navy Dashed Line)
    ctx.beginPath();
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    for (let i = 0; i < this.twinHistory.length; i++) {
      const x = i * stepX;
      const y = valToY(this.twinHistory[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Live Ingested Sensor (Tactical Dark Green Solid Line)
    ctx.beginPath();
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < this.liveHistory.length; i++) {
      const x = i * stepX;
      const y = valToY(this.liveHistory[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Readout Text
    const latestLive = this.liveHistory[this.liveHistory.length - 1];
    const latestTwin = this.twinHistory[this.twinHistory.length - 1];
    const residual = latestLive - latestTwin;

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`SENSOR: ${latestLive.toFixed(1)} | TWIN: ${latestTwin.toFixed(1)} | RESIDUAL: ${residual >= 0 ? '+' : ''}${residual.toFixed(1)}`, w - 8, 14);
  }
}

window.LiveTwinChart = LiveTwinChart;

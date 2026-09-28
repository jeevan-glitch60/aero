/**
 * Precision Military-Grade Aviation Gauges with High-Contrast White/Light Face & Damped Needle
 */

class AviationRadialGauge {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.min = options.min || 0;
    this.max = options.max || 100;
    this.cautionMin = options.cautionMin || null;
    this.cautionMax = options.cautionMax || null;
    this.alarmMax = options.alarmMax || null;
    this.alarmMin = options.alarmMin || null;
    this.unit = options.unit || '';
    this.decimals = options.decimals || 0;

    this.currentValue = this.min;
    this.targetValue = this.min;
    this.startAngle = 0.75 * Math.PI;
    this.endAngle = 2.25 * Math.PI;

    this.render();
  }

  setValue(val) {
    this.targetValue = Math.max(this.min, Math.min(this.max, val));
    this.currentValue += (this.targetValue - this.currentValue) * 0.3;
    this.render();
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 10;

    ctx.clearRect(0, 0, w, h);

    // 1. Dial Face (Crisp Light Background)
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. Base Scale Arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 4, this.startAngle, this.endAngle);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 6;
    ctx.stroke();

    const valToAngle = (v) => {
      const frac = (v - this.min) / (this.max - this.min);
      return this.startAngle + frac * (this.endAngle - this.startAngle);
    };

    // Green Normal Range Arc
    const normStart = this.cautionMin !== null ? this.cautionMin : this.min;
    const normEnd = this.cautionMax !== null ? this.cautionMax : this.max;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 4, valToAngle(normStart), valToAngle(normEnd));
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Amber Caution Range Arc
    if (this.cautionMax !== null && this.alarmMax !== null) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 4, valToAngle(this.cautionMax), valToAngle(this.alarmMax));
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    // Red Danger/Exceedance Arc
    if (this.alarmMax !== null) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 4, valToAngle(this.alarmMax), this.endAngle);
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    // 3. Technical Tick Marks
    const totalTicks = 10;
    for (let i = 0; i <= totalTicks; i++) {
      const angle = this.startAngle + (i / totalTicks) * (this.endAngle - this.startAngle);
      const isMajor = i % 2 === 0;
      const tickLen = isMajor ? 8 : 4;
      const rInner = radius - 10 - tickLen;
      const rOuter = radius - 10;

      ctx.beginPath();
      ctx.moveTo(cx + rInner * Math.cos(angle), cy + rInner * Math.sin(angle));
      ctx.lineTo(cx + rOuter * Math.cos(angle), cy + rOuter * Math.sin(angle));
      ctx.strokeStyle = isMajor ? '#0f172a' : '#64748b';
      ctx.lineWidth = isMajor ? 1.5 : 1;
      ctx.stroke();
    }

    // 4. Sharp High-Precision Needle
    const currAngle = valToAngle(this.currentValue);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(currAngle);

    // Counterbalance
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(-10, 2);
    ctx.lineTo(radius - 16, 0);
    ctx.closePath();
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Center pivot tip
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(radius - 14, 0);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.fillStyle = '#b91c1c'; // Red needle tip
    ctx.fill();

    ctx.restore();

    // Center Hub Nut
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#334155';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

window.AviationRadialGauge = AviationRadialGauge;

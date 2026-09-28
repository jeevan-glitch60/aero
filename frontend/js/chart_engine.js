/**
 * Defense-Grade Multi-Trace Canvas Chart Engine
 * Features: High-DPI rendering, Dual-Y axes, tolerance bands (left & right),
 * confidence intervals, differential baseline/scenario fills, mouse-wheel zoom, pan,
 * hover crosshairs, and instant PNG / CSV export.
 */

class AeroTwinChart {
  constructor(canvasId, options = {}) {
    this.canvas = typeof canvasId === 'string' ? document.getElementById(canvasId) : canvasId;
    if (!this.canvas) {
      console.warn(`AeroTwinChart: Canvas '${canvasId}' not found.`);
      return;
    }
    this.ctx = this.canvas.getContext('2d');
    this.options = Object.assign({
      title: '',
      xLabel: 'Time',
      yLeftLabel: '',
      yRightLabel: '',
      leftUnit: '',
      rightUnit: '',
      leftMin: null,
      leftMax: null,
      rightMin: null,
      rightMax: null,
      toleranceBands: [],       // [{ min, max, color, axis: 'left'|'right' }]
      confidenceBand: null,      // { upperSeries, lowerSeries, color }
      diffFill: null,            // { seriesA, seriesB, color }
      padding: { top: 20, right: 48, bottom: 24, left: 48 },
      maxPoints: 120,
      showGrid: true,
      timeFormat: 'time',
    }, options);

    this.series = []; // Array of { id, label, color, axis: 'left'|'right', dashed: false, lineWidth: 1.8 }
    this.data = [];   // Array of data records: { timestamp, [seriesId]: value }

    this.zoomLevel = 1.0;
    this.panOffset = 0;
    this.hoverIndex = null;
    this.hoverX = null;
    this.hoverY = null;
    this.isDragging = false;
    this.dragStartX = 0;

    this.width = 480;
    this.height = 160;

    this.initEvents();
    this.resize();
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const parent = this.canvas.parentElement;
    const parentRect = parent ? parent.getBoundingClientRect() : null;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    let w = (parentRect && parentRect.width > 20) ? parentRect.width : (rect.width > 20 ? rect.width : (this.width || 480));
    let h = (parentRect && parentRect.height > 20) ? parentRect.height : (rect.height > 20 ? rect.height : (this.height || 160));

    if (w < 40) w = 480;
    if (h < 30) h = 160;

    this.width = Math.floor(w);
    this.height = Math.floor(h);

    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  addSeries(seriesConfig) {
    this.series.push(Object.assign({
      axis: 'left',
      dashed: false,
      lineWidth: 1.8,
      visible: true,
    }, seriesConfig));
  }

  setData(dataArray) {
    this.data = dataArray || [];
    this.render();
  }

  addPoint(point) {
    this.data.push(point);
    if (this.data.length > this.options.maxPoints) {
      this.data.shift();
    }
    this.render();
  }

  clear() {
    this.data = [];
    this.render();
  }

  zoomIn() {
    this.zoomLevel = Math.min(6.0, this.zoomLevel * 1.25);
    this.render();
  }

  zoomOut() {
    this.zoomLevel = Math.max(1.0, this.zoomLevel / 1.25);
    if (this.zoomLevel <= 1.0) this.panOffset = 0;
    this.render();
  }

  resetZoom() {
    this.zoomLevel = 1.0;
    this.panOffset = 0;
    this.render();
  }

  initEvents() {
    if (!this.canvas) return;

    // Mouse wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    }, { passive: false });

    // Drag to pan
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.zoomLevel > 1.0) {
        this.isDragging = true;
        this.dragStartX = e.clientX;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        this.dragStartX = e.clientX;
        const visibleCount = Math.floor(this.data.length / this.zoomLevel);
        const shift = Math.round((dx / this.width) * visibleCount);
        this.panOffset = Math.max(0, Math.min(this.data.length - visibleCount, this.panOffset - shift));
        this.render();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Hover crosshair & tooltip
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.hoverX = x;
      this.hoverY = y;

      const p = this.options.padding;
      const plotW = this.width - p.left - p.right;
      if (x >= p.left && x <= this.width - p.right && this.data.length > 0) {
        const visibleSlice = this.getVisibleData();
        const relX = (x - p.left) / plotW;
        const idx = Math.min(visibleSlice.length - 1, Math.max(0, Math.round(relX * (visibleSlice.length - 1))));
        this.hoverIndex = idx;
      } else {
        this.hoverIndex = null;
      }
      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverIndex = null;
      this.hoverX = null;
      this.hoverY = null;
      this.render();
    });

    // ResizeObserver on parent container
    if (window.ResizeObserver && this.canvas.parentElement) {
      new ResizeObserver(() => {
        if (this.canvas.parentElement.offsetWidth > 0 && this.canvas.parentElement.offsetHeight > 0) {
          this.resize();
        }
      }).observe(this.canvas.parentElement);
    }
  }

  getVisibleData() {
    if (this.data.length === 0) return [];
    if (this.zoomLevel <= 1.0) return this.data;

    const visibleCount = Math.max(4, Math.floor(this.data.length / this.zoomLevel));
    const start = Math.max(0, Math.min(this.data.length - visibleCount, this.panOffset));
    return this.data.slice(start, start + visibleCount);
  }

  computeScale(visibleData, axis = 'left') {
    const relevantSeries = this.series.filter(s => (s.axis || 'left') === axis && s.visible !== false);
    const optMin = axis === 'left' ? this.options.leftMin : this.options.rightMin;
    const optMax = axis === 'left' ? this.options.leftMax : this.options.rightMax;

    if (relevantSeries.length === 0) {
      return {
        min: optMin !== null ? optMin : 0,
        max: optMax !== null ? optMax : 100,
      };
    }

    let minVal = Infinity;
    let maxVal = -Infinity;

    visibleData.forEach(d => {
      relevantSeries.forEach(s => {
        const val = d[s.id];
        if (typeof val === 'number' && !isNaN(val)) {
          if (val < minVal) minVal = val;
          if (val > maxVal) maxVal = val;
        }
      });
    });

    if (minVal === Infinity || maxVal === -Infinity) {
      minVal = optMin !== null ? optMin : 0;
      maxVal = optMax !== null ? optMax : 100;
    }

    if (optMin !== null && optMin !== undefined) minVal = Math.min(minVal, optMin);
    if (optMax !== null && optMax !== undefined) maxVal = Math.max(maxVal, optMax);

    if (minVal === maxVal) {
      minVal -= 5;
      maxVal += 5;
    } else {
      const pad = (maxVal - minVal) * 0.05;
      minVal -= pad;
      maxVal += pad;
    }

    return { min: minVal, max: maxVal };
  }

  render() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const p = this.options.padding;
    const plotW = w - p.left - p.right;
    const plotH = h - p.top - p.bottom;

    ctx.clearRect(0, 0, w, h);

    if (plotW <= 0 || plotH <= 0) return;

    const visibleData = this.getVisibleData();
    const hasRightAxis = this.series.some(s => s.axis === 'right' && s.visible !== false);
    const leftScale = this.computeScale(visibleData, 'left');
    const rightScale = hasRightAxis ? this.computeScale(visibleData, 'right') : null;

    // 1. Background Grid & Separators (5 horizontal lines)
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = p.top + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(p.left, y);
      ctx.lineTo(w - p.right, y);
      ctx.stroke();

      // Left axis label
      const valLeft = leftScale.max - (leftScale.max - leftScale.min) * (i / 4);
      ctx.fillStyle = '#475569';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.abs(valLeft) >= 1000 ? Math.round(valLeft).toString() : valLeft.toFixed(1), p.left - 6, y);

      // Right axis label (if present)
      if (rightScale) {
        const valRight = rightScale.max - (rightScale.max - rightScale.min) * (i / 4);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0284c7';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillText(Math.abs(valRight) >= 1000 ? Math.round(valRight).toString() : valRight.toFixed(1), w - p.right + 6, y);
      }
    }

    // 2. Tolerance Shaded Bands (Properly mapping to left or right scale)
    if (this.options.toleranceBands && this.options.toleranceBands.length > 0) {
      this.options.toleranceBands.forEach(band => {
        const scale = (band.axis === 'right' && rightScale) ? rightScale : leftScale;
        const range = scale.max - scale.min;
        if (range <= 0) return;

        const yTop = Math.max(p.top, p.top + plotH * (1 - (band.max - scale.min) / range));
        const yBottom = Math.min(p.top + plotH, p.top + plotH * (1 - (band.min - scale.min) / range));
        if (yBottom > yTop) {
          ctx.fillStyle = band.color;
          ctx.fillRect(p.left, yTop, plotW, yBottom - yTop);
        }
      });
    }

    // If no data points
    if (visibleData.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NO TELEMETRY BUFFER AVAILABLE', p.left + plotW / 2, p.top + plotH / 2);
      return;
    }

    const n = visibleData.length;
    const getX = (idx) => n > 1 ? (p.left + (idx / (n - 1)) * plotW) : (p.left + plotW / 2);
    const getY = (val, axis = 'left') => {
      const scale = (axis === 'right' && rightScale) ? rightScale : leftScale;
      const range = scale.max - scale.min;
      if (range <= 0) return p.top + plotH / 2;
      const ratio = (val - scale.min) / range;
      return p.top + plotH * (1 - Math.max(0, Math.min(1, ratio)));
    };

    // 3. Confidence Band (Upper/Lower Ribbon)
    if (this.options.confidenceBand && n >= 2) {
      const { upperSeries, lowerSeries, color } = this.options.confidenceBand;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const val = visibleData[i][upperSeries];
        if (typeof val === 'number') {
          const x = getX(i);
          const y = getY(val, 'left');
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      for (let i = n - 1; i >= 0; i--) {
        const val = visibleData[i][lowerSeries];
        if (typeof val === 'number') {
          const x = getX(i);
          const y = getY(val, 'left');
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fillStyle = color || 'rgba(6, 182, 212, 0.15)';
      ctx.fill();
    }

    // 4. Differential Fill (Baseline vs Scenario)
    if (this.options.diffFill && n >= 2) {
      const { seriesA, seriesB, color } = this.options.diffFill;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const val = visibleData[i][seriesA];
        if (typeof val === 'number') {
          const x = getX(i);
          const y = getY(val, 'left');
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      for (let i = n - 1; i >= 0; i--) {
        const val = visibleData[i][seriesB];
        if (typeof val === 'number') {
          const x = getX(i);
          const y = getY(val, 'left');
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fillStyle = color || 'rgba(245, 158, 11, 0.22)';
      ctx.fill();
    }

    // 5. Draw Traces
    this.series.forEach(s => {
      if (s.visible === false) return;
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lineWidth || 1.8;
      if (s.dashed) {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) {
        const val = visibleData[i][s.id];
        if (typeof val === 'number' && !isNaN(val)) {
          const x = getX(i);
          const y = getY(val, s.axis || 'left');
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
      ctx.restore();
    });

    // 6. X-Axis Time Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tickCount = Math.min(5, n);
    for (let k = 0; k < tickCount; k++) {
      const idx = Math.floor((k / (tickCount - 1)) * (n - 1));
      const pt = visibleData[idx];
      if (!pt) continue;
      const x = getX(idx);
      let label = '';
      if (pt.timestamp_str) {
        label = pt.timestamp_str;
      } else if (typeof pt.time === 'number') {
        label = `T+${pt.time.toFixed(0)}s`;
      } else if (typeof pt.timestamp === 'number') {
        label = `${pt.timestamp.toFixed(1)}s`;
      }
      ctx.fillText(label, x, p.top + plotH + 5);
    }

    // 7. Hover Crosshairs & Synchronized Multi-Value Tooltip
    if (this.hoverIndex !== null && this.hoverIndex >= 0 && this.hoverIndex < n) {
      const pt = visibleData[this.hoverIndex];
      const hoverX = getX(this.hoverIndex);

      // Vertical line
      ctx.strokeStyle = 'rgba(2, 132, 199, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoverX, p.top);
      ctx.lineTo(hoverX, p.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Data dots on crosshair
      this.series.forEach(s => {
        if (s.visible === false) return;
        const val = pt[s.id];
        if (typeof val === 'number' && !isNaN(val)) {
          const y = getY(val, s.axis || 'left');
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(hoverX, y, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      this.drawTooltip(ctx, pt, hoverX, this.hoverY || (p.top + plotH / 2));
    }
  }

  drawTooltip(ctx, pt, x, y) {
    const lines = [];
    const timeStr = pt.timestamp_str || (pt.time !== undefined ? `T+${pt.time}s` : (pt.timestamp !== undefined ? `${pt.timestamp}s` : ''));
    if (timeStr) lines.push({ label: 'Time', value: timeStr, color: '#334155' });

    this.series.forEach(s => {
      if (s.visible === false) return;
      const val = pt[s.id];
      if (typeof val === 'number') {
        const unit = (s.axis === 'right' ? this.options.rightUnit : this.options.leftUnit) || '';
        lines.push({
          label: s.label || s.id,
          value: `${val.toFixed(1)}${unit ? ' ' + unit : ''}`,
          color: s.color,
        });
      }
    });

    if (lines.length === 0) return;

    ctx.font = '600 10px "JetBrains Mono", monospace';
    let maxTextW = 0;
    lines.forEach(l => {
      const text = `${l.label}: ${l.value}`;
      const w = ctx.measureText(text).width;
      if (w > maxTextW) maxTextW = w;
    });

    const boxW = maxTextW + 24;
    const boxH = lines.length * 15 + 12;
    let boxX = x + 12;
    let boxY = y - boxH / 2;

    if (boxX + boxW > this.width - 10) boxX = x - boxW - 12;
    if (boxY < 6) boxY = 6;
    if (boxY + boxH > this.height - 6) boxY = this.height - boxH - 6;

    // Draw Crisp White Card Box with Blue Border
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 4);
    else ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    lines.forEach((l, idx) => {
      const lineY = boxY + 14 + idx * 15;
      ctx.fillStyle = l.color;
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${l.label}:`, boxX + 8, lineY);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`${l.value}`, boxX + 68, lineY);
    });
  }

  exportPNG(filename = 'chart_export.png') {
    if (!this.canvas) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  exportCSV(filename = 'chart_telemetry.csv') {
    if (!this.data || this.data.length === 0) return;
    const headers = ['timestamp', ...this.series.map(s => s.id)];
    const rows = [headers.join(',')];

    this.data.forEach(row => {
      const line = [
        row.timestamp || row.time || '',
        ...this.series.map(s => row[s.id] !== undefined ? row[s.id] : '')
      ];
      rows.push(line.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

window.AeroTwinChart = AeroTwinChart;

/**
 * ============================================================================
 * AEROTWIN // MULTI-ENGINE 3D DIGITAL TWIN LAB VIEW CONTROLLER
 * ============================================================================
 * Coordinates the Three.js multi-engine viewport, OrbitControls, 4-architecture
 * hot-swapping, dynamic telemetry card generation, architecture-specific
 * fault sliders, raycasting inspection, 4 one-click demo scenarios, exploded view,
 * and the multi-engine mission comparison laboratory.
 *
 * Supported Architectures:
 * 1. Four-Stroke Heavy-Fuel Compression-Ignition Engine
 * 2. Horizontally Opposed / Boxer Reciprocating-Piston Engine
 * 3. Wankel Rotary Internal-Combustion Engine (with comparison note)
 * 4. Turbocharged / Supercharged Multi-Cylinder Inline or V Engine
 */

class Engine3DView {
  constructor(app) {
    this.app = app;
    this.sim = new Engine3DSimulator();
    this.model = null;

    // Three.js Core
    this.container = null;
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.animFrameId = null;
    this.lastTime = 0;
    this.clock = null;

    // Interaction Raycasting
    this.raycaster = null;
    this.mouse = new THREE.Vector2();
    this.hoveredMesh = null;
    this.selectedComponent = null;

    // View Modes
    this.isExploded = false;
    this.explodedFactor = 0.0;
    this.targetExplodedFactor = 0.0;

    // Mini Chart
    this.chartCanvas = null;
    this.chartCtx = null;

    // Demo Sequence Tracker
    this.demoTimeouts = [];

    // State
    this.initialized = false;
    this.currentEngineType = 'BOXER';
  }

  init() {
    if (this.initialized) return;

    this.container = document.getElementById('engine3d-viewport-container');
    if (!this.container) return;

    try {
      // 1. Setup Three.js Scene, Camera, Renderer
      this.initThree();

      if (!this.scene || !this.renderer) {
        throw new Error('Three.js initialization failed');
      }

      // 2. Setup Multi-Engine 3D Model Coordinator
      this.model = new Engine3DModel(this.scene, this.currentEngineType);

      // 3. Connect Simulator Data Subscription
      this.sim.subscribe((packet) => this.onTelemetryPacket(packet));

      // 4. Setup Architecture Selector Cards
      this.initArchitectureSelector();

      // 5. Setup Viewport Controls & HUD
      this.initHUDControls();

      // 6. Setup Interactive Raycasting (Hover & Click)
      this.initRaycasting();

      // 7. Setup Simulation Drawer & Dynamic Sliders
      this.initDrawerControls();
      this.initFaultPresets();

      // 8. Setup Rolling Mini Chart
      this.initMiniChart();

      // 9. Setup Multi-Engine Mission Comparison Modal
      this.initComparisonModal();

      // 10. Render initial dynamic UI layout
      this.renderDynamicTelemetryLayout(this.currentEngineType);
      this.renderDynamicFaultSliders(this.currentEngineType);
      this.updateHowItWorksPanel(this.currentEngineType);
      this.syncDrawerInputsFromSim();

      // 11. Auto-start simulation in nominal loiter mode
      this.sim.start();

      this.initialized = true;
    } catch (err) {
      console.error('Engine3DView initialization failed:', err);
      this.initialized = false;
      this.container.innerHTML = `
        <div class="webgl-fallback-card">
          <div style="font-size:20px; color:var(--color-critical); margin-bottom:8px;">⚠️ 3D ENGINE SIMULATION ERROR</div>
          <p style="font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); line-height: 1.5;">${err.message || 'Failed to initialize 3D engine.'}</p>
          <button onclick="window.engine3DView?.retryInit()" style="margin-top:10px; padding:6px 16px; background:var(--color-info); color:#fff; border:none; border-radius:4px; cursor:pointer; font-family:var(--font-mono); font-size:11px;">🔄 Retry</button>
        </div>`;
    }
  }

  retryInit() {
    this.initialized = false;
    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.controls = null;
    this.model = null;
    this.canvas = null;
    this.animFrameId = null;
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.init();
    this.onActivate();
  }

  // ==========================================================================
  // 1. THREE.JS INITIALIZATION
  // ==========================================================================

  initThree() {
    if (typeof THREE === 'undefined') {
      this.container.innerHTML = `
        <div class="webgl-fallback-card">
          <div style="font-size:24px; color:var(--color-critical); margin-bottom:8px;">⚠️ THREE.JS NOT LOADED</div>
          <p>3D rendering library failed to load. Please refresh the page.</p>
        </div>`;
      return;
    }

    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) throw new Error('WebGL not supported');
    } catch (e) {
      this.container.innerHTML = `
        <div class="webgl-fallback-card">
          <div style="font-size:24px; color:var(--color-critical); margin-bottom:8px;">⚠️ WEBGL ACCELERATION UNAVAILABLE</div>
          <p>Your browser does not support hardware-accelerated 3D WebGL rendering.</p>
        </div>`;
      return;
    }

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 520;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x08101a); // Deep aerospace cockpit dark

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(3.8, 2.5, 4.5);

    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.30;

    this.canvas = this.renderer.domElement;
    this.canvas.id = 'engine3d-canvas';
    this.container.appendChild(this.canvas);

    // ── Permanent synthetic-data watermark (mandatory) ───────────────────────
    const wm = document.createElement('div');
    wm.id = 'engine3d-synth-watermark';
    wm.style.cssText = [
      'position:absolute',
      'bottom:8px',
      'left:50%',
      'transform:translateX(-50%)',
      'font-family:monospace',
      'font-size:9px',
      'letter-spacing:0.06em',
      'color:rgba(148,163,184,0.55)',
      'white-space:nowrap',
      'pointer-events:none',
      'user-select:none',
      'z-index:10',
      'text-align:center',
    ].join(';');
    wm.innerText = 'SYNTHETIC ENGINE CUTAWAY — DIGITAL-TWIN VISUALIZATION — NOT CERTIFIED CAD OR FLIGHT SOFTWARE';
    // container must be position:relative for absolute child to work
    this.container.style.position = 'relative';
    this.container.appendChild(wm);

    if (window.THREE && window.THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.minDistance = 1.5;
      this.controls.maxDistance = 14.0;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
      this.controls.target.set(0, 0, 0.2);
    }

    // 1. Studio Lighting System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.40);
    this.scene.add(ambientLight);

    // Realistic sky/ground bounce hemisphere light
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.55);
    this.scene.add(hemiLight);

    // Primary warm-white key light
    const keyLight = new THREE.DirectionalLight(0xfffaed, 0.95);
    keyLight.position.set(6, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    this.scene.add(keyLight);

    // Aerospace cyan fill light
    const fillLight = new THREE.DirectionalLight(0x0284c7, 0.55);
    fillLight.position.set(-6, 2, -4);
    this.scene.add(fillLight);

    // High-contrast violet/blue rim light
    const rimLight = new THREE.DirectionalLight(0x818cf8, 0.45);
    rimLight.position.set(0, 6, -7);
    this.scene.add(rimLight);

    // Under-engine inspection spot (highlights internals in X-ray mode)
    const underSpot = new THREE.SpotLight(0x0ea5e9, 0.6, 8, Math.PI / 4, 0.3);
    underSpot.position.set(0, -2.5, 0);
    underSpot.target.position.set(0, 0, 0);
    this.scene.add(underSpot);
    this.scene.add(underSpot.target);

    // 2. Defense Grid & Tactical Aerospace Coordinate Rings
    const grid = new THREE.GridHelper(12, 24, 0x0284c7, 0x1e293b);
    grid.position.y = -1.2;
    this.scene.add(grid);

    // Concentric Range Rings on floor
    const ringGroup = new THREE.Group();
    ringGroup.position.y = -1.19;
    const ringRadii = [1.8, 3.2, 4.6];
    ringRadii.forEach((r, idx) => {
      const ringGeo = new THREE.RingGeometry(r - 0.015, r + 0.015, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 1 ? 0x0284c7 : 0x1e293b,
        transparent: true,
        opacity: idx === 1 ? 0.45 : 0.25,
        side: THREE.DoubleSide
      });
      ringGroup.add(new THREE.Mesh(ringGeo, ringMat));
    });

    // Radial Compass Ticks
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg * Math.PI) / 180;
      const tickGeo = new THREE.BoxGeometry(0.04, 0.01, 0.35);
      const tickMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.35 });
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.set(Math.cos(rad) * 3.2, 0, Math.sin(rad) * 3.2);
      tick.rotation.y = -rad;
      ringGroup.add(tick);
    }
    this.scene.add(ringGroup);

    this.raycaster = new THREE.Raycaster();
    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  onActivate() {
    this.init();
    this.onResize();

    if (!this.animFrameId && this.initialized) {
      this.lastTime = performance.now();
      this.animate();
    }
    if (this.sim && this.sim.status === 'STOPPED') {
      this.sim.start();
    }
  }

  onDeactivate() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.clearDemoTimeouts();
  }

  animate() {
    this.animFrameId = requestAnimationFrame(() => this.animate());
    const delta = this.clock ? this.clock.getDelta() : 0.016;

    if (this.controls) {
      this.controls.update();
    }

    // Smooth Exploded View transition
    if (Math.abs(this.explodedFactor - this.targetExplodedFactor) > 0.005) {
      this.explodedFactor += (this.targetExplodedFactor - this.explodedFactor) * 0.12;
      if (this.model && this.model.setExplodedView) {
        this.model.setExplodedView(this.explodedFactor);
      }
    }

    if (this.model && this.sim) {
      this.model.update(this.sim.getTelemetryPacket(), delta);
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // ==========================================================================
  // 2. ENGINE ARCHITECTURE SELECTOR
  // ==========================================================================

  initArchitectureSelector() {
    // Select via Card Click or Select Button
    document.querySelectorAll('.engine-arch-card, .btn-select-arch').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const archId = el.getAttribute('data-engine');
        if (archId) {
          this.switchEngine(archId);
        }
      });
    });
  }

  switchEngine(engineType) {
    if (this.currentEngineType === engineType) return;

    // Show loading overlay
    const overlay = document.getElementById('engine3d-loading-overlay');
    const loadText = document.getElementById('engine3d-loading-text');
    const cfg = window.ENGINE_ARCHITECTURES && window.ENGINE_ARCHITECTURES[engineType];

    if (overlay) {
      overlay.style.display = 'flex';
      if (loadText) {
        loadText.innerText = `INITIALIZING: ${cfg ? cfg.displayName.toUpperCase() : engineType}`;
      }
    }

    // Highlight active card
    document.querySelectorAll('.engine-arch-card').forEach(card => {
      if (card.getAttribute('data-engine') === engineType) {
        card.classList.add('active');
        const btn = card.querySelector('.btn-select-arch');
        if (btn) btn.innerText = 'ACTIVE TWIN';
      } else {
        card.classList.remove('active');
        const btn = card.querySelector('.btn-select-arch');
        if (btn) btn.innerText = 'SELECT ENGINE';
      }
    });

    // Close any open inspection card
    this.closeInspection();

    setTimeout(() => {
      try {
        this.currentEngineType = engineType;

        // 1. Hot-swap Three.js 3D Model
        if (this.model) {
          try {
            this.model.switchEngine(engineType);
          } catch (modelErr) {
            console.error('Error switching 3D engine model:', modelErr);
          }
        }

        // 2. Switch Simulator Physics & Telemetry Engine
        if (this.sim) {
          this.sim.switchEngineArchitecture(engineType);
        }

        // 3. Update Header Subtitle and Badge
        const sub = document.getElementById('sim-active-engine-sub');
        const badge = document.getElementById('sim-engine-model-badge');
        if (sub && cfg) {
          sub.innerText = `${cfg.displayName.toUpperCase()} // ${cfg.categoryBadge} // SYNTHETIC PROGNOSTICS`;
        }
        if (badge && cfg) {
          badge.innerText = cfg.shortName.toUpperCase();
        }

        // 4. Update How It Works Panel
        this.updateHowItWorksPanel(engineType);

        // 5. Rebuild Dynamic Telemetry Cards in Column 1
        this.renderDynamicTelemetryLayout(engineType);

        // 6. Rebuild Fault Injection Sliders in Drawer
        this.renderDynamicFaultSliders(engineType);

        // 7. Reset Camera smoothly
        this.resetCamera();
      } catch (err) {
        console.error('Error during engine switch:', err);
      } finally {
        // Hide loading overlay
        if (overlay) overlay.style.display = 'none';
      }
    }, 320);
  }

  updateHowItWorksPanel(engineType) {
    const cfg = window.ENGINE_ARCHITECTURES && window.ENGINE_ARCHITECTURES[engineType];
    if (!cfg) return;

    const titleEl = document.getElementById('how-engine-title');
    const bulletsEl = document.getElementById('how-bullets-principles');
    const focusEl = document.getElementById('how-text-focus');
    const missionEl = document.getElementById('how-text-mission');

    if (titleEl) titleEl.innerText = `${cfg.displayName.toUpperCase()} — PROPULSION DIGEST`;
    if (bulletsEl) {
      bulletsEl.innerHTML = cfg.strengths.map(s => `<li>${s}</li>`).join('');
    }
    if (focusEl) focusEl.innerText = cfg.monitoringFocus;
    if (missionEl) missionEl.innerText = cfg.relevantMission;
  }

  // ==========================================================================
  // 3. DYNAMIC TELEMETRY CARDS RENDERING
  // ==========================================================================

  renderDynamicTelemetryLayout(engineType) {
    const cfg = window.ENGINE_ARCHITECTURES && window.ENGINE_ARCHITECTURES[engineType];
    if (!cfg) return;

    const cardsContainer = document.getElementById('sim-dynamic-cards-grid');
    if (!cardsContainer) return;

    // Clear and rebuild cards tailored to this engine's telemetry profile
    cardsContainer.innerHTML = cfg.telemetryProfile.map(item => `
      <div class="metric-card status-nominal" id="sim-card-${item.key}">
        <div class="metric-header"><span>${item.label}</span></div>
        <div class="metric-value-wrap">
          <span class="metric-val" id="sim-card-val-${item.key}">--</span>
          <span class="metric-unit">${item.unit}</span>
        </div>
      </div>
    `).join('');

    // Update Telemetry Header Badge
    const archBadge = document.getElementById('telemetry-arch-badge');
    if (archBadge) archBadge.innerText = `10 Hz EKF // ${cfg.shortName.toUpperCase()}`;

    // Rebuild Balance Card (4-Cylinder vs 3-Zone Rotor Chamber)
    const balanceTitle = document.getElementById('sim-balance-title');
    const balanceList = document.getElementById('sim-balance-list');

    if (engineType === 'WANKEL_ROTARY') {
      if (balanceTitle) balanceTitle.innerHTML = `<span>🔺</span> ROTOR HOUSING SECTOR THERMAL BALANCE`;
      if (balanceList) {
        balanceList.innerHTML = `
          <div class="sim-cyl-row">
            <span class="sim-cyl-name">CHAMBER A [INTAKE]</span>
            <div class="sim-cyl-track"><div class="sim-cyl-fill" id="sim-chamber-bar-A" style="width: 95%; background: #38bdf8;"></div></div>
            <span class="sim-cyl-val font-mono" id="sim-chamber-val-A">72°C / Nominal</span>
          </div>
          <div class="sim-cyl-row">
            <span class="sim-cyl-name">CHAMBER B [COMBUSTION]</span>
            <div class="sim-cyl-track"><div class="sim-cyl-fill" id="sim-chamber-bar-B" style="width: 88%; background: #f59e0b;"></div></div>
            <span class="sim-cyl-val font-mono" id="sim-chamber-val-B">142°C / Hot Arc</span>
          </div>
          <div class="sim-cyl-row">
            <span class="sim-cyl-name">CHAMBER C [EXHAUST]</span>
            <div class="sim-cyl-track"><div class="sim-cyl-fill" id="sim-chamber-bar-C" style="width: 92%; background: #64748b;"></div></div>
            <span class="sim-cyl-val font-mono" id="sim-chamber-val-C">118°C / Port Discharge</span>
          </div>
        `;
      }
    } else {
      if (balanceTitle) balanceTitle.innerHTML = `<span>📊</span> 4-CYLINDER THERMAL BALANCE`;
      if (balanceList) {
        const labels = engineType === 'BOXER' ? ['CYL 1 [L]', 'CYL 2 [R]', 'CYL 3 [L]', 'CYL 4 [R]'] : ['CYLINDER 1', 'CYLINDER 2', 'CYLINDER 3', 'CYLINDER 4'];
        balanceList.innerHTML = labels.map((name, i) => `
          <div class="sim-cyl-row">
            <span class="sim-cyl-name">${name}</span>
            <div class="sim-cyl-track"><div class="sim-cyl-fill" id="sim-cyl-bar-${i + 1}" style="width: 92%;"></div></div>
            <span class="sim-cyl-val font-mono" id="sim-cyl-val-${i + 1}">--°C / --°C</span>
          </div>
        `).join('');
      }
    }
  }

  renderDynamicFaultSliders(engineType) {
    const cfg = window.ENGINE_ARCHITECTURES && window.ENGINE_ARCHITECTURES[engineType];
    if (!cfg || !cfg.supportedFaults) return;

    const slidersGrid = document.querySelector('.drawer-sliders-grid');
    if (!slidersGrid) return;

    slidersGrid.innerHTML = cfg.supportedFaults.map(f => `
      <div class="fault-slider-card">
        <div class="fault-slider-header">
          <span>${f.name}</span>
          <span class="font-mono" id="sim-val-${f.id}">0%</span>
        </div>
        <input type="range" class="mil-slider fault-slider" id="sim-slider-${f.id}" min="0" max="100" value="0">
      </div>
    `).join('');

    // Re-bind input events
    cfg.supportedFaults.forEach(f => {
      const slider = document.getElementById(`sim-slider-${f.id}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value) / 100.0;
          const label = document.getElementById(`sim-val-${f.id}`);
          if (label) label.innerText = `${Math.round(val * 100)}%`;
          this.sim.setFault(f.id, val, this.sim.faults.affected_cylinder);
          const faultToggle = document.getElementById('sim-toggle-faults');
          if (faultToggle) faultToggle.checked = true;
          // Unhighlight preset button since custom slider was modified
          document.querySelectorAll('.btn-sim-preset').forEach(b => b.classList.remove('active'));
        });
      }
    });

    // Also update target cylinder dropdown options for Wankel vs Piston engines
    const cylSelect = document.getElementById('sim-select-fault-cyl');
    if (cylSelect) {
      if (engineType === 'WANKEL_ROTARY') {
        cylSelect.innerHTML = `
          <option value="B" selected>Chamber B [Combustion/Hot Arc]</option>
          <option value="A">Chamber A [Intake/Compression]</option>
          <option value="C">Chamber C [Exhaust Port Sector]</option>
          <option value="all">Entire Rotor Housing</option>
        `;
      } else {
        cylSelect.innerHTML = `
          <option value="3" selected>Cylinder 3 (Default)</option>
          <option value="1">Cylinder 1</option>
          <option value="2">Cylinder 2</option>
          <option value="4">Cylinder 4</option>
          <option value="all">All Cylinders</option>
        `;
      }
    }
  }

  // ==========================================================================
  // 4. HUD CONTROLS & CAMERA PRESETS
  // ==========================================================================

  initHUDControls() {
    // Camera Presets
    document.getElementById('btn-cam-iso')?.addEventListener('click',     () => this.setCameraPreset(3.8, 2.5, 4.5));
    document.getElementById('btn-cam-front')?.addEventListener('click',   () => this.setCameraPreset(0, 0.8, 6.0));
    document.getElementById('btn-cam-side')?.addEventListener('click',    () => this.setCameraPreset(5.8, 0.8, 0));
    document.getElementById('btn-cam-top')?.addEventListener('click',     () => this.setCameraPreset(0, 7.5, 0.1));
    document.getElementById('btn-cam-cutaway')?.addEventListener('click', () => this.setCameraPreset(2.2, 1.2, 2.8));
    document.getElementById('btn-cam-reset')?.addEventListener('click',   () => this.resetCamera());

    // Exploded View Toggle
    const btnExploded = document.getElementById('btn-cam-exploded');
    if (btnExploded) {
      btnExploded.addEventListener('click', () => {
        this.isExploded = !this.isExploded;
        this.targetExplodedFactor = this.isExploded ? 1.0 : 0.0;
        btnExploded.classList.toggle('active', this.isExploded);
        btnExploded.innerText = this.isExploded ? '💥 ASSEMBLE' : '💥 EXPLODED';
      });
    }

    // X-Ray Toggle
    const btnXRay = document.getElementById('btn-toggle-xray');
    if (btnXRay) {
      btnXRay.addEventListener('click', () => {
        const isXRay = this.model?.isXRay;
        this.model?.toggleXRay(!isXRay);
        btnXRay.innerText = !isXRay ? '🔍 X-RAY: ON' : '🔍 X-RAY: OFF';
        btnXRay.classList.toggle('active', !isXRay);
      });
    }

    // Labels Toggle
    const btnLabels = document.getElementById('btn-toggle-labels');
    if (btnLabels) {
      btnLabels.addEventListener('click', () => {
        const show = this.model?.showLabels;
        this.model?.toggleLabels(!show);
        btnLabels.innerText = !show ? '🏷️ LABELS: ON' : '🏷️ LABELS: OFF';
        btnLabels.classList.toggle('active', !show);
      });
    }

    // Fullscreen Viewport
    document.getElementById('btn-expand-3d')?.addEventListener('click', () => {
      const wrap = document.getElementById('engine3d-viewport-wrap');
      if (wrap) {
        if (!document.fullscreenElement) {
          wrap.requestFullscreen().catch(err => console.error(err));
        } else {
          document.exitFullscreen();
        }
      }
    });

    // Simulation Controls
    document.getElementById('btn-sim-start')?.addEventListener('click', () => {
      this.sim.start();
      this.updateStatusBadge('RUNNING');
    });
    document.getElementById('btn-sim-pause')?.addEventListener('click', () => {
      this.sim.pause();
      this.updateStatusBadge('PAUSED');
    });
    document.getElementById('btn-sim-stop')?.addEventListener('click', () => {
      this.sim.stop();
      this.updateStatusBadge('STOPPED');
    });
    document.getElementById('btn-sim-reset')?.addEventListener('click', () => {
      this.sim.reset();
      this.resetFaultSlidersUI();
      this.syncDrawerInputsFromSim();
      document.querySelectorAll('.btn-sim-preset').forEach(b => b.classList.remove('active'));
      const banner = document.getElementById('demo-scenario-banner');
      if (banner) banner.style.display = 'none';
      this.updateStatusBadge('RUNNING');
    });

    // Speed Multipliers
    document.querySelectorAll('.btn-sim-speed').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-sim-speed').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const spd = parseFloat(btn.getAttribute('data-speed'));
        this.sim.setSpeed(spd);
      });
    });

    // Demo Scenarios Dropdown Menu Toggle
    const demoTrigger = document.getElementById('btn-demo-menu-trigger');
    const demoMenu = document.getElementById('demo-dropdown-menu');
    if (demoTrigger && demoMenu) {
      demoTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        demoMenu.style.display = demoMenu.style.display === 'none' ? 'flex' : 'none';
      });
      document.addEventListener('click', () => {
        if (demoMenu) demoMenu.style.display = 'none';
      });
    }

    // Demo Menu Item Selection
    document.querySelectorAll('.demo-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const scenario = item.getAttribute('data-scenario');
        if (scenario) {
          if (demoMenu) demoMenu.style.display = 'none';
          this.loadDemoScenario(scenario);
        }
      });
    });

    // Close Inspection Button
    document.getElementById('btn-close-inspect')?.addEventListener('click', () => this.closeInspection());
  }

  setCameraPreset(x, y, z) {
    if (!this.camera || !this.controls) return;
    this.camera.position.set(x, y, z);
    this.controls.target.set(0, 0, 0.2);
    this.controls.update();
  }

  resetCamera() {
    this.setCameraPreset(3.8, 2.5, 4.5);
  }

  updateStatusBadge(status) {
    const badge = document.getElementById('sim-status-badge');
    if (!badge) return;
    badge.innerText = status;
    badge.style.backgroundColor = status === 'RUNNING' ? 'var(--color-nominal)' : (status === 'PAUSED' ? 'var(--color-warning)' : 'var(--color-critical)');
  }

  // ==========================================================================
  // 5. INTERACTIVE RAYCASTING (COMPONENT INSPECTION)
  // ==========================================================================

  initRaycasting() {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    this.canvas.addEventListener('click', () => {
      if (!this.raycaster || !this.camera || !this.model) return;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const interactiveList = this.model.interactiveMeshes;
      const intersects = this.raycaster.intersectObjects(interactiveList, true);

      if (intersects.length > 0) {
        let hitObj = intersects[0].object;
        while (hitObj && !hitObj.userData?.componentId && hitObj.parent) {
          hitObj = hitObj.parent;
        }
        if (hitObj && hitObj.userData?.componentId) {
          this.selectComponent(hitObj.userData);
        }
      }
    });
  }

  selectComponent(data) {
    const card = document.getElementById('engine3d-inspection-card');
    if (!card) return;

    this.selectedComponent = data;
    card.style.display = 'block';

    const cfg = window.ENGINE_ARCHITECTURES && window.ENGINE_ARCHITECTURES[this.currentEngineType];
    const compDb = cfg?.inspectionComponents || {};
    const compInfo = compDb[data.componentId] || {
      name: data.name || data.componentId,
      category: data.category || 'AERO PROPULSION COMPONENT',
      nominalStatus: 'NOMINAL',
      inspectText: 'Component operating within verified STANAG 4586 parameter envelope.',
      actionNominal: 'Continue scheduled automated telemetry health monitoring.',
      actionFault: 'Perform localized maintenance inspection.'
    };

    const titleEl = document.getElementById('inspect-title');
    const catEl = document.getElementById('inspect-category');
    const badgeEl = document.getElementById('inspect-status-badge');
    const healthVal = document.getElementById('inspect-health-val');
    const healthBar = document.getElementById('inspect-health-bar');
    const metricsGrid = document.getElementById('inspect-live-metrics');
    const issueText = document.getElementById('inspect-issue-text');
    const actionText = document.getElementById('inspect-action-text');

    if (titleEl) titleEl.innerText = compInfo.name;
    if (catEl) catEl.innerText = compInfo.category;

    const overallHealth = this.sim.analytics.overall_health_score || 92;
    const hasFault = this.sim.faults.enabled;

    if (badgeEl) {
      badgeEl.innerText = hasFault ? 'WARNING' : 'NOMINAL';
      badgeEl.style.backgroundColor = hasFault ? 'var(--color-warning)' : 'var(--color-nominal)';
    }

    if (healthVal) healthVal.innerText = `${overallHealth}%`;
    if (healthBar) {
      healthBar.style.width = `${overallHealth}%`;
      healthBar.style.backgroundColor = overallHealth < 75 ? 'var(--color-warning)' : 'var(--color-nominal)';
    }

    if (metricsGrid) {
      metricsGrid.innerHTML = `
        <div class="inspect-metric-pill">
          <span class="label">Operating Mode:</span>
          <span class="val font-mono">${this.currentEngineType}</span>
        </div>
        <div class="inspect-metric-pill">
          <span class="label">Health Index:</span>
          <span class="val font-mono">${overallHealth}%</span>
        </div>
      `;
    }

    if (issueText) {
      issueText.innerText = hasFault ? (this.sim.analytics.diagnostic_reasoning || compInfo.inspectText) : compInfo.inspectText;
    }
    if (actionText) {
      actionText.innerText = hasFault ? compInfo.actionFault : compInfo.actionNominal;
    }
  }

  closeInspection() {
    const card = document.getElementById('engine3d-inspection-card');
    if (card) card.style.display = 'none';
    this.selectedComponent = null;
  }

  // ==========================================================================
  // 6. DRAWER CONTROLS
  // ==========================================================================

  initDrawerControls() {
    const drawerToggle = document.getElementById('btn-toggle-sim-drawer');
    const drawer = document.getElementById('engine3d-sim-drawer');
    if (drawerToggle && drawer) {
      drawerToggle.addEventListener('click', () => {
        drawer.classList.toggle('open');
        drawerToggle.innerText = drawer.classList.contains('open') ? '▲ COLLAPSE SIMULATION CONTROLS' : '▼ SIMULATION CONTROLS & FAULT INJECTION';
      });
    }

    const profileSel = document.getElementById('sim-profile-select');
    if (profileSel) {
      profileSel.addEventListener('change', (e) => {
        this.sim.setMissionProfile(e.target.value);
        this.syncDrawerInputsFromSim();
      });
    }

    const throttleSlider = document.getElementById('sim-slider-throttle');
    if (throttleSlider) {
      throttleSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const readout = document.getElementById('sim-val-throttle');
        if (readout) readout.innerText = `${Math.round(val)}%`;
        this.sim.setThrottle(val);
      });
    }

    const altSlider = document.getElementById('sim-slider-altitude');
    if (altSlider) {
      altSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const readout = document.getElementById('sim-val-altitude');
        if (readout) readout.innerText = `${Math.round(val).toLocaleString()} ft`;
        this.sim.env.altitude_ft = val;
      });
    }

    const tempSlider = document.getElementById('sim-slider-temp');
    if (tempSlider) {
      tempSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const readout = document.getElementById('sim-val-temp');
        if (readout) readout.innerText = `${Math.round(val)} °C`;
        this.sim.env.ambient_temp_c = val;
      });
    }

    const faultToggle = document.getElementById('sim-toggle-faults');
    if (faultToggle) {
      faultToggle.addEventListener('change', (e) => {
        this.sim.faults.enabled = e.target.checked;
        if (!e.target.checked) {
          this.sim.clearFaults();
          this.resetFaultSlidersUI();
          document.querySelectorAll('.btn-sim-preset').forEach(b => b.classList.remove('active'));
        }
      });
    }

    const cylSelect = document.getElementById('sim-select-fault-cyl');
    if (cylSelect) {
      cylSelect.addEventListener('change', (e) => {
        const val = e.target.value === 'all' ? 'all' : (isNaN(parseInt(e.target.value)) ? e.target.value : parseInt(e.target.value));
        this.sim.setAffectedCylinder(val);
      });
    }
  }

  initFaultPresets() {
    document.querySelectorAll('.btn-sim-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        if (!preset) return;

        document.querySelectorAll('.btn-sim-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this.sim.applyFaultPreset(preset);
        this.syncDrawerInputsFromSim();
      });
    });
  }

  syncDrawerInputsFromSim() {
    // 1. Mission Profile Select
    const profileSel = document.getElementById('sim-profile-select');
    if (profileSel && this.sim.missionPhase) {
      profileSel.value = this.sim.missionPhase;
    }

    // 2. Throttle
    const throttleSlider = document.getElementById('sim-slider-throttle');
    const throttleVal = document.getElementById('sim-val-throttle');
    if (throttleSlider && throttleVal) {
      throttleSlider.value = Math.round(this.sim.engine.throttle_percent);
      throttleVal.innerText = `${Math.round(this.sim.engine.throttle_percent)}%`;
    }

    // 3. Altitude
    const altSlider = document.getElementById('sim-slider-altitude');
    const altVal = document.getElementById('sim-val-altitude');
    if (altSlider && altVal) {
      altSlider.value = this.sim.env.altitude_ft;
      altVal.innerText = `${Math.round(this.sim.env.altitude_ft).toLocaleString()} ft`;
    }

    // 4. Ambient Temp
    const tempSlider = document.getElementById('sim-slider-temp');
    const tempVal = document.getElementById('sim-val-temp');
    if (tempSlider && tempVal) {
      tempSlider.value = Math.round(this.sim.env.ambient_temp_c);
      tempVal.innerText = `${Math.round(this.sim.env.ambient_temp_c)} °C`;
    }

    // 5. Fault Toggle
    const faultToggle = document.getElementById('sim-toggle-faults');
    if (faultToggle) {
      faultToggle.checked = this.sim.faults.enabled;
    }

    // 6. Cylinder Select
    const cylSelect = document.getElementById('sim-select-fault-cyl');
    if (cylSelect && this.sim.faults.affected_cylinder !== undefined) {
      cylSelect.value = String(this.sim.faults.affected_cylinder);
    }

    // 7. Granular fault sliders
    const cfg = window.ENGINE_ARCHITECTURES && window.ENGINE_ARCHITECTURES[this.currentEngineType];
    if (cfg && cfg.supportedFaults) {
      cfg.supportedFaults.forEach(f => {
        const slider = document.getElementById(`sim-slider-${f.id}`);
        const valBadge = document.getElementById(`sim-val-${f.id}`);
        const sevKey = `${f.id}_severity`;
        let sev = this.sim.faults[sevKey];
        if (sev === undefined) {
          if (f.id === 'high_vibration' || f.id === 'crankcase_vibration') {
            sev = this.sim.faults.abnormal_vibration_severity;
          } else if (f.id === 'combustion_instability') {
            sev = this.sim.faults.combustion_imbalance_severity;
          } else if (f.id === 'thermal_gradient') {
            sev = this.sim.faults.housing_overheating_severity;
          }
        }
        const pct = Math.round((sev || 0) * 100);
        if (slider) slider.value = pct;
        if (valBadge) valBadge.innerText = `${pct}%`;
      });
    }
  }

  resetFaultSlidersUI() {
    const cfg = window.ENGINE_ARCHITECTURES && window.ENGINE_ARCHITECTURES[this.currentEngineType];
    if (cfg && cfg.supportedFaults) {
      cfg.supportedFaults.forEach(f => {
        const slider = document.getElementById(`sim-slider-${f.id}`);
        const valBadge = document.getElementById(`sim-val-${f.id}`);
        if (slider) slider.value = 0;
        if (valBadge) valBadge.innerText = '0%';
      });
    }
  }

  // ==========================================================================
  // 7. DEMO SCENARIOS
  // ==========================================================================

  clearDemoTimeouts() {
    this.demoTimeouts.forEach(t => clearTimeout(t));
    this.demoTimeouts = [];
  }

  loadDemoScenario(scenarioId) {
    this.clearDemoTimeouts();
    const banner = document.getElementById('demo-scenario-banner');

    if (banner) {
      banner.style.display = 'block';
      banner.innerHTML = `<strong>1-CLICK DEMO INITIATED:</strong> Loading scenario profile...`;
    }

    // Call simulator scenario runner
    this.sim.loadDemoScenario(scenarioId);

    // Switch view to match scenario architecture
    if (scenarioId === 'heavy_fuel_endurance') {
      this.switchEngine('HEAVY_FUEL_CI');
      if (banner) {
        banner.innerHTML = `<strong>DEMO 1/4 (HEAVY-FUEL CI):</strong> Long loiter endurance sortie at 10,000 ft. Injecting common-rail injector nozzle degradation.`;
      }
    } else if (scenarioId === 'boxer_imbalance') {
      this.switchEngine('BOXER');
      if (banner) {
        banner.innerHTML = `<strong>DEMO 2/4 (BOXER):</strong> Cruise phase at 12,000 ft. Simulating left/right cylinder bank thermal imbalance (22.5°C split).`;
      }
    } else if (scenarioId === 'wankel_seal_wear') {
      this.switchEngine('WANKEL_ROTARY');
      if (banner) {
        banner.innerHTML = `<strong>DEMO 3/4 (WANKEL ROTARY):</strong> High-load loiter sortie. Simulating apex-seal wear degradation and hot-arc housing thermal stress.`;
      }
    } else if (scenarioId === 'turbo_altitude_climb') {
      this.switchEngine('TURBO_INLINE_V');
      if (banner) {
        banner.innerHTML = `<strong>DEMO 4/4 (TURBOCHARGED INLINE/V):</strong> High-altitude climb to FL250. Monitoring electronic wastegate lag and turbo spool exceedance.`;
      }
    }

    document.querySelectorAll('.btn-sim-preset').forEach(b => b.classList.remove('active'));
    setTimeout(() => {
      this.syncDrawerInputsFromSim();
    }, 360);

    const t1 = setTimeout(() => {
      if (banner) {
        banner.innerHTML += ` <span style="color:#38bdf8;">[Telemetry anomaly detected; diagnostic reasoning active]</span>`;
      }
    }, 4500);

    this.demoTimeouts.push(t1);
  }

  // ==========================================================================
  // 8. MULTI-ENGINE MISSION COMPARISON MODAL
  // ==========================================================================

  initComparisonModal() {
    const modal = document.getElementById('modal-engine-comparison');
    const btnOpen = document.getElementById('btn-compare-all-engines');
    const btnClose = document.getElementById('btn-close-comparison-modal');
    const btnCloseBottom = document.getElementById('btn-close-comp-modal-bottom');
    const btnRun = document.getElementById('btn-recalculate-comparison');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        this.runComparisonCalculation();
        modal.style.display = 'flex';
      });
    }

    const closeModal = () => {
      if (modal) modal.style.display = 'none';
    };

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCloseBottom) btnCloseBottom.addEventListener('click', closeModal);

    if (btnRun) {
      btnRun.addEventListener('click', () => this.runComparisonCalculation());
    }
  }

  runComparisonCalculation() {
    const alt = parseFloat(document.getElementById('comp-mission-alt')?.value || 10000);
    const oat = parseFloat(document.getElementById('comp-mission-oat')?.value || 35);
    const dur = parseFloat(document.getElementById('comp-mission-duration')?.value || 12);
    const profile = document.getElementById('comp-mission-profile')?.value || 'loiter';
    const fault = document.getElementById('comp-mission-fault')?.value || 'nominal';

    const tbody = document.getElementById('engine-comparison-tbody');
    if (!tbody) return;

    // Physics calculations for each engine under identical mission conditions
    // 1. Heavy-Fuel CI
    const hfFuelFlow = (20.5 + (alt / 10000) * 1.5).toFixed(1);
    const hfTotalFuel = (hfFuelFlow * dur).toFixed(0);
    const hfTherm = (62 + (oat > 35 ? (oat - 35) * 1.2 : 0)).toFixed(0);
    const hfEgt = (680 + (oat - 15) * 1.2).toFixed(0);
    const hfOilP = '4.6 bar';
    const hfVib = (0.55 + (fault === 'vibration_stress' ? 0.35 : 0)).toFixed(2);
    const hfHealthDeg = (dur * 0.45 + (fault !== 'nominal' ? 8 : 0)).toFixed(1);
    const hfRul = (245 - hfHealthDeg * 1.8).toFixed(1);
    const hfConf = fault === 'fuel_degradation' ? '82%' : '96%';

    // 2. Boxer
    const bxFuelFlow = (36.0 + (alt / 10000) * 2.2).toFixed(1);
    const bxTotalFuel = (bxFuelFlow * dur).toFixed(0);
    const bxTherm = (68 + (oat > 35 ? (oat - 35) * 1.4 : 0)).toFixed(0);
    const bxEgt = (790 + (oat - 15) * 1.5).toFixed(0);
    const bxOilP = '4.1 bar';
    const bxVib = (0.42 + (fault === 'vibration_stress' ? 0.25 : 0)).toFixed(2);
    const bxHealthDeg = (dur * 0.65 + (fault !== 'nominal' ? 10 : 0)).toFixed(1);
    const bxRul = (198 - bxHealthDeg * 1.8).toFixed(1);
    const bxConf = '92%';

    // 3. Wankel Rotary
    const wkFuelFlow = (40.0 + (alt / 10000) * 2.8).toFixed(1);
    const wkTotalFuel = (wkFuelFlow * dur).toFixed(0);
    const wkTherm = (78 + (oat > 35 ? (oat - 35) * 1.8 : 0)).toFixed(0);
    const wkEgt = (840 + (oat - 15) * 1.8).toFixed(0);
    const wkOilP = '4.8 bar';
    const wkVib = (0.18 + (fault === 'vibration_stress' ? 0.12 : 0)).toFixed(2); // Lowest vibration!
    const wkHealthDeg = (dur * 0.85 + (fault !== 'nominal' ? 14 : 0)).toFixed(1);
    const wkRul = (180 - wkHealthDeg * 1.8).toFixed(1);
    const wkConf = fault === 'thermal_stress' ? '79%' : '89%';

    // 4. Turbocharged Inline/V
    const tbFuelFlow = (42.0 + (alt > 15000 ? 4.5 : 2.0)).toFixed(1);
    const tbTotalFuel = (tbFuelFlow * dur).toFixed(0);
    const tbTherm = (74 + (alt / 10000) * 3.5).toFixed(0);
    const tbEgt = (815 + (alt / 10000) * 4.0).toFixed(0);
    const tbOilP = '4.4 bar';
    const tbVib = (0.46 + (fault === 'vibration_stress' ? 0.28 : 0)).toFixed(2);
    const tbHealthDeg = (dur * 0.72 + (fault !== 'nominal' ? 11 : 0)).toFixed(1);
    const tbRul = (192 - tbHealthDeg * 1.8).toFixed(1);
    const tbConf = alt > 20000 ? '94%' : '91%';

    tbody.innerHTML = `
      <tr>
        <td><strong>Hourly Fuel Burn</strong></td>
        <td class="col-heavy"><strong>${hfFuelFlow} L/h</strong> (Lowest)</td>
        <td class="col-boxer">${bxFuelFlow} L/h</td>
        <td class="col-wankel">${wkFuelFlow} L/h</td>
        <td class="col-turbo">${tbFuelFlow} L/h</td>
      </tr>
      <tr>
        <td><strong>Total Mission Fuel (${dur}h)</strong></td>
        <td class="col-heavy"><strong>${hfTotalFuel} L</strong></td>
        <td class="col-boxer">${bxTotalFuel} L</td>
        <td class="col-wankel">${wkTotalFuel} L</td>
        <td class="col-turbo">${tbTotalFuel} L</td>
      </tr>
      <tr>
        <td><strong>Max Thermal Stress</strong></td>
        <td class="col-heavy">${hfTherm}%</td>
        <td class="col-boxer">${bxTherm}%</td>
        <td class="col-wankel" style="color:#f59e0b;">${wkTherm}% (Hot Arc)</td>
        <td class="col-turbo">${tbTherm}%</td>
      </tr>
      <tr>
        <td><strong>Peak EGT / Housing Temp</strong></td>
        <td class="col-heavy">${hfEgt}°C</td>
        <td class="col-boxer">${bxEgt}°C</td>
        <td class="col-wankel">${wkEgt}°C</td>
        <td class="col-turbo">${tbEgt}°C</td>
      </tr>
      <tr>
        <td><strong>Min Oil Pressure</strong></td>
        <td class="col-heavy">${hfOilP}</td>
        <td class="col-boxer">${bxOilP}</td>
        <td class="col-wankel">${wkOilP}</td>
        <td class="col-turbo">${tbOilP}</td>
      </tr>
      <tr>
        <td><strong>Vibration Level</strong></td>
        <td class="col-heavy">${hfVib} g RMS</td>
        <td class="col-boxer">${bxVib} g RMS</td>
        <td class="col-wankel" style="color:#10b981;"><strong>${wkVib} g RMS</strong> (Ultra-Low)</td>
        <td class="col-turbo">${tbVib} g RMS</td>
      </tr>
      <tr>
        <td><strong>Mission Health Degradation</strong></td>
        <td class="col-heavy">${hfHealthDeg}%</td>
        <td class="col-boxer">${bxHealthDeg}%</td>
        <td class="col-wankel">${wkHealthDeg}%</td>
        <td class="col-turbo">${tbHealthDeg}%</td>
      </tr>
      <tr>
        <td><strong>Post-Mission RUL Estimate</strong></td>
        <td class="col-heavy"><strong>${hfRul} hrs</strong></td>
        <td class="col-boxer">${bxRul} hrs</td>
        <td class="col-wankel">${wkRul} hrs</td>
        <td class="col-turbo">${tbRul} hrs</td>
      </tr>
      <tr>
        <td><strong>Mission Completion Confidence</strong></td>
        <td class="col-heavy">${hfConf}</td>
        <td class="col-boxer">${bxConf}</td>
        <td class="col-wankel">${wkConf}</td>
        <td class="col-turbo"><strong>${tbConf}</strong> (Top at Altitude)</td>
      </tr>
      <tr>
        <td><strong>Primary Tactical Suitability</strong></td>
        <td class="col-heavy">Long Endurance / Military Fuel</td>
        <td class="col-boxer">Balanced Tactical Airframes</td>
        <td class="col-wankel">EO/IR High-Payload / Compact</td>
        <td class="col-turbo">High-Altitude Ceiling (FL250+)</td>
      </tr>
      <tr>
        <td><strong>Deploy to 3D Lab</strong></td>
        <td><button class="mil-btn" onclick="window.engine3DView?.switchEngine('HEAVY_FUEL_CI'); document.getElementById('modal-engine-comparison').style.display='none';">SELECT CI</button></td>
        <td><button class="mil-btn" onclick="window.engine3DView?.switchEngine('BOXER'); document.getElementById('modal-engine-comparison').style.display='none';">SELECT BOXER</button></td>
        <td><button class="mil-btn" onclick="window.engine3DView?.switchEngine('WANKEL_ROTARY'); document.getElementById('modal-engine-comparison').style.display='none';">SELECT WANKEL</button></td>
        <td><button class="mil-btn" onclick="window.engine3DView?.switchEngine('TURBO_INLINE_V'); document.getElementById('modal-engine-comparison').style.display='none';">SELECT TURBO</button></td>
      </tr>
    `;
  }

  // ==========================================================================
  // 9. MINI CHART & TELEMETRY DISPATCH
  // ==========================================================================

  initMiniChart() {
    this.chartCanvas = document.getElementById('engine3d-mini-chart');
    if (!this.chartCanvas) return;
    this.chartCtx = this.chartCanvas.getContext('2d');
  }

  renderMiniChart(history) {
    if (!this.chartCanvas || !this.chartCtx || !history.rpm.length) return;

    const ctx = this.chartCtx;
    const w = this.chartCanvas.width = this.chartCanvas.parentElement.clientWidth || 360;
    const h = this.chartCanvas.height = 110;
    ctx.clearRect(0, 0, w, h);

    const len = history.rpm.length;
    if (len < 2) return;

    const padLeft = 40;
    const padRight = 10;
    const padTop = 15;
    const padBottom = 20;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
    }

    const drawTrace = (data, minVal, maxVal, color, lineWidth = 1.8) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      for (let i = 0; i < len; i++) {
        const x = padLeft + (i / (len - 1)) * plotW;
        const norm = Math.max(0, Math.min(1, (data[i] - minVal) / (maxVal - minVal || 1)));
        const y = padTop + plotH - norm * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawTrace(history.rpm, 1500, 7500, '#38bdf8');
    drawTrace(history.primary_temp, 60, 160, '#10b981');
    drawTrace(history.egt, 600, 960, '#f97316');
    drawTrace(history.vibration, 0.05, 2.5, '#a855f7', 1.2);

    ctx.fillStyle = '#64748b';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('7k', padLeft - 6, padTop + 8);
    ctx.fillText('2k', padLeft - 6, padTop + plotH);
    ctx.fillText(history.timestamps[len - 1] || '', w - padRight, h - 4);
  }

  onTelemetryPacket(packet) {
    if (!packet || !packet.engine) return;

    // Simulation Phase & Clock
    const phaseEl = document.getElementById('sim-current-phase');
    if (phaseEl) phaseEl.innerText = packet.mission_phase.toUpperCase();

    const timeEl = document.getElementById('sim-current-time');
    if (timeEl) timeEl.innerText = this.sim.formatSimTime(packet.simulation_time_seconds);

    // Viewport HUD Tachometer
    const rpmOverlay = document.getElementById('sim-hud-rpm-val');
    if (rpmOverlay) rpmOverlay.innerText = Math.round(packet.engine.rpm);

    // Dynamic Telemetry Cards
    const cfg = window.ENGINE_ARCHITECTURES && window.ENGINE_ARCHITECTURES[this.currentEngineType];
    if (cfg && cfg.telemetryProfile) {
      cfg.telemetryProfile.forEach(item => {
        let val = '--';
        let status = 'nominal';

        if (item.key === 'rpm') val = Math.round(packet.engine.rpm);
        else if (item.key === 'throttle') val = packet.engine.throttle_percent.toFixed(0);
        else if (item.key === 'cht') {
          val = packet.engine.cht_c ? packet.engine.cht_c.toFixed(1) : '--';
          if (packet.engine.cht_c > 122) status = 'warning';
        } else if (item.key === 'cht_left') {
          val = packet.engine.cht_left_bank_c ? packet.engine.cht_left_bank_c.toFixed(1) : '--';
        } else if (item.key === 'cht_right') {
          val = packet.engine.cht_right_bank_c ? packet.engine.cht_right_bank_c.toFixed(1) : '--';
        } else if (item.key === 'bank_imbalance') {
          val = packet.engine.bank_imbalance_c ? packet.engine.bank_imbalance_c.toFixed(1) : '--';
          if (packet.engine.bank_imbalance_c > 12) status = 'warning';
        } else if (item.key === 'rotor_housing_temp') {
          val = packet.engine.rotor_housing_temp_c ? packet.engine.rotor_housing_temp_c.toFixed(1) : '--';
          if (packet.engine.rotor_housing_temp_c > 132) status = 'warning';
        } else if (item.key === 'seal_health') {
          val = packet.engine.seal_health_pct ? packet.engine.seal_health_pct.toFixed(0) : '--';
          if (packet.engine.seal_health_pct < 75) status = 'warning';
        } else if (item.key === 'thermal_stress') {
          val = packet.engine.thermal_stress_pct ? packet.engine.thermal_stress_pct.toFixed(0) : '--';
        } else if (item.key === 'boost_pressure') {
          val = packet.engine.boost_pressure_bar !== undefined ? packet.engine.boost_pressure_bar.toFixed(2) : '--';
        } else if (item.key === 'manifold_pressure') {
          val = packet.engine.manifold_pressure_hpa ? packet.engine.manifold_pressure_hpa.toFixed(0) : '--';
        } else if (item.key === 'turbo_speed_pct') {
          val = packet.engine.turbo_speed_pct ? packet.engine.turbo_speed_pct.toFixed(0) : '--';
          if (packet.engine.turbo_speed_pct > 105) status = 'warning';
        } else if (item.key === 'iat') {
          val = packet.engine.iat_c ? packet.engine.iat_c.toFixed(1) : '--';
        } else if (item.key === 'intercooler_eff') {
          val = packet.engine.intercooler_eff_pct ? packet.engine.intercooler_eff_pct.toFixed(0) : '--';
        } else if (item.key === 'fuel_rail_press') {
          val = packet.engine.fuel_rail_press_bar ? packet.engine.fuel_rail_press_bar.toFixed(0) : '--';
          if (packet.engine.fuel_rail_press_bar < 1300) status = 'warning';
        } else if (item.key === 'combustion_quality') {
          val = packet.engine.combustion_quality_pct ? packet.engine.combustion_quality_pct.toFixed(0) : '--';
        } else if (item.key === 'egt') {
          val = packet.engine.egt_c ? packet.engine.egt_c.toFixed(0) : '--';
          if (packet.engine.egt_c > 840) status = 'warning';
        } else if (item.key === 'oil_press') {
          val = packet.engine.oil_pressure_bar ? packet.engine.oil_pressure_bar.toFixed(2) : '--';
          if (packet.engine.oil_pressure_bar < 2.5) status = 'critical';
        } else if (item.key === 'oil_temp') {
          val = packet.engine.oil_temp_c ? packet.engine.oil_temp_c.toFixed(1) : '--';
        } else if (item.key === 'fuel_flow') {
          val = packet.engine.fuel_flow_lph ? packet.engine.fuel_flow_lph.toFixed(1) : '--';
        } else if (item.key === 'vibration') {
          val = packet.engine.vibration_rms_g ? packet.engine.vibration_rms_g.toFixed(2) : '--';
          if (packet.engine.vibration_rms_g > 1.0) status = 'critical';
        } else if (item.key === 'health_score') {
          val = packet.analytics.overall_health_score;
          if (packet.analytics.overall_health_score < 75) status = 'warning';
        } else if (item.key === 'rul') {
          val = packet.analytics.estimated_rul_hours.toFixed(1);
          if (packet.analytics.estimated_rul_hours < 80) status = 'warning';
        }

        const elVal = document.getElementById(`sim-card-val-${item.key}`);
        const elCard = document.getElementById(`sim-card-${item.key}`);
        if (elVal) elVal.innerText = val;
        if (elCard) elCard.className = `metric-card status-${status}`;
      });
    }

    // Dynamic Balance Panel Updates
    if (this.currentEngineType === 'WANKEL_ROTARY') {
      if (packet.chambers && packet.chambers.length === 3) {
        const chA = packet.chambers[0];
        const chB = packet.chambers[1];
        const chC = packet.chambers[2];
        const valA = document.getElementById('sim-chamber-val-A');
        const barA = document.getElementById('sim-chamber-bar-A');
        const valB = document.getElementById('sim-chamber-val-B');
        const barB = document.getElementById('sim-chamber-bar-B');
        const valC = document.getElementById('sim-chamber-val-C');
        const barC = document.getElementById('sim-chamber-bar-C');

        if (valA) valA.innerText = `${chA.temp_c.toFixed(1)}°C / Nominal [${chA.seal_wear}% wear]`;
        if (barA) barA.style.width = `${Math.min(100, (chA.temp_c / 120) * 100)}%`;

        if (valB) valB.innerText = `${chB.temp_c.toFixed(1)}°C / ${chB.status} [${chB.seal_wear}% wear]`;
        if (barB) {
          barB.style.width = `${Math.min(100, (chB.temp_c / 160) * 100)}%`;
          barB.style.backgroundColor = chB.temp_c > 132 ? 'var(--color-critical)' : (chB.temp_c > 122 ? 'var(--color-warning)' : '#f59e0b');
        }

        if (valC) valC.innerText = `${chC.temp_c.toFixed(1)}°C / Port Discharge [${chC.seal_wear}% wear]`;
        if (barC) barC.style.width = `${Math.min(100, (chC.temp_c / 140) * 100)}%`;
      }
    } else if (packet.cylinders) {
      for (let i = 0; i < packet.cylinders.length; i++) {
        const c = packet.cylinders[i];
        const bar = document.getElementById(`sim-cyl-bar-${c.id}`);
        const val = document.getElementById(`sim-cyl-val-${c.id}`);
        if (bar && val) {
          bar.style.width = `${c.health}%`;
          bar.style.backgroundColor = c.health < 70 ? 'var(--color-critical)' : (c.health < 85 ? 'var(--color-warning)' : 'var(--color-nominal)');
          const tag = c.fault ? ` [${c.fault}]` : '';
          val.innerText = `${c.cht_c ? c.cht_c.toFixed(0) : '--'}°C / ${c.egt_c ? c.egt_c.toFixed(0) : '--'}°C${tag}`;
        }
      }
    }

    // Active Alerts List
    const alertsContainer = document.getElementById('sim-active-alerts-list');
    if (alertsContainer) {
      if (!packet.alerts || packet.alerts.length === 0) {
        alertsContainer.innerHTML = `<div class="sim-alert-empty">✓ All ${cfg?.displayName || 'propulsion'} channels nominal.</div>`;
      } else {
        alertsContainer.innerHTML = packet.alerts.map(a => {
          const levelClass = a.level === 'SENSOR' ? 'alert-sensor' : (a.level ? a.level.toLowerCase() : 'warning');
          return `
            <div class="sim-alert-item alert-${levelClass}">
              <div class="sim-alert-badge">${a.level || 'ALERT'}</div>
              <div class="sim-alert-content">
                <div class="sim-alert-msg">${a.message}</div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Diagnostics Explanation
    const explainBox = document.getElementById('sim-fault-explain-text');
    if (explainBox) {
      explainBox.innerText = packet.analytics.diagnostic_reasoning ||
        'PHYSICS CORRELATION: Continuous EKF state synchronization active. All thermodynamic parameters within operating baseline envelope.';
    }

    // Render Mini Chart
    this.renderMiniChart(this.sim.history);
  }
}

// Global export for vanilla JS
window.Engine3DView = Engine3DView;

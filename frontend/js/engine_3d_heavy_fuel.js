/**
 * ============================================================================
 * AEROTWIN // 3D HEAVY-FUEL COMPRESSION-IGNITION ENGINE MODEL v2.0
 * ============================================================================
 * Professional engineering cutaway — inline 4-cylinder JP-8/Diesel CI engine.
 * Upgraded geometry: ribbed monoblock, I-beam conrods, piston rings, common-rail
 * with braided lines, 4-1 exhaust manifold, water jacket, DOHC head detail.
 *
 * SYNTHETIC ENGINE CUTAWAY — NOT CERTIFIED CAD OR FLIGHT SOFTWARE
 */

'use strict';

class HeavyFuelEngineModel {
  constructor(scene, materials) {
    this.scene     = scene;
    this.materials = materials;
    this.group     = new THREE.Group();
    this.group.name = 'HeavyFuelEngineRoot';

    // Kinematic refs
    this.crankshaft        = null;
    this.propeller         = null;
    this.pistons           = [];
    this.connectingRods    = [];
    this.cylinderHeads     = [];
    this.cylinderBarrels   = [];
    this.injectors         = [];
    this.fuelPulses        = [];
    this.sprayCones        = [];
    this.sprayLights       = [];
    this.commonRailMesh    = null;
    this.exhaustPlenumMesh = null;
    this.engineBlockMesh   = null;
    this.oilSumpMesh       = null;
    this.ecuMesh           = null;
    this.hpfpPumpMesh      = null;
    this.outerHousingMeshes = [];
    this.headStuds         = [];

    // State
    this.crankAngle    = 0;
    this.isXRay        = false;
    this.explodedFactor = 0;
    this.baseExplodedPositions = new Map();

    // Interactive meshes
    this.interactiveMeshes = [];

    this._initMaterials();
    this.initModel();
  }

  _initMaterials() {
    this.ciDarkCast = new THREE.MeshStandardMaterial({
      color: 0x3b4252, metalness: 0.75, roughness: 0.45, name: 'CIDarkCastIron'
    });
    this.ciSteel = new THREE.MeshStandardMaterial({
      color: 0xc8d0dc, metalness: 0.92, roughness: 0.14, name: 'CIForgedSteel'
    });
    this.ciCopper = new THREE.MeshStandardMaterial({
      color: 0xb45309, metalness: 0.88, roughness: 0.22, name: 'CIBrass'
    });
    this.ciRubber = new THREE.MeshStandardMaterial({
      color: 0x1a1d24, metalness: 0.04, roughness: 0.88, name: 'CIRubber'
    });
    this.ciExhaust = new THREE.MeshStandardMaterial({
      color: 0x374151, metalness: 0.82, roughness: 0.38, name: 'ExhaustCast'
    });
    this.ciInjector = new THREE.MeshStandardMaterial({
      color: 0x0284c7, metalness: 0.85, roughness: 0.20, name: 'InjectorBody'
    });
    this.ciSpring = new THREE.MeshStandardMaterial({
      color: 0xb8c5d0, metalness: 0.95, roughness: 0.12, name: 'ValveSpring'
    });
    this.ciWaterJacket = new THREE.MeshStandardMaterial({
      color: 0x0369a1, metalness: 0.50, roughness: 0.35,
      transparent: true, opacity: 0.18, depthWrite: false, name: 'WaterJacket'
    });
    this.ciHousing = new THREE.MeshStandardMaterial({
      color: 0x4a5568, metalness: 0.70, roughness: 0.30,
      transparent: true, opacity: 0.18, depthWrite: false,
      side: THREE.DoubleSide, name: 'CIHousingCutaway'
    });
    this.ciDarkHead = new THREE.MeshStandardMaterial({
      color: 0x3d4756, metalness: 0.88, roughness: 0.36, name: 'DarkSteel'
    });
  }

  _reg(mesh, data) {
    mesh.userData = Object.assign({ isInteractive: true }, data);
    this.interactiveMeshes.push(mesh);
    return mesh;
  }

  _tube(pts, r, mat) {
    if (!pts || pts.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    const geo = new THREE.TubeGeometry(curve, Math.max(6, pts.length * 3), r, 8, false);
    return new THREE.Mesh(geo, mat);
  }

  _spring(y0, y1, x, z, coilR, turns, wireR, mat) {
    // Spring coiled around Y axis, for vertical valve springs
    const segs = Math.ceil(turns * 18);
    const pts  = [];
    for (let i = 0; i <= segs; i++) {
      const t   = i / segs;
      const ang = t * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(
        x + coilR * Math.cos(ang),
        y0 + (y1 - y0) * t,
        z + coilR * Math.sin(ang)
      ));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.Mesh(
      new THREE.TubeGeometry(curve, segs, wireR, 6, false),
      mat
    );
  }

  _bolt(rS, h, mat) {
    const g = new THREE.Group();
    const hGeo = new THREE.CylinderGeometry(rS * 1.7, rS * 1.7, rS * 0.9, 6);
    const head = new THREE.Mesh(hGeo, mat);
    head.position.y = h * 0.5 + rS * 0.45;
    g.add(head);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(rS, rS, h, 10), mat));
    return g;
  }

  initModel() {
    this.createOuterHousing();
    this.createCrankcaseAndBlock();
    this.createCrankshaft();
    this.createPistonsAndRods();
    this.createCylinderHeads();
    this.createCommonRailSystem();
    this.createManifolds();
    this.createOilSump();
    this.createGearboxAndPropeller();
    this.createECU();
    this.setupExplodedBaselines();
  }

  // ── OUTER HOUSING ─────────────────────────────────────────────────────────
  createOuterHousing() {
    // Main semi-transparent shell
    const mainGeo = new THREE.BoxGeometry(2.20, 3.60, 2.25);
    const main = new THREE.Mesh(mainGeo, this.ciHousing);
    main.position.y = 0.60;
    this.group.add(main);
    this.outerHousingMeshes.push(main);

    // Front cowl (gear-end)
    const cowlGeo = new THREE.CylinderGeometry(0.65, 0.82, 0.80, 22);
    cowlGeo.rotateX(Math.PI / 2);
    const cowl = new THREE.Mesh(cowlGeo, this.ciHousing);
    cowl.position.set(0, 0.65, 1.58);
    this.group.add(cowl);
    this.outerHousingMeshes.push(cowl);
  }

  // ── ENGINE BLOCK / CRANKCASE ──────────────────────────────────────────────
  createCrankcaseAndBlock() {
    // Main monoblock (deep CI block)
    const blockGeo = new THREE.BoxGeometry(2.05, 2.85, 2.10);
    this.engineBlockMesh = new THREE.Mesh(blockGeo, this.ciDarkCast);
    this.engineBlockMesh.position.y = 0.58;
    this.engineBlockMesh.castShadow  = true;
    this.engineBlockMesh.receiveShadow = true;
    this._reg(this.engineBlockMesh, {
      componentId: 'EngineBlock',
      name: 'Inline 4 Monoblock — CI Heavy-Fuel',
      category: 'STRUCTURAL CORE // CAST IRON / NODULAR GRAPHITE'
    });
    this.group.add(this.engineBlockMesh);

    // External cast ribs on left side
    for (let y = -0.80; y <= 1.80; y += 0.45) {
      const rGeo = new THREE.BoxGeometry(0.065, 0.070, 2.12);
      const r = new THREE.Mesh(rGeo, this.ciDarkCast);
      r.position.set(-1.06, y + 0.58, 0);
      this.group.add(r);
    }
    // External cast ribs on right side
    for (let y = -0.80; y <= 1.80; y += 0.45) {
      const rGeo = new THREE.BoxGeometry(0.065, 0.070, 2.12);
      const r = new THREE.Mesh(rGeo, this.ciDarkCast);
      r.position.set(1.06, y + 0.58, 0);
      this.group.add(r);
    }

    // Water jacket outline (semi-transparent blue cylinders around bores)
    for (let i = 0; i < 4; i++) {
      const z = -0.78 + i * 0.52;
      const wjGeo = new THREE.CylinderGeometry(0.44, 0.44, 1.65, 20);
      const wj = new THREE.Mesh(wjGeo, this.ciWaterJacket);
      wj.position.set(0, 1.20, z);
      this.group.add(wj);
    }

    // 4 cylinder liner bores (inside block)
    for (let i = 0; i < 4; i++) {
      const z = -0.78 + i * 0.52;
      const lGeo = new THREE.CylinderGeometry(0.36, 0.36, 1.62, 20);
      const liner = new THREE.Mesh(lGeo, new THREE.MeshStandardMaterial({
        color: 0x8faabb, metalness: 0.88, roughness: 0.18, name: `Liner${i}`
      }));
      liner.position.set(0, 1.18, z);
      this.group.add(liner);
      this.cylinderBarrels.push(liner);
    }

    // Lower crankcase skirt
    const skirtGeo = new THREE.BoxGeometry(2.05, 0.82, 2.10);
    const skirt = new THREE.Mesh(skirtGeo, this.ciDarkCast);
    skirt.position.y = -0.62;
    this.group.add(skirt);

    // Timing cover (rear)
    const tcGeo = new THREE.BoxGeometry(2.05, 1.85, 0.55);
    const tc = new THREE.Mesh(tcGeo, this.ciDarkCast);
    tc.position.set(0, 0.30, -1.32);
    this.group.add(tc);
    // Timing gear visible on cover
    const tgGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.12, 28);
    tgGeo.rotateX(Math.PI / 2);
    const tg = new THREE.Mesh(tgGeo, this.ciCopper);
    tg.position.set(0, -0.20, -1.34);
    this.group.add(tg);
    // Gear teeth
    for (let t = 0; t < 24; t++) {
      const a = (t / 24) * Math.PI * 2;
      const tth = new THREE.Mesh(
        new THREE.BoxGeometry(0.040, 0.052, 0.10),
        this.ciCopper
      );
      tth.position.set(Math.cos(a) * 0.39, -0.20 + Math.sin(a) * 0.39, -1.34);
      tth.rotation.z = a;
      this.group.add(tth);
    }

    // Main bearing caps (5 caps, lower crankcase)
    for (let i = 0; i < 5; i++) {
      const z = -1.04 + i * 0.52;
      const capGeo = new THREE.BoxGeometry(1.80, 0.20, 0.38);
      const cap = new THREE.Mesh(capGeo, this.ciDarkCast);
      cap.position.set(0, -0.44, z);
      this.group.add(cap);
      // 2 bolts per cap
      for (const x of [-0.55, 0.55]) {
        const bolt = this._bolt(0.040, 0.24, this.ciSteel);
        bolt.position.set(x, -0.30, z);
        this.group.add(bolt);
      }
    }
  }

  // ── CRANKSHAFT ────────────────────────────────────────────────────────────
  createCrankshaft() {
    this.crankshaft = new THREE.Group();

    // Main shaft
    const msGeo = new THREE.CylinderGeometry(0.148, 0.148, 2.25, 20);
    msGeo.rotateX(Math.PI / 2);
    this.crankshaft.add(new THREE.Mesh(msGeo, this.ciSteel));

    // 5 main journals
    for (const z of [-1.04, -0.52, 0, 0.52, 1.04]) {
      const jGeo = new THREE.CylinderGeometry(0.178, 0.178, 0.22, 20);
      jGeo.rotateX(Math.PI / 2);
      const j = new THREE.Mesh(jGeo, this.ciSteel);
      j.position.z = z;
      this.crankshaft.add(j);
    }

    // 4 crank throws
    const zThrows  = [-0.78, -0.26, 0.26, 0.78];
    const phases   = [0, Math.PI, Math.PI, 0];
    const r = 0.28;
    phases.forEach((ang, i) => {
      const z = zThrows[i];
      // Web
      const webGeo = new THREE.BoxGeometry(0.10, r * 1.45, 0.24);
      const web = new THREE.Mesh(webGeo, this.ciDarkHead);
      web.position.set(Math.sin(ang) * r * 0.5, Math.cos(ang) * r * 0.5, z);
      web.rotation.z = ang;
      this.crankshaft.add(web);
      // Crankpin
      const cpGeo = new THREE.CylinderGeometry(0.112, 0.112, 0.24, 16);
      cpGeo.rotateX(Math.PI / 2);
      const cp = new THREE.Mesh(cpGeo, this.ciSteel);
      cp.position.set(Math.sin(ang) * r, Math.cos(ang) * r, z);
      this.crankshaft.add(cp);
      // Counterweight (heavy, CI style)
      const cw1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, r * 1.25, 0.34), this.ciDarkHead
      );
      cw1.position.set(-Math.sin(ang) * r * 0.55, -Math.cos(ang) * r * 0.55, z);
      cw1.rotation.z = ang;
      this.crankshaft.add(cw1);
      const cw2Geo = new THREE.CylinderGeometry(0.24, 0.16, 0.32, 14);
      const cw2 = new THREE.Mesh(cw2Geo, this.ciDarkHead);
      cw2.position.set(-Math.sin(ang) * r * 0.88, -Math.cos(ang) * r * 0.88, z);
      cw2.rotation.set(Math.PI / 2, 0, ang);
      this.crankshaft.add(cw2);
    });

    this.crankshaft.position.set(0, -0.36, 0);
    this._reg(new THREE.Mesh(msGeo.clone(), this.ciSteel), {
      componentId: 'Crankshaft',
      name: 'Multi-Journal Crankshaft',
      category: 'POWER OUTPUT // FORGED ALLOY STEEL'
    });
    this.group.add(this.crankshaft);
  }

  // ── PISTONS & CONNECTING RODS ─────────────────────────────────────────────
  createPistonsAndRods() {
    const zPositions = [-0.78, -0.26, 0.26, 0.78];
    const phases     = [0, Math.PI, Math.PI, 0];

    zPositions.forEach((z, i) => {
      const pistonGrp = new THREE.Group();
      pistonGrp.name  = `Piston_${i + 1}`;

      // Crown (flat-top CI piston)
      const crGeo = new THREE.CylinderGeometry(0.350, 0.350, 0.34, 20);
      pistonGrp.add(new THREE.Mesh(crGeo, this.ciSteel));

      // Combustion bowl recessed on top
      const bowlGeo = new THREE.CylinderGeometry(0.180, 0.220, 0.06, 16);
      const bowl = new THREE.Mesh(bowlGeo, new THREE.MeshStandardMaterial({
        color: 0x2a3040, metalness: 0.80, roughness: 0.45
      }));
      bowl.position.y = 0.17;
      pistonGrp.add(bowl);

      // Piston skirt
      const skGeo = new THREE.CylinderGeometry(0.342, 0.342, 0.28, 20);
      const sk = new THREE.Mesh(skGeo, this.ciDarkHead);
      sk.position.y = -0.28;
      pistonGrp.add(sk);

      // 3 rings (2 compression + 1 oil)
      for (const [yOff, iw] of [[0.10, 0.012], [-0.04, 0.012], [-0.16, 0.016]]) {
        const rgGeo = new THREE.TorusGeometry(0.352, iw, 6, 28);
        const ring = new THREE.Mesh(rgGeo, this.ciSpring);
        ring.position.y = yOff;
        pistonGrp.add(ring);
      }

      // Wrist pin
      const wpGeo = new THREE.CylinderGeometry(0.040, 0.040, 0.70, 10);
      wpGeo.rotateZ(Math.PI / 2);
      pistonGrp.add(new THREE.Mesh(wpGeo, this.ciSteel));

      pistonGrp.position.set(0, 1.80, z);
      this.group.add(pistonGrp);
      this.pistons.push({ group: pistonGrp, angleOffset: phases[i] });

      // ── I-beam Connecting Rod ────────────────────────────────────────────
      const rodGrp = new THREE.Group();
      const rodLen = 0.80;

      // I-beam web
      rodGrp.add(new THREE.Mesh(
        new THREE.BoxGeometry(0.065, rodLen, 0.075),
        this.ciSteel
      ));
      // Top flange
      const tf = new THREE.Mesh(new THREE.BoxGeometry(0.17, rodLen, 0.016), this.ciSteel);
      tf.position.x = 0;
      // We want X flanges: rotate so flanges extend in X
      const tfGeo = new THREE.BoxGeometry(0.016, rodLen, 0.20);
      for (const xoff of [-0.038, 0.038]) {
        const f = new THREE.Mesh(tfGeo, this.ciSteel);
        f.position.x = xoff;
        rodGrp.add(f);
      }
      // Big-end bearing
      const beGeo = new THREE.CylinderGeometry(0.138, 0.138, 0.24, 16);
      const be = new THREE.Mesh(beGeo, this.ciDarkHead);
      be.position.y = -rodLen * 0.5;
      rodGrp.add(be);
      // Big-end cap (separate piece)
      const bcGeo = new THREE.BoxGeometry(0.32, 0.12, 0.26);
      const bc = new THREE.Mesh(bcGeo, this.ciDarkHead);
      bc.position.y = -rodLen * 0.5 - 0.10;
      rodGrp.add(bc);
      // 2 cap bolts
      for (const xb of [-0.082, 0.082]) {
        const cb = this._bolt(0.030, 0.14, this.ciSteel);
        cb.position.set(xb, -rodLen * 0.5 - 0.06, 0);
        rodGrp.add(cb);
      }
      // Small-end eye
      const seGeo = new THREE.CylinderGeometry(0.082, 0.082, 0.24, 14);
      const se = new THREE.Mesh(seGeo, this.ciDarkHead);
      se.position.y = rodLen * 0.5;
      rodGrp.add(se);

      rodGrp.position.set(0, 0.82, z);
      this.group.add(rodGrp);
      this.connectingRods.push({ group: rodGrp, angleOffset: phases[i] });
    });
  }

  // ── CYLINDER HEADS ────────────────────────────────────────────────────────
  createCylinderHeads() {
    // Single unified cylinder head (common for inline CI engines)
    const headGeo = new THREE.BoxGeometry(2.05, 0.68, 2.10);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x4a5568, metalness: 0.76, roughness: 0.32, name: 'CIHeadCasting'
    });
    const mainHead = new THREE.Mesh(headGeo, headMat);
    mainHead.position.y = 2.18;
    mainHead.castShadow = true;
    this._reg(mainHead, {
      componentId: 'CylinderHead',
      name: 'Unified 4-Cyl Cylinder Head',
      category: 'COMBUSTION CHAMBER // HEAVY-FUEL CI'
    });
    this.group.add(mainHead);
    this.cylinderHeads.push(mainHead);

    // Head gasket seam
    const gasGeo = new THREE.BoxGeometry(2.12, 0.018, 2.16);
    this.group.add(new THREE.Mesh(gasGeo, new THREE.MeshStandardMaterial({
      color: 0x1a2030, metalness: 0.3, roughness: 0.9
    }))).position.y = 1.84;

    // 16 cylinder head studs (4 per cylinder)
    for (let i = 0; i < 4; i++) {
      const z = -0.78 + i * 0.52;
      for (const [x, xz] of [[-0.72, -0.26], [0.72, -0.26], [-0.72, 0.26], [0.72, 0.26]]) {
        const stGeo = new THREE.CylinderGeometry(0.036, 0.036, 1.10, 8);
        const stud = new THREE.Mesh(stGeo, this.ciSteel);
        stud.position.set(x, 1.48, z + xz * 0.5);
        this.group.add(stud);
        this.headStuds.push(stud);
        // Nut
        const nutGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.046, 6);
        const nut = new THREE.Mesh(nutGeo, this.ciSteel);
        nut.position.set(x, 2.07, z + xz * 0.5);
        this.group.add(nut);
      }
    }

    // Per-cylinder valve detail (4 intakes + 4 exhausts visible from front)
    for (let i = 0; i < 4; i++) {
      const z = -0.78 + i * 0.52;
      // Valve cover per cylinder
      const vcGeo = new THREE.BoxGeometry(1.85, 0.12, 0.40);
      const vc = new THREE.Mesh(vcGeo, new THREE.MeshStandardMaterial({
        color: 0x1d4ed8, metalness: 0.88, roughness: 0.22
      }));
      vc.position.set(0, 2.56, z);
      this.group.add(vc);

      // 2 intake + 2 exhaust valve stems (visible from side)
      for (const [xp, isEx] of [[-0.38, false], [-0.12, false], [0.12, true], [0.38, true]]) {
        // Valve stem
        const vsGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.58, 8);
        const vs = new THREE.Mesh(vsGeo, isEx
          ? new THREE.MeshStandardMaterial({ color: 0x78716c, metalness: 0.85, roughness: 0.22 })
          : this.ciSteel
        );
        vs.position.set(xp, 2.20, z);
        this.group.add(vs);

        // Valve spring
        const spr = this._spring(2.10, 2.46, xp, z, 0.038, 5.5, 0.009, this.ciSpring);
        if (spr) this.group.add(spr);

        // Valve head (disc)
        const vhGeo = new THREE.CylinderGeometry(0.060, 0.060, 0.016, 14);
        const vh = new THREE.Mesh(vhGeo, isEx
          ? new THREE.MeshStandardMaterial({ color: 0x78716c, metalness: 0.82, roughness: 0.25 })
          : this.ciSteel
        );
        vh.position.set(xp, 1.90, z);
        this.group.add(vh);
      }

      // DOHC camshaft caps (visible on head top)
      for (const cx of [-0.28, 0.28]) {
        const camGeo = new THREE.CylinderGeometry(0.060, 0.060, 2.05, 14);
        camGeo.rotateX(Math.PI / 2);
        const cam = new THREE.Mesh(camGeo, this.ciDarkHead);
        cam.position.set(cx, 2.60, 0);
        this.group.add(cam);
        // Cam lobes (simplified bumps)
        for (let ci = 0; ci < 4; ci++) {
          const clGeo = new THREE.CylinderGeometry(0.080, 0.060, 0.10, 12);
          clGeo.rotateX(Math.PI / 2);
          const cl = new THREE.Mesh(clGeo, this.ciDarkHead);
          cl.position.set(cx, 2.62, -0.78 + ci * 0.52);
          this.group.add(cl);
        }
      }
    }

    // Injector bodies (1 per cylinder, top-down)
    for (let i = 0; i < 4; i++) {
      const z = -0.78 + i * 0.52;
      const injGeo = new THREE.CylinderGeometry(0.038, 0.030, 0.60, 12);
      const inj = new THREE.Mesh(injGeo, this.ciInjector.clone());
      inj.position.set(0, 2.20, z);
      this.group.add(inj);
      this.injectors.push(inj);

      // Solenoid body
      const solGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.10, 10);
      const sol = new THREE.Mesh(solGeo, this.ciDarkHead);
      sol.position.set(0, 2.50, z);
      this.group.add(sol);

      // Injection flash (small emissive disc)
      const flashGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.025, 12);
      const flashMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24, emissive: new THREE.Color(0xf59e0b),
        emissiveIntensity: 0, transparent: true, opacity: 0.85,
        name: `FlashMat${i}`
      });
      const flash = new THREE.Mesh(flashGeo, flashMat);
      flash.position.set(0, 1.95, z);
      this.group.add(flash);
      this.fuelPulses.push(flash);

      // Spray cone
      const coneGeo = new THREE.ConeGeometry(0.12, 0.30, 12);
      const coneMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24, transparent: true, opacity: 0, name: `SprayCone${i}`
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(0, 1.75, z);
      cone.rotation.x = Math.PI;
      this.group.add(cone);
      this.sprayCones.push(cone);

      // Spark light (CI uses heat, not spark, but we keep for visual effect)
      const sl = new THREE.PointLight(0xf59e0b, 0, 1.6);
      sl.position.set(0, 1.90, z);
      this.group.add(sl);
      this.sprayLights.push(sl);
    }
  }

  // ── COMMON RAIL FUEL SYSTEM ────────────────────────────────────────────────
  createCommonRailSystem() {
    // High-pressure common rail (runs along Z axis, right side)
    const railGeo = new THREE.CylinderGeometry(0.048, 0.048, 2.10, 18);
    railGeo.rotateX(Math.PI / 2);
    this.commonRailMesh = new THREE.Mesh(railGeo, this.ciCopper);
    this.commonRailMesh.position.set(0.88, 2.38, 0);
    this._reg(this.commonRailMesh, {
      componentId: 'CommonRail',
      name: 'High-Pressure Common Fuel Rail',
      category: 'FUEL DELIVERY // 1800 bar COMMON RAIL'
    });
    this.group.add(this.commonRailMesh);

    // Rail end caps
    for (const ze of [-1.07, 1.07]) {
      const ecGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.058, 10);
      this.group.add(new THREE.Mesh(ecGeo, this.ciCopper)).position.set(0.88, 2.38, ze);
    }

    // Pressure sensor at one end
    const psGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.12, 10);
    const pSensor = new THREE.Mesh(psGeo, this.ciDarkHead);
    pSensor.position.set(0.88, 2.38, -1.05);
    pSensor.rotation.z = Math.PI / 2;
    this.group.add(pSensor);

    // 4 braided high-pressure feed lines (rail → injectors)
    for (let i = 0; i < 4; i++) {
      const z = -0.78 + i * 0.52;
      const feedMesh = this._tube([
        [0.88, 2.38, z], [0.55, 2.55, z], [0.18, 2.55, z], [0, 2.50, z]
      ], 0.018, new THREE.MeshStandardMaterial({
        color: 0x4a5568, metalness: 0.80, roughness: 0.40
      }));
      if (feedMesh) this.group.add(feedMesh);
      // AN hex fitting at injector end
      const afGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.042, 6);
      afGeo.rotateZ(Math.PI / 2);
      const af = new THREE.Mesh(afGeo, this.ciCopper);
      af.position.set(0.04, 2.52, z);
      this.group.add(af);
    }

    // High-pressure fuel pump (right rear of block)
    const hpfpGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.38, 16);
    hpfpGeo.rotateZ(Math.PI / 2);
    this.hpfpPumpMesh = new THREE.Mesh(hpfpGeo, this.ciDarkHead);
    this.hpfpPumpMesh.position.set(0.88, 1.42, -0.95);
    this._reg(this.hpfpPumpMesh, {
      componentId: 'HPFP',
      name: 'High-Pressure Fuel Pump',
      category: 'FUEL DELIVERY // RADIAL PISTON PUMP'
    });
    this.group.add(this.hpfpPumpMesh);

    // HPFP to rail feed line
    const hlMesh = this._tube([
      [0.88, 1.62, -0.95], [0.88, 2.00, -0.95], [0.88, 2.38, -1.0]
    ], 0.022, this.ciCopper);
    if (hlMesh) this.group.add(hlMesh);

    // Low-pressure fuel filter
    const ffGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.30, 14);
    const ff = new THREE.Mesh(ffGeo, new THREE.MeshStandardMaterial({
      color: 0x5c2d0e, metalness: 0.45, roughness: 0.62
    }));
    ff.position.set(0.88, 0.70, -1.05);
    this._reg(ff, {
      componentId: 'FuelFilter', name: 'Fuel Pre-filter', category: 'FUEL DELIVERY // LP FILTER'
    });
    this.group.add(ff);
  }

  // ── MANIFOLDS ─────────────────────────────────────────────────────────────
  createManifolds() {
    // Intake manifold (left side, blue)
    const iManGeo = new THREE.BoxGeometry(0.38, 0.52, 2.0);
    const iMan = new THREE.Mesh(iManGeo, new THREE.MeshStandardMaterial({
      color: 0x0a3a6e, metalness: 0.60, roughness: 0.38, name: 'IntakeManifold'
    }));
    iMan.position.set(-0.94, 2.14, 0);
    this._reg(iMan, {
      componentId: 'IntakeManifold',
      name: 'Intake Manifold / Plenum',
      category: 'AIR INTAKE // CHARGED AIR DISTRIBUTION'
    });
    this.group.add(iMan);

    // Intake runners (4)
    for (let i = 0; i < 4; i++) {
      const z = -0.78 + i * 0.52;
      const rn = this._tube([
        [-0.94, 2.14, z], [-0.78, 2.22, z], [-0.62, 2.28, z]
      ], 0.058, new THREE.MeshStandardMaterial({
        color: 0x0a3a6e, metalness: 0.6, roughness: 0.38
      }));
      if (rn) this.group.add(rn);
    }

    // Exhaust manifold 4-1 collector (right side, dark cast iron)
    // Individual port tubes
    const portTubes = [];
    for (let i = 0; i < 4; i++) {
      const z = -0.78 + i * 0.52;
      const pt = this._tube([
        [0.94, 2.18, z], [1.12, 2.02, z], [1.25, 1.72, z * 0.55]
      ], 0.062, this.ciExhaust);
      if (pt) { this.group.add(pt); portTubes.push(pt); }
    }
    // Collector cone
    const collGeo = new THREE.CylinderGeometry(0.22, 0.12, 0.55, 14);
    collGeo.rotateX(Math.PI / 2);
    this.exhaustPlenumMesh = new THREE.Mesh(collGeo, this.ciExhaust);
    this.exhaustPlenumMesh.position.set(1.28, 1.48, 0);
    this._reg(this.exhaustPlenumMesh, {
      componentId: 'ExhaustManifold',
      name: 'Exhaust 4-1 Collector Manifold',
      category: 'EXHAUST // CAST IRON EQUAL-LENGTH'
    });
    this.group.add(this.exhaustPlenumMesh);

    // Exhaust outlet stub
    const outGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.42, 12);
    outGeo.rotateX(Math.PI / 2);
    const out = new THREE.Mesh(outGeo, this.ciExhaust);
    out.position.set(1.28, 1.48, -0.74);
    this.group.add(out);
  }

  // ── OIL SUMP ─────────────────────────────────────────────────────────────
  createOilSump() {
    const sumpGeo = new THREE.BoxGeometry(2.05, 0.58, 2.10);
    this.oilSumpMesh = new THREE.Mesh(sumpGeo, this.materials.darkComposite);
    this.oilSumpMesh.position.y = -1.07;
    this.oilSumpMesh.castShadow = true;
    this._reg(this.oilSumpMesh, {
      componentId: 'OilSump',
      name: 'Deep Ribbed Oil Sump',
      category: 'LUBRICATION CIRCUIT // WET SUMP'
    });
    this.group.add(this.oilSumpMesh);

    // Sump ribs
    for (let z = -1.02; z <= 1.02; z += 0.34) {
      const rGeo = new THREE.BoxGeometry(2.08, 0.060, 0.065);
      const r = new THREE.Mesh(rGeo, this.materials.darkComposite);
      r.position.set(0, -1.20, z);
      this.group.add(r);
    }

    // Oil filter
    const ofGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.38, 16);
    const oFilter = new THREE.Mesh(ofGeo, new THREE.MeshStandardMaterial({
      color: 0x5c2d0e, metalness: 0.45, roughness: 0.62
    }));
    oFilter.position.set(-0.88, -0.72, -0.80);
    oFilter.rotation.z = Math.PI / 2;
    this._reg(oFilter, {
      componentId: 'OilFilter', name: 'Spin-On Oil Filter', category: 'LUBRICATION // CI GRADE'
    });
    this.group.add(oFilter);

    // Oil cooler
    const ocGeo = new THREE.BoxGeometry(0.42, 0.32, 0.68);
    const oc = new THREE.Mesh(ocGeo, new THREE.MeshStandardMaterial({
      color: 0x7a8898, metalness: 0.72, roughness: 0.30
    }));
    oc.position.set(-0.88, -0.32, 0.80);
    this.group.add(oc);
    // Cooler fins
    for (let z = -0.28; z <= 0.28; z += 0.07) {
      const fg = new THREE.BoxGeometry(0.44, 0.28, 0.014);
      const fm = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({
        color: 0x9fb0c0, metalness: 0.82, roughness: 0.24
      }));
      fm.position.set(-0.88, -0.32, 0.80 + z);
      this.group.add(fm);
    }

    // Oil drain plug
    const dpGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.08, 8);
    const dp = new THREE.Mesh(dpGeo, this.ciSteel);
    dp.position.y = -1.38;
    this.group.add(dp);
  }

  // ── GEARBOX & PROPELLER ───────────────────────────────────────────────────
  createGearboxAndPropeller() {
    // Reduction gearbox
    const gbGeo = new THREE.CylinderGeometry(0.56, 0.72, 0.72, 22);
    gbGeo.rotateX(Math.PI / 2);
    const gb = new THREE.Mesh(gbGeo, this.materials.castAluminum);
    gb.position.set(0, 0.65, 1.56);
    this.group.add(gb);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rGeo = new THREE.BoxGeometry(0.068, 0.28, 0.72);
      const rm = new THREE.Mesh(rGeo, this.materials.castAluminum);
      rm.position.set(Math.cos(a) * 0.42, Math.sin(a) * 0.42 + 0.65, 1.56);
      rm.rotation.z = a;
      this.group.add(rm);
    }

    // Prop shaft
    const psGeo = new THREE.CylinderGeometry(0.090, 0.090, 0.44, 14);
    psGeo.rotateX(Math.PI / 2);
    const pShaft = new THREE.Mesh(psGeo, this.ciSteel);
    pShaft.position.set(0, 0.65, 2.08);
    this.group.add(pShaft);

    // Hub + spinner
    const hubGrp = new THREE.Group();
    hubGrp.position.set(0, 0.65, 2.30);
    const flangeGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.10, 20);
    flangeGeo.rotateX(Math.PI / 2);
    hubGrp.add(new THREE.Mesh(flangeGeo, this.materials.castAluminum));
    const spinnerGeo = new THREE.ConeGeometry(0.33, 0.68, 20);
    spinnerGeo.rotateX(Math.PI / 2);
    const spinner = new THREE.Mesh(spinnerGeo, this.ciSteel);
    spinner.position.z = 0.38;
    hubGrp.add(spinner);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const hb = new THREE.Group();
      const hbH = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.034, 6), this.ciSteel);
      const hbS = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.070, 10), this.ciSteel);
      hbH.position.y = 0.052;
      hb.add(hbH); hb.add(hbS);
      hb.position.set(Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0);
      hubGrp.add(hb);
    }

    this.propeller = new THREE.Group();
    this.propeller.position.z = 0.38;
    for (let b = 0; b < 3; b++) {
      const ba = (b / 3) * Math.PI * 2;
      const bg = new THREE.Group();
      bg.rotation.z = ba;
      for (const [by, blen, bw, br] of [[0.20, 0.40, 0.24, 0.060], [0.60, 0.60, 0.18, 0.046], [1.12, 0.52, 0.12, 0.030]]) {
        const bG = new THREE.BoxGeometry(bw, blen, br);
        const bM = new THREE.Mesh(bG, this.materials.propellerBlade);
        bM.position.y = by;
        bM.rotation.z = (b === 0 ? 0.14 : b === 1 ? 0.10 : 0.06);
        bg.add(bM);
      }
      this.propeller.add(bg);
    }
    hubGrp.add(this.propeller);
    this.group.add(hubGrp);
    this._propHub = hubGrp;
  }

  // ── ECU ───────────────────────────────────────────────────────────────────
  createECU() {
    const ecuGeo = new THREE.BoxGeometry(0.30, 0.56, 0.76);
    this.ecuMesh = new THREE.Mesh(ecuGeo, this.materials.ecuMat);
    this.ecuMesh.position.set(-0.88, 0.96, -1.12);
    this._reg(this.ecuMesh, {
      componentId: 'ECU', name: 'Engine Control Unit (ECU)', category: 'ELECTRONIC CONTROL'
    });
    this.group.add(this.ecuMesh);
  }

  setupExplodedBaselines() {
    // Snapshot current positions for exploded-view animation
    const toTrack = [
      this.engineBlockMesh,
      this.oilSumpMesh,
      this.exhaustPlenumMesh,
      this.ecuMesh,
      ...this.cylinderHeads
    ];
    toTrack.forEach(m => {
      if (m) this.baseExplodedPositions.set(m.uuid, m.position.clone());
    });
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────────────

  setExplodedView(factor) {
    this.explodedFactor = factor;
    this.cylinderHeads.forEach(h => {
      const base = this.baseExplodedPositions.get(h.uuid);
      if (base) h.position.y = base.y + factor * 1.10;
    });
    if (this._propHub) this._propHub.position.z = 2.30 + factor * 1.20;
    this.outerHousingMeshes.forEach(m => {
      m.material.opacity = Math.max(0.05, 0.18 - factor * 0.16);
    });
  }

  setXRay(enabled) {
    this.isXRay = enabled;
    this.outerHousingMeshes.forEach(m => {
      m.material.opacity = enabled ? 0.06 : 0.18;
    });
    this.cylinderBarrels.forEach(b => {
      b.material.transparent = enabled;
      b.material.opacity     = enabled ? 0.20 : 1.0;
      b.material.depthWrite  = !enabled;
    });
  }

  toggleLabels() {}

  update(packet, deltaSeconds) {
    if (!packet || !packet.engine) return;
    const rpm       = packet.engine.rpm || 4800;
    const isRunning = packet.status === 'RUNNING';

    // Crank rotation
    const visRevSec = isRunning ? (rpm / 4800) * 4.2 : 0;
    this.crankAngle = (this.crankAngle + visRevSec * Math.PI * 2 * deltaSeconds) % (Math.PI * 2);
    if (this.crankshaft) this.crankshaft.rotation.z = this.crankAngle;
    if (this.propeller)  this.propeller.rotation.z  = this.crankAngle / 1.85;

    // Vertical piston kinematics
    for (let i = 0; i < this.pistons.length; i++) {
      const p    = this.pistons[i];
      const rod  = this.connectingRods[i];
      const ang  = this.crankAngle + p.angleOffset;
      const r = 0.28, l = 0.85;
      const dispY = r * Math.cos(ang) + Math.sqrt(Math.max(0.01, l * l - (r * Math.sin(ang)) ** 2));
      p.group.position.y = 0.30 + dispY * 0.65;
      const rodAng = Math.asin(Math.min(1, Math.max(-1, r * Math.sin(ang) / l)));
      rod.group.position.x = -r * Math.sin(ang) * 0.5;
      rod.group.position.y = -0.20 + r * Math.cos(ang);
      rod.group.rotation.z = rodAng;

      // Injection flash near TDC
      const nearTDC = Math.abs(ang % (Math.PI * 2)) < 0.28;
      if (this.fuelPulses[i]) {
        this.fuelPulses[i].material.opacity = (isRunning && nearTDC) ? 0.88 : this.fuelPulses[i].material.opacity * 0.78;
      }
      if (this.sprayCones[i]) {
        this.sprayCones[i].material.opacity = (isRunning && nearTDC) ? 0.72 : this.sprayCones[i].material.opacity * 0.70;
      }
      if (this.sprayLights[i]) {
        this.sprayLights[i].intensity = (isRunning && nearTDC) ? 1.8 + 0.4 * Math.sin(Date.now() * 0.05) : 0;
      }
    }

    // Thermal shifts on cylinder heads
    const meanCht = packet.engine.cht_c     || 112.5;
    const meanEgt = packet.engine.egt_c     || 685.0;
    this.cylinderHeads.forEach(head => {
      let ec = 0x000000, ei = 0;
      if      (meanCht > 125 || meanEgt > 740) { ec = 0xdc2626; ei = 0.60; }
      else if (meanCht > 118 || meanEgt > 710) { ec = 0xea580c; ei = 0.40; }
      else if (meanCht > 114)                  { ec = 0xd97706; ei = 0.20; }
      head.material.emissive.setHex(ec);
      head.material.emissiveIntensity = ei;
    });
    // Exhaust manifold glow
    if (this.exhaustPlenumMesh) {
      let ec = 0x000000, ei = 0;
      if      (meanEgt > 760) { ec = 0xef4444; ei = 0.65; }
      else if (meanEgt > 710) { ec = 0xea580c; ei = 0.45; }
      else if (meanEgt > 670) { ec = 0xd97706; ei = 0.22; }
      this.exhaustPlenumMesh.material.emissive.setHex(ec);
      this.exhaustPlenumMesh.material.emissiveIntensity = ei;
    }

    // Injector fault
    const hasInjFault = packet.faults && packet.faults.injector_degradation_severity > 0;
    this.injectors.forEach((inj, idx) => {
      if (hasInjFault && idx === 2) {
        inj.material.color.setHex(0xf59e0b);
        inj.material.emissive.setHex(0xf59e0b);
        inj.material.emissiveIntensity = 0.70 + 0.28 * Math.sin(Date.now() * 0.010);
      } else {
        inj.material.color.setHex(0x0284c7);
        inj.material.emissive.setHex(0x000000);
        inj.material.emissiveIntensity = 0;
      }
    });

    // Fuel rail pressure tint
    const railP = packet.engine.fuel_rail_press_bar || 1450;
    if (this.commonRailMesh) {
      this.commonRailMesh.material.color.setHex(
        railP < 1250 ? 0xdc2626 : railP < 1350 ? 0xf59e0b : 0xb45309
      );
    }

    // Vibration (diesel knock)
    const vibRms = packet.engine.vibration_rms_g || 0.58;
    if (isRunning) {
      const amp  = Math.min(0.09, vibRms * 0.035);
      const freq = Date.now() * 0.045;
      this.group.position.x = Math.sin(freq) * amp;
      this.group.position.y = Math.cos(freq * 1.2) * amp * 0.80;
    } else {
      this.group.position.set(0, 0, 0);
    }
  }

  dispose() {
    this.group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    this.scene.remove(this.group);
  }
}

if (typeof window !== 'undefined') window.HeavyFuelEngineModel = HeavyFuelEngineModel;

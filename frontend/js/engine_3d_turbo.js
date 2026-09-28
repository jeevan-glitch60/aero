/**
 * ============================================================================
 * AEROTWIN // 3D TURBOCHARGED INLINE-4 ENGINE MODEL v2.0
 * ============================================================================
 * Professional engineering cutaway — 4-cyl turbo forced-induction aero engine.
 * Upgraded: detailed block with ribbed exterior, I-beam conrods, piston rings,
 * turbocharger with compressor and turbine scroll detail, 4-1 exhaust manifold,
 * front-mount intercooler with visible fins, boost piping circuit.
 *
 * SYNTHETIC ENGINE CUTAWAY — NOT CERTIFIED CAD OR FLIGHT SOFTWARE
 */

'use strict';

class TurbochargedEngineModel {
  constructor(scene, materials) {
    this.scene     = scene;
    this.materials = materials;
    this.group     = new THREE.Group();
    this.group.name = 'TurbochargedEngineRoot';

    // Kinematic refs
    this.crankshaft       = null;
    this.propeller        = null;
    this.pistons          = [];
    this.connectingRods   = [];
    this.cylinderHeads    = [];
    this.compressorWheel  = null;
    this.turbineWheel     = null;
    this.turbineScrollMesh = null;
    this.exhManifoldMesh  = null;
    this.wastegateActuator = null;
    this.wastegateRod     = null;
    this.intercoolerMesh  = null;
    this.boostPipeMesh    = null;
    this.bovValveMesh     = null;
    this.sparkLights      = [];
    this.engineBlockMesh  = null;
    this.ecuMesh          = null;
    this.outerHousingMeshes = [];

    // Particle flow
    this.chargeAirParticles  = null;
    this.exhaustGasParticles = null;

    // Interactive
    this.interactiveMeshes = [];

    // State
    this.crankAngle   = 0;
    this.turboAngle   = 0;
    this.isXRay       = false;
    this.explodedFactor = 0;

    this._initMaterials();
    this.initModel();
  }

  _initMaterials() {
    this.tBlockMat = new THREE.MeshStandardMaterial({
      color: 0x475569, metalness: 0.80, roughness: 0.35, name: 'TurboBlock'
    });
    this.tCompMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, metalness: 0.92, roughness: 0.12, name: 'CompressorAl'
    });
    this.tScrollMat = new THREE.MeshStandardMaterial({
      color: 0x5c3d0a, metalness: 0.78, roughness: 0.40, name: 'TurbineScroll'
    });
    this.tExhMat = new THREE.MeshStandardMaterial({
      color: 0x374151, metalness: 0.82, roughness: 0.36, name: 'ExhaustCI'
    });
    this.tHeadMat = new THREE.MeshStandardMaterial({
      color: 0x4a5568, metalness: 0.76, roughness: 0.32, name: 'HeadCasting'
    });
    this.tHeadCoverMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, metalness: 0.88, roughness: 0.22, name: 'ValveCoverBlue'
    });
    this.tSpringMat = new THREE.MeshStandardMaterial({
      color: 0xb8c5d0, metalness: 0.95, roughness: 0.12, name: 'ValveSpring'
    });
    this.tIcMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, metalness: 0.72, roughness: 0.30, name: 'Intercooler'
    });
    this.tIcFinMat = new THREE.MeshStandardMaterial({
      color: 0xb0bec5, metalness: 0.80, roughness: 0.22, name: 'ICFin'
    });
    this.tBoostMat = new THREE.MeshStandardMaterial({
      color: 0x0a3a6e, metalness: 0.60, roughness: 0.38, name: 'BoostPipe'
    });
    this.tWgMat = new THREE.MeshStandardMaterial({
      color: 0x374151, metalness: 0.85, roughness: 0.28, name: 'Wastegate'
    });
    this.tRubberMat = new THREE.MeshStandardMaterial({
      color: 0x1a1d24, metalness: 0.04, roughness: 0.88, name: 'HoseSilicone'
    });
    this.tDarkSteel = new THREE.MeshStandardMaterial({
      color: 0x3d4756, metalness: 0.88, roughness: 0.36, name: 'DarkSteel'
    });
    this.tLinerMat = new THREE.MeshStandardMaterial({
      color: 0x8faabb, metalness: 0.88, roughness: 0.18, name: 'CylinderLiner'
    });
    this.tWaterJacket = new THREE.MeshStandardMaterial({
      color: 0x0369a1, metalness: 0.50, roughness: 0.35,
      transparent: true, opacity: 0.16, depthWrite: false, name: 'WaterJacket'
    });
    this.tHousing = new THREE.MeshStandardMaterial({
      color: 0x4a5568, metalness: 0.70, roughness: 0.30,
      transparent: true, opacity: 0.16, depthWrite: false,
      side: THREE.DoubleSide, name: 'TurboHousing'
    });
    this.tPistonMat = new THREE.MeshStandardMaterial({
      color: 0xc8d0dc, metalness: 0.88, roughness: 0.20, name: 'ForgedPiston'
    });
    this.tBrassMat = new THREE.MeshStandardMaterial({
      color: 0xb45309, metalness: 0.88, roughness: 0.22, name: 'BrassAN'
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
    return new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.max(6, pts.length * 4), r, 8, false),
      mat
    );
  }

  _bolt(rS, h, mat) {
    const g = new THREE.Group();
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(rS * 1.7, rS * 1.7, rS * 0.9, 6), mat
    );
    head.position.set(0, h * 0.5 + rS * 0.45, 0);
    g.add(head);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(rS, rS, h, 10), mat));
    return g;
  }

  _spring(y0, y1, x, z, cr, turns, wr, mat) {
    const segs = Math.ceil(turns * 18);
    const pts  = [];
    for (let i = 0; i <= segs; i++) {
      const t   = i / segs;
      const ang = t * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(x + cr * Math.cos(ang), y0 + (y1 - y0) * t, z + cr * Math.sin(ang)));
    }
    return new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segs, wr, 6, false),
      mat
    );
  }

  initModel() {
    this.createOuterHousing();
    this.createEngineCore();
    this.createPistonsAndCrank();
    this.createCylinderHead();
    this.createTurbochargerAssembly();
    this.createIntercoolerAndPiping();
    this.createPropeller();
    this.createParticleSystems();
    this.createAccessories();
  }

  // ── OUTER HOUSING ─────────────────────────────────────────────────────────
  createOuterHousing() {
    const mainGeo = new THREE.BoxGeometry(2.20, 3.20, 2.20);
    const main    = new THREE.Mesh(mainGeo, this.tHousing);
    main.position.y = 0.50;
    this.group.add(main);
    this.outerHousingMeshes.push(main);

    const cowlGeo = new THREE.CylinderGeometry(0.60, 0.76, 0.75, 22);
    cowlGeo.rotateX(Math.PI / 2);
    const cowl = new THREE.Mesh(cowlGeo, this.tHousing);
    cowl.position.set(0, 0.50, 1.52);
    this.group.add(cowl);
    this.outerHousingMeshes.push(cowl);
  }

  // ── ENGINE BLOCK ──────────────────────────────────────────────────────────
  createEngineCore() {
    // Main 4-cyl block
    const blockGeo = new THREE.BoxGeometry(2.05, 2.80, 2.10);
    this.engineBlockMesh = new THREE.Mesh(blockGeo, this.tBlockMat);
    this.engineBlockMesh.position.y = 0.52;
    this.engineBlockMesh.castShadow  = true;
    this.engineBlockMesh.receiveShadow = true;
    this._reg(this.engineBlockMesh, {
      componentId: 'EngineBlock',
      name: 'Turbocharged Inline 4 Block',
      category: 'STRUCTURAL CORE // CAST ALUMINIUM ALLOY'
    });
    this.group.add(this.engineBlockMesh);

    // External ribs
    for (const x of [-1.06, 1.06]) {
      for (let y = -0.80; y <= 1.80; y += 0.42) {
        const rGeo = new THREE.BoxGeometry(0.062, 0.065, 2.12);
        const r = new THREE.Mesh(rGeo, this.tBlockMat);
        r.position.set(x, y + 0.52, 0);
        this.group.add(r);
      }
    }

    // Water jacket (semi-transparent)
    for (let i = 0; i < 4; i++) {
      const z = -0.78 + i * 0.52;
      const wjGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.60, 20);
      const wj = new THREE.Mesh(wjGeo, this.tWaterJacket);
      wj.position.set(0, 1.18, z);
      this.group.add(wj);
    }

    // 4 cylinder liners
    for (let i = 0; i < 4; i++) {
      const z = -0.78 + i * 0.52;
      const lGeo = new THREE.CylinderGeometry(0.340, 0.340, 1.58, 20);
      const liner = new THREE.Mesh(lGeo, this.tLinerMat.clone());
      liner.position.set(0, 1.16, z);
      this.group.add(liner);
    }

    // Lower crankcase skirt
    const skGeo = new THREE.BoxGeometry(2.05, 0.80, 2.10);
    const sk = new THREE.Mesh(skGeo, this.tBlockMat);
    sk.position.y = -0.58;
    this.group.add(sk);

    // 5 main bearing caps
    for (let i = 0; i < 5; i++) {
      const z = -1.04 + i * 0.52;
      const capGeo = new THREE.BoxGeometry(1.80, 0.19, 0.38);
      const cap = new THREE.Mesh(capGeo, this.tDarkSteel);
      cap.position.set(0, -0.42, z);
      this.group.add(cap);
      for (const x of [-0.54, 0.54]) {
        const bt = this._bolt(0.038, 0.22, this.materials.polishedSteel);
        bt.position.set(x, -0.28, z);
        this.group.add(bt);
      }
    }

    // Crankshaft
    this.crankshaft = new THREE.Group();
    const msGeo = new THREE.CylinderGeometry(0.145, 0.145, 2.22, 20);
    msGeo.rotateX(Math.PI / 2);
    this.crankshaft.add(new THREE.Mesh(msGeo, this.materials.polishedSteel));
    // 5 journals
    for (const z of [-1.04, -0.52, 0, 0.52, 1.04]) {
      const jGeo = new THREE.CylinderGeometry(0.175, 0.175, 0.21, 20);
      jGeo.rotateX(Math.PI / 2);
      const j = new THREE.Mesh(jGeo, this.materials.polishedSteel);
      j.position.z = z;
      this.crankshaft.add(j);
    }
    // 4 crank throws
    const zT = [-0.78, -0.26, 0.26, 0.78];
    const pH = [0, Math.PI, Math.PI, 0];
    const rC = 0.28;
    pH.forEach((ang, i) => {
      const z = zT[i];
      const webGeo = new THREE.BoxGeometry(0.09, rC * 1.42, 0.23);
      const web = new THREE.Mesh(webGeo, this.tDarkSteel);
      web.position.set(Math.sin(ang) * rC * 0.50, Math.cos(ang) * rC * 0.50, z);
      web.rotation.z = ang;
      this.crankshaft.add(web);
      const cpGeo = new THREE.CylinderGeometry(0.108, 0.108, 0.22, 16);
      cpGeo.rotateX(Math.PI / 2);
      const cp = new THREE.Mesh(cpGeo, this.materials.polishedSteel);
      cp.position.set(Math.sin(ang) * rC, Math.cos(ang) * rC, z);
      this.crankshaft.add(cp);
      const cw1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, rC * 1.20, 0.32), this.tDarkSteel);
      cw1.position.set(-Math.sin(ang) * rC * 0.52, -Math.cos(ang) * rC * 0.52, z);
      cw1.rotation.z = ang;
      this.crankshaft.add(cw1);
    });
    this.crankshaft.position.set(0, -0.34, 0);
    this.group.add(this.crankshaft);
  }

  // ── PISTONS & CONNECTING RODS ─────────────────────────────────────────────
  createPistonsAndCrank() {
    const zP = [-0.78, -0.26, 0.26, 0.78];
    const pH = [0, Math.PI, Math.PI, 0];
    zP.forEach((z, i) => {
      // Piston
      const pGrp = new THREE.Group();
      // Crown (domed for turbocharged compression ratio)
      const crGeo = new THREE.CylinderGeometry(0.325, 0.325, 0.30, 20);
      pGrp.add(new THREE.Mesh(crGeo, this.tPistonMat));
      // Valve relief pockets
      const vRelGeo = new THREE.CylinderGeometry(0.060, 0.060, 0.04, 12);
      for (const [vx, vz] of [[-0.12, -0.08], [0.12, -0.08], [-0.12, 0.08], [0.12, 0.08]]) {
        const vr = new THREE.Mesh(vRelGeo, new THREE.MeshStandardMaterial({
          color: 0x2a3040, metalness: 0.80, roughness: 0.45
        }));
        vr.position.set(vx, 0.15, vz);
        pGrp.add(vr);
      }
      // Skirt
      const skGeo = new THREE.CylinderGeometry(0.318, 0.318, 0.26, 20);
      const sk = new THREE.Mesh(skGeo, this.tDarkSteel);
      sk.position.y = -0.26;
      pGrp.add(sk);
      // 3 rings
      for (const [yo, iw] of [[0.08, 0.012], [-0.06, 0.012], [-0.18, 0.016]]) {
        const rGeo = new THREE.TorusGeometry(0.328, iw, 6, 28);
        const r = new THREE.Mesh(rGeo, this.tSpringMat);
        r.position.set(0, yo, 0);
        pGrp.add(r);
      }
      // Wrist pin
      const wpGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.66, 10);
      wpGeo.rotateZ(Math.PI / 2);
      pGrp.add(new THREE.Mesh(wpGeo, this.materials.polishedSteel));
      pGrp.position.set(0, 1.76, z);
      this.group.add(pGrp);
      this.pistons.push({ group: pGrp, angleOffset: pH[i] });

      // I-beam Connecting Rod
      const rGrp = new THREE.Group();
      const rLen = 0.82;
      rGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.062, rLen, 0.070), this.materials.polishedSteel));
      for (const xf of [-0.036, 0.036]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.014, rLen, 0.19), this.materials.polishedSteel);
        side.position.set(xf, 0, 0);
        rGrp.add(side);
      }
      const beGeo = new THREE.CylinderGeometry(0.132, 0.132, 0.22, 16);
      const be = new THREE.Mesh(beGeo, this.tDarkSteel);
      be.position.y = -rLen * 0.5;
      rGrp.add(be);
      for (const xb of [-0.078, 0.078]) {
        const cb = this._bolt(0.028, 0.12, this.materials.polishedSteel);
        cb.position.set(xb, -rLen * 0.5 - 0.04, 0);
        rGrp.add(cb);
      }
      const seGeo = new THREE.CylinderGeometry(0.078, 0.078, 0.22, 14);
      const se = new THREE.Mesh(seGeo, this.tDarkSteel);
      se.position.y = rLen * 0.5;
      rGrp.add(se);
      rGrp.position.set(0, 0.78, z);
      this.group.add(rGrp);
      this.connectingRods.push({ group: rGrp, angleOffset: pH[i] });
    });
  }

  // ── CYLINDER HEAD ─────────────────────────────────────────────────────────
  createCylinderHead() {
    // Unified cylinder head
    const headGeo = new THREE.BoxGeometry(2.05, 0.66, 2.10);
    const head = new THREE.Mesh(headGeo, this.tHeadMat);
    head.position.y = 2.10;
    head.castShadow = true;
    this._reg(head, {
      componentId: 'CylinderHead',
      name: 'DOHC 4-Valve Cylinder Head',
      category: 'COMBUSTION CHAMBER // TURBOCHARGED'
    });
    this.group.add(head);
    this.cylinderHeads.push(head);

    // Head gasket
    const gasket = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.016, 2.16),
      new THREE.MeshStandardMaterial({ color: 0x1a2030, metalness: 0.3, roughness: 0.9 }));
    gasket.position.set(0, 1.78, 0);
    this.group.add(gasket);

    // Head mounting studs (16)
    for (let i = 0; i < 4; i++) {
      const z = -0.78 + i * 0.52;
      for (const [x, xz] of [[-0.70, -0.25], [0.70, -0.25], [-0.70, 0.25], [0.70, 0.25]]) {
        const stGeo = new THREE.CylinderGeometry(0.034, 0.034, 1.05, 8);
        const st = new THREE.Mesh(stGeo, this.materials.polishedSteel);
        st.position.set(x, 1.48, z + xz * 0.5);
        this.group.add(st);
        const nut = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 0.044, 6), this.materials.polishedSteel
        );
        nut.position.set(x, 2.00, z + xz * 0.5);
        this.group.add(nut);
      }
    }

    // Valve cover (billet blue)
    const vcGeo = new THREE.BoxGeometry(1.88, 0.12, 2.05);
    const vc = new THREE.Mesh(vcGeo, this.tHeadCoverMat);
    vc.position.y = 2.48;
    this.group.add(vc);
    // 3 valve cover ribs
    for (const z of [-0.66, 0, 0.66]) {
      const vrGeo = new THREE.BoxGeometry(1.90, 0.044, 0.058);
      const vrMesh = new THREE.Mesh(vrGeo, this.materials.polishedSteel);
      vrMesh.position.set(0, 2.55, z);
      this.group.add(vrMesh);
    }

    // Per-cylinder valve detail + spark plugs
    for (let i = 0; i < 4; i++) {
      const z = -0.78 + i * 0.52;
      // 4 valves per cylinder
      for (const [xp, isEx] of [[-0.38, false], [-0.12, false], [0.12, true], [0.38, true]]) {
        const vMat = isEx
          ? new THREE.MeshStandardMaterial({ color: 0x78716c, metalness: 0.85, roughness: 0.22 })
          : this.materials.polishedSteel;
        const vsGeo = new THREE.CylinderGeometry(0.020, 0.020, 0.55, 8);
        const vsMesh = new THREE.Mesh(vsGeo, vMat);
        vsMesh.position.set(xp, 2.10, z);
        this.group.add(vsMesh);

        const spr = this._spring(2.04, 2.38, xp, z, 0.036, 5.5, 0.009, this.tSpringMat);
        if (spr) this.group.add(spr);

        const vhGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.015, 14);
        const vhMesh = new THREE.Mesh(vhGeo, vMat);
        vhMesh.position.set(xp, 1.85, z);
        this.group.add(vhMesh);
      }

      // Spark plug
      const spbGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.28, 12);
      const spb = new THREE.Mesh(spbGeo, new THREE.MeshStandardMaterial({
        color: 0xd97706, metalness: 0.92, roughness: 0.16
      }));
      spb.position.set(0, 2.30, z);
      this.group.add(spb);
      const cerGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.18, 10);
      const cerMesh = new THREE.Mesh(cerGeo, new THREE.MeshStandardMaterial({
        color: 0xf8f8f2, metalness: 0.05, roughness: 0.70
      }));
      cerMesh.position.set(0, 2.44, z);
      this.group.add(cerMesh);

      // Spark light
      const sl = new THREE.PointLight(0xf59e0b, 0, 1.6);
      sl.position.set(0, 1.86, z);
      this.group.add(sl);
      this.sparkLights.push(sl);

      // Injector (top-feed direct inject)
      const injGeo = new THREE.CylinderGeometry(0.032, 0.026, 0.55, 12);
      const inj = new THREE.Mesh(injGeo, new THREE.MeshStandardMaterial({
        color: 0x0284c7, metalness: 0.85, roughness: 0.20
      }));
      inj.position.set(0.45, 2.15, z);
      inj.rotation.z = 0.35;
      this.group.add(inj);
    }

    // DOHC cams (2 shafts)
    for (const xc of [-0.28, 0.28]) {
      const camGeo = new THREE.CylinderGeometry(0.058, 0.058, 2.05, 14);
      camGeo.rotateX(Math.PI / 2);
      const camMesh = new THREE.Mesh(camGeo, this.tDarkSteel);
      camMesh.position.set(xc, 2.58, 0);
      this.group.add(camMesh);
    }

    // Oil sump
    const spGeo = new THREE.BoxGeometry(2.05, 0.56, 2.10);
    const sp = new THREE.Mesh(spGeo, this.materials.darkComposite);
    sp.position.y = -1.04;
    this._reg(sp, {
      componentId: 'OilSump', name: 'Dry Sump Pan', category: 'LUBRICATION // DRY SUMP'
    });
    this.group.add(sp);
    for (let z = -1.0; z <= 1.0; z += 0.32) {
      const sumpRib = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.055, 0.058), this.materials.darkComposite);
      sumpRib.position.set(0, -1.17, z);
      this.group.add(sumpRib);
    }
  }

  // ── TURBOCHARGER ASSEMBLY ─────────────────────────────────────────────────
  createTurbochargerAssembly() {
    const tCenter = new THREE.Vector3(0.95, 1.18, -1.30);

    // Compressor scroll housing (cold side — aluminium)
    const csGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.38, 22);
    csGeo.rotateX(Math.PI / 2);
    const csHousing = new THREE.Mesh(csGeo, this.tCompMat);
    csHousing.position.copy(tCenter).add(new THREE.Vector3(0, 0, -0.40));
    this._reg(csHousing, {
      componentId: 'CompressorHousing',
      name: 'Turbo Compressor Housing',
      category: 'FORCED INDUCTION // COLD SIDE SCROLL'
    });
    this.group.add(csHousing);

    // Compressor scroll volute (exterior extrusion)
    const voltShape = new THREE.Shape();
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * Math.PI * 2;
      const r = 0.30 + (t / (Math.PI * 2)) * 0.080;
      const x = Math.cos(t) * r;
      const y = Math.sin(t) * r;
      if (i === 0) voltShape.moveTo(x, y);
      else         voltShape.lineTo(x, y);
    }
    const voltGeo = new THREE.ExtrudeGeometry(voltShape, { depth: 0.10, bevelEnabled: false });
    voltGeo.rotateX(Math.PI / 2);
    const volt = new THREE.Mesh(voltGeo, this.tCompMat);
    volt.position.copy(tCenter).add(new THREE.Vector3(0, 0, -0.62));
    this.group.add(volt);

    // Compressor wheel (series of swept vanes)
    this.compressorWheel = new THREE.Group();
    this.compressorWheel.position.copy(tCenter).add(new THREE.Vector3(0, 0, -0.42));
    const cHubGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.30, 14);
    cHubGeo.rotateX(Math.PI / 2);
    this.compressorWheel.add(new THREE.Mesh(cHubGeo, this.tCompMat));
    for (let v = 0; v < 10; v++) {
      const a = (v / 10) * Math.PI * 2;
      // Swept/curved vane
      const vGeo = new THREE.BoxGeometry(0.024, 0.22, 0.28);
      const vMesh = new THREE.Mesh(vGeo, this.tCompMat);
      vMesh.position.set(Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0);
      vMesh.rotation.z = a + 0.45;
      this.compressorWheel.add(vMesh);
    }
    this.group.add(this.compressorWheel);

    // Turbine scroll housing (hot side — dark cast iron)
    const tsGeo = new THREE.CylinderGeometry(0.35, 0.40, 0.40, 20);
    tsGeo.rotateX(Math.PI / 2);
    this.turbineScrollMesh = new THREE.Mesh(tsGeo, this.tScrollMat);
    this.turbineScrollMesh.position.copy(tCenter).add(new THREE.Vector3(0, 0, 0.40));
    this._reg(this.turbineScrollMesh, {
      componentId: 'TurbineHousing',
      name: 'Turbine Scroll Housing (Hot Side)',
      category: 'FORCED INDUCTION // HOT SIDE — HIGH TEMP ALLOY'
    });
    this.group.add(this.turbineScrollMesh);

    // Turbine volute
    const tvGeo = new THREE.ExtrudeGeometry(voltShape, { depth: 0.10, bevelEnabled: false });
    tvGeo.rotateX(Math.PI / 2);
    const tv = new THREE.Mesh(tvGeo, this.tScrollMat);
    tv.position.copy(tCenter).add(new THREE.Vector3(0, 0, 0.62));
    this.group.add(tv);

    // Turbine wheel
    this.turbineWheel = new THREE.Group();
    this.turbineWheel.position.copy(tCenter).add(new THREE.Vector3(0, 0, 0.42));
    const tHubGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.32, 14);
    tHubGeo.rotateX(Math.PI / 2);
    this.turbineWheel.add(new THREE.Mesh(tHubGeo, this.materials.polishedSteel));
    for (let v = 0; v < 10; v++) {
      const a = (v / 10) * Math.PI * 2;
      const vGeo = new THREE.BoxGeometry(0.022, 0.20, 0.28);
      const vMesh = new THREE.Mesh(vGeo, this.materials.polishedSteel);
      vMesh.position.set(Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0);
      vMesh.rotation.z = a - 0.38;
      this.turbineWheel.add(vMesh);
    }
    this.group.add(this.turbineWheel);

    // Center bearing housing (CHRA)
    const chrGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.44, 16);
    chrGeo.rotateX(Math.PI / 2);
    const chr = new THREE.Mesh(chrGeo, new THREE.MeshStandardMaterial({
      color: 0x64748b, metalness: 0.85, roughness: 0.30
    }));
    chr.position.copy(tCenter);
    this.group.add(chr);
    // Oil feed banjo bolt
    const banjGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.12, 10);
    const banj = new THREE.Mesh(banjGeo, this.tBrassMat);
    banj.position.copy(tCenter).add(new THREE.Vector3(0, 0.18, 0));
    this.group.add(banj);
    // Oil drain tube (CHRA bottom)
    const oilDrain = this._tube([
      [tCenter.x, tCenter.y - 0.16, tCenter.z],
      [tCenter.x, tCenter.y - 0.52, tCenter.z],
      [tCenter.x - 0.20, tCenter.y - 0.70, tCenter.z]
    ], 0.028, new THREE.MeshStandardMaterial({
      color: 0x1a1d24, metalness: 0.04, roughness: 0.88
    }));
    if (oilDrain) this.group.add(oilDrain);

    // Exhaust manifold 4-1 collector (right of block, driving turbine)
    const portZ = [-0.78, -0.26, 0.26, 0.78];
    portZ.forEach(z => {
      const pt = this._tube([
        [0.96, 2.18, z], [1.12, 2.00, z], [1.25, 1.72, z * 0.45],
        [tCenter.x, tCenter.y + 0.26, tCenter.z]
      ], 0.064, this.tExhMat);
      if (pt) this.group.add(pt);
    });
    // Collector
    const collGeo = new THREE.CylinderGeometry(0.22, 0.12, 0.50, 14);
    collGeo.rotateX(Math.PI / 2);
    this.exhManifoldMesh = new THREE.Mesh(collGeo, this.tExhMat);
    this.exhManifoldMesh.position.copy(tCenter).add(new THREE.Vector3(0, 0.30, 0.45));
    this._reg(this.exhManifoldMesh, {
      componentId: 'ExhaustManifold',
      name: '4-1 Exhaust Manifold Collector',
      category: 'EXHAUST // FEEDS TURBINE SCROLL'
    });
    this.group.add(this.exhManifoldMesh);

    // Wastegate actuator (pneumatic/electronic)
    const wgBodyGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.25, 12);
    this.wastegateActuator = new THREE.Mesh(wgBodyGeo, this.tWgMat);
    this.wastegateActuator.position.set(tCenter.x + 0.28, tCenter.y - 0.22, tCenter.z - 0.38);
    this.wastegateActuator.rotation.z = Math.PI / 6;
    this._reg(this.wastegateActuator, {
      componentId: 'Wastegate',
      name: 'Electronic Wastegate Actuator',
      category: 'BOOST CONTROL // EXTERNAL WASTEGATE'
    });
    this.group.add(this.wastegateActuator);
    // Wastegate rod
    const wgRodGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.28, 8);
    this.wastegateRod = new THREE.Mesh(wgRodGeo, this.materials.polishedSteel);
    this.wastegateRod.position.set(tCenter.x + 0.28, tCenter.y - 0.22, tCenter.z - 0.28);
    this.group.add(this.wastegateRod);

    // BOV (recirculating blow-off valve)
    const bovGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.20, 12);
    this.bovValveMesh = new THREE.Mesh(bovGeo, this.tWgMat);
    this.bovValveMesh.position.set(-0.85, 1.32, -0.92);
    this.bovValveMesh.rotation.z = Math.PI / 2;
    this._reg(this.bovValveMesh, {
      componentId: 'BOV',
      name: 'Recirculating Blow-Off Valve',
      category: 'BOOST CIRCUIT // DIVERTER VALVE'
    });
    this.group.add(this.bovValveMesh);
  }

  // ── INTERCOOLER & PIPING ──────────────────────────────────────────────────
  createIntercoolerAndPiping() {
    // Front-mount intercooler (FMIC)
    const icGeo = new THREE.BoxGeometry(1.75, 0.52, 0.58);
    this.intercoolerMesh = new THREE.Mesh(icGeo, this.tIcMat);
    this.intercoolerMesh.position.set(0, 0.80, 1.78);
    this._reg(this.intercoolerMesh, {
      componentId: 'Intercooler',
      name: 'Front-Mount Air-to-Air Intercooler',
      category: 'CHARGE AIR COOLING // FMIC'
    });
    this.group.add(this.intercoolerMesh);

    // Intercooler fins (horizontal stacked)
    for (let y = 0.58; y <= 1.02; y += 0.068) {
      const fGeo = new THREE.BoxGeometry(1.77, 0.010, 0.54);
      const finMesh = new THREE.Mesh(fGeo, this.tIcFinMat);
      finMesh.position.set(0, y, 1.78);
      this.group.add(finMesh);
    }
    // Side tanks
    for (const ix of [-0.92, 0.92]) {
      const stGeo = new THREE.BoxGeometry(0.10, 0.55, 0.60);
      const stMesh = new THREE.Mesh(stGeo, this.tCompMat);
      stMesh.position.set(ix, 0.80, 1.78);
      this.group.add(stMesh);
    }

    // Boost pipe circuit: compressor outlet → IC → throttle → intake manifold
    const pipeMaterial = this.tBoostMat;
    // Comp outlet → IC (silicone hose)
    const p1 = this._tube([
      [0.95, 1.18, -1.70], [0.58, 0.80, -0.80], [0.58, 0.80, 1.55], [0.92, 0.80, 1.78]
    ], 0.070, this.tRubberMat);
    if (p1) { this.boostPipeMesh = p1; this.group.add(p1); }

    // IC outlet → throttle body → intake manifold (aluminium)
    const p2 = this._tube([
      [-0.92, 0.80, 1.78], [-0.72, 0.80, 1.35], [-0.82, 1.22, 0.68],
      [-0.82, 1.62, 0], [-0.82, 1.90, -0.40]
    ], 0.068, pipeMaterial);
    if (p2) this.group.add(p2);

    // Throttle body
    const tbGeo = new THREE.CylinderGeometry(0.076, 0.076, 0.22, 14);
    tbGeo.rotateX(Math.PI / 2);
    const tb = new THREE.Mesh(tbGeo, this.tCompMat);
    tb.position.set(-0.82, 1.62, 0.62);
    tb.rotation.z = 0.3;
    this._reg(tb, {
      componentId: 'ThrottleBody',
      name: 'Electronic Throttle Body',
      category: 'AIR INTAKE // DRIVE-BY-WIRE'
    });
    this.group.add(tb);

    // AN couplings / silicone connectors at hose joints
    for (const [px, py, pz] of [[0.58, 0.80, 1.55], [-0.92, 0.80, 1.60]]) {
      const coupGeo = new THREE.CylinderGeometry(0.082, 0.082, 0.055, 10);
      coupGeo.rotateX(Math.PI / 2);
      const coup = new THREE.Mesh(coupGeo, new THREE.MeshStandardMaterial({
        color: 0x1a1d24, metalness: 0.20, roughness: 0.75
      }));
      coup.position.set(px, py, pz);
      this.group.add(coup);
    }
  }

  // ── PROPELLER ─────────────────────────────────────────────────────────────
  createPropeller() {
    const gbGeo = new THREE.CylinderGeometry(0.52, 0.68, 0.70, 22);
    gbGeo.rotateX(Math.PI / 2);
    const gb = new THREE.Mesh(gbGeo, this.materials.castAluminum);
    gb.position.set(0, 0.50, 1.52);
    this.group.add(gb);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rGeo = new THREE.BoxGeometry(0.062, 0.26, 0.70);
      const rm = new THREE.Mesh(rGeo, this.materials.castAluminum);
      rm.position.set(Math.cos(a) * 0.38, Math.sin(a) * 0.38 + 0.50, 1.52);
      rm.rotation.z = a;
      this.group.add(rm);
    }
    const psGeo = new THREE.CylinderGeometry(0.086, 0.086, 0.42, 14);
    psGeo.rotateX(Math.PI / 2);
    const psMesh = new THREE.Mesh(psGeo, this.materials.polishedSteel);
    psMesh.position.set(0, 0.50, 2.06);
    this.group.add(psMesh);

    const hubGrp = new THREE.Group();
    hubGrp.position.set(0, 0.50, 2.28);
    const fGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.10, 20);
    fGeo.rotateX(Math.PI / 2);
    hubGrp.add(new THREE.Mesh(fGeo, this.materials.castAluminum));
    const spGeo = new THREE.ConeGeometry(0.32, 0.66, 20);
    spGeo.rotateX(Math.PI / 2);
    const spinner = new THREE.Mesh(spGeo, this.materials.polishedSteel);
    spinner.position.z = 0.36;
    hubGrp.add(spinner);

    this.propeller = new THREE.Group();
    this.propeller.position.z = 0.36;
    for (let b = 0; b < 3; b++) {
      const ba = (b / 3) * Math.PI * 2;
      const bg = new THREE.Group();
      bg.rotation.z = ba;
      for (const [by, blen, bw, br, rot] of [
        [0.20, 0.40, 0.22, 0.058, 0.14],
        [0.60, 0.58, 0.17, 0.044, 0.10],
        [1.10, 0.50, 0.11, 0.029, 0.06]
      ]) {
        const bG = new THREE.BoxGeometry(bw, blen, br);
        const bM = new THREE.Mesh(bG, this.materials.propellerBlade);
        bM.position.y = by;
        bM.rotation.z = rot;
        bg.add(bM);
      }
      this.propeller.add(bg);
    }
    hubGrp.add(this.propeller);
    this.group.add(hubGrp);
    this._propHub = hubGrp;
  }

  // ── PARTICLE SYSTEMS ──────────────────────────────────────────────────────
  createParticleSystems() {
    // Charge-air particles (boost pipe: compressor → intercooler → throttle)
    const cCount = 36;
    const cGeo   = new THREE.BufferGeometry();
    const cPos   = new Float32Array(cCount * 3);
    for (let i = 0; i < cCount; i++) {
      cPos[i * 3]     = (Math.random() - 0.5) * 0.12 + 0.58;
      cPos[i * 3 + 1] = 0.72 + Math.random() * 0.18;
      cPos[i * 3 + 2] = (Math.random() - 0.5) * 2.40;
    }
    cGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
    this.chargeAirParticles = new THREE.Points(cGeo, new THREE.PointsMaterial({
      color: 0x7dd3fc, size: 0.052, transparent: true, opacity: 0.70,
      blending: THREE.AdditiveBlending
    }));
    this.group.add(this.chargeAirParticles);

    // Exhaust gas particles (turbine outlet)
    const eCount = 30;
    const eGeo   = new THREE.BufferGeometry();
    const ePos   = new Float32Array(eCount * 3);
    const tCenter = new THREE.Vector3(0.95, 1.18, -1.30);
    for (let i = 0; i < eCount; i++) {
      ePos[i * 3]     = tCenter.x + (Math.random() - 0.5) * 0.18;
      ePos[i * 3 + 1] = tCenter.y + (Math.random() - 0.5) * 0.18;
      ePos[i * 3 + 2] = tCenter.z - 0.55 - Math.random() * 0.60;
    }
    eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
    this.exhaustGasParticles = new THREE.Points(eGeo, new THREE.PointsMaterial({
      color: 0xd97706, size: 0.065, transparent: true, opacity: 0.55
    }));
    this.group.add(this.exhaustGasParticles);
  }

  // ── ACCESSORIES ───────────────────────────────────────────────────────────
  createAccessories() {
    // ECU
    const ecuGeo = new THREE.BoxGeometry(0.30, 0.52, 0.72);
    this.ecuMesh = new THREE.Mesh(ecuGeo, this.materials.ecuMat);
    this.ecuMesh.position.set(-0.85, 0.90, -1.08);
    this._reg(this.ecuMesh, {
      componentId: 'ECU', name: 'Engine Control Unit', category: 'ELECTRONIC CONTROL'
    });
    this.group.add(this.ecuMesh);

    // Oil filter
    const ofGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.35, 14);
    ofGeo.rotateZ(Math.PI / 2);
    const ofilter = new THREE.Mesh(ofGeo, new THREE.MeshStandardMaterial({
      color: 0x5c2d0e, metalness: 0.45, roughness: 0.62
    }));
    ofilter.position.set(-0.85, -0.38, -0.72);
    this._reg(ofilter, {
      componentId: 'OilFilter', name: 'High-Pressure Oil Filter & Thermostat', category: 'LUBRICATION // FILTRATION'
    });
    this.group.add(ofilter);

    // Alternator
    const altGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.30, 14);
    const alt = new THREE.Mesh(altGeo, new THREE.MeshStandardMaterial({
      color: 0x374151, metalness: 0.78, roughness: 0.34
    }));
    alt.position.set(-0.85, 0.22, 0.82);
    alt.rotation.x = Math.PI / 2;
    this._reg(alt, {
      componentId: 'Alternator', name: 'Engine-Driven 28V Alternator', category: 'ELECTRICAL // AVIONICS POWER'
    });
    this.group.add(alt);
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────────────

  setExplodedView(factor) {
    this.explodedFactor = factor;
    this.cylinderHeads.forEach(h => { h.position.y = 2.10 + factor * 1.10; });
    if (this._propHub) this._propHub.position.z = 2.28 + factor * 1.15;
    if (this.intercoolerMesh) this.intercoolerMesh.position.z = 1.78 + factor * 0.70;
    this.outerHousingMeshes.forEach(m => {
      m.material.opacity = Math.max(0.05, 0.16 - factor * 0.14);
    });
  }

  setXRay(enabled) {
    this.isXRay = enabled;
    this.outerHousingMeshes.forEach(m => {
      m.material.opacity = enabled ? 0.05 : 0.16;
    });
    if (this.engineBlockMesh) {
      this.engineBlockMesh.material.transparent = enabled;
      this.engineBlockMesh.material.opacity = enabled ? 0.22 : 1.0;
      this.engineBlockMesh.material.depthWrite = !enabled;
    }
  }

  toggleLabels() {}

  update(packet, deltaSeconds) {
    if (!packet || !packet.engine) return;
    const rpm       = packet.engine.rpm !== undefined ? packet.engine.rpm : 5400;
    const throttle  = packet.engine.throttle_percent ?? 82;
    const boostBar  = packet.engine.boost_pressure_bar !== undefined ? packet.engine.boost_pressure_bar : 0.95;
    const isRunning = packet.status === 'RUNNING';

    // Crank rotation
    const visRevSec = isRunning ? (rpm / 5500) * 4.4 : 0;
    this.crankAngle = (this.crankAngle + visRevSec * Math.PI * 2 * deltaSeconds) % (Math.PI * 2);
    if (this.crankshaft) this.crankshaft.rotation.z = this.crankAngle;
    if (this.propeller)  this.propeller.rotation.z  = this.crankAngle / 2.30;

    // Piston kinematics
    const rC = 0.28, lC = 0.85;
    for (let i = 0; i < this.pistons.length; i++) {
      const p   = this.pistons[i];
      const rod = this.connectingRods[i];
      const ang = this.crankAngle + p.angleOffset;
      const sinA = Math.sin(ang);
      const cosA = Math.cos(ang);
      const disp = rC * cosA + Math.sqrt(Math.max(0.01, lC * lC - (rC * sinA) ** 2));
      p.group.position.y = 0.34 + disp * 0.66;
      const rodAng = Math.asin(Math.min(1, Math.max(-1, rC * sinA / lC)));
      rod.group.position.x = -rC * sinA * 0.5;
      rod.group.position.y = -0.22 + rC * cosA;
      rod.group.rotation.z = rodAng;

      // Spark at TDC
      const nearTDC = Math.abs(ang % (Math.PI * 2)) < 0.28;
      if (this.sparkLights[i]) {
        this.sparkLights[i].intensity = (isRunning && nearTDC) ? 1.6 + 0.4 * Math.sin(Date.now() * 0.06) : 0;
      }
    }

    // Turbo spool (depends on boost + throttle)
    const turboSpool = isRunning ? Math.max(0.3, (boostBar / 1.45) * 1.5 + (throttle / 100) * 0.8) : 0;
    const dTA = turboSpool * 8.5 * Math.PI * 2 * deltaSeconds;
    this.turboAngle = (this.turboAngle + dTA) % (Math.PI * 2);
    if (this.compressorWheel) this.compressorWheel.rotation.z = this.turboAngle;
    if (this.turbineWheel)    this.turbineWheel.rotation.z    = this.turboAngle;

    // Wastegate actuator glow + rod stroke
    const hasWgFault = packet.faults && (packet.faults.wastegate_fault_severity > 0 || packet.faults.boost_leak_severity > 0);
    if (this.wastegateActuator) {
      if (hasWgFault) {
        this.wastegateActuator.material.emissive.setHex(0xdc2626);
        this.wastegateActuator.material.emissiveIntensity = 0.72 + 0.28 * Math.sin(Date.now() * 0.01);
      } else if (boostBar > 1.25) {
        this.wastegateActuator.material.emissive.setHex(0xf59e0b);
        this.wastegateActuator.material.emissiveIntensity = 0.40;
      } else {
        this.wastegateActuator.material.emissive.setHex(0x000000);
        this.wastegateActuator.material.emissiveIntensity = 0;
      }
    }
    if (this.wastegateRod) {
      this.wastegateRod.position.z = -1.58 + Math.min(0.08, Math.max(0, (boostBar - 0.95) * 0.15));
    }

    // Turbine + exhaust manifold thermal glow
    const meanEgt = packet.engine.egt_c || 815;
    [this.turbineScrollMesh, this.exhManifoldMesh].forEach(m => {
      if (!m) return;
      let ec = 0x000000, ei = 0;
      if      (meanEgt > 820) { ec = 0xef4444; ei = 0.70; }
      else if (meanEgt > 760) { ec = 0xea580c; ei = 0.45; }
      else if (meanEgt > 700) { ec = 0xd97706; ei = 0.22; }
      m.material.emissive.setHex(ec);
      m.material.emissiveIntensity = ei;
    });

    // Intercooler heat warning
    const iat = packet.engine.iat_c || 42.5;
    if (this.intercoolerMesh) {
      this.intercoolerMesh.material.color.setHex(
        iat > 60 ? 0xea580c : iat > 50 ? 0xd97706 : 0x94a3b8
      );
    }

    // Cylinder head thermal
    this.cylinderHeads.forEach(h => {
      const cht = packet.engine.cht_c || 114;
      let ec = 0x000000, ei = 0;
      if      (cht > 120) { ec = 0xdc2626; ei = 0.55; }
      else if (cht > 112) { ec = 0xea580c; ei = 0.35; }
      else if (cht > 105) { ec = 0xd97706; ei = 0.18; }
      h.material.emissive.setHex(ec);
      h.material.emissiveIntensity = ei;
    });

    // Particle flows
    if (isRunning) {
      if (this.chargeAirParticles) {
        const pos = this.chargeAirParticles.geometry.attributes.position.array;
        const spd = turboSpool * 2.2 * deltaSeconds;
        for (let i = 0; i < pos.length; i += 3) {
          pos[i + 2] += spd;
          if (pos[i + 2] > 2.20) pos[i + 2] = -0.60;
        }
        this.chargeAirParticles.geometry.attributes.position.needsUpdate = true;
      }
      if (this.exhaustGasParticles) {
        const pos = this.exhaustGasParticles.geometry.attributes.position.array;
        const spd = (throttle / 100) * 3.0 * deltaSeconds;
        for (let i = 0; i < pos.length; i += 3) {
          pos[i + 2] -= spd;
          if (pos[i + 2] < -1.10) pos[i + 2] = 0.50;
        }
        this.exhaustGasParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Vibration
    const vibRms = packet.engine.vibration_rms_g || 0.46;
    if (isRunning) {
      const amp  = Math.min(0.07, vibRms * 0.025);
      const freq = Date.now() * 0.038;
      this.group.position.x = Math.sin(freq) * amp;
      this.group.position.y = Math.cos(freq * 1.25) * amp * 0.75;
    } else {
      this.group.position.set(0, 0, 0);
    }
  }

  dispose() {
    const sharedValues = this.materials ? Object.values(this.materials) : [];
    this.group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
          if (!sharedValues.includes(m)) m.dispose();
        });
      }
    });
    this.scene.remove(this.group);
  }
}

if (typeof window !== 'undefined') window.TurbochargedEngineModel = TurbochargedEngineModel;

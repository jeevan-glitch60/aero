/**
 * ============================================================================
 * AEROTWIN // 3D MULTI-ENGINE PROCEDURAL VISUALIZATION MANAGER v2.0
 * ============================================================================
 * Professional engineering cutaway quality models for 4 aero propulsion types.
 * All geometry is synthetic/procedural — NOT certified CAD or flight software.
 * Public API fully backward-compatible with v1.
 *
 * SYNTHETIC ENGINE CUTAWAY — DIGITAL-TWIN VISUALIZATION
 * NOT CERTIFIED CAD OR FLIGHT SOFTWARE
 */

'use strict';

// =============================================================================
// SHARED GEOMETRY HELPERS (module-private)
// =============================================================================

function _mkBolt(rShank, height, mat) {
  const g = new THREE.Group();
  const headGeo = new THREE.CylinderGeometry(rShank * 1.7, rShank * 1.7, rShank * 0.9, 6);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.y = height * 0.5 + rShank * 0.45;
  g.add(head);
  const shankGeo = new THREE.CylinderGeometry(rShank, rShank, height, 10);
  g.add(new THREE.Mesh(shankGeo, mat));
  return g;
}

function _mkTube(pts, radius, mat) {
  if (!pts || pts.length < 2) return null;
  const v3 = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(v3);
  const geo = new THREE.TubeGeometry(curve, Math.max(6, pts.length * 3), radius, 8, false);
  return new THREE.Mesh(geo, mat);
}

function _mkSpringX(x0, x1, cy, cz, coilR, turns, wireR, mat) {
  // Spring coiled around X axis, centered at (_, cy, cz)
  const segs = Math.ceil(turns * 18);
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const ang = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(
      x0 + (x1 - x0) * t,
      cy + coilR * Math.cos(ang),
      cz + coilR * Math.sin(ang)
    ));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, segs, wireR, 6, false);
  return new THREE.Mesh(geo, mat);
}

// =============================================================================
// A. BOXER ENGINE MODEL — Horizontally Opposed 4-Cylinder
// =============================================================================
class BoxerEngineModel {
  constructor(scene, materials) {
    this.scene = scene;
    this.materials = materials;
    this.group = new THREE.Group();
    this.group.name = 'BoxerEngineRoot';

    // Kinematic refs
    this.crankshaft = null;
    this.propeller = null;
    this.pistons = [];
    this.connectingRods = [];
    this.cylinderHeads = [];
    this.cylinderBarrels = [];
    this.injectors = [];
    this.sparkLights = [];
    this.outerHousingMeshes = [];

    this.labelsGroup = new THREE.Group();
    this.group.add(this.labelsGroup);

    // Particles
    this.oilParticles = null;
    this.exhaustParticles = null;

    // Engine dimensions
    this.bore = 0.84;
    this.stroke = 0.61;
    this.conRodLength = 1.15;
    this.bankOffset = 1.45;
    this.crankRadius = 0.305;

    // State
    this.isXRay = false;
    this.showLabels = false;
    this.explodedFactor = 0;
    this.crankAngle = 0;

    this.interactiveMeshes = [];

    this._initDetailMaterials();
    this._buildAll();
  }

  _initDetailMaterials() {
    this._valveCoverMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, metalness: 0.88, roughness: 0.22, name: 'BilletValveCover'
    });
    this._springMat = new THREE.MeshStandardMaterial({
      color: 0xb8c5d0, metalness: 0.95, roughness: 0.12, name: 'ValveSpring'
    });
    this._rubberMat = new THREE.MeshStandardMaterial({
      color: 0x1c1f26, metalness: 0.04, roughness: 0.88, name: 'RubberHose'
    });
    this._brassAnMat = new THREE.MeshStandardMaterial({
      color: 0xb45309, metalness: 0.88, roughness: 0.22, name: 'BrassAN'
    });
    this._plugCeramicMat = new THREE.MeshStandardMaterial({
      color: 0xf8f8f2, metalness: 0.05, roughness: 0.7, name: 'SparkCeramic'
    });
    this._plugBodyMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, metalness: 0.92, roughness: 0.16, name: 'SparkPlugBody'
    });
    this._housingMat = new THREE.MeshStandardMaterial({
      color: 0x5a6880, metalness: 0.72, roughness: 0.28,
      transparent: true, opacity: 0.20, depthWrite: false,
      side: THREE.DoubleSide, name: 'HousingCutaway'
    });
    this._darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x3d4756, metalness: 0.88, roughness: 0.36, name: 'DarkSteel'
    });
    this._linerMat = new THREE.MeshStandardMaterial({
      color: 0x8faabb, metalness: 0.88, roughness: 0.18, name: 'CylinderLiner'
    });
    this._barrelMat = new THREE.MeshStandardMaterial({
      color: 0x7a8898, metalness: 0.72, roughness: 0.32, name: 'BarrelAlum'
    });
    this._headMat = new THREE.MeshStandardMaterial({
      color: 0x6a7888, metalness: 0.76, roughness: 0.30, name: 'HeadCasting'
    });
    this._fuelRailMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, metalness: 0.85, roughness: 0.20, name: 'InjectorBody'
    });
    this._leadMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, metalness: 0.20, roughness: 0.70, name: 'IgnLead'
    });
  }

  _reg(mesh, data) {
    mesh.userData = Object.assign({ isInteractive: true }, data);
    this.interactiveMeshes.push(mesh);
    return mesh;
  }

  _buildAll() {
    this._buildOuterHousing();
    this._buildCrankcase();
    this._buildCrankshaft();
    this._buildCylinders();
    this._buildOilSystem();
    this._buildPropellerDrive();
    this._buildECU();
    this._buildParticles();
  }

  // ── OUTER HOUSING (semi-transparent cutaway shell) ────────────────────────
  _buildOuterHousing() {
    // Main body shell
    const mainGeo = new THREE.BoxGeometry(3.55, 1.82, 3.38);
    const main = new THREE.Mesh(mainGeo, this._housingMat);
    main.position.y = 0.06;
    this.group.add(main);
    this.outerHousingMeshes.push(main);

    // Front cowl (cylindrical)
    const cowlGeo = new THREE.CylinderGeometry(0.70, 0.88, 0.80, 24);
    cowlGeo.rotateX(Math.PI / 2);
    const cowl = new THREE.Mesh(cowlGeo, this._housingMat);
    cowl.position.set(0, 0.08, 1.95);
    this.group.add(cowl);
    this.outerHousingMeshes.push(cowl);
  }

  // ── CRANKCASE ─────────────────────────────────────────────────────────────
  _buildCrankcase() {
    const ccGrp = new THREE.Group();
    ccGrp.name = 'Crankcase';

    // Upper half
    const upperGeo = new THREE.BoxGeometry(2.06, 0.64, 2.96);
    const upper = new THREE.Mesh(upperGeo, this.materials.castAluminum);
    upper.position.y = 0.32;
    upper.castShadow = true;
    upper.receiveShadow = true;
    ccGrp.add(upper);

    // Lower half
    const lowerGeo = new THREE.BoxGeometry(2.06, 0.56, 2.96);
    const lower = new THREE.Mesh(lowerGeo, this.materials.castAluminum);
    lower.position.y = -0.28;
    lower.castShadow = true;
    ccGrp.add(lower);

    // Parting line (dark gasket seam)
    const pGeo = new THREE.BoxGeometry(2.12, 0.016, 3.02);
    ccGrp.add(new THREE.Mesh(pGeo, new THREE.MeshStandardMaterial({
      color: 0x1a2030, metalness: 0.3, roughness: 0.9
    })));

    // Transverse structural ribs on top
    for (let z = -1.15; z <= 1.15; z += 0.575) {
      const rg = new THREE.BoxGeometry(2.16, 0.072, 0.064);
      const r = new THREE.Mesh(rg, this.materials.castAluminum);
      r.position.set(0, 0.64, z);
      ccGrp.add(r);
    }
    // Ribs on bottom
    for (let z = -1.1; z <= 1.1; z += 0.55) {
      const rg = new THREE.BoxGeometry(2.16, 0.060, 0.052);
      const r = new THREE.Mesh(rg, this.materials.castAluminum);
      r.position.set(0, -0.54, z);
      ccGrp.add(r);
    }

    // 8 main bearing cap bolts (lower half)
    const boltMat = this.materials.polishedSteel;
    for (const z of [-0.88, -0.29, 0.29, 0.88]) {
      for (const x of [-0.56, 0.56]) {
        const bolt = _mkBolt(0.038, 0.26, boltMat);
        bolt.position.set(x, -0.18, z);
        ccGrp.add(bolt);
      }
    }

    // 4 engine mount pads (corners)
    for (const [mx, mz] of [[-0.88, -1.3], [0.88, -1.3], [-0.88, 1.3], [0.88, 1.3]]) {
      const padGeo = new THREE.BoxGeometry(0.22, 0.09, 0.22);
      const pad = new THREE.Mesh(padGeo, this.materials.castAluminum);
      pad.position.set(mx, -0.55, mz);
      ccGrp.add(pad);
    }

    // Oil filler cap
    const fcGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.13, 16);
    const fc = new THREE.Mesh(fcGeo, this._valveCoverMat);
    fc.position.set(0.72, 0.76, -0.45);
    ccGrp.add(fc);

    // Breather hose
    const breathMesh = _mkTube([
      [0.35, 0.68, 0.18], [0.62, 0.50, 0.18], [0.85, 0.10, 0.18]
    ], 0.030, this._rubberMat);
    if (breathMesh) ccGrp.add(breathMesh);

    // Rear accessory case
    const racGeo = new THREE.BoxGeometry(1.62, 1.18, 0.58);
    const rac = new THREE.Mesh(racGeo, this.materials.castAluminum);
    rac.position.set(0, 0.05, -1.62);
    ccGrp.add(rac);
    // Accessory case ribs
    for (const ry of [-0.38, 0, 0.38]) {
      const rg = new THREE.BoxGeometry(1.68, 0.052, 0.60);
      const r = new THREE.Mesh(rg, this.materials.castAluminum);
      r.position.set(0, ry, -1.62);
      ccGrp.add(r);
    }

    this._reg(upper, {
      componentId: 'Crankcase',
      name: 'Split Crankcase Assembly',
      category: 'STRUCTURAL CORE // CAST ALUMINIUM ALLOY'
    });

    this.group.add(ccGrp);
  }

  // ── CRANKSHAFT ────────────────────────────────────────────────────────────
  _buildCrankshaft() {
    this.crankshaft = new THREE.Group();
    this.crankshaft.name = 'Crankshaft';

    // Main shaft spine
    const msGeo = new THREE.CylinderGeometry(0.142, 0.142, 3.48, 20);
    msGeo.rotateX(Math.PI / 2);
    this.crankshaft.add(new THREE.Mesh(msGeo, this.materials.polishedSteel));

    // 5 main bearing journals (slightly larger)
    for (const zp of [-1.24, -0.61, 0, 0.61, 1.24]) {
      const jg = new THREE.CylinderGeometry(0.172, 0.172, 0.24, 20);
      jg.rotateX(Math.PI / 2);
      const j = new THREE.Mesh(jg, this.materials.polishedSteel);
      j.position.z = zp;
      this.crankshaft.add(j);
    }

    // 4 crank throws: web + crankpin + counterweight
    const zThrows = [-0.925, -0.31, 0.31, 0.925];
    const phases  = [0, Math.PI, Math.PI, 0];
    phases.forEach((ang, i) => {
      const z = zThrows[i];
      const r = this.crankRadius;

      // Web (flat rectangular plate)
      const webGeo = new THREE.BoxGeometry(0.09, r * 1.45, 0.22);
      const web = new THREE.Mesh(webGeo, this._darkSteelMat);
      web.position.set(Math.sin(ang) * r * 0.48, Math.cos(ang) * r * 0.48, z);
      web.rotation.z = ang;
      this.crankshaft.add(web);

      // Crankpin journal
      const cpGeo = new THREE.CylinderGeometry(0.108, 0.108, 0.24, 16);
      cpGeo.rotateX(Math.PI / 2);
      const cp = new THREE.Mesh(cpGeo, this.materials.polishedSteel);
      cp.position.set(Math.sin(ang) * r, Math.cos(ang) * r, z);
      this.crankshaft.add(cp);

      // Counterweight (teardrop approximated by two overlapping boxes)
      const cw1Geo = new THREE.BoxGeometry(0.09, r * 1.18, 0.30);
      const cw1 = new THREE.Mesh(cw1Geo, this._darkSteelMat);
      cw1.position.set(-Math.sin(ang) * r * 0.52, -Math.cos(ang) * r * 0.52, z);
      cw1.rotation.z = ang;
      this.crankshaft.add(cw1);

      const cw2Geo = new THREE.CylinderGeometry(0.22, 0.14, 0.28, 14);
      const cw2 = new THREE.Mesh(cw2Geo, this._darkSteelMat);
      cw2.position.set(-Math.sin(ang) * r * 0.82, -Math.cos(ang) * r * 0.82, z);
      cw2.rotation.z = ang + Math.PI / 2;
      cw2.rotation.x = Math.PI / 2;
      this.crankshaft.add(cw2);
    });

    // Timing gear (rear)
    const tgGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.14, 28);
    tgGeo.rotateX(Math.PI / 2);
    const tg = new THREE.Mesh(tgGeo, this._brassAnMat);
    tg.position.z = -1.64;
    this.crankshaft.add(tg);
    for (let t = 0; t < 22; t++) {
      const ta = (t / 22) * Math.PI * 2;
      const ttGeo = new THREE.BoxGeometry(0.042, 0.055, 0.12);
      const tt = new THREE.Mesh(ttGeo, this._brassAnMat);
      tt.position.set(Math.cos(ta) * 0.31, Math.sin(ta) * 0.31, -1.64);
      tt.rotation.z = ta;
      this.crankshaft.add(tt);
    }

    // Damper pulley (front)
    const dpGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 20);
    dpGeo.rotateX(Math.PI / 2);
    const dp = new THREE.Mesh(dpGeo, this.materials.polishedSteel);
    dp.position.z = 1.62;
    this.crankshaft.add(dp);

    this._reg(new THREE.Mesh(msGeo.clone(), this.materials.polishedSteel), {
      componentId: 'Crankshaft',
      name: 'Multi-Journal Crankshaft',
      category: 'POWER OUTPUT // FORGED ALLOY STEEL'
    });
    this.group.add(this.crankshaft);
  }

  // ── CYLINDERS (4x) ───────────────────────────────────────────────────────
  _buildCylinders() {
    const layout = [
      { id: 1, bank: -1, z: -0.925, phase: 0 },
      { id: 2, bank:  1, z: -0.310, phase: Math.PI },
      { id: 3, bank: -1, z:  0.310, phase: Math.PI },
      { id: 4, bank:  1, z:  0.925, phase: 0 },
    ];

    layout.forEach((cfg, idx) => {
      const g = new THREE.Group();
      g.name = `CylAssy_${cfg.id}`;
      g.position.z = cfg.z;

      const bx = cfg.bank;
      const r  = this.bore * 0.5; // 0.42
      const barrelLen = 0.92;
      const barrelCX  = bx * (this.bankOffset - 0.08);
      const headCX    = bx * (this.bankOffset + 0.31);

      // ── Barrel ──────────────────────────────────────────────────────────
      const barGeo = new THREE.CylinderGeometry(r, r, barrelLen, 24);
      barGeo.rotateZ(Math.PI / 2);
      const barrel = new THREE.Mesh(barGeo, this._barrelMat.clone());
      barrel.position.x = barrelCX;
      barrel.castShadow = true;
      g.add(barrel);
      this.cylinderBarrels.push(barrel);

      // 7 cooling fins (CylinderGeometry discs perpendicular to barrel axis)
      for (let fi = 0; fi < 7; fi++) {
        const fx = bx * (this.bankOffset - 0.46 + fi * 0.122);
        const finGeo = new THREE.CylinderGeometry(r + 0.095, r + 0.095, 0.022, 24);
        finGeo.rotateZ(Math.PI / 2);
        g.add(new THREE.Mesh(finGeo, this._barrelMat));
        // Position will be handled by putting it correctly
        const finMesh = g.children[g.children.length - 1];
        finMesh.position.x = fx;
      }

      // Inner liner (visible in X-ray)
      const lnGeo = new THREE.CylinderGeometry(r - 0.018, r - 0.018, barrelLen - 0.04, 24);
      lnGeo.rotateZ(Math.PI / 2);
      const liner = new THREE.Mesh(lnGeo, this._linerMat);
      liner.position.x = barrelCX;
      g.add(liner);

      // ── Cylinder Head ───────────────────────────────────────────────────
      const hdGeo = new THREE.BoxGeometry(0.50, 0.94, 0.90);
      const head = new THREE.Mesh(hdGeo, this._headMat.clone());
      head.position.x = headCX;
      head.castShadow = true;
      g.add(head);
      this.cylinderHeads.push(head);

      // Head cooling fins (exterior)
      for (let hf = -0.34; hf <= 0.34; hf += 0.17) {
        const hfGeo = new THREE.BoxGeometry(0.52, 0.058, 0.82);
        const hfM = new THREE.Mesh(hfGeo, this._headMat);
        hfM.position.set(0, hf, 0);
        head.add(hfM);
      }

      // Head mounting studs (4 corners)
      for (const [hy, hz] of [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]]) {
        const stGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.12, 8);
        stGeo.rotateZ(Math.PI / 2);
        const stud = new THREE.Mesh(stGeo, this.materials.polishedSteel);
        stud.position.set(bx * -0.24, hy, hz);
        head.add(stud);
        // Nut
        const nutGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.045, 6);
        nutGeo.rotateZ(Math.PI / 2);
        const nut = new THREE.Mesh(nutGeo, this.materials.polishedSteel);
        nut.position.set(bx * -0.28, hy, hz);
        head.add(nut);
      }

      // Valve cover (billet blue anodized)
      const vcGeo = new THREE.BoxGeometry(0.10, 0.86, 0.82);
      const vc = new THREE.Mesh(vcGeo, this._valveCoverMat);
      vc.position.x = bx * 0.28;
      head.add(vc);
      // 3 valve cover ribs
      for (const vy of [-0.28, 0, 0.28]) {
        const vfGeo = new THREE.BoxGeometry(0.10, 0.055, 0.76);
        const vf = new THREE.Mesh(vfGeo, this.materials.polishedSteel);
        vf.position.set(0, vy, 0);
        vc.add(vf);
      }

      // 4 valve stems (2 intake + 2 exhaust per head)
      const vPositions = [
        { y:  0.22, z: -0.20, ex: false },
        { y:  0.22, z:  0.20, ex: false },
        { y: -0.22, z: -0.20, ex: true  },
        { y: -0.22, z:  0.20, ex: true  },
      ];
      vPositions.forEach(vp => {
        const vMat = vp.ex
          ? new THREE.MeshStandardMaterial({ color: 0x78716c, metalness: 0.85, roughness: 0.22 })
          : this.materials.polishedSteel;
        // Valve stem
        const vSGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.28, 8);
        const vStem = new THREE.Mesh(vSGeo, vMat);
        vStem.position.set(bx * -0.06, vp.y, vp.z);
        vStem.rotation.z = Math.PI / 2;
        head.add(vStem);
        // Valve head (disc)
        const vHGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.018, 16);
        const vHead = new THREE.Mesh(vHGeo, vMat);
        vHead.position.set(bx * -0.18, vp.y, vp.z);
        vHead.rotation.z = Math.PI / 2;
        head.add(vHead);
        // Valve spring
        const spr = _mkSpringX(
          bx * -0.09, bx * 0.14,
          vp.y, vp.z, 0.042, 5.5, 0.009, this._springMat
        );
        if (spr) head.add(spr);
      });

      // ── Dual Spark Plugs ─────────────────────────────────────────────────
      for (const spz of [-0.15, 0.15]) {
        // Body
        const spbGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.26, 12);
        spbGeo.rotateZ(Math.PI / 2);
        const spb = new THREE.Mesh(spbGeo, this._plugBodyMat);
        spb.position.set(bx * 0.24, 0.30, spz);
        head.add(spb);
        // Hex shoulder
        const hexGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.055, 6);
        hexGeo.rotateZ(Math.PI / 2);
        const hex = new THREE.Mesh(hexGeo, this._plugBodyMat);
        hex.position.set(bx * 0.18, 0.30, spz);
        head.add(hex);
        // Ceramic insulator
        const cerGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.20, 10);
        cerGeo.rotateZ(Math.PI / 2);
        const cer = new THREE.Mesh(cerGeo, this._plugCeramicMat);
        cer.position.set(bx * 0.36, 0.30, spz);
        head.add(cer);
        // HT ignition lead
        const leadMesh = _mkTube([
          [headCX + bx * 0.46, 0.30, spz + cfg.z],
          [headCX + bx * 0.38, 0.55, spz + cfg.z - 0.10],
          [bx * 0.78, 0.50, -1.42]
        ], 0.015, this._leadMat);
        if (leadMesh) this.group.add(leadMesh);
      }

      // ── Rocker Arms (simplified) ─────────────────────────────────────────
      for (const vp of vPositions) {
        const raGeo = new THREE.BoxGeometry(0.22, 0.032, 0.055);
        const ra = new THREE.Mesh(raGeo, this._darkSteelMat);
        ra.position.set(bx * 0.03, vp.y, vp.z);
        head.add(ra);
      }

      // ── Pushrod Shroud Tubes (twin per cylinder) ──────────────────────────
      for (const pz of [-0.19, 0.19]) {
        const ptMesh = _mkTube([
          [bx * 0.94, -0.28, pz],
          [bx * (this.bankOffset + 0.06), -0.26, pz]
        ], 0.027, new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9, roughness: 0.15 }));
        if (ptMesh) g.add(ptMesh);
      }

      // ── EGT Probe ────────────────────────────────────────────────────────
      const probeGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8);
      probeGeo.rotateZ(Math.PI / 2);
      const probe = new THREE.Mesh(probeGeo, this.materials.polishedSteel);
      probe.position.set(bx * 0.20, -0.25, 0);
      head.add(probe);

      // ── Injector ─────────────────────────────────────────────────────────
      const injGeo = new THREE.CylinderGeometry(0.040, 0.034, 0.30, 12);
      const inj = new THREE.Mesh(injGeo, this._fuelRailMat.clone());
      inj.position.set(headCX, 0.52, 0);
      inj.rotation.z = Math.PI / 2;
      g.add(inj);
      // AN fitting
      const afGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.044, 6);
      afGeo.rotateZ(Math.PI / 2);
      const af = new THREE.Mesh(afGeo, this._brassAnMat);
      af.position.set(headCX + bx * 0.16, 0.52, 0);
      g.add(af);
      this.injectors.push(inj);

      // Fuel feed line to rail
      const flineMesh = _mkTube([
        [headCX + bx * 0.22, 0.52, 0],
        [headCX + bx * 0.30, 0.76, 0],
        [bx * 0.62, 0.84, cfg.z]
      ], 0.017, this._brassAnMat);
      if (flineMesh) this.group.add(flineMesh);

      // ── Piston Assembly ───────────────────────────────────────────────────
      const pistonGrp = new THREE.Group();
      pistonGrp.name = `Piston_${cfg.id}`;

      // Crown
      const crGeo = new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.36, 20);
      crGeo.rotateZ(Math.PI / 2);
      pistonGrp.add(new THREE.Mesh(crGeo, this.materials.polishedSteel));

      // Skirt
      const skGeo = new THREE.CylinderGeometry(r * 0.90, r * 0.90, 0.28, 20);
      skGeo.rotateZ(Math.PI / 2);
      const sk = new THREE.Mesh(skGeo, this._darkSteelMat);
      sk.position.x = bx * -0.28;
      pistonGrp.add(sk);

      // 2 compression rings + 1 oil ring (TorusGeometry, ring in YZ plane via rotateZ(PI/2))
      for (const [xOff, iw] of [[-0.06, 0.011], [0.06, 0.011], [0.20, 0.015]]) {
        const rgGeo = new THREE.TorusGeometry(r * 0.91, iw, 6, 28);
        rgGeo.rotateZ(Math.PI / 2); // puts ring in YZ plane (wraps around X-axis cylinder)
        const ring = new THREE.Mesh(rgGeo, this._springMat);
        ring.position.x = xOff;
        pistonGrp.add(ring);
      }

      // Wrist pin
      const wpGeo = new THREE.CylinderGeometry(0.042, 0.042, r * 1.7, 10);
      const wp = new THREE.Mesh(wpGeo, this.materials.polishedSteel);
      wp.position.x = bx * -0.22;
      pistonGrp.add(wp);

      pistonGrp.position.x = bx * this.bankOffset;
      g.add(pistonGrp);
      this.pistons.push({ group: pistonGrp, bank: bx, phase: cfg.phase });

      // ── I-Section Connecting Rod ──────────────────────────────────────────
      const rodGrp = new THREE.Group();
      rodGrp.name = `ConRod_${cfg.id}`;
      const rodLen = 0.90;

      // I-beam web
      const webGeo = new THREE.BoxGeometry(rodLen, 0.062, 0.082);
      rodGrp.add(new THREE.Mesh(webGeo, this.materials.polishedSteel));
      // Top flange
      const tfGeo = new THREE.BoxGeometry(rodLen, 0.016, 0.20);
      const tf = new THREE.Mesh(tfGeo, this.materials.polishedSteel);
      tf.position.y = 0.040;
      rodGrp.add(tf);
      // Bottom flange
      const bfm = tf.clone(); bfm.position.y = -0.040;
      rodGrp.add(bfm);
      // Big-end bearing
      const beGeo = new THREE.CylinderGeometry(0.138, 0.138, 0.22, 16);
      beGeo.rotateX(Math.PI / 2);
      const be = new THREE.Mesh(beGeo, this._darkSteelMat);
      be.position.x = -rodLen * 0.5;
      rodGrp.add(be);
      // Big-end cap bolts (2)
      for (const bz of [-0.065, 0.065]) {
        const cb = _mkBolt(0.028, 0.115, this.materials.polishedSteel);
        cb.position.set(-rodLen * 0.5, -0.148, bz);
        rodGrp.add(cb);
      }
      // Small-end eye
      const seGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.20, 14);
      seGeo.rotateX(Math.PI / 2);
      const se = new THREE.Mesh(seGeo, this._darkSteelMat);
      se.position.x = rodLen * 0.5;
      rodGrp.add(se);

      rodGrp.position.x = bx * 0.08;
      g.add(rodGrp);
      this.connectingRods.push({ group: rodGrp, bank: bx, phase: cfg.phase });

      // ── Spark Point Light ────────────────────────────────────────────────
      const sl = new THREE.PointLight(0xf59e0b, 0, 1.4);
      sl.position.set(headCX, 0.10, 0);
      g.add(sl);
      this.sparkLights.push(sl);

      this._reg(head, {
        componentId: `Cylinder${cfg.id}`,
        name: `Cylinder #${cfg.id} Assembly`,
        category: `COMBUSTION CHAMBER // BOXER ${bx < 0 ? 'LEFT' : 'RIGHT'} BANK`,
        cylinderIndex: idx
      });

      this.group.add(g);
    });

    // Fuel rail (each bank, runs along Z)
    for (const bx of [-1, 1]) {
      const rlGeo = new THREE.CylinderGeometry(0.038, 0.038, 2.20, 16);
      rlGeo.rotateX(Math.PI / 2);
      const rl = new THREE.Mesh(rlGeo, this._brassAnMat);
      rl.position.set(bx * 0.62, 0.84, 0);
      this._reg(rl, {
        componentId: `FuelRail_${bx > 0 ? 'R' : 'L'}`,
        name: `Fuel Injection Rail ${bx > 0 ? 'Right' : 'Left'}`,
        category: 'FUEL DELIVERY // HIGH-PRESSURE RAIL'
      });
      this.group.add(rl);
      // Rail end cap
      const rcGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.055, 10);
      for (const ze of [-1.12, 1.12]) {
        const rc = new THREE.Mesh(rcGeo, this._brassAnMat);
        rc.position.set(bx * 0.62, 0.84, ze);
        this.group.add(rc);
      }
    }

    // Intake manifold runner stubs
    for (const bx of [-1, 1]) {
      for (const z of [-0.925, -0.310, 0.310, 0.925]) {
        const imMesh = _mkTube([
          [bx * (this.bankOffset + 0.30), 0.42, z],
          [bx * (this.bankOffset + 0.60), 0.62, z],
          [bx * (this.bankOffset + 0.72), 0.82, z]
        ], 0.058, new THREE.MeshStandardMaterial({
          color: 0x0a3a6e, metalness: 0.6, roughness: 0.35
        }));
        if (imMesh) this.group.add(imMesh);
      }
    }
  }

  // ── OIL SYSTEM ───────────────────────────────────────────────────────────
  _buildOilSystem() {
    // Oil sump (dry-sump style)
    const spGeo = new THREE.BoxGeometry(1.62, 0.44, 2.88);
    const sump = new THREE.Mesh(spGeo, this.materials.darkComposite);
    sump.position.y = -0.72;
    sump.castShadow = true;
    this._reg(sump, {
      componentId: 'OilSump',
      name: 'Dry Sump Oil Pan',
      category: 'LUBRICATION CIRCUIT // DRY SUMP'
    });
    this.group.add(sump);

    // Sump ribs
    for (let z = -1.22; z <= 1.22; z += 0.40) {
      const rg = new THREE.BoxGeometry(1.65, 0.055, 0.065);
      const r = new THREE.Mesh(rg, this.materials.darkComposite);
      r.position.set(0, -0.84, z);
      this.group.add(r);
    }

    // Oil filter
    const ofGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.36, 16);
    const oFilter = new THREE.Mesh(ofGeo, new THREE.MeshStandardMaterial({
      color: 0x5c2d0e, metalness: 0.45, roughness: 0.62
    }));
    oFilter.position.set(-0.90, -0.42, -0.76);
    this._reg(oFilter, {
      componentId: 'OilFilter', name: 'Oil Filter Housing', category: 'LUBRICATION // SPIN-ON'
    });
    this.group.add(oFilter);

    // Oil lines
    const oLine1 = _mkTube([
      [-0.90, -0.30, -0.76], [-0.65, -0.08, -1.0], [-0.30, 0.18, -1.18]
    ], 0.025, this._rubberMat);
    if (oLine1) this.group.add(oLine1);

    const oLine2 = _mkTube([
      [0.60, -0.68, -1.10], [0.40, -0.32, -1.45], [0.0, -0.18, -1.58]
    ], 0.022, this._rubberMat);
    if (oLine2) this.group.add(oLine2);
  }

  // ── PROPELLER DRIVE ───────────────────────────────────────────────────────
  _buildPropellerDrive() {
    // Gearbox
    const gbGeo = new THREE.CylinderGeometry(0.54, 0.70, 0.68, 22);
    gbGeo.rotateX(Math.PI / 2);
    const gb = new THREE.Mesh(gbGeo, this.materials.castAluminum);
    gb.position.set(0, 0.08, 2.02);
    this.group.add(gb);
    // 6 gearbox ribs
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rGeo = new THREE.BoxGeometry(0.065, 0.28, 0.68);
      const rMesh = new THREE.Mesh(rGeo, this.materials.castAluminum);
      rMesh.position.set(Math.cos(a) * 0.40, Math.sin(a) * 0.40 + 0.08, 2.02);
      rMesh.rotation.z = a;
      this.group.add(rMesh);
    }

    // Propeller shaft
    const psGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.42, 14);
    psGeo.rotateX(Math.PI / 2);
    const pShaft = new THREE.Mesh(psGeo, this.materials.polishedSteel);
    pShaft.position.set(0, 0.08, 2.58);
    this.group.add(pShaft);

    // Hub + spinner
    const hubGrp = new THREE.Group();
    hubGrp.position.set(0, 0.08, 2.78);

    const flangeGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.10, 22);
    flangeGeo.rotateX(Math.PI / 2);
    hubGrp.add(new THREE.Mesh(flangeGeo, this.materials.castAluminum));

    const spinGeo = new THREE.ConeGeometry(0.34, 0.70, 22);
    spinGeo.rotateX(Math.PI / 2);
    const spinner = new THREE.Mesh(spinGeo, this.materials.polishedSteel);
    spinner.position.z = 0.38;
    hubGrp.add(spinner);

    // Hub bolts (6)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const hb = _mkBolt(0.024, 0.075, this.materials.polishedSteel);
      hb.position.set(Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0);
      hubGrp.add(hb);
    }

    // Propeller (3 blades, section-by-section for taper)
    this.propeller = new THREE.Group();
    this.propeller.position.z = 0.38;
    for (let b = 0; b < 3; b++) {
      const bAng = (b / 3) * Math.PI * 2;
      const bladeGrp = new THREE.Group();
      bladeGrp.rotation.z = bAng;
      // Root section
      const b1G = new THREE.BoxGeometry(0.24, 0.40, 0.060);
      const b1 = new THREE.Mesh(b1G, this.materials.propellerBlade);
      b1.position.y = 0.20; b1.rotation.z = 0.14;
      bladeGrp.add(b1);
      // Mid section
      const b2G = new THREE.BoxGeometry(0.18, 0.60, 0.046);
      const b2 = new THREE.Mesh(b2G, this.materials.propellerBlade);
      b2.position.y = 0.60; b2.rotation.z = 0.10;
      bladeGrp.add(b2);
      // Tip
      const b3G = new THREE.BoxGeometry(0.12, 0.52, 0.030);
      const b3 = new THREE.Mesh(b3G, this.materials.propellerBlade);
      b3.position.y = 1.12; b3.rotation.z = 0.06;
      bladeGrp.add(b3);
      this.propeller.add(bladeGrp);
    }
    hubGrp.add(this.propeller);
    this.group.add(hubGrp);
    this._propellerHub = hubGrp;
  }

  // ── ECU / FADEC ──────────────────────────────────────────────────────────
  _buildECU() {
    const ecuGeo = new THREE.BoxGeometry(0.30, 0.56, 0.78);
    const ecu = new THREE.Mesh(ecuGeo, this.materials.ecuMat);
    ecu.position.set(-1.06, 0.38, -0.70);
    this._reg(ecu, {
      componentId: 'ECU',
      name: 'FADEC Dual-Channel ECU',
      category: 'ELECTRONIC CONTROL // CS-E REDUNDANT'
    });
    // Mounting rail
    const rlGeo = new THREE.BoxGeometry(0.32, 0.040, 0.82);
    this.group.add(new THREE.Mesh(rlGeo, this._darkSteelMat) );
    this.group.children[this.group.children.length - 1].position.set(-1.06, 0.07, -0.70);
    this.group.add(ecu);

    // Magneto (dual ignition)
    for (const mx of [-0.52, 0.52]) {
      const magGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.22, 14);
      magGeo.rotateZ(Math.PI / 2);
      const mag = new THREE.Mesh(magGeo, this._darkSteelMat);
      mag.position.set(mx, 0.30, -1.64);
      this.group.add(mag);
    }
  }

  // ── PARTICLES ─────────────────────────────────────────────────────────────
  _buildParticles() {
    // Oil flow particles
    const oCount = 44;
    const oGeo = new THREE.BufferGeometry();
    const oPos = new Float32Array(oCount * 3);
    for (let i = 0; i < oCount; i++) {
      oPos[i * 3]     = (Math.random() - 0.5) * 1.8;
      oPos[i * 3 + 1] = -0.52 + Math.random() * 0.22;
      oPos[i * 3 + 2] = (Math.random() - 0.5) * 2.6;
    }
    oGeo.setAttribute('position', new THREE.BufferAttribute(oPos, 3));
    this.oilParticles = new THREE.Points(oGeo, new THREE.PointsMaterial({
      color: 0xb45309, size: 0.050, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending
    }));
    this.group.add(this.oilParticles);

    // Exhaust particles
    const eCount = 28;
    const eGeo = new THREE.BufferGeometry();
    const ePos = new Float32Array(eCount * 3);
    for (let i = 0; i < eCount; i++) {
      ePos[i * 3]     = (Math.random() - 0.5) * 0.38;
      ePos[i * 3 + 1] = -0.28 + Math.random() * 0.12;
      ePos[i * 3 + 2] = -1.58 - Math.random() * 0.78;
    }
    eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
    this.exhaustParticles = new THREE.Points(eGeo, new THREE.PointsMaterial({
      color: 0x475569, size: 0.068, transparent: true, opacity: 0.60
    }));
    this.group.add(this.exhaustParticles);
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────────

  setExplodedView(factor) {
    this.explodedFactor = factor;
    const layout = [
      { bank: -1, z: -0.925 }, { bank: 1, z: -0.310 },
      { bank: -1, z:  0.310 }, { bank: 1, z:  0.925 },
    ];
    this.cylinderHeads.forEach((head, i) => {
      const bx = layout[i].bank;
      head.position.x = bx * (this.bankOffset + 0.31 + factor * 1.10);
    });
    if (this._propellerHub) {
      this._propellerHub.position.z = 2.78 + factor * 1.15;
    }
    this.outerHousingMeshes.forEach(m => {
      m.material.opacity = Math.max(0.06, 0.20 - factor * 0.18);
    });
  }

  setXRay(enable) {
    this.isXRay = enable;
    this.outerHousingMeshes.forEach(m => {
      m.material.opacity   = enable ? 0.07 : 0.20;
      m.material.emissive  = m.material.emissive || new THREE.Color();
      m.material.emissive.setHex(enable ? 0x0284c7 : 0x000000);
      m.material.emissiveIntensity = enable ? 0.10 : 0;
    });
    this.cylinderBarrels.forEach(b => {
      b.material.transparent = enable;
      b.material.opacity     = enable ? 0.22 : 1.0;
      b.material.depthWrite  = !enable;
    });
  }

  toggleLabels(enable) {
    this.showLabels = enable !== undefined ? enable : !this.showLabels;
    this.labelsGroup.visible = this.showLabels;
  }

  update(packet, deltaSeconds) {
    if (!packet || !packet.engine) return;
    const rpm       = packet.engine.rpm || 5000;
    const isRunning = packet.status === 'RUNNING';

    // Crank angle
    const visRevSec = isRunning ? (rpm / 5000) * 4.5 : 0;
    this.crankAngle = (this.crankAngle + visRevSec * Math.PI * 2 * deltaSeconds) % (Math.PI * 2);

    if (this.crankshaft) this.crankshaft.rotation.z = this.crankAngle;
    if (this.propeller)  this.propeller.rotation.z  = this.crankAngle / 2.43;

    // Crank-slider piston kinematics
    const rC = this.crankRadius;
    const lC = this.conRodLength;
    this.pistons.forEach((p, i) => {
      const rod   = this.connectingRods[i];
      const angle = this.crankAngle + p.phase;
      const sinA  = Math.sin(angle);
      const cosA  = Math.cos(angle);
      const disp  = rC * cosA + Math.sqrt(Math.max(0.001, lC * lC - (rC * sinA) ** 2));
      p.group.position.x = p.bank * (this.bankOffset - 0.52 + disp * 0.42);

      const rodAng = Math.asin(Math.min(1, Math.max(-1, rC * sinA / lC)));
      rod.group.position.y  = rC * sinA * 0.42;
      rod.group.rotation.z  = -p.bank * rodAng;

      // Spark flash at TDC
      const nearTDC = Math.abs(angle % (Math.PI * 2)) < 0.30;
      if (this.sparkLights[i]) {
        this.sparkLights[i].intensity = (isRunning && nearTDC) ? 1.7 : 0;
      }
    });

    // Thermal states on cylinder heads and barrels
    if (packet.cylinders) {
      packet.cylinders.forEach((cyl, i) => {
        const head   = this.cylinderHeads[i];
        const barrel = this.cylinderBarrels[i];
        if (!head) return;
        const cht = cyl.cht_c || 90;
        let ec = 0x000000, ei = 0;
        if (cht > 125) { ec = 0xdc2626; ei = 0.65; }
        else if (cht > 118) { ec = 0xea580c; ei = 0.42; }
        else if (cht > 112) { ec = 0xd97706; ei = 0.22; }
        head.material.emissive.setHex(ec);
        head.material.emissiveIntensity = ei;
        if (barrel) {
          barrel.material.emissive.setHex(ec);
          barrel.material.emissiveIntensity = ei * 0.45;
        }

        // Injector fault highlight
        const inj = this.injectors[i];
        if (inj) {
          if (cyl.fault === 'injector_degradation') {
            inj.material.color.setHex(0xf59e0b);
            inj.material.emissive.setHex(0xf59e0b);
            inj.material.emissiveIntensity = 0.55 + 0.28 * Math.sin(Date.now() * 0.012);
          } else {
            inj.material.color.setHex(0x0284c7);
            inj.material.emissive.setHex(0x000000);
            inj.material.emissiveIntensity = 0;
          }
        }
      });
    }

    // Vibration shaking
    const vibRms = packet.engine.vibration_rms_g || 0.42;
    if (isRunning) {
      const amp  = Math.min(0.08, vibRms * 0.025);
      const freq = Date.now() * 0.035;
      this.group.position.x = Math.sin(freq) * amp;
      this.group.position.y = Math.cos(freq * 1.3) * amp * 0.70;
    } else {
      this.group.position.set(0, 0, 0);
    }

    // Oil particle animation
    if (isRunning && this.oilParticles) {
      const pos = this.oilParticles.geometry.attributes.position.array;
      const spd = (rpm / 5000) * 1.5 * deltaSeconds;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 2] += spd * (Math.random() > 0.5 ? 0.6 : -0.4);
        if (Math.abs(pos[i + 2]) > 1.32) pos[i + 2] *= -0.75;
      }
      this.oilParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Legacy alias
  build3DLabels() {}
  buildParticleSystems() {}

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


// =============================================================================
// B. MASTER MULTI-ENGINE 3D COORDINATOR — unchanged public API
// =============================================================================
class Engine3DModel {
  constructor(scene, initialEngineType = 'BOXER') {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'MultiEngineLabRoot';
    this.scene.add(this.group);

    this.activeEngineType = initialEngineType;
    this.activeModel      = null;
    this.isXRay           = false;
    this.showLabels       = true;
    this.explodedFactor   = 0;

    // Shared PBR material palette — richer v2 preset
    this.materials = {
      castAluminum: new THREE.MeshStandardMaterial({
        color: 0x828d9a, metalness: 0.70, roughness: 0.32, name: 'CastAluminum'
      }),
      xrayCrankcase: new THREE.MeshStandardMaterial({
        color: 0x38bdf8, metalness: 0.20, roughness: 0.10,
        transparent: true, opacity: 0.25, depthWrite: false, name: 'XRayGlass'
      }),
      polishedSteel: new THREE.MeshStandardMaterial({
        color: 0xd0d8e0, metalness: 0.92, roughness: 0.12, name: 'PolishedSteel'
      }),
      darkComposite: new THREE.MeshStandardMaterial({
        color: 0x1a1e26, metalness: 0.24, roughness: 0.52, name: 'DarkComposite'
      }),
      propellerBlade: new THREE.MeshStandardMaterial({
        color: 0x25272e, metalness: 0.42, roughness: 0.30, name: 'PropBlade'
      }),
      copperBrass: new THREE.MeshStandardMaterial({
        color: 0xb45309, metalness: 0.82, roughness: 0.24, name: 'BrassCopper'
      }),
      ecuMat: new THREE.MeshStandardMaterial({
        color: 0x1e2a3a, metalness: 0.72, roughness: 0.30, name: 'ECUChassis'
      }),
    };

    this.instantiateEngine(this.activeEngineType);
  }

  instantiateEngine(type) {
    if (this.activeModel) {
      this.group.remove(this.activeModel.group);
      this.activeModel.dispose();
      this.activeModel = null;
    }
    this.activeEngineType = type;

    switch (type) {
      case 'HEAVY_FUEL_CI':
        this.activeModel = typeof HeavyFuelEngineModel !== 'undefined'
          ? new HeavyFuelEngineModel(this.scene, this.materials)
          : new BoxerEngineModel(this.scene, this.materials);
        break;
      case 'WANKEL_ROTARY':
        this.activeModel = typeof WankelRotaryEngineModel !== 'undefined'
          ? new WankelRotaryEngineModel(this.scene, this.materials)
          : new BoxerEngineModel(this.scene, this.materials);
        break;
      case 'TURBO_INLINE_V':
        this.activeModel = typeof TurbochargedEngineModel !== 'undefined'
          ? new TurbochargedEngineModel(this.scene, this.materials)
          : new BoxerEngineModel(this.scene, this.materials);
        break;
      case 'BOXER':
      default:
        this.activeModel = new BoxerEngineModel(this.scene, this.materials);
        break;
    }

    this.group.add(this.activeModel.group);

    if (this.isXRay && this.activeModel.setXRay) this.activeModel.setXRay(true);
    if (this.explodedFactor > 0 && this.activeModel.setExplodedView) {
      this.activeModel.setExplodedView(this.explodedFactor);
    }
  }

  switchEngine(engineType) {
    if (this.activeEngineType === engineType && this.activeModel) return;
    this.instantiateEngine(engineType);
  }

  get interactiveMeshes() {
    return this.activeModel ? this.activeModel.interactiveMeshes : [];
  }

  toggleXRay(enable) {
    this.isXRay = enable !== undefined ? enable : !this.isXRay;
    if (this.activeModel && this.activeModel.setXRay) this.activeModel.setXRay(this.isXRay);
  }

  setExplodedView(factor) {
    this.explodedFactor = factor;
    if (this.activeModel && this.activeModel.setExplodedView) this.activeModel.setExplodedView(factor);
  }

  toggleLabels(enable) {
    this.showLabels = enable !== undefined ? enable : !this.showLabels;
    if (this.activeModel && this.activeModel.toggleLabels) this.activeModel.toggleLabels(this.showLabels);
  }

  update(packet, deltaSeconds) {
    if (this.activeModel && this.activeModel.update) this.activeModel.update(packet, deltaSeconds);
  }

  dispose() {
    if (this.activeModel) { this.activeModel.dispose(); this.activeModel = null; }
    this.scene.remove(this.group);
  }
}

// Global exports — maintain backward compatibility
window.Engine3DModel   = Engine3DModel;
window.BoxerEngineModel = BoxerEngineModel;

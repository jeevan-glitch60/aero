/**
 * ============================================================================
 * AEROTWIN // 3D WANKEL ROTARY ENGINE MODEL v2.0
 * ============================================================================
 * Professional engineering cutaway — single-rotor Wankel RCE demonstrator.
 * Upgraded: parametric epitrochoid housing, accurate Reuleaux rotor, apex seals,
 * side seals, combustion zone arcs, cooling fins, oil metering system.
 *
 * SYNTHETIC ENGINE CUTAWAY — NOT CERTIFIED CAD OR FLIGHT SOFTWARE
 */

'use strict';

class WankelRotaryEngineModel {
  constructor(scene, materials) {
    this.scene     = scene;
    this.materials = materials;
    this.group     = new THREE.Group();
    this.group.name = 'WankelRotaryEngineRoot';

    // Kinematic refs
    this.eccentricShaft    = null;
    this.rotor             = null;
    this.rotorGroup        = null;
    this.propeller         = null;
    this.apexSeals         = [];
    this.housingMesh       = null;
    this.housingFaces      = [];
    this.combustionZoneGlow = null;
    this.oilPumpMesh       = null;
    this.ecuMesh           = null;
    this.sparkLights       = [];
    this.exhaustParticles  = null;
    this.recessMeshes      = [];
    this.outerShell        = null;

    // Interactive
    this.interactiveMeshes = [];

    // State
    this.shaftAngle  = 0;
    this.isXRay      = true; // Default transparent so rotor is visible
    this.explodedFactor = 0;

    this._initMaterials();
    this.initModel();
  }

  _initMaterials() {
    this.wankelHousingMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, metalness: 0.80, roughness: 0.25,
      transparent: true, opacity: 0.40,
      depthWrite: false, side: THREE.DoubleSide, name: 'WankelHousingGlass'
    });
    this.wankelHousingSolid = new THREE.MeshStandardMaterial({
      color: 0x475569, metalness: 0.85, roughness: 0.30, name: 'WankelHousingSolid'
    });
    this.wankelRotorMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, metalness: 0.90, roughness: 0.22, name: 'WankelRotor'
    });
    this.wankelSealMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, emissive: new THREE.Color(0x0284c7),
      emissiveIntensity: 0.20, metalness: 0.90, roughness: 0.15, name: 'ApexSeal'
    });
    this.wankelShaftMat = new THREE.MeshStandardMaterial({
      color: 0xd0d8e0, metalness: 0.92, roughness: 0.12, name: 'EccentricShaft'
    });
    this.wankelFinMat = new THREE.MeshStandardMaterial({
      color: 0x7a8898, metalness: 0.72, roughness: 0.32, name: 'HousingFin'
    });
    this.wankelExhMat = new THREE.MeshStandardMaterial({
      color: 0x374151, metalness: 0.82, roughness: 0.36, name: 'WankelExhaust'
    });
    this.wankelPortMat = new THREE.MeshStandardMaterial({
      color: 0x0a3a6e, metalness: 0.62, roughness: 0.38, name: 'WankelIntakePort'
    });
    this.wankelSideSealMat = new THREE.MeshStandardMaterial({
      color: 0x5a6674, metalness: 0.88, roughness: 0.20, name: 'SideSeal'
    });
    this.wankelGlowMat = new THREE.MeshStandardMaterial({
      color: 0xf97316, emissive: new THREE.Color(0xea580c),
      emissiveIntensity: 0.15, transparent: true, opacity: 0.22,
      depthWrite: false, side: THREE.DoubleSide, name: 'CombustionGlow'
    });
    this.wankelRubber = new THREE.MeshStandardMaterial({
      color: 0x1a1d24, metalness: 0.04, roughness: 0.88
    });
    this.wankelOilMat = new THREE.MeshStandardMaterial({
      color: 0xb45309, metalness: 0.88, roughness: 0.22
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
      new THREE.TubeGeometry(curve, Math.max(6, pts.length * 3), r, 8, false),
      mat
    );
  }

  // Build the epitrochoid housing cross-section as an ExtrudeGeometry
  _buildEpitrochoidShape() {
    // Approximate epitrochoid with parametric curve
    // R = generating circle radius = 1.0, e = eccentricity = 0.15
    const R = 1.0, e = 0.15;
    const shape = new THREE.Shape();
    const N = 64;
    for (let i = 0; i <= N; i++) {
      const t   = (i / N) * Math.PI * 2;
      const x   = (R + e) * Math.cos(t) - e * Math.cos((R / e + 1) * t);
      const y   = (R + e) * Math.sin(t) - e * Math.sin((R / e + 1) * t);
      // Scale to reasonable engine size
      const sx  = x * 0.82;
      const sy  = y * 0.82;
      if (i === 0) shape.moveTo(sx, sy);
      else         shape.lineTo(sx, sy);
    }
    shape.closePath();
    return shape;
  }

  // Build the Reuleaux rotor cross-section
  _buildReuleauxShape(scale) {
    const sc = scale || 0.62;
    const shape = new THREE.Shape();
    // Reuleaux triangle: intersection of 3 circles
    // Vertices of equilateral triangle
    const verts = [
      new THREE.Vector2( 0,      sc),
      new THREE.Vector2(-sc * Math.sin(Math.PI * 2 / 3), -sc * Math.cos(Math.PI * 2 / 3)),
      new THREE.Vector2( sc * Math.sin(Math.PI * 2 / 3), -sc * Math.cos(Math.PI * 2 / 3)),
    ];
    const N = 24;
    // Arc from vert[0] to vert[1] centered at vert[2]
    for (let i = 0; i < 3; i++) {
      const from   = verts[i];
      const to     = verts[(i + 1) % 3];
      const center = verts[(i + 2) % 3];
      const r      = from.distanceTo(center);
      const aFrom  = Math.atan2(from.y - center.y, from.x - center.x);
      const aTo    = Math.atan2(to.y - center.y, to.x - center.x);
      let dA = aTo - aFrom;
      // Ensure we go the short way
      if (dA > Math.PI)  dA -= Math.PI * 2;
      if (dA < -Math.PI) dA += Math.PI * 2;
      for (let j = 0; j <= N; j++) {
        const t  = j / N;
        const a  = aFrom + dA * t;
        const px = center.x + r * Math.cos(a);
        const py = center.y + r * Math.sin(a);
        if (i === 0 && j === 0) shape.moveTo(px, py);
        else                    shape.lineTo(px, py);
      }
    }
    shape.closePath();
    return shape;
  }

  initModel() {
    this.createHousing();
    this.createEccentricShaft();
    this.createRotorAndSeals();
    this.createThermodynamicZones();
    this.createPortsAndManifolds();
    this.createPropellerAndDrive();
    this.createAccessories();
  }

  // ── HOUSING ───────────────────────────────────────────────────────────────
  createHousing() {
    // Main housing body using ExtrudeGeometry (epitrochoid cross-section)
    const housingShape = this._buildEpitrochoidShape();
    const extSettings  = { depth: 0.72, bevelEnabled: false };
    const housingGeo   = new THREE.ExtrudeGeometry(housingShape, extSettings);
    housingGeo.rotateX(Math.PI / 2);
    housingGeo.translate(0, 0, -0.36);

    this.housingMesh = new THREE.Mesh(housingGeo, this.wankelHousingMat);
    this._reg(this.housingMesh, {
      componentId: 'WankelHousing',
      name: 'Epitrochoid Rotor Housing',
      category: 'HOUSING // CAST ALUMINIUM — WANKEL RCE'
    });
    this.group.add(this.housingMesh);

    // Solid back to give housing depth appearance
    const housingRim = new THREE.Mesh(
      new THREE.ExtrudeGeometry(housingShape, { depth: 0.72, bevelEnabled: false }),
      this.wankelHousingSolid
    );
    housingRim.rotateX(Math.PI / 2);
    housingRim.translateY(-0.36);
    housingRim.scale.set(0.92, 0.92, 0.92); // slightly smaller to show gap
    this.group.add(housingRim);

    // Front side plate (annular disc)
    const frontPlateGeo = new THREE.CylinderGeometry(1.02, 1.02, 0.10, 36);
    const frontPlate = new THREE.Mesh(frontPlateGeo, this.wankelHousingSolid);
    frontPlate.rotation.x = Math.PI / 2;
    frontPlate.position.z = -0.40;
    this.group.add(frontPlate);
    this.housingFaces.push(frontPlate);

    // Rear side plate
    const rearPlate = frontPlate.clone();
    rearPlate.position.z = 0.40;
    this.group.add(rearPlate);
    this.housingFaces.push(rearPlate);

    // Flange bolts on side plates (12 each)
    for (const pz of [-0.44, 0.44]) {
      for (let b = 0; b < 12; b++) {
        const a = (b / 12) * Math.PI * 2;
        const bGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.06, 6);
        bGeo.rotateX(Math.PI / 2);
        const bolt = new THREE.Mesh(bGeo, this.wankelShaftMat);
        bolt.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.95, pz);
        this.group.add(bolt);
      }
    }

    // 16 external cooling fins around housing
    for (let f = 0; f < 16; f++) {
      const a    = (f / 16) * Math.PI * 2;
      const rx   = Math.cos(a) * 1.08;
      const ry   = Math.sin(a) * 1.08;
      const finGeo = new THREE.BoxGeometry(0.055, 0.20, 0.66);
      const fin    = new THREE.Mesh(finGeo, this.wankelFinMat);
      fin.position.set(rx, ry, 0);
      fin.rotation.z = a;
      this.group.add(fin);
    }

    // Outer shell for cutaway
    const shellGeo = new THREE.CylinderGeometry(1.28, 1.28, 0.78, 28);
    this.outerShell = new THREE.Mesh(shellGeo, new THREE.MeshStandardMaterial({
      color: 0x5a6880, metalness: 0.70, roughness: 0.30,
      transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide
    }));
    this.outerShell.rotation.x = Math.PI / 2;
    this.group.add(this.outerShell);
  }

  // ── ECCENTRIC SHAFT ────────────────────────────────────────────────────────
  createEccentricShaft() {
    this.eccentricShaft = new THREE.Group();

    // Main shaft (through-housing)
    const msGeo = new THREE.CylinderGeometry(0.088, 0.088, 1.80, 18);
    msGeo.rotateX(Math.PI / 2);
    this.eccentricShaft.add(new THREE.Mesh(msGeo, this.wankelShaftMat));

    // Eccentric lobe (off-axis journal, e = 0.28)
    const eGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.70, 18);
    eGeo.rotateX(Math.PI / 2);
    const eLobe = new THREE.Mesh(eGeo, this.wankelShaftMat);
    eLobe.position.x = 0.28; // eccentric offset
    this.eccentricShaft.add(eLobe);

    // Two counterweights
    for (const zp of [-0.42, 0.42]) {
      const cwGeo = new THREE.BoxGeometry(0.12, 0.45, 0.22);
      const cw    = new THREE.Mesh(cwGeo, new THREE.MeshStandardMaterial({
        color: 0x3d4756, metalness: 0.88, roughness: 0.36
      }));
      cw.position.set(-0.20, 0, zp);
      this.eccentricShaft.add(cw);
    }

    // Stationary gear (front plate, gold)
    const stGearGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 22);
    stGearGeo.rotateX(Math.PI / 2);
    const stGear = new THREE.Mesh(stGearGeo, this.wankelOilMat);
    stGear.position.z = -0.44;
    this.eccentricShaft.add(stGear);
    // Gear teeth
    for (let t = 0; t < 18; t++) {
      const a = (t / 18) * Math.PI * 2;
      const tGeo = new THREE.BoxGeometry(0.036, 0.048, 0.07);
      const tooth = new THREE.Mesh(tGeo, this.wankelOilMat);
      tooth.position.set(Math.cos(a) * 0.29, Math.sin(a) * 0.29, -0.44);
      tooth.rotation.z = a;
      this.eccentricShaft.add(tooth);
    }

    this._reg(new THREE.Mesh(msGeo.clone(), this.wankelShaftMat), {
      componentId: 'EccentricShaft',
      name: 'Eccentric Shaft (Output Shaft)',
      category: 'POWER OUTPUT // CASE-HARDENED STEEL'
    });
    this.group.add(this.eccentricShaft);
  }

  // ── ROTOR & SEALS ─────────────────────────────────────────────────────────
  createRotorAndSeals() {
    this.rotorGroup = new THREE.Group();

    // Rotor body using Reuleaux/triangular shape
    const rotorShape = this._buildReuleauxShape(0.62);
    const rotorGeo   = new THREE.ExtrudeGeometry(rotorShape, {
      depth: 0.56, bevelEnabled: false
    });
    rotorGeo.rotateX(Math.PI / 2);
    rotorGeo.translate(0, 0, -0.28);

    this.rotor = new THREE.Mesh(rotorGeo, this.wankelRotorMat);
    this._reg(this.rotor, {
      componentId: 'WankelRotor',
      name: 'Triangular Rotor (Reuleaux)',
      category: 'ROTOR // NODULAR CAST IRON — OEM WANKEL'
    });
    this.rotorGroup.add(this.rotor);

    // Internal ring gear (visible as ring at rotor face)
    const ringGearGeo = new THREE.TorusGeometry(0.26, 0.030, 8, 24);
    ringGearGeo.rotateX(Math.PI / 2);
    const ringGear = new THREE.Mesh(ringGearGeo, this.wankelOilMat);
    ringGear.position.z = -0.30;
    this.rotorGroup.add(ringGear);

    // 3 combustion recesses on rotor faces
    const rotorFaceAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
    rotorFaceAngles.forEach((a, i) => {
      // Recess (slightly inset pocket on face)
      const recGeo = new THREE.BoxGeometry(0.22, 0.10, 0.48);
      const rec    = new THREE.Mesh(recGeo, new THREE.MeshStandardMaterial({
        color: 0x2a3040, metalness: 0.80, roughness: 0.45
      }));
      rec.position.set(Math.cos(a + Math.PI / 6) * 0.35, Math.sin(a + Math.PI / 6) * 0.35, 0);
      rec.rotation.z = a + Math.PI / 6;
      this.rotorGroup.add(rec);
      this.recessMeshes.push(rec);
    });

    // 3 apex seals at rotor vertices
    const rotorVertexAngles = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];
    rotorVertexAngles.forEach((a, i) => {
      // Seal body
      const sealGeo = new THREE.BoxGeometry(0.028, 0.048, 0.52);
      const seal = new THREE.Mesh(sealGeo, this.wankelSealMat.clone());
      seal.position.set(Math.cos(a) * 0.60, Math.sin(a) * 0.60, 0);
      seal.rotation.z = a + Math.PI / 2;
      this.rotorGroup.add(seal);
      this.apexSeals.push(seal);

      // Seal spring (tiny)
      const ssGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.44, 6);
      ssGeo.rotateX(Math.PI / 2);
      const ss = new THREE.Mesh(ssGeo, new THREE.MeshStandardMaterial({
        color: 0xb8c5d0, metalness: 0.95, roughness: 0.12
      }));
      ss.position.set(Math.cos(a) * 0.58, Math.sin(a) * 0.58, 0);
      this.rotorGroup.add(ss);
    });

    // Side seals (curved strips along each face)
    for (let f = 0; f < 3; f++) {
      const fAng = (f / 3) * Math.PI * 2;
      for (const zs of [-0.25, 0.25]) {
        const ssGeo = new THREE.TorusGeometry(0.42, 0.012, 6, 16, (2 * Math.PI) / 3);
        ssGeo.rotateX(Math.PI / 2);
        const ss = new THREE.Mesh(ssGeo, this.wankelSideSealMat);
        ss.position.z = zs;
        ss.rotation.z = fAng;
        this.rotorGroup.add(ss);
      }
    }

    this.group.add(this.rotorGroup);
  }

  // ── THERMODYNAMIC ZONES ────────────────────────────────────────────────────
  createThermodynamicZones() {
    // Zone arcs: intake (blue), compression (grey), combustion (orange-red), exhaust (dark)
    const zones = [
      { start: -Math.PI * 0.9,  sweep: Math.PI * 0.7,  color: 0x0369a1, name: 'Intake' },
      { start: -Math.PI * 0.2,  sweep: Math.PI * 0.55, color: 0x64748b, name: 'Compression' },
      { start:  Math.PI * 0.35, sweep: Math.PI * 0.60, color: 0xdc2626, name: 'Combustion' },
      { start:  Math.PI * 0.95, sweep: Math.PI * 0.65, color: 0x1f2937, name: 'Exhaust' },
    ];
    zones.forEach(z => {
      const arcGeo = new THREE.TorusGeometry(0.96, 0.048, 4, 18, z.sweep);
      arcGeo.rotateX(Math.PI / 2);
      const arc = new THREE.Mesh(arcGeo, new THREE.MeshStandardMaterial({
        color: z.color, metalness: 0.50, roughness: 0.40,
        transparent: true, opacity: 0.45, depthWrite: false
      }));
      arc.rotation.y = z.start;
      arc.position.z = 0;
      this.group.add(arc);
    });

    // Combustion zone animated glow ring
    const glowGeo = new THREE.TorusGeometry(0.72, 0.18, 6, 20, Math.PI * 0.55);
    glowGeo.rotateX(Math.PI / 2);
    this.combustionZoneGlow = new THREE.Mesh(glowGeo, this.wankelGlowMat);
    this.combustionZoneGlow.rotation.y = Math.PI * 0.35;
    this.group.add(this.combustionZoneGlow);

    // 2 spark plug positions (leading + trailing)
    for (const [a, label] of [[Math.PI * 0.40, 'Leading'], [Math.PI * 0.55, 'Trailing']]) {
      const spGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.20, 12);
      const sp = new THREE.Mesh(spGeo, new THREE.MeshStandardMaterial({
        color: 0xd97706, metalness: 0.92, roughness: 0.16
      }));
      sp.position.set(Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0);
      sp.rotation.z = a;
      this.group.add(sp);
      // Ceramic
      const cerGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.12, 10);
      const cer = new THREE.Mesh(cerGeo, new THREE.MeshStandardMaterial({
        color: 0xf8f8f2, metalness: 0.05, roughness: 0.70
      }));
      cer.position.set(Math.cos(a) * 0.88, Math.sin(a) * 0.88, 0);
      cer.rotation.z = a;
      this.group.add(cer);
      // Spark light
      const sl = new THREE.PointLight(0xf59e0b, 0, 1.2);
      sl.position.set(Math.cos(a) * 0.82, Math.sin(a) * 0.82, 0);
      this.group.add(sl);
      this.sparkLights.push(sl);
    }
  }

  // ── PORTS & MANIFOLDS ─────────────────────────────────────────────────────
  createPortsAndManifolds() {
    // Peripheral intake port (top-left of housing)
    const intGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.42, 12);
    intGeo.rotateZ(Math.PI / 4);
    const intPort = new THREE.Mesh(intGeo, this.wankelPortMat);
    intPort.position.set(-0.90, 0.90, 0);
    this.group.add(intPort);
    this._reg(intPort, {
      componentId: 'IntakePort',
      name: 'Peripheral Intake Port',
      category: 'AIR-FUEL INTAKE // PERIPHERAL PORT'
    });

    // Intake manifold (curving runner)
    const im = this._tube([
      [-0.90, 0.90, 0], [-1.10, 1.12, 0], [-1.32, 1.28, 0]
    ], 0.090, this.wankelPortMat);
    if (im) this.group.add(im);
    // Air filter box
    const afGeo = new THREE.BoxGeometry(0.38, 0.28, 0.65);
    this.group.add(new THREE.Mesh(afGeo, new THREE.MeshStandardMaterial({
      color: 0x1a2030, metalness: 0.30, roughness: 0.70
    }))).position.set(-1.52, 1.38, 0);

    // Peripheral exhaust port (bottom-right)
    const exGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.44, 12);
    exGeo.rotateZ(-Math.PI / 4);
    const exPort = new THREE.Mesh(exGeo, this.wankelExhMat);
    exPort.position.set(0.92, -0.90, 0);
    this.group.add(exPort);
    this._reg(exPort, {
      componentId: 'ExhaustPort',
      name: 'Peripheral Exhaust Port',
      category: 'EXHAUST // PERIPHERAL PORT — HIGH EGT'
    });

    // Exhaust runner
    const ex = this._tube([
      [0.92, -0.90, 0], [1.12, -1.10, 0], [1.35, -1.30, 0]
    ], 0.098, this.wankelExhMat);
    if (ex) this.group.add(ex);

    // Fuel injector (port injection)
    const injGeo = new THREE.CylinderGeometry(0.036, 0.030, 0.28, 12);
    injGeo.rotateZ(Math.PI / 4);
    const inj = new THREE.Mesh(injGeo, new THREE.MeshStandardMaterial({
      color: 0x0284c7, metalness: 0.85, roughness: 0.20
    }));
    inj.position.set(-0.78, 0.78, 0);
    this.group.add(inj);

    // Exhaust particles
    const eCount = 28;
    const eGeo   = new THREE.BufferGeometry();
    const ePos   = new Float32Array(eCount * 3);
    for (let i = 0; i < eCount; i++) {
      ePos[i * 3]     = 1.35 + Math.random() * 0.50;
      ePos[i * 3 + 1] = -1.30 - Math.random() * 0.50;
      ePos[i * 3 + 2] = (Math.random() - 0.5) * 0.55;
    }
    eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
    this.exhaustParticles = new THREE.Points(eGeo, new THREE.PointsMaterial({
      color: 0x475569, size: 0.072, transparent: true, opacity: 0.65
    }));
    this.group.add(this.exhaustParticles);
  }

  // ── PROPELLER & DRIVE ──────────────────────────────────────────────────────
  createPropellerAndDrive() {
    // Reduction gearbox nose (front of housing)
    const gbGeo = new THREE.CylinderGeometry(0.48, 0.62, 0.65, 20);
    gbGeo.rotateX(Math.PI / 2);
    const gb = new THREE.Mesh(gbGeo, this.materials.castAluminum);
    gb.position.set(0, 0, 1.60);
    this.group.add(gb);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rGeo = new THREE.BoxGeometry(0.060, 0.24, 0.65);
      const rm = new THREE.Mesh(rGeo, this.materials.castAluminum);
      rm.position.set(Math.cos(a) * 0.38, Math.sin(a) * 0.38, 1.60);
      rm.rotation.z = a;
      this.group.add(rm);
    }

    // Prop shaft
    const psGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.40, 14);
    psGeo.rotateX(Math.PI / 2);
    const pShaft = new THREE.Mesh(psGeo, this.wankelShaftMat);
    pShaft.position.set(0, 0, 2.12);
    this.group.add(pShaft);

    // Hub
    const hubGrp = new THREE.Group();
    hubGrp.position.set(0, 0, 2.32);
    const fGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.10, 20);
    fGeo.rotateX(Math.PI / 2);
    hubGrp.add(new THREE.Mesh(fGeo, this.materials.castAluminum));
    const spGeo = new THREE.ConeGeometry(0.30, 0.62, 20);
    spGeo.rotateX(Math.PI / 2);
    const spinner = new THREE.Mesh(spGeo, this.wankelShaftMat);
    spinner.position.z = 0.34;
    hubGrp.add(spinner);

    this.propeller = new THREE.Group();
    this.propeller.position.z = 0.34;
    for (let b = 0; b < 3; b++) {
      const ba = (b / 3) * Math.PI * 2;
      const bg = new THREE.Group();
      bg.rotation.z = ba;
      for (const [by, blen, bw, br, rot] of [
        [0.20, 0.40, 0.22, 0.060, 0.14],
        [0.60, 0.58, 0.17, 0.046, 0.10],
        [1.10, 0.50, 0.11, 0.030, 0.06]
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

  // ── ACCESSORIES ────────────────────────────────────────────────────────────
  createAccessories() {
    // Oil metering pump (rear/bottom)
    const ompGeo = new THREE.BoxGeometry(0.28, 0.22, 0.38);
    this.oilPumpMesh = new THREE.Mesh(ompGeo, this.materials.ecuMat);
    this.oilPumpMesh.position.set(0.65, -1.45, 0);
    this._reg(this.oilPumpMesh, {
      componentId: 'OilMetering',
      name: 'Oil Metering Pump (Apex Seal)',
      category: 'LUBRICATION // APEX SEAL OIL INJECTION'
    });
    this.group.add(this.oilPumpMesh);

    // Oil lines
    const ol1 = this._tube([
      [0.65, -1.35, 0], [0.45, -1.10, 0], [0.22, -0.88, 0]
    ], 0.020, this.wankelRubber);
    if (ol1) this.group.add(ol1);

    // ECU
    const ecuGeo = new THREE.BoxGeometry(0.30, 0.50, 0.70);
    this.ecuMesh = new THREE.Mesh(ecuGeo, this.materials.ecuMat);
    this.ecuMesh.position.set(-1.55, -0.62, 0);
    this._reg(this.ecuMesh, {
      componentId: 'ECU', name: 'Engine ECU (FADEC)', category: 'ELECTRONIC CONTROL'
    });
    this.group.add(this.ecuMesh);

    // ECU wiring harness
    const eh = this._tube([
      [-1.38, -0.62, 0], [-1.10, -0.40, 0], [-0.88, -0.20, 0]
    ], 0.018, this.wankelRubber);
    if (eh) this.group.add(eh);
  }

  // ── PUBLIC API ─────────────────────────────────────────────────────────────

  setExplodedView(factor) {
    this.explodedFactor = factor;
    if (this.rotorGroup)    this.rotorGroup.position.z    = factor * 0.70;
    if (this._propHub)      this._propHub.position.z      = 2.32 + factor * 0.90;
    if (this.oilPumpMesh)   this.oilPumpMesh.position.y   = -1.45 - factor * 0.60;
    this.housingFaces.forEach((f, idx) => {
      f.position.z = (idx === 0 ? -0.40 : 0.40) + (idx === 0 ? -1 : 1) * factor * 0.55;
    });
    if (this.outerShell) {
      this.outerShell.material.opacity = Math.max(0.04, 0.12 - factor * 0.10);
    }
  }

  setXRay(enabled) {
    this.isXRay = enabled;
    if (this.housingMesh) {
      this.housingMesh.material = enabled ? this.wankelHousingMat : this.wankelHousingSolid;
    }
    if (this.outerShell) {
      this.outerShell.material.opacity = enabled ? 0.05 : 0.12;
    }
  }

  toggleLabels() {}

  update(packet, deltaSeconds) {
    if (!packet || !packet.engine) return;
    const rpm       = packet.engine.rpm || 6200;
    const isRunning = packet.status === 'RUNNING';

    // Eccentric shaft rotation
    const shaftRevSec = isRunning ? (rpm / 6200) * 4.8 : 0;
    this.shaftAngle = (this.shaftAngle + shaftRevSec * Math.PI * 2 * deltaSeconds) % (Math.PI * 2);

    if (this.eccentricShaft) this.eccentricShaft.rotation.z = this.shaftAngle;
    if (this.propeller)      this.propeller.rotation.z      = this.shaftAngle;

    // Planetary orbit: rotor center orbits eccentric at radius e = 0.28
    const e = 0.28;
    if (this.rotorGroup) {
      this.rotorGroup.position.x = Math.cos(this.shaftAngle) * e;
      this.rotorGroup.position.y = Math.sin(this.shaftAngle) * e;
    }

    // Rotor spins at 1/3 shaft speed (1:3 gear ratio)
    if (this.rotor) this.rotor.rotation.z = -this.shaftAngle / 3.0;

    // Combustion zone glow pulse
    const combPulse = Math.sin(this.shaftAngle * 1.5);
    if (this.combustionZoneGlow) {
      this.combustionZoneGlow.material.opacity = isRunning
        ? 0.22 + 0.16 * combPulse : 0.05;
    }

    // Spark lights synchronized to combustion phase
    const isFiring = isRunning && combPulse > 0.45;
    this.sparkLights.forEach(sl => {
      sl.intensity = isFiring ? 1.6 + 0.4 * Math.sin(Date.now() * 0.08) : 0;
    });

    // Exhaust particles
    if (isRunning && this.exhaustParticles) {
      const pos = this.exhaustParticles.geometry.attributes.position.array;
      const spd = (rpm / 6200) * 3.2 * deltaSeconds;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i]     += spd * 0.90;
        pos[i + 1] += spd * 0.45;
        if (pos[i] > 2.80) { pos[i] = 1.35; pos[i + 1] = -1.30; }
      }
      this.exhaustParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Apex seal wear visualization
    const sealHealth = packet.engine.seal_health_pct !== undefined ? packet.engine.seal_health_pct : 95;
    const hasSealFault = packet.faults && packet.faults.apex_seal_wear_severity > 0;
    this.apexSeals.forEach(seal => {
      if (hasSealFault || sealHealth < 75) {
        seal.material.color.setHex(0xdc2626);
        seal.material.emissive.setHex(0xdc2626);
        seal.material.emissiveIntensity = 0.82 + 0.28 * Math.sin(Date.now() * 0.012);
      } else if (sealHealth < 88) {
        seal.material.color.setHex(0xf59e0b);
        seal.material.emissive.setHex(0xf59e0b);
        seal.material.emissiveIntensity = 0.45;
      } else {
        seal.material.color.setHex(0x38bdf8);
        seal.material.emissive.setHex(0x0284c7);
        seal.material.emissiveIntensity = 0.20;
      }
    });

    // Housing thermal stress / overheating
    const housingTemp = packet.engine.rotor_housing_temp_c || 118;
    if (this.housingMesh && !this.isXRay) {
      this.housingMesh.material.color.setHex(
        housingTemp > 140 ? 0xdc2626 : housingTemp > 128 ? 0xea580c : 0x475569
      );
    }

    // Ultra-smooth vibration (rotary characteristic)
    const vibRms = packet.engine.vibration_rms_g || 0.18;
    if (isRunning) {
      const amp  = Math.min(0.025, vibRms * 0.015);
      const freq = Date.now() * 0.07;
      this.group.position.x = Math.sin(freq) * amp;
      this.group.position.y = Math.cos(freq * 1.5) * amp * 0.50;
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

if (typeof window !== 'undefined') window.WankelRotaryEngineModel = WankelRotaryEngineModel;

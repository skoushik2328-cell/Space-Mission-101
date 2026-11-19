import * as THREE from 'three';
import { resolveRocketParts, resolveSpacecraftParts } from '../engine/engineeringMath';
import { RocketDesignConfig, SpacecraftDesignConfig } from '../types/space';

export interface BuiltRocketRefs {
  root: THREE.Group;
  stage1Group: THREE.Group;
  boostersGroup: THREE.Group;
  stage2Group: THREE.Group;
  fairingLeft: THREE.Group;
  fairingRight: THREE.Group;
  spacecraftGroup: THREE.Group;
  stage1PlumePos: THREE.Vector3;
  stage2PlumePos: THREE.Vector3;
  boosterPlumePositions: THREE.Vector3[];
  totalHeight: number;
}

function createNozzleMesh(
  radius: number,
  height: number,
  mat: THREE.Material
): THREE.Mesh {
  const pts = [
    new THREE.Vector2(radius * 0.32, height),
    new THREE.Vector2(radius * 0.48, height * 0.72),
    new THREE.Vector2(radius * 0.88, height * 0.2),
    new THREE.Vector2(radius, 0),
    new THREE.Vector2(radius * 0.86, 0.04),
    new THREE.Vector2(radius * 0.38, height * 0.68),
  ];
  const geo = new THREE.LatheGeometry(pts, 24);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createFinMesh(width: number, height: number, mat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(width, 0);
  shape.lineTo(width * 0.2, height);
  shape.lineTo(0, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.04);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

export function buildSpacecraftGroup(config: SpacecraftDesignConfig): THREE.Group {
  const { chassis, solarPanel, antenna, instrument, propulsion } =
    resolveSpacecraftParts(config);

  const root = new THREE.Group();
  root.name = 'SpacecraftAssembly';

  // Calibrated NASA hardware materials
  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xd49b28,
    metalness: 0.88,
    roughness: 0.28,
  });
  const whiteCeramicMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.12,
    roughness: 0.62,
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x1e2430,
    metalness: 0.35,
    roughness: 0.72,
  });
  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.25,
  });
  const solarCellMat = new THREE.MeshPhysicalMaterial({
    color: 0x102854,
    metalness: 0.4,
    roughness: 0.18,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  });
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.45,
    roughness: 0.35,
    side: THREE.DoubleSide,
  });
  const accentBlueMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    metalness: 0.3,
    roughness: 0.45,
  });

  // Main chassis bus geometry (bottom-center pivot at y=0)
  if (chassis.chassisId === 'lunar_lander') {
    // Octagonal descent stage + 4 landing legs + ascent cabin
    const descentBus = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.12, 1.0, 8),
      goldFoilMat
    );
    descentBus.position.y = 1.0;
    descentBus.castShadow = true;
    root.add(descentBus);

    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + Math.PI / 4;
      const legGroup = new THREE.Group();
      legGroup.rotation.y = ang;

      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 1.35, 10),
        titaniumMat
      );
      strut.position.set(1.22, 0.62, 0);
      strut.rotation.z = -0.45;
      strut.castShadow = true;
      legGroup.add(strut);

      const footpad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.28, 0.08, 14),
        titaniumMat
      );
      footpad.position.set(1.52, 0.04, 0);
      legGroup.add(footpad);
      root.add(legGroup);
    }

    const ascentCabin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.84, 0.95, 8),
      whiteCeramicMat
    );
    ascentCabin.position.y = 1.98;
    ascentCabin.castShadow = true;
    root.add(ascentCabin);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.3, 0.14),
      carbonMat
    );
    visor.position.set(0, 2.08, 0.78);
    root.add(visor);
  } else if (chassis.chassisId === 'mars_rover') {
    // 6-wheel rocker-bogie Mars rover
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.48, 1.95),
      whiteCeramicMat
    );
    deck.position.y = 0.72;
    deck.castShadow = true;
    root.add(deck);

    const foilBelly = new THREE.Mesh(
      new THREE.BoxGeometry(1.36, 0.22, 1.82),
      goldFoilMat
    );
    foilBelly.position.y = 0.48;
    root.add(foilBelly);

    // 6 wheels
    for (const side of [-1, 1]) {
      for (const zOff of [-0.72, 0, 0.72]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16),
          carbonMat
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.92, 0.24, zOff);
        wheel.castShadow = true;
        root.add(wheel);

        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, 0.2, 12),
          titaniumMat
        );
        hub.rotation.z = Math.PI / 2;
        hub.position.set(side * 0.92, 0.24, zOff);
        root.add(hub);
      }
    }

    // Mast & camera head
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.07, 0.9, 10),
      titaniumMat
    );
    mast.position.set(0.32, 1.38, 0.56);
    root.add(mast);

    const camHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.2, 0.22),
      whiteCeramicMat
    );
    camHead.position.set(0.32, 1.85, 0.58);
    root.add(camHead);

    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12),
      accentBlueMat
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0.32, 1.85, 0.7);
    root.add(lens);
  } else if (chassis.chassisId === 'research_probe') {
    // Pressurized Cargo Resupply Capsule + Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 1.1, 24),
      whiteCeramicMat
    );
    trunk.position.y = 0.72;
    trunk.castShadow = true;
    root.add(trunk);

    const capsulePts = [
      new THREE.Vector2(0.95, 0),
      new THREE.Vector2(0.96, 0.25),
      new THREE.Vector2(0.72, 0.95),
      new THREE.Vector2(0.45, 1.15),
    ];
    const capsule = new THREE.Mesh(
      new THREE.LatheGeometry(capsulePts, 24),
      whiteCeramicMat
    );
    capsule.position.y = 1.27;
    capsule.castShadow = true;
    root.add(capsule);

    const heatShield = new THREE.Mesh(
      new THREE.CylinderGeometry(1.06, 0.98, 0.14, 24),
      carbonMat
    );
    heatShield.position.y = 0.16;
    root.add(heatShield);
  } else {
    // Satellites & Deep-Space Probe
    const isDeep = chassis.chassisId === 'deep_space_probe';
    const bus = new THREE.Mesh(
      isDeep
        ? new THREE.CylinderGeometry(0.72, 0.78, 1.25, 10)
        : new THREE.BoxGeometry(1.15, 1.35, 1.15),
      goldFoilMat
    );
    bus.position.y = 0.95;
    bus.castShadow = true;
    root.add(bus);

    const topPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.62, 0.18, 16),
      whiteCeramicMat
    );
    topPlate.position.y = 1.68;
    root.add(topPlate);

    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.055, 10, 24),
      titaniumMat
    );
    coreRing.rotation.x = Math.PI / 2;
    coreRing.position.y = 0.3;
    root.add(coreRing);
  }

  // Propulsion nozzle / ion ring at bottom
  if (propulsion.kind === 'ion') {
    const ionRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.08, 12, 24),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 1.2,
        metalness: 0.7,
        roughness: 0.2,
      })
    );
    ionRing.rotation.x = Math.PI / 2;
    ionRing.position.y = 0.12;
    root.add(ionRing);
  } else {
    const nozzle = createNozzleMesh(
      propulsion.kind === 'hypergolic' ? 0.34 : 0.16,
      propulsion.kind === 'hypergolic' ? 0.48 : 0.24,
      titaniumMat
    );
    nozzle.position.y = 0.02;
    root.add(nozzle);
  }

  // Solar Panels (left & right wings)
  const wingLen = solarPanel.spanM * 0.42;
  const wingW = solarPanel.isDeployable ? 0.78 : 0.5;
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(wingLen, 0.04, wingW),
      solarCellMat
    );
    wing.position.set(side * (0.78 + wingLen * 0.5), 1.05, 0);
    wing.castShadow = true;
    root.add(wing);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(wingLen + 0.06, 0.025, 0.08),
      titaniumMat
    );
    frame.position.set(side * (0.78 + wingLen * 0.5), 1.03, 0);
    root.add(frame);
  }

  // Antenna dish / whip
  if (antenna.dishScale <= 0.45) {
    const whip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.035, 1.1, 8),
      titaniumMat
    );
    whip.position.set(-0.25, 2.25, 0);
    root.add(whip);
  } else {
    const dishPts = [
      new THREE.Vector2(0.01, 0),
      new THREE.Vector2(0.32 * antenna.dishScale, 0.06),
      new THREE.Vector2(0.62 * antenna.dishScale, 0.24),
    ];
    const dish = new THREE.Mesh(new THREE.LatheGeometry(dishPts, 24), dishMat);
    dish.position.set(0, 1.88, 0);
    dish.rotation.x = 0.28;
    dish.castShadow = true;
    root.add(dish);

    const feedHorn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.05, 0.42 * antenna.dishScale, 10),
      carbonMat
    );
    feedHorn.position.set(0, 2.08, 0.08);
    feedHorn.rotation.x = 0.28;
    root.add(feedHorn);
  }

  // Scientific instrument accent
  if (instrument.instrumentCategory === 'imager') {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.24, 0.55, 16),
      carbonMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.92, 0.72);
    root.add(barrel);
  } else if (instrument.instrumentCategory === 'deep_fields') {
    const boom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 1.8, 8),
      titaniumMat
    );
    boom.rotation.z = Math.PI / 2.2;
    boom.position.set(-0.9, 1.45, -0.4);
    root.add(boom);
  } else if (instrument.instrumentCategory === 'docking_cargo') {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.06, 10, 20),
      titaniumMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 2.45;
    root.add(ring);
  }

  return root;
}

export function buildRocketGroup(
  rocketConfig: RocketDesignConfig,
  spacecraftConfig: SpacecraftDesignConfig,
  explodedFactor = 0
): BuiltRocketRefs {
  const { s1Body, s1Engine, s1Tank, fuelSpec, s2Body, s2Engine, s2Tank, boosters, fairing, avionics } =
    resolveRocketParts(rocketConfig);

  const root = new THREE.Group();
  root.name = 'LaunchVehicleAssembly';

  // Realistic NASA PBR Materials
  const hullWhiteMat = new THREE.MeshStandardMaterial({
    color: s1Body.colorHex,
    metalness: 0.14,
    roughness: 0.52,
  });
  const hullAccentMat = new THREE.MeshStandardMaterial({
    color: s1Body.accentHex,
    metalness: 0.32,
    roughness: 0.58,
  });
  const stage2HullMat = new THREE.MeshStandardMaterial({
    color: s2Body.colorHex,
    metalness: 0.18,
    roughness: 0.48,
  });
  const stage2StripeMat = new THREE.MeshStandardMaterial({
    color: s2Body.accentHex,
    metalness: 0.25,
    roughness: 0.45,
  });
  const cryoTankTintMat = new THREE.MeshStandardMaterial({
    color:
      fuelSpec.id === 'hydrolox'
        ? '#c97838' // NASA SLS orange cryo foam
        : fuelSpec.id === 'methalox'
          ? '#cbd5e1'
          : '#f8fafc',
    metalness: fuelSpec.id === 'methalox' ? 0.65 : 0.12,
    roughness: fuelSpec.id === 'hydrolox' ? 0.82 : 0.38,
  });
  const nozzleMat = new THREE.MeshStandardMaterial({
    color: 0x3b4252,
    metalness: 0.88,
    roughness: 0.26,
    side: THREE.DoubleSide,
  });
  const carbonInterstageMat = new THREE.MeshStandardMaterial({
    color: 0x161b24,
    metalness: 0.22,
    roughness: 0.74,
  });
  const fairingMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.1,
    roughness: 0.44,
    side: THREE.DoubleSide,
  });
  const srbMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.18,
    roughness: 0.55,
  });

  // Scale real meters down slightly for clean viewport proportions (1 unit = 1m)
  const r1 = s1Body.diameterM * 0.28;
  const h1 = s1Body.heightM * 0.48 * (0.85 + s1Tank.heightScale * 0.16);
  const r2 = Math.min(r1 * 0.92, s2Body.diameterM * 0.28);
  const h2 = s2Body.heightM * 0.45 * (0.88 + s2Tank.heightScale * 0.12);
  const engineHeight = 1.05 * s1Engine.nozzleScale;

  // STAGE 1 GROUP (grounded at y=0 at nozzle rim)
  const stage1Group = new THREE.Group();
  stage1Group.name = 'Stage1';

  // Engine cluster (3 or 5 bells depending on thrust)
  const bellCount = s1Engine.thrustKN > 4500 ? 5 : 3;
  const nozzlePlumeY = 0;
  for (let i = 0; i < bellCount; i++) {
    const bell = createNozzleMesh(r1 * 0.32 * s1Engine.nozzleScale, engineHeight, nozzleMat);
    if (i === 0 && bellCount === 5) {
      bell.position.set(0, 0, 0);
    } else {
      const idx = bellCount === 5 ? i - 1 : i;
      const denom = bellCount === 5 ? 4 : 3;
      const ang = (idx / denom) * Math.PI * 2;
      bell.position.set(Math.cos(ang) * r1 * 0.48, 0, Math.sin(ang) * r1 * 0.48);
    }
    stage1Group.add(bell);
  }

  // Thrust skirt
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(r1, r1 * 1.06, 0.9, 28),
    carbonInterstageMat
  );
  skirt.position.y = engineHeight + 0.4;
  skirt.castShadow = true;
  stage1Group.add(skirt);

  // Main tank barrel
  const tank1 = new THREE.Mesh(
    new THREE.CylinderGeometry(r1, r1, h1, 28),
    cryoTankTintMat
  );
  tank1.position.y = engineHeight + 0.85 + h1 * 0.5;
  tank1.castShadow = true;
  tank1.receiveShadow = true;
  stage1Group.add(tank1);

  // Aerospace livery band & raceway
  const band1 = new THREE.Mesh(
    new THREE.CylinderGeometry(r1 * 1.01, r1 * 1.01, 0.75, 28),
    hullAccentMat
  );
  band1.position.y = engineHeight + 1.5;
  stage1Group.add(band1);

  const upperBand = new THREE.Mesh(
    new THREE.CylinderGeometry(r1 * 1.01, r1 * 1.01, 0.55, 28),
    hullWhiteMat
  );
  upperBand.position.y = engineHeight + 0.85 + h1 - 0.5;
  stage1Group.add(upperBand);

  // Stabilizer fins
  for (let i = 0; i < 4; i++) {
    const fin = createFinMesh(r1 * 0.72, 1.35, hullAccentMat);
    const ang = (i * Math.PI) / 2;
    fin.position.set(Math.cos(ang) * (r1 * 0.94), engineHeight + 0.25, Math.sin(ang) * (r1 * 0.94));
    fin.rotation.y = -ang;
    stage1Group.add(fin);
  }

  // Interstage adapter
  const interstageH = 1.15;
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(r2, r1, interstageH, 28),
    carbonInterstageMat
  );
  const s1TopY = engineHeight + 0.85 + h1;
  interstage.position.y = s1TopY + interstageH * 0.5;
  interstage.castShadow = true;
  stage1Group.add(interstage);

  root.add(stage1Group);

  // BOOSTERS GROUP
  const boostersGroup = new THREE.Group();
  boostersGroup.name = 'Boosters';
  const boosterPlumePositions: THREE.Vector3[] = [];

  if (boosters.count > 0) {
    const bRad = boosters.kind === 'liquid' ? r1 * 0.56 : r1 * 0.36;
    const bHeight = h1 * 0.78;
    const bOffset = r1 + bRad * 1.16 + explodedFactor * 0.65;

    for (let i = 0; i < boosters.count; i++) {
      const ang =
        boosters.count === 2
          ? i * Math.PI
          : (i * Math.PI) / 2 + Math.PI / 4;
      const bx = Math.cos(ang) * bOffset;
      const bz = Math.sin(ang) * bOffset;

      const bUnit = new THREE.Group();
      bUnit.position.set(bx, 0.1, bz);

      const bNozzle = createNozzleMesh(bRad * 0.75, 0.7, nozzleMat);
      bUnit.add(bNozzle);

      const bBody = new THREE.Mesh(
        new THREE.CylinderGeometry(bRad, bRad, bHeight, 20),
        boosters.kind === 'liquid' ? hullWhiteMat : srbMat
      );
      bBody.position.y = 0.7 + bHeight * 0.5;
      bBody.castShadow = true;
      bUnit.add(bBody);

      const bStripe = new THREE.Mesh(
        new THREE.CylinderGeometry(bRad * 1.02, bRad * 1.02, 0.4, 20),
        hullAccentMat
      );
      bStripe.position.y = 0.7 + bHeight * 0.82;
      bUnit.add(bStripe);

      const bCone = new THREE.Mesh(
        new THREE.ConeGeometry(bRad, bRad * 2.5, 20),
        boosters.kind === 'liquid' ? hullWhiteMat : srbMat
      );
      bCone.position.y = 0.7 + bHeight + bRad * 1.25;
      bCone.castShadow = true;
      bUnit.add(bCone);

      // Attachment struts
      const strut = new THREE.Mesh(
        new THREE.BoxGeometry(bOffset * 0.45, 0.14, 0.14),
        carbonInterstageMat
      );
      strut.position.set(-Math.cos(ang) * (bOffset * 0.25), bHeight * 0.65, -Math.sin(ang) * (bOffset * 0.25));
      strut.rotation.y = -ang;
      bUnit.add(strut);

      boostersGroup.add(bUnit);
      boosterPlumePositions.push(new THREE.Vector3(bx, 0.05, bz));
    }
  }
  root.add(boostersGroup);

  // STAGE 2 GROUP
  const stage2Start = s1TopY + interstageH + explodedFactor * 1.4;
  const stage2Group = new THREE.Group();
  stage2Group.name = 'Stage2';
  stage2Group.position.y = stage2Start;

  const s2Nozzle = createNozzleMesh(r2 * 0.56 * s2Engine.nozzleScale, 0.85, nozzleMat);
  s2Nozzle.position.y = -0.35;
  stage2Group.add(s2Nozzle);

  const s2BodyMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r2, r2, h2, 28),
    stage2HullMat
  );
  s2BodyMesh.position.y = 0.45 + h2 * 0.5;
  s2BodyMesh.castShadow = true;
  stage2Group.add(s2BodyMesh);

  const s2Band = new THREE.Mesh(
    new THREE.CylinderGeometry(r2 * 1.015, r2 * 1.015, 0.42, 28),
    stage2StripeMat
  );
  s2Band.position.y = 0.45 + h2 * 0.72;
  stage2Group.add(s2Band);

  // Avionics guidance ring
  const avRing = new THREE.Mesh(
    new THREE.CylinderGeometry(r2 * 1.02, r2 * 1.02, 0.38, 28),
    avionics.tier === 3
      ? new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.5, roughness: 0.35 })
      : carbonInterstageMat
  );
  avRing.position.y = 0.45 + h2 + 0.19;
  stage2Group.add(avRing);

  root.add(stage2Group);

  // SPACECRAFT INSIDE FAIRING
  const craftBaseY = stage2Start + 0.45 + h2 + 0.4 + explodedFactor * 1.6;
  const spacecraftGroup = buildSpacecraftGroup(spacecraftConfig);
  spacecraftGroup.scale.setScalar(0.56);
  spacecraftGroup.position.y = craftBaseY;
  root.add(spacecraftGroup);

  // PAYLOAD FAIRING (2 clamshell halves so we can animate separation & exploded cutaway!)
  const fRad = Math.max(r2 * 1.05, fairing.diameterM * 0.25);
  const fairingStart = stage2Start + 0.45 + h2 + 0.35 + explodedFactor * 2.2;
  const fairingH = 3.1;

  const makeFairingHalf = (phiStart: number, offsetDir: number) => {
    const grp = new THREE.Group();
    grp.position.set(offsetDir * explodedFactor * 1.15, fairingStart, 0);

    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(fRad, r2, fairingH * 0.52, 20, 1, false, phiStart, Math.PI),
      fairingMat
    );
    cyl.position.y = fairingH * 0.26;
    cyl.castShadow = true;
    grp.add(cyl);

    const nosePts = [
      new THREE.Vector2(fRad, 0),
      new THREE.Vector2(fRad * 0.85, fairingH * 0.22),
      new THREE.Vector2(fRad * 0.46, fairingH * 0.44),
      new THREE.Vector2(0.03, fairingH * 0.58),
    ];
    const nose = new THREE.Mesh(
      new THREE.LatheGeometry(nosePts, 20, phiStart, Math.PI),
      fairingMat
    );
    nose.position.y = fairingH * 0.52;
    nose.castShadow = true;
    grp.add(nose);
    return grp;
  };

  const fairingLeft = makeFairingHalf(-Math.PI / 2, -1);
  const fairingRight = makeFairingHalf(Math.PI / 2, 1);
  root.add(fairingLeft);
  root.add(fairingRight);

  const totalHeight = fairingStart + fairingH * 1.1;

  return {
    root,
    stage1Group,
    boostersGroup,
    stage2Group,
    fairingLeft,
    fairingRight,
    spacecraftGroup,
    stage1PlumePos: new THREE.Vector3(0, nozzlePlumeY, 0),
    stage2PlumePos: new THREE.Vector3(0, stage2Start - 0.35, 0),
    boosterPlumePositions,
    totalHeight,
  };
}

export function buildSpaceStationGroup(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'OrbitalSpaceStation';

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.45,
    roughness: 0.35,
  });
  const trussMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.78,
    roughness: 0.38,
  });
  const solarMat = new THREE.MeshPhysicalMaterial({
    color: 0x162d59,
    metalness: 0.4,
    roughness: 0.2,
    clearcoat: 0.8,
  });
  const dockRingMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 1.4,
    metalness: 0.6,
    roughness: 0.25,
  });

  // Central habitable spine
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 9.5, 24), hullMat);
  spine.rotation.x = Math.PI / 2;
  group.add(spine);

  // Cross pressurized modules
  const labMod = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 6.2, 20), hullMat);
  labMod.rotation.z = Math.PI / 2;
  labMod.position.z = 1.2;
  group.add(labMod);

  // Integrated Truss
  const truss = new THREE.Mesh(new THREE.BoxGeometry(16, 0.55, 0.55), trussMat);
  truss.position.y = 0.8;
  group.add(truss);

  // 4 huge solar wings
  for (const sx of [-6.4, -3.6, 3.6, 6.4]) {
    for (const sz of [-2.8, 2.8]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 4.6), solarMat);
      wing.position.set(sx, 0.8, sz);
      group.add(wing);
    }
  }

  // Forward glowing docking target ring
  const dockCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, 0.85, 20), trussMat);
  dockCollar.rotation.x = Math.PI / 2;
  dockCollar.position.z = 5.1;
  group.add(dockCollar);

  const targetRing = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 12, 24), dockRingMat);
  targetRing.position.z = 5.55;
  group.add(targetRing);

  return group;
}

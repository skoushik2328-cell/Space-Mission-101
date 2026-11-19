import * as THREE from 'three';
import { HqStationId } from '../types/space';
import {
  createContactShadowTexture,
  createEarthTexture,
  createHqFloorGridTexture,
  createJupiterTexture,
  createLaunchpadTexture,
  createMarsTexture,
  createMissionControlScreenTexture,
  createMoonTexture,
} from './proceduralTextures';

export interface HqInteractiveStation {
  id: HqStationId;
  label: string;
  subtitle: string;
  mesh: THREE.Object3D;
  standPos: THREE.Vector3;
  lookTarget: THREE.Vector3;
}

export interface HqEnvironmentRefs {
  root: THREE.Group;
  stations: HqInteractiveStation[];
  rocketDisplayMount: THREE.Group;
  spacecraftDisplayMount: THREE.Group;
  orreryGroup: THREE.Group;
  orreryPlanets: {
    earth: THREE.Mesh;
    moon: THREE.Mesh;
    mars: THREE.Mesh;
    jupiter: THREE.Mesh;
    station: THREE.Mesh;
  };
  launchpadRocketMount: THREE.Group;
  umbilicalArm: THREE.Mesh;
}

export function buildHqEnvironment(maxAnisotropy: number): HqEnvironmentRefs {
  const root = new THREE.Group();
  root.name = 'SpaceAgencyHQ';

  const floorTex = createHqFloorGridTexture(maxAnisotropy);
  const padTex = createLaunchpadTexture(maxAnisotropy);
  const contactTex = createContactShadowTexture();

  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.62,
    metalness: 0.25,
  });
  const darkWallMat = new THREE.MeshStandardMaterial({
    color: 0x111824,
    roughness: 0.72,
    metalness: 0.2,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x293241,
    roughness: 0.85,
    metalness: 0.1,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.35,
    metalness: 0.82,
  });
  const deskMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.35,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.22,
    roughness: 0.08,
    metalness: 0.1,
    depthWrite: false,
  });
  const cleanroomFloorMat = new THREE.MeshStandardMaterial({
    color: 0xdbe4ee,
    roughness: 0.28,
    metalness: 0.12,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 1.35,
    roughness: 0.2,
    metalness: 0.4,
  });

  // Main HQ Floor Slab (48m x 36m)
  const mainFloor = new THREE.Mesh(new THREE.BoxGeometry(52, 0.4, 38), floorMat);
  mainFloor.position.set(0, -0.2, 0);
  mainFloor.receiveShadow = true;
  root.add(mainFloor);

  // Exterior Launch Complex Terrain (no boxed void)
  const outerGround = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 360),
    new THREE.MeshStandardMaterial({
      color: 0x1f2822,
      roughness: 0.94,
      metalness: 0.05,
    })
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.set(0, -0.42, -90);
  outerGround.receiveShadow = true;
  root.add(outerGround);

  // Side walls & structural columns
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12, 38), darkWallMat);
  leftWall.position.set(-26, 6, 0);
  root.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12, 38), darkWallMat);
  rightWall.position.set(26, 6, 0);
  root.add(rightWall);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(52, 12, 0.6), darkWallMat);
  backWall.position.set(0, 6, 19);
  root.add(backWall);

  // Panoramic front glass wall looking toward Launchpad (-Z)
  const lowerFrontWall = new THREE.Mesh(new THREE.BoxGeometry(52, 1.4, 0.5), darkWallMat);
  lowerFrontWall.position.set(0, 0.7, -19);
  root.add(lowerFrontWall);

  const glassWall = new THREE.Mesh(new THREE.BoxGeometry(51, 9.6, 0.14), glassMat);
  glassWall.position.set(0, 6.2, -19);
  glassWall.renderOrder = 4;
  root.add(glassWall);

  // Structural window mullions & roof trusses
  for (let x = -22; x <= 22; x += 11) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.45, 11.5, 0.55), steelMat);
    mullion.position.set(x, 5.75, -18.9);
    root.add(mullion);

    const roofBeam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 38), steelMat);
    roofBeam.position.set(x, 11.6, 0);
    root.add(roofBeam);
  }

  // ---------------------------------------------------------------------------
  // ZONE 1: MISSION CONTROL ROOM (Center-Back: x = -6..6, z = 4..16)
  // ---------------------------------------------------------------------------
  const mcScreenTex1 = createMissionControlScreenTexture('earth_track', maxAnisotropy);
  const mcScreenTex2 = createMissionControlScreenTexture('telemetry_matrix', maxAnisotropy);
  const mcScreenTex3 = createMissionControlScreenTexture('solar_plan', maxAnisotropy);

  const screenSpecs: Array<{
    tex: THREE.Texture;
    x: number;
    w: number;
    rotY: number;
    z: number;
  }> = [
    { tex: mcScreenTex2, x: -7.5, w: 6.2, rotY: 0.22, z: 17.5 },
    { tex: mcScreenTex1, x: 0, w: 8.2, rotY: 0, z: 18.2 },
    { tex: mcScreenTex3, x: 7.5, w: 6.2, rotY: -0.22, z: 17.5 },
  ];

  screenSpecs.forEach((s) => {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(s.w + 0.35, 4.3, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x0b1018, roughness: 0.5, metalness: 0.5 })
    );
    frame.position.set(s.x, 4.6, s.z);
    frame.rotation.y = s.rotY;
    root.add(frame);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(s.w, 3.9),
      new THREE.MeshBasicMaterial({ map: s.tex })
    );
    screen.position.set(s.x, 4.6, s.z - 0.14);
    screen.rotation.y = Math.PI + s.rotY;
    root.add(screen);
  });

  // Tiered Flight Director Consoles
  for (let row = 0; row < 2; row++) {
    const zPos = 10.5 - row * 3.4;
    const riser = new THREE.Mesh(new THREE.BoxGeometry(15, 0.22 * (row + 1), 2.8), concreteMat);
    riser.position.set(0, 0.11 * (row + 1), zPos);
    riser.receiveShadow = true;
    root.add(riser);

    for (let col = -1; col <= 1; col++) {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.95, 0.95), deskMat);
      desk.position.set(col * 4.5, 0.22 * (row + 1) + 0.48, zPos + 0.2);
      desk.castShadow = true;
      root.add(desk);

      // Dual slanted monitors on each console
      for (const mx of [-0.9, 0.9]) {
        const mon = new THREE.Mesh(
          new THREE.BoxGeometry(1.15, 0.65, 0.08),
          new THREE.MeshStandardMaterial({
            color: 0x0b1a2e,
            emissive: 0x0e4f8a,
            emissiveIntensity: 0.7,
            roughness: 0.2,
          })
        );
        mon.position.set(col * 4.5 + mx, 0.22 * (row + 1) + 1.24, zPos + 0.38);
        mon.rotation.x = -0.2;
        root.add(mon);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // ZONE 2: VEHICLE ASSEMBLY BAY (Left Wing: x = -18, z = -4)
  // ---------------------------------------------------------------------------
  const vabPlatform = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.6, 0.35, 32), concreteMat);
  vabPlatform.position.set(-17, 0.175, -3);
  vabPlatform.receiveShadow = true;
  root.add(vabPlatform);

  const gantryMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.42,
    metalness: 0.65,
  });
  const gantryPillar1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 11, 0.6), gantryMat);
  gantryPillar1.position.set(-22, 5.5, -6.5);
  root.add(gantryPillar1);
  const gantryPillar2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 11, 0.6), gantryMat);
  gantryPillar2.position.set(-22, 5.5, 0.5);
  root.add(gantryPillar2);
  const craneBridge = new THREE.Mesh(new THREE.BoxGeometry(9, 0.65, 0.9), gantryMat);
  craneBridge.position.set(-18, 10.6, -3);
  root.add(craneBridge);

  const rocketDisplayMount = new THREE.Group();
  rocketDisplayMount.position.set(-17, 0.35, -3);
  root.add(rocketDisplayMount);

  const rocketShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 5.5),
    new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, opacity: 0.45 })
  );
  rocketShadow.rotation.x = -Math.PI / 2;
  rocketShadow.position.set(-17, 0.37, -3);
  root.add(rocketShadow);

  // ---------------------------------------------------------------------------
  // ZONE 3: SPACECRAFT DESIGN CLEANROOM LAB (Right Wing: x = 17, z = -3)
  // ---------------------------------------------------------------------------
  const cleanFloor = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.08, 12.5), cleanroomFloorMat);
  cleanFloor.position.set(17, 0.04, -3);
  cleanFloor.receiveShadow = true;
  root.add(cleanFloor);

  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 0.45, 32), steelMat);
  turntable.position.set(17, 0.26, -3);
  turntable.receiveShadow = true;
  root.add(turntable);

  const craftShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 4.2),
    new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, opacity: 0.42 })
  );
  craftShadow.rotation.x = -Math.PI / 2;
  craftShadow.position.set(17, 0.5, -3);
  root.add(craftShadow);

  const spacecraftDisplayMount = new THREE.Group();
  spacecraftDisplayMount.position.set(17, 0.52, -3);
  root.add(spacecraftDisplayMount);

  // ---------------------------------------------------------------------------
  // ZONE 4: 3D SOLAR SYSTEM ORRERY BAY (Center-Front: x = 0, z = -7)
  // ---------------------------------------------------------------------------
  const orreryPedestal = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.65, 32), deskMat);
  orreryPedestal.position.set(0, 0.325, -7);
  orreryPedestal.receiveShadow = true;
  root.add(orreryPedestal);

  const orreryGroup = new THREE.Group();
  orreryGroup.position.set(0, 2.3, -7);
  root.add(orreryGroup);

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 24, 24),
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8,
      roughness: 0.3,
    })
  );
  orreryGroup.add(sunMesh);

  // Orbit rings
  [1.15, 1.85, 2.75].forEach((r) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.015, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 })
    );
    ring.rotation.x = Math.PI / 2;
    orreryGroup.add(ring);
  });

  const earthTex = createEarthTexture(maxAnisotropy);
  const moonTex = createMoonTexture(maxAnisotropy);
  const marsTex = createMarsTexture(maxAnisotropy);
  const jupTex = createJupiterTexture(maxAnisotropy);

  const orreryEarth = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 24, 24),
    new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.55 })
  );
  orreryEarth.position.set(1.15, 0, 0);
  orreryGroup.add(orreryEarth);

  const orreryMoon = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 16),
    new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.85 })
  );
  orreryMoon.position.set(1.48, 0.04, 0);
  orreryGroup.add(orreryMoon);

  const orreryStation = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.04, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x06b6d4, emissiveIntensity: 0.8 })
  );
  orreryStation.position.set(1.15, 0.28, 0.15);
  orreryGroup.add(orreryStation);

  const orreryMars = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 24, 24),
    new THREE.MeshStandardMaterial({ map: marsTex, roughness: 0.78 })
  );
  orreryMars.position.set(-1.3, 0, 1.32);
  orreryGroup.add(orreryMars);

  const orreryJupiter = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 24, 24),
    new THREE.MeshStandardMaterial({ map: jupTex, roughness: 0.6 })
  );
  orreryJupiter.position.set(0.5, 0, -2.7);
  orreryGroup.add(orreryJupiter);

  // ---------------------------------------------------------------------------
  // ZONE 5: LAUNCH COMPLEX 39 (Outside panoramic windows at z = -68)
  // ---------------------------------------------------------------------------
  const padApron = new THREE.Mesh(
    new THREE.BoxGeometry(36, 1.2, 36),
    new THREE.MeshStandardMaterial({ map: padTex, roughness: 0.82 })
  );
  padApron.position.set(0, -0.1, -68);
  padApron.receiveShadow = true;
  root.add(padApron);

  // Strongback / Launch Service Tower
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.75,
    roughness: 0.4,
  });
  const towerFrame = new THREE.Mesh(new THREE.BoxGeometry(3.8, 28, 3.8), towerMat);
  towerFrame.position.set(-6.4, 14, -68);
  towerFrame.castShadow = true;
  root.add(towerFrame);

  const lightningMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 6, 8), steelMat);
  lightningMast.position.set(-6.4, 30.8, -68);
  root.add(lightningMast);

  const umbilicalArm = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.55, 0.7), gantryMat);
  umbilicalArm.position.set(-2.6, 13.5, -68);
  root.add(umbilicalArm);

  // Launchpad Rocket Mount
  const launchpadRocketMount = new THREE.Group();
  launchpadRocketMount.position.set(0, 0.5, -68);
  root.add(launchpadRocketMount);

  // ---------------------------------------------------------------------------
  // INTERACTIVE STATION TERMINALS & GLOWING FLOOR MARKERS
  // ---------------------------------------------------------------------------
  const stationDefs: Array<{
    id: HqStationId;
    label: string;
    subtitle: string;
    beaconPos: THREE.Vector3;
    standPos: THREE.Vector3;
    lookTarget: THREE.Vector3;
  }> = [
    {
      id: 'mission_control',
      label: 'Mission Control Consoles',
      subtitle: 'Select & Brief 5 Campaign Missions',
      beaconPos: new THREE.Vector3(0, 0.05, 4.5),
      standPos: new THREE.Vector3(0, 1.7, 2.2),
      lookTarget: new THREE.Vector3(0, 3.8, 16),
    },
    {
      id: 'rocket_bay',
      label: 'Rocket Assembly Bay',
      subtitle: 'Configure Stages, Engines, Fuel & Boosters',
      beaconPos: new THREE.Vector3(-10.5, 0.05, -3),
      standPos: new THREE.Vector3(-8.5, 1.7, -3),
      lookTarget: new THREE.Vector3(-17, 6.5, -3),
    },
    {
      id: 'spacecraft_lab',
      label: 'Spacecraft Design Lab',
      subtitle: 'Build Satellites, Landers, Rovers & Probes',
      beaconPos: new THREE.Vector3(10.5, 0.05, -3),
      standPos: new THREE.Vector3(8.5, 1.7, -3),
      lookTarget: new THREE.Vector3(17, 1.8, -3),
    },
    {
      id: 'orrery',
      label: '3D Solar System Orrery',
      subtitle: 'Inspect Planets & Transfer Trajectories',
      beaconPos: new THREE.Vector3(0, 0.05, -3.2),
      standPos: new THREE.Vector3(0, 1.7, -1.6),
      lookTarget: new THREE.Vector3(0, 2.2, -7),
    },
    {
      id: 'launchpad_deck',
      label: 'Launchpad Control Deck',
      subtitle: 'Prepare Countdown & Launch Vehicle',
      beaconPos: new THREE.Vector3(0, 0.05, -14.8),
      standPos: new THREE.Vector3(0, 1.7, -13.2),
      lookTarget: new THREE.Vector3(0, 8, -68),
    },
  ];

  const stations: HqInteractiveStation[] = [];
  stationDefs.forEach((def) => {
    const markerGroup = new THREE.Group();
    markerGroup.position.copy(def.beaconPos);

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.85, 28), beaconMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    markerGroup.add(ring);

    const kiosk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 1.15, 12), deskMat);
    kiosk.position.y = 0.58;
    kiosk.castShadow = true;
    markerGroup.add(kiosk);

    const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.44), beaconMat);
    topCap.position.y = 1.18;
    topCap.rotation.x = 0.25;
    markerGroup.add(topCap);

    // Layer 1 for fast raycasting
    markerGroup.traverse((obj) => {
      obj.layers.enable(1);
      obj.userData.stationId = def.id;
    });

    root.add(markerGroup);
    stations.push({
      id: def.id,
      label: def.label,
      subtitle: def.subtitle,
      mesh: markerGroup,
      standPos: def.standPos,
      lookTarget: def.lookTarget,
    });
  });

  return {
    root,
    stations,
    rocketDisplayMount,
    spacecraftDisplayMount,
    orreryGroup,
    orreryPlanets: {
      earth: orreryEarth,
      moon: orreryMoon,
      mars: orreryMars,
      jupiter: orreryJupiter,
      station: orreryStation,
    },
    launchpadRocketMount,
    umbilicalArm,
  };
}

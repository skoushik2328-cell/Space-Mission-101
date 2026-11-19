import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FUEL_TYPE_SPECS } from '../data/catalog';
import { REAL_WORLD_FAILURE_CASES } from '../data/realWorldData';
import { audioEngine } from '../engine/audioEngine';
import {
  calculateRocketMetrics,
  calculateSpacecraftMetrics,
  computeMissionScore,
  evaluateEngineeringReadiness,
} from '../engine/engineeringMath';
import {
  CameraAngleId,
  DifficultyLevel,
  FailureReport,
  FlightObjectiveState,
  FlightTelemetryState,
  GameMode,
  HqStationId,
  MissionDefinition,
  MissionScoreBreakdown,
  RocketDesignConfig,
  SpacecraftDesignConfig,
} from '../types/space';
import { buildHqEnvironment, HqEnvironmentRefs, HqInteractiveStation } from './hqBuilder';
import {
  createEarthTexture,
  createJupiterTexture,
  createMarsTexture,
  createMoonTexture,
} from './proceduralTextures';
import {
  buildRocketGroup,
  buildSpacecraftGroup,
  buildSpaceStationGroup,
  BuiltRocketRefs,
} from './vehicleBuilders';

const _vec3 = new THREE.Vector3();
const _vec3b = new THREE.Vector3();
const _vec3c = new THREE.Vector3();
const _skyDay = new THREE.Color('#6ca6d9');
const _skyHighAtmo = new THREE.Color('#13294b');
const _skySpace = new THREE.Color('#04060b');
const _tmpColor = new THREE.Color();

interface ParticleItem {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
  scale: number;
  isFlame: boolean;
}

export interface EngineCallbacks {
  onNearbyStationChange: (station: HqInteractiveStation | null) => void;
  onStationActivate: (stationId: HqStationId) => void;
  onFlightTelemetryUpdate: (telemetry: FlightTelemetryState) => void;
  onMissionComplete: (
    success: boolean,
    score: MissionScoreBreakdown,
    telemetry: FlightTelemetryState,
    failureReport?: FailureReport
  ) => void;
  onOrrerySelectMission?: (missionId: string) => void;
}

export class SpaceSimEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private orbitControls!: OrbitControls;
  private isSoftwareGl = false;
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();

  private mode: GameMode = 'HQ_WALK';
  private hq!: HqEnvironmentRefs;
  private maxAnisotropy = 1;

  // Dynamic assemblies
  private vabRocketRefs: BuiltRocketRefs | null = null;
  private padRocketRefs: BuiltRocketRefs | null = null;
  private labCraftGroup: THREE.Group | null = null;
  private flightRocketRefs: BuiltRocketRefs | null = null;

  // Space environment for flight & orrery
  private spaceGroup = new THREE.Group();
  private starPoints!: THREE.Points;
  private earthMesh!: THREE.Mesh;
  private moonMesh!: THREE.Mesh;
  private marsMesh!: THREE.Mesh;
  private jupiterMesh!: THREE.Mesh;
  private stationGroup!: THREE.Group;
  private landingTerrainMesh!: THREE.Mesh;
  private transferArcLine!: THREE.Line;

  // Exhaust & smoke instanced particles
  private particleCount = 180;
  private particles: ParticleItem[] = [];
  private particleInstancedMesh!: THREE.InstancedMesh;
  private particleDummy = new THREE.Object3D();
  private flameConeMesh!: THREE.Mesh;

  // Detached debris objects during flight
  private detachedDebris: { mesh: THREE.Object3D; vel: THREE.Vector3; rotVel: THREE.Vector3 }[] = [];

  // HQ first-person walker state
  private playerPos = new THREE.Vector3(0, 1.7, 2.8);
  private targetPlayerPos = new THREE.Vector3(0, 1.7, 2.8);
  private playerYaw = Math.PI; // looking toward mission control (-z is forward at 0, +z at PI)
  private playerPitch = -0.05;
  private targetYaw = Math.PI;
  private targetPitch = -0.05;
  private isGlidingWalk = false;
  private keys: Record<string, boolean> = {};
  private isDraggingLook = false;
  private pointerDownPos = { x: 0, y: 0 };
  private cameraSensitivity = 1.0;
  private nearbyStation: HqInteractiveStation | null = null;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();

  // Current design & flight state
  private currentRocketConfig!: RocketDesignConfig;
  private currentCraftConfig!: SpacecraftDesignConfig;
  private explodedView = 0;
  private activeMission: MissionDefinition | null = null;
  private activeDifficulty: DifficultyLevel = 'beginner';
  private flightTelemetry: FlightTelemetryState | null = null;
  private activeFlaws: FailureReport[] = [];
  private lastCountdownInt = -1;
  private autoPhaseTimer = 0;
  private telemetryEmitTimer = 0;
  private rocketShakeAmp = 0;
  private flightWorldPos = new THREE.Vector3(0, 0.5, -68);
  private flightAltitudeUnits = 0;
  private accuracyAccumulator = 92;

  constructor(
    container: HTMLElement,
    initialRocket: RocketDesignConfig,
    initialCraft: SpacecraftDesignConfig,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.currentRocketConfig = initialRocket;
    this.currentCraftConfig = initialCraft;
    this.callbacks = callbacks;
    this.init();
  }

  private detectSoftwareGl(): boolean {
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private init() {
    this.isSoftwareGl = this.detectSoftwareGl();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#6ca6d9');
    this.scene.fog = new THREE.FogExp2('#6ca6d9', 0.0045);

    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.15, 2800);
    this.camera.position.copy(this.playerPos);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    this.container.appendChild(this.renderer.domElement);

    // Studio Environment Map (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Lighting Rig
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.72);
    this.scene.add(hemi);

    const sunKey = new THREE.DirectionalLight(0xfff4e0, 2.2);
    sunKey.position.set(42, 68, -28);
    sunKey.castShadow = !this.isSoftwareGl;
    sunKey.shadow.mapSize.set(1024, 1024);
    sunKey.shadow.camera.left = -45;
    sunKey.shadow.camera.right = 45;
    sunKey.shadow.camera.top = 45;
    sunKey.shadow.camera.bottom = -45;
    sunKey.shadow.camera.near = 5;
    sunKey.shadow.camera.far = 160;
    sunKey.shadow.bias = -0.0005;
    sunKey.shadow.normalBias = 0.02;
    this.scene.add(sunKey);

    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.65);
    fillLight.position.set(-30, 22, 35);
    this.scene.add(fillLight);

    // OrbitControls (enabled during Designers, Orrery, and Flight)
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = !this.isSoftwareGl;
    this.orbitControls.dampingFactor = 0.07;
    this.orbitControls.enabled = false;

    // Build HQ
    this.hq = buildHqEnvironment(this.maxAnisotropy);
    this.scene.add(this.hq.root);

    // Build Space Environment & Planets
    this.buildSpaceEnvironment();

    // Build Particle Pool
    this.buildParticleSystem();

    // Initial Vehicle Models
    this.rebuildVehicles();

    // Pre-warm shaders on GPU
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.setMode('HQ_WALK');
    this.clock.start();
    this.tick();
  }

  private buildSpaceEnvironment() {
    this.spaceGroup.name = 'SpaceEnvironment';
    this.scene.add(this.spaceGroup);

    // Starfield
    const starCount = 1600;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 650 + Math.random() * 550;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.85 + 20;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 1.8,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
    });
    this.starPoints = new THREE.Points(starGeo, starMat);
    this.spaceGroup.add(this.starPoints);

    // Celestial Bodies for Spaceflight View
    const earthTex = createEarthTexture(this.maxAnisotropy);
    const moonTex = createMoonTexture(this.maxAnisotropy);
    const marsTex = createMarsTexture(this.maxAnisotropy);
    const jupTex = createJupiterTexture(this.maxAnisotropy);

    this.earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(140, 48, 36),
      new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.65, metalness: 0.05 })
    );
    this.earthMesh.visible = false;
    this.spaceGroup.add(this.earthMesh);

    this.moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(28, 36, 28),
      new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.9, metalness: 0.02 })
    );
    this.moonMesh.visible = false;
    this.spaceGroup.add(this.moonMesh);

    this.marsMesh = new THREE.Mesh(
      new THREE.SphereGeometry(34, 36, 28),
      new THREE.MeshStandardMaterial({ map: marsTex, roughness: 0.82, metalness: 0.04 })
    );
    this.marsMesh.visible = false;
    this.spaceGroup.add(this.marsMesh);

    this.jupiterMesh = new THREE.Mesh(
      new THREE.SphereGeometry(54, 36, 28),
      new THREE.MeshStandardMaterial({ map: jupTex, roughness: 0.62, metalness: 0.05 })
    );
    this.jupiterMesh.visible = false;
    this.spaceGroup.add(this.jupiterMesh);

    this.stationGroup = buildSpaceStationGroup();
    this.stationGroup.visible = false;
    this.spaceGroup.add(this.stationGroup);

    // Surface Landing Terrain Pad
    this.landingTerrainMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(55, 58, 2, 48),
      new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.92 })
    );
    this.landingTerrainMesh.visible = false;
    this.landingTerrainMesh.receiveShadow = true;
    this.spaceGroup.add(this.landingTerrainMesh);

    // Orrery Transfer Arc
    const arcPts = [
      new THREE.Vector3(1.15, 0, 0),
      new THREE.Vector3(0.4, 0.25, 1.3),
      new THREE.Vector3(-1.3, 0, 1.32),
    ];
    const arcCurve = new THREE.CatmullRomCurve3(arcPts);
    this.transferArcLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(arcCurve.getPoints(48)),
      new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85 })
    );
    this.hq.orreryGroup.add(this.transferArcLine);
  }

  private buildParticleSystem() {
    const geo = new THREE.DodecahedronGeometry(0.45, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.78,
    });
    this.particleInstancedMesh = new THREE.InstancedMesh(geo, mat, this.particleCount);
    this.particleInstancedMesh.frustumCulled = false;
    this.particleInstancedMesh.visible = false;
    this.scene.add(this.particleInstancedMesh);

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        life: 1,
        scale: 1,
        isFlame: false,
      });
      this.particleDummy.scale.set(0, 0, 0);
      this.particleDummy.updateMatrix();
      this.particleInstancedMesh.setMatrixAt(i, this.particleDummy.matrix);
      this.particleInstancedMesh.setColorAt(i, new THREE.Color('#cbd5e1'));
    }

    // Core exhaust flame cone attached during flight
    this.flameConeMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 5.5, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffaa44,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    );
    this.flameConeMesh.rotation.x = Math.PI;
    this.flameConeMesh.visible = false;
    this.scene.add(this.flameConeMesh);
  }

  private clearGroupChildren(group: THREE.Group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
          else m.material.dispose();
        }
      });
    }
  }

  public updateDesigns(
    rocketConfig: RocketDesignConfig,
    craftConfig: SpacecraftDesignConfig,
    explodedView = this.explodedView
  ) {
    this.currentRocketConfig = rocketConfig;
    this.currentCraftConfig = craftConfig;
    this.explodedView = explodedView;
    this.rebuildVehicles();
  }

  private rebuildVehicles() {
    this.clearGroupChildren(this.hq.rocketDisplayMount);
    this.clearGroupChildren(this.hq.launchpadRocketMount);
    this.clearGroupChildren(this.hq.spacecraftDisplayMount);

    // VAB display rocket (scaled 0.72 to fit cleanly inside high-bay)
    this.vabRocketRefs = buildRocketGroup(
      this.currentRocketConfig,
      this.currentCraftConfig,
      this.explodedView
    );
    this.vabRocketRefs.root.scale.setScalar(0.68);
    this.hq.rocketDisplayMount.add(this.vabRocketRefs.root);

    // Launchpad rocket (full scale outside window)
    this.padRocketRefs = buildRocketGroup(
      this.currentRocketConfig,
      this.currentCraftConfig,
      0
    );
    this.padRocketRefs.root.scale.setScalar(1.35);
    this.hq.launchpadRocketMount.add(this.padRocketRefs.root);

    // Cleanroom Spacecraft
    this.labCraftGroup = buildSpacecraftGroup(this.currentCraftConfig);
    this.labCraftGroup.scale.setScalar(1.05);
    this.hq.spacecraftDisplayMount.add(this.labCraftGroup);
  }

  public setSettings(sensitivity: number, volume: number, muted: boolean) {
    this.cameraSensitivity = sensitivity;
    audioEngine.setSettings(volume, muted);
  }

  public setMode(mode: GameMode) {
    this.mode = mode;

    // Reset debris & particles when leaving flight
    if (mode !== 'LAUNCH_FLIGHT' && mode !== 'DEBRIEF') {
      this.hq.root.visible = true;
      this.hq.launchpadRocketMount.visible = true;
      this.earthMesh.visible = false;
      this.moonMesh.visible = false;
      this.marsMesh.visible = false;
      this.jupiterMesh.visible = false;
      this.stationGroup.visible = false;
      this.landingTerrainMesh.visible = false;
      this.particleInstancedMesh.visible = false;
      this.flameConeMesh.visible = false;
      audioEngine.updateRocketRumble(0, 0);
      audioEngine.stopSpeech();
      this.clearDetachedDebris();
      if (this.flightRocketRefs) {
        this.scene.remove(this.flightRocketRefs.root);
        this.flightRocketRefs = null;
      }
      this.scene.background = _skyDay.clone();
      (this.scene.fog as THREE.FogExp2).color.copy(_skyDay);
      (this.scene.fog as THREE.FogExp2).density = 0.0045;
      (this.starPoints.material as THREE.PointsMaterial).opacity = 0;
    }

    if (mode === 'HQ_WALK') {
      this.orbitControls.enabled = false;
      this.camera.position.copy(this.playerPos);
      this.updateFirstPersonRotation();
    } else if (mode === 'DESIGN_ROCKET') {
      this.orbitControls.enabled = true;
      this.orbitControls.target.set(-17, 5.2, -3);
      this.camera.position.set(-7.5, 6.4, 5.2);
      this.orbitControls.minDistance = 5;
      this.orbitControls.maxDistance = 22;
      this.orbitControls.maxPolarAngle = Math.PI * 0.49;
      this.orbitControls.update();
    } else if (mode === 'DESIGN_CRAFT') {
      this.orbitControls.enabled = true;
      this.orbitControls.target.set(17, 1.7, -3);
      this.camera.position.set(11.8, 3.2, 2.2);
      this.orbitControls.minDistance = 2.6;
      this.orbitControls.maxDistance = 12;
      this.orbitControls.maxPolarAngle = Math.PI * 0.49;
      this.orbitControls.update();
    } else if (mode === 'ORRERY') {
      this.orbitControls.enabled = true;
      this.orbitControls.target.set(0, 2.3, -7);
      this.camera.position.set(0, 5.2, -2.1);
      this.orbitControls.minDistance = 2.5;
      this.orbitControls.maxDistance = 11;
      this.orbitControls.maxPolarAngle = Math.PI * 0.48;
      this.orbitControls.update();
    } else if (mode === 'LAUNCH_FLIGHT') {
      this.orbitControls.enabled = true;
      this.orbitControls.maxPolarAngle = Math.PI * 0.92;
      this.orbitControls.minDistance = 6;
      this.orbitControls.maxDistance = 85;
    }
  }

  public travelToStation(stationId: HqStationId) {
    const st = this.hq.stations.find((s) => s.id === stationId);
    if (!st) return;
    if (this.mode !== 'HQ_WALK') {
      this.setMode('HQ_WALK');
    }
    this.targetPlayerPos.copy(st.standPos);
    const dir = _vec3.copy(st.lookTarget).sub(st.standPos).normalize();
    this.targetYaw = Math.atan2(-dir.x, -dir.z);
    this.targetPitch = Math.asin(THREE.MathUtils.clamp(dir.y, -0.7, 0.7));
    this.isGlidingWalk = true;
  }

  public updateOrreryTrajectory(destination: MissionDefinition['destination']) {
    const end =
      destination === 'Moon'
        ? this.hq.orreryPlanets.moon.position
        : destination === 'Mars'
          ? this.hq.orreryPlanets.mars.position
          : destination === 'Deep Space'
            ? this.hq.orreryPlanets.jupiter.position
            : this.hq.orreryPlanets.station.position;
    const start = this.hq.orreryPlanets.earth.position;
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.45, 0));
    const curve = new THREE.CatmullRomCurve3([start.clone(), mid, end.clone()]);
    this.transferArcLine.geometry.dispose();
    this.transferArcLine.geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
  }

  // ---------------------------------------------------------------------------
  // LAUNCH & SPACE FLIGHT SIMULATION
  // ---------------------------------------------------------------------------
  public startMissionLaunch(mission: MissionDefinition, difficulty: DifficultyLevel) {
    this.activeMission = mission;
    this.activeDifficulty = difficulty;
    this.setMode('LAUNCH_FLIGHT');

    // Evaluate engineering readiness to determine if/when real flaws manifest
    const check = evaluateEngineeringReadiness(
      mission,
      this.currentRocketConfig,
      this.currentCraftConfig,
      difficulty
    );
    this.activeFlaws = check.criticalFlaws;
    this.accuracyAccumulator = 95;

    // Hide pad static rocket and spawn live flight rocket at pad coordinates
    this.hq.launchpadRocketMount.visible = false;
    this.hq.umbilicalArm.rotation.y = 0;

    if (this.flightRocketRefs) {
      this.scene.remove(this.flightRocketRefs.root);
    }
    this.flightRocketRefs = buildRocketGroup(
      this.currentRocketConfig,
      this.currentCraftConfig,
      0
    );
    this.flightRocketRefs.root.scale.setScalar(1.35);
    this.flightWorldPos.set(0, 0.5, -68);
    this.flightAltitudeUnits = 0;
    this.flightRocketRefs.root.position.copy(this.flightWorldPos);
    this.scene.add(this.flightRocketRefs.root);

    this.particleInstancedMesh.visible = true;
    this.flameConeMesh.visible = false;

    const fuelSpec = FUEL_TYPE_SPECS[this.currentRocketConfig.fuelTypeId] ?? FUEL_TYPE_SPECS.kerolox;
    (this.flameConeMesh.material as THREE.MeshBasicMaterial).color.set(fuelSpec.plumeColor);

    const objectives: FlightObjectiveState[] = mission.objectivesTemplate.map((o) => ({
      id: o.id,
      label: o.label,
      completed: false,
    }));

    this.lastCountdownInt = 6;
    this.autoPhaseTimer = 0;
    this.flightTelemetry = {
      phase: 'COUNTDOWN',
      missionElapsedSec: -5,
      countdownSec: 5,
      altitudeKm: 0,
      velocityMs: 0,
      fuelRemainingPct: 100,
      stage1FuelPct: 100,
      stage2FuelPct: 100,
      thrustPct: 0,
      throttle: 1.0,
      pitchTrimDeg: 0,
      stageIndex: 1,
      boostersSeparated: false,
      fairingJettisoned: false,
      spacecraftSeparated: false,
      orbitalStatus: 'On Launch Pad · T-Minus Countdown',
      spacecraftHealthPct: 100,
      powerBalancePct: 100,
      commSignalPct: 100,
      progressPct: 0,
      awaitingManualAction: null,
      dockingOffsetX: 0.42,
      dockingOffsetY: -0.34,
      dockingDistanceM: 120,
      landingAltitudeM: 1800,
      landingVerticalSpeedMs: -42,
      cameraAngle: 'pad_wide',
      timeWarp: 1,
      objectives,
      failureReport: null,
      statusMessage: 'Terminal countdown initiated. All systems polling.',
    };

    // Frame Pad Wide camera
    this.orbitControls.target.set(0, 12, -68);
    this.camera.position.set(24, 10, -40);
    this.orbitControls.update();
    this.callbacks.onFlightTelemetryUpdate({ ...this.flightTelemetry });
  }

  public setFlightThrottle(throttle: number) {
    if (!this.flightTelemetry) return;
    this.flightTelemetry.throttle = THREE.MathUtils.clamp(throttle, 0, 1);
  }

  public setFlightPitchTrim(deg: number) {
    if (!this.flightTelemetry) return;
    this.flightTelemetry.pitchTrimDeg = THREE.MathUtils.clamp(deg, -20, 20);
  }

  public setFlightCameraAngle(angle: CameraAngleId) {
    if (!this.flightTelemetry) return;
    this.flightTelemetry.cameraAngle = angle;
    audioEngine.playUiClick();
  }

  public setFlightTimeWarp(warp: 1 | 2 | 5 | 10) {
    if (!this.flightTelemetry) return;
    this.flightTelemetry.timeWarp = warp;
    audioEngine.playUiClick();
  }

  public nudgeDocking(dx: number, dy: number) {
    if (!this.flightTelemetry || this.flightTelemetry.phase !== 'DOCKING_OP') return;
    this.flightTelemetry.dockingOffsetX = THREE.MathUtils.clamp(
      this.flightTelemetry.dockingOffsetX + dx,
      -1,
      1
    );
    this.flightTelemetry.dockingOffsetY = THREE.MathUtils.clamp(
      this.flightTelemetry.dockingOffsetY + dy,
      -1,
      1
    );
    audioEngine.playUiClick();
  }

  public triggerManualFlightAction() {
    if (!this.flightTelemetry || !this.flightRocketRefs) return;
    const ft = this.flightTelemetry;
    const action = ft.awaitingManualAction;
    if (!action) return;

    audioEngine.playStageSeparation();

    if (action === 'STAGE_SEP') {
      this.executeStageSeparation();
      ft.awaitingManualAction = null;
      this.autoPhaseTimer = 0;
    } else if (action === 'FAIRING_SEP') {
      this.executeFairingSeparation();
      ft.awaitingManualAction = null;
    } else if (action === 'TRANSFER_BURN') {
      ft.phase = 'TRANSFER_BURN';
      ft.awaitingManualAction = null;
      this.autoPhaseTimer = 0;
      ft.orbitalStatus = `Transfer Burn · En Route to ${this.activeMission?.destination ?? 'Target'}`;
      ft.statusMessage = 'Upper stage reignited for orbital transfer injection.';
    } else if (action === 'DOCKING') {
      const err = Math.hypot(ft.dockingOffsetX, ft.dockingOffsetY);
      if (err > 0.25) {
        this.triggerFailure({
          code: 'DOCKING_MISALIGNED',
          title: 'Docking Collar Hard Impact',
          phase: 'DOCKING_OP',
          reason: `Docking alignment error was too large (${Math.round(err * 100)}% off-axis) during final capture.`,
          engineeringExplanation:
            'Soft-capture docking latches require lateral alignment within 25% of the target corridor to prevent damage to the pressurized hatch seal.',
          recommendedFix:
            'Use the RCS alignment controls (Arrow keys or Dock Pad buttons) to center the crosshair before triggering Capture.',
          realWorldReference: REAL_WORLD_FAILURE_CASES.DOCKING_MISALIGNED,
        });
        return;
      }
      this.accuracyAccumulator = Math.round(100 - err * 75);
      this.completeObjective('docking');
      ft.awaitingManualAction = null;
      ft.phase = 'PAYLOAD_DEPLOY';
      this.autoPhaseTimer = 0;
      ft.statusMessage = 'Hard capture confirmed! Transferring pressurized cargo.';
    } else if (action === 'LANDING') {
      if (Math.abs(ft.landingVerticalSpeedMs) > 9.5) {
        this.triggerFailure({
          code: 'HARD_LANDING',
          title: 'High-Velocity Surface Impact',
          phase: 'LANDING_DESCENT',
          reason: `Touchdown vertical velocity (${Math.abs(ft.landingVerticalSpeedMs).toFixed(1)} m/s) exceeded structural leg rating (9.5 m/s max).`,
          engineeringExplanation:
            'Insufficient descent braking thrust left too much downward momentum at surface contact, buckling the landing struts.',
          recommendedFix:
            'Increase engine throttle during the final 500m of powered descent to arrest vertical speed below 6 m/s.',
          realWorldReference: REAL_WORLD_FAILURE_CASES.HARD_LANDING,
        });
        return;
      }
      this.accuracyAccumulator = Math.round(
        100 - Math.max(0, Math.abs(ft.landingVerticalSpeedMs) - 2) * 5
      );
      this.completeObjective('landing');
      ft.awaitingManualAction = null;
      ft.phase = 'PAYLOAD_DEPLOY';
      this.autoPhaseTimer = 0;
      ft.statusMessage = 'Contact light! Surface touchdown nominal.';
    } else if (action === 'DEPLOY') {
      this.executePayloadDeploy();
      ft.awaitingManualAction = null;
    }
  }

  private executeStageSeparation() {
    if (!this.flightTelemetry || !this.flightRocketRefs) return;
    const ft = this.flightTelemetry;
    ft.stageIndex = 2;
    ft.boostersSeparated = true;
    ft.phase = 'ASCENT_STAGE2';
    ft.statusMessage = 'MECO & Stage 1 separation confirmed. Stage 2 ignition!';
    this.completeObjective('stage_sep');

    // Detach Stage 1 & Boosters into falling debris
    const s1WorldPos = new THREE.Vector3();
    this.flightRocketRefs.stage1Group.getWorldPosition(s1WorldPos);
    const s1Clone = this.flightRocketRefs.stage1Group;
    const bClone = this.flightRocketRefs.boostersGroup;
    this.flightRocketRefs.root.remove(s1Clone);
    this.flightRocketRefs.root.remove(bClone);
    s1Clone.position.copy(this.flightRocketRefs.root.position);
    s1Clone.quaternion.copy(this.flightRocketRefs.root.quaternion);
    s1Clone.scale.copy(this.flightRocketRefs.root.scale);
    bClone.position.copy(this.flightRocketRefs.root.position);
    bClone.quaternion.copy(this.flightRocketRefs.root.quaternion);
    bClone.scale.copy(this.flightRocketRefs.root.scale);
    this.scene.add(s1Clone);
    this.scene.add(bClone);

    this.detachedDebris.push(
      {
        mesh: s1Clone,
        vel: new THREE.Vector3(-1.5, -6, 0),
        rotVel: new THREE.Vector3(0.3, 0.1, 0.25),
      },
      {
        mesh: bClone,
        vel: new THREE.Vector3(1.8, -7, 0.5),
        rotVel: new THREE.Vector3(-0.2, 0.2, -0.3),
      }
    );
  }

  private executeFairingSeparation() {
    if (!this.flightTelemetry || !this.flightRocketRefs) return;
    const ft = this.flightTelemetry;
    ft.fairingJettisoned = true;
    ft.statusMessage = 'Payload fairing jettisoned. Spacecraft exposed to space.';
    this.completeObjective('fairing_sep');

    for (const [half, dir] of [
      [this.flightRocketRefs.fairingLeft, -1],
      [this.flightRocketRefs.fairingRight, 1],
    ] as const) {
      const worldP = new THREE.Vector3();
      half.getWorldPosition(worldP);
      this.flightRocketRefs.root.remove(half);
      half.position.copy(worldP);
      half.scale.copy(this.flightRocketRefs.root.scale);
      this.scene.add(half);
      this.detachedDebris.push({
        mesh: half,
        vel: new THREE.Vector3(dir * 4.5, -2.5, 0),
        rotVel: new THREE.Vector3(0, 0, dir * 0.9),
      });
    }
  }

  private executePayloadDeploy() {
    if (!this.flightTelemetry || !this.flightRocketRefs || !this.activeMission) return;
    const ft = this.flightTelemetry;
    ft.spacecraftSeparated = true;
    ft.stageIndex = 3;
    this.completeObjective('deploy');
    ft.phase = 'MISSION_COMPLETE';
    ft.orbitalStatus = `${this.activeMission.destination} Mission Nominal · Telemetry Locked`;
    ft.statusMessage = 'Payload deployed and transmitting nominal telemetry!';
    audioEngine.updateRocketRumble(0, ft.altitudeKm);
    audioEngine.playSuccessChord();

    const craftMetrics = calculateSpacecraftMetrics(
      this.currentCraftConfig,
      this.activeMission.constraints.solarFluxFactor
    );
    const rocketMetrics = calculateRocketMetrics(this.currentRocketConfig, craftMetrics.totalMassKg);
    const totalCostM = rocketMetrics.rocketCostM + craftMetrics.spacecraftCostM;
    const combinedDeltaVMs = rocketMetrics.totalDeltaVMs + craftMetrics.craftDeltaVMs;

    const score = computeMissionScore(
      this.activeMission,
      true,
      totalCostM,
      combinedDeltaVMs,
      ft.fuelRemainingPct,
      craftMetrics.powerMarginW,
      ft.missionElapsedSec,
      this.accuracyAccumulator
    );

    this.callbacks.onMissionComplete(true, score, { ...ft });
  }

  private triggerFailure(report: FailureReport) {
    if (!this.flightTelemetry || !this.activeMission) return;
    const ft = this.flightTelemetry;
    ft.phase = 'MISSION_FAILED';
    ft.thrustPct = 0;
    ft.spacecraftHealthPct = 12;
    ft.failureReport = report;
    ft.orbitalStatus = `ANOMALY · ${report.title}`;
    ft.statusMessage = report.reason;
    this.flameConeMesh.visible = false;
    audioEngine.updateRocketRumble(0, ft.altitudeKm);
    audioEngine.playFailureAlarm();

    const craftMetrics = calculateSpacecraftMetrics(
      this.currentCraftConfig,
      this.activeMission.constraints.solarFluxFactor
    );
    const rocketMetrics = calculateRocketMetrics(this.currentRocketConfig, craftMetrics.totalMassKg);
    const score = computeMissionScore(
      this.activeMission,
      false,
      rocketMetrics.rocketCostM + craftMetrics.spacecraftCostM,
      rocketMetrics.totalDeltaVMs + craftMetrics.craftDeltaVMs,
      ft.fuelRemainingPct,
      craftMetrics.powerMarginW,
      ft.missionElapsedSec,
      0
    );

    this.callbacks.onMissionComplete(false, score, { ...ft }, report);
  }

  private completeObjective(id: string) {
    if (!this.flightTelemetry) return;
    const obj = this.flightTelemetry.objectives.find((o) => o.id === id);
    if (obj) obj.completed = true;
  }

  private clearDetachedDebris() {
    this.detachedDebris.forEach((d) => this.scene.remove(d.mesh));
    this.detachedDebris = [];
  }

  private spawnExhaustParticle(worldPos: THREE.Vector3, isFlame: boolean, spread = 0.6) {
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.pos.copy(worldPos);
        p.pos.x += (Math.random() - 0.5) * 0.6;
        p.pos.z += (Math.random() - 0.5) * 0.6;
        p.vel.set(
          (Math.random() - 0.5) * spread * 5,
          isFlame ? -18 - Math.random() * 10 : -4 - Math.random() * 4,
          (Math.random() - 0.5) * spread * 5
        );
        p.age = 0;
        p.life = isFlame ? 0.25 + Math.random() * 0.15 : 1.1 + Math.random() * 0.8;
        p.scale = isFlame ? 0.9 : 1.4 + Math.random() * 1.4;
        p.isFlame = isFlame;
        return;
      }
    }
  }

  private updateParticles(dt: number) {
    if (!this.particleInstancedMesh.visible) return;
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      if (!p.active) {
        this.particleDummy.scale.set(0, 0, 0);
        this.particleDummy.updateMatrix();
        this.particleInstancedMesh.setMatrixAt(i, this.particleDummy.matrix);
        continue;
      }
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        continue;
      }
      const t = p.age / p.life;
      p.pos.addScaledVector(p.vel, dt);
      const s = p.isFlame ? p.scale * (1 - t) : p.scale * (0.6 + t * 2.2) * (1 - t * 0.5);
      this.particleDummy.position.copy(p.pos);
      this.particleDummy.scale.setScalar(Math.max(0.01, s));
      this.particleDummy.updateMatrix();
      this.particleInstancedMesh.setMatrixAt(i, this.particleDummy.matrix);

      if (p.isFlame) {
        _tmpColor.set('#ff9933').lerp(_vec3c as unknown as THREE.Color, 0);
        this.particleInstancedMesh.setColorAt(i, _tmpColor.set(t < 0.35 ? '#fff3cc' : '#ff6a00'));
      } else {
        this.particleInstancedMesh.setColorAt(i, _tmpColor.set('#cbd5e1'));
      }
    }
    this.particleInstancedMesh.instanceMatrix.needsUpdate = true;
    if (this.particleInstancedMesh.instanceColor) {
      this.particleInstancedMesh.instanceColor.needsUpdate = true;
    }
  }

  private updateFlightSimulation(rawDt: number) {
    if (!this.flightTelemetry || !this.flightRocketRefs || !this.activeMission) return;
    const ft = this.flightTelemetry;
    if (ft.phase === 'MISSION_COMPLETE' || ft.phase === 'MISSION_FAILED') {
      this.updateParticles(rawDt);
      return;
    }

    const dt = rawDt * (ft.phase === 'COUNTDOWN' ? 1 : ft.timeWarp);
    ft.missionElapsedSec += dt;

    // Update detached debris
    for (const d of this.detachedDebris) {
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.rotVel.x * dt;
      d.mesh.rotation.y += d.rotVel.y * dt;
      d.mesh.rotation.z += d.rotVel.z * dt;
    }

    // COUNTDOWN PHASE (5 seconds)
    if (ft.phase === 'COUNTDOWN') {
      ft.countdownSec = Math.max(0, 5 - (ft.missionElapsedSec + 5));
      const cInt = Math.ceil(ft.countdownSec);
      if (cInt !== this.lastCountdownInt && cInt >= 0 && cInt <= 5) {
        this.lastCountdownInt = cInt;
        audioEngine.playCountdownTick(cInt);
      }

      if (ft.countdownSec < 2.0) {
        this.hq.umbilicalArm.rotation.y = THREE.MathUtils.damp(
          this.hq.umbilicalArm.rotation.y,
          -0.9,
          4.5,
          rawDt
        );
      }

      if (ft.countdownSec < 1.5) {
        ft.thrustPct = Math.round(THREE.MathUtils.clamp((1.5 - ft.countdownSec) / 1.5, 0, 1) * 90);
        this.flameConeMesh.visible = true;
        this.flameConeMesh.position.set(0, -1.2, -68);
        this.flameConeMesh.scale.set(1, 0.75, 1);
        this.spawnExhaustParticle(_vec3.set(0, 0.6, -68), false, 1.4);
        this.spawnExhaustParticle(_vec3.set(0, 0.6, -68), true, 0.8);
        audioEngine.updateRocketRumble(ft.thrustPct / 100, 0);
      }

      if (ft.countdownSec <= 0) {
        const thrustFlaw = this.activeFlaws.find((f) => f.code === 'INSUFFICIENT_THRUST');
        if (thrustFlaw) {
          this.triggerFailure(thrustFlaw);
          return;
        }
        ft.phase = 'LIFTOFF';
        ft.orbitalStatus = 'Liftoff · Tower Cleared';
        ft.statusMessage = 'Liftoff! Launch clamps released—clearing the tower.';
        this.completeObjective('liftoff');
      }
    }
    // ASCENT STAGE 1 (~3.0s)
    else if (ft.phase === 'LIFTOFF' || ft.phase === 'ASCENT_STAGE1') {
      const thrustActive = Math.max(0.2, ft.throttle);
      ft.thrustPct = Math.round(ft.throttle * 100);
      const accel = 55 * thrustActive + 22;
      ft.velocityMs += accel * dt * 11;
      ft.altitudeKm += (ft.velocityMs * dt) / 1000 * 14;
      ft.stage1FuelPct = Math.max(0, ft.stage1FuelPct - dt * 32 * (0.45 + 0.55 * thrustActive));
      ft.fuelRemainingPct = Math.round(ft.stage1FuelPct * 0.62 + ft.stage2FuelPct * 0.38);
      ft.progressPct = Math.min(32, (ft.altitudeKm / 75) * 32);

      this.flightAltitudeUnits += dt * (11 + ft.altitudeKm * 0.65) * thrustActive;
      this.flightWorldPos.y = 0.5 + this.flightAltitudeUnits;
      const turnAngle = THREE.MathUtils.clamp(
        (ft.altitudeKm / 65) * 0.52 + (ft.pitchTrimDeg * Math.PI) / 180,
        -0.7,
        0.75
      );
      this.flightRocketRefs.root.position.copy(this.flightWorldPos);
      this.flightRocketRefs.root.rotation.z = -turnAngle;

      // Max-Q Structural / Stability Failure Checks
      if (ft.altitudeKm > 12) {
        const overweightFlaw = this.activeFlaws.find((f) => f.code === 'PAYLOAD_OVERWEIGHT');
        if (overweightFlaw) {
          this.triggerFailure(overweightFlaw);
          return;
        }
        const unstableFlaw = this.activeFlaws.find((f) => f.code === 'UNSTABLE_CONFIG');
        if (unstableFlaw) {
          this.flightRocketRefs.root.rotation.z += 0.4;
          this.triggerFailure(unstableFlaw);
          return;
        }
      }

      if (ft.altitudeKm > 10 && ft.phase === 'LIFTOFF') {
        ft.phase = 'ASCENT_STAGE1';
        ft.orbitalStatus = 'Supersonic Ascent · Max-Q Passed';
        ft.statusMessage = 'Vehicle supersonic. Pitching downrange along orbital corridor.';
      }

      const nozzlePos = _vec3.set(0, -1.8, 0).applyMatrix4(this.flightRocketRefs.root.matrixWorld);
      this.flameConeMesh.visible = ft.throttle > 0.05;
      this.flameConeMesh.position.copy(nozzlePos);
      this.flameConeMesh.quaternion.copy(this.flightRocketRefs.root.quaternion);
      this.flameConeMesh.scale.set(1, 0.7 + thrustActive * 0.9 + Math.random() * 0.15, 1);

      this.spawnExhaustParticle(nozzlePos, true, 0.5);
      if (ft.altitudeKm < 26) this.spawnExhaustParticle(nozzlePos, false, 0.9);
      this.rocketShakeAmp = thrustActive * (ft.altitudeKm < 20 ? 0.22 : 0.06);
      audioEngine.updateRocketRumble(thrustActive, ft.altitudeKm);

      if (ft.stage1FuelPct <= 2) {
        ft.phase = 'STAGE_SEP';
        ft.awaitingManualAction = 'STAGE_SEP';
        this.autoPhaseTimer = 0;
        ft.thrustPct = 0;
        this.flameConeMesh.visible = false;
        ft.orbitalStatus = 'MECO · Separating Stage 1';
        ft.statusMessage = 'Main Engine Cutoff! Executing Stage 1 & Booster separation.';
      }
    }
    // AUTO/MANUAL STAGE SEPARATION (~0.5s)
    else if (ft.phase === 'STAGE_SEP') {
      this.autoPhaseTimer += dt;
      if (this.autoPhaseTimer >= 0.5) {
        audioEngine.playStageSeparation();
        this.executeStageSeparation();
        ft.awaitingManualAction = null;
        this.autoPhaseTimer = 0;
      }
    }
    // ASCENT STAGE 2 (~3.0s)
    else if (ft.phase === 'ASCENT_STAGE2') {
      const thrustActive = Math.max(0.25, ft.throttle);
      ft.thrustPct = Math.round(ft.throttle * 100);
      ft.velocityMs += (68 * thrustActive + 24) * dt * 25;
      ft.altitudeKm += (ft.velocityMs * dt) / 1000 * 14;
      ft.stage2FuelPct = Math.max(0, ft.stage2FuelPct - dt * 13 * (0.35 + 0.65 * thrustActive));
      ft.fuelRemainingPct = Math.round(ft.stage2FuelPct);
      ft.progressPct = Math.min(62, 32 + ((ft.altitudeKm - 70) / 330) * 30);

      this.flightAltitudeUnits += dt * 24 * thrustActive;
      this.flightWorldPos.y = 0.5 + this.flightAltitudeUnits;
      this.flightRocketRefs.root.position.copy(this.flightWorldPos);
      this.flightRocketRefs.root.rotation.z = -0.82 - ft.pitchTrimDeg * 0.01;

      const s2Pos = _vec3.set(0, 6.2, 0).applyMatrix4(this.flightRocketRefs.root.matrixWorld);
      this.flameConeMesh.visible = ft.throttle > 0.05;
      this.flameConeMesh.position.copy(s2Pos);
      this.flameConeMesh.quaternion.copy(this.flightRocketRefs.root.quaternion);
      this.flameConeMesh.scale.set(0.6, 0.7 + thrustActive * 0.5, 0.6);
      audioEngine.updateRocketRumble(thrustActive * 0.75, ft.altitudeKm);

      if (!ft.fairingJettisoned && ft.altitudeKm >= 110) {
        audioEngine.playStageSeparation();
        this.executeFairingSeparation();
        ft.awaitingManualAction = null;
      }

      if (
        (ft.altitudeKm >= this.activeMission.constraints.targetOrbitKm && ft.velocityMs >= 7600) ||
        ft.stage2FuelPct <= 15
      ) {
        const deltaVFlaw = this.activeFlaws.find((f) => f.code === 'INSUFFICIENT_DELTAV');
        if (deltaVFlaw) {
          this.triggerFailure(deltaVFlaw);
          return;
        }

        this.enterDeepSpaceVisuals();
        this.completeObjective('orbit');
        this.autoPhaseTimer = 0;

        if (this.activeMission.destination === 'LEO') {
          ft.phase = 'ORBIT_INSERTION';
          ft.awaitingManualAction = 'DEPLOY';
          ft.thrustPct = 0;
          this.flameConeMesh.visible = false;
          ft.orbitalStatus = `LEO ${this.activeMission.constraints.targetOrbitKm} km · Circularized`;
          ft.statusMessage = 'Target orbit achieved! Deploying spacecraft payload.';
        } else if (this.activeMission.destination === 'Station') {
          ft.phase = 'DOCKING_OP';
          ft.awaitingManualAction = 'DOCKING';
          ft.thrustPct = 15;
          this.flameConeMesh.visible = false;
          ft.orbitalStatus = 'Station Rendezvous · Final Approach 120m';
          ft.statusMessage = 'Align docking crosshairs using RCS buttons, then execute Soft Capture.';
        } else {
          ft.phase = 'COAST_CRUISE';
          ft.awaitingManualAction = 'TRANSFER_BURN';
          ft.thrustPct = 0;
          this.flameConeMesh.visible = false;
          ft.orbitalStatus = `Parking Orbit · Ready for ${this.activeMission.destination} Transfer`;
          ft.statusMessage = `Parking orbit stable. Initiating transfer burn toward ${this.activeMission.destination}.`;
        }
      }
    }
    // LEO ORBIT INSERTION -> AUTO DEPLOY (~0.9s)
    else if (ft.phase === 'ORBIT_INSERTION') {
      this.autoPhaseTimer += dt;
      if (this.autoPhaseTimer >= 0.9) {
        this.executePayloadDeploy();
        ft.awaitingManualAction = null;
      }
    }
    // TRANSFER BURN & COAST CRUISE (~2.2s)
    else if (ft.phase === 'TRANSFER_BURN' || ft.phase === 'COAST_CRUISE') {
      if (ft.phase === 'COAST_CRUISE') {
        this.autoPhaseTimer += dt;
        if (this.autoPhaseTimer >= 0.55) {
          ft.phase = 'TRANSFER_BURN';
          ft.awaitingManualAction = null;
          this.autoPhaseTimer = 0;
          ft.orbitalStatus = `Transfer Burn · En Route to ${this.activeMission.destination}`;
          ft.statusMessage = 'Upper stage reignited for orbital transfer injection.';
        }
      } else {
        const thrustActive = Math.max(0.3, ft.throttle);
        ft.thrustPct = Math.round(ft.throttle * 100);
        ft.velocityMs += 180 * dt * thrustActive;
        ft.altitudeKm += 1200 * dt;
        ft.stage2FuelPct = Math.max(0, ft.stage2FuelPct - dt * 5.5);
        ft.fuelRemainingPct = Math.round(ft.stage2FuelPct);
        ft.progressPct = Math.min(86, ft.progressPct + dt * 11);

        const s2Pos = _vec3.set(0, 6.2, 0).applyMatrix4(this.flightRocketRefs.root.matrixWorld);
        this.flameConeMesh.visible = true;
        this.flameConeMesh.position.copy(s2Pos);
        this.flameConeMesh.quaternion.copy(this.flightRocketRefs.root.quaternion);

        const commFlaw = this.activeFlaws.find((f) => f.code === 'COMM_BLACKOUT');
        if (commFlaw && ft.progressPct > 72) {
          this.triggerFailure(commFlaw);
          return;
        }
        const powerFlaw = this.activeFlaws.find((f) => f.code === 'POWER_FAILURE');
        if (powerFlaw && ft.progressPct > 76) {
          this.triggerFailure(powerFlaw);
          return;
        }

        if (ft.progressPct >= 85) {
          this.completeObjective('tli');
          this.completeObjective('tmi');
          this.completeObjective('tji');
          this.completeObjective('cruise');
          this.flameConeMesh.visible = false;
          ft.thrustPct = 0;
          this.autoPhaseTimer = 0;

          if (this.activeMission.constraints.requiresLanding) {
            ft.phase = 'LANDING_DESCENT';
            ft.awaitingManualAction = 'LANDING';
            ft.landingAltitudeM = 650;
            ft.landingVerticalSpeedMs = -22;
            this.showLandingTerrain();
            ft.orbitalStatus = `${this.activeMission.destination} Powered Descent`;
            ft.statusMessage =
              'Powered descent active! Keep throttle raised for a soft touchdown (< 9.5 m/s).';
          } else {
            ft.phase = 'PAYLOAD_DEPLOY';
            ft.awaitingManualAction = 'DEPLOY';
            ft.orbitalStatus = `${this.activeMission.destination} Arrival Orbit`;
            ft.statusMessage = `Arrived at ${this.activeMission.destination}! Deploying spacecraft.`;
          }
        }
      }
    }
    // DOCKING OPERATION (MISSION 4 - ~4s)
    else if (ft.phase === 'DOCKING_OP') {
      ft.dockingDistanceM = Math.max(4, ft.dockingDistanceM - dt * 24);
      ft.dockingOffsetX = THREE.MathUtils.clamp(
        ft.dockingOffsetX + Math.sin(ft.missionElapsedSec * 0.9) * 0.03 * dt,
        -1,
        1
      );
      ft.dockingOffsetY = THREE.MathUtils.clamp(
        ft.dockingOffsetY + Math.cos(ft.missionElapsedSec * 0.7) * 0.03 * dt,
        -1,
        1
      );
      this.stationGroup.position.set(
        this.flightWorldPos.x - ft.dockingOffsetX * 6,
        this.flightWorldPos.y + 12 + ft.dockingDistanceM * 0.25,
        this.flightWorldPos.z - ft.dockingOffsetY * 6
      );
      ft.progressPct = Math.min(95, 65 + ((120 - ft.dockingDistanceM) / 120) * 30);

      const err = Math.hypot(ft.dockingOffsetX, ft.dockingOffsetY);
      if (ft.dockingDistanceM <= 8 && err <= 0.25) {
        this.accuracyAccumulator = Math.round(100 - err * 75);
        this.completeObjective('docking');
        ft.awaitingManualAction = null;
        ft.phase = 'PAYLOAD_DEPLOY';
        this.autoPhaseTimer = 0;
        ft.statusMessage = 'Hard capture confirmed! Transferring pressurized cargo.';
      } else if (ft.dockingDistanceM <= 4.5 && err > 0.25) {
        this.triggerFailure({
          code: 'DOCKING_MISALIGNED',
          title: 'Docking Collar Hard Impact',
          phase: 'DOCKING_OP',
          reason: `Docking alignment error was too large (${Math.round(err * 100)}% off-axis) during final capture.`,
          engineeringExplanation:
            'Soft-capture docking latches require lateral alignment within 25% of the target corridor to prevent damage to the pressurized hatch seal.',
          recommendedFix:
            'Use the RCS alignment controls (Arrow keys or Dock Pad buttons) to center the crosshair before final contact.',
          realWorldReference: REAL_WORLD_FAILURE_CASES.DOCKING_MISALIGNED,
        });
        return;
      }
    }
    // LANDING DESCENT (MISSIONS 2 & 3 - ~2.8s)
    else if (ft.phase === 'LANDING_DESCENT') {
      const brakingAccel = ft.throttle * 28;
      const grav = this.activeMission.destination === 'Moon' ? 4.2 : 8.5;
      ft.landingVerticalSpeedMs = THREE.MathUtils.clamp(
        ft.landingVerticalSpeedMs + (brakingAccel - grav) * dt * 4.5,
        -55,
        -1.8
      );
      ft.landingAltitudeM = Math.max(0, ft.landingAltitudeM + ft.landingVerticalSpeedMs * dt * 12);
      ft.thrustPct = Math.round(ft.throttle * 100);
      ft.progressPct = Math.min(95, 85 + ((650 - ft.landingAltitudeM) / 650) * 10);

      this.landingTerrainMesh.position.set(
        this.flightWorldPos.x,
        this.flightWorldPos.y - 6 - ft.landingAltitudeM * 0.035,
        this.flightWorldPos.z
      );
      this.flameConeMesh.visible = ft.throttle > 0.08;
      const s2Pos = _vec3.set(0, 6.2, 0).applyMatrix4(this.flightRocketRefs.root.matrixWorld);
      this.flameConeMesh.position.copy(s2Pos);
      this.flameConeMesh.scale.set(0.45, 0.4 + ft.throttle * 0.6, 0.45);
      audioEngine.updateRocketRumble(ft.throttle * 0.5, 0);

      if (ft.landingAltitudeM <= 14) {
        if (Math.abs(ft.landingVerticalSpeedMs) > 9.5) {
          this.triggerFailure({
            code: 'HARD_LANDING',
            title: 'High-Velocity Surface Impact',
            phase: 'LANDING_DESCENT',
            reason: `Touchdown vertical velocity (${Math.abs(ft.landingVerticalSpeedMs).toFixed(1)} m/s) exceeded structural leg rating (9.5 m/s max).`,
            engineeringExplanation:
              'Insufficient descent braking thrust left too much downward momentum at surface contact, buckling the landing struts.',
            recommendedFix:
              'Keep engine throttle high during final descent to arrest vertical speed below 6 m/s.',
            realWorldReference: REAL_WORLD_FAILURE_CASES.HARD_LANDING,
          });
          return;
        }
        this.accuracyAccumulator = Math.round(
          100 - Math.max(0, Math.abs(ft.landingVerticalSpeedMs) - 2) * 5
        );
        this.completeObjective('landing');
        ft.awaitingManualAction = null;
        ft.phase = 'PAYLOAD_DEPLOY';
        this.autoPhaseTimer = 0;
        ft.statusMessage = 'Contact light! Surface touchdown nominal.';
      }
    }
    // PAYLOAD DEPLOYMENT CHECK (~0.6s)
    else if (ft.phase === 'PAYLOAD_DEPLOY') {
      const wrongCraft = this.activeFlaws.find(
        (f) => f.code === 'WRONG_SPACECRAFT' || f.code === 'MISSING_INSTRUMENT'
      );
      if (wrongCraft) {
        this.triggerFailure(wrongCraft);
        return;
      }
      ft.awaitingManualAction = 'DEPLOY';
      this.autoPhaseTimer += dt;
      if (this.autoPhaseTimer >= 0.6) {
        this.executePayloadDeploy();
        ft.awaitingManualAction = null;
      }
    }

    // Smooth atmospheric sky-to-space transition based on altitude
    const atmoFrac = THREE.MathUtils.clamp(ft.altitudeKm / 85, 0, 1);
    if (atmoFrac < 0.45) {
      _tmpColor.copy(_skyDay).lerp(_skyHighAtmo, atmoFrac / 0.45);
    } else {
      _tmpColor.copy(_skyHighAtmo).lerp(_skySpace, (atmoFrac - 0.45) / 0.55);
    }
    (this.scene.background as THREE.Color).copy(_tmpColor);
    (this.scene.fog as THREE.FogExp2).color.copy(_tmpColor);
    (this.scene.fog as THREE.FogExp2).density = 0.0045 * (1 - atmoFrac);
    (this.starPoints.material as THREE.PointsMaterial).opacity = Math.max(0, (atmoFrac - 0.35) / 0.65);

    this.updateFlightCamera(rawDt);
    this.updateParticles(rawDt);

    // Emit telemetry to React at ~12Hz to keep DOM updates ultra-smooth
    this.telemetryEmitTimer += rawDt;
    if (this.telemetryEmitTimer >= 0.08) {
      this.telemetryEmitTimer = 0;
      this.callbacks.onFlightTelemetryUpdate({ ...ft });
    }
  }

  private enterDeepSpaceVisuals() {
    this.hq.root.visible = false;
    this.earthMesh.visible = true;
    this.earthMesh.position.set(this.flightWorldPos.x - 190, this.flightWorldPos.y - 115, this.flightWorldPos.z - 160);

    if (this.activeMission?.destination === 'Moon') {
      this.moonMesh.visible = true;
      this.moonMesh.position.set(this.flightWorldPos.x + 85, this.flightWorldPos.y + 42, this.flightWorldPos.z - 95);
    } else if (this.activeMission?.destination === 'Mars') {
      this.marsMesh.visible = true;
      this.marsMesh.position.set(this.flightWorldPos.x + 95, this.flightWorldPos.y + 38, this.flightWorldPos.z - 115);
    } else if (this.activeMission?.destination === 'Deep Space') {
      this.jupiterMesh.visible = true;
      this.jupiterMesh.position.set(this.flightWorldPos.x + 125, this.flightWorldPos.y + 32, this.flightWorldPos.z - 145);
    } else if (this.activeMission?.destination === 'Station') {
      this.stationGroup.visible = true;
      this.stationGroup.position.set(this.flightWorldPos.x, this.flightWorldPos.y + 42, this.flightWorldPos.z);
      this.stationGroup.rotation.x = Math.PI / 2;
    }
  }

  private showLandingTerrain() {
    this.earthMesh.visible = false;
    this.moonMesh.visible = false;
    this.marsMesh.visible = false;
    this.landingTerrainMesh.visible = true;
    if (this.flightRocketRefs) {
      this.flightRocketRefs.root.rotation.set(0, 0, 0);
    }
    const mat = this.landingTerrainMesh.material as THREE.MeshStandardMaterial;
    mat.color.set(this.activeMission?.destination === 'Mars' ? '#c86038' : '#a1a5ad');
  }

  private updateFlightCamera(dt: number) {
    if (!this.flightTelemetry || !this.flightRocketRefs) return;
    const ft = this.flightTelemetry;
    const rocketPos = this.flightRocketRefs.root.position;
    const targetY = rocketPos.y + (ft.stageIndex === 1 ? 10 : 12);

    _vec3b.set(rocketPos.x, targetY, rocketPos.z);

    if (ft.cameraAngle === 'pad_wide' && ft.altitudeKm < 12) {
      this.orbitControls.target.lerp(_vec3b, 1 - Math.exp(-5 * dt));
      if (this.rocketShakeAmp > 0) {
        this.camera.position.x += (Math.random() - 0.5) * this.rocketShakeAmp;
        this.camera.position.y += (Math.random() - 0.5) * this.rocketShakeAmp;
      }
    } else if (ft.cameraAngle === 'booster_cam') {
      this.orbitControls.target.copy(_vec3b);
      _vec3c.set(rocketPos.x + 7.5, targetY - 5.5, rocketPos.z + 8.5);
      this.camera.position.lerp(_vec3c, 1 - Math.exp(-6 * dt));
    } else if (ft.cameraAngle === 'orbital_cam') {
      this.orbitControls.target.copy(_vec3b);
      _vec3c.set(rocketPos.x + 28, targetY + 12, rocketPos.z + 32);
      this.camera.position.lerp(_vec3c, 1 - Math.exp(-4 * dt));
    } else {
      // chase_cam (default follow)
      this.orbitControls.target.lerp(_vec3b, 1 - Math.exp(-7 * dt));
      _vec3c.set(rocketPos.x + 14, targetY + 3, rocketPos.z + 18);
      this.camera.position.lerp(_vec3c, 1 - Math.exp(-5 * dt));
      if (this.rocketShakeAmp > 0) {
        this.camera.position.x += (Math.random() - 0.5) * this.rocketShakeAmp * 0.5;
      }
    }
    this.orbitControls.update();
  }

  // ---------------------------------------------------------------------------
  // HQ FIRST-PERSON WALKING & INPUTS
  // ---------------------------------------------------------------------------
  private updateFirstPersonRotation() {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.playerYaw;
    this.camera.rotation.x = this.playerPitch;
  }

  private updateHqWalker(dt: number) {
    if (this.isGlidingWalk) {
      const k = 1 - Math.exp(-6.5 * dt);
      this.playerPos.lerp(this.targetPlayerPos, k);
      this.playerYaw = THREE.MathUtils.damp(this.playerYaw, this.targetYaw, 6.5, dt);
      this.playerPitch = THREE.MathUtils.damp(this.playerPitch, this.targetPitch, 6.5, dt);
      if (this.playerPos.distanceTo(this.targetPlayerPos) < 0.08) {
        this.isGlidingWalk = false;
      }
    } else {
      let forward = 0;
      let strafe = 0;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) strafe += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) strafe -= 1;

      if (forward !== 0 || strafe !== 0) {
        const speed = this.keys['ShiftLeft'] ? 12.5 : 7.5;
        const sinY = Math.sin(this.playerYaw);
        const cosY = Math.cos(this.playerYaw);
        const moveX = (-sinY * forward + cosY * strafe) * speed * dt;
        const moveZ = (-cosY * forward - sinY * strafe) * speed * dt;
        this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x + moveX, -24, 24);
        this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z + moveZ, -17.2, 17.2);
      }
    }

    this.camera.position.copy(this.playerPos);
    this.updateFirstPersonRotation();

    // Check nearby interactive station
    let closest: HqInteractiveStation | null = null;
    let bestDist = 4.2;
    for (const st of this.hq.stations) {
      const d = this.playerPos.distanceTo(st.standPos);
      if (d < bestDist) {
        bestDist = d;
        closest = st;
      }
    }
    if (closest?.id !== this.nearbyStation?.id) {
      this.nearbyStation = closest;
      this.callbacks.onNearbyStationChange(closest);
    }
  }

  private tick = () => {
    if (this.disposed) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    const elapsed = this.clock.getElapsedTime();

    // Animate HQ Solar System Orrery gently
    if (this.hq) {
      this.hq.orreryPlanets.earth.position.set(
        Math.cos(elapsed * 0.35) * 1.15,
        0,
        Math.sin(elapsed * 0.35) * 1.15
      );
      this.hq.orreryPlanets.moon.position.set(
        this.hq.orreryPlanets.earth.position.x + Math.cos(elapsed * 1.4) * 0.32,
        0.04,
        this.hq.orreryPlanets.earth.position.z + Math.sin(elapsed * 1.4) * 0.32
      );
      this.hq.orreryPlanets.station.position.set(
        this.hq.orreryPlanets.earth.position.x,
        0.28,
        this.hq.orreryPlanets.earth.position.z
      );
      this.hq.orreryPlanets.mars.position.set(
        Math.cos(elapsed * 0.22 + 2.1) * 1.85,
        0,
        Math.sin(elapsed * 0.22 + 2.1) * 1.85
      );
      this.hq.orreryPlanets.jupiter.position.set(
        Math.cos(elapsed * 0.12 + 4.4) * 2.75,
        0,
        Math.sin(elapsed * 0.12 + 4.4) * 2.75
      );
    }

    if (this.mode === 'HQ_WALK') {
      this.updateHqWalker(dt);
    } else if (this.mode === 'DESIGN_CRAFT' && this.labCraftGroup) {
      this.labCraftGroup.rotation.y += dt * 0.22;
      this.orbitControls.update();
    } else if (this.mode === 'DESIGN_ROCKET' || this.mode === 'ORRERY') {
      this.orbitControls.update();
    } else if (this.mode === 'LAUNCH_FLIGHT') {
      this.updateFlightSimulation(dt);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (e.code === 'KeyE' && this.mode === 'HQ_WALK' && this.nearbyStation) {
      audioEngine.playUiClick();
      this.callbacks.onStationActivate(this.nearbyStation.id);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onPointerDown = (e: PointerEvent) => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    if (this.mode === 'HQ_WALK') {
      this.isDraggingLook = true;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.mode === 'HQ_WALK' && this.isDraggingLook) {
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      this.isGlidingWalk = false;
      this.playerYaw -= dx * 0.0032 * this.cameraSensitivity;
      this.playerPitch = THREE.MathUtils.clamp(
        this.playerPitch - dy * 0.0028 * this.cameraSensitivity,
        -0.9,
        0.9
      );
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    this.isDraggingLook = false;
    const moved = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (moved < 6 && this.mode === 'HQ_WALK') {
      // Raycast click on HQ station beacons
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.layers.set(1);
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      const hits = this.raycaster.intersectObjects(this.hq.root.children, true);
      if (hits.length > 0 && hits[0].object.userData.stationId) {
        audioEngine.playUiClick();
        this.callbacks.onStationActivate(hits[0].object.userData.stationId as HqStationId);
      }
    }
  };

  private onResize = () => {
    if (!this.container || this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
  };

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('webglcontextlost', this.onContextLost);
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('webglcontextlost', this.onContextLost);
    this.orbitControls.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}

export type GameMode =
  | 'HQ_WALK'
  | 'DESIGN_ROCKET'
  | 'DESIGN_CRAFT'
  | 'ORRERY'
  | 'LAUNCH_FLIGHT'
  | 'DEBRIEF';

export type HqStationId =
  | 'mission_control'
  | 'rocket_bay'
  | 'spacecraft_lab'
  | 'orrery'
  | 'launchpad_deck';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type FuelTypeId = 'kerolox' | 'hydrolox' | 'methalox' | 'solid';

export type CameraAngleId = 'pad_wide' | 'booster_cam' | 'chase_cam' | 'orbital_cam';

export type FlightPhase =
  | 'PRELAUNCH'
  | 'COUNTDOWN'
  | 'LIFTOFF'
  | 'ASCENT_STAGE1'
  | 'STAGE_SEP'
  | 'ASCENT_STAGE2'
  | 'FAIRING_SEP'
  | 'ORBIT_INSERTION'
  | 'TRANSFER_BURN'
  | 'COAST_CRUISE'
  | 'DOCKING_OP'
  | 'LANDING_DESCENT'
  | 'PAYLOAD_DEPLOY'
  | 'MISSION_COMPLETE'
  | 'MISSION_FAILED';

export interface PartBase {
  id: string;
  name: string;
  description: string;
  massKg: number;
  cost: number; // in $M
  unlockCost: number; // Research credits (0 = starter)
  tier: 1 | 2 | 3;
}

export interface StageBodyPart extends PartBase {
  stage: 1 | 2;
  diameterM: number;
  heightM: number;
  maxThrustKN: number;
  structuralRating: number; // 1.0 - 2.0
  colorHex: string;
  accentHex: string;
}

export interface EnginePart extends PartBase {
  fuelType: FuelTypeId;
  thrustKN: number;
  ispSL: number;
  ispVac: number;
  gimbalRangeDeg: number;
  nozzleScale: number;
}

export interface FuelTankPart extends PartBase {
  fuelCapacityKg: number;
  heightScale: number;
}

export interface BoosterConfigPart extends PartBase {
  count: 0 | 2 | 4;
  kind: 'none' | 'srb' | 'liquid';
  thrustPerBoosterKN: number;
  fuelMassPerBoosterKg: number;
  dryMassPerBoosterKg: number;
  isp: number;
}

export interface FairingPart extends PartBase {
  diameterM: number;
  maxPayloadKg: number;
  dragFactor: number;
}

export interface AvionicsPart extends PartBase {
  controlAuthority: number; // 0.6 - 1.5
  maxCommAssistKm: number;
  powerDrawW: number;
}

export type SpacecraftChassisId =
  | 'earth_obs_sat'
  | 'comm_sat'
  | 'research_probe'
  | 'lunar_lander'
  | 'mars_rover'
  | 'deep_space_probe';

export interface SpacecraftChassisPart extends PartBase {
  chassisId: SpacecraftChassisId;
  roleLabel: string;
  basePowerDrawW: number;
  payloadCapacityBonusKg: number;
}

export interface PowerSystemPart extends PartBase {
  kind: 'bus' | 'fuel_cell' | 'rtg';
  constantGenW: number;
  solarEfficiencyMult: number;
}

export interface SolarPanelPart extends PartBase {
  baseGenW: number;
  spanM: number;
  isDeployable: boolean;
}

export interface BatteryPart extends PartBase {
  capacityWh: number;
}

export interface AntennaPart extends PartBase {
  commRangeKm: number;
  powerDrawW: number;
  dishScale: number;
}

export interface InstrumentPart extends PartBase {
  instrumentCategory: 'imager' | 'lander_radar' | 'rover_lab' | 'docking_cargo' | 'deep_fields';
  powerDrawW: number;
}

export interface CraftPropulsionPart extends PartBase {
  thrustN: number;
  deltaVBonusMs: number;
  powerDrawW: number;
  kind: 'cold_gas' | 'hypergolic' | 'ion';
}

export interface RocketDesignConfig {
  stage1BodyId: string;
  stage1EngineId: string;
  stage1TankId: string;
  fuelTypeId: FuelTypeId;
  stage2BodyId: string;
  stage2EngineId: string;
  stage2TankId: string;
  boosterConfigId: string;
  fairingId: string;
  avionicsId: string;
}

export interface SpacecraftDesignConfig {
  chassisId: string;
  powerSystemId: string;
  solarPanelId: string;
  batteryId: string;
  antennaId: string;
  instrumentId: string;
  propulsionId: string;
}

export interface RocketPerformanceMetrics {
  stage1DryMassKg: number;
  stage1FuelMassKg: number;
  stage2DryMassKg: number;
  stage2FuelMassKg: number;
  boosterDryMassKg: number;
  boosterFuelMassKg: number;
  totalDryMassKg: number;
  totalFuelMassKg: number;
  totalRocketMassKg: number;
  spacecraftMassKg: number;
  grossLiftoffMassKg: number;
  payloadCapacityKg: number;
  liftoffThrustKN: number;
  stage2ThrustKN: number;
  liftoffTWR: number;
  effectiveIsp: number;
  stage1DeltaVMs: number;
  stage2DeltaVMs: number;
  totalDeltaVMs: number;
  estimatedMaxAltitudeKm: number;
  stabilityScore: number; // 0-100
  rocketCostM: number;
}

export interface SpacecraftPerformanceMetrics {
  totalMassKg: number;
  powerGeneratedW: number; // at target solar flux
  powerDrawW: number;
  powerMarginW: number;
  batteryCapacityWh: number;
  commRangeKm: number;
  craftDeltaVMs: number;
  spacecraftCostM: number;
}

export interface MissionConstraints {
  budgetCapM: number;
  maxPayloadKg: number;
  requiredDeltaVMs: number;
  minTWR: number;
  minPowerMarginW: number;
  minCommRangeKm: number;
  solarFluxFactor: number; // 1.0 at Earth/Moon, 0.43 at Mars, 0.04 at Jupiter
  requiredChassis: SpacecraftChassisId[];
  requiredInstrumentCategory: InstrumentPart['instrumentCategory'];
  targetDistanceKm: number;
  targetOrbitKm: number;
  requiresDocking: boolean;
  requiresLanding: boolean;
}

export interface MissionDefinition {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  destination: 'LEO' | 'Moon' | 'Mars' | 'Station' | 'Deep Space';
  difficulty: DifficultyLevel;
  summary: string;
  briefingNotes: string[];
  constraints: MissionConstraints;
  rewards: {
    credits: number;
    xp: number;
    scoreBase: number;
  };
  objectivesTemplate: {
    id: string;
    label: string;
  }[];
}

export interface RealWorldReference {
  caseName: string;
  agencyOrProgram: string;
  year: string;
  realWorldData: string;
  historicalLesson: string;
}

export interface FailureReport {
  code: string;
  title: string;
  phase: FlightPhase;
  reason: string;
  engineeringExplanation: string;
  recommendedFix: string;
  realWorldReference?: RealWorldReference;
}

export interface EngineeringCheckResult {
  isLaunchReady: boolean;
  warnings: string[];
  criticalFlaws: FailureReport[];
  totalCostM: number;
  combinedDeltaVMs: number;
}

export interface MissionScoreBreakdown {
  missionSuccess: number;
  engineeringAccuracy: number;
  fuelEfficiency: number;
  budgetManagement: number;
  payloadAccuracy: number;
  timeManagement: number;
  totalScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
}

export interface MissionHistoryEntry {
  id: string;
  missionId: string;
  missionTitle: string;
  destination: string;
  difficulty: DifficultyLevel;
  timestamp: string;
  success: boolean;
  score: MissionScoreBreakdown;
  failureReport?: FailureReport;
  rocketSummary: string;
  spacecraftSummary: string;
  costM: number;
  durationSec: number;
}

export interface FlightObjectiveState {
  id: string;
  label: string;
  completed: boolean;
  failed?: boolean;
}

export interface FlightTelemetryState {
  phase: FlightPhase;
  missionElapsedSec: number;
  countdownSec: number;
  altitudeKm: number;
  velocityMs: number;
  fuelRemainingPct: number;
  stage1FuelPct: number;
  stage2FuelPct: number;
  thrustPct: number;
  throttle: number; // 0..1
  pitchTrimDeg: number; // -20..+20
  stageIndex: 1 | 2 | 3; // 1 = boost, 2 = upper stage, 3 = spacecraft
  boostersSeparated: boolean;
  fairingJettisoned: boolean;
  spacecraftSeparated: boolean;
  orbitalStatus: string;
  spacecraftHealthPct: number;
  powerBalancePct: number;
  commSignalPct: number;
  progressPct: number; // 0..100 along mission flight
  awaitingManualAction:
    | null
    | 'STAGE_SEP'
    | 'FAIRING_SEP'
    | 'TRANSFER_BURN'
    | 'DOCKING'
    | 'LANDING'
    | 'DEPLOY';
  dockingOffsetX: number; // -1..1
  dockingOffsetY: number; // -1..1
  dockingDistanceM: number;
  landingAltitudeM: number;
  landingVerticalSpeedMs: number;
  cameraAngle: CameraAngleId;
  timeWarp: 1 | 2 | 5 | 10;
  objectives: FlightObjectiveState[];
  failureReport: FailureReport | null;
  statusMessage: string;
}

export interface GameSettings {
  masterVolume: number; // 0..1
  muted: boolean;
  graphicsQuality: 'balanced' | 'high';
  cameraSensitivity: number; // 0.5..2.0
  difficultyOverride: DifficultyLevel | 'mission_default';
}

export interface CampaignSaveState {
  researchCredits: number;
  engineeringXP: number;
  unlockedPartIds: string[];
  completedMissionIds: string[];
  missionHistory: MissionHistoryEntry[];
  rocketDesign: RocketDesignConfig;
  spacecraftDesign: SpacecraftDesignConfig;
  selectedMissionId: string;
  settings: GameSettings;
}

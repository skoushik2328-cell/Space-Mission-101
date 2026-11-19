import {
  ANTENNAS,
  AVIONICS_PARTS,
  BATTERIES,
  BOOSTER_CONFIGS,
  CRAFT_PROPULSION,
  FAIRINGS,
  FUEL_TANKS,
  FUEL_TYPE_SPECS,
  INSTRUMENTS,
  POWER_SYSTEMS,
  ROCKET_ENGINES,
  SOLAR_PANELS,
  SPACECRAFT_CHASSIS,
  STAGE1_BODIES,
  STAGE2_BODIES,
} from '../data/catalog';
import { REAL_WORLD_FAILURE_CASES } from '../data/realWorldData';
import {
  DifficultyLevel,
  EngineeringCheckResult,
  FailureReport,
  MissionDefinition,
  MissionScoreBreakdown,
  RocketDesignConfig,
  RocketPerformanceMetrics,
  SpacecraftDesignConfig,
  SpacecraftPerformanceMetrics,
} from '../types/space';

const G0 = 9.80665;

export function getDifficultyMultipliers(difficulty: DifficultyLevel) {
  switch (difficulty) {
    case 'beginner':
      return { deltaV: 0.94, budget: 1.15, comm: 0.9, power: 0.9 };
    case 'intermediate':
      return { deltaV: 1.0, budget: 1.0, comm: 1.0, power: 1.0 };
    case 'advanced':
      return { deltaV: 1.04, budget: 0.95, comm: 1.0, power: 1.05 };
    case 'expert':
      return { deltaV: 1.08, budget: 0.9, comm: 1.05, power: 1.15 };
  }
}

export function resolveRocketParts(config: RocketDesignConfig) {
  const s1Body = STAGE1_BODIES.find((p) => p.id === config.stage1BodyId) ?? STAGE1_BODIES[0];
  const s1Engine = ROCKET_ENGINES.find((p) => p.id === config.stage1EngineId) ?? ROCKET_ENGINES[0];
  const s1Tank = FUEL_TANKS.find((p) => p.id === config.stage1TankId) ?? FUEL_TANKS[0];
  const fuelSpec = FUEL_TYPE_SPECS[config.fuelTypeId] ?? FUEL_TYPE_SPECS.kerolox;
  const s2Body = STAGE2_BODIES.find((p) => p.id === config.stage2BodyId) ?? STAGE2_BODIES[0];
  const s2Engine = ROCKET_ENGINES.find((p) => p.id === config.stage2EngineId) ?? ROCKET_ENGINES[3];
  const s2Tank = FUEL_TANKS.find((p) => p.id === config.stage2TankId) ?? FUEL_TANKS[0];
  const boosters = BOOSTER_CONFIGS.find((p) => p.id === config.boosterConfigId) ?? BOOSTER_CONFIGS[0];
  const fairing = FAIRINGS.find((p) => p.id === config.fairingId) ?? FAIRINGS[1];
  const avionics = AVIONICS_PARTS.find((p) => p.id === config.avionicsId) ?? AVIONICS_PARTS[0];
  return {
    s1Body,
    s1Engine,
    s1Tank,
    fuelSpec,
    s2Body,
    s2Engine,
    s2Tank,
    boosters,
    fairing,
    avionics,
  };
}

export function resolveSpacecraftParts(config: SpacecraftDesignConfig) {
  const chassis = SPACECRAFT_CHASSIS.find((p) => p.id === config.chassisId) ?? SPACECRAFT_CHASSIS[0];
  const powerSystem = POWER_SYSTEMS.find((p) => p.id === config.powerSystemId) ?? POWER_SYSTEMS[0];
  const solarPanel = SOLAR_PANELS.find((p) => p.id === config.solarPanelId) ?? SOLAR_PANELS[0];
  const battery = BATTERIES.find((p) => p.id === config.batteryId) ?? BATTERIES[0];
  const antenna = ANTENNAS.find((p) => p.id === config.antennaId) ?? ANTENNAS[0];
  const instrument = INSTRUMENTS.find((p) => p.id === config.instrumentId) ?? INSTRUMENTS[0];
  const propulsion = CRAFT_PROPULSION.find((p) => p.id === config.propulsionId) ?? CRAFT_PROPULSION[0];
  return {
    chassis,
    powerSystem,
    solarPanel,
    battery,
    antenna,
    instrument,
    propulsion,
  };
}

export function calculateSpacecraftMetrics(
  config: SpacecraftDesignConfig,
  solarFluxFactor = 1.0
): SpacecraftPerformanceMetrics {
  const { chassis, powerSystem, solarPanel, battery, antenna, instrument, propulsion } =
    resolveSpacecraftParts(config);

  const totalMassKg =
    chassis.massKg +
    powerSystem.massKg +
    solarPanel.massKg +
    battery.massKg +
    antenna.massKg +
    instrument.massKg +
    propulsion.massKg;

  const solarGenW = solarPanel.baseGenW * solarFluxFactor * powerSystem.solarEfficiencyMult;
  const powerGeneratedW = Math.round(powerSystem.constantGenW + solarGenW);
  const powerDrawW = Math.round(
    chassis.basePowerDrawW + antenna.powerDrawW + instrument.powerDrawW + propulsion.powerDrawW
  );
  const powerMarginW = powerGeneratedW - powerDrawW;

  // Mass-adjusted spacecraft delta-v
  const massFactor = Math.max(0.55, Math.min(1.3, 1800 / Math.max(800, totalMassKg)));
  const craftDeltaVMs = Math.round(propulsion.deltaVBonusMs * massFactor);

  const spacecraftCostM =
    chassis.cost +
    powerSystem.cost +
    solarPanel.cost +
    battery.cost +
    antenna.cost +
    instrument.cost +
    propulsion.cost;

  return {
    totalMassKg,
    powerGeneratedW,
    powerDrawW,
    powerMarginW,
    batteryCapacityWh: battery.capacityWh,
    commRangeKm: antenna.commRangeKm,
    craftDeltaVMs,
    spacecraftCostM,
  };
}

export function calculateRocketMetrics(
  config: RocketDesignConfig,
  spacecraftMassKg: number
): RocketPerformanceMetrics {
  const {
    s1Body,
    s1Engine,
    s1Tank,
    fuelSpec,
    s2Body,
    s2Engine,
    s2Tank,
    boosters,
    fairing,
    avionics,
  } = resolveRocketParts(config);

  const stage1DryMassKg = s1Body.massKg + s1Engine.massKg + s1Tank.massKg;
  const stage1FuelMassKg = Math.round(s1Tank.fuelCapacityKg * 1.45 * fuelSpec.densityMultiplier);

  const stage2DryMassKg = s2Body.massKg + s2Engine.massKg + Math.round(s2Tank.massKg * 0.55);
  const stage2FuelMassKg = Math.round(s2Tank.fuelCapacityKg * 0.52 * fuelSpec.densityMultiplier);

  const boosterDryMassKg = boosters.count * boosters.dryMassPerBoosterKg;
  const boosterFuelMassKg = boosters.count * boosters.fuelMassPerBoosterKg;

  const upperFairingAndAvionicsKg = fairing.massKg + avionics.massKg;
  const totalDryMassKg =
    stage1DryMassKg + stage2DryMassKg + boosterDryMassKg + upperFairingAndAvionicsKg;
  const totalFuelMassKg = stage1FuelMassKg + stage2FuelMassKg + boosterFuelMassKg;
  const totalRocketMassKg = totalDryMassKg + totalFuelMassKg;
  const grossLiftoffMassKg = totalRocketMassKg + spacecraftMassKg;

  const coreThrustKN = s1Engine.thrustKN;
  const boosterThrustKN = boosters.count * boosters.thrustPerBoosterKN;
  const liftoffThrustKN = coreThrustKN + boosterThrustKN;
  const stage2ThrustKN = s2Engine.thrustKN;

  const liftoffWeightKN = (grossLiftoffMassKg * G0) / 1000;
  const liftoffTWR = Number((liftoffThrustKN / Math.max(1, liftoffWeightKN)).toFixed(2));

  // Effective Isp weighted by fuel & engine
  const s1Isp = Math.round(s1Engine.ispSL * 0.35 + s1Engine.ispVac * 0.65) * fuelSpec.ispMultiplier;
  const s2Isp = s2Engine.ispVac * (s2Engine.fuelType === 'hydrolox' ? 1.05 : fuelSpec.ispMultiplier * 0.95);
  const boosterIsp = boosters.count > 0 ? boosters.isp : s1Isp;
  const effectiveIsp = Math.round((s1Isp * 0.5 + s2Isp * 0.35 + boosterIsp * 0.15));

  // Stage 1 + Booster Tsiolkovsky Delta-V (first burn until booster/S1 burnout)
  const m0Stage1 = grossLiftoffMassKg;
  const mfStage1 =
    stage1DryMassKg +
    boosterDryMassKg +
    stage2DryMassKg +
    stage2FuelMassKg +
    upperFairingAndAvionicsKg +
    spacecraftMassKg;
  const combinedS1Isp =
    boosters.count > 0 ? s1Isp * 0.62 + boosterIsp * 0.38 : s1Isp;
  const stage1DeltaVMs = Math.round(combinedS1Isp * G0 * Math.log(Math.max(1.01, m0Stage1 / mfStage1)));

  // Stage 2 Tsiolkovsky Delta-V (after S1 & boosters drop, fairing drops mid-burn)
  const m0Stage2 = stage2DryMassKg + stage2FuelMassKg + avionics.massKg + spacecraftMassKg + fairing.massKg * 0.4;
  const mfStage2 = stage2DryMassKg + avionics.massKg + spacecraftMassKg;
  const stage2DeltaVMs = Math.round(s2Isp * G0 * Math.log(Math.max(1.01, m0Stage2 / mfStage2)));

  const totalDeltaVMs = stage1DeltaVMs + stage2DeltaVMs;

  // Payload capacity estimate based on thrust, structural rating, and fairing
  const thrustCapacityKg = Math.max(0, (liftoffThrustKN / (1.2 * G0)) * 1000 - totalRocketMassKg);
  const payloadCapacityKg = Math.round(
    Math.min(fairing.maxPayloadKg, Math.max(1200, thrustCapacityKg * 0.45 + s1Body.structuralRating * 2200))
  );

  // Max altitude heuristic from delta-v & TWR
  const twrPenalty = liftoffTWR < 1.05 ? 0.05 : liftoffTWR < 1.2 ? 0.65 : 1.0;
  const estimatedMaxAltitudeKm =
    totalDeltaVMs < 4000
      ? Math.round((totalDeltaVMs / 4000) * 140 * twrPenalty)
      : Math.round((180 + Math.pow((totalDeltaVMs - 4000) / 1000, 2.35) * 280) * twrPenalty);

  // Stability score (0-100): avionics control authority vs fairing drag & booster load
  const dragPenalty = fairing.dragFactor * 12 + (boosters.count === 4 ? 8 : 0);
  const structBonus = s1Body.structuralRating * 18;
  const stabilityRaw = avionics.controlAuthority * 68 + structBonus - dragPenalty;
  const stabilityScore = Math.round(Math.max(15, Math.min(100, stabilityRaw)));

  const rocketCostM = Math.round(
    s1Body.cost +
      s1Engine.cost +
      s1Tank.cost * fuelSpec.costMultiplier +
      s2Body.cost +
      s2Engine.cost +
      s2Tank.cost * 0.7 +
      boosters.cost +
      fairing.cost +
      avionics.cost
  );

  return {
    stage1DryMassKg,
    stage1FuelMassKg,
    stage2DryMassKg,
    stage2FuelMassKg,
    boosterDryMassKg,
    boosterFuelMassKg,
    totalDryMassKg,
    totalFuelMassKg,
    totalRocketMassKg,
    spacecraftMassKg,
    grossLiftoffMassKg,
    payloadCapacityKg,
    liftoffThrustKN,
    stage2ThrustKN,
    liftoffTWR,
    effectiveIsp,
    stage1DeltaVMs,
    stage2DeltaVMs,
    totalDeltaVMs,
    estimatedMaxAltitudeKm,
    stabilityScore,
    rocketCostM,
  };
}

export function evaluateEngineeringReadiness(
  mission: MissionDefinition,
  rocketConfig: RocketDesignConfig,
  spacecraftConfig: SpacecraftDesignConfig,
  effectiveDifficulty: DifficultyLevel
): EngineeringCheckResult {
  const mult = getDifficultyMultipliers(effectiveDifficulty);
  const craftMetrics = calculateSpacecraftMetrics(
    spacecraftConfig,
    mission.constraints.solarFluxFactor
  );
  const rocketMetrics = calculateRocketMetrics(rocketConfig, craftMetrics.totalMassKg);
  const { chassis, instrument } = resolveSpacecraftParts(spacecraftConfig);
  const { fairing, avionics } = resolveRocketParts(rocketConfig);

  const criticalFlaws: FailureReport[] = [];
  const warnings: string[] = [];

  const totalCostM = rocketMetrics.rocketCostM + craftMetrics.spacecraftCostM;
  const budgetCapM = Math.round(mission.constraints.budgetCapM * mult.budget);
  const reqDeltaV = Math.round(mission.constraints.requiredDeltaVMs * mult.deltaV);
  const combinedDeltaVMs = rocketMetrics.totalDeltaVMs + craftMetrics.craftDeltaVMs;
  const minCommKm = Math.round(mission.constraints.minCommRangeKm * mult.comm);
  const minPowerW = Math.round(mission.constraints.minPowerMarginW * mult.power);

  if (totalCostM > budgetCapM) {
    warnings.push(`Vehicle cost ($${totalCostM}M) exceeds mission budget cap ($${budgetCapM}M).`);
  }

  if (rocketMetrics.liftoffTWR < 1.02) {
    criticalFlaws.push({
      code: 'INSUFFICIENT_THRUST',
      title: 'Insufficient Liftoff Thrust (TWR < 1.02)',
      phase: 'LIFTOFF',
      reason: `Liftoff Thrust-to-Weight Ratio is ${rocketMetrics.liftoffTWR}, below the 1.02 minimum required to overcome Earth gravity.`,
      engineeringExplanation:
        'A rocket can only rise off the pad if total engine thrust exceeds total vehicle weight (TWR > 1.0). With TWR below 1.02, gravity pins the vehicle to the launch clamps.',
      recommendedFix:
        'Install a higher-thrust Stage 1 engine, add side Solid/Liquid Boosters, or reduce tank/payload mass.',
      realWorldReference: REAL_WORLD_FAILURE_CASES.INSUFFICIENT_THRUST,
    });
  } else if (rocketMetrics.liftoffTWR < mission.constraints.minTWR) {
    warnings.push(
      `Low Liftoff TWR (${rocketMetrics.liftoffTWR}). Target ${mission.constraints.minTWR}+ to prevent heavy gravity losses.`
    );
  }

  if (craftMetrics.totalMassKg > fairing.maxPayloadKg) {
    criticalFlaws.push({
      code: 'PAYLOAD_OVERWEIGHT',
      title: 'Payload Exceeds Fairing Structural Limit',
      phase: 'ASCENT_STAGE1',
      reason: `Spacecraft mass (${craftMetrics.totalMassKg.toLocaleString()} kg) exceeds ${fairing.name} limit (${fairing.maxPayloadKg.toLocaleString()} kg).`,
      engineeringExplanation:
        'Dynamic pressure (Max-Q) during supersonic ascent crushes or rips open an undersized payload fairing when overloaded.',
      recommendedFix:
        'Switch to a larger Payload Fairing or reduce spacecraft mass in the Spacecraft Lab.',
      realWorldReference: REAL_WORLD_FAILURE_CASES.PAYLOAD_OVERWEIGHT,
    });
  }

  if (rocketMetrics.stabilityScore < 48) {
    criticalFlaws.push({
      code: 'UNSTABLE_CONFIG',
      title: 'Aerodynamic & Guidance Instability',
      phase: 'ASCENT_STAGE1',
      reason: `Rocket Stability Index is ${rocketMetrics.stabilityScore}/100, causing uncontrollable pitch divergence at Max-Q.`,
      engineeringExplanation:
        'Large fairings and quad boosters generate high aerodynamic torque. Basic inertial gyros lack the gimbal authority to keep the nose aligned with the velocity vector.',
      recommendedFix:
        'Upgrade Navigation & Control Systems to Star-Tracker or Deep-Space GNC, or use a stronger Stage 1 core.',
      realWorldReference: REAL_WORLD_FAILURE_CASES.UNSTABLE_CONFIG,
    });
  }

  if (combinedDeltaVMs < reqDeltaV) {
    criticalFlaws.push({
      code: 'INSUFFICIENT_DELTAV',
      title: 'Inadequate Propellant / Delta-V Budget',
      phase: combinedDeltaVMs < 8800 ? 'ASCENT_STAGE2' : 'ORBIT_INSERTION',
      reason: `Combined vehicle Δv (${combinedDeltaVMs.toLocaleString()} m/s) falls short of the ${reqDeltaV.toLocaleString()} m/s required for ${mission.destination}.`,
      engineeringExplanation:
        'Per the Tsiolkovsky rocket equation (Δv = g₀ · Isp · ln(m₀/mf)), propellant exhaustion occurs before achieving target orbital velocity or transfer injection.',
      recommendedFix:
        'Use Hydrolox or Methalox fuel for higher Isp, stretch fuel tanks, add side boosters, or equip a Hypergolic/Ion spacecraft thruster.',
      realWorldReference: REAL_WORLD_FAILURE_CASES.INSUFFICIENT_DELTAV,
    });
  }

  if (craftMetrics.powerMarginW < minPowerW) {
    criticalFlaws.push({
      code: 'POWER_FAILURE',
      title: 'Spacecraft Electrical Brownout',
      phase: 'COAST_CRUISE',
      reason: `Power margin is ${craftMetrics.powerMarginW} W at ${Math.round(
        mission.constraints.solarFluxFactor * 100
      )}% solar flux (minimum +${minPowerW} W required).`,
      engineeringExplanation:
        'Solar irradiance follows the inverse-square law (1/r²). At Mars (43%) or Jupiter (4%), undersized solar arrays cannot sustain avionics, heaters, and high-gain transmitters.',
      recommendedFix:
        'Install Triple High-Flux Solar Wings, Cryo Fuel Cells, or a Multi-Mission RTG Nuclear power system.',
      realWorldReference: REAL_WORLD_FAILURE_CASES.POWER_FAILURE,
    });
  }

  const effectiveCommKm = Math.max(craftMetrics.commRangeKm, avionics.maxCommAssistKm * 0.05);
  if (effectiveCommKm < minCommKm) {
    criticalFlaws.push({
      code: 'COMM_BLACKOUT',
      title: 'Deep-Space Telemetry Link Loss',
      phase: 'TRANSFER_BURN',
      reason: `Antenna link range (${craftMetrics.commRangeKm.toLocaleString()} km) cannot reach ${mission.destination} (${minCommKm.toLocaleString()} km required).`,
      engineeringExplanation:
        'Signal strength weakens quadratically with distance. Without sufficient antenna aperture and transmit gain, Mission Control loses command uplink during transfer maneuvers.',
      recommendedFix:
        'Upgrade the spacecraft antenna to a High-Gain Parabolic Dish or Deep-Space Ka-Band Array.',
      realWorldReference: REAL_WORLD_FAILURE_CASES.COMM_BLACKOUT,
    });
  }

  if (!mission.constraints.requiredChassis.includes(chassis.chassisId)) {
    criticalFlaws.push({
      code: 'WRONG_SPACECRAFT',
      title: 'Incompatible Spacecraft Architecture',
      phase: 'PAYLOAD_DEPLOY',
      reason: `${chassis.name} is not designed for ${mission.title} (${mission.destination}).`,
      engineeringExplanation:
        'Surface landings require crushable landing legs or aeroshell rovers, while station resupply requires a pressurized docking hull.',
      recommendedFix: `Select an appropriate spacecraft chassis in the Spacecraft Designer (${mission.constraints.requiredChassis.join(
        ' or '
      )}).`,
      realWorldReference: REAL_WORLD_FAILURE_CASES.WRONG_SPACECRAFT,
    });
  }

  if (instrument.instrumentCategory !== mission.constraints.requiredInstrumentCategory) {
    criticalFlaws.push({
      code: 'MISSING_INSTRUMENT',
      title: 'Required Mission Instrument Missing',
      phase: 'PAYLOAD_DEPLOY',
      reason: `Equipped ${instrument.name}, which cannot perform the primary ${mission.destination} mission objective.`,
      engineeringExplanation:
        'Mission payload verification requires dedicated scientific or docking hardware tuned to the target environment.',
      recommendedFix: `Install the mission-specific scientific/docking instrument in the Spacecraft Designer.`,
      realWorldReference: REAL_WORLD_FAILURE_CASES.MISSING_INSTRUMENT,
    });
  }

  return {
    isLaunchReady: criticalFlaws.length === 0,
    warnings,
    criticalFlaws,
    totalCostM,
    combinedDeltaVMs,
  };
}

export function computeMissionScore(
  mission: MissionDefinition,
  success: boolean,
  totalCostM: number,
  combinedDeltaVMs: number,
  fuelRemainingPct: number,
  powerMarginW: number,
  durationSec: number,
  accuracyBonus: number // 0..100 from docking/landing/pitch
): MissionScoreBreakdown {
  if (!success) {
    return {
      missionSuccess: 0,
      engineeringAccuracy: 30,
      fuelEfficiency: Math.round(fuelRemainingPct * 0.4),
      budgetManagement: totalCostM <= mission.constraints.budgetCapM ? 65 : 25,
      payloadAccuracy: 0,
      timeManagement: 20,
      totalScore: 140,
      grade: 'F',
    };
  }

  const missionSuccess = 100;
  const deltaVOver = Math.max(0, combinedDeltaVMs - mission.constraints.requiredDeltaVMs);
  const engineeringAccuracy = Math.round(
    Math.min(100, 75 + (powerMarginW > 120 ? 15 : 8) + (deltaVOver < 2500 ? 10 : 4))
  );
  const fuelEfficiency = Math.round(Math.max(40, Math.min(100, 55 + fuelRemainingPct * 1.4)));
  const budgetRatio = totalCostM / Math.max(1, mission.constraints.budgetCapM);
  const budgetManagement = Math.round(
    budgetRatio <= 1 ? Math.min(100, 75 + (1 - budgetRatio) * 60) : Math.max(25, 70 - (budgetRatio - 1) * 90)
  );
  const payloadAccuracy = Math.round(Math.max(60, Math.min(100, accuracyBonus)));
  const timeManagement = Math.round(Math.max(65, Math.min(100, 100 - Math.max(0, durationSec - 90) * 0.25)));

  const weighted =
    (missionSuccess * 0.3 +
      engineeringAccuracy * 0.18 +
      fuelEfficiency * 0.14 +
      budgetManagement * 0.14 +
      payloadAccuracy * 0.14 +
      timeManagement * 0.1) /
    100;

  const totalScore = Math.round(mission.rewards.scoreBase * weighted);
  const avg =
    (missionSuccess +
      engineeringAccuracy +
      fuelEfficiency +
      budgetManagement +
      payloadAccuracy +
      timeManagement) /
    6;
  const grade = avg >= 92 ? 'S' : avg >= 84 ? 'A' : avg >= 72 ? 'B' : 'C';

  return {
    missionSuccess,
    engineeringAccuracy,
    fuelEfficiency,
    budgetManagement,
    payloadAccuracy,
    timeManagement,
    totalScore,
    grade,
  };
}

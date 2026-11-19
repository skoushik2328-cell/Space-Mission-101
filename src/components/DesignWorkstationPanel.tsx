import { useState } from 'react';
import {
  Cpu,
  Flame,
  Lock,
  Rocket,
  SlidersHorizontal,
} from 'lucide-react';
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
import { audioEngine } from '../engine/audioEngine';
import {
  calculateRocketMetrics,
  calculateSpacecraftMetrics,
} from '../engine/engineeringMath';
import {
  DifficultyLevel,
  FuelTypeId,
  GameMode,
  MissionDefinition,
  PartBase,
  RocketDesignConfig,
  SpacecraftDesignConfig,
} from '../types/space';

interface DesignWorkstationPanelProps {
  mode: GameMode;
  mission: MissionDefinition;
  effectiveDifficulty: DifficultyLevel;
  rocketDesign: RocketDesignConfig;
  spacecraftDesign: SpacecraftDesignConfig;
  unlockedPartIds: string[];
  explodedView: number;
  onExplodedViewChange: (val: number) => void;
  onUpdateRocket: (patch: Partial<RocketDesignConfig>) => void;
  onUpdateSpacecraft: (patch: Partial<SpacecraftDesignConfig>) => void;
  onSwitchMode: (mode: 'DESIGN_ROCKET' | 'DESIGN_CRAFT') => void;
  onOpenResearch: () => void;
  onLaunchMission: () => void;
}

type RocketTab = 'stage1' | 'stage2' | 'boosters' | 'fairing';
type CraftTab = 'chassis' | 'power' | 'comms' | 'payload';

export function DesignWorkstationPanel({
  mode,
  mission,
  rocketDesign,
  spacecraftDesign,
  unlockedPartIds,
  explodedView,
  onExplodedViewChange,
  onUpdateRocket,
  onUpdateSpacecraft,
  onSwitchMode,
  onOpenResearch,
  onLaunchMission,
}: DesignWorkstationPanelProps) {
  const [rocketTab, setRocketTab] = useState<RocketTab>('stage1');
  const [craftTab, setCraftTab] = useState<CraftTab>('chassis');

  const craftMetrics = calculateSpacecraftMetrics(
    spacecraftDesign,
    mission.constraints.solarFluxFactor
  );
  const rocketMetrics = calculateRocketMetrics(rocketDesign, craftMetrics.totalMassKg);
  const totalCostM = rocketMetrics.rocketCostM + craftMetrics.spacecraftCostM;
  const combinedDeltaVMs = rocketMetrics.totalDeltaVMs + craftMetrics.craftDeltaVMs;

  const renderPartGrid = <T extends PartBase>(
    parts: T[],
    selectedId: string,
    onSelect: (id: string) => void,
    statFn: (p: T) => string
  ) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
      {parts.map((part) => {
        const unlocked = unlockedPartIds.includes(part.id);
        const active = selectedId === part.id;
        return (
          <button
            key={part.id}
            onClick={() => {
              if (!unlocked) {
                audioEngine.playUiClick();
                onOpenResearch();
                return;
              }
              audioEngine.playAttachPart();
              onSelect(part.id);
            }}
            className={`text-left p-2.5 rounded border transition-colors cursor-pointer ${
              active
                ? 'bg-blue-950/65 border-blue-500 text-white'
                : unlocked
                  ? 'bg-[#121a2a] border-[#223047] text-slate-200 hover:border-slate-500'
                  : 'bg-[#0e131d] border-[#1c2433] text-slate-400 hover:border-amber-600/60'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-xs font-medium truncate">{part.name}</span>
              {!unlocked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
            </div>
            <div className="text-xs font-mono-tabular text-cyan-300 mt-0.5 truncate">
              {statFn(part)}
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5 truncate">
              {unlocked ? `${part.massKg.toLocaleString()} kg · $${part.cost}M` : `Unlock: ${part.unlockCost} CR`}
            </div>
          </button>
        );
      })}
    </div>
  );

  const isRocketMode = mode === 'DESIGN_ROCKET';

  return (
    <div className="p-3.5 flex flex-col gap-3">
      {/* Top Row: Switcher + Objective Telemetry Strip (no pre-launch recommendations) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-[#1e293b]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              audioEngine.playUiClick();
              onSwitchMode('DESIGN_ROCKET');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
              isRocketMode
                ? 'bg-blue-600 text-white'
                : 'bg-[#141d2e] text-slate-200 hover:text-white border border-[#243249]'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Rocket Designer</span>
          </button>
          <button
            onClick={() => {
              audioEngine.playUiClick();
              onSwitchMode('DESIGN_CRAFT');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors ${
              !isRocketMode
                ? 'bg-blue-600 text-white'
                : 'bg-[#141d2e] text-slate-200 hover:text-white border border-[#243249]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Spacecraft Designer</span>
          </button>

          {isRocketMode && (
            <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-[#243249]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-xs text-slate-300">Cutaway</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={explodedView}
                onChange={(e) => onExplodedViewChange(parseFloat(e.target.value))}
                className="w-20 accent-cyan-500 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Live Objective Telemetry Metrics */}
        {isRocketMode ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono-tabular">
            <span>
              <span className="text-slate-400">Mass </span>
              <span className="text-slate-100">
                {(rocketMetrics.grossLiftoffMassKg / 1000).toFixed(1)}t
              </span>
            </span>
            <span>
              <span className="text-slate-400">Fuel </span>
              <span className="text-slate-200">
                {(rocketMetrics.totalFuelMassKg / 1000).toFixed(1)}t
              </span>
            </span>
            <span>
              <span className="text-slate-400">Thrust </span>
              <span className="text-slate-200">
                {rocketMetrics.liftoffThrustKN.toLocaleString()} kN
              </span>
            </span>
            <span>
              <span className="text-slate-400">TWR </span>
              <span className="text-slate-100">
                {rocketMetrics.liftoffTWR.toFixed(2)}
              </span>
            </span>
            <span>
              <span className="text-slate-400">Isp </span>
              <span className="text-slate-200">{rocketMetrics.effectiveIsp}s</span>
            </span>
            <span>
              <span className="text-slate-400">Δv </span>
              <span className="text-cyan-300">
                {combinedDeltaVMs.toLocaleString()} m/s
              </span>
            </span>
            <span>
              <span className="text-slate-400">Est. Alt </span>
              <span className="text-slate-200">
                {rocketMetrics.estimatedMaxAltitudeKm.toLocaleString()} km
              </span>
            </span>
            <span>
              <span className="text-slate-400">Cost </span>
              <span className="text-slate-100">
                ${totalCostM}M
              </span>
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono-tabular">
            <span>
              <span className="text-slate-400">Mass </span>
              <span className="text-slate-100">
                {craftMetrics.totalMassKg.toLocaleString()} kg
              </span>
            </span>
            <span>
              <span className="text-slate-400">Power </span>
              <span className="text-slate-100">
                {craftMetrics.powerMarginW >= 0 ? '+' : ''}
                {craftMetrics.powerMarginW}W
              </span>
            </span>
            <span>
              <span className="text-slate-400">Battery </span>
              <span className="text-slate-200">
                {(craftMetrics.batteryCapacityWh / 1000).toFixed(0)} kWh
              </span>
            </span>
            <span>
              <span className="text-slate-400">Comm </span>
              <span className="text-cyan-300">
                {craftMetrics.commRangeKm >= 1000000
                  ? `${(craftMetrics.commRangeKm / 1000000).toFixed(0)}M km`
                  : `${craftMetrics.commRangeKm.toLocaleString()} km`}
              </span>
            </span>
            <span>
              <span className="text-slate-400">Craft Δv </span>
              <span className="text-cyan-300">
                +{craftMetrics.craftDeltaVMs} m/s
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Category Sub-Tabs & Launch Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {isRocketMode ? (
            <>
              {(
                [
                  ['stage1', 'Stage 1 & Fuel'],
                  ['stage2', 'Stage 2 Upper'],
                  ['boosters', 'Boosters'],
                  ['fairing', 'Fairing & Guidance'],
                ] as [RocketTab, string][]
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setRocketTab(tab)}
                  className={`px-2.5 py-1 rounded text-xs font-normal cursor-pointer transition-colors ${
                    rocketTab === tab
                      ? 'bg-[#1e293b] text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </>
          ) : (
            <>
              {(
                [
                  ['chassis', 'Spacecraft Type'],
                  ['power', 'Power & Solar'],
                  ['comms', 'Comms & Propulsion'],
                  ['payload', 'Science Instruments'],
                ] as [CraftTab, string][]
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setCraftTab(tab)}
                  className={`px-2.5 py-1 rounded text-xs font-normal cursor-pointer transition-colors ${
                    craftTab === tab
                      ? 'bg-[#1e293b] text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300">
            Mission 0{mission.number} · {mission.destination}
          </span>

          <button
            onClick={onLaunchMission}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-medium tracking-wide whitespace-nowrap cursor-pointer transition-colors"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Launch Rocket</span>
          </button>
        </div>
      </div>

      {/* Component Selector Content */}
      <div className="max-h-44 overflow-y-auto pr-1 space-y-2.5">
        {isRocketMode ? (
          <>
            {rocketTab === 'stage1' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-300">First-Stage Body</div>
                {renderPartGrid(
                  STAGE1_BODIES,
                  rocketDesign.stage1BodyId,
                  (id) => onUpdateRocket({ stage1BodyId: id }),
                  (p) => `${p.diameterM}m core · ${p.heightM}m`
                )}
                <div className="text-xs text-slate-300 pt-1">Stage 1 Engine</div>
                {renderPartGrid(
                  ROCKET_ENGINES,
                  rocketDesign.stage1EngineId,
                  (id) => onUpdateRocket({ stage1EngineId: id }),
                  (p) => `${p.thrustKN.toLocaleString()} kN · Isp ${p.ispVac}s`
                )}
                <div className="text-xs text-slate-300 pt-1">Propellant Fuel Type & Main Tank</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(FUEL_TYPE_SPECS) as FuelTypeId[]).map((fid) => {
                    const spec = FUEL_TYPE_SPECS[fid];
                    const active = rocketDesign.fuelTypeId === fid;
                    return (
                      <button
                        key={fid}
                        onClick={() => {
                          audioEngine.playAttachPart();
                          onUpdateRocket({ fuelTypeId: fid });
                        }}
                        className={`text-left p-2 rounded border cursor-pointer transition-colors ${
                          active
                            ? 'bg-blue-950/65 border-blue-500 text-white'
                            : 'bg-[#121a2a] border-[#223047] text-slate-200 hover:border-slate-500'
                        }`}
                      >
                        <div className="text-xs font-medium truncate">{spec.name}</div>
                        <div className="text-[11px] font-mono-tabular text-cyan-300">
                          Isp ×{spec.ispMultiplier} · Cost ×{spec.costMultiplier}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {renderPartGrid(
                  FUEL_TANKS,
                  rocketDesign.stage1TankId,
                  (id) => onUpdateRocket({ stage1TankId: id }),
                  (p) => `${(p.fuelCapacityKg / 1000).toFixed(0)}t base capacity`
                )}
              </div>
            )}

            {rocketTab === 'stage2' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-300">Second-Stage Hull</div>
                {renderPartGrid(
                  STAGE2_BODIES,
                  rocketDesign.stage2BodyId,
                  (id) => onUpdateRocket({ stage2BodyId: id }),
                  (p) => `${p.diameterM}m upper · ${p.heightM}m`
                )}
                <div className="text-xs text-slate-300 pt-1">Upper-Stage Vacuum Engine</div>
                {renderPartGrid(
                  ROCKET_ENGINES,
                  rocketDesign.stage2EngineId,
                  (id) => onUpdateRocket({ stage2EngineId: id }),
                  (p) => `${p.thrustKN} kN · Vac Isp ${p.ispVac}s`
                )}
                <div className="text-xs text-slate-300 pt-1">Stage 2 Tank</div>
                {renderPartGrid(
                  FUEL_TANKS,
                  rocketDesign.stage2TankId,
                  (id) => onUpdateRocket({ stage2TankId: id }),
                  (p) => `${Math.round((p.fuelCapacityKg * 0.52) / 1000)}t upper fuel`
                )}
              </div>
            )}

            {rocketTab === 'boosters' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-300">Side Booster Configuration</div>
                {renderPartGrid(
                  BOOSTER_CONFIGS,
                  rocketDesign.boosterConfigId,
                  (id) => onUpdateRocket({ boosterConfigId: id }),
                  (p) =>
                    p.count === 0
                      ? 'No strap-on boosters'
                      : `+${(p.count * p.thrustPerBoosterKN).toLocaleString()} kN · Isp ${p.isp}s`
                )}
              </div>
            )}

            {rocketTab === 'fairing' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-300">Payload Fairing</div>
                {renderPartGrid(
                  FAIRINGS,
                  rocketDesign.fairingId,
                  (id) => onUpdateRocket({ fairingId: id }),
                  (p) => `Max Payload ${p.maxPayloadKg.toLocaleString()} kg`
                )}
                <div className="text-xs text-slate-300 pt-1">Navigation & Control Systems</div>
                {renderPartGrid(
                  AVIONICS_PARTS,
                  rocketDesign.avionicsId,
                  (id) => onUpdateRocket({ avionicsId: id }),
                  (p) => `Authority ${Math.round(p.controlAuthority * 100)}%`
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {craftTab === 'chassis' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-300">Spacecraft Platform</div>
                {renderPartGrid(
                  SPACECRAFT_CHASSIS,
                  spacecraftDesign.chassisId,
                  (id) => onUpdateSpacecraft({ chassisId: id }),
                  (p) => p.roleLabel
                )}
              </div>
            )}

            {craftTab === 'power' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-300">Power Generation System</div>
                {renderPartGrid(
                  POWER_SYSTEMS,
                  spacecraftDesign.powerSystemId,
                  (id) => onUpdateSpacecraft({ powerSystemId: id }),
                  (p) => (p.constantGenW > 0 ? `+${p.constantGenW}W Constant` : 'Solar Dependent')
                )}
                <div className="text-xs text-slate-300 pt-1">Solar Arrays</div>
                {renderPartGrid(
                  SOLAR_PANELS,
                  spacecraftDesign.solarPanelId,
                  (id) => onUpdateSpacecraft({ solarPanelId: id }),
                  (p) => `${p.baseGenW}W @ 1 AU · ${p.spanM}m span`
                )}
                <div className="text-xs text-slate-300 pt-1">Battery Bank</div>
                {renderPartGrid(
                  BATTERIES,
                  spacecraftDesign.batteryId,
                  (id) => onUpdateSpacecraft({ batteryId: id }),
                  (p) => `${(p.capacityWh / 1000).toFixed(0)} kWh Reserve`
                )}
              </div>
            )}

            {craftTab === 'comms' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-300">Communication Antenna</div>
                {renderPartGrid(
                  ANTENNAS,
                  spacecraftDesign.antennaId,
                  (id) => onUpdateSpacecraft({ antennaId: id }),
                  (p) => `Range ${p.commRangeKm.toLocaleString()} km`
                )}
                <div className="text-xs text-slate-300 pt-1">Spacecraft Orbital Propulsion</div>
                {renderPartGrid(
                  CRAFT_PROPULSION,
                  spacecraftDesign.propulsionId,
                  (id) => onUpdateSpacecraft({ propulsionId: id }),
                  (p) => `+${p.deltaVBonusMs} m/s Δv · ${p.powerDrawW}W`
                )}
              </div>
            )}

            {craftTab === 'payload' && (
              <div className="space-y-2">
                <div className="text-xs text-slate-300">Scientific & Mission Instruments</div>
                {renderPartGrid(
                  INSTRUMENTS,
                  spacecraftDesign.instrumentId,
                  (id) => onUpdateSpacecraft({ instrumentId: id }),
                  (p) => `${p.powerDrawW}W draw · ${p.instrumentCategory}`
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

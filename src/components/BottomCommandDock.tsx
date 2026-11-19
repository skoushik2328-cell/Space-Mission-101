import {
  ChevronDown,
  ChevronUp,
  Compass,
  Cpu,
  Flame,
  Monitor,
  Rocket,
} from 'lucide-react';
import { HqInteractiveStation } from '../three/hqBuilder';
import { GameMode, HqStationId, MissionDefinition } from '../types/space';

interface BottomCommandDockProps {
  mode: GameMode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  nearbyStation: HqInteractiveStation | null;
  activeMission: MissionDefinition;
  onQuickTravel: (stationId: HqStationId) => void;
  onActivateStation: (stationId: HqStationId) => void;
  onLaunchMission: () => void;
  onSelectOrreryMission: (missionId: string) => void;
  missions: MissionDefinition[];
  children?: React.ReactNode;
}

const QUICK_STATIONS: {
  id: HqStationId;
  label: string;
  icon: typeof Monitor;
}[] = [
  { id: 'mission_control', label: 'Mission Control', icon: Monitor },
  { id: 'rocket_bay', label: 'Rocket Designer', icon: Rocket },
  { id: 'spacecraft_lab', label: 'Spacecraft Lab', icon: Cpu },
  { id: 'orrery', label: 'Solar Orrery', icon: Compass },
  { id: 'launchpad_deck', label: 'Launchpad', icon: Flame },
];

export function BottomCommandDock({
  mode,
  collapsed,
  onToggleCollapse,
  nearbyStation,
  activeMission,
  onQuickTravel,
  onActivateStation,
  onLaunchMission,
  onSelectOrreryMission,
  missions,
  children,
}: BottomCommandDockProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(1040px,95vw)] flex flex-col items-center pointer-events-none">
      {/* Contextual HQ Nearby Station Interaction Banner */}
      {mode === 'HQ_WALK' && nearbyStation && (
        <div className="mb-2.5 pointer-events-auto bg-[#0f1623]/95 border border-cyan-500/60 px-4 py-2 rounded-md flex items-center gap-4 shadow-lg">
          <div className="text-xs">
            <div className="text-white font-semibold">{nearbyStation.label}</div>
            <div className="text-slate-400">{nearbyStation.subtitle}</div>
          </div>
          <button
            onClick={() => onActivateStation(nearbyStation.id)}
            className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
          >
            Open Station [E]
          </button>
        </div>
      )}

      {/* Collapse / Expand Toggle Handle */}
      <button
        onClick={onToggleCollapse}
        className="pointer-events-auto mb-1 px-3 py-1 rounded-t border border-b-0 border-[#243249] bg-[#0e1522]/95 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
        title="Toggle Command HUD (H)"
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Show Controls [H]</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Hide Controls [H]</span>
          </>
        )}
      </button>

      {/* Main Dock Container */}
      <div
        className={`w-full pointer-events-auto bg-[#0d131f]/95 border border-[#243249] rounded-lg shadow-2xl transition-transform duration-200 ${
          collapsed ? 'translate-y-[120%] opacity-0 pointer-events-none h-0 overflow-hidden' : 'translate-y-0 opacity-100'
        }`}
      >
        {mode === 'HQ_WALK' && (
          <div className="p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_STATIONS.map((st) => {
                const Icon = st.icon;
                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      onQuickTravel(st.id);
                      if (st.id === 'rocket_bay' || st.id === 'spacecraft_lab' || st.id === 'orrery') {
                        onActivateStation(st.id);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#141d2e] hover:bg-[#1c2940] border border-[#25334a] text-slate-200 hover:text-white text-xs font-normal transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5 text-cyan-300" />
                    <span>{st.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-xs text-slate-300">
                WASD walk · Drag look · Press E at station
              </span>
              <button
                onClick={onLaunchMission}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-medium tracking-wide whitespace-nowrap cursor-pointer transition-colors"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Missions & Launch</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'ORRERY' && (
          <div className="p-3 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-200">
                <span className="font-medium text-white">3D Solar System Trajectory Explorer</span>
                <span className="mx-2 text-slate-500">·</span>
                <span className="text-slate-300">Drag to orbit · Scroll to zoom</span>
              </div>
              <div className="text-xs font-mono-tabular text-cyan-300">
                Target: {activeMission.destination} ({activeMission.constraints.targetDistanceKm.toLocaleString()} km · Flux {Math.round(activeMission.constraints.solarFluxFactor * 100)}%)
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {missions.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSelectOrreryMission(m.id)}
                    className={`px-3 py-1.5 rounded text-xs font-normal border transition-colors whitespace-nowrap cursor-pointer ${
                      activeMission.id === m.id
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-[#141d2e] border-[#25334a] text-slate-200 hover:text-white'
                    }`}
                  >
                    0{m.number}. {m.destination}
                  </button>
                ))}
              </div>
              <button
                onClick={onLaunchMission}
                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-medium tracking-wide whitespace-nowrap cursor-pointer transition-colors"
              >
                Go to Launchpad
              </button>
            </div>
          </div>
        )}

        {(mode === 'DESIGN_ROCKET' || mode === 'DESIGN_CRAFT' || mode === 'LAUNCH_FLIGHT') &&
          children}
      </div>
    </div>
  );
}

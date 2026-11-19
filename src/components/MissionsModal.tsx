import { CheckCircle2, Flame, Rocket, X } from 'lucide-react';
import { MISSIONS } from '../data/catalog';
import {
  DifficultyLevel,
  MissionDefinition,
  RocketDesignConfig,
  SpacecraftDesignConfig,
} from '../types/space';

interface MissionsModalProps {
  open: boolean;
  selectedMissionId: string;
  completedMissionIds: string[];
  rocketDesign: RocketDesignConfig;
  spacecraftDesign: SpacecraftDesignConfig;
  difficultyOverride: DifficultyLevel | 'mission_default';
  onClose: () => void;
  onSelectMission: (missionId: string) => void;
  onOpenRocketDesigner: () => void;
  onOpenSpacecraftDesigner: () => void;
  onLaunchMission: (mission: MissionDefinition) => void;
}

export function MissionsModal({
  open,
  selectedMissionId,
  completedMissionIds,
  difficultyOverride,
  onClose,
  onSelectMission,
  onOpenRocketDesigner,
  onOpenSpacecraftDesigner,
  onLaunchMission,
}: MissionsModalProps) {
  if (!open) return null;

  const activeMission = MISSIONS.find((m) => m.id === selectedMissionId) ?? MISSIONS[0];
  const effDiff =
    difficultyOverride === 'mission_default' ? activeMission.difficulty : difficultyOverride;

  return (
    <div className="fixed inset-0 z-40 bg-[#050811]/85 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#0e1422] border border-[#243249] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-medium tracking-wide text-white">
              Mission Challenges & Flight Briefing
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Select a mission profile, review target parameters, and authorize launch.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded bg-[#141d2e] hover:bg-[#1e293b] text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mission List */}
          <div className="lg:col-span-5 space-y-2.5">
            {MISSIONS.map((m) => {
              const selected = m.id === activeMission.id;
              const completed = completedMissionIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => onSelectMission(m.id)}
                  className={`w-full text-left p-3.5 rounded border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-blue-950/60 border-blue-500 text-white'
                      : 'bg-[#121a2b] border-[#223047] text-slate-200 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      0{m.number}. {m.title}
                    </span>
                    {completed && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-slate-300 mt-1 font-mono-tabular">
                    {m.destination} · {m.difficulty} · {m.rewards.credits} CR
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Mission Details */}
          <div className="lg:col-span-7 bg-[#121a2b] border border-[#223047] rounded-md p-5 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div>
                <div className="text-xs font-mono-tabular text-cyan-300">
                  Mission 0{activeMission.number} · {activeMission.destination} · Difficulty:{' '}
                  {effDiff}
                </div>
                <h3 className="font-display text-2xl font-medium text-white mt-0.5">
                  {activeMission.title}
                </h3>
                <p className="text-sm text-slate-200 mt-2 leading-relaxed">
                  {activeMission.summary}
                </p>
              </div>

              {/* Target Parameters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#1f2a3d] text-xs font-mono-tabular">
                <div>
                  <div className="text-[11px] text-slate-400">Required Δv</div>
                  <div className="text-slate-100 mt-0.5">
                    {activeMission.constraints.requiredDeltaVMs.toLocaleString()} m/s
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Minimum TWR</div>
                  <div className="text-slate-100 mt-0.5">
                    {activeMission.constraints.minTWR.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Budget Cap</div>
                  <div className="text-slate-100 mt-0.5">
                    ${activeMission.constraints.budgetCapM}M
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Comm Range</div>
                  <div className="text-slate-100 mt-0.5">
                    {activeMission.constraints.minCommRangeKm >= 1000000
                      ? `${(activeMission.constraints.minCommRangeKm / 1000000).toFixed(0)}M km`
                      : `${activeMission.constraints.minCommRangeKm.toLocaleString()} km`}
                  </div>
                </div>
              </div>

              {/* Objective Parameters (no pre-launch recommendations) */}
              <div className="space-y-2 pt-2 border-t border-[#1f2a3d]">
                <div className="text-xs font-medium text-slate-200">
                  Mission Parameters
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4 leading-relaxed">
                  {activeMission.briefingNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#1f2a3d]">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onOpenRocketDesigner}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#1a253a] hover:bg-[#23324d] text-slate-200 text-xs font-medium cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Edit Rocket</span>
                </button>
                <button
                  onClick={onOpenSpacecraftDesigner}
                  className="px-3 py-2 rounded bg-[#1a253a] hover:bg-[#23324d] text-slate-200 text-xs font-medium cursor-pointer"
                >
                  Edit Spacecraft
                </button>
              </div>

              <button
                onClick={() => onLaunchMission(activeMission)}
                className="flex items-center gap-1.5 px-5 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-medium tracking-wide cursor-pointer transition-colors"
              >
                <Flame className="w-4 h-4" />
                <span>Launch Mission</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { CheckCircle2, FlaskConical, Lock, X } from 'lucide-react';
import {
  ANTENNAS,
  AVIONICS_PARTS,
  BATTERIES,
  BOOSTER_CONFIGS,
  CRAFT_PROPULSION,
  FAIRINGS,
  FUEL_TANKS,
  INSTRUMENTS,
  POWER_SYSTEMS,
  ROCKET_ENGINES,
  SOLAR_PANELS,
  SPACECRAFT_CHASSIS,
  STAGE1_BODIES,
  STAGE2_BODIES,
} from '../data/catalog';
import { audioEngine } from '../engine/audioEngine';
import { PartBase } from '../types/space';

interface ResearchLabModalProps {
  open: boolean;
  researchCredits: number;
  unlockedPartIds: string[];
  onClose: () => void;
  onUnlockPart: (partId: string, cost: number) => void;
}

const RESEARCH_GROUPS: { title: string; parts: PartBase[] }[] = [
  {
    title: 'Heavy Launch Bodies & Tanks',
    parts: [...STAGE1_BODIES, ...STAGE2_BODIES, ...FUEL_TANKS].filter((p) => p.unlockCost > 0),
  },
  {
    title: 'Advanced Propulsion & Boosters',
    parts: [...ROCKET_ENGINES, ...BOOSTER_CONFIGS].filter((p) => p.unlockCost > 0),
  },
  {
    title: 'Fairings, Avionics & Spacecraft Platforms',
    parts: [...FAIRINGS, ...AVIONICS_PARTS, ...SPACECRAFT_CHASSIS].filter((p) => p.unlockCost > 0),
  },
  {
    title: 'Deep-Space Power, Comms & Instruments',
    parts: [
      ...POWER_SYSTEMS,
      ...SOLAR_PANELS,
      ...BATTERIES,
      ...ANTENNAS,
      ...INSTRUMENTS,
      ...CRAFT_PROPULSION,
    ].filter((p) => p.unlockCost > 0),
  },
];

export function ResearchLabModal({
  open,
  researchCredits,
  unlockedPartIds,
  onClose,
  onUnlockPart,
}: ResearchLabModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-[#050811]/85 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#0e1422] border border-[#243249] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-medium tracking-wide text-white flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-cyan-300" />
              <span>Aerospace Research Laboratory</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Unlock next-generation propulsion, nuclear RTGs, and deep-space spacecraft subsystems.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-mono-tabular font-medium text-amber-300">
              Available: {researchCredits} CR
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded bg-[#141d2e] hover:bg-[#1e293b] text-slate-200 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {RESEARCH_GROUPS.map((grp) => (
            <div key={grp.title} className="space-y-3">
              <h3 className="text-sm font-medium text-cyan-300 border-b border-[#1f2a3d] pb-1.5">
                {grp.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {grp.parts.map((part) => {
                  const unlocked = unlockedPartIds.includes(part.id);
                  const affordable = researchCredits >= part.unlockCost;
                  return (
                    <div
                      key={part.id}
                      className={`p-4 rounded border flex flex-col justify-between gap-3 ${
                        unlocked
                          ? 'bg-emerald-950/20 border-emerald-700/50'
                          : 'bg-[#121a2b] border-[#223047]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-white">{part.name}</span>
                          <span className="text-xs font-mono-tabular text-slate-300">
                            Tier {part.tier}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          {part.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]">
                        <span className="text-xs font-mono-tabular text-slate-300">
                          {part.massKg.toLocaleString()} kg · ${part.cost}M
                        </span>
                        {unlocked ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Researched
                          </span>
                        ) : (
                          <button
                            disabled={!affordable}
                            onClick={() => {
                              audioEngine.playAttachPart();
                              onUnlockPart(part.id, part.unlockCost);
                            }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                              affordable
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                                : 'bg-[#1a2233] text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <Lock className="w-3 h-3" />
                            <span>Unlock ({part.unlockCost} CR)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

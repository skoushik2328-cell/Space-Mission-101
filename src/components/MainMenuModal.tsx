import {
  BookOpen,
  Compass,
  Cpu,
  FlaskConical,
  History,
  Play,
  Rocket,
  Settings,
  X,
} from 'lucide-react';
import { MissionDefinition } from '../types/space';

interface MainMenuModalProps {
  open: boolean;
  activeMission: MissionDefinition;
  completedCount: number;
  researchCredits: number;
  engineeringXP: number;
  onClose: () => void;
  onStartNewMission: () => void;
  onOpenMissions: () => void;
  onOpenRocketDesigner: () => void;
  onOpenSpacecraftDesigner: () => void;
  onOpenResearch: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenOrrery: () => void;
}

export function MainMenuModal({
  open,
  activeMission,
  completedCount,
  researchCredits,
  engineeringXP,
  onClose,
  onStartNewMission,
  onOpenMissions,
  onOpenRocketDesigner,
  onOpenSpacecraftDesigner,
  onOpenResearch,
  onOpenHistory,
  onOpenSettings,
  onOpenOrrery,
}: MainMenuModalProps) {
  if (!open) return null;

  const menuItems = [
    {
      label: 'Start New Mission',
      sub: `Launchpad & Briefing for Mission 0${activeMission.number}: ${activeMission.title}`,
      icon: Play,
      primary: true,
      action: onStartNewMission,
    },
    {
      label: 'Mission Challenges',
      sub: 'Browse 5 progressive orbital, lunar, Mars, station & deep-space missions',
      icon: BookOpen,
      primary: false,
      action: onOpenMissions,
    },
    {
      label: 'Rocket Designer',
      sub: 'Assemble stages, engines, fuel types, boosters, fairings & guidance',
      icon: Rocket,
      primary: false,
      action: onOpenRocketDesigner,
    },
    {
      label: 'Spacecraft Designer',
      sub: 'Configure satellites, landers, rovers, solar/RTG power & antennas',
      icon: Cpu,
      primary: false,
      action: onOpenSpacecraftDesigner,
    },
    {
      label: '3D Solar System Orrery',
      sub: 'Explore planetary orbits and transfer trajectory corridors',
      icon: Compass,
      primary: false,
      action: onOpenOrrery,
    },
    {
      label: 'Research Laboratory',
      sub: `Spend ${researchCredits} Research Credits to unlock Tier 2 & 3 technologies`,
      icon: FlaskConical,
      primary: false,
      action: onOpenResearch,
    },
    {
      label: 'Mission History',
      sub: 'Review launch logs, 6-axis mission scores & engineering debriefs',
      icon: History,
      primary: false,
      action: onOpenHistory,
    },
    {
      label: 'Settings',
      sub: 'Audio volume, difficulty level, camera sensitivity & save management',
      icon: Settings,
      primary: false,
      action: onOpenSettings,
    },
  ];

  return (
    <div className="fixed inset-0 z-40 bg-[#050811]/85 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0e1422] border border-[#243249] rounded-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#1e293b] flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium tracking-wide text-white">
              Space Mission Designer
            </h1>
            <p className="text-xs text-slate-300 mt-1 font-mono-tabular">
              Campaign Progress: {completedCount}/5 Missions · {researchCredits} Credits · {engineeringXP} XP
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#162033] hover:bg-[#1f2d47] border border-[#2a3a54] text-slate-200 text-xs font-normal cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Explore 3D HQ</span>
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[75vh] overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.action}
                className={`text-left p-4 rounded-md border transition-colors cursor-pointer flex items-start gap-3 ${
                  item.primary
                    ? 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-500 text-white'
                    : 'bg-[#121a2b] hover:bg-[#182339] border-[#223047] text-slate-100'
                }`}
              >
                <div
                  className={`p-2 rounded shrink-0 ${
                    item.primary ? 'bg-blue-600 text-white' : 'bg-[#1a253a] text-cyan-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    {item.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

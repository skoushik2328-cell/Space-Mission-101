import {
  Award,
  BookOpen,
  FlaskConical,
  History,
  Menu,
  Rocket,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameMode, MissionDefinition } from '../types/space';

interface TopTelemetryBarProps {
  mode: GameMode;
  activeMission: MissionDefinition;
  researchCredits: number;
  engineeringXP: number;
  muted: boolean;
  onToggleMute: () => void;
  onOpenMenu: () => void;
  onOpenMissions: () => void;
  onOpenResearch: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onReturnHq: () => void;
}

const MODE_LABELS: Record<GameMode, string> = {
  HQ_WALK: 'Headquarters Floor',
  DESIGN_ROCKET: 'Vehicle Assembly Bay',
  DESIGN_CRAFT: 'Spacecraft Cleanroom Lab',
  ORRERY: 'Solar System Orrery',
  LAUNCH_FLIGHT: 'Flight Operations',
  DEBRIEF: 'Mission Debrief',
};

export function TopTelemetryBar({
  mode,
  activeMission,
  researchCredits,
  engineeringXP,
  muted,
  onToggleMute,
  onOpenMenu,
  onOpenMissions,
  onOpenResearch,
  onOpenHistory,
  onOpenSettings,
  onReturnHq,
}: TopTelemetryBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-12 bg-[#0b101b]/95 border-b border-[#1f2a3d] px-4 flex items-center justify-between gap-4 select-none">
      {/* Zone 1: Brand Wordmark + Context */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onOpenMenu}
          className="flex items-center gap-2 text-slate-100 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Open Main Menu"
        >
          <Rocket className="w-4 h-4 text-blue-400" />
          <span className="font-display text-lg font-medium tracking-wide">
            Space Mission Designer
          </span>
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 truncate">
          <span>/</span>
          <span className="text-cyan-300 font-normal whitespace-nowrap">
            {MODE_LABELS[mode]}
          </span>
          <span>·</span>
          <span className="text-slate-200 truncate">
            Mission 0{activeMission.number}: {activeMission.title}
          </span>
        </div>
      </div>

      {/* Zone 2: Clean Single-Line Navigation Links */}
      <nav className="hidden lg:flex items-center gap-5 text-xs font-normal text-slate-200">
        {mode !== 'HQ_WALK' && mode !== 'LAUNCH_FLIGHT' && (
          <button
            onClick={onReturnHq}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Walk HQ
          </button>
        )}
        <button
          onClick={onOpenMissions}
          className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-300" />
          <span>Missions</span>
        </button>
        <button
          onClick={onOpenResearch}
          className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FlaskConical className="w-3.5 h-3.5 text-slate-300" />
          <span>Research Lab</span>
        </button>
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-slate-300" />
          <span>History</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-slate-300" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Zone 3: Credits, XP & Menu Action */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-3 text-xs font-mono-tabular">
          <span className="text-amber-300 font-medium">
            {researchCredits} CR
          </span>
          <span className="text-slate-500">·</span>
          <span className="flex items-center gap-1 text-slate-200">
            <Award className="w-3.5 h-3.5 text-cyan-300" />
            {engineeringXP} XP
          </span>
        </div>

        <button
          onClick={onToggleMute}
          className="p-2 rounded border border-[#1f2a3d] bg-[#111827] text-slate-200 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
          aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
          title={muted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenMenu}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Menu className="w-3.5 h-3.5" />
          <span>Command Menu</span>
        </button>
      </div>
    </header>
  );
}

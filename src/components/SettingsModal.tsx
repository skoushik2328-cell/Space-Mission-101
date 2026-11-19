import { RotateCcw, Settings, X } from 'lucide-react';
import { DifficultyLevel, GameSettings } from '../types/space';

interface SettingsModalProps {
  open: boolean;
  settings: GameSettings;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onResetCampaign: () => void;
}

export function SettingsModal({
  open,
  settings,
  onClose,
  onUpdateSettings,
  onResetCampaign,
}: SettingsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-[#050811]/85 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0e1422] border border-[#243249] rounded-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between">
          <h2 className="font-display text-2xl font-medium tracking-wide text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-300" />
            <span>Simulation Settings</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded bg-[#141d2e] hover:bg-[#1e293b] text-slate-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-sm">
          {/* Audio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-normal text-slate-200">Master Audio Volume</span>
              <span className="font-mono-tabular text-xs text-cyan-300">
                {settings.muted ? 'Muted' : `${Math.round(settings.masterVolume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.masterVolume}
              onChange={(e) =>
                onUpdateSettings({ masterVolume: parseFloat(e.target.value), muted: false })
              }
              className="w-full accent-blue-500 cursor-pointer"
            />
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.muted}
                onChange={(e) => onUpdateSettings({ muted: e.target.checked })}
                className="accent-blue-500"
              />
              <span>Mute all synthesized audio</span>
            </label>
          </div>

          {/* Camera Sensitivity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-normal text-slate-200">HQ Camera Look Sensitivity</span>
              <span className="font-mono-tabular text-xs text-cyan-300">
                {settings.cameraSensitivity.toFixed(1)}×
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={settings.cameraSensitivity}
              onChange={(e) =>
                onUpdateSettings({ cameraSensitivity: parseFloat(e.target.value) })
              }
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Difficulty Level Override */}
          <div className="space-y-2">
            <div className="font-normal text-slate-200">Engineering Difficulty Level</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  ['mission_default', 'Mission Default'],
                  ['beginner', 'Beginner'],
                  ['intermediate', 'Intermediate'],
                  ['advanced', 'Advanced'],
                  ['expert', 'Expert'],
                ] as [DifficultyLevel | 'mission_default', string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => onUpdateSettings({ difficultyOverride: val })}
                  className={`px-3 py-2 rounded text-xs font-normal border cursor-pointer transition-colors ${
                    settings.difficultyOverride === val
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-[#121a2b] border-[#223047] text-slate-200 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Save */}
          <div className="pt-4 border-t border-[#1e293b] flex items-center justify-between">
            <div className="text-xs text-slate-300">
              Reset all unlocked research parts, credits, and mission history.
            </div>
            <button
              onClick={() => {
                onResetCampaign();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-rose-950/70 hover:bg-rose-800 border border-rose-700/60 text-rose-200 text-xs font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

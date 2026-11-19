import { CheckCircle2, History, X, XCircle } from 'lucide-react';
import { MissionHistoryEntry } from '../types/space';

interface MissionHistoryModalProps {
  open: boolean;
  history: MissionHistoryEntry[];
  onClose: () => void;
}

export function MissionHistoryModal({
  open,
  history,
  onClose,
}: MissionHistoryModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-[#050811]/85 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#0e1422] border border-[#243249] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-medium tracking-wide text-white flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-300" />
              <span>Flight Archive & Mission History</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Recorded telemetry launches, engineering scores, and anomaly post-mortems.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded bg-[#141d2e] hover:bg-[#1e293b] text-slate-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {history.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-300">
              No launches logged yet. Configure a rocket and launch your first mission from the pad.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded bg-[#121a2b] border border-[#223047] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {entry.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-white">
                        {entry.missionTitle}
                      </span>
                      <span className="text-xs text-slate-300 font-mono-tabular">
                        · {entry.destination} · {entry.difficulty}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300">
                      {entry.rocketSummary} · {entry.spacecraftSummary}
                    </div>
                    {entry.failureReport && (
                      <div className="text-xs text-rose-300">
                        Failure Cause: {entry.failureReport.title} — {entry.failureReport.reason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0 font-mono-tabular text-xs">
                    <div className="text-right">
                      <div className="text-white font-medium">
                        {entry.score.totalScore.toLocaleString()} PTS
                      </div>
                      <div className="text-slate-300">
                        ${entry.costM}M · {Math.round(entry.durationSec)}s
                      </div>
                    </div>
                    <div
                      className={`w-10 h-10 rounded flex items-center justify-center font-display text-xl font-medium border ${
                        entry.success
                          ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                      }`}
                    >
                      {entry.score.grade}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

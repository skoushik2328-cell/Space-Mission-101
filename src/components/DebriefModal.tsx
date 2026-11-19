import {
  AlertOctagon,
  Award,
  BookOpen,
  CheckCircle2,
  Cpu,
  Lightbulb,
  Rocket,
  RotateCcw,
} from 'lucide-react';
import {
  buildPostFlightOptimizationTips,
  REAL_WORLD_BENCHMARKS,
} from '../data/realWorldData';
import {
  calculateRocketMetrics,
  calculateSpacecraftMetrics,
} from '../engine/engineeringMath';
import {
  FailureReport,
  MissionDefinition,
  MissionScoreBreakdown,
  RocketDesignConfig,
  SpacecraftDesignConfig,
} from '../types/space';

interface DebriefModalProps {
  open: boolean;
  mission: MissionDefinition;
  success: boolean;
  score: MissionScoreBreakdown | null;
  creditsEarned: number;
  xpEarned: number;
  fuelRemainingPct: number;
  rocketDesign: RocketDesignConfig;
  spacecraftDesign: SpacecraftDesignConfig;
  failureReport?: FailureReport;
  onFixRocket: () => void;
  onFixSpacecraft: () => void;
  onNextMission: () => void;
  onReturnHq: () => void;
}

export function DebriefModal({
  open,
  mission,
  success,
  score,
  creditsEarned,
  xpEarned,
  fuelRemainingPct,
  rocketDesign,
  spacecraftDesign,
  failureReport,
  onFixRocket,
  onFixSpacecraft,
  onNextMission,
  onReturnHq,
}: DebriefModalProps) {
  if (!open || !score) return null;

  const craftMetrics = calculateSpacecraftMetrics(
    spacecraftDesign,
    mission.constraints.solarFluxFactor
  );
  const rocketMetrics = calculateRocketMetrics(rocketDesign, craftMetrics.totalMassKg);
  const totalCostM = rocketMetrics.rocketCostM + craftMetrics.spacecraftCostM;
  const benchmark = REAL_WORLD_BENCHMARKS[mission.destination];
  const postFlightTips = buildPostFlightOptimizationTips(
    mission,
    rocketMetrics,
    craftMetrics,
    fuelRemainingPct
  );

  const scoreRows = [
    ['Mission Success', score.missionSuccess],
    ['Engineering Accuracy', score.engineeringAccuracy],
    ['Fuel Efficiency', score.fuelEfficiency],
    ['Budget Management', score.budgetManagement],
    ['Payload Delivery Accuracy', score.payloadAccuracy],
    ['Time Management', score.timeManagement],
  ] as const;

  return (
    <div className="fixed inset-0 z-40 bg-[#050811]/88 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0e1422] border border-[#243249] rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            success
              ? 'bg-emerald-950/35 border-emerald-700/45'
              : 'bg-rose-950/35 border-rose-700/45'
          }`}
        >
          <div className="flex items-center gap-3">
            {success ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-mono-tabular text-slate-300">
                Mission 0{mission.number} Post-Flight Analysis · {mission.destination}
              </div>
              <h2 className="font-display text-2xl font-medium text-white">
                {success ? 'Mission Accomplished' : 'Mission Anomaly & Failure Analysis'}
              </h2>
            </div>
          </div>

          <div className="text-right font-mono-tabular">
            <div className="text-xs text-slate-300">Grade</div>
            <div
              className={`font-display text-3xl font-medium ${
                success ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {score.grade}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[76vh] overflow-y-auto">
          {/* Post-Launch Failure Cause, Solution & Real-World Aerospace Reference */}
          {!success && failureReport && (
            <div className="space-y-4">
              <div className="p-4 rounded bg-[#131a29] border border-rose-700/45 space-y-2.5">
                <div className="text-sm font-medium text-rose-300">
                  {failureReport.title}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  <span className="text-white font-medium">Cause of Failure: </span>
                  {failureReport.reason}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <span className="text-cyan-300 font-medium">Physics Analysis: </span>
                  {failureReport.engineeringExplanation}
                </p>
                <p className="text-xs text-amber-200 leading-relaxed">
                  <span className="text-amber-300 font-medium">Recommended Solution: </span>
                  {failureReport.recommendedFix}
                </p>
              </div>

              {failureReport.realWorldReference && (
                <div className="p-4 rounded bg-[#101724] border border-cyan-800/45 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>
                      Real-World Reference: {failureReport.realWorldReference.caseName} (
                      {failureReport.realWorldReference.year})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Program / Source: {failureReport.realWorldReference.agencyOrProgram}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    <span className="text-slate-100 font-medium">Real-World Data: </span>
                    {failureReport.realWorldReference.realWorldData}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <span className="text-emerald-300 font-medium">Engineering Lesson: </span>
                    {failureReport.realWorldReference.historicalLesson}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Post-Launch Optimization Suggestions & Real-World Benchmark (Shown after launch completion) */}
          {success && (
            <div className="space-y-4">
              <div className="p-4 rounded bg-[#121a29] border border-cyan-800/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
                  <Lightbulb className="w-4 h-4 shrink-0" />
                  <span>Post-Flight Engineering Suggestions</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-200 list-disc pl-4 leading-relaxed">
                  {postFlightTips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Real-World Launch Vehicle Data Comparison */}
          <div className="p-4 rounded bg-[#111826] border border-[#223047] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-medium text-slate-100">
                Real-World Reference Comparison: {benchmark.vehicleName}
              </div>
              <div className="text-[11px] text-slate-400">
                {benchmark.agency} · {benchmark.era}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono-tabular text-left">
                <thead>
                  <tr className="border-b border-[#1f2a3d] text-slate-400">
                    <th className="py-1.5 pr-3 font-normal">Metric</th>
                    <th className="py-1.5 pr-3 font-normal">Your Vehicle</th>
                    <th className="py-1.5 font-normal">{benchmark.vehicleName}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  <tr className="border-b border-[#182234]">
                    <td className="py-1.5 pr-3 text-slate-400">Liftoff Mass</td>
                    <td className="py-1.5 pr-3">
                      {(rocketMetrics.grossLiftoffMassKg / 1000).toFixed(0)} tons
                    </td>
                    <td className="py-1.5">{benchmark.liftoffMassTons.toLocaleString()} tons</td>
                  </tr>
                  <tr className="border-b border-[#182234]">
                    <td className="py-1.5 pr-3 text-slate-400">Liftoff Thrust / TWR</td>
                    <td className="py-1.5 pr-3">
                      {rocketMetrics.liftoffThrustKN.toLocaleString()} kN ({rocketMetrics.liftoffTWR.toFixed(2)})
                    </td>
                    <td className="py-1.5">
                      {benchmark.liftoffThrustKN.toLocaleString()} kN ({benchmark.twr.toFixed(2)})
                    </td>
                  </tr>
                  <tr className="border-b border-[#182234]">
                    <td className="py-1.5 pr-3 text-slate-400">Effective Isp</td>
                    <td className="py-1.5 pr-3">{rocketMetrics.effectiveIsp} s</td>
                    <td className="py-1.5">{benchmark.effectiveIspSec} s</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 text-slate-400">Mission Cost</td>
                    <td className="py-1.5 pr-3">${totalCostM}M</td>
                    <td className="py-1.5">~${benchmark.approxCostM}M</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{benchmark.notes}</p>
          </div>

          {/* Rewards */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded bg-[#121a2b] border border-[#223047] font-mono-tabular text-center">
            <div>
              <div className="text-xs text-slate-400">Mission Score</div>
              <div className="text-lg font-medium text-white mt-0.5">
                {score.totalScore.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Research Credits</div>
              <div className="text-lg font-medium text-amber-300 mt-0.5">+{creditsEarned} CR</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Engineering XP</div>
              <div className="text-lg font-medium text-cyan-300 flex items-center justify-center gap-1 mt-0.5">
                <Award className="w-4 h-4" />+{xpEarned}
              </div>
            </div>
          </div>

          {/* 6-Axis Score Breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-200">
              Performance Evaluation Breakdown
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {scoreRows.map(([label, val]) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{label}</span>
                    <span className="font-mono-tabular text-slate-100">{val}%</span>
                  </div>
                  <div className="h-1.5 rounded bg-[#192338] overflow-hidden">
                    <div
                      className={`h-full ${
                        val >= 75 ? 'bg-cyan-500' : val >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#1e293b]">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onFixRocket}
                className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#182339] hover:bg-[#22314f] text-slate-200 text-xs font-medium cursor-pointer"
              >
                <Rocket className="w-3.5 h-3.5 text-cyan-300" />
                <span>Rocket Designer</span>
              </button>
              <button
                onClick={onFixSpacecraft}
                className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#182339] hover:bg-[#22314f] text-slate-200 text-xs font-medium cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-300" />
                <span>Spacecraft Lab</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onReturnHq}
                className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#141d2e] hover:bg-[#1e293b] border border-[#243249] text-slate-200 text-xs font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Walk HQ</span>
              </button>
              {success && (
                <button
                  onClick={onNextMission}
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium tracking-wide cursor-pointer"
                >
                  Next Mission Briefing
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

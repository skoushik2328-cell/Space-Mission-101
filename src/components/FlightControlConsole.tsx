import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  CheckCircle2,
  Circle,
  Crosshair,
  FastForward,
  Flag,
  Flame,
  XCircle,
} from 'lucide-react';
import { CameraAngleId, FlightTelemetryState } from '../types/space';

interface FlightControlConsoleProps {
  telemetry: FlightTelemetryState;
  onSetThrottle: (val: number) => void;
  onSetPitchTrim: (deg: number) => void;
  onSetCameraAngle: (angle: CameraAngleId) => void;
  onSetTimeWarp: (warp: 1 | 2 | 5 | 10) => void;
  onTriggerAction: () => void;
  onNudgeDocking: (dx: number, dy: number) => void;
  onAbortFlight: () => void;
}

const CAMERA_ANGLES: { id: CameraAngleId; label: string }[] = [
  { id: 'pad_wide', label: 'Pad Wide' },
  { id: 'booster_cam', label: 'Booster Cam' },
  { id: 'chase_cam', label: 'Chase Cam' },
  { id: 'orbital_cam', label: 'Orbital Cam' },
];

const ACTION_LABELS: Record<NonNullable<FlightTelemetryState['awaitingManualAction']>, string> = {
  STAGE_SEP: 'Separate Stage 1 & Boosters',
  FAIRING_SEP: 'Jettison Payload Fairing',
  TRANSFER_BURN: 'Execute Transfer Burn',
  DOCKING: 'Execute Soft Capture Dock',
  LANDING: 'Confirm Powered Touchdown',
  DEPLOY: 'Deploy Spacecraft & Finish',
};

function formatMet(sec: number): string {
  const sign = sec < 0 ? 'T-' : 'T+';
  const abs = Math.abs(Math.floor(sec));
  const mm = String(Math.floor(abs / 60)).padStart(2, '0');
  const ss = String(abs % 60).padStart(2, '0');
  return `${sign}${mm}:${ss}`;
}

export function FlightControlConsole({
  telemetry,
  onSetThrottle,
  onSetPitchTrim,
  onSetCameraAngle,
  onSetTimeWarp,
  onTriggerAction,
  onNudgeDocking,
  onAbortFlight,
}: FlightControlConsoleProps) {
  return (
    <div className="p-3 flex flex-col gap-2.5">
      {/* Row 1: Primary Live Flight Telemetry Readouts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pb-2 border-b border-[#1e293b] text-xs font-mono-tabular">
        <div>
          <div className="text-[11px] text-slate-400">MET</div>
          <div className="text-sm font-medium text-amber-300">
            {formatMet(telemetry.missionElapsedSec)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Altitude</div>
          <div className="text-sm font-medium text-white">
            {telemetry.phase === 'LANDING_DESCENT'
              ? `${telemetry.landingAltitudeM.toFixed(0)} m`
              : `${telemetry.altitudeKm.toFixed(1)} km`}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Velocity</div>
          <div className="text-sm font-medium text-cyan-300">
            {telemetry.phase === 'LANDING_DESCENT'
              ? `${telemetry.landingVerticalSpeedMs.toFixed(1)} m/s`
              : `${Math.round(telemetry.velocityMs).toLocaleString()} m/s`}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Fuel Remaining</div>
          <div className="text-sm font-medium text-white">{telemetry.fuelRemainingPct}%</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Thrust</div>
          <div className="text-sm font-medium text-amber-200">{telemetry.thrustPct}%</div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Health</div>
          <div className="text-sm font-medium text-emerald-300">
            {telemetry.spacecraftHealthPct}%
          </div>
        </div>
        <div className="col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="text-[11px] text-slate-400">Flight Status</div>
          <div className="text-xs font-normal text-cyan-200 truncate" title={telemetry.orbitalStatus}>
            {telemetry.orbitalStatus}
          </div>
        </div>
      </div>

      {/* Row 2: Status Banner + Objectives + Manual Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px]">
          <div className="text-xs text-slate-100 font-normal mb-1.5">
            {telemetry.statusMessage}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {telemetry.objectives.map((obj) => (
              <div
                key={obj.id}
                className={`flex items-center gap-1 text-xs ${
                  obj.completed ? 'text-emerald-300' : 'text-slate-300'
                }`}
              >
                {obj.completed ? (
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                ) : (
                  <Circle className="w-3 h-3 shrink-0" />
                )}
                <span>{obj.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Docking Mini-Crosshair (Mission 4) */}
        {telemetry.phase === 'DOCKING_OP' && (
          <div className="flex items-center gap-2 bg-[#121a2a] border border-cyan-500/40 rounded p-2">
            <div className="relative w-14 h-14 bg-[#070b13] border border-[#25334a] rounded flex items-center justify-center">
              <Crosshair className="w-5 h-5 text-slate-600" />
              <div
                className="absolute w-2.5 h-2.5 rounded-full bg-cyan-400"
                style={{
                  transform: `translate(${telemetry.dockingOffsetX * 22}px, ${telemetry.dockingOffsetY * 22}px)`,
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-1">
              <div />
              <button
                onClick={() => onNudgeDocking(0, -0.1)}
                className="p-1 rounded bg-[#1b263b] hover:bg-blue-600 text-white cursor-pointer"
                title="RCS Up"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <div />
              <button
                onClick={() => onNudgeDocking(-0.1, 0)}
                className="p-1 rounded bg-[#1b263b] hover:bg-blue-600 text-white cursor-pointer"
                title="RCS Left"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => onNudgeDocking(0, 0.1)}
                className="p-1 rounded bg-[#1b263b] hover:bg-blue-600 text-white cursor-pointer"
                title="RCS Down"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => onNudgeDocking(0.1, 0)}
                className="p-1 rounded bg-[#1b263b] hover:bg-blue-600 text-white cursor-pointer"
                title="RCS Right"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Contextual Action Trigger */}
        {telemetry.awaitingManualAction && (
          <button
            onClick={onTriggerAction}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-medium tracking-wide whitespace-nowrap cursor-pointer transition-colors shadow-lg"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{ACTION_LABELS[telemetry.awaitingManualAction]}</span>
          </button>
        )}
      </div>

      {/* Row 3: Throttle, Pitch Trim, Camera Angles, Time Warp & Abort */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1e293b]">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-200">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Throttle {Math.round(telemetry.throttle * 100)}%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={telemetry.throttle}
              onChange={(e) => onSetThrottle(parseFloat(e.target.value))}
              className="w-24 accent-amber-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-200">
            <span>Pitch {telemetry.pitchTrimDeg > 0 ? `+${telemetry.pitchTrimDeg}` : telemetry.pitchTrimDeg}°</span>
            <input
              type="range"
              min={-15}
              max={15}
              step={1}
              value={telemetry.pitchTrimDeg}
              onChange={(e) => onSetPitchTrim(parseInt(e.target.value, 10))}
              className="w-20 accent-cyan-500 cursor-pointer"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Camera Angles */}
          <div className="flex items-center gap-1">
            <Camera className="w-3.5 h-3.5 text-slate-300 mr-0.5" />
            {CAMERA_ANGLES.map((cam) => (
              <button
                key={cam.id}
                onClick={() => onSetCameraAngle(cam.id)}
                className={`px-2 py-1 rounded text-xs font-normal cursor-pointer transition-colors ${
                  telemetry.cameraAngle === cam.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#141d2e] text-slate-200 hover:text-white'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>

          {/* Time Warp */}
          <div className="flex items-center gap-1 pl-2 border-l border-[#243249]">
            <FastForward className="w-3.5 h-3.5 text-slate-300" />
            {([1, 2, 5, 10] as const).map((w) => (
              <button
                key={w}
                onClick={() => onSetTimeWarp(w)}
                className={`px-2 py-1 rounded text-xs font-mono-tabular cursor-pointer transition-colors ${
                  telemetry.timeWarp === w
                    ? 'bg-cyan-600 text-white font-medium'
                    : 'bg-[#141d2e] text-slate-200 hover:text-white'
                }`}
              >
                {w}×
              </button>
            ))}
          </div>

          <button
            onClick={onAbortFlight}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/70 hover:bg-rose-800 border border-rose-700/60 text-rose-200 text-xs font-normal cursor-pointer transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Return HQ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

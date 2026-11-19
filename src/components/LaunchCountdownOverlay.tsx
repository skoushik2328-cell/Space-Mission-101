import { FlightTelemetryState, MissionDefinition } from '../types/space';

interface LaunchCountdownOverlayProps {
  telemetry: FlightTelemetryState;
  mission: MissionDefinition;
}

const COUNTDOWN_CALLOUTS: Record<number, string> = {
  5: 'Internal Guidance Active · Pad Clear',
  4: 'Propellant Tank Pressurization Nominal',
  3: 'Deluge Water Sound Suppression On',
  2: 'Main Engine Ignition Sequence Start',
  1: 'Thrust Build-Up Nominal · Hold-Down Armed',
  0: 'Clamps Released · Liftoff!',
};

export function LaunchCountdownOverlay({
  telemetry,
  mission,
}: LaunchCountdownOverlayProps) {
  const showCountdown = telemetry.phase === 'COUNTDOWN';
  const showLiftoffBanner =
    telemetry.phase === 'LIFTOFF' && telemetry.missionElapsedSec >= 0 && telemetry.missionElapsedSec < 1.6;

  if (!showCountdown && !showLiftoffBanner) {
    return null;
  }

  const countInt = showCountdown ? Math.max(0, Math.ceil(telemetry.countdownSec)) : 0;
  const callout = COUNTDOWN_CALLOUTS[countInt] ?? 'Terminal Launch Sequence';

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none flex flex-col items-center">
      <div className="px-8 py-4 rounded-lg bg-[#080d17]/82 border border-cyan-500/35 shadow-2xl text-center min-w-[300px]">
        <div className="text-xs font-mono-tabular tracking-widest uppercase text-cyan-300">
          {mission.title} · Launch Complex 39A
        </div>

        <div
          className={`mt-1 font-mono-tabular tracking-tight leading-none ${
            countInt === 0 || showLiftoffBanner
              ? 'text-5xl sm:text-6xl font-semibold text-emerald-300'
              : countInt <= 2
                ? 'text-6xl sm:text-7xl font-semibold text-amber-300'
                : 'text-6xl sm:text-7xl font-medium text-white'
          }`}
        >
          {countInt === 0 || showLiftoffBanner ? 'LIFTOFF' : `T-${countInt}`}
        </div>

        <div className="mt-2 text-xs text-slate-200 font-normal">
          {callout}
        </div>
      </div>
    </div>
  );
}

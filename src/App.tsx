/**
 * @file App.tsx
 * @description Main application shell for Space Mission Designer (Space Mission 101).
 * @ai-disclosure AI-assisted code generation was used in authoring and structuring this application module.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomCommandDock } from './components/BottomCommandDock';
import { DebriefModal } from './components/DebriefModal';
import { DesignWorkstationPanel } from './components/DesignWorkstationPanel';
import { FlightControlConsole } from './components/FlightControlConsole';
import { LaunchCountdownOverlay } from './components/LaunchCountdownOverlay';
import { MainMenuModal } from './components/MainMenuModal';
import { MissionHistoryModal } from './components/MissionHistoryModal';
import { MissionsModal } from './components/MissionsModal';
import { ResearchLabModal } from './components/ResearchLabModal';
import { SettingsModal } from './components/SettingsModal';
import { TopTelemetryBar } from './components/TopTelemetryBar';
import { MISSIONS } from './data/catalog';
import { audioEngine } from './engine/audioEngine';
import {
  calculateRocketMetrics,
  calculateSpacecraftMetrics,
  resolveRocketParts,
  resolveSpacecraftParts,
} from './engine/engineeringMath';
import { useCampaignState } from './engine/useCampaignState';
import { HqInteractiveStation } from './three/hqBuilder';
import { SpaceSimEngine } from './three/SpaceSimEngine';
import {
  CameraAngleId,
  FailureReport,
  FlightTelemetryState,
  GameMode,
  HqStationId,
  MissionDefinition,
  MissionScoreBreakdown,
} from './types/space';

type ActiveModal =
  | null
  | 'main_menu'
  | 'missions'
  | 'research'
  | 'history'
  | 'settings'
  | 'debrief';

export default function App() {
  const {
    save,
    updateRocketDesign,
    updateSpacecraftDesign,
    selectMission,
    unlockPart,
    recordMissionResult,
    updateSettings,
    resetCampaign,
  } = useCampaignState();

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SpaceSimEngine | null>(null);

  const [mode, setMode] = useState<GameMode>('HQ_WALK');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [nearbyStation, setNearbyStation] = useState<HqInteractiveStation | null>(null);
  const [explodedView, setExplodedView] = useState(0);
  const [flightTelemetry, setFlightTelemetry] = useState<FlightTelemetryState | null>(null);

  const [debriefData, setDebriefData] = useState<{
    mission: MissionDefinition;
    success: boolean;
    score: MissionScoreBreakdown;
    creditsEarned: number;
    xpEarned: number;
    fuelRemainingPct: number;
    failureReport?: FailureReport;
  } | null>(null);

  const activeMission = useMemo(
    () => MISSIONS.find((m) => m.id === save.selectedMissionId) ?? MISSIONS[0],
    [save.selectedMissionId]
  );

  const effectiveDifficulty = useMemo(
    () =>
      save.settings.difficultyOverride === 'mission_default'
        ? activeMission.difficulty
        : save.settings.difficultyOverride,
    [save.settings.difficultyOverride, activeMission.difficulty]
  );

  // Refs for stable WebGL callback closures
  const activeMissionRef = useRef(activeMission);
  activeMissionRef.current = activeMission;
  const effectiveDiffRef = useRef(effectiveDifficulty);
  effectiveDiffRef.current = effectiveDifficulty;
  const saveRef = useRef(save);
  saveRef.current = save;

  const handleStationActivate = useCallback((stationId: HqStationId) => {
    audioEngine.playUiClick();
    if (stationId === 'mission_control') {
      setActiveModal('missions');
    } else if (stationId === 'rocket_bay') {
      setActiveModal(null);
      setMode('DESIGN_ROCKET');
      engineRef.current?.setMode('DESIGN_ROCKET');
    } else if (stationId === 'spacecraft_lab') {
      setActiveModal(null);
      setMode('DESIGN_CRAFT');
      engineRef.current?.setMode('DESIGN_CRAFT');
    } else if (stationId === 'orrery') {
      setActiveModal(null);
      setMode('ORRERY');
      engineRef.current?.setMode('ORRERY');
    } else if (stationId === 'launchpad_deck') {
      setActiveModal('missions');
    }
  }, []);

  const handleMissionComplete = useCallback(
    (
      success: boolean,
      score: MissionScoreBreakdown,
      telemetry: FlightTelemetryState,
      failureReport?: FailureReport
    ) => {
      const m = activeMissionRef.current;
      const diff = effectiveDiffRef.current;
      const s = saveRef.current;
      const craftMetrics = calculateSpacecraftMetrics(
        s.spacecraftDesign,
        m.constraints.solarFluxFactor
      );
      const rocketMetrics = calculateRocketMetrics(s.rocketDesign, craftMetrics.totalMassKg);
      const rParts = resolveRocketParts(s.rocketDesign);
      const cParts = resolveSpacecraftParts(s.spacecraftDesign);

      const creditsEarned = success ? m.rewards.credits : 35;
      const xpEarned = success ? m.rewards.xp : 50;

      recordMissionResult(
        m.id,
        m.title,
        m.destination,
        diff,
        success,
        score,
        `${rParts.s1Body.name} + ${rParts.s1Engine.name}`,
        `${cParts.chassis.name} + ${cParts.antenna.name}`,
        rocketMetrics.rocketCostM + craftMetrics.spacecraftCostM,
        Math.max(10, telemetry.missionElapsedSec),
        creditsEarned,
        xpEarned,
        failureReport
      );

      setDebriefData({
        mission: m,
        success,
        score,
        creditsEarned,
        xpEarned,
        fuelRemainingPct: telemetry.fuelRemainingPct,
        failureReport,
      });
      setMode('DEBRIEF');
      setActiveModal('debrief');
    },
    [recordMissionResult]
  );

  // Mount Three.js WebGL Engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new SpaceSimEngine(mount, saveRef.current.rocketDesign, saveRef.current.spacecraftDesign, {
      onNearbyStationChange: (st) => setNearbyStation(st),
      onStationActivate: (id) => handleStationActivate(id),
      onFlightTelemetryUpdate: (tel) => setFlightTelemetry(tel),
      onMissionComplete: handleMissionComplete,
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleMissionComplete, handleStationActivate]);

  // Sync design & settings updates to Three.js engine without remounting
  useEffect(() => {
    engineRef.current?.updateDesigns(save.rocketDesign, save.spacecraftDesign, explodedView);
  }, [save.rocketDesign, save.spacecraftDesign, explodedView]);

  useEffect(() => {
    engineRef.current?.setSettings(
      save.settings.cameraSensitivity,
      save.settings.masterVolume,
      save.settings.muted
    );
  }, [save.settings]);

  useEffect(() => {
    engineRef.current?.updateOrreryTrajectory(activeMission.destination);
  }, [activeMission.destination]);

  // Global keyboard shortcuts (H = toggle HUD, Escape = close modal)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyH' && !activeModal) {
        setDockCollapsed((prev) => !prev);
      } else if (e.code === 'Escape' && activeModal) {
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal]);

  const switchMode = useCallback((nextMode: GameMode) => {
    setActiveModal(null);
    setDockCollapsed(false);
    setMode(nextMode);
    engineRef.current?.setMode(nextMode);
  }, []);

  const launchMission = useCallback(
    (missionToLaunch: MissionDefinition = activeMission) => {
      audioEngine.playUiClick();
      selectMission(missionToLaunch.id);
      const diff =
        save.settings.difficultyOverride === 'mission_default'
          ? missionToLaunch.difficulty
          : save.settings.difficultyOverride;
      setActiveModal(null);
      setDockCollapsed(false);
      setMode('LAUNCH_FLIGHT');
      engineRef.current?.startMissionLaunch(missionToLaunch, diff);
    },
    [activeMission, save.settings.difficultyOverride, selectMission]
  );

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07090e]">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* Slim Top Telemetry Bar */}
      <TopTelemetryBar
        mode={mode}
        activeMission={activeMission}
        researchCredits={save.researchCredits}
        engineeringXP={save.engineeringXP}
        muted={save.settings.muted}
        onToggleMute={() => updateSettings({ muted: !save.settings.muted })}
        onOpenMenu={() => {
          audioEngine.playUiClick();
          setActiveModal('main_menu');
        }}
        onOpenMissions={() => {
          audioEngine.playUiClick();
          setActiveModal('missions');
        }}
        onOpenResearch={() => {
          audioEngine.playUiClick();
          setActiveModal('research');
        }}
        onOpenHistory={() => {
          audioEngine.playUiClick();
          setActiveModal('history');
        }}
        onOpenSettings={() => {
          audioEngine.playUiClick();
          setActiveModal('settings');
        }}
        onReturnHq={() => {
          audioEngine.playUiClick();
          switchMode('HQ_WALK');
        }}
      />

      {mode === 'LAUNCH_FLIGHT' && flightTelemetry && (
        <LaunchCountdownOverlay telemetry={flightTelemetry} mission={activeMission} />
      )}

      {/* Unified Collapsible Bottom Command Dock */}
      {mode !== 'DEBRIEF' && (
        <BottomCommandDock
          mode={mode}
          collapsed={dockCollapsed}
          onToggleCollapse={() => setDockCollapsed((p) => !p)}
          nearbyStation={nearbyStation}
          activeMission={activeMission}
          missions={MISSIONS}
          onQuickTravel={(stationId) => {
            audioEngine.playUiClick();
            engineRef.current?.travelToStation(stationId);
          }}
          onActivateStation={handleStationActivate}
          onLaunchMission={() => setActiveModal('missions')}
          onSelectOrreryMission={(id) => {
            audioEngine.playUiClick();
            selectMission(id);
          }}
        >
          {(mode === 'DESIGN_ROCKET' || mode === 'DESIGN_CRAFT') && (
            <DesignWorkstationPanel
              mode={mode}
              mission={activeMission}
              effectiveDifficulty={effectiveDifficulty}
              rocketDesign={save.rocketDesign}
              spacecraftDesign={save.spacecraftDesign}
              unlockedPartIds={save.unlockedPartIds}
              explodedView={explodedView}
              onExplodedViewChange={setExplodedView}
              onUpdateRocket={updateRocketDesign}
              onUpdateSpacecraft={updateSpacecraftDesign}
              onSwitchMode={(m) => switchMode(m)}
              onOpenResearch={() => setActiveModal('research')}
              onLaunchMission={() => launchMission(activeMission)}
            />
          )}

          {mode === 'LAUNCH_FLIGHT' && flightTelemetry && (
            <FlightControlConsole
              telemetry={flightTelemetry}
              onSetThrottle={(v) => engineRef.current?.setFlightThrottle(v)}
              onSetPitchTrim={(deg) => engineRef.current?.setFlightPitchTrim(deg)}
              onSetCameraAngle={(ang: CameraAngleId) => engineRef.current?.setFlightCameraAngle(ang)}
              onSetTimeWarp={(w) => engineRef.current?.setFlightTimeWarp(w)}
              onTriggerAction={() => engineRef.current?.triggerManualFlightAction()}
              onNudgeDocking={(dx, dy) => engineRef.current?.nudgeDocking(dx, dy)}
              onAbortFlight={() => {
                audioEngine.playUiClick();
                switchMode('HQ_WALK');
              }}
            />
          )}
        </BottomCommandDock>
      )}

      {/* Modals */}
      <MainMenuModal
        open={activeModal === 'main_menu'}
        activeMission={activeMission}
        completedCount={save.completedMissionIds.length}
        researchCredits={save.researchCredits}
        engineeringXP={save.engineeringXP}
        onClose={() => setActiveModal(null)}
        onStartNewMission={() => setActiveModal('missions')}
        onOpenMissions={() => setActiveModal('missions')}
        onOpenRocketDesigner={() => switchMode('DESIGN_ROCKET')}
        onOpenSpacecraftDesigner={() => switchMode('DESIGN_CRAFT')}
        onOpenOrrery={() => switchMode('ORRERY')}
        onOpenResearch={() => setActiveModal('research')}
        onOpenHistory={() => setActiveModal('history')}
        onOpenSettings={() => setActiveModal('settings')}
      />

      <MissionsModal
        open={activeModal === 'missions'}
        selectedMissionId={save.selectedMissionId}
        completedMissionIds={save.completedMissionIds}
        rocketDesign={save.rocketDesign}
        spacecraftDesign={save.spacecraftDesign}
        difficultyOverride={save.settings.difficultyOverride}
        onClose={() => setActiveModal(null)}
        onSelectMission={(id) => {
          audioEngine.playUiClick();
          selectMission(id);
        }}
        onOpenRocketDesigner={() => switchMode('DESIGN_ROCKET')}
        onOpenSpacecraftDesigner={() => switchMode('DESIGN_CRAFT')}
        onLaunchMission={(m) => launchMission(m)}
      />

      <ResearchLabModal
        open={activeModal === 'research'}
        researchCredits={save.researchCredits}
        unlockedPartIds={save.unlockedPartIds}
        onClose={() => setActiveModal(null)}
        onUnlockPart={unlockPart}
      />

      <MissionHistoryModal
        open={activeModal === 'history'}
        history={save.missionHistory}
        onClose={() => setActiveModal(null)}
      />

      <SettingsModal
        open={activeModal === 'settings'}
        settings={save.settings}
        onClose={() => setActiveModal(null)}
        onUpdateSettings={updateSettings}
        onResetCampaign={resetCampaign}
      />

      {debriefData && (
        <DebriefModal
          open={activeModal === 'debrief'}
          mission={debriefData.mission}
          success={debriefData.success}
          score={debriefData.score}
          creditsEarned={debriefData.creditsEarned}
          xpEarned={debriefData.xpEarned}
          fuelRemainingPct={debriefData.fuelRemainingPct}
          rocketDesign={save.rocketDesign}
          spacecraftDesign={save.spacecraftDesign}
          failureReport={debriefData.failureReport}
          onFixRocket={() => switchMode('DESIGN_ROCKET')}
          onFixSpacecraft={() => switchMode('DESIGN_CRAFT')}
          onNextMission={() => {
            const nextIdx = Math.min(
              MISSIONS.length - 1,
              MISSIONS.findIndex((m) => m.id === debriefData.mission.id) + 1
            );
            selectMission(MISSIONS[nextIdx].id);
            switchMode('HQ_WALK');
            setActiveModal('missions');
          }}
          onReturnHq={() => switchMode('HQ_WALK')}
        />
      )}
    </div>
  );
}

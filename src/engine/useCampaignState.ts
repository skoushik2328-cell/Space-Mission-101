import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_ROCKET_DESIGN,
  DEFAULT_SPACECRAFT_DESIGN,
  DEFAULT_STARTER_UNLOCKS,
  MISSIONS,
} from '../data/catalog';
import {
  CampaignSaveState,
  DifficultyLevel,
  FailureReport,
  GameSettings,
  MissionHistoryEntry,
  MissionScoreBreakdown,
  RocketDesignConfig,
  SpacecraftDesignConfig,
} from '../types/space';

const STORAGE_KEY = 'space_mission_designer_save_v1';

function createInitialSave(): CampaignSaveState {
  return {
    researchCredits: 160,
    engineeringXP: 0,
    unlockedPartIds: [...DEFAULT_STARTER_UNLOCKS],
    completedMissionIds: [],
    missionHistory: [],
    rocketDesign: { ...DEFAULT_ROCKET_DESIGN },
    spacecraftDesign: { ...DEFAULT_SPACECRAFT_DESIGN },
    selectedMissionId: MISSIONS[0].id,
    settings: {
      masterVolume: 0.65,
      muted: false,
      graphicsQuality: 'high',
      cameraSensitivity: 1.0,
      difficultyOverride: 'mission_default',
    },
  };
}

export function useCampaignState() {
  const [save, setSave] = useState<CampaignSaveState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createInitialSave();
      const parsed = JSON.parse(raw) as Partial<CampaignSaveState>;
      const base = createInitialSave();
      return {
        ...base,
        ...parsed,
        unlockedPartIds: Array.from(
          new Set([...DEFAULT_STARTER_UNLOCKS, ...(parsed.unlockedPartIds ?? [])])
        ),
        rocketDesign: { ...base.rocketDesign, ...(parsed.rocketDesign ?? {}) },
        spacecraftDesign: { ...base.spacecraftDesign, ...(parsed.spacecraftDesign ?? {}) },
        settings: { ...base.settings, ...(parsed.settings ?? {}) },
      };
    } catch {
      return createInitialSave();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch {
      // ignore storage quota issues
    }
  }, [save]);

  const updateRocketDesign = useCallback((patch: Partial<RocketDesignConfig>) => {
    setSave((prev) => ({
      ...prev,
      rocketDesign: { ...prev.rocketDesign, ...patch },
    }));
  }, []);

  const updateSpacecraftDesign = useCallback((patch: Partial<SpacecraftDesignConfig>) => {
    setSave((prev) => ({
      ...prev,
      spacecraftDesign: { ...prev.spacecraftDesign, ...patch },
    }));
  }, []);

  const selectMission = useCallback((missionId: string) => {
    setSave((prev) => ({ ...prev, selectedMissionId: missionId }));
  }, []);

  const unlockPart = useCallback((partId: string, cost: number): boolean => {
    let unlocked = false;
    setSave((prev) => {
      if (prev.unlockedPartIds.includes(partId) || prev.researchCredits < cost) {
        return prev;
      }
      unlocked = true;
      return {
        ...prev,
        researchCredits: prev.researchCredits - cost,
        unlockedPartIds: [...prev.unlockedPartIds, partId],
      };
    });
    return unlocked;
  }, []);

  const recordMissionResult = useCallback(
    (
      missionId: string,
      missionTitle: string,
      destination: string,
      difficulty: DifficultyLevel,
      success: boolean,
      score: MissionScoreBreakdown,
      rocketSummary: string,
      spacecraftSummary: string,
      costM: number,
      durationSec: number,
      creditsEarned: number,
      xpEarned: number,
      failureReport?: FailureReport
    ) => {
      const entry: MissionHistoryEntry = {
        id: `mh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        missionId,
        missionTitle,
        destination,
        difficulty,
        timestamp: new Date().toISOString(),
        success,
        score,
        failureReport,
        rocketSummary,
        spacecraftSummary,
        costM,
        durationSec,
      };

      setSave((prev) => ({
        ...prev,
        researchCredits: prev.researchCredits + creditsEarned,
        engineeringXP: prev.engineeringXP + xpEarned,
        completedMissionIds:
          success && !prev.completedMissionIds.includes(missionId)
            ? [...prev.completedMissionIds, missionId]
            : prev.completedMissionIds,
        missionHistory: [entry, ...prev.missionHistory].slice(0, 40),
      }));
    },
    []
  );

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSave((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, []);

  const resetCampaign = useCallback(() => {
    const fresh = createInitialSave();
    setSave(fresh);
  }, []);

  return {
    save,
    updateRocketDesign,
    updateSpacecraftDesign,
    selectMission,
    unlockPart,
    recordMissionResult,
    updateSettings,
    resetCampaign,
  };
}

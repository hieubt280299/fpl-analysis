import { FDR_WINDOW_SIZE } from '@/config/fdr';
import { positionWeightsFromShare, type FdrFormula } from '@/domain/fdr';

/**
 * A guest's own formula: stored only in their browser tab (session storage), never in Firestore.
 * No rules: GW weights don't have to add up to 10, and the position weights are chosen with a slider
 * instead of following the number of finished GWs.
 */
export interface CustomFormula {
  /** One weight per GW in the window, nearest first. */
  gameweekWeights: number[];
  /** Share of last season's position (0–1); this season gets the rest. */
  lastSeasonShare: number;
}

export function toFdrFormula(custom: CustomFormula): FdrFormula {
  return {
    gameweekWeights: custom.gameweekWeights,
    positionWeights: positionWeightsFromShare(custom.lastSeasonShare),
  };
}

/** The formula everyone sees, as a starting point for a guest's own formula. */
export function fromFdrFormula(formula: FdrFormula): CustomFormula {
  return {
    gameweekWeights: [...formula.gameweekWeights],
    lastSeasonShare: formula.positionWeights.lastSeason,
  };
}

/** Tolerant parse of a stored custom formula; null when missing or broken. */
export function parseCustomFormula(value: unknown): CustomFormula | null {
  if (typeof value !== 'object' || value === null) return null;
  const { gameweekWeights, lastSeasonShare } = value as Record<string, unknown>;
  if (
    !Array.isArray(gameweekWeights) ||
    gameweekWeights.length !== FDR_WINDOW_SIZE ||
    !gameweekWeights.every((w) => typeof w === 'number' && Number.isFinite(w))
  ) {
    return null;
  }
  if (typeof lastSeasonShare !== 'number' || !Number.isFinite(lastSeasonShare)) return null;
  return {
    gameweekWeights: gameweekWeights as number[],
    lastSeasonShare: Math.min(1, Math.max(0, lastSeasonShare)),
  };
}

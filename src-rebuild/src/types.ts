export const SKIP_VALUE = 'N/A';

export interface QualitativeCriterion {
  id: string;
  label: string;
  /** Short label (prevents line breaks in PDF table header) */
  shortLabel?: string;
  options: string[];
}

export interface Evaluation {
  pio: number | string | null;
  chr: number | string | null;
  controlHarmony: string | null;
  predictability: string | null;
  pilotCompensation: string | null;
  workload: string | null;
  stickForces: string | null;
  characteristic: string | null;
  trim: string | null;
  [criterionId: string]: string | number | null;
}

export interface TestPointData {
  maneuver: string | null;
  evaluation: Evaluation;
  cancelled: boolean;
  comments: Record<string, string>;
  generalComment: string;
}

export type Evaluations = Record<number, TestPointData>;

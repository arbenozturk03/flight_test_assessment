export const SKIP_VALUE = 'N/A';

export interface RatingDescription {
  label: string;
  description: string;
}

export interface DecisionOption {
  label: string;
  next: DecisionNode | number;
  sentiment?: 'positive' | 'negative';
}

export interface DecisionNode {
  question: string;
  context?: string;
  options: DecisionOption[];
}

export interface QualitativeCriterion {
  id: string;
  label: string;
  /** Short label (prevents line breaks in PDF table header) */
  shortLabel?: string;
  options: string[];
  /** Maps numeric rating ('1','3','5') to descriptive text for PDF export */
  pdfLabels?: Record<string, string>;
  /** Maps numeric rating to detailed paragraph description for info popup */
  longDescriptions?: Record<string, string>;
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
  /**
   * Matrix-capable maneuvers: `sequential` = direct 1–5 selectors; `tree` = FTA yes/no decision trees;
   * `matrix` = phase × criteria grid. Non-matrix TPs use `sequential` | `tree` only.
   */
  handlingEvalMode?: 'sequential' | 'tree' | 'matrix';
  /** @deprecated Use `handlingEvalMode`. `direct` was matrix, `flowchart` was sequential. */
  matrixEvalPresentation?: 'direct' | 'flowchart';
}

export type Evaluations = Record<number, TestPointData>;

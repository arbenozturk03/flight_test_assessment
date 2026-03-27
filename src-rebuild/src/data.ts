import type { QualitativeCriterion, Evaluation } from './types';
import { SKIP_VALUE } from './types';

/** FTE (Flight Test Engineer) list – alphabetical, Emre Can Kaya first in dropdown */
export const FTE_LIST = [
  'Caner Korkmaz',
  'Emre Can Kaya',
  'Erdem Eskioğlu',
  'Fatih Tuncer',
  'İbrahim Yunus Sezer',
  'Kaan Yutük',
  'Nazlıcan Gökdemir',
  'Onurhan Ayhan',
  'Süleyman Murat Köroğlu',
].sort((a, b) => a.localeCompare(b, 'tr'));

/** FTE name to appear first in selection dropdown */
export const FTE_FIRST_IN_DROPDOWN = 'Emre Can Kaya';

/** TP (Test Pilot) list – A.Y. Barbaros Demirbaş first, rest alphabetical */
export const TP_LIST = [
  'A.Y. Barbaros Demirbaş',
  'Gökhan Bayramoğlu',
  'Soner Özer',
  'Zafer Bayar',
];

export const MANEUVER_LIST = [
  '1-G Stabilized Push Over',
  '360 Roll',
  'Bank Angle Capture',
  'Bank Angle Capture and Hold',
  'Barrel Roll',
  'Claw Mode Transition',
  'Coordinated Turn',
  'Inverted Flight',
  'Inverted Flight with Pull Up',
  'Lateral Acceleration',
  'Landing Gear Transition',
  'Level Acceleration',
  'Level Deceleration',
  'Offset Landing',
  'Pitch Angle Capture and Hold',
  'Pitch and Roll Tracking',
  'Pitch Doublet',
  'Pitch Tracking',
  'Pull Up',
  'Push Over',
  'Roll Doublet',
  'Speed Brake Operation',
  'Spiral',
  'Steady Heading Sideslip',
  'Trimmability',
  'Wind Up Turn',
  'Yaw Doublet',
];

const MANEUVER_ABBR: Record<string, string> = {
  '1-G Stabilized Push Over': '1GSPO',
  '360 Roll': '360R',
  'Bank Angle Capture': 'BAC',
  'Bank Angle Capture and Hold': 'BACH',
  'Barrel Roll': 'BRL',
  'Claw Mode Transition': 'CMT',
  'Coordinated Turn': 'CT',
  'Inverted Flight': 'IF',
  'Inverted Flight with Pull Up': 'IFPU',
  'Lateral Acceleration': 'LTAC',
  'Landing Gear Transition': 'LGT',
  'Level Acceleration': 'LACC',
  'Level Deceleration': 'LDEC',
  'Offset Landing': 'OL',
  'Pitch Angle Capture and Hold': 'PACH',
  'Pitch and Roll Tracking': 'PRT',
  'Pitch Doublet': 'PD',
  'Pitch Tracking': 'PT',
  'Pull Up': 'PU',
  'Push Over': 'PO',
  'Roll Doublet': 'RD',
  'Speed Brake Operation': 'SBO',
  'Spiral': 'SPR',
  'Steady Heading Sideslip': 'SHS',
  'Trimmability': 'TRIM',
  'Wind Up Turn': 'WUT',
  'Yaw Doublet': 'YD',
};

export function getManeuverAbbr(name: string): string {
  return MANEUVER_ABBR[name] ?? name;
}

// Reverse map: abbreviation → full maneuver name (for ID column extraction)
export const ABBR_TO_MANEUVER: Record<string, string> = Object.fromEntries(
  Object.entries(MANEUVER_ABBR).map(([name, abbr]) => [abbr, name]),
);

// Standard panel (7 criteria – best → mid → worst)

const RATING_1_5 = [SKIP_VALUE, '1', '2', '3', '4', '5'];

export const HANDLING_CRITERIA: QualitativeCriterion[] = [
  { id: 'controlHarmony',    label: 'Control Harmony',    options: RATING_1_5, pdfLabels: { '5': 'Fully Harmonious', '4': 'Integrated', '3': 'Adequate', '2': 'Disjointed', '1': 'Disconnected' } },
  { id: 'predictability',    label: 'Predictability',     shortLabel: 'Predict.', options: RATING_1_5, pdfLabels: { '5': 'Fully Transparent', '4': 'Predictable', '3': 'Expected', '2': 'Marginal', '1': 'Inconsistent' } },
  { id: 'pilotCompensation', label: 'Pilot Compensation', options: RATING_1_5, pdfLabels: { '5': 'Minimal', '4': 'Negligible', '3': 'Moderate', '2': 'Significant', '1': 'Considerable' } },
  { id: 'workload',          label: 'Workload',           options: RATING_1_5, pdfLabels: { '5': 'Tolerable', '4': 'Low', '3': 'Extensive', '2': 'Very High', '1': 'Intolerable' } },
  { id: 'stickForces',       label: 'Stick Forces',       options: RATING_1_5, pdfLabels: { '5': 'Harmonious', '4': 'Balanced', '3': 'Low', '2': 'Disproportionate', '1': 'High' } },
  { id: 'characteristic',    label: 'Characteristic',     shortLabel: 'Char.', options: RATING_1_5, pdfLabels: { '5': 'Ideal', '4': 'Desirable', '3': 'Insufficient', '2': 'Objectionable', '1': 'Excessive' } },
  { id: 'trim',              label: 'Trim',               options: RATING_1_5, pdfLabels: { '5': 'Effortless', '4': 'Straightforward', '3': 'Manageable', '2': 'Cumbersome', '1': 'Compensation' } },
];

// Dynamic panel (maneuver-specific – best → mid → worst)

// Shared criteria arrays (doc Table 3: BACH & CT)
const BACH_CT_CRITERIA: QualitativeCriterion[] = [
  { id: 'initiation', label: 'Initiation', options: RATING_1_5, pdfLabels: { '5': 'Harmonious', '4': 'Crisp', '3': 'Light', '2': 'Sluggish', '1': 'Fatiguing' } },
  { id: 'capture',    label: 'Capture',    options: RATING_1_5, pdfLabels: { '5': 'Deadbeat', '4': 'Snappy', '3': 'Underdamped', '2': 'Slow Damping', '1': 'Oscillatory' } },
  { id: 'hold',       label: 'Hold',       options: RATING_1_5, pdfLabels: { '5': 'Locked-in', '4': 'Solid', '3': 'Hesitant / Slip Tendency', '2': 'Unstable', '1': 'Demanding / Skid Tendency' } },
  { id: 'rollOut',    label: 'Roll Out',   options: RATING_1_5, pdfLabels: { '5': 'Target', '4': 'Precise', '3': 'Undershoot', '2': 'Significant Error', '1': 'Overshoot' } },
];

// Shared criteria (doc Table 4: PRT & PT)
const TRACKING_CRITERIA: QualitativeCriterion[] = [
  { id: 'grossAcquisition', label: 'Gross Acquisition',       options: RATING_1_5, pdfLabels: { '5': 'Steady / Natural', '4': 'Direct', '3': 'Sluggish / Unpredictable', '2': 'Delayed', '1': 'Abrupt / Too Aggressive' } },
  { id: 'fineTracking',     label: 'Fine Tracking',           options: RATING_1_5, pdfLabels: { '5': 'Pinpoint Precision', '4': 'High Accuracy', '3': 'Drifting / Undershoot', '2': 'Loose', '1': 'Jumpy' } },
  { id: 'dynamicTracking',  label: 'Dynamic Tracking',        options: RATING_1_5, pdfLabels: { '5': 'Stays with Target', '4': 'Minor Lag', '3': 'Falls Behind Target', '2': 'Significant Lag', '1': 'Too Aggressive' } },
  { id: 'taskTermination',  label: 'Task Termination',        options: RATING_1_5, pdfLabels: { '5': 'Smooth', '4': 'Controlled', '3': 'Moderate', '2': 'Rough', '1': 'Harsh' } },
];

// Shared criteria (doc Table 5: LACC & LDEC)
const ACCEL_DECEL_CRITERIA: QualitativeCriterion[] = [
  { id: 'powerApplication',       label: 'Power Application',        options: RATING_1_5, pdfLabels: { '5': 'Neutral / Predictable', '4': 'Symmetrical', '3': 'Left Yaw / Very Slow', '2': 'Noticeable Swerve', '1': 'Right Yaw / Abrupt' } },
  { id: 'dynamicAccelDecel',      label: 'Dynamic Accel / Decel',    options: RATING_1_5, pdfLabels: { '5': 'Manageable', '4': 'Predictable', '3': 'Unpredictable', '2': 'High Workload', '1': 'Heavy Rudder' } },
  { id: 'targetSpeedCapture',     label: 'Target Speed Capture',     options: RATING_1_5, pdfLabels: { '5': 'Predictable', '4': 'Positive', '3': 'Slow', '2': 'Lagging', '1': 'Abrupt' } },
  { id: 'highSpeedStabilization', label: 'High Speed Stabilization', options: RATING_1_5, pdfLabels: { '5': 'Easy', '4': 'Straightforward', '3': 'Difficult', '2': 'High Effort', '1': 'Sensitive' } },
];

// Shared criteria (doc Table 6: IF & IFPU)
const INVERTED_FLIGHT_CRITERIA: QualitativeCriterion[] = [
  { id: 'rollInitiation',       label: 'Roll Initiation',       options: RATING_1_5, pdfLabels: { '5': 'Moderate', '4': 'Natural', '3': 'Slow', '2': 'Lagging', '1': 'Abrupt' } },
  { id: 'invertedCapture',      label: 'Inverted Capture',      options: RATING_1_5, pdfLabels: { '5': 'Holds', '4': 'Solid', '3': 'Sinks', '2': 'Significant Drop', '1': 'Over-Push' } },
  { id: 'steadyState',          label: 'Steady State',          options: RATING_1_5, pdfLabels: { '5': 'Stable', '4': 'Constant', '3': 'Neutrally', '2': 'Oscillatory', '1': 'Divergent' } },
  { id: 'controlEffectiveness', label: 'Control Effectiveness', options: RATING_1_5, pdfLabels: { '5': 'Effective', '4': 'Responsive', '3': 'Sluggish', '2': 'Marginal', '1': 'Sensitive' } },
  { id: 'recovery',             label: 'Recovery',              options: RATING_1_5, pdfLabels: { '5': 'Symmetric to Entry', '4': 'Proportional', '3': 'Slower than Entry', '2': 'Disproportional', '1': 'Faster than Entry' } },
];

// Shared criteria (doc Table 7: LGT & CMT)
const GEAR_CLAW_CRITERIA: QualitativeCriterion[] = [
  { id: 'initiation',           label: 'Initiation',                options: RATING_1_5, pdfLabels: { '5': 'None', '4': 'Negligible', '3': 'Nose Drop', '2': 'Distinct', '1': 'Nose Up' } },
  { id: 'clawTransition',       label: 'Claw Transition',           options: RATING_1_5, pdfLabels: { '5': 'Ideal', '4': 'Fluid', '3': 'Insufficient', '2': 'Rough', '1': 'Excessive' } },
  { id: 'transientPitchChange', label: 'Transient in Pitch Change', options: RATING_1_5, pdfLabels: { '5': 'Manageable', '4': 'Predictable', '3': 'Slow', '2': 'Sudden', '1': 'Abrupt' } },
  { id: 'stabilization',        label: 'Stabilization (Speed)',     options: RATING_1_5, pdfLabels: { '5': 'Expected Drag', '4': 'Consistent', '3': 'Massive Drag', '2': 'Excessive Decel', '1': 'Minimal Drag' } },
];

const PUSH_OVER_CRITERIA: QualitativeCriterion[] = [
  { id: 'pushOverInitiation', label: 'Push Over Initiation', options: RATING_1_5, pdfLabels: { '5': 'Proportional', '4': 'Linear', '3': 'Light', '2': 'Firm', '1': 'Heavy' } },
  { id: 'targetCapture',      label: 'Target Capture',       options: RATING_1_5, pdfLabels: { '5': 'Deadbeat', '4': 'Snappy', '3': 'Oscillates', '2': 'Slow Damping', '1': 'Hard Stop' } },
  { id: 'dive',               label: 'Dive',                 options: RATING_1_5, pdfLabels: { '5': 'Proportional', '4': 'Steady', '3': 'Sluggish', '2': 'Erratic', '1': 'Abrupt' } },
  { id: 'recoveryPullForce',  label: 'Recovery Pull Force',  options: RATING_1_5, pdfLabels: { '5': 'Symmetric to Push', '4': 'Balanced', '3': 'Lighter than Push', '2': 'Disproportionate', '1': 'Heavier than Push' } },
];

const DYNAMIC_CRITERIA_MAP: Record<string, QualitativeCriterion[]> = {
  'Bank Angle Capture and Hold':    BACH_CT_CRITERIA,
  'Coordinated Turn':               BACH_CT_CRITERIA,
  'Pitch and Roll Tracking':        TRACKING_CRITERIA,
  'Pitch Tracking':                 TRACKING_CRITERIA,
  'Level Acceleration':             ACCEL_DECEL_CRITERIA,
  'Level Deceleration':             ACCEL_DECEL_CRITERIA,
  'Inverted Flight':                INVERTED_FLIGHT_CRITERIA,
  'Inverted Flight with Pull Up':   INVERTED_FLIGHT_CRITERIA,
  'Landing Gear Transition':        GEAR_CLAW_CRITERIA,
  'Claw Mode Transition':           GEAR_CLAW_CRITERIA,
  '1-G Stabilized Push Over':       PUSH_OVER_CRITERIA,
};

const DEFAULT_DYNAMIC_CRITERIA: QualitativeCriterion[] = [
  { id: 'initiation', label: 'Initiation', options: RATING_1_5, pdfLabels: { '5': 'Harmonious', '4': 'Crisp', '3': 'Light', '2': 'Sluggish', '1': 'Fatiguing' } },
  { id: 'capture',    label: 'Capture',    options: RATING_1_5, pdfLabels: { '5': 'Deadbeat', '4': 'Snappy', '3': 'Underdamped', '2': 'Slow Damping', '1': 'Oscillatory' } },
  { id: 'hold',       label: 'Hold',       options: RATING_1_5, pdfLabels: { '5': 'Locked-in', '4': 'Solid', '3': 'Hesitant', '2': 'Unstable', '1': 'Demanding Workload' } },
  { id: 'rollOut',    label: 'Roll Out',   options: RATING_1_5, pdfLabels: { '5': 'On-target', '4': 'Precise', '3': 'Undershoot', '2': 'Significant Error', '1': 'Overshoot' } },
];

export function getManeuverCriteria(maneuverName: string | null): QualitativeCriterion[] {
  if (!maneuverName) return DEFAULT_DYNAMIC_CRITERIA;
  return DYNAMIC_CRITERIA_MAP[maneuverName] ?? DEFAULT_DYNAMIC_CRITERIA;
}

/** Convert a numeric rating to its descriptive PDF text with the numeric value, e.g. "Harmonious (5)" */
export function resolvePdfLabel(criterion: QualitativeCriterion, value: string | number | null): string {
  if (value == null) return 'N/A';
  const str = String(value);
  if (str === SKIP_VALUE) return 'N/A';
  const label = criterion.pdfLabels?.[str];
  return label ? `${label} (${str})` : str;
}

// Helper functions

export function createDefaultEvaluation(): Evaluation {
  return {
    pio: null,
    chr: null,
    ...Object.fromEntries(HANDLING_CRITERIA.map((c) => [c.id, null])),
  } as Evaluation;
}

export function isEvaluationComplete(ev: Evaluation, maneuverName?: string | null): boolean {
  if (ev.pio == null || ev.chr == null) return false;
  for (const c of HANDLING_CRITERIA) {
    if (ev[c.id as keyof Evaluation] == null) return false;
  }
  for (const c of getManeuverCriteria(maneuverName ?? null)) {
    if (ev[c.id] == null) return false;
  }
  return true;
}

export function getMissingFieldLabels(ev: Evaluation, maneuverName?: string | null): string[] {
  const missing: string[] = [];
  if (ev.pio == null) missing.push('PIO');
  if (ev.chr == null) missing.push('CHR');
  HANDLING_CRITERIA.forEach((c) => {
    if (ev[c.id as keyof Evaluation] == null) missing.push(c.label);
  });
  getManeuverCriteria(maneuverName ?? null).forEach((c) => {
    if (ev[c.id] == null) missing.push(c.label);
  });
  return missing;
}

export function getMissingFieldIds(ev: Evaluation, maneuverName?: string | null): string[] {
  const missing: string[] = [];
  if (ev.pio == null) missing.push('pio');
  if (ev.chr == null) missing.push('chr');
  HANDLING_CRITERIA.forEach((c) => {
    if (ev[c.id as keyof Evaluation] == null) missing.push(c.id);
  });
  getManeuverCriteria(maneuverName ?? null).forEach((c) => {
    if (ev[c.id] == null) missing.push(c.id);
  });
  return missing;
}

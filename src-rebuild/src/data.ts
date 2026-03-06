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
  { id: 'controlHarmony',    label: 'Control Harmony',    options: RATING_1_5, pdfLabels: { '5': 'Fully Harmonious', '3': 'Adequate', '1': 'Disconnected' } },
  { id: 'predictability',    label: 'Predictability',     shortLabel: 'Predict.', options: RATING_1_5, pdfLabels: { '5': 'Fully Transparent', '3': 'Expected', '1': 'Inconsistent' } },
  { id: 'pilotCompensation', label: 'Pilot Compensation', options: RATING_1_5, pdfLabels: { '5': 'Minimal', '3': 'Moderate', '1': 'Considerable' } },
  { id: 'workload',          label: 'Workload',           options: RATING_1_5, pdfLabels: { '5': 'Tolerable', '3': 'Extensive', '1': 'Intolerable' } },
  { id: 'stickForces',       label: 'Stick Forces',       options: RATING_1_5, pdfLabels: { '5': 'Harmonious', '3': 'Low', '1': 'High' } },
  { id: 'characteristic',    label: 'Characteristic',     shortLabel: 'Char.', options: RATING_1_5, pdfLabels: { '5': 'Ideal', '3': 'Insufficient', '1': 'Excessive' } },
  { id: 'trim',              label: 'Trim',               options: RATING_1_5, pdfLabels: { '5': 'Effortless', '3': 'Manageable', '1': 'Compensation' } },
];

// Dynamic panel (maneuver-specific – best → mid → worst)

const DYNAMIC_CRITERIA_MAP: Record<string, QualitativeCriterion[]> = {
  'Bank Angle Capture and Hold': [
    { id: 'initiation', label: 'Initiation', options: RATING_1_5, pdfLabels: { '5': 'Harmonious', '3': 'Light', '1': 'Fatiguing' } },
    { id: 'capture',    label: 'Capture',    options: RATING_1_5, pdfLabels: { '5': 'Deadbeat', '3': 'Underdamped', '1': 'Oscillatory' } },
    { id: 'hold',       label: 'Hold',       options: RATING_1_5, pdfLabels: { '5': 'Locked-in', '3': 'Hesitant', '1': 'Demanding Workload' } },
    { id: 'rollOut',    label: 'Roll Out',   options: RATING_1_5, pdfLabels: { '5': 'Target', '3': 'Undershoot', '1': 'Overshoot' } },
  ],
  'Pitch and Roll Tracking': [
    { id: 'grossAcquisition', label: 'Gross Acquisition', options: RATING_1_5, pdfLabels: { '5': 'Steady', '3': 'Sluggish', '1': 'Abrupt' } },
    { id: 'fineTracking',     label: 'Fine Tracking',     options: RATING_1_5, pdfLabels: { '5': 'Pinpoint Precision', '3': 'Drifting', '1': 'Jumpy' } },
    { id: 'dynamicTracking',  label: 'Dynamic Tracking',  options: RATING_1_5, pdfLabels: { '5': 'Stays with Target', '3': 'Falls Behind Target', '1': 'Too Aggressive' } },
    { id: 'taskTermination',  label: 'Task Termination',  options: RATING_1_5, pdfLabels: { '5': 'Smooth', '3': 'Moderate', '1': 'Harsh' } },
  ],
  'Coordinated Turn': [
    { id: 'initiation',            label: 'Initiation',               options: RATING_1_5, pdfLabels: { '5': 'Harmonious', '3': 'Light', '1': 'Fatiguing' } },
    { id: 'capture',               label: 'Capture',                  options: RATING_1_5, pdfLabels: { '5': 'Deadbeat', '3': 'Underdamped', '1': 'Oscillatory' } },
    { id: 'hold',                  label: 'Hold',                     options: RATING_1_5, pdfLabels: { '5': 'Center', '3': 'Slip Tendency', '1': 'Skid Tendency' } },
    { id: 'rollOutHeadingCapture', label: 'Roll Out Heading Capture', options: RATING_1_5, pdfLabels: { '5': 'Target', '3': 'Undershoot', '1': 'Overshoot' } },
  ],
  'Pitch Angle Capture and Hold': [
    { id: 'initiation', label: 'Initiation', options: RATING_1_5, pdfLabels: { '5': 'Harmonious', '3': 'Too Light', '1': 'Heavy' } },
    { id: 'capture',    label: 'Capture',    options: RATING_1_5, pdfLabels: { '5': 'Deadbeat', '3': 'Underdamped', '1': 'Oscillatory' } },
    { id: 'hold',       label: 'Hold',       options: RATING_1_5, pdfLabels: { '5': 'Locked-in', '3': 'Hesitant', '1': 'Demanding Workload' } },
    { id: 'recovery',   label: 'Recovery',   options: RATING_1_5, pdfLabels: { '5': 'Smooth', '3': 'Moderate', '1': 'Harsh' } },
  ],
  'Pitch Tracking': [
    { id: 'grossAcquisition', label: 'Gross Acquisition', options: RATING_1_5, pdfLabels: { '5': 'Natural', '3': 'Unpredictable', '1': 'Too Aggressive' } },
    { id: 'fineTracking',     label: 'Fine Tracking',     options: RATING_1_5, pdfLabels: { '5': 'Precise', '3': 'Undershoot', '1': 'Jumpy' } },
    { id: 'dynamicTracking',  label: 'Dynamic Tracking',  options: RATING_1_5, pdfLabels: { '5': 'Stays with Target', '3': 'Falls Behind Target', '1': 'Too Aggressive' } },
    { id: 'taskTermination',  label: 'Task Termination',  options: RATING_1_5, pdfLabels: { '5': 'Smooth', '3': 'Moderate', '1': 'Harsh' } },
  ],
  'Level Acceleration': [
    { id: 'powerApplication',       label: 'Power Application',        options: RATING_1_5, pdfLabels: { '5': 'Neutral', '3': 'Left Yaw', '1': 'Right Yaw' } },
    { id: 'dynamicAcceleration',    label: 'Dynamic Acceleration',     options: RATING_1_5, pdfLabels: { '5': 'Manageable', '3': 'Unpredictable', '1': 'Heavy Rudder' } },
    { id: 'targetSpeedCapture',     label: 'Target Speed Capture',     options: RATING_1_5, pdfLabels: { '5': 'Predictable', '3': 'Slow', '1': 'Abrupt' } },
    { id: 'highSpeedStabilization', label: 'High Speed Stabilization', options: RATING_1_5, pdfLabels: { '5': 'Easy', '3': 'Difficult', '1': 'Sensitive' } },
  ],
  'Level Deceleration': [
    { id: 'highSpeedStabilization', label: 'High Speed Stabilization', options: RATING_1_5, pdfLabels: { '5': 'Easy', '3': 'Difficult', '1': 'Sensitive' } },
    { id: 'initiation',            label: 'Initiation',               options: RATING_1_5, pdfLabels: { '5': 'Predictable', '3': 'Very Slow', '1': 'Abrupt' } },
    { id: 'dynamicDeceleration',   label: 'Dynamic Deceleration',     options: RATING_1_5, pdfLabels: { '5': 'Manageable', '3': 'Unpredictable', '1': 'Heavy Rudder' } },
    { id: 'targetSpeedCapture',    label: 'Target Speed Capture',     options: RATING_1_5, pdfLabels: { '5': 'Predictable', '3': 'Slow', '1': 'Abrupt' } },
  ],
  'Inverted Flight': [
    { id: 'rollInitiation',       label: 'Roll Initiation',       options: RATING_1_5, pdfLabels: { '5': 'Moderate', '3': 'Slow', '1': 'Abrupt' } },
    { id: 'invertedCapture',      label: 'Inverted Capture',      options: RATING_1_5, pdfLabels: { '5': 'Holds', '3': 'Sinks', '1': 'Over-Push' } },
    { id: 'steadyState',          label: 'Steady State',          options: RATING_1_5, pdfLabels: { '5': 'Stable', '3': 'Neutrally', '1': 'Divergent' } },
    { id: 'controlEffectiveness', label: 'Control Effectiveness', options: RATING_1_5, pdfLabels: { '5': 'Effective', '3': 'Sluggish', '1': 'Sensitive' } },
    { id: 'recovery',             label: 'Recovery',              options: RATING_1_5, pdfLabels: { '5': 'Symmetric to Entry', '3': 'Slower than Entry', '1': 'Faster than Entry' } },
  ],
  'Landing Gear Transition': [
    { id: 'initiation',           label: 'Initiation',                options: RATING_1_5, pdfLabels: { '5': 'None', '3': 'Nose Drop', '1': 'Nose Up' } },
    { id: 'clawTransition',       label: 'Claw Transition',           options: RATING_1_5, pdfLabels: { '5': 'Ideal', '3': 'Insufficient', '1': 'Excessive' } },
    { id: 'transientPitchChange', label: 'Transient in Pitch Change', options: RATING_1_5, pdfLabels: { '5': 'Manageable', '3': 'Slow', '1': 'Abrupt' } },
    { id: 'stabilization',        label: 'Stabilization (Speed)',     options: RATING_1_5, pdfLabels: { '5': 'Expected Drag', '3': 'Massive Drag', '1': 'Minimal Drag' } },
  ],
  '1-G Stabilized Push Over': [
    { id: 'pushOverInitiation', label: 'Push Over Initiation', options: RATING_1_5, pdfLabels: { '5': 'Proportional', '3': 'Light', '1': 'Heavy' } },
    { id: 'targetCapture',      label: 'Target Capture',       options: RATING_1_5, pdfLabels: { '5': 'Deadbeat', '3': 'Oscillates', '1': 'Hard Stop' } },
    { id: 'dive',               label: 'Dive',                 options: RATING_1_5, pdfLabels: { '5': 'Proportional', '3': 'Sluggish', '1': 'Abrupt' } },
    { id: 'recoveryPullForce',  label: 'Recovery Pull Force',  options: RATING_1_5, pdfLabels: { '5': 'Symmetric to Push', '3': 'Lighter than Push', '1': 'Heavier than Push' } },
  ],
};

const DEFAULT_DYNAMIC_CRITERIA: QualitativeCriterion[] = [
  { id: 'initiation', label: 'Initiation', options: RATING_1_5, pdfLabels: { '5': 'Harmonious', '3': 'Light', '1': 'Fatiguing' } },
  { id: 'capture',    label: 'Capture',    options: RATING_1_5, pdfLabels: { '5': 'Deadbeat', '3': 'Underdamped', '1': 'Oscillatory' } },
  { id: 'hold',       label: 'Hold',       options: RATING_1_5, pdfLabels: { '5': 'Locked-in', '3': 'Hesitant', '1': 'Demanding Workload' } },
  { id: 'rollOut',    label: 'Roll Out',   options: RATING_1_5, pdfLabels: { '5': 'On-target', '3': 'Undershoot', '1': 'Overshoot' } },
];

export function getManeuverCriteria(maneuverName: string | null): QualitativeCriterion[] {
  if (!maneuverName) return DEFAULT_DYNAMIC_CRITERIA;
  return DYNAMIC_CRITERIA_MAP[maneuverName] ?? DEFAULT_DYNAMIC_CRITERIA;
}

/** Convert a numeric rating to its descriptive PDF text (5→best, 3→mid, 1→worst; 2,4 stay numeric) */
export function resolvePdfLabel(criterion: QualitativeCriterion, value: string | number | null): string {
  if (value == null) return 'N/A';
  const str = String(value);
  if (str === SKIP_VALUE) return 'N/A';
  return criterion.pdfLabels?.[str] ?? str;
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

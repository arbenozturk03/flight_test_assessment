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

export const HANDLING_CRITERIA: QualitativeCriterion[] = [
  { id: 'controlHarmony',    label: 'Control Harmony',    options: [SKIP_VALUE, 'Fully Harmonious', 'Adequate', 'Disconnected'] },
  { id: 'predictability',    label: 'Predictability',     shortLabel: 'Predict.', options: [SKIP_VALUE, 'Fully Transparent', 'Expected', 'Inconsistent'] },
  { id: 'pilotCompensation', label: 'Pilot Compensation', options: [SKIP_VALUE, 'Minimal', 'Moderate', 'Considerable'] },
  { id: 'workload',          label: 'Workload',           options: [SKIP_VALUE, 'Tolerable', 'Extensive', 'Intolerable'] },
  { id: 'stickForces',       label: 'Stick Forces',       options: [SKIP_VALUE, 'Harmonious', 'Low', 'High'] },
  { id: 'characteristic',    label: 'Characteristic',     shortLabel: 'Char.', options: [SKIP_VALUE, 'Ideal', 'Insufficient', 'Excessive'] },
  { id: 'trim',              label: 'Trim',               options: [SKIP_VALUE, 'Effortless', 'Manageable', 'Compensation'] },
];

// Dynamic panel (maneuver-specific – best → mid → worst)

const DYNAMIC_CRITERIA_MAP: Record<string, QualitativeCriterion[]> = {
  'Bank Angle Capture and Hold': [
    { id: 'initiation', label: 'Initiation', options: [SKIP_VALUE, 'Harmonious', 'Light', 'Fatiguing'] },
    { id: 'capture',    label: 'Capture',    options: [SKIP_VALUE, 'Deadbeat', 'Underdamped', 'Oscillatory'] },
    { id: 'hold',       label: 'Hold',       options: [SKIP_VALUE, 'Locked-in', 'Hesitant', 'Demanding Workload'] },
    { id: 'rollOut',    label: 'Roll Out',   options: [SKIP_VALUE, 'Target', 'Undershoot', 'Overshoot'] },
  ],
  'Pitch and Roll Tracking': [
    { id: 'grossAcquisition', label: 'Gross Acquisition', options: [SKIP_VALUE, 'Steady', 'Sluggish', 'Abrupt'] },
    { id: 'fineTracking',     label: 'Fine Tracking',     options: [SKIP_VALUE, 'Pinpoint Precision', 'Drifting', 'Jumpy'] },
    { id: 'dynamicTracking',  label: 'Dynamic Tracking',  options: [SKIP_VALUE, 'Stays with Target', 'Falls Behind Target', 'Too Aggressive'] },
    { id: 'taskTermination',  label: 'Task Termination',  options: [SKIP_VALUE, 'Smooth', 'Moderate', 'Harsh'] },
  ],
  'Coordinated Turn': [
    { id: 'initiation',            label: 'Initiation',               options: [SKIP_VALUE, 'Harmonious', 'Light', 'Fatiguing'] },
    { id: 'capture',               label: 'Capture',                  options: [SKIP_VALUE, 'Deadbeat', 'Underdamped', 'Oscillatory'] },
    { id: 'hold',                  label: 'Hold',                     options: [SKIP_VALUE, 'Center', 'Slip Tendency', 'Skid Tendency'] },
    { id: 'rollOutHeadingCapture', label: 'Roll Out Heading Capture', options: [SKIP_VALUE, 'Target', 'Undershoot', 'Overshoot'] },
  ],
  'Pitch Angle Capture and Hold': [
    { id: 'initiation', label: 'Initiation', options: [SKIP_VALUE, 'Harmonious', 'Too Light', 'Heavy'] },
    { id: 'capture',    label: 'Capture',    options: [SKIP_VALUE, 'Deadbeat', 'Underdamped', 'Oscillatory'] },
    { id: 'hold',       label: 'Hold',       options: [SKIP_VALUE, 'Locked-in', 'Hesitant', 'Demanding Workload'] },
    { id: 'recovery',   label: 'Recovery',   options: [SKIP_VALUE, 'Smooth', 'Moderate', 'Harsh'] },
  ],
  'Pitch Tracking': [
    { id: 'grossAcquisition', label: 'Gross Acquisition', options: [SKIP_VALUE, 'Natural', 'Unpredictable', 'Too Aggressive'] },
    { id: 'fineTracking',     label: 'Fine Tracking',     options: [SKIP_VALUE, 'Precise', 'Undershoot', 'Jumpy'] },
    { id: 'dynamicTracking',  label: 'Dynamic Tracking',  options: [SKIP_VALUE, 'Stays with Target', 'Falls Behind Target', 'Too Aggressive'] },
    { id: 'taskTermination',  label: 'Task Termination',  options: [SKIP_VALUE, 'Smooth', 'Moderate', 'Harsh'] },
  ],
  'Level Acceleration': [
    { id: 'powerApplication',       label: 'Power Application',        options: [SKIP_VALUE, 'Neutral', 'Left Yaw', 'Right Yaw'] },
    { id: 'dynamicAcceleration',    label: 'Dynamic Acceleration',     options: [SKIP_VALUE, 'Manageable', 'Unpredictable', 'Heavy Rudder'] },
    { id: 'targetSpeedCapture',     label: 'Target Speed Capture',     options: [SKIP_VALUE, 'Predictable', 'Slow', 'Abrupt'] },
    { id: 'highSpeedStabilization', label: 'High Speed Stabilization', options: [SKIP_VALUE, 'Easy', 'Difficult', 'Sensitive'] },
  ],
  'Level Deceleration': [
    { id: 'highSpeedStabilization', label: 'High Speed Stabilization', options: [SKIP_VALUE, 'Easy', 'Difficult', 'Sensitive'] },
    { id: 'initiation',            label: 'Initiation',               options: [SKIP_VALUE, 'Predictable', 'Very Slow', 'Abrupt'] },
    { id: 'dynamicDeceleration',   label: 'Dynamic Deceleration',     options: [SKIP_VALUE, 'Manageable', 'Unpredictable', 'Heavy Rudder'] },
    { id: 'targetSpeedCapture',    label: 'Target Speed Capture',     options: [SKIP_VALUE, 'Predictable', 'Slow', 'Abrupt'] },
  ],
  'Inverted Flight': [
    { id: 'rollInitiation',       label: 'Roll Initiation',       options: [SKIP_VALUE, 'Moderate', 'Slow', 'Abrupt'] },
    { id: 'invertedCapture',      label: 'Inverted Capture',      options: [SKIP_VALUE, 'Holds', 'Sinks', 'Over-Push'] },
    { id: 'steadyState',          label: 'Steady State',          options: [SKIP_VALUE, 'Stable', 'Neutrally', 'Divergent'] },
    { id: 'controlEffectiveness', label: 'Control Effectiveness', options: [SKIP_VALUE, 'Effective', 'Sluggish', 'Sensitive'] },
    { id: 'recovery',             label: 'Recovery',              options: [SKIP_VALUE, 'Symmetric to Entry', 'Slower than Entry', 'Faster than Entry'] },
  ],
  'Landing Gear Transition': [
    { id: 'initiation',           label: 'Initiation',                options: [SKIP_VALUE, 'None', 'Nose Drop', 'Nose Up'] },
    { id: 'clawTransition',       label: 'Claw Transition',           options: [SKIP_VALUE, 'Ideal', 'Insufficient', 'Excessive'] },
    { id: 'transientPitchChange', label: 'Transient in Pitch Change', options: [SKIP_VALUE, 'Manageable', 'Slow', 'Abrupt'] },
    { id: 'stabilization',        label: 'Stabilization (Speed)',     options: [SKIP_VALUE, 'Expected Drag', 'Massive Drag', 'Minimal Drag'] },
  ],
  '1-G Stabilized Push Over': [
    { id: 'pushOverInitiation', label: 'Push Over Initiation', options: [SKIP_VALUE, 'Proportional', 'Light', 'Heavy'] },
    { id: 'targetCapture',      label: 'Target Capture',       options: [SKIP_VALUE, 'Deadbeat', 'Oscillates', 'Hard Stop'] },
    { id: 'dive',               label: 'Dive',                 options: [SKIP_VALUE, 'Proportional', 'Sluggish', 'Abrupt'] },
    { id: 'recoveryPullForce',  label: 'Recovery Pull Force',  options: [SKIP_VALUE, 'Symmetric to Push', 'Lighter than Push', 'Heavier than Push'] },
  ],
};

const DEFAULT_DYNAMIC_CRITERIA: QualitativeCriterion[] = [
  { id: 'initiation', label: 'Initiation', options: [SKIP_VALUE, 'Harmonious', 'Light', 'Fatiguing'] },
  { id: 'capture',    label: 'Capture',    options: [SKIP_VALUE, 'Deadbeat', 'Underdamped', 'Oscillatory'] },
  { id: 'hold',       label: 'Hold',       options: [SKIP_VALUE, 'Locked-in', 'Hesitant', 'Demanding Workload'] },
  { id: 'rollOut',    label: 'Roll Out',   options: [SKIP_VALUE, 'On-target', 'Undershoot', 'Overshoot'] },
];

export function getManeuverCriteria(maneuverName: string | null): QualitativeCriterion[] {
  if (!maneuverName) return DEFAULT_DYNAMIC_CRITERIA;
  return DYNAMIC_CRITERIA_MAP[maneuverName] ?? DEFAULT_DYNAMIC_CRITERIA;
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

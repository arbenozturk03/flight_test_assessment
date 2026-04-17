import type { QualitativeCriterion, Evaluation, TestPointData } from './types';
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
  'Crosswind Landing',
  'Crosswind Take Off',
  'Inverted Flight',
  'Inverted Flight with Pull Up',
  'Landing',
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
  'Take Off',
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
  'Crosswind Landing': 'CWL',
  'Crosswind Take Off': 'CWTO',
  'Inverted Flight': 'IF',
  'Inverted Flight with Pull Up': 'IFPU',
  'Landing': 'LDG',
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
  'Take Off': 'TO',
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
  { id: 'trim', label: 'Trim', options: RATING_1_5,
    pdfLabels: { '1': 'Effortless', '2': 'Straightforward', '3': 'Manageable', '4': 'Cumbersome', '5': 'Compensation' },
    longDescriptions: {
      '1': 'Control forces are trimmed out instantly with high precision. The trim mechanism has ideal response speed and full authority. No additional pilot compensation is needed to maintain balance during entry conditions or target bank angle. Cognitive workload is minimal.',
      '2': 'Trimming out control forces is predictable and straightforward. Only one or two small fine adjustments may be needed to reach the zero-force point. Trim response is linear and maneuver stability is easily maintained with low pilot workload.',
      '3': 'Fully trimming out control forces requires repeated trim inputs. Slight system lag or sensitivity deviations require attention to keep the aircraft balanced. The pilot must actively remain in the control loop. Target parameters are met but with moderate pilot workload.',
      '4': 'Achieving balance is notably difficult and requires significant pilot compensation. The trim system gives unpredictable responses such as excessive sensitivity or weak authority. Even when forces appear trimmed, a persistent drift tendency is observed. Pilot focus shifts from maneuver execution to maintaining balance.',
      '5': 'The aircraft cannot be trimmed in the relevant flight condition or at the targeted bank angle. Trim authority is fully exhausted or the system is non-functional. The pilot must continuously apply high physical force on controls to maintain balance. This creates an unacceptable level of workload.',
    },
  },
  { id: 'stickForces', label: 'Stick Forces', options: RATING_1_5,
    pdfLabels: { '1': 'Harmonious', '2': 'Balanced', '3': 'Low', '4': 'Disproportionate', '5': 'High' },
    longDescriptions: {
      '1': 'The forces applied on the flight controls are in perfect harmony with the characteristics of the targeted maneuver. Stick forces are neither light enough to cause over-sensitivity nor heavy enough to require effort; the pilot can execute the maneuver with high precision without experiencing any physical fatigue.',
      '2': 'Control forces are appropriate and balanced for maneuver requirements. The resistance felt in the flight controllers during stick inputs is sufficient for the pilot to perceive the aircraft\'s aerodynamic limits, yet does not create any physical difficulty or attention split. Workload continues at a low level with task safety maintained.',
      '3': 'The forces required to apply on the flight controls to execute the maneuver are at a noticeable level. Maintaining targeted flight parameters and directing the aircraft requires the pilot to expend a perceptible physical effort. The task can be completed successfully, but especially during prolonged test points, there is potential for inducing fatigue.',
      '4': 'Stick forces are well above the expected standards for the targeted maneuver and require serious physical strength to direct the aircraft. The heaviness in the controllers makes fine adjustment difficult for the pilot and directly and adversely affects the ability to maintain precise flight parameters and mission quality.',
      '5': 'The forces required to apply on the flight controls strain the pilot\'s physical limits to an extreme degree. The maximum muscular force expended to achieve the desired aerodynamic response and keep the aircraft on track renders the aircraft uncontrollable with safety, necessitating immediate termination of the test point.',
    },
  },
  { id: 'controlHarmony', label: 'Control Harmony', options: RATING_1_5,
    pdfLabels: { '1': 'Fully Harmonious', '2': 'Integrated', '3': 'Adequate', '4': 'Disjointed', '5': 'Disconnected' },
    longDescriptions: {
      '1': 'Flight controls (stick and pedal inputs) are in perfect harmony. The aircraft provides simultaneous, proportional, and seamless aerodynamic response across all axes. Control forces and displacements are in complete unity with the pilot\'s natural reflexes. No additional pilot effort is needed for maneuvers requiring coordination.',
      '2': 'Flight controls work together in a consistent and connected manner. Unwanted inter-axis aerodynamic interactions are minimal and can be intuitively managed by the pilot. The cross-control inputs required to keep the aircraft coordinated (e.g., sideslip compensation due to roll) are minor and feel natural.',
      '3': 'The harmony between control axes is at a sufficient level for task completion and flight safety. However, force or response mismatch may be felt in some axes. During maneuvers, the pilot must show conscious attention and compensatory effort to keep the aircraft coordinated and prevent unwanted deviations.',
      '4': 'There is a noticeable disconnect and mismatch between flight controls. A control input applied in one axis triggers severe and unwanted responses in other axes. Aerodynamic forces are unbalanced, making it quite challenging and attention-dispersing for the pilot to maintain aircraft coordination.',
      '5': 'Control axes respond in a completely incompatible and disorderly manner to each other. Directing the aircraft as a whole is extremely difficult. The pilot is forced to apply continuous, independent, and excessively effortful control inputs to separately manage deviation in each axis and keep the aircraft on track. Control integrity has been completely lost.',
    },
  },
  { id: 'predictability', label: 'Predictability', shortLabel: 'Predict.', options: RATING_1_5,
    pdfLabels: { '1': 'Fully Transparent', '2': 'Predictable', '3': 'Expected', '4': 'Marginal', '5': 'Inconsistent' },
    longDescriptions: {
      '1': 'The aerodynamic and dynamic responses of the aircraft to control inputs are in perfect harmony with the pilot\'s expectations. The aircraft\'s behavior is completely transparent; the pilot can predict with certainty the response the aircraft will give at every stage of the maneuver. No unexpected change or surprise is experienced in flight parameters.',
      '2': 'The aircraft\'s responses are highly predictable and show consistency with the pilot\'s general expectations. Dynamic behavior patterns are clear and easily understood by the pilot. Even if very small deviations occur, they do not affect the course of the maneuver and can be intuitively compensated by the pilot.',
      '3': 'The aircraft\'s general behavior is within expected bounds, but small-scale non-linear responses may occasionally be observed. The pilot can grasp the aircraft\'s basic tendencies but must actively focus on flying and the aircraft\'s responses to keep these tendencies under control and prevent possible deviations.',
      '4': 'The predictability of the aircraft\'s responses to control inputs is at a borderline level. Frequent mismatches occur between the pilot\'s expectation and the aircraft\'s actual aerodynamic behavior. Unexpected attitude changes emerge and the pilot must be constantly alert to react to these sudden deviations. Workload increases noticeably.',
      '5': 'The aircraft\'s behavior is completely erratic and unpredictable. The same control input can produce entirely different aerodynamic responses at different times. The pilot cannot estimate in any way what the aircraft\'s next reaction will be. This makes controlling the aircraft extremely difficult and directly threatens flight safety.',
    },
  },
  { id: 'characteristic', label: 'Characteristic', shortLabel: 'Char.', options: RATING_1_5,
    pdfLabels: { '1': 'Ideal', '2': 'Desirable', '3': 'Insufficient', '4': 'Objectionable', '5': 'Excessive' },
    longDescriptions: {
      '1': 'The aircraft\'s flight characteristics are in perfect harmony with the relevant task requirements and aerodynamic design goals. Control responses and dynamic behaviors are maximally satisfying from the pilot\'s perspective, and the task is completed effortlessly.',
      '2': 'Flight characteristics are at a fairly good level and provide a desirable flying experience. Although small aerodynamic deviations may occur, they do not affect the task and are met with satisfaction by the pilot. Low workload and task executed safely.',
      '3': 'Flight characteristics are falling short. The desired aerodynamic responses cannot be fully achieved, and this adversely affects mission quality. The pilot must show conscious and moderate effort to achieve the expected performance.',
      '4': 'Flight characteristics are at an unacceptable and objectionable level. The aircraft\'s behavior is disturbing from the pilot\'s perspective and detrimental to the task. A serious aerodynamic or control system problem exists, requiring a high level of pilot compensation.',
      '5': 'Flight characteristics are severely degraded and out of control. The aircraft gives unpredictable and violent responses to commands. Flight safety is directly under threat; continuing the task is not possible and even the pilot\'s maximum effort remains insufficient.',
    },
  },
  { id: 'pilotCompensation', label: 'Pilot Compensation', options: RATING_1_5,
    pdfLabels: { '1': 'Minimal', '2': 'Negligible', '3': 'Moderate', '4': 'Significant', '5': 'Considerable' },
    longDescriptions: {
      '1': 'No additional corrective effort beyond the pilot\'s natural and routine control inputs is needed to achieve the targeted flight performance. The task is completed effortlessly thanks to the aircraft\'s inherent aerodynamic stability and control system proficiency.',
      '2': 'A very low level of corrective effort, nearly at reflex level, is sufficient for the pilot to achieve and maintain the desired performance. This compensatory effort does not affect the pilot\'s overall workload and does not create any notable difficulty in task execution.',
      '3': 'The pilot must demonstrate conscious, active, and sustained compensatory effort for the aircraft to meet task requirements. Sequential corrective commands applied to maintain expected flight parameters create a moderate level of cognitive and physical workload on the pilot.',
      '4': 'Intensive and extensive compensatory effort from the pilot is mandatory to overcome the aircraft\'s dynamic deficiencies and capture the targeted parameters. Continuous, broad, and attention-demanding interventions on the flight controls are required. This creates a seriously increased level of pilot workload during maneuver execution.',
      '5': 'Maximum mental and physical effort is required from the pilot to maintain control of the aircraft and continue the task. The pilot must devote full attention to maintaining balance, and even the slightest lack of compensation can cause the aircraft to depart from controlled flight. This creates an unacceptable level of workload that directly challenges flight safety.',
    },
  },
  { id: 'workload', label: 'Workload', options: RATING_1_5,
    pdfLabels: { '1': 'Tolerable', '2': 'Low', '3': 'Extensive', '4': 'Very High', '5': 'Intolerable' },
    longDescriptions: {
      '1': 'The physical and cognitive effort experienced by the pilot during task execution is completely acceptable and at a minimum level. Controlling the aircraft feels like a routine part of flying, and the pilot has ample spare mental capacity to monitor other test parameters.',
      '2': 'Pilot workload is at a low level. Performing the basic flight maneuver does not require excessive effort; it is fairly easy for the pilot to direct attention to other aspects of the task, and no fatigue develops during flight.',
      '3': 'The pilot must devote substantial and intensive attention to flight commands in order to carry out the flight task and maintain the aircraft\'s targeted parameters. Workload has increased noticeably and the pilot\'s spare mental capacity has narrowed; however, the task can still be completed safely.',
      '4': 'Nearly all of the pilot\'s physical and cognitive capacity is spent solely on controlling the aircraft and sustaining the maneuver. Workload is at a very high level; situational awareness degrades seriously, and it becomes very difficult to fulfill secondary test objectives.',
      '5': 'Workload has reached a dimension that exceeds the pilot\'s physical and mental limits and cannot be endured. Maintaining control of the aircraft consumes all capacity; continuing the test point directly jeopardizes flight safety and immediate cancellation of the maneuver is mandatory.',
    },
  },
];

// Dynamic panel (maneuver-specific – best → mid → worst)

/** Standard phase columns for matrix evaluation (all maneuvers) */
const STANDARD_PHASE_CRITERIA: QualitativeCriterion[] = [
  { id: 'initiation',  label: 'Initiation',  options: RATING_1_5, pdfLabels: { '1': 'Harmonious', '2': 'Crisp', '3': 'Light', '4': 'Sluggish', '5': 'Fatiguing' } },
  { id: 'capture',     label: 'Capture',     options: RATING_1_5, pdfLabels: { '1': 'Deadbeat', '2': 'Snappy', '3': 'Underdamped', '4': 'Slow Damping', '5': 'Oscillatory' } },
  { id: 'steadyState', label: 'Steady State', options: RATING_1_5, pdfLabels: { '1': 'Locked-in', '2': 'Solid', '3': 'Hesitant', '4': 'Unstable', '5': 'Demanding Workload' } },
  { id: 'recovery',    label: 'Recovery',    options: RATING_1_5, pdfLabels: { '1': 'On-target', '2': 'Precise', '3': 'Undershoot', '4': 'Significant Error', '5': 'Overshoot' } },
];

/** All maneuvers support the matrix evaluation (handling rows × phase columns). */
export function isMatrixManeuver(name: string | null | undefined): boolean {
  return name != null;
}

export type HandlingEvalMode = 'sequential' | 'tree' | 'matrix';

/**
 * Matrix TP: sequential = direct selectors; tree = FTA decision trees; matrix = grid.
 * Migrates deprecated `matrixEvalPresentation` (`direct` → matrix, `flowchart` → sequential).
 */
export function getHandlingEvalMode(
  tp: Pick<TestPointData, 'handlingEvalMode' | 'matrixEvalPresentation'> | undefined | null,
): HandlingEvalMode {
  const m = tp?.handlingEvalMode;
  if (m === 'matrix' || m === 'sequential' || m === 'tree') return m;
  const leg = tp?.matrixEvalPresentation;
  if (leg === 'flowchart') return 'sequential';
  if (leg === 'direct') return 'matrix';
  return 'sequential';
}

/** True when this TP uses the phase × handling matrix (matrix maneuver + mode matrix). */
export function isMatrixGridPresentation(
  maneuverName: string | null | undefined,
  mode: HandlingEvalMode,
): boolean {
  return isMatrixManeuver(maneuverName) && mode === 'matrix';
}

export function getManeuverCriteria(_maneuverName: string | null): QualitativeCriterion[] {
  return STANDARD_PHASE_CRITERIA;
}

/** Matrix evaluation separator */
export const MATRIX_SEP = '__';

/** Handling criteria row order for the evaluation matrix (matches UI + classic handling: trim → stick forces → control harmony …) */
export const MATRIX_HANDLING_ORDER: string[] = [
  'trim',
  'stickForces',
  'controlHarmony',
  'predictability',
  'characteristic',
  'pilotCompensation',
  'workload',
];

/** Convert a numeric rating to its descriptive PDF text with the numeric value, e.g. "Harmonious (5)" */
export function resolvePdfLabel(criterion: QualitativeCriterion, value: string | number | null): string {
  if (value == null) return 'N/A';
  const str = String(value);
  if (str === SKIP_VALUE) return 'N/A';
  const label = criterion.pdfLabels?.[str];
  return label ? `${label} (${str})` : str;
}

export function createDefaultEvaluation(): Evaluation {
  return {
    pio: null,
    chr: null,
    ...Object.fromEntries(HANDLING_CRITERIA.map((c) => [c.id, null])),
  } as Evaluation;
}

export function isEvaluationComplete(
  ev: Evaluation,
  maneuverName?: string | null,
  handlingMode?: HandlingEvalMode | null,
): boolean {
  if (ev.pio == null || ev.chr == null) return false;
  const mn = maneuverName ?? null;

  if (isMatrixGridPresentation(mn, handlingMode ?? 'sequential')) {
    // Matrix mode: empty cells are treated as N/O, not errors
    return true;
  } else {
    for (const c of HANDLING_CRITERIA) {
      if (ev[c.id as keyof Evaluation] == null) return false;
    }
    for (const c of getManeuverCriteria(mn)) {
      if (ev[c.id] == null) return false;
    }
  }
  return true;
}

export function getMissingFieldLabels(
  ev: Evaluation,
  maneuverName?: string | null,
  handlingMode?: HandlingEvalMode | null,
): string[] {
  const missing: string[] = [];
  if (ev.pio == null) missing.push('PIO');
  if (ev.chr == null) missing.push('CHR');
  const mn = maneuverName ?? null;

  if (!isMatrixGridPresentation(mn, handlingMode ?? 'sequential')) {
    HANDLING_CRITERIA.forEach((c) => {
      if (ev[c.id as keyof Evaluation] == null) missing.push(c.label);
    });
    getManeuverCriteria(mn).forEach((c) => {
      if (ev[c.id] == null) missing.push(c.label);
    });
  }
  return missing;
}

export function getMissingFieldIds(
  ev: Evaluation,
  maneuverName?: string | null,
  handlingMode?: HandlingEvalMode | null,
): string[] {
  const missing: string[] = [];
  if (ev.pio == null) missing.push('pio');
  if (ev.chr == null) missing.push('chr');
  const mn = maneuverName ?? null;

  if (!isMatrixGridPresentation(mn, handlingMode ?? 'sequential')) {
    HANDLING_CRITERIA.forEach((c) => {
      if (ev[c.id as keyof Evaluation] == null) missing.push(c.id);
    });
    getManeuverCriteria(mn).forEach((c) => {
      if (ev[c.id] == null) missing.push(c.id);
    });
  }
  return missing;
}

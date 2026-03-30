import type { QualitativeCriterion, Evaluation, RatingDescription, DecisionNode } from './types';
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

/** Trim is evaluated separately from other handling criteria and displayed first in the UI/PDF. */
export const TRIM_CRITERION: QualitativeCriterion = {
  id: 'trim', label: 'Trim', options: RATING_1_5,
  pdfLabels: { '5': 'Effortless', '4': 'Straightforward', '3': 'Manageable', '2': 'Cumbersome', '1': 'Compensation' },
  ratingDescriptions: {
    '5': { label: 'Effortless', description: 'Control forces are trimmed out instantly with high precision. The trim mechanism has ideal response speed and full authority. No additional pilot compensation is needed to maintain balance during entry conditions or target bank angle. Cognitive workload is minimal.' },
    '4': { label: 'Straightforward', description: 'Trimming out control forces is predictable and straightforward. Only one or two small fine adjustments may be needed to reach the zero-force point. Trim response is linear and maneuver stability is easily maintained with low pilot workload.' },
    '3': { label: 'Manageable', description: 'Fully trimming out control forces requires repeated trim inputs. Slight system lag or sensitivity deviations require attention to keep the aircraft balanced. The pilot must actively remain in the control loop. Target parameters are met but with moderate pilot workload.' },
    '2': { label: 'Cumbersome', description: 'Achieving balance is notably difficult and requires significant pilot compensation. The trim system gives unpredictable responses such as excessive sensitivity or weak authority. Even when forces appear trimmed, a persistent drift tendency is observed. Pilot focus shifts from maneuver execution to maintaining balance.' },
    '1': { label: 'Compensation', description: 'The aircraft cannot be trimmed in the relevant flight condition or at the targeted bank angle. Trim authority is fully exhausted or the system is non-functional. The pilot must continuously apply high physical force on controls to maintain balance. This creates an unacceptable level of workload.' },
  },
};

const CONTROL_HARMONY_DESCRIPTIONS: Record<string, RatingDescription> = {
  '5': { label: 'Fully Harmonious', description: 'Flight controls (stick and pedal inputs) are in perfect harmony. The aircraft provides simultaneous, proportional, and seamless aerodynamic response across all axes. Control forces and displacements are in complete unity with the pilot\'s natural reflexes. No additional pilot effort is needed for maneuvers requiring coordination.' },
  '4': { label: 'Integrated', description: 'Flight controls work together in a consistent and connected manner. Unwanted inter-axis aerodynamic interactions are minimal and can be intuitively managed by the pilot. The cross-control inputs required to keep the aircraft coordinated (e.g., sideslip compensation due to roll) are minor and feel natural.' },
  '3': { label: 'Adequate', description: 'The harmony between control axes is at a sufficient level for task completion and flight safety. However, force or response mismatch may be felt in some axes. During maneuvers, the pilot must show conscious attention and compensatory effort to keep the aircraft coordinated and prevent unwanted deviations.' },
  '2': { label: 'Disjointed', description: 'There is a noticeable disconnect and mismatch between flight controls. A control input applied in one axis triggers severe and unwanted responses in other axes. Aerodynamic forces are unbalanced, making it quite challenging and attention-dispersing for the pilot to maintain aircraft coordination.' },
  '1': { label: 'Disconnected', description: 'Control axes respond in a completely incompatible and disorderly manner to each other. Directing the aircraft as a whole is extremely difficult. The pilot is forced to apply continuous, independent, and excessively effortful control inputs to separately manage deviation in each axis and keep the aircraft on track. Control integrity has been completely lost.' },
};

const PREDICTABILITY_DESCRIPTIONS: Record<string, RatingDescription> = {
  '5': { label: 'Fully Transparent', description: 'The aerodynamic and dynamic responses of the aircraft to control inputs are in perfect harmony with the pilot\'s expectations. The aircraft\'s behavior is completely transparent; the pilot can predict with certainty the response the aircraft will give at every stage of the maneuver. No unexpected change or surprise is experienced in flight parameters.' },
  '4': { label: 'Predictable', description: 'The aircraft\'s responses are highly predictable and show consistency with the pilot\'s general expectations. Dynamic behavior patterns are clear and easily understood by the pilot. Even if very small deviations occur, they do not affect the course of the maneuver and can be intuitively compensated by the pilot.' },
  '3': { label: 'Expected', description: 'The aircraft\'s general behavior is within expected bounds, but small-scale non-linear responses may occasionally be observed. The pilot can grasp the aircraft\'s basic tendencies but must actively focus on flying and the aircraft\'s responses to keep these tendencies under control and prevent possible deviations.' },
  '2': { label: 'Marginal', description: 'The predictability of the aircraft\'s responses to control inputs is at a borderline level. Frequent mismatches occur between the pilot\'s expectation and the aircraft\'s actual aerodynamic behavior. Unexpected attitude changes emerge and the pilot must be constantly alert to react to these sudden deviations. Workload increases noticeably.' },
  '1': { label: 'Inconsistent', description: 'The aircraft\'s behavior is completely erratic and unpredictable. The same control input can produce entirely different aerodynamic responses at different times. The pilot cannot estimate in any way what the aircraft\'s next reaction will be. This makes controlling the aircraft extremely difficult and directly threatens flight safety.' },
};

const PILOT_COMPENSATION_DESCRIPTIONS: Record<string, RatingDescription> = {
  '5': { label: 'Minimal', description: 'No additional corrective effort beyond the pilot\'s natural and routine control inputs is needed to achieve the targeted flight performance. The task is completed effortlessly thanks to the aircraft\'s inherent aerodynamic stability and control system proficiency.' },
  '4': { label: 'Negligible', description: 'A very low level of corrective effort, nearly at reflex level, is sufficient for the pilot to achieve and maintain the desired performance. This compensatory effort does not affect the pilot\'s overall workload and does not create any notable difficulty in task execution.' },
  '3': { label: 'Moderate', description: 'The pilot must demonstrate conscious, active, and sustained compensatory effort for the aircraft to meet task requirements. Sequential corrective commands applied to maintain expected flight parameters create a moderate level of cognitive and physical workload on the pilot.' },
  '2': { label: 'Significant', description: 'Intensive and extensive compensatory effort from the pilot is mandatory to overcome the aircraft\'s dynamic deficiencies and capture the targeted parameters. Continuous, broad, and attention-demanding interventions on the flight controls are required. This creates a seriously increased level of pilot workload during maneuver execution.' },
  '1': { label: 'Considerable', description: 'Maximum mental and physical effort is required from the pilot to maintain control of the aircraft and continue the task. The pilot must devote full attention to maintaining balance, and even the slightest lack of compensation can cause the aircraft to depart from controlled flight. This creates an unacceptable level of workload that directly challenges flight safety.' },
};

const WORKLOAD_DESCRIPTIONS: Record<string, RatingDescription> = {
  '5': { label: 'Tolerable', description: 'The physical and cognitive effort experienced by the pilot during task execution is completely acceptable and at a minimum level. Controlling the aircraft feels like a routine part of flying, and the pilot has ample spare mental capacity to monitor other test parameters.' },
  '4': { label: 'Low', description: 'Pilot workload is at a low level. Performing the basic flight maneuver does not require excessive effort; it is fairly easy for the pilot to direct attention to other aspects of the task, and no fatigue develops during flight.' },
  '3': { label: 'Extensive', description: 'The pilot must devote substantial and intensive attention to flight commands in order to carry out the flight task and maintain the aircraft\'s targeted parameters. Workload has increased noticeably and the pilot\'s spare mental capacity has narrowed; however, the task can still be completed safely.' },
  '2': { label: 'Very High', description: 'Nearly all of the pilot\'s physical and cognitive capacity is spent solely on controlling the aircraft and sustaining the maneuver. Workload is at a very high level; situational awareness degrades seriously, and it becomes very difficult to fulfill secondary test objectives.' },
  '1': { label: 'Intolerable', description: 'Workload has reached a dimension that exceeds the pilot\'s physical and mental limits and cannot be endured. Maintaining control of the aircraft consumes all capacity; continuing the test point directly jeopardizes flight safety and immediate cancellation of the maneuver is mandatory.' },
};

const STICK_FORCES_DESCRIPTIONS: Record<string, RatingDescription> = {
  '5': { label: 'Optimal', description: 'The forces applied on the flight controls are in perfect harmony with the characteristics of the targeted maneuver. Stick forces are neither light enough to cause over-sensitivity nor heavy enough to require effort; the pilot can execute the maneuver with high precision without experiencing any physical fatigue.' },
  '4': { label: 'Well-proportioned', description: 'Control forces are appropriate and balanced for maneuver requirements. The resistance felt in the flight controllers during stick inputs is sufficient for the pilot to perceive the aircraft\'s aerodynamic limits, yet does not create any physical difficulty or attention split. Workload continues at a low level with task safety maintained.' },
  '3': { label: 'Noticeable', description: 'The forces required to apply on the flight controls to execute the maneuver are at a noticeable level. Maintaining targeted flight parameters and directing the aircraft requires the pilot to expend a perceptible physical effort. The task can be completed successfully, but especially during prolonged test points, there is potential for inducing fatigue.' },
  '2': { label: 'Heavy', description: 'Stick forces are well above the expected standards for the targeted maneuver and require serious physical strength to direct the aircraft. The heaviness in the controllers makes fine adjustment difficult for the pilot and directly and adversely affects the ability to maintain precise flight parameters and mission quality.' },
  '1': { label: 'Excessive', description: 'The forces required to apply on the flight controls strain the pilot\'s physical limits to an extreme degree. The maximum muscular force expended to achieve the desired aerodynamic response and keep the aircraft on track renders the aircraft uncontrollable with safety, necessitating immediate termination of the test point.' },
};

const CHARACTERISTIC_DESCRIPTIONS: Record<string, RatingDescription> = {
  '5': { label: 'Ideal', description: 'The aircraft\'s flight characteristics are in perfect harmony with the relevant task requirements and aerodynamic design goals. Control responses and dynamic behaviors are maximally satisfying from the pilot\'s perspective, and the task is completed effortlessly.' },
  '4': { label: 'Desirable', description: 'Flight characteristics are at a fairly good level and provide a desirable flying experience. Although small aerodynamic deviations may occur, they do not affect the task and are met with satisfaction by the pilot. Low workload and task executed safely.' },
  '3': { label: 'Insufficient', description: 'Flight characteristics are falling short. The desired aerodynamic responses cannot be fully achieved, and this adversely affects mission quality. The pilot must show conscious and moderate effort to achieve the expected performance.' },
  '2': { label: 'Objectionable', description: 'Flight characteristics are at an unacceptable and objectionable level. The aircraft\'s behavior is disturbing from the pilot\'s perspective and detrimental to the task. A serious aerodynamic or control system problem exists, requiring a high level of pilot compensation.' },
  '1': { label: 'Excessive', description: 'Flight characteristics are severely degraded and out of control. The aircraft gives unpredictable and violent responses to commands. Flight safety is directly under threat; continuing the task is not possible and even the pilot\'s maximum effort remains insufficient.' },
};

/** Standard handling criteria (excluding Trim which is rendered separately). */
export const HANDLING_CRITERIA: QualitativeCriterion[] = [
  { id: 'controlHarmony',    label: 'Control Harmony',    options: RATING_1_5, pdfLabels: { '5': 'Fully Harmonious', '4': 'Integrated', '3': 'Adequate', '2': 'Disjointed', '1': 'Disconnected' }, ratingDescriptions: CONTROL_HARMONY_DESCRIPTIONS },
  { id: 'predictability',    label: 'Predictability',     shortLabel: 'Predict.', options: RATING_1_5, pdfLabels: { '5': 'Fully Transparent', '4': 'Predictable', '3': 'Expected', '2': 'Marginal', '1': 'Inconsistent' }, ratingDescriptions: PREDICTABILITY_DESCRIPTIONS },
  { id: 'pilotCompensation', label: 'Pilot Compensation', options: RATING_1_5, pdfLabels: { '5': 'Minimal', '4': 'Negligible', '3': 'Moderate', '2': 'Significant', '1': 'Considerable' }, ratingDescriptions: PILOT_COMPENSATION_DESCRIPTIONS },
  { id: 'workload',          label: 'Workload',           options: RATING_1_5, pdfLabels: { '5': 'Tolerable', '4': 'Low', '3': 'Extensive', '2': 'Very High', '1': 'Intolerable' }, ratingDescriptions: WORKLOAD_DESCRIPTIONS },
  { id: 'stickForces',       label: 'Stick Forces',       options: RATING_1_5, pdfLabels: { '5': 'Harmonious', '4': 'Balanced', '3': 'Low', '2': 'Disproportionate', '1': 'High' }, ratingDescriptions: STICK_FORCES_DESCRIPTIONS },
  { id: 'characteristic',    label: 'Characteristic',     shortLabel: 'Char.', options: RATING_1_5, pdfLabels: { '5': 'Ideal', '4': 'Desirable', '3': 'Insufficient', '2': 'Objectionable', '1': 'Excessive' }, ratingDescriptions: CHARACTERISTIC_DESCRIPTIONS },
];

/** All standard criteria including Trim (for validation/completeness checks). */
export const ALL_STANDARD_CRITERIA: QualitativeCriterion[] = [TRIM_CRITERION, ...HANDLING_CRITERIA];

/** PIO (Pilot Induced Oscillation) rating descriptions — 1-6 scale */
export const PIO_DESCRIPTIONS: Record<string, RatingDescription> = {
  '1': { label: 'No PIO', description: 'No tendency for pilot to induce undesirable motions.' },
  '2': { label: 'No PIO — Mild', description: 'Undesirable motions tend to occur when the pilot initiates abrupt maneuvers or attempts tight control. Oscillations are very mild and appropriate control techniques can be easily developed.' },
  '3': { label: 'PIO Tendency', description: 'Undesirable motions are easily induced when the pilot initiates abrupt maneuvers or attempts tight control. Oscillations are noticeable and require attention to suppress.' },
  '4': { label: 'PIO Present', description: 'Oscillations tend to develop when the pilot initiates abrupt maneuvers or attempts tight control. The pilot must reduce gain or abandon the task to suppress oscillations.' },
  '5': { label: 'Severe PIO', description: 'Divergent oscillations result from the pilot attempting to control the aircraft. The pilot must open the control loop (release the stick) to recover.' },
  '6': { label: 'Catastrophic PIO', description: 'Disturbance or normal pilot control input causes divergent oscillations. The aircraft motion cannot be controlled by the pilot.' },
};

/** CHR (Cooper-Harper Rating) descriptions — 1-10 scale */
export const CHR_DESCRIPTIONS: Record<string, RatingDescription> = {
  '1': { label: 'Excellent', description: 'Highly desirable. Pilot compensation is not a factor for desired performance.' },
  '2': { label: 'Good', description: 'Negligible deficiencies. Pilot compensation is not a factor for desired performance.' },
  '3': { label: 'Fair', description: 'Some mildly unpleasant deficiencies. Minimal pilot compensation is required for desired performance.' },
  '4': { label: 'Minor Deficiencies', description: 'Minor but annoying deficiencies. Desired performance requires moderate pilot compensation.' },
  '5': { label: 'Moderate Deficiencies', description: 'Moderately objectionable deficiencies. Adequate performance requires considerable pilot compensation.' },
  '6': { label: 'Very Objectionable', description: 'Very objectionable but tolerable deficiencies. Adequate performance requires extensive pilot compensation.' },
  '7': { label: 'Major Deficiencies', description: 'Major deficiencies. Adequate performance is not attainable with maximum tolerable pilot compensation. Controllability not in question.' },
  '8': { label: 'Major — Requires Compensation', description: 'Major deficiencies. Considerable pilot compensation is required for control.' },
  '9': { label: 'Major — Intense Compensation', description: 'Major deficiencies. Intense pilot compensation is required to retain control.' },
  '10': { label: 'Loss of Control', description: 'Major deficiencies. Control will be lost during some portion of the required operation.' },
};

/** PIO decision tree — standard Pilot-Induced Oscillation rating flowchart (5 steps max).
 *  Convention: Yes is always first (left), No is always second (right).
 *  Sentiment: positive = green (less severe path), negative = red (more severe path). */
export const PIO_DECISION_TREE: DecisionNode = {
  question: 'Were there any undesirable motions during the task?',
  context: 'Pilot attempts to enter control loop',
  options: [
    { label: 'Yes', sentiment: 'negative', next: {
      question: 'Did the undesirable motions tend to occur when you initiated abrupt maneuvers or attempted tight control?',
      context: 'Undesirable motions were observed',
      options: [
        { label: 'Yes', sentiment: 'positive', next: {
          question: 'Were you able to develop appropriate control techniques to suppress the oscillations?',
          context: 'Motions during abrupt maneuvers / tight control',
          options: [
            { label: 'Yes', sentiment: 'positive', next: 2 },
            { label: 'No', sentiment: 'negative', next: 3 },
          ],
        }},
        { label: 'No', sentiment: 'negative', next: {
          question: 'Can you stop the oscillations by reducing your gain or abandoning the task?',
          context: 'Motions occur during normal pilot control',
          options: [
            { label: 'Yes', sentiment: 'positive', next: 4 },
            { label: 'No', sentiment: 'negative', next: {
              question: 'Can you recover by releasing the controls (opening the control loop)?',
              context: 'Divergent oscillations during control',
              options: [
                { label: 'Yes', sentiment: 'positive', next: 5 },
                { label: 'No', sentiment: 'negative', next: 6 },
              ],
            }},
          ],
        }},
      ],
    }},
    { label: 'No', sentiment: 'positive', next: 1 },
  ],
};
export const PIO_TOTAL_STEPS = 5;

/** CHR decision tree — standard Cooper-Harper Handling Qualities rating flowchart (3 main steps + sub-selection) */
export const CHR_DECISION_TREE: DecisionNode = {
  question: 'Is it controllable?',
  options: [
    { label: 'Yes', sentiment: 'positive', next: {
      question: 'Is adequate performance attainable with a tolerable pilot workload?',
      context: 'Aircraft is controllable',
      options: [
        { label: 'Yes', sentiment: 'positive', next: {
          question: 'Is it satisfactory without improvement?',
          context: 'Adequate performance is attainable',
          options: [
            { label: 'Yes', sentiment: 'positive', next: {
              question: 'Select the level that best describes the handling qualities:',
              context: 'Satisfactory without improvement',
              options: [
                { label: 'Excellent, highly desirable — pilot compensation not a factor for desired performance', next: 1 },
                { label: 'Good, negligible deficiencies — pilot compensation not a factor for desired performance', next: 2 },
                { label: 'Fair, some mildly unpleasant deficiencies — minimal pilot compensation required', next: 3 },
              ],
            }},
            { label: 'No', sentiment: 'negative', next: {
              question: 'Select the level that best describes the deficiency:',
              context: 'Deficiencies warrant improvement',
              options: [
                { label: 'Minor but annoying — desired performance requires moderate pilot compensation', next: 4 },
                { label: 'Moderately objectionable — adequate performance requires considerable pilot compensation', next: 5 },
                { label: 'Very objectionable but tolerable — adequate performance requires extensive pilot compensation', next: 6 },
              ],
            }},
          ],
        }},
        { label: 'No', sentiment: 'negative', next: {
          question: 'Select the level that best describes the deficiency:',
          context: 'Major deficiencies — adequate performance not attainable',
          options: [
            { label: 'Adequate performance not attainable with maximum tolerable compensation — controllability not in question', next: 7 },
            { label: 'Considerable pilot compensation is required for control', next: 8 },
            { label: 'Intense pilot compensation is required to retain control', next: 9 },
          ],
        }},
      ],
    }},
    { label: 'No', sentiment: 'negative', next: 10 },
  ],
};
export const CHR_TOTAL_STEPS = 3;

// Dynamic panel (maneuver-specific – best → mid → worst)

// Shared criteria arrays (doc Table 3: BACH & CT)
const INITIATION_DESCRIPTIONS: Record<string, RatingDescription> = {
  '5': { label: 'Harmonious', description: 'Lateral stick and pedal forces applied at maneuver initiation are in perfect harmony. The aircraft responds instantly and smoothly to control inputs. No additional correction is needed to achieve the desired roll rate. Cognitive and physical workload is minimal.' },
  '4': { label: 'Crisp', description: 'The aircraft responds to the roll command with a clear, crisp, and immediate reaction. There is predictable coordination between stick and pedal inputs. The targeted roll rate initiates directly, and low-level pilot attention is sufficient at maneuver start.' },
  '3': { label: 'Light', description: 'Initial response to the roll command is adequate but lateral control forces are lighter than expected. This may create a tendency to over-command at the start. The pilot must consciously focus on the controls to maintain coordination and achieve a smooth entry. Moderate pilot compensation is required.' },
  '2': { label: 'Sluggish', description: 'The aircraft response to the roll command is noticeably slow and sluggish. There is a perceptible delay between stick input and roll rate development. Significantly more control input than expected is required to initiate the targeted roll rate. High pilot compensation is needed for initial coordination.' },
  '1': { label: 'Fatiguing', description: 'Initiating the roll maneuver requires extremely high physical force. Lateral control forces are extremely heavy and the aircraft exhibits high resistance to commands. The pilot must exert continuous fatiguing physical effort to achieve the desired roll rate and maintain coordination. This creates an unacceptable workload.' },
};

const CAPTURE_DESCRIPTIONS: Record<string, RatingDescription> = {
  '5': { label: 'Deadbeat', description: 'When the target bank angle is reached, the aircraft settles at the desired angle instantly without any overshoot or oscillation. Roll rate termination is flawless and no corrective input from the pilot is needed. Dynamic response has ideal damping and workload is minimal.' },
  '4': { label: 'Snappy', description: 'The aircraft captures the target bank angle quickly and precisely. Aerodynamic response during roll rate arrest is crisp and the aircraft settles on target decisively. The desired parameter is captured with low workload and high predictability from the pilot\'s perspective.' },
  '3': { label: 'Underdamped', description: 'When the target bank angle is reached, the aircraft overshoots slightly beyond the target and exhibits brief oscillations before settling. The pilot must apply small corrective counter-inputs to stop the roll rate exactly at the desired point. Moderate pilot compensation is required.' },
  '2': { label: 'Slow Damping', description: 'The aircraft exhibits noticeable oscillations while trying to capture the target bank angle, and these oscillations take longer than normal to damp out. Stabilizing at the desired angle is difficult; the pilot must actively and continuously provide corrective commands. This creates a high level of workload.' },
  '1': { label: 'Oscillatory', description: 'The attempt to capture the target bank angle results in undamped or increasingly severe oscillations. The aircraft cannot be reliably stabilized at the desired angle and drifts persistently beyond the target in both directions. The pilot must continuously apply high-amplitude counter-commands to bring the roll rate under control. This creates an unacceptable level of workload.' },
};

const HOLD_DESCRIPTIONS: Record<string, RatingDescription> = {
  '5': { label: 'Locked-in', description: 'After capturing the target bank angle, the aircraft locks in at that angle with excellent stability. No deviation in altitude or roll rate is observed. Coordinated turn continues flawlessly. The pilot does not need to provide any corrective input to maintain bank angle or coordination. Cognitive workload is minimal.' },
  '4': { label: 'Solid', description: 'The aircraft exhibits high stability at the target bank angle. Flight parameters and turn coordination are highly reliable to maintain. Only rare and very small corrective inputs may be needed to stay at the desired angle. The aircraft shows predictable aerodynamic behavior and workload is low.' },
  '3': { label: 'Hesitant / Slip Tendency', description: 'Maintaining the target bank angle requires attention, and a tendency to drift out of the bank or change the angle is observed. During the turn, the aircraft tends to slip inward, requiring the pilot to actively apply rudder (pedal) and lateral control inputs for coordination. Flight parameters can be maintained but this generates a moderate level of pilot compensation.' },
  '2': { label: 'Unstable', description: 'The aircraft exhibits clear instability while maintaining the target bank angle. Persistent deviations occur in flight parameters and coordination begins to deteriorate. The pilot must apply frequent, firm, and noticeable corrective commands to hold the aircraft at the desired angle. The effort to maintain balance creates a high level of pilot compensation and workload.' },
  '1': { label: 'Demanding / Skid Tendency', description: 'Maintaining the aircraft at the target bank angle is extremely challenging both physically and mentally. A severe outward skid tendency develops during the turn and coordination is completely lost. The pilot must continuously apply broad, high-amplitude counter-commands on the flight controls to maintain altitude and bank angle. This creates an unacceptable level of pilot compensation.' },
};

const ROLLOUT_DESCRIPTIONS: Record<string, RatingDescription> = {
  '5': { label: 'Target', description: 'The roll-out maneuver is executed flawlessly and the aircraft transitions to the target heading value in straight-and-level flight precisely. No overshoot or undershoot is experienced. Dynamic response damps out instantly. The pilot needs no corrective input; cognitive, physical, and physiological workload is minimal.' },
  '4': { label: 'Precise', description: 'The aircraft reaches the target heading value with very high sensitivity. The transition to straight-and-level flight is clean and predictable. Only a single small corrective input on the flight controls may be needed to hold the target heading precisely. Maneuver stability is achieved with low pilot workload.' },
  '3': { label: 'Undershoot', description: 'During the roll-out, the aircraft shows a tendency to correct early, before reaching the target heading value. The pilot must intervene with an additional roll-axis input during the roll-out to seat the aircraft fully in the intended heading. Target parameters are achieved but this requires a moderate level of pilot compensation.' },
  '2': { label: 'Significant Error', description: 'During the roll-out maneuver, a noticeable and large deviation from the target heading value is observed. The aircraft is difficult to settle on the target heading; the pilot must apply pronounced, repetitive, and sequential corrective commands to capture the desired heading direction. This instability creates a high level of pilot compensation and workload.' },
  '1': { label: 'Overshoot', description: 'During the roll-out, the aircraft severely exceeds the target heading value and departs the planned track outward. Returning to the desired straight-and-level direction becomes extremely difficult and the pilot must apply aggressive, broad-amplitude counter-commands in the opposite direction. Dynamic control deficiency creates an unacceptable level of workload.' },
};

const BACH_CT_CRITERIA: QualitativeCriterion[] = [
  { id: 'initiation', label: 'Initiation', options: RATING_1_5, pdfLabels: { '5': 'Harmonious', '4': 'Crisp', '3': 'Light', '2': 'Sluggish', '1': 'Fatiguing' }, ratingDescriptions: INITIATION_DESCRIPTIONS },
  { id: 'capture',    label: 'Capture',    options: RATING_1_5, pdfLabels: { '5': 'Deadbeat', '4': 'Snappy', '3': 'Underdamped', '2': 'Slow Damping', '1': 'Oscillatory' }, ratingDescriptions: CAPTURE_DESCRIPTIONS },
  { id: 'hold',       label: 'Hold',       options: RATING_1_5, pdfLabels: { '5': 'Locked-in', '4': 'Solid', '3': 'Hesitant / Slip Tendency', '2': 'Unstable', '1': 'Demanding / Skid Tendency' }, ratingDescriptions: HOLD_DESCRIPTIONS },
  { id: 'rollOut',    label: 'Roll Out',   options: RATING_1_5, pdfLabels: { '5': 'Target', '4': 'Precise', '3': 'Undershoot', '2': 'Significant Error', '1': 'Overshoot' }, ratingDescriptions: ROLLOUT_DESCRIPTIONS },
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
  { id: 'initiation', label: 'Initiation', options: RATING_1_5, pdfLabels: { '5': 'Harmonious', '4': 'Crisp', '3': 'Light', '2': 'Sluggish', '1': 'Fatiguing' }, ratingDescriptions: INITIATION_DESCRIPTIONS },
  { id: 'capture',    label: 'Capture',    options: RATING_1_5, pdfLabels: { '5': 'Deadbeat', '4': 'Snappy', '3': 'Underdamped', '2': 'Slow Damping', '1': 'Oscillatory' }, ratingDescriptions: CAPTURE_DESCRIPTIONS },
  { id: 'hold',       label: 'Hold',       options: RATING_1_5, pdfLabels: { '5': 'Locked-in', '4': 'Solid', '3': 'Hesitant', '2': 'Unstable', '1': 'Demanding Workload' }, ratingDescriptions: HOLD_DESCRIPTIONS },
  { id: 'rollOut',    label: 'Roll Out',   options: RATING_1_5, pdfLabels: { '5': 'On-target', '4': 'Precise', '3': 'Undershoot', '2': 'Significant Error', '1': 'Overshoot' }, ratingDescriptions: ROLLOUT_DESCRIPTIONS },
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
  for (const c of ALL_STANDARD_CRITERIA) {
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
  ALL_STANDARD_CRITERIA.forEach((c) => {
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
  ALL_STANDARD_CRITERIA.forEach((c) => {
    if (ev[c.id as keyof Evaluation] == null) missing.push(c.id);
  });
  getManeuverCriteria(maneuverName ?? null).forEach((c) => {
    if (ev[c.id] == null) missing.push(c.id);
  });
  return missing;
}

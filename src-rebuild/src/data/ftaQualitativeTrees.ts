import type { QualitativeCriterion } from '../types';

/** Yes/No decision node (FTA PDF — 4 steps → rating 1–5). */
export type FtaQuestionNode = {
  type: 'question';
  id: string;
  question: string;
  context?: string;
  yesTarget: string;
  noTarget: string;
};

export type FtaResultNode = {
  type: 'result';
  id: string;
  rating: number;
  label: string;
  description: string;
};

export type FtaTreeNode = FtaQuestionNode | FtaResultNode;

function buildResults(prefix: string, criterion: QualitativeCriterion): Record<string, FtaTreeNode> {
  const nodes: Record<string, FtaTreeNode> = {};
  for (let r = 1; r <= 5; r++) {
    const key = String(r);
    nodes[`${prefix}_r${r}`] = {
      type: 'result',
      id: `${prefix}_r${r}`,
      rating: r,
      label: criterion.pdfLabels?.[key] ?? `Rating ${r}`,
      description: criterion.longDescriptions?.[key] ?? '',
    };
  }
  return nodes;
}

/** Standard FTA flow: Q1 No→5, Yes→Q2; Q2 Yes→4, No→Q3; Q3 No→3, Yes→Q4; Q4 Yes→2, No→1 */
function wireQuestions(
  prefix: string,
  q: [string, string, string, string],
): Record<string, FtaTreeNode> {
  const [q1, q2, q3, q4] = q;
  return {
    [`${prefix}_q1`]: {
      type: 'question',
      id: `${prefix}_q1`,
      question: q1,
      noTarget: `${prefix}_r5`,
      yesTarget: `${prefix}_q2`,
    },
    [`${prefix}_q2`]: {
      type: 'question',
      id: `${prefix}_q2`,
      question: q2,
      yesTarget: `${prefix}_r4`,
      noTarget: `${prefix}_q3`,
    },
    [`${prefix}_q3`]: {
      type: 'question',
      id: `${prefix}_q3`,
      question: q3,
      noTarget: `${prefix}_r3`,
      yesTarget: `${prefix}_q4`,
    },
    [`${prefix}_q4`]: {
      type: 'question',
      id: `${prefix}_q4`,
      question: q4,
      yesTarget: `${prefix}_r2`,
      noTarget: `${prefix}_r1`,
    },
  };
}

/** FTA Decision Tree EN.pdf — Trim, Stick Forces, Control Harmony, Predictability, Characteristic, Pilot Compensation, Workload */
const HANDLING_QUESTIONS: Record<string, [string, string, string, string]> = {
  trim: [
    'Were you able to trim the aircraft?',
    'Did you struggle while trimming?',
    'Were you satisfied with the trim?',
    'Does the trim need improvement?',
  ],
  stickForces: [
    'Did the stick forces allow you to control the aircraft safely?',
    'Did the stick forces physically strain you during maneuvers?',
    'Did you find the overall feel and level of the stick forces adequate?',
    'Should the stick forces be improved / optimized?',
  ],
  controlHarmony: [
    'Did the harmony between control axes (pitch, roll, yaw) allow you to safely coordinate the aircraft?',
    'Was the lack of harmony (force or response imbalance) between axes challenging during maneuvers?',
    'Did you find the overall control harmony and balance between axes adequate?',
    'Should control harmony be improved / optimized?',
  ],
  predictability: [
    "Did the level of predictability in the aircraft's responses allow you to safely control the aircraft?",
    'Were unexpected or inconsistent responses from the aircraft challenging during flight?',
    'Did you find the overall predictability characteristics of the aircraft adequate?',
    'Should the predictability characteristics be improved / optimized?',
  ],
  characteristic: [
    'Did the overall flight characteristics of the aircraft allow you to safely execute the tasks?',
    'Were the characteristic tendencies (e.g., undesirable responses, instability) exhibited by the aircraft during maneuvers challenging?',
    'Did you find the overall flight characteristics of the aircraft adequate?',
    'Should the flight characteristics be improved / optimized?',
  ],
  pilotCompensation: [
    'Did the required pilot compensation allow you to safely control the aircraft?',
    'Was the excessive pilot compensation (continuous or large corrections) required to achieve the desired performance challenging?',
    'Did you find the required level of pilot compensation acceptable / generally adequate?',
    'Should a development be made to reduce / optimize the need for pilot compensation?',
  ],
  workload: [
    'Did the workload level allow you to complete the task safely?',
    'Did the workload (physical / mental effort) push your limits while executing the task?',
    'Did you find the overall workload level comfortable / acceptable?',
    'Should the workload be reduced / optimized with further development?',
  ],
};

export function getHandlingQualitativeTree(criterion: QualitativeCriterion): {
  nodes: Record<string, FtaTreeNode>;
  rootId: string;
} {
  const qs = HANDLING_QUESTIONS[criterion.id];
  if (!qs) {
    throw new Error(`No FTA qualitative tree for handling id: ${criterion.id}`);
  }
  const prefix = criterion.id;
  return {
    nodes: { ...wireQuestions(prefix, qs), ...buildResults(prefix, criterion) },
    rootId: `${prefix}_q1`,
  };
}

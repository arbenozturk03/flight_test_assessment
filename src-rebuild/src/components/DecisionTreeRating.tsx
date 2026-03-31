import { useState, useCallback } from 'react';
import { RotateCcw, ChevronRight, MessageSquare, GitBranch, Hash } from 'lucide-react';
import { SKIP_VALUE } from '../types';

/* ────────────────────────────────────────────
   Tree node types
   ──────────────────────────────────────────── */

interface QuestionNode {
  type: 'question';
  id: string;
  question: string;
  context?: string;
  yesTarget: string;
  noTarget: string;
}

interface SelectionNode {
  type: 'selection';
  id: string;
  title: string;
  subtitle: string;
  options: { rating: number; characteristics: string; demands: string }[];
}

interface ResultNode {
  type: 'result';
  id: string;
  rating: number;
  label: string;
  description: string;
}

type TreeNode = QuestionNode | SelectionNode | ResultNode;

/* ────────────────────────────────────────────
   PIO decision tree  (Figure 2.4)
   Flow goes bottom→up: worst-case first.
   ──────────────────────────────────────────── */

const PIO_NODES: Record<string, TreeNode> = {
  pio_q1: {
    type: 'question', id: 'pio_q1',
    question: 'Does it cause divergent oscillations?',
    context: 'Pilot attempts to enter control loop',
    yesTarget: 'pio_r6', noTarget: 'pio_q2',
  },
  pio_q2: {
    type: 'question', id: 'pio_q2',
    question: 'Does it cause oscillations?',
    context: 'Pilot initiates abrupt maneuvers or attempts tight control',
    yesTarget: 'pio_q3', noTarget: 'pio_q4',
  },
  pio_q3: {
    type: 'question', id: 'pio_q3',
    question: 'Are the oscillations divergent?',
    yesTarget: 'pio_r5', noTarget: 'pio_r4',
  },
  pio_q4: {
    type: 'question', id: 'pio_q4',
    question: 'Do undesirable motions tend to occur?',
    yesTarget: 'pio_q5', noTarget: 'pio_r1',
  },
  pio_q5: {
    type: 'question', id: 'pio_q5',
    question: 'Is task performance compromised?',
    yesTarget: 'pio_r3', noTarget: 'pio_r2',
  },
  pio_r1: { type: 'result', id: 'pio_r1', rating: 1, label: 'No PIO Tendency', description: 'No tendency for pilot to induce undesirable oscillations.' },
  pio_r2: { type: 'result', id: 'pio_r2', rating: 2, label: 'Pilot Technique Preventable', description: 'Undesirable motions tend to occur when pilot initiates abrupt maneuvers or attempts tight control. These motions can be prevented or eliminated by pilot technique.' },
  pio_r3: { type: 'result', id: 'pio_r3', rating: 3, label: 'Performance Sacrifice Required', description: 'Undesirable motions easily induced when pilot initiates abrupt maneuvers or attempts tight control. These motions can be prevented or eliminated but only at sacrifice to task performance or through considerable pilot attention and effort.' },
  pio_r4: { type: 'result', id: 'pio_r4', rating: 4, label: 'Gain Reduction Required', description: 'Oscillations tend to develop when pilot initiates abrupt maneuvers or attempts tight control. Pilot must reduce gain or abandon task to recover.' },
  pio_r5: { type: 'result', id: 'pio_r5', rating: 5, label: 'Open Loop Required', description: 'Divergent oscillations tend to develop when pilot initiates abrupt maneuvers or attempts tight control. Pilot must open loop by releasing or freezing the stick.' },
  pio_r6: { type: 'result', id: 'pio_r6', rating: 6, label: 'Divergent — Critical', description: 'Disturbance of normal pilot control may cause divergent oscillation. Pilot must open control loop by releasing or freezing the stick.' },
};

/* ────────────────────────────────────────────
   CHR decision tree  (Cooper-Harper)
   ──────────────────────────────────────────── */

const CHR_NODES: Record<string, TreeNode> = {
  chr_q1: {
    type: 'question', id: 'chr_q1',
    question: 'Is it controllable?',
    yesTarget: 'chr_q2', noTarget: 'chr_r10',
  },
  chr_q2: {
    type: 'question', id: 'chr_q2',
    question: 'Is adequate performance attainable with a tolerable pilot workload?',
    yesTarget: 'chr_q3', noTarget: 'chr_s789',
  },
  chr_q3: {
    type: 'question', id: 'chr_q3',
    question: 'Is it satisfactory without improvement?',
    yesTarget: 'chr_s123', noTarget: 'chr_s456',
  },
  chr_r10: {
    type: 'result', id: 'chr_r10', rating: 10,
    label: 'Improvement Mandatory',
    description: 'Major deficiencies — Control will be lost during some portion of required operation.',
  },
  chr_s789: {
    type: 'selection', id: 'chr_s789',
    title: 'Deficiencies Require Improvement',
    subtitle: 'Select the rating that best describes the aircraft:',
    options: [
      { rating: 7, characteristics: 'Major deficiencies', demands: 'Adequate performance not attainable with maximum tolerable pilot compensation. Controllability not in question.' },
      { rating: 8, characteristics: 'Major deficiencies', demands: 'Considerable pilot compensation is required for control.' },
      { rating: 9, characteristics: 'Major deficiencies', demands: 'Intense pilot compensation is required to retain control.' },
    ],
  },
  chr_s456: {
    type: 'selection', id: 'chr_s456',
    title: 'Deficiencies Warrant Improvement',
    subtitle: 'Select the rating that best describes the aircraft:',
    options: [
      { rating: 4, characteristics: 'Minor but annoying deficiencies', demands: 'Desired performance requires moderate pilot compensation.' },
      { rating: 5, characteristics: 'Moderately objectionable deficiencies', demands: 'Adequate performance requires considerable pilot compensation.' },
      { rating: 6, characteristics: 'Very objectionable but tolerable deficiencies', demands: 'Adequate performance requires extensive pilot compensation.' },
    ],
  },
  chr_s123: {
    type: 'selection', id: 'chr_s123',
    title: 'Satisfactory Without Improvement',
    subtitle: 'Select the rating that best describes the aircraft:',
    options: [
      { rating: 1, characteristics: 'Excellent — Highly desirable', demands: 'Pilot compensation not a factor for desired performance.' },
      { rating: 2, characteristics: 'Good — Negligible deficiencies', demands: 'Pilot compensation not a factor for desired performance.' },
      { rating: 3, characteristics: 'Fair — Some mildly unpleasant deficiencies', demands: 'Minimal pilot compensation required for desired performance.' },
    ],
  },
};

const PIO_ROOT = 'pio_q1';
const CHR_ROOT = 'chr_q1';

/* ────────────────────────────────────────────
   All rating descriptions (for summary / direct)
   ──────────────────────────────────────────── */

const PIO_RATING_INFO: Record<number, { label: string; description: string }> = {};
for (const n of Object.values(PIO_NODES)) {
  if (n.type === 'result') PIO_RATING_INFO[n.rating] = { label: n.label, description: n.description };
}

const CHR_RATING_INFO: Record<number, { label: string; description: string }> = {
  10: { label: 'Improvement Mandatory', description: 'Major deficiencies — Control will be lost during some portion of required operation.' },
  9:  { label: 'Major Deficiencies', description: 'Intense pilot compensation is required to retain control.' },
  8:  { label: 'Major Deficiencies', description: 'Considerable pilot compensation is required for control.' },
  7:  { label: 'Major Deficiencies', description: 'Adequate performance not attainable with maximum tolerable pilot compensation. Controllability not in question.' },
  6:  { label: 'Very Objectionable', description: 'Very objectionable but tolerable deficiencies. Adequate performance requires extensive pilot compensation.' },
  5:  { label: 'Moderately Objectionable', description: 'Moderately objectionable deficiencies. Adequate performance requires considerable pilot compensation.' },
  4:  { label: 'Minor but Annoying', description: 'Minor but annoying deficiencies. Desired performance requires moderate pilot compensation.' },
  3:  { label: 'Fair', description: 'Fair — Some mildly unpleasant deficiencies. Minimal pilot compensation required for desired performance.' },
  2:  { label: 'Good', description: 'Good — Negligible deficiencies. Pilot compensation not a factor for desired performance.' },
  1:  { label: 'Excellent', description: 'Excellent — Highly desirable. Pilot compensation not a factor for desired performance.' },
};

/* ────────────────────────────────────────────
   Color helpers
   ──────────────────────────────────────────── */

type Severity = 'green' | 'yellow' | 'orange' | 'red';

function pioSeverity(v: number): Severity {
  if (v <= 2) return 'green';
  if (v === 3) return 'yellow';
  if (v <= 5) return 'orange';
  return 'red';
}

function chrSeverity(v: number): Severity {
  if (v <= 3) return 'green';
  if (v <= 6) return 'yellow';
  if (v <= 9) return 'orange';
  return 'red';
}

const SEVERITY_BG: Record<Severity, string> = {
  green:  'bg-green-600/20 border-green-600 text-green-400',
  yellow: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
  orange: 'bg-orange-500/20 border-orange-500 text-orange-400',
  red:    'bg-red-600/20 border-red-600 text-red-400',
};

const SEVERITY_BADGE: Record<Severity, string> = {
  green:  'bg-green-600 text-white',
  yellow: 'bg-yellow-500 text-gray-900',
  orange: 'bg-orange-500 text-white',
  red:    'bg-red-600 text-white',
};

const SEVERITY_OUTLINE: Record<Severity, string> = {
  green:  'border-green-600 text-green-400',
  yellow: 'border-yellow-500 text-yellow-400',
  orange: 'border-orange-500 text-orange-400',
  red:    'border-red-600 text-red-400',
};

/* ────────────────────────────────────────────
   Breadcrumb helpers
   ──────────────────────────────────────────── */

interface BreadcrumbStep {
  outcome: string;
  positive: boolean;
}

function outcomeLabel(question: string, context: string | undefined, answer: 'Yes' | 'No'): BreadcrumbStep {
  const key = question + '|' + answer;
  const outcomes: Record<string, BreadcrumbStep> = {
    // PIO
    'Does it cause divergent oscillations?|Yes':        { outcome: 'Control loop → Divergent oscillations',  positive: false },
    'Does it cause divergent oscillations?|No':         { outcome: 'Control loop → No divergent oscillations', positive: true },
    'Does it cause oscillations?|Yes':                  { outcome: 'Abrupt maneuvers → Oscillations present', positive: false },
    'Does it cause oscillations?|No':                   { outcome: 'Abrupt maneuvers → No oscillations',      positive: true },
    'Are the oscillations divergent?|Yes':              { outcome: 'Oscillations are divergent',               positive: false },
    'Are the oscillations divergent?|No':               { outcome: 'Oscillations are not divergent',           positive: true },
    'Do undesirable motions tend to occur?|Yes':        { outcome: 'Undesirable motions present',             positive: false },
    'Do undesirable motions tend to occur?|No':         { outcome: 'No undesirable motions',                  positive: true },
    'Is task performance compromised?|Yes':             { outcome: 'Task performance compromised',            positive: false },
    'Is task performance compromised?|No':              { outcome: 'Task performance not compromised',        positive: true },
    // CHR
    'Is it controllable?|Yes':                          { outcome: 'Controllable',                            positive: true },
    'Is it controllable?|No':                           { outcome: 'Not controllable',                        positive: false },
    'Is adequate performance attainable with a tolerable pilot workload?|Yes': { outcome: 'Adequate performance attainable', positive: true },
    'Is adequate performance attainable with a tolerable pilot workload?|No':  { outcome: 'Adequate performance not attainable', positive: false },
    'Is it satisfactory without improvement?|Yes':      { outcome: 'Satisfactory without improvement',       positive: true },
    'Is it satisfactory without improvement?|No':       { outcome: 'Not satisfactory — improvement needed',  positive: false },
  };
  return outcomes[key] ?? { outcome: `${context ? context + ' → ' : ''}${answer}`, positive: answer === 'Yes' };
}

/* ────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */

type Mode = 'pio' | 'chr';
type InputMode = 'flowchart' | 'direct';

interface DecisionTreeRatingProps {
  pioValue: number | string | null;
  chrValue: number | string | null;
  onPioChange: (v: number | string | null) => void;
  onChrChange: (v: number | string | null) => void;
  pioHasError: boolean;
  chrHasError: boolean;
  pioComment: string;
  chrComment: string;
  onPioCommentChange: (t: string) => void;
  onChrCommentChange: (t: string) => void;
}

function SingleRating({ mode, value, onChange, hasError, comment, onCommentChange }: {
  mode: Mode;
  value: number | string | null;
  onChange: (v: number | string | null) => void;
  hasError: boolean;
  comment: string;
  onCommentChange: (t: string) => void;
}) {
  const [inputMode, setInputMode] = useState<InputMode>('flowchart');
  const [nodeId, setNodeId] = useState(mode === 'pio' ? PIO_ROOT : CHR_ROOT);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbStep[]>([]);
  const [animKey, setAnimKey] = useState(0);
  const [commentOpen, setCommentOpen] = useState(false);

  const nodes = mode === 'pio' ? PIO_NODES : CHR_NODES;
  const rootId = mode === 'pio' ? PIO_ROOT : CHR_ROOT;
  const currentNodeId = nodeId;
  const setCurrentNodeId = setNodeId;
  const ratingInfo = mode === 'pio' ? PIO_RATING_INFO : CHR_RATING_INFO;
  const severityFn = mode === 'pio' ? pioSeverity : chrSeverity;
  const ratingMin = 1;
  const ratingMax = mode === 'pio' ? 6 : 10;

  const currentNode   = nodes[currentNodeId];
  const numericValue   = typeof value === 'number' ? value : null;
  const isSkip         = value === SKIP_VALUE;
  const isAtRoot       = currentNodeId === rootId;
  const hasExternalValue = numericValue != null && isAtRoot && breadcrumb.length === 0;

  const handleAnswer = useCallback((answer: 'Yes' | 'No') => {
    if (currentNode.type !== 'question') return;
    const target = answer === 'Yes' ? currentNode.yesTarget : currentNode.noTarget;
    setBreadcrumb((prev) => [...prev, outcomeLabel(currentNode.question, currentNode.context, answer)]);
    setCurrentNodeId(target);
    setAnimKey((k) => k + 1);
    const targetNode = nodes[target];
    if (targetNode.type === 'result') onChange(targetNode.rating);
  }, [currentNode, nodes, onChange, setBreadcrumb, setCurrentNodeId]);

  const handleSelectRating = useCallback((rating: number) => {
    onChange(rating);
    setAnimKey((k) => k + 1);
  }, [onChange]);

  const resetWizard = useCallback(() => {
    setCurrentNodeId(rootId);
    setBreadcrumb([]);
    onChange(null);
    setAnimKey((k) => k + 1);
    setCommentOpen(false);
  }, [rootId, onChange, setBreadcrumb, setCurrentNodeId]);

  const stepNumber = breadcrumb.length + 1;
  const totalQuestionsApprox = mode === 'pio' ? 5 : 3;

  /* ═══════════════════════════════════════════
     DIRECT MODE — number buttons
     ═══════════════════════════════════════════ */

  const renderDirect = () => {
    const numbers = Array.from({ length: ratingMax - ratingMin + 1 }, (_, i) => ratingMin + i);
    const selectedInfo = numericValue != null ? ratingInfo[numericValue] : null;
    const selectedSev  = numericValue != null ? severityFn(numericValue) : null;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {numbers.map((num) => {
            const selected = value === num;
            const sev = severityFn(num);
            return (
              <button
                key={num}
                type="button"
                onClick={() => onChange(value === num ? null : num)}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all ${
                  selected ? SEVERITY_BADGE[sev] + ' border-transparent' : 'bg-tusas-surface ' + SEVERITY_OUTLINE[sev]
                } ${hasError ? 'ring-2 ring-red-600' : ''}`}
              >
                {num}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onChange(isSkip ? null : SKIP_VALUE)}
            title="Not Applicable"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all ${
              isSkip
                ? 'border-transparent bg-gray-500 text-white'
                : 'border-tusas-border bg-tusas-surface text-tusas-muted hover:border-gray-500'
            } ${hasError ? 'ring-2 ring-red-600' : ''}`}
          >
            N/A
          </button>
        </div>

        {selectedInfo && selectedSev && (
          <div className={`rounded-lg border p-3 ${SEVERITY_BG[selectedSev]}`}>
            <p className="text-sm font-semibold">{selectedInfo.label}</p>
            <p className="mt-1 text-sm leading-relaxed opacity-80">{selectedInfo.description}</p>
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════
     FLOWCHART MODE — render helpers
     ═══════════════════════════════════════════ */

  const renderBreadcrumb = () => {
    if (breadcrumb.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-tusas-border/40 bg-tusas-bg/50 px-2.5 py-1.5">
        {breadcrumb.map((step, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 text-tusas-muted/30" />}
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[13px] font-medium ${
              step.positive
                ? 'bg-green-600/10 text-green-400'
                : 'bg-red-600/10 text-red-400'
            }`}>
              <span className="text-xs">{step.positive ? '✓' : '✗'}</span>
              {step.outcome}
            </span>
          </span>
        ))}
      </div>
    );
  };

  const renderQuestion = (node: QuestionNode) => (
    <div key={animKey} className="animate-[fadeInUp_0.25s_ease-out]">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#003366] text-xs font-bold text-white">
          {stepNumber}
        </span>
        <span className="text-sm text-tusas-muted">
          Step {stepNumber} of {totalQuestionsApprox}
        </span>
      </div>

      {node.context && (
        <p className="mb-4 rounded-lg border border-[#003366]/40 bg-[#003366]/10 px-4 py-2.5 text-sm font-medium text-tusas-text/70">
          {node.context}
        </p>
      )}

      <h4 className="mb-8 text-xl font-bold leading-snug text-tusas-text">
        {node.question}
      </h4>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handleAnswer('Yes')}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-tusas-border bg-tusas-bg text-base font-bold text-tusas-text transition-all hover:border-tusas-blue hover:bg-tusas-blue/10 active:scale-[0.98]"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => handleAnswer('No')}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-tusas-border bg-tusas-bg text-base font-bold text-tusas-text transition-all hover:border-tusas-blue hover:bg-tusas-blue/10 active:scale-[0.98]"
        >
          No
        </button>
      </div>
    </div>
  );

  const renderSelection = (node: SelectionNode) => (
    <div key={animKey} className="animate-[fadeInUp_0.25s_ease-out]">
      <div className="mb-1.5 text-sm font-bold uppercase tracking-wider text-tusas-muted/70">
        {node.title}
      </div>
      <p className="mb-5 text-sm text-tusas-muted">{node.subtitle}</p>
      <div className="space-y-2.5">
        {node.options.map((opt) => {
          const sev = severityFn(opt.rating);
          const selected = numericValue === opt.rating;
          return (
            <button
              key={opt.rating}
              type="button"
              onClick={() => handleSelectRating(opt.rating)}
              className={`group flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all active:scale-[0.99] ${
                selected
                  ? SEVERITY_BG[sev]
                  : 'border-tusas-border bg-tusas-bg/40 hover:border-tusas-muted/40'
              }`}
            >
              <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-black ${
                selected ? SEVERITY_BADGE[sev] : 'bg-tusas-surface text-tusas-text border border-tusas-border'
              }`}>
                {opt.rating}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-base font-semibold leading-snug ${selected ? 'text-tusas-text' : 'text-tusas-text/80'}`}>
                  {opt.characteristics}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-tusas-muted">{opt.demands}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderResult = (rating: number) => {
    const info = ratingInfo[rating];
    if (!info) return null;
    const sev = severityFn(rating);
    return (
      <div key={`result-${rating}`} className="animate-[fadeInUp_0.25s_ease-out]">
        <div className="flex flex-col items-center gap-4 py-3">
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-black ${SEVERITY_BADGE[sev]}`}>
            {rating}
          </div>
          <div className="text-center">
            <p className={`text-base font-bold ${sev === 'green' ? 'text-green-400' : sev === 'yellow' ? 'text-yellow-400' : sev === 'orange' ? 'text-orange-400' : 'text-red-400'}`}>
              {info.label}
            </p>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-tusas-muted">
              {info.description}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderExternalValue = () => {
    if (numericValue == null) return null;
    const sev = severityFn(numericValue);
    const info = ratingInfo[numericValue];
    return (
      <div className="flex items-center gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-black ${SEVERITY_BADGE[sev]}`}>
          {numericValue}
        </div>
        <div className="min-w-0 flex-1">
          {info && (
            <>
              <p className="text-base font-semibold text-tusas-text">{info.label}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-tusas-muted line-clamp-2">{info.description}</p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={resetWizard}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-tusas-border px-3 py-2 text-sm font-medium text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Re-evaluate
        </button>
      </div>
    );
  };

  /* ── Determine what flowchart content to render ── */

  const renderFlowchartContent = () => {
    if (hasExternalValue) return renderExternalValue();
    if (currentNode.type === 'question')  return renderQuestion(currentNode);
    if (currentNode.type === 'selection') {
      if (numericValue != null) return renderResult(numericValue);
      return renderSelection(currentNode);
    }
    if (currentNode.type === 'result') return renderResult(currentNode.rating);
    return null;
  };

  const isComplete = numericValue != null || isSkip;
  const showResetBtn = inputMode === 'flowchart' && (!isAtRoot || breadcrumb.length > 0);

  const title = mode === 'chr' ? 'Cooper-Harper (CHR)' : 'PIO Rating';
  const badgeVal = numericValue != null ? numericValue : null;
  const badgeSev = badgeVal != null ? severityFn(badgeVal) : null;

  return (
    <div className={`space-y-4 ${hasError ? 'rounded-xl border-2 border-red-600 bg-red-500/10 p-4' : ''}`}>
      {/* Header: title + badge + Flowchart/Direct toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h4 className="text-sm font-bold text-tusas-text">{title}</h4>
          {badgeVal != null && badgeSev && (
            <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${SEVERITY_BADGE[badgeSev]}`}>
              {badgeVal}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-tusas-border bg-tusas-bg p-0.5">
          <button
            type="button"
            onClick={() => setInputMode('flowchart')}
            title="Decision Tree"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
              inputMode === 'flowchart'
                ? 'bg-tusas-surface text-tusas-text shadow-sm'
                : 'text-tusas-muted hover:text-tusas-text'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Flowchart</span>
          </button>
          <button
            type="button"
            onClick={() => setInputMode('direct')}
            title="Direct Number Input"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
              inputMode === 'direct'
                ? 'bg-tusas-surface text-tusas-text shadow-sm'
                : 'text-tusas-muted hover:text-tusas-text'
            }`}
          >
            <Hash className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Direct</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb trail (flowchart only) */}
      {inputMode === 'flowchart' && renderBreadcrumb()}

      {/* Content area */}
      <div className={inputMode === 'flowchart' ? 'min-h-[120px]' : ''}>
        {inputMode === 'direct' ? renderDirect() : renderFlowchartContent()}
      </div>

      {/* Reset button (flowchart only) */}
      {showResetBtn && (
        <div className="flex items-center">
          <button
            type="button"
            onClick={resetWizard}
            className="flex items-center gap-1.5 rounded-lg border border-tusas-border px-3 py-2 text-sm font-medium text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Start Over
          </button>
        </div>
      )}

      {/* Comment section */}
      {isComplete && (
        <div>
          <button
            type="button"
            onClick={() => setCommentOpen(!commentOpen)}
            className="flex items-center gap-1.5 text-sm font-medium text-tusas-muted transition-colors hover:text-tusas-text"
          >
            <MessageSquare className="h-4 w-4" />
            {commentOpen ? 'Hide Comment' : comment ? 'Edit Comment' : 'Add Comment'}
          </button>
          {commentOpen && (
            <input
              type="text"
              placeholder={`Add a comment for this ${mode === 'pio' ? 'PIO' : 'CHR'} rating...`}
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              className="mt-2 w-full rounded-lg border border-tusas-border bg-tusas-bg px-4 py-2.5 text-sm text-tusas-text placeholder-tusas-muted outline-none transition-colors focus:border-tusas-blue"
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   Main exported component — renders CHR then PIO stacked
   ════════════════════════════════════════════ */

export default function DecisionTreeRating({
  pioValue, chrValue,
  onPioChange, onChrChange,
  pioHasError, chrHasError,
  pioComment, chrComment,
  onPioCommentChange, onChrCommentChange,
}: DecisionTreeRatingProps) {
  return (
    <div className="space-y-8">
      <SingleRating
        mode="chr"
        value={chrValue}
        onChange={onChrChange}
        hasError={chrHasError}
        comment={chrComment}
        onCommentChange={onChrCommentChange}
      />
      <div className="border-t border-tusas-border" />
      <SingleRating
        mode="pio"
        value={pioValue}
        onChange={onPioChange}
        hasError={pioHasError}
        comment={pioComment}
        onCommentChange={onPioCommentChange}
      />
    </div>
  );
}

import { useState, useCallback } from 'react';
import { RotateCcw, GitBranch, Hash } from 'lucide-react';
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
  green:  'bg-green-600/20 border-green-600 text-sev-green',
  yellow: 'bg-yellow-500/20 border-yellow-500 text-sev-yellow',
  orange: 'bg-orange-500/20 border-orange-500 text-sev-orange',
  red:    'bg-red-600/20 border-red-600 text-sev-red',
};

const SEVERITY_BADGE: Record<Severity, string> = {
  green:  'bg-green-600 text-white',
  yellow: 'bg-yellow-500 text-gray-900',
  orange: 'bg-orange-500 text-white',
  red:    'bg-red-600 text-white',
};

const SEVERITY_OUTLINE: Record<Severity, string> = {
  green:  'border-green-600 text-sev-green',
  yellow: 'border-yellow-500 text-sev-yellow',
  orange: 'border-orange-500 text-sev-orange',
  red:    'border-red-600 text-sev-red',
};

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
  const [inputMode, setInputMode] = useState<InputMode>('direct');
  const [nodeId, setNodeId] = useState(mode === 'pio' ? PIO_ROOT : CHR_ROOT);
  const [stepCount, setStepCount] = useState(0);
  const [animKey, setAnimKey] = useState(0);
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
  const hasExternalValue = numericValue != null && isAtRoot && stepCount === 0;

  const handleAnswer = useCallback((answer: 'Yes' | 'No') => {
    if (currentNode.type !== 'question') return;
    const target = answer === 'Yes' ? currentNode.yesTarget : currentNode.noTarget;
    setStepCount((c) => c + 1);
    setCurrentNodeId(target);
    setAnimKey((k) => k + 1);
    const targetNode = nodes[target];
    if (targetNode.type === 'result') onChange(targetNode.rating);
  }, [currentNode, nodes, onChange, setCurrentNodeId]);

  const handleSelectRating = useCallback((rating: number) => {
    onChange(rating);
    setAnimKey((k) => k + 1);
  }, [onChange]);

  const resetWizard = useCallback(() => {
    setCurrentNodeId(rootId);
    setStepCount(0);
    onChange(null);
    setAnimKey((k) => k + 1);
  }, [rootId, onChange, setCurrentNodeId]);

  const stepNumber = stepCount + 1;
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
            <p className="mt-1 text-sm leading-relaxed">{selectedInfo.description}</p>
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════
     FLOWCHART MODE — render helpers
     ═══════════════════════════════════════════ */

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
                <p className="mt-1 text-sm leading-relaxed text-tusas-text/70">{opt.demands}</p>
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
            <p className={`text-base font-bold ${sev === 'green' ? 'text-sev-green' : sev === 'yellow' ? 'text-sev-yellow' : sev === 'orange' ? 'text-sev-orange' : 'text-sev-red'}`}>
              {info.label}
            </p>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-tusas-text/70">
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
              <p className="mt-0.5 text-sm leading-relaxed text-tusas-text/70">{info.description}</p>
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

  const showResetBtn = inputMode === 'flowchart' && (!isAtRoot || stepCount > 0);

  const title = mode === 'chr' ? 'Cooper-Harper (CHR)' : 'PIO Rating';
  const badgeVal = numericValue != null ? numericValue : null;
  const badgeSev = badgeVal != null ? severityFn(badgeVal) : null;

  return (
    <div className={`space-y-4 ${hasError ? 'rounded-xl border-2 border-red-600 bg-red-500/10 p-4' : ''}`}>
      {/* Header: title + badge; left = compact Direct, right = detailed Flowchart */}
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
            onClick={() => setInputMode('direct')}
            title="Direct — compact numeric scale"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
              inputMode === 'direct'
                ? 'bg-tusas-surface text-tusas-text shadow-sm'
                : 'text-tusas-muted hover:text-tusas-text'
            }`}
          >
            <Hash className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Direct</span>
          </button>
          <button
            type="button"
            onClick={() => setInputMode('flowchart')}
            title="Flowchart — step-by-step decision tree"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
              inputMode === 'flowchart'
                ? 'bg-tusas-surface text-tusas-text shadow-sm'
                : 'text-tusas-muted hover:text-tusas-text'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Flowchart</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb trail (flowchart only) */}

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

      <div className="mt-2">
        <label className="mb-1 block text-xs font-medium text-tusas-muted">Comment</label>
        <input
          type="text"
          placeholder={`Add a comment for this ${mode === 'pio' ? 'PIO' : 'CHR'} rating...`}
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          className="w-full rounded-lg border border-tusas-border bg-tusas-bg px-3 py-2 text-sm text-tusas-text placeholder-tusas-muted outline-none transition-colors focus:border-tusas-blue"
        />
      </div>
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

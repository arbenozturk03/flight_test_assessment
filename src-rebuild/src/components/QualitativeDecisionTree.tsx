import { useState, useCallback, useEffect } from 'react';
import { RotateCcw, Info, X, Check } from 'lucide-react';
import { SKIP_VALUE } from '../types';
import type { FtaQuestionNode, FtaResultNode, FtaTreeNode } from '../data/ftaQualitativeTrees';

type Severity = 'green' | 'yellow' | 'orange' | 'red';

function fivePointSeverity(v: number): Severity {
  if (v <= 2) return 'green';
  if (v === 3) return 'yellow';
  if (v === 4) return 'orange';
  return 'red';
}

const SEVERITY_BADGE: Record<Severity, string> = {
  green: 'bg-green-600 text-white',
  yellow: 'bg-yellow-500 text-gray-900',
  orange: 'bg-orange-500 text-white',
  red: 'bg-red-600 text-white',
};

const RATING_KEYS = ['1', '2', '3', '4', '5'] as const;

const POPUP_BADGE = [
  'bg-green-500 text-white',
  'bg-lime-500 text-gray-900',
  'bg-yellow-500 text-gray-900',
  'bg-orange-500 text-white',
  'bg-red-500 text-white',
];
const POPUP_LABEL = ['text-sev-green', 'text-sev-lime', 'text-sev-yellow', 'text-sev-orange', 'text-sev-red'];
const SELECTED_BORDER = [
  'border-l-green-500',
  'border-l-lime-500',
  'border-l-yellow-500',
  'border-l-orange-500',
  'border-l-red-500',
];
const SELECTED_BG = [
  'bg-green-500/8',
  'bg-lime-500/8',
  'bg-yellow-500/8',
  'bg-orange-500/8',
  'bg-red-500/8',
];
const CHECK_COLOR = [
  'text-sev-green',
  'text-sev-lime',
  'text-sev-yellow',
  'text-sev-orange',
  'text-sev-red',
];

function findResultNode(nodes: Record<string, FtaTreeNode>, rating: number): FtaResultNode | undefined {
  return Object.values(nodes).find(
    (n): n is FtaResultNode => n.type === 'result' && n.rating === rating,
  );
}

interface QualitativeDecisionTreeProps {
  label: string;
  fieldId: string;
  value: string | null;
  onChange: (v: string | null) => void;
  hasError: boolean;
  comment: string;
  onCommentChange: (t: string) => void;
  nodes: Record<string, FtaTreeNode>;
  rootId: string;
  /** 1–5 scale descriptions (same as Direct mode — opens from ⓘ). */
  pdfLabels?: Record<string, string>;
  longDescriptions?: Record<string, string>;
}

export default function QualitativeDecisionTree({
  label,
  fieldId,
  value,
  onChange,
  hasError,
  comment,
  onCommentChange,
  nodes,
  rootId,
  pdfLabels,
  longDescriptions,
}: QualitativeDecisionTreeProps) {
  const [nodeId, setNodeId] = useState(rootId);
  const [stepCount, setStepCount] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);

  const hasInfo = Boolean(longDescriptions && Object.keys(longDescriptions).length > 0);
  const valueStr = value != null && value !== SKIP_VALUE ? String(value) : null;

  const isSkip = value === SKIP_VALUE;
  const numericVal = value != null && !isSkip && /^[1-5]$/.test(String(value)) ? Number(value) : null;

  useEffect(() => {
    setNodeId(rootId);
    setStepCount(0);
    setAnimKey((k) => k + 1);
  }, [rootId, fieldId]);

  useEffect(() => {
    if (value === null || value === SKIP_VALUE) {
      setNodeId(rootId);
      setStepCount(0);
    }
  }, [value, rootId]);

  const resetWizard = useCallback(() => {
    setNodeId(rootId);
    setStepCount(0);
    onChange(null);
    setAnimKey((k) => k + 1);
  }, [rootId, onChange]);

  const handleAnswer = useCallback(
    (answer: 'Yes' | 'No') => {
      const current = nodes[nodeId];
      if (!current || current.type !== 'question') return;
      const q = current as FtaQuestionNode;
      setStepCount((c) => c + 1);
      const target = answer === 'Yes' ? q.yesTarget : q.noTarget;
      setNodeId(target);
      setAnimKey((k) => k + 1);
      const next = nodes[target];
      if (next?.type === 'result') {
        onChange(String((next as FtaResultNode).rating));
      }
    },
    [nodeId, nodes, onChange],
  );

  const currentNode = nodes[nodeId];
  const isAtRoot = nodeId === rootId && stepCount === 0;
  const inWizard = numericVal == null && !isSkip;

  const renderQuestion = (node: FtaQuestionNode) => (
    <div key={animKey} className="animate-[fadeInUp_0.25s_ease-out]">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#003366] text-[10px] font-bold text-white">
          {stepCount + 1}
        </span>
        <span className="text-xs text-tusas-muted">Step {stepCount + 1} of 4</span>
      </div>
      {node.context && (
        <p className="mb-3 rounded-lg border border-[#003366]/40 bg-[#003366]/10 px-3 py-2 text-xs font-medium text-tusas-text/70">
          {node.context}
        </p>
      )}
      <h4 className="mb-5 text-base font-bold leading-snug text-tusas-text">{node.question}</h4>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleAnswer('Yes')}
          className="flex h-12 flex-1 items-center justify-center rounded-xl border-2 border-tusas-border bg-tusas-bg text-sm font-bold text-tusas-text transition-all hover:border-tusas-blue hover:bg-tusas-blue/10 active:scale-[0.98]"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => handleAnswer('No')}
          className="flex h-12 flex-1 items-center justify-center rounded-xl border-2 border-tusas-border bg-tusas-bg text-sm font-bold text-tusas-text transition-all hover:border-tusas-blue hover:bg-tusas-blue/10 active:scale-[0.98]"
        >
          No
        </button>
      </div>
    </div>
  );

  const renderResultCard = (rating: number) => {
    const resultNode = findResultNode(nodes, rating);
    const sev = fivePointSeverity(rating);
    return (
      <div key={animKey} className="animate-[fadeInUp_0.25s_ease-out]">
        <div className="flex flex-col items-center gap-3 py-2">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black ${SEVERITY_BADGE[sev]}`}
          >
            {rating}
          </div>
          <div className="text-center">
            <p
              className={`text-sm font-bold ${
                sev === 'green'
                  ? 'text-sev-green'
                  : sev === 'yellow'
                    ? 'text-sev-yellow'
                    : sev === 'orange'
                      ? 'text-sev-orange'
                      : 'text-sev-red'
              }`}
            >
              {resultNode?.label ?? String(rating)}
            </p>
            {resultNode?.description ? (
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-tusas-text/70">{resultNode.description}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderRatedSummary = () => {
    if (numericVal == null) return null;
    const sev = fivePointSeverity(numericVal);
    const resultNode = findResultNode(nodes, numericVal);
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black ${SEVERITY_BADGE[sev]}`}
        >
          {numericVal}
        </div>
        <div className="min-w-0 flex-1">
          {resultNode && (
            <>
              <p className="text-sm font-semibold text-tusas-text">{resultNode.label}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-tusas-text/70">
                {resultNode.description}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={resetWizard}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-tusas-border px-2.5 py-1.5 text-xs font-medium text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Re-evaluate
        </button>
      </div>
    );
  };

  const renderWizardInner = () => {
    if (!currentNode) return null;
    if (currentNode.type === 'question') return renderQuestion(currentNode);
    if (currentNode.type === 'result') return renderResultCard(currentNode.rating);
    return null;
  };

  const showResetInWizard = inWizard && (!isAtRoot || stepCount > 0);

  return (
    <div
      className={`rounded-xl border border-tusas-border bg-tusas-surface/40 p-4 ${hasError ? 'border-2 border-red-600 bg-red-500/10' : ''}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h4 className="text-sm font-bold text-tusas-text">{label}</h4>
          {hasInfo && (
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="shrink-0 text-blue-500 transition-colors hover:text-blue-400"
              title={`${label} — rating scale descriptions (1–5)`}
            >
              <Info className="h-5 w-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {numericVal != null && (
            <span
              className={`flex h-6 min-w-[1.5rem] items-center justify-center rounded-md px-1 text-[10px] font-bold ${SEVERITY_BADGE[fivePointSeverity(numericVal)]}`}
            >
              {numericVal}
            </span>
          )}
          {isSkip && (
            <span className="rounded-md bg-gray-500 px-2 py-0.5 text-[10px] font-bold text-white">N/A</span>
          )}
        </div>
      </div>

      {numericVal != null && !isSkip && renderRatedSummary()}

      {inWizard && (
        <div className="mt-3 min-h-[100px]">{renderWizardInner()}</div>
      )}

      {isSkip && (
        <p className="text-center text-xs text-tusas-muted">Not applicable for this test point.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(isSkip ? null : SKIP_VALUE)}
          className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all ${
            isSkip
              ? 'border-gray-500 bg-gray-500 text-white'
              : 'border-tusas-border text-tusas-muted hover:border-gray-500'
          }`}
        >
          N/A
        </button>
        {showResetInWizard && (
          <button
            type="button"
            onClick={resetWizard}
            className="flex items-center gap-1.5 rounded-lg border border-tusas-border px-2.5 py-1.5 text-xs font-medium text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Start over
          </button>
        )}
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-tusas-muted">Comment</label>
        <input
          type="text"
          placeholder={`Comment for ${label}…`}
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          className="w-full rounded-lg border border-tusas-border bg-tusas-bg px-3 py-2 text-sm text-tusas-text placeholder-tusas-muted outline-none transition-colors focus:border-tusas-blue"
        />
      </div>

      {infoOpen && hasInfo && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => setInfoOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-[700px] rounded-xl border border-tusas-panel-border bg-tusas-panel shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-tusas-panel-border px-7 py-5">
              <h3 className="text-xl font-semibold text-tusas-text">{label}</h3>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="text-tusas-muted transition-colors hover:text-tusas-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-tusas-panel-border">
              {RATING_KEYS.map((opt, idx) => {
                const colorIdx = Math.min(idx, POPUP_BADGE.length - 1);
                const shortLabel = pdfLabels?.[opt] ?? '';
                const longDesc = longDescriptions?.[opt] ?? '';
                if (!shortLabel && !longDesc) return null;
                const isSelected = valueStr === opt;
                return (
                  <div
                    key={opt}
                    className={`px-7 py-4 transition-colors ${
                      isSelected ? `${SELECTED_BG[colorIdx]} border-l-[3px] ${SELECTED_BORDER[colorIdx]}` : 'hover:bg-tusas-panel-hover'
                    }`}
                  >
                    <div className="flex gap-3.5">
                      <div className="flex items-start pt-px">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold ${POPUP_BADGE[colorIdx]}`}
                        >
                          {opt}
                        </span>
                      </div>
                      <div className="min-w-0 -mt-px flex-1">
                        <span
                          className={`block text-[15px] font-semibold leading-tight ${POPUP_LABEL[colorIdx]}`}
                        >
                          {shortLabel}
                        </span>
                        {longDesc && (
                          <p className="mt-0.5 text-[14px] leading-relaxed text-tusas-muted">{longDesc}</p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="flex items-center self-stretch">
                          <Check className={`h-5 w-5 shrink-0 ${CHECK_COLOR[colorIdx]}`} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useCallback, useEffect } from 'react';
import { Check, X as XIcon, ChevronLeft, GitBranch, Hash, RotateCcw } from 'lucide-react';
import { SKIP_VALUE } from '../types';
import type { DecisionNode, DecisionOption, RatingDescription } from '../types';
import { DebouncedInput } from './DebouncedInput';

type ColorKey = 'green' | 'yellow' | 'orange' | 'red';

const OUTLINE: Record<ColorKey, string> = {
  green: 'border-green-600 text-green-400',
  yellow: 'border-yellow-500 text-yellow-400',
  orange: 'border-orange-500 text-orange-400',
  red: 'border-red-600 text-red-400',
};

const FILLED: Record<ColorKey, string> = {
  green: 'border-green-600 bg-green-600 text-white',
  yellow: 'border-yellow-500 bg-yellow-500 text-gray-900',
  orange: 'border-orange-500 bg-orange-500 text-white',
  red: 'border-red-600 bg-red-600 text-white',
};

interface RatingConfig {
  id: string;
  label: string;
  tabLabel: string;
  value: number | string | null;
  onChange: (v: number | string | null) => void;
  min: number;
  max: number;
  valueColors: (v: number) => ColorKey;
  descriptions?: Record<string, RatingDescription>;
  decisionTree: DecisionNode;
  totalSteps: number;
  hasError?: boolean;
  comment?: string;
  onCommentChange?: (text: string) => void;
}

interface RatingsPanelProps {
  ratings: RatingConfig[];
}

export default function RatingsPanel({ ratings }: RatingsPanelProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [mode, setMode] = useState<'flowchart' | 'direct'>('flowchart');

  const r = ratings[activeTab];

  return (
    <section className="space-y-0 rounded-lg border border-tusas-border bg-tusas-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-tusas-border px-6 py-4">
        <h3 className="text-base font-bold text-tusas-text">Ratings</h3>
      </div>

      {/* Tabs + Mode Toggle */}
      <div className="flex items-center justify-between gap-3 border-b border-tusas-border px-6 py-3">
        <div className="flex min-w-0 overflow-hidden rounded-lg border border-tusas-border">
          {ratings.map((cfg, i) => {
            const hasVal = cfg.value != null && cfg.value !== SKIP_VALUE;
            const badgeColor = hasVal ? cfg.valueColors(Number(cfg.value)) : 'green';
            const badgeInactive: Record<ColorKey, string> = {
              green:  'bg-green-600/20 text-green-400',
              yellow: 'bg-yellow-500/20 text-yellow-400',
              orange: 'bg-orange-500/20 text-orange-400',
              red:    'bg-red-600/20 text-red-400',
            };
            const showError = cfg.hasError && !hasVal;
            const tabCls = activeTab === i
              ? showError
                ? 'bg-red-600/30 text-red-300 ring-2 ring-inset ring-red-500'
                : 'bg-[#003366] text-white'
              : showError
                ? 'bg-red-500/10 text-red-400 ring-2 ring-inset ring-red-600'
                : 'bg-tusas-bg text-tusas-muted hover:text-tusas-text';
            return (
              <button
                key={cfg.id}
                type="button"
                onClick={() => setActiveTab(i)}
                className={`flex items-center justify-center gap-2 flex-1 px-4 py-2.5 text-sm font-semibold transition-colors ${tabCls}`}
              >
                {cfg.tabLabel}
                {hasVal && (
                  <span className={`flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                    activeTab === i
                      ? 'bg-white/20 text-white'
                      : badgeInactive[badgeColor]
                  }`}>
                    {cfg.value}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-tusas-border">
          <button
            type="button"
            onClick={() => setMode('flowchart')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
              mode === 'flowchart'
                ? 'bg-tusas-bg text-tusas-text'
                : 'text-tusas-muted hover:text-tusas-text'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5" />
            Flowchart
          </button>
          <button
            type="button"
            onClick={() => setMode('direct')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
              mode === 'direct'
                ? 'bg-tusas-bg text-tusas-text'
                : 'text-tusas-muted hover:text-tusas-text'
            }`}
          >
            <Hash className="h-3.5 w-3.5" />
            Direct
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        {mode === 'flowchart' ? (
          <FlowchartView
            key={`${r.id}-${activeTab}`}
            tree={r.decisionTree}
            totalSteps={r.totalSteps}
            descriptions={r.descriptions}
            onApply={(rating) => r.onChange(rating)}
            valueColors={r.valueColors}
          />
        ) : (
          <DirectView
            value={r.value}
            min={r.min}
            max={r.max}
            onChange={r.onChange}
            valueColors={r.valueColors}
            hasError={r.hasError}
          />
        )}
      </div>

      {/* Comment */}
      <div className="border-t border-tusas-border px-6 py-4">
        <label className="mb-1.5 block text-xs font-medium text-tusas-muted">Comment</label>
        <DebouncedInput
          type="text"
          placeholder="Add a comment for this rating..."
          value={r.comment ?? ''}
          onValueChange={(t) => r.onCommentChange?.(t)}
          disabled={r.onCommentChange === undefined}
          className="w-full rounded-lg border border-tusas-border bg-tusas-bg px-3 py-2 text-sm text-tusas-text placeholder-tusas-muted outline-none transition-colors focus:border-tusas-blue disabled:opacity-50"
        />
      </div>
    </section>
  );
}

/* ─── Flowchart View ─── */

const COLOR_CLASSES: Record<ColorKey, { bg: string; text: string; border: string }> = {
  green:  { bg: 'bg-green-600',  text: 'text-green-400',  border: 'border-green-600' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500' },
  red:    { bg: 'bg-red-600',    text: 'text-red-400',    border: 'border-red-600' },
};

interface FlowchartViewProps {
  tree: DecisionNode;
  totalSteps: number;
  descriptions?: Record<string, RatingDescription>;
  onApply: (rating: number) => void;
  valueColors: (v: number) => ColorKey;
}

function FlowchartView({ tree, totalSteps, descriptions, onApply, valueColors }: FlowchartViewProps) {
  const [history, setHistory] = useState<DecisionNode[]>([tree]);
  const [result, setResult] = useState<number | null>(null);

  const currentNode = history[history.length - 1];
  const step = history.length;
  const isBinary = currentNode.options.length === 2 &&
    currentNode.options.every((o) => o.sentiment != null);

  // Auto-apply rating when flowchart reaches a result
  useEffect(() => {
    if (result !== null) onApply(result);
  }, [result, onApply]);

  const handleOption = useCallback((opt: DecisionOption) => {
    if (typeof opt.next === 'number') {
      setResult(opt.next);
    } else {
      setHistory((prev) => [...prev, opt.next as DecisionNode]);
    }
  }, []);

  const restart = useCallback(() => {
    setHistory([tree]);
    setResult(null);
  }, [tree]);

  // Build breadcrumb from history contexts
  const breadcrumb = history
    .map((node) => node.context)
    .filter(Boolean)
    .join(' → ');

  if (result !== null) {
    const desc = descriptions?.[String(result)];
    const color = valueColors(result);
    const cc = COLOR_CLASSES[color];

    return (
      <div className="space-y-5">
        {/* Breadcrumb */}
        {breadcrumb && (
          <div className="rounded-lg bg-[#1a2332] px-4 py-2.5">
            <p className={`text-xs font-medium ${cc.text}`}>
              <XIcon className="mr-1.5 inline h-3 w-3" />
              {breadcrumb}
            </p>
          </div>
        )}

        {/* Result */}
        <div className="text-center">
          <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl ${cc.bg}`}>
            <span className="text-2xl font-bold text-white">{result}</span>
          </div>
          {desc && <p className={`text-base font-bold ${cc.text}`}>{desc.label}</p>}
          {desc && <p className="mx-auto mt-2 max-w-lg text-sm text-tusas-muted leading-relaxed">{desc.description}</p>}
        </div>

        {/* Start Over */}
        <div>
          <button
            type="button"
            onClick={restart}
            className="flex items-center gap-1.5 rounded-lg border border-tusas-border px-4 py-2 text-xs font-medium text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tusas-blue text-xs font-bold text-white">
          {step}
        </span>
        <span className="text-xs font-medium text-tusas-muted">
          Step {step} of {totalSteps}
        </span>
        {history.length > 1 && (
          <button
            type="button"
            onClick={() => setHistory((prev) => prev.slice(0, -1))}
            className="ml-auto flex items-center gap-1 text-xs text-tusas-muted transition-colors hover:text-tusas-text"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </button>
        )}
      </div>

      {/* Context bar */}
      {currentNode.context && (
        <div className="rounded-lg bg-[#1a2332] px-4 py-2.5">
          <p className="text-xs font-medium text-gray-300">{currentNode.context}</p>
        </div>
      )}

      {/* Question */}
      <h4 className="text-base font-bold text-tusas-text leading-relaxed">
        {currentNode.question}
      </h4>

      {/* Options */}
      {isBinary ? (
        <div className="grid grid-cols-2 gap-3">
          {currentNode.options.map((opt, i) => {
            const isPositive = opt.sentiment === 'positive';
            const isYes = opt.label.toLowerCase() === 'yes';
            const borderColor = isPositive
              ? 'border-green-600 hover:bg-green-600/10'
              : 'border-red-600 hover:bg-red-600/10';
            const textColor = isPositive ? 'text-green-400' : 'text-red-400';
            const Icon = isYes ? Check : XIcon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleOption(opt)}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-4 text-sm font-semibold transition-all ${borderColor}`}
              >
                <Icon className={`h-4 w-4 ${textColor}`} />
                <span className={textColor}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {currentNode.options.map((opt, i) => {
            const isTerminal = typeof opt.next === 'number';
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleOption(opt)}
                className="flex w-full items-center gap-3 rounded-lg border-2 border-tusas-border bg-tusas-bg px-4 py-3 text-left text-sm text-tusas-text transition-all hover:border-tusas-blue hover:bg-tusas-blue/5"
              >
                <span className="flex-1 leading-relaxed">{opt.label}</span>
                {isTerminal && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tusas-blue/10 text-xs font-bold text-tusas-blue">
                    {opt.next as number}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Direct View ─── */

interface DirectViewProps {
  value: number | string | null;
  min: number;
  max: number;
  onChange: (v: number | string | null) => void;
  valueColors: (v: number) => ColorKey;
  hasError?: boolean;
}

function DirectView({ value, min, max, onChange, valueColors, hasError }: DirectViewProps) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const isSkip = value === SKIP_VALUE;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {numbers.map((num) => {
        const selected = value === num;
        const color = valueColors(num);
        const cls = selected ? FILLED[color] : `bg-tusas-surface ${OUTLINE[color]}`;
        const errCls = hasError && !selected ? 'border-red-600' : '';
        return (
          <button
            key={num}
            type="button"
            onClick={() => onChange(value === num ? null : num)}
            className={`h-11 w-11 shrink-0 flex items-center justify-center rounded border-2 text-sm font-semibold transition-all ${cls} ${errCls}`}
          >
            {num}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onChange(isSkip ? null : SKIP_VALUE)}
        title="Not Applicable"
        className={`h-11 w-11 shrink-0 flex items-center justify-center rounded border-2 text-sm font-semibold transition-all ${
          isSkip
            ? 'border-gray-500 bg-gray-500 text-white'
            : 'border-tusas-border bg-tusas-surface text-tusas-muted hover:border-gray-500'
        } ${hasError && !isSkip ? 'border-red-600' : ''}`}
      >
        N/A
      </button>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Info, X, GitBranch } from 'lucide-react';
import { SKIP_VALUE } from '../types';
import type { RatingDescription, DecisionNode } from '../types';
import DecisionTreeModal from './DecisionTreeModal';

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

const ACTIVE = 'border-[#003366] bg-[#003366] text-white';
const INACTIVE = 'border-tusas-border bg-tusas-surface text-tusas-text hover:border-tusas-blue';

const ROW_BG: Record<ColorKey, string> = {
  green: 'bg-green-500/15',
  yellow: 'bg-yellow-500/10',
  orange: 'bg-orange-500/10',
  red: 'bg-red-500/10',
};

interface RatingScaleProps {
  label: string;
  value: number | string | null;
  min: number;
  max: number;
  onChange: (v: number | string | null) => void;
  valueColors?: (v: number) => ColorKey;
  hasError?: boolean;
  comment?: string;
  onCommentChange?: (text: string) => void;
  ratingDescriptions?: Record<string, RatingDescription>;
  decisionTree?: DecisionNode;
}

export default function RatingScale({
  label,
  value,
  min,
  max,
  onChange,
  valueColors,
  hasError,
  comment,
  onCommentChange,
  ratingDescriptions,
  decisionTree,
}: RatingScaleProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!infoOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInfoOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [infoOpen]);

  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  const btnClass = (num: number) => {
    const selected = value === num;
    const errCls = hasError ? 'border-red-600' : '';

    if (valueColors) {
      const color = valueColors(num);
      return selected
        ? `border-2 ${FILLED[color] || ACTIVE} ${errCls}`
        : `border-2 bg-tusas-surface ${OUTLINE[color]} ${errCls}`;
    }
    return `${selected ? ACTIVE : INACTIVE} ${errCls}`;
  };

  const isSkip = value === SKIP_VALUE;
  const cellSize = 'h-11 w-11 shrink-0';
  const wrapperErr = hasError
    ? 'rounded-lg border-2 border-red-600 bg-red-500/10 p-2'
    : '';

  return (
    <div className={`space-y-2 ${wrapperErr}`}>
      <div className="flex items-center gap-2">
        <label
          className={`block text-sm font-semibold ${hasError ? 'text-red-600' : 'text-tusas-muted'}`}
        >
          {label}
        </label>
        {ratingDescriptions && (
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            title={`Rating descriptions for ${label}`}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-tusas-blue/40 bg-tusas-blue/10 text-tusas-blue transition-colors hover:bg-tusas-blue/20"
          >
            <Info className="h-3 w-3" />
          </button>
        )}
        {decisionTree && (
          <button
            type="button"
            onClick={() => setTreeOpen(true)}
            title={`Decision tree for ${label}`}
            className="flex h-5 shrink-0 items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 text-emerald-500 transition-colors hover:bg-emerald-500/20"
          >
            <GitBranch className="h-3 w-3" />
            <span className="text-[10px] font-semibold">Flowchart</span>
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {numbers.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(value === num ? null : num)}
            className={`${cellSize} flex items-center justify-center rounded border-2 text-sm font-semibold transition-all overflow-hidden ${btnClass(num)}`}
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(isSkip ? null : SKIP_VALUE)}
          title="Not Applicable"
          className={`${cellSize} flex items-center justify-center rounded border-2 text-sm font-semibold transition-all overflow-hidden ${
            isSkip
              ? 'border-gray-500 bg-gray-500 text-white'
              : 'border-tusas-border bg-tusas-surface text-tusas-muted hover:border-gray-500'
          } ${hasError ? 'border-red-600' : ''}`}
        >
          N/A
        </button>
      </div>
      <div className="mt-2">
        <label className="mb-1 block text-xs font-medium text-tusas-muted">Comment</label>
        <input
          type="text"
          placeholder="Add a comment for this rating..."
          value={comment ?? ''}
          onChange={(e) => onCommentChange?.(e.target.value)}
          disabled={onCommentChange === undefined}
          className="w-full rounded-lg border border-tusas-border bg-tusas-bg px-3 py-2 text-sm text-tusas-text placeholder-tusas-muted outline-none transition-colors focus:border-tusas-blue disabled:opacity-50"
        />
      </div>

      {/* Info Modal */}
      {infoOpen && ratingDescriptions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setInfoOpen(false); }}
        >
          <div
            ref={modalRef}
            className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-tusas-border bg-tusas-surface shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-tusas-border bg-tusas-surface px-6 py-4">
              <h3 className="text-lg font-bold text-tusas-text">{label} — Rating Descriptions</h3>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-tusas-border">
                    <th className="px-3 py-2 text-left font-semibold text-tusas-muted w-16">Rating</th>
                    <th className="px-3 py-2 text-left font-semibold text-tusas-muted w-36">Level</th>
                    <th className="px-3 py-2 text-left font-semibold text-tusas-muted">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {numbers.map((num) => {
                    const desc = ratingDescriptions[String(num)];
                    if (!desc) return null;
                    const color = valueColors ? valueColors(num) : 'green';
                    const rowBg = ROW_BG[color] ?? '';
                    return (
                      <tr key={num} className={`border-b border-tusas-border/50 ${rowBg}`}>
                        <td className="px-3 py-3 text-center font-bold text-tusas-text">{num}</td>
                        <td className="px-3 py-3 font-semibold text-tusas-text">{desc.label}</td>
                        <td className="px-3 py-3 text-tusas-text leading-relaxed">{desc.description}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Decision Tree Modal */}
      {treeOpen && decisionTree && (
        <DecisionTreeModal
          title={`${label} — Decision Flowchart`}
          tree={decisionTree}
          descriptions={ratingDescriptions}
          onApply={(rating) => onChange(rating)}
          onClose={() => setTreeOpen(false)}
        />
      )}
    </div>
  );
}

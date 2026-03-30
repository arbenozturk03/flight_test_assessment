import { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { SKIP_VALUE } from '../types';
import type { RatingDescription } from '../types';
import { DebouncedInput } from './DebouncedInput';

const BORDER_INACTIVE = [
  'border-green-500 text-green-400 hover:bg-green-500/10',
  'border-lime-500 text-lime-400 hover:bg-lime-500/10',
  'border-yellow-500 text-yellow-400 hover:bg-yellow-500/10',
  'border-orange-500 text-orange-400 hover:bg-orange-500/10',
  'border-red-500 text-red-400 hover:bg-red-500/10',
];

const BORDER_ACTIVE = [
  'border-green-500 bg-green-500 text-white',
  'border-lime-500 bg-lime-500 text-gray-900',
  'border-yellow-500 bg-yellow-500 text-gray-900',
  'border-orange-500 bg-orange-500 text-white',
  'border-red-500 bg-red-500 text-white',
];

const BADGE_COLORS = [
  'bg-green-600 text-white',
  'bg-lime-500 text-gray-900',
  'bg-yellow-500 text-gray-900',
  'bg-orange-500 text-white',
  'bg-red-500 text-white',
];

const LABEL_COLORS = [
  'text-green-400',
  'text-lime-400',
  'text-yellow-400',
  'text-orange-400',
  'text-red-400',
];

interface OptionSelectorProps {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
  hasError?: boolean;
  comment?: string;
  onCommentChange?: (text: string) => void;
  ratingDescriptions?: Record<string, RatingDescription>;
}

export default function OptionSelector({
  label,
  value,
  options,
  onChange,
  hasError,
  comment,
  onCommentChange,
  ratingDescriptions,
}: OptionSelectorProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!infoOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInfoOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [infoOpen]);

  const visibleOptions = options.filter((o) => o !== SKIP_VALUE);
  const wrapperErr = hasError
    ? 'rounded-lg border-2 border-red-600 bg-red-500/10 p-3'
    : '';

  return (
    <div className={`min-w-0 space-y-2 ${wrapperErr}`}>
      <div className="flex items-center gap-2">
        <label
          className={`block text-sm font-bold ${hasError ? 'text-red-500' : 'text-tusas-text'}`}
        >
          {label}
        </label>
        {ratingDescriptions && (
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            title={`Rating descriptions for ${label}`}
            className="ml-1 shrink-0 text-blue-400 transition-colors hover:text-blue-300"
          >
            <Info className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      <div className="flex flex-nowrap items-stretch gap-2 min-w-0 overflow-hidden">
        {visibleOptions.map((opt, idx) => {
          const selected = value === opt;
          const colorIdx = Math.min(idx, BORDER_ACTIVE.length - 1);
          const cls = selected
            ? BORDER_ACTIVE[colorIdx]
            : BORDER_INACTIVE[colorIdx];
          const errBorder = hasError && !selected ? 'border-red-600' : '';

          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(value === opt ? null : opt)}
              className={`min-h-11 min-w-0 flex-1 rounded-lg border-2 px-2 py-2 text-sm font-semibold transition-all overflow-hidden flex items-center justify-center ${cls} ${errBorder}`}
            >
              <span className="block w-full min-w-0 text-center leading-tight" title={opt}>
                {opt}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange(value === SKIP_VALUE ? null : SKIP_VALUE)}
          title="Not Applicable"
          className={`min-h-11 flex-1 rounded-lg border-2 px-2 py-2 text-sm font-semibold transition-all flex items-center justify-center ${
            value === SKIP_VALUE
              ? 'border-gray-500 bg-gray-500 text-white'
              : 'border-tusas-border bg-tusas-surface text-tusas-muted hover:border-gray-500'
          } ${hasError && value !== SKIP_VALUE ? 'border-red-600' : ''}`}
        >
          N/A
        </button>
      </div>
      <div className="mt-2">
        <label className="mb-1 block text-xs font-medium text-tusas-muted">Comment</label>
        <DebouncedInput
          type="text"
          placeholder="Add a comment for this rating..."
          value={comment ?? ''}
          onValueChange={(t) => onCommentChange?.(t)}
          disabled={onCommentChange === undefined}
          className="w-full rounded-lg border border-tusas-border bg-tusas-bg px-3 py-2 text-sm text-tusas-text placeholder-tusas-muted outline-none transition-colors focus:border-tusas-blue disabled:opacity-50"
        />
      </div>

      {/* Info Modal */}
      {infoOpen && ratingDescriptions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setInfoOpen(false); }}
        >
          <div
            ref={modalRef}
            className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111827] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#111827] px-6 py-4">
              <h3 className="text-lg font-bold text-white">{label}</h3>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="divide-y divide-white/5">
              {visibleOptions
                .slice()
                .reverse()
                .map((opt, idx) => {
                  const desc = ratingDescriptions[opt];
                  if (!desc) return null;
                  const badgeColor = BADGE_COLORS[Math.min(idx, BADGE_COLORS.length - 1)];
                  const labelColor = LABEL_COLORS[Math.min(idx, LABEL_COLORS.length - 1)];
                  return (
                    <div key={opt} className="flex gap-4 px-6 py-4 transition-colors hover:bg-white/[0.03]">
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${badgeColor}`}>
                          {opt}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${labelColor}`}>{desc.label}</p>
                        <p className="mt-1 text-sm leading-relaxed text-gray-400">{desc.description}</p>
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

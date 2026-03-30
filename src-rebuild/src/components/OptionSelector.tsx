import { useState } from 'react';
import { Info, X, Check } from 'lucide-react';
import { SKIP_VALUE } from '../types';

/* Color arrays: index 0 = rating '1' (best/green) … index 4 = rating '5' (worst/red) */

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

/* Popup badge colors: index 0 = top item (best), index 4 = bottom item (worst) */
const POPUP_BADGE = [
  'bg-green-500 text-white',
  'bg-lime-500 text-gray-900',
  'bg-yellow-500 text-gray-900',
  'bg-orange-500 text-white',
  'bg-red-500 text-white',
];

const POPUP_LABEL = [
  'text-green-400',
  'text-lime-400',
  'text-yellow-400',
  'text-orange-400',
  'text-red-400',
];

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
  pdfLabels?: Record<string, string>;
  longDescriptions?: Record<string, string>;
}

export default function OptionSelector({
  label,
  value,
  options,
  onChange,
  hasError,
  comment,
  onCommentChange,
  pdfLabels,
  longDescriptions,
}: OptionSelectorProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const visibleOptions = options.filter((o) => o !== SKIP_VALUE);
  const hasInfo = longDescriptions && Object.keys(longDescriptions).length > 0;
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
        {hasInfo && (
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="text-blue-500 transition-colors hover:text-blue-400"
            title={`${label} rating descriptions`}
          >
            <Info className="h-5 w-5" strokeWidth={2.5} />
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
        <input
          type="text"
          placeholder="Add a comment for this rating..."
          value={comment ?? ''}
          onChange={(e) => onCommentChange?.(e.target.value)}
          disabled={onCommentChange === undefined}
          className="w-full rounded-lg border border-tusas-border bg-tusas-bg px-3 py-2 text-sm text-tusas-text placeholder-tusas-muted outline-none transition-colors focus:border-tusas-blue disabled:opacity-50"
        />
      </div>

      {/* Info popup modal */}
      {infoOpen && hasInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setInfoOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-[700px] rounded-xl border border-[#1e293b] bg-[#111827] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1e293b] px-7 py-5">
              <h3 className="text-xl font-semibold text-white">{label}</h3>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="text-slate-400 transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-[#1e293b]">
              {visibleOptions.map((opt, idx) => {
                const colorIdx = Math.min(idx, POPUP_BADGE.length - 1);
                const shortLabel = pdfLabels?.[opt] ?? '';
                const longDesc = longDescriptions?.[opt] ?? '';
                if (!shortLabel && !longDesc) return null;
                const isSelected = opt === value;
                return (
                  <div key={opt} className={`px-7 py-4 transition-colors ${isSelected ? `${SELECTED_BG[colorIdx]} border-l-[3px] ${SELECTED_BORDER[colorIdx]}` : 'hover:bg-[#181e2d]'}`}>
                    <div className="flex gap-3.5">
                      <div className="flex items-start pt-px">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold ${POPUP_BADGE[colorIdx]}`}>
                          {opt}
                        </span>
                      </div>
                      <div className="min-w-0 -mt-px flex-1">
                        <span className={`block text-[15px] font-semibold leading-tight ${POPUP_LABEL[colorIdx]}`}>
                          {shortLabel}
                        </span>
                        {longDesc && (
                          <p className="mt-0.5 text-[14px] leading-relaxed text-slate-400">
                            {longDesc}
                          </p>
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

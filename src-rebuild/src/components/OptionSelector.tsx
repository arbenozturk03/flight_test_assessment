import { SKIP_VALUE } from '../types';

const BORDER_INACTIVE = [
  'border-green-500 text-green-400 hover:bg-green-500/10',
  'border-orange-500 text-orange-400 hover:bg-orange-500/10',
  'border-red-500 text-red-400 hover:bg-red-500/10',
];

const BORDER_ACTIVE = [
  'border-green-500 bg-green-500 text-white',
  'border-orange-500 bg-orange-500 text-white',
  'border-red-500 bg-red-500 text-white',
];

interface OptionSelectorProps {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
  hasError?: boolean;
  comment?: string;
  onCommentChange?: (text: string) => void;
}

export default function OptionSelector({
  label,
  value,
  options,
  onChange,
  hasError,
  comment,
  onCommentChange,
}: OptionSelectorProps) {
  const visibleOptions = options.filter((o) => o !== SKIP_VALUE);
  const wrapperErr = hasError
    ? 'rounded-lg border-2 border-red-600 bg-red-500/10 p-3'
    : '';

  return (
    <div className={`min-w-0 space-y-2 ${wrapperErr}`}>
      <label
        className={`block text-sm font-bold ${hasError ? 'text-red-500' : 'text-tusas-text'}`}
      >
        {label}
      </label>
      {/* Single row, equal width, N/A included */}
      <div className="flex flex-nowrap items-stretch gap-2 min-w-0 overflow-hidden">
        {visibleOptions.map((opt, idx) => {
          const selected = value === opt;
          const colorIdx = Math.min(idx, 2);
          const cls = selected
            ? BORDER_ACTIVE[colorIdx]
            : BORDER_INACTIVE[colorIdx];
          const errBorder = hasError && !selected ? 'border-red-600' : '';

          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(value === opt ? null : opt)}
              className={`min-h-14 min-w-0 flex-1 rounded-lg border-2 px-2 py-2 text-sm font-medium transition-all overflow-hidden flex items-center justify-center ${cls} ${errBorder}`}
            >
              <span className="block w-full min-w-0 text-center leading-tight overflow-hidden whitespace-nowrap text-ellipsis" title={opt}>
                {opt}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange(value === SKIP_VALUE ? null : SKIP_VALUE)}
          title="Not Applicable"
          className={`min-h-14 shrink-0 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all flex items-center justify-center w-14 ${
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
    </div>
  );
}

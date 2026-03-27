import { SKIP_VALUE } from '../types';

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
}: RatingScaleProps) {
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
      <label
        className={`block text-sm font-semibold ${hasError ? 'text-red-600' : 'text-tusas-muted'}`}
      >
        {label}
      </label>
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
    </div>
  );
}

interface NumberKeypadProps {
  label: string;
  value: number | null;
  onChange: (val: number | null) => void;
  min?: number;
  max?: number;
}

const ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['', '0', 'b'],
];

export default function NumberKeypad({
  label,
  value,
  onChange,
  max = 999,
}: NumberKeypadProps) {
  const display = value ? String(value) : '';

  const appendDigit = (digit: string) => {
    const next = display + digit;
    const num = parseInt(next, 10) || 0;
    if (num > max) return;
    if (next.length <= 3) onChange(num || null);
  };

  const backspace = () => {
    if (display.length <= 1) return onChange(null);
    onChange(parseInt(display.slice(0, -1), 10) || null);
  };

  return (
    <div className="mx-auto max-w-[220px] rounded-lg border border-tusas-border bg-tusas-surface p-3">
      <label className="mb-2 block text-xs font-medium text-tusas-muted">
        {label}
      </label>
      <div className="mb-2 flex min-h-[40px] items-center justify-center rounded border border-tusas-border bg-tusas-bg text-lg font-bold tabular-nums text-tusas-text">
        {display || '—'}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {ROWS.flatMap((row) =>
          row.map((key, colIdx) => {
            if (key === 'b') {
              return (
                <button
                  key="back"
                  type="button"
                  onClick={backspace}
                  className="min-h-[36px] rounded border border-tusas-border bg-tusas-bg text-xs font-medium text-tusas-muted transition-all hover:border-tusas-blue active:scale-95"
                >
                  Clear
                </button>
              );
            }
            if (!key) {
              return <div key={`empty-${colIdx}`} />;
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => appendDigit(key)}
                className="min-h-[36px] rounded border border-tusas-border bg-tusas-bg text-base font-semibold text-tusas-text transition-all hover:border-tusas-blue active:scale-95"
              >
                {key}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

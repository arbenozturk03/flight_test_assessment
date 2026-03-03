import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  hasError?: boolean;
  /** Names to appear first in the selection list (in order) */
  firstInDropdown?: string[];
  /** When true, only one option can be selected at a time */
  singleSelect?: boolean;
}

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  hasError,
  firstInDropdown = [],
  singleSelect = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rest = options.filter((o) => !firstInDropdown.includes(o));
  const restSorted = [...rest].sort((a, b) => a.localeCompare(b, 'tr'));
  const sortedOptions = [...firstInDropdown.filter((o) => options.includes(o)), ...restSorted];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (opt: string) => {
    if (singleSelect) {
      onChange(selected.includes(opt) ? [] : [opt]);
      setIsOpen(false);
    } else {
      onChange(
        selected.includes(opt)
          ? selected.filter((s) => s !== opt)
          : [...selected, opt].sort((a, b) => a.localeCompare(b, 'tr')),
      );
    }
  };

  const displayText =
    selected.length > 0 ? selected.join(', ') : placeholder;

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 flex flex-col gap-2">
      <label
        className={`text-xs font-medium ${hasError ? 'text-red-600' : 'text-tusas-muted'}`}
      >
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`flex min-h-9 w-full items-center justify-between gap-2 rounded border px-3 py-2 text-left text-sm text-tusas-text outline-none transition-colors focus:border-tusas-blue ${
          hasError
            ? 'border-red-600 bg-red-500/10'
            : 'border-tusas-border bg-tusas-bg hover:border-tusas-blue'
        } ${isOpen ? 'border-tusas-blue' : ''}`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${selected.length === 0 ? 'text-tusas-muted' : ''}`}
          title={displayText}
        >
          {displayText}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-tusas-border bg-tusas-surface py-1 shadow-lg"
          role="listbox"
        >
          {sortedOptions.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={() => toggle(opt)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-tusas-text transition-colors hover:bg-tusas-bg"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                    singleSelect ? 'rounded-full' : 'rounded'
                  } ${
                    checked
                      ? 'border-[#003366] bg-[#003366]'
                      : 'border-tusas-border bg-transparent'
                  }`}
                >
                  {checked && (
                    singleSelect
                      ? <span className="block h-2 w-2 rounded-full bg-white" />
                      : <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                  )}
                </span>
                <span className="min-w-0 truncate">{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

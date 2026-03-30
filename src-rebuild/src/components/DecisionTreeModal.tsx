import { useState, useCallback } from 'react';
import { X, ChevronLeft, ArrowRight, Check } from 'lucide-react';
import type { DecisionNode, RatingDescription } from '../types';

interface DecisionTreeModalProps {
  title: string;
  tree: DecisionNode;
  descriptions?: Record<string, RatingDescription>;
  onApply: (rating: number) => void;
  onClose: () => void;
}

export default function DecisionTreeModal({
  title,
  tree,
  descriptions,
  onApply,
  onClose,
}: DecisionTreeModalProps) {
  const [history, setHistory] = useState<DecisionNode[]>([tree]);
  const [result, setResult] = useState<number | null>(null);

  const currentNode = history[history.length - 1];

  const handleOption = useCallback((next: DecisionNode | number) => {
    if (typeof next === 'number') {
      setResult(next);
    } else {
      setHistory((prev) => [...prev, next]);
    }
  }, []);

  const goBack = useCallback(() => {
    if (result !== null) {
      setResult(null);
    } else if (history.length > 1) {
      setHistory((prev) => prev.slice(0, -1));
    }
  }, [result, history.length]);

  const resetTree = useCallback(() => {
    setHistory([tree]);
    setResult(null);
  }, [tree]);

  const stepNumber = history.length;
  const canGoBack = history.length > 1 || result !== null;

  const desc = result !== null ? descriptions?.[String(result)] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-tusas-border bg-tusas-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-tusas-border px-6 py-4">
          <h3 className="text-lg font-bold text-tusas-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {result === null ? (
            <>
              {/* Progress indicator */}
              <div className="mb-4 flex items-center gap-2">
                {history.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      i < stepNumber ? 'bg-tusas-blue' : 'bg-tusas-border'
                    }`}
                  />
                ))}
                <div className="h-2 flex-1 rounded-full bg-tusas-border" />
              </div>

              <p className="mb-2 text-xs font-medium text-tusas-muted">
                Step {stepNumber}
              </p>
              <h4 className="mb-6 text-base font-semibold text-tusas-text leading-relaxed">
                {currentNode.question}
              </h4>

              <div className="space-y-3">
                {currentNode.options.map((opt, i) => {
                  const isTerminal = typeof opt.next === 'number';
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleOption(opt.next)}
                      className="group flex w-full items-center gap-3 rounded-lg border-2 border-tusas-border bg-tusas-bg px-4 py-3 text-left text-sm font-medium text-tusas-text transition-all hover:border-tusas-blue hover:bg-tusas-blue/5"
                    >
                      <span className="flex-1 leading-relaxed">{opt.label}</span>
                      {isTerminal ? (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tusas-blue/10 text-xs font-bold text-tusas-blue">
                          {opt.next as number}
                        </span>
                      ) : (
                        <ArrowRight className="h-4 w-4 shrink-0 text-tusas-muted transition-colors group-hover:text-tusas-blue" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* Result screen */
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-tusas-blue bg-tusas-blue/10">
                <span className="text-3xl font-bold text-tusas-blue">{result}</span>
              </div>
              <h4 className="mb-1 text-xl font-bold text-tusas-text">
                Rating: {result}
              </h4>
              {desc && (
                <p className="mb-1 text-base font-semibold text-tusas-blue">
                  {desc.label}
                </p>
              )}
              {desc && (
                <p className="mx-auto max-w-md text-sm text-tusas-muted leading-relaxed">
                  {desc.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-tusas-border px-6 py-4">
          <div className="flex gap-2">
            {canGoBack && (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 rounded-lg border border-tusas-border px-3 py-2 text-xs font-medium text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {(history.length > 1 || result !== null) && (
              <button
                type="button"
                onClick={resetTree}
                className="flex items-center gap-1.5 rounded-lg border border-tusas-border px-3 py-2 text-xs font-medium text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
              >
                Restart
              </button>
            )}
          </div>
          {result !== null && (
            <button
              type="button"
              onClick={() => { onApply(result); onClose(); }}
              className="flex items-center gap-2 rounded-lg bg-tusas-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-tusas-blue/90"
            >
              <Check className="h-4 w-4" />
              Apply Rating {result}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

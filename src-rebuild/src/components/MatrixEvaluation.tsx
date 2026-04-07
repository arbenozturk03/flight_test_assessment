import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  type CSSProperties,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Info, X, Check, MessageSquare } from 'lucide-react';
import type { QualitativeCriterion } from '../types';
import { SKIP_VALUE } from '../types';

const BADGE_COLOR = [
  'bg-green-500 text-white',
  'bg-lime-500 text-gray-900',
  'bg-yellow-500 text-gray-900',
  'bg-orange-500 text-white',
  'bg-red-500 text-white',
];

const BADGE_RING = [
  'ring-green-500/40',
  'ring-lime-500/40',
  'ring-yellow-500/40',
  'ring-orange-500/40',
  'ring-red-500/40',
];

const POP_INACTIVE = [
  'border-green-500/40 text-sev-green hover:bg-green-500/20',
  'border-lime-500/40 text-sev-lime hover:bg-lime-500/20',
  'border-yellow-500/40 text-sev-yellow hover:bg-yellow-500/20',
  'border-orange-500/40 text-sev-orange hover:bg-orange-500/20',
  'border-red-500/40 text-sev-red hover:bg-red-500/20',
];

const POPUP_BADGE = [
  'bg-green-500 text-white',
  'bg-lime-500 text-gray-900',
  'bg-yellow-500 text-gray-900',
  'bg-orange-500 text-white',
  'bg-red-500 text-white',
];
const POPUP_LABEL = ['text-sev-green', 'text-sev-lime', 'text-sev-yellow', 'text-sev-orange', 'text-sev-red'];

const POP_W = 230;
const POP_PAD = 24;
/** Min `top` (viewport px) so the scale stays below `<main>` / clear of the app header. */
const CONTENT_TOP_INSET = 6;
/** Below app header (`z-50`); above matrix sticky cells / normal content. */
const SCALE_POPOVER_Z = 40;

function contentTopClampPx(scrollMain: HTMLElement | null | undefined): number | null {
  if (!scrollMain) return null;
  return scrollMain.getBoundingClientRect().top + CONTENT_TOP_INSET;
}

function matrixScalePortalHost(): HTMLElement {
  return document.getElementById('root') ?? document.body;
}

/**
 * Panel tracks the cell (`top = anchor.bottom + 4`). When that would sit above the safe line
 * (`main` top, below app header), `obscured` hides it; scrolling back restores visibility aligned to the cell.
 */
function computeScalePosition(
  anchor: DOMRect,
  minTop: number | null,
): { top: number; left: number; obscured: boolean } {
  const vw = document.documentElement.clientWidth;
  let left = anchor.left + anchor.width / 2 - POP_W / 2;
  if (left + POP_W > vw - POP_PAD) left = vw - POP_PAD - POP_W;
  if (left < POP_PAD) left = POP_PAD;
  const below = anchor.bottom + 4;
  const obscured = minTop != null && below < minTop;
  return { top: below, left, obscured };
}

function scalePopoverStyle(top: number, left: number, obscured: boolean): CSSProperties {
  return {
    position: 'fixed',
    top,
    left,
    width: POP_W,
    zIndex: SCALE_POPOVER_Z,
    margin: 0,
    pointerEvents: obscured ? 'none' : 'auto',
    visibility: obscured ? 'hidden' : 'visible',
    transform: 'none',
    right: 'auto',
    bottom: 'auto',
  };
}

function MatrixCell({
  value,
  hasError,
  isScaleOpen,
  onScaleTrigger,
}: {
  value: string | null;
  hasError: boolean;
  isScaleOpen: boolean;
  onScaleTrigger: (anchorRect: DOMRect) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const isNA = value === SKIP_VALUE;
  const numIdx = value && !isNA ? Math.min(Number(value) - 1, 4) : -1;

  let badgeClass: string;
  let badgeLabel: string;

  if (isNA) {
    badgeClass = 'bg-gray-500/80 text-white ring-1 ring-gray-500/30';
    badgeLabel = 'N/A';
  } else if (value && numIdx >= 0) {
    badgeClass = `${BADGE_COLOR[numIdx]} ring-2 ${BADGE_RING[numIdx]}`;
    badgeLabel = value;
  } else {
    badgeClass = `border-2 border-dashed ${hasError ? 'border-red-500/70 bg-red-500/10 text-red-400' : 'border-tusas-border text-tusas-muted/40'} hover:border-tusas-blue/50 hover:bg-tusas-blue/5`;
    badgeLabel = '·';
  }

  return (
    <div
      ref={ref}
      className="relative inline-flex justify-center"
      data-fta-matrix-scale-anchor={isScaleOpen ? 'true' : undefined}
    >
      <button
        type="button"
        onClick={() => {
          const r = ref.current?.getBoundingClientRect();
          if (r) onScaleTrigger(r);
        }}
        className={`h-9 min-w-[2.25rem] rounded-lg px-1.5 text-xs font-bold transition-all ${badgeClass}`}
      >
        {badgeLabel}
      </button>
    </div>
  );
}

interface MatrixEvaluationProps {
  handlingCriteria: QualitativeCriterion[];
  phases: QualitativeCriterion[];
  getValue: (handlingId: string, phaseId: string) => string | null;
  onValueChange: (handlingId: string, phaseId: string, value: string | null) => void;
  getComment: (handlingId: string) => string;
  onCommentChange: (handlingId: string, text: string) => void;
  errorCellKeys: Set<string>;
  /** Scroll container (e.g. `<main>`) so the scale tracks the cell while scrolling */
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

export default function MatrixEvaluation({
  handlingCriteria,
  phases,
  getValue,
  onValueChange,
  getComment,
  onCommentChange,
  errorCellKeys,
  scrollContainerRef,
}: MatrixEvaluationProps) {
  const [infoOpen, setInfoOpen] = useState<string | null>(null);
  const [expandedComment, setExpandedComment] = useState<string | null>(null);
  /** Open scale + `fixed` viewport coords (updated on scroll so the panel stays under the cell). */
  const [activeCell, setActiveCell] = useState<{
    row: string;
    col: string;
    top: number;
    left: number;
    obscured: boolean;
  } | null>(null);
  const scalePopRef = useRef<HTMLDivElement>(null);
  const scaleOpen = activeCell != null;

  const infoCriterion = infoOpen ? handlingCriteria.find((c) => c.id === infoOpen) : null;

  const closeScale = useCallback(() => setActiveCell(null), []);

  const toggleScaleFromRect = useCallback(
    (rowId: string, colId: string, rect: DOMRect) => {
      const minTop = contentTopClampPx(scrollContainerRef?.current ?? null);
      setActiveCell((prev) => {
        if (prev && prev.row === rowId && prev.col === colId) return null;
        const { top, left, obscured } = computeScalePosition(rect, minTop);
        return { row: rowId, col: colId, top, left, obscured };
      });
    },
    [scrollContainerRef],
  );

  const syncScalePositionToAnchor = useCallback(() => {
    const minTop = contentTopClampPx(scrollContainerRef?.current ?? null);
    setActiveCell((prev) => {
      if (!prev) return prev;
      const anchor = document.querySelector<HTMLElement>('[data-fta-matrix-scale-anchor="true"]');
      if (!anchor) return prev;
      const ar = anchor.getBoundingClientRect();
      const { top, left, obscured } = computeScalePosition(ar, minTop);
      if (prev.top === top && prev.left === left && prev.obscured === obscured) return prev;
      return { ...prev, top, left, obscured };
    });
  }, [scrollContainerRef]);

  /** After open / cell switch, align once to DOM (covers layout timing). */
  useLayoutEffect(() => {
    if (!activeCell) return;
    syncScalePositionToAnchor();
  }, [activeCell?.row, activeCell?.col, syncScalePositionToAnchor]);

  /** Keep scale glued to the active cell while the main column scrolls. */
  useEffect(() => {
    if (!scaleOpen) return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => syncScalePositionToAnchor());
    };

    schedule();
    const scrollEl = scrollContainerRef?.current ?? null;
    scrollEl?.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', schedule);
    vv?.addEventListener('scroll', schedule);

    return () => {
      cancelAnimationFrame(raf);
      scrollEl?.removeEventListener('scroll', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      vv?.removeEventListener('resize', schedule);
      vv?.removeEventListener('scroll', schedule);
    };
  }, [scaleOpen, scrollContainerRef, syncScalePositionToAnchor]);

  useEffect(() => {
    if (!activeCell) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (scalePopRef.current?.contains(t)) return;
      const el = e.target as Element | null;
      if (el?.closest?.('[data-fta-matrix-scale-anchor="true"]')) return;
      setActiveCell(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [activeCell]);

  const scaleOverlayValue =
    activeCell != null ? getValue(activeCell.row, activeCell.col) : null;

  return (
    <div className="space-y-0">
      <div className="overflow-visible rounded-lg border border-tusas-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-tusas-matrix-head border-b border-r border-tusas-border px-4 py-3 text-left text-xs font-semibold text-tusas-muted w-48 min-w-[12rem]" />
              {phases.map((phase) => {
                const isActiveCol = activeCell?.col === phase.id;
                return (
                  <th
                    key={phase.id}
                    className={`border-b border-r border-tusas-border px-3 py-3 text-center text-xs font-semibold transition-colors duration-200 ${
                      isActiveCol
                        ? 'bg-blue-500/15 text-blue-300'
                        : 'bg-tusas-matrix-head text-tusas-muted'
                    }`}
                  >
                    {phase.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {handlingCriteria.map((criterion, rowIdx) => {
              const isCommentOpen = expandedComment === criterion.id;
              const comment = getComment(criterion.id);
              const hasAnyError = phases.some((p) =>
                errorCellKeys.has(`${criterion.id}__${p.id}`),
              );
              const rowBg = rowIdx % 2 === 0 ? 'bg-tusas-surface' : 'bg-tusas-matrix-row-alt';

              const completedCount = phases.filter((p) => {
                const v = getValue(criterion.id, p.id);
                return v != null;
              }).length;
              const allFilled = completedCount === phases.length;

              return (
                <tr key={criterion.id} className={rowBg}>
                  <td
                    className={`sticky left-0 z-10 ${rowBg} border-b border-r border-tusas-border px-3 py-2.5`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-sm font-bold leading-tight ${hasAnyError ? 'text-red-400' : 'text-tusas-text'}`}
                      >
                        {criterion.label}
                      </span>
                      <div className="ml-auto flex items-center gap-1.5 shrink-0">
                        <span className="w-4 flex justify-center">
                          {allFilled ? (
                            <Check className="h-3.5 w-3.5 text-green-500" strokeWidth={3} />
                          ) : completedCount > 0 ? (
                            <span className="text-[10px] font-medium text-tusas-muted">
                              {completedCount}/{phases.length}
                            </span>
                          ) : null}
                        </span>
                        {criterion.longDescriptions && (
                          <button
                            type="button"
                            onClick={() => setInfoOpen(criterion.id)}
                            className="text-blue-500 transition-colors hover:text-blue-400"
                            title={`${criterion.label} rating descriptions`}
                          >
                            <Info className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedComment(isCommentOpen ? null : criterion.id)
                          }
                          className={`transition-colors ${
                            comment
                              ? 'text-blue-400 hover:text-blue-300'
                              : 'text-tusas-muted hover:text-tusas-text'
                          }`}
                          title={`Comment for ${criterion.label}`}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {isCommentOpen && (
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder={`Comment for ${criterion.label}...`}
                          value={comment}
                          onChange={(e) => onCommentChange(criterion.id, e.target.value)}
                          className="w-full rounded-lg border border-tusas-border bg-tusas-bg px-3 py-1.5 text-xs text-tusas-text placeholder-tusas-muted outline-none transition-colors focus:border-tusas-blue"
                        />
                      </div>
                    )}
                  </td>
                  {phases.map((phase) => {
                    const cellKey = `${criterion.id}__${phase.id}`;
                    const isCellActive = activeCell?.row === criterion.id && activeCell?.col === phase.id;
                    return (
                      <td
                        key={phase.id}
                        className="border-b border-r border-tusas-border px-2 py-2 text-center"
                      >
                        <MatrixCell
                          value={getValue(criterion.id, phase.id)}
                          hasError={errorCellKeys.has(cellKey)}
                          isScaleOpen={isCellActive}
                          onScaleTrigger={(rect) =>
                            toggleScaleFromRect(criterion.id, phase.id, rect)
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeCell &&
        createPortal(
          <div
            ref={scalePopRef}
            id="fta-matrix-scale-popover"
            style={scalePopoverStyle(activeCell.top, activeCell.left, activeCell.obscured)}
            className="rounded-lg border border-tusas-popover-border bg-tusas-popover-bg p-1 shadow-xl"
          >
            <div className="flex items-center gap-[3px]">
              {['1', '2', '3', '4', '5'].map((opt, idx) => {
                const selected = scaleOverlayValue === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onValueChange(
                        activeCell.row,
                        activeCell.col,
                        selected ? null : opt,
                      );
                      closeScale();
                    }}
                    className={`h-7 flex-1 rounded-md text-[11px] font-bold transition-all ${
                      selected ? BADGE_COLOR[idx] : `border ${POP_INACTIVE[idx]}`
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
              <div className="mx-px h-4 w-px shrink-0 bg-tusas-popover-border" />
              <button
                type="button"
                onClick={() => {
                  const isNA = scaleOverlayValue === SKIP_VALUE;
                  onValueChange(activeCell.row, activeCell.col, isNA ? null : SKIP_VALUE);
                  closeScale();
                }}
                className={`h-7 flex-1 rounded-md text-[9px] font-bold transition-all ${
                  scaleOverlayValue === SKIP_VALUE
                    ? 'bg-gray-500 text-white'
                    : 'border border-gray-500/30 text-gray-400 hover:bg-gray-500/20'
                }`}
              >
                N/A
              </button>
            </div>
          </div>,
          matrixScalePortalHost(),
        )}

      {/* Info modal */}
      {infoOpen && infoCriterion?.longDescriptions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setInfoOpen(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-[700px] rounded-xl border border-tusas-panel-border bg-tusas-panel shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-tusas-panel-border px-7 py-5">
              <h3 className="text-xl font-semibold text-tusas-text">
                {infoCriterion.label}
              </h3>
              <button
                type="button"
                onClick={() => setInfoOpen(null)}
                className="text-tusas-muted transition-colors hover:text-tusas-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-tusas-panel-border">
              {['1', '2', '3', '4', '5'].map((opt, idx) => {
                const colorIdx = Math.min(idx, 4);
                const shortLabel = infoCriterion.pdfLabels?.[opt] ?? '';
                const longDesc = infoCriterion.longDescriptions?.[opt] ?? '';
                if (!shortLabel && !longDesc) return null;
                return (
                  <div
                    key={opt}
                    className="px-7 py-4 transition-colors hover:bg-tusas-panel-hover"
                  >
                    <div className="flex gap-3.5">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold ${POPUP_BADGE[colorIdx]}`}
                      >
                        {opt}
                      </span>
                      <div className="min-w-0 -mt-px flex-1">
                        <span
                          className={`block text-[15px] font-semibold leading-tight ${POPUP_LABEL[colorIdx]}`}
                        >
                          {shortLabel}
                        </span>
                        {longDesc && (
                          <p className="mt-0.5 text-[14px] leading-relaxed text-tusas-muted">
                            {longDesc}
                          </p>
                        )}
                      </div>
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

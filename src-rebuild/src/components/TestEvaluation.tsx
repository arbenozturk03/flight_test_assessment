import { useEffect, useState, useRef } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleX,
  ClipboardList,
  Copy,
  Download,
  GitBranch,
  Hash,
  LayoutGrid,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import type { Evaluation, Evaluations, TestPointData } from '../types';
import {
  HANDLING_CRITERIA,
  getManeuverCriteria,
  getManeuverAbbr,
  createDefaultEvaluation,
  isEvaluationComplete,
  getMissingFieldLabels,
  getMissingFieldIds,
  MATRIX_HANDLING_ORDER,
  MATRIX_SEP,
  getHandlingEvalMode,
  isMatrixManeuver,
} from '../data';
import OptionSelector from './OptionSelector';
import { getHandlingQualitativeTree } from '../data/ftaQualitativeTrees';
import QualitativeDecisionTree from './QualitativeDecisionTree';
import MatrixEvaluation from './MatrixEvaluation';
import DecisionTreeRating from './DecisionTreeRating';
import GeneralEvaluationSummary from './GeneralEvaluationSummary';
import TusasLogo from './TusasLogo';

/** Trim → maneuver dynamics → handling (non-trim), same order as non-matrix TPs. */
function ClassicHandlingEvaluators({
  currentManeuver,
  currentEval,
  errorFieldIds,
  updateField,
  updateComment,
  comments,
}: {
  currentManeuver: string;
  currentEval: Evaluation;
  errorFieldIds: string[];
  updateField: (field: string, value: string | number | null) => void;
  updateComment: (fieldId: string, text: string) => void;
  comments: Record<string, string>;
}) {
  return (
    <>
      {HANDLING_CRITERIA.filter((c) => c.id === 'trim').map((c) => (
        <OptionSelector
          key={c.id}
          label={c.label}
          value={currentEval[c.id as keyof Evaluation] as string | null}
          options={c.options}
          onChange={(v) => updateField(c.id, v)}
          hasError={errorFieldIds.includes(c.id)}
          comment={comments[c.id] ?? ''}
          onCommentChange={(t) => updateComment(c.id, t)}
          pdfLabels={c.pdfLabels}
          longDescriptions={c.longDescriptions}
        />
      ))}
      {getManeuverCriteria(currentManeuver).map((c) => (
        <OptionSelector
          key={c.id}
          label={c.label}
          value={(currentEval[c.id] ?? null) as string | null}
          options={c.options}
          onChange={(v) => updateField(c.id, v)}
          hasError={errorFieldIds.includes(c.id)}
          comment={comments[c.id] ?? ''}
          onCommentChange={(t) => updateComment(c.id, t)}
          pdfLabels={c.pdfLabels}
          longDescriptions={c.longDescriptions}
        />
      ))}
      {HANDLING_CRITERIA.filter((c) => c.id !== 'trim').map((c) => (
        <OptionSelector
          key={c.id}
          label={c.label}
          value={currentEval[c.id as keyof Evaluation] as string | null}
          options={c.options}
          onChange={(v) => updateField(c.id, v)}
          hasError={errorFieldIds.includes(c.id)}
          comment={comments[c.id] ?? ''}
          onCommentChange={(t) => updateComment(c.id, t)}
          pdfLabels={c.pdfLabels}
          longDescriptions={c.longDescriptions}
        />
      ))}
    </>
  );
}

/** FTA PDF trees for general headings (trim + handling) only; maneuver phases use direct 1–5 selectors. */
function TreeHandlingEvaluators({
  currentTestPoint,
  currentManeuver,
  currentEval,
  errorFieldIds,
  updateField,
  updateComment,
  comments,
}: {
  currentTestPoint: number;
  currentManeuver: string;
  currentEval: Evaluation;
  errorFieldIds: string[];
  updateField: (field: string, value: string | number | null) => void;
  updateComment: (fieldId: string, text: string) => void;
  comments: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      {HANDLING_CRITERIA.filter((c) => c.id === 'trim').map((c) => {
        const { nodes, rootId } = getHandlingQualitativeTree(c);
        return (
          <QualitativeDecisionTree
            key={`${currentTestPoint}-${c.id}`}
            fieldId={c.id}
            label={c.label}
            value={currentEval[c.id as keyof Evaluation] as string | null}
            onChange={(v) => updateField(c.id, v)}
            hasError={errorFieldIds.includes(c.id)}
            comment={comments[c.id] ?? ''}
            onCommentChange={(t) => updateComment(c.id, t)}
            nodes={nodes}
            rootId={rootId}
            pdfLabels={c.pdfLabels}
            longDescriptions={c.longDescriptions}
          />
        );
      })}
      {getManeuverCriteria(currentManeuver).map((c) => (
        <OptionSelector
          key={`${currentTestPoint}-${c.id}`}
          label={c.label}
          value={(currentEval[c.id] ?? null) as string | null}
          options={c.options}
          onChange={(v) => updateField(c.id, v)}
          hasError={errorFieldIds.includes(c.id)}
          comment={comments[c.id] ?? ''}
          onCommentChange={(t) => updateComment(c.id, t)}
          pdfLabels={c.pdfLabels}
          longDescriptions={c.longDescriptions}
        />
      ))}
      {HANDLING_CRITERIA.filter((c) => c.id !== 'trim').map((c) => {
        const { nodes, rootId } = getHandlingQualitativeTree(c);
        return (
          <QualitativeDecisionTree
            key={`${currentTestPoint}-${c.id}`}
            fieldId={c.id}
            label={c.label}
            value={currentEval[c.id as keyof Evaluation] as string | null}
            onChange={(v) => updateField(c.id, v)}
            hasError={errorFieldIds.includes(c.id)}
            comment={comments[c.id] ?? ''}
            onCommentChange={(t) => updateComment(c.id, t)}
            nodes={nodes}
            rootId={rootId}
            pdfLabels={c.pdfLabels}
            longDescriptions={c.longDescriptions}
          />
        );
      })}
    </div>
  );
}

const ACTIVE = 'border-[#003366] bg-[#003366] text-white';
const INACTIVE = 'border-tusas-border bg-tusas-surface text-tusas-text hover:border-tusas-blue';

interface TestEvaluationProps {
  maneuverPool: string[];
  testPointCount: number;
  evaluations: Evaluations;
  currentTestPoint: number | null;
  onSelectTestPoint: (tp: number | null) => void;
  onUpdateEvaluation: (tp: number, data: TestPointData) => void;
  completed: number[];
  cancelled: number[];
  onFinish: () => void;
  onEditManeuvers: () => void;
  showSummary: boolean;
  onShowSummaryChange: (v: boolean) => void;
  startTime: Date | null;
}

export default function TestEvaluation({
  maneuverPool,
  testPointCount,
  evaluations,
  currentTestPoint,
  onSelectTestPoint,
  onUpdateEvaluation,
  completed,
  cancelled,
  onFinish,
  onEditManeuvers,
  showSummary,
  onShowSummaryChange,
  startTime,
}: TestEvaluationProps) {
  const testPoints = Array.from({ length: testPointCount }, (_, i) => i + 1);
  const allDone = testPoints.every(
    (tp) => completed.includes(tp) || cancelled.includes(tp),
  );

  const currentData = currentTestPoint != null ? evaluations[currentTestPoint] : undefined;
  const currentEval = currentData?.evaluation || createDefaultEvaluation();
  const currentManeuver = currentData?.maneuver || null;
  const currentGeneralComment = currentData?.generalComment ?? '';
  const isCancelled =
    currentTestPoint != null ? cancelled.includes(currentTestPoint) : false;
  const handlingEvalMode = getHandlingEvalMode(currentData);
  const handlingFormMode =
    currentManeuver && !isMatrixManeuver(currentManeuver) && handlingEvalMode === 'matrix'
      ? 'sequential'
      : handlingEvalMode;

  const [validationError, setValidationError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [maneuverGridOpen, setManeuverGridOpen] = useState(!currentManeuver);
  const [appliedFromTp, setAppliedFromTp] = useState<number | null>(null);
  const errorFieldIds = validationError
    ? getMissingFieldIds(currentEval, currentManeuver, handlingEvalMode)
    : [];
  const mainContentRef = useRef<HTMLElement>(null);

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    setManeuverGridOpen(!currentManeuver);
    setAppliedFromTp(null);
  }, [currentTestPoint]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!startTime) return;
    const tick = () =>
      setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const fmt = (n: number) => String(n).padStart(2, '0');
  const chrono =
    startTime == null
      ? '--:--:--'
      : `${fmt(Math.floor(elapsedSeconds / 3600))}:${fmt(Math.floor((elapsedSeconds % 3600) / 60))}:${fmt(elapsedSeconds % 60)}`;

  const emitUpdate = (patch: Partial<TestPointData>) => {
    if (currentTestPoint == null) return;
    onUpdateEvaluation(currentTestPoint, {
      maneuver: currentManeuver,
      evaluation: currentEval,
      cancelled: false,
      comments: {},
      generalComment: currentGeneralComment,
      ...currentData,
      ...patch,
    });
  };

  const updateField = (field: string, value: string | number | null) => {
    const updated: Evaluation = { ...currentEval, [field]: value };
    if (isEvaluationComplete(updated, currentManeuver, handlingEvalMode))
      setValidationError(null);
    emitUpdate({ evaluation: updated, cancelled: false });
  };

  const updateGeneralComment = (text: string) => {
    emitUpdate({ generalComment: text });
  };

  const updateComment = (fieldId: string, text: string) => {
    const nextComments = { ...(currentData?.comments ?? {}), [fieldId]: text };
    emitUpdate({ comments: nextComments });
  };

  const selectManeuver = (maneuver: string) => {
    emitUpdate({ maneuver });
  };

  const applyFrom = (sourceTp: number) => {
    const source = evaluations[sourceTp];
    if (!source) return;
    emitUpdate({
      evaluation: { ...source.evaluation },
      comments: { ...source.comments },
      generalComment: source.generalComment,
      handlingEvalMode: source.handlingEvalMode,
      matrixEvalPresentation: source.matrixEvalPresentation,
      cancelled: false,
    });
    setAppliedFromTp(sourceTp);
  };

  const clearEvaluation = () => {
    emitUpdate({
      evaluation: createDefaultEvaluation(),
      comments: {},
      generalComment: '',
      cancelled: false,
      handlingEvalMode: 'sequential',
      matrixEvalPresentation: undefined,
    });
    setAppliedFromTp(null);
  };

  const completedOtherTPs = completed.filter((tp) => tp !== currentTestPoint);

  const cancelTestPoint = () => {
    emitUpdate({ cancelled: true });
    const idx = testPoints.indexOf(currentTestPoint!);
    const next = idx >= 0 && idx + 1 < testPoints.length ? testPoints[idx + 1] : null;
    onSelectTestPoint(next);
    if (!next) onShowSummaryChange(true);
    scrollToTop();
  };

  const completeAndNext = () => {
    if (!isEvaluationComplete(currentEval, currentManeuver, handlingEvalMode)) {
      const missing = getMissingFieldLabels(currentEval, currentManeuver, handlingEvalMode);
      setValidationError(
        `You left the following field(s) blank:\n\n${missing.join('\n')}\n\nPlease provide a rating or select "N/A" to skip.`,
      );
      return;
    }
    setValidationError(null);
    if (currentTestPoint == null) return;
    emitUpdate({ cancelled: false });
    const idx = testPoints.indexOf(currentTestPoint);
    const next = idx >= 0 && idx + 1 < testPoints.length ? testPoints[idx + 1] : null;
    onSelectTestPoint(next);
    if (!next) onShowSummaryChange(true);
    scrollToTop();
  };

  const handleFinish = () => {
    if (window.confirm('Finish test?')) {
      onFinish();
    }
  };

  const unevaluated = testPoints.filter(
    (tp) => !completed.includes(tp) && !cancelled.includes(tp),
  );

  return (
    <div className="flex h-full w-full max-w-[100vw] flex-row overflow-x-hidden">
      {/* Sidebar */}
      <aside className="w-44 min-w-[11rem] shrink-0 border-r border-tusas-border bg-tusas-surface p-3 overflow-y-auto min-h-0">
        {startTime && (
          <div className="mb-3 rounded-lg border border-tusas-border bg-tusas-bg px-3 py-2">
            <p className="text-[10px] font-medium text-tusas-muted">Flight Time</p>
            <p className="font-mono text-base font-bold tabular-nums text-tusas-text">{chrono}</p>
          </div>
        )}
        <div className="mb-3 flex flex-col gap-1.5">
          <h2 className="text-sm font-semibold text-tusas-text">Test Points</h2>
          <button
            type="button"
            onClick={onEditManeuvers}
            className="flex min-h-[32px] items-center justify-center gap-1 rounded-lg border border-tusas-border px-2 py-1 text-xs text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
            title="Edit Maneuvers"
          >
            <Pencil className="h-3 w-3" />
            Edit Maneuvers
          </button>
        </div>

        <nav className="space-y-0.5">
          {allDone && (
            <button
              type="button"
              onClick={() => {
                onShowSummaryChange(true);
                onSelectTestPoint(null);
              }}
              className={`flex w-full min-h-[36px] items-center gap-1.5 rounded-lg border-2 px-2 py-1.5 text-left text-xs transition-all ${
                showSummary ? ACTIVE : 'border-transparent text-tusas-text hover:bg-tusas-bg'
              }`}
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              Summary
            </button>
          )}

          {testPoints.map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => {
                onSelectTestPoint(tp);
                onShowSummaryChange(false);
              }}
              className={`flex w-full min-h-[36px] items-center justify-between gap-1 rounded-lg border-2 px-2 py-1.5 text-left text-xs transition-all ${
                currentTestPoint === tp
                  ? ACTIVE
                  : 'border-transparent text-tusas-text hover:bg-tusas-bg'
              }`}
            >
              <span className="truncate">
                {tp}/{testPointCount}
                {evaluations[tp]?.maneuver && ` ${getManeuverAbbr(evaluations[tp].maneuver!)}`}
              </span>
              {completed.includes(tp) && (
                <Check className="h-3.5 w-3.5 shrink-0 text-tusas-success" />
              )}
              {cancelled.includes(tp) && (
                <CircleX className="h-3.5 w-3.5 shrink-0 text-tusas-cancelled" />
              )}
            </button>
          ))}
        </nav>

        {!allDone && unevaluated.length > 0 && (
          <div className="mt-3 rounded-lg border-2 border-amber-600 bg-amber-500/10 p-2">
            <p className="text-[10px] font-semibold text-amber-600">
              Not evaluated:
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-tusas-text">
              {unevaluated.join(', ')}
            </p>
          </div>
        )}

        {allDone && (
          <button
            type="button"
            onClick={handleFinish}
            className="mt-4 flex w-full min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-green-600 text-xs font-semibold text-white transition-all hover:bg-green-500"
          >
            <Download className="h-4 w-4" />
            Finish Test
          </button>
        )}
      </aside>

      {/* Main content */}
      <main ref={mainContentRef} className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-5 min-h-0">
        {showSummary && allDone ? (
          <GeneralEvaluationSummary
            maneuverPool={maneuverPool}
            testPointCount={testPointCount}
            completed={completed}
            cancelled={cancelled}
          />
        ) : currentTestPoint ? (
          <div className="mx-auto min-w-0 max-w-6xl space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#003366] bg-[#003366] text-lg font-bold text-white">
                {currentTestPoint}/{testPointCount}
              </div>
              <div>
                <h2 className="text-xl font-bold text-tusas-text">
                  Test Point {currentTestPoint}
                </h2>
                {currentManeuver && (
                  <p className="text-sm text-tusas-muted">{currentManeuver}</p>
                )}
              </div>
            </div>

            {/* Maneuver selection – collapsible after selection */}
            <section className="rounded-lg border border-tusas-border bg-tusas-surface">
              {currentManeuver && !maneuverGridOpen ? (
                <div className="flex items-center justify-between gap-3 px-6 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-semibold text-tusas-muted shrink-0">Maneuver:</span>
                    <span className="text-sm font-bold text-tusas-text truncate">{currentManeuver}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManeuverGridOpen(true)}
                    className="flex items-center gap-1.5 shrink-0 rounded-lg border border-tusas-border px-3 py-1.5 text-xs font-medium text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Change
                  </button>
                </div>
              ) : (
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-tusas-muted">
                      Select maneuver for this test point
                    </h3>
                    {currentManeuver && (
                      <button
                        type="button"
                        onClick={() => setManeuverGridOpen(false)}
                        className="flex items-center gap-1 text-xs text-tusas-muted hover:text-tusas-text transition-colors"
                      >
                        <ChevronUp className="h-4 w-4" />
                        Collapse
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {maneuverPool.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          selectManeuver(m);
                          setManeuverGridOpen(false);
                        }}
                        className={`h-12 w-full min-w-0 rounded-lg border-2 px-2 py-1.5 text-center text-xs font-medium leading-tight transition-all overflow-hidden ${
                          currentManeuver === m ? ACTIVE : INACTIVE
                        }`}
                      >
                        <span className="block overflow-hidden text-ellipsis break-words line-clamp-2">{m}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Apply from previous TP */}
            {currentManeuver && !isCancelled && completedOtherTPs.length > 0 && (
              <section className="flex items-center gap-3 rounded-lg border border-tusas-border bg-tusas-surface px-4 py-3">
                <Copy className="h-4 w-4 shrink-0 text-tusas-muted" />
                <label className="text-sm font-medium text-tusas-muted whitespace-nowrap">
                  Apply Full Assessment From
                </label>
                <div className="relative">
                  <select
                    value={appliedFromTp != null ? String(appliedFromTp) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'empty') {
                        clearEvaluation();
                      } else {
                        const tp = Number(val);
                        if (tp) applyFrom(tp);
                      }
                    }}
                    className="h-9 appearance-none rounded-lg border border-tusas-border bg-tusas-bg pl-3 pr-8 py-1 text-sm text-tusas-text outline-none transition-colors focus:border-tusas-blue"
                  >
                    <option value="" disabled>Select Test Point</option>
                    <option value="empty">Empty (Clear All)</option>
                    {completedOtherTPs.map((tp) => (
                      <option key={tp} value={tp}>
                        TP {tp}{evaluations[tp]?.maneuver ? ` — ${getManeuverAbbr(evaluations[tp].maneuver!)}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-tusas-muted" />
                </div>
              </section>
            )}

            {/* Evaluation form */}
            {currentManeuver && !isCancelled && (
              <>
                {/* 1. Evaluation section: Matrix or Classic depending on maneuver */}
                {isMatrixManeuver(currentManeuver) ? (
                  <section className="min-w-0 rounded-lg border border-tusas-border bg-tusas-surface p-6">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-base font-bold text-tusas-text">
                        Handling evaluation
                      </h3>
                      <div className="flex shrink-0 flex-wrap items-center gap-0.5 rounded-lg border border-tusas-border bg-tusas-bg p-0.5">
                        <button
                          type="button"
                          title="Direct — 1–5 scale per criterion"
                          onClick={() =>
                            emitUpdate({ handlingEvalMode: 'sequential', matrixEvalPresentation: undefined })
                          }
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
                            handlingEvalMode === 'sequential'
                              ? 'bg-tusas-surface text-tusas-text shadow-sm'
                              : 'text-tusas-muted hover:text-tusas-text'
                          }`}
                        >
                          <Hash className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Direct</span>
                        </button>
                        <button
                          type="button"
                          title="Flowchart — FTA yes/no decision trees (trim, phases, handling)"
                          onClick={() =>
                            emitUpdate({ handlingEvalMode: 'tree', matrixEvalPresentation: undefined })
                          }
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
                            handlingEvalMode === 'tree'
                              ? 'bg-tusas-surface text-tusas-text shadow-sm'
                              : 'text-tusas-muted hover:text-tusas-text'
                          }`}
                        >
                          <GitBranch className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Flowchart</span>
                        </button>
                        <button
                          type="button"
                          title="Matrix — full grid (phases × criteria)"
                          onClick={() =>
                            emitUpdate({ handlingEvalMode: 'matrix', matrixEvalPresentation: undefined })
                          }
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
                            handlingEvalMode === 'matrix'
                              ? 'bg-tusas-surface text-tusas-text shadow-sm'
                              : 'text-tusas-muted hover:text-tusas-text'
                          }`}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Matrix</span>
                        </button>
                      </div>
                    </div>
                    {handlingFormMode === 'sequential' ? (
                      <div className="space-y-6">
                        <ClassicHandlingEvaluators
                          currentManeuver={currentManeuver}
                          currentEval={currentEval}
                          errorFieldIds={errorFieldIds}
                          updateField={updateField}
                          updateComment={updateComment}
                          comments={currentData?.comments ?? {}}
                        />
                      </div>
                    ) : handlingFormMode === 'tree' ? (
                      <TreeHandlingEvaluators
                        currentTestPoint={currentTestPoint!}
                        currentManeuver={currentManeuver}
                        currentEval={currentEval}
                        errorFieldIds={errorFieldIds}
                        updateField={updateField}
                        updateComment={updateComment}
                        comments={currentData?.comments ?? {}}
                      />
                    ) : (
                      (() => {
                        const phases = getManeuverCriteria(currentManeuver);
                        const orderedHandling = MATRIX_HANDLING_ORDER.map(
                          (id) => HANDLING_CRITERIA.find((c) => c.id === id)!,
                        ).filter(Boolean);
                        const errorKeys = new Set(errorFieldIds);
                        return (
                          <MatrixEvaluation
                            key={`${currentManeuver}-matrix`}
                            handlingCriteria={orderedHandling}
                            phases={phases}
                            getValue={(hId, pId) => {
                              const v = currentEval[`${hId}${MATRIX_SEP}${pId}`];
                              return v != null ? String(v) : null;
                            }}
                            onValueChange={(hId, pId, v) =>
                              updateField(`${hId}${MATRIX_SEP}${pId}`, v)
                            }
                            getComment={(hId) => currentData?.comments?.[hId] ?? ''}
                            onCommentChange={(hId, text) => updateComment(hId, text)}
                            errorCellKeys={errorKeys}
                            scrollContainerRef={mainContentRef}
                          />
                        );
                      })()
                    )}
                  </section>
                ) : (
                  <section className="min-w-0 rounded-lg border border-tusas-border bg-tusas-surface p-6">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-base font-bold text-tusas-text">Handling evaluation</h3>
                      <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-tusas-border bg-tusas-bg p-0.5">
                        <button
                          type="button"
                          title="Direct — 1–5 scale per criterion"
                          onClick={() =>
                            emitUpdate({ handlingEvalMode: 'sequential', matrixEvalPresentation: undefined })
                          }
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
                            handlingEvalMode === 'sequential'
                              ? 'bg-tusas-surface text-tusas-text shadow-sm'
                              : 'text-tusas-muted hover:text-tusas-text'
                          }`}
                        >
                          <Hash className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Direct</span>
                        </button>
                        <button
                          type="button"
                          title="Flowchart — FTA yes/no decision trees"
                          onClick={() =>
                            emitUpdate({ handlingEvalMode: 'tree', matrixEvalPresentation: undefined })
                          }
                          className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
                            handlingEvalMode === 'tree'
                              ? 'bg-tusas-surface text-tusas-text shadow-sm'
                              : 'text-tusas-muted hover:text-tusas-text'
                          }`}
                        >
                          <GitBranch className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Flowchart</span>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-6">
                      {handlingFormMode === 'tree' ? (
                        <TreeHandlingEvaluators
                          currentTestPoint={currentTestPoint!}
                          currentManeuver={currentManeuver}
                          currentEval={currentEval}
                          errorFieldIds={errorFieldIds}
                          updateField={updateField}
                          updateComment={updateComment}
                          comments={currentData?.comments ?? {}}
                        />
                      ) : (
                        <ClassicHandlingEvaluators
                          currentManeuver={currentManeuver}
                          currentEval={currentEval}
                          errorFieldIds={errorFieldIds}
                          updateField={updateField}
                          updateComment={updateComment}
                          comments={currentData?.comments ?? {}}
                        />
                      )}
                    </div>
                  </section>
                )}

                {/* 3. PIO & CHR Decision Tree Ratings */}
                <section className="rounded-lg border border-tusas-border bg-tusas-surface p-6">
                  <h3 className="mb-4 text-base font-bold text-tusas-text">
                    Ratings
                  </h3>
                  <DecisionTreeRating
                    key={currentTestPoint}
                    pioValue={currentEval.pio}
                    chrValue={currentEval.chr}
                    onPioChange={(v) => updateField('pio', v)}
                    onChrChange={(v) => updateField('chr', v)}
                    pioHasError={errorFieldIds.includes('pio')}
                    chrHasError={errorFieldIds.includes('chr')}
                    pioComment={currentData?.comments?.pio ?? ''}
                    chrComment={currentData?.comments?.chr ?? ''}
                    onPioCommentChange={(t) => updateComment('pio', t)}
                    onChrCommentChange={(t) => updateComment('chr', t)}
                  />
                </section>

                {/* 4. General Maneuver Comments (bottom) */}
                <section className="rounded-lg border border-tusas-border bg-tusas-surface p-6">
                  <h3 className="mb-3 text-base font-bold text-tusas-text">
                    General Maneuver Comments
                  </h3>
                  <textarea
                    placeholder="Enter general comments for this maneuver..."
                    value={currentGeneralComment}
                    onChange={(e) => updateGeneralComment(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-tusas-border bg-tusas-bg px-4 py-3 text-sm text-tusas-text placeholder-tusas-muted outline-none transition-colors focus:border-tusas-blue"
                  />
                </section>

                {/* Actions */}
                <div className="flex flex-col gap-4">
                  {validationError && (
                    <div className="whitespace-pre-line rounded-lg border border-red-600 bg-red-600/20 p-4 text-red-400">
                      {validationError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={completeAndNext}
                    className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-lg border-2 border-green-600 bg-green-600 font-semibold text-white transition-all hover:bg-green-500"
                  >
                    <Check className="h-5 w-5" />
                    Complete & Next
                  </button>
                  <button
                    type="button"
                    onClick={cancelTestPoint}
                    className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-lg bg-red-600 font-semibold text-white transition-all hover:bg-red-500"
                  >
                    <CircleX className="h-5 w-5" />
                    Mark Test Point as Cancelled
                  </button>
                </div>
              </>
            )}

            {/* Cancelled state */}
            {currentManeuver && isCancelled && (
              <div className="rounded-lg border border-tusas-red bg-tusas-red/20 p-6 text-center">
                <CircleX className="mx-auto mb-2 h-12 w-12 text-tusas-red" />
                <p className="font-semibold text-tusas-red">
                  This test point has been cancelled.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-tusas-muted">
            <TusasLogo className="mb-4 h-16 w-auto opacity-50" />
            <p>
              {testPoints.some(
                (tp) => !completed.includes(tp) && !cancelled.includes(tp),
              )
                ? 'There are unevaluated test points'
                : 'Select a test point from the sidebar to evaluate'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

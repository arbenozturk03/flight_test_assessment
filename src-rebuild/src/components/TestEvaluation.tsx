import { useEffect, useState, useRef } from 'react';
import { Check, ChevronDown, CircleX, ClipboardList, Copy, Download, Pencil } from 'lucide-react';
import type { Evaluation, Evaluations, TestPointData } from '../types';
import {
  HANDLING_CRITERIA,
  getManeuverCriteria,
  getManeuverAbbr,
  createDefaultEvaluation,
  isEvaluationComplete,
  getMissingFieldLabels,
  getMissingFieldIds,
} from '../data';
import OptionSelector from './OptionSelector';
import RatingScale from './RatingScale';
import GeneralEvaluationSummary from './GeneralEvaluationSummary';
import TusasLogo from './TusasLogo';

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

  const [validationError, setValidationError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const errorFieldIds = validationError ? getMissingFieldIds(currentEval, currentManeuver) : [];
  const mainContentRef = useRef<HTMLElement>(null);

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    if (isEvaluationComplete(updated, currentManeuver)) setValidationError(null);
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
      cancelled: false,
    });
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
    if (!isEvaluationComplete(currentEval, currentManeuver)) {
      const missing = getMissingFieldLabels(currentEval, currentManeuver);
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
    <div className="flex h-full w-full max-w-[100vw] flex-col overflow-x-hidden md:flex-row">
      {/* Sidebar */}
      <aside className="w-full min-w-0 shrink-0 border-b border-tusas-border bg-tusas-surface p-4 md:w-48 md:border-b-0 md:border-r md:overflow-y-auto">
        {startTime && (
          <div className="mb-4 rounded-lg border border-tusas-border bg-tusas-bg px-4 py-3">
            <p className="text-xs font-medium text-tusas-muted">Flight Test Time:</p>
            <p className="font-mono text-xl font-bold tabular-nums text-tusas-text">{chrono}</p>
          </div>
        )}
        <div className="mb-4 flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-tusas-text">Test Points</h2>
          <button
            type="button"
            onClick={onEditManeuvers}
            className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-tusas-border px-3 py-1.5 text-sm text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
            title="Edit Maneuvers"
          >
            <Pencil className="h-4 w-4" />
            Edit Maneuvers
          </button>
        </div>

        <nav className="space-y-1">
          {allDone && (
            <button
              type="button"
              onClick={() => {
                onShowSummaryChange(true);
                onSelectTestPoint(null);
              }}
              className={`flex w-full min-h-[56px] items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-all ${
                showSummary ? ACTIVE : 'border-transparent text-tusas-text hover:bg-tusas-bg'
              }`}
            >
              <ClipboardList className="h-5 w-5 shrink-0" />
              General Evaluation
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
              className={`flex w-full min-h-[56px] items-center justify-between gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-all ${
                currentTestPoint === tp
                  ? ACTIVE
                  : 'border-transparent text-tusas-text hover:bg-tusas-bg'
              }`}
            >
              <span className="truncate">
                TP {tp}/{testPointCount}
                {evaluations[tp]?.maneuver && ` - ${getManeuverAbbr(evaluations[tp].maneuver!)}`}
              </span>
              {completed.includes(tp) && (
                <Check className="h-5 w-5 shrink-0 text-tusas-success" />
              )}
              {cancelled.includes(tp) && (
                <CircleX className="h-5 w-5 shrink-0 text-tusas-cancelled" />
              )}
            </button>
          ))}
        </nav>

        {!allDone && unevaluated.length > 0 && (
          <div className="mt-4 rounded-lg border-2 border-amber-600 bg-amber-500/10 p-3">
            <p className="text-sm font-semibold text-amber-600">
              The following test point{unevaluated.length > 1 ? 's have' : ' has'}{' '}
              not been evaluated:
            </p>
            <p className="mt-1 text-sm font-medium text-tusas-text">
              {unevaluated.join(', ')}
            </p>
          </div>
        )}

        {allDone && (
          <button
            type="button"
            onClick={handleFinish}
            className="mt-6 flex w-full min-h-[56px] items-center justify-center gap-2 rounded-lg bg-green-600 font-semibold text-white transition-all hover:bg-green-500"
          >
            <Download className="h-5 w-5" />
            Finish Test
          </button>
        )}
      </aside>

      {/* Main content */}
      <main ref={mainContentRef} className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:pl-3 md:pr-4 md:py-6">
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

            {/* Maneuver selection */}
            <section className="rounded-lg border border-tusas-border bg-tusas-surface p-6">
              <h3 className="mb-4 text-base font-semibold text-tusas-muted">
                Select maneuver for this test point
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {maneuverPool.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectManeuver(m)}
                    className={`h-14 w-full min-w-0 rounded-lg border-2 px-3 py-2 text-center text-sm font-medium leading-tight transition-all overflow-hidden ${
                      currentManeuver === m ? ACTIVE : INACTIVE
                    }`}
                  >
                    <span className="block overflow-hidden text-ellipsis break-words line-clamp-2">{m}</span>
                  </button>
                ))}
              </div>
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
                    defaultValue=""
                    onChange={(e) => {
                      const tp = Number(e.target.value);
                      if (tp) applyFrom(tp);
                      e.target.value = '';
                    }}
                    className="h-9 appearance-none rounded-lg border border-tusas-border bg-tusas-bg pl-3 pr-8 py-1 text-sm text-tusas-text outline-none transition-colors focus:border-tusas-blue"
                  >
                    <option value="" disabled>Select Test Point</option>
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
                {/* 1. Standard Panel */}
                <section className="min-w-0 space-y-6 rounded-lg border border-tusas-border bg-tusas-surface p-6">
                  {HANDLING_CRITERIA.map((c) => (
                    <OptionSelector
                      key={c.id}
                      label={c.label}
                      value={currentEval[c.id as keyof Evaluation] as string | null}
                      options={c.options}
                      onChange={(v) => updateField(c.id, v)}
                      hasError={errorFieldIds.includes(c.id)}
                      comment={currentData?.comments?.[c.id] ?? ''}
                      onCommentChange={(t) => updateComment(c.id, t)}
                    />
                  ))}
                </section>

                {/* 2. Maneuver Criteria */}
                <section className="min-w-0 space-y-6 rounded-lg border border-tusas-border bg-tusas-surface p-6">
                  {getManeuverCriteria(currentManeuver).map((c) => (
                    <OptionSelector
                      key={c.id}
                      label={c.label}
                      value={(currentEval[c.id] ?? null) as string | null}
                      options={c.options}
                      onChange={(v) => updateField(c.id, v)}
                      hasError={errorFieldIds.includes(c.id)}
                      comment={currentData?.comments?.[c.id] ?? ''}
                      onCommentChange={(t) => updateComment(c.id, t)}
                    />
                  ))}
                </section>

                {/* 3. PIO & CHR ratings */}
                <section className="space-y-6 rounded-lg border border-tusas-border bg-tusas-surface p-6">
                  <h3 className="text-base font-bold text-tusas-text">
                    Ratings
                  </h3>
                  <RatingScale
                    label="PIO (Pilot Induced Oscillation)"
                    value={currentEval.pio}
                    min={1}
                    max={6}
                    onChange={(v) => updateField('pio', v)}
                    valueColors={(v) =>
                      v <= 2 ? 'green' : v === 3 ? 'yellow' : v <= 5 ? 'orange' : 'red'
                    }
                    hasError={errorFieldIds.includes('pio')}
                    comment={currentData?.comments?.pio ?? ''}
                    onCommentChange={(t) => updateComment('pio', t)}
                  />
                  <RatingScale
                    label="CHR (Cooper-Harper Rating)"
                    value={currentEval.chr}
                    min={1}
                    max={10}
                    onChange={(v) => updateField('chr', v)}
                    valueColors={(v) =>
                      v <= 3 ? 'green' : v <= 6 ? 'yellow' : v <= 9 ? 'orange' : 'red'
                    }
                    hasError={errorFieldIds.includes('chr')}
                    comment={currentData?.comments?.chr ?? ''}
                    onCommentChange={(t) => updateComment('chr', t)}
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

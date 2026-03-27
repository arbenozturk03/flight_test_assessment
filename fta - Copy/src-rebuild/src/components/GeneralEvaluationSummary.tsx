import { ClipboardList } from 'lucide-react';

interface GeneralEvaluationSummaryProps {
  maneuverPool: string[];
  testPointCount: number;
  completed: number[];
  cancelled: number[];
}

export default function GeneralEvaluationSummary({
  maneuverPool,
  testPointCount,
  completed,
  cancelled,
}: GeneralEvaluationSummaryProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3 border-b border-tusas-border pb-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-[#003366] bg-[#003366] text-white">
          <ClipboardList className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-tusas-text">
          General Evaluation Summary
        </h2>
      </div>

      <section className="rounded-lg border border-tusas-border bg-tusas-surface p-6">
        <h3 className="mb-4 text-base font-semibold text-tusas-muted">
          Test Overview
        </h3>
        <dl className="space-y-3">
          <div className="flex justify-between gap-4">
            <dt className="text-tusas-muted">Total test points</dt>
            <dd className="font-semibold text-tusas-text">{testPointCount}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-tusas-muted">Completed</dt>
            <dd className="font-semibold text-tusas-success">
              {completed.length}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-tusas-muted">Cancelled</dt>
            <dd className="font-semibold text-tusas-cancelled">
              {cancelled.length}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-tusas-border bg-tusas-surface p-6">
        <h3 className="mb-4 text-base font-semibold text-tusas-muted">
          Maneuvers in this test
        </h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-tusas-text">
          {maneuverPool.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

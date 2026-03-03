import { useEffect, useState } from 'react';
import { Play, ArrowLeft } from 'lucide-react';
import { MANEUVER_LIST, FTE_LIST, TP_LIST, FTE_FIRST_IN_DROPDOWN } from '../data';
import ManeuverButton from './ManeuverButton';
import MultiSelectDropdown from './MultiSelectDropdown';
import TestCardUpload, { type TestCardExtractResult } from './TestCardUpload';

interface ManeuverSetupProps {
  selected: string[];
  onToggle: (name: string) => void;
  onApplyOCRResult?: (result: TestCardExtractResult) => void;
  selectedFTEs: string[];
  onFTEsChange: (v: string[]) => void;
  selectedTPs: string[];
  onTPsChange: (v: string[]) => void;
  testPointCount: number | null;
  onTestPointCountChange: (v: number | null) => void;
  flightTestNumber: string;
  onFlightTestNumberChange: (v: string) => void;
  onStart: () => void;
  isEditingManeuvers: boolean;
  onReturnToTest: () => void;
}

export default function ManeuverSetup({
  selected,
  onToggle,
  onApplyOCRResult,
  selectedFTEs,
  onFTEsChange,
  selectedTPs,
  onTPsChange,
  testPointCount,
  onTestPointCountChange,
  flightTestNumber,
  onFlightTestNumberChange,
  onStart,
  isEditingManeuvers,
  onReturnToTest,
}: ManeuverSetupProps) {
  const [attemptedStart, setAttemptedStart] = useState(false);
  const noManeuvers = selected.length === 0;
  const invalidCount = !testPointCount || testPointCount < 1 || testPointCount > 999;
  const invalidFlightTest = !flightTestNumber.trim();
  const excessManeuvers = !invalidCount && selected.length > (testPointCount ?? 0);
  const canProceed = !noManeuvers && !invalidCount && !invalidFlightTest && !excessManeuvers;
  const showErrors = attemptedStart;

  useEffect(() => {
    if (canProceed) setAttemptedStart(false);
  }, [canProceed]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="text-tusas-muted">
        {isEditingManeuvers
          ? 'Edit the maneuvers for this flight test. Your progress is preserved.'
          : 'Select the maneuvers to include in this flight test. You will choose from these maneuvers for each test point.'}
      </p>

      {/* Upload test card image to auto-fill test points and maneuvers */}
      {onApplyOCRResult && (
        <TestCardUpload onExtract={onApplyOCRResult} disabled={isEditingManeuvers} />
      )}

      {/* FTE and TP selection – before maneuvers */}
      <div className="flex flex-col gap-4 rounded-lg border border-tusas-border bg-tusas-surface p-4 sm:flex-row">
        <MultiSelectDropdown
          label="FTE (Flight Test Engineer)"
          options={FTE_LIST}
          selected={selectedFTEs}
          onChange={onFTEsChange}
          placeholder="Select FTE..."
          firstInDropdown={[FTE_FIRST_IN_DROPDOWN]}
        />
        <MultiSelectDropdown
          label="TP (Test Pilot)"
          options={TP_LIST}
          selected={selectedTPs}
          onChange={onTPsChange}
          placeholder="Select TP..."
          singleSelect
        />
      </div>

      <p className="text-tusas-muted">
        Select the maneuvers for this flight test. If you uploaded a test card, matching maneuvers are pre-selected.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {MANEUVER_LIST.map((m) => (
          <ManeuverButton
            key={m}
            name={m}
            selected={selected.includes(m)}
            onToggle={onToggle}
          />
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div aria-hidden />
        <div aria-hidden />
        <div className="flex min-w-0 flex-1 items-end gap-4 rounded-lg border border-tusas-border bg-tusas-surface p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label
              htmlFor="ftn"
              className={`text-xs font-medium ${showErrors && invalidFlightTest ? 'text-red-600' : 'text-tusas-muted'}`}
            >
              Flight Test No
            </label>
            <input
              id="ftn"
              type="text"
              value={flightTestNumber}
              onChange={(e) => onFlightTestNumberChange(e.target.value)}
              placeholder=""
              className={`h-9 w-full rounded border px-3 py-2 text-sm text-tusas-text placeholder-tusas-muted outline-none transition-colors focus:border-tusas-blue ${
                showErrors && invalidFlightTest
                  ? 'border-red-600 bg-red-500/10'
                  : 'border-tusas-border bg-tusas-bg'
              }`}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label
              htmlFor="tp"
              className={`text-xs font-medium ${showErrors && invalidCount ? 'text-red-600' : 'text-tusas-muted'}`}
            >
              Total number of test points
            </label>
            <input
              id="tp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={testPointCount ?? ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                const v = raw ? parseInt(raw, 10) : null;
                if (v == null || (v >= 1 && v <= 999)) onTestPointCountChange(v);
              }}
              placeholder=""
              className={`h-9 w-full rounded border px-3 py-2 text-sm text-tusas-text placeholder-tusas-muted outline-none transition-colors focus:border-tusas-blue ${
                showErrors && invalidCount
                  ? 'border-red-600 bg-red-500/10'
                  : 'border-tusas-border bg-tusas-bg'
              }`}
            />
          </div>
        </div>
      </div>

      {showErrors && excessManeuvers && (
        <div className="rounded-lg border border-red-600 bg-red-500/20 px-4 py-3 text-sm text-red-400">
          You have {selected.length} maneuver{selected.length !== 1 ? 's' : ''} selected but only{' '}
          {testPointCount} test point{testPointCount !== 1 ? 's' : ''}. Each test point uses one
          maneuver, so the number of selected maneuvers cannot exceed the total number of test
          points. Either reduce the selected maneuvers or increase the total number of test points.
        </div>
      )}

      <div className="flex flex-col gap-4 border-t border-tusas-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-tusas-muted">
          {selected.length} maneuver{selected.length !== 1 ? 's' : ''} selected
          {' • '}
          {testPointCount || 0} test point{testPointCount !== 1 ? 's' : ''}
        </p>

        <div className="flex flex-wrap gap-3">
          {isEditingManeuvers && (
            <button
              type="button"
              onClick={onReturnToTest}
              disabled={!canProceed}
              className={`flex min-h-[56px] items-center justify-center gap-2 rounded-lg border-2 border-[#003366] px-8 py-3 font-semibold text-[#003366] transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                canProceed
                  ? 'bg-tusas-surface hover:bg-tusas-bg'
                  : 'bg-tusas-surface text-tusas-muted'
              }`}
            >
              <ArrowLeft className="h-5 w-5" />
              Return to Test
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (invalidCount || invalidFlightTest || excessManeuvers) {
                setAttemptedStart(true);
                return;
              }
              if (
                isEditingManeuvers &&
                !window.confirm(
                  'This will discard all your evaluations and start over. Continue?',
                )
              )
                return;
              onStart();
            }}
            disabled={noManeuvers}
            className={`flex min-h-[56px] items-center justify-center gap-2 rounded-lg px-8 py-3 font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              !noManeuvers && canProceed
                ? isEditingManeuvers
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-green-600 hover:bg-green-500'
                : 'bg-tusas-surface text-tusas-muted'
            }`}
          >
            <Play className="h-5 w-5" />
            {isEditingManeuvers ? 'Restart (discards progress)' : 'Start Flight'}
          </button>
        </div>
      </div>
    </div>
  );
}

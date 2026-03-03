import { useState } from 'react';
import { RotateCcw, XCircle } from 'lucide-react';
import type { Evaluations, TestPointData } from './types';
import { createDefaultEvaluation, isEvaluationComplete } from './data';
import { exportToPdf } from './exportPdf';
import TusasLogo from './components/TusasLogo';
import ManeuverSetup from './components/ManeuverSetup';
import TestEvaluation from './components/TestEvaluation';

type Step = 1 | 2;

export default function App() {
  const [step, setStep] = useState<Step>(1);
  const [flightTestNumber, setFlightTestNumber] = useState('');
  const [selectedFTEs, setSelectedFTEs] = useState<string[]>([]);
  const [selectedTPs, setSelectedTPs] = useState<string[]>([]);
  const [selectedManeuvers, setSelectedManeuvers] = useState<string[]>([]);
  const [testPointCount, setTestPointCount] = useState<number | null>(null);
  const [currentTestPoint, setCurrentTestPoint] = useState<number | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluations>({});
  const [completed, setCompleted] = useState<number[]>([]);
  const [cancelled, setCancelled] = useState<number[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [isEditingManeuvers, setIsEditingManeuvers] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [initialManeuversFromOCR, setInitialManeuversFromOCR] = useState<Record<number, string> | null>(null);
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

  const toggleManeuver = (name: string) => {
    setSelectedManeuvers((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name],
    );
  };

  const startFlight = () => {
    if (selectedManeuvers.length > 0 && testPointCount && testPointCount > 0) {
      setStartTime(new Date());
      setStep(2);
      setCurrentTestPoint(1);
      if (initialManeuversFromOCR && testPointCount) {
        const prefill: Evaluations = {};
        for (let tp = 1; tp <= testPointCount; tp++) {
          const raw = initialManeuversFromOCR[tp] ?? null;
          const maneuver = raw && selectedManeuvers.includes(raw) ? raw : null;
          prefill[tp] = {
            maneuver,
            evaluation: createDefaultEvaluation(),
            cancelled: false,
            comments: {},
            generalComment: '',
          };
        }
        setEvaluations(prefill);
        setInitialManeuversFromOCR(null);
      } else {
        setEvaluations({});
      }
      setCompleted([]);
      setCancelled([]);
      setShowSummary(false);
      setIsEditingManeuvers(false);
    }
  };

  const returnToTest = () => {
    if (selectedManeuvers.length > 0 && testPointCount && testPointCount > 0) {
      setStep(2);
      setIsEditingManeuvers(false);
    }
  };

  const updateEvaluation = (tp: number, data: TestPointData) => {
    setEvaluations((prev) => ({ ...prev, [tp]: data }));
    if (data.cancelled) {
      setCancelled((prev) => (prev.includes(tp) ? prev : [...prev, tp]));
      setCompleted((prev) => prev.filter((x) => x !== tp));
    } else if (isEvaluationComplete(data.evaluation || createDefaultEvaluation(), data.maneuver)) {
      setCompleted((prev) => (prev.includes(tp) ? prev : [...prev, tp]));
      setCancelled((prev) => prev.filter((x) => x !== tp));
    }
  };

  const handleFinish = () => {
    const endTime = new Date();
    exportToPdf({
      flightTestNumber,
      selectedFTEs,
      selectedTPs,
      maneuverPool: selectedManeuvers,
      testPointCount: testPointCount!,
      evaluations,
      completed,
      cancelled,
      startTime: startTime ?? endTime,
      endTime,
    });
  };

  const handleAbortAndSave = () => {
    handleFinish();
    setShowAbortConfirm(false);
    resetMission();
  };

  const resetMission = () => {
    setStep(1);
    setFlightTestNumber('');
    setSelectedFTEs([]);
    setSelectedTPs([]);
    setSelectedManeuvers([]);
    setTestPointCount(null);
    setCurrentTestPoint(null);
    setEvaluations({});
    setCompleted([]);
    setCancelled([]);
    setShowSummary(false);
    setIsEditingManeuvers(false);
    setStartTime(null);
    setInitialManeuversFromOCR(null);
  };

  const editManeuvers = () => {
    setStep(1);
    setIsEditingManeuvers(true);
  };

  return (
    <div
      className="relative flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-x-hidden"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* Header */}
      <header
        className="shrink-0 min-w-0 border-b border-tusas-border px-4 py-3"
        style={{ backgroundColor: '#0a0a0a' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TusasLogo className="h-9 w-auto shrink-0" />
            <span className="font-semibold text-tusas-text">
              Flight Test Assessment
            </span>
          </div>

          {step === 2 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAbortConfirm(true)}
                className="flex min-h-[44px] items-center gap-2 rounded-lg border border-red-600/50 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
              >
                <XCircle className="h-4 w-4" />
                Abort &amp; Save
              </button>
              <button
                type="button"
                onClick={resetMission}
                className="flex min-h-[44px] items-center gap-2 rounded-lg border border-tusas-border px-4 py-2 text-sm text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Mission
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      {step === 1 && (
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6">
          <ManeuverSetup
            selected={selectedManeuvers}
            onToggle={toggleManeuver}
            onApplyOCRResult={(r) => {
              setTestPointCount(r.testPointCount);
              const all = [...r.uniqueManeuvers];
              for (const m of Object.values(r.maneuversByPoint)) {
                if (m && !all.includes(m)) all.push(m);
              }
              const filtered = all.filter((m) => {
                const mLow = m.toLowerCase();
                return !all.some(
                  (o) => o !== m && o.toLowerCase().length > mLow.length && o.toLowerCase().includes(mLow),
                );
              });
              setSelectedManeuvers(filtered);
              setInitialManeuversFromOCR(r.maneuversByPoint);
              if (r.testNo) setFlightTestNumber(r.testNo);
            }}
            selectedFTEs={selectedFTEs}
            onFTEsChange={setSelectedFTEs}
            selectedTPs={selectedTPs}
            onTPsChange={setSelectedTPs}
            testPointCount={testPointCount}
            onTestPointCountChange={setTestPointCount}
            flightTestNumber={flightTestNumber}
            onFlightTestNumberChange={setFlightTestNumber}
            onStart={startFlight}
            isEditingManeuvers={isEditingManeuvers}
            onReturnToTest={returnToTest}
          />
        </div>
      )}
      {step === 2 && (
        <div className="min-w-0 flex-1 overflow-hidden">
          <TestEvaluation
            maneuverPool={selectedManeuvers}
            testPointCount={testPointCount!}
            evaluations={evaluations}
            currentTestPoint={currentTestPoint}
            onSelectTestPoint={setCurrentTestPoint}
            onUpdateEvaluation={updateEvaluation}
            completed={completed}
            cancelled={cancelled}
            onFinish={handleFinish}
            onEditManeuvers={editManeuvers}
            showSummary={showSummary}
            onShowSummaryChange={setShowSummary}
            startTime={startTime}
          />
        </div>
      )}

      {showAbortConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-tusas-border bg-tusas-surface p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold text-tusas-text">
              Abort Mission?
            </h2>
            <p className="mb-6 text-sm text-tusas-muted">
              This will save all collected data as PDF and end the current mission. Are you sure?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAbortConfirm(false)}
                className="rounded-lg border border-tusas-border px-4 py-2 text-sm text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAbortAndSave}
                className="rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Abort &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

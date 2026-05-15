import { useEffect, useState } from 'react';
import { Moon, RotateCcw, Sun, XCircle } from 'lucide-react';
import { useTheme } from './theme/ThemeContext';
import type { Evaluations, TestPointData } from './types';
import { createDefaultEvaluation, getHandlingEvalMode, isEvaluationComplete } from './data';
import { exportToPdf } from './exportPdf';
import TusasLogo from './components/TusasLogo';
import ManeuverSetup from './components/ManeuverSetup';
import TestEvaluation from './components/TestEvaluation';

type Step = 1 | 2;

/**
 * Demo mode (`?demo=1` query param) — used for symposium / live demos.
 * Boots the app straight into the evaluation screen with a small preset
 * flight so visitors can try out the rating UI via a QR code, without
 * having to go through the setup screen. Does NOT affect the normal flow.
 *
 * Currently focused on the BACH (Bank Angle Capture and Hold) maneuver:
 * a single maneuver in the pool and a few test points already assigned
 * to BACH, so visitors only need to fill in ratings & comments and can
 * generate a real PDF at the end.
 */
const DEMO_PRESET = {
  flightTestNumber: 'FLT-DEMO',
  ftes: ['Süleyman Murat Köroğlu'],
  tps: ['A.Y. Barbaros Demirbaş'],
  maneuvers: ['Bank Angle Capture and Hold'],
  testPointCount: 3,
} as const;

const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('demo') === '1';
};

export default function App() {
  const { theme, toggleTheme } = useTheme();
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
  const [demoMode] = useState<boolean>(() => isDemoMode());

  // Apply the demo preset on first mount when `?demo=1` is present.
  // This bypasses the setup screen and drops visitors directly into the
  // evaluation UI so they can interact with it without any configuration.
  useEffect(() => {
    if (!demoMode) return;
    const prefill: Evaluations = {};
    for (let tp = 1; tp <= DEMO_PRESET.testPointCount; tp++) {
      prefill[tp] = {
        maneuver: DEMO_PRESET.maneuvers[(tp - 1) % DEMO_PRESET.maneuvers.length],
        evaluation: createDefaultEvaluation(),
        cancelled: false,
        comments: {},
        generalComment: '',
      };
    }
    setFlightTestNumber(DEMO_PRESET.flightTestNumber);
    setSelectedFTEs([...DEMO_PRESET.ftes]);
    setSelectedTPs([...DEMO_PRESET.tps]);
    setSelectedManeuvers([...DEMO_PRESET.maneuvers]);
    setTestPointCount(DEMO_PRESET.testPointCount);
    setEvaluations(prefill);
    setCurrentTestPoint(1);
    setStartTime(new Date());
    setStep(2);
  }, [demoMode]);

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
    } else if (
      isEvaluationComplete(
        data.evaluation || createDefaultEvaluation(),
        data.maneuver,
        getHandlingEvalMode(data),
      )
    ) {
      setCompleted((prev) => (prev.includes(tp) ? prev : [...prev, tp]));
      setCancelled((prev) => prev.filter((x) => x !== tp));
    } else {
      // data.cancelled === false but eval is incomplete: TP returns to
      // "in progress" state (e.g. user restored a cancelled TP). Make sure
      // it is removed from BOTH lists so the sidebar shows it as pending.
      setCompleted((prev) => prev.filter((x) => x !== tp));
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
      aborted: false,
    });
  };

  const handleAbortAndSave = () => {
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
      aborted: true,
    });
    setShowAbortConfirm(false);
    resetMission();
  };

  const resetMission = () => {
    // In demo mode the user should never see the setup screen; reloading
    // re-applies the demo preset and gives them a fresh evaluation board.
    if (demoMode) {
      window.location.reload();
      return;
    }
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
    <div className="relative flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-x-hidden bg-tusas-bg">
      {/* Header */}
      <header className="relative z-50 shrink-0 min-w-0 border-b border-tusas-border bg-tusas-bg px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <TusasLogo className="h-9 w-auto shrink-0" />
            <span className="truncate font-semibold text-tusas-text">
              <span className="hidden sm:inline">Flight Test Assessment</span>
              <span className="sm:hidden">FTA</span>
            </span>
            {demoMode && (
              <span
                className="shrink-0 rounded-full border border-amber-500/60 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-500"
                title="Demo mode: preset flight (BACH only). Rate the test points and generate a PDF when done."
              >
                Demo
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Beyaz tema' : 'Koyu tema'}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-tusas-border bg-tusas-surface text-tusas-text transition-colors hover:bg-tusas-bg"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-amber-400" aria-hidden />
              ) : (
                <Moon className="h-5 w-5 text-tusas-blue" aria-hidden />
              )}
              <span className="sr-only">
                {theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
              </span>
            </button>
            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={resetMission}
                  title="Reset Mission"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg border border-tusas-border px-2 py-2 text-sm text-tusas-muted transition-colors hover:bg-tusas-bg hover:text-tusas-text sm:px-4"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Reset Mission</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAbortConfirm(true)}
                  title="Abort & Save"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg border border-red-600/50 bg-red-500/10 px-2 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300 sm:px-4"
                >
                  <XCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Abort &amp; Save</span>
                </button>
              </>
            )}
          </div>
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
            onEditManeuvers={demoMode ? undefined : editManeuvers}
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

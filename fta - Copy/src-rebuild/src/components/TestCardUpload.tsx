import { useState, useRef } from 'react';
import { Upload, ImageIcon, Loader2, X, Plus } from 'lucide-react';
import { createWorker, PSM } from 'tesseract.js';
import { MANEUVER_LIST, ABBR_TO_MANEUVER } from '../data';
import { parseTestCardFromWords, type OCRWord, type ParsedTestCard } from '../utils/parseTestCardOCR';

export interface TestCardExtractResult {
  testPointCount: number;
  uniqueManeuvers: string[];
  maneuversByPoint: Record<number, string>;
}

interface UploadedPage {
  id: number;
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
  parsed?: ParsedTestCard;
}

interface TestCardUploadProps {
  onExtract: (result: TestCardExtractResult) => void;
  disabled?: boolean;
}

let nextId = 0;

export default function TestCardUpload({ onExtract, disabled }: TestCardUploadProps) {
  const [pages, setPages] = useState<UploadedPage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updatePage = (id: number, patch: Partial<UploadedPage>) =>
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const runOCR = async (page: UploadedPage) => {
    updatePage(page.id, { status: 'processing', progress: 0 });
    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            updatePage(page.id, { progress: Math.round(m.progress * 100) });
          }
        },
      });
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      const { data } = await worker.recognize(page.file, {}, { blocks: true });
      await worker.terminate();

      const words: OCRWord[] = [];
      data.blocks?.forEach((block) =>
        block.paragraphs?.forEach((para) =>
          para.lines?.forEach((line) =>
            line.words?.forEach((w) =>
              words.push({ text: w.text, bbox: w.bbox }),
            ),
          ),
        ),
      );

      const parsed = parseTestCardFromWords(words, MANEUVER_LIST, ABBR_TO_MANEUVER);
      updatePage(page.id, { status: 'done', parsed });
      return parsed;
    } catch (err) {
      updatePage(page.id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'OCR failed',
      });
      return null;
    }
  };

  const combineAndEmit = (allPages: UploadedPage[]) => {
    let testPointCount = 0;
    const maneuversByPoint: Record<number, string> = {};
    const seenManeuvers = new Set<string>();
    const uniqueManeuvers: string[] = [];

    for (const p of allPages) {
      if (!p.parsed) continue;
      if (p.parsed.testPointCount > testPointCount) testPointCount = p.parsed.testPointCount;
      for (const row of p.parsed.rows) {
        if (row.maneuverMatched) maneuversByPoint[row.testPoint] = row.maneuverMatched;
      }
      for (const m of p.parsed.uniqueManeuvers) {
        if (!seenManeuvers.has(m)) {
          seenManeuvers.add(m);
          uniqueManeuvers.push(m);
        }
      }
    }

    onExtract({ testPointCount, uniqueManeuvers, maneuversByPoint });
  };

  const processFiles = async (files: File[]) => {
    const newPages: UploadedPage[] = files.map((file) => ({
      id: nextId++,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending' as const,
      progress: 0,
    }));

    const allPages = [...pages, ...newPages];
    setPages(allPages);

    for (const page of newPages) {
      await runOCR(page);
    }

    setPages((latest) => {
      combineAndEmit(latest);
      return latest;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    processFiles(files);
    e.target.value = '';
  };

  const removePage = (id: number) => {
    setPages((prev) => {
      const page = prev.find((p) => p.id === id);
      if (page) URL.revokeObjectURL(page.previewUrl);
      const remaining = prev.filter((p) => p.id !== id);
      if (remaining.length > 0) {
        combineAndEmit(remaining);
      } else {
        onExtract({ testPointCount: 0, uniqueManeuvers: [], maneuversByPoint: {} });
      }
      return remaining;
    });
  };

  const clearAll = () => {
    for (const p of pages) URL.revokeObjectURL(p.previewUrl);
    setPages([]);
    onExtract({ testPointCount: 0, uniqueManeuvers: [], maneuversByPoint: {} });
  };

  const isProcessing = pages.some((p) => p.status === 'processing' || p.status === 'pending');
  const doneCount = pages.filter((p) => p.status === 'done').length;

  return (
    <div className="rounded-lg border border-tusas-border bg-tusas-surface p-4">
      <h3 className="mb-2 text-sm font-semibold text-tusas-text">
        Upload test card pages
      </h3>
      <p className="mb-3 text-xs text-tusas-muted">
        Upload one or more test card pages (photos or screenshots). The app reads the # and FTT
        columns to set total test points and pre-select maneuvers.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isProcessing}
        multiple
      />

      {pages.length === 0 && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-tusas-border bg-tusas-bg text-tusas-muted transition-colors hover:border-tusas-blue hover:text-tusas-text disabled:opacity-50"
        >
          <Upload className="h-5 w-5" />
          Choose images
        </button>
      )}

      {pages.length > 0 && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <div
                key={page.id}
                className="relative overflow-hidden rounded-lg border border-tusas-border bg-tusas-bg"
              >
                <img
                  src={page.previewUrl}
                  alt={`Page ${page.id + 1}`}
                  className="h-28 w-full object-cover"
                />
                {!isProcessing && (
                  <button
                    type="button"
                    onClick={() => removePage(page.id)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="px-2 py-1">
                  {page.status === 'processing' && (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-tusas-blue" />
                      <span className="text-xs text-tusas-muted">Reading… {page.progress}%</span>
                    </div>
                  )}
                  {page.status === 'pending' && (
                    <span className="text-xs text-tusas-muted">Waiting…</span>
                  )}
                  {page.status === 'done' && (
                    <div className="flex items-center gap-1.5 text-xs text-green-500">
                      <ImageIcon className="h-3.5 w-3.5" />
                      {page.parsed?.testPointCount ?? 0} test points, {page.parsed?.uniqueManeuvers.length ?? 0} maneuvers
                    </div>
                  )}
                  {page.status === 'error' && (
                    <span className="text-xs text-red-400">{page.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {doneCount > 0 && !isProcessing && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-green-500">
                {doneCount} page{doneCount !== 1 ? 's' : ''} read. Form pre-filled below.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="flex items-center gap-1 rounded-md border border-tusas-border px-3 py-1.5 text-xs text-tusas-muted hover:text-tusas-text"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add more pages
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-md border border-tusas-border px-3 py-1.5 text-xs text-tusas-muted hover:text-red-400"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-tusas-blue" />
              <span className="text-xs text-tusas-muted">
                Processing {pages.filter((p) => p.status === 'processing').length > 0 ? 'page' : 'pages'}…
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

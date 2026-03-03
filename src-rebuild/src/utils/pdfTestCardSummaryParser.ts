/**
 * PDF Test Card Summary parser.
 * Extracts ID + FTT (+ optional TP#) from the "TEST CARD SUMMARY" table in a PDF.
 * Does not assume a fixed page number; scores all pages to find the best match.
 */
// @ts-expect-error -- Vite ?raw returns a string; no declarations needed
import workerCode from 'pdfjs-dist/build/pdf.worker.min.mjs?raw';
import * as pdfjsLib from 'pdfjs-dist';
import { matchManeuverName } from './parseTestCardOCR';
import { ABBR_TO_MANEUVER } from '../data';

export type TestSummaryItem = { id: string; ftt: string; tp?: string };

// Execute the pdf.js worker code directly on the main thread. This sets
// globalThis.pdfjsWorker which pdf.js detects, using its fake-worker path.
// No Web Worker, no dynamic import, no network request — works everywhere.
new Function(workerCode as string)();

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------
function normalizeText(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uff0d\u00ad]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Page scoring
// ---------------------------------------------------------------------------
const SCORE_TOKENS: [string, number][] = [
  ['TEST', 1],
  ['CARD', 1],
  ['SUMMARY', 1],
  ['FTT', 2],
  ['AIRSPEED', 1],
  ['ALTITUDE', 1],
  ['TP', 1],
  ['#', 1],
  ['FLIGHT TEST CARD', 1],
];

const MIN_SCORE = 4;

interface PageText {
  pageNum: number;
  raw: string;
  normalized: string;
  score: number;
}

async function extractPageText(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
): Promise<PageText> {
  const page = await doc.getPage(pageNum);
  const content = await page.getTextContent();
  const items = content.items as Array<{ str: string }>;
  const raw = items.map((item) => ('str' in item ? item.str : '')).join(' ');
  const normalized = normalizeText(raw);
  const upper = normalized.toUpperCase();

  let score = 0;
  for (const [token, pts] of SCORE_TOKENS) {
    if (upper.includes(token)) score += pts;
  }

  return { pageNum, raw, normalized, score };
}

async function findAllMatchingPages(
  doc: pdfjsLib.PDFDocumentProxy,
): Promise<PageText[]> {
  const numPages = doc.numPages;
  const matched: PageText[] = [];

  for (let p = 1; p <= numPages; p++) {
    const pt = await extractPageText(doc, p);
    if (pt.score >= MIN_SCORE) matched.push(pt);
  }
  return matched;
}

// ---------------------------------------------------------------------------
// ID regex — tolerates spaces that pdf.js inserts
// Matches: "S-CC5- PT-056", "S-CC5- PACH- 056", "S CC5 PT 057"
// ---------------------------------------------------------------------------
const ABBR_LIST = 'PT|PACH|BACH|BRL|CT|LACC|LDEC|PRT|BAC|PD|PU|PO|RD|OL|IF|IFPU|LTAC|LGT|CMT|SBO|SPR|SHS|TRIM|WUT|YD|360R|1GSPO';
const ID_REGEX = new RegExp(
  `S[-\\s]*[A-Z0-9]{2,5}[-\\s]+(${ABBR_LIST})[-\\s]*\\d{2,3}`,
  'gi',
);

function canonicalizeId(raw: string): string {
  return raw
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// FTT extraction
// ---------------------------------------------------------------------------
function extractFtt(
  windowText: string,
  idAbbr: string | null,
  maneuverList: readonly string[],
): string {
  // 1) Try abbreviation from ID → direct lookup
  if (idAbbr) {
    const fromAbbr = ABBR_TO_MANEUVER[idAbbr.toUpperCase()];
    if (fromAbbr) return fromAbbr;
  }

  // 2) Cut window at first airspeed-like pattern (e.g. "150/0.3")
  const airspeedIdx = windowText.search(/\d+\/[\d.]+/);
  const fttRaw = (airspeedIdx > 0
    ? windowText.slice(0, airspeedIdx)
    : windowText
  ).trim();

  if (!fttRaw) return idAbbr ?? '';

  // 3) matchManeuverName (handles fuzzy/partial)
  const matched = matchManeuverName(fttRaw, maneuverList);
  if (matched) return matched;

  return fttRaw;
}

// ---------------------------------------------------------------------------
// Parse table rows from page text
// ---------------------------------------------------------------------------
function parseFromText(
  text: string,
  maneuverList: readonly string[],
): TestSummaryItem[] {
  const items: TestSummaryItem[] = [];
  const seenIds = new Set<string>();

  const matches = [...text.matchAll(ID_REGEX)];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const rawId = m[0];
    const idAbbr = m[1] ?? null; // captured abbreviation group (PT, PACH, etc.)
    const id = canonicalizeId(rawId);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const afterIdStart = (m.index ?? 0) + rawId.length;
    const nextMatch = matches[i + 1];
    const windowEnd = nextMatch
      ? (nextMatch.index ?? text.length)
      : Math.min(text.length, afterIdStart + 200);

    const windowText = normalizeText(text.slice(afterIdStart, windowEnd));
    const ftt = extractFtt(windowText, idAbbr, maneuverList);

    // TP#: last 3-digit number in window that isn't part of airspeed (x/y)
    const cleaned = windowText.replace(/\d+\/[\d.]+/g, '');
    const tpMatches = [...cleaned.matchAll(/\b(\d{3})\b/g)];
    const tp = tpMatches.length > 0 ? tpMatches[tpMatches.length - 1][1] : undefined;
    items.push({ id, ftt, tp });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export interface PdfTestCardExtractResult {
  testPointCount: number;
  uniqueManeuvers: string[];
  maneuversByPoint: Record<number, string>;
}

/**
 * Render PDF pages as images for OCR fallback.
 * Uses OffscreenCanvas where available, falls back to regular canvas.
 */
export async function renderPdfPagesAsImages(
  pdfFile: File,
  maxPages = 10,
  scale = 2.0,
): Promise<File[]> {
  const buf = await pdfFile.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const n = Math.min(doc.numPages, maxPages);
  const files: File[] = [];

  for (let p = 1; p <= n; p++) {
    try {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, canvas, viewport: vp }).promise;

      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, 'image/png'),
      );
      if (blob) {
        files.push(new File([blob], `pdf-page-${p}.png`, { type: 'image/png' }));
      }
    } catch (e) {
      console.warn(`[PDF] Could not render page ${p} to image:`, e);
    }
  }

  return files;
}

export async function parsePdfTestCardSummary(
  pdfFile: File,
  maneuverList: readonly string[],
): Promise<PdfTestCardExtractResult> {
  const empty: PdfTestCardExtractResult = {
    testPointCount: 0,
    uniqueManeuvers: [],
    maneuversByPoint: {},
  };

  const buf = await pdfFile.arrayBuffer();
  let doc: pdfjsLib.PDFDocumentProxy;
  try {
    doc = await pdfjsLib.getDocument({ data: buf }).promise;
  } catch {
    throw new Error('PDF dosyası açılamadı.');
  }

  const matchedPages = await findAllMatchingPages(doc);
  if (matchedPages.length === 0) return empty;
  const allItems: TestSummaryItem[] = [];
  const seenIds = new Set<string>();

  for (const page of matchedPages) {
    const pageItems = parseFromText(page.normalized, maneuverList);
    for (const item of pageItems) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allItems.push(item);
      }
    }
  }

  if (allItems.length === 0) return empty;

  const maneuversByPoint: Record<number, string> = {};
  const uniqueManeuvers: string[] = [];
  const seen = new Set<string>();

  for (let idx = 0; idx < allItems.length; idx++) {
    const item = allItems[idx];
    const pointNum = idx + 1;
    maneuversByPoint[pointNum] = item.ftt;
    if (!seen.has(item.ftt)) {
      seen.add(item.ftt);
      uniqueManeuvers.push(item.ftt);
    }
  }

  return {
    testPointCount: allItems.length,
    uniqueManeuvers,
    maneuversByPoint,
  };
}

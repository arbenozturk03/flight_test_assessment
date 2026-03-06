/**
 * PDF dosyasından test kartı verisini çıkarır — TAMAMEN TARAYICIDA çalışır, sunucu yok.
 */
import { extractTextFromPdfFile } from './pdfToText';
import { MANEUVER_LIST, ABBR_TO_MANEUVER } from '../data';

export interface PdfParseResult {
  testPointCount: number;
  uniqueManeuvers: string[];
  maneuversByPoint: Record<number, string>;
  testNo: string | null;
}

function normalizeText(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uff0d\u00ad]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
}

function norm(s: string) { return s.trim().toLowerCase().replace(/\s+/g, ' '); }
function normCompact(s: string) { return norm(s).replace(/\s/g, ''); }

function matchManeuverName(ocrName: string): string | null {
  const raw = ocrName.trim();
  if (!raw) return null;
  const lower = norm(raw);
  const compact = normCompact(raw);

  for (const m of MANEUVER_LIST) {
    if (norm(m) === lower || normCompact(m) === compact) return m;
  }
  let bestContained: string | null = null;
  for (const m of MANEUVER_LIST) {
    const mLower = norm(m);
    if (lower.includes(mLower) || compact.includes(normCompact(m))) {
      if (!bestContained || mLower.length > norm(bestContained).length) bestContained = m;
    }
  }
  if (bestContained) return bestContained;
  let bestContainer: string | null = null;
  for (const m of MANEUVER_LIST) {
    const mLower = norm(m);
    if (mLower.includes(lower) || normCompact(m).includes(compact)) {
      if (!bestContainer || mLower.length < norm(bestContainer).length) bestContainer = m;
    }
  }
  return bestContainer;
}

const ABBR_LIST = 'PT|PACH|BACH|BRL|CT|LACC|LDEC|PRT|BAC|PD|PU|PO|RD|OL|IF|IFPU|LTAC|LGT|CMT|SBO|SPR|SHS|TRIM|WUT|YD|360R|1GSPO';
const ID_REGEX = new RegExp(
  `S[-\\s]*[A-Z0-9]{2,5}[-\\s]+(${ABBR_LIST})[-\\s]*\\d{2,3}`,
  'gi',
);

function canonicalizeId(raw: string) {
  return raw.replace(/\s+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').toUpperCase();
}

function extractFtt(windowText: string, idAbbr: string | null): string {
  if (idAbbr) {
    const fromAbbr = ABBR_TO_MANEUVER[idAbbr.toUpperCase()];
    if (fromAbbr) return fromAbbr;
  }
  const airspeedIdx = windowText.search(/\d+\/[\d.]+/);
  const fttRaw = (airspeedIdx > 0 ? windowText.slice(0, airspeedIdx) : windowText).trim();
  if (!fttRaw) return idAbbr || '';
  return matchManeuverName(fttRaw) ?? fttRaw;
}

function extractTestNo(text: string): string | null {
  const m = text.match(/Test\s*No\s*[:\-]?\s*([A-Z0-9][\w\-]*)/i);
  return m ? m[1].trim() : null;
}

function parseFromText(text: string) {
  const items: { id: string; ftt: string; tp?: string }[] = [];
  const seenIds = new Set<string>();
  const matches = [...text.matchAll(ID_REGEX)];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const rawId = m[0];
    const idAbbr = m[1] || null;
    const id = canonicalizeId(rawId);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const afterIdStart = (m.index || 0) + rawId.length;
    const nextMatch = matches[i + 1];
    const windowEnd = nextMatch
      ? (nextMatch.index || text.length)
      : Math.min(text.length, afterIdStart + 200);
    const windowText = normalizeText(text.slice(afterIdStart, windowEnd));
    const ftt = extractFtt(windowText, idAbbr);

    const cleaned = windowText.replace(/\d+\/[\d.]+/g, '');
    const tpMatches = [...cleaned.matchAll(/\b(\d{3})\b/g)];
    const tp = tpMatches.length > 0 ? tpMatches[tpMatches.length - 1][1] : undefined;
    items.push({ id, ftt, tp });
  }
  return items;
}

const SCORE_TOKENS: [string, number][] = [
  ['TEST', 1], ['CARD', 1], ['SUMMARY', 1], ['FTT', 2],
  ['AIRSPEED', 1], ['ALTITUDE', 1], ['TP', 1], ['#', 1],
  ['FLIGHT TEST CARD', 1],
];
const MIN_SCORE = 4;

function scoreText(text: string) {
  const upper = text.toUpperCase();
  let score = 0;
  for (const [token, pts] of SCORE_TOKENS) {
    if (upper.includes(token)) score += pts;
  }
  return score;
}

export async function parseTestCardPdf(file: File): Promise<PdfParseResult> {
  const rawText = await extractTextFromPdfFile(file);
  const fullText = normalizeText(rawText);

  const pages = rawText.includes('\f')
    ? rawText.split('\f').map(normalizeText)
    : [fullText];

  const matchedTexts: string[] = [];
  for (const page of pages) {
    if (scoreText(page) >= MIN_SCORE) matchedTexts.push(page);
  }
  if (matchedTexts.length === 0 && scoreText(fullText) >= MIN_SCORE) {
    matchedTexts.push(fullText);
  }

  const allItems: { id: string; ftt: string; tp?: string }[] = [];
  const seenIds = new Set<string>();
  for (const text of matchedTexts) {
    for (const item of parseFromText(text)) {
      if (!seenIds.has(item.id)) { seenIds.add(item.id); allItems.push(item); }
    }
  }
  if (allItems.length === 0) {
    for (const item of parseFromText(fullText)) {
      if (!seenIds.has(item.id)) { seenIds.add(item.id); allItems.push(item); }
    }
  }

  const maneuversByPoint: Record<number, string> = {};
  const uniqueManeuvers: string[] = [];
  const seen = new Set<string>();
  for (let idx = 0; idx < allItems.length; idx++) {
    const item = allItems[idx];
    maneuversByPoint[idx + 1] = item.ftt;
    if (!seen.has(item.ftt)) { seen.add(item.ftt); uniqueManeuvers.push(item.ftt); }
  }

  return {
    testPointCount: allItems.length,
    uniqueManeuvers,
    maneuversByPoint,
    testNo: extractTestNo(fullText),
  };
}

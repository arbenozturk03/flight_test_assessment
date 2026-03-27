/**
 * Parse test card OCR output.
 * Strategy: find "#" and "FTT" header words by text, then use their x-position
 * to read the column data below them. No complex column boundary logic needed.
 */
export interface OCRWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export type OCRLine = OCRWord[];

export interface ParsedTestCardRow {
  testPoint: number;
  fttRaw: string;
  maneuverMatched: string | null;
}

export interface ParsedTestCard {
  testPointCount: number;
  rows: ParsedTestCardRow[];
  uniqueManeuvers: string[];
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normCompact(s: string): string {
  return norm(s).replace(/\s/g, '');
}

export function matchManeuverName(
  ocrName: string,
  maneuverList: readonly string[],
): string | null {
  const raw = ocrName.trim();
  if (!raw) return null;
  const lower = norm(raw);
  const compact = normCompact(raw);
  const ocrWords = lower.split(/\s+/).filter(Boolean);
  const ocrFirstWord = ocrWords[0] ?? '';
  if (!ocrFirstWord) return null;

  const hasPitchAngleHold =
    lower.includes('pitch') && lower.includes('angle') && (lower.includes('capture') || lower.includes('hold'));
  const hasTrack =
    lower.includes('tracking') || lower.includes('trackng') || lower.includes('trackin') || lower.includes('track');
  const hasPitchTracking = lower.includes('pitch') && hasTrack && !lower.includes('angle') && !lower.includes('roll');
  const hasPitchRollTracking = lower.includes('pitch') && lower.includes('roll') && hasTrack;

  if (hasPitchAngleHold) {
    const m = maneuverList.find((x) => norm(x) === 'pitch angle capture and hold');
    if (m) return m;
  }
  if (hasPitchRollTracking) {
    const m = maneuverList.find((x) => norm(x) === 'pitch and roll tracking');
    if (m) return m;
  }
  if (hasPitchTracking) {
    const m = maneuverList.find((x) => norm(x) === 'pitch tracking');
    if (m) return m;
  }
  if (hasTrack && !lower.includes('angle') && !lower.includes('roll') && !lower.includes('pitch')) {
    const m = maneuverList.find((x) => norm(x) === 'pitch tracking');
    if (m) return m;
  }

  for (const m of maneuverList) {
    if (m === raw) return m;
    if (norm(m) === lower) return m;
    if (normCompact(m) === compact) return m;
  }

  // Prefer the longest maneuver whose name is fully contained in the input text.
  // e.g. input "Bank Angle Capture and Hold foo" matches both "Bank Angle Capture"
  // and "Bank Angle Capture and Hold" — pick the longer one.
  let bestContained: string | null = null;
  for (const m of maneuverList) {
    const mLower = norm(m);
    const mCompact = normCompact(m);
    if (lower.includes(mLower) || compact.includes(mCompact)) {
      if (!bestContained || mLower.length > norm(bestContained).length) {
        bestContained = m;
      }
    }
  }
  if (bestContained) return bestContained;

  // Fallback: a maneuver name contains the input (partial OCR) — prefer shortest
  let bestContainer: string | null = null;
  for (const m of maneuverList) {
    const mLower = norm(m);
    const mCompact = normCompact(m);
    if (mLower.includes(lower) || mCompact.includes(compact)) {
      if (!bestContainer || mLower.length < norm(bestContainer).length) {
        bestContainer = m;
      }
    }
  }
  if (bestContainer) return bestContainer;

  const byFirstWord = maneuverList.filter((m) => norm(m).split(/\s+/)[0] === ocrFirstWord);
  if (byFirstWord.length === 1) return byFirstWord[0];
  if (byFirstWord.length > 1) {
    const best = byFirstWord.find((m) => norm(m).startsWith(lower) || lower.startsWith(norm(m)));
    if (best) return best;
    const bestByWords = byFirstWord.find((m) => {
      const mWords = norm(m).split(/\s+/);
      const overlap = ocrWords.filter((w) => mWords.some((mw) => mw.includes(w) || w.includes(mw))).length;
      return overlap >= Math.min(ocrWords.length, mWords.length) - 1;
    });
    if (bestByWords) return bestByWords;
    return byFirstWord[0];
  }
  for (const m of maneuverList) {
    const mWords = norm(m).split(/\s+/);
    if (ocrWords.length >= 2 && mWords.length >= 2) {
      const matchCount = ocrWords.filter((ow) =>
        mWords.some((mw) => mw === ow || mw.includes(ow) || ow.includes(mw)),
      ).length;
      if (matchCount >= Math.min(ocrWords.length, mWords.length)) return m;
    }
  }
  return null;
}

/** Group words into rows by y, with small gap threshold. */
function groupByY(words: OCRWord[]): OCRWord[][] {
  if (words.length === 0) return [];
  const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const heights = sorted.map((w) => w.bbox.y1 - w.bbox.y0).filter((h) => h > 0);
  const medianH = heights.length > 0
    ? [...heights].sort((a, b) => a - b)[Math.floor(heights.length / 2)]
    : 10;
  const minGap = Math.max(1, medianH * 0.15);

  const rows: OCRWord[][] = [];
  let cur: OCRWord[] = [];
  let lastBottom = -9999;
  for (const w of sorted) {
    if (cur.length > 0 && w.bbox.y0 - lastBottom > minGap) {
      rows.push(cur.sort((a, b) => a.bbox.x0 - b.bbox.x0));
      cur = [];
    }
    cur.push(w);
    lastBottom = Math.max(lastBottom, w.bbox.y1);
  }
  if (cur.length > 0) rows.push(cur.sort((a, b) => a.bbox.x0 - b.bbox.x0));
  return rows;
}

/**
 * Main parser.
 * Total number of test points: each row's LEFTMOST word → parse as number → take the max.
 * FTT maneuvers: find "FTT" header word, read words below it in that x-zone.
 */
export function parseTestCardFromWords(
  words: OCRWord[],
  maneuverList: readonly string[],
  abbrToManeuver?: Record<string, string>,
): ParsedTestCard {
  if (words.length === 0) return { testPointCount: 0, rows: [], uniqueManeuvers: [] };

  const allRows = groupByY(words);

  // --- TOTAL NUMBER OF TEST POINTS ---
  // For every row, take the leftmost word. If it's a number 1-100, it's a test point number.
  // The max of all such numbers = total number of test points.
  let testPointCount = 0;
  for (const row of allRows) {
    const leftmost = row[0]; // rows are sorted by x
    if (!leftmost) continue;
    const t = leftmost.text.trim().replace(/\.$/, '');
    const n = parseInt(t, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 100 && String(n) === t) {
      testPointCount = Math.max(testPointCount, n);
    }
  }

  // --- FTT COLUMN ZONE DETECTION (run first so per-row matching can use boundaries) ---
  const candidates: string[] = [];
  let fttColLeft = -1;
  let fttColRight = -1;
  let headerYBottom = 0;

  // Strategy 1: Look for "FTT" header directly (OCR often reads "FIT", "FII", etc.)
  const fttVariations = ['ftt', 'ft', 'f.t.t', 'f.t.t.', 'ffi', 'ett', 'fit'];
  let fttHeaderWord: OCRWord | null = null;
  for (const row of allRows) {
    for (const w of row) {
      const wt = w.text.trim().toLowerCase().replace(/[^a-z.]/g, '');
      if (fttVariations.includes(wt)) {
        fttHeaderWord = w;
        break;
      }
    }
    if (fttHeaderWord) break;
  }

  if (fttHeaderWord) {
    const fttMidY = (fttHeaderWord.bbox.y0 + fttHeaderWord.bbox.y1) / 2;
    const fttH = fttHeaderWord.bbox.y1 - fttHeaderWord.bbox.y0;
    const yTol = Math.max(fttH * 0.75, 10);
    const hdrWords = words
      .filter((w) => {
        if (Math.abs((w.bbox.y0 + w.bbox.y1) / 2 - fttMidY) >= yTol) return false;
        const t = w.text.trim();
        return t.length > 1 && t !== '|';
      })
      .sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const fttIdx = hdrWords.indexOf(fttHeaderWord);
    fttColLeft = fttIdx > 0 ? hdrWords[fttIdx - 1].bbox.x1 : fttHeaderWord.bbox.x0;
    let nextRight: OCRWord | null = null;
    for (let i = fttIdx + 1; i < hdrWords.length; i++) {
      if (hdrWords[i].bbox.x0 > fttHeaderWord.bbox.x1 + 5) {
        nextRight = hdrWords[i];
        break;
      }
    }
    fttColRight = nextRight ? nextRight.bbox.x0 : fttHeaderWord.bbox.x1 * 3;
    headerYBottom = fttHeaderWord.bbox.y1;
  }

  // Strategy 2: Find header row by known column names (exact + common OCR misreads)
  if (fttColLeft < 0) {
    const isKnownHdr = (t: string) => {
      const exact = ['id', 'airspeed', 'altitude', 'lg', 'engine', 'tp#', 'tp'];
      if (exact.includes(t)) return true;
      if (/^airsp/.test(t) || /^altit/.test(t)) return true;
      return false;
    };
    const headerHits = words.filter((w) => isKnownHdr(w.text.trim().toLowerCase()));

    if (headerHits.length >= 2) {
      const midYs = headerHits.map((w) => (w.bbox.y0 + w.bbox.y1) / 2);
      const centerY = (Math.min(...midYs) + Math.max(...midYs)) / 2;
      const halfRange = (Math.max(...midYs) - Math.min(...midYs)) / 2 + 12;

      const hdrRow = words
        .filter((w) => Math.abs((w.bbox.y0 + w.bbox.y1) / 2 - centerY) <= halfRange)
        .sort((a, b) => a.bbox.x0 - b.bbox.x0);

      const idHits = hdrRow.filter((w) => w.text.trim().toLowerCase() === 'id');
      const leftmostId =
        idHits.length > 0
          ? idHits.reduce((a, b) => (a.bbox.x0 < b.bbox.x0 ? a : b))
          : null;

      if (leftmostId) {
        const rightHeaders = hdrRow.filter((w) => {
          const wt = w.text.trim().toLowerCase();
          return (
            w.bbox.x0 > leftmostId.bbox.x1 + 50 &&
            (isKnownHdr(wt) && wt !== 'id')
          );
        });
        if (rightHeaders.length > 0) {
          const nearest = rightHeaders.reduce((a, b) =>
            a.bbox.x0 < b.bbox.x0 ? a : b,
          );
          fttColLeft = leftmostId.bbox.x1;
          fttColRight = nearest.bbox.x0;
          const bottoms = hdrRow
            .filter((w) => w.text.trim() !== '|' && w.text.trim().length > 1)
            .map((w) => w.bbox.y1);
          headerYBottom = bottoms.length > 0 ? Math.max(...bottoms) : 0;
        }
      }

      if (fttColLeft < 0) {
        const forGap = hdrRow.filter((w) => {
          const wt = w.text.trim();
          return wt.length > 1 && wt !== '|';
        });
        let maxGap = 0;
        let gapIdx = -1;
        for (let i = 0; i < forGap.length - 1; i++) {
          const gap = forGap[i + 1].bbox.x0 - forGap[i].bbox.x1;
          if (gap > maxGap) {
            maxGap = gap;
            gapIdx = i;
          }
        }
        if (gapIdx >= 0 && maxGap > 50) {
          fttColLeft = forGap[gapIdx].bbox.x1;
          fttColRight = forGap[gapIdx + 1].bbox.x0;
          const bottoms = hdrRow
            .filter((w) => w.text.trim() !== '|' && w.text.trim().length > 1)
            .map((w) => w.bbox.y1);
          headerYBottom = bottoms.length > 0 ? Math.max(...bottoms) : 0;
        }
      }
    }
  }

  // Strategy 3: Structural detection — find FTT column by locating the leftmost
  // column of multi-digit numbers (Airspeed) as the right boundary
  if (fttColLeft < 0) {
    const numPattern = /^\d{3,6}/;
    const numWords = words.filter((w) => numPattern.test(w.text.trim()));
    if (numWords.length >= 3) {
      const xBuckets = new Map<number, number>();
      for (const w of numWords) {
        const bk = Math.round(w.bbox.x0 / 20) * 20;
        xBuckets.set(bk, (xBuckets.get(bk) ?? 0) + 1);
      }
      const sortedBuckets = [...xBuckets.entries()]
        .filter(([, count]) => count >= 3)
        .sort(([a], [b]) => a - b);
      if (sortedBuckets.length > 0) {
        const targetBucket = sortedBuckets[0][0];
        const colNums = numWords.filter(
          (w) => Math.abs(Math.round(w.bbox.x0 / 20) * 20 - targetBucket) <= 20,
        );
        const rightBound = Math.min(...colNums.map((w) => w.bbox.x0));
        const maxX = Math.max(...words.map((w) => w.bbox.x1));
        const estLeft = maxX * 0.14;
        fttColLeft = estLeft;
        fttColRight = rightBound;
        const topNum = colNums.reduce((a, b) => (a.bbox.y0 < b.bbox.y0 ? a : b));
        headerYBottom = topNum.bbox.y0;
      }
    }
  }

  const hasFttZone = fttColLeft >= 0 && fttColRight > fttColLeft;

  // Helper: check if a word falls within the detected FTT column zone
  const isInFttZone = (w: OCRWord) => {
    const wMidX = (w.bbox.x0 + w.bbox.x1) / 2;
    return wMidX >= fttColLeft && wMidX <= fttColRight;
  };

  // --- GROUP DATA ROWS WITH CONTINUATION ROWS ---
  const dataRowIndices: number[] = [];
  for (let i = 0; i < allRows.length; i++) {
    const leftmost = allRows[i][0];
    if (!leftmost) continue;
    const t = leftmost.text.trim().replace(/\.$/, '');
    const n = parseInt(t, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 100 && String(n) === t) {
      dataRowIndices.push(i);
    }
  }

  // --- FTT COLUMN TEXT SCAN (sole source of maneuver SELECTION candidates) ---
  let fttColWordsSaved: OCRWord[] = [];

  if (hasFttZone) {
    const fttColWords = words
      .filter((w) => {
        if (w.bbox.y0 < headerYBottom) return false;
        return isInFttZone(w);
      })
      .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);

    fttColWordsSaved = fttColWords;
    const fttCompact = fttColWords
      .map((w) => w.text.trim().toLowerCase())
      .join('')
      .replace(/\s+/g, '');

    for (const m of maneuverList) {
      const mCompact = normCompact(m);
      if (fttCompact.includes(mCompact)) candidates.push(m);
    }
  }

  // Subset filtering: remove shorter maneuvers that are substrings of longer matched ones
  const uniqueManeuvers = candidates.filter((m) => {
    const mNorm = norm(m);
    return !candidates.some((other) => {
      if (other === m) return false;
      const otherNorm = norm(other);
      return otherNorm.length > mNorm.length && otherNorm.includes(mNorm);
    });
  });

  // --- OCR CORRECTION HELPER for common misreads ---
  function ocrCorrect(t: string): string {
    // pitch variants
    t = t.replace(/p[il1][tf]ch/gi, 'pitch');
    t = t.replace(/pitcb/gi, 'pitch');
    t = t.replace(/pltch/gi, 'pitch');
    t = t.replace(/pi[tf]c[hb]/gi, 'pitch');
    t = t.replace(/^pich$/i, 'pitch');
    // roll variants
    t = t.replace(/r[o0][il1][il1]/gi, 'roll');
    t = t.replace(/^roil$/i, 'roll');
    t = t.replace(/^roli$/i, 'roll');
    t = t.replace(/^rell$/i, 'roll');
    t = t.replace(/^rall$/i, 'roll');
    t = t.replace(/^oll$/i, 'roll');
    t = t.replace(/^rroll$/i, 'roll');
    // tracking variants
    t = t.replace(/track[il1]ng/gi, 'tracking');
    t = t.replace(/tarcking/gi, 'tracking');
    t = t.replace(/trackng/gi, 'tracking');
    t = t.replace(/trackin$/gi, 'tracking');
    t = t.replace(/traking/gi, 'tracking');
    t = t.replace(/trackinq/gi, 'tracking');
    // landing variants
    t = t.replace(/[il1]anding/gi, 'landing');
    t = t.replace(/larding/gi, 'landing');
    t = t.replace(/landng/gi, 'landing');
    t = t.replace(/landinq/gi, 'landing');
    // gear variants
    t = t.replace(/[cq6]ear/gi, 'gear');
    t = t.replace(/qear/gi, 'gear');
    // transition variants
    t = t.replace(/trans[il1]t[il1]on/gi, 'transition');
    t = t.replace(/transitlon/gi, 'transition');
    t = t.replace(/transiiion/gi, 'transition');
    t = t.replace(/transitio$/gi, 'transition');
    t = t.replace(/transitio([^n])/gi, 'transition$1');
    t = t.replace(/^transitio$/i, 'transition');
    // Handle split word: "transitio" + "n" becomes "transitionn" when joined — fix it
    t = t.replace(/transitionn/gi, 'transition');
    // acceleration/deceleration
    t = t.replace(/acce[il1]er/gi, 'acceler');
    t = t.replace(/dece[il1]er/gi, 'deceler');
    // capture/hold
    t = t.replace(/capt[uv]re/gi, 'capture');
    t = t.replace(/captur$/gi, 'capture');
    t = t.replace(/ho[il1]d/gi, 'hold');
    // angle/bank
    t = t.replace(/ang[il1]e/gi, 'angle');
    t = t.replace(/[b8]ank/gi, 'bank');
    // level
    t = t.replace(/[il1]eve[il1]/gi, 'level');
    // coordinated turn variants
    t = t.replace(/coord[il1]nat/gi, 'coordinat');
    t = t.replace(/coordnated/gi, 'coordinated');
    t = t.replace(/coordinafed/gi, 'coordinated');
    t = t.replace(/coordinared/gi, 'coordinated');
    // Handle split: "coordinat" + "ed" → "coordinated"
    t = t.replace(/coordinat$/i, 'coordinated');
    t = t.replace(/coordinateed/gi, 'coordinated');
    // turn variants
    t = t.replace(/^furn$/i, 'turn');
    t = t.replace(/^tum$/i, 'turn');
    t = t.replace(/^turm$/i, 'turn');
    // "ed turn" or "edturn" at start (from split "coordinat" + "ed turn")
    t = t.replace(/^edturn$/i, 'turn');
    t = t.replace(/^ed$/i, '');
    return t;
  }

  // --- PER-ROW MATCHING (for per-point mapping, does NOT affect maneuver selection) ---
  function isNonFTTToken(wt: string): boolean {
    if (!wt) return true;
    if (/^S-/i.test(wt)) return true;
    if (/^[A-Z0-9]+-[A-Z0-9-]+$/i.test(wt) && wt.length > 5) return true;
    if (/^\d+$/.test(wt)) return true;
    if (/^\d+\/[\d.]+$/.test(wt)) return true;
    if (/^(DN|UP|AsReq|SCH|TLF|MAX|IDLE)$/i.test(wt)) return true;
    if (/^SCH\/SC$/i.test(wt)) return true;
    if (/^>/.test(wt)) return true;
    if (/^[A-Z]$/i.test(wt)) return true;
    if (/^L\/R$/i.test(wt)) return true;
    if (/^LEF/i.test(wt)) return true;
    if (/^TP$/i.test(wt)) return true;
    return false;
  }

  // --- ID-BASED MANEUVER EXTRACTION ---
  // The ID column (e.g. "S-CC5-BACH-009") encodes the maneuver abbreviation.
  // OCR often splits this into multiple words: "S-CC5-", "BACH-", "021"
  // So we look for words that start with a known abbreviation followed by hyphen.
  function extractManeuverFromID(rowWords: OCRWord[]): string | null {
    if (!abbrToManeuver) return null;
    
    // Get all known abbreviations, sorted by length (longest first to prefer BACH over BA)
    const knownAbbrs = Object.keys(abbrToManeuver).sort((a, b) => b.length - a.length);
    
    // OCR common misreads for abbreviations
    const ocrAbbrFixes: Record<string, string> = {
      '8ACH': 'BACH', 'BACI': 'BACH', 'BACN': 'BACH', '8ACN': 'BACH',
      'P7': 'PT', 'PI': 'PT', 'P1': 'PT',
      'PR7': 'PRT', 'PRI': 'PRT', 'PR1': 'PRT',
      'C7': 'CT', 'CI': 'CT', 'C1': 'CT',
      'LAAC': 'LACC', 'LAOC': 'LACC', 'LRCC': 'LACC',
      'LOEC': 'LDEC', 'LOCC': 'LDEC', 'LOFC': 'LDEC', 'L0EC': 'LDEC',
    };
    
    function fixOCRAbbr(s: string): string {
      const upper = s.toUpperCase();
      return ocrAbbrFixes[upper] ?? upper;
    }
    
    // Combine all words to check for full ID patterns
    const allText = rowWords.map(w => w.text.trim()).join(' ');
    
    for (const w of rowWords) {
      let wt = w.text.trim().toUpperCase();
      // Strip trailing -digits so "BACH-021" or "8ACH-021" -> abbr part only
      const abbrPart = wt.replace(/[-_]?\d*$/, '').replace(/^[-_]+/, '');
      const wtFixed = fixOCRAbbr(wt);
      const abbrPartFixed = fixOCRAbbr(abbrPart);
      
      // Direct match on cleaned abbreviation part (handles OCR like "8ACH-021")
      if (abbrPartFixed.length >= 2 && abbrToManeuver[abbrPartFixed]) {
        return abbrToManeuver[abbrPartFixed];
      }
      
      // Check if word starts with a known abbreviation followed by hyphen, number, or end
      for (const abbr of knownAbbrs) {
        if (wtFixed === abbr || 
            wtFixed.startsWith(abbr + '-') || 
            wtFixed.startsWith(abbr + '0') || 
            wtFixed.startsWith(abbr + '1') ||
            wtFixed.startsWith(abbr + '2') ||
            wtFixed.startsWith(abbr + '3')) {
          return abbrToManeuver[abbr];
        }
      }
      
      // Also check full ID pattern: S-CC5-BACH-009 or similar
      const m = wt.match(/^S-\w+-([A-Z0-9]{2,5})-/i);
      if (m) {
        const abbr = fixOCRAbbr(m[1]);
        if (abbrToManeuver[abbr]) return abbrToManeuver[abbr];
      }
      
      // Check hyphenated parts (each part may be OCR-mangled)
      const parts = wt.split('-');
      for (const part of parts) {
        const candidate = fixOCRAbbr(part.replace(/\d+$/, ''));
        if (candidate.length >= 2 && abbrToManeuver[candidate]) {
          return abbrToManeuver[candidate];
        }
      }
    }
    
    // Second pass: look in the combined text for patterns like "BACH-024", "PT-033"
    for (const abbr of knownAbbrs) {
      const pattern = new RegExp(`\\b${abbr}[-_]?\\d{2,3}\\b`, 'i');
      if (pattern.test(allText)) {
        return abbrToManeuver[abbr];
      }
    }
    
    // Third pass: look for standalone abbreviations that might be separated by OCR
    for (const abbr of knownAbbrs) {
      const pattern = new RegExp(`\\b${abbr}\\b`, 'i');
      if (pattern.test(allText) && abbr.length >= 2) {
        return abbrToManeuver[abbr];
      }
    }
    
    return null;
  }

  const sorted: ParsedTestCardRow[] = [];
  const rowWordsMap = new Map<number, string[]>();
  const rowAllWordsMap = new Map<number, string[]>();

  // --- STRATEGY A: Process rows with detected test point numbers ---
  for (let di = 0; di < dataRowIndices.length; di++) {
    const ri = dataRowIndices[di];
    const nextRi = di + 1 < dataRowIndices.length ? dataRowIndices[di + 1] : allRows.length;
    const row = allRows[ri];
    const leftmost = row[0];
    if (!leftmost) continue;
    const t = leftmost.text.trim().replace(/\.$/, '');
    const n = parseInt(t, 10);

    const combinedWords: OCRWord[] = [...row];
    for (let ci = ri + 1; ci < nextRi; ci++) {
      combinedWords.push(...allRows[ci]);
    }

    // PRIMARY: Try to extract maneuver from ID column (most reliable)
    let maneuverMatched = extractManeuverFromID(combinedWords);

    const candidateWords: string[] = [];
    const allWordsUnfiltered: string[] = [];
    for (const w of combinedWords) {
      const wt = w.text.trim();
      if (wt === String(n)) continue;
      if (!isNonFTTToken(wt)) {
        allWordsUnfiltered.push(wt);
      }
      if (hasFttZone && !isInFttZone(w)) continue;
      if (!hasFttZone && isNonFTTToken(wt)) continue;
      candidateWords.push(wt);
    }

    rowWordsMap.set(n, candidateWords);
    rowAllWordsMap.set(n, allWordsUnfiltered);

    // FALLBACK 1: FTT compact matching if ID-based extraction failed
    if (!maneuverMatched) {
      let rowCompact = candidateWords.map((w) => ocrCorrect(w.toLowerCase())).join('').replace(/\s+/g, '');
      rowCompact = rowCompact.replace(/coordinat(?!ed)/gi, 'coordinated');
      rowCompact = rowCompact.replace(/coordinateded/gi, 'coordinated');
      rowCompact = rowCompact.replace(/edturn/gi, 'turn');
      rowCompact = rowCompact.replace(/transitionn/gi, 'transition');
      let bestLen = 0;
      for (const m of maneuverList) {
        const mc = normCompact(m);
        if (mc.length > bestLen && rowCompact.includes(mc)) {
          maneuverMatched = m;
          bestLen = mc.length;
        }
      }
    }

    // FALLBACK 2: Try all words (not just FTT zone) for compact matching
    if (!maneuverMatched && allWordsUnfiltered.length > 0) {
      let rowCompact = allWordsUnfiltered.map((w) => ocrCorrect(w.toLowerCase())).join('').replace(/\s+/g, '');
      rowCompact = rowCompact.replace(/coordinat(?!ed)/gi, 'coordinated');
      rowCompact = rowCompact.replace(/coordinateded/gi, 'coordinated');
      rowCompact = rowCompact.replace(/edturn/gi, 'turn');
      rowCompact = rowCompact.replace(/transitionn/gi, 'transition');
      let bestLen = 0;
      for (const m of maneuverList) {
        const mc = normCompact(m);
        if (mc.length > bestLen && rowCompact.includes(mc)) {
          maneuverMatched = m;
          bestLen = mc.length;
        }
      }
    }

    sorted.push({ testPoint: n, fttRaw: '', maneuverMatched });
  }

  // --- STRATEGY B: ID-based row detection (primary strategy when test point numbers are missing) ---
  // Find all words that look like ID patterns (S-CC5-XXX-NNN or XXX-NNN where XXX is abbreviation)
  if (abbrToManeuver) {
    const idPattern = /^S-\w+-([A-Z]{2,5})-\d+$/i;
    const abbrPattern = /^([A-Z]{2,5})-\d+$/i;
    const knownAbbrs = Object.keys(abbrToManeuver).sort((a, b) => b.length - a.length);
    
    // Group words that form ID patterns by their Y position
    const idRowsMap = new Map<number, { y: number; abbr: string; maneuver: string }>();
    
    for (const w of words) {
      const wt = w.text.trim().toUpperCase();
      let foundAbbr: string | null = null;
      
      // Check full ID pattern: S-CC5-BACH-060
      const fullMatch = wt.match(idPattern);
      if (fullMatch) {
        const abbr = fullMatch[1].toUpperCase();
        if (abbrToManeuver[abbr]) foundAbbr = abbr;
      }
      
      // Check abbreviated pattern: BACH-060, PRT-058
      if (!foundAbbr) {
        const abbrMatch = wt.match(abbrPattern);
        if (abbrMatch) {
          const abbr = abbrMatch[1].toUpperCase();
          if (abbrToManeuver[abbr]) foundAbbr = abbr;
        }
      }
      
      // Check if word starts with known abbreviation followed by hyphen (longest match first)
      if (!foundAbbr) {
        for (const abbr of knownAbbrs) {
          if (wt.startsWith(abbr + '-')) {
            foundAbbr = abbr;
            break;
          }
        }
      }
      
      if (foundAbbr && abbrToManeuver[foundAbbr]) {
        const yBucket = Math.round(w.bbox.y0 / 50) * 50;
        if (!idRowsMap.has(yBucket)) {
          idRowsMap.set(yBucket, { y: w.bbox.y0, abbr: foundAbbr, maneuver: abbrToManeuver[foundAbbr] });
        }
      }
    }
    
    // Sort by Y position
    const idRows = [...idRowsMap.values()].sort((a, b) => a.y - b.y);
    
    // Use ID-based mapping if we found more rows than currently matched
    if (idRows.length > sorted.length) {
      // Find min and max detected test point numbers on this page
      let minDetectedTP = Infinity;
      let maxDetectedTP = 0;
      for (const row of allRows) {
        const leftmost = row[0];
        if (!leftmost) continue;
        const t = leftmost.text.trim().replace(/\.$/, '');
        const n = parseInt(t, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= 100 && String(n) === t) {
          minDetectedTP = Math.min(minDetectedTP, n);
          maxDetectedTP = Math.max(maxDetectedTP, n);
        }
      }
      
      // Decide if this is a first page (starts from 1) or continuation page
      // If we have more ID rows than minDetectedTP-1, it's likely a first page with missed lower TPs
      // Example: 13 rows, min detected is 10 → 13 >= 10, so start from 1
      // Example: 7 rows, min detected is 17 → 7 < 17, so start from 17
      let baseTP: number;
      if (minDetectedTP === Infinity) {
        baseTP = 1;
      } else if (idRows.length >= minDetectedTP) {
        // More rows than min detected suggests first page with some missed detections
        baseTP = 1;
      } else {
        // Fewer rows than min detected suggests continuation page
        baseTP = minDetectedTP;
      }
      
      // Clear existing sorted and rebuild from ID-based detection
      sorted.length = 0;
      
      // Assign TPs starting from baseTP
      for (let i = 0; i < idRows.length; i++) {
        sorted.push({ 
          testPoint: baseTP + i, 
          fttRaw: '', 
          maneuverMatched: idRows[i].maneuver 
        });
      }
    }
  }

  sorted.sort((a, b) => a.testPoint - b.testPoint);

  // Actual TP numbers on this page, in order
  const pageTPNumbers = sorted.map((r) => r.testPoint);

  // --- SEQUENTIAL TEST POINT → MANEUVER MAPPING ---
  // Walks FTT column compact text top-to-bottom, greedily matching the longest maneuver.
  // Only applies when exact count matches page TPs (prevents misalignment from garbled entries).
  if (fttColWordsSaved.length > 0 && pageTPNumbers.length > 0) {
    let corrected = fttColWordsSaved
      .map((w) => {
        let t = w.text.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        t = ocrCorrect(t);
        return t;
      })
      .filter((t) => t.length > 0)
      .join('')
      .replace(/r+oll(?=tracking)/g, 'roll');
    // Post-join corrections for split-word patterns
    corrected = corrected.replace(/coordinat(?!ed)/gi, 'coordinated');
    corrected = corrected.replace(/coordinateded/gi, 'coordinated');
    corrected = corrected.replace(/edturn/gi, 'turn');
    corrected = corrected.replace(/transitionn/gi, 'transition');

    const byLen = [...maneuverList]
      .map((m) => ({ name: m, mc: normCompact(m) }))
      .sort((a, b) => b.mc.length - a.mc.length);

    const seqManeuvers: string[] = [];
    let pos = 0;
    while (pos < corrected.length && seqManeuvers.length < pageTPNumbers.length) {
      let found = false;
      for (const { name, mc } of byLen) {
        if (corrected.startsWith(mc, pos)) {
          seqManeuvers.push(name);
          pos += mc.length;
          found = true;
          break;
        }
      }
      if (!found) pos++;
    }

    if (seqManeuvers.length === pageTPNumbers.length) {
      for (let i = 0; i < seqManeuvers.length; i++) {
        const tp = pageTPNumbers[i];
        const existing = sorted.find((r) => r.testPoint === tp);
        if (existing) {
          existing.maneuverMatched = seqManeuvers[i];
        }
      }
    }
  }

  // --- WORD-OVERLAP FALLBACK with FUZZY matching for unmatched TPs ---
  // Uses edit distance to tolerate OCR character errors (e.g. "pifch" → "pitch").
  // Only matches against uniqueManeuvers (small, validated list) — low false-positive risk.
  function editDist(a: string, b: string): number {
    if (Math.abs(a.length - b.length) > 3) return 99;
    const m = a.length;
    const n = b.length;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const curr = [i];
      for (let j = 1; j <= n; j++) {
        curr[j] = Math.min(
          prev[j] + 1,
          curr[j - 1] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
      }
      prev = curr;
    }
    return prev[n];
  }

  function fuzzyWordMatch(rowWord: string, maneuverWord: string): boolean {
    if (rowWord === maneuverWord) return true;
    if (rowWord.includes(maneuverWord) || maneuverWord.includes(rowWord)) return true;
    if (maneuverWord.length >= 4) return editDist(rowWord, maneuverWord) <= 2;
    if (maneuverWord.length >= 3) return editDist(rowWord, maneuverWord) <= 1;
    return false;
  }

  // --- WORD-OVERLAP FALLBACK ---
  // First pass: match against uniqueManeuvers (validated from FTT scan) with 50% threshold
  // Second pass: match against full maneuverList with 75% threshold (stricter to avoid false positives)
  const stopWords = new Set(['and', 'with', 'the', 'a', 'an', 'of']);
  
  function buildWordSets(maneuvers: readonly string[]) {
    return maneuvers.map((m) => ({
      name: m,
      words: norm(m).split(/\s+/).filter((w) => !stopWords.has(w)),
    }));
  }

  const uniqueWordSets = buildWordSets(uniqueManeuvers);
  const fullWordSets = buildWordSets(maneuverList);

  function tryMatchWords(words: string[], wordSets: { name: string; words: string[] }[], threshold: number): { match: string | null; score: number } {
    const rowLower = words.map((w) => ocrCorrect(w.toLowerCase().replace(/[^a-z]/g, ''))).filter(Boolean);
    let bestMatch: string | null = null;
    let bestScore = 0;
    for (const { name, words: mWords } of wordSets) {
      if (mWords.length === 0) continue;
      let hits = 0;
      for (const mw of mWords) {
        if (rowLower.some((rw) => fuzzyWordMatch(rw, mw))) hits++;
      }
      const score = hits / mWords.length;
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = name;
      }
    }
    return { match: bestMatch, score: bestScore };
  }

  for (const entry of sorted) {
    if (entry.maneuverMatched) continue;
    
    const filteredWords = rowWordsMap.get(entry.testPoint) ?? [];
    const unfilteredWords = rowAllWordsMap.get(entry.testPoint) ?? [];

    let bestMatch: string | null = null;

    // First: try filtered words against uniqueManeuvers with 50% threshold
    if (filteredWords.length > 0) {
      const result = tryMatchWords(filteredWords, uniqueWordSets, 0.5);
      if (result.match) bestMatch = result.match;
    }

    // Second: if no match, try filtered words against full maneuverList with 75% threshold
    if (!bestMatch && filteredWords.length > 0) {
      const result = tryMatchWords(filteredWords, fullWordSets, 0.75);
      if (result.match) bestMatch = result.match;
    }

    // Third: if still no match, try UNFILTERED words against full maneuverList with 75% threshold
    if (!bestMatch && unfilteredWords.length > 0) {
      const result = tryMatchWords(unfilteredWords, fullWordSets, 0.75);
      if (result.match) bestMatch = result.match;
    }

    // Fourth: lower threshold for unfiltered (same maneuvers, some rows just have noisier OCR)
    if (!bestMatch && unfilteredWords.length > 0) {
      const result = tryMatchWords(unfilteredWords, fullWordSets, 0.5);
      if (result.match) bestMatch = result.match;
    }

    if (bestMatch) {
      entry.maneuverMatched = bestMatch;
      continue;
    }

    // Fifth: abbreviation substring scan — any row word containing a known abbr (e.g. "BACH" in "S-CC5-BACH-021")
    if (abbrToManeuver) {
      const rowText = unfilteredWords.join(' ').toUpperCase();
      const knownAbbrs = Object.keys(abbrToManeuver).sort((a, b) => b.length - a.length);
      const ocrToCorrect: Record<string, string> = {
        '8ACH': 'BACH', 'BACI': 'BACH', 'BACN': 'BACH', '8ACN': 'BACH',
        'P7': 'PT', 'PI': 'PT', 'P1': 'PT', 'PR7': 'PRT', 'PRI': 'PRT', 'PR1': 'PRT',
        'C7': 'CT', 'CI': 'CT', 'C1': 'CT',
        'LAAC': 'LACC', 'LAOC': 'LACC', 'LOEC': 'LDEC', 'LOCC': 'LDEC', 'L0EC': 'LDEC',
      };
      for (const abbr of knownAbbrs) {
        if (abbr.length < 2) continue;
        if (rowText.includes(abbr)) {
          entry.maneuverMatched = abbrToManeuver[abbr];
          break;
        }
        for (const [ocrWrong, correctAbbr] of Object.entries(ocrToCorrect)) {
          if (correctAbbr === abbr && rowText.includes(ocrWrong)) {
            entry.maneuverMatched = abbrToManeuver[abbr];
            break;
          }
        }
        if (entry.maneuverMatched) break;
      }
    }
  }

  return { testPointCount, rows: sorted, uniqueManeuvers };
}

export function parseTestCardFromLines(
  lines: OCRLine[],
  maneuverList: readonly string[],
  abbrToManeuver?: Record<string, string>,
): ParsedTestCard {
  const allWords = lines.flat();
  return parseTestCardFromWords(allWords, maneuverList, abbrToManeuver);
}

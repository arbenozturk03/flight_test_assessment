/**
 * Pilot-centric narrative generator for Flight Test Assessment PDF reports.
 *
 * Every sentence uses the pilot as subject. Bold markers use <b>...</b> tags
 * which the PDF renderer parses into jsPDF font-style switches.
 */

/* ─── Types ─────────────────────────────────────────────── */

type Sentiment = 'positive' | 'neutral' | 'negative';

export interface NarrativeItem {
  id: string;
  label: string;
  pdfLabel: string;
  value: number;
  sentiment: Sentiment;
}

export interface MatrixCellData {
  phaseLabel: string;
  pdfLabel: string;
  value: number;
  sentiment: Sentiment;
}

export interface MatrixRowData {
  handlingId: string;
  handlingLabel: string;
  cells: MatrixCellData[];
  overallSentiment: Sentiment;
}

export interface NarrativeInput {
  maneuverName: string;
  tp: number;
  chrValue: number | null;
  pioValue: number | null;
  handlingItems: NarrativeItem[];
  dynamicItems: NarrativeItem[];
  handlingNA: string[];
  dynamicNA: string[];
  comments: Record<string, string>;
  generalComment?: string;
  matrixRows?: MatrixRowData[];
  matrixNACells?: string[];
}

/* ─── Sentiment ─────────────────────────────────────────── */

export function qualitySentiment(value: number): Sentiment {
  if (value <= 2) return 'positive';
  if (value === 3) return 'neutral';
  return 'negative';
}

function chrSentiment(v: number): Sentiment {
  if (v <= 3) return 'positive';
  if (v <= 6) return 'neutral';
  return 'negative';
}

function pioSentiment(v: number): Sentiment {
  if (v <= 2) return 'positive';
  if (v === 3) return 'neutral';
  return 'negative';
}

/* ─── Label maps ────────────────────────────────────────── */

/* ─── Helpers ───────────────────────────────────────────── */

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function phrase(item: NarrativeItem): string {
  return `${item.pdfLabel.toLowerCase()} ${item.label.toLowerCase()}`;
}

function joinList(items: string[], conj = 'and'): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conj} ${items[1]}`;
  return items.slice(0, -1).join(', ') + `, ${conj} ` + items[items.length - 1];
}

function overallClause(cSent: Sentiment | null, pSent: Sentiment | null): string {
  const sents = [cSent, pSent].filter(Boolean) as Sentiment[];
  if (sents.length === 0) return '.';
  const allPos = sents.every((s) => s === 'positive');
  const allNeg = sents.every((s) => s === 'negative');
  if (allPos) return ', indicating satisfactory flying qualities overall.';
  if (allNeg) return ', pointing to significant handling deficiencies that require attention.';
  return ', suggesting a mixed assessment warranting further evaluation.';
}

function buildResultSentence(
  compItem: NarrativeItem | undefined,
  workloadItem: NarrativeItem | undefined,
  trailingTraitSentiment: 'positive' | 'negative' | 'none',
): string {
  const parts: string[] = [];
  if (compItem)
    parts.push(`${compItem.pdfLabel.toLowerCase()} pilot compensation`);
  if (workloadItem)
    parts.push(`${workloadItem.pdfLabel.toLowerCase()} workload`);
  if (parts.length === 0) return '';

  const resultStr = joinList(parts);

  const resultItems = [compItem, workloadItem].filter(Boolean) as NarrativeItem[];
  const allResultPositive = resultItems.every((it) => it.sentiment === 'positive');
  const resultPositive = allResultPositive;

  if (trailingTraitSentiment === 'negative' && resultPositive) {
    return `Despite these issues, the overall maneuver only required ${resultStr}.`;
  }
  if (trailingTraitSentiment === 'negative' && !resultPositive) {
    return `Consequently, these difficulties required ${resultStr}.`;
  }
  if (trailingTraitSentiment === 'positive' && !resultPositive) {
    return `Surprisingly, despite the favorable traits, the maneuver required ${resultStr}.`;
  }
  return `Overall, the maneuver required ${resultStr}.`;
}

/* ─── Matrix (per-cell) section builder ────────────────── */

function mCellDesc(c: MatrixCellData): string {
  return `${c.pdfLabel.toLowerCase()} during ${c.phaseLabel.toLowerCase()}`;
}

function describeRowPhases(cells: MatrixCellData[]): string {
  const good = cells.filter((c) => c.sentiment !== 'negative');
  const bad = cells.filter((c) => c.sentiment === 'negative');

  if (bad.length === 0 || good.length === 0) {
    return joinList(cells.map(mCellDesc));
  }
  return `${joinList(good.map(mCellDesc))}, while it was ${joinList(bad.map(mCellDesc))}`;
}

function buildMatrixResultSentence(
  compRow: MatrixRowData | undefined,
  workloadRow: MatrixRowData | undefined,
  trailingTraitSentiment: 'positive' | 'negative' | 'none',
): string {
  const parts: string[] = [];
  if (compRow && compRow.cells.length > 0)
    parts.push(`pilot compensation was ${describeRowPhases(compRow.cells)}`);
  if (workloadRow && workloadRow.cells.length > 0)
    parts.push(`workload was ${describeRowPhases(workloadRow.cells)}`);
  if (parts.length === 0) return '';

  const allPositive = [compRow, workloadRow]
    .filter(Boolean)
    .every((r) => r!.overallSentiment === 'positive');

  if (trailingTraitSentiment === 'negative' && allPositive) {
    return `Despite these issues, ${parts.join(', while ')}.`;
  }
  if (trailingTraitSentiment === 'negative' && !allPositive) {
    return `Consequently, ${parts.join(', and ')}.`;
  }
  if (trailingTraitSentiment === 'positive' && !allPositive) {
    return `Surprisingly, despite the favorable traits, ${parts.join(', and ')}.`;
  }
  return `Overall, ${parts.join(', while ')}.`;
}

function buildMatrixSection(
  traitRows: MatrixRowData[],
  compRow: MatrixRowData | undefined,
  workloadRow: MatrixRowData | undefined,
): string {
  if (traitRows.length === 0 && !compRow && !workloadRow) return '';

  const sentences: string[] = [];
  let prevNeg: boolean | null = null;
  let ci = 0;

  for (const row of traitRows) {
    if (row.cells.length === 0) continue;

    const curNeg = row.overallSentiment === 'negative';
    const flipped = prevNeg !== null && prevNeg !== curNeg;
    const phaseDesc = describeRowPhases(row.cells);

    if (ci === 0) {
      sentences.push(
        `According to the pilot's assessment, regarding ${row.handlingLabel.toLowerCase()}, performance was rated as ${phaseDesc}.`,
      );
    } else if (flipped && curNeg) {
      sentences.push(
        `${pick(posToNegBridges, ci)}, regarding ${row.handlingLabel.toLowerCase()}, the assessment indicated ${phaseDesc}.`,
      );
    } else if (flipped && !curNeg) {
      sentences.push(
        `${pick(negToPosBridges, ci)}, ${row.handlingLabel.toLowerCase()} was assessed as ${phaseDesc}.`,
      );
    } else {
      sentences.push(
        `${pick(curNeg ? negContinuations : posContinuations, ci)}, ${row.handlingLabel.toLowerCase()} was rated as ${phaseDesc}.`,
      );
    }

    prevNeg = curNeg;
    ci++;
  }

  const trail: 'positive' | 'negative' | 'none' =
    prevNeg === true ? 'negative' : prevNeg === false ? 'positive' : 'none';
  const res = buildMatrixResultSentence(compRow, workloadRow, trail);
  if (res) sentences.push(res);

  return sentences.join(' ');
}

/* ─── Chunking & grammatical helpers ────────────────────── */

function wasWere(count: number): string {
  return count === 1 ? 'was' : 'were';
}


/* ─── Unified sequential section builder ── */

type TaggedItem = { item: NarrativeItem; type: 'handling' | 'dynamic' };

function hPhrase(t: TaggedItem): string {
  return phrase(t.item);
}

function dDescribed(t: TaggedItem): string {
  return `the ${t.item.label.toLowerCase()} was ${t.item.pdfLabel.toLowerCase()}`;
}

const posContinuations = ['Furthermore', 'Additionally', 'Coupled with this'];
const negContinuations = ['Furthermore', 'Additionally'];
const posToNegBridges = ['However', 'Nevertheless', 'On the other hand'];
const negToPosBridges = ['Despite these concerns', 'Nonetheless', 'On the positive side'];

function buildUnifiedSection(
  allItems: TaggedItem[],
  compItem: NarrativeItem | undefined,
  workloadItem: NarrativeItem | undefined,
): string {
  if (allItems.length === 0 && !compItem && !workloadItem) return '';

  const sentences: string[] = [];
  let prevNeg: boolean | null = null;
  let isFirst = true;
  let ci = 0;
  let i = 0;

  while (i < allItems.length) {
    const cur = allItems[i];
    const curNeg = cur.item.sentiment === 'negative';
    const next = allItems[i + 1];
    const canPair = next
      && next.type === cur.type
      && (next.item.sentiment === 'negative') === curNeg;

    const flipped = prevNeg !== null && prevNeg !== curNeg;

    if (canPair) {
      const a = cur, b = next!;
      i += 2;

      if (cur.type === 'dynamic') {
        if (isFirst) {
          sentences.push(`According to the pilot's assessment, ${dDescribed(a)}, while ${dDescribed(b)}.`);
        } else if (flipped && curNeg) {
          sentences.push(`${pick(posToNegBridges, ci)}, ${dDescribed(a)}, and ${dDescribed(b)}.`);
        } else if (flipped && !curNeg) {
          sentences.push(`${pick(negToPosBridges, ci)}, ${dDescribed(a)}, while ${dDescribed(b)}.`);
        } else {
          sentences.push(`${pick(curNeg ? negContinuations : posContinuations, ci)}, ${dDescribed(a)}, and ${dDescribed(b)}.`);
        }
      } else {
        const ww = wasWere(2);
        if (isFirst) {
          sentences.push(`According to the pilot's assessment, ${hPhrase(a)} and ${hPhrase(b)} ${ww} observed.`);
        } else if (flipped && curNeg) {
          sentences.push(`${pick(posToNegBridges, ci)}, difficulties were reported regarding ${hPhrase(a)} and ${hPhrase(b)}.`);
        } else if (flipped && !curNeg) {
          sentences.push(`${pick(negToPosBridges, ci)}, ${hPhrase(a)} and ${hPhrase(b)} ${ww} noted.`);
        } else {
          sentences.push(`${pick(curNeg ? negContinuations : posContinuations, ci)}, ${hPhrase(a)} and ${hPhrase(b)} ${ww} also reported.`);
        }
      }
    } else {
      i += 1;

      if (cur.type === 'dynamic') {
        if (isFirst) {
          sentences.push(`According to the pilot's assessment, ${dDescribed(cur)}.`);
        } else if (flipped && curNeg) {
          sentences.push(`${pick(posToNegBridges, ci)}, the ${cur.item.label.toLowerCase()} was characterized by ${cur.item.pdfLabel.toLowerCase()} response.`);
        } else if (flipped && !curNeg) {
          sentences.push(`${pick(negToPosBridges, ci)}, ${dDescribed(cur)}.`);
        } else {
          sentences.push(`${pick(curNeg ? negContinuations : posContinuations, ci)}, ${dDescribed(cur)}.`);
        }
      } else {
        if (isFirst) {
          sentences.push(`According to the pilot's assessment, ${hPhrase(cur)} was observed.`);
        } else if (flipped && curNeg) {
          sentences.push(`${pick(posToNegBridges, ci)}, difficulties were reported regarding ${hPhrase(cur)}.`);
        } else if (flipped && !curNeg) {
          sentences.push(`${pick(negToPosBridges, ci)}, ${hPhrase(cur)} was noted.`);
        } else {
          sentences.push(`${pick(curNeg ? negContinuations : posContinuations, ci)}, ${hPhrase(cur)} was also reported.`);
        }
      }
    }

    prevNeg = curNeg;
    isFirst = false;
    ci++;
  }

  const trail: 'positive' | 'negative' | 'none' =
    prevNeg === true ? 'negative' : prevNeg === false ? 'positive' : 'none';
  const res = buildResultSentence(compItem, workloadItem, trail);
  if (res) sentences.push(res);

  return sentences.join(' ');
}

/* ─── Main builder ──────────────────────────────────────── */

export function buildNarrative(input: NarrativeInput): string[] {
  const out: string[] = [];
  const comments = input.comments;

  /* ── Part 1 — Assessment paragraph ── */

  if (input.matrixRows && input.matrixRows.length > 0) {
    /* ── Matrix path: per-cell narrative ── */
    const compRow = input.matrixRows.find((r) => r.handlingId === 'pilotCompensation');
    const workloadRow = input.matrixRows.find((r) => r.handlingId === 'workload');
    const traitRows = input.matrixRows.filter(
      (r) => r.handlingId !== 'pilotCompensation' && r.handlingId !== 'workload',
    );

    const para = buildMatrixSection(traitRows, compRow, workloadRow);
    if (para) out.push(para);

    const matrixRemarks = input.matrixRows
      .filter((r) => comments[r.handlingId]?.trim())
      .map((r) => `${r.handlingLabel}: "${comments[r.handlingId].trim()}"`);
    if (matrixRemarks.length > 0) {
      out.push(`The pilot additionally remarked — ${matrixRemarks.join('; ')}.`);
    }

    if (input.matrixNACells && input.matrixNACells.length > 0) {
      out.push(`The following cells were marked N/O (No Observation): ${joinList(input.matrixNACells)}.`);
    }
  } else {
    /* ── Sequential / tree path (existing) ── */
    const trimItem = input.handlingItems.find((i) => i.id === 'trim');
    const handlingNoTrim = input.handlingItems.filter((i) => i.id !== 'trim');
    const workloadItem = handlingNoTrim.find((i) => i.id === 'workload');
    const compItem = handlingNoTrim.find((i) => i.id === 'pilotCompensation');
    const traitItems = handlingNoTrim.filter(
      (i) => i.id !== 'workload' && i.id !== 'pilotCompensation',
    );

    const allItems: TaggedItem[] = [];
    if (trimItem) allItems.push({ item: trimItem, type: 'handling' });
    input.dynamicItems.forEach((item) => allItems.push({ item, type: 'dynamic' }));
    traitItems.forEach((item) => allItems.push({ item, type: 'handling' }));

    if (allItems.length > 0 || workloadItem || compItem) {
      const para = buildUnifiedSection(allItems, compItem, workloadItem);
      if (para) out.push(para);
    }

    const allEvalItems = [
      ...(trimItem ? [trimItem] : []),
      ...input.dynamicItems,
      ...handlingNoTrim,
    ];
    const evalRemarks = allEvalItems
      .filter((i) => comments[i.id]?.trim())
      .map((i) => `${i.label}: "${comments[i.id].trim()}"`);
    if (evalRemarks.length > 0) {
      out.push(`The pilot additionally remarked — ${evalRemarks.join('; ')}.`);
    }

    const allNA = [...input.handlingNA, ...input.dynamicNA];
    if (allNA.length > 0) {
      out.push(`No assessment was provided for ${joinList(allNA)}.`);
    }
  }

  /* ── Part 4 — CHR & PIO Final Ratings ── */

  const ratingParts: string[] = [];
  if (input.chrValue != null) {
    ratingParts.push(`a <b>Cooper-Harper rating of ${input.chrValue}</b>`);
  }
  if (input.pioValue != null) {
    ratingParts.push(`a <b>PIO rating of ${input.pioValue}</b>`);
  }

  if (ratingParts.length > 0) {
    const cSent = input.chrValue != null ? chrSentiment(input.chrValue) : null;
    const pSent = input.pioValue != null ? pioSentiment(input.pioValue) : null;
    const chrCmt = comments.chr?.trim();
    const pioCmt = comments.pio?.trim();

    out.push(`Based on the above observations, the pilot assigned ${ratingParts.join(' and ')}${overallClause(cSent, pSent)}`);

    if (chrCmt || pioCmt) {
      const parts: string[] = [];
      if (chrCmt) parts.push(`on CHR: "${chrCmt}"`);
      if (pioCmt) parts.push(`on PIO: "${pioCmt}"`);
      out.push(`The pilot commented ${joinList(parts)}.`);
    }
  }

  /* ── General comment ── */

  if (input.generalComment?.trim()) {
    out.push(`Furthermore, the pilot stated: "${input.generalComment.trim()}"`);
  }

  return out;
}

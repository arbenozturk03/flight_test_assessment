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

/* ─── Chunking & grammatical helpers ────────────────────── */

function wasWere(count: number): string {
  return count === 1 ? 'was' : 'were';
}

function chunks<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/* ─── Handling: chunked positive sentences (max 2 per sentence) ── */

function posHandlingChunk(items: NarrativeItem[], isFirst: boolean, idx: number): string {
  const ww = wasWere(items.length);

  if (isFirst) {
    if (items.length === 2) {
      return `According to the pilot's assessment, ${phrase(items[0])} and ${phrase(items[1])} ${ww} observed.`;
    }
    return `According to the pilot's assessment, ${phrase(items[0])} was observed.`;
  }

  const transitions = [
    (a: string, b: string) => `Additionally, ${a} was noted alongside ${b}.`,
    (a: string, b: string) => `Furthermore, ${a} and ${b} were also reported.`,
    (a: string, b: string) => `Coupled with this, ${a} was identified along with ${b}.`,
  ];
  const singles = [
    (a: string) => `Additionally, ${a} was also noted.`,
    (a: string) => `Furthermore, ${a} was reported.`,
    (a: string) => `In terms of control qualities, ${a} was also identified.`,
  ];

  if (items.length === 2) {
    return pick(transitions, idx)(phrase(items[0]), phrase(items[1]));
  }
  return pick(singles, idx)(phrase(items[0]));
}

/* ─── Handling: chunked negative sentences ───────────────── */

function negHandlingChunk(items: NarrativeItem[], isFirst: boolean, hasPositiveContext: boolean, idx: number): string {
  const str = joinList(items.map(phrase));
  const ww = wasWere(items.length);

  if (isFirst) {
    if (hasPositiveContext) {
      const bridges = [
        `Nevertheless, difficulties were reported regarding ${str}.`,
        `However, concerns were noted regarding ${str}.`,
        `On the other hand, ${str} ${ww} identified as a deficiency.`,
      ];
      return pick(bridges, idx);
    }
    return `Difficulties were reported regarding ${str}.`;
  }

  const conts = [
    `Coupled with this, ${str} ${ww} also identified as a concern.`,
    `Additionally, ${str} ${ww} noted as a deficiency.`,
  ];
  return pick(conts, idx);
}

/* ─── Dynamic: chunked positive sentences ────────────────── */

function dynPosChunk(items: NarrativeItem[], isFirst: boolean, idx: number): string {
  if (items.length === 2) {
    const a = items[0], b = items[1];
    if (isFirst) {
      return `In the pilot's assessment, the ${a.label.toLowerCase()} was described as ${a.pdfLabel.toLowerCase()}, while the ${b.label.toLowerCase()} was ${b.pdfLabel.toLowerCase()}.`;
    }
    const conts = [
      `Furthermore, the ${a.label.toLowerCase()} was characterized as ${a.pdfLabel.toLowerCase()}, and the ${b.label.toLowerCase()} as ${b.pdfLabel.toLowerCase()}.`,
      `Additionally, the ${a.label.toLowerCase()} phase exhibited ${a.pdfLabel.toLowerCase()} characteristics, while the ${b.label.toLowerCase()} was ${b.pdfLabel.toLowerCase()}.`,
    ];
    return pick(conts, idx);
  }

  const item = items[0];
  if (isFirst) {
    return `In the pilot's assessment, the ${item.label.toLowerCase()} was described as ${item.pdfLabel.toLowerCase()}.`;
  }
  const conts = [
    `Furthermore, the ${item.label.toLowerCase()} phase exhibited ${item.pdfLabel.toLowerCase()} characteristics.`,
    `Additionally, the ${item.label.toLowerCase()} was characterized as ${item.pdfLabel.toLowerCase()}.`,
  ];
  return pick(conts, idx);
}

/* ─── Dynamic: chunked negative sentences ────────────────── */

function dynNegChunk(items: NarrativeItem[], isFirst: boolean, hasPositiveContext: boolean, idx: number): string {
  if (items.length === 2) {
    const a = items[0], b = items[1];
    const opener = isFirst && hasPositiveContext ? 'However' : isFirst ? 'In the pilot\'s assessment' : 'Additionally';
    return `${opener}, the ${a.label.toLowerCase()} was characterized by ${a.pdfLabel.toLowerCase()} response, and the ${b.label.toLowerCase()} by ${b.pdfLabel.toLowerCase()} response.`;
  }

  const item = items[0];
  if (isFirst && hasPositiveContext) {
    return `However, the ${item.label.toLowerCase()} was characterized by ${item.pdfLabel.toLowerCase()} response.`;
  }
  if (isFirst) {
    return `In the pilot's assessment, the ${item.label.toLowerCase()} was characterized by ${item.pdfLabel.toLowerCase()} response.`;
  }
  const conts = [
    `Coupled with this, the ${item.label.toLowerCase()} exhibited ${item.pdfLabel.toLowerCase()} response.`,
    `Additionally, the ${item.label.toLowerCase()} was characterized by ${item.pdfLabel.toLowerCase()} response.`,
  ];
  return pick(conts, idx);
}

/* ─── Section builders (chunked, max 2 traits per sentence) ── */

function buildHandlingSection(
  positive: NarrativeItem[],
  negative: NarrativeItem[],
  compItem: NarrativeItem | undefined,
  workloadItem: NarrativeItem | undefined,
  _seed: number,
): string {
  const sentences: string[] = [];

  const posChunks = chunks(positive, 2);
  posChunks.forEach((ch, i) => {
    sentences.push(posHandlingChunk(ch, i === 0, i));
  });

  const negChunks = chunks(negative, 2);
  negChunks.forEach((ch, i) => {
    sentences.push(negHandlingChunk(ch, i === 0, posChunks.length > 0, i));
  });

  const trailingSentiment: 'positive' | 'negative' | 'none' =
    negChunks.length > 0 ? 'negative' : posChunks.length > 0 ? 'positive' : 'none';

  const resultSentence = buildResultSentence(compItem, workloadItem, trailingSentiment);
  if (resultSentence) sentences.push(resultSentence);

  return sentences.join(' ');
}

function buildDynamicSection(
  positive: NarrativeItem[],
  negative: NarrativeItem[],
  _seed: number,
): string {
  const sentences: string[] = [];

  const posChunks = chunks(positive, 2);
  posChunks.forEach((ch, i) => {
    sentences.push(dynPosChunk(ch, i === 0, i));
  });

  const negChunks = chunks(negative, 2);
  negChunks.forEach((ch, i) => {
    sentences.push(dynNegChunk(ch, i === 0, posChunks.length > 0, i));
  });

  return sentences.join(' ');
}

/* ─── Main builder ──────────────────────────────────────── */

export function buildNarrative(input: NarrativeInput): string[] {
  const out: string[] = [];
  const seed = input.tp;
  const comments = input.comments;

  /* ── Part 1 — Executive Summary ── */

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

    let exec = `The pilot evaluated the ${input.maneuverName} maneuver with ${ratingParts.join(' and ')}${overallClause(cSent, pSent)}`;
    out.push(exec);

    if (chrCmt || pioCmt) {
      const parts: string[] = [];
      if (chrCmt) parts.push(`on CHR: "${chrCmt}"`);
      if (pioCmt) parts.push(`on PIO: "${pioCmt}"`);
      out.push(`The pilot commented ${joinList(parts)}.`);
    }
  }

  /* ── Part 2 — Handling Qualities ── */

  const workloadItem = input.handlingItems.find((i) => i.id === 'workload');
  const compItem = input.handlingItems.find((i) => i.id === 'pilotCompensation');
  const traitItems = input.handlingItems.filter(
    (i) => i.id !== 'workload' && i.id !== 'pilotCompensation',
  );

  if (traitItems.length > 0 || workloadItem || compItem) {
    const pos = traitItems.filter((i) => i.sentiment !== 'negative');
    const neg = traitItems.filter((i) => i.sentiment === 'negative');
    const para = buildHandlingSection(pos, neg, compItem, workloadItem, seed);
    if (para) out.push(para);
  }

  const handlingRemarks = input.handlingItems
    .filter((i) => comments[i.id]?.trim())
    .map((i) => `${i.label}: "${comments[i.id].trim()}"`);
  if (handlingRemarks.length > 0) {
    out.push(`The pilot additionally remarked — ${handlingRemarks.join('; ')}.`);
  }

  if (input.handlingNA.length > 0) {
    out.push(`No assessment was provided for ${joinList(input.handlingNA)}.`);
  }

  /* ── Part 3 — Maneuver-Specific Dynamics ── */

  if (input.dynamicItems.length > 0) {
    const pos = input.dynamicItems.filter((i) => i.sentiment !== 'negative');
    const neg = input.dynamicItems.filter((i) => i.sentiment === 'negative');
    const para = buildDynamicSection(pos, neg, seed + 1);
    if (para) out.push(para);

    const dynRemarks = input.dynamicItems
      .filter((i) => comments[i.id]?.trim())
      .map((i) => `${i.label}: "${comments[i.id].trim()}"`);
    if (dynRemarks.length > 0) {
      out.push(`The pilot additionally remarked — ${dynRemarks.join('; ')}.`);
    }
  }

  if (input.dynamicNA.length > 0) {
    out.push(`No assessment was provided for ${joinList(input.dynamicNA)}.`);
  }

  /* ── General comment ── */

  if (input.generalComment?.trim()) {
    out.push(`Furthermore, the pilot stated: "${input.generalComment.trim()}"`);
  }

  return out;
}

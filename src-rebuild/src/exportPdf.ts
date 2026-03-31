/** PDF generated offline (jsPDF local, no CDN). doc.save() triggers download to device Downloads/Files. */
import jsPDF from 'jspdf';
import type { Evaluation, Evaluations } from './types';
import { HANDLING_CRITERIA, getManeuverCriteria, createDefaultEvaluation, resolvePdfLabel } from './data';
import { buildNarrative, qualitySentiment } from './utils/narrativeBuilder';
import type { NarrativeItem } from './utils/narrativeBuilder';

interface ExportOptions {
  flightTestNumber: string;
  selectedFTEs: string[];
  selectedTPs: string[];
  maneuverPool: string[];
  testPointCount: number;
  evaluations: Evaluations;
  completed: number[];
  cancelled: number[];
  startTime: Date;
  endTime: Date;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Transliterate Turkish chars to ASCII for PDF (Helvetica compatibility) */
function toPdfSafe(str: string): string {
  const map: Record<string, string> = {
    ğ: 'g', Ğ: 'G', ü: 'u', Ü: 'U', ş: 's', Ş: 'S',
    ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ç: 'c', Ç: 'C',
  };
  return String(str ?? '').replace(/[ğüşöçıİĞÜŞÖÇ]/g, (c) => map[c] ?? c);
}

export function exportToPdf({
  flightTestNumber,
  selectedFTEs,
  selectedTPs,
  maneuverPool,
  testPointCount,
  evaluations,
  completed,
  cancelled,
  startTime,
  endTime,
}: ExportOptions) {
  const allTps = Array.from({ length: testPointCount }, (_, i) => i + 1);

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const filename = `Flight Test Assessment Form ${dd}.${mm}.${yy}.pdf`;

  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  const lineH = 5;
  const fontSize = 6;

  const dynHeaderOrder: { id: string; label: string }[] = [];
  const seen = new Set<string>();
  allTps.forEach((tp) => {
    const maneuver = evaluations[tp]?.maneuver ?? null;
    getManeuverCriteria(maneuver).forEach((c) => {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        dynHeaderOrder.push({ id: c.id, label: c.label });
      }
    });
  });
  const maxDynCols = dynHeaderOrder.length;
  const dynHeaders = dynHeaderOrder.map((c) => c.label);

  const trimCriterion = HANDLING_CRITERIA.find((c) => c.id === 'trim')!;
  const handlingWithoutTrim = HANDLING_CRITERIA.filter((c) => c.id !== 'trim');

  const headers = [
    'Test Point',
    'Maneuver',
    trimCriterion.label,
    ...dynHeaders,
    ...handlingWithoutTrim.map((c) => c.label),
    'CHR',
    'PIO',
  ];
  const colCount = headers.length;
  const colW = (pageW - 2 * margin) / colCount;

  const trimIdx = 2;
  const dynStartIdx = 3;
  const dynEndIdx = 3 + maxDynCols - 1;
  const handlingStartIdx = dynEndIdx + 1;
  const handlingEndIdx = handlingStartIdx + handlingWithoutTrim.length - 1;
  const chrIdx = handlingEndIdx + 1;
  const pioIdx = chrIdx + 1;

  const wrapText = (text: string, width: number): string[] =>
    doc.splitTextToSize(String(text ?? 'N/A'), width - 2);

  const maxRowHeight = (cells: string[]): number => {
    let maxLines = 1;
    cells.forEach((cell) => {
      const lines = wrapText(cell, colW);
      if (lines.length > maxLines) maxLines = lines.length;
    });
    return Math.max(7, maxLines * lineH + 2);
  };

  const drawCell = (
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    bold = false,
    textRGB?: [number, number, number],
  ) => {
    doc.setFontSize(fontSize);
    const parts = text.split('\n');
    const maxLines = Math.floor(h / lineH);
    let lineIdx = 0;
    parts.forEach((part, i) => {
      const isSubHeader = parts.length > 1 && i === 0;
      doc.setFont('helvetica', bold || isSubHeader ? 'bold' : 'normal');
      if (textRGB) doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
      const wrapped = doc.splitTextToSize(part, w - 2);
      wrapped.slice(0, maxLines - lineIdx).forEach((line: string) => {
        if (lineIdx >= maxLines) return;
        if (textRGB) doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
        doc.text(line, x + 1, y + 4 + lineIdx * lineH);
        lineIdx++;
      });
    });
  };

  const drawRow = (cells: string[], y: number, h: number, bold = false, boldFirstCol = false) => {
    let x = margin;
    cells.forEach((cell, idx) => {
      const isTestPointOrManeuver = idx === 0 || idx === 1;
      const isTrim = idx === trimIdx;
      const isDynamic = idx >= dynStartIdx && idx <= dynEndIdx;
      const isHandling = idx >= handlingStartIdx && idx <= handlingEndIdx;
      const isPioChr = idx === pioIdx || idx === chrIdx;

      const isActionPhase = isTrim || isDynamic;

      if (isTestPointOrManeuver) {
        doc.setFillColor(248, 249, 250);
      } else if (isActionPhase) {
        doc.setFillColor(210, 215, 220);
      } else if (isHandling) {
        doc.setFillColor(173, 181, 189);
      } else if (isPioChr) {
        doc.setFillColor(95, 103, 112);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(x, y, colW, h, 'F');

      doc.setDrawColor(isPioChr ? 50 : 90);
      doc.setLineWidth(0.3);
      doc.rect(x, y, colW, h);

      const textRGB: [number, number, number] = isPioChr ? [255, 255, 255] : [30, 30, 30];
      doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
      const isBold = bold || (boldFirstCol && idx === 0) || isPioChr;
      drawCell(cell, x, y, colW, h, isBold, textRGB);
      x += colW;
    });
    doc.setTextColor(0, 0, 0);
  };

  const drawVerticalHeaderRow = (cells: string[], y: number, h: number) => {
    let x = margin;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');
    cells.forEach((cell, idx) => {
      const isTestPointOrManeuver = idx === 0 || idx === 1;
      const isTrim = idx === trimIdx;
      const isDynamic = idx >= dynStartIdx && idx <= dynEndIdx;
      const isHandling = idx >= handlingStartIdx && idx <= handlingEndIdx;
      const isPioChr = idx === pioIdx || idx === chrIdx;

      const isActionPhase = isTrim || isDynamic;

      if (isTestPointOrManeuver) {
        doc.setFillColor(233, 236, 239);
      } else if (isActionPhase) {
        doc.setFillColor(178, 186, 194);
      } else if (isHandling) {
        doc.setFillColor(134, 142, 150);
      } else if (isPioChr) {
        doc.setFillColor(75, 83, 92);
      } else {
        doc.setFillColor(240, 240, 240);
      }
      doc.rect(x, y, colW, h, 'F');

      doc.setDrawColor(isPioChr ? 40 : 90);
      doc.setLineWidth(0.3);
      doc.rect(x, y, colW, h);

      const hdrTextRGB: [number, number, number] = (isPioChr || isHandling) ? [255, 255, 255] : [20, 20, 20];
      doc.setTextColor(hdrTextRGB[0], hdrTextRGB[1], hdrTextRGB[2]);
      doc.saveGraphicsState();
      doc.setTextColor(hdrTextRGB[0], hdrTextRGB[1], hdrTextRGB[2]);
      const textX = x + colW / 2 + 1.5;
      const textY = y + h - 2;
      doc.text(cell, textX, textY, { angle: 90, maxWidth: h - 4 });
      doc.restoreGraphicsState();
      x += colW;
    });
  };

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Flight Test Assessment Form', margin, 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const pdf = (s: string) => toPdfSafe(s);
  const ftStr = flightTestNumber ? `Test No: ${pdf(flightTestNumber)}` : '';
  const fteStr = selectedFTEs.length > 0 ? `FTE: ${pdf(selectedFTEs.join(', '))}` : '';
  const tpStr = selectedTPs.length > 0 ? `TP: ${pdf(selectedTPs.join(', '))}` : '';
  const totalStr = `Total Test Points: ${testPointCount}`;
  const dateStr = `Date: ${dd}.${mm}.${yy}`;

  const line2Parts = [ftStr, fteStr, tpStr, totalStr, dateStr].filter(Boolean);
  doc.text(line2Parts.join('  |  '), margin, 14);

  const durationMs = endTime.getTime() - startTime.getTime();
  doc.text(
    `Start: ${fmtTime(startTime)}  |  End: ${fmtTime(endTime)}  |  Duration: ${fmtDuration(durationMs)}  |  Completed: ${completed.length}  |  Cancelled: ${cancelled.length}`,
    margin,
    18,
  );

  const maneuverText = doc.splitTextToSize(
    'Maneuvers: ' + maneuverPool.join(', '),
    pageW - 2 * margin,
  );
  doc.text(maneuverText, margin, 22);

  let curY = 24 + maneuverText.length * 6 + 2;

  // Header row with vertical text
  const headerH = 25;
  drawVerticalHeaderRow(headers, curY, headerH);
  curY += headerH;

  // Data rows
  allTps.forEach((tp) => {
    const tpData = evaluations[tp];
    const isCancelled = cancelled.includes(tp);
    const cancelledVal = 'C';

    const ev: Evaluation = tpData?.evaluation || createDefaultEvaluation();
    const maneuverName = tpData?.maneuver || null;
    const dynCriteria = getManeuverCriteria(maneuverName);
    const comments = tpData?.comments ?? {};
    const generalComment = tpData?.generalComment ?? '';

    const dynValById = new Map<string, string>();
    dynCriteria.forEach((c) => {
      const val = isCancelled ? cancelledVal : resolvePdfLabel(c, ev[c.id]);
      dynValById.set(c.id, val);
    });

    const dynCells: string[] = [];
    for (let i = 0; i < maxDynCols; i++) {
      const h = dynHeaderOrder[i];
      if (h && dynValById.has(h.id)) {
        dynCells.push(dynValById.get(h.id)!);
      } else {
        dynCells.push(isCancelled ? cancelledVal : '—');
      }
    }

    const trimCell = isCancelled ? cancelledVal : resolvePdfLabel(trimCriterion, ev[trimCriterion.id as keyof Evaluation]);

    const cells = [
      String(tp),
      maneuverName || 'N/A',
      trimCell,
      ...dynCells,
      ...handlingWithoutTrim.map((c) => {
        if (isCancelled) return cancelledVal;
        return resolvePdfLabel(c, ev[c.id as keyof Evaluation]);
      }),
      isCancelled ? cancelledVal : String(ev.chr ?? 'N/A'),
      isCancelled ? cancelledVal : String(ev.pio ?? 'N/A'),
    ];

    const rowH = maxRowHeight(cells);

    if (curY + rowH > pageH - margin) {
      doc.addPage('l');
      curY = margin;
      drawVerticalHeaderRow(headers, curY, headerH);
      curY += headerH;
    }

    drawRow(cells, curY, rowH, false, true);
    curY += rowH;

    const labelX = margin;
    const labelW = colW * 1.5;
    const commentX = margin + labelW;
    const commentW = pageW - 2 * margin - labelW;

    // Criterion comments (before General Comment)
    const criterionLabelMap = new Map<string, string>([
      ['chr', 'CHR'],
      ['pio', 'PIO'],
      ...HANDLING_CRITERIA.map((c) => [c.id, c.label] as const),
      ...dynHeaderOrder.map((c) => [c.id, c.label] as const),
    ]);
    const criterionCommentEntries = Object.entries(comments).filter(
      ([, text]) => typeof text === 'string' && text.trim() !== ''
    );
    
    // Combine all comments into one section
    const allCommentLines: string[] = [];
    
    criterionCommentEntries.forEach(([id, text]) => {
      const label = criterionLabelMap.get(id) ?? id;
      const line = `${label}: ${String(text).trim()}`;
      const wrapped = doc.splitTextToSize(line, commentW - 2);
      allCommentLines.push(...wrapped);
    });
    
    if (generalComment?.trim()) {
      const line = `General Comment: ${generalComment.trim()}`;
      const wrapped = doc.splitTextToSize(line, commentW - 2);
      allCommentLines.push(...wrapped);
    }
    
    if (allCommentLines.length > 0 && !isCancelled) {
      const commentH = Math.max(6, allCommentLines.length * lineH + 2);

      if (curY + commentH > pageH - margin) {
        doc.addPage('l');
        curY = margin;
      }
      
      // Left label box: "All Comments:"
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'bold');
      doc.setDrawColor(180);
      doc.rect(labelX, curY, labelW, commentH);
      doc.text('All Comments:', labelX + 1, curY + 4);
      
      // Right content box: actual comments
      doc.setFont('helvetica', 'normal');
      doc.rect(commentX, curY, commentW, commentH);
      allCommentLines.forEach((line: string, i: number) => {
        doc.text(line, commentX + 1, curY + 4 + i * lineH);
      });
      
      curY += commentH;
    }
  });

  // ── Narrative Summary Section ──
  doc.addPage('l');
  curY = margin;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Narrative Summary', margin, curY + 5);
  curY += 12;

  const narFontSize = 8;
  const narLineH = 4.5;
  const narWidth = pageW - 2 * margin;

  interface RichSegment { text: string; bold: boolean }

  /** Parse "<b>bold</b> normal" into segments */
  const parseRichText = (raw: string): RichSegment[] => {
    const segs: RichSegment[] = [];
    const re = /<b>(.*?)<\/b>/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      if (m.index > last) segs.push({ text: raw.slice(last, m.index), bold: false });
      segs.push({ text: m[1], bold: true });
      last = m.index + m[0].length;
    }
    if (last < raw.length) segs.push({ text: raw.slice(last), bold: false });
    return segs;
  };

  /** Split segments into words preserving bold attribute */
  const segmentsToWords = (segs: RichSegment[]): RichSegment[] => {
    const words: RichSegment[] = [];
    for (const seg of segs) {
      for (const part of seg.text.split(/( +)/)) {
        if (part) words.push({ text: part, bold: seg.bold });
      }
    }
    return words;
  };

  /**
   * Render a paragraph with inline <b> bold support.
   * Words are laid out left-to-right, wrapping at narWidth,
   * switching jsPDF font style per-word.
   */
  const writeNarrativeParagraph = (text: string) => {
    const safeText = toPdfSafe(text);
    const segments = parseRichText(safeText);
    const words = segmentsToWords(segments);

    // Estimate height: measure plain text line count for page-break logic
    const plain = safeText.replace(/<\/?b>/g, '');
    const estLines: string[] = doc.splitTextToSize(plain, narWidth);
    const blockH = estLines.length * narLineH + 2;

    if (curY + blockH > pageH - margin) {
      doc.addPage('l');
      curY = margin;
    }

    let curX = margin;
    curY += narLineH;

    for (const w of words) {
      doc.setFontSize(narFontSize);
      doc.setFont('helvetica', w.bold ? 'bold' : 'normal');
      const wW = doc.getTextWidth(w.text);

      if (curX + wW > margin + narWidth && curX > margin) {
        curX = margin;
        curY += narLineH;

        if (curY > pageH - margin) {
          doc.addPage('l');
          curY = margin + narLineH;
        }
      }

      doc.text(w.text, curX, curY);
      curX += wW;
    }

    curY += 2;
  };

  const writeNarrativeHeading = (text: string) => {
    const safeText = toPdfSafe(text);
    if (curY + 10 > pageH - margin) {
      doc.addPage('l');
      curY = margin;
    }
    doc.setFontSize(narFontSize + 1);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText, margin, curY + narLineH);
    curY += narLineH + 1;

    doc.setDrawColor(160);
    doc.setLineWidth(0.3);
    doc.line(margin, curY, margin + narWidth, curY);
    curY += 3;
  };

  allTps.forEach((tp) => {
    const tpData = evaluations[tp];
    const isCancelled = cancelled.includes(tp);
    const ev: Evaluation = tpData?.evaluation || createDefaultEvaluation();
    const maneuverName = tpData?.maneuver || 'N/A';
    const dynCriteria = getManeuverCriteria(tpData?.maneuver ?? null);
    const comments = tpData?.comments ?? {};
    const generalComment = tpData?.generalComment ?? '';

    writeNarrativeHeading(`Test Point ${tp} — ${maneuverName}${isCancelled ? ' (Cancelled)' : ''}`);

    if (isCancelled) {
      curY += 3;
      return;
    }

    const pioVal = ev.pio != null ? Number(ev.pio) : null;
    const chrVal = ev.chr != null ? Number(ev.chr) : null;

    const toNarrItem = (c: { id: string; label: string; pdfLabels?: Record<string, string> }, raw: string | number | null | undefined): NarrativeItem | null => {
      if (raw == null || String(raw) === 'N/A') return null;
      const v = Number(raw);
      const pdfLabel = c.pdfLabels?.[String(raw)] ?? String(raw);
      return { id: c.id, label: c.label, pdfLabel, value: v, sentiment: qualitySentiment(v) };
    };

    const handlingItems: NarrativeItem[] = [];
    const handlingNA: string[] = [];
    HANDLING_CRITERIA.forEach((c) => {
      const item = toNarrItem(c, ev[c.id as keyof Evaluation]);
      if (item) handlingItems.push(item);
      else handlingNA.push(c.label);
    });

    const dynamicItems: NarrativeItem[] = [];
    const dynamicNA: string[] = [];
    dynCriteria.forEach((c) => {
      const item = toNarrItem(c, ev[c.id]);
      if (item) dynamicItems.push(item);
      else dynamicNA.push(c.label);
    });

    const paragraphs = buildNarrative({
      maneuverName,
      tp,
      chrValue: chrVal,
      pioValue: pioVal,
      handlingItems,
      dynamicItems,
      handlingNA,
      dynamicNA,
      comments,
      generalComment,
    });

    paragraphs.forEach((p) => writeNarrativeParagraph(p));
    curY += 3;
  });

  doc.save(filename);
}

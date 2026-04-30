/** PDF generated offline (jsPDF local, no CDN). doc.save() triggers download to device Downloads/Files. */
import jsPDF from 'jspdf';
import type { Evaluation, Evaluations } from './types';
import {
  HANDLING_CRITERIA,
  getManeuverCriteria,
  createDefaultEvaluation,
  resolvePdfLabel,
  MATRIX_HANDLING_ORDER,
  MATRIX_SEP,
  isMatrixGridPresentation,
  getHandlingEvalMode,
} from './data';
import { buildNarrative, qualitySentiment } from './utils/narrativeBuilder';
import type { NarrativeItem, MatrixRowData, MatrixCellData } from './utils/narrativeBuilder';

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
  /** Flight terminated early via "Abort & Save"; affects the output filename suffix. */
  aborted?: boolean;
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
  aborted = false,
}: ExportOptions) {
  const allTps = Array.from({ length: testPointCount }, (_, i) => i + 1);

  const dd = String(endTime.getDate()).padStart(2, '0');
  const mm = String(endTime.getMonth() + 1).padStart(2, '0');
  const yyyy = String(endTime.getFullYear());
  const yy = yyyy.slice(-2);
  const flightToken =
    String(flightTestNumber ?? '')
      .trim()
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'FLT';
  const statusToken = aborted ? 'ABORTED' : 'INT';
  // Filename format: <FlightTestNo>_<dd.mm.yyyy>_<INT|ABORTED>.pdf
  const filename = `${flightToken}_${dd}.${mm}.${yyyy}_${statusToken}.pdf`;

  // When aborted, untouched/incomplete test points are treated as cancelled
  // (so the report shows "C" instead of "N/A" for them).
  const isCancelledTp = (tp: number): boolean =>
    cancelled.includes(tp) || (aborted && !completed.includes(tp));

  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  const lineH = 5;
  const fontSize = 6;

  const orderedHandling = MATRIX_HANDLING_ORDER
    .map((id) => HANDLING_CRITERIA.find((c) => c.id === id)!)
    .filter(Boolean);

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
  const effectiveCancelledCount = allTps.filter((tp) => isCancelledTp(tp)).length;
  const statusLine = aborted ? '  |  Status: ABORTED' : '';
  doc.text(
    `Start: ${fmtTime(startTime)}  |  End: ${fmtTime(endTime)}  |  Duration: ${fmtDuration(durationMs)}  |  Completed: ${completed.length}  |  Cancelled: ${effectiveCancelledCount}${statusLine}`,
    margin,
    18,
  );

  const maneuverText = doc.splitTextToSize(
    'Maneuvers: ' + maneuverPool.join(', '),
    pageW - 2 * margin,
  );
  doc.text(maneuverText, margin, 22);

  let curY = 24 + maneuverText.length * 6 + 2;

  const tableW = pageW - 2 * margin;
  const rowH = 7;
  const headerH = 8;

  // ── Build classic (non-matrix) column headers for TPs that use old format ──
  const dynHeaderOrder: { id: string; label: string }[] = [];
  const seenDyn = new Set<string>();
  allTps.forEach((tp) => {
    const mn = evaluations[tp]?.maneuver ?? null;
    const td = evaluations[tp];
    if (isMatrixGridPresentation(mn, getHandlingEvalMode(td))) return;
    getManeuverCriteria(mn).forEach((c) => {
      if (!seenDyn.has(c.id)) { seenDyn.add(c.id); dynHeaderOrder.push({ id: c.id, label: c.label }); }
    });
  });
  const maxDynCols = dynHeaderOrder.length;
  const trimCriterion = HANDLING_CRITERIA.find((c) => c.id === 'trim')!;
  const handlingWithoutTrim = HANDLING_CRITERIA.filter((c) => c.id !== 'trim');

  const classicHeaders = [
    'Test Point', 'Maneuver', trimCriterion.label,
    ...dynHeaderOrder.map((c) => c.label),
    ...handlingWithoutTrim.map((c) => c.label),
    'CHR', 'PIO',
  ];
  const classicColCount = classicHeaders.length;
  const classicColW = (pageW - 2 * margin) / classicColCount;

  const cTrimIdx = 2;
  const cDynStart = 3;
  const cDynEnd = 3 + maxDynCols - 1;
  const cHandStart = cDynEnd + 1;
  const cHandEnd = cHandStart + handlingWithoutTrim.length - 1;
  const cChrIdx = cHandEnd + 1;
  const cPioIdx = cChrIdx + 1;

  const wrapText = (text: string, width: number): string[] =>
    doc.splitTextToSize(String(text ?? 'N/A'), width - 2);

  const maxRowHeightClassic = (cells: string[]): number => {
    let maxLines = 1;
    cells.forEach((cell) => { const l = wrapText(cell, classicColW); if (l.length > maxLines) maxLines = l.length; });
    return Math.max(7, maxLines * lineH + 2);
  };

  const drawClassicCell = (text: string, x: number, y: number, w: number, h: number, bold = false, textRGB?: [number, number, number]) => {
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

  const drawClassicRow = (cells: string[], y: number, h: number, bold = false, boldFirstCol = false) => {
    let x = margin;
    cells.forEach((cell, idx) => {
      const isIdent = idx === 0 || idx === 1;
      const isTrim = idx === cTrimIdx;
      const isDyn = idx >= cDynStart && idx <= cDynEnd;
      const isHand = idx >= cHandStart && idx <= cHandEnd;
      const isPioChr = idx === cPioIdx || idx === cChrIdx;
      const isAction = isTrim || isDyn;

      if (isIdent) doc.setFillColor(248, 249, 250);
      else if (isAction) doc.setFillColor(210, 215, 220);
      else if (isHand) doc.setFillColor(173, 181, 189);
      else if (isPioChr) doc.setFillColor(95, 103, 112);
      else doc.setFillColor(255, 255, 255);
      doc.rect(x, y, classicColW, h, 'F');
      doc.setDrawColor(isPioChr ? 50 : 90);
      doc.setLineWidth(0.3);
      doc.rect(x, y, classicColW, h);
      const textRGB: [number, number, number] = isPioChr ? [255, 255, 255] : [30, 30, 30];
      const isBold = bold || (boldFirstCol && idx === 0) || isPioChr;
      drawClassicCell(cell, x, y, classicColW, h, isBold, textRGB);
      x += classicColW;
    });
    doc.setTextColor(0, 0, 0);
  };

  const drawClassicVerticalHeader = (cells: string[], y: number, h: number) => {
    let x = margin;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');
    cells.forEach((cell, idx) => {
      const isIdent = idx === 0 || idx === 1;
      const isTrim = idx === cTrimIdx;
      const isDyn = idx >= cDynStart && idx <= cDynEnd;
      const isHand = idx >= cHandStart && idx <= cHandEnd;
      const isPioChr = idx === cPioIdx || idx === cChrIdx;
      const isAction = isTrim || isDyn;

      if (isIdent) doc.setFillColor(233, 236, 239);
      else if (isAction) doc.setFillColor(178, 186, 194);
      else if (isHand) doc.setFillColor(134, 142, 150);
      else if (isPioChr) doc.setFillColor(75, 83, 92);
      else doc.setFillColor(240, 240, 240);
      doc.rect(x, y, classicColW, h, 'F');
      doc.setDrawColor(isPioChr ? 40 : 90);
      doc.setLineWidth(0.3);
      doc.rect(x, y, classicColW, h);
      const hdrRGB: [number, number, number] = (isPioChr || isHand) ? [255, 255, 255] : [20, 20, 20];
      doc.setTextColor(hdrRGB[0], hdrRGB[1], hdrRGB[2]);
      doc.saveGraphicsState();
      doc.setTextColor(hdrRGB[0], hdrRGB[1], hdrRGB[2]);
      doc.text(cell, x + classicColW / 2 + 1.5, y + h - 2, { angle: 90, maxWidth: h - 4 });
      doc.restoreGraphicsState();
      x += classicColW;
    });
  };

  const isClassicPresentationTp = (tp: number) => {
    const td = evaluations[tp];
    return getHandlingEvalMode(td) !== 'matrix';
  };
  const isMatrixPresentationTp = (tp: number) => {
    const td = evaluations[tp];
    return isMatrixGridPresentation(td?.maneuver ?? null, getHandlingEvalMode(td));
  };

  const classicHeaderH = 25;
  /** False after a matrix block; next classic TP redraws the vertical header (new table run). */
  let classicTableOpen = false;

  // ── Classic rows + matrix grids: Test Point 1, 2, … N ──
  for (const tp of allTps) {
    if (isClassicPresentationTp(tp) && maxDynCols > 0) {
      if (!classicTableOpen) {
        if (curY + classicHeaderH > pageH - margin) {
          doc.addPage('l');
          curY = margin;
        }
        drawClassicVerticalHeader(classicHeaders, curY, classicHeaderH);
        curY += classicHeaderH;
        classicTableOpen = true;
      }

      const tpData = evaluations[tp];
      const isCancelled = isCancelledTp(tp);
      const cancelledVal = 'C';
      const ev: Evaluation = tpData?.evaluation || createDefaultEvaluation();
      const mn = tpData?.maneuver || null;
      const dynCriteria = getManeuverCriteria(mn);
      const comments = tpData?.comments ?? {};
      const generalComment = tpData?.generalComment ?? '';

      const dynValById = new Map<string, string>();
      dynCriteria.forEach((c) => {
        dynValById.set(c.id, isCancelled ? cancelledVal : resolvePdfLabel(c, ev[c.id]));
      });
      const dynCells: string[] = [];
      for (let i = 0; i < maxDynCols; i++) {
        const h = dynHeaderOrder[i];
        if (h && dynValById.has(h.id)) dynCells.push(dynValById.get(h.id)!);
        else dynCells.push(isCancelled ? cancelledVal : '—');
      }

      const cells = [
        String(tp),
        mn || 'N/A',
        isCancelled ? cancelledVal : resolvePdfLabel(trimCriterion, ev[trimCriterion.id as keyof Evaluation]),
        ...dynCells,
        ...handlingWithoutTrim.map((c) => isCancelled ? cancelledVal : resolvePdfLabel(c, ev[c.id as keyof Evaluation])),
        isCancelled ? cancelledVal : String(ev.chr ?? 'N/A'),
        isCancelled ? cancelledVal : String(ev.pio ?? 'N/A'),
      ];

      const rH = maxRowHeightClassic(cells);
      if (curY + rH > pageH - margin) {
        doc.addPage('l');
        curY = margin;
        drawClassicVerticalHeader(classicHeaders, curY, classicHeaderH);
        curY += classicHeaderH;
      }
      drawClassicRow(cells, curY, rH, false, true);
      curY += rH;

      if (!isCancelled) {
        const commentW = pageW - 2 * margin;
        const labelW = classicColW * 1.5;
        const commentX = margin + labelW;
        const cW = commentW - labelW;
        const criterionLabelMap = new Map<string, string>([
          ['chr', 'CHR'], ['pio', 'PIO'],
          ...HANDLING_CRITERIA.map((c) => [c.id, c.label] as const),
          ...dynHeaderOrder.map((c) => [c.id, c.label] as const),
        ]);
        const allCommentLines: string[] = [];
        Object.entries(comments)
          .filter(([, text]) => typeof text === 'string' && text.trim() !== '')
          .forEach(([id, text]) => {
            const lbl = criterionLabelMap.get(id) ?? id;
            allCommentLines.push(...doc.splitTextToSize(`${lbl}: ${String(text).trim()}`, cW - 2));
          });
        if (generalComment?.trim()) allCommentLines.push(...doc.splitTextToSize(`General: ${generalComment.trim()}`, cW - 2));

        if (allCommentLines.length > 0) {
          const commentH = Math.max(6, allCommentLines.length * lineH + 2);
          if (curY + commentH > pageH - margin) { doc.addPage('l'); curY = margin; }
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', 'bold');
          doc.setDrawColor(180);
          doc.rect(margin, curY, labelW, commentH);
          doc.text('All Comments:', margin + 1, curY + 4);
          doc.setFont('helvetica', 'normal');
          doc.rect(commentX, curY, cW, commentH);
          allCommentLines.forEach((line: string, i: number) => { doc.text(line, commentX + 1, curY + 4 + i * lineH); });
          curY += commentH;
        }
      }
      continue;
    }

    if (!isMatrixPresentationTp(tp)) continue;

    classicTableOpen = false;

    const tpData = evaluations[tp];
    const isCancelled = isCancelledTp(tp);
    const ev: Evaluation = tpData?.evaluation || createDefaultEvaluation();
    const maneuverName = tpData?.maneuver || null;
    const phases = getManeuverCriteria(maneuverName);
    const comments = tpData?.comments ?? {};
    const generalComment = tpData?.generalComment ?? '';

    const labelColW = tableW * 0.28;
    const dataColW = (tableW - labelColW) / phases.length;

    const matrixHeight = headerH + orderedHandling.length * rowH + rowH + 4;
    if (curY + matrixHeight > pageH - margin) { doc.addPage('l'); curY = margin; }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Test Point ${tp} — ${maneuverName || 'N/A'}${isCancelled ? ' (Cancelled)' : ''}`, margin, curY + 4);
    curY += 7;

    if (isCancelled) {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 50, 50);
      doc.text('This test point was cancelled.', margin, curY + 3);
      doc.setTextColor(0, 0, 0);
      curY += 8;
      continue;
    }

    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
    doc.text(`CHR: ${ev.chr ?? 'N/A'}   |   PIO: ${ev.pio ?? 'N/A'}`, margin, curY + 3);
    doc.setTextColor(0, 0, 0); curY += 6;

    let x = margin;
    doc.setFillColor(55, 62, 68);
    doc.rect(x, curY, labelColW, headerH, 'F');
    doc.setDrawColor(90); doc.setLineWidth(0.2);
    doc.rect(x, curY, labelColW, headerH);
    x += labelColW;
    phases.forEach((phase) => {
      doc.setFillColor(55, 62, 68);
      doc.rect(x, curY, dataColW, headerH, 'F');
      doc.setDrawColor(90); doc.rect(x, curY, dataColW, headerH);
      doc.setFontSize(fontSize); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      const tw = doc.getTextWidth(phase.label);
      doc.text(phase.label, x + dataColW / 2 - tw / 2, curY + 5.5);
      x += dataColW;
    });
    curY += headerH;

    orderedHandling.forEach((criterion, rIdx) => {
      x = margin;
      const bgShade = rIdx % 2 === 0 ? 245 : 235;
      doc.setFillColor(bgShade, bgShade, bgShade);
      doc.rect(x, curY, labelColW, rowH, 'F');
      doc.setDrawColor(180); doc.setLineWidth(0.15); doc.rect(x, curY, labelColW, rowH);
      doc.setFontSize(fontSize); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
      doc.text(criterion.label, x + 2, curY + 5);
      x += labelColW;
      phases.forEach((phase) => {
        const val = ev[`${criterion.id}${MATRIX_SEP}${phase.id}`];
        const label = val != null ? resolvePdfLabel(criterion, val) : 'N/O';
        doc.setFillColor(bgShade, bgShade, bgShade);
        doc.rect(x, curY, dataColW, rowH, 'F');
        doc.setDrawColor(180); doc.rect(x, curY, dataColW, rowH);
        doc.setFontSize(fontSize); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
        const tw = doc.getTextWidth(label);
        doc.text(label, x + dataColW / 2 - tw / 2, curY + 5);
        x += dataColW;
      });
      curY += rowH;
    });

    // Matrix comments
    const commentW = tableW;
    const allCommentLines: string[] = [];
    const criterionLabelMap = new Map<string, string>([['chr', 'CHR'], ['pio', 'PIO'], ...HANDLING_CRITERIA.map((c) => [c.id, c.label] as const)]);
    Object.entries(comments)
      .filter(([, text]) => typeof text === 'string' && text.trim() !== '')
      .forEach(([id, text]) => {
        const lbl = criterionLabelMap.get(id) ?? id;
        allCommentLines.push(...doc.splitTextToSize(`${lbl}: ${String(text).trim()}`, commentW - 4));
      });
    if (generalComment?.trim()) allCommentLines.push(...doc.splitTextToSize(`General: ${generalComment.trim()}`, commentW - 4));
    if (allCommentLines.length > 0) {
      const commentBlockH = Math.max(6, allCommentLines.length * lineH + 2);
      if (curY + commentBlockH > pageH - margin) { doc.addPage('l'); curY = margin; }
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, curY, commentW, commentBlockH, 'F');
      doc.setDrawColor(180); doc.rect(margin, curY, commentW, commentBlockH);
      doc.setFontSize(fontSize); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      allCommentLines.forEach((line: string, i: number) => { doc.text(line, margin + 2, curY + 4 + i * lineH); });
      curY += commentBlockH;
    }
    curY += 4;
  }

  if (classicTableOpen) curY += 4;

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
    const isCancelled = isCancelledTp(tp);
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
    const dynamicItems: NarrativeItem[] = [];
    const dynamicNA: string[] = [];
    let matrixRows: MatrixRowData[] | undefined;
    let matrixNACells: string[] | undefined;

    if (isMatrixGridPresentation(tpData?.maneuver ?? null, getHandlingEvalMode(tpData))) {
      matrixRows = [];
      matrixNACells = [];
      HANDLING_CRITERIA.forEach((c) => {
        const cells: MatrixCellData[] = [];
        dynCriteria.forEach((p) => {
          const raw = ev[`${c.id}${MATRIX_SEP}${p.id}`];
          if (raw != null && String(raw) !== 'N/A') {
            const v = Number(raw);
            cells.push({
              phaseLabel: p.label,
              pdfLabel: c.pdfLabels?.[String(raw)] ?? String(raw),
              value: v,
              sentiment: qualitySentiment(v),
            });
          } else {
            matrixNACells!.push(`${c.label} – ${p.label}`);
          }
        });
        if (cells.length > 0) {
          const avg = cells.reduce((s, cl) => s + cl.value, 0) / cells.length;
          matrixRows!.push({
            handlingId: c.id,
            handlingLabel: c.label,
            cells,
            overallSentiment: qualitySentiment(Math.round(avg)),
          });
        }
      });
      if (matrixNACells.length === 0) matrixNACells = undefined;
    } else {
      HANDLING_CRITERIA.forEach((c) => {
        const item = toNarrItem(c, ev[c.id as keyof Evaluation]);
        if (item) handlingItems.push(item); else handlingNA.push(c.label);
      });
      dynCriteria.forEach((c) => {
        const item = toNarrItem(c, ev[c.id]);
        if (item) dynamicItems.push(item); else dynamicNA.push(c.label);
      });
    }

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
      matrixRows,
      matrixNACells,
    });

    paragraphs.forEach((p) => writeNarrativeParagraph(p));
    curY += 3;
  });

  doc.save(filename);
}

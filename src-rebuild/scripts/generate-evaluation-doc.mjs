/**
 * Generates a single Word document with all evaluation headings and words
 * (Ortak + Özel değerlendirme başlıkları ve kelimeleri).
 * Run from src-rebuild: node scripts/generate-evaluation-doc.mjs
 */

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle } from 'docx';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HANDLING_CRITERIA = [
  { label: 'Control Harmony', pdfLabels: { '5': 'Fully Harmonious', '3': 'Adequate', '1': 'Disconnected' } },
  { label: 'Predictability', pdfLabels: { '5': 'Fully Transparent', '3': 'Expected', '1': 'Inconsistent' } },
  { label: 'Pilot Compensation', pdfLabels: { '5': 'Minimal', '3': 'Moderate', '1': 'Considerable' } },
  { label: 'Workload', pdfLabels: { '5': 'Tolerable', '3': 'Extensive', '1': 'Intolerable' } },
  { label: 'Stick Forces', pdfLabels: { '5': 'Harmonious', '3': 'Low', '1': 'High' } },
  { label: 'Characteristic', pdfLabels: { '5': 'Ideal', '3': 'Insufficient', '1': 'Excessive' } },
  { label: 'Trim', pdfLabels: { '5': 'Effortless', '3': 'Manageable', '1': 'Compensation' } },
];

const DEFAULT_DYNAMIC = [
  { label: 'Initiation', pdfLabels: { '5': 'Harmonious', '3': 'Light', '1': 'Fatiguing' } },
  { label: 'Capture', pdfLabels: { '5': 'Deadbeat', '3': 'Underdamped', '1': 'Oscillatory' } },
  { label: 'Hold', pdfLabels: { '5': 'Locked-in', '3': 'Hesitant', '1': 'Demanding Workload' } },
  { label: 'Roll Out', pdfLabels: { '5': 'On-target', '3': 'Undershoot', '1': 'Overshoot' } },
];

const DYNAMIC_CRITERIA_MAP = {
  'Bank Angle Capture and Hold': [
    { label: 'Initiation', pdfLabels: { '5': 'Harmonious', '3': 'Light', '1': 'Fatiguing' } },
    { label: 'Capture', pdfLabels: { '5': 'Deadbeat', '3': 'Underdamped', '1': 'Oscillatory' } },
    { label: 'Hold', pdfLabels: { '5': 'Locked-in', '3': 'Hesitant', '1': 'Demanding Workload' } },
    { label: 'Roll Out', pdfLabels: { '5': 'Target', '3': 'Undershoot', '1': 'Overshoot' } },
  ],
  'Pitch and Roll Tracking': [
    { label: 'Gross Acquisition', pdfLabels: { '5': 'Steady', '3': 'Sluggish', '1': 'Abrupt' } },
    { label: 'Fine Tracking', pdfLabels: { '5': 'Pinpoint Precision', '3': 'Drifting', '1': 'Jumpy' } },
    { label: 'Dynamic Tracking', pdfLabels: { '5': 'Stays with Target', '3': 'Falls Behind Target', '1': 'Too Aggressive' } },
    { label: 'Task Termination', pdfLabels: { '5': 'Smooth', '3': 'Moderate', '1': 'Harsh' } },
  ],
  'Coordinated Turn': [
    { label: 'Initiation', pdfLabels: { '5': 'Harmonious', '3': 'Light', '1': 'Fatiguing' } },
    { label: 'Capture', pdfLabels: { '5': 'Deadbeat', '3': 'Underdamped', '1': 'Oscillatory' } },
    { label: 'Hold', pdfLabels: { '5': 'Center', '3': 'Slip Tendency', '1': 'Skid Tendency' } },
    { label: 'Roll Out Heading Capture', pdfLabels: { '5': 'Target', '3': 'Undershoot', '1': 'Overshoot' } },
  ],
  'Pitch Angle Capture and Hold': [
    { label: 'Initiation', pdfLabels: { '5': 'Harmonious', '3': 'Too Light', '1': 'Heavy' } },
    { label: 'Capture', pdfLabels: { '5': 'Deadbeat', '3': 'Underdamped', '1': 'Oscillatory' } },
    { label: 'Hold', pdfLabels: { '5': 'Locked-in', '3': 'Hesitant', '1': 'Demanding Workload' } },
    { label: 'Recovery', pdfLabels: { '5': 'Smooth', '3': 'Moderate', '1': 'Harsh' } },
  ],
  'Pitch Tracking': [
    { label: 'Gross Acquisition', pdfLabels: { '5': 'Natural', '3': 'Unpredictable', '1': 'Too Aggressive' } },
    { label: 'Fine Tracking', pdfLabels: { '5': 'Precise', '3': 'Undershoot', '1': 'Jumpy' } },
    { label: 'Dynamic Tracking', pdfLabels: { '5': 'Stays with Target', '3': 'Falls Behind Target', '1': 'Too Aggressive' } },
    { label: 'Task Termination', pdfLabels: { '5': 'Smooth', '3': 'Moderate', '1': 'Harsh' } },
  ],
  'Level Acceleration': [
    { label: 'Power Application', pdfLabels: { '5': 'Neutral', '3': 'Left Yaw', '1': 'Right Yaw' } },
    { label: 'Dynamic Acceleration', pdfLabels: { '5': 'Manageable', '3': 'Unpredictable', '1': 'Heavy Rudder' } },
    { label: 'Target Speed Capture', pdfLabels: { '5': 'Predictable', '3': 'Slow', '1': 'Abrupt' } },
    { label: 'High Speed Stabilization', pdfLabels: { '5': 'Easy', '3': 'Difficult', '1': 'Sensitive' } },
  ],
  'Level Deceleration': [
    { label: 'High Speed Stabilization', pdfLabels: { '5': 'Easy', '3': 'Difficult', '1': 'Sensitive' } },
    { label: 'Initiation', pdfLabels: { '5': 'Predictable', '3': 'Very Slow', '1': 'Abrupt' } },
    { label: 'Dynamic Deceleration', pdfLabels: { '5': 'Manageable', '3': 'Unpredictable', '1': 'Heavy Rudder' } },
    { label: 'Target Speed Capture', pdfLabels: { '5': 'Predictable', '3': 'Slow', '1': 'Abrupt' } },
  ],
  'Inverted Flight': [
    { label: 'Roll Initiation', pdfLabels: { '5': 'Moderate', '3': 'Slow', '1': 'Abrupt' } },
    { label: 'Inverted Capture', pdfLabels: { '5': 'Holds', '3': 'Sinks', '1': 'Over-Push' } },
    { label: 'Steady State', pdfLabels: { '5': 'Stable', '3': 'Neutrally', '1': 'Divergent' } },
    { label: 'Control Effectiveness', pdfLabels: { '5': 'Effective', '3': 'Sluggish', '1': 'Sensitive' } },
    { label: 'Recovery', pdfLabels: { '5': 'Symmetric to Entry', '3': 'Slower than Entry', '1': 'Faster than Entry' } },
  ],
  'Landing Gear Transition': [
    { label: 'Initiation', pdfLabels: { '5': 'None', '3': 'Nose Drop', '1': 'Nose Up' } },
    { label: 'Claw Transition', pdfLabels: { '5': 'Ideal', '3': 'Insufficient', '1': 'Excessive' } },
    { label: 'Transient in Pitch Change', pdfLabels: { '5': 'Manageable', '3': 'Slow', '1': 'Abrupt' } },
    { label: 'Stabilization (Speed)', pdfLabels: { '5': 'Expected Drag', '3': 'Massive Drag', '1': 'Minimal Drag' } },
  ],
  '1-G Stabilized Push Over': [
    { label: 'Push Over Initiation', pdfLabels: { '5': 'Proportional', '3': 'Light', '1': 'Heavy' } },
    { label: 'Target Capture', pdfLabels: { '5': 'Deadbeat', '3': 'Oscillates', '1': 'Hard Stop' } },
    { label: 'Dive', pdfLabels: { '5': 'Proportional', '3': 'Sluggish', '1': 'Abrupt' } },
    { label: 'Recovery Pull Force', pdfLabels: { '5': 'Symmetric to Push', '3': 'Lighter than Push', '1': 'Heavier than Push' } },
  ],
};

function heading(text) {
  return new Paragraph({
    text,
    heading: 'Heading1',
    spacing: { before: 360, after: 180 },
  });
}

function subheading(text) {
  return new Paragraph({
    text,
    heading: 'Heading2',
    spacing: { before: 280, after: 140 },
  });
}

function criteriaTable(criteriaList) {
  const headerRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Değerlendirme başlığı', bold: true })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '5 (en iyi)', bold: true })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '3 (orta)', bold: true })] })] }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '1 (en kötü)', bold: true })] })] }),
    ],
    tableHeader: true,
  });
  const rows = criteriaList.map((c) =>
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(c.label)] }),
        new TableCell({ children: [new Paragraph(c.pdfLabels['5'] || '')] }),
        new TableCell({ children: [new Paragraph(c.pdfLabels['3'] || '')] }),
        new TableCell({ children: [new Paragraph(c.pdfLabels['1'] || '')] }),
      ],
    })
  );
  return new Table({
    columnWidths: [2500, 2800, 2800, 2800],
    rows: [headerRow, ...rows],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
  });
}

const sections = [
  new Paragraph({
    children: [new TextRun({ text: 'Değerlendirme Başlıkları ve Kelimeleri', bold: true, size: 32 })],
    alignment: 'CENTER',
    spacing: { after: 400 },
  }),
  heading('1. Ortak değerlendirme başlıkları (Handling)'),
  new Paragraph({
    text: 'Tüm manevralarda kullanılan 7 ortak kriter ve her puan (5, 3, 1) için karşılık gelen kelimeler.',
    spacing: { after: 200 },
  }),
  criteriaTable(HANDLING_CRITERIA),
  new Paragraph({ text: '', spacing: { after: 200 } }),
  heading('2. Varsayılan özel kriterler'),
  new Paragraph({
    text: 'Özel kriteri tanımlı olmayan manevralar için kullanılan varsayılan 4 kriter.',
    spacing: { after: 200 },
  }),
  criteriaTable(DEFAULT_DYNAMIC),
  new Paragraph({ text: '', spacing: { after: 200 } }),
  heading('3. Manevraya özel değerlendirme başlıkları'),
];

for (const [maneuverName, criteria] of Object.entries(DYNAMIC_CRITERIA_MAP)) {
  sections.push(subheading(maneuverName));
  sections.push(criteriaTable(criteria));
  sections.push(new Paragraph({ text: '', spacing: { after: 120 } }));
}

sections.push(
  new Paragraph({
    text: 'Not: 360 Roll, Barrel Roll, Pull Up, Push Over, Roll Doublet, Yaw Doublet, Spiral, Steady Heading Sideslip, Trimmability, Wind Up Turn, Offset Landing, Speed Brake Operation, Lateral Acceleration, Bank Angle Capture, Claw Mode Transition gibi manevralar için özel kriter tanımlı değildir; bu manevralarda yukarıdaki varsayılan 4 kriter (Initiation, Capture, Hold, Roll Out) kullanılır.',
    italics: true,
    spacing: { before: 240, after: 200 },
  })
);

const doc = new Document({
  sections: [
    {
      properties: {},
      children: sections,
    },
  ],
});

const outPath = join(__dirname, '..', '..', 'Degerlendirme_Basliklari_ve_Kelimeleri.docx');
const buf = await Packer.toBuffer(doc);
writeFileSync(outPath, buf);
console.log('Word belgesi oluşturuldu:', outPath);

/**
 * Generates RTF document with all evaluation headings and words.
 * Properly encodes Turkish characters as RTF Unicode escapes.
 * Run: node scripts/generate-evaluation-rtf.mjs
 */

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

// RTF Unicode encoding: chars > 127 become \uN? where N is the code point
function rtfEncode(s) {
  if (!s) return '';
  let out = '';
  for (const ch of String(s)) {
    const code = ch.codePointAt(0);
    if (code > 127) {
      const signed = code > 32767 ? code - 65536 : code;
      out += '\\u' + signed + '?';
    } else if (ch === '\\') {
      out += '\\\\';
    } else if (ch === '{') {
      out += '\\{';
    } else if (ch === '}') {
      out += '\\}';
    } else {
      out += ch;
    }
  }
  return out;
}

// Column edges in twips (cumulative right edge)
const C1 = 3200;
const C2 = 5700;
const C3 = 8200;
const C4 = 10700;

// Border spec for all cell edges
const BORDERS =
  '\\clbrdrt\\brdrs\\brdrw10' +
  '\\clbrdrb\\brdrs\\brdrw10' +
  '\\clbrdrl\\brdrs\\brdrw10' +
  '\\clbrdrr\\brdrs\\brdrw10';

function rowDef() {
  return '\\trowd\\trleft0\\trgaph80'
    + BORDERS + '\\cellx' + C1
    + BORDERS + '\\cellx' + C2
    + BORDERS + '\\cellx' + C3
    + BORDERS + '\\cellx' + C4
    + '\n';
}

function headerCell(text) {
  return '{\\pard\\intbl\\ql\\b\\fs20 ' + rtfEncode(text) + '\\b0\\cell}';
}

function dataCell(text) {
  return '{\\pard\\intbl\\ql\\fs20 ' + rtfEncode(text) + '\\cell}';
}

function rtfTable(criteriaList) {
  let out = '';
  // Header
  out += rowDef();
  out += headerCell('Degerlendirme Basligi');
  out += headerCell('5 (en iyi)');
  out += headerCell('3 (orta)');
  out += headerCell('1 (en kotu)');
  out += '\\row\n';
  // Data
  for (const c of criteriaList) {
    out += rowDef();
    out += dataCell(c.label);
    out += dataCell(c.pdfLabels['5'] || '');
    out += dataCell(c.pdfLabels['3'] || '');
    out += dataCell(c.pdfLabels['1'] || '');
    out += '\\row\n';
  }
  return out;
}

function title(text) {
  return '{\\pard\\qc\\sb200\\sa200\\b\\fs32 ' + rtfEncode(text) + '\\b0\\par}\n';
}

function heading1(text) {
  return '{\\pard\\sb300\\sa100\\b\\fs26 ' + rtfEncode(text) + '\\b0\\par}\n';
}

function heading2(text) {
  return '{\\pard\\sb200\\sa80\\b\\fs22 ' + rtfEncode(text) + '\\b0\\par}\n';
}

function bodyText(text) {
  return '{\\pard\\sa80\\fs20 ' + rtfEncode(text) + '\\par}\n';
}

// --- Build RTF ---

let rtf = '{\\rtf1\\ansi\\deff0\\uc1\n';
rtf += '{\\fonttbl{\\f0\\fswiss Calibri;}{\\f1\\fswiss Arial;}}\n';
rtf += '{\\colortbl;\\red0\\green0\\blue0;\\red70\\green70\\blue70;}\n';
rtf += '\\f0\\fs20\\cf1\n\n';

rtf += title('Degerlendirme Basliklari ve Kelimeleri');

// Section 1
rtf += heading1('1. Ortak Degerlendirme Basliklari (Handling)');
rtf += bodyText('Tum manevralarda kullanilan 7 ortak kriter ve her puan (5, 3, 1) icin karsilik gelen kelimeler.');
rtf += rtfTable(HANDLING_CRITERIA);
rtf += '{\\pard\\par}\n';

// Section 2
rtf += heading1('2. Varsayilan Ozel Kriterler');
rtf += bodyText('Ozel kriteri tanimli olmayan manevralar icin kullanilan varsayilan 4 kriter.');
rtf += rtfTable(DEFAULT_DYNAMIC);
rtf += '{\\pard\\par}\n';

// Section 3
rtf += heading1('3. Manevraya Ozel Degerlendirme Basliklari');
for (const [maneuverName, criteria] of Object.entries(DYNAMIC_CRITERIA_MAP)) {
  rtf += heading2(maneuverName);
  rtf += rtfTable(criteria);
}

// Note
rtf += '{\\pard\\sb200\\sa100\\i\\fs18 ' + rtfEncode(
  'Not: 360 Roll, Barrel Roll, Pull Up, Push Over, Roll Doublet, Yaw Doublet, Spiral, ' +
  'Steady Heading Sideslip, Trimmability, Wind Up Turn, Offset Landing, Speed Brake Operation, ' +
  'Lateral Acceleration, Bank Angle Capture, Claw Mode Transition gibi manevralar icin ozel kriter ' +
  'tanimli degildir; bu manevralarda yukaridaki varsayilan 4 kriter (Initiation, Capture, Hold, Roll Out) kullanilir.'
) + '\\i0\\par}\n';

rtf += '}\n';

const outPath = join(__dirname, '..', '..', 'Degerlendirme_Basliklari_v2.rtf');
writeFileSync(outPath, rtf, 'ascii');
console.log('RTF belgesi olusturuldu:', outPath);

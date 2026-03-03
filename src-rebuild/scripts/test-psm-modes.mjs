import { createWorker, PSM } from 'tesseract.js';

const img = process.argv[2];
if (!img) { console.error('Usage: node test-psm-modes.mjs <image>'); process.exit(1); }

const MANEUVERS = [
  'Bank Angle Capture and Hold', 'Pitch and Roll Tracking',
  'Landing Gear Transition', 'Level Acceleration', 'Level Deceleration',
];

function normCompact(s) { return s.trim().toLowerCase().replace(/\s+/g, ''); }

for (const mode of [PSM.AUTO, PSM.SINGLE_BLOCK, PSM.SPARSE_TEXT]) {
  const modeName = mode === PSM.AUTO ? 'AUTO(3)' : mode === PSM.SINGLE_BLOCK ? 'SINGLE_BLOCK(6)' : 'SPARSE_TEXT(11)';
  const worker = await createWorker('eng');
  await worker.setParameters({ tessedit_pageseg_mode: mode });
  const { data } = await worker.recognize(img, {}, { blocks: true });

  const allWords = [];
  data.blocks?.forEach(b => b.paragraphs?.forEach(p => p.lines?.forEach(l => l.words?.forEach(w =>
    allWords.push({ text: w.text, bbox: w.bbox })
  ))));

  // Find FTT header
  const fttVar = ['ftt', 'ft', 'f.t.t', 'ffi', 'ett', 'fit'];
  let fttWord = null;
  for (const w of allWords) {
    const wt = w.text.trim().toLowerCase().replace(/[^a-z.]/g, '');
    if (fttVar.includes(wt)) { fttWord = w; break; }
  }

  // Collect FTT column words if header found
  let fttText = '';
  if (fttWord) {
    const fttMidY = (fttWord.bbox.y0 + fttWord.bbox.y1) / 2;
    const fttH = fttWord.bbox.y1 - fttWord.bbox.y0;
    const yTol = Math.max(fttH * 0.75, 10);
    const hdrWords = allWords
      .filter(w => Math.abs((w.bbox.y0 + w.bbox.y1) / 2 - fttMidY) < yTol && w.text.trim().length > 1 && w.text.trim() !== '|')
      .sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const idx = hdrWords.indexOf(fttWord);
    const left = idx > 0 ? hdrWords[idx - 1].bbox.x1 : fttWord.bbox.x0;
    let right = fttWord.bbox.x1 * 3;
    for (let i = idx + 1; i < hdrWords.length; i++) {
      if (hdrWords[i].bbox.x0 > fttWord.bbox.x1 + 5) { right = hdrWords[i].bbox.x0; break; }
    }
    const fttColWords = allWords
      .filter(w => {
        if (w.bbox.y0 < fttWord.bbox.y1) return false;
        const mx = (w.bbox.x0 + w.bbox.x1) / 2;
        return mx >= left && mx <= right;
      })
      .sort((a, b) => a.bbox.y0 - b.bbox.y0);
    fttText = fttColWords.map(w => w.text.trim().toLowerCase()).join('').replace(/\s+/g, '');
  }

  // Check ID column for abbreviation codes
  const codes = ['BACH', 'PRT', 'LGT', 'LACC', 'LDEC'];
  const codeHits = [];
  for (const w of allWords) {
    const up = w.text.toUpperCase();
    for (const c of codes) {
      if (up.includes(c)) codeHits.push(`${c} in "${w.text}"`);
    }
  }

  // Count maneuver matches in FTT compact
  const matches = MANEUVERS.filter(m => fttText.includes(normCompact(m)));

  // Test point count
  const heights = allWords.map(w => w.bbox.y1 - w.bbox.y0).filter(h => h > 0);
  const medH = [...heights].sort((a, b) => a - b)[Math.floor(heights.length / 2)] || 10;
  const gap = Math.max(1, medH * 0.15);
  const sorted = [...allWords].sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const rows = []; let cur = [], lb = -9999;
  for (const w of sorted) { if (cur.length && w.bbox.y0 - lb > gap) { rows.push(cur.sort((a,b) => a.bbox.x0 - b.bbox.x0)); cur = []; } cur.push(w); lb = Math.max(lb, w.bbox.y1); }
  if (cur.length) rows.push(cur.sort((a,b) => a.bbox.x0 - b.bbox.x0));
  let tpCount = 0;
  for (const r of rows) { const t = r[0]?.text.trim().replace(/\.$/, ''); const n = parseInt(t,10); if (!isNaN(n) && n>=1 && n<=100 && String(n)===t) tpCount = Math.max(tpCount,n); }

  console.log(`\n=== ${modeName} ===`);
  console.log(`Words: ${allWords.length}, FTT header: ${fttWord ? '"' + fttWord.text + '"' : 'none'}`);
  console.log(`FTT compact (first 100): ${fttText.substring(0, 100)}`);
  console.log(`Maneuver matches: ${matches.length} - ${matches.join(', ') || 'none'}`);
  console.log(`ID code hits: ${codeHits.length} - ${codeHits.join(', ') || 'none'}`);
  console.log(`Test point count: ${tpCount}`);
  await worker.terminate();
}

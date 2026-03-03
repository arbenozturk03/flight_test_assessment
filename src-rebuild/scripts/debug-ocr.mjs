import { createWorker, PSM } from 'tesseract.js';

const MANEUVER_LIST = [
  '1-G Stabilized Push Over', '360 Roll', 'Bank Angle Capture',
  'Bank Angle Capture and Hold', 'Barrel Roll', 'Claw Mode Transition',
  'Coordinated Turn', 'Inverted Flight', 'Inverted Flight with Pull Up',
  'Lateral Acceleration', 'Landing Gear Transition', 'Level Acceleration',
  'Level Deceleration', 'Offset Landing', 'Pitch Angle Capture and Hold',
  'Pitch and Roll Tracking', 'Pitch Doublet', 'Pitch Tracking',
  'Pull Up', 'Push Over', 'Roll Doublet', 'Speed Brake Operation',
  'Spiral', 'Steady Heading Sideslip', 'Trimmability', 'Wind Up Turn', 'Yaw Doublet',
];

function norm(s) { return s.trim().toLowerCase().replace(/\s+/g, ' '); }
function normCompact(s) { return norm(s).replace(/\s/g, ''); }

async function ocrImage(imagePath) {
  let worker;
  try {
    worker = await createWorker('eng');
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const { data } = await worker.recognize(imagePath, {}, { blocks: true });

    const allWords = [];
    data.blocks?.forEach((block) =>
      block.paragraphs?.forEach((para) =>
        para.lines?.forEach((line) =>
          line.words?.forEach((w) =>
            allWords.push({ text: w.text, bbox: w.bbox }),
          ),
        ),
      ),
    );
    console.log(`Total words: ${allWords.length}`);

    let fttColLeft = -1, fttColRight = -1, headerYBottom = 0;
    let strategy = 'none';

    // Strategy 1: Look for FTT header
    const fttVariations = ['ftt', 'ft', 'f.t.t', 'f.t.t.', 'ffi', 'ett', 'fit'];
    let fttHeaderWord = null;
    for (const w of allWords) {
      const wt = w.text.trim().toLowerCase().replace(/[^a-z.]/g, '');
      if (fttVariations.includes(wt)) { fttHeaderWord = w; break; }
    }

    if (fttHeaderWord) {
      const fttMidY = (fttHeaderWord.bbox.y0 + fttHeaderWord.bbox.y1) / 2;
      const fttH = fttHeaderWord.bbox.y1 - fttHeaderWord.bbox.y0;
      const yTol = Math.max(fttH * 0.75, 10);
      const hdrWords = allWords
        .filter(w => {
          if (Math.abs((w.bbox.y0 + w.bbox.y1) / 2 - fttMidY) >= yTol) return false;
          const t = w.text.trim();
          return t.length > 1 && t !== '|';
        })
        .sort((a, b) => a.bbox.x0 - b.bbox.x0);
      const fttIdx = hdrWords.indexOf(fttHeaderWord);
      fttColLeft = fttIdx > 0 ? hdrWords[fttIdx - 1].bbox.x1 : fttHeaderWord.bbox.x0;
      let nextRight = null;
      for (let i = fttIdx + 1; i < hdrWords.length; i++) {
        if (hdrWords[i].bbox.x0 > fttHeaderWord.bbox.x1 + 5) { nextRight = hdrWords[i]; break; }
      }
      fttColRight = nextRight ? nextRight.bbox.x0 : fttHeaderWord.bbox.x1 * 3;
      headerYBottom = fttHeaderWord.bbox.y1;
      strategy = `Strategy 1 (FTT="${fttHeaderWord.text}")`;
      console.log(`Header row words: ${hdrWords.map(w => `"${w.text}"[${w.bbox.x0}]`).join(', ')}`);
    }

    // Strategy 2: Known headers
    if (fttColLeft < 0) {
      const isKnownHdr = (t) => {
        const exact = ['id', 'airspeed', 'altitude', 'lg', 'engine', 'tp#', 'tp'];
        if (exact.includes(t)) return true;
        if (/^airsp/.test(t) || /^altit/.test(t)) return true;
        return false;
      };
      const headerHits = allWords.filter(w => isKnownHdr(w.text.trim().toLowerCase()));
      if (headerHits.length >= 2) {
        strategy = 'Strategy 2 (known headers)';
        // ... (same logic as Strategy 2 in the app)
      }
    }

    // Strategy 3: Structural detection
    if (fttColLeft < 0) {
      const numPattern = /^\d{3,6}/;
      const numWords = allWords.filter(w => numPattern.test(w.text.trim()));
      if (numWords.length >= 3) {
        const xBuckets = new Map();
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
            w => Math.abs(Math.round(w.bbox.x0 / 20) * 20 - targetBucket) <= 20,
          );
          const rightBound = Math.min(...colNums.map(w => w.bbox.x0));
          const maxX = Math.max(...allWords.map(w => w.bbox.x1));
          fttColLeft = maxX * 0.14;
          fttColRight = rightBound;
          const topNum = colNums.reduce((a, b) => a.bbox.y0 < b.bbox.y0 ? a : b);
          headerYBottom = topNum.bbox.y0;
          strategy = `Strategy 3 (structural, numbers at x≈${targetBucket})`;
        }
      }
    }

    console.log(`Strategy: ${strategy}`);
    console.log(`FTT column: [${Math.round(fttColLeft)}, ${Math.round(fttColRight)}], headerYBottom=${headerYBottom}`);

    if (fttColLeft >= 0 && fttColRight > fttColLeft) {
      const fttColWords = allWords
        .filter(w => {
          if (w.bbox.y0 < headerYBottom) return false;
          const wMidX = (w.bbox.x0 + w.bbox.x1) / 2;
          return wMidX >= fttColLeft && wMidX <= fttColRight;
        })
        .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);

      console.log(`\nFTT column words (${fttColWords.length}):`);
      fttColWords.forEach(w => console.log(`  "${w.text}" x=[${w.bbox.x0},${w.bbox.x1}] y=${w.bbox.y0}`));

      const correctedTokens = fttColWords.map(w => {
        let t = w.text.trim().toLowerCase().replace(/[^a-z]/g, '');
        if (t === 'pich') t = 'pitch';
        if (t === 'oll' || t === 'rroll') t = 'roll';
        return t;
      }).filter(t => t.length > 0);
      let corrected = correctedTokens.join('').replace(/r+oll(?=tracking)/g, 'roll');
      console.log(`\nCorrected compact: ${corrected}`);

      // Unique maneuvers
      const candidates = [];
      for (const m of MANEUVER_LIST) {
        if (corrected.includes(normCompact(m))) candidates.push(m);
      }
      const unique = candidates.filter(m => {
        const mN = norm(m);
        return !candidates.some(o => o !== m && norm(o).length > mN.length && norm(o).includes(mN));
      });
      console.log(`\nUnique maneuvers: ${unique.join(', ')}`);

      // Test point count
      const heights = allWords.map(w => w.bbox.y1 - w.bbox.y0).filter(h => h > 0);
      const medianH = [...heights].sort((a, b) => a - b)[Math.floor(heights.length / 2)] || 10;
      const minGap = Math.max(1, medianH * 0.15);
      const sortedByY = [...allWords].sort((a, b) => a.bbox.y0 - b.bbox.y0);
      const rows = [];
      let cur = [], lastBottom = -9999;
      for (const w of sortedByY) {
        if (cur.length > 0 && w.bbox.y0 - lastBottom > minGap) { rows.push(cur.sort((a, b) => a.bbox.x0 - b.bbox.x0)); cur = []; }
        cur.push(w); lastBottom = Math.max(lastBottom, w.bbox.y1);
      }
      if (cur.length > 0) rows.push(cur.sort((a, b) => a.bbox.x0 - b.bbox.x0));
      let testPointCount = 0;
      for (const row of rows) {
        const t = row[0]?.text.trim().replace(/\.$/, '');
        const n = parseInt(t, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= 100 && String(n) === t) testPointCount = Math.max(testPointCount, n);
      }
      console.log(`Test point count: ${testPointCount}`);

      // Sequential matching
      const byLen = [...MANEUVER_LIST]
        .map(m => ({ name: m, mc: normCompact(m) }))
        .sort((a, b) => b.mc.length - a.mc.length);
      const seqManeuvers = [];
      let pos = 0;
      while (pos < corrected.length && seqManeuvers.length < testPointCount) {
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
      console.log(`\n=== SEQUENTIAL MAPPING (${seqManeuvers.length}/${testPointCount}) ===`);
      for (let i = 0; i < seqManeuvers.length; i++) {
        console.log(`  TP ${i + 1}: ${seqManeuvers[i]}`);
      }
    } else {
      console.log('No FTT column detected.');
    }

  } catch (e) { console.error('Error:', e); }
  finally { if (worker) await worker.terminate(); }
}

const img = process.argv[2];
if (!img) { console.error('Usage: node debug-ocr.mjs <image>'); process.exit(1); }
ocrImage(img);

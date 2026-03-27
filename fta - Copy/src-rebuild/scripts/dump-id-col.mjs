import { createWorker, PSM } from 'tesseract.js';

const img = process.argv[2];
if (!img) { console.error('Usage: node dump-id-col.mjs <image>'); process.exit(1); }

const worker = await createWorker('eng');
await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
const { data } = await worker.recognize(img, {}, { blocks: true });

const words = [];
data.blocks?.forEach(b => b.paragraphs?.forEach(p => p.lines?.forEach(l => l.words?.forEach(wd =>
  words.push({ t: wd.text, x0: wd.bbox.x0, x1: wd.bbox.x1, y0: wd.bbox.y0 })
))));
words.sort((a, b) => a.y0 - b.y0);

const codes = ['BACH', 'PRT', 'LGT', 'LACC', 'LDEC', 'PACH', 'LTAC', 'BAC', 'CC5'];
console.log('Words containing known ID codes:');
for (const w of words) {
  const up = w.t.toUpperCase();
  if (codes.some(c => up.includes(c))) {
    console.log(`  x=[${w.x0},${w.x1}] y=${w.y0} "${w.t}"`);
  }
}

console.log('\nAll words with x < 90 (left columns):');
for (const w of words) {
  if (w.x0 < 90) {
    console.log(`  x=[${w.x0},${w.x1}] y=${w.y0} "${w.t}"`);
  }
}

await worker.terminate();

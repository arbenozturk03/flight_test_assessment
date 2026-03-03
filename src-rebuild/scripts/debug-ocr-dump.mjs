import { createWorker, PSM } from 'tesseract.js';

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
    console.log(`\nAll words sorted by Y then X:`);
    const sorted = [...allWords].sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
    for (const w of sorted) {
      console.log(`  "${w.text}" x=[${w.bbox.x0},${w.bbox.x1}] y=[${w.bbox.y0},${w.bbox.y1}]`);
    }

    const knownHeaders = ['id', 'airspeed', 'altitude', 'lg', 'engine', 'tp#', 'ftt', 'ms', 'lef/te'];
    const hits = allWords.filter(w => knownHeaders.some(h => w.text.trim().toLowerCase().includes(h)));
    console.log(`\nKnown header hits:`);
    for (const w of hits) console.log(`  "${w.text}" x=[${w.bbox.x0},${w.bbox.x1}] y=[${w.bbox.y0},${w.bbox.y1}]`);

  } catch (e) { console.error('Error:', e); }
  finally { if (worker) await worker.terminate(); }
}

const img = process.argv[2];
if (!img) { console.error('Usage: node debug-ocr-dump.mjs <image>'); process.exit(1); }
ocrImage(img);

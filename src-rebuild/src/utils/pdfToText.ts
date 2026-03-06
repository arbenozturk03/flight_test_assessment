/**
 * Tarayıcıda PDF dosyasından metin çıkarır (sunucuya PDF göndermeden).
 */
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const PDFJS_VERSION = '4.8.69';
let workerSrcSet = false;
function setWorker() {
  if (workerSrcSet || typeof window === 'undefined') return;
  try {
    const gwo = (pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions;
    if (!gwo.workerSrc) {
      gwo.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.worker.min.mjs`;
    }
    workerSrcSet = true;
  } catch {
    workerSrcSet = true;
  }
}

export async function extractTextFromPdfFile(file: File): Promise<string> {
  setWorker();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const parts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    parts.push(pageText);
    if (i < numPages) parts.push('\f');
  }

  return parts.join('');
}

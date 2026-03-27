/**
 * icon.svg -> icon-192.png, icon-180.png (iOS/Android PWA ikonu)
 * Çalıştırma: node scripts/generate-icon-png.mjs
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'icon.svg');
const svg = readFileSync(svgPath);

// 180/192: iPhone; 152: iPad; 167: iPad Pro; 512: PWA
for (const size of [192, 180, 512, 152, 167]) {
  const outPath = join(publicDir, `icon-${size}.png`);
  await sharp(svg).resize(size, size).png().toFile(outPath);
  console.log(`OK: ${outPath}`);
}

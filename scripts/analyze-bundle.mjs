import { readFileSync, statSync } from 'fs';
import { gzipSync } from 'zlib';

const files = [
  '.output/chrome-mv3/content-scripts/content.js',
  '.output/chrome-mv3/background.js',
];

for (const f of files) {
  try {
    const buf = readFileSync(f);
    const gz = gzipSync(buf);
    console.log(`${f}:`);
    console.log(`  Uncompressed: ${(buf.length / 1024).toFixed(1)} KB`);
    console.log(`  Gzipped:      ${(gz.length / 1024).toFixed(1)} KB`);
  } catch (e) {
    console.log(`${f}: not found`);
  }
}

// Estimate contributor sizes by scanning import sources in content script
const src = readFileSync('.output/chrome-mv3/content-scripts/content.js', 'utf8');
console.log(`\nTotal content script: ${(src.length / 1024).toFixed(1)} KB`);

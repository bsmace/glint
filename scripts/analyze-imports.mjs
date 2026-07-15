import { readFileSync } from 'fs';

const src = readFileSync('.output/chrome-mv3/content-scripts/content.js', 'utf8');

// Find all module references in the built bundle
const importRefs = [...src.matchAll(/"[^"]+"/g)].map(m => m[0]).filter(s => 
  s.includes('/node_modules/') || s.startsWith('"@')
);

// Count unique packages
const pkgCounts = {};
for (const ref of importRefs) {
  const parts = ref.replace(/^"|"$/g, '').split('/node_modules/');
  if (parts.length > 1) {
    const pkg = parts[1].split('/').slice(0, ref.startsWith('"@') ? 2 : 1).join('/');
    pkgCounts[pkg] = (pkgCounts[pkg] || 0) + 1;
  }
}

const sorted = Object.entries(pkgCounts).sort((a, b) => b[1] - a[1]);
console.log('Top packages in content script bundle:');
sorted.slice(0, 30).forEach(([pkg, count]) => console.log(`  ${pkg}: ${count} refs`));

console.log(`\nTotal unique packages: ${sorted.length}`);
console.log(`Bundle size: ${(src.length / 1024).toFixed(1)} KB`);

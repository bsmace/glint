import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, rmSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const out = resolve(root, '.output', 'screenshots');
mkdirSync(out, { recursive: true });

const chipDemo = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>
  body { margin: 0; display: flex; justify-content: center; padding-top: 60px; background: #e8e8e8; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif; }
  .wrapper { position: relative; width: 700px; }
  .chipbar { display: flex; gap: 4px; padding: 2px 8px; height: 36px; align-items: center; background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.12); border-radius: 12px; font-size: 13px; font-weight: 500; min-width: 180px; }
  .chipbar button { padding: 4px 10px; border: 1px solid #e0e0e0; border-radius: 8px; background: #f8f9fa; cursor: pointer; font-size: 13px; font-weight: 500; color: #333; line-height: 20px; font-family: inherit; }
  .chipbar .badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #e8f5e9; color: #2e7d32; font-weight: 600; white-space: nowrap; margin-left: auto; }
  .diff-panel { background: #fff; border-top: 1px solid #e8e8e8; padding: 8px 10px 10px; border-radius: 0 0 12px 12px; }
  .diff-panel .label { font-size: 11px; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px; }
  .diff-panel .orig { background: #f5f5f5; color: #666; font-size: 12px; line-height: 1.4; padding: 6px 8px; border-radius: 6px; margin-bottom: 6px; white-space: pre-wrap; word-break: break-word; }
  .diff-panel .impr { background: #f0faf0; color: #222; font-size: 12px; line-height: 1.4; padding: 6px 8px; border-radius: 6px; margin-bottom: 8px; white-space: pre-wrap; word-break: break-word; }
  .diff-panel .actions { display: flex; gap: 8px; justify-content: flex-end; }
  .diff-panel .actions .accept { padding: 6px 14px; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 500; background: #2e7d32; color: #fff; font-family: inherit; }
  .diff-panel .actions .reject { padding: 6px 14px; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 500; background: #eee; color: #555; font-family: inherit; }
  .input-area { background: #fff; border-radius: 12px; padding: 14px; margin-top: 16px; border: 1px solid #ddd; }
  .input-area textarea { width: 100%; min-height: 80px; border: none; resize: none; font-size: 14px; outline: none; font-family: inherit; line-height: 1.5; }
  .input-area .label { font-size: 12px; color: #888; margin-bottom: 6px; }
  .header { margin-bottom: 20px; }
  .header h1 { font-size: 18px; margin: 0 0 4px; font-weight: 600; }
  .header p { font-size: 13px; color: #666; margin: 0; }
  .container { background: #fff; border-radius: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); padding: 24px; }
</style></head><body>
<div class="wrapper">
  <div class="header"><h1>Glint ✦</h1><p>Type less, mean more — on-device prompt assistant</p></div>
  <div class="container">
    <div style="position:relative">
      <div class="chipbar">
        <button>Improve</button><button>Concise</button><button>Add Context</button><button>Format</button>
        <span class="badge">On-device</span>
      </div>
      <div class="diff-panel">
        <div class="label" style="color:#999">ORIGINAL</div>
        <div class="orig">Write a blog post about the benefits of renewable energy for a general audience</div>
        <div class="label" style="color:#2e7d32">IMPROVED</div>
        <div class="impr">Write a blog post (800–1000 words) explaining the key benefits of renewable energy for a general audience. Structure it with three main sections: (1) environmental impact — reduced carbon emissions and cleaner air; (2) economic advantages — job creation and long-term cost savings; (3) energy independence — reduced reliance on fossil fuels. Use relatable analogies and avoid jargon. Target reading level: 10th grade. End with a call to action for readers to explore local renewable energy options.</div>
        <div class="actions"><button class="accept">Accept</button><button class="reject">Reject</button></div>
      </div>
    </div>
    <div class="input-area">
      <div class="label">Chat input</div>
      <textarea>Write a blog post about the benefits of renewable energy for a general audience</textarea>
    </div>
  </div>
</div>
</body></html>`;

const demoPath = resolve(root, '.output', 'chip-demo.html');
writeFileSync(demoPath, chipDemo);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(`file://${demoPath}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: resolve(out, 'chipbar-diff.png'), fullPage: false });
console.log('Saved chipbar-diff.png');

// Also take a screenshot of just the floating chip bar area at a more focused view
await page.setViewportSize({ width: 700, height: 500 });
await page.screenshot({ path: resolve(out, 'chipbar-close.png'), fullPage: false });
console.log('Saved chipbar-close.png');

await browser.close();

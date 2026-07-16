import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extPath = resolve(__dirname, '..', '.output', 'chrome-mv3');

const TEST_HTML = `<!DOCTYPE html><html><body>
<textarea id="prompt-textarea" placeholder="Send a message" style="position:fixed;bottom:0;width:100%;height:100px"></textarea>
<script>document.getElementById('prompt-textarea').focus();</script>
</body></html>`;

async function run() {
  // Start local test server
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(TEST_HTML);
  });
  await new Promise(r => server.listen(8999, '127.0.0.1', r));

  const browser = await chromium.launchPersistentContext(
    resolve(__dirname, '..', '.test-profile'),
    {
      headless: false,
      args: [
        `--disable-extensions-except=${extPath}`,
        `--load-extension=${extPath}`,
        '--no-sandbox',
      ],
      viewport: { width: 1280, height: 900 },
    },
  );

  const page = await browser.newPage();
  const results = [];

  async function test(name, fn) {
    try {
      await fn();
      results.push(`  \u2705 ${name}`);
    } catch (e) {
      results.push(`  \u274c ${name}: ${e.message}`);
    }
  }

  await test('Extension background loads', async () => {
    const bgPages = await browser.backgroundPages();
    const sw = bgPages.length > 0;
    if (!sw) {
      const exts = await browser.pages();
      const found = exts.some(p => p.url().startsWith('chrome-extension://'));
      if (!found) throw new Error('No extension background found');
    }
  });

  await test('Navigate to test page with textarea', async () => {
    await page.goto('http://127.0.0.1:8999/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
  });

  await test('Content script injected', async () => {
    const injected = await page.evaluate(() => !!(window).__glintInjected);
    if (!injected) throw new Error('__glintInjected not found');
  });

  await test('Overlay shadow host appears after focus', async () => {
    await page.evaluate(() => {
      const ta = document.getElementById('prompt-textarea');
      ta?.focus();
    });
    await page.waitForTimeout(1000);
    const hasOverlay = await page.evaluate(() => {
      const divs = document.querySelectorAll('div');
      for (const d of divs) {
        if (d.style.zIndex === '2147483647') return true;
      }
      return false;
    });
    if (!hasOverlay) throw new Error('Overlay host div not found');
  });

  await test('Shadow root attached', async () => {
    const hasShadow = await page.evaluate(() => {
      const divs = document.querySelectorAll('div');
      for (const d of divs) {
        if (d.shadowRoot && d.style.zIndex === '2147483647') return true;
      }
      return false;
    });
    if (!hasShadow) throw new Error('Shadow root not found');
  });

  await test('ChipBar renders after input focus', async () => {
    await page.evaluate(() => {
      const ta = document.getElementById('prompt-textarea');
      if (ta) {
        ta.value = 'Write a poem about AI';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.focus();
      }
    });
    await page.waitForTimeout(1500);
    const chipText = await page.evaluate(() => {
      const divs = document.querySelectorAll('div');
      for (const d of divs) {
        const sr = d.shadowRoot;
        if (!sr) continue;
        const inner = sr.querySelector('[data-glint-root]');
        if (!inner) continue;
        return inner.textContent || '';
      }
      return '';
    });
    if (!chipText.includes('Improve')) throw new Error(`ChipBar missing "Improve". Got: "${chipText.substring(0, 100)}"`);
  });

  console.log('=== Overlay Verification Results ===\n' + results.join('\n'));
  const passed = results.filter(r => r.includes('\u2705')).length;
  const failed = results.filter(r => r.includes('\u274c')).length;
  console.log(`\n${passed} passed, ${failed} failed`);

  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});

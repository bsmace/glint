import { autoUpdate, computePosition, flip, shift } from '@floating-ui/dom';
import { createRoot, type Root } from 'react-dom/client';

import type { ChipAction } from '../shared/ai';
import { bg, type TelemetryData } from '../shared/messaging';
import { createAI } from './content/ai';
import { ChipBar } from './content/ui/ChipBar';
import { createDetector } from './content/detector';
import tailwindCss from '../styles/tailwind.css?inline';
import { TELEMETRY_FLUSH_INTERVAL_MS } from '../shared/constants';

async function substituteVariables(text: string): Promise<string> {
  const r = await bg({ type: 'listVariables' });
  if (!r.ok || !r.data) return text;
  let out = text;
  for (const v of r.data as { key: string; value: string }[]) {
    out = out.replaceAll(`{{${v.key}}}`, v.value);
  }
  return out;
}

function startAutoUpdate(anchor: HTMLElement, floating: HTMLElement, telemetry: TelemetryData) {
  return autoUpdate(anchor, floating, () => {
    telemetry.anchorReflowCount++;
    computePosition(anchor, floating, {
      placement: 'top-start',
      middleware: [flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      floating.style.transform = `translate(${x}px, ${y}px)`;
    });
  });
}

export default defineContentScript({
  matches: ['*://chatgpt.com/*', '*://claude.ai/*', '*://gemini.google.com/*', '*://meta.ai/*', '*://perplexity.ai/*', '*://poe.com/*'],
  runAt: 'document_idle',
  world: 'ISOLATED',
  main(ctx) {
    if ((window as any).__glintInjected) return;
    (window as any).__glintInjected = true;

    chrome.runtime.onMessage.addListener((req, _sender, send) => {
      if ((req as any).type === 'glint:ping') send({ ok: true });
    });

    const telemetry: TelemetryData = { detectByStrategy: {}, anchorReflowCount: 0, aiLatencyMs: { count: 0, total: 0 } };
    let host: HTMLElement | null = null;
    let stopAutoUpdate: (() => void) | null = null;
    let detector: ReturnType<typeof createDetector> | null = null;
    let anchorRef: HTMLElement | null = null;
    let observer: MutationObserver | null = null;
    let reactRoot: Root | null = null;
    let diffActive = false;

    const watchAnchor = (anchor: HTMLElement) => {
      anchorRef = anchor;
      observer = new MutationObserver(() => {
        if (!document.contains(anchor)) {
          unmount();
          detector?.reset();
        }
      });
      // Observe the anchor's parent if available, otherwise fall back to document.body
      const target = anchor.parentNode || document.body;
      observer.observe(target, { childList: true, subtree: true });
    };

    const stopWatchingAnchor = () => {
      observer?.disconnect();
      observer = null;
      anchorRef = null;
    };

    createAI().then(({ provider, onDevice }) => {
      console.log('[glint] AI ready, onDevice:', onDevice);
      
      const generate: (action: ChipAction, text: string) => Promise<string> = async (action, text) => {
        const t0 = performance.now();
        const substituted = await substituteVariables(text);
        const result = await provider.generate(action, substituted);
        telemetry.aiLatencyMs.count++;
        telemetry.aiLatencyMs.total += performance.now() - t0;
        if (text !== result) {
          const u = new URL(location.href);
          u.search = '';
          u.hash = '';
          bg({ type: 'saveMemory', content: text, expanded: result, action, url: u.toString() }).catch(() => {});
        }
        return result;
      };
      
      const mount = (anchor: HTMLElement) => {
        if (host) { console.log('[glint] mount skipped — already mounted'); return; }
        console.log('[glint] mounting overlay');

        host = document.createElement('div');
        host.style.position = 'fixed';
        host.style.top = '0';
        host.style.left = '0';
        host.style.zIndex = '2147483647';
        host.style.pointerEvents = 'auto';
        document.body.append(host);
        watchAnchor(anchor);

        const shadow = host.attachShadow({ mode: 'closed' });
        const tw = document.createElement('style');
        tw.textContent = tailwindCss;
        shadow.append(tw);
        const inner = document.createElement('div');
        inner.setAttribute('data-glint-root', '');
        inner.classList.add('dark');
        shadow.append(inner);

        reactRoot = createRoot(inner);
        reactRoot.render(
          <ChipBar
            anchor={anchor}
            generate={generate}
            onDevice={onDevice}
            onDiffChange={(active) => { diffActive = active; }}
          />,
        );

        stopAutoUpdate = startAutoUpdate(anchor, host, telemetry);

        if (document.activeElement !== anchor) {
          console.log('[glint] anchor not focused — hiding overlay');
          host.style.display = 'none';
        } else {
          console.log('[glint] anchor focused — overlay visible');
        }

        showHandler = () => {
          console.log('[glint] show');
          host!.style.display = '';
          stopAutoUpdate?.();
          stopAutoUpdate = startAutoUpdate(anchor, host!, telemetry);
        };
        hideHandler = (e: FocusEvent) => {
          if (diffActive) { console.log('[glint] hide skipped — diff active'); return; }
          if (host && e.relatedTarget instanceof Node && host.contains(e.relatedTarget)) { console.log('[glint] hide skipped — focus inside overlay'); return; }
          console.log('[glint] hide — relatedTarget:', (e.relatedTarget as HTMLElement)?.tagName);
          host!.style.display = 'none';
          stopAutoUpdate?.();
          stopAutoUpdate = null;
        };

        anchor.addEventListener('blur', hideHandler);
        anchor.addEventListener('focus', showHandler);
      };

      detector = createDetector({
        onAttach(input, strategy) {
          console.log('[glint] Detected input:', input.tagName, input.id, strategy);
          telemetry.detectByStrategy[strategy] = (telemetry.detectByStrategy[strategy] ?? 0) + 1;
          mount(input);
        },
      });
    }).catch((err) => {
      console.error('[glint] AI init failed:', err);
    });

    const flushTelemetry = () => {
    if (telemetry.aiLatencyMs.count > 0 || Object.keys(telemetry.detectByStrategy).length > 0) {
      bg({ type: 'reportTelemetry', data: structuredClone(telemetry) }).catch(() => {});
      telemetry.detectByStrategy = {};
      telemetry.anchorReflowCount = 0;
      telemetry.aiLatencyMs = { count: 0, total: 0 };
    }
  };
  const flushTimer = setInterval(flushTelemetry, TELEMETRY_FLUSH_INTERVAL_MS);

    let showHandler: (() => void) | null = null;
    let hideHandler: ((e: FocusEvent) => void) | null = null;

    const unmount = () => {
      stopAutoUpdate?.();
      stopAutoUpdate = null;
      stopWatchingAnchor();
      if (anchorRef && hideHandler && showHandler) {
        anchorRef.removeEventListener('blur', hideHandler);
        anchorRef.removeEventListener('focus', showHandler);
      }
      showHandler = null;
      hideHandler = null;
      if (reactRoot) {
        reactRoot.unmount();
        reactRoot = null;
      }
      if (host) {
        host.remove();
        host = null;
      }
    };

    let prevUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== prevUrl) {
        prevUrl = location.href;
        unmount();
        detector?.reset();
      }
    });
    urlObserver.observe(document, { subtree: true, childList: true });

    ctx.addEventListener(window, 'unload', () => {
      flushTelemetry();
      clearInterval(flushTimer);
      unmount();
      urlObserver.disconnect();
    });
  },
});

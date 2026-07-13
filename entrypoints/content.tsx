import { autoUpdate, computePosition, flip, shift } from '@floating-ui/dom';
import { render } from 'preact';

import type { ChipAction } from '../shared/ai';
import { bg, type TelemetryData } from '../shared/messaging';
import { createAI } from './content/ai';
import { ChipBar } from './content/ui/ChipBar';
import { createDetector } from './content/detector';

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
    const telemetry: TelemetryData = { detectByStrategy: {}, anchorReflowCount: 0, aiLatencyMs: { count: 0, total: 0 } };
    let host: HTMLElement | null = null;
    let stopAutoUpdate: (() => void) | null = null;
    let generate: ((action: ChipAction, text: string) => Promise<string>) | null = null;
    let detector: ReturnType<typeof createDetector> | null = null;
    let anchorRef: HTMLElement | null = null;
    let observer: MutationObserver | null = null;

    const watchAnchor = (anchor: HTMLElement) => {
      anchorRef = anchor;
      observer = new MutationObserver(() => {
        if (!document.contains(anchor)) {
          unmount();
          detector?.reset();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };

    const stopWatchingAnchor = () => {
      observer?.disconnect();
      observer = null;
      anchorRef = null;
    };

    createAI().then(({ provider, onDevice }) => {
      generate = async (action, text) => {
        const t0 = performance.now();
        const substituted = await substituteVariables(text);
        const result = await provider.generate(action, substituted);
        telemetry.aiLatencyMs.count++;
        telemetry.aiLatencyMs.total += performance.now() - t0;
        if (text !== result) bg({ type: 'saveMemory', content: text, expanded: result, action, url: location.href });
        return result;
      };
      detector = createDetector({
        onAttach(input, strategy) {
          telemetry.detectByStrategy[strategy] = (telemetry.detectByStrategy[strategy] ?? 0) + 1;
          mount(input, onDevice);
        },
      });
    });

    const flushTelemetry = () => {
      if (telemetry.aiLatencyMs.count > 0 || Object.keys(telemetry.detectByStrategy).length > 0) {
        bg({ type: 'reportTelemetry', data: { ...telemetry } });
      }
    };
    const flushTimer = setInterval(flushTelemetry, 60000);

    const mount = (anchor: HTMLElement, onDevice = false) => {
      if (host) return;

      host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.top = '0';
      host.style.left = '0';
      host.style.zIndex = '2147483647';
      host.style.pointerEvents = 'auto';
      document.body.append(host);
      watchAnchor(anchor);

      const shadow = host.attachShadow({ mode: 'closed' });
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(':host { all: initial }');
      shadow.adoptedStyleSheets = [sheet];
      const inner = document.createElement('div');
      shadow.append(inner);
      render(<ChipBar anchor={anchor} generate={generate!} onDevice={onDevice} />, inner);

      stopAutoUpdate = startAutoUpdate(anchor, host, telemetry);

      const show = () => {
        host!.style.display = '';
        stopAutoUpdate = startAutoUpdate(anchor, host!, telemetry);
      };
      const hide = () => {
        host!.style.display = 'none';
        stopAutoUpdate?.();
        stopAutoUpdate = null;
      };

      anchor.addEventListener('blur', hide);
      anchor.addEventListener('focus', show);
    };

    const unmount = () => {
      stopAutoUpdate?.();
      stopAutoUpdate = null;
      stopWatchingAnchor();
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

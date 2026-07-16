import { autoUpdate, computePosition, flip, shift } from '@floating-ui/dom';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { ChipAction, GenerateResult } from '../shared/ai';
import { bg, type TelemetryData } from '../shared/messaging';
import { createAI, INSTRUCTIONS } from './content/ai';
import { ChipBar } from './content/ui/ChipBar';
import { createDetector, setAdapters } from './content/detector';
import tailwindCss from '../styles/content-tailwind.css?inline';
import { sha256, getCachedResult, setCachedResult, getDomainVariables, recordDomainVariables, getCachedAdapters } from '../shared/services';
import { TELEMETRY_FLUSH_INTERVAL_MS, OVERLAY_SHOW_DELAY_MS } from '../shared/constants';

class ChipErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[glint] ChipBar error:', error, info.componentStack); }
  render() {
    if (this.state.hasError) {
      return <div className="rounded-xl border border-border bg-card/95 px-3 py-2 text-xs text-muted-foreground">Glint encountered an error. Reload the page to retry.</div>;
    }
    return this.props.children;
  }
}

async function substituteVariables(text: string): Promise<string> {
  const r = await bg({ type: 'listVariables' });
  if (!r.ok || !Array.isArray(r.data)) return text;
  let out = text;
  for (const v of r.data) {
    if (v && typeof v.key === 'string' && typeof v.value === 'string') {
      out = out.replaceAll(`{{${v.key}}}`, v.value);
    }
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
  matches: ['*://chatgpt.com/*', '*://claude.ai/*', '*://gemini.google.com/*', '*://meta.ai/*', '*://perplexity.ai/*', '*://poe.com/*', '*://m365.cloud.microsoft/*'],
  runAt: 'document_idle',
  world: 'ISOLATED',
  main(ctx) {
    if ((window as any).__glintInjected) return;
    (window as any).__glintInjected = true;

    chrome.runtime.onMessage.addListener((req, _sender, send) => {
      if ((req as any).type === 'glint:ping') send({ ok: true });
      if ((req as any).type === 'glint:runABTest') {
        if (_sender.url && !_sender.url.startsWith('chrome-extension://')) {
          send({ ok: false, error: 'unauthorized sender' });
          return;
        }
        (async () => {
          try {
            const { promptA, promptB } = req as any;
            const { provider } = await createAI();
            const resultA = await provider.generate('improve', promptA);
            const resultB = await provider.generate('improve', promptB);
            provider.destroy();
            send({ ok: true, data: { resultA, resultB } });
          } catch (e) {
            send({ ok: false, error: String(e) });
          }
        })();
        return true;
      }
    });

    const telemetry: TelemetryData = { detectByStrategy: {}, anchorReflowCount: 0, aiLatencyMs: { count: 0, total: 0 }, cacheHitCount: 0 };
    let host: HTMLElement | null = null;
    let stopAutoUpdate: (() => void) | null = null;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let detector: ReturnType<typeof createDetector> | null = null;
    let anchorRef: HTMLElement | null = null;
    let observer: MutationObserver | null = null;
    let reactRoot: Root | null = null;
    let diffActive = false;
    let aiProvider: Awaited<ReturnType<typeof createAI>> | null = null;
    let aiReady: Promise<void> | null = null;
    let aiResolve: (() => void) | null = null;

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

    aiReady = new Promise<void>(resolve => { aiResolve = resolve; });
    createAI().then(({ provider, onDevice }) => {
      aiProvider = { provider, onDevice };
      console.log('[glint] AI ready, onDevice:', onDevice);
    }).catch((err) => {
      console.warn('[glint] AI init failed, fallback only:', err);
    }).finally(() => {
      aiResolve?.();
    });

    const generate: (action: ChipAction, text: string, instruction?: string) => Promise<GenerateResult> = async (action, text, instruction) => {
      const t0 = performance.now();
      const u = new URL(location.href);
      u.search = '';
      u.hash = '';
      const domain = u.hostname;
      if (!instruction && action === 'improve') {
        const bvResp = await bg({ type: 'getBrandVoiceForDomain', domain });
        if (bvResp.ok && bvResp.data) {
          const bv = bvResp.data as any;
          const parts: string[] = [];
          if (bv.tone) parts.push(`Tone: ${bv.tone}`);
          if (Array.isArray(bv.vocabulary) && bv.vocabulary.length > 0) parts.push(`Preferred vocabulary: ${bv.vocabulary.join(', ')}`);
          if (Array.isArray(bv.rules) && bv.rules.length > 0) parts.push(`Rules: ${bv.rules.join('; ')}`);
          if (Array.isArray(bv.examples) && bv.examples.length > 0) parts.push(`Examples: ${bv.examples.join('; ')}`);
          if (parts.length > 0) instruction = `${INSTRUCTIONS.improve}Follow this brand voice:\n${parts.join('\n')}\n\n`;
        }
      }
      const usedKeys = [...text.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
      if (usedKeys.length > 0) {
        recordDomainVariables(domain, usedKeys).catch(e => console.warn('[glint] failed to record domain vars:', e));
      }
      const domainKeys = await getDomainVariables(domain);
      const allVars = await bg({ type: 'listVariables' });
      const matchedVars: { key: string; value: string }[] = [];
      if (allVars.ok && Array.isArray(allVars.data) && domainKeys.length > 0) {
        const alreadyInjected = new Set(usedKeys);
        for (const v of allVars.data) {
          if (v && typeof v.key === 'string' && typeof v.value === 'string' && domainKeys.includes(v.key) && !alreadyInjected.has(v.key)) {
            matchedVars.push(v);
          }
        }
      }
      let substituted = await substituteVariables(text);
      let injected = '';
      if (matchedVars.length > 0) {
        injected = matchedVars.map(v => `${v.key}=${v.value}`).join(', ');
        substituted = `${injected}\n\n${substituted}`;
      }
      // Wait for AI to be ready if it's still loading
      if (aiReady) { await aiReady; aiReady = null; }
      const { provider } = aiProvider ?? { provider: null };
      if (!provider) {
        return { text: substituted, injected };
      }
      const hash = await sha256(substituted + ':' + action);
      const cached = await getCachedResult(hash);
      if (cached !== null) {
        telemetry.cacheHitCount = (telemetry.cacheHitCount ?? 0) + 1;
        return { text: cached, injected };
      }
      const result = await provider.generate(action, substituted, instruction);
      telemetry.aiLatencyMs.count++;
      telemetry.aiLatencyMs.total += performance.now() - t0;
      setCachedResult(hash, substituted, result, action, domain).catch(e => console.warn('[glint] cache write failed:', e));
      if (text !== result) {
        bg({ type: 'saveMemory', content: text, expanded: result, action, url: u.toString() }).catch(e => console.warn('[glint] saveMemory failed:', e));
      }
      return { text: result, injected };
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

      // Only stop mouse events to prevent text selection bleed; let keyboard through for React handlers
      for (const ev of ['mousedown', 'mouseup', 'click']) {
        shadow.addEventListener(ev, (e) => e.stopPropagation(), true);
      }

      reactRoot = createRoot(inner);

      const renderChipBar = (cc: { id: number; name: string; label: string; instruction: string }[], auto_send?: string) => {
        const isOnDevice = aiProvider?.onDevice ?? false;
        const isAvailable = !!(aiProvider?.provider) || aiReady !== null;
        reactRoot!.render(
          <ChipErrorBoundary>
            <ChipBar
              anchor={anchor}
              generate={generate}
              customChips={cc}
              onDevice={isOnDevice}
              aiAvailable={isAvailable}
              autoSend={auto_send === 'true'}
              onDiffChange={(active) => { diffActive = active; }}
            />
          </ChipErrorBoundary>,
        );
      };

      const loadSettings = () => bg({ type: 'getSetting', key: 'auto_send' }).catch(() => ({ ok: false, error: '' }));

      Promise.all([
        bg({ type: 'listCustomChips' }),
        loadSettings(),
      ]).then(([chipsRes, settingRes]) => {
        const chips = chipsRes.ok && Array.isArray(chipsRes.data) ? chipsRes.data.map((c: any) => ({ id: c.id, name: c.name, label: c.label, instruction: c.instruction })) : [];
        const auto_send = settingRes.ok ? String((settingRes as any).data ?? '') : '';
        renderChipBar(chips, auto_send);
      });

      stopAutoUpdate = startAutoUpdate(anchor, host, telemetry);

      if (document.activeElement !== anchor) {
        console.log('[glint] anchor not focused — hiding overlay');
        host.style.display = 'none';
      } else {
        console.log('[glint] anchor focused — showing in 400ms');
        showTimer = setTimeout(() => {
          showTimer = null;
          console.log('[glint] show');
          host!.style.display = '';
          stopAutoUpdate?.();
          stopAutoUpdate = startAutoUpdate(anchor, host!, telemetry);
        }, OVERLAY_SHOW_DELAY_MS);
      }

      showHandler = () => {
        if (showTimer) clearTimeout(showTimer);
        showTimer = setTimeout(() => {
          showTimer = null;
          console.log('[glint] show');
          host!.style.display = '';
          stopAutoUpdate?.();
          stopAutoUpdate = startAutoUpdate(anchor, host!, telemetry);
        }, OVERLAY_SHOW_DELAY_MS);
      };
      hideHandler = (e: FocusEvent) => {
        if (diffActive) { console.log('[glint] hide skipped — diff active'); return; }
        if (host && e.relatedTarget instanceof Node && host.contains(e.relatedTarget)) { console.log('[glint] hide skipped — focus inside overlay'); return; }
        if (showTimer) { clearTimeout(showTimer); showTimer = null; }
        console.log('[glint] hide');
        host!.style.display = 'none';
        stopAutoUpdate?.();
        stopAutoUpdate = null;
      };

      anchor.addEventListener('blur', hideHandler);
      anchor.addEventListener('focus', showHandler);
    };

    getCachedAdapters().then(remote => {
      if (remote && remote.length > 0) {
        setAdapters(remote);
      } else {
        setTimeout(async () => {
          const retry = await getCachedAdapters();
          if (retry && retry.length > 0) setAdapters(retry);
        }, 5000);
      }
    });
    detector = createDetector({
      onAttach(input, strategy) {
        console.log('[glint] Detected input:', input.tagName, input.id, strategy);
        telemetry.detectByStrategy[strategy] = (telemetry.detectByStrategy[strategy] ?? 0) + 1;
        mount(input);
      },
    });

    const flushTelemetry = () => {
      if (telemetry.aiLatencyMs.count > 0 || Object.keys(telemetry.detectByStrategy).length > 0 || (telemetry.cacheHitCount ?? 0) > 0) {
        bg({ type: 'reportTelemetry', data: structuredClone(telemetry) }).catch(e => console.warn('[glint] telemetry flush failed:', e));
        telemetry.detectByStrategy = {};
        telemetry.anchorReflowCount = 0;
        telemetry.aiLatencyMs = { count: 0, total: 0 };
        telemetry.cacheHitCount = 0;
      }
    };
    const flushTimer = setInterval(flushTelemetry, TELEMETRY_FLUSH_INTERVAL_MS);

    let showHandler: (() => void) | null = null;
    let hideHandler: ((e: FocusEvent) => void) | null = null;

    const unmount = () => {
      if (showTimer) { clearTimeout(showTimer); showTimer = null; }
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

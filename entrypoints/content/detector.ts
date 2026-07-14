import { FAB_SHOW_DELAY_MS, DETECTOR_DEBOUNCE_MS } from '../../shared/constants';

export type Adapter = {
  domain: string;
  selector: string;
};

const adapters: Adapter[] = [
  { domain: 'chatgpt.com', selector: '#prompt-textarea' },
  { domain: 'claude.ai', selector: 'div[contenteditable="true"][data-placeholder]' },
  { domain: 'gemini.google.com', selector: 'div[contenteditable="true"][role="textbox"]' },
  { domain: 'meta.ai', selector: 'textarea' },
  { domain: 'perplexity.ai', selector: 'textarea' },
  { domain: 'poe.com', selector: 'textarea' },
  { domain: 'm365.cloud.microsoft', selector: '[contenteditable="true"][role="textbox"]' },
];

function matchAdapter(): Adapter | null {
  const host = location.hostname.replace('www.', '');
  return adapters.find((a) => host.includes(a.domain)) ?? null;
}

function ariaTextbox(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="textbox"]');
}

function heuristicInput(): HTMLElement | null {
  const inputs = document.querySelectorAll<HTMLElement>('textarea, [contenteditable="true"]');
  let best: HTMLElement | null = null;
  let bestArea = 0;
  const vpBottom = window.innerHeight * 0.6;
  for (const el of inputs) {
    const rect = el.getBoundingClientRect();
    if (rect.top < vpBottom) continue;
    const area = rect.width * rect.height;
    if (area > bestArea) {
      bestArea = area;
      best = el;
    }
  }
  return best;
}

export type DetectResult = {
  el: HTMLElement | null;
  strategy: 'adapter' | 'aria' | 'heuristic' | 'focusin' | 'fab';
};

export function detect(el?: HTMLElement): DetectResult {
  if (el && (el.matches('textarea, [contenteditable="true"], [role="textbox"]'))) {
    return { el, strategy: 'focusin' };
  }

  const adapter = matchAdapter();
  if (adapter) {
    const found = document.querySelector<HTMLElement>(adapter.selector);
    if (found) return { el: found, strategy: 'adapter' };
  }

  const aria = ariaTextbox();
  if (aria) return { el: aria, strategy: 'aria' };

  const heuristic = heuristicInput();
  if (heuristic) return { el: heuristic, strategy: 'heuristic' };

  return { el: null, strategy: 'heuristic' };
}

export type DetectorCallbacks = {
  onAttach: (input: HTMLElement, strategy: string) => void;
};

export function createDetector(cbs: DetectorCallbacks) {
  let attached = false;
  let fabTimer: ReturnType<typeof setTimeout> | null = null;
  let fabContainer: HTMLElement | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const ac = new AbortController();

  const tryAttach = (strategy: string, el?: HTMLElement) => {
    if (attached) return;
    const result = detect(el);
    console.log('[glint] tryAttach strategy=' + strategy + ' found=' + (result.el?.tagName ?? 'null') + ' id=' + (result.el?.id ?? ''));
    if (!result.el) return;
    attached = true;
    if (fabTimer) { clearTimeout(fabTimer); fabTimer = null; }
    keepFab = false;
    removeFab();
    cbs.onAttach(result.el, strategy);
  };

  let keepFab = true;

  const showFab = () => {
    if (attached || fabContainer || !keepFab) return;
    fabContainer = document.createElement('div');
    fabContainer.textContent = 'Improve prompt';
    Object.assign(fabContainer.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      padding: '10px 16px',
      background: '#555',
      color: '#fff',
      border: 'none',
      borderRadius: '24px',
      cursor: 'pointer',
      zIndex: '2147483647',
      fontFamily: 'system-ui',
      fontSize: '14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    });
    fabContainer.addEventListener('click', () => {
      tryAttach('fab', document.activeElement as HTMLElement);
    });
    document.body.append(fabContainer);
  };

  const removeFab = () => {
    fabContainer?.remove();
    fabContainer = null;
  };

  // focusin — 0ms, via AbortController
  document.addEventListener('focusin', ((e: FocusEvent) => {
    const el = e.target as HTMLElement;
    if (el.matches('textarea, [contenteditable="true"], [role="textbox"]')) {
      tryAttach('focusin', el);
    }
  }) as EventListener, { capture: true, signal: ac.signal });

  // MutationObserver with debounce
  const bodyObs = new MutationObserver(() => {
    if (attached) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => tryAttach('adapter'), DETECTOR_DEBOUNCE_MS);
  });
  bodyObs.observe(document.body, { childList: true, subtree: true });

  // FAB fallback after 2s
  fabTimer = setTimeout(showFab, FAB_SHOW_DELAY_MS);

  const destroy = () => {
    bodyObs.disconnect();
    ac.abort();
    if (fabTimer) clearTimeout(fabTimer);
    if (debounceTimer) clearTimeout(debounceTimer);
    removeFab();
    attached = false;
  };

  const reset = () => {
    attached = false;
    keepFab = true;
    if (fabTimer) clearTimeout(fabTimer);
    fabTimer = setTimeout(showFab, FAB_SHOW_DELAY_MS);
    if (!debounceTimer) {
      debounceTimer = setTimeout(() => tryAttach('adapter'), DETECTOR_DEBOUNCE_MS);
    }
  };

  // Initial attempt
  tryAttach('adapter');

  return { destroy, reset, get attached() { return attached; } };
}

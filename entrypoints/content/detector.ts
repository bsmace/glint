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
  strategy: 'adapter' | 'aria' | 'heuristic' | 'focusin';
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

  const tryAttach = (strategy: string, el?: HTMLElement) => {
    if (attached) return;
    const { el: input } = detect(el);
    if (!input) return;
    attached = true;
    if (fabTimer) { clearTimeout(fabTimer); fabTimer = null; }
    removeFab();
    cbs.onAttach(input, strategy);
  };

  const showFab = () => {
    if (attached || fabContainer) return;
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

  // focusin — 0ms, no debounce
  document.addEventListener('focusin', ((e: FocusEvent) => {
    const el = e.target as HTMLElement;
    if (el.matches('textarea, [contenteditable="true"], [role="textbox"]')) {
      tryAttach('focusin', el);
    }
  }) as EventListener, true);

  // Dual MutationObserver — body + future chat containers
  const bodyObs = new MutationObserver(() => {
    if (attached) return;
    tryAttach('adapter');
  });
  bodyObs.observe(document.body, { childList: true, subtree: true });

  // FAB fallback after 2s
  fabTimer = setTimeout(showFab, 2000);

  const destroy = () => {
    bodyObs.disconnect();
    if (fabTimer) clearTimeout(fabTimer);
    removeFab();
    attached = false;
  };

  // Initial attempt
  tryAttach('adapter');

  return { destroy, get attached() { return attached; } };
}

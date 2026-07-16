const SEND_SELECTORS: Record<string, string[]> = {
  'chatgpt.com': ['button[data-testid="send-button"]:not([disabled])'],
  'claude.ai': ['button[aria-label*="Send"]:not([disabled])'],
  'gemini.google.com': ['button[aria-label*="Send"]:not([disabled])'],
  'meta.ai': ['button[type="submit"]:not([disabled])', 'button[aria-label*="Send"]:not([disabled])'],
  'perplexity.ai': ['button[type="submit"]:not([disabled])'],
  'poe.com': ['button[type="submit"]:not([disabled])'],
};

export function triggerSend(anchor: HTMLElement): boolean {
  const host = location.hostname.replace('www.', '');
  const domains = Object.keys(SEND_SELECTORS);
  const matched = domains.find(d => host === d || host.endsWith('.' + d));
  if (matched) {
    for (const sel of SEND_SELECTORS[matched]) {
      const btn = document.querySelector<HTMLElement>(sel);
      if (btn) { btn.click(); return true; }
    }
  }
  const enter = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true });
  if (anchor.dispatchEvent(enter)) {
    anchor.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
    return true;
  }
  return false;
}

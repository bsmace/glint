import { autoUpdate, computePosition, flip, shift } from '@floating-ui/dom';
import { render } from 'preact';

import type { ChipAction } from '../shared/ai';
import { bg } from '../shared/messaging';
import { createAI } from './content/ai';
import { ChipBar } from './content/ui/ChipBar';
import { createDetector } from './content/detector';

function startAutoUpdate(anchor: HTMLElement, floating: HTMLElement) {
  return autoUpdate(anchor, floating, () => {
    computePosition(anchor, floating, {
      placement: 'top-start',
      middleware: [flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      floating.style.transform = `translate(${x}px, ${y}px)`;
    });
  });
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  world: 'ISOLATED',
  main(ctx) {
    let host: HTMLElement | null = null;
    let stopAutoUpdate: (() => void) | null = null;
    let generate: ((action: ChipAction, text: string) => Promise<string>) | null = null;

    createAI().then((ai) => {
      generate = async (action, text) => {
        const result = await ai.generate(action, text);
        if (text !== result) bg({ type: 'saveMemory', content: text, expanded: result, action });
        return result;
      };
      createDetector({
        onAttach(input) {
          mount(input);
        },
      });
    });

    const mount = (anchor: HTMLElement) => {
      if (host) return;

      host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.top = '0';
      host.style.left = '0';
      host.style.zIndex = '2147483647';
      host.style.pointerEvents = 'auto';
      document.body.append(host);

      const shadow = host.attachShadow({ mode: 'closed' });
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(':host { all: initial }');
      shadow.adoptedStyleSheets = [sheet];
      const inner = document.createElement('div');
      shadow.append(inner);
      render(<ChipBar anchor={anchor} generate={generate!} />, inner);

      stopAutoUpdate = startAutoUpdate(anchor, host);

      const show = () => {
        host!.style.display = '';
        stopAutoUpdate = startAutoUpdate(anchor, host!);
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
      if (host) {
        host.remove();
        host = null;
      }
    };

    ctx.addEventListener('window:unload', unmount);
  },
});

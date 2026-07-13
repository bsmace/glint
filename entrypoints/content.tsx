import { render } from 'preact';

import { ChipBar } from './content/ui/ChipBar';

let container: HTMLElement | null = null;

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  world: 'ISOLATED',
  main(ctx) {
    const ui = createShadowRootUi(ctx, {
      name: 'glint',
      position: 'overlay',
      mode: 'closed',
      isolateEvents: true,
      onMount: (c) => {
        container = c;
        render(<ChipBar />, c);
      },
      onRemove: () => {
        if (container) {
          render(null, container);
          container = null;
        }
      },
    });

    ui.mount();
  },
});

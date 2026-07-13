import { render } from 'preact';

import { ChipBar } from './content/ui/ChipBar';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main(ctx) {
    const ui = createShadowRootUi(ctx, {
      name: 'glint',
      position: 'overlay',
      mode: 'closed',
      isolateEvents: true,
      onMount: (container) => {
        render(<ChipBar />, container);
      },
      onRemove: () => {
        // Preact auto-cleans on container removal
      },
    });

    ui.mount();
  },
});

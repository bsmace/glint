import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  vite: () => ({
    plugins: [preact()],
  }),
  manifest: {
    name: 'Glint',
    description: 'Type less, mean more - prompt assistant',
    permissions: ['storage', 'sidePanel'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
    commands: {
      'toggle-panel': {
        suggested_key: { default: 'Ctrl+Shift+P' },
        description: 'Toggle Glint side panel',
      },
    },
  },
});

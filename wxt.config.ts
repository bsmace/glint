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
  },
});

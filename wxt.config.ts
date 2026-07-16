import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  suppressWarnings: {
    firefoxDataCollection: true,
  },
  manifest: ({ browser }) => ({
    name: 'Glint',
    description: 'Type less, mean more - prompt assistant',
    permissions: browser === 'firefox'
      ? ['storage', 'scripting']
      : ['storage', 'sidePanel', 'scripting', 'alarms'],
    host_permissions: ['*://m365.cloud.microsoft/*'],
    web_accessible_resources: [{
      resources: ['content-scripts/content.js'],
      matches: ['*://m365.cloud.microsoft/*'],
      use_dynamic_url: true,
    }],
    ...(browser === 'firefox'
      ? {
          sidebar_action: { default_panel: 'sidepanel.html' },
          browser_action: { default_title: 'Glint' },
          browser_specific_settings: { gecko: { id: 'glint@bsmace' } },
        }
      : { side_panel: { default_path: 'sidepanel.html' } }
    ),
    commands: {
      'toggle-panel': {
        suggested_key: { default: 'Ctrl+Shift+P' },
        description: 'Toggle Glint side panel',
      },
    },
  }),
  alias: {
    '@': '.',
  },
  vite: () => ({
    esbuild: {
      charset: 'ascii',
    },
    build: {
      target: 'es2020',
      minify: 'esbuild',
      cssMinify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  }),
});

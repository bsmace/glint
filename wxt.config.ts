import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Glint',
    description: 'Type less, mean more - prompt assistant',
    permissions: ['storage', 'sidePanel', 'scripting'],
    host_permissions: ['*://m365.cloud.microsoft/*'],
    web_accessible_resources: [{
      resources: ['content-scripts/content.js'],
      matches: ['*://m365.cloud.microsoft/*'],
      use_dynamic_url: true,
    }],
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
  alias: {
    '@': '.',
  },
});

import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest';

export default defineConfig({
  plugins: [
    crx({
      manifest,
      browser: 'chrome',
    }),
  ],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      input: {
        background: 'src/background.ts',
        content: 'src/content.ts',
        worker: 'src/core/worker/aiWorker.ts',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  optimizeDeps: {
    exclude: ['@orama/orama'],
  },
  server: {
    strictPort: true,
    port: 5173,
    hmr: {
      clientPort: 5173,
    },
  },
});
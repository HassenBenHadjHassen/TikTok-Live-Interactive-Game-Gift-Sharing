import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@snake-live/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@snake-live/gift-config': path.resolve(__dirname, '../../packages/gift-config/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});

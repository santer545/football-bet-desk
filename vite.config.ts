import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const footballApiProxy = {
  '/api/football': {
    target: 'https://api.football-data.org/v4',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/football/, ''),
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/football-bet-desk/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: footballApiProxy,
    fs: {
      allow: ['..'],
    },
  },
  preview: {
    proxy: footballApiProxy,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          data: [
            '@tanstack/react-query',
            'zustand',
            'zod',
            'react-hook-form',
            '@hookform/resolvers',
          ],
          markdown: ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: false,
  },
});

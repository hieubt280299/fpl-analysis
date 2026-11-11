/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';

/**
 * The browser cannot call the FPL API directly (no CORS headers), so every FPL
 * request goes through `/api/fpl/*`:
 *  - in dev / preview: this Vite proxy forwards to fantasy.premierleague.com
 *  - in production: Firebase Hosting rewrites to the `fplProxy` Cloud Function
 * Keep both paths in sync (see functions/src/index.ts).
 */
const fplProxy: Record<string, ProxyOptions> = {
  '/api/fpl': {
    target: 'https://fantasy.premierleague.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/fpl/, '/api'),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; fpl-analysis/1.0)',
      Accept: 'application/json',
    },
  },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { proxy: fplProxy },
  preview: { proxy: fplProxy },
  build: {
    sourcemap: true,
    // The Firebase Auth + Firestore SDK chunk is ~670 kB minified (~170 kB gzip) on its own.
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

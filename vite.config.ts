/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Connect, type Plugin } from 'vite';
import { handleFplRequest } from './api/fpl';

/**
 * The browser cannot call the FPL API directly (no CORS headers), so the app calls
 * `/api/fpl?path=…`. In production that is the Vercel Function in api/fpl.ts; in dev/preview this
 * plugin runs the very same handler, so allow-list and behaviour are identical.
 */
function fplApiPlugin(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (!req.url || !/^\/api\/fpl(?:[/?]|$)/.test(req.url)) {
      next();
      return;
    }
    handleFplRequest(new Request(new URL(req.url, 'http://localhost'), { method: req.method }))
      .then(async (response) => {
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      })
      .catch(next);
  };
  return {
    name: 'fpl-api',
    configureServer: (server) => {
      server.middlewares.use(middleware);
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), fplApiPlugin()],
  // Fixed ports (not Vite's 5173/4173) so this app doesn't clash with other local Vite projects.
  server: { port: 5180, strictPort: true },
  preview: { port: 4180, strictPort: true },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
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
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
  },
});

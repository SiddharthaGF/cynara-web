import { rm } from 'node:fs/promises';
import path from 'node:path';

import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiOrigin = env.VITE_API_ORIGIN || '';
  if (!apiOrigin) {
    throw new Error('Server unavailable');
  }

  const cleanCloudflareArtifacts = (): Plugin => ({
    name: 'clean-cloudflare-artifacts',
    apply: () => mode !== 'dev' && mode !== 'serve',
    async closeBundle() {
      const targets = [
        path.resolve(process.cwd(), 'dist/server/.vite'),
        path.resolve(process.cwd(), 'dist/server/.dev.vars'),
      ];
      await Promise.all(
        targets.map(async (target) => {
          try {
            await rm(target, { force: true, recursive: true });
          } catch {
            // Best-effort cleanup is intentional.
          }
        }),
      );
    },
  });

  return {
    plugins: [
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      cleanCloudflareArtifacts(),
      tailwindcss(),
      tanstackStart(),
      react(),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          changeOrigin: true,
          configure: (proxy): void => {
            proxy.on('proxyRes', (proxyRes) => {
              const contentType = proxyRes.headers['content-type'];
              if (
                typeof contentType === 'string' &&
                contentType.includes('text/event-stream')
              ) {
                proxyRes.headers['cache-control'] = 'no-cache, no-transform';
                proxyRes.headers['x-accel-buffering'] = 'no';
              }
            });
          },
          target: apiOrigin.replace(/\/$/u, ''),
        },
      },
    },
  };
});

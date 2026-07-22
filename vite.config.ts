import { rm } from 'node:fs/promises';
import path from 'node:path';

import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const CI_API_ORIGIN_PLACEHOLDER = '__UNSET__';
const EMPTY_STRING_LENGTH = 0;

const LOCAL_MISSING_API_ORIGIN_ERROR =
  'VITE_API_ORIGIN is not set. Configure the cynara-api origin before running vite build.\n' +
  '  - Local dev: add it to `.env` (see `.env.example`).\n' +
  '  - CI: set it as a repository variable in Settings -> Secrets and variables -> Actions.\n' +
  '  - Manual deploy: export it in the shell that runs `pnpm build`.';

const resolveApiOrigin = (loaded: Record<string, string>): string => {
  const fromProcessEnv = process.env.VITE_API_ORIGIN;
  if (
    typeof fromProcessEnv === 'string' &&
    fromProcessEnv.length > EMPTY_STRING_LENGTH
  ) {
    return fromProcessEnv;
  }
  const fromEnvFile = loaded.VITE_API_ORIGIN;
  if (
    typeof fromEnvFile === 'string' &&
    fromEnvFile.length > EMPTY_STRING_LENGTH
  ) {
    return fromEnvFile;
  }
  const isCi = process.env.CI === 'true' || process.env.CI === '1';
  if (isCi) {
    return CI_API_ORIGIN_PLACEHOLDER;
  }
  throw new Error(LOCAL_MISSING_API_ORIGIN_ERROR);
};

const cleanCloudflareArtifacts = (mode: string): Plugin => ({
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiOrigin = resolveApiOrigin(env);
  const appEnv = process.env.APP_ENV ?? env.APP_ENV;
  const workerVars: Record<string, string> = {};
  if (apiOrigin) {
    workerVars.API_ORIGIN = apiOrigin;
  }
  if (typeof appEnv === 'string' && appEnv.length > EMPTY_STRING_LENGTH) {
    workerVars.APP_ENV = appEnv;
  }

  return {
    plugins: [
      cloudflare({
        viteEnvironment: { name: 'ssr' },
        config: {
          vars: workerVars,
        },
      }),
      cleanCloudflareArtifacts(mode),
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

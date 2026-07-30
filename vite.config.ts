import { rm } from 'node:fs/promises';
import path from 'node:path';

import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const cleanCloudflareArtifacts = (mode: string): Plugin => ({
  name: 'clean-cloudflare-artifacts',
  apply: () => mode !== 'dev' && mode !== 'serve',
  async closeBundle() {
    const targets = [path.resolve(process.cwd(), 'dist/server/.vite')];
    await Promise.all(
      targets.map(async (target) => {
        try {
          await rm(target, { force: true, recursive: true });
        } catch {
          // Best-effort cleanup is intentional — missing paths are fine.
        }
      }),
    );
  },
});

const config = defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: 'ssr' },
    }),
    tanstackStart(),
    cleanCloudflareArtifacts(process.env.NODE_ENV ?? 'development'),
    tailwindcss(),
    react(),
  ],
});

export default config;

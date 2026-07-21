import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  let apiOrigin = '';
  if (env.VITE_API_ORIGIN) {
    apiOrigin = env.VITE_API_ORIGIN.trim();
  }
  if (!apiOrigin) {
    throw new Error('Server unavailable');
  }

  return {
    plugins: [tailwindcss(), tanstackStart(), react()],
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

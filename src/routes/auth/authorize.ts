import { createFileRoute } from '@tanstack/react-router';

import { proxyAuthorizeRequest } from '@/server/auth-authorize-proxy.ts';

export const Route = createFileRoute('/auth/authorize')({
  server: {
    handlers: {
      GET: async ({ request }) => proxyAuthorizeRequest(request),
      POST: async ({ request }) => proxyAuthorizeRequest(request),
    },
  },
});

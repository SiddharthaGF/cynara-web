import handler, { createServerEntry } from '@tanstack/react-start/server-entry';

import { registerAttachSessionAuth } from '@/api/server-auth-hook';
import { attachSessionAuth } from '@/server/api-proxy';

// Server-side generated-SDK calls (route loaders) authenticate with the
// Sealed session; see src/api/server-auth-hook.ts for why the wiring is
// Inverted instead of a direct import.
registerAttachSessionAuth(attachSessionAuth);

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request);
  },
});

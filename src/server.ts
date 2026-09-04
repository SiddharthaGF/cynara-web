import handler, { createServerEntry } from '@tanstack/react-start/server-entry';

import { registerAttachSessionAuth } from '@/api/server-auth-hook';
import { attachSessionAuth } from '@/server/api-proxy';

// Server SDK calls authenticate via the sealed session; see server-auth-hook.ts for the inverted wiring.
registerAttachSessionAuth(attachSessionAuth);

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request);
  },
});

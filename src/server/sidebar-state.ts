import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { parseSidebarStateCookie } from '@/lib/sidebar-state.ts';

/** Reads the persisted sidebar preference from the current SSR request. */
export const getSidebarOpen = createServerFn({ method: 'GET' }).handler(() =>
  parseSidebarStateCookie(getRequest().headers.get('cookie')),
);

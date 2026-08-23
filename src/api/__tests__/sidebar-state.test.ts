import { describe, expect, it } from 'vitest';

import { parseSidebarStateCookie } from '@/lib/sidebar-state.ts';

describe('parseSidebarStateCookie', () => {
  it('reads a valid persisted sidebar state', () => {
    expect(
      parseSidebarStateCookie('other=value; sidebar_state=false'),
    ).toBeFalsy();
    expect(parseSidebarStateCookie('sidebar_state=true')).toBeTruthy();
  });

  it('uses the default for missing or invalid values', () => {
    expect(parseSidebarStateCookie(null)).toBeTruthy();
    expect(parseSidebarStateCookie('sidebar_state=unexpected')).toBeTruthy();
    expect(
      parseSidebarStateCookie('sidebar_state=unexpected', false),
    ).toBeFalsy();
  });
});

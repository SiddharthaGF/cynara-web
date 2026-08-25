import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/api/query-keys.ts';
import { AdminHubPage } from '@/features/hospital/AdminHubPage.tsx';

import {
  makeI18n,
  makeQueryClient,
  missingKeys,
  renderStatic,
} from './usersTestHarness.tsx';

vi.mock(import('@tanstack/react-router'), () => ({
  Link: (props: { children?: unknown }) =>
    createElement('a', {}, props.children as never),
  useParams: () => ({ locale: 'en' }) as never,
}));

// The unit under test is the hub's own section gating; sidebar and
// Navigation chrome stay out of scope, so the shell renders as a passthrough.
vi.mock(import('@/components/app-shell.tsx'), () => ({
  AppShell: ({ children }: { children?: unknown }) =>
    createElement('div', {}, children as never),
}));

/**
 * Renders the hub through the real capabilities pipeline: the effective
 * capabilities are seeded into the query cache, so useCapabilities,
 * buildCapabilityAbility, and the can('read', ...) branches all execute for
 * real. Static rendering fires no effects, so nothing refetches.
 */
function renderHub(capabilities: readonly string[]): string {
  const client = makeQueryClient();
  client.setQueryData(queryKeys.capabilities.current(), {
    actorId: 'actor-hub',
    capabilities: [...capabilities],
  });
  return renderStatic(createElement(AdminHubPage), {
    client,
    i18n: makeI18n('en'),
  });
}

function hubT(key: string): string {
  return makeI18n('en').t(`hospital:${key}`);
}

describe('AdminHubPage Users-section gating', () => {
  beforeEach(() => {
    missingKeys.length = 0;
  });

  it('renders the Users directory section when the grant includes users.read', () => {
    const html = renderHub(['users.read']);
    expect(html).toContain(hubT('hub.sections.users.title'));
    // Catalog-gated siblings stay withheld: the filter tracks each grant
    // Individually rather than rendering every registered section.
    expect(html).not.toContain(hubT('hub.sections.facilities.title'));
    expect(missingKeys).toStrictEqual([]);
  });

  it('withholds the Users section without users.read while granted catalog sections stay', () => {
    const html = renderHub(['catalog.read']);
    expect(html).not.toContain(hubT('hub.sections.users.title'));
    // Positive control: the page rendered and honors the catalog grant.
    expect(html).toContain(hubT('hub.sections.facilities.title'));
  });

  it('collapses to the bare hub without any section when nothing is granted', () => {
    const html = renderHub([]);
    expect(html).not.toContain(hubT('hub.sections.users.title'));
    expect(html).not.toContain(hubT('hub.sections.facilities.title'));
    expect(html).toContain(hubT('hub.title'));
  });
});

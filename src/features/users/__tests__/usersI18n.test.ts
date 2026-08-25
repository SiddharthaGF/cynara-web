import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { UserDetailView } from '@/features/users/UserDetailView.tsx';
import { UserNotFoundState } from '@/features/users/UserNotFoundState.tsx';
import usersEn from '@/i18n/locales/en/users.json';
import usersEs from '@/i18n/locales/es/users.json';

import {
  detailFixture,
  makeI18n,
  missingKeys,
  renderStatic,
} from './usersTestHarness.tsx';

vi.mock(import('@tanstack/react-router'), () => ({
  Link: (props: { children?: unknown }) =>
    createElement('a', {}, props.children as never),
}));

type JsonLeaf = string | Record<string, unknown>;

function keyPaths(value: JsonLeaf, prefix = ''): string[] {
  if (typeof value === 'string') {
    return prefix.length > 0 ? [prefix] : [];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child as JsonLeaf, prefix.length > 0 ? `${prefix}.${key}` : key),
  );
}

function collectMissing(): string[] {
  const captured = [...missingKeys];
  missingKeys.length = 0;
  return captured;
}

describe('users namespace i18n parity', () => {
  it('declares identical key trees for en and es', () => {
    const en = new Set(keyPaths(usersEn));
    const es = new Set(keyPaths(usersEs));
    expect([...es].filter((key) => !en.has(key))).toStrictEqual([]);
    expect([...en].filter((key) => !es.has(key))).toStrictEqual([]);
  });

  it('resolves every used key in both locales with no raw keys or warnings', () => {
    const views: { locale: 'en' | 'es' }[] = [
      { locale: 'en' },
      { locale: 'es' },
    ];

    for (const { locale } of views) {
      const i18n = makeI18n(locale);
      // Detail success, empty collections, and shared not-found cover every
      // Namespace branch these components can emit.
      renderStatic(
        createElement(UserDetailView, { user: detailFixture, locale }),
        { i18n },
      );
      renderStatic(
        createElement(UserDetailView, {
          user: {
            ...detailFixture,
            memberships: [],
            capabilities: [],
          },
          locale,
        }),
        { i18n },
      );
      renderStatic(createElement(UserNotFoundState, { locale }), { i18n });
    }

    const captured = collectMissing();
    expect(captured).toStrictEqual([]);
  });
});

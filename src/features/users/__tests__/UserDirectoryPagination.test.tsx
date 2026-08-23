import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { UserDirectoryPagination } from '@/features/users/UserDirectoryPagination.tsx';

import { makeI18n, renderStatic, usersT } from './usersTestHarness.tsx';

vi.mock(import('@tanstack/react-router'), () => ({
  Link: (props: { children?: unknown }) =>
    createElement('a', {}, props.children as never),
}));

function renderPager(page: number, totalCount: number, pageSize = 20): string {
  const onPageChange = vi.fn<(page: number) => void>();
  return renderStatic(
    createElement(UserDirectoryPagination, {
      page,
      pageSize,
      totalCount,
      onPageChange,
    }),
  );
}

describe('UserDirectoryPagination', () => {
  it('is absent while totalCount fits a single page', () => {
    expect(renderPager(1, 20)).toBe('');
    expect(renderPager(1, 0)).toBe('');
    expect(renderPager(1, 5)).toBe('');
  });

  it('renders every page number when the window fits without ellipses', () => {
    const html = renderPager(2, 100);
    expect(html).toContain('>1<');
    expect(html).toContain('>5<');
    expect(html).not.toContain('pagination-ellipsis');
  });

  it('keeps boundary pages and the current-page window stable', () => {
    // 400 items at 20 per page produce 20 pages; page 5 sits mid-window.
    const html = renderPager(5, 400);
    expect(html).toContain('>1<');
    expect(html).toContain('>20<');
    expect(html).toContain('>4<');
    expect(html).toContain('>5<');
    expect(html).toContain('>6<');
  });

  it('collapses distant pages into ellipsis placeholders', () => {
    const html = renderPager(5, 400);
    expect(html).toContain('pagination-ellipsis');
    expect(html).not.toContain('>10<');
  });

  it('marks exactly one page with aria-current="page"', () => {
    const html = renderPager(3, 100);
    expect(html).toContain('aria-current="page"');
    expect(html.match(/aria-current="page"/gu)?.length).toBe(1);
  });

  it('exposes previous and next controls without raw keys in both locales', () => {
    for (const locale of ['en', 'es'] as const) {
      const i18n = makeI18n(locale);
      const t = usersT(i18n);
      const onPageChange = vi.fn<(page: number) => void>();
      const html = renderStatic(
        createElement(UserDirectoryPagination, {
          page: 2,
          pageSize: 20,
          totalCount: 60,
          onPageChange,
        }),
        { i18n },
      );
      expect(html).toContain(t('pagination.previousPage'));
      expect(html).toContain(t('pagination.nextPage'));
      expect(html).not.toContain('pagination.');
    }
  });
});

import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useLayoutEffect } from 'react';

import { CapabilityRouteGuard } from '@/features/access-control/CapabilityRouteGuard.tsx';
import { i18nInstance } from '@/i18n/index.ts';
import { isAuthSpikeMode } from '@/lib/auth-mode.ts';
import { getDocumentMeta } from '@/lib/document-meta.ts';
import {
  DEFAULT_LOCALE,
  applyLocale,
  isAppLocale,
  persistLocale,
} from '@/lib/locale.ts';
import type { AppLocale } from '@/lib/locale.ts';
import { getMe, isAuthRoutePath } from '@/server/auth.ts';

async function syncI18nLocale(locale: AppLocale): Promise<void> {
  if (i18nInstance.language !== locale) {
    await i18nInstance.changeLanguage(locale);
  }
}

export const Route = createFileRoute('/$locale')({
  beforeLoad: async ({ params, location }) => {
    if (!isAppLocale(params.locale)) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirect
      throw redirect({
        to: '/$locale/forms',
        params: { locale: DEFAULT_LOCALE },
        replace: true,
      });
    }

    const { locale } = params;
    await syncI18nLocale(locale);

    // CYN-96 spike: server-side session guard. Auth-flow pages are exempt.
    // Everything else must resolve an authenticated actor through the BFF.
    // Otherwise it bounces to /$locale/login keeping the current path.
    if (isAuthSpikeMode() && !isAuthRoutePath(location.pathname)) {
      try {
        await getMe();
      } catch {
        // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirect
        throw redirect({
          to: '/$locale/login',
          params: { locale },
          search: {
            redirectTo: `${location.pathname}${location.searchStr}`,
          },
          replace: true,
        });
      }
    }

    return { locale };
  },
  head: ({ params }) => {
    const locale = isAppLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
    const meta = getDocumentMeta(locale);

    return {
      meta: [
        { title: meta.title },
        { name: 'description', content: meta.description },
      ],
    };
  },
  component: LocaleLayout,
});

function LocaleLayout(): JSX.Element {
  const { locale: routeLocale } = Route.useRouteContext();
  const locale: AppLocale = isAppLocale(routeLocale)
    ? routeLocale
    : DEFAULT_LOCALE;

  // BeforeLoad may be skipped on hydration; keep i18n aligned with the URL.
  useLayoutEffect(() => {
    void syncI18nLocale(locale);
    applyLocale(locale);
    persistLocale(locale);
  }, [locale]);

  return (
    <CapabilityRouteGuard>
      <Outlet />
    </CapabilityRouteGuard>
  );
}

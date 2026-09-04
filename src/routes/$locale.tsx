import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useLayoutEffect } from 'react';

import { CapabilityRouteGuard } from '@/features/access-control/CapabilityRouteGuard.tsx';
import { i18nInstance } from '@/i18n/index.ts';
import { getDocumentMeta } from '@/lib/document-meta.ts';
import {
  DEFAULT_LOCALE,
  applyLocale,
  isAppLocale,
  persistLocale,
} from '@/lib/locale.ts';
import type { AppLocale } from '@/lib/locale.ts';
import { getSelectedMembership } from '@/lib/workspace-membership.ts';
import {
  ensureSelectedHospital,
  getAuthStatus,
  isAuthRoutePath,
} from '@/server/auth.ts';
import type { HospitalMembership } from '@/server/hospital-workspace.ts';
import { getSidebarOpen } from '@/server/sidebar-state.ts';

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

    let memberships: HospitalMembership[] = [];
    let sidebarOpen = true;

    if (!isAuthRoutePath(location.pathname)) {
      const auth = await getAuthStatus();
      if (!auth.authenticated) {
        const returnTo = `${location.pathname}${location.searchStr}`;
        // The login flow already falls back to the locale root after sign-in.
        // A redirectTo that equals it would only clutter the URL.
        // Deep paths still keep it so sign-in returns to the page.
        // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirect
        throw redirect({
          to: '/$locale/login',
          params: { locale },
          search: returnTo === `/${locale}` ? {} : { redirectTo: returnTo },
          replace: true,
        });
      }
      const { hospitalCode, memberships: selectedMemberships } =
        await ensureSelectedHospital();
      memberships = selectedMemberships;
      sidebarOpen = await getSidebarOpen();

      return {
        locale,
        hospitalCode,
        memberships,
        workspace: getSelectedMembership(memberships, hospitalCode),
        sidebarOpen,
      };
    }

    return {
      locale,
      hospitalCode: null,
      memberships,
      workspace: null,
      sidebarOpen,
    };
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

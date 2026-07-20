import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useLayoutEffect } from 'react';

import { i18nInstance } from '@/i18n/index.ts';
import { getDocumentMeta } from '@/lib/document-meta.ts';
import {
  DEFAULT_LOCALE,
  applyLocale,
  isAppLocale,
  persistLocale,
} from '@/lib/locale.ts';
import type { AppLocale } from '@/lib/locale.ts';

async function syncI18nLocale(locale: AppLocale): Promise<void> {
  if (i18nInstance.language !== locale) {
    await i18nInstance.changeLanguage(locale);
  }
}

export const Route = createFileRoute('/$locale')({
  beforeLoad: async ({ params }) => {
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
  const { locale } = Route.useRouteContext();

  // BeforeLoad may be skipped on hydration; keep i18n aligned with the URL.
  useLayoutEffect(() => {
    void syncI18nLocale(locale);
    applyLocale(locale);
    persistLocale(locale);
  }, [locale]);

  return <Outlet />;
}

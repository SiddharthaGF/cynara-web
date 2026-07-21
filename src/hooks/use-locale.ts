import { useNavigate, useParams, useRouterState } from '@tanstack/react-router';
import { useCallback } from 'react';

import { applyLocale, isAppLocale, persistLocale } from '@/lib/locale.ts';
import type { AppLocale } from '@/lib/locale.ts';

export function useLocale(): {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  toggleLocale: () => void;
} {
  const { locale: localeParam } = useParams({ from: '/$locale' });
  const locale: AppLocale = isAppLocale(localeParam) ? localeParam : 'en';
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const setLocale = useCallback(
    (next: AppLocale): void => {
      if (next === locale) {
        return;
      }

      persistLocale(next);
      applyLocale(next);

      const nextPath = pathname.replace(
        /^\/(?<lang>en|es)(?=\/|$)/,
        `/${next}`,
      );
      void navigate({ href: nextPath });
    },
    [locale, navigate, pathname],
  );

  const toggleLocale = useCallback((): void => {
    setLocale(locale === 'en' ? 'es' : 'en');
  }, [locale, setLocale]);

  return { locale, setLocale, toggleLocale };
}

import { useCallback, useEffect, useState } from 'react';

import { i18nInstance } from '@/i18n/index.ts';
import {
  LOCALE_STORAGE_KEY,
  applyLocale,
  getStoredLocale,
  resolveLocale,
} from '@/lib/locale.ts';
import type { AppLocale } from '@/lib/locale.ts';

export function useLocale(): {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  toggleLocale: () => void;
} {
  const [locale, setLocaleState] = useState<AppLocale>(() =>
    resolveLocale(getStoredLocale()),
  );

  const setLocale = useCallback((next: AppLocale): void => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
    applyLocale(next);
    void i18nInstance.changeLanguage(next);
  }, []);

  const toggleLocale = useCallback((): void => {
    setLocale(locale === 'en' ? 'es' : 'en');
  }, [locale, setLocale]);

  useEffect(() => {
    applyLocale(locale);
    if (i18nInstance.language !== locale) {
      void i18nInstance.changeLanguage(locale);
    }
  }, [locale]);

  return { locale, setLocale, toggleLocale };
}

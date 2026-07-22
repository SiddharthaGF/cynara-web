import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';

import { DOCUMENT_META } from '@/lib/document-meta.ts';

export type AppLocale = 'en' | 'es';

const LOCALE_STORAGE_KEY = 'cynara-locale';
export const DEFAULT_LOCALE: AppLocale = 'en';
const SUPPORTED_LOCALES = new Set<AppLocale>(['en', 'es']);

export function isAppLocale(value: unknown): value is AppLocale {
  return (
    value !== null &&
    value !== undefined &&
    SUPPORTED_LOCALES.has(value as AppLocale)
  );
}

function getStoredLocale(): AppLocale | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return isAppLocale(stored) ? stored : null;
}

export function persistLocale(locale: AppLocale): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

function resolveLocale(stored: AppLocale | null): AppLocale {
  if (stored) {
    return stored;
  }

  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  return window.navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

function localeFromPathname(pathname: string): AppLocale | null {
  const match = /^\/(?<locale>en|es)(?=\/|$)/.exec(pathname);
  const locale = match?.groups?.locale;
  return isAppLocale(locale) ? locale : null;
}

function localeFromAcceptLanguage(header: string | undefined): AppLocale {
  if (!header) {
    return DEFAULT_LOCALE;
  }

  const preferred = header
    .split(',')
    .map((part) => part.trim().split(';')[0]?.toLowerCase() ?? '')
    .find((tag) => tag.startsWith('es') || tag.startsWith('en'));

  return preferred?.startsWith('es') ? 'es' : DEFAULT_LOCALE;
}

/** Locale for bootstrapping i18n before route beforeLoad runs (esp. client hydration). */
export function resolveBootLocale(): AppLocale {
  if (typeof window !== 'undefined') {
    return (
      localeFromPathname(window.location.pathname) ??
      resolveLocale(getStoredLocale())
    );
  }

  return DEFAULT_LOCALE;
}

export const resolvePreferredLocale = createIsomorphicFn()
  .client(() => resolveLocale(getStoredLocale()))
  .server(() => localeFromAcceptLanguage(getRequestHeader('accept-language')));

export function applyLocale(locale: AppLocale): void {
  document.documentElement.lang = locale;
}

const titleByLocaleJson = JSON.stringify({
  en: DOCUMENT_META.en.title,
  es: DOCUMENT_META.es.title,
});

/** Sets `lang` + document title from the URL before React paints. */
export const localeInitScript = `(function(){try{var m=location.pathname.match(/^\\/(en|es)(?=\\/|$)/);var l=m?m[1]:(function(){var s=localStorage.getItem('${LOCALE_STORAGE_KEY}');return s==='es'||s==='en'?s:(navigator.language.toLowerCase().startsWith('es')?'es':'en');})();document.documentElement.lang=l;var titles=${titleByLocaleJson};if(titles[l])document.title=titles[l];}catch(e){}})();`;

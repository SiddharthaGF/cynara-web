export type AppLocale = 'en' | 'es';

export const LOCALE_STORAGE_KEY = 'cynara-locale';
export const DEFAULT_LOCALE: AppLocale = 'en';
const SUPPORTED_LOCALES = new Set<AppLocale>(['en', 'es']);

function isAppLocale(value: string | null): value is AppLocale {
  return value !== null && SUPPORTED_LOCALES.has(value as AppLocale);
}

export function getStoredLocale(): AppLocale | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return isAppLocale(stored) ? stored : null;
}

export function resolveLocale(stored: AppLocale | null): AppLocale {
  if (stored) {
    return stored;
  }

  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  return window.navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function applyLocale(locale: AppLocale): void {
  document.documentElement.lang = locale;
}

export const localeInitScript = `(function(){try{var s=localStorage.getItem('${LOCALE_STORAGE_KEY}');var l=s==='es'||s==='en'?s:(navigator.language.toLowerCase().startsWith('es')?'es':'en');document.documentElement.lang=l;}catch(e){}})();`;

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'cynara-theme';

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

export function resolveTheme(stored: Theme | null): Theme {
  if (stored) {
    return stored;
  }

  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const themeInitScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s==='dark'||s==='light'?s:(d?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

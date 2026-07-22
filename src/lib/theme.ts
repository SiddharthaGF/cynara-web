export type Theme = 'light' | 'dark';
/**
 * User-selected preference. `'system'` means "follow the OS color scheme"
 * via `prefers-color-scheme`. The active rendered `Theme` is always
 * `'light' | 'dark'`.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'cynara-theme';

export function getStoredTheme(): ThemePreference | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : null;
}

/**
 * Convert a stored preference into the concrete theme that should be applied.
 * Falls back to the OS preference when the user picked `'system'` or nothing
 * yet.
 */
export function resolveTheme(preference: ThemePreference | null): Theme {
  if (preference === 'light' || preference === 'dark') {
    return preference;
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

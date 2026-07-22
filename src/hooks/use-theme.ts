import { useCallback, useEffect, useState } from 'react';

import {
  applyTheme,
  getStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
} from '@/lib/theme.ts';
import type { Theme, ThemePreference } from '@/lib/theme.ts';

export function useTheme(): {
  /** Concrete theme that is currently applied to the document. */
  theme: Theme;
  /** User-selected preference (may be `'system'`). */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => getStoredTheme() ?? 'system',
  );
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(preference));

  // Re-resolve the concrete theme when the user picks a different preference,
  // And keep it in sync with the OS color scheme while the preference is
  // `'system'`.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    function sync(): void {
      setTheme(resolveTheme(preference));
    }

    sync();

    if (preference !== 'system') {
      return undefined;
    }
    media.addEventListener('change', sync);
    return () => {
      media.removeEventListener('change', sync);
    };
  }, [preference]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    if (next === 'system') {
      // Persist a marker so we know the user opted into system mode and the
      // First paint keeps following the OS preference instead of pinning to
      // Whatever `resolveTheme` returned at boot.
      localStorage.setItem(THEME_STORAGE_KEY, 'system');
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    }
    setPreferenceState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }, [setPreference, theme]);

  return { theme, preference, setPreference, toggleTheme };
}

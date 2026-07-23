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
  // SSR-safe defaults must match the server render. Reading localStorage or
  // MatchMedia in useState causes a hydration mismatch (e.g. ThemeToggle
  // Aria-label). `themeInitScript` already applied the real class before paint.
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme() ?? 'system';
    setPreferenceState(stored);
    setTheme(resolveTheme(stored));
    setMounted(true);
  }, []);

  // Re-resolve the concrete theme when the user picks a different preference,
  // And keep it in sync with the OS color scheme while the preference is
  // `'system'`. Skip until mounted so we don't overwrite the init script's
  // Class with the SSR default.
  useEffect(() => {
    if (!mounted) {
      return undefined;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');

    function sync(): void {
      setTheme(resolveTheme(preference));
    }

    sync();

    if (preference !== 'system') {
      return undefined;
    }
    media.addEventListener('change', sync);
    return (): void => {
      media.removeEventListener('change', sync);
    };
  }, [preference, mounted]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    applyTheme(theme);
  }, [theme, mounted]);

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

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
  // SSR-safe defaults match the server render; localStorage/matchMedia in useState
  // Would cause a hydration mismatch. `themeInitScript` applied the real class pre-paint.
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme() ?? 'system';
    setPreferenceState(stored);
    setTheme(resolveTheme(stored));
    setMounted(true);
  }, []);

  // Re-resolve on preference change and follow the OS scheme while `system`;
  // Skip until mounted so the init script's class is not overwritten.
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
      // Persist a marker so the first paint keeps following the OS preference, not the boot-time resolution.
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

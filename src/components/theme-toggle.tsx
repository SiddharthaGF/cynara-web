import { Moon, Sun } from 'lucide-react';
import type { JSX } from 'react';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { useTheme } from '@/hooks/use-theme.ts';
import { cn } from '@/lib/utils.ts';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps): JSX.Element {
  const { t } = useTranslation('common');
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type='button'
      variant='outline'
      size='icon'
      aria-label={
        theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')
      }
      className={cn(
        'border-border/60 bg-background/80 backdrop-blur-sm',
        className,
      )}
      onClick={toggleTheme}
    >
      <Sun className='size-4 scale-100 rotate-0 opacity-100 transition-[transform,opacity] dark:scale-95 dark:-rotate-90 dark:opacity-0' />
      <Moon className='absolute size-4 scale-95 rotate-90 opacity-0 transition-[transform,opacity] dark:scale-100 dark:rotate-0 dark:opacity-100' />
    </Button>
  );
}

/** Syncs document title and meta when the active language changes. */
export function DocumentMeta(): null {
  const { t, i18n } = useTranslation('common');

  useLayoutEffect(() => {
    document.title = t('meta.title');
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute('content', t('meta.description'));
    }
    document.documentElement.lang = i18n.language;
  }, [t, i18n.language]);

  return null;
}

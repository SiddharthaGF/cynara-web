import { Link, useParams } from '@tanstack/react-router';
import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { CynaraMark } from '@/components/cynara-mark.tsx';
import { LocaleToggle } from '@/components/locale-toggle.tsx';
import { DocumentMeta, ThemeToggle } from '@/components/theme-toggle.tsx';
import { cn } from '@/lib/utils.ts';

interface AppShellProps {
  children: ReactNode;
  variant?: 'catalog' | 'minimal';
  className?: string;
}

export function AppShell({
  children,
  variant = 'catalog',
  className,
}: AppShellProps): JSX.Element {
  const { t } = useTranslation('common');
  const { locale } = useParams({ from: '/$locale' });

  return (
    <div className={cn('grain ambient-bg relative min-h-svh', className)}>
      <DocumentMeta />
      <header className='relative z-10 flex items-center justify-between border-b border-border/60 bg-background/70 px-6 py-4 backdrop-blur-md'>
        <Link
          to='/$locale/forms'
          params={{ locale }}
          className='transition-opacity hover:opacity-80'
        >
          <CynaraMark showWordmark />
        </Link>
        <div className='flex items-center gap-3'>
          {variant === 'catalog' ? (
            <span className='hidden text-xs font-medium tracking-widest text-muted-foreground uppercase sm:inline'>
              {t('clinicalForms')}
            </span>
          ) : null}
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className='relative z-10'>{children}</main>
    </div>
  );
}

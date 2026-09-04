import { Link, createFileRoute, useParams } from '@tanstack/react-router';
import { ArrowLeft, LoaderCircle, LogOut } from 'lucide-react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CynaraMark } from '@/components/cynara-mark.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { isAppLocale, type AppLocale } from '@/lib/locale.ts';
import { logout } from '@/server/auth.ts';

type LogoutState = 'signing-out' | 'done' | 'failed';

export const Route = createFileRoute('/$locale/logout')({
  component: LogoutPage,
});

function LogoutPage(): JSX.Element {
  const { t } = useTranslation('auth');
  const { locale: rawLocale } = useParams({ from: '/$locale' });
  const locale: AppLocale = isAppLocale(rawLocale) ? rawLocale : 'en';
  const [state, setState] = useState<LogoutState>('signing-out');

  useEffect(() => {
    let cancelled = false;
    void (async (): Promise<void> => {
      try {
        await logout();
        if (!cancelled) {
          setState('done');
        }
      } catch {
        if (!cancelled) {
          setState('failed');
        }
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, []);

  return (
    <main className='flex min-h-svh items-center justify-center px-6 py-10'>
      <Card className='w-full max-w-sm'>
        <CardContent className='gap-4'>
          <CynaraMark className='size-10' />
          {state === 'signing-out' ? (
            <p className='flex items-center gap-2 text-sm text-muted-foreground'>
              <LoaderCircle className='size-4 animate-spin' />
              {t('logout.signingOut')}
            </p>
          ) : (
            <>
              <h1 className='font-display text-xl font-semibold'>
                {state === 'done' ? t('logout.signedOut') : t('logout.title')}
              </h1>
              <p className='text-sm leading-relaxed text-muted-foreground'>
                {state === 'done'
                  ? t('logout.signedOutDescription')
                  : t('logout.failed')}
              </p>
              <div className='flex flex-wrap gap-2'>
                <Button
                  className='justify-center'
                  nativeButton={false}
                  render={
                    <Link
                      to='/$locale/login'
                      params={{ locale }}
                    />
                  }
                >
                  <LogOut className='size-4' />
                  {t('logout.signInAgain')}
                </Button>
                <Button
                  variant='outline'
                  className='justify-center'
                  nativeButton={false}
                  render={
                    <Link
                      to='/$locale'
                      params={{ locale }}
                    />
                  }
                >
                  <ArrowLeft className='size-4' />
                  {t('logout.backToStart')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

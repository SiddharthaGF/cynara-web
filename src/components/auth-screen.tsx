import { Link } from '@tanstack/react-router';
import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { CynaraMark } from '@/components/cynara-mark.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import type { AppLocale } from '@/lib/locale.ts';

interface AuthScreenProps {
  locale: AppLocale;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Optional kardex edge mark (e.g. invitation acceptance outcome).
   * Omit to render the card without a cinta.
   */
  cintaClassName?: string;
}

export function AuthScreen({
  locale,
  title,
  description,
  children,
  footer,
  cintaClassName,
}: AuthScreenProps): JSX.Element {
  const { t } = useTranslation('auth');

  return (
    <main className='flex min-h-svh items-center justify-center bg-muted/40 px-4 py-8 sm:px-6'>
      <div className='flex w-full max-w-md flex-col gap-6'>
        <Link
          to='/$locale/login'
          params={{ locale }}
          aria-label={t('brand')}
          className='mx-auto rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
        >
          <CynaraMark showWordmark />
        </Link>
        <Card className='border border-border bg-background shadow-sm'>
          {cintaClassName === undefined ? null : (
            <span
              aria-hidden='true'
              className={cintaClassName}
            />
          )}
          <CardHeader className='gap-2 text-center'>
            <CardTitle>
              <h1 className='font-display text-xl font-semibold'>{title}</h1>
            </CardTitle>
            {description ? (
              <CardDescription className='leading-relaxed'>
                {description}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className='flex flex-col gap-4'>{children}</CardContent>
          {footer ? (
            <CardFooter className='justify-center border-t-0 bg-transparent pt-0'>
              {footer}
            </CardFooter>
          ) : null}
        </Card>
      </div>
    </main>
  );
}

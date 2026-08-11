import { Link, createFileRoute, useParams } from '@tanstack/react-router';
import { ArrowLeft, KeyRound, LoaderCircle } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type JSX,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';

import { CynaraMark } from '@/components/cynara-mark.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { isAuthSpikeMode } from '@/lib/auth-mode.ts';
import { isAppLocale, type AppLocale } from '@/lib/locale.ts';
import { loginCallback, loginStart } from '@/server/auth.ts';

interface LoginSearch {
  redirectTo?: string;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

function parseLoginSearch(search: Record<string, unknown>): LoginSearch {
  return {
    redirectTo:
      typeof search.redirectTo === 'string' ? search.redirectTo : undefined,
    code: typeof search.code === 'string' ? search.code : undefined,
    state: typeof search.state === 'string' ? search.state : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
    errorDescription:
      typeof search.error_description === 'string'
        ? search.error_description
        : undefined,
  };
}

export const Route = createFileRoute('/$locale/login')({
  validateSearch: parseLoginSearch,
  component: LoginPage,
});

function LoginPage(): JSX.Element {
  const { t } = useTranslation('auth');
  const { locale: rawLocale } = useParams({ from: '/$locale' });
  const locale: AppLocale = isAppLocale(rawLocale) ? rawLocale : 'en';
  const search = Route.useSearch();
  const [hospitalCode, setHospitalCode] = useState('hosp-a');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const callbackRan = useRef(false);

  const { code, state } = search;
  const isCallback = typeof code === 'string' && typeof state === 'string';

  // Handles the identity-provider redirect back: exchange code + state once.
  // The successful exchange navigates to the originally requested path.
  useEffect(() => {
    let cancelled = false;
    if (
      isCallback &&
      typeof code === 'string' &&
      typeof state === 'string' &&
      !callbackRan.current
    ) {
      callbackRan.current = true;
      setIsSubmitting(true);
      void (async () => {
        try {
          const result = await loginCallback({
            data: { kind: 'callback', code, state },
          });
          if (cancelled) {
            return;
          }
          window.location.assign(result.redirectTo);
        } catch (callbackError) {
          if (cancelled) {
            return;
          }
          setError(
            callbackError instanceof Error
              ? callbackError.message
              : 'Sign-in failed',
          );
          setIsSubmitting(false);
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [isCallback, code, state]);

  async function handleStart(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const redirectTo = search.redirectTo ?? `/${locale}`;
      const result = await loginStart({
        data: { kind: 'start', locale, redirectTo, hospitalCode },
      });
      // Full-page navigation to the identity provider; it redirects back to this route with ?code&state.
      window.location.assign(result.authorizeUrl);
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : 'Sign-in failed',
      );
      setIsSubmitting(false);
    }
  }

  if (!isAuthSpikeMode()) {
    return (
      <AuthCard>
        <h1 className='font-display text-xl font-semibold'>
          {t('login.disabledTitle')}
        </h1>
        <p className='text-sm leading-relaxed text-muted-foreground'>
          {t('login.disabledDescription')}
        </p>
        <BackToStart locale={locale} />
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1 className='font-display text-xl font-semibold'>{t('login.title')}</h1>
      <p className='text-sm leading-relaxed text-muted-foreground'>
        {t('login.description')}
      </p>

      {search.error ? (
        <p
          role='alert'
          className='rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
        >
          {t('login.identityDenied')}
        </p>
      ) : null}
      {error ? (
        <p
          role='alert'
          className='rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
        >
          {t('login.callbackFailed', { detail: error })}
        </p>
      ) : null}

      {isCallback ? (
        <p className='flex items-center gap-2 text-sm text-muted-foreground'>
          <LoaderCircle className='size-4 animate-spin' />
          {t('login.signingIn')}
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            void handleStart(event);
          }}
          className='grid gap-3'
        >
          <div className='grid gap-1.5'>
            <Label htmlFor='hospital-code'>{t('login.hospitalLabel')}</Label>
            <Input
              id='hospital-code'
              name='hospitalCode'
              value={hospitalCode}
              onChange={(event) => setHospitalCode(event.target.value)}
              placeholder={t('login.hospitalPlaceholder')}
              autoComplete='organization'
              required
            />
          </div>
          <Button
            type='submit'
            disabled={isSubmitting}
            className='mt-1 justify-center'
          >
            {isSubmitting ? (
              <LoaderCircle className='size-4 animate-spin' />
            ) : (
              <KeyRound className='size-4' />
            )}
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

function AuthCard({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <main className='flex min-h-svh items-center justify-center px-6 py-10'>
      <Card className='w-full max-w-sm'>
        <CardContent className='gap-4'>
          <CynaraMark className='size-10' />
          {children}
        </CardContent>
      </Card>
    </main>
  );
}

function BackToStart({ locale }: { locale: AppLocale }): JSX.Element {
  const { t } = useTranslation('auth');
  return (
    <Button
      variant='outline'
      className='mt-2 justify-center'
      nativeButton={false}
      render={
        <Link
          to='/$locale/forms'
          params={{ locale }}
        />
      }
    >
      <ArrowLeft className='size-4' />
      {t('login.backToStart')}
    </Button>
  );
}

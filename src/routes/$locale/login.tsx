import { Link, createFileRoute, useParams } from '@tanstack/react-router';
import { KeyRound, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/components/auth-screen.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Field, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { AUTH_AUTHORIZE_PATH } from '@/lib/auth-authorize.ts';
import { isAppLocale, type AppLocale } from '@/lib/locale.ts';
import { loginCallback, loginStart } from '@/server/auth.ts';

interface LoginSearch {
  redirectTo?: string;
  code?: string;
  state?: string;
  error?: string;
  clientId?: string;
  requestUri?: string;
}

function isSafeOpaque(value: unknown, maxLength: number): value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxLength
  ) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    const code = value.codePointAt(index) ?? 0;
    if (code < 32 || code === 127) {
      return false;
    }
  }
  return true;
}

function parseLoginSearch(search: Record<string, unknown>): LoginSearch {
  return {
    redirectTo:
      typeof search.redirectTo === 'string' ? search.redirectTo : undefined,
    code: typeof search.code === 'string' ? search.code : undefined,
    state: typeof search.state === 'string' ? search.state : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
    clientId: isSafeOpaque(search.client_id, 256)
      ? search.client_id
      : undefined,
    requestUri: isSafeOpaque(search.request_uri, 2048)
      ? search.request_uri
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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const callbackRan = useRef(false);

  const { code, state } = search;
  const isCallback = typeof code === 'string' && typeof state === 'string';
  const isAuthorizationHandoff =
    isSafeOpaque(search.clientId, 256) && isSafeOpaque(search.requestUri, 2048);

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
        data: { kind: 'start', locale, redirectTo },
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

  const loginContent = (() => {
    if (isCallback) {
      return (
        <p className='flex items-center gap-2 text-sm text-muted-foreground'>
          <LoaderCircle className='size-4 animate-spin' />
          {t('login.signingIn')}
        </p>
      );
    }
    if (isAuthorizationHandoff) {
      return (
        <form
          method='post'
          action={AUTH_AUTHORIZE_PATH}
          className='grid gap-3'
          onSubmit={() => {
            setIsSubmitting(true);
          }}
        >
          <input
            type='hidden'
            name='client_id'
            value={search.clientId}
          />
          <input
            type='hidden'
            name='request_uri'
            value={search.requestUri}
          />
          <Field>
            <FieldLabel htmlFor='email'>{t('login.email')}</FieldLabel>
            <Input
              id='email'
              name='email'
              type='email'
              autoComplete='username'
              autoFocus
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor='password'>{t('login.password')}</FieldLabel>
            <Input
              id='password'
              name='password'
              type='password'
              autoComplete='current-password'
              required
            />
          </Field>
          <Button
            type='submit'
            disabled={isSubmitting}
            className='mt-1 w-full justify-center'
          >
            {isSubmitting ? (
              <LoaderCircle
                data-icon='inline-start'
                className='animate-spin'
              />
            ) : (
              <KeyRound data-icon='inline-start' />
            )}
            {isSubmitting ? t('login.signingIn') : t('login.submit')}
          </Button>
        </form>
      );
    }
    return (
      <form
        onSubmit={(event) => {
          void handleStart(event);
        }}
        className='grid gap-3'
      >
        <p className='text-sm text-muted-foreground'>
          {t('login.credentialsManaged')}
        </p>
        <Button
          type='submit'
          disabled={isSubmitting}
          className='mt-1 w-full justify-center'
        >
          {isSubmitting ? (
            <LoaderCircle
              data-icon='inline-start'
              className='animate-spin'
            />
          ) : (
            <KeyRound data-icon='inline-start' />
          )}
          {isSubmitting ? t('login.submitting') : t('login.submit')}
        </Button>
      </form>
    );
  })();

  return (
    <AuthScreen
      locale={locale}
      title={t('login.title')}
      description={t('login.description')}
      footer={
        isCallback ? null : (
          <Link
            to='/$locale/recovery'
            params={{ locale }}
            className='text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
          >
            {t('login.forgotPassword')}
          </Link>
        )
      }
    >
      {search.error && !isAuthorizationHandoff ? (
        <p
          role='alert'
          className='rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
        >
          {t('login.identityDenied')}
        </p>
      ) : null}
      {search.error === 'invalid_credentials' && isAuthorizationHandoff ? (
        <p
          role='alert'
          className='rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
        >
          {t('login.invalidCredentials')}
        </p>
      ) : null}
      {error ? (
        <p
          role='alert'
          className='rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
        >
          {t('login.callbackFailed')}
        </p>
      ) : null}

      {loginContent}
    </AuthScreen>
  );
}

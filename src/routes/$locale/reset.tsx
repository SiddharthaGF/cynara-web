import { Link, createFileRoute, useParams } from '@tanstack/react-router';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useState, type FormEvent, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/components/auth-screen.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { isAppLocale } from '@/lib/locale.ts';
import { resetPassword } from '@/server/account-recovery.ts';

interface ResetSearch {
  account?: string;
  token?: string;
}
function parseSearch(search: Record<string, unknown>): ResetSearch {
  return {
    account: typeof search.account === 'string' ? search.account : undefined,
    token: typeof search.token === 'string' ? search.token : undefined,
  };
}

export const Route = createFileRoute('/$locale/reset')({
  validateSearch: parseSearch,
  component: ResetPage,
});

function ResetPage(): JSX.Element {
  const { t } = useTranslation('auth');
  const { locale: rawLocale } = useParams({ from: '/$locale' });
  const locale = isAppLocale(rawLocale) ? rawLocale : 'en';
  const search = Route.useSearch();
  const [account, setAccount] = useState(search.account ?? '');
  const [token, setToken] = useState(search.token ?? '');
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(false);
    try {
      await resetPassword({
        data: { account: account.trim(), token, newPassword: password },
      });
      setDone(true);
    } catch {
      setDone(false);
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen
      locale={locale}
      title={t('reset.title')}
      description={t('reset.description')}
      footer={
        <Link
          to='/$locale/login'
          params={{ locale }}
          className='inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
        >
          <ArrowLeft aria-hidden='true' />
          {t('reset.back')}
        </Link>
      }
    >
      {error ? (
        <p
          role='alert'
          className='rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
        >
          {t('reset.error')}
        </p>
      ) : null}
      {done ? (
        <p role='status'>{t('reset.success')}</p>
      ) : (
        <form
          onSubmit={(event) => void submit(event)}
          className='flex flex-col gap-4'
        >
          <FieldGroup className='gap-3'>
            <Field>
              <FieldLabel htmlFor='account'>{t('reset.account')}</FieldLabel>
              <Input
                id='account'
                value={account}
                onChange={(event) => setAccount(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='token'>{t('reset.token')}</FieldLabel>
              <Input
                id='token'
                value={token}
                onChange={(event) => setToken(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='password'>{t('reset.password')}</FieldLabel>
              <Input
                id='password'
                type='password'
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </Field>
          </FieldGroup>
          <Button
            type='submit'
            disabled={pending}
            className='w-full justify-center'
          >
            {pending ? (
              <LoaderCircle
                data-icon='inline-start'
                className='animate-spin'
              />
            ) : null}
            {t('reset.submit')}
          </Button>
        </form>
      )}
    </AuthScreen>
  );
}

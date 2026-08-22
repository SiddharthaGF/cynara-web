import { Link, createFileRoute, useParams } from '@tanstack/react-router';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useState, type FormEvent, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/components/auth-screen.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { isAppLocale } from '@/lib/locale.ts';
import { requestPasswordRecovery } from '@/server/account-recovery.ts';

export const Route = createFileRoute('/$locale/recovery')({
  component: RecoveryPage,
});

function RecoveryPage(): JSX.Element {
  const { t } = useTranslation('auth');
  const { locale: rawLocale } = useParams({ from: '/$locale' });
  const locale = isAppLocale(rawLocale) ? rawLocale : 'en';
  const [account, setAccount] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(false);
    try {
      await requestPasswordRecovery({ data: account.trim() });
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen
      locale={locale}
      title={t('recovery.title')}
      description={t('recovery.description')}
      footer={
        <Link
          to='/$locale/login'
          params={{ locale }}
          className='inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
        >
          <ArrowLeft aria-hidden='true' />
          {t('recovery.back')}
        </Link>
      }
    >
      {error ? (
        <p
          role='alert'
          className='rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
        >
          {t('recovery.error')}
        </p>
      ) : null}
      {sent ? (
        <p
          role='status'
          className='text-sm'
        >
          {t('recovery.success')}
        </p>
      ) : (
        <form
          onSubmit={(event) => void submit(event)}
          className='flex flex-col gap-4'
        >
          <FieldGroup className='gap-3'>
            <Field>
              <FieldLabel htmlFor='account'>{t('recovery.account')}</FieldLabel>
              <Input
                id='account'
                value={account}
                onChange={(event) => setAccount(event.target.value)}
                required
                autoComplete='username'
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
            {t('recovery.submit')}
          </Button>
        </form>
      )}
    </AuthScreen>
  );
}

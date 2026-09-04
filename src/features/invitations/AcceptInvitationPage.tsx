import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import type { FormEvent, JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { describeApiError } from '@/api/error-message.ts';
import { AuthScreen } from '@/components/auth-screen.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Field, FieldError, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { isAppLocale } from '@/lib/locale.ts';
import {
  acceptInvitation,
  type AcceptInvitationMemberSummary,
} from '@/server/invitation-acceptance.ts';

type AcceptOutcome = 'form' | 'success' | 'invalid' | 'error';

interface AcceptInvitationPageProps {
  /** Raw token from the URL search param, already trimmed. */
  token: string;
}

/**
 * Public password-only acceptance. A missing token and every `accepted:false`
 * response render ONE generic invalid-link state (anti-enumeration); only a
 * 400/429-style error keeps the form open with the message surfaced.
 */
export function AcceptInvitationPage({
  token,
}: AcceptInvitationPageProps): JSX.Element {
  const { t } = useTranslation(['invitations', 'auth', 'api']);
  const { locale: rawLocale } = useParams({ from: '/$locale' });
  const locale = isAppLocale(rawLocale) ? rawLocale : 'en';

  const [password, setPassword] = useState('');
  const [outcome, setOutcome] = useState<AcceptOutcome>(
    token.length === 0 ? 'invalid' : 'form',
  );
  const [member, setMember] = useState<AcceptInvitationMemberSummary | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const backLink = (
    <Link
      to='/$locale/login'
      params={{ locale }}
      className='inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
    >
      <ArrowLeft aria-hidden='true' />
      {t('accept.backToLogin')}
    </Link>
  );

  const invalidState = (
    <AuthScreen
      locale={locale}
      title={t('accept.invalidTitle')}
      description={t('accept.invalidDescription')}
      footer={backLink}
    >
      <p
        role='status'
        className='text-sm text-muted-foreground'
      >
        {t('accept.invalidDescription')}
      </p>
    </AuthScreen>
  );

  if (outcome === 'invalid') {
    return invalidState;
  }

  if (outcome === 'success' && member !== null) {
    return (
      <AuthScreen
        locale={locale}
        title={t('accept.successTitle')}
        description={t('accept.successDescription')}
        footer={backLink}
      >
        <dl className='grid gap-2 text-sm'>
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>
              {t('accept.summaryEmail')}
            </dt>
            <dd className='text-right font-medium'>{member.user.email}</dd>
          </div>
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>
              {t('accept.summaryHospital')}
            </dt>
            <dd className='text-right font-medium'>{member.hospital.name}</dd>
          </div>
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>
              {t('accept.summaryActorId')}
            </dt>
            <dd className='text-right font-mono text-xs'>{member.actor.id}</dd>
          </div>
          <div className='flex justify-between gap-4'>
            <dt className='text-muted-foreground'>
              {t('accept.summaryCapabilities')}
            </dt>
            <dd className='text-right font-medium'>
              {member.capabilities.join(', ')}
            </dd>
          </div>
        </dl>
      </AuthScreen>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) {
      return;
    }
    setFieldError(null);
    setServerError(null);
    if (password.length === 0) {
      setFieldError(t('accept.passwordRequired'));
      return;
    }
    setPending(true);
    try {
      const result = await acceptInvitation({
        data: { token, password },
      });
      if (result.accepted) {
        setMember(result.member);
        setOutcome('success');
      } else {
        setOutcome('invalid');
      }
    } catch (err) {
      setOutcome('error');
      setServerError(describeApiError(err, t));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen
      locale={locale}
      title={t('accept.title')}
      description={t('accept.description')}
      footer={backLink}
    >
      {outcome === 'error' && serverError !== null ? (
        <p
          role='alert'
          className='rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
        >
          {serverError}
        </p>
      ) : null}
      <form
        onSubmit={(event) => void submit(event)}
        className='flex flex-col gap-4'
      >
        <Field>
          <FieldLabel htmlFor='accept-password'>
            {t('accept.passwordLabel')}
          </FieldLabel>
          <Input
            id='accept-password'
            type='password'
            value={password}
            minLength={6}
            required
            aria-invalid={fieldError !== null}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className='text-xs text-muted-foreground'>
            {t('accept.passwordHint')}
          </p>
          <FieldError errors={[{ message: fieldError ?? undefined }]} />
        </Field>
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
          {pending ? t('accept.submitting') : t('accept.submit')}
        </Button>
      </form>
    </AuthScreen>
  );
}

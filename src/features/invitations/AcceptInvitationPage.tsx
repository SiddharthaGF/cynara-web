import { useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import type { TFunction } from 'i18next';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import type { FormEvent, JSX } from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/api/client.ts';
import { describeApiError } from '@/api/error-message.ts';
import { queryKeys } from '@/api/query-keys.ts';
import { AuthScreen } from '@/components/auth-screen.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Field, FieldError, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { isAppLocale } from '@/lib/locale.ts';
import {
  acceptInvitation,
  type AcceptInvitationMemberSummary,
} from '@/server/invitation-acceptance.ts';
import { AcceptInvitationSuccess } from '@/features/invitations/AcceptInvitationSuccess.tsx';
import { passwordIssueKey } from '@/features/invitations/acceptInvitationPassword.ts';
import { PasswordRulesList } from '@/features/invitations/PasswordRulesList.tsx';

type AcceptOutcome = 'form' | 'success' | 'invalid' | 'error';

interface AcceptInvitationPageProps {
  /** Raw token from the URL search param, already trimmed. */
  token: string;
}

/**
 * Detects the backend's names-required 400 so the form can reveal the
 * name fields. Matches on the stable message fragment alone: the
 * server-fn transport serializes thrown errors as `{ message }` records
 * and drops the numeric status, so a status check would never match live.
 */
function isNamesRequiredError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const record = error as { message?: unknown };
  const message = typeof record.message === 'string' ? record.message : '';
  return message.toLowerCase().includes('given name and family name');
}

/**
 * Translate an `ApiError` for the acceptance flow. Mirrors the generic
 * `describeApiError` mapping but surfaces the backend's `message`/`detail`
 * for 400/422 responses so the user sees the real reason instead of a
 * canned "Algo salió mal" string.
 */
function describeAcceptError(error: unknown, translate: TFunction): string {
  if (
    error instanceof ApiError &&
    (error.status === 400 || error.status === 422)
  ) {
    const detail = error.message.trim();
    if (detail.length > 0) {
      return detail;
    }
    return translate('api:errors.validation');
  }
  return describeApiError(error, translate);
}

/**
 * Public invitation acceptance. A missing token and every `accepted:false`
 * response render ONE generic invalid-link state (anti-enumeration); only a
 * 400/429-style error keeps the form open with the message surfaced. When
 * the invitation carries no member names, the backend answers 400 asking
 * for them and the form reveals the name fields instead of failing.
 */
export function AcceptInvitationPage({
  token,
}: AcceptInvitationPageProps): JSX.Element {
  const { t } = useTranslation(['invitations', 'auth', 'api']);
  const queryClient = useQueryClient();
  const { locale: rawLocale } = useParams({ from: '/$locale' });
  const locale = isAppLocale(rawLocale) ? rawLocale : 'en';

  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [showNames, setShowNames] = useState(false);
  const [namesError, setNamesError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<AcceptOutcome>(
    token.length === 0 ? 'invalid' : 'form',
  );
  const [member, setMember] = useState<AcceptInvitationMemberSummary | null>(
    null,
  );
  const [activeRequest, setActiveRequest] = useState<number | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  // The pending guard serializes submits, and the busy state is keyed by
  // Request id so only the owning request can release it.
  const requestRef = useRef(0);
  const pending = activeRequest !== null;

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
      cintaClassName='kardex-cinta kardex-cinta-muted'
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
      <AcceptInvitationSuccess
        member={member}
        locale={locale}
        footer={backLink}
      />
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) {
      return;
    }
    setFieldError(null);
    setNamesError(null);
    setServerError(null);
    const issue = passwordIssueKey(password);
    if (issue !== null) {
      setFieldError(t(issue));
      return;
    }
    // Names are only required once the backend confirms the invitation
    // Carries none; from then on the form collects them like the password.
    if (
      showNames &&
      (name.trim().length === 0 || surname.trim().length === 0)
    ) {
      setNamesError(t('accept.namesRequired'));
      return;
    }
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setActiveRequest(requestId);
    try {
      const result = await acceptInvitation({
        data: {
          token,
          password,
          ...(showNames ? { name: name.trim(), surname: surname.trim() } : {}),
        },
      });
      if (result.accepted) {
        setMember(result.member);
        setOutcome('success');
        // Tell any admin workspace open in this browser session that the
        // Listing changed; no-ops if there is no admin cache yet.
        void queryClient.invalidateQueries({
          queryKey: queryKeys.invitations.all,
        });
      } else {
        setOutcome('invalid');
      }
    } catch (err) {
      // The backend asks for names with a stable message fragment; reveal
      // The fields with localized guidance instead of the raw message.
      if (isNamesRequiredError(err)) {
        setShowNames(true);
        setNamesError(t('accept.namesDescription'));
        return;
      }
      setOutcome('error');
      setServerError(describeAcceptError(err, t));
    } finally {
      // Ownership-aware clear in the state update: a stale response keeps
      // A newer request's busy state instead of releasing it.
      setActiveRequest((current) => (current === requestId ? null : current));
    }
  }

  return (
    <AuthScreen
      locale={locale}
      title={t('accept.title')}
      description={t('accept.description')}
      footer={backLink}
      cintaClassName={
        outcome === 'error'
          ? 'kardex-cinta kardex-cinta-review'
          : 'kardex-cinta'
      }
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
        noValidate
      >
        <Field data-invalid={fieldError !== null}>
          <FieldLabel htmlFor='accept-password'>
            {t('accept.passwordLabel')}
          </FieldLabel>
          <Input
            id='accept-password'
            type='password'
            autoComplete='new-password'
            value={password}
            aria-invalid={fieldError !== null}
            aria-describedby='accept-password-rules'
            onChange={(event) => {
              setPassword(event.target.value);
              if (fieldError !== null) {
                setFieldError(null);
              }
            }}
          />
          <p
            id='accept-password-rules'
            className='text-xs text-muted-foreground'
          >
            {t('accept.passwordHint')}
          </p>
          <PasswordRulesList password={password} />
          <FieldError errors={[{ message: fieldError ?? undefined }]} />
        </Field>
        {showNames ? (
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field data-invalid={namesError !== null}>
              <FieldLabel htmlFor='accept-name'>
                {t('accept.nameLabel')}
              </FieldLabel>
              <Input
                id='accept-name'
                autoComplete='given-name'
                value={name}
                aria-invalid={namesError !== null}
                onChange={(event) => {
                  setName(event.target.value);
                  if (namesError !== null) {
                    setNamesError(null);
                  }
                }}
              />
            </Field>
            <Field data-invalid={namesError !== null}>
              <FieldLabel htmlFor='accept-surname'>
                {t('accept.surnameLabel')}
              </FieldLabel>
              <Input
                id='accept-surname'
                autoComplete='family-name'
                value={surname}
                aria-invalid={namesError !== null}
                onChange={(event) => {
                  setSurname(event.target.value);
                  if (namesError !== null) {
                    setNamesError(null);
                  }
                }}
              />
            </Field>
          </div>
        ) : null}
        {showNames && namesError !== null ? (
          <FieldError errors={[{ message: namesError }]} />
        ) : null}
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

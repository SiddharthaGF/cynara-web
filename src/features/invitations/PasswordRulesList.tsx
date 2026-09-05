import { Check, X } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { PASSWORD_RULES } from '@/features/invitations/acceptInvitationPassword.ts';

/**
 * Live checklist of the password rules. Reads only the current value and
 * the shared rule table; validation itself stays in `passwordIssueKey`.
 */
export function PasswordRulesList({
  password,
}: {
  password: string;
}): JSX.Element {
  const { t } = useTranslation('invitations');
  return (
    <ul
      aria-label={t('accept.passwordHint')}
      className='flex flex-col gap-1 pt-1 text-xs'
    >
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <li
            key={rule.key}
            className={
              passed
                ? 'flex items-center gap-1.5 text-muted-foreground'
                : 'flex items-center gap-1.5 text-destructive'
            }
          >
            {passed ? (
              <Check
                aria-hidden='true'
                className='size-3.5 text-sage'
              />
            ) : (
              <X
                aria-hidden='true'
                className='size-3.5 text-destructive'
              />
            )}
            <span
              className={
                passed
                  ? 'text-muted-foreground line-through decoration-muted-foreground/40'
                  : ''
              }
            >
              {t(`accept.passwordRules.${rule.key}`)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

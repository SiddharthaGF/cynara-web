import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthScreen } from '@/components/auth-screen.tsx';
import type { AppLocale } from '@/lib/locale.ts';
import type { AcceptInvitationMemberSummary } from '@/server/invitation-acceptance.ts';

/**
 * Accepted-invitation summary. Pure presentational slice of the acceptance
 * page: the member record and footer link arrive as props, copy resolves
 * in place.
 */
export function AcceptInvitationSuccess({
  member,
  locale,
  footer,
}: {
  member: AcceptInvitationMemberSummary;
  locale: AppLocale;
  footer: ReactNode;
}): JSX.Element {
  const { t } = useTranslation('invitations');
  return (
    <AuthScreen
      locale={locale}
      title={t('accept.successTitle')}
      description={t('accept.successDescription')}
      footer={footer}
      cintaClassName='kardex-cinta kardex-cinta-success'
    >
      <dl className='grid gap-2 text-sm'>
        <div className='flex justify-between gap-4'>
          <dt className='text-muted-foreground'>{t('accept.summaryEmail')}</dt>
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
          <dd className='kardex-folio text-right font-mono text-xs'>
            {member.actor.id}
          </dd>
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

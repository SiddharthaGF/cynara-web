import { Link, useParams } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
import { PageHeader } from '@/components/page-header.tsx';
import { InvitationListWorkspace } from '@/features/invitations/InvitationListWorkspace.tsx';

export function InvitationListPage(): JSX.Element {
  const { t } = useTranslation(['invitations', 'common']);
  const { locale } = useParams({ from: '/$locale' });

  return (
    <AppShell variant='catalog'>
      <div className='mx-auto max-w-5xl px-6 py-6 pb-12'>
        <PageBreadcrumbs
          className='mb-4'
          items={[
            {
              key: 'home',
              label: t('common:nav.home'),
              link: (
                <Link
                  to='/$locale'
                  params={{ locale }}
                />
              ),
            },
            { key: 'invitations', label: t('title') },
          ]}
        />
        <PageHeader
          className='mb-6'
          title={t('title')}
          subtitle={t('subtitle')}
        />
        <InvitationListWorkspace />
      </div>
    </AppShell>
  );
}

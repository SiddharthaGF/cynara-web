import { Link } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  encounterStatusBadgeVariant,
  formatEncounterStatus,
} from '@/features/encounters/encounterForm.ts';

interface EncounterDetailHeaderProps {
  status: string;
  locale: string;
  patientId: string;
  /** Patient display name for the breadcrumb trail; omitted while loading. */
  patientName?: string;
}

export function EncounterDetailHeader({
  status,
  locale,
  patientId,
  patientName,
}: EncounterDetailHeaderProps): JSX.Element {
  const { t } = useTranslation(['encounters', 'common']);

  return (
    <header className='mb-6'>
      <PageBreadcrumbs
        className='mb-4'
        items={[
          {
            key: 'patients',
            label: t('common:breadcrumb.patients'),
            link: (
              <Link
                to='/$locale/patients'
                params={{ locale }}
              />
            ),
          },
          {
            key: 'patient',
            label: patientName ?? t('common:breadcrumb.clinicalRecord'),
            link: (
              <Link
                to='/$locale/patients/$id'
                params={{ locale, id: patientId }}
              />
            ),
          },
          { key: 'encounter', label: t('common:breadcrumb.encounter') },
        ]}
      />
      <div className='flex flex-wrap items-center gap-3'>
        <h1 className='font-display text-balance text-2xl font-semibold tracking-tight md:text-3xl'>
          {t('detail.title')}
        </h1>
        <Badge
          variant={encounterStatusBadgeVariant(status)}
          data-testid='encounter-detail-status'
        >
          {formatEncounterStatus(status, t)}
        </Badge>
      </div>
    </header>
  );
}

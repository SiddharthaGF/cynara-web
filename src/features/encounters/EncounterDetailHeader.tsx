import { Link } from '@tanstack/react-router';
import { ClipboardList } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
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
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <m.header
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
        }
        className='mb-8'
      >
        <PageBreadcrumbs
          className='mb-4'
          items={[
            {
              label: t('common:breadcrumb.patients'),
              link: (
                <Link
                  to='/$locale/patients'
                  params={{ locale }}
                />
              ),
            },
            {
              label: patientName ?? t('common:breadcrumb.clinicalRecord'),
              link: (
                <Link
                  to='/$locale/patients/$id'
                  params={{ locale, id: patientId }}
                />
              ),
            },
            { label: t('common:breadcrumb.encounter') },
          ]}
        />
        <p className='mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
          <ClipboardList className='size-3' />
          {t('detail.eyebrow')}
        </p>
        <div className='flex flex-wrap items-center gap-3'>
          <h1 className='font-display text-balance text-3xl font-semibold tracking-tight md:text-4xl'>
            {t('detail.title')}
          </h1>
          <Badge
            variant={encounterStatusBadgeVariant(status)}
            data-testid='encounter-detail-status'
          >
            {formatEncounterStatus(status, t)}
          </Badge>
        </div>
      </m.header>
    </LazyMotion>
  );
}

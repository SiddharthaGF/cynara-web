import { Link } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  clinicalDocumentStatusBadgeVariant,
  formatClinicalDocumentStatus,
} from '@/features/documents/clinicalDocumentForm.ts';

interface DocumentFormHeaderProps {
  definitionName: string;
  fallbackCode: string;
  status: string;
  locale: string;
  patientId: string;
  encounterId: string;
  /** Patient display name for the breadcrumb trail; omitted while loading. */
  patientName?: string;
}

export function DocumentFormHeader({
  definitionName,
  fallbackCode,
  status,
  locale,
  patientId,
  encounterId,
  patientName,
}: DocumentFormHeaderProps): JSX.Element {
  const { t } = useTranslation(['documents', 'common']);
  const reduceMotion = useReducedMotion();
  const title = definitionName || fallbackCode;

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
            {
              label: t('common:breadcrumb.encounter'),
              link: (
                <Link
                  to='/$locale/patients/$id/encounters/$encounterId'
                  params={{ locale, id: patientId, encounterId }}
                />
              ),
            },
            { label: title },
          ]}
        />
        <p className='mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
          <FileText className='size-3' />
          {t('detail.eyebrow')}
        </p>
        <div className='flex flex-wrap items-center gap-3'>
          <h1 className='font-display text-balance text-3xl font-semibold tracking-tight md:text-4xl'>
            {title}
          </h1>
          <Badge
            variant={clinicalDocumentStatusBadgeVariant(status)}
            data-testid='document-detail-status'
          >
            {formatClinicalDocumentStatus(status, t)}
          </Badge>
        </div>
      </m.header>
    </LazyMotion>
  );
}

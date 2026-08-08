import { Link } from '@tanstack/react-router';
import { ArrowLeft, FileText } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
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
}

export function DocumentFormHeader({
  definitionName,
  fallbackCode,
  status,
  locale,
  patientId,
  encounterId,
}: DocumentFormHeaderProps): JSX.Element {
  const { t } = useTranslation('documents');
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
        <Link
          to='/$locale/patients/$id/encounters/$encounterId'
          params={{ locale, id: patientId, encounterId }}
        >
          <Button
            variant='ghost'
            size='sm'
            className='mb-4 -ml-2'
          >
            <ArrowLeft className='size-4' />
            {t('detail.backToEncounter')}
          </Button>
        </Link>
        <p className='mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
          <FileText className='size-3' />
          {t('detail.eyebrow')}
        </p>
        <div className='flex flex-wrap items-center gap-3'>
          <h1 className='font-display text-balance text-3xl font-semibold tracking-tight md:text-4xl'>
            {definitionName || fallbackCode}
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

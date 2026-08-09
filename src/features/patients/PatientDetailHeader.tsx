import { Link } from '@tanstack/react-router';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { PatientDto } from '@/api/patients.ts';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';

interface PatientDetailHeaderProps {
  patient: PatientDto;
  locale: string;
  canCreateEncounter: boolean;
  canMutate: boolean;
  isDeleting: boolean;
  onNewEncounter: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PatientDetailHeader({
  patient,
  locale,
  canCreateEncounter,
  canMutate,
  isDeleting,
  onNewEncounter,
  onEdit,
  onDelete,
}: PatientDetailHeaderProps): JSX.Element {
  const { t } = useTranslation(['patients', 'api', 'common']);

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
            label: `${patient.givenName} ${patient.familyName}`,
          },
        ]}
      />
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <h1 className='font-display text-balance text-2xl font-semibold tracking-tight md:text-3xl'>
            {patient.givenName} {patient.familyName}
          </h1>
          <p className='mt-1.5 text-sm text-muted-foreground'>
            {t('detail.fields.mrn')}:{' '}
            <code className='text-foreground'>{patient.mrn}</code>
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {canCreateEncounter ? (
            <Button onClick={onNewEncounter}>
              <Plus className='size-4' />
              {t('detail.newEncounter')}
            </Button>
          ) : null}
          {canMutate ? (
            <>
              <Button
                variant='outline'
                onClick={onEdit}
              >
                <Pencil className='size-4' />
                {t('detail.edit')}
              </Button>
              <Button
                variant='destructive'
                onClick={onDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Spinner data-icon='inline-start' /> : null}
                <Trash2 className='size-4' />
                {t('detail.delete')}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

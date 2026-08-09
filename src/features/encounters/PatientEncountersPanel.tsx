import { Link } from '@tanstack/react-router';
import { ClipboardList, Plus } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { EncounterDto } from '@/api/encounters.ts';
import { isHistoricalEncounter } from '@/api/encounters.ts';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import {
  encounterStatusBadgeVariant,
  formatEncounterDateTime,
  formatEncounterStatus,
  formatEncounterType,
} from '@/features/encounters/encounterForm.ts';
import { usePatientEncounters } from '@/features/encounters/useEncountersCatalog.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

interface PatientEncountersPanelProps {
  patientId: string;
  locale: string;
  /** Opens the encounter-create dialog owned by the patient chart page. */
  onNewEncounter: () => void;
}

export function PatientEncountersPanel({
  patientId,
  locale,
  onNewEncounter,
}: PatientEncountersPanelProps): JSX.Element {
  const { t, i18n } = useTranslation(['encounters', 'api']);
  const { can } = useCapabilities();
  const { encounters, isLoading, error, isForbidden } =
    usePatientEncounters(patientId);

  return (
    <Card className='mt-8 border-border/70 shadow-sm'>
      <CardHeader className='flex flex-row items-start justify-between gap-4 space-y-0'>
        <div>
          <p className='mb-2 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
            {t('list.eyebrow')}
          </p>
          <CardTitle className='flex items-center gap-2 font-heading text-lg'>
            <ClipboardList className='size-4 text-muted-foreground' />
            {t('list.title')}
          </CardTitle>
          <CardDescription className='mt-1'>
            {t('list.subtitle')}
          </CardDescription>
        </div>
        {!isForbidden && can('write', 'Encounter') ? (
          <Button
            size='sm'
            onClick={onNewEncounter}
          >
            <Plus className='size-3.5' />
            {t('list.create')}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {isForbidden ? (
          <Alert variant='destructive'>
            <AlertDescription>{t('list.forbidden')}</AlertDescription>
          </Alert>
        ) : null}

        {!isForbidden && error ? (
          <Alert variant='destructive'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        ) : null}

        {!isLoading && !isForbidden && !error && encounters.length === 0 ? (
          <Empty className='min-h-36 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-8'>
            <EmptyHeader>
              <EmptyTitle>{t('list.emptyTitle')}</EmptyTitle>
              <EmptyDescription>{t('list.emptyDescription')}</EmptyDescription>
            </EmptyHeader>
            {!isForbidden && can('write', 'Encounter') ? (
              <Button
                size='sm'
                className='mt-4'
                onClick={onNewEncounter}
              >
                <Plus className='size-3.5' />
                {t('list.create')}
              </Button>
            ) : null}
          </Empty>
        ) : null}

        {!isLoading && encounters.length > 0 ? (
          <ul className='divide-y divide-border/70 rounded-xl border border-border/70'>
            {encounters.map((encounter) => (
              <EncounterListRow
                key={encounter.id}
                encounter={encounter}
                locale={locale}
                patientId={patientId}
                language={i18n.language}
              />
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EncounterListRow({
  encounter,
  locale,
  patientId,
  language,
}: {
  encounter: EncounterDto;
  locale: string;
  patientId: string;
  language: string;
}): JSX.Element {
  const { t } = useTranslation(['encounters']);
  const historical = isHistoricalEncounter(encounter.status);

  return (
    <li
      className={
        historical
          ? 'flex flex-col gap-3 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
          : 'flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
      }
      data-status={encounter.status}
      data-historical={historical ? 'true' : 'false'}
    >
      <div className='min-w-0 space-y-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='font-medium'>
            {formatEncounterType(encounter.type, t)}
          </span>
          <Badge variant={encounterStatusBadgeVariant(encounter.status)}>
            {formatEncounterStatus(encounter.status, t)}
          </Badge>
          {historical ? (
            <span className='text-xs text-muted-foreground'>
              {t('list.historicalHint')}
            </span>
          ) : null}
        </div>
        <p className='text-sm text-muted-foreground'>
          {t('list.columns.startedAt')}:{' '}
          {formatEncounterDateTime(encounter.startedAt, language)}
          {encounter.endedAt
            ? ` · ${t('list.columns.endedAt')}: ${formatEncounterDateTime(encounter.endedAt, language)}`
            : null}
        </p>
      </div>
      <Button
        variant='outline'
        size='sm'
        nativeButton={false}
        render={
          <Link
            to='/$locale/patients/$id/encounters/$encounterId'
            params={{
              locale,
              id: patientId,
              encounterId: encounter.id,
            }}
          />
        }
      >
        {t('list.viewDetail')}
      </Button>
    </li>
  );
}

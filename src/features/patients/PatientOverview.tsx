import { Link } from '@tanstack/react-router';
import { ClipboardList, FileText, Plus } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { isOpenEncounter } from '@/api/encounters.ts';
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
  clinicalDocumentStatusBadgeVariant,
  formatClinicalDocumentDateTime,
  formatClinicalDocumentStatus,
} from '@/features/documents/clinicalDocumentForm.ts';
import { EncounterAvailableForms } from '@/features/documents/EncounterAvailableForms.tsx';
import { usePatientDocuments } from '@/features/documents/useClinicalDocumentsCatalog.ts';
import {
  encounterStatusBadgeVariant,
  formatEncounterDateTime,
  formatEncounterStatus,
  formatEncounterType,
} from '@/features/encounters/encounterForm.ts';
import { usePatientEncounters } from '@/features/encounters/useEncountersCatalog.ts';
import { useDocumentDefinitions } from '@/features/hospital/useDocumentCatalogAdmin.ts';

interface PatientOverviewProps {
  patientId: string;
  locale: string;
  onNewEncounter: () => void;
  onShowAllEncounters: () => void;
  onShowAllDocuments: () => void;
}

/**
 * Compact clinical summary for the patient chart overview tab: the most recent
 * open consultation and the most recent documents, each with a clear next
 * action instead of a bare "no data" empty state.
 */
export function PatientOverview({
  patientId,
  locale,
  onNewEncounter,
  onShowAllEncounters,
  onShowAllDocuments,
}: PatientOverviewProps): JSX.Element {
  return (
    <div className='mt-8 space-y-8'>
      <OpenEncounterCard
        patientId={patientId}
        locale={locale}
        onNewEncounter={onNewEncounter}
        onShowAll={onShowAllEncounters}
      />
      <RecentDocumentsCard
        patientId={patientId}
        locale={locale}
        onShowAll={onShowAllDocuments}
      />
    </div>
  );
}

function OpenEncounterCard({
  patientId,
  locale,
  onNewEncounter,
  onShowAll,
}: {
  patientId: string;
  locale: string;
  onNewEncounter: () => void;
  onShowAll: () => void;
}): JSX.Element {
  const { t, i18n } = useTranslation(['encounters', 'patients']);
  const { encounters, isLoading, isForbidden } =
    usePatientEncounters(patientId);
  const open = encounters.find((encounter) =>
    isOpenEncounter(encounter.status),
  );

  return (
    <Card className='border-border/70 shadow-sm'>
      <CardHeader className='flex flex-row items-start justify-between gap-4 space-y-0'>
        <div>
          <CardTitle className='flex items-center gap-2 font-heading text-lg'>
            <ClipboardList className='size-4 text-muted-foreground' />
            {t('patients:detail.overview.openEncounter')}
          </CardTitle>
        </div>
        {encounters.length > 0 ? (
          <Button
            variant='ghost'
            size='sm'
            onClick={onShowAll}
          >
            {t('patients:detail.overview.viewAllEncounters')}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-12 w-full' />
          </div>
        ) : null}

        {!isLoading && !isForbidden && open ? (
          <div className='space-y-3'>
            <div className='flex flex-col gap-3 rounded-xl border border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='min-w-0 space-y-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-medium'>
                    {formatEncounterType(open.type, t)}
                  </span>
                  <Badge variant={encounterStatusBadgeVariant(open.status)}>
                    {formatEncounterStatus(open.status, t)}
                  </Badge>
                </div>
                <p className='text-sm text-muted-foreground'>
                  {t('list.columns.startedAt')}:{' '}
                  {formatEncounterDateTime(open.startedAt, i18n.language)}
                </p>
              </div>
              <Button
                variant='outline'
                size='sm'
                nativeButton={false}
                render={
                  <Link
                    to='/$locale/patients/$id/encounters/$encounterId'
                    params={{ locale, id: patientId, encounterId: open.id }}
                  />
                }
              >
                {t('list.viewDetail')}
              </Button>
            </div>

            {/*
              Forms published for this consultation's facility and area are
              reachable directly from the chart, keeping the most frequent
              clinical action within two clicks of the record.
            */}
            <EncounterAvailableForms
              compact
              patientId={patientId}
              encounterId={open.id}
              facilityId={open.facilityId}
              clinicalAreaId={open.clinicalAreaId}
              locale={locale}
            />
          </div>
        ) : null}

        {!isLoading && !isForbidden && !open ? (
          <Empty className='min-h-32 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-6'>
            <EmptyHeader>
              <EmptyTitle>
                {t('patients:detail.overview.noOpenEncounter')}
              </EmptyTitle>
              <EmptyDescription>
                {t('patients:detail.overview.noOpenEncounterHint')}
              </EmptyDescription>
            </EmptyHeader>
            <Button
              size='sm'
              className='mt-4'
              onClick={onNewEncounter}
            >
              <Plus className='size-3.5' />
              {t('patients:detail.newEncounter')}
            </Button>
          </Empty>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RecentDocumentsCard({
  patientId,
  locale,
  onShowAll,
}: {
  patientId: string;
  locale: string;
  onShowAll: () => void;
}): JSX.Element {
  const { t, i18n } = useTranslation(['documents', 'patients']);
  const { documents, isLoading, isForbidden } = usePatientDocuments(patientId);
  const definitionLookup = useDocumentDefinitions({ includeRetired: true });
  const recent = documents.slice(0, 3);

  const definitionName = (definitionId: string): string =>
    definitionLookup.items.find((item) => item.id === definitionId)?.name ?? '';

  return (
    <Card className='border-border/70 shadow-sm'>
      <CardHeader className='flex flex-row items-start justify-between gap-4 space-y-0'>
        <div>
          <CardTitle className='flex items-center gap-2 font-heading text-lg'>
            <FileText className='size-4 text-muted-foreground' />
            {t('patients:detail.overview.recentDocuments')}
          </CardTitle>
          <CardDescription className='mt-1'>
            {t('timeline.subtitle')}
          </CardDescription>
        </div>
        {documents.length > 0 ? (
          <Button
            variant='ghost'
            size='sm'
            onClick={onShowAll}
          >
            {t('patients:detail.overview.viewAllDocuments')}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-12 w-full' />
          </div>
        ) : null}

        {!isLoading && !isForbidden && recent.length > 0 ? (
          <ul className='divide-y divide-border/70 rounded-xl border border-border/70'>
            {recent.map((document) => (
              <li
                key={document.id}
                className='flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
              >
                <div className='min-w-0 space-y-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='font-medium'>
                      {definitionName(document.documentDefinitionId) ||
                        t('list.documentName')}
                    </span>
                    <Badge
                      variant={clinicalDocumentStatusBadgeVariant(
                        document.status,
                      )}
                    >
                      {formatClinicalDocumentStatus(document.status, t)}
                    </Badge>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    {t('list.columns.createdAt')}:{' '}
                    {formatClinicalDocumentDateTime(
                      document.createdAt,
                      i18n.language,
                    )}
                  </p>
                </div>
                <Link
                  to='/$locale/patients/$id/encounters/$encounterId/documents/$documentId'
                  params={{
                    locale,
                    id: document.patientId,
                    encounterId: document.encounterId,
                    documentId: document.id,
                  }}
                >
                  <Button
                    variant='outline'
                    size='sm'
                  >
                    {t('list.viewDetail')}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {!isLoading && !isForbidden && documents.length === 0 ? (
          <Empty className='min-h-32 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-6'>
            <EmptyHeader>
              <EmptyTitle>
                {t('patients:detail.overview.noRecentDocuments')}
              </EmptyTitle>
              <EmptyDescription>
                {t('patients:detail.overview.noRecentDocumentsHint')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
      </CardContent>
    </Card>
  );
}

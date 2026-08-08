import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router';
import { ArrowLeft, Pencil, Plus, Trash2, UserCircle } from 'lucide-react';
import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isForbiddenPatientError } from '@/api/patients.ts';
import { AppShell } from '@/components/app-shell.tsx';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
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
import { Spinner } from '@/components/ui/spinner.tsx';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.tsx';
import { InsufficientPermissionNotice } from '@/features/access-control/InsufficientPermissionNotice.tsx';
import { PatientDocumentsTimeline } from '@/features/documents/PatientDocumentsTimeline.tsx';
import { EncounterCreateDialog } from '@/features/encounters/EncounterCreateDialog.tsx';
import { PatientEncountersPanel } from '@/features/encounters/PatientEncountersPanel.tsx';
import { PatientJourneyPanel } from '@/features/journeys/PatientJourneyPanel.tsx';
import type { PatientDetailTab } from '@/features/patients/patientDetailSearch.ts';
import { PatientEditForm } from '@/features/patients/PatientEditForm.tsx';
import { PatientOverview } from '@/features/patients/PatientOverview.tsx';
import { PatientView } from '@/features/patients/PatientView.tsx';
import {
  usePatientDetail,
  useDeletePatient,
} from '@/features/patients/usePatientsCatalog.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

export function PatientDetailPage(): JSX.Element {
  const { t } = useTranslation(['patients', 'api', 'common']);
  const { locale, id }: { locale: string; id: string } = useParams({
    from: '/$locale/patients/$id',
  });
  const navigate = useNavigate();
  const { can } = useCapabilities();
  const { tab } = useSearch({ from: '/$locale/patients/$id' });

  const { patient, isLoading, error: loadError } = usePatientDetail(id);
  const {
    deletePatient,
    isDeleting,
    error: deleteError,
    isSuccess: deleteSuccess,
  } = useDeletePatient();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mutationForbidden, setMutationForbidden] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const selectTab = useCallback(
    (nextTab: PatientDetailTab) => {
      void navigate({
        to: '/$locale/patients/$id',
        params: { locale, id },
        search: { tab: nextTab },
      });
    },
    [id, locale, navigate],
  );

  const handleDelete = useCallback(async () => {
    if (!patient) {
      return;
    }
    try {
      await deletePatient({
        id: patient.id,
        rowVersion: patient.rowVersion,
      });
      setShowDeleteConfirm(false);
      void navigate({ to: '/$locale/patients', params: { locale } });
    } catch (err) {
      if (isForbiddenPatientError(err)) {
        setMutationForbidden(true);
      }
    }
  }, [patient, deletePatient, navigate, locale]);

  if (isLoading) {
    return (
      <AppShell variant='catalog'>
        <div className='mx-auto max-w-3xl px-6 py-6'>
          <Skeleton className='mb-4 h-8 w-48' />
          <Skeleton className='mb-2 h-6 w-96' />
          <Skeleton className='h-64 w-full' />
        </div>
      </AppShell>
    );
  }

  if (loadError || !patient) {
    return (
      <AppShell variant='catalog'>
        <div className='mx-auto max-w-3xl px-6 py-6'>
          <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
            <EmptyHeader>
              <EmptyTitle className='text-lg'>
                {t('detail.notFound')}
              </EmptyTitle>
              <EmptyDescription>
                {loadError ?? t('detail.loadError')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
          <div className='mt-4'>
            <Button
              variant='ghost'
              nativeButton={false}
              render={
                <Link
                  to='/$locale/patients'
                  params={{ locale }}
                />
              }
            >
              <ArrowLeft className='size-4' />
              {t('detail.backToList')}
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const canWrite = can('write', 'Patient');
  const canMutate = !mutationForbidden && canWrite;
  const canCreateEncounter = can('write', 'Encounter');
  const openNewEncounter = (): void => {
    setCreateOpen(true);
  };

  return (
    <AppShell variant='catalog'>
      <div className='mx-auto max-w-3xl px-6 py-6 pb-12'>
        <header className='mb-6'>
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
              { label: `${patient.givenName} ${patient.familyName}` },
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
                <Button
                  data-testid='hc-new-encounter'
                  onClick={openNewEncounter}
                >
                  <Plus className='size-4' />
                  {t('detail.newEncounter')}
                </Button>
              ) : null}
              {canMutate ? (
                <>
                  <Button
                    variant='outline'
                    data-testid='patient-detail-edit'
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className='size-4' />
                    {t('detail.edit')}
                  </Button>
                  <Button
                    variant='destructive'
                    data-testid='patient-detail-delete'
                    onClick={() => setShowDeleteConfirm(true)}
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

        {mutationForbidden ? (
          <Alert
            variant='destructive'
            className='mb-6'
            data-testid='patient-detail-forbidden'
          >
            <AlertDescription>
              {t('permissions.forbiddenMutate')}
            </AlertDescription>
          </Alert>
        ) : null}

        {!canWrite && !mutationForbidden ? (
          <InsufficientPermissionNotice descriptionKey='access.patientsWriteMissing' />
        ) : null}

        {(deleteError || deleteSuccess) && (
          <Alert
            variant={deleteSuccess ? 'default' : 'destructive'}
            className='mb-6'
          >
            <AlertDescription>
              {deleteSuccess ? t('detail.deleteSuccess') : deleteError}
            </AlertDescription>
          </Alert>
        )}

        {isEditing && canMutate ? (
          <Card className='border-border/70 shadow-sm'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 font-heading text-lg'>
                <UserCircle className='size-4 text-muted-foreground' />
                {t('detail.editTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PatientEditForm
                patient={patient}
                onCancel={() => setIsEditing(false)}
                onSaved={() => setIsEditing(false)}
              />
            </CardContent>
          </Card>
        ) : (
          <Tabs
            value={tab}
            onValueChange={(value) => {
              selectTab(value as PatientDetailTab);
            }}
          >
            <TabsList>
              <TabsTrigger
                value='overview'
                data-testid='hc-tab-overview'
              >
                {t('detail.tabs.overview')}
              </TabsTrigger>
              <TabsTrigger
                value='encounters'
                data-testid='hc-tab-encounters'
              >
                {t('detail.tabs.encounters')}
              </TabsTrigger>
              <TabsTrigger
                value='documents'
                data-testid='hc-tab-documents'
              >
                {t('detail.tabs.documents')}
              </TabsTrigger>
              <TabsTrigger
                value='journeys'
                data-testid='hc-tab-journeys'
              >
                {t('detail.tabs.journeys')}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value='overview'
              className='mt-6'
            >
              <PatientView patient={patient} />
              <PatientOverview
                patientId={patient.id}
                locale={locale}
                onNewEncounter={openNewEncounter}
                onShowAllEncounters={() => selectTab('encounters')}
                onShowAllDocuments={() => selectTab('documents')}
              />
            </TabsContent>

            <TabsContent
              value='encounters'
              className='mt-6'
            >
              <PatientEncountersPanel
                patientId={patient.id}
                locale={locale}
                onNewEncounter={openNewEncounter}
              />
            </TabsContent>

            <TabsContent
              value='documents'
              className='mt-6'
            >
              <PatientDocumentsTimeline
                patientId={patient.id}
                locale={locale}
                onNewEncounter={
                  canCreateEncounter ? openNewEncounter : undefined
                }
              />
            </TabsContent>

            <TabsContent
              value='journeys'
              className='mt-6'
            >
              <PatientJourneyPanel
                patientId={patient.id}
                locale={locale}
                onNewEncounter={openNewEncounter}
              />
            </TabsContent>
          </Tabs>
        )}

        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
        >
          <AlertDialogContent
            data-testid='patient-delete-confirm'
            aria-label={t('detail.deleteConfirmTitle')}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('detail.deleteConfirmTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('detail.deleteConfirmBody')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError ? (
              <Alert
                variant='destructive'
                className='mt-2'
              >
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                {t('detail.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                variant='destructive'
                data-testid='patient-delete-confirm-submit'
                onClick={() => {
                  void handleDelete();
                }}
                disabled={isDeleting}
              >
                {isDeleting ? <Spinner data-icon='inline-start' /> : null}
                {t('detail.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <EncounterCreateDialog
          key={createOpen ? 'open' : 'closed'}
          patientId={patient.id}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onForbidden={() => {
            setMutationForbidden(true);
          }}
          onCreated={(encounterId) => {
            setCreateOpen(false);
            void navigate({
              to: '/$locale/patients/$id/encounters/$encounterId',
              params: { locale, id: patient.id, encounterId },
            });
          }}
        />
      </div>
    </AppShell>
  );
}

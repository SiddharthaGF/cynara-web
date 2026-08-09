import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { UserCircle } from 'lucide-react';
import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isForbiddenPatientError } from '@/api/patients.ts';
import { AppShell } from '@/components/app-shell.tsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { EncounterCreateDialog } from '@/features/encounters/EncounterCreateDialog.tsx';
import { PatientDeleteConfirmDialog } from '@/features/patients/PatientDeleteConfirmDialog.tsx';
import { PatientDetailAlerts } from '@/features/patients/PatientDetailAlerts.tsx';
import { PatientDetailHeader } from '@/features/patients/PatientDetailHeader.tsx';
import { PatientDetailLoading } from '@/features/patients/PatientDetailLoading.tsx';
import { PatientDetailNotFound } from '@/features/patients/PatientDetailNotFound.tsx';
import type { PatientDetailTab } from '@/features/patients/patientDetailSearch.ts';
import { PatientDetailTabs } from '@/features/patients/PatientDetailTabs.tsx';
import { PatientEditForm } from '@/features/patients/PatientEditForm.tsx';
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
    return <PatientDetailLoading />;
  }

  if (loadError || !patient) {
    return (
      <PatientDetailNotFound
        locale={locale}
        error={loadError}
      />
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
      <div
        className='mx-auto max-w-3xl px-6 py-6 pb-12'
        data-testid='patient-detail-view'
      >
        <PatientDetailHeader
          patient={patient}
          locale={locale}
          canCreateEncounter={canCreateEncounter}
          canMutate={canMutate}
          isDeleting={isDeleting}
          onNewEncounter={openNewEncounter}
          onEdit={() => setIsEditing(true)}
          onDelete={() => setShowDeleteConfirm(true)}
        />

        <PatientDetailAlerts
          mutationForbidden={mutationForbidden}
          canWrite={canWrite}
          deleteError={deleteError}
          deleteSuccess={deleteSuccess}
        />

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
          <PatientDetailTabs
            patient={patient}
            locale={locale}
            tab={tab}
            canCreateEncounter={canCreateEncounter}
            onTabChange={selectTab}
            onNewEncounter={openNewEncounter}
          />
        )}

        <PatientDeleteConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          onConfirm={() => {
            void handleDelete();
          }}
          isDeleting={isDeleting}
          deleteError={deleteError}
        />

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

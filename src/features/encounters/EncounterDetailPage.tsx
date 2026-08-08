import { useParams } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  isForbiddenEncounterError,
  isHistoricalEncounter,
  isOpenEncounter,
  isStaleEncounterError,
} from '@/api/encounters.ts';
import { describeApiError } from '@/api/error-message.ts';
import { EncounterDocumentsPanel } from '@/features/documents/EncounterDocumentsPanel.tsx';
import { EncounterDetailAlerts } from '@/features/encounters/EncounterDetailAlerts.tsx';
import { EncounterDetailCard } from '@/features/encounters/EncounterDetailCard.tsx';
import { EncounterDetailHeader } from '@/features/encounters/EncounterDetailHeader.tsx';
import {
  EncounterDetailLoading,
  EncounterDetailShell,
  EncounterDetailUnavailable,
} from '@/features/encounters/EncounterDetailStates.tsx';
import {
  EncounterTransitionConfirmDialog,
  type EncounterTransitionKind,
} from '@/features/encounters/EncounterTransitionConfirmDialog.tsx';
import {
  useEncounterDetail,
  useEncounterTransitions,
} from '@/features/encounters/useEncountersCatalog.ts';
import { EncounterJourneyPanel } from '@/features/journeys/EncounterJourneyPanel.tsx';
import { usePatientDetail } from '@/features/patients/usePatientsCatalog.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

export function EncounterDetailPage(): JSX.Element {
  const { t } = useTranslation(['encounters', 'api']);
  const { can } = useCapabilities();
  const {
    locale,
    id: patientId,
    encounterId,
  }: { locale: string; id: string; encounterId: string } = useParams({
    from: '/$locale/patients/$id_/encounters/$encounterId',
  });

  const { encounter, isLoading, error, isForbidden, refetch } =
    useEncounterDetail(encounterId);
  const { patient } = usePatientDetail(patientId);
  const patientName = patient
    ? `${patient.givenName} ${patient.familyName}`
    : undefined;
  const {
    complete,
    cancel,
    enterInError,
    isTransitioning,
    error: transitionError,
    reset: resetTransition,
  } = useEncounterTransitions();

  const [pendingAction, setPendingAction] =
    useState<EncounterTransitionKind | null>(null);
  const [mutationForbidden, setMutationForbidden] = useState(false);
  const [staleError, setStaleError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runTransition = async (
    kind: EncounterTransitionKind,
  ): Promise<void> => {
    if (!encounter) {
      return;
    }
    setActionError(null);
    setStaleError(false);
    resetTransition();

    const input = {
      id: encounter.id,
      rowVersion: encounter.rowVersion,
    };

    try {
      if (kind === 'complete') {
        await complete(input);
      } else if (kind === 'cancel') {
        await cancel(input);
      } else {
        await enterInError(input);
      }
      setPendingAction(null);
    } catch (err) {
      if (isForbiddenEncounterError(err)) {
        setMutationForbidden(true);
        setPendingAction(null);
        return;
      }
      if (isStaleEncounterError(err)) {
        setStaleError(true);
        setPendingAction(null);
        refetch();
        return;
      }
      setActionError(describeApiError(err, t));
    }
  };

  if (isLoading) {
    return <EncounterDetailLoading />;
  }

  if (isForbidden) {
    return (
      <EncounterDetailUnavailable
        title={t('permissions.forbiddenTitle')}
        description={t('detail.forbidden')}
        locale={locale}
        patientId={patientId}
      />
    );
  }

  if (error || !encounter) {
    return (
      <EncounterDetailUnavailable
        title={t('detail.notFound')}
        description={error ?? t('detail.loadError')}
        locale={locale}
        patientId={patientId}
      />
    );
  }

  const canWrite = can('write', 'Encounter');
  const canAct =
    isOpenEncounter(encounter.status) && !mutationForbidden && canWrite;
  const historical = isHistoricalEncounter(encounter.status);

  const handleDismissStale = (): void => {
    setStaleError(false);
    refetch();
  };

  return (
    <EncounterDetailShell>
      <EncounterDetailHeader
        status={encounter.status}
        locale={locale}
        patientId={patientId}
        patientName={patientName}
      />

      <EncounterDetailAlerts
        mutationForbidden={mutationForbidden}
        canWrite={canWrite}
        staleError={staleError}
        actionError={actionError}
        transitionError={transitionError}
        historical={historical}
        onDismissStale={handleDismissStale}
      />

      <EncounterDetailCard
        encounter={encounter}
        historical={historical}
        canAct={canAct}
        isTransitioning={isTransitioning}
        onComplete={() => {
          setPendingAction('complete');
        }}
        onCancel={() => {
          setPendingAction('cancel');
        }}
        onEnterInError={() => {
          setPendingAction('enterInError');
        }}
      />

      <EncounterTransitionConfirmDialog
        kind={pendingAction}
        isPending={isTransitioning}
        error={actionError}
        onDismiss={() => {
          setPendingAction(null);
          setActionError(null);
        }}
        onConfirm={() => {
          if (pendingAction) {
            void runTransition(pendingAction);
          }
        }}
      />

      <EncounterDocumentsPanel
        encounter={encounter}
        locale={locale}
        patientId={patientId}
        onForbidden={() => {
          setMutationForbidden(true);
        }}
      />

      <EncounterJourneyPanel
        encounterId={encounter.id}
        patientId={patientId}
        locale={locale}
      />
    </EncounterDetailShell>
  );
}

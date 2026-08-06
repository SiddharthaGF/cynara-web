import { Link, useParams } from '@tanstack/react-router';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ClipboardList,
  CircleAlert,
} from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
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
import { InsufficientPermissionNotice } from '@/features/access-control/InsufficientPermissionNotice.tsx';
import { EncounterDocumentsPanel } from '@/features/documents/EncounterDocumentsPanel.tsx';
import {
  EncounterDetailLoading,
  EncounterDetailShell,
  EncounterDetailUnavailable,
} from '@/features/encounters/EncounterDetailStates.tsx';
import {
  encounterStatusBadgeVariant,
  formatEncounterDateTime,
  formatEncounterStatus,
  formatEncounterType,
} from '@/features/encounters/encounterForm.ts';
import {
  EncounterInfoRow,
  EncounterTransitionConfirmDialog,
  type EncounterTransitionKind,
} from '@/features/encounters/EncounterTransitionConfirmDialog.tsx';
import {
  useEncounterDetail,
  useEncounterTransitions,
} from '@/features/encounters/useEncountersCatalog.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

export function EncounterDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation(['encounters', 'api']);
  const { can } = useCapabilities();
  const {
    locale,
    id: patientId,
    encounterId,
  }: { locale: string; id: string; encounterId: string } = useParams({
    from: '/$locale/patients/$id_/encounters/$encounterId',
  });
  const reduceMotion = useReducedMotion();

  const { encounter, isLoading, error, isForbidden, refetch } =
    useEncounterDetail(encounterId);
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

  return (
    <EncounterDetailShell>
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
            to='/$locale/patients/$id'
            params={{ locale, id: patientId }}
          >
            <Button
              variant='ghost'
              size='sm'
              className='mb-4 -ml-2'
            >
              <ArrowLeft className='size-4' />
              {t('detail.backToPatient')}
            </Button>
          </Link>
          <p className='mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
            <ClipboardList className='size-3' />
            {t('detail.eyebrow')}
          </p>
          <div className='flex flex-wrap items-center gap-3'>
            <h1 className='font-display text-balance text-3xl font-semibold tracking-tight md:text-4xl'>
              {t('detail.title')}
            </h1>
            <Badge
              variant={encounterStatusBadgeVariant(encounter.status)}
              data-testid='encounter-detail-status'
            >
              {formatEncounterStatus(encounter.status, t)}
            </Badge>
          </div>
        </m.header>

        {mutationForbidden ? (
          <Alert
            variant='destructive'
            className='mb-6'
            data-testid='encounter-detail-forbidden'
          >
            <AlertDescription>{t('detail.forbiddenMutate')}</AlertDescription>
          </Alert>
        ) : null}

        {!canWrite && !mutationForbidden ? (
          <InsufficientPermissionNotice descriptionKey='access.encountersWriteMissing' />
        ) : null}

        {staleError ? (
          <Alert
            variant='destructive'
            className='mb-6'
            data-testid='encounter-detail-stale'
          >
            <AlertDescription className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <span>{t('detail.stale')}</span>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  setStaleError(false);
                  refetch();
                }}
              >
                {t('detail.reload')}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {actionError || transitionError ? (
          <Alert
            variant='destructive'
            className='mb-6'
            data-testid='encounter-detail-action-error'
          >
            <AlertDescription>
              {actionError ?? transitionError}
            </AlertDescription>
          </Alert>
        ) : null}

        {historical ? (
          <Alert
            className='mb-6'
            data-testid='encounter-detail-historical'
          >
            <AlertDescription>{t('detail.historicalBanner')}</AlertDescription>
          </Alert>
        ) : null}

        <m.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }
          }
        >
          <Card
            className={
              historical
                ? 'border-border/70 bg-muted/15 shadow-sm'
                : 'border-border/70 shadow-sm'
            }
            data-testid='encounter-detail-view'
          >
            <CardHeader>
              <CardTitle className='font-heading text-lg'>
                {formatEncounterType(encounter.type, t)}
              </CardTitle>
              <CardDescription>
                {encounter.responsibleProfessionalId}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <dl className='grid gap-4 sm:grid-cols-2'>
                <EncounterInfoRow
                  label={t('detail.fields.type')}
                  value={formatEncounterType(encounter.type, t)}
                />
                <EncounterInfoRow
                  label={t('detail.fields.status')}
                  value={formatEncounterStatus(encounter.status, t)}
                />
                <EncounterInfoRow
                  label={t('detail.fields.professional')}
                  value={encounter.responsibleProfessionalId}
                />
                <EncounterInfoRow
                  label={t('detail.fields.facilityId')}
                  value={encounter.facilityId}
                />
                <EncounterInfoRow
                  label={t('detail.fields.clinicalAreaId')}
                  value={encounter.clinicalAreaId}
                />
                <EncounterInfoRow
                  label={t('detail.fields.startedAt')}
                  value={formatEncounterDateTime(
                    encounter.startedAt,
                    i18n.language,
                  )}
                />
                <EncounterInfoRow
                  label={t('detail.fields.endedAt')}
                  value={formatEncounterDateTime(
                    encounter.endedAt,
                    i18n.language,
                  )}
                />
                <EncounterInfoRow
                  label={t('detail.fields.rowVersion')}
                  value={String(encounter.rowVersion)}
                />
              </dl>

              {canAct ? (
                <div className='flex flex-wrap gap-2 border-t border-border/70 pt-4'>
                  <Button
                    data-testid='encounter-action-complete'
                    onClick={() => {
                      setPendingAction('complete');
                    }}
                    disabled={isTransitioning}
                  >
                    <CheckCircle2 className='size-3.5' />
                    {t('detail.actions.complete')}
                  </Button>
                  <Button
                    variant='outline'
                    data-testid='encounter-action-cancel'
                    onClick={() => {
                      setPendingAction('cancel');
                    }}
                    disabled={isTransitioning}
                  >
                    <Ban className='size-3.5' />
                    {t('detail.actions.cancel')}
                  </Button>
                  <Button
                    variant='destructive'
                    data-testid='encounter-action-enter-in-error'
                    onClick={() => {
                      setPendingAction('enterInError');
                    }}
                    disabled={isTransitioning}
                  >
                    <CircleAlert className='size-3.5' />
                    {t('detail.actions.enterInError')}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </m.div>

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
      </LazyMotion>
    </EncounterDetailShell>
  );
}

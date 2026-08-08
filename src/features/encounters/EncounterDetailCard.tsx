import { Ban, CheckCircle2, CircleAlert } from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { EncounterDto } from '@/api/encounters.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  formatEncounterDateTime,
  formatEncounterStatus,
  formatEncounterType,
} from '@/features/encounters/encounterForm.ts';
import { EncounterInfoRow } from '@/features/encounters/EncounterTransitionConfirmDialog.tsx';

interface EncounterDetailCardProps {
  encounter: EncounterDto;
  historical: boolean;
  canAct: boolean;
  isTransitioning: boolean;
  onComplete: () => void;
  onCancel: () => void;
  onEnterInError: () => void;
}

export function EncounterDetailCard({
  encounter,
  historical,
  canAct,
  isTransitioning,
  onComplete,
  onCancel,
  onEnterInError,
}: EncounterDetailCardProps): JSX.Element {
  const { t, i18n } = useTranslation(['encounters', 'api']);
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
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
                  onClick={onComplete}
                  disabled={isTransitioning}
                >
                  <CheckCircle2 className='size-3.5' />
                  {t('detail.actions.complete')}
                </Button>
                <Button
                  variant='outline'
                  data-testid='encounter-action-cancel'
                  onClick={onCancel}
                  disabled={isTransitioning}
                >
                  <Ban className='size-3.5' />
                  {t('detail.actions.cancel')}
                </Button>
                <Button
                  variant='destructive'
                  data-testid='encounter-action-enter-in-error'
                  onClick={onEnterInError}
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
    </LazyMotion>
  );
}

import { Ban, CheckCircle2, ChevronDown, CircleAlert } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { EncounterDto } from '@/api/encounters.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx';
import {
  formatEncounterDateTime,
  formatEncounterStatus,
  formatEncounterType,
} from '@/features/encounters/encounterForm.ts';
import { EncounterInfoRow } from '@/features/encounters/EncounterTransitionConfirmDialog.tsx';
import { cn } from '@/lib/utils.ts';

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
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  return (
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
            label={t('detail.fields.startedAt')}
            value={formatEncounterDateTime(encounter.startedAt, i18n.language)}
          />
          <EncounterInfoRow
            label={t('detail.fields.endedAt')}
            value={formatEncounterDateTime(encounter.endedAt, i18n.language)}
          />
        </dl>

        <Collapsible
          open={showTechnicalDetails}
          onOpenChange={setShowTechnicalDetails}
          className='border-t border-border/60 pt-3'
        >
          <CollapsibleTrigger
            className='flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors outline-none select-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-open:text-foreground'
            aria-label={t('detail.technicalDetails')}
          >
            <span>{t('detail.technicalDetails')}</span>
            <ChevronDown
              className={cn(
                'size-3.5 shrink-0 transition-transform duration-150',
                showTechnicalDetails && 'rotate-180',
              )}
              aria-hidden='true'
            />
          </CollapsibleTrigger>
          <CollapsibleContent className='data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0'>
            <dl className='grid gap-4 pt-3 sm:grid-cols-2'>
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
                label={t('detail.fields.rowVersion')}
                value={String(encounter.rowVersion)}
              />
            </dl>
          </CollapsibleContent>
        </Collapsible>

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
  );
}

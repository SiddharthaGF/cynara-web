import { Ban, CheckCircle2, CircleAlert, Save } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import type { DocumentTransitionKind } from '@/features/documents/DocumentTransitionConfirmDialog.tsx';

interface DocumentActionsBarProps {
  isSaving: boolean;
  isTransitioning: boolean;
  onSave: () => void;
  onComplete: () => void;
  onTransition: (kind: DocumentTransitionKind) => void;
}

export function DocumentActionsBar({
  isSaving,
  isTransitioning,
  onSave,
  onComplete,
  onTransition,
}: DocumentActionsBarProps): JSX.Element {
  const { t } = useTranslation(['documents']);
  const busy = isSaving || isTransitioning;

  return (
    <div className='flex flex-wrap gap-2 border-t border-border/70 pt-4'>
      <Button
        data-testid='document-action-save'
        onClick={onSave}
        disabled={busy}
      >
        {isSaving ? <Spinner data-icon='inline-start' /> : null}
        <Save className='size-3.5' />
        {isSaving ? t('detail.actions.saving') : t('detail.actions.save')}
      </Button>
      <Button
        data-testid='document-action-complete'
        onClick={onComplete}
        disabled={busy}
      >
        <CheckCircle2 className='size-3.5' />
        {t('detail.actions.complete')}
      </Button>
      <Button
        variant='outline'
        data-testid='document-action-cancel'
        onClick={() => {
          onTransition('cancel');
        }}
        disabled={busy}
      >
        <Ban className='size-3.5' />
        {t('detail.actions.cancel')}
      </Button>
      <Button
        variant='destructive'
        data-testid='document-action-enter-in-error'
        onClick={() => {
          onTransition('enterInError');
        }}
        disabled={busy}
      >
        <CircleAlert className='size-3.5' />
        {t('detail.actions.enterInError')}
      </Button>
    </div>
  );
}

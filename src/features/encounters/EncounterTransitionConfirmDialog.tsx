import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';

export type EncounterTransitionKind = 'complete' | 'cancel' | 'enterInError';

export function EncounterInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className='flex flex-col gap-1'>
      <dt className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
        {label}
      </dt>
      <dd className='text-sm font-medium break-all'>{value}</dd>
    </div>
  );
}

export function EncounterTransitionConfirmDialog({
  kind,
  isPending,
  error,
  onDismiss,
  onConfirm,
}: {
  kind: EncounterTransitionKind | null;
  isPending: boolean;
  error: string | null;
  onDismiss: () => void;
  onConfirm: () => void;
}): JSX.Element {
  const { t } = useTranslation(['encounters']);
  const open = kind !== null;

  let title = '';
  let body = '';
  let confirmLabel = t('detail.confirm.confirm');
  if (kind === 'complete') {
    title = t('detail.confirm.completeTitle');
    body = t('detail.confirm.completeBody');
    confirmLabel = t('detail.confirm.completeAction');
  } else if (kind === 'cancel') {
    title = t('detail.confirm.cancelTitle');
    body = t('detail.confirm.cancelBody');
    confirmLabel = t('detail.confirm.cancelAction');
  } else if (kind === 'enterInError') {
    title = t('detail.confirm.enterInErrorTitle');
    body = t('detail.confirm.enterInErrorBody');
    confirmLabel = t('detail.confirm.enterInErrorAction');
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onDismiss();
        }
      }}
    >
      <DialogContent data-testid='encounter-transition-confirm'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant='destructive'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button
            variant='ghost'
            disabled={isPending}
            onClick={onDismiss}
          >
            {t('detail.confirm.dismiss')}
          </Button>
          <Button
            variant={kind === 'enterInError' ? 'destructive' : 'default'}
            data-testid='encounter-transition-confirm-submit'
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? <Spinner data-icon='inline-start' /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

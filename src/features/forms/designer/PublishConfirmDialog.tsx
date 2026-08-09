import { Rocket } from 'lucide-react';
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

interface PublishConfirmDialogProps {
  open: boolean;
  error: string | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog for publishing the current draft version. The review gate
 * runs transparently, and the copy explains what publishing means for
 * consultations that are already in progress.
 */
export function PublishConfirmDialog({
  open,
  error,
  isPending,
  onCancel,
  onConfirm,
}: PublishConfirmDialogProps): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent data-testid='form-publish-dialog'>
        <DialogHeader>
          <DialogTitle>{t('publish.confirmTitle')}</DialogTitle>
          <DialogDescription>{t('publish.confirmBody')}</DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant='destructive'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            disabled={isPending}
            onClick={onCancel}
          >
            {t('publish.cancel')}
          </Button>
          <Button
            type='button'
            disabled={isPending}
            onClick={onConfirm}
            data-testid='form-publish-confirm'
          >
            {isPending ? (
              <Spinner data-icon='inline-start' />
            ) : (
              <Rocket
                className='size-3.5'
                aria-hidden='true'
              />
            )}
            {t('publish.confirmAction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

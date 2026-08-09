import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';

interface DocumentUnsavedDialogProps {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function DocumentUnsavedDialog({
  open,
  onKeepEditing,
  onDiscard,
}: DocumentUnsavedDialogProps): JSX.Element {
  const { t } = useTranslation('documents');

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onKeepEditing();
        }
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('detail.unsavedTitle')}</DialogTitle>
          <DialogDescription>{t('detail.unsavedBody')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className='mt-2'>
          <Button
            type='button'
            variant='outline'
            onClick={onKeepEditing}
          >
            {t('detail.keepEditing')}
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={onDiscard}
          >
            {t('detail.discard')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

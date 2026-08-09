import { Undo2 } from 'lucide-react';
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

interface WorkflowWithdrawDialogProps {
  open: boolean;
  error: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function WorkflowWithdrawDialog({
  open,
  error,
  isPending,
  onOpenChange,
  onConfirm,
}: WorkflowWithdrawDialogProps): JSX.Element {
  const { t } = useTranslation('workflows');

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('publish.withdrawTitle')}</DialogTitle>
          <DialogDescription>{t('publish.withdrawBody')}</DialogDescription>
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
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('publish.cancel')}
          </Button>
          <Button
            type='button'
            variant='destructive'
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <Spinner data-icon='inline-start' />
            ) : (
              <Undo2
                className='size-3.5'
                aria-hidden='true'
              />
            )}
            {t('publish.withdrawAction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

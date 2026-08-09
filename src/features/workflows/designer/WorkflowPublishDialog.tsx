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

interface WorkflowPublishDialogProps {
  open: boolean;
  error: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function WorkflowPublishDialog({
  open,
  error,
  isPending,
  onOpenChange,
  onConfirm,
}: WorkflowPublishDialogProps): JSX.Element {
  const { t } = useTranslation('workflows');

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent data-testid='workflow-publish-dialog'>
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
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('publish.cancel')}
          </Button>
          <Button
            type='button'
            disabled={isPending}
            onClick={onConfirm}
            data-testid='workflow-publish-confirm'
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

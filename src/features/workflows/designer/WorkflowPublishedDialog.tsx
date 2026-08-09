import { ArrowLeft, Plus } from 'lucide-react';
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
import { Spinner } from '@/components/ui/spinner.tsx';

interface WorkflowPublishedDialogProps {
  open: boolean;
  version: string | null;
  continuePending: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function WorkflowPublishedDialog({
  open,
  version,
  continuePending,
  onOpenChange,
  onContinue,
  onBack,
}: WorkflowPublishedDialogProps): JSX.Element {
  const { t } = useTranslation('workflows');

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('publish.publishedTitle')}</DialogTitle>
          <DialogDescription>
            {t('publish.publishedBody', {
              version: version ?? '',
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            disabled={continuePending}
            onClick={onContinue}
          >
            {continuePending ? (
              <Spinner data-icon='inline-start' />
            ) : (
              <Plus
                className='size-3.5'
                aria-hidden='true'
              />
            )}
            {t('publish.continueEditing')}
          </Button>
          <Button
            type='button'
            onClick={onBack}
          >
            <ArrowLeft
              className='size-3.5'
              aria-hidden='true'
            />
            {t('publish.backToWorkflows')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

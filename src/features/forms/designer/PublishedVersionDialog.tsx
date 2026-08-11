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
import type { FormVersion } from '@/features/forms/types.ts';

interface PublishedVersionDialogProps {
  version: FormVersion | null;
  isPending: boolean;
  onClose: () => void;
  onContinueEditing: () => void;
}

/**
 * Success dialog shown after a version is published. Published versions have no
 * editable draft, so the dialog only dismisses into an explicit next step:
 * continue editing a fresh draft, or head back to the form catalog.
 */
export function PublishedVersionDialog({
  version,
  isPending,
  onClose,
  onContinueEditing,
}: PublishedVersionDialogProps): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <Dialog
      open={version !== null}
      onOpenChange={(open) => {
        // Published versions have no editable draft, so the dialog only dismisses into an explicit next step.
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('publish.publishedTitle')}</DialogTitle>
          <DialogDescription>
            {t('publish.publishedBody', {
              version: version?.version ?? '',
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            disabled={isPending}
            onClick={onContinueEditing}
          >
            {isPending ? (
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
            onClick={onClose}
          >
            <ArrowLeft
              className='size-3.5'
              aria-hidden='true'
            />
            {t('publish.backToForms')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

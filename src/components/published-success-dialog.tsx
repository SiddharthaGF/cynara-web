import { ArrowLeft, Plus } from 'lucide-react';
import type { JSX } from 'react';

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

interface PublishedSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  continueLabel: string;
  backLabel: string;
  continuePending: boolean;
  onContinue: () => void;
  onBack: () => void;
}

/**
 * Success dialog shown after a version is published. Published versions
 * have no editable draft, so the dialog only dismisses into an explicit
 * next step. Shared by the form and workflow designers; callers own data
 * fetching and translate every string.
 */
export function PublishedSuccessDialog({
  open,
  onOpenChange,
  title,
  description,
  continueLabel,
  backLabel,
  continuePending,
  onContinue,
  onBack,
}: PublishedSuccessDialogProps): JSX.Element {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
            {continueLabel}
          </Button>
          <Button
            type='button'
            onClick={onBack}
          >
            <ArrowLeft
              className='size-3.5'
              aria-hidden='true'
            />
            {backLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

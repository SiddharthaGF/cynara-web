import type { JSX } from 'react';
import { useState } from 'react';
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';

export type DocumentTransitionKind = 'complete' | 'cancel' | 'enterInError';

interface DocumentTransitionConfirmDialogProps {
  kind: DocumentTransitionKind | null;
  isPending: boolean;
  error: string | null;
  /** Server-provided reason for an already entered-in-error document. */
  enteredInErrorReason?: string | null;
  onDismiss: () => void;
  onConfirm: (reason?: string) => void;
}

export function DocumentTransitionConfirmDialog({
  kind,
  isPending,
  error,
  enteredInErrorReason,
  onDismiss,
  onConfirm,
}: DocumentTransitionConfirmDialogProps): JSX.Element {
  const { t } = useTranslation(['documents']);
  const open = kind !== null;
  const [reason, setReason] = useState('');

  let title = '';
  let body = '';
  if (kind === 'complete') {
    title = t('detail.confirm.completeTitle');
    body = t('detail.confirm.completeBody');
  } else if (kind === 'cancel') {
    title = t('detail.confirm.cancelTitle');
    body = t('detail.confirm.cancelBody');
  } else if (kind === 'enterInError') {
    title = t('detail.confirm.enterInErrorTitle');
    body = t('detail.confirm.enterInErrorBody');
  }

  const reasonRequired = kind === 'enterInError';
  const reasonMissing = reasonRequired && reason.trim().length === 0;
  const showReasonError = reasonMissing && error === null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onDismiss();
        }
      }}
    >
      <DialogContent data-testid='document-transition-confirm'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant='destructive'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {reasonRequired ? (
          <Field data-invalid={showReasonError}>
            <FieldLabel htmlFor='document-transition-reason'>
              {t('detail.confirm.reasonLabel')}
            </FieldLabel>
            <Input
              id='document-transition-reason'
              data-testid='document-transition-reason'
              value={reason}
              disabled={isPending}
              aria-invalid={showReasonError}
              placeholder={t('detail.confirm.reasonPlaceholder')}
              onChange={(event) => {
                setReason(event.target.value);
              }}
            />
            {showReasonError ? (
              <FieldError>{t('detail.confirm.reasonRequired')}</FieldError>
            ) : null}
          </Field>
        ) : null}
        {enteredInErrorReason ? (
          <Alert>
            <AlertDescription>
              {t('detail.confirm.enteredInErrorReason')}: {enteredInErrorReason}
            </AlertDescription>
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
            data-testid='document-transition-confirm-submit'
            disabled={isPending || showReasonError}
            onClick={() => {
              if (reasonRequired) {
                onConfirm(reason.trim());
              } else {
                onConfirm();
              }
            }}
          >
            {isPending ? <Spinner data-icon='inline-start' /> : null}
            {t('detail.confirm.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

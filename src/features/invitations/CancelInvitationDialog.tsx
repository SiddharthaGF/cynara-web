import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { describeApiError } from '@/api/error-message.ts';
import type { InvitationDto } from '@/api/invitations.ts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import { useInvitationMutations } from '@/features/invitations/useInvitationMutations.ts';

interface CancelInvitationDialogProps {
  invitation: InvitationDto | null;
  onOpenChange: (open: boolean) => void;
  onSettled: () => void;
}

/** Confirmed cancel: the row stays listed with a `cancelled` badge. */
export function CancelInvitationDialog({
  invitation,
  onOpenChange,
  onSettled,
}: CancelInvitationDialogProps): JSX.Element {
  const { t } = useTranslation(['invitations', 'api']);
  const { cancel } = useInvitationMutations();

  const open = invitation !== null;
  const error = cancel.error ? describeApiError(cancel.error, t) : null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !cancel.isPending) {
          onOpenChange(false);
          onSettled();
        }
      }}
    >
      <AlertDialogContent aria-label={t('cancel.confirmTitle')}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('cancel.confirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('cancel.confirmBody')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert
            variant='destructive'
            className='mt-2'
          >
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancel.isPending}>
            {t('cancel.dismiss')}
          </AlertDialogCancel>
          <AlertDialogAction
            variant='destructive'
            disabled={cancel.isPending}
            onClick={() => {
              if (invitation) {
                void cancel.mutateAsync(invitation.id).then(() => {
                  onOpenChange(false);
                  onSettled();
                });
              }
            }}
          >
            {cancel.isPending ? <Spinner data-icon='inline-start' /> : null}
            {t('cancel.submit')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

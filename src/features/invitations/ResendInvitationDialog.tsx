import type { JSX } from 'react';
import { useState } from 'react';
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
import { CopyLinkDialog } from '@/features/invitations/CopyLinkDialog.tsx';
import { useInvitationMutations } from '@/features/invitations/useInvitationMutations.ts';

interface ResendInvitationDialogProps {
  invitation: InvitationDto | null;
  locale: string;
  onOpenChange: (open: boolean) => void;
  onSettled: () => void;
}

/**
 * Confirmed resend: supersedes the previous link (linkVersion +1, fresh
 * expiry) and surfaces the new token through CopyLinkDialog. The prior token
 * dies server-side; no duplicate row is created.
 */
export function ResendInvitationDialog({
  invitation,
  locale,
  onOpenChange,
  onSettled,
}: ResendInvitationDialogProps): JSX.Element {
  const { t } = useTranslation(['invitations', 'api']);
  const { resend } = useInvitationMutations();
  const [newToken, setNewToken] = useState<string | null>(null);

  const open = invitation !== null;
  const error = resend.error ? describeApiError(resend.error, t) : null;

  return (
    <>
      <AlertDialog
        open={open && newToken === null}
        onOpenChange={(next) => {
          if (!next && !resend.isPending) {
            onOpenChange(false);
            onSettled();
          }
        }}
      >
        <AlertDialogContent aria-label={t('resend.confirmTitle')}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('resend.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('resend.confirmBody')}
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
            <AlertDialogCancel disabled={resend.isPending}>
              {t('resend.dismiss')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={resend.isPending}
              onClick={() => {
                if (invitation) {
                  void resend.mutateAsync(invitation.id).then((result) => {
                    setNewToken(result.token);
                  });
                }
              }}
            >
              {resend.isPending ? <Spinner data-icon='inline-start' /> : null}
              {t('resend.submit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CopyLinkDialog
        open={open && newToken !== null}
        onOpenChange={(next) => {
          if (!next) {
            setNewToken(null);
            onOpenChange(false);
            onSettled();
          }
        }}
        token={newToken ?? ''}
        locale={locale}
      />
    </>
  );
}

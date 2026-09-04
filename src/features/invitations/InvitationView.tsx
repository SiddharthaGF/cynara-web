import { RefreshCw, XCircle } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { InvitationDto } from '@/api/invitations.ts';
import { Button } from '@/components/ui/button.tsx';
import { TableCell, TableRow } from '@/components/ui/table.tsx';
import { formatAdminDate } from '@/features/hospital/format-date.ts';
import { isRenewableStatus } from '@/features/invitations/invitationStatus.ts';
import { InvitationStatusBadge } from '@/features/invitations/InvitationStatusBadge.tsx';

interface InvitationViewProps {
  invitation: InvitationDto;
  locale: string;
  canWrite: boolean;
  onCancel: (invitation: InvitationDto) => void;
  onResend: (invitation: InvitationDto) => void;
}

/**
 * One invitation row: lifecycle metadata only — never token material (R5).
 * Cancel/resend appear only for renewable statuses and only with `.write`;
 * terminal rows (revoked, cancelled, accepted, already-used) render display-only.
 */
export function InvitationView({
  invitation,
  locale,
  canWrite,
  onCancel,
  onResend,
}: InvitationViewProps): JSX.Element {
  const { t } = useTranslation('invitations');
  const renewable = isRenewableStatus(invitation.status);

  return (
    <TableRow>
      <TableCell className='font-medium'>{invitation.email}</TableCell>
      <TableCell>
        <InvitationStatusBadge status={invitation.status} />
      </TableCell>
      <TableCell className='text-muted-foreground'>
        {formatAdminDate(invitation.issuedAt, locale)}
      </TableCell>
      <TableCell className='text-muted-foreground'>
        {formatAdminDate(invitation.expiresAt, locale)}
      </TableCell>
      <TableCell className='text-right'>
        {canWrite && renewable ? (
          <span className='flex justify-end gap-2'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => onResend(invitation)}
            >
              <RefreshCw data-icon='inline-start' />
              {t('actions.resend')}
            </Button>
            <Button
              type='button'
              size='sm'
              variant='ghost'
              onClick={() => onCancel(invitation)}
            >
              <XCircle data-icon='inline-start' />
              {t('actions.cancel')}
            </Button>
          </span>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

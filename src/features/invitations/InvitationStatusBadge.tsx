import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import {
  badgeVariantForStatus,
  isInvitationStatus,
} from '@/features/invitations/invitationStatus.ts';

interface InvitationStatusBadgeProps {
  status: string;
}

/** Distinct badge per lifecycle status; unknown statuses fall back to a neutral label. */
export function InvitationStatusBadge({
  status,
}: InvitationStatusBadgeProps): JSX.Element {
  const { t } = useTranslation('invitations');
  return (
    <Badge variant={badgeVariantForStatus(status)}>
      {isInvitationStatus(status) ? t(`status.${status}`) : t('status.unknown')}
    </Badge>
  );
}

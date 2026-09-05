/**
 * Invitation lifecycle statuses the backend can emit. Each status renders a
 * distinct badge; `revoked` and `cancelled` rows stay listed and never offer
 * mutations (the backend owns terminal transitions).
 */
export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'revoked'
  | 'cancelled'
  | 'already-used';

export const INVITATION_STATUSES: readonly InvitationStatus[] = [
  'pending',
  'accepted',
  'expired',
  'revoked',
  'cancelled',
  'already-used',
];

export function isInvitationStatus(value: string): value is InvitationStatus {
  return (INVITATION_STATUSES as readonly string[]).includes(value);
}

/** Statuses that still accept a new link: cancel and resend are offered. */
export function isRenewableStatus(status: string): boolean {
  return status === 'pending' || status === 'expired';
}

/**
 * Kardex edge mark per invitation status. Pending waits for a signature,
 * accepted is filed, terminal rows stay muted. Estado es marca, no tinte.
 */
export function cintaClassForStatus(status: string): string {
  switch (status) {
    case 'pending':
    case 'expired': {
      return 'kardex-cinta kardex-cinta-review';
    }
    case 'accepted': {
      return 'kardex-cinta kardex-cinta-success';
    }
    default: {
      return 'kardex-cinta kardex-cinta-muted';
    }
  }
}

export function badgeVariantForStatus(
  status: string,
): 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost' {
  switch (status) {
    case 'pending': {
      return 'default';
    }
    case 'accepted': {
      return 'secondary';
    }
    case 'already-used': {
      return 'outline';
    }
    case 'expired': {
      return 'outline';
    }
    case 'revoked': {
      return 'destructive';
    }
    case 'cancelled': {
      return 'destructive';
    }
    default: {
      return 'secondary';
    }
  }
}

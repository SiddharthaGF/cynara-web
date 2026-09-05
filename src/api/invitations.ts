import { contractHeaders, requireDto } from '@/api/client-runtime.ts';
import { ApiError } from '@/api/client.ts';
import {
  cancelInvitation as sdkCancelInvitation,
  createInvitation as sdkCreateInvitation,
  listInvitations as sdkListInvitations,
  resendInvitation as sdkResendInvitation,
  type InvitationView,
} from '@/api/generated';
import type { CapabilityCode } from '@/lib/capabilities.ts';

/**
 * Read model for the administrative invitation lifecycle. Derived from the
 * generated contract type with the fields the app relies on promoted to
 * required. Lifecycle metadata only — the wire view never carries token
 * material (R5).
 */
export type InvitationDto = Required<InvitationView>;

export interface CreateInvitationResult {
  invitation: InvitationDto;
  token: string;
}

/**
 * Profile captured at create time, serialized to the canonical v1 JSON
 * snapshot the backend stores. Capabilities are catalog-gated before
 * submission; the hospital is bound from the caller's workspace and is never
 * part of the snapshot.
 */
export interface InvitationProfileSnapshot {
  actorId: string;
  capabilities: CapabilityCode[];
  profile?: {
    name: string;
    surname: string;
    phone?: string;
    language?: string;
  };
}

/** Lists the workspace's invitations newest-first. */
export async function listInvitations(): Promise<InvitationDto[]> {
  const { data } = await sdkListInvitations({
    headers: contractHeaders(),
  });
  return (data ?? []).map(requireDto);
}

function requireCreateResult(data: {
  invitation?: InvitationView;
  token?: string;
}): CreateInvitationResult {
  if (!data.invitation) {
    throw new ApiError(
      502,
      'Invalid create response',
      'Missing invitation record',
    );
  }
  const invitation = requireDto(data.invitation);
  if (typeof data.token !== 'string' || data.token.length === 0) {
    throw new ApiError(
      502,
      'Invalid create response',
      'Missing invitation token',
    );
  }
  return { invitation, token: data.token };
}

/** Creates an invitation from the profile snapshot; the raw token is returned exactly once. */
export async function createInvitation(
  email: string,
  snapshot: InvitationProfileSnapshot,
): Promise<CreateInvitationResult> {
  const { data } = await sdkCreateInvitation({
    headers: contractHeaders(),
    body: { email, profileSnapshot: JSON.stringify(snapshot) },
  });
  return requireCreateResult(data);
}

/** Cancels a pending/expired invitation; the row persists with status `cancelled`. */
export async function cancelInvitation(id: string): Promise<InvitationDto> {
  const { data } = await sdkCancelInvitation({
    path: { id },
    headers: contractHeaders(),
  });
  return requireDto(data);
}

/** Resends an invitation, superseding the previous link and returning a fresh token. */
export async function resendInvitation(
  id: string,
): Promise<CreateInvitationResult> {
  const { data } = await sdkResendInvitation({
    path: { id },
    headers: contractHeaders(),
  });
  return requireCreateResult(data);
}

export function isForbiddenInvitationError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

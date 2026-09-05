import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  cancelInvitation,
  createInvitation,
  resendInvitation,
  type InvitationProfileSnapshot,
} from '@/api/invitations.ts';
import { queryKeys } from '@/api/query-keys.ts';

export interface CreateInvitationInput {
  email: string;
  snapshot: InvitationProfileSnapshot;
}

/**
 * Invitation mutations. Every success invalidates the listing family so rows
 * (status, linkVersion, expiresAt) refresh; raw tokens returned by create and
 * resend are consumed by the caller and never enter the query cache.
 */
export function useInvitationMutations(): {
  create: ReturnType<
    typeof useMutation<
      Awaited<ReturnType<typeof createInvitation>>,
      Error,
      CreateInvitationInput
    >
  >;
  cancel: ReturnType<
    typeof useMutation<
      Awaited<ReturnType<typeof cancelInvitation>>,
      Error,
      string
    >
  >;
  resend: ReturnType<
    typeof useMutation<
      Awaited<ReturnType<typeof resendInvitation>>,
      Error,
      string
    >
  >;
} {
  const queryClient = useQueryClient();

  const invalidateList = (): void => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.invitations.all,
    });
  };

  const create = useMutation({
    mutationFn: async ({ email, snapshot }: CreateInvitationInput) =>
      createInvitation(email, snapshot),
    onSuccess: invalidateList,
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => cancelInvitation(id),
    onSuccess: invalidateList,
  });

  const resend = useMutation({
    mutationFn: async (id: string) => resendInvitation(id),
    onSuccess: invalidateList,
  });

  return { create, cancel, resend };
}

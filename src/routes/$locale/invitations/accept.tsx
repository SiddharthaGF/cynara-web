import { createFileRoute } from '@tanstack/react-router';
import type { JSX } from 'react';

import { AcceptInvitationPage } from '@/features/invitations/AcceptInvitationPage.tsx';
import { parseAcceptSearch } from '@/features/invitations/accept-search.ts';

export const Route = createFileRoute('/$locale/invitations/accept')({
  validateSearch: parseAcceptSearch,
  component: AcceptRoute,
});

function AcceptRoute(): JSX.Element {
  const search = Route.useSearch();
  return <AcceptInvitationPage token={search.token ?? ''} />;
}

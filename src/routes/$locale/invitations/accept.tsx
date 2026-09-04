import { createFileRoute } from '@tanstack/react-router';
import type { JSX } from 'react';

import { AcceptInvitationPage } from '@/features/invitations/AcceptInvitationPage.tsx';

interface AcceptSearch {
  token?: string;
}

function parseAcceptSearch(search: Record<string, unknown>): AcceptSearch {
  return {
    token: typeof search.token === 'string' ? search.token.trim() : undefined,
  };
}

export const Route = createFileRoute('/$locale/invitations/accept')({
  validateSearch: parseAcceptSearch,
  component: AcceptRoute,
});

function AcceptRoute(): JSX.Element {
  const search = Route.useSearch();
  return <AcceptInvitationPage token={search.token ?? ''} />;
}

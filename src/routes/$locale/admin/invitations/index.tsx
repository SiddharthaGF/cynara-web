import { createFileRoute } from '@tanstack/react-router';

import { InvitationListPage } from '@/features/invitations/InvitationListPage.tsx';

export const Route = createFileRoute('/$locale/admin/invitations/')({
  component: InvitationListPage,
});

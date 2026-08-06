import { createFileRoute } from '@tanstack/react-router';

import { AdminHubPage } from '@/features/hospital/AdminHubPage.tsx';

export const Route = createFileRoute('/$locale/admin/')({
  component: AdminHubPage,
});

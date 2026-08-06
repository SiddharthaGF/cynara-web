import { createFileRoute } from '@tanstack/react-router';

import { WorkspaceSettingsPage } from '@/features/hospital/WorkspaceSettingsPage.tsx';

export const Route = createFileRoute('/$locale/admin/workspace')({
  component: WorkspaceSettingsPage,
});

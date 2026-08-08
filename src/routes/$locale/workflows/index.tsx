import { createFileRoute } from '@tanstack/react-router';

import { WorkflowListPage } from '@/features/workflows/list/WorkflowListPage';

export const Route = createFileRoute('/$locale/workflows/')({
  component: WorkflowListPage,
});

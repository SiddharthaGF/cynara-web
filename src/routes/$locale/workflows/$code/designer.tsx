import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { getWorkflowDraft } from '@/api/workflows.ts';
import { RouteAccessError } from '@/features/access-control/RouteAccessError.tsx';
import { WorkflowDesignerPage } from '@/features/workflows/designer/WorkflowDesignerPage';

export const Route = createFileRoute('/$locale/workflows/$code/designer')({
  // The designer is an authenticated editor; send loader data but render the canvas on the client.
  ssr: 'data-only',
  errorComponent: RouteAccessError,
  loader: async ({ params }) => {
    const draft = await getWorkflowDraft(params.code);
    return draft;
  },
  component: WorkflowDesignerRoute,
});

function WorkflowDesignerRoute(): ReactNode {
  const { code } = Route.useParams();
  const draft = Route.useLoaderData();
  return (
    <WorkflowDesignerPage
      key={`${code}:${draft.id}`}
      code={code}
      initialDraft={draft}
    />
  );
}

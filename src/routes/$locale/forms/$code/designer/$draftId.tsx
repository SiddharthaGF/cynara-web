import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { getFormVersion } from '@/api/forms.ts';
import { FormDesignerPage } from '@/features/forms/designer/FormDesignerPage';

export const Route = createFileRoute('/$locale/forms/$code/designer/$draftId')({
  // The designer is an authenticated editor; send loader data but render the canvas on the client.
  ssr: 'data-only',
  loader: async ({ params }) => {
    const draft = await getFormVersion(params.draftId, params.code);
    return draft;
  },
  component: FormDesignerRoute,
});

function FormDesignerRoute(): ReactNode {
  const { code } = Route.useParams();
  const draft = Route.useLoaderData();
  return (
    <FormDesignerPage
      key={`${code}:${draft.id}`}
      code={code}
      initialDraft={draft}
    />
  );
}

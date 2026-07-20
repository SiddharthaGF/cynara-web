import { createFileRoute, redirect } from '@tanstack/react-router';

import { getFormDraft } from '@/api/forms.ts';
import { FormDesignerPage } from '@/features/forms/designer/FormDesignerPage';

export const Route = createFileRoute('/$locale/forms/$code/designer/$draftId')({
  loader: async ({ params }) => {
    const draft = await getFormDraft(params.code);
    if (draft.id !== params.draftId) {
      // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirect
      throw redirect({
        to: '/$locale/forms/$code/designer/$draftId',
        params: {
          locale: params.locale,
          code: params.code,
          draftId: draft.id,
        },
        replace: true,
      });
    }
    return draft;
  },
  component: FormDesignerRoute,
});

function FormDesignerRoute() {
  const { code } = Route.useParams();
  const draft = Route.useLoaderData();
  return (
    <FormDesignerPage
      code={code}
      initialDraft={draft}
    />
  );
}

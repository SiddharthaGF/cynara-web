import { createFileRoute, redirect } from '@tanstack/react-router';

import { getFormDraft } from '@/api/forms.ts';

/** Legacy path without draft id → resolve current editable draft. */
export const Route = createFileRoute('/$locale/forms/$code/designer/')({
  beforeLoad: async ({ params }) => {
    const draft = await getFormDraft(params.code);
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
  },
});

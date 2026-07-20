import { createFileRoute, redirect } from '@tanstack/react-router';

import { getFormDraft } from '@/api/forms.ts';
import { resolvePreferredLocale } from '@/lib/locale.ts';

export const Route = createFileRoute('/forms/$code/designer')({
  beforeLoad: async ({ params }) => {
    const locale = resolvePreferredLocale();
    const draft = await getFormDraft(params.code);
    // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirect
    throw redirect({
      to: '/$locale/forms/$code/designer/$draftId',
      params: {
        locale,
        code: params.code,
        draftId: draft.id,
      },
      replace: true,
    });
  },
});

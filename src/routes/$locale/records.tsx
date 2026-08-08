import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * The "Clinical records" landing duplicated the patient search. Patient search
 * is now the single surface for both registry and care work, so the old route
 * forwards to it while keeping existing bookmarks working.
 */
export const Route = createFileRoute('/$locale/records')({
  beforeLoad: ({ params }) => {
    // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirect
    throw redirect({
      to: '/$locale/patients',
      params: { locale: params.locale },
      replace: true,
    });
  },
});

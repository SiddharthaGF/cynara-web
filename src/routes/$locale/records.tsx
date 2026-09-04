import { createFileRoute, redirect } from '@tanstack/react-router';

/** The records landing duplicated patient search; forward to the single search surface while keeping old bookmarks working. */
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

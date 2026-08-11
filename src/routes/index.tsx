import { createFileRoute, redirect } from '@tanstack/react-router';

import { resolvePreferredLocale } from '@/lib/locale.ts';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const locale = resolvePreferredLocale();
    // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router redirect
    throw redirect({
      to: '/$locale',
      params: { locale },
      replace: true,
    });
  },
});

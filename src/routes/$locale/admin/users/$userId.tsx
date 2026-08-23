import { createFileRoute } from '@tanstack/react-router';

import { UserDetailPage } from '@/features/users/UserDetailPage.tsx';

export const Route = createFileRoute('/$locale/admin/users/$userId')({
  component: UserDetailPage,
});

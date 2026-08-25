import { createFileRoute } from '@tanstack/react-router';

import { UserListPage } from '@/features/users/UserListPage.tsx';
import { validateUserListSearch } from '@/features/users/userListSearch.ts';

export const Route = createFileRoute('/$locale/admin/users/')({
  validateSearch: validateUserListSearch,
  component: UserListPage,
});

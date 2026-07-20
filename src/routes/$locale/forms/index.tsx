import { createFileRoute } from '@tanstack/react-router';

import { FormListPage } from '@/features/forms/list/FormListPage';

export const Route = createFileRoute('/$locale/forms/')({
  component: FormListPage,
});

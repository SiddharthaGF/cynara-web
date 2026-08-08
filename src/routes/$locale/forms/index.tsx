import { createFileRoute } from '@tanstack/react-router';

import { FormListPage } from '@/features/forms/list/FormListPage';
import { validateFormListSearch } from '@/features/forms/list/formListSearch.ts';

export const Route = createFileRoute('/$locale/forms/')({
  validateSearch: validateFormListSearch,
  component: FormListPage,
});

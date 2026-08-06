import { createFileRoute } from '@tanstack/react-router';

import { DisciplinesPage } from '@/features/hospital/DisciplinesPage.tsx';

export const Route = createFileRoute('/$locale/admin/disciplines')({
  component: DisciplinesPage,
});

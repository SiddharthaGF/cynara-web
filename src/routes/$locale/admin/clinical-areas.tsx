import { createFileRoute } from '@tanstack/react-router';

import { ClinicalAreasPage } from '@/features/hospital/ClinicalAreasPage.tsx';

export const Route = createFileRoute('/$locale/admin/clinical-areas')({
  component: ClinicalAreasPage,
});

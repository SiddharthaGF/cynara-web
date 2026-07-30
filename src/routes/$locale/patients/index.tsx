import { createFileRoute } from '@tanstack/react-router';

import { PatientListPage } from '@/features/patients/PatientListPage.tsx';

export const Route = createFileRoute('/$locale/patients/')({
  component: PatientListPage,
});

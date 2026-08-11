import { createFileRoute } from '@tanstack/react-router';

import { PatientListPage } from '@/features/patients/PatientListPage.tsx';
import { validatePatientListSearch } from '@/features/patients/patientListSearch.ts';

export const Route = createFileRoute('/$locale/patients/')({
  validateSearch: validatePatientListSearch,
  component: PatientListPage,
});

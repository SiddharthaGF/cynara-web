import { createFileRoute } from '@tanstack/react-router';

import { PatientDetailPage } from '@/features/patients/PatientDetailPage.tsx';
import { validatePatientDetailSearch } from '@/features/patients/patientDetailSearch.ts';

export const Route = createFileRoute('/$locale/patients/$id')({
  validateSearch: validatePatientDetailSearch,
  component: PatientDetailPage,
});

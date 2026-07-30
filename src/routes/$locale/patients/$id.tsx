import { createFileRoute } from '@tanstack/react-router';

import { PatientDetailPage } from '@/features/patients/PatientDetailPage.tsx';

export const Route = createFileRoute('/$locale/patients/$id')({
  component: PatientDetailPage,
});

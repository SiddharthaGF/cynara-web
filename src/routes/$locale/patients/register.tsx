import { createFileRoute } from '@tanstack/react-router';

import { PatientRegisterPage } from '@/features/patients/PatientRegisterPage.tsx';

export const Route = createFileRoute('/$locale/patients/register')({
  component: PatientRegisterPage,
});

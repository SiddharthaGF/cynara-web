import { createFileRoute } from '@tanstack/react-router';

import { FacilitiesPage } from '@/features/hospital/FacilitiesPage.tsx';

export const Route = createFileRoute('/$locale/admin/facilities')({
  component: FacilitiesPage,
});

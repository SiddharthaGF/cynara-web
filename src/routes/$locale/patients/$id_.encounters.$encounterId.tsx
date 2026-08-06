import { createFileRoute } from '@tanstack/react-router';

import { EncounterDetailPage } from '@/features/encounters/EncounterDetailPage.tsx';

export const Route = createFileRoute(
  '/$locale/patients/$id_/encounters/$encounterId',
)({
  component: EncounterDetailPage,
});

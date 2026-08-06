import { createFileRoute } from '@tanstack/react-router';

import { DocumentDetailPage } from '@/features/documents/DocumentDetailPage.tsx';

export const Route = createFileRoute(
  '/$locale/patients/$id_/encounters/$encounterId_/documents/$documentId',
)({
  component: DocumentDetailPage,
});

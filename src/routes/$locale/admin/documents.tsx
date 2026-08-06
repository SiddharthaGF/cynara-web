import { createFileRoute } from '@tanstack/react-router';

import { DocumentCatalogPage } from '@/features/hospital/DocumentCatalogPage.tsx';

export const Route = createFileRoute('/$locale/admin/documents')({
  component: DocumentCatalogPage,
});

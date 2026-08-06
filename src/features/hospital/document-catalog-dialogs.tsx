import type { JSX } from 'react';

import { RetireConfirmDialog } from '@/features/hospital/admin-ui.tsx';
import { DocumentFormDialog } from '@/features/hospital/document-form-dialog.tsx';
import type {
  DocumentFormOption,
  DocumentFormValues,
} from '@/features/hospital/document-form-model.ts';
import type { DocumentDefinitionDto } from '@/features/hospital/useHospitalAdmin.ts';

interface DocumentCatalogDialogsProps {
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onCreate: (values: DocumentFormValues) => Promise<void>;
  editing: DocumentDefinitionDto | null;
  onEditOpenChange: (open: boolean) => void;
  onEdit: (values: DocumentFormValues) => Promise<void>;
  retiring: DocumentDefinitionDto | null;
  onRetireOpenChange: (open: boolean) => void;
  onRetire: () => Promise<void>;
  formOptions: DocumentFormOption[];
  formOptionsLoading: boolean;
  activeFacilities: { id: string; name: string }[];
  activeClinicalAreas: { id: string; name: string; facilityId: string }[];
  activeDisciplines: { id: string; name: string; clinicalAreaId: string }[];
  create: {
    isPending: boolean;
    error: string | null;
    isConflict: boolean;
    isDuplicateCode: boolean;
  };
  patch: {
    isPending: boolean;
    error: string | null;
    isConflict: boolean;
  };
  retire: {
    isPending: boolean;
    error: string | null;
  };
  onListRefetch: () => void;
}

export function DocumentCatalogDialogs({
  createOpen,
  onCreateOpenChange,
  onCreate,
  editing,
  onEditOpenChange,
  onEdit,
  retiring,
  onRetireOpenChange,
  onRetire,
  formOptions,
  formOptionsLoading,
  activeFacilities,
  activeClinicalAreas,
  activeDisciplines,
  create,
  patch,
  retire,
  onListRefetch,
}: DocumentCatalogDialogsProps): JSX.Element {
  return (
    <>
      <DocumentFormDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        mode='create'
        record={null}
        formOptions={formOptions}
        formOptionsLoading={formOptionsLoading}
        activeFacilities={activeFacilities}
        activeClinicalAreas={activeClinicalAreas}
        activeDisciplines={activeDisciplines}
        onSubmit={onCreate}
        isPending={create.isPending}
        error={create.error}
        isConflict={create.isConflict}
        isDuplicateCode={create.isDuplicateCode}
        onConflictReload={onListRefetch}
      />

      <DocumentFormDialog
        open={editing !== null}
        onOpenChange={onEditOpenChange}
        mode='edit'
        record={editing}
        formOptions={formOptions}
        formOptionsLoading={formOptionsLoading}
        activeFacilities={activeFacilities}
        activeClinicalAreas={activeClinicalAreas}
        activeDisciplines={activeDisciplines}
        onSubmit={onEdit}
        isPending={patch.isPending}
        error={patch.error}
        isConflict={patch.isConflict}
        isDuplicateCode={false}
        onConflictReload={onListRefetch}
      />

      <RetireConfirmDialog
        open={retiring !== null}
        onOpenChange={onRetireOpenChange}
        name={retiring?.name ?? ''}
        onConfirm={() => void onRetire()}
        isPending={retire.isPending}
        error={retire.error}
      />
    </>
  );
}

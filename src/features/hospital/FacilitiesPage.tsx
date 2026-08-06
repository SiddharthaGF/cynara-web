import { useMemo, type JSX } from 'react';

import { AppShell } from '@/components/app-shell.tsx';
import { AdminTaxonomyScreen } from '@/features/hospital/admin-taxonomy-screen.tsx';
import type { TaxonomyFormValues } from '@/features/hospital/taxonomy-form-model.ts';
import {
  useCreateFacility,
  useFacilities,
  usePatchFacility,
  useRetireFacility,
} from '@/features/hospital/useHospitalAdmin.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

export function FacilitiesPage(): JSX.Element {
  const { can } = useCapabilities();
  const list = useFacilities({ includeRetired: true });
  const create = useCreateFacility();
  const patch = usePatchFacility();
  const retire = useRetireFacility();

  const items = useMemo(
    () =>
      list.items.map((facility) => ({
        id: facility.id,
        code: facility.code,
        name: facility.name,
        status: facility.status,
        rowVersion: facility.rowVersion,
        updatedAt: facility.updatedAt,
        parentId: null,
      })),
    [list.items],
  );

  return (
    <AppShell variant='catalog'>
      <AdminTaxonomyScreen
        resource='facilities'
        items={items}
        isLoading={list.isLoading}
        error={list.error}
        isForbidden={list.isForbidden}
        refetch={list.refetch}
        canWrite={can('write', 'Catalog')}
        parentOptions={[]}
        parentEmpty={false}
        parentNameById={() => undefined}
        mutations={{
          create: {
            submit: async (values: TaxonomyFormValues) => {
              await create.mutate({
                code: values.code,
                name: values.name,
              });
            },
            isPending: create.isPending,
            error: create.error,
            isConflict: create.isConflict,
            isDuplicateCode: create.isDuplicateCode,
            reset: create.reset,
          },
          patch: {
            submit: async (record, name) => {
              await patch.mutate({
                id: record.id,
                name,
                rowVersion: record.rowVersion,
              });
            },
            isPending: patch.isPending,
            error: patch.error,
            isConflict: patch.isConflict,
            reset: patch.reset,
          },
          retire: {
            submit: async (record) => {
              await retire.mutate({
                id: record.id,
                rowVersion: record.rowVersion,
              });
            },
            isPending: retire.isPending,
            error: retire.error,
            isConflict: retire.isConflict,
            reset: retire.reset,
          },
        }}
      />
    </AppShell>
  );
}

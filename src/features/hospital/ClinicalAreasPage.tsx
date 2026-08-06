import { useMemo, type JSX } from 'react';

import { AppShell } from '@/components/app-shell.tsx';
import { AdminTaxonomyScreen } from '@/features/hospital/admin-taxonomy-screen.tsx';
import type { TaxonomyFormValues } from '@/features/hospital/taxonomy-form-model.ts';
import {
  useClinicalAreas,
  useCreateClinicalArea,
  useFacilities,
  usePatchClinicalArea,
  useRetireClinicalArea,
} from '@/features/hospital/useHospitalAdmin.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

export function ClinicalAreasPage(): JSX.Element {
  const { can } = useCapabilities();
  const facilities = useFacilities({ includeRetired: false });
  const list = useClinicalAreas({ includeRetired: true });
  const create = useCreateClinicalArea();
  const patch = usePatchClinicalArea();
  const retire = useRetireClinicalArea();

  const items = useMemo(
    () =>
      list.items.map((area) => ({
        id: area.id,
        code: area.code,
        name: area.name,
        status: area.status,
        rowVersion: area.rowVersion,
        updatedAt: area.updatedAt,
        parentId: area.facilityId ?? null,
      })),
    [list.items],
  );

  const facilityNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const facility of facilities.items) {
      map.set(facility.id, facility.name);
    }
    return (id: string): string | undefined => map.get(id);
  }, [facilities.items]);

  const parentOptions = useMemo(
    () =>
      facilities.items.map((facility) => ({
        id: facility.id,
        name: facility.name,
      })),
    [facilities.items],
  );

  return (
    <AppShell variant='catalog'>
      <AdminTaxonomyScreen
        resource='clinicalAreas'
        items={items}
        isLoading={list.isLoading}
        error={list.error}
        isForbidden={list.isForbidden}
        refetch={list.refetch}
        canWrite={can('write', 'Catalog')}
        parentOptions={parentOptions}
        parentEmpty={!facilities.isLoading && parentOptions.length === 0}
        parentNameById={facilityNameById}
        mutations={{
          create: {
            submit: async (values: TaxonomyFormValues) => {
              await create.mutate({
                code: values.code,
                name: values.name,
                facilityId: values.parentId,
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

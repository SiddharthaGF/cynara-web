import { useMemo, type JSX } from 'react';

import { AppShell } from '@/components/app-shell.tsx';
import { AdminTaxonomyScreen } from '@/features/hospital/admin-taxonomy-screen.tsx';
import type { TaxonomyFormValues } from '@/features/hospital/taxonomy-form-model.ts';
import {
  useClinicalAreas,
  useCreateDiscipline,
  useDisciplines,
  usePatchDiscipline,
  useRetireDiscipline,
} from '@/features/hospital/useHospitalAdmin.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

export function DisciplinesPage(): JSX.Element {
  const { can } = useCapabilities();
  const clinicalAreas = useClinicalAreas({ includeRetired: false });
  const list = useDisciplines({ includeRetired: true });
  const create = useCreateDiscipline();
  const patch = usePatchDiscipline();
  const retire = useRetireDiscipline();

  const items = useMemo(
    () =>
      list.items.map((discipline) => ({
        id: discipline.id,
        code: discipline.code,
        name: discipline.name,
        status: discipline.status,
        rowVersion: discipline.rowVersion,
        updatedAt: discipline.updatedAt,
        parentId: discipline.clinicalAreaId ?? null,
      })),
    [list.items],
  );

  const clinicalAreaNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const area of clinicalAreas.items) {
      map.set(area.id, area.name);
    }
    return (id: string): string | undefined => map.get(id);
  }, [clinicalAreas.items]);

  const parentOptions = useMemo(
    () =>
      clinicalAreas.items.map((area) => ({
        id: area.id,
        name: area.name,
      })),
    [clinicalAreas.items],
  );

  return (
    <AppShell variant='catalog'>
      <AdminTaxonomyScreen
        resource='disciplines'
        items={items}
        isLoading={list.isLoading}
        error={list.error}
        isForbidden={list.isForbidden}
        refetch={list.refetch}
        canWrite={can('write', 'Catalog')}
        parentOptions={parentOptions}
        parentEmpty={!clinicalAreas.isLoading && parentOptions.length === 0}
        parentNameById={clinicalAreaNameById}
        mutations={{
          create: {
            submit: async (values: TaxonomyFormValues) => {
              await create.mutate({
                code: values.code,
                name: values.name,
                clinicalAreaId: values.parentId,
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

import { useParams } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { AppShell } from '@/components/app-shell.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import {
  AdminBackLink,
  AdminErrorAlert,
  AdminPageHeader,
  ReadOnlyBanner,
} from '@/features/hospital/admin-ui.tsx';
import { DocumentCatalogDialogs } from '@/features/hospital/document-catalog-dialogs.tsx';
import { DocumentCatalogTable } from '@/features/hospital/document-catalog-table.tsx';
import type { DocumentFormValues } from '@/features/hospital/document-form-model.ts';
import {
  useCreateDocumentDefinition,
  useDocumentDefinitions,
  useClinicalAreas,
  useDisciplines,
  useFacilities,
  useFormVersionPickerOptions,
  usePatchDocumentDefinition,
  useRetireDocumentDefinition,
  type DocumentDefinitionDto,
} from '@/features/hospital/useHospitalAdmin.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

export function DocumentCatalogPage(): JSX.Element {
  const { t } = useTranslation('hospital');
  const { locale } = useParams({ from: '/$locale' });
  const { can } = useCapabilities();

  const list = useDocumentDefinitions({ includeRetired: true });
  const facilities = useFacilities({ includeRetired: true });
  const clinicalAreas = useClinicalAreas({ includeRetired: true });
  const disciplines = useDisciplines({ includeRetired: true });
  const formOptionsQuery = useFormVersionPickerOptions();
  const create = useCreateDocumentDefinition();
  const patch = usePatchDocumentDefinition();
  const retire = useRetireDocumentDefinition();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentDefinitionDto | null>(null);
  const [retiring, setRetiring] = useState<DocumentDefinitionDto | null>(null);
  const [includeRetired, setIncludeRetired] = useState(false);

  const canWrite = can('write', 'Catalog');
  const activeCount = list.items.filter(
    (item) => item.status === 'active',
  ).length;

  const visibleItems = useMemo(
    () =>
      includeRetired
        ? list.items
        : list.items.filter((item) => item.status === 'active'),
    [list.items, includeRetired],
  );

  const facilityNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const facility of facilities.items) {
      map.set(facility.id, facility.name);
    }
    return map;
  }, [facilities.items]);

  const clinicalAreaNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const area of clinicalAreas.items) {
      map.set(area.id, area.name);
    }
    return map;
  }, [clinicalAreas.items]);

  const disciplineNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const discipline of disciplines.items) {
      map.set(discipline.id, discipline.name);
    }
    return map;
  }, [disciplines.items]);

  const { formNameById, formVersionLabelById } = useMemo(() => {
    const formNames = new Map<string, string>();
    const versionLabels = new Map<string, string>();
    for (const option of formOptionsQuery.options) {
      formNames.set(option.formDefinitionId, option.name);
      for (const version of option.publishedVersions) {
        versionLabels.set(version.id, version.version);
      }
    }
    return {
      formNameById: formNames,
      formVersionLabelById: versionLabels,
    };
  }, [formOptionsQuery.options]);

  const scopeLabel = (item: DocumentDefinitionDto): string => {
    const parts = [
      facilityNameById.get(item.facilityId),
      clinicalAreaNameById.get(item.clinicalAreaId),
      disciplineNameById.get(item.disciplineId),
    ].filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join(' · ') : '—';
  };

  const handleCreateOpen = (open: boolean): void => {
    setCreateOpen(open);
    if (!open) {
      create.reset();
    }
  };

  const handleCreate = async (values: DocumentFormValues): Promise<void> => {
    await create.mutate(values);
    create.reset();
    setCreateOpen(false);
    toast.success(t('documents.createSuccess'));
  };

  const handleEditOpen = (open: boolean): void => {
    if (!open) {
      patch.reset();
      setEditing(null);
    }
  };

  const handleEdit = async (values: DocumentFormValues): Promise<void> => {
    if (!editing) {
      return;
    }
    await patch.mutate({
      id: editing.id,
      name: values.name,
      allowsMultipleInstancesPerEncounter:
        values.allowsMultipleInstancesPerEncounter,
      requiresActorForCreation: values.requiresActorForCreation,
      requiresActorForCompletion: values.requiresActorForCompletion,
      rowVersion: editing.rowVersion,
    });
    patch.reset();
    setEditing(null);
    toast.success(t('documents.editSuccess'));
  };

  const handleRetireOpen = (open: boolean): void => {
    if (!open) {
      retire.reset();
      setRetiring(null);
    }
  };

  const handleRetire = async (): Promise<void> => {
    if (!retiring) {
      return;
    }
    await retire.mutate({
      id: retiring.id,
      rowVersion: retiring.rowVersion,
    });
    retire.reset();
    setRetiring(null);
    toast.success(t('shared.retireSuccess'));
  };

  const activeFacilities = facilities.items.filter(
    (facility) => facility.status === 'active',
  );
  const activeClinicalAreas = clinicalAreas.items.filter(
    (area) => area.status === 'active',
  );
  const activeDisciplines = disciplines.items.filter(
    (discipline) => discipline.status === 'active',
  );

  return (
    <AppShell variant='catalog'>
      <div className='mx-auto max-w-5xl px-6 py-6 pb-12'>
        <AdminBackLink locale={locale} />

        <AdminPageHeader
          title={t('documents.title')}
          subtitle={t('documents.subtitle')}
          count={activeCount}
          actions={
            canWrite ? (
              <Button
                onClick={() => {
                  create.reset();
                  setCreateOpen(true);
                }}
              >
                <Plus className='size-4' />
                {t('shared.add')}
              </Button>
            ) : null
          }
        />

        {list.isForbidden ? (
          <Empty className='mt-6 min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
            <EmptyHeader>
              <EmptyTitle className='text-lg'>
                {t('access.deniedTitle')}
              </EmptyTitle>
              <EmptyDescription>
                {t('access.deniedDescription')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}

        {!list.isForbidden && list.error ? (
          <AdminErrorAlert message={list.error} />
        ) : null}
        {!list.isForbidden && !canWrite ? <ReadOnlyBanner /> : null}

        {list.isForbidden ? null : (
          <div className='mt-8'>
            <div className='mb-4 flex items-center justify-end gap-2'>
              <label
                htmlFor='documents-include-retired'
                className='text-sm text-muted-foreground'
              >
                {includeRetired
                  ? t('shared.hideRetired')
                  : t('shared.showRetired')}
              </label>
              <Switch
                id='documents-include-retired'
                checked={includeRetired}
                onCheckedChange={setIncludeRetired}
                aria-label={t('shared.showRetired')}
              />
            </div>

            <Card className='border-border/70 shadow-sm'>
              <CardContent>
                <div className='mt-6'>
                  <ScrollArea className='w-full rounded-lg border border-border/60 [&_[data-slot=scroll-area-viewport]]:max-h-[min(36rem,70vh)]'>
                    <DocumentCatalogTable
                      items={visibleItems}
                      isLoading={list.isLoading}
                      canWrite={canWrite}
                      locale={locale}
                      formNameById={formNameById}
                      formVersionLabelById={formVersionLabelById}
                      scopeLabel={scopeLabel}
                      onEdit={(item) => {
                        patch.reset();
                        setEditing(item);
                      }}
                      onRetire={(item) => {
                        retire.reset();
                        setRetiring(item);
                      }}
                      onAddFirst={() => {
                        create.reset();
                        setCreateOpen(true);
                      }}
                    />
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DocumentCatalogDialogs
          createOpen={createOpen}
          onCreateOpenChange={handleCreateOpen}
          onCreate={handleCreate}
          editing={editing}
          onEditOpenChange={handleEditOpen}
          onEdit={handleEdit}
          retiring={retiring}
          onRetireOpenChange={handleRetireOpen}
          onRetire={handleRetire}
          formOptions={formOptionsQuery.options}
          formOptionsLoading={formOptionsQuery.isLoading}
          activeFacilities={activeFacilities.map((facility) => ({
            id: facility.id,
            name: facility.name,
          }))}
          activeClinicalAreas={activeClinicalAreas.map((area) => ({
            id: area.id,
            name: area.name,
            facilityId: area.facilityId ?? '',
          }))}
          activeDisciplines={activeDisciplines.map((discipline) => ({
            id: discipline.id,
            name: discipline.name,
            clinicalAreaId: discipline.clinicalAreaId ?? '',
          }))}
          create={create}
          patch={patch}
          retire={retire}
          onListRefetch={() => list.refetch()}
        />
      </div>
    </AppShell>
  );
}

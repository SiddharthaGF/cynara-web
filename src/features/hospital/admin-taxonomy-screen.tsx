import { useParams } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
  RetireConfirmDialog,
} from '@/features/hospital/admin-ui.tsx';
import { TaxonomyFormDialog } from '@/features/hospital/taxonomy-form-dialog.tsx';
import type {
  TaxonomyFormValues,
  TaxonomyParentOption,
  TaxonomyResourceKind,
  TaxonomyRow,
} from '@/features/hospital/taxonomy-form-model.ts';
import { TaxonomyTable } from '@/features/hospital/taxonomy-table.tsx';

export interface TaxonomyMutations {
  create: {
    submit: (values: TaxonomyFormValues) => Promise<void>;
    isPending: boolean;
    error: string | null;
    isConflict: boolean;
    isDuplicateCode: boolean;
    reset: () => void;
  };
  patch: {
    submit: (record: TaxonomyRow, name: string) => Promise<void>;
    isPending: boolean;
    error: string | null;
    isConflict: boolean;
    reset: () => void;
  };
  retire: {
    submit: (record: TaxonomyRow) => Promise<void>;
    isPending: boolean;
    error: string | null;
    isConflict: boolean;
    reset: () => void;
  };
}

interface AdminTaxonomyScreenProps {
  resource: TaxonomyResourceKind;
  items: TaxonomyRow[];
  isLoading: boolean;
  error: string | null;
  isForbidden: boolean;
  refetch: () => void;
  canWrite: boolean;
  parentOptions: TaxonomyParentOption[];
  parentEmpty: boolean;
  parentNameById: (id: string) => string | undefined;
  mutations: TaxonomyMutations;
}

export function AdminTaxonomyScreen({
  resource,
  items,
  isLoading,
  error,
  isForbidden,
  refetch,
  canWrite,
  parentOptions,
  parentEmpty,
  parentNameById,
  mutations,
}: AdminTaxonomyScreenProps): JSX.Element {
  const { t } = useTranslation('hospital');
  const { locale } = useParams({ from: '/$locale' });

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TaxonomyRow | null>(null);
  const [retiring, setRetiring] = useState<TaxonomyRow | null>(null);
  const [includeRetired, setIncludeRetired] = useState(false);

  const visibleItems = useMemo(
    () =>
      includeRetired ? items : items.filter((item) => item.status === 'active'),
    [items, includeRetired],
  );
  const activeCount = items.filter((item) => item.status === 'active').length;

  const handleCreateOpen = (open: boolean): void => {
    setCreateOpen(open);
    if (!open) {
      mutations.create.reset();
    }
  };

  const handleCreate = async (values: TaxonomyFormValues): Promise<void> => {
    await mutations.create.submit(values);
    mutations.create.reset();
    setCreateOpen(false);
    toast.success(t(`${resource}.createSuccess`));
  };

  const handleEditOpen = (open: boolean): void => {
    if (!open) {
      mutations.patch.reset();
      setEditing(null);
    }
  };

  const handleEdit = async (values: TaxonomyFormValues): Promise<void> => {
    if (!editing) {
      return;
    }
    await mutations.patch.submit(editing, values.name);
    mutations.patch.reset();
    setEditing(null);
    toast.success(t(`${resource}.editSuccess`));
  };

  const handleRetireOpen = (open: boolean): void => {
    if (!open) {
      mutations.retire.reset();
      setRetiring(null);
    }
  };

  const handleRetire = async (): Promise<void> => {
    if (!retiring) {
      return;
    }
    await mutations.retire.submit(retiring);
    mutations.retire.reset();
    setRetiring(null);
    toast.success(t('shared.retireSuccess'));
  };

  const editConflictReload = (): void => {
    mutations.patch.reset();
    refetch();
  };

  return (
    <div className='mx-auto max-w-5xl px-6 py-6 pb-12'>
      <AdminBackLink locale={locale} />

      <AdminPageHeader
        title={t(`${resource}.title`)}
        subtitle={t(`${resource}.subtitle`)}
        count={activeCount}
        actions={
          canWrite ? (
            <Button
              onClick={() => {
                mutations.create.reset();
                setCreateOpen(true);
              }}
            >
              <Plus className='size-4' />
              {t('shared.add')}
            </Button>
          ) : null
        }
      />

      {isForbidden ? (
        <Empty className='mt-6 min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
          <EmptyHeader>
            <EmptyTitle className='text-lg'>
              {t('access.deniedTitle')}
            </EmptyTitle>
            <EmptyDescription>{t('access.deniedDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {!isForbidden && error ? <AdminErrorAlert message={error} /> : null}
      {!isForbidden && !canWrite ? <ReadOnlyBanner /> : null}

      {isForbidden ? null : (
        <div className='mt-8'>
          <div className='mb-4 flex items-center justify-end gap-2'>
            <label
              htmlFor={`${resource}-include-retired`}
              className='text-sm text-muted-foreground'
            >
              {includeRetired
                ? t('shared.hideRetired')
                : t('shared.showRetired')}
            </label>
            <Switch
              id={`${resource}-include-retired`}
              checked={includeRetired}
              onCheckedChange={setIncludeRetired}
              aria-label={t('shared.showRetired')}
            />
          </div>

          <Card className='border-border/70 shadow-sm'>
            <CardContent>
              <div className='mt-6'>
                <ScrollArea className='w-full rounded-lg border border-border/60 [&_[data-slot=scroll-area-viewport]]:max-h-[min(36rem,70vh)]'>
                  <TaxonomyTable
                    resource={resource}
                    items={visibleItems}
                    isLoading={isLoading}
                    canWrite={canWrite}
                    locale={locale}
                    parentNameById={parentNameById}
                    onEdit={(item) => {
                      mutations.patch.reset();
                      setEditing(item);
                    }}
                    onRetire={(item) => {
                      mutations.retire.reset();
                      setRetiring(item);
                    }}
                    onAddFirst={() => {
                      mutations.create.reset();
                      setCreateOpen(true);
                    }}
                  />
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <TaxonomyFormDialog
        open={createOpen}
        onOpenChange={handleCreateOpen}
        resource={resource}
        mode='create'
        record={null}
        parentOptions={parentOptions}
        parentEmpty={parentEmpty}
        onSubmit={handleCreate}
        isPending={mutations.create.isPending}
        error={mutations.create.error}
        isConflict={mutations.create.isConflict}
        isDuplicateCode={mutations.create.isDuplicateCode}
        onConflictReload={() => refetch()}
      />

      <TaxonomyFormDialog
        open={editing !== null}
        onOpenChange={handleEditOpen}
        resource={resource}
        mode='edit'
        record={editing}
        parentOptions={parentOptions}
        parentEmpty={parentEmpty}
        onSubmit={handleEdit}
        isPending={mutations.patch.isPending}
        error={mutations.patch.error}
        isConflict={mutations.patch.isConflict}
        isDuplicateCode={false}
        onConflictReload={editConflictReload}
      />

      <RetireConfirmDialog
        open={retiring !== null}
        onOpenChange={handleRetireOpen}
        name={retiring?.name ?? ''}
        onConfirm={() => void handleRetire()}
        isPending={mutations.retire.isPending}
        error={mutations.retire.error}
      />
    </div>
  );
}

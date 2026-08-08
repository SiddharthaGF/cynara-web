import { Archive, Pencil } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import {
  AdminEmptyState,
  AdminTableSkeleton,
  StatusBadge,
} from '@/features/hospital/admin-ui.tsx';
import { formatAdminDate } from '@/features/hospital/format-date.ts';
import type { DocumentDefinitionDto } from '@/features/hospital/useHospitalAdmin.ts';
import { cn } from '@/lib/utils.ts';

interface DocumentCatalogTableProps {
  items: DocumentDefinitionDto[];
  isLoading: boolean;
  canWrite: boolean;
  locale: string;
  formNameById: Map<string, string>;
  formVersionLabelById: Map<string, string>;
  scopeLabel: (item: DocumentDefinitionDto) => string;
  onEdit: (item: DocumentDefinitionDto) => void;
  onRetire: (item: DocumentDefinitionDto) => void;
  onAddFirst: () => void;
}

export function DocumentCatalogTable({
  items,
  isLoading,
  canWrite,
  locale,
  formNameById,
  formVersionLabelById,
  scopeLabel,
  onEdit,
  onRetire,
  onAddFirst,
}: DocumentCatalogTableProps): JSX.Element {
  const { t } = useTranslation('hospital');
  const columnCount = (canWrite ? 6 : 5) + 1;

  const renderBody = (): JSX.Element => {
    if (isLoading) {
      return (
        <AdminTableSkeleton
          rows={4}
          columns={columnCount}
        />
      );
    }
    if (items.length === 0) {
      return (
        <TableRow className='hover:bg-transparent'>
          <TableCell
            colSpan={columnCount}
            className='p-6'
          >
            <AdminEmptyState
              title={t('shared.emptyTitle')}
              description={t('documents.emptyDescription')}
              action={
                canWrite ? (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={onAddFirst}
                  >
                    {t('shared.emptyAction')}
                  </Button>
                ) : null
              }
            />
          </TableCell>
        </TableRow>
      );
    }
    return (
      <>
        {items.map((item) => {
          const isRetired = item.status === 'retired';
          const versionLabel = formVersionLabelById.get(item.formVersionId);
          return (
            <TableRow
              key={item.id}
              className={cn(isRetired && 'opacity-60')}
            >
              <TableCell className='font-mono text-xs'>{item.code}</TableCell>
              <TableCell className='font-medium'>{item.name}</TableCell>
              <TableCell className='text-muted-foreground'>
                {formNameById.get(item.formDefinitionId) ?? '—'}
                {versionLabel ? ` v${versionLabel}` : ''}
              </TableCell>
              <TableCell className='text-muted-foreground'>
                {scopeLabel(item)}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell className='text-muted-foreground'>
                {formatAdminDate(item.updatedAt, locale)}
              </TableCell>
              {canWrite ? (
                <TableCell className='text-right'>
                  <div className='flex items-center justify-end gap-1'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onEdit(item)}
                      data-testid='admin-row-edit'
                    >
                      <Pencil className='size-4' />
                      <span className='sr-only'>{t('shared.edit')}</span>
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      disabled={isRetired}
                      onClick={() => onRetire(item)}
                      data-testid='admin-row-retire'
                    >
                      <Archive className='size-4' />
                      <span className='sr-only'>{t('shared.retire')}</span>
                    </Button>
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </>
    );
  };

  return (
    <div className='overflow-x-auto'>
      <table
        data-slot='table'
        data-testid='admin-table'
        className='w-full min-w-[56rem] caption-bottom text-sm'
      >
        <TableHeader>
          <TableRow className='hover:bg-transparent'>
            <TableHead>{t('shared.columnCode')}</TableHead>
            <TableHead>{t('shared.columnName')}</TableHead>
            <TableHead>{t('documents.columnForm')}</TableHead>
            <TableHead>{t('documents.columnScope')}</TableHead>
            <TableHead>{t('shared.columnStatus')}</TableHead>
            <TableHead>{t('shared.columnUpdated')}</TableHead>
            {canWrite ? (
              <TableHead className='text-right'>
                <span className='sr-only'>{t('shared.edit')}</span>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>{renderBody()}</TableBody>
      </table>
    </div>
  );
}

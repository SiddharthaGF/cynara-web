import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { CatalogPagination } from '@/components/catalog-pagination.tsx';

interface FormListPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function FormListPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: FormListPaginationProps): JSX.Element | null {
  const { t } = useTranslation('forms');
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <CatalogPagination
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={onPageChange}
      rangeText={t('list.pageRange', {
        start: rangeStart,
        end: rangeEnd,
        total: totalCount,
      })}
      previousLabel={t('list.previousPage')}
      nextLabel={t('list.nextPage')}
      className='w-full'
    />
  );
}

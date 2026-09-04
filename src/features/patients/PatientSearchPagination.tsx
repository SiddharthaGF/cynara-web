import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { CatalogPagination } from '@/components/catalog-pagination.tsx';

interface PatientSearchPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function PatientSearchPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: PatientSearchPaginationProps): JSX.Element | null {
  const { t } = useTranslation('patients');
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <CatalogPagination
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={onPageChange}
      rangeText={t('search.pageRange', {
        start: rangeStart,
        end: rangeEnd,
        total: totalCount,
      })}
      previousLabel={t('search.previousPage')}
      nextLabel={t('search.nextPage')}
      className='mt-4'
    />
  );
}

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { CatalogPagination } from '@/components/catalog-pagination.tsx';

interface UserDirectoryPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

/**
 * Numbered pager with a stable window against the server's fixed order.
 * Absent entirely while totalCount fits a single page.
 */
export function UserDirectoryPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: UserDirectoryPaginationProps): JSX.Element | null {
  const { t } = useTranslation('users');
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <CatalogPagination
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      onPageChange={onPageChange}
      rangeText={t('pagination.pageRange', {
        start: rangeStart,
        end: rangeEnd,
        total: totalCount,
      })}
      previousLabel={t('pagination.previousPage')}
      nextLabel={t('pagination.nextPage')}
      className='mt-4'
    />
  );
}

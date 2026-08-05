import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination.tsx';
import { cn } from '@/lib/utils.ts';

function buildPageItems(
  page: number,
  totalPages: number,
): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) {
    items.push('ellipsis');
  }

  for (let current = start; current <= end; current += 1) {
    items.push(current);
  }

  if (end < totalPages - 1) {
    items.push('ellipsis');
  }

  items.push(totalPages);
  return items;
}

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
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalCount <= pageSize) {
    return null;
  }

  const pageItems = buildPageItems(page, totalPages);
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div
      className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
      data-testid='patient-search-pagination'
    >
      <p className='text-sm text-muted-foreground'>
        {t('search.pageRange', {
          start: rangeStart,
          end: rangeEnd,
          total: totalCount,
        })}
      </p>
      <Pagination className='mx-0 w-auto justify-start sm:justify-end'>
        <PaginationContent>
          <PaginationItem>
            <Button
              type='button'
              variant='ghost'
              size='default'
              className='pl-1.5!'
              disabled={page <= 1}
              data-testid='patient-search-page-prev'
              aria-label={t('search.previousPage')}
              onClick={() => {
                onPageChange(page - 1);
              }}
            >
              <ChevronLeftIcon data-icon='inline-start' />
              <span className='hidden sm:block'>
                {t('search.previousPage')}
              </span>
            </Button>
          </PaginationItem>
          {pageItems.map((item, index) =>
            item === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${String(index)}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <Button
                  type='button'
                  size='icon'
                  variant={item === page ? 'outline' : 'ghost'}
                  aria-current={item === page ? 'page' : undefined}
                  data-testid={`patient-search-page-${String(item)}`}
                  className={cn(item === page && 'pointer-events-none')}
                  onClick={() => {
                    onPageChange(item);
                  }}
                >
                  {item}
                </Button>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <Button
              type='button'
              variant='ghost'
              size='default'
              className='pr-1.5!'
              disabled={page >= totalPages}
              data-testid='patient-search-page-next'
              aria-label={t('search.nextPage')}
              onClick={() => {
                onPageChange(page + 1);
              }}
            >
              <span className='hidden sm:block'>{t('search.nextPage')}</span>
              <ChevronRightIcon data-icon='inline-end' />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

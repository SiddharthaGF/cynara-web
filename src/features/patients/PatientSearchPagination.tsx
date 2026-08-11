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
): ({ kind: 'page'; value: number } | { kind: 'ellipsis'; id: string })[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => ({
      kind: 'page' as const,
      value: index + 1,
    }));
  }

  const items: (
    | { kind: 'page'; value: number }
    | { kind: 'ellipsis'; id: string }
  )[] = [{ kind: 'page', value: 1 }];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) {
    items.push({ kind: 'ellipsis', id: `ellipsis-before-${String(start)}` });
  }

  for (let current = start; current <= end; current += 1) {
    items.push({ kind: 'page', value: current });
  }

  if (end < totalPages - 1) {
    items.push({ kind: 'ellipsis', id: `ellipsis-after-${String(end)}` });
  }

  items.push({ kind: 'page', value: totalPages });
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
    <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
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
          {pageItems.map((item) =>
            item.kind === 'ellipsis' ? (
              <PaginationItem key={item.id}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item.value}>
                <Button
                  type='button'
                  size='icon'
                  variant={item.value === page ? 'outline' : 'ghost'}
                  aria-current={item.value === page ? 'page' : undefined}
                  className={cn(item.value === page && 'pointer-events-none')}
                  onClick={() => {
                    onPageChange(item.value);
                  }}
                >
                  {item.value}
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

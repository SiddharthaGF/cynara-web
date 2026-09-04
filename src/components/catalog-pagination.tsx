import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { JSX } from 'react';

import { Button } from '@/components/ui/button.tsx';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination.tsx';
import { cn } from '@/lib/utils.ts';

type PageItem = { kind: 'page'; value: number } | { kind: 'ellipsis'; id: string };

function buildPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => ({
      kind: 'page' as const,
      value: index + 1,
    }));
  }

  const items: PageItem[] = [{ kind: 'page', value: 1 }];
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

interface CatalogPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  rangeText: string;
  previousLabel: string;
  nextLabel: string;
  className?: string;
}

/**
 * Numbered pager with a stable window against the server's fixed order.
 * Absent entirely while totalCount fits a single page. Shared by the
 * form, patient, and user catalogs; callers translate every string.
 */
export function CatalogPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  rangeText,
  previousLabel,
  nextLabel,
  className,
}: CatalogPaginationProps): JSX.Element | null {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalCount <= pageSize) {
    return null;
  }

  const pageItems = buildPageItems(page, totalPages);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className='text-sm text-muted-foreground'>{rangeText}</p>
      <Pagination className='mx-0 w-auto justify-start sm:justify-end'>
        <PaginationContent>
          <PaginationItem>
            <Button
              type='button'
              variant='ghost'
              size='default'
              className='pl-1.5!'
              disabled={page <= 1}
              aria-label={previousLabel}
              onClick={() => {
                onPageChange(page - 1);
              }}
            >
              <ChevronLeftIcon data-icon='inline-start' />
              <span className='hidden sm:block'>{previousLabel}</span>
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
              aria-label={nextLabel}
              onClick={() => {
                onPageChange(page + 1);
              }}
            >
              <span className='hidden sm:block'>{nextLabel}</span>
              <ChevronRightIcon data-icon='inline-end' />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

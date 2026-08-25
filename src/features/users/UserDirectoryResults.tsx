import { Link } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { UserListItem } from '@/api/users.ts';
import { Badge } from '@/components/ui/badge.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { cn } from '@/lib/utils.ts';

interface UserDirectoryResultsProps {
  items: UserListItem[];
  locale: string;
  /** Dimmed while a refetch over cached rows is in flight. */
  stale?: boolean;
}

/**
 * Directory table. Hospital attribution derives ONLY from the returned
 * rows; the columns never promise sortable or narrowed results.
 */
export function UserDirectoryResults({
  items,
  locale,
  stale = false,
}: UserDirectoryResultsProps): JSX.Element {
  const { t } = useTranslation('users');

  return (
    <div className={cn('overflow-x-auto', stale && 'opacity-60')}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('table.email')}</TableHead>
            <TableHead>{t('table.hospitals')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link
                  to='/$locale/admin/users/$userId'
                  params={{ locale, userId: item.id }}
                  className='font-medium underline-offset-4 hover:underline'
                >
                  {item.email}
                </Link>
              </TableCell>
              <TableCell>
                <span className='flex flex-wrap gap-1'>
                  {item.hospitals.map((hospital) => (
                    <Badge
                      key={hospital}
                      variant='secondary'
                    >
                      {hospital}
                    </Badge>
                  ))}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

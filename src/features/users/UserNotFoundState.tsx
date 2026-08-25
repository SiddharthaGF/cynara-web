import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { DEFAULT_USER_PAGE_SIZE } from '@/features/users/userListSearch.ts';

interface UserNotFoundStateProps {
  locale: string;
}

/**
 * Shared 404-collapse view for the directory detail route. Scope-neutral by
 * design: an unknown id and an out-of-scope id render exactly the same copy
 * with no hint distinguishing them.
 */
export function UserNotFoundState({
  locale,
}: UserNotFoundStateProps): JSX.Element {
  const { t } = useTranslation('users');

  return (
    <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
      <EmptyHeader>
        <EmptyTitle className='text-lg'>{t('notFound.title')}</EmptyTitle>
        <EmptyDescription>{t('notFound.description')}</EmptyDescription>
      </EmptyHeader>
      <div className='mt-2'>
        <Link
          to='/$locale/admin/users'
          params={{ locale }}
          search={{ page: 1, pageSize: DEFAULT_USER_PAGE_SIZE }}
          className='inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline'
        >
          <ArrowLeft className='size-4' />
          {t('notFound.backToDirectory')}
        </Link>
      </div>
    </Empty>
  );
}

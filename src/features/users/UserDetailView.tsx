import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { UserDto } from '@/api/users.ts';
import { Badge } from '@/components/ui/badge.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { DEFAULT_USER_PAGE_SIZE } from '@/features/users/userListSearch.ts';

interface UserDetailViewProps {
  user: UserDto;
  locale: string;
}

/**
 * Directory detail. Renders exactly the DTO fields returned by the scoped
 * read API — identity, in-scope memberships, identity account flags, and
 * the effective-capability union as returned. No roles section exists
 * anywhere in this surface.
 */
export function UserDetailView({
  user,
  locale,
}: UserDetailViewProps): JSX.Element {
  const { t } = useTranslation('users');
  const memberships = user.memberships ?? [];
  const capabilities = user.capabilities ?? [];

  return (
    <div className='space-y-6'>
      <Card className='border-border/70 shadow-sm'>
        <CardHeader>
          <CardTitle className='font-heading text-lg'>
            {t('detail.identity')}
          </CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className='grid gap-x-6 gap-y-3 sm:grid-cols-2'>
            <div>
              <dt className='text-sm font-medium text-muted-foreground'>
                {t('detail.email')}
              </dt>
              <dd className='mt-0.5 text-sm'>{user.email}</dd>
            </div>
            <div>
              <dt className='text-sm font-medium text-muted-foreground'>
                {t('detail.userName')}
              </dt>
              <dd className='mt-0.5 text-sm'>{user.userName}</dd>
            </div>
            <div>
              <dt className='text-sm font-medium text-muted-foreground'>
                {t('detail.flags.emailConfirmed')}
              </dt>
              <dd className='mt-0.5 text-sm'>
                {(user.flags?.emailConfirmed ?? false)
                  ? t('common:yes')
                  : t('common:no')}
              </dd>
            </div>
            <div>
              <dt className='text-sm font-medium text-muted-foreground'>
                {t('detail.flags.lockoutEnabled')}
              </dt>
              <dd className='mt-0.5 text-sm'>
                {(user.flags?.lockoutEnabled ?? false)
                  ? t('common:yes')
                  : t('common:no')}
              </dd>
            </div>
            <div>
              <dt className='text-sm font-medium text-muted-foreground'>
                {t('detail.flags.lockoutEnd')}
              </dt>
              <dd className='mt-0.5 text-sm'>
                {user.flags?.lockoutEnd ?? '—'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className='border-border/70 shadow-sm'>
        <CardHeader>
          <CardTitle className='font-heading text-lg'>
            {t('detail.memberships')}
          </CardTitle>
          <CardDescription>
            {t('detail.membershipsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className='text-sm text-muted-foreground'>{t('detail.none')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('detail.hospital')}</TableHead>
                  <TableHead>{t('detail.actorId')}</TableHead>
                  <TableHead>{t('detail.memberSince')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((membership) => (
                  <TableRow
                    key={`${membership.hospital}-${membership.actorId}`}
                  >
                    <TableCell className='font-medium'>
                      {membership.hospital}
                    </TableCell>
                    <TableCell className='font-mono text-xs'>
                      {membership.actorId}
                    </TableCell>
                    <TableCell>{membership.createdAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className='border-border/70 shadow-sm'>
        <CardHeader>
          <CardTitle className='font-heading text-lg'>
            {t('detail.capabilities')}
          </CardTitle>
          <CardDescription>
            {t('detail.capabilitiesDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {capabilities.length === 0 ? (
            <p className='text-sm text-muted-foreground'>{t('detail.none')}</p>
          ) : (
            <span className='flex flex-wrap gap-1.5'>
              {capabilities.map((capability) => (
                <Badge
                  key={capability}
                  variant='secondary'
                >
                  {capability}
                </Badge>
              ))}
            </span>
          )}
        </CardContent>
      </Card>

      <div>
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
    </div>
  );
}

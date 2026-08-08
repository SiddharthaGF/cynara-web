import { Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowLeft, Ban } from 'lucide-react';
import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { TableRow, TableCell } from '@/components/ui/table.tsx';
import { cn } from '@/lib/utils.ts';

export type AdminStatus = 'active' | 'retired' | 'suspended' | 'inactive';

const STATUS_BADGE_VARIANT: Record<
  AdminStatus,
  'default' | 'outline' | 'secondary' | 'destructive'
> = {
  active: 'default',
  retired: 'destructive',
  suspended: 'secondary',
  inactive: 'outline',
};

function toAdminStatus(status: string): AdminStatus {
  switch (status) {
    case 'active':
    case 'retired':
    case 'suspended':
    case 'inactive': {
      return status;
    }
    default: {
      return 'inactive';
    }
  }
}

export function StatusBadge({ status }: { status: string }): JSX.Element {
  const { t } = useTranslation('hospital');
  const normalized = toAdminStatus(status);
  return (
    <Badge variant={STATUS_BADGE_VARIANT[normalized]}>
      {t(`shared.status.${normalized}`)}
    </Badge>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  count,
  actions,
}: {
  title: string;
  subtitle: string;
  count?: number;
  actions?: ReactNode;
}): JSX.Element {
  const { t } = useTranslation('hospital');
  return (
    <header className='grid gap-6 md:grid-cols-[1fr_auto] md:items-end'>
      <div>
        <p className='mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
          <Ban className='size-3' />
          {t('shared.eyebrow')}
        </p>
        <h1 className='font-display text-balance text-4xl font-semibold tracking-tight md:text-5xl'>
          {title}
        </h1>
        <p className='mt-3 max-w-lg text-base leading-relaxed text-muted-foreground'>
          {subtitle}
        </p>
      </div>
      <div className='flex flex-col items-start gap-3 md:items-end'>
        {count === undefined ? null : (
          <span className='text-sm text-muted-foreground'>
            {t('shared.activeCount', { count })}
          </span>
        )}
        {actions}
      </div>
    </header>
  );
}

export function ReadOnlyBanner(): JSX.Element | null {
  const { t } = useTranslation('hospital');
  return (
    <Alert className='mb-6'>
      <AlertTriangle className='size-4' />
      <AlertDescription>{t('shared.notEditableDescription')}</AlertDescription>
    </Alert>
  );
}

export function AdminErrorAlert({
  message,
  className,
}: {
  message: string;
  className?: string;
}): JSX.Element {
  return (
    <Alert
      variant='destructive'
      className={cn('mb-6', className)}
      data-testid='admin-load-error'
    >
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <Empty
      className='min-h-44 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'
      data-testid='admin-empty-state'
    >
      <EmptyHeader>
        <EmptyTitle className='text-lg'>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action}
    </Empty>
  );
}

export function AdminTableSkeleton({
  rows = 4,
  columns = 3,
}: {
  rows?: number;
  columns?: number;
}): JSX.Element {
  return (
    <>
      {Array.from({ length: rows }, (_row, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }, (_column, columnIndex) => (
            <TableCell key={columnIndex}>
              <Skeleton
                className={cn(
                  'h-5',
                  columnIndex === columns - 1 ? 'w-16' : 'w-full max-w-48',
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function RetireConfirmDialog({
  open,
  onOpenChange,
  name,
  onConfirm,
  isPending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onConfirm: () => void;
  isPending: boolean;
  error?: string | null;
}): JSX.Element {
  const { t } = useTranslation('hospital');
  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent size='sm'>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('shared.retireTitle', { name })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('shared.retireDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert
            variant='destructive'
            className='mt-2'
          >
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{t('shared.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant='destructive'
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? t('shared.retiring') : t('shared.retireConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AdminBackLink({ locale }: { locale: string }): JSX.Element {
  const { t } = useTranslation('hospital');
  return (
    <Button
      variant='ghost'
      size='sm'
      nativeButton={false}
      className='mb-6 text-muted-foreground'
      render={
        <Link
          to='/$locale/admin'
          params={{ locale }}
          className='inline-flex items-center gap-1.5'
        />
      }
    >
      <ArrowLeft className='size-4' />
      {t('shared.backToHub')}
    </Button>
  );
}

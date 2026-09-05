import { useParams, useRouteContext } from '@tanstack/react-router';
import { Loader2, Plus, RefreshCw, UserPlus } from 'lucide-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { InvitationDto } from '@/api/invitations.ts';
import { ListEmptyState } from '@/components/list-empty-state.tsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';
import { CancelInvitationDialog } from '@/features/invitations/CancelInvitationDialog.tsx';
import { CreateInvitationDialog } from '@/features/invitations/CreateInvitationDialog.tsx';
import { InvitationView } from '@/features/invitations/InvitationView.tsx';
import { ResendInvitationDialog } from '@/features/invitations/ResendInvitationDialog.tsx';
import { useInvitationsList } from '@/features/invitations/useInvitationsList.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

/**
 * Invitation lifecycle workspace. Read access comes from the route guard;
 * the create/cancel/resend controls additionally require `.write` and send no
 * requests without it. The token returned by create/resend stays inside the
 * owning dialog's local state.
 */
export function InvitationListWorkspace(): JSX.Element {
  const { t } = useTranslation(['invitations', 'api']);
  const { locale } = useParams({ from: '/$locale' });
  const { can } = useCapabilities();
  const canWrite = can('write', 'Invitation');

  const { items, isLoading, isFetching, error, isForbidden, retry } =
    useInvitationsList();

  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<InvitationDto | null>(null);
  const [resendTarget, setResendTarget] = useState<InvitationDto | null>(null);

  const { workspace } = useRouteContext({ from: '/$locale' });
  const hospitalName = workspace?.name ?? workspace?.code ?? null;

  const pendingCount = items.filter((item) => item.status === 'pending').length;

  if (isForbidden) {
    return (
      <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10'>
        <EmptyHeader>
          <EmptyTitle className='text-lg'>{t('forbidden.title')}</EmptyTitle>
          <EmptyDescription>{t('forbidden.description')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Card className='kardex border-border/70 shadow-sm'>
      <InvitationListHeader
        pendingCount={pendingCount}
        itemCount={items.length}
        isLoading={isLoading}
        canWrite={canWrite}
        onCreate={() => {
          setCreateOpen(true);
        }}
      />
      <CardContent>
        {error === null ? null : (
          <Alert
            variant='destructive'
            className='mb-4'
          >
            <AlertTitle>{t('error.title')}</AlertTitle>
            <AlertDescription className='flex flex-wrap items-center justify-between gap-2'>
              <span>{error}</span>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={retry}
              >
                <RefreshCw data-icon='inline-start' />
                {t('error.retry')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div
            className='grid gap-3'
            aria-busy='true'
          >
            <Skeleton className='h-9 w-full' />
            <Skeleton className='h-9 w-full' />
            <Skeleton className='h-9 w-full' />
          </div>
        ) : null}

        {!isLoading && items.length > 0 ? (
          <div className='overflow-x-auto'>
            {isFetching ? (
              <p className='mb-2 flex items-center gap-1.5 text-sm text-muted-foreground'>
                <Loader2 className='size-3.5 animate-spin' />
                {t('list.refreshing')}
              </p>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.email')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead>{t('table.issued')}</TableHead>
                  <TableHead>{t('table.expires')}</TableHead>
                  <TableHead className='text-right'>
                    {t('table.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((invitation) => (
                  <InvitationView
                    key={invitation.id}
                    invitation={invitation}
                    locale={locale}
                    canWrite={canWrite}
                    onCancel={setCancelTarget}
                    onResend={setResendTarget}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {!isLoading && !error && items.length === 0 ? (
          <ListEmptyState
            title={t('empty.title')}
            description={t('empty.description')}
            helpText={t('empty.help')}
            action={
              canWrite ? (
                <Button
                  type='button'
                  size='sm'
                  onClick={() => {
                    setCreateOpen(true);
                  }}
                >
                  <Plus data-icon='inline-start' />
                  {t('empty.action')}
                </Button>
              ) : undefined
            }
          />
        ) : null}
      </CardContent>

      <CreateInvitationDialog
        open={createOpen}
        locale={locale}
        hospitalName={hospitalName}
        onOpenChange={setCreateOpen}
      />
      <CancelInvitationDialog
        invitation={cancelTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
          }
        }}
        onSettled={() => setCancelTarget(null)}
      />
      <ResendInvitationDialog
        invitation={resendTarget}
        locale={locale}
        onOpenChange={(open) => {
          if (!open) {
            setResendTarget(null);
          }
        }}
        onSettled={() => setResendTarget(null)}
      />
    </Card>
  );
}

/**
 * Workspace card header: title block, pending folio, and the guarded create
 * action. Branches here are presentation-only over already-resolved flags.
 */
function InvitationListHeader({
  pendingCount,
  itemCount,
  isLoading,
  canWrite,
  onCreate,
}: {
  pendingCount: number;
  itemCount: number;
  isLoading: boolean;
  canWrite: boolean;
  onCreate: () => void;
}): JSX.Element {
  const { t } = useTranslation(['invitations', 'api']);
  return (
    <CardHeader className='flex flex-row items-start justify-between gap-4'>
      <div>
        <p className='mb-2 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase'>
          {t('list.eyebrow')}
        </p>
        <CardTitle className='flex items-center gap-2 font-sans text-[0.9375rem] font-semibold tracking-[-0.01em] text-foreground'>
          <UserPlus className='size-4 text-muted-foreground' />
          {t('list.title')}
        </CardTitle>
        <CardDescription>{t('list.description')}</CardDescription>
        {!isLoading && itemCount > 0 ? (
          <p className='kardex-folio mt-2 font-mono text-xs text-muted-foreground'>
            {t('list.pendingFolio', { count: pendingCount })}
          </p>
        ) : null}
      </div>
      {canWrite ? (
        <Button
          type='button'
          onClick={onCreate}
        >
          <Plus data-icon='inline-start' />
          {t('create.button')}
        </Button>
      ) : null}
    </CardHeader>
  );
}

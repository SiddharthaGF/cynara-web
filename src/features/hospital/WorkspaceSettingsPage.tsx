import { useForm } from '@tanstack/react-form';
import { useParams } from '@tanstack/react-router';
import { Save } from 'lucide-react';
import type { JSX } from 'react';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { AppShell } from '@/components/app-shell.tsx';
import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Spinner } from '@/components/ui/spinner.tsx';
import {
  AdminBackLink,
  AdminErrorAlert,
  ReadOnlyBanner,
  StatusBadge,
} from '@/features/hospital/admin-ui.tsx';
import { formatAdminDate } from '@/features/hospital/format-date.ts';
import {
  useUpdateWorkspace,
  useWorkspace,
} from '@/features/hospital/useHospitalAdmin.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';
import { fieldErrorText } from '@/lib/useSyncedTanstackForm.ts';

export function WorkspaceSettingsPage(): JSX.Element {
  const { t } = useTranslation('hospital');
  const { locale }: { locale: string } = useParams({ from: '/$locale' });
  const { can } = useCapabilities();
  const { workspace, isLoading, error, refetch } = useWorkspace();
  const update = useUpdateWorkspace();

  const canEdit = can('write', 'Workspace');

  const form = useForm({
    defaultValues: {
      name: workspace?.name ?? '',
    },
    onSubmit: async ({ value }) => {
      if (!workspace) {
        return;
      }
      const name = value.name.trim();
      if (name === workspace.name) {
        return;
      }
      await update.mutate({ name, rowVersion: workspace.rowVersion });
      update.reset();
      toast.success(t('workspace.saveSuccess'));
      refetch();
    },
  });

  // Keep the form in sync when the server record is refreshed after a concurrency conflict is resolved via refetch.
  useEffect(() => {
    if (!workspace) {
      return;
    }
    form.update({ defaultValues: { name: workspace.name } });
  }, [form, workspace?.name, workspace?.rowVersion]);

  const errorText = useMemo(() => update.error, [update.error]);

  if (isLoading) {
    return (
      <AppShell variant='catalog'>
        <div className='mx-auto max-w-3xl px-6 py-10'>
          <Skeleton className='h-4 w-40' />
          <div className='mt-10 space-y-4'>
            <Skeleton className='h-10 w-1/2' />
            <Skeleton className='h-32 w-full' />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!workspace) {
    return (
      <AppShell variant='catalog'>
        <div className='mx-auto max-w-3xl px-6 py-10'>
          <AdminErrorAlert message={error ?? t('workspace.loadFailed')} />
          <Button
            variant='outline'
            onClick={() => refetch()}
          >
            {t('access.retry')}
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell variant='catalog'>
      <div className='mx-auto max-w-3xl px-6 py-10 pb-20'>
        <AdminBackLink locale={locale} />

        <header className='mb-10'>
          <p className='mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.2em] text-accent uppercase'>
            {t('workspace.title')}
          </p>
          <h1 className='font-display text-balance text-4xl font-semibold tracking-tight'>
            {workspace.name}
          </h1>
          <p className='mt-3 max-w-lg text-base leading-relaxed text-muted-foreground'>
            {t('workspace.subtitle')}
          </p>
        </header>

        {error ? <AdminErrorAlert message={error} /> : null}
        {canEdit ? null : <ReadOnlyBanner />}

        <div className='grid gap-6'>
          <Card className='border-border/70 shadow-sm'>
            <CardHeader>
              <CardTitle className='font-heading text-lg'>
                {t('workspace.title')}
              </CardTitle>
              <CardDescription>{t('workspace.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className='grid gap-4 sm:grid-cols-2'>
                <div>
                  <dt className='text-sm text-muted-foreground'>
                    {t('workspace.code')}
                  </dt>
                  <dd className='font-mono text-sm font-medium'>
                    {workspace.code}
                  </dd>
                </div>
                <div>
                  <dt className='text-sm text-muted-foreground'>
                    {t('workspace.status')}
                  </dt>
                  <dd className='mt-1'>
                    <StatusBadge status={workspace.status ?? 'inactive'} />
                  </dd>
                </div>
                <div>
                  <dt className='text-sm text-muted-foreground'>
                    {t('workspace.created')}
                  </dt>
                  <dd className='text-sm font-medium'>
                    {formatAdminDate(workspace.createdAt, locale)}
                  </dd>
                </div>
                <div>
                  <dt className='text-sm text-muted-foreground'>
                    {t('workspace.updated')}
                  </dt>
                  <dd className='text-sm font-medium'>
                    {formatAdminDate(workspace.updatedAt, locale)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {canEdit ? (
            <Card className='border-border/70 shadow-sm'>
              <CardHeader>
                <CardTitle className='font-heading text-lg'>
                  {t('workspace.name')}
                </CardTitle>
                <CardDescription>{t('workspace.nameHelp')}</CardDescription>
              </CardHeader>
              <CardContent>
                {errorText ? (
                  <Alert
                    variant='destructive'
                    className='mb-4'
                  >
                    <AlertDescription>{errorText}</AlertDescription>
                  </Alert>
                ) : null}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void form.handleSubmit();
                  }}
                >
                  <FieldGroup className='gap-4'>
                    <form.Field
                      name='name'
                      validators={{
                        onChange: ({ value }) => {
                          if (!value.trim()) {
                            return t('workspace.nameRequired');
                          }
                          if (value.trim().length > 256) {
                            return t('workspace.nameTooLong');
                          }
                          return undefined;
                        },
                      }}
                    >
                      {(field) => (
                        <Field data-invalid={!field.state.meta.isValid}>
                          <FieldLabel htmlFor={field.name}>
                            {t('workspace.name')}
                          </FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => {
                              field.handleChange(event.target.value);
                            }}
                            placeholder={t('workspace.namePlaceholder')}
                            aria-invalid={!field.state.meta.isValid}
                          />
                          {field.state.meta.isValid ? null : (
                            <FieldError>
                              {fieldErrorText(field.state.meta.errors)}
                            </FieldError>
                          )}
                        </Field>
                      )}
                    </form.Field>

                    {update.isConflict ? (
                      <Alert
                        variant='destructive'
                        className='mb-4'
                      >
                        <AlertDescription>
                          {t('shared.conflictTitle')}.{' '}
                          {t('shared.conflictDescription')}
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    <div className='flex items-center gap-3'>
                      <form.Subscribe selector={(state) => state.canSubmit}>
                        {(canSubmit) => (
                          <Button
                            type='submit'
                            disabled={update.isPending || !canSubmit}
                          >
                            {update.isPending ? (
                              <Spinner data-icon='inline-start' />
                            ) : (
                              <Save className='size-4' />
                            )}
                            {update.isPending
                              ? t('shared.saving')
                              : t('shared.save')}
                          </Button>
                        )}
                      </form.Subscribe>
                      {update.isConflict ? (
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => {
                            update.reset();
                            refetch();
                          }}
                        >
                          {t('shared.conflictReload')}
                        </Button>
                      ) : null}
                    </div>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

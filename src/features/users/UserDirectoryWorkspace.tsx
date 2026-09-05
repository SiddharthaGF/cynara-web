import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import type { JSX, FormEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { UserDirectoryResultsSection } from '@/features/users/UserDirectoryResultsSection.tsx';
import {
  DEFAULT_USER_PAGE_SIZE,
  nextSearchAfterSubmit,
  resolveUserDirectoryResultsState,
  userListParamsFromSearch,
  type UserDirectoryFormValues,
} from '@/features/users/userListSearch.ts';
import { useUserList } from '@/features/users/useUsersDirectory.ts';
import { useCapabilities } from '@/hooks/use-capabilities.ts';
import { getRawHospitalCode } from '@/lib/api-origin.ts';

function resolveSessionHospitalContext(
  override: string | null | undefined,
): string | undefined {
  if (override === null) {
    return undefined;
  }
  if (typeof override === 'string' && override.length > 0) {
    return override;
  }
  return getRawHospitalCode();
}

interface UserDirectoryWorkspaceProps {
  /**
   * Overrides the deployment's hospital-context signal. `undefined`
   * auto-detects; an explicit value is used by callers and tests that
   * already know the context.
   */
  hospitalContext?: string | null;
}

/**
 * Directory workspace: submit-driven search form, URL-persisted filters,
 * resolved-scope presentation, and the full states matrix. For
 * hospital-scoped callers the hospital filter is hidden while any
 * URL-supplied hospital code still passes through verbatim; copy stays
 * scope-neutral and never promises narrowing.
 */
export function UserDirectoryWorkspace({
  hospitalContext,
}: UserDirectoryWorkspaceProps): JSX.Element {
  const { t } = useTranslation('users');
  const { locale } = useParams({ from: '/$locale' });
  const { can } = useCapabilities();
  // The route validates the search, so it arrives already normalized.
  const search = useSearch({ from: '/$locale/admin/users/' });
  const navigate = useNavigate();
  const route = '/$locale/admin/users';

  const listParams = useMemo(() => userListParamsFromSearch(search), [search]);

  const handleSearchSubmit = useCallback(
    (values: UserDirectoryFormValues) => {
      void navigate({
        to: route,
        params: { locale },
        // Filters replace, page resets to 1, pageSize persists; hospital code passes through verbatim.
        search: nextSearchAfterSubmit(search, values),
      });
    },
    [locale, navigate, search],
  );

  const handleClear = useCallback(() => {
    void navigate({
      to: route,
      params: { locale },
      search: { page: 1, pageSize: DEFAULT_USER_PAGE_SIZE },
      replace: true,
    });
  }, [locale, navigate]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      void navigate({
        to: route,
        params: { locale },
        search: { ...search, page: nextPage },
        replace: true,
      });
    },
    [locale, navigate, search],
  );

  const {
    items,
    page,
    pageSize,
    totalCount,
    isLoading,
    isFetching,
    error,
    isForbidden,
    queryError,
    retry,
  } = useUserList(listParams);

  const sessionHospitalContext = resolveSessionHospitalContext(hospitalContext);
  const isHospitalScoped =
    typeof sessionHospitalContext === 'string' &&
    sessionHospitalContext.length > 0;

  const [formValues, setFormValues] = useState<UserDirectoryFormValues>({
    q: search.q ?? '',
    hospitalCode: search.hospitalCode ?? '',
  });

  const hasError = !isForbidden && error !== null;
  const { status: resultsStatus, staleRows } =
    resolveUserDirectoryResultsState({
      isLoading,
      hasError,
      queryError,
      isForbidden,
      itemCount: items.length,
      totalCount,
    });
  const canInvite = can('write', 'Invitation');

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    handleSearchSubmit(formValues);
  };

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
    <Card className='border-border/70 shadow-sm'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 font-heading text-lg'>
          <Search className='size-4 text-muted-foreground' />
          {t('search.title')}
        </CardTitle>
        {/* Resolved scope, stated neutrally; never a narrowing promise. */}
        <CardDescription>
          {isHospitalScoped ? t('scope.hospital') : t('scope.platform')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className='grid gap-3 sm:max-w-xl'
          onSubmit={handleSubmit}
        >
          <div className='grid gap-1.5'>
            <Label htmlFor='user-directory-q'>{t('search.qLabel')}</Label>
            <Input
              id='user-directory-q'
              name='q'
              autoComplete='off'
              value={formValues.q}
              placeholder={t('search.qPlaceholder')}
              onChange={(event) => {
                setFormValues((prev) => ({ ...prev, q: event.target.value }));
              }}
            />
          </div>
          {isHospitalScoped ? null : (
            <div className='grid gap-1.5'>
              <Label htmlFor='user-directory-hospital'>
                {t('hospitalFilter.label')}
              </Label>
              <Input
                id='user-directory-hospital'
                name='hospitalCode'
                autoComplete='off'
                value={formValues.hospitalCode}
                placeholder={t('hospitalFilter.placeholder')}
                onChange={(event) => {
                  setFormValues((prev) => ({
                    ...prev,
                    hospitalCode: event.target.value,
                  }));
                }}
              />
              <p className='text-xs text-muted-foreground'>
                {t('hospitalFilter.platformHint')}
              </p>
            </div>
          )}
          <div className='flex flex-wrap gap-2'>
            <Button
              type='submit'
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2
                  data-icon='inline-start'
                  className='animate-spin'
                />
              ) : (
                <Search data-icon='inline-start' />
              )}
              {t('search.submit')}
            </Button>
            <Button
              type='button'
              variant='ghost'
              onClick={handleClear}
            >
              {t('search.clear')}
            </Button>
          </div>
        </form>

        {hasError ? (
          <Alert
            variant='destructive'
            className='mt-6'
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
        ) : null}

        <div className='mt-6'>
          <UserDirectoryResultsSection
            status={resultsStatus}
            isFetching={isFetching}
            staleRows={staleRows}
            items={items}
            locale={locale}
            canInvite={canInvite}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={handlePageChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}

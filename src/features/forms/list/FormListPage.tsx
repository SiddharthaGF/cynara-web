import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';
import { useCapabilities } from '@/hooks/use-capabilities.ts';

import { FormListContent } from './FormListContent.tsx';
import type { FormFilterStatus } from './formListSearch.ts';
import { useFormsCatalog } from './useFormsCatalog.ts';

export function FormListPage(): JSX.Element {
  const { t } = useTranslation('forms');
  const { can } = useCapabilities();
  const { locale } = useParams({ from: '/$locale' });
  const search = useSearch({ from: '/$locale/forms/' });
  const navigate = useNavigate();
  const {
    forms,
    totalCount,
    pageSize,
    error,
    isCreating,
    isLoading,
    createForm,
  } = useFormsCatalog({
    page: search.page,
    pageSize: search.pageSize,
    query: search.query,
    status: search.status,
  });

  const handlePageChange = useCallback(
    (nextPage: number) => {
      void navigate({
        to: '/$locale/forms',
        params: { locale },
        search: (prev) => ({ ...prev, page: nextPage }),
        replace: true,
      });
    },
    [locale, navigate],
  );

  const handleQueryChange = useCallback(
    (query: string) => {
      void navigate({
        to: '/$locale/forms',
        params: { locale },
        search: (prev) => ({
          ...prev,
          query: query.trim() === '' ? undefined : query.trim(),
        }),
        replace: true,
      });
    },
    [locale, navigate],
  );

  const handleStatusChange = useCallback(
    (status: FormFilterStatus) => {
      void navigate({
        to: '/$locale/forms',
        params: { locale },
        search: (prev) => ({
          ...prev,
          status: status === 'all' ? undefined : status,
        }),
        replace: true,
      });
    },
    [locale, navigate],
  );

  async function handleCreate(values: {
    code: string;
    name: string;
  }): Promise<void> {
    const clinicalSchemaJson = JSON.stringify({
      schemaVersion: '1.0.0',
      fields: [
        {
          id: 'notes',
          code: 'clinical.notes',
          type: 'text',
          maxLength: 500,
        },
      ],
    });
    const uiSchemaJson = JSON.stringify({
      schemaVersion: '1.0.0',
      clinicalSchemaVersion: '1.0.0',
      fields: {
        notes: {
          label: t('list.defaultFieldLabel'),
          widget: 'text-input',
        },
      },
    });
    const rulesSchemaJson = JSON.stringify({
      schemaVersion: '1.0.0',
      clinicalSchemaVersion: '1.0.0',
      fields: {},
    });

    try {
      const created = await createForm({
        code: values.code.trim(),
        name: values.name.trim(),
        clinicalSchemaJson,
        uiSchemaJson,
        rulesSchemaJson,
      });
      // Land straight in the designer: the index route resolves the draft.
      void navigate({
        to: '/$locale/forms/$code/designer',
        params: { locale, code: created.code },
        replace: true,
      });
    } catch {
      // Mutation error is surfaced through useFormsCatalog().error
    }
  }

  return (
    <AppShell variant='catalog'>
      <FormListContent
        forms={forms}
        totalCount={totalCount}
        page={search.page}
        pageSize={pageSize}
        error={error}
        isCreating={isCreating}
        isLoading={isLoading}
        canCreate={can('write', 'Catalog')}
        query={search.query ?? ''}
        status={search.status ?? 'all'}
        onPageChange={handlePageChange}
        onQueryChange={handleQueryChange}
        onStatusChange={handleStatusChange}
        onCreate={handleCreate}
      />
    </AppShell>
  );
}

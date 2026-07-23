import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { AppShell } from '@/components/app-shell.tsx';

import { FormListContent } from './FormListContent.tsx';
import { useFormsCatalog } from './useFormsCatalog.ts';

export function FormListPage(): JSX.Element {
  const { t } = useTranslation('forms');
  const { forms, error, isCreating, isLoading, createForm } = useFormsCatalog();

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
      await createForm({
        code: values.code.trim(),
        name: values.name.trim(),
        clinicalSchemaJson,
        uiSchemaJson,
        rulesSchemaJson,
      });
    } catch {
      // Mutation error is surfaced through useFormsCatalog().error
    }
  }

  return (
    <AppShell variant='catalog'>
      <FormListContent
        forms={forms}
        error={error}
        isCreating={isCreating}
        isLoading={isLoading}
        onCreate={handleCreate}
      />
    </AppShell>
  );
}

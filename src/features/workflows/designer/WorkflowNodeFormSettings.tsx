import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import type { FormVersionPickerOption } from '@/api/formVersionPicker.ts';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import type { WorkflowNode } from '@/features/workflows/types.ts';

interface WorkflowNodeFormSettingsProps {
  formCode: string | undefined;
  formVersion: string | undefined;
  readOnly: boolean;
  formOptions: FormVersionPickerOption[];
  onChangeNode: (patch: Partial<WorkflowNode>) => void;
}

/**
 * Task form picker: choose a published form definition and one of its
 * published versions. Picking a form pins the latest published version so the
 * Task is ready to publish without an extra selection.
 */
export function WorkflowNodeFormSettings({
  formCode,
  formVersion,
  readOnly,
  formOptions,
  onChangeNode,
}: WorkflowNodeFormSettingsProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const selectedForm = formOptions.find((option) => option.code === formCode);
  const publishedVersions = selectedForm?.publishedVersions ?? [];

  return (
    <section className='grid gap-4'>
      <h3 className='text-sm font-medium'>{t('inspector.referencedForm')}</h3>
      <p className='-mt-2 text-xs leading-relaxed text-muted-foreground'>
        {t('inspector.referencedFormDescription')}
      </p>
      <Field>
        <FieldLabel htmlFor='workflow-node-form-code'>
          {t('inspector.formCode')}
        </FieldLabel>
        <FieldContent>
          <Select
            value={formCode ?? ''}
            disabled={readOnly}
            onValueChange={(code) => {
              if (!code) {
                return;
              }
              const form = formOptions.find((option) => option.code === code);
              const latestVersion = form?.publishedVersions.at(-1)?.version;
              onChangeNode({
                formCode: code,
                formVersion: latestVersion ?? undefined,
              });
            }}
          >
            <SelectTrigger
              id='workflow-node-form-code'
              className='w-full'
            >
              <SelectValue placeholder={t('inspector.selectForm')} />
            </SelectTrigger>
            <SelectContent>
              {formOptions.map((option) => (
                <SelectItem
                  key={option.code}
                  value={option.code}
                >
                  {option.name || option.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor='workflow-node-form-version'>
          {t('inspector.formVersion')}
        </FieldLabel>
        <FieldContent>
          {publishedVersions.length > 0 ? (
            <Select
              value={formVersion ?? ''}
              disabled={readOnly}
              onValueChange={(version) => {
                if (version) {
                  onChangeNode({ formVersion: version });
                }
              }}
            >
              <SelectTrigger
                id='workflow-node-form-version'
                className='w-full'
              >
                <SelectValue placeholder={t('inspector.selectVersion')} />
              </SelectTrigger>
              <SelectContent>
                {publishedVersions.map((published) => (
                  <SelectItem
                    key={published.version}
                    value={published.version}
                  >
                    {published.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className='text-xs leading-relaxed text-muted-foreground'>
              {t('inspector.noPublishedVersions')}
            </p>
          )}
        </FieldContent>
      </Field>
    </section>
  );
}

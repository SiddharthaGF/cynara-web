import type { JSX } from 'react';

import { Field, FieldLabel } from '@/components/ui/field.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';

import type { ClinicalComponentRefFieldsProps } from './fieldInspectorClinicalTypes.ts';
import { ComponentDependencyHint } from './FieldInspectorFieldEditors.tsx';

export function ClinicalComponentRefFields({
  field,
  form,
  components,
  t,
}: ClinicalComponentRefFieldsProps): JSX.Element | null {
  if (field.type !== 'component-ref') {
    return null;
  }

  return (
    <>
      <form.Field name='componentCode'>
        {(fieldApi) => (
          <Field>
            <FieldLabel>{t('inspector.clinicalBlock')}</FieldLabel>
            <Select
              value={fieldApi.state.value}
              onValueChange={(value) => {
                fieldApi.handleChange(value ?? '');
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder={t('inspector.selectBlock')}>
                  {components.find(
                    (component) => component.code === fieldApi.state.value,
                  )?.name ?? ''}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {components.map((component) => (
                  <SelectItem
                    key={component.code}
                    value={component.code}
                  >
                    {component.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>
      <form.Field name='componentVersion'>
        {(fieldApi) => (
          <Field>
            <FieldLabel>{t('inspector.version')}</FieldLabel>
            <Select
              value={fieldApi.state.value}
              onValueChange={(value) => {
                fieldApi.handleChange(value ?? '');
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder={t('inspector.latestDraft')}>
                  {fieldApi.state.value === ''
                    ? t('inspector.latestDraft')
                    : fieldApi.state.value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>{t('inspector.latestDraft')}</SelectItem>
                {components
                  .find((item) => item.code === field.componentCode)
                  ?.publishedVersions.map((version) => (
                    <SelectItem
                      key={version}
                      value={version}
                    >
                      {version}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>
      <ComponentDependencyHint
        field={field}
        components={components}
      />
    </>
  );
}

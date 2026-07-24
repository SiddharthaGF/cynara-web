import type { JSX } from 'react';

import { Field, FieldLabel } from '@/components/ui/field.tsx';

import type { ClinicalComponentRefFieldsProps } from './fieldInspectorClinicalTypes.ts';
import { ComponentDependencyHint } from './FieldInspectorFieldEditors.tsx';
import {
  InspectorSelect,
  InspectorSelectContent,
  InspectorSelectItem,
  InspectorSelectTrigger,
} from './InspectorSelect.tsx';

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
            <InspectorSelect
              value={fieldApi.state.value}
              onValueChange={(value) => {
                fieldApi.handleChange(value ?? '');
              }}
            >
              <InspectorSelectTrigger className='w-full'>
                {components.find(
                  (component) => component.code === fieldApi.state.value,
                )?.name ?? ''}
              </InspectorSelectTrigger>
              <InspectorSelectContent>
                {components.map((component) => (
                  <InspectorSelectItem
                    key={component.code}
                    value={component.code}
                  >
                    <span className='flex min-w-0 flex-col gap-0 break-words'>
                      <span>{component.name}</span>
                      <span className='font-mono text-[10px] text-muted-foreground'>
                        {component.code}
                      </span>
                    </span>
                  </InspectorSelectItem>
                ))}
              </InspectorSelectContent>
            </InspectorSelect>
          </Field>
        )}
      </form.Field>
      <form.Field name='componentVersion'>
        {(fieldApi) => (
          <Field>
            <FieldLabel>{t('inspector.version')}</FieldLabel>
            <InspectorSelect
              value={fieldApi.state.value}
              onValueChange={(value) => {
                fieldApi.handleChange(value ?? '');
              }}
            >
              <InspectorSelectTrigger className='w-full'>
                {fieldApi.state.value === ''
                  ? t('inspector.latestDraft')
                  : fieldApi.state.value}
              </InspectorSelectTrigger>
              <InspectorSelectContent>
                <InspectorSelectItem value=''>
                  {t('inspector.latestDraft')}
                </InspectorSelectItem>
                {components
                  .find((item) => item.code === field.componentCode)
                  ?.publishedVersions.map((version) => (
                    <InspectorSelectItem
                      key={version}
                      value={version}
                    >
                      {version}
                    </InspectorSelectItem>
                  ))}
              </InspectorSelectContent>
            </InspectorSelect>
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

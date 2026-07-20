import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Checkbox } from '@/components/ui/checkbox.tsx';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { WIDTH_OPTIONS } from '@/features/forms/designer/fieldInspectorMeta.ts';
import type {
  ClinicalField,
  FieldPresentation,
} from '@/features/forms/types.ts';
import { useSyncedTanstackForm } from '@/lib/useSyncedTanstackForm.ts';

import {
  presentationFormValuesToPatch,
  presentationToFormValues,
  type PresentationFormValues,
} from './fieldInspectorFormUtils.ts';

interface FieldInspectorPresentationSectionProps {
  field: ClinicalField;
  presentation: FieldPresentation | null;
  widgetOptions: readonly string[];
  currentWidget: string;
  readOnly: boolean;
  onChangePresentation: (patch: Partial<FieldPresentation>) => void;
}

export function FieldInspectorPresentationSection({
  field,
  presentation,
  widgetOptions,
  currentWidget,
  readOnly,
  onChangePresentation,
}: FieldInspectorPresentationSectionProps): JSX.Element {
  const { t } = useTranslation('designer');

  const form = useSyncedTanstackForm<PresentationFormValues>({
    defaultValues: presentationToFormValues(presentation, currentWidget),
    onValuesChange: (values) => {
      onChangePresentation(presentationFormValuesToPatch(values));
    },
  });

  return (
    <FieldSet disabled={readOnly}>
      <FieldLegend variant='label'>{t('inspector.presentation')}</FieldLegend>
      <FieldGroup>
        <form.Field name='placeholder'>
          {(fieldApi) => (
            <Field>
              <FieldLabel htmlFor={`${field.id}-placeholder`}>
                {t('inspector.placeholder')}
              </FieldLabel>
              <Input
                id={`${field.id}-placeholder`}
                name={fieldApi.name}
                value={fieldApi.state.value}
                onBlur={fieldApi.handleBlur}
                onChange={(event) => {
                  fieldApi.handleChange(event.target.value);
                }}
              />
            </Field>
          )}
        </form.Field>

        {widgetOptions.length > 1 ? (
          <form.Field name='widget'>
            {(fieldApi) => (
              <Field>
                <FieldLabel>{t('inspector.widget')}</FieldLabel>
                <Select
                  value={fieldApi.state.value}
                  onValueChange={(value) => {
                    if (value) {
                      fieldApi.handleChange(value);
                    }
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {widgetOptions.map((widget) => (
                      <SelectItem
                        key={widget}
                        value={widget}
                      >
                        {t(`inspector.widgets.${widget}`, {
                          defaultValue: widget,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>
        ) : null}

        <form.Field name='width'>
          {(fieldApi) => (
            <Field>
              <FieldLabel>{t('inspector.width')}</FieldLabel>
              <Select
                value={fieldApi.state.value}
                onValueChange={(value) => {
                  if (value) {
                    fieldApi.handleChange(value);
                  }
                }}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDTH_OPTIONS.map((width) => (
                    <SelectItem
                      key={width}
                      value={width}
                    >
                      {t(`inspector.widths.${width}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        {field.type === 'time' || field.type === 'datetime' ? (
          <form.Field name='timePresetNow'>
            {(fieldApi) => (
              <Field orientation='horizontal'>
                <Checkbox
                  id={`${field.id}-time-preset-now`}
                  checked={fieldApi.state.value}
                  onCheckedChange={(checked) => {
                    fieldApi.handleChange(checked);
                  }}
                />
                <FieldLabel htmlFor={`${field.id}-time-preset-now`}>
                  {t('inspector.timePresetNow')}
                </FieldLabel>
              </Field>
            )}
          </form.Field>
        ) : null}

        <form.Field name='hidden'>
          {(fieldApi) => (
            <Field orientation='horizontal'>
              <Checkbox
                id={`${field.id}-hidden`}
                checked={fieldApi.state.value}
                onCheckedChange={(checked) => {
                  fieldApi.handleChange(checked);
                }}
              />
              <FieldLabel htmlFor={`${field.id}-hidden`}>
                {t('inspector.hidden')}
              </FieldLabel>
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </FieldSet>
  );
}

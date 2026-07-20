import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Field,
  FieldDescription,
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
import type { ClinicalField, FieldRules } from '@/features/forms/types.ts';
import { useSyncedTanstackForm } from '@/lib/useSyncedTanstackForm.ts';

import {
  rulesFormValuesToPatch,
  rulesToFormValues,
  type RulesFormValues,
} from './fieldInspectorFormUtils.ts';

interface FieldInspectorRulesSectionProps {
  field: ClinicalField;
  fieldCodes: string[];
  rules: FieldRules | null;
  readOnly: boolean;
  onChangeRules: (patch: Partial<FieldRules>) => void;
}

export function FieldInspectorRulesSection({
  field,
  fieldCodes,
  rules,
  readOnly,
  onChangeRules,
}: FieldInspectorRulesSectionProps): JSX.Element {
  const { t } = useTranslation('designer');
  const otherCodes = fieldCodes.filter((code) => code !== field.code);

  const form = useSyncedTanstackForm<RulesFormValues>({
    defaultValues: rulesToFormValues(rules),
    onValuesChange: (values) => {
      onChangeRules(rulesFormValuesToPatch(values));
    },
  });

  return (
    <FieldSet disabled={readOnly}>
      <FieldLegend variant='label'>{t('inspector.rules')}</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel>{t('inspector.showWhen')}</FieldLabel>
          <FieldDescription>{t('inspector.showWhenHelp')}</FieldDescription>
          <RulePairFields
            form={form}
            refFieldName='visibleWhenRef'
            litFieldName='visibleWhenLit'
            fieldCodes={otherCodes}
          />
        </Field>
        <Field>
          <FieldLabel>{t('inspector.enableWhen')}</FieldLabel>
          <FieldDescription>{t('inspector.enableWhenHelp')}</FieldDescription>
          <RulePairFields
            form={form}
            refFieldName='enabledWhenRef'
            litFieldName='enabledWhenLit'
            fieldCodes={otherCodes}
          />
        </Field>
        <Field>
          <FieldLabel>{t('inspector.requireWhen')}</FieldLabel>
          <FieldDescription>{t('inspector.requireWhenHelp')}</FieldDescription>
          <RulePairFields
            form={form}
            refFieldName='requiredWhenRef'
            litFieldName='requiredWhenLit'
            fieldCodes={otherCodes}
          />
        </Field>
        <Field>
          <FieldLabel>{t('inspector.calculate')}</FieldLabel>
          <FieldDescription>{t('inspector.calculateHelp')}</FieldDescription>
          <form.Field name='calculateRef'>
            {(fieldApi) => (
              <Select
                value={fieldApi.state.value}
                onValueChange={(value) => {
                  fieldApi.handleChange(value ?? '');
                }}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder={t('inspector.selectSourceField')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>{t('inspector.noCalculation')}</SelectItem>
                  {otherCodes.map((code) => (
                    <SelectItem
                      key={code}
                      value={code}
                    >
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </form.Field>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}

function RulePairFields({
  form,
  refFieldName,
  litFieldName,
  fieldCodes,
}: {
  form: ReturnType<typeof useSyncedTanstackForm<RulesFormValues>>;
  refFieldName: keyof RulesFormValues;
  litFieldName: keyof RulesFormValues;
  fieldCodes: string[];
}): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <form.Subscribe selector={(state) => state.values[refFieldName]}>
      {(refValue) => (
        <div className='grid gap-2'>
          {fieldCodes.length > 0 ? (
            <form.Field name={refFieldName}>
              {(fieldApi) => (
                <Select
                  value={fieldApi.state.value}
                  onValueChange={(selected) => {
                    fieldApi.handleChange(selected ?? '');
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder={t('inspector.selectFieldCode')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=''>{t('inspector.noCondition')}</SelectItem>
                    {fieldCodes.map((code) => (
                      <SelectItem
                        key={code}
                        value={code}
                      >
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </form.Field>
          ) : (
            <form.Field name={refFieldName}>
              {(fieldApi) => (
                <Input
                  placeholder={t('inspector.fieldCodePlaceholder')}
                  name={fieldApi.name}
                  value={fieldApi.state.value}
                  onBlur={fieldApi.handleBlur}
                  onChange={(event) => {
                    fieldApi.handleChange(event.target.value);
                  }}
                />
              )}
            </form.Field>
          )}
          <form.Field name={litFieldName}>
            {(fieldApi) => (
              <Input
                placeholder={t('inspector.equalsValuePlaceholder')}
                name={fieldApi.name}
                value={fieldApi.state.value}
                disabled={!refValue}
                onBlur={fieldApi.handleBlur}
                onChange={(event) => {
                  fieldApi.handleChange(event.target.value);
                }}
              />
            )}
          </form.Field>
        </div>
      )}
    </form.Subscribe>
  );
}

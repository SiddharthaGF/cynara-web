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
import type { ClinicalField, FieldRules } from '@/features/forms/types.ts';
import { useSyncedTanstackForm } from '@/lib/useSyncedTanstackForm.ts';

import {
  rulesFormValuesToPatch,
  rulesToFormValues,
  type RulesFormValues,
} from './fieldInspectorFormUtils.ts';
import {
  InspectorSelect,
  InspectorSelectContent,
  InspectorSelectItem,
  InspectorSelectTrigger,
} from './InspectorSelect.tsx';

export interface RuleFieldOption {
  code: string;
  label: string;
}

interface FieldInspectorRulesSectionProps {
  field: ClinicalField;
  fieldOptions: RuleFieldOption[];
  rules: FieldRules | null;
  readOnly: boolean;
  onChangeRules: (patch: Partial<FieldRules>) => void;
}

export function FieldInspectorRulesSection({
  field,
  fieldOptions,
  rules,
  readOnly,
  onChangeRules,
}: FieldInspectorRulesSectionProps): JSX.Element {
  const { t } = useTranslation('designer');
  const otherFields = fieldOptions.filter(
    (option) => option.code !== field.code,
  );

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
          <RulePairFields
            form={form}
            refFieldName='visibleWhenRef'
            litFieldName='visibleWhenLit'
            fieldOptions={otherFields}
          />
          <FieldDescription className='text-xs'>
            {t('inspector.showWhenHelp')}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel>{t('inspector.enableWhen')}</FieldLabel>
          <RulePairFields
            form={form}
            refFieldName='enabledWhenRef'
            litFieldName='enabledWhenLit'
            fieldOptions={otherFields}
          />
          <FieldDescription className='text-xs'>
            {t('inspector.enableWhenHelp')}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel>{t('inspector.requireWhen')}</FieldLabel>
          <RulePairFields
            form={form}
            refFieldName='requiredWhenRef'
            litFieldName='requiredWhenLit'
            fieldOptions={otherFields}
          />
          <FieldDescription className='text-xs'>
            {t('inspector.requireWhenHelp')}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel>{t('inspector.calculate')}</FieldLabel>
          <form.Field name='calculateRef'>
            {(fieldApi) => {
              const noneLabel = t('inspector.noCalculation');
              const items = [
                { label: noneLabel, value: null },
                ...otherFields.map((option) => ({
                  label: fieldOptionSelectLabel(option),
                  value: option.code,
                })),
              ];

              return (
                <InspectorSelect
                  items={items}
                  value={toSelectValue(fieldApi.state.value)}
                  onValueChange={(value) => {
                    fieldApi.handleChange(fromSelectValue(value));
                  }}
                >
                  <InspectorSelectTrigger className='w-full'>
                    {renderSelectedFieldOption(
                      toSelectValue(fieldApi.state.value),
                      otherFields,
                      noneLabel,
                    )}
                  </InspectorSelectTrigger>
                  <InspectorSelectContent>
                    <InspectorSelectItem value={null}>
                      {noneLabel}
                    </InspectorSelectItem>
                    {otherFields.map((option) => (
                      <InspectorSelectItem
                        key={option.code}
                        value={option.code}
                      >
                        <RuleFieldOptionLabel
                          option={option}
                          variant='stacked'
                        />
                      </InspectorSelectItem>
                    ))}
                  </InspectorSelectContent>
                </InspectorSelect>
              );
            }}
          </form.Field>
          <FieldDescription className='text-xs'>
            {t('inspector.calculateHelp')}
          </FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}

function RulePairFields({
  form,
  refFieldName,
  litFieldName,
  fieldOptions,
}: {
  form: ReturnType<typeof useSyncedTanstackForm<RulesFormValues>>;
  refFieldName: keyof RulesFormValues;
  litFieldName: keyof RulesFormValues;
  fieldOptions: RuleFieldOption[];
}): JSX.Element {
  const { t } = useTranslation('designer');
  const noneLabel = t('inspector.noCondition');

  return (
    <form.Subscribe selector={(state) => state.values[refFieldName]}>
      {(refValue) => (
        <div className='grid gap-2'>
          {fieldOptions.length > 0 ? (
            <form.Field name={refFieldName}>
              {(fieldApi) => {
                const items = [
                  { label: noneLabel, value: null },
                  ...fieldOptions.map((option) => ({
                    label: fieldOptionSelectLabel(option),
                    value: option.code,
                  })),
                ];

                return (
                  <InspectorSelect
                    items={items}
                    value={toSelectValue(fieldApi.state.value)}
                    onValueChange={(value) => {
                      fieldApi.handleChange(fromSelectValue(value));
                    }}
                  >
                    <InspectorSelectTrigger className='w-full'>
                      {renderSelectedFieldOption(
                        toSelectValue(fieldApi.state.value),
                        fieldOptions,
                        noneLabel,
                      )}
                    </InspectorSelectTrigger>
                    <InspectorSelectContent>
                      <InspectorSelectItem value={null}>
                        {noneLabel}
                      </InspectorSelectItem>
                      {fieldOptions.map((option) => (
                        <InspectorSelectItem
                          key={option.code}
                          value={option.code}
                        >
                          <RuleFieldOptionLabel
                            option={option}
                            variant='stacked'
                          />
                        </InspectorSelectItem>
                      ))}
                    </InspectorSelectContent>
                  </InspectorSelect>
                );
              }}
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

function RuleFieldOptionLabel({
  option,
  variant = 'inline',
}: {
  option: RuleFieldOption;
  variant?: 'inline' | 'stacked';
}): JSX.Element {
  const showCodeApart = option.label !== option.code;

  if (variant === 'stacked') {
    return (
      <span className='flex min-w-0 flex-col gap-0'>
        <span className='break-words text-popover-foreground'>
          {option.label}
        </span>
        {showCodeApart ? (
          <span className='font-mono text-[10px] text-muted-foreground'>
            {option.code}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className='flex min-w-0 items-baseline gap-1.5'>
      <span className='truncate'>{option.label}</span>
      {showCodeApart ? (
        <span className='shrink-0 text-muted-foreground'>- {option.code}</span>
      ) : null}
    </span>
  );
}

function fieldOptionSelectLabel(option: RuleFieldOption): string {
  return option.label === option.code
    ? option.code
    : `${option.label} - ${option.code}`;
}

function renderSelectedFieldOption(
  value: string | null,
  fieldOptions: RuleFieldOption[],
  noneLabel: string,
): JSX.Element | string {
  if (value === null || value === '') {
    return noneLabel;
  }
  const option = fieldOptions.find((item) => item.code === value);
  if (!option) {
    return value;
  }
  return <RuleFieldOptionLabel option={option} />;
}

/** Base UI Select uses `null` for the placeholder / “none” item. */
function toSelectValue(value: string): string | null {
  return value === '' ? null : value;
}

function fromSelectValue(value: string | null | undefined): string {
  return value ?? '';
}

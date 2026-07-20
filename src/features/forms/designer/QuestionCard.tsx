import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from '@/components/ui/card.tsx';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { CalculatedFieldLabelSuffix } from '@/features/forms/CalculatedFieldLabel.tsx';
import { stripLegacyCalculatedLabelSuffix } from '@/features/forms/stripLegacyCalculatedLabelSuffix.ts';
import type {
  ClinicalField,
  FieldPresentation,
  FieldRules,
  FieldType,
  ValidationIssue,
} from '@/features/forms/types.ts';
import { translateValidationIssue } from '@/features/forms/validation/translateValidationIssue.ts';
import { useSyncedTanstackForm } from '@/lib/useSyncedTanstackForm.ts';
import { cn } from '@/lib/utils.ts';

import { FieldPreview } from './FieldPreview.tsx';
import { FieldTypeBadge, FieldTypeLabel } from './FieldTypeIcon.tsx';
import { FIELD_TYPES } from './fieldTypeMeta.ts';
import {
  questionEditToFormValues,
  type QuestionEditFormValues,
} from './fieldInspectorFormUtils.ts';
import { QuestionCardActions } from './QuestionCardActions.tsx';

export interface QuestionCardProps {
  field: ClinicalField;
  index: number;
  total: number;
  presentation: FieldPresentation | undefined;
  rules: FieldRules | undefined;
  isSelected: boolean;
  fieldIssues: ValidationIssue[];
  readOnly: boolean;
  onSelect: (fieldId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (fieldId: string) => void;
  onChangePresentation: (
    fieldId: string,
    patch: Partial<FieldPresentation>,
  ) => void;
  onChangeFieldType: (fieldId: string, type: FieldType) => void;
  onToggleRequired: (fieldId: string, required: boolean) => void;
  onOpenAdvanced: (fieldId: string) => void;
}

function QuestionCardEditForm({
  field,
  presentation,
  rules,
  onChangePresentation,
  onChangeFieldType,
}: {
  field: ClinicalField;
  presentation: FieldPresentation | undefined;
  rules: FieldRules | undefined;
  onChangePresentation: QuestionCardProps['onChangePresentation'];
  onChangeFieldType: QuestionCardProps['onChangeFieldType'];
}): JSX.Element {
  const { t } = useTranslation('designer');

  const form = useSyncedTanstackForm<QuestionEditFormValues>({
    defaultValues: questionEditToFormValues(presentation, field.type),
    onValuesChange: (values) => {
      onChangePresentation(field.id, {
        label: values.label || undefined,
        helpText: values.helpText || undefined,
      });
      if (values.type !== field.type) {
        onChangeFieldType(field.id, values.type);
      }
    },
  });

  return (
    <FieldGroup
      className='gap-3'
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <div className='grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start'>
        <form.Field name='label'>
          {(fieldApi) => (
            <Field className='gap-1.5 self-start'>
              <FieldLabel htmlFor={`${field.id}-label`}>
                {t('canvas.question')}
              </FieldLabel>
              <Input
                id={`${field.id}-label`}
                name={fieldApi.name}
                value={fieldApi.state.value}
                placeholder={t('canvas.untitledQuestion')}
                onBlur={fieldApi.handleBlur}
                onChange={(event) => {
                  fieldApi.handleChange(event.target.value);
                }}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name='type'>
          {(fieldApi) => {
            const items = FIELD_TYPES.map((item) => ({
              value: item.type,
              label: item.type,
            }));

            return (
              <Field className='gap-1.5 self-start'>
                <FieldLabel htmlFor={`${field.id}-type`}>
                  {t('canvas.type')}
                </FieldLabel>
                <Select
                  items={items}
                  value={fieldApi.state.value}
                  onValueChange={(value) => {
                    if (value) {
                      fieldApi.handleChange(value);
                    }
                  }}
                >
                  <SelectTrigger
                    id={`${field.id}-type`}
                    className='w-full sm:w-52'
                  >
                    <SelectValue>
                      <FieldTypeLabel type={fieldApi.state.value} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {FIELD_TYPES.map((item) => (
                        <SelectItem
                          key={item.type}
                          value={item.type}
                        >
                          <FieldTypeLabel type={item.type} />
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            );
          }}
        </form.Field>
      </div>

      <form.Field name='helpText'>
        {(fieldApi) => (
          <Field className='gap-1.5'>
            <FieldLabel htmlFor={`${field.id}-help`}>
              {t('canvas.description')}
            </FieldLabel>
            <Textarea
              id={`${field.id}-help`}
              name={fieldApi.name}
              value={fieldApi.state.value}
              placeholder={t('canvas.descriptionPlaceholder')}
              rows={2}
              className='min-h-16 resize-y [field-sizing:fixed]'
              onBlur={fieldApi.handleBlur}
              onChange={(event) => {
                fieldApi.handleChange(event.target.value);
              }}
            />
          </Field>
        )}
      </form.Field>

      <Field className='gap-1.5'>
        <FieldLabel>{t('canvas.preview')}</FieldLabel>
        <FieldPreview
          field={field}
          presentation={presentation}
          rules={rules}
          placeholder={presentation?.placeholder}
        />
      </Field>
    </FieldGroup>
  );
}

export function QuestionCard({
  field,
  index,
  total,
  presentation,
  rules,
  isSelected,
  fieldIssues,
  readOnly,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  onChangePresentation,
  onChangeFieldType,
  onToggleRequired,
  onOpenAdvanced,
}: QuestionCardProps): JSX.Element {
  const { t } = useTranslation('designer');
  const { t: tv } = useTranslation('validation');
  const isCalculated = Boolean(rules?.calculate);
  const label = stripLegacyCalculatedLabelSuffix(
    presentation?.label ?? t('canvas.untitledQuestion'),
  );
  const helpText = presentation?.helpText ?? '';

  return (
    <li className='min-w-0'>
      <Card
        className={cn(
          'min-w-0 cursor-pointer transition-[box-shadow,background-color]',
          isSelected
            ? 'bg-primary/[0.07] ring-2 ring-primary/25 dark:bg-primary/10'
            : 'bg-card',
        )}
        onClick={() => {
          onSelect(field.id);
        }}
      >
        {isSelected ? (
          <div className='h-1 bg-gradient-to-r from-primary to-accent' />
        ) : null}

        <CardContent
          className={cn(
            'grid min-w-0 px-4 sm:px-5',
            isSelected && !readOnly ? 'gap-3' : 'gap-4',
          )}
        >
          <div className='flex flex-wrap items-center gap-2'>
            <FieldTypeBadge type={field.type} />
            {field.required ? (
              <Badge variant='outline'>{t('canvas.required')}</Badge>
            ) : null}
            {field.readOnly ? (
              <Badge variant='outline'>{t('canvas.readOnly')}</Badge>
            ) : null}
          </div>

          {isSelected && !readOnly ? (
            <QuestionCardEditForm
              key={field.id}
              field={field}
              presentation={presentation}
              rules={rules}
              onChangePresentation={onChangePresentation}
              onChangeFieldType={onChangeFieldType}
            />
          ) : (
            <div className='grid gap-3'>
              <div>
                <CardTitle className='font-heading text-lg font-medium'>
                  {label}
                  {isCalculated ? <CalculatedFieldLabelSuffix /> : null}
                  {field.required ? (
                    <span className='ml-1 text-destructive'>*</span>
                  ) : null}
                </CardTitle>
              </div>
              <FieldPreview
                field={field}
                presentation={presentation}
                rules={rules}
                placeholder={presentation?.placeholder}
              />
              {helpText ? (
                <CardDescription className='text-xs text-muted-foreground/80'>
                  {helpText}
                </CardDescription>
              ) : null}
            </div>
          )}

          {fieldIssues.length > 0 && fieldIssues[0] ? (
            <p className='text-xs text-destructive'>
              {translateValidationIssue(fieldIssues[0], tv)}
            </p>
          ) : null}
        </CardContent>

        {isSelected && !readOnly ? (
          <CardFooter
            className='flex-row items-center justify-between gap-2 px-3 py-1.5'
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <QuestionCardActions
              field={field}
              index={index}
              total={total}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onToggleRequired={onToggleRequired}
              onOpenAdvanced={onOpenAdvanced}
              onRemove={onRemove}
            />
          </CardFooter>
        ) : null}
      </Card>
    </li>
  );
}

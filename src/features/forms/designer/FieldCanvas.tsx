import { Fragment, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import type {
  ClinicalField,
  FieldPresentation,
  FieldRules,
  FieldType,
  ValidationIssue,
} from '@/features/forms/types.ts';
import { issuesForField } from '@/features/forms/validation/validateDraft.ts';

import { QuestionCard } from './QuestionCard.tsx';
import { QuestionInsertGap } from './QuestionInsertGap.tsx';

interface FieldCanvasProps {
  fields: ClinicalField[];
  presentations: Record<string, FieldPresentation>;
  fieldRules: Record<string, FieldRules>;
  selectedFieldId: string | null;
  validationIssues: ValidationIssue[];
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
  onAddField: (type: FieldType, atIndex: number) => void;
  readOnly?: boolean;
}

export function FieldCanvas({
  fields,
  presentations,
  fieldRules,
  selectedFieldId,
  validationIssues,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  onChangePresentation,
  onChangeFieldType,
  onToggleRequired,
  onOpenAdvanced,
  onAddField,
  readOnly = false,
}: FieldCanvasProps): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <div className='mx-auto w-full min-w-0 max-w-2xl'>
      <div className='mb-4 flex items-end justify-between border-b border-border/60 px-1 pb-3'>
        <div className='grid gap-0.5'>
          <p className='text-[0.625rem] font-medium tracking-[0.14em] text-primary uppercase'>
            {t('header.clinicalDraft')}
          </p>
          <h1 className='font-heading text-xl font-medium tracking-tight'>
            {t('canvas.questions')}
          </h1>
        </div>
        <span className='font-mono text-xs text-muted-foreground'>
          {String(fields.length).padStart(2, '0')}
        </span>
      </div>

      {fields.length === 0 ? (
        <div className='grid gap-2'>
          <Empty className='min-h-48 rounded-xl border border-dashed border-border/70 bg-card/60'>
            <EmptyHeader>
              <EmptyTitle className='text-lg'>
                {t('canvas.emptyTitle')}
              </EmptyTitle>
              <EmptyDescription>
                {t('canvas.emptyDescription')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
          {readOnly ? null : (
            <ul className='grid min-w-0 gap-0'>
              <QuestionInsertGap
                insertAt={0}
                onAdd={onAddField}
                alwaysVisible
              />
            </ul>
          )}
        </div>
      ) : (
        <ul
          className='grid min-w-0 gap-0'
          data-testid='designer-field-list'
        >
          {readOnly ? null : (
            <QuestionInsertGap
              insertAt={0}
              onAdd={onAddField}
            />
          )}
          {fields.map((field, index) => (
            <Fragment key={field.id}>
              <QuestionCard
                field={field}
                index={index}
                total={fields.length}
                presentation={presentations[field.id]}
                rules={fieldRules[field.id]}
                isSelected={selectedFieldId === field.id}
                fieldIssues={issuesForField(validationIssues, field.id)}
                readOnly={readOnly}
                onSelect={onSelect}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onRemove={onRemove}
                onChangePresentation={onChangePresentation}
                onChangeFieldType={onChangeFieldType}
                onToggleRequired={onToggleRequired}
                onOpenAdvanced={onOpenAdvanced}
              />
              {readOnly ? (
                index < fields.length - 1 && (
                  <li
                    aria-hidden
                    className='h-4 list-none'
                  />
                )
              ) : (
                <QuestionInsertGap
                  insertAt={index + 1}
                  onAdd={onAddField}
                />
              )}
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}

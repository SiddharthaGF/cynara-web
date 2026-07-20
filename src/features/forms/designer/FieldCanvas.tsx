import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import type {
  ClinicalField,
  FieldPresentation,
  FieldRules,
  FieldType,
  ValidationIssue,
} from '@/features/forms/types.ts';
import { issuesForField } from '@/features/forms/validation/validateDraft.ts';

import { QuestionCard } from './QuestionCard.tsx';

interface FieldCanvasProps {
  formCode: string;
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
  readOnly?: boolean;
}

export function FieldCanvas({
  formCode,
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
  readOnly = false,
}: FieldCanvasProps): JSX.Element {
  const { t } = useTranslation('designer');

  return (
    <div className='mx-auto w-full min-w-0 max-w-2xl'>
      <Card className='mb-4 overflow-hidden'>
        <div className='h-1.5 bg-gradient-to-r from-primary via-accent to-primary/60' />
        <CardHeader>
          <p className='text-xs font-medium tracking-wide text-accent uppercase'>
            {t('header.clinicalDraft')}
          </p>
          <CardTitle className='font-heading text-2xl font-semibold md:text-3xl'>
            {formCode}
          </CardTitle>
          <CardDescription>{t('header.editHint')}</CardDescription>
        </CardHeader>
      </Card>

      {fields.length === 0 ? (
        <Card>
          <CardContent className='py-14 text-center'>
            <CardTitle className='font-heading text-lg font-medium'>
              {t('canvas.emptyTitle')}
            </CardTitle>
            <CardDescription className='mt-2'>
              {t('canvas.emptyDescription')}
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <ul className='grid min-w-0 gap-4'>
          {fields.map((field, index) => (
            <QuestionCard
              key={field.id}
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
          ))}
        </ul>
      )}
    </div>
  );
}

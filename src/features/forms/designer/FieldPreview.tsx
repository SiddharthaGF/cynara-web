import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import { FieldDescription } from '@/components/ui/field.tsx';
import { TIME_FIELD_LAYOUT_CLASS } from '@/components/ui/time-input.tsx';
import { renderFieldInput } from '@/features/forms/renderer/FormFieldInputs.tsx';
import { widthClass } from '@/features/forms/renderer/layoutUtils.ts';
import type {
  ClinicalField,
  FieldPresentation,
  FieldRules,
} from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import { collectFieldValidationRules } from './fieldValidationSummary.ts';

interface FieldPreviewProps {
  field: ClinicalField;
  presentation?: FieldPresentation;
  rules?: FieldRules | null;
  placeholder?: string;
  className?: string;
}

export function FieldPreview({
  field,
  presentation,
  rules,
  placeholder,
  className,
}: FieldPreviewProps): JSX.Element {
  const { t } = useTranslation('designer');
  const validationRules = collectFieldValidationRules(field, rules, t);
  const resolvedPlaceholder = placeholder ?? presentation?.placeholder;

  return (
    <div className={cn('grid w-full min-w-0 max-w-full gap-3', className)}>
      {renderPreviewControl(field, presentation, resolvedPlaceholder, t)}
      {validationRules.length > 0 ? (
        <ValidationRulesList
          rules={validationRules}
          label={t('preview.validationRules')}
        />
      ) : null}
    </div>
  );
}

function ValidationRulesList({
  rules,
  label,
}: {
  rules: ReturnType<typeof collectFieldValidationRules>;
  label: string;
}): JSX.Element {
  return (
    <div className='grid max-w-full gap-2 rounded-lg border bg-muted/30 p-3'>
      <FieldDescription className='text-xs font-medium tracking-wide uppercase'>
        {label}
      </FieldDescription>
      <ul className='flex flex-wrap gap-2'>
        {rules.map((rule) => (
          <li key={rule.id}>
            <Badge
              variant='outline'
              className='gap-1 font-normal'
            >
              {rule.label}
              {rule.detail ? (
                <span className='text-muted-foreground'>{rule.detail}</span>
              ) : null}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderPreviewControl(
  field: ClinicalField,
  presentation: FieldPresentation | undefined,
  placeholder: string | undefined,
  t: ReturnType<typeof useTranslation<'designer'>>['t'],
): JSX.Element {
  switch (field.type) {
    case 'group': {
      return (
        <div className='max-w-full rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground'>
          {t('preview.sectionFields', { count: field.items?.length ?? 0 })}
        </div>
      );
    }
    case 'repeater': {
      return (
        <div className='max-w-full rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground'>
          {t('preview.repeaterFields', { count: field.items?.length ?? 0 })}
        </div>
      );
    }
    case 'component-ref': {
      return (
        <div className='max-w-full rounded-lg border bg-muted/30 px-4 py-3 text-sm'>
          <span className='font-medium'>
            {field.componentCode || t('preview.selectClinicalBlock')}
          </span>
          {field.componentVersion ? (
            <span className='ml-2 text-muted-foreground'>
              v{field.componentVersion}
            </span>
          ) : null}
        </div>
      );
    }
    default: {
      return (
        <div className='@container/preview grid w-full min-w-0 max-w-full grid-cols-12 gap-4'>
          <div
            className={cn(
              'pointer-events-none min-w-0 max-w-full',
              widthClass(presentation?.width),
              TIME_FIELD_LAYOUT_CLASS,
              field.type === 'time' && '[&_[data-slot=time-input]]:w-full',
              field.type === 'datetime' && '[&_[data-slot=time-input]]:shrink-0',
              '[&_[data-slot=time-input-trigger]]:w-full',
              '[&_[data-slot=time-input-trigger]]:bg-muted/40',
              '[&_button]:bg-muted/40',
              '[&_input:not([type=hidden])]:bg-muted/40',
              '[&_textarea]:bg-muted/40',
            )}
          >
            {renderFieldInput(
              field,
              presentation,
              '',
              false,
              placeholder ??
                (field.type === 'text'
                  ? t('preview.shortAnswer')
                  : field.type === 'textarea'
                    ? t('preview.longAnswer')
                    : undefined),
              () => undefined,
            )}
          </div>
        </div>
      );
    }
  }
}

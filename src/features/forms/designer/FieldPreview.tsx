import type { TFunction } from 'i18next';
import { CircleHelp } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card.tsx';
import { TIME_FIELD_LAYOUT_CLASS } from '@/components/ui/time-input.tsx';
import { renderFieldInput } from '@/features/forms/renderer/FormFieldInputs.tsx';
import { widthClass } from '@/features/forms/renderer/layoutUtils.ts';
import type {
  ClinicalField,
  FieldPresentation,
  FieldRules,
} from '@/features/forms/types.ts';
import { cn } from '@/lib/utils.ts';

import {
  collectFieldValidationRules,
  type FieldValidationRule,
} from './fieldValidationSummary.ts';

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
        <ValidationRuleBadges
          rules={validationRules}
          t={t}
        />
      ) : null}
    </div>
  );
}

interface GlanceChip {
  id: string;
  text: string;
  detail: string;
  withTooltip?: boolean;
}

function ValidationRuleBadges({
  rules,
  t,
}: {
  rules: FieldValidationRule[];
  t: TFunction<'designer'>;
}): JSX.Element {
  const chips = buildGlanceChips(rules, t);

  return (
    <ul
      className='flex max-w-full flex-wrap gap-1.5'
      onClick={(event) => {
        event.stopPropagation();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      {chips.map((chip) => (
        <li key={chip.id}>
          {chip.withTooltip ? (
            <HoverCard>
              <HoverCardTrigger
                aria-label={chip.detail}
                className='rounded-4xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
                render={<button type='button' />}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
              >
                <Badge
                  variant='outline'
                  className='pointer-events-none gap-1 font-normal'
                >
                  {chip.text}
                  <CircleHelp
                    className='size-3 text-muted-foreground'
                    aria-hidden='true'
                  />
                </Badge>
              </HoverCardTrigger>
              <HoverCardContent
                side='top'
                className='w-auto max-w-xs text-xs leading-relaxed'
              >
                {chip.detail}
              </HoverCardContent>
            </HoverCard>
          ) : (
            <Badge
              variant='outline'
              className='font-normal'
            >
              {chip.text}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

const CONDITIONAL_IDS = new Set([
  'visible-when',
  'enabled-when',
  'required-when',
  'calculate',
]);

function buildGlanceChips(
  rules: FieldValidationRule[],
  t: TFunction<'designer'>,
): GlanceChip[] {
  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  const chips: GlanceChip[] = [];
  const consumed = new Set<string>();

  const pushFlag = (id: string) => {
    const rule = byId.get(id);
    if (!rule) {
      return;
    }
    consumed.add(id);
    chips.push({ id, text: rule.label, detail: rule.label });
  };

  pushFlag('required');
  pushFlag('read-only');

  const minimum = byId.get('minimum');
  const maximum = byId.get('maximum');
  if (minimum?.detail !== undefined) {
    consumed.add('minimum');
    chips.push({
      id: 'minimum',
      text: `${minimum.label} ${minimum.detail}`,
      detail: `${minimum.label}: ${minimum.detail}`,
    });
  }
  if (maximum?.detail !== undefined) {
    consumed.add('maximum');
    chips.push({
      id: 'maximum',
      text: `${maximum.label} ${maximum.detail}`,
      detail: `${maximum.label}: ${maximum.detail}`,
    });
  }

  const minLength = byId.get('min-length');
  const maxLength = byId.get('max-length');
  if (minLength?.detail !== undefined) {
    consumed.add('min-length');
    chips.push({
      id: 'min-length',
      text: `${minLength.label} ${minLength.detail}`,
      detail: `${minLength.label}: ${minLength.detail}`,
    });
  }
  if (maxLength?.detail !== undefined) {
    consumed.add('max-length');
    chips.push({
      id: 'max-length',
      text: `${maxLength.label} ${maxLength.detail}`,
      detail: `${maxLength.label}: ${maxLength.detail}`,
    });
  }

  const multipleOf = byId.get('multiple-of');
  if (multipleOf?.detail !== undefined) {
    consumed.add('multiple-of');
    chips.push({
      id: 'multiple-of',
      text: t('preview.glance.step', { value: multipleOf.detail }),
      detail: `${multipleOf.label}: ${multipleOf.detail}`,
    });
  }

  const decimalPlaces = byId.get('decimal-places');
  if (decimalPlaces?.detail !== undefined) {
    consumed.add('decimal-places');
    chips.push({
      id: 'decimal-places',
      text: t('preview.glance.decimals', { count: decimalPlaces.detail }),
      detail: `${decimalPlaces.label}: ${decimalPlaces.detail}`,
    });
  }

  const conditionals = rules.filter((rule) => CONDITIONAL_IDS.has(rule.id));
  if (conditionals.length > 0) {
    for (const rule of conditionals) {
      consumed.add(rule.id);
    }
    chips.push({
      id: 'conditionals',
      text: t('preview.glance.conditionals', { count: conditionals.length }),
      detail: conditionals
        .map((rule) =>
          rule.detail ? `${rule.label}: ${rule.detail}` : rule.label,
        )
        .join(' · '),
      withTooltip: true,
    });
  }

  for (const rule of rules) {
    if (!consumed.has(rule.id)) {
      chips.push({
        id: rule.id,
        text: rule.detail ? `${rule.label} ${rule.detail}` : rule.label,
        detail: rule.detail ? `${rule.label}: ${rule.detail}` : rule.label,
      });
    }
  }

  return chips;
}

function previewPlaceholder(
  field: ClinicalField,
  placeholder: string | undefined,
  t: ReturnType<typeof useTranslation<'designer'>>['t'],
): string | undefined {
  if (placeholder !== undefined) {
    return placeholder;
  }

  if (field.type === 'text') {
    return t('preview.shortAnswer');
  }

  if (field.type === 'textarea') {
    return t('preview.longAnswer');
  }

  return undefined;
}

function renderPreviewControl(
  field: ClinicalField,
  presentation: FieldPresentation | undefined,
  placeholder: string | undefined,
  t: ReturnType<typeof useTranslation<'designer'>>['t'],
): JSX.Element {
  if (field.type === 'group') {
    return (
      <div className='max-w-full rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground'>
        {t('preview.sectionFields', { count: field.items?.length ?? 0 })}
      </div>
    );
  }

  if (field.type === 'repeater') {
    return (
      <div className='max-w-full rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground'>
        {t('preview.repeaterFields', { count: field.items?.length ?? 0 })}
      </div>
    );
  }

  if (field.type === 'component-ref') {
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
          previewPlaceholder(field, placeholder, t),
          () => undefined,
        )}
      </div>
    </div>
  );
}

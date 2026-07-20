import type { FormRuleEvaluationResult } from '@cynara/rule-engine';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { iterateFields } from '@/features/forms/model/formDraft.ts';
import type { ClinicalField, FormDraftModel } from '@/features/forms/types.ts';
import type { ConfigWarning } from '@/features/forms/renderer/types.ts';
import { formatNumericDisplay } from '@/lib/number-format.ts';

interface RuleInspectionPanelProps {
  model: FormDraftModel;
  evaluation: FormRuleEvaluationResult;
  configWarnings: ConfigWarning[];
  variant?: 'sidebar' | 'tab';
}

export function RuleInspectionPanel({
  model,
  evaluation,
  configWarnings,
  variant = 'sidebar',
}: RuleInspectionPanelProps): JSX.Element {
  const { t } = useTranslation('designer');
  const { t: tv } = useTranslation('validation');

  const panelContent = (
    <div className='grid gap-3 pb-2'>
      {configWarnings.length > 0 ? (
        <Card className='border-amber-500/20 bg-card/80 shadow-sm backdrop-blur-sm'>
          <CardHeader className='border-b py-3'>
            <CardTitle className='text-sm'>
              {t('formPreview.configWarnings', {
                count: configWarnings.length,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className='grid gap-2 p-3'>
            {configWarnings.map((warning) => (
              <div
                key={`${warning.code}-${warning.fieldId ?? warning.message}`}
                className='grid gap-1 rounded-md border border-amber-500/30 bg-amber-500/5 p-2'
              >
                <Badge variant='outline'>
                  {tv(`warningCodes.${warning.code}`, {
                    defaultValue: warning.code,
                  })}
                </Badge>
                <p className='text-sm'>{warning.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className='border-border/60 bg-card/80 shadow-sm backdrop-blur-sm'>
        <CardHeader className='border-b py-3'>
          <CardTitle className='text-sm'>
            {t('formPreview.fieldStates')}
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <ul className='divide-y'>
            {[...iterateFields(model.clinical.fields)].map((field) => {
              const rules = model.rules.fields[field.id];
              const visible = evaluation.visibility[field.id];
              const enabled = evaluation.enabled[field.id];
              const required = evaluation.required[field.id];
              const calculated = evaluation.calculatedValues[field.code];

              return (
                <li
                  key={field.id}
                  className='grid gap-2 px-3 py-3'
                >
                  <div className='flex items-start justify-between gap-2'>
                    <p className='text-sm font-medium'>
                      {model.ui.fields[field.id]?.label ?? field.id}
                    </p>
                    <code className='text-[10px] text-muted-foreground'>
                      {field.code}
                    </code>
                  </div>
                  <div className='flex flex-wrap gap-1.5'>
                    <StateBadge
                      label={t('formPreview.visible')}
                      active={visible}
                    />
                    <StateBadge
                      label={t('formPreview.enabled')}
                      active={enabled}
                    />
                    <StateBadge
                      label={t('formPreview.required')}
                      active={required}
                    />
                  </div>
                  {hasDisplayableCalculatedValue(calculated) ? (
                    <p className='text-xs text-muted-foreground'>
                      {t('formPreview.calculatedValue', {
                        value: formatPreviewValue(calculated, field),
                      })}
                    </p>
                  ) : null}
                  {rules ? (
                    <p className='text-xs text-muted-foreground'>
                      {t('formPreview.hasConditionalRules')}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {evaluation.validationErrors.length > 0 ? (
        <Card className='border-destructive/25 bg-card/80 shadow-sm backdrop-blur-sm'>
          <CardHeader className='border-b py-3'>
            <CardTitle className='text-sm text-destructive'>
              {t('formPreview.crossFieldValidation')}
            </CardTitle>
          </CardHeader>
          <CardContent className='grid gap-2 p-3'>
            {evaluation.validationErrors.map((error) => (
              <div
                key={error.code}
                className='grid gap-1 rounded-md border border-destructive/30 bg-destructive/5 p-2'
              >
                <Badge variant='outline'>{error.code}</Badge>
                <p className='text-sm'>{error.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );

  if (variant === 'tab') {
    return <div className='px-4 pb-3 pt-1 md:px-6'>{panelContent}</div>;
  }

  return (
    <aside className='flex h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden border-l bg-card xl:w-96'>
      <div className='shrink-0 border-b px-4 py-3'>
        <h3 className='font-heading text-sm font-medium'>
          {t('formPreview.ruleInspection')}
        </h3>
        <p className='text-xs text-muted-foreground'>
          {t('formPreview.ruleInspectionHint')}
        </p>
      </div>

      <ScrollArea className='min-h-0 w-full flex-1'>{panelContent}</ScrollArea>
    </aside>
  );
}

function StateBadge({
  label,
  active,
}: {
  label: string;
  active: boolean;
}): JSX.Element {
  return (
    <Badge variant={active ? 'default' : 'secondary'}>{label}</Badge>
  );
}

function hasDisplayableCalculatedValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return true;
}

function formatPreviewValue(value: unknown, field?: ClinicalField): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatNumericDisplay(value, { step: field?.multipleOf, decimalPlaces: field?.decimalPlaces });
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

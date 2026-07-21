import type { FormRuleEvaluationResult } from '@cynara/rule-engine';
import { Eye, EyeOff, Lock, LockOpen, Sigma } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { iterateFields } from '@/features/forms/model/formDraft.ts';
import type { ConfigWarning } from '@/features/forms/renderer/types.ts';
import type {
  ClinicalField,
  FieldRules,
  FormDraftModel,
} from '@/features/forms/types.ts';
import { formatNumericDisplay } from '@/lib/number-format.ts';
import { cn } from '@/lib/utils.ts';

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

  const fields = [...iterateFields(model.clinical.fields)];
  const withRulesCount = fields.filter(
    (field) => model.rules.fields[field.id],
  ).length;
  const visibleCount = fields.filter(
    (field) => evaluation.visibility[field.id],
  ).length;
  const requiredCount = fields.filter(
    (field) => evaluation.required[field.id],
  ).length;

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
        <CardHeader className='space-y-3 border-b py-3'>
          <CardTitle className='text-sm'>
            {t('formPreview.fieldStates')}
          </CardTitle>
          <p className='text-sm leading-snug text-foreground/80'>
            {t('formPreview.fieldStatesSummary', {
              total: fields.length,
              withRules: withRulesCount,
              visible: visibleCount,
              required: requiredCount,
            })}
          </p>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b bg-muted/40 px-3 py-2'>
            <span className='text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground'>
              {t('formPreview.fieldColumn')}
            </span>
            <div className='grid grid-cols-3 gap-1 text-center'>
              <LegendMark
                label={t('formPreview.visible')}
                short={t('formPreview.visibleShort')}
              />
              <LegendMark
                label={t('formPreview.enabled')}
                short={t('formPreview.enabledShort')}
              />
              <LegendMark
                label={t('formPreview.required')}
                short={t('formPreview.requiredShort')}
              />
            </div>
          </div>
          <ul className='divide-y'>
            {fields.map((field) => {
              const rules = model.rules.fields[field.id];
              const visible = evaluation.visibility[field.id];
              const enabled = evaluation.enabled[field.id];
              const required = evaluation.required[field.id];
              const calculated = evaluation.calculatedValues[field.code];
              const ruleKinds = listActiveRuleKinds(rules);
              const label = model.ui.fields[field.id]?.label ?? field.id;

              return (
                <li
                  key={field.id}
                  className={cn(
                    'grid gap-2.5 px-3 py-3',
                    rules && 'bg-primary/[0.03]',
                  )}
                >
                  <div className='grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3'>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium leading-snug'>
                        {label}
                      </p>
                      <code className='mt-0.5 block truncate font-mono text-[11px] leading-normal text-muted-foreground'>
                        {field.code}
                      </code>
                    </div>
                    <div
                      className='grid grid-cols-3 gap-1 pt-0.5'
                      role='group'
                      aria-label={t('formPreview.stateGroupLabel', {
                        field: label,
                      })}
                    >
                      <StateMark
                        active={visible}
                        label={t('formPreview.visible')}
                        short={t('formPreview.visibleShort')}
                        activeLabel={t('formPreview.stateOn')}
                        inactiveLabel={t('formPreview.stateOff')}
                        activeIcon={Eye}
                        inactiveIcon={EyeOff}
                      />
                      <StateMark
                        active={enabled}
                        label={t('formPreview.enabled')}
                        short={t('formPreview.enabledShort')}
                        activeLabel={t('formPreview.stateOn')}
                        inactiveLabel={t('formPreview.stateOff')}
                        activeIcon={LockOpen}
                        inactiveIcon={Lock}
                      />
                      <StateMark
                        active={required}
                        label={t('formPreview.required')}
                        short={t('formPreview.requiredShort')}
                        activeLabel={t('formPreview.stateOn')}
                        inactiveLabel={t('formPreview.stateOff')}
                      />
                    </div>
                  </div>

                  {hasDisplayableCalculatedValue(calculated) ? (
                    <p className='flex items-center gap-1.5 text-sm text-foreground/85'>
                      <Sigma
                        className='size-3.5 shrink-0 text-muted-foreground'
                        aria-hidden='true'
                      />
                      <span>
                        {t('formPreview.calculatedValue', {
                          value: formatPreviewValue(calculated, field),
                        })}
                      </span>
                    </p>
                  ) : null}

                  {ruleKinds.length > 0 ? (
                    <div className='flex flex-wrap items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2'>
                      <span className='text-xs font-semibold tracking-wide text-primary'>
                        {t('formPreview.rulesLabel')}
                      </span>
                      <span
                        className='text-muted-foreground'
                        aria-hidden='true'
                      >
                        ·
                      </span>
                      {ruleKinds.map((kind) => (
                        <span
                          key={kind}
                          className='rounded bg-background/80 px-1.5 py-0.5 text-xs font-medium text-foreground'
                        >
                          {t(`formPreview.ruleKind.${kind}`)}
                        </span>
                      ))}
                    </div>
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

type RuleKind = 'visible' | 'enabled' | 'required' | 'calculate';

function listActiveRuleKinds(rules: FieldRules | undefined): RuleKind[] {
  if (!rules) {
    return [];
  }

  const kinds: RuleKind[] = [];
  if (rules.visibleWhen) {
    kinds.push('visible');
  }
  if (rules.enabledWhen) {
    kinds.push('enabled');
  }
  if (rules.requiredWhen) {
    kinds.push('required');
  }
  if (rules.calculate) {
    kinds.push('calculate');
  }
  return kinds;
}

function LegendMark({
  label,
  short,
}: {
  label: string;
  short: string;
}): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger
        className='inline-flex w-8 cursor-default items-center justify-center text-[11px] font-semibold tracking-wide text-muted-foreground'
        render={<button type='button' />}
      >
        {short}
      </TooltipTrigger>
      <TooltipContent side='top'>{label}</TooltipContent>
    </Tooltip>
  );
}

function StateMark({
  active,
  label,
  short,
  activeLabel,
  inactiveLabel,
  activeIcon: ActiveIcon,
  inactiveIcon: InactiveIcon,
}: {
  active: boolean;
  label: string;
  short: string;
  activeLabel: string;
  inactiveLabel: string;
  activeIcon?: typeof Eye;
  inactiveIcon?: typeof EyeOff;
}): JSX.Element {
  const Icon = active ? ActiveIcon : InactiveIcon;
  const stateLabel = active ? activeLabel : inactiveLabel;
  const tooltip = `${label}: ${stateLabel}`;

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={tooltip}
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-md border text-[11px] font-semibold',
          active
            ? 'border-primary/30 bg-primary text-primary-foreground'
            : 'border-transparent bg-muted/70 text-muted-foreground',
        )}
        render={<button type='button' />}
      >
        {Icon ? (
          <Icon
            className='size-3.5'
            aria-hidden='true'
          />
        ) : (
          short
        )}
      </TooltipTrigger>
      <TooltipContent side='top'>{tooltip}</TooltipContent>
    </Tooltip>
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
    return formatNumericDisplay(value, {
      step: field?.multipleOf,
      decimalPlaces: field?.decimalPlaces,
    });
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

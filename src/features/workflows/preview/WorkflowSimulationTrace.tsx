import type { TFunction } from 'i18next';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import type {
  WorkflowBranchEvaluation,
  WorkflowSimulationStep,
} from '@/features/workflows/simulation/simulateWorkflow.ts';
import { cn } from '@/lib/utils.ts';

import { WorkflowNodeTypeBadge } from '../designer/WorkflowNodeTypeBadge.tsx';

interface WorkflowSimulationTraceProps {
  steps: WorkflowSimulationStep[];
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
  onStepBack: () => void;
  onStepForward: () => void;
  hasPreviousStep: boolean;
  hasNextStep: boolean;
}

/**
 * Ordered walk through the simulated path. The active step is highlighted;
 * decision steps expand their branch outcomes so the reviewer can see which
 * guard matched (or why the run blocked).
 */
export function WorkflowSimulationTrace({
  steps,
  currentStepIndex,
  onSelectStep,
  onStepBack,
  onStepForward,
  hasPreviousStep,
  hasNextStep,
}: WorkflowSimulationTraceProps): JSX.Element {
  const { t } = useTranslation('workflows');

  if (steps.length === 0) {
    return (
      <p className='rounded-lg border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground'>
        {t('preview.noTrace')}
      </p>
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-2'>
      <ol className='grid flex-1 content-start gap-1.5 overflow-y-auto pr-1'>
        {steps.map((step, index) => (
          <TraceStep
            key={step.node.id}
            step={step}
            index={index}
            active={index === currentStepIndex}
            onSelect={() => {
              onSelectStep(index);
            }}
          />
        ))}
      </ol>
      <div className='flex shrink-0 items-center justify-between gap-2 border-t border-border/60 pt-2'>
        <span className='text-xs tabular-nums text-muted-foreground'>
          {t('preview.stepCounter', {
            current: currentStepIndex + 1,
            total: steps.length,
          })}
        </span>
        <div className='flex items-center gap-1'>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            disabled={!hasPreviousStep}
            aria-label={t('preview.previousStep')}
            title={t('preview.previousStep')}
            onClick={onStepBack}
          >
            <ChevronLeft />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            disabled={!hasNextStep}
            aria-label={t('preview.nextStep')}
            title={t('preview.nextStep')}
            onClick={onStepForward}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TraceStep({
  step,
  index,
  active,
  onSelect,
}: {
  step: WorkflowSimulationStep;
  index: number;
  active: boolean;
  onSelect: () => void;
}): JSX.Element {
  const { t } = useTranslation('workflows');
  const name = step.node.name?.trim();
  const hasAssignees = step.assignee !== null;
  const assigneeParts = assigneePartsFor(step);

  return (
    <li>
      <button
        type='button'
        onClick={onSelect}
        aria-current={active ? 'step' : undefined}
        className={cn(
          'w-full rounded-lg border px-2.5 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active
            ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
            : 'border-border/70 bg-card/40 hover:bg-accent/40',
        )}
      >
        <div className='flex items-center justify-between gap-2'>
          <span className='flex min-w-0 items-center gap-1.5'>
            <span className='shrink-0 text-[0.65rem] font-medium tabular-nums text-muted-foreground'>
              {index + 1}
            </span>
            <span className='min-w-0 truncate text-sm font-medium'>
              {name ?? t('node.unnamed', { type: t(`node.${step.node.type}`) })}
            </span>
          </span>
          <WorkflowNodeTypeBadge type={step.node.type} />
        </div>

        {step.enteredVia ? (
          <p className='mt-1 truncate text-[0.65rem] text-muted-foreground'>
            {t('preview.enteredVia', {
              label:
                step.enteredVia.label?.trim() ??
                t('preview.unlabeledTransition'),
            })}
          </p>
        ) : null}

        {step.branchEvaluations.length > 0 ? (
          <ul className='mt-1.5 grid gap-1 border-t border-border/50 pt-1.5'>
            {step.branchEvaluations.map((branch) => (
              <li
                key={branch.edgeKey}
                className='flex items-center gap-1.5 text-[0.7rem]'
              >
                {branch.taken ? (
                  <Check className='size-3 shrink-0 text-emerald-500' />
                ) : (
                  <X className='size-3 shrink-0 text-muted-foreground/50' />
                )}
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate',
                    branch.taken
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {branch.label ?? t('preview.unlabeledTransition')}
                </span>
                <Badge
                  variant={branch.taken ? 'default' : 'secondary'}
                  className='shrink-0 px-1.5 text-[0.6rem] font-normal'
                >
                  {branchBadgeLabel(branch, t)}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {hasAssignees ? (
          <p className='mt-1.5 flex flex-wrap items-center gap-1 border-t border-border/50 pt-1.5 text-[0.65rem] text-muted-foreground'>
            <span className='font-medium'>{t('preview.assignedTo')}:</span>
            {assigneeParts.map((part) => (
              <code
                key={part}
                className='rounded bg-muted px-1 py-0.5 font-mono text-[0.6rem]'
              >
                {part}
              </code>
            ))}
          </p>
        ) : null}
      </button>
    </li>
  );
}

function assigneePartsFor(step: WorkflowSimulationStep): string[] {
  if (step.assignee === null) {
    return [];
  }
  const { actor, role, discipline } = step.assignee;
  return [actor, role, discipline].filter(
    (value): value is string =>
      typeof value === 'string' && value.trim() !== '',
  );
}

function branchBadgeLabel(
  branch: WorkflowBranchEvaluation,
  t: TFunction,
): string {
  if (branch.isDefault) {
    return t('preview.defaultBranch');
  }
  return branch.result ? t('preview.true') : t('preview.false');
}

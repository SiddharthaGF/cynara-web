import { CheckCircle2, Play, RotateCcw, CircleStop } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import type { WorkflowSimulationControl } from '@/features/workflows/preview/useWorkflowSimulation.ts';
import type { WorkflowGraph } from '@/features/workflows/types.ts';
import { cn } from '@/lib/utils.ts';

import { WorkflowSimulationTrace } from './WorkflowSimulationTrace.tsx';
import { WorkflowTestDataEditor } from './WorkflowTestDataEditor.tsx';

interface WorkflowSimulationTabProps {
  graph: WorkflowGraph;
  control: WorkflowSimulationControl;
  /** True after the reviewer pressed Run at least once in this preview. */
  hasRun: boolean;
  onRun: () => void;
}

export function WorkflowSimulationTab({
  graph,
  control,
  hasRun,
  onRun,
}: WorkflowSimulationTabProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const { simulation } = control;

  return (
    <ScrollArea className='h-full'>
      <div className='flex flex-col gap-5 px-4 py-4 sm:px-5'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <SimulationStatus simulation={simulation} />
          <div className='flex items-center gap-1.5'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='gap-1.5'
              onClick={control.reset}
            >
              <RotateCcw className='size-3.5' />
              {t('preview.reset')}
            </Button>
            <Button
              type='button'
              variant='default'
              size='sm'
              className='gap-1.5'
              onClick={onRun}
            >
              <Play className='size-3.5' />
              {t('preview.run')}
            </Button>
          </div>
        </div>

        <section className='grid gap-2'>
          <h3 className='text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase'>
            {t('preview.testData')}
          </h3>
          <WorkflowTestDataEditor
            graph={graph}
            values={control.values}
            inputTypes={control.inputTypes}
            onSetValue={control.setValue}
            onSetInputType={control.setInputType}
          />
        </section>

        <section className='grid gap-2'>
          <h3 className='text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase'>
            {t('preview.trace')}
          </h3>
          {hasRun ? (
            <WorkflowSimulationTrace
              steps={simulation.steps}
              currentStepIndex={control.currentStepIndex}
              onSelectStep={control.setCurrentStepIndex}
              onStepBack={control.stepBack}
              onStepForward={control.stepForward}
              hasPreviousStep={control.hasPreviousStep}
              hasNextStep={control.hasNextStep}
            />
          ) : (
            <p className='rounded-lg border border-dashed border-border/70 px-3 py-4 text-xs leading-relaxed text-muted-foreground'>
              {t('preview.traceHint')}
            </p>
          )}
        </section>
      </div>
    </ScrollArea>
  );
}

function SimulationStatus({
  simulation,
}: {
  simulation: WorkflowSimulationControl['simulation'];
}): JSX.Element {
  const { t } = useTranslation('workflows');
  const blocked = simulation.status === 'blocked';
  const Icon = blocked ? CircleStop : CheckCircle2;
  return (
    <div
      role='status'
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium',
        blocked
          ? 'border-destructive/30 text-destructive'
          : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      )}
    >
      <Icon className='size-3.5' />
      <span>
        {blocked
          ? t('preview.blocked', {
              reason: t(`preview.blockReason.${simulation.blockReason}`),
            })
          : t('preview.status.completed')}
      </span>
    </div>
  );
}

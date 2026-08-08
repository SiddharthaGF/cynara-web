import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty.tsx';
import type { WorkflowNodeType } from '@/features/workflows/types.ts';

interface WorkflowCanvasGuidanceProps {
  onAddStep: () => void;
  onAddNode: (type: WorkflowNodeType) => void;
}

/**
 * Shown while a fresh draft still only contains the Start and End nodes.
 * Mirrors the form designer's empty state: a visible prompt with real buttons
 * so the first composition step never depends on a hidden gesture.
 */
export function WorkflowCanvasGuidance({
  onAddStep,
  onAddNode,
}: WorkflowCanvasGuidanceProps): JSX.Element {
  const { t } = useTranslation('workflows');

  return (
    <div className='pointer-events-none absolute inset-0 z-20 flex items-start justify-center pt-16'>
      <div className='pointer-events-auto w-[min(100%-2rem,24rem)] rounded-xl border border-border/70 bg-card/95 p-5 shadow-lg backdrop-blur-sm'>
        <EmptyHeader>
          <EmptyTitle className='text-base'>
            {t('canvas.emptyTitle')}
          </EmptyTitle>
          <EmptyDescription>{t('canvas.emptyDescription')}</EmptyDescription>
        </EmptyHeader>
        <div className='mt-4 flex justify-center gap-2'>
          <Button
            type='button'
            size='sm'
            onClick={onAddStep}
          >
            {t('canvas.addStep')}
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              onAddNode('decision');
            }}
          >
            {t('canvas.addDecision')}
          </Button>
        </div>
      </div>
    </div>
  );
}

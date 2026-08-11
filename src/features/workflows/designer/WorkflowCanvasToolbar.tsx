import { Panel } from '@xyflow/react';
import { LayoutGrid, Maximize2 } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import type { WorkflowNodeType } from '@/features/workflows/types.ts';

import { WorkflowCanvasAddMenu } from './WorkflowCanvasAddMenu.tsx';

interface WorkflowCanvasToolbarProps {
  readOnly: boolean;
  onAddNode: (type: WorkflowNodeType) => void;
  onFitView: () => void;
  onAutoLayout: () => void;
}

/**
 * Floating toolbar pinned to the top of the canvas: the add-node menu plus the
 * fit-view and auto-layout shortcuts for touch-first and mouse workflows.
 */
export function WorkflowCanvasToolbar({
  readOnly,
  onAddNode,
  onFitView,
  onAutoLayout,
}: WorkflowCanvasToolbarProps): JSX.Element {
  const { t } = useTranslation('workflows');

  return (
    <Panel position='top-center'>
      <div className='flex items-center gap-1 rounded-lg border border-border/70 bg-card/90 p-1 shadow-sm backdrop-blur-sm'>
        {readOnly ? null : (
          <>
            <WorkflowCanvasAddMenu onAddNode={onAddNode} />
            <span
              aria-hidden
              className='h-4 w-px bg-border/70'
            />
          </>
        )}
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label={t('canvas.fitView')}
          title={t('canvas.fitView')}
          onClick={onFitView}
        >
          <Maximize2 />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label={t('canvas.autoLayout')}
          title={t('canvas.autoLayout')}
          onClick={onAutoLayout}
        >
          <LayoutGrid />
        </Button>
      </div>
    </Panel>
  );
}

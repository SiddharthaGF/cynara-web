import { Plus } from 'lucide-react';
import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover.tsx';
import type { WorkflowNodeType } from '@/features/workflows/types.ts';

import { nodeTypeIcon, nodeTypeColor } from './flow/nodeVisuals.ts';

/**
 * Always-visible "Add" control in the canvas toolbar. Mirrors the form
 * designer's insert menu: pick a step or a decision instead of hunting for a
 * right-click or long-press.
 */
export function WorkflowCanvasAddMenu({
  onAddNode,
}: {
  onAddNode: (type: WorkflowNodeType) => void;
}): JSX.Element {
  const { t } = useTranslation('workflows');
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger
        render={
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={t('canvas.add')}
            title={t('canvas.add')}
          />
        }
      >
        <Plus className='size-3.5' />
      </PopoverTrigger>
      <PopoverContent
        side='bottom'
        align='center'
        sideOffset={4}
        className='w-64 p-1'
      >
        <PopoverTitle className='px-2 py-1 text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase'>
          {t('canvas.add')}
        </PopoverTitle>
        <ul className='grid gap-0.5'>
          <AddNodeItem
            type='task'
            label={t('canvas.addTask')}
            description={t('canvas.addTaskHint')}
            onClick={() => {
              setOpen(false);
              onAddNode('task');
            }}
          />
          <AddNodeItem
            type='decision'
            label={t('canvas.addDecision')}
            description={t('canvas.addDecisionHint')}
            onClick={() => {
              setOpen(false);
              onAddNode('decision');
            }}
          />
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function AddNodeItem({
  type,
  label,
  description,
  onClick,
}: {
  type: WorkflowNodeType;
  label: string;
  description?: string;
  onClick: () => void;
}): JSX.Element {
  const Icon = nodeTypeIcon(type);
  return (
    <li>
      <button
        type='button'
        className='flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left outline-none select-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring'
        onClick={onClick}
      >
        <span className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10'>
          <Icon className={nodeTypeColor(type)} />
        </span>
        <span className='grid min-w-0 gap-0.5'>
          <span className='truncate text-sm font-medium'>{label}</span>
          {description ? (
            <span className='truncate text-xs text-muted-foreground'>
              {description}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

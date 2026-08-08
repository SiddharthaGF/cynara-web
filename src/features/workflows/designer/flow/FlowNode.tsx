import { Position, type NodeProps } from '@xyflow/react';
import { Plus, Settings2 } from 'lucide-react';
import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { BaseHandle } from '@/components/base-handle.tsx';
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
} from '@/components/base-node.tsx';
import { LabeledHandle } from '@/components/labeled-handle.tsx';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card.tsx';
import type {
  WorkflowEdge,
  WorkflowNodeType,
} from '@/features/workflows/types.ts';
import { cn } from '@/lib/utils.ts';

import { workflowEdgeLabel, type WorkflowFlowNode } from './flowTransform.ts';
import { nodeTypeIcon, NODE_COLORS } from './nodeVisuals.ts';

const NODE_ACCENTS: Record<WorkflowNodeType, string> = {
  start: `border-emerald-500/40 ${NODE_COLORS.start}`,
  end: `border-sky-500/40 ${NODE_COLORS.end}`,
  decision: `border-amber-500/40 ${NODE_COLORS.decision}`,
  task: `border-primary/40 ${NODE_COLORS.task}`,
};

/** Connection port colors, matching each node type's canvas accent. */
const HANDLE_ACCENTS: Record<WorkflowNodeType, string> = {
  start:
    'border-emerald-600/70 hover:border-emerald-600 hover:bg-emerald-600/10 hover:ring-emerald-600/30 dark:border-emerald-400/80 dark:hover:border-emerald-300 dark:hover:bg-emerald-400/15 dark:hover:ring-emerald-300/40',
  end: 'border-sky-600/70 hover:border-sky-600 hover:bg-sky-600/10 hover:ring-sky-600/30 dark:border-sky-400/80 dark:hover:border-sky-300 dark:hover:bg-sky-400/15 dark:hover:ring-sky-300/40',
  decision:
    'border-amber-600/70 hover:border-amber-600 hover:bg-amber-600/10 hover:ring-amber-600/30 dark:border-amber-400/80 dark:hover:border-amber-300 dark:hover:bg-amber-400/15 dark:hover:ring-amber-300/40',
  task: 'border-primary/70 hover:border-primary hover:bg-primary/10 hover:ring-primary/30 dark:border-primary/80 dark:hover:border-primary dark:hover:bg-primary/15 dark:hover:ring-primary/40',
};

const HANDLE_CLASS = 'shadow-sm hover:scale-125 hover:ring-2';

export function WorkflowFlowNode({
  data,
  selected,
  dragging,
}: NodeProps<WorkflowFlowNode>): JSX.Element {
  const { t } = useTranslation('workflows');
  const { node, outgoing, readOnly, hasErrors, onAddStep, onOpenSettings } =
    data;
  const Icon = nodeTypeIcon(node.type);
  const name = node.name?.trim();
  const isTerminal = node.type === 'end';
  // Start and task nodes allow a single outgoing transition; only decisions branch repeatedly.
  const canAddStep = node.type === 'decision' || outgoing.length === 0;
  // Hover-driven open state. Selection keeps the card open; an active drag
  // Closes it so the floating pill does not get left behind while dragging.
  const [isActionCardOpen, setIsActionCardOpen] = useState(false);
  const actionCardOpen = !dragging && (selected || isActionCardOpen);
  const nodeCard = (
    <BaseNode
      className={cn(
        'w-[232px] bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow]',
        NODE_ACCENTS[node.type],
        'hover:ring-1 hover:ring-ring/40',
        'in-[.selected]:border-primary in-[.selected]:shadow-md in-[.selected]:ring-2 in-[.selected]:ring-ring/60',
        hasErrors && !selected && 'ring-2 ring-destructive/50',
      )}
    >
      <BaseNodeHeader className='-mb-0.5 px-3 pt-2.5 pb-1'>
        <span className='inline-flex min-w-0 items-center gap-1.5'>
          <Icon className='size-3.5 shrink-0' />
          <span className='truncate text-[0.7rem] font-medium tracking-wide uppercase opacity-80'>
            {t(`node.${node.type}`)}
          </span>
        </span>
        <span className='inline-flex shrink-0 items-center gap-1'>
          {hasErrors ? (
            <span
              className='size-2 rounded-full bg-destructive'
              aria-label={t('panel.issuesToFix_other', { count: 1 })}
            />
          ) : null}
          {readOnly ? null : (
            <button
              type='button'
              aria-label={t('canvas.nodeSettings')}
              title={t('canvas.nodeSettings')}
              className='nodrag -mr-1 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-opacity outline-none hover:bg-muted hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring'
              onClick={(event) => {
                event.stopPropagation();
                onOpenSettings(node.id);
              }}
            >
              <Settings2 className='size-3.5' />
            </button>
          )}
        </span>
      </BaseNodeHeader>

      <BaseNodeContent className='gap-1 px-3 py-0.5 pb-1'>
        <p
          className={cn(
            'truncate font-heading text-sm font-medium',
            !name && 'text-muted-foreground/70',
          )}
          title={name}
        >
          {name ?? t('node.unnamed', { type: t(`node.${node.type}`) })}
        </p>
        <code className='truncate font-mono text-[0.625rem] text-muted-foreground/70'>
          {node.id}
        </code>
      </BaseNodeContent>

      {node.type === 'decision' && outgoing.length > 0 ? (
        <div className='nodrag border-t border-border/60 px-2 pt-1.5 pb-1'>
          <div className='flex items-end justify-around gap-1'>
            {outgoing.map((edge) => (
              <BranchHandle
                key={edge.to}
                edge={edge}
                defaultBranchLabel={t('inspector.defaultBranch')}
              />
            ))}
          </div>
        </div>
      ) : null}

      <NodeTerminals type={node.type} />
    </BaseNode>
  );

  if (isTerminal || readOnly || !canAddStep) {
    return nodeCard;
  }

  return (
    <HoverCard
      open={actionCardOpen}
      onOpenChange={(open) => setIsActionCardOpen(open)}
    >
      <HoverCardTrigger
        render={<div />}
        className='block'
        delay={150}
        closeDelay={120}
      >
        {nodeCard}
      </HoverCardTrigger>
      <HoverCardContent
        side='bottom'
        align='center'
        sideOffset={10}
        className='w-auto p-1.5'
      >
        <button
          type='button'
          className='inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 bg-background px-2.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground shadow-sm transition-colors outline-none hover:border-primary/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring'
          onClick={(event) => {
            event.stopPropagation();
            onAddStep(node.id);
          }}
        >
          <Plus className='size-3' />
          {t(node.type === 'decision' ? 'canvas.addBranch' : 'canvas.addStep')}
        </button>
      </HoverCardContent>
    </HoverCard>
  );
}

function BranchHandle({
  edge,
  defaultBranchLabel,
}: {
  edge: WorkflowEdge;
  defaultBranchLabel: string;
}): JSX.Element {
  const label = workflowEdgeLabel(edge, true, defaultBranchLabel);
  return (
    <LabeledHandle
      id={edge.to}
      type='source'
      position={Position.Bottom}
      title={label ?? edge.to}
      className='min-w-0 flex-1 justify-center'
      labelClassName='max-w-full truncate px-1 text-[0.6rem] font-medium text-muted-foreground'
      handleClassName={cn('size-[9px]', HANDLE_CLASS, HANDLE_ACCENTS.decision)}
    />
  );
}

/** Non-branch handles: entry on top, exit on the bottom edge of the node. */
function NodeTerminals({ type }: { type: WorkflowNodeType }): JSX.Element {
  const handleClass = cn(HANDLE_CLASS, HANDLE_ACCENTS[type]);
  if (type === 'start') {
    return (
      <BaseHandle
        type='source'
        position={Position.Bottom}
        id='out'
        className={handleClass}
      />
    );
  }
  if (type === 'end') {
    return (
      <BaseHandle
        type='target'
        position={Position.Top}
        id='in'
        className={handleClass}
      />
    );
  }
  if (type === 'decision') {
    return (
      <BaseHandle
        type='target'
        position={Position.Top}
        id='in'
        className={handleClass}
      />
    );
  }
  return (
    <>
      <BaseHandle
        type='target'
        position={Position.Top}
        id='in'
        className={handleClass}
      />
      <BaseHandle
        type='source'
        position={Position.Bottom}
        id='out'
        className={handleClass}
      />
    </>
  );
}

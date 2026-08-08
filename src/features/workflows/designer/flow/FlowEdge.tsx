import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import type { JSX } from 'react';
import { useState } from 'react';

import { cn } from '@/lib/utils.ts';

import type {
  WorkflowFlowEdge,
  WorkflowFlowEdgeData,
} from './flowTransform.ts';

/**
 * Workflow transition edge. Uses a smooth step path so decision branches stay
 * visually separated, with a floating label chip that never overlaps nodes.
 * Like nodes, the edge only reveals its label and highlight on hover (or while
 * selected) so transitions read as interactive without cluttering the canvas.
 */
export function WorkflowFlowEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  selected,
  data,
}: EdgeProps<WorkflowFlowEdge>): JSX.Element {
  const [hovered, setHovered] = useState(false);
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  const highlighted = hovered || Boolean(selected);

  return (
    <g
      className={cn('workflow-edge', hovered && 'workflow-edge--hovered')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={18}
        style={data?.isConditional ? { strokeDasharray: '5 4' } : undefined}
      />
      {data?.label && highlighted ? (
        <EdgeLabelRenderer>
          <div
            className={cn(
              'pointer-events-none absolute z-10 rounded-md border bg-background/90 px-1.5 py-0.5 font-mono text-[0.625rem] whitespace-nowrap backdrop-blur-sm',
              edgeLabelClassName(selected, hovered, data),
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              maxWidth: 220,
            }}
          >
            <span className='block truncate'>{data.label}</span>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
}

function edgeLabelClassName(
  selected: boolean | undefined,
  hovered: boolean,
  data: WorkflowFlowEdgeData,
): string {
  if (selected) {
    return 'border-primary/50 text-primary';
  }
  if (hovered) {
    return 'border-primary/40 text-foreground';
  }
  if (data.isConditional) {
    return 'border-muted-foreground/30 text-muted-foreground';
  }
  return 'border-border text-muted-foreground';
}

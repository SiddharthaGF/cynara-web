import { CircleDot, Flag, GitBranch, ListChecks } from 'lucide-react';

import type { WorkflowNodeType } from '@/features/workflows/types.ts';

export const NODE_ICONS: Record<WorkflowNodeType, typeof CircleDot> = {
  start: CircleDot,
  end: Flag,
  decision: GitBranch,
  task: ListChecks,
};

export const NODE_COLORS: Record<WorkflowNodeType, string> = {
  start: 'text-emerald-600 dark:text-emerald-400',
  end: 'text-sky-600 dark:text-sky-400',
  decision: 'text-amber-600 dark:text-amber-400',
  task: 'text-primary',
};

export function nodeTypeIcon(type: WorkflowNodeType): typeof CircleDot {
  return NODE_ICONS[type];
}

/** Text color tokens for a node type, matching the canvas node accents. */
export function nodeTypeColor(type: WorkflowNodeType): string {
  return NODE_COLORS[type];
}

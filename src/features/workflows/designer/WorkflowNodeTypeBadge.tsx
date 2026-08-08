import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import type { WorkflowNodeType } from '@/features/workflows/types.ts';
import { cn } from '@/lib/utils.ts';

import { nodeTypeIcon } from './flow/FlowNode.tsx';

export function WorkflowNodeTypeBadge({
  type,
}: {
  type: WorkflowNodeType;
}): JSX.Element {
  const { t } = useTranslation('workflows');
  const Icon = nodeTypeIcon(type);

  return (
    <Badge
      variant='secondary'
      className='gap-1 font-normal'
    >
      <Icon className='size-3' />
      {t(`node.${type}`)}
    </Badge>
  );
}

const STATUS_VARIANTS: Record<string, string> = {
  published: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  review: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  retired: 'bg-destructive/10 text-destructive',
  draft: '',
};

export function WorkflowStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}): JSX.Element {
  const { t } = useTranslation('workflows');
  const label = t(`versionHistory.status_${status}`, {
    defaultValue: status,
  });

  return (
    <Badge
      variant={status === 'draft' ? 'secondary' : 'outline'}
      className={cn(STATUS_VARIANTS[status], 'font-normal', className)}
    >
      {label}
    </Badge>
  );
}

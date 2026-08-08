import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import type { WorkflowNodeType } from '@/features/workflows/types.ts';

import { nodeTypeIcon } from './flow/nodeVisuals.ts';

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
